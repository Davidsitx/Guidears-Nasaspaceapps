"""Recorta el DEM y la ortoimagen de Gale (USGS) para una zona y los deja con el formato de docs/contrato.md §1.

Lee los mosaicos de USGS por HTTP, bajando solo la ventana pedida (no hace falta descargar los 3,6 GB del DEM ni los
24 GB de la ortoimagen). Ambos mosaicos están en la misma proyección que el contrato: equirectangular, meridiano
central 0, paralelo estándar 0, esfera de 3.396.190 m. Por eso este = lon·R y norte = lat·R (en radianes), sin
reproyectar.

Uso (zona del sol 5070, la caja que pidió David):
    python herramientas/recortar_terreno.py --zona sol5070 \
        --lat-norte -4.820 --lat-sur -4.848 --lon-oeste 137.385 --lon-este 137.412

Salidas en data/terreno/<zona>/:
    dem.tif       DEM de 1 m, Float32, sin datos = -9999 (no se versiona: .gitignore excluye *.tif)
    dem_2m.bin    promedio 2x2 del DEM, Float32 little-endian, fila 0 = norte
    orto.jpg      ortoimagen de la misma extensión (escala de grises; resolución con --orto-res)
    meta.json     georreferencia y fuentes

Requiere: numpy, rasterio, pillow.
"""
import argparse
import json
import math
import os

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import Window
from PIL import Image

R = 3396190.0
SIN_DATOS = -9999.0
DEM_URL = "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
ORTO_URL = "https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif"
FUENTE_DEM = "USGS Astrogeology, MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker, 2016), " + DEM_URL
FUENTE_ORTO = "USGS Astrogeology, MSL_Gale_Orthophoto_Mosaic_25cm_v3, mosaico HiRISE (Calef y Parker, 2016), " + ORTO_URL

# Lectura remota: pedir bloques grandes evita miles de pedidos HTTP chicos.
GDAL_ENV = dict(
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
    CPL_VSIL_CURL_CHUNK_SIZE=str(10 * 1024 * 1024),
    GDAL_HTTP_MULTIRANGE="YES",
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES="YES",
    GDAL_HTTP_MAX_RETRY="5",
    GDAL_HTTP_RETRY_DELAY="2",
)


def a_metros(lat, lon):
    """lat/lon en grados -> (este, norte) en metros, proyección del contrato."""
    return math.radians(lon) * R, math.radians(lat) * R


def a_grados(este, norte):
    return math.degrees(norte / R), math.degrees(este / R)


def abrir(p):
    return rasterio.open(p if os.path.exists(p) else "/vsicurl/" + p)


def recortar_dem(fuente, x_oeste, y_norte, x_este, y_sur):
    """Devuelve (z, x0, y0): z en Float32 con SIN_DATOS, y la esquina noroeste de la celda (0,0) en metros."""
    with abrir(fuente) as s:
        t = s.transform
        assert abs(t.a - 1.0) < 1e-9 and abs(t.e + 1.0) < 1e-9, "se esperaba un DEM de 1 m"
        assert "Equirectangular" in s.crs.to_wkt() and "3396190" in s.crs.to_wkt(), "proyección distinta a la del contrato"
        c0 = math.floor((x_oeste - t.c) / t.a)
        f0 = math.floor((t.f - y_norte) / -t.e)
        c1 = math.ceil((x_este - t.c) / t.a)
        f1 = math.ceil((t.f - y_sur) / -t.e)
        # ancho y alto pares, para que la grilla de 2 m quede entera
        if (c1 - c0) % 2:
            c1 += 1
        if (f1 - f0) % 2:
            f1 += 1
        w = Window(c0, f0, c1 - c0, f1 - f0)
        print(f"DEM: columnas {c0}-{c1}, filas {f0}-{f1} ({w.width} x {w.height} celdas de 1 m)")
        z = s.read(1, window=w).astype(np.float32)
        nd = s.nodata
        if nd is not None:
            z[z == nd] = SIN_DATOS
        z[~np.isfinite(z)] = SIN_DATOS
        x0 = t.c + c0 * t.a
        y0 = t.f + f0 * t.e
        return z, x0, y0, s.crs


def promedio_2x2(z):
    h, w = z.shape
    b = z.reshape(h // 2, 2, w // 2, 2)
    malo = (b == SIN_DATOS).any(axis=(1, 3))
    m = b.mean(axis=(1, 3), dtype=np.float64).astype(np.float32)
    m[malo] = SIN_DATOS
    return m


def recortar_orto(fuente, x0, y0, ancho_m, alto_m, res):
    """Ortoimagen de la misma extensión que el DEM, remuestreada (promedio) a `res` metros por píxel."""
    with abrir(fuente) as s:
        t = s.transform
        c0 = (x0 - t.c) / t.a
        f0 = (t.f - y0) / -t.e
        w = Window(round(c0), round(f0), round(ancho_m / t.a), round(alto_m / -t.e))
        desfase = max(abs(round(c0) - c0), abs(round(f0) - f0)) * t.a
        out = (s.count, round(alto_m / res), round(ancho_m / res))
        print(f"Orto: ventana {w.width} x {w.height} px de {t.a} m -> {out[2]} x {out[1]} px de {res} m "
              f"(desfase con el DEM {desfase:.3f} m)")
        img = s.read(window=w, out_shape=out, resampling=Resampling.average, boundless=True, fill_value=0)
        return img


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zona", required=True)
    ap.add_argument("--lat-norte", type=float, required=True)
    ap.add_argument("--lat-sur", type=float, required=True)
    ap.add_argument("--lon-oeste", type=float, required=True)
    ap.add_argument("--lon-este", type=float, required=True)
    ap.add_argument("--orto-res", type=float, default=0.5, help="metros por píxel de orto.jpg (default 0,5)")
    ap.add_argument("--dem", default=DEM_URL, help="URL o archivo local del DEM")
    ap.add_argument("--orto", default=ORTO_URL, help="URL o archivo local de la ortoimagen")
    ap.add_argument("--salida", default=None, help="carpeta de salida (default data/terreno/<zona>)")
    a = ap.parse_args()

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    salida = a.salida or os.path.join(raiz, "data", "terreno", a.zona)
    os.makedirs(salida, exist_ok=True)

    x_oeste, y_norte = a_metros(a.lat_norte, a.lon_oeste)
    x_este, y_sur = a_metros(a.lat_sur, a.lon_este)

    with rasterio.Env(**GDAL_ENV):
        z, x0, y0, crs = recortar_dem(a.dem, x_oeste, y_norte, x_este, y_sur)
        alto1, ancho1 = z.shape

        perfil = dict(driver="GTiff", dtype="float32", count=1, width=ancho1, height=alto1, crs=crs,
                      transform=rasterio.Affine(1.0, 0, x0, 0, -1.0, y0), nodata=SIN_DATOS,
                      compress="deflate", predictor=3, tiled=True)
        with rasterio.open(os.path.join(salida, "dem.tif"), "w", **perfil) as d:
            d.write(z, 1)

        z2 = promedio_2x2(z)
        z2.astype("<f4").tofile(os.path.join(salida, "dem_2m.bin"))

        img = recortar_orto(a.orto, x0, y0, ancho1 * 1.0, alto1 * 1.0, a.orto_res)

    banda = img[0] if img.shape[0] == 1 else np.moveaxis(img[:3], 0, -1)
    Image.fromarray(banda.astype(np.uint8)).save(os.path.join(salida, "orto.jpg"), quality=88, optimize=True)

    lat_norte, lon_oeste = a_grados(x0, y0)
    lat_sur, lon_este = a_grados(x0 + ancho1, y0 - alto1)
    validos = z2[z2 != SIN_DATOS]
    meta = {
        "zona": a.zona,
        "fuente_dem": FUENTE_DEM,
        "fuente_orto": FUENTE_ORTO,
        "ancho": int(z2.shape[1]),
        "alto": int(z2.shape[0]),
        "tam_celda_m": 2.0,
        "lat_norte": round(lat_norte, 8),
        "lon_oeste": round(lon_oeste, 8),
        "grados_por_m": math.degrees(1 / R),
        "radio_m": R,
        # Campos extra (no rompen el contrato):
        "lat_sur": round(lat_sur, 8),
        "lon_este": round(lon_este, 8),
        "esquina_noroeste_m": [x0, y0],
        "sin_datos": SIN_DATOS,
        "elev_min_m": round(float(validos.min()), 2) if validos.size else None,
        "elev_max_m": round(float(validos.max()), 2) if validos.size else None,
        "celdas_sin_datos": int((z2 == SIN_DATOS).sum()),
        "orto_res_m": a.orto_res,
        "orto_ancho_px": int(banda.shape[1]),
        "orto_alto_px": int(banda.shape[0]),
        "nota": ("lat_norte/lon_oeste = esquina noroeste de la celda (0,0). Proyección equirectangular con "
                 "paralelo estándar 0: 1 celda = 2 m en el eje norte-sur y 2 m de 'este proyectado' "
                 "(≈1,993 m reales en Gale, por cos(lat)). Las elevaciones son del DEM USGS (referidas al "
                 "areoide de MOLA)."),
        "comando": ("python herramientas/recortar_terreno.py --zona {} --lat-norte {} --lat-sur {} "
                    "--lon-oeste {} --lon-este {} --orto-res {}").format(
            a.zona, a.lat_norte, a.lat_sur, a.lon_oeste, a.lon_este, a.orto_res),
    }
    with open(os.path.join(salida, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(json.dumps({k: meta[k] for k in ("ancho", "alto", "lat_norte", "lon_oeste", "lat_sur", "lon_este",
                                            "elev_min_m", "elev_max_m", "celdas_sin_datos")}, indent=1))
    for n in ("dem.tif", "dem_2m.bin", "orto.jpg", "meta.json"):
        print(f"{n}: {os.path.getsize(os.path.join(salida, n)) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()

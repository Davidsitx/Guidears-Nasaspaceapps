"""Datos crudos y capas de análisis del cráter Gale.

    python herramientas/gale_datos.py descargar --destino "G:/Mi unidad/Gale-Datos"   [--orto25]
    python herramientas/gale_datos.py procesar  --dem <dem.tif | carpeta de zona> --salida <carpeta> [--orto <orto.tif|jpg>] [--res 5]
    python herramientas/gale_datos.py qgis      --capas <carpeta de salida>      # escribe abrir_en_qgis.py

`descargar` baja las fuentes oficiales (docs/fuentes-gale.md) con reanudación: si se corta, se vuelve a correr.
`procesar` genera, para la zona del DEM: relieve en color (sombreado × color por altura), la ortoimagen en blanco y
negro coloreada por altura, pendiente, zonas prohibidas, cielo tapado y dosis de radiación estimada. Cada capa sale
como GeoTIFF (para QGIS) y como PNG + limites.json (para Gale Earth y la escena 3D).

Requiere: numpy, pillow, rasterio (pip install rasterio). Es lo mismo que usa QGIS por dentro (GDAL).
Proyección de todo: equirectangular de Marte, esfera de 3.396.190 m (la de PLACES y los mosaicos de USGS).
"""
import argparse
import json
import math
import os
import re
import sys
import time
import urllib.request

import numpy as np

R_MARTE = 3396190.0
CRS_MARTE = "+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs"
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # raíz del repo (maps-in-mars/herramientas/ → ../..)
GALE = dict(lon_oeste=136.3, lon_este=139.3, lat_norte=-3.9, lat_sur=-6.9)   # todo el cráter con borde

# ------------------------------------------------------------------------------------------------------------------
# Fuentes oficiales. tamaño en GB aproximado. "recorte": se baja solo la ventana de Gale (lectura por partes).
# ------------------------------------------------------------------------------------------------------------------
FUENTES = [
    dict(id="dem_1m", nombre="Modelo de elevación de Gale, 1 m (HiRISE+CTX+HRSC)", gb=3.6,
         url="https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif",
         cita="Calef y Parker 2016, USGS Astrogeology"),
    dict(id="hirise_color", nombre="Mosaico HiRISE color de Gale, 25 cm (COG)", gb=1.0,
         url="https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif",
         cita="USGS Astrogeology / NASA HiRISE"),
    dict(id="orto_25cm", nombre="Ortoimagen de Gale, 25 cm (blanco y negro)", gb=24.0, opcional=True,
         url="https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif",
         cita="Calef y Parker 2016, USGS Astrogeology"),
    dict(id="hrsc_mola_200m", nombre="Elevación global MOLA+HRSC 200 m (recorte de todo Gale)", gb=0.1, recorte=True,
         url="https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif",
         cita="Fergason et al. 2018, USGS Astrogeology"),
    dict(id="ctx_murray", nombre="Mosaico global CTX 5 m, teselas de 4°×4° que cubren Gale", gb=8.0, indice=True,
         url="https://murray-lab.caltech.edu/CTX/V01/tiles/",
         cita="Dickson et al. 2023, Murray Lab (Caltech) / NASA MRO CTX"),
    dict(id="places", nombre="Localización de Curiosity sol a sol (PLACES)", gb=0.01,
         url="https://planetarydata.jpl.nasa.gov/img/data/msl/msl_places/data_localizations/localized_interp.csv",
         cita="NASA PDS Imaging Node, MSL PLACES"),
    dict(id="waypoints", nombre="Recorrido oficial de Curiosity", gb=0.001,
         url="https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json",
         cita="NASA/JPL, mapa 'Where is Curiosity?'"),
]


def descargar_archivo(url, destino, intentos=5):
    """Descarga con reanudación (HTTP Range). Si el archivo ya está completo, no hace nada."""
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    parcial = destino + ".parcial"
    for intento in range(intentos):
        try:
            hecho = os.path.getsize(parcial) if os.path.exists(parcial) else 0
            req = urllib.request.Request(url, headers={"User-Agent": "GaleEarth-SpaceApps/1.0", **({"Range": f"bytes={hecho}-"} if hecho else {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                total = int(r.headers.get("Content-Length", 0)) + hecho
                modo = "ab" if hecho and r.status == 206 else "wb"
                if modo == "wb":
                    hecho = 0
                with open(parcial, modo) as f:
                    t0 = time.time()
                    while True:
                        b = r.read(1 << 20)
                        if not b:
                            break
                        f.write(b)
                        hecho += len(b)
                        if total:
                            v = hecho / max(1e-3, time.time() - t0) / 1e6
                            print(f"\r  {hecho / 1e9:6.2f} / {total / 1e9:.2f} GB  ({v:4.1f} MB/s)", end="", flush=True)
            os.replace(parcial, destino)
            print()
            return True
        except Exception as e:      # se reintenta desde donde quedó
            print(f"\n  corte ({e}); reintento {intento + 1}/{intentos}")
            time.sleep(5)
    return False


def recortar_remoto(url, destino, caja=GALE):
    """Lee solo la ventana de Gale de un GeoTIFF remoto (sin bajar el archivo entero)."""
    import rasterio
    from rasterio.windows import from_bounds
    d2r = math.pi / 180
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open("/vsicurl/" + url) as src:
            x0, x1 = caja["lon_oeste"] * d2r * R_MARTE, caja["lon_este"] * d2r * R_MARTE
            y0, y1 = caja["lat_sur"] * d2r * R_MARTE, caja["lat_norte"] * d2r * R_MARTE
            if src.crs and "lon_0=180" in src.crs.to_proj4():     # algunos mosaicos globales usan lon 0-360
                x0, x1 = x0 - math.pi * R_MARTE, x1 - math.pi * R_MARTE
            win = from_bounds(x0, y0, x1, y1, src.transform).round_offsets().round_lengths()
            datos = src.read(window=win)
            perfil = src.profile | dict(driver="GTiff", width=win.width, height=win.height,
                                        transform=src.window_transform(win), compress="deflate", tiled=True)
            with rasterio.open(destino, "w", **perfil) as dst:
                dst.write(datos)


def cmd_descargar(a):
    os.makedirs(a.destino, exist_ok=True)
    manifiesto = os.path.join(a.destino, "manifiesto.json")
    hecho = json.load(open(manifiesto)) if os.path.exists(manifiesto) else {}
    for f in FUENTES:
        if f.get("opcional") and not a.orto25:
            print(f"- {f['nombre']}: se saltea (agregá --orto25 para bajarla, {f['gb']} GB)")
            continue
        print(f"- {f['nombre']} (~{f['gb']} GB)")
        carpeta = os.path.join(a.destino, "crudos", f["id"])
        try:
            if f.get("recorte"):
                dst = os.path.join(carpeta, "gale_" + os.path.basename(f["url"]))
                if not os.path.exists(dst):
                    os.makedirs(carpeta, exist_ok=True)
                    recortar_remoto(f["url"], dst)
                archivos = [dst]
            elif f.get("indice"):
                html = urllib.request.urlopen(urllib.request.Request(f["url"], headers={"User-Agent": "GaleEarth"}), timeout=60).read().decode("utf-8", "ignore")
                nombres = sorted(set(re.findall(r'href="([^"]+\.zip)"', html)))
                elegidos = [n for n in nombres if _tesela_ctx_en_gale(n)]
                print(f"  teselas CTX sobre Gale: {elegidos}")
                archivos = []
                for n in elegidos:
                    dst = os.path.join(carpeta, os.path.basename(n))
                    if not os.path.exists(dst):
                        descargar_archivo(f["url"] + os.path.basename(n), dst)
                    archivos.append(dst)
            else:
                dst = os.path.join(carpeta, os.path.basename(f["url"]))
                if not os.path.exists(dst):
                    descargar_archivo(f["url"], dst)
                archivos = [dst]
            hecho[f["id"]] = dict(nombre=f["nombre"], url=f["url"], cita=f["cita"], archivos=[os.path.relpath(x, a.destino) for x in archivos],
                                  fecha=time.strftime("%Y-%m-%d"))
            json.dump(hecho, open(manifiesto, "w"), ensure_ascii=False, indent=1)
        except Exception as e:
            print(f"  ERROR con {f['id']}: {e}")
    print(f"Listo. Manifiesto: {manifiesto}")


def _tesela_ctx_en_gale(nombre):
    """Las teselas se nombran por su esquina (E<lon>_N<lat>). Nos quedamos con las que tocan la caja de Gale."""
    m = re.search(r"E(-?\d+)_N(-?\d+)", nombre)
    if not m:
        return False
    lon, lat = int(m.group(1)), int(m.group(2))
    lon360 = lon % 360
    return GALE["lon_oeste"] - 4 <= lon360 <= GALE["lon_este"] and GALE["lat_sur"] - 4 <= lat <= GALE["lat_norte"]


# ------------------------------------------------------------------------------------------------------------------
# Procesamiento
# ------------------------------------------------------------------------------------------------------------------
def leer_dem(ruta, res):
    """Devuelve (z, transform, res) en metros. Acepta un GeoTIFF o una carpeta de zona del repo (meta.json + dem_2m.bin)."""
    from rasterio.transform import from_origin
    if os.path.isdir(ruta):
        m = json.load(open(os.path.join(ruta, "meta.json")))
        z = np.fromfile(os.path.join(ruta, "dem_2m.bin"), "<f4").reshape(m["alto"], m["ancho"]).astype("f4")
        z[z <= -9000] = np.nan
        d2r = math.pi / 180
        t = from_origin(m["lon_oeste"] * d2r * R_MARTE, m["lat_norte"] * d2r * R_MARTE, m["tam_celda_m"], m["tam_celda_m"])
        cel = m["tam_celda_m"]
    else:
        import rasterio
        from rasterio.enums import Resampling
        with rasterio.open(ruta) as src:
            cel = src.res[0]
            k = max(1, int(round(res / cel)))
            # Lectura ya reducida (promedio): un DEM de 1 m de todo Gale no entra en memoria completo.
            h, w = src.height // k, src.width // k
            z = src.read(1, masked=True, out_shape=(h, w), resampling=Resampling.average).astype("f4").filled(np.nan)
            z[z <= -9000] = np.nan
            t = src.transform * src.transform.scale(src.width / w, src.height / h)
            return z, t, cel * k
    k = max(1, int(round(res / cel)))
    if k > 1:                       # promedio por bloques
        h, w = (z.shape[0] // k) * k, (z.shape[1] // k) * k
        z = np.nanmean(z[:h, :w].reshape(h // k, k, w // k, k), axis=(1, 3))
        t = t * t.scale(k, k)
    return z, t, cel * k


def pendiente_deg(z, cs):
    gy, gx = np.gradient(z, cs, cs)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def sombreado(z, cs, az=315, alt=35):
    gy, gx = np.gradient(z, cs, cs)
    pend, asp = np.arctan(np.hypot(gx, gy)), np.arctan2(-gx, gy)
    a, b = math.radians(az), math.radians(alt)
    return np.clip(math.sin(b) * np.cos(pend) + math.cos(b) * np.sin(pend) * np.cos(a - asp), 0, 1)


# Paleta por altura (bajo -> alto): llanuras azul-verde, laderas amarillo-naranja, montaña roja-blanca.
PALETA = [(0.00, (40, 70, 140)), (0.18, (40, 140, 170)), (0.35, (70, 170, 100)), (0.52, (220, 200, 90)),
          (0.70, (220, 130, 60)), (0.86, (170, 70, 50)), (1.00, (245, 240, 235))]


def colorear(v):
    """v en 0..1 -> RGB uint8 según PALETA."""
    v = np.clip(np.nan_to_num(v, nan=0), 0, 1)
    out = np.zeros(v.shape + (3,), "f4")
    for (p0, c0), (p1, c1) in zip(PALETA, PALETA[1:]):
        m = (v >= p0) & (v <= p1)
        u = ((v - p0) / (p1 - p0))[m][:, None]
        out[m] = np.array(c0) * (1 - u) + np.array(c1) * u
    return out


def cielo_tapado(z, cs, n_dir=16, alcance_m=400.0):
    """Fracción del cielo tapada por el relieve (mismo método que escena3d/armar.py)."""
    h, w = z.shape
    zz = np.nan_to_num(z, nan=np.nanmean(z))
    acum = np.zeros_like(zz)
    pasos = max(1, int(alcance_m / cs))
    for k in range(n_dir):
        th = 2 * math.pi * k / n_dir
        dx, dy = math.cos(th), math.sin(th)
        hmax, vistos = np.zeros_like(zz), set()
        for paso in range(1, pasos + 1):
            ox, oy = int(round(dx * paso)), int(round(dy * paso))
            if (ox, oy) in vistos or (ox == 0 and oy == 0):
                continue
            vistos.add((ox, oy))
            dist = math.hypot(ox * cs, oy * cs)
            if dist > alcance_m:
                break
            ys, yd = slice(max(0, -oy), h - max(0, oy)), slice(max(0, oy), h - max(0, -oy))
            xs, xd = slice(max(0, -ox), w - max(0, ox)), slice(max(0, ox), w - max(0, -ox))
            ang = np.zeros_like(zz)
            ang[ys, xs] = np.arctan2(zz[yd, xd] - zz[ys, xs], dist)
            np.maximum(hmax, ang, out=hmax)
        acum += np.sin(hmax)
    return acum / n_dir


def guardar(nombre, rgb_o_valor, t, salida, limites, alfa=None, nodata=None):
    """GeoTIFF (QGIS) + PNG (web)."""
    import rasterio
    from PIL import Image
    arr = rgb_o_valor
    if arr.ndim == 3:
        bandas = np.moveaxis(np.nan_to_num(arr, nan=0).astype("u1"), -1, 0)
        if alfa is not None:
            bandas = np.concatenate([bandas, alfa[None].astype("u1")])
        perfil = dict(driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=bandas.shape[0], dtype="uint8",
                      crs=CRS_MARTE, transform=t, compress="deflate", tiled=True)
        with rasterio.open(os.path.join(salida, nombre + ".tif"), "w", **perfil) as dst:
            dst.write(bandas)
        Image.fromarray(np.moveaxis(bandas, 0, -1), "RGBA" if alfa is not None else "RGB").save(os.path.join(salida, nombre + ".png"), optimize=True)
    else:
        perfil = dict(driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=1, dtype="float32",
                      crs=CRS_MARTE, transform=t, compress="deflate", tiled=True, nodata=nodata)
        with rasterio.open(os.path.join(salida, nombre + ".tif"), "w", **perfil) as dst:
            dst.write(arr.astype("f4"), 1)
    limites[nombre] = True


def cmd_procesar(a):
    os.makedirs(a.salida, exist_ok=True)
    par = json.load(open(os.path.join(RAIZ, "data", "parametros.json")))
    lim_astro = par["astronauta"]["pendiente_max_deg"]
    lim_rover = par["vehiculo"]["pendiente_max_deg"]
    dosis_sup = par["radiacion"]["dosis_superficie_mSv_dia"]
    blindaje = par["radiacion"]["factor_blindaje_relieve"]

    print("leyendo DEM…")
    z, t, cs = leer_dem(a.dem, a.res)
    h, w = z.shape
    d2r = math.pi / 180
    lon0, lat0 = t.c / R_MARTE / d2r, t.f / R_MARTE / d2r
    lon1, lat1 = (t.c + w * t.a) / R_MARTE / d2r, (t.f + h * t.e) / R_MARTE / d2r
    caja = dict(lon_oeste=lon0, lon_este=lon1, lat_norte=lat0, lat_sur=lat1, res_m=cs, ancho=w, alto=h)
    print(f"  {w}×{h} celdas de {cs:g} m · lon {lon0:.4f}–{lon1:.4f} · lat {lat1:.4f}–{lat0:.4f}")
    capas = {}

    zmin, zmax = np.nanpercentile(z, 1), np.nanpercentile(z, 99)
    tinte = colorear((z - zmin) / (zmax - zmin))
    hs = sombreado(z, cs)[..., None]
    print("relieve en color…")
    valido = (~np.isnan(z)).astype("u1") * 255          # transparente donde el DEM no tiene datos
    guardar("relieve_color", np.clip(tinte * (0.35 + 0.75 * hs), 0, 255), t, a.salida, capas, alfa=valido)

    if a.orto:
        print("ortoimagen coloreada por altura…")
        from PIL import Image
        if a.orto.lower().endswith((".jpg", ".png")):
            g = np.asarray(Image.open(a.orto).convert("L").resize((w, h), Image.BILINEAR), "f4") / 255
        else:
            import rasterio
            from rasterio.enums import Resampling
            from rasterio.windows import from_bounds
            with rasterio.open(a.orto) as src:
                # Ventana de la orto que coincide con la caja del DEM (las dos pueden tener distinta extensión).
                ven = from_bounds(t.c, t.f + h * t.e, t.c + w * t.a, t.f, src.transform)
                g = src.read(out_shape=(src.count, h, w), window=ven, boundless=True, fill_value=0,
                             resampling=Resampling.average).astype("f4").mean(axis=0)
                hay = g > 0
                p1, p99 = np.percentile(g[hay], 1), np.percentile(g[hay], 99)
                g = (g - p1) / (p99 - p1)
                g[~hay] = np.nan
        g = np.where(np.isnan(g), hs[..., 0], np.clip(g, 0, 1))[..., None]   # sin foto: usa el sombreado
        guardar("orto_color", np.clip(tinte * (0.25 + 0.95 * g), 0, 255), t, a.salida, capas, alfa=valido)   # falso color: brillo de la foto, color de la altura

    print("pendiente y zonas prohibidas…")
    pend = pendiente_deg(z, cs)
    guardar("pendiente_deg", pend, t, a.salida, capas, nodata=np.nan)
    clase = np.zeros((h, w, 3), "u1")
    alfa = np.zeros((h, w), "u1")
    prec = (pend >= min(lim_astro, lim_rover) - 5) & (pend < min(lim_astro, lim_rover))
    clase[prec], alfa[prec] = (240, 200, 60), 110                              # precaución
    solo_rover = (pend >= lim_rover) & (pend < lim_astro)
    clase[solo_rover], alfa[solo_rover] = (229, 83, 75), 150                   # prohibida para el rover
    solo_astro = (pend >= lim_astro) & (pend < lim_rover)
    clase[solo_astro], alfa[solo_astro] = (242, 140, 56), 150                  # prohibida para el astronauta
    ambos = (pend >= lim_astro) & (pend >= lim_rover)
    clase[ambos], alfa[ambos] = (142, 68, 173), 170                            # prohibida para los dos
    guardar("zonas_prohibidas", clase, t, a.salida, capas, alfa=alfa)
    pend_max = float(np.nanmax(pend))
    del tinte, hs, pend, clase, alfa, prec, solo_rover, solo_astro, ambos   # liberar memoria antes del cálculo de cielo
    if a.orto:
        del g

    print("cielo tapado y dosis de radiación (puede tardar)…")
    cs_cielo = max(cs, 10.0)
    k = max(1, int(round(cs_cielo / cs)))
    zc = z[: (h // k) * k, : (w // k) * k].reshape(h // k, k, w // k, k).mean(axis=(1, 3)) if k > 1 else z
    f = cielo_tapado(zc, cs * k)
    f = np.kron(f, np.ones((k, k), "f4"))
    f = np.pad(f, ((0, h - f.shape[0]), (0, w - f.shape[1])), mode="edge")
    dosis = dosis_sup * (1 - blindaje * f)
    f[np.isnan(z)] = np.nan; dosis[np.isnan(z)] = np.nan
    guardar("cielo_tapado", f, t, a.salida, capas, nodata=np.nan)
    guardar("dosis_mSv_dia", dosis, t, a.salida, capas, nodata=np.nan)
    del f
    d01 = np.nan_to_num((dosis - np.nanmin(dosis)) / max(1e-9, np.nanmax(dosis) - np.nanmin(dosis)))
    rgb = np.stack([60 + 195 * d01, 200 - 120 * d01, 255 - 200 * d01], -1)
    guardar("dosis_color", rgb, t, a.salida, capas, alfa=(valido // 255 * 150).astype("u1"))

    meta = dict(caja=caja, crs=CRS_MARTE, capas=list(capas), fuente_dem=a.dem, orto=a.orto,
                parametros=dict(pendiente_astronauta=lim_astro, pendiente_rover=lim_rover, dosis_superficie=dosis_sup, blindaje=blindaje),
                notas=["relieve_color y orto_color son FALSO COLOR: el color indica la altura, no el color real de Marte.",
                       "zonas_prohibidas: violeta = ninguno; rojo = rover; naranja = astronauta; amarillo = precaución (5° bajo el límite).",
                       "dosis_mSv_dia: dosis de superficie de RAD × (1 - factor × cielo tapado). Cálculo propio, provisorio."],
                elev_min=float(np.nanmin(z)), elev_max=float(np.nanmax(z)), pend_max=pend_max,
                dosis_min=float(np.nanmin(dosis)), dosis_max=float(np.nanmax(dosis)), armado=time.strftime("%Y-%m-%d %H:%M"))
    json.dump(meta, open(os.path.join(a.salida, "limites.json"), "w"), ensure_ascii=False, indent=1)
    print(f"Listo: {a.salida}  ({', '.join(capas)})")


def cmd_qgis(a):
    """Script para la consola de Python de QGIS: carga todas las capas con la proyección de Marte."""
    carpeta = os.path.abspath(a.capas)
    s = f'''# Pegar en QGIS: Complementos > Consola de Python > Mostrar editor > abrir este archivo > Ejecutar.
import os
from qgis.core import QgsProject, QgsRasterLayer, QgsCoordinateReferenceSystem
CARPETA = r"{carpeta}"
crs = QgsCoordinateReferenceSystem()
crs.createFromProj("{CRS_MARTE}")
orden = ["relieve_color", "orto_color", "pendiente_deg", "cielo_tapado", "dosis_color", "zonas_prohibidas"]
for nombre in orden:
    ruta = os.path.join(CARPETA, nombre + ".tif")
    if os.path.exists(ruta):
        capa = QgsRasterLayer(ruta, nombre)
        capa.setCrs(crs)
        QgsProject.instance().addMapLayer(capa)
QgsProject.instance().setCrs(crs)
print("Capas de Gale cargadas")
'''
    open(os.path.join(carpeta, "abrir_en_qgis.py"), "w", encoding="utf-8").write(s)
    print(os.path.join(carpeta, "abrir_en_qgis.py"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    d = sp.add_parser("descargar"); d.add_argument("--destino", required=True); d.add_argument("--orto25", action="store_true")
    p = sp.add_parser("procesar"); p.add_argument("--dem", required=True); p.add_argument("--salida", required=True)
    p.add_argument("--orto"); p.add_argument("--res", type=float, default=5.0)
    q = sp.add_parser("qgis"); q.add_argument("--capas", required=True)
    a = ap.parse_args()
    {"descargar": cmd_descargar, "procesar": cmd_procesar, "qgis": cmd_qgis}[a.cmd](a)


if __name__ == "__main__":
    main()

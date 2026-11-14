"""Nivel 9 de terreno para TODO Marte (~325 m entre alturas) desde el DEM HRSC/MOLA Blend v2 a 200 m
(resolución completa, GeoTIFF de USGS). Complementa los niveles 0–8 globales.
Las teselas dentro de la caja de Gale no se generan (ya existen hasta el nivel 10 con el mismo DEM).
Parte la salida en varios .zip (< 380 MB); el meta.json actualizado va en terreno_zz_meta.zip.

Uso: python3 teselas_terreno_global9.py DEM_200m.tif META_ACTUAL.json SALIDA_DIR
"""
import os, sys, json, zipfile
import numpy as np
import rasterio
from rasterio.windows import Window
from scipy.ndimage import map_coordinates
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from teselas_terreno import a_centrica, radio_elipsoide, codificar, interseca, R, N

NIVEL = 9
LIMITE = 380e6


def main():
    ruta, meta_ant, salida = sys.argv[1:4]
    os.makedirs(salida, exist_ok=True)
    meta = json.load(open(meta_ant))
    caja_gale = next(r["caja_geodetica"] for r in meta["rangos"] if r["niveles"][0] == 8 and r["caja_geodetica"])
    d = 180.0 / 2 ** NIVEL
    nx, ny = 2 ** (NIVEL + 1), 2 ** NIVEL
    partes, z, peso, total = [], None, 0, 0

    def nuevo():
        nonlocal z, peso
        if z:
            z.close()
        nombre = f"terreno_marte_global_n9_{len(partes) + 1:02d}.zip"
        partes.append(nombre)
        z, peso = zipfile.ZipFile(os.path.join(salida, nombre), "w", zipfile.ZIP_DEFLATED, compresslevel=6), 0

    nuevo()
    with rasterio.open(ruta) as src:
        T = src.transform
        x0, y0, dx, dy = T.c / (R * np.pi / 180), T.f / (R * np.pi / 180), T.a / (R * np.pi / 180), T.e / (R * np.pi / 180)
        if abs(T.a) < 1:      # el GeoTIFF ya viene en grados
            x0, y0, dx, dy = T.c, T.f, T.a, T.e
        for y in range(ny):
            norte = 90 - y * d
            latc = a_centrica(norte - np.arange(N) * d / (N - 1))
            f0 = max(0, int((latc.max() - y0) / dy) - 3)
            f1 = min(src.height, int((latc.min() - y0) / dy) + 4)
            banda = src.read(1, window=Window(0, f0, src.width, f1 - f0)).astype("f4")
            valido = banda > -32000
            if not valido.all():
                banda = np.where(valido, banda, np.nanmean(np.where(valido, banda, np.nan)) if valido.any() else 0)
            lons = -180 + np.arange(nx * (N - 1) + 1) * d / (N - 1)
            LON, LATC = np.meshgrid(lons, latc)
            col = (LON - x0) / dx - 0.5
            fil = (LATC - y0) / dy - 0.5 - f0
            h = map_coordinates(banda, [fil, col], order=1, mode="nearest").astype("f4")
            h = h + (R - radio_elipsoide(LATC))
            for x in range(nx):
                if interseca((-180 + x * d, norte - d, -180 + (x + 1) * d, norte), caja_gale):
                    continue
                datos = codificar(h[:, x * (N - 1):x * (N - 1) + N])
                if peso + len(datos) > LIMITE:
                    nuevo()
                z.writestr(f"{NIVEL}/{x}/{y}.bin", datos)
                peso += len(datos)
                total += 1
            if y % 32 == 0:
                print(f"fila {y}/{ny} · {total} teselas · {len(partes)} zip", flush=True)
    for r in meta["rangos"]:
        if r["niveles"] == [8, 8] and r["caja_geodetica"] is None:
            r["niveles"] = [8, 9]
    meta["fuentes"].append("USGS Astrogeology: Mars HRSC MOLA Blended DEM Global 200m v2 (resolución completa) para el nivel 9 global")
    meta["teselas"] = meta.get("teselas", 0) + total
    z.close()
    # meta.json en un .zip propio que siempre queda último en orden alfabético (es el que lee el visor)
    with zipfile.ZipFile(os.path.join(salida, "terreno_zz_meta.zip"), "w") as zm:
        zm.writestr("meta.json", json.dumps(meta, ensure_ascii=False))
    json.dump(meta, open(os.path.join(salida, "terreno_marte_gale.json"), "w"), ensure_ascii=False, indent=1)
    print("listo", total, partes, flush=True)


if __name__ == "__main__":
    main()

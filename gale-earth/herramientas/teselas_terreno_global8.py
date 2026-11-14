"""Nivel 8 de terreno para TODO Marte (~650 m entre alturas) desde el DEM HRSC/MOLA Blend a 400 m.

Complementa a teselas_terreno.py (niveles 0–7 globales, 8–10 Gale, 11–15 MSL). Las teselas de nivel 8
dentro de la caja de Gale no se generan acá (ya existen, hechas con el DEM a 200 m).
Escribe cuatro .zip (< 400 MB cada uno) y un meta.json actualizado que el visor lee (va en el último .zip).

Uso: python3 teselas_terreno_global8.py hrsc_global_k2.npy SALIDA_DIR META_ANTERIOR.json
"""
import os, sys, json, zipfile
import numpy as np
from scipy.ndimage import map_coordinates
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from teselas_terreno import a_centrica, radio_elipsoide, codificar, interseca, R, N

NIVEL = 8


def main():
    ruta, salida, meta_ant = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(salida, exist_ok=True)
    z = np.load(ruta, mmap_mode="r")
    x0, y0, dx, dy = map(float, open(ruta.replace(".npy", ".txt")).read().split())
    H, W = z.shape
    meta = json.load(open(meta_ant))
    caja_gale = next(r["caja_geodetica"] for r in meta["rangos"] if r["niveles"][0] == 8)
    d = 180.0 / 2 ** NIVEL
    nx, ny = 2 ** (NIVEL + 1), 2 ** NIVEL
    zips = [zipfile.ZipFile(os.path.join(salida, f"terreno_marte_global_n8_{p}.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=6) for p in "abcd"]
    total = 0
    for y in range(ny):
        norte = 90 - y * d
        lat_geo = norte - np.arange(N) * d / (N - 1)
        latc = a_centrica(lat_geo)
        # banda de filas de la fuente que cubre esta fila de teselas (con margen)
        f0 = max(0, int((latc.max() - y0) / dy) - 3)
        f1 = min(H, int((latc.min() - y0) / dy) + 4)
        banda = np.asarray(z[f0:f1]).astype("f4")
        valido = banda > -32000
        relleno = np.where(valido, banda, np.nan)
        media = np.nanmean(relleno) if valido.any() else 0.0
        banda = np.where(valido, banda, media)
        lons = -180 + np.arange(nx * (N - 1) + 1) * d / (N - 1)
        LON, LATC = np.meshgrid(lons, latc)
        col = (LON - x0) / dx - 0.5
        fil = (LATC - y0) / dy - 0.5 - f0
        h = map_coordinates(banda, [fil, col], order=1, mode="nearest").astype("f4")
        h = h + (R - radio_elipsoide(LATC))
        for x in range(nx):
            if interseca((-180 + x * d, norte - d, -180 + (x + 1) * d, norte), caja_gale):
                continue
            i = x * (N - 1)
            zips[min(3, x // (nx // 4))].writestr(f"{NIVEL}/{x}/{y}.bin", codificar(h[:, i:i + N]))
            total += 1
        if y % 32 == 0:
            print(f"fila {y}/{ny} · {total} teselas", flush=True)
    rangos = meta["rangos"]
    rangos.insert(1, {"niveles": [8, 8], "caja_geodetica": None})
    meta["rangos"] = rangos
    meta["fuentes"].append("USGS Astrogeology: Mars HRSC MOLA Blended DEM Global 200m v2 (overview a 400 m) para el nivel 8 global")
    meta["teselas"] = meta.get("teselas", 0) + total
    zips[-1].writestr("meta.json", json.dumps(meta, ensure_ascii=False))   # el último .zip (orden alfabético) manda
    for zz in zips:
        zz.close()
    json.dump(meta, open(os.path.join(salida, "terreno_marte_gale.json"), "w"), ensure_ascii=False, indent=1)
    print("listo", total, flush=True)


if __name__ == "__main__":
    main()

"""Terreno de alta resolución (niveles 16–17: ~2,5 m y ~1,25 m entre alturas) en un corredor alrededor
del recorrido de Curiosity, desde el DEM MSL Gale 1 m (USGS). Ahí es donde el visor se acerca más (pozos).
Solo se escriben teselas con datos completos; donde no hay, el visor amplía la tesela del nivel 15.

Uso: python3 teselas_terreno_recorrido.py DEM_1m.tif recorrido.geojson META_ACTUAL.json SALIDA_DIR [ancho_km]
"""
import os, sys, json, math, zipfile
import numpy as np
import rasterio
from rasterio.windows import Window
from scipy.ndimage import map_coordinates
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from teselas_terreno import a_centrica, a_geodetica, radio_elipsoide, codificar, R, N

M_POR_GRADO = R * math.pi / 180


def main():
    dem, geo, meta_ant, salida = sys.argv[1:5]
    ancho_km = float(sys.argv[5]) if len(sys.argv) > 5 else 1.2
    os.makedirs(salida, exist_ok=True)
    linea = json.load(open(geo))
    feat = linea["features"][0] if "features" in linea else linea
    pts = np.array(feat["geometry"]["coordinates"])[:, :2]          # lon, lat planetocéntricos
    # densificar el recorrido cada ~50 m
    dens = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(np.hypot(*(b - a)) * M_POR_GRADO / 50))
        dens += [a + (b - a) * k / n for k in range(1, n + 1)]
    dens = np.array(dens)
    buf = ancho_km * 1000 / M_POR_GRADO
    meta = json.load(open(meta_ant))
    z = zipfile.ZipFile(os.path.join(salida, "terreno_recorrido_n16-17.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=6)
    total, caja = 0, [999, 999, -999, -999]
    with rasterio.open(dem) as src:
        T = src.transform
        for n in (16, 17):
            d = 180 / 2 ** n
            tiles = set()
            for lon, latc in dens:
                lg = float(a_geodetica(latc))
                for dx in np.arange(-buf, buf + d, d):
                    for dy in np.arange(-buf, buf + d, d):
                        tiles.add((int((lon + dx + 180) // d), int((90 - (lg + dy)) // d)))
            cuenta = 0
            for x, y in sorted(tiles):
                oeste, norte = -180 + x * d, 90 - y * d
                lons = oeste + np.arange(N) * d / (N - 1)
                latc = a_centrica(norte - np.arange(N) * d / (N - 1))
                LON, LATC = np.meshgrid(lons, latc)
                col = (LON * M_POR_GRADO - T.c) / T.a - 0.5
                fil = (LATC * M_POR_GRADO - T.f) / T.e - 0.5
                c0, c1 = int(col.min()) - 2, int(col.max()) + 3
                f0, f1 = int(fil.min()) - 2, int(fil.max()) + 3
                if c0 < 0 or f0 < 0 or c1 > src.width or f1 > src.height:
                    continue
                a = src.read(1, window=Window(c0, f0, c1 - c0, f1 - f0)).astype("f4")
                if (a <= -9000).any():
                    continue                                    # sin datos completos: el visor usa el nivel 15
                h = map_coordinates(a, [fil - f0, col - c0], order=1, mode="nearest")
                h = h + (R - radio_elipsoide(LATC))
                z.writestr(f"{n}/{x}/{y}.bin", codificar(h.astype("f4")))
                cuenta += 1
                caja = [min(caja[0], oeste), min(caja[1], norte - d), max(caja[2], oeste + d), max(caja[3], norte)]
            total += cuenta
            print(f"nivel {n}: {cuenta} teselas", flush=True)
    meta["rangos"].append({"niveles": [16, 17], "caja_geodetica": caja})
    meta["fuentes"].append(f"USGS Astrogeology: MSL Gale DEM Mosaic 1m v3 (niveles 16–17 en un corredor de ±{ancho_km} km del recorrido de Curiosity)")
    meta["teselas"] = meta.get("teselas", 0) + total
    z.writestr("meta.json", json.dumps(meta, ensure_ascii=False))
    z.close()
    json.dump(meta, open(os.path.join(salida, "terreno_marte_gale.json"), "w"), ensure_ascii=False, indent=1)
    print("listo", total, caja, flush=True)


if __name__ == "__main__":
    main()

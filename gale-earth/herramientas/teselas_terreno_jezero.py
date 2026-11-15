"""Relieve fino del cráter Jezero (niveles 10–13: ~80, 40, 20 y 10 m entre alturas) para el globo de Gale Earth.

Fuente: M20_JezeroCrater_CTXDEM_20m.tif, modelo de elevación de 20 m hecho con imágenes CTX para la misión
Mars 2020 (NASA/JPL, "Science Investigation Maps"; servidor USGS Astrogeology, mosaic/mars2020_trn/CTX/).
Proyección equirectangular sobre la esfera de 3396,19 km (paralelo estándar 18,4663°), alturas sobre el areoide MOLA.

Para que no haya escalón con el resto del planeta, en los últimos 4 km hacia el borde del DEM (y alrededor de
cualquier hueco) la altura se funde con el DEM global HRSC-MOLA Blend (USGS, el mismo de los niveles 0–9).
Las alturas se pasan al elipsoide de Cesium igual que en teselas_terreno.py (aproximación visual, no geodesia).

Uso: python teselas_terreno_jezero.py DEM_JEZERO.tif HRSC_GLOBAL_k2 (sin .npy) META_ACTUAL.json SALIDA_DIR
Escribe SALIDA_DIR/terreno_jezero_n10-13.zip y SALIDA_DIR/meta.json (el meta anterior + el rango nuevo).
"""
import os, sys, json, math, zipfile
import numpy as np
import rasterio
from scipy.ndimage import map_coordinates, distance_transform_edt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from teselas_terreno import a_centrica, a_geodetica, radio_elipsoide, codificar, R, N

NIVELES = (10, 11, 12, 13)
FUNDIDO_KM = 4.0


def main():
    dem_tif, glob_base, meta_ant, salida = sys.argv[1:5]
    os.makedirs(salida, exist_ok=True)
    with rasterio.open(dem_tif) as s:
        Z = s.read(1).astype("f4"); T = s.transform
        Z[(Z < -1e30) | ~np.isfinite(Z)] = np.nan
        lat_ts = 18.4663                                   # paralelo estándar (ver el .xml / la proyección del archivo)
        for p in s.crs.to_wkt().split("PARAMETER"):
            if "standard_parallel_1" in p: lat_ts = float(p.split(",")[1].split("]")[0])
    k = R * math.cos(math.radians(lat_ts))
    E0, N0, dE, dN = T.c, T.f, T.a, T.e                    # esquina superior izquierda y paso (m)
    h, w = Z.shape
    lon_o, lon_e = math.degrees(E0 / k), math.degrees((E0 + w * dE) / k)
    lat_n, lat_s = math.degrees(N0 / R), math.degrees((N0 + h * dN) / R)
    print(f"DEM Jezero {w}x{h}, lon {lon_o:.3f}..{lon_e:.3f}, lat {lat_s:.3f}..{lat_n:.3f}")

    valido = np.isfinite(Z)
    peso = np.clip(distance_transform_edt(np.pad(valido, 1))[1:-1, 1:-1] * abs(dE) / (FUNDIDO_KM * 1000), 0, 1).astype("f4")
    Zf = np.where(valido, Z, 0).astype("f4")

    # DEM global HRSC-MOLA a 400 m (recorte con margen)
    G = np.load(glob_base + ".npy", mmap_mode="r"); gx0, gy0, gdx, gdy = map(float, open(glob_base + ".txt").read().split())
    m = 1.0
    c0, c1 = int((lon_o - m - gx0) / gdx), int((lon_e + m - gx0) / gdx) + 1
    f0, f1 = int((lat_n + m - gy0) / gdy), int((lat_s - m - gy0) / gdy) + 1
    Gc = np.asarray(G[f0:f1, c0:c1], "f4"); gx0c, gy0c = gx0 + c0 * gdx, gy0 + f0 * gdy

    def muestra(lon, latc):
        col = (np.radians(lon) * k - E0) / dE - 0.5; fil = (np.radians(latc) * R - N0) / dN - 0.5
        zj = map_coordinates(Zf, [fil, col], order=1, mode="nearest")
        pj = map_coordinates(peso, [fil, col], order=1, mode="constant", cval=0)
        zg = map_coordinates(Gc, [(latc - gy0c) / gdy - 0.5, (lon - gx0c) / gdx - 0.5], order=1, mode="nearest")
        return pj * zj + (1 - pj) * zg, pj

    caja_g = [lon_o, float(a_geodetica(lat_s)), lon_e, float(a_geodetica(lat_n))]
    nombre = "terreno_jezero_n10-13.zip"
    z = zipfile.ZipFile(os.path.join(salida, nombre), "w", zipfile.ZIP_DEFLATED, compresslevel=6)
    total = 0
    for n in NIVELES:
        d = 180 / 2 ** n
        x0, x1 = int((caja_g[0] + 180) // d), int((caja_g[2] + 180) // d)
        y0, y1 = int((90 - caja_g[3]) // d), int((90 - caja_g[1]) // d)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                o, no = -180 + x * d, 90 - y * d
                lon = o + np.arange(N) * d / (N - 1)
                latg = no - np.arange(N) * d / (N - 1)
                LON, LATG = np.meshgrid(lon, latg)
                LATC = a_centrica(LATG)
                hz, pj = muestra(LON, LATC)
                if pj.max() <= 0: continue                  # tesela sin nada del DEM fino: queda la global
                hel = hz + (R - radio_elipsoide(LATC))     # altura sobre el elipsoide de Cesium
                z.writestr(f"{n}/{x}/{y}.bin", codificar(hel.astype("f4")))
                total += 1
        print("nivel", n, "listo; teselas acumuladas", total)
    z.close()
    meta = json.load(open(meta_ant, encoding="utf-8"))
    meta["rangos"] = [r for r in meta["rangos"] if r.get("nombre") != "jezero"] + [dict(nombre="jezero", niveles=[NIVELES[0], NIVELES[-1]], caja_geodetica=caja_g)]
    meta["teselas"] = meta.get("teselas", 0) + total
    fuente = "NASA/JPL Mars 2020: Jezero Crater CTX DEM 20 m (Science Investigation Maps, servidor USGS Astrogeology), fundido con HRSC-MOLA en los 4 km del borde"
    if fuente not in meta["fuentes"]: meta["fuentes"].append(fuente)
    json.dump(meta, open(os.path.join(salida, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("listo:", total, "teselas,", os.path.getsize(os.path.join(salida, nombre)) // 1024, "KB; caja", [round(v, 4) for v in caja_g])


if __name__ == "__main__":
    main()

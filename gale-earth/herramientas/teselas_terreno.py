"""Pirámide de terreno para el globo de Gale Earth (CesiumJS, CustomHeightmapTerrainProvider).

Esquema: GeographicTilingScheme sobre Ellipsoid.MARS (a=3396190, b=3376200), nivel 0 = 2×1, 65×65 alturas.
Fuentes (de menor a mayor detalle), todas USGS Astrogeology / NASA PDS:
  - niveles 0–7  (≈1,3 km; fuente ≈1,6 km): DEM global HRSC/MOLA Blend v2 (200 m), reducido ×8
  - niveles 8–10 (≈160 m):  el mismo DEM a 200 m, región del cráter Gale
  - niveles 11–15 (≈5 m):   DEM de 1 m del área de MSL (promediado a 5 m)
Correcciones: latitud geodética del elipsoide → planetocéntrica de los DEM, y altura sobre la esfera
de 3396,19 km → altura sobre el elipsoide de Cesium. Los DEM están referidos al areoide; esa diferencia
(≤ 2 km, muy suave) no se corrige: es una aproximación visual, no geodesia.

Formato de cada tesela: float32 mínimo, float32 escala, 65×65 uint16 (little endian). Zip con deflate.
Uso: python3 teselas_terreno.py DIR_DATOS SALIDA_DIR
  DIR_DATOS debe tener hrsc_global_k8.npy/.txt, hrsc_gale.npy/.txt y msl_5m.npy/.txt
"""
import os, sys, json, math, struct, zipfile
import numpy as np
from scipy.ndimage import map_coordinates

A, B = 3396190.0, 3376200.0
R = 3396190.0
N = 65


def a_centrica(lat_geo_deg):
    return np.degrees(np.arctan(np.tan(np.radians(lat_geo_deg)) * (B * B) / (A * A)))


def a_geodetica(lat_c_deg):
    return np.degrees(np.arctan(np.tan(np.radians(lat_c_deg)) * (A * A) / (B * B)))


def radio_elipsoide(lat_c_deg):
    p = np.radians(lat_c_deg)
    return A * B / np.sqrt((B * np.cos(p)) ** 2 + (A * np.sin(p)) ** 2)


class Fuente:
    def __init__(self, base):
        self.z = np.load(base + ".npy").astype("f4")
        x0, y0, dx, dy = map(float, open(base + ".txt").read().split())
        self.x0, self.y0, self.dx, self.dy = x0, y0, dx, dy     # grados planetocéntricos, esquina sup. izq.
        h, w = self.z.shape
        self.caja = (x0, y0 + h * dy, x0 + w * dx, y0)          # oeste, sur, este, norte
        self.valido = ~np.isnan(self.z)
        self.zf = np.where(self.valido, self.z, 0).astype("f4")

    def muestrear(self, lon, latc, k=1):
        z, val = (self.zf, self.valido.astype("f4")) if k == 1 else self.reducida(k)
        dx, dy = self.dx * k, self.dy * k
        col = (lon - self.x0) / dx - 0.5
        fil = (latc - self.y0) / dy - 0.5
        v = map_coordinates(z, [fil, col], order=1, mode="nearest")
        p = map_coordinates(val, [fil, col], order=1, mode="constant", cval=0)
        dentro = (col >= -0.5) & (col <= z.shape[1] - 0.5) & (fil >= -0.5) & (fil <= z.shape[0] - 0.5)
        ok = dentro & (p > 0.999)
        return np.where(ok, v / np.maximum(p, 1e-6), np.nan)

    _cache = None

    def reducida(self, k):
        if self._cache is None:
            self._cache = {}
        if k not in self._cache:
            h, w = (self.z.shape[0] // k) * k, (self.z.shape[1] // k) * k
            v = self.valido[:h, :w].reshape(h // k, k, w // k, k).astype("f4").mean(axis=(1, 3))
            s = self.zf[:h, :w].reshape(h // k, k, w // k, k).sum(axis=(1, 3)) / (k * k)
            self._cache[k] = (np.where(v > 0, s / np.maximum(v, 1e-6), 0).astype("f4") * (v > 0.999), (v > 0.999).astype("f4"))
        return self._cache[k]


def interseca(rect, caja):
    return not (rect[2] <= caja[0] or rect[0] >= caja[2] or rect[3] <= caja[1] or rect[1] >= caja[3])


def codificar(h):
    mn, mx = float(h.min()), float(h.max())
    esc = (mx - mn) / 65535 if mx > mn else 1.0
    q = np.round((h - mn) / esc).astype("<u2")
    return struct.pack("<ff", mn, esc) + q.tobytes()


def main():
    datos, salida = sys.argv[1], sys.argv[2]
    os.makedirs(salida, exist_ok=True)
    glob = Fuente(os.path.join(datos, "hrsc_global_k8"))
    gale = Fuente(os.path.join(datos, "hrsc_gale"))
    msl = Fuente(os.path.join(datos, "msl_5m"))
    # Cajas en grados GEODÉTICOS (las que usa Cesium para decidir qué teselas existen)
    caja_geo = lambda c: (c[0], float(a_geodetica(c[1])), c[2], float(a_geodetica(c[3])))
    niveles = [(0, 7, None, [glob])]
    niveles.append((8, 10, caja_geo(gale.caja), [gale, glob]))
    niveles.append((11, 15, caja_geo(msl.caja), [msl, gale, glob]))
    # Dos .zip (< 400 MB cada uno, para que entren en Drive): global (niveles 0–7) y Gale (8–15)
    zg = zipfile.ZipFile(os.path.join(salida, "terreno_marte_global_n0-7.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=6)
    zl = zipfile.ZipFile(os.path.join(salida, "terreno_gale_n8-15.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=6)
    total = 0
    for n0, n1, caja, fuentes in niveles:
        for n in range(n0, n1 + 1):
            d = 180.0 / 2 ** n
            nx, ny = 2 ** (n + 1), 2 ** n
            xs = range(nx) if caja is None else range(max(0, int((caja[0] + 180) // d)), min(nx - 1, int((caja[2] + 180) // d)) + 1)
            ys = range(ny) if caja is None else range(max(0, int((90 - caja[3]) // d)), min(ny - 1, int((90 - caja[1]) // d)) + 1)
            cuenta = 0
            z = zg if n <= 7 else zl
            for y in ys:
                norte = 90 - y * d
                lat_geo = norte - np.arange(N) * d / (N - 1)
                latc = a_centrica(lat_geo)
                x_ini, x_fin = xs[0], xs[-1]
                lons = -180 + x_ini * d + np.arange((x_fin - x_ini + 1) * (N - 1) + 1) * d / (N - 1)
                LON, LATC = np.meshgrid(lons, latc)
                h = np.full(LON.shape, np.nan, "f4")
                for f in fuentes:
                    falta = np.isnan(h)
                    if not falta.any():
                        break
                    # resolución de la fuente adecuada al nivel (evita aliasing)
                    paso_m = d / (N - 1) * R * math.pi / 180
                    k = max(1, int(paso_m / (abs(f.dx) * R * math.pi / 180) / 1.5))
                    k = 1 if f is glob else min(k, 64)
                    h[falta] = f.muestrear(LON[falta], LATC[falta], k)
                h = np.nan_to_num(h, nan=float(np.nanmean(h)) if np.isfinite(h).any() else 0.0)
                h = h + (R - radio_elipsoide(LATC))     # altura sobre el elipsoide de Cesium
                for x in xs:
                    i = (x - x_ini) * (N - 1)
                    tes = h[:, i:i + N]
                    if caja is not None and not interseca((-180 + x * d, norte - d, -180 + (x + 1) * d, norte), caja):
                        continue
                    z.writestr(f"{n}/{x}/{y}.bin", codificar(tes))
                    cuenta += 1
            total += cuenta
            print(f"nivel {n}: {cuenta} teselas", flush=True)
    meta = dict(esquema="GeographicTilingScheme, Ellipsoid.MARS, nivel 0 = 2x1, 65x65",
                formato="float32 min, float32 escala, 65x65 uint16 LE",
                rangos=[dict(niveles=[a, b], caja_geodetica=c) for a, b, c, _ in niveles],
                teselas=total,
                fuentes=["USGS Astrogeology: Mars HRSC MOLA Blended DEM Global 200m v2",
                         "USGS Astrogeology: MSL Gale DEM Mosaic 1m v3 (promediado a 5 m)"],
                notas="Alturas sobre el elipsoide de Cesium Mars; los DEM originales están referidos al areoide (aproximación visual).")
    zg.writestr("meta.json", json.dumps(meta, ensure_ascii=False))     # lo lee el visor (teselas/terreno/meta.json)
    zg.close()
    zl.close()
    json.dump(meta, open(os.path.join(salida, "terreno_marte_gale.json"), "w"), ensure_ascii=False, indent=1)
    print("listo", total, flush=True)


if __name__ == "__main__":
    main()

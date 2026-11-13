"""Verifica un terreno de data/terreno/<zona>/ contra el contrato y, opcionalmente, contra otro DEM y otra orto.

Uso:
    python herramientas/verificar_terreno.py sol5070 [--png vista.png]
        [--dem-ref otro_dem.tif] [--orto-ref otra_orto.tif]

Comprueba:
  1. Que dem_2m.bin tenga ancho x alto x 4 bytes y que, leído con la fórmula de píxel de docs/contrato.md §4,
     dé lo mismo que el promedio 2x2 de dem.tif.
  2. Que la posición actual y todas las rutas de data/rutas/ caigan dentro de la grilla (y su elevación).
  3. Con --dem-ref: diferencia de elevación en la zona que se superpone (misma proyección).
  4. Con --orto-ref: correlación entre orto.jpg y la orto de referencia en la superposición (alineación).
  5. Con --png: guarda una vista (relieve sombreado | orto) con rutas para revisar a ojo.
"""
import argparse
import glob
import json
import math
import os

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from PIL import Image, ImageDraw

R = 3396190.0
COLORES = {"vehiculo": (40, 110, 255), "astronauta": (255, 140, 0)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("zona")
    ap.add_argument("--png")
    ap.add_argument("--dem-ref")
    ap.add_argument("--orto-ref")
    a = ap.parse_args()

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    d = os.path.join(raiz, "data", "terreno", a.zona)
    m = json.load(open(os.path.join(d, "meta.json"), encoding="utf-8"))
    W, H, cs, gpm = m["ancho"], m["alto"], m["tam_celda_m"], m["grados_por_m"]
    ok = True

    # 1. bin vs tif
    bin_ = np.fromfile(os.path.join(d, "dem_2m.bin"), dtype="<f4")
    assert bin_.size == W * H, f"dem_2m.bin tiene {bin_.size} valores, se esperaban {W * H}"
    z2 = bin_.reshape(H, W)
    with rasterio.open(os.path.join(d, "dem.tif")) as s:
        z1 = s.read(1)
        x0, y0 = s.transform.c, s.transform.f
        crs = s.crs
    ref2 = z1.reshape(H, 2, W, 2).mean(axis=(1, 3))
    dif = np.abs(ref2 - z2).max()
    print(f"[1] bin vs tif: diferencia máxima {dif:.4f} m", "OK" if dif < 0.01 else "FALLA")
    ok &= dif < 0.01
    lat_n, lon_o = math.degrees(y0 / R), math.degrees(x0 / R)
    print(f"    esquina meta ({m['lat_norte']}, {m['lon_oeste']}) vs tif ({lat_n:.8f}, {lon_o:.8f})")
    ok &= abs(lat_n - m["lat_norte"]) < 1e-7 and abs(lon_o - m["lon_oeste"]) < 1e-7

    def pix(lon, lat):  # fórmula del contrato §4
        return (lon - m["lon_oeste"]) / (gpm * cs), (m["lat_norte"] - lat) / (gpm * cs)

    def elev(lon, lat):
        x, y = pix(lon, lat)
        i, j = int(y), int(x)
        return float(z2[i, j]) if 0 <= i < H and 0 <= j < W else None

    # 2. rutas y posición
    capas = sorted(glob.glob(os.path.join(raiz, "data", "rutas", "*.geojson")))
    capas.append(os.path.join(raiz, "data", "curiosity", "posicion_sol5070.geojson"))
    trazos = []
    for f in capas:
        g = json.load(open(f, encoding="utf-8"))
        fuera = 0
        for ft in g["features"]:
            geo = ft["geometry"]
            pts = [geo["coordinates"]] if geo["type"] == "Point" else geo["coordinates"]
            fuera += sum(elev(*p[:2]) is None for p in pts)
            p = ft["properties"]
            if geo["type"] == "Point":
                e = elev(*pts[0][:2])
                print(f"    {os.path.basename(f)} · {p.get('ruta', '')} {p.get('parada', '')} "
                      f"{p.get('nombre', p.get('sol', ''))}: elevación {e:.1f} m" if e is not None else "    fuera")
            else:
                trazos.append((p.get("ruta"), pts))
        print(f"[2] {os.path.basename(f)}: {fuera} puntos fuera de la grilla", "OK" if fuera == 0 else "FALLA")
        ok &= fuera == 0

    # 3. DEM de referencia
    if a.dem_ref:
        with rasterio.open(a.dem_ref) as r:
            b = r.bounds
            l, rr = max(b.left, x0), min(b.right, x0 + z1.shape[1])
            t, bo = min(b.top, y0), max(b.bottom, y0 - z1.shape[0])
            if l < rr and bo < t:
                wr = from_bounds(l, bo, rr, t, r.transform).round_offsets().round_lengths()
                zr = r.read(1, window=wr).astype(np.float64)
                c0, f0 = round(l - x0), round(y0 - t)
                zm = z1[f0:f0 + zr.shape[0], c0:c0 + zr.shape[1]].astype(np.float64)
                v = (zr != r.nodata) & (zm != -9999)
                dd = zm[v] - zr[v]
                print(f"[3] DEM de referencia: {v.sum()} celdas superpuestas ({zr.shape[1]} x {zr.shape[0]} m); "
                      f"diferencia mediana {np.median(dd):.3f} m, máx. absoluta {np.abs(dd).max():.3f} m")
            else:
                print("[3] el DEM de referencia no se superpone")

    # 4. orto de referencia
    orto = np.asarray(Image.open(os.path.join(d, "orto.jpg")).convert("L"), dtype=np.float64)
    if a.orto_ref:
        res = m["orto_res_m"]
        with rasterio.open(a.orto_ref) as r:
            b = r.bounds
            l, rr = max(b.left, x0), min(b.right, x0 + z1.shape[1])
            t, bo = min(b.top, y0), max(b.bottom, y0 - z1.shape[0])
            c0, f0 = round((l - x0) / res), round((y0 - t) / res)
            n_c, n_f = round((rr - l) / res), round((t - bo) / res)
            ro = r.read(window=from_bounds(l, bo, rr, t, r.transform), out_shape=(r.count, n_f, n_c),
                        resampling=Resampling.average).astype(np.float64).mean(axis=0)
            mo = orto[f0:f0 + n_f, c0:c0 + n_c]
            best = None
            for dy in range(-4, 5):  # buscar el corrimiento que mejor alinea (en píxeles de la orto)
                for dx in range(-4, 5):
                    A = mo[4 + dy:n_f - 4 + dy, 4 + dx:n_c - 4 + dx]
                    B = ro[4:n_f - 4, 4:n_c - 4]
                    c = np.corrcoef(A.ravel(), B.ravel())[0, 1]
                    if best is None or c > best[0]:
                        best = (c, dx, dy)
            print(f"[4] orto vs referencia: superposición {n_c} x {n_f} px; mejor correlación {best[0]:.3f} "
                  f"con corrimiento ({best[1]}, {best[2]}) px de {res} m",
                  "OK" if abs(best[1]) <= 1 and abs(best[2]) <= 1 else "REVISAR")

    # 5. vista
    if a.png:
        gy, gx = np.gradient(z2.astype(np.float64), cs)
        pend = np.degrees(np.arctan(np.hypot(gx, gy)))
        print(f"    pendiente (grilla 2 m): mediana {np.median(pend):.1f}°, p95 {np.percentile(pend, 95):.1f}°, "
              f"máx. {pend.max():.1f}°")
        az, alt = math.radians(315), math.radians(35)
        asp = np.arctan2(-gx, gy)
        sl = np.arctan(np.hypot(gx, gy))
        hs = np.clip((math.sin(alt) * np.cos(sl) + math.cos(alt) * np.sin(sl) * np.cos(az - asp)) * 255, 0, 255)
        k = orto.shape[1] / W  # px de orto por celda
        izq = Image.fromarray(hs.astype(np.uint8)).resize(orto.shape[::-1]).convert("RGB")
        der = Image.fromarray(orto.astype(np.uint8)).convert("RGB")
        lienzo = Image.new("RGB", (izq.width * 2 + 20, izq.height), "white")
        lienzo.paste(izq, (0, 0))
        lienzo.paste(der, (izq.width + 20, 0))
        dr = ImageDraw.Draw(lienzo)
        for off in (0, izq.width + 20):
            for ruta, pts in trazos:
                xy = [(off + pix(*p[:2])[0] * k, pix(*p[:2])[1] * k) for p in pts]
                dr.line(xy, fill=COLORES.get(ruta, (255, 0, 0)), width=6)
            pos = json.load(open(capas[-1], encoding="utf-8"))["features"][0]["geometry"]["coordinates"]
            x, y = pix(*pos)
            dr.ellipse((off + x * k - 14, y * k - 14, off + x * k + 14, y * k + 14), outline=(255, 0, 0), width=5)
        lienzo.save(a.png)
        print(f"[5] vista guardada en {a.png}")

    print("RESULTADO:", "OK" if ok else "HAY FALLAS")


if __name__ == "__main__":
    main()

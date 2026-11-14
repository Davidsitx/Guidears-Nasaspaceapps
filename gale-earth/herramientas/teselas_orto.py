"""Teselas de imagen (WebP gris con transparencia) del ortofoto MSL de Gale (USGS) a 1 m, leído del .ovr
que acompaña al mosaico de 25 cm (su primera imagen es la versión a 1 m, sin georreferencia propia:
se usa la del mosaico principal ×4). Mismo esquema que HiRISE/CTX.
Antes: teselas del mosaico HiRISE color de 25 cm de Gale,
en el mismo esquema que el mosaico CTX global de NASA/Esri: geográfico planetocéntrico,
nivel 0 = 2×1 teselas de 512 px. Se empaquetan en .zip (sin comprimir) que lee servir.py.

Uso: python3 teselas_hirise.py HIRISE_COG.tif SALIDA_DIR [nivel_min] [nivel_max]
"""
import io, os, sys, json, math, zipfile
from concurrent.futures import ProcessPoolExecutor
import numpy as np
import rasterio
from affine import Affine
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from PIL import Image

R = 3396190.0
M_POR_GRADO = R * math.pi / 180
TAM = 512
LIMITE_ZIP = 380e6


TR = Affine(1.0, 0, 8126248.0, 0, -1.0, -241164.0)   # 1 m, esquina del mosaico 25 cm


def caja_grados(src):
    b = rasterio.transform.array_bounds(src.height, src.width, TR)
    b = type("B", (), dict(left=b[0], bottom=b[1], right=b[2], top=b[3]))
    return b.left / M_POR_GRADO, b.bottom / M_POR_GRADO, b.right / M_POR_GRADO, b.top / M_POR_GRADO


def teselas_de_nivel(caja, n):
    d = 180.0 / 2 ** n
    x0, x1 = int((caja[0] + 180) // d), int((caja[2] + 180) // d)
    y0, y1 = int((90 - caja[3]) // d), int((90 - caja[1]) // d)
    return [(n, x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]


def hacer(args):
    ruta, lote = args
    res = []
    with rasterio.open(ruta) as src:
        for n, x, y in lote:
            d = 180.0 / 2 ** n
            lon_o, lat_n = -180 + x * d, 90 - y * d
            # Ventana recortada al mosaico (sin "boundless", que no usa las overviews y es lentísimo)
            w = from_bounds(lon_o * M_POR_GRADO, (lat_n - d) * M_POR_GRADO, (lon_o + d) * M_POR_GRADO, lat_n * M_POR_GRADO, TR)
            c0, f0 = w.col_off, w.row_off
            c1, f1 = c0 + w.width, f0 + w.height
            cc0, ff0, cc1, ff1 = max(c0, 0), max(f0, 0), min(c1, src.width), min(f1, src.height)
            if cc1 <= cc0 or ff1 <= ff0:
                continue
            px = TAM / w.width
            X0, Y0 = int(round((cc0 - c0) * px)), int(round((ff0 - f0) * px))
            X1, Y1 = int(round((cc1 - c0) * px)), int(round((ff1 - f0) * px))
            if X1 <= X0 or Y1 <= Y0:
                continue
            from rasterio.windows import Window
            parte = src.read(1, window=Window(cc0, ff0, cc1 - cc0, ff1 - ff0), out_shape=(Y1 - Y0, X1 - X0), resampling=Resampling.bilinear)
            a = np.zeros((TAM, TAM), "u1")
            a[Y0:Y1, X0:X1] = parte
            alfa = (a > 0).astype("u1") * 255
            if not alfa.any():
                continue
            im = Image.fromarray(np.dstack([a, a, a, alfa]), "RGBA")
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=82, method=4)
            res.append((f"{n}/{y}/{x}.webp", buf.getvalue()))
    return res


def main():
    ruta, salida = sys.argv[1], sys.argv[2]
    nmin = int(sys.argv[3]) if len(sys.argv) > 3 else 9
    nmax = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    os.makedirs(salida, exist_ok=True)
    with rasterio.open(ruta) as src:
        caja = caja_grados(src)
    todas = [t for n in range(nmin, nmax + 1) for t in teselas_de_nivel(caja, n)]
    print(f"{len(todas)} teselas candidatas, niveles {nmin}-{nmax}", flush=True)
    lotes = [(ruta, todas[i:i + 64]) for i in range(0, len(todas), 64)]
    parte, z, peso, total, indice = 0, None, 0, 0, []

    def nuevo_zip():
        nonlocal parte, z, peso
        if z:
            z.close()
        parte += 1
        nombre = f"orto1m_teselas_{parte:02d}.zip"
        indice.append(nombre)
        z, peso = zipfile.ZipFile(os.path.join(salida, nombre), "w", zipfile.ZIP_STORED), 0

    nuevo_zip()
    with ProcessPoolExecutor(2) as ex:
        for i, res in enumerate(ex.map(hacer, lotes)):
            for nombre, datos in res:
                if peso + len(datos) > LIMITE_ZIP:
                    nuevo_zip()
                z.writestr(nombre, datos)
                peso += len(datos)
                total += 1
            if i % 20 == 0:
                print(f"  lote {i + 1}/{len(lotes)} · {total} teselas", flush=True)
    z.close()
    meta = dict(fuente=os.path.basename(ruta), esquema="geografico planetocentrico, nivel 0 = 2x1, 512 px (igual que OnMars/CTX)",
                caja_grados=caja, niveles=[nmin, nmax], teselas=total, zips=indice,
                credito="Ortofoto MSL Gale v3 (HiRISE, NASA/JPL/University of Arizona; mosaico USGS Astrogeology), versión a 1 m")
    json.dump(meta, open(os.path.join(salida, "orto1m_teselas.json"), "w"), indent=1)
    print("listo", meta, flush=True)


if __name__ == "__main__":
    main()

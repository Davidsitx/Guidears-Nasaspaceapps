"""Indicio de material suelto (arena, polvo) en la zona de expedición: THEMIS infrarrojo de noche (Mars Odyssey).

Fuente: USGS Astrogeology, THEMIS Night IR Controlled Mosaic Aeolis 30S135E 100 m/px (v2, 31/1/2014), banda 9 (12,57 µm):
https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/Aeolis_NightIR_31Jan2014/
Es un producto CUALITATIVO (8 bits, estirado y con filtro pasa-altos, Edwards et al. 2011): no da temperatura ni
inercia térmica en unidades. USGS: lo que se ve más frío de noche suele ser material fino y suelto (polvo, limo,
arena fina); lo más tibio, roca, costras o arena gruesa. La altura y la orientación también influyen, por eso aquí se
usa solo como indicio relativo dentro del círculo, sin umbral.

Lee por rangos HTTP solo la ventana de la zona (no baja los 474 MB) y escribe en capas/expedicion/:
  themis_noche.png      la ventana a 100 m (gris, 0 = sin dato) para mostrar como capa
  noche_pct_u8.bin.gz   para cada celda de 20 m: percentil de "frío de noche" dentro del círculo (0 = la más tibia,
                        100 = la más fría; 255 = sin dato). Cálculo propio.
Uso: python themis_noche.py
"""
import os, sys, io, ssl, gzip, json, math, urllib.request
import numpy as np, tifffile
from PIL import Image

URL = ('https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/'
       'Aeolis_NightIR_31Jan2014/THEMIS_NightIR_ControlledMosaic_Aeolis_30S135E_100mpp.tif')
R = 3396190.0
UL_X, PIX = -2667400.0, 100.0          # del .lbl: SimpleCylindrical, CenterLongitude 180, UpperLeftCornerY 0
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'capas', 'expedicion')


class HTTPRango(io.RawIOBase):
    def __init__(s, url):
        cafile = os.environ.get('SSL_CERT_FILE') or (os.path.expanduser('~/.ccr/ca-bundle.crt') if os.path.exists(os.path.expanduser('~/.ccr/ca-bundle.crt')) else None)
        s.url, s.pos, s.ctx = url, 0, ssl.create_default_context(cafile=cafile)
        s.size = int(urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), context=s.ctx).headers['Content-Length'])
    def readable(s): return True
    def seekable(s): return True
    def seek(s, off, wh=0): s.pos = off if wh == 0 else s.pos + off if wh == 1 else s.size + off; return s.pos
    def tell(s): return s.pos
    def read(s, n=-1):
        n = s.size - s.pos if n < 0 else n
        if n == 0: return b''
        a, b = s.pos, min(s.size, s.pos + n) - 1
        d = urllib.request.urlopen(urllib.request.Request(s.url, headers={'Range': f'bytes={a}-{b}'}), context=s.ctx).read()
        s.pos += len(d); return d
    def readinto(s, buf): d = s.read(len(buf)); buf[:len(d)] = d; return len(d)


def main():
    meta = json.load(open(os.path.join(SALIDA, 'meta.json'), encoding='utf-8'))
    k = math.pi / 180 * R
    # ventana de la imagen que cubre la grilla de la zona
    lon0, lon1 = meta['lon_oeste'], meta['lon_oeste'] + meta['ancho'] * meta['grados_lon']
    lat0, lat1 = meta['lat_norte'], meta['lat_norte'] - meta['alto'] * meta['grados_lat']
    c0 = int(math.floor(((lon0 - 180) * k - UL_X) / PIX)) - 1; c1 = int(math.ceil(((lon1 - 180) * k - UL_X) / PIX)) + 1
    r0 = int(math.floor(-lat0 * k / PIX)) - 1; r1 = int(math.ceil(-lat1 * k / PIX)) + 1
    f = HTTPRango(URL)
    with tifffile.TiffFile(f) as tf:
        pg = tf.pages[0]
        assert not pg.is_tiled and pg.compression == 1 and (pg.rowsperstrip or 1) == 1
        ventana = np.zeros((r1 - r0, c1 - c0), np.uint8)
        for r in range(r0, r1):
            f.seek(pg.dataoffsets[r] + c0); ventana[r - r0] = np.frombuffer(f.read(c1 - c0), np.uint8)
    Image.fromarray(ventana).save(os.path.join(SALIDA, 'themis_noche.png'), optimize=True)
    # a la grilla de 20 m (vecino más cercano)
    W, H = meta['ancho'], meta['alto']
    lons = lon0 + (np.arange(W) + .5) * meta['grados_lon']; lats = lat0 - (np.arange(H) + .5) * meta['grados_lat']
    cc = np.clip(((((lons - 180) * k - UL_X) / PIX) - c0).astype(int), 0, ventana.shape[1] - 1)
    rr = np.clip(((-lats * k / PIX) - r0).astype(int), 0, ventana.shape[0] - 1)
    v = ventana[rr[:, None], cc[None, :]].astype(np.float32)
    pend = np.frombuffer(gzip.open(os.path.join(SALIDA, 'pend_u8.bin.gz')).read(), 'u1').reshape(H, W)
    ok = (v > 0) & (pend != 255)
    orden = np.argsort(np.argsort(-v[ok]))            # más oscuro (más frío) = percentil más alto
    pct = np.full((H, W), 255, np.uint8); pct[ok] = np.round(orden / max(ok.sum() - 1, 1) * 100).astype(np.uint8)
    with gzip.open(os.path.join(SALIDA, 'noche_pct_u8.bin.gz'), 'wb', compresslevel=9) as g: g.write(pct.tobytes())
    meta['themis_noche'] = dict(
        archivo='themis_noche.png', ancho=int(ventana.shape[1]), alto=int(ventana.shape[0]),
        lon_oeste=180 + (UL_X + c0 * PIX) / k, lon_este=180 + (UL_X + c1 * PIX) / k, lat_norte=-r0 * PIX / k, lat_sur=-r1 * PIX / k,
        fuente='USGS Astrogeology, THEMIS Night IR Controlled Mosaic Aeolis 30S135E 100 m/px v2 (2014), Mars Odyssey. Producto cualitativo de 8 bits.',
        uso='Indicio relativo de material suelto (más frío de noche). No es inercia térmica en unidades; no se usa como regla de ruteo.')
    meta['archivos']['noche_pct_u8'] = 'percentil de frío nocturno THEMIS dentro de la zona (100 = lo más frío); 255 = sin dato'
    json.dump(meta, open(os.path.join(SALIDA, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ventana', ventana.shape, 'celdas con dato', int(ok.sum()))


if __name__ == '__main__':
    main()

"""Capas de todo Marte para Gale Earth (capas/global/).

1) Infrarrojo nocturno (THEMIS, Mars Odyssey): USGS Astrogeology, THEMIS Night IR Controlled Mosaics 100 m v2 (oct. 2018),
   versión de vista previa a 2 km/píxel (browse_THEMIS_NightIR_ControlledMosaics_2km.jpg), de 65°S a 65°N.
   Se corta en 4 franjas de 90° de longitud (themis_noche_0..3.jpg) para que entren como textura en cualquier placa.
   Es una imagen cualitativa: más claro = más tibio de noche (roca, costras); más oscuro = más frío (polvo, arena fina).
2) Topónimos: nomenclatura oficial de la IAU, Gazetteer of Planetary Nomenclature (USGS/IAU),
   https://planetarynames.wr.usgs.gov/ . Se usa la exportación MARS_nomenclature.csv (nombre, diámetro, centro)
   publicada en planetserver/ps2-www-client (Jacobs University). Se descartan los nombres con caracteres dañados que
   no se pueden recuperar con seguridad.
Uso: python capas_globales.py
"""
import os, io, sys, json, ssl, urllib.request
from PIL import Image

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(AQUI, 'capas', 'global')
THEMIS = ('https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/AA_mosaics/'
          'browse_THEMIS_NightIR_ControlledMosaics_2km.jpg')
NOMBRES = 'https://raw.githubusercontent.com/planetserver/ps2-www-client/master/html/data/shapefiles/mars/MARS_nomenclature.csv'
ARREGLOS = {'Rup?s': 'Rupēs', 'Fluct?s': 'Fluctūs', 'Milankovi?': 'Milankovič'}


def bajar(url):
    caf = os.path.expanduser('~/.ccr/ca-bundle.crt')
    ctx = ssl.create_default_context(cafile=caf if os.path.exists(caf) else None)
    return urllib.request.urlopen(url, context=ctx, timeout=300).read()


def main():
    os.makedirs(SAL, exist_ok=True)
    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(io.BytesIO(bajar(THEMIS))).convert('L')
    W, H = im.size                                   # 10669 × 3853 a 2 km: de -180° a 180°, de 65°N a 65°S (del .aux.xml)
    franjas = []
    for k in range(4):
        x0, x1 = round(W * k / 4), round(W * (k + 1) / 4)
        im.crop((x0, 0, x1, H)).save(os.path.join(SAL, f'themis_noche_{k}.jpg'), quality=82, optimize=True)
        franjas.append(dict(archivo=f'themis_noche_{k}.jpg', lon_oeste=-180 + 90 * k, lon_este=-90 + 90 * k))
    filas = bajar(NOMBRES).decode('utf-8').splitlines()[1:]
    nombres, descartados = [], 0
    for f in filas:
        p = f.split(',')
        if len(p) < 4 or not p[2] or not p[3]: continue
        n = p[0]
        for a, b in ARREGLOS.items(): n = n.replace(a, b)
        if '?' in n: descartados += 1; continue
        lon = float(p[2]); lon = lon - 360 if lon > 180 else lon
        nombres.append([n, round(lon, 3), round(float(p[3]), 3), round(float(p[1] or 0), 1)])
    nombres.sort(key=lambda x: -x[3])
    meta = dict(
        themis=dict(franjas=franjas, lat_norte=65.0, lat_sur=-65.0,
                    fuente='THEMIS (Mars Odyssey, NASA/ASU): USGS Astrogeology, THEMIS Night IR Controlled Mosaics 100 m v2 (2018), vista previa a 2 km/píxel.',
                    enlace='https://astrogeology.usgs.gov/search/map/themis_night_ir_controlled_mosaics_100m_v2',
                    como='Imagen cualitativa: claro = más tibio de noche (roca, costras), oscuro = más frío (polvo, arena fina).'),
        nombres=dict(archivo='toponimos.json', n=len(nombres), descartados=descartados,
                     fuente='IAU / USGS, Gazetteer of Planetary Nomenclature (nombres aprobados por la IAU).', enlace='https://planetarynames.wr.usgs.gov/'))
    json.dump(nombres, open(os.path.join(SAL, 'toponimos.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(meta, open(os.path.join(SAL, 'global.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('THEMIS', W, H, '· nombres', len(nombres), 'descartados', descartados)


if __name__ == '__main__' and '--altitud' not in sys.argv:
    main()


# ---------------------------------------------------------------------------------------------------------------
# 3) Colores de altitud de todo Marte (capas/global/altitud_{oeste,este}.png), a partir de NUESTRAS teselas de relieve
#    (HRSC-MOLA Blended DEM 200 m, USGS, nivel 5 ≈ 5 km/píxel). Las teselas guardan la altura sobre el elipsoide de
#    Cesium; acá se vuelve a la altura sobre la esfera de 3396,19 km (≈ datum MOLA), igual que en la leyenda.
#    Uso: python capas_globales.py --altitud RUTA/terreno_marte_global_n0-7.zip
import struct, zipfile
import numpy as np

A_, B_, R_ = 3396190.0, 3376200.0, 3396190.0
RAMPA = [(-8200, (43, 15, 84)), (-4400, (59, 76, 192)), (-2400, (47, 166, 214)), (0, (70, 192, 138)), (3400, (207, 224, 90)),
         (6500, (242, 162, 60)), (9400, (217, 87, 59)), (13800, (200, 100, 154)), (18200, (242, 228, 240)), (21200, (255, 255, 255))]


def altitud(zip_global, nivel=5):
    z = zipfile.ZipFile(zip_global); nx, ny = 2 ** (nivel + 1), 2 ** nivel
    H = np.zeros((ny * 64, nx * 64), np.float32)
    for x in range(nx):
        for y in range(ny):
            b = z.read(f'{nivel}/{x}/{y}.bin'); mn, esc = struct.unpack('<ff', b[:8])
            t = np.frombuffer(b[8:], '<u2').reshape(65, 65).astype(np.float32) * esc + mn
            H[y * 64:(y + 1) * 64, x * 64:(x + 1) * 64] = t[:64, :64]
    latg = 90 - (np.arange(ny * 64) + .5) * 180 / (ny * 64)           # filas en latitud geodética (esquema de Cesium)
    latc = np.radians(np.degrees(np.arctan(np.tan(np.radians(latg)) * (B_ * B_) / (A_ * A_))))
    r_ell = A_ * B_ / np.sqrt((B_ * np.cos(latc)) ** 2 + (A_ * np.sin(latc)) ** 2)
    H = H - (R_ - r_ell)[:, None]                                      # altura sobre la esfera (≈ datum MOLA)
    xs = [p[0] for p in RAMPA]; cols = np.array([p[1] for p in RAMPA], np.float32)
    rgb = np.stack([np.interp(H, xs, cols[:, k]) for k in range(3)], -1)
    # sombreado suave para que se lea el relieve
    gy, gx = np.gradient(H, 5000.0)
    luz = np.clip(0.75 + 0.25 * (-gx * 0.7 + gy * 0.7) / np.sqrt(1 + gx ** 2 + gy ** 2) * 6, 0.45, 1.15)
    rgb = np.clip(rgb * luz[..., None], 0, 255).astype(np.uint8)
    W = rgb.shape[1]
    Image.fromarray(rgb[:, :W // 2]).save(os.path.join(SAL, 'altitud_oeste.jpg'), quality=85, optimize=True)
    Image.fromarray(rgb[:, W // 2:]).save(os.path.join(SAL, 'altitud_este.jpg'), quality=85, optimize=True)
    meta = json.load(open(os.path.join(SAL, 'global.json'), encoding='utf-8'))
    meta['altitud'] = dict(oeste='altitud_oeste.jpg', este='altitud_este.jpg', esquema='geodetica',
                           rampa=[[a, '#%02x%02x%02x' % c] for a, c in RAMPA],
                           fuente='Relieve HRSC-MOLA Blended DEM 200 m (USGS Astrogeology), desde las teselas del globo (nivel 5, ~5 km/píxel), altura sobre la esfera de 3396,19 km (≈ datum MOLA).',
                           comprobacion={k: round(float(v)) for k, v in dict(
                               olympus=H[int((90 - 18.65) / 180 * H.shape[0]), int((180 - 133.81) / 360 * W)],
                               hellas=H[int((90 + 45) / 180 * H.shape[0]), int((180 + 67) / 360 * W)]).items()})
    json.dump(meta, open(os.path.join(SAL, 'global.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('altitud', rgb.shape, meta['altitud']['comprobacion'], 'min/max', round(float(H.min())), round(float(H.max())))


if __name__ == '__main__' and '--altitud' in sys.argv:
    altitud(sys.argv[sys.argv.index('--altitud') + 1])

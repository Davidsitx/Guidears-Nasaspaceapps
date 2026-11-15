"""Capas de todo Marte para Gale Earth (capas/global/).

1) Infrarrojo nocturno (THEMIS, Mars Odyssey): USGS Astrogeology, THEMIS Night IR Controlled Mosaics 100 m v2 (oct. 2018),
   versión de vista previa a 2 km/píxel (browse_THEMIS_NightIR_ControlledMosaics_2km.jpg), de 65°S a 65°N.
   Se corta en 4 franjas de 90° de longitud (themis_noche_0..3.webp, con transparencia: las franjas sin datos y el
   borde de ±65° no tapan el mapa) para que entren como textura en cualquier placa.
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
    import numpy as np
    g = np.array(im)
    # Las franjas sin datos del mosaico vienen en negro (sobre todo cerca de ±65°): se vuelven transparentes,
    # con 1 píxel de margen para borrar el halo de la compresión JPG. El borde de ±65° se esfuma en los últimos 3°.
    vacio = g < 10
    vacio = vacio | np.roll(vacio, 1, 0) | np.roll(vacio, -1, 0) | np.roll(vacio, 1, 1) | np.roll(vacio, -1, 1)
    alfa = np.where(vacio, 0, 255).astype(np.float32)
    borde = int(round(3 / 130 * H)); rampa = np.ones(H, np.float32); rampa[:borde] = np.linspace(0, 1, borde); rampa[-borde:] = np.linspace(1, 0, borde)
    alfa = (alfa * rampa[:, None]).astype(np.uint8)
    rgba = np.dstack([g, g, g, alfa])
    franjas = []
    for k in range(4):
        x0, x1 = round(W * k / 4), round(W * (k + 1) / 4)
        Image.fromarray(rgba[:, x0:x1], 'RGBA').save(os.path.join(SAL, f'themis_noche_{k}.webp'), quality=78, method=6)
        franjas.append(dict(archivo=f'themis_noche_{k}.webp', lon_oeste=-180 + 90 * k, lon_este=-90 + 90 * k))
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


if __name__ == '__main__' and not {'--altitud', '--local', '--pendiente', '--agua'} & set(sys.argv):
    main()


# ---------------------------------------------------------------------------------------------------------------
# 3) Colores de altitud de todo Marte (capas/global/altitud_{oeste,este}.png), a partir de NUESTRAS teselas de relieve
#    (HRSC-MOLA Blended DEM 200 m, USGS, nivel 5 ≈ 5 km/píxel). Las teselas guardan la altura sobre el elipsoide de
#    Cesium; acá se vuelve a la altura sobre la esfera de 3396,19 km (≈ datum MOLA), igual que en la leyenda.
#    Uso: python capas_globales.py --altitud RUTA/terreno_marte_global_n0-7.zip
import struct, zipfile, math
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
    rgb = colorear(H, 5000.0 / 4)   # sombreado exagerado ×4 para que se lea el relieve a escala de planeta
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




# ---------------------------------------------------------------------------------------------------------------
# 4) La misma escala de colores en el área de Curiosity, con el DEM fino del USGS (MSL Gale DEM Mosaic 1 m, llevado a
#    5 m y resumido a 15 m): capas/gale_5m/relieve_mola.webp. Así "Colores de altitud" es una sola capa con los mismos
#    colores adentro y afuera; adentro solo se ve más detalle.
#    Uso: python capas_globales.py --local RUTA/msl_5m
def sombreado(H, paso):
    gy, gx = np.gradient(H, paso)
    az, al = np.radians(315), np.radians(40)                     # luz desde el noroeste, 40° de altura
    pend = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
    s = np.sin(al) * np.cos(pend) + np.cos(al) * np.sin(pend) * np.cos(az - asp)
    return np.clip(0.55 + 0.6 * s, 0.55, 1.18)


def colorear(H, paso):
    xs = [p[0] for p in RAMPA]; cols = np.array([p[1] for p in RAMPA], np.float32)
    rgb = np.stack([np.interp(H, xs, cols[:, k]) for k in range(3)], -1)
    return np.clip(rgb * sombreado(H, paso)[..., None], 0, 255).astype(np.uint8)


def relieve_local(base5m, K=3):
    m5 = json.load(open(os.path.join(AQUI, 'capas', 'gale_5m', 'capas.json'), encoding='utf-8')); cp = m5['caja_planetocentrica']
    z5 = np.load(base5m + '.npy', mmap_mode='r'); x0, y0, dx, dy = map(float, open(base5m + '.txt').read().split())
    c0 = int(round((cp['lon_oeste'] - x0) / dx)); f0 = int(round((cp['lat_norte'] - y0) / dy))
    H, W = cp['alto'] // K, cp['ancho'] // K
    z = np.nanmean(np.asarray(z5[f0:f0 + H * K, c0:c0 + W * K], np.float32).reshape(H, K, W, K), axis=(1, 3))
    val = np.isfinite(z); rgb = colorear(np.where(val, z, np.nanmean(z)), 5.0 * K)
    Image.fromarray(np.dstack([rgb, np.where(val, 255, 0).astype(np.uint8)]), 'RGBA').save(os.path.join(AQUI, 'capas', 'gale_5m', 'relieve_mola.webp'), quality=85, method=6)
    print('relieve local', rgb.shape, 'alturas', round(float(np.nanmin(z))), round(float(np.nanmax(z))))


if __name__ == '__main__' and '--local' in sys.argv:
    relieve_local(sys.argv[sys.argv.index('--local') + 1])


if __name__ == '__main__' and '--altitud' in sys.argv:
    altitud(sys.argv[sys.argv.index('--altitud') + 1])


# ---------------------------------------------------------------------------------------------------------------
# 5) Zonas prohibidas por pendiente en TODO Marte (capas/global/pendiente_{oeste,este}.png), con los mismos colores y
#    límites que la capa fina de Gale (capas/gale_5m/capas.json → parametros). Sale de nuestras teselas HRSC-MOLA,
#    nivel 7 (≈ 1,3 km por píxel). Ojo: a esa escala la pendiente se SUBESTIMA (una ladera de 30° de 200 m queda
#    promediada con el llano), así que solo marca las laderas grandes: paredes de cráteres, Valles Marineris, escarpes.
#    Para no perder las laderas finas se reduce a la mitad tomando la clase más restrictiva de cada bloque de 2×2.
#    Uso: python capas_globales.py --pendiente RUTA/terreno_marte_global_n0-7.zip
def pendiente_global(zip_global, nivel=7):
    par = json.load(open(os.path.join(AQUI, 'capas', 'gale_5m', 'capas.json'), encoding='utf-8'))['parametros']
    la, lr = par['pendiente_astronauta'], par['pendiente_rover']
    z = zipfile.ZipFile(zip_global); nx, ny = 2 ** (nivel + 1), 2 ** nivel
    H = np.zeros((ny * 64, nx * 64), np.float32)
    for x in range(nx):
        for y in range(ny):
            b = z.read(f'{nivel}/{x}/{y}.bin'); mn, esc = struct.unpack('<ff', b[:8])
            H[y * 64:(y + 1) * 64, x * 64:(x + 1) * 64] = (np.frombuffer(b[8:], '<u2').reshape(65, 65).astype(np.float32) * esc + mn)[:64, :64]
    filas, cols = H.shape
    lat = np.radians(90 - (np.arange(filas) + .5) * 180 / filas)
    dy = np.pi * R_ / filas; dx = np.maximum(2 * np.pi * R_ / cols * np.cos(lat), 50.0)
    P = np.degrees(np.arctan(np.hypot(np.gradient(H, axis=1) / dx[:, None], np.gradient(H, axis=0) / dy)))
    del H
    # clase: 0 nada, 1 precaución, 2 solo rover, 3 solo astronauta, 4 los dos (mismo orden de gravedad que gale_datos.py)
    k = np.zeros(P.shape, np.uint8); m = min(la, lr)
    k[(P >= m - 5) & (P < m)] = 1; k[(P >= lr) & (P < la)] = 2; k[(P >= la) & (P < lr)] = 3; k[(P >= la) & (P >= lr)] = 4
    k = k.reshape(filas // 2, 2, cols // 2, 2).max(axis=(1, 3))
    pal = np.array([[0, 0, 0, 0], [240, 200, 60, 110], [229, 83, 75, 150], [242, 140, 56, 150], [142, 68, 173, 170]], np.uint8)
    rgba = pal[k]; W = rgba.shape[1]
    for nom, parte in (('oeste', rgba[:, :W // 2]), ('este', rgba[:, W // 2:])):
        Image.fromarray(parte, 'RGBA').save(os.path.join(SAL, f'pendiente_{nom}.png'), optimize=True)
    meta = json.load(open(os.path.join(SAL, 'global.json'), encoding='utf-8'))
    meta['pendiente'] = dict(oeste='pendiente_oeste.png', este='pendiente_este.png', esquema='geodetica', metros_por_pixel=round(2 * dy),
                             limites=dict(astronauta=la, rover=lr),
                             fuente='Pendiente calculada (cálculo propio) del relieve HRSC-MOLA Blended DEM 200 m (USGS Astrogeology), teselas del globo nivel 7 (~1,3 km/píxel).',
                             porcentaje={c: round(float((k == i).mean() * 100), 3) for i, c in enumerate(['nada', 'precaucion', 'solo_rover', 'solo_astronauta', 'ambos'])})
    json.dump(meta, open(os.path.join(SAL, 'global.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('pendiente', rgba.shape, meta['pendiente']['porcentaje'])


if __name__ == '__main__' and '--pendiente' in sys.argv:
    pendiente_global(sys.argv[sys.argv.index('--pendiente') + 1])


# ---------------------------------------------------------------------------------------------------------------
# 6) Agua en el primer metro del suelo en todo Marte (capas/global/agua_grs.png): MEDIDA desde órbita por el
#    espectrómetro de rayos gamma (GRS) de Mars Odyssey, NASA, 2002-2005. Producto oficial del PDS:
#    ODY-M-GRS-5-ELEMENTS-V1.0, H2O_SR_5X5.TAB (celdas de 5°, suavizado de 10°; % en peso de H2O; 60°S a 60°N).
#    https://pds-geosciences.wustl.edu/ody/ody-m-grs-5-elements-v1/odgm_xxxx/data/smoothed/
#    Acá solo se interpola entre celdas para dibujar (la resolución real es de cientos de km).
#    Uso: python capas_globales.py --agua RUTA/h2o_sr_5x5.tab
RAMPA_AGUA = [(1.5, (196, 112, 70)), (3.0, (232, 190, 120)), (4.5, (150, 210, 225)), (6.0, (55, 135, 210)), (7.5, (25, 55, 145))]


def agua_grs(tab):
    from scipy import ndimage
    a = np.loadtxt(tab)
    G = np.full((36, 72), np.nan, np.float32); S = np.full((36, 72), np.nan, np.float32)   # filas: 87,5 → -87,5; columnas: 2,5 → 357,5 E
    for lat, lon, c, s, _ in a:
        f, k = int((87.5 - lat) / 5 + .5), int((lon - 2.5) / 5 + .5)
        if c < 9000: G[f, k] = c; S[f, k] = s
    fil = [f for f in range(36) if np.isfinite(G[f]).any()]; f0, f1 = min(fil), max(fil)       # 57,5 … -57,5
    B = G[f0:f1 + 1]; B = np.where(np.isfinite(B), B, np.nanmean(B))
    B = np.roll(B, 36, axis=1)                                                                  # columnas desde -180 E
    Z = 8                                                                                       # 8 píxeles por celda (0,625°)
    gr = np.concatenate([B[:, -1:], B, B[:, :1]], axis=1)                                       # borde envolvente en longitud
    gr = np.concatenate([gr[:1], gr, gr[-1:]], axis=0)
    U = ndimage.zoom(gr, Z, order=1)[Z // 2 + Z // 2: -(Z // 2 + Z // 2), Z: -Z]                 # interpolación lineal entre centros
    xs = [p[0] for p in RAMPA_AGUA]; cols = np.array([p[1] for p in RAMPA_AGUA], np.float32)
    rgb = np.stack([np.interp(U, xs, cols[:, k]) for k in range(3)], -1).astype(np.uint8)
    h = U.shape[0]; alfa = np.full(U.shape, 205, np.uint8)
    borde = int(h * 2.5 / 120); rampa = np.linspace(0, 1, borde)
    alfa[:borde] = (alfa[:borde] * rampa[:, None]).astype(np.uint8); alfa[-borde:] = (alfa[-borde:] * rampa[::-1, None]).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, alfa]), 'RGBA').save(os.path.join(SAL, 'agua_grs.png'), optimize=True)
    lat_n, lat_s = 87.5 - f0 * 5 + 2.5, 87.5 - f1 * 5 - 2.5
    def celda(lon, lat):
        f, k = int((87.5 - lat) / 5 + .5), int(((lon % 360) - 2.5) / 5 + .5); return round(float(G[f, k]), 1), round(float(S[f, k]), 2)
    meta = json.load(open(os.path.join(SAL, 'global.json'), encoding='utf-8'))
    meta['agua'] = dict(archivo='agua_grs.png', lat_norte=lat_n, lat_sur=lat_s, esquema='planetocentrica', unidad='% en peso de H2O',
                        rampa=[[v, '#%02x%02x%02x' % c] for v, c in RAMPA_AGUA], min=round(float(np.nanmin(G)), 1), max=round(float(np.nanmax(G)), 1),
                        ejemplos=dict(gale=celda(137.4, -5.4), jezero=celda(77.5, 18.4), olympus=celda(226.2, 18.6), hellas=celda(70, -42.4)),
                        fuente='NASA PDS, ODY-M-GRS-5-ELEMENTS-V1.0 (Mars Odyssey GRS), H2O_SR_5X5.TAB; Boynton et al. 2007, JGR 112, E12S99',
                        periodo='2002-06-04 a 2005-04-03')
    json.dump(meta, open(os.path.join(SAL, 'global.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('agua', U.shape, lat_n, lat_s, meta['agua']['min'], meta['agua']['max'], meta['agua']['ejemplos'])


if __name__ == '__main__' and '--agua' in sys.argv:
    agua_grs(sys.argv[sys.argv.index('--agua') + 1])

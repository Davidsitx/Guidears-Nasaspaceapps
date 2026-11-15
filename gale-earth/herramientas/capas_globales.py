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


if __name__ == '__main__' and not {'--altitud', '--local', '--pendiente', '--radiacion'} & set(sys.argv):
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
# 6) Radiación en superficie en TODO Marte (capas/global/radiacion_{oeste,este}.jpg). Nadie midió la dosis en todo el
#    planeta: el único detector en la superficie es RAD, en Gale. Esta capa es una ESTIMACIÓN que junta datos reales:
#      - dosis medida por RAD en Gale: 0,21 mGy/día = 0,64 mSv/día (Hassler et al. 2014, Science 343), ago 2012–jun 2013;
#      - presión media en Gale ese mismo año: 847,5 Pa (REMS, año marciano 31, datos/clima_rems.json) a -4.520 m
#        (John Klein, MOLA);
#      - la atmósfera protege: +250 Pa de presión ≈ -32,5 µGy/día (Guo et al. 2015, ApJ 810, medido por RAD en Gale);
#      - la presión en cada lugar sale de su altura (relieve HRSC-MOLA, USGS) con la altura de escala de Marte, 11,1 km
#        (NASA, Mars Fact Sheet).
#    Supuestos: la relación de Guo se midió entre ~700 y ~950 Pa; aplicarla en cumbres (~100 Pa) o en Hellas (~1.200 Pa)
#    es una extrapolación lineal; el factor de calidad (Sv/Gy) se toma igual que en Gale; no incluye tormentas solares
#    ni el ciclo solar (con el Sol tranquilo la dosis sube cerca de un 50 %, Guo et al. 2021). Mismo enfoque que los
#    mapas de NASA con MOLA (Saganti et al. 2004), pero con nuestra relación empírica en vez de un código de transporte.
#    Uso: python capas_globales.py --radiacion RUTA/terreno_marte_global_n0-7.zip
D_GY, D_SV, P_REF, H_REF, K_PA, H_ESC = 210.0, 0.64, 847.5, -4520.0, -32.5 / 250.0, 11100.0
RAMPA_RAD = [(0.40, (40, 90, 200)), (0.52, (80, 170, 230)), (0.64, (250, 220, 90)), (0.76, (240, 120, 50)), (0.90, (200, 30, 40)), (1.0, (120, 10, 60))]


def radiacion_global(zip_global, nivel=6):
    z = zipfile.ZipFile(zip_global); nx, ny = 2 ** (nivel + 1), 2 ** nivel
    H = np.zeros((ny * 64, nx * 64), np.float32)
    for x in range(nx):
        for y in range(ny):
            b = z.read(f'{nivel}/{x}/{y}.bin'); mn, esc = struct.unpack('<ff', b[:8])
            H[y * 64:(y + 1) * 64, x * 64:(x + 1) * 64] = (np.frombuffer(b[8:], '<u2').reshape(65, 65).astype(np.float32) * esc + mn)[:64, :64]
    latg = 90 - (np.arange(ny * 64) + .5) * 180 / (ny * 64)
    latc = np.radians(np.degrees(np.arctan(np.tan(np.radians(latg)) * (B_ * B_) / (A_ * A_))))
    r_ell = A_ * B_ / np.sqrt((B_ * np.cos(latc)) ** 2 + (A_ * np.sin(latc)) ** 2)
    H = H - (R_ - r_ell)[:, None]                                         # altura sobre la esfera (≈ datum MOLA)
    p = P_REF * np.exp(-(H - H_REF) / H_ESC)                              # presión media estimada (Pa)
    gy = D_GY + K_PA * (p - P_REF)                                        # dosis absorbida (µGy/día)
    sv = D_SV * gy / D_GY                                                 # dosis equivalente (mSv/día)
    xs = [a for a, _ in RAMPA_RAD]; cols = np.array([c for _, c in RAMPA_RAD], np.float32)
    rgb = np.stack([np.interp(sv, xs, cols[:, k]) for k in range(3)], -1)
    paso = 2 * math.pi * R_ / H.shape[1]
    rgb = np.clip(rgb * sombreado(H, paso / 4)[..., None], 0, 255).astype(np.uint8)
    W = rgb.shape[1]
    Image.fromarray(rgb[:, :W // 2]).save(os.path.join(SAL, 'radiacion_oeste.jpg'), quality=85, optimize=True)
    Image.fromarray(rgb[:, W // 2:]).save(os.path.join(SAL, 'radiacion_este.jpg'), quality=85, optimize=True)
    def en(lon, lat):
        return float(sv[int((90 - lat) / 180 * sv.shape[0]), int((lon + 180) / 360 * W)])
    meta = json.load(open(os.path.join(SAL, 'global.json'), encoding='utf-8'))
    meta['radiacion'] = dict(oeste='radiacion_oeste.jpg', este='radiacion_este.jpg', esquema='geodetica',
                             rampa=[[a, '#%02x%02x%02x' % c] for a, c in RAMPA_RAD], unidad='mSv/día',
                             min=round(float(sv.min()), 3), max=round(float(sv.max()), 3),
                             ejemplos=dict(gale=round(en(137.4, -4.6), 3), olympus=round(en(-133.8, 18.6), 3), hellas=round(en(67, -45), 3), jezero=round(en(77.5, 18.4), 3)),
                             parametros=dict(dosis_gale_mGy=D_GY / 1000, dosis_gale_mSv=D_SV, presion_ref_Pa=P_REF, altura_ref_m=H_REF, uGy_por_Pa=K_PA, altura_escala_m=H_ESC))
    json.dump(meta, open(os.path.join(SAL, 'global.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('radiación', rgb.shape, 'min/max', meta['radiacion']['min'], meta['radiacion']['max'], meta['radiacion']['ejemplos'])


if __name__ == '__main__' and '--radiacion' in sys.argv:
    radiacion_global(sys.argv[sys.argv.index('--radiacion') + 1])

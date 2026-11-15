# Contornos de lugares clave de Marte -> datos/lugares_clave.json
# Mismo método que el borde de Gale (datos/borde_gale.json): 360 perfiles radiales desde el centro de la IAU, y en
# cada uno la línea de cresta (cráteres: punto más convexo entre 0,8 y 1,2 radios del diámetro IAU) o, para Olympus Mons, el escarpe basal
# (la mayor caída de altura entre 0,6 y 1,3 radios). Se suaviza con mediana y promedio móvil.
# Relieve: HRSC-MOLA Blended DEM 200 m (USGS), de nuestras teselas del globo nivel 7 (~1,3 km/píxel). Cálculo propio.
# Centro y diámetro: nomenclatura de la IAU (capas/global/toponimos.json).
# Uso: python lugares_clave.py RUTA/terreno_marte_global_n0-7.zip
import json, math, os, struct, sys, zipfile
import numpy as np
from scipy import ndimage

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A_, B_, R_ = 3396190.0, 3376200.0, 3396190.0
NIV = 7

def dem(zipf):
    z = zipfile.ZipFile(zipf); nx, ny = 2 ** (NIV + 1), 2 ** NIV
    H = np.zeros((ny * 64, nx * 64), np.float32)
    for x in range(nx):
        for y in range(ny):
            b = z.read(f'{NIV}/{x}/{y}.bin'); mn, esc = struct.unpack('<ff', b[:8])
            H[y * 64:(y + 1) * 64, x * 64:(x + 1) * 64] = (np.frombuffer(b[8:], '<u2').reshape(65, 65).astype(np.float32) * esc + mn)[:64, :64]
    latg = 90 - (np.arange(H.shape[0]) + .5) * 180 / H.shape[0]
    latc = np.arctan(np.tan(np.radians(latg)) * B_ * B_ / (A_ * A_))
    r_ell = A_ * B_ / np.sqrt((B_ * np.cos(latc)) ** 2 + (A_ * np.sin(latc)) ** 2)
    return H - (R_ - r_ell)[:, None]          # altura sobre la esfera (≈ datum MOLA), filas en latitud geodética

def geod(latc): return math.degrees(math.atan(math.tan(math.radians(latc)) * A_ * A_ / (B_ * B_)))

def muestra(H, lon, latc):
    f = (90 - geod(latc)) / 180 * H.shape[0] - .5; c = ((lon + 180) % 360) / 360 * H.shape[1] - .5
    return ndimage.map_coordinates(H, [[f], [c]], order=1, mode='wrap')[0]

def contorno(H, lon0, lat0, diam_km, modo, r_min, r_max):
    R = diam_km / 2; pts = []
    for az in range(360):
        a = math.radians(az); rs = np.linspace(r_min * R, r_max * R, 160)
        lats = lat0 + np.degrees(rs * math.cos(a) / (R_ / 1000))
        lons = lon0 + np.degrees(rs * math.sin(a) / (R_ / 1000 * math.cos(math.radians(lat0))))
        h = np.array([muestra(H, lo, la) for lo, la in zip(lons, lats)])
        h = ndimage.uniform_filter1d(h, 5)
        if modo == 'cresta':   # cresta = punto más convexo (como en el borde de Gale), sin los extremos del perfil
            c2 = np.gradient(np.gradient(ndimage.uniform_filter1d(h, 9))); c2[:8] = c2[-8:] = 1e9; k = int(np.argmin(c2))
        else: k = int(np.argmin(np.gradient(h)))
        pts.append(rs[k])
    rr = np.array(pts)
    rr = ndimage.median_filter(rr, 15, mode='wrap'); rr = ndimage.uniform_filter1d(rr, 7, mode='wrap')
    sal = []
    for az, r in zip(range(361), list(rr) + [rr[0]]):
        a = math.radians(az)
        la = lat0 + math.degrees(r * math.cos(a) / (R_ / 1000)); lo = lon0 + math.degrees(r * math.sin(a) / (R_ / 1000 * math.cos(math.radians(lat0))))
        sal.append([round(lo, 4), round(la, 4), int(round(float(muestra(H, lo, la))))])
    return sal, float(np.mean(rr) * 2)

LUGARES = [   # nombre IAU, id, modo, r_min, r_max, texto (por qué es clave), fuente con enlace
    ('Olympus Mons', 'olympus', 'escarpe', 0.6, 1.3, 'El volcán más grande conocido del sistema solar: unos 26 km sobre las llanuras que lo rodean y más de 600 km de base, rodeado por un escarpe de hasta 6 km.',
     'NASA Science, Olympus Mons (imagen Viking PIA00300)', 'https://science.nasa.gov/image-detail/amf-pia00300/'),
    ('Hellas Planitia', 'hellas', 'cresta', 0.8, 1.2, 'La cuenca de impacto más grande y profunda de Marte, de unos 2.300 km: en su fondo están las alturas más bajas del planeta.',
     'NASA Science, "To Great Depths" (HiRISE, PIA21570)', 'https://science.nasa.gov/photojournal/to-great-depths'),
    ('Jezero', 'jezero', 'cresta', 0.8, 1.2, 'Cráter con un antiguo delta de río y un lago: lo explora el rover Perseverance (2021–hoy), que guarda muestras de roca pensadas para traer a la Tierra.',
     'NASA Science, misión Mars 2020 Perseverance', 'https://science.nasa.gov/mission/mars-2020-perseverance/'),
    ('Gusev', 'gusev', 'cresta', 0.8, 1.2, 'Cráter donde aterrizó y trabajó el rover Spirit (2004–2010); encontró rocas con mucha sílice formadas con agua caliente.',
     'NASA Science, misión Spirit (MER-A)', 'https://science.nasa.gov/mission/mer-spirit/'),
    ('Endeavour', 'endeavour', 'cresta', 0.8, 1.2, 'Cráter al que llegó el rover Opportunity en 2011 tras años de viaje; en su borde trabajó hasta 2018 y encontró vetas de yeso dejadas por agua.',
     'NASA Science, misión Opportunity (MER-B)', 'https://science.nasa.gov/mission/mer-opportunity/'),
]

if __name__ == '__main__':
    H = dem(sys.argv[1])
    top = {n[0]: n for n in json.load(open(os.path.join(AQUI, 'capas', 'global', 'toponimos.json'), encoding='utf-8'))}
    sal = []
    for nom, lid, modo, r0, r1, txt, ft, fu in LUGARES:
        _, lon, lat, d = top[nom]
        pts, dmed = contorno(H, lon, lat, d, modo, r0, r1)
        el = [p[2] for p in pts]
        sal.append(dict(id=lid, nombre=nom, centro=[lon, lat], diametro_iau_km=d, diametro_contorno_km=round(dmed), tipo=modo,
                        texto=txt, fuente=ft, enlace=fu, alt_min=min(el), alt_max=max(el), puntos=pts))
        print(nom, 'IAU', d, 'km · contorno medio', round(dmed), 'km · alturas', min(el), max(el))
    json.dump(dict(metodo='Contorno: 360 perfiles radiales desde el centro IAU sobre el relieve HRSC-MOLA Blend 200 m (USGS) a ~1,3 km/píxel; '
                         'cráteres: línea de cresta (punto más convexo); Olympus Mons: escarpe basal (mayor caída). Cálculo propio, igual que el borde de Gale.',
                   fuente_nombres='Nomenclatura planetaria de la IAU (USGS Gazetteer of Planetary Nomenclature)', lugares=sal),
              open(os.path.join(AQUI, 'datos', 'lugares_clave.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

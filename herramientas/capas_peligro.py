"""Capas portables de la zona sol5070 (peligro, pendiente, cielo tapado) y puntos nuevos del recorrido.

Uso: python herramientas/capas_peligro.py
Lee:  data/terreno/sol5070/{meta.json, dem_2m.bin, cielo_bloqueado_u8.bin, orto.jpg}
      data/mineralogia/crism_sol5070/{meta.json, FM2.png, MAF.png, HYD.png}
      data/rutas/rutas_sol5070_calculadas.geojson, data/parametros.json
Escribe: data/capas/sol5070/ (PNG + meta.json, misma grilla que el terreno: 2 m por píxel)
         data/rutas/puntos_extra_sol5070.geojson
Clases de peligro (peligro_clases.png, un byte por celda):
  0 sin peligro · 1 precaución (pendiente 15-20°) · 2 peligro (20-30°: sobre el límite del traje y del rover)
  3 crítico (más de 30°: supuesto de riesgo de caída) · 4 posible arena suelta (CRISM máfico fuerte + tono oscuro en HiRISE)
"""
import json, math, os
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.join(R, 'data/terreno/sol5070')
meta = json.load(open(os.path.join(T, 'meta.json')))
W, H, CS = meta['ancho'], meta['alto'], meta['tam_celda_m']
z = np.fromfile(os.path.join(T, 'dem_2m.bin'), '<f4').reshape(H, W).astype(float)
lat_c = meta['lat_norte'] - meta['grados_por_m'] * CS * H / 2
cosl = math.cos(math.radians(lat_c))
gy, gx = np.gradient(z, CS, CS * cosl)
pend = np.degrees(np.arctan(np.hypot(gx, gy)))
cielo = np.fromfile(os.path.join(T, 'cielo_bloqueado_u8.bin'), np.uint8).reshape(H, W) / 255

# tono HiRISE a 2 m (percentil dentro de la zona)
orto = np.asarray(Image.open(os.path.join(T, 'orto.jpg')).convert('L').resize((W, H), Image.BOX), float)
tono = orto.argsort(axis=None).argsort().reshape(H, W) / (W * H)

# CRISM muestreado en cada celda (vecino más cercano)
M = os.path.join(R, 'data/mineralogia/crism_sol5070')
cm = json.load(open(os.path.join(M, 'meta.json')))
lat = meta['lat_norte'] - (np.arange(H) + 0.5) * CS * meta['grados_por_m']
lon = meta['lon_oeste'] + (np.arange(W) + 0.5) * CS * meta['grados_por_m']
fi = np.clip(((cm['lat_norte'] - lat) / cm['grados_por_px']).astype(int), 0, cm['alto'] - 1)
ci = np.clip(((lon - cm['lon_oeste']) / cm['grados_por_px']).astype(int), 0, cm['ancho'] - 1)
def crism(p):
    a = np.asarray(Image.open(os.path.join(M, p + '.png')).convert('RGB'), float)
    return a[fi][:, ci]
fm2, maf, hyd = crism('FM2'), crism('MAF'), crism('HYD')
mafico = (fm2[..., 2] >= 130) | (maf[..., 0] >= 85)

clases = np.zeros((H, W), np.uint8)
clases[(pend >= 15) & (pend < 20)] = 1
arena = mafico & (tono < 0.35) & (pend < 20)
clases[arena] = 4
clases[(pend >= 20) & (pend < 30)] = 2
clases[pend >= 30] = 3
n = W * H
print('área por clase: ' + ', '.join(f'{k}: {100 * (clases == k).sum() / n:.1f}%' for k in range(5)))

# ---------- capas portables (PNG en la grilla del terreno + meta.json) ----------
OUT = os.path.join(R, 'data/capas/sol5070'); os.makedirs(OUT, exist_ok=True)
Image.fromarray(clases, 'L').save(os.path.join(OUT, 'peligro_clases.png'), optimize=True)
COL = {1: (255, 214, 60, 120), 2: (255, 120, 20, 170), 3: (220, 30, 40, 200), 4: (150, 90, 220, 150)}
rgba = np.zeros((H, W, 4), np.uint8)
for k, c in COL.items(): rgba[clases == k] = c
Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, 'peligro.png'), optimize=True)
pc = np.zeros((H, W, 4), np.uint8)
pc[(pend >= 15) & (pend < 20)] = (255, 220, 60, 110); pc[(pend >= 20) & (pend < 30)] = (255, 130, 0, 160); pc[pend >= 30] = (230, 40, 40, 190)
Image.fromarray(pc, 'RGBA').save(os.path.join(OUT, 'pendiente.png'), optimize=True)
cc = np.zeros((H, W, 4), np.uint8); cc[..., 0], cc[..., 1], cc[..., 2] = 40, 120, 255
cc[..., 3] = np.clip((cielo - 0.05) * 700, 0, 210).astype(np.uint8)
Image.fromarray(cc, 'RGBA').save(os.path.join(OUT, 'cielo_tapado.png'), optimize=True)
gpm = meta['grados_por_m'] * CS
json.dump({
    'zona': 'sol5070', 'ancho': W, 'alto': H, 'm_por_px': CS,
    'lat_norte': meta['lat_norte'], 'lat_sur': meta['lat_norte'] - H * gpm, 'lon_oeste': meta['lon_oeste'], 'lon_este': meta['lon_oeste'] + W * gpm,
    'grados_por_px': gpm, 'proyeccion': 'Equirectangular, paralelo estándar 0, R=3396190 m (igual que data/terreno)',
    'nota': 'lat_norte/lon_oeste = esquina noroeste del píxel (0,0). Para un mapa 2D (Leaflet, MapLibre): imagen sobre el rectángulo [lat_sur, lon_oeste]-[lat_norte, lon_este].',
    'capas': {
        'peligro_clases.png': 'Un byte por celda: 0 sin peligro, 1 precaución (pendiente 15-20°), 2 peligro (20-30°, sobre el límite del traje y del rover), 3 crítico (más de 30°, supuesto de riesgo de caída), 4 posible arena suelta.',
        'peligro.png': 'Las mismas clases en color: amarillo 1, naranja 2, rojo 3, violeta 4 (transparente = 0).',
        'pendiente.png': 'Pendiente del terreno: amarillo 15-20°, naranja 20-30°, rojo más de 30°.',
        'cielo_tapado.png': 'Fracción de cielo tapada por el relieve (más azul = más tapado = menos radiación). Cálculo propio: 16 direcciones hasta 400 m.',
    },
    'fuentes': {
        'pendiente': 'Cálculo propio sobre el DEM USGS de Gale de 1 m (Calef y Parker 2016) llevado a 2 m.',
        'limites': 'Límite de 20° para traje (requisito lunar Artemis, NTRS 20210026296) y rover (provisorio, data/parametros.json). 30° crítico: SUPUESTO del equipo.',
        'arena': 'Indicio: CRISM FM2 (hierro ferroso) o MAF (olivino) fuerte, que suele marcar regolito o arena (guía de los mosaicos CRISM GMWG 2012), más tono oscuro en HiRISE (percentil < 35 de la zona). No es una medición de arena.',
    },
    'armado_con': 'herramientas/capas_peligro.py',
}, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1, ensure_ascii=False)

# ---------- puntos nuevos del recorrido ----------
g = json.load(open(os.path.join(R, 'data/rutas/rutas_sol5070_calculadas.geojson')))
def celda(lo, la):
    return int((meta['lat_norte'] - la) / gpm), int((lo - meta['lon_oeste']) / gpm)
def lonlat(i, j):
    return meta['lon_oeste'] + (j + 0.5) * gpm, meta['lat_norte'] - (i + 0.5) * gpm
def cerca_de(lineas, radio_m):
    m = np.zeros((H, W), bool); r = int(radio_m / CS)
    for coords in lineas:
        for lo, la in coords:
            i, j = celda(lo, la); m[max(0, i - r):i + r + 1, max(0, j - r):j + r + 1] = True
    return m
astro = [f['geometry']['coordinates'] for f in g['features'] if f['geometry']['type'] == 'LineString' and f['properties']['ruta'] == 'astronauta']
robot = [f['geometry']['coordinates'] for f in g['features'] if f['geometry']['type'] == 'LineString' and f['properties']['ruta'] == 'vehiculo']
paradas = [celda(*f['geometry']['coordinates']) for f in g['features'] if f['geometry']['type'] == 'Point']
ii, jj = np.mgrid[0:H, 0:W]
lejos = np.ones((H, W), bool)
for (i, j) in paradas: lejos &= np.hypot(ii - i, jj - j) * CS > 110
def mejor(score, mascara):
    s = np.where(mascara, score, -np.inf); k = int(np.argmax(s)); return divmod(k, W)
def ficha(i, j):
    lo, la = lonlat(i, j)
    return dict(lon=lo, lat=la, elev=float(z[i, j]), pend=float(pend[i, j]), cielo=float(cielo[i, j]))
nuevos = []
caminable = (pend < 16)
cerca_a = cerca_de(astro, 20)
# R1: refugio natural (sombra de radiación) junto a la ruta a pie
i, j = mejor(cielo, cerca_a & caminable & lejos); r1 = ficha(i, j)
lejos &= np.hypot(ii - i, jj - j) * CS > 110
# M1: mirador (prominencia sobre los 60 m alrededor)
from numpy.lib.stride_tricks import sliding_window_view
k = 30; zp = np.pad(z, k, mode='edge'); media = sliding_window_view(zp, (2 * k + 1, 2 * k + 1))[::1, ::1].mean(axis=(2, 3))
prom = z - media
i, j = mejor(prom, cerca_a & caminable & lejos); m1 = ficha(i, j); m1['prom'] = float(prom[i, j])
lejos &= np.hypot(ii - i, jj - j) * CS > 110
# Q1: sulfato polihidratado más fuerte (HYD rojo + azul, sin verde)
poli = np.minimum(hyd[..., 0], hyd[..., 2]) - hyd[..., 1]
i, j = mejor(poli, cerca_a & caminable & lejos); q1 = ficha(i, j); q1['hyd'] = hyd[i, j].tolist()
# Z1: tramo de la ruta del robot que pasa por posible arena
cand = [(celda(lo, la), (lo, la)) for c in robot for lo, la in c]
en_arena = [(ij, ll) for ij, ll in cand if clases[ij] == 4]
z1 = None
if en_arena:
    (i, j), _ = en_arena[len(en_arena) // 2]; z1 = ficha(i, j); z1['frac'] = len(en_arena) / len(cand)
for nombre, v in [('R1', r1), ('M1', m1), ('Q1', q1), ('Z1', z1)]: print(nombre, v)
json.dump({'R1': r1, 'M1': m1, 'Q1': q1, 'Z1': z1}, open('/tmp/puntos_extra.json', 'w'), indent=1)

"""Globo de Marte de fondo para la escena 3D: relieve MOLA y color Viking alrededor del terreno de la travesía.

Arma data/terreno/globo/ con:
- mola_region.png  relieve del cráter Gale y alrededores (lon 127-148 E, lat 16 S-5 N) en los vértices de una grilla de 1/16° (~3,7 km),
                   interpolado de MOLA MEGDR 16 píxeles/grado. Codificado en R·256+G = altura + 10000 (m).
- color_region.png color Viking en esos mismos vértices.
- mola_global.png / color_global.png  todo Marte en una grilla de 1° (para alejarse hasta ver el planeta).
- meta.json        cajas, codificación, ganancia de color y fuentes.

Fuentes:
- MOLA MEGDR 16 ppd (megt90n000eb.img; Smith et al. 2003, MGS MOLA, NASA PDS Geosciences Node). Copia usada: repositorio público
  benbrittain/Barsoom (GitHub), mismo archivo del PDS. Alturas en metros sobre el areoide, enteros de 16 bits big-endian, 5760 × 2880,
  desde 90° N y 0° E.
- Viking MDIM 2.1 en color (NASA/USGS, vía Mars Trek), maps-in-mars/capas/viking_color_8k.jpg: 8192 × 4096, de -180° a 180° y de 90° N a 90° S.

Uso: python herramientas/globo.py /ruta/megt90n000eb.img
"""
import json, os, sys
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(RAIZ, 'data', 'terreno', 'globo')
os.makedirs(SAL, exist_ok=True)
mola = np.fromfile(sys.argv[1], '>i2').reshape(2880, 5760).astype(np.float32)
vik = np.asarray(Image.open(os.path.join(RAIZ, 'maps-in-mars', 'capas', 'viking_color_8k.jpg')).convert('RGB')).astype(np.float32)
VH, VW = vik.shape[:2]

def mola_bilineal(lat, lon):
    """Altura MOLA interpolada; los centros de píxel están en lat = 90 - (i+0.5)/16, lon = (j+0.5)/16."""
    f = (90 - lat) * 16 - 0.5; c = (np.mod(lon, 360)) * 16 - 0.5
    i0 = np.floor(f).astype(int); j0 = np.floor(c).astype(int); fi = f - i0; fj = c - j0
    i0 = np.clip(i0, 0, 2878); j1 = np.mod(j0 + 1, 5760); j0 = np.mod(j0, 5760)
    a, b, cc, d = mola[i0, j0], mola[i0, j1], mola[i0 + 1, j0], mola[i0 + 1, j1]
    return a * (1 - fi) * (1 - fj) + b * (1 - fi) * fj + cc * fi * (1 - fj) + d * fi * fj

def viking(lat, lon, r=0):
    """Color Viking en (lat, lon), promediando ±r píxeles."""
    x = ((np.mod(lon + 180, 360)) / 360 * VW - 0.5); y = (90 - lat) / 180 * VH - 0.5
    xi = np.clip(np.round(x).astype(int), 0, VW - 1); yi = np.clip(np.round(y).astype(int), 0, VH - 1)
    if r == 0: return vik[yi, xi]
    acc = np.zeros(xi.shape + (3,), np.float32); n = 0
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            acc += vik[np.clip(yi + dy, 0, VH - 1), np.mod(xi + dx, VW)]; n += 1
    return acc / n

def guardar_altura(nombre, h):
    v = np.clip(np.round(h + 10000), 0, 65535).astype(np.uint32)
    rgb = np.stack([v >> 8, v & 255, np.zeros_like(v)], -1).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(SAL, nombre), optimize=True)

# --- región: grilla de vértices cada 1/16° en las esquinas de los píxeles MOLA
R = dict(lon_oeste=127.0, lon_este=148.0, lat_norte=5.0, lat_sur=-16.0, paso=1 / 16)
lats = R['lat_norte'] - np.arange(int((R['lat_norte'] - R['lat_sur']) * 16) + 1) / 16
lons = R['lon_oeste'] + np.arange(int((R['lon_este'] - R['lon_oeste']) * 16) + 1) / 16
LA, LO = np.meshgrid(lats, lons, indexing='ij')
hr = mola_bilineal(LA, LO)
cr = viking(LA, LO, 1)
guardar_altura('mola_region.png', hr)
Image.fromarray(np.clip(cr, 0, 255).astype(np.uint8)).save(os.path.join(SAL, 'color_region.png'), optimize=True)

# imagen Viking de la región a resolución completa (8k: ~22,8 píxeles por grado), para usarla como textura
x0 = int(round((R['lon_oeste'] + 180) / 360 * VW)); x1 = int(round((R['lon_este'] + 180) / 360 * VW))
y0 = int(round((90 - R['lat_norte']) / 180 * VH)); y1 = int(round((90 - R['lat_sur']) / 180 * VH))
Image.fromarray(vik[y0:y1, x0:x1].astype(np.uint8)).save(os.path.join(SAL, 'viking_region.jpg'), quality=92)
R['viking_px'] = [x0, y0, x1, y1]
R['viking_caja'] = dict(oeste=x0 / VW * 360 - 180, este=x1 / VW * 360 - 180, norte=90 - y0 / VH * 180, sur=90 - y1 / VH * 180)   # lo que cubre el recorte

# --- todo Marte: grilla de 1°, altura y color promediados en el grado alrededor de cada vértice
glat = 90 - np.arange(181.0); glon = np.arange(361.0)
GA, GO = np.meshgrid(glat, glon, indexing='ij')
hg = np.zeros(GA.shape, np.float32)
for di in np.linspace(-0.45, 0.45, 7):
    for dj in np.linspace(-0.45, 0.45, 7):
        hg += mola_bilineal(np.clip(GA + di, -89.97, 89.97), GO + dj)
hg /= 49
guardar_altura('mola_global.png', hg)
cg = viking(GA, GO, 6)
Image.fromarray(np.clip(cg, 0, 255).astype(np.uint8)).save(os.path.join(SAL, 'color_global.png'), optimize=True)

# imagen Viking de todo Marte para la escena: 4096 × 2048, JPEG más liviano que el original
Image.fromarray(vik.astype(np.uint8)).resize((4096, 2048), Image.LANCZOS).save(os.path.join(SAL, 'viking_global.jpg'), quality=80, optimize=True)

# --- ganancia de color: que el Viking (2,6 km/píxel) tenga el tono del mosaico de la travesía (3 m) donde se superponen
mc = json.load(open(os.path.join(RAIZ, 'data', 'terreno', 'travesia_sur', 'meta.json')))
col = np.concatenate([np.asarray(Image.open(os.path.join(RAIZ, 'data', 'terreno', 'travesia_sur', n)).convert('RGB')).astype(np.float32) for n in mc['color']['archivos']], 0)
media_ctx = col.reshape(-1, 3).mean(0)
la = np.linspace(mc['lat_sur'], mc['lat_norte'], 20); lo = np.linspace(mc['lon_oeste'], mc['lon_este'], 20)
A, O = np.meshgrid(la, lo, indexing='ij')
media_vik = viking(A, O, 0).reshape(-1, 3).mean(0)
gan = (media_ctx / np.maximum(media_vik, 1)).round(3).tolist()

# --- control: MOLA contra el DEM de la travesía (mismo areoide)
rg = np.asarray(Image.open(os.path.join(RAIZ, 'data', 'terreno', 'travesia_sur', mc['dem']['archivo'])).convert('RGB')).astype(np.int64)
dem = mc['dem']['zmin'] + (rg[..., 0] * 256 + rg[..., 1]) * mc['dem']['escala_m']
ff = np.linspace(0, dem.shape[0] - 1, 30).astype(int); cc = np.linspace(0, dem.shape[1] - 1, 12).astype(int)
FF, CC = np.meshgrid(ff, cc, indexing='ij')
latp = mc['lat_norte'] - (FF + 0.5) * 12 / 3396190 * 180 / np.pi; lonp = mc['lon_oeste'] + (CC + 0.5) * 12 / 3396190 * 180 / np.pi
dif = mola_bilineal(latp, lonp) - dem[FF, CC]

meta = dict(region=dict(R, ancho=len(lons), alto=len(lats)), global_=dict(paso=1, ancho=361, alto=181, lon_oeste=0, lat_norte=90),
            codificacion='altura_m = R*256 + G - 10000 (sobre el areoide MOLA)', ganancia_color=gan,
            control_mola_menos_dem_travesia_m=dict(media=round(float(dif.mean()), 1), desvio=round(float(dif.std()), 1)),
            fuentes=['MOLA MEGDR 16 ppd, megt90n000eb.img (Smith et al. 2003; NASA PDS Geosciences Node). Copia: github.com/benbrittain/Barsoom',
                     'Viking MDIM 2.1 color (NASA/USGS, Mars Trek), maps-in-mars/capas/viking_color_8k.jpg'],
            nota='Fondo visual de la escena: ~3,7 km por vértice cerca de Gale y 1° en el resto del planeta. La ganancia de color iguala el tono del Viking al mosaico de la travesía.')
json.dump(meta, open(os.path.join(SAL, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
print('region', hr.shape, 'global', hg.shape, 'ganancia', gan, 'MOLA - DEM travesía:', meta['control_mola_menos_dem_travesia_m'])
for n in os.listdir(SAL): print(n, os.path.getsize(os.path.join(SAL, n)))

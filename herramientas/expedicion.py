"""Expedición sur: estira el recorrido más allá de A4 sobre el terreno de contexto (12 m) y elige nuevos puntos de exploración.

Qué hace (todo es cálculo propio sobre datos con fuente):
1. Lee el terreno de contexto (data/terreno/travesia_sur: elevación, pendiente y cielo tapado a 12 m) y el color a 3 m.
2. Remuestrea los mosaicos CRISM GMWG 2012 (Seelos et al.) a esa grilla: HYD, ALT, MAF, FM2.
3. Marca arena probable (tono azulado en el color, como en capas_peligro.py) y terreno prohibido (> 20°).
4. Elige 5 puntos al sur de la zona actual, cada uno por un criterio distinto, separados por >= 350 m.
5. Une A4 con los puntos con A* (rover: evita > 20° y arena; astronauta: evita > 20°) y calcula largo, subida, tiempo y dosis.
6. Para cada punto guarda los indicadores CRISM (percentil en el contexto), elevación, pendiente y cielo: con eso la escena
   arma la "perforación simulada".

Uso: /usr/bin/python3.12 herramientas/expedicion.py <carpeta con *_ALT_120723.tif, *_HYD_*, *_MAF_*, *_FM2_*>
Salida: data/rutas/expedicion_sur.geojson y data/mineralogia/crism_contexto.png (+ .json)
"""
import json, math, os, sys, heapq, glob
import numpy as np
from osgeo import gdal
from PIL import Image
gdal.UseExceptions()

R = 3396190.0
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = os.path.join(RAIZ, 'data/terreno/travesia_sur')
M = json.load(open(os.path.join(CTX, 'meta.json')))
Z = json.load(open(os.path.join(RAIZ, 'data/terreno/sol5070/meta.json')))
P = json.load(open(os.path.join(RAIZ, 'data/parametros.json')))
W, H, CS = M['dem']['ancho'], M['dem']['alto'], M['dem']['m_por_px']
latN, lonW = M['lat_norte'], M['lon_oeste']

rg = np.asarray(Image.open(os.path.join(CTX, M['dem']['archivo'])).convert('RGB')).astype(np.int64)
DEM = M['dem']['zmin'] + (rg[..., 0] * 256 + rg[..., 1]) * M['dem']['escala_m']
PEND = np.asarray(Image.open(os.path.join(CTX, 'pend_12m.png')).convert('L')).astype(float) / 4
CIELO = np.asarray(Image.open(os.path.join(CTX, 'cielo_12m.png')).convert('L')).astype(float) / 255

def a_celda(lon, lat):
    return (math.radians(lon - lonW) * R / CS, math.radians(latN - lat) * R / CS)
def a_lonlat(c, f):
    return lonW + math.degrees((c + .5) * CS / R), latN - math.degrees((f + .5) * CS / R)

# --- color a 3 m -> índice azul (arena probable), promediado a 12 m
col = np.concatenate([np.asarray(Image.open(os.path.join(CTX, n)).convert('RGB')).astype(float) for n in M['color']['archivos']], axis=0)
col = col[:H * 4, :W * 4].reshape(H, 4, W, 4, 3).mean(axis=(1, 3))
AZUL = (col[..., 2] - col[..., 0]) / np.maximum(1, col[..., 2] + col[..., 0])
ARENA = (AZUL > -0.06) & (PEND < 15)

# --- CRISM remuestreado a la grilla de contexto
D = sys.argv[1].rstrip('/') + '/' if len(sys.argv) > 1 else '/mnt/user-data/uploads/'
LIM = {'ALT': [('D2300', .01, .03), ('SINDEX2', .01, .03), ('BD1900_2', .005, .025)],
       'FM2': [('BD530', .18, .25), ('BD920', .005, .02), ('BDI1000VIS', .01, .022)],
       'MAF': [('OLINDEX3', .025, .1), ('LCPINDEX2', 0, .02), ('HCPINDEX2', 0, .15)],
       'HYD': [('SINDEX2', .01, .03), ('BD2100_2', .008, .03), ('BD1900_2', .005, .025)]}
x0 = math.radians(lonW) * R; y0 = math.radians(latN) * R
CR = {}
for prod in LIM:
    f = sorted(glob.glob(D + f'*_{prod}_120723.tif'))[0]
    ds = gdal.Warp('', f, format='MEM', outputBounds=(x0, y0 - H * CS, x0 + W * CS, y0), width=W, height=H, resampleAlg='average')
    a = ds.ReadAsArray().astype(float)
    a[a == 255] = np.nan
    for b, (nm, lo, hi) in enumerate(LIM[prod]):
        CR[f'{prod}.{nm}'] = a[b]
def pct(clave, v):
    a = CR[clave]; a = a[np.isfinite(a)]
    return int(round(100 * (a < v).mean()))
def ventana(a, c, f, r=2):
    w = a[max(0, f - r):f + r + 1, max(0, c - r):c + r + 1]
    return float(np.nanmean(w)) if np.isfinite(w).any() else float('nan')

# --- dónde buscar: al sur de la zona actual (y un margen al este y oeste del recorrido)
_, fzona = a_celda(Z['lon_oeste'], Z['lat_sur'])
ff, cc = np.mgrid[0:H, 0:W]
region = (ff > fzona + 8) & (ff < H - 10) & (cc > 10) & (cc < W - 10)
_a4 = json.load(open(os.path.join(RAIZ, 'data/rutas/rutas_sol5070_calculadas.geojson')))
_A4 = next(f['geometry']['coordinates'] for f in _a4['features'] if f['geometry']['type'] == 'Point' and f['properties']['parada'] == 'A4')
_c, _f = (int(v) for v in a_celda(*_A4))
_ok = PEND <= 20; _alc = np.zeros_like(_ok); _alc[_f, _c] = True
while True:                              # relleno por dilatación (8 vecinos) dentro de lo transitable
    _d = _alc.copy(); _d[1:] |= _alc[:-1]; _d[:-1] |= _alc[1:]; _d[:, 1:] |= _d[:, :-1].copy(); _d[:, :-1] |= _d[:, 1:].copy(); _d &= _ok
    if (_d == _alc).all(): break
    _alc = _d
region &= _alc
region &= (np.abs(cc - _c) * CS < 1100) & (ff > _f + 20)     # corredor hacia el sur de A4 (±1,1 km): estirar el recorrido, no zigzaguear
ALCANZABLE = _alc          # solo lo que se alcanza desde A4 sin pasar por > 20°
caminable = PEND < 15
# suavizado para no elegir un píxel aislado
def media(a, r=2):
    from numpy.lib.stride_tricks import sliding_window_view
    p = np.pad(np.nan_to_num(a, nan=np.nanmean(a)), r, mode='edge')
    return sliding_window_view(p, (2 * r + 1, 2 * r + 1)).mean(axis=(2, 3))
hyd_poli = media(CR['HYD.SINDEX2']) - 0.6 * media(CR['HYD.BD2100_2'])
hyd_mono = media(CR['HYD.BD2100_2'])
arcilla = media(CR['ALT.D2300'])
agua = media(CR['HYD.BD1900_2'])
mafico = media(CR['FM2.BDI1000VIS'])
loma = DEM - media(DEM, 8)

elegidos = []
def elegir(clave, puntaje, mascara, nombre, por_que, quien):
    s = np.where(region & mascara, puntaje, -np.inf)
    for c0, f0 in elegidos:
        s[(cc - c0) ** 2 + (ff - f0) ** 2 < (350 / CS) ** 2] = -np.inf
    f, c = np.unravel_index(np.argmax(s), s.shape)
    elegidos.append((c, f))
    return dict(id=clave, nombre=nombre, por_que=por_que, quien=quien, c=int(c), f=int(f))

cand = [
    elegir('E1', hyd_poli, caminable & ~ARENA, 'E1 · Sulfato polihidratado',
           'La señal de sulfato con agua (polihidratado) más fuerte al sur de la zona, en terreno caminable. Seguir la sucesión de sulfatos hacia arriba es lo que hace hoy la misión: cada capa registra cómo se secaba Marte.', 'ambos'),
    elegir('E2', arcilla + 0.3 * agua, caminable & ~ARENA, 'E2 · Rastro de arcilla',
           'El punto con más señal de arcilla Fe/Mg (D2300) y agua al sur. Si se confirma en el lugar, sería una pista de otra etapa con agua (hipótesis a probar).', 'ambos'),
    elegir('E3', CIELO, PEND < 20, 'E3 · Refugio de relieve',
           'El lugar caminable con más cielo tapado al sur. Sirve de pausa con menos dosis y de reparo para una salida a pie larga. No protege de una tormenta solar.', 'astronauta'),
    elegir('E4', loma - 30 * np.maximum(0, PEND - 12) / 8, PEND < 12, 'E4 · Mirador alto',
           'El punto más elevado respecto de su entorno, con pendiente baja: panorámica para cartografiar las capas y elegir la próxima perforación.', 'ambos'),
    elegir('E5', ff.astype(float) - 3 * PEND - 20 * ARENA + 5 * (1 - media(CR['MAF.OLINDEX3']) / 254), (PEND < 8) & ~ARENA, 'E5 · Terreno claro, frente sur',
           'Lo más al sur que llega el terreno con datos, en un llano sin arena, ya dentro del terreno claro y estriado que creemos que es la capa de yardangs (a confirmar). Es el frente de avance: base para la campaña siguiente.', 'ambos'),
]

# --- A*
def astar(ini, fin, costo):
    (c0, f0), (c1, f1) = ini, fin
    g = {(c0, f0): 0.0}; prev = {}; pq = [(0, c0, f0)]
    while pq:
        _, c, f = heapq.heappop(pq)
        if (c, f) == (c1, f1): break
        for dc in (-1, 0, 1):
            for df in (-1, 0, 1):
                if not dc and not df: continue
                n = (c + dc, f + df)
                if not (0 <= n[0] < W and 0 <= n[1] < H): continue
                k = costo[n[1], n[0]]
                if not np.isfinite(k): continue
                d = math.hypot(dc, df) * CS
                ng = g[(c, f)] + d * k
                if ng < g.get(n, 1e18):
                    g[n] = ng; prev[n] = (c, f)
                    heapq.heappush(pq, (ng + math.hypot(n[0] - c1, n[1] - f1) * CS, n[0], n[1]))
    p = [(c1, f1)]
    while p[-1] != (c0, f0): p.append(prev[p[-1]])
    return p[::-1]
lim = 20
costo_rover = np.where(PEND > lim, np.inf, 1 + PEND / 10 + np.where(ARENA, 4, 0))
costo_astro = np.where(PEND > lim, np.inf, 1 + (PEND / 10) ** 2)

a4 = json.load(open(os.path.join(RAIZ, 'data/rutas/rutas_sol5070_calculadas.geojson')))
A4 = next(f['geometry']['coordinates'] for f in a4['features'] if f['geometry']['type'] == 'Point' and f['properties']['parada'] == 'A4')
ini = tuple(int(v) for v in a_celda(*A4))
# orden: de norte a sur, con E5 al final
import itertools                                                 # el orden más corto en línea recta desde A4; E5 (frente sur) al final
def _largo(o):
    q = [ini] + [(p['c'], p['f']) for p in o] + [(cand[4]['c'], cand[4]['f'])]
    return sum(math.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(q, q[1:]))
orden = list(min(itertools.permutations(cand[:4]), key=_largo)) + [cand[4]]
for i, p in enumerate(orden):                                   # numeración en el orden del recorrido
    p['id'] = f'E{i + 1}'; p['nombre'] = f"E{i + 1} · {p['nombre'].split(' · ', 1)[1]}"

def tobler(dz, d):
    s = dz / max(d, 1e-6)
    return 6 * math.exp(-3.5 * abs(s + 0.05)) / (6 * math.exp(-3.5 * 0.05))
vel = P['astronauta']['velocidad_llano_km_h'] / 3.6
dosis_dia = P['radiacion']['dosis_superficie_mSv_dia']; kbl = P['radiacion']['factor_blindaje_relieve']

def tramo_stats(camino, astronauta):
    L = sub = t = dos = 0.0; pmax = 0.0; arena = 0
    for (c, f), (c2, f2) in zip(camino, camino[1:]):
        d = math.hypot(c2 - c, f2 - f) * CS; dz = DEM[f2, c2] - DEM[f, c]
        L += d; sub += max(0, dz); pmax = max(pmax, PEND[f2, c2]); arena += int(ARENA[f2, c2])
        if astronauta:
            dt = d / (vel * tobler(dz, d)); t += dt; dos += dt / 86400 * dosis_dia * (1 - kbl * CIELO[f2, c2]) * 1000
    return dict(largo_m=round(L), subida_m=round(sub), pendiente_max=round(pmax, 1), celdas_arena=arena,
                tiempo_min=round(t / 60) if astronauta else None, dosis_uSv=round(dos, 1) if astronauta else None)

lineas = {}
for quien, costo in (('vehiculo', costo_rover), ('astronauta', costo_astro)):
    todo = [ini]; tramos = []
    for p in orden:
        cam = astar(todo[-1], (p['c'], p['f']), costo)
        tramos.append(tramo_stats(cam, quien == 'astronauta')); todo += cam[1:]
    lineas[quien] = (todo, tramos)

feats = []
for quien, (todo, tramos) in lineas.items():
    st = tramo_stats(todo, quien == 'astronauta')
    extra = {}
    if quien == 'vehiculo':
        extra = dict(soles_manejo=[round(st['largo_m'] / 60), round(st['largo_m'] / 30)], horas_rover_tripulado_10kmh=round(st['largo_m'] / 10000, 1))
    feats.append(dict(type='Feature', geometry=dict(type='LineString', coordinates=[[round(v, 6) for v in a_lonlat(c, f)] for c, f in todo]),
                      properties=dict(ruta=quien, nombre=f"Expedición sur · {'rover' if quien == 'vehiculo' else 'astronauta'}", desde='A4', **st, **extra,
                                      tramos=tramos, fuente='Cálculo propio: A* sobre la elevación de contexto a 12 m; límite 20°; el rover evita arena probable')))
for i, p in enumerate(orden):
    c, f = p['c'], p['f']
    crism = {}
    for k in CR:
        v = ventana(CR[k], c, f)
        crism[k] = None if not math.isfinite(v) else pct(k, v)
    feats.append(dict(type='Feature', geometry=dict(type='Point', coordinates=[round(v, 6) for v in a_lonlat(c, f)]),
                      properties=dict(id=p['id'], orden=i + 1, parada=p['nombre'], por_que=p['por_que'], quien=p['quien'],
                                      elevacion_m=round(float(DEM[f, c]), 1), pendiente=round(float(PEND[f, c]), 1),
                                      cielo_tapado_pct=round(float(CIELO[f, c]) * 100, 1), arena_probable=bool(ARENA[f, c]),
                                      crism_percentil=crism, tramo_rover=lineas['vehiculo'][1][i], tramo_astronauta=lineas['astronauta'][1][i],
                                      fuente='Selección propia sobre CRISM GMWG 2012 (Seelos et al.), elevación y color de contexto del equipo; criterio en por_que')))
salida = dict(type='FeatureCollection', nota='Expedición sur: propuesta propia para estirar el recorrido más allá de A4. Los puntos son candidatos elegidos por datos orbitales, no destinos anunciados por la misión.', features=feats)
json.dump(salida, open(os.path.join(RAIZ, 'data/rutas/expedicion_sur.geojson'), 'w'), ensure_ascii=False, indent=1)

# --- CRISM de contexto para la perforación simulada: percentil (0-255) de 6 indicadores, a 24 m
claves = ['HYD.SINDEX2', 'HYD.BD2100_2', 'HYD.BD1900_2', 'ALT.D2300', 'FM2.BDI1000VIS', 'FM2.BD920', 'MAF.OLINDEX3', 'MAF.HCPINDEX2']
img = []
for k in claves:
    a = CR[k]; v = a[np.isfinite(a)]
    r = np.searchsorted(np.sort(v), np.nan_to_num(a, nan=0)) / len(v)
    r = (r * 254).astype(np.uint8); r[~np.isfinite(a)] = 255
    img.append(r[::2, ::2])
apilada = np.concatenate(img, axis=0)
os.makedirs(os.path.join(RAIZ, 'data/mineralogia'), exist_ok=True)
Image.fromarray(apilada).save(os.path.join(RAIZ, 'data/mineralogia/crism_contexto.png'), optimize=True)
json.dump(dict(claves=claves, ancho=img[0].shape[1], alto_cada=img[0].shape[0], m_por_px=CS * 2,
               nota='Percentil dentro del área de contexto (byte/254); 255 = sin dato. Apiladas en vertical en el orden de claves. Fuente: mosaicos CRISM GMWG 2012 (Seelos et al., JHU/APL), remuestreados por promedio.',
               lat_norte=latN, lon_oeste=lonW), open(os.path.join(RAIZ, 'data/mineralogia/crism_contexto.json'), 'w'), ensure_ascii=False, indent=1)

for f in feats:
    p = f['properties']
    if f['geometry']['type'] == 'Point':
        print(p['parada'], f['geometry']['coordinates'], 'z', p['elevacion_m'], 'pend', p['pendiente'], 'cielo', p['cielo_tapado_pct'], 'arena', p['arena_probable'],
              {k.split('.')[1]: v for k, v in p['crism_percentil'].items() if k in ('HYD.SINDEX2', 'ALT.D2300', 'HYD.BD1900_2', 'FM2.BDI1000VIS')})
    else:
        print(p['nombre'], {k: p[k] for k in ('largo_m', 'subida_m', 'pendiente_max', 'celdas_arena', 'tiempo_min', 'dosis_uSv')})

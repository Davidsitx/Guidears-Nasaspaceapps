# Manchas de minerales vistas desde órbita (CRISM) en la franja de Curiosity -> capas/minerales/manchas.json
#
# Entrada: data/mineralogia/crism_contexto.png (del equipo): percentil de cada indicador CRISM dentro del área de
# la travesía, 24 m por píxel, de los mosaicos CRISM del cráter Gale (Seelos et al. 2012, NASA/JHU-APL).
# Método (cálculo propio): se marcan los píxeles con señal en el 10 % más fuerte de la zona (percentil >= 90),
# se limpian los puntos sueltos y se dibuja el contorno de cada mancha de al menos 0,05 km². Es señal RELATIVA:
# dice dónde el indicador es más fuerte dentro de la franja, no cuánto mineral hay.
# A cada mancha se le agregan los pozos de Curiosity que caen adentro con lo que midió CheMin (dato medido, NASA PDS)
# y, si coincide con una unidad descrita en un trabajo publicado, la referencia.
import json, os, math
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(AQUI)
meta = json.load(open(os.path.join(REPO, 'data', 'mineralogia', 'crism_contexto.json'), encoding='utf-8'))
img = np.asarray(Image.open(os.path.join(REPO, 'data', 'mineralogia', 'crism_contexto.png')).convert('L'))
W, Hc = meta['ancho'], meta['alto_cada']
d = math.degrees(meta['m_por_px'] / 3396190.0)
lon0, latN = meta['lon_oeste'], meta['lat_norte']

bib = json.load(open(os.path.join(AQUI, 'datos', 'biblioteca.json'), encoding='utf-8'))['pozos']
chem = dict(json.load(open(os.path.join(AQUI, 'capas', 'minerales', 'pozos_chemin.json'), encoding='utf-8'))['pozos'])

CRISM = dict(t='Mosaicos CRISM del cráter Gale (Seelos, Seelos, Viviano y Murchie 2012; NASA/JHU-APL)', u='https://crism.jhuapl.edu/msl_landing_sites/')
MILLIKEN = dict(t='Milliken, Grotzinger y Thomson 2010, GRL 37, L04201: arcillas abajo y sulfatos arriba en el Monte Sharp, vistos con CRISM', u='https://doi.org/10.1029/2009GL041870')
FRAEMAN13 = dict(t='Fraeman et al. 2013, Geology 41(10): capa con hematita mapeada con CRISM (la cresta Vera Rubin)', u='https://authors.library.caltech.edu/records/05bm4-2ke51')
FRAEMAN16 = dict(t='Fraeman et al. 2016, JGR Planets 121: unidades del Monte Sharp bajo con CRISM, HiRISE y THEMIS', u='https://doi.org/10.1002/2016JE005095')
CHEMIN = dict(t='CheMin en los pozos (NASA PDS Geosciences)', u='https://pds-geosciences.wustl.edu/missions/msl/chemin.htm')

# indicador -> (id, nombre, color, campo de CheMin para comparar, unidades conocidas por zona de pozo)
MIN = [
    ('ALT.D2300', 'arcillas', 'Arcillas de Fe/Mg', '#40c4ff', 'arcillas', {'glentorridon': ('Unidad con arcillas (Glen Torridon)', [FRAEMAN16, MILLIKEN])}),
    ('HYD.SINDEX2', 'sulfatos', 'Sulfatos hidratados', '#ffd640', 'sulfatos', {'sulfatos': ('Unidad de sulfatos del Monte Sharp', [MILLIKEN, FRAEMAN16]), 'boxwork': ('Unidad de sulfatos del Monte Sharp', [MILLIKEN, FRAEMAN16]), 'gediz': ('Unidad de sulfatos del Monte Sharp', [MILLIKEN, FRAEMAN16])}),
    ('HYD.BD1900_2', 'agua', 'Agua en minerales', '#78ffc8', None, {}),
    ('FM2.BD920', 'hematita', 'Óxidos férricos / hematita', '#ff503c', 'hematita', {'verarubin': ('Cresta Vera Rubin (capa con hematita)', [FRAEMAN13, FRAEMAN16])}),
    ('MAF.OLINDEX3', 'olivino', 'Olivino', '#96ff5a', None, {}),
    ('MAF.HCPINDEX2', 'piroxeno', 'Piroxeno alto en calcio', '#c878ff', None, {}),
]
UMBRAL, MIN_KM2, MAX_POR_MINERAL = 0.90, 0.05, 14
px_km2 = (meta['m_por_px'] / 1000) ** 2

def a_lonlat(f, c):   # fila/columna (centro de píxel, contorno en coordenadas de borde) -> lon, lat planetocéntrica
    return round(lon0 + (c + 0.5) * d, 5), round(latN - (f + 0.5) * d, 5)

def pix_de(lon, lat):
    return int((latN - lat) / d), int((lon - lon0) / d)

manchas = []
for clave, mid, nombre, color, campo, unidades in MIN:
    k = meta['claves'].index(clave)
    b = img[k * Hc:(k + 1) * Hc, :W].astype(np.float32)
    val = b < 255
    p = np.where(val, b / 254.0, 0)
    p = ndimage.median_filter(p, 3)
    m = (p >= UMBRAL) & val
    m = ndimage.binary_opening(m, iterations=1); m = ndimage.binary_closing(m, iterations=2)
    lab, n = ndimage.label(m)
    tam = ndimage.sum(m, lab, range(1, n + 1))
    orden = [i + 1 for i in np.argsort(-tam) if tam[i] * px_km2 >= MIN_KM2][:MAX_POR_MINERAL]
    for j, L in enumerate(orden):
        mk = lab == L
        cont = measure.find_contours(np.pad(mk, 1).astype(float), 0.5)
        cont = max(cont, key=len) - 1
        cont = measure.approximate_polygon(cont, tolerance=0.8)
        anillo = [a_lonlat(f, c) for f, c in cont]
        if anillo[0] != anillo[-1]: anillo.append(anillo[0])
        dentro = []
        for q in bib:
            f, c = pix_de(float(q['lon']), float(q['lat']))
            if 0 <= f < Hc and 0 <= c < W and mk[f, c]:
                ch = chem.get(q['nombre'], {})
                dentro.append(dict(n=int(q['n']), nombre=q['nombre'], zona=q['zona'], valor=ch.get(campo) if campo else None))
        unidad, refs = None, [CRISM]
        for q in dentro:
            if q['zona'] in unidades: unidad, extra = unidades[q['zona']]; refs = [CRISM] + extra; break
        if dentro and campo: refs = refs + [CHEMIN]
        manchas.append(dict(id=f'{mid}_{j + 1}', mineral=mid, nombre=nombre, color=color, indicador=clave,
                            area_km2=round(float(mk.sum()) * px_km2, 2), senal=round(float(p[mk].mean()) * 100),
                            unidad=unidad, pozos=dentro, campo_chemin=campo, refs=refs, anillo=anillo))
    print(nombre, n, 'manchas ->', sum(1 for x in manchas if x['mineral'] == mid))

sal = dict(fuente='Contornos: cálculo propio sobre los mosaicos CRISM del cráter Gale (NASA/JHU-APL, Seelos et al. 2012), '
                  'percentil >= 90 de cada indicador dentro de la franja de Curiosity, 24 m por píxel. Pozos: CheMin (NASA PDS).',
           umbral_percentil=90, manchas=manchas)
json.dump(sal, open(os.path.join(AQUI, 'capas', 'minerales', 'manchas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('total', len(manchas), 'con unidad', sum(1 for x in manchas if x['unidad']), 'con pozos', sum(1 for x in manchas if x['pozos']))

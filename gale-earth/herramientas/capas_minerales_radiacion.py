"""Capas de Gale Earth: minerales vistos desde órbita (CRISM) y radiación de día y de noche.

1) Minerales (capas/minerales/): a partir de data/mineralogia/crism_contexto.png del repo (preparado por David desde
   los mosaicos CRISM GMWG 2012, Seelos et al., JHU/APL; percentil de cada indicador dentro del área de la travesía,
   píxel de 24 m). Se pinta cada indicador con un color: transparente bajo el percentil 50 y cada vez más opaco hasta
   el 100. Es una señal RELATIVA dentro del área, no una abundancia.
2) Radiación (capas/gale_5m/dosis_dia.png y dosis_noche.png): dosis equivalente en la superficie
       0,64 mSv/día (RAD, Hassler et al. 2014) × (1 ± 0,025) × (1 − 0,25 × cielo tapado)
   - ±2,5 %: RAD mide ~5 % de pico a pico entre el día y la noche, más dosis de día (menos presión) y menos de noche
     (Rafkin et al. 2014, JGR Planets 119:1345; Guo et al. 2015, ApJ 810:24). Se usa el valor medio de cada mitad del sol.
   - cielo tapado: cálculo propio (16 direcciones, 400 m) sobre el DEM USGS de 1 m llevado a 20 m; 0,25 = factor del
     equipo calibrado en Murray Buttes (data/parametros.json).
Uso: python capas_minerales_radiacion.py RUTA/msl_5m RUTA/data/mineralogia   (o: ... x y --solo-pozos)
3) Resumen de CheMin por pozo (capas/minerales/pozos_chemin.json) para pintar los pozos por mineral.
"""
import os, sys, json, math
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zona_expedicion import cielo_tapado

R = 3396190.0; A = 3396190.0; B = 3376200.0
geod = lambda latc: math.degrees(math.atan(math.tan(math.radians(latc)) * (A * A) / (B * B)))

MINERALES = [   # clave en crism_contexto, archivo, nombre, color
    ('ALT.D2300', 'arcillas', 'Arcillas de Fe/Mg (D2300)', (64, 196, 255)),
    ('HYD.SINDEX2', 'sulfatos', 'Sulfatos hidratados (SINDEX2)', (255, 214, 64)),
    ('HYD.BD1900_2', 'agua', 'Agua en minerales (BD1900)', (120, 255, 200)),
    ('FM2.BD920', 'hematita', 'Óxidos férricos / hematita (BD920)', (255, 80, 60)),
    ('MAF.OLINDEX3', 'olivino', 'Olivino (OLINDEX3)', (150, 255, 90)),
    ('MAF.HCPINDEX2', 'piroxeno', 'Piroxeno alto en Ca (HCPINDEX2)', (200, 120, 255)),
]


def minerales(dir_min):
    meta = json.load(open(os.path.join(dir_min, 'crism_contexto.json'), encoding='utf-8'))
    im = np.array(Image.open(os.path.join(dir_min, 'crism_contexto.png')))
    if im.ndim == 3: im = im[..., 0]
    W, Hc = meta['ancho'], meta['alto_cada']
    gpp = meta['m_por_px'] / (R * math.pi / 180)
    sal = os.path.join(AQUI, 'capas', 'minerales'); os.makedirs(sal, exist_ok=True)
    capas = []
    for clave, arch, nombre, col in MINERALES:
        k = meta['claves'].index(clave); v = im[k * Hc:(k + 1) * Hc, :W].astype(np.float32)
        pct = np.where(v == 255, np.nan, v / 254 * 100)
        a = np.clip((pct - 50) / 50, 0, 1); a = np.where(np.isnan(a), 0, a) ** 1.3 * 235
        rgba = np.zeros((Hc, W, 4), np.uint8); rgba[..., 0], rgba[..., 1], rgba[..., 2] = col; rgba[..., 3] = a.astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(sal, arch + '.png'), optimize=True)
        capas.append(dict(id=arch, nombre=nombre, indicador=clave, color='#%02x%02x%02x' % col))
    lat_n, lon_o = meta['lat_norte'], meta['lon_oeste']; lat_s = lat_n - Hc * gpp; lon_e = lon_o + W * gpp
    out = dict(capas=capas, rect_geodetico=[lon_o, geod(lat_s), lon_e, geod(lat_n)], m_por_px=meta['m_por_px'],
               fuente='CRISM (Mars Reconnaissance Orbiter, NASA/JHU-APL): mosaicos GMWG del cráter Gale, versión 2012 (Seelos, Seelos, Viviano y Murchie). Recorte y percentiles: data/mineralogia/crism_contexto (equipo).',
               enlace='https://crism.jhuapl.edu/msl_landing_sites/',
               como='Percentil de cada indicador dentro del área de la travesía (24 m por píxel). Transparente bajo el percentil 50; más opaco = señal más fuerte. Es una señal relativa, no una abundancia: puede haber costuras, polvo o bruma.')
    json.dump(out, open(os.path.join(sal, 'minerales.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('minerales:', [c['id'] for c in capas])


def paleta(t):  # azul (menos dosis) → amarillo → rojo (más dosis)
    pts = np.array([[40, 90, 200], [80, 170, 230], [250, 220, 90], [240, 120, 50], [200, 30, 40]], np.float32)
    x = np.clip(t, 0, 1) * (len(pts) - 1); i = np.clip(np.floor(x).astype(int), 0, len(pts) - 2); f = (x - i)[..., None]
    return (pts[i] * (1 - f) + pts[i + 1] * f).astype(np.uint8)


def radiacion(base5m):
    m5 = json.load(open(os.path.join(AQUI, 'capas', 'gale_5m', 'capas.json'), encoding='utf-8'))
    z5 = np.load(base5m + '.npy', mmap_mode='r'); x0, y0, dx, dy = map(float, open(base5m + '.txt').read().split())
    cp = m5['caja_planetocentrica']
    c0 = int(round((cp['lon_oeste'] - x0) / dx)); f0 = int(round((cp['lat_norte'] - y0) / dy))
    K = 4; H = cp['alto'] // K; W = cp['ancho'] // K
    sub = np.asarray(z5[f0:f0 + H * K, c0:c0 + W * K], np.float32)
    z20 = np.nanmean(sub.reshape(H, K, W, K), axis=(1, 3)); val = np.isfinite(z20)
    cielo = cielo_tapado(np.where(val, z20, np.nanmean(z20)).astype(np.float32), 20.0)
    D0, AMP, BL = 0.64, 0.025, 0.25
    dia = D0 * (1 + AMP) * (1 - BL * cielo); noche = D0 * (1 - AMP) * (1 - BL * cielo)
    lo, hi = float(np.nanmin(noche[val])), float(np.nanmax(dia[val]))
    for nombre, d in (('dosis_dia', dia), ('dosis_noche', noche)):
        rgb = paleta((d - lo) / (hi - lo)); a = np.where(val, 255, 0).astype(np.uint8)
        Image.fromarray(np.dstack([rgb, a]), 'RGBA').save(os.path.join(AQUI, 'capas', 'gale_5m', nombre + '.png'), optimize=True)
    m5['radiacion'] = dict(min=round(lo, 3), max=round(hi, 3), unidad='mSv/día',
        dia_media=round(float(np.nanmean(dia[val])), 3), noche_media=round(float(np.nanmean(noche[val])), 3),
        formula='0,64 mSv/día (RAD) × (1 ± 0,025 día/noche) × (1 − 0,25 × cielo tapado)',
        fuentes=['Hassler et al. 2014, Science 343:1244797 (RAD, 0,64 mSv/día)',
                 'Rafkin et al. 2014, JGR Planets 119:1345 (variación día/noche ~5 % de pico a pico, más dosis de día)',
                 'Guo et al. 2015, ApJ 810:24 (≈15 µGy/día de pico a pico sobre ~220)'])
    m5['parametros']['dosis_superficie'] = D0
    json.dump(m5, open(os.path.join(AQUI, 'capas', 'gale_5m', 'capas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('radiación:', m5['radiacion'])




SULFATOS = ('anhidrita', 'basanita', 'yeso', 'jarosita', 'natrojarosita', 'kieserita', 'starkeyita', 'sulfato de Mg·4H2O')


def pozos_chemin():
    """Resumen de CheMin por pozo (para pintar los pozos): arcillas y amorfo (% de la roca), sulfatos y hematita (% de la
    fracción cristalina). Promedio de las mediciones publicadas de cada pozo. Fuente: datos/biblioteca.json."""
    b = json.load(open(os.path.join(AQUI, 'datos', 'biblioteca.json'), encoding='utf-8'))
    out = {}
    for p in b['pozos']:
        ch = p.get('chemin') or []
        if not ch: continue
        med = lambda xs: round(sum(xs) / len(xs), 1) if xs else None
        out[p['nombre']] = dict(
            arcillas=med([c['arcillas'] for c in ch if c.get('arcillas') is not None]),
            amorfo=med([c['amorfo'] for c in ch if c.get('amorfo') is not None]),
            sulfatos=med([sum(m[1] for m in c['minerales'] if m[0] in SULFATOS) for c in ch]),
            hematita=med([sum(m[1] for m in c['minerales'] if m[0] == 'hematita') for c in ch]),
            n=len(ch))
    json.dump(dict(pozos=out, fuente='CheMin (NASA PDS Geosciences) y base de mineralogía y geoquímica del cráter Gale (NASA, equipo CheMin; Bristow y Lafuente, doi:10.48484/JN48-YW52). Promedio de las mediciones de cada pozo.',
                   unidades='arcillas y amorfo: % de la roca; sulfatos y hematita: % de la fracción cristalina'),
              open(os.path.join(AQUI, 'capas', 'minerales', 'pozos_chemin.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('pozos con CheMin:', len(out))


if __name__ == '__main__':
    if '--solo-pozos' not in sys.argv: minerales(sys.argv[2]); radiacion(sys.argv[1])
    pozos_chemin()

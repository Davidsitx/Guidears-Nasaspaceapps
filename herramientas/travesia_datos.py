"""Recorrido completo de Curiosity y sus perforaciones, listos para la escena y para el mapa.

Uso: python herramientas/travesia_datos.py <carpeta con rec.geojson y poz.geojson>
  (salen del GeoPackage del equipo:  ogr2ogr -f GeoJSON rec.geojson curiosity_recorrido_y_pozos.gpkg recorrido
                                     ogr2ogr -f GeoJSON poz.geojson curiosity_recorrido_y_pozos.gpkg perforaciones)
Correr antes herramientas/travesia.py (deja el cielo tapado y la pendiente de 4 m en /tmp).
Escribe data/curiosity/recorrido_completo.geojson y data/curiosity/perforaciones.geojson.
El sol de cada punto del recorrido es APROXIMADO: se interpola por distancia entre anclas de sol conocido
(aterrizaje, las 49 perforaciones, los cortes cada 500 soles de PLACES y la posición de hoy).
"""
import json, math, os, sys
import numpy as np
R = 3396190.0; X0, Y0 = 8141100.0, -271600.0
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1].rstrip('/') + '/'
P = json.load(open(os.path.join(RAIZ, 'data/parametros.json')))
DOSIS, K = P['radiacion']['dosis_superficie_mSv_dia'], P['radiacion']['factor_blindaje_relieve']
ll = lambda x, y: (round(math.degrees(x / R), 7), round(math.degrees(y / R), 7))
xy = lambda lon, lat: (math.radians(lon) * R, math.radians(lat) * R)

# 1) recorrido: los 1319 tramos vienen encadenados en orden → una sola línea
pts = []
for f in json.load(open(SRC + 'rec.geojson'))['features']:
    for p in f['geometry']['coordinates']:
        if not pts or math.dist(pts[-1], p[:2]) > 0.05: pts.append(tuple(p[:2]))
pts = np.array(pts); seg = np.hypot(*np.diff(pts, axis=0).T); d = np.concatenate([[0], np.cumsum(seg)])
print('recorrido: %d puntos, %.2f km en planta' % (len(pts), d[-1] / 1000))

# 2) anclas de sol: se proyectan sobre la línea avanzando siempre hacia adelante (el rover vuelve a pasar por algunos lugares)
pozos = sorted((f['properties'] | {'xy': tuple(f['geometry']['coordinates'][:2])} for f in json.load(open(SRC + 'poz.geojson'))['features']), key=lambda p: p['sol'])
anclas = [(0, tuple(pts[0]), 'aterrizaje')] + [(p['sol'], p['xy'], p['nombre']) for p in pozos]
places = json.load(open(os.path.join(RAIZ, 'data/curiosity/recorrido_places_sol0-4868.geojson')))
for f in places['features']:
    s = int(f['properties']['sol_inicio'])
    if s > 0: anclas.append((s, xy(*f['geometry']['coordinates'][0]), 'PLACES sol %d' % s))
anclas.sort(key=lambda a: a[0])
idx_prev, A = 0, []
for sol, p, nombre in anclas:
    dist = np.hypot(pts[idx_prev:, 0] - p[0], pts[idx_prev:, 1] - p[1])
    cerca = np.flatnonzero(dist < 15)
    if len(cerca):                                   # primer paso por ahí después del ancla anterior
        fin = cerca[0]
        while fin + 1 < len(dist) and dist[fin + 1] < 15: fin += 1
        i = cerca[0] + int(np.argmin(dist[cerca[0]:fin + 1]))
    else: i = int(np.argmin(dist))
    A.append((sol, idx_prev + i, nombre, float(dist[i]))); idx_prev += i
lejos = [(n, round(e)) for s, i, n, e in A if e > 15]
print('anclas: %d; a más de 15 m de la línea: %s' % (len(A), lejos or 'ninguna'))
A.append((5073, len(pts) - 1, 'hoy', 0.0))
ad = np.array([d[i] for _, i, _, _ in A]) + np.arange(len(A)) * 1e-6; asol = np.array([s for s, _, _, _ in A], float)
sol = np.interp(d, ad, asol)

# 3) capas del modelo en cada punto (cielo tapado y pendiente a 4 m, de herramientas/travesia.py)
cielo, pend, z = np.load('/tmp/trav_cielo4.npy'), np.load('/tmp/trav_pend4.npy'), np.load('/tmp/trav_z4.npy')
def en(a, x, y): return float(a[min(a.shape[0] - 1, max(0, int((Y0 - y) / 4))), min(a.shape[1] - 1, max(0, int((x - X0) / 4)))])
cp = np.array([en(cielo, *p) for p in pts]); zp = np.array([en(z, *p) for p in pts])
largo3d = float(np.sum(np.hypot(seg, np.diff(zp))))
sube = float(np.clip(np.diff(zp), 0, None).sum())
# tiempo a pie por el mismo camino (Tobler, a la velocidad de data/parametros.json), con la elevación suavizada en 30 m
vcam = P['astronauta']['velocidad_llano_km_h']
zs = np.convolve(np.pad(zp, 3, mode='edge'), np.ones(7) / 7, 'valid'); pendiente = np.diff(zs) / np.maximum(seg, 0.5)
v_ms = vcam / 3.6 * np.exp(-3.5 * np.abs(pendiente + 0.05)) / math.exp(-0.175)
horas_a_pie = float(np.sum(seg / v_ms) / 3600); print('a pie: %.1f h de marcha (%.1f km/h en llano)' % (horas_a_pie, vcam))
json.dump({'type': 'FeatureCollection', 'name': 'recorrido_completo', 'features': [{'type': 'Feature',
    'geometry': {'type': 'LineString', 'coordinates': [list(ll(*p)) for p in pts]},
    'properties': {'nombre': 'Recorrido real de Curiosity, del aterrizaje (agosto de 2012) al sol 5073',
        'largo_planta_km': round(d[-1] / 1000, 2), 'largo_3d_km': round(largo3d / 1000, 2), 'horas_a_pie': round(horas_a_pie, 1), 'desnivel_m': round(float(zp[-1] - zp[0])),
        'sol_aprox': [int(round(s)) for s in sol], 'cielo_tapado_pct': [int(round(c * 100)) for c in cp], 'elevacion_m': [round(float(v), 1) for v in zp],
        'nota_sol': 'Sol aproximado: interpolado por distancia entre anclas (aterrizaje, 49 perforaciones, cortes de PLACES cada 500 soles, hoy).',
        'fuente': 'GeoPackage del equipo (curiosity_recorrido_y_pozos.gpkg, 14/11): recorrido oficial de NASA/JPL. Origen exacto de la descarga: a confirmar por el equipo. El odómetro oficial marca 38,29 km al sol 5070 (incluye maniobras que la línea no detalla).'}}]},
    open(os.path.join(RAIZ, 'data/curiosity/recorrido_completo.geojson'), 'w'), ensure_ascii=False)
print('largo 3D %.2f km, desnivel %d m' % (largo3d / 1000, zp[-1] - zp[0]))
# tramo real más protegido y más expuesto (ventana de 50 m)
v = np.convolve(cp, np.ones(9) / 9, 'same'); i = int(np.argmax(v)); print('máximo cielo tapado en el recorrido: %.0f%% cerca del sol %d' % (100 * v[i], sol[i]), ll(*pts[i]))
print('cielo tapado en el recorrido: media %.1f%%, p90 %.1f%%' % (100 * cp.mean(), 100 * np.percentile(cp, 90)))

# 4) perforaciones con hallazgos y valores del modelo
H = json.load(open(os.path.join(RAIZ, 'data/curiosity/perforaciones_hallazgos.json')))
camp = {n: c for c in H['campanas'] for n in c['pozos']}
feats = []
for p in pozos:
    h = H['pozos'][str(p['pozo'])]; c = en(cielo, *p['xy']); lon, lat = ll(*p['xy'])
    feats.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lon, lat]}, 'properties': {
        'pozo': p['pozo'], 'nombre': p['nombre'], 'sol': p['sol'], 'elevacion_m': round(p['altura_m'], 1),
        'campana': camp[p['pozo']]['nombre'], 'campana_id': camp[p['pozo']]['id'], 'idea_campana': camp[p['pozo']]['idea'],
        'unidad': h['unidad'], 'hallazgo': h['hallazgo'], 'fuente': h['fuente'], 'verificado': h['verificado'],
        'cielo_tapado_pct': round(c * 100, 1), 'pendiente': round(en(pend, *p['xy']), 1), 'dosis_uSv_h': round(DOSIS / 24 * 1000 * (1 - K * c), 2)}})
json.dump({'type': 'FeatureCollection', 'name': 'perforaciones', 'nota': H['_nota'] + ' Posición, sol y altura: GeoPackage del equipo. Cielo tapado, pendiente y dosis: cálculo propio sobre el DEM de 4 m.', 'features': feats},
    open(os.path.join(RAIZ, 'data/curiosity/perforaciones.geojson'), 'w'), indent=1, ensure_ascii=False)
top = sorted(feats, key=lambda f: -f['properties']['cielo_tapado_pct'])[:5]
print('pozos más protegidos:', [(f['properties']['nombre'], f['properties']['cielo_tapado_pct']) for f in top])

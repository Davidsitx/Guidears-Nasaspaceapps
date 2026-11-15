"""Ruta T: el PMR (rover presurizado) sale del lado del garaje de la Base Gale (Zona 2) y va hasta la zona de hoy (salida S, donde está Curiosity).

Qué hace (cálculo propio sobre datos con fuente):
1. Lee el terreno de contexto (data/terreno/travesia_sur: elevación, pendiente y cielo tapado a 12 m) y el color a 3 m.
2. Marca arena probable (tono azulado, como en capas_peligro.py y expedicion.py) y terreno prohibido (pendiente > límite del rover).
3. Busca el camino con A* (8 vecinos). Costo por metro: 1 + (pendiente / 10)² y +6 en arena probable.
4. Lo suaviza tirando rectas largas que no pasen por celdas prohibidas ni por arena, y lo remuestrea cada 5 m.
5. Para cada punto calcula elevación, pendiente de marcha, cielo tapado, tiempo a la velocidad del PMR y energía de la batería:
   (manejo + cabina) / velocidad · distancia  +  masa · g · subida / eficiencia   (parámetros en data/parametros.json, vehiculo_tripulado).

Uso:  /usr/bin/python3.12 herramientas/ruta_base.py            (lee y actualiza maps-in-mars/datos/mision.json)
Salida: data/rutas/ruta_base_pmr.geojson y la ruta "T" dentro de maps-in-mars/datos/mision.json.
exportar_mision.py lo llama solo al final, así que normalmente no hace falta correrlo aparte.
"""
import json, math, os, heapq
import numpy as np
from PIL import Image

R = 3396190.0
G_MARTE = 3.711
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTXD = os.path.join(RAIZ, 'data/terreno/travesia_sur')
MISION = os.path.join(RAIZ, 'maps-in-mars/datos/mision.json')
SALIDA = os.path.join(RAIZ, 'data/rutas/ruta_base_pmr.geojson')


def cargar_terreno():
    M = json.load(open(os.path.join(CTXD, 'meta.json')))
    W, H, CS = M['dem']['ancho'], M['dem']['alto'], M['dem']['m_por_px']
    rg = np.asarray(Image.open(os.path.join(CTXD, M['dem']['archivo'])).convert('RGB')).astype(np.int64)
    DEM = M['dem']['zmin'] + (rg[..., 0] * 256 + rg[..., 1]) * M['dem']['escala_m']
    PEND = np.asarray(Image.open(os.path.join(CTXD, 'pend_12m.png')).convert('L')).astype(float) / 4
    CIELO = np.asarray(Image.open(os.path.join(CTXD, 'cielo_12m.png')).convert('L')).astype(float) / 255
    col = np.concatenate([np.asarray(Image.open(os.path.join(CTXD, n)).convert('RGB')).astype(float) for n in M['color']['archivos']], axis=0)
    col = col[:H * 4, :W * 4].reshape(H, 4, W, 4, 3).mean(axis=(1, 3))
    AZUL = (col[..., 2] - col[..., 0]) / np.maximum(1, col[..., 2] + col[..., 0])
    ARENA = (AZUL > -0.06) & (PEND < 15)
    return dict(M=M, W=W, H=H, CS=CS, DEM=DEM, PEND=PEND, CIELO=CIELO, ARENA=ARENA)


def calcular(T, ini_ll, fin_ll, par):
    W, H, CS, M = T['W'], T['H'], T['CS'], T['M']
    DEM, PEND, CIELO, ARENA = T['DEM'], T['PEND'], T['CIELO'], T['ARENA']
    latN, lonW = M['lat_norte'], M['lon_oeste']
    a_celda = lambda lon, lat: (math.radians(lon - lonW) * R / CS - 0.5, math.radians(latN - lat) * R / CS - 0.5)
    a_ll = lambda c, f: (lonW + math.degrees((c + .5) * CS / R), latN - math.degrees((f + .5) * CS / R))
    lim = par['pendiente_max_deg']
    costo = np.where(PEND > lim, np.inf, 1 + (PEND / 10) ** 2 + np.where(ARENA, 6, 0))

    def celda(ll):
        c, f = a_celda(*ll)
        c, f = int(round(c)), int(round(f))
        assert 0 <= c < W and 0 <= f < H, f'fuera del terreno de contexto: {ll}'
        if not np.isfinite(costo[f, c]):                      # si cae en una celda prohibida, la habilitada más cercana
            ys, xs = np.where(np.isfinite(costo)); k = np.argmin((xs - c) ** 2 + (ys - f) ** 2); c, f = int(xs[k]), int(ys[k])
        return c, f
    (c0, f0), (c1, f1) = celda(ini_ll), celda(fin_ll)
    g = np.full((H, W), np.inf); g[f0, c0] = 0; prev = {}
    pq = [(0.0, c0, f0)]; cerrado = np.zeros((H, W), bool)
    vec = [(dc, df, math.hypot(dc, df) * CS) for dc in (-1, 0, 1) for df in (-1, 0, 1) if dc or df]
    while pq:
        _, c, f = heapq.heappop(pq)
        if cerrado[f, c]: continue
        cerrado[f, c] = True
        if (c, f) == (c1, f1): break
        gc = g[f, c]
        for dc, df, d in vec:
            n0, n1 = c + dc, f + df
            if not (0 <= n0 < W and 0 <= n1 < H) or cerrado[n1, n0]: continue
            k = costo[n1, n0]
            if not np.isfinite(k): continue
            ng = gc + d * (k + costo[f, c]) / 2
            if ng < g[n1, n0]:
                g[n1, n0] = ng; prev[(n0, n1)] = (c, f)
                heapq.heappush(pq, (ng + math.hypot(n0 - c1, n1 - f1) * CS, n0, n1))
    camino = [(c1, f1)]
    while camino[-1] != (c0, f0): camino.append(prev[camino[-1]])
    camino = camino[::-1]

    # suavizado: rectas lo más largas posible (hasta 240 m) que no toquen celdas prohibidas ni arena y no suban más que el límite
    def libre(a, b):
        n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
        for i in range(n + 1):
            u = i / n; c, f = int(round(a[0] + (b[0] - a[0]) * u)), int(round(a[1] + (b[1] - a[1]) * u))
            if not np.isfinite(costo[f, c]) or (ARENA[f, c] and not ARENA[a[1], a[0]]): return False
        return True
    liso = [camino[0]]; i = 0
    while i < len(camino) - 1:
        j = min(len(camino) - 1, i + 20)
        while j > i + 1 and not libre(camino[i], camino[j]): j -= 1
        liso.append(camino[j]); i = j

    def interp(A, c, f):                                     # bilineal en la grilla (c, f en celdas)
        c = min(max(c, 0), W - 1.001); f = min(max(f, 0), H - 1.001); c0_, f0_ = int(c), int(f); u, v = c - c0_, f - f0_
        return (A[f0_, c0_] * (1 - u) * (1 - v) + A[f0_, c0_ + 1] * u * (1 - v) + A[f0_ + 1, c0_] * (1 - u) * v + A[f0_ + 1, c0_ + 1] * u * v)
    # remuestreo cada 5 m sobre la poligonal suavizada (con el primer y el último punto exactos: garaje y salida)
    ci, fi = a_celda(*ini_ll); cf, ff = a_celda(*fin_ll)
    poli = [(ci, fi)] + [(float(c), float(f)) for c, f in liso[1:-1]] + [(cf, ff)]
    paso = 5.0 / CS; pts = [poli[0]]
    for a, b in zip(poli, poli[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(L / paso))
        for k in range(1, n + 1): pts.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    elev = [interp(DEM, c, f) for c, f in pts]
    d = [0.0]
    for (a, b) in zip(pts, pts[1:]): d.append(d[-1] + math.hypot(b[0] - a[0], b[1] - a[1]) * CS)
    v = par['velocidad_km_h'] * 1000                        # m/h
    e_km = (par['potencia_manejo_kW'] + par['potencia_cabina_kW']) / par['velocidad_km_h']    # kWh por km en llano
    e_m = par['masa_kg'] * G_MARTE / par['eficiencia_motores'] / 3.6e6                       # kWh por metro de subida
    out = []; sube = baja = 0.0; kwh = 0.0; pmax = 0.0; cielos = []; arena = 0
    for i, (c, f) in enumerate(pts):
        if i:
            dz = elev[i] - elev[i - 1]; sube += max(0, dz); baja += max(0, -dz)
            kwh += e_km * (d[i] - d[i - 1]) / 1000 + e_m * max(0, dz)
        j0, j1 = max(0, i - 2), min(len(pts) - 1, i + 2)
        marcha = math.degrees(math.atan2(elev[j1] - elev[j0], max(1e-6, d[j1] - d[j0])))
        pmax = max(pmax, abs(marcha))
        terr = float(PEND[int(round(min(max(f, 0), H - 1))), int(round(min(max(c, 0), W - 1)))])
        ce = float(interp(CIELO, c, f)); cielos.append(ce)
        arena += int(ARENA[int(round(min(max(f, 0), H - 1))), int(round(min(max(c, 0), W - 1)))])
        lon, lat = lonW + math.degrees((c + .5) * CS / R), latN - math.degrees((f + .5) * CS / R)
        out.append([round(lon, 7), round(lat, 7), round(d[i], 1), round(float(elev[i]), 1), round(abs(marcha), 1), round(terr, 1), round(ce, 2),
                    round(d[i] / v, 4), 0, 0, -1, round(kwh, 2)])
    largo = d[-1]; largo3d = sum(math.hypot(d[i] - d[i - 1], elev[i] - elev[i - 1]) for i in range(1, len(d)))
    return dict(id='T', nombre='T · PMR de la Base Gale a la zona de hoy', tipo='tripulado', color='#b06bff',
                largo=round(largo, 1), largo3d=round(largo3d, 1), horas=round(largo / v, 3), dosis=0, sube=round(sube, 1), baja=round(baja, 1),
                maxMarcha=round(pmax, 1), lim=lim, idaVuelta=False, cieloMedio=round(float(np.mean(cielos)), 2), paradas=[], pts=out,
                kwh=round(kwh, 1), celdasArena=arena, desdeBase=True,
                metodo='A* sobre el terreno de contexto de 12 m (pendiente ≤ límite, arena probable penalizada), suavizado y remuestreado cada 5 m; energía = (manejo + cabina)/velocidad·distancia + masa·g·subida/eficiencia. Cálculo propio.')


def main():
    P = json.load(open(os.path.join(RAIZ, 'data/parametros.json'), encoding='utf-8'))
    par = P['vehiculo_tripulado']
    D = json.load(open(MISION, encoding='utf-8'))
    gx = D.get('pmr') or {}
    ini = (gx['lon'], gx['lat']) if 'lon' in gx else (D['base']['lon'], D['base']['lat'])
    fin = (D['curiosity']['lon'], D['curiosity']['lat'])
    T = cargar_terreno()
    r = calcular(T, ini, fin, par)
    D['rutas'] = [x for x in D['rutas'] if x['id'] != 'T'] + [r]
    json.dump(D, open(MISION, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    props = {k: v for k, v in r.items() if k != 'pts'}
    props['fuente'] = 'Terreno: data/terreno/travesia_sur (equipo, 14/11; coincide con el DEM USGS de Gale). Parámetros del PMR: data/parametros.json (vehiculo_tripulado), supuestos con fuente (SEV de NASA y rover presurizado del Mars Architecture Team).'
    gj = dict(type='FeatureCollection', features=[dict(type='Feature', properties=props,
              geometry=dict(type='LineString', coordinates=[[p[0], p[1], p[3]] for p in r['pts']]))])
    json.dump(gj, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"Ruta T: {r['largo'] / 1000:.2f} km, sube {r['sube']:.0f} m, baja {r['baja']:.0f} m, pendiente de marcha máx {r['maxMarcha']}°, "
          f"{r['horas'] * 60:.0f} min a {par['velocidad_km_h']} km/h, {r['kwh']} kWh ({r['kwh'] / par['bateria_kWh'] * 100:.0f} % de la batería), "
          f"{r['celdasArena']} puntos sobre arena probable")


if __name__ == '__main__':
    main()

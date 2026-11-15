"""Análisis trabajados para la Wiki (datos/analisis.json) y lista de fuentes consultadas (datos/fuentes_consultadas.json).

Todo sale de datos medidos que ya están en datos/biblioteca.json (CheMin, APXS y SAM del PDS de NASA y de la base ODR del
cráter Gale) y de los registros de fuentes del equipo (docs/fuentes.md y docs/fuentes-enlaces.md). Los resultados son cálculos
propios: umbrales y criterios están escritos en cada sección para que se puedan revisar.

Uso: python herramientas/analisis_wiki.py   (desde la carpeta maps-in-mars)
"""
import json, os, re, statistics as st

AQUI = os.path.dirname(os.path.abspath(__file__))
MM = os.path.dirname(AQUI); RAIZ = os.path.dirname(MM)
B = json.load(open(os.path.join(MM, 'datos/biblioteca.json'), encoding='utf-8'))
P = B['pozos']
ACIDOS = ('SO2', 'HCl', 'H2S')


def sam_ok(p):
    """Experimentos SAM de este pozo que se pueden usar: confirmados (ODR o designación de PDS)."""
    return [x for x in p['sam'] if x['estado'] == 'confirmado']


def picos(p, gas):
    out = []
    for x in sam_ok(p):
        if gas in x.get('dudoso', []): continue
        out += x.get('picos', {}).get(gas, [])
    return sorted(out)


def maximo(p, gas):
    v = [x['gases'].get(gas) for x in sam_ok(p) if gas not in x.get('dudoso', []) and x['gases'].get(gas) is not None]
    return max(v) if v else None


def rango(vals):
    """Rango de Spearman (sin dependencias)."""
    orden = sorted(range(len(vals)), key=lambda i: vals[i]); r = [0] * len(vals)
    i = 0
    while i < len(orden):
        j = i
        while j + 1 < len(orden) and vals[orden[j + 1]] == vals[orden[i]]: j += 1
        for k in range(i, j + 1): r[orden[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    rx, ry = rango(x), rango(y); n = len(x)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else 0


fila = lambda p: {'n': p['n'], 'nombre': p['nombre'], 'sol': p['sol'], 'elev': p['elev'], 'zona': p['zona']}

# 1 y 2. Agua que sale a baja temperatura y "ventana" antes de los gases ácidos
agua = []
for p in P:
    h = picos(p, 'H2O')
    if not h: continue
    ac = sorted(t for g in ACIDOS for t in picos(p, g))
    agua.append({**fila(p), 'h2o_primer_pico_C': h[0], 'h2o_mol_max': maximo(p, 'H2O'), 'acido_primer_pico_C': ac[0] if ac else None,
                 'margen_C': (ac[0] - h[0]) if ac else None, 'baja_T': h[0] < 300})
agua.sort(key=lambda r: r['h2o_primer_pico_C'])

# 3. Oxígeno junto con HCl en el mismo experimento (firma de oxicloros, como percloratos)
oxi = []
for p in P:
    for x in sam_ok(p):
        g = x['gases']
        if g.get('O2') and g.get('HCl') and 'HCl' not in x.get('dudoso', []):
            oxi.append({**fila(p), 'exp': x['eid'], 'o2_mol': g['O2'], 'o2_picos_C': x['picos'].get('O2', []), 'hcl_picos_C': x['picos'].get('HCl', [])})
# 4. NO (de nitratos), sin los valores marcados como dudosos
nitro = []
for p in P:
    v = maximo(p, 'NO')
    if v: nitro.append({**fila(p), 'no_mol_max': v})
nitro.sort(key=lambda r: -r['no_mol_max'])

# 5. Elementos traza y nutrientes (APXS de la muestra del pozo)
def apxs_val(p, k):
    a = p.get('apxs') or {}
    if k in (a.get('ox') or {}): return a['ox'][k][0], '%'
    if k in (a.get('tr') or {}): return a['tr'][k][0], 'ppm'
    return None, None
trazas = {}
for k in ('MnO', 'P2O5', 'Zn', 'Ni', 'Cl', 'SO3'):
    vals = [(apxs_val(p, k)[0], p) for p in P if apxs_val(p, k)[0] is not None]
    if not vals: continue
    med = st.median(v for v, _ in vals); unidad = apxs_val(vals[0][1], k)[1]
    top = sorted(vals, key=lambda t: -t[0])[:4]
    trazas[k] = {'unidad': unidad, 'mediana': med, 'n': len(vals), 'top': [{**fila(p), 'valor': v, 'veces_mediana': v / med if med else None} for v, p in top]}

# 6. Perfil a lo largo del recorrido: arcillas, amorfo, SO3 y agua cristalina contra la altura
perfil = []
for p in P:
    ch = p['chemin'][0] if p['chemin'] else None
    so3 = apxs_val(p, 'SO3')[0]
    perfil.append({**fila(p), 'arcillas': ch.get('arcillas') if ch else None, 'amorfo': ch.get('amorfo') if ch else None, 'so3': so3, 'agua_kg_t': p.get('agua_kg_t'),
                   'hematita': next((m[1] for m in (ch['minerales'] if ch else []) if m[0].startswith('hematita')), None) if ch else None})
def corr(campo):
    pares = [(r['elev'], r[campo]) for r in perfil if r[campo] is not None and r['elev'] is not None]
    return {'n': len(pares), 'rho': round(spearman([a for a, _ in pares], [b for _, b in pares]), 2)} if len(pares) > 5 else None
tendencias = {k: corr(k) for k in ('arcillas', 'so3', 'amorfo', 'agua_kg_t')}

# 7. Pozos que cumplen a la vez: agua que sale antes de 300 °C, ningún gas ácido antes de 450 °C y arcillas ≥ 15 %
arc = {r['n']: r['arcillas'] for r in perfil}
candidatos = [r for r in agua if r['baja_T'] and (r['acido_primer_pico_C'] is None or r['acido_primer_pico_C'] >= 450) and (arc.get(r['n']) or 0) >= 15]

# 8. Calidad
dudosos = [{**fila(p), 'exp': x['eid'], 'gases': x['dudoso']} for p in P for x in p['sam'] if x.get('dudoso')]
sin_lab = [fila(p) for p in P if not p['chemin'] and not p['apxs']]

res = {
    'version': '2026-11-15', 'pozos': len(P),
    'agua': agua, 'agua_resumen': {'con_datos': len(agua), 'baja_T': sum(r['baja_T'] for r in agua),
                                   'margen_mediana_C': st.median([r['margen_C'] for r in agua if r['margen_C'] is not None])},
    'oxicloros': oxi, 'nitratos': nitro, 'trazas': trazas, 'perfil': perfil, 'tendencias': tendencias,
    'candidatos': candidatos, 'dudosos': dudosos, 'sin_laboratorio': sin_lab,
    'criterios': {'baja_T_C': 300, 'acido_min_C': 450, 'arcillas_min_pct': 15, 'sam': 'solo experimentos confirmados (ODR o designación de PDS); valores marcados como dudosos, excluidos'},
}
json.dump(res, open(os.path.join(MM, 'datos/analisis.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# Fuentes consultadas: todas las URL de los registros del equipo, con lo que se tomó de cada una
fuentes, vistas = [], set()
def agregar(url, que, de):
    url = url.strip().rstrip(').,;')
    if url in vistas or not url.startswith('http'): return
    vistas.add(url); dom = re.sub(r'^https?://(www\.)?', '', url).split('/')[0]
    fuentes.append({'url': url, 'dominio': dom, 'que': re.sub(r'\s+', ' ', re.sub(r'[`*]', '', que)).strip()[:400], 'registro': de})
for nombre in ('docs/fuentes-enlaces.md', 'docs/fuentes.md'):
    ruta = os.path.join(RAIZ, nombre)
    if not os.path.exists(ruta): continue
    for linea in open(ruta, encoding='utf-8'):
        urls = re.findall(r'https?://[^\s|)>\]]+', linea)
        if not urls: continue
        celdas = [c.strip() for c in linea.strip().strip('|').split('|')]
        texto = max((c for c in celdas if 'http' not in c), key=len, default='') if '|' in linea else re.sub(r'https?://\S+', '', linea).strip(' -:')
        for u in urls: agregar(u, texto, nombre)
json.dump({'fuentes': sorted(fuentes, key=lambda f: (f['dominio'], f['url']))}, open(os.path.join(MM, 'datos/fuentes_consultadas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f"analisis.json: {len(agua)} pozos con agua en SAM ({res['agua_resumen']['baja_T']} bajo 300 °C), {len(oxi)} experimentos con O2+HCl, "
      f"{len(nitro)} pozos con NO, {len(candidatos)} pozos candidatos; tendencias {tendencias}. fuentes_consultadas.json: {len(fuentes)} enlaces")

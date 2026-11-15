"""Una sola verdad para los 49 pozos de Curiosity en todo el proyecto.

Fuente única: gale-earth/datos/biblioteca.json (la Wiki de Gale Earth). Cada pozo tiene ahí su
hallazgo, su fuente y los datos medidos por CheMin, APXS y SAM. Los 49 hallazgos se verificaron
contra su artículo o página de NASA el 15/11/2026 (docs/notas.md).

Este script copia el hallazgo, la fuente y la marca de verificado a los otros archivos que los
repiten, para que la escena 3D clásica, la guía del PMR y la Wiki digan lo mismo:
  - data/curiosity/perforaciones_hallazgos.json  (unidad y campañas de David; el texto queda igual al de la Wiki)
  - data/curiosity/perforaciones.geojson         (escena 3D clásica; lo regenera travesia_datos.py con los datos pesados)
  - gale-earth/datos/entrada/perforaciones.geojson (pines del globo de Gale Earth y guía del PMR)

Uso:  python herramientas/unificar_pozos.py            (copia y avisa qué cambió)
      python herramientas/unificar_pozos.py --revisar  (solo revisa; sale con error si algo no coincide)
"""
import json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIB = os.path.join(RAIZ, 'gale-earth', 'datos', 'biblioteca.json')
HALL = os.path.join(RAIZ, 'data', 'curiosity', 'perforaciones_hallazgos.json')
ESC = os.path.join(RAIZ, 'data', 'curiosity', 'perforaciones.geojson')
GE = os.path.join(RAIZ, 'gale-earth', 'datos', 'entrada', 'perforaciones.geojson')
FECHA = '2026-11-15'


def leer(p):
    return json.load(open(p, encoding='utf-8'))


def escribir_hallazgos(D):
    c = lambda o: json.dumps(o, ensure_ascii=False)
    L = ['{', f' "_nota": {c(D["_nota"])},', ' "campanas": [']
    L += ['  ' + c(x) + (',' if i < len(D['campanas']) - 1 else '') for i, x in enumerate(D['campanas'])]
    L += [' ],', ' "pozos": {']
    ks = list(D['pozos'])
    L += [f'  {c(k)}: {c(D["pozos"][k])}' + (',' if i < len(ks) - 1 else '') for i, k in enumerate(ks)]
    L += [' }', '}']
    open(HALL, 'w', encoding='utf-8').write('\n'.join(L) + '\n')


def main():
    revisar = '--revisar' in sys.argv
    bib = {p['n']: p for p in leer(BIB)['pozos']}
    faltan = [n for n in range(1, 50) if n not in bib or not bib[n].get('hallazgo') or not bib[n].get('fuente_hallazgo')]
    if faltan:
        sys.exit(f'La Wiki no tiene hallazgo o fuente para los pozos {faltan}: no se copia nada.')
    cambios = []

    # 1) hallazgos de David: mismo texto y misma fuente que la Wiki; la unidad y las campañas quedan como estaban
    H = leer(HALL)
    for k, h in H['pozos'].items():
        b = bib[int(k)]
        nuevo = {'hallazgo': b['hallazgo'], 'fuente': b['fuente_hallazgo'], 'verificado': True,
                 'verificado_fecha': h.get('verificado_fecha') or FECHA}
        if any(h.get(x) != v for x, v in nuevo.items() if x != 'verificado_fecha'):
            cambios.append(f'perforaciones_hallazgos.json · pozo {k} ({b["nombre"]})')
            h.update(nuevo)
    H['_nota'] = ('Unidad y campaña de cada perforación de Curiosity. El hallazgo y la fuente son los de la Wiki de Gale Earth '
                  '(gale-earth/datos/biblioteca.json), la fuente única del proyecto; los copia herramientas/unificar_pozos.py. '
                  'Los 49 se verificaron contra su artículo o página de NASA el 15/11/2026. En todas las perforaciones el taladro '
                  'saca roca en polvo que analizan CheMin (minerales) y SAM (gases); fuente: NASA, PIA26403.')

    # 2) escena 3D clásica
    E = leer(ESC)
    for f in E['features']:
        pr = f['properties']; b = bib[pr['pozo']]
        nuevo = {'hallazgo': b['hallazgo'], 'fuente': b['fuente_hallazgo'], 'verificado': True}
        if any(pr.get(x) != v for x, v in nuevo.items()):
            cambios.append(f'escena 3D · pozo {pr["pozo"]} ({pr["nombre"]})')
            pr.update(nuevo)
    E['nota'] = H['_nota'] + ' Posición, sol y altura: GeoPackage del equipo. Cielo tapado, pendiente y dosis: cálculo propio sobre el DEM de 4 m.'

    # 3) pines del globo y guía del PMR
    G = leer(GE)
    for f in G['features']:
        pr = f['properties']; b = bib.get(pr.get('n'))
        if not b:
            continue
        for x in ('hallazgo', 'tecnico', 'fuente_hallazgo'):
            if pr.get(x) != b.get(x):
                cambios.append(f'gale-earth/entrada · pozo {pr["n"]} · {x}')
                pr[x] = b[x]

    if revisar:
        if cambios:
            sys.exit('No coinciden con la Wiki:\n  ' + '\n  '.join(cambios))
        print('Los 49 pozos dicen lo mismo en la Wiki, la escena 3D y el globo.')
        return
    escribir_hallazgos(H)
    json.dump(E, open(ESC, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    open(GE, 'w', encoding='utf-8').write(json.dumps(G, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(cambios)} cambios copiados desde la Wiki.' if cambios else 'Ya estaba todo igual.')
    for c in cambios[:60]:
        print('  ' + c)


if __name__ == '__main__':
    main()

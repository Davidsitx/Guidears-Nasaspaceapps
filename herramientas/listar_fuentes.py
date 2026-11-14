"""Escribe docs/fuentes-enlaces.md con todas las fuentes que tienen círculo "?" en la escena (registro FUENTES_URL de escena3d/plantilla.html).
Uso: python herramientas/listar_fuentes.py"""
import os, re
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(RAIZ, 'escena3d', 'plantilla.html'), encoding='utf-8').read()
blk = html[html.index('const FUENTES_URL = {'):]
blk = blk[:blk.index('\n};')]
filas = re.findall(r"^\s*(\w+): \[(['\"])(.*?)\2, '([^']+)'\]", blk, re.M)
out = ['# Fuentes con enlace (círculos "?" de la escena)', '',
       'Generado con `python herramientas/listar_fuentes.py` a partir de `FUENTES_URL` en `escena3d/plantilla.html`. No editar a mano.', '',
       '| Clave | Qué respalda | Enlace |', '| --- | --- | --- |']
out += [f'| `{k}` | {t} | {u} |' for k, _, t, u in filas]
open(os.path.join(RAIZ, 'docs', 'fuentes-enlaces.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(len(filas), 'fuentes')

"""Terreno para que Gale Earth calcule en el navegador las rutas del PMR (rover presurizado) y de la persona a pie.

Lee el terreno de contexto de la travesía (data/terreno/travesia_sur, celdas de 12 m: elevación, pendiente y cielo tapado)
y el color a 3 m (para marcar arena probable, como herramientas/expedicion.py y ruta_base.py), y escribe:
  gale-earth/datos/terreno_pmr.png   RGB, 550 × 1450: R·256+G = elevación (zmin + valor · escala), B = pendiente·2 (pasos de 0,5°,
                                     hasta 63,5°) + 128 si es arena probable. Sin canal alfa (el navegador no lo altera).
  gale-earth/datos/cielo_pmr.png     gris: fracción de cielo tapado (byte/255), la misma de la escena.
  gale-earth/datos/terreno_pmr.json  límites, tamaño de celda y codificación.
Todo es dato con fuente (DEM del equipo, igual al USGS de Gale) más la marca de arena, que es cálculo propio (indicio).

Uso: /usr/bin/python3.12 herramientas/terreno_pmr.py
"""
import json, os, shutil
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = os.path.join(RAIZ, 'data/terreno/travesia_sur')
SAL = os.path.join(RAIZ, 'gale-earth/datos')


def main():
    M = json.load(open(os.path.join(CTX, 'meta.json')))
    W, H = M['dem']['ancho'], M['dem']['alto']
    rg = np.asarray(Image.open(os.path.join(CTX, M['dem']['archivo'])).convert('RGB'))
    pend = np.asarray(Image.open(os.path.join(CTX, 'pend_12m.png')).convert('L')).astype(float) / 4
    col = np.concatenate([np.asarray(Image.open(os.path.join(CTX, n)).convert('RGB')).astype(float) for n in M['color']['archivos']], axis=0)
    col = col[:H * 4, :W * 4].reshape(H, 4, W, 4, 3).mean(axis=(1, 3))
    azul = (col[..., 2] - col[..., 0]) / np.maximum(1, col[..., 2] + col[..., 0])
    arena = (azul > -0.06) & (pend < 15)
    b = np.minimum(127, np.round(pend * 2)).astype(np.uint8) | (arena.astype(np.uint8) << 7)
    out = np.dstack([rg[..., 0], rg[..., 1], b]).astype(np.uint8)
    Image.fromarray(out, 'RGB').save(os.path.join(SAL, 'terreno_pmr.png'), optimize=True)
    shutil.copy(os.path.join(CTX, 'cielo_12m.png'), os.path.join(SAL, 'cielo_pmr.png'))
    meta = {'ancho': W, 'alto': H, 'm_por_px': M['dem']['m_por_px'], 'lat_norte': M['lat_norte'], 'lon_oeste': M['lon_oeste'],
            'lat_sur': M['lat_sur'], 'lon_este': M['lon_este'], 'zmin': M['dem']['zmin'], 'escala_m': M['dem']['escala_m'],
            'codificacion': 'R·256+G = elevación (zmin + v·escala_m); B & 127 = pendiente·2 (grados); B & 128 = arena probable',
            'cielo': 'cielo_pmr.png: byte/255 = fracción de cielo tapado (16 direcciones, horizonte de 400 m)',
            'fuente': M['fuente'], 'armado_con': 'herramientas/terreno_pmr.py'}
    json.dump(meta, open(os.path.join(SAL, 'terreno_pmr.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print({n: f"{os.path.getsize(os.path.join(SAL, n)) // 1024} KB" for n in ('terreno_pmr.png', 'cielo_pmr.png', 'terreno_pmr.json')},
          f"arena probable: {arena.mean() * 100:.1f} % de las celdas")


if __name__ == '__main__':
    main()

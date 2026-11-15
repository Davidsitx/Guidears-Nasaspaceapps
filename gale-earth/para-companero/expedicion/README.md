# Expedición: rutas seguras para astronauta y rover (para seguir aparte)

Salió de Gale Earth el 15/11/2026 para que la continúe un compañero. Nada de esto se carga en `index.html`.

- `expedicion.js`: módulo completo. Incluye el panel, el cálculo en un Web Worker (Dijkstra sobre una grilla de 20 m), la simulación en vivo, la tormenta solar y la línea de vista.
- Capas que usa: `../../capas/expedicion/`. Las arman `../../herramientas/zona_expedicion.py` y `../../herramientas/themis_noche.py`.
- Notas, reglas y fuentes: `docs/notas.md` del repo (entradas "noche (4)" y "madrugada" del 14 y 15/11).

Para volver a meterlo en Gale Earth hay que hacer tres cosas:
1. agregar `+'\n'+open('para-companero/expedicion/expedicion.js').read().rstrip()` en `_ensamblar.py`;
2. agregar el botón `data-t="expedicion"` en el riel de `cabecera.html`, junto con el `#expHud` y su CSS;
3. agregar `expedicion: vistaExpedicion` en `abrir()`.

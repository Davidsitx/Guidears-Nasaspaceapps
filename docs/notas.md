# Notas de traspaso

Al terminar algo, agregar arriba: fecha, quién, qué hizo, qué falta, qué decidió. El otro Claude lee esto al empezar.

## 2026-11-13 noche · Compañero (con Claude)
**Terreno de la zona del sol 5070 listo** en `data/terreno/sol5070/` (formato del contrato §1). Detalle y verificación en su README.

- Hizo:
  - `herramientas/recortar_terreno.py`: recorta el DEM USGS de 1 m y la orto HiRISE de 25 cm leyendo solo la ventana por HTTP (sin bajar los 3,6 y 24 GB). Sirve para cualquier zona (`--zona`, caja en lat/lon).
  - `herramientas/verificar_terreno.py`: chequea bin vs tif, rutas dentro de la grilla, y compara con un DEM y una orto de referencia; genera una vista con las rutas.
  - Recorte pedido: lat -4,820 a -4,848, lon 137,385 a 137,412 → grilla de 801 × 831 celdas de 2 m, orto de 0,5 m. Sin celdas vacías.
- Datos útiles para recalcular A, B y C: sol 5070 a -3473,9 m; las paradas finales están a -3279 m (vehículo) y -3294 m (astronauta), o sea ~180–195 m de subida. Pendiente en la zona: mediana 8,8°, p95 31,8°.
- Decidió:
  - `meta.json` agrega campos extra (lat_sur, lon_este, elev_min/max, orto_res_m, nota) sin cambiar los del contrato. `lat_norte`/`lon_oeste` son la esquina noroeste de la celda (0,0).
  - `dem.tif` no se versiona (`.gitignore` excluye `*.tif`); se regenera con el comando del README.
  - La orto de USGS es en escala de grises. Hay una orto en color de la zona boxwork (fuera de esta caja) que se puede sumar como zona extra.
- Falta: zona `boxwork` en el mismo formato (opcional), escena 3D (`escena3d/`), tabla de límites del astronauta. Agregar las dos fuentes nuevas al registro compartido de fuentes (acá ya están en docs/fuentes.md).

## 2026-11-13 noche · David (con Claude) · SIMULADOR 3D
- Hizo: `escena3d/index.html`, simulador 3D en three.js (abrir con un servidor local, por ejemplo `python3 -m http.server` en la raíz, y entrar a `/escena3d/`). Terreno real a escala, Curiosity a escala con suspensión rocker-bogie aproximada (plano de 6 contactos), astronauta de 1,8 m, rutas A* vehículo y astronauta, autonomía, manejo WASD, hora solar y Ls de Gale, capas de pendiente, sombra de radiación y zonas prohibidas, panel con inclinación vs 20°, distancia al refugio vs 1,38 km y dosis.
- Datos de prueba: `data/terreno/montesharp_s3331-3958/` (PLACES, 2 m) ya en el formato del contrato, más `cielo_bloqueado_u8.bin` y `recorrido_curiosity.json`.
- Decidió (con David): el motor 3D lo hace David; el compañero aporta terreno y capas por el contrato. CLAUDE.md actualizado.
- Actualización: ya integrada la zona `sol5070` del compañero (DEM USGS + orto HiRISE). Es la zona por defecto de la escena: Curiosity aparece en su posición real, con la orto como textura y las rutas cualitativas punteadas. Agregué `data/terreno/sol5070/cielo_bloqueado_u8.bin` (derivado del DEM, 16 direcciones, 400 m), avisado acá porque la carpeta es del compañero.
- (Original) Para el compañero: exportar la zona del sol 5070 con el mismo formato (`dem_2m.bin` Float32 LE fila 0 = norte, `meta.json`); opcional `cielo_bloqueado_u8.bin` (se puede generar con el script de `herramientas/`) y una ortoimagen. Se ve con `escena3d/?zona=<carpeta>`.

## 2026-11-13 tarde · David (con Claude) · ETAPA ACTUAL
**Dónde estamos:** las rutas están definidas como propuesta y justificadas con fuentes; falta el terreno real de la zona para calcularlas.

- Hizo:
  - Tres rutas desde el sol 5070 (137,38915° E, -4,82568°): A = robot Curiosity (1,46 km, 25–50 soles), B = astronauta a pie ida y vuelta (1,65 km, máx. 0,8 km del refugio), C = rover presurizado tripulado + 3 caminatas de 300–385 m (propuesta principal).
  - Página de justificación: `prototipo/rutas_sol5070.html` (mapa, motivo científico de cada parada, criterios, revisión de NotebookLM, glosario).
  - Correcciones de NotebookLM: coordenadas (la que daba era el cursor, 545 m al sur), pendiente de 5° (es de aterrizaje), 7,5% (son neutrones; dosis 4–5%), robot vs rover tripulado, "radio de 385 m" (no es un estándar).
  - Parámetros con fuente en `data/parametros.json`: astronauta 20° (Artemis, lunar), rover tripulado 10 km/h (concepto SEV de NASA).
- Decidió:
  - Separar siempre robot (datos medidos) y rover tripulado (supuesto declarado).
  - La ruta C es la propuesta para el pitch.
- Falta (para el compañero): terreno de la zona del sol 5070 con el formato de `docs/contrato.md` §1. Recorte aprox.: lat -4,820 a -4,848, lon 137,385 a 137,412. Con eso: pendientes reales, sombra de radiación y recálculo de A, B y C; y la escena 3D.
- Falta (David): tiempo de soporte vital del traje (define el radio de alerta), confirmar que el terreno claro del sureste es la unidad de yardangs, Local Lead.

## 2026-11-13 · David (con Claude)
- Hizo: estructura del repo, CLAUDE.md, contrato de interfaces, datos de Curiosity (recorrido PLACES hasta sol 4868, posición sol 5070), planificador 2D funcionando sobre terreno PLACES (no cubre la zona actual), borrador cualitativo de rutas desde el sol 5070, fundamento científico y salud del rover en docs/.
- Falta: terreno de la zona del sol 5070 (lo trae el compañero según docs/contrato.md §1), pasar el planificador a esa zona, escena 3D.
- Decidió: GeoJSON para rutas; terreno como grilla Float32 + meta.json; parámetros provisorios en data/parametros.json.

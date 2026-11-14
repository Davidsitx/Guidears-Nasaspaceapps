# Notas de traspaso

Al terminar algo, agregar arriba: fecha, quién, qué hizo, qué falta, qué decidió. El otro Claude lee esto al empezar.

## 2026-11-14 · Compañero (con Claude) · PLAN DE ENTREGA
- Hizo: `docs/entrega.md` con el recorrido del proyecto, lo que exige la guía oficial de entrega 2026, la lista de lo que falta por prioridad, un guion de video de 30 s y un reparto sugerido.
- Requisitos clave de la guía: demo de **30 s o menos con subtítulos en inglés** (o hasta 7 diapositivas en inglés), página del proyecto toda en inglés, links públicos, **declarar el uso de IA**, enviar antes del **domingo 15 a las 23:59** hora local.
- Para David: falta el archivo `LICENSE` (Apache 2.0) y la sección "License" del README está vacía. Publicar la escena con GitHub Pages para tener el link del proyecto final.
- Falta: video, textos de la escena en inglés, README y referencias en inglés, página del proyecto.

## 2026-11-14 mañana · David (con Claude) · TRAVESÍA COMPLETA, PERFORACIONES, CAPAS Y ALERTAS
- **Leer `docs/travesia.md`.** La escena ahora muestra todo el camino de Curiosity (aterrizaje → hoy) alrededor de la zona de detalle, con los archivos que bajó el equipo (los .tif y el .gpkg no se versionan: ver `data/README.md`).
- Datos nuevos: `data/terreno/travesia_sur/`, `data/terreno/sol5070/orto_color.jpg` (la orto de 0,5 m con el color del mosaico; `armar.py` la usa si existe y deja `orto.jpg` intacta), `data/curiosity/recorrido_completo.geojson`, `perforaciones.geojson` y `perforaciones_hallazgos.json`.
- Escena: vista "Travesía completa / Zona de hoy", viaje por soles con las 12 etapas, fichas de las 49 perforaciones, capa de radiación en bandas (también en la travesía), peligro limpio con arena por color, alertas sin ruido, modo de calidad liviana para tablets. `index.html` pesa 13,6 MB.
- **Pendiente del equipo:**
  1. confirmar de dónde se bajaron el mosaico de color y el GeoPackage, para citarlos;
  2. verificar las 37 fichas de perforaciones que dicen "a verificar";
  3. confirmar el punto exacto de la medición de RAD en Murray Buttes.
- Corrección: el pozo 47 es Campo Marte, no Atacama (ver `docs/travesia.md`).

## 2026-11-14 madrugada · David (con Claude) · ASTRONAUTA A MANO, ALERTAS, REGRESO A LA BASE Y CAPAS PORTABLES
- **Para el compañero (importante):** `docs/capas-portables.md` tiene el inventario de capas para tu mapa: cada archivo, su formato, su fuente, las reglas de cálculo y un ejemplo con Leaflet. Las capas nuevas están en `data/capas/sol5070/` (PNG + `meta.json`, misma grilla que el terreno).
- Datos:
  - **Dosis corregida a 0,64 mSv/día** (Hassler 2014); antes usábamos 0,67. Actualicé `parametros.json`, el contrato, el GeoJSON y `paradas.md`.
  - `parametros.json` suma `eva` (salida de 6 h nominales y 8 h máximas; 30 min a un refugio y 30 min de reserva, estos dos como supuestos) y los límites de 600 mSv y 250 mSv.
  - Puntos nuevos R1, M1, Q1 y Z1 en `data/rutas/puntos_extra_sol5070.geojson`.
- Escena:
  - mover al astronauta (WASD o joystick), con alertas que avisan y no bloquean;
  - volver a la base por el camino más rápido;
  - capas de peligro, de alcance a pie y CRISM más nítido con modo interpretado;
  - perfil en tarjeta flotante (el botón "Ver perfil" antes no mostraba nada a la vista);
  - botones de brújula y "ubicarme";
  - rutas como cintas con flechas;
  - más detalle en Curiosity y en el astronauta.
- **Hallazgo:** B2 queda a 33 min de caminata de S, más que la regla de 30 min. A3, C3, A4, C4 y R1 están a 33–48 min. Refuerza la ruta C (ver `docs/paradas.md`).
- Falta: textos en inglés; probar en una tablet real.

## 2026-11-14 madrugada · David (con Claude) · VISUAL Y USO DE LA ESCENA 3D
- Hizo (`escena3d/plantilla.html`; `index.html` regenerado):
  - astronauta articulado, con caminata y huellas;
  - primera persona con vistas "ojos" y "detrás", para mirar alrededor y con transición suave;
  - rover con ruedas de garras en V, mástil que escanea, bandas y polvo;
  - reflejos del cielo y cielo con degradé;
  - pantalla de inicio "Cómo usar" y botones "Recorrido guiado", "Caminar como astronauta" y "Seguir al rover";
  - botones grandes en pantallas táctiles.
- Probado en navegador (1280×800, sin errores): recorrido guiado, caminata en las dos vistas y seguimiento del rover.
- Ojo: el paso de 1,4 m del astronauta es un supuesto visual (README, tabla de medido/supuesto).
- Falta: probar fluidez en una tablet real; textos en inglés.

## 2026-11-14 madrugada · David (con Claude) · FICHAS DE PARADAS Y VISOR DEL ASTRONAUTA EN LA ESCENA 3D
- Hizo, en `escena3d/plantilla.html` y `armar.py` (regenerado `index.html`, 7,1 MB, abre sin internet):
  - **Paradas desplegables** (panel y carteles 3D) con "Qué vas a encontrar" (CRISM), suelo, radiación y motivo.
  - **Visor del casco** en primera persona (tecla V): suelo, minerales bajo los pies, radiación, refugio, próxima parada con flecha y aviso de llegada.
  - **Capa CRISM** (ALT, HYD, FM2, MAF). `armar.py` la toma sola de `data/mineralogia/crism_<zona>/`.
  - Las rutas de `rutas_sol5070_calculadas.geojson` ya no salen como "a ojo"; el borrador cualitativo se carga oculto y sin paradas.
  - Probado en navegador (1400×860 y 1024×768, tamaño tablet): sin errores; la lectura por parada coincide con la tabla de `docs/paradas.md`.
- HYD sumado: S = sulfato monohidratado; B1/B2 = polihidratado.
- **Para el compañero:** la capa CRISM entra a la escena por el mismo mecanismo que las otras (contrato). Si sumás más capas satelitales, conviene seguir el formato de `data/mineralogia/crism_sol5070/meta.json` (esquina noroeste, grados por píxel, leyenda).
- Falta: textos en inglés del visor y las fichas para la entrega; probar en una tablet real.

## 2026-11-14 madrugada · David (con Claude) · MINERALOGÍA CRISM POR PARADA
- Hizo: recorté los mosaicos CRISM GMWG 2012 (ALT, FM2, MAF, VNA, FAL) sobre la zona sol5070 y medí cada parada. Están en `data/mineralogia/crism_sol5070/`: PNG en la misma proyección que el terreno, `meta.json` con esquina noroeste, grados por píxel y leyenda, y `muestras_paradas.json`. Script en `herramientas/crism_muestras_paradas.py`. Figura e interpretación en `docs/paradas.md` (sección CRISM).
- Resultado: los mosaicos **cubren** la zona. Alineación con HiRISE: ≤ 1 píxel (19 m). Hay sulfatos en la parte baja (S, A1, B1, B2); el terreno claro (A4, C4) da poca señal en todos los productos, lo que apoya, sin probar, que sea otra unidad. B2 es la parada con más señales y C3 la de más agua.
- **Para el compañero (capas):** los PNG se pueden usar directo como textura en la escena 3D. Ubicación: `lon = lon_oeste + (col + 0,5) × grados_por_px`, `lat = lat_norte − (fila + 0,5) × grados_por_px`. El recorte es algo mayor que la zona (margen de ~0,004°). Sugerencia: capa "Mineralogía (CRISM)" con selector ALT/FM2/MAF, más la leyenda de `meta.json`.
- Falta: el producto **HYD** (David lo baja) y volver a bajar el **TRU**, que llegó cortado. Los .tif originales (~10 MB cada uno) no se suben al repo.

## 2026-11-13 noche · David (con Claude) · PARADAS JUSTIFICADAS Y RUTAS CALCULADAS
- Hizo: `data/rutas/rutas_sol5070_calculadas.geojson` (contrato §2): rutas A (robot), B (a pie, ida y vuelta), C (rover tripulado + 3 caminatas) calculadas con A* sobre el DEM sol5070, **0 m sobre 20°**; 10 paradas con `motivo_cientifico`, `fuente_motivo`, quién va y datos medidos. Paradas reubicadas sobre el terreno (vehículo: menor pendiente/rugosidad; astronauta: caminable, al pie de afloramiento, más cielo tapado). Justificación completa en `docs/paradas.md` con fotos HiRISE. Regeneré `escena3d/index.html` con `armar.py` (sin tocar la plantilla).
- Decidió: la ruta B cambió a 2,6 km ida y vuelta (84 min); las caminatas de C miden 0,76–0,96 km ida y vuelta porque rodean pendientes.
- Falta: confirmar que el terreno claro es la capa de yardangs; buscar escenas CRISM de la zona; textos en inglés.

## 2026-11-13 noche · Compañero (con Claude) · GALE-3D FUSIONADO
**`escena3d/index.html` ahora es la fusión** del simulador GALE-3D de David y la escena autónoma del compañero (acordado con David). Detalle en `escena3d/README.md`.

- Hizo:
  - Del simulador de David se mantiene todo: Curiosity a escala con suspensión (plano de 6 contactos), rutas A* con "Marcar paradas" y "Calcular rutas" (astronauta ida y vuelta, con preferencia por la sombra), ajuste de paradas a la celda permitida más cercana, autonomía ×1 a ×300, manejo WASD, sol y estación (hora y Ls), astronauta que camina su ruta, cámaras libre / rover / astronauta / cenital, capas de pendiente, sombra de radiación y zonas prohibidas, panel con inclinación, distancia al rover vs 1,38 km y dosis.
  - De la escena del compañero: **abre con doble clic, sin internet ni servidor** (three.js r170 y los datos van dentro del HTML), métricas y perfil por ruta (también para las rutas calculadas), primera persona, fichas de las paradas, capas sobre la ortoimagen, parámetros leídos de `data/parametros.json` (antes estaban fijos en el código).
  - Cambios respecto del simulador de David: ya no hace falta servidor ni `?zona=`; cada zona se arma con `python escena3d/armar.py --zona <carpeta>` y queda en `escena3d/index_<zona>.html` (probado con `montesharp_s3331-3958`, con el recorrido real en amarillo y relieve sombreado porque esa zona no tiene orto). Las rutas se dibujan como tubos (Line2 necesitaba internet). El astronauta mide 1,7 m. El cursor y el marcado usan un rayo sobre la grilla en vez de intersectar 1,3 millones de triángulos.
  - Usa el `cielo_bloqueado_u8.bin` que agregó David en `data/terreno/sol5070/` (coincide con mi cálculo: diferencia media 0,05 sobre 255).
- Lo que muestran las métricas (cálculo propio, provisorio):
  - Vehículo: 1,48 km sobre el terreno, +207 m, pendiente de marcha máx. 35,6°, **54 m sobre 20°**, 25–50 soles.
  - Astronauta: 1,54 km, +214 m, pendiente de marcha máx. 43,6°, **110 m sobre 20°**, 1 h 37 min de ida, 42,8 µSv.
  - O sea: tal como están trazadas, las dos rutas cruzan tramos más empinados que los límites. Con "Calcular rutas" sobre paradas de prueba salen rutas con 0 m sobre 20°; la del astronauta (ida y vuelta) se alejó 1431 m del punto de partida, más que 1,38 km, y la escena lo marca en rojo.
- Para David (la escena los toma solos cuando estén en `data/rutas/` y se vuelve a correr `armar.py`):
  - Las paradas del GeoJSON no traen `motivo_cientifico` ni `fuente_motivo` (contrato §2); la ficha dice "motivo pendiente".
  - Las rutas A, B y C solo están en `prototipo/rutas_sol5070.html`; si se exportan como GeoJSON, aparecen en la escena (una ruta con "tripul" o "presur" en el nombre se dibuja en violeta como rover tripulado).
- Falta: probar en un celular real y medir fluidez con placa de video común; pasar los textos al inglés para la entrega; guardar y exportar como GeoJSON las rutas calculadas en la escena.

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

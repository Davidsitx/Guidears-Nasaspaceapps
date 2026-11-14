# Capas portables: cómo pasar todo al mapa de Marte

Guía para sumar al mapa del compañero cada capa de la escena 3D sin perder ninguna. Todo está en archivos de datos con su fuente; la escena (`escena3d/`) es solo una forma de mostrarlos.

## Convención común

- Coordenadas: latitud planetocéntrica y longitud este, en grados. Marte como esfera de radio 3.396.190 m. Proyección equirectangular con paralelo estándar 0 (la de PLACES y la del DEM USGS).
- Vectores: GeoJSON `[lon, lat]`.
- Rásters: PNG con un `meta.json` al lado. `lat_norte` y `lon_oeste` son la esquina noroeste del píxel (0,0); `grados_por_px` es el tamaño del píxel. Para un mapa 2D, la imagen va sobre el rectángulo `[lat_sur, lon_oeste]` a `[lat_norte, lon_este]`.

Ejemplo con Leaflet (CRS simple en grados):

```js
const m = await (await fetch('data/capas/sol5070/meta.json')).json();
L.imageOverlay('data/capas/sol5070/peligro.png', [[m.lat_sur, m.lon_oeste], [m.lat_norte, m.lon_este]], { opacity: 0.8 }).addTo(mapa);
L.geoJSON(await (await fetch('data/rutas/rutas_sol5070_calculadas.geojson')).json()).addTo(mapa);
```

Si el mapa usa una proyección distinta, primero hay que reproyectar el PNG (por ejemplo, con `gdal_translate -a_ullr` y `gdalwarp`), usando el radio de arriba.

## Inventario de capas

| Capa | Archivo | Formato | Qué muestra | Fuente |
| --- | --- | --- | --- | --- |
| Terreno | `data/terreno/sol5070/dem_2m.bin`, `meta.json` | Float32, 801 × 831 celdas de 2 m | Elevación | DEM USGS de Gale de 1 m (Calef y Parker 2016) |
| Foto | `data/terreno/sol5070/orto.jpg` | JPG de 0,5 m | Ortoimagen | HiRISE, USGS (Calef y Parker 2016) |
| Rutas y paradas | `data/rutas/rutas_sol5070_calculadas.geojson` | GeoJSON (contrato §2) | Rutas A (robot), B (a pie), C (rover tripulado y caminatas); paradas S, A1–A4, B1, B2, C2–C4 con motivo y fuente | A* propio sobre el DEM |
| Puntos agregados | `data/rutas/puntos_extra_sol5070.geojson` | GeoJSON + campo `tipo` | R1 refugio, M1 mirador, Q1 muestra, Z1 precaución por arena | `herramientas/capas_peligro.py` |
| Posición de Curiosity | `data/curiosity/posicion_sol5070.geojson` | GeoJSON | Sol 5070 | NASA, "Where is Curiosity?" |
| Peligro | `data/capas/sol5070/peligro_clases.png` (un byte por celda) y `peligro.png` (color) | PNG + `meta.json` | 0 nada, 1 pendiente de 15–20°, 2 de 20–30°, 3 más de 30°, 4 posible arena | Pendiente del DEM; arena: CRISM más HiRISE (indicio) |
| Pendiente | `data/capas/sol5070/pendiente.png` | PNG + `meta.json` | 15–20°, 20–30°, más de 30° | DEM |
| Sombra de radiación | `data/capas/sol5070/cielo_tapado.png` y `data/terreno/sol5070/cielo_bloqueado_u8.bin` | PNG / un byte por celda | Fracción de cielo tapada por el relieve | Cálculo propio (16 direcciones, 400 m) |
| Mineralogía | `data/mineralogia/crism_sol5070/{ALT,HYD,FM2,MAF,VNA,FAL}.png` | PNG + `meta.json` (19,3 m) | Productos CRISM | CRISM GMWG 2012 (Seelos et al., JHU/APL) |
| Mineralogía por parada | `data/mineralogia/crism_sol5070/muestras_paradas.json` | JSON | Valores 3 × 3 píxeles y percentiles | `herramientas/crism_muestras_paradas.py` |
| Parámetros | `data/parametros.json` | JSON (contrato §3) | Límites de pendiente, velocidades, dosis, presupuesto de la salida (`eva`) | Ver fuentes de cada campo |

Para regenerar las capas calculadas: `python herramientas/capas_peligro.py` y `python herramientas/crism_muestras_paradas.py <carpeta con los .tif>`.

## Reglas que calcula la escena (para reproducirlas en el mapa)

Están en `escena3d/plantilla.html`. Si el mapa las reimplementa, tienen que dar lo mismo.

1. **Dosis a pie:** `dosis_µSv = horas × 0,64 / 24 × 1000 × (1 − 0,25 × cielo_tapado)`. 0,64 mSv/día viene de RAD (Hassler et al. 2014). El factor 0,25 es un cálculo propio, calibrado en Murray Buttes.
2. **Velocidad a pie:** Tobler normalizada a 2,5 km/h en llano, `v = 2,5 × e^(−3,5·|pend + 0,05|) / e^(−0,175)` (supuesto terrestre).
3. **Tiempo de regreso a la base:** Dijkstra desde la base sobre una grilla de 4 m, con el costo de Tobler. Las celdas de más de 20° cuestan 4 veces más. Desde cada punto da los minutos y el camino más rápido.
4. **Presupuesto de la salida:** `margen = 6 h − (tiempo afuera + regreso + 30 min de reserva)`. Si el margen es negativo, toca volver; si se pasa de 8 h, no alcanza el traje (xEMU: 6 ± 2 h, NASA EVA-EXP-0075). La reserva de 30 min es un supuesto.
5. **Regla del refugio (supuesto):** no alejarse a más de 30 min de caminata de un refugio presurizado. Viene del aviso de 30 min ante partículas solares que pide NASA (NTRS 20210014156).
6. **Alertas:** ninguna bloquea el movimiento.
   - Pendiente: precaución de 15 a 20°, peligro de 20 a 30°, crítica por encima de 30°.
   - Posible arena: precaución para el astronauta, peligro para el rover.
   - Lo que viene en los 16 m siguientes.
   - Regreso de más de 24 min (precaución) o de más de 30 min (peligro).
   - Margen de la salida menor a 30 min, negativo, o por encima de 8 h.
7. **Lectura de minerales por punto (fichas):** umbrales fijos sobre los productos CRISM, explicados en `docs/paradas.md`. El mapa "Interpretado" usa el mayor entre ese umbral y un percentil alto de la zona, para pintar solo la señal fuerte.

## Lo que no es portable tal cual

- Los modelos 3D del rover y del astronauta, la primera persona y el visor son de la escena. En un mapa 2D alcanza con íconos y una tarjeta con los mismos datos.
- Las huellas, el polvo y el cielo son efectos visuales, sin datos detrás.

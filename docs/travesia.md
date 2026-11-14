# La travesía completa de Curiosity en la escena (14/11)

Juntamos la zona de hoy (sol 5070, rutas A, B y C) con todo el camino que hizo Curiosity desde el aterrizaje. Es la misma escena (`escena3d/`), con un solo sistema de coordenadas.

## Qué entró y de dónde

| Dato | Archivo de origen (no versionado) | Qué generamos | Con qué |
|---|---|---|---|
| Elevación de 4 m, 6,6 × 17,4 km | `travesia_sur_elevacion_4m.tif` | `data/terreno/travesia_sur/dem_12m_rg.png` (12 m), cielo tapado y pendiente | `herramientas/travesia.py` |
| Color de 3 m | `travesia_sur_color_3m.tif` | `color_norte.jpg`, `color_sur.jpg` y `data/terreno/sol5070/orto_color.jpg` | `herramientas/travesia.py` |
| Recorrido (1319 tramos) y 49 perforaciones | `curiosity_recorrido_y_pozos.gpkg` | `data/curiosity/recorrido_completo.geojson`, `perforaciones.geojson` | `herramientas/travesia_datos.py` |
| Qué se encontró en cada pozo | redacción propia, con fuente por pozo | `data/curiosity/perforaciones_hallazgos.json` | a mano |

**Falta que el equipo confirme el origen exacto** del mosaico de color y del GeoPackage (de dónde se bajaron), para citarlos bien.

## Controles que hicimos

- **La elevación nueva coincide con la nuestra:** diferencia media de 0,22 m (desvío 0,39 m) contra `data/terreno/sol5070`. Las alturas de los 49 pozos coinciden con el DEM (desvío 0,28 m).
- **El recorrido está completo y en orden:** 37,5 km en planta. El odómetro oficial marca 38,29 km al sol 5070; la diferencia son maniobras que la línea no detalla.
- **Validación del modelo de radiación:** en el pozo Quela (Murray Buttes) nuestro cálculo da 17,5% de cielo tapado. RAD midió en esa zona con 19% del cielo tapado y vio bajar la dosis 4 a 5% (Ehresmann et al. 2021). Falta confirmar el punto exacto donde estuvo estacionado el rover.
- **Arena por color:** la arena se detecta por el tono azulado del color HiRISE. El 80% de esa arena coincide con señal fuerte de minerales volcánicos en CRISM: dos datos independientes dicen lo mismo.

## Números para contar

- 37,5 km, 49 perforaciones, 1.029 m de subida neta, del sol 0 al 5073.
- A pie, por el mismo camino, serían unas 18 horas de marcha (cálculo propio, Tobler a 2,5 km/h). A Curiosity le llevó 14 años. Es el mensaje del proyecto a escala de toda la misión.
- El tramo real más protegido de la radiación: 32% de cielo tapado cerca del sol 3579, en el paso Paraitepuy.
- Los pozos más protegidos: Tapo Caparo (19%), Quela y Hutton (17,5%).

## Estado de las fichas de perforaciones

12 de 49 están verificadas contra su fuente (1, 36–39, 42–48). Las otras 37 están redactadas de memoria y la escena las marca "a verificar": **hay que revisarlas contra la fuente citada antes de presentarlas como dato**. El sol de cada punto del recorrido es aproximado (interpolado entre anclas).

Corrección de paso: el pozo 47 es Campo Marte. Atacama fue un bloque suelto que quedó enganchado al taladro y cuya muestra se perdió (blog, sols 4879-4885 y 4900-4907). Lo teníamos mal en `docs/ciencia.md`.

## Qué cambió en las capas

- **Radiación:** bandas por cielo tapado con la dosis en µSv/h, en la zona de hoy (2 m) y en toda la travesía (12 m).
- **Peligro:** pendiente media en 6 m, sin manchas sueltas; arena por color. La ruta A cruza 22% de arena posible (antes, con CRISM en bloques de 19 m, daba 36%).
- **Alertas:** un cartel a la vez, con espera de 1,2 s y silencio; lo menor va como pastilla. Caminando la ruta B entera salen 3 carteles (antes saltaban casi todo el tiempo).

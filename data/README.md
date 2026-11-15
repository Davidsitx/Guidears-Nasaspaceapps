# Datos

Versionados acá (livianos, GeoJSON):
- `curiosity/recorrido_places_sol0-4868.geojson` — recorrido de Curiosity, derivado de PLACES.
- `curiosity/paradas_boxwork.geojson` — estadías largas en el boxwork (Altadena, Nevado Sajama...).
- `curiosity/posicion_sol5070.geojson` — posición actual.
- `rutas/ruta_sol5070_cualitativa.geojson` — borrador de rutas, sin elevación.
- `base/sitios_base.geojson` — análisis de sitios del equipo para la base (zonas 1, 2 y 3 en la llanura del aterrizaje, con criterios y fuente). La Base Gale va en la Zona 2 (`elegida: true`).
- `terreno/sol5070/` — terreno de la zona del sol 5070 con el formato de docs/contrato.md §1 (`dem_2m.bin`, `meta.json`, `orto.jpg`). El `dem.tif` de 1 m no se versiona: se regenera con `herramientas/recortar_terreno.py` (ver `terreno/sol5070/README.md`).

No versionados (descargar a `data/raw/`):
- PLACES: `localized_interp.csv` y `msl_orbital_dem.img` (+ `.lbl`) — PDS Geosciences Node, paquete MSL PLACES (acceso desde el Analyst's Notebook: https://an.rsl.wustl.edu/).
- USGS Gale DEM 1 m: https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif (3,6 GB; no hace falta bajarlo: `herramientas/recortar_terreno.py` lee solo la ventana necesaria por HTTP).
- USGS Gale ortoimagen 25 cm: https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif (24 GB; mismo script).
- Travesía completa (14/11): `travesia_sur_elevacion_4m.tif` (4 m), `travesia_sur_color_3m.tif` (3 m) y `curiosity_recorrido_y_pozos.gpkg`, armados por el compañero con GDAL (fuentes en `docs/fuentes.md`). Para bajarlos de nuevo (zona E 8141100 a 8147700, N -271600 a -289000 m):
  ```
  gdal_translate -projwin 8141100 -271600 8147700 -289000 -tr 4 4 -r average /vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_DEM_Mosaic_1m_v3.tif travesia_sur_elevacion_4m.tif
  gdal_translate -projwin 8141100 -271600 8147700 -289000 -tr 3 3 -r average /vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif travesia_sur_color_3m.tif
  ```
  El GeoPackage sale de `MSL_traverse.json` y `MSL_waypoints.json` (mars.nasa.gov/mmgis-maps/MSL/Layers/json/). No se versionan los .tif ni el .gpkg. Para regenerar lo derivado: copiarlos a una carpeta como `elev.tif`, `color.tif` y `datos.gpkg`; sacar `rec.geojson` y `poz.geojson` con `ogr2ogr` (ver el encabezado de `herramientas/travesia_datos.py`); correr `python herramientas/travesia.py <carpeta>`, después `python herramientas/travesia_datos.py <carpeta>` y `python herramientas/capas_peligro.py`.

## Globo de fondo (data/terreno/globo/)
- Se arma con `python herramientas/globo.py megt90n000eb.img`. El archivo MOLA (33 MB, no se versiona) es el MEGDR de 16 píxeles/grado del PDS; una copia pública está en https://raw.githubusercontent.com/benbrittain/Barsoom/HEAD/data/MEGDR/mgsl_300x/meg016/megt90n000eb.img
- El color sale de `maps-in-mars/capas/viking_color_8k.jpg`.

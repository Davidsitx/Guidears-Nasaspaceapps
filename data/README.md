# Datos

Versionados acá (livianos, GeoJSON):
- `curiosity/recorrido_places_sol0-4868.geojson` — recorrido de Curiosity, derivado de PLACES.
- `curiosity/paradas_boxwork.geojson` — estadías largas en el boxwork (Altadena, Nevado Sajama...).
- `curiosity/posicion_sol5070.geojson` — posición actual.
- `rutas/ruta_sol5070_cualitativa.geojson` — borrador de rutas, sin elevación.
- `terreno/sol5070/` — terreno de la zona del sol 5070 con el formato de docs/contrato.md §1 (`dem_2m.bin`, `meta.json`, `orto.jpg`). El `dem.tif` de 1 m no se versiona: se regenera con `herramientas/recortar_terreno.py` (ver `terreno/sol5070/README.md`).

No versionados (descargar a `data/raw/`):
- PLACES: `localized_interp.csv` y `msl_orbital_dem.img` (+ `.lbl`) — PDS Geosciences Node, paquete MSL PLACES (acceso desde el Analyst's Notebook: https://an.rsl.wustl.edu/).
- USGS Gale DEM 1 m: https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif (3,6 GB; no hace falta bajarlo: `herramientas/recortar_terreno.py` lee solo la ventana necesaria por HTTP).
- USGS Gale ortoimagen 25 cm: https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif (24 GB; mismo script).

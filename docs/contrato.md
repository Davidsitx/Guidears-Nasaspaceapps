# Contrato de interfaces

Acordado antes de separarnos. Si algo cambia, se cambia acá primero y se avisa en docs/notas.md.

## 1. Terreno (lo produce: compañero, en `data/terreno/`)
Por cada zona, una carpeta `data/terreno/<zona>/` con:
- `dem.tif` — modelo de elevación recortado, GeoTIFF Float32, metros, sin datos = -9999. **No se versiona si pesa más de 50 MB**; en ese caso, dejar el comando de recorte en `README.md`.
- `dem_2m.bin` + `meta.json` — versión liviana para la web: grilla Float32 little-endian, fila 0 = norte.
- `orto.jpg` — ortoimagen del mismo recorte y misma extensión que el DEM.
- `meta.json`:
```json
{
  "zona": "sol5070",
  "fuente_dem": "USGS MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker, 2016)",
  "fuente_orto": "HiRISE ...",
  "ancho": 1000, "alto": 1400,
  "tam_celda_m": 2.0,
  "lat_norte": -4.8200, "lon_oeste": 137.3850,
  "grados_por_m": 1.68706e-5,
  "radio_m": 3396190
}
```
Convención de coordenadas: latitud planetocéntrica, longitud este, proyección equirectangular con radio 3.396.190 m (igual que PLACES).

## 2. Rutas (las produce: David, en `data/rutas/`)
GeoJSON FeatureCollection. Una `LineString` por ruta y un `Point` por parada.
- Ruta: `properties` = `{ "ruta": "vehiculo" | "astronauta", "largo_m", "subida_m", "pendiente_max", "tiempo_min", "dosis_uSv", "soles_manejo", "fuente": "planificador v…" | "cualitativa" }`
- Parada: `{ "ruta", "parada": n, "nombre", "motivo_cientifico", "fuente_motivo" }`
- Coordenadas `[lon, lat]`, grados, 7 decimales.

## 3. Parámetros (compartidos, `data/parametros.json`)
```json
{
  "vehiculo":  { "pendiente_max_deg": 20, "velocidad_m_h": 100, "avance_por_sol_m": [30, 60] },
  "astronauta":{ "pendiente_max_deg": 25, "velocidad_llano_km_h": 2.5 },
  "radiacion": { "dosis_superficie_mSv_dia": 0.64, "factor_blindaje_relieve": 0.25 },
  "estado": "provisorio"
}
```
Cada valor que se confirme pasa a llevar su fuente en `docs/fuentes.md`.

## 4. Escena 3D (la produce: compañero, en `escena3d/`)
- Lee `data/terreno/<zona>/meta.json`, `dem_2m.bin` y `orto.jpg`.
- Lee cualquier GeoJSON de `data/rutas/` y lo dibuja sobre el terreno: azul = vehículo, naranja = astronauta.
- Conversión lon/lat → píxel: `x = (lon - lon_oeste) / (grados_por_m * tam_celda_m)`, `y = (lat_norte - lat) / (grados_por_m * tam_celda_m)`.

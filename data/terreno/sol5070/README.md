# Terreno de la zona del sol 5070

Formato: docs/contrato.md §1. Georreferencia completa en `meta.json`.

| Archivo | Contenido |
| --- | --- |
| `dem_2m.bin` | 801 × 831 celdas de 2 m, Float32 little-endian, fila 0 = norte, sin datos = -9999 (no hay ninguna) |
| `meta.json` | caja: lat -4,81998 a -4,84802, lon 137,38499 a 137,41201; elevación de -3530,9 a -3210,7 m |
| `orto.jpg` | 3204 × 3324 px de 0,5 m, escala de grises, misma extensión que el DEM |
| `dem.tif` | DEM de 1 m (1602 × 1662). **No se versiona** (`.gitignore` excluye `*.tif`): se regenera con el comando de abajo |

## Fuentes
- DEM: USGS Astrogeology, `MSL_Gale_DEM_Mosaic_1m_v3.tif` (Calef y Parker, 2016).
- Orto: USGS Astrogeology, `MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif` (mosaico HiRISE, Calef y Parker, 2016), promediada a 0,5 m.

Los dos mosaicos ya vienen en la proyección del contrato (equirectangular, meridiano central 0, esfera de 3.396.190 m),
así que no hay reproyección: solo recorte y promedio.

## Cómo regenerarlo (unos 3 minutos; baja ~100 MB, no los archivos completos)
```
pip install numpy rasterio pillow
python herramientas/recortar_terreno.py --zona sol5070 --lat-norte -4.820 --lat-sur -4.848 --lon-oeste 137.385 --lon-este 137.412 --orto-res 0.5
python herramientas/verificar_terreno.py sol5070 --png vista.png
```

## Verificación (13 de noviembre de 2026)
- `dem_2m.bin` coincide con el promedio 2×2 de `dem.tif` (diferencia máxima 0,0002 m) usando la fórmula de píxel del contrato §4.
- La posición del sol 5070 y las dos rutas de `data/rutas/ruta_sol5070_cualitativa.geojson` caen enteras dentro de la grilla.
  Elevación en el sol 5070: -3473,9 m. Las paradas finales están ~180–195 m más arriba.
- Contra un recorte independiente del mismo DEM (zona boxwork, 416 × 297 m superpuestos): diferencia 0,000 m.
- Contra una orto en color independiente de la zona boxwork: correlación 0,92 sin corrimiento (alineación correcta).
- Pendiente en la grilla de 2 m: mediana 8,8°, percentil 95 31,8°.
- No se pudo comparar con la elevación medida por el rover (PLACES): el recorrido publicado llega al sol 4868 y el CSV no está en el repo.

## Nota sobre la grilla
Como en PLACES, el "este" es lon·R sin cos(lat): cada celda mide 2 m norte-sur y ≈1,993 m reales este-oeste en Gale.
Para pendientes exactas, multiplicar el paso este-oeste por cos(lat) ≈ 0,9965.

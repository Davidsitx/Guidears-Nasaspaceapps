# Contexto compartido para Claude (léelo antes de trabajar en este repo)

Este archivo lo leen los asistentes Claude de los dos integrantes del equipo. Mantenelo corto y actualizado: si una decisión cambia, cambiala acá.

## El proyecto
- Evento: NASA Space Apps Challenge 2026, 14 y 15 de noviembre, sede local San Luis (Argentina). Equipo de dos: David (sistemas, producto) y su compañero (ingeniería aeroespacial).
- Desafío: "Interplanetary Survival Guide: Martian Map". Crear un mapa o interfaz para un astronauta en una misión de superficie, con capas de datos de varias misiones de NASA, ruta que evite obstáculos y tenga en cuenta la seguridad (radiación, movilidad del traje).
- Nuestra idea: una experiencia 3D tipo realidad aumentada, desde la posición actual de Curiosity (sol 5070, -4.82567720, 137.38915198), que compara dos recorridos sobre el mismo terreno real:
  - capa **vehículo** (rover): límites de pendiente y arena, presupuesto de energía, desgaste de ruedas;
  - capa **terrestre / astronauta**: límites de pendiente del traje, tiempo de marcha, dosis de radiación y sombra del relieve.
- Mensaje central: lo que a un rover le lleva semanas, una persona lo hace en una salida; pero la persona está limitada por radiación, oxígeno y pendiente. Cada parada tiene una justificación científica tomada de lo que el equipo de Curiosity investiga hoy (ver docs/ciencia.md).

## Quién trabaja dónde (para no pisarnos)
| Área | Dueño | Carpetas |
| --- | --- | --- |
| Ciencia, rutas y motor de cálculo | David + su Claude | `docs/ciencia.md`, `docs/rover-salud.md`, `data/curiosity/`, `data/rutas/`, `prototipo/planificador/` |
| Capas satelitales, terreno y escena 3D | Compañero + su Claude | `data/terreno/`, `escena3d/` |
| Compartido (cambiar solo avisando en docs/notas.md) | ambos | `CLAUDE.md`, `docs/contrato.md`, `data/parametros.json`, `docs/tareas.md` |

Interfaces entre áreas: **docs/contrato.md**. Antes de empezar, leer **docs/notas.md** (traspasos) y **docs/tareas.md**.

## Cómo trabajamos con git
- Cada uno en su rama (`david/...`, `companero/...`). PRs chicos, fusionar a `main` cada 1 o 2 horas.
- Al terminar algo: nota arriba de todo en `docs/notas.md` (qué hizo, qué falta, qué decidió).
- Un Claude puede revisar el PR del otro.

## Reglas que no se negocian
1. Todo dato lleva fuente. Registrar cada fuente nueva en docs/fuentes.md (qué es, para qué sirve, cómo la usamos).
2. Código propio o de licencia abierta y citado. No copiar código sin licencia (por ejemplo, el simulador "ER-6 Terrain Explorer" se usa solo como inspiración visual).
3. Entregables finales en inglés (video con subtítulos en inglés, página del proyecto). Documentos internos en castellano.
4. Separar siempre dato medido, cálculo propio y supuesto. Los supuestos van marcados como "provisorio" en la interfaz.
5. Nada de fotos de personas reales ni material con derechos de terceros.
6. Licencia del repo: Apache 2.0 (la que pide Space Apps por defecto).

## Convenciones técnicas
- Coordenadas: latitud planetocéntrica y longitud este, en grados, radio de Marte 3.396.190 m (esfera). PLACES usa proyección equirectangular con ese radio: este = lon·R, norte = lat·R (en radianes). Para distancias este-oeste multiplicar por cos(lat) (≈0,9965 en Gale).
- Formato de capas: GeoJSON (lon, lat).
- Datos pesados (.img, .tif, el CSV de PLACES) no se versionan: ver data/README.md para descargarlos.

## Estado al 13 de noviembre de 2026
- prototipo/planificador/index.html: planificador 2D que funciona (A* sobre modelo de elevación PLACES de 2 m, rutas vehículo y astronauta, pendiente, cielo bloqueado, dosis, perfil, validación contra el recorrido real). Terreno: laderas del Monte Sharp, soles 3331–3958. NO cubre la posición actual.
- data/rutas/ruta_sol5070_cualitativa.geojson: primera propuesta de rutas desde el sol 5070, trazada a ojo sobre imagen, sin elevación.
- MMGIS (NASA-AMMOS/MMGIS) instalado y probado con la misión Gale_Boxwork (herramientas/mmgis_config_Gale_Boxwork.json).
- Falta: modelo de elevación de la zona actual (USGS MSL_Gale_DEM_Mosaic_1m_v3.tif, recorte aprox. lat -4.820 a -4.848, lon 137.385 a 137.412) y la escena 3D.

## Parámetros provisorios (reemplazar con fuentes)
- Pendiente máxima rover: 20° (Curiosity en el boxwork: 99% de posiciones bajo 17,4°, máximo 22,8°; en agosto de 2026 llegó a 24°).
- Pendiente máxima astronauta: 25°. Velocidad astronauta en llano: 2,5 km/h. Velocidad rover: 100 m/h en conducción; 30–60 m por sol de manejo según el blog.
- Dosis de rayos cósmicos en superficie: 0,67 mSv/día (RAD). Reducción por relieve: factor 0,25 sobre la fracción de cielo bloqueado (calibrado con Murray Buttes).

## Documentos
- docs/ciencia.md: qué investiga hoy el equipo de Curiosity y por qué elegimos cada parada.
- docs/rover-salud.md: energía, ruedas y cómo eso limita la capa vehículo.
- docs/fuentes.md: índice de fuentes; el registro completo está en el documento compartido del equipo.
- docs/tareas.md: quién hace qué.

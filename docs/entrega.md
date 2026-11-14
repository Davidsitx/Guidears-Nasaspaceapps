# Plan de entrega (Space Apps 2026)

Armado el 14/11/2026 a partir de `docs/notas.md`, `docs/tareas.md`, `docs/fuentes.md`, `escena3d/README.md` y la guía oficial de entrega 2026 (https://www.spaceappschallenge.org/resources/project-submission-guide/).

**Cierre:** domingo 15 de noviembre, 23:59, hora del evento local (San Luis). Vale la última versión enviada: enviar una temprana y reenviar.

## 1. Recorrido del proyecto

| Etapa | Qué se hizo | Dónde quedó |
| --- | --- | --- |
| Investigación (antes del 12/11) | Elección del desafío, informe, términos y condiciones, registro de fuentes. Repaso de SNAP, GDAL y QGIS; qué datos de Marte existen y en qué formato. | Registro de fuentes del equipo; carpeta de lectura del compañero |
| Sitio y datos (12/11) | Boxwork de Gale como objetivo científico. Recorrido de Curiosity (PLACES), DEM USGS de 1 m, HiRISE a color, REMS y RAD. | `data/curiosity/`; archivos locales del compañero |
| Análisis de imágenes (12–14/11) | Pendiente, TPI, curvas de nivel, visibilidad desde Altadena, vista del astronauta, decorrelation stretch (Viking, HiRISE; THEMIS publicado), mapas de las 49 perforaciones, 3D en QGIS, láminas de impresión. | Archivos locales del compañero (14 láminas A4) y dos mapas interactivos publicados |
| Repo y contrato (13/11) | Estructura, `CLAUDE.md`, contrato, rutas A/B/C justificadas, parámetros con fuente. | `docs/`, `data/rutas/`, `data/parametros.json` |
| Terreno y escena 3D (13/11) | Terreno del sol 5070 (compañero). GALE-3D de David fusionado con la escena autónoma. | `data/terreno/sol5070/`, `escena3d/` |
| Escena completa (14/11 madrugada) | Rutas A* con 0 m sobre 20°, 10 paradas con motivo científico, CRISM, visor del casco, astronauta manejable con alertas, capas de peligro y alcance, recorrido guiado. | `escena3d/index.html` (probada el 14/11: carga y funciona sin errores de consola) |

## 2. Qué exige la entrega (guía oficial 2026)

- **Demo:** video de **30 s o menos** (puede hablarse en castellano **con subtítulos en inglés**) **o** hasta **7 diapositivas en inglés**. Si supera esos límites, queda fuera del juzgamiento global.
- **Página del proyecto, todo en inglés:** nombre, resumen, link al demo, link al proyecto final, descripción detallada, uso de IA ("Super Intelligence"), datos de NASA, datos de agencias socias y otras referencias.
- **Links públicos**, sin login (YouTube, GitHub, Drive). La página acepta imágenes JPG/PNG/GIF de hasta 10 MB, no videos ni documentos.
- **Uso de IA:** permitido, pero hay que declararlo. Código y datos hechos con IA se aclaran en el texto y en los metadatos; imágenes o video generados por IA llevan marca de agua visible. Nada de logos ni marcas de NASA en contenido generado.
- **Sin imágenes, video ni audio de menores de 18 años.**
- **Criterios del jurado:** Impacto, Creatividad, Validez, Relevancia y Presentación.
- **Agencias socias** (suman): el DEM de Gale de USGS incluye HRSC de la **ESA**; la **CONAE** (Argentina) es agencia socia. Mencionarlo.
- Al enviar: aceptar términos, confirmar que el trabajo es original y pulsar **"Submit for Judging"**.

## 3. Qué falta

### Imprescindible
- [ ] Confirmar que los dos están **aceptados en el mismo evento local** (San Luis).
- [ ] **Publicar la escena** con link público (GitHub Pages; el README dice que está preparada). Si el repo es privado, hacerlo público.
- [ ] **Agregar `LICENSE` (Apache 2.0)** en la raíz y completar la sección "License" del README, que está vacía.
- [ ] **Video de 30 s con subtítulos en inglés**, subido a YouTube como "no listado".
- [ ] **Página del proyecto en inglés** con todos los campos. Primera versión antes de las 20:00 del domingo; final antes de las 23:59.

### Importante
- [ ] **Textos de la escena en inglés** (pendiente en varias notas).
- [x] **Las 49 perforaciones en 3D.** Hecho por David el 14/11 a la mañana (commit 783d58d): vista "Travesía completa / Zona de hoy", viaje por soles y fichas de las 49 perforaciones. Ver `docs/travesia.md`. Falta probarla y revisar los textos en inglés.
- [ ] **README en inglés:** qué es, cómo usarlo, datos y fuentes, tabla medido / calculado / supuesto, uso de IA, licencia.
- [ ] **Lista de referencias en inglés** a partir de `docs/fuentes.md`.
- [ ] **Declaración de uso de IA** (texto para la página y nota en el README): en qué partes del código, datos y documentación se usó Claude.

### Si sobra tiempo
- [ ] Fuente del tiempo de soporte vital del traje; confirmar si el terreno claro son yardangs; tabla de 5 límites del astronauta (ver `docs/tareas.md`).
- [ ] Probar en una tablet o celular real.
- [ ] Preguntar al Local Lead los horarios del juzgamiento local.

## 4. Guion del video (30 s)

Estructura sugerida por la guía oficial. Subtítulos en inglés.

| Tiempo | Imagen | Subtítulo |
| --- | --- | --- |
| 0–3 s | Nombre del equipo | "We're [team], from San Luis, Argentina." |
| 3–8 s | Vista 3D de la travesía de Curiosity | "The first astronauts on Mars will need a map built for their own feet." |
| 8–12 s | Título | "GALE-3D: where Curiosity is today, walked by a human." |
| 12–22 s | GALE-3D: rover contra astronauta, visor, capas | "Real NASA terrain, HiRISE imagery, CRISM minerals and RAD radiation: slope, dose and a safe way home." |
| 22–30 s | Las 49 perforaciones y la vista del astronauta | "What took a rover weeks, a person could do in one walk, if the map keeps them safe." |

Herramientas: OBS (grabar la escena), CapCut o DaVinci Resolve (edición y subtítulos), YouTube no listado (hosting).

## 5. Reparto sugerido

| Quién | Qué |
| --- | --- |
| Compañero | Video (grabar, editar, subtítulos); capas e imágenes; probar la vista "Travesía completa" |
| David | Textos de la escena en inglés; GitHub Pages; LICENSE y README |
| Los dos (domingo a la tarde) | Página del proyecto, referencias y declaración de IA; enviar versión temprana y final |

# Gale Earth · Google Mars

> Carpeta `gale-earth/` del repo. Dueño: compañero (con Claude). Las teselas pesadas (`teselas/`, ~6 GB) no se versionan: ver "Marte completo en 3D".

Marte en 3D, al estilo Google Earth, con todo lo que Curiosity midió en Gale. Propósito: elegir dónde instalar la **primera base humana en el cráter Gale**.

## Cómo se abre
- **En la PC:** doble clic en `abrir.bat` (Windows) o `abrir.sh` (Mac/Linux). Hace falta Python 3 e internet.
- **En el celular:** con `abrir.bat` abierto en la PC y el celular en el **mismo Wi-Fi**, tocar **Celular** en el menú de la izquierda y escanear el código QR. También se puede escribir la dirección que muestra la ventana negra del servidor (por ejemplo `http://192.168.0.15:8765/index.html`). La primera vez Windows puede preguntar si Python puede usar la red: elegir **Redes privadas**. Para que solo funcione en la PC: `python servir.py --solo-pc`.
- En el celular se puede **agregar a la pantalla de inicio** (menú del navegador → "Agregar a inicio"): queda con el logo, como una app.
- Doble clic en `index.html` también funciona, pero solo con Cesium Mars (sin el globo propio ni las capas).

## Interfaz (estilo Google Earth)
- **Riel de la izquierda** (abajo en el celular): Buscar, Explorar, Base, Órbitas, Biblioteca, Historia (línea de tiempo), Capas, Celular, Ayuda y Pantalla completa. Tocar de nuevo una pestaña la cierra.
- **Buscador:** pozos (nombre o número), zonas, sitios de la base, orbitadores, lugares de Marte (Olympus Mons, Valles Marineris, Jezero…) y coordenadas (`-4.59, 137.44` o `4.59 S, 137.44 E`). Atajo: tecla `/`.
- **Controles abajo a la derecha:** brújula (vuelve el norte arriba), 2D/3D, relieve ×1/×1,5/×2/×3, acercar y alejar.
- **Barra de estado:** coordenadas y elevación bajo el mouse (latitud planetocéntrica, elevación sobre la esfera MOLA de 3396,19 km), altura de la cámara sobre el suelo y escala.
- **Cielo:** Vía Láctea y estrellas reales (catálogo Hipparcos de ESA y contorno de la Vía Láctea de J. R. Vieira, vía d3-celestial, licencia BSD). Las 6 caras están en `capas/cielo/` y se regeneran con `python cielo_via_lactea.py RUTA/package/data` (instrucciones adentro del script). El brillo difuso y la textura son una representación visual, no una foto.
- **Logo:** `capas/logo/` (recortado del PNG del equipo, fondo transparente; íconos para el navegador y el celular).
- **Pantalla de carga:** render propio del horizonte de Marte (`capas/carga/`, se regenera con `python horizonte_marte.py`) a partir del mapa en color Viking. La neblina del limbo es estética, no un dato.

### Tecnología
Gale Earth es una página web: HTML + JavaScript + WebGL, con el motor CesiumJS (código abierto, Apache 2.0). Google Earth web usa la misma base (WebGL en el navegador; su motor está escrito en C++ y compilado a WebAssembly). Por eso funciona en Chrome, Edge, Firefox y Safari, en PC y en celular, sin instalar nada.
Las teselas de Marte (varios GB) están en la PC o en Google Drive: por eso el celular las pide a la PC por Wi-Fi. Para abrirlo desde cualquier lugar habría que subir las teselas a un hosting (por ejemplo Cloudflare R2 o un bucket de Google Cloud) y publicar la página.

## Qué tiene
- **Globo 3D de Marte** (Cesium Mars): relieve MOLA + HRSC de todo el planeta (~200 m) y, en Gale, imagen de 25 cm y terreno de 1 m.
- **Explorar**: el recorrido de Curiosity (soles 0-5073) por zonas de color, las 49 perforaciones con su mineralogía (CheMin), agua, CO₂, hierro y cloro.
- **Base en Gale**: tres sitios candidatos comparados con datos medidos (agua y carbonatos de los pozos cercanos, pendiente medida sobre el terreno 3D, atmósfera encima) y una zona de exploración de 100 km. Antecedente: Mars 3D Home (UNCuyo + San Luis, Space Apps 2022).
- **Órbitas y lunas**: MRO, Mars Odyssey, Mars Express, ExoMars TGO y Hope con su órbita calculada a partir de JPL Horizons, la misión de cada uno, qué aporta al mapa y su próximo paso sobre Gale. **Fobos y Deimos** con su órbita y su tamaño real (elementos de JPL Horizons del 14/11/2026).
- **Expedición** (riel: "Expedición"): círculo de 20 km alrededor de Curiosity (sol 5070). Se elige el inicio del rover presurizado y las muestras (en el mapa, al azar o un pozo); calcula la ruta más rápida que respeta las pendientes, deja al astronauta a no más de 30 min a pie de cada muestra y suma tiempo, salida con traje y dosis. "Simular en vivo" recorre la ruta con posición, altura, pendiente, dosis y tiempo fuera del rover. Capas en `capas/expedicion/` (de `herramientas/zona_expedicion.py`); el cálculo corre en un Web Worker (`expedicion.js`). Solo rutea donde hay DEM de 1 m del USGS (73% del círculo; 100% en los primeros 10 km).
- **Biblioteca**: las 49 perforaciones con ficha completa (minerales CheMin, química APXS, gases SAM con su estado de verificación, fotos, qué falta y archivos crudos), tabla para comparar pozos, temas para futuras misiones y fuentes. Se arma con `python armar_biblioteca.py RUTA_PERFORACIONES` desde la carpeta del Drive `Marte/Perforaciones Datos Crudos` y escribe `datos/biblioteca.json` y `capas/pozos/`. Los enlaces a archivos crudos funcionan solo si `servir.py` encuentra esa carpeta (variable `GALE_PERFORACIONES` o `G:`).
- **Línea de tiempo** (estilo Google Earth): desde la formación de Gale y los primeros telescopios hasta hoy, cada misión que llegó o intentó llegar a Marte, los sitios de aterrizaje que aparecen en el globo y los hallazgos de Curiosity. Datos y fuentes en `datos/linea_tiempo.json`; las edades geológicas están marcadas como estimadas.
- **Capas**: mostrar u ocultar elementos, colorear los pozos por recurso, exagerar el relieve y cargar una clave propia de Cesium ion.

## Clave de Cesium ion
Funciona con la clave de evaluación que trae Cesium. Para la presentación conviene una propia (gratis):
1. Entrar a https://ion.cesium.com (se puede iniciar sesión con GitHub).
2. Asset Depot → buscar "Cesium Mars" → Add to my assets.
3. Access Tokens → copiar el "Default" token.
4. En la app: Capas → pegar la clave → Guardar y recargar. Queda guardada solo en ese navegador.

## Cómo se arma
- El código está en `cabecera.html` (HTML y CSS), `_cuerpo.html` (globo y pestañas), `interfaz.js`, `biblioteca.js` y `linea.js`. `python _ensamblar.py` los une en `plantilla.html`. **No editar `plantilla.html` ni `index.html` a mano.**
- `python armar.py` mete los datos (`datos/entrada/`: perforaciones, zonas y recorrido oficial; `datos/orbitadores.json`, `datos/borde_gale.json`) en `plantilla.html`, revisa que estén completos y escribe `index.html`.
- `datos/entrada/perforaciones.geojson` es una copia propia: su esquema (mineralogía por pozo) no es el mismo que `data/curiosity/perforaciones.geojson` de la escena 3D.

## Medido, calculado y propuesto
| Qué | Tipo | Fuente |
| --- | --- | --- |
| Terreno e imagen 3D | medido | Cesium Mars (NASA, ESA, Cesium), asset 3644333 |
| Recorrido y posición de Curiosity | medido | NASA/JPL "Where is Curiosity?" |
| Mineralogía y química de los pozos | medido | NASA, Gale Crater Mineralogy and Geochemistry Database |
| Órbitas | cálculo propio | elementos de JPL Horizons del 14/11/2026 propagados como órbita de Kepler (precisa por horas; se actualiza volviendo a pedir los elementos) |
| Agua y CO₂ en minerales | cálculo propio | fórmula de cada mineral × % CheMin (mínimos) |
| Pendiente de los sitios | cálculo en vivo | alturas del terreno 3D a ±150 m |
| Zonas y sitios para la base | propuesta del equipo | con los datos anteriores |

Nota: los datos de NASA usan latitud planetocéntrica; la app la convierte a la latitud del elipsoide de Marte que usa Cesium.

## Capas de análisis del terreno (5 m)

En la pestaña **Capas → Análisis del terreno** se pueden pegar sobre el 3D: relieve en color, foto HiRISE coloreada por altura, zonas prohibidas por pendiente y radiación estimada. Cubren todo el área de Curiosity (33 × 57 km).

- Para verlas hay que abrir Gale Earth con **abrir.bat** (Windows) o **abrir.sh** (Mac/Linux): levantan un servidor local con Python. Abriendo `index.html` con doble clic el navegador no deja usar imágenes locales en 3D.
- Se generan con `herramientas/gale_datos.py procesar` desde el DEM de 1 m y el mosaico HiRISE de 25 cm del área MSL (USGS Astrogeology / NASA PDS). Las versiones completas (GeoTIFF para QGIS) están en el Drive del equipo, carpeta `Marte/gale_capas_5m`; el mosaico de 25 cm en `Marte/gale_25cm_hirise_color` (8 partes).
- `relieve_color` y `orto_color` son falso color (el color indica altura). La dosis es un cálculo propio y provisorio.

## Marte completo en 3D (globo propio)

Desde esta versión Gale Earth tiene su propio globo de todo Marte. Ya no depende del parche de alta resolución de Cesium Mars:

| Qué | Dónde | Resolución | Fuente |
|---|---|---|---|
| Imagen de todo el planeta | en vivo (internet) | 5 m/píxel | Mosaico global CTX (NASA/JPL/MSSS/Murray Lab), servicio NASA–Esri |
| Color | en vivo (internet) | 232 m/píxel | Viking MDIM 2.1 (NASA/USGS, Mars Trek); se combina con el brillo de CTX |
| Fotos de Gale | `teselas/hirise_25cm_teselas_*.zip` | 25 cm/píxel | HiRISE (NASA/JPL/Univ. of Arizona), mosaico USGS |
| Relieve de todo Marte | `teselas/terreno_marte_global_n0-7.zip` | ~1,3 km | HRSC/MOLA Blend 200 m (USGS) |
| Relieve del cráter Gale | `teselas/terreno_gale_n8-15.zip` | 160 m (cráter) y 5 m (zona de Curiosity) | HRSC/MOLA 200 m y DEM MSL 1 m (USGS) |

**Cómo abrirlo:** doble clic en `abrir.bat` (hace falta Python 3). `servir.py` busca los .zip en `gale-earth/teselas/` o en `G:\Mi unidad\Marte\teselas\` y los lee directo, sin descomprimir.
Si no encuentra las teselas, o si abrís `index.html` con doble clic, se usa Cesium Mars como antes. En **Capas → Motor 3D** se puede elegir el motor.

**Límites, para decirlo en la presentación:**
- No existe una foto de 25 cm de todo Marte: HiRISE cubrió una parte chica del planeta. Fuera de Gale, lo más fino que hay para todo Marte es CTX de 5 m.
- El relieve global es de unos 200 m en origen. El detalle de 5 m solo existe donde hay modelos de alta resolución, como la zona de Curiosity.
- El color es aproximado: brillo real de CTX con una paleta de Marte más el color de Viking. No es una foto en color.
- Las alturas están referidas al areoide en los datos originales; en el globo se pasan al elipsoide de Cesium sin corregir el areoide. Es una aproximación visual.

Las teselas se regeneran con los scripts de `gale-earth/herramientas/` (`teselas_terreno*.py`, `teselas_hirise.py`, `teselas_orto.py`). Para la página publicada, las teselas se sirven desde Cloudflare R2 con un service worker (`sw.js`): ver **NUBE.md**.

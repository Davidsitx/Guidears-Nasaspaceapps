# Arquitectura de GALE-3D

GALE-3D es **una sola página HTML** que funciona sin internet y sin servidor:
- terreno real, rutas, capas y fichas en una escena three.js;
- todo el código en `escena3d/plantilla.html`;
- todos los datos dentro de la misma página, como JSON.

## 1. Cómo se arma

```
data/… (terreno, rutas, Curiosity, mineralogía, globo, parametros.json)
gale-earth/datos/biblioteca.json (fichas de los 49 pozos, del compañero)
        │  python escena3d/armar.py
        ▼
escena3d/index.html  =  plantilla.html  +  const D = {…datos…}  +  three.js embebido (vendor/)
```

- `armar.py` lee los datos, los comprime (PNG en base64 para grillas y JPG para imágenes) y los mete en `D`.
  - Avisa en la consola qué incluyó, por ejemplo: `perforaciones: 49 de 49 con la Biblioteca`.
- `--globo-aparte` deja el globo (`globo.json`) y las fotos de pozos (`fotos_pozos.json`) en archivos aparte. Sirve para publicar con un tope de 16 MB por archivo; la página los pide con `fetch` al abrir.
- Si falta un dato opcional (CTX, Biblioteca, Pillow), se arma igual sin esa parte.

## 2. Partes de `plantilla.html`, en orden

1. **`<style>`:** variables, componentes y las secciones de cada etapa. Los bloques nuevos llevan un comentario `/* ===== … ===== */`.
2. **HTML:**
   - lienzo `#lienzo`;
   - panel `#panel` (apartados `details.sec`);
   - columna derecha `#derecha` (`#hud` "Datos en vivo" y `#flot` con los botones de manejo);
   - barra `#ctrl` y ventanitas `.pop`;
   - ficha `#ficha`, portada `#ayuda.portada`, tarjeta `#llegada`, visor `#visor`;
   - paneles de modo: `#fp` (primera persona), `#viaje`, `#expe`;
   - `#pareja` y `#wiki`.
3. **Script de la portada** (no es módulo). Corre apenas se lee la página, mientras la escena carga detrás, y expone `window.__portada`.
4. **Script principal** (módulo, con `await` arriba de todo). En orden:
   - datos `D` y parámetros (`PR`, `EVA`, `P`);
   - `FUENTES_URL` y `fq()`;
   - terreno de la zona (2 m) y de contexto (`CTX`, 12 m) y el globo (`GLOBO`);
   - capas, rutas (`rutas`, `procesar`, `dibujarRuta`), A* (`astar`, `planificar`), campo de regreso a pie;
   - rover y astronauta (modelos, `poseAstro`);
   - primera persona (`entrarFP`), visor, fichas, avisos;
   - travesía y viaje, perforaciones, expedición, clima;
   - misión en pareja, wiki y mundo abierto;
   - **bucle** `renderer.setAnimationLoop`;
   - al final, `window.__portada.listo({...})` y `window.__escena` (para pruebas).

> Ojo con el orden: el bucle se registra **después** del último `await` de arriba. Lo que se declara después del bucle existe antes del primer cuadro, porque no hay otro `await` en el medio. Si se suma un `await` arriba, no hay que usar `let` o `const` declarados más abajo dentro del bucle (error de zona muerta, TDZ).

## 3. Coordenadas y terreno

- **Mundo three.js en metros:** x = este, z = sur, y = elevación − `D.zmin`. El origen es el centro de la zona de hoy, sol 5070.
- **Zona de detalle:** grilla `W × H` de celdas de `CS` = 2 m, con estas grillas por celda:
  - `PEND` (pendiente en grados) y `PENDS` (suavizada 3 × 3);
  - `CIELO` (fracción de cielo tapado por el relieve);
  - `CLASE` (0 ok, 1 precaución 15–20°, 2 peligro 20–30°, 3 crítico > 30°, 4 posible arena).
- **Contexto** (`CTX`): toda la travesía a 12 m, con `CTX.Zc` (altura), `CTX.Cc` (cielo) y `CTX.Pc` (pendiente).
- **Funciones** (usar estas, no recalcular):

| Función | Qué devuelve |
| --- | --- |
| `alturaGlobal(x, z)` | altura en cualquier lado; zona o contexto, lo elige sola |
| `cieloGlobal(x, z)` | fracción de cielo tapado |
| `pendGlobal(x, z)` | pendiente en grados |
| `alturaEn(x, z)` | altura dentro de la zona |
| `celdaDe(x, z)` → `[c, f]` | índice `f * W + c` |
| `enZona(x, z)` | si el punto está dentro de la zona |
| `mundoALonLat(x, z)` / `lonlatAMundo(lon, lat)` | conversión a grados y de vuelta |
| `tobler(pendiente)` | factor de velocidad a pie (1 en llano) |
| `tasaDe(cielo)` | µSv/h con el reparo del relieve |

## 4. Estado global (lo que hay que conocer)

| Variable | Qué es |
| --- | --- |
| `est` | rover: `x`, `z`, `yaw`, `auto` (autonomía), `incl` |
| `yo` | astronauta a mano: `activo`, `x`, `z`, `yaw`, `t`, `dosis`, `campo` (regreso) |
| `control` | `'rover'` o `'astro'`: qué mueven W A S D y el joystick |
| `fp` | primera persona activa: `{ r: ruta, d: distancia, jugando, vista: 'ojos' o 'detras' }` o `null` |
| `viaje`, `expe`, `pareja` | modos con `activo` |
| `enTour` | recorrido guiado en curso |
| `destino`, `destinoModo` | destino con pin |
| `modoCam` | `'libre'`, `'rover'`, `'astro'` o `'cenital'` |
| `vuelo` | vuelo de cámara en curso (de `volarA`) |
| `rutas`, `paradasGeo`, `POZOS`, `EXP`, `TR` | datos ya procesados |
| `PR`, `EVA` | parámetros (de `data/parametros.json`, con valores por defecto) |

## 5. Ciclo de vida de un modo

Cada modo tiene `entrarX()` y `salirX()`, y nunca deja la escena a medias.

- **Al entrar:**
  - sale de los otros modos (`if (fp) salirFP(false); if (viaje.activo) salirViaje(); …`);
  - oculta `#ctrl` si el modo trae su propio panel;
  - llama a `setTimeout(actualizarFlot, 0)`.
- **Al salir:** devuelve el rover y el astronauta a donde estaban (cada modo guarda `est` al entrar) y muestra `#ctrl`.
- **`salirDeModos()`** sale de todos: lo usan "← Atrás" y la portada antes de bajar.
- **`actualizarFlot()`** decide qué botones de la derecha y qué joystick se ven según el modo.
- **El estado visible de la barra** se pone solo: un reloj cada 300 ms marca el modo activo con `aria-pressed`, y además resume los "Datos en vivo".

Modos que hay hoy:

| Modo | Función |
| --- | --- |
| Recorrido guiado | `tourIr(i)` |
| Caminar | `caminar()`, que es `entrarFP(ruta B, 'detras')` |
| Seguir al rover | `seguirRover()` |
| **Misión en pareja** | `entrarPareja()` → `entrarFP(ruta B, 'ojos')` más `tickPareja()` en cada cuadro |
| Viaje 2012 → hoy | `entrarViaje(d)` |
| Expedición | `entrarExpe('vehiculo' o 'astronauta')`; a mano con `manoExpe(true)` |
| Manejar | `setControl('astro' o 'rover')` |
| Mundo abierto | `mundoAbierto('astro' / 'rover' / 'libre')` |
| Wiki | `abrirWiki(seccion)` |

## 6. Portada ↔ escena

`window.__portada` tiene `estado(texto)`, `planeta(urlImagen)`, `listo(acciones, datos)`, `abrir(paso)`, `atras(entrada)` y `zonaAct()`.

- La escena, cuando termina de cargar, llama a `listo({ tour, caminar, seguir, pareja, manejar, libre, viaje, travLibre, expeRover, expeAstro, marte, abiertoAstro, abiertoRover, abiertoLibre, wiki, _planeta, _bajar })`.
  - Una acción en `null` no se ofrece en la portada.
- **Entradas** (paso 2): `me` (Mars Earth), `recorrido`, `abierto` y `wiki`. Las que tienen paso 3 están en el objeto `MODOS` del script de la portada, como grupos `[titulo, subtitulo, [[clave, icono, titulo, descripcion, recomendado], …]]`.
- **Al elegir:**
  1. La portada centra el globo.
  2. `_planeta()` pone la cámara en "Marte completo".
  3. La portada se funde.
  4. `_bajar(clave, fn)` vuela del planeta a la travesía y a la zona, y recién entonces corre `fn` (el modo).
- **Mars Earth** abre `../gale-earth/index.html` cuando la escena está al lado de `gale-earth/`, es decir, cuando corre desde el repo, con `servir.py` o en GitHub Pages. Gale Earth, sin hash, arranca en el espacio y vuela al cráter (`irA('gale')`). Si no está, usa `marte` (Marte completo en la escena).

## 7. Datos con fuente

- `FUENTES_URL = { clave: ['qué es', 'url'] }` y `fq('clave')` dibuja el "?" que abre la ventanita "Fuente del dato".
- Al sumar una fuente: agregarla a `FUENTES_URL`, sumarla a `docs/fuentes.md` y correr `python herramientas/listar_fuentes.py`.
- **Marcas:**
  - `<span class="prov">supuesto</span>` (o "provisorio", "propuesta propia");
  - "cálculo propio" para lo que calculamos;
  - **SIMULACIÓN** para lo inventado, como la perforación simulada.

## 8. Avisos de seguridad (`#alertas`)

- `agente()` dice quién está en el terreno: primera persona, astronauta a mano o rover en marcha.
- `condiciones(ag)` arma la lista de lo que pasa ahora. Cada condición es `{ clave, nivel, corto, titulo, detalle, aviso }`:
  - `nivel` es `info`, `precaucion`, `peligro` o `critico`;
  - con `aviso: true` sale como cartel; con `false`, solo como pastilla.
- `evaluarAlertas()` muestra **un solo cartel a la vez**, el más grave, y lo achica a pastilla a los 6 s. La × lo silencia 2 minutos.
- Para sumar un aviso se agrega un `pon(...)` en `condiciones`. Ejemplos ya hechos:
  - pendiente adelante a 30 m o menos (cartel a 14 m o menos);
  - destino riesgoso a 45 m o menos;
  - regreso a la base y margen del traje.
- La expedición a mano tiene su propio aviso en vivo (`#ex-alerta`), porque corre sobre el terreno de 12 m.

## 9. Recetas

### Sumar un modo nuevo

1. **HTML.** Si tiene panel, una `.caja` con id propio, oculta, y el estilo en un bloque CSS nuevo.
2. **JS.** `const miModo = { activo: false }`, más `entrarMiModo()` y `salirMiModo()`, siguiendo el ciclo de la sección 5. Si corre en cada cuadro, se llama desde el bucle con `if (miModo.activo) tickMiModo(dtReal)`.
3. **Salidas.** Sumarlo a `salirDeModos()`.
4. **Portada.** Agregarlo a `MODOS` en el script de la portada, en la entrada que corresponda, y la acción en `listo({...})`. Si baja a la zona, no va en la lista de `aZona` de `bajarDesdePlaneta`.
5. **Barra.** Si va en la barra, un `button.dk` con ícono y `<span>` corto, con `aria-pressed`, y el id en el reloj de estado (busca `'bTour', 'bCaminar'`).
6. **Documentación.** Este archivo, `pantallas.md` y `docs/notas.md`.

### Sumar una sección a la wiki

Agregar una línea a `WIKI`: `['clave', 'Título', () => \`<h2>…</h2>…\`]`.
- El contenido puede reutilizar el HTML de las fichas: `fichaParada(pa)`, `fichaPozo(p)`, `fichaExpe(e)`.
- Los botones de esas fichas funcionan solos porque se llama a `conectarBotones`.
- El buscador indexa el texto de cada sección la primera vez que se abre la wiki.

### Sumar un mensaje de las bases (misión en pareja)

En `avisosPareja(r, q)`, usar `una('clave-unica', () => msgPareja('base' | 'tierra' | 'a1' | 'a2', 'texto', 'alerta'?))`.
- `una()` hace que salga una sola vez por lugar o momento.
- Los mensajes de la Tierra muestran solos "enviado hace N min", con `demoraLuz()`.

### Sumar una capa sobre el terreno

1. Un `<label><input type="radio" name="capa" value="x">` en el apartado "Capa sobre el terreno".
2. Su color en `colorCapa(capa, k)`.
3. La leyenda en `INFO_CAPA`.
4. En el contexto de 12 m, el caso en `pintarContexto`.

## 10. Probar

No hay pruebas automáticas en el repo. Se prueba con Playwright, con WebGL por software (swiftshader). Va lento, de 1 a 3 cuadros por segundo: hay que esperar con `wait_for_function`, no con tiempos fijos.

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1366, "height": 768}); errores = []
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto("file:///…/escena3d/index.html", wait_until="commit")
    pg.wait_for_function("!document.getElementById('cargando')", timeout=900000, polling=1000)
    pg.evaluate("document.querySelector('[data-ir=\"2\"]').click()")          # portada → entradas
    pg.evaluate("document.querySelector('[data-zona=\"recorrido\"]').click()")
    pg.evaluate("document.querySelector('[data-modo=\"pareja\"]').click()")
    pg.wait_for_function("document.body.classList.contains('pareja')", timeout=300000, polling=1000)
    pg.screenshot(path="pareja.png", timeout=240000)
    print(errores)
```

`window.__escena` deja leer y mover el estado desde las pruebas: `expe`, `yo`, `control`, `POZOS`, `mostrarPozo`, `entrarExpe`, `fijarCamara` y más.

Antes de subir, conviene revisar dos cosas más:

```bash
# sintaxis de cada <script> de plantilla.html (node --check no lee de una tubería: va por archivo temporal)
python3 -c "import re,subprocess;s=open('escena3d/plantilla.html',encoding='utf-8').read();[print(i,(open('/tmp/chk.mjs','w').write(sc),subprocess.run(['node','--check','/tmp/chk.mjs'],capture_output=True,text=True).returncode)[1]) for i,sc in enumerate(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',s,re.S)) if len(sc)>50]"
# cada $('id') del código existe en el HTML (un id que falta rompe la carga con "Cannot read properties of null")
grep -o "\$('[a-zA-Z0-9-]*')" escena3d/plantilla.html | sort -u | sed "s/\$('//; s/')//" | while read id; do grep -q "id=\"$id\"" escena3d/plantilla.html || echo "falta $id"; done
```

## 11. Publicar

- **Página (artifact):**
  1. `python escena3d/armar.py --globo-aparte --salida <carpeta>/index.html`.
  2. Publicar `index.html`, `globo.json` y `fotos_pozos.json`; cada archivo tiene que pesar menos de 16 MB.
- **Repo:** rama `david/union-gale-earth` → PR a `main`. Con GitHub Pages, la raíz entra por Gale Earth (`index.html` de la raíz).
- **Unión con Gale Earth:**
  - `servir.py` sirve `/gale-earth/` y `/escena3d/`;
  - Gale Earth entra a la escena con `#desde-gale-earth`;
  - la escena vuelve con `../gale-earth/index.html#curiosity`, o sin hash para la vista espacial.

## Misión en Gale Earth (pantalla única, desde el 15/11)

- **De dónde salen los datos:** `herramientas/exportar_mision.py` abre `escena3d/index.html` sin ventana (Playwright) y llama a dos funciones de la escena, `window.__exportarMision()` y `window.__exportarModelos(GLTFExporter)`:
  - la primera escribe `gale-earth/datos/mision.json`: paradas con su ficha y su muestra simulada en HTML, rutas con un punto cada 2 m (lon, lat, distancia, elevación, pendiente de marcha y del suelo, cielo tapado, horas, µSv, terreno, CRISM), expedición, Base Gale, GX-2, estaciones, parámetros y `FUENTES_URL`;
  - la segunda escribe `gale-earth/capas/mision/*.glb`. Los modelos salen en reposo, girados para que el este de la escena sea el "adelante" de glTF, y con las piezas móviles nombradas: `rueda_0` a `rueda_5`, `muslo_i`, `rodilla_i`, `tobillo_i`, `hombro_i`, `codo_i`, `cadera`, `torso`, `casco`, `lidar` y `rotor_i`.
- **Rover tripulado GX-3:** el modelo sale de la escena (`RT`, estacionado al lado del garaje de la base) con `pata_0`…`pata_5`, `rueda_0`…`rueda_11`, `ala_0`, `ala_1`, `dron`, `rotor_0`, `rotor_1`, `lidar`, `carro`, `sarta`, `mecha`, `barra_0`…`barra_2` y `traje_0`, `traje_1`. Gale Earth anima esas piezas con `node.matrix` (la `sarta` del taladro se estira con una escala sobre la original de 0,4 m) y esconde los trajes que salieron a caminar.
- **Ruta T (base → zona de hoy):** al final de `exportar_mision.py` corre `herramientas/ruta_base.py`. Hace A* sobre `data/terreno/travesia_sur` (pendiente ≤ 20°, arena probable penalizada), suaviza el camino y lo remuestrea cada 5 m. Agrega la energía acumulada de la batería como campo 11 de cada punto y la escribe en `mision.json` y en `data/rutas/ruta_base_gx3.geojson`. Para la ruta C, `mision.js` calcula ese campo al cargar, con los mismos parámetros (`data/parametros.json` → `vehiculo_tripulado`).
- **Cuándo correrlo:** si cambia algo de la misión en la escena (paradas, rutas, textos, modelos). Primero `python escena3d/armar.py`, después `python herramientas/exportar_mision.py`, y en `gale-earth/`: `python _ensamblar.py` y `python armar.py`.
- **`gale-earth/mision.js`:**
  - carteles y rutas en un `CustomDataSource('mision')`;
  - modelos como `Cesium.Model` (se apoyan en el terreno con cuatro muestras de altura, como la suspensión, y se animan con `node.matrix`);
  - un solo bucle en `scene.preRender`;
  - envuelve `irA` y el clic del globo, sin tocar el código del compañero.
- **Probar sin internet:** Cesium del paquete npm (`npm pack cesium@1.147.0`) y un terreno de prueba armado con nuestros DEM en el mismo formato de `teselas/terreno` (cabecera Float32 más Uint16 65 × 65). Los scripts de prueba no están en el repo: pedirle a Claude que los arme de nuevo si hace falta.

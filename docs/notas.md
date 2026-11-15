# Notas de traspaso

Al terminar algo, agregar arriba: fecha, quién, qué hizo, qué falta, qué decidió. El otro Claude lee esto al empezar.

## 2026-11-15 noche (5) · compañero (con Claude) · RIEL CON SU TAMAÑO DE SIEMPRE
- Pedido del equipo: el riel no se achica. Mantiene íconos con nombre y el espaciado de antes; si la pantalla es baja, se desplaza con la rueda (barra fina). Lo demás de la tanda (4) sigue: botones de la derecha, barra del planificador en dos columnas y botones de arriba en segunda fila en pantallas angostas.

## 2026-11-15 noche (4) · compañero (con Claude) · PANTALLAS DE CUALQUIER TAMAÑO
- En notebooks (1366 × 768 deja ~650 px de alto en el navegador) el riel no entraba: Ajustes, idioma, Ayuda y Pantalla quedaban fuera de la vista. Con el planificador abierto, su barra y los botones de la derecha se salían por arriba; a 1024 px de ancho los botones de arriba se pisaban con "Misión Curiosity · hasta hoy".
- Reglas por alto y ancho al final de `maps-in-mars/maps.js`: hasta 900 px de alto el riel y los botones se compactan y la barra del planificador pasa a dos columnas; hasta 680 px el riel queda solo con íconos (el nombre sale al pasar el mouse); hasta 560 px se ocultan el logo, Pantalla y +/−. Hasta 1200 px de ancho, los botones de arriba bajan a una segunda fila. El riel además se puede desplazar como último recurso.
- Probado automáticamente en 1024×600, 1280×620, 1366×657, 1440×760, 1536×730 y 1920×940, en inicio, misión hasta hoy, nueva misión y planificador: nada se sale de la pantalla ni se superpone.

## 2026-11-15 noche (3) · compañero (con Claude) · TERRENO SIN HUECOS NEGROS, PMR DESDE LA BASE Y BARRA SIN EMOJIS
- **Causa de los rectángulos negros:** una tesela de terreno cuya foto CTX todavía no había llegado (o no llegaba) se dibujaba negra. Ahora hay un **fondo de seguridad**: todo Marte en una sola imagen (color Viking con la misma paleta, 2048 × 1024) cargada al arrancar, debajo de CTX. Lo que falte se ve color Marte, nunca negro. Probado bajando al PMR en la base: antes aparecía el rectángulo negro, ahora no.
- **Otras defensas (`_cuerpo.html`, `maps.js`):** (1) caché de teselas de 1500 a 400 (con tres capas de 512 px llenaba la memoria de la placa de video; 600 que forzaba `maps.js` también se sacó); (2) CTX reintenta 3 veces si falla la red antes de quedarse con el fondo; (3) una tesela de terreno cortada o que falla usa la de arriba ampliada (nunca un hueco); (4) los lados de atrás del terreno se pintan color Marte; (5) **guardián**: cada 2 s mira la imagen; si hay negro puro sobre Marte 6 s seguidos, libera memoria y vuelve a pedir las teselas (`GUARDIAN` en la consola); (6) **cortina** "Cargando el terreno de cerca…" mientras la cámara queda debajo de una tesela gruesa al bajar al suelo; (7) si el navegador pierde WebGL, recarga solo.
- **PMR desde la base:** la ruta (y todo lo pegado al suelo) se pintaba también encima del PMR, la base y los astronautas. Ahora las líneas y zonas pegadas al suelo se pintan solo sobre el terreno (`ClassificationType.TERRAIN`, parche general en `_cuerpo.html`). El recorrido del planificador arranca solo apenas llega el terreno de cerca (antes había dos botones "Salir": la tarjeta de arriba y la barra). Tramos ya calculados quedan en memoria: al mover un punto solo se recalcula ese tramo.
- **Barra del planificador:** íconos de línea iguales a los del riel izquierdo (Material Icons, Apache 2.0), mismo fondo, borde y resaltado naranja. Sin emojis en el panel del planificador, en "Manejar…" ni en las tarjetas del PMR (`mision.js`, solo texto: avisarle a David).
- **Teselas en la nube (Hugging Face `ChuchuTEA/gale-earth-teselas`):** revisado contra el manifiesto: están los 22 .zip de terreno, ortofoto y HiRISE con sus 22 índices. Falta solo Jezero (`terreno_jezero_n10-13.zip`, opcional: sin él Jezero se ve con el relieve global). Probado el camino "otra computadora": servidor sin la carpeta `teselas` y una copia local de la nube con la misma estructura → el globo carga igual.
- **Falta:** publicar la página (decisión del equipo) y, si se quiere Jezero en detalle, `subir_hf.bat`.

## 2026-11-15 noche (2) · compañero (con Claude) · PRUEBA DE FLUJOS Y ÚLTIMOS ARREGLOS
- **Una sola barra abajo:** la línea de tiempo y la barra de la misión nunca se ven juntas, venga de donde venga (gana la última que se abrió; observadores en `maps.js`). "Misión Curiosity · hasta hoy" ya no entra a la misión nueva (otro módulo le ponía su propio clic).
- **Planificador:** la barra de herramientas pasó a la derecha, arriba de la brújula, más chica y plegable (✎); se oculta durante los recorridos. **Guardar recorrido** con título; lista de **recorridos guardados** con casilla para verlos u ocultarlos en el mapa (también con el planificador cerrado). **Informe PDF** tipo informe científico: resumen, mapa, objetivo y justificación de cada punto (hallazgo de la perforación con fuente, minerales, análisis de agua/oxicloros/nitratos, terreno y dosis en el punto), tramos, notas, áreas, método, supuestos y fuentes (se guarda con Imprimir → Guardar como PDF). **Zonas de peligro** (pendiente) prendidas mientras se planifica. La medida usa el rayo contra el terreno: probado, 591 m medidos contra 592 m reales. Al llegar a cada punto el recorrido frena y muestra el cartel de la parada. El terreno de 12 m se baja de antemano.
- **Wiki, fuentes:** 49/49 fichas completas; CheMin y APXS figuran como "45/45 publicados · 4 aún sin publicar por NASA" (los 4 más nuevos tienen fotos y hallazgo, no datos de laboratorio).
- **Tour:** la calidad automática no cambia nada durante el tour (cambiar el antialias daba un tirón); en el último paso (siguiendo a MRO) se pide menos detalle del suelo; caché de teselas más grande (600) para que no aparezcan a parches al volver a un lugar.
- **Prueba de flujos (automática, sin errores en consola):** 16 pasos con botones reales: inicio, misión hasta hoy, nueva misión, historia, 49 perforaciones, sitios, planificador, historia encima del planificador, medir, recorrido del planificador con parada, pareja, Wiki (fuentes, análisis, 84 fuentes consultadas) y tutorial de 13 pasos. Ninguna superposición entre barras, botones de la derecha, reproductor y tarjetas. Tour completo de 9 pasos de principio a fin.

## 2026-11-15 noche · David (con Claude) · README: INSTALACIÓN EN INGLÉS Y CASTELLANO
- `david/union-gale-earth` avanzó hasta `companero/maps-in-mars` (sin conflictos: partía de nuestro último commit). El README describe Maps in Mars (`maps-in-mars/`).
- **README de la raíz:**
  - **Probar en línea:** GitHub Pages.
  - **Instalar en la compu:** requisitos, ZIP o Git, y teselas desde el dataset público de Hugging Face. Los `.zip` están en la raíz del dataset; `snapshot_download` con `local_dir='teselas'` los deja en `maps-in-mars/teselas/`.
  - **Uso:** arrancar con `abrir.bat` o `servir.py`, lista para comprobar, celulares en el mismo Wi-Fi, túnel de Cloudflare, actualizar.
  - **Al final:** problemas frecuentes, otras apps del repo y notas para desarrollar.
  - Va en inglés para el jurado y en castellano abajo. "Contents" quedó al día con las carpetas actuales.
- **Falta:** fusionar a `main` para que el README y el ZIP de `main` muestren Maps in Mars. Comprobar el comando de Hugging Face en una PC con internet (desde acá no hay acceso a huggingface.co).

## 2026-11-15 noche · compañero (con Claude) · PLANIFICADOR DE MISIÓN, WIKI TRABAJADA, DÍA Y NOCHE EN VIVO Y ARREGLOS
- **Planificador de misión (`maps-in-mars/planificador.js`, nuevo; se abre con "Nuevo recorrido"):** barra vertical de herramientas (mano, puntos de ruta, pin con nota, medir, pincel, rectángulo, círculo, borrar, deshacer). Punto 0 = Base Gale; los demás en el orden en que se ponen; tocar una perforación (o elegirla de la lista) la toma como punto. La ruta más segura sale del A* del PMR, tramo por tramo, a pie o en PMR (10 km/h). Muestra distancia, tiempo en marcha y en paradas (paradas de 1 h por defecto, editable por punto; supuesto), velocidad media, dosis (marcha + paradas; sin blindaje del vehículo, cota superior), energía y % de batería, subida/bajada, pendiente máxima, punto más lejano y avisos. Cada punto tiene nota. Pincel cerrado, rectángulo y círculo dan área y medidas.
- **Proyectos guardados** en el navegador (`localStorage`: siguen al actualizar la app) y exportables/importables como JSON. **Caminos candidatos:** al terminar un recorrido simulado que vuelve a la base, el camino se guarda como candidato a camino seguro, se dibuja en verde y el A* lo prefiere (−30 % de costo, cambio chico en `pmr.js`).
- **Manejo a mano** también para el rover (Curiosity o GX-2, tiempo ×30) y el PMR, no solo el astronauta. En la barra de la misión, tocar "Curiosity" o "GX-2" lleva al rover y ofrece manejarlo o seguir la ruta A (antes solo cambiaba el modelo y parecía que no hacía nada).
- **Wiki:** la tarjeta "Temas para futuras misiones" (documento interno, "no tratado") pasa a **"Lo que encontramos en los datos"**: análisis hechos con los datos (agua que sale bajo 300 °C en 34 de 37 pozos; margen mediano de 303 °C antes del primer gas ácido; 8 pozos con agua fácil y limpia según tres criterios; O₂+HCl; NO; metales y fósforo; correlación con la altura: SO₃ 0,48, amorfo 0,59, arcillas −0,02). Script: `maps-in-mars/herramientas/analisis_wiki.py` → `datos/analisis.json`. Nueva **"Todas las fuentes consultadas"** (84 enlaces de `docs/fuentes.md` y `docs/fuentes-enlaces.md`, por sitio, con filtro) → `datos/fuentes_consultadas.json`. Se sacó la mención a `armar_biblioteca.py` de la vista.
- **Día y noche:** queda **en vivo** y prendido de entrada (Mars24), más suave de cerca para que el terreno se lea; se puede apagar en Capas. La capa de radiación suma "Ahora": usa día o noche según la hora real en Gale (también se puede fijar a mano).
- **Arreglos:** la barra de la misión ya no se pisa con la línea de tiempo (abrir una cierra la otra); los nombres de naves y lugares del otro lado del planeta se ocultan (antes se veían a través de Marte); lo dibujado en el planificador no se ve desde la órbita.

## 2026-11-15 tarde-noche · compañero (con Claude) · FLUIDEZ 2, CARGA CON MARTE GIRANDO, TUTORIAL, BOTONES Y PMR
- **Carga:** Marte gira detrás del logo mientras bajan las teselas y los datos de la misión (barra de avance real). Con todo listo frena con Gale de frente, se aclara y la cámara baja al cráter desde ahí: el primer vuelo ya no arranca a medio cargar. Durante la carga no se muestran órbitas ni carteles (`introGiro` en `_cuerpo.html`).
- **Tutorial (`maps-in-mars/tutorial.js`, nuevo):** la primera vez, al llegar a Gale, pregunta si querés ver cómo se usa. Pantalla oscura con un hueco que ilumina cada parte (13 pasos: buscador, 49 perforaciones, nuevo recorrido, nueva misión, misión hasta hoy, sitios, capas, wiki, historia, tour, ajustes). Teclas ← → Enter Esc.
- **Ajustes (antes "Motor"):** ver el tutorial, empezar la presentación desde cero, calidad (automática / alta / fluida), idioma y, abajo, el motor del globo.
- **Fluidez (todo en `maps.js`):** (1) calidad automática: si el 75 % de los cuadros tarda más de 28 ms, baja el antialias (4 → 2 → 1) y después la resolución al 80 %; si sobra, vuelve a subir. (2) Las líneas pegadas al suelo se dibujan simplificadas (Douglas-Peucker, 0,8 m): eran más de 15.000 vértices y es de lo que más pesa al moverse; los datos de las rutas no cambian. (3) Lo de antes (menos detalle mientras la cámara se mueve) sigue.
- **Pines del otro lado de Marte (tour y vista desde lejos):** los pines sin prueba de profundidad se veían a través del planeta; ahora, si quedan detrás del horizonte, el globo los tapa (mismo criterio que los topónimos).
- **Cámara en los recorridos:** rueda para alejarse hasta ~14 km y ver el recorrido entero (cuanto más lejos, más desde arriba), arrastrar para girar e inclinar, doble clic para volver. En "Ojos", la rueda pasa a "Detrás".
- **Botones:** arriba, "Misión Curiosity" pasa a **"Nueva misión"** (rutas planificadas). Arriba a la derecha, **"Misión Curiosity · hasta hoy"**: recorrido real, 49 perforaciones y línea de tiempo. **"49 perforaciones"** ahora vuela al recorrido. En el riel, **"Base" pasa a "Sitios"** (análisis de sitios, vuela a verlos todos, con tarjeta a la Base Gale); la Base Gale en sí queda en la barra de la misión.
- **PMR (área de David, cambios chicos en `pmr.js` y `herramientas/ruta_base.py`):** (1) el A* se pegaba al borde oeste del terreno con datos (por eso el regreso y la ruta T parecían ir "por fuera"): ahora cobra más a menos de 30 celdas (360 m) del borde. Ruta T recalculada: 13,78 km (antes 14,11). (2) El PMR estaciona a 40 m de cada parada (antes 130 m, quedaba lejos); 130 m solo en la estación magnética (magnetómetro a más de 100 m del vehículo). Supuestos, marcados como provisorios.

## 2026-11-15 noche · compañero (con Claude) · CARPETA maps-in-mars/, TOUR SIN SALTOS Y REVISIÓN
- **La carpeta `gale-earth/` pasa a llamarse `maps-in-mars/`** (pedido del equipo: lo ve el jurado). Se actualizaron las rutas en la entrada de la raíz, la escena clásica (`escena3d/plantilla.html` y `armar.py`), las herramientas (`exportar_mision.py`, `ruta_base.py`, `terreno_pmr.py`, `travesia_datos.py`, `unificar_pozos.py`, `globo.py`), `.gitignore` y los documentos vivos. `servir.py` acepta los dos prefijos (`/maps-in-mars/` y el viejo `/gale-earth/`). No cambian: el dataset de Hugging Face `gale-earth-teselas`, la marca `#desde-gale-earth` ni la caché del trabajador de servicio. **David: si tenés cambios en `gale-earth/`, git los lleva solo al fusionar (detecta el cambio de nombre); los scripts nuevos tienen que apuntar a `maps-in-mars/`.**
- **Tour: los "saltos" sobre Gale.** Medido cuadro a cuadro: en el paso 3 la cámara frenaba en el aire entre tramo y tramo (esperaba la altura del terreno de cada punto) y cada vuelo encadenado subía y bajaba 1–2 km. Ahora todas las alturas se piden juntas al empezar, y el paso 3 y el 8 son un único vuelo continuo por una curva suave (Catmull-Rom, `tCamino` en `tour.js`), con arranque y frenado suaves. El paso 3 sigue 13 puntos del recorrido real. En el paso 8 la cámara miraba hacia atrás (rumbo invertido): corregido. Las rutas se dibujan mientras se ve la base, no al llegar.
- **Otros arreglos:** el detalle del terreno en reposo ya no puede quedar bajo si el tour empieza con la cámara en movimiento; si se corta el tour, vuelven las órbitas y el estado de "Misión Curiosity"; "Nuevo recorrido" muestra u oculta tu recorrido al tocarlo de nuevo; la pastilla del reproductor dice "Tú/You" en vez de "U1"; título de la raíz y README con el nombre nuevo; la pendiente de la base en el tour va marcada como cálculo propio.
- **Revisión (sin errores en consola, en inglés y castellano):** rutas A, B, pareja, caminata C, T, expedición (rover y a pie), guía del PMR, manejo libre, pestañas, nuevo recorrido con ruta más segura y astronauta a mano.
- **Queda a decidir (área de David):** la escena clásica todavía dice "GALE-3D" en su título y portada, y la raíz enlaza a ella.

## 2026-11-15 tarde (3) · compañero (con Claude) · MAPS IN MARS: BASE EN EL MAPA, NUEVO RECORRIDO, ASTRONAUTA A MANO, TOUR Y FLUIDEZ
- **Pidió:** tomar la copia del Escritorio (`Marte/`) como punto de partida, y una tanda de mejoras. La copia del Escritorio resultó idéntica a `origin/main` (mismos md5) más los zip de teselas: no había referencias nuevas que traer.
- **Hizo (casi todo en el archivo nuevo `gale-earth/maps.js`, que envuelve funciones de `mision.js` y `pmr.js` sin cambiarlas; `_ensamblar.py` lo suma al final):**
  - **Nombre del producto: Maps in Mars** (antes Gale Earth) en título, carga, logo, manifiesto, tour, diccionarios, `mision.json` y su exportador, escena clásica y entrada de la raíz. La carpeta sigue llamándose `gale-earth/` para no romper rutas.
  - **Botón "Base" del panel:** además de la tabla de sitios, vuela a la Base Gale (Zona 2) y deja su pin visible; tarjeta arriba que abre la ficha de la base.
  - **Interruptores de arriba:** "49 perforaciones" (igual), **"Nuevo recorrido"** (nuevo) y **"Misión Curiosity"** (antes "Recorrido nuevo": prende nuestras rutas y entra a Curiosity hoy).
  - **Nuevo recorrido:** el usuario pone pines (1 o más, hasta 20) dentro del terreno de 12 m; se unen en línea recta en su orden, desde Curiosity hoy o desde la Base Gale, a pie o en PMR, con vuelta opcional. Cada tramo se colorea (firme / difícil: arena o a menos de 5° del límite / peligroso: más de 20° / sin datos) y salen avisos con metros y pendiente máxima, más tiempo de salida y distancia al refugio (EVA 6 h, 30 min; supuestos de `parametros`). Botón **"Ruta más segura"** (A* de `pmr.js` por los mismos pines) y **"Recorrer ▶"** (lo recorre con el reproductor de la misión; cada pin es una parada).
  - **Por qué había más de una línea al caminar:** B y las caminatas de C son ida y vuelta, y la vuelta es un tramo calculado aparte (la ruta más segura desde la última parada al PMR); medido en `mision.json`, B se separa hasta 42 m y C-cam1 hasta 72 m. Además, en la guía del PMR se veían todos los tramos juntos. Ahora: **ida llena, vuelta punteada**, leyenda en el reproductor, y en la guía solo se ve el tramo en curso.
  - **Misión en pareja (y toda caminata):** botón **"Manejar al astronauta"** (W A S D / flechas / pad, Shift ×10). Frena en pendientes > 20°, va más lento en arena, sigue contando dosis y tiempo, avisa al pasar 30 min del PMR o el 75 % de la salida; visor y pantalla del PMR se actualizan. Al soltarlo vuelve a la ruta en el punto más cercano.
  - **Tour (9 pasos):** paso 7 paneo de 150° alrededor de la Base Gale; paso 8 los recorridos nuevos parada por parada (S, B1, A2, A4, E2, E3, E5) con sus nombres de los datos.
  - **Fluidez:** mientras la cámara se mueve se pide menos detalle (error de pantalla 2,6 px en vez de 1,5) y se vuelve al detalle completo 350 ms después de parar; `loadingDescendantLimit` 40 → 20; `?fps` muestra cuadros por segundo para medir.
- **Para David:** no toqué `mision.js` ni `pmr.js` salvo el cambio de nombre en textos. Los envoltorios están en `maps.js` (miVisibles, miCapa, miModo, miSalirModo, miTick). Si cambiás esos nombres, avisame.
- **Falta:** probar en la PC con `abrir.bat` (en el contenedor se probó sin internet, con WebGL por software); medir FPS antes/después con `?fps`.

## 2026-11-15 mediodía (2) · Compañero (con Claude) · CIERRE DE LO ABIERTO
- **Base ODR:** desde la PC del compañero no responde, ni directo ni por su DOI (10.48484/JN48-YW52 redirige al mismo sitio). Lo demás de NASA abre bien.
  - Respaldo agregado: cada ficha de la Wiki con CheMin tiene ahora el botón **"Minerales en el PDS de NASA"**, que abre el archivo oficial de CheMin (`mslcmn_1xxx/data/rdr5/`). Se verificó que los 59 archivos existen.
- **Nevado Sajama 2:** el PDS todavía no publicó su mineralogía; la última es la de Nevado Sajama (sol 4720). La app está al día.
- **Jezero:** índices regenerados en la PC (`teselas/nube/manifest.json` ya incluye `terreno_jezero_n10-13.zip` y el rango de Jezero en `meta.json`). Falta que el compañero corra `subir_hf.bat`, porque pide su token.
- **PR #10** abierto a main: `companero/verificacion-unificada`.

## 2026-11-15 mediodía · Compañero (con Claude) · UNA SOLA VERDAD PARA LOS 49 POZOS + FUENTES SECUNDARIAS REEMPLAZADAS
- **Fuente única de los pozos: la Wiki (`gale-earth/datos/biblioteca.json`).**
  - `herramientas/unificar_pozos.py` copia el hallazgo, la fuente y la marca de verificado a:
    - `data/curiosity/perforaciones_hallazgos.json`: la unidad y las campañas de David quedan igual;
    - `data/curiosity/perforaciones.geojson`: la escena 3D clásica;
    - `gale-earth/datos/entrada/perforaciones.geojson`: los pines del globo y la guía del PMR.
  - Con `--revisar` solo compara. `gale-earth/armar.py` lo corre solo y avisa si algo dejó de coincidir.
  - `herramientas/travesia_datos.py` ahora lee el hallazgo y la fuente de la Wiki, así que regenerar la escena no vuelve atrás.
- **Escena 3D clásica rearmada:** 49 de 49 verificados. Ya no aparece "a verificar" en el viaje por soles, los avisos de llegada ni la perforación más cercana. La dosis de respaldo pasa de 0,67 a 0,64, como en `parametros.json`.
- **Fuentes secundarias reemplazadas por oficiales:**
  - récord de 31° en Greenheugh: comunicado de NASA/JPL del 20/3/2020, en lugar de Space.com;
  - por qué se eligió Gale: Golombek et al. 2012 (doi:10.1007/s11214-012-9916-y) y NASA del 12/4/2012, en lugar de Smithsonian y Spaceflight Now;
  - yardangs: PIA25629;
  - polvo en los trajes: DOI 10.1073/pnas.2620747123.
  - Queda Space.com solo como apoyo de Aeolus, que tiene también el comunicado de NASA.
- **Rama `companero/verificacion-unificada`**: sale de main (PR #9) y suma todo lo de esta mañana.
- **A la PC le pasé la versión unida:** `plantilla.html`, `servir.py`, `datos/mision.json`, terreno y cielo del PMR, modelos `.glb` de la misión y logos.
- **Falta (David):**
  - revisar que los textos de la Wiki le sirvan para la escena (son los mismos 49, ya verificados);
  - si hace falta otra redacción, cambiarla en la Wiki y correr `unificar_pozos.py`.

## 2026-11-15 mañana (12) · Compañero (con Claude) · VERIFICACIÓN DE LOS 59 HALLAZGOS DE POZOS + QUÍMICA APXS CORREGIDA + BIBLIOTECA EN INGLÉS
- **Los 37 "a verificar" de `data/curiosity/perforaciones_hallazgos.json` (David) quedaron verificados.**
  - Cada uno tiene ahora `verificado: true`, la fecha y su fuente concreta (artículo con DOI o página de NASA).
  - Textos corregidos:
    - Quela: el sitio de la medición de RAD quedó confirmado (butte M12, soles 1456-1467; el pozo es del sol 1464).
    - Aberlady y Kilmarie: no tienen "el récord de arcillas"; el máximo de los 49 es Glen Etive 1, con 34 %.
    - Glen Etive 1: unidad de arcillas fracturada.
    - Mary Anning 3: se suma el resultado TMAH publicado en abril de 2026.
    - Mineral King: es roca de capas **oscuras**, no clara.
  - **David:** hay que volver a armar la escena para que desaparezca el cartel "a verificar":
    1. `python herramientas/travesia_datos.py`
    2. `python escena3d/armar.py`
- **Los 22 hallazgos de la Biblioteca citados con artículo también están verificados.** Cambios:
  - fuentes más precisas: Thorpe 2022, Rudolph 2022, Bennett 2023, Chipera 2023 (Canaima, en lugar de "Bristow y Chipera, AHED") y Williams 2026;
  - Edinburgh: 7 % de esmectita, no 10 %;
  - Rock Hall: Cl 2,3 %;
  - Stoer: "más hematita de los 49" en lugar de "más óxido de hierro de la misión".
- **Error de datos encontrado y corregido: química APXS cruzada en la Biblioteca.**
  - Greenhorn mostraba la química de Big Sky; Oudam, la de Okoruso; Nevado Sajama, la de Tesoro del Pangal.
  - Ahora los 27 pozos con diferencias toman el producto RDR oficial del PDS, y el objetivo sale del registro de actividades del PDS (`extras/msl_apxs_activities_*.csv`).
  - Los textos ya traían los valores correctos (por ejemplo, Buckskin 73,7 % de SiO2 y Greenhorn 11,9 % de SO3).
  - Para que no vuelva a pasar, `armar_biblioteca.py` aplica `datos/apxs_rdr_correcciones.json` y `datos/hallazgos_verificados.json`.
- **Biblioteca en inglés:** las fichas de pozo seguían con títulos y notas en castellano.
  - Se agregaron unas 60 entradas al diccionario.
  - `idioma.js` ahora tiene reglas por frase para los textos que se repiten con distintos números (`datos/idioma_en_reglas.json`, que `_ensamblar.py` inyecta en la página).
- Copiado a la PC y rearmado.

## 2026-11-15 tarde · David (con Claude) · PMR, GUÍA DE LA EXPEDICIÓN, VISOR + PANTALLA, INTERRUPTORES, WIKI Y LOGO
- **Pidió David:** tomar como referencia la lámina y la guía de estilo (ahora en `docs/desarrollo/guia-de-estilo.md` y `docs/img/estilo/lamina_estilo.html`) para los pines; no tocar la columna izquierda ni los controles de abajo a la derecha; sí las barras de arriba y abajo.
- **Hizo (todo en `gale-earth/mision.js` y el archivo nuevo `gale-earth/pmr.js`; `_ensamblar.py` suma los dos):**
  - **Interruptores arriba**, a la derecha del buscador: **"49 perforaciones"** y **"Recorrido nuevo"** (nuestras rutas A, B, C, T, expedición y sus paradas). Los dos arrancan **apagados**. El de perforaciones queda sincronizado con la casilla de Capas; el recorrido real de Curiosity sigue en Capas.
  - **Pines con la forma de la lámina:** círculo de 34 px con borde #1b1210 de 3 px, aro claro, código corto y palito al suelo. Las 49 perforaciones siguen con el color de zona (o el mineral elegido en Capas); se envuelve `repintar()` sin cambiar el código del compañero.
  - **GX-3 → PMR (rover presurizado).** Renombrado en la escena, las herramientas (`ruta_base.py` → `data/rutas/ruta_base_pmr.geojson`) y Gale Earth. Ficha con la descripción de la misión que mandó David, tanques de agua que **no** son refugio de tormenta (paredes ~1 g/cm²; un refugio necesita ~20 g/cm²) e instrumentos (sismómetro y magnetómetro, con InSight como fuente).
  - **Guía de la expedición (`pmr.js`):** rutas más seguras calculadas **en el navegador** con A* sobre `datos/terreno_pmr.png` (celdas de 12 m; lo genera `herramientas/terreno_pmr.py`).
    - **Recomendada:** John Klein, Windjana, Buckskin, Mary Anning, Tapo Caparo y Valle de la Luna, más una estación magnética y una sísmica en los dos tramos más largos (llano < 8°, sin arena), termina en Curiosity hoy (muestras) y vuelve al hábitat. Hoy da 36,7 km en el PMR, 2,3 km a pie, 11 h 29 min, ~300 µSv y 25 % de batería.
    - **Armar mi guía:** perforaciones (lista con buscador) y puntos tocados en el mapa (con perforar, sismómetro o magnetómetro), ordenados por la travesía, siempre con Curiosity hoy al final y vuelta opcional.
    - **Ir a una perforación:** cualquiera de las 49, desde donde esté el PMR.
    - En cada parada el PMR estaciona a ~130 m y uno sale a pie por el suitport mientras el otro queda en la cabina. A pie: perforar 2 m (taladro portátil, como Apolo), instalar el instrumento o tomar muestras (45 min, supuesto).
    - Cada tramo muestra la ruta más segura, la pendiente, la dosis acumulada, el tiempo al refugio (a pie: volver al PMR; en el PMR: al hábitat) y el motivo científico.
  - **Manejo libre:** W A S D o flechas (o los botones), Shift ×10; no pasa pendientes de más de 20°, va a la mitad en arena y avisa. El PMR queda donde lo dejaste.
  - **Misión en pareja sin cartas encimadas:** el que camina usa el **visor del casco** (arriba a la izquierda, monoespaciado cian como en la guía) y el que queda en el PMR ve todo en la **pantalla del PMR** (derecha, sin tapar los controles de Gale Earth): minimapa con relieve, tramo, pendiente, dosis, refugio, batería, motivo científico y comunicaciones. La tarjeta y el reproductor se centran en el espacio libre. En el celular la pantalla va detrás de un botón.
  - **"Biblioteca" → "Wiki"** en la columna (solo el nombre). Botón **"Abrir en otra pantalla"** en el panel: abre `index.html?wiki=…` en otra pestaña, solo con la ficha, sin globo ni barras. La portada de la Wiki suma "Misión: nuestra propuesta".
  - **Todo en EN y ES:** textos de la misión con `lg('es', 'en')`; los de `datos/mision.json` (fichas, paradas, fuentes) se traducen con el diccionario nuevo `datos/idioma_en_mision.json`, que `_ensamblar.py` suma al de Gale Earth.
  - **Logo nuevo** en `gale-earth/capas/logo/` (todos los tamaños y el favicon).
- **Cambió en compartido:** `data/parametros.json` → `vehiculo_tripulado.perfil` dice PMR en vez de GX-3.
- **Falta:** probar en el celular real la pantalla del PMR y el manejo libre con botones; que el compañero revise las paradas recomendadas y los 130 m de estacionamiento.

## 2026-11-15 mañana (2) · David (con Claude) · ROVER TRIPULADO GX-3 EN LA BASE GALE
- **Decidió (David):** un rover nuevo para las misiones tripuladas, aparte de Curiosity y del GX-2 (que quedan como están). Vive en la Base Gale y puede hacer lo mismo que los otros.
- **Hizo:**
  - **Modelo GX-3** en la escena (`escena3d/plantilla.html`, bloque `RT`), estacionado al lado del garaje de la base. Diseño propio:
    - cabina presurizada para dos con parabrisas bajo y refugio de tormenta con tanques de agua;
    - dos suitports atrás con los trajes acoplados y compuerta de acople al costado;
    - doce ruedas de 1 m en seis patas que giran 360° ("modo cangrejo");
    - batería abajo, alas solares que se despliegan del techo, mástil con LiDAR, antena, dron, taladro de 2 m y brazo robótico.
    - Cada sistema tiene ficha y fuente: SEV de NASA, rover presurizado del Mars Architecture Team, Rosalind Franklin, Ingenuity.
  - **Ruta T** (`herramientas/ruta_base.py`, la llama `exportar_mision.py`): A* sobre el terreno de 12 m desde la Base Gale hasta la zona de hoy.
    - Resultado: 14,1 km, sube 1.062 m, 1 h 25 min a 10 km/h y 18 kWh (9 % de la batería). Cálculo propio.
    - Rodea las dunas por el oeste, por el borde de la franja con datos, y cruza ~1,2 km de arena probable: revisar con imagen de detalle.
    - Archivo: `data/rutas/ruta_base_gx3.geojson`.
  - **En Gale Earth** (`gale-earth/mision.js`):
    - el GX-3 está estacionado en la base, con ficha y hover; Alas, Modo cangrejo, Dron y Perforar 2 m están animados por nodos;
    - el botón "Tripulado · GX-3" de la barra deja elegir "Desde la Base Gale" (ruta T) o "En la zona de hoy" (ruta C);
    - la ruta C ahora la hace el GX-3, con vista desde atrás o desde la cabina, y la barra muestra la batería;
    - en las paradas A2, A3 y A4 aparece "Salir a caminar": la caminata sale por los suitports y al final se vuelve al GX-3 y la ruta C sigue;
    - en la misión en pareja y a pie, el GX-3 queda estacionado en la salida.
    - Enlaces directos nuevos: `#gx3` y `#desdebase`.
- **Cambió en compartido:**
  - `data/parametros.json` → `vehiculo_tripulado`: suma batería, potencias, masa y eficiencia, cada uno con fuente o marcado como supuesto.
  - El alcance pasa de 125 a 200 km: el SEV dice 125 **millas**, era un error de unidades.
- **Falta:** confirmar con el compañero (ingeniería aeroespacial) las medidas y la energía del GX-3; revisar el cruce de las dunas de la ruta T con HiRISE.

## 2026-11-15 mañana · David (con Claude) · MISIÓN CURIOSITY DENTRO DE GALE EARTH: UNA SOLA PANTALLA
- **Decidió (David):** "Misión Curiosity 3D" va en la misma pantalla que Gale Earth, en "Curiosity hoy", con la misma lógica visual. Nada de saltar a otro Marte.
- **Hizo:**
  - **`herramientas/exportar_mision.py`:** abre la escena sin ventana y saca, con sus mismas funciones, `gale-earth/datos/mision.json` y los modelos `gale-earth/capas/mision/*.glb`.
    - El JSON tiene paradas con ficha y muestra simulada, rutas con datos cada 2 m, expedición, Base Gale, GX-2, estaciones, parámetros y fuentes.
    - Los modelos son Curiosity, GX-2, astronauta y Base Gale, exportados con el GLTFExporter de three.js (MIT), copiado en `escena3d/vendor/`.
  - **`gale-earth/mision.js`:** el módulo nuevo, que `_ensamblar.py` suma; no edita el resto de Gale Earth. Trae:
    - "Curiosity hoy" completo en el globo;
    - la barra de la misión;
    - los recorridos de 4 min que arrancan en pausa;
    - la misión en pareja con visor, comunicaciones y minimapa;
    - el hover de todos los carteles;
    - el botón "Misión Curiosity" sin cambio de página;
    - el vuelo del espacio al cráter sin perder a Marte de vista (`pitchAdjustHeight`).
  - **Probado sin internet** con Cesium del paquete npm y un terreno de prueba armado con nuestros DEM (MOLA, travesía 12 m, zona 2 m).
    - Probados: entrada, hover y clic en carteles, fichas, rover por la ruta A, GX-2, expedición, misión en pareja (cámara del casco y desde atrás), base y Esc.
    - Sin errores en la consola. Capturas en `docs/desarrollo/capturas/gale-earth/`.
    - En el celular (390 × 844) la barra queda en dos filas, el botón "Misión Curiosity" se esconde mientras la misión está abierta y, en pareja, comunicaciones, visor y reproductor no se pisan (captura `10_celular.jpg`).
    - Los enlaces directos `#pareja`, `#rover`, `#apie`, `#tripulado`, `#expedicion` y `#base` abren cada modo.
- **Para el compañero:** `mision.js` es un archivo aparte. En lo tuyo solo cambió `_ensamblar.py` (una línea), y `index.html` y `plantilla.html` se rearmaron. El módulo envuelve `irA` y el clic del globo sin tocar `_cuerpo.html`.
- **Falta:** la portada dentro de Gale Earth (fase 2), el mundo abierto (fase 7), y animar el taladro y el dron del GX-2 en el globo.

## 2026-11-15 madrugada (5) · David (con Claude) · BASE GALE EN LA ZONA 2 Y PROMPTS PARA EL PASO A PASO
- **Decidió (David):** la Base Gale va en la **Zona 2** del análisis de sitios del equipo, en la llanura del aterrizaje. Las zonas 1 (mejor puntaje) y 3 quedan como alternativas.
- **Hizo:**
  - `data/base/sitios_base.geojson` con las tres zonas, los criterios y la fuente.
    - La Zona 1 tiene las coordenadas escritas en la figura.
    - Las zonas 2 y 3 están leídas de la figura en km desde el borde noroeste de la franja de la travesía (la misma de `data/terreno/travesia_sur/`). El método da la Zona 1 a menos de 1 m de sus coordenadas.
  - **La escena** ya no elige el lugar dentro de la zona de hoy: lee la zona elegida y mide sobre el terreno de 12 m.
    - Resultado: pendiente media de 3,5° (máxima 6°) y 3 % de cielo tapado.
    - Distancias: 1,69 km del recorrido, 4,26 km del aterrizaje y 12,41 km de Curiosity hoy.
    - La esclusa mira al punto más cercano del recorrido.
    - La ficha explica el lugar y nombra las alternativas.
  - `docs/desarrollo/prompts-unificacion.md`: un mensaje listo para pegar en Claude por cada fase del plan, con cómo verlo y qué revisar.
- **Para el compañero:** si el script del análisis da otras coordenadas para las zonas 2 y 3, reemplazarlas en `data/base/sitios_base.geojson` y volver a armar la escena. Nada más cambia.

## 2026-11-15 madrugada (4) · David (con Claude) · QA DEL SITIO PUBLICADO Y DECISIÓN: GALE EARTH ES LA ÚNICA PANTALLA
- **Decidió (David):** Gale Earth es la única pantalla. Todo lo de GALE-3D pasa al mismo globo:
  - portada;
  - paradas, rutas, Base Gale y expedición ("Curiosity hoy");
  - rover y astronauta ("Misión Curiosity");
  - misión en pareja ("Vista del astronauta"), mundo abierto y wiki.
  - Nada de saltar de un Marte a otro.
- **Hizo:** QA de la grabación del sitio publicado (2 min 24 s): 15 hallazgos con su segundo y su causa en el código. Están en `docs/desarrollo/qa-unificacion.md`, con:
  - reglas de transiciones, estados de botones y pines y movimientos (4 min por defecto, arrancar en pausa);
  - las fases 0 a 8 para unificar;
  - un guion de QA de 15 pasos.
  - Capturas en `docs/desarrollo/capturas/qa/`.
- **Para el compañero:** las fases 0.5, 0.6 y 2 a 8 tocan `gale-earth/`. La propuesta es poner el código nuevo en archivos nuevos (`portada.js`, `mision.js`) que sume `_ensamblar.py`, con enganches cortos en lo existente. Avisar si prefieren otra forma.
- **Falta:** todo el plan. Lo primero es la fase 0 (arreglos sobre lo publicado, para la demo).

## 2026-11-15 madrugada (3) · David (con Claude) · BASE GALE Y ROVER GX-2 EN LA ESCENA (rama `david/union-gale-earth`)
- **Base Gale** (modelo 3D en la zona de hoy, marcador "BG"; inspirada en las fotos de domos geodésicos y módulos con túneles que trajo David).
  - **Lugar elegido con los datos:** círculo de 26 m donde el 95 % del suelo está bajo 8° y nada pasa de 12°, casi sin arena, a más de 20 m de las rutas y a menos de 750 m de Curiosity. Gana el de menos pendiente y desnivel, con más cielo tapado. Quedó a 719 m de Curiosity, con pendiente media de 3,4° y 9 % de cielo tapado. Cálculo propio sobre la grilla de 2 m.
  - **Partes**, cada una con ficha y fuente al tocarla: hábitat geodésico, túneles, laboratorio, esclusa con suitports, invernadero, campo solar, reactor de fisión con cerco y cable, antena, estación meteorológica, planta de oxígeno (tipo MOXIE), tanque de agua, garaje del rover, luces y plataforma.
  - También aparece en la wiki ("Base Gale"), y los mensajes de la misión en pareja salen de "Base Gale".
- **Rover GX-2** (versión nueva para las próximas excavaciones; diseño propio, el ER-6 de fable-rover.vercel.app fue solo inspiración visual: no tiene licencia y no se copió nada).
  - **Dónde:** Escena → Rover: Curiosity o GX-2 · nuevo. Toma la posición, el rumbo y la inclinación del rover de la escena, así que rutas, expedición y manejo siguen igual.
  - **Sistemas:** seis ruedas de 80 cm con balancín articulado; taladro de 2 m con la mecha y tres barras de 50 cm (como Rosalind Franklin, ESA); dron explorador (como Ingenuity); MMRTG y alas solares; mástil con LiDAR que gira y cámaras; cámara de suelo y focos.
  - **Acciones:** Alas, Dron (sale 30 m adelante a 10 m del suelo y vuelve) y Perforar 2 m (muestra simulada al final). Tocar el rover abre su ficha; también está en la wiki.
  - Los números con fuente están en la ficha; lo propio (tamaño, ruedas, LiDAR) dice "supuesto" o "propuesta del equipo".
- Arreglado: la página no terminaba de cargar porque la base usaba una variable de otro bloque (`R is not defined`). Ahora `BASE.radio`.
- Falta: ver `docs/desarrollo/pendientes.md` (ítems 13 a 15).
## 2026-11-15 mañana (11) · Compañero (con Claude) · AUDITORÍA DE GALE EARTH (ERRORES, FUENTES, ACTUALIDAD)
- Informe: reemplazado por `docs/informe_verificacion_2026-11-15.pdf` (versión final del mediodía).
- Barrido automático por 150 pantallas: 0 errores de JavaScript.
- Arreglado:
  - enlace THEMIS 404 → stac.astrogeology.usgs.gov/docs/data/mars/themis_controlled_mosaics/;
  - tabla de `docs/fuentes.md` (9 filas habían quedado después del pie);
  - "Sol en el cénit…" ahora sale en inglés;
  - filas "Gale Earth · Expedición" renombradas (ese paquete no se ve en la app).
- Estado de las misiones verificado al 15/11: MAVEN terminada el 3/6/2026; Odyssey, MRO, MEX, TGO y Hope activas; MMX lanzada el 20/10; ESCAPADE hizo los sobrevuelos el 7 y el 9/11; Rosalind Franklin a fines de 2028.
- **Para David** (fuentes secundarias o pendientes en escena3d): Space.com (31°), Smithsonian/Spaceflight Now (por qué Gale), 37 hallazgos "de memoria", yardangs sin enlace, VanBommel sin DOI, origen de la travesía y el gpkg.
- Falta:
  - revisar si el CheMin de Nevado Sajama 2 (sol 4795) ya está en el PDS (tanda 42);
  - abrir a mano una ficha ODR (el sitio no respondió desde la PC);
  - subir el relieve de Jezero a HF;
  - PR nuevo.

## 2026-11-15 mañana (10) · Compañero (con Claude) · CAPA "AGUA EN EL PRIMER METRO DEL SUELO" (MEDIDA, TODO MARTE)
- Nueva capa en Capas → Todo Marte. Es **medida** por el espectrómetro de rayos gamma (GRS) de Mars Odyssey entre 2002 y 2005.
  - Producto oficial del PDS: ODY-M-GRS-5-ELEMENTS-V1.0, `H2O_SR_5X5.TAB` (5° × 5°, suavizado de 10°, % en peso de H2O, de 60°S a 60°N, con su sigma). Se guardó la copia en `gale-earth/datos/crudos_grs/`.
  - `capas_globales.py --agua` genera `capas/global/agua_grs.png`. Solo se interpola entre celdas para dibujar.
  - Valores: Gale 5,4 ± 0,4 %; Jezero 3,5 %; Hellas 4,2 %; Olympus 4,4 %. Rango de 1,6 % a 7,4 %.
  - La leyenda aclara que es agua en minerales o hielo (no líquida) y que la resolución es de cientos de km.
- Fuente: Boynton et al. 2007, JGR 112, E12S99. Producto: pds-geosciences.wustl.edu/ody/ody-m-grs-5-elements-v1/.

## 2026-11-15 mañana (9) · Compañero (con Claude) · SE QUITA LA RADIACIÓN GLOBAL; HIRISE SOLO DE CERCA
- **Se quitó la capa "Radiación en superficie (todo Marte)"** (y su código en `capas_globales.py`). El único detector de radiación que estuvo en la superficie de Marte es RAD, en Curiosity; una capa global sería un modelo, no una medición. Queda solo la capa de radiación de Gale (5 m, día/noche).
  - Las JPG viejas quedaron en la PC en `Google Mars/_to_delete/`, para borrar a mano.
- **Tour, escena 6:** ahora dice que RAD es el único detector que hubo en la superficie y suma la tormenta solar del 20/5/2024 (8.100 µGy, ≈39 días de dosis normal, de `datos/radiacion.json`). Esa tormenta ya estaba en la línea de tiempo y en Biblioteca → Clima y radiación.
- **Losas superpuestas en el vuelo bajo:** se revisó en la PC con el navegador. Las causaba la capa HiRISE 25 cm: sus fotos traen sombras y franjas propias que no coinciden con el relieve 3D. Ahora HiRISE solo aparece de cerca (`minimumTerrainLevel: 15`, cámara a menos de ~1–2 km). Con HiRISE así, la vista del tour queda limpia.
- Nota: `viewer.imageryLayers.add()` no devuelve la capa (un primer intento rompía el motor "Marte completo"; ya corregido).

## 2026-11-15 mañana (8) · Compañero (con Claude) · RADIACIÓN EN TODO MARTE, CARTELES DETRÁS DEL PLANETA Y AJUSTES DEL TOUR
- **Radiación en superficie (todo Marte)**, en Capas → Todo Marte: `capas/global/radiacion_{oeste,este}.jpg`, generadas con `capas_globales.py --radiacion`. Es una ESTIMACIÓN con datos reales:
  - lo que midió RAD en Gale: 0,21 mGy/día = 0,64 mSv/día (Hassler 2014), con la presión media de ese año, 847,5 Pa (REMS, año marciano 31, a -4.520 m);
  - +250 Pa ≈ -32,5 µGy/día (Guo 2015, ApJ 810, doi:10.1088/0004-637X/810/1/24);
  - la presión según la altura HRSC-MOLA, con altura de escala de 11,1 km (NASA Mars Fact Sheet).
  - Resultado: Gale 0,64; Jezero 0,69; Hellas 0,58; cumbre del Olympus 0,94 mSv/día.
  - Fuera de ~700–950 Pa es extrapolación lineal (Guo y colegas vieron un efecto no lineal), y no incluye el ciclo solar ni las tormentas. Todo eso lo dice la leyenda. Hay antecedentes de mapas globales con MOLA (Saganti 2004; De Angelis 2004, NASA Langley).
- **Carteles detrás del planeta:** los topónimos y los lugares clave que quedan detrás del horizonte se ocultan, con un test de horizonte cinco veces por segundo. Antes se veían nombres del otro lado del planeta sobre Gale.
- **Tour:**
  - el vuelo bajo va más alto (6,2 km) y más lento;
  - en la escena de CheMin la cámara queda a más de 3,5 km, para que no se pisen los nombres de los pozos;
  - la escena de radiación muestra primero la estimación de todo Marte y después la capa fina de Gale;
  - durante el tour las teselas cargan más rápido (error de pantalla 2).
- Pendiente: las teselas superpuestas en el vuelo bajo (cambio de nivel de detalle entre ortofoto, HiRISE y CTX) no se pueden reproducir acá porque CTX está bloqueado. Revisar en la PC con el tour nuevo.

## 2026-11-15 mañana (7) · Compañero (con Claude) · INGLÉS POR DEFECTO, TOUR DE 2 MINUTOS Y RELIEVE DE JEZERO
- Hecho (gale-earth/):
  - **Idioma:** botón EN/ES en el riel; inglés por defecto (se guarda en localStorage `galeEarthIdioma`).
    - La interfaz se sigue escribiendo en castellano. `idioma.js` traduce lo que aparece en pantalla con `datos/idioma_en.json` (unas 1.030 frases; los números se sacan y se vuelven a poner, así una frase sirve para todos los pozos).
    - También traduce los carteles del globo, y los números salen en formato inglés.
    - Si se agrega texto nuevo, hay que sumar su frase al diccionario; si no, queda en castellano.
  - **Tour** (botón Tour en el riel, `tour.js`): unos 2 minutos, con bandas de cine, título y 7 escenas: Marte, Gale, el recorrido en vuelo bajo, las manchas CRISM, lo que confirmó CheMin, la radiación de día y de noche, y MRO en 3D.
    - Los textos salen de los datos (km recorridos, 49 pozos, 26–34 % de arcilla, hasta 28 % de hematita).
    - Esc o "Skip" lo cortan y todo vuelve a como estaba.
  - **Relieve de Jezero** a 20 m: `teselas_terreno_jezero.py` sobre el CTX DEM de Mars 2020 (NASA/JPL, servidor USGS), niveles 10–13, fundido con HRSC-MOLA en 4 km de borde.
    - Genera `teselas/terreno_jezero_n10-13.zip` (64 MB) y un rango nuevo en `meta.json`, dentro de `terreno_zz_meta.zip`.
    - Ya está en la PC. **Falta subirlo a Hugging Face** (zip + meta + índices: `indices_nube.py` y `subir_hf.bat`) antes de publicar.
- No se puso Perseverance (el protagonista es Curiosity).
- Bordes entre teselas: los de la ortofoto y HiRISE ya se funden. La imagen CTX no se ve desde el entorno de pruebas (el servicio está bloqueado ahí), así que los saltos de brillo entre teselas de CTX hay que revisarlos a ojo en la PC.

## 2026-11-15 mañana (6) · Compañero (con Claude) · NAVES EN 3D
- Hecho (gale-earth/): MRO y Mars Odyssey ahora son modelos 3D oficiales de NASA (NASA 3D Resources, sin copyright), en `capas/modelos/mro.glb` (1,2 MB) y `odyssey.glb` (5,8 MB).
  - Se orientan según su movimiento.
  - De cerca se ve el modelo; desde lejos (más de 2.500 km), el punto de siempre.
  - En la ficha de cada nave hay un botón "Ver la nave en 3D de cerca": la cámara la sigue en su órbita y se puede girar alrededor.
- Mars Express y TGO (ESA) y Hope (Emiratos) no tienen modelo libre en el repositorio de NASA y siguen como punto.
- En ese repositorio también hay modelos de MAVEN, Perseverance (.glb) y Curiosity (solo .blend), por si se suman.

## 2026-11-15 mañana (5) · Compañero (con Claude) · MANCHAS DE MINERALES, LUGARES CLAVE Y SR-1 FREEDOM
- Hecho (gale-earth/):
  - **Minerales vistos desde órbita = manchas con justificación.** `herramientas/manchas_minerales.py` toma el percentil de cada indicador CRISM de `data/mineralogia/crism_contexto.png` (David). Marca la señal más fuerte de la franja (percentil 90 o más) y dibuja el contorno de cada mancha de al menos 0,05 km²: hasta 14 por mineral, 79 en total. Sale en `capas/minerales/manchas.json`.
    - Cada mancha lista los pozos de Curiosity que caen adentro, con el valor de CheMin.
    - Si coincide con una unidad publicada, lleva la referencia: Glen Torridon (arcillas, Fraeman 2016 y Milliken 2010), unidad de sulfatos (Milliken 2010) y Vera Rubin (hematita, Fraeman 2013).
    - Al pasar el mouse aparece un cartel con todo y enlaces. Reemplaza los PNG de percentiles, que quedan sin usar.
  - **Lugares clave con contorno:** Olympus Mons, Hellas, Jezero, Gusev y Endeavour.
    - Se calculan con `herramientas/lugares_clave.py` y se guardan en `datos/lugares_clave.json`.
    - Método igual al borde de Gale: 360 perfiles desde el centro IAU sobre HRSC-MOLA. En los cráteres se toma el punto más convexo entre 0,8 y 1,2 radios; en Olympus, el escarpe basal.
    - Los diámetros de los contornos dan como los de la IAU: Hellas 2.267 contra 2.299 km, Jezero 48 contra 47,5, Gusev 161 contra 158 y Endeavour 21 contra 21,8.
    - Están en Explorar, cada uno con su ficha y enlace de NASA. armar.py los embebe (en la PC se parcheó armar.py: es distinto del del repo).
  - **Línea de tiempo:** SR-1 Freedom (NASA, lanzamiento previsto en diciembre de 2028, llegada en 2029, helicópteros SkyFall). Es de fisión nuclear, no de fusión. La línea de tiempo ahora muestra fechas "año-mes" como "dic 2028".
  - **Radiación:** se quitó la etiqueta "medido + cálculo". Los botones Día/Noche se leen y, si la capa estaba apagada, la prenden (antes no se veía ningún cambio).
- Falta: decidir si se suma la capa de los 30 cuadrángulos del USGS (MC-1 a MC-30).

## 2026-11-15 mañana (4) · Compañero (con Claude) · ZONAS PROHIBIDAS EN TODO MARTE, BORDES SUAVES Y ARREGLOS
- Hecho (gale-earth/):
  - "Zonas prohibidas por pendiente" ahora cubre todo Marte, igual que la altitud. Fuera de Gale sale de nuestras teselas HRSC-MOLA nivel 7 (~1,3 km/píxel), reducidas a ~2,6 km tomando la clase más severa: capas/global/pendiente_{oeste,este}.png, generadas con `herramientas/capas_globales.py --pendiente`. Es cálculo propio. A esa escala la pendiente se subestima y solo marca laderas grandes (paredes de cráteres, Valles Marineris, escarpes). En Gale sigue arriba la capa fina de 5 m.
  - Ortofoto 1 m y HiRISE se funden con CTX en el borde de su caja (1,8 km y 350 m) y alrededor de los huecos. Ya no se ven como rectángulos pegados encima.
  - La cámara ya no atraviesa el suelo: antes de cada cuadro se la sube si quedó a menos de 15 m del terreno (con el teclado se colaba).
  - Los topónimos de la IAU tienen prueba de profundidad: un cerro tapa los que quedan detrás y ya no flotan en el cielo.
  - Se quitaron los atajos de colores debajo del buscador (repetían Explorar).
  - Arreglos de estilo: los botones "Escala" se veían blancos; los enlaces de fuentes eran azul oscuro sobre negro; la regla CSS de .fuentesOf estaba rota.
- Sobre "fronteras": Marte no tiene fronteras políticas. La división oficial es la de los 30 cuadrángulos de USGS (MC-1 a MC-30; Gale está en MC-23 Aeolis). Queda como posible capa si se decide.

## 2026-11-15 mañana (3) · Compañero (con Claude) · PESTAÑA MOTOR, SIN CLAVES, NITIDEZ Y LUNAS REALES
- Hecho (gale-earth/):
  - Nueva pestaña **Motor** en el riel, debajo de Capas. Tiene dos tarjetas: "Marte completo (recomendado)" y "Cesium Mars (respaldo)". Ahí también quedaron el color de la imagen CTX y HiRISE.
  - Se quitó todo lo de claves de Cesium ion: el campo, los botones y el mensaje de error que pedía una clave. Cesium Mars queda como respaldo de emergencia con la clave de evaluación que trae Cesium: el jurado no tiene que poner nada.
  - Nitidez: Cesium dibujaba a la resolución "recomendada" del navegador (en pantallas de alta densidad, la mitad) y ahora dibuja a la resolución real, con tope en DPR 2. maximumScreenSpaceError pasó de 2 a 1,5. Gale Earth es para compu, no para celular.
  - Fobos y Deimos con textura global real de NASA 3D Resources (capas/lunas/*.jpg, 2048×1024). Se dibujan como primitiva que sigue a la entidad, porque Cesium no aplica imágenes a un elipsoide de entidad en movimiento. Con file:// queda el color liso.
  - Se quitó la sección Mars 3D Home de la pestaña Base (después va algo genérico).
- Decidido: CTX ya se pide a su resolución nativa (nivel 12 ≈ 5 m/px). Los niveles 13–15 del servicio fallan en Gale, así que la mejora viene del dibujado, no de pedir más zoom.
- Falta: probar en la PC de presentación cuánto rinde con la resolución completa. Si va lento, volver a maximumScreenSpaceError 2.

## 2026-11-15 mañana (2) · Compañero (con Claude) · UNA SOLA CAPA DE ALTITUD Y NOMBRES SIEMPRE A LA VISTA
- "Relieve en color (llanuras → montañas)" y "Colores de altitud" eran lo mismo con distinta escala y resolución. Ahora son una sola casilla, **Colores de altitud**, con un selector de escala:
  - **Marte entero** (por defecto): la misma rampa de −8,2 a +21,2 km en todo el planeta. En el área de Curiosity se ve con el DEM USGS de 1 m (`capas/gale_5m/relieve_mola.webp`, 15 m/px).
  - **Zona de Curiosity:** la imagen anterior con más contraste (`relieve_color.png`).
- La capa global es más viva: opacidad 0,85 (antes 0,6), con sombreado de relieve y un control de opacidad.
- **Topónimos de la IAU prendidos desde el inicio;** se pueden apagar en Capas. Van pegados al suelo, así que el planeta tapa los que quedan detrás del horizonte (antes "Elysium Mons" se veía desde Gale).

## 2026-11-15 mañana · Compañero (con Claude) · THEMIS SIN RAYAS EN LOS POLOS
- Las rayas negras cerca de los polos eran franjas sin datos del mosaico THEMIS de USGS, que vienen pintadas de negro. Ahora son transparentes: las franjas THEMIS pasaron de .jpg a .webp con canal alfa.
- El mosaico THEMIS llega solo hasta ±65°. Más allá se ve la foto de fondo, y el borde se esfuma en los últimos 3° para que no parezca un casquete.
- La capa "Lugares de aterrizaje" ahora se llama "Lugares de aterrizaje (Misiones)".

## 2026-11-15 madrugada (3) · Compañero (con Claude) · GALE EARTH: CAPAS DE TODO MARTE
- **Capas → Todo Marte** (`gale-earth/marte.js`; datos en `capas/global/`, armados con `herramientas/capas_globales.py`):
  - **Colores de altitud:** relieve de todo el planeta en datum MOLA, con leyenda de −8,2 a +21,2 km. Sale de nuestras propias teselas HRSC-MOLA 200 m (nivel 5, ~5 km/px).
    - Las teselas guardan la altura sobre el elipsoide de Cesium; acá se pasa a la esfera de 3396,19 km. Sin esa corrección, Hellas daba +3 km y los polos +20 km.
    - Comprobación: Olympus Mons +21,1 km y el fondo de Hellas −8,3 km.
  - **Infrarrojo nocturno THEMIS** (Mars Odyssey) de todo el planeta, de 65°S a 65°N: vista previa a 2 km del mosaico controlado de USGS (2018), cortada en 4 franjas.
  - **Topónimos IAU:** 1.805 nombres del Gazetteer de USGS/IAU (exportación MARS_nomenclature.csv). Se descartaron 15 con caracteres dañados.
    - Se ven según el tamaño del accidente.
    - Montes y llanuras grandes muestran la altura aproximada en el centro (datum MOLA).
  - **Lugares de aterrizaje:** de `datos/linea_tiempo.json`, cada uno con su fuente.
  - **Día y noche ahora:** punto subsolar con el algoritmo Mars24 de NASA (comprobado con el aterrizaje de Curiosity, 15:03 hora media local). Sigue el reloj de Órbitas: si se acelera, la noche se mueve.
- **Candidatos para la base: fuera.** Ya no aparecen en el mapa, en Capas, en la búsqueda ni en la pestaña Base. La pestaña Base conserva el propósito y Mars 3D Home.

## 2026-11-15 madrugada (2) · Compañero (con Claude) · GALE EARTH: CAPAS DE MINERALES Y RADIACIÓN, RELOJ EN VIVO, POZOS Y FUENTES
- **Expedición fuera de Gale Earth:** la sigue otro compañero. El código quedó en `gale-earth/para-companero/expedicion/` (ver su README); las capas siguen en `capas/expedicion/`.
- **Sin "Abrir en el celular" ni QR:** se borraron el botón, la ventana y la librería que se bajaba de internet. El diseño para celular (hoja deslizable) sigue.
- **Pozos que no abrían (John Klein, Cumberland, Windjana):** el círculo del sitio de base Bradbury, dibujado sobre el suelo, se quedaba con el clic. Ahora la selección mira todo lo que hay bajo el dedo, le da prioridad a los pozos y, si el toque cae a menos de 22 px de un pin, toma el más cercano.
- **Capa de radiación con día y noche** (Capas → Análisis): 0,64 mSv/día (RAD) × (1 ± 0,025) × (1 − 0,25 × cielo tapado).
  - La variación de ~5 % entre día y noche la midió RAD, con más dosis de día (Rafkin et al. 2014; Guo et al. 2015).
  - El cielo tapado se recalculó a 20 m para toda el área de 33 × 57 km.
  - Reemplaza a `dosis_color.png`, que usaba 0,67 mSv/día.
- **Minerales:**
  - Desde órbita: indicadores CRISM de `data/mineralogia/crism_contexto` (de David) como capas de color sobre la travesía (arcillas, sulfatos, agua, hematita, olivino, piroxeno). Son percentiles relativos, no abundancias.
  - En los pozos: "Color de los pozos" ahora también pinta por arcillas, sulfatos, hematita y material amorfo medidos por CheMin.
  - Script: `herramientas/capas_minerales_radiacion.py`.
- **Reloj EN VIVO** (Órbitas): hora UTC, año marciano, Ls y estación en Gale. Usa el algoritmo Mars24 de NASA (Allison y McEwen 2000) y los años desde 1955 (Clancy et al. 2000); comprobado con el aterrizaje de Curiosity (Ls 150,7 del año 31). La Biblioteca de clima suma "Hoy en Gale" y una tabla año por año.
- **Fuentes:** no se menciona más el Drive. Cada pozo trae "Fuentes oficiales" con enlaces visibles:
  - la ficha del pozo en la base de mineralogía y geoquímica de Gale (NASA, equipo CheMin) y su DOI;
  - NASA PDS Geosciences;
  - la foto de los pozos de NASA;
  - la foto cruda del sol en el servidor de NASA;
  - las entradas del blog de Curiosity.

## 2026-11-15 madrugada (2) · David (con Claude) · NUEVA MIRADA: CUATRO ENTRADAS, MISIÓN EN PAREJA, WIKI Y GUÍA DE DESARROLLO (rama `david/union-gale-earth`)
- **Portada en tres pasos.**
  - Inicio → **Entrada** → Recorrido.
  - Entradas: **Mars Earth**, **Recorrido en Marte**, **Mundo abierto** e **Información / wiki**.
  - Mars Earth abre Gale Earth sin hash: arranca en el espacio y vuela al cráter Gale. Si Gale Earth no está al lado, va a "Marte completo" de la escena.
- **Misión en pareja (visualización principal 1).**
  - La pantalla grande es la cámara del casco del Astronauta 1. El Astronauta 2 camina 6 m adelante, a la vista.
  - A la derecha, el **visor del Astronauta 2**: minimapa, próxima parada, suelo, radiación y refugio.
  - Abajo, **comunicaciones con las bases**:
    - base · rover (al instante): paradas, pendiente adelante, dosis, tiempo afuera y cierre;
    - control en la Tierra: con "enviado hace N min" según la **demora real de la luz** (`demoraLuz`, elementos de JPL; da 10,9 min el 15/11/2026);
    - respuestas rápidas: Llegamos, Pedir pronóstico, Necesitamos ayuda.
  - Botón "En pareja" en la barra.
- **Mundo abierto:** con el astronauta, con el rover o con cámara libre y destinos con pin.
- **Wiki:** pantalla completa con buscador.
  - Secciones: por qué Gale, paradas, 49 perforaciones (ficha completa dentro de la wiki), expedición, clima, límites del rover y del astronauta, comunicaciones y fuentes.
  - Se abre desde la portada o con "Info" en la barra.
- **Guía de desarrollo en `docs/desarrollo/`:** README (producto, mapa, comandos, reglas), estilo visual, arquitectura (código, recetas, pruebas), pantallas con capturas y pendientes con criterio de aceptación. `CLAUDE.md` apunta ahí.
- **Arreglado:** quedaban referencias a tarjetas viejas de la portada (`ay-viaje`, `ay-expe`) que cortaban la carga. La guía tiene un control para que no vuelva a pasar.


## 2026-11-15 madrugada · David (con Claude) · UNIÓN CON GALE EARTH Y AJUSTES DE USO (rama `david/union-gale-earth`)
- **Fusión:** la rama tiene todo `companero/gale-earth-rutas` (expedición de 20 km, Hugging Face, REMS, SAM revisado, pozos nuevos). Solo hubo conflicto en `docs/notas.md` (quedaron las dos) y en `gale-earth/index.html`, que se rearmó con `_ensamblar.py` y `armar.py`. El botón "Misión Curiosity · 3D" sigue.
- **Entrada desde la portada:** al elegir, Marte se corre al centro con Gale en el medio, la portada se funde con el planeta 3D y la cámara baja en escala logarítmica hasta la travesía y después a la zona. La interfaz aparece al llegar.
- **"← Atrás"** arriba a la izquierda (y en la expedición): sale del modo y vuelve a "¿Cómo la querés recorrer?" de esa zona.
- **Seleccionado visible:** Visor, Ojos, Autonomía, Rover/Astronauta, vistas y el modo activo de la barra de abajo quedan marcados. Antes el estilo de Visor y Ojos lo tapaba otra regla.
- **Expedición:** arranca en 4 min (se elige 1, 2, 4 u 8 min). **"Manejar a mano"** maneja el rover o el astronauta desde donde está, sobre el terreno de 12 m. Va acelerado ×150 (rover) o ×12 (astronauta), pero el tiempo, los soles y la dosis se cuentan reales. Un aviso en vivo marca la pendiente donde está y la que viene a 8–40 m contra el límite (20°), y si el astronauta queda a más de 30 min del rover.
- **Rutas → "Poner destino":** se toca el terreno y se calcula la ruta del rover y la del astronauta (ida y vuelta) desde donde están. Avisa si el destino cae en pendiente sobre el límite o en arena, si hay peligro a menos de 20 m y cuánto del camino pisa ladera o arena. Tiene "Ir (autonomía)" y "A pie, en primera persona". Al acercarse a un destino riesgoso sale un cartel. "Marcar paradas" sigue, dentro de "Varias paradas".
- **Avisos al manejar libre:** lo que viene adelante se mira hasta 30 m y sale como cartel a 14 m o menos, ya no solo como pastilla.
- **Fichas de las 49 perforaciones con la Biblioteca de Gale Earth** (`gale-earth/datos/biblioteca.json`):
  - hallazgo con su fuente y foto MAHLI del sol (enlace al original);
  - minerales de CheMin y química de APXS (PDS/ODR);
  - agua en minerales (kg/t, cálculo del compañero, marcado);
  - blog, ficha ODR y lo que falta publicar en el PDS.
  Ya no queda ninguna "a verificar". `armar.py` arma la foto chica con Pillow; sin Pillow, la ficha sale sin foto.
- **+38 km:** Curiosity lleva más de 38,07 km (NASA, 12/10/2026). La línea del mapa mide 37,7 km porque une posiciones informadas; se aclara en el panel.
- **Versión publicada:** `--globo-aparte` también separa las fotos de las perforaciones (`fotos_pozos.json`).


## 2026-11-15 madrugada · Compañero (con Claude) · EXPEDICIÓN: ARENA, ROVER DE MARTE, TRAJE, CLIMA, TORMENTA Y COMUNICACIÓN
- **Arena (indicio):** `herramientas/themis_noche.py` lee por rangos la ventana de Gale del mosaico **THEMIS Night IR** de Mars Odyssey (USGS, 100 m, cualitativo de 8 bits). Arma `capas/expedicion/themis_noche.png` y el percentil de "frío de noche" por celda.
  - Validación: el recorrido real de Curiosity va por terreno tibio (mediana en el percentil 21) y **nunca pisó el 10% más frío**.
  - Por eso el rover evita ese 10%, con una casilla que se puede desactivar. La caminata solo avisa.
  - La inercia térmica cuantitativa de USGS está en astropedia/astrogeology, que no es accesible desde acá. Si se consigue, reemplaza este indicio.
- **Rover presurizado:** 3 km/h por defecto, según **NASA DRA 5.0** (SP-2009-566, p. 43, velocidad de diseño en Marte). Se puede pasar a 10 km/h (SEV lunar).
- **Traje:**
  - 1700 BTU/h caminando con traje a 3,6 km/h en gravedad de Marte, cerca del límite sostenible;
  - 1200 BTU/h de promedio para dimensionar una salida en Marte.
  - Fuente: NASA ICES-2026, Ogilvie et al., NTRS 20260003038, con datos de Norcross et al. 2009. Se muestran las kcal por salida.
- **Blindaje:** la cabina de un rover tiene ≈1 g/cm² (Kim et al., NASA, WRMISS 2012) y NASA sugiere 20 g/cm² para un refugio (Clowdsley, NTRS 20210009760). Por eso dentro del rover se cuenta la misma dosis que afuera y el rover no es refugio de tormenta.
- **Horario:** se eligen la estación (Ls) y la hora de salida (LMST).
  - Muestra mínimas, máximas, récords y UV de REMS por estación y el viento por hora (REMS, muestra hasta 2016).
  - Avisa si la caminata cae de noche (aproximado: 06–18 LMST).
  - La hora marciana dura 1,0275 h terrestres.
- **Tormenta solar:** botón ☢ en la simulación. Usa los 8,1 mGy que midió RAD el 20/5/2024 (NASA, 10/6/2024) y calcula:
  - minutos hasta el rover y tiempo de regreso a la base;
  - el lugar con más cielo tapado a ≤ 10 min a pie.
- **Comunicación:** línea de vista entre astronauta y rover sobre el relieve de 20 m más la curvatura de Marte. Las antenas a 2 y 3 m son supuesto. Da minutos sin línea de vista por parada y un aviso en vivo.
- **Arreglado:** el panel de la simulación ya no se redibuja entero, así que los botones responden.

## 2026-11-14 noche · David (con Claude) · REDISEÑO DE LA INTERFAZ (rama `david/union-gale-earth`)
- **Portada nueva:** lo primero que se ve tapa la escena (que carga detrás). Tres pasos: inicio con Marte girado hacia Gale (proyección del mosaico Viking), "¿Qué zona querés prospectar?" (zona de hoy, travesía 2012 → hoy, expedición sur, Marte completo, Gale Earth) y "¿Cómo la querés recorrer?" según la zona. El botón "Inicio" de la barra vuelve a abrirla. Desde Gale Earth (`#desde-gale-earth`) no aparece.
- **Panel izquierdo en apartados plegables**, todos cerrados al abrir y con un valor corto en el encabezado: capa sobre el terreno · travesía 2012 → hoy (con "Viajar del aterrizaje a hoy") · por qué explorar Gale y perforaciones · expedición sur · clima según la fecha (salida, Aeolus 2028, personas en Marte y datos de Curiosity, cada uno plegable) · **Paradas** (botón naranja) · rutas · perfil de elevación · calidad · fuentes.
- **Barra de abajo:** una sola fila centrada con los modos (recorrido guiado, caminar, seguir al rover, viaje, expedición) y tres botones que abren una ventanita: Rutas (marcar, calcular, borrar), Escena (cámara, hora, estación, velocidad, teclas) e Inicio. Los avisos salen arriba, al centro.
- **Derecha:** "Datos en vivo" en tres grupos plegables (rover, astronauta, entorno) con un resumen cuando están cerrados; el del astronauta se abre solo cuando baja del rover. Debajo, brújula y centrar juntos, y los botones de manejo en una columna del mismo ancho.
- Solo cambia la presentación: los modos, rutas, cálculos y fuentes son los mismos (mismos ids y funciones).

## 2026-11-14 noche (4) · Compañero (con Claude) · GALE EARTH: EXPEDICIÓN CON RUTAS SEGURAS (20 km)
- **Pestaña nueva "Expedición"** en Gale Earth. Es un círculo de 20 km alrededor de Curiosity: se elige el inicio del rover presurizado y una o varias muestras (tocando el mapa, al azar o un pozo). Calcula:
  - la ruta del rover;
  - dónde estacionar para que el astronauta quede a ≤ 30 min a pie;
  - la ida y la vuelta a pie, la salida con traje y la dosis.
  Trae también una comparación "solo a pie" y "si lo hiciera Curiosity" (en soles), y una **simulación en vivo** con posición, pendiente, dosis y tiempo fuera del rover.
- **Relieve:** `gale-earth/capas/expedicion/` (5,5 MB), armado por `herramientas/zona_expedicion.py` desde el DEM USGS de 1 m llevado a 5 m. Es una grilla de 20 m con:
  - pendiente media;
  - cuántos tramos de 5 m pasan los 20°;
  - cielo tapado, con el mismo método que `herramientas/travesia.py`.
  El DEM fino cubre el 100% de los primeros 10 km y el 73% del círculo. **Donde no hay DEM fino no se rutea** (no se rellena con el de 200 m).
- **Reglas:** las de `data/parametros.json` (20° del traje, Tobler a 2,5 km/h, 0,64 mSv/día con 0,25 × cielo tapado, 30 min a un refugio, salida de 6/8 h, rover SEV a 10 km/h). No cambié el archivo compartido. Se suman:
  - **Rover:** pendiente media ≤ 20° y como mucho 6 de 16 tramos de 5 m sobre 20°. El umbral está calibrado con el recorrido real: el 99% de las celdas que pisó Curiosity cumple, y con un umbral de 0 se bloqueaba el 5% de su camino real.
  - **Suitport:** 10 min por salida (ficha NASA SEV).
  - **Minutos por muestra:** 30, como supuesto; se cambia en el panel.
- **Validación:** sobre el recorrido real de Curiosity la pendiente media es 7,9° y el 99% está bajo 20,8° (el blog da 99% bajo 17,4° en el boxwork). Los cálculos tardan 0,3 a 4 s.
- **Falta (sin dato para toda la zona):**
  - arena y megaripples;
  - rocas que dañan ruedas;
  - blindaje del rover presurizado (dentro se cuenta la misma dosis que afuera);
  - velocidad del rover según la pendiente;
  - gasto del traje según el esfuerzo;
  - pendiente máxima de un rover presurizado en Marte (se usa 20°, con el Apollo LRV de 20–23° como referencia).

## 2026-11-14 noche (3) · Compañero (con Claude) · TESELAS EN LA NUBE: HUGGING FACE
- Las teselas (6,5 GB) están en el dataset público **huggingface.co/datasets/ChuchuTEA/gale-earth-teselas**, que es gratis y no pide tarjeta. Cloudflare R2 no aceptó la tarjeta, así que quedó como alternativa.
- `gale-earth/nube.json` ya apunta a ese dataset. `sw.js` no cambió: Hugging Face responde pedidos por rangos de bytes y desde otros sitios (CORS). Se probó una tesela HiRISE y una de relieve, menos de 1 s cada una.
- Para volver a subir: `gale-earth/subir_hf.bat` (ver `gale-earth/NUBE.md`).
- Pendiente: fusionar este PR y activar GitHub Pages (David) para que el jurado tenga el link. Después, probar la página publicada.

## 2026-11-14 noche (2) · Compañero (con Claude) · VIENTO, HUMEDAD Y POZOS NUEVOS
- **Viento y humedad:** salen de los datos crudos calibrados de REMS en el PDS, leídos por partes (unas 112 jornadas de toda la misión). El viento aparece en el PDS hasta alrededor del sol 1482 (2016): unos 7 m/s al mediodía y un máximo de 19,6 m/s en la muestra. Solo se citan el PDS y artículos con revisión de pares. La humedad nocturna es mayor en otoño e invierno, con muy poco vapor (decenas de ppm). Las tablas van por las 4 estaciones (Ls). Está en Biblioteca → Clima y radiación.
- **Pozos 40-46:** química APXS desde el PDS (que llega hasta el sol 4842). Nevado Sajama y Nevado Sajama 2 están confirmados por el blog; Mineral King, Altadena y Valle de la Luna quedan como probables. Se sumó el experimento TMAH de Nevado Sajama 2 (orgánicos, 3 corridas), con los picos del cromatógrafo.
- **Pozos 47-49** (Campo Marte, Basque Lakes, Nazca): sus números todavía no están en el PDS. La ficha muestra lo que dijo el equipo en el blog, resumido.
- Pendiente: cuando salga la próxima entrega del PDS, volver a correr `armar_biblioteca.py` para sumar CheMin, APXS y SAM de los pozos 46-49.

## 2026-11-14 noche · Compañero (con Claude) · GALE EARTH: CLIMA, RADIACIÓN Y REVISIÓN DE SAM
- **Clima (REMS):** hay datos hasta el **sol 4995 (25-08-2026)**, no solo hasta 2023. Biblioteca → "Clima y radiación": temperatura del aire y del suelo, presión y UV por estación, récords, el último año marciano en un gráfico y la tendencia por año. La presión media baja de 848 a 784 Pa porque Curiosity subió unos 1.000 m. Cada ficha de pozo muestra el clima del día de la perforación.
- **Radiación (RAD):** los datos del PDS son cuentas sin calibrar, así que se usan los valores publicados: 0,64 mSv/día (Hassler 2014), +50 % hacia el mínimo solar (Guo 2021), efecto de la presión (Guo 2015) y la tormenta del 20-05-2024 (8.100 µGy, NASA). Hay cálculos propios marcados: salida de 6 h ≈ 0,16 mSv y 500 soles ≈ 330 mSv.
- **SAM revisado con las notas de PDS:** 79 experimentos confirmados (antes 51), 6 probables, 8 de arenas (Gobabeb, Ogunquit Beach) y 11 que no son muestra (blancos, calibración, atmósfera). Los valores imposibles para una porción de ~45 mg (supuesto) se marcan ⚠: Mojave 2 y Telegraph Peak (HCl, NO, H₂S), un HCl de Cumberland y el H₂O de Glen Etive (error de tabla).
- Línea de tiempo: nuevo evento, la tormenta solar de mayo de 2024 en Gale.
- **Para David:** la escena usa 0,64 mSv/día. Los +50 % hacia el mínimo solar y el efecto de la presión pueden servir para la capa de radiación.

## 2026-11-14 tarde (5) · David (con Claude) · IMAGEN DE MARTE MÁS NÍTIDA (rama `david/union-gale-earth`)
- El globo pasó de colores por vértice (1° ≈ 59 km) a **texturas de imagen**: Viking en todo Marte (~2,6 km/píxel) y en la región de Gale.
- **CTX alrededor de Gale** (el mismo servicio de Gale Earth): ~40 m/píxel cerca de la travesía y ~330 m en la región, coloreado con Viking. Dos maneras: en vivo si hay internet, o dentro del archivo corriendo `python herramientas/bajar_ctx.py` y `python escena3d/armar.py` en una PC con internet (desde acá no se puede bajar: el servicio está bloqueado en este entorno). Probado con teselas de prueba: se cargan, se colorean y se ubican bien.
- **Pendiente para David:** correr `bajar_ctx.py`, rearmar y subir `data/terreno/globo/ctx_*.jpg`.

## 2026-11-14 tarde (4) · David (con Claude) · GLOBO DE MARTE EN LA ESCENA (rama `david/union-gale-earth`)
- **Ya no queda gris a los costados:** alrededor de la travesía hay relieve MOLA y color Viking sobre la esfera de Marte, hasta el horizonte. Desde muy alto el cielo se vuelve negro y se ve el planeta entero (botón "Marte completo"; "Gale Earth ↗" abre la app del compañero).
- Datos: `data/terreno/globo/` (~0,5 MB), armados con `herramientas/globo.py` desde MOLA MEGDR 16 ppd y el Viking 8k de `gale-earth/capas/`. MOLA coincide con el DEM de la travesía (+5 ± 41 m).
- Es fondo visual: no toca rutas, alertas ni cálculos. El color tiene realce (tono, contraste y saturación) para que combine con el mosaico de la travesía: está dicho en la leyenda con su "?".
- Límite: el fondo es de ~3,7 km por punto (MOLA). Con el relieve de 200 m del compañero (`terreno_gale_n8-15.zip` en el Drive) se vería más detallado cerca de Gale.

## 2026-11-14 tarde (3) · David (con Claude) · UNIÓN GALE EARTH ↔ GALE-3D (rama `david/union-gale-earth`)
- **Qué se hizo:** navegación de ida y vuelta, sin tocar la lógica de ninguna de las dos apps. Gale Earth (todo Marte) tiene el botón **"Misión Curiosity · 3D"** (y "Entrar a la misión en 3D" en la ficha de Valle Grande); GALE-3D tiene **"Marte completo ↗"** en la barra de vistas. Al entrar a la misión hay un descenso desde lo alto hasta la zona de hoy.
- **Para el compañero (tu carpeta):** cambié `gale-earth/cabecera.html` (botón y estilo), `interfaz.js` (función `entrarMision`), `_cuerpo.html` (vuelo directo con `#curiosity` y botón en la ficha de Valle Grande) y `servir.py` (sirve también `/escena3d/` y `/gale-earth/`). Rearmé con `_ensamblar.py` y `armar.py`. Revisalo en el PR.
- **Entrada del proyecto:** `index.html` en la raíz redirige a Gale Earth (sirve para GitHub Pages).
- **Ojo (para el compañero):** `gale-earth/capas/gale_5m/capas.json` calcula la dosis con 0,67 mSv/día; el valor medido por RAD es 0,64 (Hassler et al. 2014, ver CLAUDE.md).
- Probado con `servir.py`: Gale Earth → misión → Marte completo, ida y vuelta.
- Prueba final en celular (390 px): la barra de abajo de la misión ahora es una sola fila que se desliza, los mensajes salen como aviso breve y las vistas usan nombres cortos (Marte, Travesía, Hoy) debajo de Panel/Datos. Sin internet, Gale Earth no carga Cesium, pero el botón a la misión funciona igual (es un enlace).

## 2026-11-14 noche · Compañero (con Claude) · LICENCIA Y ORIGEN DE LOS DATOS DE LA TRAVESÍA
- **`LICENSE` agregado** (texto oficial de Apache 2.0, bajado de apache.org). La sección "License" del README ya está completa, con las licencias de terceros: three.js (MIT), CesiumJS (Apache 2.0) y d3-celestial (BSD).
- **Resuelto el pendiente 1 de David** (de dónde salen el mosaico de color y el GeoPackage). Está en `docs/fuentes.md` y en `data/README.md`, con los comandos para volver a bajarlos:
  - Color: mosaico HiRISE LRGB de USGS/ASC (`MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif`).
  - Elevación: DEM USGS de 1 m remuestreado a 4 m.
  - Recorrido: `MSL_traverse.json` de NASA.
  - Pozos: `MSL_waypoints.json`. Es la posición del rover estacionado, no la del pozo exacto.
- **Gale Earth, dosis corregida a 0,64 mSv/día** (lo marcó David). En `gale-earth/capas/gale_5m/capas.json` se reescalaron `dosis_superficie`, `dosis_min` y `dosis_max` (× 0,64/0,67). La dosis es lineal en ese valor, así que el PNG de colores no cambia. **No rearmé `gale-earth/index.html`** para no chocar con `david/union-gale-earth`, que también lo modifica. Después de unir las dos ramas, correr `python _ensamblar.py` y `python armar.py` en `gale-earth/`. Al volver a procesar con `gale_datos.py`, ya toma 0,64 de `data/parametros.json`.
- README: corregido "CRX" por "CTX" y ordenada la lista de fuentes. El resto del README sigue mezclado en castellano: se pasa al inglés mañana.
- Sigue faltando: unir `david/union-gale-earth` a main (decide David), activar GitHub Pages y decidir qué hacemos con las teselas de Gale Earth. Propuesta: GALE-3D como demo principal y Gale Earth con menos capas.

## 2026-11-14 tarde (2) · David (con Claude) · QA: FUENTES "?", CINTA AL PISO, CARTELES, E1–E5, VISOR AL MANEJAR
- **"?" en cada ítem:** capas, leyendas, fichas de paradas y perforaciones, panel derecho, clima, expedición y "¿Por qué perforar en Gale?". Al tocarlo se abre una ventanita con la fuente y "Abrir la fuente". Lista completa de enlaces: `docs/fuentes-enlaces.md` (`herramientas/listar_fuentes.py`).
- **Cinta amarilla del recorrido:** de cerca ahora sigue el piso, angosta y con flechas, como las rutas guiadas; ya no corta al astronauta.
- **Carteles:** al pasar el puntero cambia el cursor, el cartel crece y aparece su nombre; el clic tolera un poco más de movimiento.
- **E1–E5** están en "Paradas" con su descripción y en el recorrido guiado (18 paradas).
- **Manejar al astronauta:** botones "Visor" (datos del casco) y "Ojos" (primera persona, arrastrar para mirar); teclas V y B.
- **Ficha y llegada arriba a la derecha**, para ver el punto de perforación; los menús desplegables ya se leen.
- **docs/por-que-perforar.md:** el porqué de perforar en Gale en versión larga, corta y de una frase, más el guion de 30 s con subtítulos en inglés.
## 2026-11-14 tarde · Compañero (con Claude) · GALE EARTH SUBE AL REPO
- **Carpeta nueva `gale-earth/`:** Marte en 3D estilo Google Earth (CesiumJS), para elegir dónde poner una base en Gale. Funciona en PC y celular. Se abre con `gale-earth/abrir.bat` (o `abrir.sh`); doble clic en `index.html` también anda, con menos capas. Ver `gale-earth/README.md`.
- Tiene: recorrido y 49 perforaciones, tres sitios para la base, órbitas (MRO, Odyssey, Mars Express, TGO, Hope) y **Fobos y Deimos** con datos de JPL Horizons. También una **Biblioteca** con la ficha completa de cada pozo (CheMin, APXS, SAM, fotos, archivos crudos), una **línea de tiempo** de la exploración de Marte con fuente por evento, cielo con la Vía Láctea y pantalla de carga propia.
- **No editar `gale-earth/index.html` ni `plantilla.html` a mano:** el código está en `cabecera.html`, `_cuerpo.html`, `interfaz.js`, `biblioteca.js` y `linea.js`. Se arma con `python _ensamblar.py` y después `python armar.py`.
- `gale-earth/datos/entrada/` tiene copias propias de `perforaciones.geojson`, `zonas_gale.json` y `recorrido_oficial_sol0-5073.geojson`. El `perforaciones.geojson` de la escena (`data/curiosity/`) tiene otro esquema; no se tocó.
- **No se versionan las teselas del globo (`gale-earth/teselas/`, ~6 GB).** Los scripts para regenerarlas están en `gale-earth/herramientas/`. Para la demo pública hay que alojarlas aparte.
- Fuentes nuevas registradas en `docs/fuentes.md`. Por pedido del equipo no se incluyen misiones chinas.
- Falta: textos en inglés para la entrega, alojar las teselas para la demo, `prototipo/mapa-perforaciones` (el botón "Mapa 2D" se oculta mientras no esté en el repo).

## 2026-11-14 tarde · David (con Claude) · EXPEDICIÓN SUR, PERFORACIÓN SIMULADA, CLIMA Y FUENTES CON "?"
- **Expedición sur:** 5 puntos nuevos (E1–E5) más allá de A4 con `herramientas/expedicion.py` (CRISM + DEM + cielo + arena). Rutas del rover y a pie en `data/rutas/expedicion_sur.geojson`. En la escena se elige quién hace la misión (rover o astronauta). Detalle en `docs/paradas.md`.
- **Se detiene al llegar:** el viaje por soles frena en cada perforación, la primera persona en cada parada y la expedición en cada punto; aparece una tarjeta con "Ver la perforación / Ver la parada", "Perforación simulada" y "Seguir". Casilla "Detenerse…" para desactivarlo.
- **Perforación simulada:** muestra ficticia armada con los indicadores CRISM del lugar (`data/mineralogia/crism_contexto.png`), marcada como SIMULACIÓN.
- **Clima según la fecha:** panel con fecha → Ls (Allison y McEwen; da 150,7 el día del aterrizaje), estación austral, lo que midió REMS en esa época, Aeolus 2028, humanos en los 2030 y dónde bajar datos de Curiosity. El cielo 3D se enturbia en la temporada de polvo (visual).
- **Botón "Manejar astronauta"** siempre visible a la derecha, con guía de teclas. **Círculos "?"** en cada capa, en las leyendas (pendiente, prohibidas, peligro, radiación) y en las fichas: abren la fuente. Movimiento más sobrio (fundidos cortos, respeta "reducir movimiento").
- Falta: textos en inglés; probar en tablet real; que el equipo revise los cinco puntos E1–E5 sobre HiRISE.

## 2026-11-14 · Compañero (con Claude) · PLAN DE ENTREGA
- Hizo: `docs/entrega.md` con el recorrido del proyecto, lo que exige la guía oficial de entrega 2026, la lista de lo que falta por prioridad, un guion de video de 30 s y un reparto sugerido.
- Requisitos clave de la guía: demo de **30 s o menos con subtítulos en inglés** (o hasta 7 diapositivas en inglés), página del proyecto toda en inglés, links públicos, **declarar el uso de IA**, enviar antes del **domingo 15 a las 23:59** hora local.
- Para David: falta el archivo `LICENSE` (Apache 2.0) y la sección "License" del README está vacía. Publicar la escena con GitHub Pages para tener el link del proyecto final.
- Falta: video, textos de la escena en inglés, README y referencias en inglés, página del proyecto.

## 2026-11-14 mañana · David (con Claude) · TRAVESÍA COMPLETA, PERFORACIONES, CAPAS Y ALERTAS
- **Leer `docs/travesia.md`.** La escena ahora muestra todo el camino de Curiosity (aterrizaje → hoy) alrededor de la zona de detalle, con los archivos que bajó el equipo (los .tif y el .gpkg no se versionan: ver `data/README.md`).
- Datos nuevos: `data/terreno/travesia_sur/`, `data/terreno/sol5070/orto_color.jpg` (la orto de 0,5 m con el color del mosaico; `armar.py` la usa si existe y deja `orto.jpg` intacta), `data/curiosity/recorrido_completo.geojson`, `perforaciones.geojson` y `perforaciones_hallazgos.json`.
- Escena: vista "Travesía completa / Zona de hoy", viaje por soles con las 12 etapas, fichas de las 49 perforaciones, capa de radiación en bandas (también en la travesía), peligro limpio con arena por color, alertas sin ruido, modo de calidad liviana para tablets. `index.html` pesa 13,6 MB.
- **Pendiente del equipo:**
  1. confirmar de dónde se bajaron el mosaico de color y el GeoPackage, para citarlos;
  2. verificar las 37 fichas de perforaciones que dicen "a verificar";
  3. confirmar el punto exacto de la medición de RAD en Murray Buttes.
- Corrección: el pozo 47 es Campo Marte, no Atacama (ver `docs/travesia.md`).

## 2026-11-14 madrugada · David (con Claude) · ASTRONAUTA A MANO, ALERTAS, REGRESO A LA BASE Y CAPAS PORTABLES
- **Para el compañero (importante):** `docs/capas-portables.md` tiene el inventario de capas para tu mapa: cada archivo, su formato, su fuente, las reglas de cálculo y un ejemplo con Leaflet. Las capas nuevas están en `data/capas/sol5070/` (PNG + `meta.json`, misma grilla que el terreno).
- Datos:
  - **Dosis corregida a 0,64 mSv/día** (Hassler 2014); antes usábamos 0,67. Actualicé `parametros.json`, el contrato, el GeoJSON y `paradas.md`.
  - `parametros.json` suma `eva` (salida de 6 h nominales y 8 h máximas; 30 min a un refugio y 30 min de reserva, estos dos como supuestos) y los límites de 600 mSv y 250 mSv.
  - Puntos nuevos R1, M1, Q1 y Z1 en `data/rutas/puntos_extra_sol5070.geojson`.
- Escena:
  - mover al astronauta (WASD o joystick), con alertas que avisan y no bloquean;
  - volver a la base por el camino más rápido;
  - capas de peligro, de alcance a pie y CRISM más nítido con modo interpretado;
  - perfil en tarjeta flotante (el botón "Ver perfil" antes no mostraba nada a la vista);
  - botones de brújula y "ubicarme";
  - rutas como cintas con flechas;
  - más detalle en Curiosity y en el astronauta.
- **Hallazgo:** B2 queda a 33 min de caminata de S, más que la regla de 30 min. A3, C3, A4, C4 y R1 están a 33–48 min. Refuerza la ruta C (ver `docs/paradas.md`).
- Falta: textos en inglés; probar en una tablet real.

## 2026-11-14 madrugada · David (con Claude) · VISUAL Y USO DE LA ESCENA 3D
- Hizo (`escena3d/plantilla.html`; `index.html` regenerado):
  - astronauta articulado, con caminata y huellas;
  - primera persona con vistas "ojos" y "detrás", para mirar alrededor y con transición suave;
  - rover con ruedas de garras en V, mástil que escanea, bandas y polvo;
  - reflejos del cielo y cielo con degradé;
  - pantalla de inicio "Cómo usar" y botones "Recorrido guiado", "Caminar como astronauta" y "Seguir al rover";
  - botones grandes en pantallas táctiles.
- Probado en navegador (1280×800, sin errores): recorrido guiado, caminata en las dos vistas y seguimiento del rover.
- Ojo: el paso de 1,4 m del astronauta es un supuesto visual (README, tabla de medido/supuesto).
- Falta: probar fluidez en una tablet real; textos en inglés.

## 2026-11-14 madrugada · David (con Claude) · FICHAS DE PARADAS Y VISOR DEL ASTRONAUTA EN LA ESCENA 3D
- Hizo, en `escena3d/plantilla.html` y `armar.py` (regenerado `index.html`, 7,1 MB, abre sin internet):
  - **Paradas desplegables** (panel y carteles 3D) con "Qué vas a encontrar" (CRISM), suelo, radiación y motivo.
  - **Visor del casco** en primera persona (tecla V): suelo, minerales bajo los pies, radiación, refugio, próxima parada con flecha y aviso de llegada.
  - **Capa CRISM** (ALT, HYD, FM2, MAF). `armar.py` la toma sola de `data/mineralogia/crism_<zona>/`.
  - Las rutas de `rutas_sol5070_calculadas.geojson` ya no salen como "a ojo"; el borrador cualitativo se carga oculto y sin paradas.
  - Probado en navegador (1400×860 y 1024×768, tamaño tablet): sin errores; la lectura por parada coincide con la tabla de `docs/paradas.md`.
- HYD sumado: S = sulfato monohidratado; B1/B2 = polihidratado.
- **Para el compañero:** la capa CRISM entra a la escena por el mismo mecanismo que las otras (contrato). Si sumás más capas satelitales, conviene seguir el formato de `data/mineralogia/crism_sol5070/meta.json` (esquina noroeste, grados por píxel, leyenda).
- Falta: textos en inglés del visor y las fichas para la entrega; probar en una tablet real.

## 2026-11-14 madrugada · David (con Claude) · MINERALOGÍA CRISM POR PARADA
- Hizo: recorté los mosaicos CRISM GMWG 2012 (ALT, FM2, MAF, VNA, FAL) sobre la zona sol5070 y medí cada parada. Están en `data/mineralogia/crism_sol5070/`: PNG en la misma proyección que el terreno, `meta.json` con esquina noroeste, grados por píxel y leyenda, y `muestras_paradas.json`. Script en `herramientas/crism_muestras_paradas.py`. Figura e interpretación en `docs/paradas.md` (sección CRISM).
- Resultado: los mosaicos **cubren** la zona. Alineación con HiRISE: ≤ 1 píxel (19 m). Hay sulfatos en la parte baja (S, A1, B1, B2); el terreno claro (A4, C4) da poca señal en todos los productos, lo que apoya, sin probar, que sea otra unidad. B2 es la parada con más señales y C3 la de más agua.
- **Para el compañero (capas):** los PNG se pueden usar directo como textura en la escena 3D. Ubicación: `lon = lon_oeste + (col + 0,5) × grados_por_px`, `lat = lat_norte − (fila + 0,5) × grados_por_px`. El recorte es algo mayor que la zona (margen de ~0,004°). Sugerencia: capa "Mineralogía (CRISM)" con selector ALT/FM2/MAF, más la leyenda de `meta.json`.
- Falta: el producto **HYD** (David lo baja) y volver a bajar el **TRU**, que llegó cortado. Los .tif originales (~10 MB cada uno) no se suben al repo.

## 2026-11-13 noche · David (con Claude) · PARADAS JUSTIFICADAS Y RUTAS CALCULADAS
- Hizo: `data/rutas/rutas_sol5070_calculadas.geojson` (contrato §2): rutas A (robot), B (a pie, ida y vuelta), C (rover tripulado + 3 caminatas) calculadas con A* sobre el DEM sol5070, **0 m sobre 20°**; 10 paradas con `motivo_cientifico`, `fuente_motivo`, quién va y datos medidos. Paradas reubicadas sobre el terreno (vehículo: menor pendiente/rugosidad; astronauta: caminable, al pie de afloramiento, más cielo tapado). Justificación completa en `docs/paradas.md` con fotos HiRISE. Regeneré `escena3d/index.html` con `armar.py` (sin tocar la plantilla).
- Decidió: la ruta B cambió a 2,6 km ida y vuelta (84 min); las caminatas de C miden 0,76–0,96 km ida y vuelta porque rodean pendientes.
- Falta: confirmar que el terreno claro es la capa de yardangs; buscar escenas CRISM de la zona; textos en inglés.

## 2026-11-13 noche · Compañero (con Claude) · GALE-3D FUSIONADO
**`escena3d/index.html` ahora es la fusión** del simulador GALE-3D de David y la escena autónoma del compañero (acordado con David). Detalle en `escena3d/README.md`.

- Hizo:
  - Del simulador de David se mantiene todo: Curiosity a escala con suspensión (plano de 6 contactos), rutas A* con "Marcar paradas" y "Calcular rutas" (astronauta ida y vuelta, con preferencia por la sombra), ajuste de paradas a la celda permitida más cercana, autonomía ×1 a ×300, manejo WASD, sol y estación (hora y Ls), astronauta que camina su ruta, cámaras libre / rover / astronauta / cenital, capas de pendiente, sombra de radiación y zonas prohibidas, panel con inclinación, distancia al rover vs 1,38 km y dosis.
  - De la escena del compañero: **abre con doble clic, sin internet ni servidor** (three.js r170 y los datos van dentro del HTML), métricas y perfil por ruta (también para las rutas calculadas), primera persona, fichas de las paradas, capas sobre la ortoimagen, parámetros leídos de `data/parametros.json` (antes estaban fijos en el código).
  - Cambios respecto del simulador de David: ya no hace falta servidor ni `?zona=`; cada zona se arma con `python escena3d/armar.py --zona <carpeta>` y queda en `escena3d/index_<zona>.html` (probado con `montesharp_s3331-3958`, con el recorrido real en amarillo y relieve sombreado porque esa zona no tiene orto). Las rutas se dibujan como tubos (Line2 necesitaba internet). El astronauta mide 1,7 m. El cursor y el marcado usan un rayo sobre la grilla en vez de intersectar 1,3 millones de triángulos.
  - Usa el `cielo_bloqueado_u8.bin` que agregó David en `data/terreno/sol5070/` (coincide con mi cálculo: diferencia media 0,05 sobre 255).
- Lo que muestran las métricas (cálculo propio, provisorio):
  - Vehículo: 1,48 km sobre el terreno, +207 m, pendiente de marcha máx. 35,6°, **54 m sobre 20°**, 25–50 soles.
  - Astronauta: 1,54 km, +214 m, pendiente de marcha máx. 43,6°, **110 m sobre 20°**, 1 h 37 min de ida, 42,8 µSv.
  - O sea: tal como están trazadas, las dos rutas cruzan tramos más empinados que los límites. Con "Calcular rutas" sobre paradas de prueba salen rutas con 0 m sobre 20°; la del astronauta (ida y vuelta) se alejó 1431 m del punto de partida, más que 1,38 km, y la escena lo marca en rojo.
- Para David (la escena los toma solos cuando estén en `data/rutas/` y se vuelve a correr `armar.py`):
  - Las paradas del GeoJSON no traen `motivo_cientifico` ni `fuente_motivo` (contrato §2); la ficha dice "motivo pendiente".
  - Las rutas A, B y C solo están en `prototipo/rutas_sol5070.html`; si se exportan como GeoJSON, aparecen en la escena (una ruta con "tripul" o "presur" en el nombre se dibuja en violeta como rover tripulado).
- Falta: probar en un celular real y medir fluidez con placa de video común; pasar los textos al inglés para la entrega; guardar y exportar como GeoJSON las rutas calculadas en la escena.

## 2026-11-13 noche · Compañero (con Claude)
**Terreno de la zona del sol 5070 listo** en `data/terreno/sol5070/` (formato del contrato §1). Detalle y verificación en su README.

- Hizo:
  - `herramientas/recortar_terreno.py`: recorta el DEM USGS de 1 m y la orto HiRISE de 25 cm leyendo solo la ventana por HTTP (sin bajar los 3,6 y 24 GB). Sirve para cualquier zona (`--zona`, caja en lat/lon).
  - `herramientas/verificar_terreno.py`: chequea bin vs tif, rutas dentro de la grilla, y compara con un DEM y una orto de referencia; genera una vista con las rutas.
  - Recorte pedido: lat -4,820 a -4,848, lon 137,385 a 137,412 → grilla de 801 × 831 celdas de 2 m, orto de 0,5 m. Sin celdas vacías.
- Datos útiles para recalcular A, B y C: sol 5070 a -3473,9 m; las paradas finales están a -3279 m (vehículo) y -3294 m (astronauta), o sea ~180–195 m de subida. Pendiente en la zona: mediana 8,8°, p95 31,8°.
- Decidió:
  - `meta.json` agrega campos extra (lat_sur, lon_este, elev_min/max, orto_res_m, nota) sin cambiar los del contrato. `lat_norte`/`lon_oeste` son la esquina noroeste de la celda (0,0).
  - `dem.tif` no se versiona (`.gitignore` excluye `*.tif`); se regenera con el comando del README.
  - La orto de USGS es en escala de grises. Hay una orto en color de la zona boxwork (fuera de esta caja) que se puede sumar como zona extra.
- Falta: zona `boxwork` en el mismo formato (opcional), escena 3D (`escena3d/`), tabla de límites del astronauta. Agregar las dos fuentes nuevas al registro compartido de fuentes (acá ya están en docs/fuentes.md).

## 2026-11-13 noche · David (con Claude) · SIMULADOR 3D
- Hizo: `escena3d/index.html`, simulador 3D en three.js (abrir con un servidor local, por ejemplo `python3 -m http.server` en la raíz, y entrar a `/escena3d/`). Terreno real a escala, Curiosity a escala con suspensión rocker-bogie aproximada (plano de 6 contactos), astronauta de 1,8 m, rutas A* vehículo y astronauta, autonomía, manejo WASD, hora solar y Ls de Gale, capas de pendiente, sombra de radiación y zonas prohibidas, panel con inclinación vs 20°, distancia al refugio vs 1,38 km y dosis.
- Datos de prueba: `data/terreno/montesharp_s3331-3958/` (PLACES, 2 m) ya en el formato del contrato, más `cielo_bloqueado_u8.bin` y `recorrido_curiosity.json`.
- Decidió (con David): el motor 3D lo hace David; el compañero aporta terreno y capas por el contrato. CLAUDE.md actualizado.
- Actualización: ya integrada la zona `sol5070` del compañero (DEM USGS + orto HiRISE). Es la zona por defecto de la escena: Curiosity aparece en su posición real, con la orto como textura y las rutas cualitativas punteadas. Agregué `data/terreno/sol5070/cielo_bloqueado_u8.bin` (derivado del DEM, 16 direcciones, 400 m), avisado acá porque la carpeta es del compañero.
- (Original) Para el compañero: exportar la zona del sol 5070 con el mismo formato (`dem_2m.bin` Float32 LE fila 0 = norte, `meta.json`); opcional `cielo_bloqueado_u8.bin` (se puede generar con el script de `herramientas/`) y una ortoimagen. Se ve con `escena3d/?zona=<carpeta>`.

## 2026-11-13 tarde · David (con Claude) · ETAPA ACTUAL
**Dónde estamos:** las rutas están definidas como propuesta y justificadas con fuentes; falta el terreno real de la zona para calcularlas.

- Hizo:
  - Tres rutas desde el sol 5070 (137,38915° E, -4,82568°): A = robot Curiosity (1,46 km, 25–50 soles), B = astronauta a pie ida y vuelta (1,65 km, máx. 0,8 km del refugio), C = rover presurizado tripulado + 3 caminatas de 300–385 m (propuesta principal).
  - Página de justificación: `prototipo/rutas_sol5070.html` (mapa, motivo científico de cada parada, criterios, revisión de NotebookLM, glosario).
  - Correcciones de NotebookLM: coordenadas (la que daba era el cursor, 545 m al sur), pendiente de 5° (es de aterrizaje), 7,5% (son neutrones; dosis 4–5%), robot vs rover tripulado, "radio de 385 m" (no es un estándar).
  - Parámetros con fuente en `data/parametros.json`: astronauta 20° (Artemis, lunar), rover tripulado 10 km/h (concepto SEV de NASA).
- Decidió:
  - Separar siempre robot (datos medidos) y rover tripulado (supuesto declarado).
  - La ruta C es la propuesta para el pitch.
- Falta (para el compañero): terreno de la zona del sol 5070 con el formato de `docs/contrato.md` §1. Recorte aprox.: lat -4,820 a -4,848, lon 137,385 a 137,412. Con eso: pendientes reales, sombra de radiación y recálculo de A, B y C; y la escena 3D.
- Falta (David): tiempo de soporte vital del traje (define el radio de alerta), confirmar que el terreno claro del sureste es la unidad de yardangs, Local Lead.

## 2026-11-13 · David (con Claude)
- Hizo: estructura del repo, CLAUDE.md, contrato de interfaces, datos de Curiosity (recorrido PLACES hasta sol 4868, posición sol 5070), planificador 2D funcionando sobre terreno PLACES (no cubre la zona actual), borrador cualitativo de rutas desde el sol 5070, fundamento científico y salud del rover en docs/.
- Falta: terreno de la zona del sol 5070 (lo trae el compañero según docs/contrato.md §1), pasar el planificador a esa zona, escena 3D.
- Decidió: GeoJSON para rutas; terreno como grilla Float32 + meta.json; parámetros provisorios en data/parametros.json.

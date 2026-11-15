# Notas de traspaso

Al terminar algo, agregar arriba: fecha, quién, qué hizo, qué falta, qué decidió. El otro Claude lee esto al empezar.

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

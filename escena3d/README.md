# GALE-3D · escena 3D

`index.html` es una sola página autónoma: se abre con doble clic, funciona sin internet ni servidor y se puede
publicar tal cual (GitHub Pages). Pesa unos 7 MB porque lleva adentro three.js, el terreno, la ortoimagen y las rutas.

Es la fusión de dos trabajos del equipo:
- **Simulador GALE-3D (David):** Curiosity a escala con suspensión, rutas A*, autonomía y manejo, sol y estación,
  astronauta que camina su propia ruta, cámaras y panel de estado.
- **Escena autónoma (compañero):** abre sin internet, métricas y perfil por ruta, recorrido en primera persona, fichas de
  las paradas, capas sobre la ortoimagen, parámetros leídos de `data/parametros.json`.

## Qué se puede hacer
- **Terreno real 1:1** de la zona del sol 5070 (celdas de 2 m) con la ortoimagen HiRISE, y la posición de Curiosity.
- **Rutas:** "Marcar paradas" y clic sobre el terreno; "Calcular rutas" da una para el vehículo (azul) y otra para el
  astronauta (naranja, ida y vuelta, con preferencia por la sombra). Si una parada cae en terreno prohibido, se corre a
  la celda permitida más cercana. Las rutas trazadas a ojo de `data/rutas/` se ven semitransparentes, para comparar.
- **Métricas por ruta** (panel izquierdo): largo, subida y bajada, pendiente de marcha máxima, metros sobre el límite,
  tiempo, dosis (astronauta), máxima distancia al punto de partida contra 1,38 km, soles de manejo (vehículo).
  Perfil de elevación con los tramos sobre el límite en rojo.
- **Autonomía (G):** el rover (a ~4 cm/s, como Curiosity) y el astronauta recorren sus rutas, a velocidad real ×1 a
  ×300. Si no hay rutas calculadas, recorren las trazadas a ojo. **WASD** maneja el rover; **Espacio** lo detiene.
- **Panel derecho:** inclinación del rover contra 20°, cabeceo y alabeo; recorrido, tiempo afuera, dosis y distancia
  del astronauta al rover contra 1,38 km; hora, elevación del Sol, estación y coordenadas bajo el cursor.
- **Sol y estación:** la hora (5:30 a 18:30) y Ls mueven el sol y las sombras, con tono azulado al atardecer.
- **Capas** (tecla C): ortoimagen, pendiente contra los límites, zonas prohibidas (violeta para los dos, rojo solo el
  rover, naranja solo el astronauta) y sombra de radiación (cielo tapado).
- **Cámaras** (teclas 1 a 4): libre, seguir al rover, seguir al astronauta, cenital. Además, **primera persona** desde
  cada ruta (botón de la ruta): recorre la ruta a la altura de los ojos con tiempo, pendiente y dosis acumulada.
- **Paradas desplegables** (panel izquierdo "Paradas" y carteles 3D): cada parada de `data/rutas/rutas_sol5070_calculadas.geojson`
  se despliega en cuatro secciones: **Qué vas a encontrar** (lectura de CRISM: sulfatos, agua, arcillas, hematita,
  arena volcánica o "señal apagada"), **Suelo y terreno** (elevación, pendiente, caminable o no, tono del terreno),
  **Radiación** (cielo tapado, tasa estimada contra cielo abierto) y **Por qué venimos** (motivo y fuente). Botones
  "Ver en 3D" e "Ir caminando (visor)". Las paradas en el mismo lugar (B2 y C2) comparten cartel.
- **Visor del casco** (primera persona, botón "Visor" o tecla V): sobre la vista, **suelo** (pendiente contra el límite
  del traje, elevación, tono, minerales CRISM bajo los pies), **radiación** (tasa ahora, cielo tapado, dosis de la
  salida, aviso de sombra), **refugio** (distancia contra 1,38 km, tiempo afuera, hora) y **próxima parada** con
  flecha de rumbo. Al llegar a una parada aparece un aviso que abre su ficha.
- **Capa de mineralogía CRISM** (ALT, HYD, FM2, MAF), si existe `data/mineralogia/crism_<zona>/`.
- **Inicio "Cómo usar"** (botón ?) y barra con las acciones principales: **Recorrido guiado** (vuela a cada parada y
  abre su ficha, con Anterior / Siguiente), **Caminar como astronauta** (ruta B) y **Seguir al rover** (ruta A).
- **Primera persona con dos vistas** (botón "Vista" o tecla B): *ojos* (casco, balanceo de la cabeza al caminar,
  partículas de polvo en el aire) y *detrás* (cámara que sigue al astronauta o al rover). Arrastrar o flechas: mirar
  alrededor; doble toque: centrar. Transición suave al entrar.
- **Astronauta articulado:** traje genérico sin marcas (casco de burbuja con visera dorada, mochila de soporte vital,
  módulo de pecho, juntas). Camina con paso largo de baja gravedad (1,4 m por ciclo), se inclina en las subidas y
  respira en reposo. **Rover:** ruedas con 24 garras en V; el mástil escanea el paisaje cuando está quieto.
- **Travesía completa** (si existe `data/terreno/travesia_sur/`): terreno de 6,6 × 17,4 km alrededor de la zona, con color
  a 3 m; recorrido real en amarillo; 49 perforaciones con ficha (qué se encontró, fuente y si está verificada); botones
  "Travesía completa / Zona de hoy"; y **Viaje de Curiosity**: línea de tiempo del sol 0 a hoy, con 12 etapas, que frena
  en cada perforación. La zona de detalle usa `orto_color.jpg` si existe.
- **Radiación en bandas** (5–10, 10–20, 20–30 y más de 30% de cielo tapado, con su dosis en µSv/h), en la zona y en toda
  la travesía. **Peligro** con pendiente media en 6 m y arena por color. **Alertas sin ruido:** un cartel a la vez, con
  espera, pastillas para lo menor y × para silenciar.
- **Calidad liviana** (panel, abajo; automática en pantallas táctiles): terreno lejano con la mitad de detalle.
- **Mover al astronauta** como al rover: "Manejar: Rover / Astronauta" en la barra, teclas WASD o joystick táctil. Baja al
  lado del rover (la base) y nada lo bloquea: las **alertas** avisan en pantalla y en el visor (pendiente sobre 20°, más de
  30°, posible arena, lo que viene en 16 m, minutos hasta la base contra 30 min, margen de la salida contra 6 y 8 h).
  **Volver a la base** traza el camino más rápido y lo camina solo (también desde la primera persona).
- **Presupuesto de la salida:** tiempo afuera, regreso a pie y margen en el visor y en el panel "Datos"
  (`data/parametros.json` → `eva`; ver `docs/paradas.md`).
- **Capas nuevas:** zonas de peligro (`data/capas/sol5070/`), alcance a pie (curvas de 10, 20 y 30 min hasta S) y
  CRISM más nítido (suavizado, fusión con HiRISE y modo "Interpretado: qué hay").
- **Perfil de ruta** en tarjeta flotante (botón "Ver perfil" de cada ruta): pendiente por color, posible arena, paradas, y
  tocar el gráfico lleva la cámara a ese punto.
- **Botones de mapa:** brújula (orienta al norte), ubicarme (centra y sigue al astronauta o al rover) y Volver a la base.
- **Rutas como cintas** apoyadas en el terreno, con flechas que avanzan en el sentido de la marcha.
- **Detalle con el método Anatomy** (piezas reales, chicas y precisas): Curiosity con brazo plegado y torreta (taladro,
  cepillo, MAHLI, APXS, CHIMRA), barra diferencial, actuadores de dirección, hazcams, radiadores del MMRTG, tomas de SAM y
  CheMin, blancos de calibración; astronauta con mangueras, guantes con dedos, muñequera, martillo y bolsa de muestras,
  rodamientos, fuelles de rodilla y suelas con tacos.
- **Huellas y polvo:** botas del astronauta y bandas de las ruedas del rover hasta donde llegó cada uno (acompañan la
  barra de tiempo), y polvo al pisar y al rodar. Reflejos del cielo en metales y visera; cielo con degradé.
- El borrador "a ojo" (`ruta_sol5070_cualitativa.geojson`) se carga oculto: se puede prender desde su casilla.
- En celular los paneles arrancan cerrados (botones "Panel" y "Datos").

## Cómo regenerarla
Cada vez que cambie una ruta, el terreno, los parámetros o `plantilla.html`:
```
python escena3d/armar.py                                  # zona sol5070 -> escena3d/index.html
python escena3d/armar.py --zona montesharp_s3331-3958     # otra zona -> escena3d/index_<zona>.html
```
Requiere numpy y pillow. Si la carpeta del terreno trae `cielo_bloqueado_u8.bin`, se usa; si no, se calcula
(1–2 minutos) y se guarda en `escena3d/.cache/` (no se versiona). Si no hay `orto.jpg`, se usa un relieve sombreado.
Si la carpeta trae `recorrido_curiosity.json`, el recorrido real se dibuja en amarillo. Solo se incluyen las rutas
de `data/rutas/` que caen enteras dentro de la zona.

Archivos:
- `plantilla.html`: el código de la página (HTML, CSS y JavaScript propios del equipo).
- `armar.py`: lee los datos del repo y escribe la página.
- `vendor/`: three.js r170 (`three.module.min.js`, `OrbitControls.js`) con su licencia MIT (`LICENSE-three-MIT.txt`).

## Medido, calculado y supuesto
| Qué | Tipo | De dónde |
| --- | --- | --- |
| Elevación y ortoimagen | medido | USGS, mosaicos de Gale de Calef y Parker, 2016 (`data/terreno/sol5070/README.md`) |
| Posición de Curiosity | medido | NASA, "Where is Curiosity?" |
| Recorrido real (zona Monte Sharp) | medido | MSL PLACES, `localized_interp.csv` |
| Rutas a ojo y sus paradas | propuesta del equipo | `data/rutas/` |
| Mineralogía por parada y en el visor | medido desde órbita (CRISM GMWG 2012) + lectura del equipo (umbrales) | `data/mineralogia/crism_sol5070/`, `docs/paradas.md` |
| Límites de pendiente, velocidades, alcance de 1,38 km, dosis en superficie, blindaje | supuesto (**provisorio**) | `data/parametros.json` y sus fuentes |
| Pendiente, cielo tapado, rutas A*, tiempos, dosis, inclinación del rover | cálculo propio | esta página y `armar.py` |
| Modelo de Curiosity | aproximado | proporciones a escala, sin detalle de ingeniería |
| Modelo y paso del astronauta | ilustrativo | traje genérico; paso de 1,4 m por ciclo elegido para que se vea la marcha de baja gravedad (supuesto visual, no medido) |

Detalles:
- **Pendiente de marcha:** desnivel en ventanas de 10 m a lo largo de la ruta. La pendiente del terreno se calcula por
  celda, con cos(lat) en el eje este-oeste. A 2 m es exigente: mucho terreno cercano supera 20°.
- **Cielo tapado:** ángulo de horizonte en 16 direcciones hasta 400 m (mismo método que `herramientas/build_terrain.py`).
- **Tiempo del astronauta:** función de Tobler normalizada a 2,5 km/h en llano. Es de caminata terrestre, no de traje.
- **Dosis:** dosis de superficie × (1 − factor de blindaje × fracción de cielo tapado), integrada con el tiempo.
- **Rover:** la suspensión se resuelve ajustando un plano a los seis puntos de contacto, no con la cinemática exacta del
  rocker-bogie. El sol usa la declinación con oblicuidad de 25,19° y Ls.
- Código propio. El simulador "ER-6 Terrain Explorer" fue solo inspiración visual; no se copió código.

## Verificación (13 de noviembre de 2026)
- Elevación del sol 5070: -3473,8 m (la verificación del terreno da -3473,9 m). Largo 2D de las rutas a ojo: 1457 m y
  1501 m, igual que el GeoJSON.
- Rutas a ojo: 54 m (vehículo) y 110 m (astronauta) sobre 20°. Rutas A* con paradas de prueba: 0 m sobre el límite.
- Probada en el navegador integrado (escritorio y celular emulado) y abierta desde archivo (`file://`) con Edge, sin
  errores. Zona Monte Sharp también probada.
- Falta: celular real, y medir fluidez en una computadora con placa de video común.

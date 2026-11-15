# Guía de estilo visual · Guidears (GALE-3D + Gale Earth)

Para que otro proyecto de mapa de Marte se pueda unir al nuestro **sin un salto de estilo**. Describe colores, tipografía, componentes, disposición y reglas de contenido tal como están en el código hoy (rama `david/union-gale-earth`, 15/11/2026).

**Fuente de verdad:** si esta guía y el código no coinciden, manda el código.
- GALE-3D (escena 3D de superficie): `escena3d/plantilla.html`, bloque `<style>` (variables en `:root`, líneas 8–11; portada en las clases `.po-*`).
- Gale Earth (globo de Marte): `maps-in-mars/cabecera.html`, bloque `<style>` (variables en `:root`, líneas 21–27).

Imágenes de esta guía: `docs/img/estilo/` (capturas reales a 1440 × 900 y una lámina de componentes armada con los valores exactos del código).

---

## 1. Lo primero: el proyecto tiene dos "pieles" y un mismo lenguaje

| | **GALE-3D** (superficie, 3D) | **Gale Earth** (globo) |
| --- | --- | --- |
| Para qué | Caminar o manejar sobre el terreno real, rutas, paradas, visor del casco | Ver Marte entero, órbitas, el cráter Gale, Biblioteca de perforaciones |
| Clima visual | Oscuro **cálido** (marrón tierra), acento **ámbar** | Oscuro **neutro** (gris tipo Google Earth), acento **naranja** |
| Fondo de paneles | `rgba(22,17,15,.9)` | `#202124` / `rgba(32,33,36,.94)` |
| Acento | `#ffcf7a` (ámbar) y botón primario `#cc6233` | `#f28c38` (naranja) |
| Letra base | `system-ui`, 13 px | `"Google Sans", Roboto, system-ui`, 14 px |
| Radio de esquinas | 8 px (paneles y botones) | 16 px (cajón), 12 px (tarjetas), 16–24 px (pastillas) |

Las dos comparten lo que **no puede cambiar** (sección 2). El paso de una a otra es intencional: del globo (vista "satélite", fría) se entra a la superficie (vista "suelo", cálida) con el botón **"Misión Curiosity · 3D"**, y se vuelve con **"Gale Earth ↗"**.

**Qué hacer en un proyecto nuevo:**
- Si es una **vista de mapa o globo** (navegar, buscar, capas regionales): usar la piel de **Gale Earth**.
- Si es una **vista de superficie** (3D a escala, rutas, datos del astronauta): usar la piel de **GALE-3D**.
- No inventar una tercera piel. Si no encaja en ninguna, usar GALE-3D.

![Portada de GALE-3D](img/estilo/01_gale3d_portada.png)
*Portada de GALE-3D: fondo `#0d0a0b`, ceja en ámbar con mayúsculas espaciadas, título grande en negrita, cifras con barra ámbar a la izquierda y botón primario naranja tostado.*

---

## 2. Invariantes: lo que tiene que ser idéntico en cualquier vista

Si el proyecto nuevo respeta solo esta sección, la unión ya no se va a notar.

### 2.1 Colores con significado

Estos colores **significan algo** y no se pueden reutilizar para otra cosa.

| Significado | Color | Dónde se ve |
| --- | --- | --- |
| Vehículo / rover | `#3fb6ff` | Ruta del rover, capa vehículo |
| Astronauta a pie | `#ff8a3d` | Ruta a pie, capa astronauta |
| Caminata (variante) | `#ffb27a` | Tramos de caminata dentro de una ruta a pie |
| Misión tripulada / rover presurizado | `#b06bff` | Rutas tripuladas |
| Regreso a la base / acción segura | `#4fbf7d` (botón `#2f8a55 → #23683f`) | "Volver a la base", ruta de regreso |
| OK, dentro del margen | `#7bd88f` | Barras de margen, "verificado" |
| Peligro / fuera de límite | `#ff6b6b` (en trazos `#ff5a4f`) | Tramo sobre el límite de pendiente, valores malos |
| Tramo exigente (> 15°) | `#ffd63c` | Perfil de elevación |
| Curiosity hoy | `#c0392b` (marcador 3D), `#e5534b` (globo) | Posición actual del rover |
| Recorrido de Curiosity | `#4fa3d9` | Línea de la travesía en el globo |

### 2.2 Alertas: 4 niveles, avisan pero no frenan

| Nivel | Borde e ícono | Uso |
| --- | --- | --- |
| Info | `#6bb7ff` | Dato útil, sin riesgo |
| Precaución | `#ffcf5a` | Acercándose a un límite |
| Peligro | `#ff8a3d` | Límite superado, se puede seguir |
| Crítico | `#ff4d4d`, borde que **late** | Riesgo para la persona (radiación, regreso fuera de tiempo) |

Forma: cápsula `rgba(25,18,15,.93)`, radio 10 px, ícono circular de 24–26 px con el color del nivel, título en negrita y una línea de detalle en gris (`--tenue`).

### 2.3 Marcas de veracidad (regla 4 del proyecto: medido · cálculo · supuesto)

Toda cifra en pantalla lleva su origen.
- **Círculo "?"**: 17 px (22 px en pantallas táctiles), borde ámbar al 55 %, letra ámbar. Al pasar el mouse se rellena de ámbar. Abre una ventanita con la fuente (título, URL en gris y botón "Abrir fuente ↗").
- **`provisorio`**: etiqueta con borde y texto ámbar `#ffcf7a`, 10,5 px. Para supuestos.
- **`verificado` / `a verificar`**: etiqueta con borde del color del texto: verde `#7bd88f` o ámbar `#ffcf7a`.
- **`SIMULACIÓN`**: banda ámbar sólida con texto oscuro, mayúsculas espaciadas. Para muestras o escenarios ficticios.

Un proyecto nuevo **no puede mostrar un número sin una de estas marcas o sin su "?"**.

### 2.4 Siempre oscuro
No hay modo claro. El fondo es oscuro en las dos pieles; el terreno o el globo ocupan toda la pantalla y la interfaz flota encima en paneles semitransparentes.

### 2.5 Formato de datos
- Números con `font-variant-numeric: tabular-nums` (no "bailan" al cambiar).
- Unidades del sistema internacional: m, km, °, mSv, µSv, min, h, °C, Pa.
- En castellano, coma decimal (`0,64 mSv/día`); en la versión en inglés, punto decimal.
- Coordenadas: latitud planetocéntrica y longitud este (`5,4° S · 137,8° E`).
- Tiempo marciano: "sol 5070", "Ls 22° · otoño".

### 2.6 Movimiento sobrio
- Aparecer: fundido + desplazamiento de 5 px, 0,16–0,25 s, `cubic-bezier(.2,.8,.2,1)`. Nada rebota.
- Botones: transición de 0,16 s; al apretar bajan 1 px.
- Respetar `prefers-reduced-motion`: sin animaciones.

---

## 3. Piel GALE-3D (superficie)

![Escena GALE-3D, zona de hoy](img/estilo/02_gale3d_escena.png)
*Panel izquierdo de menú con filas y flecha `›`, fila activa en naranja tostado; control segmentado arriba al centro; "Datos en vivo" a la derecha; botones flotantes redondos; barra de acciones abajo.*

### 3.1 Variables (copiar tal cual)

```css
:root {
  --fondo: #1b1210; --panel: rgba(22, 17, 15, 0.9); --borde: rgba(233, 226, 214, 0.18);
  --texto: #ece4da; --tenue: #a99d90;
  --vehiculo: #3fb6ff; --astronauta: #ff8a3d; --acento: #ffcf7a; --peligro: #ff6b6b; --ok: #7bd88f;
}
```

Otros valores fijos: fondo de portada `#0d0a0b`; fondo de gráficos (perfil) `#120c0a`; texto de párrafo destacado `#d3c7ba`.

### 3.2 Tipografía

| Uso | Valor |
| --- | --- |
| Base | `13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Título de panel (`h1`) | 15 px, negrita |
| Encabezado de sección (`h2`) | 11 px, MAYÚSCULAS, espaciado `.08em`, color `--tenue`, peso 600 |
| Texto secundario (`.sub`) | 12 px, `--tenue` |
| Etiquetas chicas | 10,5 px |
| Portada: ceja | 11,5 px, MAYÚSCULAS, espaciado `.12em`, ámbar |
| Portada: título | `clamp(30px, 4.4vw, 54px)`, interlineado 1,04, espaciado `-.015em` |
| Portada: cifras | 24 px con barra izquierda ámbar de 2 px |
| Visor del casco | `ui-monospace, "SF Mono", Menlo, Consolas` 12,5 px |

### 3.3 Componentes

![Lámina de componentes](img/estilo/06_componentes.png)
*Lámina armada con los valores exactos del código: paletas, botones, marcas de veracidad, alertas, marcadores, visor y piel de Gale Earth.*

- **Panel (`.caja`)**: fondo `--panel`, borde 1 px `--borde`, radio 8 px, padding 10 × 12 px. Posición fija sobre la escena, a 12 px de los bordes.
- **Botón normal**: degradé `#3a2d25 → #2a201b`, borde `rgba(233,226,214,.22)`, radio 8 px, alto mínimo 32 px (40 px en táctil), peso 500. Hover: borde ámbar. Foco: contorno ámbar de 2 px.
- **Botón activo** (`aria-pressed=true`): degradé `#5a4130 → #46321f`, borde ámbar, texto blanco.
- **Botón primario** (`.pri`): degradé `#cc6233 → #a8482a`, borde `#d9733f`, texto blanco. Uno por pantalla.
- **Control segmentado** (`.seg`): botones pegados con divisores de 1 px; el elegido usa el estilo "activo".
- **Fila de menú**: texto a la izquierda, valor en gris y `›` a la derecha; la fila activa va en naranja tostado.
- **Botones flotantes** (brújula, ubicarme): círculos de 46 px, fondo `rgba(28,21,18,.92)`, sombra `0 2px 8px rgba(0,0,0,.45)`.
- **Desplegables** (`details`): borde `--borde`, radio 7 px, triángulo `▸` ámbar que gira al abrir.
- **Destacado de hallazgo** (`.hall`): barra izquierda ámbar de 3 px.
- **Barra de margen**: 5 px de alto, relleno verde `--ok` y una raya vertical roja `--peligro` que marca el límite.
- **Tecla** (`kbd`): borde inferior de 2 px, fuente monoespaciada 11 px.

### 3.4 Disposición de pantalla

| Zona | Posición y medida |
| --- | --- |
| Panel izquierdo (capas, rutas, paradas, fuentes) | arriba a la izquierda, 330 px de ancho |
| "Datos en vivo" (rover, astronauta, entorno) | arriba a la derecha, 280 px |
| Selector de vista (Marte completo · Travesía · Zona de hoy · Gale Earth ↗) | arriba al centro |
| Barra de acciones | abajo, de borde a borde, con grupos separados por un divisor |
| Botones flotantes y "Manejar astronauta" | abajo a la derecha |
| Joystick táctil | abajo a la izquierda, 124 px |
| Tarjetas grandes (perfil, viaje por soles, expedición) | abajo al centro, ancho máximo 820–860 px |
| Alertas | arriba al centro, ancho máximo 520 px |

En pantallas de menos de 760 px los paneles pasan a ocupar el ancho y las fichas se acomodan abajo.

### 3.5 Visor del casco (HUD)

![Astronauta junto al rover, panel del astronauta abierto](img/estilo/03_gale3d_visor.png)
*Modo astronauta: "Volver a la base" en verde, control Visor/Ojos y datos de la salida (tiempo, dosis, cielo tapado, regreso, margen), cada uno con su "?".*

- Letra monoespaciada, texto `#bff6ff` con brillo cian `0 0 6px rgba(0,200,255,.55)`.
- Cajas `rgba(0,25,35,.38)` con borde `rgba(150,230,255,.35)`, radio 8 px y desenfoque de fondo.
- Títulos de caja en 10,5 px, espaciado `.14em`, color `#7fdcff`.
- Alerta dentro del visor: `#ff8f8f` con brillo rojo.
- Marco del casco: viñeta oscura ovalada en los bordes.

### 3.6 La escena 3D

- Cielo y niebla: `#c99a74` (niebla de 2500 a 6000 m). Luz del sol `#fff1dc`; luz ambiente `#f3dcc2` (cielo) / `#7a5038` (suelo).
- Rutas: cintas sobre el piso con flechas de sentido, en el color de su significado (2.1).
- Marcadores de paradas: círculo con borde oscuro `#1b1210` de 3 px, código corto (A2, B1, R1…) y un palito hasta el suelo. Colores por tipo: refugio `#2a9d8f`, mirador `#d98a2b`, muestra `#c04fb5`, precaución `#c9a227`, expedición `#e0703a`, otros `#8a7a6a`.
- Minerales (CRISM): sulfato hidratado `#c04fb5`, agua en minerales `#3c96ff`, arcilla Fe/Mg `#2a9d8f`, hematita `#d1495b`, olivino `#9ccf5a`, piroxeno `#c9a227`.

---

## 4. Piel Gale Earth (globo)

![Gale Earth, vista inicial](img/estilo/04_galeearth_inicio.png)
*Riel de íconos a la izquierda, buscador redondeado, pastillas de lugares con punto de color, botón "Misión Curiosity · 3D" arriba a la derecha y controles redondos abajo a la derecha.*

### 4.1 Variables (copiar tal cual)

```css
:root {
  --fondo: #0b0d12; --sup: rgba(32, 33, 36, .94); --sup2: #2b2c30; --sup3: #35363a; --linea: #3c4043;
  --texto: #e8eaed; --suave: #9aa0a6;
  --acento: #f28c38; --acento2: #ffb070; --ok: #4caf7d; --agua: #4fa3d9;
  --sombra: 0 1px 3px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.35);
  --riel: 72px;
}
```

### 4.2 Tipografía
- Base: `14px/1.45 "Google Sans", Roboto, system-ui, -apple-system, "Segoe UI", sans-serif`.
- Título del cajón: 18 px, peso 500. Título de ficha (`h3`): 19 px, peso 500.
- Encabezados de sección: 11,5 px, MAYÚSCULAS, espaciado `.9px`, color `--suave`, peso 500.
- **No incluir el archivo de "Google Sans"** (no tiene licencia abierta). Se nombra en la lista de fuentes por si el equipo la tiene instalada; en los demás casos se ve Roboto o la del sistema.

### 4.3 Componentes
- **Riel izquierdo**: 72 px, fondo `rgba(20,21,24,.92)` con desenfoque; botones de ícono (22 px) + rótulo de 10,5 px; el activo en `--acento2` con una pastilla `#f28c3826` detrás del ícono.
- **Buscador**: cápsula de 46 px de alto, radio 24 px, ancho 380 px.
- **Pastillas de lugar** (`.chipb`): alto 32 px, radio 16 px, punto de color de 9 px (Cráter Gale `#ff9f43`, Recorrido `#4fa3d9`, Curiosity hoy `#e5534b`, Marte entero `#c46a3c`).
- **Cajón lateral**: 400 px, fondo `#202124`, radio 16 px, sombra `--sombra`, entra con un desplazamiento de 30 px en 0,22 s.
- **Tarjeta**: fondo `--sup2`, radio 12 px; seleccionada con borde `--acento`.
- **Recuadro "para el astronauta"** (`.astro`): fondo verde muy oscuro `#1b2a21`, radio 12 px.
- **Botón**: fondo `--sup2`, radio 18 px, sin borde, 12,5 px; activo con fondo `--acento` y texto `#111`.
- **Etiquetas en el globo**: texto amarillo `#ffd166` con contorno oscuro. Borde del cráter: línea clara.

![Gale Earth con el cajón del cráter Gale](img/estilo/05_galeearth_gale.png)
*Cajón abierto: título de 18 px, recuadro verde "Por qué para una base" y fuente al pie en letra chica gris.*

---

## 5. Contenido y tono

- **Una idea por frase**, verbos directos, sin jerga sin explicar ("Cielo tapado aquí", no "factor de apantallamiento topográfico").
- Cada panel arranca con **qué es y de dónde sale** en una línea gris (ejemplo: "Donde está Curiosity hoy. Terreno real 1:1…").
- **Fuente al pie** de cada ficha, en 11 px gris.
- **Idioma**: los documentos internos van en castellano; **la entrega final va en inglés**. Un módulo nuevo tiene que tener los mismos textos en los dos idiomas que el resto, o al menos en inglés para la entrega.
- Nada de fotos de personas reales; imágenes de NASA/USGS/ESA con crédito.

---

## 6. Cómo enlazar un módulo nuevo sin que se note el salto

1. Copiar el bloque `:root` de la piel que corresponda (3.1 o 4.1) **sin cambiar valores**.
2. Usar los colores con significado de 2.1 y las alertas de 2.2.
3. Poner un "?" con fuente al lado de cada número (2.3) y marcar lo provisorio.
4. Respetar la disposición: menú a la izquierda, datos a la derecha, acciones abajo (GALE-3D) o riel + cajón (Gale Earth).
5. Agregar el acceso al módulo con el mismo patrón que ya existe: una pastilla arriba a la derecha (como "Misión Curiosity · 3D") o una opción más en el selector de vista (como "Gale Earth ↗").
6. Para volver, un botón "← Atrás" arriba a la izquierda del panel.
7. Íconos en SVG en línea, con `fill` o `stroke` en `currentColor`, de 16 px en botones y 22 px en botones flotantes y riel.

### Lista de control antes de unir

- [ ] Fondo y paneles con los valores de la piel elegida
- [ ] Letra y tamaños iguales (13 px GALE-3D / 14 px Gale Earth)
- [ ] Radio de esquinas igual (8 px / 12–16 px)
- [ ] Rover azul `#3fb6ff`, astronauta naranja `#ff8a3d`, regreso verde
- [ ] Alertas en los 4 niveles con sus colores
- [ ] "?" de fuente y etiquetas `provisorio` / `a verificar` / `SIMULACIÓN`
- [ ] Números con `tabular-nums` y unidades del sistema internacional
- [ ] Animaciones cortas y `prefers-reduced-motion`
- [ ] Probado a 1440 × 900 y en celular (menos de 760 px)
- [ ] Textos en inglés para la entrega

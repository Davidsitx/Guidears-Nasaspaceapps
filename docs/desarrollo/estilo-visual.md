# Estilo visual de GALE-3D

Todo lo nuevo tiene que parecer hecho por la misma mano. La línea es **sobria y técnica**, como una herramienta de misión y no como un juego:
- fondo oscuro cálido, color de Marte y un solo acento ámbar;
- movimiento sutil, sin rebotes ni brillos;
- texto claro y corto, con la fuente siempre a mano.

Las capturas de referencia están en [capturas/](capturas/). Todo vive en `escena3d/plantilla.html`, en el `<style>` del principio.

## 1. Colores (variables CSS)

| Variable | Valor | Para qué |
| --- | --- | --- |
| `--fondo` | `#1b1210` | fondo de la página |
| `--panel` | `rgba(22, 17, 15, .9)` | cajas y paneles sobre la escena |
| `--borde` | `rgba(233, 226, 214, .18)` | bordes de 1 px |
| `--texto` | `#ece4da` | texto principal (crema, no blanco puro) |
| `--tenue` | `#a99d90` | texto secundario, etiquetas, notas |
| `--acento` | `#ffcf7a` | ámbar: lo seleccionado, los "?", las etiquetas de supuesto |
| `--vehiculo` | `#3fb6ff` | todo lo del rover (rutas, chips) |
| `--astronauta` | `#ff8a3d` | todo lo del astronauta |
| `--peligro` | `#ff6b6b` | alertas, pendiente sobre el límite |
| `--ok` | `#7bd88f` | listo, verificado, sin peligro |

Más colores en uso:
- **Botón principal y modo activo:** naranja `linear-gradient(#cc6233, #a8482a)` con borde `#d9733f`.
- **Visor del casco:** cian `#7fdcff` sobre `rgba(0, 25, 35, .38)` con borde `rgba(150, 230, 255, .35)`. Es el único lugar con cian: identifica "datos dentro del casco".
- **Control en la Tierra:** también cian, en los mensajes de la misión en pareja.
- **Niveles de aviso:**
  - ok: verde `rgba(110,200,120,…)`;
  - precaución: amarillo `rgba(255,214,60,…)`;
  - peligro: rojo `rgba(220,30,40,…)`.

  Siempre como fondo suave más un borde, nunca como bloque saturado.

Regla: **un solo acento por vista**. El naranja fuerte se reserva para la acción principal o el modo activo.

## 2. Tipografía

- **Interfaz:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, 13 px de base y alto de línea 1,45.
- **Números:** `font-variant-numeric: tabular-nums`, para que no salten al cambiar.
- **Visor del casco:** `ui-monospace, "SF Mono", Menlo, Consolas, monospace`, 12,5 px. Encabezados en mayúscula con `letter-spacing: .14em`.
- **Portada:** título `clamp(30px, 4.4vw, 54px)`, peso 700 y `letter-spacing: -.015em`. Subtítulos de paso `clamp(24px, 3vw, 38px)`.
- **Etiquetas** (`.etq`, `.po-ceja`, `.po-grupo`): 10,5 a 11,5 px, mayúscula, `letter-spacing: .08–.12em`. La de portada va en ámbar y la del panel en `--tenue`.
- **Wiki:** 14 px y alto de línea 1,6, con un ancho máximo de 780 px.

## 3. Componentes (clases a reutilizar)

| Componente | Clase o id | Notas |
| --- | --- | --- |
| Caja sobre la escena | `.caja` | `position: fixed`, `--panel`, borde de 1 px, radio 8 px, padding 10 × 12 |
| Botón | `button` | radio 8 px, alto mínimo 32 px, borde `--borde`; al pasar el mouse, borde `--acento` |
| Botón principal | `button.pri` | naranja; uno por grupo como mucho |
| Seleccionado o activo | `aria-pressed="true"` | marrón con borde ámbar; en Visor, Ojos, Marcar, Destino y Manejar a mano suma un ✓. **Siempre `aria-pressed`, nunca una clase inventada** |
| Modo activo en la barra | `#ctrl .dk[aria-pressed=true]` | naranja (como `.pri`) |
| Selector segmentado | `.seg` con botones | Rover/Astronauta, vistas de arriba |
| Barra de abajo | `#ctrl` con `.grupo` y botones `.dk` (ícono + `<span>` corto) | una fila centrada; en celular se desliza |
| Ventanita de la barra | `.pop` (`#popRutas`, `#popEscena`) | sale encima del botón que la abre (`aria-expanded`) |
| Apartado plegable del panel | `details.sec` > `summary` (`.sec-t` título + `.sec-v` valor corto) | todos cerrados al abrir; `details.sec.destacada` es naranja (Paradas) |
| Tarjeta arriba a la derecha | `#llegada`, con `llegada(etq, tit, sub, botones)` | llegadas, destino con pin |
| Ficha | `#ficha` | paradas y perforaciones; dentro, `details` con `summary` |
| Tabla de datos | `table.tabla` | dos columnas; la derecha alineada y tabular |
| Supuesto o propio | `<span class="prov">supuesto</span>` | ámbar con borde; también "provisorio", "propuesta propia", "cálculo del equipo" |
| Verificado | `.verif.si` / `.verif.no` | verde o ámbar |
| Chip de parada | `.chip` | color de la parada o la campaña |
| Fuente | `fq('clave')` → `<a class="q">?</a>` | círculo de 17 px; abre la ventanita "Fuente del dato" |
| Aviso breve | `decir('texto')` → `#msg` | arriba al centro, se va a los 4,5 s |
| Avisos de seguridad | `#alertas` (pastillas y un cartel) | ver arquitectura.md, "Avisos" |
| Visor del casco | `#visor` con bloques `.vb` y un `h3` | cian y monoespaciado; en la misión en pareja se acopla a la derecha |
| Portada | `.portada`, `.po-*` | fondo opaco y globo de Marte a la derecha |
| Tarjeta de elección | `button.zona` / `button.modo` | ícono de 42 px, título, descripción y `em` en ámbar; `.rec` la destaca y `.rec-et` es la pastilla "Para empezar" |
| Wiki | `.wiki`, `#wiki-nav`, `#wiki-art`, `.wiki-lista` | pantalla completa, mismo fondo que la portada |

### Íconos

Son SVG en línea con `viewBox="0 0 24 24"`, `fill="none"` y `stroke-linecap="round"`, sin librerías de íconos:
- en la barra: `stroke="currentColor"` y `stroke-width="1.8"`, de 16 px;
- en la portada: `stroke="#ffcf7a"` y `stroke-width="1.5"`, de 42 px.

Los íconos de la portada están en el objeto `ic` del script de la portada: `flag`, `walk`, `rover`, `joy`, `eye`, `ruta`, `duo` y `brujula`.

## 4. Movimiento

- Transiciones de **150 a 200 ms** en color y borde. Al apretar, el botón baja 1 px (`translate: 0 1px`). Sin escalados ni rebotes.
- **Entradas:** `@keyframes aparecer` (opacidad de 0 a 1 en 0,35 a 0,6 s).
- **Cámara:**
  - `volarA(pos, mira, segundos)` interpola suave;
  - si la distancia cambia más de 15 veces, el vuelo es logarítmico, como en Google Earth;
  - se usan 1,4 s para lo común y 3 s para bajar desde el planeta.
- **Portada → escena:**
  1. El globo se corre al centro con Gale en el medio (1,15 s).
  2. La portada se funde (0,7 s).
  3. La cámara baja del planeta a la travesía (3 s) y después a la zona (1,4 s).
  4. La interfaz aparece recién al llegar.
- Se respeta `prefers-reduced-motion`: sin animación de entrada.

## 5. Cómo se escribe

- **Castellano rioplatense con voseo:** "tocá", "elegí", "manejás". Frases cortas, sin jerga técnica en la interfaz.
- **Verbos en los botones:** "Poner destino", "Manejar a mano", "Ver en 3D". **Preguntas en los títulos de la portada:** "¿Cómo querés prospectar Gale?".
- **Números:** con coma decimal y unidad: "13,6°", "0,64 mSv/día", "+38 km".
- **Cada dato con su "?":**
  - lo calculado por nosotros dice "cálculo propio" o "cálculo del equipo";
  - lo supuesto lleva `<span class="prov">supuesto</span>`;
  - lo inventado para mostrar dice **SIMULACIÓN**, como la perforación simulada.
- **Los avisos dicen qué pasa y qué hacer:** "Pendiente de 24° a 30 m sobre la ruta (límite del traje 20°). Pasen de a uno, despacio."
- **Nunca** "¡Genial!", emojis decorativos, signos de exclamación de más ni mayúsculas para gritar.

## 6. Disposición en pantalla (escritorio)

```
┌──────────────┬───────── vistas (Marte · Travesía · Hoy · Gale Earth) ─────────┬──────────────┐
│ ← Atrás      │                                                                 │ Datos en vivo│
│ Panel        │                       escena 3D                                 │ (plegable)   │
│ (apartados   │                                                                 │              │
│  plegables)  │                                                                 │  brújula ◎   │
│              │                                                                 │  Manejar …   │
│              │                                                                 │  Autonomía   │
└──────────────┴──── barra: modos │ Rutas · Escena · Info · Inicio ──────────────┴──────────────┘
```

- **Puntos de corte:** 1500 px (por encima, el panel queda abierto en los modos), 1100, 900 (portada en una columna), 760 (celular: panel y barra deslizables) y 520.
- **En celular:** la barra de abajo es una fila deslizable, el panel se abre con "Panel" y las fichas salen abajo.
- **Capas (`z-index`):** escena 0 · cajas 3–7 · avisos 6 · wiki 30 · portada 50.

## 7. Accesibilidad

- `aria-pressed` en todo lo que se prende y apaga, y `aria-expanded` en lo que abre una ventanita.
- `aria-live` en los avisos y en las comunicaciones.
- Foco visible: `outline: 2px solid var(--acento)`.
- Los colores de aviso siempre van acompañados de texto.
- Escape cierra la ventanita, la wiki, la portada reabierta y los modos.

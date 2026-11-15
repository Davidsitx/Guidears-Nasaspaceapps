# Prompts para el paso a paso: todo en Gale Earth

Mensajes listos para pegar en Claude, uno por fase del plan [qa-unificacion.md](qa-unificacion.md). El plan dice **qué** hay que hacer; estos mensajes le dicen a Claude **cómo trabajar** y **cómo mostrarte el resultado**, igual que veníamos haciendo (capturas de cada paso y la página para abrir).

> **Estado (15/11, mañana):** "Misión Curiosity" ya está dentro de Gale Earth.
> - **Hechas:** fases 1, 3, 5 y 6, la 4 casi entera, y los ítems 0.5 y 0.6.
> - **Siguen:** 2 (portada en Gale Earth), 7 (mundo abierto), lo que falta de la 4 (taladro y dron del GX-2) y la 8 (wiki y Biblioteca).
> - La fase 0A (arreglos en la escena) solo importa para la "versión clásica".

## Cómo se usa

1. **Traer lo último:**
   ```
   git checkout main
   git pull
   ```
2. **Crear una rama para la fase:** `git checkout -b david/fase-0` (o `companero/fase-0b`, etc.).
3. **Abrir Claude Code** en la carpeta del repo y pegar el **mensaje general** (abajo), con el número de fase. Si la fase tiene un agregado en la tabla, pegarlo al final.
4. **Una fase por conversación.** Si la conversación se hace larga, empezar una nueva con el mismo mensaje: Claude retoma desde `docs/notas.md`.
5. **Cuando Claude termine, verlo vos** (sección "Cómo verlo") y pasar la lista "Qué revisar" de esa fase. Si algo falla, pegar el **mensaje de corrección**.
6. **Fusionar el PR a `main`.** GitHub Pages se actualiza en 1 a 3 minutos. Al final de cada fase grande, volver a grabar el guion de QA (sección 5 del plan) y comparar con la grabación anterior.

## Cómo verlo
- **En la compu, todo junto:** `python maps-in-mars/servir.py` y abrir http://localhost:8765/maps-in-mars/ (la escena vieja, mientras exista, está en http://localhost:8765/escena3d/).
- **Si cambió Gale Earth,** antes de abrir: dentro de `maps-in-mars/`, `python _ensamblar.py` y `python armar.py`.
- **Si cambió la escena:** `python escena3d/armar.py`.
- **Publicado (después de fusionar):** https://davidsitx.github.io/Guidears-Nasaspaceapps/
- **Capturas:** Claude las guarda en `docs/desarrollo/capturas/fase-N/` y te las muestra al terminar.

---

## Mensaje general (para cualquier fase)

Cambiar lo que está entre `< >`.

```text
Antes de tocar nada, leé CLAUDE.md, la nota de arriba de todo de docs/notas.md y, de docs/desarrollo/, el README, qa-unificacion.md, estilo-visual.md y arquitectura.md. Si vas a tocar maps-in-mars/, leé también maps-in-mars/README.md.
Trabajá en la rama <david/fase-N>.

Quiero hacer la FASE <N> de docs/desarrollo/qa-unificacion.md: <título de la fase>. El objetivo general es que Gale Earth sea la única pantalla: nada de saltar de un Marte a otro.

Reglas:
- Seguí al pie de la letra la sección 3 del plan (transiciones, estados de botones y pines, movimientos): duraciones, curvas, nunca un corte a negro, recorridos de 4 min por defecto y que arranquen en pausa.
- maps-in-mars/ es del compañero: el código nuevo va en archivos nuevos (por ejemplo maps-in-mars/portada.js o maps-in-mars/mision.js) que sume _ensamblar.py; en lo que ya existe, solo enganches cortos. Anotá cada cambio en docs/notas.md.
- No edites a mano ningún plantilla.html ni index.html: se arman con los scripts (escena3d/armar.py; en maps-in-mars/, _ensamblar.py y armar.py).
- Cada dato lleva su fuente (los "?" y docs/fuentes.md). Lo medido, el cálculo propio y lo supuesto quedan marcados como hasta ahora.
- La lógica se porta desde escena3d/plantilla.html, no se reinventa: mismos números, mismos textos, mismas fuentes.
- Si una decisión no está en el plan y cambia lo que se ve, preguntame antes de hacerla.

Para mostrarme el resultado, como hicimos antes:
- Probá en el navegador con Playwright (si no está instalado: pip install playwright y python -m playwright install chromium). Recorré cada transición y cada botón de esta fase, revisá que la consola no tenga errores y sacá capturas de cada paso en docs/desarrollo/capturas/fase-<N>/ (nombre con el número de transición o de ítem, por ejemplo T3_mars_earth.jpg).
- Si no podés abrir un navegador, decime exactamente qué abrir y qué tocar para verlo yo.

Cuando termines:
- marcá la fase como hecha en qa-unificacion.md (lo que quedó y lo que no) y actualizá pantallas.md y pendientes.md;
- dejá una nota arriba de todo en docs/notas.md;
- hacé commit, push y abrí un PR a main;
- respondeme con: qué cambió (corto), las capturas, cómo verlo y la lista "Qué revisar" de esta fase con cada punto marcado como probado o no.
```

---

## Agregados por fase

Pegar debajo del mensaje general, cuando la fase lo tiene.

| Fase | Título para el mensaje | Quién (sugerido) | Agregado |
| --- | --- | --- | --- |
| 0A | Arreglos rápidos en la escena (ítems 0.1, 0.2, 0.3, 0.4, 0.8 y la parte de la escena de 0.7) | David | `Solo escena3d/. Para 0.7, el lado de la escena es pasar #desde-portada a Gale Earth y que el fundido de salida use el fondo de la portada.` |
| 0B | Arreglos rápidos en Gale Earth (ítems 0.5, 0.6 y la parte de Gale Earth de 0.7) | Compañero | `Solo maps-in-mars/. Con #desde-portada, la pantalla de carga usa el estilo de la portada de la escena (fondo, tipografía, Marte a la derecha) y la cámara arranca con ese encuadre.` |
| 0C | Fusionar y verificar lo publicado (ítem 0.9) | David | `Fusioná david/union-gale-earth a main si no está, esperá a que GitHub Pages se actualice y verificá H12 y la Base Gale en la Zona 2 en el sitio publicado.` |
| 1 | Los datos de la misión para Gale Earth | David | `La Base Gale se lee de data/base/sitios_base.geojson (la zona con elegida: true, hoy la Zona 2); no la vuelvas a calcular.` |
| 2 | La portada dentro de Gale Earth | David y compañero | `Empezá por un prototipo de la transición T3 (frustum.xOffset de -0,35 a 0 y vuelo en dos tramos) y mostrámelo antes de mover toda la portada.` |
| 3 | "Curiosity hoy" completo | David | `Incluí la Base Gale como pin en la Zona 2 y las zonas 1 y 3 como alternativas (pin chico, ficha corta).` |
| 4 | Modelos 3D en el globo | David | `Mostrame primero solo el rover Curiosity apoyado en el terreno de Gale Earth, con una captura de cerca, antes de exportar el resto.` |
| 5 | Misión Curiosity: rutas nuevas con el rover y el astronauta | David | — |
| 6 | Vista del astronauta: misión en pareja | David | `Los mensajes de la base salen de la Base Gale (Zona 2). Dejá preparado un lugar en los datos para sumar el guion de mensajes de la base más adelante.` |
| 7 | Mundo abierto y destino con pin | Compañero | — |
| 8 | Wiki, Biblioteca y retiro de GALE-3D | David y compañero | `No borres escena3d/: dejala como "versión clásica" en Ayuda hasta que el guion de QA pase entero.` |

## Qué revisar al terminar cada fase

| Fase | Qué revisar (vos, con la página abierta) |
| --- | --- |
| 0A | Pareja, Caminar y Seguir arrancan quietos con "▶ Salir" y 4 min. Inicio y Atrás muestran "¿Cómo querés prospectar Gale?". No se ven paneles vacíos al cargar. Arrastrar sobre el título no lo selecciona. Hay un solo botón para ir a Marte entero. |
| 0B | El vuelo del espacio al cráter nunca muestra solo estrellas. Los pines muestran la mano y se agrandan. Al entrar desde la portada, la carga se ve como la portada. |
| 0C | El sitio publicado tiene la Base Gale en la Zona 2 y el rover GX-2. Caminar no muestra "Llegaste a S". |
| 1 | Existe `maps-in-mars/datos/mision.json` (menos de 2 MB) y `armar.py` avisa si falta. La base está en la Zona 2. |
| 2 | La URL abre la portada encima del globo real. Mars Earth y Atrás no cambian de página ni cortan a negro (T1, T2, T3, T8). |
| 3 | Con "Curiosity hoy": paradas, rutas A, B y C, expedición y Base Gale, cada uno con su ficha y su fuente. Los pines tienen hover, seleccionado y visitado. |
| 4 | Rover, astronauta y base apoyados en el terreno, sin flotar. La página sigue fluida. |
| 5 | Rutas de 4 min por defecto, en pausa al entrar, se detiene en cada parada, Salir vuelve a Curiosity hoy (T4, T6, T7). Curiosity y GX-2. |
| 6 | La pareja hace lo mismo que en la escena vieja: cámara del casco, visor, comunicaciones con la demora real y minimapa. |
| 7 | W A S D mueve al rover y al astronauta con los mismos avisos de pendiente, arena, distancia a la base y margen del traje. |
| 8 | Ningún botón abre otra página. La wiki y la Biblioteca son una sola. El guion de QA pasa entero. |

---

## Mensaje para la prueba completa (guion de QA)

Para usar después de cada fase grande (2, 3, 5 y 6) y antes de la entrega.

```text
Leé docs/desarrollo/qa-unificacion.md (sección 5, guion de QA). Abrí la versión <local: python maps-in-mars/servir.py | publicada: https://davidsitx.github.io/Guidears-Nasaspaceapps/> y recorré los 15 pasos con Playwright, a 1920 × 1080 y a 1366 × 768. En cada paso sacá una captura en docs/desarrollo/capturas/qa-<fecha>/ y anotá si pasa o no, con lo que se vio y el error de consola si hubo.
Respondeme con una tabla de 15 filas (paso, pasa o no, qué se vio) y las capturas de los que fallan. No arregles nada todavía: solo el informe.
```

## Mensaje de corrección

Cuando algo de "Qué revisar" no pasa.

```text
En la fase <N> falla esto: <qué hice, qué pasó y qué esperaba; si tenés una captura o el segundo del video, mencionalo>.
Revisalo contra la sección 3 de docs/desarrollo/qa-unificacion.md, arreglalo en la misma rama, volvé a probar ese punto y los que estén cerca, y mostrame la captura de antes y la de después.
```

# Guía de desarrollo de GALE-3D (para Claude y para el equipo)

Esta carpeta explica **cómo está hecho GALE-3D** para seguir desarrollándolo con el mismo estilo, la misma estructura y las mismas reglas. La escribimos para que cualquier sesión de Claude (o una persona) pueda tomar el repositorio e implementar lo que falta sin romper lo que ya anda.

**Lo primero ahora: [qa-unificacion.md](qa-unificacion.md)** (el plan) y **[prompts-unificacion.md](prompts-unificacion.md)** (los mensajes para pegar en Claude, fase por fase, con qué revisar en cada una). Decidimos que Gale Earth sea la única pantalla. Ahí están los problemas que mostró la grabación de QA (con su segundo), cómo tiene que quedar, las reglas de transiciones, botones y movimientos, las fases para pasar todo a Gale Earth y el guion para volver a probar.

**Para el equipo: [paso-a-paso.md](paso-a-paso.md)** explica cómo juntar todo en `main`, publicarlo con GitHub Pages, instalarlo y seguir con Claude (con el primer mensaje listo para pegar).

## Orden de lectura

1. **Este archivo.** Qué es el producto, cómo está organizado y qué no se negocia.
2. **[pantallas.md](pantallas.md):** cada pantalla y cada botón, con capturas. Es la especificación funcional.
3. **[estilo-visual.md](estilo-visual.md):** colores, tipografía, componentes, movimiento y forma de escribir. Todo lo nuevo tiene que verse igual.
4. **[arquitectura.md](arquitectura.md):** cómo está armado el código, qué funciones usar y recetas para sumar un modo, una sección del wiki, una fuente o una capa.
5. **[pendientes.md](pendientes.md):** lo que falta, en orden de prioridad, con criterio de aceptación.

También conviene leer `CLAUDE.md` (raíz), `docs/notas.md` (traspasos, arriba lo más nuevo) y `docs/contrato.md` (interfaces entre las partes del equipo).

## El producto en una línea

Una guía de superficie para Marte: el robot (Curiosity) y una persona (astronauta) sobre el **terreno real del cráter Gale a escala 1:1**. En cada lugar comparamos pendiente, radiación, minerales y clima, y **cada dato tiene su fuente a un toque** (los círculos "?").

Desafío: NASA Space Apps 2026, *Interplanetary Survival Guide: Martian Map*.

## Mapa del producto

La portada tiene **tres pasos**: Inicio → Entrada → Recorrido. Desde la **Entrada** hay cuatro caminos:

| Entrada | Qué hace | Dónde está |
| --- | --- | --- |
| **Mars Earth** | Marte desde el espacio, con el cráter Gale en foco. Abre Gale Earth, que arranca en el espacio y se acerca a Gale. Si Gale Earth no está al lado, muestra "Marte completo" dentro de la escena. | `maps-in-mars/` (CesiumJS, del compañero) |
| **Recorrido en Marte** | Las **dos visualizaciones principales**: (1) **Misión en pareja** y (2) **Rover y astronauta**, más la expedición sur y el viaje 2012 → hoy. | `escena3d/` |
| **Mundo abierto** | Sin ruta fija: astronauta, rover o cámara libre, con destino con pin y avisos de peligro. | `escena3d/` |
| **Información / wiki** | Todo lo que juntamos, con buscador: por qué Gale, paradas, 49 perforaciones, clima, límites, comunicaciones y fuentes. | `escena3d/` |

Las dos visualizaciones principales son:

1. **Misión en pareja.**
   - La pantalla grande muestra **lo que ve el Astronauta 1** (cámara del casco).
   - A la derecha va el **visor del Astronauta 2**, con datos de suelo, radiación, refugio, próxima parada y un minimapa.
   - Abajo, las **comunicaciones con las bases**: la base en Marte (el rover) responde enseguida y el control en la Tierra llega con la demora real de la luz.
2. **Rover y astronauta.** El recorrido guiado por las paradas, caminar la ruta B, seguir al rover por la ruta A, la expedición sur (rover o a pie, con manejo a mano) y el viaje 2012 → hoy.

## Mapa del repositorio (lo que importa para desarrollar)

```
escena3d/
  plantilla.html     ← TODO el código de GALE-3D (HTML + CSS + JS). Se edita esto.
  armar.py           ← arma index.html: mete los datos (terreno, rutas, capas) como JSON dentro de la página
  index.html         ← resultado. NO se edita a mano.
  vendor/            ← three.js r170 embebido (sin internet)
maps-in-mars/          ← Mars Earth / Gale Earth (del compañero). Se arma con _ensamblar.py + armar.py
data/                ← datos de entrada (terreno, rutas, Curiosity, mineralogía, globo, parametros.json)
herramientas/        ← scripts que generan los datos (A*, CRISM, expedición, globo, CTX, fuentes)
docs/                ← documentación interna (castellano). docs/desarrollo/ es esta guía
```

## Comandos

```bash
python escena3d/armar.py                 # arma escena3d/index.html (se abre con doble clic, sin servidor)
python escena3d/armar.py --globo-aparte --salida /ruta/web/index.html   # versión para publicar (archivos < 16 MB)
python maps-in-mars/servir.py              # sirve maps-in-mars/ y escena3d/ juntos en http://localhost:8765
python herramientas/listar_fuentes.py    # regenera docs/fuentes-enlaces.md desde FUENTES_URL
python herramientas/bajar_ctx.py         # opcional, con internet: imagen CTX alrededor de Gale
```

En Windows: `python` o `py`. Hace falta `pip install pillow numpy`.

## Reglas que no se negocian

1. **Todo dato lleva fuente.** Si es un número o una afirmación sobre Marte, va con su "?" (`fq('clave')`) y la fuente se registra en `FUENTES_URL` y en `docs/fuentes.md`.
2. **Separar medido, cálculo propio y supuesto.** Se marcan con `<span class="prov">supuesto</span>`, "cálculo propio" o "SIMULACIÓN". Nunca se presenta un supuesto como medido.
3. **No editar `index.html` a mano.** Se edita `plantilla.html` y se corre `armar.py`.
4. **La lógica de la misión no se toca al cambiar la presentación.** Los modos se suman, no se reescriben. Se mantienen los ids y las funciones existentes.
5. **`maps-in-mars/` es del compañero.** Solo se cambia con aviso en `docs/notas.md` y por PR.
6. **Castellano rioplatense en la interfaz** (voseo, claro, sin jerga). Los entregables finales van en inglés.
7. **Nada de fotos de personas reales ni material con derechos de terceros.** Las imágenes de NASA llevan su crédito.

## Antes de dar algo por terminado

- [ ] `python escena3d/armar.py` corre sin errores.
- [ ] La página abre sin errores en la consola (ver la prueba con Playwright en arquitectura.md).
- [ ] Lo nuevo se ve como el resto (estilo-visual.md) en escritorio (1366 × 768) y en celular (390 × 844).
- [ ] Cada dato nuevo tiene "?" y está en `docs/fuentes.md`.
- [ ] Nota arriba de todo en `docs/notas.md`: qué se hizo, qué falta y qué se decidió.
- [ ] Commit en la rama propia (`david/...` o `companero/...`) y PR a `main`.

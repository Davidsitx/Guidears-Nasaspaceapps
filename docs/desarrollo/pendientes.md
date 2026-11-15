# Lo que falta, en orden de prioridad

Cada ítem tiene **qué hacer**, **dónde** y **cuándo está terminado**. Al tomar uno, anotarlo en `docs/notas.md`; al terminarlo, sacarlo de esta lista.

## Para la entrega (prioridad alta)

### 1. Textos en inglés para los entregables
- **Qué:** el video con subtítulos en inglés y la página del proyecto en inglés. La interfaz sigue en castellano, salvo que se decida un selector de idioma.
- **Dónde:** `docs/entrega.md` (plan) y `docs/por-que-perforar.md` (guion de 30 s, que ya tiene subtítulos en inglés).
- **Terminado cuando:** existe la página del proyecto en inglés con el link a la demo y el video subido.

### 2. Fusionar el PR a `main` y publicar con GitHub Pages
- **Qué:** el PR #5 (`david/union-gale-earth`) ya incluye el #6 del compañero. Revisarlo, fusionarlo y activar Pages en la raíz.
- **Terminado cuando:** el link público abre Gale Earth (raíz) y la escena (`/escena3d/`), y la ida y vuelta funciona.

### 3. Probar en una tablet real
- **Qué:** la portada, la misión en pareja (visor y comunicaciones lado a lado), el joystick y la wiki con el dedo.
- **Terminado cuando:** no hay superposiciones a 768 × 1024 ni a 390 × 844, y la escena corre a más de 20 cuadros por segundo con "Calidad: liviana".

## Misión en pareja (prioridad media)

### 4. Línea de vista entre los astronautas y la base
- **Qué:** si el relieve tapa la línea entre un astronauta y el rover, la base no se escucha directo y los mensajes pasan por el compañero. Gale Earth ya calcula la línea de vista sobre el relieve con antenas a 2 y 3 m (supuesto), en la pestaña Expedición: copiar la idea, no el código.
- **Dónde:** `avisosPareja()` y un indicador de señal en `#pa-comms`.
- **Terminado cuando:** en la ruta B aparece "Sin línea de vista con la base" donde corresponde, con "?" y la marca "cálculo propio".

### 5. Que el Astronauta 2 se pueda manejar
- **Qué:** hoy el Astronauta 2 sigue la ruta 6 m adelante. Se puede sumar que se mueva a mano (W A S D o joystick) mientras la cámara sigue mostrando lo que ve el Astronauta 1, con aviso si se separan más de 30 m (regla de pareja, supuesto).
- **Terminado cuando:** el minimapa y el "compañero a N m" reflejan la separación real y sale un aviso de la base.

### 6. Vista chica de lo que ve el Astronauta 2
- **Qué:** una segunda cámara en una esquina, con `renderer.setScissor` y `setViewport` después del render principal, mostrando lo que ve el Astronauta 2. Va con un interruptor, porque cuesta rendimiento.
- **Terminado cuando:** se ven las dos vistas a más de 20 cuadros por segundo en una PC común.

### 7. Mensajes según el clima del día
- **Qué:** usar `gale-earth/datos/clima_rems.json` y `viento_humedad.json` (del compañero) para los mensajes de la Tierra: mínima, máxima, viento y UV de la estación.
- **Terminado cuando:** "Pedir pronóstico" responde con números de REMS y su fuente.

## Datos (prioridad media)

### 8. Imagen CTX alrededor de Gale en la escena
- **Qué:** correr `python herramientas/bajar_ctx.py` en una PC con internet y subir `data/terreno/globo/ctx_*`. También se puede leer de las teselas de Gale Earth en Hugging Face (`gale-earth/nube.json`).
- **Terminado cuando:** `armar.py` dice "globo: imagen CTX incluida" y alrededor de la travesía se ven cráteres chicos.

### 9. Pozos 47 a 49 cuando el PDS publique sus datos
- **Qué:** volver a correr `gale-earth/armar_biblioteca.py` (compañero) y después `escena3d/armar.py`. Las fichas se actualizan solas.
- **Terminado cuando:** CheMin y APXS aparecen en esas fichas.

### 10. Arena en el terreno de contexto
- **Qué:** la expedición a mano y el destino fuera de la zona de hoy solo miran la pendiente. Gale Earth tiene un indicio de arena con THEMIS de noche (`gale-earth/capas/expedicion/`). Sumarlo como grilla de 12 m.
- **Terminado cuando:** el aviso en vivo de la expedición también dice "posible arena".

## Calidad (prioridad baja)

### 11. Selector de idioma (castellano / inglés)
- **Qué:** sacar los textos de la interfaz a un objeto `TXT = { es: {…}, en: {…} }`.
- **Terminado cuando:** un botón cambia todo, incluidas la portada y la wiki.

### 12. Prueba automática en el repo
- **Qué:** guardar la prueba de Playwright de `arquitectura.md` como `herramientas/probar_escena.py`. Tiene que recorrer la portada, cada modo y la wiki, y fallar si hay errores en la consola.
- **Terminado cuando:** `python herramientas/probar_escena.py` termina con "OK" o con la lista de errores.

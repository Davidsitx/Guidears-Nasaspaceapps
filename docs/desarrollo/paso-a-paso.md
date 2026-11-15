# Paso a paso para el equipo

Qué hacer, en orden, para juntar todo, publicarlo y seguir desarrollando con Claude.

## 1. Juntar todo en `main` (5 min, en GitHub)

1. Abrir el PR #5: https://github.com/Davidsitx/Guidears-Nasaspaceapps/pull/5
2. Ya no tiene conflictos. Trae todo junto:
   - la escena GALE-3D;
   - la unión con Gale Earth;
   - el PR #6 del compañero;
   - las capas nuevas de Gale Earth;
   - la rama `companero/licencia-fuentes`, con la licencia Apache 2.0, `.nojekyll` y la dosis de 0,64.
3. Tocar **"Merge pull request"** y después **"Confirm merge"**.
4. Opcional: borrar las ramas viejas que ya quedaron adentro (`companero/gale-earth`, `companero/gale-earth-rutas`, `companero/licencia-fuentes`).

## 2. Publicarlo con GitHub Pages (5 min)

1. En el repo: **Settings → Pages**.
2. En "Build and deployment": **Source: Deploy from a branch**, **Branch: `main`**, carpeta **`/ (root)`** → **Save**.
3. Esperar de 1 a 3 minutos. El link queda así: **https://davidsitx.github.io/Guidears-Nasaspaceapps/**
4. Probar la ida y la vuelta:
   - el link abre Mars Earth (Gale Earth);
   - "Misión Curiosity · 3D" abre la escena;
   - en la escena, la portada → "Mars Earth" vuelve a Gale Earth.
5. Las teselas de Gale Earth vienen de Hugging Face y la escena trae todo adentro (19 MB): la primera carga tarda unos segundos.

## 3. Tener el proyecto en la compu

**Con git:**
```
git clone https://github.com/Davidsitx/Guidears-Nasaspaceapps.git
cd Guidears-Nasaspaceapps
```
Si ya lo tenían clonado: `git checkout main` y `git pull`.

**Sin git:** bajar el ZIP (https://github.com/Davidsitx/Guidears-Nasaspaceapps/archive/refs/heads/main.zip) y descomprimirlo con "Extraer todo".

**Una sola vez:** instalar Python 3.10 o más nuevo y correr `python -m pip install pillow numpy`.

**Para verlo:**
- La escena sola: doble clic en `escena3d/index.html` (ya viene armada).
- Todo junto, con todas las capas: `python gale-earth/servir.py` y abrir http://localhost:8765/gale-earth/
- Si se cambió `escena3d/plantilla.html`, hay que rearmar: `python escena3d/armar.py`.
- Si se cambió algo de Gale Earth: dentro de `gale-earth/`, correr `python _ensamblar.py` y después `python armar.py`.

## 4. Seguir desarrollando con Claude

1. Crear una rama propia: `git checkout -b companero/<tema>` (o `david/<tema>`).
2. Abrir Claude Code en la carpeta del repo.
3. Pegarle este primer mensaje, cambiando lo que está entre < >:

> Antes de tocar nada, leé `CLAUDE.md`, la nota de arriba de todo de `docs/notas.md` y toda la carpeta `docs/desarrollo/` (README, pantallas, estilo-visual, arquitectura y pendientes). Trabajá en la rama `<companero/tema>`.
> Quiero hacer el pendiente N.º <X> de `docs/desarrollo/pendientes.md`: <título>.
>
> Seguí el estilo visual y las recetas de `arquitectura.md`. No edites `escena3d/index.html` a mano: se arma con `python escena3d/armar.py`. Cada dato nuevo va con su fuente (`fq` y `docs/fuentes.md`) y lo supuesto queda marcado.
>
> Cuando termines:
> - probá que la página abre sin errores (la prueba está en `arquitectura.md`);
> - dejá una nota arriba de todo en `docs/notas.md`;
> - actualizá `pantallas.md` y `pendientes.md`;
> - hacé commit, push y abrí un PR a `main`.

4. Revisar el PR (que lo mire el otro, o su Claude) y fusionarlo.
5. Si GitHub dice que el PR tiene conflictos, pedirle a Claude:

> Fusioná `main` en esta rama y resolvé los conflictos: en `docs/notas.md` quedan las dos notas, y `gale-earth/index.html` se rearma con `_ensamblar.py` y `armar.py`.

## 5. Qué falta (sugerencia de reparto)

El detalle de cada punto, con su criterio de aceptación, está en `docs/desarrollo/pendientes.md`.

**Para la entrega (primero):**

| Quién | Qué |
| --- | --- |
| Compañero | Fusionar el PR y publicar con Pages (pasos 1 y 2). |
| David | Textos en inglés y video de 30 s. El guion con subtítulos en inglés está en `docs/por-que-perforar.md` y el plan en `docs/entrega.md`. |
| Los dos | Probar en una tablet: portada, misión en pareja, joystick y wiki. |

**Después, para mejorar:**

| Quién | Qué |
| --- | --- |
| David | Misión en pareja: línea de vista con la base (4), manejar al Astronauta 2 (5), vista chica del Astronauta 2 (6) y pronóstico con números de REMS (7). |
| Compañero | Datos: imagen CTX en la escena desde las teselas de Hugging Face (8), pozos 47 a 49 cuando salga el PDS (9) y arena THEMIS en el terreno de 12 m (10). |
| Cualquiera | Selector castellano/inglés (11) y prueba automática (12). |

## 6. Reglas (las de siempre)

- Todo dato con fuente. Lo medido, lo calculado y lo supuesto se separan, y lo supuesto se marca.
- Cada uno en su rama, con PR a `main` y una nota en `docs/notas.md`.
- `gale-earth/` es del compañero y `escena3d/` de David. Si se toca la carpeta del otro, se avisa en la nota.
- La interfaz va en castellano rioplatense; los entregables, en inglés.
- Nada de fotos de personas reales. Las imágenes de NASA llevan su crédito.

## 7. Si algo falla

- **Pages muestra 404:** esperar unos minutos más y revisar que esté en `main` y `/ (root)`.
- **La escena se queda en "Cargando":** abrir la consola (F12) y pasarle el error a Claude. Lo más común es un `$('id')` que no existe; `arquitectura.md` tiene el control.
- **`python` no se reconoce:** probar con `py`, o instalarlo con `winget install Python.Python.3.12` y abrir una terminal nueva.
- **El ZIP no corre:** fijarse de estar en la carpeta que tiene `escena3d`, `gale-earth` y `herramientas` adentro.

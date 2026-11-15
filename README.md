# Maps in Mars — Martian Map: rover vs. astronaut routes from Curiosity's current position

NASA Space Apps Challenge 2026 · Challenge: *Interplanetary Survival Guide: Martian Map* · Local event: San Luis, Argentina.

We compare two ways of exploring the same real Martian terrain, starting where NASA's Curiosity rover is today (sol 5070, Gale crater):

- **Vehicle layer:** a rover route constrained by slope, sand, wheel wear and a daily energy budget.
- **Astronaut layer:** a walking route constrained by suit slope limits, walking time and radiation dose, using terrain shadow to reduce exposure.

Every stop is tied to a current science question of the Curiosity team.

**Installation:** [English](#run-it-on-your-computer) · [Castellano](#instalación-en-tu-computadora)

## Try it online

Open **<https://davidsitx.github.io/Guidears-Nasaspaceapps/>** in Chrome or Edge, on a computer or a phone. Nothing to install.

The online version streams the terrain tiles from our public dataset on Hugging Face, so the first visit to each area can be slow. For the smooth version, run it on your computer.

## Run it on your computer

Maps in Mars is a web page plus a small Python server that comes with the repository (`maps-in-mars/servir.py`). The server only uses the Python standard library: there is nothing to `pip install` to run the app.

### 1. Requirements

| | |
| --- | --- |
| System | Windows 10 or 11, macOS or Linux |
| Python | 3.10 or newer. On Windows, use the installer from [python.org](https://www.python.org/downloads/) and tick **"Add python.exe to PATH"** before clicking Install |
| Browser | Chrome or Edge (recommended); Firefox and Safari also work |
| Internet | Always needed: CesiumJS, the CTX imagery and the Viking colour load live. Local tiles only replace the relief and the HiRISE photos |
| Disk | About 200 MB for the project, plus about 6 GB for the optional terrain tiles |

To check Python, open a terminal (on Windows: Windows key, type `PowerShell`, Enter) and run `python --version` (`python3 --version` on macOS/Linux).

### 2. Get the code

**Option A, ZIP (no Git):**
1. Download <https://github.com/Davidsitx/Guidears-Nasaspaceapps/archive/refs/heads/main.zip>.
2. Right-click the ZIP → **Extract All…** and pick a short folder outside OneDrive, for example `C:\Marte`. Do not run anything from inside the ZIP.

**Option B, Git:**
```
git clone https://github.com/Davidsitx/Guidears-Nasaspaceapps.git
```

The app lives in the **`maps-in-mars`** folder: it contains `abrir.bat`, `servir.py` and `index.html`.

### 3. Terrain tiles (optional, recommended)

Without tiles, the globe falls back to the Cesium Mars terrain, which is detailed only in a small part of Gale. With them you get our global relief, Gale at 5 m and HiRISE photos at 25 cm.

The tiles are about 23 `.zip` files in the public dataset [ChuchuTEA/gale-earth-teselas](https://huggingface.co/datasets/ChuchuTEA/gale-earth-teselas). They go in `maps-in-mars/teselas/` **as `.zip`, without unzipping**. From inside the `maps-in-mars` folder, these two commands download them there (or download them by hand from the dataset's **Files and versions** tab):

```
python -m pip install huggingface_hub
python -c "from huggingface_hub import snapshot_download; snapshot_download('ChuchuTEA/gale-earth-teselas', repo_type='dataset', allow_patterns='*.zip', local_dir='teselas')"
```

- If you already have them elsewhere, copy them to `maps-in-mars/teselas/`, or start the server with that folder: `python servir.py "D:\path\to\teselas"`.
- The server also finds them by itself in the team's Google Drive: `G:\Mi unidad\Marte\teselas` or `G:\My Drive\Marte\teselas`.
- `maps-in-mars/teselas/` is ignored by Git.

### 4. Start

- **Windows:** double-click `maps-in-mars\abrir.bat`.
- **macOS / Linux:** `cd maps-in-mars` and then `python3 servir.py`.

The first time, Windows may ask twice:
- **"Windows protected your PC"** (ZIP downloads only): **More info → Run anyway**.
- **Firewall**: allow Python on **Private networks**. This is what lets phones connect.

A terminal window opens: that is the server. **Keep it open while you use the app.** It should look like this (the counts vary):

```
Maps in Mars · buscando teselas…
  terreno_gale_n8-15.zip: … teselas  (…\maps-in-mars\teselas\…)
  terreno_marte_global_n0-7.zip: … teselas  (…)
  hirise_25cm_teselas_….zip: … teselas  (…)
Abrí http://localhost:8765/index.html  ·  cerrá esta ventana para apagar el servidor
Desde el celular (mismo Wi-Fi): http://192.168.x.x:8765/index.html
```

The browser opens **<http://localhost:8765/index.html>** by itself. If port 8765 is busy, the server takes the next free one and shows it.

### 5. Check that it works

- [ ] The loading screen, then the Mars globe, with no "tiles not found" warning.
- [ ] **EN / ES** (bottom left) switches the language.
- [ ] At the top, **New mission** flies to today's area with our routes, Gale Base, the PMR pressurized rover and the two-person mission.
- [ ] **49 drill holes** shows Curiosity's drill holes, and **New route** lets you drop your own pins and get the safest route.
- [ ] **Curiosity mission** (top right) shows the traverse from 2012 to today.

### 6. Phones and other devices on the same Wi-Fi

- Open the address shown on the line "Desde el celular" in the server window, for example `http://192.168.0.15:8765/index.html`.
- If it does not connect, the venue Wi-Fi is probably isolating devices. Share the phone's mobile hotspot instead, connect the computer and the other devices to it, and restart the server.
- On a phone, **Add to Home Screen** installs it like an app.
- To keep it on this computer only: `python servir.py --solo-pc`.

### 7. Share it outside your network (optional)

A free [Cloudflare quick tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) gives a public `https://` link with no account. The tiles are still served from your computer.

```
winget install --id Cloudflare.cloudflared        # Windows, once; then open a new terminal
python servir.py --solo-pc                        # terminal 1, in maps-in-mars
cloudflared tunnel --url http://127.0.0.1:8765    # terminal 2 (same port as terminal 1)
```

Terminal 2 prints a `https://….trycloudflare.com` address: add `/index.html` and share it. The link changes every time, the computer must stay on, and speed depends on your upload bandwidth.

### 8. Update and stop

- **Stop:** close the server window, or press Ctrl+C in it.
- **Update with Git:** `git pull`.
- **Update with the ZIP:** move `maps-in-mars/teselas` out of the way, replace the folder with the new ZIP, and put `teselas` back.
- After updating, reload the page with **Ctrl+Shift+R**.

<details>
<summary><b>Troubleshooting</b></summary>

| Problem | Fix |
| --- | --- |
| `python` is not recognized, or the Microsoft Store opens | Reinstall Python with "Add python.exe to PATH". Or turn off Settings → Apps → Advanced app settings → App execution aliases → `python.exe` / `python3.exe`. `py` instead of `python` also works |
| The server window closes right away | Open a terminal in `maps-in-mars` and run `python servir.py` to see the error |
| "no encontré teselas" or "tiles not found" | The `.zip` files are not in `maps-in-mars/teselas/` (step 3). After moving them, reload the page |
| Black globe or no imagery | No internet: CesiumJS and the imagery load live |
| The mission does not load | The page was opened by double-clicking `index.html`. Use `http://localhost:8765/index.html` with the server running |
| Old version still showing | Close old server windows and reload with Ctrl+Shift+R |
| Slow | Use Chrome or Edge with hardware acceleration on (Settings → System). Plug in the laptop and close other tabs |
| The tunnel shows "502 Bad Gateway" | Terminal 1 is closed or uses another port |

</details>

<details>
<summary><b>Other apps in this repository</b></summary>

- **GALE-3D, the classic 3D scene** (`escena3d/index.html`): a single self-contained page. Double-click it: it works offline. With the server running it is also at `http://localhost:8765/escena3d/index.html`.
- **2D route planner prototype** (`prototipo/planificador/index.html`): open it in a browser.

</details>

<details>
<summary><b>For developers</b></summary>

- Do not edit `maps-in-mars/index.html` or `plantilla.html` by hand. Edit the sources (`cabecera.html`, `_cuerpo.html`, `*.js`), then run, inside `maps-in-mars`, `python _ensamblar.py` and then `python armar.py`.
- Classic scene: edit `escena3d/plantilla.html`, then `python escena3d/armar.py`.
- Mission data and models: `python herramientas/exportar_mision.py`, from the repository root. It needs `python -m pip install numpy pillow`.
- Architecture, style guide and screens: `docs/desarrollo/` (Spanish).

</details>

---

## Instalación en tu computadora

**Para probarlo sin instalar nada:** abrí **<https://davidsitx.github.io/Guidears-Nasaspaceapps/>** en Chrome o Edge, en la compu o el celular. El terreno llega desde internet, así que la primera vez en cada zona puede tardar. Para la versión fluida, instalalo así.

Maps in Mars es una página web y un pequeño servidor en Python que ya viene en el repo (`maps-in-mars/servir.py`). Solo usa lo que trae Python: no hay que instalar paquetes para usar la app.

### 1. Lo que hace falta

| | |
| --- | --- |
| Sistema | Windows 10 u 11, macOS o Linux |
| Python | 3.10 o más nuevo. En Windows, el instalador de [python.org](https://www.python.org/downloads/), marcando **"Add python.exe to PATH"** antes de Install |
| Navegador | Chrome o Edge (recomendado); también Firefox y Safari |
| Internet | Siempre: CesiumJS, la imagen CTX y el color Viking se cargan en vivo. Las teselas locales solo reemplazan el relieve y las fotos HiRISE |
| Espacio | Unos 200 MB para el proyecto y unos 6 GB para las teselas (opcionales) |

Para ver si tenés Python, abrí una terminal (en Windows: tecla Windows, escribí `PowerShell`, Enter) y escribí `python --version` (`python3 --version` en Mac o Linux).

### 2. Bajar el código

**Opción A, ZIP (sin Git):**
1. Bajá <https://github.com/Davidsitx/Guidears-Nasaspaceapps/archive/refs/heads/main.zip>.
2. Clic derecho en el ZIP → **Extraer todo…** y elegí una carpeta corta, fuera de OneDrive, por ejemplo `C:\Marte`. No abras nada desde adentro del ZIP.

**Opción B, Git:**
```
git clone https://github.com/Davidsitx/Guidears-Nasaspaceapps.git
```

La app está en la carpeta **`maps-in-mars`**: adentro tiene `abrir.bat`, `servir.py` e `index.html`.

### 3. Teselas del terreno (opcional, recomendado)

Sin teselas, el globo usa el terreno de Cesium Mars, que solo tiene detalle en una parte chica de Gale. Con ellas tenés nuestro relieve de todo Marte, Gale a 5 m y las fotos HiRISE de 25 cm.

Son unos 23 archivos `.zip` en el dataset público [ChuchuTEA/gale-earth-teselas](https://huggingface.co/datasets/ChuchuTEA/gale-earth-teselas). Van en `maps-in-mars/teselas/` **como `.zip`, sin descomprimir**. Desde adentro de la carpeta `maps-in-mars`, estos dos comandos las bajan ahí (o bajalas a mano desde la pestaña **Files and versions** del dataset):

```
python -m pip install huggingface_hub
python -c "from huggingface_hub import snapshot_download; snapshot_download('ChuchuTEA/gale-earth-teselas', repo_type='dataset', allow_patterns='*.zip', local_dir='teselas')"
```

- Si ya las tenés en otro lado, copialas a `maps-in-mars/teselas/` o arrancá el servidor con esa carpeta: `python servir.py "D:\ruta\a\teselas"`.
- El servidor también las encuentra solo en el Google Drive del equipo: `G:\Mi unidad\Marte\teselas` o `G:\My Drive\Marte\teselas`.
- Git ignora `maps-in-mars/teselas/`.

### 4. Arrancar

- **Windows:** doble clic en `maps-in-mars\abrir.bat`.
- **Mac / Linux:** `cd maps-in-mars` y después `python3 servir.py`.

La primera vez, Windows puede preguntar dos cosas:
- **"Windows protegió su PC"** (solo si bajaste el ZIP): **Más información → Ejecutar de todas formas**.
- **Firewall**: permití Python en **Redes privadas**. Es lo que deja entrar a los celulares.

Se abre una ventana de terminal: es el servidor. **Dejala abierta mientras uses la app.** Tiene que listar los `.zip` de teselas y la línea `Abrí http://localhost:8765/index.html`. El navegador se abre solo en esa dirección. Si el puerto 8765 está ocupado, usa el siguiente y lo muestra.

### 5. Comprobar que anda

- [ ] La pantalla de carga y después el globo de Marte, sin el aviso de que no encontró las teselas.
- [ ] **EN / ES** (abajo a la izquierda) cambia el idioma.
- [ ] Arriba, **Nueva misión** vuela a la zona de hoy con nuestras rutas, la Base Gale, el PMR y la misión en pareja.
- [ ] **49 perforaciones** muestra los pozos de Curiosity, y **Nuevo recorrido** deja poner tus propios pines y calcula la ruta más segura.
- [ ] **Misión Curiosity** (arriba a la derecha) muestra el recorrido de 2012 a hoy.

### 6. Celulares y otras compus en el mismo Wi-Fi

- Abrí la dirección de la línea "Desde el celular" de la ventana del servidor, por ejemplo `http://192.168.0.15:8765/index.html`.
- Si no conecta, el Wi-Fi del lugar seguramente aísla los equipos. Prendé la zona Wi-Fi de un celular, conectá ahí la compu y los demás equipos, y volvé a arrancar el servidor.
- En el celular, **Agregar a inicio** lo deja como una app.
- Para que funcione solo en esta compu: `python servir.py --solo-pc`.

### 7. Compartirlo fuera de tu red (opcional)

Un [túnel rápido de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) da un enlace público `https://`, gratis y sin cuenta. Las teselas siguen saliendo de tu compu.

```
winget install --id Cloudflare.cloudflared        # Windows, una vez; después abrí otra terminal
python servir.py --solo-pc                        # terminal 1, en maps-in-mars
cloudflared tunnel --url http://127.0.0.1:8765    # terminal 2 (mismo puerto que la terminal 1)
```

La terminal 2 muestra una dirección `https://….trycloudflare.com`: agregale `/index.html` y compartila. El enlace cambia cada vez, la compu tiene que quedar prendida y la velocidad depende de tu subida de internet.

### 8. Actualizar y apagar

- **Apagar:** cerrá la ventana del servidor o apretá Ctrl+C adentro.
- **Actualizar con Git:** `git pull`.
- **Actualizar con el ZIP:** sacá `maps-in-mars/teselas` de la carpeta, reemplazá la carpeta por la del ZIP nuevo y volvé a poner `teselas`.
- Después de actualizar, recargá la página con **Ctrl+Shift+R**.

<details>
<summary><b>Problemas y soluciones</b></summary>

| Pasa esto | Solución |
| --- | --- |
| `python` no se reconoce, o se abre la Microsoft Store | Reinstalá Python marcando "Add python.exe to PATH", o apagá Configuración → Aplicaciones → Configuración avanzada de aplicaciones → Alias de ejecución de aplicaciones → `python.exe` / `python3.exe`. También sirve `py` en lugar de `python` |
| La ventana del servidor se cierra enseguida | Abrí una terminal en `maps-in-mars` y corré `python servir.py` para ver el error |
| Dice "no encontré teselas" | Los `.zip` no están en `maps-in-mars/teselas/` (paso 3). Después de moverlos, recargá la página |
| El globo queda negro o sin imagen | Falta internet: CesiumJS y las imágenes se cargan en vivo |
| No carga la misión | Se abrió `index.html` con doble clic. Usá `http://localhost:8765/index.html` con el servidor abierto |
| Se ve la versión vieja | Cerrá las ventanas de servidores viejos y recargá con Ctrl+Shift+R |
| Va lento | Chrome o Edge con la aceleración por hardware prendida (Configuración → Sistema), la notebook enchufada y otras pestañas cerradas |
| El túnel da "502 Bad Gateway" | La terminal 1 está cerrada o usa otro puerto |

</details>

<details>
<summary><b>Otras apps del repo y desarrollo</b></summary>

- **GALE-3D, la escena 3D clásica** (`escena3d/index.html`): una sola página, se abre con doble clic y funciona sin internet. Con el servidor abierto también está en `http://localhost:8765/escena3d/index.html`.
- **Prototipo del planificador 2D** (`prototipo/planificador/index.html`): se abre en el navegador.
- No editar `maps-in-mars/index.html` ni `plantilla.html` a mano: se cambian las fuentes (`cabecera.html`, `_cuerpo.html`, `*.js`) y, adentro de `maps-in-mars`, se corre `python _ensamblar.py` y después `python armar.py`.
- Escena clásica: `escena3d/plantilla.html` y después `python escena3d/armar.py`. Datos y modelos de la misión: `python herramientas/exportar_mision.py` desde la raíz (necesita `python -m pip install numpy pillow`).
- Arquitectura, guía de estilo y pantallas: `docs/desarrollo/`.

</details>

---

## Contents
- `maps-in-mars/` — **Maps in Mars**, the main app: a Google Earth–style globe of Mars with the Curiosity mission, Gale Base, the PMR expedition planner, the drill-hole Wiki and the timeline.
- `escena3d/` — GALE-3D, the classic 3D scene of today's area (self-contained page).
- `prototipo/planificador/` — first 2D route planner.
- `data/` — Curiosity traverse, stops, current position, base sites and routes (GeoJSON) and shared parameters.
- `herramientas/` — scripts that build terrain grids, routes and the mission export.
- `docs/` — science rationale, rover health, sources, notes and the development guide (Spanish, internal).
- `CLAUDE.md` — shared context for the team's AI assistants.

## Data sources (main)
- Curiosity localization (PLACES), PDS Geosciences Node.
- Orbital DEM from MSL PLACES bundle; USGS Gale merged DEM (Calef & Parker, 2016).
- Curiosity mission blog, NASA (science.nasa.gov).
- RAD radiation measurements (Hassler et al., 2014); terrain shielding (DLR, JGR Planets 2026).
- NASA "Where is Curiosity?" map for the current position.
- Full traverse color: USGS/ASC HiRISE color mosaic of Gale (`MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif`).
- Full traverse and drill-hole positions: NASA MSL live map feeds (`MSL_traverse.json`, `MSL_waypoints.json`).
- Topografía (relieve, altura, modelos de elevación) MOLA, HRSC, CTX, HiRISE
- Imagen (fotografía visible) HiRISE, CTX, HRSC, CaSSIS, MOC
- Composición/termal (minerales, temperatura, propiedades de la superficie) THEMIS, CRISM, OMEGA, TES
- Agua y hielo / subsuelo SHARAD, MARSIS, GRS, FREND
- Atmósfera y clima MCS, MAVEN, EMIRS/EXI
- Full source register: `docs/fuentes.md`.

## License

Our code and documents are released under the **Apache License 2.0** (see [`LICENSE`](LICENSE)).

Third-party components keep their own licenses:
- three.js r170 (MIT), bundled in `escena3d/vendor/` with `LICENSE-three-MIT.txt`.
- CesiumJS 1.147 (Apache 2.0), loaded from jsDelivr by `maps-in-mars/`.
- Star catalog and Milky Way outline via d3-celestial (BSD), see `maps-in-mars/README.md`.

NASA, USGS and ESA data are used under their public data policies and are credited in `docs/fuentes.md`. The "ER-6 Terrain Explorer" simulator was visual inspiration only; no code was copied.

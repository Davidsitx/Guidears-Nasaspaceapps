"""Exporta la misión de la escena (GALE-3D) para Maps in Mars: una sola pantalla, los mismos números.

Abre escena3d/index.html en un navegador sin ventana (Playwright + Chromium), y con las mismas funciones de la escena saca
(y al final suma la ruta T del PMR, el rover presurizado, con herramientas/ruta_base.py):
  - gale-earth/datos/mision.json: paradas (con su ficha y su muestra simulada), rutas A, B y C, expedición sur, Base Gale,
    Curiosity hoy, fichas del GX-2, estaciones, parámetros y fuentes;
  - gale-earth/capas/mision/*.glb: Curiosity, GX-2, PMR, astronauta y Base Gale (modelos 3D, con las piezas móviles nombradas).

Uso (desde la raíz del repo):
    python escena3d/armar.py              # primero, si cambió algo de la escena
    python herramientas/exportar_mision.py

Necesita: pip install playwright  y  python -m playwright install chromium
El exportador de glTF es el de three.js r170 (MIT), copiado en escena3d/vendor/GLTFExporter.js.
"""
import base64, json, os, re, sys, time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESCENA = os.path.join(RAIZ, "escena3d", "index.html")
SALIDA_DATOS = os.path.join(RAIZ, "gale-earth", "datos", "mision.json")
SALIDA_MODELOS = os.path.join(RAIZ, "gale-earth", "capas", "mision")


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("Falta Playwright: pip install playwright  y  python -m playwright install chromium")
    if not os.path.exists(ESCENA):
        sys.exit("Falta escena3d/index.html: correr antes python escena3d/armar.py")
    src = open(os.path.join(RAIZ, "escena3d", "vendor", "GLTFExporter.js"), encoding="utf-8").read()
    m = re.search(r"import\s*\{([^}]*)\}\s*from\s*'three';", src)
    nombres = [n.strip() for n in m.group(1).split(",") if n.strip()]
    shim = "const T = window.__THREE;\n" + "\n".join(f"export const {n} = T.{n};" for n in nombres)
    cuerpo = src[m.end():]
    t0 = time.time()
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.route("**/astro.arcgis.com/**", lambda r: r.abort())
        pg.goto("file://" + ESCENA.replace(os.sep, "/"), wait_until="commit")
        print("Cargando la escena (puede tardar unos minutos sin placa de video)…", flush=True)
        pg.wait_for_function("!document.getElementById('cargando') && window.__exportarMision", timeout=1800000, polling=1000)
        if errores:
            print("Avisos de la escena al cargar:", errores[:3])
        datos = pg.evaluate("window.__exportarMision()")
        os.makedirs(os.path.dirname(SALIDA_DATOS), exist_ok=True)
        with open(SALIDA_DATOS, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{os.path.relpath(SALIDA_DATOS, RAIZ)}: {os.path.getsize(SALIDA_DATOS) / 1024:.0f} KB · "
              f"{len(datos['paradas'])} paradas, {len(datos['rutas'])} rutas, "
              f"{len((datos.get('expedicion') or {}).get('paradas', []))} puntos de expedición, base: {'sí' if datos.get('base') else 'no'}", flush=True)
        modelos = pg.evaluate("""async ([shim, cuerpo]) => {
            const urlShim = URL.createObjectURL(new Blob([shim], { type: 'text/javascript' }));
            const url = URL.createObjectURL(new Blob([`import {${'%s'}} from '${urlShim}';` + cuerpo], { type: 'text/javascript' }));
            const { GLTFExporter } = await import(url);
            return await window.__exportarModelos(GLTFExporter);
        }""".replace("%s", ", ".join(nombres)), [shim, cuerpo])
        os.makedirs(SALIDA_MODELOS, exist_ok=True)
        for k, v in modelos.items():
            ruta = os.path.join(SALIDA_MODELOS, f"{k}.glb")
            with open(ruta, "wb") as f:
                f.write(base64.b64decode(v))
            print(f"{os.path.relpath(ruta, RAIZ)}: {os.path.getsize(ruta) / 1024:.0f} KB", flush=True)
        b.close()
    # ruta T: el PMR de la Base Gale a la zona de hoy (A* sobre el terreno de contexto), dentro del mismo mision.json
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ruta_base
    ruta_base.main()
    print(f"Listo en {time.time() - t0:.0f} s. Si cambió Maps in Mars: dentro de gale-earth/, python _ensamblar.py y python armar.py.")


if __name__ == "__main__":
    main()

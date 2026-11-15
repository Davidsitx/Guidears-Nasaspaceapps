"""Arma gale-earth/index.html (Gale Earth): un solo archivo con los datos adentro.

Uso (desde la carpeta gale-earth):
    python armar.py

Lee los datos de Curiosity de datos/entrada/ (perforaciones, zonas y recorrido oficial) y datos/orbitadores.json.
El terreno 3D (Cesium Mars) y la librería CesiumJS se cargan de internet al abrir la página.
"""
import json
import os
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = os.path.join(AQUI, "datos", "entrada")   # copia propia: el esquema de perforaciones.geojson difiere del de data/curiosity/
REPO = os.path.dirname(AQUI)                        # raíz del repo (gale-earth/ está al lado de prototipo/ y data/)

SITIOS = [
    dict(id="bradbury", nombre="Bradbury · llanura de aterrizaje", lat=-4.5895, lon=137.4417, radio_km=3,
         resumen="La llanura donde aterrizó Curiosity: plana y probada para descender.",
         pros=["Aterrizaje probado: Curiosity bajó acá en 2012.", "Es el sitio más bajo de los tres: más atmósfera encima, algo menos de radiación.",
               "Yellowknife Bay, a menos de 1 km: arcillas y los orgánicos más grandes hallados en Marte (Cumberland)."],
         contras=["Poca agua ligada en minerales medida cerca.", "Los sulfatos hidratados (mejor recurso de agua) quedan a ~10 km en línea recta."],
         fuente="Posiciones y mineralogía: NASA (PLACES, CheMin). Evaluación: propuesta del equipo."),
    dict(id="mercou", nombre="Mont Mercou · unidad de sulfatos", lat=-4.7545, lon=137.3970, radio_km=3,
         resumen="Al pie de la transición de arcilla a sulfato: la mayor cantidad de agua ligada en minerales que midió Curiosity.",
         pros=["Agua: Zechstein, Ubajara y Canaima tienen yeso y sulfatos de Mg hidratados (51 a 76 kg/t).",
               "Carbonato de hierro (siderita): fuente de CO₂ y carbono.", "Arcillas de Glen Torridon a ~2 km: materiales y orgánicos."],
         contras=["Laderas más empinadas: hay que elegir una terraza plana.", "~600 m más alto que la llanura de aterrizaje."],
         fuente="Mineralogía: NASA, base CheMin/APXS de Gale. Siderita: Tutolo et al. 2025, Science. Evaluación: propuesta del equipo."),
    dict(id="vallegrande", nombre="Valle Grande · Curiosity hoy", lat=-4.8257, lon=137.3892, radio_km=3,
         resumen="Donde está Curiosity hoy, frente a los yardangs: el terreno mejor medido y nuestras rutas de caminata.",
         pros=["Terreno 3D detallado y rutas de rover y astronauta ya calculadas por el equipo.",
               "Yardangs cerca: en el taller de NASA de 2015 se propuso tallar refugios en este tipo de colinas.",
               "Boxwork al lado: agua subterránea antigua, ciencia de primer nivel."],
         contras=["El más alto de los tres: menos atmósfera encima.", "La mineralogía de los pozos 47 a 49 todavía no está publicada."],
         fuente="Posición: NASA/JPL 'Where is Curiosity?'. Evaluación: propuesta del equipo."),
]


def leer(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def revisar(d):
    """Controles antes de armar: si algo de esto falla, la página se rompería en silencio. Mejor avisar acá."""
    problemas = []
    pozos = d["pozos"].get("features", [])
    if len(pozos) < 49:
        problemas.append(f"perforaciones.geojson tiene {len(pozos)} pozos (se esperaban 49)")
    zonas = {z["id"] for z in d["zonas"].get("zonas", d["zonas"]) if isinstance(z, dict) and "id" in z} if isinstance(d["zonas"], (dict, list)) else set()
    for f in pozos:
        p, g = f.get("properties", {}), f.get("geometry", {}).get("coordinates", [None, None])
        nombre = p.get("nombre", "?")
        if not (isinstance(g[0], (int, float)) and isinstance(g[1], (int, float)) and -180 <= g[0] <= 180 and -90 <= g[1] <= 90):
            problemas.append(f"pozo {nombre}: coordenadas inválidas {g}")
        if zonas and p.get("zona") not in zonas:
            problemas.append(f"pozo {nombre}: zona '{p.get('zona')}' no existe en zonas_gale.json")
        if not isinstance(p.get("minerales", []), list):
            problemas.append(f"pozo {nombre}: 'minerales' tiene que ser una lista")
    if not d["recorrido"].get("features"):
        problemas.append("el recorrido está vacío")
    if not d["orbitadores"].get("orbitadores"):
        problemas.append("orbitadores.json no tiene orbitadores")
    if problemas:
        print("ATENCIÓN, revisar antes de presentar:")
        for x in problemas:
            print("  -", x)
    else:
        print("Datos revisados: 49 pozos, zonas, recorrido y orbitadores OK")
    if not os.path.exists(os.path.join(AQUI, "datos", "biblioteca.json")):
        print("Falta datos/biblioteca.json: la pestaña Biblioteca no va a cargar. Generalo con: python armar_biblioteca.py")
    lt = os.path.join(AQUI, "datos", "linea_tiempo.json")
    if not os.path.exists(lt):
        print("Falta datos/linea_tiempo.json: la línea de tiempo no va a cargar.")
    else:
        ev = json.loads(leer(lt))["eventos"]
        sin = [e["id"] for e in ev if not e.get("fuente")]
        if sin: print("Eventos de la línea de tiempo sin fuente:", ", ".join(sin))


def main():
    dc = ENTRADA
    mapa2d = os.path.join(REPO, "prototipo", "mapa-perforaciones", "index.html")
    datos = {
        "pozos": json.loads(leer(os.path.join(dc, "perforaciones.geojson"))),
        "zonas": json.loads(leer(os.path.join(dc, "zonas_gale.json"))),
        "recorrido": json.loads(leer(os.path.join(dc, "recorrido_oficial_sol0-5073.geojson"))),
        "orbitadores": json.loads(leer(os.path.join(AQUI, "datos", "orbitadores.json"))),
        "borde_gale": json.loads(leer(os.path.join(AQUI, "datos", "borde_gale.json"))),
        # Contornos de lugares clave de Marte (herramientas/lugares_clave.py). Opcional.
        "lugares_clave": json.loads(leer(os.path.join(AQUI, "datos", "lugares_clave.json")))
                         if os.path.exists(os.path.join(AQUI, "datos", "lugares_clave.json")) else None,
        "sitios": SITIOS,
        # Capas de análisis (herramientas/gale_datos.py procesar → reducidas a 4096 px). Opcionales.
        "capas5m": json.loads(leer(os.path.join(AQUI, "capas", "gale_5m", "capas.json")))
                   if os.path.exists(os.path.join(AQUI, "capas", "gale_5m", "capas.json")) else None,
        "mapa2d": "../prototipo/mapa-perforaciones/index.html" if os.path.exists(mapa2d) else None,
        "armado": time.strftime("%Y-%m-%d %H:%M"),
    }
    revisar(datos)
    js = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = leer(os.path.join(AQUI, "plantilla.html")).replace("/*__DATOS__*/null", js)
    with open(os.path.join(AQUI, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"index.html: {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()

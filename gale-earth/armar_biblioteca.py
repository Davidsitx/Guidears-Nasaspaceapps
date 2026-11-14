"""Arma la Biblioteca de Gale Earth a partir de la carpeta de Drive de las perforaciones.

Uso:  python armar_biblioteca.py ["G:\\Mi unidad\\Marte\\Perforaciones Datos Crudos"]

Lee, de cada una de las 49 carpetas, lo mismo que ya está subido al Drive (no baja nada de internet):
  Datos trabajados/resumen.json · mineralogia_chemin.csv
  Datos Crudos/APXS/apxs_oxidos_y_trazas.csv (+ _ODR.csv) · Datos Crudos/SAM/SAM_nivel2_crudos.zip
  Imagenes/destacadas/*.jpg · Imagenes/indice_imagenes.csv
y de "zz Analisis y temas para futuras misiones": el documento y la tabla de indicadores.

Escribe:
  datos/biblioteca.json            (lo lee la pestaña Biblioteca al abrirse)
  capas/pozos/<pozo>/*.jpg         (miniaturas de 640 px de las fotos destacadas)
Si un dato no está, queda vacío y la ficha lo dice: nunca se inventa.
"""
import csv, io, json, os, re, sys, zipfile, html
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = sys.argv[1] if len(sys.argv) > 1 else r"G:\Mi unidad\Marte\Perforaciones Datos Crudos"
ANALISIS = os.path.join(ORIGEN, "zz Analisis y temas para futuras misiones")
SALIDA_JSON = os.path.join(AQUI, "datos", "biblioteca.json")
MINI = os.path.join(AQUI, "capas", "pozos")
OXIDOS = ["SiO2", "TiO2", "Al2O3", "FeO", "MnO", "MgO", "CaO", "Na2O", "K2O", "P2O5", "Cr2O3", "SO3", "Cl"]
TRAZAS = ["Ni", "Zn", "Br"]
GASES = ["H2O", "CO2", "SO2", "O2", "HCl", "H2S", "NO", "H2", "CH3Cl", "CH2Cl2", "OCS"]
NOMBRE_MIN = {  # nombres de CheMin (inglés) en castellano
    "plagioclase": "plagioclasa", "andesine": "andesina", "albite": "albita", "sanidine": "sanidina", "k-feldspar": "feldespato K",
    "feldspar": "feldespato", "forsterite": "olivino (forsterita)", "olivine": "olivino", "augite": "augita", "pigeonite": "pigeonita",
    "orthopyroxene": "ortopiroxeno", "enstatite": "enstatita", "pyroxene": "piroxeno", "magnetite": "magnetita", "hematite": "hematita",
    "anhydrite": "anhidrita", "bassanite": "basanita", "gypsum": "yeso", "quartz": "cuarzo", "cristobalite": "cristobalita",
    "tridymite": "tridimita", "akaganeite": "akaganeíta", "jarosite": "jarosita", "halite": "halita", "pyrite": "pirita",
    "pyrrhotite": "pirrotina", "ilmenite": "ilmenita", "apatite": "apatita", "fluorapatite": "fluorapatita", "siderite": "siderita",
    "goethite": "goethita", "opal-ct": "ópalo-CT", "starkeyite": "starkeyíta", "kieserite": "kieserita", "epsomite": "epsomita",
    "calcite": "calcita", "dolomite": "dolomita", "ankerite": "ankerita", "fe-carbonate": "carbonato de hierro", "rutile": "rutilo",
}


def num(x):
    try:
        v = float(str(x).replace(",", "."))
        return None if v != v else v
    except (TypeError, ValueError):
        return None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def leer_csv(ruta):
    if not os.path.exists(ruta):
        return []
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        norm = lambda k: "Sol" if (k or "").lstrip("\ufeff").strip().lower() == "sol" else (k or "").lstrip("\ufeff").strip()
        return [{norm(k): v for k, v in r.items()} for r in csv.DictReader(f)]


def apxs_de(carpeta, R):
    """La química del pozo: primero la que ODR asigna a la muestra; si no, la medición del PDS sobre el pozo o su polvo."""
    odr = leer_csv(os.path.join(carpeta, "Datos Crudos", "APXS", "apxs_oxidos_y_trazas_ODR.csv"))
    if odr:
        ox = {r["oxido"]: [num(r["pct_peso"]), num(r["incertidumbre"])] for r in odr}
        return {"fuente": "ODR (muestra entregada al laboratorio del rover)", "producto": odr[0]["producto_pds"], "sol": None, "objetivo": "",
                "ox": {k: ox[k] for k in OXIDOS if k in ox}, "tr": {k: [ox[k][0] * 1e4, ox[k][1] * 1e4] for k in TRAZAS if k in ox}}, 0, 0
    filas = leer_csv(os.path.join(carpeta, "Datos Crudos", "APXS", "apxs_oxidos_y_trazas.csv"))
    pozo = [r for r in filas if r.get("es_del_pozo") == "si"]
    if not pozo:
        return None, len(filas), 0
    # preferencia: la que ODR asignó (cruce), luego polvo de perforación (DT / postsieve), luego la primera
    prod = (R.get("odr") or {}).get("apxs_producto") or ""
    m_ = re.match(r"ap[ab]_\d{9}rwp(\d{4})", prod)
    sol_odr = int(m_.group(1)) if m_ else None
    def prio(r):
        prep = (r.get("Preparation_method") or "").upper()
        return (0 if sol_odr and str(sol_odr) == r["Sol"] else 1, 0 if prep in ("DT", "POSTSIEVE", "MD") else 1, int(num(r["Sol"]) or 0))
    r = sorted(pozo, key=prio)[0]
    return {"fuente": "NASA PDS, tabla APXS supplement (ds01)", "producto": prod, "sol": int(num(r["Sol"]) or 0) or None, "objetivo": r["Target"],
            "preparacion": r.get("Preparation_method", ""),
            "ox": {k: [num(r.get(k + "_pct")), num(r.get(k + "_err"))] for k in OXIDOS if num(r.get(k + "_pct")) is not None},
            "tr": {k: [num(r.get(k + "_ppm")), num(r.get(k + "_err"))] for k in TRAZAS if num(r.get(k + "_ppm")) is not None}}, len(filas), len(pozo)


def sam_de(carpeta, R):
    zp = os.path.join(carpeta, "Datos Crudos", "SAM", "SAM_nivel2_crudos.zip")
    meta = {str(s["eid"]): s for s in R.get("sam_experimentos", [])}
    out = {}
    if os.path.exists(zp):
        with zipfile.ZipFile(zp) as z:
            for nombre in z.namelist():
                m = re.search(r"SAM/([^/]+)/sol(\d+)_eid(\d+)_(\w+)/(.+)$", nombre)
                if not m:
                    continue
                grupo, sol, eid, tipo, archivo = m.groups()
                e = out.setdefault(eid, {"eid": eid, "sol": int(sol), "tipo": tipo, "grupo": grupo, "gases": {}, "picos": {}, "tls": {}})
                if "egacomp" in archivo or "egaxxxx" in archivo or "tls_abundnc" in archivo:
                    filas = list(csv.reader(io.StringIO(z.read(nombre).decode("utf-8", "replace"))))[1:]
                    for f in filas:
                        if len(f) < 2:
                            continue
                        esp, val = f[0].strip(), num(f[1])
                        if val is None:
                            continue
                        if "egacomp" in archivo and esp in GASES:
                            e["gases"][esp] = val
                        elif "egaxxxx" in archivo and esp in GASES:
                            e["picos"].setdefault(esp, []).append(val)
                        elif "tls_abundnc" in archivo:
                            e["tls"][esp.replace(" vmr", "")] = val
    lista = []
    for eid, e in sorted(out.items(), key=lambda kv: (kv[1]["sol"], kv[0])):
        g = e["grupo"]
        e["estado"] = "confirmado" if g.startswith("confirmado") else ("otra_muestra" if g.startswith("de_otra") else "sin_confirmar")
        if e["estado"] == "otra_muestra":
            e["otra"] = (meta.get(eid) or {}).get("odr_lo_asigna_a") or g.split("__")[-1].replace("_", " ")
        # valores imposibles (p. ej. H2O = 7,16E+07 mol en una tabla): se marcan y no se usan
        e["dudoso"] = [k for k, v in e["gases"].items() if v > 1e-2]
        del e["grupo"]
        lista.append(e)
    return lista


def miniaturas(carpeta, s):
    d = os.path.join(carpeta, "Imagenes", "destacadas")
    if not os.path.isdir(d):
        return []
    idx = {os.path.basename(r["archivo"]): r for r in leer_csv(os.path.join(carpeta, "Imagenes", "indice_imagenes.csv"))}
    os.makedirs(os.path.join(MINI, s), exist_ok=True)
    fotos = []
    for f in sorted(os.listdir(d)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        dst = os.path.join(MINI, s, os.path.splitext(f)[0] + ".jpg")
        if not os.path.exists(dst):
            im = Image.open(os.path.join(d, f)).convert("RGB")
            im.thumbnail((640, 640))
            im.save(dst, quality=82, optimize=True, progressive=True)
        info = idx.get(f, {})
        cam = info.get("instrumento", "") or ("MAHLI" if "MH" in f[8:20] else "Mastcam" if re.search(r"M[LR]\d", f) else "Hazcam" if "HAZ" in f else "")
        fotos.append({"src": f"capas/pozos/{s}/{os.path.basename(dst)}", "archivo": f, "camara": cam,
                      "fecha": info.get("fecha_utc", ""), "url": info.get("url_nasa", "")})
    return fotos


def md_a_html(md):
    """Markdown simple (títulos, listas, tablas, negrita, código) a HTML, para el documento de análisis."""
    out, en_lista, tabla = [], False, []
    def linea(t):
        t = html.escape(t)
        t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
        t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
        return re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    def cerrar():
        nonlocal en_lista, tabla
        if en_lista:
            out.append("</ul>"); en_lista = False
        if tabla:
            filas = [r for r in tabla if not re.match(r"^\|[\s:|-]+\|$", r)]
            celdas = [[c.strip() for c in r.strip("|").split("|")] for r in filas]
            out.append("<table><tr>" + "".join(f"<th>{linea(c)}</th>" for c in celdas[0]) + "</tr>" +
                       "".join("<tr>" + "".join(f"<td>{linea(c)}</td>" for c in r) + "</tr>" for r in celdas[1:]) + "</table>")
            tabla = []
    for r in md.splitlines():
        if r.startswith("|"):
            if en_lista:
                out.append("</ul>"); en_lista = False
            tabla.append(r.strip()); continue
        if tabla:
            cerrar()
        m = re.match(r"^(#{1,4})\s+(.*)", r)
        if m:
            cerrar(); n = len(m.group(1)); out.append(f"<h{n + 1}>{linea(m.group(2))}</h{n + 1}>"); continue
        m = re.match(r"^\s*[-*]\s+(.*)", r) or re.match(r"^\s*\d+\.\s+(.*)", r)
        if m:
            if not en_lista:
                out.append("<ul>"); en_lista = True
            out.append(f"<li>{linea(m.group(1))}</li>"); continue
        if r.startswith(">"):
            cerrar(); out.append(f'<p class="nota">{linea(r.lstrip("> "))}</p>'); continue
        if r.strip() in ("", "---"):
            cerrar(); continue
        cerrar(); out.append(f"<p>{linea(r)}</p>")
    cerrar()
    return "\n".join(out)


def main():
    if not os.path.isdir(ORIGEN):
        sys.exit(f"No encuentro la carpeta de perforaciones: {ORIGEN}")
    pozos = []
    for d in sorted(os.listdir(ORIGEN)):
        carpeta = os.path.join(ORIGEN, d)
        rj = os.path.join(carpeta, "Datos trabajados", "resumen.json")
        if not os.path.exists(rj):
            continue
        R = json.load(open(rj, encoding="utf-8"))
        s = slug(d)
        mins = {}
        for r in leer_csv(os.path.join(carpeta, "Datos trabajados", "mineralogia_chemin.csv")):
            a = mins.setdefault(r["archivo_pds"], {"sol": int(num(r["sol_analisis"]) or 0), "archivo": r["archivo_pds"], "minerales": []})
            a["minerales"].append([NOMBRE_MIN.get(r["mineral"].lower(), r["mineral"].lower()), num(r["porcentaje_peso_cristalino"]), num(r["error_2sigma"])])
        for c in R.get("chemin_pds", []):
            a = mins.setdefault(c["archivo"], {"sol": c.get("sol"), "archivo": c["archivo"], "minerales": []})
            for k in ("arcillas_pct", "arcillas_err", "amorfo_pct", "amorfo_err"):
                a[k.replace("_pct", "")] = num(c.get(k))
        for a in mins.values():
            a["minerales"].sort(key=lambda m: -(m[1] or 0))
        apxs, n_apxs, n_apxs_pozo = apxs_de(carpeta, R)
        ficha = open(os.path.join(carpeta, "Datos trabajados", "ficha.md"), encoding="utf-8").read() if os.path.exists(os.path.join(carpeta, "Datos trabajados", "ficha.md")) else ""
        falta = re.findall(r"^- (.+)$", ficha.split("## Lo que falta")[1].split("##")[0], re.M) if "## Lo que falta" in ficha else []
        cruce = re.findall(r"^- (.+)$", ficha.split("## Cruce con la base ODR")[1], re.M) if "## Cruce con la base ODR" in ficha else []
        archivos = []
        for raiz, _, fs in os.walk(carpeta):
            for f in fs:
                if f.lower() == "desktop.ini":
                    continue
                p = os.path.join(raiz, f)
                archivos.append([os.path.relpath(p, carpeta).replace("\\", "/"), os.path.getsize(p)])
        pozos.append({
            "n": int(num(R.get("n")) or 0) or None, "nombre": d, "slug": s, "sol": R.get("sol"), "fecha": R.get("fecha_aprox", ""),
            "zona": R.get("zona", ""), "formacion": R.get("formacion", ""), "roca": R.get("roca", ""), "elev": num(R.get("elevacion_m")),
            "lat": num(R.get("lat")), "lon": num(R.get("lon")), "hallazgo": R.get("hallazgo", ""), "tecnico": R.get("tecnico", ""),
            "fuente_hallazgo": R.get("fuente_hallazgo", ""), "agua_kg_t": num(R.get("agua_kg_t")), "co2_kg_t": num(R.get("co2_kg_t")),
            "chemin": sorted(mins.values(), key=lambda a: a["sol"] or 0), "apxs": apxs, "apxs_mediciones": n_apxs, "apxs_del_pozo": n_apxs_pozo,
            "sam": sam_de(carpeta, R), "fotos": miniaturas(carpeta, s), "fotos_total": R.get("imagenes", 0),
            "odr": R.get("odr", {}), "falta": falta, "cruce": cruce, "archivos": sorted(archivos),
        })
    pozos.sort(key=lambda p: (p["n"] or 999, p["sol"] or 0))
    doc = ""
    md = os.path.join(ANALISIS, "Temas_para_futuras_misiones.md")
    if os.path.exists(md):
        doc = md_a_html(open(md, encoding="utf-8").read())
    os.makedirs(os.path.dirname(SALIDA_JSON), exist_ok=True)
    with open(SALIDA_JSON, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "origen": "Drive: Marte/Perforaciones Datos Crudos", "pozos": pozos, "temas_html": doc},
                  f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(pozos)} pozos · {os.path.getsize(SALIDA_JSON) // 1024} KB · miniaturas en capas/pozos/")
    sin = [p["nombre"] for p in pozos if not p["chemin"]]
    if sin:
        print("Sin CheMin todavía:", ", ".join(sin))


if __name__ == "__main__":
    main()

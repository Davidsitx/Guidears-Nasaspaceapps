"""Arma escena3d/index.html: una sola página con three.js, el terreno, las rutas y los parámetros adentro.

Uso:
    python escena3d/armar.py            # zona sol5070
    python escena3d/armar.py --zona boxwork

Lee:
    data/terreno/<zona>/meta.json, dem_2m.bin, orto.jpg     (docs/contrato.md §1)
    data/rutas/*.geojson                                    (docs/contrato.md §2; todas las que haya)
    data/curiosity/posicion_sol5070.geojson
    data/parametros.json                                    (docs/contrato.md §3)
    data/mineralogia/crism_<zona>/meta.json y *.png         (opcional: mineralogía CRISM por parada y en el visor)
    data/capas/<zona>/peligro_clases.png y meta.json        (opcional: zonas de peligro; herramientas/capas_peligro.py)
    escena3d/vendor/three.module.min.js, OrbitControls.js   (three.js r170, MIT)
    escena3d/plantilla.html

Precalcula la fracción de cielo tapado por el relieve (mismo método de horizonte que herramientas/build_terrain.py).
Requiere numpy y pillow.
"""
import argparse
import base64
import glob
import hashlib
import json
import math
import os
import time

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SIN_DATOS = -9999.0


def sumar_biblioteca(lista):
    """Suma a cada perforación lo de la Biblioteca de Gale Earth (gale-earth/datos/biblioteca.json, del compañero):
    hallazgo con su fuente, minerales de CheMin, química de APXS, cantidad de experimentos SAM, agua en minerales
    (cálculo del equipo), novedades del blog, lo que falta publicar y una foto chica del sol de la perforación."""
    import io, unicodedata
    ruta = os.path.join(RAIZ, "gale-earth", "datos", "biblioteca.json")
    if not os.path.exists(ruta):
        return
    nrm = lambda t: unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower().replace(" ", "")
    bib = {nrm(x["nombre"]): x for x in leer_json(ruta)["pozos"]}
    try:
        from PIL import Image
    except ImportError:
        Image = None
    n = fotos = 0
    for p in lista:
        x = bib.get(nrm(p["nombre"]))
        if not x:
            continue
        ch = (x.get("chemin") or [None])[0]
        ap = x.get("apxs") or {}
        b = {"hallazgo": x.get("hallazgo"), "tecnico": x.get("tecnico"), "fuente": x.get("fuente_hallazgo"),
             "formacion": x.get("formacion"), "roca": x.get("roca"), "agua": x.get("agua_kg_t"), "co2": x.get("co2_kg_t"),
             "chemin": {"sol": ch.get("sol"), "min": [[m[0], m[1]] for m in sorted([m for m in (ch.get("minerales") or []) if m[1] is not None], key=lambda m: -m[1])[:6]],
                        "arcillas": ch.get("arcillas"), "amorfo": ch.get("amorfo")} if ch else None,
             "apxs": {"sol": ap.get("sol"), "producto": ap.get("producto"),
                      "ox": {k: v[0] for k, v in (ap.get("ox") or {}).items() if k in ("SiO2", "FeO", "MgO", "CaO", "Al2O3", "SO3", "Na2O", "Cl")}} if ap.get("ox") else None,
             "sam": len(x.get("sam") or []), "odr": (x.get("odr") or {}).get("url"), "fotos_total": x.get("fotos_total"),
             "blog": [{"fecha": e.get("fecha"), "texto": e.get("texto"), "url": e.get("url")} for e in (x.get("blog") or [])][:2],
             "falta": [t.split(":")[0] for t in (x.get("falta") or [])]}
        f0 = (x.get("fotos") or [None])[0]
        if f0:
            b["foto_url"], b["foto_cam"] = f0.get("url"), f0.get("camara")
            img = os.path.join(RAIZ, "gale-earth", f0.get("src", ""))
            if Image and os.path.exists(img):
                im = Image.open(img).convert("RGB"); im.thumbnail((440, 440)); buf = io.BytesIO(); im.save(buf, "JPEG", quality=70, optimize=True)
                b["foto"] = b64(buf.getvalue()); fotos += 1
        p["bib"] = b; n += 1
    print(f"perforaciones: {n} de {len(lista)} con la Biblioteca de Gale Earth ({fotos} fotos{'' if Image else '; sin Pillow no hay fotos'})")


def b64(datos: bytes) -> str:
    return base64.b64encode(datos).decode("ascii")


def leer_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def cielo_tapado(z, cs_este, cs_norte, n_dir=16, alcance_m=400.0):
    """Fracción del cielo tapada por el relieve en cada celda (0 = cielo abierto).

    Para cada dirección busca el ángulo de horizonte más alto hasta `alcance_m` y promedia sin(ángulo) sobre las
    direcciones, igual que herramientas/build_terrain.py. Fuera de la grilla se supone que no hay relieve
    (subestima en los bordes).
    """
    h, w = z.shape
    acum = np.zeros_like(z)
    pasos = int(alcance_m / min(cs_este, cs_norte))
    for k in range(n_dir):
        th = 2 * math.pi * k / n_dir
        dx, dy = math.cos(th), math.sin(th)
        hmax = np.zeros_like(z)
        vistos = set()
        for paso in range(1, pasos + 1):
            ox, oy = int(round(dx * paso)), int(round(dy * paso))
            if (ox, oy) in vistos or (ox == 0 and oy == 0):
                continue
            vistos.add((ox, oy))
            dist = math.hypot(ox * cs_este, oy * cs_norte)
            if dist > alcance_m:
                break
            ys = slice(max(0, -oy), h - max(0, oy))
            yd = slice(max(0, oy), h - max(0, -oy))
            xs = slice(max(0, -ox), w - max(0, ox))
            xd = slice(max(0, ox), w - max(0, -ox))
            ang = np.zeros_like(z)
            ang[ys, xs] = np.arctan2(z[yd, xd] - z[ys, xs], dist)
            np.maximum(hmax, ang, out=hmax)
        acum += np.sin(hmax)
    return acum / n_dir


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zona", default="sol5070")
    ap.add_argument("--salida", default=None, help="default: escena3d/index.html (sol5070) o escena3d/index_<zona>.html")
    ap.add_argument("--globo-aparte", action="store_true", help="deja el globo de fondo en globo.json al lado de la salida (para publicar en sitios con tope de tamaño por archivo)")
    a = ap.parse_args()
    a.salida = a.salida or os.path.join(AQUI, "index.html" if a.zona == "sol5070" else f"index_{a.zona}.html")

    dz = os.path.join(RAIZ, "data", "terreno", a.zona)
    meta = leer_json(os.path.join(dz, "meta.json"))
    W, H, cs = meta["ancho"], meta["alto"], meta["tam_celda_m"]
    z = np.fromfile(os.path.join(dz, "dem_2m.bin"), dtype="<f4").reshape(H, W).astype(np.float64)
    vacias = z == SIN_DATOS
    if vacias.any():
        z[vacias] = z[~vacias].min()
        print(f"aviso: {int(vacias.sum())} celdas sin datos rellenadas con el mínimo")
    lat_c = meta["lat_norte"] - meta["grados_por_m"] * cs * H / 2
    cos_lat = math.cos(math.radians(lat_c))

    # DEM en centímetros sobre el mínimo, uint16 (resolución 1 cm; rango hasta 655 m)
    zmin = math.floor(z.min())
    rango = z.max() - zmin
    assert rango < 655, f"rango de elevación {rango:.0f} m: no entra en uint16 en cm"
    dem_cm = np.round((z - zmin) * 100).astype("<u2")

    # cielo tapado: primero el de la carpeta del terreno (data/terreno/<zona>/cielo_bloqueado_u8.bin, mismo método);
    # si no está, se calcula (1-2 minutos) y se guarda en escena3d/.cache/ según el contenido del DEM
    clave = hashlib.sha1(z.tobytes()).hexdigest()[:16]
    cache = os.path.join(AQUI, ".cache", f"cielo_{a.zona}_{clave}.bin")
    del_terreno = os.path.join(dz, "cielo_bloqueado_u8.bin")
    if os.path.exists(del_terreno) and os.path.getsize(del_terreno) == W * H:
        cielo_u8 = np.fromfile(del_terreno, dtype=np.uint8)
        print(f"cielo tapado: desde {os.path.relpath(del_terreno, RAIZ)}")
    elif os.path.exists(cache):
        cielo_u8 = np.fromfile(cache, dtype=np.uint8)
        print(f"cielo tapado: desde {os.path.relpath(cache, RAIZ)}")
    else:
        t0 = time.time()
        cielo = cielo_tapado(z, cs * cos_lat, cs)
        print(f"cielo tapado: mediana {np.median(cielo):.3f}, máx. {cielo.max():.3f} ({time.time() - t0:.0f} s)")
        cielo_u8 = np.clip(np.round(cielo * 255), 0, 255).astype(np.uint8)
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        cielo_u8.tofile(cache)

    # rutas: solo las que caen enteras dentro de la grilla de esta zona
    gpm = meta["grados_por_m"]
    lat_s = meta["lat_norte"] - gpm * cs * H
    lon_e = meta["lon_oeste"] + gpm * cs * W
    adentro = lambda c: lat_s <= c[1] <= meta["lat_norte"] and meta["lon_oeste"] <= c[0] <= lon_e
    rutas = []
    for p in sorted(glob.glob(os.path.join(RAIZ, "data", "rutas", "*.geojson"))):
        g = leer_json(p)
        coords = [c for f in g.get("features", []) for c in
                  ([f["geometry"]["coordinates"]] if f["geometry"]["type"] == "Point" else f["geometry"]["coordinates"])]
        if coords and all(adentro(c) for c in coords):
            rutas.append({"archivo": os.path.basename(p), "geojson": g})
        else:
            print(f"ruta fuera de la zona, no se incluye: {os.path.basename(p)}")
    posicion = leer_json(os.path.join(RAIZ, "data", "curiosity", "posicion_sol5070.geojson"))
    parametros = leer_json(os.path.join(RAIZ, "data", "parametros.json"))

    # recorrido real de Curiosity dentro de la zona, si la carpeta lo trae ([columna, fila, sol, ...] en celdas)
    recorrido = None
    p_rec = os.path.join(dz, "recorrido_curiosity.json")
    if os.path.exists(p_rec):
        recorrido = leer_json(p_rec)
        recorrido["puntos"] = [q[:3] for q in recorrido["puntos"][::2]]

    # ortoimagen: si existe la versión en color (orto_color.jpg, herramientas/travesia.py), se usa esa
    p_orto = os.path.join(dz, "orto_color.jpg")
    if os.path.exists(p_orto):
        meta["fuente_orto"] = (meta.get("fuente_orto") or "") + " · color: mosaico HiRISE de 3 m de la travesía (detalle de la orto de 0,5 m, color del mosaico)"
    else:
        p_orto = os.path.join(dz, "orto.jpg")
    if os.path.exists(p_orto):
        with open(p_orto, "rb") as f:
            orto = b64(f.read())
    else:
        # sin ortoimagen: relieve sombreado calculado del DEM (sol desde el noroeste, 35° de altura)
        from PIL import Image
        import io
        gy, gx = np.gradient(z, cs, cs * cos_lat)
        pend = np.arctan(np.hypot(gx, gy))
        asp = np.arctan2(-gx, gy)
        az, alt = math.radians(315), math.radians(35)
        hs = np.clip((math.sin(alt) * np.cos(pend) + math.cos(alt) * np.sin(pend) * np.cos(az - asp)) * 255, 0, 255)
        buf = io.BytesIO()
        Image.fromarray((30 + hs * 0.6).astype(np.uint8)).resize((W * 2, H * 2)).save(buf, "JPEG", quality=88)
        orto = b64(buf.getvalue())
        meta["fuente_orto"] = "sin ortoimagen: relieve sombreado calculado del DEM"
        print("sin orto.jpg: se usa relieve sombreado")

    # mineralogía orbital CRISM recortada para la zona (data/mineralogia/crism_<zona>/: meta.json + PNG por producto)
    crism = None
    dm = os.path.join(RAIZ, "data", "mineralogia", f"crism_{a.zona}")
    if os.path.exists(os.path.join(dm, "meta.json")):
        crism = leer_json(os.path.join(dm, "meta.json"))
        crism["png"] = {}
        for prod in ["ALT", "HYD", "FM2", "MAF", "VNA"]:
            f_png = os.path.join(dm, prod + ".png")
            if os.path.exists(f_png):
                with open(f_png, "rb") as f:
                    crism["png"][prod] = b64(f.read())
        print(f"mineralogía CRISM: {', '.join(crism['png'])}")

    # capas calculadas (data/capas/<zona>/): clases de peligro por celda, en la misma grilla que el DEM
    capas = None
    dc = os.path.join(RAIZ, "data", "capas", a.zona)
    if os.path.exists(os.path.join(dc, "peligro_clases.png")):
        with open(os.path.join(dc, "peligro_clases.png"), "rb") as f:
            capas = {"peligro_clases": b64(f.read()), "meta": leer_json(os.path.join(dc, "meta.json"))}
        print("capas: peligro_clases")

    # contexto: toda la travesía de Curiosity alrededor de la zona (data/terreno/travesia_sur/, herramientas/travesia.py),
    # con el recorrido real y las 49 perforaciones (data/curiosity/, herramientas/travesia_datos.py)
    contexto = travesia = pozos = expedicion = crism_ctx = globo = None
    dctx = os.path.join(RAIZ, "data", "terreno", "travesia_sur")
    if a.zona == "sol5070" and os.path.exists(os.path.join(dctx, "meta.json")):
        leer_b64 = lambda n: b64(open(os.path.join(dctx, n), "rb").read())
        mc = leer_json(os.path.join(dctx, "meta.json"))
        contexto = {"meta": mc, "dem_png": leer_b64(mc["dem"]["archivo"]), "color_jpg": [leer_b64(n) for n in mc["color"]["archivos"]],
                    "cielo_png": leer_b64(mc["cielo"]["archivo"]), "pend_png": leer_b64(mc["pendiente"]["archivo"])}
        p_rec2 = os.path.join(RAIZ, "data", "curiosity", "recorrido_completo.geojson")
        if os.path.exists(p_rec2):
            f = leer_json(p_rec2)["features"][0]; pr = f["properties"]
            travesia = {"puntos": [[c[0], c[1], s, k] for c, s, k in zip(f["geometry"]["coordinates"], pr["sol_aprox"], pr["cielo_tapado_pct"])],
                        "props": {k: v for k, v in pr.items() if k not in ("sol_aprox", "cielo_tapado_pct", "elevacion_m")}}
        p_poz = os.path.join(RAIZ, "data", "curiosity", "perforaciones.geojson")
        if os.path.exists(p_poz):
            g = leer_json(p_poz)
            pozos = {"nota": g.get("nota", ""), "lista": [dict(f["properties"], lon=f["geometry"]["coordinates"][0], lat=f["geometry"]["coordinates"][1]) for f in g["features"]]}
            sumar_biblioteca(pozos["lista"])
        # expedición sur (herramientas/expedicion.py): puntos nuevos más allá de A4 y CRISM del contexto para la perforación simulada
        p_exp = os.path.join(RAIZ, "data", "rutas", "expedicion_sur.geojson")
        if os.path.exists(p_exp):
            expedicion = leer_json(p_exp)
            print(f"expedición sur: {sum(1 for f in expedicion['features'] if f['geometry']['type'] == 'Point')} puntos")
        p_cc = os.path.join(RAIZ, "data", "mineralogia", "crism_contexto.png")
        if os.path.exists(p_cc):
            crism_ctx = {"meta": leer_json(p_cc.replace(".png", ".json")), "png": b64(open(p_cc, "rb").read())}
        # globo de Marte de fondo (herramientas/globo.py): relieve MOLA y color Viking alrededor de la travesía
        dg = os.path.join(RAIZ, "data", "terreno", "globo")
        if os.path.exists(os.path.join(dg, "meta.json")):
            globo = {"meta": leer_json(os.path.join(dg, "meta.json"))}
            for n in ("mola_region", "color_region", "mola_global", "color_global"):
                globo[n] = b64(open(os.path.join(dg, n + ".png"), "rb").read())
            globo["viking_region"] = b64(open(os.path.join(dg, "viking_region.jpg"), "rb").read())
            vg = os.path.join(dg, "viking_global.jpg")                                    # color de todo Marte (Viking MDIM 2.1, 4096 × 2048, de herramientas/globo.py)
            if os.path.exists(vg):
                globo["viking_global"] = b64(open(vg, "rb").read())
            if os.path.exists(os.path.join(dg, "ctx.json")):                           # CTX bajado con herramientas/bajar_ctx.py
                globo["ctx"] = {"meta": leer_json(os.path.join(dg, "ctx.json")),
                                "cerca": b64(open(os.path.join(dg, "ctx_cerca.jpg"), "rb").read()), "region": b64(open(os.path.join(dg, "ctx_region.jpg"), "rb").read())}
                print("globo: imagen CTX incluida")
            print("globo: MOLA + Viking alrededor de Gale y todo Marte")
        print(f"contexto: travesía completa, {len(travesia['puntos']) if travesia else 0} puntos de recorrido, {len(pozos['lista']) if pozos else 0} perforaciones")

    datos = {
        "zona": a.zona,
        "contexto": contexto,
        "travesia": travesia,
        "sitios_base": leer_json(os.path.join(RAIZ, "data", "base", "sitios_base.geojson")) if os.path.exists(os.path.join(RAIZ, "data", "base", "sitios_base.geojson")) else None,
        "pozos": pozos,
        "expedicion": expedicion,
        "crism_ctx": crism_ctx,
        "globo": globo,
        "crism": crism,
        "capas": capas,
        "meta": meta,
        "zmin": zmin,
        "cos_lat": cos_lat,
        "dem_cm": b64(dem_cm.tobytes()),
        "cielo_u8": b64(cielo_u8.tobytes()),
        "orto_jpg": orto,
        "rutas": rutas,
        "posicion": posicion,
        "recorrido": recorrido,
        "parametros": parametros,
        "armado": time.strftime("%Y-%m-%d %H:%M"),
    }

    def texto(p):
        with open(p, encoding="utf-8") as f:
            return f.read().replace("</script", "<\\/script")

    three = texto(os.path.join(AQUI, "vendor", "three.module.min.js"))
    controles = texto(os.path.join(AQUI, "vendor", "OrbitControls.js"))
    plantilla = texto(os.path.join(AQUI, "plantilla.html")).replace("<\\/script", "</script")

    if a.globo_aparte and datos.get("globo"):
        ruta_globo = os.path.join(os.path.dirname(os.path.abspath(a.salida)), "globo.json")
        with open(ruta_globo, "w", encoding="utf-8") as f:
            json.dump(datos["globo"], f, ensure_ascii=False, separators=(",", ":"))
        print(f"{ruta_globo}: {os.path.getsize(ruta_globo) / 1e6:.1f} MB (la página lo pide al abrir)")
        datos["globo"] = "globo.json"
    if a.globo_aparte and datos.get("pozos"):                                  # las fotos de las perforaciones también van aparte (tope de 16 MB por archivo)
        fotos = {str(i): p["bib"].pop("foto") for i, p in enumerate(datos["pozos"]["lista"]) if (p.get("bib") or {}).get("foto")}
        if fotos:
            ruta_f = os.path.join(os.path.dirname(os.path.abspath(a.salida)), "fotos_pozos.json")
            with open(ruta_f, "w", encoding="utf-8") as f:
                json.dump(fotos, f, separators=(",", ":"))
            print(f"{ruta_f}: {os.path.getsize(ruta_f) / 1e6:.1f} MB (la página lo pide al abrir)")
            datos["pozos"]["fotos"] = "fotos_pozos.json"
    json_datos = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (plantilla
            .replace("/*__THREE__*/", three)
            .replace("/*__CONTROLES__*/", controles)
            .replace("/*__DATOS__*/null", json_datos))
    with open(a.salida, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print(f"{a.salida}: {os.path.getsize(a.salida) / 1e6:.1f} MB, {len(rutas)} archivo(s) de rutas")


if __name__ == "__main__":
    main()

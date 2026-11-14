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

    datos = {
        "zona": a.zona,
        "crism": crism,
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

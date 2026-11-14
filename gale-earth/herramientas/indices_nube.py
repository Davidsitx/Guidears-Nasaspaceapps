"""Prepara las teselas de Gale Earth para servirlas desde la nube (Cloudflare R2 u otro almacenamiento con HTTP Range).

Los .zip se suben tal cual. Este script escribe, al lado de cada .zip, un índice chico (.idx) que dice dónde
empieza cada tesela adentro del .zip, y un manifest.json con la lista de archivos. Así el navegador pide
solo los bytes de la tesela que necesita (una petición por tesela, sin descomprimir el .zip entero).

Uso:  python herramientas/indices_nube.py CARPETA_TESELAS
      (escribe CARPETA_TESELAS/nube/*.idx y CARPETA_TESELAS/nube/manifest.json)

Formato del .idx (little-endian), una fila de 20 bytes por tesela, ordenadas por (nivel, a, b):
  uint8 nivel · uint8 método (0 guardado, 8 deflate) · uint16 reservado · uint32 a · uint32 b ·
  uint32 desplazamiento de los datos (bytes desde el inicio del .zip) · uint32 tamaño comprimido
donde la tesela se llama "nivel/a/b.ext" adentro del .zip (terreno: nivel/x/y.bin; imágenes: nivel/y/x.webp).
"""
import glob
import json
import os
import struct
import sys
import zipfile


def prefijo(nombre):
    return "hirise" if nombre.startswith("hirise") else "orto1m" if nombre.startswith("orto1m") else "terreno"


def main(carpeta):
    salida = os.path.join(carpeta, "nube")
    os.makedirs(salida, exist_ok=True)
    manifest = {"version": 1, "zips": [], "extras": {}}
    for ruta in sorted(glob.glob(os.path.join(carpeta, "*.zip"))):
        nombre = os.path.basename(ruta)
        filas, cajas, ext = [], {}, None
        with zipfile.ZipFile(ruta) as z, open(ruta, "rb") as fp:
            for info in z.infolist():
                partes = info.filename.split("/")
                if len(partes) != 3 or not partes[0].isdigit():
                    # archivos sueltos (por ejemplo meta.json): se guardan aparte en el manifest
                    if info.filename.endswith(".json"):
                        manifest["extras"][prefijo(nombre) + "/" + info.filename] = json.loads(z.read(info.filename).decode("utf-8"))
                    continue
                nivel, a = int(partes[0]), int(partes[1])
                b, ext = int(partes[2].split(".")[0]), "." + partes[2].split(".", 1)[1]
                fp.seek(info.header_offset)
                cab = fp.read(30)
                if cab[:4] != b"PK\x03\x04":
                    raise SystemExit(f"{nombre}: cabecera local inválida en {info.filename}")
                n, e = struct.unpack("<HH", cab[26:30])
                datos = info.header_offset + 30 + n + e
                if datos > 0xFFFFFFFF or info.compress_size > 0xFFFFFFFF:
                    raise SystemExit(f"{nombre}: el .zip pasa de 4 GB; partilo en archivos más chicos")
                filas.append((nivel, info.compress_type, a, b, datos, info.compress_size))
                c = cajas.setdefault(nivel, [a, a, b, b])
                c[0], c[1], c[2], c[3] = min(c[0], a), max(c[1], a), min(c[2], b), max(c[3], b)
        if not filas:
            continue
        filas.sort(key=lambda f: (f[0], f[2], f[3]))
        idx = nombre[:-4] + ".idx"
        with open(os.path.join(salida, idx), "wb") as f:
            for nivel, metodo, a, b, datos, tam in filas:
                f.write(struct.pack("<BBHIIII", nivel, metodo, 0, a, b, datos, tam))
        manifest["zips"].append({"zip": nombre, "idx": idx, "prefijo": prefijo(nombre), "ext": ext,
                                 "teselas": len(filas), "bytes": os.path.getsize(ruta),
                                 "niveles": {str(k): v for k, v in sorted(cajas.items())}})
        print(f"{nombre}: {len(filas)} teselas, índice {os.path.getsize(os.path.join(salida, idx)) / 1e6:.1f} MB")
    with open(os.path.join(salida, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print("manifest:", os.path.join(salida, "manifest.json"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "teselas"))

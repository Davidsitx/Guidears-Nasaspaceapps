"""Servidor local de Gale Earth (solo biblioteca estándar de Python 3).

- Sirve esta carpeta (index.html, capas/, etc.) en http://localhost:8765 y en la red Wi-Fi (para el celular)
- Sirve las teselas de terreno y de HiRISE 25 cm leyéndolas DIRECTO de los .zip,
  que pueden estar en ./teselas o en la carpeta de Google Drive (G:\\Mi unidad\\Marte\\teselas).

Uso: python servir.py  [carpeta_extra_con_zips ...]
"""
import os, sys, glob, zipfile, threading, webbrowser, mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

AQUI = os.path.dirname(os.path.abspath(__file__))
PUERTO = 8765
CARPETAS = [os.path.join(AQUI, "teselas"),
            r"G:\Mi unidad\Marte\teselas", r"G:\My Drive\Marte\teselas",
            os.path.expanduser("~/Google Drive/Mi unidad/Marte/teselas")] + sys.argv[1:]

# Carpeta del Drive con las 49 perforaciones: la pestaña Biblioteca deja abrir sus archivos crudos desde la página.
PERFORACIONES = [os.environ.get("GALE_PERFORACIONES", ""), r"G:\Mi unidad\Marte\Perforaciones Datos Crudos", r"G:\My Drive\Marte\Perforaciones Datos Crudos",
                 os.path.expanduser("~/Google Drive/Mi unidad/Marte/Perforaciones Datos Crudos")]


def carpeta_perforaciones():
    for c in PERFORACIONES:
        if c and os.path.isdir(c):
            return c
    return None


ZIPS = {}           # nombre interno -> ruta del .zip
import queue
_pool = {}          # ruta -> cola de ZipFile ya abiertos (se reutilizan entre conexiones)
_pool_lock = threading.Lock()


def leer(ruta, nombre):
    """Lee una tesela del .zip con un ZipFile reutilizado. Si falla (por ejemplo, Google Drive
    resincronizó el archivo), lo descarta, abre uno nuevo y reintenta."""
    with _pool_lock:
        cola = _pool.setdefault(ruta, queue.LifoQueue())
    for intento in range(3):
        try:
            z = cola.get_nowait()
        except queue.Empty:
            z = None
        try:
            if z is None:
                z = zipfile.ZipFile(ruta)
            datos = z.read(nombre)
            cola.put(z)
            return datos
        except Exception as e:
            try:
                z and z.close()
            except Exception:
                pass
            if intento == 2:
                print("  error leyendo", nombre, "de", os.path.basename(ruta), "→", e)
                raise


_firma = None


def firma():
    """Lista de .zip (nombre y tamaño) en las carpetas: si cambia, hay teselas nuevas para indexar."""
    out = []
    for c in CARPETAS:
        for ruta in sorted(glob.glob(os.path.join(c, "*.zip"))):
            try:
                out.append((ruta, os.path.getsize(ruta)))
            except OSError:
                pass
    return tuple(out)


def indexar():
    global _firma
    _firma = firma()
    ZIPS.clear()
    vistos = set()
    for c in CARPETAS:
        for ruta in sorted(glob.glob(os.path.join(c, "*.zip"))):
            nombre = os.path.basename(ruta)
            if nombre in vistos:
                continue
            vistos.add(nombre)
            try:
                with zipfile.ZipFile(ruta) as z:
                    nombres = z.namelist()
            except Exception as e:
                print("  no se pudo abrir", ruta, e)
                continue
            for n in nombres:
                pref = "hirise/" if nombre.startswith("hirise") else "orto1m/" if nombre.startswith("orto1m") else "terreno/"
                ZIPS[pref + n] = ruta
            print(f"  {nombre}: {len(nombres)} teselas  ({ruta})")


def ips_red():
    """Direcciones IPv4 de esta PC en la red local (para abrir Gale Earth desde el celular)."""
    import socket
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))      # no envía nada: solo elige la interfaz de salida
        ips.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    privada = lambda ip: ip.startswith(("192.168.", "10.")) or (ip.startswith("172.") and 16 <= int(ip.split(".")[1]) <= 31)
    return [ip for ip in ips if privada(ip)]


# Por defecto se puede abrir desde el celular (misma red Wi-Fi). Con "python servir.py --solo-pc" queda solo en esta PC.
RED = "--solo-pc" not in sys.argv


class Servidor(ThreadingHTTPServer):
    # El navegador pide decenas de teselas a la vez: la cola por defecto (5) rechazaba conexiones
    # y Cesium marcaba esas teselas como fallidas (zonas que quedaban borrosas para siempre).
    request_queue_size = 512
    daemon_threads = True
    allow_reuse_address = False


class Manejador(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"   # conexiones persistentes: menos conexiones nuevas
    def __init__(self, *a, **k):
        super().__init__(*a, directory=AQUI, **k)

    # La página y los datos se revalidan siempre: así una versión nueva se ve al recargar, sin limpiar la caché.
    def send_header(self, k, v):
        if k.lower() == "cache-control": self._cc = True
        super().send_header(k, v)

    def end_headers(self):
        if not getattr(self, "_cc", False) and self.path.split("?")[0].endswith((".html", ".json", ".webmanifest", ".js", "/")):
            super().send_header("Cache-Control", "no-cache")
        self._cc = False
        super().end_headers()

    def log_message(self, *a):
        pass

    def do_GET(self):
        ruta = self.path.split("?")[0]
        # unión con GALE-3D: /gale-earth/... es esta misma carpeta y /escena3d/... es la misión de Curiosity en 3D (carpeta hermana)
        if ruta.startswith("/gale-earth/"):
            self.path = self.path[len("/gale-earth"):]
            ruta = ruta[len("/gale-earth"):]
        if ruta.startswith("/escena3d/"):
            from urllib.parse import unquote
            base = os.path.realpath(os.path.join(AQUI, "..", "escena3d"))
            rel = unquote(ruta[len("/escena3d/"):]) or "index.html"
            real = os.path.realpath(os.path.join(base, rel))
            if not real.startswith(base + os.sep) or not os.path.isfile(real):
                self.send_error(404, "No está en escena3d")
                return
            self.send_response(200)
            self.send_header("Content-Type", (mimetypes.guess_type(real)[0] or "application/octet-stream") + ("; charset=utf-8" if real.endswith(".html") else ""))
            self.send_header("Content-Length", str(os.path.getsize(real)))
            self.end_headers()
            with open(real, "rb") as f:
                while True:
                    trozo = f.read(1 << 20)
                    if not trozo:
                        break
                    self.wfile.write(trozo)
            return
        if ruta.startswith("/teselas/"):
            clave = ruta[len("/teselas/"):]
            ruta_zip = ZIPS.get(clave)
            if ruta_zip is None:
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            try:
                datos = leer(ruta_zip, clave.split("/", 1)[1])
            except Exception:
                self.send_response(503)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/webp" if clave.endswith(".webp") else "application/octet-stream")
            self.send_header("Content-Length", str(len(datos)))
            self.send_header("Cache-Control", "max-age=86400")
            self.end_headers()
            self.wfile.write(datos)
            return
        if ruta == "/perforaciones/estado.json":
            import json
            cuerpo = json.dumps({"ok": bool(carpeta_perforaciones())}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        if ruta.startswith("/perforaciones/"):
            # solo lectura y solo dentro de la carpeta de perforaciones (nada de "../")
            from urllib.parse import unquote
            base = carpeta_perforaciones()
            rel = unquote(ruta[len("/perforaciones/"):])
            real = os.path.realpath(os.path.join(base, rel)) if base else ""
            if not base or not real.startswith(os.path.realpath(base) + os.sep) or not os.path.isfile(real):
                self.send_error(404, "No está en la carpeta de perforaciones")
                return
            tipo = mimetypes.guess_type(real)[0] or "application/octet-stream"
            if real.lower().endswith((".csv", ".md", ".txt", ".json")):
                tipo += "; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(os.path.getsize(real)))
            self.end_headers()
            with open(real, "rb") as f:
                while True:
                    trozo = f.read(1 << 20)
                    if not trozo:
                        break
                    self.wfile.write(trozo)
            return
        if ruta == "/red.json":
            import json
            puerto = self.server.server_address[1]
            cuerpo = json.dumps({"urls": [f"http://{ip}:{puerto}/index.html" for ip in ips_red()] if RED else [],
                                 "puerto": puerto}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        if ruta == "/teselas.json":
            import json
            if firma() != _firma:   # teselas nuevas, o Google Drive se conectó después: se vuelve a indexar
                print("Gale Earth · cambiaron las teselas, vuelvo a buscarlas…")
                indexar()
            cuerpo = json.dumps({"terreno": any(k.startswith("terreno/") for k in ZIPS),
                                 "hirise": any(k.startswith("hirise/") for k in ZIPS),
                                 "orto": any(k.startswith("orto1m/") for k in ZIPS)}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        return super().do_GET()


if __name__ == "__main__":
    mimetypes.add_type("image/webp", ".webp")
    mimetypes.add_type("application/manifest+json", ".webmanifest")
    mimetypes.add_type("text/markdown", ".md")
    print("Gale Earth · buscando teselas…")
    indexar()
    if not ZIPS:
        print("  (no encontré teselas: el globo usará solo el terreno de Cesium Mars)")
    # Si el puerto está ocupado (por ejemplo, un servidor viejo que quedó abierto), prueba el siguiente.
    srv = None
    for puerto in range(PUERTO, PUERTO + 20):
        try:
            srv = Servidor(("0.0.0.0" if RED else "127.0.0.1", puerto), Manejador)
            break
        except OSError:
            print(f"  el puerto {puerto} está ocupado, pruebo otro…")
    url = f"http://localhost:{puerto}/index.html"
    print(f"Abrí {url}  ·  cerrá esta ventana para apagar el servidor")
    if RED:
        ips = ips_red()
        if ips:
            print("Desde el celular (mismo Wi-Fi): " + "  o  ".join(f"http://{ip}:{puerto}/index.html" for ip in ips))
            print("  Si Windows pregunta, permití el acceso en Redes privadas. Para usarlo solo en esta PC: python servir.py --solo-pc")
    print("Perforaciones del Drive: " + (carpeta_perforaciones() or "no encontradas (la Biblioteca funciona igual, sin abrir archivos crudos)"))
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    srv.serve_forever()

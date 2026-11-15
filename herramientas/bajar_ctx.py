"""Baja la imagen CTX (la misma que usa Gale Earth) alrededor de Gale y la guarda para la escena 3D.

CTX es la cámara de contexto del Mars Reconnaissance Orbiter (NASA/JPL/MSSS); el mosaico global de 5 m es del Murray Lab (Caltech)
y lo sirve NASA–Esri en https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer. Teselas de 512 px en latitud y
longitud planetocéntricas: en el nivel l hay 2·2^l × 2^l teselas y cada una cubre 180/2^l grados.

Escribe en data/terreno/globo/:
- ctx_cerca.jpg   ±0,75° alrededor de la zona de hoy, nivel 9 (~40 m/píxel), hasta 2048 px de lado
- ctx_region.jpg  la región de Gale (127-148 E, 16 S-5 N), nivel 5 (~650 m/píxel)
- ctx.json        qué caja cubre cada imagen, nivel y fuente
Después: python escena3d/armar.py  (la escena las usa sola; sin estos archivos intenta bajarlas en vivo si hay internet).

Uso (hace falta internet y Pillow: pip install pillow):
    python herramientas/bajar_ctx.py
"""
import io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAL = os.path.join(RAIZ, 'data', 'terreno', 'globo')
URL = 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}'
Z = json.load(open(os.path.join(RAIZ, 'data', 'terreno', 'sol5070', 'meta.json')))
lat0 = (Z['lat_norte'] + Z['lat_sur']) / 2
lon0 = Z['lon_oeste'] + Z['ancho'] * Z['tam_celda_m'] * Z['grados_por_m'] / 2 / math.cos(math.radians(lat0))


def tesela(z, x, y):
    for intento in range(4):
        try:
            req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'GALE-3D (NASA Space Apps 2026)'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return Image.open(io.BytesIO(r.read())).convert('L')
        except Exception as e:
            if intento == 3:
                print('  sin tesela', z, x, y, e)
                return None
            time.sleep(1 + intento)


def mosaico(nombre, norte, sur, oeste, este, z, calidad=82, maximo=2048):
    paso = 180 / 2 ** z                      # grados por tesela
    x0, x1 = int((oeste + 180) // paso), int((este + 180) // paso)
    y0, y1 = int((90 - norte) // paso), int((90 - sur) // paso)
    nx, ny = x1 - x0 + 1, y1 - y0 + 1
    print(f'{nombre}: nivel {z}, {nx} × {ny} teselas ({paso * 111.2 / 512 * 1000:.0f} m/píxel aprox.)')
    lienzo = Image.new('L', (nx * 512, ny * 512), 0)
    pedidos = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with ThreadPoolExecutor(6) as ex:
        for (x, y), im in zip(pedidos, ex.map(lambda p: tesela(z, *p), pedidos)):
            if im is not None:
                lienzo.paste(im.resize((512, 512)), ((x - x0) * 512, (y - y0) * 512))
    # recorte exacto a la caja pedida
    px = lambda lon: (lon + 180 - x0 * paso) / paso * 512
    py = lambda lat: (90 - lat - y0 * paso) / paso * 512
    caja = tuple(int(round(v)) for v in (px(oeste), py(norte), px(este), py(sur)))
    rec = lienzo.crop(caja)
    if max(rec.size) > maximo:                # tope de 2048 px: la escena tiene que entrar en un archivo de menos de 20 MB
        f = maximo / max(rec.size); rec = rec.resize((round(rec.width * f), round(rec.height * f)), Image.LANCZOS)
    rec.save(os.path.join(SAL, nombre), quality=calidad, optimize=True)
    return dict(archivo=nombre, nivel=z, lat_norte=norte, lat_sur=sur, lon_oeste=oeste, lon_este=este, m_por_pixel=round(paso * 111.2 / 512 * 1000))


os.makedirs(SAL, exist_ok=True)
# la misma caja que la capa cercana de la escena: ±0,75° alineado a 1/16° (en longitud, ±0,75°/cos(lat))
s16 = lambda v: round(v * 16) / 16
ca = math.cos(math.radians(lat0))
salida = dict(
    fuente='CTX global mosaic (NASA/JPL/MSSS; Murray Lab, Caltech), servicio NASA–Esri OnMars/CTX. Escala de grises: la escena le pone el color Viking.',
    cerca=mosaico('ctx_cerca.jpg', s16(lat0 + 0.75), s16(lat0 - 0.75), s16(lon0 - 0.75 / ca), s16(lon0 + 0.75 / ca), 9),
    region=mosaico('ctx_region.jpg', 5.0, -16.0, 127.0, 148.0, 5),
)
json.dump(salida, open(os.path.join(SAL, 'ctx.json'), 'w'), ensure_ascii=False, indent=1)
print('Listo. Ahora: python escena3d/armar.py')

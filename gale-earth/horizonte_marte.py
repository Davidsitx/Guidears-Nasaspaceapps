"""Pantalla de carga de Gale Earth: render propio del horizonte de Marte visto desde órbita.

Superficie: mosaico en color de las sondas Viking (capas/viking_color_8k.jpg, NASA/USGS, dominio público).
Cielo: la cara de la Vía Láctea hacia el centro galáctico (capas/cielo/via_lactea_my.jpg, generada por cielo_via_lactea.py).
Atmósfera: modelo simple de neblina con altura de escala visual (supuesto, solo estético: no es un dato científico).

Uso:  python horizonte_marte.py   ->  capas/carga/horizonte_marte.jpg (2560x1440) y horizonte_marte_cel.jpg (1080x1920)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
R = 3389.5                     # km, radio medio de Marte
Image.MAX_IMAGE_PIXELS = None


def unit(v):
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def esf(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.array([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])


def render(W, H, salida, lat0=-14.0, lon0=-95.0, alt=700.0, az=70.0, pitch=-33.0, roll=-19.0, fov=64.0, cielo_giro=35.0, cielo_off=(0.0, 0.0)):
    tex = np.asarray(Image.open(os.path.join(AQUI, 'capas', 'viking_color_8k.jpg')).convert('RGB'), dtype=np.float32) / 255
    th, tw = tex.shape[:2]
    # cámara en el sistema fijo a Marte (z = norte, x = longitud 0)
    u = esf(lat0, lon0)
    e = unit(np.cross([0, 0, 1.0], u))
    n = np.cross(u, e)
    C = u * (R + alt)
    a, p = np.radians(az), np.radians(pitch)
    f = np.cos(p) * (np.cos(a) * n + np.sin(a) * e) + np.sin(p) * u
    r = unit(np.cross(f, u))
    up = np.cross(r, f)
    rl = np.radians(roll)
    r, up = r * np.cos(rl) + up * np.sin(rl), -r * np.sin(rl) + up * np.cos(rl)
    t = np.tan(np.radians(fov) / 2)
    xs = (np.arange(W) + 0.5) / W * 2 - 1
    ys = 1 - (np.arange(H) + 0.5) / H * 2
    X, Y = np.meshgrid(xs * t, ys * t * H / W)
    D = unit(f[None, None] + X[..., None] * r[None, None] + Y[..., None] * up[None, None])

    # intersección rayo-esfera
    b = D @ C
    c = C @ C - R * R
    disc = b * b - c
    golpe = (disc > 0) & (b < 0)
    s = np.where(golpe, -b - np.sqrt(np.maximum(disc, 0)), 0)
    P = C + D * s[..., None]
    N = unit(P)
    lat = np.degrees(np.arcsin(np.clip(N[..., 2], -1, 1)))
    lon = np.degrees(np.arctan2(N[..., 1], N[..., 0]))
    # muestreo bilineal del mapa Viking (columna 0 = 180° O)
    fx = (lon + 180) / 360 * tw - 0.5
    fy = (90 - lat) / 180 * th - 0.5
    x0 = np.floor(fx).astype(int); y0 = np.clip(np.floor(fy).astype(int), 0, th - 2)
    ax, ay = (fx - x0)[..., None], np.clip(fy - y0, 0, 1)[..., None]
    x0 %= tw; x1 = (x0 + 1) % tw
    col = (tex[y0, x0] * (1 - ax) + tex[y0, x1] * ax) * (1 - ay) + (tex[y0 + 1, x0] * (1 - ax) + tex[y0 + 1, x1] * ax) * ay

    # luz del Sol baja desde la izquierda y de frente: relieve del mapa más contraste suave
    sol = unit(-0.55 * r + 0.25 * f + 0.55 * u + 0.25 * n)
    lam = np.clip((N * sol).sum(-1), 0, 1)[..., None]
    col = col ** 1.08 * (0.30 + 0.85 * lam ** 0.9) * 1.12
    gris = col.mean(-1, keepdims=True); col = np.clip(gris + (col - gris) * 1.55, 0, None) * np.array([1.06, 0.97, 0.9])   # más saturado y cálido
    mu = np.clip(-(D * N).sum(-1), 1e-3, 1)[..., None]           # coseno del ángulo de visión
    neb = 1 - np.exp(-0.085 / mu)                               # neblina: crece hacia el limbo
    polvo = np.array([0.80, 0.60, 0.44]); azul = np.array([0.55, 0.66, 0.85])
    col = col * (1 - neb) + (polvo * 0.75 * neb + azul * 0.25 * neb) * (0.35 + 0.8 * lam)
    planeta = np.where(golpe[..., None], col, 0)

    # brillo de la atmósfera sobre el limbo (rayos que pasan cerca sin tocar)
    dmin = np.sqrt(np.maximum((C @ C) - b * b, 0))           # distancia mínima del rayo al centro
    h = np.where(golpe, 0, np.maximum(dmin - R, 0))
    capa1 = np.exp(-h / 14.0)[..., None] * np.array([0.95, 0.72, 0.52])      # polvo bajo, cálido
    capa2 = np.exp(-h / 55.0)[..., None] * np.array([0.42, 0.55, 0.85]) * 0.55  # neblina alta, azulada
    glow = np.where(golpe[..., None], 0, (capa1 * 0.9 + capa2) * (b < 0)[..., None])
    # banda de luz justo sobre el borde iluminado del disco
    borde = np.where(golpe, np.exp(-(mu[..., 0]) / 0.035), 0)[..., None] * np.array([0.85, 0.78, 0.75]) * 0.55

    # cielo
    cielo = Image.open(os.path.join(AQUI, 'capas', 'cielo', 'via_lactea_my.jpg')).convert('RGB').rotate(cielo_giro, resample=Image.BICUBIC, expand=False)
    cw = cielo.width
    th_ = np.radians(cielo_giro); cs, sn = abs(np.cos(th_)), abs(np.sin(th_))
    k = max((W * cs + H * sn), (W * sn + H * cs)) / cw * 1.04 * (1 + 2 * max(map(abs, cielo_off)))   # que el giro no deje esquinas vacías
    cielo = cielo.resize((int(cw * k), int(cw * k)), Image.LANCZOS)
    ox = (cielo.width - W) // 2 + int(cielo_off[0] * W); oy = (cielo.height - H) // 2 + int(cielo_off[1] * H)
    sky = np.asarray(cielo.crop((ox, oy, ox + W, oy + H)), dtype=np.float32) / 255
    sky = np.clip(sky * 0.95, 0, 1) * (1 - np.clip(glow.max(-1, keepdims=True) * 1.2, 0, 1))

    img = np.where(golpe[..., None], planeta + borde, sky) + glow
    g = Image.fromarray((np.clip(glow, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(W, H) / 220))
    img = img + np.asarray(g, dtype=np.float32) / 255 * 0.55
    # viñeta y curva de tono
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.35 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / 2
    img = img * vig[..., None]
    img = 1 - np.exp(-img * 1.35)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(salida, quality=86, optimize=True, progressive=True)
    print(salida)


if __name__ == '__main__':
    d = os.path.join(AQUI, 'capas', 'carga')
    os.makedirs(d, exist_ok=True)
    render(2560, 1440, os.path.join(d, 'horizonte_marte.jpg'))
    render(1080, 1920, os.path.join(d, 'horizonte_marte_cel.jpg'), roll=-28, fov=62, pitch=-30, cielo_giro=70)

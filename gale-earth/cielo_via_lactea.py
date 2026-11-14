"""Genera el cielo de Gale Earth: 6 caras de cubo (capas/cielo/via_lactea_*.jpg) con la Vía Láctea y las estrellas.

Datos (licencia BSD-3, paquete npm d3-celestial 0.7.35, carpeta data/):
  - stars.14.json: estrellas del catálogo Hipparcos (ESA) con magnitud y color B-V.
  - mw.json: contorno de la Vía Láctea en 5 niveles de brillo (Milky Way Outline Catalog, J. R. Vieira).
Cómo bajarlos:  npm pack d3-celestial@0.7.35 && tar xzf d3-celestial-0.7.35.tgz   (queda en package/data)

Uso:  python cielo_via_lactea.py RUTA/package/data  [tamaño_cara=2048]

Qué es medido y qué es calculado:
  - medido: posición, brillo y color de cada estrella; forma y niveles de brillo de la Vía Láctea.
  - calculado/estético: el resplandor difuso (desenfoque de los contornos), la textura de nubes (ruido) y
    el "polvo" de estrellas no resueltas. Es una representación visual, no una foto.
Orientación: coordenadas ecuatoriales J2000 (ICRF), como el cielo por defecto de Cesium. Cada cara se guarda
invertida en vertical: así coincide con el skybox Tycho-2 que trae Cesium (verificado por correlación con la banda galáctica).
"""
import json, sys, os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

P = sys.argv[1] if len(sys.argv) > 1 else 'package/data'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 2048
SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'capas', 'cielo')
os.makedirs(SALIDA, exist_ok=True)
# ecuatorial J2000 -> galáctico
R = np.array([[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445], [-0.8676661490, -0.1980763734, 0.4559837762]])
CARAS = ['px', 'mx', 'py', 'my', 'pz', 'mz']


def radec2v(ra, de):
    ra, de = np.radians(ra), np.radians(de)
    return np.stack([np.cos(de) * np.cos(ra), np.cos(de) * np.sin(ra), np.sin(de)], -1)


def cara_dir(f, s, t):   # convención de cubemap de WebGL (t = 0 arriba)
    sc, tc, uno = 2 * s - 1, 2 * t - 1, np.ones_like(s)
    v = {'px': (uno, -tc, -sc), 'mx': (-uno, -tc, sc), 'py': (sc, uno, tc), 'my': (sc, -uno, -tc), 'pz': (sc, -tc, uno), 'mz': (-sc, -tc, -uno)}[f]
    v = np.stack(v, -1)
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def dir_cara(v):
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    ax, ay, az = abs(x), abs(y), abs(z)
    m = np.argmax(np.stack([ax, ay, az], 1), 1)
    cara = np.where(m == 0, np.where(x > 0, 0, 1), np.where(m == 1, np.where(y > 0, 2, 3), np.where(z > 0, 4, 5)))
    ma = np.maximum(np.maximum(ax, ay), az)
    sc, tc = np.zeros(len(v)), np.zeros(len(v))
    for k, (a, b) in enumerate([(-z, -y), (z, -y), (x, z), (x, -z), (x, -y), (-x, -y)]):
        sel = cara == k
        sc[sel], tc[sel] = a[sel], b[sel]
    return cara, (sc / ma + 1) / 2, (tc / ma + 1) / 2


def estrellas(N, escala=1.25):
    S = json.load(open(os.path.join(P, 'stars.14.json')))['features']
    ra = np.array([f['geometry']['coordinates'][0] for f in S]) % 360
    de = np.array([f['geometry']['coordinates'][1] for f in S])
    mag = np.array([f['properties']['mag'] for f in S])
    bv = np.clip(np.array([float(f['properties'].get('bv') or 0.6) for f in S]), -0.4, 2.0)
    cara, s, t = dir_cara(radec2v(ra, de))
    X = [-0.4, 0, 0.4, 0.8, 1.2, 2.0]
    col = np.stack([np.interp(bv, X, [0.62, 0.8, 1.0, 1.0, 1.0, 1.0]), np.interp(bv, X, [0.72, 0.86, 0.97, 0.9, 0.78, 0.6]), np.interp(bv, X, [1.0, 1.0, 0.95, 0.78, 0.6, 0.4])], 1)
    flujo = np.clip(10 ** (-0.27 * (mag - 2.0)), 0, 4.0) * escala
    rad = np.clip(0.55 + 0.28 * (6.5 - mag), 0.5, 2.4) * N / 2048
    img = np.zeros((6, N, N, 3), np.float32)
    for i in range(len(mag)):
        px, py, rr = s[i] * N - 0.5, t[i] * N - 0.5, max(0.55, rad[i])
        Rr, x0, y0 = int(np.ceil(rr * 2.5)), int(round(px)), int(round(py))
        xs, ys = np.arange(x0 - Rr, x0 + Rr + 1), np.arange(y0 - Rr, y0 + Rr + 1)
        xs, ys = xs[(xs >= 0) & (xs < N)], ys[(ys >= 0) & (ys < N)]
        if len(xs) and len(ys):
            G = np.exp(-((xs[None, :] - px) ** 2 + (ys[:, None] - py) ** 2) / (2 * rr * rr))
            img[cara[i]][np.ix_(ys, xs)] += G[..., None] * flujo[i] * col[i]
    return img


def via_lactea(W=4096, H=2048):
    """Rasteriza los 5 niveles de mw.json en coordenadas galácticas (relleno par-impar por meridianos)."""
    lon = np.linspace(-180, 180, W, endpoint=False) + 180 / W
    lat = 90 - (np.arange(H) + 0.5) * 180 / H
    dens = np.zeros((H, W), np.float32)
    for f in json.load(open(os.path.join(P, 'mw.json')))['features']:
        cruces = [[] for _ in range(W)]
        for poli in f['geometry']['coordinates']:
            for anillo in poli:
                g = radec2v(np.array(anillo)[:, 0] % 360, np.array(anillo)[:, 1]) @ R.T
                L, Bb = np.degrees(np.arctan2(g[:, 1], g[:, 0])), np.degrees(np.arcsin(np.clip(g[:, 2], -1, 1)))
                L, Bb = np.append(L, L[0]), np.append(Bb, Bb[0])
                for i in range(len(L) - 1):
                    l0, b0, l1, b1 = L[i], Bb[i], L[i + 1], Bb[i + 1]
                    if l1 - l0 > 180: l1 -= 360
                    elif l0 - l1 > 180: l1 += 360
                    for sh in (-360, 0, 360):
                        a, b = l0 + sh, l1 + sh
                        lo, hi = min(a, b), max(a, b)
                        if hi < -180 or lo > 180 or hi == lo: continue
                        j0, j1 = int(np.ceil((lo + 180) / 360 * W - 0.5)), int(np.ceil((hi + 180) / 360 * W - 0.5))
                        for j in range(max(0, j0), min(W, j1)):
                            cruces[j].append(b0 + (lon[j] - a) / (b - a) * (b1 - b0))
        for j in range(W):
            c = np.sort(np.array(cruces[j]))
            if len(c):
                dens[:, j] += (np.searchsorted(c, lat[::-1]) % 2 == 1)[::-1]
    return dens


def main():
    W, H = 4096, 2048
    d = via_lactea(W, H)
    rng = np.random.default_rng(7)
    ruido = np.zeros((H, W), np.float32)
    for sig, amp in [(40, 0.8), (14, 0.7), (5, 0.6), (1.8, 0.45)]:
        r = gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), sig, mode='wrap')
        ruido += amp * r / r.std()
    g = (gaussian_filter(d, 2.5, mode='wrap') * 0.9 + gaussian_filter(d, 9, mode='wrap') * 0.9 + gaussian_filter(d, 32, mode='wrap') * 0.7) * np.exp(0.30 * ruido)
    LA, LO = np.meshgrid(90 - (np.arange(H) + 0.5) * 180 / H, np.linspace(-180, 180, W, endpoint=False) + 180 / W, indexing='ij')
    nucleo = np.exp(-(LO / 38) ** 2 - (LA / 14) ** 2)
    g += 0.35 * np.exp(-(LA / 9) ** 2) * (0.6 + 0.8 * np.exp(-(LO / 70) ** 2)) + 1.2 * nucleo
    g /= np.percentile(g, 99.95)
    calido = np.clip(nucleo * 1.4 + 0.15 * np.exp(-(LO / 90) ** 2), 0, 1)
    s = (np.arange(N) + 0.5) / N
    S, T = np.meshgrid(s, s)
    est = estrellas(N)
    for fi, f in enumerate(CARAS):
        gv = cara_dir(f, S, T) @ R.T
        l, b = np.degrees(np.arctan2(gv[..., 1], gv[..., 0])), np.degrees(np.arcsin(np.clip(gv[..., 2], -1, 1)))
        y, x = (90 - b) / 180 * H - 0.5, (l + 180) / 360 * W - 0.5
        G, K = map_coordinates(g, [y, x], order=1, mode='wrap'), map_coordinates(calido, [y, x], order=1, mode='wrap')
        img = G[..., None] * np.stack([0.80 + 0.20 * K, 0.84 + 0.02 * K, 1.0 - 0.30 * K], -1) * 0.42
        p = rng.random((N, N)) < (0.004 + 0.16 * np.clip(G, 0, 1) ** 1.3)
        img[p] += (rng.pareto(3.0, p.sum()) * 0.05 + 0.03)[:, None] * np.array([0.97, 0.96, 1.0])
        img = (1 - np.exp(-(img + est[fi]) * 1.6)) ** 0.95
        Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)[::-1]).save(os.path.join(SALIDA, f'via_lactea_{f}.jpg'), quality=88, optimize=True, progressive=True)
        print('cara', f, 'lista')


if __name__ == '__main__':
    main()

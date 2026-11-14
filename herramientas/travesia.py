"""Terreno de contexto de toda la travesía de Curiosity (aterrizaje → hoy) y sus capas.

Uso: python herramientas/travesia.py <carpeta con color.tif (3 m) y elev.tif (4 m)>
Los .tif no se versionan (data/README.md). Requiere numpy, scipy y Pillow.

Escribe en data/terreno/travesia_sur/:
  meta.json          georreferencia, escalas y fuentes
  dem_12m_rg.png     elevación a 12 m (media de 3×3 celdas de 4 m); valor = R·256 + G; z = zmin + valor · 0,05 m
  color_norte.jpg, color_sur.jpg   mosaico de color a 3 m, en dos mitades (cada una entra en una textura de 4096 px)
  cielo_12m.png      fracción de cielo tapada por el relieve (byte/255), calculada a 4 m y promediada a 12 m
  pend_12m.png       pendiente media (byte = grados × 4), calculada a 4 m y promediada a 12 m
y, para la zona de detalle, data/terreno/sol5070/orto_color.jpg (ver colorear_orto).
"""
import json, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
Image.MAX_IMAGE_PIXELS = None
R = 3396190.0
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1].rstrip('/') + '/' if len(sys.argv) > 1 else 'travesia/'
OUT = os.path.join(RAIZ, 'data/terreno/travesia_sur'); os.makedirs(OUT, exist_ok=True)
X0, Y0 = 8141100.0, -271600.0            # esquina noroeste (m, equirectangular R=3396190, paralelo 0), igual en los dos .tif
deg = lambda m: math.degrees(m / R)

def cielo_tapado(z, celda, horizonte=400.0, ndir=16):
    """Fracción del cielo tapada: media, en ndir direcciones, del seno del ángulo del horizonte hasta `horizonte` metros."""
    H, W = z.shape; dists = [d for d in (4, 8, 12, 16, 24, 32, 44, 60, 80, 104, 136, 176, 224, 288, 344, 400) if d <= horizonte]
    pad = int(horizonte / celda) + 1; zp = np.pad(z, pad, mode='constant', constant_values=-1e9)
    total = np.zeros((H, W), np.float32)
    for k in range(ndir):
        a = 2 * math.pi * k / ndir; mt = np.zeros((H, W), np.float32)
        for d in dists:
            dx, dy = int(round(math.sin(a) * d / celda)), int(round(-math.cos(a) * d / celda))
            if dx == 0 and dy == 0: continue
            v = zp[pad + dy:pad + dy + H, pad + dx:pad + dx + W]
            np.maximum(mt, (v - z) / (math.hypot(dx, dy) * celda), out=mt)
        total += mt / np.sqrt(1 + mt * mt)          # sin(atan(t))
    return total / ndir

def bloques(a, n, f=np.mean):
    H, W = a.shape; return f(a[:H // n * n, :W // n * n].reshape(H // n, n, W // n, n), axis=(1, 3))

def teñir_franjas(rgb):
    """Las franjas grises (sin dato de color en el mosaico) se tiñen con la paleta de sus bordes. Relleno visual, no dato."""
    a = rgb.astype(np.int16); sat = a.max(2) - a.min(2); negro = a.sum(2) == 0
    gris = (ndi.uniform_filter(sat.astype(np.float32), 9) < 5) & ~negro
    gris = ndi.binary_closing(ndi.binary_opening(gris, iterations=3), iterations=3)
    gris = ndi.binary_dilation(gris, iterations=5)          # incluye el borde, donde el gris se mezcla con el color
    lab, n = ndi.label(gris); out = rgb.copy(); Y = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])
    hechas = 0
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == i
        if m.sum() < 4000: continue
        g = 80; s2 = (slice(max(0, sl[0].start - g), sl[0].stop + g), slice(max(0, sl[1].start - g), sl[1].stop + g))
        mm = lab[s2] == i; borde = ndi.binary_dilation(mm, iterations=g) & ~gris[s2] & ~negro[s2]
        if borde.sum() < 2000: continue
        yb, ys = Y[s2][borde], Y[s2][mm]
        # 1) el brillo de la franja se ajusta al de su borde (por percentiles); 2) cada nivel de brillo toma el color medio del borde
        q = np.linspace(0, 100, 101); yn = np.interp(ys, np.percentile(ys, q), np.percentile(yb, q))
        niveles = np.clip(yb.astype(int), 0, 255); lut = np.zeros((256, 3))
        for c in range(3):
            suma = np.bincount(niveles, weights=a[s2][borde][:, c], minlength=256); cnt = np.bincount(niveles, minlength=256)
            ok = cnt > 20; lut[:, c] = np.interp(np.arange(256), np.flatnonzero(ok), suma[ok] / cnt[ok])
            lut[:, c] = ndi.gaussian_filter1d(lut[:, c], 4)
        yi = np.clip(yn, 0, 255); lo = np.floor(yi).astype(int); fr = (yi - lo)[:, None]; hi = np.minimum(lo + 1, 255)
        col = lut[lo] * (1 - fr) + lut[hi] * fr
        sub = out[s2]; sub[mm] = np.clip(col, 0, 255).astype(np.uint8); hechas += 1
    return out, gris, hechas

if __name__ == '__main__':
    z = np.asarray(Image.open(SRC + 'elev.tif'), np.float32); H4, W4 = z.shape
    print('elevación', z.shape, float(z.min()), float(z.max()))
    cielo = cielo_tapado(z, 4.0); np.save('/tmp/trav_cielo4.npy', cielo); np.save('/tmp/trav_z4.npy', z)
    gy, gx = np.gradient(z, 4.0); pend = np.degrees(np.arctan(np.hypot(gx, gy))).astype(np.float32); np.save('/tmp/trav_pend4.npy', pend)
    z12, c12, p12 = bloques(z, 3), bloques(cielo, 3), bloques(pend, 3)
    zmin, esc = float(np.floor(z12.min())), 0.05
    v = np.round((z12 - zmin) / esc).astype(np.uint16); rg = np.zeros(v.shape + (3,), np.uint8); rg[..., 0] = v >> 8; rg[..., 1] = v & 255
    Image.fromarray(rg).save(os.path.join(OUT, 'dem_12m_rg.png'), optimize=True)
    Image.fromarray(np.clip(c12 * 255, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'cielo_12m.png'), optimize=True)
    Image.fromarray(np.clip(p12 * 4, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'pend_12m.png'), optimize=True)
    rgb = np.asarray(Image.open(SRC + 'color.tif').convert('RGB')); print('color', rgb.shape)
    rgb2, gris, n = teñir_franjas(rgb); print('franjas grises teñidas:', n, '(%.1f%% del mosaico)' % (100 * gris.mean()))
    np.save('/tmp/trav_rgb.npy', rgb2)
    h = rgb2.shape[0] // 2
    Image.fromarray(rgb2[:h]).save(os.path.join(OUT, 'color_norte.jpg'), quality=int(os.environ.get('Q', 84)), optimize=True, subsampling='4:2:0')
    Image.fromarray(rgb2[h:]).save(os.path.join(OUT, 'color_sur.jpg'), quality=int(os.environ.get('Q', 84)), optimize=True, subsampling='4:2:0')
    # ortoimagen de la zona de detalle en color: el detalle (brillo) viene de la orto HiRISE de 0,5 m y el color del mosaico de 3 m
    zm = json.load(open(os.path.join(RAIZ, 'data/terreno/sol5070/meta.json')))
    orto = Image.open(os.path.join(RAIZ, 'data/terreno/sol5070/orto.jpg')).convert('L'); ow, oh = orto.size
    gpm = zm['grados_por_m'] * zm['tam_celda_m']
    c0 = (math.radians(zm['lon_oeste']) * R - X0) / 3; c1 = (math.radians(zm['lon_oeste'] + zm['ancho'] * gpm) * R - X0) / 3
    r0 = (Y0 - math.radians(zm['lat_norte']) * R) / 3; r1 = (Y0 - math.radians(zm['lat_norte'] - zm['alto'] * gpm) * R) / 3
    col = Image.fromarray(rgb2).resize((ow, oh), Image.BICUBIC, box=(c0, r0, c1, r1)).convert('YCbCr')
    y, cb, cr = [np.asarray(b, np.float32) for b in col.split()]
    o = np.asarray(orto, np.float32)
    # el brillo de la orto se lleva a la escala del color (por percentiles) y conserva su detalle fino
    q = np.linspace(0, 100, 201); o2 = np.interp(o, np.percentile(o, q), np.percentile(y, q))
    yb = ndi.gaussian_filter(y, 6); ob = ndi.gaussian_filter(o2, 6)
    yn = np.clip(yb + (o2 - ob) * 1.15, 0, 255)                # brillo de baja frecuencia del color + detalle de la orto
    out = Image.merge('YCbCr', [Image.fromarray(yn.astype(np.uint8)), Image.fromarray(cb.astype(np.uint8)), Image.fromarray(cr.astype(np.uint8))]).convert('RGB')
    out.save(os.path.join(RAIZ, 'data/terreno/sol5070/orto_color.jpg'), quality=82, optimize=True, subsampling='4:2:0')
    print('orto_color.jpg', out.size, round(os.path.getsize(os.path.join(RAIZ, 'data/terreno/sol5070/orto_color.jpg')) / 1e6, 2), 'MB')
    meta = dict(zona='travesia_sur', proyeccion='Equirectangular, paralelo estándar 0, R=3396190 m (igual que data/terreno/sol5070)',
        lat_norte=deg(Y0), lat_sur=deg(Y0 - H4 * 4), lon_oeste=deg(X0), lon_este=deg(X0 + W4 * 4), ancho_m=W4 * 4, alto_m=H4 * 4,
        dem=dict(archivo='dem_12m_rg.png', ancho=int(v.shape[1]), alto=int(v.shape[0]), m_por_px=12, zmin=zmin, escala_m=esc, nota='z = zmin + (R·256 + G) · escala_m'),
        color=dict(archivos=['color_norte.jpg', 'color_sur.jpg'], m_por_px=3, ancho=int(rgb.shape[1]), alto_cada_una=int(h), franjas_teñidas=n,
                   nota='Las franjas grises del mosaico original (sin dato de color) se tiñeron con la paleta de sus bordes: relleno visual.'),
        cielo=dict(archivo='cielo_12m.png', nota='byte/255 = fracción de cielo tapada; 16 direcciones, horizonte de 400 m, calculado sobre el DEM de 4 m y promediado a 12 m'),
        pendiente=dict(archivo='pend_12m.png', nota='byte/4 = grados; calculada a 4 m y promediada a 12 m'),
        fuente='Elevación y color entregados por el equipo el 14/11 (travesia_sur_elevacion_4m.tif y travesia_sur_color_3m.tif). La elevación coincide con el DEM USGS de Gale (Calef y Parker 2016): diferencia media de 0,22 m con data/terreno/sol5070. Origen exacto del mosaico de color: a confirmar por el equipo.',
        armado_con='herramientas/travesia.py')
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1, ensure_ascii=False)
    for f in sorted(os.listdir(OUT)): print(f, round(os.path.getsize(os.path.join(OUT, f)) / 1e6, 2), 'MB')

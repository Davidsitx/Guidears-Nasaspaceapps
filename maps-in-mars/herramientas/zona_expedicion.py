"""Capas de la zona de expedición: círculo de 20 km alrededor de Curiosity (sol 5070).

Fuente única de relieve: USGS Astrogeology, MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker 2016), promediado a 5 m
(el mismo `msl_5m.npy` con que se armaron las teselas del globo). Donde ese DEM no existe la celda queda
"sin dato fino" (255) y el planificador no pasa por ahí: no se rellena con el DEM global de 200 m.

Salida (maps-in-mars/capas/expedicion/), grilla de 20 m centrada en Curiosity, fila 0 = norte:
  elev_i16.bin.gz   altura en metros (int16; -32768 = sin dato)            · dato medido (DEM)
  pend_u8.bin.gz    pendiente media de las celdas de 5 m, grados x 4        · cálculo propio
  empin_u8.bin.gz   cuántas de las 16 celdas de 5 m pasan los 20° (0-16)    · cálculo propio
  cielo_u8.bin.gz   fracción de cielo tapada x 255 (16 direcciones, 400 m)  · cálculo propio, mismo método
                    que herramientas/travesia.py del equipo
  meta.json
Uso: python zona_expedicion.py RUTA/msl_5m  (sin extensión; necesita .npy y .txt)
"""
import os, sys, json, math, gzip
import numpy as np

R = 3396190.0
LAT0, LON0 = -4.82567720, 137.38915198          # Curiosity, sol 5070 (CLAUDE.md del repo)
RADIO_KM = 20.0
K = 4                                             # 4 x 5 m = 20 m
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'capas', 'expedicion')


def cielo_tapado(z, celda, horizonte=400.0, ndir=16):
    """Igual que herramientas/travesia.py: media en ndir direcciones del seno del ángulo del horizonte."""
    H, W = z.shape
    dists = [d for d in range(int(celda), int(horizonte) + 1, int(celda))]
    pad = int(horizonte / celda) + 1
    zp = np.pad(z, pad, mode='constant', constant_values=-1e9)
    total = np.zeros((H, W), np.float32)
    for k in range(ndir):
        a = 2 * math.pi * k / ndir
        mt = np.zeros((H, W), np.float32)
        for d in dists:
            dx, dy = int(round(math.sin(a) * d / celda)), int(round(-math.cos(a) * d / celda))
            if dx == 0 and dy == 0:
                continue
            v = zp[pad + dy:pad + dy + H, pad + dx:pad + dx + W]
            np.maximum(mt, (v - z) / (math.hypot(dx, dy) * celda), out=mt)
        total += mt / np.sqrt(1 + mt * mt)
    return total / ndir


def main():
    base = sys.argv[1]
    z5 = np.load(base + '.npy', mmap_mode='r')
    x0, y0, dx, dy = map(float, open(base + '.txt').read().split())
    medio_lat = math.degrees((RADIO_KM * 1000 + 200) / R)
    medio_lon = medio_lat / math.cos(math.radians(LAT0))
    c0 = int(math.floor((LON0 - medio_lon - x0) / dx / K)) * K
    c1 = int(math.ceil((LON0 + medio_lon - x0) / dx / K)) * K
    f0 = int(math.floor((LAT0 + medio_lat - y0) / dy / K)) * K
    f1 = int(math.ceil((LAT0 - medio_lat - y0) / dy / K)) * K
    H5, W5 = f1 - f0, c1 - c0
    sub = np.full((H5, W5), np.nan, np.float32)
    a0, a1, b0, b1 = max(f0, 0), min(f1, z5.shape[0]), max(c0, 0), min(c1, z5.shape[1])
    sub[a0 - f0:a1 - f0, b0 - c0:b1 - c0] = z5[a0:a1, b0:b1]
    paso_ns = abs(dy) * math.pi / 180 * R
    paso_eo = dx * math.pi / 180 * R * math.cos(math.radians(LAT0))
    print('celdas 5 m', sub.shape, 'paso', round(paso_eo, 2), round(paso_ns, 2), flush=True)

    gy, gx = np.gradient(sub, paso_ns, paso_eo)
    p5 = np.degrees(np.arctan(np.hypot(gx, gy))).astype(np.float32)
    H, W = H5 // K, W5 // K
    bl = lambda a: a.reshape(H, K, W, K)
    val = np.isfinite(bl(p5)).all(axis=(1, 3)) & np.isfinite(bl(sub)).all(axis=(1, 3))
    z20 = np.nanmean(bl(sub), axis=(1, 3))
    pmed = np.nanmean(bl(p5), axis=(1, 3))
    empin = (np.nan_to_num(bl(p5), nan=0) > 20).sum(axis=(1, 3))
    zrell = np.where(val, z20, np.nanmean(z20)).astype(np.float32)
    cielo = cielo_tapado(zrell, 20.0)

    lat_n = y0 + f0 * dy
    lon_o = x0 + c0 * dx
    lats = lat_n + (np.arange(H) + .5) * dy * K
    lons = lon_o + (np.arange(W) + .5) * dx * K
    LON, LAT = np.meshgrid(lons, lats)
    dist = np.hypot(np.radians(LON - LON0) * R * math.cos(math.radians(LAT0)), np.radians(LAT - LAT0) * R) / 1000
    dentro = dist <= RADIO_KM
    val &= dentro

    os.makedirs(SALIDA, exist_ok=True)
    def guardar(nombre, arr):
        with gzip.open(os.path.join(SALIDA, nombre), 'wb', compresslevel=9) as f:
            f.write(np.ascontiguousarray(arr).tobytes())
    guardar('elev_i16.bin.gz', np.where(val, np.round(z20), -32768).astype('<i2'))
    guardar('pend_u8.bin.gz', np.where(val, np.clip(np.round(pmed * 4), 0, 254), 255).astype('u1'))
    guardar('empin_u8.bin.gz', np.where(val, empin, 255).astype('u1'))
    guardar('cielo_u8.bin.gz', np.where(val, np.clip(np.round(cielo * 255), 0, 254), 255).astype('u1'))

    cob = {r: round(float((val & (dist <= r)).sum() / max((dist <= r).sum(), 1) * 100), 1) for r in (5, 10, 15, 20)}
    meta = dict(
        zona='expedicion_sol5070', centro=dict(lat=LAT0, lon=LON0, nota='Curiosity, sol 5070'),
        radio_km=RADIO_KM, ancho=W, alto=H, celda_m=20.0,
        lat_norte=lat_n, lon_oeste=lon_o, grados_lat=abs(dy) * K, grados_lon=dx * K,
        proyeccion='Grilla en grados planetocéntricos (lon este), R=3396190 m; fila 0 = norte',
        cobertura_dem_fino_pct=cob,
        archivos=dict(
            elev_i16='altura (m) int16 little-endian; -32768 = sin dato fino',
            pend_u8='pendiente media de las 16 celdas de 5 m, grados x4; 255 = sin dato fino',
            empin_u8='cantidad de celdas de 5 m (de 16) con pendiente > 20 grados; 255 = sin dato fino',
            cielo_u8='fracción de cielo tapada x255 (16 direcciones, horizonte 400 m, DEM de 20 m); 255 = sin dato'),
        fuentes=dict(
            dem='USGS Astrogeology, MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker 2016), promediado a 5 m. Dato medido.',
            pendiente='Cálculo propio sobre ese DEM a 5 m (gradiente central) y resumido a 20 m.',
            cielo='Cálculo propio, mismo método que herramientas/travesia.py (seno del ángulo del horizonte).'),
        armado_con='maps-in-mars/herramientas/zona_expedicion.py')
    json.dump(meta, open(os.path.join(SALIDA, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('listo', W, H, 'cobertura', cob, flush=True)


if __name__ == '__main__':
    main()

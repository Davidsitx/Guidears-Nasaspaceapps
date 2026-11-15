// ==================== Capas de todo Marte ====================
// Colores de altitud (relieve MOLA/HRSC del propio globo), infrarrojo nocturno THEMIS, topónimos de la IAU,
// lugares de aterrizaje y día/noche en este momento. Datos en capas/global/ (herramientas/capas_globales.py).
const MG = { meta: null, rampa: false, themis: [], nombres: null, aterrizajes: null, noche: null, nocheT: 0, vis: {} };

async function mgMeta() { if (!MG.meta) MG.meta = await (await fetch('capas/global/global.json')).json(); return MG.meta; }
const mgError = () => avisar(location.protocol === 'file:' ? 'Para ver las capas de todo Marte abrí Gale Earth con abrir.bat (o desde la página publicada).' : 'No se pudo cargar la capa.', 9000);

// ---- colores de altitud de todo Marte (capas/global/altitud_*.jpg, de nuestras teselas HRSC-MOLA, datum MOLA) ----
const RAMPA = { cortes: [[-8200, '#2b0f54'], [-4400, '#3b4cc0'], [-2400, '#2fa6d6'], [0, '#46c08a'], [3400, '#cfe05a'], [6500, '#f2a23c'], [9400, '#d9573b'], [13800, '#c8649a'], [18200, '#f2e4f0'], [21200, '#ffffff']] };
async function mgRampa(on) {
  MG.vis.rampa = on;
  if (on && !MG.rampa) {
    try { const a = (await mgMeta()).altitud, capas = capasImagen(); if (!capas) return; MG.rampa = [];
      for (const [arch, o, e] of [[a.oeste, -180, 0], [a.este, 0, 180]]) {   // filas en latitud geodética: van directo al rectángulo
        const L = capas.addImageryProvider(await C.SingleTileImageryProvider.fromUrl('capas/global/' + arch, { rectangle: C.Rectangle.fromDegrees(o, -90, e, 90) }));
        L.alpha = 0.6; MG.rampa.push(L); }
    } catch { MG.rampa = false; return mgError(); }
  }
  if (MG.rampa) for (const L of MG.rampa) L.show = on;
}
function mgLeyendaRampa() {
  const lo = RAMPA.cortes[0][0], hi = RAMPA.cortes.at(-1)[0];
  const g = `linear-gradient(90deg,${RAMPA.cortes.map(([h, c]) => `${c} ${((h - lo) / (hi - lo) * 100).toFixed(1)}%`).join(',')})`;
  return `<div class="sub" style="margin:2px 0 6px"><div style="height:10px;border-radius:5px;background:${g}"></div>
    <div style="display:flex;justify-content:space-between;font-size:11px"><span>−8,2 km</span><span>0</span><span>+5</span><span>+12</span><span>+21,2 km</span></div>
    Altura sobre el nivel de referencia de Marte (datum MOLA). Relieve HRSC-MOLA de 200 m (USGS), que combina el altímetro láser MOLA de Mars Global Surveyor (NASA, 1996–2001) con la cámara HRSC de Mars Express (ESA). <span class="tag">medido</span></div>`;
}
// Las teselas guardan la altura sobre el elipsoide de Cesium; para hablar en "datum MOLA" se vuelve a la esfera de 3396,19 km.
function alturaMola(h, latc) { const p = latc * Math.PI / 180, r = A * B / Math.sqrt((B * Math.cos(p)) ** 2 + (A * Math.sin(p)) ** 2); return h - (3396190 - r); }

// ---- infrarrojo nocturno THEMIS (cuatro franjas de 90°) ----
async function mgThemis(on) {
  MG.vis.themis = on;
  if (on && !MG.themis.length) {
    try { const t = (await mgMeta()).themis, capas = capasImagen(); if (!capas) return;
      for (const f of t.franjas) {
        const pr = await C.SingleTileImageryProvider.fromUrl('capas/global/' + f.archivo, { rectangle: C.Rectangle.fromDegrees(f.lon_oeste, geodetica(t.lat_sur), f.lon_este, geodetica(t.lat_norte)) });
        const L = capas.addImageryProvider(pr); L.alpha = 0.75; MG.themis.push(L);
      } } catch { return mgError(); }
  }
  for (const L of MG.themis) L.show = on;
}

// ---- topónimos de la IAU ----
async function mgNombres(on) {
  MG.vis.nombres = on;
  if (on && !MG.nombres) {
    let lista; try { lista = await (await fetch('capas/global/toponimos.json')).json(); } catch { return mgError(); }
    MG.nombres = viewer.scene.primitives.add(new C.LabelCollection());
    const etiquetas = [];
    for (const [n, lon, lat, d] of lista) {
      if (/(^|\s)Gale$/.test(n)) continue;                     // Gale ya tiene su propio cartel
      const grande = d >= 1000, medio = d >= 200;
      const lejos = Math.min(2.6e7, Math.max(1.5e5, d * 5000));  // los grandes se ven desde lejos; los chicos al acercarse
      etiquetas.push({ n, d, lon, lat, l: MG.nombres.add({ position: pos(lon, lat, 4000), text: n,
        font: grande ? '600 15px system-ui' : medio ? '500 13px system-ui' : '12px system-ui',
        fillColor: C.Color.fromCssColorString(grande ? '#ffffff' : '#f2e8dc'), outlineColor: C.Color.BLACK, outlineWidth: 4,
        style: C.LabelStyle.FILL_AND_OUTLINE, horizontalOrigin: C.HorizontalOrigin.CENTER, verticalOrigin: C.VerticalOrigin.CENTER,
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, lejos), disableDepthTestDistance: 3e6, heightReference: C.HeightReference.NONE }) });
    }
    // altura aproximada de montes y llanuras grandes, leída del relieve del globo
    const conAltura = etiquetas.filter(e => e.d >= 150 && /\b(Mons|Montes|Planitia|Planum|Tholus|Patera)\b/.test(e.n));
    if (MODO === 'globo') try {
      const hs = await alturas(conAltura.map(e => C.Cartographic.fromDegrees(e.lon, geodetica(e.lat))));
      conAltura.forEach((e, i) => { const h = hs && hs[i]; if (h != null && isFinite(h)) e.l.text = `${e.n} (${fmt(alturaMola(h, e.lat) / 1000, 1)} km)`; });
    } catch {}
  }
  if (MG.nombres) MG.nombres.show = on;
}

// ---- lugares de aterrizaje (de la línea de tiempo, cada uno con su fuente) ----
async function mgAterrizajes(on) {
  MG.vis.aterrizajes = on;
  if (on && !MG.aterrizajes) {
    let ev; try { ev = await (await fetch('datos/linea_tiempo.json')).json(); } catch { return mgError(); }
    ev = (ev.eventos || ev).filter(e => e.lat != null && (e.tipo === 'aterrizador' || e.tipo === 'rover'));
    MG.aterrizajes = ev.map(e => viewer.entities.add({ position: pos(e.lon, e.lat),
      billboard: { image: icono('▼', '#7fd1ff', 20, '#0b0d12'), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new C.DistanceDisplayCondition(2e4, 3e7) },
      label: { text: `${e.t.split(/:| en | toca | escucha | aterriza /)[0].trim()} (${e.etq})`, font: '600 12px system-ui', fillColor: C.Color.fromCssColorString('#bfe6ff'), outlineColor: C.Color.BLACK, outlineWidth: 4, style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -20), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new C.DistanceDisplayCondition(2e4, 2.2e7) } }));
  }
  if (MG.aterrizajes) for (const e of MG.aterrizajes) e.show = on;
}

// ---- día y noche en este momento (o en la hora del reloj de Órbitas) ----
// Punto subsolar con el algoritmo Mars24 de NASA GISS (Allison y McEwen 2000): declinación solar, tiempo coordinado
// de Marte (MTC) y ecuación del tiempo. Comprobado: el aterrizaje de Curiosity da 15:03 hora media local en Gale.
function solMarte(f) {
  const jdUT = f.getTime() / 86400000 + 2440587.5, jdTT = jdUT + 69.184 / 86400, d = jdTT - 2451545.0;
  const M = (19.3871 + 0.52402073 * d) * Math.PI / 180, aFMS = 270.3871 + 0.524038496 * d;
  const T = [[0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837], [0.0037, 15.7866, 21.736], [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528], [0.0018, 32.8493, 49.095]];
  const pbs = T.reduce((s, [A, tau, phi]) => s + A * Math.cos((0.985626 * d / tau + phi) * Math.PI / 180), 0);
  const ec = (10.691 + 3e-7 * d) * Math.sin(M) + 0.623 * Math.sin(2 * M) + 0.050 * Math.sin(3 * M) + 0.005 * Math.sin(4 * M) + 0.0005 * Math.sin(5 * M) + pbs;
  const L = (((aFMS + ec) % 360 + 360) % 360) * Math.PI / 180;
  const eot = 2.861 * Math.sin(2 * L) - 0.071 * Math.sin(4 * L) + 0.002 * Math.sin(6 * L) - ec;
  const mtc = ((24 * ((jdTT - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626)) % 24 + 24) % 24;
  let lon = -(((15 * (mtc - 12) + eot) % 360 + 360) % 360); if (lon < -180) lon += 360;
  return { lat: Math.asin(0.42565 * Math.sin(L)) * 180 / Math.PI + 0.25 * Math.sin(L), lon, mtc };
}
async function mgNocheDibujar() {
  const capas = capasImagen(); if (!capas) return;
  const s = solMarte(C.JulianDate.toDate(viewer.clock.currentTime)), W = 720, H = 360, r = Math.PI / 180;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
  const sd = Math.sin(s.lat * r), cd = Math.cos(s.lat * r);
  for (let y = 0; y < H; y++) { const la = (90 - (y + .5) * 180 / H) * r, sl = Math.sin(la), cl = Math.cos(la);
    for (let x = 0; x < W; x++) { const lo = (-180 + (x + .5) * 360 / W) * r, cz = sl * sd + cl * cd * Math.cos(lo - s.lon * r);
      const a = cz > 0.05 ? 0 : cz < -0.12 ? 175 : Math.round(175 * (0.05 - cz) / 0.17);   // penumbra suave en el terminador
      const i = (y * W + x) * 4; im.data[i] = 4; im.data[i + 1] = 8; im.data[i + 2] = 28; im.data[i + 3] = a; } }
  cx.putImageData(im, 0, 0);
  const pr = await C.SingleTileImageryProvider.fromUrl(cv.toDataURL('image/png'), { rectangle: C.Rectangle.fromDegrees(-180, -90, 180, 90), tileWidth: W, tileHeight: H });
  const nueva = capas.addImageryProvider(pr); nueva.alpha = 1;
  if (MG.noche) capas.remove(MG.noche, true);
  MG.noche = nueva; MG.noche.show = !!MG.vis.noche; MG.solActual = s;
  if ($('mgSol')) $('mgSol').textContent = `Sol en el cénit sobre ${fmt(Math.abs(s.lat), 1)}° ${s.lat >= 0 ? 'N' : 'S'}, ${fmt(Math.abs(s.lon), 1)}° ${s.lon >= 0 ? 'E' : 'O'}. Hora en Gale: ${String(Math.floor(((s.mtc + 137.4 / 15) % 24 + 24) % 24)).padStart(2, '0')} h (hora media local).`;
}
async function mgNoche(on) { MG.vis.noche = on; if (on) await mgNocheDibujar(); else if (MG.noche) MG.noche.show = false; }
// se actualiza solo: cada 60 s reales, o antes si el reloj de Órbitas corre rápido
viewer.clock.onTick.addEventListener(() => { if (!MG.vis.noche) return; const t = performance.now(); if (t - MG.nocheT > (viewer.clock.multiplier > 1 ? 1500 : 60000)) { MG.nocheT = t; mgNocheDibujar(); } });

function mgSeccionCapas() {
  const f = (k, t, d) => `<label class="fila"><span>${t}</span><input type="checkbox" data-mg="${k}" ${MG.vis[k] ? 'checked' : ''}></label>${d ? `<div class="sub">${d}</div>` : ''}`;
  return `<h2>Todo Marte</h2>
    ${f('rampa', 'Colores de altitud', '')}${mgLeyendaRampa()}
    ${f('themis', 'Infrarrojo nocturno (THEMIS)', 'Cómo se ve Marte de noche con la cámara térmica de la sonda Mars Odyssey (NASA): claro = más tibio (roca, costras), oscuro = más frío (polvo, arena fina). De 65°S a 65°N. <span class="tag">medido · cualitativo</span>')}
    ${f('nombres', 'Topónimos (IAU)', 'Los nombres oficiales de montes, llanuras, valles y cráteres aprobados por la Unión Astronómica Internacional. Los más grandes se ven de lejos; los chicos, al acercarse. Entre paréntesis, la altura aproximada en el centro de montes y llanuras grandes (datum MOLA; la cumbre o el fondo pueden estar más arriba o más abajo).')}
    ${f('aterrizajes', 'Lugares de aterrizaje', 'Las misiones que llegaron a la superficie, con los datos de la pestaña Historia.')}
    ${f('noche', 'Día y noche ahora', '<span id="mgSol">Dónde es de día y de noche en Marte en este momento (o en la hora del reloj de Órbitas).</span>')}
    <p class="fuente">Relieve: ${url('https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m', 'USGS, HRSC-MOLA Blended DEM 200 m')}. THEMIS: ${url('https://astrogeology.usgs.gov/search/map/themis_night_ir_controlled_mosaics_100m_v2', 'USGS, THEMIS Night IR Controlled Mosaics')}. Nombres: ${url('https://planetarynames.wr.usgs.gov/', 'planetarynames.wr.usgs.gov')} (IAU/USGS). Día y noche: algoritmo Mars24 de NASA (${url('https://www.giss.nasa.gov/tools/mars24/', 'giss.nasa.gov/tools/mars24')}).</p>`;
}
function mgEnganchar() {
  cont().querySelectorAll('[data-mg]').forEach(el => el.onchange = () => ({ rampa: mgRampa, themis: mgThemis, nombres: mgNombres, aterrizajes: mgAterrizajes, noche: mgNoche })[el.dataset.mg](el.checked));
}

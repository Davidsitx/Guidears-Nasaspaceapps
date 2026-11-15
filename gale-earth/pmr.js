// ==================== PMR: rutas más seguras en el navegador, guía de la expedición y manejo libre ====================
// Viajan juntos en el PMR (rover presurizado) y recorren paradas elegidas entre las perforaciones de Curiosity y puntos
// intermedios. En cada parada uno sale a pie a la zona científica y el otro queda en el PMR, que es refugio móvil y apoyo.
// A pie perforan más hondo que Curiosity e instalan sismómetros y magnetómetros. La expedición termina junto a Curiosity hoy
// (toman muestras) y vuelve al hábitat. Cada tramo muestra la ruta más segura (vehículo o persona), la pendiente, la dosis
// acumulada, el tiempo hasta el refugio y el motivo científico de la parada.
// Terreno: datos/terreno_pmr.png y cielo_pmr.png (celdas de 12 m, de herramientas/terreno_pmr.py). Módulo de David (con Claude).
const PMR = { T: null, cargando: null, guia: null, marcar: false, armar: { pozos: [], puntos: [], volver: true }, nPunto: 0 };
const PMR_RECO = [1, 3, 7, 27, 37, 44];          // John Klein, Windjana, Buckskin, Mary Anning, Tapo Caparo, Valle de la Luna
const PMR_COL = { manejo: '#b06bff', caminata: '#ff8a3d', regreso: '#4fbf7d', pozo: '#e0703a', inst: '#2a9d8f', curiosity: '#c04fb5', mapa: '#e0703a' };
const PMR_TAREA = { perf: 0.75, sismo: 0.75, magneto: 0.75, muestra: 0.75 };     // horas de trabajo en cada parada (supuesto, provisorio)
const PMR_ESTAC = 130;                            // el PMR estaciona a unos 130 m de la parada y el resto se hace a pie (supuesto)

// ---------- terreno ----------
async function pmrTerreno() {
  if (PMR.T) return PMR.T; if (PMR.cargando) return PMR.cargando;
  PMR.cargando = (async () => {
    const M = await (await fetch('datos/terreno_pmr.json')).json();
    const px = async url => { const b = await (await fetch(url)).blob(); const im = await createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const [a, b] = await Promise.all([px('datos/terreno_pmr.png'), px('datos/cielo_pmr.png')]);
    const N = M.ancho * M.alto, z = new Float32Array(N), p = new Float32Array(N), ar = new Uint8Array(N), ci = new Float32Array(N);
    for (let i = 0; i < N; i++) { const k = i * 4; z[i] = M.zmin + (a[k] * 256 + a[k + 1]) * M.escala_m; p[i] = (a[k + 2] & 127) / 2; ar[i] = a[k + 2] >> 7; ci[i] = b[k] / 255; }
    // la grilla es equirectangular sin coseno (como PLACES): 12 m de lado en latitud y en longitud·R
    return (PMR.T = { M, W: M.ancho, H: M.alto, z, p, ar, ci, k: M.m_por_px / 3396190 / d2r });
  })().catch(e => { PMR.cargando = null; throw e; });
  return PMR.cargando;
}
const pmrCelda = (lon, lat) => { const T = PMR.T; return [Math.min(T.W - 1, Math.max(0, Math.floor((lon - T.M.lon_oeste) / T.k))), Math.min(T.H - 1, Math.max(0, Math.floor((T.M.lat_norte - lat) / T.k)))]; };
const pmrLonLat = (c, f) => { const T = PMR.T; return [T.M.lon_oeste + (c + 0.5) * T.k, T.M.lat_norte - (f + 0.5) * T.k]; };
const pmrDentro = (lon, lat) => { const T = PMR.T; return lon > T.M.lon_oeste && lon < T.M.lon_este && lat < T.M.lat_norte && lat > T.M.lat_sur; };
function pmrMuestra(lon, lat) {
  const T = PMR.T, W = T.W, x = Math.min(W - 1.001, Math.max(0, (lon - T.M.lon_oeste) / T.k - 0.5)), y = Math.min(T.H - 1.001, Math.max(0, (T.M.lat_norte - lat) / T.k - 0.5));
  const c = Math.floor(x), f = Math.floor(y), u = x - c, v = y - f, i = f * W + c, Z = T.z;
  const z = (Z[i] * (1 - u) + Z[i + 1] * u) * (1 - v) + (Z[i + W] * (1 - u) + Z[i + W + 1] * u) * v, j = Math.round(y) * W + Math.round(x);
  return { z, p: T.p[j], ar: T.ar[j], ci: T.ci[j] };
}

// ---------- A* sobre la grilla de 12 m ----------
// Vehículo: pendiente ≤ 20°, costo 1 + (p/10)² y +6 sobre arena probable (ruedas). A pie: pendiente ≤ 20° (traje), costo 1 + (p/10)²,
// +0,5 sobre arena y algo menos donde el relieve tapa el cielo (menos dosis). Cálculo propio; límites de data/parametros.json.
function pmrAstar(a, b, aPie, lim) {
  const T = PMR.T, W = T.W, H = T.H, N = W * H;
  if (!PMR.gs) { PMR.gs = new Float32Array(N); PMR.de = new Int32Array(N); PMR.sello = new Uint32Array(N); PMR.cerr = new Uint32Array(N); PMR.n = 0; PMR.hi = new Int32Array(1 << 18); PMR.hf = new Float32Array(1 << 18); }
  const gs = PMR.gs, de = PMR.de, sello = PMR.sello, cerr = PMR.cerr, n = ++PMR.n;
  const [ca, fa] = pmrCelda(a[0], a[1]), [cb, fb] = pmrCelda(b[0], b[1]), s = fa * W + ca, g = fb * W + cb;
  const mg = 260, cx0 = Math.max(0, Math.min(ca, cb) - mg), cx1 = Math.min(W - 1, Math.max(ca, cb) + mg), fy0 = Math.max(0, Math.min(fa, fb) - mg), fy1 = Math.min(H - 1, Math.max(fa, fb) + mg);
  const P = T.p, AR = T.ar, CI = T.ci, hmin = aPie ? 0.8 : 1;
  const costo = i => { const p = P[i]; if (p > lim && i !== s && i !== g) return -1; const q = p / 10; return aPie ? 1 + q * q + 0.5 * AR[i] - 0.5 * CI[i] : 1 + q * q + 6 * AR[i]; };
  let hi = PMR.hi, hf = PMR.hf, hn = 0;
  const push = (i, f) => { if (hn >= hi.length) { const a2 = new Int32Array(hi.length * 2); a2.set(hi); const b2 = new Float32Array(hf.length * 2); b2.set(hf); PMR.hi = hi = a2; PMR.hf = hf = b2; }
    let k = hn++; while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; hi[k] = hi[p]; hf[k] = hf[p]; k = p; } hi[k] = i; hf[k] = f; };
  const pop = () => { const r = hi[0], li = hi[--hn], lf = hf[hn]; let k = 0;
    while (true) { let c = 2 * k + 1; if (c >= hn) break; if (c + 1 < hn && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hi[k] = hi[c]; hf[k] = hf[c]; k = c; }
    hi[k] = li; hf[k] = lf; return r; };
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  gs[s] = 0; sello[s] = n; de[s] = -1; push(s, hmin * Math.hypot(ca - cb, fa - fb));
  while (hn) {
    const i = pop(); if (cerr[i] === n) continue; cerr[i] = n; if (i === g) break;
    const c = i % W, f = (i - c) / W, ci = costo(i);
    for (const [dx, dy, dl] of D) {
      const c2 = c + dx, f2 = f + dy; if (c2 < cx0 || c2 > cx1 || f2 < fy0 || f2 > fy1) continue;
      const j = f2 * W + c2; if (cerr[j] === n) continue; const cj = costo(j); if (cj < 0) continue;
      const ng = gs[i] + dl * (ci + cj) / 2;
      if (sello[j] !== n || ng < gs[j]) { sello[j] = n; gs[j] = ng; de[j] = i; push(j, ng + hmin * Math.hypot(c2 - cb, f2 - fb)); }
    }
  }
  if (cerr[g] !== n) return null;
  const camino = []; for (let i = g; i !== -1; i = de[i]) camino.push(i); return camino.reverse();
}
// atajos en línea recta donde no empeoran nada (ni más pendiente ni más arena que el camino de la grilla), y de celdas a lon/lat
function pmrSuavizar(cel, aPie, a, b) {
  const T = PMR.T, W = T.W, P = cel.map(i => [i % W, Math.floor(i / W)]);
  const peor = (i, j) => { let p = 0, ar = 0; for (let k = i; k <= j; k++) { const q = cel[k]; p = Math.max(p, T.p[q]); ar += T.ar[q]; } return [p, ar]; };
  const recta = (A, Bp) => { const n = Math.ceil(Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) * 2); let p = 0, ar = 0, ult = -1;
    for (let k = 0; k <= n; k++) { const c = Math.round(A[0] + (Bp[0] - A[0]) * k / n), f = Math.round(A[1] + (Bp[1] - A[1]) * k / n), q = f * W + c; if (q === ult) continue; ult = q; p = Math.max(p, T.p[q]); ar += T.ar[q]; } return [p, ar]; };
  const sal = [0]; let i = 0;
  while (i < P.length - 1) { let j = Math.min(P.length - 1, i + 14);
    while (j > i + 1) { const [pc, ac] = peor(i, j), [pr, arr] = recta(P[i], P[j]); if (pr <= pc + 1 && (aPie || arr <= ac)) break; j--; }
    sal.push(j); i = j; }
  const out = sal.map(k => pmrLonLat(P[k][0], P[k][1]));
  out[0] = [a[0], a[1]]; out[out.length - 1] = [b[0], b[1]];       // empieza y termina en los puntos exactos
  return out;
}
// línea con los campos de la misión: [lon, lat, d, elev, marcha, terreno, cielo, t (h), dosis (µSv), terreno, mineral, kWh]
function pmrLinea(v, aPie, opc = {}) {
  const PR = MI.D.parametros.PR, paso = aPie ? 3 : 5, pts = [];
  for (let k = 0; k < v.length - 1; k++) { const [a, b] = [v[k], v[k + 1]], n = Math.max(1, Math.ceil(miDist(a[0], a[1], b[0], b[1]) / paso));
    for (let u = 0; u < n; u++) pts.push([a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n]); }
  pts.push(v[v.length - 1]);
  const S = pts.map(p => pmrMuestra(p[0], p[1])), dd = [0]; for (let i = 1; i < pts.length; i++) dd.push(dd[i - 1] + miDist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  const tasa = ci => PR.dosis * 1000 / 24 * (1 - PR.k * ci), vFlat = PR.vCam * 3.6, P = MI.D.pmr?.par || {}, cab = P.potencia_cabina_kW ?? 1.85;
  let t = 0, dos = 0, kwh = 0, sube = 0, baja = 0, maxM = 0; const L = [];
  for (let i = 0; i < pts.length; i++) {
    const a = Math.max(0, i - 2), b = Math.min(pts.length - 1, i + 2), marcha = dd[b] > dd[a] ? Math.abs(Math.atan((S[b].z - S[a].z) / (dd[b] - dd[a]))) / d2r : 0;
    if (i) { const dl = dd[i] - dd[i - 1], dz = S[i].z - S[i - 1].z, th = Math.atan2(dz, Math.max(0.01, dl));
      const dt = aPie ? dl / 1000 / (vFlat * Math.exp(-3.5 * Math.abs(Math.tan(th) + 0.05)) / Math.exp(-3.5 * 0.05)) : dl / miVPMR();
      t += dt; dos += tasa(S[i].ci) * dt; kwh += aPie ? cab * dt : MI.eKm * dl / 1000 + MI.eM * Math.max(0, dz); if (dz > 0) sube += dz; else baja -= dz;
      if (opc.tarea && dd[i - 1] < opc.tarea.d && dd[i] >= opc.tarea.d) { t += opc.tarea.h; dos += tasa(S[i].ci) * opc.tarea.h; kwh += cab * opc.tarea.h; } }
    maxM = Math.max(maxM, marcha);
    L.push([pts[i][0], pts[i][1], Math.round(dd[i] * 10) / 10, S[i].z, Math.round(marcha * 10) / 10, S[i].p, S[i].ci, t, dos, S[i].ar ? -2 : -3, -1, Math.round(kwh * 100) / 100]);
  }
  return { pts: L, largo: dd[dd.length - 1], horas: t, dosis: dos, kwh, sube, baja, maxMarcha: maxM };
}
function pmrRuta(a, b, aPie) {
  const PR = MI.D.parametros.PR, lim0 = aPie ? PR.pMax : PR.rMax;
  for (const lim of [lim0, lim0 + 5, lim0 + 15]) { const c = pmrAstar(a, b, aPie, lim); if (c) return { v: c.length > 1 ? pmrSuavizar(c, aPie, a, b) : [a, b], lim, forzado: lim > lim0 }; }
  return { v: [a, b], lim: 90, forzado: true };
}

// ---------- paradas ----------
const pmrPozo = n => (typeof POZOS !== 'undefined' ? POZOS : []).find(p => p.n === n);
function pmrParadaPozo(n) {
  const p = pmrPozo(n); if (!p) return null;
  return { tipo: 'pozo', n, codigo: String(n), nombre: p.nombre, lon: p.lon, lat: p.lat, color: PMR_COL.pozo, tarea: 'perf', sol: p.sol, hallazgo: p.hallazgo, fuente: p.fuente_hallazgo };
}
function pmrParadaCuriosity() { const c = MI.D.curiosity; return { tipo: 'curiosity', codigo: 'MSL', nombre: lg('Curiosity hoy', 'Curiosity today'), lon: c.lon, lat: c.lat, color: PMR_COL.curiosity, tarea: 'muestra' }; }
function pmrParadaInst(lon, lat, inst) {
  return { tipo: 'inst', inst, codigo: inst === 'sismo' ? 'SIS' : 'MAG', nombre: inst === 'sismo' ? lg('Estación sísmica', 'Seismic station') : lg('Estación magnética', 'Magnetic station'), lon, lat, color: PMR_COL.inst, tarea: inst };
}
const PMR_HACER = () => ({
  perf: lg('A pie perforan hasta 2 m con un taladro portátil a batería, como el que manejaban los astronautas de Apolo (pozos de hasta 3 m en la Luna); Curiosity llega a unos 6,4 cm. A 2 m el material queda protegido de la radiación de la superficie, por eso Rosalind Franklin perfora hasta ahí.',
    'On foot they drill down to 2 m with a portable battery drill, like the one Apollo astronauts operated (holes up to 3 m on the Moon); Curiosity reaches about 6.4 cm. At 2 m the material is protected from surface radiation, which is why Rosalind Franklin drills that deep.') + miFq('apoloDrill') + miFq('curDrill') + miFq('exoDrill'),
  sismo: lg('Instalan un sismómetro: InSight registró más de 1.300 sismos desde un solo lugar; una segunda estación en Gale ayuda a ubicar de dónde vienen y a ver la corteza debajo del cráter (propuesta del equipo).',
    'They install a seismometer: InSight recorded over 1,300 marsquakes from a single place; a second station in Gale helps locate where they come from and see the crust beneath the crater (team proposal).') + miFq('insightSeis'),
  magneto: lg('Instalan un magnetómetro a más de 100 m del PMR (para que el vehículo no altere la medición, supuesto): InSight midió en la superficie un campo unas diez veces más fuerte que lo previsto; en Gale dice cuánto magnetismo guardan estas rocas.',
    'They install a magnetometer more than 100 m from the PMR (so the vehicle does not disturb it, assumption): InSight measured a surface field about ten times stronger than expected; in Gale it tells how much magnetism these rocks keep.') + miFq('insightMag'),
  muestra: lg('Junto a Curiosity toman muestras de la misma roca que estudia el rover hoy, para comparar en el hábitat lo que el robot mide con sus instrumentos. Después, regreso al hábitat.',
    'Next to Curiosity they sample the same rock the rover is studying today, to compare in the habitat what the robot measures with its instruments. Then, back to the habitat.') + miFq('curDrill'),
});
function pmrMotivo(P) {
  const H = PMR_HACER()[P.tarea] || '';
  if (P.tipo === 'pozo') return `<b>${miEsc(P.codigo)} · ${miEsc(P.nombre)}</b> (sol ${P.sol}). ${miEsc(miTr(P.hallazgo || ''))}${P.fuente ? ` <span class="sub">(${miEsc(P.fuente)})</span>` : ''} ${H}`;
  if (P.tipo === 'curiosity') return `<b>MSL · ${miEsc(P.nombre)}</b>. ${miEsc(miTr(MI.paradas?.S?.motivo || ''))} ${H}`;
  return `<b>${miEsc(P.codigo)} · ${miEsc(P.nombre)}</b>. ${H}`;
}
// punto intermedio para un instrumento: cerca del medio de un tramo largo, llano (< 8°), sin arena y con algo de reparo del relieve
function pmrPuntoMedio(a, b) {
  const T = PMR.T, W = T.W, [c, f] = pmrCelda((a.lon + b.lon) / 2, (a.lat + b.lat) / 2), r = 33; let mejor = null, mv = -1e9;
  for (let y = Math.max(0, f - r); y <= Math.min(T.H - 1, f + r); y++) for (let x = Math.max(0, c - r); x <= Math.min(W - 1, c + r); x++) {
    const i = y * W + x; if (T.p[i] >= 8 || T.ar[i]) continue; const v = T.ci[i] - T.p[i] / 40 - Math.hypot(x - c, y - f) / 200; if (v > mv) { mv = v; mejor = [x, y]; } }
  return mejor ? pmrLonLat(mejor[0], mejor[1]) : null;
}
// orden de la travesía: el punto del recorrido de Curiosity más cercano
function pmrOrden(P) {
  if (P.n != null) return P.n * 1000;
  if (typeof RC === 'undefined') return 1e9; let mejor = 0, dm = 1e9;
  for (let i = 0; i < RC.length; i += 3) { const d = miDist(P.lon, P.lat, RC[i][0], RC[i][1]); if (d < dm) { dm = d; mejor = i; } }
  const n = (typeof POZOS !== 'undefined' ? POZOS : []).reduce((m, p) => { const d = miDist(P.lon, P.lat, p.lon, p.lat); return d < m[0] ? [d, p.n ?? 50] : m; }, [1e9, 0])[1];
  return n * 1000 + (mejor % 1000) / 2 + 0.5;
}
const pmrInicio = () => { const g = MI.D.pmr, f = MI.pmrFuera; return f ? { lon: f.lon, lat: f.lat, rumbo: f.rumbo } : { lon: g.lon, lat: g.lat, rumbo: Math.PI / 2 - g.yaw, base: true }; };

// ---------- armar la guía: tramos de manejo y caminatas ----------
async function pmrConstruir(paradas, opc = {}) {
  if (!(await miCargar())) return null;
  if (MI.modo) miSalirModo(false);
  const et = lg('Guía de la expedición', 'Expedition guide');
  miCard(et, lg('Calculando la ruta más segura…', 'Computing the safest route…'), lg('Cargando el terreno de 12 m (elevación, pendiente, arena y cielo tapado).', 'Loading the 12 m terrain (elevation, slope, sand and sky blocked).'), []);
  try { await pmrTerreno(); } catch (e) { miCard(et, lg('No se pudo cargar el terreno', 'Could not load the terrain'), lg('Abrí Gale Earth con abrir.bat o desde la página publicada.', 'Open Gale Earth with abrir.bat or from the published page.'), [[lg('Cerrar', 'Close'), () => miCard(), true]]); return null; }
  const ini = pmrInicio(), b = MI.D.base, lista = paradas.filter(P => pmrDentro(P.lon, P.lat));
  const fuera = paradas.length - lista.length;
  const tramos = []; let p = [ini.lon, ini.lat], rumbo = ini.rumbo, k = 0;
  const paso = async txt => { miCard(et, lg('Calculando la ruta más segura…', 'Computing the safest route…'), txt, []); await new Promise(r => setTimeout(r, 16)); };
  const manejo = (v, tipo, titulo, P, forz) => { const R = pmrLinea(v, false); if (R.largo < 5) return null;
    const n = v.length, rf = Math.atan2((v[n - 1][0] - v[n - 2][0]) * Math.cos(v[n - 1][1] * d2r), v[n - 1][1] - v[n - 2][1]);
    tramos.push({ tipo, titulo, parada: P, forzado: forz, rumboFin: rf,
      seguro: lg(`Ruta más segura para el PMR: pendiente ≤ ${MI.D.parametros.PR.rMax}°, esquiva la arena probable${forz ? ' (acá tuvo que aceptar más pendiente)' : ''}.`, `Safest route for the PMR: slope ≤ ${MI.D.parametros.PR.rMax}°, avoids probable sand${forz ? ' (here it had to accept more slope)' : ''}.`),
      L: { ...R, nombre: titulo, tipo: 'tripulado', color: PMR_COL[tipo], paradas: [], idaVuelta: false } }); return tramos[tramos.length - 1]; };
  for (const P of lista) {
    k++; await paso(lg(`Parada ${k} de ${lista.length}: ${P.nombre}. Manejo y caminata.`, `Stop ${k} of ${lista.length}: ${P.nombre}. Drive and walk.`));
    const r = pmrRuta(p, [P.lon, P.lat], false), v = r.v;
    // estaciona a ~130 m de la parada (por el camino)
    let acum = 0, corte = v.length - 1, punto = v[v.length - 1];
    for (let i = v.length - 1; i > 0; i--) { const s = miDist(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1]); if (acum + s >= PMR_ESTAC) { const u = (PMR_ESTAC - acum) / s; punto = [v[i][0] + (v[i - 1][0] - v[i][0]) * u, v[i][1] + (v[i - 1][1] - v[i][1]) * u]; corte = i; break; } acum += s; corte = 0; punto = v[0]; }
    const vm = [...v.slice(0, corte), punto];
    if (vm.length >= 2) { const t = manejo(vm, 'manejo', lg(`Manejo a ${P.nombre}`, `Drive to ${P.nombre}`), P, r.forzado); if (t) rumbo = t.rumboFin; }
    p = punto;
    // caminata: ida por la ruta más segura a pie y vuelta por el mismo camino
    const w = pmrRuta(p, [P.lon, P.lat], true).v, ida = [...w], vuelta = [...w].reverse().slice(1), dIda = ida.reduce((s, q, i) => i ? s + miDist(ida[i - 1][0], ida[i - 1][1], q[0], q[1]) : 0, 0);
    const R = pmrLinea([...ida, ...vuelta], true, { tarea: { d: dIda, h: PMR_TAREA[P.tarea] || 0.5 } });
    const pm = pmrMuestra(p[0], p[1]);
    tramos.push({ tipo: 'caminata', titulo: lg(`A pie en ${P.nombre}`, `On foot at ${P.nombre}`), parada: P,
      seguro: lg(`Ruta más segura a pie: pendiente ≤ ${MI.D.parametros.PR.pMax}° (traje), busca la sombra del relieve. Ida y vuelta al PMR.`, `Safest route on foot: slope ≤ ${MI.D.parametros.PR.pMax}° (suit), seeks terrain shade. Out and back to the PMR.`),
      L: { ...R, nombre: lg(`A pie en ${P.nombre}`, `On foot at ${P.nombre}`), tipo: 'astronauta', color: PMR_COL.caminata, paradas: [{ id: 'G', d: dIda }], idaVuelta: true, pmr: { lon: p[0], lat: p[1], rumbo, elev: pm.z } } });
  }
  if (opc.volver) {
    await paso(lg('Regreso al hábitat.', 'Return to the habitat.'));
    const r = pmrRuta(p, [MI.D.pmr.lon, MI.D.pmr.lat], false);
    manejo(r.v, 'regreso', lg('Regreso al hábitat (Base Gale)', 'Return to the habitat (Gale Base)'), null, r.forzado);
  }
  if (!tramos.length) { miCard(et, lg('No hay tramos para recorrer', 'No legs to follow'), lg('Elegí al menos una parada dentro del terreno de la travesía.', 'Pick at least one stop inside the traverse terrain.'), [[lg('Cerrar', 'Close'), () => miCard(), true]]); return null; }
  let t0 = 0, d0 = 0, k0 = 0;
  tramos.forEach((T, i) => { T.t0 = t0; T.dosis0 = d0; T.kwh0 = k0; t0 += T.L.horas; d0 += T.L.dosis; k0 += T.L.kwh; T.L.id = 'G' + i; T.motivo = T.parada ? pmrMotivo(T.parada) : lg('Vuelven al hábitat con las muestras. El PMR se carga en el garaje de la base.', 'They return to the habitat with the samples. The PMR recharges in the base garage.'); MI.lineas['G' + i] = T.L; });
  for (const id of Object.keys(MI.lineas)) if (/^G\d+$/.test(id) && !tramos.some(T => T.L.id === id)) delete MI.lineas[id];
  const G = PMR.guia = { tipo: opc.tipo || 'propia', paradas: lista, tramos, i: 0, t0: 0, dosis0: 0, kwh0: 0, horas: t0, dosis: d0, kwh: k0, fuera, volver: !!opc.volver,
    km: tramos.filter(T => T.tipo !== 'caminata').reduce((s, T) => s + T.L.largo, 0), kmPie: tramos.filter(T => T.tipo === 'caminata').reduce((s, T) => s + T.L.largo, 0),
    refMax: Math.max(0, ...tramos.filter(T => T.tipo === 'caminata').map(T => T.L.largo / 2 / MI.D.parametros.PR.vCam / 60)) };
  pmrCapa(); miCard();
  return G;
}
// la guía en el mapa: tramos (manejo violeta, a pie naranja, regreso verde) y paradas con el pin de la lámina
function pmrCapa() {
  const ds = MI.ds, G = PMR.guia; if (!ds) return;
  for (const e of [...ds.entities.values]) if (/^g/.test(e.properties?.tipo?.getValue?.() || '')) ds.entities.remove(e);
  if (!G) return;
  const cerca = new C.DistanceDisplayCondition(0, 90000);
  for (const T of G.tramos) { const ps = T.L.pts.filter((p, i) => i % 3 === 0 || i === T.L.pts.length - 1).map(p => pos(p[0], p[1]));
    ds.entities.add({ properties: { tipo: 'gborde', id: T.L.id }, polyline: { positions: ps, width: 7, clampToGround: true, zIndex: 7, material: C.Color.fromCssColorString('#1b1210').withAlpha(0.5), distanceDisplayCondition: cerca } });
    ds.entities.add({ properties: { tipo: 'gruta', id: T.L.id, nombre: T.titulo }, polyline: { positions: ps, width: 4, clampToGround: true, zIndex: 8, material: C.Color.fromCssColorString(T.L.color), distanceDisplayCondition: cerca } }); }
  G.paradas.forEach((P, i) => ds.entities.add({ position: pos(P.lon, P.lat), properties: { tipo: 'gparada', id: i, nombre: `${P.codigo} · ${P.nombre}`, codigo: P.codigo, color: P.color },
    billboard: { image: miChip(P.codigo, P.color), scale: 0.5, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: cerca },
    label: { text: `${P.codigo} · ${P.nombre}`, show: false, font: '600 13px system-ui', fillColor: C.Color.WHITE, pixelOffset: new C.Cartesian2(0, 8), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, verticalOrigin: C.VerticalOrigin.TOP, showBackground: true, backgroundColor: C.Color.fromCssColorString('#202124').withAlpha(0.88) } }));
  miVisibles();
}

// ---------- fichas en el panel ----------
function pmrTotales(G) {
  const bat = miBat();
  return `<table class="tabla"><tr><td>${lg('Manejo', 'Driving')}</td><td>${miM(G.km)} · ${miH(G.tramos.filter(T => T.tipo !== 'caminata').reduce((s, T) => s + T.L.horas, 0))}</td></tr>
    <tr><td>${lg('A pie (ida y vuelta, con el trabajo en cada parada)', 'On foot (out and back, with the work at each stop)')}</td><td>${miM(G.kmPie)} · ${miH(G.tramos.filter(T => T.tipo === 'caminata').reduce((s, T) => s + T.L.horas, 0))}</td></tr>
    <tr><td>${lg('Tiempo total', 'Total time')}</td><td>${miH(G.horas)}</td></tr>
    <tr><td>${lg('Dosis acumulada', 'Accumulated dose')} ${miFq('hassler')}</td><td>${miNum(G.dosis, 0)} µSv</td></tr>
    <tr><td>${lg('Batería del PMR', 'PMR battery')}</td><td>${miNum(G.kwh)} kWh · ${miNum(G.kwh / bat * 100)} %</td></tr>
    <tr><td>${lg('Lo más lejos del refugio a pie', 'Farthest from shelter on foot')}</td><td>${miNum(G.refMax)} min</td></tr></table>
    <p class="sub">${lg('Cálculo propio sobre el terreno de 12 m (DEM de Gale, Calef y Parker 2016): 10 km/h en el PMR, 2,5 km/h a pie en llano (Tobler), 0,64 mSv/día menos el reparo del relieve. Dentro del PMR la dosis es casi la misma: sus paredes (~1 g/cm²) no frenan los rayos cósmicos; para una tormenta solar hace falta un refugio de ~20 g/cm².', 'Our calculation on the 12 m terrain (Gale DEM, Calef and Parker 2016): 10 km/h in the PMR, 2.5 km/h on foot on flat ground (Tobler), 0.64 mSv/day minus terrain shelter. Inside the PMR the dose is almost the same: its walls (~1 g/cm²) do not stop cosmic rays; a solar storm needs a ~20 g/cm² shelter.')} ${miFq('blindajeRover')}${miFq('refugio20')} <span class="prov">${lg('provisorio', 'provisional')}</span></p>`;
}
function pmrFichaTramos() {
  const G = PMR.guia; if (!G) return pmrFichaGuia();
  const fila = (T, i) => `<div class="tarjeta" data-pmrt="${i}"><b><span class="mi-pill" style="background:${T.L.color}">${i + 1}</span> ${miEsc(T.titulo)}</b>
    <div class="sub">${miM(T.L.largo)} · ${miH(T.L.horas)} · ${lg('pend. máx.', 'max slope')} ${miNum(T.L.maxMarcha)}° · ${miNum(T.L.dosis, 1)} µSv${T.tipo === 'caminata' ? ` · ${lg('refugio a', 'shelter within')} ${miNum(T.L.largo / 2 / MI.D.parametros.PR.vCam / 60)} min` : ` · ${miNum(T.L.kwh, 1)} kWh`}</div></div>`;
  miFicha(lg('Guía de la expedición', 'Expedition guide'), `<p class="sub">${G.tipo === 'recomendada' ? lg('Guía recomendada', 'Recommended guide') : G.tipo === 'pozo' ? lg('Viaje a una perforación', 'Trip to a drill hole') : lg('Tu guía', 'Your guide')} · ${G.paradas.length} ${G.paradas.length === 1 ? lg('parada', 'stop') : lg('paradas', 'stops')} · ${G.tramos.length} ${G.tramos.length === 1 ? lg('tramo', 'leg') : lg('tramos', 'legs')}</p>
    ${G.fuera ? `<p class="sub">${lg(`${G.fuera} punto(s) quedaron afuera: están fuera del terreno de la travesía.`, `${G.fuera} point(s) were left out: they are outside the traverse terrain.`)}</p>` : ''}
    ${pmrTotales(G)}<h2>${lg('Tramos', 'Legs')}</h2>${G.tramos.map(fila).join('')}`,
    volverHoy() + bt(lg('Cambiar paradas', 'Change stops'), 'armar') + bt(lg('▶ Empezar', '▶ Start'), 'pmrt', 'data-i="0"', true), 'guia');
  cont().querySelectorAll('[data-pmrt]').forEach(e => e.onclick = () => pmrTramo(+e.dataset.pmrt));
  cont().querySelector('[data-mi="pmrt"]')?.addEventListener('click', () => pmrTramo(0));
}
function pmrFichaGuia() {
  const lista = PMR_RECO.map(n => pmrParadaPozo(n)).filter(Boolean);
  miFicha(lg('Guía de la expedición', 'Expedition guide'), `<p>${lg('Viajan juntos en el PMR y recorren paradas elegidas entre las perforaciones de Curiosity y puntos intermedios. En cada parada uno sale a pie a la zona científica y el otro queda en el PMR, refugio móvil y apoyo. A pie perforan más hondo que Curiosity e instalan sismómetros y magnetómetros. La expedición termina junto a Curiosity hoy, donde toman muestras, y vuelve al hábitat.',
      'They travel together in the PMR and visit stops chosen among Curiosity\'s drill holes and points in between. At each stop one walks to the science area and the other stays in the PMR, a mobile shelter and support. On foot they drill deeper than Curiosity and install seismometers and magnetometers. The expedition ends next to Curiosity today, where they take samples, and returns to the habitat.')}</p>
    <h2>${lg('Paradas recomendadas', 'Recommended stops')}</h2>
    ${lista.map(P => `<div class="hall"><b><span class="mi-pill" style="background:${P.color}">${P.codigo}</span> ${miEsc(P.nombre)}</b><span class="sub">${miEsc(miTr(P.hallazgo || ''))}</span></div>`).join('')}
    <div class="hall"><b><span class="mi-pill" style="background:${PMR_COL.inst}">SIS</span> <span class="mi-pill" style="background:${PMR_COL.inst}">MAG</span> ${lg('Dos estaciones en los tramos más largos', 'Two stations on the longest legs')}</b><span class="sub">${lg('Llano (< 8°), sin arena y con algo de reparo del relieve, cerca del medio del tramo.', 'Flat (< 8°), no sand and some terrain shelter, near the middle of the leg.')}</span></div>
    <div class="hall"><b><span class="mi-pill" style="background:${PMR_COL.curiosity}">MSL</span> ${lg('Curiosity hoy y regreso', 'Curiosity today and return')}</b><span class="sub">${lg('Muestras junto al rover y vuelta a la Base Gale.', 'Samples next to the rover and back to Gale Base.')}</span></div>
    <h2>${lg('Cómo se calcula la ruta más segura', 'How the safest route is computed')}</h2>
    <p class="sub">${lg('A* sobre celdas de 12 m. PMR: pendiente ≤ 20° y un costo alto sobre arena probable. A pie: pendiente ≤ 20° (traje) y preferencia por la sombra del relieve. Estaciona a unos 130 m de cada parada y el resto se camina. Supuestos marcados como provisorios.', 'A* on 12 m cells. PMR: slope ≤ 20° and a high cost on probable sand. On foot: slope ≤ 20° (suit) and a preference for terrain shade. It parks about 130 m from each stop and walks the rest. Assumptions marked as provisional.')} ${miFq('evaConops')}${miFq('jplMov')} <span class="prov">${lg('provisorio', 'provisional')}</span></p>`,
    volverHoy() + bt(lg('Armar mi guía', 'Build my guide'), 'armar') + bt(lg('Calcular y recorrer ▶', 'Compute and follow ▶'), 'guia', '', true), 'guia');
}
function pmrFichaParada(i) {
  const G = PMR.guia, P = G?.paradas[i]; if (!P) return;
  miFicha(lg('Guía de la expedición', 'Expedition guide'), `<h1 class="parada-cab"><span class="chip" style="background:${P.color}">${miEsc(P.codigo)}</span>${miEsc(P.nombre)}</h1><p>${pmrMotivo(P)}</p>
    <p class="sub">${P.lat.toFixed(5)}°, ${P.lon.toFixed(5)}° E</p>`, bt(lg('← La guía', '← The guide'), 'tramos'), 'gparada-' + i);
  cont().querySelector('[data-mi="tramos"]')?.addEventListener('click', pmrFichaTramos);
}
async function pmrGuiaRecomendada() {
  if (!MI.activo) await miEntrar(false);
  if (PMR.guia?.tipo === 'recomendada' && !MI.pmrFuera) { pmrFichaTramos(); return pmrListosGuia(); }
  if (!(await miCargar())) return;
  try { await pmrTerreno(); } catch { return pmrConstruir([]); }
  const pz = PMR_RECO.map(n => pmrParadaPozo(n)).filter(Boolean), cur = pmrParadaCuriosity(), ini = pmrInicio(), cad = [ini, ...pz, cur];
  // dos estaciones de instrumentos en los dos tramos más largos (en línea recta)
  const largos = cad.slice(1).map((P, i) => [miDist(cad[i].lon, cad[i].lat, P.lon, P.lat), i]).sort((a, b) => b[0] - a[0]).slice(0, 2).sort((a, b) => b[1] - a[1]);
  const lista = [...pz, cur]; let inst = ['magneto', 'sismo'];
  for (const [, i] of largos) { const m = pmrPuntoMedio(cad[i], cad[i + 1]); if (m) lista.splice(i, 0, pmrParadaInst(m[0], m[1], inst.pop() || 'sismo')); }
  const G = await pmrConstruir(lista, { volver: true, tipo: 'recomendada' }); if (!G) return;
  pmrFichaTramos(); pmrListosGuia();
}
function pmrListosGuia() {
  const G = PMR.guia; if (!G) return;
  miCard(lg('Guía de la expedición', 'Expedition guide'), lg(`${G.paradas.length} parada${G.paradas.length === 1 ? '' : 's'} · ${G.tramos.length} tramos`, `${G.paradas.length} stop${G.paradas.length === 1 ? '' : 's'} · ${G.tramos.length} legs`),
    lg(`${miM(G.km)} en el PMR y ${miM(G.kmPie)} a pie, ${miH(G.horas)} en total, ${miNum(G.dosis)} µSv y ${miNum(G.kwh / miBat() * 100)} % de la batería (cálculo propio). Los tramos están en el panel.`,
      `${miM(G.km)} in the PMR and ${miM(G.kmPie)} on foot, ${miH(G.horas)} in total, ${miNum(G.dosis)} µSv and ${miNum(G.kwh / miBat() * 100)} % of the battery (our calculation). The legs are in the panel.`),
    [[lg('▶ Empezar', '▶ Start'), () => pmrTramo(0), true], [lg('Cerrar', 'Close'), () => miCard()]]);
  pmrVerGuia();
}
function pmrVerGuia() {
  const G = PMR.guia; if (!G || MI.modo) return; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const T of G.tramos) for (const p of T.L.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const r = Math.max((x1 - x0) * Math.cos(y0 * d2r), y1 - y0) * M_GRADO / 2, lon = (x0 + x1) / 2, lat = (y0 + y1) / 2;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(lon, lat, alturaSuelo(lon, lat, -4000)), Math.max(300, r)), { offset: new C.HeadingPitchRange(0.2, -0.85, Math.max(1500, r * 2.6)), duration: 2.2, pitchAdjustHeight: 1500000 });
}
// armar mi guía: perforaciones y puntos del mapa, en el orden de la travesía, siempre terminando en Curiosity hoy
function pmrFichaArmar() {
  const A = PMR.armar, todas = (typeof POZOS !== 'undefined' ? POZOS : []).filter(p => p.n != null), fil = (A.filtro || '').toLowerCase();
  const elegidas = [...A.pozos.map(n => pmrParadaPozo(n)).filter(Boolean), ...A.puntos].sort((a, b) => pmrOrden(a) - pmrOrden(b));
  const INST = () => ({ perf: lg('Perforar 2 m', 'Drill 2 m'), sismo: lg('Sismómetro', 'Seismometer'), magneto: lg('Magnetómetro', 'Magnetometer') });
  miFicha(lg('Armar mi guía', 'Build my guide'), `<p class="sub">${lg('Elegí perforaciones de Curiosity y puntos del mapa. La guía los ordena siguiendo la travesía, termina junto a Curiosity hoy (muestras) y, si querés, vuelve al hábitat.', 'Pick Curiosity drill holes and map points. The guide orders them along the traverse, ends next to Curiosity today (samples) and, if you want, returns to the habitat.')}</p>
    <h2>${lg('Tu guía', 'Your guide')} (${elegidas.length + 1} ${elegidas.length ? lg('paradas', 'stops') : lg('parada', 'stop')})</h2>
    <div class="mi-lista">${elegidas.map(P => `<div class="fil" style="display:flex;align-items:center;gap:8px;padding:6px 9px;border-bottom:1px solid #ffffff0d"><span class="mi-pill" style="background:${P.color}">${miEsc(P.codigo)}</span>${miEsc(P.nombre)}
      ${P.tipo === 'mapa' ? `<select data-inst="${P.id}" style="margin-left:auto;background:var(--sup2);color:var(--texto);border:1px solid #ffffff1f;border-radius:8px;height:28px">${Object.entries(INST()).map(([k, t]) => `<option value="${k}" ${P.tarea === k ? 'selected' : ''}>${t}</option>`).join('')}</select>` : '<small>' + INST().perf + '</small>'}
      <button data-quitar="${P.tipo === 'mapa' ? P.id : 'n' + P.n}" title="${lg('Quitar', 'Remove')}" style="border:0;background:none;color:var(--suave);cursor:pointer;font-size:16px">×</button></div>`).join('')}
      <div style="display:flex;align-items:center;gap:8px;padding:6px 9px"><span class="mi-pill" style="background:${PMR_COL.curiosity}">MSL</span>${lg('Curiosity hoy · muestras (siempre al final)', 'Curiosity today · samples (always last)')}</div></div>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px"><input type="checkbox" id="pmrVolver" ${A.volver ? 'checked' : ''}> ${lg('Volver al hábitat al final', 'Return to the habitat at the end')}</label>
    <div class="mi-bts">${bt(PMR.marcar ? lg('Listo con el mapa', 'Done with the map') : lg('+ Punto del mapa', '+ Map point'), 'marcar')}${bt(lg('Usar las recomendadas', 'Use the recommended ones'), 'reco')}${bt(lg('Vaciar', 'Clear'), 'vaciar')}</div>
    <h2>${lg('Perforaciones de Curiosity', 'Curiosity drill holes')}</h2>
    <input class="mi-buscar" id="pmrFiltro" placeholder="${lg('Buscar por nombre o número', 'Search by name or number')}" value="${miEsc(A.filtro || '')}">
    <div class="mi-lista" id="pmrPozos">${todas.filter(p => !fil || p.nombre.toLowerCase().includes(fil) || String(p.n) === fil).map(p => `<label><input type="checkbox" data-n="${p.n}" ${A.pozos.includes(p.n) ? 'checked' : ''}><span class="mi-pill" style="background:${colorDe(p)}">${p.n}</span>${miEsc(p.nombre)}<small>sol ${p.sol}</small></label>`).join('')}</div>`,
    volverHoy() + bt(lg('Calcular la ruta más segura ▶', 'Compute the safest route ▶'), 'calcular', '', true), 'armar');
  const c = cont();
  c.querySelectorAll('#pmrPozos [data-n]').forEach(e => e.onchange = () => { const n = +e.dataset.n; A.pozos = e.checked ? [...new Set([...A.pozos, n])] : A.pozos.filter(x => x !== n); if (A.pozos.length + A.puntos.length > 12) { A.pozos = A.pozos.filter(x => x !== n); avisar(lg('Hasta 12 paradas por guía.', 'Up to 12 stops per guide.')); } pmrFichaArmar(); });
  c.querySelectorAll('[data-quitar]').forEach(e => e.onclick = () => { const k = e.dataset.quitar; if (k[0] === 'n') A.pozos = A.pozos.filter(x => x !== +k.slice(1)); else A.puntos = A.puntos.filter(P => P.id !== k); pmrTemp(); pmrFichaArmar(); });
  c.querySelectorAll('[data-inst]').forEach(e => e.onchange = () => { const P = A.puntos.find(q => q.id === e.dataset.inst); if (P) { P.tarea = e.value; P.inst = e.value; } });
  $('pmrVolver').onchange = e => { A.volver = e.target.checked; };
  const f = $('pmrFiltro'); f.oninput = () => { A.filtro = f.value; const pos0 = f.selectionStart; pmrFichaArmar(); const g = $('pmrFiltro'); g.focus(); g.setSelectionRange(pos0, pos0); };
  c.querySelector('[data-mi="marcar"]').onclick = () => pmrMarcar(!PMR.marcar);
  c.querySelector('[data-mi="reco"]').onclick = () => { A.pozos = [...PMR_RECO]; pmrFichaArmar(); };
  c.querySelector('[data-mi="vaciar"]').onclick = () => { A.pozos = []; A.puntos = []; pmrTemp(); pmrFichaArmar(); };
  c.querySelector('[data-mi="calcular"]').onclick = async () => { pmrMarcar(false);
    const lista = [...A.pozos.map(n => pmrParadaPozo(n)).filter(Boolean), ...A.puntos.map(P => ({ ...P }))].sort((a, b) => pmrOrden(a) - pmrOrden(b));
    const G = await pmrConstruir([...lista, pmrParadaCuriosity()], { volver: A.volver, tipo: 'propia' }); if (G) { pmrTemp(); pmrFichaTramos(); pmrListosGuia(); } };
}
function pmrMarcar(on) {
  PMR.marcar = on; document.body.classList.toggle('mi-marcar', on);
  if (on) { if (!PMR.T) pmrTerreno().catch(() => {}); miCard(lg('Armar mi guía', 'Build my guide'), lg('Tocá el mapa donde quieras parar', 'Tap the map where you want to stop'), lg('Cada toque agrega un punto (dentro del terreno de la travesía, de Bradbury a la zona de hoy). Esc para terminar.', 'Each tap adds a point (inside the traverse terrain, from Bradbury to today\'s area). Esc to finish.'), [[lg('Listo', 'Done'), () => pmrMarcar(false), true]]); }
  else miCard();
  if (MI.fichaClave === 'armar') pmrFichaArmar();
}
function pmrMarcado(lon, lat) {
  const A = PMR.armar;
  if (PMR.T && !pmrDentro(lon, lat)) return avisar(lg('Ese punto está fuera del terreno de la travesía.', 'That point is outside the traverse terrain.'));
  if (A.pozos.length + A.puntos.length >= 12) return avisar(lg('Hasta 12 paradas por guía.', 'Up to 12 stops per guide.'));
  const k = ++PMR.nPunto; A.puntos.push({ tipo: 'mapa', id: 'P' + k, codigo: 'P' + k, nombre: lg(`Punto ${k} del mapa`, `Map point ${k}`), lon, lat, color: PMR_COL.mapa, tarea: 'perf' });
  pmrTemp(); if (MI.fichaClave === 'armar') pmrFichaArmar();
}
function pmrTemp() {        // pines de los puntos elegidos en el mapa (todavía sin guía)
  const ds = MI.ds; if (!ds) return;
  for (const e of [...ds.entities.values]) if (e.properties?.tipo?.getValue?.() === 'gtemp') ds.entities.remove(e);
  for (const P of PMR.armar.puntos) ds.entities.add({ position: pos(P.lon, P.lat), properties: { tipo: 'gtemp', id: P.id, nombre: P.nombre },
    billboard: { image: miChip(P.codigo, P.color, true), scale: 0.5, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
}
// ir a una de las 49 perforaciones: ruta más segura desde donde esté el PMR, caminata y perforación de 2 m
function pmrFichaIrPozo() {
  const todas = (typeof POZOS !== 'undefined' ? POZOS : []).filter(p => p.n != null), fil = (PMR.filtroIr || '').toLowerCase();
  miFicha(lg('Ir a una perforación', 'Drive to a drill hole'), `<p class="sub">${lg(`Desde donde está el PMR (${MI.pmrFuera ? 'donde quedó' : 'la Base Gale'}): la ruta más segura para el vehículo, estaciona a unos 130 m y uno sigue a pie a perforar 2 m mientras el otro queda en el PMR.`, `From where the PMR is (${MI.pmrFuera ? 'where it was left' : 'Gale Base'}): the safest route for the vehicle, it parks about 130 m away and one continues on foot to drill 2 m while the other stays in the PMR.`)}</p>
    <input class="mi-buscar" id="pmrFiltroIr" placeholder="${lg('Buscar por nombre o número', 'Search by name or number')}" value="${miEsc(PMR.filtroIr || '')}">
    <div class="mi-lista">${todas.filter(p => !fil || p.nombre.toLowerCase().includes(fil) || String(p.n) === fil).map(p => `<button class="fil" data-mi="pozo" data-n="${p.n}"><span class="mi-pill" style="background:${colorDe(p)}">${p.n}</span>${miEsc(p.nombre)}<small>sol ${p.sol} · ${miM(miDist(pmrInicio().lon, pmrInicio().lat, p.lon, p.lat))}</small></button>`).join('')}</div>`, volverHoy() + bt('PMR', 'pmr'), 'irpozo');
  const f = $('pmrFiltroIr'); f.oninput = () => { PMR.filtroIr = f.value; const p0 = f.selectionStart; pmrFichaIrPozo(); const g = $('pmrFiltroIr'); g.focus(); g.setSelectionRange(p0, p0); };
}
async function pmrIrAPozo(n) {
  const P = pmrParadaPozo(n); if (!P) return; if (!MI.activo) await miEntrar(false);
  const G = await pmrConstruir([P], { volver: false, tipo: 'pozo' }); if (!G) return;
  pmrFichaTramos(); pmrTramo(0);
}

// ---------- recorrer la guía: un tramo por vez ----------
function pmrTramo(i) {
  const G = PMR.guia, T = G?.tramos[i]; if (!T) return;
  G.i = i; G.t0 = T.t0; G.dosis0 = T.dosis0; G.kwh0 = T.kwh0; G.parada = T.parada; if (i === 0) G.msgs = false;
  miModo(T.L.id, 'guia');
  const P = T.parada, PR = MI.D.parametros.PR;
  if (i === 0) miMsg('base', lg(`Expedición autorizada: ${G.paradas.length} parada${G.paradas.length === 1 ? '' : 's'}, ${miM(G.km)} en el PMR. El PMR es refugio móvil; la base sigue la ruta desde acá.`, `Expedition authorized: ${G.paradas.length} stop${G.paradas.length === 1 ? '' : 's'}, ${miM(G.km)} in the PMR. The PMR is a mobile shelter; the base follows the route from here.`));
  if (T.tipo === 'caminata') { miMsg('a2', lg(`Quedo en el PMR. Ruta a pie más segura hasta ${miEsc(P.nombre)}: ${miM(T.L.largo / 2)}, pendiente máxima ${miNum(T.L.maxMarcha)}°. Te sigo en la pantalla.`, `I'm staying in the PMR. Safest walking route to ${miEsc(P.nombre)}: ${miM(T.L.largo / 2)}, max slope ${miNum(T.L.maxMarcha)}°. Following you on the screen.`));
    miMsg('a1', lg('Traje puesto por el suitport. Salgo.', 'Suited up through the suitport. Heading out.')); }
  else miMsg('a2', lg(`Tramo ${i + 1}: ${miEsc(T.titulo)}. ${miM(T.L.largo)}, unos ${miH(T.L.horas)} a ${miNum(miVPMR() / 1000)} km/h, pendiente máxima ${miNum(T.L.maxMarcha)}° (límite ${PR.rMax}°).`, `Leg ${i + 1}: ${miEsc(T.titulo)}. ${miM(T.L.largo)}, about ${miH(T.L.horas)} at ${miNum(miVPMR() / 1000)} km/h, max slope ${miNum(T.L.maxMarcha)}° (limit ${PR.rMax}°).`) + (T.forzado ? lg(' Ojo: no hay paso por debajo del límite, vamos despacio.', ' Careful: there is no path under the limit, going slowly.') : ''));
}
function pmrListos(m) {
  const G = PMR.guia, T = G.tramos[G.i], L = T.L, EVA = MI.D.parametros.EVA, bat = miBat();
  const txt = T.tipo === 'caminata'
    ? lg(`El Astronauta 1 sale a pie con el visor del casco; el 2 queda en el PMR con la pantalla. ${miM(L.largo / 2)} hasta la parada (ida y vuelta ${miM(L.largo)}), pendiente máxima ${miNum(L.maxMarcha)}°, ${miH(L.horas)} afuera con el trabajo, ${miNum(L.dosis, 1)} µSv. El refugio queda a ${miNum(L.largo / 2 / MI.D.parametros.PR.vCam / 60)} min como mucho (límite ${EVA.refugio} min).`,
      `Astronaut 1 walks out with the helmet visor; Astronaut 2 stays in the PMR with the screen. ${miM(L.largo / 2)} to the stop (${miM(L.largo)} out and back), max slope ${miNum(L.maxMarcha)}°, ${miH(L.horas)} outside including the work, ${miNum(L.dosis, 1)} µSv. Shelter is at most ${miNum(L.largo / 2 / MI.D.parametros.PR.vCam / 60)} min away (limit ${EVA.refugio} min).`)
    : lg(`Ruta más segura para el PMR: ${miM(L.largo)}, pendiente máxima ${miNum(L.maxMarcha)}°, ${miH(L.horas)} de manejo, ${miNum(L.kwh, 1)} kWh (queda ${miNum(100 - (G.kwh0 + L.kwh) / bat * 100)} % de batería). Dosis del tramo: ${miNum(L.dosis, 1)} µSv.`,
      `Safest route for the PMR: ${miM(L.largo)}, max slope ${miNum(L.maxMarcha)}°, ${miH(L.horas)} of driving, ${miNum(L.kwh, 1)} kWh (${miNum(100 - (G.kwh0 + L.kwh) / bat * 100)} % battery left). Leg dose: ${miNum(L.dosis, 1)} µSv.`);
  miCard(lg(`Expedición · tramo ${G.i + 1} de ${G.tramos.length}`, `Expedition · leg ${G.i + 1} of ${G.tramos.length}`), miEsc(T.titulo), txt,
    [[lg('▶ Salir', '▶ Go'), () => miJugar(true), true], [lg('Ver los tramos', 'See the legs'), () => { pmrFichaTramos(); $('cajon').classList.add('mi-libre'); }], [lg('Dejar la guía', 'Leave the guide'), () => miSalirModo(true)]]);
}
// en la parada: el que camina hace el trabajo (perforar 2 m, instalar un instrumento o tomar muestras)
function pmrLlegada(m, id) {
  const G = PMR.guia, T = G.tramos[G.i], P = T.parada, TXT = { perf: lg('Perforar 2 m', 'Drill 2 m'), sismo: lg('Instalar el sismómetro', 'Install the seismometer'), magneto: lg('Instalar el magnetómetro', 'Install the magnetometer'), muestra: lg('Tomar muestras', 'Take samples') };
  miMsg('a1', lg(`Llegué a ${miEsc(P.codigo)} · ${miEsc(P.nombre)}.`, `I'm at ${miEsc(P.codigo)} · ${miEsc(P.nombre)}.`));
  const seguir = () => { $('cajon').classList.remove('mi-libre'); if (window.cerrarCajon) cerrarCajon(); miJugar(true); };
  const hacer = () => {
    const t0 = performance.now(), dur = 4500, h = PMR_TAREA[P.tarea] || 0.5;
    const paso = () => { if (MI.modo !== m) return; const f = Math.min(1, (performance.now() - t0) / dur);
      $('miCtxt').textContent = P.tarea === 'perf' ? lg(`Profundidad: ${miNum(2 * f, 2)} m de 2 m · barra ${Math.min(5, Math.floor(f * 5) + 1)} de 5`, `Depth: ${miNum(2 * f, 2)} m of 2 m · rod ${Math.min(5, Math.floor(f * 5) + 1)} of 5`)
        : P.tarea === 'muestra' ? lg(`Muestras guardadas: ${Math.floor(f * 4)} de 4`, `Samples stored: ${Math.floor(f * 4)} of 4`) : lg(`Instalando: ${miNum(f * 100)} %`, `Installing: ${miNum(f * 100)} %`);
      if (f < 1) return requestAnimationFrame(paso);
      miMsg('a1', P.tarea === 'perf' ? lg('Listo: testigo de 2 m en cinco tramos, guardado.', 'Done: 2 m core in five sections, stored.') : P.tarea === 'muestra' ? lg('Muestras tomadas junto a Curiosity.', 'Samples taken next to Curiosity.') : lg('Instrumento instalado y nivelado. Transmite a la base.', 'Instrument installed and levelled. Transmitting to the base.'));
      miMsg('base', lg(`Recibido. En la realidad esto lleva unos ${miNum(h * 60)} min (supuesto); ya está sumado al tiempo afuera.`, `Copy. In reality this takes about ${miNum(h * 60)} min (assumption); it is already added to the time outside.`));
      miCard(lg('Trabajo en la parada', 'Work at the stop'), `<span class="mi-pill" style="background:${P.color}">${miEsc(P.codigo)}</span>${miEsc(P.nombre)}`, lg('Listo. Vuelve al PMR por el mismo camino.', 'Done. Heading back to the PMR the same way.'), [[lg('Volver al PMR ▶', 'Back to the PMR ▶'), seguir, true]]); };
    miCard(lg('Trabajo en la parada · simulación', 'Work at the stop · simulation'), TXT[P.tarea] || '', '…', []); paso();
  };
  miCard(lg('El Astronauta 1 llegó a la parada', 'Astronaut 1 reached the stop'), `<span class="mi-pill" style="background:${P.color}">${miEsc(P.codigo)}</span>${miEsc(P.nombre)}`, PMR_HACER()[P.tarea] || '',
    [[TXT[P.tarea] || lg('Trabajar', 'Work'), hacer, true], [lg('Ver la parada', 'See the stop'), () => { pmrFichaParada(G.paradas.indexOf(P)); $('cajon').classList.add('mi-libre'); }], [lg('Volver al PMR ▶', 'Back to the PMR ▶'), seguir]]);
}
function pmrFinTramo(m) {
  const G = PMR.guia, T = G.tramos[G.i], sig = G.tramos[G.i + 1], L = T.L, q = enLinea(L, L.largo);
  if (T.tipo === 'caminata') { miMsg('a1', lg('De vuelta en el PMR. Entro por el suitport.', 'Back at the PMR. Coming in through the suitport.')); miMsg('base', lg(`Salida cerrada: ${miH(L.horas)}, ${miNum(L.dosis, 1)} µSv.`, `EVA closed: ${miH(L.horas)}, ${miNum(L.dosis, 1)} µSv.`)); }
  else { const P = T.parada; miMsg('a2', P ? lg(`Estacionados a ${PMR_ESTAC} m de ${miEsc(P.nombre)}.`, `Parked ${PMR_ESTAC} m from ${miEsc(P.nombre)}.`) : lg('En el garaje de la Base Gale. Expedición cumplida.', 'In the Gale Base garage. Expedition complete.')); }
  if (!sig) {
    MI.pmrFuera = T.tipo === 'regreso' ? null : pmrPosFinal(T);
    return miCard(lg('Expedición terminada', 'Expedition complete'), G.volver ? lg('De vuelta en el hábitat', 'Back in the habitat') : miEsc(T.titulo),
      lg(`${miM(G.km)} en el PMR y ${miM(G.kmPie)} a pie, ${miH(G.horas)} en total, ${miNum(G.dosis)} µSv por persona y ${miNum(G.kwh / miBat() * 100)} % de la batería (cálculo propio).`, `${miM(G.km)} in the PMR and ${miM(G.kmPie)} on foot, ${miH(G.horas)} in total, ${miNum(G.dosis)} µSv per person and ${miNum(G.kwh / miBat() * 100)} % of the battery (our calculation).`),
      [[lg('Volver a Curiosity hoy', 'Back to Curiosity today'), () => miSalirModo(true), true], [lg('Ver los tramos', 'See the legs'), () => { pmrFichaTramos(); $('cajon').classList.add('mi-libre'); }]]);
  }
  const ir = () => pmrTramo(G.i + 1);
  if (sig.tipo === 'caminata') miCard(lg('Llegaron a la parada', 'They reached the stop'), `<span class="mi-pill" style="background:${sig.parada.color}">${miEsc(sig.parada.codigo)}</span>${miEsc(sig.parada.nombre)}`,
    lg(`El PMR queda estacionado a ${PMR_ESTAC} m. El Astronauta 1 se pone el traje por el suitport (menos de 10 min) y el 2 queda en la cabina.`, `The PMR parks ${PMR_ESTAC} m away. Astronaut 1 suits up through the suitport (under 10 min) and Astronaut 2 stays in the cabin.`) + miFq('suitport'),
    [[lg('Salir a caminar ▶', 'Go for the walk ▶'), ir, true], [lg('Dejar la guía', 'Leave the guide'), () => miSalirModo(true)]]);
  else miCard(lg('De vuelta en el PMR', 'Back in the PMR'), miEsc(sig.titulo), lg(`Siguiente tramo: ${miM(sig.L.largo)}, ${miH(sig.L.horas)} de manejo.`, `Next leg: ${miM(sig.L.largo)}, ${miH(sig.L.horas)} of driving.`),
    [[lg('Seguir manejando ▶', 'Keep driving ▶'), ir, true], [lg('Dejar la guía', 'Leave the guide'), () => miSalirModo(true)]]);
}
function pmrPosFinal(T) { const L = T.L; if (T.tipo === 'caminata') return L.pmr; const q = enLinea(L, L.largo), qa = enLinea(L, Math.max(0, L.largo - 6)); return { lon: q.lon, lat: q.lat, rumbo: rumboDe(qa, q), elev: q.elev }; }
// si se deja la guía a mitad de camino, el PMR queda donde estaba (y en la base si llegó a la base)
function pmrGuiaDejar(m) {
  const G = PMR.guia, T = G?.tramos[G.i]; if (!T) return;
  const p = T.tipo === 'caminata' ? T.L.pmr : m.pmrEn || pmrPosFinal(T), g = MI.D.pmr;
  MI.pmrFuera = p && miDist(p.lon, p.lat, g.lon, g.lat) > 30 ? p : null;
}
function pmrVistaFinal() { if (MI.pmrFuera) { miQuieto(true); miVerPMR(); } else miVista(2); }

// ---------- manejo libre ----------
async function pmrLibre() {
  if (!MI.activo) await miEntrar(false); if (!(await miCargar())) return;
  try { await pmrTerreno(); } catch { return; }
  if (MI.modo) miSalirModo(false);
  miPMRGuardar(); MI.g3.alasObj = 0; MI.g3.cangObj = 0; miTrajes(2);
  const ini = pmrInicio(), s = pmrMuestra(ini.lon, ini.lat);
  MI.modo = { libre: true, tipo: 'libre', rover: true, trip: true, pant: true, hud: false, vista: 'detras', L: null, d: 0, lon: ini.lon, lat: ini.lat, rumbo: ini.rumbo, v: 0, odo: 0, t: 0, dosis: 0, kwh: 0, rueda: 0,
    teclas: {}, vistos: new Set(), rastro: [[ini.lon, ini.lat]], q: { lon: ini.lon, lat: ini.lat, elev: s.z, marcha: 0, terr: s.p, cielo: s.ci, t: 0, dosis: 0, kwh: 0, terreno: 0, min: -1 } };
  MI.siguiendo = true; if (window.cerrarCajon) cerrarCajon();
  const cl = document.body.classList; cl.add('mi-modo', 'mi-pant', 'mi-manejo');
  viewer.scene.screenSpaceCameraController.enableInputs = false;
  miMostrar('miBarra', false);
  for (const k of ['curiosity', 'gx2', 'astronauta', 'a2']) if (MI.mod[k]) MI.mod[k].show = false;
  $('miPid').textContent = 'P'; $('miPid').style.background = PMR_COL.manejo;
  $('miPnomR').textContent = lg('PMR · manejo libre', 'PMR · free drive'); $('miPsub').textContent = lg('W A S D o flechas · Shift ×10', 'W A S D or arrows · Shift ×10');
  $('miL1').textContent = lg('velocidad', 'speed'); $('miL2').textContent = lg('recorrido', 'distance'); $('miL3').textContent = lg('pendiente', 'slope'); $('miL4').textContent = lg('batería', 'battery');
  $('miVistas').classList.remove('oculto'); $('miVistas').querySelector('[data-v=ojos]').textContent = lg('Cabina', 'Cabin');
  document.querySelectorAll('#miVistas [data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'detras'));
  MI.cam = { h: ini.rumbo, p: -0.42, r: 24 };
  let ls = 0; try { ls = lsMarte(new Date()).ls; } catch {} MI.par = { demora: demoraLuz(new Date()), ls, ultMapa: 0 }; $('miMsgs').innerHTML = '';
  $('miPantalla').classList.remove('oculto'); $('miHud').classList.add('oculto'); $('miPQuien').textContent = lg('A1 y A2 · cabina', 'A1 and A2 · cabin');
  $('miDemora').innerHTML = `${lg('Tierra↔Marte', 'Earth↔Mars')} ${miNum(MI.par.demora)} min ${miFq('jplApprox')}`;
  miMostrar('miPlay', true);
  miMsg('base', lg(`Manejo libre autorizado. Pendiente máxima ${MI.D.parametros.PR.rMax}°; avisamos la arena probable.`, `Free drive authorized. Max slope ${MI.D.parametros.PR.rMax}°; we will flag probable sand.`));
  miCard(lg('PMR · manejo libre', 'PMR · free drive'), lg('Lo manejás vos', 'You drive it'), lg('W o ↑ adelante, S o ↓ atrás, A D o ← → para girar (las 12 ruedas giran en el lugar), Shift para ir ×10. No pasa pendientes de más de 20° y va más despacio en la arena. Esc para salir.', 'W or ↑ forward, S or ↓ back, A D or ← → to turn (all 12 wheels steer, it can turn in place), Shift for ×10. It will not take slopes over 20° and slows down on sand. Esc to exit.'),
    [[lg('Entendido', 'Got it'), () => miCard(), true]]);
}
function pmrLibreTick(dt) {
  const m = MI.modo, k = m.teclas, PR = MI.D.parametros.PR, rap = k.shift || k.rap ? 10 : 1;
  const ade = k.w || k.arrowup || k.ade ? 1 : k.s || k.arrowdown || k.atr ? -0.4 : 0, giro = (k.d || k.arrowright || k.der ? 1 : 0) - (k.a || k.arrowleft || k.izq ? 1 : 0);
  const aqui = pmrMuestra(m.lon, m.lat), vmax = miVPMR() / 3600 * rap * (aqui.ar ? 0.5 : 1);
  m.v += (ade * vmax - m.v) * Math.min(1, dt * 1.8);
  m.rumbo += giro * dt * 0.6;
  const paso = m.v * dt; let [lo, la] = corrido(m.lon, m.lat, Math.sin(m.rumbo) * paso, Math.cos(m.rumbo) * paso);
  if (Math.abs(paso) > 1e-4) {
    const [lo2, la2] = corrido(m.lon, m.lat, Math.sin(m.rumbo) * 6 * Math.sign(paso), Math.cos(m.rumbo) * 6 * Math.sign(paso)), adelante = pmrMuestra(lo2, la2);
    const marcha = Math.abs(Math.atan((adelante.z - aqui.z) / 6)) / d2r;
    if (!pmrDentro(lo2, la2)) { m.v = 0; lo = m.lon; la = m.lat; if (!m.vistos.has('borde')) { m.vistos.add('borde'); miMsg('base', lg('Fin del terreno cargado: más allá no hay datos de 12 m.', 'End of the loaded terrain: no 12 m data beyond here.'), 'alerta'); } }
    else if (adelante.p > PR.rMax && marcha > PR.rMax * 0.6) { m.v = 0; lo = m.lon; la = m.lat; const c = 'pend' + Math.round(lo2 * 2e4) + Math.round(la2 * 2e4);
      if (!m.vistos.has(c)) { m.vistos.add(c); miMsg('a2', lg(`Pendiente de ${miNum(adelante.p)}° adelante: el PMR no pasa (límite ${PR.rMax}°). Busco otro camino.`, `Slope of ${miNum(adelante.p)}° ahead: the PMR cannot pass (limit ${PR.rMax}°). Looking for another way.`), 'alerta'); } }
    else { const dz = pmrMuestra(lo, la).z - aqui.z, dl = Math.abs(paso); m.odo += dl; m.kwh += MI.eKm * dl / 1000 + MI.eM * Math.max(0, dz); m.rueda = (m.rueda || 0) + paso;
      if (aqui.ar && !m.vistos.has('arena' + Math.round(m.odo / 200))) { m.vistos.add('arena' + Math.round(m.odo / 200)); miMsg('a2', lg('Arena probable: bajo a la mitad de velocidad.', 'Probable sand: down to half speed.')); }
      const r = m.rastro[m.rastro.length - 1]; if (miDist(r[0], r[1], lo, la) > 8) m.rastro.push([lo, la]); if (m.rastro.length > 2000) m.rastro.shift(); }
  }
  const P = MI.D.pmr?.par || {}, dth = dt * rap / 3600; m.t += dth; m.kwh += (P.potencia_cabina_kW ?? 1.85) * dth; m.dosis += PR.dosis * 1000 / 24 * (1 - PR.k * aqui.ci) * dth;
  m.lon = lo; m.lat = la; const s = pmrMuestra(lo, la);
  m.q = { lon: lo, lat: la, elev: s.z, marcha: m.v ? Math.abs(Math.atan((pmrMuestra(...corrido(lo, la, Math.sin(m.rumbo) * 4, Math.cos(m.rumbo) * 4)).z - s.z) / 4)) / d2r : 0, terr: s.p, cielo: s.ci, t: m.t, dosis: m.dosis, kwh: m.kwh, terreno: s.ar ? -2 : 0, min: -1 };
  const rv = MI.mod.pmr; let objetivo = null;
  if (rv) { rv.show = true; objetivo = colocar(rv, lo, la, m.rumbo, s.z, 4.0, 3.2, true); m.pmrEn = { lon: lo, lat: la, rumbo: m.rumbo, elev: s.z };
    if (rv.ready) for (let i = 0; i < 12; i++) girarNodo(rv, `rueda_${i}`, -m.rueda / 0.5); }
  if (objetivo) miCamara(dt, objetivo, m.rumbo, m);
  const bat = 100 - m.kwh / miBat() * 100;
  $('miD1').textContent = `${miNum(Math.abs(m.v) * 3.6, 1)} km/h`; $('miD2').textContent = miM(m.odo);
  $('miD3').textContent = `${miNum(m.q.marcha, 1)}°`; $('miC3').classList.toggle('alerta', s.p > PR.rMax); $('miD4').textContent = `${miNum(bat)} %`;
  pmrPantLibre(m.q, bat);
}
function pmrPantLibre(q, bat) {
  const m = MI.modo, b = MI.D.base, dB = miDist(q.lon, q.lat, b.lon, b.lat), celda = (val, et, al = false) => `<div class="${al ? 'alerta' : ''}"><b>${val}</b><span>${et}</span></div>`;
  $('miPTramo').innerHTML = `<b>${lg('Manejo libre', 'Free drive')}</b><div class="sub">${lg('El PMR es el refugio: la dosis adentro es casi la misma que afuera; para una tormenta solar, volver al hábitat.', 'The PMR is the shelter: the dose inside is almost the same as outside; for a solar storm, return to the habitat.')}</div>`;
  $('miPRej').innerHTML = celda(`${miNum(q.terr, 1)}°`, lg('pendiente', 'slope'), q.terr > MI.D.parametros.PR.rMax) + celda(`${miNum(q.dosis, 1)} µSv`, lg('dosis acumulada', 'accumulated dose'))
    + celda(`${miNum(dB / miVPMR() * 60)} min`, lg(`al hábitat · ${miM(dB)}`, `to habitat · ${miM(dB)}`)) + celda(`${miNum(bat)} %`, lg('batería', 'battery'), bat < 30)
    + celda(q.terreno === -2 ? lg('arena', 'sand') : lg('firme', 'firm'), lg('suelo', 'ground'), q.terreno === -2) + celda(miT(q.t), lg('reloj de la misión', 'mission clock'));
  // la perforación más cercana (a menos de 1,5 km): motivo científico para ir
  const cerca = (typeof POZOS !== 'undefined' ? POZOS : []).filter(p => p.n != null).map(p => [miDist(q.lon, q.lat, p.lon, p.lat), p]).sort((a, b) => a[0] - b[0])[0];
  const mot = cerca && cerca[0] < 1500 ? `<b>${cerca[1].n} · ${miEsc(cerca[1].nombre)}</b> ${lg('a', '')} ${miM(cerca[0])}${lg('', ' away')}. ${miEsc(miTr(cerca[1].hallazgo || ''))}` : '';
  const pm = $('miPMot'); pm.classList.toggle('oculto', !mot); if (pm._t !== mot) { pm._t = mot; pm.innerHTML = `<span class="motT">${lg('Perforación cerca', 'Drill hole nearby')}</span> ${mot}`; }
  if (performance.now() - MI.par.ultMapa > 300) { MI.par.ultMapa = performance.now(); pmrMapaLibre(q); }
}
function pmrMapaLibre(q) {
  const m = MI.modo, cv = $('miMapa'), g = cv.getContext('2d'), W = cv.width, H = cv.height, r = 1200 / M_GRADO, cl = Math.cos(q.lat * d2r);
  const x0 = q.lon - r / cl * W / H, x1 = q.lon + r / cl * W / H, y0 = q.lat - r, y1 = q.lat + r, X = x => (x - x0) / (x1 - x0) * W, Y = y => (y1 - y) / (y1 - y0) * H;
  g.clearRect(0, 0, W, H); pmrFondo(g, W, H, x0, x1, y0, y1, null);
  g.strokeStyle = PMR_COL.manejo; g.lineWidth = 4; g.lineJoin = g.lineCap = 'round'; g.beginPath(); m.rastro.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.lineTo(X(q.lon), Y(q.lat)); g.stroke();
  g.font = '700 17px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chip = (x, y, t, col, rr = 12) => { if (x < x0 || x > x1 || y < y0 || y > y1) return; g.fillStyle = col; g.strokeStyle = '#1b1210'; g.lineWidth = 3; g.beginPath(); g.arc(X(x), Y(y), rr, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillText(t, X(x), Y(y) + 1); };
  for (const p of (typeof POZOS !== 'undefined' ? POZOS : [])) if (p.n != null) chip(p.lon, p.lat, String(p.n), '#c0392b', 11);
  const b = MI.D.base; chip(b.lon, b.lat, 'BG', '#ffcf7a', 14);
  // el PMR con una flecha hacia donde mira
  const px = X(q.lon), py = Y(q.lat); g.save(); g.translate(px, py); g.rotate(m.rumbo); g.fillStyle = PMR_COL.manejo; g.strokeStyle = '#1b1210'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -17); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
}
// relieve de fondo del minimapa: pendiente en grises, arena probable en ocre, lo que el PMR no pasa en rojo apagado
function pmrFondo(g, W, H, x0, x1, y0, y1, clave) {
  const T = PMR.T; if (!T) return;
  const s = 4, w = Math.ceil(W / s), h = Math.ceil(H / s), k = `${clave}`;
  let c = clave && PMR._fondos?.[k];
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h), lim = MI.D.parametros.PR.rMax;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const lon = x0 + (i + 0.5) / w * (x1 - x0), lat = y1 - (j + 0.5) / h * (y1 - y0), o = (j * w + i) * 4;
      if (!pmrDentro(lon, lat)) { im.data[o + 3] = 0; continue; } const [cc, ff] = pmrCelda(lon, lat), q = ff * T.W + cc, p = T.p[q], v = Math.min(1, p / 30);
      if (p > lim) { im.data[o] = 120; im.data[o + 1] = 52; im.data[o + 2] = 48; } else if (T.ar[q]) { im.data[o] = 96; im.data[o + 1] = 78; im.data[o + 2] = 50; } else { const gr = 24 + v * 70; im.data[o] = gr; im.data[o + 1] = gr + 2; im.data[o + 2] = gr + 6; }
      im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0); if (clave) (PMR._fondos ||= {})[k] = c; }
  g.imageSmoothingEnabled = true; g.globalAlpha = 0.75; g.drawImage(c, 0, 0, W, H); g.globalAlpha = 1;
}
function pmrLibreFin() { const m = MI.modo, g = MI.D.pmr; if (m?.pmrEn) MI.pmrFuera = miDist(m.pmrEn.lon, m.pmrEn.lat, g.lon, g.lat) > 30 ? m.pmrEn : null; }
// teclado y botones del manejo libre
{
  const K = { w: 'w', a: 'a', s: 's', d: 'd', arrowup: 'arrowup', arrowdown: 'arrowdown', arrowleft: 'arrowleft', arrowright: 'arrowright' };
  const tecla = (e, on) => { const m = MI.modo; if (!m?.libre) return; const t = e.key.toLowerCase(); m.teclas.shift = e.shiftKey;
    if (K[t]) { m.teclas[K[t]] = on; e.preventDefault(); } };
  addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return; tecla(e, true); });
  addEventListener('keyup', e => tecla(e, false));
  addEventListener('blur', () => { if (MI.modo?.libre) MI.modo.teclas = {}; });
  document.querySelectorAll('#miPad [data-k]').forEach(b => {
    const k = b.dataset.k;
    if (k === 'rap') return b.onclick = () => { const m = MI.modo; if (!m?.libre) return; m.teclas.rap = !m.teclas.rap; b.classList.toggle('on', m.teclas.rap); };
    const on = v => e => { const m = MI.modo; if (!m?.libre) return; e.preventDefault(); m.teclas[k] = v; b.classList.toggle('on', v); };
    b.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, on(false));
  });
}

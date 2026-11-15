// ==================== Expedición: rutas para astronauta + rover presurizado (círculo de 20 km) ====================
// Relieve: capas/expedicion/ (zona_expedicion.py, DEM USGS de 1 m a 5 m, grilla de 20 m). Reglas: data/parametros.json.
// Cada número lleva su etiqueta: medido (dato), cálculo propio o supuesto (provisorio).
const EXP = {
  // ---- parámetros (copiados de data/parametros.json del repo; ahí está cada fuente) ----
  P: {
    pendAstro: 20,        // ° · requisito lunar Artemis (NTRS 20210026296) · supuesto: a validar para Marte
    vLlano: 2.5,          // km/h a pie en llano · supuesto del equipo; Tobler (terrestre) para la pendiente
    pendRover: 20,        // ° · Curiosity (blog: 99% de posiciones bajo 17,4°) y Apollo LRV 20–23° (NTRS 20250011301)
    evitarFrio: true,     // el rover evita el 10% más frío de noche (THEMIS): Curiosity nunca anduvo ahí · calibrado con su recorrido real
    escalonRover: 6,      // máx. tramos de 5 m (de 16) sobre 20° por celda · calibrado: el 99% de las celdas que pisó Curiosity cumple
    vRover: 3,            // km/h rover presurizado · NASA DRA 5.0 (SP-2009-566, p. 43): 3 km/h de diseño en Marte · se puede pasar a 10 (SEV lunar)
    vRoverOpciones: { 3: 'NASA DRA 5.0 · Marte (3 km/h de diseño)', 10: 'NASA SEV · Luna (10 km/h)' },
    vCuriosity: 100,      // m/h de manejo de Curiosity · dato (blog)
    solCuriosity: [30, 60], // m por sol de manejo · dato (blog)
    dosisDia: 0.64,       // mSv/día en la superficie de Gale · medido (RAD, Hassler et al. 2014)
    blindaje: 0.25,       // reducción = 0,25 × fracción de cielo tapado · cálculo propio calibrado con Murray Buttes
    refugioMin: 30,       // min máximos a pie hasta el refugio (el rover) · supuesto del equipo (Helio2050)
    evaNom: 6, evaMax: 8, // h de salida · traje xEMU (EVA-EXP-0075) · lunar: a validar
    esclusaMin: 10,       // min para ponerse el traje y salir por el suitport · NASA SEV FS-2011-08-045-JSC
    muestraMin: 30,       // min trabajando en cada muestra · supuesto (se cambia en el panel)
    carrera: 600,         // mSv · NASA-STD-3001 [V1 4030]
    metabEVA: 1200,       // BTU/h promedio para dimensionar una salida en Marte · NASA ICES-2026 (Ogilvie et al., NTRS 20260003038)
    metabCaminata: 1700,  // BTU/h caminando con traje a 3,6 km/h en gravedad de Marte (tripulante promedio) · misma fuente
    vCaminataMax: 3.6,    // km/h: cerca del límite sostenible en Marte · misma fuente (estudio de 10 km de Norcross et al. 2009)
    tormenta: 8.1,        // mGy en el evento del 20/5/2024 a cielo abierto junto a Curiosity · medido (RAD, NASA 10/6/2024)
    casco: 1,             // g/cm² típicos de la cabina presurizada de un rover · NASA (Kim et al., WRMISS 2012): no es refugio
    refugioSPE: 20,       // g/cm² de blindaje sugerido para un refugio de tormenta · NASA (Clowdsley, NTRS 20210009760)
    altAstro: 2, altRover: 3, // m de las antenas (casco/mochila y mástil) para la línea de vista · supuesto
    horaSalida: 9,        // hora solar local (LMST) de la primera salida · se elige en el panel
    estacion: 'otoño',
  },
  G: null, carga: null, worker: null, ents: [], capa: null, modo: null,
  base: null, muestras: [], res: null, sim: null,
};

const RM = 3396190;   // radio de Marte (m), convención del repo
function latCentrica(latg) { return Math.atan(Math.tan(latg * Math.PI / 180) * (B * B) / (A * A)) * 180 / Math.PI; }

async function expCargar() {
  if (EXP.G) return EXP.G;
  if (EXP.carga) return EXP.carga;
  EXP.carga = (async () => {
    if (!location.protocol.startsWith('http')) throw new Error('Abrí Gale Earth con abrir.bat (o desde la página publicada) para usar la expedición.');
    const meta = await (await fetch('capas/expedicion/meta.json')).json();
    const leer = async n => {
      const r = await fetch('capas/expedicion/' + n); if (!r.ok) throw new Error('falta capas/expedicion/' + n);
      let b = new Uint8Array(await r.arrayBuffer());
      if (b[0] === 0x1f && b[1] === 0x8b) b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      return b.buffer;
    };
    const [elev, pend, empin, cielo] = await Promise.all(['elev_i16.bin.gz', 'pend_u8.bin.gz', 'empin_u8.bin.gz', 'cielo_u8.bin.gz'].map(leer));
    let noche; try { noche = new Uint8Array(await leer('noche_pct_u8.bin.gz')); } catch { noche = new Uint8Array(meta.ancho * meta.alto).fill(255); }
    const G = { meta, W: meta.ancho, H: meta.alto, elev: new Int16Array(elev), pend: new Uint8Array(pend), empin: new Uint8Array(empin), cielo: new Uint8Array(cielo), noche };
    G.dxm = meta.grados_lon * Math.PI / 180 * RM * Math.cos(meta.centro.lat * Math.PI / 180);
    G.dym = meta.grados_lat * Math.PI / 180 * RM;
    EXP.G = G;
    EXP.worker = new Worker(URL.createObjectURL(new Blob([`(${expTrabajador.toString()})()`], { type: 'text/javascript' })));
    EXP.worker.postMessage({ tipo: 'grilla', W: G.W, H: G.H, dxm: G.dxm, dym: G.dym, elev: G.elev.slice(), pend: G.pend.slice(), empin: G.empin.slice(), noche: G.noche.slice(), cielo: G.cielo.slice(), P: EXP.P });
    return G;
  })();
  try { return await EXP.carga; } catch (e) { EXP.carga = null; throw e; }
}
const expCelda = (lon, latc) => { const m = EXP.G.meta; return [Math.floor((m.lat_norte - latc) / m.grados_lat), Math.floor((lon - m.lon_oeste) / m.grados_lon)]; };
const expLonLat = i => { const m = EXP.G.meta, W = EXP.G.W, f = Math.floor(i / W), c = i % W; return [m.lon_oeste + (c + .5) * m.grados_lon, m.lat_norte - (f + .5) * m.grados_lat]; };
function expDist(lon, latc) { const c = EXP.G.meta.centro; return Math.hypot((lon - c.lon) * Math.PI / 180 * RM * Math.cos(c.lat * Math.PI / 180), (latc - c.lat) * Math.PI / 180 * RM); }
function expPunto(lon, latc) {   // qué hay en ese lugar según la grilla
  const G = EXP.G, [f, c] = expCelda(lon, latc);
  if (f < 0 || c < 0 || f >= G.H || c >= G.W) return null;
  const i = f * G.W + c, p = G.pend[i];
  return { i, sinDato: p === 255, fuera: expDist(lon, latc) > G.meta.radio_km * 1000, pend: p / 4, empin: G.empin[i], cielo: G.cielo[i] / 255, elev: G.elev[i] };
}

// ---------- capa de pendientes + círculo ----------
function expDibujarZona() {
  if (EXP.capa) return;
  const G = EXP.G, m = G.meta, cv = document.createElement('canvas'); cv.width = G.W; cv.height = G.H;
  const cx = cv.getContext('2d'), im = cx.createImageData(G.W, G.H), d = im.data;
  for (let i = 0; i < G.W * G.H; i++) {
    const p = G.pend[i]; let c = null;
    if (p === 255) { const f = Math.floor(i / G.W), k = i % G.W, [lo, la] = expLonLat(i); if (expDist(lo, la) <= m.radio_km * 1000 && ((f + k) % 8 < 2)) c = [150, 150, 150, 150]; }
    else if (p > 100) c = [200, 30, 30, 190];        // > 25°
    else if (p > 80) c = [235, 110, 40, 170];        // 20–25°
    else if (p > 60) c = [240, 200, 60, 120];        // 15–20°
    if (c) d.set(c, i * 4);
  }
  cx.putImageData(im, 0, 0);
  const rect = C.Rectangle.fromDegrees(m.lon_oeste, geodetica(m.lat_norte - G.H * m.grados_lat), m.lon_oeste + G.W * m.grados_lon, geodetica(m.lat_norte));
  const capas = capasImagen();
  if (capas) C.SingleTileImageryProvider.fromUrl(cv.toDataURL('image/png'), { rectangle: rect, tileWidth: G.W, tileHeight: G.H }).then(pr => { EXP.capa = capas.addImageryProvider(pr); EXP.capa.alpha = 0.6; });
  const c = m.centro, pts = [];
  for (let k = 0; k <= 256; k++) { const a = k / 256 * 2 * Math.PI, r = m.radio_km * 1000;
    pts.push(pos(c.lon + Math.sin(a) * r / (RM * Math.cos(c.lat * Math.PI / 180)) * 180 / Math.PI, c.lat + Math.cos(a) * r / RM * 180 / Math.PI)); }
  EXP.circulo = viewer.entities.add({ polyline: { positions: pts, width: 3, clampToGround: true, material: new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString('#f28c38'), dashLength: 18 }) } });
}
function expCapaThemis(ver) {
  const t = EXP.G.meta.themis_noche; if (!t) return avisar('Falta la capa THEMIS (herramientas/themis_noche.py).');
  if (EXP.capaTh) { EXP.capaTh.show = ver; return; }
  if (!ver) return;
  const rect = C.Rectangle.fromDegrees(t.lon_oeste, geodetica(t.lat_sur), t.lon_este, geodetica(t.lat_norte)), capas = capasImagen();
  if (capas) C.SingleTileImageryProvider.fromUrl('capas/expedicion/' + t.archivo, { rectangle: rect, tileWidth: t.ancho, tileHeight: t.alto })
    .then(pr => { EXP.capaTh = capas.addImageryProvider(pr); EXP.capaTh.alpha = 0.75; EXP.capaTh.show = $('expTh') ? $('expTh').checked : true; });
}
function expMostrarZona(v) { if (!v && EXP.capaTh) EXP.capaTh.show = false; if (EXP.capa) EXP.capa.show = v; if (EXP.circulo) EXP.circulo.show = v; }

// ---------- elegir en el mapa ----------
function expTocar(m) {
  if (!EXP.modo || pestaña !== 'expedicion') return;
  const r = viewer.camera.getPickRay(m.position); let p = null;
  if (r) p = MODO === 'globo' ? viewer.scene.globe.pick(r, viewer.scene) : (viewer.scene.pickPositionSupported ? viewer.scene.pickPosition(m.position) : null);
  if (!p) return;
  const cg = C.Cartographic.fromCartesian(p, MARS), lon = C.Math.toDegrees(cg.longitude), latc = latCentrica(C.Math.toDegrees(cg.latitude));
  expAgregar(EXP.modo, lon, latc, null);
}
{ const h = new C.ScreenSpaceEventHandler(viewer.scene.canvas); h.setInputAction(m => { if (EXP.modo) expTocar(m); }, C.ScreenSpaceEventType.LEFT_CLICK); }

function expAgregar(tipo, lon, latc, nombre) {
  const q = expPunto(lon, latc);
  if (!q || q.fuera) return avisar('Ese punto está fuera del círculo de 20 km alrededor de Curiosity.');
  if (q.sinDato) return avisar('Ahí no hay DEM de 1 m del USGS (zona rayada): no se puede calcular una ruta segura.');
  const lim = tipo === 'base' ? EXP.P.pendRover : EXP.P.pendAstro;
  if (q.pend > lim) avisar(`Ojo: la pendiente media ahí es ${fmt(q.pend, 1)}°, sobre el límite de ${lim}°. Se buscará el punto transitable más cercano.`);
  const p = { lon, lat: latc, nombre: nombre || (tipo === 'base' ? 'Inicio' : `Muestra ${EXP.muestras.length + 1}`), q };
  if (tipo === 'base') EXP.base = p; else EXP.muestras.push(p);
  EXP.modo = null; EXP.res = null; expPintarPuntos(); vistaExpedicion();
}
function expPintarPuntos() {
  for (const e of EXP.ents) viewer.entities.remove(e); EXP.ents = [];
  const pin = (p, txt, col) => EXP.ents.push(viewer.entities.add({ position: pos(p.lon, p.lat), billboard: { image: icono(txt, col, 26, '#fff'), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: p.nombre, font: '600 12px system-ui', pixelOffset: new C.Cartesian2(16, 0), horizontalOrigin: C.HorizontalOrigin.LEFT, outlineWidth: 4, style: C.LabelStyle.FILL_AND_OUTLINE, outlineColor: C.Color.BLACK, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } }));
  if (EXP.base) pin(EXP.base, '⌂', '#4FA3D9');
  EXP.muestras.forEach((m, k) => pin(m, String(k + 1), '#ffd166'));
  const r = EXP.res; if (!r || !r.ok) return;
  for (const t of r.tramos) {
    const col = t.tipo === 'rover' ? '#4FA3D9' : t.tipo === 'ida' ? '#ffd166' : '#ff9f43';
    EXP.ents.push(viewer.entities.add({ polyline: { positions: t.pts.map(q => pos(q[0], q[1])), width: t.tipo === 'rover' ? 5 : 4, clampToGround: true, classificationType: C.ClassificationType.BOTH,
      material: t.tipo === 'vuelta' ? new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString(col), dashLength: 12 }) : C.Color.fromCssColorString(col) } }));
    if (t.tipo === 'rover' && t.fin) EXP.ents.push(viewer.entities.add({ position: pos(t.fin[0], t.fin[1]), billboard: { image: icono('R', '#4FA3D9', 20, '#fff'), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } }));
  }
}

// ---------- cálculo (en el trabajador) ----------
function expCalcular() {
  if (!EXP.base || !EXP.muestras.length) return avisar('Elegí un inicio y al menos una muestra.');
  const idx = p => { const [f, c] = expCelda(p.lon, p.lat); return f * EXP.G.W + c; };
  // orden: vecino más cercano en línea recta desde el inicio (simple y declarado)
  const pend = [...EXP.muestras], orden = []; let cur = EXP.base;
  while (pend.length) { let k = 0, best = 1e18; pend.forEach((m, j) => { const d = Math.hypot((m.lon - cur.lon) * Math.cos(cur.lat * Math.PI / 180), m.lat - cur.lat); if (d < best) { best = d; k = j; } }); cur = pend.splice(k, 1)[0]; orden.push(cur); }
  EXP.muestras = orden; expPintarPuntos();
  $('expRes').innerHTML = '<div class="sub">Calculando rutas sobre 4 millones de celdas de 20 m…</div>';
  const t0 = performance.now();
  EXP.worker.onmessage = e => { const r = EXP.res = e.data; r.ms = performance.now() - t0;
    if (r.ok) for (const t of r.tramos) { t.pts = t.celdas.map(q => expLonLat(q[0])); if (t.tipo === 'rover') t.fin = t.pts[t.pts.length - 1]; }
    if (pestaña === 'expedicion') expMostrarResultado(); else expPintarPuntos(); };
  EXP.baseCelda = idx(EXP.base);
  EXP.worker.postMessage({ tipo: 'plan', base: idx(EXP.base), muestras: EXP.muestras.map(idx), P: EXP.P });
}

// El trabajador corre aparte (no traba el globo). Dijkstra con montículo binario sobre la grilla de 20 m, 8 vecinos.
function expTrabajador() {
  let W, H, dxm, dym, elev, pend, empin, noche, cielo, P, N;
  const VEC = [];
  const montículo = () => { let k = new Float64Array(1 << 16), v = new Int32Array(1 << 16), n = 0;
    return { get n() { return n; }, push(key, val) { if (n === k.length) { const k2 = new Float64Array(n * 2), v2 = new Int32Array(n * 2); k2.set(k); v2.set(v); k = k2; v = v2; }
        let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; },
      pop() { const rk = k[0], rv = v[0]; n--; if (n > 0) { const lk = k[n], lv = v[n]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } this.k = rk; return rv; } }; };
  const tobler = s => P.vLlano * Math.exp(-3.5 * Math.abs(s + 0.05)) / Math.exp(-0.175);   // km/h
  const libre = (i, lim) => pend[i] !== 255 && pend[i] / 4 <= lim;
  // costo en horas de ir de a hasta b (vecinos); Infinity si no se puede
  const costoPie = (a, b, d) => { if (!libre(b, P.pendAstro)) return Infinity; const s = (elev[b] - elev[a]) / d; return d / 1000 / tobler(s); };
  // el rover además evita las celdas con muchos escalones de 5 m sobre 20° (calibrado con el recorrido real de Curiosity)
  const frio = i => noche[i] !== 255 && noche[i] > 90;   // el 10% más frío de noche en la zona (THEMIS)
  const libreRover = i => libre(i, P.pendRover) && empin[i] <= P.escalonRover && !(P.evitarFrio && frio(i));
  const costoRover = (a, b, d) => libreRover(b) ? d / 1000 / P.vRover : Infinity;
  function dijkstra(fuentes, costo, inverso, opciones = {}) {
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), h = montículo();
    for (const s of fuentes) { dist[s] = 0; h.push(0, s); }
    const lim = opciones.limite ?? Infinity;
    while (h.n) {
      const u = h.pop(), g = h.k; if (g > dist[u]) continue; if (g > lim) break;
      if (opciones.alSacar && opciones.alSacar(u, g)) break;
      const f = (u / W) | 0, c = u - f * W;
      for (const [df, dc, d] of VEC) {
        const ff = f + df, cc = c + dc; if (ff < 0 || cc < 0 || ff >= H || cc >= W) continue;
        const v = ff * W + cc, w = inverso ? costo(v, u, d) : costo(u, v, d); if (!(w < Infinity)) continue;
        const ng = g + w; if (ng < dist[v]) { dist[v] = ng; prev[v] = u; h.push(ng, v); }
      }
    }
    return { dist, prev };
  }
  const cadena = (prev, desde) => { const r = [desde]; let u = desde; while (prev[u] >= 0) { u = prev[u]; r.push(u); } return r; };
  // transitable más cercano (si el punto pedido cae en una pendiente fuera de límite)
  function cercano(i, lim, ok = j => libre(j, lim)) { if (ok(i)) return i; const f0 = (i / W) | 0, c0 = i % W;
    for (let r = 1; r < 60; r++) { let best = -1, bd = 1e9; for (let df = -r; df <= r; df++) for (let dc = -r; dc <= r; dc++) { if (Math.max(Math.abs(df), Math.abs(dc)) !== r) continue;
      const f = f0 + df, c = c0 + dc; if (f < 0 || c < 0 || f >= H || c >= W) continue; const j = f * W + c; if (ok(j)) { const dd = Math.hypot(df * dym, dc * dxm); if (dd < bd) { bd = dd; best = j; } } }
      if (best >= 0) return best; } return -1; }
  // recorre un camino de celdas y arma puntos con tiempo, pendiente y dosis acumulados
  function perfil(celdas, costo, t0, dosis0) {
    const out = []; let t = t0, dosis = dosis0;
    for (let k = 0; k < celdas.length; k++) {
      const i = celdas[k];
      if (k > 0) { const a = celdas[k - 1], df = ((i / W) | 0) - ((a / W) | 0), dc = (i % W) - (a % W), d = Math.hypot(df * dym, dc * dxm), dt = costo(a, i, d);
        t += dt; dosis += P.dosisDia / 24 * dt * (1 - P.blindaje * cielo[i] / 255); }
      out.push([i, t, dosis]);
    }
    return out;
  }
  // ¿hay línea de vista entre a y b? (relieve de 20 m + curvatura de Marte; antenas a P.altAstro y P.altRover m)
  function vista(a, b) {
    const fa = (a / W) | 0, ca = a % W, fb = (b / W) | 0, cb = b % W, n = Math.max(Math.abs(fb - fa), Math.abs(cb - ca));
    if (n < 2) return 1;
    const za = elev[a] + P.altAstro, zb = elev[b] + P.altRover, D = Math.hypot((fb - fa) * dym, (cb - ca) * dxm);
    for (let k = 1; k < n; k++) { const f = k / n, i = Math.round(fa + (fb - fa) * f) * W + Math.round(ca + (cb - ca) * f), z = elev[i];
      if (z === -32768) continue; const d1 = D * f, d2 = D - d1;
      if (z + d1 * d2 / (2 * 3396190) > za + (zb - za) * f) return 0; }
    return 1;
  }
  const largo = celdas => { let s = 0; for (let k = 1; k < celdas.length; k++) { const a = celdas[k - 1], i = celdas[k]; s += Math.hypot((((i / W) | 0) - ((a / W) | 0)) * dym, ((i % W) - (a % W)) * dxm); } return s; };
  onmessage = e => {
    const m = e.data;
    if (m.tipo === 'grilla') { ({ W, H, dxm, dym, elev, pend, empin, noche, cielo, P } = m); N = W * H;
      for (const [df, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) VEC.push([df, dc, Math.hypot(df * dym, dc * dxm)]); return; }
    if (m.tipo === 'refugio') {   // lugar con más cielo tapado a ≤ m.min minutos a pie
      const r = dijkstra([m.celda], costoPie, false, { limite: m.min / 60 }); let best = m.celda;
      for (let u = 0; u < N; u++) if (r.dist[u] < Infinity && cielo[u] !== 255 && cielo[u] > cielo[best]) best = u;
      postMessage({ tipo: 'refugio', celda: best, cielo: cielo[best] / 255, cieloAqui: cielo[m.celda] / 255, min: r.dist[best] * 60, camino: cadena(r.prev, best).reverse() });
      return; }
    if (m.tipo === 'tormenta') {
      const out = { tipo: 'tormenta', pieMin: 0, roverH: 0 };
      let desde = m.celda;
      if (m.rover != null && m.rover !== m.celda) { const r = dijkstra([m.celda], costoPie, false, { alSacar: u => u === m.rover }); out.pieMin = r.dist[m.rover] * 60; desde = m.rover; }
      const rb = dijkstra([desde], costoRover, false, { alSacar: u => u === m.base }); out.roverH = rb.dist[m.base];
      const rr = dijkstra([m.celda], costoPie, false, { limite: 10 / 60 }); let best = m.celda;
      for (let u = 0; u < N; u++) if (rr.dist[u] < Infinity && cielo[u] !== 255 && cielo[u] > cielo[best]) best = u;
      out.refugio = { celda: best, cielo: cielo[best] / 255, min: rr.dist[best] * 60 }; out.cieloAqui = cielo[m.celda] / 255;
      postMessage(out); return; }
    if (m.tipo !== 'plan') return;
    P = m.P;
    const lim = P.refugioMin / 60, tramos = [], paradas = [];
    let rover = cercano(m.base, P.pendRover, libreRover), t = 0, dosis = 0, dosisPie = 0, eva = 0;
    if (rover < 0) { postMessage({ ok: false, error: 'No hay terreno transitable para el rover cerca del inicio.' }); return; }
    const base = rover;
    for (let k = 0; k < m.muestras.length; k++) {
      const obj = cercano(m.muestras[k], P.pendAstro);
      if (obj < 0) { paradas.push({ k, ok: false, motivo: 'pendiente fuera de límite en todo el entorno' }); continue; }
      // tiempos a pie: ida (celda → muestra) y vuelta (muestra → celda), limitados por la regla del refugio
      const ida = dijkstra([obj], costoPie, true, { limite: lim * 1.6 });
      const vuelta = dijkstra([obj], costoPie, false, { limite: lim });
      let mejor = -1, mejorCosto = Infinity;
      const r = dijkstra([rover], costoRover, false, { alSacar: (u, g) => {
        if (g > mejorCosto) return true;
        const tv = vuelta.dist[u], ti = ida.dist[u];
        if (tv <= lim && ti < Infinity) { const c = g + ti + tv; if (c < mejorCosto) { mejorCosto = c; mejor = u; } }
        return false; } });
      // comparación: solo a pie desde el inicio (sin regla del refugio)
      let soloPie = null;
      if (k === 0) { const sp = dijkstra([base], costoPie, false, { alSacar: u => u === obj }); if (sp.dist[obj] < Infinity) { const cam = cadena(sp.prev, obj).reverse(); const pf = perfil(cam, costoPie, 0, 0);
        soloPie = { horas: sp.dist[obj], km: largo(cam) / 1000, dosis: pf[pf.length - 1][2] }; } }
      if (mejor < 0) {   // ¿cuánto habría que caminar desde lo más cerca que llega el rover?
        const ida2 = dijkstra([obj], costoPie, true, { limite: 3 }); let mm = Infinity, km = -1;
        for (let u = 0; u < N; u++) if (r.dist[u] < Infinity && ida2.dist[u] < mm) { mm = ida2.dist[u]; km = u; }
        const extra = km < 0 ? 'y a pie serían más de 3 h de marcha' : `lo más cerca que llega el rover queda a ${Math.round(mm * 60)} min a pie (${(largo(cadena(ida2.prev, km)) / 1000).toFixed(1)} km): rompe la regla`;
        paradas.push({ k, ok: false, motivo: `el rover no llega a menos de ${P.refugioMin} min a pie de la muestra; ${extra}`, soloPie }); continue; }
      const camR = cadena(r.prev, mejor).reverse(), pfR = perfil(camR, costoRover, t, dosis);
      t = pfR[pfR.length - 1][1]; dosis = pfR[pfR.length - 1][2];
      tramos.push({ tipo: 'rover', celdas: pfR, km: largo(camR) / 1000 });
      const tSalida = t; t += P.esclusaMin / 60;
      const camI = cadena(ida.prev, mejor), pfI = perfil(camI, costoPie, t, dosis);
      t = pfI[pfI.length - 1][1]; dosis = pfI[pfI.length - 1][2];
      tramos.push({ tipo: 'ida', celdas: pfI, km: largo(camI) / 1000, k, vista: pfI.map(q => vista(q[0], mejor)) });
      const tMuestra = P.muestraMin / 60, dM = P.dosisDia / 24 * tMuestra * (1 - P.blindaje * cielo[obj] / 255);
      t += tMuestra; dosis += dM;
      tramos.push({ tipo: 'muestra', celdas: [[obj, t, dosis]], k });
      const camV = cadena(vuelta.prev, mejor).reverse(), pfV = perfil(camV, costoPie, t, dosis);
      t = pfV[pfV.length - 1][1]; dosis = pfV[pfV.length - 1][2];
      tramos.push({ tipo: 'vuelta', celdas: pfV, km: largo(camV) / 1000, k, vista: pfV.map(q => vista(q[0], mejor)) });
      const evaH = t - tSalida + P.esclusaMin / 60; t += P.esclusaMin / 60; eva += evaH; dosisPie += dosis - pfR[pfR.length - 1][2];
      let maxPend = 0, sinVista = 0, pieH = 0; for (const q of [...pfI, ...pfV]) { maxPend = Math.max(maxPend, pend[q[0]] / 4); }
      for (const [pf, tr] of [[pfI, tramos[tramos.length - 3]], [pfV, tramos[tramos.length - 1]]]) for (let j = 1; j < pf.length; j++) { const dt = pf[j][1] - pf[j - 1][1]; pieH += dt; if (!tr.vista[j]) sinVista += dt; }
      const muestraVista = vista(obj, mejor);
      const pieFrio = [...pfI, ...pfV].filter(q => frio(q[0])).length / Math.max(pfI.length + pfV.length, 1), roverFrio = pfR.filter(q => frio(q[0])).length / Math.max(pfR.length, 1);
      paradas.push({ k, ok: true, rover: camR.length, idaMin: ida.dist[mejor] * 60, vueltaMin: vuelta.dist[mejor] * 60, evaH, maxPend, soloPie, sinVistaMin: sinVista * 60, pieH, muestraVista, tSalida, pieFrio, roverFrio,
        roverKm: largo(camR) / 1000, pieKm: largo(camI) / 1000 + largo(camV) / 1000 });
      rover = mejor;
    }
    // regreso del rover al inicio
    const rb = dijkstra([rover], costoRover, false, { alSacar: u => u === base });
    if (rb.dist[base] < Infinity && rover !== base) { const cam = cadena(rb.prev, base).reverse(), pf = perfil(cam, costoRover, t, dosis);
      t = pf[pf.length - 1][1]; dosis = pf[pf.length - 1][2]; tramos.push({ tipo: 'rover', celdas: pf, km: largo(cam) / 1000, regreso: true }); }
    const kmRover = tramos.filter(x => x.tipo === 'rover').reduce((s, x) => s + x.km, 0);
    postMessage({ ok: true, tramos, paradas, horas: t, dosis, dosisPie, eva, kmRover, kmPie: tramos.filter(x => x.tipo === 'ida' || x.tipo === 'vuelta').reduce((s, x) => s + x.km, 0) });
  };
}

// ---------- resultado ----------
const BTU_KCAL = 0.252;   // 1 BTU = 0,252 kcal
const lmst = (h0, t) => (h0 + t / 1.0275) % 24;   // hora solar local de Marte: una hora marciana dura 1,0275 h terrestres
const hhmm = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
async function expClima() {
  if (EXP.clima) return EXP.clima;
  try { const [c, v] = await Promise.all([fetch('datos/clima_rems.json').then(r => r.json()), fetch('datos/viento_humedad.json').then(r => r.json())]); EXP.clima = { c, v }; }
  catch (e) { EXP.clima = null; }
  return EXP.clima;
}
function expTarjetaClima(r) {
  const P = EXP.P, cl = EXP.clima; if (!cl) return '';
  const e = cl.c.estaciones.find(x => x.estacion === P.estacion), ev = cl.v.estaciones.find(x => x.estacion === P.estacion);
  const horas = new Set(); let noche = false;
  for (const t of r.tramos) if (t.tipo !== 'rover') for (const q of t.celdas) { const h = lmst(P.horaSalida, q[1]); horas.add(Math.floor(h)); if (h < 6 || h >= 18) noche = true; }
  const vh = cl.v.viento_hora.filter(x => horas.has(x.h) && x.n >= 5), vmax = vh.length ? Math.max(...vh.map(x => x.p90)) : null;
  const uvT = Object.values(e.uv).reduce((a, b) => a + b, 0), uvAlto = ((e.uv.High || 0) + (e.uv.Very_High || 0)) / uvT * 100;
  const fin = lmst(P.horaSalida, r.horas);
  return `<div class="tarjeta"><b>Clima de la salida: ${P.estacion} (Ls ${e.ls[0]}–${e.ls[1]}°), saliendo a las ${hhmm(P.horaSalida)} LMST</b>
    <div class="sub">Regreso a la base cerca de las ${hhmm(fin)} LMST${r.horas / 1.0275 > 24 - P.horaSalida ? ' del sol siguiente' : ''}. Promedios de REMS en esta estación: mínima ${fmt(e.tmin, 0)} °C, máxima ${fmt(e.tmax, 0)} °C (récords ${fmt(e.tmin_rec, 0)} y ${fmt(e.tmax_rec, 0)} °C). UV alto o muy alto en el ${fmt(uvAlto, 0)}% de los soles. <span class="tag">medido</span></div>
    ${noche ? `<div class="sub" style="color:#ffb86b">Parte de la caminata cae de noche (antes de las 06:00 o después de las 18:00 LMST, aproximado): el aire se acerca a la mínima de la estación, ${fmt(e.tmin, 0)} °C. Conviene salir más temprano.</div>` : `<div class="sub">Toda la caminata es de día (entre las 06:00 y las 18:00 LMST, aproximado).</div>`}
    ${vmax != null ? `<div class="sub">Viento en esas horas: hasta ${fmt(vmax, 1)} m/s (percentil 90). Es una muestra parcial de REMS hasta 2016; en ${P.estacion}, el máximo medido fue ${fmt(ev.viento_max, 1)} m/s. <span class="tag">medido</span></div>` : ''}</div>`;
}
const hm = h => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
function expMostrarResultado() {
  const r = EXP.res, P = EXP.P, el = $('expRes');
  if (!r.ok) { el.innerHTML = `<div class="tarjeta"><b>No se pudo armar la ruta</b><div class="sub">${r.error}</div></div>`; return; }
  expPintarPuntos();
  const sinBl = r.dosis / (r.horas / 24);
  const okEva = r.paradas.filter(p => p.ok).every(p => p.evaH <= P.evaNom);
  const curiosity = r.kmRover * 1000;
  el.innerHTML = `
    <div class="ind"><div><small>Duración total</small><b>${hm(r.horas)}</b></div><div><small>Rover presurizado</small><b>${fmt(r.kmRover, 1)} <small>km</small></b></div><div><small>A pie</small><b>${fmt(r.kmPie, 1)} <small>km</small></b></div><div><small>Dosis de la salida</small><b>${fmt(r.dosis, 3)} <small>mSv</small></b></div></div>
    <div class="sub">Dosis = ${fmt(P.dosisDia, 2)} mSv/día (RAD, medido) × tiempo, menos ${fmt(P.blindaje, 2)} × cielo tapado por el relieve (cálculo propio). Es ${fmt(r.dosis / P.carrera * 100, 3)}% del límite de carrera de ${P.carrera} mSv (NASA-STD-3001). Dentro del rover se cuenta igual que afuera: la cabina de un rover presurizado tiene cerca de ${P.casco} g/cm² (NASA), muy poco frente a los ${P.refugioSPE} g/cm² que NASA sugiere para un refugio. <span class="tag">cálculo</span></div>
    <h2>Paradas</h2>
    ${r.paradas.map(p => { const m = EXP.muestras[p.k];
      if (!p.ok) return `<div class="tarjeta"><b>${p.k + 1}. ${m.nombre}</b> <span class="tag" style="background:#c0392b33">no alcanzable</span><div class="sub">${p.motivo}.</div>${p.soloPie ? `<div class="sub">Solo a pie desde el inicio: ${hm(p.soloPie.horas)} de marcha (${fmt(p.soloPie.km, 1)} km).</div>` : ''}</div>`;
      const alerta = p.evaH > P.evaMax ? `<span class="tag" style="background:#c0392b55">pasa las ${P.evaMax} h del traje</span>` : p.evaH > P.evaNom ? `<span class="tag" style="background:#e67e2255">pasa las ${P.evaNom} h nominales</span>` : `<span class="tag" style="background:#4caf7d33">dentro de las reglas</span>`;
      return `<div class="tarjeta"><b>${p.k + 1}. ${m.nombre}</b> ${alerta}
        <div class="sub">Rover: ${fmt(p.roverKm, 2)} km hasta la parada R. ${p.pieKm < 0.03 ? 'El rover puede estacionar junto a la muestra: no hace falta caminar.' : `A pie: ${fmt(p.idaMin, 0)} min de ida y ${fmt(p.vueltaMin, 0)} min de vuelta (máx. ${P.refugioMin} min al rover), ${fmt(p.pieKm, 2)} km.`}
        Salida completa: ${hm(p.evaH)} (incluye ${P.esclusaMin} min de suitport por salida y ${P.muestraMin} min en la muestra). Pendiente media máxima pisada: ${fmt(p.maxPend, 1)}°.</div>
        ${p.pieFrio > 0 ? `<div class="sub" style="color:#ffb86b">El ${fmt(p.pieFrio * 100, 0)}% de la caminata pasa por terreno muy frío de noche (THEMIS): posible arena o polvo suelto, donde Curiosity nunca anduvo. Revisar en la foto HiRISE.</div>` : ''}${p.roverFrio > 0 ? `<div class="sub" style="color:#ffb86b">El rover cruza un ${fmt(p.roverFrio * 100, 0)}% de terreno muy frío de noche.</div>` : ''}
        ${p.soloPie ? `<div class="sub">Comparación, solo a pie desde el inicio: ${hm(p.soloPie.horas)} (${fmt(p.soloPie.km, 1)} km) y ${fmt(p.soloPie.dosis, 3)} mSv; ${p.soloPie.horas * 60 > P.refugioMin ? 'rompe la regla de los 30 min a un refugio.' : 'cumple la regla.'}</div>` : ''}</div>`; }).join('')}
    ${expTarjetaClima(r)}
    <div class="tarjeta"><b>Gasto del traje</b><div class="sub">${r.paradas.filter(p => p.ok).map(p => { const kcal = (p.pieH * P.metabCaminata + Math.max(p.evaH - p.pieH, 0) * P.metabEVA) * BTU_KCAL;
      return `Muestra ${p.k + 1}: unas ${fmt(kcal, 0)} kcal en ${hm(p.evaH)} con traje.`; }).join(' ')}
      Se calcula con ${fmt(P.metabCaminata)} BTU/h al caminar (lo que midió NASA a ${fmt(P.vCaminataMax, 1)} km/h en gravedad de Marte, cerca del límite sostenible; acá se camina más despacio, así que la cifra es conservadora) y ${fmt(P.metabEVA)} BTU/h para el resto de la salida (promedio con que NASA dimensiona una salida en Marte). <span class="tag">cálculo con datos NASA</span></div></div>
    <div class="tarjeta"><b>Comunicación con el rover</b><div class="sub">${r.paradas.filter(p => p.ok).map(p => p.pieH < 0.01 ? `Muestra ${p.k + 1}: no hace falta caminar.` :
      `Muestra ${p.k + 1}: ${p.sinVistaMin < 0.5 ? 'línea de vista directa con el rover durante toda la caminata' : `${fmt(p.sinVistaMin, 0)} de ${fmt(p.pieH * 60, 0)} min sin línea de vista directa`}${p.muestraVista ? '' : ', y en el lugar de la muestra el relieve tapa al rover'}.`).join(' ')}
      Se calcula sobre el relieve de 20 m más la curvatura de Marte, con antenas a ${P.altAstro} m (astronauta) y ${P.altRover} m (mástil del rover). Las alturas son un supuesto. Sin línea de vista hace falta un repetidor o el paso de un orbitador. <span class="tag">cálculo propio</span></div></div>
    <div class="tarjeta"><b>Si lo hiciera Curiosity</b><div class="sub">El mismo trayecto del rover (${fmt(r.kmRover, 1)} km) a ${P.vCuriosity} m/h de manejo y ${P.solCuriosity[0]}–${P.solCuriosity[1]} m por sol: unos ${fmt(curiosity / P.solCuriosity[1], 0)} a ${fmt(curiosity / P.solCuriosity[0], 0)} soles. Con astronautas: ${hm(r.horas)}. <span class="tag">cálculo con datos del blog</span></div></div>
    <div class="btns"><button class="btn prim" id="expSim">▶ Simular en vivo</button><button class="btn" id="expVer">Ver la ruta</button></div>
    <details class="sec"><summary>Qué tiene en cuenta y qué no</summary><div class="sub"><ul>
      <li><b>Medido:</b> relieve (DEM USGS de 1 m llevado a 5 m y a 20 m), dosis de RAD en Gale.</li>
      <li><b>Cálculo propio:</b> pendiente media de cada celda de 20 m, cielo tapado, tiempos por Dijkstra, dosis acumulada.</li>
      <li><b>Supuestos (provisorios):</b> límite de 20° del traje (lunar), velocidad a pie de Tobler (terrestre, ${P.vLlano} km/h en llano), rover presurizado a ${P.vRover} km/h (${P.vRoverOpciones[P.vRover]}), 20° de media y como mucho ${P.escalonRover} de 16 tramos de 5 m sobre 20° por celda (el 99% de las celdas que pisó Curiosity cumple esa regla), ${P.refugioMin} min a un refugio, ${P.muestraMin} min por muestra, orden de las muestras por cercanía en línea recta.</li>
      <li><b>Arena (indicio, no mapa):</b> THEMIS infrarrojo de noche de Mars Odyssey (mosaico USGS, 100 m, cualitativo). Lo más frío de noche suele ser material suelto. Curiosity nunca anduvo por el 10% más frío de la zona, por eso el rover lo evita${P.evitarFrio ? '' : ' (desactivado)'}. En 2014 tuvo que abandonar Hidden Valley por el patinaje de las ruedas en la arena.</li>
      <li><b>Falta (sin dato para toda la zona):</b> mapa de arena en unidades (la inercia térmica cuantitativa de USGS no se pudo descargar desde acá), rocas sueltas que dañan ruedas, velocidad del rover según la pendiente, pendiente máxima de un rover presurizado en Marte (se usa la del Apollo LRV). Las celdas de 20 m pueden esconder escalones más empinados: mirá la foto HiRISE antes de salir.</li>
      <li>Cálculo en ${fmt(r.ms / 1000, 1)} s sobre la grilla de 20 m.</li></ul></div></details>`;
  $('expSim').onclick = expSimular;
  $('expVer').onclick = () => { const pts = r.tramos.flatMap(t => t.pts); const bs = C.BoundingSphere.fromPoints(pts.map(p => pos(p[0], p[1], EXP.G.elev[expCelda(p[0], p[1])[0] * EXP.G.W + expCelda(p[0], p[1])[1]] || 0)));
    viewer.camera.flyToBoundingSphere(bs, { offset: new C.HeadingPitchRange(0.2, -0.75, bs.radius * 2.6 + 800), duration: 2 }); };
  $('expVer').onclick();
}

// ---------- simulación en vivo ----------
function expSimular() {
  const r = EXP.res; if (!r || !r.ok) return;
  if (EXP.sim) expParar();
  const serie = [];
  let parqueo = null;
  for (const t of r.tramos) { t.celdas.forEach((q, k) => serie.push({ i: q[0], t: q[1], d: q[2], tipo: t.tipo, lonlat: t.pts[k], vista: t.vista ? t.vista[k] : 1, parqueo })); if (t.tipo === 'rover') parqueo = t.celdas[t.celdas.length - 1][0]; }
  const P = EXP.P, G = EXP.G, IC = { r: icono('R', '#4FA3D9', 30, '#fff'), a: icono('A', '#ffd166', 30, '#fff') };
  const s = EXP.sim = { serie, k: 0, th: 0, vel: 600, pausa: false, seguir: true };
  const actual = () => serie[Math.min(s.k, serie.length - 1)];
  s.ent = viewer.entities.add({ position: new C.CallbackProperty(() => { const a = actual(); return pos(a.lonlat[0], a.lonlat[1]); }, false),
    billboard: { image: new C.CallbackProperty(() => actual().tipo === 'rover' ? IC.r : IC.a, false), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
  const hud = $('expHud'); hud.classList.remove('oculto');
  hud.innerHTML = `<div class="hT"><span id="hInfo"></span><button class="btn" id="hTorm" title="¿Qué pasa si llega ahora la tormenta solar del 20/5/2024?">☢ Tormenta solar</button><button class="btn" id="hPausa"></button><select id="hVel">${[60, 300, 600, 1800].map(v => `<option value="${v}" ${v === s.vel ? 'selected' : ''}>×${v}</option>`).join('')}</select><button class="btn" id="hSeguir"></button><button class="btn" id="hCerrar">✕</button></div><div id="hDatos"></div>`;
  $('hPausa').onclick = () => { s.alerta = null; if (s.k >= serie.length - 1) { s.k = 0; s.th = 0; s.pausa = false; } else s.pausa = !s.pausa; };
  $('hVel').onchange = e => { s.vel = +e.target.value; }; $('hCerrar').onclick = expParar;
  $('hSeguir').onclick = () => { s.seguir = !s.seguir; };
  $('hTorm').onclick = () => expTormenta(s, serie[Math.min(s.k, serie.length - 1)]);
  let ultimo = performance.now();
  const paso = ahora => {
    if (EXP.sim !== s) return;
    const dt = (ahora - ultimo) / 1000; ultimo = ahora;
    if (!s.pausa) { s.th += dt * s.vel / 3600; while (s.k < serie.length - 1 && serie[s.k + 1].t <= s.th) s.k++; }
    const a = actual(), pieza = a.tipo === 'rover' ? 'En el rover presurizado' : a.tipo === 'muestra' ? 'Tomando la muestra' : a.tipo === 'ida' ? 'A pie hacia la muestra' : 'A pie, de vuelta al rover';
    let fuera = 0; if (a.tipo !== 'rover') { let j = s.k; while (j > 0 && serie[j - 1].tipo !== 'rover') j--; fuera = a.t - (j > 0 ? serie[j - 1].t : 0); }
    let alRover = null; if (a.tipo === 'vuelta') { let j = s.k; while (j < serie.length - 1 && serie[j + 1].tipo === 'vuelta') j++; alRover = (serie[j].t - a.t) * 60; }
    const pe = G.pend[a.i] / 4, cie = G.cielo[a.i] / 255, el = G.elev[a.i];
    $('hInfo').innerHTML = `<b>${pieza}</b> · ${hm(a.t)} desde la salida · ${hhmm(lmst(P.horaSalida, a.t))} LMST`;
    $('hPausa').textContent = s.pausa ? '▶' : '❚❚'; $('hSeguir').textContent = s.seguir ? 'Cámara libre' : 'Seguir';
    $('hDatos').innerHTML = `<div class="hG"><div><small>Posición</small><b>${fmt(a.lonlat[1], 5)}°, ${fmt(a.lonlat[0], 5)}° E</b></div><div><small>Altura</small><b>${fmt(el)} m</b></div>
      <div><small>Pendiente</small><b style="color:${pe > 20 ? '#ff6b6b' : pe > 15 ? '#ffd166' : 'inherit'}">${fmt(pe, 1)}°</b></div><div><small>Dosis acumulada</small><b>${fmt(a.d, 3)} mSv</b></div>
      <div><small>Cielo tapado</small><b>${fmt(cie * 100, 0)}%</b></div>
      ${a.tipo === 'ida' || a.tipo === 'vuelta' || a.tipo === 'muestra' ? `<div><small>Enlace con el rover</small><b style="color:${a.vista ? 'inherit' : '#ffb86b'}">${a.vista ? 'directo' : 'sin línea de vista'}</b></div>` : ''}
      ${a.tipo !== 'rover' ? `<div><small>Fuera del rover</small><b style="color:${fuera > P.evaNom ? '#ff6b6b' : 'inherit'}">${hm(fuera)} de ${P.evaNom} h</b></div>${alRover != null ? `<div><small>Falta para el rover</small><b style="color:${alRover > P.refugioMin ? '#ff6b6b' : 'inherit'}">${fmt(Math.max(alRover, 0), 0)} min</b></div>` : ''}` : ''}</div>
      ${s.alerta ? `<div class="sub" style="margin-top:6px;color:#ffb86b">${s.alerta}</div>` : ''}
      <div class="barra" style="margin-top:6px"><span style="width:${(s.k / (serie.length - 1) * 100).toFixed(1)}%;background:var(--acento)"></span></div>`;
    if (s.seguir) { const hs = MODO === 'globo' ? viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(a.lonlat[0], geodetica(a.lonlat[1]))) : null; const p = pos(a.lonlat[0], a.lonlat[1], hs ?? el); viewer.camera.lookAt(p, new C.HeadingPitchRange(viewer.camera.heading, -0.45, a.tipo === 'rover' ? 1400 : 500)); }
    if (s.k >= serie.length - 1) { s.pausa = true; }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
// ☢ ¿Qué pasa si la tormenta solar del 20/5/2024 llega en este momento de la salida?
function expTormenta(s, a) {
  const P = EXP.P; s.pausa = true; s.alerta = 'Calculando cómo ponerse a resguardo…';
  EXP.worker.onmessage = e => { const o = e.data; if (o.tipo !== 'tormenta' || EXP.sim !== s) return;
    const [lo, la] = expLonLat(o.refugio.celda);
    if (s.entRef) viewer.entities.remove(s.entRef);
    s.entRef = viewer.entities.add({ position: pos(lo, la), billboard: { image: icono('☢', '#ffb86b', 24, '#000'), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
    const fuera = a.tipo !== 'rover';
    s.alerta = `☢ Tormenta solar (como la del 20/5/2024): a cielo abierto junto a Curiosity, RAD midió ${fmt(P.tormenta, 1)} mGy en el evento, unos ${fmt(P.tormenta / 0.21, 0)} días de la dosis normal (0,21 mGy/día). No es mortal, pero hay que resguardarse.
      ${fuera ? `A pie: ${fmt(o.pieMin, 0)} min hasta el rover.` : ''} El rover no sirve de refugio (≈${P.casco} g/cm²; NASA sugiere ${P.refugioSPE} g/cm²): volver a la base lleva ${hm(o.roverH)}.
      Mientras tanto, el lugar más resguardado a ≤ 10 min a pie (marca ☢) tiene ${fmt(o.refugio.cielo * 100, 0)}% del cielo tapado por el relieve (acá ${fmt(o.cieloAqui * 100, 0)}%). Según NASA, los acantilados dan protección extra.`;
  };
  EXP.worker.postMessage({ tipo: 'tormenta', celda: a.i, rover: a.tipo === 'rover' ? null : a.parqueo, base: EXP.baseCelda, P });
}
function expParar() { const s = EXP.sim; if (!s) return; viewer.entities.remove(s.ent); if (s.entRef) viewer.entities.remove(s.entRef); EXP.sim = null; $('expHud').classList.add('oculto'); viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); }

// ---------- panel ----------
async function vistaExpedicion() {
  cont().innerHTML = `<p class="sub">Círculo de 20 km alrededor de Curiosity (sol 5070). Elegí desde dónde sale el rover presurizado y qué muestras buscar. El rover deja al astronauta a no más de ${EXP.P.refugioMin} min a pie de cada muestra y el planificador evita las pendientes que superan los límites.</p><div id="expCuerpo"><div class="sub">Cargando el relieve de la zona…</div></div>`;
  let G; try { G = await expCargar(); await expClima(); } catch (e) { $('expCuerpo').innerHTML = `<div class="tarjeta"><b>No se pudo cargar la zona</b><div class="sub">${e.message || e}</div></div>`; return; }
  if (pestaña !== 'expedicion') return;
  expDibujarZona(); expMostrarZona(true);
  const cob = G.meta.cobertura_dem_fino_pct, P = EXP.P;
  const cerca = POZOS.filter(p => expDist(p.lon, p.lat) <= G.meta.radio_km * 1000 && !expPunto(p.lon, p.lat)?.sinDato);
  $('expCuerpo').innerHTML = `
    <div class="leyenda"><span><i style="background:#f0c83c"></i>15–20°</span><span><i style="background:#eb6e28"></i>20–25° (límite)</span><span><i style="background:#c81e1e"></i>más de 25°</span><span><i style="background:#969696"></i>sin DEM fino</span></div>
    <div class="sub">DEM de 1 m del USGS en el ${fmt(cob['10'], 0)}% de los primeros 10 km y en el ${fmt(cob['20'], 0)}% del círculo. Donde no hay, no se rutea. <span class="tag">medido + cálculo</span></div>
    <label class="fila"><span>Mostrar pendientes y círculo</span><input type="checkbox" id="expVerZona" checked></label>
    <h2>1. Inicio del rover</h2>
    <div class="btns"><button class="btn ${EXP.modo === 'base' ? 'prim' : ''}" id="expElegirBase">${EXP.modo === 'base' ? 'Tocá el mapa…' : 'Elegir en el mapa'}</button><button class="btn" id="expBaseHoy">Junto a Curiosity</button>
      ${SITIOS.filter(s => expDist(s.lon, s.lat) <= G.meta.radio_km * 1000).map(s => `<button class="btn" data-sitio="${s.id}">★ ${s.nombre}</button>`).join('')}</div>
    ${EXP.base ? `<div class="sub">⌂ ${EXP.base.nombre}: ${fmt(EXP.base.lat, 4)}°, ${fmt(EXP.base.lon, 4)}° E · pendiente ${fmt(EXP.base.q.pend, 1)}°</div>` : ''}
    <h2>2. Muestras a buscar</h2>
    <div class="btns"><button class="btn ${EXP.modo === 'muestra' ? 'prim' : ''}" id="expElegirM">${EXP.modo === 'muestra' ? 'Tocá el mapa…' : '+ Tocar un punto en el mapa'}</button><button class="btn" id="expAzar">Lugar al azar</button>${EXP.muestras.length ? '<button class="btn" id="expBorrar">Borrar todas</button>' : ''}</div>
    <label class="fila"><span>O un pozo de Curiosity</span><select id="expPozo"><option value="">elegir…</option>${cerca.map(p => `<option value="${p.nombre}">${p.n ?? ''} ${p.nombre}</option>`).join('')}</select></label>
    ${EXP.muestras.map((m, k) => `<div class="sub">${k + 1}. ${m.nombre}: ${fmt(m.lat, 4)}°, ${fmt(m.lon, 4)}° E · pendiente ${fmt(m.q.pend, 1)}° · cielo tapado ${fmt(m.q.cielo * 100, 0)}%</div>`).join('')}
    <h2>3. Condiciones</h2>
    <label class="fila"><span>Rover presurizado</span><select id="expVR">${Object.entries(P.vRoverOpciones).map(([v, t]) => `<option value="${v}" ${+v === P.vRover ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="fila"><span>Estación (sur de Marte)</span><select id="expEst">${['otoño', 'invierno', 'primavera', 'verano'].map((e, k) => `<option ${e === P.estacion ? 'selected' : ''} value="${e}">${e} · Ls ${k * 90}–${k * 90 + 90}°</option>`).join('')}</select></label>
    <label class="fila"><span>Hora de salida (LMST)</span><select id="expHora">${[6, 7, 8, 9, 10, 11, 12, 13, 14].map(h => `<option ${h === P.horaSalida ? 'selected' : ''} value="${h}">${hhmm(h)}</option>`).join('')}</select></label>
    <label class="fila"><span>El rover evita lo más frío de noche (posible arena, THEMIS)</span><input type="checkbox" id="expFrio" ${P.evitarFrio ? 'checked' : ''}></label>
    <label class="fila"><span>Ver THEMIS de noche (Mars Odyssey)</span><input type="checkbox" id="expTh" ${EXP.capaTh && EXP.capaTh.show ? 'checked' : ''}></label>
    <label class="fila"><span>Minutos en cada muestra <span class="tag">supuesto</span></span><input type="number" id="expMin" min="5" max="180" step="5" value="${P.muestraMin}" style="width:64px"></label>
    <div class="btns"><button class="btn prim" id="expCalc">Calcular la ruta segura</button></div>
    <div id="expRes"></div>`;
  $('expVerZona').onchange = e => expMostrarZona(e.target.checked);
  $('expElegirBase').onclick = () => { EXP.modo = EXP.modo === 'base' ? null : 'base'; vistaExpedicion(); if (EXP.modo) avisar('Tocá el mapa dentro del círculo naranja para poner el inicio.', 5000); };
  $('expElegirM').onclick = () => { EXP.modo = EXP.modo === 'muestra' ? null : 'muestra'; vistaExpedicion(); if (EXP.modo) avisar('Tocá el mapa dentro del círculo naranja para marcar la muestra.', 5000); };
  $('expBaseHoy').onclick = () => expAgregar('base', HOY[0] + 0.0004, HOY[1], 'Junto a Curiosity');
  cont().querySelectorAll('[data-sitio]').forEach(b => b.onclick = () => { const s = SITIOS.find(x => x.id === b.dataset.sitio); expAgregar('base', s.lon, s.lat, s.nombre); });
  $('expPozo').onchange = e => { const p = POZOS.find(x => x.nombre === e.target.value); if (p) expAgregar('muestra', p.lon, p.lat, `Pozo ${p.nombre}`); };
  if ($('expBorrar')) $('expBorrar').onclick = () => { EXP.muestras = []; EXP.res = null; expPintarPuntos(); vistaExpedicion(); };
  $('expAzar').onclick = () => {   // celda al azar dentro del círculo, con DEM fino y pendiente bajo el límite del traje
    for (let n = 0; n < 5000; n++) { const i = Math.floor(Math.random() * G.W * G.H), [lo, la] = expLonLat(i), q = expPunto(lo, la);
      if (q && !q.fuera && !q.sinDato && q.pend <= P.pendAstro) { expAgregar('muestra', lo, la, `Muestra al azar ${EXP.muestras.length + 1}`); return; } } };
  $('expMin').onchange = e => { P.muestraMin = Math.max(5, Math.min(180, +e.target.value || 30)); };
  $('expCalc').onclick = expCalcular;
  $('expFrio').onchange = e => { P.evitarFrio = e.target.checked; EXP.res = null; $('expRes').innerHTML = ''; };
  $('expTh').onchange = e => expCapaThemis(e.target.checked);
  $('expVR').onchange = e => { P.vRover = +e.target.value; EXP.res = null; $('expRes').innerHTML = ''; };
  $('expEst').onchange = e => { P.estacion = e.target.value; if (EXP.res) expMostrarResultado(); };
  $('expHora').onchange = e => { P.horaSalida = +e.target.value; if (EXP.res) expMostrarResultado(); };
  if (EXP.res) expMostrarResultado();
  else if (!EXP.base && !EXP.ent0) { EXP.ent0 = true; viewer.camera.flyTo({ destination: pos(G.meta.centro.lon, G.meta.centro.lat - 0.62, 52000), orientation: { heading: 0, pitch: -0.95, roll: 0 }, duration: 2 }); }
}

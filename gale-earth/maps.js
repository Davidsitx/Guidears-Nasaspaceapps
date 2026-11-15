// ==================== Maps in Mars: base en el mapa, nuevo recorrido con pines, astronauta a mano, líneas de ida y vuelta, fluidez ====================
// Módulo del compañero (con Claude), 15/11. Se apoya en mision.js y pmr.js (de David) sin cambiarlos: envuelve sus funciones.
// Terreno y límites: los mismos de la guía del PMR (datos/terreno_pmr.png, celdas de 12 m; pendiente máxima de data/parametros.json).
const UR = { pines: [], marcando: false, aPie: true, salida: 'hoy', volver: true, ds: null, n: 0, an: null, seguro: null, verBase: false };
const UR_COL = { ok: '#4fd1ff', dificil: '#ffb02e', peligro: '#ff4d4d', fuera: '#9aa0a6', seguro: '#4fbf7d', pin: '#4fd1ff' };

document.head.insertAdjacentHTML('beforeend', `<style id="urEstilos">
body.ur-marcando #globo canvas{cursor:crosshair!important}
#urLeyenda{display:none;gap:12px;align-items:center;font-size:11.5px;color:var(--suave);margin:-2px 0 6px;flex-wrap:wrap}
#urLeyenda i{display:inline-block;width:22px;height:0;border-top:4px solid var(--c);vertical-align:middle;margin-right:5px;border-radius:2px}
#urLeyenda i.pt{border-top-style:dashed}
body.ur-ley #urLeyenda{display:flex}
#urControl{display:none}body.ur-apie #urControl{display:flex}
#urControl[aria-pressed=true]{background:linear-gradient(#2f8a55,#23683f);border-color:#4fbf7d;color:#fff}
body.ur-control #miBar,body.ur-control #miPlayB,body.ur-control #miPararL,body.ur-control #miDurL{display:none}
body.ur-control #miPad{display:flex}
.ur-aviso{border-left:3px solid var(--c);background:var(--sup2);border-radius:8px;padding:7px 10px;margin:6px 0;font-size:12.5px}
.ur-aviso b{color:var(--c)}
.ur-pin{display:flex;align-items:center;gap:8px;padding:6px 9px;border-bottom:1px solid #ffffff0d;font-size:13px}
.ur-pin small{margin-left:auto;color:var(--suave)}
.ur-pin button{border:0;background:none;color:var(--suave);cursor:pointer;font-size:16px}
</style>`);

// ---------- interruptores de arriba: 49 perforaciones · Nuevo recorrido · Misión Curiosity ----------
{
  const rec = $('miIntRec');
  rec.innerHTML = `<i></i>${lg('Misión Curiosity', 'Curiosity mission')}`;
  rec.title = lg('Las rutas planificadas desde la posición de Curiosity hoy (A, B, C, T y expedición sur), con la Base Gale, el PMR y la misión en pareja', 'The planned routes from Curiosity\'s position today (A, B, C, T and southern expedition), with Gale Base, the PMR and the two-person mission');
  rec.insertAdjacentHTML('beforebegin', `<button class="mi-int" id="urIntNuevo" style="--c:${UR_COL.ok}" aria-pressed="false" title="${lg('Armá tu propio recorrido con pines en el mapa: te avisa si pasa por pendientes peligrosas, arena o fuera del terreno con datos', 'Build your own route with pins on the map: it warns you about dangerous slopes, sand or areas without terrain data')}"><i></i>${lg('Nuevo recorrido', 'New route')}</button>`);
  rec.onclick = async () => { const on = rec.getAttribute('aria-pressed') !== 'true'; await miVerRecorrido(on); if (on) miEntrar(); };
  $('urIntNuevo').onclick = () => urAbrir();
}

// ---------- botón "Base" del panel: además de la información, lleva a la Base Gale en el mapa ----------
async function urIrBase() {
  if (!(await miCargar())) return;
  UR.verBase = true; miVisibles();
  if (MI.mod.base_gale) MI.mod.base_gale.show = true;
  const b = MI.D.base, h = alturaSuelo(b.lon, b.lat, b.elev);
  // desde lejos, un vuelo largo que no pierde a Marte de vista; de cerca, el encuadre de "Ver la base de cerca"
  const lejos = viewer.camera.positionCartographic.height > 60000;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(b.lon, b.lat, h + 4), 40), { offset: new C.HeadingPitchRange(0.6, -0.42, lejos ? 260 : 150),
    duration: lejos ? 3.2 : 2.2, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000, maximumHeight: lejos ? 3000000 : undefined });
}
document.querySelector('.rb[data-t="base"]')?.addEventListener('click', () => setTimeout(() => {
  urIrBase();
  // tarjeta de la base elegida arriba de la tabla de sitios
  const c = cont(); if (!c || c.querySelector('#urTBase')) return;
  c.insertAdjacentHTML('afterbegin', `<div class="tarjeta" id="urTBase"><span class="chip" style="background:#ffcf7a"></span><b>${lg('Base Gale · Zona 2 (elegida)', 'Gale Base · Zone 2 (chosen)')}</b>
    <div class="sub">${lg('El mapa vuela a la base. Tocá acá para ver sus partes, con ficha y fuente.', 'The map flies to the base. Tap here for its parts, each with a card and source.')} <span class="prov">${lg('propuesta propia', 'our proposal')}</span></div></div>`);
  $('urTBase').onclick = async () => { if (await miCargar()) { fichaBase(); urIrBase(); } };
}, 0));

// la base se ve en el mapa una vez que se la buscó (y siempre que no se esté haciendo un recorrido)
{
  const vis0 = miVisibles;
  miVisibles = function () {
    vis0();
    if (MI.ds && UR.verBase && !MI.modo) for (const e of MI.ds.entities.values) if (e.properties?.tipo?.getValue?.() === 'mbase') e.show = true;
    const m = MI.modo, G = PMR.guia;
    // en la guía del PMR solo se ve el tramo que se está haciendo (antes se veían todos a la vez y parecían varias rutas)
    if (MI.ds && m?.guia && G) for (const e of MI.ds.entities.values) {
      const t = e.properties?.tipo?.getValue?.(); if (t !== 'gruta' && t !== 'gborde' && t !== 'gparada') continue;
      const id = e.properties.id.getValue();
      e.show = t === 'gparada' ? G.paradas[id] === G.tramos[G.i]?.parada : id === m.L.id;
    }
    if (UR.ds) UR.ds.show = !m || m.id === UR.id;
  };
}

// ---------- ida y vuelta: la vuelta va punteada ----------
// B y las caminatas de C son "ida y vuelta": la vuelta es un tramo calculado aparte (la ruta más segura desde la última parada
// hasta el PMR), así que no siempre pisa la ida. Medido sobre datos/mision.json: B se separa hasta 42 m; C-cam1 hasta 72 m.
// Antes las dos se dibujaban del mismo color y parecían dos rutas. Ahora: ida llena, vuelta punteada, y una leyenda abajo.
function urGiro(L) {     // índice del punto más lejano de la salida: ahí empieza la vuelta
  const p0 = L.pts[0]; let k = 0, mx = -1;
  L.pts.forEach((p, i) => { const d = miDist(p0[0], p0[1], p[0], p[1]); if (d > mx) { mx = d; k = i; } });
  return k;
}
function urIdaVuelta() {
  if (!MI.ds || UR.idaListo) return; UR.idaListo = true;
  for (const e of [...MI.ds.entities.values]) {
    const pr = e.properties, tipo = pr?.tipo?.getValue?.(), id = pr?.id?.getValue?.(), L = MI.lineas[id];
    if (tipo !== 'mruta' || !L?.idaVuelta || !L.pts?.length) continue;
    const k = urGiro(L); L.giro = k; L.dGiro = L.pts[k][2];
    const col = C.Color.fromCssColorString(L.color), ida = L.pts.slice(0, k + 1).map(p => pos(p[0], p[1])), vuelta = L.pts.slice(k).map(p => pos(p[0], p[1]));
    e.polyline.positions = ida;
    MI.ds.entities.add({ properties: { tipo: 'mruta', id, nombre: miNomRuta(L) + lg(' · vuelta', ' · return') },
      polyline: { positions: vuelta, width: e.polyline.width.getValue() - 0.5, clampToGround: true, zIndex: (e.polyline.zIndex?.getValue?.() ?? 4) + 1,
        material: new C.PolylineDashMaterialProperty({ color: col.withAlpha(0.95), gapColor: C.Color.fromCssColorString('#1b1210').withAlpha(0.35), dashLength: 18 }),
        distanceDisplayCondition: e.polyline.distanceDisplayCondition } });
  }
  miVisibles();
}
{
  const capa0 = miCapa; miCapa = function () { capa0(); UR.idaListo = false; urIdaVuelta(); };
  if (MI.ds) urIdaVuelta();
}
// leyenda en el reproductor y botón para manejar al astronauta
document.querySelector('#miPlay .cab').insertAdjacentHTML('afterend', `<div id="urLeyenda"><span id="urLeyTxt"></span></div>`);
$('miSalir').insertAdjacentHTML('beforebegin', `<button class="mib" id="urControl" aria-pressed="false" title="${lg('Manejar al astronauta con el teclado (W A S D o flechas; Shift ×10). Volvé a tocar para seguir la ruta.', 'Walk the astronaut yourself with the keyboard (W A S D or arrows; Shift ×10). Tap again to go back to the route.')}">🕹 ${lg('Manejar al astronauta', 'Walk the astronaut')}</button>`);
function urLeyenda(m) {
  const L = m?.L, cl = document.body.classList;
  if (!L || !L.idaVuelta || m.libre) { cl.remove('ur-ley'); return; }
  const c = L.color || '#ff8a3d';
  $('urLeyTxt').innerHTML = `<span style="--c:${c}"><i></i>${lg('ida', 'out')}</span> <span style="--c:${c}"><i class="pt"></i>${lg('vuelta', 'return')}</span> · ${m.guia
    ? lg('A pie desde el PMR: la vuelta es la ruta más segura hasta el PMR, calculada aparte; por eso puede no pisar la ida.', 'On foot from the PMR: the return is the safest route back to the PMR, computed separately, so it may not retrace the way out.')
    : lg('Son dos tramos: la vuelta es la ruta más segura desde la última parada hasta el PMR y no siempre pisa la ida (cálculo propio).', 'Two legs: the return is the safest route from the last stop back to the PMR and does not always retrace the way out (our calculation).')}`;
  cl.add('ur-ley');
}

// ---------- recorridos: leyenda, astronauta a mano y salida limpia ----------
{
  const modo0 = miModo;
  miModo = function (id, tipo, opc) {
    modo0(id, tipo, opc); const m = MI.modo; if (!m) return;
    urLeyenda(m);
    document.body.classList.toggle('ur-apie', !m.rover && !m.libre);
    $('urControl').setAttribute('aria-pressed', 'false');
    if (tipo === 'pareja') miMsg('base', lg('Si querés, manejá vos al Astronauta 1 con «Manejar al astronauta» (W A S D). Te avisamos pendiente, arena, dosis y distancia al PMR.', 'If you like, walk Astronaut 1 yourself with "Walk the astronaut" (W A S D). We will flag slope, sand, dose and distance to the PMR.'));
    if (/^U\d+$/.test(id)) miVisibles();
  };
  const salir0 = miSalirModo;
  miSalirModo = function (volver = true) { document.body.classList.remove('ur-ley', 'ur-apie', 'ur-control'); salir0(volver); };
  const tick0 = miTick;
  miTick = function (dt) { const m = MI.modo; if (m?.control) { try { miAnimPMR(dt); } catch {} return urAstroTick(dt); } return tick0(dt); };
}
$('urControl').onclick = () => urControl(!MI.modo?.control);
async function urControl(on) {
  const m = MI.modo; if (!m || m.rover || m.libre) return;
  if (on) {
    try { await pmrTerreno(); } catch { return avisar(lg('No se pudo cargar el terreno de 12 m.', 'Could not load the 12 m terrain.')); }
    const q = enLinea(m.L, m.d), qb = enLinea(m.L, Math.min(m.L.largo, m.d + 3));
    m.jugando = false; $('miPlayB').textContent = lg('▶ Seguir', '▶ Resume');
    m.control = { lon: q.lon, lat: q.lat, rumbo: rumboDe(q, qb), v: 0, odo: 0, t: q.t || 0, dosis: q.dosis || 0, teclas: {}, vistos: new Set(), mov: 0 };
    document.body.classList.add('ur-control'); MI.siguiendo = true;
    miCard(lg('Astronauta a mano', 'Walking by hand'), lg('Lo manejás vos', 'You walk it'),
      lg(`W o ↑ adelante, S o ↓ atrás, A D o ← → para girar, Shift ×10. El traje no sube pendientes de más de ${MI.D.parametros.PR.pMax}°; en la arena vas más lento. La dosis y el tiempo siguen contando.`,
        `W or ↑ forward, S or ↓ back, A D or ← → to turn, Shift ×10. The suit will not take slopes over ${MI.D.parametros.PR.pMax}°; sand slows you down. Dose and time keep counting.`),
      [[lg('Entendido', 'Got it'), () => miCard(), true]]);
  } else if (m.control) {
    // vuelve a la ruta en el punto más cercano a donde quedó
    const c = m.control; let best = 0, bd = Infinity; for (const p of m.L.pts) { const d = miDist(c.lon, c.lat, p[0], p[1]); if (d < bd) { bd = d; best = p[2]; } }
    m.d = best; m.control = null; document.body.classList.remove('ur-control'); miCard();
    if (bd > 15) miMsg('a2', lg(`De vuelta en la ruta, a ${miM(bd)} de donde estabas.`, `Back on the route, ${miM(bd)} from where you were.`));
  }
  $('urControl').setAttribute('aria-pressed', String(!!MI.modo?.control));
}
{
  const K = { w: 'ade', arrowup: 'ade', s: 'atr', arrowdown: 'atr', a: 'izq', arrowleft: 'izq', d: 'der', arrowright: 'der' };
  const tecla = (e, on) => { const c = MI.modo?.control; if (!c) return; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    c.teclas.shift = e.shiftKey; const k = K[e.key.toLowerCase()]; if (k) { c.teclas[k] = on; e.preventDefault(); } };
  addEventListener('keydown', e => tecla(e, true)); addEventListener('keyup', e => tecla(e, false));
  addEventListener('blur', () => { if (MI.modo?.control) MI.modo.control.teclas = {}; });
  document.querySelectorAll('#miPad [data-k]').forEach(b => { const k = b.dataset.k;
    if (k === 'rap') return b.addEventListener('click', () => { const c = MI.modo?.control; if (c) { c.teclas.rap = !c.teclas.rap; b.classList.toggle('on', c.teclas.rap); } });
    const on = v => e => { const c = MI.modo?.control; if (!c) return; e.preventDefault(); c.teclas[k] = v; b.classList.toggle('on', v); };
    b.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, on(false)); });
}
function urAstroTick(dt) {
  const m = MI.modo, c = m.control, k = c.teclas, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, rap = k.shift || k.rap ? 10 : 1;
  const ade = k.ade ? 1 : k.atr ? -0.5 : 0, giro = (k.der ? 1 : 0) - (k.izq ? 1 : 0);
  const aqui = pmrMuestra(c.lon, c.lat), vmax = PR.vCam * rap * (aqui.ar ? 0.7 : 1);
  c.v += (ade * vmax - c.v) * Math.min(1, dt * 3); c.rumbo += giro * dt * 1.2;
  const una = (clave, f) => { if (!c.vistos.has(clave)) { c.vistos.add(clave); f(); } };
  const paso = c.v * dt; let [lo, la] = corrido(c.lon, c.lat, Math.sin(c.rumbo) * paso, Math.cos(c.rumbo) * paso);
  if (Math.abs(paso) > 1e-5) {
    const s = Math.sign(paso), [lo2, la2] = corrido(c.lon, c.lat, Math.sin(c.rumbo) * 4 * s, Math.cos(c.rumbo) * 4 * s);
    const ad = pmrDentro(lo2, la2) ? pmrMuestra(lo2, la2) : null, marcha = ad ? Math.abs(Math.atan((ad.z - aqui.z) / 4)) / d2r : 0;
    if (!ad) { c.v = 0; lo = c.lon; la = c.lat; una('borde', () => miMsg('base', lg('Fin del terreno con datos de 12 m: no sigas por ahí.', 'End of the 12 m terrain data: do not go further that way.'), 'alerta')); }
    else if (ad.p > PR.pMax && marcha > PR.pMax * 0.6) { c.v = 0; lo = c.lon; la = c.lat;
      una('p' + Math.round(lo2 * 1e4) + Math.round(la2 * 1e4), () => miMsg('a2', lg(`Pendiente de ${miNum(ad.p)}° adelante: el traje no la pasa (límite ${PR.pMax}°). Rodeala.`, `Slope of ${miNum(ad.p)}° ahead: the suit cannot take it (limit ${PR.pMax}°). Go around.`), 'alerta')); }
    else { c.odo += Math.abs(paso); if (aqui.ar) una('ar' + Math.round(c.odo / 80), () => miMsg('a2', lg('Arena probable: vas más lento y cuesta más.', 'Probable sand: slower and harder going.'))); }
  }
  c.t += dt * rap / 3600 * (Math.abs(c.v) > 0.01 ? 1 : 1); c.dosis += PR.dosis * 1000 / 24 * (1 - PR.k * aqui.ci) * dt * rap / 3600;
  c.lon = lo; c.lat = la; const s0 = pmrMuestra(lo, la);
  c.mov += ((Math.abs(c.v) > 0.05 ? 1 : 0) - c.mov) * Math.min(1, dt * 6);
  const a = MI.mod.astronauta; let obj = pos(lo, la, alturaSuelo(lo, la, s0.z));
  if (a) { a.show = m.vista !== 'ojos'; obj = colocar(a, lo, la, c.rumbo, s0.z, 0, 0, false); if (a.show) pasoAstro(a, c.odo / MI.D.parametros.zancada * Math.PI * 2, c.mov, 0); }
  miCamara(dt, obj, c.rumbo, { vista: m.vista, trip: false, rover: false, libre: true });
  // refugio: el PMR estacionado donde empezó la caminata
  const pmr = m.L.pmr || MI.pmrSalida || { lon: m.L.pts[0][0], lat: m.L.pts[0][1] }, dP = miDist(lo, la, pmr.lon, pmr.lat), minP = dP / PR.vCam / 60;
  const q = { lon: lo, lat: la, elev: s0.z, marcha: Math.abs(c.v) > 0.05 ? Math.abs(Math.atan((pmrMuestra(...corrido(lo, la, Math.sin(c.rumbo) * 3, Math.cos(c.rumbo) * 3)).z - s0.z) / 3)) / d2r : 0,
    terr: s0.p, cielo: s0.ci, t: c.t, dosis: c.dosis, terreno: s0.ar ? -2 : -3, min: -1 };
  if (minP > EVA.refugio) una('lejos' + Math.round(dP / 150), () => miMsg('a2', lg(`Estás a ${miNum(minP)} min del PMR (más de ${EVA.refugio}). Volvé hacia el refugio.`, `You are ${miNum(minP)} min from the PMR (over ${EVA.refugio}). Head back to the shelter.`), 'alerta'));
  if (c.t > EVA.nom * 0.75) una('tresc', () => miMsg('base', lg(`Van ${miH(c.t)} afuera: empezá a volver (salida nominal ${EVA.nom} h).`, `${miH(c.t)} outside: start heading back (nominal EVA ${EVA.nom} h).`), 'alerta'));
  // barra, visor y pantalla
  $('miD1').textContent = miH(c.t); $('miD2').textContent = miM(c.odo); $('miD3').textContent = `${miNum(q.marcha, 1)}°`; $('miC3').classList.toggle('alerta', s0.p > PR.pMax); $('miD4').textContent = `${miNum(c.dosis, 1)} µSv`;
  if (m.hud) {
    $('miReloj').textContent = miT(c.t);
    $('miHFlecha').style.transform = `rotate(${Math.atan2((pmr.lon - lo) * Math.cos(la * d2r), pmr.lat - la) - MI.cam.h}rad)`; $('miHProx').innerHTML = `PMR · ${miM(dP)}`;
    const hp = $('miHPend'); hp.textContent = `${miNum(s0.p, 1)}° / ${PR.pMax}°`; hp.classList.toggle('al', s0.p > PR.pMax);
    $('miHMin').textContent = s0.ar ? lg('arena probable', 'probable sand') : lg('suelo firme', 'firm ground');
    $('miHDosis').textContent = `${miNum(c.dosis, 1)} µSv`; $('miHCielo').textContent = `${miNum(s0.ci * 100)} %`;
    $('miHRefD').textContent = miM(dP); const ht = $('miHRefT'); ht.textContent = `${miNum(minP)} min`; ht.classList.toggle('al', minP > EVA.refugio);
  }
  if (m.pant && performance.now() - (MI.par?.ultMapa || 0) > 300) {
    if (MI.par) MI.par.ultMapa = performance.now();
    const celda = (v, et, al = false) => `<div class="${al ? 'alerta' : ''}"><b>${v}</b><span>${et}</span></div>`;
    $('miPTramo').innerHTML = `<b>${lg('Astronauta 1 · a mano', 'Astronaut 1 · walking by hand')}</b><div class="sub">${lg('Fuera de la ruta calculada: el PMR sigue tu posición y te avisa los límites.', 'Off the computed route: the PMR follows your position and flags the limits.')}</div>`;
    $('miPRej').innerHTML = celda(`${miNum(s0.p, 1)}°`, lg('pendiente · A1', 'slope · A1'), s0.p > PR.pMax) + celda(`${miNum(c.dosis, 1)} µSv`, lg('dosis acumulada', 'accumulated dose'))
      + celda(`${miNum(minP)} min`, lg(`al PMR · ${miM(dP)}`, `to PMR · ${miM(dP)}`), minP > EVA.refugio) + celda(`${miH(c.t)} / ${EVA.nom} h`, lg('tiempo afuera', 'time outside'), c.t > EVA.nom * 0.75)
      + celda(`${miNum(s0.ci * 100)} %`, lg('cielo tapado', 'sky blocked')) + celda(s0.ar ? lg('arena', 'sand') : lg('firme', 'firm'), lg('suelo', 'ground'), !!s0.ar);
    try { miMapa(q); } catch {}
  }
}

// ---------- Nuevo recorrido: pines del usuario, avisos de peligro y ruta más segura ----------
function urCapa() {
  if (!UR.ds) { UR.ds = new C.CustomDataSource('nuevoRecorrido'); viewer.dataSources.add(UR.ds); }
  const ds = UR.ds; ds.entities.removeAll();
  const ini = urSalida();
  const pin = (txt, col, lon, lat, nombre) => ds.entities.add({ position: pos(lon, lat), properties: { tipo: 'urpin', nombre },
    billboard: { image: miChip(txt, col, true), scale: 0.5, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY } });
  if (ini) pin(UR.salida === 'base' ? 'BG' : 'S', '#ffcf7a', ini[0], ini[1], lg('Salida', 'Start'));
  UR.pines.forEach((p, i) => pin(String(i + 1), UR_COL.pin, p[0], p[1], lg(`Pin ${i + 1}`, `Pin ${i + 1}`)));
  const linea = (pts, col, ancho, z, dash) => ds.entities.add({ polyline: { positions: pts.map(p => pos(p[0], p[1])), width: ancho, clampToGround: true, zIndex: z,
    material: dash ? new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString(col), dashLength: 16 }) : C.Color.fromCssColorString(col) } });
  const A = UR.an;
  if (A) { linea(A.L.pts, '#1b1210', 8, 20); for (const t of A.trozos) linea(t.pts, UR_COL[t.clase], 5, 21); }
  else if (ini && UR.pines.length) { const v = [ini, ...UR.pines]; linea(v, '#1b1210', 7, 20); linea(v, UR_COL.ok, 4, 21, true); }
  if (UR.seguro) { linea(UR.seguro.L.pts, '#1b1210', 7, 22); linea(UR.seguro.L.pts, UR_COL.seguro, 4, 23, true); }
  miVisibles();
}
function urSalida() {
  if (!MI.D) return null;
  if (UR.salida === 'base') return [MI.D.pmr.lon, MI.D.pmr.lat];
  const c = MI.D.curiosity; return corrido(c.lon, c.lat, -6, -6);       // a unos metros de Curiosity: donde estaciona el PMR
}
// recorre la línea muestreada y la corta en trozos según el terreno: firme, difícil (arena o cerca del límite) o peligroso (sobre el límite)
function urAnalizar(v, ix = v.map((_, i) => i)) {     // ix: posiciones de la salida y de cada pin dentro de v
  const PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, lim = UR.aPie ? PR.pMax : PR.rMax;
  const L = pmrLinea(v, UR.aPie), pts = L.pts, trozos = [], av = [];
  const clase = p => !pmrDentro(p[0], p[1]) ? 'fuera' : p[5] > lim ? 'peligro' : (p[9] === -2 || p[5] > lim - 5) ? 'dificil' : 'ok';
  let act = null;
  for (const p of pts) { const k = clase(p); if (!act || act.clase !== k) { if (act) act.pts.push([p[0], p[1]]); act = { clase: k, pts: [[p[0], p[1]]], d0: p[2] }; trozos.push(act); } act.pts.push([p[0], p[1]]); act.d1 = p[2]; }
  // trozos firmes o difíciles de menos de 15 m se suman al anterior (sin eso la línea parpadea de color); lo peligroso y lo sin datos se muestra siempre
  for (let i = trozos.length - 1; i > 0; i--) { const t = trozos[i], a = trozos[i - 1];
    if ((t.d1 - t.d0) < 15 && t.clase !== 'peligro' && t.clase !== 'fuera' && a.clase !== 'peligro' && a.clase !== 'fuera') { a.pts.push(...t.pts.slice(1)); a.d1 = t.d1; if (t.clase === 'dificil') a.clase = 'dificil'; trozos.splice(i, 1); } }
  for (let i = trozos.length - 1; i > 0; i--) if (trozos[i].clase === trozos[i - 1].clase) { trozos[i - 1].pts.push(...trozos[i].pts.slice(1)); trozos[i - 1].d1 = trozos[i].d1; trozos.splice(i, 1); }
  // tramo de pin a pin: dónde empieza cada uno sobre la línea
  const acum = [0]; for (let i = 1; i < v.length; i++) acum.push(acum[i - 1] + miDist(v[i - 1][0], v[i - 1][1], v[i][0], v[i][1]));
  const cortes = ix.map(i => acum[i]);
  const nombre = i => { const a = i === 0 ? lg('salida', 'start') : `${i}`, b = i + 1 > UR.pines.length ? lg('salida', 'start') : `${i + 1}`; return `${a} → ${b}`; };
  for (let i = 0; i < cortes.length - 1; i++) {
    const seg = pts.filter(p => p[2] >= cortes[i] - 0.1 && p[2] <= cortes[i + 1] + 0.1); if (!seg.length) continue;
    const paso = seg.length > 1 ? (seg[seg.length - 1][2] - seg[0][2]) / (seg.length - 1) : 0;
    const peor = Math.max(...seg.map(p => p[5])), nP = seg.filter(p => p[5] > lim).length * paso, nA = seg.filter(p => p[9] === -2).length * paso, nF = seg.filter(p => !pmrDentro(p[0], p[1])).length * paso;
    if (nF > 0) av.push({ clase: 'fuera', txt: lg(`Tramo ${nombre(i)}: ${miM(nF)} fuera del terreno con datos de 12 m. Ahí no podemos medir pendiente ni arena.`, `Leg ${nombre(i)}: ${miM(nF)} outside the 12 m terrain data. We cannot measure slope or sand there.`) });
    if (nP > 0) av.push({ clase: 'peligro', txt: lg(`Tramo ${nombre(i)}: ${miM(nP)} sobre pendientes de más de ${lim}° (la más fuerte, ${miNum(peor)}°). ${UR.aPie ? 'El traje no está pensado para eso: riesgo de caída.' : 'El PMR no la pasa.'}`, `Leg ${nombre(i)}: ${miM(nP)} on slopes over ${lim}° (steepest ${miNum(peor)}°). ${UR.aPie ? 'The suit is not meant for that: fall risk.' : 'The PMR cannot take it.'}`) });
    else if (peor > lim - 5) av.push({ clase: 'dificil', txt: lg(`Tramo ${nombre(i)}: pendiente de hasta ${miNum(peor)}°, cerca del límite de ${lim}°. Se puede, pero cansa y es más lento.`, `Leg ${nombre(i)}: slope up to ${miNum(peor)}°, close to the ${lim}° limit. Doable, but tiring and slower.`) });
    if (nA > 0) av.push({ clase: 'dificil', txt: lg(`Tramo ${nombre(i)}: ${miM(nA)} de arena probable. ${UR.aPie ? 'Se camina más lento y se gasta más.' : 'Riesgo de que las ruedas se entierren.'}`, `Leg ${nombre(i)}: ${miM(nA)} of probable sand. ${UR.aPie ? 'Slower walking, more effort.' : 'Risk of the wheels digging in.'}`) });
  }
  if (UR.aPie) {
    const lejos = Math.max(...pts.map(p => miDist(v[0][0], v[0][1], p[0], p[1]))), minR = lejos / PR.vCam / 60;
    if (L.horas > EVA.max) av.push({ clase: 'peligro', txt: lg(`Son ${miH(L.horas)} de marcha: más que el máximo del traje (${EVA.max} h).`, `${miH(L.horas)} of walking: more than the suit maximum (${EVA.max} h).`) });
    else if (L.horas > EVA.nom) av.push({ clase: 'dificil', txt: lg(`Son ${miH(L.horas)} de marcha: más que la salida nominal de ${EVA.nom} h.`, `${miH(L.horas)} of walking: longer than the nominal ${EVA.nom} h EVA.`) });
    if (minR > EVA.refugio) av.push({ clase: 'dificil', txt: lg(`En el punto más lejano quedás a ${miNum(minR)} min del PMR (supuesto: no más de ${EVA.refugio} min de un refugio).`, `At the farthest point you are ${miNum(minR)} min from the PMR (assumption: no more than ${EVA.refugio} min from a shelter).`) });
  } else { const bat = L.kwh / miBat() * 100; if (bat > 70) av.push({ clase: bat > 100 ? 'peligro' : 'dificil', txt: lg(`Usa el ${miNum(bat)} % de la batería del PMR (cálculo propio).`, `Uses ${miNum(bat)} % of the PMR battery (our calculation).`) }); }
  return { L, trozos, av, lim };
}
function urVertices() { const ini = urSalida(); const v = [ini, ...UR.pines]; if (UR.volver && UR.pines.length) v.push(ini); return v; }
async function urCalcular() {
  UR.seguro = null;
  if (!UR.pines.length) { UR.an = null; urCapa(); return urFicha(); }
  UR.an = urAnalizar(urVertices()); urCapa(); urFicha();
  const n = UR.an.av.filter(a => a.clase === 'peligro').length, d = UR.an.av.filter(a => a.clase !== 'peligro').length;
  if (n) miCard(lg('Nuevo recorrido', 'New route'), lg('Ojo: tu recorrido pasa por zonas peligrosas', 'Careful: your route crosses dangerous ground'),
    UR.an.av.filter(a => a.clase === 'peligro').map(a => a.txt).join(' '), [[lg('Ver la ruta más segura', 'Show the safest route'), urSeguro, true], [lg('Seguir igual', 'Keep it anyway'), () => miCard()]]);
  else if (d) miCard(lg('Nuevo recorrido', 'New route'), lg('Tu recorrido tiene tramos difíciles', 'Your route has hard stretches'), UR.an.av.map(a => a.txt).join(' ').slice(0, 300), [[lg('Entendido', 'Got it'), () => miCard(), true], [lg('Ver la ruta más segura', 'Show the safest route'), urSeguro]]);
}
async function urSeguro() {
  if (!UR.pines.length) return;
  miCard(lg('Nuevo recorrido', 'New route'), lg('Calculando la ruta más segura…', 'Computing the safest route…'), lg('A* sobre el terreno de 12 m, uniendo tus pines en el mismo orden.', 'A* over the 12 m terrain, joining your pins in the same order.'), []);
  await new Promise(r => setTimeout(r, 30));
  const v = urVertices(), out = [v[0]], ix = [0];
  for (let i = 1; i < v.length; i++) { const r = pmrRuta(v[i - 1], v[i], UR.aPie); out.push(...r.v.slice(1)); ix.push(out.length - 1); }
  UR.seguro = { v: out, ix, L: pmrLinea(out, UR.aPie), an: urAnalizar(out, ix) }; urCapa(); urFicha(); miCard();
}
function urFicha() {
  const A = UR.an, S = UR.seguro, PR = MI.D.parametros.PR;
  const res = (X, t) => X ? `<div class="ind"><div><small>${t}</small><b>${miM(X.L.largo)}</b></div><div><small>${UR.aPie ? lg('Tiempo de marcha', 'Walking time') : lg('Tiempo de manejo', 'Driving time')}</small><b>${miH(X.L.horas)}</b></div>
    <div><small>${lg('Dosis', 'Dose')}</small><b>${miNum(X.L.dosis, 1)} <small>µSv</small></b></div><div><small>${lg('Pendiente máx. de marcha', 'Max. walking slope')}</small><b>${miNum(X.L.maxMarcha, 1)}°</b></div></div>` : '';
  const col = { peligro: UR_COL.peligro, dificil: UR_COL.dificil, fuera: UR_COL.fuera };
  miFicha(lg('Nuevo recorrido', 'New route'), `<p class="sub">${lg('Poné pines en el mapa (uno o más). Los unimos en línea recta, en el orden en que los pusiste, y te avisamos dónde el terreno es peligroso o difícil. Si querés, calculamos la ruta más segura que pasa por los mismos pines.', 'Drop pins on the map (one or more). We join them in a straight line, in the order you placed them, and flag where the ground is dangerous or hard. If you want, we compute the safest route through the same pins.')}</p>
    <div class="mi-bts" style="margin:6px 0">${bt(UR.marcando ? lg('Listo con los pines', 'Done with pins') : lg('+ Poner pines', '+ Drop pins'), 'urmarcar', '', !UR.marcando)}${bt(lg('Deshacer', 'Undo'), 'urdeshacer')}${bt(lg('Vaciar', 'Clear'), 'urvaciar')}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">
      <span class="mi-seg"><button data-urq="pie" aria-pressed="${UR.aPie}">${lg('A pie', 'On foot')}</button><button data-urq="pmr" aria-pressed="${!UR.aPie}">PMR</button></span>
      <span class="mi-seg"><button data-urs="hoy" aria-pressed="${UR.salida === 'hoy'}">${lg('Sale de Curiosity hoy', 'From Curiosity today')}</button><button data-urs="base" aria-pressed="${UR.salida === 'base'}">${lg('Sale de la Base Gale', 'From Gale Base')}</button></span></div>
    <label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-size:13px"><input type="checkbox" id="urVolver" ${UR.volver ? 'checked' : ''}> ${lg('Volver a la salida al final', 'Return to the start at the end')}</label>
    <h2>${lg('Tus pines', 'Your pins')} (${UR.pines.length})</h2>
    <div class="mi-lista">${UR.pines.length ? UR.pines.map((p, i) => `<div class="ur-pin"><span class="mi-pill" style="background:${UR_COL.pin}">${i + 1}</span>${p[1].toFixed(5)}°, ${p[0].toFixed(5)}° E<small>${miNum(pmrMuestra(p[0], p[1]).p, 1)}°</small><button data-urq-x="${i}" title="${lg('Quitar', 'Remove')}">×</button></div>`).join('')
      : `<p class="sub" style="padding:6px 9px">${lg('Todavía no hay pines: tocá «+ Poner pines» y después el mapa.', 'No pins yet: tap "+ Drop pins" and then the map.')}</p>`}</div>
    ${A ? `<h2>${lg('Tu recorrido', 'Your route')}</h2>${res(A, lg('Largo', 'Length'))}
      ${A.av.length ? A.av.map(a => `<div class="ur-aviso" style="--c:${col[a.clase]}"><b>${a.clase === 'peligro' ? lg('Peligro', 'Danger') : a.clase === 'fuera' ? lg('Sin datos', 'No data') : lg('Difícil', 'Hard')}.</b> ${a.txt}</div>`).join('')
        : `<div class="ur-aviso" style="--c:${UR_COL.seguro}"><b>${lg('Sin avisos', 'No warnings')}.</b> ${lg(`Todo el recorrido queda bajo ${A.lim}° y fuera de la arena probable.`, `The whole route stays under ${A.lim}° and off probable sand.`)}</div>`}
      <p class="sub"><span style="color:${UR_COL.ok}">■</span> ${lg('firme', 'firm')} · <span style="color:${UR_COL.dificil}">■</span> ${lg('difícil (arena o a menos de 5° del límite)', 'hard (sand or within 5° of the limit)')} · <span style="color:${UR_COL.peligro}">■</span> ${lg(`peligroso (más de ${A.lim}°)`, `dangerous (over ${A.lim}°)`)} · <span style="color:${UR_COL.fuera}">■</span> ${lg('sin datos', 'no data')}</p>` : ''}
    ${S ? `<h2>${lg('Ruta más segura por tus pines', 'Safest route through your pins')}</h2>${res(S, lg('Largo', 'Length'))}<p class="sub">${S.an.av.filter(a => a.clase === 'peligro').length ? lg('Aun así quedan tramos peligrosos: algún pin está en una ladera muy empinada.', 'Some dangerous stretches remain: a pin sits on a very steep slope.') : lg('Evita las pendientes de más del límite y la arena cuando puede (línea verde punteada).', 'It avoids slopes over the limit and sand where it can (dashed green line).')}</p>` : ''}
    <p class="fuente">${lg('Terreno: elevación de 12 m de la travesía, pendiente y arena probable (herramientas/terreno_pmr.py, sobre el DEM USGS de Gale). Límites: data/parametros.json (pendiente máxima 20°, provisorio). Velocidad a pie: función de Tobler; dosis: RAD, Hassler et al. 2014. Cálculo propio.', 'Terrain: 12 m traverse elevation, slope and probable sand (herramientas/terreno_pmr.py, from the USGS Gale DEM). Limits: data/parametros.json (max slope 20°, provisional). Walking speed: Tobler\'s function; dose: RAD, Hassler et al. 2014. Our calculation.')}</p>`,
    (A ? bt(lg('Ruta más segura', 'Safest route'), 'urseguro') : '') + (S ? bt(lg('Usar la más segura', 'Use the safest one'), 'urusar') : '') + (A ? bt(lg('Recorrer ▶', 'Follow it ▶'), 'urrecorrer', '', true) : ''), 'nuevo');
  document.body.classList.remove('mi-wiki-on');      // esta ficha no tiene versión aparte en la Wiki
  const c = cont(), on = (sel, f) => c.querySelector(sel) && (c.querySelector(sel).onclick = f);
  on('[data-mi="urmarcar"]', () => urMarcar(!UR.marcando));
  on('[data-mi="urdeshacer"]', () => { UR.pines.pop(); urCalcular(); });
  on('[data-mi="urvaciar"]', () => { UR.pines = []; urCalcular(); });
  on('[data-mi="urseguro"]', urSeguro);
  on('[data-mi="urusar"]', () => { if (!UR.seguro) return; UR.usarSeguro = true; urRecorrer(); });
  on('[data-mi="urrecorrer"]', () => { UR.usarSeguro = false; urRecorrer(); });
  c.querySelectorAll('[data-urq]').forEach(b => b.onclick = () => { UR.aPie = b.dataset.urq === 'pie'; urCalcular(); });
  c.querySelectorAll('[data-urs]').forEach(b => b.onclick = () => { UR.salida = b.dataset.urs; urCalcular(); urEncuadre(); });
  c.querySelectorAll('[data-urq-x]').forEach(b => b.onclick = () => { UR.pines.splice(+b.dataset.urqX, 1); urCalcular(); });
  $('urVolver').onchange = e => { UR.volver = e.target.checked; urCalcular(); };
}
function urMarcar(on) {
  UR.marcando = on; document.body.classList.toggle('ur-marcando', on); $('urIntNuevo').setAttribute('aria-pressed', String(on || UR.pines.length > 0));
  if (on) { if (PMR.marcar) pmrMarcar(false); miCard(lg('Nuevo recorrido', 'New route'), lg('Tocá el mapa para poner pines', 'Tap the map to drop pins'),
    lg('Cada toque agrega un pin (al menos uno). Vale dentro del terreno de la travesía, de Bradbury a la zona de hoy. Esc o «Listo» para terminar.', 'Each tap adds a pin (at least one). Works inside the traverse terrain, from Bradbury to today\'s area. Esc or "Done" to finish.'),
    [[lg('Listo', 'Done'), () => urMarcar(false), true], [lg('Deshacer', 'Undo'), () => { UR.pines.pop(); urCalcular(); }]]); }
  else { miCard(); urCalcular(); }
  if (MI.fichaClave === 'nuevo' && on) urFicha();
}
function urEncuadre() {
  const v = [urSalida(), ...UR.pines].filter(Boolean); if (!v.length) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of v) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const r = Math.max(400, miDist(x0, y0, x1, y1) * 0.9), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(cx, cy, alturaSuelo(cx, cy, null)), r), { offset: new C.HeadingPitchRange(0, -1.15, r * 2.4), duration: 2.2, pitchAdjustHeight: 1500000, easingFunction: C.EasingFunction.CUBIC_IN_OUT });
}
async function urAbrir() {
  if (MI.modo) miSalirModo(false);
  if (!(await miCargar())) return;
  try { await pmrTerreno(); } catch { return avisar(lg('No se pudo cargar el terreno de 12 m (abrí con abrir.bat).', 'Could not load the 12 m terrain (open with abrir.bat).')); }
  if (!MI.activo) { MI.activo = true; document.body.classList.add('mi-activo'); }
  urCapa(); urFicha(); urEncuadre(); urMarcar(true);
}
function urRecorrer() {
  const X = UR.usarSeguro && UR.seguro ? UR.seguro : UR.an; if (!X) return;
  urMarcar(false);
  const id = 'U' + (++UR.n), L = X.L, v = UR.usarSeguro && UR.seguro ? UR.seguro.v : urVertices();
  // cada pin es una parada: su distancia sobre la línea es la del punto más cercano
  const paradas = UR.pines.map((p, i) => { let best = 0, bd = Infinity; for (const q of L.pts) { const d = miDist(p[0], p[1], q[0], q[1]); if (d < bd && q[2] >= best - 1) { bd = d; best = q[2]; } }
    const pid = `${id}-${i + 1}`, av = (X.an?.av || X.av || []).map(a => a.txt).join(' ');
    MI.paradas[pid] = { id: pid, codigo: String(i + 1), nombre: lg(`Pin ${i + 1} de tu recorrido`, `Pin ${i + 1} of your route`), color: UR_COL.pin, lon: p[0], lat: p[1],
      motivo: lg(`Punto que elegiste. ${av ? 'Avisos: ' + av : 'Sin avisos de terreno.'}`, `A point you chose. ${av ? 'Warnings: ' + av : 'No terrain warnings.'}`), ficha: '' };
    return { id: pid, d: best }; }).sort((a, b) => a.d - b.d);
  MI.lineas[id] = { ...L, id, nombre: (UR.aPie ? lg('Tu recorrido · a pie', 'Your route · on foot') : lg('Tu recorrido · PMR', 'Your route · PMR')) + (UR.usarSeguro ? lg(' (más segura)', ' (safest)') : ''),
    tipo: UR.aPie ? 'astronauta' : 'tripulado', color: UR_COL.ok, paradas, idaVuelta: UR.aPie && UR.volver, pmr: UR.aPie ? { lon: v[0][0], lat: v[0][1], rumbo: 0, elev: pmrMuestra(v[0][0], v[0][1]).z } : undefined };
  UR.id = id;
  miModo(id, 'ruta');
}
// clic en el mapa mientras se ponen pines (antes que el resto de los clics)
{
  const ss = viewer.screenSpaceEventHandler, previo = ss.getInputAction(C.ScreenSpaceEventType.LEFT_CLICK);
  ss.setInputAction(m => {
    if (UR.marcando && !MI.modo) {
      const c = viewer.scene.pickPosition(m.position) || viewer.camera.pickEllipsoid(m.position, MARS); if (!c) return;
      const g = MARS.cartesianToCartographic(c), lon = C.Math.toDegrees(g.longitude), lat = centrica(C.Math.toDegrees(g.latitude));
      if (!pmrDentro(lon, lat)) return avisar(lg('Ese punto está fuera del terreno con datos de 12 m (de Bradbury a la zona de hoy).', 'That point is outside the 12 m terrain data (from Bradbury to today\'s area).'));
      if (UR.pines.length >= 20) return avisar(lg('Hasta 20 pines por recorrido.', 'Up to 20 pins per route.'));
      UR.pines.push([lon, lat]); urCalcular(); return;
    }
    if (previo) previo(m);
  }, C.ScreenSpaceEventType.LEFT_CLICK);
  addEventListener('keydown', e => { if (e.key === 'Escape' && UR.marcando) { e.preventDefault(); e.stopImmediatePropagation(); urMarcar(false); } }, true);
}

// ---------- fluidez: menos detalle mientras la cámara se mueve, todo el detalle al quedarse quieta ----------
// Lo que más traba es pedir teselas finas en cada cuadro del vuelo (error de pantalla 1,5 px, más fino que el 2 de Cesium por defecto)
// y bajar demasiadas a la vez. Mientras la cámara se mueve se pide menos detalle y, 350 ms después de parar, se vuelve al detalle completo.
{
  const G = viewer.scene.globe, base = { sse: G.maximumScreenSpaceError, lim: Math.min(G.loadingDescendantLimit, 20) };
  G.loadingDescendantLimit = base.lim;
  let t = null, mov = false;
  const movimiento = () => { clearTimeout(t); if (!mov) { mov = true; base.sse = G.maximumScreenSpaceError; G.maximumScreenSpaceError = Math.max(base.sse, 2.6); } };
  const quieto = () => { clearTimeout(t); t = setTimeout(() => { if (mov) { mov = false; G.maximumScreenSpaceError = base.sse; } }, 350); };
  // en un recorrido la cámara se mueve sola todo el tiempo: ahí se deja el detalle fijo (2) para que no "respire"
  viewer.camera.moveStart.addEventListener(() => { if (!MI.modo && !(typeof TOUR !== 'undefined' && TOUR.activo)) movimiento(); });
  viewer.camera.moveEnd.addEventListener(quieto);
  // ?fps muestra los cuadros por segundo (para medir antes y después)
  if (/[?&]fps\b/.test(location.search)) viewer.scene.debugShowFramesPerSecond = true;
}
window.__maps = { UR, abrir: urAbrir, base: urIrBase, control: urControl, analizar: urAnalizar };

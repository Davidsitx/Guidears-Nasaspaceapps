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
  rec.innerHTML = `<i></i>${lg('Nueva misión', 'New mission')}`;
  rec.title = lg('La misión nueva: las rutas planificadas desde la posición de Curiosity hoy (A, B, C, T y expedición sur), con la Base Gale, el PMR y la misión en pareja', 'The new mission: the planned routes from Curiosity\'s position today (A, B, C, T and southern expedition), with Gale Base, the PMR and the two-person mission');
  rec.insertAdjacentHTML('beforebegin', `<button class="mi-int" id="urIntNuevo" style="--c:${UR_COL.ok}" aria-pressed="false" title="${lg('Armá tu propio recorrido con pines en el mapa: te avisa si pasa por pendientes peligrosas, arena o fuera del terreno con datos', 'Build your own route with pins on the map: it warns you about dangerous slopes, sand or areas without terrain data')}"><i></i>${lg('Nuevo recorrido', 'New route')}</button>`);
  rec.onclick = async () => { const on = rec.getAttribute('aria-pressed') !== 'true'; await miVerRecorrido(on); if (on) miEntrar(); };
  // primer toque: abre el armado; con un recorrido ya armado, el botón lo muestra u oculta
  $('urIntNuevo').onclick = () => {
    const b = $('urIntNuevo'), on = b.getAttribute('aria-pressed') === 'true';
    if (!on || !UR.ds) return urAbrir();
    urMarcar(false); UR.oculto = !UR.oculto; b.setAttribute('aria-pressed', String(!UR.oculto)); miVisibles();
    if (!UR.oculto) { urFicha(); urEncuadre(); }
  };
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
// El botón "Base" del riel es el análisis de sitios (dónde conviene poner la base); la Base Gale en sí está en la barra de la misión.
// Vuela a ver todos los sitios juntos y deja arriba una tarjeta que lleva a la Base Gale elegida.
{
  const rb = document.querySelector('.rb[data-t="base"]');
  if (rb) { rb.lastChild.textContent = lg('Sitios', 'Sites'); rb.title = lg('Dónde poner la base: los sitios candidatos en Gale, con agua, pendiente y radiación', 'Where to put the base: the candidate sites in Gale, with water, slope and radiation'); }
  rb?.addEventListener('click', () => setTimeout(() => {
    $('cajonTitulo').textContent = lg('Sitios para la base', 'Sites for the base');
    if (typeof SITIOS !== 'undefined' && SITIOS.length) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const s of SITIOS) { x0 = Math.min(x0, s.lon); x1 = Math.max(x1, s.lon); y0 = Math.min(y0, s.lat); y1 = Math.max(y1, s.lat); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.max(4000, miDist(x0, y0, x1, y1) * 0.6);
      viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(cx, cy, -4300), r), { offset: new C.HeadingPitchRange(0.2, -0.75, r * 2.6), duration: 2.4, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 1500000, maximumHeight: 3000000 });
    }
    const c = cont(); if (!c || c.querySelector('#urTBase')) return;
    c.insertAdjacentHTML('afterbegin', `<div class="tarjeta" id="urTBase"><span class="chip" style="background:#ffcf7a"></span><b>${lg('Base Gale · Zona 2 (elegida)', 'Gale Base · Zone 2 (chosen)')}</b>
      <div class="sub">${lg('La base de la misión nueva, con sus partes, ficha y fuente. Tocá para ir.', 'The new mission\'s base, with its parts, card and source. Tap to go.')} <span class="prov">${lg('propuesta propia', 'our proposal')}</span></div></div>`);
    $('urTBase').onclick = async () => { if (await miCargar()) { fichaBase(); urIrBase(); } };
  }, 0));
}

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
    if (UR.ds) UR.ds.show = !UR.oculto && (!m || m.id === UR.id);
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
$('miSalir').insertAdjacentHTML('beforebegin', `<button class="mib" id="urControl" aria-pressed="false" title="${lg('Manejar al astronauta con el teclado (W A S D o flechas; Shift ×10). Volvé a tocar para seguir la ruta.', 'Walk the astronaut yourself with the keyboard (W A S D or arrows; Shift ×10). Tap again to go back to the route.')}">${lg('Manejar al astronauta', 'Walk the astronaut')}</button>`);
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
    document.body.classList.toggle('ur-apie', !m.libre);
    $('urControl').setAttribute('aria-pressed', 'false');
    $('urControl').innerHTML = (m.trip ? lg('Manejar el PMR', 'Drive the PMR') : m.rover ? lg(`Manejar ${MI.rover === 'gx2' ? 'el GX-2' : 'a Curiosity'}`, `Drive ${MI.rover === 'gx2' ? 'the GX-2' : 'Curiosity'}`) : lg('Manejar al astronauta', 'Walk the astronaut'));
    if (tipo === 'pareja') miMsg('base', lg('Si querés, manejá vos al Astronauta 1 con «Manejar al astronauta» (W A S D). Te avisamos pendiente, arena, dosis y distancia al PMR.', 'If you like, walk Astronaut 1 yourself with "Walk the astronaut" (W A S D). We will flag slope, sand, dose and distance to the PMR.'));
    if (/^U\d+$/.test(id)) { miVisibles(); $('miPid').textContent = lg('Tú', 'You'); }
  };
  const salir0 = miSalirModo;
  miSalirModo = function (volver = true) { document.body.classList.remove('ur-ley', 'ur-apie', 'ur-control'); salir0(volver); };
  const tick0 = miTick;
  miTick = function (dt) { const m = MI.modo; if (m?.control) { try { miAnimPMR(dt); } catch {} return urAstroTick(dt); } return tick0(dt); };
}
$('urControl').onclick = () => urControl(!MI.modo?.control);
async function urControl(on) {
  const m = MI.modo; if (!m || m.libre) return;
  if (on) {
    try { await pmrTerreno(); } catch { return avisar(lg('No se pudo cargar el terreno de 12 m.', 'Could not load the 12 m terrain.')); }
    const q = enLinea(m.L, m.d), qb = enLinea(m.L, Math.min(m.L.largo, m.d + 3));
    m.jugando = false; $('miPlayB').textContent = lg('▶ Seguir', '▶ Resume');
    m.control = { lon: q.lon, lat: q.lat, rumbo: rumboDe(q, qb), v: 0, odo: 0, t: q.t || 0, dosis: q.dosis || 0, teclas: {}, vistos: new Set(), mov: 0 };
    document.body.classList.add('ur-control'); MI.siguiendo = true;
    if (m.rover) miCard(lg('Manejo a mano', 'Driving by hand'), lg('Lo manejás vos', 'You drive it'),
      lg(`W o ↑ adelante, S o ↓ atrás, A D o ← → para girar, Shift ×10. No sube pendientes de más de ${MI.D.parametros.PR.rMax}°; en la arena avisa (riesgo de enterrarse). ${m.trip ? 'Velocidad del PMR: 10 km/h.' : 'Curiosity maneja a unos 100 m por hora: acá el tiempo va 30 veces más rápido.'}`,
        `W or ↑ forward, S or ↓ back, A D or ← → to turn, Shift ×10. It will not climb slopes over ${MI.D.parametros.PR.rMax}°; it warns on sand (risk of getting stuck). ${m.trip ? 'PMR speed: 10 km/h.' : 'Curiosity drives about 100 m per hour: here time runs 30 times faster.'}`),
      [[lg('Entendido', 'Got it'), () => miCard(), true]]);
    else miCard(lg('Astronauta a mano', 'Walking by hand'), lg('Lo manejás vos', 'You walk it'),
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
  const rov = m.rover, lim = rov ? PR.rMax : PR.pMax, vBase = m.trip ? PR.vTrip / 3600 : rov ? PR.vRover / 3600 * 30 : PR.vCam;
  const aqui = pmrMuestra(c.lon, c.lat), vmax = vBase * rap * (aqui.ar ? (rov ? 0.5 : 0.7) : 1);
  c.v += (ade * vmax - c.v) * Math.min(1, dt * 3); c.rumbo += giro * dt * 1.2;
  const una = (clave, f) => { if (!c.vistos.has(clave)) { c.vistos.add(clave); f(); } };
  const paso = c.v * dt; let [lo, la] = corrido(c.lon, c.lat, Math.sin(c.rumbo) * paso, Math.cos(c.rumbo) * paso);
  if (Math.abs(paso) > 1e-5) {
    const s = Math.sign(paso), [lo2, la2] = corrido(c.lon, c.lat, Math.sin(c.rumbo) * 4 * s, Math.cos(c.rumbo) * 4 * s);
    const ad = pmrDentro(lo2, la2) ? pmrMuestra(lo2, la2) : null, marcha = ad ? Math.abs(Math.atan((ad.z - aqui.z) / 4)) / d2r : 0;
    if (!ad) { c.v = 0; lo = c.lon; la = c.lat; una('borde', () => miMsg('base', lg('Fin del terreno con datos de 12 m: no sigas por ahí.', 'End of the 12 m terrain data: do not go further that way.'), 'alerta')); }
    else if (ad.p > lim && marcha > lim * 0.6) { c.v = 0; lo = c.lon; la = c.lat;
      una('p' + Math.round(lo2 * 1e4) + Math.round(la2 * 1e4), () => miMsg(rov ? 'base' : 'a2', rov ? lg(`Pendiente de ${miNum(ad.p)}° adelante: el rover no la pasa (límite ${lim}°). Rodeala.`, `Slope of ${miNum(ad.p)}° ahead: the rover cannot take it (limit ${lim}°). Go around.`) : lg(`Pendiente de ${miNum(ad.p)}° adelante: el traje no la pasa (límite ${lim}°). Rodeala.`, `Slope of ${miNum(ad.p)}° ahead: the suit cannot take it (limit ${lim}°). Go around.`), 'alerta')); }
    else { c.odo += Math.abs(paso); if (aqui.ar) una('ar' + Math.round(c.odo / 80), () => miMsg(rov ? 'base' : 'a2', rov ? lg('Arena probable: riesgo de que las ruedas se entierren. Salí de ahí.', 'Probable sand: risk of the wheels digging in. Get out of there.') : lg('Arena probable: vas más lento y cuesta más.', 'Probable sand: slower and harder going.'), rov ? 'alerta' : undefined)); }
  }
  c.t += dt * rap / 3600 * (Math.abs(c.v) > 0.01 ? 1 : 1); c.dosis += PR.dosis * 1000 / 24 * (1 - PR.k * aqui.ci) * dt * rap / 3600;
  c.lon = lo; c.lat = la; const s0 = pmrMuestra(lo, la);
  c.mov += ((Math.abs(c.v) > 0.05 ? 1 : 0) - c.mov) * Math.min(1, dt * 6);
  let obj = pos(lo, la, alturaSuelo(lo, la, s0.z));
  if (rov) { const mod = m.trip ? MI.mod.pmr : MI.mod[MI.rover]; if (mod) { mod.show = true; obj = m.trip ? colocar(mod, lo, la, c.rumbo, s0.z, 4.0, 3.2, true) : colocar(mod, lo, la, c.rumbo, s0.z, MI.rover === 'gx2' ? 3.4 : 2.2, 2.5, true); if (m.trip) m.pmrEn = { lon: lo, lat: la, rumbo: c.rumbo, elev: s0.z }; } }
  else { const a = MI.mod.astronauta; if (a) { a.show = m.vista !== 'ojos'; obj = colocar(a, lo, la, c.rumbo, s0.z, 0, 0, false); if (a.show) pasoAstro(a, c.odo / MI.D.parametros.zancada * Math.PI * 2, c.mov, 0); } }
  miCamara(dt, obj, c.rumbo, { vista: m.vista, trip: !!m.trip, rover: !!rov, libre: true });
  if (rov) { $('miD1').textContent = miH(c.t); $('miD2').textContent = miM(c.odo); $('miD3').textContent = `${miNum(s0.p, 1)}°`; $('miC3').classList.toggle('alerta', s0.p > lim); return; }
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
  UR.marcando = on; document.body.classList.toggle('ur-marcando', on); $('urIntNuevo').setAttribute('aria-pressed', String(!UR.oculto && (on || UR.pines.length > 0)));
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
  if (MI.modo) miSalirModo(false); UR.oculto = false;
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
  // el detalle de reposo se guarda una sola vez (si se volviera a leer en cada movimiento, un tour empezado en pleno giro quedaría con poco detalle para siempre)
  const G = viewer.scene.globe, BASE = G.maximumScreenSpaceError;
  G.loadingDescendantLimit = Math.min(G.loadingDescendantLimit, 20);
  // (tileCacheSize queda en el valor de _cuerpo.html: subirlo a 600+ llenaba la memoria de la placa y aparecían teselas negras)
  let t = null, mov = false;
  const movimiento = () => { clearTimeout(t); if (!mov) { mov = true; G.maximumScreenSpaceError = Math.max(BASE, 2.6); } };
  const quieto = () => { clearTimeout(t); t = setTimeout(() => { if (mov && !(typeof TOUR !== 'undefined' && TOUR.activo)) { mov = false; G.maximumScreenSpaceError = BASE; } }, 350); };
  // en un recorrido la cámara se mueve sola todo el tiempo: ahí se deja el detalle fijo (2) para que no "respire"
  viewer.camera.moveStart.addEventListener(() => { if (!MI.modo && !(typeof TOUR !== 'undefined' && TOUR.activo)) movimiento(); });
  viewer.camera.moveEnd.addEventListener(quieto);
  // ?fps muestra los cuadros por segundo (para medir antes y después)
  if (/[?&]fps\b/.test(location.search)) viewer.scene.debugShowFramesPerSecond = true;
}

// ---------- guardián del terreno: nunca un hueco negro ----------
// Cada 2 s mira una grilla de 64×36 puntos de la imagen. Un punto que cae sobre Marte (el rayo toca el elipsoide)
// y es negro puro es un hueco: ninguna foto ni sombra nuestra llega a negro (el tono más oscuro de la paleta es 38,22,16).
// Si el hueco sigue ahí en tres miradas seguidas (6 s, no es una tesela que todavía está bajando), se libera memoria
// de la placa de video y se vuelven a pedir todas las teselas. Se cuentan bloques de 2×2 puntos para no confundir
// el borde negro de los carteles con un hueco.
{
  const G = viewer.scene.globe, W = 64, H = 36, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d', { willReadFrequently: true }), P = new C.Cartesian2(), Q = new C.Cartesian3();
  let mirar = false, seguidas = 0, ultimo = 0;
  window.GUARDIAN = { reparaciones: 0, ultimoHueco: 0 };
  viewer.scene.postRender.addEventListener(() => {
    if (!mirar) return; mirar = false;
    if (typeof MODO !== 'undefined' && MODO !== 'globo') return;
    if (!G.show || document.body.classList.contains('intro')) return;
    let d; try { g2.drawImage(viewer.scene.canvas, 0, 0, W, H); d = g2.getImageData(0, 0, W, H).data; } catch { return; }
    const cw = viewer.scene.canvas.clientWidth, ch = viewer.scene.canvas.clientHeight, neg = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i] > 4 || d[i + 1] > 4 || d[i + 2] > 4) continue;
      P.x = (x + 0.5) * cw / W; P.y = (y + 0.5) * ch / H;
      if (viewer.camera.pickEllipsoid(P, MARS, Q)) neg[y * W + x] = 1;
    }
    let bloques = 0;
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) if (neg[y * W + x] && neg[y * W + x + 1] && neg[(y + 1) * W + x] && neg[(y + 1) * W + x + 1]) bloques++;
    GUARDIAN.ultimoHueco = bloques;
    // con la cámara "debajo" de una tesela gruesa (bajando a nivel del suelo) el negro es pasajero y lo tapa la cortina de abajo
    seguidas = bloques >= 2 && !viewer.scene.cameraUnderground ? seguidas + 1 : 0;
    if (seguidas >= 3 && (G.tilesLoaded || seguidas >= 8) && performance.now() - ultimo > 12000) {
      ultimo = performance.now(); seguidas = 0; GUARDIAN.reparaciones++;
      G.tileCacheSize = Math.max(150, Math.round(G.tileCacheSize * 0.6));   // libera texturas que no se ven
      try { G._surface.invalidateAllTiles(); } catch {}
      console.warn('[Maps in Mars] hueco en el terreno: se vuelven a pedir las teselas (vez ' + GUARDIAN.reparaciones + ')');
    }
  });
  setInterval(() => { if (document.hidden) return; mirar = true; viewer.scene.requestRender(); }, 2000);
}

// ---------- cortina mientras baja el terreno de cerca ----------
// Al bajar la cámara a nivel del suelo (un recorrido, el PMR en la base) las teselas finas tardan unos segundos y, mientras,
// la tesela gruesa queda por encima de la cámara: se veía una franja negra o blanca. Mientras Cesium avisa que la cámara
// quedó "debajo" del terreno dibujado, se tapa el 3D con una cortina y un aviso; se saca apenas llega el terreno fino.
document.head.insertAdjacentHTML('beforeend', `<style>
#urCortina{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(ellipse at 50% 60%,#3a261c 0%,#1a120e 70%);color:#e8eaed;font:500 14px system-ui,sans-serif}
#urCortina.vis{opacity:1}
#urCortina div{display:flex;gap:10px;align-items:center;background:rgba(20,21,24,.85);border:1px solid #ffffff14;border-radius:14px;padding:10px 16px}
#urCortina i{width:16px;height:16px;border-radius:50%;border:2px solid #ffffff33;border-top-color:var(--acento,#f28c38);animation:urGiro .8s linear infinite}
@keyframes urGiro{to{transform:rotate(360deg)}}
</style>`);
viewer.container.insertAdjacentHTML('beforeend', `<div id="urCortina" aria-live="polite"><div><i></i>${lg('Cargando el terreno de cerca…', 'Loading the close-up terrain…')}</div></div>`);
{
  const S = viewer.scene, el = $('urCortina'); let desde = 0, fuera = 0;
  S.postRender.addEventListener(() => {
    const ahora = performance.now(), abajo = S.cameraUnderground && S.globe.show;
    if (abajo) { fuera = 0; if (!desde) desde = ahora; } else { desde = 0; if (!fuera) fuera = ahora; }
    const ver = abajo ? (ahora - desde > 120 && ahora - desde < 25000) : false;
    if (ver !== el.classList.contains('vis') && (ver || ahora - fuera > 250)) el.classList.toggle('vis', ver);
  });
  // promesa: el terreno de cerca ya está (la cámara no quedó debajo de una tesela gruesa), con un tope
  window.urTerrenoListo = (tope = 8000) => new Promise(ok => { const t0 = performance.now(), mirar = () => {
    if (!S.cameraUnderground || performance.now() - t0 > tope) return ok(); setTimeout(mirar, 150); }; setTimeout(mirar, 250); });
}

// ==================== tanda 15/11 tarde: fluidez 2, pines del otro lado, cámara libre en los recorridos, botones ====================

// ---------- pines, carteles y naves del otro lado del planeta: no se dibujan a través de Marte ----------
// Los pines van sin prueba de profundidad para que el relieve cercano no los tape, y los carteles tienen un corrimiento al costado:
// desde lejos (el tour, la vista de todo Marte) se veían los del otro lado, y los nombres de las naves que pasaban por detrás del planeta.
// Ahora, si el punto queda detrás del horizonte, se oculta (pin, cartel y punto) y vuelve a aparecer cuando sale.
{
  const R0 = MARS.radii.x - 9000, esfera = new C.Ellipsoid(R0, R0, MARS.radii.z - 9000), vistos = new WeakSet(), lista = [];
  const props = ['billboard', 'label', 'point'];
  const juntar = () => {
    const t = viewer.clock.currentTime, cols = [viewer.entities]; for (let i = 0; i < viewer.dataSources.length; i++) cols.push(viewer.dataSources.get(i).entities);
    for (const col of cols) for (const e of col.values) {
      if (vistos.has(e) || !e.position) continue;
      const tipo = e.properties?.tipo?.getValue?.(t), nave = tipo === 'orbitador' || tipo === 'luna';
      const g = props.filter(k => e[k] && (nave || e[k].disableDepthTestDistance?.getValue?.(t) === Infinity || e[k].pixelOffset)); if (!g.length) continue;
      const fijo = e.position.isConstant; const p = fijo ? e.position.getValue(t) : null; if (fijo && !p) continue;
      vistos.add(e); lista.push({ e, g, p, fijo, oculto: false, prev: {} });
    }
  };
  let t0 = 0, n = 0; const _p = new C.Cartesian3();
  viewer.scene.preRender.addEventListener((sc, time) => {
    const t = performance.now(); if (t - t0 < 150) return; t0 = t;
    if (n++ % 15 === 0) juntar();
    const oc = new C.EllipsoidalOccluder(esfera, viewer.camera.positionWC);
    for (const it of lista) {
      const p = it.fijo ? it.p : it.e.position.getValue(time, _p); if (!p) continue;
      const tapado = !oc.isPointVisible(p); if (tapado === it.oculto) continue; it.oculto = tapado;
      for (const k of it.g) { const gr = it.e[k];
        if (tapado) { it.prev[k] = gr.show?.getValue ? gr.show.getValue(time) : gr.show; gr.show = false; }
        else gr.show = it.prev[k] ?? true; }
    }
  });
}

// ---------- líneas pegadas al suelo con menos vértices ----------
// Las rutas tienen un punto cada 1–5 m (más de 15.000 en total) y cada línea pegada al suelo se dibuja como un volumen:
// es de lo que más pesa al mover la cámara. Para dibujar se simplifican (Douglas-Peucker, 0,8 m de tolerancia); los datos no cambian.
function urSimplificar(ps, tol = 0.8) {
  if (!ps || ps.length < 60) return ps;
  const keep = new Uint8Array(ps.length); keep[0] = keep[ps.length - 1] = 1; const pila = [[0, ps.length - 1]], d = new C.Cartesian3(), q = new C.Cartesian3();
  while (pila.length) {
    const [a, b] = pila.pop(); if (b <= a + 1) continue;
    C.Cartesian3.subtract(ps[b], ps[a], d); const L2 = C.Cartesian3.magnitudeSquared(d) || 1; let mx = -1, k = -1;
    for (let i = a + 1; i < b; i++) { C.Cartesian3.subtract(ps[i], ps[a], q); const u = Math.max(0, Math.min(1, C.Cartesian3.dot(q, d) / L2));
      const dx = q.x - d.x * u, dy = q.y - d.y * u, dz = q.z - d.z * u, e = dx * dx + dy * dy + dz * dz; if (e > mx) { mx = e; k = i; } }
    if (mx > tol * tol) { keep[k] = 1; pila.push([a, k], [k, b]); }
  }
  return ps.filter((_, i) => keep[i]);
}
function urAliviar(col) {
  const t = viewer.clock.currentTime;
  for (const e of col.values) { const pl = e.polyline; if (!pl || pl._urSimple || !pl.clampToGround?.getValue?.(t)) continue;
    const ps = pl.positions?.getValue?.(t); if (!ps || ps.length < 60) continue;
    pl._urSimple = true; pl.positions = urSimplificar(ps); }
}
{
  const capa0 = miCapa; miCapa = function () { capa0(); if (MI.ds) urAliviar(MI.ds.entities); };
  if (typeof pmrCapa === 'function') { const g0 = pmrCapa; pmrCapa = function (...a) { const r = g0(...a); if (MI.ds) urAliviar(MI.ds.entities); return r; }; }
  setTimeout(() => urAliviar(viewer.entities), 5000);
  if (MI.ds) urAliviar(MI.ds.entities);
}

// ---------- calidad automática: si la PC no llega, baja el antialias y después la resolución ----------
// Mide el tiempo de cada cuadro; si durante 2 s el 75 % de los cuadros tarda más de 28 ms (menos de ~35 cuadros por segundo),
// baja un escalón. Si va sobrado (menos de 14 ms) durante 8 s, sube. Se puede fijar en Ajustes.
const CAL = { nivel: 0, modo: 'auto', base: { msaa: viewer.scene.msaaSamples, res: viewer.resolutionScale } };
try { CAL.modo = localStorage.getItem('mimCalidad') || 'auto'; } catch {}
function calAplicar(n) {
  n = Math.max(0, Math.min(3, n)); if (n === CAL.nivel && CAL.aplicado) return; CAL.nivel = n; CAL.aplicado = true;
  viewer.scene.msaaSamples = n === 0 ? CAL.base.msaa : n === 1 ? Math.min(2, CAL.base.msaa) : 1;
  viewer.resolutionScale = n >= 3 ? CAL.base.res * 0.8 : CAL.base.res;
}
{
  const tiempos = []; let ult = performance.now(), malo = 0, bueno = 0, revis = performance.now();
  viewer.scene.postRender.addEventListener(() => {
    const t = performance.now(); tiempos.push(t - ult); ult = t; if (tiempos.length > 240) tiempos.shift();
    // en el tour no se toca (cambiar el antialias rearma la imagen y se notaba como un tirón en la grabación)
    if (CAL.modo !== 'auto' || t - revis < 1000 || document.hidden || (typeof TOUR !== 'undefined' && TOUR.activo)) { if (t - revis >= 1000) revis = t; return; }
    const ult2 = tiempos.slice(-120).sort((a, b) => a - b), p75 = ult2[Math.floor(ult2.length * 0.75)] || 0;
    if (p75 > 28) { malo++; bueno = 0; } else if (p75 < 14) { bueno++; malo = 0; } else { malo = 0; bueno = 0; }
    if (malo >= 2) { malo = 0; calAplicar(CAL.nivel + 1); }
    if (bueno >= 8 && CAL.nivel > 0) { bueno = 0; calAplicar(CAL.nivel - 1); }
  });
  if (CAL.modo === 'alta') calAplicar(0); else if (CAL.modo === 'fluida') calAplicar(2);
}

// ---------- cámara libre durante los recorridos: rueda para alejarse, arrastrar para girar ----------
const ZC = { z: 1, zObj: 1, dh: 0, dp: 0, usado: false };
const _urArr = new C.Cartesian3();
function zcReset() { Object.assign(ZC, { z: 1, zObj: 1, dh: 0, dp: 0, usado: false }); }
{
  const cam0 = miCamara;
  miCamara = function (dt, objetivo, rumbo, m) {
    if (m.vista === 'ojos' || !ZC.usado) return cam0(dt, objetivo, rumbo, m);
    const cam = viewer.camera, k = Math.min(1, dt * 2.4);
    ZC.z += (ZC.zObj - ZC.z) * Math.min(1, dt * 6);
    MI.cam.h += angDif(rumbo + ZC.dh - MI.cam.h) * k;
    if (MI.fov0 && cam.frustum.fov !== MI.fov0) cam.frustum.fov = MI.fov0;
    MARS.geodeticSurfaceNormal(objetivo, _urArr);
    const T = C.Cartesian3.add(objetivo, C.Cartesian3.multiplyByScalar(_urArr, m.trip ? 2.0 : m.rover ? 1.4 : 1.1, new C.Cartesian3()), new C.Cartesian3());
    // cuanto más lejos, más desde arriba (para ver el recorrido entero), más lo que se haya inclinado con el mouse
    const pDef = Math.max(-1.45, Math.min(-0.05, (m.rover ? -0.24 : -0.2) - Math.min(0.95, Math.max(0, Math.log2(ZC.z)) * 0.16) + ZC.dp));
    MI.cam.p += (pDef - MI.cam.p) * Math.min(1, dt * 3);
    cam.lookAt(T, new C.HeadingPitchRange(MI.cam.h, MI.cam.p, MI.cam.r * ZC.z));
    const cg = cam.positionCartographic, suelo = alturaSuelo(C.Math.toDegrees(cg.longitude), C.Math.toDegrees(Math.atan(Math.tan(cg.latitude) * (B * B) / (A * A))), null);
    if (cg.height < suelo + 2) ZC.dp = Math.max(-1.2, ZC.dp - 0.03);
  };
  const enModo = () => MI.modo && MI.siguiendo && !MI.modo.fin;
  const cv = viewer.canvas;
  cv.addEventListener('wheel', e => {
    if (!enModo()) return; e.preventDefault();
    const m = MI.modo;
    if (m.vista === 'ojos') { if (e.deltaY > 0) document.querySelector('#miVistas [data-v=detras]')?.click(); return; }
    ZC.usado = true; const zMax = 14000 / Math.max(1, MI.cam.r);
    ZC.zObj = Math.max(0.45, Math.min(zMax, ZC.zObj * Math.exp(e.deltaY * 0.0016)));
  }, { passive: false });
  let arr = null;
  cv.addEventListener('pointerdown', e => { if (!enModo() || MI.modo.vista === 'ojos') return; arr = { x: e.clientX, y: e.clientY, mov: false }; });
  addEventListener('pointermove', e => {
    if (!arr || !enModo()) return; const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
    if (!arr.mov && Math.hypot(dx, dy) < 5) return; arr.mov = true; ZC.usado = true;
    ZC.dh -= dx * 0.006; ZC.dp = Math.max(-1.1, Math.min(0.15, ZC.dp - dy * 0.004)); arr.x = e.clientX; arr.y = e.clientY;
  });
  addEventListener('pointerup', () => { arr = null; });
  cv.addEventListener('dblclick', e => { if (!enModo()) return; e.preventDefault(); zcReset(); });
  // ayuda chica en el reproductor
  document.querySelector('#miPlay .cab')?.insertAdjacentHTML('afterend', `<div id="urCamTip" style="font-size:11.5px;color:var(--suave);margin:-2px 0 6px">${lg('Rueda: alejarte para ver todo el recorrido · arrastrar: girar · doble clic: volver', 'Wheel: zoom out to see the whole route · drag: orbit · double-click: reset')}</div>`);
  const modo0 = miModo; miModo = function (...a) { zcReset(); return modo0(...a); };
}

// ---------- "49 perforaciones" lleva a donde están; "Misión Curiosity" (arriba a la derecha) es lo hecho hasta hoy ----------
function urEncuadreRecorrido(dur = 2.6) {
  if (typeof RC === 'undefined' || !RC.length) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of RC) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = miDist(x0, y0, x1, y1) / 2;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(cx, cy, -4200), r), { offset: new C.HeadingPitchRange(0.15, -0.95, r * 2.5), duration: dur,
    easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 1500000, maximumHeight: 3000000 });
}
{
  const bp = $('miIntPozos');
  bp.onclick = () => { const on = bp.getAttribute('aria-pressed') !== 'true'; if (MI.modo) miSalirModo(false); miVerPozos(on); if (on) urEncuadreRecorrido(); };
  bp.title = lg('El recorrido real de Curiosity desde 2012 y sus 49 perforaciones, cada una con su hallazgo y fuente', 'Curiosity\'s real traverse since 2012 and its 49 drill holes, each with its finding and source');
  const b = $('bMision');
  if (b) {
    b.title = lg('Lo que hizo Curiosity hasta hoy: el recorrido desde el aterrizaje (2012), las 49 perforaciones y la línea de tiempo', 'What Curiosity has done so far: the traverse since landing (2012), the 49 drill holes and the timeline');
    const sp = b.querySelector('span'); if (sp) sp.innerHTML = lg(`<b>Misión Curiosity · hasta hoy</b><small>2012 → sol ${typeof RS !== 'undefined' && RS.length ? RS[RS.length - 1] : 5070} · recorrido y 49 perforaciones</small>`, `<b>Curiosity mission · so far</b><small>2012 → sol ${typeof RS !== 'undefined' && RS.length ? RS[RS.length - 1] : 5070} · traverse and 49 drill holes</small>`);
    const ir = async e => { e?.preventDefault?.(); if (MI.modo) miSalirModo(false); if (MI.verRec) await miVerRecorrido(false); miVerPozos(true); urEncuadreRecorrido(3);
      if (typeof abrirLinea === 'function') setTimeout(() => abrirLinea(), 900); };
    // en captura y cortando el resto: otro módulo también le pone un clic que entraba a la misión nueva
    b.onclick = null; b.addEventListener('click', e => { e.stopImmediatePropagation(); ir(e); }, true);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.stopImmediatePropagation(); ir(e); } }, true);
  }
}

// ---------- Ajustes (antes "Motor"): presentación, tutorial, calidad e idioma, y el motor abajo ----------
{
  const rb = document.querySelector('.rb[data-t="motor"]');
  if (rb) { rb.id = 'rAjustes'; rb.lastChild.textContent = lg('Ajustes', 'Settings'); rb.title = lg('Ajustes: presentación, tutorial, calidad, idioma y motor del globo', 'Settings: intro, tutorial, quality, language and globe engine');
    rb.querySelector('svg').innerHTML = '<path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54a7.3 7.3 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54a7.3 7.3 0 0 0 1.63-.94l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>'; }
  const vm0 = vistaMotor;
  vistaMotor = function () {
    vm0();
    $('cajonTitulo').textContent = lg('Ajustes', 'Settings');
    const c = cont(), op = (v, t) => `<option value="${v}" ${CAL.modo === v ? 'selected' : ''}>${t}</option>`;
    c.insertAdjacentHTML('afterbegin', `<h2>${lg('Presentación y tutorial', 'Intro and tutorial')}</h2>
      <div class="tarjeta" id="ajTuto" style="cursor:pointer"><b>${lg('Ver el tutorial', 'Show the tutorial')}</b><div class="sub">${lg('Las partes principales de Maps in Mars, una por una (1 minuto).', 'The main parts of Maps in Mars, one by one (1 minute).')}</div></div>
      <div class="tarjeta" id="ajPres" style="cursor:pointer"><b>${lg('Empezar la presentación desde cero', 'Restart the intro from scratch')}</b><div class="sub">${lg('Vuelve a cargar: Marte gira mientras carga, llega a Gale y pregunta si querés el tutorial.', 'Reloads: Mars spins while loading, flies to Gale and asks whether you want the tutorial.')}</div></div>
      <h2>${lg('Calidad de imagen', 'Image quality')}</h2>
      <div class="fila"><span>${lg('Calidad', 'Quality')}</span><select id="ajCal">${op('auto', lg('Automática (recomendada)', 'Automatic (recommended)'))}${op('alta', lg('Alta', 'High'))}${op('fluida', lg('Fluida (PC con poca placa de video)', 'Smooth (low-end graphics)'))}</select></div>
      <p class="sub">${lg('La automática baja el suavizado de bordes y, si hace falta, la resolución cuando la PC no llega a unos 35 cuadros por segundo, y los vuelve a subir cuando sobra.', 'Automatic lowers edge smoothing and, if needed, resolution when the computer cannot keep about 35 frames per second, and raises them back when there is room.')}</p>
      <h2>${lg('Idioma', 'Language')}</h2>
      <div class="fila"><span>${lg('Idioma', 'Language')}</span><span class="seg"><button data-aji="en" class="${IDIOMA === 'en' ? 'on' : ''}">English</button><button data-aji="es" class="${IDIOMA === 'es' ? 'on' : ''}">Español</button></span></div>
      <h2>${lg('Motor del globo', 'Globe engine')}</h2>`);
    $('ajTuto').onclick = () => { if (window.cerrarCajon) cerrarCajon(); setTimeout(() => window.tutoEmpezar?.(), 300); };
    $('ajPres').onclick = () => { try { localStorage.removeItem('mimTutorial'); sessionStorage.setItem('mimPresentacion', '1'); } catch {} location.hash = ''; location.reload(); };
    $('ajCal').onchange = e => { CAL.modo = e.target.value; try { localStorage.setItem('mimCalidad', CAL.modo); } catch {} if (CAL.modo === 'alta') calAplicar(0); else if (CAL.modo === 'fluida') calAplicar(2); };
    c.querySelectorAll('[data-aji]').forEach(b => b.onclick = () => { if (b.dataset.aji !== IDIOMA) cambiarIdioma(b.dataset.aji); });
  };
}

// ---------- la línea de tiempo y la barra de la misión no se pisan: abrir una cierra la otra ----------
{
  if (typeof abrirLinea === 'function') { const al0 = abrirLinea; abrirLinea = async function (...a) { if (typeof MI !== 'undefined' && MI.activo) miDejar(); return al0(...a); }; }
  const ent0 = miEntrar; miEntrar = function (...a) { if (typeof cerrarLinea === 'function' && document.body.classList.contains('lineaAbierta')) cerrarLinea(); return ent0(...a); };
}
// ---------- día y noche en vivo, prendido de entrada ----------
// La sombra de la noche sigue la hora real de Marte (Mars24, ya estaba en marte.js) y se actualiza sola. Queda prendida al empezar;
// de cerca (menos de 300 km) se aclara para que el terreno se siga leyendo aunque en Gale sea de noche. Se puede apagar en Capas.
setTimeout(() => { try { if (typeof MG !== 'undefined' && !MG.vis.noche && !localStorage.getItem('mimNocheApagada')) mgNoche(true); } catch {} }, 9000);
viewer.scene.preRender.addEventListener(() => {
  if (typeof MG === 'undefined' || !MG.noche || !MG.noche.show) return;
  const h = viewer.camera.positionCartographic.height, a = h > 900000 ? 1 : h < 300000 ? 0.4 : 0.4 + 0.6 * (h - 300000) / 600000;
  if (Math.abs(MG.noche.alpha - a) > 0.02) MG.noche.alpha = a;
});
if (typeof mgNoche === 'function') { const mn0 = mgNoche; mgNoche = async function (on) { try { if (on) localStorage.removeItem('mimNocheApagada'); else localStorage.setItem('mimNocheApagada', '1'); } catch {} return mn0(on); }; }
// ---------- Curiosity / GX-2 en la barra: además de cambiar el modelo, lleva al rover y deja manejarlo ----------
{
  const elegir = k => {
    miRover(k);
    if (MI.activo && !MI.modo && MI.D) {
      const c = MI.D.curiosity, nom = k === 'gx2' ? 'GX-2' : 'Curiosity';
      viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(c.lon, c.lat, alturaSuelo(c.lon, c.lat, c.elev) + 1), 4), { offset: new C.HeadingPitchRange(Math.PI / 2 - c.yaw + 2.4, -0.3, 22), duration: 1.8, easingFunction: C.EasingFunction.CUBIC_IN_OUT });
      miCard(nom, k === 'gx2' ? lg('Rover para las próximas excavaciones (diseño propio)', 'Rover for the next excavations (our design)') : lg(`Donde está hoy (sol ${typeof RS !== 'undefined' && RS.length ? RS[RS.length - 1] : 5070})`, `Where it is today (sol ${typeof RS !== 'undefined' && RS.length ? RS[RS.length - 1] : 5070})`),
        lg('Podés seguir la ruta A o manejarlo vos con el teclado (respeta pendiente y arena).', 'You can follow route A or drive it yourself with the keyboard (it respects slope and sand).'),
        [[lg('Manejarlo yo', 'Drive it myself'), async () => { miCard(); miModo('A', 'ruta'); setTimeout(() => urControl(true), 2700); }, true], [lg('Ruta A ▶', 'Route A ▶'), () => { miCard(); miModo('A', 'ruta'); }], [lg('Cerrar', 'Close'), () => miCard()]]);
    }
  };
  document.querySelectorAll('#miBarra [data-rv]').forEach(b => b.onclick = () => elegir(b.dataset.rv));
}
// ---------- una sola cosa abajo a la vez: la línea de tiempo y la barra de la misión no se pisan nunca ----------
// Gana la última que se abrió, venga del botón que venga (Historia, Misión Curiosity · hasta hoy, Nueva misión, una ficha, el buscador…).
{
  const barra = $('miBarra'), visible = () => barra && !barra.classList.contains('oculto') && barra._on !== false;
  new MutationObserver(() => { if (visible() && document.body.classList.contains('lineaAbierta') && typeof cerrarLinea === 'function') cerrarLinea(); })
    .observe(barra, { attributes: true, attributeFilter: ['class'] });
  let linea0 = document.body.classList.contains('lineaAbierta');
  new MutationObserver(() => { const l = document.body.classList.contains('lineaAbierta'); if (l && !linea0) { if (MI.modo) miSalirModo(false); if (MI.activo) miDejar(); if (typeof PL !== 'undefined' && PL.activo) plSalir(); } linea0 = l; })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
window.__maps = { UR, abrir: urAbrir, base: urIrBase, control: urControl, analizar: urAnalizar };

// ==================== pantallas de cualquier tamaño ====================
// En notebooks (1366 × 768 con la barra del navegador quedan ~650 px de alto) el riel no entraba y Ajustes, el idioma,
// Ayuda y Pantalla quedaban abajo, fuera de la vista; con el planificador abierto, su barra y los botones de la derecha
// se salían por arriba. Se compacta según el alto y el ancho disponibles. Probado de 1024 × 600 a 1920 × 940.
document.head.insertAdjacentHTML('beforeend', `<style id="urTamanos">
@media (min-width:761px){
  #riel{overflow-y:auto;scrollbar-width:none}#riel::-webkit-scrollbar{display:none}   /* último recurso: nunca queda nada inaccesible */
}
@media (min-width:761px) and (max-height:900px){
  #riel{gap:0;padding-top:calc(6px + var(--sup-seg));padding-bottom:6px}
  #riel .logo{width:38px;height:38px;margin:0 0 6px;flex:none}
  #riel .rb{padding:4px 0 3px;gap:1px;font-size:10px;flex:none}
  #riel .rb svg.i{height:24px;padding:2px 12px}
  #idiomaSel{margin-bottom:3px;flex:none}
  #controles{gap:7px;bottom:38px}
  #controles .cb{width:36px;height:36px}#brujula{width:40px!important;height:40px!important}
  #plBarra{padding:4px 3px}
  #plBarra .plMas{display:grid!important;grid-template-columns:repeat(2,40px);gap:2px;justify-items:center}
  #plBarra:not(.abierta) .plMas{display:none!important}
  #plBarra .plMas hr{grid-column:1/-1;width:60px}
  #plBarra button{width:40px;height:30px}
  #plBarra button[data-tip]:hover::after{right:auto;left:auto;right:calc(100% + 8px)}
}
@media (min-width:761px) and (max-height:680px){
  #riel .rb{font-size:0;gap:0;padding:3px 0}       /* solo íconos: el nombre aparece al pasar el mouse (title) */
  #riel .logo{width:32px;height:32px;margin-bottom:4px}
  #controles{gap:6px}
  #vRelieve{display:none}
}
@media (min-width:761px) and (max-height:560px){
  #riel .logo,#rPantalla{display:none}
  #controles .grupo{display:none}
}
@media (min-width:761px) and (max-width:1200px){
  #bMision small{display:none}
  body #miArriba,body.cajonAbierto:not(.hoja) #miArriba{top:calc(66px + var(--sup-seg));left:calc(var(--riel) + 12px)}
  body.cajonAbierto:not(.hoja) #miArriba{left:calc(var(--riel) + 436px)}
}
</style>`);

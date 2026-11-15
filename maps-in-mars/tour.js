// ==================== Tour: recorrido guiado de ~2 minutos, estilo tráiler ====================
// La cámara vuela sola por las escenas; los textos salen de los mismos datos de la app (con su fuente).
// Esc o "Saltar" lo cortan; al terminar todo vuelve a como estaba.
const TOUR = { activo: false, corte: false };
const tx = (en, es) => ((window.IDIOMA || 'en') === 'es' ? es : en);

function tourUI() {
  if ($('tour')) return $('tour');
  const d = document.createElement('div'); d.id = 'tour'; d.className = 'oculto';
  d.innerHTML = `<div class="tBanda tArriba"></div><div class="tBanda tAbajo"><div class="tPaso" id="tPaso"></div><div class="tTexto" id="tTexto"></div><div class="tBarra"><i id="tProg"></i></div></div>
    <div class="tTitulo" id="tTitulo"></div><div class="tNegro" id="tNegro"></div>
    <button class="tSaltar" id="tSaltar">${tx('Skip tour ✕', 'Saltar ✕')}</button>`;
  document.body.appendChild(d);
  $('tSaltar').onclick = () => { TOUR.corte = true; };
  addEventListener('keydown', e => { if (e.key === 'Escape' && TOUR.activo) TOUR.corte = true; });
  return d;
}
const tEsperar = ms => new Promise((ok, mal) => { const t0 = performance.now();
  const f = () => { if (TOUR.corte) return mal('corte'); if (performance.now() - t0 >= ms) return ok(); requestAnimationFrame(f); }; f(); });
function tTexto(t, paso) {
  const el = $('tTexto'); el.classList.remove('vis');
  setTimeout(() => { el.innerHTML = t; el.classList.add('vis'); }, 350);
  if (paso) $('tPaso').textContent = paso;
}
async function tTitulo(html, ms) {
  const el = $('tTitulo'); el.innerHTML = html; el.classList.add('vis');
  await tEsperar(ms); el.classList.remove('vis'); await tEsperar(700);
}
async function tNegro(on) { $('tNegro').classList.toggle('vis', on); await tEsperar(650); }
function tVolar(opc) {   // vuelo con aceleración suave; devuelve una promesa
  return new Promise((ok, mal) => {
    if (TOUR.corte) return mal('corte');
    viewer.camera.flyTo({ ...opc, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, complete: ok, cancel: () => mal('corte') });
  });
}
async function tCentro(lon, lat) {   // punto sobre el terreno (para girar alrededor)
  try { const h = await alturas([C.Cartographic.fromDegrees(lon, geodetica(lat))]); if (h && h[0] != null) return pos(lon, lat, h[0]); } catch {}
  return pos(lon, lat, 0);
}
async function tIrYGirar(c, h0, pit, rango, segVuelo, segGiro, grados) {   // vuela al punto y gira lento a su alrededor
  const bs = new C.BoundingSphere(c, 10);
  await new Promise((ok, mal) => viewer.camera.flyToBoundingSphere(bs, { offset: new C.HeadingPitchRange(h0, pit, rango), duration: segVuelo,
    easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, complete: ok, cancel: () => mal('corte') }));
  await tGirar(c, h0, pit, rango, segGiro, grados);
}
function tGirar(c, h0, pit, rango, seg, grados) {
  return new Promise((ok, mal) => {
    const t0 = performance.now(), d = C.Math.toRadians(grados);
    const f = () => {
      if (TOUR.corte) { viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); return mal('corte'); }
      const u = Math.min(1, (performance.now() - t0) / (seg * 1000));
      viewer.camera.lookAt(c, new C.HeadingPitchRange(h0 + d * u, pit, rango));
      if (u < 1) requestAnimationFrame(f); else { viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); ok(); }
    }; f();
  });
}
// varias alturas del terreno en una sola consulta (antes era una por punto, y cada espera frenaba la cámara en el aire)
async function tCentros(lista) {
  try { const h = await alturas(lista.map(([lon, lat]) => C.Cartographic.fromDegrees(lon, geodetica(lat))));
    if (h) return lista.map(([lon, lat], i) => pos(lon, lat, h[i] ?? 0)); } catch {}
  return lista.map(([lon, lat]) => pos(lon, lat, 0));
}
const tRumbo = (a, b) => { const g = MARS.cartesianToCartographic(a), k = MARS.cartesianToCartographic(b); return Math.atan2((k.longitude - g.longitude) * Math.cos(g.latitude), k.latitude - g.latitude); };
// vuelo continuo por varios puntos: la cámara mira un blanco que se desliza por una curva suave (Catmull-Rom), con el rumbo filtrado.
// Reemplaza a los vuelos encadenados, que frenaban en cada punto y subían y bajaban entre uno y otro (los "saltos" sobre Gale).
function tCamino(cs, seg, pit, rango, alPasar) {
  return new Promise((ok, mal) => {
    const n = cs.length, L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + C.Cartesian3.distance(cs[i - 1], cs[i]));
    const tot = L[n - 1] || 1, sp = new C.CatmullRomSpline({ times: L.map(l => l / tot), points: cs });
    const ev = u => sp.evaluate(Math.max(0, Math.min(1, u)));
    const rumbo = u => u < 0.97 ? tRumbo(ev(u), ev(u + 0.03)) : tRumbo(ev(u - 0.03), ev(u));
    let h = rumbo(0), t0 = performance.now(), ant = t0, visto = 0;
    const f = () => {
      if (TOUR.corte) { viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); return mal('corte'); }
      const ahora = performance.now(), dt = Math.min(0.1, (ahora - ant) / 1000); ant = ahora;
      const x = Math.min(1, (ahora - t0) / (seg * 1000)), u = x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);    // arranca y frena suave
      const d = Math.atan2(Math.sin(rumbo(u) - h), Math.cos(rumbo(u) - h)), giro = d * (1 - Math.exp(-dt * 2.2)), tope = 0.6 * dt;     // como mucho ~35° por segundo
      h += Math.max(-tope, Math.min(tope, giro));
      viewer.camera.lookAt(ev(u), new C.HeadingPitchRange(h, pit, rango));
      while (visto < n - 1 && u >= L[visto + 1] / tot - 1e-6) { visto++; if (alPasar) alPasar(visto); }
      if (x < 1) requestAnimationFrame(f); else { viewer.camera.lookAtTransform(C.Matrix4.IDENTITY); ok(); }
    }; f();
  });
}
function kmRecorrido() {   // largo del recorrido oficial (suma de tramos sobre la esfera de 3396,19 km)
  let s = 0; for (let i = 1; i < RC.length; i++) { const [a, b] = [RC[i - 1], RC[i]];
    const f1 = b[1] * Math.PI / 180, f0 = a[1] * Math.PI / 180, dl = (b[0] - a[0]) * Math.PI / 180;
    s += 2 * Math.asin(Math.sqrt(Math.sin((f1 - f0) / 2) ** 2 + Math.cos(f0) * Math.cos(f1) * Math.sin(dl / 2) ** 2)); }
  return s * 3396.19;
}

async function iniciarTour() {
  if (TOUR.activo) return;
  if (MODO !== 'globo') return avisar(tx('The tour needs the "Full Mars" engine (Engine tab).', 'El tour necesita el motor "Marte completo" (pestaña Motor).'));
  const ui = tourUI(); TOUR.activo = true; TOUR.corte = false;
  // estado para dejar todo como estaba
  const antes = { mins: Object.fromEntries(Object.entries(CAPA_M).map(([k, v]) => [k, !!(v[0] && v[0].show)])), dosis: !!(CAPA_A.dosis && CAPA_A.dosis.show),
    horario: HORARIO_RAD, exag: viewer.scene.verticalExaggeration, anim: viewer.clock.shouldAnimate, rec: typeof MI !== 'undefined' && !!MI.verRec };
  if (window.cerrarCajon) cerrarCajon();
  const eeAntes = viewer.scene.globe.maximumScreenSpaceError; viewer.scene.globe.maximumScreenSpaceError = Math.max(eeAntes, 2);   // carga más rápido en los vuelos
  document.body.classList.add('enTour'); ui.classList.remove('oculto');
  requestAnimationFrame(() => ui.classList.add('on'));
  const N = 9, paso = k => `${String(k).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
  const km = kmRecorrido(), soles = RS[RS.length - 1];
  if (!MANCHAS) try { MANCHAS = await (await fetch('capas/minerales/manchas.json')).json(); } catch {}
  const rango = (id, campo) => { const m = MANCHAS && MANCHAS.manchas.find(x => x.id === id); const v = m ? m.pozos.map(p => p.valor).filter(x => x != null) : []; return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  const arc = rango('arcillas_1'), hem = rango('hematita_4');
  // todas las alturas de una vez, mientras gira Marte: así ningún vuelo espera al terreno a mitad de camino
  const gt = NUM.find(p => /Glen Etive/.test(p.nombre)) || NUM[30];
  const tramosRC = Array.from({ length: 13 }, (_, k) => RC[Math.min(RC.length - 1, Math.round(k / 12 * (RC.length - 1)))]);
  const PRE = tCentros([[137.8, -5.4], [137.40, -4.78], [gt.lon, gt.lat], [137.40, -4.85], ...tramosRC.map(p => [p[0], p[1]])]);
  const MIS = typeof miCargar === 'function' ? miCargar().catch(() => false) : Promise.resolve(false);
  try {
    // 1 · Marte entero desde el espacio
    await tNegro(true);
    viewer.camera.setView({ destination: pos(95, 8, 2.6e7) });
    await tNegro(false);
    const giroMarte = tGirar(C.Cartesian3.ZERO, C.Math.toRadians(-30), C.Math.toRadians(-8), 2.15e7, 11, 26);
    await tEsperar(600);
    await tTitulo(`<b>MAPS IN MARS</b><span>${tx('Mars, seen from orbit — and confirmed on the ground', 'Marte visto desde órbita, y confirmado en el suelo')}</span>`, 4200);
    tTexto(tx('Every layer comes from NASA, USGS or ESA data. Every number carries its source.', 'Cada capa sale de datos de NASA, USGS o ESA. Cada número lleva su fuente.'), paso(1));
    await giroMarte;

    // 2 · Gale
    const [cGale, cOrbita, cGt, cRad, ...cRC] = await PRE;
    tTexto(tx('<b>Gale Crater</b> · 154 km wide. Curiosity landed here on August 6, 2012, to read the history written in Mount Sharp, a 5 km tall mountain of layered rock.',
              '<b>Cráter Gale</b> · 154 km. Curiosity aterrizó acá el 6 de agosto de 2012 para leer la historia escrita en el Monte Sharp, una montaña de 5 km de capas de roca.'), paso(2));
    await tIrYGirar(cGale, C.Math.toRadians(10), C.Math.toRadians(-38), 210000, 6.5, 7.5, 22);

    // 3 · el recorrido de Curiosity, en vuelo bajo
    tTexto(tx(`<b>${fmt(km, 1)} km</b> driven · <b>${NUM.length}</b> holes drilled · sol <b>${soles}</b>. The real traverse, from NASA's official track.`,
              `<b>${fmt(km, 1)} km</b> recorridos · <b>${NUM.length}</b> perforaciones · sol <b>${soles}</b>. El recorrido real, de la traza oficial de NASA.`), paso(3));
    // vuelo bajo y continuo por todo el recorrido (antes: cuatro vuelos encadenados que frenaban y saltaban)
    const h0 = tRumbo(cRC[0], cRC[1]);
    await new Promise((ok, mal) => viewer.camera.flyToBoundingSphere(new C.BoundingSphere(cRC[0], 10), { offset: new C.HeadingPitchRange(h0, C.Math.toRadians(-30), 6200),
      duration: 4.5, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, complete: ok, cancel: () => mal('corte') }));
    await tCamino(cRC, 15, C.Math.toRadians(-30), 6200);

    // 4 · lo que vio el satélite
    for (const k of ['arcillas', 'hematita', 'sulfatos']) await capaMineral(k, true);
    tTexto(tx('<b>From orbit</b>, NASA\'s Mars Reconnaissance Orbiter mapped minerals with its CRISM spectrometer: <span style="color:#40c4ff">clays</span>, <span style="color:#ff503c">hematite</span> and <span style="color:#ffd640">sulfates</span> — all of them formed with water.',
              '<b>Desde órbita</b>, la sonda MRO de NASA mapeó minerales con su espectrómetro CRISM: <span style="color:#40c4ff">arcillas</span>, <span style="color:#ff503c">hematita</span> y <span style="color:#ffd640">sulfatos</span>, todos formados con agua.'), paso(4));
    await tIrYGirar(cOrbita, C.Math.toRadians(-20), C.Math.toRadians(-62), 19000, 4, 9, 30);

    // 5 · lo que confirmó el rover
    tTexto(tx(`<b>Then Curiosity drilled.</b> Its CheMin instrument measured ${arc ? `<b>${fmt(arc[0])}–${fmt(arc[1])} % clay</b>` : 'clay'} right where orbit pointed, and ${hem ? `<b>up to ${fmt(hem[1])} % hematite</b>` : 'hematite'} on Vera Rubin ridge. <i>Seen from orbit, confirmed on the ground.</i>`,
              `<b>Después perforó Curiosity.</b> Su instrumento CheMin midió ${arc ? `<b>${fmt(arc[0])} a ${fmt(arc[1])} % de arcilla</b>` : 'arcilla'} justo donde apuntaba el satélite, y ${hem ? `<b>hasta ${fmt(hem[1])} % de hematita</b>` : 'hematita'} en la cresta Vera Rubin. <i>Visto desde órbita, confirmado en el suelo.</i>`), paso(5));
    await tIrYGirar(cGt, C.Math.toRadians(150), C.Math.toRadians(-48), 4300, 4, 8.5, 40);
    for (const k of ['arcillas', 'hematita', 'sulfatos']) await capaMineral(k, false);

    // 6 · radiación (medida por RAD en Gale) y la tormenta solar de mayo de 2024
    if (HORARIO_RAD !== 'dia') await cambiarHorarioRad('dia');
    await capaAnalisis('dosis', true, 0.55);
    tTexto(tx('<b>Radiation</b> is an astronaut\'s invisible enemy. Curiosity\'s RAD, the only radiation detector ever on the Martian surface, measured <b>0.64 mSv per day</b> in Gale. Cliffs and buttes block part of the sky and lower the dose.',
              'La <b>radiación</b> es el enemigo invisible del astronauta. RAD, en Curiosity, el único detector de radiación que estuvo en la superficie de Marte, midió <b>0,64 mSv por día</b> en Gale. Los acantilados tapan parte del cielo y bajan la dosis.'), paso(6));
    await tIrYGirar(cRad, C.Math.toRadians(30), C.Math.toRadians(-40), 26000, 4, 6, 18);
    await cambiarHorarioRad('noche');
    tTexto(tx('At night the air is denser and the dose drops about 5 %.', 'De noche el aire es más denso y la dosis baja cerca de un 5 %.'));
    await tEsperar(4200);
    tTexto(tx('On May 20, 2024 a solar storm hit Mars: RAD measured <b>8,100 µGy in one event</b>, about 39 days of normal dose at once. A crew would need a shielded shelter within reach.',
              'El 20 de mayo de 2024 una tormenta solar llegó a Marte: RAD midió <b>8.100 µGy en un solo evento</b>, unos 39 días de dosis normal de golpe. Una tripulación necesitaría un refugio con blindaje a mano.'));
    await tEsperar(6500);
    await capaAnalisis('dosis', false, 0.55);

    // 7 · la Base Gale: paneo alrededor del hábitat (propuesta propia, en la Zona 2 del análisis de sitios del equipo)
    const hayMision = await MIS;
    if (hayMision && MI.D.base) {
      const b = MI.D.base, kmF = m => fmt(m / 1000, 1);
      const sec = ['S', 'B1', 'A2', 'A4', 'E2', 'E3', 'E5'].map(id => MI.paradas[id]).filter(Boolean);
      const PRE2 = tCentros([[b.lon, b.lat], ...sec.map(p => [p.lon, p.lat])]);
      miOrbitas(false); if (MI.mod.base_gale) MI.mod.base_gale.show = true;
      miVerRecorrido(true);      // las rutas se preparan mientras se ve la base (dibujarlas justo al llegar trababa el vuelo)
      const [cBase, ...cSec] = await PRE2;
      tTexto(tx(`<b>Gale Base</b> · our proposal, on the flat landing plain (Zone 2 of our site analysis): ${kmF(b.drec)} km from Curiosity's traverse, ${fmt(b.pend, 1)}° of local slope (our calculation). Habitat, pressurized tunnels, lab, suitport airlock and greenhouse.`,
                `<b>Base Gale</b> · nuestra propuesta, en la llanura del aterrizaje (Zona 2 de nuestro análisis de sitios): a ${kmF(b.drec)} km del recorrido de Curiosity, con ${fmt(b.pend, 1)}° de pendiente local (cálculo propio). Hábitat, túneles presurizados, laboratorio, esclusa con suitports e invernadero.`), paso(7));
      await tIrYGirar(cBase, C.Math.toRadians(35), C.Math.toRadians(-24), 210, 5, 12, 150);

      // 8 · los recorridos nuevos: desde la posición de Curiosity hoy, parada por parada
      const LA = MI.lineas.A, LB = MI.lineas.B;
      tTexto(tx(`<b>New routes</b> from where Curiosity is today (sol ${MI.D.sol}): route A for the robot (${kmF(LA.largo)} km), route B on foot (${kmF(LB.largo)} km, out and back) and a southern expedition beyond A4. Every stop has a science reason.`,
                `<b>Recorridos nuevos</b> desde donde está Curiosity hoy (sol ${MI.D.sol}): ruta A del robot (${kmF(LA.largo)} km), ruta B a pie (${kmF(LB.largo)} km, ida y vuelta) y una expedición al sur, más allá de A4. Cada parada tiene un motivo científico.`), paso(8));
      const nom = p => `<span class="mi-pill" style="background:${p.color}">${p.id}</span> ${typeof miTr === 'function' ? miTr(p.nombre) : p.nombre}`;
      const h1 = tRumbo(cSec[0], cSec[1]);
      await new Promise((ok, mal) => viewer.camera.flyToBoundingSphere(new C.BoundingSphere(cSec[0], 10), { offset: new C.HeadingPitchRange(h1, C.Math.toRadians(-32), 1500),
        duration: 4.5, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, complete: ok, cancel: () => mal('corte') }));
      await tEsperar(1800);
      await tCamino(cSec, 20, C.Math.toRadians(-32), 1500, i => tTexto(nom(sec[i])));
      await tEsperar(1200);
      if (!antes.rec) await miVerRecorrido(false);
      miOrbitas(true);
    }

    // 9 · las naves en órbita y cierre
    const mro = O.orbitadores.MRO;
    if (mro && mro.ent && mro.ent.model) {
      tTexto(tx('<b>Overhead</b>, MRO and Mars Odyssey — NASA\'s own 3D models, on orbits computed live — relay Curiosity\'s data to Earth.',
                '<b>Arriba</b>, MRO y Mars Odyssey, con los modelos 3D de NASA y órbitas calculadas en vivo, retransmiten los datos de Curiosity a la Tierra.'), paso(9));
      await tNegro(true);
      mro.ent.viewFrom = new C.Cartesian3(-45, -30, 16); viewer.trackedEntity = mro.ent;
      await tEsperar(600); await tNegro(false); await tEsperar(8000);
      await tNegro(true); viewer.trackedEntity = undefined;
    } else await tNegro(true);
    viewer.camera.setView({ destination: pos(115, 4, 3.4e7) });
    await tNegro(false);
    tTexto(tx('Maps in Mars · NASA Space Apps Challenge 2026 · San Luis, Argentina', 'Maps in Mars · NASA Space Apps Challenge 2026 · San Luis, Argentina'), paso(9));
    const fin = tGirar(C.Cartesian3.ZERO, C.Math.toRadians(-60), C.Math.toRadians(-5), 2.25e7, 9, 22);
    await tTitulo(`<b>${tx('Explore it yourself', 'Exploralo vos')}</b><span>${tx('Every layer has a source. Every number, a citation.', 'Cada capa tiene su fuente. Cada número, su cita.')}</span>`, 5200);
    await fin;
  } catch (e) { if (e !== 'corte') console.warn('[tour]', e); }
  // dejar todo como estaba
  TOUR.corte = false; viewer.trackedEntity = undefined;
  if (typeof MI !== 'undefined' && MI.D) { try { miOrbitas(true); if (!antes.rec && MI.verRec) await miVerRecorrido(false); } catch {} } viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  for (const k of ['arcillas', 'hematita', 'sulfatos']) if (CAPA_M[k]) await capaMineral(k, !!antes.mins[k]);
  if (HORARIO_RAD !== antes.horario) await cambiarHorarioRad(antes.horario);
  if (CAPA_A.dosis) await capaAnalisis('dosis', antes.dosis, CAPA_A.dosis.alpha);
  viewer.scene.globe.maximumScreenSpaceError = eeAntes; viewer.scene.verticalExaggeration = antes.exag; viewer.clock.shouldAnimate = antes.anim;
  ui.classList.remove('on'); $('tNegro').classList.remove('vis'); $('tTitulo').classList.remove('vis'); $('tTexto').classList.remove('vis');
  setTimeout(() => ui.classList.add('oculto'), 700);
  document.body.classList.remove('enTour'); TOUR.activo = false;
}
window.iniciarTour = iniciarTour;
if ($('rTour')) $('rTour').onclick = iniciarTour;

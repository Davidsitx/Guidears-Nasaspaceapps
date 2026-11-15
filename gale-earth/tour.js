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
    horario: HORARIO_RAD, radG: !!MG.vis.radiacion, exag: viewer.scene.verticalExaggeration, anim: viewer.clock.shouldAnimate };
  if (window.cerrarCajon) cerrarCajon();
  const eeAntes = viewer.scene.globe.maximumScreenSpaceError; viewer.scene.globe.maximumScreenSpaceError = Math.max(eeAntes, 2);   // carga más rápido en los vuelos
  document.body.classList.add('enTour'); ui.classList.remove('oculto');
  requestAnimationFrame(() => ui.classList.add('on'));
  const N = 7, paso = k => `${String(k).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
  const km = kmRecorrido(), soles = RS[RS.length - 1];
  if (!MANCHAS) try { MANCHAS = await (await fetch('capas/minerales/manchas.json')).json(); } catch {}
  const rango = (id, campo) => { const m = MANCHAS && MANCHAS.manchas.find(x => x.id === id); const v = m ? m.pozos.map(p => p.valor).filter(x => x != null) : []; return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  const arc = rango('arcillas_1'), hem = rango('hematita_4');
  try {
    // 1 · Marte entero desde el espacio
    await tNegro(true);
    viewer.camera.setView({ destination: pos(95, 8, 2.6e7) });
    await tNegro(false);
    const giroMarte = tGirar(C.Cartesian3.ZERO, C.Math.toRadians(-30), C.Math.toRadians(-8), 2.15e7, 11, 26);
    await tEsperar(600);
    await tTitulo(`<b>GALE EARTH</b><span>${tx('Mars, seen from orbit — and confirmed on the ground', 'Marte visto desde órbita, y confirmado en el suelo')}</span>`, 4200);
    tTexto(tx('Every layer comes from NASA, USGS or ESA data. Every number carries its source.', 'Cada capa sale de datos de NASA, USGS o ESA. Cada número lleva su fuente.'), paso(1));
    await giroMarte;

    // 2 · Gale
    const cGale = await tCentro(137.8, -5.4);
    tTexto(tx('<b>Gale Crater</b> · 154 km wide. Curiosity landed here on August 6, 2012, to read the history written in Mount Sharp, a 5 km tall mountain of layered rock.',
              '<b>Cráter Gale</b> · 154 km. Curiosity aterrizó acá el 6 de agosto de 2012 para leer la historia escrita en el Monte Sharp, una montaña de 5 km de capas de roca.'), paso(2));
    await tIrYGirar(cGale, C.Math.toRadians(10), C.Math.toRadians(-38), 210000, 6.5, 7.5, 22);

    // 3 · el recorrido de Curiosity, en vuelo bajo
    tTexto(tx(`<b>${fmt(km, 1)} km</b> driven · <b>${NUM.length}</b> holes drilled · sol <b>${soles}</b>. The real traverse, from NASA's official track.`,
              `<b>${fmt(km, 1)} km</b> recorridos · <b>${NUM.length}</b> perforaciones · sol <b>${soles}</b>. El recorrido real, de la traza oficial de NASA.`), paso(3));
    const tramos = [0, 0.2, 0.45, 0.7, 1].map(f => RC[Math.min(RC.length - 1, Math.round(f * (RC.length - 1)))]);
    for (let i = 0; i < tramos.length - 1; i++) {
      const [a, b] = [tramos[i], tramos[i + 1]];
      const rumbo = Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]);
      const c = await tCentro(b[0], b[1]);
      await new Promise((ok, mal) => viewer.camera.flyToBoundingSphere(new C.BoundingSphere(c, 10), { offset: new C.HeadingPitchRange(rumbo, C.Math.toRadians(-30), 6200),
        duration: i === 0 ? 4.5 : 4.2, easingFunction: i === 0 ? C.EasingFunction.QUADRATIC_IN_OUT : C.EasingFunction.LINEAR_NONE, complete: ok, cancel: () => mal('corte') }));
    }

    // 4 · lo que vio el satélite
    for (const k of ['arcillas', 'hematita', 'sulfatos']) await capaMineral(k, true);
    tTexto(tx('<b>From orbit</b>, NASA\'s Mars Reconnaissance Orbiter mapped minerals with its CRISM spectrometer: <span style="color:#40c4ff">clays</span>, <span style="color:#ff503c">hematite</span> and <span style="color:#ffd640">sulfates</span> — all of them formed with water.',
              '<b>Desde órbita</b>, la sonda MRO de NASA mapeó minerales con su espectrómetro CRISM: <span style="color:#40c4ff">arcillas</span>, <span style="color:#ff503c">hematita</span> y <span style="color:#ffd640">sulfatos</span>, todos formados con agua.'), paso(4));
    await tIrYGirar(await tCentro(137.40, -4.78), C.Math.toRadians(-20), C.Math.toRadians(-62), 19000, 4, 9, 30);

    // 5 · lo que confirmó el rover
    const gt = NUM.find(p => /Glen Etive/.test(p.nombre)) || NUM[30];
    tTexto(tx(`<b>Then Curiosity drilled.</b> Its CheMin instrument measured ${arc ? `<b>${fmt(arc[0])}–${fmt(arc[1])} % clay</b>` : 'clay'} right where orbit pointed, and ${hem ? `<b>up to ${fmt(hem[1])} % hematite</b>` : 'hematite'} on Vera Rubin ridge. <i>Seen from orbit, confirmed on the ground.</i>`,
              `<b>Después perforó Curiosity.</b> Su instrumento CheMin midió ${arc ? `<b>${fmt(arc[0])} a ${fmt(arc[1])} % de arcilla</b>` : 'arcilla'} justo donde apuntaba el satélite, y ${hem ? `<b>hasta ${fmt(hem[1])} % de hematita</b>` : 'hematita'} en la cresta Vera Rubin. <i>Visto desde órbita, confirmado en el suelo.</i>`), paso(5));
    await tIrYGirar(await tCentro(gt.lon, gt.lat), C.Math.toRadians(150), C.Math.toRadians(-48), 4300, 4, 8.5, 40);
    for (const k of ['arcillas', 'hematita', 'sulfatos']) await capaMineral(k, false);

    // 6 · radiación: primero la estimación de todo Marte, después la capa fina de Gale
    await mgRadiacion(true);
    tTexto(tx('<b>Radiation</b> is an astronaut\'s invisible enemy. Curiosity\'s RAD is the only detector on the surface; from it and the relief we estimate the whole planet: <b>less air above = more dose</b>. Mountains get more, deep basins less.',
              'La <b>radiación</b> es el enemigo invisible del astronauta. RAD, en Curiosity, es el único detector en la superficie; con él y el relieve estimamos todo el planeta: <b>menos aire encima = más dosis</b>. Las montañas reciben más; las cuencas profundas, menos.'), paso(6));
    await tIrYGirar(await tCentro(137.8, -5.4), C.Math.toRadians(0), C.Math.toRadians(-62), 2.6e6, 4.5, 6, 25);
    await mgRadiacion(false);
    if (HORARIO_RAD !== 'dia') await cambiarHorarioRad('dia');
    await capaAnalisis('dosis', true, 0.55);
    tTexto(tx('In Gale, RAD measured <b>0.64 mSv per day</b>. Up close, cliffs and buttes block part of the sky and lower the dose.',
              'En Gale, RAD midió <b>0,64 mSv por día</b>. De cerca, los acantilados tapan parte del cielo y bajan la dosis.'));
    await tIrYGirar(await tCentro(137.40, -4.85), C.Math.toRadians(30), C.Math.toRadians(-40), 26000, 4, 6, 18);
    await cambiarHorarioRad('noche');
    tTexto(tx('At night the air is denser and the dose drops about 5 %.', 'De noche el aire es más denso y la dosis baja cerca de un 5 %.'));
    await tEsperar(4200);
    await capaAnalisis('dosis', false, 0.55);

    // 7 · las naves en órbita y cierre
    const mro = O.orbitadores.MRO;
    if (mro && mro.ent && mro.ent.model) {
      tTexto(tx('<b>Overhead</b>, MRO and Mars Odyssey — NASA\'s own 3D models, on orbits computed live — relay Curiosity\'s data to Earth.',
                '<b>Arriba</b>, MRO y Mars Odyssey, con los modelos 3D de NASA y órbitas calculadas en vivo, retransmiten los datos de Curiosity a la Tierra.'), paso(7));
      await tNegro(true);
      mro.ent.viewFrom = new C.Cartesian3(-45, -30, 16); viewer.trackedEntity = mro.ent;
      await tEsperar(600); await tNegro(false); await tEsperar(8000);
      await tNegro(true); viewer.trackedEntity = undefined;
    } else await tNegro(true);
    viewer.camera.setView({ destination: pos(115, 4, 3.4e7) });
    await tNegro(false);
    tTexto(tx('Gale Earth · NASA Space Apps Challenge 2026 · San Luis, Argentina', 'Gale Earth · NASA Space Apps Challenge 2026 · San Luis, Argentina'), paso(7));
    const fin = tGirar(C.Cartesian3.ZERO, C.Math.toRadians(-60), C.Math.toRadians(-5), 2.25e7, 9, 22);
    await tTitulo(`<b>${tx('Explore it yourself', 'Exploralo vos')}</b><span>${tx('Every layer has a source. Every number, a citation.', 'Cada capa tiene su fuente. Cada número, su cita.')}</span>`, 5200);
    await fin;
  } catch (e) { if (e !== 'corte') console.warn('[tour]', e); }
  // dejar todo como estaba
  TOUR.corte = false; viewer.trackedEntity = undefined; viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  for (const k of ['arcillas', 'hematita', 'sulfatos']) if (CAPA_M[k]) await capaMineral(k, !!antes.mins[k]);
  if (HORARIO_RAD !== antes.horario) await cambiarHorarioRad(antes.horario);
  if (MG.rad) await mgRadiacion(!!antes.radG);
  if (CAPA_A.dosis) await capaAnalisis('dosis', antes.dosis, CAPA_A.dosis.alpha);
  viewer.scene.globe.maximumScreenSpaceError = eeAntes; viewer.scene.verticalExaggeration = antes.exag; viewer.clock.shouldAnimate = antes.anim;
  ui.classList.remove('on'); $('tNegro').classList.remove('vis'); $('tTitulo').classList.remove('vis'); $('tTexto').classList.remove('vis');
  setTimeout(() => ui.classList.add('oculto'), 700);
  document.body.classList.remove('enTour'); TOUR.activo = false;
}
window.iniciarTour = iniciarTour;
if ($('rTour')) $('rTour').onclick = iniciarTour;

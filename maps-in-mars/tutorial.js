// ==================== Tutorial: la pantalla se oscurece y se ilumina cada parte importante ====================
// Se ofrece la primera vez (después de llegar a Gale) y se puede repetir desde Ajustes. Textos objetivos: qué hace cada parte y con qué datos.
document.head.insertAdjacentHTML('beforeend', `<style id="tutoEstilos">
#tutoCapa{position:fixed;inset:0;z-index:60;pointer-events:auto}
#tutoHueco{position:fixed;border-radius:14px;box-shadow:0 0 0 200vmax #000000b8,0 0 0 2px #ffffffcc inset,0 0 24px 4px #ff8a3d55;pointer-events:none;
  transition:top .38s cubic-bezier(.4,0,.2,1),left .38s cubic-bezier(.4,0,.2,1),width .38s cubic-bezier(.4,0,.2,1),height .38s cubic-bezier(.4,0,.2,1),opacity .3s}
#tutoHueco.centro{box-shadow:0 0 0 200vmax #000000b8;opacity:1}
#tutoGlobo{position:fixed;z-index:61;width:min(360px,calc(100vw - 32px));background:#1d1f24;color:#e8eaed;border:1px solid #ffffff1f;border-radius:14px;padding:16px 18px 14px;
  box-shadow:0 12px 40px #000c;transition:top .38s cubic-bezier(.4,0,.2,1),left .38s cubic-bezier(.4,0,.2,1),opacity .25s;font-size:14px;line-height:1.45}
#tutoGlobo .n{font-size:11.5px;color:#9aa0a6;letter-spacing:.4px;text-transform:uppercase;margin-bottom:4px}
#tutoGlobo h3{margin:0 0 6px;font-size:17px;color:#fff}
#tutoGlobo p{margin:0 0 6px;color:#c9ccd1}
#tutoGlobo .tip{font-size:12.5px;color:#9aa0a6}
#tutoGlobo .bts{display:flex;gap:8px;align-items:center;margin-top:12px}
#tutoGlobo .bts .esp{flex:1}
#tutoGlobo button{border:1px solid #ffffff26;background:#2a2d33;color:#e8eaed;border-radius:9px;height:34px;padding:0 14px;cursor:pointer;font:inherit;font-size:13.5px}
#tutoGlobo button.pri{background:var(--acento,#f28c38);border-color:transparent;color:#1b1210;font-weight:600}
#tutoGlobo button.sal{background:none;border:0;color:#9aa0a6;padding:0 4px}
#tutoPuntos{display:flex;gap:4px}#tutoPuntos i{width:6px;height:6px;border-radius:50%;background:#ffffff33}#tutoPuntos i.on{background:var(--acento,#f28c38)}
</style>`);

const TUTO = { i: 0, pasos: [], activo: false };
const tutoPasos = () => [
  { sel: null, t: 'Maps in Mars',
    d: lg('Una guía para moverse por la superficie de Marte con datos reales: relieve e imágenes de órbita (NASA, ESA, USGS), el recorrido de Curiosity y rutas calculadas para un rover, una persona a pie y un rover presurizado.',
      'A guide for moving across the surface of Mars with real data: terrain and orbital imagery (NASA, ESA, USGS), Curiosity\'s traverse and routes computed for a rover, a person on foot and a pressurized rover.'),
    tip: lg('Arrastrá para girar · rueda para acercarte · Ctrl + arrastrar para inclinar.', 'Drag to rotate · wheel to zoom · Ctrl + drag to tilt.') },
  { sel: '#busca', t: lg('Buscador', 'Search'), d: lg('Un lugar de Marte, una de las 49 perforaciones de Curiosity, una zona de Gale o unas coordenadas.', 'A place on Mars, one of Curiosity\'s 49 drill holes, a zone in Gale or coordinates.') },
  { sel: '#miIntPozos', t: lg('49 perforaciones', '49 drill holes'), d: lg('El recorrido real de Curiosity desde 2012 y sus 49 perforaciones. Cada ficha tiene el hallazgo, los minerales medidos y la fuente.', 'Curiosity\'s real traverse since 2012 and its 49 drill holes. Each card has the finding, the measured minerals and the source.') },
  { sel: '#urIntNuevo', t: lg('Nuevo recorrido · planificador', 'New route · planner'), d: lg('Planificá tu misión: puntos en orden desde la Base Gale (o perforaciones de Curiosity), notas, medidas y zonas dibujadas. Calcula la ruta más segura (pendiente ≤ 20°, provisorio; evita arena) con distancia, tiempo, energía y radiación. Los proyectos quedan guardados.', 'Plan your mission: points in order from Gale Base (or Curiosity drill holes), notes, measurements and drawn areas. It computes the safest route (slope ≤ 20°, provisional; avoids sand) with distance, time, energy and radiation. Projects are saved.') },
  { sel: '#miIntRec', t: lg('Nueva misión', 'New mission'), d: lg('Las rutas que proponemos desde donde está Curiosity hoy: rover, astronauta a pie, rover presurizado (PMR) y misión en pareja, con tiempo, pendiente y dosis de radiación en cada tramo.', 'The routes we propose from where Curiosity is today: rover, astronaut on foot, pressurized rover (PMR) and two-person mission, with time, slope and radiation dose on every leg.') },
  { sel: '#bMision', t: lg('Misión Curiosity · hasta hoy', 'Curiosity mission · so far'), d: lg('Lo que ya hizo Curiosity: el recorrido desde el aterrizaje, las perforaciones y la línea de tiempo de la misión.', 'What Curiosity has already done: the traverse since landing, the drill holes and the mission timeline.') },
  { sel: '.rb[data-t="base"]', t: lg('Sitios para la base', 'Sites for the base'), d: lg('Los sitios candidatos para una base en Gale, comparados por agua en minerales, carbonatos, perforaciones cerca, atmósfera encima y pendiente.', 'The candidate sites for a base in Gale, compared by water in minerals, carbonates, nearby drill holes, atmosphere overhead and slope.') },
  { sel: '.rb[data-t="capas"]', t: lg('Capas', 'Layers'), d: lg('Colores de altitud, agua en el suelo (Mars Odyssey), infrarrojo nocturno (THEMIS), nombres oficiales (IAU) y día y noche.', 'Altitude colors, water in the ground (Mars Odyssey), night infrared (THEMIS), official names (IAU) and day and night.') },
  { sel: '.rb[data-t="biblioteca"]', t: 'Wiki', d: lg('Toda la información guardada, con la fuente de cada dato.', 'All the stored information, with the source of every datum.') },
  { sel: '#rHistoria', t: lg('Historia', 'History'), d: lg('Línea de tiempo: de la formación de Gale a hoy.', 'Timeline: from the formation of Gale to today.') },
  { sel: '#rTour', t: 'Tour', d: lg('Un recorrido guiado de unos 2 minutos por lo principal.', 'A guided tour of about 2 minutes through the main points.') },
  { sel: '#rAjustes', t: lg('Ajustes', 'Settings'), d: lg('Calidad de imagen e idioma. Desde acá podés repetir este tutorial o la presentación.', 'Image quality and language. From here you can replay this tutorial or the intro.') },
  { sel: null, t: lg('Listo', 'Done'), d: lg('Para empezar, probá «Nueva misión» o «49 perforaciones».', 'To begin, try "New mission" or "49 drill holes".') },
];
function tutoVisible(el) { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; }
function tutoMostrar(i) {
  const P = TUTO.pasos; if (i < 0) i = 0;
  // salta los pasos cuyo botón no está a la vista (por ejemplo, en un celular)
  let dir = i >= TUTO.i ? 1 : -1;
  while (i > 0 && i < P.length && P[i].sel && !tutoVisible(document.querySelector(P[i].sel))) i += dir;
  if (i >= P.length) return tutoCerrar();
  TUTO.i = i; const p = P[i], el = p.sel && document.querySelector(p.sel), hueco = $('tutoHueco'), gl = $('tutoGlobo');
  gl.innerHTML = `<div class="n">${i + 1} / ${P.length}</div><h3>${p.t}</h3><p>${p.d}</p>${p.tip ? `<div class="tip">${p.tip}</div>` : ''}
    <div class="bts"><div id="tutoPuntos">${P.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><span class="esp"></span>
    ${i < P.length - 1 ? `<button class="sal" data-tu="salir">${lg('Saltar', 'Skip')}</button>` : ''}${i ? `<button data-tu="atras">${lg('Atrás', 'Back')}</button>` : ''}
    <button class="pri" data-tu="sig">${i < P.length - 1 ? lg('Siguiente', 'Next') : lg('Empezar', 'Start')}</button></div>`;
  gl.querySelector('[data-tu=sig]').onclick = () => tutoMostrar(TUTO.i + 1);
  gl.querySelector('[data-tu=atras]')?.addEventListener('click', () => tutoMostrar(TUTO.i - 1));
  gl.querySelector('[data-tu=salir]')?.addEventListener('click', tutoCerrar);
  const W = innerWidth, H = innerHeight, gw = gl.offsetWidth, gh = gl.offsetHeight;
  if (!el) { hueco.classList.add('centro'); Object.assign(hueco.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
    Object.assign(gl.style, { left: (W - gw) / 2 + 'px', top: (H - gh) / 2 + 'px' }); }
  else {
    hueco.classList.remove('centro'); const r = el.getBoundingClientRect(), m = 6;
    Object.assign(hueco.style, { left: r.left - m + 'px', top: r.top - m + 'px', width: r.width + 2 * m + 'px', height: r.height + 2 * m + 'px' });
    // globo: a la derecha si el botón está en el riel izquierdo, abajo si está arriba, a la izquierda si está a la derecha
    let x, y;
    if (r.right < W * 0.2) { x = r.right + 18; y = r.top + r.height / 2 - gh / 2; }
    else if (r.top < H * 0.3) { x = r.left + r.width / 2 - gw / 2; y = r.bottom + 18; }
    else { x = r.left - gw - 18; y = r.top + r.height / 2 - gh / 2; }
    Object.assign(gl.style, { left: Math.max(12, Math.min(W - gw - 12, x)) + 'px', top: Math.max(12, Math.min(H - gh - 12, y)) + 'px' });
  }
  gl.querySelector('[data-tu=sig]').focus({ preventScroll: true });
}
function tutoTeclas(e) {
  if (!TUTO.activo) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tutoCerrar(); }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); tutoMostrar(TUTO.i + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); tutoMostrar(TUTO.i - 1); }
}
function tutoEmpezar() {
  $('tutoPregunta')?.remove();
  if (typeof MI !== 'undefined' && MI.modo) miSalirModo(false);
  if (window.cerrarCajon) cerrarCajon();
  if (typeof TOUR !== 'undefined' && TOUR.activo) return;
  try { localStorage.setItem('mimTutorial', 'visto'); } catch {}
  TUTO.pasos = tutoPasos(); TUTO.i = 0; TUTO.activo = true;
  document.body.insertAdjacentHTML('beforeend', `<div id="tutoCapa"></div><div id="tutoHueco" class="centro"></div><div id="tutoGlobo" role="dialog" aria-live="polite"></div>`);
  addEventListener('keydown', tutoTeclas, true); addEventListener('resize', tutoReubicar);
  tutoMostrar(0);
}
function tutoReubicar() { if (TUTO.activo) tutoMostrar(TUTO.i); }
function tutoCerrar() {
  TUTO.activo = false; removeEventListener('keydown', tutoTeclas, true); removeEventListener('resize', tutoReubicar);
  for (const id of ['tutoCapa', 'tutoHueco', 'tutoGlobo']) { const e = $(id); if (!e) continue; e.style.opacity = 0; setTimeout(() => e.remove(), 260); }
}
// la primera vez (o después de "Empezar la presentación desde cero"), al llegar a Gale
function tutoPreguntar() {
  let visto = null, forzar = false; try { visto = localStorage.getItem('mimTutorial'); forzar = sessionStorage.getItem('mimPresentacion') === '1'; sessionStorage.removeItem('mimPresentacion'); } catch {}
  if (visto && !forzar) return;
  if ((typeof TOUR !== 'undefined' && TOUR.activo) || (typeof MI !== 'undefined' && MI.modo) || TUTO.activo) return;
  document.body.insertAdjacentHTML('beforeend', `<div id="tutoPregunta" style="position:fixed;inset:0;z-index:60;background:#000000a6;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .35s">
    <div id="tutoGlobo" style="position:relative;left:auto;top:auto"><div class="n">Maps in Mars</div><h3>${lg('¿Querés ver cómo se usa?', 'Want a quick tour of the controls?')}</h3>
    <p>${lg('Un minuto: te mostramos las partes principales, una por una.', 'One minute: we show you the main parts, one by one.')}</p><div class="tip">${lg('Lo podés repetir cuando quieras en Ajustes.', 'You can replay it any time from Settings.')}</div>
    <div class="bts"><span class="esp"></span><button data-tq="no">${lg('No, gracias', 'No, thanks')}</button><button class="pri" data-tq="si">${lg('Sí, mostrame', 'Yes, show me')}</button></div></div></div>`);
  const q = $('tutoPregunta'); requestAnimationFrame(() => q.style.opacity = 1);
  const cerrar = () => { try { localStorage.setItem('mimTutorial', 'visto'); } catch {} q.style.opacity = 0; setTimeout(() => q.remove(), 360); };
  q.querySelector('[data-tq=si]').onclick = () => { cerrar(); setTimeout(tutoEmpezar, 380); };
  q.querySelector('[data-tq=no]').onclick = cerrar;
  q.querySelector('[data-tq=si]').focus({ preventScroll: true });
}
window.tutoEmpezar = tutoEmpezar; window.tutoPreguntar = tutoPreguntar;

// ==================== Planificador de misión en el mapa 3D ====================
// Modo que se activa a voluntad ("Nuevo recorrido"). Barra vertical de herramientas: mano, puntos de ruta (0 = Base Gale, después 1, 2, 3…
// en el orden en que se ponen; tocar una perforación la toma como punto), notas, medir, pincel, rectángulo, círculo y borrar.
// La ruta más segura entre puntos sale del mismo A* del PMR (pmr.js) sobre el terreno de 12 m. Los proyectos se guardan en el navegador
// (siguen ahí al actualizar Maps in Mars) y se pueden exportar a un archivo. Un recorrido que vuelve a la base queda como "camino candidato":
// se dibuja y el A* lo prefiere (cuesta 30 % menos pasar por él) para planificar los siguientes.
document.head.insertAdjacentHTML('beforeend', `<style id="plEstilos">
#plBarra{display:none;flex-direction:column;align-items:center;gap:2px;padding:4px;background:var(--sup,#1d1f24);border-radius:20px;box-shadow:var(--sombra,0 4px 14px #0008)}
body.pl-on:not(.mi-modo) #plBarra{display:flex}
#plBarra button{width:34px;height:34px;border:0;border-radius:50%;background:none;color:#e8eaed;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;position:relative;padding:0}
#plBarra button:hover{background:#ffffff14}
#plBarra button.on{background:var(--acento,#f28c38);color:#1b1210}
#plBarra hr{width:20px;border:0;border-top:1px solid #ffffff22;margin:2px auto}
#plBarra .plMas{display:none;flex-direction:column;gap:2px;align-items:center}
#plBarra.abierta .plMas{display:flex}
#plBarra #plToggle{font-size:16px}
#plBarra.abierta #plToggle{background:#ffffff14}
#plBarra button[data-tip]:hover::after{content:attr(data-tip);position:absolute;right:44px;top:50%;transform:translateY(-50%);white-space:nowrap;background:#111;color:#fff;font-size:12.5px;padding:5px 9px;border-radius:7px;pointer-events:none;z-index:2}
body.pl-on.pl-dibujo #globo canvas{cursor:crosshair!important}
body.pl-on.pl-borrar #globo canvas{cursor:not-allowed!important}
#plAyuda{position:absolute;left:50%;transform:translateX(-50%);top:78px;z-index:9;background:#1d1f24ee;color:#e8eaed;border-radius:10px;padding:8px 14px;font-size:13px;display:none;box-shadow:0 6px 20px #0008;max-width:min(560px,70vw);text-align:center}
body.pl-on #plAyuda:not(:empty){display:block}
.pl-pt{border:1px solid #ffffff14;border-radius:10px;padding:8px 10px;margin:6px 0;background:#ffffff06}
.pl-pt .cab{display:flex;gap:8px;align-items:center}
.pl-pt .cab input{flex:1;background:none;border:0;color:#fff;font-family:inherit;font-weight:600;font-size:13.5px;min-width:0}
.pl-pt textarea{width:100%;box-sizing:border-box;margin-top:6px;background:#0003;border:1px solid #ffffff1a;border-radius:8px;color:#e8eaed;font-family:inherit;font-size:12.5px;padding:6px 8px;resize:vertical;min-height:34px}
.pl-pt .mini{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--suave);margin-top:6px}
.pl-pt .mini input{width:52px;background:#0003;border:1px solid #ffffff1a;border-radius:6px;color:#fff;padding:2px 5px}
.pl-pt .x{border:0;background:none;color:var(--suave);cursor:pointer;font-size:15px;padding:0 3px}
.pl-num{min-width:24px;height:24px;border-radius:12px;background:#4fd1ff;color:#0b2230;font:700 12.5px system-ui;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
.pl-num.base{background:#ffcf7a;color:#3a2600}
#plRes table{width:100%;font-size:12.5px;border-collapse:collapse}#plRes td,#plRes th{padding:4px 5px;border-bottom:1px solid #ffffff10;text-align:left}
.pl-av{border-left:3px solid var(--c);background:var(--sup2);border-radius:8px;padding:6px 9px;margin:5px 0;font-size:12.5px}
.pl-fila{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}
.pl-fila select,.pl-fila input[type=text],.pl-fila input[type=number]{background:#0003;border:1px solid #ffffff1a;border-radius:8px;color:#e8eaed;padding:6px 8px;font-family:inherit;font-size:13px}
.pl-fila select option{background:#1d1f24}
</style>`);

const PL_DDC = new C.DistanceDisplayCondition(0, 400000);      // lo del planificador no se ve desde la órbita
const PL = { activo: false, peligro: true, herr: 'mano', proy: null, hist: [], ds: null, dsCand: null, ruta: null, calc: 0, recId: null, fin: false, temp: null, verCand: true };
const PL_COL = { ruta: '#4fd1ff', base: '#ffcf7a', nota: '#ffd166', medida: '#ffffff', trazo: '#ff9f43', figura: '#c58bff', cand: '#5fd38d' };
const plId = () => Math.random().toString(36).slice(2, 9);
const plLeer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const plEscribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { avisar(lg('No se pudo guardar en este navegador (¿modo privado?). Usá «Exportar».', 'Could not save in this browser (private mode?). Use "Export".')); return false; } };
const plNuevo = () => ({ id: plId(), nombre: lg('Misión sin nombre', 'Untitled mission'), creado: Date.now(), mod: Date.now(), vehiculo: 'pmr', volver: true, parada_h: 1,
  pts: [], notas: [], medidas: [], trazos: [], figuras: [] });

// ---------- barra de herramientas ----------
const PL_HERR = [
  ['mano', '✋', lg('Mano: mover el mapa', 'Hand: move the map')],
  ['punto', '➊', lg('Puntos de ruta (0 = Base Gale; tocá una perforación para usarla)', 'Route points (0 = Gale Base; tap a drill hole to use it)')],
  ['nota', '📌', lg('Pin con nota', 'Pin with a note')],
  ['medir', '📏', lg('Medir distancia (doble clic para terminar)', 'Measure distance (double-click to finish)')],
  ['pincel', '✏️', lg('Pincel: dibujar a mano alzada (si cerrás la figura, da el área)', 'Brush: freehand drawing (closing the shape gives the area)')],
  ['rect', '▭', lg('Rectángulo: arrastrá de esquina a esquina', 'Rectangle: drag corner to corner')],
  ['circ', '◯', lg('Círculo: arrastrá desde el centro', 'Circle: drag from the center')],
  ['borrar', '⌫', lg('Borrar: tocá lo que quieras sacar', 'Erase: tap what you want to remove')],
];
// barra de herramientas: a la derecha, arriba de la brújula, plegable (no tapa el mapa ni los otros botones)
$('controles').insertAdjacentHTML('afterbegin', `<div id="plBarra" class="abierta" role="toolbar" aria-label="${lg('Herramientas del planificador', 'Planner tools')}">
  <button id="plToggle" data-tip="${lg('Mostrar u ocultar herramientas', 'Show or hide tools')}" aria-label="${lg('Herramientas', 'Tools')}">✎</button>
  <div class="plMas">${PL_HERR.map(([k, ic, t]) => `<button data-plh="${k}" data-tip="${t}" aria-label="${t}">${ic}</button>`).join('')}<hr>
  <button data-pla="deshacer" data-tip="${lg('Deshacer (Ctrl+Z)', 'Undo (Ctrl+Z)')}">↶</button>
  <button data-pla="panel" data-tip="${lg('Panel de la misión', 'Mission panel')}">☰</button>
  <button data-pla="salir" data-tip="${lg('Salir del planificador', 'Leave the planner')}">✕</button></div></div>`);
document.body.insertAdjacentHTML('beforeend', '<div id="plAyuda"></div>');
$('plToggle').onclick = () => $('plBarra').classList.toggle('abierta');
document.querySelectorAll('#plBarra [data-plh]').forEach(b => b.onclick = () => plHerr(b.dataset.plh));
document.querySelector('#plBarra [data-pla=deshacer]').onclick = () => plDeshacer();
document.querySelector('#plBarra [data-pla=panel]').onclick = () => plPanel();
document.querySelector('#plBarra [data-pla=salir]').onclick = () => plSalir();

function plHerr(h) {
  PL.herr = h; plTempFin();
  document.querySelectorAll('#plBarra [data-plh]').forEach(b => b.classList.toggle('on', b.dataset.plh === h));
  document.body.classList.toggle('pl-dibujo', h !== 'mano' && h !== 'borrar'); document.body.classList.toggle('pl-borrar', h === 'borrar');
  $('plAyuda').textContent = ({ mano: '', punto: lg('Tocá el mapa para agregar el punto siguiente. Tocá una perforación para ir a ella.', 'Tap the map to add the next point. Tap a drill hole to go to it.'),
    nota: lg('Tocá donde quieras dejar una nota.', 'Tap where you want to leave a note.'), medir: lg('Tocá para marcar; doble clic o Enter para terminar.', 'Tap to mark; double-click or Enter to finish.'),
    pincel: lg('Mantené apretado y dibujá. Si terminás cerca del inicio, se cierra y da el área.', 'Hold and draw. If you finish near the start, it closes and gives the area.'),
    rect: lg('Arrastrá de una esquina a la opuesta.', 'Drag from one corner to the opposite one.'), circ: lg('Arrastrá desde el centro hasta el borde.', 'Drag from the center to the edge.'),
    borrar: lg('Tocá un punto, nota, línea o figura para borrarlo.', 'Tap a point, note, line or shape to erase it.') })[h];
}

// ---------- abrir, cerrar, guardar ----------
async function plAbrir() {
  if (PL.activo) return plPanel();
  $('urIntNuevo').setAttribute('aria-pressed', 'true'); if (!PMR.T) avisar(lg('Abriendo el planificador: cargando el terreno de 12 m…', 'Opening the planner: loading the 12 m terrain…'));
  if (typeof MI !== 'undefined' && MI.modo) miSalirModo(false);
  if (!(await miCargar())) return;
  try { await pmrTerreno(); } catch { return avisar(lg('No se pudo cargar el terreno de 12 m (abrí con abrir.bat).', 'Could not load the 12 m terrain (open with abrir.bat).')); }
  if (MI.activo) miDejar();
  if (typeof cerrarLinea === 'function' && document.body.classList.contains('lineaAbierta')) cerrarLinea();
  if (UR.marcando) urMarcar(false); if (UR.ds) UR.ds.show = false;
  PL.activo = true; document.body.classList.add('pl-on'); $('urIntNuevo').setAttribute('aria-pressed', 'true');
  if (!PL.ds) { PL.ds = new C.CustomDataSource('planificador'); viewer.dataSources.add(PL.ds); PL.dsCand = new C.CustomDataSource('caminosCandidatos'); viewer.dataSources.add(PL.dsCand); }
  PL.ds.show = true; PL.dsCand.show = PL.verCand;
  if (PL.peligro) plPeligro(true);
  const ult = plLeer('mimProyectoActual', null), P = plLeer('mimProyectos', {});
  PL.proy = (ult && P[ult]) || Object.values(P).sort((a, b) => b.mod - a.mod)[0] || plNuevo();
  PL.hist = []; plPreferidos(); plDibujarCand(); plDibujar(); plPanel(); plCalcular(); plEncuadre();
  plHerr(PL.proy.pts.length ? 'mano' : 'punto');
}
function plSalir() {
  PL.activo = false; plTempFin(); document.body.classList.remove('pl-on', 'pl-dibujo', 'pl-borrar'); $('urIntNuevo').setAttribute('aria-pressed', 'false');
  if (PL.ds) PL.ds.show = false; if (PL.dsCand) PL.dsCand.show = false;
  if (PL.peligroNuestro) plPeligro(false);
  if (MI.fichaClave === 'plan' && window.cerrarCajon) cerrarCajon();
}
function plGuardar(cambio = true) {
  const p = PL.proy; if (!p) return; if (cambio) p.mod = Date.now();
  const P = plLeer('mimProyectos', {}); P[p.id] = p; plEscribir('mimProyectos', P); plEscribir('mimProyectoActual', p.id);
}
function plCambio(redibujar = true, recalcular = true) {
  PL.hist.push(JSON.stringify(PL.proy)); if (PL.hist.length > 50) PL.hist.shift();
  return () => { plGuardar(); if (redibujar) plDibujar(); if (recalcular) plCalcular(); };
}
function plDeshacer() {
  const s = PL.hist.pop(); if (!s) return avisar(lg('No hay nada para deshacer.', 'Nothing to undo.'));
  PL.proy = JSON.parse(s); plGuardar(); plDibujar(); plPanel(); plCalcular();
}
addEventListener('keydown', e => {
  if (!PL.activo || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); plDeshacer(); }
  else if (e.key === 'Enter' && PL.temp?.tipo === 'medir') { e.preventDefault(); plTempFin(true); }
  else if (e.key === 'Escape' && PL.herr !== 'mano') { e.preventDefault(); e.stopImmediatePropagation(); plHerr('mano'); }
}, true);

// ---------- geometría (equirectangular local, como el resto del proyecto) ----------
const plXY = (o, p) => [(p[0] - o[0]) * d2r * 3396190 * Math.cos(o[1] * d2r), (p[1] - o[1]) * d2r * 3396190];
function plArea(pts) { if (pts.length < 3) return 0; const o = pts[0]; let a = 0; const q = pts.map(p => plXY(o, p)); for (let i = 0; i < q.length; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; }
const plLargo = pts => pts.reduce((s, p, i) => i ? s + miDist(pts[i - 1][0], pts[i - 1][1], p[0], p[1]) : 0, 0);
const plKm = m => m >= 1000 ? `${miNum(m / 1000, m >= 10000 ? 1 : 2)} km` : `${miNum(m)} m`;
const plM2 = a => a >= 1e6 ? `${miNum(a / 1e6, 2)} km²` : a >= 1e4 ? `${miNum(a / 1e4, 1)} ha` : `${miNum(a)} m²`;
function plRect(a, b) { return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; }
function plCirc(c, r, n = 64) { const out = [], k = r / 3396190 / d2r; for (let i = 0; i <= n; i++) { const t = i / n * 2 * Math.PI; out.push([c[0] + k * Math.sin(t) / Math.cos(c[1] * d2r), c[1] + k * Math.cos(t)]); } return out; }
function plBase() { const b = MI.D.pmr || MI.D.base; return [b.lon, b.lat]; }

// ---------- dibujo en el mapa ----------
const plCol = c => C.Color.fromCssColorString(c);
function plLinea(ds, pts, col, ancho, extra = {}, dash = false) {
  return ds.entities.add({ ...extra, polyline: { positions: pts.map(p => pos(p[0], p[1])), width: ancho, clampToGround: true, zIndex: 30,
    material: dash ? new C.PolylineDashMaterialProperty({ color: plCol(col), dashLength: 16 }) : plCol(col) } });
}
function plEtq(ds, p, texto, col = '#fff', extra = {}) {
  return ds.entities.add({ ...extra, position: pos(p[0], p[1]), label: { text: texto, font: '600 13px system-ui', fillColor: plCol(col), showBackground: true, backgroundColor: C.Color.fromCssColorString('#111318').withAlpha(0.82),
    backgroundPadding: new C.Cartesian2(7, 4), heightReference: CLAMP, verticalOrigin: C.VerticalOrigin.BOTTOM, pixelOffset: new C.Cartesian2(0, -6), disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: PL_DDC } });
}
function plDibujar() {
  const ds = PL.ds, p = PL.proy; if (!ds || !p) return; ds.entities.removeAll();
  const prop = (tipo, id) => ({ properties: { plTipo: tipo, plId: id } });
  // ruta calculada (abajo de todo)
  if (PL.ruta) for (const leg of PL.ruta.legs) { const ps = urSimplificar(leg.L.pts.map(q => pos(q[0], q[1])));
    ds.entities.add({ polyline: { positions: ps, width: 8, clampToGround: true, zIndex: 20, material: plCol('#1b1210') } });
    ds.entities.add({ polyline: { positions: ps, width: 4.5, clampToGround: true, zIndex: 21, material: plCol(leg.vuelta ? '#9be7ff' : PL_COL.ruta) } }); }
  else if (p.pts.length) { const v = [plBase(), ...p.pts.map(q => [q.lon, q.lat])]; if (p.volver) v.push(plBase()); plLinea(ds, v, PL_COL.ruta, 3, {}, true); }
  // puntos de ruta: 0 = base
  const chip = (txt, col, q, extra, nombre) => ds.entities.add({ ...extra, position: pos(q[0], q[1]),
    billboard: { image: miChip(txt, col, true), scale: 0.55, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: PL_DDC },
    label: nombre ? { text: nombre, font: '600 12.5px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 4, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(16, -14),
      horizontalOrigin: C.HorizontalOrigin.LEFT, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new C.DistanceDisplayCondition(0, 60000) } : undefined });
  chip('0', PL_COL.base, plBase(), prop('base', 'base'), lg('Base Gale', 'Gale Base'));
  p.pts.forEach((q, i) => chip(String(i + 1), PL_COL.ruta, [q.lon, q.lat], prop('punto', q.id), q.nombre + (q.nota ? ' ✎' : '')));
  // notas
  for (const n of p.notas) { chip('✎', PL_COL.nota, [n.lon, n.lat], prop('nota', n.id));
    if (n.texto) plEtq(ds, [n.lon, n.lat], n.texto.length > 60 ? n.texto.slice(0, 58) + '…' : n.texto, PL_COL.nota, { ...prop('nota', n.id) }).label.pixelOffset = new C.Cartesian2(0, -44); }
  // medidas: tramos y total
  for (const m of p.medidas) { plLinea(ds, m.pts, PL_COL.medida, 3, prop('medida', m.id), true);
    for (let i = 1; i < m.pts.length; i++) { const a = m.pts[i - 1], b = m.pts[i]; if (m.pts.length > 2) plEtq(ds, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], plKm(miDist(a[0], a[1], b[0], b[1])), '#ddd', prop('medida', m.id)); }
    if (m.pts.length > 1) plEtq(ds, m.pts[m.pts.length - 1], `${lg('Total', 'Total')} ${plKm(plLargo(m.pts))}`, '#fff', prop('medida', m.id)); }
  // trazos del pincel (cerrados: con relleno y área)
  for (const t of p.trazos) {
    if (t.cerrado) { ds.entities.add({ ...prop('trazo', t.id), polygon: { hierarchy: t.pts.map(q => pos(q[0], q[1])), material: plCol(PL_COL.trazo).withAlpha(0.16), classificationType: C.ClassificationType.BOTH } });
      plLinea(ds, [...t.pts, t.pts[0]], PL_COL.trazo, 3, prop('trazo', t.id));
      const c = t.pts.reduce((s, q) => [s[0] + q[0] / t.pts.length, s[1] + q[1] / t.pts.length], [0, 0]);
      plEtq(ds, c, `${plM2(plArea(t.pts))} · ${lg('perímetro', 'perimeter')} ${plKm(plLargo([...t.pts, t.pts[0]]))}`, PL_COL.trazo, prop('trazo', t.id)); }
    else plLinea(ds, t.pts, PL_COL.trazo, 3, prop('trazo', t.id));
  }
  // figuras
  for (const f of p.figuras) {
    const pts = f.tipo === 'rect' ? plRect(f.a, f.b) : plCirc(f.a, miDist(f.a[0], f.a[1], f.b[0], f.b[1]));
    ds.entities.add({ ...prop('figura', f.id), polygon: { hierarchy: pts.map(q => pos(q[0], q[1])), material: plCol(PL_COL.figura).withAlpha(0.14), classificationType: C.ClassificationType.BOTH } });
    plLinea(ds, f.tipo === 'rect' ? [...pts, pts[0]] : pts, PL_COL.figura, 3, prop('figura', f.id));
    const txt = f.tipo === 'rect' ? `${plKm(miDist(f.a[0], f.a[1], f.b[0], f.a[1]))} × ${plKm(miDist(f.a[0], f.a[1], f.a[0], f.b[1]))} · ${plM2(plArea(pts))}`
      : `r ${plKm(miDist(f.a[0], f.a[1], f.b[0], f.b[1]))} · ${plM2(Math.PI * miDist(f.a[0], f.a[1], f.b[0], f.b[1]) ** 2)}`;
    plEtq(ds, f.tipo === 'rect' ? [(f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2] : f.a, (f.nombre ? f.nombre + ' · ' : '') + txt, PL_COL.figura, prop('figura', f.id));
  }
}

// ---------- entrada del mouse ----------
function plPick(posPant) {
  // con el rayo contra el terreno (no con la profundidad de la pantalla, que tomaba círculos, etiquetas o líneas y daba puntos corridos)
  const ray = viewer.camera.getPickRay(posPant), c = (ray && viewer.scene.globe.pick(ray, viewer.scene)) || viewer.camera.pickEllipsoid(posPant, MARS); if (!c) return null;
  const g = MARS.cartesianToCartographic(c); return [C.Math.toDegrees(g.longitude), centrica(C.Math.toDegrees(g.latitude))];
}
function plPozoEn(posPant) {      // ¿hay una perforación debajo del cursor (o a menos de 22 px)?
  const o = viewer.scene.pick(posPant), e = o?.id; let p = e && typeof POZOS !== 'undefined' ? POZOS.find(q => q.ent === e) : null;
  if (!p && typeof NUM !== 'undefined') { let mejor = 22; for (const q of NUM) { const w = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, q.ent.position.getValue(viewer.clock.currentTime)); if (!w) continue;
    const d = Math.hypot(w.x - posPant.x, w.y - posPant.y); if (d < mejor) { mejor = d; p = q; } } }
  return p && p.n != null ? p : null;
}
function plTempFin(guardar = false) {
  const T = PL.temp; PL.temp = null; viewer.scene.screenSpaceCameraController.enableInputs = true;
  if (T?.ent) for (const e of [].concat(T.ent)) PL.ds?.entities.remove(e);
  if (guardar && T?.tipo === 'medir' && T.pts.length > 1) { const fin = plCambio(); PL.proy.medidas.push({ id: plId(), pts: T.pts }); fin(); plPanel(); }
}
{
  const ss = viewer.screenSpaceEventHandler, prev = ss.getInputAction(C.ScreenSpaceEventType.LEFT_CLICK);
  ss.setInputAction(m => {
    if (!PL.activo || PL.herr === 'mano' || (typeof MI !== 'undefined' && MI.modo)) return prev && prev(m);
    const h = PL.herr, p = PL.proy;
    if (h === 'borrar') {
      const o = viewer.scene.pick(m.position), pr = o?.id?.properties; if (!pr?.plTipo) return;
      const tipo = pr.plTipo.getValue(), id = pr.plId.getValue(); if (tipo === 'base') return avisar(lg('El punto 0 es la Base Gale: no se borra.', 'Point 0 is Gale Base: it cannot be erased.'));
      const fin = plCambio(), lista = { punto: 'pts', nota: 'notas', medida: 'medidas', trazo: 'trazos', figura: 'figuras' }[tipo];
      p[lista] = p[lista].filter(x => x.id !== id); fin(); plPanel(); return;
    }
    if (h === 'punto') {
      const pz = plPozoEn(m.position), q = pz ? [pz.lon, pz.lat] : plPick(m.position); if (!q) return;
      if (!pmrDentro(q[0], q[1])) return avisar(lg('Ese punto está fuera del terreno con datos de 12 m (de Bradbury a la zona de hoy): no se puede calcular una ruta segura.', 'That point is outside the 12 m terrain data (Bradbury to today\'s area): a safe route cannot be computed.'));
      const fin = plCambio();
      p.pts.push({ id: plId(), lon: q[0], lat: q[1], nombre: pz ? lg(`Perforación ${pz.n} · ${pz.nombre}`, `Drill hole ${pz.n} · ${pz.nombre}`) : lg(`Punto ${p.pts.length + 1}`, `Point ${p.pts.length + 1}`), nota: '', pozo: pz ? pz.n : null, horas: null });
      fin(); plPanel(); return;
    }
    if (h === 'nota') {
      const q = plPick(m.position); if (!q) return; const fin = plCambio(false, false); const n = { id: plId(), lon: q[0], lat: q[1], texto: '' }; p.notas.push(n); fin(); plPanel(n.id); return;
    }
    if (h === 'medir') {
      const q = plPick(m.position); if (!q) return;
      if (!PL.temp) PL.temp = { tipo: 'medir', pts: [], ent: [] };
      PL.temp.pts.push(q); for (const e of PL.temp.ent) PL.ds.entities.remove(e);
      PL.temp.ent = [plLinea(PL.ds, PL.temp.pts.length > 1 ? PL.temp.pts : [q, q], PL_COL.medida, 3, {}, true), plEtq(PL.ds, q, plKm(plLargo(PL.temp.pts)))];
      return;
    }
  }, C.ScreenSpaceEventType.LEFT_CLICK);
  const prevDbl = ss.getInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  ss.setInputAction(m => { if (PL.activo && PL.temp?.tipo === 'medir') return plTempFin(true); if (prevDbl) prevDbl(m); }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  // arrastre: pincel, rectángulo, círculo (mientras se dibuja, el mapa no se mueve)
  const hd = new C.ScreenSpaceEventHandler(viewer.canvas);
  hd.setInputAction(m => {
    if (!PL.activo || !['pincel', 'rect', 'circ'].includes(PL.herr) || MI.modo) return;
    const q = plPick(m.position); if (!q) return;
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    PL.temp = { tipo: PL.herr, pts: [q], a: q, b: q, ent: [] };
  }, C.ScreenSpaceEventType.LEFT_DOWN);
  let ultMov = 0;
  hd.setInputAction(m => {
    const T = PL.temp; if (!T || !['pincel', 'rect', 'circ'].includes(T.tipo)) return;
    const t = performance.now(); if (t - ultMov < 30) return; ultMov = t;
    const q = plPick(m.endPosition); if (!q) return;
    for (const e of T.ent) PL.ds.entities.remove(e); T.ent = [];
    if (T.tipo === 'pincel') { const u = T.pts[T.pts.length - 1]; if (miDist(u[0], u[1], q[0], q[1]) > 1.5) T.pts.push(q); T.ent.push(plLinea(PL.ds, T.pts.length > 1 ? T.pts : [q, q], PL_COL.trazo, 3)); }
    else { T.b = q; const pts = T.tipo === 'rect' ? plRect(T.a, q) : plCirc(T.a, miDist(T.a[0], T.a[1], q[0], q[1]));
      T.ent.push(plLinea(PL.ds, T.tipo === 'rect' ? [...pts, pts[0]] : pts, PL_COL.figura, 3), plEtq(PL.ds, q, T.tipo === 'rect' ? plM2(plArea(pts)) : `r ${plKm(miDist(T.a[0], T.a[1], q[0], q[1]))}`, PL_COL.figura)); }
  }, C.ScreenSpaceEventType.MOUSE_MOVE);
  hd.setInputAction(() => {
    const T = PL.temp; if (!T || !['pincel', 'rect', 'circ'].includes(T.tipo)) return;
    for (const e of T.ent) PL.ds.entities.remove(e); PL.temp = null; viewer.scene.screenSpaceCameraController.enableInputs = true;
    const p = PL.proy;
    if (T.tipo === 'pincel') { if (T.pts.length < 3) return; const ini = T.pts[0], fin0 = T.pts[T.pts.length - 1], largo = plLargo(T.pts);
      const cerrado = miDist(ini[0], ini[1], fin0[0], fin0[1]) < Math.max(25, largo * 0.08);
      const fin = plCambio(true, false); p.trazos.push({ id: plId(), pts: T.pts.filter((_, i) => i % 2 === 0 || i === T.pts.length - 1), cerrado }); fin(); }
    else { if (miDist(T.a[0], T.a[1], T.b[0], T.b[1]) < 3) return; const fin = plCambio(true, false); p.figuras.push({ id: plId(), tipo: T.tipo, a: T.a, b: T.b, nombre: '' }); fin(); }
    plPanel();
  }, C.ScreenSpaceEventType.LEFT_UP);
}

// ---------- ruta más segura y números ----------
async function plCalcular() {
  const p = PL.proy, k = ++PL.calc; if (!p) return;
  if (!p.pts.length) { PL.ruta = null; plDibujar(); return plResultados(); }
  $('plRes') && ($('plRes').innerHTML = `<p class="sub">${lg('Calculando la ruta más segura…', 'Computing the safest route…')}</p>`);
  await new Promise(r => setTimeout(r, 30)); if (k !== PL.calc) return;
  const aPie = p.vehiculo === 'pie', PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA;
  const v = [plBase(), ...p.pts.map(q => [q.lon, q.lat])]; if (p.volver) v.push(plBase());
  const legs = [];
  for (let i = 1; i < v.length; i++) {
    const r = pmrRuta(v[i - 1], v[i], aPie), L = pmrLinea(r.v, aPie), S = L.pts;
    const lim = aPie ? PR.pMax : PR.rMax, paso = S.length > 1 ? L.largo / (S.length - 1) : 0;
    legs.push({ de: i - 1, a: p.volver && i === v.length - 1 ? 0 : i, vuelta: p.volver && i === v.length - 1, v: r.v, L,
      arena: S.filter(q => q[9] === -2).length * paso, sobre: S.filter(q => q[5] > lim).length * paso, fuera: S.filter(q => !pmrDentro(q[0], q[1])).length * paso, pmax: Math.max(0, ...S.map(q => q[5])) });
    if (k !== PL.calc) return;
    await new Promise(r => setTimeout(r, 0));
  }
  const tasa = q => PR.dosis * 1000 / 24 * (1 - PR.k * pmrMuestra(q.lon, q.lat).ci);       // µSv/h en ese lugar
  const paradas = p.pts.map(q => ({ h: q.horas ?? p.parada_h, dos: (q.horas ?? p.parada_h) * tasa(q) }));
  const T = { km: legs.reduce((s, l) => s + l.L.largo, 0), hMov: legs.reduce((s, l) => s + l.L.horas, 0), dosMov: legs.reduce((s, l) => s + l.L.dosis, 0), kwh: legs.reduce((s, l) => s + l.L.kwh, 0),
    sube: legs.reduce((s, l) => s + l.L.sube, 0), baja: legs.reduce((s, l) => s + l.L.baja, 0), pmax: Math.max(...legs.map(l => l.L.maxMarcha)), arena: legs.reduce((s, l) => s + l.arena, 0),
    sobre: legs.reduce((s, l) => s + l.sobre, 0), hPar: paradas.reduce((s, x) => s + x.h, 0), dosPar: paradas.reduce((s, x) => s + x.dos, 0),
    lejos: Math.max(...p.pts.map(q => miDist(v[0][0], v[0][1], q.lon, q.lat))) };
  T.hTot = T.hMov + T.hPar; T.dosTot = T.dosMov + T.dosPar; T.vMedia = T.hMov ? T.km / 1000 / T.hMov : 0;
  if (!aPie) T.bat = T.kwh / miBat() * 100; else T.kwh += 0;
  PL.ruta = { legs, T, paradas, aPie };
  p.km = T.km; p.rutaV = []; for (const l of legs) for (const q of (p.rutaV.length ? l.v.slice(1) : l.v)) p.rutaV.push([+q[0].toFixed(6), +q[1].toFixed(6)]);
  plGuardar(false); if (p.guardado) plDibujarGuardados();
  plDibujar(); plResultados();
}
function plResultados() {
  const el = $('plRes'); if (!el) return; const R = PL.ruta, p = PL.proy;
  if (!R) { el.innerHTML = `<p class="sub">${lg('Agregá al menos un punto (herramienta ➊) para calcular la ruta.', 'Add at least one point (➊ tool) to compute the route.')}</p>`; return; }
  const T = R.T, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, nom = i => i === 0 ? lg('Base', 'Base') : String(i);
  const av = [];
  if (T.sobre > 0) av.push(['#ff4d4d', lg(`Quedan ${plKm(T.sobre)} sobre pendientes de más de ${R.aPie ? PR.pMax : PR.rMax}°: algún punto está en una ladera muy empinada. Movelo a un lugar más plano.`, `${plKm(T.sobre)} remain on slopes over ${R.aPie ? PR.pMax : PR.rMax}°: a point sits on a very steep slope. Move it somewhere flatter.`)]);
  if (T.arena > 0) av.push(['#ffb02e', lg(`${plKm(T.arena)} sobre arena probable que la ruta no pudo evitar.`, `${plKm(T.arena)} on probable sand that the route could not avoid.`)]);
  if (!R.aPie && T.bat > 70) av.push([T.bat > 100 ? '#ff4d4d' : '#ffb02e', lg(`Usa el ${miNum(T.bat)} % de la batería del PMR.`, `Uses ${miNum(T.bat)} % of the PMR battery.`)]);
  if (R.aPie && T.hTot > EVA.max) av.push(['#ff4d4d', lg(`${miH(T.hTot)} afuera: más que el máximo del traje (${EVA.max} h).`, `${miH(T.hTot)} outside: more than the suit maximum (${EVA.max} h).`)]);
  else if (R.aPie && T.hTot > EVA.nom) av.push(['#ffb02e', lg(`${miH(T.hTot)} afuera: más que la salida nominal (${EVA.nom} h).`, `${miH(T.hTot)} outside: longer than a nominal EVA (${EVA.nom} h).`)]);
  if (!p.volver) av.push(['#9aa0a6', lg('El recorrido no vuelve a la base.', 'The route does not return to base.')]);
  const fila = (k, v, s = '') => `<div><small>${k}</small><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
  el.innerHTML = `<div class="ind">
      ${fila(lg('Distancia', 'Distance'), plKm(T.km))}${fila(lg('Tiempo total', 'Total time'), miH(T.hTot), lg(`${miH(T.hMov)} en marcha + ${miH(T.hPar)} en paradas`, `${miH(T.hMov)} moving + ${miH(T.hPar)} at stops`))}
      ${fila(lg('Velocidad media en marcha', 'Average moving speed'), `${miNum(T.vMedia, 1)} km/h`)}${fila(lg('Dosis de radiación', 'Radiation dose'), `${miNum(T.dosTot, 0)} µSv`, lg(`${miNum(T.dosMov)} en marcha + ${miNum(T.dosPar)} en paradas`, `${miNum(T.dosMov)} moving + ${miNum(T.dosPar)} at stops`))}
      ${R.aPie ? '' : fila(lg('Energía', 'Energy'), `${miNum(T.kwh, 1)} kWh`, `${miNum(T.bat)} % ${lg('de la batería', 'of the battery')}`)}
      ${fila(lg('Sube / baja', 'Climb / descent'), `${miNum(T.sube)} / ${miNum(T.baja)} m`)}${fila(lg('Pendiente máx. de marcha', 'Max. driving slope'), `${miNum(T.pmax, 1)}°`)}
      ${fila(lg('Punto más lejano de la base', 'Farthest point from base'), plKm(T.lejos))}</div>
    ${av.map(([c, t]) => `<div class="pl-av" style="--c:${c}">${t}</div>`).join('') || `<div class="pl-av" style="--c:#5fd38d">${lg('Sin avisos: la ruta evita pendientes sobre el límite y la arena probable.', 'No warnings: the route avoids slopes over the limit and probable sand.')}</div>`}
    <h2>${lg('Tramos', 'Legs')}</h2><table><tr><th>${lg('Tramo', 'Leg')}</th><th>km</th><th>${lg('Tiempo', 'Time')}</th><th>µSv</th><th>${lg('Pend. máx.', 'Max slope')}</th></tr>
      ${R.legs.map(l => `<tr><td>${nom(l.de)} → ${nom(l.a)}</td><td>${miNum(l.L.largo / 1000, 2)}</td><td>${miH(l.L.horas)}</td><td>${miNum(l.L.dosis, 1)}</td><td>${miNum(l.L.maxMarcha, 1)}°</td></tr>`).join('')}</table>
    <p class="fuente">${lg(`Ruta: A* sobre el terreno de 12 m (pendiente ≤ ${R.aPie ? PR.pMax : PR.rMax}°, arena probable penalizada, borde de los datos evitado${PL.pref ? ', caminos candidatos preferidos' : ''}). Velocidad del PMR: ${MI.D.pmr?.par?.velocidad_km_h || 10} km/h (NASA SEV, provisorio); a pie: función de Tobler. Dosis: RAD en superficie, 0,64 mSv/día (Hassler et al. 2014), menos lo que tapa el relieve; no descuenta el blindaje del vehículo (cota superior). Paradas: ${miNum(p.parada_h, 1)} h por punto salvo que cambies cada una (supuesto). Cálculo propio.`,
      `Route: A* over the 12 m terrain (slope ≤ ${R.aPie ? PR.pMax : PR.rMax}°, probable sand penalized, data edge avoided${PL.pref ? ', candidate paths preferred' : ''}). PMR speed: ${MI.D.pmr?.par?.velocidad_km_h || 10} km/h (NASA SEV, provisional); on foot: Tobler's function. Dose: RAD surface rate, 0.64 mSv/day (Hassler et al. 2014), minus what the terrain blocks; vehicle shielding not subtracted (upper bound). Stops: ${miNum(p.parada_h, 1)} h per point unless you change each one (assumption). Our calculation.`)}</p>`;
}

// ---------- panel de la misión ----------
function plPanel(foco) {
  const p = PL.proy, P = plLeer('mimProyectos', {}), lista = Object.values(P).sort((a, b) => b.mod - a.mod);
  const pozos = typeof NUM !== 'undefined' ? NUM.filter(q => pmrDentro(q.lon, q.lat)) : [];
  miFicha(lg('Planificador de misión', 'Mission planner'), `
    <p class="sub">${lg('Usá la barra de la izquierda: ➊ agrega puntos en orden (el 0 es la Base Gale), 📌 deja notas, 📏 mide, ✏️ ▭ ◯ marcan zonas. La ruta más segura entre puntos se calcula sola.', 'Use the bar on the left: ➊ adds points in order (0 is Gale Base), 📌 leaves notes, 📏 measures, ✏️ ▭ ◯ mark areas. The safest route between points is computed automatically.')}</p>
    <div class="pl-fila"><input type="text" id="plNombre" value="${miEsc(p.nombre)}" style="flex:1" aria-label="${lg('Título del recorrido', 'Route title')}" placeholder="${lg('Título del recorrido', 'Route title')}">
      <button class="mib pri" id="plGuardarR">${p.guardado ? lg('Guardado ✓', 'Saved ✓') : lg('Guardar recorrido', 'Save route')}</button></div>
    <div class="pl-fila"><button class="mib" id="plNuevoP">+ ${lg('Recorrido nuevo', 'New route')}</button><button class="mib" id="plInforme">📄 ${lg('Informe PDF', 'PDF report')}</button>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="plPeligro" ${PL.peligro ? 'checked' : ''}> ${lg('Zonas de peligro', 'Hazard zones')}</label></div>
    ${lista.filter(x => x.guardado).length ? `<h2>${lg('Recorridos guardados', 'Saved routes')}</h2>${lista.filter(x => x.guardado).map(x => `<div class="pl-fila" data-gid="${x.id}" style="font-size:13px;margin:3px 0">
      <label style="display:flex;gap:6px;align-items:center;flex:1;min-width:0" title="${lg('Ver u ocultar en el mapa', 'Show or hide on the map')}"><input type="checkbox" data-plg="ver" ${x.visible !== false ? 'checked' : ''}><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.id === p.id ? '▸ ' : ''}${miEsc(x.nombre)}</span></label>
      <small style="color:var(--suave)">${x.km ? plKm(x.km) : ''}</small><button class="x" data-plg="abrir" title="${lg('Abrir', 'Open')}">✎</button><button class="x" data-plg="x" title="${lg('Borrar', 'Delete')}">×</button></div>`).join('')}` : ''}
    <div class="pl-fila"><span class="mi-seg"><button data-plv="pmr" aria-pressed="${p.vehiculo === 'pmr'}">${lg('PMR · 10 km/h', 'PMR · 10 km/h')}</button><button data-plv="pie" aria-pressed="${p.vehiculo === 'pie'}">${lg('A pie', 'On foot')}</button></span>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="plVolver" ${p.volver ? 'checked' : ''}> ${lg('Volver a la base', 'Return to base')}</label>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px">${lg('Parada', 'Stop')} <input type="number" id="plParada" min="0" max="24" step="0.25" value="${p.parada_h}" style="width:58px"> h</label></div>
    <h2>${lg('Puntos de la ruta', 'Route points')} (${p.pts.length})</h2>
    <div class="pl-pt"><div class="cab"><span class="pl-num base">0</span><b>${lg('Base Gale (salida)', 'Gale Base (start)')}</b></div></div>
    ${p.pts.map((q, i) => `<div class="pl-pt" data-pid="${q.id}"><div class="cab"><span class="pl-num">${i + 1}</span><input value="${miEsc(q.nombre)}" data-plq="nombre">
        <button class="x" data-plq="sube" title="${lg('Subir', 'Move up')}" ${i ? '' : 'disabled'}>↑</button><button class="x" data-plq="baja" title="${lg('Bajar', 'Move down')}" ${i < p.pts.length - 1 ? '' : 'disabled'}>↓</button>
        <button class="x" data-plq="ir" title="${lg('Ver en el mapa', 'Show on map')}">◎</button><button class="x" data-plq="x" title="${lg('Quitar', 'Remove')}">×</button></div>
      <textarea data-plq="nota" placeholder="${lg('Nota: qué se hace acá (experimentos, instrumentos, muestras…)', 'Note: what is done here (experiments, instruments, samples…)')}">${miEsc(q.nota || '')}</textarea>
      <div class="mini">${lg('Parada', 'Stop')} <input type="number" min="0" max="48" step="0.25" data-plq="horas" value="${q.horas ?? ''}" placeholder="${p.parada_h}"> h · ${q.lat.toFixed(4)}°, ${q.lon.toFixed(4)}° E · ${lg('pendiente', 'slope')} ${miNum(pmrMuestra(q.lon, q.lat).p, 1)}°</div></div>`).join('')}
    <div class="pl-fila"><select id="plPozo"><option value="">+ ${lg('Agregar una perforación de Curiosity…', 'Add a Curiosity drill hole…')}</option>${pozos.map(q => `<option value="${q.n}">${q.n} · ${miEsc(q.nombre)}</option>`).join('')}</select></div>
    <h2>${lg('Resultado', 'Result')}</h2><div id="plRes"></div>
    ${p.notas.length ? `<h2>${lg('Notas en el mapa', 'Notes on the map')} (${p.notas.length})</h2>${p.notas.map(n => `<div class="pl-pt" data-nid="${n.id}"><div class="cab"><span class="pl-num" style="background:${PL_COL.nota}">✎</span><b style="flex:1">${n.lat.toFixed(4)}°, ${n.lon.toFixed(4)}° E</b><button class="x" data-pln="ir">◎</button><button class="x" data-pln="x">×</button></div>
      <textarea data-pln="texto" placeholder="${lg('Escribí la nota…', 'Write the note…')}">${miEsc(n.texto || '')}</textarea></div>`).join('')}` : ''}
    ${p.medidas.length || p.trazos.length || p.figuras.length ? `<h2>${lg('Dibujos y medidas', 'Drawings and measurements')}</h2><table>
      ${p.medidas.map(m => `<tr><td>📏 ${lg('Medida', 'Measurement')}</td><td>${plKm(plLargo(m.pts))}</td></tr>`).join('')}
      ${p.trazos.map(t => `<tr><td>✏️ ${t.cerrado ? lg('Área a mano', 'Freehand area') : lg('Trazo', 'Stroke')}</td><td>${t.cerrado ? plM2(plArea(t.pts)) : plKm(plLargo(t.pts))}</td></tr>`).join('')}
      ${p.figuras.map(f => { const r = miDist(f.a[0], f.a[1], f.b[0], f.b[1]); return `<tr><td>${f.tipo === 'rect' ? '▭ ' + lg('Rectángulo', 'Rectangle') : '◯ ' + lg('Círculo', 'Circle')}</td><td>${f.tipo === 'rect' ? plM2(plArea(plRect(f.a, f.b))) : plM2(Math.PI * r * r)}</td></tr>`; }).join('')}</table>` : ''}
    <h2>${lg('Caminos candidatos', 'Candidate paths')} (${plLeer('mimCandidatos', []).length})</h2>
    <p class="sub">${lg('Cuando un recorrido simulado vuelve a la base, su camino queda guardado como candidato a camino seguro. Se dibujan en verde y el cálculo de rutas los prefiere.', 'When a simulated route returns to base, its path is saved as a candidate safe path. They are drawn in green and the route calculation prefers them.')}</p>
    ${plLeer('mimCandidatos', []).map(c => `<div class="pl-fila" data-cid="${c.id}" style="font-size:12.5px"><span style="color:${PL_COL.cand}">━</span> <span style="flex:1">${miEsc(c.nombre)} · ${plKm(c.km)} · ${new Date(c.fecha).toLocaleDateString()}</span><button class="x" data-plc="x" title="${lg('Quitar', 'Remove')}">×</button></div>`).join('')}
    <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:4px 0"><input type="checkbox" id="plVerCand" ${PL.verCand ? 'checked' : ''}> ${lg('Mostrar caminos candidatos', 'Show candidate paths')}</label>
    <p class="fuente">${lg('Los recorridos se guardan en este navegador y siguen ahí aunque actualices Maps in Mars. Copia de seguridad:', 'Routes are saved in this browser and stay there when you update Maps in Mars. Backup:')} <a href="#" id="plExp">${lg('exportar (.json)', 'export (.json)')}</a> · <a href="#" id="plImp">${lg('importar', 'import')}</a><input type="file" id="plArch" accept=".json,application/json" hidden></p>`,
    `<button class="mib pri" id="plRec">${lg('Recorrer ▶', 'Run it ▶')}</button><button class="mib" id="plVer">${lg('Ver todo', 'Show all')}</button>`, 'plan');
  document.body.classList.remove('mi-wiki-on');
  const c = cont();
  const guardarSuave = () => { clearTimeout(PL.tg); PL.tg = setTimeout(() => { plGuardar(); plDibujar(); }, 400); };
  $('plNombre').oninput = e => { p.nombre = e.target.value || lg('Misión sin nombre', 'Untitled mission'); guardarSuave(); };
  const cargar = q => { PL.proy = q; PL.hist = []; plGuardar(false); plDibujar(); plPanel(); plCalcular(); plEncuadre(); };
  $('plNuevoP').onclick = () => cargar(plNuevo());
  $('plGuardarR').onclick = () => { if (!p.pts.length) return avisar(lg('Agregá al menos un punto antes de guardar.', 'Add at least one point before saving.'));
    if (!p.nombre || /sin nombre|untitled/i.test(p.nombre)) { $('plNombre').focus(); return avisar(lg('Poné un título al recorrido.', 'Give the route a title.')); }
    p.guardado = true; p.visible = true; plGuardar(); plDibujarGuardados(); avisar(lg(`Recorrido «${p.nombre}» guardado.`, `Route "${p.nombre}" saved.`)); plPanel(); };
  $('plInforme').onclick = plInforme;
  $('plPeligro').onchange = e => { PL.peligro = e.target.checked; plPeligro(PL.peligro); };
  c.querySelectorAll('[data-gid]').forEach(d => { const id = d.dataset.gid, P2 = plLeer('mimProyectos', {}), x = P2[id];
    d.querySelector('[data-plg=ver]').onchange = e => { x.visible = e.target.checked; P2[id] = x; plEscribir('mimProyectos', P2); if (id === p.id) p.visible = x.visible; plDibujarGuardados(); };
    d.querySelector('[data-plg=abrir]').onclick = () => cargar(x);
    d.querySelector('[data-plg=x]').onclick = () => { if (!confirm(lg(`¿Borrar el recorrido «${x.nombre}»?`, `Delete the route "${x.nombre}"?`))) return; delete P2[id]; plEscribir('mimProyectos', P2);
      if (id === p.id) cargar(Object.values(P2).sort((a, b) => b.mod - a.mod)[0] || plNuevo()); else { plDibujarGuardados(); plPanel(); } }; });
  c.querySelectorAll('[data-plv]').forEach(b => b.onclick = () => { const fin = plCambio(false); p.vehiculo = b.dataset.plv; fin(); plPanel(); });
  $('plVolver').onchange = e => { const fin = plCambio(); p.volver = e.target.checked; fin(); };
  $('plParada').onchange = e => { const fin = plCambio(false); p.parada_h = Math.max(0, +e.target.value || 0); fin(); };
  c.querySelectorAll('[data-pid]').forEach(d => { const q = p.pts.find(x => x.id === d.dataset.pid), i = p.pts.indexOf(q);
    d.querySelector('[data-plq=nombre]').oninput = e => { q.nombre = e.target.value; guardarSuave(); };
    d.querySelector('[data-plq=nota]').oninput = e => { q.nota = e.target.value; guardarSuave(); };
    d.querySelector('[data-plq=horas]').onchange = e => { const fin = plCambio(false); q.horas = e.target.value === '' ? null : Math.max(0, +e.target.value); fin(); };
    d.querySelector('[data-plq=x]').onclick = () => { const fin = plCambio(); p.pts.splice(i, 1); fin(); plPanel(); };
    d.querySelector('[data-plq=sube]').onclick = () => { if (!i) return; const fin = plCambio(); [p.pts[i - 1], p.pts[i]] = [p.pts[i], p.pts[i - 1]]; fin(); plPanel(); };
    d.querySelector('[data-plq=baja]').onclick = () => { if (i >= p.pts.length - 1) return; const fin = plCambio(); [p.pts[i + 1], p.pts[i]] = [p.pts[i], p.pts[i + 1]]; fin(); plPanel(); };
    d.querySelector('[data-plq=ir]').onclick = () => plIrA(q.lon, q.lat); });
  c.querySelectorAll('[data-nid]').forEach(d => { const n = p.notas.find(x => x.id === d.dataset.nid);
    d.querySelector('[data-pln=texto]').oninput = e => { n.texto = e.target.value; guardarSuave(); };
    d.querySelector('[data-pln=ir]').onclick = () => plIrA(n.lon, n.lat);
    d.querySelector('[data-pln=x]').onclick = () => { const fin = plCambio(true, false); p.notas = p.notas.filter(x => x !== n); fin(); plPanel(); }; });
  $('plPozo').onchange = e => { const q = NUM.find(x => String(x.n) === e.target.value); if (!q) return; const fin = plCambio();
    p.pts.push({ id: plId(), lon: q.lon, lat: q.lat, nombre: lg(`Perforación ${q.n} · ${q.nombre}`, `Drill hole ${q.n} · ${q.nombre}`), nota: '', pozo: q.n, horas: null }); fin(); plPanel(); };
  c.querySelectorAll('[data-cid] [data-plc=x]').forEach(b => b.onclick = () => { const id = b.closest('[data-cid]').dataset.cid; plEscribir('mimCandidatos', plLeer('mimCandidatos', []).filter(x => x.id !== id)); plPreferidos(); plDibujarCand(); plPanel(); plCalcular(); });
  $('plVerCand').onchange = e => { PL.verCand = e.target.checked; if (PL.dsCand) PL.dsCand.show = PL.verCand; };
  $('plExp').onclick = e => { e.preventDefault(); const b = new Blob([JSON.stringify({ tipo: 'maps-in-mars-proyecto', version: 1, proyecto: p }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (p.nombre || 'mision').replace(/[^\w\-áéíóúñ ]+/gi, '').trim().replace(/\s+/g, '_') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $('plImp').onclick = e => { e.preventDefault(); $('plArch').click(); };
  $('plArch').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()), q = j.proyecto || j;
      if (!Array.isArray(q.pts)) throw 0; q.id = plId(); for (const k of ['notas', 'medidas', 'trazos', 'figuras']) q[k] = q[k] || []; PL.proy = q; plGuardar(); plDibujar(); plPanel(); plCalcular(); plEncuadre(); }
    catch { avisar(lg('Ese archivo no es un proyecto de Maps in Mars.', 'That file is not a Maps in Mars project.')); } };
  $('plRec').onclick = plRecorrer; $('plVer').onclick = plEncuadre;
  plResultados();
  if (foco) setTimeout(() => cont().querySelector(`[data-nid="${foco}"] textarea`)?.focus(), 50);
}
function plIrA(lon, lat) { viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(lon, lat, alturaSuelo(lon, lat, null)), 60), { offset: new C.HeadingPitchRange(0, -0.9, 700), duration: 1.6, easingFunction: C.EasingFunction.CUBIC_IN_OUT }); }
function plEncuadre() {
  const p = PL.proy, v = [plBase(), ...p.pts.map(q => [q.lon, q.lat]), ...p.notas.map(n => [n.lon, n.lat]), ...p.figuras.flatMap(f => [f.a, f.b]), ...p.trazos.flatMap(t => t.pts), ...p.medidas.flatMap(m => m.pts)];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of v) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const r = Math.max(700, miDist(x0, y0, x1, y1) * 0.6), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(cx, cy, alturaSuelo(cx, cy, null)), r), { offset: new C.HeadingPitchRange(0, -1.2, r * 2.3), duration: 2, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 1500000 });
}

// ---------- recorrerlo en 3D y guardarlo como camino candidato al volver a la base ----------
function plRecorrer() {
  const R = PL.ruta, p = PL.proy; if (!R) return avisar(lg('Primero agregá puntos.', 'Add points first.'));
  const v = [R.legs[0].v[0]]; for (const l of R.legs) v.push(...l.v.slice(1));
  const L = pmrLinea(v, R.aPie), id = 'P' + (++UR.n);
  const paradas = []; let desde = 0;
  p.pts.forEach((q, i) => { let best = desde, bd = Infinity; for (let k = desde; k < L.pts.length; k++) { const d = miDist(q.lon, q.lat, L.pts[k][0], L.pts[k][1]); if (d < bd) { bd = d; best = k; } if (bd < 3 && d > 60) break; }
    desde = best; const pid = `${id}-${i + 1}`;
    MI.paradas[pid] = { id: pid, codigo: String(i + 1), nombre: q.nombre, color: PL_COL.ruta, lon: q.lon, lat: q.lat, motivo: q.nota || lg('Punto de tu misión.', 'A point of your mission.'), ficha: '' };
    paradas.push({ id: pid, d: L.pts[best][2] }); });
  const b = plBase();
  MI.lineas[id] = { ...L, id, nombre: p.nombre, tipo: R.aPie ? 'astronauta' : 'tripulado', color: PL_COL.ruta, paradas, idaVuelta: false,
    pmr: R.aPie ? { lon: b[0], lat: b[1], rumbo: 0, elev: pmrMuestra(b[0], b[1]).z } : undefined };
  PL.recId = id; PL.fin = false; UR.id = id;
  document.body.classList.remove('pl-on'); plTempFin(); if (window.cerrarCajon) cerrarCajon();
  miModo(id, 'ruta');
}
{
  const tick0 = miTick;
  miTick = function (dt) {
    const r = tick0(dt), m = MI.modo;
    if (m && m.id === PL.recId && !PL.fin && m.d >= m.L.largo - 2) { PL.fin = true; plCandidato(m.L); }
    return r;
  };
  const salir0 = miSalirModo;
  miSalirModo = function (...a) { const era = MI.modo?.id === PL.recId && PL.recId; const r = salir0(...a); if (era && PL.activo) { PL.recId = null; document.body.classList.add('pl-on'); plPanel(); plEncuadre(); } return r; };
  const vis0 = miVisibles;
  miVisibles = function () { vis0(); const m = MI.modo; if (PL.ds) PL.ds.show = PL.activo && (!m || m.id === PL.recId); if (PL.dsCand) PL.dsCand.show = PL.verCand && (PL.activo || !!m); };
}
function plCandidato(L) {
  const p = PL.proy; if (!p.volver) return miCard(lg('Recorrido terminado', 'Route finished'), p.nombre, lg('Este recorrido no vuelve a la base, así que no se guarda como camino candidato.', 'This route does not return to base, so it is not saved as a candidate path.'), [[lg('Entendido', 'Got it'), () => miCard(), true]]);
  const pts = []; let ult = null; for (const q of L.pts) if (!ult || miDist(ult[0], ult[1], q[0], q[1]) >= 24) { ult = [q[0], q[1]]; pts.push([+q[0].toFixed(6), +q[1].toFixed(6)]); }
  const lista = plLeer('mimCandidatos', []), c = { id: plId(), nombre: p.nombre, fecha: Date.now(), km: L.largo, pts, proyecto: p.id, vehiculo: p.vehiculo };
  lista.push(c); plEscribir('mimCandidatos', lista); plPreferidos(); plDibujarCand();
  miCard(lg('De vuelta en la base', 'Back at base'), lg('Camino guardado como candidato', 'Path saved as a candidate'),
    lg(`«${p.nombre}» (${plKm(L.largo)}) queda como camino candidato a camino seguro: se ve en verde y las próximas rutas lo van a preferir.`, `"${p.nombre}" (${plKm(L.largo)}) is now a candidate safe path: it shows in green and future routes will prefer it.`),
    [[lg('Entendido', 'Got it'), () => miCard(), true], [lg('No guardarlo', 'Do not keep it'), () => { plEscribir('mimCandidatos', plLeer('mimCandidatos', []).filter(x => x.id !== c.id)); plPreferidos(); plDibujarCand(); miCard(); }]]);
}
function plDibujarCand() {
  const ds = PL.dsCand; if (!ds) return; ds.entities.removeAll();
  for (const c of plLeer('mimCandidatos', [])) { if (c.pts.length < 2) continue;
    ds.entities.add({ polyline: { positions: c.pts.map(q => pos(q[0], q[1])), width: 7, clampToGround: true, zIndex: 10, material: plCol(PL_COL.cand).withAlpha(0.35) } });
    ds.entities.add({ polyline: { positions: c.pts.map(q => pos(q[0], q[1])), width: 2.5, clampToGround: true, zIndex: 11, material: new C.PolylineDashMaterialProperty({ color: plCol(PL_COL.cand), dashLength: 20 }) } }); }
}
// celdas por donde pasan los caminos candidatos (y una alrededor): el A* de pmr.js las cobra 30 % menos
function plPreferidos() {
  const T = PMR.T; if (!T) return; const lista = plLeer('mimCandidatos', []);
  if (!lista.length) { PMR.pref = null; PL.pref = false; return; }
  const G = new Uint8Array(T.W * T.H);
  for (const c of lista) for (let i = 1; i < c.pts.length; i++) { const [a, b] = [c.pts[i - 1], c.pts[i]], n = Math.max(1, Math.ceil(miDist(a[0], a[1], b[0], b[1]) / 6));
    for (let u = 0; u <= n; u++) { const [cc, ff] = pmrCelda(a[0] + (b[0] - a[0]) * u / n, a[1] + (b[1] - a[1]) * u / n);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cc + dx, y = ff + dy; if (x >= 0 && y >= 0 && x < T.W && y < T.H) G[y * T.W + x] = 1; } } }
  PMR.pref = G; PL.pref = true;
}
$('urIntNuevo').onclick = () => PL.activo ? plSalir() : plAbrir();
$('urIntNuevo').title = lg('Planificador de misión: puntos en orden desde la base, notas, medidas y dibujos, con la ruta más segura, tiempo, energía y radiación', 'Mission planner: points in order from the base, notes, measurements and drawings, with the safest route, time, energy and radiation');
{ const ent0 = miEntrar; miEntrar = function (...a) { if (PL.activo) plSalir(); return ent0(...a); }; }
// ---------- zonas de peligro (pendiente) mientras se planifica: la misma capa de Capas → Análisis ----------
async function plPeligro(on) {
  if (typeof capaAnalisis !== 'function') return;
  if (on) { if (typeof CAPA_A !== 'undefined' && CAPA_A.zonas_prohibidas && CAPA_A.zonas_prohibidas.show) return; PL.peligroNuestro = true; await capaAnalisis('zonas_prohibidas', true, 0.5); }
  else { PL.peligroNuestro = false; await capaAnalisis('zonas_prohibidas', false, 0.5); }
}

// ---------- recorridos guardados: se ven en el mapa aunque el planificador esté cerrado (cada uno se prende o apaga) ----------
const PL_TONOS = ['#4fd1ff', '#ff9f43', '#5fd38d', '#c58bff', '#ff6b8b', '#ffd166'];
function plDibujarGuardados() {
  if (!PL.dsGuard) { PL.dsGuard = new C.CustomDataSource('recorridosGuardados'); viewer.dataSources.add(PL.dsGuard); }
  const ds = PL.dsGuard; ds.entities.removeAll();
  Object.values(plLeer('mimProyectos', {})).filter(x => x.guardado && x.visible !== false && x.rutaV?.length > 1).forEach((x, k) => {
    if (PL.activo && x.id === PL.proy?.id) return;            // el que se está editando ya está dibujado
    const col = PL_TONOS[k % PL_TONOS.length], ps = urSimplificar(x.rutaV.map(q => pos(q[0], q[1])));
    ds.entities.add({ polyline: { positions: ps, width: 7, clampToGround: true, zIndex: 18, material: plCol('#1b1210').withAlpha(0.8) } });
    ds.entities.add({ polyline: { positions: ps, width: 3.5, clampToGround: true, zIndex: 19, material: plCol(col) } });
    x.pts.forEach((q, i) => ds.entities.add({ position: pos(q.lon, q.lat), billboard: { image: miChip(String(i + 1), col), scale: 0.42, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: PL_DDC } }));
    plEtq(ds, x.rutaV[Math.floor(x.rutaV.length / 2)], x.nombre, col);
  });
}
setTimeout(() => { try { plDibujarGuardados(); } catch {} }, 6000);
{ const vg0 = miVisibles; miVisibles = function () { vg0(); if (PL.dsGuard) PL.dsGuard.show = !MI.modo || MI.modo.id === PL.recId; }; }

// ---------- informe en PDF (tipo informe científico): por qué cada lugar, ruta, seguridad, método y fuentes ----------
async function plInforme() {
  const p = PL.proy, R = PL.ruta; if (!R) return avisar(lg('Primero agregá puntos y esperá el cálculo de la ruta.', 'Add points and wait for the route first.'));
  const vent = window.open('', '_blank'); if (!vent) return avisar(lg('El navegador bloqueó la ventana del informe: permití ventanas emergentes.', 'The browser blocked the report window: allow pop-ups.'));
  vent.document.write(`<p style="font:16px system-ui;padding:20px">${lg('Armando el informe…', 'Building the report…')}</p>`);
  try { if (typeof cargarBiblioteca === 'function') await cargarBiblioteca(); } catch {}
  // foto del mapa con todo el recorrido
  plEncuadre(); await new Promise(r => setTimeout(r, 2600));
  for (let i = 0; i < 20 && !viewer.scene.globe.tilesLoaded; i++) await new Promise(r => setTimeout(r, 200));
  const foto = await new Promise(r => { const f = () => { viewer.scene.postRender.removeEventListener(f); try { r(viewer.canvas.toDataURL('image/jpeg', 0.85)); } catch { r(null); } }; viewer.scene.postRender.addEventListener(f); viewer.scene.requestRender?.(); });
  const T = R.T, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, esc = miEsc, BP = (typeof BIB !== 'undefined' && BIB.datos) ? BIB.datos.pozos : [], AN = typeof BIB !== 'undefined' ? BIB.analisis : null;
  const pozoDe = n => BP.find(x => x.n === n), cerca = q => { let b = null, bd = Infinity; for (const x of (typeof NUM !== 'undefined' ? NUM : [])) { const d = miDist(q.lon, q.lat, x.lon, x.lat); if (d < bd) { bd = d; b = x; } } return b && { p: b, d: bd }; };
  const fecha = new Date().toLocaleDateString(lg('es-AR', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric' });
  const motivo = q => {
    const S = pmrMuestra(q.lon, q.lat), tasa = PR.dosis * 1000 / 24 * (1 - PR.k * S.ci), out = [];
    const bz = q.pozo != null ? pozoDe(q.pozo) : null;
    if (bz) {
      out.push(`<p><b>${lg('Hallazgo de Curiosity en este pozo', 'Curiosity\'s finding at this drill hole')}</b> (${lg('medido', 'measured')}): ${esc(bz.hallazgo || '—')} <span class="f">${esc(bz.fuente_hallazgo || '')}</span></p>`);
      if (bz.chemin?.length) { const ch = bz.chemin[0], top = ch.minerales.slice(0, 4).map(m => `${esc(m[0])} ${fmt(m[1], 1)} %`).join(', ');
        out.push(`<p>${lg('Minerales (CheMin)', 'Minerals (CheMin)')}: ${top}${ch.arcillas != null ? `; ${lg('arcillas', 'clays')} ${fmt(ch.arcillas, 0)} %` : ''}${ch.amorfo != null ? `; ${lg('amorfo', 'amorphous')} ${fmt(ch.amorfo, 0)} %` : ''}. <span class="f">NASA PDS, CheMin RDR</span></p>`); }
      if (AN) { const ag = AN.agua.find(r => r.n === bz.n), cand = AN.candidatos.some(r => r.n === bz.n), ox = AN.oxicloros.some(r => r.n === bz.n), ni = AN.nitratos.some(r => r.n === bz.n);
        const l = []; if (ag) l.push(lg(`el agua empieza a salir a ${fmt(ag.h2o_primer_pico_C, 0)} °C${ag.acido_primer_pico_C != null ? ` y el primer gas ácido a ${fmt(ag.acido_primer_pico_C, 0)} °C` : ''}`, `water starts to come out at ${fmt(ag.h2o_primer_pico_C, 0)} °C${ag.acido_primer_pico_C != null ? ` and the first acid gas at ${fmt(ag.acido_primer_pico_C, 0)} °C` : ''}`));
        if (cand) l.push(lg('cumple las tres condiciones de agua fácil y limpia', 'meets the three conditions for easy, clean water'));
        if (ox) l.push(lg('libera O₂ junto con HCl (oxicloros: riesgo y recurso)', 'releases O₂ with HCl (oxychlorines: hazard and resource)'));
        if (ni) l.push(lg('tiene NO de nitratos (nitrógeno para cultivos)', 'has NO from nitrates (nitrogen for crops)'));
        if (l.length) out.push(`<p>${lg('Para una misión', 'For a mission')} (${lg('cálculo propio sobre SAM', 'our calculation on SAM data')}): ${l.join('; ')}.</p>`); }
    } else { const c = cerca(q); if (c) out.push(`<p>${lg('Perforación de Curiosity más cercana', 'Nearest Curiosity drill hole')}: ${c.p.n} · ${esc(c.p.nombre)}, ${lg('a', 'at')} ${plKm(c.d)}.${pozoDe(c.p.n)?.hallazgo ? ` ${lg('Allí', 'There')}: ${esc(pozoDe(c.p.n).hallazgo)}` : ''}</p>`); }
    out.push(`<p>${lg('Terreno en el punto', 'Terrain at the point')} (${lg('cálculo propio, DEM de 12 m', 'our calculation, 12 m DEM')}): ${lg('pendiente', 'slope')} ${fmt(S.p, 1)}°${S.p > PR.pMax ? ` ⚠ ${lg('sobre el límite', 'over the limit')}` : ''}; ${S.ar ? lg('arena probable', 'probable sand') : lg('suelo firme', 'firm ground')}; ${lg('cielo tapado por el relieve', 'sky blocked by terrain')} ${fmt(S.ci * 100, 0)} %; ${lg('dosis en superficie', 'surface dose')} ${fmt(tasa, 1)} µSv/h.</p>`);
    return out.join('');
  };
  const av = []; if (T.sobre > 0) av.push(lg(`${plKm(T.sobre)} sobre pendientes de más de ${R.aPie ? PR.pMax : PR.rMax}°.`, `${plKm(T.sobre)} on slopes over ${R.aPie ? PR.pMax : PR.rMax}°.`));
  if (T.arena > 0) av.push(lg(`${plKm(T.arena)} sobre arena probable.`, `${plKm(T.arena)} on probable sand.`));
  if (!R.aPie && T.bat > 70) av.push(lg(`Usa el ${fmt(T.bat, 0)} % de la batería del PMR.`, `Uses ${fmt(T.bat, 0)} % of the PMR battery.`));
  if (R.aPie && T.hTot > EVA.nom) av.push(lg(`${miH(T.hTot)} afuera: más que la salida nominal de ${EVA.nom} h.`, `${miH(T.hTot)} outside: longer than the nominal ${EVA.nom} h EVA.`));
  const html = `<!DOCTYPE html><html lang="${lg('es', 'en')}"><head><meta charset="utf-8"><title>${esc(p.nombre)} · Maps in Mars</title><style>
    body{font:11pt/1.5 Georgia,'Times New Roman',serif;color:#111;max-width:180mm;margin:12mm auto;padding:0 6mm}
    h1{font:600 20pt/1.2 system-ui,sans-serif;margin:0 0 2mm}h2{font:600 13pt system-ui,sans-serif;margin:7mm 0 2mm;border-bottom:1px solid #ccc;padding-bottom:1mm}
    h3{font:600 11pt system-ui,sans-serif;margin:4mm 0 1mm}.sub{color:#555;font:10pt system-ui,sans-serif}.f{color:#666;font-size:9pt}
    table{border-collapse:collapse;width:100%;font:9.5pt system-ui,sans-serif}td,th{border-bottom:1px solid #ddd;padding:3px 5px;text-align:left}
    .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;font:10pt system-ui,sans-serif}.kpi div{border:1px solid #ddd;border-radius:3mm;padding:2mm}.kpi b{display:block;font-size:13pt}
    img{width:100%;border-radius:2mm;border:1px solid #ccc}.nota{background:#f4f1ea;border-left:3px solid #c97a2b;padding:2mm 3mm;margin:2mm 0}
    @media print{.noimp{display:none}h2{break-after:avoid}.pt{break-inside:avoid}}</style></head><body>
    <div class="noimp" style="background:#fff7e6;border:1px solid #f0c27a;padding:3mm;border-radius:2mm;margin-bottom:5mm;font:10pt system-ui">${lg('Para guardarlo como PDF: Imprimir → «Guardar como PDF».', 'To save it as a PDF: Print → "Save as PDF".')} <button onclick="print()">${lg('Imprimir / PDF', 'Print / PDF')}</button></div>
    <div class="sub">Maps in Mars · ${lg('Informe de misión', 'Mission report')} · ${fecha}</div><h1>${esc(p.nombre)}</h1>
    <div class="sub">${lg(`Cráter Gale, Marte. Salida y regreso: Base Gale (${MI.D.base.lat.toFixed(4)}°, ${MI.D.base.lon.toFixed(4)}° E). Vehículo: ${R.aPie ? 'a pie (traje)' : 'rover presurizado (PMR)'}.`, `Gale crater, Mars. Start and return: Gale Base (${MI.D.base.lat.toFixed(4)}°, ${MI.D.base.lon.toFixed(4)}° E). Vehicle: ${R.aPie ? 'on foot (suit)' : 'pressurized rover (PMR)'}.`)}</div>
    <h2>${lg('Resumen', 'Summary')}</h2><div class="kpi">
      <div>${lg('Distancia', 'Distance')}<b>${plKm(T.km)}</b></div><div>${lg('Tiempo total', 'Total time')}<b>${miH(T.hTot)}</b></div><div>${lg('Velocidad media', 'Average speed')}<b>${fmt(T.vMedia, 1)} km/h</b></div><div>${lg('Dosis', 'Dose')}<b>${fmt(T.dosTot, 0)} µSv</b></div>
      ${R.aPie ? '' : `<div>${lg('Energía', 'Energy')}<b>${fmt(T.kwh, 1)} kWh</b></div><div>${lg('Batería', 'Battery')}<b>${fmt(T.bat, 0)} %</b></div>`}<div>${lg('Pendiente máx.', 'Max slope')}<b>${fmt(T.pmax, 1)}°</b></div><div>${lg('Sube / baja', 'Climb / descent')}<b>${fmt(T.sube, 0)} / ${fmt(T.baja, 0)} m</b></div></div>
    <p>${lg(`La misión recorre ${p.pts.length} punto${p.pts.length === 1 ? '' : 's'} en el orden planificado${p.volver ? ' y vuelve a la base' : ''}: ${miH(T.hMov)} en marcha y ${miH(T.hPar)} en paradas. ${av.length ? 'Avisos: ' + av.join(' ') : 'La ruta calculada evita las pendientes sobre el límite y la arena probable.'}`, `The mission visits ${p.pts.length} point${p.pts.length === 1 ? '' : 's'} in the planned order${p.volver ? ' and returns to base' : ''}: ${miH(T.hMov)} moving and ${miH(T.hPar)} at stops. ${av.length ? 'Warnings: ' + av.join(' ') : 'The computed route avoids slopes over the limit and probable sand.'}`)}</p>
    ${foto ? `<img src="${foto}" alt="${lg('Mapa del recorrido', 'Route map')}"><div class="f">${lg('Vista 3D del recorrido en Maps in Mars (relieve y mosaico de NASA/USGS/ESA).', '3D view of the route in Maps in Mars (NASA/USGS/ESA terrain and imagery).')}</div>` : ''}
    <h2>${lg('Objetivos y justificación de cada punto', 'Objectives and rationale for each point')}</h2>
    ${p.pts.map((q, i) => `<div class="pt"><h3>${i + 1}. ${esc(q.nombre)}</h3><div class="f">${q.lat.toFixed(5)}°, ${q.lon.toFixed(5)}° E · ${lg('parada', 'stop')} ${miH(q.horas ?? p.parada_h)}</div>
      ${q.nota ? `<div class="nota"><b>${lg('Qué se hace acá', 'What is done here')}:</b> ${esc(q.nota)}</div>` : ''}${motivo(q)}</div>`).join('')}
    <h2>${lg('Ruta por tramos', 'Route by leg')}</h2><table><tr><th>${lg('Tramo', 'Leg')}</th><th>km</th><th>${lg('Tiempo', 'Time')}</th><th>µSv</th><th>${lg('Pend. máx.', 'Max slope')}</th><th>${lg('Arena', 'Sand')}</th></tr>
      ${R.legs.map(l => `<tr><td>${l.de === 0 ? lg('Base', 'Base') : l.de} → ${l.a === 0 ? lg('Base', 'Base') : l.a}</td><td>${fmt(l.L.largo / 1000, 2)}</td><td>${miH(l.L.horas)}</td><td>${fmt(l.L.dosis, 1)}</td><td>${fmt(l.L.maxMarcha, 1)}°</td><td>${l.arena ? plKm(l.arena) : '—'}</td></tr>`).join('')}</table>
    ${p.notas.length ? `<h2>${lg('Notas de campo', 'Field notes')}</h2>${p.notas.map(n => `<div class="nota"><span class="f">${n.lat.toFixed(5)}°, ${n.lon.toFixed(5)}° E</span><br>${esc(n.texto || '—')}</div>`).join('')}` : ''}
    ${p.trazos.length || p.figuras.length || p.medidas.length ? `<h2>${lg('Áreas y medidas marcadas', 'Marked areas and measurements')}</h2><table>
      ${p.figuras.map(f => { const r = miDist(f.a[0], f.a[1], f.b[0], f.b[1]); return `<tr><td>${f.tipo === 'rect' ? lg('Rectángulo', 'Rectangle') : lg('Círculo', 'Circle')}</td><td>${f.tipo === 'rect' ? `${plKm(miDist(f.a[0], f.a[1], f.b[0], f.a[1]))} × ${plKm(miDist(f.a[0], f.a[1], f.a[0], f.b[1]))} · ${plM2(plArea(plRect(f.a, f.b)))}` : `r ${plKm(r)} · ${plM2(Math.PI * r * r)}`}</td></tr>`; }).join('')}
      ${p.trazos.filter(t => t.cerrado).map(t => `<tr><td>${lg('Área dibujada', 'Drawn area')}</td><td>${plM2(plArea(t.pts))}</td></tr>`).join('')}${p.medidas.map(m => `<tr><td>${lg('Medida', 'Measurement')}</td><td>${plKm(plLargo(m.pts))}</td></tr>`).join('')}</table>` : ''}
    <h2>${lg('Método y supuestos', 'Method and assumptions')}</h2>
    <p>${lg(`Ruta: búsqueda A* sobre una grilla de elevación de 12 m del cráter Gale (DEM de USGS), con pendiente máxima de ${R.aPie ? PR.pMax : PR.rMax}° (provisorio), arena probable penalizada y el borde de los datos evitado${PL.pref ? '; los caminos candidatos ya recorridos cuestan 30 % menos' : ''}. Velocidad del PMR ${MI.D.pmr?.par?.velocidad_km_h || 10} km/h (hoja técnica del Space Exploration Vehicle de NASA); a pie, función de Tobler. Dosis: 0,64 mSv/día medida por RAD en la superficie (Hassler et al. 2014), reducida según el cielo que tapa el relieve; no se descuenta el blindaje del vehículo, así que es una cota superior. Paradas de ${miH(p.parada_h)} por punto salvo indicación (supuesto). Energía del PMR: modelo del equipo con datos de NASA (cálculo propio).`,
      `Route: A* search on a 12 m elevation grid of Gale crater (USGS DEM), maximum slope ${R.aPie ? PR.pMax : PR.rMax}° (provisional), probable sand penalized and the data edge avoided${PL.pref ? '; candidate paths already travelled cost 30 % less' : ''}. PMR speed ${MI.D.pmr?.par?.velocidad_km_h || 10} km/h (NASA Space Exploration Vehicle fact sheet); on foot, Tobler's function. Dose: 0.64 mSv/day measured by RAD at the surface (Hassler et al. 2014), reduced by the sky blocked by terrain; vehicle shielding is not subtracted, so it is an upper bound. Stops of ${miH(p.parada_h)} per point unless stated (assumption). PMR energy: team model with NASA data (our calculation).`)}</p>
    <h2>${lg('Fuentes', 'Sources')}</h2><ol class="f" style="font-size:9.5pt">
      <li>NASA PDS Geosciences Node, Mars Science Laboratory (CheMin, APXS, SAM): https://pds-geosciences.wustl.edu/missions/msl/</li>
      <li>Gale Crater Mineralogy and Geochemistry Database (Bristow &amp; Lafuente), doi:10.48484/JN48-YW52</li>
      <li>Hassler, D. M. et al. (2014). Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. Science 343, doi:10.1126/science.1244797</li>
      <li>NASA, Space Exploration Vehicle fact sheet: https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf</li>
      <li>USGS Astrogeology, MSL Gale crater DEM and HiRISE/CTX mosaics (Mars Trek / PDS)</li>
      <li>NASA/JPL-Caltech/MSSS, Curiosity raw images and mission blog: https://science.nasa.gov/mission/msl-curiosity/</li></ol>
    <p class="f">${lg('Informe generado con Maps in Mars (NASA Space Apps 2026, San Luis). Los valores marcados como cálculo propio o supuesto son estimaciones del equipo.', 'Report generated with Maps in Mars (NASA Space Apps 2026, San Luis). Values marked as our calculation or assumption are team estimates.')}</p>
    <script>setTimeout(() => print(), 600);<\/script></body></html>`;
  vent.document.open(); vent.document.write(html); vent.document.close();
}
setTimeout(() => { try { pmrTerreno().catch(() => {}); } catch {} }, 15000);    // el terreno del planificador se baja de antemano
window.__plan = { PL, abrir: plAbrir, calcular: plCalcular };

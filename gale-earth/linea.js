// ==================== Línea de tiempo (estilo Google Earth) ====================
// Desde la formación de Gale hasta hoy: telescopios, cada misión que llegó (o intentó llegar) a Marte
// y los hallazgos de Curiosity en Gale. Datos: datos/linea_tiempo.json (cada evento con su fuente).
const LT = { ev: null, i: -1, play: null, pins: [] };
const RES = { exito: 'Éxito', activo: 'Activa hoy', parcial: 'Éxito parcial', fallo: 'Falló', fallo_fin: 'Terminada', historia: 'Historia', en_camino: 'En camino', futuro: 'Previsto' };
const COL_RES = { exito: '#7fd18b', activo: '#4fa3d9', parcial: '#e2b04a', fallo: '#9aa0a6', fallo_fin: '#9aa0a6', historia: '#c9b79c', en_camino: '#d96c9a', futuro: '#d96c9a' };

async function cargarLinea() {
  if (LT.ev) return LT.ev;
  const r = await fetch('datos/linea_tiempo.json'); if (!r.ok) throw new Error('No se encontró datos/linea_tiempo.json');
  const d = await r.json(); LT.ev = d.eventos; LT.nota = d.nota; return LT.ev;
}
function fechaLinda(e) {
  if (e.f.startsWith('-')) return e.etq;
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], p = e.f.split('-');
  return p.length === 3 ? `${+p[2]} ${M[+p[1] - 1]} ${p[0]}` : p[0];
}
function claseEv(e) { return e.tipo === 'geologia' ? 'geo' : e.gale ? 'gale' : (e.res === 'fallo' || e.res === 'fallo_fin') ? 'mal' : (e.res === 'futuro' || e.res === 'en_camino') ? 'fut' : e.res === 'parcial' ? 'med' : 'bien'; }

async function abrirLinea(idEvento) {
  try { await cargarLinea(); } catch (e) { return avisar(location.protocol === 'file:' ? 'La línea de tiempo necesita abrir Gale Earth con abrir.bat / servir.py (el navegador bloquea leer archivos desde file://).' : e.message, 9000); }
  if (esCelB()) cerrarCajon();
  document.body.classList.add('lineaAbierta'); $('linea').classList.remove('oculto');
  pintarBarra();
  const k = idEvento ? LT.ev.findIndex(e => e.id === idEvento) : LT.ev.findIndex(e => e.hoy);
  elegirEv(k < 0 ? LT.ev.length - 1 : k, !!idEvento);
}
function cerrarLinea() {
  pararPlay(); $('linea').classList.add('oculto'); document.body.classList.remove('lineaAbierta');
  for (const p of LT.pins) viewer.entities.remove(p); LT.pins = [];
}

function pintarBarra() {
  const pista = $('lPista'); if (pista.dataset.listo) return; pista.dataset.listo = 1;
  let html = '', ultEtq = '', ultX = -99, grupo = null;
  LT.ev.forEach((e, k) => {
    const g = e.tipo === 'geologia' ? 'geo' : e.tipo === 'telescopio' ? 'tel' : e.res === 'futuro' ? 'fut' : 'esp';
    if (grupo && g !== grupo) html += `<span class="lCorte" title="${g === 'tel' ? 'salto de miles de millones de años' : ''}"></span>`;
    grupo = g;
    const etq = e.etq !== ultEtq && k - ultX >= 2 ? e.etq : ''; if (etq) { ultEtq = e.etq; ultX = k; }
    html += `<button class="lPto ${claseEv(e)}" data-k="${k}" data-etq="${etq}" title="${fechaLinda(e)} · ${e.t.replace(/"/g, '')}"><i></i><span>${etq}</span></button>`;
  });
  pista.innerHTML = `<div class="lLinea"></div>${html}`;
  pista.querySelectorAll('.lPto').forEach(b => b.onclick = () => { pararPlay(); elegirEv(+b.dataset.k, true); });
}

function elegirEv(k, volar) {
  k = Math.max(0, Math.min(LT.ev.length - 1, k)); LT.i = k; const e = LT.ev[k];
  document.querySelectorAll('#lPista .lPto').forEach((b, j) => {
    b.classList.toggle('on', j === k); const sp = b.querySelector('span');
    sp.textContent = j === k ? LT.ev[j].etq : b.dataset.etq; sp.style.opacity = Math.abs(j - k) === 1 && b.dataset.etq ? 0 : ''; });
  const b = document.querySelector(`#lPista .lPto[data-k="${k}"]`);
  if (b) { const p = $('lPista'); p.scrollTo({ left: b.offsetLeft - p.clientWidth / 2, behavior: 'smooth' }); }
  const etiqueta = e.etiqueta || (e.tipo === 'telescopio' ? 'registro histórico' : 'registrado');
  const botones = [];
  if (e.lat != null) botones.push(`<button class="btn prim" id="lVer">Ver ${e.sitio ? e.sitio : 'dónde aterrizó'}</button>`);
  if (e.orbitador && O.orbitadores[e.orbitador]) botones.push(`<button class="btn" id="lOrb">Ver su órbita hoy</button>`);
  if (e.luna) botones.push(`<button class="btn" id="lLuna">Ver Fobos</button>`);
  if (e.pozo) botones.push(`<button class="btn" id="lPozo">Ficha del pozo ${e.pozo}</button>`);
  if (e.gale && e.lat == null && !e.pozo) botones.push(`<button class="btn" id="lGale">Ir a Gale</button>`);
  if (e.hoy) botones.push(`<button class="btn" id="lBib">Abrir la Biblioteca</button>`);
  $('lFicha').innerHTML = `<div class="lCab"><span class="lFecha">${fechaLinda(e)}</span><span class="lRes" style="--c:${COL_RES[e.res] || '#aaa'}">${RES[e.res] || ''}</span>${e.ag && e.ag !== '—' ? `<span class="sub">${e.ag}</span>` : ''}</div>
    <h3>${e.t}</h3><p>${e.txt}</p>${botones.length ? `<div class="btns">${botones.join('')}</div>` : ''}
    <p class="fuente">Fuente: ${e.fuente} <span class="tag">${etiqueta}</span></p>`;
  if ($('lVer')) $('lVer').onclick = () => { pararPlay(); volarA(e.lon, e.lat, e.gale ? 60000 : 900000); };
  if ($('lOrb')) $('lOrb').onclick = () => { pararPlay(); abrir('orbita'); fichaOrbitador(e.orbitador); };
  if ($('lLuna')) $('lLuna').onclick = () => { pararPlay(); abrir('orbita'); fichaLuna('Fobos'); };
  if ($('lPozo')) $('lPozo').onclick = () => { pararPlay(); BIB.vista = 'pozo'; BIB.pozo = e.pozo; abrir('biblioteca'); };
  if ($('lGale')) $('lGale').onclick = () => { pararPlay(); irA('gale'); };
  if ($('lBib')) $('lBib').onclick = () => { pararPlay(); BIB.vista = 'lista'; abrir('biblioteca'); };
  pinesHasta(k);
  if (volar && e.lat != null) volarA(e.lon, e.lat, e.gale ? 60000 : 900000);
}

// Sitios de aterrizaje: aparecen a medida que avanza la línea de tiempo.
function pinesHasta(k) {
  for (const p of LT.pins) viewer.entities.remove(p); LT.pins = [];
  LT.ev.slice(0, k + 1).forEach((e, j) => {
    if (e.lat == null) return;
    const actual = j === k, bien = e.res === 'exito' || e.res === 'activo';
    const col = C.Color.fromCssColorString(actual ? '#ffffff' : bien ? '#7fd18b' : '#9aa0a6');
    const nombre = (e.sitio || e.t.split(/[:(]/)[0]).trim();
    LT.pins.push(viewer.entities.add({ position: pos(e.lon, e.lat),
      point: { pixelSize: actual ? 13 : 9, color: col, outlineColor: C.Color.BLACK, outlineWidth: 2, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: nombre, font: `${actual ? 700 : 500} 13px system-ui`, fillColor: col, outlineColor: C.Color.BLACK, outlineWidth: 4, style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(10, 0), horizontalOrigin: C.HorizontalOrigin.LEFT, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, actual ? 1e9 : 2.5e7) } }));
  });
}

function pararPlay() { if (LT.play) { clearInterval(LT.play); LT.play = null; } $('lPlay').classList.remove('on'); $('lPlay').title = 'Reproducir'; }
$('lPlay').onclick = () => {
  if (LT.play) return pararPlay();
  if (LT.i >= LT.ev.length - 1) elegirEv(0, true);
  $('lPlay').classList.add('on'); $('lPlay').title = 'Pausa';
  LT.play = setInterval(() => { if (LT.i >= LT.ev.length - 1) return pararPlay(); elegirEv(LT.i + 1, true); }, 4500);
};
$('lCerrar').onclick = cerrarLinea;
$('bLinea').onclick = () => $('linea').classList.contains('oculto') ? abrirLinea() : cerrarLinea();
addEventListener('keydown', e => {
  if ($('linea').classList.contains('oculto') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { pararPlay(); elegirEv(LT.i + (e.key === 'ArrowRight' ? 1 : -1), true); e.preventDefault(); e.stopImmediatePropagation(); }
  if (e.key === 'Escape') cerrarLinea();
}, true);

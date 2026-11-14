// ==================== Biblioteca ====================
// Toda la información guardada en el Drive (Marte/Perforaciones Datos Crudos), ordenada para consultar:
// perforaciones (ficha completa), comparar pozos, temas para futuras misiones, fuentes. Lee datos/biblioteca.json,
// que arma armar_biblioteca.py. Si un dato no existe, la ficha lo dice: no se completa con estimaciones.
const BIB = { datos: null, cargando: null, vista: 'inicio', pozo: null, orden: 'n', filtro: '', soloCon: '', drive: null, ordenTabla: ['n', 1] };
const normB = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
const escB = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ESTADO_SAM = { confirmado: ['confirmado por ODR', 'var(--ok)'], sin_confirmar: ['sin confirmar', '#d9a441'], otra_muestra: ['de otra muestra', '#e5534b'] };
const TIPO_SAM = { spyr: 'pirólisis', sder: 'derivatización', scmb: 'combustión', csol: 'sólido', smet: 'metanol' };
const NOMBRE_GAS = { H2O: 'H₂O', CO2: 'CO₂', SO2: 'SO₂', O2: 'O₂', HCl: 'HCl', H2S: 'H₂S', NO: 'NO', H2: 'H₂', CH3Cl: 'CH₃Cl', CH2Cl2: 'CH₂Cl₂', OCS: 'OCS' };
const OX = { SiO2: 'SiO₂', TiO2: 'TiO₂', Al2O3: 'Al₂O₃', FeO: 'FeO', MnO: 'MnO', MgO: 'MgO', CaO: 'CaO', Na2O: 'Na₂O', K2O: 'K₂O', P2O5: 'P₂O₅', Cr2O3: 'Cr₂O₃', SO3: 'SO₃', Cl: 'Cl' };
const sci = v => v == null ? '—' : v.toExponential(2).replace('e', ' × 10^').replace(/\^\+?(-?\d+)/, (m, e) => '<sup>' + e + '</sup>');
const kB = b => b > 1048576 ? fmt(b / 1048576, 1) + ' MB' : fmt(Math.max(1, b / 1024)) + ' KB';

async function cargarBiblioteca() {
  if (BIB.datos) return BIB.datos;
  if (!BIB.cargando) BIB.cargando = (async () => {
    const r = await fetch('datos/biblioteca.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    for (const p of d.pozos) {                                    // une cada pozo con el del mapa (color de zona y posición)
      p.mapa = POZOS.find(q => normB(q.nombre) === normB(p.nombre)) || POZOS.find(q => q.n != null && q.n === p.n) || null;
      const aq = p.apxs && p.apxs.ox || {};
      p.ind = { arc: p.chemin.map(c => c.arcillas).find(v => v != null) ?? null, amo: p.chemin.map(c => c.amorfo).find(v => v != null) ?? null,
        agua: p.agua_kg_t, so3: aq.SO3 ? aq.SO3[0] : null, cl: aq.Cl ? aq.Cl[0] : null, feo: aq.FeO ? aq.FeO[0] : null,
        zn: p.apxs && p.apxs.tr && p.apxs.tr.Zn ? p.apxs.tr.Zn[0] : null,
        h2o: Math.max(0, ...p.sam.filter(s => s.estado === 'confirmado' && !s.dudoso.includes('H2O')).map(s => s.gases.H2O || 0)) || null,
        nsam: p.sam.filter(s => s.estado === 'confirmado').length };
    }
    try { const e = await fetch('perforaciones/estado.json', { cache: 'no-store' }); BIB.drive = e.ok ? (await e.json()).ok : false; } catch { BIB.drive = false; }
    return (BIB.datos = d);
  })().catch(e => { BIB.cargando = null; throw e; });
  return BIB.cargando;
}

function vistaBiblioteca() {
  const c = cont();
  if (!BIB.datos) {
    c.innerHTML = '<p class="sub">Cargando la biblioteca…</p>';
    cargarBiblioteca().then(() => pestaña === 'biblioteca' && vistaBiblioteca()).catch(e => {
      c.innerHTML = `<h2>Biblioteca</h2><p>No pude cargar <code>datos/biblioteca.json</code> (${escB(e.message)}).</p>
        <p class="sub">${location.protocol === 'file:' ? 'Abriste el archivo con doble clic: el navegador no deja leer datos locales así. Abrí Gale Earth con <b>abrir.bat</b>.' : 'Generalo con <code>python armar_biblioteca.py</code> en la carpeta Google Mars.'}</p>`;
    });
    return;
  }
  ({ inicio: bibInicio, lista: bibLista, pozo: bibPozo, comparar: bibComparar, temas: bibTemas, fuentes: bibFuentes })[BIB.vista]();
  $('cajon').classList.toggle('ancho', BIB.vista === 'comparar' || BIB.vista === 'pozo');
}
const irBib = (v, pozo) => { BIB.vista = v; if (pozo !== undefined) BIB.pozo = pozo; $('contenido').scrollTop = 0; vistaBiblioteca(); };
const volverBib = (a = 'inicio') => `<button class="btn" data-ir="${a}">← ${a === 'inicio' ? 'Biblioteca' : a === 'lista' ? 'Perforaciones' : 'Volver'}</button>`;
const engancharBib = () => cont().querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irBib(b.dataset.ir));

function bibInicio() {
  const P = BIB.datos.pozos, conChe = P.filter(p => p.chemin.length).length, conSam = P.filter(p => p.ind.nsam).length;
  const tarjeta = (ir, titulo, sub, extra = '') => `<div class="tarjeta bibt" data-ir="${ir}">${extra}<b>${titulo}</b><div class="sub">${sub}</div></div>`;
  cont().innerHTML = `<p class="sub">Todo lo que guardamos de Marte, ordenado para consultar. Cada número tiene su fuente y se marca si es <b>medido</b>, <b>calculado</b> o <b>supuesto</b>.</p>
    <h2>Datos de campo</h2>
    ${tarjeta('lista', `Las ${P.length} perforaciones de Curiosity`, `Ficha completa de cada pozo: minerales, química, gases, fotos y archivos crudos. ${conChe} con mineralogía, ${conSam} con gases confirmados.`, `<span class="bibic" style="background:#4FA3D9">⛏</span>`)}
    ${tarjeta('comparar', 'Comparar pozos', 'Tabla con los indicadores clave de los 49 pozos. Tocá una columna para ordenar.', `<span class="bibic" style="background:#2E9E8F">▦</span>`)}
    <h2>Análisis</h2>
    ${BIB.datos.temas_html ? tarjeta('temas', 'Temas para futuras misiones', 'Agua que todavía no contamos, agua fácil de extraer, riesgos al calentar el suelo, nitrógeno y oxígeno, calidad de los datos.', `<span class="bibic" style="background:#E8A33D">✦</span>`) : ''}
    <h2>Referencia</h2>
    ${tarjeta('fuentes', 'Fuentes y calidad de los datos', 'De dónde sale cada dato, qué falta y qué valores hay que tomar con cuidado.', `<span class="bibic" style="background:#7E57C2">ⓘ</span>`)}
    <div class="tarjeta bibt" id="bibAyuda"><span class="bibic" style="background:#3c4043">?</span><b>Controles y ayuda</b><div class="sub">Cómo moverse por el mapa con mouse, teclado o dedos.</div></div>
    <p class="fuente">Datos: carpeta del Drive Marte/Perforaciones Datos Crudos, armada con NASA PDS, base ODR del cráter Gale y fotos crudas de NASA/JPL-Caltech/MSSS.</p>`;
  engancharBib(); $('bibAyuda').onclick = () => $('ayuda').classList.remove('oculto');
}

const ORDENES = { n: ['Número', p => p.n ?? 999, 1], sol: ['Sol', p => p.sol ?? 1e9, 1], agua: ['Agua en minerales', p => p.ind.agua ?? -1, -1], arc: ['Arcillas', p => p.ind.arc ?? -1, -1],
  so3: ['Azufre (SO₃)', p => p.ind.so3 ?? -1, -1], cl: ['Cloro', p => p.ind.cl ?? -1, -1], zn: ['Zinc', p => p.ind.zn ?? -1, -1], h2o: ['Agua liberada (SAM)', p => p.ind.h2o ?? -1, -1] };
function bibLista() {
  const P = BIB.datos.pozos;
  cont().innerHTML = `${volverBib('inicio')}
    <h3 style="margin-top:10px">Perforaciones</h3>
    <input type="text" id="bibFiltro" placeholder="Filtrar por nombre, zona o roca" value="${escB(BIB.filtro)}" style="margin:6px 0 8px">
    <div class="fila" style="border:0;padding:2px 0"><span class="sub">Ordenar por</span><select id="bibOrden">${Object.entries(ORDENES).map(([k, v]) => `<option value="${k}" ${k === BIB.orden ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
    <div class="chips" id="bibChips">${[['', 'Todos'], ['chemin', 'Con minerales'], ['sam', 'Con gases SAM'], ['sin', 'Sin laboratorio aún']].map(([k, t]) => `<button class="pz${BIB.soloCon === k ? ' on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="bibItems"></div>`;
  const pintar = () => {
    const f = normB(BIB.filtro), o = ORDENES[BIB.orden];
    const L = P.filter(p => (!f || normB(`${p.nombre}${p.zona}${p.formacion}${p.roca}${p.n}`).includes(f)) &&
      (!BIB.soloCon || (BIB.soloCon === 'chemin' ? p.chemin.length : BIB.soloCon === 'sam' ? p.ind.nsam : !p.chemin.length)))
      .sort((a, b) => (o[1](a) - o[1](b)) * o[2]);
    $('bibItems').innerHTML = L.map(p => {
      const col = p.mapa ? colorDe(p.mapa) : '#666', foto = p.fotos[0];
      const dato = BIB.orden === 'n' || BIB.orden === 'sol' ? (p.ind.arc != null ? `arcillas ${fmt(p.ind.arc)} %` : p.chemin.length ? 'con minerales' : 'sin laboratorio aún')
        : `${ORDENES[BIB.orden][0].toLowerCase()}: ${({ agua: v => v == null ? '—' : fmt(v) + ' kg/t', arc: v => v == null ? '—' : fmt(v) + ' %', so3: v => v == null ? '—' : fmt(v, 1) + ' %', cl: v => v == null ? '—' : fmt(v, 2) + ' %', zn: v => v == null ? '—' : fmt(v) + ' ppm', h2o: v => v == null ? '—' : sci(v) + ' mol' })[BIB.orden](p.ind[BIB.orden])}`;
      return `<div class="tarjeta bibp" data-p="${escB(p.nombre)}">
        ${foto ? `<img loading="lazy" src="${foto.src}" alt="">` : '<span class="sinfoto">sin foto</span>'}
        <span><span class="num" style="background:${col}">${p.n ?? '×'}</span><b>${escB(p.nombre)}</b>
        <span class="sub">Sol ${p.sol ?? '—'} · ${escB(p.roca || '—')}</span><span class="sub">${dato}</span></span></div>`;
    }).join('') || '<p class="sub">Ningún pozo coincide.</p>';
    $('bibItems').querySelectorAll('[data-p]').forEach(el => el.onclick = () => irBib('pozo', el.dataset.p));
  };
  engancharBib();
  $('bibFiltro').oninput = e => { BIB.filtro = e.target.value; pintar(); };
  $('bibFiltro').onkeydown = e => e.stopPropagation();
  $('bibOrden').onchange = e => { BIB.orden = e.target.value; pintar(); };
  $('bibChips').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { BIB.soloCon = b.dataset.f; $('bibChips').querySelectorAll('.pz').forEach(x => x.classList.toggle('on', x === b)); pintar(); });
  pintar();
}

function bibPozo() {
  const P = BIB.datos.pozos;
  if (BIB.pozoMapa) { const x = P.find(q => q.mapa === BIB.pozoMapa); BIB.pozo = x ? x.nombre : null; BIB.pozoMapa = null; }
  const i = P.findIndex(q => normB(q.nombre) === normB(BIB.pozo)), p = P[i];
  if (!p) return irBib('lista');
  const col = p.mapa ? colorDe(p.mapa) : '#666', zona = p.mapa && ZID[p.mapa.zona] ? ZID[p.mapa.zona].nombre : p.formacion;
  const sec = (titulo, tag, cuerpo, abierto = true) => `<details class="sec" ${abierto ? 'open' : ''}><summary>${titulo}${tag ? ` <span class="tag">${tag}</span>` : ''}</summary>${cuerpo}</details>`;
  // Minerales
  const che = p.chemin.length ? p.chemin.map(a => {
    const tot = a.minerales.reduce((s, m) => s + (m[1] || 0), 0) || 1;
    return `<div class="sub" style="margin-top:6px">Análisis del sol ${a.sol} · <code>${escB(a.archivo)}</code></div>
      ${a.minerales.length ? `<div class="barra">${a.minerales.map(m => `<span title="${escB(m[0])} ${fmt(m[1], 1)} %" style="width:${(m[1] || 0) / tot * 100}%;background:${COL_MIN[m[0]] || '#6b7a99'}"></span>`).join('')}</div>` : ''}
      <table><tr><th>Mineral (fracción cristalina)</th><th>%</th><th>± 2σ</th></tr>${a.minerales.map(m => `<tr><td><i class="cuad" style="background:${COL_MIN[m[0]] || '#6b7a99'}"></i>${escB(m[0])}</td><td>${fmt(m[1], 1)}</td><td>${fmt(m[2], 1)}</td></tr>`).join('')}</table>
      ${a.arcillas != null || a.amorfo != null ? `<div class="ind"><div><small>Arcillas (muestra total)</small><b>${a.arcillas != null ? fmt(a.arcillas) + ' <small>% ± ' + fmt(a.arcillas_err) + '</small>' : '—'}</b></div><div><small>Material amorfo</small><b>${a.amorfo != null ? fmt(a.amorfo) + ' <small>% ± ' + fmt(a.amorfo_err) + '</small>' : '—'}</b></div></div>` : ''}`;
  }).join('') : '<p class="sub">NASA todavía no publicó la mineralogía de este pozo (ni en el PDS ni en la base ODR).</p>';
  // Química
  const ap = p.apxs;
  const qui = ap ? `<div class="sub">${escB(ap.fuente)}${ap.sol ? ` · sol ${ap.sol}` : ''}${ap.objetivo ? ` · objetivo <code>${escB(ap.objetivo)}</code>` : ''}${ap.producto ? ` · <code>${escB(ap.producto)}</code>` : ''}</div>
      <table class="tabq"><tr><th>Óxido</th><th>% en peso</th><th>±</th></tr>${Object.entries(ap.ox).map(([k, v]) => `<tr><td>${OX[k] || k}</td><td>${fmt(v[0], 2)}</td><td>${fmt(v[1], 2)}</td></tr>`).join('')}
      ${Object.entries(ap.tr || {}).map(([k, v]) => `<tr><td>${k}</td><td>${fmt(v[0])} ppm</td><td>${fmt(v[1])}</td></tr>`).join('')}</table>
      <p class="fuente">${p.apxs_mediciones} mediciones de APXS en la zona del pozo (${p.apxs_del_pozo} sobre el pozo o su polvo) en <code>Datos Crudos/APXS</code>.</p>`
    : `<p class="sub">Sin química APXS publicada para la muestra de este pozo${p.apxs_mediciones ? ` (hay ${p.apxs_mediciones} mediciones de la zona en Datos Crudos/APXS)` : ''}.</p>`;
  // Gases SAM
  const gas = p.sam.length ? `<p class="sub">Moles liberados al calentar la muestra en el horno de SAM y temperatura del pico (°C). Solo los confirmados por ODR son seguro de este pozo.</p>` + p.sam.map(s => {
    const [et, ec] = ESTADO_SAM[s.estado];
    const filas = Object.entries(s.gases).filter(([k]) => ['H2O', 'CO2', 'SO2', 'O2', 'HCl', 'H2S', 'NO', 'H2'].includes(k))
      .map(([k, v]) => `<tr${s.dudoso.includes(k) ? ' class="dudoso" title="Valor imposible en la fuente: no se usa"' : ''}><td>${NOMBRE_GAS[k] || k}</td><td>${sci(v)}${s.dudoso.includes(k) ? ' ⚠' : ''}</td><td>${(s.picos[k] || []).map(t => fmt(t)).join(', ') || '—'}</td></tr>`).join('');
    return `<div class="samx"><div><b>Sol ${s.sol}</b> · experimento ${s.eid} · ${TIPO_SAM[s.tipo] || s.tipo} <span class="tag" style="color:${ec}">${et}${s.otra ? ': ' + escB(s.otra) : ''}</span></div>
      ${filas ? `<table><tr><th>Gas</th><th>mol</th><th>pico °C</th></tr>${filas}</table>` : '<div class="sub">Sin tabla de gases en este experimento (puede ser de calibración o de otro tipo).</div>'}</div>`;
  }).join('') : '<p class="sub">No hay experimentos de SAM asociados a este pozo.</p>';
  // Fotos
  const fot = p.fotos.length ? `<div class="fotos">${p.fotos.map(f => `<a href="${f.url || f.src}" target="_blank" rel="noopener" title="${escB(f.archivo)}"><img loading="lazy" src="${f.src}" alt="${escB(f.camara)}"><span>${escB(f.camara || '')}</span></a>`).join('')}</div>
      <p class="fuente">${p.fotos.length} destacadas de ${p.fotos_total} fotos crudas del sol de la perforación (todas en <code>Imagenes/todas_las_imagenes.zip</code>). Fotos: NASA/JPL-Caltech/MSSS. Tocá una para abrir el original en NASA.</p>` : '<p class="sub">Sin fotos destacadas.</p>';
  const base = `G:\\Mi unidad\\Marte\\Perforaciones Datos Crudos\\${p.nombre}`;
  const arch = `<p class="sub">${BIB.drive ? 'Tocá un archivo para abrirlo o bajarlo (lo sirve la PC desde el Drive).' : `Están en <code>${escB(base)}</code>.`}</p>
    <table>${p.archivos.map(([r, b]) => `<tr><td>${BIB.drive ? `<a href="perforaciones/${encodeURIComponent(p.nombre)}/${r.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">${escB(r)}</a>` : escB(r)}</td><td style="white-space:nowrap">${kB(b)}</td></tr>`).join('')}</table>`;
  cont().innerHTML = `<div style="display:flex;justify-content:space-between;gap:6px">${volverBib('lista')}
      <span><button class="btn" id="bAnt" ${i <= 0 ? 'disabled' : ''}>←</button> <button class="btn" id="bSig" ${i >= P.length - 1 ? 'disabled' : ''}>→</button></span></div>
    ${p.fotos[0] ? `<img class="portada" src="${p.fotos[0].src}" alt="">` : ''}
    <div class="sub" style="margin-top:8px"><span class="chip" style="background:${col}"></span>${escB(zona || '')}</div>
    <h3>${p.n ? p.n + '. ' : ''}${escB(p.nombre)}</h3>
    <div class="sub">Sol ${p.sol ?? '—'} · ${escB(p.fecha)} (aprox.) · ${escB(p.roca || '—')} · ${p.elev != null ? fmt(p.elev) + ' m' : ''}</div>
    ${p.hallazgo ? `<p>${escB(p.hallazgo)}</p>` : ''}${p.tecnico ? `<p class="sub">${escB(p.tecnico)}</p>` : ''}
    <div class="btns"><button class="btn prim" id="bMapa">Ver en el mapa</button>${p.odr && p.odr.url ? `<a class="btn" href="${p.odr.url}" target="_blank" rel="noopener">Ficha en la base ODR</a>` : ''}</div>
    <div class="ind">
      <div><small>Agua en minerales <span class="tag">calculado</span></small><b style="color:var(--agua)">${p.agua_kg_t != null ? fmt(p.agua_kg_t) + ' <small>kg/t</small>' : '—'}</b></div>
      <div><small>CO₂ en carbonatos <span class="tag">calculado</span></small><b style="color:#d9a441">${p.co2_kg_t != null ? fmt(p.co2_kg_t) + ' <small>kg/t</small>' : '—'}</b></div>
      <div><small>Arcillas <span class="tag">medido</span></small><b>${p.ind.arc != null ? fmt(p.ind.arc) + ' <small>%</small>' : '—'}</b></div>
      <div><small>Gases SAM confirmados</small><b>${p.ind.nsam}</b></div></div>
    ${sec('Minerales', 'medido · CheMin', che)}
    ${sec('Química de la roca', 'medido · APXS', qui, false)}
    ${sec('Gases al calentar la muestra', 'medido · SAM', gas, false)}
    ${sec('Fotos del día de la perforación', 'NASA', fot)}
    ${sec('Qué falta', '', p.falta.length ? '<ul>' + p.falta.map(f => `<li>${escB(f)}</li>`).join('') + '</ul>' : '<p class="sub">Nada pendiente registrado.</p>', false)}
    ${p.cruce.length ? sec('Cruce con la base ODR', '', '<ul>' + p.cruce.map(f => `<li>${escB(f)}</li>`).join('') + '</ul>', false) : ''}
    ${sec(`Archivos crudos (${p.archivos.length})`, 'Drive', arch, false)}
    <p class="fuente">${escB(p.fuente_hallazgo || '')}</p>`;
  engancharBib();
  $('bAnt').onclick = () => irBib('pozo', P[i - 1].nombre); $('bSig').onclick = () => irBib('pozo', P[i + 1].nombre);
  $('bMapa').onclick = () => {
    if (p.mapa) { sel = p.mapa; repintar(); volarA(p.mapa.lon, p.mapa.lat, 700); }
    else if (p.lat != null) volarA(p.lon, p.lat, 700);
    if (esCelB()) $('cajon').classList.add('chico');
  };
}
const esCelB = () => matchMedia('(max-width:760px),(pointer:coarse) and (max-width:900px)').matches;

const COLS = [['n', '#', p => p.n, v => v ?? '×'], ['nombre', 'Pozo', p => p.nombre, v => escB(v)], ['sol', 'Sol', p => p.sol, v => v ?? '—'],
  ['arc', 'Arcillas %', p => p.ind.arc, v => v == null ? '—' : fmt(v)], ['amo', 'Amorfo %', p => p.ind.amo, v => v == null ? '—' : fmt(v)],
  ['agua', 'Agua kg/t*', p => p.ind.agua, v => v == null ? '—' : fmt(v)], ['so3', 'SO₃ %', p => p.ind.so3, v => v == null ? '—' : fmt(v, 1)],
  ['cl', 'Cl %', p => p.ind.cl, v => v == null ? '—' : fmt(v, 2)], ['feo', 'FeO %', p => p.ind.feo, v => v == null ? '—' : fmt(v, 1)],
  ['zn', 'Zn ppm', p => p.ind.zn, v => v == null ? '—' : fmt(v)], ['h2o', 'H₂O SAM mol', p => p.ind.h2o, v => v == null ? '—' : v.toExponential(1)]];
function bibComparar() {
  const [k, dir] = BIB.ordenTabla, col = COLS.find(c => c[0] === k);
  const L = [...BIB.datos.pozos].sort((a, b) => { const x = col[2](a), y = col[2](b); if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
  const max = {}; for (const c of COLS.slice(3)) max[c[0]] = Math.max(...BIB.datos.pozos.map(p => c[2](p) || 0));
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">Comparar pozos</h3>
    <p class="sub">Tocá el título de una columna para ordenar. La barra de fondo compara con el máximo de los 49. Tocá un pozo para abrir su ficha.</p>
    <div class="tablaw"><table class="comp"><tr>${COLS.map(c => `<th data-k="${c[0]}">${c[1]}${c[0] === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr>
    ${L.map(p => `<tr data-p="${escB(p.nombre)}">${COLS.map(c => { const v = c[2](p);
      return c[0] === 'n' ? `<td><span class="num" style="background:${p.mapa ? colorDe(p.mapa) : '#666'}">${c[3](v)}</span></td>`
        : max[c[0]] && v != null ? `<td style="background:linear-gradient(90deg,#f28c3830 ${v / max[c[0]] * 100}%,transparent 0)">${c[3](v)}</td>` : `<td>${c[3](v)}</td>`; }).join('')}</tr>`).join('')}</table></div>
    <p class="fuente">Arcillas y amorfo: CheMin (medido). SO₃, Cl, FeO, Zn: APXS de la muestra (medido). H₂O SAM: máximo liberado en experimentos confirmados (medido). *Agua kg/t: cálculo del equipo solo con minerales cristalinos, no incluye arcillas ni amorfo.</p>`;
  engancharBib();
  cont().querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { BIB.ordenTabla = [th.dataset.k, th.dataset.k === k ? -dir : (['n', 'nombre', 'sol'].includes(th.dataset.k) ? 1 : -1)]; bibComparar(); });
  cont().querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = () => irBib('pozo', tr.dataset.p));
}

function bibTemas() {
  cont().innerHTML = `${volverBib('inicio')}<div class="doc">${BIB.datos.temas_html}</div>
    <p class="fuente">Documento del equipo: Drive, carpeta "zz Analisis y temas para futuras misiones". "No tratados" quiere decir que nuestro proyecto todavía no los trabajó.</p>`;
  engancharBib();
}

function bibFuentes() {
  const P = BIB.datos.pozos;
  const n = { che: P.filter(p => p.chemin.length).length, ap: P.filter(p => p.apxs).length, apodr: P.filter(p => p.apxs && p.apxs.fuente.startsWith('ODR')).length,
    sam: P.reduce((s, p) => s + p.ind.nsam, 0), samno: P.reduce((s, p) => s + p.sam.filter(x => x.estado !== 'confirmado').length, 0),
    fot: P.reduce((s, p) => s + (p.fotos_total || 0), 0), odr: P.filter(p => p.odr && p.odr.tiene_ficha).length };
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">Fuentes y calidad de los datos</h3>
    <table><tr><th>Dato</th><th>Pozos</th><th>Fuente</th></tr>
      <tr><td>Minerales (CheMin)</td><td>${n.che}/49</td><td>NASA PDS Geosciences, CheMin RDR</td></tr>
      <tr><td>Química (APXS)</td><td>${n.ap}/49</td><td>NASA PDS (tablas supplement); ${n.apodr} desde la base ODR</td></tr>
      <tr><td>Gases (SAM)</td><td>${n.sam} exp.</td><td>NASA PDS SAM nivel 2; asignación a cada pozo según ODR</td></tr>
      <tr><td>Fotos crudas</td><td>${fmt(n.fot)}</td><td>NASA/JPL-Caltech/MSSS, raw images</td></tr>
      <tr><td>Ficha en la base ODR</td><td>${n.odr}/49</td><td>Gale Crater Mineralogy and Geochemistry Database, doi:10.48484/JN48-YW52</td></tr></table>
    <h2>Tomar con cuidado</h2><ul>
      <li>${n.samno} experimentos SAM no están confirmados como de su pozo, o son de otra muestra: se muestran separados.</li>
      <li>Algunos valores de SAM son físicamente dudosos (por ejemplo HCl en Mojave 2) y se marcan con ⚠.</li>
      <li>Los pozos 46 a 49 todavía no tienen datos de laboratorio publicados.</li>
      <li>Radiación (RAD) y clima (REMS) todavía no están: falta habilitar esos dominios.</li></ul>
    <p class="fuente">Biblioteca generada con <code>armar_biblioteca.py</code> desde el Drive (${escB(BIB.datos.origen)}).</p>`;
  engancharBib();
}

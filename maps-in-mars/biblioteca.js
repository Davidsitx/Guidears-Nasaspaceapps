// ==================== Biblioteca ====================
// Toda la información de los pozos (NASA PDS, base de mineralogía de Gale, blog y fotos de NASA), ordenada para consultar:
// perforaciones (ficha completa), comparar pozos, temas para futuras misiones, fuentes. Lee datos/biblioteca.json,
// que arma el equipo (armar_biblioteca.py). Si un dato no existe, la ficha lo dice: no se completa con estimaciones.
const BIB = { datos: null, cargando: null, vista: 'inicio', pozo: null, orden: 'n', filtro: '', soloCon: '', drive: null, ordenTabla: ['n', 1] };
const normB = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
const escB = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ESTADO_SAM = { confirmado: ['confirmado', 'var(--ok)'], probable: ['probable', '#d9a441'], sin_confirmar: ['sin confirmar', '#d9a441'], otra_muestra: ['de otra muestra', '#e5534b'], sin_muestra: ['no es muestra', '#9aa0a6'] };
const TIPO_SAM = { tmah: 'química húmeda con TMAH', spyr: 'pirólisis', sder: 'derivatización', scmb: 'combustión', csol: 'sólido', smet: 'metanol' };
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
    try { const [c, r, v] = await Promise.all([fetch('datos/clima_rems.json'), fetch('datos/radiacion.json'), fetch('datos/viento_humedad.json')]); if (c.ok) BIB.clima = await c.json(); if (r.ok) BIB.rad = await r.json(); if (v.ok) BIB.vh = await v.json(); } catch {}
    try { const [a1, a2] = await Promise.all([fetch('datos/analisis.json'), fetch('datos/fuentes_consultadas.json')]); if (a1.ok) BIB.analisis = await a1.json(); if (a2.ok) BIB.consultadas = (await a2.json()).fuentes; } catch {}
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
        <p class="sub">${location.protocol === 'file:' ? 'Abriste el archivo con doble clic: el navegador no deja leer datos locales así. Abrí Maps in Mars con <b>abrir.bat</b>.' : 'Volvé a abrir Maps in Mars con abrir.bat.'}</p>`;
    });
    return;
  }
  ({ inicio: bibInicio, lista: bibLista, pozo: bibPozo, comparar: bibComparar, temas: bibTemas, fuentes: bibFuentes, clima: bibClima, analisis: bibAnalisis, consultadas: bibConsultadas })[BIB.vista]();
  $('cajon').classList.toggle('ancho', ['comparar', 'pozo', 'analisis', 'consultadas'].includes(BIB.vista));
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
    ${tarjeta('clima', 'Clima y radiación en Gale', 'Temperatura, presión, suelo y UV de cada estación (REMS, hasta agosto de 2026) y la radiación que midió RAD, con lo que significa para una salida a pie.', `<span class="bibic" style="background:#3d7cc9">☀</span>`)}
    ${tarjeta('comparar', 'Comparar pozos', 'Tabla con los indicadores clave de los 49 pozos. Tocá una columna para ordenar.', `<span class="bibic" style="background:#2E9E8F">▦</span>`)}
    <h2>Análisis</h2>
    ${BIB.analisis ? tarjeta('analisis', IDIOMA === 'en' ? 'What we found in the data' : 'Lo que encontramos en los datos', IDIOMA === 'en' ? `We worked the raw data of the 49 drill holes: water released at low temperature, when acid gases start, oxygen and perchlorates, nitrogen, metals and phosphorus, and how the rock changes up Mount Sharp. ${BIB.analisis.candidatos.length} drill holes meet all three conditions for easy, clean water.` : `Trabajamos los datos crudos de los 49 pozos: agua que sale a baja temperatura, la temperatura a la que empiezan los gases ácidos, oxígeno y percloratos, nitrógeno, metales y fósforo, y cómo cambia la roca al subir el Monte Sharp. ${BIB.analisis.candidatos.length} pozos cumplen las tres condiciones para sacar agua fácil y limpia.`, `<span class="bibic" style="background:#E8A33D">✦</span>`) : ''}
    <h2>Referencia</h2>
    ${tarjeta('fuentes', 'Fuentes y calidad de los datos', 'De dónde sale cada dato, qué falta y qué valores hay que tomar con cuidado.', `<span class="bibic" style="background:#7E57C2">ⓘ</span>`)}
    ${BIB.consultadas ? tarjeta('consultadas', IDIOMA === 'en' ? `All the sources we consulted (${BIB.consultadas.length})` : `Todas las fuentes consultadas (${BIB.consultadas.length})`, IDIOMA === 'en' ? 'Every page, paper and database we reviewed, grouped by site, with what we took from each.' : 'Cada página, artículo y base de datos que revisamos, agrupados por sitio, con lo que tomamos de cada uno.', `<span class="bibic" style="background:#5c6bc0">🔗</span>`) : ''}
    <div class="tarjeta bibt" id="bibAyuda"><span class="bibic" style="background:#3c4043">?</span><b>Controles y ayuda</b><div class="sub">Cómo moverse por el mapa con mouse, teclado o dedos.</div></div>
    <p class="fuente">Datos: Planetary Data System de NASA (${url('https://pds-geosciences.wustl.edu/missions/msl/index.htm')}), base de mineralogía y geoquímica del cráter Gale del equipo CheMin (${url('https://doi.org/10.48484/JN48-YW52')}), blog de Curiosity (${url('https://science.nasa.gov/mission/msl-curiosity/')}) y fotos crudas de NASA/JPL-Caltech/MSSS (${url('https://mars.nasa.gov/msl/multimedia/raw-images/')}).</p>`;
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
  const qui = ap ? `<div class="sub">${escB(ap.fuente)}${ap.sol ? ` · sol ${ap.sol}` : ''}${ap.objetivo ? ` · objetivo <code>${escB(ap.objetivo)}</code>` : ''}${ap.producto ? ` · <code>${escB(ap.producto)}</code>` : ''}</div>${ap.motivo ? `<div class="sub">Asignación al pozo: <b>${escB(ap.asignacion)}</b> — ${escB(ap.motivo)}${ap.url_blog ? ` (<a href="${ap.url_blog}" target="_blank" rel="noopener">blog</a>)` : ''}.</div>` : ''}
      <table class="tabq"><tr><th>Óxido</th><th>% en peso</th><th>±</th></tr>${Object.entries(ap.ox).map(([k, v]) => `<tr><td>${OX[k] || k}</td><td>${fmt(v[0], 2)}</td><td>${fmt(v[1], 2)}</td></tr>`).join('')}
      ${Object.entries(ap.tr || {}).map(([k, v]) => `<tr><td>${k}</td><td>${fmt(v[0])} ppm</td><td>${fmt(v[1])}</td></tr>`).join('')}</table>
      <p class="fuente">${p.apxs_mediciones} mediciones de APXS en la zona del pozo (${p.apxs_del_pozo} sobre el pozo o su polvo) en <code>Datos Crudos/APXS</code>.</p>`
    : `<p class="sub">Sin química APXS publicada para la muestra de este pozo${p.apxs_mediciones ? ` (hay ${p.apxs_mediciones} mediciones de la zona en Datos Crudos/APXS)` : ''}.</p>`;
  // Gases SAM
  const samMuestra = p.sam.filter(s => s.estado !== 'sin_muestra'), samNo = p.sam.filter(s => s.estado === 'sin_muestra');
  const gas = p.sam.length ? `<p class="sub">Moles liberados al calentar la muestra en el horno de SAM y temperatura del pico (°C). Confirmados: por la base ODR o por la designación de la muestra en las notas de NASA PDS (por ejemplo "CB6" = Cumberland).</p>` + samMuestra.map(s => {
    const [et, ec] = ESTADO_SAM[s.estado];
    const filas = Object.entries(s.gases).filter(([k]) => ['H2O', 'CO2', 'SO2', 'O2', 'HCl', 'H2S', 'NO', 'H2'].includes(k))
      .map(([k, v]) => `<tr${s.dudoso.includes(k) ? ' class="dudoso" title="Valor imposible en la fuente: no se usa"' : ''}><td>${NOMBRE_GAS[k] || k}</td><td>${sci(v)}${s.dudoso.includes(k) ? ' ⚠' : ''}</td><td>${(s.picos[k] || []).map(t => fmt(t)).join(', ') || '—'}</td></tr>`).join('');
    return `<div class="samx"><div><b>Sol ${s.sol}</b> · experimento ${s.eid} · ${TIPO_SAM[s.tipo] || s.tipo} <span class="tag" style="color:${ec}">${et}${s.otra ? ': ' + escB(s.otra) : ''}${s.conf_por ? ' · ' + escB(s.conf_por) : ''}</span></div>${s.motivo ? `<div class="sub">${escB(s.motivo)}</div>` : ''}${s.dudoso.length ? `<div class="sub" style="color:#e2b04a">⚠ ${s.dudoso.map(k => NOMBRE_GAS[k] || k).join(', ')}: la cantidad no es físicamente posible para una porción de ~45 mg (supuesto); posible error de unidades en la tabla de PDS. No se usa en los cálculos.</div>` : ''}
      ${s.paso ? `<div class="sub">${escB(s.paso)}. Picos del cromatógrafo (área en cuentas/s², tiempo en s); PDS todavía no publica qué molécula es cada pico. <a href="${s.cromatograma}" target="_blank" rel="noopener">Ver el cromatograma</a></div>
        <table><tr><th>Pico</th><th>Área</th><th>Tiempo</th></tr>${(s.picos_gc || []).map(([n, a, t]) => `<tr><td>${escB(n)}</td><td>${sci(a)}</td><td>${fmt(t)} s</td></tr>`).join('')}</table>`
      : filas ? `<table><tr><th>Gas</th><th>mol</th><th>pico °C</th></tr>${filas}</table>` : '<div class="sub">Sin tabla de gases en este experimento (puede ser de calibración o de otro tipo).</div>'}</div>`;
  }).join('') + (samNo.length ? `<p class="sub" style="margin-top:8px">Corridas de los mismos días que <b>no son muestra</b> (blancos del instrumento, limpieza de copa o atmósfera): ${samNo.map(s => `${s.eid} (sol ${s.sol}, ${escB(s.motivo || '')})`).join('; ')}.</p>` : '') : '<p class="sub">No hay experimentos de SAM asociados a este pozo.</p>';
  // Clima del día de la perforación (REMS)
  const climaDia = BIB.clima ? (() => { const D = BIB.clima.diario, c = D.find(r => r[0] >= (p.sol || 0) && r[3] != null); if (!c || c[0] - p.sol > 10) return '';
    return `<div class="ind"><div><small>Aire, mín. / máx. <span class="tag">medido · REMS</span></small><b>${fmt(c[3])} / ${fmt(c[4])} <small>°C</small></b></div><div><small>Presión</small><b>${fmt(c[5])} <small>Pa</small></b></div></div><p class="fuente">Clima del sol ${c[0]} (${c[1]}), el primero con datos desde la perforación. Fuente: REMS (CAB/NASA).</p>`; })() : '';
  // Fotos
  const fot = p.fotos.length ? `<div class="fotos">${p.fotos.map(f => `<a href="${f.url || f.src}" target="_blank" rel="noopener" title="${escB(f.archivo)}"><img loading="lazy" src="${f.src}" alt="${escB(f.camara)}"><span>${escB(f.camara || '')}</span></a>`).join('')}</div>
      <p class="fuente">${p.fotos.length} destacadas de ${p.fotos_total} fotos crudas del sol de la perforación (todas en <code>Imagenes/todas_las_imagenes.zip</code>). Fotos: NASA/JPL-Caltech/MSSS. Tocá una para abrir el original en NASA.</p>` : '<p class="sub">Sin fotos destacadas.</p>';
  const base = `G:\\Mi unidad\\Marte\\Perforaciones Datos Crudos\\${p.nombre}`;
  const arch = `<p class="sub">${BIB.drive ? 'Tocá un archivo para abrirlo o bajarlo (copia local de los archivos públicos de NASA).' : `Están en <code>${escB(base)}</code>.`}</p>
    <table>${p.archivos.map(([r, b]) => `<tr><td>${BIB.drive ? `<a href="perforaciones/${encodeURIComponent(p.nombre)}/${r.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">${escB(r)}</a>` : escB(r)}</td><td style="white-space:nowrap">${kB(b)}</td></tr>`).join('')}</table>`;
  cont().innerHTML = `<div style="display:flex;justify-content:space-between;gap:6px">${volverBib('lista')}
      <span><button class="btn" id="bAnt" ${i <= 0 ? 'disabled' : ''}>←</button> <button class="btn" id="bSig" ${i >= P.length - 1 ? 'disabled' : ''}>→</button></span></div>
    ${p.fotos[0] ? `<img class="portada" src="${p.fotos[0].src}" alt="">` : ''}
    <div class="sub" style="margin-top:8px"><span class="chip" style="background:${col}"></span>${escB(zona || '')}</div>
    <h3>${p.n ? p.n + '. ' : ''}${escB(p.nombre)}</h3>
    <div class="sub">Sol ${p.sol ?? '—'} · ${escB(p.fecha)} (aprox.) · ${escB(p.roca || '—')} · ${p.elev != null ? fmt(p.elev) + ' m' : ''}</div>
    ${p.hallazgo ? `<p>${escB(p.hallazgo)}</p>` : ''}${p.tecnico ? `<p class="sub">${escB(p.tecnico)}</p>` : ''}
    <div class="btns"><button class="btn prim" id="bMapa">Ver en el mapa</button>${p.odr && p.odr.url ? `<a class="btn" href="${p.odr.url}" target="_blank" rel="noopener">Ficha en la base de mineralogía de Gale (NASA)</a>` : ''}${p.chemin.length && p.chemin[0].archivo ? `<a class="btn" href="https://pds-geosciences.wustl.edu/msl/msl-m-chemin-4-rdr-v1/mslcmn_1xxx/data/rdr5/${p.chemin[0].archivo}.csv" target="_blank" rel="noopener" title="Archivo oficial de minerales de CheMin en el PDS de NASA (respaldo si la base ODR no responde)">Minerales en el PDS de NASA</a>` : ''}</div>
    <div class="ind">
      <div><small>Agua en minerales <span class="tag">calculado</span></small><b style="color:var(--agua)">${p.agua_kg_t != null ? fmt(p.agua_kg_t) + ' <small>kg/t</small>' : '—'}</b></div>
      <div><small>CO₂ en carbonatos <span class="tag">calculado</span></small><b style="color:#d9a441">${p.co2_kg_t != null ? fmt(p.co2_kg_t) + ' <small>kg/t</small>' : '—'}</b></div>
      <div><small>Arcillas <span class="tag">medido</span></small><b>${p.ind.arc != null ? fmt(p.ind.arc) + ' <small>%</small>' : '—'}</b></div>
      <div><small>Gases SAM confirmados</small><b>${p.ind.nsam}</b></div></div>
    ${p.chemin.length ? sec('Minerales', 'medido · CheMin', che) : ''}
    ${ap ? sec('Química de la roca', 'medido · APXS', qui, false) : ''}
    ${p.sam.length ? sec('Gases al calentar la muestra', 'medido · SAM', gas, false) : ''}
    ${climaDia ? sec('Clima ese día', 'medido · REMS', climaDia, false) : ''}
    ${sec('Fotos del día de la perforación', 'NASA', fot)}
    ${p.blog && p.blog.length ? sec('Lo que contó el equipo', 'blog de Curiosity · resumen propio', p.blog.map(x => `<div class="tarjeta" style="cursor:default"><div class="sub">${escB(x.fecha)}</div>${escB(x.texto)} <a href="${x.url}" target="_blank" rel="noopener">Leer</a></div>`).join('') + '<p class="fuente">Los números de laboratorio de este pozo todavía no están en el PDS: el blog dice qué se hizo, no los resultados.</p>', true) : ''}
    ${sec('Qué falta', '', p.falta.length ? '<ul>' + p.falta.map(f => `<li>${escB(f)}</li>`).join('') + '</ul>' : '<p class="sub">Nada pendiente registrado.</p>', false)}
    ${p.cruce.length ? sec('Cruce con la base ODR', '', '<ul>' + p.cruce.map(f => `<li>${escB(f)}</li>`).join('') + '</ul>', false) : ''}
    ${sec(`Archivos crudos (${p.archivos.length})`, 'copia local de NASA PDS', arch, false)}
    <p class="fuente">${escB(p.fuente_hallazgo || '')}</p>
    ${fuentesPozo(p, [...(p.fotos && p.fotos[0] && p.fotos[0].url ? [['Foto cruda de ese sol en el servidor de NASA', p.fotos[0].url]] : []), ...(p.blog || []).slice(0, 3).map(x => ['Blog de Curiosity (NASA), ' + x.fecha, x.url])])}`;
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
    <p class="fuente">Documento del equipo. "No tratados" quiere decir que nuestro proyecto todavía no los trabajó.</p>`;
  engancharBib();
}

function bibFuentes() {
  const P = BIB.datos.pozos;
  const n = { che: P.filter(p => p.chemin.length).length, ap: P.filter(p => p.apxs).length, apodr: P.filter(p => p.apxs && p.apxs.fuente.startsWith('ODR')).length,
    sam: P.reduce((s, p) => s + p.ind.nsam, 0), samno: P.reduce((s, p) => s + p.sam.filter(x => x.estado !== 'confirmado').length, 0),
    fot: P.reduce((s, p) => s + (p.fotos_total || 0), 0), odr: P.filter(p => p.odr && p.odr.tiene_ficha).length };
  const cnt = e => P.reduce((s, p) => s + p.sam.filter(x => x.estado === e).length, 0);
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">Fuentes y calidad de los datos</h3>
    ${(() => { const en = IDIOMA === 'en', np = 49 - n.che; return `<p class="sub">${en ? `All <b>49/49</b> drill holes have a complete record: place, date, finding with source and photos. For ${np} of them (the newest) NASA has not yet released the lab data: we will load it as soon as it appears on the PDS.` : `Las <b>49/49</b> perforaciones tienen ficha completa: lugar, fecha, hallazgo con fuente y fotos. En ${np} de ellas (las más nuevas) NASA todavía no publicó los datos de laboratorio: los cargamos en cuanto salgan en el PDS.`}</p>
    <table><tr><th>${en ? 'Data' : 'Dato'}</th><th>${en ? 'Drill holes' : 'Pozos'}</th><th>${en ? 'Source' : 'Fuente'}</th></tr>
      <tr><td>${en ? 'Record, finding and photos' : 'Ficha, hallazgo y fotos'}</td><td>49/49</td><td>${en ? 'NASA/JPL-Caltech/MSSS (raw images), Curiosity blog and ODR database' : 'NASA/JPL-Caltech/MSSS (fotos crudas), blog de Curiosity y base ODR'}</td></tr>
      <tr><td>${en ? 'Minerals (CheMin)' : 'Minerales (CheMin)'}</td><td>${n.che}/${n.che} ${en ? 'released' : 'publicados'}</td><td>NASA PDS Geosciences, CheMin RDR · ${49 - n.che} ${en ? 'drill holes not yet released by NASA' : 'pozos aún sin publicar por NASA'}</td></tr>
      <tr><td>${en ? 'Chemistry (APXS)' : 'Química (APXS)'}</td><td>${n.ap}/${n.ap} ${en ? 'released' : 'publicados'}</td><td>NASA PDS ${en ? '(supplement tables)' : '(tablas supplement)'}${n.apodr ? `; ${n.apodr} ODR` : ''} · ${49 - n.ap} ${en ? 'drill holes not yet released by NASA' : 'pozos aún sin publicar por NASA'}</td></tr>`; })()}
      <tr><td>Gases (SAM)</td><td>${n.sam} exp.</td><td>NASA PDS SAM nivel 2; asignación a cada pozo por la base ODR y por la designación de la muestra en las notas de PDS</td></tr>
      <tr><td>Clima (REMS)</td><td>${BIB.clima ? fmt(BIB.clima.diario.length) + ' soles' : '—'}</td><td>REMS (CAB/NASA), resumen diario hasta el sol ${BIB.clima ? BIB.clima.ultimo.sol : '—'}; PDS calibrado hasta el sol ${BIB.clima ? BIB.clima.pds_ultimo_sol : '—'}</td></tr>
      <tr><td>Radiación (RAD)</td><td>publicado</td><td>Hassler 2014, Guo 2015 y 2021, NASA 2024 (los datos PDS de RAD son cuentas sin calibrar a dosis)</td></tr>
      <tr><td>Fotos crudas</td><td>${fmt(n.fot)}</td><td>NASA/JPL-Caltech/MSSS, raw images</td></tr>
      <tr><td>Ficha en la base ODR</td><td>${n.odr}/${n.odr} ${IDIOMA === 'en' ? 'released' : 'publicadas'}</td><td>Gale Crater Mineralogy and Geochemistry Database, doi:10.48484/JN48-YW52</td></tr></table>
    <h2>Tomar con cuidado</h2><ul>
      <li>SAM: ${cnt('confirmado')} experimentos confirmados (ODR o designación de PDS), ${cnt('probable')} probables (misma semana que la perforación, sin designación publicada), ${cnt('otra_muestra')} de otra muestra (arenas de Gobabeb y Ogunquit Beach) y ${cnt('sin_muestra')} corridas que no son muestra (blancos, calibración, atmósfera).</li>
      <li>Valores de SAM imposibles para una porción de ~45 mg (supuesto) se marcan con ⚠ y no se usan: HCl, NO y H₂S en Mojave 2 y Telegraph Peak, HCl en un experimento de Cumberland y el H₂O de 7×10⁷ mol de Glen Etive (error de la tabla de PDS).</li>
      <li>Pozos nuevos: Nevado Sajama 2 ya tiene química (APXS) y el experimento de orgánicos con TMAH; Campo Marte, Basque Lakes y Nazca solo tienen lo que contó el equipo en el blog: sus números salen en la próxima entrega del PDS (los datos actuales llegan hasta marzo de 2026).</li>
      <li>Clima: el resumen diario de REMS es de divulgación (CAB); lo verificamos contra los datos calibrados del PDS. El viento y la humedad salen de nuestra lectura de los archivos calibrados de REMS en el PDS (muestreo propio); hay datos de viento hasta alrededor del sol 1482 (2016).</li></ul>
    <p class="fuente">Biblioteca armada por el equipo a partir de datos públicos de NASA (PDS, blog y fotos crudas) y de la base de mineralogía de Gale.</p>`;
  engancharBib();
}


// ---------- Clima (REMS) y radiación (RAD) ----------
const ESTACION = ['otoño', 'otoño', 'otoño', 'invierno', 'invierno', 'invierno', 'primavera', 'primavera', 'primavera', 'verano', 'verano', 'verano'];   // hemisferio sur (Gale, 5° S)
const UVN = { Low: 'bajo', Moderate: 'moderado', High: 'alto', Very_High: 'muy alto', Extreme: 'extremo' };
function grafClima(D) {
  // último año marciano: mínimas y máximas diarias del aire
  const ult = D.slice(-690).filter(r => r[3] != null && r[4] != null); if (ult.length < 20) return '';
  const W = 520, H = 170, x0 = ult[0][0], x1 = ult.at(-1)[0], y = v => H - 18 - (v + 100) / 120 * (H - 30), x = s => 34 + (s - x0) / (x1 - x0) * (W - 44);
  const linea = k => ult.map((r, i) => `${i ? 'L' : 'M'}${x(r[0]).toFixed(1)},${y(r[k]).toFixed(1)}`).join('');
  const ticks = [-100, -60, -20, 20].map(v => `<line x1="34" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff14"/><text x="30" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#9aa0a6">${v}°</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${ticks}<path d="${linea(4)}" fill="none" stroke="#e2b04a" stroke-width="1.3"/><path d="${linea(3)}" fill="none" stroke="#4fa3d9" stroke-width="1.3"/>
    <text x="34" y="${H - 3}" font-size="10" fill="#9aa0a6">sol ${x0} (${ult[0][1]})</text><text x="${W - 10}" y="${H - 3}" font-size="10" fill="#9aa0a6" text-anchor="end">sol ${x1} (${ult.at(-1)[1]})</text></svg>
    <div class="leyenda"><span><i class="cuad" style="background:#e2b04a"></i>máxima del aire</span><span><i class="cuad" style="background:#4fa3d9"></i>mínima del aire</span></div>`;
}
function grafPresion(D) {
  const v = D.filter(r => r[5] != null); if (v.length < 20) return '';
  const W = 520, H = 130, x0 = v[0][0], x1 = v.at(-1)[0], y = p => H - 16 - (p - 650) / 300 * (H - 26), x = s => 34 + (s - x0) / (x1 - x0) * (W - 44);
  const ticks = [700, 800, 900].map(p => `<line x1="34" x2="${W - 10}" y1="${y(p)}" y2="${y(p)}" stroke="#ffffff14"/><text x="30" y="${y(p) + 4}" text-anchor="end" font-size="10" fill="#9aa0a6">${p}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${ticks}<path d="${v.map((r, i) => `${i ? 'L' : 'M'}${x(r[0]).toFixed(1)},${y(r[5]).toFixed(1)}`).join('')}" fill="none" stroke="#9fd0ff" stroke-width="1"/>
    <text x="34" y="${H - 2}" font-size="10" fill="#9aa0a6">${v[0][1].slice(0, 4)}</text><text x="${W - 10}" y="${H - 2}" font-size="10" fill="#9aa0a6" text-anchor="end">${v.at(-1)[1].slice(0, 4)}</text></svg>`;
}
function bibClima() {
  const c = BIB.clima, r = BIB.rad, fm = v => v == null ? '—' : fmt(Math.round(v) || 0);
  if (!c) { cont().innerHTML = `${volverBib('inicio')}<p class="sub" style="margin-top:10px">No se encontró <code>datos/clima_rems.json</code>.</p>`; return engancharBib(); }
  const ult = c.diario.filter(x => x[3] != null).at(-1);
  const uvTop = u => { const e = Object.entries(u || {}).sort((a, b) => b[1] - a[1])[0]; return e ? UVN[e[0]] || e[0] : '—'; };
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">Clima y radiación en Gale</h3>
    <p class="sub">Mediciones de la estación meteorológica REMS de Curiosity durante ${fm(c.diario.length)} soles, desde el aterrizaje hasta el sol ${c.ultimo.sol} (${c.ultimo.fecha}).</p>
    <div class="ind"><div><small>Último dato · sol ${ult[0]} <span class="tag">medido</span></small><b>${fm(ult[3])} / ${fm(ult[4])} <small>°C</small></b></div>
      <div><small>Presión ese día</small><b>${fm(ult[5])} <small>Pa</small></b></div>
      <div><small>Récord de frío</small><b>${fm(c.records.frio.valor)} <small>°C</small></b><small>${c.records.frio.fecha}</small></div>
      <div><small>Récord de calor</small><b>${fm(c.records.calor.valor)} <small>°C</small></b><small>${c.records.calor.fecha}</small></div></div>
    <h2>El último año marciano</h2>${grafClima(c.diario)}
    <h2>Las cuatro estaciones <span class="tag">medido · promedio de ${c.anios.length} años marcianos</span></h2>
    ${(() => { const h = lsMarte(new Date()); return `<div class="tarjeta" style="cursor:default"><b>Hoy en Gale: año marciano ${h.my}, L<sub>s</sub> ${fmt(h.ls, 0)}°, ${estacionSur(h.ls)}</b><div class="sub">Calculado con el algoritmo Mars24 de NASA (Allison y McEwen 2000). Los años marcianos se cuentan desde el 11 de abril de 1955 (Clancy et al. 2000); Curiosity llegó en el año 31.</div></div>`; })()}
    <p class="sub">En Marte la época del año se mide con la longitud solar (L<sub>s</sub>): el ángulo de Marte en su órbita, de 0° a 360°. NASA y el equipo de REMS la usan para comparar años. Gale está en el hemisferio sur, así que L<sub>s</sub> 0–90° es otoño, 90–180° invierno, 180–270° primavera y 270–360° verano. Cada estación dura entre 142 y 194 soles porque la órbita de Marte es elíptica.</p>
    <div class="tablaw"><table class="comp"><tr><th>Estación</th><th>L<sub>s</sub></th><th>Soles con dato</th><th>Mín. del aire</th><th>Máx. del aire</th><th>Récords</th><th>Suelo mín./máx.</th><th>Presión</th><th>UV más frecuente</th></tr>
      ${c.estaciones.map(m => `<tr><td>${m.estacion}</td><td>${m.ls[0]}–${m.ls[1]}°</td><td>${fmt(m.n)}</td><td>${fm(m.tmin)} °C</td><td>${fm(m.tmax)} °C</td><td>${fm(m.tmin_rec)} / ${fm(m.tmax_rec)} °C</td><td>${fm(m.gmin)} / ${fm(m.gmax)} °C</td><td>${fm(m.p)} Pa</td><td>${uvTop(m.uv)}</td></tr>`).join('')}</table></div>
    <h2>Año por año <span class="tag">medido</span></h2>
    <div class="tablaw"><table class="comp"><tr><th>Año marciano</th><th>Desde</th><th>Hasta</th><th>Soles con dato</th><th>Mín. del aire</th><th>Máx. del aire</th><th>Presión</th></tr>
      ${c.anios.map(a => `<tr><td>${a.my}</td><td>${a.desde}</td><td>${a.hasta}</td><td>${fmt(a.n)}</td><td>${fm(a.tmin)} °C</td><td>${fm(a.tmax)} °C</td><td>${fm(a.p)} Pa</td></tr>`).join('')}</table></div>
    <p class="fuente">Promedios de los valores diarios (cálculo propio sobre datos medidos). "Suelo": temperatura de la superficie medida por el sensor infrarrojo de REMS. UV: categoría de radiación ultravioleta que informa REMS.</p>
    <h2>La presión baja porque Curiosity sube</h2>${grafPresion(c.diario)}
    <p class="sub">La presión sube y baja con las estaciones porque parte del CO₂ de la atmósfera se congela en los casquetes polares y después vuelve a la atmósfera. La caída de fondo, de ${fm(c.anios[0].p)} Pa de promedio el primer año a ${fm(c.anios.at(-1).p)} Pa el último, coincide con lo que subió Curiosity por el Monte Sharp: unos 1.000 m, de −4.520 m en John Klein a −3.488 m en Nazca (cálculo propio con una altura de escala de ~11 km: unos 70 Pa menos).</p>
    <div class="tablaw"><table class="comp"><tr><th>Año marciano</th><th>Desde</th><th>Hasta</th><th>Mín.</th><th>Máx.</th><th>Presión</th></tr>
      ${c.anios.map(a => `<tr><td>${a.my}</td><td>${a.desde}</td><td>${a.hasta}</td><td>${fm(a.tmin)}°</td><td>${fm(a.tmax)}°</td><td>${fm(a.p)}</td></tr>`).join('')}</table></div>
    ${BIB.vh ? vientoHumedad(BIB.vh) : ''}
    ${r ? `<h2>Radiación <span class="tag">medido · RAD</span></h2>
      ${r.medidos.map(x => `<div class="tarjeta" style="cursor:default"><b>${escB(x.t)}</b><div style="font-size:16px;margin:3px 0">${escB(x.v)}</div><div class="sub">${escB(x.eq)} · ${escB(x.cuando)}</div><div class="fuente">${escB(x.fuente)}</div></div>`).join('')}
      <h2>Qué significa para una misión <span class="tag">cálculo propio</span></h2>
      ${r.calculados.map(x => `<div class="tarjeta" style="cursor:default"><b>${escB(x.t)}</b>: ${escB(x.v)}<div class="sub">${escB(x.como)}</div></div>`).join('')}
      <p class="fuente">${escB(r.pds)}</p>` : ''}
    <p class="fuente">${escB(c.fuente)} ${escB(c.verificacion)} ${escB(c.descartados || '')}</p>`;
  engancharBib();
}

function vientoHumedad(v) {
  const fm = x => x == null ? '—' : fmt(x, 1);
  const W = 520, H = 150, bw = (W - 44) / 24, y = s => H - 18 - s / 12 * (H - 30);
  const barras = v.viento_hora.map((h, i) => h.mediana == null ? '' : `<rect x="${34 + i * bw + 2}" y="${y(h.mediana)}" width="${bw - 4}" height="${H - 18 - y(h.mediana)}" fill="#9fd0ff"/><line x1="${34 + i * bw + bw / 2}" x2="${34 + i * bw + bw / 2}" y1="${y(h.mediana)}" y2="${y(h.p90)}" stroke="#e2b04a" stroke-width="2"/>`).join('');
  const ejes = [0, 4, 8, 12].map(s => `<line x1="34" x2="${W - 10}" y1="${y(s)}" y2="${y(s)}" stroke="#ffffff14"/><text x="30" y="${y(s) + 4}" text-anchor="end" font-size="10" fill="#9aa0a6">${s}</text>`).join('')
    + [0, 6, 12, 18].map(h => `<text x="${34 + h * bw + 2}" y="${H - 3}" font-size="10" fill="#9aa0a6">${h} h</text>`).join('');
  const lin = v.hr_hora.map((h, i) => `${i ? 'L' : 'M'}${(34 + i * bw + bw / 2).toFixed(1)},${(H - 18 - h.mediana / 30 * (H - 30)).toFixed(1)}`).join('');
  const nW = v.soles.filter(s => s.n_viento > 0).length, vmax = Math.max(...v.soles.map(s => s.viento_max || 0));
  return `<h2>Viento y humedad <span class="tag">medido · lectura propia de los datos de REMS</span></h2>
    <p class="sub">Estos valores salen de leer directamente los archivos calibrados de REMS en el archivo oficial de NASA (PDS), en ${fmt(v.soles.length)} soles repartidos en toda la misión. El viento está disponible en ${nW} de ellos, todos anteriores al sol 1500 (año 2016); después el sensor dejó de entregar velocidades. La humedad está disponible durante toda la misión.</p>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${ejes}${barras}</svg>
    <div class="leyenda"><span><i class="cuad" style="background:#9fd0ff"></i>velocidad típica (mediana, m/s) según la hora local</span><span><i class="cuad" style="background:#e2b04a"></i>percentil 90 (solo 1 de cada 10 mediciones lo supera)</span></div>
    <p class="sub">El viento medido es más intenso entre el mediodía y la tarde, con una mediana de unos 7 m/s. El valor más alto en la muestra es ${fm(vmax)} m/s.</p>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${[0, 10, 20, 30].map(s => `<line x1="34" x2="${W - 10}" y1="${H - 18 - s / 30 * (H - 30)}" y2="${H - 18 - s / 30 * (H - 30)}" stroke="#ffffff14"/><text x="30" y="${H - 14 - s / 30 * (H - 30)}" text-anchor="end" font-size="10" fill="#9aa0a6">${s}%</text>`).join('')}${[0, 6, 12, 18].map(h => `<text x="${34 + h * bw + 2}" y="${H - 3}" font-size="10" fill="#9aa0a6">${h} h</text>`).join('')}<path d="${lin}" fill="none" stroke="#7fd18b" stroke-width="2"/></svg>
    <div class="leyenda"><span><i class="cuad" style="background:#7fd18b"></i>humedad relativa típica (mediana) según la hora local</span></div>
    <div class="tablaw"><table class="comp"><tr><th>Estación</th><th>L<sub>s</sub></th><th>Viento de día</th><th>Viento de noche</th><th>Máximo</th><th>Humedad nocturna máx.</th><th>Vapor de agua (noche)</th></tr>
      ${v.estaciones.map(m => `<tr><td>${m.estacion}</td><td>${m.ls[0]}–${m.ls[1]}°</td><td>${fm(m.viento_dia)} m/s</td><td>${fm(m.viento_noche)} m/s</td><td>${fm(m.viento_max)} m/s</td><td>${fm(m.hr)} %</td><td>${fm(m.vmr)} ppm</td></tr>`).join('')}</table></div>
    <p class="sub">La humedad relativa nocturna es mayor en otoño e invierno porque el aire está más frío, aunque contiene poca agua (decenas de partes por millón en volumen). En primavera y verano hay más vapor, pero el aire más cálido baja la humedad relativa. Para una base, la cantidad de agua en el aire es muy baja: la fuente de agua aprovechable son los minerales hidratados del suelo.</p>
    <p class="fuente">${escB(v.fuente)}</p><ul class="fuente">${v.notas.map(n => `<li>${escB(n)}</li>`).join('')}</ul>`;
}


// ---------- Lo que encontramos en los datos (análisis trabajados; datos/analisis.json, herramientas/analisis_wiki.py) ----------
function bibAnalisis() {
  const A = BIB.analisis, L = (es, en) => (typeof IDIOMA !== 'undefined' && IDIOMA === 'en') ? en : es;
  const f1 = v => v == null ? '—' : fmt(v, 0), mol = v => v == null ? '—' : v.toExponential(1).replace('e', '×10^').replace(/\^(-?\d+)/, (m, e) => `<sup>${e}</sup>`);
  const et = t => `<span class="prov" style="background:${t === 'm' ? '#2E9E8F33' : '#E8A33D33'};color:${t === 'm' ? '#7fd8c8' : '#ffcf8a'}">${t === 'm' ? L('medido', 'measured') : L('cálculo propio', 'our calculation')}</span>`;
  const pozo = r => `<a href="#" data-p="${escB(r.nombre)}">${r.n} · ${escB(r.nombre)}</a>`;
  const T = A.tendencias, C0 = A.criterios, res = A.agua_resumen;
  const pts = A.perfil.filter(r => r.elev != null), e0 = Math.min(...pts.map(r => r.elev)), e1 = Math.max(...pts.map(r => r.elev)), W = 560, H = 210, m = 34;
  const X = e => m + (e - e0) / (e1 - e0) * (W - 2 * m), serie = (k, max, col) => pts.filter(r => r[k] != null).map(r => `<circle cx="${X(r.elev).toFixed(1)}" cy="${(H - m - r[k] / max * (H - 2 * m)).toFixed(1)}" r="3.4" fill="${col}"><title>${escB(r.nombre)} · ${fmt(r[k], 1)} %</title></circle>`).join('');
  const graf = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;background:#0002;border-radius:10px" role="img" aria-label="${L('Arcillas, SO3 y amorfo según la altura', 'Clays, SO3 and amorphous by elevation')}">
    <line x1="${m}" y1="${H - m}" x2="${W - m}" y2="${H - m}" stroke="#ffffff33"/><text x="${m}" y="${H - 10}" fill="#9aa0a6" font-size="11">${fmt(e0, 0)} m</text><text x="${W - m}" y="${H - 10}" fill="#9aa0a6" font-size="11" text-anchor="end">${fmt(e1, 0)} m</text>
    <text x="${W / 2}" y="${H - 10}" fill="#9aa0a6" font-size="11" text-anchor="middle">${L('altura (más arriba en el Monte Sharp →)', 'elevation (higher on Mount Sharp →)')}</text>
    ${serie('amorfo', 80, '#9aa0a6')}${serie('arcillas', 80, '#4FA3D9')}${serie('so3', 80, '#E8A33D')}
    <text x="${m + 4}" y="${m - 12}" fill="#4FA3D9" font-size="11">● ${L('arcillas', 'clays')} %</text><text x="${m + 90}" y="${m - 12}" fill="#E8A33D" font-size="11">● SO₃ %</text><text x="${m + 160}" y="${m - 12}" fill="#9aa0a6" font-size="11">● ${L('amorfo', 'amorphous')} %</text><text x="${W - m}" y="${m - 12}" fill="#9aa0a6" font-size="11" text-anchor="end">0–80 %</text></svg>`;
  const trz = Object.entries(A.trazas).filter(([k]) => ['MnO', 'P2O5', 'Zn', 'Ni'].includes(k)).map(([k, v]) => v.top.slice(0, 3).map((t, i) => `<tr>${i ? '' : `<td rowspan="3"><b>${k.replace('2O5', '₂O₅')}</b></td>`}<td>${pozo(t)}</td><td>${fmt(t.valor, v.unidad === '%' ? 2 : 0)} ${v.unidad}</td><td>${fmt(t.veces_mediana, 1)}×</td></tr>`).join('')).join('');
  const oxMax = [...A.oxicloros].sort((a, b) => b.o2_mol - a.o2_mol)[0], rho = k => T[k] ? `<b>${fmt(T[k].rho, 2)}</b> (${T[k].n})` : '—';
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">${L('Lo que encontramos en los datos', 'What we found in the data')}</h3>
    <p class="sub">${L(`Trabajamos los datos crudos de laboratorio de Curiosity (minerales de CheMin, química de APXS y gases de SAM, del PDS de NASA y de la base ODR del cráter Gale) para responder preguntas de una misión tripulada. Cada número dice si es ${et('m')} o ${et('c')}. En SAM usamos solo los experimentos confirmados para cada pozo y dejamos afuera los valores que la propia tabla marca como imposibles.`,
      `We worked through Curiosity's raw lab data (CheMin minerals, APXS chemistry and SAM gases, from NASA's PDS and the Gale crater ODR database) to answer questions a crewed mission would ask. Every number says whether it is ${et('m')} or ${et('c')}. For SAM we only use experiments confirmed for each drill hole and leave out values the source table itself flags as impossible.`)}</p>

    <h2>${L('1. El agua sale a baja temperatura casi siempre', '1. Water comes out at low temperature almost everywhere')}</h2>
    <p>${L(`En <b>${res.baja_T} de ${res.con_datos}</b> pozos con datos de SAM, el primer pico de agua aparece por debajo de ${C0.baja_T_C} °C ${et('m')}. Para una base eso importa tanto como la cantidad: un horno a 200 °C gasta mucha menos energía que uno a 700 °C.`,
      `In <b>${res.baja_T} of ${res.con_datos}</b> drill holes with SAM data, the first water peak appears below ${C0.baja_T_C} °C ${et('m')}. For a base this matters as much as the amount: a 200 °C oven uses far less energy than a 700 °C one.`)}</p>
    <p>${L(`Entre ese primer pico de agua y el primer gas ácido (SO₂, HCl o H₂S) hay en el medio <b>${f1(res.margen_mediana_C)} °C</b> de margen ${et('c')}: calentando dentro de esa ventana se saca agua sin los gases que corroen equipos y ensucian el agua. Un margen negativo quiere decir que el gas ácido sale antes que el agua.`,
      `Between that first water peak and the first acid gas (SO₂, HCl or H₂S) there is a median margin of <b>${f1(res.margen_mediana_C)} °C</b> ${et('c')}: heating within that window yields water without the gases that corrode equipment and contaminate the water. A negative margin means the acid gas comes out before the water.`)}</p>
    <div style="overflow:auto"><table><tr><th>${L('Pozo', 'Drill hole')}</th><th>${L('1.er pico H₂O', '1st H₂O peak')}</th><th>${L('1.er gas ácido', '1st acid gas')}</th><th>${L('Margen', 'Margin')}</th></tr>
      ${A.agua.map(r => `<tr><td>${pozo(r)}</td><td>${f1(r.h2o_primer_pico_C)} °C</td><td>${r.acido_primer_pico_C == null ? L('no aparece', 'none') : f1(r.acido_primer_pico_C) + ' °C'}</td><td>${r.margen_C == null ? '—' : f1(r.margen_C) + ' °C'}</td></tr>`).join('')}</table></div>

    <h2>${L('2. Los mejores pozos para sacar agua fácil y limpia', '2. The best drill holes for easy, clean water')}</h2>
    <p>${L(`Pedimos tres condiciones a la vez ${et('c')}: agua antes de ${C0.baja_T_C} °C, ningún gas ácido antes de ${C0.acido_min_C} °C y al menos ${C0.arcillas_min_pct} % de arcillas (CheMin), que guardan agua en su estructura. Las cumplen <b>${A.candidatos.length}</b>:`,
      `We asked for three conditions at once ${et('c')}: water before ${C0.baja_T_C} °C, no acid gas before ${C0.acido_min_C} °C and at least ${C0.arcillas_min_pct} % clays (CheMin), which hold water in their structure. <b>${A.candidatos.length}</b> meet them:`)}</p>
    <p>${A.candidatos.map(r => `${pozo(r)} <span class="sub">(${L('agua', 'water')} ${f1(r.h2o_primer_pico_C)} °C · ${L('ácido', 'acid')} ${f1(r.acido_primer_pico_C)} °C)</span>`).join(' · ')}</p>
    <p class="sub">${L('Son lugares para estudiar primero si se busca agua cerca de una base en Gale. Falta medir cuánta agua por tonelada liberan a esa temperatura.', 'These are the places to study first when looking for water near a base in Gale. How much water per tonne they release at that temperature is still to be measured.')}</p>

    <h2>${L('3. Oxígeno y percloratos: riesgo y recurso', '3. Oxygen and perchlorates: hazard and resource')}</h2>
    <p>${L(`En <b>${new Set(A.oxicloros.map(r => r.n)).size}</b> pozos (${A.oxicloros.length} experimentos) sale O₂ junto con HCl ${et('m')}, la firma típica de compuestos oxiclorados como los percloratos: son tóxicos (afectan la tiroides) y hay que lavar el suelo antes de cultivar, pero también son una fuente de oxígeno. Mayor cantidad: ${oxMax ? `${pozo(oxMax)} (${mol(oxMax.o2_mol)} mol de O₂)` : '—'}.`,
      `In <b>${new Set(A.oxicloros.map(r => r.n)).size}</b> drill holes (${A.oxicloros.length} experiments) O₂ comes out together with HCl ${et('m')}, the typical signature of oxychlorine compounds such as perchlorates: toxic (they affect the thyroid) and the soil must be washed before growing crops, but also a source of oxygen. Highest amount: ${oxMax ? `${pozo(oxMax)} (${mol(oxMax.o2_mol)} mol O₂)` : '—'}.`)}</p>
    <p class="sub">${[...new Map(A.oxicloros.map(r => [r.n, r])).values()].map(pozo).join(' · ')}</p>

    <h2>${L('4. Nitrógeno para cultivar', '4. Nitrogen for crops')}</h2>
    <p>${L(`Se detecta NO, que viene de nitratos, en <b>${A.nitratos.length}</b> pozos ${et('m')}: ${A.nitratos.map(r => `${pozo(r)} (${mol(r.no_mol_max)} mol)`).join(' · ')}. El nitrógeno fijado es lo que más falta para cultivar en Marte. Los valores de Mojave 2 y Telegraph Peak quedan afuera: la tabla los marca como imposibles para la porción de muestra.`,
      `NO, which comes from nitrates, is detected in <b>${A.nitratos.length}</b> drill holes ${et('m')}: ${A.nitratos.map(r => `${pozo(r)} (${mol(r.no_mol_max)} mol)`).join(' · ')}. Fixed nitrogen is the scarcest input for growing crops on Mars. The Mojave 2 and Telegraph Peak values are left out: the table flags them as impossible for the sample portion.`)}</p>

    <h2>${L('5. Metales y fósforo: marcas del agua que pasó por la roca', '5. Metals and phosphorus: traces of water that flowed through the rock')}</h2>
    <p>${L(`Valores más altos de APXS y cuántas veces la mediana de los pozos ${et('m')}. No son yacimientos: muestran dónde circularon fluidos. El fósforo además es nutriente. Groken aparece primero en manganeso y en fósforo.`, `Highest APXS values and how many times the drill-hole median ${et('m')}. They are not ore deposits: they show where fluids circulated. Phosphorus is also a nutrient. Groken ranks first in both manganese and phosphorus.`)}</p>
    <table><tr><th></th><th>${L('Pozo', 'Drill hole')}</th><th>${L('Valor', 'Value')}</th><th>× ${L('mediana', 'median')}</th></tr>${trz}</table>

    <h2>${L('6. Cómo cambia la roca al subir el Monte Sharp', '6. How the rock changes going up Mount Sharp')}</h2>
    ${graf}
    <p>${L(`Correlación con la altura (Spearman, ${et('c')}; entre paréntesis, cuántos pozos): SO₃ ${rho('so3')}, amorfo ${rho('amorfo')}, agua en minerales ${rho('agua_kg_t')} y arcillas ${rho('arcillas')}. Al subir hay más sulfatos y más material amorfo (la transición de arcillas a sulfatos que estudia el equipo de Curiosity); las arcillas, en cambio, aparecen a cualquier altura: no hace falta ir lejos para encontrarlas.`,
      `Correlation with elevation (Spearman, ${et('c')}; number of drill holes in brackets): SO₃ ${rho('so3')}, amorphous ${rho('amorfo')}, water in minerals ${rho('agua_kg_t')} and clays ${rho('arcillas')}. Going up there are more sulfates and more amorphous material (the clay-to-sulfate transition the Curiosity team studies); clays, instead, show up at any elevation: no need to travel far to find them.`)}</p>

    <h2>${L('7. Lo que hay que tomar con cuidado', '7. What to handle with care')}</h2>
    <ul><li>${L(`${A.dudosos.length} experimentos con valores imposibles en la tabla de origen (${[...new Set(A.dudosos.map(r => r.nombre))].join(', ')}): no se usan.`, `${A.dudosos.length} experiments with impossible values in the source table (${[...new Set(A.dudosos.map(r => r.nombre))].join(', ')}): not used.`)}</li>
      <li>${L(`${A.sin_laboratorio.length} pozos todavía sin datos de laboratorio publicados (${A.sin_laboratorio.map(r => r.nombre).join(', ')}).`, `${A.sin_laboratorio.length} drill holes still without published lab data (${A.sin_laboratorio.map(r => r.nombre).join(', ')}).`)}</li>
      <li>${L('El agua total está subestimada: CheMin no da el agua de las arcillas ni del amorfo; acá usamos el pico de SAM como señal, no como cantidad.', 'Total water is underestimated: CheMin does not give the water in clays or amorphous material; here the SAM peak is used as a signal, not an amount.')}</li></ul>
    <p class="fuente">${L('Datos: CheMin y SAM del PDS de NASA (pds-geosciences.wustl.edu), APXS del PDS, base ODR del cráter Gale (doi:10.48484/JN48-YW52). Criterios: solo experimentos SAM confirmados; valores marcados como dudosos, excluidos. Cálculo propio del equipo, 15/11/2026.', 'Data: CheMin and SAM from NASA PDS (pds-geosciences.wustl.edu), APXS from PDS, Gale crater ODR database (doi:10.48484/JN48-YW52). Criteria: confirmed SAM experiments only; values flagged as doubtful excluded. Our team\'s calculation, 15 Nov 2026.')}</p>`;
  engancharBib();
  cont().querySelectorAll('a[data-p]').forEach(a => a.onclick = e => { e.preventDefault(); irBib('pozo', a.dataset.p); });
}

// ---------- Todas las fuentes consultadas, por sitio ----------
function bibConsultadas() {
  const F = BIB.consultadas || [], grupos = {};
  for (const f of F) (grupos[f.dominio] = grupos[f.dominio] || []).push(f);
  const orden = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">${IDIOMA === 'en' ? 'All the sources we consulted' : 'Todas las fuentes consultadas'}</h3>
    <p class="sub">${IDIOMA === 'en' ? `${F.length} links reviewed one by one, grouped by site (${orden.length} sites), with what we took from each (descriptions in Spanish, from the team's source records).` : `${F.length} enlaces revisados uno por uno, agrupados por sitio (${orden.length} sitios). Para cada uno, lo que tomamos de ahí. Vienen de los registros de fuentes del equipo.`}</p>
    <input id="bibFq" placeholder="${IDIOMA === 'en' ? 'Filter by word or site…' : 'Filtrar por palabra o sitio…'}" style="width:100%;box-sizing:border-box;margin:6px 0 10px;padding:8px 10px;border-radius:9px;border:1px solid #ffffff22;background:#0003;color:inherit">
    <div id="bibFl">${orden.map(([d, l]) => `<div class="bibfg"><h2>${escB(d)} <span class="sub">(${l.length})</span></h2>${l.map(f => `<div class="tarjeta" style="cursor:default"><div class="sub">${escB(f.que || '—')}</div><a href="${escB(f.url)}" target="_blank" rel="noopener" style="word-break:break-all;font-size:12px">${escB(f.url)}</a></div>`).join('')}</div>`).join('')}</div>`;
  engancharBib();
  $('bibFq').oninput = e => { const q = e.target.value.toLowerCase(); cont().querySelectorAll('.bibfg').forEach(g => { let n = 0; g.querySelectorAll('.tarjeta').forEach(t => { const v = !q || t.textContent.toLowerCase().includes(q); t.style.display = v ? '' : 'none'; n += v; }); g.style.display = n ? '' : 'none'; }); };
}

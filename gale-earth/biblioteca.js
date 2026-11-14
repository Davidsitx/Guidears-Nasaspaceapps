// ==================== Biblioteca ====================
// Toda la información guardada en el Drive (Marte/Perforaciones Datos Crudos), ordenada para consultar:
// perforaciones (ficha completa), comparar pozos, temas para futuras misiones, fuentes. Lee datos/biblioteca.json,
// que arma armar_biblioteca.py. Si un dato no existe, la ficha lo dice: no se completa con estimaciones.
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
  ({ inicio: bibInicio, lista: bibLista, pozo: bibPozo, comparar: bibComparar, temas: bibTemas, fuentes: bibFuentes, clima: bibClima })[BIB.vista]();
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
    ${tarjeta('clima', 'Clima y radiación en Gale', 'Temperatura, presión, suelo y UV de cada estación (REMS, hasta agosto de 2026) y la radiación que midió RAD, con lo que significa para una salida a pie.', `<span class="bibic" style="background:#3d7cc9">☀</span>`)}
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
    ${climaDia ? sec('Clima ese día', 'medido · REMS', climaDia, false) : ''}
    ${sec('Fotos del día de la perforación', 'NASA', fot)}
    ${p.blog && p.blog.length ? sec('Lo que contó el equipo', 'blog de Curiosity · resumen propio', p.blog.map(x => `<div class="tarjeta" style="cursor:default"><div class="sub">${escB(x.fecha)}</div>${escB(x.texto)} <a href="${x.url}" target="_blank" rel="noopener">Leer</a></div>`).join('') + '<p class="fuente">Los números de laboratorio de este pozo todavía no están en el PDS: el blog dice qué se hizo, no los resultados.</p>', true) : ''}
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
  const cnt = e => P.reduce((s, p) => s + p.sam.filter(x => x.estado === e).length, 0);
  cont().innerHTML = `${volverBib('inicio')}<h3 style="margin-top:10px">Fuentes y calidad de los datos</h3>
    <table><tr><th>Dato</th><th>Pozos</th><th>Fuente</th></tr>
      <tr><td>Minerales (CheMin)</td><td>${n.che}/49</td><td>NASA PDS Geosciences, CheMin RDR</td></tr>
      <tr><td>Química (APXS)</td><td>${n.ap}/49</td><td>NASA PDS (tablas supplement); ${n.apodr} desde la base ODR</td></tr>
      <tr><td>Gases (SAM)</td><td>${n.sam} exp.</td><td>NASA PDS SAM nivel 2; asignación a cada pozo por la base ODR y por la designación de la muestra en las notas de PDS</td></tr>
      <tr><td>Clima (REMS)</td><td>${BIB.clima ? fmt(BIB.clima.diario.length) + ' soles' : '—'}</td><td>REMS (CAB/NASA), resumen diario hasta el sol ${BIB.clima ? BIB.clima.ultimo.sol : '—'}; PDS calibrado hasta el sol ${BIB.clima ? BIB.clima.pds_ultimo_sol : '—'}</td></tr>
      <tr><td>Radiación (RAD)</td><td>publicado</td><td>Hassler 2014, Guo 2015 y 2021, NASA 2024 (los datos PDS de RAD son cuentas sin calibrar a dosis)</td></tr>
      <tr><td>Fotos crudas</td><td>${fmt(n.fot)}</td><td>NASA/JPL-Caltech/MSSS, raw images</td></tr>
      <tr><td>Ficha en la base ODR</td><td>${n.odr}/49</td><td>Gale Crater Mineralogy and Geochemistry Database, doi:10.48484/JN48-YW52</td></tr></table>
    <h2>Tomar con cuidado</h2><ul>
      <li>SAM: ${cnt('confirmado')} experimentos confirmados (ODR o designación de PDS), ${cnt('probable')} probables (misma semana que la perforación, sin designación publicada), ${cnt('otra_muestra')} de otra muestra (arenas de Gobabeb y Ogunquit Beach) y ${cnt('sin_muestra')} corridas que no son muestra (blancos, calibración, atmósfera).</li>
      <li>Valores de SAM imposibles para una porción de ~45 mg (supuesto) se marcan con ⚠ y no se usan: HCl, NO y H₂S en Mojave 2 y Telegraph Peak, HCl en un experimento de Cumberland y el H₂O de 7×10⁷ mol de Glen Etive (error de la tabla de PDS).</li>
      <li>Pozos nuevos: Nevado Sajama 2 ya tiene química (APXS) y el experimento de orgánicos con TMAH; Campo Marte, Basque Lakes y Nazca solo tienen lo que contó el equipo en el blog: sus números salen en la próxima entrega del PDS (los datos actuales llegan hasta marzo de 2026).</li>
      <li>Clima: el resumen diario de REMS es de divulgación (CAB); lo verificamos contra los datos calibrados del PDS. El viento y la humedad salen de leer nosotros los archivos crudos calibrados (muestreo propio); el sensor de viento funcionó hasta el sol 1491 (2016).</li></ul>
    <p class="fuente">Biblioteca generada con <code>armar_biblioteca.py</code> desde el Drive (${escB(BIB.datos.origen)}).</p>`;
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
    <p class="sub">Lo que midió Curiosity durante ${fm(c.diario.length)} soles, desde el aterrizaje hasta el sol ${c.ultimo.sol} (${c.ultimo.fecha}). Gale está a 5° S: las estaciones son las del hemisferio sur.</p>
    <div class="ind"><div><small>Último dato · sol ${ult[0]} <span class="tag">medido</span></small><b>${fm(ult[3])} / ${fm(ult[4])} <small>°C</small></b></div>
      <div><small>Presión ese día</small><b>${fm(ult[5])} <small>Pa</small></b></div>
      <div><small>Récord de frío</small><b>${fm(c.records.frio.valor)} <small>°C</small></b><small>${c.records.frio.fecha}</small></div>
      <div><small>Récord de calor</small><b>${fm(c.records.calor.valor)} <small>°C</small></b><small>${c.records.calor.fecha}</small></div></div>
    <h2>El último año marciano</h2>${grafClima(c.diario)}
    <h2>Cada estación <span class="tag">medido · promedio de todos los años</span></h2>
    <div class="tablaw"><table class="comp"><tr><th>Mes</th><th>Ls</th><th>Estación</th><th>Mín.</th><th>Máx.</th><th>Récords</th><th>Suelo</th><th>Presión</th><th>UV</th></tr>
      ${c.meses.map(m => `<tr><td>${m.mes}</td><td>${m.ls[0]}–${m.ls[1]}°</td><td>${ESTACION[m.mes - 1]}</td><td>${fm(m.tmin)}°</td><td>${fm(m.tmax)}°</td><td>${fm(m.tmin_rec)}° / ${fm(m.tmax_rec)}°</td><td>${fm(m.gmin)}° / ${fm(m.gmax)}°</td><td>${fm(m.p)} Pa</td><td>${uvTop(m.uv)}</td></tr>`).join('')}</table></div>
    <p class="fuente">Temperaturas en °C. "Suelo": temperatura de la superficie (sensor infrarrojo de REMS). UV: categoría más frecuente.</p>
    <h2>La presión baja porque Curiosity sube</h2>${grafPresion(c.diario)}
    <p class="sub">La presión sube y baja con las estaciones (el CO₂ se congela y se libera en los polos). La caída de fondo, de ${fm(c.anios[0].p)} Pa de promedio el primer año a ${fm(c.anios.at(-1).p)} Pa el último, coincide con lo que subió Curiosity por el Monte Sharp: unos 1.000 m, de −4.520 m en John Klein a −3.488 m en Nazca (cálculo propio con una altura de escala de ~11 km: unos 70 Pa menos).</p>
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
  return `<h2>Viento y humedad <span class="tag">medido · datos crudos de REMS</span></h2>
    <p class="sub">Leímos directamente los archivos calibrados de REMS en el PDS (unas ${fmt(v.soles.length)} jornadas repartidas en toda la misión). El sensor de viento quedó dañado al aterrizar y murió en 2016 (sol 1491), así que el viento llega hasta ahí; la humedad se mide toda la misión.</p>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${ejes}${barras}</svg>
    <div class="leyenda"><span><i class="cuad" style="background:#9fd0ff"></i>viento típico (mediana, m/s) por hora local</span><span><i class="cuad" style="background:#e2b04a"></i>ráfagas frecuentes (9 de cada 10 veces por debajo)</span></div>
    <p class="sub">El viento es más fuerte al mediodía y a la tarde (unos 7 m/s, ráfagas de 9-10 m/s). En los soles medidos el máximo fue ${fm(Math.max(...v.soles.map(s => s.viento_max || 0)))} m/s; los estudios publicados mencionan rachas nocturnas de hasta ~20 m/s bajando por las laderas del cráter.</p>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin:6px 0">${[0, 10, 20, 30].map(s => `<line x1="34" x2="${W - 10}" y1="${H - 18 - s / 30 * (H - 30)}" y2="${H - 18 - s / 30 * (H - 30)}" stroke="#ffffff14"/><text x="30" y="${H - 14 - s / 30 * (H - 30)}" text-anchor="end" font-size="10" fill="#9aa0a6">${s}%</text>`).join('')}${[0, 6, 12, 18].map(h => `<text x="${34 + h * bw + 2}" y="${H - 3}" font-size="10" fill="#9aa0a6">${h} h</text>`).join('')}<path d="${lin}" fill="none" stroke="#7fd18b" stroke-width="2"/></svg>
    <div class="leyenda"><span><i class="cuad" style="background:#7fd18b"></i>humedad relativa típica por hora (respecto del hielo)</span></div>
    <div class="tablaw"><table class="comp"><tr><th>Mes</th><th>Estación</th><th>Viento de día</th><th>Ráfaga máx.</th><th>Humedad noche</th><th>Vapor noche</th></tr>
      ${v.meses.map(m => `<tr><td>${m.mes}</td><td>${ESTACION[m.mes - 1]}</td><td>${fm(m.viento_dia)} m/s</td><td>${fm(m.viento_max)} m/s</td><td>${fm(m.hr)} %</td><td>${fm(m.vmr)} ppm</td></tr>`).join('')}</table></div>
    <p class="sub">De noche, en invierno, la humedad relativa llega a 40-70 % porque el aire está muy frío, aunque tiene poca agua (decenas de partes por millón). En verano hay más vapor pero el aire es más cálido. Para una base: el aire de Marte casi no tiene agua para extraer; el agua está en el suelo (minerales hidratados de los pozos).</p>
    <p class="fuente">${escB(v.fuente)} ${v.notas.map(escB).join(' ')}</p>`;
}

// ==================== Interfaz estilo Google Earth ====================
// Riel de navegación, buscador, cajón de información (hoja deslizable en el celular),
// brújula, 2D/3D, zoom, barra de estado (coordenadas, altura de cámara y escala) y ventanas.
{
  const ES_TACTIL = matchMedia('(pointer:coarse)').matches;
  const esCel = () => matchMedia('(max-width:760px),(pointer:coarse) and (max-width:900px)').matches;
  const cajon = $('cajon');
  const TITULOS = { explorar: 'Explorar Gale', base: 'Base en Gale', orbita: 'Orbitadores', capas: 'Capas' };

// ---------- protección contra errores ----------
  // Un error en una parte (una capa, un archivo que no carga) no tiene que dejar la página en blanco:
  // se avisa una vez, con una frase clara, y el resto sigue funcionando.
  { let ultimo = 0;
    const avisarError = m => { console.error('[Gale Earth]', m); if (Date.now() - ultimo > 8000) { ultimo = Date.now(); avisar('Algo no cargó bien (' + String(m).slice(0, 90) + '). El resto sigue funcionando; si se ve raro, recargá la página.', 9000); } };
    addEventListener('error', e => { if (e.message && !/ResizeObserver/.test(e.message)) avisarError(e.message); });
    addEventListener('unhandledrejection', e => console.warn('[Gale Earth] promesa sin resolver:', e.reason));   // teselas que no llegan, etc.: no se molesta al usuario
    // Si el celular o la placa de video "pierden" WebGL (pasa al cambiar de app o con poca memoria), se avisa en vez de quedar en negro.
    viewer.scene.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); avisar('El navegador pausó el 3D (falta de memoria o cambio de app). Recargá la página para seguir.', 0); });
    viewer.scene.renderError.addEventListener((s, err) => avisar('El 3D se detuvo por un error del navegador: ' + String(err && err.message || err).slice(0, 100) + '. Recargá la página.', 0));
   
  }

  // ---------- cajón ----------
  window.abrirCajon = () => { cajon.classList.remove('cerrado', 'chico'); document.body.classList.add('cajonAbierto'); document.body.classList.toggle('hoja', esCel()); };
  window.cerrarCajon = () => { cajon.classList.add('cerrado'); document.body.classList.remove('cajonAbierto'); document.body.classList.remove('hoja'); document.querySelectorAll('.rb[data-t]').forEach(b => b.classList.remove('on')); };
  $('cerrarCajon').onclick = cerrarCajon;
  document.querySelectorAll('.rb[data-t]').forEach(b => b.onclick = () => {
    if (b.classList.contains('on') && !cajon.classList.contains('cerrado')) return cerrarCajon();   // segundo toque: cierra (como Google Earth)
    abrir(b.dataset.t);
  });
  // Hoja del celular: tocar el asa la achica o agranda; deslizar hacia abajo la cierra.
  { let y0 = null, t0 = 0;
    const ini = e => { y0 = (e.touches ? e.touches[0] : e).clientY; t0 = Date.now(); };
    const fin = e => { if (y0 == null) return; const dy = (e.changedTouches ? e.changedTouches[0] : e).clientY - y0; y0 = null;
      if (Math.abs(dy) < 8 && Date.now() - t0 < 400) return cajon.classList.toggle('chico');
      if (dy > 60) { cajon.classList.contains('chico') ? cerrarCajon() : cajon.classList.add('chico'); }
      else if (dy < -40) cajon.classList.remove('chico'); };
    for (const el of [$('asa'), $('cajonCab')]) { el.addEventListener('touchstart', ini, { passive: true }); el.addEventListener('touchend', fin); el.addEventListener('mousedown', ini); }
    addEventListener('mouseup', fin);
  }

  // ---------- botones de vista ----------
  $('logoRiel').onclick = () => irA('marte');
  $('rPantalla').onclick = () => { const d = document; d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen && d.documentElement.requestFullscreen().catch(() => {}); };

  // Punto de la superficie bajo un punto de la pantalla: el terreno 3D si está cargado; si no, el elipsoide.
  const superficie = (x, y) => {
    const px = new C.Cartesian2(x, y), r = viewer.camera.getPickRay(px); if (!r) return null;
    let p = MODO === 'globo' ? viewer.scene.globe.pick(r, viewer.scene) : (viewer.scene.pickPositionSupported ? viewer.scene.pickPosition(px) : null);
    if (!p) { const i = C.IntersectionTests.rayEllipsoid(r, MARS); if (i && i.start > 0) p = C.Ray.getPoint(r, i.start); }
    return p || null;
  };
  const centroVista = () => { const cv = viewer.scene.canvas; return superficie(cv.clientWidth / 2, cv.clientHeight / 2); };
  const orbitar = (heading, pitch, distMult = 1, dur = 0.8) => {
    const c = centroVista(), cam = viewer.camera;
    if (!c) { cam.flyTo({ destination: cam.position, orientation: { heading, pitch: Math.min(pitch, -0.2), roll: 0 }, duration: dur }); return; }
    const d = C.Cartesian3.distance(cam.position, c) * distMult;
    cam.flyToBoundingSphere(new C.BoundingSphere(c, 0), { offset: new C.HeadingPitchRange(heading, pitch, d), duration: dur });
  };
  $('brujula').onclick = () => orbitar(0, viewer.camera.pitch);
  $('b3d').onclick = () => orbitar(viewer.camera.heading, viewer.camera.pitch < -1.25 ? -0.62 : -C.Math.PI_OVER_TWO + 0.0001);
  const zoom = f => { const c = centroVista(), cam = viewer.camera;
    const d = c ? C.Cartesian3.distance(cam.position, c) : cam.positionCartographic.height;
    f > 0 ? cam.zoomIn(d * f) : cam.zoomOut(d * -f); };
  $('bMas').onclick = () => zoom(0.45);
  $('bMenos').onclick = () => zoom(-0.9);

  // ---------- brújula, 2D/3D, altura de cámara y escala ----------
  const brujula = $('brujula').querySelector('svg');
  let rumboAnt = 1e9;
  viewer.scene.postRender.addEventListener(() => {
    const h = C.Math.toDegrees(viewer.camera.heading);
    if (Math.abs(h - rumboAnt) > 0.2) { brujula.style.transform = `rotate(${-h}deg)`; rumboAnt = h; }
  });
  const fmtDist = m => m >= 1000 ? `${fmt(m / 1000, m >= 1e5 ? 0 : 1)} km` : `${fmt(m)} m`;
  const lindo = v => { const p = 10 ** Math.floor(Math.log10(v)), k = v / p; return (k >= 5 ? 5 : k >= 2 ? 2 : 1) * p; };
  let camAnt = '';
  setInterval(() => {
    const cam = viewer.camera, k = cam.position.toString() + cam.heading.toFixed(3) + cam.pitch.toFixed(3);
    if (k === camAnt) return; camAnt = k;
    // altura de la cámara sobre el suelo (en Marte no hay nivel del mar)
    const pc = cam.positionCartographic, suelo = viewer.scene.globe.show ? viewer.scene.globe.getHeight(pc) : null;
    const alto = Math.max(0, pc.height - (suelo ?? 0));
    $('camara').textContent = 'Cámara: ' + fmtDist(alto) + (suelo != null && alto < 200000 ? ' sobre el suelo' : '');
    $('b3d').textContent = cam.pitch < -1.25 ? '3D' : '2D';
    // escala: distancia real entre dos puntos de la pantalla separados 100 px
    const cv = viewer.scene.canvas, y = cv.clientHeight - 70, x = cv.clientWidth / 2;
    const p = xx => superficie(xx, y);
    const a = p(x - 50), b = p(x + 50);
    if (!a || !b) { $('escala').style.visibility = 'hidden'; return; }
    const mpp = C.Cartesian3.distance(a, b) / 100, L = lindo(mpp * 90);
    $('escala').style.visibility = ''; $('escalaBarra').style.width = Math.round(L / mpp) + 'px'; $('escalaTxt').textContent = fmtDist(L);
  }, 250);

  // ---------- coordenadas bajo el mouse (como Google Earth) ----------
  // Se muestran en latitud planetocéntrica (la de NASA) y la elevación sobre la esfera de referencia de MOLA (3396,19 km).
  const R_MOLA = 3396190;
  const latPC = latg => Math.atan(Math.tan(latg) * (B * B) / (A * A));
  const rElip = psi => A * B / Math.hypot(B * Math.cos(psi), A * Math.sin(psi));
  const gms = (v, pos_, neg) => `${fmt(Math.abs(v), 4)}° ${v >= 0 ? pos_ : neg}`;
  let ultimoMouse = null, pendiente = false;
  if (!ES_TACTIL) viewer.screenSpaceEventHandler.setInputAction(m => {
    ultimoMouse = m.endPosition; if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const r = viewer.camera.getPickRay(ultimoMouse); let c = null;
      if (r) c = MODO === 'globo' ? viewer.scene.globe.pick(r, viewer.scene) : (viewer.scene.pickPositionSupported ? viewer.scene.pickPosition(ultimoMouse) : null);
      if (!c) { $('coords').textContent = ''; return; }
      const g = C.Cartographic.fromCartesian(c, MARS); if (!g) return;
      const psi = latPC(g.latitude), ex = viewer.scene.verticalExaggeration || 1;
      const elev = g.height / ex - (R_MOLA - rElip(psi));
      $('coords').textContent = `${gms(C.Math.toDegrees(psi), 'N', 'S')}  ${gms(C.Math.toDegrees(g.longitude), 'E', 'O')}  ·  elev. ${fmt(elev)} m`;
    });
  }, C.ScreenSpaceEventType.MOUSE_MOVE);

  // ---------- buscador ----------
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const verLugar = (lon, lat, alto, pitch = -0.62) => {
    const off = alto / Math.tan(-pitch) / (R_MARTE * d2r);
    viewer.camera.flyTo({ destination: pos(lon, lat - off, alto), orientation: { heading: 0, pitch, roll: 0 }, duration: 2.5 });
  };
  // Coordenadas aproximadas del Nomenclátor de Nomenclatura Planetaria (IAU/USGS), longitud este.
  const MARTE = [
    ['Olympus Mons', 'El volcán más alto del sistema solar', 18.65, 226.2, 900000],
    ['Valles Marineris', 'Sistema de cañones de más de 4000 km', -13.9, -59.2, 2500000],
    ['Hellas Planitia', 'La cuenca de impacto más grande de Marte', -42.4, 70.5, 2500000],
    ['Cráter Jezero', 'Sitio de Perseverance (NASA)', 18.38, 77.58, 120000],
    ['Cráter Gusev', 'Sitio de Spirit (NASA)', -14.5, 175.4, 300000],
    ['Meridiani Planum', 'Sitio de Opportunity (NASA)', -1.95, 354.47, 300000],
    ['Elysium Mons', 'Volcán de la región Elysium', 25.02, 147.21, 700000],
  ];
  const IDX = [];
  const add = (nombre, sub, ic, color, ir, extra = '') => IDX.push({ nombre, sub, ic, color, ir, k: norm(nombre + ' ' + extra) });
  add('Cráter Gale', 'Punto de interés · 154 km', '◎', '#ff9f43', () => { abrir('explorar'); fichaGale(); }, 'gale crater');
  add('Monte Sharp (Aeolis Mons)', 'Montaña central de Gale', '▲', '#d9a441', () => verLugar(137.85, -5.08, 60000), 'mount sharp aeolis');
  add('Curiosity hoy', `Sol ${RS[RS.length - 1]}`, '●', '#e5534b', () => irA('hoy'), 'rover');
  add('Aterrizaje de Curiosity (Bradbury)', '6 de agosto de 2012', '↓', '#4FA3D9', () => volarA(RC[0][0], RC[0][1], 2500), 'bradbury landing');
  for (const z of ZONAS) add(z.nombre, `Zona · soles ${z.sol[0]}–${Math.min(z.sol[1], RS[RS.length - 1])}`, '〰', z.color, () => { abrir('explorar'); fichaZona(z.id); });
  for (const p of POZOS) add(p.nombre, p.n != null ? `Perforación ${p.n} · sol ${p.sol}` : 'Perforación', p.n ?? '×', colorDe(p), () => { abrir('explorar'); fichaPozo(p, true); }, `pozo ${p.n ?? ''}`);
  for (const s of SITIOS) add(s.nombre, 'Sitio candidato para la base', '★', '#ffd166', () => { abrir('base'); fichaSitio(s.id); });
  for (const n of Object.keys(O.orbitadores)) add(n, 'Orbitador', '◌', O.orbitadores[n].color, () => { abrir('orbita'); fichaOrbitador(n); }, 'satelite orbita');
  add('Línea de tiempo', 'Historia de la exploración de Marte', '⏱', '#2a4f8f', () => abrirLinea(), 'historia misiones viking mariner galileo cronologia timeline');
  for (const n of Object.keys(O.lunas || {})) add(n, 'Luna de Marte', '●', O.lunas[n].color, () => { abrir('orbita'); fichaLuna(n); }, n === 'Fobos' ? 'phobos luna satelite natural' : 'luna satelite natural');
  for (const [n, s, la, lo, h] of MARTE) add(n, s, '⌖', '#9aa0a6', () => verLugar(lo > 180 ? lo - 360 : lo, la, h));
  const q = $('q'), res = $('resultados');
  let lista = [], marcado = 0;
  const pintar = () => {
    const t = norm(q.value.trim()); $('limpiarQ').classList.toggle('oculto', !q.value);
    const m = q.value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*°?\s*([NSns])?\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([EOWeow])?$/);
    lista = [];
    if (m) {
      let la = parseFloat(m[1].replace(',', '.')), lo = parseFloat(m[3].replace(',', '.'));
      if (/[sS]/.test(m[2] || '')) la = -Math.abs(la); if (/[oOwW]/.test(m[4] || '')) lo = -Math.abs(lo);
      if (lo > 180) lo -= 360;
      if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) lista.push({ nombre: `Ir a ${fmt(la, 4)}°, ${fmt(lo, 4)}°`, sub: 'Coordenadas (latitud, longitud este)', ic: '⌖', color: '#9aa0a6', ir: () => verLugar(lo, la, 20000) });
    }
    if (t) lista.push(...IDX.map(x => ({ x, s: x.k.startsWith(t) ? 0 : x.k.includes(' ' + t) ? 1 : x.k.includes(t) ? 2 : 9 })).filter(o => o.s < 9).sort((a, b) => a.s - b.s).slice(0, 9).map(o => o.x));
    else lista.push(...IDX.slice(0, 4), ...IDX.filter(x => MARTE.some(mm => mm[0] === x.nombre)).slice(0, 3));
    marcado = 0;
    res.innerHTML = lista.length ? lista.map((x, i) => `<div class="r${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="ic" style="background:${x.color}">${x.ic}</span><span><b>${x.nombre}</b><small>${x.sub}</small></span></div>`).join('')
      : `<div class="nada">No encontré "${q.value}". Probá con un pozo (John Klein), una zona, un sitio o coordenadas: -4.59, 137.44</div>`;
    res.querySelectorAll('.r').forEach(el => el.onmousedown = e => { e.preventDefault(); elegir(+el.dataset.i); });
    res.classList.remove('oculto');
  };
  const elegir = i => { const x = lista[i]; if (!x) return; res.classList.add('oculto'); q.blur(); if (esCel()) q.value = ''; x.ir(); };
  q.addEventListener('input', pintar);
  q.addEventListener('focus', pintar);
  q.addEventListener('blur', () => setTimeout(() => res.classList.add('oculto'), 150));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); marcado = (marcado + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % Math.max(1, lista.length);
      res.querySelectorAll('.r').forEach((el, i) => el.classList.toggle('sel', i === marcado)); }
    if (e.key === 'Enter') elegir(marcado);
    if (e.key === 'Escape') { q.value = ''; q.blur(); res.classList.add('oculto'); }
    e.stopPropagation();
  });
  $('limpiarQ').onclick = () => { q.value = ''; q.focus(); pintar(); };
  $('rBuscar').onclick = () => { cerrarCajon(); setTimeout(() => q.focus(), 30); };
  addEventListener('keydown', e => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); if (!esCel()) cerrarCajon(); setTimeout(() => q.focus(), 30); }
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); $('fuentesBox').classList.add('oculto'); }
  });

  // ---------- ventanas ----------
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-cerrar')) m.classList.add('oculto'); }));
  if (ES_TACTIL) document.querySelectorAll('.solomouse').forEach(e => e.classList.add('oculto'));
  else document.querySelectorAll('.solotact').forEach(e => e.classList.add('oculto'));

  // Fuentes de los datos (los créditos de Cesium se agregan abajo cuando hay)
  $('creditos').onclick = () => {
    const f = $('fuentesBox');
    if (!f.classList.contains('oculto')) return f.classList.add('oculto');
    const cr = [...document.querySelectorAll('.cesium-credit-textContainer *, .cesium-credit-logoContainer *')].map(e => e.outerHTML).join(' ');
    f.innerHTML = `<b style="color:var(--texto)">Fuentes</b><p>Imagen global: mosaico CTX de 5 m (NASA/JPL/MSSS/Murray Lab, servicio NASA–Esri) y color Viking MDIM 2.1 (NASA/USGS).
      HiRISE 25 cm y ortofoto 1 m: NASA/JPL/Univ. of Arizona, mosaicos USGS Astrogeology. Terreno: HRSC/MOLA Blend 200 m y DEM MSL 1 m (USGS Astrogeology; ESA/DLR/FU Berlin; NASA/GSFC).
      Recorrido: NASA/JPL. Pozos: base de mineralogía y geoquímica del cráter Gale (CheMin/APXS/SAM, NASA PDS y OPScI). Órbitas: JPL Horizons.
      Cielo: estrellas del catálogo Hipparcos (ESA) y contorno de la Vía Láctea de J. R. Vieira, vía d3-celestial (BSD).</p>${cr ? '<p>' + cr + '</p>' : ''}<p class="fuente">Motor: CesiumJS (Apache 2.0). Gale Earth · NASA Space Apps 2026, San Luis.</p>`;
    f.classList.remove('oculto');
  };

  // Abrir en el celular: el servidor de la PC informa su dirección en la red local (red.json) y se muestra un QR.
  $('rCel').onclick = async () => {
    $('celular').classList.remove('oculto');
    const info = $('celInfo');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    let urls = [];
    if (!local && location.protocol.startsWith('http')) urls = [location.href.split('#')[0]];
    else { try { const r = await fetch('red.json', { cache: 'no-store' }); if (r.ok) urls = (await r.json()).urls || []; } catch {} }
    if (!urls.length) { info.innerHTML = location.protocol === 'file:'
      ? 'Abriste el archivo directamente. Para verlo en el celular abrí Gale Earth con <b>abrir.bat</b>: el servidor muestra la dirección y el QR.'
      : 'No encontré la dirección de la PC en la red. Usá el <b>servir.py</b> nuevo (lo trae esta versión) y volvé a abrir con abrir.bat.'; return; }
    info.innerHTML = `<p>Con el celular conectado al <b>mismo Wi-Fi</b> que esta computadora, escaneá el código o escribí la dirección:</p>
      <div id="qr"></div><div class="url">${urls[0]}</div>${urls.length > 1 ? `<p class="sub">Otras direcciones: ${urls.slice(1).join(' · ')}</p>` : ''}
      <p class="sub">La primera vez Windows puede preguntar si Python puede usar la red: elegí <b>Redes privadas</b>. La PC tiene que quedar prendida con el servidor abierto.</p>`;
    try {
      if (!window.qrcode) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
      const qr = qrcode(0, 'M'); qr.addData(urls[0]); qr.make(); $('qr').innerHTML = qr.createImgTag(6, 8, 'Código QR de Gale Earth');
    } catch { $('qr').remove(); }
  };

  // Cesium Mars (Cesium ion) pide mostrar su logo: en ese modo se ve abajo a la izquierda.
  setTimeout(() => { if (MODO === 'cesium') { const b = document.querySelector('.cesium-viewer-bottom'); if (b) { b.style.cssText = 'display:block!important;left:calc(var(--riel) + 10px);right:auto;bottom:32px'; } } }, 4000);

  // Al rotar el celular o cambiar el tamaño, se ajusta el estado de la hoja.
  addEventListener('resize', () => document.body.classList.toggle('hoja', esCel() && !cajon.classList.contains('cerrado')));
}

// ---------- unión con GALE-3D: el botón lleva a la misión de Curiosity en 3D (../escena3d/index.html) ----------
// Funciona abierto desde el repo (doble clic), con servir.py (sirve también /escena3d/) y en GitHub Pages.
function entrarMision() {
  try { irA('hoy'); } catch (e) {}
  setTimeout(() => $('transicion').classList.add('on'), 1500);
  setTimeout(() => { location.href = '../escena3d/index.html#desde-gale-earth'; }, 2200);
}
$('bMision').onclick = e => { e.preventDefault(); entrarMision(); };   // sin Cesium (sin internet) el enlace funciona igual

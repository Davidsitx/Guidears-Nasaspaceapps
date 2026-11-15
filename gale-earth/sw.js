// Gale Earth · trabajador de servicio (service worker) para las teselas en la nube.
//
// La página pide las teselas como siempre ("teselas/terreno/9/512/300.bin", "teselas/hirise/…webp").
// - Si la abrís con servir.py (abrir.bat), el servidor de la PC las tiene y este archivo no hace nada.
// - Si la abrís publicada (GitHub Pages), este archivo las busca adentro de los .zip guardados en la nube
//   (Cloudflare R2), pidiendo solo los bytes de cada tesela (HTTP Range), y las guarda en la caché del navegador.
// La dirección de la nube está en nube.json. Los índices (.idx) los arma herramientas/indices_nube.py.

const VERSION = 'gale-earth-teselas-v1';
let CONF = null;          // { base, manifest } o false si no hay nube / hay servidor local
const IDX = new Map();    // nombre del .idx -> Promise<DataView>
let guardadas = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const esperar = ms => new Promise(r => setTimeout(r, ms));
async function traer(url, opciones = {}, intentos = 4) {
  let ultimo;
  for (let k = 0; k < intentos; k++) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 30000);
    try {
      const r = await fetch(url, { ...opciones, signal: c.signal, cache: 'no-store' });
      clearTimeout(t);
      if (r.ok || r.status === 206) return r;
      if (r.status === 404) return r;
      ultimo = new Error('HTTP ' + r.status);
    } catch (e) { clearTimeout(t); ultimo = e; }
    await esperar(400 * 2 ** k);
  }
  throw ultimo;
}

async function configuracion() {
  if (CONF !== null) return CONF;
  CONF = (async () => {
    // ¿Hay servidor local con teselas (servir.py)? Entonces no se usa la nube.
    try {
      const r = await fetch(new URL('teselas.json', self.registration.scope), { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) { const t = await r.json(); if (t && t.terreno) return false; }
    } catch {}
    try {
      const n = await (await fetch(new URL('nube.json', self.registration.scope), { cache: 'no-store' })).json();
      if (!n.teselas) return false;
      const base = n.teselas.replace(/\/?$/, '/');
      const manifest = await (await traer(base + 'nube/manifest.json')).json();
      return { base, manifest };
    } catch { return false; }
  })();
  return CONF;
}

function indice(conf, z) {
  if (!IDX.has(z.idx)) IDX.set(z.idx, (async () => {
    const cache = await caches.open(VERSION + '-idx'), url = conf.base + 'nube/' + z.idx;
    let r = await cache.match(url);
    if (!r) { r = await traer(url); if (!r.ok) throw new Error('sin índice ' + z.idx); await cache.put(url, r.clone()); }
    return new DataView(await r.arrayBuffer());
  })().catch(e => { IDX.delete(z.idx); throw e; }));
  return IDX.get(z.idx);
}

function buscar(dv, nivel, a, b) {   // búsqueda binaria en filas de 20 bytes ordenadas por (nivel, a, b)
  let lo = 0, hi = dv.byteLength / 20 - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, o = m * 20;
    const d = (dv.getUint8(o) - nivel) || (dv.getUint32(o + 4, true) - a) || (dv.getUint32(o + 8, true) - b);
    if (d === 0) return { metodo: dv.getUint8(o + 1), desde: dv.getUint32(o + 12, true), tam: dv.getUint32(o + 16, true) };
    if (d < 0) lo = m + 1; else hi = m - 1;
  }
  return null;
}

async function tesela(conf, prefijo, nivel, a, b) {
  for (const z of conf.manifest.zips) {
    if (z.prefijo !== prefijo) continue;
    const c = z.niveles[nivel];
    if (!c || a < c[0] || a > c[1] || b < c[2] || b > c[3]) continue;
    const f = buscar(await indice(conf, z), nivel, a, b);
    if (!f) continue;
    const r = await traer(conf.base + z.zip, { headers: { Range: `bytes=${f.desde}-${f.desde + f.tam - 1}` } });
    let datos = await r.arrayBuffer();
    if (r.status === 200 && datos.byteLength !== f.tam) datos = datos.slice(f.desde, f.desde + f.tam);   // el servidor ignoró Range
    if (f.metodo === 8) datos = await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return { datos, tipo: z.ext === '.webp' ? 'image/webp' : 'application/octet-stream' };
  }
  return null;
}

async function responder(req, conf) {
  const ruta = new URL(req.url).pathname, m = ruta.match(/\/teselas\/(terreno|hirise|orto1m)\/(.+)$/);
  if (!m) return fetch(req);
  const [, prefijo, resto] = m;
  const extra = conf.manifest.extras[prefijo + '/' + resto];
  if (extra) return new Response(JSON.stringify(extra), { headers: { 'Content-Type': 'application/json' } });
  const p = resto.match(/^(\d+)\/(\d+)\/(\d+)\.\w+$/);
  if (!p) return new Response(null, { status: 404 });
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(req.url);
  if (guardada) return guardada;
  const t = await tesela(conf, prefijo, +p[1], +p[2], +p[3]);
  if (!t) return new Response(null, { status: 404 });
  const resp = new Response(t.datos, { headers: { 'Content-Type': t.tipo, 'Cache-Control': 'max-age=31536000' } });
  cache.put(req.url, resp.clone()).then(() => { if (++guardadas % 500 === 0) podar(cache); }).catch(() => {});
  return resp;
}

async function podar(cache) {   // la caché de teselas no crece sin límite: deja las 6000 más recientes
  const k = await cache.keys();
  if (k.length > 6000) for (const r of k.slice(0, k.length - 6000)) await cache.delete(r);
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || e.request.method !== 'GET') return;
  if (!/\/teselas(\.json|\/)/.test(u.pathname)) return;
  e.respondWith((async () => {
    const conf = await configuracion();
    if (!conf) return fetch(e.request);
    if (u.pathname.endsWith('/teselas.json'))
      return new Response(JSON.stringify({ terreno: conf.manifest.zips.some(z => z.prefijo === 'terreno'), hirise: conf.manifest.zips.some(z => z.prefijo === 'hirise'),
        orto: conf.manifest.zips.some(z => z.prefijo === 'orto1m'), nube: true }), { headers: { 'Content-Type': 'application/json' } });
    try { return await responder(e.request, conf); }
    catch (err) { return new Response(null, { status: 503, statusText: String(err && err.message || err) }); }
  })());
});

// ==================== Idioma: inglés por defecto, castellano con el botón ES ====================
// La interfaz se escribe en castellano; en inglés se traduce lo que aparece en pantalla con el diccionario
// datos/idioma_en.json (frase en castellano → frase en inglés). Los números se sacan antes de buscar ({n}) y se
// vuelven a poner en el mismo orden, así una misma frase sirve para todos los pozos y fechas.
const DIC_EN = /*__IDIOMA_EN__*/{};
const NUM_RE = /(?<![\w])[-−+]?\d[\d.,]*(?:e[-+]?\d+)?/g;
function trad(s) {
  if (IDIOMA === 'es' || !s) return s;
  const lim = s.replace(/\s+/g, ' ').trim(); if (!lim) return s;
  const nums = [], k = lim.replace(NUM_RE, m => { nums.push(m); return '{n}'; });
  const en = DIC_EN[k]; if (en == null) return s;
  let i = 0; const out = en.replace(/\{n\}/g, () => nums[i++] ?? '');
  return s.match(/^\s*/)[0] + out + s.match(/\s*$/)[0];
}
window.trad = trad;
const ATR_TRAD = ['title', 'placeholder', 'aria-label'];
function tradNodo(raiz) {
  if (IDIOMA === 'es' || !raiz) return;
  if (raiz.nodeType === 3) { const v = trad(raiz.nodeValue); if (v !== raiz.nodeValue) raiz.nodeValue = v; return; }
  if (raiz.nodeType !== 1 || raiz.closest('script,style')) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), L = []; let n;
  while ((n = w.nextNode())) L.push(n);
  for (const t of L) { if (t.parentElement && t.parentElement.closest('script,style')) continue; const v = trad(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; }
  for (const e of [raiz, ...raiz.querySelectorAll('[title],[placeholder],[aria-label]')])
    for (const a of ATR_TRAD) { const v = e.getAttribute(a); if (v) { const t = trad(v); if (t !== v) e.setAttribute(a, t); } }
}
if (IDIOMA !== 'es') {
  tradNodo(document.body);
  new MutationObserver(ms => { for (const m of ms) {
    if (m.type === 'characterData') tradNodo(m.target);
    else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v) { const t = trad(v); if (t !== v) m.target.setAttribute(m.attributeName, t); } }
    else for (const n of m.addedNodes) tradNodo(n);
  } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR_TRAD });
}
function tradEtiquetas(lista) {   // carteles del globo (Cesium dibuja el texto en el lienzo, no en la página)
  if (IDIOMA === 'es') return;
  for (const e of lista) { const l = e.label; if (!l || !l.text || !l.text.isConstant) continue;
    const v = l.text.getValue(), t = trad(v); if (t !== v) l.text = t; }
}
function cambiarIdioma(i) { try { localStorage.setItem('galeEarthIdioma', i); } catch {} location.reload(); }
window.cambiarIdioma = cambiarIdioma;

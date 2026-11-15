// ==================== Misión Curiosity: todo en este mismo globo ====================
// Lo que antes abría otra página (GALE-3D) ahora vive acá, en "Curiosity hoy": paradas, rutas A, B y C, expedición sur,
// Base Gale, rover (Curiosity o GX-2), PMR (rover presurizado), astronauta y misión en pareja. Mismos números y textos que la
// escena 3D: los saca herramientas/exportar_mision.py a datos/mision.json y capas/mision/*.glb. Módulo de David (con Claude).
// Textos en los dos idiomas: lg('castellano', 'english') según IDIOMA (Maps in Mars arranca en inglés). Los textos de los datos
// (fichas, paradas, fuentes) se traducen con el diccionario datos/idioma_en_mision.json, igual que el resto de Maps in Mars.
const MI_EN = (window.IDIOMA || 'en') !== 'es';
const lg = (es, en) => MI_EN ? en : es;
const MI = { D: null, activo: false, cargando: null, modo: null, rover: 'curiosity', mod: {}, ds: null, lineas: {}, excluir: [],
  dur: 240, parar: true, fovOjos: C.Math.toRadians(82), fov0: null, cam: { h: 0, p: -0.32, r: 12 }, siguiendo: false, ult: 0, quieto: 0, hover: null,
  g3: { alas: 0, alasObj: 0, cang: 0, cangObj: 0, lidar: 0, dron: null, perf: null }, camDe: {}, verRec: false, guia: null };
try { MI.dur = +localStorage.getItem('galeMisionDur') || 240; MI.rover = localStorage.getItem('galeMisionRover') || 'curiosity'; } catch {}
const M_GRADO = 3396190 * d2r;     // d2r ya existe en Maps in Mars
const miNum = (v, d = 0) => v == null || !isFinite(v) ? '—' : Number(v).toLocaleString(MI_EN ? 'en-US' : 'es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });
const miM = m => m >= 1000 ? `${miNum(m / 1000, 2)} km` : `${Math.round(m)} m`;
const miH = h => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
const miT = h => { const m = Math.round(h * 60); return `T+${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const miEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const miTr = s => (window.trad ? window.trad(String(s ?? '')) : String(s ?? ''));     // textos de los datos (diccionario de Maps in Mars)
function miFq(id) {
  const f = MI.D?.fuentes?.[id]; if (!f) return '';
  const t = miTr(f[0]);
  return `<a class="q" href="${f[1]}" target="_blank" rel="noopener" title="${lg('Fuente', 'Source')}: ${miEsc(t)}" aria-label="${lg('Ver la fuente', 'See the source')}: ${miEsc(t)}">?</a>`;
}

// ---------- estilos (mismo lenguaje que Maps in Mars; visor y pines según la guía de estilo del equipo) ----------
document.head.insertAdjacentHTML('beforeend', `<style id="miEstilos">
#miBarra{position:absolute;left:50%;bottom:calc(42px + var(--inf-seg));transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:6px;padding:6px;
  background:var(--sup);border:1px solid #ffffff14;border-radius:26px;box-shadow:var(--sombra);backdrop-filter:blur(8px);max-width:calc(100vw - var(--riel) - 120px);
  flex-wrap:wrap;justify-content:center;width:max-content;transition:opacity .24s cubic-bezier(.2,.7,.2,1),transform .24s cubic-bezier(.2,.7,.2,1)}
#miBarra.sale{opacity:0;transform:translate(-50%,12px);pointer-events:none}
body.cajonAbierto:not(.hoja) #miBarra{left:calc((var(--riel) + 424px + 100vw - 70px) / 2);max-width:calc(100vw - var(--riel) - 424px - 90px)}
@media (max-width:1500px){body.cajonAbierto:not(.hoja) #miBarra .mib{padding:0 11px;font-size:12.5px}}
body.cajonAbierto:not(.hoja) #miPlay,body.cajonAbierto:not(.hoja) #miCard{left:calc((var(--riel) + 424px + 100vw - 70px) / 2);width:min(760px,calc(100vw - var(--riel) - 424px - 90px))}
.mib{flex:none;display:flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:19px;border:1px solid #ffffff14;background:var(--sup2);color:var(--texto);cursor:pointer;
  font-size:13px;white-space:nowrap;transition:background .12s cubic-bezier(.2,.7,.2,1),border-color .12s,transform .08s}
.mib:hover{background:var(--sup3);border-color:#ffffff2e}.mib:active{transform:scale(.98)}.mib:focus-visible{outline:2px solid var(--acento);outline-offset:1px}
.mib svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.mib.pri{background:linear-gradient(#f39a4f,#e07a2c);border-color:#f7b27a;color:#1b1210;font-weight:600}.mib.pri:hover{background:linear-gradient(#f6a861,#e8853a)}
.mib.verde{background:linear-gradient(#2f8a55,#23683f);border-color:#4fbf7d;color:#fff;font-weight:600}
.mib[aria-pressed=true]{background:#4a3424;border-color:var(--acento);color:#fff}
.mi-seg{display:flex;border:1px solid #ffffff1f;border-radius:19px;overflow:hidden;flex:none}
.mi-seg button{height:36px;border:0;background:var(--sup2);color:var(--suave);padding:0 12px;cursor:pointer;font-size:12.5px}
.mi-seg button+button{border-left:1px solid #ffffff1a}.mi-seg button[aria-pressed=true]{background:#4a3424;color:#fff}
/* interruptores arriba: 49 perforaciones y recorrido nuevo (pastillas de Maps in Mars, con punto de color) */
#miArriba{position:absolute;top:calc(19px + var(--sup-seg));left:calc(var(--riel) + 404px);z-index:7;display:flex;gap:8px;flex-wrap:wrap;transition:opacity .25s}
body.cajonAbierto:not(.hoja) #miArriba{left:calc(var(--riel) + 436px)}
.mi-int{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 11px;border-radius:17px;border:1px solid #ffffff1f;background:rgba(32,33,36,.94);
  color:#e8eaed;font:500 13px/1 "Google Sans",Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:var(--sombra);backdrop-filter:blur(8px);transition:border-color .16s,background .16s}
.mi-int i{width:10px;height:10px;border-radius:50%;border:2px solid var(--c);background:transparent;transition:background .16s}
.mi-int small{color:var(--suave);font-size:11.5px}
.mi-int[aria-pressed=true]{border-color:var(--c);background:#2b2c30}.mi-int[aria-pressed=true] i{background:var(--c)}
.mi-int:hover{border-color:#ffffff40}.mi-int:focus-visible{outline:2px solid var(--acento);outline-offset:2px}
body.mi-modo #miArriba{opacity:0;pointer-events:none}
#miCard{position:absolute;left:50%;top:calc(16px + var(--sup-seg));transform:translateX(-50%);z-index:9;width:min(520px,calc(100vw - var(--riel) - 40px));
  background:var(--sup);border:1px solid #ffffff1a;border-radius:18px;box-shadow:var(--sombra);padding:14px 16px 12px;backdrop-filter:blur(8px);
  transition:opacity .24s cubic-bezier(.2,.7,.2,1),transform .24s cubic-bezier(.2,.7,.2,1)}
#miCard.sale{opacity:0;transform:translate(-50%,-10px);pointer-events:none}
body:not(.mi-modo) #miCard{top:calc(62px + var(--sup-seg))}
#miCard .et{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--acento2);font-weight:600}
#miCard h3{margin:3px 0 4px;font-size:16px;font-weight:600;display:flex;gap:8px;align-items:center}
#miCard p{margin:0 0 10px;color:#d6d8db;font-size:13px}
#miCard .bts{display:flex;gap:8px;flex-wrap:wrap}
.mi-pill{display:inline-grid;place-items:center;min-width:26px;height:22px;border-radius:11px;padding:0 6px;font-weight:700;font-size:12px;color:#1b1210;border:2px solid #1b1210;box-shadow:0 0 0 1px #ffffff59}
#miPlay{position:absolute;left:50%;bottom:calc(40px + var(--inf-seg));transform:translateX(-50%);z-index:8;width:min(760px,calc(100vw - var(--riel) - 40px));
  background:var(--sup);border:1px solid #ffffff14;border-radius:20px;box-shadow:var(--sombra);padding:10px 14px 12px;backdrop-filter:blur(8px);
  transition:opacity .24s cubic-bezier(.2,.7,.2,1),transform .24s cubic-bezier(.2,.7,.2,1)}
#miPlay.sale{opacity:0;transform:translate(-50%,12px);pointer-events:none}
#miPlay .cab{display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px}#miPlay .cab b{font-weight:600}#miPlay .cab small{color:var(--suave)}
#miPlay .dat{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:2px 0 6px}
#miPlay .dat div{background:var(--sup2);border-radius:10px;padding:5px 8px}#miPlay .dat b{display:block;font-size:16px;font-variant-numeric:tabular-nums;font-weight:600}
#miPlay .dat span{font-size:10.5px;color:var(--suave)}#miPlay .dat .alerta b{color:#ff8a7a}
#miPlay input[type=range]{width:100%;accent-color:var(--acento);margin:2px 0 8px}
#miPlay .fila{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#miPlay .fila label{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--suave);cursor:pointer}
#miPlay select{background:var(--sup2);color:var(--texto);border:1px solid #ffffff1f;border-radius:10px;height:34px;padding:0 8px;font:inherit;font-size:12.5px}
#miPlay .esp{flex:1}
body.mi-manejo #miBar,body.mi-manejo #miPlayB,body.mi-manejo #miPararL,body.mi-manejo #miDurL{display:none}
#miPad{display:none;gap:6px;align-items:center}body.mi-manejo #miPad{display:flex}
#miPad button{width:40px;height:36px;border-radius:10px;border:1px solid #ffffff1f;background:var(--sup2);color:var(--texto);font-size:16px;cursor:pointer;touch-action:none}
#miPad button.on{background:#4a3424;border-color:var(--acento)}
body.mi-modo #busca,body.mi-modo #bMision,body.mi-modo #linea,body.mi-modo #miBarra{opacity:0;pointer-events:none}
body.mi-modo #cajon:not(.mi-libre){transform:translateX(-30px);opacity:0;pointer-events:none}
body.mi-marcar .cesium-widget canvas{cursor:crosshair!important}
#busca,#bMision,#riel,#controles{transition:opacity .3s cubic-bezier(.4,0,.2,1)}
/* PMR: la pantalla de la cabina (el astronauta que se queda adentro ve todo acá) */
#miPantalla{position:absolute;right:66px;top:calc(12px + var(--sup-seg));bottom:calc(40px + var(--inf-seg));width:340px;z-index:8;display:flex;flex-direction:column;gap:8px;
  background:#16181bf2;border:1px solid #ffffff1f;border-radius:16px;padding:10px 12px;box-shadow:var(--sombra);backdrop-filter:blur(8px);font-size:12.5px;overflow:hidden}
#miPantalla .pt{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--suave)}
#miPantalla .pt b{color:#d9b8ff;font-weight:600;letter-spacing:.1em}
#miPantalla canvas{width:100%;height:auto;max-height:180px;object-fit:contain;background:#0c0e11;border-radius:10px;border:1px solid #ffffff14;display:block;flex:none}
#miPantalla .tr{font-size:12.5px}#miPantalla .tr b{font-weight:600}#miPantalla .tr .sub{color:var(--suave);font-size:11.5px}
#miPantalla .rej{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;flex:none}
#miPantalla .rej div{background:var(--sup2);border-radius:9px;padding:4px 7px;min-width:0}#miPantalla .rej b{display:block;font-size:13.5px;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#miPantalla .rej span{font-size:10px;line-height:1.25;color:var(--suave);display:block}#miPantalla .rej .alerta{box-shadow:inset 0 0 0 1px #ff6b6b}#miPantalla .rej .alerta b{color:#ff8a7a}
#miPantalla .mot{background:#1b2a21;border-radius:10px;padding:6px 9px;font-size:12px;color:#d6e8db;flex:none;max-height:104px;overflow:auto}
#miPantalla .motT{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#7bd88f;margin-bottom:2px}
#miPantalla ul{list-style:none;margin:0;padding:0;overflow:auto;flex:1;display:flex;flex-direction:column;gap:6px;min-height:60px}
#miPantalla li{background:var(--sup2);border-radius:10px;padding:6px 9px;border-left:3px solid #ffcf7a;animation:miEntra .24s cubic-bezier(.2,.7,.2,1)}
#miPantalla li b{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#ffcf7a}#miPantalla li b i{font-style:normal;color:var(--suave);margin-left:6px;text-transform:none;letter-spacing:0}
#miPantalla li.tierra{border-left-color:#7fb4ff}#miPantalla li.tierra b{color:#9cc3ff}#miPantalla li.a1{border-left-color:#ff8a3d}#miPantalla li.a1 b{color:#ffb27a}
#miPantalla li.a2{border-left-color:#b06bff}#miPantalla li.a2 b{color:#d9b8ff}#miPantalla li.alerta{border-left-color:#ff4d4d;background:#3a1f1c}
#miPantalla .resp{display:flex;gap:6px;flex-wrap:wrap;flex:none}#miPantalla .resp .mib{height:30px;font-size:12px;padding:0 10px}
#miPantalla a.q{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #ffcf7a8c;color:var(--acento2);font:600 10px/1 system-ui;text-decoration:none;margin-left:4px}
@keyframes miEntra{from{opacity:0;transform:translateY(6px)}}
/* visor del casco del que camina (guía de estilo 3.5: monoespaciada, cian) */
#miHud{position:absolute;left:calc(var(--riel) + 14px);top:calc(14px + var(--sup-seg));z-index:8;width:258px;pointer-events:none;
  font:12.5px/1.4 ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:#bff6ff;text-shadow:0 0 6px rgba(0,200,255,.55),0 1px 1px #000}
#miHud .cj{background:rgba(0,25,35,.42);border:1px solid rgba(150,230,255,.35);border-radius:8px;padding:6px 9px;margin-bottom:6px;backdrop-filter:blur(3px)}
#miHud h4{margin:0 0 2px;font-size:10.5px;letter-spacing:.14em;color:#7fdcff;font-weight:600;display:flex;justify-content:space-between}
#miHud h4 i{width:8px;height:8px;border-radius:50%;background:#ff5a4a;display:inline-block;animation:miLate 1.2s infinite;margin-top:2px}
#miHud .fl{display:flex;justify-content:space-between;gap:8px}#miHud .al{color:#ff8f8f;text-shadow:0 0 6px rgba(255,80,80,.6)}
#miHud #miHFlecha{display:inline-block;color:#ffcf7a;transition:transform .2s}
#miHud .msg{font-size:11.5px;color:#e0fbff;max-height:4.2em;overflow:hidden}
@keyframes miLate{50%{opacity:.25}}
body.mi-casco #miHudMarco{position:absolute;inset:0;z-index:7;pointer-events:none;background:radial-gradient(ellipse 78% 74% at 50% 48%,transparent 62%,rgba(0,0,0,.55) 100%)}
/* lugar libre entre el visor (izquierda, 284 px) y la pantalla del PMR (derecha, 416 px, sin tapar los controles de Maps in Mars) */
body.mi-hud #miCard{left:calc((100vw + var(--riel) + 272px) / 2);width:min(500px,calc(100vw - var(--riel) - 320px))}
body.mi-pant #miCard{left:calc((100vw + var(--riel) - 404px) / 2);width:min(520px,calc(100vw - var(--riel) - 452px))}
body.mi-pant.mi-hud #miCard{left:calc((100vw + var(--riel) - 132px) / 2);width:min(500px,calc(100vw - var(--riel) - 724px))}
body.mi-pant #miPlay{left:calc((100vw + var(--riel) - 404px) / 2);width:min(720px,calc(100vw - var(--riel) - 452px))}
body.cajonAbierto #miHud{opacity:0}
#miPantBtn{display:none}
#miTip{position:absolute;z-index:20;pointer-events:none;background:#202124f2;border:1px solid #ffffff22;border-radius:10px;padding:5px 9px;font-size:12px;box-shadow:var(--sombra);
  transform:translate(14px,-120%);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
#miTip small{display:block;color:var(--suave);font-size:11px}
.mi-ficha .parada-cab{display:flex;gap:7px;align-items:center;font-size:17px;font-weight:600;margin:6px 0 4px}
.mi-ficha .chip{display:inline-grid;place-items:center;width:auto;height:24px;min-width:28px;border-radius:12px;padding:0 6px;font-weight:700;color:#1b1210;font-size:12px;margin:0;border:2px solid #1b1210;box-shadow:0 0 0 1px #ffffff59}
.mi-ficha .sub{color:var(--suave);font-size:12px}
.mi-ficha .prov{color:var(--acento2);font-size:10.5px;border:1px solid var(--acento2);border-radius:4px;padding:0 4px;margin-left:4px;white-space:nowrap}
.mi-ficha details{border:1px solid var(--linea);border-radius:10px;margin:7px 0;padding:0 10px;background:#ffffff05}
.mi-ficha details>summary{cursor:pointer;padding:8px 0;font-weight:600;list-style:none;display:flex;gap:6px;align-items:baseline}
.mi-ficha details>summary::-webkit-details-marker{display:none}
.mi-ficha details>summary::before{content:'▸';color:var(--acento);transition:transform .15s}.mi-ficha details[open]>summary::before{transform:rotate(90deg)}
.mi-ficha .hall{margin:4px 0 6px;padding-left:8px;border-left:3px solid var(--acento)}.mi-ficha .hall b,.mi-ficha .hall .sub{display:block}
.mi-ficha .nivel{font-size:10.5px;border-radius:4px;padding:0 4px;margin-left:4px;border:1px solid currentColor;font-weight:500}
.mi-ficha .n-fuerte{color:#7bd88f}.mi-ficha .n-presente{color:#ffcf7a}.mi-ficha .n-rastro,.mi-ficha .n-indicio{color:#a99d90}
.mi-ficha .tabla{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px}.mi-ficha .tabla td{padding:2px 0;vertical-align:top}
.mi-ficha .tabla td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.mi-ficha .sim-banda{display:inline-block;font-size:10.5px;letter-spacing:.1em;font-weight:700;color:#1b1210;background:var(--acento);border-radius:4px;padding:1px 6px;margin-bottom:6px}
.mi-ficha .apilada{display:flex;height:14px;border-radius:4px;overflow:hidden;margin:6px 0 4px}.mi-ficha .apilada i{display:block;height:100%}
.mi-ficha .barrita{display:inline-block;width:70px;height:6px;background:#ffffff14;border-radius:3px;vertical-align:1px;margin-right:6px;position:relative}
.mi-ficha .barrita i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--acento)}
.mi-ficha a.q,#miCard a.q{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1px solid #ffcf7a8c;color:var(--acento2);
  font:600 10.5px/1 system-ui,sans-serif;text-decoration:none;margin-left:5px;vertical-align:1px}
.mi-ficha a.q:hover,#miCard a.q:hover,#miPantalla a.q:hover{background:var(--acento);color:#1b1210}
.mi-bts{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}.mi-bts .mib{height:34px;font-size:12.5px}
.mi-pz{display:inline-flex;align-items:center;gap:5px;margin:4px 6px 0 0;padding:3px 9px 3px 4px;border-radius:14px;background:#ffffff0d;border:1px solid #ffffff12;cursor:pointer;font-size:12px}
.mi-pz:hover{background:#ffffff1a}
.mi-lista{max-height:46vh;overflow:auto;border:1px solid var(--linea);border-radius:10px;margin:6px 0}
.mi-lista label,.mi-lista button.fil{display:flex;align-items:center;gap:8px;padding:6px 9px;border-bottom:1px solid #ffffff0d;cursor:pointer;font-size:12.5px;width:100%;background:none;border-left:0;border-right:0;border-top:0;color:inherit;text-align:left}
.mi-lista label:hover,.mi-lista button.fil:hover{background:#ffffff0a}.mi-lista small{color:var(--suave);margin-left:auto;white-space:nowrap}
.mi-buscar{width:100%;height:34px;border-radius:17px;border:1px solid #ffffff1f;background:var(--sup2);color:var(--texto);padding:0 12px;font:inherit;font-size:13px}
/* Wiki: abrir en otra pantalla, y la pantalla sola para leer */
#miOtra{border:0;background:transparent;color:var(--suave);width:36px;height:36px;border-radius:50%;cursor:pointer;display:none;place-items:center;font-size:17px}
#miOtra:hover{background:var(--sup2);color:var(--texto)}body.mi-wiki-on #miOtra{display:inline-grid}
body.soloWiki #riel,body.soloWiki #busca,body.soloWiki #bMision,body.soloWiki #controles,body.soloWiki #estado,body.soloWiki #linea,body.soloWiki #miArriba,
body.soloWiki #miBarra,body.soloWiki #cargando,body.soloWiki #transicion,body.soloWiki .cesium-viewer,body.soloWiki #miOtra,body.soloWiki #cerrarCajon,body.soloWiki #miCard,body.soloWiki #miTip,
body.soloWiki .mi-ficha .mi-bts,body.soloWiki .mi-ficha .tarjeta[data-mi]{display:none!important}
body.soloWiki{background:#0b0d12;overflow:auto}
body.soloWiki #cajon{position:relative!important;left:auto!important;top:auto!important;bottom:auto!important;transform:none!important;opacity:1!important;width:min(860px,calc(100vw - 32px))!important;
  max-height:none!important;height:auto!important;margin:24px auto!important;display:block!important}
body.soloWiki #contenido{max-height:none!important;overflow:visible!important}
@media (max-width:1500px){body.mi-pant #miPantalla{width:310px}}
@media (max-height:760px){#miPantalla canvas{max-height:150px;object-fit:contain}#miPantalla .mot{max-height:70px}}
@media (max-width:900px){body.mi-activo #bMision{opacity:0;pointer-events:none}
  #miBarra [data-m=trip],#miBarra [data-m=expe],#miBarra [data-m=base],#miBarra .mi-seg{display:none}
  #miBarra .mib{height:34px;padding:0 11px;font-size:12.5px}
  #miPlay .dat b{font-size:14px}#miBarra{max-width:calc(100vw - 24px);bottom:calc(64px + var(--inf-seg))}
  #miArriba{left:10px;top:calc(64px + var(--sup-seg))}body.hoja #miArriba{opacity:0;pointer-events:none}
  .mi-int{height:30px;font-size:12px;padding:0 11px 0 9px}
  #miHud{left:10px;right:10px;width:auto;top:calc(8px + var(--sup-seg));font-size:11px}#miHud .cj{padding:4px 7px;margin-bottom:4px}#miHud .ocul{display:none}
  #miPantalla{display:none;left:10px;right:10px;width:auto;top:calc(10px + var(--sup-seg));bottom:calc(var(--miPlayH,214px) + 104px + var(--inf-seg));max-height:none}
  body.mi-pant-abierta #miPantalla{display:flex}body.mi-pant-abierta #miHud{display:none}
  body.mi-pant #miPantBtn{display:flex;position:absolute;left:10px;bottom:calc(var(--miPlayH,214px) + 54px + var(--inf-seg));z-index:9}
  body.mi-pant #miCard,body.mi-hud #miCard,body.mi-pant.mi-hud #miCard{left:50%;width:calc(100vw - 20px);top:calc(120px + var(--sup-seg))}
  body.mi-pant #miPlay{left:50%;width:calc(100vw - 20px)}}
@media (prefers-reduced-motion:reduce){#miBarra,#miCard,#miPlay,#miPantalla li{transition:none;animation:none}}
</style>`);

// ---------- interfaz ----------
const ICO = {
  pareja: '<svg viewBox="0 0 24 24"><circle cx="8" cy="5" r="2.2"/><circle cx="16.5" cy="5" r="2.2"/><path d="M8 8.5v6m0-6-3 4m3-4 3 4M8 14.5l-2.5 6M8 14.5l2.5 6M16.5 8.5v6m0-6-3 4m3-4 3 4m-3 2-2.5 6m2.5-6 2.5 6"/></svg>',
  rover: '<svg viewBox="0 0 24 24"><rect x="5" y="8" width="13" height="5" rx="1"/><path d="M8 8V5h3M18 9.5l3-2"/><circle cx="6.5" cy="17" r="2"/><circle cx="12" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/></svg>',
  pie: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"/><path d="M12 8v6m0-6-3.5 4.5M12 8l3.5 4.5M12 14l-3 7m3-7 3 7"/></svg>',
  trip: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="15" height="7" rx="2"/><path d="M18 9h2.5l1.5 3v2h-4"/><circle cx="7" cy="16.5" r="2"/><circle cx="16" cy="16.5" r="2"/></svg>',
  brujula: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  base: '<svg viewBox="0 0 24 24"><path d="M3 18a9 9 0 0 1 18 0z"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0M12 9V5"/></svg>',
  lista: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".6"/><circle cx="4" cy="12" r=".6"/><circle cx="4" cy="18" r=".6"/></svg>',
};
document.body.insertAdjacentHTML('beforeend', `
<div id="miArriba" role="group" aria-label="${lg('Qué se ve en el mapa', 'What the map shows')}">
  <button class="mi-int" id="miIntPozos" style="--c:#c0392b" aria-pressed="false" title="${lg('Prender o apagar los carteles de las 49 perforaciones de Curiosity', 'Show or hide the pins of Curiosity\'s 49 drill holes')}"><i></i>${lg('49 perforaciones', '49 drill holes')}</button>
  <button class="mi-int" id="miIntRec" style="--c:#b06bff" aria-pressed="false" title="${lg('Prender o apagar nuestras rutas y paradas (A, B, C, T y expedición)', 'Show or hide our routes and stops (A, B, C, T and expedition)')}"><i></i>${lg('Recorrido nuevo', 'New routes')}</button>
</div>
<div id="miBarra" class="oculto sale" role="toolbar" aria-label="${lg('Curiosity hoy: misión', 'Curiosity today: mission')}">
  <button class="mib pri" data-m="pareja" title="${lg('Misión en pareja: uno camina con el visor del casco y el otro sigue todo desde la pantalla del PMR', 'Two-person mission: one walks with the helmet visor, the other follows everything on the PMR screen')}">${ICO.pareja}${lg('En pareja', 'Two-person')}</button>
  <button class="mib" data-m="A" title="${lg('Ruta A del robot (Curiosity o GX-2), desde atrás', 'Robot route A (Curiosity or GX-2), from behind')}">${ICO.rover}${lg('Rover · ruta A', 'Rover · route A')}</button>
  <button class="mib" data-m="B" title="${lg('Ruta B a pie, ida y vuelta', 'Route B on foot, out and back')}">${ICO.pie}${lg('A pie · ruta B', 'On foot · route B')}</button>
  <button class="mib" data-m="pmr" title="${lg('PMR, el rover presurizado: guía de la expedición, ir a un pozo o manejo libre', 'PMR, the pressurized rover: expedition guide, drive to a drill hole or free drive')}">${ICO.trip}PMR</button>
  <button class="mib" data-m="expe" title="${lg('Expedición sur: cinco puntos más allá de A4', 'Southern expedition: five points beyond A4')}">${ICO.brujula}${lg('Expedición sur', 'Southern expedition')}</button>
  <button class="mib" data-m="base" title="${lg('Base Gale, en la Zona 2 de la llanura del aterrizaje', 'Gale Base, in Zone 2 of the landing plain')}">${ICO.base}${lg('Base Gale', 'Gale Base')}</button>
  <span class="mi-seg" title="${lg('Qué rover robótico se ve', 'Which robotic rover is shown')}"><button data-rv="curiosity">Curiosity</button><button data-rv="gx2">GX-2</button></span>
  <button class="mib" data-m="info" title="${lg('Todo lo de Curiosity hoy, en el panel', 'Everything about Curiosity today, in the panel')}">${ICO.lista}${lg('Todo', 'All')}</button>
</div>
<div id="miCard" class="oculto sale" role="status"><div class="et" id="miCet"></div><h3 id="miCtit"></h3><p id="miCtxt"></p><div class="bts" id="miCbts"></div></div>
<div id="miPlay" class="oculto sale" role="region" aria-label="${lg('Recorrido', 'Route')}">
  <div class="cab"><span class="mi-pill" id="miPid">B</span><b id="miPnomR"></b><small id="miPsub"></small></div>
  <div class="dat"><div><b id="miD1">0 min</b><span id="miL1"></span></div><div><b id="miD2">0 m</b><span id="miL2">${lg('recorrido', 'distance')}</span></div>
    <div id="miC3"><b id="miD3">0°</b><span id="miL3">${lg('pendiente de marcha', 'slope ahead')}</span></div><div id="miC4"><b id="miD4">0</b><span id="miL4"></span></div></div>
  <input type="range" id="miBar" min="0" max="1000" value="0" aria-label="${lg('Avance del recorrido', 'Route progress')}">
  <div class="fila">
    <button class="mib pri" id="miPlayB">▶ ${lg('Salir', 'Go')}</button>
    <span id="miPad" role="group" aria-label="${lg('Manejar el PMR', 'Drive the PMR')}"><button data-k="izq" title="${lg('Girar a la izquierda (A o ←)', 'Turn left (A or ←)')}">◀</button><button data-k="ade" title="${lg('Adelante (W o ↑)', 'Forward (W or ↑)')}">▲</button><button data-k="atr" title="${lg('Atrás (S o ↓)', 'Back (S or ↓)')}">▼</button><button data-k="der" title="${lg('Girar a la derecha (D o →)', 'Turn right (D or →)')}">▶</button><button data-k="rap" title="${lg('Rápido ×10 (Shift)', 'Fast ×10 (Shift)')}">×10</button></span>
    <label id="miPararL"><input type="checkbox" id="miParar" checked> ${lg('Detenerse en cada parada', 'Stop at each stop')}</label>
    <label id="miDurL">${lg('Duración', 'Duration')} <select id="miDur"><option value="60">1 min</option><option value="120">2 min</option><option value="240">4 min</option><option value="480">8 min</option></select></label>
    <span class="mi-seg" id="miVistas"><button data-v="detras" aria-pressed="true">${lg('Detrás', 'Behind')}</button><button data-v="ojos">${lg('Ojos', 'Eyes')}</button></span>
    <span class="esp"></span>
    <button class="mib" id="miSalir" title="${lg('Salir del recorrido (Esc)', 'Leave the route (Esc)')}">${lg('Salir', 'Exit')} (Esc)</button>
  </div>
</div>
<div id="miHudMarco"></div>
<div id="miHud" class="oculto" aria-live="polite">
  <div class="cj"><h4><span id="miHTit">${lg('VISOR · ASTRONAUTA 1', 'VISOR · ASTRONAUT 1')}</span><span><i></i> <span id="miReloj">T+00:00</span></span></h4>
    <div class="fl"><span>${lg('PRÓXIMA', 'NEXT')}</span><span><span id="miHFlecha">↑</span> <b id="miHProx">—</b></span></div></div>
  <div class="cj"><h4>${lg('SUELO', 'GROUND')}</h4><div class="fl"><span>${lg('Pendiente', 'Slope')}</span><b id="miHPend">—</b></div><div class="fl ocul"><span>${lg('Bajo tus pies', 'Underfoot')}</span><b id="miHMin">—</b></div></div>
  <div class="cj"><h4>${lg('RADIACIÓN', 'RADIATION')}</h4><div class="fl"><span>${lg('Dosis salida', 'EVA dose')}</span><b id="miHDosis">—</b></div><div class="fl ocul"><span>${lg('Cielo tapado', 'Sky blocked')}</span><b id="miHCielo">—</b></div></div>
  <div class="cj"><h4>${lg('REFUGIO · PMR', 'SHELTER · PMR')}</h4><div class="fl"><span id="miHRefD">—</span><b id="miHRefT">—</b></div></div>
  <div class="cj ocul"><h4>${lg('MENSAJE', 'MESSAGE')}</h4><div class="msg" id="miHMsg">—</div></div>
</div>
<aside id="miPantalla" class="oculto" aria-label="${lg('Pantalla del PMR', 'PMR screen')}">
  <div class="pt"><b>${lg('Pantalla del PMR', 'PMR screen')}</b><span id="miPQuien"></span></div>
  <canvas id="miMapa" width="620" height="360"></canvas>
  <div class="tr" id="miPTramo"></div>
  <div class="rej" id="miPRej"></div>
  <div class="mot oculto" id="miPMot"></div>
  <div class="pt"><span>${lg('Comunicaciones', 'Communications')}</span><span id="miDemora"></span></div>
  <ul id="miMsgs"></ul>
  <div class="resp"><button class="mib" data-r="llegamos">${lg('Llegamos', 'We are there')}</button><button class="mib" data-r="pronostico">${lg('Pedir pronóstico', 'Ask for forecast')}</button><button class="mib" data-r="ayuda">${lg('Necesitamos ayuda', 'We need help')}</button></div>
</aside>
<button class="mib" id="miPantBtn" aria-expanded="false">📟 ${lg('Pantalla del PMR', 'PMR screen')}</button>
<div id="miTip" class="oculto"></div>`);
$('miDur').value = String(MI.dur);
const miMostrar = (id, on) => { const e = $(id); clearTimeout(e._t); e._on = on; if (on) { e.classList.remove('oculto'); requestAnimationFrame(() => { if (e._on) e.classList.remove('sale'); }); } else { e.classList.add('sale'); e._t = setTimeout(() => { if (!e._on) e.classList.add('oculto'); }, 260); } };
$('miPantBtn').onclick = () => { const a = document.body.classList.toggle('mi-pant-abierta'); $('miPantBtn').setAttribute('aria-expanded', a); };
// ---------- geometría: puntos de una línea, rumbo, altura del suelo y marco del modelo ----------
const _cg = new C.Cartographic();
const rElip = latc => { const p = latc * d2r; return A * B / Math.sqrt((B * Math.cos(p)) ** 2 + (A * Math.sin(p)) ** 2); };
const hDeElev = (elev, latc) => (elev + 3396190 - rElip(latc)) * (viewer.scene.verticalExaggeration || 1);
function alturaSuelo(lon, lat, elev) {
  C.Cartographic.fromDegrees(lon, geodetica(lat), 0, _cg); let h;
  try { h = MODO === 'globo' ? viewer.scene.globe.getHeight(_cg) : (tileset && viewer.scene.sampleHeightSupported ? viewer.scene.sampleHeight(_cg, MI.excluir) : undefined); } catch { h = undefined; }
  return h != null && isFinite(h) ? h : elev != null ? hDeElev(elev, lat) : 0;
}
function enLinea(L, d) {
  const P = L.pts; d = Math.max(0, Math.min(L.largo, d)); let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][2] <= d) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], u = b[2] > a[2] ? Math.min(1, Math.max(0, (d - a[2]) / (b[2] - a[2]))) : 0, f = i => a[i] + (b[i] - a[i]) * u;
  return { lon: f(0), lat: f(1), d, elev: f(3), marcha: a[4], terr: a[5], cielo: f(6), t: f(7), dosis: f(8), terreno: a[9], min: a[10], kwh: a[11] != null ? f(11) : null };
}
const rumboDe = (a, b) => Math.atan2((b.lon - a.lon) * Math.cos(a.lat * d2r), b.lat - a.lat);   // desde el norte, hacia el este
const angDif = a => Math.atan2(Math.sin(a), Math.cos(a));
const corrido = (lon, lat, este, norte) => [lon + este / (M_GRADO * Math.cos(lat * d2r)), lat + norte / M_GRADO];
const _e = new C.Matrix4();
function ejes(P, F, U) {        // columnas: adelante (+X del modelo), izquierda (+Y), arriba (+Z)
  const Y = C.Cartesian3.normalize(C.Cartesian3.cross(U, F, new C.Cartesian3()), new C.Cartesian3());
  const Z = C.Cartesian3.cross(F, Y, new C.Cartesian3());
  return new C.Matrix4(F.x, Y.x, Z.x, P.x, F.y, Y.y, Z.y, P.y, F.z, Y.z, Z.z, P.z, 0, 0, 0, 1);
}
// apoya el modelo en el terreno: rumbo de la marcha y, si "inclina", cabeceo y alabeo según cuatro apoyos (como la suspensión)
function colocar(m, lon, lat, rumbo, elev, largo = 3, ancho = 2.6, inclina = true, alza = 0) {
  const f = [Math.sin(rumbo), Math.cos(rumbo)], l = [-Math.cos(rumbo), Math.sin(rumbo)];
  const P = (e, n) => { const [lo, la] = corrido(lon, lat, e, n); return pos(lo, la, alturaSuelo(lo, la, elev)); };
  let F, U, centro;
  if (inclina && MODO === 'globo') {          // con Cesium Mars (3D Tiles) cada muestra de altura cuesta un render: ahí va sin inclinar
    const pF = P(f[0] * largo / 2, f[1] * largo / 2), pB = P(-f[0] * largo / 2, -f[1] * largo / 2), pL = P(l[0] * ancho / 2, l[1] * ancho / 2), pR = P(-l[0] * ancho / 2, -l[1] * ancho / 2);
    F = C.Cartesian3.normalize(C.Cartesian3.subtract(pF, pB, new C.Cartesian3()), new C.Cartesian3());
    const Lv = C.Cartesian3.subtract(pL, pR, new C.Cartesian3());
    U = C.Cartesian3.normalize(C.Cartesian3.cross(F, Lv, new C.Cartesian3()), new C.Cartesian3());
    centro = C.Cartesian3.multiplyByScalar(C.Cartesian3.add(C.Cartesian3.add(pF, pB, new C.Cartesian3()), C.Cartesian3.add(pL, pR, new C.Cartesian3()), new C.Cartesian3()), 0.25, new C.Cartesian3());
  } else {
    centro = P(0, 0); const enu = C.Transforms.eastNorthUpToFixedFrame(centro, MARS, _e);
    const E = C.Matrix4.getColumn(enu, 0, new C.Cartesian4()), N = C.Matrix4.getColumn(enu, 1, new C.Cartesian4()), Up = C.Matrix4.getColumn(enu, 2, new C.Cartesian4());
    F = new C.Cartesian3(E.x * f[0] + N.x * f[1], E.y * f[0] + N.y * f[1], E.z * f[0] + N.z * f[1]); U = new C.Cartesian3(Up.x, Up.y, Up.z);
  }
  if (alza) C.Cartesian3.add(centro, C.Cartesian3.multiplyByScalar(U, alza, new C.Cartesian3()), centro);
  m.modelMatrix = ejes(centro, F, U); return centro;
}
function girarNodo(m, nombre, ang, eje = 'z', mover = null) {
  const n = m.getNode(nombre); if (!n) return;
  const R = eje === 'x' ? C.Matrix3.fromRotationX(ang) : eje === 'y' ? C.Matrix3.fromRotationY(ang) : C.Matrix3.fromRotationZ(ang);
  const T = C.Matrix4.fromRotationTranslation(R, mover || C.Cartesian3.ZERO);
  n.matrix = C.Matrix4.multiply(n.originalMatrix, T, new C.Matrix4());
}
// paso del astronauta: los mismos ángulos que poseAstro de la escena, como diferencia con la pose de reposo
function pasoAstro(m, fase, mov, pend = 0) {
  if (!m.ready) return;
  const s = Math.sin(fase), c = Math.cos(fase);
  [-1, 1].forEach((lado, i) => {
    const muslo = mov * 0.45 * lado * s, rod = -(0.08 + mov * 0.7 * Math.max(0, -lado * c)), tob = -muslo - rod * 0.6;
    girarNodo(m, `muslo_${i}`, muslo); girarNodo(m, `rodilla_${i}`, rod + 0.08); girarNodo(m, `tobillo_${i}`, tob - 0.048);
    girarNodo(m, `hombro_${i}`, -mov * 0.32 * lado * s); girarNodo(m, `codo_${i}`, mov * 0.18 * (1 - lado * s));
  });
  girarNodo(m, 'cadera', 0, 'z', new C.Cartesian3(0, -mov * 0.035 + mov * 0.05 * Math.abs(c), 0));
  const torso = -(0.06 + mov * 0.08 + Math.max(-0.12, Math.min(0.2, pend * 0.6)));
  girarNodo(m, 'torso', torso + 0.06); girarNodo(m, 'casco', -(torso + 0.06) * 0.6);
}


// ---------- datos y modelos ----------
async function miCargar() {
  if (MI.D) return true;
  if (MI.cargando) return MI.cargando;
  MI.cargando = (async () => {
    try { MI.D = await (await fetch('datos/mision.json', { cache: 'no-cache' })).json(); }
    catch (e) { avisar(location.protocol === 'file:' ? lg('Para ver la misión abrí Maps in Mars con abrir.bat (o desde la página publicada).', 'To see the mission, open Maps in Mars with abrir.bat (or from the published page).') : lg('No se pudo cargar datos/mision.json.', 'Could not load datos/mision.json.')); MI.cargando = null; return false; }
    const D = MI.D;
    for (const r of D.rutas) MI.lineas[r.id] = { ...r, tipoL: r.tipo };
    if (D.expedicion) for (const [k, L] of Object.entries(D.expedicion.lineas)) MI.lineas['E-' + k] = { ...L, id: 'E-' + k, nombre: k === 'vehiculo' ? lg('Expedición sur · rover', 'Southern expedition · rover') : lg('Expedición sur · a pie', 'Southern expedition · on foot'), tipo: k, idaVuelta: false };
    MI.paradas = Object.fromEntries(D.paradas.map(p => [p.id, p])); if (D.expedicion) for (const e of D.expedicion.paradas) MI.paradas[e.id] = { ...e, expe: true };
    miPrepararPMR(); miCapa(); miLuz(); miVisibles();
    // modelos 3D (Model primitives): se mueven cuadro a cuadro sin pasar por entidades
    const cargar = async (k, opc = {}, clave = k) => {
      try { const m = await C.Model.fromGltfAsync({ url: `capas/mision/${k}.glb`, show: false, id: { mision: clave }, ...opc });
        viewer.scene.primitives.add(m); MI.mod[clave] = m; MI.excluir.push(m); return m; } catch (e) { console.warn('[Misión] sin modelo', k, e); return null; }
    };
    await Promise.all([cargar('curiosity'), cargar('gx2'), cargar('astronauta'), cargar('astronauta', {}, 'a2'), D.pmr ? cargar('pmr') : null,
      D.base ? cargar('base_gale', { heightReference: C.HeightReference.RELATIVE_TO_GROUND, scene: viewer.scene }) : null]);
    if (MI.mod.base_gale) { const b = D.base; MI.mod.base_gale.modelMatrix = C.Transforms.eastNorthUpToFixedFrame(pos(b.lon, b.lat, b.alto_plataforma), MARS); }
    return true;
  })();
  return MI.cargando;
}
// nombre de una ruta en el idioma de la pantalla
const miNomRuta = L => !L ? '' : ({ A: lg('A · Robot Curiosity', 'A · Curiosity robot'), B: lg('B · Astronauta a pie, ida y vuelta', 'B · Astronaut on foot, out and back'),
  C: lg('C · PMR con caminatas (mismo trazado que A)', 'C · PMR with walks (same track as A)'), T: lg('T · PMR de la Base Gale a la zona de hoy', 'T · PMR from Gale Base to today\'s area') })[L.id]
  || (/^C-cam(\d)/.test(L.id) ? lg(`C · Caminata ${L.id.slice(-1)}`, `C · Walk ${L.id.slice(-1)}`) + (L.nombre.match(/\(.*\)/) || [''])[0] : L.nombre);

// ---------- PMR (rover presurizado): energía, estacionamiento en la base y piezas que se mueven ----------
function miPrepararPMR() {
  const D = MI.D, g = D.pmr; if (!g) return;
  const P = g.par || {}; MI.eKm = ((P.potencia_manejo_kW ?? 5) + (P.potencia_cabina_kW ?? 1.85)) / (P.velocidad_km_h ?? 10); MI.eM = (P.masa_kg ?? 6100) * 3.711 / (P.eficiencia_motores ?? 0.8) / 3.6e6;
  for (const L of Object.values(MI.lineas)) if (L.tipo === 'tripulado' && L.pts.length && L.pts[0][11] == null) {     // la ruta C viene de la escena sin energía
    let k = 0; L.pts.forEach((p, i) => { if (i) { const a = L.pts[i - 1]; k += MI.eKm * (p[2] - a[2]) / 1000 + MI.eM * Math.max(0, p[3] - a[3]); } p[11] = Math.round(k * 100) / 100; });
    L.kwh = Math.round(k * 10) / 10; }
  // de qué parada de la ruta C sale cada caminata (la más cercana a su primer punto)
  MI.camDe = {};
  for (const L of Object.values(MI.lineas)) if (/^C-cam/.test(L.id)) { const p0 = L.pts[0]; let mejor = null, dm = 60;
    for (const o of MI.lineas.C?.paradas || []) { const p = MI.paradas[o.id]; if (!p) continue; const d = Math.hypot((p.lon - p0[0]) * Math.cos(p0[1] * d2r), p.lat - p0[1]) * M_GRADO; if (d < dm) { dm = d; mejor = o.id; } }
    if (mejor) MI.camDe[mejor] = L.id; }
}
const miBat = () => MI.D.pmr?.par?.bateria_kWh || 200;
const miVPMR = () => (MI.D.pmr?.par?.velocidad_km_h || 10) * 1000;      // m/h
function miMarco(centro, rumbo) {
  const enu = C.Transforms.eastNorthUpToFixedFrame(centro, MARS, _e), E = C.Matrix4.getColumn(enu, 0, new C.Cartesian4()), N = C.Matrix4.getColumn(enu, 1, new C.Cartesian4()), Up = C.Matrix4.getColumn(enu, 2, new C.Cartesian4());
  const s = Math.sin(rumbo), c = Math.cos(rumbo);
  return { F: new C.Cartesian3(E.x * s + N.x * c, E.y * s + N.y * c, E.z * s + N.z * c), U: new C.Cartesian3(Up.x, Up.y, Up.z) };
}
// estacionado al lado de su garaje, sobre la plataforma de la base (plana: a la altura de la plataforma, no del suelo)
function miAparcarPMR() {
  const g = MI.D?.pmr, m = MI.mod.pmr, b = MI.D?.base; if (!g || !m || !b) return;
  if (MI.pmrFuera) return miPonerPMR(MI.pmrFuera);          // si quedó en otro lugar (manejo libre o una guía), queda ahí
  // la altura de la plataforma: la medida a máximo detalle (una vez); mientras tanto, la del terreno que está dibujado
  if (MI.hBase == null && !MI.hBaseP) MI.hBaseP = hMedida(b.lon, b.lat, b.elev).then(h => { MI.hBase = h; MI.hBaseP = null; if (!MI.modo) miAparcarPMR(); });
  const centro = pos(g.lon, g.lat, (MI.hBase ?? alturaSuelo(b.lon, b.lat, b.elev)) + (b.alto_plataforma || 0)), { F, U } = miMarco(centro, Math.PI / 2 - g.yaw);
  m.modelMatrix = ejes(centro, F, U); m.show = true; miTrajes(2);
}
function miPonerPMR(p) { const m = MI.mod.pmr; if (!m) return; m.show = true; return colocar(m, p.lon, p.lat, p.rumbo, p.elev, 4.0, 3.2, true); }
// estacionado donde empieza una caminata, con la cola (los suitports) hacia la caminata; "fijo" = donde lo dejó el tramo anterior
function miPMREnSalida(L, fijo) {
  const m = MI.mod.pmr; if (!m) return;
  if (fijo) return miPonerPMR(fijo);
  const q0 = enLinea(L, 0), r0 = rumboDe(q0, enLinea(L, 6)), [lo, la] = corrido(q0.lon, q0.lat, -Math.sin(r0) * 4.4 + Math.cos(r0) * 3.6, -Math.cos(r0) * 4.4 - Math.sin(r0) * 3.6);   // atrás y a la derecha
  MI.pmrSalida = { lon: lo, lat: la, rumbo: r0 + Math.PI, elev: q0.elev }; miPonerPMR(MI.pmrSalida);
}
// trajes acoplados en la pared de atrás: los que salieron a caminar no están
function miTrajes(n) { const m = MI.mod.pmr; if (!m?.ready) return; for (let i = 0; i < 2; i++) { const nd = m.getNode(`traje_${i}`); if (nd) nd.show = i < n; } }
function nodoTRS(m, nombre, t, s, R) {
  const n = m.getNode(nombre); if (!n) return;
  const M = C.Matrix4.fromRotationTranslation(R || C.Matrix3.IDENTITY, t ? new C.Cartesian3(t[0], t[1], t[2]) : C.Cartesian3.ZERO, new C.Matrix4());
  if (s) C.Matrix4.multiplyByScale(M, new C.Cartesian3(s[0], s[1], s[2]), M);
  n.matrix = C.Matrix4.multiply(n.originalMatrix, M, new C.Matrix4());
}
// cada cuadro: LiDAR, alas, modo cangrejo, dron y taladro (los mismos movimientos que en la escena)
function miAnimPMR(dt) {
  const m = MI.mod.pmr, g = MI.g3; if (!m?.ready || !m.show) return;
  g.lidar += dt * 6; girarNodo(m, 'lidar', g.lidar, 'y');
  g.alas += (g.alasObj - g.alas) * Math.min(1, dt * 2.2); g.cang += (g.cangObj - g.cang) * Math.min(1, dt * 2.5);
  girarNodo(m, 'ala_0', -Math.PI * g.alas, 'x'); girarNodo(m, 'ala_1', Math.PI * g.alas, 'x');
  if (!MI.modo?.trip) for (let i = 0; i < 6; i++) girarNodo(m, `pata_${i}`, g.cang, 'y');
  const v = g.dron;
  if (v) {
    v.t += dt; const T = v.t, sv = x => x * x * (3 - 2 * x), tr = (a, b, f) => { f = sv(Math.min(1, Math.max(0, f))); return a.map((x, i) => x + (b[i] - x) * f); };
    const base = [0, 0, 0], alto = [0, 8, 0], lejos = [30, 7, 0];
    const p = T < 2 ? tr(base, alto, T / 2) : T < 5 ? tr(alto, lejos, (T - 2) / 3) : T < 9 ? [30 + Math.sin(T * 1.3) * 2 * Math.min(1, T - 5), 7, Math.cos(T * 1.3) * 2 * Math.min(1, T - 5)]
      : T < 12 ? tr(lejos, alto, (T - 9) / 3) : tr(alto, base, (T - 12) / 2);
    nodoTRS(m, 'dron', p.map(x => x / 0.8));
    girarNodo(m, 'rotor_0', T * 40, 'y'); girarNodo(m, 'rotor_1', -T * 40, 'y');
    if (T >= 14) { g.dron = null; nodoTRS(m, 'dron'); if (!MI.modo) miCard('PMR', lg('El dron volvió al techo', 'The drone is back on the roof'), lg('Miró el terreno 30 m adelante, a unos 10 m del suelo, como Ingenuity con Perseverance.', 'It looked at the ground 30 m ahead, about 10 m up, like Ingenuity did for Perseverance.'), [[lg('Listo', 'Done'), () => miCard(), true]]); }
  }
  const pf = g.perf;
  if (pf) {
    const f = Math.min(1, (performance.now() - pf.t0) / 10000), h = Math.max(0, (f - 0.1) / 0.9), k = Math.min(3, Math.floor(h * 4)), s = h * 4 - k;
    const baj = f < 0.1 ? (f / 0.1) * (f / 0.1) * (3 - 2 * f / 0.1) : 1, prof = 2 * h, cy = f < 0.1 ? 2.1 : 2.1 - 1.2 * s;
    const tope = cy - 0.34, guard = tope - 0.4, suelo = -0.62, abajo = guard + (suelo - prof - guard) * baj, L = Math.max(0.05, tope - abajo);
    nodoTRS(m, 'carro', [0, cy - 2.1, 0]); nodoTRS(m, 'sarta', [0, ((tope + abajo) / 2 - 1.56) / 0.4, 0], [1, L / 0.4, 1]); nodoTRS(m, 'mecha', [0, abajo - 1.36, 0]);
    for (let i = 0; i < 3; i++) { const nd = m.getNode(`barra_${i}`); if (nd) nd.show = i >= k; }
    $('miCtxt').textContent = f < 0.1 ? lg('La torre baja la mecha hasta el suelo…', 'The tower lowers the bit to the ground…') : lg(`Profundidad: ${miNum(prof, 2)} m de 2 m · ${k ? `barra ${k} de 3 acoplada` : 'solo la mecha'}. La tripulación lo maneja desde la cabina.`, `Depth: ${miNum(prof, 2)} m of 2 m · ${k ? `rod ${k} of 3 attached` : 'bit only'}. The crew runs it from the cabin.`);
    if (f >= 1) { g.perf = null; for (const n of ['carro', 'sarta', 'mecha']) nodoTRS(m, n); for (let i = 0; i < 3; i++) { const nd = m.getNode(`barra_${i}`); if (nd) nd.show = true; } pf.fin?.(); }
  }
}
// al empezar o dejar un recorrido, el dron vuelve al techo y el taladro se guarda (sus avisos no tapan los del recorrido)
function miPMRGuardar() {
  const g = MI.g3, m = MI.mod.pmr; g.dron = null; g.perf = null; if (!m?.ready) return;
  for (const n of ['dron', 'carro', 'sarta', 'mecha']) nodoTRS(m, n); for (let i = 0; i < 3; i++) { const nd = m.getNode(`barra_${i}`); if (nd) nd.show = true; }
}
function miPMRAccion(k) {
  const g = MI.g3; if (!MI.mod.pmr) return;
  if (k === 'alas') { if (MI.modo?.jugando) return; g.alasObj = g.alasObj ? 0 : 1; return; }
  if (k === 'cang') { if (MI.modo) return; g.cangObj = g.cangObj ? 0 : Math.PI / 2; return; }
  if (k === 'dron') { if (!g.dron) { g.dron = { t: 0 }; miCard('PMR', lg('Dron en el aire', 'Drone in the air'), lg('Sale del techo, sube 8 m y mira 30 m adelante (supuesto, como Ingenuity).', 'It takes off from the roof, climbs 8 m and looks 30 m ahead (assumption, like Ingenuity).'), []); } return; }
  if (k === 'perf' && !g.perf) {
    miCard(lg('Perforación profunda · simulación', 'Deep drilling · simulation'), lg('PMR · hasta 2 m', 'PMR · down to 2 m'), lg('La torre baja la mecha hasta el suelo…', 'The tower lowers the bit to the ground…'), []);
    g.perf = { t0: performance.now(), fin: () => miCard(lg('Perforación profunda · simulación', 'Deep drilling · simulation'), lg('Listo: muestras cada 50 cm hasta 2 m', 'Done: samples every 50 cm down to 2 m'),
      lg('Acá va acelerado: con el avance del taladro de Rosalind Franklin (0,3 a 30 mm por minuto) 2 m llevan entre ~1 h y ~111 h según el suelo (cálculo propio).', 'Sped up here: at the Rosalind Franklin drill\'s rate (0.3 to 30 mm per minute), 2 m take between ~1 h and ~111 h depending on the ground (our calculation).'), [[lg('Listo', 'Done'), () => miCard(), true]]) };
  }
}
// Vistas de cerca (base, PMR, paradas): Cesium sube la cámara si queda a menos de 20 m del terreno que tiene cargado justo
// debajo, y ahí (fuera de la vista) suele quedar una tesela gruesa que en Gale promedia el borde del cráter: la cámara salta
// cientos de metros. Mientras nadie toque el mapa se apaga ese empuje; vuelve con el primer clic, rueda, toque o tecla.
function miSinChoque() {
  const ctl = viewer.scene.screenSpaceCameraController; if (!ctl.enableCollisionDetection || MI.sinChoque) return;
  ctl.enableCollisionDetection = false; MI.sinChoque = true;
  const evs = ['pointerdown', 'wheel', 'touchstart'], volver = () => { ctl.enableCollisionDetection = true; MI.sinChoque = false; evs.forEach(e => viewer.canvas.removeEventListener(e, volver, true)); removeEventListener('keydown', volver, true); };
  evs.forEach(e => viewer.canvas.addEventListener(e, volver, true)); addEventListener('keydown', volver, true);
}
// la cámara apunta a donde está dibujado el modelo (si el terreno todavía no cargó su detalle, el modelo y la cámara usan la misma altura)
async function miVerPMR() {
  const g = MI.D.pmr, m = MI.mod.pmr; if (!g || !m || MI.modo) return;
  if (MI.hBase == null) { const b = MI.D.base; MI.hBase = await hMedida(b.lon, b.lat, b.elev); }
  miAparcarPMR(); const r = MI.pmrFuera ? MI.pmrFuera.rumbo : Math.PI / 2 - g.yaw, P = C.Matrix4.getTranslation(m.modelMatrix, new C.Cartesian3());
  const arriba = MARS.geodeticSurfaceNormal(P, new C.Cartesian3()); C.Cartesian3.add(P, C.Cartesian3.multiplyByScalar(arriba, 1.8, arriba), P);
  miSinChoque();
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(P, 5), { offset: new C.HeadingPitchRange(r + Math.PI - 0.75, -0.42, 30), duration: 2.2, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000 });
}
// luz del sol para los modelos: alta desde el noroeste, como el sombreado del relieve de Maps in Mars (SOL.az 315°)
function miLuz() {
  const c = MI.D.curiosity, enu = C.Transforms.eastNorthUpToFixedFrame(pos(c.lon, c.lat, 0), MARS), az = 315 * d2r, el = 48 * d2r;
  const s = C.Matrix4.multiplyByPointAsVector(enu, new C.Cartesian3(Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)), new C.Cartesian3());
  viewer.scene.light = new C.DirectionalLight({ direction: C.Cartesian3.negate(C.Cartesian3.normalize(s, s), new C.Cartesian3()), intensity: 2.2 });
}

// ---------- pines: círculo con borde #1b1210 de 3 px, aro claro, código corto y palito hasta el suelo (lámina de estilo) ----------
// Se dibujan al doble y se muestran a escala 0,5: 34 px de diámetro y 12 px de palito. Texto oscuro sobre colores claros y blanco sobre oscuros.
function miChip(texto, color, sel = false) {
  const k = 'chip' + texto + color + sel; if (iconos[k]) return iconos[k];
  const s = 2, d = sel ? 40 : 34, palo = 12, w = d + 6, c = document.createElement('canvas'); c.width = w * s; c.height = (d + palo + 6) * s;
  const x = c.getContext('2d'); x.scale(s, s); const cx = w / 2, cy = d / 2 + 3, r = d / 2;
  x.strokeStyle = '#1b1210'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy + r - 2); x.lineTo(cx, cy + r + palo); x.stroke();
  x.beginPath(); x.arc(cx, cy, r + 0.5, 0, 7); x.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,.35)'; x.lineWidth = sel ? 2.5 : 1; x.stroke();
  x.beginPath(); x.arc(cx, cy, r - 1.5, 0, 7); x.fillStyle = color; x.fill(); x.lineWidth = 3; x.strokeStyle = '#1b1210'; x.stroke();
  const rgb = parseInt(color.replace('#', '').slice(0, 6), 16), lum = ((rgb >> 16) * 0.299 + ((rgb >> 8) & 255) * 0.587 + (rgb & 255) * 0.114);
  const t = String(texto); x.fillStyle = lum > 150 ? '#1b1210' : '#fff'; x.font = `700 ${t.length > 2 ? 11 : 13}px system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, cy + 0.5);
  return iconos[k] = c;
}
function miCapa() {
  const D = MI.D, ds = MI.ds = new C.CustomDataSource('mision'); viewer.dataSources.add(ds);
  const cerca = new C.DistanceDisplayCondition(0, 70000);
  const pin = (texto, color, lon, lat, tipo, id, nombre) => ds.entities.add({
    position: pos(lon, lat), properties: { tipo, id, nombre, codigo: texto, color },
    billboard: { image: miChip(texto, color), scale: 0.5, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: cerca },
    label: { text: nombre, show: false, font: '600 13px system-ui', fillColor: C.Color.WHITE, style: C.LabelStyle.FILL,
      pixelOffset: new C.Cartesian2(0, 8), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, verticalOrigin: C.VerticalOrigin.TOP,
      showBackground: true, backgroundColor: C.Color.fromCssColorString('#202124').withAlpha(0.88), backgroundPadding: new C.Cartesian2(8, 5) } });
  const linea = (L, ancho, alfa, z) => {
    const ps = L.pts.map(p => pos(p[0], p[1])), col = C.Color.fromCssColorString(L.color);
    ds.entities.add({ properties: { tipo: 'mborde', id: L.id }, polyline: { positions: ps, width: ancho + 3, clampToGround: true, zIndex: z, material: C.Color.fromCssColorString('#1b1210').withAlpha(alfa * 0.55), distanceDisplayCondition: cerca } });
    return ds.entities.add({ properties: { tipo: 'mruta', id: L.id, nombre: miNomRuta(L) }, polyline: { positions: ps, width: ancho, clampToGround: true, zIndex: z + 1, material: col.withAlpha(alfa), distanceDisplayCondition: cerca } });
  };
  if (D.expedicion) for (const k of Object.keys(D.expedicion.lineas)) linea(MI.lineas['E-' + k], 3, 0.6, 1);
  for (const r of D.rutas) if (r.id !== 'C') MI.lineas[r.id].ent = linea(MI.lineas[r.id], r.id.startsWith('C-') ? 3 : 4.5, 0.95, r.id === 'B' ? 6 : 4);
  for (const p of D.paradas) pin(p.id, p.color, p.lon, p.lat, 'mparada', p.id, `${p.id} · ${miTr(p.nombre)}`);
  if (D.expedicion) for (const e of D.expedicion.paradas) pin(e.id, e.color, e.lon, e.lat, 'mparada', e.id, miTr(e.nombre));
  if (D.base) { const e = pin('BG', '#ffcf7a', D.base.lon, D.base.lat, 'mbase', 'base', lg('Base Gale · Zona 2', 'Gale Base · Zone 2')); e.billboard.distanceDisplayCondition = new C.DistanceDisplayCondition(380, 70000); }
}
// qué se ve de la capa de la misión: con "Recorrido nuevo" apagado, solo lo del recorrido que se está haciendo (y la base)
function miVisibles() {
  if (!MI.ds) return; const m = MI.modo, L = m?.L;
  const deRuta = new Set((L?.paradas || []).map(o => o.id)), rutas = new Set(L ? [L.id, ...(m.volver ? [m.volver.id] : [])] : []);
  for (const e of MI.ds.entities.values) {
    const pr = e.properties, tipo = pr?.tipo?.getValue?.(), id = pr?.id?.getValue?.();
    if (tipo === 'mbase') { e.show = !m || MI.verRec; continue; }
    if (/^g/.test(tipo || '')) { e.show = tipo === 'gtemp' ? !m : !!PMR.guia && (!m || !!m.guia || !!m.libre); continue; }
    if (m) e.show = tipo === 'mparada' ? deRuta.has(id) : rutas.has(id);
    else e.show = MI.verRec;
  }
}
// las 49 perforaciones de Maps in Mars con la misma forma de pin (el color sigue la opción "Color de los pozos" de Capas)
function miPozosEstilo() {
  if (typeof POZOS === 'undefined') return;
  const esc = new C.NearFarScalar(500, 1.1, 40000, 0.45);
  for (const p of POZOS) { const e = p.ent; if (!e?.billboard) continue;
    const yo = typeof sel !== 'undefined' && p === sel;
    e.billboard.image = miChip(p.n ?? '×', colorDe(p), yo); e.billboard.scale = 0.5; e.billboard.verticalOrigin = C.VerticalOrigin.BOTTOM; e.billboard.scaleByDistance = esc;
    if (e.label) { e.label.pixelOffset = new C.Cartesian2(14, -30); e.label.pixelOffsetScaleByDistance = esc; e.label.scaleByDistance = new C.NearFarScalar(500, 1, 40000, 0.7); } }
}
function miVerPozos(on) {
  if (typeof VIS !== 'undefined') VIS.pozos = on;
  if (typeof capas !== 'undefined') for (const e of capas.pozos) e.show = on;
  $('miIntPozos').setAttribute('aria-pressed', on);
  const chk = document.querySelector('#contenido [data-c="pozos"]'); if (chk) chk.checked = on;
}
async function miVerRecorrido(on) {
  MI.verRec = on; $('miIntRec').setAttribute('aria-pressed', on);
  if (on && !MI.D) await miCargar();
  miVisibles(); if (MI.fichaClave === 'hoy') fichaHoy();
}

// ---------- fichas en el panel de Maps in Mars ----------
function miFicha(titulo, html, botones = '', clave = '') {
  $('cajonTitulo').textContent = titulo; MI.fichaClave = clave;
  document.querySelectorAll('.rb[data-t]').forEach(b => b.classList.remove('on'));
  document.body.classList.toggle('mi-wiki-on', !!clave);
  cont().innerHTML = `<div class="mi-ficha">${html}${botones ? `<div class="mi-bts">${botones}</div>` : ''}</div>`;
  cont().scrollTop = 0; if (window.abrirCajon) abrirCajon();
  cont().querySelectorAll('[data-mi]').forEach(b => b.onclick = () => miAccion(b.dataset.mi, b.dataset));
}
const bt = (txt, accion, extra = '', pri = false) => `<button class="mib${pri ? ' pri' : ''}" data-mi="${accion}" ${extra}>${txt}</button>`;
const rutaDeParada = id => { const p = MI.paradas[id]; if (p?.expe) return 'E-' + (/astronauta/.test(p.quien) ? 'astronauta' : 'vehiculo');
  const cand = MI.D.rutas.filter(r => r.paradas.some(o => o.id === id)); return (cand.find(r => r.id === 'A' || r.id === 'B') || cand[0])?.id; };
const volverHoy = () => bt(lg('← Curiosity hoy', '← Curiosity today'), 'hoy');
function fichaParada(id) {
  const p = MI.paradas[id]; if (!p) return; const r = rutaDeParada(id), L = r && MI.lineas[r];
  miFicha(lg('Curiosity hoy', 'Curiosity today'), p.ficha, volverHoy() + bt(lg('Ver de cerca', 'Close-up'), 'ver', `data-id="${id}"`) + bt(lg('Perforación simulada', 'Simulated drilling'), 'muestra', `data-id="${id}"`)
    + (L ? bt(r.startsWith('E-') ? lg('Recorrer la expedición ▶', 'Follow the expedition ▶') : lg(`Recorrer la ruta ${r} ▶`, `Follow route ${r} ▶`), 'ruta', `data-r="${r}"`, true) : ''), 'parada-' + id);
  miSel(id);
}
function fichaBase(clave) {
  miFicha(lg('Base Gale', 'Gale Base'), MI.D.base.ficha, volverHoy() + (MI.D.pmr ? bt('PMR', 'pmr') : '') + bt(lg('Ver la base de cerca', 'Base close-up'), 'verbase', '', true), 'base');
  if (clave) { const d = cont().querySelector(`details[data-parte="${clave}"]`); if (d) d.open = true; }
}
function fichaPMR() {
  const g = MI.D.pmr; if (!g) return; const T = MI.lineas.T, C2 = MI.lineas.C, v = g.par?.velocidad_km_h || 10, bat = miBat();
  const tarj = (acc, tit, sub, extra = '') => `<div class="tarjeta" data-mi="${acc}" ${extra}><b>${tit}</b><div class="sub">${sub}</div></div>`;
  const usar = `<h2>${lg('Qué puede hacer', 'What it can do')}</h2>
    ${tarj('guia', lg('Guía recomendada · expedición completa', 'Recommended guide · full expedition'), lg('Sale del hábitat, para en seis perforaciones de Curiosity y en puntos intermedios (uno sale a pie y el otro queda en el PMR), termina junto a Curiosity hoy y vuelve.', 'Leaves the habitat, stops at six of Curiosity\'s drill holes and at points in between (one walks, the other stays in the PMR), ends next to Curiosity today and returns.'))}
    ${tarj('armar', lg('Armar mi guía', 'Build my own guide'), lg('Elegí las perforaciones y los puntos del mapa por donde pasar.', 'Pick the drill holes and map points to visit.'))}
    ${tarj('irpozo', lg('Ir a una perforación', 'Drive to a drill hole'), lg('Cualquiera de las 49: la ruta más segura desde donde está el PMR.', 'Any of the 49: the safest route from where the PMR is.'))}
    ${tarj('libre', lg('Manejo libre', 'Free drive'), lg('Lo manejás vos con W A S D o las flechas; avisa la pendiente y la arena.', 'You drive it with W A S D or the arrows; it warns about slope and sand.'))}
    ${T ? tarj('ruta', lg('Ruta T · de la base a la zona de hoy', 'Route T · from the base to today\'s area'), lg(`${miM(T.largo)}, sube ${miNum(T.sube)} m: ${miH(T.horas)} a ${v} km/h y ${miNum(T.kwh)} kWh (${miNum(T.kwh / bat * 100)} % de la batería). Cálculo propio.`, `${miM(T.largo)}, climbs ${miNum(T.sube)} m: ${miH(T.horas)} at ${v} km/h and ${miNum(T.kwh)} kWh (${miNum(T.kwh / bat * 100)} % of the battery). Our calculation.`), 'data-r="T"') : ''}
    ${C2 ? tarj('ruta', lg('Ruta C · en la zona de hoy, con caminatas', 'Route C · in today\'s area, with walks'), lg(`${miM(C2.largo)}; en ${Object.keys(MI.camDe).length} paradas uno sale por los suitports a caminar.`, `${miM(C2.largo)}; at ${Object.keys(MI.camDe).length} stops one goes out through the suitports.`), 'data-r="C"') : ''}`;
  const k = g.ficha.indexOf('<details'), html = k > 0 ? g.ficha.slice(0, k) + usar + `<h2>${lg('Cómo es', 'What it is like')}</h2>` + g.ficha.slice(k) : g.ficha + usar;
  miFicha('PMR', html, volverHoy() + bt(lg('Ver el PMR', 'See the PMR'), 'verpmr') + bt(lg('Alas', 'Wings'), 'g3', 'data-k="alas"') + bt(lg('Modo cangrejo', 'Crab mode'), 'g3', 'data-k="cang"') + bt(lg('Dron', 'Drone'), 'g3', 'data-k="dron"') + bt(lg('Perforar 2 m', 'Drill 2 m'), 'g3', 'data-k="perf"') + bt(lg('Guía recomendada ▶', 'Recommended guide ▶'), 'guia', '', true), 'pmr');
}
function fichaRover() {
  const gx = MI.rover === 'gx2';
  miFicha(lg('Curiosity hoy', 'Curiosity today'), gx ? MI.D.gx2 : `<h1 class="parada-cab"><span class="chip" style="background:#e5534b">MSL</span>${lg('Curiosity, sol 5070', 'Curiosity, sol 5070')}</h1>
    <p>${lg('El rover de la misión, donde está hoy (campaña Nazca). Es la salida (S) de las rutas A, B y C. Modelo a escala: 3 m de largo, seis ruedas de 50 cm con balancín.', 'The mission rover, where it is today (Nazca campaign). It is the start (S) of routes A, B and C. Scale model: 3 m long, six 50 cm wheels on a rocker-bogie.')}</p>
    <p class="sub">${lg('Elevación', 'Elevation')} ${miNum(MI.D.curiosity.elev)} m · ${MI.D.curiosity.lat.toFixed(5)}°, ${MI.D.curiosity.lon.toFixed(5)}° E</p>`,
    volverHoy() + bt(gx ? lg('Ver Curiosity', 'Show Curiosity') : lg('Ver el GX-2 (próximas excavaciones)', 'Show the GX-2 (next excavations)'), gx ? 'rvcur' : 'rvgx') + bt(lg('Rover · ruta A ▶', 'Rover · route A ▶'), 'ruta', 'data-r="A"', true), 'rover');
}
function fichaHoy() {
  const D = MI.D, L = MI.lineas, tarj = (id, txt, sub, accion = 'ruta') => `<div class="tarjeta" data-mi="${accion}" data-r="${id}"><b>${txt}</b><div class="sub">${sub}</div></div>`;
  const grupo = (tit, ids) => `<h2>${tit}</h2><div>${ids.map(id => MI.paradas[id]).filter(Boolean).map(p => `<span class="mi-pz" data-mi="parada" data-id="${p.id}"><span class="mi-pill" style="background:${p.color}">${p.id}</span>${miEsc(p.nombre)}</span>`).join('')}</div>`;
  const ex = D.expedicion, PR = D.parametros.PR;
  miFicha(lg('Curiosity hoy', 'Curiosity today'), `<p class="sub" style="margin-top:2px">${lg('La zona donde está Curiosity hoy (sol 5070), con las rutas que proponemos para el robot, para una persona y para el PMR, sobre el mismo terreno. Tocá un cartel en el mapa o elegí cómo recorrerla.', 'The area where Curiosity is today (sol 5070), with the routes we propose for the robot, for a person and for the PMR, on the same terrain. Tap a pin on the map or choose how to explore it.')}</p>
    ${MI.verRec ? '' : `<p class="sub">${lg('Las rutas y paradas están apagadas: prendelas arriba con «Nueva misión».', 'Routes and stops are hidden: turn them on at the top with "New mission".')}</p>`}
    <h2>${lg('Cómo recorrerla', 'How to explore it')}</h2>
    <div class="tarjeta" data-mi="ruta" data-r="pareja"><b>👥 ${lg('Misión en pareja', 'Two-person mission')}</b><div class="sub">${lg(`Uno camina con el visor del casco y el otro queda en el PMR, que es refugio y apoyo, con toda la información en su pantalla. Mensajes de la base y de la Tierra con la demora real de la luz. Ruta B, ${miM(L.B.largo3d || L.B.largo)}.`, `One walks with the helmet visor and the other stays in the PMR, which is shelter and support, with all the information on its screen. Messages from the base and from Earth with the real light delay. Route B, ${miM(L.B.largo3d || L.B.largo)}.`)}</div></div>
    ${tarj('A', lg('Rover · ruta A', 'Rover · route A'), lg(`${miM(L.A.largo)} · ${L.A.paradas.length} paradas · ${Math.ceil(L.A.largo / PR.porSol[1])}–${Math.ceil(L.A.largo / PR.porSol[0])} soles de manejo (calculado)`, `${miM(L.A.largo)} · ${L.A.paradas.length} stops · ${Math.ceil(L.A.largo / PR.porSol[1])}–${Math.ceil(L.A.largo / PR.porSol[0])} driving sols (calculated)`))}
    ${tarj('B', lg('A pie · ruta B', 'On foot · route B'), lg(`${miM(L.B.largo)} ida y vuelta · ${miH(L.B.horas)} de marcha · ${miNum(L.B.dosis, 1)} µSv (cálculo propio)`, `${miM(L.B.largo)} out and back · ${miH(L.B.horas)} walking · ${miNum(L.B.dosis, 1)} µSv (our calculation)`))}
    ${D.pmr ? `<div class="tarjeta" data-mi="pmr"><b>🚐 ${lg('PMR · rover presurizado', 'PMR · pressurized rover')}</b><div class="sub">${lg('Guía de la expedición (recomendada o armada por vos), ir a cualquiera de las 49 perforaciones o manejo libre. Sale de la Base Gale.', 'Expedition guide (recommended or your own), drive to any of the 49 drill holes, or free drive. It leaves from Gale Base.')}</div></div>` : ''}
    ${ex ? tarj('expe', lg('Expedición sur', 'Southern expedition'), lg(`Cinco puntos más allá de A4: rover ${miM(ex.lineas.vehiculo?.largo)} o a pie ${miM(ex.lineas.astronauta?.largo)}`, `Five points beyond A4: rover ${miM(ex.lineas.vehiculo?.largo)} or on foot ${miM(ex.lineas.astronauta?.largo)}`), 'expe') : ''}
    ${D.base ? `<div class="tarjeta" data-mi="base"><b>${lg('Base Gale · Zona 2', 'Gale Base · Zone 2')}</b><div class="sub">${lg(`En la llanura del aterrizaje, a ${miM(D.base.drec)} del recorrido y ${miM(D.base.dc)} de Curiosity hoy.`, `On the landing plain, ${miM(D.base.drec)} from the traverse and ${miM(D.base.dc)} from Curiosity today.`)}</div></div>` : ''}
    <div class="tarjeta" data-mi="rover"><b>${lg('Rover robótico: Curiosity o GX-2', 'Robotic rover: Curiosity or GX-2')}</b><div class="sub">${lg('El GX-2 es nuestra versión para las próximas excavaciones: taladro de 2 m, dron y alas solares.', 'The GX-2 is our version for the next excavations: 2 m drill, drone and solar wings.')}</div></div>
    ${grupo(lg('Paradas del robot (ruta A)', 'Robot stops (route A)'), ['S', 'A1', 'A2', 'A3', 'A4', 'Z1'])}${grupo(lg('Paradas a pie (ruta B)', 'Stops on foot (route B)'), ['B1', 'B2', 'Q1', 'M1'])}${grupo(lg('PMR (ruta C)', 'PMR (route C)'), ['C2', 'C3', 'C4', 'R1'])}
    ${ex ? grupo(lg('Expedición sur', 'Southern expedition'), ex.paradas.map(e => e.id)) : ''}
    <p class="sub" style="margin-top:14px">${lg('Rutas y paradas: cálculo propio sobre el terreno USGS de 1 m', 'Routes and stops: our calculation on the USGS 1 m terrain')} ${miFq('usgsOrto')}. ${lg('Lo supuesto está marcado como provisorio. La escena anterior sigue en', 'Assumptions are marked as provisional. The previous scene is still available as the')} <a href="../escena3d/index.html" style="color:var(--acento2)">${lg('versión clásica', 'classic version')}</a>.</p>`, '', 'hoy');
}
function miSel(id) {
  if (!MI.ds) return;
  for (const e of MI.ds.entities.values) if (e.billboard && e.properties?.id) { const yo = e.properties.id.getValue() === id; e.billboard.image = miChip(e.properties.codigo.getValue(), e.properties.color.getValue(), yo); e.label.show = yo; }
}
function miAccion(a, ds) {
  if (a === 'hoy') return fichaHoy();
  if (a === 'parada') { fichaParada(ds.id); return miVolarA(MI.paradas[ds.id], 420); }
  if (a === 'ver') return miVolarA(MI.paradas[ds.id], 260);
  if (a === 'muestra') { const p = MI.paradas[ds.id]; return miFicha(lg('Perforación simulada', 'Simulated drilling'), p.muestra, bt(lg('← Volver a la parada', '← Back to the stop'), 'parada', `data-id="${ds.id}"`), 'muestra-' + ds.id); }
  if (a === 'ruta') return ds.r === 'pareja' ? miModo('B', 'pareja') : ds.r === 'expe' ? miAccion('expe', ds) : miModo(ds.r);
  if (a === 'expe') return miCard(lg('Expedición sur', 'Southern expedition'), lg('¿Quién hace la expedición?', 'Who does the expedition?'), lg('Cinco puntos nuevos al sur de A4, elegidos con datos orbitales (sulfatos, arcilla, refugio, mirador y el frente sur).', 'Five new points south of A4, chosen with orbital data (sulfates, clay, shelter, viewpoint and the southern front).'),
    [[lg('Con el rover', 'With the rover'), () => miModo('E-vehiculo'), true], [lg('A pie', 'On foot'), () => miModo('E-astronauta')], [lg('Cancelar', 'Cancel'), () => miCard()]]);
  if (a === 'base') { fichaBase(); return miVerBase(); }
  if (a === 'verbase') return miVerBase();
  if (a === 'rover') return fichaRover();
  if (a === 'rvgx') { miRover('gx2'); return fichaRover(); }
  if (a === 'rvcur') { miRover('curiosity'); return fichaRover(); }
  if (a === 'pmr') { fichaPMR(); return miVerPMR(); }
  if (a === 'verpmr') return miVerPMR();
  if (a === 'g3') return miPMRAccion(ds.k);
  if (a === 'guia') return pmrGuiaRecomendada();
  if (a === 'armar') return pmrFichaArmar();
  if (a === 'irpozo') return pmrFichaIrPozo();
  if (a === 'libre') return pmrLibre();
  if (a === 'pozo') return pmrIrAPozo(+ds.n);
}
async function hMedida(lon, lat, elev) {      // la más precisa: la del terreno a máximo detalle (Maps in Mars: alturas)
  try { const h = await alturas([C.Cartographic.fromDegrees(lon, geodetica(lat))]); if (h && h[0] != null && isFinite(h[0])) return h[0] * (viewer.scene.verticalExaggeration || 1); } catch {}
  return alturaSuelo(lon, lat, elev);
}
async function miVolarA(p, rango = 420) {
  const h = await hMedida(p.lon, p.lat, p.elev); miSinChoque();
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(p.lon, p.lat, h), 20), { offset: new C.HeadingPitchRange(viewer.camera.heading, -0.55, rango), duration: 1.8, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000 });
}
async function miVerBase() {
  const b = MI.D.base, h = await hMedida(b.lon, b.lat, b.elev); miSinChoque();
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(b.lon, b.lat, h + 4), 40), { offset: new C.HeadingPitchRange(0.6, -0.42, 150), duration: 2.4, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000 });
}
function miRover(k) {
  MI.rover = k; try { localStorage.setItem('galeMisionRover', k); } catch {}
  document.querySelectorAll('#miBarra [data-rv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.rv === k));
  miQuieto(true);
}

// ---------- entrar y salir de "Curiosity hoy" ----------
function miVista(dur = 2.6) {
  const L = MI.lineas.A, c = MI.D.curiosity, fin = L.pts[L.pts.length - 1], lon = (c.lon + fin[0]) / 2, lat = (c.lat + fin[1]) / 2;
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(lon, lat, alturaSuelo(lon, lat, c.elev)), 700),
    { offset: new C.HeadingPitchRange(0.25, -0.62, 2300), duration: dur, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, pitchAdjustHeight: 1500000, maximumHeight: 4000000 });
}
async function miEntrar(abrirFicha = true) {
  MI.activo = true; document.body.classList.add('mi-activo');
  if (!MI.D) { miCard(lg('Curiosity hoy', 'Curiosity today'), lg('Preparando la misión…', 'Preparing the mission…'), lg('Paradas, rutas, base, rover y astronauta.', 'Stops, routes, base, rover and astronaut.'), []); viewer.camera.flyTo({ destination: pos(HOY[0], HOY[1] - 0.06, 9000), orientation: { heading: 0, pitch: -0.6, roll: 0 }, duration: 2.4, pitchAdjustHeight: 1500000 }); }
  if (!(await miCargar())) { miCard(); return; }
  miCard(); if (MI.modo) miSalirModo(false);
  miVista(); miQuieto(true);
  miMostrar('miBarra', true); miRover(MI.rover);
  if (abrirFicha) fichaHoy();
}
// los orbitadores y las lunas de Maps in Mars se ven siempre (sin profundidad): cerca del suelo tapan la vista y se guardan
function miOrbitas(ver) {
  if (MI.orbVer === ver) return; MI.orbVer = ver;
  for (const e of viewer.entities.values) { const t = e.properties?.tipo?.getValue?.(); if (t === 'orbitador' || t === 'luna') { if (!ver) { e._miShow = e.show; e.show = false; } else if (e._miShow != null) { e.show = e._miShow; e._miShow = null; } } }
}
function miDejar() {        // otro destino del globo: se guarda la barra (lo de la misión queda en el mapa)
  if (MI.modo) miSalirModo(false);
  MI.activo = false; document.body.classList.remove('mi-activo'); miMostrar('miBarra', false); miCard(); miOrbitas(true);
}
// quieto: rover robótico (Curiosity o GX-2) y astronauta en la salida; el PMR en la base (o donde quedó)
function miQuieto(forzar) {
  if (!MI.D || MI.modo) return;
  const c = MI.D.curiosity, rumbo = Math.PI / 2 - c.yaw, rv = MI.mod[MI.rover], otro = MI.mod[MI.rover === 'gx2' ? 'curiosity' : 'gx2'];
  if (otro) otro.show = false;
  if (rv) { rv.show = true; colocar(rv, c.lon, c.lat, rumbo, c.elev, MI.rover === 'gx2' ? 3.4 : 2.2, 2.5, true); }
  const a = MI.mod.astronauta; if (a) { a.show = true; const [lo, la] = corrido(c.lon, c.lat, -Math.cos(rumbo) * 3.2, Math.sin(rumbo) * 3.2); colocar(a, lo, la, rumbo, c.elev, 0, 0, false); if (a.ready) pasoAstro(a, 0, 0); }
  if (MI.mod.a2) MI.mod.a2.show = false;
  if (MI.mod.base_gale) MI.mod.base_gale.show = true;
  miAparcarPMR();
}

// ---------- tarjeta de arriba ----------
function miCard(et, tit, txt, botones = []) {
  if (!et) return miMostrar('miCard', false);
  $('miCet').textContent = et; $('miCtit').innerHTML = tit; $('miCtxt').innerHTML = txt || '';
  const c = $('miCbts'); c.innerHTML = '';
  for (const [t, fn, pri] of botones) { const b = document.createElement('button'); b.className = 'mib' + (pri ? ' pri' : ''); b.textContent = t; b.onclick = fn; c.appendChild(b); }
  miMostrar('miCard', true);
}

// ---------- recorridos: rover, a pie, PMR, expedición, misión en pareja y tramos de la guía ----------
// Pantallas: el que camina ve el visor del casco (#miHud); el que queda en el PMR ve todo en la pantalla de la cabina (#miPantalla).
const esRover = L => /vehiculo|tripulado/.test(L.tipo);
function miModo(id, tipo = 'ruta', opc = {}) {
  const L = MI.lineas[id]; if (!L) return;
  if (MI.modo) miSalirModo(false);
  miPMRGuardar();
  const pareja = tipo === 'pareja', guia = tipo === 'guia', rover = esRover(L), trip = L.tipo === 'tripulado';
  const hud = !rover && (pareja || guia || /^C-cam/.test(id)), pant = pareja || trip || hud;
  MI.modo = { L, id, tipo, d: Math.min(L.largo, opc.d || 0), jugando: false, mov: 0, rueda: 0, vista: hud ? 'ojos' : 'detras', rover, trip, hud, pant, guia,
    vistos: new Set(), dosisAviso: 0, fin: false, volver: opc.volver || null };
  MI.siguiendo = false; if (window.cerrarCajon) cerrarCajon();
  const cl = document.body.classList; cl.add('mi-modo'); cl.toggle('mi-pareja', pareja); cl.toggle('mi-hud', hud); cl.toggle('mi-pant', pant); cl.toggle('mi-casco', hud);
  viewer.entities.show = false; miVisibles();
  viewer.scene.screenSpaceCameraController.enableInputs = false;
  miMostrar('miBarra', false);
  const color = L.color || '#f28c38', G = guia && PMR.guia;
  $('miPid').textContent = pareja ? '👥' : guia ? String(G.i + 1) : id.startsWith('E-') ? 'E' : id.startsWith('C-') ? 'C' : id; $('miPid').style.background = color;
  $('miPnomR').textContent = pareja ? lg('Misión en pareja · ruta B', 'Two-person mission · route B') : miNomRuta(L);
  const np = (L.paradas || []).length;
  $('miPsub').textContent = guia ? lg(`tramo ${G.i + 1} de ${G.tramos.length} · ${miM(L.largo)}`, `leg ${G.i + 1} of ${G.tramos.length} · ${miM(L.largo)}`)
    : `${miM(L.largo)}${L.idaVuelta ? lg(' ida y vuelta', ' out and back') : ''}${np ? lg(` · ${np} parada${np === 1 ? '' : 's'}`, ` · ${np} stop${np === 1 ? '' : 's'}`) : id === 'T' ? lg(' · Base Gale → zona de hoy', ' · Gale Base → today\'s area') : ''}`;
  $('miL1').textContent = trip ? lg('tiempo de manejo', 'driving time') : rover ? lg('horas de manejo', 'driving hours') : lg('tiempo de marcha', 'walking time');
  $('miL4').textContent = trip ? lg('batería', 'battery') : rover ? lg('soles de manejo', 'driving sols') : lg('dosis acumulada', 'accumulated dose');
  $('miVistas').classList.toggle('oculto', rover && !trip); $('miVistas').querySelector('[data-v=ojos]').textContent = trip ? lg('Cabina', 'Cabin') : hud ? lg('Visor', 'Visor') : lg('Ojos', 'Eyes');
  if (trip) { MI.g3.alasObj = 0; MI.g3.cangObj = 0; miTrajes(2); }
  document.querySelectorAll('#miVistas [data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === MI.modo.vista));
  $('miPlayB').textContent = lg('▶ Salir', '▶ Go'); $('miParar').checked = MI.parar; $('miDur').value = String(MI.dur);
  for (const k of ['curiosity', 'gx2', 'astronauta', 'a2', 'pmr']) if (MI.mod[k]) MI.mod[k].show = false;
  // a pie siempre hay un PMR cerca: queda estacionado donde empieza la caminata, con un traje menos en la pared de atrás
  if (!rover && (id === 'B' || /^C-cam/.test(id) || guia)) { miPMREnSalida(L); if (guia) L.pmr = MI.pmrSalida; miTrajes(1); }
  if (pant) miPantEntrar(L);
  miMostrar('miPlay', true);
  miActualizar(0, true);
  // vuelo hasta la salida y, al llegar, la tarjeta "Listos para salir" (nada se mueve solo)
  const d0 = MI.modo.d, q0 = enLinea(L, d0), q1 = enLinea(L, Math.min(L.largo, d0 + 4)), rumbo = rumboDe(q0, q1); MI.cam = { h: rumbo, p: rover ? -0.24 : -0.2, r: trip ? 22 : rover ? 15 : 7.5 };
  const enBase = MI.D.base && trip && Math.hypot((q0.lon - MI.D.base.lon) * Math.cos(q0.lat * d2r), q0.lat - MI.D.base.lat) * M_GRADO < 27;
  const hs = enBase ? (MI.hBase ?? alturaSuelo(MI.D.base.lon, MI.D.base.lat, MI.D.base.elev)) + (MI.D.base.alto_plataforma || 0) : alturaSuelo(q0.lon, q0.lat, q0.elev), P = pos(q0.lon, q0.lat, hs + (hud ? 1.7 : trip ? 1.8 : 1.2));
  let hecho = false; const listo = () => { if (hecho || MI.modo?.L !== L) return; hecho = true; MI.siguiendo = true; if (opc.seguir) { miCard(); miJugar(true); } else miListos(); };
  const lejos = C.Cartesian3.distance(viewer.camera.positionWC, P) > 3000, dur = lejos ? 2.6 : 1.4;
  if (MI.modo.vista === 'ojos') viewer.camera.flyTo({ destination: P, orientation: { heading: rumbo, pitch: -0.08, roll: 0 }, duration: dur, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000, complete: listo, cancel: listo });
  else viewer.camera.flyToBoundingSphere(new C.BoundingSphere(P, 1), { offset: new C.HeadingPitchRange(rumbo, MI.cam.p, MI.cam.r), duration: dur, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000, complete: listo, cancel: listo });
}
function miListos() {
  const m = MI.modo; if (!m || m.jugando || m.d > 0.5) return; const L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, n = (L.paradas || []).length;
  if (m.guia) return pmrListos(m);
  const v3 = MI.D.pmr?.par?.velocidad_km_h || 10, bat = miBat(), durT = $('miDur').selectedOptions[0].text;
  const txt = m.trip ? lg(`${m.id === 'T' ? 'Sale del garaje de la Base Gale con dos personas adentro y va hasta la zona de hoy, donde está Curiosity: ' : ''}${miM(L.largo)}${n ? `, ${n} paradas` : ''}${L.sube ? `, sube ${miNum(L.sube)} m` : ''}. A ${v3} km/h (supuesto, como el SEV) son ${miH(L.horas)} de manejo y ${miNum(L.kwh)} kWh, el ${miNum(L.kwh / bat * 100)} % de la batería (cálculo propio). Acá lo ves en ${durT}.`,
      `${m.id === 'T' ? 'It leaves the Gale Base garage with two people inside and drives to today\'s area, where Curiosity is: ' : ''}${miM(L.largo)}${n ? `, ${n} stops` : ''}${L.sube ? `, climbs ${miNum(L.sube)} m` : ''}. At ${v3} km/h (assumption, like the SEV) that is ${miH(L.horas)} of driving and ${miNum(L.kwh)} kWh, ${miNum(L.kwh / bat * 100)} % of the battery (our calculation). Here you see it in ${durT}.`)
    : m.tipo === 'pareja' ? lg(`Llegaron en el PMR. El Astronauta 1 sale por un suitport con el visor del casco; el Astronauta 2 queda en la cabina y sigue todo en la pantalla del PMR. Ruta B, ${miM(L.largo3d || L.largo)} ida y vuelta, ${n} paradas. Salida nominal de ${EVA.nom} h (máximo ${EVA.max} h, traje xEMU).`,
      `They arrived in the PMR. Astronaut 1 goes out through a suitport with the helmet visor; Astronaut 2 stays in the cabin and follows everything on the PMR screen. Route B, ${miM(L.largo3d || L.largo)} out and back, ${n} stops. Nominal EVA ${EVA.nom} h (maximum ${EVA.max} h, xEMU suit).`)
    : m.rover ? lg(`${miNomRuta(L)}: ${miM(L.largo)}, ${n} paradas. Al ritmo de Curiosity (${PR.porSol[0]}–${PR.porSol[1]} m por sol de manejo) serían ${Math.ceil(L.largo / PR.porSol[1])}–${Math.ceil(L.largo / PR.porSol[0])} soles (calculado). Acá lo ves en ${durT}.`,
      `${miNomRuta(L)}: ${miM(L.largo)}, ${n} stops. At Curiosity's pace (${PR.porSol[0]}–${PR.porSol[1]} m per driving sol) that would be ${Math.ceil(L.largo / PR.porSol[1])}–${Math.ceil(L.largo / PR.porSol[0])} sols (calculated). Here you see it in ${durT}.`)
    : lg(`${miNomRuta(L)}: ${miM(L.largo)}, ${miH(L.horas ?? enLinea(L, L.largo).t)} de marcha y ${miNum(L.dosis ?? enLinea(L, L.largo).dosis, 1)} µSv de dosis (cálculo propio). Acá lo ves en ${durT}.`,
      `${miNomRuta(L)}: ${miM(L.largo)}, ${miH(L.horas ?? enLinea(L, L.largo).t)} walking and ${miNum(L.dosis ?? enLinea(L, L.largo).dosis, 1)} µSv of dose (our calculation). Here you see it in ${durT}.`);
  const extra = m.volver ? lg(' Al terminar vuelven al PMR.', ' When done they return to the PMR.') : !m.trip && /^C-cam/.test(m.id) ? lg(' Sale por los suitports del PMR.', ' Goes out through the PMR suitports.') : '';
  miCard(m.tipo === 'pareja' ? lg('Base Gale · listos para salir', 'Gale Base · ready to go') : m.trip ? lg('PMR · listos para salir', 'PMR · ready to go') : lg('Listos para salir', 'Ready to go'),
    m.tipo === 'pareja' ? lg('Misión en pareja', 'Two-person mission') : miEsc(miNomRuta(L)), txt + extra,
    [[lg('▶ Salir', '▶ Go'), () => miJugar(true), true], [lg('Cambiar ruta', 'Change route'), () => miSalirModo(true)]]);
}
function miJugar(on) {
  const m = MI.modo; if (!m || m.libre) return;
  if (on && m.d >= m.L.largo - 0.5) { m.d = 0; m.vistos.clear(); m.dosisAviso = 0; m.fin = false; if (!m.guia) $('miMsgs').innerHTML = ''; }
  m.jugando = on; $('miPlayB').textContent = on ? lg('❚❚ Pausa', '❚❚ Pause') : lg('▶ Seguir', '▶ Resume');
  if (on) miCard();
}
function miSalirModo(volver = true) {
  const m = MI.modo; if (!m) return;
  if (m.libre) pmrLibreFin(); else if (m.guia) pmrGuiaDejar(m);
  MI.modo = null; MI.siguiendo = false;
  viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  viewer.scene.screenSpaceCameraController.enableInputs = true;
  document.body.classList.remove('mi-modo', 'mi-pareja', 'mi-hud', 'mi-pant', 'mi-casco', 'mi-manejo', 'mi-pant-abierta'); $('cajon').classList.remove('mi-libre');
  viewer.entities.show = true; miVisibles(); if (MI.fov0) { viewer.camera.frustum.fov = MI.fov0; } MI.cam.pj = null;
  miMostrar('miPlay', false); $('miHud').classList.add('oculto'); $('miPantalla').classList.add('oculto');
  miCard();
  if (volver) { if (m.guia || m.libre) pmrVistaFinal(); else miVista(2); miMostrar('miBarra', true); }
  miQuieto(true);
}
// cada cuadro: avanza, apoya los modelos, mueve la cámara y actualiza los datos
function miTick(dt) {
  try { miAnimPMR(dt); } catch (e) { console.warn('[PMR]', e); }
  const m = MI.modo;
  if (!m) { if (MI.activo && (MI.quieto = (MI.quieto + 1) % 30) === 0) { miQuieto(); miOrbitas(viewer.camera.positionCartographic.height > 300000); } return; }
  if (m.libre) return pmrLibreTick(dt);
  const L = m.L;
  if (m.jugando) {
    const d0 = m.d; m.d = Math.min(L.largo, m.d + L.largo * dt / MI.dur);
    const st = (MI.parar || m.guia) ? (L.paradas || []).find(o => o.d > d0 + 0.01 && o.d <= m.d && o.d > 12) : null;
    if (st) { m.d = st.d; miJugar(false); miLlegada(st.id); }
    else if (m.d >= L.largo) { miJugar(false); miFin(); }
  }
  miActualizar(dt);
}
function miActualizar(dt, inicio = false) {
  const m = MI.modo, L = m.L, q = enLinea(L, m.d), qa = enLinea(L, Math.max(0, m.d - 2)), qb = enLinea(L, Math.min(L.largo, m.d + 2));
  const rumbo = rumboDe(qa.d < qb.d ? qa : q, qb.d > qa.d ? qb : q);
  m.mov += ((m.jugando && m.d < L.largo ? 1 : 0) - m.mov) * Math.min(1, dt * 6);
  let objetivo;
  if (m.trip) {
    // sobre la plataforma de la base va a la altura de la plataforma, sin inclinar
    const b = MI.D.base, enPlat = b && Math.hypot((q.lon - b.lon) * Math.cos(b.lat * d2r), q.lat - b.lat) * M_GRADO < 27;
    const alza = enPlat ? Math.max(0, (MI.hBase ?? alturaSuelo(b.lon, b.lat, b.elev)) + (b.alto_plataforma || 0) - alturaSuelo(q.lon, q.lat, q.elev)) : 0;
    const rv = MI.mod.pmr; if (rv) { rv.show = true; objetivo = colocar(rv, q.lon, q.lat, rumbo, q.elev, 4.0, 3.2, !enPlat, alza); m.pmrEn = { lon: q.lon, lat: q.lat, rumbo, elev: q.elev };
      if (rv.ready) { for (let i = 0; i < 12; i++) girarNodo(rv, `rueda_${i}`, -m.d / 0.5); for (let i = 0; i < 6; i++) girarNodo(rv, `pata_${i}`, 0, 'y'); } }
  } else if (m.rover) {
    const rv = MI.mod[MI.rover]; if (rv) { rv.show = true; objetivo = colocar(rv, q.lon, q.lat, rumbo, q.elev, MI.rover === 'gx2' ? 3.4 : 2.2, 2.5, true);
      m.rueda = m.d; const R = MI.rover === 'gx2' ? 0.4 : 0.25; if (rv.ready) for (let i = 0; i < 6; i++) girarNodo(rv, `rueda_${i}`, -m.rueda / R); }
  } else {
    const a = MI.mod.astronauta; if (a) { a.show = m.vista !== 'ojos'; const c = colocar(a, q.lon, q.lat, rumbo, q.elev, 0, 0, false); objetivo = c; if (a.show) pasoAstro(a, m.d / MI.D.parametros.zancada * Math.PI * 2, m.mov, Math.atan2(qb.elev - qa.elev, 4)); }
    else objetivo = pos(q.lon, q.lat, alturaSuelo(q.lon, q.lat, q.elev));
  }
  if (MI.siguiendo && objetivo) miCamara(dt, objetivo, rumbo, m);
  // datos de la barra
  const PR = MI.D.parametros.PR;
  $('miD1').textContent = m.rover && !m.trip ? `${miNum(m.d / PR.vRover, 1)} h` : miH(q.t);
  $('miD2').textContent = miM(m.d);
  $('miD3').textContent = `${miNum(q.marcha || q.terr, 1)}°`; $('miC3').classList.toggle('alerta', (q.marcha || 0) > (m.rover ? PR.rMax : PR.pMax));
  $('miD4').textContent = m.trip ? `${miNum(100 - ((m.guia ? PMR.guia.kwh0 : 0) + (q.kwh || 0)) / miBat() * 100)} %` : m.rover ? `${miNum(m.d / PR.porSol[1], 0)}–${miNum(m.d / PR.porSol[0], 0)}` : `${miNum(q.dosis, 1)} µSv`;
  if (!m.arrastrando) $('miBar').value = Math.round(m.d / L.largo * 1000);
  if (m.hud) miHudAct(q, rumbo);
  if (m.pant) miPantAct(q);
}
const _arriba = new C.Cartesian3();
function miCamara(dt, objetivo, rumbo, m) {
  const cam = viewer.camera, k = Math.min(1, dt * 2.4);
  MI.cam.h += angDif(rumbo - MI.cam.h) * k;
  if (m.vista === 'ojos') {
    MARS.geodeticSurfaceNormal(objetivo, _arriba);
    const ojo = C.Cartesian3.add(objetivo, C.Cartesian3.multiplyByScalar(_arriba, m.trip ? 2.2 : 1.7, new C.Cartesian3()), new C.Cartesian3());
    // cabina: justo delante del parabrisas (desde adentro el vidrio taparía la vista)
    if (m.trip) { const { F } = miMarco(objetivo, rumbo); C.Cartesian3.add(ojo, C.Cartesian3.multiplyByScalar(F, 3.05, new C.Cartesian3()), ojo); }
    // la mirada sigue la pendiente de lo que viene (8 m adelante), con un campo visual más abierto, como un casco
    const q = m.libre ? null : enLinea(m.L, m.d), qa = q && enLinea(m.L, Math.min(m.L.largo, m.d + 8)), pObj = q ? Math.max(-0.35, Math.min(0.3, Math.atan2(qa.elev - q.elev, 8) - 0.06)) : -0.08;
    MI.cam.pj = (MI.cam.pj ?? pObj) + (pObj - (MI.cam.pj ?? pObj)) * Math.min(1, dt * 1.5);
    if (cam.frustum.fov !== MI.fovOjos) { MI.fov0 = MI.fov0 ?? cam.frustum.fov; cam.frustum.fov = MI.fovOjos; }
    cam.lookAtTransform(C.Matrix4.IDENTITY); cam.setView({ destination: ojo, orientation: { heading: MI.cam.h, pitch: MI.cam.pj, roll: 0 } });
    return;
  }
  if (MI.fov0 && cam.frustum.fov !== MI.fov0) cam.frustum.fov = MI.fov0;
  MARS.geodeticSurfaceNormal(objetivo, _arriba);
  const T = C.Cartesian3.add(objetivo, C.Cartesian3.multiplyByScalar(_arriba, m.trip ? 2.0 : m.rover ? 1.4 : 1.1, new C.Cartesian3()), new C.Cartesian3());
  cam.lookAt(T, new C.HeadingPitchRange(MI.cam.h, MI.cam.p, MI.cam.r));
  // que la cámara no se meta en el terreno: si queda baja, mira más desde arriba
  const cg = cam.positionCartographic, suelo = alturaSuelo(C.Math.toDegrees(cg.longitude), C.Math.toDegrees(Math.atan(Math.tan(cg.latitude) * (B * B) / (A * A))), null);
  const pDef = m.rover ? -0.24 : -0.2;
  if (cg.height < suelo + 1.6) MI.cam.p = Math.max(-1.2, MI.cam.p - 0.04); else MI.cam.p += (pDef - MI.cam.p) * Math.min(1, dt * 0.6);
}
function miLlegada(id) {
  const m = MI.modo; if (m?.guia) return pmrLlegada(m, id);
  const p = MI.paradas[id]; if (!p) return;
  const cam = m?.trip ? MI.camDe[id] : null, seguir = () => { $('cajon').classList.remove('mi-libre'); if (window.cerrarCajon) cerrarCajon(); miJugar(true); };
  const perf = m?.trip ? [lg('Perforar 2 m (PMR)', 'Drill 2 m (PMR)'), () => { miPMRAccion('perf'); const fin = MI.g3.perf?.fin; if (MI.g3.perf) MI.g3.perf.fin = () => { fin?.(); miAccion('muestra', { id }); $('cajon').classList.add('mi-libre'); miLlegada(id); }; }]
    : [lg('Perforación simulada', 'Simulated drilling'), () => { miAccion('muestra', { id }); $('cajon').classList.add('mi-libre'); }];
  const mot = miTr(p.motivo || '');
  miCard(m?.trip ? lg('El PMR llegó a la parada', 'The PMR reached the stop') : lg('Llegaste a la parada', 'You reached the stop'), `<span class="mi-pill" style="background:${p.color}">${p.id}</span>${miEsc(miTr(p.nombre))}`,
    miEsc(mot.slice(0, 170)) + (mot.length > 170 ? '…' : '') + (cam ? lg(' Desde acá sale una caminata: uno se pone el traje en el suitport en menos de 10 minutos y el otro queda en la cabina.', ' A walk starts here: one crew member suits up through the suitport in under 10 minutes and the other stays in the cabin.') : ''),
    [[lg('Ver la parada', 'See the stop'), () => { fichaParada(id); $('cajon').classList.add('mi-libre'); }], perf, ...(cam ? [[lg('Salir a caminar ▶', 'Go for a walk ▶'), () => miModo(cam, 'ruta', { volver: { id: m.id, d: m.d } }), true]] : []), [lg('Seguir ▶', 'Continue ▶'), seguir, !cam]]);
  if (m?.hud) { miMsg('a1', lg(`Llegué a ${p.id} · ${miEsc(miTr(p.nombre))}.`, `I'm at ${p.id} · ${miEsc(miTr(p.nombre))}.`)); setTimeout(() => MI.modo && miMsg('a2', lg('Recibido desde el PMR. Fotografiá la capa y tomá la muestra; yo vigilo el tiempo y la dosis.', 'Copy from the PMR. Photograph the layer and take the sample; I\'m watching time and dose.')), 1200); }
}
function miFin() {
  const m = MI.modo; m.fin = true; const q = enLinea(m.L, m.L.largo);
  if (m.guia) return pmrFinTramo(m);
  const volverHoyB = [lg('Volver a Curiosity hoy', 'Back to Curiosity today'), () => miSalirModo(true)];
  if (m.id === 'T') return miCard(lg('Llegaste a la zona de hoy', 'You reached today\'s area'), lg('PMR junto a Curiosity', 'PMR next to Curiosity'), lg(`${miM(m.L.largo)} desde la Base Gale en ${miH(m.L.horas)} de manejo, con ${miNum(m.L.kwh)} kWh (${miNum(m.L.kwh / miBat() * 100)} % de la batería). Ahora la ruta C, con caminatas por los suitports.`, `${miM(m.L.largo)} from Gale Base in ${miH(m.L.horas)} of driving, using ${miNum(m.L.kwh)} kWh (${miNum(m.L.kwh / miBat() * 100)} % of the battery). Next, route C, with walks through the suitports.`),
    [[lg('Seguir con la ruta C ▶', 'Continue with route C ▶'), () => miModo('C'), true], volverHoyB]);
  if (m.volver) { const v = m.volver; return miCard(lg('De vuelta en el PMR', 'Back in the PMR'), miEsc(miNomRuta(m.L)), lg(`${miH(q.t)} de caminata y ${miNum(q.dosis, 1)} µSv (cálculo propio). Entra por el suitport y siguen en la cabina.`, `${miH(q.t)} walking and ${miNum(q.dosis, 1)} µSv (our calculation). Back in through the suitport; they continue in the cabin.`),
    [[lg('Seguir con la ruta C ▶', 'Continue with route C ▶'), () => miModo(v.id, 'ruta', { d: v.d + 1, seguir: true }), true], volverHoyB]); }
  const rep = [lg('Repetir', 'Repeat'), () => miJugar(true)];
  if (m.trip) return miCard(lg('Fin del recorrido', 'End of the route'), miEsc(miNomRuta(m.L)), lg(`${miM(m.L.largo)} en ${miH(m.L.horas)} de manejo, ${miNum(m.L.kwh)} kWh (${miNum(m.L.kwh / miBat() * 100)} % de la batería). Cálculo propio.`, `${miM(m.L.largo)} in ${miH(m.L.horas)} of driving, ${miNum(m.L.kwh)} kWh (${miNum(m.L.kwh / miBat() * 100)} % of the battery). Our calculation.`), [rep, [volverHoyB[0], volverHoyB[1], true]]);
  miCard(lg('Fin del recorrido', 'End of the route'), miEsc(m.tipo === 'pareja' ? lg('De vuelta en el PMR', 'Back in the PMR') : miNomRuta(m.L)),
    m.rover ? lg(`${miM(m.L.largo)} en ${miNum(m.L.largo / MI.D.parametros.PR.porSol[1], 0)}–${miNum(m.L.largo / MI.D.parametros.PR.porSol[0], 0)} soles de manejo (calculado).`, `${miM(m.L.largo)} in ${miNum(m.L.largo / MI.D.parametros.PR.porSol[1], 0)}–${miNum(m.L.largo / MI.D.parametros.PR.porSol[0], 0)} driving sols (calculated).`)
      : lg(`${miH(q.t)} de marcha y ${miNum(q.dosis, 1)} µSv (cálculo propio).`, `${miH(q.t)} walking and ${miNum(q.dosis, 1)} µSv (our calculation).`), [rep, [volverHoyB[0], volverHoyB[1], true]]);
  if (m.tipo === 'pareja') { miMsg('a1', lg('De vuelta en el PMR.', 'Back in the PMR.')); miMsg('base', lg(`Salida cerrada: ${miH(q.t)}, ${miNum(q.dosis, 1)} µSv.`, `EVA closed: ${miH(q.t)}, ${miNum(q.dosis, 1)} µSv.`)); }
}
// controles de la barra
$('miPlayB').onclick = () => MI.modo && miJugar(!MI.modo.jugando);
$('miSalir').onclick = () => miSalirModo(true);
$('miParar').onchange = e => { MI.parar = e.target.checked; };
$('miDur').onchange = e => { MI.dur = +e.target.value; try { localStorage.setItem('galeMisionDur', MI.dur); } catch {} };
$('miBar').addEventListener('input', e => { const m = MI.modo; if (!m || m.libre) return; m.arrastrando = true; if (m.jugando) miJugar(false); m.d = +e.target.value / 1000 * m.L.largo; m.vistos.clear(); });
$('miBar').addEventListener('change', () => { if (MI.modo) MI.modo.arrastrando = false; });
document.querySelectorAll('#miVistas [data-v]').forEach(b => b.onclick = () => { const m = MI.modo; if (!m) return; m.vista = b.dataset.v;
  document.querySelectorAll('#miVistas [data-v]').forEach(o => o.setAttribute('aria-pressed', o === b)); if (m.vista !== 'ojos') viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  document.body.classList.toggle('mi-casco', m.hud && m.vista === 'ojos'); });
document.querySelectorAll('#miBarra [data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m;
  if (k === 'pareja') return miModo('B', 'pareja'); if (k === 'A' || k === 'B') return miModo(k); if (k === 'info') return fichaHoy(); miAccion(k, {}); });
document.querySelectorAll('#miBarra [data-rv]').forEach(b => b.onclick = () => miRover(b.dataset.rv));

// ---------- visor del casco y pantalla del PMR ----------
function demoraLuz(fecha) {      // posiciones aproximadas de los planetas (JPL, elementos de Standish, 1800–2050), como en la escena
  const T = (fecha.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525, r = Math.PI / 180;
  const p = ([a, e, I, L, w, O], [da, de, dI, dL, dw, dO]) => {
    a += da * T; e += de * T; I = (I + dI * T) * r; L += dL * T; w += dw * T; O += dO * T;
    const M = (((L - w) % 360 + 540) % 360 - 180) * r, om = (w - O) * r, Or = O * r;
    let E = M + e * Math.sin(M); for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E), co = Math.cos(om), so = Math.sin(om), cO = Math.cos(Or), sO = Math.sin(Or), cI = Math.cos(I), sI = Math.sin(I);
    return [(co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp, (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp, so * sI * xp + co * sI * yp];
  };
  const t = p([1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]);
  const m = p([1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]);
  return Math.hypot(m[0] - t[0], m[1] - t[1], m[2] - t[2]) * 149597870.7 / 299792.458 / 60;
}
const MSG_DE = () => ({ base: lg('Base Gale', 'Gale Base'), tierra: lg('Control en la Tierra', 'Mission control on Earth'), a1: lg('Astronauta 1 · a pie', 'Astronaut 1 · on foot'), a2: lg('Astronauta 2 · PMR', 'Astronaut 2 · PMR') });
function miMsg(de, txt, extra = '') {
  const m = MI.modo; if (!m || !MI.par) return;
  const t = m.libre ? m.t : m.guia ? PMR.guia.t0 + enLinea(m.L, m.d).t : enLinea(m.L, m.d).t, li = document.createElement('li');
  li.className = de + (extra ? ' ' + extra : '');
  li.innerHTML = `<b>${MSG_DE()[de]}<i>${miT(t)}${de === 'tierra' ? lg(` · enviado hace ${miNum(MI.par.demora)} min`, ` · sent ${miNum(MI.par.demora)} min ago`) : ''}</i></b>${txt}`;
  const U = $('miMsgs'); U.appendChild(li); while (U.children.length > 40) U.firstChild.remove(); U.scrollTop = U.scrollHeight;
  if (de !== 'a1') { const h = $('miHMsg'); h.innerHTML = txt.replace(/<a[^>]*>\?<\/a>/g, ''); h.classList.toggle('al', extra === 'alerta'); }
}
const estacion = ls => MI.D.estaciones.find(e => ls >= e.de && ls < e.a) || MI.D.estaciones[0];
function miPantEntrar(L) {
  const m = MI.modo, nuevo = !m.guia || !MI.par || PMR.guia?.i === 0 && !PMR.guia.msgs;
  if (nuevo) { let ls = 0; try { ls = lsMarte(new Date()).ls; } catch {} MI.par = { demora: demoraLuz(new Date()), ls, ultMapa: 0 }; $('miMsgs').innerHTML = ''; if (m.guia) PMR.guia.msgs = true; }
  $('miPantalla').classList.remove('oculto'); $('miHud').classList.toggle('oculto', !m.hud);
  $('miHTit').textContent = lg('VISOR · ASTRONAUTA 1', 'VISOR · ASTRONAUT 1');
  $('miPQuien').textContent = m.hud ? lg('Astronauta 2 · cabina', 'Astronaut 2 · cabin') : lg('A1 y A2 · cabina', 'A1 and A2 · cabin');
  $('miDemora').innerHTML = `${lg('Tierra↔Marte', 'Earth↔Mars')} ${miNum(MI.par.demora)} min ${miFq('jplApprox')}`;
  $('miHMsg').textContent = '—';
  const EVA = MI.D.parametros.EVA, n = (L.paradas || []).length;
  if (m.guia) return;              // los mensajes de cada tramo los pone la guía
  if (m.tipo === 'pareja') {
    miMsg('base', lg(`Salida autorizada. Ruta B, ${miM(L.largo3d || L.largo)} ida y vuelta, ${n} parada${n === 1 ? '' : 's'}. Salida nominal de ${EVA.nom} h (máximo ${EVA.max} h, traje xEMU). El PMR queda como refugio a menos de ${EVA.refugio} min.`,
      `EVA authorized. Route B, ${miM(L.largo3d || L.largo)} out and back, ${n} stop${n === 1 ? '' : 's'}. Nominal EVA ${EVA.nom} h (maximum ${EVA.max} h, xEMU suit). The PMR stays as shelter less than ${EVA.refugio} min away.`));
    miMsg('a2', lg('Pantalla del PMR en línea. Veo tu posición, la pendiente y la dosis; te aviso cualquier cosa.', 'PMR screen online. I can see your position, slope and dose; I\'ll warn you about anything.'));
    const e0 = estacion(MI.par.ls); setTimeout(() => { if (MI.modo?.tipo === 'pareja') miMsg('tierra', lg(`Pronóstico de la temporada (Ls ${miNum(MI.par.ls)}°, ${e0.nombre}): ${e0.lineas[0][0]} ${miFq(e0.lineas[0][1])}`, `Seasonal forecast (Ls ${miNum(MI.par.ls)}°, ${miTr(e0.nombre)}): ${miTr(e0.lineas[0][0])} ${miFq(e0.lineas[0][1])}`)); }, 2500);
  } else if (m.trip) miMsg('base', lg(`Salida del PMR autorizada: ${miM(L.largo)}, unas ${miH(L.horas)} de manejo. Mantengan la pendiente bajo ${MI.D.parametros.PR.rMax}°.`, `PMR departure authorized: ${miM(L.largo)}, about ${miH(L.horas)} of driving. Keep the slope under ${MI.D.parametros.PR.rMax}°.`));
  else miMsg('base', lg(`Caminata autorizada: ${miM(L.largo)}. El PMR queda estacionado como refugio.`, `Walk authorized: ${miM(L.largo)}. The PMR stays parked as shelter.`));
}
const miDist = (a, b, c, d) => Math.hypot((c - a) * Math.cos(b * d2r), d - b) * M_GRADO;
// tiempo hasta el refugio. A pie: volver al PMR por la misma ruta (al paso de llano). En el PMR: hasta el hábitat en línea recta a la velocidad del PMR.
function miRefugio(m, q) {
  const PR = MI.D.parametros.PR;
  if (!m.rover && !m.libre) { const dv = m.L.idaVuelta || m.guia ? Math.min(m.d, m.L.largo - m.d) : m.d; return { d: dv, min: dv / PR.vCam / 60, aPie: true }; }
  const b = MI.D.base, dv = miDist(q.lon, q.lat, b.lon, b.lat); return { d: dv, min: dv / miVPMR() * 60, aPie: false };
}
function miHudAct(q, rumbo) {
  const m = MI.modo, L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA;
  $('miReloj').textContent = miT(q.t);
  const prox = (L.paradas || []).find(o => o.d > m.d + 3), pp = prox && (MI.paradas[prox.id] || PMR.guia?.parada);
  let ang, txt;
  if (pp) { ang = Math.atan2((pp.lon - q.lon) * Math.cos(q.lat * d2r), pp.lat - q.lat) - MI.cam.h; txt = `${miEsc(pp.codigo || pp.id)} · ${miM(prox.d - m.d)}`; }
  else { const p0 = L.pts[L.pts.length - 1]; ang = Math.atan2((p0[0] - q.lon) * Math.cos(q.lat * d2r), p0[1] - q.lat) - MI.cam.h; const f = L.largo - m.d; txt = f < 5 ? lg('en el PMR', 'at the PMR') : `PMR · ${miM(f)}`; }
  $('miHFlecha').style.transform = `rotate(${ang}rad)`; $('miHProx').innerHTML = txt;
  const hp = $('miHPend'); hp.textContent = `${miNum(q.marcha, 1)}° / ${PR.pMax}°`; hp.classList.toggle('al', q.marcha > PR.pMax);
  const Lm = q.min >= 0 ? MI.D.minerales[q.min] : null;
  $('miHMin').textContent = Lm ? miTr(Lm[0][0]) : q.terreno === -2 ? lg('arena probable', 'probable sand') : q.terreno === -3 ? lg('suelo firme', 'firm ground') : miTr(MI.D.terrenos[q.terreno] || '—');
  $('miHDosis').textContent = `${miNum(q.dosis, 1)} µSv`; $('miHCielo').textContent = `${miNum(q.cielo * 100)} %`;
  const r = miRefugio(m, q), al = r.min > EVA.refugio;
  $('miHRefD').textContent = miM(r.d); const ht = $('miHRefT'); ht.textContent = `${miNum(r.min)} min`; ht.classList.toggle('al', al);
}
function miPantAct(q) {
  const m = MI.modo, L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, G = m.guia ? PMR.guia : null;
  const r = miRefugio(m, q), dTot = G ? G.dosis0 + q.dosis : q.dosis, tTot = G ? G.t0 + q.t : q.t;
  const celda = (val, et, al = false) => `<div class="${al ? 'alerta' : ''}"><b>${val}</b><span>${et}</span></div>`;
  const tramo = G ? G.tramos[G.i] : null;
  $('miPTramo').innerHTML = G ? `<b>${lg(`Tramo ${G.i + 1} de ${G.tramos.length}`, `Leg ${G.i + 1} of ${G.tramos.length}`)} · ${miEsc(tramo.titulo)}</b><div class="sub">${tramo.seguro}</div>`
    : `<b>${miEsc(m.tipo === 'pareja' ? lg('Misión en pareja · ruta B', 'Two-person mission · route B') : miNomRuta(L))}</b><div class="sub">${m.rover ? lg('Ruta más segura para el vehículo: pendiente ≤ 20°, evita arena.', 'Safest route for the vehicle: slope ≤ 20°, avoids sand.') : lg('Ruta más segura a pie: pendiente ≤ 20° (traje) y sombra del relieve.', 'Safest route on foot: slope ≤ 20° (suit) and terrain shade.')}</div>`;
  const kwh = (G ? G.kwh0 : 0) + (q.kwh || 0), bat = 100 - kwh / miBat() * 100;
  $('miPRej').innerHTML = m.rover
    ? celda(`${miNum(q.marcha || q.terr, 1)}°`, lg('pendiente', 'slope'), (q.marcha || 0) > PR.rMax) + celda(`${miNum(dTot, 1)} µSv`, lg('dosis acumulada', 'accumulated dose'))
      + celda(`${miNum(r.min)} min`, lg(`al hábitat · ${miM(r.d)}`, `to habitat · ${miM(r.d)}`)) + celda(`${miNum(bat)} %`, lg('batería', 'battery'), bat < 30)
      + celda(`${miM(m.d)} / ${miM(L.largo)}`, lg('tramo', 'leg')) + celda(miT(tTot), lg('reloj de la misión', 'mission clock'))
    : celda(`${miNum(q.marcha, 1)}°`, lg('pendiente · A1', 'slope · A1'), q.marcha > PR.pMax) + celda(`${miNum(dTot, 1)} µSv`, lg('dosis acumulada', 'accumulated dose'))
      + celda(`${miNum(r.min)} min`, lg(`al PMR · ${miM(r.d)}`, `to PMR · ${miM(r.d)}`), r.min > EVA.refugio) + celda(`${miH(q.t)} / ${EVA.nom} h`, lg('tiempo afuera', 'time outside'), q.t > EVA.nom * 0.75)
      + celda(`${miNum(q.cielo * 100)} %`, lg('cielo tapado', 'sky blocked')) + celda(`${miNum(bat)} %`, lg('batería PMR', 'PMR battery'), bat < 30);
  const prox = (L.paradas || []).find(o => o.d > m.d - 2), pp = G ? G.parada : prox && MI.paradas[prox.id];
  const mot = G ? tramo.motivo : pp ? `<b>${miEsc(pp.id)} · ${miEsc(miTr(pp.nombre))}</b> — ${miEsc(miTr(pp.motivo || ''))}` : '';
  const pm = $('miPMot'); pm.classList.toggle('oculto', !mot); if (pm._t !== mot) { pm._t = mot; pm.innerHTML = `<span class="motT">${lg('Motivo científico', 'Science reason')}</span> ${mot}`; }
  if (m.jugando) miAvisos(q, r);
  if (performance.now() - MI.par.ultMapa > 250) { MI.par.ultMapa = performance.now(); miMapa(q); }
}
// avisos: cada uno una sola vez por lugar
function miAvisos(q, r) {
  const m = MI.modo, L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA;
  const una = (k, f) => { if (!m.vistos.has(k)) { m.vistos.add(k); f(); } };
  const lim = m.rover ? PR.rMax : PR.pMax, quien = m.rover ? 'a2' : 'a2';
  for (const o of L.paradas || []) { const p = MI.paradas[o.id] || (m.guia && PMR.guia.parada); if (!p) continue;
    if (m.d >= o.d - 45 && m.d < o.d - 6) una('cerca' + o.id, () => miMsg('base', lg(`A 45 m de ${miEsc(p.codigo || p.id)} · ${miEsc(miTr(p.nombre))}.`, `45 m from ${miEsc(p.codigo || p.id)} · ${miEsc(miTr(p.nombre))}.`))); }
  for (let s = 8; s <= 40; s += 4) { const qq = enLinea(L, Math.min(L.largo, m.d + s));
    if ((qq.marcha || 0) > lim) { una('pend' + Math.round((m.d + s) / 40), () => miMsg(quien, lg(`Pendiente de ${miNum(qq.marcha)}° a ${s} m (límite ${lim}°). ${m.rover ? 'Bajo la velocidad.' : 'Pasá despacio.'}`, `Slope of ${miNum(qq.marcha)}° in ${s} m (limit ${lim}°). ${m.rover ? 'Slowing down.' : 'Go slowly.'}`), 'alerta')); break; } }
  const G = m.guia ? PMR.guia : null, dTot = G ? G.dosis0 + q.dosis : q.dosis, paso = m.rover ? 50 : 10;
  if (dTot >= m.dosisAviso + paso) { m.dosisAviso = Math.floor(dTot / paso) * paso; miMsg('base', lg(`Dosis acumulada: ${miNum(dTot, 1)} µSv (${miNum(dTot / (PR.dosis * 10), 1)} % de lo que se recibe en un día en la superficie). Dentro del PMR es casi la misma: sus paredes no paran los rayos cósmicos.`, `Accumulated dose: ${miNum(dTot, 1)} µSv (${miNum(dTot / (PR.dosis * 10), 1)} % of what one receives in a day on the surface). Inside the PMR it is almost the same: its walls do not stop cosmic rays.`) + ` ${miFq('hassler')}${miFq('blindajeRover')}`); }
  if (!m.rover) {
    if (q.cielo > 0.2) una('reparo' + Math.round(m.d / 120), () => miMsg('a2', lg(`Buen reparo ahí: el relieve tapa el ${miNum(q.cielo * 100)} % del cielo.`, `Good shelter there: the terrain blocks ${miNum(q.cielo * 100)} % of the sky.`)));
    if (r.min > EVA.refugio) una('lejos' + Math.round(m.d / 200), () => miMsg('a2', lg(`Estás a ${miNum(r.min)} min del PMR: más de ${EVA.refugio} min. No te alejes más sin avisar.`, `You are ${miNum(r.min)} min from the PMR: more than ${EVA.refugio} min. Don't go further without telling me.`), 'alerta'));
    const fr = q.t / EVA.nom;
    if (fr >= 0.5) una('mitad', () => miMsg('base', lg(`Van ${miH(q.t)} afuera: la mitad de la salida nominal.`, `${miH(q.t)} outside: half of the nominal EVA.`)));
    if (fr >= 0.75) una('tresc', () => miMsg('base', lg(`Van ${miH(q.t)} afuera. Empezá a volver: el regreso más la reserva de ${EVA.reserva} min tiene que entrar en ${EVA.nom} h.`, `${miH(q.t)} outside. Start heading back: the return plus the ${EVA.reserva} min reserve has to fit within ${EVA.nom} h.`), 'alerta'));
  } else if (m.trip) {
    const bat = 100 - ((G ? G.kwh0 : 0) + (q.kwh || 0)) / miBat() * 100;
    if (bat < 30) una('bat30', () => miMsg('base', lg(`Batería al ${miNum(bat)} %. Planifiquen la vuelta o desplieguen las alas solares en la próxima parada.`, `Battery at ${miNum(bat)} %. Plan the return or deploy the solar wings at the next stop.`), 'alerta'));
  }
}
// minimapa de la pantalla del PMR: la guía entera tenue, el tramo actual fuerte, la base, las paradas, el PMR y el que camina
function miMapa(q) {
  const m = MI.modo, cv = $('miMapa'), g = cv.getContext('2d'), W = cv.width, H = cv.height, G = m.guia ? PMR.guia : null;
  const L = m.L, pmr = m.libre ? m.pmrEn : m.rover ? null : (L.pmr || MI.pmrSalida);
  const lineas = G ? G.tramos.map(t => t.L) : [L];
  const caja = m.libre ? (() => { const r = 900 / M_GRADO; return [q.lon - r / Math.cos(q.lat * d2r), q.lon + r / Math.cos(q.lat * d2r), q.lat - r, q.lat + r]; })()
    : (L._caja || (L._caja = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of L.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const mg = 40 / M_GRADO; return [x0 - mg, x1 + mg, y0 - mg, y1 + mg]; })()));
  const [x0, x1, y0, y1] = caja, cl = Math.cos(y0 * d2r), e = Math.min((W - 40) / Math.max(1e-9, (x1 - x0) * cl), (H - 40) / Math.max(1e-9, y1 - y0));
  const X = x => 20 + (x - x0) * cl * e + ((W - 40) - (x1 - x0) * cl * e) / 2, Y = y => 20 + (y1 - y) * e + ((H - 40) - (y1 - y0) * e) / 2;
  g.clearRect(0, 0, W, H);
  // relieve de fondo: pendiente del terreno del PMR (si está cargado), gris claro = empinado
  if (PMR.T) { const ox = ((W - 40) - (x1 - x0) * cl * e) / 2, oy = ((H - 40) - (y1 - y0) * e) / 2;
    pmrFondo(g, W, H, x0 - (20 + ox) / (cl * e), x0 + (W - 20 - ox) / (cl * e), y1 - (H - 20 - oy) / e, y1 + (20 + oy) / e, L.id); }
  const trazo = (pts, col, an, hasta = Infinity) => { g.strokeStyle = col; g.lineWidth = an; g.beginPath(); let k = 0; for (const p of pts) { if (p[2] > hasta) break; k++ ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); } g.stroke(); };
  g.lineJoin = g.lineCap = 'round';
  for (const Lx of lineas) if (Lx !== L) trazo(Lx.pts, Lx.color + '55', 3);
  trazo(L.pts, '#1b1210', 8); trazo(L.pts, (L.color || '#7fdcff') + '99', 5); trazo(L.pts, L.color || '#7fdcff', 6, m.libre ? -1 : m.d);
  g.font = '700 19px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chip = (x, y, t, col, r = 13) => { g.fillStyle = col; g.strokeStyle = '#1b1210'; g.lineWidth = 3; g.beginPath(); g.arc(X(x), Y(y), r, 0, 7); g.fill(); g.stroke();
    const rgb = parseInt(col.slice(1, 7), 16), lum = (rgb >> 16) * 0.299 + ((rgb >> 8) & 255) * 0.587 + (rgb & 255) * 0.114; g.fillStyle = lum > 150 ? '#1b1210' : '#fff'; g.fillText(t, X(x), Y(y) + 1); };
  const b = MI.D.base; if (b) chip(b.lon, b.lat, 'BG', '#ffcf7a', 15);
  if (G) for (const p of G.paradas) chip(p.lon, p.lat, p.codigo, p.color, 12);
  else for (const o of L.paradas || []) { const p = MI.paradas[o.id]; if (p) chip(p.lon, p.lat, o.id, p.color, 12); }
  if (pmr) chip(pmr.lon, pmr.lat, 'P', '#b06bff', 12);
  chip(q.lon, q.lat, m.rover || m.libre ? 'P' : '1', m.rover || m.libre ? '#b06bff' : '#ff8a3d', 14);
}
// En el celular el reproductor cambia de alto según cuántas filas ocupa: la pantalla del PMR se apoya siempre encima.
try { new ResizeObserver(() => document.body.style.setProperty('--miPlayH', $('miPlay').offsetHeight + 'px')).observe($('miPlay')); } catch (e) {}
$('miPantalla').addEventListener('click', e => {
  const b = e.target.closest('[data-r]'), m = MI.modo; if (!b || !m) return;
  const q = m.libre ? m.q : enLinea(m.L, m.d), r = miRefugio(m, q), b0 = MI.D.base, dB = miDist(q.lon, q.lat, b0.lon, b0.lat);
  if (b.dataset.r === 'llegamos') { miMsg(m.rover || m.libre ? 'a2' : 'a1', lg('Llegamos al punto. Empezamos la tarea.', 'We are at the point. Starting the task.')); setTimeout(() => miMsg('base', lg(`Recibido. Están a ${miM(dB)} del hábitat en línea recta.`, `Copy. You are ${miM(dB)} from the habitat in a straight line.`)), 900); }
  if (b.dataset.r === 'pronostico') { miMsg('a2', lg('Pedimos el pronóstico a la Tierra.', 'Asking Earth for the forecast.')); const e0 = estacion(MI.par.ls), l = e0.lineas[1] || e0.lineas[0];
    setTimeout(() => miMsg('tierra', lg(`${l[0]} ${miFq(l[1])} En la realidad esta respuesta tarda ${miNum(MI.par.demora * 2)} min (ida y vuelta). Con Aeolus (2028) habría pronóstico del día ${miFq('aeolus')}.`, `${miTr(l[0])} ${miFq(l[1])} In reality this answer takes ${miNum(MI.par.demora * 2)} min (round trip). With Aeolus (2028) there would be a daily forecast ${miFq('aeolus')}.`)), 2200); }
  if (b.dataset.r === 'ayuda') { miMsg(m.rover || m.libre ? 'a2' : 'a1', lg('Necesitamos ayuda.', 'We need help.'), 'alerta');
    setTimeout(() => m.rover || m.libre ? miMsg('base', lg(`Desde la base sale el otro vehículo: ${miM(dB)}, unos ${miNum(Math.max(1, dB / miVPMR() * 60))} min a ${miNum(miVPMR() / 1000)} km/h (supuesto: el SEV prevé dos vehículos que se rescatan entre sí). Quédense en la cabina.`, `The other vehicle leaves the base: ${miM(dB)}, about ${miNum(Math.max(1, dB / miVPMR() * 60))} min at ${miNum(miVPMR() / 1000)} km/h (assumption: the SEV concept uses two vehicles that rescue each other). Stay in the cabin.`), 'alerta')
      : miMsg('a2', lg(`Voy con el PMR hasta vos: ${miM(r.d)}, unos ${miNum(Math.max(1, r.d / miVPMR() * 60))} min. Buscá reparo del relieve mientras tanto.`, `I'm driving the PMR to you: ${miM(r.d)}, about ${miNum(Math.max(1, r.d / miVPMR() * 60))} min. Find terrain shelter meanwhile.`), 'alerta'), 1100); }
});

// ---------- puntero: mano y realce sobre todo lo que se puede tocar (pines de Maps in Mars y de la misión) ----------
{
  const h = new C.ScreenSpaceEventHandler(viewer.canvas); let pend = null, prev = null;
  const tip = $('miTip');
  const realce = (e, on) => { if (!e || !e.billboard) return; if (on) { e._esc = e.billboard.scale?.getValue?.() ?? 1; e.billboard.scale = e._esc * 1.18; } else if (e._esc != null) { e.billboard.scale = e._esc; e._esc = null; } };
  const MOD = () => ({ curiosity: 'Curiosity · sol 5070', gx2: lg('Rover GX-2 · próximas excavaciones', 'GX-2 rover · next excavations'), astronauta: lg('Astronauta', 'Astronaut'), a2: lg('Astronauta 2', 'Astronaut 2'), base_gale: lg('Base Gale · Zona 2', 'Gale Base · Zone 2'), pmr: lg('PMR · rover presurizado', 'PMR · pressurized rover') });
  h.setInputAction(m => {
    pend = m.endPosition; if (pend._raf) return;
    requestAnimationFrame(() => {
      const p = pend; if (!p || MI.modo?.vista === 'ojos') return;
      let o; try { o = viewer.scene.pick(p); } catch { o = null; }
      const ent = o && o.id instanceof C.Entity && o.id.properties && o.id.properties.tipo ? o.id : null, mod = o && o.id && o.id.mision ? o.id.mision : null;
      if (ent !== prev) { realce(prev, false); realce(ent, true); prev = ent; }
      viewer.canvas.style.cursor = ent || mod || PMR.marcar ? 'pointer' : '';
      let t = null;
      if (PMR.marcar) t = lg('Tocá para agregar este punto a tu guía', 'Tap to add this point to your guide');
      else if (ent) { const pr = ent.properties, tipo = pr.tipo.getValue(), nom = pr.nombre?.getValue?.() ?? ent.label?.text?.getValue?.() ?? ent.name;
        t = nom ? `${miEsc(nom)}<small>${tipo === 'mruta' ? lg('Tocá para recorrerla', 'Tap to follow it') : lg('Tocá para ver la ficha', 'Tap to see the card')}</small>` : null; }
      else if (mod) t = MOD()[mod] + `<small>${lg('Tocá para ver la ficha', 'Tap to see the card')}</small>`;
      if (t) { tip.innerHTML = t; tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px'; tip.classList.remove('oculto'); } else tip.classList.add('oculto');
    });
  }, C.ScreenSpaceEventType.MOUSE_MOVE);
  viewer.canvas.addEventListener('mouseleave', () => tip.classList.add('oculto'));
}
// clic: primero la misión; si no es de la misión, lo de siempre de Maps in Mars
{
  const ss = viewer.screenSpaceEventHandler, previo = ss.getInputAction(C.ScreenSpaceEventType.LEFT_CLICK);
  ss.setInputAction(m => {
    if (PMR.marcar && !MI.modo) { const c = viewer.scene.pickPosition(m.position) || viewer.camera.pickEllipsoid(m.position, MARS); if (c) { const g = MARS.cartesianToCartographic(c); pmrMarcado(C.Math.toDegrees(g.longitude), centrica(C.Math.toDegrees(g.latitude))); } return; }
    let o; try { o = viewer.scene.pick(m.position); } catch { o = null; }
    if (o && o.id instanceof C.Entity && o.id.properties?.tipo) {
      const tipo = o.id.properties.tipo.getValue(), id = o.id.properties.id?.getValue?.();
      if (MI.modo && tipo !== 'mparada' && tipo !== 'gparada') return;
      if (tipo === 'mparada') { $('miTip').classList.add('oculto'); if (MI.modo) { $('cajon').classList.add('mi-libre'); fichaParada(id); } else { if (!MI.activo) miEntrar(false); fichaParada(id); } return; }
      if (tipo === 'gparada') { if (MI.modo) $('cajon').classList.add('mi-libre'); return pmrFichaParada(+id); }
      if (tipo === 'mbase') { fichaBase(); return; }
      if (tipo === 'mruta') { if (MI.lineas[id]) return miModo(id); return; }
    }
    if (o && o.id && o.id.mision) { const k = o.id.mision; if (k === 'base_gale') return fichaBase(); if (k === 'pmr') { if (!MI.activo) miEntrar(false); return fichaPMR(); } if (k === 'curiosity' || k === 'gx2') return fichaRover(); return; }
    if (MI.modo) return;
    if (previo) previo(m);
  }, C.ScreenSpaceEventType.LEFT_CLICK);
}
// latitud geodética del elipsoide de Cesium → planetocéntrica (la del proyecto)
function centrica(latg) { return C.Math.toDegrees(Math.atan(Math.tan(latg * d2r) * (B * B) / (A * A))); }

// ---------- Wiki (antes "Biblioteca"): mismo contenido, con la opción de abrirla en otra pantalla ----------
{
  const rb = document.querySelector('.rb[data-t="biblioteca"]');
  if (rb) { for (const n of rb.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = 'Wiki'; rb.title = lg('Wiki: toda la información guardada', 'Wiki: all the stored information'); }
  $('cerrarCajon').insertAdjacentHTML('beforebegin', `<button id="miOtra" title="${lg('Abrir en otra pantalla (pestaña nueva), para leer sin el mapa', 'Open in another screen (new tab), to read without the map')}" aria-label="${lg('Abrir en otra pantalla', 'Open in another screen')}"><svg class="i" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></button>`);
  const cab = $('cajonCab'); if (cab && getComputedStyle(cab).display !== 'flex') cab.style.display = 'flex';
  $('miOtra').onclick = () => {
    const est = pestaña === 'biblioteca' && !MI.fichaClave ? 'bib:' + BIB.vista + ':' + (BIB.pozo ?? '') : MI.fichaClave ? 'mi:' + MI.fichaClave : 'bib:inicio:';
    window.open(location.pathname + '?wiki=' + encodeURIComponent(est), '_blank', 'noopener');
  };
  const abrir0 = abrir;
  abrir = function (t, mostrar = true) {
    MI.fichaClave = null; abrir0(t, mostrar);
    if (t === 'biblioteca') $('cajonTitulo').textContent = 'Wiki';
    document.body.classList.toggle('mi-wiki-on', t === 'biblioteca');
  };
  // en la Wiki dice "Wiki" donde decía "Biblioteca"
  const aWiki = () => { const w = document.createTreeWalker(cont(), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/Biblioteca|Library/.test(n.nodeValue) && n.parentElement?.closest('button,h2')) n.nodeValue = n.nodeValue.replace(/\bBiblioteca\b|\bLibrary\b/, 'Wiki'); };
  const vb0 = vistaBiblioteca;
  vistaBiblioteca = function () { vb0(); aWiki(); if (pestaña === 'biblioteca') document.body.classList.add('mi-wiki-on'); };
  // portada de la Wiki: también lo de la misión (paradas, PMR, base y la guía de la expedición)
  const bi0 = bibInicio;
  bibInicio = function () {
    bi0();
    const t = (k, tit, sub, col, ic) => `<div class="tarjeta bibt" data-miwiki="${k}"><span class="bibic" style="background:${col}">${ic}</span><b>${tit}</b><div class="sub">${sub}</div></div>`;
    cont().insertAdjacentHTML('beforeend', `<h2>${lg('Misión: nuestra propuesta', 'Mission: our proposal')}</h2>
      ${t('hoy', lg('Curiosity hoy: rutas y paradas', 'Curiosity today: routes and stops'), lg('Rutas A, B y C, expedición sur y por qué paramos en cada lugar.', 'Routes A, B and C, the southern expedition and why we stop at each place.'), '#e5534b', 'MSL')}
      ${t('pmr', lg('PMR · rover presurizado', 'PMR · pressurized rover'), lg('El vehículo para dos personas, refugio móvil: partes, energía y fuentes.', 'The two-person vehicle, a mobile shelter: parts, energy and sources.'), '#b06bff', 'PMR')}
      ${t('guia', lg('Guía de la expedición', 'Expedition guide'), lg('Las paradas recomendadas, qué se hace a pie en cada una y cómo se calcula la ruta más segura.', 'The recommended stops, what is done on foot at each one and how the safest route is computed.'), '#e0703a', 'G')}
      ${t('base', lg('Base Gale', 'Gale Base'), lg('El hábitat en la Zona 2 de la llanura del aterrizaje.', 'The habitat in Zone 2 of the landing plain.'), '#ffcf7a', 'BG')}`);
    cont().querySelectorAll('[data-miwiki]').forEach(b => b.onclick = () => miWiki(b.dataset.miwiki));
    aWiki();
  };
}
async function miWiki(clave) {
  if (!(await miCargar())) return;
  const [k, x] = clave.split(/-(.+)/);
  if (k === 'hoy') fichaHoy(); else if (k === 'pmr') fichaPMR(); else if (k === 'base') fichaBase(); else if (k === 'rover') fichaRover(); else if (k === 'guia') pmrFichaGuia();
  else if (k === 'parada') fichaParada(x); else if (k === 'muestra') miAccion('muestra', { id: x }); else fichaHoy();
}

// ---------- enganches con Maps in Mars: un solo mapa ----------
{
  // "Misión Curiosity" ya no abre otra página: entra a Curiosity hoy en este mismo globo
  const b = $('bMision'); if (b) { b.removeAttribute('href'); b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.title = lg('Misión Curiosity en este mapa: paradas, rutas, Base Gale, PMR, rover, astronauta y misión en pareja', 'Curiosity mission on this map: stops, routes, Gale Base, PMR, rover, astronaut and two-person mission');
    const s = b.querySelector('span'); if (s) s.innerHTML = lg('<b>Misión Curiosity</b><small>Rutas, base y PMR · en este mapa</small>', '<b>Curiosity mission</b><small>Routes, base and PMR · on this map</small>');
    b.onclick = e => { e.preventDefault(); miEntrar(); }; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); miEntrar(); } }; }
  // "Curiosity hoy" (buscador y vuelta con #curiosity) es la misma entrada; el vuelo desde lejos no pierde a Marte de vista
  const irA0 = irA;
  irA = function (v, dur = 2) {
    if (v === 'hoy') return miEntrar();
    if (v === 'gale') {
      const volar = () => viewer.camera.flyTo({ destination: pos(137.55, -6.9, 70000), orientation: { heading: 0.15, pitch: -0.55, roll: 0 }, duration: dur, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, pitchAdjustHeight: 1500000, maximumHeight: 4000000 });
      const t0 = performance.now(), esperar = () => (viewer.scene.globe.tilesLoaded || performance.now() - t0 > 4000) ? volar() : setTimeout(esperar, 120);
      return esperar();
    }
    return irA0(v, dur);
  };
  if ($('vHoy')) $('vHoy').onclick = () => miEntrar();      // el chip puede no estar (Maps in Mars quitó los atajos bajo el buscador)
  entrarMision = () => miEntrar();          // el enlace de las fichas de Maps in Mars también entra acá, sin cambiar de página
  for (const id of ['vGale', 'vRec', 'vMarte', 'logoRiel']) $(id)?.addEventListener('click', miDejar);
  document.querySelectorAll('.rb[data-t]').forEach(b => b.addEventListener('click', () => { if (MI.modo) miSalirModo(false); $('cajon').classList.remove('mi-libre'); }));
  addEventListener('keydown', e => { const tag = document.activeElement?.tagName; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.key === 'Escape' && PMR.marcar) { e.preventDefault(); return pmrMarcar(false); }
    if (e.key === 'Escape' && MI.modo) { e.preventDefault(); miSalirModo(true); } if (e.key === ' ' && MI.modo && !MI.modo.libre) { e.preventDefault(); miJugar(!MI.modo.jugando); } });
  // interruptores de arriba: las 49 perforaciones y nuestro recorrido, los dos apagados al empezar
  $('miIntPozos').onclick = () => miVerPozos($('miIntPozos').getAttribute('aria-pressed') !== 'true');
  $('miIntRec').onclick = () => miVerRecorrido($('miIntRec').getAttribute('aria-pressed') !== 'true');
  cont().addEventListener('change', e => { if (e.target.matches?.('[data-c="pozos"]')) $('miIntPozos').setAttribute('aria-pressed', e.target.checked); });
  // los pozos con la forma de pin de la lámina (también cuando Maps in Mars los repinta: selección o color por mineral)
  const rp0 = repintar; repintar = function () { rp0(); miPozosEstilo(); };
  miPozosEstilo(); miVerPozos(false);
  let ultimo = performance.now();
  viewer.scene.preRender.addEventListener(() => { const ahora = performance.now(), dt = Math.min(0.1, (ahora - ultimo) / 1000); ultimo = ahora; try { miTick(dt); } catch (e) { console.error('[Misión]', e); } });
  // Wiki sola en otra pestaña: ?wiki=bib:vista:pozo o ?wiki=mi:ficha
  const wiki = new URLSearchParams(location.search).get('wiki');
  if (wiki != null) {
    document.body.classList.add('soloWiki'); document.title = 'Wiki · Maps in Mars';
    const [k, v, p] = wiki.split(':');
    setTimeout(async () => { if (k === 'mi') { MI.fichaClave = v; await miWiki(v); } else { abrir('biblioteca'); if (v && v !== 'inicio') { BIB.vista = v; if (p) BIB.pozo = p; vistaBiblioteca(); } }
      if (window.abrirCajon) abrirCajon(); document.body.classList.remove('hoja'); }, 400);
  }
  // la misión se carga en segundo plano apenas termina de abrir el globo (así "Curiosity hoy" responde enseguida)
  // enlaces directos (por ejemplo desde la escena clásica o una presentación)
  const DIRECTO = { pareja: ['B', 'pareja'], rover: ['A'], apie: ['B'], tripulado: ['C'], desdebase: ['T'], expedicion: ['E-vehiculo'] };
  const pedido = (location.hash.match(/^#(pareja|rover|apie|tripulado|desdebase|pmr|gx3|expedicion|base|guia|libre)$/) || [])[1];
  if (wiki == null) setTimeout(() => { miCargar().then(async ok => { if (!ok) return; miQuieto(true);
    if (pedido) { await miEntrar(false); setTimeout(() => pedido === 'base' ? (fichaBase(), miVerBase()) : pedido === 'pmr' || pedido === 'gx3' ? (fichaPMR(), miVerPMR())
      : pedido === 'guia' ? pmrGuiaRecomendada() : pedido === 'libre' ? pmrLibre() : miModo(...DIRECTO[pedido]), 2800); } }); }, pedido ? 2600 : 3500);
  window.__mision = { MI, get PMR() { return PMR; }, alturaSuelo, pos, entrar: miEntrar, modo: miModo, salir: miSalirModo, jugar: miJugar, ficha: fichaParada, base: fichaBase, hoy: fichaHoy, rover: miRover, enLinea,
    pmr: fichaPMR, verPMR: miVerPMR, g3: miPMRAccion, accion: miAccion, llegada: miLlegada, pozos: miVerPozos, recorrido: miVerRecorrido, tramo: i => pmrTramo(i), astar: (a, b, p, l) => pmrAstar(a, b, p, l), terreno: () => pmrTerreno(), guia: () => pmrGuiaRecomendada(), libre: () => pmrLibre() };
}

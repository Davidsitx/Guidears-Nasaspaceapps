// ==================== Misión Curiosity: todo en este mismo globo ====================
// Lo que antes abría otra página (GALE-3D) ahora vive acá, en "Curiosity hoy": paradas, rutas A, B y C, expedición sur,
// Base Gale, rover (Curiosity o GX-2), astronauta y misión en pareja. Mismos números y textos que la escena 3D: los saca
// herramientas/exportar_mision.py a datos/mision.json y capas/mision/*.glb. Módulo de David (con Claude), 15/11/2026.
const MI = { D: null, activo: false, cargando: null, modo: null, rover: 'curiosity', mod: {}, ds: null, lineas: {}, excluir: [],
  dur: 240, parar: true, fovOjos: C.Math.toRadians(82), fov0: null, cam: { h: 0, p: -0.32, r: 12 }, siguiendo: false, ult: 0, quieto: 0, hover: null };
try { MI.dur = +localStorage.getItem('galeMisionDur') || 240; MI.rover = localStorage.getItem('galeMisionRover') || 'curiosity'; } catch {}
const M_GRADO = 3396190 * d2r;     // d2r ya existe en Gale Earth
const miNum = (v, d = 0) => v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });
const miM = m => m >= 1000 ? `${miNum(m / 1000, 2)} km` : `${Math.round(m)} m`;
const miH = h => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
const miT = h => { const m = Math.round(h * 60); return `T+${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const miEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function miFq(id) {
  const f = MI.D?.fuentes?.[id]; if (!f) return '';
  return `<a class="q" href="${f[1]}" target="_blank" rel="noopener" title="Fuente: ${miEsc(f[0])}" aria-label="Ver la fuente: ${miEsc(f[0])}">?</a>`;
}

// ---------- estilos (mismo lenguaje que Gale Earth: superficies oscuras, acento naranja, píldoras) ----------
document.head.insertAdjacentHTML('beforeend', `<style id="miEstilos">
#miBarra{position:absolute;left:50%;bottom:calc(42px + var(--inf-seg));transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:6px;padding:6px;
  background:var(--sup);border:1px solid #ffffff14;border-radius:26px;box-shadow:var(--sombra);backdrop-filter:blur(8px);max-width:calc(100vw - var(--riel) - 120px);
  flex-wrap:wrap;justify-content:center;width:max-content;transition:opacity .24s cubic-bezier(.2,.7,.2,1),transform .24s cubic-bezier(.2,.7,.2,1)}
#miBarra.sale{opacity:0;transform:translate(-50%,12px);pointer-events:none}
body.cajonAbierto:not(.hoja) #miBarra{left:calc((var(--riel) + 424px + 100vw - 70px) / 2);max-width:calc(100vw - var(--riel) - 424px - 90px)}
body.cajonAbierto:not(.hoja) #miBarra .mi-tit{display:none}
@media (max-width:1500px){body.cajonAbierto:not(.hoja) #miBarra .mib{padding:0 11px;font-size:12.5px}}
body.cajonAbierto:not(.hoja) #miPlay,body.cajonAbierto:not(.hoja) #miCard{left:calc((var(--riel) + 424px + 100vw - 70px) / 2);width:min(760px,calc(100vw - var(--riel) - 424px - 90px))}
.mi-tit{display:flex;flex-direction:column;padding:0 12px 0 10px;border-right:1px solid var(--linea);margin-right:2px;white-space:nowrap}
.mi-tit b{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}.mi-tit b i{width:9px;height:9px;border-radius:50%;background:#e5534b;display:inline-block}
.mi-tit small{color:var(--suave);font-size:11px}
.mib{flex:none;display:flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:19px;border:1px solid #ffffff14;background:var(--sup2);color:var(--texto);cursor:pointer;
  font-size:13px;white-space:nowrap;transition:background .12s cubic-bezier(.2,.7,.2,1),border-color .12s,transform .08s}
.mib:hover{background:var(--sup3);border-color:#ffffff2e}.mib:active{transform:scale(.98)}.mib:focus-visible{outline:2px solid var(--acento);outline-offset:1px}
.mib svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.mib.pri{background:linear-gradient(#f39a4f,#e07a2c);border-color:#f7b27a;color:#1b1210;font-weight:600}.mib.pri:hover{background:linear-gradient(#f6a861,#e8853a)}
.mib[aria-pressed=true]{background:#4a3424;border-color:var(--acento);color:#fff}
.mi-seg{display:flex;border:1px solid #ffffff1f;border-radius:19px;overflow:hidden;flex:none}
.mi-seg button{height:36px;border:0;background:var(--sup2);color:var(--suave);padding:0 12px;cursor:pointer;font-size:12.5px}
.mi-seg button+button{border-left:1px solid #ffffff1a}.mi-seg button[aria-pressed=true]{background:#4a3424;color:#fff}
#miCard{position:absolute;left:50%;top:calc(16px + var(--sup-seg));transform:translateX(-50%);z-index:9;width:min(520px,calc(100vw - var(--riel) - 40px));
  background:var(--sup);border:1px solid #ffffff1a;border-radius:18px;box-shadow:var(--sombra);padding:14px 16px 12px;backdrop-filter:blur(8px);
  transition:opacity .24s cubic-bezier(.2,.7,.2,1),transform .24s cubic-bezier(.2,.7,.2,1)}
#miCard.sale{opacity:0;transform:translate(-50%,-10px);pointer-events:none}
#miCard .et{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--acento2);font-weight:600}
#miCard h3{margin:3px 0 4px;font-size:16px;font-weight:600;display:flex;gap:8px;align-items:center}
#miCard p{margin:0 0 10px;color:#d6d8db;font-size:13px}
#miCard .bts{display:flex;gap:8px;flex-wrap:wrap}
.mi-pill{display:inline-block;min-width:26px;text-align:center;border-radius:10px;padding:0 7px;font-weight:700;font-size:12px;color:#fff}
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
body.mi-modo #busca,body.mi-modo #bMision,body.mi-modo #linea,body.mi-modo #miBarra{opacity:0;pointer-events:none}
body.mi-modo #cajon:not(.mi-libre){transform:translateX(-30px);opacity:0;pointer-events:none}
body.mi-pareja #riel,body.mi-pareja #controles{opacity:.0;pointer-events:none}
#busca,#bMision,#riel,#controles{transition:opacity .3s cubic-bezier(.4,0,.2,1)}
#miVivo{position:absolute;left:50%;top:calc(14px + var(--sup-seg));transform:translateX(-50%);z-index:8;background:#0b1a20d9;border:1px solid #7fdcff33;color:#cfefff;border-radius:16px;
  padding:5px 14px;font:600 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;white-space:nowrap}
#miVivo i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5a4a;margin-right:6px;animation:miLate 1.2s infinite}
@keyframes miLate{50%{opacity:.25}}
#miVisor{position:absolute;right:14px;top:calc(14px + var(--sup-seg));bottom:calc(200px + var(--inf-seg));width:300px;z-index:8;overflow:auto;
  background:#0b1a20e6;border:1px solid #7fdcff38;border-radius:14px;padding:10px 12px;color:#cfefff;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;scrollbar-width:thin}
#miVisor .vt{color:#7fdcff;font-size:10.5px;letter-spacing:.12em;margin:8px 0 3px;text-transform:uppercase}
#miVisor .vf{display:flex;justify-content:space-between;gap:8px}#miVisor .vf b{font-weight:600;color:#fff;text-align:right}
#miVisor .vf b.alerta{color:#ff8a7a}#miVisor canvas{width:100%;height:auto;background:#06121699;border-radius:10px;border:1px solid #7fdcff22;display:block}
#miVisor .prox{display:flex;gap:8px;align-items:center}#miVisor #miFlecha{font-size:22px;color:#ffcf7a;display:inline-block;transition:transform .2s}
#miVisor .nivel{font-size:10px;border:1px solid currentColor;border-radius:4px;padding:0 4px;margin-left:4px}
#miComms{position:absolute;left:14px;bottom:calc(252px + var(--inf-seg));width:min(420px,calc(100vw - 360px));max-height:min(46vh,380px);z-index:8;display:flex;flex-direction:column;
  background:#141518eb;border:1px solid #ffffff1f;border-radius:14px;padding:10px 12px;font-size:12.5px;backdrop-filter:blur(6px)}
#miComms .ct{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--suave);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#miComms ul{list-style:none;margin:6px 0;padding:0;overflow:auto;flex:1;display:flex;flex-direction:column;gap:6px}
#miComms li{background:var(--sup2);border-radius:10px;padding:6px 9px;border-left:3px solid #ffcf7a;animation:miEntra .24s cubic-bezier(.2,.7,.2,1)}
#miComms li b{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#ffcf7a}#miComms li b i{font-style:normal;color:var(--suave);margin-left:6px;text-transform:none;letter-spacing:0}
#miComms li.tierra{border-left-color:#7fb4ff}#miComms li.tierra b{color:#9cc3ff}#miComms li.a1,#miComms li.a2{border-left-color:#9fe0a8}#miComms li.a1 b,#miComms li.a2 b{color:#9fe0a8}
#miComms li.alerta{border-left-color:#ff6a5a;background:#3a1f1c}
#miComms .resp{display:flex;gap:6px;flex-wrap:wrap}#miComms .resp .mib{height:32px;font-size:12px;padding:0 11px}
@keyframes miEntra{from{opacity:0;transform:translateY(6px)}}
#miTip{position:absolute;z-index:20;pointer-events:none;background:#202124f2;border:1px solid #ffffff22;border-radius:10px;padding:5px 9px;font-size:12px;box-shadow:var(--sombra);
  transform:translate(14px,-120%);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
#miTip small{display:block;color:var(--suave);font-size:11px}
.mi-ficha .parada-cab{display:flex;gap:7px;align-items:center;font-size:17px;font-weight:600;margin:6px 0 4px}
.mi-ficha .chip{display:inline-block;width:auto;height:auto;min-width:26px;text-align:center;border-radius:10px;padding:0 7px;font-weight:700;color:#fff;font-size:12px;margin:0}
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
.mi-ficha a.q,#miComms a.q{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1px solid #ffcf7a8c;color:var(--acento2);
  font:600 10.5px/1 system-ui,sans-serif;text-decoration:none;margin-left:5px;vertical-align:1px}
.mi-ficha a.q:hover,#miComms a.q:hover{background:var(--acento);color:#1b1210}
.mi-ficha h1{font-size:17px;margin:6px 0}.mi-ficha p{margin:6px 0}
.mi-bts{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}.mi-bts .mib{height:34px;font-size:12.5px}
.mi-pz{display:inline-flex;align-items:center;gap:5px;margin:4px 6px 0 0;padding:3px 9px 3px 4px;border-radius:14px;background:#ffffff0d;border:1px solid #ffffff12;cursor:pointer;font-size:12px}
.mi-pz:hover{background:#ffffff1a}
body.mi-pareja #miPlay{width:min(720px,calc(100vw - 40px))}
body.mi-pareja #miVisor{bottom:calc(252px + var(--inf-seg))}
body.mi-pareja #miPlay .fila label:first-of-type{font-size:12px}
@media (max-width:1500px){.mi-tit{display:none}}
body.cajonAbierto #miBarra [data-m=info]{display:none}
body.hoja #miBarra{opacity:0;pointer-events:none}
@media (max-width:900px){body.mi-activo #bMision{opacity:0;pointer-events:none}
  #miBarra [data-m=C],#miBarra [data-m=expe],#miBarra [data-m=base],#miBarra .mi-seg{display:none}
  #miBarra .mib{height:34px;padding:0 11px;font-size:12.5px}
  #miVisor,body.mi-pareja #miVisor{width:210px;font-size:11px;bottom:auto;max-height:max(120px,calc(76vh - var(--miPlayH,214px) - 74px - var(--sup-seg) - var(--inf-seg)))}#miComms{width:calc(100vw - 28px);max-height:24vh;bottom:calc(var(--miPlayH,214px) + 50px + var(--inf-seg))}
  #miPlay .dat b{font-size:14px}.mi-tit{display:none}#miBarra{max-width:calc(100vw - 24px);bottom:calc(64px + var(--inf-seg))}}
@media (prefers-reduced-motion:reduce){#miBarra,#miCard,#miPlay,#miComms li{transition:none;animation:none}}
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
<div id="miBarra" class="oculto sale" role="toolbar" aria-label="Curiosity hoy: misión">
  <div class="mi-tit"><b><i></i>Curiosity hoy</b><small>sol 5070 · zona de hoy</small></div>
  <button class="mib pri" data-m="pareja" title="Misión en pareja: cámara del casco del Astronauta 1, visor del Astronauta 2 y mensajes de las bases">${ICO.pareja}En pareja</button>
  <button class="mib" data-m="A" title="Ruta A del robot (Curiosity o GX-2), desde atrás">${ICO.rover}Rover · ruta A</button>
  <button class="mib" data-m="B" title="Ruta B a pie, ida y vuelta">${ICO.pie}A pie · ruta B</button>
  <button class="mib" data-m="C" title="Ruta C: rover presurizado tripulado (supuesto)">${ICO.trip}Tripulado · C</button>
  <button class="mib" data-m="expe" title="Expedición sur: cinco puntos más allá de A4">${ICO.brujula}Expedición sur</button>
  <button class="mib" data-m="base" title="Base Gale, en la Zona 2 de la llanura del aterrizaje">${ICO.base}Base Gale</button>
  <span class="mi-seg" title="Qué rover se ve"><button data-rv="curiosity">Curiosity</button><button data-rv="gx2">GX-2</button></span>
  <button class="mib" data-m="info" title="Todo lo de Curiosity hoy, en el panel">${ICO.lista}Todo</button>
</div>
<div id="miCard" class="oculto sale" role="status"><div class="et" id="miCet"></div><h3 id="miCtit"></h3><p id="miCtxt"></p><div class="bts" id="miCbts"></div></div>
<div id="miPlay" class="oculto sale" role="region" aria-label="Recorrido">
  <div class="cab"><span class="mi-pill" id="miPid">B</span><b id="miPnomR"></b><small id="miPsub"></small></div>
  <div class="dat"><div><b id="miD1">0 min</b><span id="miL1">tiempo de marcha</span></div><div><b id="miD2">0 m</b><span>recorrido</span></div>
    <div id="miC3"><b id="miD3">0°</b><span>pendiente de marcha</span></div><div><b id="miD4">0</b><span id="miL4">dosis acumulada</span></div></div>
  <input type="range" id="miBar" min="0" max="1000" value="0" aria-label="Avance del recorrido">
  <div class="fila">
    <button class="mib pri" id="miPlayB">▶ Salir</button>
    <label><input type="checkbox" id="miParar" checked> Detenerse en cada parada</label>
    <label>Duración <select id="miDur"><option value="60">1 min</option><option value="120">2 min</option><option value="240">4 min</option><option value="480">8 min</option></select></label>
    <span class="mi-seg" id="miVistas"><button data-v="detras" aria-pressed="true">Detrás</button><button data-v="ojos">Ojos</button></span>
    <span class="esp"></span>
    <button class="mib" id="miSalir" title="Salir del recorrido (Esc)">Salir (Esc)</button>
  </div>
</div>
<div id="miVivo" class="oculto"><i></i>EN VIVO · <span id="miVivoT">Cámara del casco · Astronauta 1</span> · <span id="miReloj">T+00:00</span></div>
<aside id="miVisor" class="oculto" aria-label="Visor del Astronauta 2">
  <div class="vt" style="margin-top:0;display:flex;justify-content:space-between"><span>Visor · Astronauta 2</span><span id="miComp">compañero a 6 m</span></div>
  <canvas id="miMapa" width="560" height="340"></canvas>
  <div class="vt">Próxima parada</div><div class="prox"><span id="miFlecha">↑</span><b id="miPnom">—</b></div><div id="miPdist" style="color:#9fc9d9"></div>
  <div class="vt">Suelo</div><div class="vf"><span>Pendiente</span><b id="miVpend">—</b></div><div class="vf"><span>Límite del traje</span><b id="miVlim">—</b></div>
  <div class="vf"><span>Elevación</span><b id="miVelev">—</b></div><div class="vf"><span>Terreno</span><b id="miVterr">—</b></div><div id="miVmin"></div>
  <div class="vt">Radiación</div><div class="vf"><span>Tasa ahora</span><b id="miVtasa">—</b></div><div class="vf"><span>Cielo tapado</span><b id="miVcielo">—</b></div>
  <div class="vf"><span>Dosis de la salida</span><b id="miVdosis">—</b></div><div id="miVsombra" style="color:#9fc9d9;margin-top:2px"></div>
  <div class="vt">Refugio</div><div class="vf"><span>Distancia</span><b id="miVref">—</b></div><div class="vf"><span>Tiempo afuera</span><b id="miVtiempo">—</b></div>
</aside>
<aside id="miComms" class="oculto" aria-label="Comunicaciones con las bases">
  <div class="ct"><span>Comunicaciones con las bases</span><span id="miDemora"></span></div><ul id="miMsgs"></ul>
  <div class="resp"><button class="mib" data-r="llegamos">Llegamos</button><button class="mib" data-r="pronostico">Pedir pronóstico</button><button class="mib" data-r="ayuda">Necesitamos ayuda</button></div>
</aside>
<div id="miTip" class="oculto"></div>`);
$('miDur').value = String(MI.dur);
const miMostrar = (id, on) => { const e = $(id); if (on) { e.classList.remove('oculto'); requestAnimationFrame(() => e.classList.remove('sale')); } else { e.classList.add('sale'); clearTimeout(e._t); e._t = setTimeout(() => { if (e.classList.contains('sale')) e.classList.add('oculto'); }, 260); } };

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
  return { lon: f(0), lat: f(1), d, elev: f(3), marcha: a[4], terr: a[5], cielo: f(6), t: f(7), dosis: f(8), terreno: a[9], min: a[10] };
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
    catch (e) { avisar(location.protocol === 'file:' ? 'Para ver la misión abrí Gale Earth con abrir.bat (o desde la página publicada).' : 'No se pudo cargar datos/mision.json.'); MI.cargando = null; return false; }
    const D = MI.D;
    for (const r of D.rutas) MI.lineas[r.id] = { ...r, tipoL: r.tipo };
    if (D.expedicion) for (const [k, L] of Object.entries(D.expedicion.lineas)) MI.lineas['E-' + k] = { ...L, id: 'E-' + k, nombre: `Expedición sur · ${k === 'vehiculo' ? 'rover' : 'a pie'}`, tipo: k, idaVuelta: false };
    MI.paradas = Object.fromEntries(D.paradas.map(p => [p.id, p])); if (D.expedicion) for (const e of D.expedicion.paradas) MI.paradas[e.id] = { ...e, expe: true };
    miCapa(); miLuz();
    // modelos 3D (Model primitives): se mueven cuadro a cuadro sin pasar por entidades
    const cargar = async (k, opc = {}, clave = k) => {
      try { const m = await C.Model.fromGltfAsync({ url: `capas/mision/${k}.glb`, show: false, id: { mision: clave }, ...opc });
        viewer.scene.primitives.add(m); MI.mod[clave] = m; MI.excluir.push(m); return m; } catch (e) { console.warn('[Misión] sin modelo', k, e); return null; }
    };
    await Promise.all([cargar('curiosity'), cargar('gx2'), cargar('astronauta'), cargar('astronauta', {}, 'a2'),
      D.base ? cargar('base_gale', { heightReference: C.HeightReference.RELATIVE_TO_GROUND, scene: viewer.scene }) : null]);
    if (MI.mod.base_gale) { const b = D.base; MI.mod.base_gale.modelMatrix = C.Transforms.eastNorthUpToFixedFrame(pos(b.lon, b.lat, b.alto_plataforma), MARS); }
    return true;
  })();
  return MI.cargando;
}
// luz del sol para los modelos: alta desde el noroeste, como el sombreado del relieve de Gale Earth (SOL.az 315°)
function miLuz() {
  const c = MI.D.curiosity, enu = C.Transforms.eastNorthUpToFixedFrame(pos(c.lon, c.lat, 0), MARS), az = 315 * d2r, el = 48 * d2r;
  const s = C.Matrix4.multiplyByPointAsVector(enu, new C.Cartesian3(Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)), new C.Cartesian3());
  viewer.scene.light = new C.DirectionalLight({ direction: C.Cartesian3.negate(C.Cartesian3.normalize(s, s), new C.Cartesian3()), intensity: 2.2 });
}
// píldora con palito, como los carteles de la escena
function pildora(texto, color) {
  const k = 'pil' + texto + color; if (iconos[k]) return iconos[k];
  const s = 2, h = 56, w = Math.max(56, 28 + texto.length * 19), c = document.createElement('canvas'); c.width = w * s; c.height = (h + 22) * s;
  const x = c.getContext('2d'); x.scale(s, s);
  x.strokeStyle = '#1b1210'; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, h - 4); x.lineTo(w / 2, h + 20); x.stroke();
  x.fillStyle = color; x.beginPath(); x.roundRect(2, 2, w - 4, h - 6, (h - 6) / 2); x.fill(); x.stroke();
  const rgb = parseInt(color.slice(1), 16), lum = ((rgb >> 16) * 0.299 + ((rgb >> 8) & 255) * 0.587 + (rgb & 255) * 0.114);
  x.fillStyle = lum > 170 ? '#1b1210' : '#fff'; x.font = '700 27px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, w / 2, (h - 4) / 2 + 1);
  return iconos[k] = c;
}
function miCapa() {
  const D = MI.D, ds = MI.ds = new C.CustomDataSource('mision'); viewer.dataSources.add(ds);
  const cerca = new C.DistanceDisplayCondition(0, 70000);
  const pin = (texto, color, lon, lat, tipo, id, nombre) => ds.entities.add({
    position: pos(lon, lat), properties: { tipo, id, nombre },
    billboard: { image: pildora(texto, color), scale: 0.42, verticalOrigin: C.VerticalOrigin.BOTTOM, heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: cerca },
    label: { text: nombre, show: false, font: '600 13px system-ui', fillColor: C.Color.WHITE, style: C.LabelStyle.FILL,
      pixelOffset: new C.Cartesian2(0, 8), heightReference: CLAMP, disableDepthTestDistance: Number.POSITIVE_INFINITY, verticalOrigin: C.VerticalOrigin.TOP,
      showBackground: true, backgroundColor: C.Color.fromCssColorString('#202124').withAlpha(0.88), backgroundPadding: new C.Cartesian2(8, 5) } });
  const linea = (L, ancho, alfa, z) => {
    const ps = L.pts.map(p => pos(p[0], p[1])), col = C.Color.fromCssColorString(L.color);
    ds.entities.add({ polyline: { positions: ps, width: ancho + 3, clampToGround: true, zIndex: z, material: C.Color.fromCssColorString('#1b1210').withAlpha(alfa * 0.55), distanceDisplayCondition: cerca } });
    return ds.entities.add({ properties: { tipo: 'mruta', id: L.id, nombre: L.nombre }, polyline: { positions: ps, width: ancho, clampToGround: true, zIndex: z + 1, material: col.withAlpha(alfa), distanceDisplayCondition: cerca } });
  };
  if (D.expedicion) for (const k of Object.keys(D.expedicion.lineas)) linea(MI.lineas['E-' + k], 3, 0.6, 1);
  for (const r of D.rutas) if (r.id !== 'C') MI.lineas[r.id].ent = linea(MI.lineas[r.id], r.id.startsWith('C-') ? 3 : 4.5, 0.95, r.id === 'B' ? 6 : 4);
  for (const p of D.paradas) pin(p.id, p.color, p.lon, p.lat, 'mparada', p.id, `${p.id} · ${p.nombre}`);
  if (D.expedicion) for (const e of D.expedicion.paradas) pin(e.id, e.color, e.lon, e.lat, 'mparada', e.id, e.nombre);
  if (D.base) { const e = pin('BG', '#ffcf7a', D.base.lon, D.base.lat, 'mbase', 'base', 'Base Gale · Zona 2'); e.billboard.distanceDisplayCondition = new C.DistanceDisplayCondition(380, 70000); }
}

// ---------- fichas en el panel de Gale Earth ----------
function miFicha(titulo, html, botones = '') {
  $('cajonTitulo').textContent = titulo;
  document.querySelectorAll('.rb[data-t]').forEach(b => b.classList.remove('on'));
  cont().innerHTML = `<div class="mi-ficha">${html}${botones ? `<div class="mi-bts">${botones}</div>` : ''}</div>`;
  cont().scrollTop = 0; if (window.abrirCajon) abrirCajon();
  cont().querySelectorAll('[data-mi]').forEach(b => b.onclick = () => miAccion(b.dataset.mi, b.dataset));
}
const bt = (txt, accion, extra = '', pri = false) => `<button class="mib${pri ? ' pri' : ''}" data-mi="${accion}" ${extra}>${txt}</button>`;
const rutaDeParada = id => { const p = MI.paradas[id]; if (p?.expe) return 'E-' + (/astronauta/.test(p.quien) ? 'astronauta' : 'vehiculo');
  const cand = MI.D.rutas.filter(r => r.paradas.some(o => o.id === id)); return (cand.find(r => r.id === 'A' || r.id === 'B') || cand[0])?.id; };
function fichaParada(id) {
  const p = MI.paradas[id]; if (!p) return; const r = rutaDeParada(id), L = r && MI.lineas[r];
  miFicha('Curiosity hoy', p.ficha, bt('← Curiosity hoy', 'hoy') + bt('Ver de cerca', 'ver', `data-id="${id}"`) + bt('Perforación simulada', 'muestra', `data-id="${id}"`)
    + (L ? bt(`Recorrer ${r.startsWith('E-') ? 'la expedición' : 'la ruta ' + r} ▶`, 'ruta', `data-r="${r}"`, true) : ''));
  miSel(id);
}
function fichaBase(clave) {
  miFicha('Base Gale', MI.D.base.ficha, bt('← Curiosity hoy', 'hoy') + bt('Ver la base de cerca', 'verbase', '', true));
  if (clave) { const d = cont().querySelector(`details[data-parte="${clave}"]`); if (d) d.open = true; }
}
function fichaRover() {
  const gx = MI.rover === 'gx2';
  miFicha('Curiosity hoy', gx ? MI.D.gx2 : `<h1 class="parada-cab"><span class="chip" style="background:#e5534b">MSL</span>Curiosity, sol 5070</h1>
    <p>El rover de la misión, donde está hoy (campaña Nazca). Es la salida (S) de las rutas A, B y C. Modelo a escala: 3 m de largo, seis ruedas de 50 cm con balancín.</p>
    <p class="sub">Elevación ${miNum(MI.D.curiosity.elev)} m · ${MI.D.curiosity.lat.toFixed(5)}°, ${MI.D.curiosity.lon.toFixed(5)}° E</p>`,
    bt('← Curiosity hoy', 'hoy') + bt(gx ? 'Ver Curiosity' : 'Ver el GX-2 (próximas excavaciones)', gx ? 'rvcur' : 'rvgx') + bt('Rover · ruta A ▶', 'ruta', 'data-r="A"', true));
}
function fichaHoy() {
  const D = MI.D, L = MI.lineas, tarj = (id, txt, sub, accion = 'ruta') => `<div class="tarjeta" data-mi="${accion}" data-r="${id}"><b>${txt}</b><div class="sub">${sub}</div></div>`;
  const grupo = (tit, ids) => `<h2>${tit}</h2><div>${ids.map(id => MI.paradas[id]).filter(Boolean).map(p => `<span class="mi-pz" data-mi="parada" data-id="${p.id}"><span class="mi-pill" style="background:${p.color}">${p.id}</span>${miEsc(p.nombre)}</span>`).join('')}</div>`;
  const ex = D.expedicion;
  miFicha('Curiosity hoy', `<p class="sub" style="margin-top:2px">La zona donde está Curiosity hoy (sol 5070), con las rutas que proponemos para el robot y para una persona, sobre el mismo terreno. Tocá un cartel en el mapa o elegí cómo recorrerla.</p>
    <h2>Cómo recorrerla</h2>
    <div class="tarjeta" data-mi="ruta" data-r="pareja"><b>👥 Misión en pareja</b><div class="sub">Cámara del casco del Astronauta 1, visor del Astronauta 2 y mensajes de la base y de la Tierra, con la demora real de la luz. Ruta B, ${miM(L.B.largo3d || L.B.largo)}.</div></div>
    ${tarj('A', 'Rover · ruta A', `${miM(L.A.largo)} · ${L.A.paradas.length} paradas · ${Math.ceil(L.A.largo / D.parametros.PR.porSol[1])}–${Math.ceil(L.A.largo / D.parametros.PR.porSol[0])} soles de manejo (calculado)`)}
    ${tarj('B', 'A pie · ruta B', `${miM(L.B.largo)} ida y vuelta · ${miH(L.B.horas)} de marcha · ${miNum(L.B.dosis, 1)} µSv (cálculo propio)`)}
    ${tarj('C', 'Tripulado · ruta C', `Rover presurizado a ~10 km/h (supuesto, concepto SEV) y tres caminatas cortas`)}
    ${ex ? tarj('expe', 'Expedición sur', `Cinco puntos más allá de A4: rover ${miM(ex.lineas.vehiculo?.largo)} o a pie ${miM(ex.lineas.astronauta?.largo)}`, 'expe') : ''}
    ${D.base ? `<div class="tarjeta" data-mi="base"><b>Base Gale · Zona 2</b><div class="sub">En la llanura del aterrizaje, a ${miM(D.base.drec)} del recorrido y ${miM(D.base.dc)} de Curiosity hoy.</div></div>` : ''}
    <div class="tarjeta" data-mi="rover"><b>Rover: Curiosity o GX-2</b><div class="sub">El GX-2 es nuestra versión para las próximas excavaciones: taladro de 2 m, dron y alas solares.</div></div>
    ${grupo('Paradas del robot (ruta A)', ['S', 'A1', 'A2', 'A3', 'A4', 'Z1'])}${grupo('Paradas a pie (ruta B)', ['B1', 'B2', 'Q1', 'M1'])}${grupo('Rover tripulado (ruta C)', ['C2', 'C3', 'C4', 'R1'])}
    ${ex ? grupo('Expedición sur', ex.paradas.map(e => e.id)) : ''}
    <p class="sub" style="margin-top:14px">Rutas y paradas: cálculo propio sobre el terreno USGS de 1 m ${miFq('usgsOrto')}. Lo supuesto está marcado como provisorio. La escena anterior sigue en <a href="../escena3d/index.html" style="color:var(--acento2)">versión clásica</a>.</p>`);
}
// durante un recorrido solo quedan los carteles de esa ruta (y las líneas), para que la vista a ras del suelo no se llene
function miCartelesCerca(on, ruta) {
  if (!MI.ds) return; const L = MI.lineas[ruta], deRuta = new Set((L?.paradas || []).map(o => o.id));
  for (const e of MI.ds.entities.values) { if (!e.billboard) continue; const id = e.properties?.id?.getValue?.();
    e.show = !on || deRuta.has(id); }
}
function miSel(id) {
  if (!MI.ds) return;
  for (const e of MI.ds.entities.values) if (e.billboard && e.properties?.id) { const yo = e.properties.id.getValue() === id; e.billboard.scale = yo ? 0.52 : 0.42; e.label.show = yo; }
}
function miAccion(a, ds) {
  if (a === 'hoy') return fichaHoy();
  if (a === 'parada') { fichaParada(ds.id); return miVolarA(MI.paradas[ds.id], 420); }
  if (a === 'ver') return miVolarA(MI.paradas[ds.id], 260);
  if (a === 'muestra') { const p = MI.paradas[ds.id]; return miFicha('Perforación simulada', p.muestra, bt('← Volver a la parada', 'parada', `data-id="${ds.id}"`)); }
  if (a === 'ruta') return ds.r === 'pareja' ? miModo('B', 'pareja') : ds.r === 'expe' ? miAccion('expe', ds) : miModo(ds.r);
  if (a === 'expe') return miCard('Expedición sur', '¿Quién hace la expedición?', 'Cinco puntos nuevos al sur de A4, elegidos con datos orbitales (sulfatos, arcilla, refugio, mirador y el frente sur).',
    [['Con el rover', () => miModo('E-vehiculo'), true], ['A pie', () => miModo('E-astronauta')], ['Cancelar', () => miCard()]]);
  if (a === 'base') { fichaBase(); return miVerBase(); }
  if (a === 'verbase') return miVerBase();
  if (a === 'rover') return fichaRover();
  if (a === 'rvgx') { miRover('gx2'); return fichaRover(); }
  if (a === 'rvcur') { miRover('curiosity'); return fichaRover(); }
}
async function hMedida(lon, lat, elev) {      // la más precisa: la del terreno a máximo detalle (Gale Earth: alturas)
  try { const h = await alturas([C.Cartographic.fromDegrees(lon, geodetica(lat))]); if (h && h[0] != null && isFinite(h[0])) return h[0] * (viewer.scene.verticalExaggeration || 1); } catch {}
  return alturaSuelo(lon, lat, elev);
}
async function miVolarA(p, rango = 420) {
  const h = await hMedida(p.lon, p.lat, p.elev);
  viewer.camera.flyToBoundingSphere(new C.BoundingSphere(pos(p.lon, p.lat, h), 20), { offset: new C.HeadingPitchRange(viewer.camera.heading, -0.55, rango), duration: 1.8, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000 });
}
async function miVerBase() {
  const b = MI.D.base, h = await hMedida(b.lon, b.lat, b.elev);
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
  if (!MI.D) { miCard('Curiosity hoy', 'Preparando la misión…', 'Paradas, rutas, base, rover y astronauta.', []); viewer.camera.flyTo({ destination: pos(HOY[0], HOY[1] - 0.06, 9000), orientation: { heading: 0, pitch: -0.6, roll: 0 }, duration: 2.4, pitchAdjustHeight: 1500000 }); }
  if (!(await miCargar())) { miCard(); return; }
  miCard(); if (MI.modo) miSalirModo(false);
  miVista(); miQuieto(true);
  miMostrar('miBarra', true); miRover(MI.rover);
  if (abrirFicha) fichaHoy();
}
// los orbitadores y las lunas de Gale Earth se ven siempre (sin profundidad): cerca del suelo tapan la vista y se guardan
function miOrbitas(ver) {
  if (MI.orbVer === ver) return; MI.orbVer = ver;
  for (const e of viewer.entities.values) { const t = e.properties?.tipo?.getValue?.(); if (t === 'orbitador' || t === 'luna') { if (!ver) { e._miShow = e.show; e.show = false; } else if (e._miShow != null) { e.show = e._miShow; e._miShow = null; } } }
}
function miDejar() {        // otro destino del globo: se guarda la barra (lo de la misión queda en el mapa)
  if (MI.modo) miSalirModo(false);
  MI.activo = false; document.body.classList.remove('mi-activo'); miMostrar('miBarra', false); miCard(); miOrbitas(true);
}
// quieto en la salida: rover (Curiosity o GX-2) y astronauta al lado, como en la escena
function miQuieto(forzar) {
  if (!MI.D || MI.modo) return;
  const c = MI.D.curiosity, rumbo = Math.PI / 2 - c.yaw, rv = MI.mod[MI.rover], otro = MI.mod[MI.rover === 'gx2' ? 'curiosity' : 'gx2'];
  if (otro) otro.show = false;
  if (rv) { rv.show = true; colocar(rv, c.lon, c.lat, rumbo, c.elev, MI.rover === 'gx2' ? 3.4 : 2.2, 2.5, true); }
  const a = MI.mod.astronauta; if (a) { a.show = true; const [lo, la] = corrido(c.lon, c.lat, -Math.cos(rumbo) * 3.2, Math.sin(rumbo) * 3.2); colocar(a, lo, la, rumbo, c.elev, 0, 0, false); if (a.ready) pasoAstro(a, 0, 0); }
  if (MI.mod.a2) MI.mod.a2.show = false;
  if (MI.mod.base_gale) MI.mod.base_gale.show = true;
}

// ---------- tarjeta de arriba ----------
function miCard(et, tit, txt, botones = []) {
  if (!et) return miMostrar('miCard', false);
  $('miCet').textContent = et; $('miCtit').innerHTML = tit; $('miCtxt').innerHTML = txt || '';
  const c = $('miCbts'); c.innerHTML = '';
  for (const [t, fn, pri] of botones) { const b = document.createElement('button'); b.className = 'mib' + (pri ? ' pri' : ''); b.textContent = t; b.onclick = fn; c.appendChild(b); }
  miMostrar('miCard', true);
}

// ---------- recorridos: rover, a pie, tripulado, expedición y misión en pareja ----------
const esRover = L => /vehiculo|tripulado/.test(L.tipo);
function miModo(id, tipo = 'ruta') {
  const L = MI.lineas[id]; if (!L) return;
  if (MI.modo) miSalirModo(false);
  const pareja = tipo === 'pareja', rover = esRover(L);
  MI.modo = { L, id, tipo, d: 0, jugando: false, mov: 0, rueda: 0, vista: pareja ? 'ojos' : 'detras', rover, vistos: new Set(), dosisAviso: 0, fin: false };
  MI.siguiendo = false; if (window.cerrarCajon) cerrarCajon();
  document.body.classList.add('mi-modo'); document.body.classList.toggle('mi-pareja', pareja);
  viewer.entities.show = false; miCartelesCerca(true, id);
  viewer.scene.screenSpaceCameraController.enableInputs = false;
  miMostrar('miBarra', false);
  const color = L.color || '#f28c38';
  $('miPid').textContent = pareja ? '👥' : id.startsWith('E-') ? 'E' : id.startsWith('C-') ? 'C' : id; $('miPid').style.background = color;
  $('miPnomR').textContent = pareja ? 'Misión en pareja · ruta B' : L.nombre;
  $('miPsub').textContent = `${miM(L.largo)}${L.idaVuelta ? ' ida y vuelta' : ''} · ${(L.paradas || []).length} paradas`;
  $('miL1').textContent = rover ? 'horas de manejo' : 'tiempo de marcha'; $('miL4').textContent = rover ? 'soles de manejo' : 'dosis acumulada';
  $('miVistas').classList.toggle('oculto', rover);
  document.querySelectorAll('#miVistas [data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === MI.modo.vista));
  $('miPlayB').textContent = '▶ Salir'; $('miParar').checked = MI.parar; $('miDur').value = String(MI.dur);
  for (const k of ['curiosity', 'gx2', 'astronauta', 'a2']) if (MI.mod[k]) MI.mod[k].show = false;
  if (pareja) miParejaEntrar(L);
  miMostrar('miPlay', true);
  miActualizar(0, true);
  // vuelo hasta la salida y, al llegar, la tarjeta "Listos para salir" (nada se mueve solo)
  const q0 = enLinea(L, 0), q1 = enLinea(L, 4), rumbo = rumboDe(q0, q1); MI.cam = { h: rumbo, p: rover ? -0.24 : -0.2, r: rover ? 15 : 7.5 };
  const hs = alturaSuelo(q0.lon, q0.lat, q0.elev), P = pos(q0.lon, q0.lat, hs + (pareja ? 1.7 : 1.2));
  let hecho = false; const listo = () => { if (hecho || MI.modo?.L !== L) return; hecho = true; MI.siguiendo = true; miListos(); };
  if (MI.modo.vista === 'ojos') viewer.camera.flyTo({ destination: P, orientation: { heading: rumbo, pitch: -0.08, roll: 0 }, duration: 2.6, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000, complete: listo, cancel: listo });
  else viewer.camera.flyToBoundingSphere(new C.BoundingSphere(P, 1), { offset: new C.HeadingPitchRange(rumbo, MI.cam.p, MI.cam.r), duration: 2.6, easingFunction: C.EasingFunction.CUBIC_IN_OUT, pitchAdjustHeight: 200000, complete: listo, cancel: listo });
}
function miListos() {
  const m = MI.modo; if (!m || m.jugando || m.d > 0.5) return; const L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA, n = (L.paradas || []).length;
  const txt = m.tipo === 'pareja' ? `La base autoriza la salida: ruta B, ${miM(L.largo3d || L.largo)} ida y vuelta, ${n} paradas. Salida nominal de ${EVA.nom} h (máximo ${EVA.max} h, traje xEMU). Van siempre a la vista uno del otro.`
    : m.rover ? `${L.nombre}: ${miM(L.largo)}, ${n} paradas. Al ritmo de Curiosity (${PR.porSol[0]}–${PR.porSol[1]} m por sol de manejo) serían ${Math.ceil(L.largo / PR.porSol[1])}–${Math.ceil(L.largo / PR.porSol[0])} soles (calculado). Acá lo ves en ${$('miDur').selectedOptions[0].text}.`
    : `${L.nombre}: ${miM(L.largo)}, ${miH(L.horas ?? enLinea(L, L.largo).t)} de marcha y ${miNum(L.dosis ?? enLinea(L, L.largo).dosis, 1)} µSv de dosis (cálculo propio). Acá lo ves en ${$('miDur').selectedOptions[0].text}.`;
  miCard(m.tipo === 'pareja' ? 'Base Gale · listos para salir' : 'Listos para salir', m.tipo === 'pareja' ? 'Misión en pareja' : miEsc(L.nombre), txt,
    [['▶ Salir', () => miJugar(true), true], ['Cambiar ruta', () => miSalirModo(true)]]);
}
function miJugar(on) {
  const m = MI.modo; if (!m) return;
  if (on && m.d >= m.L.largo - 0.5) { m.d = 0; m.vistos.clear(); m.dosisAviso = 0; m.fin = false; if (m.tipo === 'pareja') $('miMsgs').innerHTML = ''; }
  m.jugando = on; $('miPlayB').textContent = on ? '❚❚ Pausa' : '▶ Seguir';
  if (on) miCard();
}
function miSalirModo(volver = true) {
  const m = MI.modo; if (!m) return;
  MI.modo = null; MI.siguiendo = false;
  viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  viewer.scene.screenSpaceCameraController.enableInputs = true;
  document.body.classList.remove('mi-modo', 'mi-pareja'); $('cajon').classList.remove('mi-libre');
  viewer.entities.show = true; miCartelesCerca(false); if (MI.fov0) { viewer.camera.frustum.fov = MI.fov0; } MI.cam.pj = null;
  for (const id of ['miPlay']) miMostrar(id, false);
  for (const id of ['miVivo', 'miVisor', 'miComms']) $(id).classList.add('oculto');
  miCard();
  if (volver) { miVista(2); miMostrar('miBarra', true); }
  miQuieto(true);
}
// cada cuadro: avanza, apoya los modelos, mueve la cámara y actualiza los datos
function miTick(dt) {
  const m = MI.modo;
  if (!m) { if (MI.activo && (MI.quieto = (MI.quieto + 1) % 30) === 0) { miQuieto(); miOrbitas(viewer.camera.positionCartographic.height > 300000); } return; }
  const L = m.L;
  if (m.jugando) {
    const d0 = m.d; m.d = Math.min(L.largo, m.d + L.largo * dt / MI.dur);
    const st = MI.parar ? (L.paradas || []).find(o => o.d > d0 + 0.01 && o.d <= m.d && o.d > 12) : null;
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
  if (m.rover) {
    const rv = MI.mod[MI.rover]; if (rv) { rv.show = true; objetivo = colocar(rv, q.lon, q.lat, rumbo, q.elev, MI.rover === 'gx2' ? 3.4 : 2.2, 2.5, true);
      m.rueda = m.d; const R = MI.rover === 'gx2' ? 0.4 : 0.25; if (rv.ready) for (let i = 0; i < 6; i++) girarNodo(rv, `rueda_${i}`, -m.rueda / R); }
  } else if (m.tipo === 'pareja') {
    const d2 = Math.min(L.largo, m.d + 6), q2 = enLinea(L, d2), q2a = enLinea(L, Math.max(0, d2 - 1.5)), q2b = enLinea(L, Math.min(L.largo, d2 + 1.5)), r2 = rumboDe(q2a, q2b);
    const [lo, la] = corrido(q2.lon, q2.lat, -Math.cos(r2) * 1.1, Math.sin(r2) * 1.1), a2 = MI.mod.a2;
    if (a2) { a2.show = true; colocar(a2, lo, la, r2, q2.elev, 0, 0, false); pasoAstro(a2, d2 / MI.D.parametros.zancada * Math.PI * 2, m.mov, Math.atan2(q2b.elev - q2a.elev, 3)); }
    const hs = alturaSuelo(q.lon, q.lat, q.elev); objetivo = pos(q.lon, q.lat, hs);
    const a1 = MI.mod.astronauta;            // desde atrás también se ve al Astronauta 1
    if (a1) { a1.show = m.vista !== 'ojos'; if (a1.show) { colocar(a1, q.lon, q.lat, rumbo, q.elev, 0, 0, false); pasoAstro(a1, m.d / MI.D.parametros.zancada * Math.PI * 2 + Math.PI, m.mov, Math.atan2(qb.elev - qa.elev, 4)); } }
    miPareja(q, q2, lo, la, rumbo);
  } else {
    const a = MI.mod.astronauta; if (a) { a.show = true; objetivo = colocar(a, q.lon, q.lat, rumbo, q.elev, 0, 0, false); pasoAstro(a, m.d / MI.D.parametros.zancada * Math.PI * 2, m.mov, Math.atan2(qb.elev - qa.elev, 4)); }
  }
  if (MI.siguiendo && objetivo) miCamara(dt, objetivo, rumbo, m);
  // datos de la barra
  const PR = MI.D.parametros.PR;
  $('miD1').textContent = m.rover ? `${miNum(m.d / PR.vRover, 1)} h` : miH(q.t);
  $('miD2').textContent = miM(m.d);
  $('miD3').textContent = `${miNum(q.marcha || q.terr, 1)}°`; $('miC3').classList.toggle('alerta', (q.marcha || 0) > (m.rover ? PR.rMax : PR.pMax));
  $('miD4').textContent = m.rover ? `${miNum(m.d / PR.porSol[1], 0)}–${miNum(m.d / PR.porSol[0], 0)}` : `${miNum(q.dosis, 1)} µSv`;
  if (!m.arrastrando) $('miBar').value = Math.round(m.d / L.largo * 1000);
}
const _arriba = new C.Cartesian3();
function miCamara(dt, objetivo, rumbo, m) {
  const cam = viewer.camera, k = Math.min(1, dt * 2.4);
  MI.cam.h += angDif(rumbo - MI.cam.h) * k;
  if (m.vista === 'ojos') {
    MARS.geodeticSurfaceNormal(objetivo, _arriba);
    const ojo = C.Cartesian3.add(objetivo, C.Cartesian3.multiplyByScalar(_arriba, 1.7, new C.Cartesian3()), new C.Cartesian3());
    // la mirada sigue la pendiente de lo que viene (8 m adelante), con un campo visual más abierto, como un casco
    const q = enLinea(m.L, m.d), qa = enLinea(m.L, Math.min(m.L.largo, m.d + 8)), pObj = Math.max(-0.35, Math.min(0.3, Math.atan2(qa.elev - q.elev, 8) - 0.06));
    MI.cam.pj = (MI.cam.pj ?? pObj) + (pObj - (MI.cam.pj ?? pObj)) * Math.min(1, dt * 1.5);
    if (cam.frustum.fov !== MI.fovOjos) { MI.fov0 = MI.fov0 ?? cam.frustum.fov; cam.frustum.fov = MI.fovOjos; }
    cam.lookAtTransform(C.Matrix4.IDENTITY); cam.setView({ destination: ojo, orientation: { heading: MI.cam.h, pitch: MI.cam.pj, roll: 0 } });
    return;
  }
  if (MI.fov0 && cam.frustum.fov !== MI.fov0) cam.frustum.fov = MI.fov0;
  MARS.geodeticSurfaceNormal(objetivo, _arriba);
  const T = C.Cartesian3.add(objetivo, C.Cartesian3.multiplyByScalar(_arriba, m.rover ? 1.4 : 1.1, new C.Cartesian3()), new C.Cartesian3());
  cam.lookAt(T, new C.HeadingPitchRange(MI.cam.h, MI.cam.p, MI.cam.r));
  // que la cámara no se meta en el terreno: si queda baja, mira más desde arriba
  const cg = cam.positionCartographic, suelo = alturaSuelo(C.Math.toDegrees(cg.longitude), C.Math.toDegrees(Math.atan(Math.tan(cg.latitude) * (B * B) / (A * A))), null);
  const pDef = m.rover ? -0.24 : -0.2;
  if (cg.height < suelo + 1.6) MI.cam.p = Math.max(-1.2, MI.cam.p - 0.04); else MI.cam.p += (pDef - MI.cam.p) * Math.min(1, dt * 0.6);
}
function miLlegada(id) {
  const p = MI.paradas[id]; if (!p) return;
  miCard('Llegaste a la parada', `<span class="mi-pill" style="background:${p.color}">${p.id}</span>${miEsc(p.nombre)}`, miEsc((p.motivo || '').slice(0, 170)) + ((p.motivo || '').length > 170 ? '…' : ''),
    [['Ver la parada', () => { fichaParada(id); $('cajon').classList.add('mi-libre'); }], ['Perforación simulada', () => { miAccion('muestra', { id }); $('cajon').classList.add('mi-libre'); }], ['Seguir ▶', () => { $('cajon').classList.remove('mi-libre'); if (window.cerrarCajon) cerrarCajon(); miJugar(true); }, true]]);
  if (MI.modo?.tipo === 'pareja') { miMsg('a1', `Llegamos a ${p.id} · ${miEsc(p.nombre)}.`); setTimeout(() => MI.modo && miMsg('base', 'Recibido. Fotografíen la capa y tomen la muestra; el Astronauta 2 vigila el tiempo.'), 1200); }
}
function miFin() {
  const m = MI.modo; m.fin = true; const q = enLinea(m.L, m.L.largo);
  miCard('Fin del recorrido', miEsc(m.tipo === 'pareja' ? 'De vuelta en la base' : m.L.nombre),
    m.rover ? `${miM(m.L.largo)} en ${miNum(m.L.largo / MI.D.parametros.PR.porSol[1], 0)}–${miNum(m.L.largo / MI.D.parametros.PR.porSol[0], 0)} soles de manejo (calculado).` : `${miH(q.t)} de marcha y ${miNum(q.dosis, 1)} µSv por persona (cálculo propio).`,
    [['Repetir', () => miJugar(true)], ['Volver a Curiosity hoy', () => miSalirModo(true), true]]);
  if (m.tipo === 'pareja') { miMsg('a1', 'De vuelta en la base.'); miMsg('base', `Salida cerrada: ${miH(q.t)}, ${miNum(q.dosis, 1)} µSv por persona.`); }
}
// controles de la barra
$('miPlayB').onclick = () => MI.modo && miJugar(!MI.modo.jugando);
$('miSalir').onclick = () => miSalirModo(true);
$('miParar').onchange = e => { MI.parar = e.target.checked; };
$('miDur').onchange = e => { MI.dur = +e.target.value; try { localStorage.setItem('galeMisionDur', MI.dur); } catch {} };
$('miBar').addEventListener('input', e => { const m = MI.modo; if (!m) return; m.arrastrando = true; if (m.jugando) miJugar(false); m.d = +e.target.value / 1000 * m.L.largo; m.vistos.clear(); });
$('miBar').addEventListener('change', () => { if (MI.modo) MI.modo.arrastrando = false; });
document.querySelectorAll('#miVistas [data-v]').forEach(b => b.onclick = () => { const m = MI.modo; if (!m) return; m.vista = b.dataset.v;
  document.querySelectorAll('#miVistas [data-v]').forEach(o => o.setAttribute('aria-pressed', o === b)); if (m.vista !== 'ojos') viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  const a = MI.mod.astronauta; if (a && m.tipo !== 'pareja') a.show = m.vista !== 'ojos';
  $('miVivoT').textContent = m.vista === 'ojos' ? 'Cámara del casco · Astronauta 1' : 'Desde atrás · Astronautas 1 y 2'; });
document.querySelectorAll('#miBarra [data-m]').forEach(b => b.onclick = () => miAccion(b.dataset.m === 'pareja' ? 'ruta' : b.dataset.m === 'info' ? 'hoy' : ['A', 'B', 'C'].includes(b.dataset.m) ? 'ruta' : b.dataset.m, { r: b.dataset.m === 'pareja' ? 'pareja' : b.dataset.m }));
document.querySelectorAll('#miBarra [data-rv]').forEach(b => b.onclick = () => miRover(b.dataset.rv));

// ---------- misión en pareja: visor del Astronauta 2, mensajes de las bases, minimapa ----------
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
function miMsg(de, txt, extra = '') {
  const m = MI.modo; if (!m) return;
  const DE = { base: 'Base Gale', tierra: 'Control en la Tierra', a1: 'Astronauta 1', a2: 'Astronauta 2' }, q = enLinea(m.L, m.d), li = document.createElement('li');
  li.className = de + (extra ? ' ' + extra : '');
  li.innerHTML = `<b>${DE[de]}<i>${miT(q.t)}${de === 'tierra' ? ` · enviado hace ${miNum(MI.par.demora)} min` : ''}</i></b>${txt}`;
  const U = $('miMsgs'); U.appendChild(li); while (U.children.length > 30) U.firstChild.remove(); U.scrollTop = U.scrollHeight;
}
const estacion = ls => MI.D.estaciones.find(e => ls >= e.de && ls < e.a) || MI.D.estaciones[0];
function miParejaEntrar(L) {
  let ls = 0; try { ls = lsMarte(new Date()).ls; } catch {}
  MI.par = { demora: demoraLuz(new Date()), ls, ultMapa: 0 };
  for (const id of ['miVivo', 'miVisor', 'miComms']) $(id).classList.remove('oculto'); $('miVivoT').textContent = 'Cámara del casco · Astronauta 1';
  $('miMsgs').innerHTML = '';
  $('miDemora').innerHTML = `· Tierra ↔ Marte: ${miNum(MI.par.demora)} min por tramo ${miFq('jplApprox')}`;
  const EVA = MI.D.parametros.EVA, n = (L.paradas || []).length;
  miMsg('base', `Salida autorizada. Ruta B, ${miM(L.largo3d || L.largo)} ida y vuelta, ${n} parada${n === 1 ? '' : 's'}. Salida nominal de ${EVA.nom} h (máximo ${EVA.max} h, traje xEMU). Vayan siempre a la vista uno del otro.`);
  miMsg('a2', 'Visor en línea. Te sigo a 6 m, a tu izquierda.');
  const e0 = estacion(ls); setTimeout(() => { if (MI.modo?.tipo === 'pareja') miMsg('tierra', `Pronóstico de la temporada (Ls ${miNum(ls)}°, ${e0.nombre}): ${e0.lineas[0][0]} ${miFq(e0.lineas[0][1])}`); }, 2500);
}
function miPareja(q, q2, lo2, la2, rumbo) {
  const m = MI.modo, L = m.L, PR = MI.D.parametros.PR, EVA = MI.D.parametros.EVA;
  $('miReloj').textContent = miT(q.t);
  const dist = (a, b, c, d) => Math.hypot((c - a) * Math.cos(b * d2r), d - b) * M_GRADO;
  $('miComp').textContent = `compañero a ${miNum(dist(q.lon, q.lat, lo2, la2))} m`;
  // visor (lo que ve el Astronauta 2, donde está él)
  const vp = $('miVpend'); vp.textContent = `${miNum(q2.marcha, 1)}° (suelo ${miNum(q2.terr)}°)`; vp.classList.toggle('alerta', q2.marcha > PR.pMax);
  $('miVlim').textContent = `${PR.pMax}° (traje)`; $('miVelev').textContent = `${miNum(q2.elev)} m`;
  $('miVterr').textContent = MI.D.terrenos[q2.terreno] || '—';
  const mk = q2.min ?? -1; if (mk !== m.ultMin) { m.ultMin = mk; const Lm = MI.D.minerales[mk];
    $('miVmin').innerHTML = Lm ? `<div class="vt">Bajo tus pies · CRISM</div>${Lm.map(([t, n]) => `<div>▸ ${t} <span class="nivel n-${n}" style="color:${n === 'fuerte' ? '#7bd88f' : n === 'presente' ? '#ffcf7a' : '#a99d90'}">${n}</span></div>`).join('')}` : ''; }
  const tasa = PR.dosis / 24 * 1000 * (1 - PR.k * q2.cielo);
  $('miVtasa').textContent = `${miNum(tasa, 1)} µSv/h`; $('miVcielo').textContent = `${miNum(q2.cielo * 100)} %`; $('miVdosis').textContent = `${miNum(q.dosis, 1)} µSv`;
  $('miVsombra').textContent = q2.cielo > 0.2 ? '◆ En sombra del relieve: buen lugar para pausas' : q2.cielo > 0.12 ? 'Algo de reparo del relieve' : 'Cielo abierto';
  const p0 = L.pts[0], dRef = dist(p0[0], p0[1], q.lon, q.lat), vr = $('miVref');
  vr.textContent = `${miM(dRef)} / ${miM(PR.refMax)}`; vr.classList.toggle('alerta', dRef > PR.refMax); $('miVtiempo').textContent = miH(q.t);
  const prox = (L.paradas || []).find(o => o.d > m.d + 3), pp = prox && MI.paradas[prox.id];
  if (pp) { const ang = Math.atan2((pp.lon - q.lon) * Math.cos(q.lat * d2r), pp.lat - q.lat) - MI.cam.h; $('miFlecha').style.transform = `rotate(${ang}rad)`;
    $('miPnom').textContent = `${pp.id} · ${pp.nombre}`; $('miPdist').textContent = `${miM(prox.d - m.d)} por la ruta · ${miM(dist(q.lon, q.lat, pp.lon, pp.lat))} en línea recta`; }
  else { $('miFlecha').style.transform = `rotate(${Math.atan2((p0[0] - q.lon) * Math.cos(q.lat * d2r), p0[1] - q.lat) - MI.cam.h}rad)`;
    const falta = L.largo - m.d; $('miPnom').textContent = falta < 5 ? 'De vuelta en el refugio' : 'Regreso al refugio'; $('miPdist').textContent = falta < 5 ? '' : `${miM(falta)} por la ruta`; }
  // avisos: cada uno una sola vez por lugar, con las mismas reglas que la escena
  const una = (k, f) => { if (!m.vistos.has(k)) { m.vistos.add(k); f(); } };
  if (m.jugando) {
    for (const o of L.paradas || []) { const p = MI.paradas[o.id]; if (!p) continue;
      if (m.d >= o.d - 45 && m.d < o.d - 6) una('cerca' + o.id, () => miMsg('base', `A 45 m de ${o.id} · ${miEsc(p.nombre)}. ${miEsc((p.motivo || 'Fotografíen la capa y tomen muestra.').slice(0, 140))}`)); }
    for (let s = 8; s <= 30; s += 2) { const qq = enLinea(L, Math.min(L.largo, m.d + s));
      if ((qq.marcha || 0) > PR.pMax) { una('pend' + Math.round((m.d + s) / 25), () => miMsg('base', `Pendiente de ${miNum(qq.marcha)}° a ${s} m sobre la ruta (límite del traje ${PR.pMax}°). Pasen de a uno, despacio.`, 'alerta')); break; } }
    if (q.dosis >= m.dosisAviso + 10) { m.dosisAviso = Math.floor(q.dosis / 10) * 10; miMsg('base', `Dosis de la salida: ${miNum(q.dosis, 1)} µSv (${miNum(q.dosis / (PR.dosis * 10), 1)} % de lo que se recibe en un día en la superficie) ${miFq('hassler')}`); }
    if (q.cielo > 0.2) una('reparo' + Math.round(m.d / 120), () => miMsg('a2', `Buen reparo acá: el relieve tapa el ${miNum(q.cielo * 100)} % del cielo. Lugar para una pausa.`));
    const fr = q.t / EVA.nom;
    if (fr >= 0.5) una('mitad', () => miMsg('base', `Van ${miH(q.t)} afuera: la mitad de la salida nominal. Revisen el margen para volver.`));
    if (fr >= 0.75) una('tresc', () => miMsg('base', `Van ${miH(q.t)} afuera. Empiecen a volver: el regreso más la reserva de ${EVA.reserva} min tiene que entrar en ${EVA.nom} h.`, 'alerta'));
  }
  if (performance.now() - MI.par.ultMapa > 250) { MI.par.ultMapa = performance.now(); miMapa(L, q, lo2, la2); }
}
function miMapa(L, q, lo2, la2) {
  const cv = $('miMapa'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (!L._caja) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of L.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } L._caja = [x0, x1, y0, y1]; }
  const [x0, x1, y0, y1] = L._caja, cl = Math.cos(y0 * d2r), e = Math.min((W - 40) / Math.max(1e-9, (x1 - x0) * cl), (H - 40) / Math.max(1e-9, y1 - y0));
  const X = x => 20 + (x - x0) * cl * e + ((W - 40) - (x1 - x0) * cl * e) / 2, Y = y => 20 + (y1 - y) * e + ((H - 40) - (y1 - y0) * e) / 2;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = 'rgba(127,220,255,.35)'; g.lineWidth = 4; g.beginPath(); L.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
  g.strokeStyle = '#7fdcff'; g.lineWidth = 5; g.beginPath(); for (const [i, p] of L.pts.entries()) { if (p[2] > MI.modo.d) break; i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); } g.stroke();
  g.font = '600 20px ui-monospace,Menlo,monospace'; g.textAlign = 'center';
  for (const o of L.paradas || []) { const p = MI.paradas[o.id]; if (!p) continue; g.fillStyle = 'rgba(255,207,122,.9)'; g.beginPath(); g.arc(X(p.lon), Y(p.lat), 7, 0, 7); g.fill(); g.fillText(o.id, X(p.lon), Y(p.lat) - 13); }
  const b = L.pts[0]; g.fillStyle = '#ffcf7a'; g.fillRect(X(b[0]) - 9, Y(b[1]) - 9, 18, 18); g.fillStyle = '#1b1210'; g.fillText('S', X(b[0]), Y(b[1]) + 7);
  for (const [x, y, c, t] of [[q.lon, q.lat, '#9fe0a8', '1'], [lo2, la2, '#7fdcff', '2']]) { g.fillStyle = c; g.beginPath(); g.arc(X(x), Y(y), 11, 0, 7); g.fill(); g.fillStyle = '#0b1a20'; g.fillText(t, X(x), Y(y) + 7); }
}
// En el celular el reproductor cambia de alto según cuántas filas ocupa: las comunicaciones se apoyan siempre encima.
try { new ResizeObserver(() => document.body.style.setProperty('--miPlayH', $('miPlay').offsetHeight + 'px')).observe($('miPlay')); } catch (e) {}
$('miComms').addEventListener('click', e => {
  const b = e.target.closest('[data-r]'), m = MI.modo; if (!b || !m) return;
  const q = enLinea(m.L, m.d), p0 = m.L.pts[0], dB = Math.hypot((q.lon - p0[0]) * Math.cos(q.lat * d2r), q.lat - p0[1]) * M_GRADO, PR = MI.D.parametros.PR;
  if (b.dataset.r === 'llegamos') { miMsg('a1', 'Llegamos al punto. Empezamos la tarea.'); setTimeout(() => miMsg('base', `Recibido. Están a ${miM(dB)} de la base en línea recta.`), 900); }
  if (b.dataset.r === 'pronostico') { miMsg('a2', 'Pedimos el pronóstico a la Tierra.'); const e0 = estacion(MI.par.ls), l = e0.lineas[1] || e0.lineas[0];
    setTimeout(() => miMsg('tierra', `${l[0]} ${miFq(l[1])} En la realidad esta respuesta tarda ${miNum(MI.par.demora * 2)} min (ida y vuelta). Con Aeolus (2028) habría pronóstico del día ${miFq('aeolus')}.`), 2200); }
  if (b.dataset.r === 'ayuda') { miMsg('a2', 'Necesitamos ayuda.', 'alerta');
    setTimeout(() => miMsg('base', `Rover en camino: ${miM(dB)} a ${miNum(PR.vTrip / 1000)} km/h, unos ${miNum(Math.max(1, dB / PR.vTrip * 60))} min (rover presurizado: supuesto). Busquen reparo del relieve mientras tanto.`, 'alerta'), 1100); }
});

// ---------- puntero: mano y realce sobre todo lo que se puede tocar (pines de Gale Earth y de la misión) ----------
{
  const h = new C.ScreenSpaceEventHandler(viewer.canvas); let pend = null, prev = null;
  const tip = $('miTip');
  const realce = (e, on) => { if (!e || !e.billboard) return; if (on) { e._esc = e.billboard.scale?.getValue?.() ?? 1; e.billboard.scale = e._esc * 1.18; } else if (e._esc != null) { e.billboard.scale = e._esc; e._esc = null; } };
  h.setInputAction(m => {
    pend = m.endPosition; if (pend._raf) return;
    requestAnimationFrame(() => {
      const p = pend; if (!p || MI.modo?.vista === 'ojos') return;
      let o; try { o = viewer.scene.pick(p); } catch { o = null; }
      const ent = o && o.id instanceof C.Entity && o.id.properties && o.id.properties.tipo ? o.id : null, mod = o && o.id && o.id.mision ? o.id.mision : null;
      if (ent !== prev) { realce(prev, false); realce(ent, true); prev = ent; }
      viewer.canvas.style.cursor = ent || mod ? 'pointer' : '';
      let t = null;
      if (ent) { const pr = ent.properties, tipo = pr.tipo.getValue(), nom = pr.nombre?.getValue?.() ?? ent.label?.text?.getValue?.() ?? ent.name;
        t = nom ? `${miEsc(nom)}<small>${tipo === 'mruta' ? 'Tocá para recorrerla' : 'Tocá para ver la ficha'}</small>` : null; }
      else if (mod) t = { curiosity: 'Curiosity · sol 5070', gx2: 'Rover GX-2 · próximas excavaciones', astronauta: 'Astronauta', a2: 'Astronauta 2', base_gale: 'Base Gale · Zona 2' }[mod] + '<small>Tocá para ver la ficha</small>';
      if (t) { tip.innerHTML = t; tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px'; tip.classList.remove('oculto'); } else tip.classList.add('oculto');
    });
  }, C.ScreenSpaceEventType.MOUSE_MOVE);
  viewer.canvas.addEventListener('mouseleave', () => tip.classList.add('oculto'));
}
// clic: primero la misión; si no es de la misión, lo de siempre de Gale Earth
{
  const ss = viewer.screenSpaceEventHandler, previo = ss.getInputAction(C.ScreenSpaceEventType.LEFT_CLICK);
  ss.setInputAction(m => {
    let o; try { o = viewer.scene.pick(m.position); } catch { o = null; }
    if (o && o.id instanceof C.Entity && o.id.properties?.tipo) {
      const tipo = o.id.properties.tipo.getValue(), id = o.id.properties.id?.getValue?.();
      if (MI.modo && tipo !== 'mparada') return;
      if (tipo === 'mparada') { $('miTip').classList.add('oculto'); if (MI.modo) { $('cajon').classList.add('mi-libre'); fichaParada(id); } else { if (!MI.activo) miEntrar(false); fichaParada(id); } return; }
      if (tipo === 'mbase') { fichaBase(); return; }
      if (tipo === 'mruta') { if (id === 'B' || id === 'A') return miModo(id); if (MI.lineas[id]) return miModo(id); return; }
    }
    if (o && o.id && o.id.mision) { const k = o.id.mision; if (k === 'base_gale') return fichaBase(); if (k === 'curiosity' || k === 'gx2') return fichaRover(); return; }
    if (MI.modo) return;
    if (previo) previo(m);
  }, C.ScreenSpaceEventType.LEFT_CLICK);
}

// ---------- enganches con Gale Earth: un solo mapa ----------
{
  // "Misión Curiosity" ya no abre otra página: entra a Curiosity hoy en este mismo globo
  const b = $('bMision'); if (b) { b.removeAttribute('href'); b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.title = 'Misión Curiosity en este mapa: paradas, rutas A, B y C, Base Gale, rover, astronauta y misión en pareja';
    const s = b.querySelector('span'); if (s) s.innerHTML = '<b>Misión Curiosity</b><small>Rutas, base y astronauta · en este mapa</small>';
    b.onclick = e => { e.preventDefault(); miEntrar(); }; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); miEntrar(); } }; }
  // "Curiosity hoy" (chip, buscador y vuelta con #curiosity) es la misma entrada; el vuelo desde lejos no pierde a Marte de vista
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
  $('vHoy').onclick = () => miEntrar();
  entrarMision = () => miEntrar();          // el enlace de las fichas de Gale Earth también entra acá, sin cambiar de página
  for (const id of ['vGale', 'vRec', 'vMarte', 'logoRiel']) $(id)?.addEventListener('click', miDejar);
  document.querySelectorAll('.rb[data-t]').forEach(b => b.addEventListener('click', () => { if (MI.modo) miSalirModo(false); $('cajon').classList.remove('mi-libre'); }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && MI.modo) { e.preventDefault(); miSalirModo(true); } if (e.key === ' ' && MI.modo && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); miJugar(!MI.modo.jugando); } });
  let ultimo = performance.now();
  viewer.scene.preRender.addEventListener(() => { const ahora = performance.now(), dt = Math.min(0.1, (ahora - ultimo) / 1000); ultimo = ahora; try { miTick(dt); } catch (e) { console.error('[Misión]', e); } });
  // la misión se carga en segundo plano apenas termina de abrir el globo (así "Curiosity hoy" responde enseguida)
  // enlaces directos (por ejemplo desde la escena clásica o una presentación): #pareja, #rover, #apie, #tripulado, #expedicion, #base
  const DIRECTO = { pareja: ['B', 'pareja'], rover: ['A'], apie: ['B'], tripulado: ['C'], expedicion: ['E-vehiculo'] };
  const pedido = (location.hash.match(/^#(pareja|rover|apie|tripulado|expedicion|base)$/) || [])[1];
  setTimeout(() => { miCargar().then(async ok => { if (!ok) return; miQuieto(true);
    if (pedido) { await miEntrar(false); setTimeout(() => pedido === 'base' ? (fichaBase(), miVerBase()) : miModo(...DIRECTO[pedido]), 2800); } }); }, pedido ? 2600 : 3500);
  window.__mision = { MI, alturaSuelo, pos, entrar: miEntrar, modo: miModo, salir: miSalirModo, jugar: miJugar, ficha: fichaParada, base: fichaBase, hoy: fichaHoy, rover: miRover, enLinea };
}

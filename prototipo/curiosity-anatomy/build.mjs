// Curiosity sobre una mesa de inclinación. Figura hecha con el kit "anatomy" (MIT, github.com/wheresryan22/anatomy).
// Unidades: 1 unidad = 1 cm. x hacia adelante del rover, y hacia su izquierda, z arriba.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";
import * as A from "../../kit/audit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const AUDIT = process.argv.includes("--audit");

const W = 640, H = 520;
const POSES = [0, 4, 8, 12, 16, 20, 24, 28];
const LIMIT = 20, MAX_SEEN = 24;

// Banco
const BASE = { x: -215, y: -175, w: 450, d: 360, r: 12 };
const BASE_H = 12, FOOT_H = 6;
const PIVOT_Z = 150;                     // eje de la mesa
const RAMP = { x0: -195, x1: 215, y0: -158, y1: 158, z0: 4, z1: 10 }; // en el marco de la mesa, relativo al eje
const GROUND = RAMP.z1;                  // el rover apoya aquí (marco de la mesa)
const JACK_X = 170;                      // punto de empuje del actuador bajo la mesa
const JACK_BASE = [JACK_X + 10, 0, 0];

// Rover (medidas aproximadas de Curiosity, en cm)
const WHEEL_R = 25, WHEEL_W = 40;
const WX = [112, 8, -98];                // ruedas delantera, media, trasera
const WY = 128;                          // centro de rueda en y
const BODY = { x0: -92, x1: 96, y0: -78, y1: 78, z0: 66, z1: 122 };
const DECK = 124;
const MAST = [74, -52];
const MAST_TOP = 214;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [RAMP.x1, RAMP.y1, PIVOT_Z + 110], [RAMP.x0, RAMP.y0, PIVOT_Z + 60], [110, -60, PIVOT_Z + 330], [-200, 0, PIVOT_Z + 200], [0, 230, PIVOT_Z + 60]],
  W, H, { pad: 22, azimuth: 32, elevation: 26 },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const roundRect = (x0, x1, y0, y1, r, steps = 3) => k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, steps).map(([x, y]) => [x, y]);

function buildPose(theta) {
  const t = (theta * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  // Marco de la mesa: rotación alrededor del eje y que pasa por (0, *, PIVOT_Z)
  const T = ([x, y, z]) => [x * c - z * s, y, PIVOT_Z + x * s + z * c];
  const Rv = ([x, y, z]) => [x * c - z * s, y, x * s + z * c];
  const O = T([0, 0, 0]);
  const EX = Rv([1, 0, 0]), EY = [0, 1, 0], EZ = Rv([0, 0, 1]);
  const UP = G.frameOf(O, EZ, EX, EY);           // prismas "verticales" en el marco de la mesa
  const R1 = A.recorder(P), R2 = A.recorder(P);
  let R = R1;
  const put = (name, ref, svg, shapes = [], bias = 0) => R.put({ name, at: ref, bias, svg, shapes, piece: "fig" });
  const tilted = (name, poly, z0, z1, style = {}, { inner = "", extra = "", bias = 0 } = {}) => {
    const shape = R.solid(A.prism(UP, poly, z0, z1, { name }));
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    put(name, T([cx, cy, (z0 + z1) / 2]), S(G.prismOf(UP, poly, z0, z1, P), { tone: "mid", ...style, inner }) + extra, [shape], bias);
  };
  const tbox = (name, x0, x1, y0, y1, z0, z1, style = {}, opt = {}) => tilted(name, roundRect(x0, x1, y0, y1, opt.r ?? 1.2, opt.steps ?? 3), z0, z1, style, opt);
  const disc = (name, centre, axis, s0, s1, r, style = {}, { inner = "", extra = "", bias = 0, local = true, bevel = 0 } = {}) => {
    const F = G.frameAlong(local ? T(centre) : centre, local ? Rv(axis) : axis);
    const shape = R.solid(A.disc(F, s0, s1, r, { name }));
    put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P, { bevel }), { tone: "mid", ...style, inner }) + extra, [shape], bias);
    return F;
  };
  const tube = (name, pts, r, { tone = "mid", bias = 0.02, local = true, maxLength = 14 } = {}) => {
    const route = G.fillet(local ? pts.map(T) : pts, Math.max(3, r * 2.6), 8, { P, tube: r });
    R.route(name, route, r, { piece: "fig", limp: false });
    tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)) }).forEach((piece, i) =>
      put(`${name}:${i}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], bias));
  };

  // ---------- Banco fijo ----------
  const back = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(BASE, 26))) {
    back.push(S(k.cylinder(x, y, 9, -BASE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    back.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
  }
  back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(BASE, -5, P, 8), { tone: "faint" }) }));
  back.push(Ln(k.planOutline(k.insetPlan(BASE, 7), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 12);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }), Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  R.solid(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.base", ground: true }, 8));
  const STRIP = { x: BASE.x + 30, y: BASE.y + BASE.d - 16, w: BASE.w - 150, d: 7, r: 1 };
  back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y, 0.6, [2, 3.8], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  const LABEL = { x: BASE.x + BASE.w - 104, y: BASE.y + BASE.d - 26, w: 80, d: 18, r: 1.5 };
  back.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  back.push(Ln([0, 1, 2].map((i) => k.lineOnTop([LABEL.x + 8, LABEL.y + 5 + i * 4], [LABEL.x + LABEL.w - 8 - i * 14, LABEL.y + 5 + i * 4], 0.8, P)).join(""), { tone: "faint", free: true }));
  back.push(Dots([[LABEL.x + 3, LABEL.y + 3], [LABEL.x + LABEL.w - 3, LABEL.y + 3], [LABEL.x + 3, LABEL.y + LABEL.d - 3], [LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d - 3]].map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));

  // Pedestal y muñones (fijos)
  for (const y of [-150, 150]) {
    const name = `stand.post${y}`;
    if (Math.abs(y) !== 150) continue;
    R.solid(A.slab({ x: -22, y: y - 10, w: 44, d: 20, r: 2 }, 0, 18, { name: `${name}.foot` }, 3));
    put(`${name}.foot`, [0, y, 9], S(k.slabOf({ x: -22, y: y - 10, w: 44, d: 20, r: 2 }, 0, 18, P, 3, 0.6), { tone: "mid" }) + Dots([[-16, y], [16, y]].map(([x, yy]) => at([x, yy, 18])), { size: 0.45 }));
    R.solid(A.slab({ x: -12, y: y - 7, w: 24, d: 14, r: 1.5 }, 18, PIVOT_Z - 18 - 12, { name }, 3));
    put(name, [0, y, 80], S(k.slabOf({ x: -12, y: y - 7, w: 24, d: 14, r: 1.5 }, 18, PIVOT_Z - 18 - 12, P, 3, 0.5), { tone: "mid", inner: Ln(k.sideSeam({ x: -12, y: y - 7, w: 24, d: 14, r: 1.5 }, 60, P, 3), { tone: "faint" }) }));
    disc(`stand.trunnion${y}`, [0, y, PIVOT_Z], [0, 1, 0], -9, 9, 14, { tone: "mid" }, { local: false, bevel: 0.4 });
  }
  disc("stand.axle.cap", [0, 172, PIVOT_Z], [0, 1, 0], 0, 3, 6, { tone: "hi" }, { local: false });

  // Transportador (placa fija) en el lado cercano, con escala 0–40°
  const PRO_Y = 178, PRO_R = 92;
  const arcPt = (deg, r) => [r * Math.cos((deg * Math.PI) / 180), PRO_Y, PIVOT_Z + r * Math.sin((deg * Math.PI) / 180)];
  const sector = [];
  sector.push([0, PRO_Y, PIVOT_Z - 34]); for (let d = -22; d <= 44; d += 2) sector.push(arcPt(d, PRO_R));
  const plate = sector.map(([x, , z]) => [x, z - PIVOT_Z]);
  const PF = G.frameOf([0, PRO_Y, PIVOT_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  R.solid(A.prism(PF, plate, -1.5, 1.5, { name: "stand.protractor" }));
  R.solid(A.slab({ x: -8, y: 157, w: 16, d: PRO_Y - 158.5, r: 1 }, PIVOT_Z - 34, 10, { name: "stand.protractor.bracket" }, 2));
  put("stand.protractor.bracket", [0, (157 + PRO_Y) / 2, PIVOT_Z - 29], S(k.slabOf({ x: -8, y: 157, w: 16, d: PRO_Y - 158.5, r: 1 }, PIVOT_Z - 34, 10, P, 2, 0.4), { tone: "mid" }) + Dots([at([-4, 160, PIVOT_Z - 24]), at([4, 160, PIVOT_Z - 24])], { size: 0.45 }), [], -0.2);
  const tk = [];
  for (let d = 0; d <= 40; d += 2) { const big = d % 10 === 0; tk.push(path3([arcPt(d, PRO_R - 2), arcPt(d, PRO_R - (big ? 9 : 5))].map(([x, , z]) => [x, PRO_Y + 1.6, z]))); }
  const red = [];
  for (let d = LIMIT; d <= 40; d += 1) red.push(arcPt(d, PRO_R - 12).map((v, i) => (i === 1 ? PRO_Y + 1.6 : v)));
  put("stand.protractor", [30, PRO_Y, PIVOT_Z + 20],
    S(G.prismOf(PF, plate, -1.5, 1.5, P), { tone: "mid" }) + Ln(tk.join(""), { tone: "lo" }) + Ln(path3(red), { tone: "red" }) +
    Ln(path3([arcPt(MAX_SEEN, PRO_R - 2), arcPt(MAX_SEEN, PRO_R - 14)].map(([x, , z]) => [x, PRO_Y + 1.6, z])), { tone: "hi" }) +
    Dots([at([0, PRO_Y + 1.6, PIVOT_Z])], { size: 1.2, tone: "hi" }), [], 0.4);
  // aguja (lit): sigue la mesa
  const needleEnd = [Math.cos(t) * (PRO_R - 3), PRO_Y + 2.2, PIVOT_Z + Math.sin(t) * (PRO_R - 3)];
  put("stand.needle", [10, PRO_Y + 3, PIVOT_Z + 10], `<path class="iso-line" data-tone="lit" data-free="end" d="${path3([[0, PRO_Y + 2.2, PIVOT_Z], needleEnd])}" style="stroke-width:1.3"/>`, [], 0.6);

  // Actuador: de la base a la parte inferior de la mesa
  const top = T([JACK_X, 0, RAMP.z0 - 6]);
  const foot = [JACK_BASE[0], 0, 22];
  R.solid(A.slab({ x: JACK_BASE[0] - 16, y: -14, w: 32, d: 28, r: 2 }, 0, 10, { name: "stand.jack.foot" }, 3));
  put("stand.jack.foot", [JACK_BASE[0], 0, 5], S(k.slabOf({ x: JACK_BASE[0] - 16, y: -14, w: 32, d: 28, r: 2 }, 0, 10, P, 3, 0.5), { tone: "mid" }));
  disc("stand.jack.pin", [JACK_BASE[0], 0, 16], [0, 1, 0], -10, 10, 6, { tone: "mid" }, { local: false });
  const dir = G.unit3(G.sub3(top, foot)), len = G.len3(G.sub3(top, foot));
  const JF = G.frameAlong(foot, dir);
  R.solid(A.disc(JF, 0, 70, 7, { name: "stand.jack.body" }));
  put("stand.jack.body", G.add3(foot, G.mul3(dir, 35)), S(G.disc(0, 70, 7, JF, P), { tone: "mid", inner: Ln(G.arcOf(JF, 60, 7, P), { tone: "faint" }) }));
  R.solid(A.disc(JF, 70, len - 4, 3.6, { name: "stand.jack.rod", owner: "stand.jack.body" }));
  put("stand.jack.rod", G.add3(foot, G.mul3(dir, (70 + len) / 2)), S(G.disc(70, len - 4, 3.6, JF, P), { tone: "hi" }));
  disc("ramp.jack.lug", [JACK_X, 0, RAMP.z0 - 6], [0, 1, 0], -8, 8, 6, { tone: "mid" });

  // ---------- Mesa (inclinada) ----------
  tbox("ramp.deck", RAMP.x0, RAMP.x1, RAMP.y0, RAMP.y1, RAMP.z0, RAMP.z1, { tone: "mid" }, { r: 6, steps: 6,
    extra: Ln([...Array(Math.floor((RAMP.x1 - RAMP.x0 - 30) / 20))].map((_, i) => path3([[RAMP.x0 + 20 + i * 20, RAMP.y0 + 8, RAMP.z1], [RAMP.x0 + 20 + i * 20, RAMP.y1 - 8, RAMP.z1]].map(T))).join(""), { tone: "faint" }) });
  for (const y of [RAMP.y0, RAMP.y1 - 6]) tbox(`ramp.rail${y}`, RAMP.x0 + 4, RAMP.x1 - 4, y, y + 6, RAMP.z1, RAMP.z1 + 7, { tone: "mid" }, { r: 1 });
  tbox("ramp.lip", RAMP.x1 - 10, RAMP.x1 - 4, RAMP.y0 + 6, RAMP.y1 - 6, RAMP.z1, RAMP.z1 + 5, { tone: "mid" }, { r: 1 });
  tbox("ramp.beam", -30, 30, RAMP.y0 + 10, RAMP.y1 - 10, RAMP.z0 - 8, RAMP.z0, { tone: "lo" }, { r: 2 });

  // ---------- Rover ----------
  R = R2;
  const g = GROUND;
  // Ruedas
  WX.forEach((x, i) => [1, -1].forEach((side) => {
    const name = `rover.wheel${i}${side > 0 ? "L" : "R"}`;
    const F = G.frameAlong(T([x, side * (WY - WHEEL_W / 2), g + WHEEL_R]), [0, side, 0]);
    R.solid(A.disc(F, 0, WHEEL_W, WHEEL_R, { name }));
    const ribs = G.ribsOf(F, 1, WHEEL_W - 1, WHEEL_R, 24, P, { phase: i * 0.4, fade: [0.05, 0.5] });
    const faceS = side > 0 ? WHEEL_W : 0;
    const spokes = G.spokesOf(F, faceS, 5, WHEEL_R - 3, 6, P, { sweep: 0.35, phase: i });
    put(name, G.add3(F.o, G.mul3(F.a, WHEEL_W / 2)),
      S(G.disc(0, WHEEL_W, WHEEL_R, F, P, { bevel: 0.6 }), { tone: "hi", inner: Ln(G.arcOf(F, 6, WHEEL_R, P) + G.arcOf(F, WHEEL_W - 6, WHEEL_R, P), { tone: "faint" }) }) +
      k.fadedSvg(ribs, { tone: "lo" }) + Ln(spokes, { tone: "lo" }) + Ln(G.circleOf(F, faceS, WHEEL_R - 3, P, 48), { tone: "lo" }));
    disc(`${name}.hub`, [x, side * (WY + (side > 0 ? WHEEL_W / 2 : -WHEEL_W / 2)), g + WHEEL_R], [0, side, 0], 0, 3, 7, { tone: "hi" }, { bias: 0.3 });
    // motor de rueda (lado interno)
    disc(`${name}.motor`, [x, side * (WY - WHEEL_W / 2), g + WHEEL_R], [0, -side, 0], 0, 14, 8, { tone: "mid" });
    // actuador de dirección en esquinas
    if (i !== 1) disc(`${name}.steer`, [x, side * (WY - WHEEL_W / 2 - 16), g + WHEEL_R + 6], [0, 0, 1], 0, 26, 7, { tone: "mid" }, { bevel: 0.4 });
  }));
  // Rocker-bogie (tubos) a cada lado
  [1, -1].forEach((side) => {
    const yS = side * (WY - WHEEL_W / 2 - 16);
    const piv = [20, yS, g + 92];
    const bog = [-45, yS, g + 64];
    tube(`rover.rocker${side}`, [[WX[0], yS, g + WHEEL_R + 32], [70, yS, g + 86], piv, bog], 3.4, { tone: "hi" });
    tube(`rover.bogie${side}`, [[WX[1], side * (WY - WHEEL_W / 2 - 14), g + WHEEL_R + 14], [-20, yS, g + 58], bog, [-75, yS, g + 58], [WX[2], yS, g + WHEEL_R + 32]], 3, { tone: "hi" });
    disc(`rover.pivot${side}`, piv, [0, side, 0], -4, 6, 7, { tone: "mid" }, { bevel: 0.3 });
    disc(`rover.bpivot${side}`, bog, [0, side, 0], -4, 5, 5.5, { tone: "mid" });
    tube(`rover.difflink${side}`, [[20, side * 84, g + 92], [30, side * 70, DECK + g - GROUND + 4]], 1.6, { tone: "lo" });
  });
  // Cuerpo (WEB) y cubierta
  tbox("rover.body", BODY.x0, BODY.x1, BODY.y0, BODY.y1, g + BODY.z0, g + BODY.z1, { tone: "hi" }, { r: 3, steps: 3,
    inner: Ln(k.pathOf([[BODY.x1, BODY.y0 + 4, g + 94], [BODY.x1, BODY.y1 - 4, g + 94]].map(T).map(at)) + k.pathOf([[BODY.x0 + 4, BODY.y1, g + 94], [BODY.x1 - 4, BODY.y1, g + 94]].map(T).map(at)), { tone: "faint" }) });
  tbox("rover.deck", BODY.x0 - 4, BODY.x1 + 4, BODY.y0 - 4, BODY.y1 + 4, g + BODY.z1, g + DECK, { tone: "hi" }, { r: 3, steps: 3 });
  put("rover.deck.screws", T([0, 0, g + DECK]), Dots([[BODY.x0, BODY.y0], [BODY.x0, BODY.y1], [BODY.x1, BODY.y0], [BODY.x1, BODY.y1], [0, BODY.y1], [0, BODY.y0]].map(([x, y]) => at(T([x, y, g + DECK]))), { size: 0.5 }), [], 0.05);
  // Barra diferencial sobre la cubierta
  tbox("rover.diffbar", 26, 34, -84, 84, g + DECK, g + DECK + 5, { tone: "mid" }, { r: 1 });
  // RAD: caja con sensor
  tbox("rover.rad", 40, 62, 36, 58, g + DECK, g + DECK + 12, { tone: "mid" }, { r: 1.5, extra: Ln(path3(G.arcPoints(G.frameAlong(T([51, 47, g + DECK + 12]), EZ), 0, 6, 0, 2 * Math.PI, 24)), { tone: "lo" }) });
  // Antena de alta ganancia (HGA) sobre poste
  disc("rover.hga.post", [-40, 48, g + DECK], [0, 0, 1], 0, 18, 4, { tone: "mid" });
  disc("rover.hga.dish", [-40, 48, g + DECK + 22], [0.5, 0.3, 0.8], -2, 2, 22, { tone: "hi" }, { bevel: 0.6 });
  // Antena UHF
  disc("rover.uhf", [-70, -40, g + DECK], [0, 0, 1], 0, 26, 3, { tone: "mid" });
  // MMRTG en la parte trasera, inclinado
  const RTG_AXIS = [-0.82, 0, 0.57];
  const rtgC = [-150, 0, g + 112];
  const RF = G.frameAlong(T(rtgC), Rv(RTG_AXIS));
  R.solid(A.disc(RF, -32, 32, 26, { name: "rover.mmrtg" }));
  put("rover.mmrtg", RF.o, S(G.disc(-32, 32, 26, RF, P), { tone: "hi", inner: Ln(G.arcOf(RF, -20, 26, P) + G.arcOf(RF, 20, 26, P), { tone: "faint" }) }) +
    k.fadedSvg(G.ribsOf(RF, -30, 30, 26, 16, P, { fade: [0.05, 0.5] }), { tone: "lo" }));
  for (let f = 0; f < 8; f++) {
    const a = (f / 8) * Math.PI * 2 + 0.2;
    const fin = [[26 * Math.cos(a - 0.05), 26 * Math.sin(a - 0.05)], [44 * Math.cos(a - 0.02), 44 * Math.sin(a - 0.02)], [44 * Math.cos(a + 0.02), 44 * Math.sin(a + 0.02)], [26 * Math.cos(a + 0.05), 26 * Math.sin(a + 0.05)]];
    R.solid(A.prism(RF, fin, -28, 28, { name: `rover.mmrtg.fin${f}`, owner: "rover.mmrtg" }));
    const mid = G.pointOf(RF, 0, 35, a);
    put(`rover.mmrtg.fin${f}`, mid, S(G.prismOf(RF, fin, -28, 28, P), { tone: "mid" }));
  }
  [-34, 34].forEach((sAx, i) => { const F2 = G.frameOf(G.add3(RF.o, G.mul3(RF.a, sAx)), RF.a, RF.u, RF.v); R.solid(A.disc(F2, -2, 2, 20, { name: `rover.mmrtg.cap${i}`, owner: "rover.mmrtg" })); put(`rover.mmrtg.cap${i}`, F2.o, S(G.disc(-2, 2, 20, F2, P), { tone: "mid" })); });
  tube("rover.mmrtg.strutL", [[BODY.x0, 50, g + 100], [-128, 26, g + 100]], 2.2, { tone: "lo" });
  tube("rover.mmrtg.strutR", [[BODY.x0, -50, g + 100], [-128, -26, g + 100]], 2.2, { tone: "lo" });
  // DAN bajo la parte trasera
  tbox("rover.dan", -80, -50, -30, 10, g + BODY.z0 - 10, g + BODY.z0, { tone: "lo" }, { r: 1.5 });
  // Mástil con cabezal (Mastcam, ChemCam, Navcam) y brazos REMS
  disc("rover.mast", [MAST[0], MAST[1], g + DECK], [0, 0, 1], 0, MAST_TOP - DECK - 20, 6, { tone: "hi" }, { inner: "" });
  disc("rover.mast.collar", [MAST[0], MAST[1], g + DECK], [0, 0, 1], 0, 6, 10, { tone: "mid" }, { bevel: 0.4 });
  tbox("rover.rems.boomA", MAST[0] - 2, MAST[0] + 2, MAST[1] + 6, MAST[1] + 22, g + 168, g + 171, { tone: "lo" }, { r: 0.6 });
  tbox("rover.rems.boomB", MAST[0] - 22, MAST[0] - 6, MAST[1] - 2, MAST[1] + 2, g + 166, g + 169, { tone: "lo" }, { r: 0.6 });
  const HX = MAST[0], HY = MAST[1], HZ = g + MAST_TOP - 20;
  tbox("rover.mast.head", HX - 14, HX + 16, HY - 20, HY + 20, HZ, HZ + 22, { tone: "hi" }, { r: 2.5, steps: 3 });
  disc("rover.chemcam", [HX + 16, HY + 2, HZ + 12], [1, 0, 0], 0, 3, 8.5, { tone: "mid" }, { bias: 0.2, extra: "" });
  [[HY - 12], [HY - 4]].forEach(([y], i) => disc(`rover.mastcam${i}`, [HX + 16, y - 4, HZ + 5], [1, 0, 0], 0, 3.5, 3, { tone: "mid" }, { bias: 0.2 }));
  [[HY + 13], [HY + 17]].forEach(([y], i) => disc(`rover.navcam${i}`, [HX + 16, y, HZ + 4], [1, 0, 0], 0, 2.5, 1.6, { tone: "mid" }, { bias: 0.2 }));
  // Hazcams delanteras
  tbox("rover.hazcam", BODY.x1, BODY.x1 + 6, -26, 26, g + BODY.z0 - 4, g + BODY.z0 + 6, { tone: "mid" }, { r: 1 });
  [-20, -12, 12, 20].forEach((y, i) => disc(`rover.hazlens${i}`, [BODY.x1 + 6, y, g + BODY.z0 + 1], [1, 0, 0], 0, 1.5, 2.2, { tone: "lo" }, { bias: 0.2 }));
  // Brazo robótico plegado al frente, con torreta
  disc("rover.arm.shoulder", [BODY.x1 + 4, 40, g + 108], [1, 0, 0], 0, 12, 8, { tone: "mid" });
  tube("rover.arm.upper", [[BODY.x1 + 16, 40, g + 108], [BODY.x1 + 40, 30, g + 112], [BODY.x1 + 44, -24, g + 112]], 4);
  tube("rover.arm.fore", [[BODY.x1 + 44, -24, g + 112], [BODY.x1 + 52, -30, g + 96]], 3.4);
  disc("rover.turret", [BODY.x1 + 54, -34, g + 92], [0, 1, 0], -10, 10, 13, { tone: "mid" }, { bevel: 0.4 });
  disc("rover.drill", [BODY.x1 + 54, -34, g + 79], [0, 0, -1], 0, 16, 3.2, { tone: "hi" });
  disc("rover.drt", [BODY.x1 + 66, -34, g + 92], [1, 0, 0], 0, 6, 5.5, { tone: "mid" });

  for (const RR of [R1, R2]) { A.settle(RR, P); RR.items.sort((a, b) => a.key - b.key); }
  return { back: back.join(""), body: R1.items.map((it) => it.svg).join("") + R2.items.map((it) => it.svg).join(""), R: R2 };
}

const built = POSES.map((th) => ({ th, ...buildPose(th) }));
if (AUDIT) { A.auditOrExit(built[0].R, P, {}); }

const groups = built.map(({ th, back, body }, i) => `<g data-pose="${th}"${i ? ' style="display:none"' : ""}>${back}${body}</g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "El rover Curiosity sobre una mesa de inclinación de banco de pruebas. Seis ruedas con suspensión rocker-bogie, cuerpo con cubierta, mástil con cámaras, brazo plegado al frente y generador nuclear con aletas atrás. Un actuador inclina la mesa; una aguja sobre un transportador marca la pendiente, con el tramo por encima de 20 grados en rojo.",
  body: groups,
});

const LIVE = `
const POSES = ${JSON.stringify(POSES)}, LIMIT = ${LIMIT}, MAX_SEEN = ${MAX_SEEN};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = POSES.map((p) => svg.querySelector('[data-pose="' + p + '"]'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let index = 0, shown = 0, touring = !still.matches, timer = 0, idle = 0;
const say = (th) => th > MAX_SEEN ? th + "° · más allá de lo que hizo Curiosity" : th >= MAX_SEEN ? th + "° · máximo registrado (agosto 2026)" : th > LIMIT ? th + "° · fuera del límite de la ruta (20°)" : th + "° · dentro del límite de la ruta (20°)";
function show(i) {
  index = Math.max(0, Math.min(POSES.length - 1, i));
  if (index === shown) return;
  groups[shown].style.display = "none"; groups[index].style.display = ""; shown = index;
  const text = "pendiente " + say(POSES[index]);
  readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(POSES[index])); stage.setAttribute("aria-valuetext", text);
}
function tour() { if (!touring) return; const dirUp = Math.floor(Date.now() / 1000 / (POSES.length * 0.9)) % 2 === 0; show(dirUp ? index + 1 >= POSES.length ? index : index + 1 : index - 1 < 0 ? 0 : index - 1); timer = setTimeout(tour, index === 0 || index === POSES.length - 1 ? 1600 : 700); }
const steer = (i) => { touring = false; clearTimeout(timer); clearTimeout(idle); show(i); idle = setTimeout(() => { touring = !still.matches; tour(); }, 4000); };
stage.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); const share = Math.min(1, Math.max(0, ((e.clientX - b.left) / b.width - 0.15) / 0.7)); steer(Math.round(share * (POSES.length - 1))); });
stage.addEventListener("keydown", (e) => { let to = null; if (e.key === "ArrowRight" || e.key === "ArrowUp") to = index + 1; if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = index - 1; if (e.key === "Home") to = 0; if (e.key === "End") to = POSES.length - 1; if (to === null) return; e.preventDefault(); steer(to); });
new IntersectionObserver((en) => { if (en[en.length - 1].isIntersecting && touring && !timer) tour(); }, { rootMargin: "120px 0px" }).observe(stage);
readout.textContent = "pendiente " + say(0);
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Curiosity en la mesa de inclinación",
  hint: "Mové el puntero o usá las flechas para inclinar",
  readout: "pendiente 0° · dentro del límite de la ruta (20°)",
  keys: [
    { mark: "lit", label: "Aguja: la pendiente de la mesa" },
    { mark: "red", label: "Más de 20°: fuera del límite de nuestra capa vehículo" },
    { mark: "raised", label: "Marca blanca a 24°: lo máximo que se inclinó Curiosity, agosto de 2026" },
  ],
  caption:
    "Curiosity mide unos 3 m de largo, 2,8 m de ancho y 2,2 m de alto, con ruedas de 50 cm. Su suspensión rocker-bogie mantiene las seis ruedas en el suelo, y NASA la diseñó para soportar 45° en cualquier dirección sin volcar. Aun así, para planificar rutas usamos 20° como límite provisorio: en agosto de 2026 el rover llegó a 24° y el equipo maneja esquivando pendientes y arena para reducir el patinaje y el desgaste de las ruedas. Atrás, el generador nuclear (MMRTG) con aletas da cada año algo menos de energía. Medidas aproximadas; figura hecha con el kit Anatomy (MIT).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Mesa de inclinación: las flechas cambian la pendiente" aria-valuemin="0" aria-valuemax="${POSES[POSES.length - 1]}" aria-valuenow="0">${svg}</div>`,
});
const out = join(HERE, THEME === "light" ? "curiosity-light.html" : "curiosity.html");
writeFileSync(out, k.pageHtml({ title: "Curiosity en la mesa de inclinación", theme: THEME, body, script: kitScript() + LIVE, width: 680 }));
console.log("wrote", out, built.map((b) => b.R.items.length).join(","));

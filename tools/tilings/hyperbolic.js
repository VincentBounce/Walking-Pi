// The hyperbolic plane's heptagons as main.js builds them (a copy: HYPERBOLIC, its grid as patchGrid wants it), and its grid for the searches
import { patchGrid } from './patch.js';
const flatPolys = (m, start, xy) => ({ m, start, xy, poly: (k) => { const P = []; for (let i = start[k]; i < start[k + 1]; i++) P.push([xy[2 * i], xy[2 * i + 1]]); return P; } });  // (as main.js's)
/* Poincaré's disc tiled by regular heptagons, three at each corner ({7,3}), ring by ring round the middle one, each corner made
 * once and numbered (see main.js) */
const HYPERBOLIC = (() => {
  const P = 7, r0 = Math.tanh(Math.acosh(1 / Math.tan(Math.PI / P) / Math.tan(Math.PI / 3)) / 2);  // (the middle heptagon's corners: cosh ρ = cot(π/7) cot(π/3))
  // z across the geodesic through a and b (the disc moved: a to its middle, b on the real line; there, mirrored; moved back)
  const mirror = (ax, ay, bx, by, zx, zy) => {
    const to0 = (qx, qy) => { const nx = qx - ax, ny = qy - ay, dx = 1 - (ax * qx + ay * qy), dy = ay * qx - ax * qy, d = dx * dx + dy * dy; return [(nx * dx + ny * dy) / d, (ny * dx - nx * dy) / d]; };
    const [tx, ty] = to0(bx, by), ux = tx * tx - ty * ty, uy = 2 * tx * ty, n = Math.hypot(ux, uy), [wx0, wy0] = to0(zx, zy), wx = (ux * wx0 + uy * wy0) / n, wy = (uy * wx0 - ux * wy0) / n;
    const nx = wx + ax, ny = wy + ay, dx = 1 + ax * wx + ay * wy, dy = ax * wy - ay * wx, d = dx * dx + dy * dy;
    return [(nx * dx + ny * dy) / d, (ny * dx - nx * dy) / d];
  };
  // the rings made so far: corners (x, y on the unit disc, by number), heptagons (7 corners each, counterclockwise), each ring's
  // first heptagon, and the loop round each ring and those inside it (its corners, of one heptagon inside or not, the heptagon
  // of the edge from each, where in it)
  let xy = new Float64Array(1024), nc = 0, hept = new Int32Array(1024), nh = 0;
  const firsts = [0, 1], loops = [];
  const corner = (x, y) => { if (2 * nc + 2 > xy.length) { const m = new Float64Array(2 * xy.length); m.set(xy); xy = m; } xy[2 * nc] = x; xy[2 * nc + 1] = y; return nc++; };
  const C = (h, k) => hept[P * h + (k % P)];
  // the next ring round the loop: each heptagon given to made(its corners' numbers, the loop's edges i … i + m under it) when
  // keep(i, m) says so (the walls': on a live one only); its corners new through corner (the walls': their places only)
  function ring(loop, keep, made, make) {
    const { c, one, h, at } = loop, n = c.length, ones = [];
    for (let i = 0; i < n; i++) if (one[i]) ones.push(i);
    const across = (i, s) => { const a = C(h[i], at[i]), b = C(h[i], at[i] + 1), z = C(h[i], at[i] + s); return mirror(xy[2 * a], xy[2 * a + 1], xy[2 * b], xy[2 * b + 1], xy[2 * z], xy[2 * z + 1]); };
    const out = new Map(), outOf = (f) => out.get(f) ?? out.set(f, make(...across(ones[f], P - 1))).get(f);  // (an outgoing edge's far end, made once)
    ones.forEach((i, f) => {
      const m = (ones[(f + 1) % ones.length] - i + n) % n || n;
      if (!keep(i, m)) return;
      const fresh = [];
      for (let s = P - 2; s >= m + 2; s--) fresh.push(make(...across(i, s)));
      const cs = [c[i], outOf(f), ...fresh, outOf((f + 1) % ones.length)];
      for (let s = 0; s < m; s++) cs.push(c[(i + m - s) % n]);
      made(cs, fresh);
    });
  }
  const rings = (count) => {  // whole rings, till they hold count heptagons
    if (!nh) {
      for (let k = 0; k < P; k++) hept[k] = corner(r0 * Math.cos(Math.PI / 2 + (2 * Math.PI * k) / P), r0 * Math.sin(Math.PI / 2 + (2 * Math.PI * k) / P));
      nh = 1;
      loops.push({ c: hept.slice(0, P), one: new Uint8Array(P).fill(1), h: new Int32Array(P), at: Int32Array.from({ length: P }, (_, k) => k) });
    }
    while (nh < count) {
      const c = [], one = [], h = [], at = [];
      ring(loops.at(-1), () => true, (cs, fresh) => {
        if (P * nh + P > hept.length) { const m = new Int32Array(2 * hept.length); m.set(hept); hept = m; }
        hept.set(cs, P * nh);
        c.push(cs[1], ...fresh); one.push(0, ...fresh.map(() => 1)); h.push(nh, ...fresh.map(() => nh)); at.push(1, ...fresh.map((_, s) => 2 + s));
        nh++;
      }, corner);
      loops.push({ c: Int32Array.from(c), one: Uint8Array.from(one), h: Int32Array.from(h), at: Int32Array.from(at) });
      firsts.push(nh);
    }
  };
  const cache = {};
  return (W) => (cache[W] ??= (() => {
    const N = W * W;
    rings(N);
    const k = firsts.findIndex((f) => f >= N) - 1, R = W / Math.sqrt(Math.PI), o = (W - 1) / 2;
    const mx = new Float64Array(firsts[k + 1]), my = new Float64Array(firsts[k + 1]);  // (its heptagons' middles, once)
    for (let t = 0; t < mx.length; t++) for (let q = 0; q < P; q++) { mx[t] += xy[2 * C(t, q)] / P; my[t] += xy[2 * C(t, q) + 1] / P; }
    const far = (t) => Math.hypot(mx[t], my[t]);
    // its last ring's nearest, those as near as the last of them (to 10⁻¹²) of the wall
    const last = Array.from({ length: firsts[k + 1] - firsts[k] }, (_, j) => firsts[k] + j).sort((a, b) => far(a) - far(b)), cut = N - firsts[k];
    let live = cut;
    while (live > 0 && live < last.length && far(last[live]) - far(last[live - 1]) < 1e-12) live--;
    const cells = Int32Array.from([...Array.from({ length: firsts[k] }, (_, t) => t), ...last.slice(0, cut)]).sort((a, b) => my[a] - my[b]), rows = [];
    for (let y = 0; y < W; y++) rows.push(...cells.subarray(y * W, (y + 1) * W).sort((a, b) => mx[a] - mx[b]));
    const dead = new Set(last.slice(live, cut)), on = new Uint8Array(nc), alive = new Uint8Array(nh);
    for (const t of rows) if (!dead.has(t)) { alive[t] = 1; for (let q = 0; q < P; q++) on[C(t, q)] = 1; }
    // its polygons: the cells, then the walls (that ring's others on a live one, the next ring's on a live one); a cell's corners by number
    const cs = [], walls = [];  // (its polygons' corners, 7 each, flat; a wall's own corners by their places, numbered −1, −2…)
    for (const t of rows) for (let q = 0; q < P; q++) cs.push(C(t, q));
    for (const t of last.slice(cut)) { let touch = false; for (let q = 0; q < P; q++) touch ||= !!on[C(t, q)]; if (touch) for (let q = 0; q < P; q++) cs.push(C(t, q)); }
    const L = loops[k];
    ring(L, (i, m) => { for (let s = 0; s < m; s++) if (alive[L.h[(i + s) % L.c.length]]) return true; return false; }, (h) => cs.push(...h), (x, y) => -(walls.push(x, y) / 2));
    const m = cs.length / P, start = Int32Array.from({ length: m + 1 }, (_, j) => P * j), flat = new Float64Array(2 * cs.length);
    cs.forEach((c, i) => { flat[2 * i] = R * (c >= 0 ? xy[2 * c] : walls[-2 - 2 * c]) + o; flat[2 * i + 1] = R * (c >= 0 ? xy[2 * c + 1] : walls[-1 - 2 * c]) + o; });
    const F = flatPolys(m, start, flat), cid = Int32Array.from(cs.slice(0, P * N));
    return { polys: Array.from({ length: N }, (_, t) => F.poly(t)), walls: Array.from({ length: m - N }, (_, j) => F.poly(N + j)), dead: rows.flatMap((t, j) => (dead.has(t) ? [j] : [])), core: [F.poly(rows.indexOf(0))], cid };
  })());
})();
export const hyperbolicGrid = (W) => patchGrid(HYPERBOLIC(W), W);
export { HYPERBOLIC };

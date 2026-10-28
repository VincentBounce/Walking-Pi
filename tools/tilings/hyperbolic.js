// The hyperbolic plane's heptagons as main.js builds them (a copy: HYPERBOLIC; discPatch in ./patch.js), and its grid for the searches
import { discPatch, patchGrid } from './patch.js';
/* Poincaré's disc tiled by regular heptagons, three at each corner ({7,3}), ring by ring round the middle one: the region so
 * far bounded by a loop of corners, each of one heptagon inside it or two; between two corners of one, the next ring's
 * heptagon, the mirror image of the one inside across the loop's first edge between them (see main.js) */
const HYPERBOLIC = (() => {
  const P = 7, mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], conj = (a) => [a[0], -a[1]];
  const div = (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const to0 = (a, z) => div([z[0] - a[0], z[1] - a[1]], [1 - mul(conj(a), z)[0], -mul(conj(a), z)[1]]);
  const from0 = (a, w) => div([w[0] + a[0], w[1] + a[1]], [1 + mul(conj(a), w)[0], mul(conj(a), w)[1]]);
  const mirror = (a, b, z) => { const t = to0(a, b), u = mul(t, t), n = u[0] ** 2 + u[1] ** 2, e = [u[0] / Math.sqrt(n), u[1] / Math.sqrt(n)]; return from0(a, mul(e, conj(to0(a, z)))); };
  const most = 2 ** 12, r0 = Math.tanh(Math.acosh(1 / Math.tan(Math.PI / P) / Math.tan(Math.PI / 3)) / 2);
  const tiles = [Array.from({ length: P }, (_, k) => [r0 * Math.cos(Math.PI / 2 + (2 * Math.PI * k) / P), r0 * Math.sin(Math.PI / 2 + (2 * Math.PI * k) / P)])];
  let loop = tiles[0].map((z, k) => ({ z, one: true, tile: 0, at: k }));
  while (tiles.length < 3 * most) {
    const ones = loop.flatMap((v, i) => (v.one ? [i] : [])), n = loop.length, next = [];
    const out = ones.map((i) => { const { tile, at } = loop[i], T = tiles[tile]; return mirror(T[at], T[(at + 1) % P], T[(at + P - 1) % P]); });
    ones.forEach((i, f) => {
      const m = (ones[(f + 1) % ones.length] - i + n) % n || n, { tile, at } = loop[i], T = tiles[tile], fresh = [];
      for (let s = P - 2; s >= m + 2; s--) fresh.push(mirror(T[at], T[(at + 1) % P], T[(at + s) % P]));
      const t = tiles.push([loop[i].z, out[f], ...fresh, out[(f + 1) % ones.length], ...Array.from({ length: m }, (_, s) => loop[(i + m - s) % n].z)]) - 1;
      next.push({ z: out[f], one: false, tile: t, at: 1 }, ...fresh.map((z, s) => ({ z, one: true, tile: t, at: 2 + s })));
    });
    loop = next;
  }
  const cache = {};
  return (W) => (cache[W] ??= (() => {
    const R = W / Math.sqrt(Math.PI);
    return discPatch(tiles.map((T) => ({ p: T.map(([x, y]) => [R * x, R * y]), m: [0, 1].map((d) => (R * T.reduce((a, z) => a + z[d], 0)) / P) })), W, (h) => h.p, [0, 0]);
  })());
})();
export const hyperbolicGrid = (W) => patchGrid(HYPERBOLIC(W), W);
export { HYPERBOLIC };

// The pinwheel as main.js builds it (a copy: PINWHEEL; discPatch in ./patch.js), and its grid for the searches
import { discPatch, patchGrid } from './patch.js';
/* The pinwheel (Conway and Radin, 1994): a right triangle, its legs 1 and 2, cut in 5 of itself √5 smaller (the altitude to its
 * hypotenuse, then the larger part in 4), again and again: a tiling that never repeats, its tiles turned every way (no
 * way the others' : in a circle, round as a disc). Not edge to edge: a tile's corner may lie on another's side, kept as a
 * corner of that side too (its neighbours by a shared corner, as the hats'). As the hats' (see discPatch): a tile a square
 * unit, the W² nearest a middle with room all round */
const PINWHEEL = (() => {
  const cache = {}, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return (W) => cache[W] ??= (() => {
    let n = 0;
    while (5 ** (n / 2) < 1.6 * W + 12) n++;  // (its square of W² tiles and their walls inside the big triangle)
    const L = 5 ** (n / 2);  // (its tiles' legs 2 and 1: a square unit each)
    let tris = [[[0, 0], [2 * L, 0], [0, L]]];  // a tile: its right angle's corner, its long leg's end, its short leg's
    for (let k = 0; k < n; k++) tris = tris.flatMap(([R, P, Q]) => {
      const d = [Q[0] - P[0], Q[1] - P[1]], t = ((R[0] - P[0]) * d[0] + (R[1] - P[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2), H = [P[0] + t * d[0], P[1] + t * d[1]];
      const Mr = mid(H, R), Mp = mid(H, P), Mh = mid(R, P);  // (H: the altitude's foot; the part R H P in 4 round its middle)
      return [[H, R, Q], [H, Mp, Mr], [Mr, Mh, R], [Mp, P, Mh], [Mh, Mr, Mp]];
    });
    // the corners on another's side: each side's, in its order (a grid of unit cells over the corners, the ones near a side)
    const at = new Map(), cell = ([x, y]) => `${Math.floor(x)},${Math.floor(y)}`;
    for (const T of tris) for (const p of T) (at.get(cell(p)) ?? at.set(cell(p), []).get(cell(p))).push(p);
    const items = tris.map((T) => {
      const p = T.flatMap((a, i) => {
        const b = T[(i + 1) % 3], len = Math.hypot(b[0] - a[0], b[1] - a[1]), on = [];
        for (let x = Math.floor(Math.min(a[0], b[0])); x <= Math.floor(Math.max(a[0], b[0])); x++) for (let y = Math.floor(Math.min(a[1], b[1])); y <= Math.floor(Math.max(a[1], b[1])); y++) {
          for (const q of at.get(`${x},${y}`) ?? []) {
            const u = ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / len / len, off = Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) / len;
            if (u > 1e-9 && u < 1 - 1e-9 && off < 1e-9 && !on.some(([v]) => Math.abs(v - u) < 1e-9)) on.push([u, q]);
          }
        }
        return [a, ...on.sort((x, y) => x[0] - y[0]).map(([, q]) => q)];
      });
      return { p, m: [0, 1].map((d) => (T[0][d] + T[1][d] + T[2][d]) / 3) };
    });
    return discPatch(items, W, (h) => h.p);
  })();
})();
export const pinwheelGrid = (W) => patchGrid(PINWHEEL(W), W);
export { PINWHEEL };

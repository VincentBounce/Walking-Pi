// Penrose's rhombi as main.js builds them (a copy: PENROSE; discPatch in ./patch.js), and their grid for the searches
import { discPatch, patchGrid, pointKey } from './patch.js';
/* Penrose's rhombi (P3): a wheel of 10 Robinson triangles cut again and again (a thin one in 2, a thick one in 3, each
 * time φ smaller; about φ² as many), two of a colour sharing their base a rhombus (thick: 72°, thin: 36°): a tiling that
 * never repeats, with five-fold symmetry. As the hats' (see discPatch); each rhombus about a square unit */
const PENROSE = (() => {
  const phi = (1 + Math.sqrt(5)) / 2, cache = {}, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  return (W) => cache[W] ??= (() => {
    let n = 0;
    while (10 * phi ** (2 * n) < 14 * W * W) n++;  // (about 6 W² rhombi, 2 triangles each)
    const R = 1.11 * phi ** n;  // the rhombi's sides 1.11: their mean area 1
    let tris = Array.from({ length: 10 }, (_, i) => {
      const B = [R * Math.cos(((2 * i - 1) * Math.PI) / 10), R * Math.sin(((2 * i - 1) * Math.PI) / 10)], C = [R * Math.cos(((2 * i + 1) * Math.PI) / 10), R * Math.sin(((2 * i + 1) * Math.PI) / 10)];
      return i % 2 ? [0, [0, 0], C, B] : [0, [0, 0], B, C];
    });
    for (let k = 0; k < n; k++) tris = tris.flatMap(([c, A, B, C]) => {
      if (c === 0) { const P = lerp(A, B, 1 / phi); return [[0, C, P, B], [1, P, C, A]]; }
      const Q = lerp(B, A, 1 / phi), S = lerp(B, C, 1 / phi);
      return [[1, S, C, A], [1, Q, S, B], [0, S, Q, A]];
    });
    const key = (p) => pointKey(p, 1e4), half = new Map(), items = [];
    for (const [c, A, B, C] of tris) {
      const k = `${c}|${[key(B), key(C)].sort().join('|')}`, other = half.get(k);
      if (!other) { half.set(k, A); continue; }
      const p = [A, B, other, C];
      items.push({ p, m: [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2] });
    }
    return discPatch(items, W, (h) => h.p, [0, 0]);  // (round the wheel's middle: five-fold)
  })();
})();
export const penroseGrid = (W) => patchGrid(PENROSE(W), W);
export { PENROSE };

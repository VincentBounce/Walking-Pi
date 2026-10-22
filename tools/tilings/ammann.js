// Ammann–Beenker's tiling and Rhombs 12 as main.js builds them (a copy: DEBRUIJN; discPatch in ./patch.js), and their grids for the searches
import { discPatch, patchGrid } from './patch.js';
/* De Bruijn's multigrids (1981): N families of lines a unit apart, their normals 180°/N apart, all moved by ½ (no three
 * meeting, the whole 2N-fold round the middle); each crossing of two a tile, its corners the sum of the lattice steps of
 * the lines it lies between (a rhombus, its angle the two families'). Ammann–Beenker's (Ammann, 1977; Beenker, 1982): 4,
 * squares and 45° rhombi, eightfold; Rhombs 12: 6, squares and 30° and 60° rhombi, twelvefold. As the hats' (see
 * discPatch): its tiles a square unit on average, the W² nearest its middle, in a 2N-gon (its sides along the tiles') */
const DEBRUIJN = (N) => {
  const e = [...Array(N).keys()].map((m) => [Math.cos((m * Math.PI) / N), Math.sin((m * Math.PI) / N)]), pairs = [];
  for (let j = 0; j < N; j++) for (let l = j + 1; l < N; l++) pairs.push([j, l, Math.abs(e[j][0] * e[l][1] - e[j][1] * e[l][0])]);
  const crossings = pairs.reduce((t, [, , s]) => t + s, 0), S = 1 / Math.sqrt(pairs.reduce((t, [, , s]) => t + s * s, 0) / crossings);  // (crossings a unit; their mean area 1)
  const cache = {};
  return (W) => cache[W] ??= (() => {
    const K = Math.ceil(Math.sqrt((6 * W * W) / (crossings * Math.PI))) + 3, items = [];  // (6 W² tiles)
    for (const [j, l] of pairs) for (let kj = -K; kj <= K; kj++) for (let kl = -K; kl <= K; kl++) {
      const [a, b] = [e[j], e[l]], d = a[0] * b[1] - a[1] * b[0], r1 = kj + 0.5, r2 = kl + 0.5, x = [(r1 * b[1] - r2 * a[1]) / d, (a[0] * r2 - b[0] * r1) / d];
      if (Math.hypot(...x) > K - 2) continue;  // (round the grid's middle: its tiles whole)
      const k = e.map((em, m) => (m === j ? kj : m === l ? kl : Math.ceil(x[0] * em[0] + x[1] * em[1] - 0.5)));
      const v = (da, db) => [0, 1].map((t) => k.reduce((sum, km, m) => sum + (km + (m === j ? da : m === l ? db : 0)) * e[m][t], 0) * S);
      const p = [v(0, 0), v(1, 0), v(1, 1), v(0, 1)];
      if (p.reduce((sum, q, i) => sum + q[0] * p[(i + 1) % 4][1] - p[(i + 1) % 4][0] * q[1], 0) < 0) p.reverse();
      items.push({ p, m: [0, 1].map((t) => p.reduce((sum, q) => sum + q[t], 0) / 4) });
    }
    return discPatch(items, W, (h) => h.p, [0, 0], (x, y) => Math.max(...e.map(([a, b]) => Math.abs(a * x + b * y))));
  })();
};
const AMMANN = DEBRUIJN(4), RHOMBS12 = DEBRUIJN(6), RHOMBS14 = DEBRUIJN(7);
export const ammannGrid = (W) => patchGrid(AMMANN(W), W);
export const rhombs12Grid = (W) => patchGrid(RHOMBS12(W), W);
export const rhombs14Grid = (W) => patchGrid(RHOMBS14(W), W);
export { AMMANN, RHOMBS12, RHOMBS14 };

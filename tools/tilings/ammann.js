// Ammann–Beenker's squares and rhombi as main.js builds them (a copy: AMMANN; discPatch in ./patch.js), and their grid for the searches
import { discPatch, patchGrid, pointKey } from './patch.js';
/* Ammann–Beenker's squares and 45° rhombi (Ammann, 1977; Beenker, 1982): eightfold, never repeating; built as de
 * Bruijn's tetragrid's dual: 4 families of lines a unit apart (their normals 0°, 45°, 90°, 135°, each moved by its own
 * offset), each crossing of two a tile, its corners the sum of the lattice steps of the lines it lies between (a square
 * where two at right angles cross, a rhombus where at 45°); as the hats' (see discPatch), each about a square unit */
const AMMANN = (() => {
  const e = [0, 1, 2, 3].map((m) => [Math.cos((m * Math.PI) / 4), Math.sin((m * Math.PI) / 4)]), g = [0.5, 0.5, 0.5, 0.5], S = 1 / Math.sqrt((1 + Math.SQRT2 * Math.SQRT1_2) / (1 + Math.SQRT2));  // (their mean area 1)
  const cache = {};
  return (W) => cache[W] ??= (() => {
    const K = Math.ceil(Math.sqrt((6 * W * W) / (4.84 * Math.PI))) + 3, items = [];  // (about 4.84 crossings a unit of the grid, 6 W² tiles)
    for (let j = 0; j < 4; j++) for (let l = j + 1; l < 4; l++) for (let kj = -K; kj <= K; kj++) for (let kl = -K; kl <= K; kl++) {
      const [a, b] = [e[j], e[l]], d = a[0] * b[1] - a[1] * b[0], r1 = kj + g[j], r2 = kl + g[l], x = [(r1 * b[1] - r2 * a[1]) / d, (a[0] * r2 - b[0] * r1) / d];
      if (Math.hypot(...x) > K - 2) continue;  // (round the grid's middle: its tiles whole)
      const k = e.map((em, m) => (m === j ? kj : m === l ? kl : Math.ceil(x[0] * em[0] + x[1] * em[1] - g[m])));
      const v = (da, db) => [0, 1].map((t) => k.reduce((sum, km, m) => sum + (km + (m === j ? da : m === l ? db : 0)) * e[m][t], 0) * S);
      const p = [v(0, 0), v(1, 0), v(1, 1), v(0, 1)];
      if (p.reduce((sum, q, i) => sum + q[0] * p[(i + 1) % 4][1] - p[(i + 1) % 4][0] * q[1], 0) < 0) p.reverse();
      items.push({ p, m: [0, 1].map((t) => p.reduce((sum, q) => sum + q[t], 0) / 4) });
    }
    return discPatch(items, W, (h) => h.p, [0, 0], (x, y) => Math.max(...e.map(([a, b]) => Math.abs(a * x + b * y))));  // (round its middle: eight-fold, its lines all moved by ½; in an octagon, its sides along the tiles')
  })();
})();
export const ammannGrid = (W) => patchGrid(AMMANN(W), W);
export { AMMANN };

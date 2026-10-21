// The mirrored rosette as main.js builds it (a copy: HOUSES; discPatch in ./patch.js), and its grid for the searches
import { discPatch, patchGrid } from './patch.js';
/* A mirrored rosette (Wikimedia: Pentagonal_tiling_with_7-fold_rotational_symmetry.svg): a house, a 1 × b rectangle under a
 * triangle of sides 2, its top 360°/n (b = 4 sin(180°/n)); round the middle 2n cones, along the n axes through a tile and the n
 * between, in rows across them: j tiles pointing in, then j pointing out, their tops between the next row's (the rows a
 * period 2 + h apart, h the triangle's height; the cones between, 2 tan(90°/n) wide: as much as b a period); on the n axes
 * between, all 2 further out. Each long side's middle a corner (the next row's corners meet it there). As the rosettes: its
 * W² tiles nearest its middle, each a square unit */
const HOUSES = function HOUSES(n) {
  const t = Math.PI / n, b = 4 * Math.sin(t), h = 2 * Math.cos(t), P = 2 + h, U = 1 / Math.sqrt(b + (b * h) / 2);  // (a tile a square unit)
  const house = (x0, y, out) => (out  // (along its axis, x0 its near end: in, its top there; out, its rectangle)
    ? [[x0 + 1 + h, y], [x0 + 1 + h / 2, y - b / 4], [x0 + 1, y - b / 2], [x0, y - b / 2], [x0, y + b / 2], [x0 + 1, y + b / 2], [x0 + 1 + h / 2, y + b / 4]]
    : [[x0, y], [x0 + h / 2, y + b / 4], [x0 + h, y + b / 2], [x0 + h + 1, y + b / 2], [x0 + h + 1, y - b / 2], [x0 + h, y - b / 2], [x0 + h / 2, y - b / 4]]);
  const cache = {};
  return (W) => cache[W] ??= (() => {
    const J = Math.ceil((0.525 * W * Math.SQRT2 + 5) / U / P) + 2, items = [];  // (rows enough round the W² tiles' square)
    for (let k = 0; k < 2 * n; k++) {
      const c = Math.cos(k * t), s = Math.sin(k * t), off = k % 2 ? 0 : 2;  // (on the axes through a tile, from the middle)
      for (let j = 1; j <= J; j++) for (const out of [false, true]) for (let i = 0; i < j; i++) {
        const p = house(off + (j - 1) * P + (out ? h + 1 : 0), (i - (j - 1) / 2) * b, out).map(([x, y]) => [(c * x - s * y) * U, (s * x + c * y) * U]);
        items.push({ p, m: [0, 1].map((d) => p.reduce((sum, q) => sum + q[d], 0) / p.length) });
      }
    }
    return discPatch(items, W, (it) => it.p, [0, 0]);
  })();
};
export const housesGrid = (W) => patchGrid(HOUSES(7)(W), W);
export { HOUSES };

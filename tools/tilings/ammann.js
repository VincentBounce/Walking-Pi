// Ammann–Beenker's squares and rhombi as main.js builds them (a copy: squarePatch, AMMANN), and their grid for the searches
// An aperiodic tiling's grid of side W (the hats, Penrose's rhombi): from a patch of it (items: their middles m, each
// about a square unit; poly(item): its corners), the W² items nearest a middle (a square), in W bands from the top,
// each by x (a cell (x, y) as on the other grids); the items round them, its walls
function squarePatch(items, W, poly) {
  // the middle: where a square of W² items' room (a cell about 1 square unit) holds the most of them, the nearest the
  // patch's centre (its outline is ragged: round its centre, a corner may be bare)
  const box = (d) => items.reduce(([a, b], h) => [Math.min(a, h.m[d]), Math.max(b, h.m[d])], [Infinity, -Infinity]), [bx, by] = [box(0), box(1)];
  const half = (Math.sqrt(W * W) * 1.05) / 2, centre = [(bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2];
  // (the items by unit cells of a grid over the patch, summed from a corner: a box's count at once)
  const nx = Math.ceil(bx[1] - bx[0]) + 2, ny = Math.ceil(by[1] - by[0]) + 2, sum = new Int32Array((nx + 1) * (ny + 1));
  for (const h of items) sum[(Math.floor(h.m[1] - by[0]) + 1) * (nx + 1) + Math.floor(h.m[0] - bx[0]) + 1]++;
  for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) sum[y * (nx + 1) + x] += sum[(y - 1) * (nx + 1) + x] + sum[y * (nx + 1) + x - 1] - sum[(y - 1) * (nx + 1) + x - 1];
  const count = (x0, y0, x1, y1) => sum[y1 * (nx + 1) + x1] - sum[y0 * (nx + 1) + x1] - sum[y1 * (nx + 1) + x0] + sum[y0 * (nx + 1) + x0];
  const k = Math.ceil(2 * half) + 1;
  let mid = centre, best = -1;
  for (let y = 0; y + k <= ny; y++) for (let x = 0; x + k <= nx; x++) {
    const c = [bx[0] + x + k / 2, by[0] + y + k / 2], score = count(x, y, x + k, y + k) - 1e-3 * Math.hypot(c[0] - centre[0], c[1] - centre[1]);
    if (score > best) { best = score; mid = c; }
  }
  const far = (h) => Math.max(Math.abs(h.m[0] - mid[0]), Math.abs(h.m[1] - mid[1]));
  items.sort((a, b) => far(a) - far(b));
  const cells = items.slice(0, W * W).sort((a, b) => a.m[1] - b.m[1]), rows = [];
  cells.forEach(poly);
  for (let y = 0; y < W; y++) rows.push(...cells.slice(y * W, (y + 1) * W).sort((a, b) => a.m[0] - b.m[0]));
  // the walls: the items beyond touching one of them (sharing a corner)
  const key = ([u, v]) => `${Math.round(u * 1000)},${Math.round(v * 1000)}`, inside = new Set(rows.flatMap((h) => h.p.map(key)));
  const edge = far(items[W * W - 1]) + 3, near = [];  // (the items just beyond: the next ones by distance)
  for (let k = W * W; k < items.length && far(items[k]) < edge; k++) near.push(items[k]);
  const walls = near.filter((h) => poly(h).some((q) => inside.has(key(q)))).map((h) => h.p);
  // placed as the squares' grid of side W (middle at (W − 1) / 2 both ways): another size grows from the same place
  const o = [mid[0] - (W - 1) / 2, mid[1] - (W - 1) / 2], at = (p) => p.map(([u, v]) => [u - o[0], v - o[1]]);
  return { polys: rows.map((h) => at(h.p)), walls: walls.map(at), key };
}
/* Penrose's rhombi (P3): a wheel of 10 Robinson triangles cut again and again (a thin one in 2, a thick one in 3, each
 * time φ smaller; about φ² as many), two of a colour sharing their base a rhombus (thick: 72°, thin: 36°): a tiling that
 * never repeats, with five-fold symmetry. As the hats' (see squarePatch); each rhombus about a square unit */
/* Ammann–Beenker's squares and 45° rhombi (Ammann, 1977; Beenker, 1982): eightfold, never repeating; built as de
 * Bruijn's tetragrid's dual: 4 families of lines a unit apart (their normals 0°, 45°, 90°, 135°, each moved by its own
 * offset), each crossing of two a tile, its corners the sum of the lattice steps of the lines it lies between (a square
 * where two at right angles cross, a rhombus where at 45°); as the hats' (see squarePatch), each about a square unit */
const AMMANN = (() => {
  const e = [0, 1, 2, 3].map((m) => [Math.cos((m * Math.PI) / 4), Math.sin((m * Math.PI) / 4)]), g = [0.1234, 0.3141, 0.2718, 0.1618], S = 1 / Math.sqrt((1 + Math.SQRT2 * Math.SQRT1_2) / (1 + Math.SQRT2));  // (their mean area 1)
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
    return squarePatch(items, W, (h) => h.p);
  })();
})();
export function ammannGrid(W) {
  const h = AMMANN(W), n = W * W, by = new Map(), start = new Int32Array(n + 1), list = [];
  h.polys.forEach((p, t) => p.forEach((q) => { const k = h.key(q); (by.get(k) ?? by.set(k, []).get(k)).push(t); }));
  for (let t = 0; t < n; t++) {
    const around = new Set();
    for (const q of h.polys[t]) for (const u of by.get(h.key(q))) if (u !== t) around.add(u);
    start[t] = list.length;
    list.push(...[...around].sort((a, b) => a - b));
  }
  start[n] = list.length;
  return { W, row: W, n, start, list: Int32Array.from(list), per: 1 };
}
export { AMMANN };

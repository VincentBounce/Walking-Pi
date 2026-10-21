// The grids that never repeat, for the searches: discPatch, as main.js's (a copy), and a patch's grid of neighbours
export const roundOff = (x, k = 1000) => Math.round(x * k + 0.37);
export const pointKey = ([x, y], k = 1000) => `${roundOff(x, k)},${roundOff(y, k)}`;  // (as main.js's)
// An aperiodic tiling's grid of side W (the hats, Penrose's rhombi): from a patch of it (items: their middles m, each
// about a square unit; poly(item): its corners), the W² items nearest a middle (a disc), in W bands from the top,
// each by x (a cell (x, y) as on the other grids); the items round them, its walls
export function discPatch(items, W, poly, middle = null, norm = Math.hypot) {  // walls in a circle: the items nearest the middle (norm: another way to measure, Ammann's octagon)
  // the middle (middle, else): where a square of W² items' room (a cell about 1 square unit) and 4 units more all round (its
  // walls' room) holds the most of them, the nearest the patch's centre (its outline is ragged: a corner may be bare)
  const box = (d) => items.reduce(([a, b], h) => [Math.min(a, h.m[d]), Math.max(b, h.m[d])], [Infinity, -Infinity]), [bx, by] = [box(0), box(1)];
  const half = (Math.sqrt(W * W) * 1.05) / 2, centre = [(bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2];
  // (the items by unit cells of a grid over the patch, summed from a corner: a box's count at once)
  const nx = Math.ceil(bx[1] - bx[0]) + 2, ny = Math.ceil(by[1] - by[0]) + 2, sum = new Int32Array((nx + 1) * (ny + 1));
  for (const h of items) sum[(Math.floor(h.m[1] - by[0]) + 1) * (nx + 1) + Math.floor(h.m[0] - bx[0]) + 1]++;
  for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) sum[y * (nx + 1) + x] += sum[(y - 1) * (nx + 1) + x] + sum[y * (nx + 1) + x - 1] - sum[(y - 1) * (nx + 1) + x - 1];
  const count = (x0, y0, x1, y1) => sum[y1 * (nx + 1) + x1] - sum[y0 * (nx + 1) + x1] - sum[y1 * (nx + 1) + x0] + sum[y0 * (nx + 1) + x0];
  const k = Math.ceil(2 * half) + 1;
  let mid = middle ?? centre, best = -1;
  if (!middle) for (let y = 4; y + k + 4 <= ny; y++) for (let x = 4; x + k + 4 <= nx; x++) {
    const c = [bx[0] + x + k / 2, by[0] + y + k / 2], score = count(x - 4, y - 4, x + k + 4, y + k + 4) - 1e-3 * Math.hypot(c[0] - centre[0], c[1] - centre[1]);
    if (score > best) { best = score; mid = c; }
  }
  const far = (h) => norm(h.m[0] - mid[0], h.m[1] - mid[1]);
  items.sort((a, b) => far(a) - far(b));
  // the items under a radius, never a ring of them as far (within 10⁻⁶) cut in two: the last of the W² ones and
  // those as far out of it; the rest of the W² cells of the wall (and a ring's hole: its middle)
  let live = W * W;
  while (live > 1 && far(items[live]) - far(items[live - 1]) < 1e-6) live--;
  for (let k = live; k < W * W; k++) items[k].dead = true;
  // its core: the items nearest the middle, all those as far, then the next ones, till two of them at least, one alive
  for (let k = 0; k < 2 || !items.slice(0, k).some((h) => !h.dead);) { const d = far(items[k]); while (far(items[k]) - d < 1e-6) items[k++].core = true; }
  const cells = items.slice(0, W * W).sort((a, b) => a.m[1] - b.m[1]), rows = [];
  cells.forEach(poly);
  for (let y = 0; y < W; y++) rows.push(...cells.slice(y * W, (y + 1) * W).sort((a, b) => a.m[0] - b.m[0]));
  // the walls: the cells of the wall and the items beyond touching a live one (sharing a corner)
  const inside = new Set(rows.filter((h) => !h.dead).flatMap((h) => h.p.map((p) => pointKey(p))));
  const edge = far(items[W * W - 1]) + 3, near = [];  // (the items just beyond: the next ones by distance)
  for (let k = W * W; k < items.length && far(items[k]) < edge; k++) near.push(items[k]);
  const walls = [...rows.filter((h) => h.dead), ...near].filter((h) => poly(h).some((q) => inside.has(pointKey(q)))).map((h) => h.p);
  // placed as the squares' grid of side W (middle at (W − 1) / 2 both ways): another size grows from the same place
  const o = [mid[0] - (W - 1) / 2, mid[1] - (W - 1) / 2], at = (p) => p.map(([u, v]) => [u - o[0], v - o[1]]);
  const dead = rows.flatMap((h, t) => (h.dead ? [t] : []));  // (cells of the wall among them: a ring's hole)
  return { polys: rows.map((h) => at(h.p)), walls: walls.map(at), dead, core: rows.filter((h) => h.core).map((h) => at(h.p)) };
}
// a patch's grid: each cell's neighbours (sharing a corner), the wall's cells none and no one's
export function patchGrid(h, W) {
  const n = W * W, by = new Map(), start = new Int32Array(n + 1), list = [], k = ([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`, dead = new Set(h.dead);
  h.polys.forEach((p, t) => p.forEach((q) => { (by.get(k(q)) ?? by.set(k(q), []).get(k(q))).push(t); }));
  const side = [];  // (each neighbour by a side, two corners or more shared, or by a corner only: the flowers' letters)
  for (let t = 0; t < n; t++) {
    const around = new Map();
    if (!dead.has(t)) for (const q of h.polys[t]) for (const u of by.get(k(q))) if (u !== t && !dead.has(u)) around.set(u, (around.get(u) ?? 0) + 1);
    start[t] = list.length;
    for (const u of [...around.keys()].sort((a, b) => a - b)) { list.push(u); side.push(around.get(u) >= 2 ? 1 : 0); }
  }
  start[n] = list.length;
  return { W, row: W, n, start, list: Int32Array.from(list), side: Uint8Array.from(side), per: 1 };
}

// The Spectre as main.js builds it (a copy: squarePatch, SPECTRE), and its grid for the searches
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
/* The Spectre (Smith, Myers, Kaplan and Goodman-Strauss, 2023): one tile, 14 sides all 1 long, that tiles the plane
 * only without ever repeating, and never turned over (its mirror image not needed). Built by substitution, as Kaplan's
 * code (in AaronWebster/spectre-app, Apache 2.0): nine kinds of tiles (Gamma: two spectres, the "mystic"), each a
 * supertile of 8 smaller ones, about 8 times as many each level. As the hats' (see squarePatch); each about a square unit */
const SPECTRE = (() => {
  const ident = [1, 0, 0, 0, 1, 0], mul = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
  const at = (M, [x, y]) => [M[0] * x + M[1] * y + M[2], M[3] * x + M[4] * y + M[5]];
  const trot = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0], ttrans = (x, y) => [1, 0, x, 0, 1, y];
  const r3 = Math.sqrt(3) / 2;
  const spectre = [[0, 0], [1, 0], [1.5, -r3], [1.5 + r3, 0.5 - r3], [1.5 + r3, 1.5 - r3], [2.5 + r3, 1.5 - r3], [3 + r3, 1.5], [3, 2], [3 - r3, 1.5],
    [2.5 - r3, 1.5 + r3], [1.5 - r3, 1.5 + r3], [0.5 - r3, 1.5 + r3], [-r3, 1.5], [0, 1]];
  const quad = [spectre[3], spectre[5], spectre[7], spectre[11]];
  const NAMES = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
  // a tile kind: its parts [transform, kind or null for one spectre], its four key points
  const base = Object.fromEntries(NAMES.map((n) => [n, { parts: n === 'Gamma' ? [[ident, null], [mul(ttrans(...spectre[8]), trot(Math.PI / 6)), null]] : [[ident, null]], quad }]));
  const RULES = { Gamma: ['Pi', 'Delta', null, 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'], Delta: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Theta: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'], Lambda: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Xi: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'], Pi: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
    Sigma: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'], Phi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Psi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'] };
  // the next level's kinds: 8 of this level's each, placed by turning and matching their key points
  function supertiles(sys) {
    const q = sys.Delta.quad, R = [-1, 0, 0, 0, 1, 0], Ts = [ident];
    let total = 0, rot = ident, tq = [...q];
    for (const [ang, from, to] of [[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1], [0, 2, 0], [60, 3, 1], [-120, 3, 3]]) {
      total += ang;
      if (ang) { rot = trot((total * Math.PI) / 180); tq = q.map((p) => at(rot, p)); }
      const a = tq[to], b = at(Ts.at(-1), q[from]);
      Ts.push(mul(ttrans(b[0] - a[0], b[1] - a[1]), rot));
    }
    const Tr = Ts.map((T) => mul(R, T)), sq = [at(Tr[6], q[2]), at(Tr[5], q[1]), at(Tr[3], q[2]), at(Tr[0], q[1])];
    return Object.fromEntries(NAMES.map((n) => [n, { parts: RULES[n].map((k, i) => (k ? [Tr[i], sys[k]] : null)).filter(Boolean), quad: sq }]));
  }
  const spectresOf = (g, T, out) => { for (const [M, sub] of g.parts) { const TM = mul(T, M); if (sub) spectresOf(sub, TM, out); else out.push(TM); } return out; };
  const count = (g) => g.parts.reduce((s, [, sub]) => s + (sub ? count(sub) : 1), 0);
  const S = 1 / Math.sqrt(Math.abs(spectre.reduce((a, p, i) => a + p[0] * spectre[(i + 1) % 14][1] - spectre[(i + 1) % 14][0] * p[1], 0) / 2));  // a spectre a square unit
  const cache = {};
  return (W) => cache[W] ??= (() => {
    let sys = base;
    while (count(sys.Delta) < 6 * W * W) sys = supertiles(sys);
    const items = spectresOf(sys.Delta, ident, []).map((T) => { const p = spectre.map((q) => at(T, q)).map(([x, y]) => [x * S, -y * S]); return { p, m: [0, 1].map((d) => p.reduce((s, q) => s + q[d], 0) / 14) }; });
    return squarePatch(items, W, (h) => h.p);
  })();
})();
export function spectreGrid(W) {
  const h = SPECTRE(W), n = W * W, by = new Map(), start = new Int32Array(n + 1), list = [];
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
export { SPECTRE };

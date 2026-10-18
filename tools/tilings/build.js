// The 2D tilings of the app's Life (main.js: TILINGS), built and checked here: deno run --allow-write build.js
// Archimedean tilings from a lattice and its points: edges join the points 1 apart, faces by walking round them; their
// Laves duals (one shape each) from each vertex's faces, their middles in turn; the Pythagorean and Capital I tilings
// from unit squares. Each tiling as its lattice (two vectors) and the polygons of one cell of it, in the lattice's
// units (a point (u, v) is u·a + v·b); checked: the polygons fill the cell, edge to edge, each with its neighbours.
const R3 = Math.sqrt(3), add = (p, q) => [p[0] + q[0], p[1] + q[1]], mul = (p, s) => [p[0] * s, p[1] * s];
const dir = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const area = (P) => P.reduce((s, p, i) => s + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0) / 2;
const mid = (P) => [0, 1].map((d) => P.reduce((s, p) => s + p[d], 0) / P.length);
const key = (p) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;

// the points of a lattice patch: each lattice point (i, j) of |i|, |j| ≤ N plus the motif, once each
function points(a, b, motif, N) {
  const seen = new Map();
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) for (const m of motif) {
    const p = add(add(mul(a, i), mul(b, j)), m);
    seen.set(key(p), p);
  }
  return [...seen.values()];
}
// faces of the graph joining points 1 apart: each directed edge, then at each point the next edge turning right
function faces(pts) {
  const nb = pts.map(() => []), grid = new Map(), cellOf = (p) => `${Math.floor(p[0])},${Math.floor(p[1])}`;
  pts.forEach((p, i) => (grid.get(cellOf(p)) ?? grid.set(cellOf(p), []).get(cellOf(p))).push(i));
  pts.forEach((p, i) => {
    const cx = Math.floor(p[0]), cy = Math.floor(p[1]);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const j of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      if (j !== i && Math.abs(Math.hypot(pts[j][0] - p[0], pts[j][1] - p[1]) - 1) < 1e-6) nb[i].push(j);
    }
  });
  const ang = (i, j) => Math.atan2(pts[j][1] - pts[i][1], pts[j][0] - pts[i][0]);
  nb.forEach((l, i) => l.sort((x, y) => ang(i, x) - ang(i, y)));
  const used = new Set(), out = [];
  for (let i = 0; i < pts.length; i++) for (const j of nb[i]) {
    if (used.has(`${i}>${j}`)) continue;
    const face = [i];
    let u = i, v = j;
    while (face.length < 20) {
      used.add(`${u}>${v}`);
      if (v === i) break;
      face.push(v);
      const l = nb[v], k = l.indexOf(u);
      const w = l[(k - 1 + l.length) % l.length];  // the next one clockwise from where it came: the face on its left
      u = v; v = w;
    }
    if (v === i && face.length >= 3) { const P = face.map((f) => pts[f]); if (area(P) > 1e-9) out.push(face); }
  }
  return { faces: out, nb };
}
// a tiling's polygons from points: the faces (Archimedean), or each inner vertex's faces' middles in turn (Laves)
function polygons(pts, dual) {
  const { faces: F, nb } = faces(pts), polys = F.map((f) => f.map((i) => pts[i]));
  if (!dual) return polys;
  const at = pts.map(() => []);
  F.forEach((f, k) => f.forEach((i) => at[i].push(k)));
  return pts.map((p, i) => {
    if (at[i].length !== nb[i].length || at[i].length < 3) return null;  // the patch's edge
    return at[i].map((k) => mid(polys[k])).sort((x, y) => Math.atan2(x[1] - p[1], x[0] - p[0]) - Math.atan2(y[1] - p[1], y[0] - p[0]));
  }).filter(Boolean);
}
// a polyomino's outline through every lattice point on it (a neighbour's corner can be any of them), counterclockwise
function polyomino(cells) {
  const has = new Set(cells.map(([x, y]) => `${x},${y}`)), edges = new Map();
  for (const [x, y] of cells) for (const [p, q, nx, ny] of [[[x, y], [x + 1, y], x, y - 1], [[x + 1, y], [x + 1, y + 1], x + 1, y], [[x + 1, y + 1], [x, y + 1], x, y + 1], [[x, y + 1], [x, y], x - 1, y]]) {
    if (!has.has(`${nx},${ny}`)) edges.set(`${p}`, q);
  }
  const start = edges.keys().next().value, out = [];
  let k = start;
  do { const p = k.split(',').map(Number); out.push(p); k = `${edges.get(k)}`; } while (k !== start && out.length < 100);
  return out;
}

const T = {};
// the polygons of one lattice cell (their middles in it), in lattice units
function cell(name, a, b, polys, extra = {}) {
  const det = a[0] * b[1] - a[1] * b[0], toL = ([x, y]) => [(x * b[1] - y * b[0]) / det, (a[0] * y - a[1] * x) / det];
  const own = polys.map((P) => P.map(toL)).filter((P) => { const [u, v] = mid(P); return Math.floor(u + 1e-6) === 0 && Math.floor(v + 1e-6) === 0; });  // (a middle on the cell's edge: once)
  const sum = own.reduce((s, P) => s + Math.abs(area(P)), 0);
  if (Math.abs(sum - 1) > 1e-6) throw new Error(`${name}: the cell's polygons fill ${sum} of it`);
  T[name] = { basis: [a, b], polys: own.map((P) => (area(P) < 0 ? P.reverse() : P).map(([u, v]) => [+u.toFixed(6), +v.toFixed(6)])), ...extra };
}
const tri = [[1, 0], [0.5, R3 / 2]];  // the unit triangular lattice's vectors (e0, e1)

// trihexagonal (3.6.3.6): hexagons of side 1, 2 apart; its dual the rhombille (3 rhombi a hexagon of its own)
{ const a = [2, 0], b = [1, R3], pts = points(a, b, [0, 1, 2, 3, 4, 5].map((k) => dir(60 * k)), 7); cell('rhombille', a, b, polygons(pts, true)); }
// snub trihexagonal (3.3.3.3.6): the unit triangular lattice but one point in 7 (the hexagons' middles); its dual the floret pentagonal
{ const a = add(mul(tri[0], 2), tri[1]), b = add(mul(tri[0], -1), mul(tri[1], 3)), pts = points(a, b, [0, 1, 2, 3, 4, 5].map((k) => dir(60 * k)), 6);
  cell('snubtri', a, b, polygons(pts, false)); cell('floret', a, b, polygons(pts, true)); }
// elongated triangular (3.3.3.4.4): rows of squares and of triangles; its dual the prismatic pentagonal
{ const a = [1, 0], b = [0.5, 1 + R3 / 2], pts = points(a, b, [[0, 0], [0, 1]], 9); cell('prismatic', a, b, polygons(pts, true)); }
// rhombitrihexagonal (3.4.6.4): hexagons, squares, triangles; its dual the kites (a check: 9 neighbours)
{ const s = 1 + R3, a = mul(dir(30), s), b = mul(dir(90), s), pts = points(a, b, [0, 1, 2, 3, 4, 5].map((k) => dir(60 * k)), 6);
  cell('rhombitri', a, b, polygons(pts, false)); cell('kitecheck', a, b, polygons(pts, true)); }
// truncated square (4.8.8): its dual the tetrakis square (each square cut in 4 by its diagonals)
{ const s = 1 + Math.SQRT2, h = 0.5 + Math.SQRT1_2, a = [s, 0], b = [0, s], pts = points(a, b, [[0.5, h], [-0.5, h], [-h, 0.5], [-h, -0.5], [-0.5, -h], [0.5, -h], [h, -0.5], [h, 0.5]], 6);
  cell('tetrakis', a, b, polygons(pts, true)); }
// truncated trihexagonal (4.6.12): its dual the kisrhombille (each hexagon cut in 12 triangles)
{ const s = 3 + R3, R = 1 / (2 * Math.sin(Math.PI / 12)), a = [s, 0], b = mul(dir(60), s), pts = points(a, b, Array.from({ length: 12 }, (_, k) => mul(dir(15 + 30 * k), R)), 5);
  cell('kisrhombille', a, b, polygons(pts, true)); }
// Pythagorean: squares of sides 2 and 1, on the lattice (2, 1), (−1, 2)
cell('pythagorean', [2, 1], [-1, 2], [polyomino([[0, 0], [1, 0], [0, 1], [1, 1]]), polyomino([[2, 0]])].flatMap((P) => [[-1, 0], [0, 0], [0, -1], [1, 0], [0, 1], [-1, 1], [1, -1]].map(([i, j]) => P.map(([x, y]) => [x + 2 * i - j, y + i + 2 * j]))));
// Capital I: the heptomino I (a bar of 3, a stem, a bar of 3), on the lattice (2, 1), (−1, 3)
{ const I = polyomino([[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]);
  cell('capitalI', [2, 1], [-1, 3], [[-1, 0], [0, 0], [0, -1], [1, 0], [0, 1], [-1, 1], [1, -1], [-1, -1], [1, 1]].map(([i, j]) => I.map(([x, y]) => [x + 2 * i - j, y + i + 3 * j]))); }
// the 15th convex pentagon (Mann, McLoud-Mann and Von Derau, 2015; the last of the 15): 12 a cell of its lattice, as MathWorks's
// construction (Graphics blog, 2015-08-19); not edge to edge: a corner on another pentagon's side is added to its corners
{ const P = [[0, 0], [-1 / 4, R3 / 4], [-(3 + R3) / 4, (1 + R3) / 4], [-(4 + R3) / 4, 1 / 4], [-1, 0]];
  const R = (t) => ([x, y]) => [Math.cos(t) * x + Math.sin(t) * y, -Math.sin(t) * x + Math.cos(t) * y], T = (a, b) => ([x, y]) => [x + a, y + b];
  const M = (...fs) => (p) => fs.reduceRight((q, f) => f(q), p), F = ([x, y]) => [x, -y], G = ([x, y]) => [-x, y];
  const three = [P, P.map(M(T(R3 / 2, -1 / 2), R(Math.PI / 6))), P.map(M(T((R3 - 1) / 4, (1 + R3) / 4), R(Math.PI / 6), F))];
  const six = [...three, ...three.map((Q) => Q.map(M(T(-(5 + R3) / 4, (1 - R3) / 4), R(-Math.PI / 3), G)))];
  const twelve = [...six, ...six.map((Q) => Q.map(M(T(R3, -1 / 2), R(Math.PI))))];
  // its lattice (u, v) reduced: u, and v + u at right angles to it, 4.1 times as long; a cell of 4 u by it (48 pentagons): near a square
  const u = [-(1 + R3) / 4, (3 + R3) / 4], v = [(10 + 7 * R3) / 4, (3 + 2 * R3) / 4], a = mul(u, 4), b = add(v, u), patch = [];
  for (let i = -12; i <= 12; i++) for (let j = -3; j <= 3; j++) for (const Q of twelve) patch.push(Q.map((p) => add(add(p, mul(u, i)), mul(b, j))));
  const on = (p, q, r) => { const l = Math.hypot(q[0] - p[0], q[1] - p[1]), t = ((r[0] - p[0]) * (q[0] - p[0]) + (r[1] - p[1]) * (q[1] - p[1])) / (l * l);
    return t > 1e-6 && t < 1 - 1e-6 && Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / l < 1e-6; };
  const corners = patch.flat(), withT = patch.map((Q) => Q.flatMap((p, k) => { const q = Q[(k + 1) % Q.length];
    return [p, ...corners.filter((r) => on(p, q, r)).sort((r, s) => Math.hypot(r[0] - p[0], r[1] - p[1]) - Math.hypot(s[0] - p[0], s[1] - p[1])).filter((r, i, l) => !i || key(r) !== key(l[i - 1]))]; }));
  cell('pent15', a, b, withT); }

// the check: a torus of 5 × 5 cells, its polygons by their corners; each edge of a polygon (between corners in turn) one
// other polygon's; each polygon's neighbours (sharing an edge or a corner)
for (const [name, t] of Object.entries(T)) {
  const W = 5, m = t.polys.length, all = [];
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) t.polys.forEach((P) => all.push(P.map(([u, v]) => [u + i, v + j])));
  const k = ([u, v]) => `${Math.round((((u % W) + W) % W) * 1000) % (W * 1000)},${Math.round((((v % W) + W) % W) * 1000) % (W * 1000)}`;
  const byCorner = new Map(), byEdge = new Map();
  all.forEach((P, n) => P.forEach((p, i) => {
    (byCorner.get(k(p)) ?? byCorner.set(k(p), new Set()).get(k(p))).add(n);
    const e = [k(p), k(P[(i + 1) % P.length])].sort().join('|');
    (byEdge.get(e) ?? byEdge.set(e, []).get(e)).push(n);
  }));
  const bad = [...byEdge.values()].filter((l) => l.length !== 2).length;
  const counts = {};
  all.slice(0, m).forEach((P, n) => { const s = new Set(); P.forEach((p) => byCorner.get(k(p)).forEach((o) => o !== n && s.add(o))); counts[`${P.length}-gon`] = [...new Set([...(counts[`${P.length}-gon`] ?? []), s.size])]; });
  console.log(name.padEnd(13), m, 'cells a lattice cell', bad ? `${bad} edges not shared by 2!` : 'edge to edge', JSON.stringify(counts));
}
delete T.kitecheck;
Deno.writeTextFileSync(new URL('./tilings.json', import.meta.url), JSON.stringify(T));

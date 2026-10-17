// The hats' grid (as main.js's HAT, a copy): the W² hats of a square patch, their neighbours by a shared corner, no wrapping
/* The hat (Smith, Myers, Kaplan and Goodman-Strauss, 2023): one tile, 8 kites of the kites' grid, that tiles the plane
 * only without ever repeating (about 1 in 7 turned over). Built by substitution, as Craig S. Kaplan's hatviz
 * (github.com/isohedral/hatviz, BSD 3-clause): four metatiles (H, T, P, F) are laid in a patch, which gives four
 * bigger ones, and so on; each level about 6.85 times as many hats. The plane's grid of side W: the W² hats nearest
 * the middle (a square, by the larger of their offsets), in W bands from the top, each by x (a cell (x, y) as on the
 * other grids); the hats round them, its walls. Points as {x, y}, transforms as [a, b, c, d, e, f] (x' = ax + by + c). */
const HAT = (() => {
  const hr3 = Math.sqrt(3) / 2, ident = [1, 0, 0, 0, 1, 0];
  const pt = (x, y) => ({ x, y }), hexPt = (x, y) => pt(x + 0.5 * y, hr3 * y);
  const inv = (T) => { const det = T[0] * T[4] - T[1] * T[3]; return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det, -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det]; };
  const mul = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
  const padd = (p, q) => pt(p.x + q.x, p.y + q.y), psub = (p, q) => pt(p.x - q.x, p.y - q.y);
  const trot = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0], ttrans = (x, y) => [1, 0, x, 0, 1, y];
  const rotAbout = (p, a) => mul(ttrans(p.x, p.y), mul(trot(a), ttrans(-p.x, -p.y)));
  const transPt = (M, P) => pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
  const matchSeg = (p, q) => [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
  const matchTwo = (p1, q1, p2, q2) => mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
  const intersect = (p1, q1, p2, q2) => {
    const d = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y), u = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / d;
    return pt(p1.x + u * (q1.x - p1.x), p1.y + u * (q1.y - p1.y));
  };
  const outline = [hexPt(0, 0), hexPt(-1, -1), hexPt(0, -2), hexPt(2, -2), hexPt(2, -1), hexPt(4, -2), hexPt(5, -1), hexPt(4, 0), hexPt(3, 0), hexPt(2, 2), hexPt(0, 3), hexPt(0, 2), hexPt(-1, 2)];
  // the drawn hat: each edge cut at the kites' corners along it (kites' edges 1/2 and √3/2 long), where a neighbour's corner can be
  const corners = outline.flatMap((p, i) => {
    const q = outline[(i + 1) % outline.length], L = Math.hypot(q.x - p.x, q.y - p.y), k = Math.round(Number.isInteger(Math.round(2 * L * 1e6) / 1e6) ? 2 * L : L / hr3);
    return Array.from({ length: k }, (_, j) => pt(p.x + ((q.x - p.x) * j) / k, p.y + ((q.y - p.y) * j) / k));
  });
  const hat = { hat: true };
  class Meta {
    constructor(shape) { this.shape = shape; this.children = []; }
    add(T, geom) { this.children.push({ T, geom }); }
    at(n, i) { return transPt(this.children[n].T, this.children[n].geom.shape[i]); }
    recentre() {
      const c = this.shape.reduce((s, p) => padd(s, p), pt(0, 0)), cx = c.x / this.shape.length, cy = c.y / this.shape.length;
      this.shape = this.shape.map((p) => pt(p.x - cx, p.y - cy));
      for (const ch of this.children) ch.T = mul(ttrans(-cx, -cy), ch.T);
    }
  }
  const H0 = new Meta([pt(0, 0), pt(4, 0), pt(4.5, hr3), pt(2.5, 5 * hr3), pt(1.5, 5 * hr3), pt(-0.5, hr3)]);
  H0.add(matchTwo(outline[5], outline[7], H0.shape[5], H0.shape[0]), hat);
  H0.add(matchTwo(outline[9], outline[11], H0.shape[1], H0.shape[2]), hat);
  H0.add(matchTwo(outline[5], outline[7], H0.shape[3], H0.shape[4]), hat);
  H0.add(mul(ttrans(2.5, hr3), mul([-0.5, -hr3, 0, hr3, -0.5, 0], [0.5, 0, 0, 0, -0.5, 0])), hat);  // the one turned over
  const T0 = new Meta([pt(0, 0), pt(3, 0), pt(1.5, 3 * hr3)]);
  T0.add([0.5, 0, 0.5, 0, 0.5, hr3], hat);
  const P0 = new Meta([pt(0, 0), pt(4, 0), pt(3, 2 * hr3), pt(-1, 2 * hr3)]);
  P0.add([0.5, 0, 1.5, 0, 0.5, hr3], hat);
  P0.add(mul(ttrans(0, 2 * hr3), mul([0.5, hr3, 0, -hr3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), hat);
  const F0 = new Meta([pt(0, 0), pt(3, 0), pt(3.5, hr3), pt(3, 2 * hr3), pt(-1, 2 * hr3)]);
  F0.add([0.5, 0, 1.5, 0, 0.5, hr3], hat);
  F0.add(mul(ttrans(0, 2 * hr3), mul([0.5, hr3, 0, -hr3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), hat);
  // a patch of the four metatiles, each placed along an edge of one before (hatviz's rules)
  const RULES = [['H'], [0, 0, 'P', 2], [1, 0, 'H', 2], [2, 0, 'P', 2], [3, 0, 'H', 2], [4, 4, 'P', 2], [0, 4, 'F', 3], [2, 4, 'F', 3], [4, 1, 3, 2, 'F', 0],
    [8, 3, 'H', 0], [9, 2, 'P', 0], [10, 2, 'H', 0], [11, 4, 'P', 2], [12, 0, 'H', 2], [13, 0, 'F', 3], [14, 2, 'F', 1], [15, 3, 'H', 4], [8, 2, 'F', 1],
    [17, 3, 'H', 0], [18, 2, 'P', 0], [19, 2, 'H', 2], [20, 4, 'F', 3], [20, 0, 'P', 2], [22, 0, 'H', 2], [23, 4, 'F', 3], [23, 0, 'F', 3], [16, 0, 'P', 2],
    [9, 4, 0, 2, 'T', 2], [4, 0, 'F', 3]];
  function patchOf(shapes) {
    const out = new Meta([]);
    for (const r of RULES) {
      if (r.length === 1) { out.add(ident, shapes[r[0]]); continue; }
      const [P, Q, s, e] = r.length === 4
        ? (() => { const ch = out.children[r[0]], poly = ch.geom.shape; return [transPt(ch.T, poly[(r[1] + 1) % poly.length]), transPt(ch.T, poly[r[1]]), r[2], r[3]]; })()
        : (() => { const cp = out.children[r[0]], cq = out.children[r[2]]; return [transPt(cq.T, cq.geom.shape[r[3]]), transPt(cp.T, cp.geom.shape[r[1]]), r[4], r[5]]; })();
      const poly = shapes[s].shape;
      out.add(matchTwo(poly[e], poly[(e + 1) % poly.length], P, Q), shapes[s]);
    }
    return out;
  }
  // the four bigger metatiles of a patch
  function metatilesOf(patch) {
    const bps1 = patch.at(8, 2), bps2 = patch.at(21, 2), rbps = transPt(rotAbout(bps1, (-2 * Math.PI) / 3), bps2), p72 = patch.at(7, 2), p252 = patch.at(25, 2);
    const llc = intersect(bps1, rbps, patch.at(6, 2), p72);
    let w = psub(patch.at(6, 2), llc);
    const Hs = [llc, bps1];
    w = transPt(trot(-Math.PI / 3), w);
    Hs.push(padd(Hs[1], w), patch.at(14, 2));
    w = transPt(trot(-Math.PI / 3), w);
    Hs.push(psub(Hs[3], w), patch.at(6, 2));
    const take = (shape, list) => { const m = new Meta(shape); for (const k of list) m.add(patch.children[k].T, patch.children[k].geom); return m; };
    const H = take(Hs, [0, 9, 16, 27, 26, 6, 1, 8, 10, 15]);
    const P = take([p72, padd(p72, psub(bps1, llc)), bps1, llc], [7, 2, 3, 4, 28]);
    const F = take([bps2, patch.at(24, 2), patch.at(25, 0), p252, padd(p252, psub(llc, bps1))], [21, 20, 22, 23, 24, 25]);
    const B = padd(Hs[1], psub(Hs[4], Hs[5]));
    const T = take([B, transPt(rotAbout(B, -Math.PI / 3), Hs[2]), Hs[2]], [11]);
    for (const m of [H, P, F, T]) m.recentre();
    return { H, T, P, F };
  }
  // every hat of a metatile: its transform
  const hatsOf = (geom, T, out) => { if (geom.hat) out.push(T); else for (const ch of geom.children) hatsOf(ch.geom, mul(T, ch.T), out); return out; };
  const S = 0.54;  // world units a hatviz unit: a hat about as big as a square
  const cache = {};
  return (W) => cache[W] ??= (() => {
    let shapes = { H: H0, T: T0, P: P0, F: F0 }, all;
    for (;;) { all = hatsOf(patchOf(shapes), ident, []); if (all.length >= 6 * W * W) break; shapes = metatilesOf(patchOf(shapes)); }
    // each hat: its middle (its corners' mean, moved), its corners only when wanted
    const c0 = corners.reduce((s, q) => padd(s, q), pt(0, 0)), c = pt(c0.x / corners.length, c0.y / corners.length);
    const hats = all.map((T) => { const q = transPt(T, c); return { T, m: [q.x * S, -q.y * S], flip: T[0] * T[4] - T[1] * T[3] < 0 }; });
    const poly = (h) => (h.p ??= corners.map((q) => transPt(h.T, q)).map((q) => [q.x * S, -q.y * S]));
    // the middle: where a square of W² hats' room (a hat about 1 square unit) holds the most of them, the nearest the
    // patch's centre (its outline is ragged: round its centre, a corner may be bare)
    const box = (d) => hats.reduce(([a, b], h) => [Math.min(a, h.m[d]), Math.max(b, h.m[d])], [Infinity, -Infinity]), [bx, by] = [box(0), box(1)];
    const half = (Math.sqrt(W * W) * 1.05) / 2, centre = [(bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2];
    // (the hats by unit cells of a grid over the patch, summed from a corner: a box's count at once)
    const nx = Math.ceil(bx[1] - bx[0]) + 2, ny = Math.ceil(by[1] - by[0]) + 2, sum = new Int32Array((nx + 1) * (ny + 1));
    for (const h of hats) sum[(Math.floor(h.m[1] - by[0]) + 1) * (nx + 1) + Math.floor(h.m[0] - bx[0]) + 1]++;
    for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) sum[y * (nx + 1) + x] += sum[(y - 1) * (nx + 1) + x] + sum[y * (nx + 1) + x - 1] - sum[(y - 1) * (nx + 1) + x - 1];
    const count = (x0, y0, x1, y1) => sum[y1 * (nx + 1) + x1] - sum[y0 * (nx + 1) + x1] - sum[y1 * (nx + 1) + x0] + sum[y0 * (nx + 1) + x0];
    const k = Math.ceil(2 * half) + 1;
    let mid = centre, best = -1;
    for (let y = 0; y + k <= ny; y++) for (let x = 0; x + k <= nx; x++) {
      const c = [bx[0] + x + k / 2, by[0] + y + k / 2], score = count(x, y, x + k, y + k) - 1e-3 * Math.hypot(c[0] - centre[0], c[1] - centre[1]);
      if (score > best) { best = score; mid = c; }
    }
    const far = (h) => Math.max(Math.abs(h.m[0] - mid[0]), Math.abs(h.m[1] - mid[1]));
    hats.sort((a, b) => far(a) - far(b));
    const cells = hats.slice(0, W * W).sort((a, b) => a.m[1] - b.m[1]), rows = [];
    cells.forEach(poly);
    for (let y = 0; y < W; y++) rows.push(...cells.slice(y * W, (y + 1) * W).sort((a, b) => a.m[0] - b.m[0]));
    // the walls: the hats beyond touching one of them (sharing a corner)
    const key = ([u, v]) => `${Math.round(u * 1000)},${Math.round(v * 1000)}`, inside = new Set(rows.flatMap((h) => h.p.map(key)));
    const edge = far(hats[W * W - 1]) + 3, near = [];  // (the hats just beyond: the next ones by distance)
    for (let k = W * W; k < hats.length && far(hats[k]) < edge; k++) near.push(hats[k]);
    const walls = near.filter((h) => poly(h).some((q) => inside.has(key(q)))).map((h) => h.p);
    // placed as the squares' grid of side W (middle at (W − 1) / 2 both ways): another size grows from the same place
    const o = [mid[0] - (W - 1) / 2, mid[1] - (W - 1) / 2], at = (p) => p.map(([u, v]) => [u - o[0], v - o[1]]);
    return { polys: rows.map((h) => at(h.p)), flips: rows.map((h) => h.flip), walls: walls.map(at), key };
  })();
})();
export function hatGrid(W) {
  const h = HAT(W), n = W * W, by = new Map(), start = new Int32Array(n + 1), list = [];
  h.polys.forEach((p, t) => p.forEach((q) => { const k = h.key(q); (by.get(k) ?? by.set(k, []).get(k)).push(t); }));
  for (let t = 0; t < n; t++) {
    const around = new Set();
    for (const q of h.polys[t]) for (const u of by.get(h.key(q))) if (u !== t) around.add(u);
    start[t] = list.length;
    list.push(...[...around].sort((a, b) => a - b));
  }
  start[n] = list.length;
  return { W, row: W, n, start, list: Int32Array.from(list) };
}

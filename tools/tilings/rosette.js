// Rosettes: Sugimoto's pentagon for n-fold turns (Sugimoto, arXiv 2005.08470: A = 180° − 240°/n, B = 360°/n, C = 180° −
// 120°/n, D = 90° − 60°/n, E = 90° + 60°/n; its sides 1 but DE, 2 sin(B / 2)): a tiling n-fold round its middle, never
// repeating. From a middle (n of them round their corner B, or, for Hirschhorn's flower, n = 6, its middle as Wikimedia
// draws it: Hirschhorn_6-fold-rotational_symmetry_pentagonal_tiling.svg, 21 tiles a sixth, 126 in all, read off it), grown
// out to any size n tiles at a time (its n turns): the open corner with the least room left takes a tile on one of its
// open sides, every way that fits (5 sides as long, mirrored or not; edge to edge; the room left at each corner one the
// angles can fill, counted in n-ths of a degree), depth first, back on a dead end. As the hats (see squarePatch): its W²
// tiles nearest its middle, each a square unit. main.js has a copy (ROSETTE); this one for the searches (rosetteGrid)
const roundOff = (x, k = 1000) => Math.round(x * k + 0.37), pointKey = ([x, y], k = 1000) => `${roundOff(x, k)},${roundOff(y, k)}`;  // (as main.js's)
// An aperiodic tiling's grid of side W (the hats, Penrose's rhombi): from a patch of it (items: their middles m, each
// about a square unit; poly(item): its corners), the W² items nearest a middle (a square), in W bands from the top,
// each by x (a cell (x, y) as on the other grids); the items round them, its walls
function squarePatch(items, W, poly, round = false, middle = null) {  // round: walls in a circle (the items nearest the middle), else a square
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
  const far = (h) => (round ? Math.hypot(h.m[0] - mid[0], h.m[1] - mid[1]) : Math.max(Math.abs(h.m[0] - mid[0]), Math.abs(h.m[1] - mid[1])));
  items.sort((a, b) => far(a) - far(b));
  const cells = items.slice(0, W * W).sort((a, b) => a.m[1] - b.m[1]), rows = [];
  cells.forEach(poly);
  for (let y = 0; y < W; y++) rows.push(...cells.slice(y * W, (y + 1) * W).sort((a, b) => a.m[0] - b.m[0]));
  // the walls: the items beyond touching one of them (sharing a corner)
  const inside = new Set(rows.flatMap((h) => h.p.map((p) => pointKey(p))));
  const edge = far(items[W * W - 1]) + 3, near = [];  // (the items just beyond: the next ones by distance)
  for (let k = W * W; k < items.length && far(items[k]) < edge; k++) near.push(items[k]);
  const walls = near.filter((h) => poly(h).some((q) => inside.has(pointKey(q)))).map((h) => h.p);
  // placed as the squares' grid of side W (middle at (W − 1) / 2 both ways): another size grows from the same place
  const o = [mid[0] - (W - 1) / 2, mid[1] - (W - 1) / 2], at = (p) => p.map(([u, v]) => [u - o[0], v - o[1]]);
  return { polys: rows.map((h) => at(h.p)), walls: walls.map(at) };
}
function ROSETTE(n, seed = null) {
  const deg = [180 - 240 / n, 360 / n, 180 - 120 / n, 90 - 60 / n, 90 + 60 / n], side = [1, 1, 1, 2 * Math.sin(Math.PI / n), 1];  // A B C D E; AB BC CD DE EA
  const P0 = [[0, 0]];
  for (let i = 0, h = 0; i < 4; i++) { const [x, y] = P0[i]; P0.push([x + side[i] * Math.cos((h * Math.PI) / 180), y + side[i] * Math.sin((h * Math.PI) / 180)]); h += 180 - deg[i + 1]; }
  const A0 = deg.map((d) => Math.round(d * n)), FULL = 360 * n;  // (angles in n-ths of a degree: whole numbers)
  const SH = [];  // the tile and its mirror, from each corner (counterclockwise): its corners and their angles
  for (const [P, A] of [[P0, A0], [P0.map(([x, y]) => [x, -y]).reverse(), [...A0].reverse()]]) for (let s = 0; s < 5; s++) SH.push([[...P.slice(s), ...P.slice(0, s)], [...A.slice(s), ...A.slice(0, s)]]);
  const fill = new Set([0]);  // (the room the angles can fill: their sums up to a whole turn)
  for (let r = 0; r < 12; r++) for (const f of [...fill]) for (const a of A0) if (f + a <= FULL) fill.add(f + a);
  const key = (p) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`, mid = (P) => [0, 1].map((d) => P.reduce((t, q) => t + q[d], 0) / P.length);
  const turn = (P, k) => { const c = Math.cos((2 * k * Math.PI) / n), s = Math.sin((2 * k * Math.PI) / n); return P.map(([x, y]) => [c * x - s * y, s * x + c * y]); };
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const angleOf = (P) => P.map((p, i) => {  // a seed tile's angles, from its sides
    const a = P[(i + 4) % 5], c = P[(i + 1) % 5], v1 = [a[0] - p[0], a[1] - p[1]], v2 = [c[0] - p[0], c[1] - p[1]];
    return Math.round((Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / len(p, a) / len(p, c)))) * 180 * n) / Math.PI);
  });
  const overlap = (P, Q) => {  // convex, their insides meeting (no axis of a side between them)
    for (const poly of [P, Q]) for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length], nx = y1 - y2, ny = x2 - x1;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, y] of P) { const d = nx * x + ny * y; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const [x, y] of Q) { const d = nx * x + ny * y; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 <= b0 + 1e-7 || b1 <= a0 + 1e-7) return false;
    }
    return true;
  };
  const grow = (R) => {
    const tiles = [], grid = new Map(), at = new Map(), open = new Set(), cellOf = (p) => `${Math.floor(p[0] / 2)},${Math.floor(p[1] / 2)}`;
    const add = (P, A) => {
      const j = tiles.length, m = mid(P);
      tiles.push({ P, A });
      (grid.get(cellOf(m)) ?? grid.set(cellOf(m), []).get(cellOf(m))).push(j);
      P.forEach((p, i) => { const k = key(p), e = at.get(k) ?? at.set(k, { p, sum: 0, uses: [] }).get(k); e.sum += A[i]; e.uses.push([j, i]); if (e.sum < FULL && Math.hypot(...p) <= R) open.add(k); else open.delete(k); });
    };
    const remove = () => {
      const j = tiles.length - 1, { P, A } = tiles.pop(), g = grid.get(cellOf(mid(P)));
      g.splice(g.indexOf(j), 1);
      P.forEach((p, i) => { const k = key(p), e = at.get(k); e.sum -= A[i]; e.uses.pop(); if (!e.uses.length) { at.delete(k); open.delete(k); } else if (Math.hypot(...p) <= R) open.add(k); });
    };
    const fits = (P, A) => {
      const [cx, cy] = mid(P).map((v) => Math.floor(v / 2));
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${cx + dx},${cy + dy}`) ?? []) if (overlap(P, tiles[j].P)) return false;
      return P.every((p, i) => { const have = (at.get(key(p))?.sum ?? 0) + A[i]; return have <= FULL && fill.has(FULL - have); });
    };
    const place = ([Q, A], a, b) => {  // its first side (Q0 → Q1) laid on b → a
      const t = Math.atan2(a[1] - b[1], a[0] - b[0]) - Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]), c = Math.cos(t), s = Math.sin(t);
      return [Q.map(([x, y]) => [b[0] + c * (x - Q[0][0]) - s * (y - Q[0][1]), b[1] + s * (x - Q[0][0]) + c * (y - Q[0][1])]), A];
    };
    // the middle: the seed's tiles n times round, or n tiles round their corner B
    if (seed) for (let k = 0; k < n; k++) for (const P of seed) { const Q = turn(P, k); add(Q, angleOf(Q)); }
    else { const [Q, A] = SH[1], t = -Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]), c = Math.cos(t), s = Math.sin(t), star = Q.map(([x, y]) => [c * (x - Q[0][0]) - s * (y - Q[0][1]), s * (x - Q[0][0]) + c * (y - Q[0][1])]);
      for (let k = 0; k < n; k++) add(turn(star, k), A); }
    let steps = 0;
    const step = () => {
      if (++steps > 2e6) throw new Error('rosette: too many steps');
      let best = null;
      for (const k of open) { const e = at.get(k); if (!best || e.sum > best.sum) best = e; }
      if (!best) return true;
      // (its open sides: the sides at it with a tile on one side only, that tile on their left)
      const sides = new Map();
      for (const [j, i] of best.uses) { const P = tiles[j].P; for (const [a, b] of [[P[i], P[(i + 1) % 5]], [P[(i + 4) % 5], P[i]]]) sides.set(`${key(a)}|${key(b)}`, [a, b]); }
      for (const [s, [a, b]] of sides) {
        const [ka, kb] = s.split('|');
        if (sides.has(`${kb}|${ka}`)) continue;
        for (const sh of SH) {
          if (Math.abs(len(sh[0][0], sh[0][1]) - len(a, b)) > 1e-6) continue;  // (a side as long)
          const [P, A] = place(sh, a, b);
          let added = 0;
          for (let r = 0; r < n; r++) { const Q = turn(P, r); if (!fits(Q, A)) break; add(Q, A); added++; }
          if (added === n && step()) return true;
          for (let r = 0; r < added; r++) remove();
        }
        return false;  // (this side takes a tile, and none fits: a dead end)
      }
      return false;
    };
    if (!step()) throw new Error('rosette: stuck');
    return tiles.map((t) => t.P);
  };
  const area = (P) => Math.abs(P.reduce((t, p, i) => t + p[0] * P[(i + 1) % 5][1] - P[(i + 1) % 5][0] * p[1], 0) / 2), U = 1 / Math.sqrt(area(P0));  // (a tile a square unit)
  const cache = {};
  return (W, round = false) => cache[`${W} ${round}`] ??= (() => {
    const R = (0.525 * W * Math.SQRT2 + 5) / U;  // (round the W² tiles' square, its walls too)
    const items = grow(R).map((P) => { const p = P.map(([x, y]) => [x * U, y * U]); return { p, m: mid(p) }; });
    return squarePatch(items, W, (h) => h.p, round, [0, 0]);  // (round its middle)
  })();
}
// the rosettes offered: Hirschhorn's flower (6-fold, its middle as drawn), the 5-fold and the 7-fold (from their stars)
const FLOWER_SEED = [[[0.0,0.0],[1.0,0.0],[1.9396926208,0.3420201433],[1.4396926208,1.2080455471],[0.5,0.8660254038]],[[1.0,0.0],[1.7660444431,-0.6427876097],[2.7057370639,-0.984807753],[2.8793852416,-0.0],[1.9396926208,0.3420201433]],[[2.2057370639,-1.8508331568],[2.3793852416,-2.8356409098],[3.3793852416,-2.8356409098],[3.2057370639,-1.8508331568],[2.7057370639,-0.984807753]],[[2.8793852416,0.0],[2.7057370639,0.984807753],[2.2057370639,1.8508331568],[1.4396926208,1.2080455471],[1.9396926208,0.3420201433]],[[2.7057370639,-0.984807753],[3.2057370639,-1.8508331568],[4.1454296847,-1.5088130135],[3.6454296847,-0.6427876097],[2.8793852416,0.0]],[[2.8793852416,-0.0],[3.6454296847,-0.6427876097],[4.4114741278,0.0],[3.6454296847,0.6427876097],[2.7057370639,0.984807753]],[[4.4114741278,0.0],[5.4114741278,0.0],[6.3511667486,0.3420201433],[5.8511667486,1.2080455471],[4.9114741278,0.8660254038]],[[4.4114741278,0.0],[3.6454296847,-0.6427876097],[4.1454296847,-1.5088130135],[4.9114741278,-0.8660254038],[5.4114741278,0.0]],[[4.9114741278,0.8660254038],[5.8511667486,1.2080455471],[6.6172111917,1.8508331568],[5.8511667486,2.4936207665],[5.0851223055,1.8508331568]],[[4.1454296847,1.5088130135],[3.6454296847,0.6427876097],[4.4114741278,-0.0],[4.9114741278,0.8660254038],[5.0851223055,1.8508331568]],[[4.1454296847,-1.5088130135],[5.0851223055,-1.8508331568],[6.0851223055,-1.8508331568],[5.9114741278,-0.8660254038],[4.9114741278,-0.8660254038]],[[4.9114741278,-0.8660254038],[5.9114741278,-0.8660254038],[6.8511667486,-0.5240052605],[6.3511667486,0.3420201433],[5.4114741278,0.0]],[[4.1454296847,-1.5088130135],[3.2057370639,-1.8508331568],[3.3793852416,-2.8356409098],[4.3190778624,-2.4936207665],[5.0851223055,-1.8508331568]],[[4.3190778624,-2.4936207665],[5.2587704831,-2.8356409098],[6.2587704831,-2.8356409098],[6.0851223055,-1.8508331568],[5.0851223055,-1.8508331568]],[[3.3793852416,-2.8356409098],[4.1454296847,-3.4784285195],[5.0851223055,-3.8204486628],[5.2587704831,-2.8356409098],[4.3190778624,-2.4936207665]],[[7.0248149263,-1.5088130135],[6.0851223055,-1.8508331568],[6.2587704831,-2.8356409098],[7.1984631039,-2.4936207665],[7.964507547,-1.8508331568]],[[6.8511667486,-0.5240052604],[5.9114741278,-0.8660254038],[6.0851223055,-1.8508331568],[7.0248149263,-1.5088130135],[7.7908593694,-0.8660254038]],[[6.2587704831,-2.8356409098],[5.2587704831,-2.8356409098],[5.0851223055,-3.8204486629],[6.0851223055,-3.8204486628],[7.0248149263,-3.4784285195]],[[7.1172111917,0.984807753],[6.3511667486,0.3420201433],[6.8511667486,-0.5240052605],[7.6172111917,0.1187823492],[8.1172111917,0.984807753]],[[6.6172111917,1.8508331568],[5.8511667486,1.2080455471],[6.3511667486,0.3420201433],[7.1172111917,0.984807753],[7.6172111917,1.8508331568]],[[6.3511667486,3.3596461703],[5.8511667486,2.4936207665],[6.6172111917,1.8508331568],[7.1172111917,2.7168585606],[7.2908593694,3.7016663136]]];
const ROSETTES = { flower: [6, ROSETTE(6, FLOWER_SEED)], flower5: [5, ROSETTE(5)], flower7: [7, ROSETTE(7)] };
export function rosetteGrid(name, W) {
  const h = ROSETTES[name][1](W), n = W * W, by = new Map(), start = new Int32Array(n + 1), list = [], k = ([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
  h.polys.forEach((p, t) => p.forEach((q) => { (by.get(k(q)) ?? by.set(k(q), []).get(k(q))).push(t); }));
  for (let t = 0; t < n; t++) {
    const around = new Set();
    for (const q of h.polys[t]) for (const u of by.get(k(q))) if (u !== t) around.add(u);
    start[t] = list.length;
    list.push(...[...around].sort((a, b) => a - b));
  }
  start[n] = list.length;
  return { W, row: W, n, start, list: Int32Array.from(list), per: 1 };
}
export { ROSETTE, ROSETTES };

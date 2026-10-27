// The rosettes as main.js builds them (a copy: ROSETTE, HIRSCHHORN; discPatch in ./patch.js), and their grids for the searches
import { discPatch, patchGrid } from './patch.js';
const polyArea = (P) => Math.abs(P.reduce((t, p, i) => t + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0) / 2);
function ROSETTE(n, grow = null, hole = false) {  // grow: its own tiles (Hirschhorn's); hole: round a regular n-gon left empty (its own pentagon: Sugimoto's (3))
  const deg = hole ? [180 - 720 / n, 1080 / n, 180 - 360 / n, 90 - 180 / n, 90 + 180 / n] : [180 - 240 / n, 360 / n, 180 - 120 / n, 90 - 60 / n, 90 + 60 / n];  // A B C D E
  // its corners: AB, BC, CD of side 1, then DE and EA as the angles close it (DE: 2 sin(B / 2) round a star; EA: 1)
  const dir = [0]; for (let i = 1; i < 5; i++) dir.push(dir[i - 1] + 180 - deg[i]);
  const u = dir.map((h) => [Math.cos((h * Math.PI) / 180), Math.sin((h * Math.PI) / 180)]), D3 = [0, 1].map((k) => u[0][k] + u[1][k] + u[2][k]);
  const det = u[3][0] * u[4][1] - u[3][1] * u[4][0], e = (-D3[0] * u[4][1] + D3[1] * u[4][0]) / det, f = (-u[3][0] * D3[1] + u[3][1] * D3[0]) / det;  // (DE·u3 + EA·u4 = −(AB + BC + CD))
  const side = [1, 1, 1, e, f], P0 = [[0, 0]];
  for (let i = 0; i < 4; i++) P0.push([P0[i][0] + side[i] * u[i][0], P0[i][1] + side[i] * u[i][1]]);
  const mid = (P) => [0, 1].map((d) => P.reduce((t, q) => t + q[d], 0) / P.length), len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  // Sugimoto's own construction (his Figure 4), any n: the tiles in pairs mirrored on their side DE (his
  // Octa-units), in wedges of rows of 1, 2, 3… pairs (a pair to the next along DE, e; a row to the next e / 2 along and H
  // across, H the heights of B and C over DE); a wedge's first pair from the one before by its A mirrored, turned 120°/q (q
  // = n, or m / 3 round a hole of m: the same pentagon); a flower, 3 wedges a turn of n from its star (B in the middle); a
  // ring, its m wedges round the point that step keeps, its hole a regular m-gon
  const direct = (R) => {
    const q = hole ? n / 3 : n, [, , , D, E] = P0, e = len(D, E), a = Math.atan2(E[1] - D[1], E[0] - D[0]), ca = Math.cos(a), sa = Math.sin(a);
    let L = P0.map(([x, y]) => [(x - D[0]) * ca + (y - D[1]) * sa, -(x - D[0]) * sa + (y - D[1]) * ca]);
    if (L[1][1] < 0) L = L.map(([x, y]) => [x, -y]);  // (B above DE)
    const H = L[1][1] + L[2][1], t = (2 * Math.PI) / (3 * q), ct = Math.cos(t), st = Math.sin(t), [ax, ay] = [L[0][0], -L[0][1]];
    const d = (1 - ct) ** 2 + st ** 2, keep = [((1 - ct) * ax - st * ay) / d, (st * ax + (1 - ct) * ay) / d];  // (the point the step keeps)
    const S = hole ? n : q, per = hole ? 1 : 3, start = hole ? keep.map((v) => -v) : L[1].map((v) => -v), out = [];
    const pairs = [L, L.map(([x, y]) => [x, -y])];
    for (let k = 0; k < S; k++) {
      const g = (2 * Math.PI * k) / S;
      let o = [Math.cos(g) * start[0] - Math.sin(g) * start[1], Math.sin(g) * start[0] + Math.cos(g) * start[1]], f = g;
      for (let w = 0; w < per; w++) {
        const cf = Math.cos(f), sf = Math.sin(f), at = ([x, y]) => [o[0] + cf * x - sf * y, o[1] + sf * x + cf * y];
        for (let r = 0; r * H < R + 2 * H + Math.hypot(...o); r++) for (let i = 0; i <= r; i++) {
          const p = at([(i - r / 2) * e, -r * H]);
          if (Math.hypot(...p) < R + 3) for (const T of pairs) out.push(T.map(([x, y]) => at([x + (i - r / 2) * e, y - r * H])));
        }
        o = at([ax, ay]); f += t;
      }
    }
    // turned: its star's side BC along x; round a hole, the hole first, its corners at 180°/n − 90° and on, n of them
    const turn = hole ? Math.PI / n - Math.PI / 2 - (() => { const r = 1 / (2 * Math.sin(Math.PI / n)), c = out.flat().find((p) => Math.abs(Math.hypot(...p) - r) < 1e-6); return Math.atan2(c[1], c[0]); })()
      : -Math.atan2(out[0][2][1] - out[0][1][1], out[0][2][0] - out[0][1][0]);
    const T = ([x, y]) => [Math.cos(turn) * x - Math.sin(turn) * y, Math.sin(turn) * x + Math.cos(turn) * y], tiles = out.map((P) => P.map(T));
    if (!hole) return tiles;
    const r = 1 / (2 * Math.sin(Math.PI / n));
    return [[...Array(n).keys()].map((k) => [r * Math.cos(((2 * k + 1) * Math.PI) / n - Math.PI / 2), r * Math.sin(((2 * k + 1) * Math.PI) / n - Math.PI / 2)]), ...tiles];
  };
  const U = 1 / Math.sqrt(polyArea(P0));  // (a tile a square unit)
  const cache = {};
  return (W) => cache[W] ??= (() => {
    const R = (0.525 * W * Math.SQRT2 + 5) / U;  // (round the W² tiles' square, its walls too)
    const items = (grow ?? direct)(R).map((P, i) => { const p = P.map(([x, y]) => [x * U, y * U]); return { p, m: mid(p), dead: hole && i === 0 }; });  // (the hole: a cell of the wall)
    return discPatch(items, W, (h) => h.p, [0, 0]);  // (round its middle)
  })();
}
/* Hirschhorn's flower (Wikimedia: Hirschhorn_6-fold-rotational_symmetry_pentagonal_tiling.svg): the rosettes' pentagon for 6
 * turns, its sides all 1, each a multiple of 20° (A B C D E: 140° 60° 160° 80° 100°), so each corner a whole sum of the 18
 * ways ζᵏ (ζ = e^(iπ/9)): 6 whole numbers (ζ⁶ = ζ³ − 1), the same corner the same numbers however reached. Its middle as
 * Wikimedia draws it (21 tiles a sixth, read off it: each its corner A, mirrored or not, the way of its side AB), then out 6
 * tiles at a time (its turns): at the open corner most filled, its first side with a tile on one side only, the first tile
 * that fits (edge to edge, overlapping none, the room left at each corner one the angles can fill: 0, or 60° and more) */
const FLOWER_SEED = [[[0,0,0,1,0,0],0,12],[[1,1,0,0,0,0],0,10],[[1,1,1,-1,-1,-2],1,3],[[1,1,0,0,0,0],0,17],[[2,1,1,-1,-1,-1],1,4],[[1,2,1,0,-1,-1],1,5],[[1,2,2,1,-1,-1],0,12],[[1,2,1,0,-1,-1],1,0],[[1,2,2,1,0,-1],0,13],[[1,1,2,0,0,-1],1,1],[[2,2,2,-1,-1,-1],0,11],[[2,2,2,0,-1,-1],0,12],[[2,1,1,-1,-1,-1],1,17],[[2,2,2,-1,-1,-2],0,11],[[2,2,1,-1,-1,-2],0,10],[[3,2,2,-1,-1,-2],1,17],[[3,2,2,-1,-1,-1],1,17],[[2,2,2,-1,-1,-3],1,16],[[2,3,2,0,-1,-1],1,0],[[1,3,2,1,-1,-1],1,0],[[1,2,3,1,0,-1],1,1]];
function HIRSCHHORN(R) {
  const times = ([a, b, c, d, e, f]) => [-f, a, b, c + f, d, e], ZETA = [[1, 0, 0, 0, 0, 0]];  // (× ζ)
  for (let k = 1; k < 18; k++) ZETA.push(times(ZETA[k - 1]));
  const mod = (k) => ((k % 18) + 18) % 18, key = (p) => p.join(), CS = [Math.cos, Math.sin].map((f) => [0, 1, 2, 3, 4, 5].map((i) => f((i * Math.PI) / 9)));
  const xy = (p) => CS.map((c) => p.reduce((t, v, i) => t + v * c[i], 0));
  const WAYS = [[0, 6, 7, 12, 16], [15, 2, 3, 9, 11]];  // its sides' ways (AB BC CD DE EA), mirrored (E'D' D'C' C'B' B'A' A'E'), counterclockwise
  const mid = (X) => [0, 1].map((d) => X.reduce((t, q) => t + q[d], 0) / 5), cellOf = (m) => `${Math.floor(m[0] / 2)},${Math.floor(m[1] / 2)}`;
  const tile = (p, m, d, s = 0) => {  // from p, its corner s, its sides' ways turned d: its corners and their angles (in 20°s)
    const W = [0, 1, 2, 3, 4].map((i) => WAYS[m][(s + i) % 5]), P = [p];
    for (let i = 0; i < 4; i++) P.push(P[i].map((v, j) => v + ZETA[mod(W[i] + d)][j]));
    const X = P.map(xy);
    return { P, X, m: mid(X), A: W.map((w, i) => 9 - mod(w - W[(i + 4) % 5])) };
  };
  const REACH = (({ X, m }) => Math.max(...X.map((q) => Math.hypot(q[0] - m[0], q[1] - m[1]))))(tile([0, 0, 0, 0, 0, 0], 0, 0));  // (its corner furthest from its middle)
  const sixth = ([a, b, c, d, e, f]) => [-d, -e, -f, a + d, b + e, c + f];  // (× ζ³: a sixth of a turn)
  const turn = (T, k) => { const P = T.P.map((p) => { for (let r = 0; r < k; r++) p = sixth(p); return p; }); const X = P.map(xy); return { P, X, m: mid(X), A: T.A }; };  // (k sixths)
  const overlap = (P, Q) => {  // convex, their insides meeting (no axis of a side between them)
    for (const poly of [P, Q]) for (let i = 0; i < 5; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 5], nx = y1 - y2, ny = x2 - x1;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, y] of P) { const d = nx * x + ny * y; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const [x, y] of Q) { const d = nx * x + ny * y; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 <= b0 + 1e-7 || b1 <= a0 + 1e-7) return false;
    }
    return true;
  };
  const tiles = [], grid = new Map(), at = new Map(), open = new Set();
  const add = (T) => {
    const j = tiles.length, c = cellOf(T.m);
    tiles.push(T);
    (grid.get(c) ?? grid.set(c, []).get(c)).push(j);
    T.P.forEach((p, i) => { const k = key(p), e = at.get(k) ?? at.set(k, { sum: 0, uses: [] }).get(k); e.sum += T.A[i]; e.uses.push([j, i]); if (e.sum < 18 && Math.hypot(...T.X[i]) <= R) open.add(k); else open.delete(k); });
  };
  const fits = (T) => {
    const [cx, cy] = T.m.map((v) => Math.floor(v / 2));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      const U = tiles[j]; if (Math.hypot(U.m[0] - T.m[0], U.m[1] - T.m[1]) < 2 * REACH && overlap(T.X, U.X)) return false;
    }
    return T.P.every((p, i) => { const left = 18 - (at.get(key(p))?.sum ?? 0) - T.A[i]; return left === 0 || left >= 3; });
  };
  const remove = () => {
    const j = tiles.length - 1, T = tiles.pop(), g = grid.get(cellOf(T.m));
    g.splice(g.indexOf(j), 1);
    T.P.forEach((p, i) => { const k = key(p), e = at.get(k); e.sum -= T.A[i]; e.uses.pop(); if (!e.uses.length) { at.delete(k); open.delete(k); } else if (Math.hypot(...T.X[i]) <= R) open.add(k); });
  };
  const frame = () => {  // at the open corner most filled (the first opened), its first side with a tile on one side only (that tile on its left): each shape laid on it the other way, b to a
    let best = null;
    for (const k of open) { const e = at.get(k); if (!best || e.sum > best.sum) best = e; }
    if (!best) return null;  // (none left: done)
    const sides = new Map();
    for (const [j, i] of best.uses) { const P = tiles[j].P; for (const [a, b] of [[P[i], P[(i + 1) % 5]], [P[(i + 4) % 5], P[i]]]) sides.set(`${key(a)}|${key(b)}`, [a, b]); }
    const free = [...sides].find(([s]) => !sides.has(s.split('|').reverse().join('|')));
    if (!free) return { tries: [], i: 0, added: 0 };  // (no side free, the corner not full: a dead end)
    const [a, b] = free[1], way = ZETA.findIndex((z) => z.every((v, j) => v === a[j] - b[j]));
    return { tries: [0, 1].flatMap((m) => [0, 1, 2, 3, 4].map((s) => tile(b, m, way - WAYS[m][s], s))), i: 0, added: 0 };
  };
  for (let k = 0; k < 6; k++) for (const [p, m, d] of FLOWER_SEED) add(turn(tile(p, m, d), k));
  // depth first, a step a frame of a stack (not a call: thousands of them deep): a dead end, back to the last frame
  for (const stack = [frame()]; stack.length;) {
    const top = stack.at(-1);
    for (; top.added; top.added--) remove();  // (its last try undone)
    if (top.i >= top.tries.length) { stack.pop(); continue; }
    const T = top.tries[top.i++];
    if (!fits(T)) continue;  // (its turns fit as it does: all as far from the middle, the rest 6-fold too)
    for (let k = 0; k < 6; k++) add(turn(T, k));
    top.added = 6;
    const next = frame();
    if (!next) return tiles.map((T) => T.X);
    stack.push(next);
  }
  throw new Error('Hirschhorn: stuck');
}
const ROSETTES = { flower3: [3, ROSETTE(3)], flower4: [4, ROSETTE(4)], flower5: [5, ROSETTE(5)], flower: [6, ROSETTE(6, HIRSCHHORN)], flower7: [7, ROSETTE(7)], flower8: [8, ROSETTE(8)], flower9: [9, ROSETTE(9)], flower10: [10, ROSETTE(10)],
                   ring7: [7, ROSETTE(7, null, true), 1], ring8: [8, ROSETTE(8, null, true), 1],
                   ring9: [9, ROSETTE(9, null, true), 1], ring10: [10, ROSETTE(10, null, true), 1], ring12: [12, ROSETTE(12, null, true), 1] };  // (n, it, its cells of the wall: a ring's hole)
export const rosetteGrid = (name, W) => patchGrid(ROSETTES[name][1](W), W);  // (the wall's cells: a ring's hole and those past its circle)
export { ROSETTE, ROSETTES };

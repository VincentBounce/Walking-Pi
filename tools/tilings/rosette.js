// Rosettes: Sugimoto's pentagon for n-fold turns (Sugimoto, arXiv 2005.08470: A = 180° − 240°/n, B = 360°/n, C = 180° −
// 120°/n, D = 90° − 60°/n, E = 90° + 60°/n; its sides 1 but DE, 2 sin(B / 2)): a tiling n-fold round its middle, never
// repeating. From a middle (n of them round their corner B, or, for Hirschhorn's flower, n = 6, its middle as Wikimedia
// draws it: Hirschhorn_6-fold-rotational_symmetry_pentagonal_tiling.svg, 21 tiles a sixth, 126 in all, read off it), grown
// out to any size n tiles at a time (its n turns): the open corner with the least room left takes a tile on one of its
// open sides, every way that fits (5 sides as long, mirrored or not; edge to edge; the room left at each corner one the
// angles can fill, counted in n-ths of a degree), depth first, back on a dead end. As the hats (see discPatch): its W²
// tiles nearest its middle, each a square unit. main.js has a copy (ROSETTE); this one for the searches (rosetteGrid)
import { discPatch, patchGrid, pointKey } from './patch.js';
function ROSETTE(n, seed = null, hole = false) {  // hole: round a regular n-gon left empty (its own pentagon: Sugimoto's (3))
  const deg = hole ? [180 - 720 / n, 1080 / n, 180 - 360 / n, 90 - 180 / n, 90 + 180 / n] : [180 - 240 / n, 360 / n, 180 - 120 / n, 90 - 60 / n, 90 + 60 / n];  // A B C D E
  // its corners: AB, BC, CD of side 1, then DE and EA as the angles close it (DE: 2 sin(B / 2) round a star; EA: 1)
  const dir = [0]; for (let i = 1; i < 5; i++) dir.push(dir[i - 1] + 180 - deg[i]);
  const u = dir.map((h) => [Math.cos((h * Math.PI) / 180), Math.sin((h * Math.PI) / 180)]), D3 = [0, 1].map((k) => u[0][k] + u[1][k] + u[2][k]);
  const det = u[3][0] * u[4][1] - u[3][1] * u[4][0], e = (-D3[0] * u[4][1] + D3[1] * u[4][0]) / det, f = (-u[3][0] * D3[1] + u[3][1] * D3[0]) / det;  // (DE·u3 + EA·u4 = −(AB + BC + CD))
  const side = [1, 1, 1, e, f], P0 = [[0, 0]];
  for (let i = 0; i < 4; i++) P0.push([P0[i][0] + side[i] * u[i][0], P0[i][1] + side[i] * u[i][1]]);
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
    // the middle: the seed's tiles n times round; or n tiles round their corner B; or round a hole, a regular n-gon of side 1
    // (its corners' angles, 180° − 360°/n, A + B more round them), a tile's side AB on each of its sides
    if (hole) {
      const r = 1 / (2 * Math.sin(Math.PI / n)), gon = [...Array(n).keys()].map((k) => [r * Math.cos(((2 * k + 1) * Math.PI) / n - Math.PI / 2), r * Math.sin(((2 * k + 1) * Math.PI) / n - Math.PI / 2)]);
      add(gon, gon.map(() => Math.round((180 - 360 / n) * n)));
      for (let k = 0; k < n; k++) add(...place(SH[0], gon[k], gon[(k + 1) % n]));
    } else if (seed) for (let k = 0; k < n; k++) for (const P of seed) { const Q = turn(P, k); add(Q, angleOf(Q)); }
    else { const [Q, A] = SH[1], t = -Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]), c = Math.cos(t), s = Math.sin(t), star = Q.map(([x, y]) => [c * (x - Q[0][0]) - s * (y - Q[0][1]), s * (x - Q[0][0]) + c * (y - Q[0][1])]);
      for (let k = 0; k < n; k++) add(turn(star, k), A); }
    // a search, a step a frame of a stack (not a call: thousands of them deep): at the open corner most filled, its first
    // side with a tile on one side only; each shape as long laid on it, n at a time; a dead end, back to the last frame
    const frame = () => {
      let best = null;
      for (const k of open) { const e = at.get(k); if (!best || e.sum > best.sum) best = e; }
      if (!best) return null;  // (none left: done)
      // (its open sides: the sides at it with a tile on one side only, that tile on their left)
      const sides = new Map();
      for (const [j, i] of best.uses) { const P = tiles[j].P, L = P.length; for (const [a, b] of [[P[i], P[(i + 1) % L]], [P[(i + L - 1) % L], P[i]]]) sides.set(`${key(a)}|${key(b)}`, [a, b]); }
      for (const [s, [a, b]] of sides) {
        const [ka, kb] = s.split('|');
        if (!sides.has(`${kb}|${ka}`)) return { tries: SH.filter((sh) => Math.abs(len(sh[0][0], sh[0][1]) - len(a, b)) < 1e-6).map((sh) => place(sh, a, b)), i: 0, added: 0 };
      }
      return { tries: [], i: 0, added: 0 };  // (no side free, the corner not full: a dead end)
    };
    const stack = [frame()];
    for (let steps = 0; stack[0] && stack.length;) {
      if (++steps > 2e6) throw new Error('rosette: too many steps');
      const top = stack.at(-1);
      for (; top.added; top.added--) remove();  // (its last try undone)
      if (top.i >= top.tries.length) { stack.pop(); continue; }
      const [P, A] = top.tries[top.i++];
      for (let r = 0; r < n; r++) { const Q = turn(P, r); if (!fits(Q, A)) break; add(Q, A); top.added++; }
      if (top.added < n) continue;
      const next = frame();
      if (!next) break;
      stack.push(next);
    }
    if (!stack.length) throw new Error('rosette: stuck');
    return tiles.map((t) => t.P);  // (round a hole: the hole first)
  };
  // Sugimoto's own construction (his Figure 4), no search, any n: the tiles in pairs mirrored on their side DE (his
  // Octa-units), in wedges of rows of 1, 2, 3… pairs (a pair to the next along DE, e; a row to the next e / 2 along and H
  // across, H the heights of B and C over DE); a wedge's first pair from the one before by its A mirrored, turned 120°/q (q
  // = n, or m / 3 round a hole of m: the same pentagon); a flower, 3 wedges a turn of n from its star (B in the middle); a
  // ring, its m wedges round the point that step keeps, its hole a regular m-gon. As the search's (its tiles where they were)
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
    // as the search's: its star's side BC along x; round a hole, the hole first, its corners where the search's were
    const turn = hole ? Math.PI / n - Math.PI / 2 - (() => { const r = 1 / (2 * Math.sin(Math.PI / n)), c = out.flat().find((p) => Math.abs(Math.hypot(...p) - r) < 1e-6); return Math.atan2(c[1], c[0]); })()
      : -Math.atan2(out[0][2][1] - out[0][1][1], out[0][2][0] - out[0][1][0]);
    const T = ([x, y]) => [Math.cos(turn) * x - Math.sin(turn) * y, Math.sin(turn) * x + Math.cos(turn) * y], tiles = out.map((P) => P.map(T));
    if (!hole) return tiles;
    const r = 1 / (2 * Math.sin(Math.PI / n));
    return [[...Array(n).keys()].map((k) => [r * Math.cos(((2 * k + 1) * Math.PI) / n - Math.PI / 2), r * Math.sin(((2 * k + 1) * Math.PI) / n - Math.PI / 2)]), ...tiles];
  };
  const area = (P) => Math.abs(P.reduce((t, p, i) => t + p[0] * P[(i + 1) % 5][1] - P[(i + 1) % 5][0] * p[1], 0) / 2), U = 1 / Math.sqrt(area(P0));  // (a tile a square unit)
  const cache = {};
  return (W) => cache[W] ??= (() => {
    const R = (0.525 * W * Math.SQRT2 + 5) / U;  // (round the W² tiles' square, its walls too)
    const items = (seed ? grow(R) : direct(R)).map((P, i) => { const p = P.map(([x, y]) => [x * U, y * U]); return { p, m: mid(p), dead: hole && i === 0 }; });  // (the hole: a cell of the wall)
    return discPatch(items, W, (h) => h.p, [0, 0]);  // (round its middle)
  })();
}
// the rosettes offered: Hirschhorn's flower (6-fold, its middle as drawn), the 3-, 4-, 5-, 7- and 8-fold (from their stars), the
// 7- and 8-fold rings (round a hole)
const FLOWER_SEED = [[[0.0,0.0],[1.0,0.0],[1.9396926208,0.3420201433],[1.4396926208,1.2080455471],[0.5,0.8660254038]],[[1.0,0.0],[1.7660444431,-0.6427876097],[2.7057370639,-0.984807753],[2.8793852416,-0.0],[1.9396926208,0.3420201433]],[[2.2057370639,-1.8508331568],[2.3793852416,-2.8356409098],[3.3793852416,-2.8356409098],[3.2057370639,-1.8508331568],[2.7057370639,-0.984807753]],[[2.8793852416,0.0],[2.7057370639,0.984807753],[2.2057370639,1.8508331568],[1.4396926208,1.2080455471],[1.9396926208,0.3420201433]],[[2.7057370639,-0.984807753],[3.2057370639,-1.8508331568],[4.1454296847,-1.5088130135],[3.6454296847,-0.6427876097],[2.8793852416,0.0]],[[2.8793852416,-0.0],[3.6454296847,-0.6427876097],[4.4114741278,0.0],[3.6454296847,0.6427876097],[2.7057370639,0.984807753]],[[4.4114741278,0.0],[5.4114741278,0.0],[6.3511667486,0.3420201433],[5.8511667486,1.2080455471],[4.9114741278,0.8660254038]],[[4.4114741278,0.0],[3.6454296847,-0.6427876097],[4.1454296847,-1.5088130135],[4.9114741278,-0.8660254038],[5.4114741278,0.0]],[[4.9114741278,0.8660254038],[5.8511667486,1.2080455471],[6.6172111917,1.8508331568],[5.8511667486,2.4936207665],[5.0851223055,1.8508331568]],[[4.1454296847,1.5088130135],[3.6454296847,0.6427876097],[4.4114741278,-0.0],[4.9114741278,0.8660254038],[5.0851223055,1.8508331568]],[[4.1454296847,-1.5088130135],[5.0851223055,-1.8508331568],[6.0851223055,-1.8508331568],[5.9114741278,-0.8660254038],[4.9114741278,-0.8660254038]],[[4.9114741278,-0.8660254038],[5.9114741278,-0.8660254038],[6.8511667486,-0.5240052605],[6.3511667486,0.3420201433],[5.4114741278,0.0]],[[4.1454296847,-1.5088130135],[3.2057370639,-1.8508331568],[3.3793852416,-2.8356409098],[4.3190778624,-2.4936207665],[5.0851223055,-1.8508331568]],[[4.3190778624,-2.4936207665],[5.2587704831,-2.8356409098],[6.2587704831,-2.8356409098],[6.0851223055,-1.8508331568],[5.0851223055,-1.8508331568]],[[3.3793852416,-2.8356409098],[4.1454296847,-3.4784285195],[5.0851223055,-3.8204486628],[5.2587704831,-2.8356409098],[4.3190778624,-2.4936207665]],[[7.0248149263,-1.5088130135],[6.0851223055,-1.8508331568],[6.2587704831,-2.8356409098],[7.1984631039,-2.4936207665],[7.964507547,-1.8508331568]],[[6.8511667486,-0.5240052604],[5.9114741278,-0.8660254038],[6.0851223055,-1.8508331568],[7.0248149263,-1.5088130135],[7.7908593694,-0.8660254038]],[[6.2587704831,-2.8356409098],[5.2587704831,-2.8356409098],[5.0851223055,-3.8204486629],[6.0851223055,-3.8204486628],[7.0248149263,-3.4784285195]],[[7.1172111917,0.984807753],[6.3511667486,0.3420201433],[6.8511667486,-0.5240052605],[7.6172111917,0.1187823492],[8.1172111917,0.984807753]],[[6.6172111917,1.8508331568],[5.8511667486,1.2080455471],[6.3511667486,0.3420201433],[7.1172111917,0.984807753],[7.6172111917,1.8508331568]],[[6.3511667486,3.3596461703],[5.8511667486,2.4936207665],[6.6172111917,1.8508331568],[7.1172111917,2.7168585606],[7.2908593694,3.7016663136]]];
const ROSETTES = { flower3: [3, ROSETTE(3)], flower4: [4, ROSETTE(4)], flower5: [5, ROSETTE(5)], flower: [6, ROSETTE(6, FLOWER_SEED)], flower7: [7, ROSETTE(7)], flower8: [8, ROSETTE(8)], flower9: [9, ROSETTE(9)], flower10: [10, ROSETTE(10)],
                   ring7: [7, ROSETTE(7, null, true), 1], ring8: [8, ROSETTE(8, null, true), 1],
                   ring9: [9, ROSETTE(9, null, true), 1], ring10: [10, ROSETTE(10, null, true), 1], ring12: [12, ROSETTE(12, null, true), 1] };  // (n, it, its cells of the wall: a ring's hole)
export const rosetteGrid = (name, W) => patchGrid(ROSETTES[name][1](W), W);  // (the wall's cells: a ring's hole and those past its circle)
export { ROSETTE, ROSETTES };

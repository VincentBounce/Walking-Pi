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
 * ways ζᵏ (ζ = e^(iπ/9)): 6 whole numbers (ζ⁶ = ζ³ − 1). Its middle as Wikimedia draws it (21 tiles a sixth, read off it:
 * each its corner A, mirrored or not, the way of its side AB); round it 18 wedges, each the one before turned 20°, as
 * Sugimoto's (see ROSETTE's direct): pairs mirrored on their side DE, in rows of 3, 4, 5… pairs (those of 2 in its middle), a pair to the next 1 along
 * DE, a row to the next −ζ³ − ζ⁴ − ζ⁵ (½ back, 2.84 out) */
const FLOWER_SEED = [[[0,0,0,1,0,0],0,12],[[1,1,0,0,0,0],0,10],[[1,1,1,-1,-1,-2],1,3],[[1,1,0,0,0,0],0,17],[[2,1,1,-1,-1,-1],1,4],[[1,2,1,0,-1,-1],1,5],[[1,2,2,1,-1,-1],0,12],[[1,2,1,0,-1,-1],1,0],[[1,2,2,1,0,-1],0,13],[[1,1,2,0,0,-1],1,1],[[2,2,2,-1,-1,-1],0,11],[[2,2,2,0,-1,-1],0,12],[[2,1,1,-1,-1,-1],1,17],[[2,2,2,-1,-1,-2],0,11],[[2,2,1,-1,-1,-2],0,10],[[3,2,2,-1,-1,-2],1,17],[[3,2,2,-1,-1,-1],1,17],[[2,2,2,-1,-1,-3],1,16],[[2,3,2,0,-1,-1],1,0],[[1,3,2,1,-1,-1],1,0],[[1,2,3,1,0,-1],1,1]];
function HIRSCHHORN(R) {
  const times = ([a, b, c, d, e, f]) => [-f, a, b, c + f, d, e], ZETA = [[1, 0, 0, 0, 0, 0]];  // (× ζ)
  for (let k = 1; k < 18; k++) ZETA.push(times(ZETA[k - 1]));
  const mod = (k) => ((k % 18) + 18) % 18, turn = (p, k) => { for (let r = 0; r < mod(k); r++) p = times(p); return p; };  // (k 20°s)
  const CS = [Math.cos, Math.sin].map((f) => [0, 1, 2, 3, 4, 5].map((i) => f((i * Math.PI) / 9))), xy = (p) => CS.map((c) => p.reduce((t, v, i) => t + v * c[i], 0));
  const WAYS = [[0, 6, 7, 12, 16], [15, 2, 3, 9, 11]];  // its sides' ways (AB BC CD DE EA), mirrored (E'D' D'C' C'B' B'A' A'E'), counterclockwise
  const tile = (p, m, d, s = 0) => {  // from p, its corner s, its sides' ways turned d: its corners
    const P = [p];
    for (let i = 0; i < 4; i++) P.push(P[i].map((v, j) => v + ZETA[mod(WAYS[m][(s + i) % 5] + d)][j]));
    return P.map(xy);
  };
  const tiles = [];
  for (let k = 0; k < 18; k += 3) for (const [p, m, d] of FLOWER_SEED) tiles.push(tile(turn(p, k), m, d + k));
  const first = [-1, -1, -1, -3, -3, -2], up = [0, 0, 0, -1, -1, -1];  // (wedge 0: its first pair's D, DE along ζ⁰; a row to the next)
  for (let w = 0; w < 18; w++) for (let r = 0; 8.51 + 2.84 * r < R + 3; r++) for (let i = 0; i < r + 3; i++) {
    const D = turn(first.map((v, j) => v + i * ZETA[0][j] + r * up[j]), w);
    if (Math.hypot(...xy(D)) < R + 3) tiles.push(tile(D, 0, w - WAYS[0][3], 3), tile(D.map((v, j) => v + ZETA[w][j]), 1, w + 9 - WAYS[1][0]));  // (its pair: D to E along ζʷ, E to D mirrored)
  }
  return tiles;
}
const ROSETTES = { flower3: [3, ROSETTE(3)], flower4: [4, ROSETTE(4)], flower5: [5, ROSETTE(5)], flower: [6, ROSETTE(6, HIRSCHHORN)], flower7: [7, ROSETTE(7)], flower8: [8, ROSETTE(8)], flower9: [9, ROSETTE(9)], flower10: [10, ROSETTE(10)],
                   ring7: [7, ROSETTE(7, null, true), 1], ring8: [8, ROSETTE(8, null, true), 1],
                   ring9: [9, ROSETTE(9, null, true), 1], ring10: [10, ROSETTE(10, null, true), 1], ring12: [12, ROSETTE(12, null, true), 1] };  // (n, it, its cells of the wall: a ring's hole)
export const rosetteGrid = (name, W) => patchGrid(ROSETTES[name][1](W), W);  // (the wall's cells: a ring's hole and those past its circle)
export { ROSETTE, ROSETTES };

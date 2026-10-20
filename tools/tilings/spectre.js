// The Spectre as main.js builds them (a copy: SPECTRE; discPatch in ./patch.js), and their grid for the searches
import { discPatch, patchGrid, pointKey } from './patch.js';
/* The Spectre (Smith, Myers, Kaplan and Goodman-Strauss, 2023): one tile, 14 sides all 1 long, that tiles the plane
 * only without ever repeating, and never turned over (its mirror image not needed). Built by substitution, as Kaplan's
 * code (in AaronWebster/spectre-app, Apache 2.0): nine kinds of tiles (Gamma: two spectres, the "mystic"), each a
 * supertile of 8 smaller ones, about 8 times as many each level. As the hats' (see discPatch); each about a square unit */
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
    while (count(sys.Delta) < 10 * W * W) sys = supertiles(sys);  // (room for the walls all round too)
    const items = spectresOf(sys.Delta, ident, []).map((T) => { const p = spectre.map((q) => at(T, q)).map(([x, y]) => [x * S, -y * S]); return { p, m: [0, 1].map((d) => p.reduce((s, q) => s + q[d], 0) / 14) }; });
    return discPatch(items, W, (h) => h.p);
  })();
})();
export const spectreGrid = (W) => patchGrid(SPECTRE(W), W);
export { SPECTRE };

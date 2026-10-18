// A tiling's turns, mirror and pivot (main.js: TILINGS), and its torus's sheet: deno run --allow-read symm.js name…
// turns: the most of 6, 4, 3, 2 a turn about some point maps it onto itself (its cells' middles onto middles of as many
// sides), tried at each corner, middle and side's middle of a lattice cell's cells; pivot: that point (lattice units),
// one the upright line through which mirrors it too if there is one (mirror); sheet: A = p·a + q·b, B = r·a + s·b at
// right angles, the smallest (as few lattice cells as can be, then the nearest a square)
const T = JSON.parse(Deno.readTextFileSync(new URL('./tilings.json', import.meta.url)));
for (const name of Deno.args) {
  const { basis: [a, b], polys } = T[name], W = ([u, v]) => [u * a[0] + v * b[0], u * a[1] + v * b[1]];
  const D = a[0] * b[1] - a[1] * b[0], L = ([x, y]) => [(x * b[1] - y * b[0]) / D, (a[0] * y - a[1] * x) / D];
  const mid = (P) => [0, 1].map((d) => P.reduce((s, p) => s + p[d], 0) / P.length), key = (p, n) => `${n}:${Math.round(p[0] * 1e3)},${Math.round(p[1] * 1e3)}`;
  const cells = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) for (const P of polys) cells.push([W(mid(P.map(([u, v]) => [u + i, v + j]))), P.length]);
  const all = new Set(cells.map(([m, n]) => key(m, n))), near = (c) => cells.filter(([m]) => Math.hypot(m[0] - c[0], m[1] - c[1]) < 3 * Math.hypot(...a));
  const maps = (c, f) => near(c).every(([m, n]) => all.has(key(f(m, c), n)));
  const turn = (t) => ([x, y], c) => [c[0] + (x - c[0]) * Math.cos(t) - (y - c[1]) * Math.sin(t), c[1] + (x - c[0]) * Math.sin(t) + (y - c[1]) * Math.cos(t)];
  const mirror = ([x, y], c) => [2 * c[0] - x, y];
  const tries = polys.flatMap((P) => [mid(P), ...P, ...P.map((p, k) => mid([p, P[(k + 1) % P.length]]))]).map(W);
  let best = null;
  for (const n of [6, 4, 3, 2, 1]) {
    const ok = tries.filter((c) => n === 1 || maps(c, turn((2 * Math.PI) / n)));
    if (ok.length) { const m = ok.find((c) => maps(c, mirror)); best = { turns: n, mirror: !!m, pivot: L(m ?? ok[0]).map((x) => +x.toFixed(6)) }; break; }
  }
  let sheet = null;
  for (let p = -4; p <= 4; p++) for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) for (let s = -4; s <= 4; s++) {
    const det = p * s - q * r, A = W([p, q]), B = W([r, s]);
    if (det < 1 || Math.abs(A[0] * B[0] + A[1] * B[1]) > 1e-9 * Math.hypot(...A) * Math.hypot(...B)) continue;
    const score = [det, Math.abs(Math.log(Math.hypot(...A) / Math.hypot(...B)))];
    if (!sheet || score[0] < sheet.score[0] || (score[0] === sheet.score[0] && score[1] < sheet.score[1] - 1e-9)) sheet = { score, sheet: [[p, q], [r, s]] };
  }
  console.log(name.padEnd(13), JSON.stringify(best), 'sheet', JSON.stringify(sheet?.sheet));
}

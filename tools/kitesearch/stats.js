// A rule's soups (traces.js) as stats: settling (median, spread), plateau, the share alive at 200 and at the end, the
// share ending with oscillators; and those scored against Life's on squares (rank.js, letters.js)
export const stats = (r) => {
  const ok = r.runs.filter((x) => x.end === 'settles' || x.end === 'running'), Ts = ok.map((x) => x.T).sort((a, b) => a - b), q = (p) => Ts[Math.floor(p * (Ts.length - 1))];
  const logs = Ts.map(Math.log), m = logs.reduce((a, b) => a + b, 0) / (logs.length || 1), sd = Math.sqrt(logs.reduce((a, b) => a + (b - m) ** 2, 0) / (logs.length || 1));
  const plateau = ok.map((x) => (x.pops[800] ?? x.rho) / (x.pops[200] || 1e-9)), med = (a) => (a.length ? [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)] : 0);
  return { rule: r.rule, ok: ok.length, dies: r.runs.filter((x) => x.end === 'dies').length, explodes: r.runs.filter((x) => x.end === 'explodes').length,
    running: ok.filter((x) => x.end === 'running').length, Tmed: q(0.5) ?? 0, Tmin: Ts[0] ?? 0, Tmax: Ts.at(-1) ?? 0, spread: +sd.toFixed(2),
    ash: +(100 * med(ok.map((x) => x.rho))).toFixed(2), at200: +(100 * med(ok.map((x) => x.pops[200] ?? 0))).toFixed(1), plateau: +med(plateau).toFixed(2),
    osc: ok.filter((x) => x.period > 1).length / (ok.length || 1) };
};
// each criterion near Life's (1 at Life's value), multiplied: settling time, its spread (more is as good), the plateau
// (the live share at 800 over 200: a lasting chaos), the share alive during it and left at the end, the ends with oscillators
export const LIFE = { Tmed: 777, spread: 0.5, plateau: 0.47, at200: 7.5, ash: 3.16, osc: 1 };
const near = (x, t, w) => Math.exp(-(((x - t) / w) ** 2));
export const score = (r, L = LIFE) => (r.ok / (r.ok + r.dies + r.explodes)) ** 2 * near(Math.log(r.Tmed), Math.log(L.Tmed), 0.6) * near(Math.min(r.spread, L.spread), L.spread, 0.25)
  * near(Math.log(r.plateau + 0.01), Math.log(L.plateau), 0.5) * near(r.at200, L.at200, 5) * near(r.ash, L.ash, 2.5) * (0.3 + 0.7 * r.osc) * (r.running > 6 ? 0.3 : 1);

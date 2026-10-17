// Many soups of each rule, what they do over time: deno run --allow-read --allow-write traces.js rules.json W seeds out.json
// (W < 0: squares, −W a side). Then the stats: settling (median, spread), plateau, the share ending with oscillators
import { pool } from './pool.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0])), W = /^hat|:/.test(Deno.args[1] ?? '') ? Deno.args[1] : Number(Deno.args[1] ?? 24), K = Number(Deno.args[2] ?? 12);
const seeds = Array.from({ length: K }, (_, i) => 101 + 7919 * i), P = pool(9), out = [], chunk = 4, t0 = Date.now();
let i = 0, done = 0;
await Promise.all(P.workers.map(async (w) => {
  while (i < rules.length) { const part = rules.slice(i, (i += chunk)); out.push(...(await P.call(w, { task: 'traces', W, rules: part, seeds }))); done += part.length; if (done % 100 < chunk) console.error(done, Math.round((Date.now() - t0) / 1000) + 's'); }
}));
P.close();
export const stats = (r) => {
  const ok = r.runs.filter((x) => x.end === 'settles' || x.end === 'running'), Ts = ok.map((x) => x.T).sort((a, b) => a - b), q = (p) => Ts[Math.floor(p * (Ts.length - 1))];
  const logs = Ts.map(Math.log), m = logs.reduce((a, b) => a + b, 0) / (logs.length || 1), sd = Math.sqrt(logs.reduce((a, b) => a + (b - m) ** 2, 0) / (logs.length || 1));
  const plateau = ok.map((x) => (x.pops[800] ?? x.rho) / (x.pops[200] || 1e-9)), med = (a) => (a.length ? [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)] : 0);
  return { rule: r.rule, ok: ok.length, dies: r.runs.filter((x) => x.end === 'dies').length, explodes: r.runs.filter((x) => x.end === 'explodes').length,
    running: ok.filter((x) => x.end === 'running').length, Tmed: q(0.5) ?? 0, Tmin: Ts[0] ?? 0, Tmax: Ts.at(-1) ?? 0, spread: +sd.toFixed(2),
    ash: +(100 * med(ok.map((x) => x.rho))).toFixed(2), at200: +(100 * med(ok.map((x) => x.pops[200] ?? 0))).toFixed(1), plateau: +med(plateau).toFixed(2),
    osc: ok.filter((x) => x.period > 1).length / (ok.length || 1) };
};
Deno.writeTextFileSync(Deno.args[3] ?? './traces.json', JSON.stringify(out.map(stats)));
console.log('done', out.length, Math.round((Date.now() - t0) / 1000) + 's');

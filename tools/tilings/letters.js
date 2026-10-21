// The flowers' letters tried: deno run --allow-read --allow-write letters.js name [workers]. From the 4 best rules found
// for a flower (out/name-best.json), each digit of B or S split into letters (a, b, c: 0, 1, 2 of its live neighbours by a
// corner only; see ../kitesearch/engine.js), then a second round from the best 6; each scored as search.js scores (12 soups
// on ~3,500 cells, against Life on squares). Out: out/name-letters.json
import { pool } from '../kitesearch/pool.js';
const name = Deno.args[0], N = Number(Deno.args[1] ?? 4), P = pool(N), W2 = Math.round(Math.sqrt(3500)), t0 = Date.now();
const base = JSON.parse(Deno.readTextFileSync(new URL(`./out/${name}-best.json`, import.meta.url))).slice(0, 4).map((r) => r.rule);
const stats = (r) => {
  const ok = r.runs.filter((x) => x.end === 'settles' || x.end === 'running'), Ts = ok.map((x) => x.T).sort((a, b) => a - b), q = (p) => Ts[Math.floor(p * (Ts.length - 1))];
  const logs = Ts.map(Math.log), mean = logs.reduce((a, b) => a + b, 0) / (logs.length || 1), sd = Math.sqrt(logs.reduce((a, b) => a + (b - mean) ** 2, 0) / (logs.length || 1));
  const med = (a) => (a.length ? [...a].sort((p, q2) => p - q2)[Math.floor(a.length / 2)] : 0);
  return { rule: r.rule, ok: ok.length, all: r.runs.length, running: ok.filter((x) => x.end === 'running').length, Tmed: q(0.5) ?? 0, Tmin: Ts[0] ?? 0, Tmax: Ts.at(-1) ?? 0, spread: +sd.toFixed(2),
    ash: +(100 * med(ok.map((x) => x.rho))).toFixed(2), at200: +(100 * med(ok.map((x) => x.pops[200] ?? 0))).toFixed(1), plateau: +med(ok.map((x) => (x.pops[800] ?? x.rho) / (x.pops[200] || 1e-9))).toFixed(2), osc: ok.filter((x) => x.period > 1).length / (ok.length || 1) };
};
const L = { Tmed: 777, spread: 0.5, plateau: 0.47, at200: 7.5, ash: 3.16, osc: 1 }, near = (x, t, w) => Math.exp(-(((x - t) / w) ** 2));
const score = (r) => (r.ok / (r.all || 1)) ** 2 * near(Math.log(r.Tmed || 1), Math.log(L.Tmed), 0.6) * near(Math.min(r.spread, L.spread), L.spread, 0.25)
  * near(Math.log(r.plateau + 0.01), Math.log(L.plateau), 0.5) * near(r.at200, L.at200, 5) * near(r.ash, L.ash, 2.5) * (0.3 + 0.7 * r.osc) * (r.running > r.all / 2 ? 0.3 : 1);
const seeds = Array.from({ length: 12 }, (_, i) => 101 + 7919 * i), done = new Map();
async function judge(rules) {
  const todo = [...new Set(rules)].filter((r) => !done.has(r));
  let i = 0;
  await Promise.all(P.workers.map(async (w) => { while (i < todo.length) { const part = todo.slice(i, (i += 2)); for (const r of await P.call(w, { task: 'traces', W: `${name}:${W2}`, seeds, rules: part })) { const s = stats(r); done.set(r.rule, { ...s, score: +score(s).toFixed(3) }); } } }));
}
// a rule's variants: one digit of B or S (alone, no letters yet) split into some of its letters
const split = (rule) => {
  const m = rule.match(/B([\da-d]*)\/S([\da-d]*)(\/C\d+)?/), out = [];
  for (const [part, text] of [['B', m[1]], ['S', m[2]]]) for (const [tok, d, ls] of text.matchAll(/(\d)([a-d]*)/g)) {
    if (ls) continue;
    for (const pick of ['a', 'b', 'c', 'ab', 'ac', 'bc']) {
      const t = text.replace(tok, d + pick);
      out.push(part === 'B' ? `B${t}/S${m[2]}${m[3] ?? ''}` : `B${m[1]}/S${t}${m[3] ?? ''}`);
    }
  }
  return out;
};
await judge(base);
let pool1 = base.flatMap(split);
await judge(pool1);
const best6 = [...done.values()].sort((a, b) => b.score - a.score).slice(0, 6).map((r) => r.rule);
await judge(best6.flatMap(split));
P.close();
const all = [...done.values()].sort((a, b) => b.score - a.score);
Deno.writeTextFileSync(new URL(`./out/${name}-letters.json`, import.meta.url), JSON.stringify(all));
console.log(name, all.length, 'rules', Math.round((Date.now() - t0) / 1000) + 's; base:', base.map((r) => `${r} ${done.get(r).score}`).join(' · '));
for (const r of all.slice(0, 8)) console.log(`  ${r.rule.padEnd(18)} ${String(r.score).padEnd(6)} T ${r.Tmed} (${r.Tmin}–${r.Tmax}) spread ${r.spread} plateau ${r.plateau} at200 ${r.at200}% ash ${r.ash}% osc ${(100 * r.osc).toFixed(0)}%`);

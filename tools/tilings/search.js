// Rule search on a tiling: deno run --allow-read --allow-write search.js name [workers]: every B (2, 3 or 4 and up to 2
// more digits) / S (up to 4 digits) / C (2…5) up to its most neighbours (9 at most: a digit a count), one soup each on
// ~1,500 cells; those settling with 0.5 to 8 % alive after 250 generations or more, followed over 4 soups on ~3,500
// cells, the 40 best over 12, and scored against Life on squares (as ../kitesearch/rank.js); a pause between the stages
// to let the machine cool. Out: out/name-*.json
import { pool } from '../kitesearch/pool.js';
import { tilingCells } from './grid.js';
const name = Deno.args[0], N = Number(Deno.args[1] ?? 6), most = Math.min(9, JSON.parse(Deno.readTextFileSync(new URL('./most.json', import.meta.url)))[name]);
const subsets = (arr, max) => { const out = [[]]; for (const x of arr) { const n = out.length; for (let i = 0; i < n; i++) if (out[i].length < max) out.push([...out[i], x]); } return out; };
const digits = [...Array(most + 1).keys()], Bs = new Set();
for (const lo of [2, 3, 4]) for (const rest of subsets(digits.filter((d) => d > lo), 2)) Bs.add([lo, ...rest].join(''));
const rules = [];
for (const b of Bs) for (const s of subsets(digits, 4)) for (const c of [2, 3, 4, 5]) rules.push(`B${b}/S${s.join('')}${c > 2 ? '/C' + c : ''}`);
const m = name === 'penrose' || name === 'spectre' || name === 'ammann' ? 1 : tilingCells(name), W1 = Math.round(Math.sqrt(1500 / m)), W2 = Math.round(Math.sqrt(3500 / m)), dir = new URL('./out/', import.meta.url), t0 = Date.now();
Deno.mkdirSync(dir, { recursive: true });
const cool = () => new Promise((r) => setTimeout(r, 30000));  // a rest between stages
const P = pool(N);
async function spread(items, msg, size) {
  const out = [];
  let i = 0;
  await Promise.all(P.workers.map(async (w) => { while (i < items.length) { const part = items.slice(i, (i += size)); out.push(...(await P.call(w, { ...msg, rules: part }))); } }));
  return out;
}
// stage 1: a soup each
const soups = await spread(rules, { task: 'soups', W: `${name}:${W1}` }, 40);
const cand = soups.filter((r) => (r.end === 'settles' || r.end === 'running') && r.rho > 0.005 && r.rho < 0.08 && r.T >= 250).map((r) => r.rule);
console.log(name, rules.length, 'rules', cand.length, 'candidates', Math.round((Date.now() - t0) / 1000) + 's');
// the stats of a rule's soups (as ../kitesearch/traces.js) and its score against Life (as ../kitesearch/rank.js)
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
const seeds = (k) => Array.from({ length: k }, (_, i) => 101 + 7919 * i);
await cool();
const four = (await spread(cand, { task: 'traces', W: `${name}:${W2}`, seeds: seeds(4) }, 4)).map(stats).map((r) => ({ ...r, score: score(r) })).sort((a, b) => b.score - a.score);
await cool();
const twelve = (await spread(four.slice(0, 40).map((r) => r.rule), { task: 'traces', W: `${name}:${W2}`, seeds: seeds(12) }, 2)).map(stats).map((r) => ({ ...r, score: +score(r).toFixed(3) })).sort((a, b) => b.score - a.score);
P.close();
Deno.writeTextFileSync(new URL(`${name}-best.json`, dir), JSON.stringify(twelve));
console.log(name, 'done', Math.round((Date.now() - t0) / 1000) + 's');
for (const r of twelve.slice(0, 8)) console.log(`  ${r.rule.padEnd(15)} ${String(r.score).padEnd(6)} T ${r.Tmed} (${r.Tmin}–${r.Tmax}) spread ${r.spread} plateau ${r.plateau} at200 ${r.at200}% ash ${r.ash}% osc ${(100 * r.osc).toFixed(0)}%`);

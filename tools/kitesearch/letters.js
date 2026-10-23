// Letter rules on kites: deno run --allow-read --allow-write letters.js [rules]
// The flowers' letters (see engine.js): of a count's live neighbours, how many touch by a corner only, 0, 1, 2, 3 or more
// (a, b, c, d here; v0 … v3 in the app: 3ab is 3v01). Rules drawn at random (B 1 to 3 digits from 2 to 7, S up to 5 from 0
// to 8, 2 to 5 states), a tenth of them from the kites' known rules (the app's ◆ ones), each digit kept whole or cut to
// some of its ways (a kite has 4 neighbours by a side and 5 by a corner), a letter at least;
// their soups (stage1's test), the Life-like ones followed (traces, scored against Life as rank.js does), the best tried
// with small starts for ships (stage2's). Out: letters.json, the best as the app writes them
import { pool } from './pool.js';
import { stats, score } from './stats.js';
const BASES = ['B35/S2356/C4', 'B346/S0127/C4', 'B34/S0126/C5', 'B3/S235/C3', 'B36/S1258', 'B35/S123/C5', 'B3/S1247', 'B346/S01458', 'B3/S23', 'B36/S23'];
const N = Number(Deno.args[0] ?? 40000), P = pool(9), t0 = Date.now(), log = (...a) => console.error(Math.round((Date.now() - t0) / 1000) + 's', ...a);
let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
// a digit's ways: k by a corner, from d − 4 (4 by a side at most) to d, 3 standing for 3 or more
const ways = (d) => Array.from({ length: 4 }, (_, k) => k).filter((k) => k >= d - 4 && (k <= d || (k === 3 && d >= 3)) && (k < 3 || d >= 3));
const lettered = (part) => part.replace(/\d/g, (d) => {
  const w = ways(+d);
  if (w.length < 2 || rnd() < 0.4) return d;
  let pick = w.filter(() => rnd() < 0.5);
  if (!pick.length || pick.length === w.length) pick = [w[Math.floor(rnd() * w.length)]];
  return d + pick.map((k) => 'abcd'[k]).join('');
});
const digits = (from, most) => from.filter(() => rnd() < most / from.length).sort().join('');
const variants = new Set();
for (let i = 0; i < N; i++) {
  const base = i % 10 ? null : BASES[(i / 10) % BASES.length], C = 2 + Math.floor(rnd() * 4);
  const [, b, s, c] = base?.match(/B(\d*)\/S(\d*)(\/C\d+)?/) ?? [null, digits([2, 3, 4, 5, 6, 7], 1.6) || '3', digits([0, 1, 2, 3, 4, 5, 6, 7, 8], 2.8), C > 2 ? `/C${C}` : ''];
  const r = `B${lettered(b)}/S${lettered(s)}${c ?? ''}`;
  if (/[a-d]/.test(r)) variants.add(r);
}
const rules = [...variants];
log('variants', rules.length);
// 1. soups on 16 × 16 rhombi (1,536 kites): Life-like ones settle (or still run with few cells) with a little ash, after a while
const soups = [];
let i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < rules.length) { const part = rules.slice(i, (i += 30)); soups.push(...(await P.call(w, { task: 'soups', W: 16, rules: part }))); if (soups.length % 3000 < 30) log(soups.length); } }));
log('soups', Object.entries(soups.reduce((m, r) => ((m[r.end] = (m[r.end] ?? 0) + 1), m), {})).map(([e, k]) => `${e} ${k}`).join(', '));
const good = soups.filter((r) => (r.end === 'settles' || r.end === 'running') && r.rho > 0.005 && r.rho < 0.08 && r.T >= 250).map((r) => r.rule);
log('soups done, Life-like', good.length);
// 2. their lives: 12 soups each on 24 × 24 rhombi, scored against Life's
const traced = [];
const seeds = Array.from({ length: 12 }, (_, k) => 101 + 7919 * k);
i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < good.length) { const part = good.slice(i, (i += 2)); traced.push(...(await P.call(w, { task: 'traces', W: 24, rules: part, seeds }))); } }));
const ranked = traced.map(stats).map((r) => ({ ...r, score: +score(r).toFixed(3) })).sort((a, b) => b.score - a.score);
log('traces done');
// 3. the best 40: small starts, what they leave (ships, oscillators)
const top = ranked.slice(0, 40), per = 4;
for (const r of top) {
  const parts = await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'seeds', W: 24, rule: r.rule, opts: [per, k * per, 3, 3, 0.5, 500] })));
  const found = new Map();
  for (const p of parts) for (const f of p.found) { const key = f.cells.map((c) => c.join(',')).join(';'); if (found.has(key)) found.get(key).count += f.count; else found.set(key, { ...f }); }
  const fs = [...found.values()];
  r.explode = parts.reduce((s, p) => s + p.explode, 0) / parts.length;
  r.ships = fs.filter((f) => f.kind === 'ship').map((f) => ({ period: f.period, move: f.move, cells: f.cells.length, count: f.count }));
  r.oscs = fs.filter((f) => f.kind === 'osc').length;
}
P.close();
const app = (rule) => rule.replace(/(\d)([a-d]+)(?=([0-3])?)/g, (_, d, ls, next) => `${d}v${[...ls].map((l) => 'abcd'.indexOf(l)).join('')}${next ? '.' : ''}`);  // (as the app writes them: a "." before a count 0 to 3)
for (const r of top) console.log(`${app(r.rule).padEnd(28)} ${String(r.score).padEnd(6)} T ${r.Tmed} (${r.Tmin}–${r.Tmax}) plateau ${r.plateau} at200 ${r.at200}% ash ${r.ash}% osc ${(100 * r.osc).toFixed(0)}% | ships ${r.ships.map((s) => `p${s.period}·${s.cells}×${s.count}`).join(' ') || '–'} | explode ${(100 * r.explode).toFixed(0)}%`);
Deno.writeTextFileSync(new URL('./letters.json', import.meta.url), JSON.stringify(top.map((r) => ({ ...r, app: app(r.rule) }))));
log('done');

// Battles of 2 colours with turnarounds, as Life has them: deno run --allow-read --allow-write turns.js [grid] [rules]
// (grid: kite, the default, or a tiling's name as search.js has them, cairo too). Rules drawn as revive.js draws them
// (with letters or not, those the grid's cells allow: some by a side, some by a corner), their soups on ~1,500 cells (the
// Life-like ones), then for each 10 battles on ~3,500 (kites: 24 × 24 rhombi; see engine.js, battle): how often the lead changes hands, how low the colour ahead at the end
// had fallen (its comeback), how long. Life the same on 64 × 64 squares as the reference. Those turning as Life does (3 to 12
// times: more is noise, two colours swinging round a half; at least once in 8 battles of 10; 500 generations or more)
// followed too (scored against Life as rank.js does), ranked by it. Out: turns.json (kites) or turns-grid.json, the best as
// the app writes them
import { pool } from './pool.js';
import { stats as traceStats, score } from './stats.js';
import { tilingCells } from '../tilings/grid.js';
const name = Deno.args[0] ?? 'kite', N = Number(Deno.args[1] ?? 100000), P = pool(9), t0 = Date.now(), log = (...a) => console.error(Math.round((Date.now() - t0) / 1000) + 's', ...a);
const patch = /^(flower|ring|mirror7|hat|spectre|penrose|ammann|pinwheel|rhombs|menger|frame)/.test(name), m = patch ? 1 : tilingCells(name);
const size = (cells) => (name === 'kite' ? (cells < 2000 ? 16 : 24) : `${name}:${Math.round(Math.sqrt(cells / m))}`), W1 = size(1500), W2 = size(3500);
const allowed = await P.call(P.workers[0], { task: 'ways', W: W1 }), most = allowed.findLastIndex((w) => w.length);  // (its most neighbours, 9 at most)
let seed = 777;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
const ways = (d) => allowed[d];
const lettered = (part) => part.replace(/\d/g, (d) => { const w = ways(+d); if (w.length < 2 || rnd() < 0.5) return d; let pick = w.filter(() => rnd() < 0.5); if (!pick.length || pick.length === w.length) pick = [w[Math.floor(rnd() * w.length)]]; return d + pick.map((k) => 'abcd'[k]).join(''); });
const digits = (from, most) => from.filter(() => rnd() < most / from.length).sort().join('');
const rules = new Set(name === 'kite' ? ['B35/S2356/C4', 'B346/S0127/C4', 'B34/S0126/C5', 'B3/S235/C3', 'B36/S1258', 'B35/S123/C5', 'B3/S1247', 'B346/S01458', 'B3bcd5cd/S123abc/C5', 'B3/S123ac57/C5', 'B34bcd6/S0127/C4', 'B2ab3cd4/S08/C5', 'B2ab37/S0/C5'] : ['B3/S23']);
const upto = (lo, hi) => Array.from({ length: Math.min(hi, most) - lo + 1 }, (_, k) => lo + k);
for (let i = 0; i < N; i++) { const C = 2 + Math.floor(rnd() * 4), b = digits(upto(2, 7), 1.6) || '3', s = digits(upto(0, 8), 2.8); rules.add(`B${lettered(b)}/S${lettered(s)}${C > 2 ? `/C${C}` : ''}`); }
const all = [...rules], soups = [];
let i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < all.length) { const part = all.slice(i, (i += 40)); soups.push(...(await P.call(w, { task: 'soups', W: W1, rules: part }))); } }));
const keep = new Set(all.slice(0, name === 'kite' ? 13 : 1));
const good = soups.filter((r) => keep.has(r.rule) || ((r.end === 'settles' || r.end === 'running') && r.rho > 0.005 && r.rho < 0.08 && r.T >= 200)).map((r) => r.rule);
log(name, W1, W2, 'letters', JSON.stringify(allowed), 'rules', all.length, 'Life-like', good.length);
const seeds = Array.from({ length: 10 }, (_, k) => 101 + 7919 * k), med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
const sum = (rule, runs) => ({ rule, swaps: med(runs.map((r) => r.swaps)), anySwap: runs.filter((r) => r.swaps > 0).length / runs.length, comeback: med(runs.map((r) => r.comeback ?? 0.5)), T: med(runs.map((r) => r.T)), won: runs.filter((r) => r.end === 'won').length });
const out = [];
i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < good.length) { const rule = good[i++]; out.push(sum(rule, await P.call(w, { task: 'battle', W: W2, rule, seeds }))); } }));
const life = sum('B3/S23', await P.call(P.workers[0], { task: 'battle', W: -64, rule: 'B3/S23', seeds }));
// those turning as Life does: how Life-like they are otherwise
const best = out.filter((r) => r.swaps >= 3 && r.swaps <= 12 && r.anySwap >= 0.8 && r.T >= 500), tseeds = Array.from({ length: 12 }, (_, k) => 101 + 7919 * k);
i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < best.length) { const r = best[i++]; r.life = +score(traceStats((await P.call(w, { task: 'traces', W: W2, rules: [r.rule], seeds: tseeds }))[0])).toFixed(3); } }));
P.close();
best.sort((p, q) => q.life - p.life);
log('turning as Life', best.length);
const app = (rule) => rule.replace(/(\d)([a-d]+)(?=([0-3])?)/g, (_, d, ls, next) => `${d}v${[...ls].map((l) => 'abcd'.indexOf(l)).join('')}${next ? '.' : ''}`);  // (as the app writes them)
const line = (r) => `${app(r.rule).padEnd(28)} turnarounds ${String(r.swaps).padEnd(3)} (≥1 in ${String(Math.round(100 * r.anySwap)).padEnd(3)}%) comeback from ${String(Math.round(100 * r.comeback)).padEnd(3)}% · ${r.T} gens, ${r.won} of 10 won · Life-like ${r.life ?? '–'}`;
console.log('Life (64 × 64):', line(life));
for (const r of out.filter((r) => keep.has(r.rule))) console.log('known:', line(r));
for (const r of best.slice(0, 40)) console.log(line(r));
Deno.writeTextFileSync(new URL(name === 'kite' ? './turns.json' : `./turns-${name}.json`, import.meta.url), JSON.stringify({ life, rules: best.map((r) => ({ ...r, app: app(r.rule) })) }));
log('done');

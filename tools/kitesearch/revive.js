// Rules that wake a frozen zone up, as Life does (a glider in its ash, a long reaction): deno run --allow-read --allow-write revive.js [rules]
// Kite rules (as letters.js draws them: with letters or not, B 1 to 3 digits from 2 to 7, S up to 5 from 0 to 8, 2 to 5
// states), their soups (stage1's test: the Life-like ones), their small starts (stage2's: the ones with ships), then for
// each: 8 soups on 24 × 24 rhombi, each run till it repeats, 2 of its ships flown at its ash (see engine.js, revive): how
// long till it repeats again. Life the same on 64 × 64 squares, a glider. Out: revive.json, the best as the app writes them
import { pool } from './pool.js';
const N = Number(Deno.args[0] ?? 60000), P = pool(9), t0 = Date.now(), log = (...a) => console.error(Math.round((Date.now() - t0) / 1000) + 's', ...a);
let seed = 4242;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
const ways = (d) => [0, 1, 2, 3].filter((k) => k >= d - 4 && (k <= d || (k === 3 && d >= 3)) && (k < 3 || d >= 3));
const lettered = (part) => part.replace(/\d/g, (d) => { const w = ways(+d); if (w.length < 2 || rnd() < 0.5) return d; let pick = w.filter(() => rnd() < 0.5); if (!pick.length || pick.length === w.length) pick = [w[Math.floor(rnd() * w.length)]]; return d + pick.map((k) => 'abcd'[k]).join(''); });
const digits = (from, most) => from.filter(() => rnd() < most / from.length).sort().join('');
const rules = new Set();
for (let i = 0; i < N; i++) { const C = 2 + Math.floor(rnd() * 4), b = digits([2, 3, 4, 5, 6, 7], 1.6) || '3', s = digits([0, 1, 2, 3, 4, 5, 6, 7, 8], 2.8); rules.add(`B${lettered(b)}/S${lettered(s)}${C > 2 ? `/C${C}` : ''}`); }
const all = [...rules];
const soups = [];
let i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < all.length) { const part = all.slice(i, (i += 40)); soups.push(...(await P.call(w, { task: 'soups', W: 16, rules: part }))); } }));
const good = soups.filter((r) => (r.end === 'settles' || r.end === 'running') && r.rho > 0.005 && r.rho < 0.08 && r.T >= 200).map((r) => r.rule);
log('rules', all.length, 'Life-like', good.length);
// their ships
const withShips = [];
i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < good.length) { const rule = good[i++]; const p = await P.call(w, { task: 'seeds', W: 24, rule, opts: [24, 0, 3, 3, 0.5, 500] }); const ships = p.found.filter((f) => f.kind === 'ship'); if (ships.length && p.explode < 0.1) withShips.push({ rule, ships: ships.sort((x, y) => y.count - x.count).slice(0, 3).map((f) => ({ cells: f.cells, move: f.move, period: f.period })) }); } }));
log('with ships', withShips.length);
// woken up
const seeds = Array.from({ length: 8 }, (_, k) => 101 + 7919 * k), stats = (runs) => { const T = runs.flat().filter((x) => x !== null && x >= 0).sort((p, q) => p - q); return T.length ? { n: T.length, med: T[T.length >> 1], q3: T[Math.floor(0.75 * (T.length - 1))], long: T.filter((x) => x >= 300).length / T.length, endless: T.filter((x) => x >= 6000).length } : null; };
const out = [];
i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < withShips.length) { const r = withShips[i++]; const runs = await P.call(w, { task: 'revive', W: 24, rule: r.rule, ships: r.ships, seeds }); const st = stats(runs.filter(Boolean)); if (st) out.push({ ...r, ...st }); } }));
const life = (await P.call(P.workers[0], { task: 'seeds', W: -64, rule: 'B3/S23', opts: [24, 0, 3, 3, 0.5, 500] })).found.filter((f) => f.kind === 'ship').slice(0, 1).map((f) => ({ cells: f.cells, move: f.move }));
const lifeRuns = await P.call(P.workers[0], { task: 'revive', W: -64, rule: 'B3/S23', ships: life, seeds });
P.close();
const L = stats(lifeRuns.filter(Boolean));
const app = (rule) => rule.replace(/(\d)([a-d]+)/g, (_, d, ls) => `${d}v${[...ls].map((l) => 'abcd'.indexOf(l)).join('')}`);
out.sort((p, q) => q.med - p.med || q.long - p.long);
console.log(`Life (glider in its ash, 64 × 64): median ${L?.med} · 3rd quarter ${L?.q3} · ≥ 300: ${Math.round(100 * (L?.long ?? 0))} % · endless ${L?.endless} of ${L?.n}`);
for (const r of out.slice(0, 30)) console.log(`${app(r.rule).padEnd(28)} median ${String(r.med).padEnd(5)} q3 ${String(r.q3).padEnd(5)} ≥300 ${String(Math.round(100 * r.long)).padEnd(3)}% endless ${r.endless}/${r.n} · ships ${r.ships.map((s) => `p${s.period}·${s.cells.length}`).join(' ')}`);
Deno.writeTextFileSync(new URL('./revive.json', import.meta.url), JSON.stringify({ life: L, rules: out.slice(0, 60).map((r) => ({ ...r, app: app(r.rule) })) }));
log('done');

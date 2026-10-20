// Rules with many states (Faders-like) on a tiling: deno run --allow-read --allow-write states.js name [workers] [sparse]
// Every B (2 or 3, and up to 1 more digit) / S (up to 2 digits) / C (8, 12, 16, 25) up to its most neighbours (9 at most):
// one soup each on ~1,500 cells; those lively and lasting (0.3 to 8 % alive, 300 generations or more) given small random
// starts (3 × 3 lattice cells, many) for what they leave: ships and oscillators. Out: out/name-states.json, the rules
// with ships first (most kinds of ship), then the longest-lived
import { pool } from '../kitesearch/pool.js';
import { tilingCells } from './grid.js';
const name = Deno.args[0], N = Number(Deno.args[1] ?? 6), sparse = Deno.args[2] === 'sparse', most = Math.min(9, JSON.parse(Deno.readTextFileSync(new URL('./most.json', import.meta.url)))[name]);
const subsets = (arr, max) => { const out = [[]]; for (const x of arr) { const n = out.length; for (let i = 0; i < n; i++) if (out[i].length < max) out.push([...out[i], x]); } return out; };
const digits = [...Array(most + 1).keys()], Bs = new Set();
for (const lo of [2, 3]) for (const rest of subsets(digits.filter((d) => d > lo), 1)) Bs.add([lo, ...rest].join(''));
const rules = [];
for (const b of Bs) for (const s of subsets(digits, 2)) for (const c of [8, 12, 16, 25]) rules.push(`B${b}/S${s.join('')}/C${c}`);
const m = name === 'penrose' || name === 'spectre' || name === 'ammann' || name.startsWith('flower') ? 1 : tilingCells(name), W = (k) => (name === 'penrose' || name === 'spectre' || name === 'ammann' || name.startsWith('flower') ? `${name}:${Math.round(Math.sqrt(k))}` : `${name}:${Math.round(Math.sqrt(k / m))}`);
const dir = new URL('./out/', import.meta.url), t0 = Date.now(), P = pool(N);
Deno.mkdirSync(dir, { recursive: true });
const cool = () => new Promise((r) => setTimeout(r, 20000));  // a rest between stages (the machine cools)
async function spread(items, msg, size) {
  const out = [];
  let i = 0;
  await Promise.all(P.workers.map(async (w) => { while (i < items.length) { const part = items.slice(i, (i += size)); out.push(...(await P.call(w, { ...msg, rules: part }))); } }));
  return out;
}
// stage 1: a soup each
const soups = await spread(rules, { task: 'soups', W: W(1500) }, 40);
const lively = soups.filter((r) => (r.end === 'settles' || r.end === 'running') && r.rho > 0.003 && r.rho < 0.08 && r.T >= 300).sort((a, b) => b.T - a.T);
console.log(name, rules.length, 'rules', lively.length, 'lively', Math.round((Date.now() - t0) / 1000) + 's');
await cool();
// stage 2: small starts on the 48 longest-lived (sparse: the 120 sparsest, where ships are), what they leave
const pick = sparse ? [...lively].sort((a, b) => a.rho - b.rho).slice(0, 120) : lively.slice(0, 48), out = [];
let i = 0;
await Promise.all(P.workers.map(async (w) => {
  while (i < pick.length) {
    const r = pick[i++], s = await P.call(w, { task: 'seeds', W: W(4000), rule: r.rule, opts: [150, 0, 3, 3, 0.45, 800] });
    const ships = s.found.filter((f) => f.kind === 'ship').sort((p, q) => q.count - p.count), oscs = s.found.filter((f) => f.kind === 'osc');
    out.push({ rule: r.rule, T: r.T, rho: +(100 * r.rho).toFixed(2), end: r.end, explode: s.explode, ships: ships.map((f) => ({ cells: f.cells, period: f.period, move: f.move, count: f.count })), oscs: oscs.length });
  }
}));
P.close();
out.sort((p, q) => q.ships.length - p.ships.length || q.T - p.T);
Deno.writeTextFileSync(new URL(`${name}-states${sparse ? '-sparse' : ''}.json`, dir), JSON.stringify(out));
console.log(name, 'done', Math.round((Date.now() - t0) / 1000) + 's', out.filter((r) => r.ships.length).length, 'rules with ships');
for (const r of out.slice(0, 6)) console.log(`  ${r.rule.padEnd(16)} T ${r.T} ${r.rho}% ships ${r.ships.length} (${r.ships.slice(0, 3).map((f) => `p${f.period}·${f.cells.length}c×${f.count}`).join(' ')}) oscs ${r.oscs} explode ${r.explode}`);

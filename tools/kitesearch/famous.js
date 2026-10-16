import { pool } from './pool.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0]));
const P = pool(9), res = {}, t0 = Date.now();
const merge = (parts) => {
  const found = new Map(), starts = [];
  for (const p of parts) { starts.push(...p.starts); for (const f of p.found) { const k = f.cells.map((c) => c.join(',')).join(';'); if (found.has(k)) found.get(k).count += f.count; else found.set(k, { ...f }); } }
  return { found: [...found.values()], starts };
};
for (const rule of rules) {
  // methuselahs: few cells (2 rows × 2 rhombi at 35 %) on a big grid; ships and oscillators: also bigger starts
  const small = merge(await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'seeds', W: 48, rule, opts: [40, k * 40, 2, 2, 0.35, 3000] }))));
  const big = merge(await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'seeds', W: 32, rule, opts: [40, 5000 + k * 40, 3, 4, 0.5, 800] }))));
  const found = [...small.found, ...big.found];
  const meths = small.starts.filter((s) => s.cells.length <= 10).sort((a, b) => b.life - a.life || a.cells.length - b.cells.length).slice(0, 3);
  res[rule] = { ships: found.filter((f) => f.kind === 'ship'), oscs: found.filter((f) => f.kind === 'osc'), meths };
  console.error(rule, Math.round((Date.now() - t0) / 1000) + 's', 'ships', res[rule].ships.length, 'oscs', res[rule].oscs.length, 'meth', meths.map((m) => m.life + ':' + m.cells.length).join(' '));
}
P.close();
Deno.writeTextFileSync(Deno.args[1], JSON.stringify(res));

import { pool } from './pool.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0] ?? './good1.json'));
const trials = Number(Deno.args[1] ?? 36), W = Number(Deno.args[2] ?? 24), out = [], P = pool(9), t0 = Date.now();
const per = Math.ceil(trials / 9);
let i = 0;
// one rule at a time over all the workers (its trials split)
for (const rule of rules) {
  const parts = await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'seeds', W, rule, opts: [per, k * per, 3, 3, 0.5, 500] })));
  const found = new Map(), starts = [];
  let explode = 0;
  for (const p of parts) {
    explode += p.explode / parts.length; starts.push(...p.starts);
    for (const f of p.found) { const k = f.cells.map((c) => c.join(',')).join(';'); if (found.has(k)) found.get(k).count += f.count; else found.set(k, { ...f }); }
  }
  const fs = [...found.values()];
  out.push({ rule, explode, ships: fs.filter((f) => f.kind === 'ship'), oscs: fs.filter((f) => f.kind === 'osc'), life: starts.map((s) => s.life).sort((a, b) => b - a).slice(0, 5) });
  if (++i % 20 === 0) console.error(i, Math.round((Date.now() - t0) / 1000) + 's');
}
P.close();
Deno.writeTextFileSync(Deno.args[3] ?? './stage2.json', JSON.stringify(out));
console.log('done', Math.round((Date.now() - t0) / 1000) + 's');

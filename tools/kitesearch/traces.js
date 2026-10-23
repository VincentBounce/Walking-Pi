// Many soups of each rule, what they do over time: deno run --allow-read --allow-write traces.js rules.json W seeds out.json
// (W < 0: squares, −W a side). Then the stats: settling (median, spread), plateau, the share ending with oscillators
import { pool } from './pool.js';
import { stats } from './stats.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0])), W = /^hat|:/.test(Deno.args[1] ?? '') ? Deno.args[1] : Number(Deno.args[1] ?? 24), K = Number(Deno.args[2] ?? 12);
const seeds = Array.from({ length: K }, (_, i) => 101 + 7919 * i), P = pool(9), out = [], chunk = 4, t0 = Date.now();
let i = 0, done = 0;
await Promise.all(P.workers.map(async (w) => {
  while (i < rules.length) { const part = rules.slice(i, (i += chunk)); out.push(...(await P.call(w, { task: 'traces', W, rules: part, seeds }))); done += part.length; if (done % 100 < chunk) console.error(done, Math.round((Date.now() - t0) / 1000) + 's'); }
}));
P.close();
Deno.writeTextFileSync(Deno.args[3] ?? './traces.json', JSON.stringify(out.map(stats)));
console.log('done', out.length, Math.round((Date.now() - t0) / 1000) + 's');

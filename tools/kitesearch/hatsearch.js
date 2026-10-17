// Rule search on hats: deno run --allow-read --allow-write hatsearch.js out.json — every B (2 or 3, up to 2 more of 2…7) /
// S (up to 4 of 0…7) / C (2…5) on a patch of 1,024 hats, one soup each; then traces.js and rank.js on the Life-like ones
import { pool } from './pool.js';
const subsets = (arr, max) => { const out = [[]]; for (const x of arr) { const n = out.length; for (let i = 0; i < n; i++) if (out[i].length < max) out.push([...out[i], x]); } return out; };
const Bs = new Set();
for (const lo of [2, 3]) for (const rest of subsets(lo === 2 ? [3, 4, 5, 6, 7] : [4, 5, 6, 7], 2)) Bs.add([lo, ...rest].sort().join(''));
const rules = [];
for (const b of Bs) for (const s of subsets([0, 1, 2, 3, 4, 5, 6, 7], 4).map((x) => x.sort().join(''))) for (const c of [2, 3, 4, 5]) rules.push(`B${b}/S${s}${c > 2 ? '/C' + c : ''}`);
const P = pool(9), out = [], chunk = 40, t0 = Date.now();
let i = 0;
await Promise.all(P.workers.map(async (w) => { while (i < rules.length) { const part = rules.slice(i, (i += chunk)); out.push(...(await P.call(w, { task: 'soups', W: 'hat32', rules: part }))); } }));
P.close();
Deno.writeTextFileSync(Deno.args[0], JSON.stringify(out));
const by = {}; for (const r of out) by[r.end] = (by[r.end] || 0) + 1;
console.log(rules.length, 'rules', Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(by));

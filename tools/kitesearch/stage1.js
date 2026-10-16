import { pool } from './pool.js';
const subsets = (arr, max) => { const out = [[]]; for (const x of arr) { const n = out.length; for (let i = 0; i < n; i++) if (out[i].length < max) out.push([...out[i], x]); } return out; };
const Bs = new Set();
for (const lo of [2, 3]) for (const rest of subsets(lo === 2 ? [3, 4, 5, 6, 7] : [4, 5, 6, 7], 2)) Bs.add([lo, ...rest].sort().join(''));
const Ss = subsets([0, 1, 2, 3, 4, 5, 6, 7, 8], 4).map((s) => s.sort().join(''));
const rules = [];
for (const b of Bs) for (const s of Ss) for (const c of [2, 3, 4, 5]) rules.push(`B${b}/S${s}${c > 2 ? '/C' + c : ''}`);
const P = pool(9), out = [], chunk = 40, t0 = Date.now();
let i = 0, done = 0;
await Promise.all(P.workers.map(async (w) => {
  while (i < rules.length) { const part = rules.slice(i, (i += chunk)); out.push(...(await P.call(w, { task: 'soups', W: 16, rules: part }))); done += part.length; if (done % 2000 < chunk) console.error(done, Math.round((Date.now() - t0) / 1000) + 's'); }
}));
P.close();
Deno.writeTextFileSync(new URL('./stage1.json', import.meta.url), JSON.stringify(out));
console.log('done', out.length, Math.round((Date.now() - t0) / 1000) + 's');

// Rules that grow from a seed and keep moving, without filling the grid: deno run --allow-read --allow-write seedgrow.js
// [workers]. On Menger's sponge: a bloom (the cells within 4 steps of a middle one, 35 % alive) followed; stage 1 on level 3, 600 generations,
// 2 seeds, stage 2 (the best 200) 2,000 generations, 3 seeds, 3 seeds each: how long it keeps changing, how high it goes, where it ends. Out: out/menger-grow.json
const N = Number(Deno.args[0] ?? 4);

const subsets = (arr, max) => { const o = [[]]; for (const x of arr) { const m = o.length; for (let i = 0; i < m; i++) if (o[i].length < max) o.push([...o[i], x]); } return o; };
const Bs = subsets([4, 5, 6, 7, 8, 9], 2).map((r) => [3, ...r].join(''));  // (B2: they fill it, chaos)
const rules = []; for (const b of Bs) for (const s of subsets([0, 1, 2, 3, 4, 5, 6, 7, 8], 4)) for (const c of [2, 3, 4]) rules.push(`B${b}/S${s.join('')}${c > 2 ? '/C' + c : ''}`);
const workers = Array.from({ length: N }, () => new Worker(new URL('./seedgrow-worker.js', import.meta.url).href, { type: 'module' }));
const run = async (list, L, gens, size, seeds = 3) => { const out = []; let i = 0; await Promise.all(workers.map((w) => (async () => { while (i < list.length) { const part = list.slice(i, (i += size)); out.push(...(await new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage({ rules: part, L, gens, seeds }); }))); } })())); return out; };
const score = (r, n, gens) => { if (r.runs.some((x) => x.last < 0)) return 0; return r.runs.reduce((s, x) => s + (x.peak >= 3 * x.a0 && x.end <= 0.08 * n && x.peak <= 0.15 * n ? x.last / gens : 0), 0) / r.runs.length; };  // (grown 3 times at least, never past 15 %, ending under 8 %)
const t0 = Date.now();
console.log(rules.length, 'rules');
const s1 = (await run(rules, 3, 600, 4, 2)).map((r) => ({ ...r, score: score(r, 18048, 600) })).sort((a, b) => b.score - a.score);
console.log('stage 1', Math.round((Date.now() - t0) / 1000) + 's', s1.slice(0, 5).map((r) => r.rule + ' ' + r.score.toFixed(2)).join(' · '));
const s2 = (await run(s1.slice(0, 200).map((r) => r.rule), 3, 2000, 2)).map((r) => ({ ...r, score: score(r, 18048, 2000) })).sort((a, b) => b.score - a.score);
Deno.writeTextFileSync(new URL('./out/menger-grow.json', import.meta.url), JSON.stringify(s2));
console.log('stage 2', Math.round((Date.now() - t0) / 1000) + 's');
for (const r of s2.slice(0, 15)) console.log(r.rule.padEnd(16), r.score.toFixed(2), r.runs.map((x) => `${x.a0}→${x.peak}→${x.end} @${x.last}`).join(' | '));
workers.forEach((w) => w.terminate());

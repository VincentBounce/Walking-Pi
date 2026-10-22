// Patterns at a corner of Sierpiński's tetrahedron (its 4 outer corners alike): deno run --allow-read --allow-write corner.js
// [workers]. For each of the triangles' menu rules (▲), small random starts of the 33 cells nearest the corner [1, 1, 1]
// (about half of them alive), on level 4, followed until they die, settle (repeat within 60) or reach 3,000 generations;
// anything 12 cells or more from the corner dropped. Kept: the smallest oscillator they settle into (all of it within 6 of
// the corner), the longest-lived start (a methuselah, 150 generations at least) and the smallest that gets 12 away (it keeps
// spreading). Their cells as their middles' offsets from the corner, a cell's edge 1 (the same at every level). Out: out/corner.json
const N = Number(Deno.args[0] ?? 4);
const html = Deno.readTextFileSync(new URL('../../index.html', import.meta.url)), jobs = [];
for (const [, rule] of html.matchAll(/<option value="(B[^"]+)" data-name="[^"]*">▲ /g)) if (!jobs.includes(rule)) jobs.push(rule);
const workers = Array.from({ length: N }, () => new Worker(new URL('./corner-worker.js', import.meta.url).href, { type: 'module' }));
const call = (w, msg) => new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(msg); });
const out = {}, t0 = Date.now();
for (const rule of jobs) {
  const parts = await Promise.all(workers.map((w, k) => call(w, { rule, trials: 400, from: k * 400 })));
  const osc = parts.map((p) => p.osc).filter(Boolean).sort((a, b) => a.cells.length - b.cells.length)[0] ?? null;
  const meth = parts.map((p) => p.meth).filter(Boolean).sort((a, b) => b.T - a.T)[0] ?? null;
  const spread = parts.map((p) => p.spread).filter(Boolean).sort((a, b) => a.cells.length - b.cells.length)[0] ?? null;
  out[rule] = { osc, meth, spread };
  console.log(rule.padEnd(18), osc ? `osc p${osc.period} ${osc.cells.length} cells` : 'no osc', '·', meth ? `meth ${meth.T} gens ${meth.cells.length} cells` : 'no meth', '·', spread ? `spreads ${spread.cells.length} cells` : 'no spreader', `${Math.round((Date.now() - t0) / 1000)}s`);
  Deno.writeTextFileSync(new URL('./out/corner.json', import.meta.url), JSON.stringify(out));
}
workers.forEach((w) => w.terminate());

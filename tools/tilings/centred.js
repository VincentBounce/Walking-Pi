// Patterns at the middle of the grids that never repeat (no lattice: Famous's RLEs cannot say them): deno run --allow-read
// --allow-write centred.js [workers]. For each grid and each of its menu rules, small random starts of the cells nearest the
// middle (within 2.2 of it, about half of them alive), followed on a ⌀ 48 patch until they die, settle (repeat within 60) or
// reach 1,500 generations; anything near the walls (within 5 of the edge) dropped. Kept: the smallest oscillator they
// settle into (period 2 or more, all of it within 6 of the middle: its cells and states, as it is then) and the longest-
// lived start (a methuselah). Their cells as their middles' offsets from the patch's middle. Out: out/centred.json
const N = Number(Deno.args[0] ?? 4), W = 48;
const html = Deno.readTextFileSync(new URL('../../index.html', import.meta.url));
const MARKS = { '◺': 'pinwheel', '❀': 'flower', '✾': 'flower5', '✽': 'flower7', '✸': 'flower3', '✷': 'flower4', '✹': 'flower8', '❇': 'ring7', '✲': 'ring8', '✻': 'ring9', '✴': 'ring10', '❈': 'ring12', '❊': 'mirror7', '❅': 'rhombs14' };
const jobs = [];
for (const [, rule, mark] of html.matchAll(/<option value="([^"]+)" data-name="[^"]*">(\S+) /g)) if (MARKS[mark] && /^B/.test(rule)) jobs.push([MARKS[mark], rule]);
const workers = Array.from({ length: N }, () => new Worker(new URL('./centred-worker.js', import.meta.url).href, { type: 'module' }));
const call = (w, msg) => new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(msg); });
const out = {}, t0 = Date.now();
for (const [kind, rule] of jobs) {
  const parts = await Promise.all(workers.map((w, k) => call(w, { kind, rule, W, trials: 150, from: k * 150 })));
  const osc = parts.map((p) => p.osc).filter(Boolean).sort((a, b) => a.cells.length - b.cells.length)[0] ?? null;
  const meth = parts.map((p) => p.meth).filter(Boolean).sort((a, b) => b.T - a.T)[0] ?? null;
  (out[kind] ??= {})[rule] = { osc, meth };
  console.log(kind.padEnd(9), rule.padEnd(18), osc ? `osc p${osc.period} ${osc.cells.length} cells` : 'no osc', '·', meth ? `meth ${meth.T} gens ${meth.cells.length} cells` : 'no meth', `${Math.round((Date.now() - t0) / 1000)}s`);
  Deno.writeTextFileSync(new URL('./out/centred.json', import.meta.url), JSON.stringify(out));
}
workers.forEach((w) => w.terminate());

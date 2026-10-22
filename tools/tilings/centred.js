// Patterns at the middle of the grids that never repeat (no lattice: Famous's RLEs cannot say them): deno run --allow-read
// --allow-write centred.js [workers]. For each grid and each of its menu rules, small random starts of the 30 cells nearest the
// middle (about half of them alive), followed on a ⌀ 48 patch (W 43, as the app's) until they die, settle (repeat within 60) or reach 3,000
// generations; anything near the walls (within 5 of the edge) dropped. Kept: the smallest oscillator they
// settle into (period 2 or more, all of it within 6 of the middle: its cells and states, as it is then) the longest-
// lived start (a methuselah, 200 generations at least) and the smallest that reaches the walls (it keeps spreading). Their cells as their middles' offsets from the patch's middle. Out: out/centred.json
const N = Number(Deno.args[0] ?? 4), only = Deno.args[2], off = Deno.args[1] === 'off', W = 43, file = off ? 'centred-off.json' : 'centred.json';  // (off: 6 from the middle, for colours: a copy a colour turned round it)  // (the app's W for ⌀ 48: the pinwheel's middle moves with W)
const html = Deno.readTextFileSync(new URL('../../index.html', import.meta.url));
const MARKS = { '◺': 'pinwheel', '❀': 'flower', '✾': 'flower5', '✽': 'flower7', '✸': 'flower3', '✷': 'flower4', '✹': 'flower8', '✼': 'flower9', '✥': 'flower10', '❇': 'ring7', '✲': 'ring8', '✻': 'ring9', '✴': 'ring10', '❈': 'ring12', '❊': 'mirror7', '❅': 'rhombs14' };
const jobs = [];
for (const [, rule, mark] of html.matchAll(/<option value="([^"]+)" data-name="[^"]*">(\S+) /g)) if (MARKS[mark] && /^B/.test(rule) && (!only || MARKS[mark] === only)) jobs.push([MARKS[mark], rule]);
const workers = Array.from({ length: N }, () => new Worker(new URL('./centred-worker.js', import.meta.url).href, { type: 'module' }));
const call = (w, msg) => new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(msg); });
const out = only ? JSON.parse(Deno.readTextFileSync(new URL(`./out/${file}`, import.meta.url))) : {}, t0 = Date.now();
for (const [kind, rule] of jobs) {
  const parts = await Promise.all(workers.map((w, k) => call(w, { kind, rule, W, trials: 600, from: k * 600, at: off ? [6, 0] : [0, 0] })));
  const osc = parts.map((p) => p.osc).filter(Boolean).sort((a, b) => a.cells.length - b.cells.length)[0] ?? null;
  const meth = parts.map((p) => p.meth).filter(Boolean).sort((a, b) => b.T - a.T)[0] ?? null;
  const spread = parts.map((p) => p.spread).filter(Boolean).sort((a, b) => a.cells.length - b.cells.length)[0] ?? null;
  (out[kind] ??= {})[rule] = { osc, meth, spread };
  console.log(kind.padEnd(9), rule.padEnd(18), osc ? `osc p${osc.period} ${osc.cells.length} cells` : 'no osc', '·', meth ? `meth ${meth.T} gens ${meth.cells.length} cells` : 'no meth', '·', spread ? `spreads ${spread.cells.length} cells` : 'no spreader', `${Math.round((Date.now() - t0) / 1000)}s`);
  Deno.writeTextFileSync(new URL(`./out/${file}`, import.meta.url), JSON.stringify(out));
}
workers.forEach((w) => w.terminate());

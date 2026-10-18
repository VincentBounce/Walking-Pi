// Methuselahs for the tilings' rules: deno run --allow-read --allow-write meths.js rules.json out.json [workers] [trials]
// rules.json: [[tiling, rule], …]. Many small random starts (2 × 2, 3 × 2 and 2 × 3 lattice cells) on a small torus
// (what lasts there: a first sort, ships coming round counting too), the 48 longest-lived of 12 cells or fewer then
// measured as Life counts a methuselah (../kitesearch/engine.js, settle: a big grid, the ships flying off taken away)
import { pool } from '../kitesearch/pool.js';
import { tilingCells } from './grid.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0])), N = Number(Deno.args[2] ?? 6), trials = Number(Deno.args[3] ?? 500), P = pool(N), res = {}, t0 = Date.now();
const rle = (cells) => {
  const h = Math.max(...cells.map((c) => c[1])) + 1, rows = [];
  for (let y = 0; y < h; y++) {
    const xs = cells.filter((c) => c[1] === y), w = xs.length ? Math.max(...xs.map((c) => c[0])) + 1 : 0, line = [];
    for (let x = 0; x < w; x++) line.push(xs.some((q) => q[0] === x) ? 'A' : '.');
    let s = '', i = 0;
    while (i < line.length) { let j = i; while (j < line.length && line[j] === line[i]) j++; s += (j - i > 1 ? j - i : '') + line[i]; i = j; }
    rows.push(s);
  }
  return rows.join('$') + '!';
};
const cool = () => new Promise((r) => setTimeout(r, 20000));  // a rest between rules (the machine cools)
for (const [name, rule] of rules) {
  const m = tilingCells(name), small = `${name}:${Math.round(Math.sqrt(5000 / m))}`, big = `${name}:${Math.round(Math.sqrt(90000 / m))}`, starts = [];
  const shapes = m > 12 ? [[1, 1, 0.2, 0], [1, 1, 0.15, 1e6], [2, 1, 0.1, 2e6]] : [[2, 2, 0.45, 0], [2, 3, 0.35, 1e6], [3, 2, 0.35, 2e6]];  // (a big lattice cell, the 15th pentagon's 48: one of them, sparser)
  for (const [r, w, d, from] of shapes) {
    const parts = await Promise.all(P.workers.map((wk, k) => P.call(wk, { task: 'seeds', W: small, rule, opts: [trials, from + k * trials, r, w, d, 1200] })));
    for (const p of parts) starts.push(...p.starts);
  }
  const pick = starts.filter((s) => s.cells.length >= 3 && s.cells.length <= 12).sort((p, q) => q.life - p.life).slice(0, 48);
  const parts = Array.from({ length: N }, (_, k) => pick.filter((_, i) => i % N === k));
  const measured = (await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'settle', W: big, rule, starts: parts[k].map((x) => x.cells) })))).flatMap((r, k) => r.map((x, i) => ({ ...x, cells: parts[k][i].cells })));
  const seen = new Set(), meths = measured.filter((x) => x.end === 'settles').sort((p, q) => q.T - p.T || p.cells.length - q.cells.length)
    .filter((x) => !seen.has(rle(x.cells)) && seen.add(rle(x.cells))).slice(0, 5).map((x) => ({ rle: rle(x.cells), n: x.cells.length, T: x.T, ships: x.ships, period: x.period }));
  res[`${name} ${rule}`] = { meths, ends: measured.reduce((o, x) => ({ ...o, [x.end]: (o[x.end] ?? 0) + 1 }), {}) };
  Deno.writeTextFileSync(Deno.args[1], JSON.stringify(res, null, 1));
  console.log(name, rule, Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(res[`${name} ${rule}`].ends), meths.map((x) => `${x.T}:${x.n}`).join(' '));
  await cool();
}
P.close();

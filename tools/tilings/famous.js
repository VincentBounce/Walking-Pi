// Famous patterns for the tilings' rules: deno run --allow-read --allow-write famous.js rules.json out.json [workers]
// rules.json: [[tiling, rule], …]. For each: small random starts (2 × 2 and 3 × 2 lattice cells, many) run on a torus,
// the longest-lived of 12 cells or fewer measured as Life counts a methuselah (../kitesearch/engine.js, settle: on a big
// grid, until its debris repeat, the ships flying off taken away); bigger starts (3 × 3, 4 × 4) for what they leave:
// ships and oscillators. Patterns as the app's RLE (A alive, B, C … dying, . dead; a row a lattice row)
import { pool } from '../kitesearch/pool.js';
import { tilingCells } from './grid.js';
const rules = JSON.parse(Deno.readTextFileSync(Deno.args[0])), N = Number(Deno.args[2] ?? 6), P = pool(N), res = {}, t0 = Date.now();
const rle = (cells) => {
  const h = Math.max(...cells.map((c) => c[1])) + 1, rows = [];
  for (let y = 0; y < h; y++) {
    const xs = cells.filter((c) => c[1] === y), w = xs.length ? Math.max(...xs.map((c) => c[0])) + 1 : 0, line = [];
    for (let x = 0; x < w; x++) { const c = xs.find((q) => q[0] === x); line.push(c ? String.fromCharCode(64 + c[2]) : '.'); }
    let s = '', i = 0;
    while (i < line.length) { let j = i; while (j < line.length && line[j] === line[i]) j++; s += (j - i > 1 ? j - i : '') + line[i]; i = j; }
    rows.push(s);
  }
  return rows.join('$').replace(/\$\$+/g, (m) => `${m.length}$`) + '!';
};
const merge = (parts) => {
  const found = new Map(), starts = [];
  for (const p of parts) { starts.push(...p.starts); for (const f of p.found) { const k = f.cells.map((c) => c.join(',')).join(';'); if (found.has(k)) found.get(k).count += f.count; else found.set(k, { ...f }); } }
  return { found: [...found.values()], starts };
};
const cool = () => new Promise((r) => setTimeout(r, 20000));  // a rest between rules (the machine cools)
const spread = async (task, W, rule, trials, args) => merge(await Promise.all(P.workers.map((w, k) => P.call(w, { task, W, rule, opts: [trials, k * trials + args.from, ...args.opts] }))));
for (const [name, rule] of rules) {
  const m = tilingCells(name), small = `${name}:${Math.round(Math.sqrt(12000 / m))}`, big = `${name}:${Math.round(Math.sqrt(90000 / m))}`;
  // methuselahs: the longest-lived small starts on the torus, then measured
  const a = await spread('seeds', small, rule, 80, { from: 0, opts: [2, 2, 0.4, 1500] });
  const b = await spread('seeds', small, rule, 80, { from: 50000, opts: [2, 3, 0.35, 1500] });
  const pick = [...a.starts, ...b.starts].filter((s) => s.cells.length >= 3 && s.cells.length <= 12).sort((p, q) => q.life - p.life).slice(0, 36);
  console.log(name, rule, 'small starts', Math.round((Date.now() - t0) / 1000) + 's');
  const parts = Array.from({ length: N }, (_, k) => pick.filter((_, i) => i % N === k));
  const measured = (await Promise.all(P.workers.map((w, k) => P.call(w, { task: 'settle', W: big, rule, starts: parts[k].map((x) => x.cells) })))).flatMap((r, k) => r.map((x, i) => ({ ...x, cells: parts[k][i].cells })));
  const meths = measured.filter((x) => x.end === 'settles' && x.T >= 150).sort((p, q) => q.T - p.T || p.cells.length - q.cells.length).slice(0, 4)
    .map((x) => ({ rle: rle(x.cells), n: x.cells.length, T: x.T, ships: x.ships, period: x.period }));
  // ships and oscillators: what bigger starts leave
  const c = await spread('seeds', small, rule, 120, { from: 100000, opts: [3, 3, 0.5, 800] });
  const d = await spread('seeds', small, rule, 80, { from: 200000, opts: [4, 4, 0.45, 800] });
  const found = merge([{ found: c.found, starts: [] }, { found: d.found, starts: [] }]).found;
  const out = (kind) => found.filter((f) => f.kind === kind).sort((p, q) => q.count - p.count).slice(0, 6).map((f) => ({ rle: rle(f.cells), n: f.cells.filter((x) => x[2] === 1).length, cells: f.cells.length, period: f.period, move: f.move, count: f.count }));
  res[`${name} ${rule}`] = { ships: out('ship'), oscs: out('osc'), meths };
  Deno.writeTextFileSync(Deno.args[1], JSON.stringify(res, null, 1));
  console.log(name, rule, Math.round((Date.now() - t0) / 1000) + 's', 'ships', res[`${name} ${rule}`].ships.length, 'oscs', res[`${name} ${rule}`].oscs.length, 'meths', meths.map((x) => `${x.T}:${x.n}`).join(' '));
  await cool();
}
P.close();

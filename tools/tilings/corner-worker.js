// corner.js's worker: one rule, its share of the small starts at the corner [1, 1, 1] of Sierpiński's tetrahedron (level 4)
import { parse, step } from '../kitesearch/engine.js';
import { sierpinskiGrid } from './sierpinski.js';
const L = 4, G = sierpinskiGrid(L), n = G.n, unit = (3 * 2 ** L) / (2 * Math.SQRT2);  // (a cell's edge 1)
const mid = G.mids.map((p) => p.map((v) => (v - 1) * unit)), d = mid.map((p) => Math.hypot(...p));
const core = [...Array(n).keys()].filter((t) => d[t] < 2.6);  // (the 33 nearest it, all those as near)
const cellsOf = (ts, a) => ts.map((t) => [...mid[t].map((v) => +v.toFixed(3)), a ? a[t] : 1]);
self.onmessage = ({ data: { rule, trials, from } }) => {
  const { B, S, C } = parse(rule);
  let seed = 977 + from;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  let osc = null, meth = null, spread = null;
  for (let k = 0; k < trials; k++) {
    let a = new Uint8Array(n), b = new Uint8Array(n);
    const start = core.filter(() => rnd() < 0.5);
    if (start.length < 3) continue;
    for (const t of start) a[t] = 1;
    const seen = new Map();
    let T = 0, period = 0, out = false;
    for (let g = 1; g <= 3000; g++) {
      const [, any] = step(a, b, G.start, G.list, B, S, C, G.side);
      [a, b] = [b, a];
      if (!any) { T = g; break; }
      let hash = 2166136261, wide = false;
      for (let t = 0; t < n; t++) if (a[t]) { hash = Math.imul(hash ^ (t * 7 + a[t]), 16777619); if (d[t] > 12) wide = true; }
      if (wide) { out = true; break; }
      if (seen.has(hash) && g - seen.get(hash) <= 60) { T = g; period = g - seen.get(hash); break; }
      seen.set(hash, g);
    }
    if (out && (!spread || start.length < spread.cells.length)) spread = { cells: cellsOf(start) };
    if (out || !T) continue;
    if (T >= 150 && (!meth || T > meth.T)) meth = { T, cells: cellsOf(start) };
    if (period >= 2) {
      const cells = [...Array(n).keys()].filter((t) => a[t]);
      if (cells.every((t) => d[t] < 6) && (!osc || cells.length < osc.cells.length)) osc = { period, cells: cellsOf(cells, a) };
    }
  }
  self.postMessage({ osc, meth, spread });
};

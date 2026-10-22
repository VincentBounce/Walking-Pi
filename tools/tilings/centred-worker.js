// centred.js's worker: one grid, one rule, its share of the small starts at the middle
import { parse, step } from '../kitesearch/engine.js';
import { patchGrid } from './patch.js';
import { ROSETTES } from './rosette.js';
import { PINWHEEL } from './pinwheel.js';
import { HOUSES } from './houses.js';
import { RHOMBS14 } from './ammann.js';
const patches = {};
const patchOf = (kind, W) => patches[kind] ??= (kind === 'pinwheel' ? PINWHEEL(W) : kind === 'mirror7' ? HOUSES(7)(W) : kind === 'rhombs14' ? RHOMBS14(W) : ROSETTES[kind][1](W));
self.onmessage = ({ data: { kind, rule, W, trials, from } }) => {
  const h = patchOf(kind, W), G = patchGrid(h, W), n = G.n, o = (W - 1) / 2;
  const mid = h.polys.map((p) => [p.reduce((s, q) => s + q[0], 0) / p.length - o, p.reduce((s, q) => s + q[1], 0) / p.length - o]);
  const r = mid.map(([x, y]) => Math.hypot(x, y)), dead = new Set(h.dead), live = (t) => !dead.has(t) && G.start[t] < G.start[t + 1];
  const core = [...Array(n).keys()].filter(live).sort((u, v) => r[u] - r[v]).slice(0, 30), far = W / 2 - 5;  // (the 30 nearest the middle: round a ring's hole too)
  const { B, S, C } = parse(rule.replace(/v([0-3]+)/gi, (_, d) => [...d].map((k) => 'abcd'[k]).join('')));  // (the app's v0… as the engine's a…)
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
      for (let t = 0; t < n; t++) if (a[t]) { hash = Math.imul(hash ^ (t * 7 + a[t]), 16777619); if (r[t] > far) wide = true; }
      if (wide) { out = true; break; }
      if (seen.has(hash) && g - seen.get(hash) <= 60) { T = g; period = g - seen.get(hash); break; }
      seen.set(hash, g);
    }
    if (out && (!spread || start.length < spread.cells.length)) spread = { cells: start.map((t) => [+mid[t][0].toFixed(3), +mid[t][1].toFixed(3), 1]) };  // (it reaches the walls: it keeps spreading)
    if (out || !T) continue;
    if (T >= 200 && (!meth || T > meth.T)) meth = { T, cells: start.map((t) => [+mid[t][0].toFixed(3), +mid[t][1].toFixed(3), 1]) };
    if (period >= 2) {
      const cells = [...Array(n).keys()].filter((t) => a[t]);
      if (cells.every((t) => r[t] < 6) && (!osc || cells.length < osc.cells.length)) osc = { period, cells: cells.map((t) => [+mid[t][0].toFixed(3), +mid[t][1].toFixed(3), a[t]]) };
    }
  }
  self.postMessage({ osc, meth, spread });
};

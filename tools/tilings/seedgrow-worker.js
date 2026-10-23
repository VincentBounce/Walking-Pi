// seedgrow.js's worker: a list of rules, each bloom followed (see seedgrow.js)
import { mengerGrid } from './menger.js';
import { parse, step } from '../kitesearch/engine.js';
const grids = {};
self.onmessage = ({ data: { rules, name = 'menger', L, gens, seeds = 3 } }) => {
  const G = grids[`${name}${L}`] ??= mengerGrid(L), n = G.n, out = [];
  // the middle: a cell, then rings by steps
  const ring = new Int32Array(n).fill(-1), q = [Math.floor(n / 2)]; ring[q[0]] = 0;
  for (let i = 0; i < q.length; i++) for (let k = G.start[q[i]]; k < G.start[q[i] + 1]; k++) { const u = G.list[k]; if (ring[u] < 0) { ring[u] = ring[q[i]] + 1; q.push(u); } }
  for (const rule of rules) {
    const { B, S, C } = parse(rule), runs = [];
    for (let sd = 1; sd <= seeds; sd++) {
      let s = sd * 7919 + 13; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
      let a = new Uint8Array(n), b = new Uint8Array(n);
      for (let t = 0; t < n; t++) if (ring[t] >= 0 && ring[t] <= 4 && rnd() < 0.35) a[t] = 1;
      let a0 = a.reduce((x, v) => x + v, 0), peak = a0, last = 0, pop = a0;
      for (let g = 1; g <= gens; g++) {
        const [p, any] = step(a, b, G.start, G.list, B, S, C); pop = p;
        let ch = 0; for (let t = 0; t < n; t++) if ((a[t] === 1) !== (b[t] === 1)) ch++;
        [a, b] = [b, a];
        if (ch > 0.002 * n) last = g;
        peak = Math.max(peak, pop);
        if (pop > 0.45 * n) { last = -1; break; }
      if (!any) break;  // (all dead)
      }
      runs.push({ a0, peak, end: pop, last });
    }
    out.push({ rule, runs });
  }
  self.postMessage(out);
};

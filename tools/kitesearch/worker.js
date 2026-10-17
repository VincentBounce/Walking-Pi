import { soup, seeds, behaviour, trace } from './engine.js';
import { grid, squareGrid } from './kite.js';
import { hatGrid } from './hat.js';
import { tilingGrid } from '../tilings/grid.js';
import { penroseGrid } from '../tilings/penrose.js';
import { spectreGrid } from '../tilings/spectre.js';
const grids = {};
const G = (W) => grids[W] ??= (typeof W === 'string' ? (W.startsWith('hat') ? hatGrid(Number(W.slice(3))) : W.startsWith('penrose:') ? penroseGrid(Number(W.slice(8))) : W.startsWith('spectre:') ? spectreGrid(Number(W.slice(8))) : tilingGrid(...W.split(':').map((v, i) => (i ? Number(v) : v)))) : W < 0 ? squareGrid(-W) : grid(W));  // W < 0: squares, −W a side; 'hat48': hats; 'floret:20': a tiling's
self.onmessage = ({ data }) => {
  const { id, task, W, rules, rule, opts, cells } = data;
  let out;
  if (task === 'soups') out = rules.map((r) => soup(G(W), r, ...(opts ?? [])));
  if (task === 'seeds') out = seeds(G(W), rule, ...(opts ?? []));
  if (task === 'traces') out = rules.map((r) => ({ rule: r, runs: data.seeds.map((sd) => trace(G(W), r, sd, ...(opts ?? []))) }));
  if (task === 'behaviour') out = behaviour(G(W), rule, cells, opts ?? 400);
  self.postMessage({ id, out });
};

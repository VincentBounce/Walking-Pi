import { soup, seeds, behaviour, trace } from './engine.js';
import { grid, squareGrid } from './kite.js';
import { hatGrid } from './hat.js';
const grids = {};
const G = (W) => grids[W] ??= (typeof W === 'string' ? hatGrid(Number(W.slice(3))) : W < 0 ? squareGrid(-W) : grid(W));  // W < 0: squares, −W a side; 'hat48': hats
self.onmessage = ({ data }) => {
  const { id, task, W, rules, rule, opts, cells } = data;
  let out;
  if (task === 'soups') out = rules.map((r) => soup(G(W), r, ...(opts ?? [])));
  if (task === 'seeds') out = seeds(G(W), rule, ...(opts ?? []));
  if (task === 'traces') out = rules.map((r) => ({ rule: r, runs: data.seeds.map((sd) => trace(G(W), r, sd, ...(opts ?? []))) }));
  if (task === 'behaviour') out = behaviour(G(W), rule, cells, opts ?? 400);
  self.postMessage({ id, out });
};

import { soup, seeds, behaviour } from './engine.js';
import { grid } from './kite.js';
const grids = {};
const G = (W) => grids[W] ??= grid(W);
self.onmessage = ({ data }) => {
  const { id, task, W, rules, rule, opts, cells } = data;
  let out;
  if (task === 'soups') out = rules.map((r) => soup(G(W), r, ...(opts ?? [])));
  if (task === 'seeds') out = seeds(G(W), rule, ...(opts ?? []));
  if (task === 'behaviour') out = behaviour(G(W), rule, cells, opts ?? 400);
  self.postMessage({ id, out });
};

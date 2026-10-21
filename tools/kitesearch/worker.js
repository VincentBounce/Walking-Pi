import { soup, seeds, behaviour, trace, settle } from './engine.js';
import { grid, squareGrid } from './kite.js';
import { hatGrid } from './hat.js';
import { tilingGrid } from '../tilings/grid.js';
import { penroseGrid } from '../tilings/penrose.js';
import { spectreGrid } from '../tilings/spectre.js';
import { ammannGrid, rhombs12Grid } from '../tilings/ammann.js';
import { rosetteGrid, ROSETTES } from '../tilings/rosette.js';
import { pinwheelGrid } from '../tilings/pinwheel.js';
import { housesGrid } from '../tilings/houses.js';
const grids = {};
const G = (W) => grids[W] ??= (typeof W === 'string' ? (W.startsWith('hat') ? hatGrid(Number(W.replace(/^hat:?/, ''))) : W.startsWith('pinwheel:') ? pinwheelGrid(Number(W.slice(9))) : W.startsWith('mirror7:') ? housesGrid(Number(W.slice(8))) : W.startsWith('rhombs12:') ? rhombs12Grid(Number(W.slice(9))) : W.startsWith('penrose:') ? penroseGrid(Number(W.slice(8))) : W.startsWith('spectre:') ? spectreGrid(Number(W.slice(8))) : W.startsWith('ammann:') ? ammannGrid(Number(W.slice(7))) : ROSETTES[W.split(':')[0]] ? rosetteGrid(W.split(':')[0], Number(W.split(':')[1])) : tilingGrid(...W.split(':').map((v, i) => (i ? Number(v) : v)))) : W < 0 ? squareGrid(-W) : grid(W));  // W < 0: squares, −W a side; 'hat48': hats; 'floret:20': a tiling's
self.onmessage = ({ data }) => {
  const { id, task, W, rules, rule, opts, cells } = data;
  let out;
  if (task === 'soups') out = rules.map((r) => soup(G(W), r, ...(opts ?? [])));
  if (task === 'seeds') out = seeds(G(W), rule, ...(opts ?? []));
  if (task === 'traces') out = rules.map((r) => ({ rule: r, runs: data.seeds.map((sd) => trace(G(W), r, sd, ...(opts ?? []))) }));
  if (task === 'behaviour') out = behaviour(G(W), rule, cells, opts ?? 400);
  if (task === 'settle') out = data.starts.map((cs) => settle(G(W), rule, cs, opts ?? 20000));
  self.postMessage({ id, out });
};

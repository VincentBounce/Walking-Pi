import { soup, seeds, behaviour, trace, settle, revive, battle } from './engine.js';
import { grid, squareGrid } from './kite.js';
import { hatGrid } from './hat.js';
import { tilingGrid } from '../tilings/grid.js';
import { penroseGrid } from '../tilings/penrose.js';
import { spectreGrid } from '../tilings/spectre.js';
import { ammannGrid, rhombs12Grid, rhombs14Grid } from '../tilings/ammann.js';
import { rosetteGrid, ROSETTES } from '../tilings/rosette.js';
import { pinwheelGrid } from '../tilings/pinwheel.js';
import { housesGrid } from '../tilings/houses.js';
import { mengerGrid } from '../tilings/menger.js';
const grids = {};
const G = (W) => grids[W] ??= (typeof W === 'string' ? (W.startsWith('hat') ? hatGrid(Number(W.replace(/^hat:?/, ''))) : W.startsWith('pinwheel:') ? pinwheelGrid(Number(W.slice(9))) : W.startsWith('mirror7:') ? housesGrid(Number(W.slice(8))) : W.startsWith('frame:') ? mengerGrid(1, Math.round(Number(W.slice(6)) / 8)) : W.startsWith('menger:') ? mengerGrid(Number(W.slice(7)) < 10 ? Number(W.slice(7)) : 2) : W.startsWith('rhombs12:') ? rhombs12Grid(Number(W.slice(9))) : W.startsWith('rhombs14:') ? rhombs14Grid(Number(W.slice(9))) : W.startsWith('penrose:') ? penroseGrid(Number(W.slice(8))) : W.startsWith('spectre:') ? spectreGrid(Number(W.slice(8))) : W.startsWith('ammann:') ? ammannGrid(Number(W.slice(7))) : ROSETTES[W.split(':')[0]] ? rosetteGrid(W.split(':')[0], Number(W.split(':')[1])) : tilingGrid(...W.split(':').map((v, i) => (i ? Number(v) : v)))) : W < 0 ? squareGrid(-W) : grid(W));  // W < 0: squares, −W a side; 'hat48': hats; 'floret:20': a tiling's
self.onmessage = ({ data }) => {
  const { id, task, W, rules, rule, opts, cells } = data;
  let out;
  if (task === 'soups') out = rules.map((r) => soup(G(W), r, ...(opts ?? [])));
  if (task === 'seeds') out = seeds(G(W), rule, ...(opts ?? []));
  if (task === 'traces') out = rules.map((r) => ({ rule: r, runs: data.seeds.map((sd) => trace(G(W), r, sd, ...(opts ?? []))) }));
  if (task === 'behaviour') out = behaviour(G(W), rule, cells, opts ?? 400);
  if (task === 'settle') out = data.starts.map((cs) => settle(G(W), rule, cs, opts ?? 20000));
  if (task === 'revive') out = data.seeds.map((sd) => revive(G(W), rule, data.ships, sd, ...(opts ?? [])));
  if (task === 'ways') {  // for each count of live neighbours d, the k by a corner only (0…3, 3 or more) some cell can have
    const g = G(W), most = [];
    for (let t = 0; t < g.n; t++) { let s = 0, k = 0; for (let q = g.start[t]; q < g.start[t + 1]; q++) if (g.side[q]) s++; else k++; most.push([s, k]); }
    out = Array.from({ length: 10 }, (_, d) => [0, 1, 2, 3].filter((k) => most.some(([s, c]) => (k < 3 ? k <= c && d - k <= s && k <= d : c >= 3 && d >= 3 && d - 3 >= 0 && Math.max(3, d - s) <= Math.min(d, c)))));
  }
  if (task === 'battle') out = data.seeds.map((sd) => battle(G(W), rule, sd, ...(opts ?? [])));
  self.postMessage({ id, out });
};

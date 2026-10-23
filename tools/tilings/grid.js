// A tiling's torus of W × W lattice cells (see build.js, tilings.json), as the app builds it: cell x of row y polygon
// x % m of lattice cell ⌊x / m⌋; neighbours: the cells sharing a corner (wrapping round), by a side (two corners shared)
// or a corner only (side: the letters); mid(t): its middle, world units
const T = JSON.parse(Deno.readTextFileSync(new URL('./tilings.json', import.meta.url)));
// the Cairo pentagons as main.js has them (cairoCorners): one pentagon across each side of a square grid, a bar in each
// square level or upright by the parity of i + j; a lattice cell of 2 × 2 squares, 8 pentagons
{
  const b = (Math.sqrt(7) - 1) / 6, polys = [];
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) for (const o of [0, 1]) {
    const odd = (i + j) & 1;
    const c = o === 0 ? (odd ? [[i, j], [i + 0.5, j + 0.5 - b], [i + 1, j], [i + 0.5 + b, j - 0.5], [i + 0.5 - b, j - 0.5]]
                             : [[i, j], [i + 0.5 - b, j + 0.5], [i + 0.5 + b, j + 0.5], [i + 1, j], [i + 0.5, j - 0.5 + b]])
                      : (odd ? [[i, j], [i + 0.5, j + 0.5 - b], [i + 0.5, j + 0.5 + b], [i, j + 1], [i - 0.5 + b, j + 0.5]]
                             : [[i, j], [i + 0.5 - b, j + 0.5], [i, j + 1], [i - 0.5, j + 0.5 + b], [i - 0.5, j + 0.5 - b]]);
    polys.push(c.map(([x, y]) => [x / 2, y / 2]));
  }
  T.cairo = { basis: [[2, 0], [0, 2]], polys };
}
export function tilingGrid(name, W) {
  const P = T[name].polys, m = P.length, row = m * W, n = row * W, by = new Map();
  const key = ([u, v]) => `${((Math.round(u * 1000) % (W * 1000)) + W * 1000) % (W * 1000)},${((Math.round(v * 1000) % (W * 1000)) + W * 1000) % (W * 1000)}`;
  const corners = (t) => { const x = t % row, y = Math.floor(t / row), i = Math.floor(x / m); return P[x % m].map(([u, v]) => [u + i, v + y]); };
  for (let t = 0; t < n; t++) for (const c of corners(t)) { const k = key(c); (by.get(k) ?? by.set(k, []).get(k)).push(t); }
  const start = new Int32Array(n + 1), list = [], side = [];
  for (let t = 0; t < n; t++) {
    const around = new Map();
    for (const c of corners(t)) for (const u of by.get(key(c))) if (u !== t) around.set(u, (around.get(u) ?? 0) + 1);
    start[t] = list.length;
    for (const u of [...around.keys()].sort((a, b) => a - b)) { list.push(u); side.push(around.get(u) >= 2 ? 1 : 0); }
  }
  start[n] = list.length;
  const [a, b] = T[name].basis, mid = (t) => { const c = corners(t), u = c.reduce((s, p) => s + p[0], 0) / c.length, v = c.reduce((s, p) => s + p[1], 0) / c.length; return [u * a[0] + v * b[0], u * a[1] + v * b[1]]; };
  return { W, row, n, start, list: Int32Array.from(list), side: Uint8Array.from(side), per: m, mid };
}
export const tilingCells = (name) => T[name].polys.length;

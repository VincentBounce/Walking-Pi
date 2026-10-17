// A tiling's torus of W × W lattice cells (see build.js, tilings.json), as the app builds it: cell x of row y polygon
// x % m of lattice cell ⌊x / m⌋; neighbours: the cells sharing a corner (wrapping round)
const T = JSON.parse(Deno.readTextFileSync(new URL('./tilings.json', import.meta.url)));
export function tilingGrid(name, W) {
  const P = T[name].polys, m = P.length, row = m * W, n = row * W, by = new Map();
  const key = ([u, v]) => `${((Math.round(u * 1000) % (W * 1000)) + W * 1000) % (W * 1000)},${((Math.round(v * 1000) % (W * 1000)) + W * 1000) % (W * 1000)}`;
  const corners = (t) => { const x = t % row, y = Math.floor(t / row), i = Math.floor(x / m); return P[x % m].map(([u, v]) => [u + i, v + y]); };
  for (let t = 0; t < n; t++) for (const c of corners(t)) { const k = key(c); (by.get(k) ?? by.set(k, []).get(k)).push(t); }
  const start = new Int32Array(n + 1), list = [];
  for (let t = 0; t < n; t++) {
    const around = new Set();
    for (const c of corners(t)) for (const u of by.get(key(c))) if (u !== t) around.add(u);
    start[t] = list.length;
    list.push(...[...around].sort((a, b) => a - b));
  }
  start[n] = list.length;
  return { W, row, n, start, list: Int32Array.from(list), per: m };
}
export const tilingCells = (name) => T[name].polys.length;

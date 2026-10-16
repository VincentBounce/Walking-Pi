// Kites (each triangle cut in 3) on a W × W torus of rhombi, as the app's plane: cell t = y * 6W + x
export const kitesOf = (c) => {
  const m = [0, 1].map((d) => (c[0][d] + c[1][d] + c[2][d]) / 3), half = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  return [0, 1, 2].map((k) => [c[k], half(c[k], c[(k + 1) % 3]), m, half(c[(k + 2) % 3], c[k])]);
};
export const kiteCorners = (x, y) => { const t = Math.floor(x / 3), i = t >> 1; return kitesOf(t & 1 ? [[i + 1, y], [i + 1, y + 1], [i, y + 1]] : [[i, y], [i + 1, y], [i, y + 1]])[((x % 3) + 3) % 3]; };
export function grid(W) {
  const row = 6 * W, n = row * W, byCorner = new Map(), M = 6 * W;
  const key = (u, v) => ((Math.round(u * 6) % M) + M) % M * 100000 + ((Math.round(v * 6) % M) + M) % M;
  for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) for (const [u, v] of kiteCorners(x, y)) {
    const k = key(u, v);
    (byCorner.get(k) ?? byCorner.set(k, []).get(k)).push(y * row + x);
  }
  const start = new Int32Array(n + 1), list = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) {
    const t = y * row + x, around = new Set();
    for (const [u, v] of kiteCorners(x, y)) for (const c of byCorner.get(key(u, v))) if (c !== t) around.add(c);
    start[t] = list.length;
    list.push(...[...around].sort((a, b) => a - b));
  }
  start[n] = list.length;
  return { W, row, n, start, list: Int32Array.from(list) };
}

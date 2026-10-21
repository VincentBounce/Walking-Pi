// Menger's sponge as main.js builds it (mengerMesh: its surface's squares, a square per side of a cell kept facing one
// taken away), and its grid for the searches: each square's neighbours, the squares sharing a corner with it
export function mengerGrid(L) {
  const n = 3 ** L, kept = (x, y, z) => {
    if (Math.min(x, y, z) < 0 || Math.max(x, y, z) >= n) return false;
    for (let k = 0; k < L; k++, x = Math.floor(x / 3), y = Math.floor(y / 3), z = Math.floor(z / 3)) if ((x % 3 === 1) + (y % 3 === 1) + (z % 3 === 1) >= 2) return false;
    return true;
  };
  const quads = [];
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    if (!kept(x, y, z)) continue;
    for (let d = 0; d < 3; d++) for (const s of [0, 1]) {
      const q = [x, y, z]; q[d] += s ? 1 : -1;
      if (kept(...q)) continue;
      const [u, v] = [(d + 1) % 3, (d + 2) % 3], P = (a, b) => { const p = [x, y, z]; p[d] += s; p[u] += a; p[v] += b; return p.join(','); };
      quads.push([P(0, 0), P(1, 0), P(1, 1), P(0, 1)]);
    }
  }
  const by = new Map(); quads.forEach((Q, t) => Q.forEach((k) => (by.get(k) ?? by.set(k, []).get(k)).push(t)));
  const N = quads.length, start = new Int32Array(N + 1), list = [], side = [];
  for (let t = 0; t < N; t++) {
    const around = new Map(); for (const k of quads[t]) for (const u of by.get(k)) if (u !== t) around.set(u, (around.get(u) ?? 0) + 1);
    start[t] = list.length;
    for (const u of [...around.keys()].sort((a, b) => a - b)) { list.push(u); side.push(around.get(u) >= 2 ? 1 : 0); }
  }
  start[N] = list.length;
  return { W: 1, row: N, n: N, start, list: Int32Array.from(list), side: Uint8Array.from(side), per: 1 };
}

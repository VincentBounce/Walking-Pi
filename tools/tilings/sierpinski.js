// Sierpiński's tetrahedron as main.js builds it (sierpinskiMesh: 4^L tetrahedra, each face 3 × 3 triangles), and its grid
// for the searches: each triangle's neighbours, those sharing a corner with it
export function sierpinskiGrid(L) {
  let tets = [[[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]];
  for (let k = 0; k < L; k++) tets = tets.flatMap((T) => T.map((a) => T.map((b) => [0, 1, 2].map((d) => (a[d] + b[d]) / 2))));
  const tris = [], f = 3, key = (p) => p.map((v) => Math.round(v * 1e6)).join(',');
  for (const T of tets) for (const skip of [0, 1, 2, 3]) {
    const [A, B, C] = T.filter((_, i) => i !== skip), at = ([i, j]) => key([0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f));
    for (let i = 0; i < f; i++) for (let j = 0; i + j < f; j++) {
      tris.push([[i, j], [i + 1, j], [i, j + 1]].map(at));
      if (i + j < f - 1) tris.push([[i + 1, j], [i + 1, j + 1], [i, j + 1]].map(at));
    }
  }
  const by = new Map(); tris.forEach((Q, t) => Q.forEach((k) => (by.get(k) ?? by.set(k, []).get(k)).push(t)));
  const N = tris.length, start = new Int32Array(N + 1), list = [], side = [];
  for (let t = 0; t < N; t++) {
    const around = new Map(); for (const k of tris[t]) for (const u of by.get(k)) if (u !== t) around.set(u, (around.get(u) ?? 0) + 1);
    start[t] = list.length;
    for (const u of [...around.keys()].sort((a, b) => a - b)) { list.push(u); side.push(around.get(u) >= 2 ? 1 : 0); }
  }
  start[N] = list.length;
  const mids = tris.map((Q) => [0, 1, 2].map((d) => Q.reduce((m, k) => m + Number(k.split(',')[d]) / 1e6, 0) / 3));  // (each one's middle)
  return { W: 1, row: N, n: N, start, list: Int32Array.from(list), side: Uint8Array.from(side), per: 1, mids };
}

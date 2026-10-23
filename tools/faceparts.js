// The solids' faces dealt out whole (see FACE_GROUPS in main.js): in the page's console, after loading this file,
//   faceParts()  → the table, as main.js has it (FACE_GROUPS)
// For each solid of FACE_MIDDLES (cube, tetra, octa, icosa, dodeca) and each count K of colours that divides its faces:
// its faces in K groups, each in one piece (faces sharing an edge), all alike (a turn of the solid takes one to another,
// and the turns that keep the partition take any group to any other); of these, the one the most turns keep, then the
// fewest edges between groups. Each group's patch face: of the faces nearest its middle, the ones that set the patches
// furthest apart (the nearest two as far as can be, then all of them). Colours by their groups' smallest face.
window.faceParts = () => {
  const table = {};
  for (const solid of ['cube', 'tetra', 'octa', 'icosa', 'dodeca']) {
    const mids = FACE_MIDDLES[solid](), F = mids.length, cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const close = Math.max(...mids.flatMap((m, i) => mids.filter((_, j) => j !== i).map((n) => dot3(m, n))));
    const adj = mids.map((m, i) => mids.map((n, j) => (i !== j && dot3(m, n) > close - 1e-9 ? j : -1)).filter((j) => j >= 0));
    // the turns of the solid, as permutations of its faces: face 0 and a neighbour to any face and a neighbour of it
    const frame = (a, b) => { const x = mids[a], y = unit(cross3(x, mids[b])); return [x, y, cross3(x, y)]; };
    const A = frame(0, adj[0][0]), turns = [];
    for (let a = 0; a < F; a++) for (const b of adj[a]) {
      const B = frame(a, b), M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => A.reduce((s, _, k) => s + B[k][i] * A[k][j], 0)));
      const perm = mids.map((m) => { const q = M.map((r) => dot3(r, m)); return mids.findIndex((n) => dot3(n, q) > 1 - 1e-9); });
      if (!perm.includes(-1)) turns.push(perm);
    }
    table[solid] = {};
    for (let K = 2; K <= 12; K++) {
      if (F % K) continue;
      const m = F / K, seen = new Set(), found = new Set();
      let best = null;
      const keyOf = (parts) => parts.map((p) => p.join(',')).sort().join('|');
      const consider = (parts) => {
        const key = keyOf(parts);
        if (found.has(key)) return;
        found.add(key);
        const same = (p, q) => p.length === q.length && p.every((f, i) => f === q[i]);
        const image = (r, p) => p.map((f) => r[f]).sort((x, y) => x - y);
        const keep = turns.filter((r) => parts.every((p) => parts.some((q) => same(image(r, p), q))));
        const reach = new Set([0]);
        for (let grew = true; grew;) { grew = false; for (const r of keep) for (const i of [...reach]) { const j = parts.findIndex((q) => same(image(r, parts[i]), q)); if (!reach.has(j)) { reach.add(j); grew = true; } } }
        if (reach.size < parts.length) return;
        const group = new Array(F); parts.forEach((p, i) => p.forEach((f) => (group[f] = i)));
        const cut = adj.reduce((s, a, f) => s + a.filter((g) => group[g] !== group[f]).length, 0) / 2;
        if (!best || keep.length > best.keep || (keep.length === best.keep && cut < best.cut)) best = { parts, keep: keep.length, cut };
      };
      const cover = (S) => {  // every way to deal all the faces out in copies of S
        const copies = [...new Set(turns.map((r) => S.map((f) => r[f]).sort((x, y) => x - y).join(',')))].map((s) => s.split(',').map(Number));
        const used = new Array(F).fill(false), pick = [];
        const solve = () => {
          const f = used.indexOf(false);
          if (f < 0) { consider(pick.map((p) => p.slice())); return; }
          for (const c of copies) if (c.includes(f) && c.every((g) => !used[g])) { c.forEach((g) => (used[g] = true)); pick.push(c); solve(); pick.pop(); c.forEach((g) => (used[g] = false)); }
        };
        solve();
      };
      const grow = (set) => {  // the pieces of m faces holding face 0
        if (set.length === m) { const key = [...set].sort((x, y) => x - y).join(','); if (!seen.has(key)) { seen.add(key); cover(set); } return; }
        for (const g of new Set(set.flatMap((f) => adj[f]))) if (!set.includes(g)) grow([...set, g]);
      };
      grow([0]);
      if (!best) continue;
      const parts = best.parts.map((p) => p.slice().sort((x, y) => x - y)).sort((p, q) => p[0] - q[0]);
      // the patch faces: of each group's faces nearest its middle, the choice that sets them furthest apart
      const options = parts.map((p) => {
        const c = unit([0, 1, 2].map((d) => p.reduce((s, f) => s + mids[f][d], 0))), top = Math.max(...p.map((f) => dot3(mids[f], c)));
        return p.filter((f) => dot3(mids[f], c) > top - 1e-9);
      });
      let patch = null, score = null;
      const choose = (i, at) => {
        if (i === options.length) {
          const dots = at.flatMap((f, a) => at.slice(a + 1).map((g) => dot3(mids[f], mids[g]))), sc = [Math.max(-1, ...dots), dots.reduce((x, y) => x + y, 0)];
          if (!score || sc[0] < score[0] - 1e-9 || (sc[0] < score[0] + 1e-9 && sc[1] < score[1] - 1e-9)) { score = sc; patch = at.slice(); }
          return;
        }
        for (const f of options[i]) choose(i + 1, [...at, f]);
      };
      choose(0, []);
      const group = new Array(F); parts.forEach((p, i) => p.forEach((f) => (group[f] = i)));
      table[solid][K] = [group.map((g) => g.toString(36)).join(''), patch.map((f) => f.toString(36)).join('')];
    }
  }
  return `const FACE_GROUPS = {\n${Object.entries(table).map(([solid, ks]) => `  ${solid}: { ${Object.entries(ks).map(([K, [g, p]]) => `${K}: ['${g}', '${p}']`).join(', ')} },`).join('\n')}\n};`;
};

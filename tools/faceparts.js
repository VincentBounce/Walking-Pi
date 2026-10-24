// The solids' colourings dealt out by their faces or spots (see FACE_GROUPS and SPOT_PAIRS in main.js): in the page's
// console, after loading this file,
//   faceParts()  → the two tables, as main.js has them
// FACE_GROUPS: for each solid of FACE_MIDDLES (cube, tetra, octa, icosa, dodeca) and each count K of colours that divides
// its faces (the solids of squares and triangles: by their faces' kinds instead, see hullColourings in main.js): its faces in K groups, each in one piece (faces sharing an edge), all alike (a turn of the solid takes one to
// another, and the turns that keep the partition take any group to any other); of these, the one the most turns keep,
// then the fewest edges between groups. Where K is half its faces and each face has one opposite: also its mirror, each
// colour two opposite faces.
// SPOT_PAIRS: a solid's 2K spots (SOLID_SPOTS: its corners, edges' middles, the stella's hollows), each opposite another,
// K not dealt out by faces nor spots of its own: each colour two spots side by side (the nearest), the pairing the most
// turns keep; and its mirror, each colour two opposite spots.
// Each colour's patch (face or spot): of each group's nearest its middle, those that touch the fewest (side by side),
// then set the patches furthest apart (the nearest two as far as can be, then all of them; no draughtboard on the
// icosahedron: at most 8 of its faces touch none). Colours by their groups' smallest face or spot; base 36.
window.faceParts = () => {
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nearest = (dirs) => { const close = Math.max(...dirs.flatMap((m, i) => dirs.filter((_, j) => j !== i).map((n) => dot3(m, n)))); return dirs.map((m, i) => dirs.map((n, j) => (i !== j && dot3(m, n) > close - 1e-9 ? j : -1)).filter((j) => j >= 0)); };
  // the turns of a solid, as matrices: its face 0 and a neighbour to any face and a neighbour of it (the stella's, the cuboctahedron's: the cube's)
  const turnsOf = (solid) => {
    const mids = FACE_MIDDLES[solid === 'stella' ? 'cube' : solid](), adj = nearest(mids), frame = (a, b) => { const x = mids[a], y = unit(cross3(x, mids[b])); return [x, y, cross3(x, y)]; };
    const A = frame(0, adj[0][0]), out = [];
    for (let a = 0; a < mids.length; a++) for (const b of adj[a]) { const B = frame(a, b); out.push([0, 1, 2].map((i) => [0, 1, 2].map((j) => A.reduce((s, _, k) => s + B[k][i] * A[k][j], 0)))); }
    return out;
  };
  const permsOf = (turns, dirs) => turns.map((M) => dirs.map((m) => { const q = M.map((r) => dot3(r, m)); return dirs.findIndex((n) => dot3(n, q) > 1 - 1e-9); })).filter((p) => !p.includes(-1));
  const same = (p, q) => p.length === q.length && p.every((f, i) => f === q[i]);
  const image = (r, p) => p.map((f) => r[f]).sort((x, y) => x - y);
  const keptBy = (perms, parts) => perms.filter((r) => parts.every((p) => parts.some((q) => same(image(r, p), q))));
  const transitive = (keep, parts) => {
    const reach = new Set([0]);
    for (let grew = true; grew;) { grew = false; for (const r of keep) for (const i of [...reach]) { const j = parts.findIndex((q) => same(image(r, parts[i]), q)); if (!reach.has(j)) { reach.add(j); grew = true; } } }
    return reach.size === parts.length;
  };
  // a partition as written: each item's colour, each colour's patch (see above)
  const written = (dirs, adj, parts) => {
    parts = parts.map((p) => p.slice().sort((x, y) => x - y)).sort((p, q) => p[0] - q[0]);
    const options = parts.map((p) => {
      const s = [0, 1, 2].map((d) => p.reduce((sum, f) => sum + dirs[f][d], 0));
      if (Math.hypot(...s) < 1e-9) return p;  // (two opposite: either)
      const c = unit(s), top = Math.max(...p.map((f) => dot3(dirs[f], c)));
      return p.filter((f) => dot3(dirs[f], c) > top - 1e-9);
    });
    let patch = null, score = null;
    const choose = (i, at) => {
      if (i === options.length) {
        const dots = at.flatMap((f, a) => at.slice(a + 1).map((g) => dot3(dirs[f], dirs[g])));
        const sc = [at.reduce((n, f, a) => n + at.slice(a + 1).filter((g) => adj[f].includes(g)).length, 0), Math.max(-1, ...dots), dots.reduce((x, y) => x + y, 0)];
        const k = score ? sc.findIndex((x, j) => Math.abs(x - score[j]) > 1e-9) : 0;  // (the first that differs decides)
        if (!score || (k >= 0 && sc[k] < score[k])) { score = sc; patch = at.slice(); }
        return;
      }
      for (const f of options[i]) choose(i + 1, [...at, f]);
    };
    choose(0, []);
    const colour = new Array(dirs.length); parts.forEach((p, i) => p.forEach((f) => (colour[f] = i)));
    return [colour.map((g) => g.toString(36)).join(''), patch.map((f) => f.toString(36)).join('')];
  };
  const opposites = (dirs) => { const o = dirs.map((d) => dirs.findIndex((e) => dot3(d, e) < -1 + 1e-9)); return o.includes(-1) ? null : o.map((j, i) => [i, j]).filter(([i, j]) => i < j); };
  const faces = {}, spots = {};
  for (const solid of ['cube', 'tetra', 'octa', 'icosa', 'dodeca']) {
    const mids = FACE_MIDDLES[solid]().map(unit), F = mids.length, adj = nearest(mids), perms = permsOf(turnsOf(solid), mids);
    faces[solid] = {};
    for (let K = 2; K <= 12; K++) {
      if (F % K) continue;
      const m = F / K, seen = new Set(), found = new Set();
      let best = null;
      const consider = (parts) => {
        const key = parts.map((p) => p.join(',')).sort().join('|');
        if (found.has(key)) return;
        found.add(key);
        const keep = keptBy(perms, parts);
        if (!transitive(keep, parts)) return;
        const group = new Array(F); parts.forEach((p, i) => p.forEach((f) => (group[f] = i)));
        const cut = adj.reduce((s, a, f) => s + a.filter((g) => group[g] !== group[f]).length, 0) / 2;
        if (!best || keep.length > best.keep || (keep.length === best.keep && cut < best.cut)) best = { parts, keep: keep.length, cut };
      };
      const cover = (S) => {  // every way to deal all the faces out in copies of S
        const copies = [...new Set(perms.map((r) => image(r, S).join(',')))].map((s) => s.split(',').map(Number));
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
      const pairs = 2 * K === F ? opposites(mids) : null;
      if (!best && pairs) {  // (no piece alike, the cuboctahedron's 7: each colour two faces side by side, the most by an edge, then
        // touching by a corner (faces apart less than a right angle), the pairing the most turns keep; its mirror, two opposite)
        const mate = mids.map(() => -1), close = Math.max(...adj.map((a, f) => dot3(mids[f], mids[a[0]])));
        let side = null;
        const match = () => {
          const f = mate.indexOf(-1);
          if (f < 0) {
            const parts = mids.map((_, g) => g).filter((g) => mate[g] > g).map((g) => [g, mate[g]]), edges = parts.filter(([g, h]) => dot3(mids[g], mids[h]) > close - 1e-9).length, keep = keptBy(perms, parts).length;
            if (!side || edges > side.edges || (edges === side.edges && keep > side.keep)) side = { parts, edges, keep };
            return;
          }
          for (let g = 0; g < F; g++) if (g !== f && mate[g] < 0 && dot3(mids[f], mids[g]) > 1e-9) { mate[f] = g; mate[g] = f; match(); mate[f] = mate[g] = -1; }
        };
        match();
        faces[solid][K] = [...written(mids, adj, side.parts), ...written(mids, adj, pairs)];
        continue;
      }
      if (!best) continue;
      faces[solid][K] = [...written(mids, adj, best.parts), ...(pairs ? written(mids, adj, pairs) : [])];
    }
  }
  for (const solid of ['cube', 'tetra', 'octa', 'icosa', 'dodeca', 'stella']) {
    const own = SOLID_SPOTS[solid]();
    for (const [n, list] of Object.entries(own)) {
      const K = n / 2, dirs = list.map(unit), pairs = opposites(dirs);
      if (K < 2 || own[K] || faces[solid]?.[K] || !pairs) continue;
      const adj = nearest(dirs), perms = permsOf(turnsOf(solid), dirs), mate = dirs.map(() => -1);
      let best = null;
      const match = () => {  // every pairing of the spots side by side
        const i = mate.indexOf(-1);
        if (i < 0) {
          const parts = dirs.map((_, a) => a).filter((a) => mate[a] > a).map((a) => [a, mate[a]]), keep = keptBy(perms, parts);
          if (transitive(keep, parts) && (!best || keep.length > best.keep)) best = { parts, keep: keep.length };
          return;
        }
        for (const j of adj[i]) if (mate[j] < 0) { mate[i] = j; mate[j] = i; match(); mate[i] = mate[j] = -1; }
      };
      match();
      if (best) (spots[solid] ??= {})[K] = [...written(dirs, adj, best.parts), ...written(dirs, adj, pairs)];
    }
  }
  const lines = (table) => Object.entries(table).map(([solid, ks]) => `  ${solid}: { ${Object.entries(ks).map(([K, t]) => `${K}: [${t.map((x) => `'${x}'`).join(', ')}]`).join(', ')} },`).join('\n');
  return `const FACE_GROUPS = {\n${lines(faces)}\n};\nconst SPOT_PAIRS = {\n${lines(spots)}\n};`;
};

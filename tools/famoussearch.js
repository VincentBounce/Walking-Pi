// Famous patterns for a rule on a grid, in the app's page (its rules, letters and neighbours): paste or fetch, then
//   FS.run('tri', 'B3/S23', { trials: 200 })  → { ships, oscs, meths } as RLE (the app's plane coordinates)
// Small random starts on a torus; what they leave, run alone: a ship if it comes back moved, an oscillator if in place;
// the smallest starts that run longest before repeating, methuselahs.
(() => {
  const PER = PER_RHOMBUS;  // the app's: cells a step along a row (patterns move by whole rhombi, Cairo squares, a tiling's lattice cells)
  let seed = 1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const hash = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; };
  function grid(kind, W, rule) {
    const R = parseRule(rule), nb = planeNeighbours(kind, W, true, R.iso === 'hensel'), row = planeRow(kind, W);
    return { kind, W, row, n: row * W, start: nb.start, list: nb.list, ring: R.iso ? nb.ring : null, R, per: PER[kind] ?? 1 };
  }
  function step(G, a, b) {
    const { start, list, ring, R: { B, S, C } } = G, Rw = ring ? ring.length / G.n : 0;
    let any = 0;
    for (let t = 0; t < G.n; t++) {
      const s = a[t];
      let v;
      if (s > 1) v = s + 1 < C ? s + 1 : 0;
      else {
        let c = 0;
        if (ring) { for (let q = 0; q < Rw; q++) { const u = ring[Rw * t + q]; if (u >= 0 && a[u] === 1) c |= 1 << q; } c += 16; }
        else for (let q = start[t]; q < start[t + 1]; q++) if (a[list[q]] === 1) c++;
        v = s ? (S[c] ? 1 : C > 2 ? 2 : 0) : B[c] ? 1 : 0;
      }
      b[t] = v;
      any += v !== 0;
    }
    return any;
  }
  function components(G, a) {
    const seen = new Uint8Array(G.n), out = [];
    for (let t0 = 0; t0 < G.n; t0++) {
      if (!a[t0] || seen[t0]) continue;
      const comp = [t0];
      seen[t0] = 1;
      for (let i = 0; i < comp.length; i++) for (let q = G.start[comp[i]]; q < G.start[comp[i] + 1]; q++) { const u = G.list[q]; if (a[u] && !seen[u]) { seen[u] = 1; comp.push(u); } }
      out.push(comp);
    }
    return out;
  }
  // cells unwrapped and moved to their first rhombus and row (Cairo: an even square), [x, y, s], and where they were
  function normal(G, a, ts) {
    let cells = ts.map((t) => [t % G.row, Math.floor(t / G.row), a[t]]);
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    if (Math.max(...ys) - Math.min(...ys) > G.W / 2) cells = cells.map(([x, y, s]) => [x, y < G.W / 2 ? y + G.W : y, s]);
    if (Math.max(...xs) - Math.min(...xs) > G.row / 2) cells = cells.map(([x, y, s]) => [x < G.row / 2 ? x + G.row : x, y, s]);
    const i0 = Math.floor(Math.min(...cells.map((c) => c[0])) / G.per);
    let y0 = Math.min(...cells.map((c) => c[1]));
    if (G.kind === 'cairo' && (i0 + y0) & 1) y0--;
    cells = cells.map(([x, y, s]) => [x - G.per * i0, y - y0, s]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    return { cells, at: [i0, y0], key: cells.map((c) => c.join(',')).join(';') };
  }
  const place = (G, cells) => {
    const a = new Uint8Array(G.n), i = Math.floor(G.row / G.per / 3), ox = G.per * i, oy = ((G.W >> 1) & ~1) + (G.kind === 'cairo' ? i & 1 : 0);  // (Cairo: an even square)
    for (const [x, y, s] of cells) a[((oy + y) % G.W) * G.row + ((ox + x) % G.row)] = s;
    return a;
  };
  function behaviour(G, cells, gens = 300) {
    let a = place(G, cells), b = new Uint8Array(G.n);
    const first = normal(G, a, [...a.keys()].filter((t) => a[t]));
    for (let g = 1; g <= gens; g++) {
      if (!step(G, a, b)) return null;
      [a, b] = [b, a];
      const live = [...a.keys()].filter((t) => a[t]);
      if (live.length > 4 * cells.length + 40) return null;
      const now = normal(G, a, live);
      if (now.key === first.key) {
        const d = [now.at[0] - first.at[0], now.at[1] - first.at[1]];
        return { kind: d[0] || d[1] ? 'ship' : g > 1 ? 'osc' : 'still', period: g, move: d };
      }
    }
    return null;
  }
  const rle = (cells) => {
    const h = Math.max(...cells.map((c) => c[1])) + 1, rows = [];
    for (let y = 0; y < h; y++) {
      const xs = cells.filter((c) => c[1] === y), w = xs.length ? Math.max(...xs.map((c) => c[0])) + 1 : 0, line = [];
      for (let x = 0; x < w; x++) { const c = xs.find((q) => q[0] === x); line.push(c ? String.fromCharCode(64 + c[2]) : '.'); }
      let s = '', i = 0;
      while (i < line.length) { let j = i; while (j < line.length && line[j] === line[i]) j++; s += (j - i > 1 ? j - i : '') + line[i]; i = j; }
      rows.push(s);
    }
    return rows.join('$').replace(/\$\$+/g, (m) => `${m.length}$`) + '!';
  };
  // the starts: r rows × w rhombi at density d; more than one call can share the work (from: the first trial)
  function run(kind, rule, { W = 40, trials = 200, from = 0, r = 3, w = 3, d = 0.5, gens = 500 } = {}) {
    const G = grid(kind, W, rule), found = new Map(), starts = [];
    for (let i = 0; i < trials; i++) {
      seed = 1000 + 7919 * (from + i);
      const init = [];
      for (let y = 0; y < r; y++) for (let x = 0; x < G.per * w; x++) if (rnd() < d) init.push([x, y, 1]);
      if (!init.length) continue;
      let a = place(G, init), b = new Uint8Array(G.n), life = gens, big = false;
      const seen = new Map();
      for (let g = 1; g <= gens; g++) {
        if (!step(G, a, b)) { life = g; break; }
        [a, b] = [b, a];
        let pop = 0;
        for (let t = 0; t < G.n; t++) pop += a[t] === 1;
        if (pop > 0.2 * G.n) { big = true; break; }
        const h = hash(a);
        if (seen.has(h)) { life = seen.get(h); break; }
        seen.set(h, g);
      }
      if (big) continue;
      starts.push({ rle: rle(init), n: init.length, life });
      for (const comp of components(G, a)) {
        if (comp.length > 40) continue;
        const { cells, key } = normal(G, a, comp);
        if (found.has(key)) { found.get(key).count++; continue; }
        found.set(key, { cells, rle: rle(cells), count: 1, ...(behaviour(G, cells) ?? { kind: 'other' }) });
      }
    }
    const f = [...found.values()];
    return { ships: f.filter((x) => x.kind === 'ship'), oscs: f.filter((x) => x.kind === 'osc'), starts };
  }
  // A methuselah's lifetime as Life counts it: the generation its debris settle (repeat), the ships flying off left out.
  // Every 10 generations, a small group with no other cell within 12 steps that, run alone, comes back moved (a ship) is
  // taken off once it is out of the box of all the rest and flying away from it (it can meet nothing any more).
  // Resumable: settleStart(...) then settleRun(job, ms) until job.done
  function settleStart(kind, rule, rle, W) {
    const G = grid(kind, W, rule), cells = [...populationOf(`0,0:${rle}`)].map(([k, v]) => [...cellXY(k), v]);
    const a = new Uint8Array(G.n), i = Math.floor(G.row / G.per / 2), ox = G.per * i, oy = ((G.W >> 1) & ~1) + (kind === 'cairo' ? i & 1 : 0);
    for (const [x, y, v] of cells) a[(oy + y) * G.row + ox + x] = v;
    return { G, a, b: new Uint8Array(G.n), g: 0, seen: new Map(), ships: 0, known: new Map(), done: null };
  }
  function isolated(G, a, comp, k = 12) {
    const mine = new Set(comp), dist = new Map(comp.map((t) => [t, 0])), queue = [...comp];
    for (let q = 0; q < queue.length; q++) {
      const t = queue[q], d = dist.get(t);
      if (d >= k) continue;
      for (let j = G.start[t]; j < G.start[t + 1]; j++) {
        const u = G.list[j];
        if (dist.has(u)) continue;
        if (a[u] && !mine.has(u)) return false;
        dist.set(u, d + 1);
        queue.push(u);
      }
    }
    return true;
  }
  // a ship's cells out of the box of the other live cells (world units, 2 cells' room) on a side it flies towards
  const middle = (G, t) => cellMiddle(G.kind, t % G.row, Math.floor(t / G.row));
  function flyingOff(G, a, comp, [di, dj]) {
    const mine = new Set(comp), box = [Infinity, Infinity, -Infinity, -Infinity];
    for (let t = 0; t < G.n; t++) if (a[t] && !mine.has(t)) { const [u, v] = middle(G, t); box[0] = Math.min(box[0], u); box[1] = Math.min(box[1], v); box[2] = Math.max(box[2], u); box[3] = Math.max(box[3], v); }
    const o = cellMiddle(G.kind, 0, 0), m = cellMiddle(G.kind, G.per * di, dj), vel = [m[0] - o[0], m[1] - o[1]];
    const c = comp.map((t) => middle(G, t)), lo = [0, 1].map((d) => Math.min(...c.map((p) => p[d]))), hi = [0, 1].map((d) => Math.max(...c.map((p) => p[d])));
    return [0, 1].some((d) => (lo[d] > box[2 + d] + 2 && vel[d] > 1e-9) || (hi[d] < box[d] - 2 && vel[d] < -1e-9));
  }
  const touchesEdge = (G, a) => { for (let t = 0; t < G.n; t++) { if (!a[t]) continue; const x = t % G.row, y = Math.floor(t / G.row); if (y < 3 || y >= G.W - 3 || x < 3 * G.per || x >= G.row - 3 * G.per) return true; } return false; };
  function settleRun(job, ms = 20000) {
    const { G } = job, t0 = performance.now();
    while (!job.done && performance.now() - t0 < ms) {
      if (!step(G, job.a, job.b)) { job.g++; job.done = `dies at generation ${job.g}`; break; }
      [job.a, job.b] = [job.b, job.a];
      job.g++;
      if (job.g % 10 === 0) for (const comp of components(G, job.a)) {
        if (comp.length > 40 || !isolated(G, job.a, comp)) continue;
        const { cells, key } = normal(G, job.a, comp);
        if (!job.known.has(key)) { const b = behaviour(G, cells, 120); job.known.set(key, b?.kind === 'ship' ? b.move : null); }
        const move = job.known.get(key);
        if (!move || !flyingOff(G, job.a, comp, move)) continue;
        for (const t of comp) job.a[t] = 0;
        job.ships++;
        job.seen.clear();
      }
      if (job.g % 10 === 0 && touchesEdge(G, job.a)) { job.done = `reaches the grid's edges at generation ${job.g}`; break; }  // (else what comes round would count)
      const h = hash(job.a);
      if (job.seen.has(h)) { job.done = `settles at generation ${job.seen.get(h)} (period ${job.g - job.seen.get(h)}, ${job.ships} ships off)`; job.T = job.seen.get(h); break; }
      job.seen.set(h, job.g);
      if (job.g > 50000) job.done = 'still going at 50,000';
    }
    return { g: job.g, done: job.done, ships: job.ships };
  }
  window.FS = { run, grid, behaviour, normal, step, rle, settleStart, settleRun };
})();

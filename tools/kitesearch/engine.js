// Rule search on kites (Generations B/S/C, 9 neighbours), with Deno (deno.com), from this folder:
//   deno run --allow-read --allow-write stage1.js                  27,648 rules' soups → stage1.json
//   deno run --allow-read --allow-write filter.js                  the Life-like ones → good1.json
//   deno run --allow-read --allow-write stage2.js good1.json 36 24 stage2.json   their small starts: ships, oscillators (ships.js stage2.json: the rules with ships)
//   deno run --allow-read --allow-write famous.js rules.json famous.json && deno run --allow-read --allow-write pick.js
//   deno run --allow-read --allow-write traces.js rules.json 24 12 traces.json && deno run --allow-read --allow-write rank.js traces.json   soups followed, scored against Life's
// The engine: a soup until it repeats, small starts and what they leave, a pattern alone (a ship: back moved)
// a rule's counts: B and S by c live neighbours and k of them by a corner only (c·4 + k); a digit alone, any k; a digit and
// letters (a, b, c, d: 0, 1, 2, 3 by a corner), those k only (the flowers' letters: B3a, born with 3 all by a side)
const parse = (rule) => {
  const m = rule.match(/B([\da-d]*)\/S([\da-d]*)(?:\/C(\d+))?/), B = new Uint8Array(40), S = new Uint8Array(40);
  for (const [X, text] of [[B, m[1]], [S, m[2]]]) for (const [, d, ls] of text.matchAll(/(\d)([a-d]*)/g)) for (let k = 0; k < 4; k++) if (!ls || ls.includes('abcd'[k])) X[4 * d + k] = 1;
  return { B, S, C: Number(m[3] ?? 2) };
};
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
function step(a, b, start, list, B, S, C, side = null) {  // side: each neighbour by a side (1) or a corner only (0)
  let pop = 0, any = 0;
  const n = a.length;
  for (let t = 0; t < n; t++) {
    const s = a[t];
    let v;
    if (s === 0 || s === 1) {
      let c = 0, k = 0;
      for (let q = start[t]; q < start[t + 1]; q++) if (a[list[q]] === 1) { c++; if (side && !side[q]) k++; }
      const i = 4 * c + Math.min(k, 3);
      v = s === 0 ? B[i] : S[i] ? 1 : C > 2 ? 2 : 0;
    } else v = s + 1 < C ? s + 1 : 0;
    b[t] = v;
    if (v === 1) pop++;
    if (v) any++;
  }
  return [pop, any];
}
const hash = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; };
// a soup at density d on the small grid: when it settles (repeats with period ≤ 60), what is left
function soup(G, rule, d = 0.35, gens = 1500) {
  const { B, S, C } = parse(rule), n = G.n;
  seed = 7;
  let a = new Uint8Array(n).map(() => (rnd() < d ? 1 : 0)), b = new Uint8Array(n);
  const seen = new Map();
  let maxRho = 0, rho = 0, T = gens, period = 0, end = 'running';
  for (let g = 1; g <= gens; g++) {
    const [pop, any] = step(a, b, G.start, G.list, B, S, C, G.side);
    [a, b] = [b, a];
    rho = pop / n;
    if (g > 30) maxRho = Math.max(maxRho, rho);
    if (!any) { T = g; end = 'dies'; break; }
    if (rho > 0.5) { T = g; end = 'explodes'; break; }
    if (g === 300 && rho > 0.15) { T = g; end = 'chaos'; break; }  // Life-like ash is a few %
    const h = hash(a);
    if (seen.has(h) && g - seen.get(h) <= 60) { T = g; period = g - seen.get(h); end = 'settles'; break; }
    seen.set(h, g);
  }
  return { rule, T, rho, maxRho, period, end };
}
// cells (non-zero) of a grid as [x, y, state], the ones of t's component (through neighbours)
const coords = (G, t) => [t % G.row, Math.floor(t / G.row)];
function components(G, a) {
  const seen = new Uint8Array(G.n), out = [];
  for (let t0 = 0; t0 < G.n; t0++) {
    if (!a[t0] || seen[t0]) continue;
    const comp = [t0];
    seen[t0] = 1;
    for (let i = 0; i < comp.length; i++) {
      const t = comp[i];
      for (let q = G.start[t]; q < G.start[t + 1]; q++) { const u = G.list[q]; if (a[u] && !seen[u]) { seen[u] = 1; comp.push(u); } }
    }
    out.push(comp);
  }
  return out;
}
// a component's cells, unwrapped (the torus) and moved to its first rhombus (a tiling: lattice cell, G.per cells) and row: [x, y, s] and where it was
function normal(G, a, comp) {
  let cells = comp.map((t) => [...coords(G, t), a[t]]);
  const ys = cells.map((c) => c[1]), xs = cells.map((c) => c[0]);
  if (Math.max(...ys) - Math.min(...ys) > G.W / 2) cells = cells.map(([x, y, s]) => [x, y < G.W / 2 ? y + G.W : y, s]);
  if (Math.max(...xs) - Math.min(...xs) > G.row / 2) cells = cells.map(([x, y, s]) => [x < G.row / 2 ? x + G.row : x, y, s]);
  const per = G.per ?? 6, y0 = Math.min(...cells.map((c) => c[1])), x0 = per * Math.floor(Math.min(...cells.map((c) => c[0])) / per);
  cells = cells.map(([x, y, s]) => [x - x0, y - y0, s]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  return { cells, at: [x0, y0], key: cells.map((c) => c.join(',')).join(';') };
}
// what a small pattern does alone: a ship (back translated after p), an oscillator (in place), else null
function behaviour(G, rule, cells, gens = 120) {
  const { B, S, C } = parse(rule), n = G.n;
  let a = new Uint8Array(n), b = new Uint8Array(n);
  const per = G.per ?? 6, ox = per * Math.floor(G.row / per / 2), oy = G.W >> 1;
  for (const [x, y, s] of cells) a[((oy + y) % G.W) * G.row + ((ox + x) % G.row)] = s;
  const first = normal(G, a, [...a.keys()].filter((t) => a[t]));
  for (let g = 1; g <= gens; g++) {
    const [, any] = step(a, b, G.start, G.list, B, S, C, G.side);
    [a, b] = [b, a];
    if (!any) return null;
    const live = [...a.keys()].filter((t) => a[t]);
    if (live.length > 4 * cells.length + 40) return null;
    if (components(G, a).length !== 1) continue;
    const now = normal(G, a, live);
    if (now.key === first.key) {
      const dx = ((now.at[0] - first.at[0]) % G.row + G.row + G.row / 2) % G.row - G.row / 2, dy = ((now.at[1] - first.at[1]) % G.W + G.W + G.W / 2) % G.W - G.W / 2;
      return { kind: dx || dy ? 'ship' : g > 1 ? 'osc' : 'still', period: g, move: [dx, dy] };
    }
  }
  return null;
}
// small random starts: r rows × w rhombi (6 kites each) at density d; what they leave (ships, oscillators),
// how long they run (until the grid repeats), how many explode
function seeds(G, rule, trials = 40, from = 0, r = 3, w = 3, d = 0.5, gens = 600) {
  const { B, S, C } = parse(rule), n = G.n, found = new Map(), starts = [];
  let explode = 0;
  for (let i = 0; i < trials; i++) {
    seed = 1000 + 7919 * (from + i);
    let a = new Uint8Array(n), b = new Uint8Array(n);
    const per = G.per ?? 6, ox = per * Math.floor(G.row / per / 2), oy = G.W >> 1, init = [];
    for (let y = 0; y < r; y++) for (let x = 0; x < per * w; x++) if (rnd() < d) { a[(oy + y) * G.row + ox + x] = 1; init.push([x, y, 1]); }
    if (!init.length) continue;
    const seen = new Map();
    let life = gens, big = false;
    for (let g = 1; g <= gens; g++) {
      const [pop, any] = step(a, b, G.start, G.list, B, S, C, G.side);
      [a, b] = [b, a];
      if (!any) { life = g; break; }
      if (pop > 0.2 * n) { big = true; break; }
      const h = hash(a);
      if (seen.has(h)) { life = seen.get(h); break; }
      seen.set(h, g);
    }
    if (big) { explode++; continue; }
    starts.push({ cells: init, life });
    for (const comp of components(G, a)) {
      if (comp.length > 40) continue;
      const { cells, key } = normal(G, a, comp);
      if (found.has(key)) { found.get(key).count++; continue; }
      const what = behaviour(G, rule, cells);
      found.set(key, { cells, count: 1, ...(what ?? { kind: 'other' }) });
    }
  }
  return { rule, explode: explode / trials, starts, found: [...found.values()].filter((f) => f.kind === 'ship' || f.kind === 'osc') };
}

// a soup's whole life: its live share at some generations, when it settles (repeats, any period ≤ 100), the period then
function trace(G, rule, seedv, d = 0.3, gens = 6000, at = [100, 200, 300, 500, 800, 1200]) {
  const { B, S, C } = parse(rule), n = G.n;
  seed = seedv;
  let a = new Uint8Array(n).map(() => (rnd() < d ? 1 : 0)), b = new Uint8Array(n);
  const seen = new Map(), pops = {};
  let T = gens, period = 0, end = 'running', rho = 0;
  for (let g = 1; g <= gens; g++) {
    const [pop, any] = step(a, b, G.start, G.list, B, S, C, G.side);
    [a, b] = [b, a];
    rho = pop / n;
    if (at.includes(g)) pops[g] = rho;
    if (!any) { T = g; end = 'dies'; break; }
    if (rho > 0.5) { T = g; end = 'explodes'; break; }
    const h = hash(a);
    if (seen.has(h) && g - seen.get(h) <= 100) { T = seen.get(h); period = g - seen.get(h); end = 'settles'; break; }
    seen.set(h, g);
  }
  return { T, period, end, rho, pops };
}
// A methuselah's lifetime as Life counts it (as ../famoussearch.js, settleRun): until its debris repeat, the ships flying
// off taken away (every 10 generations, a group of 40 cells or fewer, no other live cell within 12 steps, that alone comes
// back moved, once it is out of the box of all the rest, flying away from it); stopped if it reaches the grid's edges.
// G.mid(t): a cell's middle in world units
function settle(G, rule, cells, cap = 20000) {
  const { B, S, C } = parse(rule), n = G.n, per = G.per ?? 6;
  let a = new Uint8Array(n), b = new Uint8Array(n);
  const ox = per * Math.floor(G.row / per / 2), oy = G.W >> 1;
  for (const [x, y, s] of cells) a[(oy + y) * G.row + ox + x] = s;
  const seen = new Map(), known = new Map();
  let ships = 0;
  const isolated = (comp) => {
    const mine = new Set(comp), dist = new Map(comp.map((t) => [t, 0])), queue = [...comp];
    for (let q = 0; q < queue.length; q++) {
      const t = queue[q], d = dist.get(t);
      if (d >= 12) continue;
      for (let j = G.start[t]; j < G.start[t + 1]; j++) { const u = G.list[j]; if (dist.has(u)) continue; if (a[u] && !mine.has(u)) return false; dist.set(u, d + 1); queue.push(u); }
    }
    return true;
  };
  const vel = ([di, dj]) => { const o = G.mid(0), m = G.mid(((dj % G.W) + G.W) % G.W * G.row + ((per * di) % G.row + G.row) % G.row); return [m[0] - o[0], m[1] - o[1]]; };
  const flyingOff = (comp, move) => {
    const mine = new Set(comp), box = [Infinity, Infinity, -Infinity, -Infinity];
    for (let t = 0; t < n; t++) if (a[t] && !mine.has(t)) { const [u, v] = G.mid(t); box[0] = Math.min(box[0], u); box[1] = Math.min(box[1], v); box[2] = Math.max(box[2], u); box[3] = Math.max(box[3], v); }
    const w = vel(move), c = comp.map((t) => G.mid(t)), lo = [0, 1].map((d) => Math.min(...c.map((p) => p[d]))), hi = [0, 1].map((d) => Math.max(...c.map((p) => p[d])));
    return [0, 1].some((d) => (lo[d] > box[2 + d] + 2 && w[d] > 1e-9) || (hi[d] < box[d] - 2 && w[d] < -1e-9));
  };
  const edge = () => { for (let t = 0; t < n; t++) { if (!a[t]) continue; const x = t % G.row, y = Math.floor(t / G.row); if (y < 3 || y >= G.W - 3 || x < 3 * per || x >= G.row - 3 * per) return true; } return false; };
  for (let g = 1; g <= cap; g++) {
    const [, any] = step(a, b, G.start, G.list, B, S, C, G.side);
    [a, b] = [b, a];
    if (!any) return { end: 'dies', T: g, ships };
    if (g % 10 === 0) {
      for (const comp of components(G, a)) {
        if (comp.length > 40 || !isolated(comp)) continue;
        const { cells: cs, key } = normal(G, a, comp);
        if (!known.has(key)) { const w = behaviour(G, rule, cs, 120); known.set(key, w?.kind === 'ship' ? w.move : null); }
        const move = known.get(key);
        if (!move || !flyingOff(comp, move)) continue;
        for (const t of comp) a[t] = 0;
        ships++;
        seen.clear();
      }
      if (edge()) return { end: 'edge', T: g, ships };
    }
    const h = hash(a);
    if (seen.has(h)) return { end: 'settles', T: seen.get(h), period: g - seen.get(h), ships };
    seen.set(h, g);
  }
  return { end: 'running', T: cap, ships };
}
// A frozen zone woken up: a soup run till it repeats (its ash), then one of the rule's ships set a few of its periods
// upstream of a live cell of it, flying at it; how long till the grid repeats again (period ≤ 100), or cap (endless). From
// generation 40 (it has hit), every 10: a ship flying alone (40 cells or fewer, nothing else within 12 steps) taken away, as
// settle does, so that ships flying round the torus are not a reaction. ships: [{ cells, move }] as seeds finds them.
// Life does it well: a glider in its ash, long reactions
function revive(G, rule, ships, seedv, tries = 2, d = 0.3, cap = 6000) {
  const { B, S, C } = parse(rule), n = G.n, per = G.per ?? 6;
  seed = seedv;
  let a = new Uint8Array(n).map(() => (rnd() < d ? 1 : 0)), b = new Uint8Array(n);
  const known = new Map(), alone = (comp) => {  // (nothing else alive within 12 steps)
    const mine = new Set(comp), dist = new Map(comp.map((t) => [t, 0])), queue = [...comp];
    for (let q = 0; q < queue.length; q++) {
      const t = queue[q], dd = dist.get(t);
      if (dd >= 12) continue;
      for (let j = G.start[t]; j < G.start[t + 1]; j++) { const u = G.list[j]; if (dist.has(u)) continue; if (a[u] && !mine.has(u)) return false; dist.set(u, dd + 1); queue.push(u); }
    }
    return true;
  };
  const run = (limit, strip = false) => {  // till the grid repeats (period ≤ 100): its generation, or limit; -1 if it dies or explodes
    const seen = new Map();
    for (let g = 1; g <= limit; g++) {
      const [pop, any] = step(a, b, G.start, G.list, B, S, C, G.side);
      [a, b] = [b, a];
      if (!any || pop > 0.5 * n) return -1;
      if (strip && g >= 40 && g % 10 === 0) for (const comp of components(G, a)) {
        if (comp.length > 40 || !alone(comp)) continue;
        const { cells: cs, key } = normal(G, a, comp);
        if (!known.has(key)) known.set(key, behaviour(G, rule, cs, 120)?.kind === 'ship');
        if (known.get(key)) { for (const t of comp) a[t] = 0; seen.clear(); }
      }
      const h = hash(a);
      if (seen.has(h) && g - seen.get(h) <= 100) return seen.get(h);
      seen.set(h, g);
    }
    return limit;
  };
  const frozen = run(4000, true);  // (its free ships taken away too: the ash alone)
  if (frozen < 0 || frozen >= 4000) return null;
  const ash = a.slice(), live = [...ash.keys()].filter((t) => ash[t] === 1), out = [];
  if (!live.length) return null;
  for (let k = 0; k < tries; k++) {
    const ship = ships[k % ships.length], [dx, dy] = ship.move, w = Math.max(...ship.cells.map((c) => c[0])) + 1, h = Math.max(...ship.cells.map((c) => c[1])) + 1;
    let placed = false;
    for (let tryAt = 0; tryAt < 60 && !placed; tryAt++) {
      const t = live[Math.floor(rnd() * live.length)], m = 2 + Math.floor(rnd() * 3);  // (2 to 4 of its periods before it)
      const x0 = per * Math.floor((t % G.row - dx * m - w / 2) / per), y0 = Math.floor(t / G.row) - dy * m - (h >> 1);
      const at = (x, y) => ((((y0 + y) % G.W) + G.W) % G.W) * G.row + ((((x0 + x) % G.row) + G.row) % G.row);
      let free = true;  // (its box and a cell round it empty)
      for (let y = -1; y <= h && free; y++) for (let x = -per; x < w + per && free; x++) if (ash[at(x, y)]) free = false;
      if (!free) continue;
      a = ash.slice();
      for (const [x, y, st] of ship.cells) a[at(x, y)] = st;
      placed = true;
    }
    if (!placed) continue;
    out.push(run(cap, true));
  }
  return out;
}
// A battle of 2 colours, as the app plays them (see lifeStep): a soup at d, colour 1 in the left half of the torus, 2 in the
// right; a newborn takes the colour most of its live neighbours have, a tie none; a dying cell keeps its colour (states
// k + 2s). Followed till one colour is left (or none), the grid repeats, or gens: the lead's changes (a colour ahead by
// margin of the live ones, then the other: the turnarounds), the lowest share the colour ahead at the end had since
// generation 50 (its comeback), how long
function battle(G, rule, seedv, d = 0.35, gens = 3000, margin = 0.1) {
  const { B, S, C } = parse(rule), n = G.n, last = 2 * (C - 1);
  seed = seedv;
  let a = new Uint8Array(n), b = new Uint8Array(n);
  for (let t = 0; t < n; t++) if (rnd() < d) a[t] = t % G.row < G.row / 2 ? 1 : 2;
  const seen = new Map(), low = [1, 1, 1];
  let lead = 0, swaps = 0, T = gens, end = 'running', p1 = 0, p2 = 0;
  for (let g = 1; g <= gens; g++) {
    p1 = p2 = 0;
    for (let t = 0; t < n; t++) {
      const was = a[t];
      let now;
      if (was > 2) now = was + 2 <= last ? was + 2 : 0;
      else {
        let c = 0, k = 0, c1 = 0, c2 = 0;
        for (let q = G.start[t]; q < G.start[t + 1]; q++) { const v = a[G.list[q]]; if (v === 1 || v === 2) { c++; if (v === 1) c1++; else c2++; if (G.side && !G.side[q]) k++; } }
        const i = 4 * c + Math.min(k, 3);
        if (was) now = S[i] ? was : C > 2 ? was + 2 : 0;
        else now = !B[i] ? 0 : c1 > c2 ? 1 : c2 > c1 ? 2 : 0;
      }
      b[t] = now;
      if (now === 1) p1++; else if (now === 2) p2++;
    }
    [a, b] = [b, a];
    if (!p1 || !p2) { T = g; end = p1 || p2 ? 'won' : 'dies'; break; }
    const share = p1 / (p1 + p2);
    if (share > 0.5 + margin / 2) { if (lead === 2) swaps++; lead = 1; } else if (share < 0.5 - margin / 2) { if (lead === 1) swaps++; lead = 2; }
    if (g >= 50) { low[1] = Math.min(low[1], share); low[2] = Math.min(low[2], 1 - share); }
    const h = hash(a);
    if (seen.has(h) && g - seen.get(h) <= 100) { T = g; end = 'settles'; break; }
    seen.set(h, g);
  }
  const ahead = p1 > p2 ? 1 : p2 > p1 ? 2 : 0;
  return { T, end, swaps, comeback: ahead ? +low[ahead].toFixed(3) : null };
}
export { parse, step, soup, seeds, behaviour, components, normal, trace, settle, revive, battle };

// Rule search: scores outer-totalistic rules (B…/S…) by how close they behave to Conway's Life.
// Paste in a browser console (or run with node), then: score('B3/S23'), search(['B3/S23', 'B36/S23', …])
// Grid: square (8 neighbours) or hex (6), a torus; change NB for another grid.
const NB = {
  square: [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]],
  hex: [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]],
};
const parse = (rule) => {
  const [, b, s] = rule.match(/B(\d*)\/S(\d*)/i);
  const set = (d) => { const t = new Uint8Array(13); for (const c of d) t[+c] = 1; return t; };
  return { B: set(b), S: set(s) };
};
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// N × N torus, cells 0/1; onGen(g, cells, pop) → false stops
function run(rule, grid, N, cells, gens, onGen) {
  const off = NB[grid], { B, S } = parse(rule);
  let a = cells, b = new Uint8Array(N * N);
  for (let g = 1; g <= gens; g++) {
    let pop = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let n = 0;
      for (const [dx, dy] of off) n += a[((y + dy + N) % N) * N + ((x + dx + N) % N)];
      const v = a[y * N + x] ? S[n] : B[n];
      b[y * N + x] = v; pop += v;
    }
    [a, b] = [b, a];
    if (onGen && onGen(g, a, pop) === false) break;
  }
  return a;
}
const hash = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; };

// 1. Soups: a 50 % soup on a 64 torus. Settled when the board repeats with a period ≤ 30.
//    T: the generation it settles (long = Life-like transients); rho: what is left (Life ≈ 3 %)
function soup(rule, grid, N = 64, gens = 5000) {
  seed = 7;
  const seen = new Map(); let T = gens, rho = 0, period = 0;
  run(rule, grid, N, new Uint8Array(N * N).map(() => (rnd() < 0.5 ? 1 : 0)), gens, (g, a, pop) => {
    rho = pop / (N * N);
    const h = hash(a);
    if (seen.has(h) && g - seen.get(h) <= 30) { T = g; period = g - seen.get(h); return false; }
    seen.set(h, g);
    if (pop === 0) { T = g; return false; }
  });
  return { T, rho, period };
}
// 2. Small seeds: 5 × 5 at 50 % in the middle of a 96 torus. explode: grew past 10 % of the board;
//    gliders: a few cells (< 40) left far from the middle (> 20 cells away): something that travelled
function seeds(rule, grid, trials = 50, N = 96) {
  let explode = 0, gliders = 0, alive = 0;
  for (let i = 0; i < trials; i++) {
    seed = 1000 + 7919 * i;
    const c = new Uint8Array(N * N), m = N / 2;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (rnd() < 0.5) c[(m + y) * N + m + x] = 1;
    let big = false;
    const a = run(rule, grid, N, c, 300, (g, b, pop) => { if (pop > 0.1 * N * N) { big = true; return false; } });
    if (big) { explode++; continue; }
    let far = 0, pop = 0;
    for (let t = 0; t < N * N; t++) if (a[t]) { pop++; if (Math.hypot((t % N) - m - 2, Math.floor(t / N) - m - 2) > 20) far++; }
    if (pop) alive++;
    if (far > 0 && far < 40) gliders++;
  }
  return { explode: explode / trials, gliders: gliders / trials, alive: alive / trials };
}
// 3. Langton's λ: the share of neighbourhoods (with the cell) that give a live cell (Life: 140/512 = 0.273)
function lambda(rule, grid) {
  const n = NB[grid].length, { B, S } = parse(rule), C = (k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
  let live = 0;
  for (let k = 0; k <= n; k++) live += C(k) * (B[k] + S[k]);
  return live / 2 ** (n + 1);
}
// The score, 0 to 1 (Life: 1): each criterion near Life's as measured here, multiplied (one bad one sinks the rule)
//   transients: log T against Life's 2,000; ash: rho against Life's 3.7 %; no explosion; gliders from 1 seed in 10
function score(rule, grid = 'square') {
  const s = soup(rule, grid), p = seeds(rule, grid), l = lambda(rule, grid);
  const near = (x, target, width) => Math.exp(-(((x - target) / width) ** 2));
  const total = near(Math.log10(s.T), 3.3, 0.5) * near(s.rho, 0.037, 0.03) * (1 - p.explode) * (0.5 + 0.5 * Math.min(1, p.gliders / 0.1));
  return { rule, score: +total.toFixed(3), T: s.T, period: s.period, rho: +s.rho.toFixed(3), ...p, lambda: +l.toFixed(3) };
}
// every rule of a list, best first
const search = (rules, grid = 'square') => rules.map((r) => score(r, grid)).sort((a, b) => b.score - a.score);
// all the rules with B3 and up to 3 other digits, say: rules('B3', 3)
function rules(fixedB = 'B', extra = 2, n = 8) {
  const out = [], digits = [...Array(n + 1).keys()];
  for (let m = 0; m < 1 << (2 * (n + 1)); m++) {
    if (digits.reduce((c, d) => c + ((m >> d) & 1) + ((m >> (n + 1 + d)) & 1), 0) > extra + fixedB.length - 1) continue;
    const b = fixedB.slice(1) + digits.filter((d) => (m >> d) & 1 && !fixedB.includes(d)).join(''), s = digits.filter((d) => (m >> (n + 1 + d)) & 1).join('');
    if (!b.includes('0') && !b.includes('1')) out.push(`B${[...new Set(b)].sort().join('')}/S${s}`);
  }
  return [...new Set(out)];
}
if (typeof module !== 'undefined') module.exports = { score, search, rules, soup, seeds, lambda };

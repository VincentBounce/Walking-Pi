'use strict';

/* ------------------------------------------------------------------ *
 * Digit computation in base b (Web Worker, BigInt)                   *
 * A constant c is computed as the integer c·b^(N+G), where G guard   *
 * digits absorb rounding errors; the result is divided by b^G and    *
 * printed with toString(b).                                          *
 * ------------------------------------------------------------------ */
function constantWorker() {
  self.onmessage = (e) => {
    const { id, n, base } = e.data;
    const B = BigInt(base);
    const t0 = performance.now();
    // Large integers (primes): no fractional part. Only the first n digits
    // (the ones the walk uses) are sent back, plus the total digit count.
    const integer = { mersenne: () => (1n << BigInt(e.data.p)) - 1n, primorial, randomPrime }[id];
    if (integer) {
      const N = integer();
      const all = digitString(N, base);
      self.postMessage({ type: 'done', intPart: all.slice(0, n), total: all.length, digits: new Uint8Array(0),
                         decimals: id === 'randomPrime' ? e.data.size : undefined, tests: integer.tests,
                         ms: performance.now() - t0 });
      return;
    }

    function smallPrimes(limit) {
      const composite = new Uint8Array(limit + 1);
      const list = [];
      for (let i = 2; i <= limit; i++) {
        if (composite[i]) continue;
        list.push(i);
        for (let j = i * i; j <= limit; j += i) composite[j] = 1;
      }
      return list;
    }

    // p# ± 1, where p# is the product of all primes ≤ p (multiplied as a balanced product tree)
    function primorial() {
      let level = smallPrimes(e.data.p).map(BigInt);
      while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? level[i] * level[i + 1] : level[i]);
        level = next;
      }
      return level[0] + BigInt(e.data.sign);
    }

    function randomBigInt(below) { // uniform enough in [0, below): 64 extra random bits, then reduce
      const bytes = new Uint8Array(Math.ceil(below.toString(16).length / 2) + 8);
      crypto.getRandomValues(bytes);
      let r = 0n;
      for (const b of bytes) r = (r << 8n) | BigInt(b);
      return r % below;
    }

    function modPow(b, exp, m) {
      let r = 1n;
      b %= m;
      for (const bit of exp.toString(2)) {
        r = (r * r) % m;
        if (bit === '1') r = (r * b) % m;
      }
      return r;
    }

    function millerRabin(nn, a) { // true if nn is a strong probable prime to base a
      let d = nn - 1n, s = 0;
      while ((d & 1n) === 0n) { d >>= 1n; s++; }
      let x = modPow(a, d, nn);
      if (x === 1n || x === nn - 1n) return true;
      for (let i = 1; i < s; i++) {
        x = (x * x) % nn;
        if (x === nn - 1n) return true;
      }
      return false;
    }

    // Random prime with the requested number of decimal digits: pick a random odd start, sieve a
    // window of candidates by small primes, then Miller–Rabin (base 2, then 24 random bases).
    function randomPrime() {
      const size = e.data.size;
      const lo = 10n ** BigInt(size - 1);
      const primes = smallPrimes(20000).slice(1);  // odd primes only
      const expected = size * Math.log(10) * 0.0567;  // ≈ Miller–Rabin tests before a prime shows up
      const W = 8192;
      let start = lo + randomBigInt(9n * lo - 2n * BigInt(W));
      if ((start & 1n) === 0n) start++;
      let tests = 0;
      for (;;) {
        const sieve = new Uint8Array(W);  // candidate j is start + 2j
        for (const q of primes) {
          const r = Number(start % BigInt(q));
          for (let j = ((q - r) * ((q + 1) / 2)) % q; j < W; j += q) sieve[j] = 1;
        }
        for (let j = 0; j < W; j++) {
          if (sieve[j]) continue;
          const c = start + 2n * BigInt(j);
          tests++;
          self.postMessage({ type: 'progress', p: Math.min(0.95, tests / (2 * expected)) });
          if (!millerRabin(c, 2n)) continue;
          let ok = true;
          for (let k = 0; k < 24 && ok; k++) ok = millerRabin(c, 2n + randomBigInt(c - 3n));
          if (ok) {
            randomPrime.tests = tests;
            return c;
          }
        }
        start += 2n * BigInt(W);
      }
    }
    const guard = 30 + Math.ceil(Math.log(n) / Math.log(base));
    const prec = n + guard;
    const S = B ** BigInt(prec);
    const lnS = prec * Math.log(base);
    let done = 0, total = 1;
    const progress = (i) => {
      if (i % 500 === 0) self.postMessage({ type: 'progress', p: (done + i) / total });
    };

    // S·arctan(1/x), or S·artanh(1/x) when hyperbolic
    const atanTerms = (x) => lnS / (2 * Math.log(x));
    function atanInv(x, hyperbolic) {
      const bx = BigInt(x);
      const x2 = bx * bx;
      let term = S / bx;
      let sum = term;
      for (let k = 1; ; k++) {
        term /= x2;
        if (term === 0n) break;
        const t = term / BigInt(2 * k + 1);
        sum += hyperbolic || k % 2 === 0 ? t : -t;
        progress(k);
      }
      done += atanTerms(x);
      return sum;
    }

    // Integer square root (Newton, with recursively doubled precision)
    function isqrt(v) {
      if (v < 1n << 52n) {
        let x = BigInt(Math.floor(Math.sqrt(Number(v))));
        while (x * x > v) x--;
        while ((x + 1n) * (x + 1n) <= v) x++;
        return x;
      }
      const shift = BigInt(Math.floor(v.toString(16).length));  // ≈ bits / 4
      let x = (isqrt(v >> (2n * shift)) + 1n) << shift;
      for (;;) {
        const y = (x + v / x) >> 1n;
        if (y >= x) break;
        x = y;
      }
      while (x * x > v) x--;
      return x;
    }

    // Binary splitting of Σ_{k∈[a,b)} poly(k)·Π_{j=a..k} p(j)/q(j): returns [P, Q, T] with sum = T/Q
    function binarySplit(a, b, p, q, poly) {
      if (b - a === 1) {
        progress(a);
        const P = p(a);
        return [P, q(a), poly(a) * P];
      }
      const m = (a + b) >> 1;
      const [Pl, Ql, Tl] = binarySplit(a, m, p, q, poly);
      const [Pr, Qr, Tr] = binarySplit(m, b, p, q, poly);
      return [Pl * Pr, Ql * Qr, Tl * Qr + Pl * Tr];
    }

    // Same for Brent–McMillan, with p = m², q = k² and the harmonic sum H_k = Σ 1/j:
    // T/Q = Σ Π p/q, C/D = Σ 1/k, V/(Q·D) = Σ (Π p/q)·H_k
    function harmonicSplit(a, b, m2) {
      if (b - a === 1) {
        progress(a);
        const K = BigInt(a);
        return [m2, K * K, m2, K, 1n, m2];
      }
      const mid = (a + b) >> 1;
      const [Pl, Ql, Tl, Dl, Cl, Vl] = harmonicSplit(a, mid, m2);
      const [Pr, Qr, Tr, Dr, Cr, Vr] = harmonicSplit(mid, b, m2);
      return [Pl * Pr, Ql * Qr, Tl * Qr + Pl * Tr, Dl * Dr, Cl * Dr + Dl * Cr,
              Vl * Qr * Dr + Pl * (Cl * Dr * Tr + Dl * Vr)];
    }

    // Integer cube root (same approach as isqrt)
    function icbrt(v) {
      if (v < 1n << 52n) {
        let x = BigInt(Math.round(Math.cbrt(Number(v))));
        while (x * x * x > v) x--;
        while ((x + 1n) ** 3n <= v) x++;
        return x;
      }
      const shift = BigInt(Math.floor((v.toString(16).length * 4) / 6));  // ≈ bits / 6
      let x = (icbrt(v >> (3n * shift)) + 1n) << shift;
      for (;;) {
        const y = (2n * x + v / (x * x)) / 3n;
        if (y >= x) break;
        x = y;
      }
      while (x * x * x > v) x--;
      return x;
    }

    let v;
    switch (id) {
      case 'pi': // Machin: π = 16·arctan(1/5) − 4·arctan(1/239)
        total = atanTerms(5) + atanTerms(239);
        v = 16n * atanInv(5) - 4n * atanInv(239);
        break;
      case 'ln2': // ln 2 = 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749)
        total = atanTerms(26) + atanTerms(4801) + atanTerms(8749);
        v = 18n * atanInv(26, true) - 2n * atanInv(4801, true) + 8n * atanInv(8749, true);
        break;
      case 'e': { // e = Σ 1/k!
        total = 1;
        for (let lf = 0; lf < lnS; total++) lf += Math.log(total);
        let term = S;
        v = S;
        for (let k = 1; term > 0n; k++) {
          term /= BigInt(k);
          v += term;
          progress(k);
        }
        break;
      }
      case 'zeta3': { // Amdeberhan–Zeilberger: ζ(3) = 1/64 Σ (−1)^k (205k²+250k+77)·(k!)^10/((2k+1)!)^5
        total = lnS / Math.log(1024);
        let t = S;
        v = 0n;
        for (let k = 0; t > 0n; k++) {
          const K = BigInt(k);
          const p = (205n * K * K + 250n * K + 77n) * t;
          v += k % 2 ? -p : p;
          t = (t * (K + 1n) ** 5n) / (32n * (2n * K + 3n) ** 5n);
          progress(k);
        }
        v /= 64n;
        break;
      }
      case 'E': { // Erdős–Borwein: E = Σ 1/(2^n − 1) = Σ 2^(−n²)·(2^n + 1)/(2^n − 1)
        v = 0n;
        for (let k = 1; ; k++) {
          const K = BigInt(k);
          const p = 1n << K;
          const t = ((S * (p + 1n)) >> (K * K)) / (p - 1n);
          if (t === 0n) break;
          v += t;
        }
        break;
      }
      case 'phi': v = (S + isqrt(5n * S * S)) / 2n; break;
      case 'sqrt2': case 'sqrt3': case 'sqrt5': case 'sqrt6': case 'sqrt7': case 'sqrt8':
        v = isqrt(BigInt(id.slice(4)) * S * S);
        break;
      case 'cbrt2': v = icbrt(2n * S * S * S); break;
      case 'catalan': { // Lupaș series, by binary splitting:
        // G = 1/18 Σ_{k≥0} (40m²−24m+3) Π_{j=1..k} −32j³(2j−1)/((4j+1)²(4j+3)²), with m = k+1
        const K = Math.ceil(lnS / Math.log(4)) + 10;
        total = K;
        const J = (j) => BigInt(j);
        const [, Q, T] = binarySplit(0, K,
          (j) => (j === 0 ? 1n : -32n * J(j) ** 3n * (2n * J(j) - 1n)),
          (j) => (j === 0 ? 1n : (4n * J(j) + 1n) ** 2n * (4n * J(j) + 3n) ** 2n),
          (k) => 40n * J(k + 1) ** 2n - 24n * J(k + 1) + 3n);
        v = (T * S) / (18n * Q);
        break;
      }
      case 'gamma': { // Brent–McMillan by binary splitting, with m = 2^i·3^j ≥ ln(S)/4 so that ln m is cheap
        let m = Infinity, i2 = 0, j3 = 0;
        for (let i = 0; i < 64; i++) for (let j = 0; j < 40; j++) {
          const c = 2 ** i * 3 ** j;
          if (c >= lnS / 4 + 1 && c < m) { m = c; i2 = i; j3 = j; }
        }
        const K = Math.ceil(3.6 * m) + 10;  // (m^k/k!)² is negligible beyond ≈ 3.59·m
        total = atanTerms(26) + atanTerms(4801) + atanTerms(8749) + atanTerms(5) + K;
        const ln2 = 18n * atanInv(26, true) - 2n * atanInv(4801, true) + 8n * atanInv(8749, true);
        const ln3 = ln2 + 2n * atanInv(5, true);
        const [, Q, T, D, , V] = harmonicSplit(1, K, BigInt(m) * BigInt(m));
        v = (V * S) / (D * (Q + T)) - (BigInt(i2) * ln2 + BigInt(j3) * ln3);
        break;
      }
    }

    self.postMessage({ type: 'progress', p: 1 });
    const s = digitString(v / B ** BigInt(guard), base).padStart(n + 1, '0');
    const intPart = s.slice(0, s.length - n);
    const digits = new Uint8Array(n);
    for (let i = 0; i < n; i++) digits[i] = s.charCodeAt(intPart.length + i) - 48;
    self.postMessage({ type: 'done', intPart, digits, ms: performance.now() - t0 }, [digits.buffer]);
  };
}

/* ------------------------------------------------------------------ *
 * State                                                              *
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const fmt = (v) => v.toLocaleString('en');
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, W (screen y points down)
const H = Math.sqrt(3) / 2;                        // height of a triangle with side 1
const TRI_Y0 = -2 * H / 3;                         // offset that puts the centre of the starting triangle at (0, 0)
const BANDS = 256;
const GRADIENT = Array.from({ length: BANDS }, (_, i) =>
  `hsl(${190 + (200 * i) / (BANDS - 1)}, 85%, 60%)`);
const DIGIT_COLORS = ['#4ea1ff', '#e6edf3', '#ff7b72', '#3fb950', '#d2a8ff', '#ffa657'];
const MONO = '#f0b429';

const CONSTANTS = {
  pi:    { sym: 'π',    name: 'Pi' },
  e:     { sym: 'e',    name: "Euler's number" },
  phi:   { sym: 'φ',    name: 'Golden ratio' },
  ln2:   { sym: 'ln 2', name: 'Natural log of 2' },
  zeta3: { sym: 'ζ(3)', name: "Apéry's constant" },
  E:     { sym: 'E',    name: 'Erdős–Borwein constant' },
  catalan: { sym: 'G',  name: "Catalan's constant" },
  gamma: { sym: 'γ',    name: 'Euler–Mascheroni constant' },
  sqrt2: { sym: '√2',   name: 'Square root of 2', group: 'Roots' },
  sqrt3: { sym: '√3',   name: 'Square root of 3', group: 'Roots' },
  sqrt5: { sym: '√5',   name: 'Square root of 5', group: 'Roots' },
  sqrt6: { sym: '√6',   name: 'Square root of 6', group: 'Roots' },
  sqrt7: { sym: '√7',   name: 'Square root of 7', group: 'Roots' },
  sqrt8: { sym: '√8',   name: 'Square root of 8 (= 2√2)', group: 'Roots' },
  cbrt2: { sym: '∛2',   name: 'Cube root of 2', group: 'Roots' },
  random: { sym: 'rand', name: 'Random digits', group: 'Comparisons' },
  champernowne: { sym: 'C', name: 'Champernowne constant', group: 'Comparisons' },
  fraction: { sym: 'p/q', name: 'Fraction', group: 'Comparisons' },
  mersenne: { sym: 'Mₚ', name: 'Mersenne prime 2ᵖ − 1', group: 'Primes' },
  primorial: { sym: 'p# ± 1', name: 'Primorial prime', group: 'Primes' },
  randomPrime: { sym: 'p', name: 'Random prime', group: 'Primes' },
  primeConst: { sym: 'ρ', name: 'Prime constant (Ulam)', group: 'Primes',
                note: 'digit k = 0 if k is not prime, else k mod b' },
  primeGaps: { sym: 'Δp', name: 'Prime gaps', group: 'Primes',
               note: 'one digit per gap between odd primes: (gap / 2) mod b' },
};

const MODES = {
  turtle:   { base: 3, lattice: 'square',
              rule: 'Base-3 digits on a square grid — <b>0</b> = turn left + step, <b>1</b> = step forward, <b>2</b> = turn right + step' },
  cardinal: { base: 4, lattice: 'square',
              rule: 'Base-4 digits on a square grid — <b>0</b> = step north, <b>1</b> = east, <b>2</b> = south, <b>3</b> = west' },
  spiral:   { base: 2, lattice: 'square', skipZeros: true,
              rule: 'Base-2 digits along a square spiral (Ulam spiral) — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  jump10:   { base: 10, lattice: 'square', points: 'jump',
              rule: 'Base-10 digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  jump64:   { base: 64, lattice: 'square', points: 'jump',
              rule: 'Base-64 digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  search10: { base: 10, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base 10 — cell <b>n</b> is marked when the digits of n appear in the digits of the number' },
  search64: { base: 64, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base 64 — cell <b>n</b> is marked when the base-64 digits of n appear in the base-64 digits of the number' },
  triSpiral: { base: 2, lattice: 'tri', skipZeros: true,
              rule: 'Base-2 digits along a spiral of triangles — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  hexSpiral: { base: 2, lattice: 'hex', skipZeros: true,
              rule: 'Base-2 digits along a spiral of hexagons — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  triLR:    { base: 2, lattice: 'tri',
              rule: 'Base-2 digits on triangle tiles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge' },
  triFixed: { base: 3, lattice: 'tri',
              rule: 'Base-3 digits on triangle tiles — cross the <b>0</b> = horizontal edge, <b>1</b> = “/” edge, <b>2</b> = “\\” edge' },
  hexRel:   { base: 5, lattice: 'hex',
              rule: 'Base-5 digits on hexagonal tiles, relative to the edge you came in through — <b>0</b> = sharp left, <b>1</b> = left, <b>2</b> = straight, <b>3</b> = right, <b>4</b> = sharp right' },
  hexFixed: { base: 6, lattice: 'hex',
              rule: 'Base-6 digits on hexagonal tiles — <b>0</b> = N, <b>1</b> = NE, <b>2</b> = SE, <b>3</b> = S, <b>4</b> = SW, <b>5</b> = NW' },
  sphereLR: { base: 2, lattice: 'sphere', sphere: 'geo', turns: [2, 1],
              rule: 'Base-2 digits on a geodesic sphere of triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  tetraLR:  { base: 2, lattice: 'sphere', sphere: 'tetra', turns: [2, 1],
              rule: 'Base-2 digits on the surface of a tetrahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  cubeFlat: { base: 3, lattice: 'sphere', sphere: 'flat', turns: [3, 2, 1],
              rule: 'Base-3 digits on the surface of a cube — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  cubeSphere: { base: 3, lattice: 'sphere', sphere: 'cube', turns: [3, 2, 1],
              rule: 'Base-3 digits on a cube sphere of squares — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  cubeRel:  { base: 5, lattice: 'cube',
              rule: 'Base-5 digits in 3D cubes, relative to your heading — <b>0</b> = turn left, <b>1</b> = turn up, <b>2</b> = straight, <b>3</b> = turn down, <b>4</b> = turn right' },
  cubeFixed: { base: 6, lattice: 'cube',
              rule: 'Base-6 digits in 3D cubes — <b>0</b> = north, <b>1</b> = east, <b>2</b> = up, <b>3</b> = south, <b>4</b> = west, <b>5</b> = down' },
};

// Exponents p of the known Mersenne primes (from 127 up)
const MERSENNE = [127, 521, 607, 1279, 2203, 2281, 3217, 4253, 4423, 9689, 9941, 11213, 19937, 21701,
  23209, 44497, 86243, 110503, 132049, 216091, 756839, 859433, 1257787, 1398269, 2976221, 3021377,
  6972593, 13466917, 20996011, 24036583, 25964951, 30402457, 32582657, 37156667, 42643801, 43112609,
  57885161, 74207281, 77232917, 82589933, 136279841];

// Primorial primes p# ± 1: values of p from OEIS A005234 (p# + 1) and A006794 (p# − 1),
// starting from p = 379 (smaller ones are too short to be interesting)
const PRIMORIAL_PLUS = [379, 1019, 1021, 2657, 3229, 4547, 4787, 11549, 13649, 18523, 23801, 24029, 42209,
  145823, 366439, 392113, 4328927, 5256037, 6369619, 7351117, 9562633];
const PRIMORIAL_MINUS = [317, 337, 991, 1873, 2053, 2377, 4093, 4297, 4583, 6569, 13033, 15877, 843301,
  1098133, 3267113, 4778027, 6354977, 6533299];
const INTEGER_IDS = ['mersenne', 'primorial', 'randomPrime'];

const cache = {};        // key → { intPart: "10", digits: Uint8Array (fractional part) }
let current = null;      // { head: integer-part digits, digits, mode }
let worker = null;

const walk = {
  n: 0,            // number of steps
  digits: null,    // digit of each step
  xs: null, ys: null,  // screen-plane positions (cell centres) of the n+1 points
  cells: null,     // distinct cells visited up to point i
  maxDist: null,   // max distance up to point i
  base: 3,
  counts: null,    // running count of each digit up to step i (base values per point)
};

let cur = 0;        // steps taken so far
let drawn = 0;      // steps already drawn on the path layer
let playing = false;
let acc = 0;
let needsFull = true;
let statsDirty = true;
let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const view = { scale: 20, ox: 0, oy: 0 };
const cam = { yaw: -0.6, pitch: 0.5 };   // 3D view rotation (radians)
let bounds3 = null;                        // 3D bounding box of points 0..cur

const stage = $('stage');
const layers = {
  grid: $('gridLayer').getContext('2d'),
  path: $('pathLayer').getContext('2d'),
  overlay: $('overlayLayer').getContext('2d'),
};
let cw = 0, ch = 0;

/* ------------------------------------------------------------------ *
 * Computing digits and building the walk                             *
 * ------------------------------------------------------------------ */
function updateRuleText() {
  const { base, rule } = MODES[$('mode').value];
  $('rule').innerHTML = rule;
  $('sCountsLabel').textContent = Array.from({ length: base }, (_, i) => i).join(' / ');
  $('sCountsLabel').hidden = $('sCounts').hidden = base > 6;  // too many digits to list
}

function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(1_000_000, Math.max(10, n || 10));
}

const SUB = (v) => String(v).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);

// Display name and cache key of the selected number
function numberInfo(id) {
  if (id === 'mersenne') {
    const p = $('mersenneP').value;
    return { sym: `M${SUB(p)}`, key: `mersenne${p}`, p: Number(p) };
  }
  if (id === 'primorial') {
    const [p, sign] = $('primorialP').value.split(',');
    return { sym: `${fmt(Number(p))}# ${sign > 0 ? '+' : '−'} 1`, key: `primorial${p}${sign}`,
             p: Number(p), sign: Number(sign) };
  }
  if (id === 'randomPrime') {
    const size = Number($('primeSize').value);
    return { sym: `p${SUB(size)}`, key: null, size };  // never cached: a new prime each time
  }
  if (id === 'fraction') {
    const txt = $('fraction').value.replace(/\s/g, '');
    return { sym: txt, key: `fraction${txt}` };
  }
  return { sym: CONSTANTS[id].sym, key: id };
}

// Digits computed directly on the main thread: random, Champernowne, fraction
function localDigits(id, n, base) {
  const digits = new Uint8Array(n);
  if (id === 'random') {
    const buf = new Uint8Array(n * 2);
    crypto.getRandomValues(buf);
    const lim = 256 - (256 % base);             // rejection sampling for a uniform distribution
    let j = 0;
    for (let i = 0; i < n; i++) {
      let r;
      do {
        if (j === buf.length) { crypto.getRandomValues(buf); j = 0; }
        r = buf[j++];
      } while (r >= lim);
      digits[i] = r % base;
    }
    return { intPart: '0', digits };
  }
  if (id === 'champernowne') {                  // 0.1 2 3 … written in base b one after another
    for (let i = 0, k = 1; i < n; k++) {
      const t = digitString(k, base);
      for (let c = 0; c < t.length && i < n; c++) digits[i++] = t.charCodeAt(c) - 48;
    }
    return { intPart: '0', digits };
  }
  if (id === 'primeConst') {
    // digit k (k = 1, 2, …) is 0 if k is not prime, else k mod b; a prime equal to b counts as 1.
    // In base 2 this is exactly the prime constant ρ = Σ 2^(−p) = 0.0110101000101…
    const composite = sieve(n);
    for (let k = 2; k <= n; k++) if (!composite[k]) digits[k - 1] = k % base || 1;
    return { intPart: '0', digits };
  }
  if (id === 'primeGaps') {
    // gaps between consecutive odd primes (3→5, 5→7, 7→11, …) are even: digit = (gap / 2) mod b.
    // The n-th prime is below n·(ln n + ln ln n) for n ≥ 6.
    const limit = Math.ceil((n + 2) * (Math.log(n + 2) + Math.log(Math.log(n + 2)))) + 100;
    const composite = sieve(limit);
    let prev = 3;
    for (let k = 5, i = 0; i < n; k += 2) {
      if (composite[k]) continue;
      digits[i++] = ((k - prev) / 2) % base;
      prev = k;
    }
    return { intPart: '0', digits };
  }
  // fraction p/q: long division in base b
  const m = $('fraction').value.replace(/\s/g, '').match(/^(\d+)(?:\/(\d+))?$/);
  if (!m || BigInt(m[2] ?? 1) === 0n) return null;
  const p = BigInt(m[1]), q = BigInt(m[2] ?? 1), B = BigInt(base);
  let r = p % q;
  for (let i = 0; i < n; i++) {
    r *= B;
    digits[i] = Number(r / q);
    r %= q;
  }
  return { intPart: digitString(p / q, base), digits };
}

// Digits of a non-negative integer (Number or BigInt) in base b, one character per digit
// with character code 48 + digit ('0'–'9' in base ≤ 10). BigInt.toString stops at base 36,
// so base 64 is read from the binary expansion, 6 bits per digit.
function digitString(x, base) {
  if (base !== 64) return x.toString(base);
  const bits = x.toString(2);
  const pad = bits.padStart(Math.ceil(bits.length / 6) * 6, '0');
  let out = '';
  for (let i = 0; i < pad.length; i += 6) out += String.fromCharCode(48 + parseInt(pad.slice(i, i + 6), 2));
  return out;
}

// Sieve of Eratosthenes: composite[k] = 1 for every composite k ≤ limit (and for 0 and 1)
function sieve(limit) {
  const composite = new Uint8Array(limit + 1);
  composite[0] = composite[1] = 1;
  for (let i = 2; i * i <= limit; i++) {
    if (composite[i]) continue;
    for (let j = i * i; j <= limit; j += i) composite[j] = 1;
  }
  return composite;
}

function setCurrent(entry) {
  const t = entry.intPart.replace(/^0+/, '');   // integer part without leading zeros
  const head = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) head[i] = t.charCodeAt(i) - 48;
  current = { head, digits: entry.digits, mode: $('mode').value };
}

function compute() {
  const n = requestedDigits();
  const id = $('constant').value;
  const info = numberInfo(id);
  const { sym } = info;
  $('digits').value = n;
  $('titleSym').textContent = sym;
  $('fractionRow').hidden = id !== 'fraction';
  $('mersenneRow').hidden = id !== 'mersenne';
  $('primorialRow').hidden = id !== 'primorial';
  $('primeSizeRow').hidden = id !== 'randomPrime';
  $('sphereRow').hidden = MODES[$('mode').value].lattice !== 'sphere';
  if (MODES[$('mode').value].sphere) fillSphereSizes(MODES[$('mode').value].sphere);
  const integer = INTEGER_IDS.includes(id);
  const { base } = MODES[$('mode').value];
  const key = `${info.key}/${base}`;
  const label = (count) => `${fmt(count)} base-${base} digits of ${sym}`;
  updateRuleText();
  if (worker) { worker.terminate(); worker = null; setBusy(false); }

  if (['random', 'champernowne', 'fraction', 'primeConst', 'primeGaps'].includes(id)) {
    const entry = localDigits(id, n, base);
    if (!entry) {
      $('status').textContent = 'Enter a fraction like 22/7';
      return;
    }
    setCurrent(entry);
    const { note } = CONSTANTS[id];
    $('status').textContent = note ? `${label(n)} — ${note}` : label(n);
    buildWalk();
    play(true);
    return;
  }

  const done = (entry, how) => {
    setCurrent(entry);
    const total = entry.total ?? current.head.length + current.digits.length;
    const what = id === 'randomPrime'
      ? `${label(total)}: a random ${fmt(info.size)}-digit probable prime, found after ${fmt(entry.tests)} Miller–Rabin tests`
      : integer ? label(total) : label(n);
    $('status').textContent = `${what} ${how}${integer && total > n ? ` — walking the first ${fmt(n)}` : ''}`;
    buildWalk();
    play(true);
  };
  const hit = info.key && cache[key];
  const enough = integer ? hit && (hit.intPart.length >= n || hit.intPart.length === hit.total)
                         : hit && hit.digits.length >= n;
  if (enough) {
    done(hit, '(cached)');
    return;
  }
  const src = `${digitString.toString()}\n(${constantWorker.toString()})()`;  // the worker needs digitString too
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  const slow = (id === 'mersenne' && info.p > 20_000_000) || (id === 'randomPrime' && info.size > 1000);
  $('status').textContent =
    (id === 'randomPrime' ? `Searching for a random ${fmt(info.size)}-digit prime…`
      : `Computing ${integer ? `base-${base} digits of ${sym}` : label(n)}…`) +
    (slow ? ' (this can take a minute or more)' : '');
  worker.onmessage = (e) => {
    if (e.data.type === 'progress') {
      $('progressBar').style.width = `${Math.min(100, e.data.p * 100)}%`;
    } else {
      const entry = { intPart: e.data.intPart, digits: e.data.digits, total: e.data.total, tests: e.data.tests };
      if (info.key) cache[key] = entry;
      worker.terminate();
      worker = null;
      setBusy(false);
      done(entry, `(${(e.data.ms / 1000).toFixed(2)} s)`);
    }
  };
  worker.postMessage({ id, n, base, p: info.p, sign: info.sign, size: info.size });
}

function setBusy(busy) {
  $('compute').disabled = busy;
  $('compute').textContent = busy ? 'Computing…' : 'Compute';
  $('progressBar').style.width = busy ? '0' : '100%';
}

function buildWalk() {
  const n = requestedDigits();
  // the integer part is always included; at most n digits for a large integer
  const head = current.head.subarray(0, n);
  const frac = current.digits.subarray(0, n);
  const seq = new Uint8Array(head.length + frac.length);
  seq.set(head);
  seq.set(frac, head.length);
  if (MODES[current.mode].points) {
    buildPointWalk(seq, MODES[current.mode]);
    return;
  }
  if (MODES[current.mode].lattice === 'sphere') {
    buildSphereWalk(seq, MODES[current.mode]);
    return;
  }
  const len = seq.length;
  const is3d = MODES[current.mode].lattice === 'cube';
  const wx = new Float64Array(len + 1);
  const wy = new Float64Array(len + 1);
  const wz = is3d ? new Float64Array(len + 1) : null;
  const cells = new Int32Array(len + 1);
  const maxDist = new Float64Array(len + 1);
  const { base } = MODES[current.mode];
  const step = STEPPERS[current.mode]();
  const counts = new Int32Array(base * (len + 1));
  const seen = new Set([is3d ? key3(0, 0, 0) : key(0, 0)]);
  let m = 0;
  cells[0] = 1;
  for (let i = 0; i < len; i++) {
    const g = seq[i];
    const [k, x, y, z] = step(g);
    wx[i + 1] = x; wy[i + 1] = y;
    if (is3d) wz[i + 1] = z;
    seen.add(k);
    cells[i + 1] = seen.size;
    m = Math.max(m, Math.hypot(x, y, z));
    maxDist[i + 1] = m;
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + g]++;
  }
  Object.assign(walk, { n: len, digits: seq, wx, wy, wz, is3d, cells, maxDist, base, counts,
                        lattice: MODES[current.mode].lattice,
                        skipZeros: !!MODES[current.mode].skipZeros,
                        points: false, keys: seq, labels: null, sphere: false,
                        xs: is3d ? new Float64Array(len + 1) : wx,
                        ys: is3d ? new Float64Array(len + 1) : wy });
  if (is3d) project();
  updateHint();
  restart();
}

// Orthographic projection of a 3D point onto the screen plane (world units)
function projectPoint(x, y, z) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return [x * cy - y * sy, -(z * cp + (x * sy + y * cy) * sp)];
}

// Projection of the whole 3D walk (xs, ys), same formula as projectPoint
function project() {
  const { wx, wy, wz, xs, ys } = walk;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  for (let i = 0; i < xs.length; i++) {
    xs[i] = wx[i] * cy - wy[i] * sy;
    ys[i] = -(wz[i] * cp + (wx[i] * sy + wy[i] * cy) * sp);
  }
}

// Rotate around the centre of the bounding box, which keeps its position
// on screen. Then recompute the projection and the 2D bounds.
function rotateView(dyaw, dpitch) {
  const [x0, x1, y0, y1, z0, z1] = bounds3 || [0, 0, 0, 0, 0, 0];
  const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const before = projectPoint(...c);
  cam.yaw += dyaw;
  cam.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cam.pitch + dpitch));
  if (!walk.is3d) return;
  const after = projectPoint(...c);
  view.ox += (before[0] - after[0]) * view.scale;
  view.oy += (before[1] - after[1]) * view.scale;
  project();
  if (walk.sphere) { needsFull = true; return; }  // bounds are the fixed sphere
  const done = cur;
  cur = 0;
  bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  advanceTo(done);
  needsFull = true;
}

function updateHint() {
  $('hint').textContent = walk.is3d
    ? 'Drag: rotate · Shift+drag: pan · Wheel: zoom · Double-click: fit'
    : 'Wheel: zoom · Drag: pan · Double-click: fit';
  $('autoRotateRow').hidden = !walk.is3d;
}

/* Each stepper takes a digit and returns [key, x, y, z]: a unique key
 * for the cell and the position of its centre (z = 0 in 2D; in 2D, y
 * points down the screen; in 3D, z points up).                       */
const STEPPERS = {
  turtle() {
    let x = 0, y = 0, d = 0;
    return (g) => {
      if (g === 0) d = (d + 3) % 4;       // left
      else if (g === 2) d = (d + 1) % 4;  // right
      x += DIRS[d][0]; y += DIRS[d][1];
      return [key(x, y), x, y, 0];
    };
  },
  cardinal() {
    let x = 0, y = 0;
    return (g) => {
      x += DIRS[g][0]; y += DIRS[g][1];  // the digit is the direction
      return [key(x, y), x, y, 0];
    };
  },
  spiral() { // fixed square spiral from the centre: right, up, left, down with runs 1, 1, 2, 2, 3, 3, …
    let x = 0, y = 0, d = 0, run = 1, left = 1, turns = 0;
    return () => {
      x += DIRS[(1 - d + 4) % 4][0]; y += DIRS[(1 - d + 4) % 4][1];  // E, N, W, S (counterclockwise)
      if (--left === 0) {
        d = (d + 1) % 4;
        if (++turns % 2 === 0) run++;
        left = run;
      }
      return [key(x, y), x, y, 0];
    };
  },
  triLR: () => triStepper('lr'),
  triFixed: () => triStepper('fixed'),
  triSpiral: () => triStepper('spiral'),
  hexSpiral: () => hexStepper('spiral'),
  hexRel: () => hexStepper('relative'),
  hexFixed: () => hexStepper('fixed'),
  cubeRel: () => cubeStepper(true),
  cubeFixed: () => cubeStepper(false),
};

/* Cubic lattice: x = east, y = north, z = up.
 * Fixed: 0 = N, 1 = E, 2 = up, 3 = S, 4 = W, 5 = down (opposites are 3 apart).
 * Relative: frame (forward f, up u), left = u × f.
 *   0 = left, 1 = pitch up, 2 = straight, 3 = pitch down, 4 = right. */
const CUBE_DIRS = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a) => [-a[0], -a[1], -a[2]];

function cubeStepper(relative) {
  let x = 0, y = 0, z = 0;
  let f = [0, 1, 0], u = [0, 0, 1]; // start facing north, head up
  return (g) => {
    let d;
    if (relative) {
      const left = cross(u, f);
      if (g === 0) f = left;
      else if (g === 1) [f, u] = [u, neg(f)];
      else if (g === 3) [f, u] = [neg(u), f];
      else if (g === 4) f = neg(left);
      d = f;
    } else {
      d = CUBE_DIRS[g];
    }
    x += d[0]; y += d[1]; z += d[2];
    return [key3(x, y, z), x, y, z];
  };
}

function key3(x, y, z) {
  return ((x + 2 ** 16) * 2 ** 17 + (y + 2 ** 16)) * 2 ** 17 + (z + 2 ** 16);
}

/* Hexagonal tiling (flat-topped hexagons, centres 1 apart).
 * Position = a·u0 + b·u1 with u0 = N = (0, −1) and u1 = NE = (H, −1/2) on screen.
 * Directions clockwise: 0 = N, 1 = NE, 2 = SE, 3 = S, 4 = SW, 5 = NW. */
const HEX_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

// kind: 'relative' (0 = sharp left … 4 = sharp right), 'fixed' (digit = direction) or
// 'spiral' (turn left whenever that hexagon is unvisited, else go straight; the digit is ignored)
function hexStepper(kind) {
  let a = 0, b = 0, d = kind === 'spiral' ? 3 : 0; // start facing north (the spiral starts facing south)
  const visited = new Set([key(0, 0)]);
  return (g) => {
    if (kind === 'relative') d = (d + g - 2 + 6) % 6;
    else if (kind === 'fixed') d = g;
    else {
      const l = (d + 5) % 6;
      if (!visited.has(key(a + HEX_DIRS[l][0], b + HEX_DIRS[l][1]))) d = l;
    }
    a += HEX_DIRS[d][0]; b += HEX_DIRS[d][1];
    if (kind === 'spiral') visited.add(key(a, b));
    return [key(a, b), b * H, -a - b / 2, 0];
  };
}

/* Triangle tiling: cell (c, r) points up when c + r is even.
 * Edges: 0 = horizontal, 1 = “/”, 2 = “\”.
 * ▲ triangle: 0 → below (c, r+1), 1 → left (c−1, r), 2 → right (c+1, r)
 * ▼ triangle: 0 → above (c, r−1), 1 → right (c+1, r), 2 → left (c−1, r)
 * Edges in counterclockwise order: ▲ [2, 1, 0], ▼ [0, 2, 1]. Entering
 * through edge e, the next edge in that order is on the right, the other on the left. */
const TRI_CCW = { up: [2, 1, 0], down: [0, 2, 1] };

// kind: 'lr' (0 = exit left, 1 = exit right), 'fixed' (digit = edge to cross) or
// 'spiral' (exit left whenever that triangle is unvisited, else right; the digit is ignored)
function triStepper(kind) {
  let c = 0, r = 0, entry = 0; // start: ▲ triangle at (0, 0), entered from below
  const visited = new Set([key(0, 0)]);
  const across = (edge, up) => (edge === 0 ? [c, r + (up ? 1 : -1)] : [c + ((edge === 1) === up ? -1 : 1), r]);
  return (g) => {
    const up = ((c + r) & 1) === 0;
    let edge = g;
    if (kind !== 'fixed') {
      const ccw = up ? TRI_CCW.up : TRI_CCW.down;
      const i = ccw.indexOf(entry);
      const left = ccw[(i + 2) % 3], right = ccw[(i + 1) % 3];
      if (kind === 'lr') edge = g === 1 ? right : left;
      else edge = visited.has(key(...across(left, up))) ? right : left;
    }
    [c, r] = across(edge, up);
    entry = edge;
    visited.add(key(c, r));
    const upNow = ((c + r) & 1) === 0;
    return [key(c, r), c / 2, r * H + (upNow ? 2 * H / 3 : H / 3) + TRI_Y0, 0];
  };
}

/* Ulam-spiral point modes: the walk is the list of marked cells, in order, and
 * point i + 1 is the i-th mark (point 0 is cell 1, the centre).
 * jump:   read the digits one by one; jump ahead digit + 1 cells and mark the landing cell.
 * search: mark cell n when the base-b digits of n occur somewhere in the digit sequence. */
function buildPointWalk(seq, { base, points: kind }) {
  let cellsOf;  // ascending cell numbers to mark
  let keys;     // colour key of each mark: the digit (jump) or the length of n (search)
  if (kind === 'jump') {
    cellsOf = new Float64Array(seq.length);
    let c = 1;
    for (let i = 0; i < seq.length; i++) cellsOf[i] = c += seq[i] + 1;
    keys = seq;
    walk.keyCount = base;
  } else {
    // Mark every number whose digits appear, for lengths L with b^L ≤ 20·(digit count)
    // (above that, less than ~5 % of L-digit numbers can appear), and b^L ≤ 2^27 cells.
    let maxLen = 1;
    while (base ** (maxLen + 1) <= Math.min(20 * seq.length, 2 ** 27)) maxLen++;
    const size = base ** maxLen;
    const found = new Uint8Array(size);
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] === 0) continue;  // n is written without leading zeros
      let v = 0;
      for (let L = 0; L < maxLen && i + L < seq.length; L++) {
        v = v * base + seq[i + L];
        found[v] = 1;
      }
    }
    walk.keyCount = maxLen;
    let count = 0;
    for (let v = 1; v < size; v++) count += found[v];
    cellsOf = new Float64Array(count);
    keys = new Uint8Array(count);
    for (let v = 1, j = 0, len = 1, next = base; v < size; v++) {
      if (v === next) { len++; next *= base; }
      if (found[v]) { cellsOf[j] = v; keys[j++] = len; }
    }
  }
  // walk the spiral once, recording the position of every marked cell
  const len = cellsOf.length;
  const xs = new Float64Array(len + 1), ys = new Float64Array(len + 1);
  const cells = new Int32Array(len + 1), maxDist = new Float64Array(len + 1);
  const step = STEPPERS.spiral();
  let cell = 1, x = 0, y = 0, m = 0;
  cells[0] = 1;
  for (let i = 0; i < len; i++) {
    while (cell < cellsOf[i]) { [, x, y] = step(); cell++; }
    xs[i + 1] = x; ys[i + 1] = y;
    cells[i + 1] = i + 1;
    m = Math.max(m, Math.hypot(x, y));
    maxDist[i + 1] = m;
  }
  Object.assign(walk, { n: len, digits: seq, wx: xs, wy: ys, wz: null, is3d: false, cells, maxDist, base,
                        counts: null, lattice: 'square', skipZeros: false, points: true, keys, labels: cellsOf,
                        sphere: false,
                        xs, ys });
  updateHint();
  restart();
}

/* Tiled spheres. A mesh lists each tile's vertices counterclockwise seen from outside
 * (poly[sides·t + k]); nbr[sides·t + k] is the tile across edge k (vertex k to vertex k + 1)
 * and nbrEdge[…] the index of that same edge in the neighbour. */
const meshCache = {};

// Shared vertex store: points are merged when equal and, for spheres, normalised onto the unit sphere
function vertexStore(normalise = true) {
  const verts = [], index = new Map();
  const add = (x, y, z) => {
    const l = normalise ? Math.hypot(x, y, z) : 1;
    x /= l; y /= l; z /= l;
    const k = `${x.toFixed(9)},${y.toFixed(9)},${z.toFixed(9)}`;
    if (!index.has(k)) { index.set(k, verts.length / 3); verts.push(x, y, z); }
    return index.get(k);
  };
  return { verts, add };
}

// Orient every tile counterclockwise, compute centres, outward normals and edge adjacency.
// On a sphere the centre is pushed onto the surface and the normal is the centre's direction.
function finishMesh(verts, tiles, sides, size, flat = false) {
  const n = tiles.length;
  const poly = new Int32Array(sides * n), cen = new Float64Array(3 * n), nrmOut = new Float64Array(3 * n);
  const V = (v) => [verts[3 * v], verts[3 * v + 1], verts[3 * v + 2]];
  tiles.forEach((t, i) => {
    const P = t.map(V);
    const m = [0, 1, 2].map((d) => P.reduce((sum, q) => sum + q[d], 0));
    // normal from the diagonals (works for triangles and for slightly non-planar quads)
    const d1 = [0, 1, 2].map((d) => P[2][d] - P[0][d]);
    const d2 = [0, 1, 2].map((d) => P[sides - 1][d] - P[1][d]);
    const nrm = cross(d1, d2);
    const inward = nrm[0] * m[0] + nrm[1] * m[1] + nrm[2] * m[2] < 0;
    poly.set(inward ? [t[0], ...t.slice(1).reverse()] : t, sides * i);
    if (flat) {
      const l = Math.hypot(...nrm) * (inward ? -1 : 1);
      cen.set(m.map((v) => v / sides), 3 * i);
      nrmOut.set(nrm.map((v) => v / l), 3 * i);
    } else {
      const l = Math.hypot(...m);
      cen.set(m.map((v) => v / l), 3 * i);
      nrmOut.set(m.map((v) => v / l), 3 * i);
    }
  });
  const edges = new Map(), nbr = new Int32Array(sides * n).fill(-1), nbrEdge = new Int8Array(sides * n);
  const nv = verts.length / 3;
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < sides; k++) {
      const u = poly[sides * t + k], v = poly[sides * t + (k + 1) % sides];
      const e = Math.min(u, v) * nv + Math.max(u, v);
      const other = edges.get(e);
      if (other === undefined) { edges.set(e, [t, k]); continue; }
      nbr[sides * t + k] = other[0]; nbrEdge[sides * t + k] = other[1];
      nbr[sides * other[0] + other[1]] = t; nbrEdge[sides * other[0] + other[1]] = k;
    }
  }
  return { size, n, sides, flat, verts: new Float64Array(verts), poly, cen, nrm: nrmOut, nbr, nbrEdge };
}

/* Geodesic sphere: an icosahedron whose 20 faces are each cut into f² triangles, pushed out
 * onto the sphere. 12 vertices are shared by 5 triangles instead of 6. */
function geodesic(f) {
  const key = `geo${f}`;
  if (meshCache[key]) return meshCache[key];
  const p = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p],
               [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
                 [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8],
                 [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const { verts, add } = vertexStore();
  const tris = [];
  for (const [a, b, c] of faces) {
    const [A, B, C] = [ico[a], ico[b], ico[c]];
    const at = (i, j) => add(...[0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f));
    for (let i = 0; i < f; i++) {
      for (let j = 0; i + j < f; j++) {
        tris.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (i + j < f - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
    }
  }
  return (meshCache[key] = finishMesh(verts, tris, 3, f));
}

/* Cube sphere: each face of a cube cut into n × n squares, pushed out onto the sphere. The grid
 * uses equal angles (tan mapping) so squares keep similar sizes. 8 vertices (the cube corners)
 * are shared by 3 squares instead of 4. */
function cubeSphere(n) {
  const key = `cube${n}`;
  if (meshCache[key]) return meshCache[key];
  const faces = [  // [normal, u axis, v axis]
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  const { verts, add } = vertexStore();
  const quads = [];
  for (const [N, U, W] of faces) {
    const at = (i, j) => {
      const a = Math.tan((Math.PI / 4) * (2 * i / n - 1)), b = Math.tan((Math.PI / 4) * (2 * j / n - 1));
      return add(...[0, 1, 2].map((d) => N[d] + U[d] * a + W[d] * b));
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) quads.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return (meshCache[key] = finishMesh(verts, quads, 4, n));
}

/* Cube: the same n × n squares per face as the cube sphere, but left flat on the cube. */
function cubeFlat(n) {
  const key = `flat${n}`;
  if (meshCache[key]) return meshCache[key];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  const { verts, add } = vertexStore(false);
  const quads = [];
  for (const [N, U, W] of faces) {
    const at = (i, j) => add(...[0, 1, 2].map((d) => N[d] + U[d] * (2 * i / n - 1) + W[d] * (2 * j / n - 1)));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) quads.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return (meshCache[key] = finishMesh(verts, quads, 4, n, true));
}

/* Tetrahedron: each of the 4 faces cut into f² triangles, left flat. Its 4 corners are shared
 * by 3 triangles instead of 6. */
function tetraFlat(f) {
  const key = `tetra${f}`;
  if (meshCache[key]) return meshCache[key];
  const P = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  const { verts, add } = vertexStore(false);
  const tris = [];
  for (const [A, B, C] of [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]].map((face) => face.map((v) => P[v]))) {
    const at = (i, j) => add(...[0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f));
    for (let i = 0; i < f; i++) {
      for (let j = 0; i + j < f; j++) {
        tris.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (i + j < f - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
    }
  }
  return (meshCache[key] = finishMesh(verts, tris, 3, f, true));
}

const SPHERES = {
  geo:  { mesh: geodesic, radius: (f) => f * 1.05,       // triangle edge ≈ 1 unit
          sizes: [8, 16, 32, 64], initial: 16, tiles: (f) => 20 * f * f, unit: 'triangles' },
  cube: { mesh: cubeSphere, radius: (n) => (2 * n) / Math.PI,  // square edge ≈ 1 unit
          sizes: [8, 16, 32, 64, 128], initial: 32, tiles: (n) => 6 * n * n, unit: 'squares' },
  flat: { mesh: cubeFlat, radius: (n) => n / 2,                 // half the cube side: square edge = 1 unit
          sizes: [8, 16, 32, 64, 128], initial: 32, tiles: (n) => 6 * n * n, unit: 'squares' },
  tetra: { mesh: tetraFlat, radius: (f) => f / (2 * Math.SQRT2),  // tetrahedron edge 2√2 → triangle edge = 1 unit
          sizes: [8, 16, 32, 64, 128], initial: 32, tiles: (f) => 4 * f * f, unit: 'triangles' },
};

// Fill the Sphere size menu for the kind of sphere of the current mode
function fillSphereSizes(kind) {
  const sel = $('sphereF');
  if (sel.dataset.kind === kind) return;
  const { sizes, initial, tiles, unit } = SPHERES[kind];
  sel.replaceChildren(...sizes.map((f) => new Option(`${fmt(tiles(f))} ${unit}`, f)));
  sel.value = initial;
  sel.dataset.kind = kind;
}

// Walk from tile to tile. Entering a tile through edge k (vertices counterclockwise), the digit d
// leaves through edge k + turns[d]: k + 1 is on the right, k − 1 on the left, k + 2 straight on
// (for squares).
function buildSphereWalk(seq, { sphere: kind, turns, base }) {
  fillSphereSizes(kind);
  const { mesh, radius } = SPHERES[kind];
  const size = Number($('sphereF').value);
  const g = mesh(size);
  const R = radius(size);
  const sides = g.sides;
  const len = seq.length;
  const wx = new Float64Array(len + 1), wy = new Float64Array(len + 1), wz = new Float64Array(len + 1);
  const tile = new Int32Array(len + 1), cells = new Int32Array(len + 1), maxDist = new Float64Array(len + 1);
  const counts = new Int32Array(base * (len + 1));
  const seen = new Uint8Array(g.n);
  let t = 0, entry = 0, distinct = 1, m = 0, coverStep = -1;
  seen[0] = 1;
  const c0 = [g.cen[0], g.cen[1], g.cen[2]];
  const put = (i) => {
    wx[i] = g.cen[3 * t] * R; wy[i] = g.cen[3 * t + 1] * R; wz[i] = g.cen[3 * t + 2] * R;
    tile[i] = t;
    cells[i] = distinct;
    const dot = (g.cen[3 * t] * c0[0] + g.cen[3 * t + 1] * c0[1] + g.cen[3 * t + 2] * c0[2]);
    m = Math.max(m, g.flat  // distance from the start: straight line on the cube, great circle on a sphere
      ? R * Math.hypot(g.cen[3 * t] - c0[0], g.cen[3 * t + 1] - c0[1], g.cen[3 * t + 2] - c0[2])
      : R * Math.acos(Math.max(-1, Math.min(1, dot))));
    maxDist[i] = m;
  };
  put(0);
  for (let i = 0; i < len; i++) {
    const edge = (entry + turns[seq[i]]) % sides;
    const next = g.nbr[sides * t + edge];
    entry = g.nbrEdge[sides * t + edge];
    t = next;
    if (!seen[t]) { seen[t] = 1; distinct++; if (distinct === g.n) coverStep = i + 1; }
    put(i + 1);
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + seq[i]]++;
  }
  Object.assign(walk, { n: len, digits: seq, wx, wy, wz, is3d: true, cells, maxDist, base, counts,
                        lattice: 'sphere', skipZeros: false, points: false, keys: seq, labels: null,
                        sphere: true, geo: g, R, tile, coverStep, visits: new Int32Array(g.n), maxVisits: 0,
                        xs: new Float64Array(len + 1), ys: new Float64Array(len + 1) });
  project();
  updateHint();
  restart();
}

function key(x, y) {
  return (x + 2 ** 21) * 2 ** 22 + (y + 2 ** 21);
}

/* ------------------------------------------------------------------ *
 * Animation                                                          *
 * ------------------------------------------------------------------ */
function stepsPerFrame() {
  const v = Number($('speed').value) / 100;
  return 10 ** (v * 5 - 1); // 0.1 → 10,000 steps per frame
}

function updateSpeedLabel() {
  const s = stepsPerFrame() * 60;
  $('speedLabel').textContent = `${s < 100 ? s.toFixed(s < 10 ? 1 : 0) : fmt(Math.round(s))} steps/s`;
}

function advanceTo(target) {
  target = Math.min(walk.n, target);
  const { xs, ys, wx, wy, wz, is3d } = walk;
  for (let i = cur + 1; i <= target; i++) {
    if (walk.sphere) walk.maxVisits = Math.max(walk.maxVisits, ++walk.visits[walk.tile[i]]);
    if (is3d) {
      const b = bounds3;
      b[0] = Math.min(b[0], wx[i]); b[1] = Math.max(b[1], wx[i]);
      b[2] = Math.min(b[2], wy[i]); b[3] = Math.max(b[3], wy[i]);
      b[4] = Math.min(b[4], wz[i]); b[5] = Math.max(b[5], wz[i]);
    }
    if (xs[i] < bounds.minX) bounds.minX = xs[i];
    if (xs[i] > bounds.maxX) bounds.maxX = xs[i];
    if (ys[i] < bounds.minY) bounds.minY = ys[i];
    if (ys[i] > bounds.maxY) bounds.maxY = ys[i];
  }
  if (target !== cur) statsDirty = true;
  cur = Math.max(cur, target);
  if (cur >= walk.n) play(false);
}

function play(on) {
  playing = on && walk.n > 0 && cur < walk.n;
  $('play').textContent = playing ? '❚❚ Pause' : '▶︎ Play';
}

function restart() {
  cur = 0;
  drawn = 0;
  acc = 0;
  bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  bounds3 = [0, 0, 0, 0, 0, 0];
  if (walk.sphere) {  // the frame is the whole sphere, centred on the origin
    const R = walk.R;
    const F = walk.geo.flat ? R * Math.sqrt(3) : R;  // cube and tetrahedron corners reach R·√3 from the centre
    bounds = { minX: -F, maxX: F, minY: -F, maxY: F };
    bounds3 = [-R, R, -R, R, -R, R];
    walk.visits.fill(0);
    walk.visits[walk.tile[0]] = walk.maxVisits = 1;
  }
  if ($('autoFit').checked) fitToBounds(walk.sphere ? padBounds(bounds) : { minX: -3, maxX: 3, minY: -3, maxY: 3 });
  needsFull = true;
  statsDirty = true;
  play(false);
}

/* ------------------------------------------------------------------ *
 * View (zoom / pan)                                                  *
 * ------------------------------------------------------------------ */
function fitToBounds(b) {
  const w = b.maxX - b.minX + 2;
  const h = b.maxY - b.minY + 2;
  view.scale = Math.min(40, Math.max(0.01, Math.min(cw / w, ch / h) * 0.85));
  view.ox = cw / 2 - ((b.minX + b.maxX) / 2) * view.scale;
  view.oy = ch / 2 - ((b.minY + b.maxY) / 2) * view.scale;
  needsFull = true;
}

function boundsOffscreen() {
  const m = 16;
  return view.ox + bounds.minX * view.scale < m ||
         view.ox + bounds.maxX * view.scale > cw - m ||
         view.oy + bounds.minY * view.scale < m ||
         view.oy + bounds.maxY * view.scale > ch - m;
}

function resize() {
  const r = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const first = cw === 0;
  cw = r.width; ch = r.height;
  for (const ctx of Object.values(layers)) {
    ctx.canvas.width = Math.round(cw * dpr);
    ctx.canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (first || $('autoFit').checked) fitToBounds(padBounds(bounds));
  needsFull = true;
}

function padBounds(b) {
  return { minX: Math.min(b.minX, -3), maxX: Math.max(b.maxX, 3),
           minY: Math.min(b.minY, -3), maxY: Math.max(b.maxY, 3) };
}

function userMovedView() {
  $('autoFit').checked = false;
  needsFull = true;
}

/* ------------------------------------------------------------------ *
 * Rendering                                                          *
 * ------------------------------------------------------------------ */
function drawGrid() {
  const ctx = layers.grid;
  ctx.clearRect(0, 0, cw, ch);
  if (!$('showGrid').checked) return;
  const s = view.scale;
  let stepCells = 1;
  while (s * stepCells < 10) stepCells *= 5;
  const px = s * stepCells;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (walk.lattice === 'tri') {
    drawTriGrid(ctx, stepCells);
    return;
  }
  if (walk.lattice === 'hex') {
    drawHexGrid(ctx);
    return;
  }
  if (walk.is3d) {
    draw3DFrame(ctx);
    return;
  }
  const x0 = ((view.ox % px) + px) % px;
  const y0 = ((view.oy % px) + px) % px;
  for (let x = x0; x < cw; x += px) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, ch); }
  for (let y = y0; y < ch; y += px) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(cw, Math.round(y) + 0.5); }
  ctx.stroke();
  // axes through the origin
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.moveTo(Math.round(view.ox) + 0.5, 0); ctx.lineTo(Math.round(view.ox) + 0.5, ch);
  ctx.moveTo(0, Math.round(view.oy) + 0.5); ctx.lineTo(cw, Math.round(view.oy) + 0.5);
  ctx.stroke();
}

// 3D: wireframe bounding box of the walk + axis gizmo in the top-left corner
function draw3DFrame(ctx) {
  const proj = projectPoint;
  const [x0, x1, y0, y1, z0, z1] = bounds3;
  const X = [x0, x1], Y = [y0, y1], Z = [z0, z1];
  const pt = (i, j, k) => {
    const [px, py] = proj(X[i], Y[j], Z[k]);
    return [view.ox + px * view.scale, view.oy + py * view.scale];
  };
  for (let a = 0; a < 2 && !walk.sphere; a++) for (let b = 0; b < 2; b++) {
    for (const [p, q] of [[pt(0, a, b), pt(1, a, b)], [pt(a, 0, b), pt(a, 1, b)], [pt(a, b, 0), pt(a, b, 1)]]) {
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
  }
  ctx.stroke();
  // gizmo: x = east (red), y = north (green), z = up (blue)
  const o = [44, 44];
  ctx.lineWidth = 2;
  ctx.font = '11px system-ui, sans-serif';
  [['E', [1, 0, 0], '#ff7b72'], ['N', [0, 1, 0], '#3fb950'], ['Up', [0, 0, 1], '#4ea1ff']].forEach(([label, v, color]) => {
    const [px, py] = proj(...v);
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + px * 26, o[1] + py * 26);
    ctx.stroke();
    ctx.fillText(label, o[0] + px * 34 - 5, o[1] + py * 34 + 4);
  });
}

// Flat-topped hexagons of radius 1/√3; each one draws its 3 top edges
// (the 3 bottom ones belong to the S, SE and SW neighbours). Hidden when too small.
function drawHexGrid(ctx) {
  const { scale: s, ox, oy } = view;
  const R = s / Math.sqrt(3);
  if (R < 5) return;
  const xL = -ox / s, xR = (cw - ox) / s, yTop = -oy / s, yBot = (ch - oy) / s;
  const v = [0, 1, 2, 3].map((k) => [R * Math.cos((k * Math.PI) / 3), -R * Math.sin((k * Math.PI) / 3)]);
  for (let b = Math.floor(xL / H) - 1; b <= Math.ceil(xR / H) + 1; b++) {
    for (let a = Math.floor(-yBot - b / 2) - 1; a <= Math.ceil(-yTop - b / 2) + 1; a++) {
      const cx = ox + b * H * s, cy = oy + (-a - b / 2) * s;
      ctx.moveTo(cx + v[0][0], cy + v[0][1]);
      for (let k = 1; k < 4; k++) ctx.lineTo(cx + v[k][0], cy + v[k][1]);
    }
  }
  ctx.stroke();
}

// Triangular lattice: lines y = y0 + k·H and x ± (y − y0)/√3 = k (k a multiple of step)
function drawTriGrid(ctx, step) {
  const { scale: s, ox, oy } = view;
  const toX = (x) => ox + x * s, toY = (y) => oy + y * s;
  const yTop = -oy / s, yBot = (ch - oy) / s;
  const xL = -ox / s, xR = (cw - ox) / s;
  const r3 = Math.sqrt(3);
  const hs = H * step;
  for (let k = Math.ceil((yTop - TRI_Y0) / hs); TRI_Y0 + k * hs <= yBot; k++) {
    const y = Math.round(toY(TRI_Y0 + k * hs)) + 0.5;
    ctx.moveTo(0, y); ctx.lineTo(cw, y);
  }
  for (const sign of [1, -1]) {
    // x + sign·(y − y0)/√3 = k
    const vals = [xL + sign * (yTop - TRI_Y0) / r3, xL + sign * (yBot - TRI_Y0) / r3,
                  xR + sign * (yTop - TRI_Y0) / r3, xR + sign * (yBot - TRI_Y0) / r3];
    const k0 = Math.floor(Math.min(...vals) / step), k1 = Math.ceil(Math.max(...vals) / step);
    for (let k = k0; k <= k1; k++) {
      const xAt = (y) => k * step - sign * (y - TRI_Y0) / r3;
      ctx.moveTo(toX(xAt(yTop)), 0); ctx.lineTo(toX(xAt(yBot)), ch);
    }
  }
  ctx.stroke();
}

function styleKey(i) {
  switch ($('colorMode').value) {
    case 'digit': return walk.keys[i];
    case 'mono': return 0;
    default: return Math.floor((i * BANDS) / walk.n);
  }
}

function styleColor(k) {
  switch ($('colorMode').value) {
    case 'digit': return walk.base <= 6 ? DIGIT_COLORS[k] : `hsl(${(k * 360) / (walk.points ? walk.keyCount : walk.base)}, 80%, 62%)`;
    case 'mono': return MONO;
    default: return GRADIENT[k];
  }
}

const sphereDraw = { at: 0, cost: 0 };

// Cursor lying on the sphere: an arrow in the tangent plane at the walker, pointing along the
// last step, built in 3D and then projected so it is foreshortened like the tiles around it
function drawSphereCursor(ctx) {
  const P = (i) => [walk.wx[i], walk.wy[i], walk.wz[i]];
  const p = P(cur);
  const t = walk.tile[cur], nr = walk.geo.nrm;
  const nrm = [nr[3 * t], nr[3 * t + 1], nr[3 * t + 2]];  // outward normal of the current tile
  const pos = p.map((v, d) => v + nrm[d] * walk.R * 0.003);  // just above the surface
  // heading: last step (or the next one at the start), minus its normal component
  const [a, b] = cur > 0 ? [P(cur - 1), p] : [p, P(Math.min(1, walk.n))];
  let h = [0, 1, 2].map((d) => b[d] - a[d]);
  const dot = h[0] * nrm[0] + h[1] * nrm[1] + h[2] * nrm[2];
  h = h.map((v, d) => v - dot * nrm[d]);
  const hl = Math.hypot(...h) || 1;
  h = h.map((v) => v / hl);
  const side = cross(nrm, h);
  // scale to the tile: the arrow is 1.6·size long, about half an edge, centred on the tile centre
  const g = walk.geo, v0 = g.poly[0], v1 = g.poly[1];
  const edge = walk.R * Math.hypot(...[0, 1, 2].map((d) => g.verts[3 * v0 + d] - g.verts[3 * v1 + d]));
  const size = 0.3 * edge;
  const at = (fwd, lat) => {
    fwd -= 0.2;  // the arrow spans −0.6 … 1 along its axis: shift it so it is centred
    const [x, y] = projectPoint(...[0, 1, 2].map((d) => pos[d] + h[d] * fwd * size + side[d] * lat * size));
    return [view.ox + x * view.scale, view.oy + y * view.scale];
  };
  const pts = [at(1, 0), at(-0.6, 0.7), at(-0.3, 0), at(-0.6, -0.7)];
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0e1116';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

// Auto-fit on the sphere: ease the camera towards the walker so that it faces the viewer,
// i.e. yaw and pitch such that towardViewer(walker) = 1 (then it projects onto the centre)
function followWalker() {
  const x = walk.wx[cur], y = walk.wy[cur], z = walk.wz[cur];
  const l = Math.hypot(x, y, z);
  const pitch = Math.asin(z / l), yaw = Math.atan2(-x, -y);
  let dyaw = yaw - cam.yaw;
  dyaw -= 2 * Math.PI * Math.round(dyaw / (2 * Math.PI));  // shortest way round
  const dpitch = pitch - cam.pitch;
  if (Math.abs(dyaw) + Math.abs(dpitch) > 1e-4) rotateView(dyaw * 0.12, dpitch * 0.12);
}

// Component of a unit vector towards the viewer (> 0 on the visible half of the sphere)
function towardViewer(x, y, z) {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return z * sp - (x * Math.sin(cam.yaw) + y * Math.cos(cam.yaw)) * cp;
}
const facing = (i) => {  // is the tile of point i on the visible side?
  const t = walk.tile[i], nr = walk.geo.nrm;
  return towardViewer(nr[3 * t], nr[3 * t + 1], nr[3 * t + 2]) > 0;
};

// Sphere: visible tiles coloured by visit count (log scale) and shading
function drawSphere() {
  const ctx = layers.path;
  ctx.clearRect(0, 0, cw, ch);
  const { geo: g, R, visits, maxVisits } = walk;
  const { scale: s, ox, oy } = view;
  const nv = g.verts.length / 3;
  const px = new Float32Array(nv), py = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const [x, y] = projectPoint(g.verts[3 * v] * R, g.verts[3 * v + 1] * R, g.verts[3 * v + 2] * R);
    px[v] = ox + x * s; py[v] = oy + y * s;
  }
  const LEVELS = 32;
  const buckets = Array.from({ length: LEVELS + 1 }, () => []);
  const logMax = Math.log(Math.max(2, maxVisits));
  for (let t = 0; t < g.n; t++) {
    if (towardViewer(g.nrm[3 * t], g.nrm[3 * t + 1], g.nrm[3 * t + 2]) <= 0) continue;
    const v = visits[t];
    buckets[v ? 1 + Math.round((Math.log(v) / logMax) * (LEVELS - 1)) : 0].push(t);
  }
  const k = g.sides;
  const outline = (list) => {
    ctx.beginPath();
    for (const t of list) {
      const first = g.poly[k * t];
      ctx.moveTo(px[first], py[first]);
      for (let j = 1; j < k; j++) ctx.lineTo(px[g.poly[k * t + j]], py[g.poly[k * t + j]]);
      ctx.closePath();
    }
  };
  // background: anti-aliasing seams between tiles show this colour instead of black
  ctx.fillStyle = '#1f2630';
  if (g.flat) {
    outline(buckets.flat());
  } else {
    ctx.beginPath();
    ctx.arc(ox, oy, R * s, 0, Math.PI * 2);
  }
  ctx.fill();
  buckets.forEach((list, level) => {
    if (!list.length || level === 0) return;
    outline(list);
    ctx.fillStyle = GRADIENT[Math.round(((level - 1) / (LEVELS - 1)) * (BANDS - 1))];
    ctx.fill();
  });
  if ($('showGrid').checked && s > 6) {  // tile edges once they are big enough
    outline(buckets.flat());
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  if (g.flat) {
    // shading: each flat face darker the more it turns away from the viewer
    const faces = new Map();
    for (const t of buckets.flat()) {
      const k3 = 3 * t, key = `${g.nrm[k3].toFixed(3)},${g.nrm[k3 + 1].toFixed(3)},${g.nrm[k3 + 2].toFixed(3)}`;
      if (!faces.has(key)) faces.set(key, []);
      faces.get(key).push(t);
    }
    for (const list of faces.values()) {
      const t = list[0];
      const toward = towardViewer(g.nrm[3 * t], g.nrm[3 * t + 1], g.nrm[3 * t + 2]);
      outline(list);
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.55 * (1 - toward)).toFixed(3)})`;
      ctx.fill();
    }
  } else {
    // shading: darker towards the rim
    const shade = ctx.createRadialGradient(ox - R * s * 0.3, oy - R * s * 0.3, R * s * 0.1, ox, oy, R * s);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    shade.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(ox, oy, R * s, 0, Math.PI * 2);
    ctx.fill();
  }
  /* Recent trail (white line through the last 300 steps), disabled for now; may come back.
  const from = Math.max(0, cur - 300);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1, Math.min(s * 0.15, 2.5));
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = from; i < cur; i++) {
    if (!facing(i) || !facing(i + 1)) continue;
    ctx.moveTo(ox + walk.xs[i] * s, oy + walk.ys[i] * s);
    ctx.lineTo(ox + walk.xs[i + 1] * s, oy + walk.ys[i + 1] * s);
  }
  ctx.stroke();
  */
}

// Draw segments [from, to): segment i joins point i to point i+1.
function drawSegments(from, to) {
  if (to <= from) return;
  const ctx = layers.path;
  const { xs, ys } = walk;
  const { scale: s, ox, oy } = view;
  ctx.lineWidth = Math.max(0.6, Math.min(s * 0.3, 6));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let i = from;
  while (i < to) {
    const k = styleKey(i);
    ctx.strokeStyle = styleColor(k);
    if (walk.points) {  // point modes: a square on each marked cell
      ctx.fillStyle = ctx.strokeStyle;
      // true cell size: when zoomed out, sub-pixel squares blend, so brightness shows the density
      const w = s * 0.85;
      while (i < to && styleKey(i) === k) {
        ctx.fillRect(ox + xs[i + 1] * s - w / 2, oy + ys[i + 1] * s - w / 2, w, w);
        i++;
      }
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(ox + xs[i] * s, oy + ys[i] * s);
    while (i < to && styleKey(i) === k) {
      const x = ox + xs[i + 1] * s, y = oy + ys[i + 1] * s;
      if (walk.skipZeros && walk.digits[i] === 0) ctx.moveTo(x, y);  // spiral: 0 = no line
      else ctx.lineTo(x, y);
      i++;
    }
    ctx.stroke();
  }
}

function drawOverlay() {
  const ctx = layers.overlay;
  ctx.clearRect(0, 0, cw, ch);
  if (!walk.n) return;
  const { scale: s, ox, oy } = view;
  const r = Math.max(3, Math.min(s * 0.35, 8));
  // start (hidden on the far side of the sphere)
  if (!walk.sphere || facing(0)) {
    ctx.fillStyle = '#3fb950';
    ctx.beginPath();
    ctx.arc(ox + walk.xs[0] * s, oy + walk.ys[0] * s, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (walk.sphere) {
    if (facing(cur)) drawSphereCursor(ctx);
    return;
  }
  // current position + heading
  const x = ox + walk.xs[cur] * s;
  const y = oy + walk.ys[cur] * s;
  if (walk.points) {  // point modes have no heading: ring around the last mark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // heading = direction of the last step (up at the start)
  let dx = 0, dy = -1;
  if (cur > 0) {
    const ux = walk.xs[cur] - walk.xs[cur - 1], uy = walk.ys[cur] - walk.ys[cur - 1];
    const l = Math.hypot(ux, uy);
    if (l > 1e-6) { dx = ux / l; dy = uy / l; } else { dx = 0; dy = 0; } // step along the view axis
  }
  const a = r * 1.8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0e1116';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + dx * a, y + dy * a);
  ctx.lineTo(x - dx * a * 0.6 - dy * a * 0.7, y - dy * a * 0.6 + dx * a * 0.7);
  ctx.lineTo(x - dx * a * 0.6 + dy * a * 0.7, y - dy * a * 0.6 - dx * a * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function updateStats() {
  $('sStep').textContent = `${fmt(cur)} / ${fmt(walk.n)}`;
  const x = walk.n ? walk.wx[cur] : 0;
  const y = walk.n ? (walk.is3d ? walk.wy[cur] : -walk.wy[cur]) : 0;
  const z = walk.is3d ? walk.wz[cur] : 0;
  const p = (v) => fmt(Math.round(v * 100) / 100 || 0);
  $('sPos').textContent = walk.is3d ? `(${p(x)}, ${p(y)}, ${p(z)})` : `(${p(x)}, ${p(y)})`;
  $('sDist').textContent = Math.hypot(x, y, z).toFixed(1);
  $('sMax').textContent = walk.n ? walk.maxDist[cur].toFixed(1) : '0';
  $('sCells').textContent = !walk.n ? '1' : walk.sphere
    ? `${fmt(walk.cells[cur])} / ${fmt(walk.geo.n)}` +
      (walk.coverStep >= 0 && cur >= walk.coverStep ? ` (all by step ${fmt(walk.coverStep)})`
                                                     : ` (${(100 * walk.cells[cur] / walk.geo.n).toFixed(1)} %)`)
    : fmt(walk.cells[cur]);
  if (walk.n && walk.counts) {
    const c = walk.counts.subarray(walk.base * cur, walk.base * (cur + 1));
    $('sCounts').textContent = Array.from(c, fmt).join(' / ');
  }
  // digit strip around the current step
  const strip = $('digitStrip');
  if (!walk.n) { strip.textContent = ''; return; }
  if (walk.points) {  // point modes: list the most recent marked cell numbers
    const a = Math.max(0, cur - 8);
    const list = Array.from(walk.labels.subarray(a, cur), (v, i) =>
      a + i === cur - 1 ? `<span class="cur">${fmt(v)}</span>` : fmt(v));
    strip.innerHTML = `Marked cells: ${a > 0 ? '… ' : ''}${list.join(', ')}`;
    return;
  }
  const before = 36, after = 20;
  const a = Math.max(0, cur - before);
  const b = Math.min(walk.n, cur + after);
  const d = walk.digits;
  const intLen = Math.min(current.head.length, walk.n);
  let html = a > 0 ? '…' : (intLen ? '' : '0.');
  for (let i = a; i < b; i++) {
    html += i === cur - 1 ? `<span class="cur">${d[i]}</span>` : d[i];
    if (i === intLen - 1 && intLen < walk.n) html += '.';
  }
  strip.innerHTML = html + (b < walk.n ? '…' : '');
}

function tick() {
  if (walk.is3d && $('autoRotate').checked) rotateView(0.004, 0);
  if (playing) {
    acc += stepsPerFrame();
    const k = Math.floor(acc);
    acc -= k;
    if (k > 0) advanceTo(cur + k);
  }
  if (walk.n && $('autoFit').checked && boundsOffscreen()) {
    const b = padBounds(bounds);
    const mx = (b.maxX - b.minX) * 0.15, my = (b.maxY - b.minY) * 0.15;
    fitToBounds({ minX: b.minX - mx, maxX: b.maxX + mx, minY: b.minY - my, maxY: b.maxY + my });
  }
  if (walk.sphere) {  // the sphere is redrawn as a whole (heat map + recent trail)
    if (walk.n && $('autoFit').checked && !$('autoRotate').checked) followWalker();
    // a big sphere can take tens of ms to draw: while animating, redraw at most every 3× that time
    const now = performance.now();
    if (needsFull || (statsDirty && now - sphereDraw.at > 3 * sphereDraw.cost)) {
      drawGrid();
      drawSphere();
      drawOverlay();
      updateStats();
      sphereDraw.cost = performance.now() - now;
      sphereDraw.at = now;
      needsFull = statsDirty = false;
    }
    requestAnimationFrame(tick);
    return;
  }
  if (needsFull || (walk.is3d && statsDirty)) drawGrid(); // the 3D box grows with the walk
  if (needsFull) {
    layers.path.clearRect(0, 0, cw, ch);
    drawn = 0;
  }
  if (walk.n && drawn < cur) {
    drawSegments(drawn, cur);
    drawn = cur;
    statsDirty = true;
  }
  if (needsFull || statsDirty) {
    drawOverlay();
    updateStats();
  }
  needsFull = false;
  statsDirty = false;
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 * Interactions                                                       *
 * ------------------------------------------------------------------ */
$('compute').addEventListener('click', compute);
$('play').addEventListener('click', () => {
  if (cur >= walk.n) restart();
  play(!playing);
});
$('step').addEventListener('click', () => { play(false); advanceTo(cur + 1); });
$('restart').addEventListener('click', () => { restart(); play(true); });
$('end').addEventListener('click', () => { advanceTo(walk.n); });
$('fit').addEventListener('click', fitNow);
$('speed').addEventListener('input', updateSpeedLabel);
$('colorMode').addEventListener('change', () => { needsFull = true; });
$('showGrid').addEventListener('change', () => { needsFull = true; });
$('autoFit').addEventListener('change', () => { if ($('autoFit').checked) fitNow(); });

function fitNow() {
  $('autoFit').checked = true;
  fitToBounds(padBounds(bounds));
}

stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const k = Math.exp(-e.deltaY * 0.0015);
  const s = Math.min(200, Math.max(0.005, view.scale * k));
  const f = s / view.scale;
  view.ox = mx - (mx - view.ox) * f;
  view.oy = my - (my - view.oy) * f;
  view.scale = s;
  userMovedView();
}, { passive: false });

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, pan: !walk.is3d || e.shiftKey };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (drag.pan) {
    view.ox += dx;
    view.oy += dy;
    userMovedView();
  } else {
    if (walk.sphere) $('autoFit').checked = false;  // stop following the walker while the user rotates
    rotateView(dx * 0.008, dy * 0.008);
  }
});
const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('dblclick', fitNow);

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type=number], input[type=text], select')) return;
  switch (e.key) {
    case ' ': e.preventDefault(); $('play').click(); break;
    case 'ArrowRight': $('step').click(); break;
    case 'r': case 'R': $('restart').click(); break;
    case 'e': case 'E': $('end').click(); break;
    case 'f': case 'F': fitNow(); break;
  }
});

const groups = {};
for (const [id, { sym, name, group = 'Constants' }] of Object.entries(CONSTANTS)) {
  if (!groups[group]) {
    groups[group] = document.createElement('optgroup');
    groups[group].label = group;
    $('constant').append(groups[group]);
  }
  groups[group].append(new Option(`${sym} — ${name}`, id));
}
for (const p of MERSENNE) {
  const decimals = Math.floor(p * Math.log10(2)) + 1;
  $('mersenneP').add(new Option(`M${SUB(p)} — ${fmt(decimals)} decimal digits`, p));
}
$('mersenneP').value = 44497;
for (const [sign, list] of [[1, PRIMORIAL_PLUS], [-1, PRIMORIAL_MINUS]]) {
  const group = document.createElement('optgroup');
  group.label = sign > 0 ? 'p# + 1' : 'p# − 1';
  for (const p of list) {
    const decimals = Math.round(p / Math.LN10);  // ln(p#) ≈ p
    group.append(new Option(`${fmt(p)}# ${sign > 0 ? '+' : '−'} 1 — ≈ ${fmt(decimals)} decimal digits`, `${p},${sign}`));
  }
  $('primorialP').append(group);
}
$('primorialP').value = '392113,1';
$('primorialP').addEventListener('change', compute);
$('primeSize').addEventListener('change', compute);
$('sphereF').addEventListener('change', () => {
  if (!current) return;
  buildWalk();
  play(true);
});
$('constant').addEventListener('change', compute);
$('mersenneP').addEventListener('change', compute);
$('fraction').addEventListener('change', compute);
$('mode').addEventListener('change', compute);

new ResizeObserver(resize).observe(stage);
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
compute();

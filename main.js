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

    // uniform enough in [0, below): 64 extra random bits, then reduce. With rng (a seeded
    // generator) the result is reproducible; without it, cryptographic randomness is used.
    function randomBigInt(below, rng = null) {
      const bytes = new Uint8Array(Math.ceil(below.toString(16).length / 2) + 8);
      if (rng) for (let i = 0; i < bytes.length; i++) bytes[i] = rng() & 255;
      else crypto.getRandomValues(bytes);
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
      // the start comes from the draw number, so the same draw always finds the same prime
      let start = lo + randomBigInt(9n * lo - 2n * BigInt(W), seededRandom(e.data.seed >>> 0));
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
      case 'pi2': { // π² = (π·S)² / S
        total = atanTerms(5) + atanTerms(239);
        const p = 16n * atanInv(5) - 4n * atanInv(239);
        v = (p * p) / S;
        break;
      }
      case 'epi': { // Gelfond: e^π = (e^(π / 2^r))^(2^r), in binary fixed point with W fractional bits
        const bits = Math.ceil(prec * Math.log2(base));
        const r = Math.max(1, Math.round(Math.sqrt(bits) / 2));  // halvings: balance series terms and squarings
        const W = BigInt(bits + 2 * r + 64);                        // guard bits absorb the 2^r error growth
        const one = 1n << W;
        total = bits / r + r;
        const atanBin = (x) => {  // 2^W·arctan(1/x)
          const bx = BigInt(x), x2 = bx * bx;
          let t = one / bx, sum = t;
          for (let k = 1; ; k++) {
            t /= x2;
            if (t === 0n) break;
            const q = t / BigInt(2 * k + 1);
            sum += k % 2 ? -q : q;
          }
          return sum;
        };
        const y = (16n * atanBin(5) - 4n * atanBin(239)) >> BigInt(r);  // π / 2^r
        let term = one, sum = one;
        for (let k = 1; term !== 0n; k++) {  // Σ y^k / k!
          term = ((term * y) >> W) / BigInt(k);
          sum += term;
          progress(k);
        }
        for (let i = 0; i < r; i++) sum = (sum * sum) >> W;
        v = (sum * S) >> W;
        break;
      }
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
  pi2:   { sym: 'π²',   name: 'Pi squared' },
  e:     { sym: 'e',    name: "Euler's number" },
  epi:   { sym: 'e^π',  name: "Gelfond's constant" },
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
  champernowne: { sym: 'C', name: 'Champernowne constant', group: 'Comparisons' },
  fraction: { sym: 'p/q', name: 'Fraction', group: 'Comparisons' },
  random: { sym: '🎲', name: 'Random digits', group: 'Comparisons' },
  mersenne: { sym: 'Mₚ', name: 'Mersenne prime 2ᵖ − 1', group: 'Primes' },
  primorial: { sym: 'p# ± 1', name: 'Primorial prime', group: 'Primes' },
  primeConst: { sym: 'ρ', name: 'Prime barcode (Ulam)', group: 'Primes',
                note: (b) => `digit k = 0 if k is not prime, else k mod ${b}` },
  primeReal: { sym: 'ρ₂', name: 'Prime constant (binary barcode, converted)', group: 'Primes',
               note: (b) => `ρ = Σ 2^(−p) = 0.0110101000101…₂, the binary barcode read as one number, written in base ${b}` },
  primeGaps: { sym: 'Δp', name: 'Prime gaps', group: 'Primes',
               note: (b) => `one digit per gap between odd primes: (gap / 2) mod ${b}` },
  randomPrime: { sym: '🎲', name: 'Random prime', group: 'Primes' },
};

const MODES = {
  turtle:   { base: 3, lattice: 'square',
              rule: 'Base₃ digits on a square grid — <b>0</b> = turn left + step, <b>1</b> = step forward, <b>2</b> = turn right + step' },
  cardinal: { base: 4, lattice: 'square',
              rule: 'Base₄ digits on a square grid — <b>0</b> = step north, <b>1</b> = east, <b>2</b> = south, <b>3</b> = west' },
  spiral:   { base: 2, lattice: 'square', skipZeros: true,
              rule: 'Base₂ digits along a square spiral (Ulam spiral) — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  jump10:   { base: 10, lattice: 'square', points: 'jump',
              rule: 'Base₁₀ digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  jump64:   { base: 64, lattice: 'square', points: 'jump',
              rule: 'Base₆₄ digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  search10: { base: 10, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base₁₀ — cell <b>n</b> is marked when the digits of n appear in the digits of the number' },
  search64: { base: 64, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base₆₄ — cell <b>n</b> is marked when the base₆₄ digits of n appear in the base₆₄ digits of the number' },
  triSpiral: { base: 2, lattice: 'tri', skipZeros: true,
              rule: 'Base₂ digits along a spiral of triangles — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  hexSpiral: { base: 2, lattice: 'hex', skipZeros: true,
              rule: 'Base₂ digits along a spiral of hexagons — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  triLR:    { base: 2, lattice: 'tri',
              rule: 'Base₂ digits on triangle tiles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge' },
  triFixed: { base: 3, lattice: 'tri',
              rule: 'Base₃ digits on triangle tiles — cross the <b>0</b> = horizontal edge, <b>1</b> = “/” edge, <b>2</b> = “\\” edge' },
  hexRel:   { base: 5, lattice: 'hex',
              rule: 'Base₅ digits on hexagonal tiles, relative to the edge you came in through — <b>0</b> = sharp left, <b>1</b> = left, <b>2</b> = straight, <b>3</b> = right, <b>4</b> = sharp right' },
  hexFixed: { base: 6, lattice: 'hex',
              rule: 'Base₆ digits on hexagonal tiles — <b>0</b> = N, <b>1</b> = NE, <b>2</b> = SE, <b>3</b> = S, <b>4</b> = SW, <b>5</b> = NW' },
  tetraLR:  { base: 2, lattice: 'sphere', sphere: 'tetra', turns: [2, 1],
              rule: 'Base₂ digits on the surface of a tetrahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  torusWalk: { base: 3, lattice: 'sphere', sphere: 'torus', turns: [3, 2, 1], perspective: true, round: true,
              rule: 'Base₃ digits on the surface of a torus of squares — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  cubeFlat: { base: 3, lattice: 'sphere', sphere: 'cube', turns: [3, 2, 1], perspective: true,
              rule: 'Base₃ digits on the surface of a cube — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  octaLR:   { base: 2, lattice: 'sphere', sphere: 'octa', turns: [2, 1],
              rule: 'Base₂ digits on the surface of an octahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  icosaLR:  { base: 2, lattice: 'sphere', sphere: 'icosa', turns: [2, 1], round: true,
              rule: 'Base₂ digits on the surface of an icosahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  lifeTorus:  { base: 2, lattice: 'sphere', sphere: 'torus', life: true, perspective: true, round: true,
                where: 'a torus (a square grid that wraps around both ways)' },
  lifeCube:   { base: 2, lattice: 'sphere', sphere: 'cube', life: true, perspective: true,
                where: 'the surface of a cube' },
  lifeTetra:  { base: 2, lattice: 'sphere', sphere: 'tetra', life: true,
                where: 'a tetrahedron of triangles' },
  lifeOcta:   { base: 2, lattice: 'sphere', sphere: 'octa', life: true,
                where: 'an octahedron of triangles' },
  lifeIcosa:  { base: 2, lattice: 'sphere', sphere: 'icosa', life: true, round: true,
                where: 'an icosahedron of triangles' },
  cubeRel:  { base: 5, lattice: 'cube', perspective: true,
              rule: 'Base₅ digits in 3D cubes, relative to your heading — <b>0</b> = turn left, <b>1</b> = turn up, <b>2</b> = straight, <b>3</b> = turn down, <b>4</b> = turn right' },
  cubeFixed: { base: 6, lattice: 'cube', perspective: true,
              rule: 'Base₆ digits in 3D cubes — <b>0</b> = north, <b>1</b> = east, <b>2</b> = up, <b>3</b> = south, <b>4</b> = west, <b>5</b> = down' },
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
  const { base, rule, life, where } = MODES[$('mode').value];
  $('rule').innerHTML = life ? lifeSubtitle(where) : rule;
  $('sCountsLabel').textContent = Array.from({ length: base }, (_, i) => i).join(' / ');
  $('sCountsLabel').hidden = $('sCounts').hidden = base > 6 || !!MODES[$('mode').value].life;  // nothing useful to list
}

// Game of Life needs one base-C digit per cell; walks use the requested number of digits
function digitsNeeded() {
  const mode = MODES[$('mode').value];
  return mode.life ? SPHERES[mode.sphere].tiles(Number($('sphereF').value)) : requestedDigits();
}

// Game of Life subtitle: where it is played and how the base-C digits seed the cells
function lifeSubtitle(where) {
  const C = lifeStates();
  const states = C > 2 ? `, <b>2</b>${C > 3 ? `–<b>${C - 1}</b>` : ''} = dying` : '';
  return `Game of Life on ${where} — the base${SUB(C)} digits seed the cells (<b>0</b> = dead, <b>1</b> = alive${states}); ` +
    'neighbours share an edge or a corner';
}

// The colour menu means something else for the Game of Life, and depends on its number of states.
// In Life the plain states come first (the default); walks keep the gradient first.
function relabelColours(life) {
  const C = life ? lifeStates() : 2;
  const dying = C === 3 ? ' · dying' : C > 3 ? ` · ${C - 2} dying` : '';
  const names = !life ? { gradient: 'Gradient (order)', digit: 'By digit', mono: 'Monochrome' }
    : { mono: `States: alive${dying} · dead`,
        gradient: C > 2 ? 'Age of live cells + dying stages' : 'Age of live cells + fading trail',
        digit: 'Activity (state changes)' };
  const sel = $('colorMode'), chosen = sel.value;
  const order = life ? ['mono', 'gradient', 'digit'] : ['gradient', 'digit', 'mono'];
  const byValue = Object.fromEntries(Array.from(sel.options, (o) => [o.value, o]));
  order.forEach((v) => { byValue[v].text = names[v]; sel.append(byValue[v]); });
  sel.value = chosen;
}

function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(1_000_000, Math.max(10, n || 10));
}

const SUB = (v) => String(v).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);

// Seeded pseudo-random generator (mulberry32): a draw number gives a reproducible stream of 32-bit
// integers, so random digits and random primes can be saved and shared as just that number
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
let currentDraw = 0;      // draw number of the random number shown
let pendingDraw = null;   // draw number to reuse at the next compute (a loaded setup), else a fresh one
const freshDraw = () => crypto.getRandomValues(new Uint32Array(1))[0] % 1e9;

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
    return { sym: `🎲 p${SUB(size)}`, key: null, size };  // never cached: a new prime each time
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
  if (id === 'random') {  // reproducible: the same draw number always gives the same digits
    const rng = seededRandom(currentDraw);
    const lim = 2 ** 32 - (2 ** 32 % base);  // rejection sampling for a uniform distribution
    for (let i = 0; i < n; i++) {
      let r;
      do r = rng(); while (r >= lim);
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
  if (id === 'primeReal') {
    // the real number ρ = Σ 2^(−p): its binary expansion is the barcode (bit k = 1 when k is prime).
    // Keep enough bits (+ 64 guard bits), then its first n digits in base b are ⌊ρ·b^n⌋.
    const bits = Math.ceil(n * Math.log2(base)) + 64;
    const composite = sieve(bits);
    let barcode = '';
    for (let k = 1; k <= bits; k++) barcode += composite[k] ? '0' : '1';
    const scaled = (BigInt(`0b${barcode}`) * BigInt(base) ** BigInt(n)) >> BigInt(bits);
    const s = digitString(scaled, base).padStart(n, '0');
    for (let i = 0; i < n; i++) digits[i] = s.charCodeAt(i) - 48;
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
  const mode = MODES[$('mode').value];
  if (mode.sphere) fillSphereSizes(mode.sphere);
  const n = digitsNeeded();
  const id = $('constant').value;
  const info = numberInfo(id);
  const { sym } = info;
  if (!mode.life) $('digits').value = n;
  relabelColours(!!mode.life);
  $('lifeRuleRow').hidden = !mode.life;
  // a new number, surface, size or rule ends any hunt: its champion would not fit any more
  $('huntRow').hidden = !mode.life;
  stopHunt();
  $('huntStatus').textContent = '';
  $('digitsRow').hidden = !!mode.life;  // Life takes one digit per cell of the surface
  // Life recomputes on every change: Compute is only kept to redraw a random number
  $('compute').hidden = !!mode.life && !['random', 'randomPrime'].includes($('constant').value);
  if (!$('compute').disabled) $('compute').textContent = computeLabel();
  $('lifeCustomRow').hidden = !mode.life || $('lifePreset').value !== 'custom';
  $('titleSym').textContent = sym;
  $('fractionRow').hidden = id !== 'fraction';
  $('mersenneRow').hidden = id !== 'mersenne';
  $('primorialRow').hidden = id !== 'primorial';
  $('primeSizeRow').hidden = id !== 'randomPrime';
  $('sphereRow').hidden = MODES[$('mode').value].lattice !== 'sphere';
  const integer = INTEGER_IDS.includes(id);
  const base = mode.life ? lifeStates() : mode.base;  // Life: the number of states of the rule
  const key = `${info.key}/${base}`;
  // Status wording: "π in base 3 · 20,000 digits" for walks, "10,240 cells seeded with π in base 3" for Life
  const cells = mode.life ? n : 0;
  const label = (count) => (!mode.life ? `${sym} in base ${base} · ${fmt(count)} digits`
    : count < cells ? `${fmt(count)} of ${fmt(cells)} cells seeded with ${sym} in base ${base} (the others start dead)`
    : `${fmt(cells)} cells seeded with ${sym} in base ${base}`);
  updateRuleText();
  if (worker) { worker.terminate(); worker = null; setBusy(false); }
  championCode = null;  // a new start: no loaded champion any more
  const random = id === 'random' || id === 'randomPrime';
  if (random) { currentDraw = pendingDraw ?? freshDraw(); pendingDraw = null; }
  const draw = random ? ` · draw #${currentDraw}` : '';

  if (['random', 'champernowne', 'fraction', 'primeConst', 'primeReal', 'primeGaps'].includes(id)) {
    const entry = localDigits(id, n, base);
    if (!entry) {
      $('status').textContent = 'Enter a fraction like 22/7';
      return;
    }
    setCurrent(entry);
    const { note } = CONSTANTS[id];
    $('status').textContent = (note ? `${label(n)} — ${note(base)}` : label(n)) + draw;
    buildWalk();
    showAll();
    applyPendingView();
    return;
  }

  const done = (entry, how) => {
    setCurrent(entry);
    const total = entry.total ?? current.head.length + current.digits.length;
    const what = id === 'randomPrime'
      ? `${label(total)}: a random ${fmt(info.size)}-digit probable prime, found after ${fmt(entry.tests)} Miller–Rabin tests`
      : integer ? label(total) : label(n);
    $('status').textContent = `${what} ${how}${integer && total > n && !mode.life ? ` — walking the first ${fmt(n)}` : ''}${draw}`;
    buildWalk();
    showAll();
    applyPendingView();
  };
  const hit = info.key && cache[key];
  const enough = integer ? hit && (hit.intPart.length >= n || hit.intPart.length === hit.total)
                         : hit && hit.digits.length >= n;
  if (enough) {
    done(hit, '(cached)');
    return;
  }
  // the worker also needs digitString and seededRandom
  const src = `${digitString.toString()}\n${seededRandom.toString()}\n(${constantWorker.toString()})()`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  const slow = (id === 'mersenne' && info.p > 20_000_000) || (id === 'randomPrime' && info.size > 1000);
  $('status').textContent =
    (id === 'randomPrime' ? `Searching for a random ${fmt(info.size)}-digit prime…`
      : `Computing ${integer || mode.life ? `${sym} in base ${base}` : label(n)}…`) +
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
  worker.postMessage({ id, n, base, p: info.p, sign: info.sign, size: info.size, seed: currentDraw });
}

// Label of the Compute button: in Life it is only useful to draw a new random seed
const computeLabel = () => (MODES[$('mode').value].life ? 'New random draw' : 'Compute');

function setBusy(busy) {
  $('compute').disabled = busy;
  $('compute').textContent = busy ? 'Computing…' : computeLabel();
  $('progressBar').style.width = '0';
  $('progress').hidden = !busy;  // the bar only shows while computing
}

function buildWalk() {
  walk.shape = null;  // only tiled surfaces that can change shape get one (see initShape)
  const n = MODES[current.mode].life ? digitsNeeded() : requestedDigits();
  // n digits in total: the integer part (always included) then the digits after the point
  const head = current.head.subarray(0, n);
  const frac = current.digits.subarray(0, n - head.length);
  const seq = new Uint8Array(head.length + frac.length);
  seq.set(head);
  seq.set(frac, head.length);
  if (MODES[current.mode].points) {
    buildPointWalk(seq, MODES[current.mode]);
    return;
  }
  if (MODES[current.mode].life) {
    buildLife(seq, MODES[current.mode].sphere);
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
                        points: false, keys: seq, labels: null, sphere: false, life: null,
                        xs: is3d ? new Float64Array(len + 1) : wx,
                        ys: is3d ? new Float64Array(len + 1) : wy });
  if (is3d) { setPerspective(); project(); } else { walk.persp = null; $('perspectiveRow').hidden = true; }
  updateHint();
  restart();
}

// Orthographic projection of a 3D point onto the screen plane (world units)
function orthoPoint(x, y, z) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return [x * cy - y * sy, -(z * cp + (x * sy + y * cy) * sp)];
}

/* Perspective (walk.persp = { c, D }): a camera at distance D from the centre c, looking at it.
 * A point whose depth towards the camera is t (relative to c) is scaled by D / (D − t) around the
 * projection of c, so nearer parts look bigger. Without it the projection stays orthographic. */
function projectPoint(x, y, z) {
  const [px, py] = orthoPoint(x, y, z);
  const P = walk.persp;
  if (!P) return [px, py];
  const [cx, cy] = orthoPoint(...P.c);
  const k = P.D / (P.D - towardViewer(x - P.c[0], y - P.c[1], z - P.c[2]));
  return [cx + (px - cx) * k, cy + (py - cy) * k];
}

// Same projection as projectPoint, with the trigonometry computed once: for drawing many points
function projector() {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const P = walk.persp;
  const [ccx, ccy] = P ? orthoPoint(...P.c) : [0, 0];
  return (x, y, z) => {
    let X = x * cy - y * sy, Y = -(z * cp + (x * sy + y * cy) * sp);
    if (P) {
      const k = P.D / (P.D - ((z - P.c[2]) * sp - ((x - P.c[0]) * sy + (y - P.c[1]) * cy) * cp));
      X = ccx + (X - ccx) * k;
      Y = ccy + (Y - ccy) * k;
    }
    return [X, Y];
  };
}

// Projection of the whole 3D walk (xs, ys), same formula as projectPoint
function project() {
  const { wx, wy, wz, xs, ys } = walk;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const P = walk.persp;
  const [ccx, ccy] = P ? orthoPoint(...P.c) : [0, 0];
  for (let i = 0; i < xs.length; i++) {
    xs[i] = wx[i] * cy - wy[i] * sy;
    ys[i] = -(wz[i] * cp + (wx[i] * sy + wy[i] * cy) * sp);
    if (P) {
      const t = (wz[i] - P.c[2]) * sp - ((wx[i] - P.c[0]) * sy + (wy[i] - P.c[1]) * cy) * cp;
      const k = P.D / (P.D - t);
      xs[i] = ccx + (xs[i] - ccx) * k;
      ys[i] = ccy + (ys[i] - ccy) * k;
    }
  }
}

// Perspective can apply to every 3D view (checkbox; on by default for the cube walks and the cube surface)
const perspectiveAllowed = () => walk.is3d;

// Set walk.persp from the checkbox: centre and size from the whole walk (or the solid), camera
// at 2.5 × that radius, i.e. a field of view of roughly 45°
function setPerspective() {
  $('perspectiveRow').hidden = !perspectiveAllowed();
  if (!perspectiveAllowed() || !$('perspective').checked) { walk.persp = null; return; }
  if (walk.sphere) {
    // one camera distance for both forms of the shape (the flat torus is wider)
    walk.persp = { c: [0, 0, 0], D: 2.5 * walk.R * walk.shape.maxExtent };
    return;
  }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const W = [walk.wx, walk.wy, walk.wz];
  for (let i = 0; i <= walk.n; i++) {
    for (let d = 0; d < 3; d++) { lo[d] = Math.min(lo[d], W[d][i]); hi[d] = Math.max(hi[d], W[d][i]); }
  }
  const radius = Math.max(3, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
  walk.persp = { c: [0, 1, 2].map((d) => (lo[d] + hi[d]) / 2), D: 2.5 * radius };
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
  $('end').title = Number.isFinite(walk.n) ? 'Jump to end (E)' : `Jump ${fmt(LIFE_JUMP)} generations ahead (E)`;
  $('hint').textContent = walk.is3d
    ? 'Drag: rotate · Shift+drag: pan · Wheel: zoom · Double-click: fit'
    : 'Wheel: zoom · Drag: pan · Double-click: fit';
  $('autoRotateRow').hidden = !walk.is3d;
  $('skyRow').hidden = !walk.is3d;
  $('perspectiveRow').hidden = !perspectiveAllowed();
  updateMorphButton();  // shown only for surfaces that can change shape
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
  walk.persp = null;
  Object.assign(walk, { n: len, digits: seq, wx: xs, wy: ys, wz: null, is3d: false, cells, maxDist, base,
                        counts: null, lattice: 'square', skipZeros: false, points: true, keys, labels: cellsOf,
                        sphere: false, life: null,
                        xs, ys });
  updateHint();
  restart();
}

/* Tiled surfaces. A mesh lists each tile's vertices counterclockwise seen from outside
 * (poly[sides·t + k]); nbr[sides·t + k] is the tile across edge k (vertex k to vertex k + 1)
 * and nbrEdge[…] the index of that same edge in the neighbour. */
const meshCache = {};

// Shared vertex store: points are merged when equal
function vertexStore() {
  const verts = [], index = new Map();
  const add = (x, y, z) => {
    const f = (v) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(9);  // no "-0.000000000" apart from "0.000000000"
    const k = `${f(x)},${f(y)},${f(z)}`;
    if (!index.has(k)) { index.set(k, verts.length / 3); verts.push(x, y, z); }
    return index.get(k);
  };
  return { verts, add };
}

// Orient every tile counterclockwise, compute centres, outward normals and edge adjacency.
// outwardRef(centre) gives a vector pointing outwards near a tile (default: from the solid's centre)
function finishMesh(verts, tiles, sides, size, outwardRef = (m) => m) {
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
    const ref = outwardRef(m.map((v) => v / sides));
    const inward = nrm[0] * ref[0] + nrm[1] * ref[1] + nrm[2] * ref[2] < 0;
    poly.set(inward ? [t[0], ...t.slice(1).reverse()] : t, sides * i);
    const l = Math.hypot(...nrm) * (inward ? -1 : 1);
    cen.set(m.map((v) => v / sides), 3 * i);
    nrmOut.set(nrm.map((v) => v / l), 3 * i);
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
  let extent = 0;  // distance of the farthest vertex from the centre
  for (let v = 0; v < nv; v++) extent = Math.max(extent, Math.hypot(verts[3 * v], verts[3 * v + 1], verts[3 * v + 2]));
  return { size, n, sides, extent, verts: new Float64Array(verts), poly, cen, nrm: nrmOut, nbr, nbrEdge };
}

/* Cube: each face cut into n × n squares. */
function cubeFlat(n) {
  const key = `flat${n}`;
  if (meshCache[key]) return meshCache[key];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  const { verts, add } = vertexStore();
  const quads = [];
  for (const [N, U, W] of faces) {
    const at = (i, j) => add(...[0, 1, 2].map((d) => N[d] + U[d] * (2 * i / n - 1) + W[d] * (2 * j / n - 1)));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) quads.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  const mesh = finishMesh(verts, quads, 4, n);
  // each face as one big square, with its grid lines, for cheap drawing
  mesh.faces = faces.map(([N, U, W]) => {
    const pt = (a, b) => [0, 1, 2].map((d) => N[d] + U[d] * a + W[d] * b);
    const lines = [];
    for (let i = 0; i <= n; i++) {
      const c = 2 * i / n - 1;
      lines.push([pt(c, -1), pt(c, 1)], [pt(-1, c), pt(1, c)]);
    }
    return { corners: [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)], normal: N, lines };
  });
  mesh.perFace = n * n;
  return (meshCache[key] = mesh);
}

/* Flat polyhedra with triangular faces, each face cut into f² triangles (not inflated):
 * tetrahedron (4 faces, corners shared by 3 triangles instead of 6), octahedron (8 faces,
 * corners shared by 4) and icosahedron (20 faces, corners shared by 5). */
const PHI = (1 + Math.sqrt(5)) / 2;
const POLYHEDRA = {
  tetra: { P: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
           faces: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]] },
  octa:  { P: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
           faces: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]] },
  icosa: { P: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
               [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]],
           faces: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
                   [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8],
                   [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]] },
};

function flatPolyhedron(name, f) {
  const key = `${name}${f}`;
  if (meshCache[key]) return meshCache[key];
  const { P, faces } = POLYHEDRA[name];
  const { verts, add } = vertexStore();
  const tris = [];
  for (const [A, B, C] of faces.map((face) => face.map((v) => P[v]))) {
    const at = (i, j) => add(...[0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f));
    for (let i = 0; i < f; i++) {
      for (let j = 0; i + j < f; j++) {
        tris.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (i + j < f - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
    }
  }
  const mesh = finishMesh(verts, tris, 3, f);
  // each face as one big triangle, with its three families of grid lines, for cheap drawing
  mesh.faces = faces.map((face) => {
    const [A, B, C] = face.map((v) => P[v]);
    const mix = (p, q, t) => [0, 1, 2].map((d) => p[d] + (q[d] - p[d]) * t);
    const lines = [];
    for (let i = 0; i <= f; i++) {
      const t = i / f;
      lines.push([mix(A, B, t), mix(A, C, t)], [mix(B, A, t), mix(B, C, t)], [mix(C, A, t), mix(C, B, t)]);
    }
    const m = [0, 1, 2].map((d) => A[d] + B[d] + C[d]);
    let normal = cross(A.map((v, d) => B[d] - v), A.map((v, d) => C[d] - v));
    if (normal[0] * m[0] + normal[1] * m[1] + normal[2] * m[2] < 0) normal = normal.map((v) => -v);
    const l = Math.hypot(...normal);
    return { corners: [A, B, C], normal: normal.map((v) => v / l), lines };
  });
  mesh.perFace = f * f;
  return (meshCache[key] = mesh);
}

/* Torus (a ring or "donut"): nu × nv squares, nu around the ring and nv around the tube, with
 * major radius 1 and tube radius TORUS_TUBE. Every square has 4 edge neighbours and 8 corner
 * neighbours with no exception: it is the square grid that wraps around both ways. */
const TORUS_TUBE = 0.4;

/* Grid point (i, j) of an nu × nv torus, rolled up by m ∈ [0, 1]: at m = 0 a flat rectangle
 * (2π by 2π·TUBE, in the x–z plane), at m = 1 the torus. The rectangle first curls into a tube
 * (m from 0 to ½: its short side bends into a circle), then the tube bends into a ring (½ to 1).
 * Bending a length L into an arc of a circle whose circumference is L / k keeps lengths along it. */
function torusPoint(i, j, nu, nv, m) {
  const b = Math.min(1, 2 * m), c = Math.max(0, 2 * m - 1);  // tube bend, then ring bend
  const X = (i / nu - 0.5) * 2 * Math.PI, Y = (j / nv - 0.5) * 2 * Math.PI * TORUS_TUBE;
  let w = 0, h = Y;  // w: offset away from the ring's centre, h: height
  if (b > 1e-6) {
    const rt = TORUS_TUBE / b, th = Y / rt;
    w = rt * (Math.cos(th) - 1) + TORUS_TUBE * b;
    h = rt * Math.sin(th);
  }
  if (c < 1e-6) return [X, w, h];
  const rr = 1 / c, ph = X / rr;
  return [(rr + w) * Math.sin(ph), (rr + w) * Math.cos(ph) - rr + 1, h];
}

function torusMesh(nv) {
  const key = `torus${nv}`;
  if (meshCache[key]) return meshCache[key];
  const nu = Math.round(nv / TORUS_TUBE);  // squares about as long around the ring as around the tube
  const { verts, add } = vertexStore();
  const at = (i, j) => add(...torusPoint(i, j, nu, nv, 1));  // i = nu and i = 0 meet (same for j)
  const quads = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) quads.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
  }
  // outwards = away from the circle running through the middle of the tube
  const fromTubeAxis = ([x, y, z]) => { const l = Math.hypot(x, y) || 1; return [x - x / l, y - y / l, z]; };
  const mesh = finishMesh(verts, quads, 4, nv, fromTubeAxis);
  mesh.torus = true;
  mesh.nu = nu;
  mesh.nv = nv;
  return (meshCache[key] = mesh);
}

/* ------------------------------------------------------------------ *
 * Flat ↔ round: the same tiles and neighbours, shown flat or inflated *
 * ------------------------------------------------------------------ */
/* walk.shape = { m, target, corners, cen, nrm, extent } for surfaces that can change shape:
 * polyhedra (each vertex slides from its face towards the circumscribed sphere) and the torus
 * (rolled up from a flat rectangle). The cells and their neighbours never change, so a walk or a
 * Game of Life run goes on unchanged: only the drawing and the 3D positions move. */
const MORPHABLE = ['cube', 'tetra', 'octa', 'icosa', 'torus'];

function shapeAt(g, m) {
  const k = g.sides, n = g.n;
  const corners = new Float64Array(3 * k * n), cen = new Float64Array(3 * n), nrm = new Float64Array(3 * n);
  if (g.torus) {
    // per tile, from its grid indices (tile i·nv + j): at m < 1 the seams open, so corners are not shared
    const { nu, nv } = g;
    for (let t = 0; t < n; t++) {
      const i = Math.floor(t / nv), j = t % nv;
      [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].forEach(([a, b], q) => corners.set(torusPoint(a, b, nu, nv, m), 3 * (k * t + q)));
    }
  } else {
    const nv = g.verts.length / 3, R0 = g.extent, moved = new Float64Array(3 * nv);
    for (let v = 0; v < nv; v++) {  // slide towards the sphere through the corners
      const x = g.verts[3 * v], y = g.verts[3 * v + 1], z = g.verts[3 * v + 2], s = 1 + m * (R0 / Math.hypot(x, y, z) - 1);
      moved.set([x * s, y * s, z * s], 3 * v);
    }
    for (let t = 0; t < n; t++) {
      for (let q = 0; q < k; q++) corners.set(moved.subarray(3 * g.poly[k * t + q], 3 * g.poly[k * t + q] + 3), 3 * (k * t + q));
    }
  }
  let extent = 0;
  const sign = shapeSign(g);
  for (let t = 0; t < n; t++) {
    const P = (q) => corners.subarray(3 * (k * t + q), 3 * (k * t + q) + 3);
    const c = [0, 1, 2].map((d) => { let sum = 0; for (let q = 0; q < k; q++) sum += P(q)[d]; return sum / k; });
    const d1 = [0, 1, 2].map((d) => P(2)[d] - P(0)[d]), d2 = [0, 1, 2].map((d) => P(k - 1)[d] - P(1)[d]);
    const nr = cross(d1, d2), l = (Math.hypot(...nr) || 1) * sign;
    cen.set(c, 3 * t);
    nrm.set(nr.map((v) => v / l), 3 * t);
    for (let q = 0; q < k; q++) extent = Math.max(extent, Math.hypot(...P(q)));
  }
  return { m, corners, cen, nrm, extent };
}

// Torus corners are listed in grid order, which may run against the mesh's outward order: the sign
// that makes their normals point outwards, found once by comparing with the mesh at m = 1
function shapeSign(g) {
  if (!g.torus) return 1;
  if (g.shapeSign) return g.shapeSign;
  const { nu, nv } = g, P = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => torusPoint(a, b, nu, nv, 1));
  const nr = cross([0, 1, 2].map((d) => P[2][d] - P[0][d]), [0, 1, 2].map((d) => P[3][d] - P[1][d]));
  g.shapeSign = nr[0] * g.nrm[0] + nr[1] * g.nrm[1] + nr[2] * g.nrm[2] >= 0 ? 1 : -1;
  return g.shapeSign;
}

// A new surface starts in its mode's default form: round for the icosahedron and the torus, flat otherwise
function initShape(kind) {
  if (!MORPHABLE.includes(kind)) { walk.shape = null; updateMorphButton(); return; }
  const g = walk.geo, m = MODES[current.mode].round ? 1 : 0;
  const maxExtent = Math.max(shapeAt(g, 0).extent, shapeAt(g, 1).extent);
  walk.shape = { ...shapeAt(g, m), target: m, maxExtent };
}

// Put the current shape in place: tile centres of the walk's points, the frame and the view
function applyShape() {
  const sh = walk.shape, R = walk.R;
  if (!walk.life) {  // walk points sit on their tiles' centres
    const { wx, wy, wz, tile } = walk;
    for (let i = 0; i <= walk.n; i++) {
      const t = tile[i];
      wx[i] = sh.cen[3 * t] * R; wy[i] = sh.cen[3 * t + 1] * R; wz[i] = sh.cen[3 * t + 2] * R;
    }
  }
  project();
  const F = R * sh.extent;
  bounds = { minX: -F, maxX: F, minY: -F, maxY: F };
  bounds3 = [-F, F, -F, F, -F, F];
  if ($('autoFit').checked) fitToBounds(padBounds(bounds));
  needsFull = true;
  updateMorphButton();
}

function updateMorphButton() {
  const sh = walk.shape, btn = $('morphBtn');
  btn.hidden = !sh;
  if (!sh) return;
  const round = sh.target === 1;
  btn.textContent = walk.geo.torus ? (round ? '▭ Unroll' : '◎ Roll up') : (round ? '◇ Flatten' : '● Inflate');
}

// One animation frame of the change of shape (about 0.7 s from flat to round)
function morphStep(dt) {
  const sh = walk.shape;
  if (!sh || sh.m === sh.target) return;
  const m = sh.target > sh.m ? Math.min(sh.target, sh.m + dt / 0.7) : Math.max(sh.target, sh.m - dt / 0.7);
  Object.assign(sh, shapeAt(walk.geo, m));
  applyShape();
}

const SPHERES = {
  cube: { mesh: cubeFlat, radius: (n) => n / 2,                 // half the cube side: square edge = 1 unit
          sizes: [8, 16, 32, 64, 128], initial: 32, tiles: (n) => 6 * n * n, unit: 'squares' },
  // flat polyhedra: radius = f / (edge of the solid) so that a small triangle's edge is 1 unit
  torus: { mesh: torusMesh, radius: (nv) => nv / (2 * Math.PI * TORUS_TUBE),  // edge around the tube = 1 unit
          sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (nv) => Math.round(nv / TORUS_TUBE) * nv, unit: 'squares' },
  tetra: { mesh: (f) => flatPolyhedron('tetra', f), radius: (f) => f / (2 * Math.SQRT2),  // edge 2√2
          sizes: [8, 16, 32, 64, 128], initial: 32, tiles: (f) => 4 * f * f, unit: 'triangles' },
  octa:  { mesh: (f) => flatPolyhedron('octa', f), radius: (f) => f / Math.SQRT2,          // edge √2
          sizes: [8, 16, 32, 64, 128], initial: 16, tiles: (f) => 8 * f * f, unit: 'triangles' },
  icosa: { mesh: (f) => flatPolyhedron('icosa', f), radius: (f) => f / 2,                  // edge 2
          sizes: [8, 16, 32, 64], initial: 16, tiles: (f) => 20 * f * f, unit: 'triangles' },
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
    // distance from the start, in a straight line
    m = Math.max(m, R * Math.hypot(g.cen[3 * t] - c0[0], g.cen[3 * t + 1] - c0[1], g.cen[3 * t + 2] - c0[2]));
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
                        life: null, xs: new Float64Array(len + 1), ys: new Float64Array(len + 1) });
  initShape(kind);
  setPerspective();
  project();
  updateHint();
  restart();
  if (walk.shape) applyShape();
}

/* ------------------------------------------------------------------ *
 * Game of Life on the tiled surfaces                                 *
 * ------------------------------------------------------------------ */
const LIFE_JUMP = 2000;  // the Game of Life has no end: ⏭ jumps this many generations ahead
// fading trail after a cell dies: from a light slate grey down to the background
const LIFE_TRAIL = Array.from({ length: 8 }, (_, i) => {
  const f = 1 - i / 8, mix = (a, b) => Math.round(b + (a - b) * f);
  return `rgb(${mix(0x6b, 0x1f)}, ${mix(0x7f, 0x26)}, ${mix(0x99, 0x30)})`;
});

// Neighbours of each tile: every other tile sharing an edge or a corner with it
// (12 for triangles, 8 for squares, fewer next to the solid's corners). Compact lists.
function cornerNeighbours(g) {
  if (g.life) return g.life;
  const nv = g.verts.length / 3, k = g.sides;
  const byVertex = Array.from({ length: nv }, () => []);
  for (let t = 0; t < g.n; t++) for (let j = 0; j < k; j++) byVertex[g.poly[k * t + j]].push(t);
  const start = new Int32Array(g.n + 1), list = [];
  for (let t = 0; t < g.n; t++) {
    const set = new Set();
    for (let j = 0; j < k; j++) for (const u of byVertex[g.poly[k * t + j]]) if (u !== t) set.add(u);
    list.push(...set);
    start[t + 1] = list.length;
  }
  return (g.life = { start, list: new Int32Array(list) });
}

// "B3/S23" or "B2/S/C3" → birth and survival tables indexed by the number of live neighbours,
// and C, the number of states: 2 for Life, more for "Generations" rules (dying stages)
function parseRule(text) {
  const m = text.replace(/\s/g, '').toUpperCase().match(/^B(\d*)\/S(\d*)(?:\/C(\d+))?$/);
  if (!m) return null;
  const C = m[3] ? Number(m[3]) : 2;
  if (C < 2 || C > 10) return null;  // one digit per cell in base C: bases 2 to 10
  const table = (digits) => { const a = new Uint8Array(13); for (const d of digits) a[+d] = 1; return a; };
  return { B: table(m[1]), S: table(m[2]), C, text: `B${m[1]}/S${m[2]}${C > 2 ? `/C${C}` : ''}` };
}

// Number of states of the current Life rule = the base the number is written in
const lifeStates = () => (parseRule($('lifeRule').value) || { C: 2 }).C;

function buildLife(seq, kind) {
  fillSphereSizes(kind);
  const { mesh, radius } = SPHERES[kind];
  const size = Number($('sphereF').value);
  const g = mesh(size);
  const rule = parseRule($('lifeRule').value) || parseRule('B3/S23');
  $('lifeRule').value = rule.text;
  const seed = new Uint8Array(g.n);
  seed.set(seq.subarray(0, g.n));  // one base-C digit per cell: its initial state (0 dead, 1 alive, 2… dying)
  const n = g.n;
  walk.life = { nbr: cornerNeighbours(g), B: rule.B, S: rule.S, C: rule.C, ruleText: rule.text, seed,
                seedAlive: seed.reduce((a, v) => a + (v === 1), 0),
                seedDying: seed.reduce((a, v) => a + (v > 1), 0),
                alive: new Uint8Array(n), next: new Uint8Array(n), age: new Uint16Array(n),
                died: new Int32Array(n), activity: new Uint32Array(n), ever: new Uint8Array(n) };
  const one = new Float64Array(1);
  Object.assign(walk, { n: Infinity, digits: seq, wx: one, wy: one, wz: one, is3d: true, cells: null,
                        maxDist: null, base: rule.C, counts: null, lattice: 'sphere', skipZeros: false, points: false,
                        keys: seq, labels: null, sphere: true, geo: g, R: radius(size), tile: new Int32Array(1),
                        coverStep: -1, visits: new Int32Array(n), maxVisits: 0,
                        xs: new Float64Array(1), ys: new Float64Array(1) });
  initShape(kind);
  setPerspective();
  project();
  updateHint();
  restart();
  if (walk.shape) applyShape();
}

function lifeReset() {
  const L = walk.life;
  L.alive.set(L.seed);  // cell states: 0 dead, 1 alive, 2 … C−1 dying
  for (let t = 0; t < L.alive.length; t++) {
    L.age[t] = L.alive[t] === 1 ? 1 : 0;
    L.ever[t] = L.alive[t] === 1 ? 1 : 0;
  }
  L.died.fill(-1e9);
  L.activity.fill(0);
  L.maxActivity = 0;
  L.aliveCount = L.everAlive = L.seedAlive;
  L.dyingCount = L.seedDying;
  L.born = L.dead = 0;
  // lifetime: fingerprint of every generation's state; the first repeat gives the loop
  L.seen = new Map([[lifeFingerprint(L.alive), 0]]);
  L.stable = null;  // { T: first generation of the loop, P: its period, extinct }
}

/* The whole state as a 53-bit number (two FNV-1a style 32-bit hashes). When a fingerprint comes
 * back at generation g after first appearing at generation T, the pattern loops from T with
 * period g − T (1 = frozen). With N cells there are 2^N states, so this always happens eventually. */
const LIFE_TRACK = 200000;  // generations remembered before giving up
function lifeFingerprint(state) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let t = 0; t < state.length; t++) {
    h1 = Math.imul(h1 ^ state[t], 0x01000193);
    h2 = Math.imul(h2 ^ (state[t] + t), 0x5bd1e995);
  }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

// Record generation gen (state already in L.alive) and detect the first repeat
function lifeTrack(gen) {
  const L = walk.life;
  if (L.stable || L.seen.size >= LIFE_TRACK) return;
  const key = lifeFingerprint(L.alive);
  const first = L.seen.get(key);
  if (first === undefined) L.seen.set(key, gen);
  else L.stable = { T: first, P: gen - first, extinct: L.aliveCount === 0 && L.dyingCount === 0 };
}

// One generation. Only alive cells (state 1) count as live neighbours. With C > 2 states a
// cell that fails to survive goes through the dying states 2 … C−1 and cannot be born again
// until it is dead (state 0). A cell dying at generation g records died = g (fading trail).
function lifeStep() {
  const L = walk.life, { start, list } = L.nbr, a = L.alive, b = L.next, gen = cur + 1, C = L.C;
  let alive = 0, dying = 0;
  for (let t = 0; t < a.length; t++) {
    const was = a[t];
    let now;
    if (was >= 2) {
      now = was + 1 < C ? was + 1 : 0;  // one more dying stage, or dead
    } else {
      let c = 0;
      for (let q = start[t]; q < start[t + 1]; q++) c += a[list[q]] === 1;
      now = was ? (L.S[c] ? 1 : C > 2 ? 2 : 0) : L.B[c];
    }
    b[t] = now;
    if (now === 1) alive++;
    else if (now >= 2) dying++;
    if (now === was) {
      if (now === 1 && L.age[t] < 65535) L.age[t]++;
      continue;
    }
    L.maxActivity = Math.max(L.maxActivity, ++L.activity[t]);
    if (now === 1) {
      L.born++;
      L.age[t] = 1;
      if (!L.ever[t]) { L.ever[t] = 1; L.everAlive++; }
    } else if (was === 1) {
      L.dead++;
      L.age[t] = 0;
      L.died[t] = gen;
    }
  }
  L.alive = b;
  L.next = a;
  L.aliveCount = alive;
  L.dyingCount = dying;
  lifeTrack(gen);
}

/* ------------------------------------------------------------------ *
 * Methuselah hunt: the starting pattern that lasts longest            *
 * ------------------------------------------------------------------ */
/* Runs in a Web Worker. Lifetime = T, the generation where the run starts repeating (dying out,
 * frozen or looping), found with the same state fingerprints as the Lifetime stat.
 * Phase 1: random starts (each cell a uniform random state). Phase 2: hill climbing — flip 1 to 3
 * random cells of the best start and keep the change when it lasts at least as long. */
function huntWorker() {
  self.onmessage = (e) => {
    const { n, start, list, B, S, C, randomRuns, tweaks, cap } = e.data;
    const step = (a, b) => {
      for (let t = 0; t < n; t++) {
        const was = a[t];
        if (was >= 2) { b[t] = was + 1 < C ? was + 1 : 0; continue; }
        let c = 0;
        for (let q = start[t]; q < start[t + 1]; q++) c += a[list[q]] === 1;
        b[t] = was ? (S[c] ? 1 : C > 2 ? 2 : 0) : B[c];
      }
    };
    const fingerprint = (s) => {
      let h1 = 0x811c9dc5, h2 = 0x01000193;
      for (let t = 0; t < n; t++) {
        h1 = Math.imul(h1 ^ s[t], 0x01000193);
        h2 = Math.imul(h2 ^ (s[t] + t), 0x5bd1e995);
      }
      return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
    };
    const lifetime = (seed) => {  // { T, P } — P = 0 when still unsettled at the cap
      let a = Uint8Array.from(seed), b = new Uint8Array(n);
      const seen = new Map([[fingerprint(a), 0]]);
      for (let g = 1; g <= cap; g++) {
        step(a, b);
        [a, b] = [b, a];
        const k = fingerprint(a), first = seen.get(k);
        if (first !== undefined) return { T: first, P: g - first };
        seen.set(k, g);
      }
      return { T: cap, P: 0 };
    };
    const randomSeed = () => { const s = new Uint8Array(n); for (let t = 0; t < n; t++) s[t] = Math.floor(Math.random() * C); return s; };

    let best = null, bestSeed = null, kept = 0;  // kept: tweaks applied to the champion
    const report = (phase, i, total, changed) => self.postMessage({
      type: 'progress', phase, i, total, best, kept, seed: changed ? bestSeed.slice() : null });
    for (let i = 1; i <= randomRuns; i++) {
      const seed = randomSeed(), r = lifetime(seed);
      const improved = !best || r.T > best.T;
      if (improved) { best = r; bestSeed = seed; }
      report(1, i, randomRuns, improved);
    }
    for (let i = 1; i <= tweaks; i++) {
      const seed = bestSeed.slice();
      const flips = 1 + Math.floor(Math.random() * 3);
      for (let f = 0; f < flips; f++) seed[Math.floor(Math.random() * n)] = Math.floor(Math.random() * C);
      const r = lifetime(seed);
      const accepted = r.T >= best.T;  // equal lifetimes are accepted too, to drift
      if (accepted) { best = r; bestSeed = seed; kept++; }
      report(2, i, tweaks, accepted);
    }
    self.postMessage({ type: 'done' });
  };
}

const hunt = { worker: null, key: null, best: null, seed: null, kept: 0 };

// A hunt belongs to one surface, size and rule: anything else makes its champion meaningless
const huntKey = () => `${$('mode').value}|${$('sphereF').value}|${walk.life ? walk.life.ruleText : ''}`;

// Stop the hunt. When it ends normally or with ■ Stop, the best start found is loaded at once;
// when something else changed (number, surface, rule…) it is simply dropped.
function stopHunt(loadBest = false) {
  if (hunt.worker) { hunt.worker.terminate(); hunt.worker = null; }
  $('huntBtn').textContent = '🔍 Hunt';
  if (loadBest && hunt.seed) loadChampion();
}

function lifetimeWords(r) {
  if (!r.P) return `still changing after ${fmt(r.T)} generations`;
  return r.P === 1 ? `settles at generation ${fmt(r.T)}` : `period-${fmt(r.P)} loop from generation ${fmt(r.T)}`;
}

// The hunt works on random starts, so the number becomes 🎲 Random digits first
function startHunt() {
  if (!walk.life) return;
  if ($('constant').value !== 'random') {
    $('constant').value = 'random';
    compute();
  }
  stopHunt();
  const L = walk.life;
  const [randomRuns, tweaks] = $('huntSize').value.split(',').map(Number);
  const src = `(${huntWorker.toString()})()`;
  hunt.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  hunt.key = huntKey();
  hunt.best = hunt.seed = null;
  hunt.kept = 0;
  $('huntBtn').textContent = '■ Stop';
  $('huntStatus').textContent = 'Starting…';
  hunt.worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'done') {
      stopHunt(true);
      return;
    }
    hunt.best = d.best;
    hunt.kept = d.kept;
    if (d.seed) hunt.seed = d.seed;
    const phase = d.phase === 1 ? `random start ${fmt(d.i)} / ${fmt(d.total)}`
      : `tweak ${fmt(d.i)} / ${fmt(d.total)} (${fmt(d.kept)} kept)`;
    $('huntStatus').textContent = `${phase} · record: ${lifetimeWords(d.best)}`;
  };
  hunt.worker.postMessage({ n: L.alive.length, start: L.nbr.start, list: L.nbr.list, B: L.B, S: L.S, C: L.C,
                            randomRuns, tweaks, cap: 50000 });
}

// Load the champion as the starting pattern of the current Life run
function loadChampion() {
  const L = walk.life;
  if (!L || !hunt.seed || hunt.key !== huntKey()) return;
  setLifeSeed(hunt.seed);
  championCode = encodeCells(hunt.seed, L.C);
  const how = hunt.kept ? `random start + ${fmt(hunt.kept)} tweak${hunt.kept > 1 ? 's' : ''}` : 'random start';
  $('status').textContent = `🎲 champion: ${lifetimeWords(hunt.best)} (${how}) · ${fmt(L.seedAlive)} live cells at the start`;
  $('huntStatus').textContent = 'Champion loaded: press ▶︎ Play to watch it.';
}

// Replace the starting pattern of the current Life run and go back to generation 0
function setLifeSeed(seed) {
  const L = walk.life;
  L.seed.set(seed);
  L.seedAlive = L.seed.reduce((a, v) => a + (v === 1), 0);
  L.seedDying = L.seed.reduce((a, v) => a + (v > 1), 0);
  restart();
}

/* ------------------------------------------------------------------ *
 * Setups: save, share and reload the whole configuration              *
 * ------------------------------------------------------------------ */
/* A setup is a flat object of short keys, the same for the page link (#…), the saved setups in
 * this browser (localStorage) and the JSON export. It only holds what determines the result:
 * the number and its options, the walk mode, surface, rule, digits, random draw and champion.
 * Display choices (colours, grid, sky, camera, zoom…) and the speed are never saved. */
let championCode = null;  // the loaded champion's cells, encoded (see encodeCells)
let pendingChampion = null;  // a champion to restore once a loaded setup is built

// Cells as base64url, packing 1, 2 or 4 bits per cell depending on the number of states
function encodeCells(cells, C) {
  const bits = C <= 2 ? 1 : C <= 4 ? 2 : 4, per = 8 / bits;
  const bytes = new Uint8Array(Math.ceil(cells.length / per));
  cells.forEach((v, i) => { bytes[Math.floor(i / per)] |= v << ((i % per) * bits); });
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return `${C}.${btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
function decodeCells(code, n) {
  const [c, data] = code.split('.');
  const C = Number(c), bits = C <= 2 ? 1 : C <= 4 ? 2 : 4, per = 8 / bits;
  const s = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const cells = new Uint8Array(n);
  for (let i = 0; i < n; i++) cells[i] = ((s.charCodeAt(Math.floor(i / per)) || 0) >> ((i % per) * bits)) & ((1 << bits) - 1);
  return cells;
}

function getSetup() {
  const w = $('mode').value, mode = MODES[w], n = $('constant').value, s = { n, w };
  if (n === 'fraction') s.fr = $('fraction').value;
  if (n === 'mersenne') s.mp = $('mersenneP').value;
  if (n === 'primorial') s.pr = $('primorialP').value;
  if (n === 'randomPrime') s.ps = $('primeSize').value;
  if (n === 'random' || n === 'randomPrime') s.rd = currentDraw;
  if (!mode.life) s.d = $('digits').value;
  if (mode.lattice === 'sphere') s.s = $('sphereF').value;
  if (mode.life) s.r = $('lifeRule').value;
  if (championCode) s.ch = championCode;
  return s;
}

function applySetup(s) {
  const set = (id, v) => { if (v !== undefined && v !== null) $(id).value = v; };
  if (!CONSTANTS[s.n] || !MODES[s.w]) return false;
  set('constant', s.n);
  set('fraction', s.fr);
  set('mersenneP', s.mp);
  set('primorialP', s.pr);
  set('primeSize', s.ps);
  set('digits', s.d);
  set('mode', s.w);
  if (MODES[s.w].sphere) { fillSphereSizes(MODES[s.w].sphere); set('sphereF', s.s); }
  if (s.r) {
    $('lifeRule').value = s.r;
    const preset = Array.from($('lifePreset').options).find((o) => o.value === s.r);
    $('lifePreset').value = preset ? s.r : 'custom';
  }
  // the display is not part of a setup: it takes the defaults of the walk mode, as when choosing it
  $('perspective').checked = !!MODES[s.w].perspective;
  $('colorMode').value = MODES[s.w].life ? 'mono' : 'gradient';
  $('autoFit').checked = true;
  pendingDraw = s.rd !== undefined ? Number(s.rd) : null;
  pendingChampion = s.ch || null;
  compute();  // a champion follows once the walk is built
  return true;
}

// Called when a walk has just been built: restore a loaded setup's champion, then write the link
function applyPendingView() {
  const ch = pendingChampion;
  pendingChampion = null;
  if (ch && walk.life) {
    setLifeSeed(decodeCells(ch, walk.life.seed.length));
    championCode = ch;
  }
  syncLink();  // at once, not at the next periodic update
}

// The page link always holds the current setup (#n=pi&w=turtle&…), for bookmarks and sharing.
// A champion is left out of the link when too long: saved setups and JSON files keep it.
const toHash = (s) => new URLSearchParams(Object.entries(s).filter(([k, v]) => k !== 'ch' || v.length < 3000)).toString();
function parseHash() {
  if (location.hash.length < 2) return null;
  const s = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  return s.n && s.w ? s : null;
}
function syncLink() {
  if ($('compute').disabled || pendingChampion) return;  // not while a setup is still being built
  const h = `#${toHash(getSetup())}`;
  if (h !== location.hash) history.replaceState(null, '', h);
}

// Saved setups in this browser (localStorage), as { name, setup, saved }
const SETUPS_KEY = 'walkingPi.setups';
function readSetups() {
  try { return JSON.parse(localStorage.getItem(SETUPS_KEY)) || []; } catch { return []; }
}
function writeSetups(list) {
  try { localStorage.setItem(SETUPS_KEY, JSON.stringify(list)); return true; } catch { return false; }
}
function fillSetupList(selected = '') {
  const sel = $('setupList');
  sel.replaceChildren(new Option(readSetups().length ? '— choose a saved setup —' : '— no saved setup yet —', ''),
    ...readSetups().map((x) => new Option(x.name, x.name)));
  sel.value = selected;
}
const setupNote = (text) => { $('setupStatus').textContent = text; };

function saveSetup() {
  const mode = $('mode').options[$('mode').selectedIndex].text.split(' — ')[0];
  const rule = walk.life ? ` · ${walk.life.ruleText}` : '';
  const name = prompt('Name this setup', `${$('titleSym').textContent} · ${mode}${rule}`);
  if (!name) return;
  const list = readSetups().filter((x) => x.name !== name);
  list.push({ name, setup: getSetup(), saved: new Date().toISOString() });
  list.sort((a, b) => a.name.localeCompare(b.name));
  setupNote(writeSetups(list) ? `Saved “${name}” in this browser.` : 'This browser does not allow saving (private window?).');
  fillSetupList(name);
}

function deleteSetup() {
  const name = $('setupList').value;
  if (!name) { setupNote('Choose a saved setup to delete.'); return; }
  writeSetups(readSetups().filter((x) => x.name !== name));
  fillSetupList();
  setupNote(`Deleted “${name}”.`);
}

function exportSetups() {
  const list = readSetups();
  if (!list.length) { setupNote('Nothing to export yet: save a setup first.'); return; }
  const blob = new Blob([JSON.stringify({ app: 'Walking Pi', version: 1, setups: list }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'walking-pi-setups.json';
  a.click();
  URL.revokeObjectURL(a.href);
  setupNote(`Exported ${list.length} setup${list.length > 1 ? 's' : ''}.`);
}

async function importSetups(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = (data.setups || []).filter((x) => x && x.name && x.setup && x.setup.n && x.setup.w);
    const list = readSetups();
    for (const x of incoming) {  // a name already used gets a suffix instead of overwriting
      let name = x.name;
      for (let k = 2; list.some((y) => y.name === name); k++) name = `${x.name} (${k})`;
      list.push({ ...x, name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    writeSetups(list);
    fillSetupList();
    setupNote(`Imported ${incoming.length} setup${incoming.length === 1 ? '' : 's'}.`);
  } catch {
    setupNote('This file is not a Walking Pi setups file.');
  }
}

async function copyLink() {
  syncLink();
  try {
    await navigator.clipboard.writeText(location.href);
    setupNote('Link copied: it opens this exact setup.');
  } catch {
    setupNote('Copy the address bar: it holds this exact setup.');
  }
}

function key(x, y) {
  return (x + 2 ** 21) * 2 ** 22 + (y + 2 ** 21);
}

/* ------------------------------------------------------------------ *
 * Animation                                                          *
 * ------------------------------------------------------------------ */
function stepsPerSecond() {
  const v = Number($('speed').value) / 100;
  return 6 * 10 ** (v * 5); // 6 → 600,000 steps per second (logarithmic slider)
}

function updateSpeedLabel() {
  const s = stepsPerSecond();
  $('speedLabel').textContent = `${s < 100 ? s.toFixed(s < 10 ? 1 : 0) : fmt(Math.round(s))} steps/s`;
}

function advanceTo(target) {
  target = Math.min(walk.n, target);
  if (walk.life) {  // Game of Life: one step = one generation
    while (cur < target) { lifeStep(); cur++; }
    statsDirty = true;
    if (cur >= walk.n) play(false);
    return;
  }
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

// A new walk is shown complete at once; Play replays it from the start
function showAll() {
  if (walk.life) return;  // the Game of Life starts at generation 0 instead
  advanceTo(walk.n);
  if ($('autoFit').checked) fitWhole();  // framed like Fit view, without the margin kept for growing
}

// 3D walks: keep the bounding box in the frame too (in perspective its near corners stick out)
function includeBox() {
  if (!walk.is3d || walk.sphere || !$('showGrid').checked) return;
  const [x0, x1, y0, y1, z0, z1] = bounds3;
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
    const [px, py] = projectPoint(x, y, z);
    bounds.minX = Math.min(bounds.minX, px); bounds.maxX = Math.max(bounds.maxX, px);
    bounds.minY = Math.min(bounds.minY, py); bounds.maxY = Math.max(bounds.maxY, py);
  }
}

// Frame everything drawn so far
function fitWhole() {
  includeBox();
  fitToBounds(padBounds(bounds));
}

function restart() {
  cur = 0;
  drawn = 0;
  acc = 0;
  bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  bounds3 = [0, 0, 0, 0, 0, 0];
  if (walk.sphere) {  // the frame is the whole sphere, centred on the origin
    const R = walk.R;
    const F = R * walk.shape.extent;  // the current form, flat or round
    bounds = { minX: -F, maxX: F, minY: -F, maxY: F };
    bounds3 = [-R, R, -R, R, -R, R];
    walk.visits.fill(0);
    walk.visits[walk.tile[0]] = walk.maxVisits = 1;
    if (walk.life) lifeReset();
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
  if (walk.is3d) drawSky(ctx);
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
}

// 3D background: a vertical sky gradient behind the scene (twilight, deep blue, or none)
const SKIES = {
  twilight: [[0, '#0a1530'], [0.45, '#1c2852'], [0.75, '#433262'], [0.92, '#7a4a5e'], [1, '#9c5f52']],
  blue:     [[0, '#07122b'], [1, '#17315f']],
};
function drawSky(ctx) {
  const stops = SKIES[$('sky').value];
  if (!stops) return;  // dark: the page background shows through
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  for (const [at, colour] of stops) sky.addColorStop(at, colour);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cw, ch);
}

// 3D: wireframe bounding box of the walk + axis gizmo in the top-left corner
function draw3DFrame(ctx) {
  const proj = projectPoint;  // the box is drawn in perspective, the axis gizmo stays orthographic
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
    const [px, py] = orthoPoint(...v);
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
  const t = walk.tile[cur], nr = walk.shape.nrm;
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
  const sc = walk.shape.corners, edge = walk.R * Math.hypot(sc[0] - sc[3], sc[1] - sc[4], sc[2] - sc[5]);
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
  // on a torus the position does not say which way the surface faces: use the tile's normal
  const t = walk.tile[cur], nr = walk.shape.nrm;
  const [x, y, z] = walk.geo.torus ? [nr[3 * t], nr[3 * t + 1], nr[3 * t + 2]] : [walk.wx[cur], walk.wy[cur], walk.wz[cur]];
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
// Is a plane (outward normal n through point p) facing us? Orthographic: n points towards the
// viewer. Perspective: n points towards the camera position, seen from p.
function planeVisible(n, p) {
  const P = walk.persp;
  if (!P) return towardViewer(...n) > 0;
  const cp = Math.cos(cam.pitch);
  const eye = [-Math.sin(cam.yaw) * cp, -Math.cos(cam.yaw) * cp, Math.sin(cam.pitch)].map((v, d) => P.c[d] + v * P.D);
  return n[0] * (eye[0] - p[0]) + n[1] * (eye[1] - p[1]) + n[2] * (eye[2] - p[2]) > 0;
}

function tileVisible(t) {
  const { cen, nrm } = walk.shape, R = walk.R;  // the current form, flat or round
  return planeVisible([nrm[3 * t], nrm[3 * t + 1], nrm[3 * t + 2]], [cen[3 * t] * R, cen[3 * t + 1] * R, cen[3 * t + 2] * R]);
}
// is the tile of point i on the visible side? (an unrolled torus shows both sides)
const facing = (i) => (walk.geo.torus && walk.shape.m < 1) || tileVisible(walk.tile[i]);

// Sphere: visible tiles coloured by visit count (log scale) and shading
function drawSphere() {
  const ctx = layers.path;
  ctx.clearRect(0, 0, cw, ch);
  const { geo: g, R, visits, maxVisits } = walk;
  const { scale: s, ox, oy } = view;
  const nv = g.verts.length / 3;
  const px = new Float32Array(nv), py = new Float32Array(nv);
  const proj = projector();
  for (let v = 0; v < nv; v++) {
    const [x, y] = proj(g.verts[3 * v] * R, g.verts[3 * v + 1] * R, g.verts[3 * v + 2] * R);
    px[v] = ox + x * s; py[v] = oy + y * s;
  }
  // flat solids: visibility is decided once per face, and faces are drawn as single polygons
  const faceVisible = g.faces && g.faces.map((f) => planeVisible(f.normal, f.corners[0].map((v) => v * R)));
  const facePath = (f, close = true) => {
    ctx.beginPath();
    f.corners.forEach((c, i) => {
      const [x, y] = proj(c[0] * R, c[1] * R, c[2] * R);
      ctx[i ? 'lineTo' : 'moveTo'](ox + x * s, oy + y * s);
    });
    if (close) ctx.closePath();
  };
  const LEVELS = 32;
  const grad = Array.from({ length: LEVELS }, (_, i) => GRADIENT[Math.round((i / (LEVELS - 1)) * (BANDS - 1))]);
  const logLevel = (v, max) => 1 + Math.round((Math.log(v) / Math.log(Math.max(2, max))) * (LEVELS - 1));
  // palette[0] is the unlit background; levelOf(t) picks each tile's palette entry
  let palette = [null, ...grad];
  let levelOf = (t) => (visits[t] ? logLevel(visits[t], maxVisits) : 0);  // walk: visits, log scale
  const L = walk.life;
  if (L) {
    const colour = $('colorMode').value;
    // dying state k (2 … C−1) → a trail colour, from light (just dying) to dark (almost dead)
    const dyingShade = (k) => Math.min(LIFE_TRAIL.length, Math.round(((k - 1) / (L.C - 1)) * LIFE_TRAIL.length));
    if (colour === 'mono') {
      palette = [null, '#e6edf3', ...LIFE_TRAIL];
      levelOf = (t) => (L.alive[t] === 1 ? 1 : L.alive[t] ? 1 + dyingShade(L.alive[t]) : 0);
    } else if (colour === 'digit') {  // activity: how many times the cell changed state
      levelOf = (t) => (L.activity[t] ? logLevel(L.activity[t], L.maxActivity) : 0);
    } else {  // age of live cells (cyan = newborn … orange = old); dying stages, or a trail fading after death
      palette = [null, ...grad, ...LIFE_TRAIL];
      levelOf = (t) => {
        const st = L.alive[t];
        if (st === 1) return Math.min(LEVELS, logLevel(L.age[t], 64));
        if (st >= 2) return LEVELS + dyingShade(st);
        return L.C === 2 && cur - L.died[t] <= LIFE_TRAIL.length ? LEVELS + cur - L.died[t] : 0;
      };
    }
  }
  // the torus, and any polyhedron that is not flat, is drawn tile by tile from its current form;
  // a flat polyhedron is drawn face by face below
  if (g.torus || walk.shape.m > 0) {
    drawShapeTiles(ctx, walk.shape, g.sides, palette, levelOf);
    return;
  }
  const buckets = Array.from({ length: palette.length }, () => []);
  for (let t = 0; t < g.n; t++) {
    if (faceVisible[Math.floor(t / g.perFace)]) buckets[levelOf(t)].push(t);
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
  g.faces.forEach((f, i) => { if (faceVisible[i]) { facePath(f); ctx.fill(); } });
  buckets.forEach((list, level) => {
    if (!list.length || level === 0) return;
    outline(list);
    ctx.fillStyle = palette[level];
    ctx.fill();
  });
  if ($('showGrid').checked && s > 6) {  // tile edges: long straight lines across each visible face
    ctx.beginPath();
    g.faces.forEach((f, i) => {
      if (!faceVisible[i]) return;
      for (const [a, b] of f.lines) {
        const [x1, y1] = proj(a[0] * R, a[1] * R, a[2] * R), [x2, y2] = proj(b[0] * R, b[1] * R, b[2] * R);
        ctx.moveTo(ox + x1 * s, oy + y1 * s);
        ctx.lineTo(ox + x2 * s, oy + y2 * s);
      }
    });
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  // shading: each flat face darker the more it turns away from the viewer
  g.faces.forEach((f, i) => {
    if (!faceVisible[i]) return;
    facePath(f);
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.55 * (1 - towardViewer(...f.normal))).toFixed(3)})`;
    ctx.fill();
  });
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

// Torus tiles: the visible ones sorted from far to near (painter's algorithm), each filled with
// its colour darkened by how much it turns away from the viewer, then outlined if large enough
const shadeCache = new Map();
const colourProbe = document.createElement('canvas').getContext('2d');
function shaded(colour, shade) {  // colour darkened by shade ∈ [0, 1], as an rgb() string
  const key = `${colour}|${shade}`;
  if (!shadeCache.has(key)) {
    const probe = colourProbe;
    probe.fillStyle = colour;  // the canvas normalises any CSS colour to #rrggbb
    const hex = probe.fillStyle, k = 1 - 0.6 * shade;
    const [r, g, b] = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
    shadeCache.set(key, `rgb(${r}, ${g}, ${b})`);
  }
  return shadeCache.get(key);
}

// Tiles of a shape (torus, or an inflated polyhedron): the visible ones sorted from far to near
// (painter's algorithm: a torus is not convex, so tiles facing us can hide each other), each
// filled with its colour darkened by how much it turns away from the viewer, then outlined
function drawShapeTiles(ctx, sh, k, palette, levelOf) {
  const R = walk.R, P = walk.persp, cp = Math.cos(cam.pitch), n = walk.geo.n;
  const { scale: s, ox, oy } = view, proj = projector();
  const dir = [-Math.sin(cam.yaw) * cp, -Math.cos(cam.yaw) * cp, Math.sin(cam.pitch)];  // towards the viewer
  const eye = P ? dir.map((v, d) => P.c[d] + v * P.D) : null;
  const twoSided = walk.geo.torus && sh.m < 1;  // an unrolled torus is an open surface: both sides show
  const visible = [];
  for (let t = 0; t < n; t++) {
    if (!twoSided && !tileVisible(t)) continue;
    const c = [sh.cen[3 * t] * R, sh.cen[3 * t + 1] * R, sh.cen[3 * t + 2] * R];
    const near = eye ? -Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) : c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2];
    visible.push([near, t]);
  }
  visible.sort((a, b) => a[0] - b[0]);
  const grid = $('showGrid').checked && s > 6;
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  for (const [, t] of visible) {
    const level = levelOf(t);
    let toward = towardViewer(sh.nrm[3 * t], sh.nrm[3 * t + 1], sh.nrm[3 * t + 2]);
    if (twoSided) toward = Math.abs(toward);  // the back of a tile is lit like its front
    ctx.fillStyle = shaded(level ? palette[level] : '#1f2630', Math.round((1 - Math.max(0, toward)) * 8) / 8);
    ctx.beginPath();
    for (let q = 0; q < k; q++) {
      const i = 3 * (k * t + q), [x, y] = proj(sh.corners[i] * R, sh.corners[i + 1] * R, sh.corners[i + 2] * R);
      ctx[q ? 'lineTo' : 'moveTo'](ox + x * s, oy + y * s);
    }
    ctx.closePath();
    ctx.fill();
    if (grid) ctx.stroke();
  }
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
  if (!walk.n || walk.life) return;  // no walker in the Game of Life
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

const STAT_LABELS = {
  walk: ['Steps', 'Position', 'Distance', 'Max distance', 'Cells visited'],
  life: ['Generation', 'Alive', 'Born', 'Died', 'Ever alive'],
};

// Lifetime of the current Life run: when it settles (frozen or looping), or not yet
function lifetimeText(L) {
  const s = L.stable;
  if (!s) return L.seen.size >= LIFE_TRACK ? `not settled after ${fmt(LIFE_TRACK)} generations` : 'not settled yet';
  if (s.extinct) return `dies out at generation ${fmt(s.T)}`;
  if (s.P === 1) return `frozen from generation ${fmt(s.T)}`;
  return `period-${fmt(s.P)} loop from generation ${fmt(s.T)}`;
}

function updateStats() {
  STAT_LABELS[walk.life ? 'life' : 'walk'].forEach((text, i) => { $(`lStat${i}`).textContent = text; });
  $('lifetimeLabel').hidden = $('sLifetime').hidden = !walk.life;
  if (walk.life) {
    const L = walk.life, n = walk.geo.n, pc = (v) => `${fmt(v)} (${((100 * v) / n).toFixed(1)} %)`;
    $('sStep').textContent = fmt(cur);
    $('sPos').textContent = pc(L.aliveCount) + (L.C > 2 ? ` · ${fmt(L.dyingCount)} dying` : '');
    $('sDist').textContent = fmt(L.born);
    $('sMax').textContent = fmt(L.dead);
    $('sCells').textContent = pc(L.everAlive);
    $('sLifetime').textContent = lifetimeText(L);
    $('sCountsLabel').hidden = $('sCounts').hidden = true;
    $('digitStrip').textContent = `Rule ${L.ruleText} · seeded in base ${L.C} · ${fmt(n)} cells, ` +
      `${fmt(L.seedAlive)} alive${L.C > 2 ? ` and ${fmt(L.seedDying)} dying` : ''} at generation 0`;
    return;
  }
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

let lastTick = 0;
function tick(now = performance.now()) {
  const dt = Math.min(0.1, (now - (lastTick || now)) / 1000);  // seconds since the last frame (capped)
  lastTick = now;
  if (walk.is3d && $('autoRotate').checked) rotateView(0.004, 0);
  if (playing) {
    acc += stepsPerSecond() * dt;  // time-based, so the speed holds whatever the frame rate
    const k = Math.floor(acc);
    acc -= k;
    if (k > 0) advanceTo(cur + k);
  }
  includeBox();
  if (walk.n && $('autoFit').checked && boundsOffscreen()) {
    const b = padBounds(bounds);
    const mx = (b.maxX - b.minX) * 0.15, my = (b.maxY - b.minY) * 0.15;
    fitToBounds({ minX: b.minX - mx, maxX: b.maxX + mx, minY: b.minY - my, maxY: b.maxY + my });
  }
  if (walk.sphere) {  // the sphere is redrawn as a whole (heat map + recent trail)
    morphStep(dt);  // flat ↔ round, while it is changing
    if (walk.n && !walk.life && $('autoFit').checked && !$('autoRotate').checked) followWalker();
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
$('restart').addEventListener('click', () => {  // jump to start: keep playing only if it was playing
  const wasPlaying = playing;
  restart();
  play(wasPlaying);
});
// ⏭: jump to the end of a walk; with no end (Game of Life), jump LIFE_JUMP generations ahead
$('end').addEventListener('click', () => { advanceTo(Number.isFinite(walk.n) ? walk.n : cur + LIFE_JUMP); });
$('fit').addEventListener('click', fitNow);
$('speed').addEventListener('input', updateSpeedLabel);
$('colorMode').addEventListener('change', () => { needsFull = true; });
$('showGrid').addEventListener('change', () => { needsFull = true; });
$('autoFit').addEventListener('change', () => { if ($('autoFit').checked) fitNow(); });

function fitNow() {
  $('autoFit').checked = true;
  fitWhole();
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
$('primorialP').addEventListener('change', computeFramed);
$('primeSize').addEventListener('change', computeFramed);
$('sky').addEventListener('change', () => { needsFull = true; });
// flat ↔ round: the animation runs in tick (morphStep); the walk or Life run goes on meanwhile
$('morphBtn').addEventListener('click', () => {
  if (!walk.shape) return;
  walk.shape.target = walk.shape.target === 1 ? 0 : 1;
  updateMorphButton();
});
$('morphBtn').addEventListener('pointerdown', (e) => e.stopPropagation());  // not a drag of the view
$('perspective').addEventListener('change', () => {
  setPerspective();
  project();
  if (walk.sphere) needsFull = true;
  else rotateView(0, 0);  // recompute the 2D bounds of the projected walk
});
$('huntBtn').addEventListener('click', () => (hunt.worker ? stopHunt(true) : startHunt()));  // ■ Stop keeps the best so far
// Rule menu: a preset fills the rule field; Custom… shows the field to type any rule
$('lifePreset').addEventListener('change', () => {
  const custom = $('lifePreset').value === 'custom';
  $('lifeCustomRow').hidden = !custom;
  if (custom) { $('lifeRule').focus(); return; }
  $('lifeRule').value = $('lifePreset').value;
  if (MODES[$('mode').value].life) compute();
});
$('lifeRule').addEventListener('change', () => {
  if (!parseRule($('lifeRule').value)) { $('status').textContent = 'Enter a rule like B3/S23 or B2/S/C3 (2 to 10 states)'; return; }
  if (MODES[$('mode').value].life) compute();  // restart from generation 0; a new state count needs a new base
});
$('sphereF').addEventListener('change', () => {
  if (MODES[$('mode').value].life) { compute(); return; }  // one digit per cell: maybe more digits
  if (!current) return;
  buildWalk();
  showAll();
});
$('constant').addEventListener('change', computeFramed);
$('mersenneP').addEventListener('change', computeFramed);
$('fraction').addEventListener('change', computeFramed);
// A new number (or a new prime, size or fraction) starts framed
function computeFramed() {
  $('autoFit').checked = true;
  compute();
}
$('mode').addEventListener('change', () => {
  $('perspective').checked = !!MODES[$('mode').value].perspective;  // on by default for the cube modes only
  $('colorMode').value = MODES[$('mode').value].life ? 'mono' : 'gradient';  // simplest view by default
  $('autoFit').checked = true;  // a new walk mode starts framed
  compute();
});

$('setupSave').addEventListener('click', saveSetup);
$('setupDelete').addEventListener('click', deleteSetup);
$('setupLink').addEventListener('click', copyLink);
$('setupExport').addEventListener('click', exportSetups);
$('setupImport').addEventListener('click', () => $('setupFile').click());
$('setupFile').addEventListener('change', () => {
  if ($('setupFile').files[0]) importSetups($('setupFile').files[0]);
  $('setupFile').value = '';
});
$('setupList').addEventListener('change', () => {
  const x = readSetups().find((y) => y.name === $('setupList').value);
  if (x && applySetup(x.setup)) setupNote(`Loaded “${x.name}”.`);
});
// a setup link pasted into this tab
window.addEventListener('hashchange', () => { const s = parseHash(); if (s) applySetup(s); });

new ResizeObserver(resize).observe(stage);
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
fillSetupList();
const linked = parseHash();  // a link with a setup opens that setup; otherwise the default one
if (!linked || !applySetup(linked)) compute();
setInterval(syncLink, 700);  // keep the link up to date with the setup

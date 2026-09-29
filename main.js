'use strict';

/* ==============================================================================================
 * WALKING π — main.js
 * ==============================================================================================
 *
 * A walk (or a Game of Life) driven by the digits of a number. Everything runs in the browser,
 * with no build step and no dependency: index.html, style.css and this file. The heavy work
 * runs in Web Workers created from functions of this file (their source text becomes a Blob),
 * so the page stays one plain script.
 *
 * How it fits together
 *   1. The Number is a formula (Part 4). It is parsed and checked on the page, then evaluated
 *      in a worker (Part 1), which sends back its digits in the base the mode needs.
 *   2. The walk mode turns each digit into a move: on a lattice or along a spiral (Part 6), or
 *      from tile to tile on a surface (Part 7). The Game of Life (Part 8) instead reads one
 *      digit per tile of a surface as its starting state.
 *   3. The whole walk is built at once (arrays of positions, Part 5); the animation (Part 11)
 *      only reveals it step by step, so jumping anywhere is instant.
 *   4. A setup (Part 10) — number, mode, surface, rule, Life start — lives in the page link, in
 *      the saved setups and in JSON files. Display choices are never part of it.
 *
 * Contents
 *   Part 1   Digits: the formula worker (BigInt, exact or with guard digits)
 *   Part 2   Catalogues and state
 *   Part 3   Labels, digit counts and random draws
 *   Part 4   Number formulas: the language, its checks and the Number cards
 *   Part 5   Picking a mode, computing, building the walk, 3D projection
 *   Part 6   Walks on lattices and spirals
 *   Part 7   Tiled surfaces: meshes, flat ↔ round, walks on surfaces
 *   Part 8   Game of Life on the surfaces
 *   Part 9   Methuselah hunt
 *   Part 10  Setups and links
 *   Part 11  Animation, view and rendering
 *   Part 12  Interactions and start-up
 */

// The version shown after the title, and the only place it is written: 0.1.0 was the first
// commit, and every commit adds 1 to the last number (0.1.N, N = commits before this one)
const VERSION = '0.1.113';

/* ==============================================================================================
 * PART 1 — DIGITS: THE FORMULA WORKER
 * ==============================================================================================
 *
 * The worker receives a checked formula tree (Part 4) and a number of digits n in base b, and
 * sends back the integer part and the n digits after the point.
 *
 * Why BigInt rather than floating point: a double holds about 16 significant digits, while walks
 * use up to 1,000,000 digits, in any base from 2 to 64. So every value is an exact integer:
 * - an exact integer or fraction (2^127-1, 22/7) is computed exactly, as a pair [p, q];
 * - a real (pi, sqrt(2), ln(3)…) is computed in fixed point, as the integer x·b^(n+G), where G
 *   guard digits absorb the rounding of each operation. The result is divided by b^G and written
 *   in base b. G grows with the number of operations and with the size of the values met on the
 *   way (checkFormula estimates both), so a cancellation like 10^30·π − 3141… keeps its digits.
 * - When the guard digits come out all 0 or all b − 1, the value sits extremely close to a number
 *   with a short expansion (√2·√2 gives 1.999…): the status line then warns that the last digits
 *   could be off by one, rather than silently showing a wrong digit.
 *
 * Why a worker: a million digits can take seconds; the page keeps animating meanwhile, and a new
 * request simply terminates the old worker.
 */

function formulaWorker() {
  self.onmessage = (e) => {
    const { ast, n, base, mag, nodes } = e.data;
    const B = BigInt(base);
    const t0 = performance.now();
    let S, prec, lnS, guard, primeTests;

    /* ---- 1.1 Primes: small primes, primorials, random probable primes ------------------------ */

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

    // p#, the product of all primes ≤ p (multiplied as a balanced product tree)
    function primorial(p) {
      let level = smallPrimes(p).map(BigInt);
      while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? level[i] * level[i + 1] : level[i]);
        level = next;
      }
      return level[0];
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
    function randomPrime(size, seed) {
      const lo = 10n ** BigInt(size - 1);
      const primes = smallPrimes(20000).slice(1);  // odd primes only
      const expected = size * Math.log(10) * 0.0567;  // ≈ Miller–Rabin tests before a prime shows up
      const W = 8192;
      // the start comes from the seed, so the same seed always finds the same prime
      let start = lo + randomBigInt(9n * lo - 2n * BigInt(W), seededRandom(seed >>> 0));
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
            primeTests = tests;
            return c;
          }
        }
        start += 2n * BigInt(W);
      }
    }
    /* ---- 1.2 Series and integer roots: the building blocks ----------------------------------- */
    // Most constants are sums of series whose terms shrink geometrically. Terms are integers in fixed
    // point (scaled by S = b^prec); binary splitting keeps long products exact and fast. progress()
    // reports to the page every 500 terms, for the progress bar.

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

    /* ---- 1.3 Named constants ----------------------------------------------------------------- */
    // Each one with a classic fast formula that works well with integers. A constant is computed once
    // per formula (memo), however many times the formula uses it.

    // S·c for a named constant, computed once per formula
    const memo = {};
    function constant(name) {
      if (memo[name] !== undefined) return memo[name];
      done = 0;
      total = 1;
      let v;
      switch (name) {
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
        case 'apery': { // Amdeberhan–Zeilberger: ζ(3) = 1/64 Σ (−1)^k (205k²+250k+77)·(k!)^10/((2k+1)!)^5
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
        case 'erdos': { // Erdős–Borwein: E = Σ 1/(2^n − 1) = Σ 2^(−n²)·(2^n + 1)/(2^n − 1)
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
        case 'primes2': { // ρ = Σ 2^(−p): its binary expansion is the prime barcode (bit k = 1 when k is prime)
          const bits = Math.ceil(prec * Math.log2(base)) + 64;
          const prime = new Uint8Array(bits + 1);
          for (const q of smallPrimes(bits)) prime[q] = 1;
          let barcode = '';
          for (let k = 1; k <= bits; k++) barcode += prime[k] ? '1' : '0';
          v = (BigInt(`0b${barcode}`) * S) >> BigInt(bits);
          break;
        }
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
      return (memo[name] = v);
    }

    /* ---- 1.4 General functions: whole powers, exp, ln, zeta ---------------------------------- */
    // exp and ln work in binary fixed point (W fractional bits), where shifts are much cheaper than
    // divisions by powers of b. Both first reduce their argument (halvings for exp, square roots for
    // ln) so that their series converge fast, then undo the reduction (squarings, a factor 2^r).

    // S·v^k for S·v and a whole k (squaring)
    function powFixed(v, k) {
      let r = S, sq = v;
      for (let e = Math.abs(k); e > 0; e >>= 1) {
        if (e & 1) r = (r * sq) / S;
        if (e > 1) sq = (sq * sq) / S;
      }
      if (k >= 0) return r;
      if (r === 0n) throw new Error('division by zero');
      return (S * S) / r;
    }

    // S·e^x for S·x: e^x = (e^(x / 2^r))^(2^r), the series Σ y^k / k! in binary fixed point with W
    // fractional bits; r halvings balance series terms and squarings, and cover the integer part of x
    function expFixed(x) {
      if (x < 0n) return (S * S) / expFixed(-x);
      const bits = Math.ceil(prec * Math.log2(base));
      const r = Math.max(1, Math.round(Math.sqrt(bits) / 2)) + (x / S).toString(2).length;
      const W = BigInt(bits + 2 * r + 64);  // guard bits absorb the 2^r error growth
      const one = 1n << W;
      done = 0;
      total = bits / r + r;
      const y = ((x << W) / S) >> BigInt(r);
      let term = one, sum = one;
      for (let k = 1; term !== 0n; k++) {
        term = ((term * y) >> W) / BigInt(k);
        sum += term;
        progress(k);
      }
      for (let i = 0; i < r; i++) sum = (sum * sum) >> W;
      return (sum * S) >> W;
    }

    // S·ln x for S·x > 0, in binary fixed point with W fractional bits: x = 2^k·m with m in
    // [1/√2, √2]; r square roots bring m very close to 1, then ln m = 2^r·2·artanh((m − 1)/(m + 1)),
    // a series that now gains 2r bits per term
    function lnFixed(x) {
      if (x <= 0n) throw new Error('logarithm of a number ≤ 0');
      const bits = Math.ceil(prec * Math.log2(base));
      const r = Math.max(1, Math.round(Math.sqrt(bits) / 4));
      const W = BigInt(bits + r + 64), one = 1n << W;  // r guard bits: the 2^r at the end
      let k = x.toString(2).length - S.toString(2).length;
      let m = k >= 0 ? (x << W) / (S << BigInt(k)) : (x << (W + BigInt(-k))) / S;
      while (m * m > 2n * one * one) { m >>= 1n; k++; }
      while (2n * m * m < one * one) { m <<= 1n; k--; }
      done = 0;
      total = r + bits / (2 * r + 3);
      for (let i = 1; i <= r; i++) { m = isqrt(m << W); progress(i); }
      // |t| only: >> on a negative BigInt rounds towards −∞ and would never reach 0
      const below = m < one, t = ((below ? one - m : m - one) << W) / (m + one), t2 = (t * t) >> W;
      let term = t, sum = t;
      for (let j = 1; ; j++) {
        term = (term * t2) >> W;
        if (term === 0n) break;
        sum += term / BigInt(2 * j + 1);
        progress(r + j);
      }
      const lnm = ((below ? -2n : 2n) * sum) << BigInt(r);
      return ((lnm * S) >> W) + (k ? BigInt(k) * constant('ln2') : 0n);
    }

    // S·ζ(s) for a whole s ≥ 2 (Borwein): ζ(s) = −Σ (−1)^k (d_k − d_N)/(k + 1)^s / (d_N·(1 − 2^(1−s))),
    // d_k = Σ_{i≤k} N·(N+i−1)!·4^i / ((N−i)!·(2i)!), with an error below 3/(3 + √8)^N. d_N comes first,
    // then the sum, so the d_k are never all kept at once.
    function zetaFixed(s) {
      const N = Math.ceil(lnS / Math.log(3 + Math.sqrt(8))) + 10, n = BigInt(N), K = BigInt(s);
      const next = (term, i) => { const I = BigInt(i); return (term * 4n * (n + I - 1n) * (n - I + 1n)) / (2n * I * (2n * I - 1n)); };
      let term = 1n, dN = 1n;
      for (let i = 1; i <= N; i++) { term = next(term, i); dN += term; }
      done = 0;
      total = N;
      let d = 1n, sum = 0n;
      term = 1n;
      for (let k = 0; k < N; k++) {
        if (k > 0) { term = next(term, k); d += term; }
        const t = (d - dN) / BigInt(k + 1) ** K;
        sum += k % 2 ? -t : t;
        progress(k);
      }
      const half = 1n << (K - 1n);  // 1 − 2^(1−s) = (2^(s−1) − 1) / 2^(s−1)
      return (-sum * S * half) / (dN * (half - 1n));
    }

    /* ---- 1.5 Evaluating the formula ---------------------------------------------------------- */
    // Exact nodes (kind 'int' or 'rat') stay exact as long as possible; a node becomes fixed point
    // only where it must. Multiplying or dividing by an exact value uses its numerator and denominator
    // directly, so 10^50·π or π/10^50 lose no precision.

    // Exact values [p, q]: arithmetic in exactValue, the rest here
    const exact = (x) => x.kind === 'int' || x.kind === 'rat';
    const exactOf = (x) => exactValue(x, (c) => {
      const arg = (i) => Number(c.args[i].v);
      if (c.f === 'primorial') return [primorial(arg(0)), 1n];
      if (c.f === 'randprime') return [randomPrime(arg(0), arg(1)), 1n];
      const k = c.f === 'sqrt' ? 2 : c.f === 'cbrt' ? 3 : arg(1);  // a root found exact by checkFormula
      const [p, q] = exactOf(c.args[0]);
      return [iroot(p, k), iroot(q, k)];
    });

    // S·x for a real formula; exact parts stay exact as long as possible
    const nonNegative = (v) => { if (v < 0n) throw new Error('root of a negative number'); return v; };
    function real(x) {
      if (exact(x)) { const [p, q] = exactOf(x); return (p * S) / q; }
      switch (x.k) {
        case 'name': return constant(x.v);
        case 'neg': return -real(x.a);
        case '+': return real(x.a) + real(x.b);
        case '-': return real(x.a) - real(x.b);
        case '*': {
          if (exact(x.a)) { const [p, q] = exactOf(x.a); return (real(x.b) * p) / q; }
          if (exact(x.b)) { const [p, q] = exactOf(x.b); return (real(x.a) * p) / q; }
          return (real(x.a) * real(x.b)) / S;
        }
        case '/': {
          if (exact(x.b)) {
            const [p, q] = exactOf(x.b);
            if (p === 0n) throw new Error('division by zero');
            return (real(x.a) * q) / p;
          }
          const d = real(x.b);
          if (d === 0n) throw new Error('division by zero');
          if (exact(x.a)) { const [p, q] = exactOf(x.a); return (p * S * S) / (q * d); }
          return (real(x.a) * S) / d;
        }
        case '^': {
          if (x.exp !== undefined) return powFixed(real(x.a), x.exp);
          if (x.eBase) return expFixed(real(x.b));  // e^y
          if (x.rootExp) {  // a^(p/q) with a small q: the q-th root of a^p
            const [p, q] = x.rootExp;
            return iroot(nonNegative(powFixed(real(x.a), p)) * S ** BigInt(q - 1), q);
          }
          return expFixed((real(x.b) * lnFixed(real(x.a))) / S);  // a^b = e^(b·ln a)
        }
        case 'call': {
          const a = x.args[0];
          switch (x.f) {
            case 'sqrt': return isqrt(nonNegative(real(a)) * S);
            case 'cbrt': { const v = real(a); return v < 0n ? -icbrt(-v * S * S) : icbrt(v * S * S); }
            case 'root': { const k = Number(x.args[1].v); return iroot(nonNegative(real(a)) * S ** BigInt(k - 1), k); }
            case 'ln': return a.k === 'num' && a.v === '2' ? constant('ln2') : lnFixed(real(a));
            case 'exp': return expFixed(real(a));
            case 'log': {  // log(x, b) = ln x / ln b
              const d = lnFixed(real(x.args[1]));
              if (d === 0n) throw new Error('log(x, 1) does not exist');
              return (lnFixed(real(a)) * S) / d;
            }
            case 'zeta': return a.v === '3' ? constant('apery') : zetaFixed(Number(a.v));
          }
        }
      }
      throw new Error(`cannot compute ${x.k}`);
    }

    const negative = () => new Error('the number is negative: only numbers ≥ 0 can be walked');
    try {
      if (ast.kind === 'int') {  // an integer (a prime…): its digits only, the first n sent back
        const [N] = exactOf(ast);
        if (N < 0n) throw negative();
        const all = digitString(N, base);
        self.postMessage({ type: 'done', intPart: all.slice(0, n), total: all.length, digits: new Uint8Array(0),
                           tests: primeTests, ms: performance.now() - t0 });
        return;
      }
      if (ast.kind === 'rat') {  // a fraction: long division
        const [p, q] = exactOf(ast);
        if (p < 0n) throw negative();
        const digits = new Uint8Array(n);
        let r = p % q;
        for (let i = 0; i < n; i++) {
          r *= B;
          digits[i] = Number(r / q);
          r %= q;
        }
        self.postMessage({ type: 'done', intPart: digitString(p / q, base), digits, ms: performance.now() - t0 }, [digits.buffer]);
        return;
      }
      // a real: guard digits for rounding, for each operation, and for large or small values met on the way
      guard = 30 + Math.ceil(Math.log(n) / Math.log(base)) + 3 * nodes + Math.ceil((mag * Math.LN10) / Math.log(base));
      prec = n + guard;
      S = B ** BigInt(prec);
      lnS = prec * Math.log(base);
      const v = real(ast);
      if (v < 0n) throw negative();
      self.postMessage({ type: 'progress', p: 1 });
      const G = B ** BigInt(guard);
      const s = digitString(v / G, base).padStart(n + 1, '0');
      const intPart = s.slice(0, s.length - n);
      const digits = new Uint8Array(n);
      for (let i = 0; i < n; i++) digits[i] = s.charCodeAt(intPart.length + i) - 48;
      // the first guard digits all 0 or all b − 1: the value is extremely close to a round number,
      // and the last digits kept could be off by one
      const top = (v % G) / B ** BigInt(guard - 12);
      const uncertain = top === 0n || top === B ** 12n - 1n;
      self.postMessage({ type: 'done', intPart, digits, uncertain, ms: performance.now() - t0 }, [digits.buffer]);
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  };
}

/* ---- 1.6 Helpers shared by the page and the worker ------------------------------------------- */
// A worker cannot see this file's functions: compute() builds its source from the text of
// formulaWorker plus these helpers (digitString, seededRandom, exactValue, iroot). The page uses
// them too, to check small exact values while reading a formula.

// Exact value [p, q] (BigInt, q > 0, reduced) of an exact formula node (kind 'int' or 'rat'):
// numbers and + − × ÷ ^ here, function calls through leaf(node). Also used inside the worker.
function exactValue(node, leaf) {
  const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; };
  const norm = (p, q) => {
    if (q < 0n) { p = -p; q = -q; }
    if (q === 1n) return [p, q];
    const g = gcd(p, q);
    return [p / g, q / g];
  };
  const power = (v, k) => (v === 2n ? 1n << BigInt(k) : v ** BigInt(k));
  const ev = (x) => {
    switch (x.k) {
      case 'num': { const [i, f = ''] = x.v.split('.'); return norm(BigInt(i + f), 10n ** BigInt(f.length)); }
      case 'neg': { const [p, q] = ev(x.a); return [-p, q]; }
      case '+': case '-': {
        const [a, b] = ev(x.a), [c, d] = ev(x.b), sign = x.k === '+' ? 1n : -1n;
        return b === 1n && d === 1n ? [a + sign * c, 1n] : norm(a * d + sign * c * b, b * d);
      }
      case '*': { const [a, b] = ev(x.a), [c, d] = ev(x.b); return norm(a * c, b * d); }
      case '/': {
        const [a, b] = ev(x.a), [c, d] = ev(x.b);
        if (c === 0n) throw new Error('division by zero');
        return norm(a * d, b * c);
      }
      case '^': {
        const [p, q] = ev(x.a);
        if (x.rootExp) {  // a^(e/r) that checkFormula found exact: r-th roots of a^e
          const [e, r] = x.rootExp, [a, b] = e >= 0 ? [power(p, e), power(q, e)] : [power(q, -e), power(p, -e)];
          return norm(iroot(a, r), iroot(b, r));
        }
        if (x.exp >= 0) return [power(p, x.exp), power(q, x.exp)];
        if (p === 0n) throw new Error('division by zero');
        return norm(power(q, -x.exp), power(p, -x.exp));
      }
      default: return leaf(x);
    }
  };
  return ev(node);
}

// ⌊v^(1/k)⌋ for a BigInt v ≥ 0 (Newton from above). Also used inside the worker.
function iroot(v, k) {
  if (v < 2n) return v;
  const K = BigInt(k);
  let x = 1n << BigInt(Math.ceil(v.toString(2).length / k));  // at least the root
  for (;;) {
    const y = ((K - 1n) * x + v / x ** (K - 1n)) / K;
    if (y >= x) break;
    x = y;
  }
  while (x ** K > v) x--;
  return x;
}

/* ==============================================================================================
 * PART 2 — CATALOGUES AND STATE
 * ==============================================================================================
 *
 * The fixed lists (Number cards, walk modes, known primes) and the global state of the page.
 */

/* ---- 2.1 Helpers, directions and colours ----------------------------------------------------- */
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


/* ---- 2.2 Number cards ------------------------------------------------------------------------ */
// The formula is the single source of truth: a card only writes one, and lights up again when the
// formula matches it (presetOf, Part 4). Nothing else remembers which card was clicked.
// The Number cards, in groups: each card writes a formula (see Number formulas). Cards with a helper
// menu (Mersenne, primorial, random prime) or a random seed build it when picked. A card is a
// small tile showing the symbol; its name and formula (detail, when the formula is built) are
// in its tooltip, and the Formula field shows what it wrote.
const NUMBER_GROUPS = ['Constants', '𝑓', 'Primes', 'Sequences'];
const PRESETS = {
  pi:      { group: 'Constants', sym: 'π',    name: 'Pi', f: 'pi' },
  e:       { group: 'Constants', sym: 'e',    name: "Euler's number", f: 'e' },
  phi:     { group: 'Constants', sym: 'φ',    name: 'Golden ratio', f: 'phi' },
  gamma:   { group: 'Constants', sym: 'γ',    name: 'Euler–Mascheroni constant', f: 'gamma' },
  catalan: { group: 'Constants', sym: 'G',    name: "Catalan's constant", f: 'catalan' },
  erdos:   { group: 'Constants', sym: 'E',    name: 'Erdős–Borwein constant', f: 'erdos' },
  sqrt2:   { group: '𝑓', sym: '√2', name: 'Square root of 2', f: 'sqrt(2)' },
  cbrt2:   { group: '𝑓', sym: '∛2', name: 'Cube root of 2', f: 'cbrt(2)' },
  pi2:     { group: '𝑓', sym: 'π²', name: 'Pi squared', f: 'pi^2' },
  epi:     { group: '𝑓', sym: 'e^π',  name: "Gelfond's constant", f: 'e^pi' },
  ln2:     { group: '𝑓', sym: 'ln 2', name: 'Natural log of 2', f: 'ln(2)' },
  zeta3:   { group: '𝑓', sym: 'ζ(3)', name: "Apéry's constant", f: 'zeta(3)' },
  frac4_3: { group: '𝑓', sym: '4/3', name: 'Four thirds', f: '4/3' },
  frac16_9: { group: '𝑓', sym: '16/9', name: 'Sixteen ninths', f: '16/9' },
  mersenne: { group: 'Primes', sym: 'Mₚ', name: 'Mersenne prime', detail: '2^p-1', f: () => `2^${$('mersenneP').value}-1` },
  primorial: { group: 'Primes', sym: 'p#', name: 'Primorial prime', detail: 'primorial(p)±1',
               f: () => { const [p, sign] = $('primorialP').value.split(','); return `primorial(${p})${sign > 0 ? '+' : '-'}1`; } },
  randomPrime: { group: 'Primes', sym: '🎲 p', name: 'Random prime', detail: 'randprime(size, seed)',
                 f: () => `randprime(${$('primeSize').value},${freshDraw()})` },
  primeReal: { group: 'Primes', sym: 'ρ₂', name: 'Prime constant', f: 'primes2' },
  random:  { group: 'Sequences', sym: '🎲', name: 'Random digits', detail: 'random(seed)', f: () => `random(${freshDraw()})` },
  champernowne: { group: 'Sequences', sym: 'C', name: 'Champernowne', f: 'champernowne' },
  primeConst: { group: 'Sequences', sym: 'ρ', name: 'Prime barcode (Ulam)', f: 'primes' },
  primeGaps: { group: 'Sequences', sym: 'Δp', name: 'Prime gaps', f: 'primegaps' },
};
const presetFormula = (id) => (typeof PRESETS[id].f === 'function' ? PRESETS[id].f() : PRESETS[id].f);

// What the sequences and ρ₂ mean, for the status line
const FORMULA_NOTES = {
  primes: (b) => `digit k = 0 if k is not prime, else k mod ${b}`,
  primes2: (b) => `ρ = Σ 2^(−p) = 0.0110101000101…₂, the binary barcode read as one number, written in base ${b}`,
  primegaps: (b) => `one digit per gap between odd primes: (gap / 2) mod ${b}`,
};

/* ---- 2.3 Walk modes -------------------------------------------------------------------------- */
// base: the base the digits are written in; lattice: how a step is taken ('square', 'tri', 'hex',
// 'cube' or 'sphere' for a tiled surface); life: a Game of Life instead of a walk. The (hidden)
// mode menu in index.html lists them, grouped as the tabs of the Walk section.
const MODES = {
  turtle:   { base: 3, lattice: 'square',
              rule: 'Base 3 digits on a square grid — <b>0</b> = turn left + step, <b>1</b> = step forward, <b>2</b> = turn right + step' },
  cardinal: { base: 4, lattice: 'square',
              rule: 'Base 4 digits on a square grid — <b>0</b> = step north, <b>1</b> = east, <b>2</b> = south, <b>3</b> = west' },
  spiral:   { base: 2, lattice: 'square', skipZeros: true,
              rule: 'Base 2 digits along a square spiral (Ulam spiral) — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  jump10:   { base: 10, lattice: 'square', points: 'jump',
              rule: 'Base 10 digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  jump64:   { base: 64, lattice: 'square', points: 'jump',
              rule: 'Base 64 digits on the Ulam spiral — jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  search10: { base: 10, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base 10 — cell <b>n</b> is marked when the digits of n appear in the digits of the number' },
  search64: { base: 64, lattice: 'square', points: 'search',
              rule: 'Ulam spiral, base 64 — cell <b>n</b> is marked when the base 64 digits of n appear in the base 64 digits of the number' },
  triSpiral: { base: 2, lattice: 'tri', skipZeros: true,
              rule: 'Base 2 digits along a spiral of triangles — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  hexSpiral: { base: 2, lattice: 'hex', skipZeros: true,
              rule: 'Base 2 digits along a spiral of hexagons — <b>1</b> = draw the step, <b>0</b> = move without drawing' },
  triLR:    { base: 2, lattice: 'tri',
              rule: 'Base 2 digits on triangle tiles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge' },
  triFixed: { base: 3, lattice: 'tri',
              rule: 'Base 3 digits on triangle tiles — cross the <b>0</b> = horizontal edge, <b>1</b> = “/” edge, <b>2</b> = “\\” edge' },
  hexRel:   { base: 5, lattice: 'hex',
              rule: 'Base 5 digits on hexagonal tiles, relative to the edge you came in through — <b>0</b> = sharp left, <b>1</b> = left, <b>2</b> = straight, <b>3</b> = right, <b>4</b> = sharp right' },
  hexFixed: { base: 6, lattice: 'hex',
              rule: 'Base 6 digits on hexagonal tiles — <b>0</b> = N, <b>1</b> = NE, <b>2</b> = SE, <b>3</b> = S, <b>4</b> = SW, <b>5</b> = NW' },
  tetraLR:  { base: 2, lattice: 'sphere', sphere: 'tetra', turns: [2, 1],
              rule: 'Base 2 digits on the surface of a tetrahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  torusWalk: { base: 3, lattice: 'sphere', sphere: 'torus', turns: [3, 2, 1], perspective: true, round: true,
              rule: 'Base 3 digits on the surface of a torus of squares — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  // hexagons: entering through edge k, edge k + 1 is a sharp right, k + 2 right, k + 3 straight on
  hexTorusWalk: { base: 5, lattice: 'sphere', sphere: 'hextorus', turns: [5, 4, 3, 2, 1], perspective: true, round: true,
                  rule: 'Base 5 digits on the surface of a torus of hexagons — <b>0</b> = sharp left, <b>1</b> = left, <b>2</b> = straight, <b>3</b> = right, <b>4</b> = sharp right · colour = number of visits' },
  cubeFlat: { base: 3, lattice: 'sphere', sphere: 'cube', turns: [3, 2, 1], perspective: true,
              rule: 'Base 3 digits on the surface of a cube — <b>0</b> = turn left, <b>1</b> = straight on, <b>2</b> = turn right · colour = number of visits' },
  octaLR:   { base: 2, lattice: 'sphere', sphere: 'octa', turns: [2, 1],
              rule: 'Base 2 digits on the surface of an octahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  icosaLR:  { base: 2, lattice: 'sphere', sphere: 'icosa', turns: [2, 1], round: true,
              rule: 'Base 2 digits on the surface of an icosahedron cut into triangles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge · colour = number of visits' },
  lifeTorus:  { base: 2, lattice: 'sphere', sphere: 'torus', life: true, perspective: true, round: true,
                where: 'a torus (a square grid that wraps around both ways)' },
  lifeHexTorus: { base: 2, lattice: 'sphere', sphere: 'hextorus', life: true, perspective: true, round: true,
                  where: 'a torus of hexagons (6 neighbours each)' },
  lifeCube:   { base: 2, lattice: 'sphere', sphere: 'cube', life: true, perspective: true,
                where: 'the surface of a cube' },
  lifeTetra:  { base: 2, lattice: 'sphere', sphere: 'tetra', life: true,
                where: 'a tetrahedron of triangles' },
  lifeOcta:   { base: 2, lattice: 'sphere', sphere: 'octa', life: true,
                where: 'an octahedron of triangles' },
  lifeIcosa:  { base: 2, lattice: 'sphere', sphere: 'icosa', life: true, round: true,
                where: 'an icosahedron of triangles' },
  cubeRel:  { base: 5, lattice: 'cube', perspective: true,
              rule: 'Base 5 digits in 3D cubes, relative to your heading — <b>0</b> = turn left, <b>1</b> = turn up, <b>2</b> = straight, <b>3</b> = turn down, <b>4</b> = turn right' },
  cubeFixed: { base: 6, lattice: 'cube', perspective: true,
              rule: 'Base 6 digits in 3D cubes — <b>0</b> = north, <b>1</b> = east, <b>2</b> = up, <b>3</b> = south, <b>4</b> = west, <b>5</b> = down' },
};


/* ---- 2.4 Known primes ------------------------------------------------------------------------ */
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


/* ---- 2.5 Global state ------------------------------------------------------------------------ */
// Digits already computed stay in the cache (key: canonical formula + base), so going back to a
// number or a mode is instant.
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
const CAM0 = { yaw: -0.6, pitch: 0.5 };  // the default 3D view
const cam = { ...CAM0 };                 // 3D view rotation (radians)
let bounds3 = null;                        // 3D bounding box of points 0..cur

const stage = $('stage');
const layers = {
  grid: $('gridLayer').getContext('2d'),
  path: $('pathLayer').getContext('2d'),
  overlay: $('overlayLayer').getContext('2d'),
};
let cw = 0, ch = 0;

/* ==============================================================================================
 * PART 3 — LABELS, DIGIT COUNTS AND RANDOM DRAWS
 * ==============================================================================================
 */

/* ---- 3.1 Subtitle, colour menu and number of digits ------------------------------------------ */
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
  return `Game of Life on ${where} — the base-${C} digits seed the cells (<b>0</b> = dead, <b>1</b> = alive${states}); ` +
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


/* ---- 3.2 Seeded random draws ----------------------------------------------------------------- */
// Random things are reproducible: random digits and random primes come from a seed written in the
// formula (random(81244), randprime(300,81244)), so a link or a saved setup always gives back the
// same digits. freshDraw only picks a new seed; the formula keeps it.
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
const freshDraw = () => crypto.getRandomValues(new Uint32Array(1))[0] % 1e9;

/* ==============================================================================================
 * PART 4 — NUMBER FORMULAS
 * ==============================================================================================
 *
 * Every number is a formula: pi, sqrt(2), (1+sqrt(5))/2, 2^pi, ln(3), zeta(5), 22/7, 2^127-1,
 * primorial(392113)+1, randprime(300,81244), random(81244), champernowne… The Number cards only
 * write formulas, and a setup stores the formula: one uniform way to store every number.
 *
 * Why a language of our own rather than math.js or another library: they compute with floating
 * point (about 16 digits) or with a fixed-precision decimal type, while we need up to a million
 * exact digits in any base, computed in a worker with the algorithms of Part 1. So only the
 * syntax is borrowed (the usual calculator one: + − * / ^, sqrt(…), ln(…)); the parser, the
 * checks and the evaluation are ours, a few hundred lines, with no dependency.
 *
 * Canonical form: what is stored is the formula as written, tidied up — no spaces, lower case,
 * π → pi, × → *, only the parentheses needed. So "PI", " π " and a click on the π card all store
 * "pi". It is deliberately not algebra: pi*pi stays pi*pi and does not become pi^2. Simplifying
 * would need a computer algebra system and would rewrite the user's formula under their eyes; two
 * writings of one value just give two links, with the same digits.
 *
 * Kinds, set on every node by checkFormula:
 *   'int'   an exact integer             2^127-1, primorial(11)+1, sqrt(16)
 *   'rat'   an exact fraction            22/7, 2^-1, (16/81)^(3/4)
 *   'real'  computed with guard digits   pi, sqrt(2), 2^pi, ln(3)
 *   'seq'   a sequence of digits defined base by base (random, champernowne, primes, primegaps).
 *           It is not a number, so it only stands alone: random(5)+1 is refused.
 * The kind decides where digits come from: sequences on the page (seqDigits), everything else in
 * the worker. An integer is walked through its own digits only (no digits after the point).
 */

/* ---- 4.1 Vocabulary -------------------------------------------------------------------------- */
const FORMULA_NAMES = {  // name: [kind, symbol shown]
  pi: ['real', 'π'], e: ['real', 'e'], phi: ['real', 'φ'], gamma: ['real', 'γ'], catalan: ['real', 'G'],
  erdos: ['real', 'E'], primes2: ['real', 'ρ₂'],
  champernowne: ['seq', 'C'], primes: ['seq', 'ρ'], primegaps: ['seq', 'Δp'],
};
const FORMULA_FUNCTIONS = { sqrt: 1, cbrt: 1, root: 2, ln: 1, exp: 1, log: 2, zeta: 1, primorial: 1, random: 1, randprime: 2 };
const APPROX = { pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, gamma: 0.5772156649, catalan: 0.9159655942,
                 erdos: 1.6066951524, primes2: 0.4146825099 };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };  // anything else binds tighter (5)
const precOf = (x) => PREC[x.k] ?? 5;
const formulaKids = (x) => (x.k === 'call' ? x.args : x.k === 'neg' ? [x.a] : x.a ? [x.a, x.b] : []);
const formulaNodes = (x) => [x, ...formulaKids(x).flatMap(formulaNodes)];

/* ---- 4.2 Parser ------------------------------------------------------------------------------ */
// A small recursive-descent parser, one function per precedence level (expr → term → unary →
// power → primary). Unicode input is turned into plain names first, so the rest only sees ASCII.
// Text → tree of { k: 'num' | 'name' | 'call' | 'neg' | '+' | '-' | '*' | '/' | '^', … }.
// Accepts π φ γ √ ∛ − × · ÷, any case, and implicit products like 2pi.
function parseFormula(text) {
  const src = text.replace(/π/g, ' pi ').replace(/φ/g, ' phi ').replace(/γ/g, ' gamma ')
    .replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/');
  const tokens = [], re = /(\d+(?:\.\d+)?)|([a-z_][a-z0-9_]*)|([-+*/^(),√∛])/iy;
  for (let pos = 0; pos < src.length;) {
    if (/\s/.test(src[pos])) { pos++; continue; }
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new Error(`unexpected “${src[pos]}”`);
    pos = re.lastIndex;
    if (m[1]) {  // number without useless zeros: 007 → 7, 1.50 → 1.5
      const [i, f = ''] = m[1].split('.'), int = i.replace(/^0+(?=\d)/, ''), frac = f.replace(/0+$/, '');
      tokens.push({ t: 'num', v: frac ? `${int}.${frac}` : int });
    } else tokens.push(m[2] ? { t: 'id', v: m[2].toLowerCase() } : { t: m[3] });
  }
  let i = 0;
  const peek = () => tokens[i]?.t;
  const expect = (t) => { if (peek() !== t) throw new Error(`“${t}” expected`); i++; };
  const expr = () => {
    let a = term();
    while (peek() === '+' || peek() === '-') a = { k: tokens[i++].t, a, b: term() };
    return a;
  };
  const term = () => {
    let a = unary();
    for (;;) {
      if (peek() === '*' || peek() === '/') a = { k: tokens[i++].t, a, b: unary() };
      else if (['num', 'id', '(', '√', '∛'].includes(peek())) a = { k: '*', a, b: power() };  // 2pi
      else return a;
    }
  };
  const unary = () => {
    if (peek() === '-') { i++; return { k: 'neg', a: unary() }; }
    if (peek() === '+') { i++; return unary(); }
    return power();
  };
  const power = () => {
    const a = primary();
    if (peek() !== '^') return a;
    i++;
    return { k: '^', a, b: unary() };  // right to left: 2^3^2 = 2^(3^2)
  };
  const primary = () => {
    const x = tokens[i++];
    if (!x) throw new Error('the formula is incomplete');
    if (x.t === 'num') return { k: 'num', v: x.v };
    if (x.t === '(') { const a = expr(); expect(')'); return a; }
    if (x.t === '√' || x.t === '∛') return { k: 'call', f: x.t === '√' ? 'sqrt' : 'cbrt', args: [power()] };
    if (x.t === 'id' && FORMULA_FUNCTIONS[x.v] !== undefined) {
      const args = [];
      if (peek() === '(') {  // random and randprime(300) may leave out their seed
        i++;
        if (peek() !== ')') {
          args.push(expr());
          while (peek() === ',') { i++; args.push(expr()); }
        }
        expect(')');
      }
      return { k: 'call', f: x.v, args };
    }
    if (x.t === 'id' && FORMULA_NAMES[x.v]) return { k: 'name', v: x.v };
    if (x.t === 'id') throw new Error(`unknown name “${x.v}”`);
    throw new Error(`unexpected “${x.t}”`);
  };
  if (!tokens.length) throw new Error('empty');
  const ast = expr();
  if (i < tokens.length) throw new Error(`unexpected “${tokens[i].v ?? tokens[i].t}”`);
  return ast;
}


/* ---- 4.3 Printing: the canonical text and the symbol shown ----------------------------------- */
// The canonical text: no spaces, lower case, explicit *, only the parentheses needed
function canonical(x) {
  const wrap = (y, need) => (need ? `(${canonical(y)})` : canonical(y));
  switch (x.k) {
    case 'num': case 'name': return x.v;
    case 'call': return `${x.f}(${x.args.map(canonical).join(',')})`;
    case 'neg': return `-${wrap(x.a, precOf(x.a) <= 3)}`;  // -(a+b), -(-a)
    case '^': return `${wrap(x.a, precOf(x.a) <= 4)}^${wrap(x.b, precOf(x.b) < 3)}`;
    default: return `${wrap(x.a, precOf(x.a) < PREC[x.k])}${x.k}${wrap(x.b, precOf(x.b) <= PREC[x.k])}`;
  }
}

// The symbol shown in the title and the status: π², √2, e^π, 392,113# + 1, 🎲…
const SUP = (v) => String(v).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
function pretty(x) {
  const wrap = (y, need) => (need ? `(${pretty(y)})` : pretty(y));
  const arg = (y) => wrap(y, y.k !== 'num' && y.k !== 'name');
  switch (x.k) {
    case 'num': return x.v;
    case 'name': return FORMULA_NAMES[x.v][1];
    case 'neg': return `−${wrap(x.a, precOf(x.a) <= 3)}`;
    case '^': return x.b.k === 'num' && !x.b.v.includes('.') && x.b.v.length <= 3
      ? `${wrap(x.a, precOf(x.a) <= 4)}${SUP(x.b.v)}` : `${wrap(x.a, precOf(x.a) <= 4)}^${wrap(x.b, precOf(x.b) < 3)}`;
    case 'call': {
      const [a, b] = x.args;
      return { sqrt: () => `√${arg(a)}`, cbrt: () => `∛${arg(a)}`, root: () => `${SUP(b.v)}√${arg(a)}`,
               ln: () => (a.k === 'num' || a.k === 'name' ? `ln ${pretty(a)}` : `ln(${pretty(a)})`),
               exp: () => `exp(${pretty(a)})`, zeta: () => `ζ(${pretty(a)})`,
               log: () => (b.k === 'num' && !b.v.includes('.') ? `log${SUB(b.v)} ${arg(a)}` : `log(${pretty(a)}, ${pretty(b)})`), primorial: () => `${fmt(Number(a.v))}#`,
               random: () => '🎲', randprime: () => `🎲 p${SUB(a.v)}` }[x.f]();
    }
    default: {
      const op = { '+': ' + ', '-': ' − ', '*': '·', '/': '/' }[x.k];
      return `${wrap(x.a, precOf(x.a) < PREC[x.k])}${op}${wrap(x.b, precOf(x.b) <= PREC[x.k])}`;
    }
  }
}

/* ---- 4.4 Checking: sizes, small exact values and kinds --------------------------------------- */
// Sizes are estimated as log10, which never overflows even for 2^136279841-1 or exp(10^9): they
// give the guard digits, and refuse what is too large before any work starts.
// ≈ log10 of the value of a checked node, never overflowing (sizes and guard digits)
function formulaLog10(x) {
  const L = formulaLog10, a = x.args?.[0];
  switch (x.k) {
    case 'num': { const f = Math.log10(Number(x.v)); return Number.isFinite(f) ? f : f > 0 ? x.v.split('.')[0].length - 1 : 0; }
    case 'name': return x.kind === 'seq' ? 0 : Math.log10(APPROX[x.v]);
    case 'neg': return L(x.a);
    case '+': case '-': return Math.max(L(x.a), L(x.b)) + 0.302;
    case '*': return L(x.a) + L(x.b);
    case '/': return L(x.a) - L(x.b);
    case '^': {  // a^b: b·log10 a, with b ≈ ±10^L(b) when it is not a whole number
      if (x.exp !== undefined) return x.exp * L(x.a);
      return Math.min(1e9, 10 ** Math.min(9, L(x.b))) * Math.abs(L(x.a));
    }
    default: return { sqrt: () => L(a) / 2, cbrt: () => L(a) / 3, root: () => L(a) / Number(x.args[1].v),
                      ln: () => Math.log10(Math.max(Math.abs(L(a)) * Math.LN10, 0.01)), log: () => 0,
                      exp: () => Math.min(1e9, 10 ** Math.min(9, L(a))) / Math.LN10,
                      zeta: () => 0.2, primorial: () => Number(a.v) / Math.LN10,
                      randprime: () => Number(a.v) - 1, random: () => 0 }[x.f]();
  }
}

// Exact value of a small exact node, else null (while checking: perfect powers, exponents)
function smallExact(x) {
  if (x.kind !== 'int' && x.kind !== 'rat') return null;
  if (formulaNodes(x).some((y) => y.k === 'call') || Math.abs(formulaLog10(x)) > 1000) return null;
  try { return exactValue(x, () => { throw new Error('not small'); }); } catch { return null; }
}

// Checks a parsed formula, fills in the random seeds left out, and sets node.kind (and for powers
// node.exp, node.eBase or node.rootExp). Throws an Error with a readable message.
function checkFormula(root) {
  const noSeq = (x) => {
    if (x.kind === 'seq') throw new Error(`${canonical(x)} is a sequence of digits, not a number: use it alone`);
  };
  const whole = (x, lo, hi, what) => {
    if (x.k !== 'num' || x.v.includes('.') || Number(x.v) < lo || Number(x.v) > hi) {
      throw new Error(`${what} must be a whole number from ${fmt(lo)} to ${fmt(hi)}`);
    }
    return Number(x.v);
  };
  const visit = (x) => {
    if (x.k === 'call') {
      if (x.f === 'random' && !x.args.length) x.args.push({ k: 'num', v: String(freshDraw()) });
      if (x.f === 'randprime' && x.args.length === 1) x.args.push({ k: 'num', v: String(freshDraw()) });
      const arity = FORMULA_FUNCTIONS[x.f];
      if (x.args.length !== arity) throw new Error(`${x.f}(…) takes ${arity} value${arity > 1 ? 's' : ''}`);
    }
    formulaKids(x).forEach(visit);
    switch (x.k) {
      case 'num': x.kind = x.v.includes('.') ? 'rat' : 'int'; break;
      case 'name': x.kind = FORMULA_NAMES[x.v][0]; break;
      case 'neg': noSeq(x.a); x.kind = x.a.kind; break;
      case '+': case '-': case '*':
        noSeq(x.a); noSeq(x.b);
        x.kind = x.a.kind === 'real' || x.b.kind === 'real' ? 'real' : x.a.kind === 'int' && x.b.kind === 'int' ? 'int' : 'rat';
        break;
      case '/':
        noSeq(x.a); noSeq(x.b);
        if (x.a.kind === 'real' || x.b.kind === 'real') x.kind = 'real';
        else { x.kind = 'rat'; const v = smallExact(x); if (v && v[1] === 1n) x.kind = 'int'; }
        break;
      case '^': {
        noSeq(x.a); noSeq(x.b);
        const k = x.b.kind === 'int' ? smallExact(x.b) : null;
        if (k && k[0] <= 100_000_000n && k[0] >= -100_000_000n) {  // a whole power: exact when a is
          x.exp = Number(k[0]);
          x.kind = x.a.kind === 'real' ? 'real' : x.exp < 0 ? 'rat' : x.a.kind;
          break;
        }
        // any other power: e^y, a^(p/q) with a small q (a root, exact when a^p is a perfect q-th power),
        // else e^(y·ln a)
        x.kind = 'real';
        if (x.a.k === 'name' && x.a.v === 'e') { x.eBase = true; break; }
        const r = x.b.kind === 'rat' ? smallExact(x.b) : null;
        if (r && r[1] <= 64n && r[0] <= 1000n && r[0] >= -1000n) {
          x.rootExp = [Number(r[0]), Number(r[1])];
          const v = smallExact(x.a);
          if (v && v[0] >= 0n) {
            const [e, q] = x.rootExp, K = BigInt(q), up = e >= 0 ? [v[0] ** BigInt(e), v[1] ** BigInt(e)] : [v[1] ** BigInt(-e), v[0] ** BigInt(-e)];
            if (up[1] !== 0n && iroot(up[0], q) ** K === up[0] && iroot(up[1], q) ** K === up[1]) x.kind = x.a.kind === 'int' && e >= 0 ? 'int' : 'rat';
          }
        }
        break;
      }
      case 'call':
        switch (x.f) {
          case 'random': whole(x.args[0], 0, 4294967295, 'The seed of random(…)'); x.kind = 'seq'; break;
          case 'randprime':
            whole(x.args[0], 10, 5000, 'The size of randprime(size, seed)');
            whole(x.args[1], 0, 4294967295, 'The seed of randprime(size, seed)');
            x.kind = 'int';
            break;
          case 'primorial': whole(x.args[0], 2, 20_000_000, 'p in primorial(p)'); x.kind = 'int'; break;
          case 'ln': case 'exp': noSeq(x.args[0]); x.kind = 'real'; break;
          case 'log': noSeq(x.args[0]); noSeq(x.args[1]); x.kind = 'real'; break;
          case 'zeta': whole(x.args[0], 2, 100, 'k in zeta(k)'); x.kind = 'real'; break;
          default: {  // sqrt, cbrt, root: exact when the value is a perfect power
            noSeq(x.args[0]);
            const k = x.f === 'sqrt' ? 2 : x.f === 'cbrt' ? 3 : whole(x.args[1], 2, 64, 'The degree k in root(x, k)');
            const v = smallExact(x.args[0]), K = BigInt(k);
            const perfect = v && v[0] >= 0n && iroot(v[0], k) ** K === v[0] && iroot(v[1], k) ** K === v[1];
            x.kind = perfect ? x.args[0].kind : 'real';
          }
        }
    }
  };
  visit(root);
}


/* ---- 4.5 Reading the Formula field ----------------------------------------------------------- */
// The formula of the Formula field, checked and written back in canonical form
let formulaInUse = 'pi';  // the last formula that was valid, for the link and the saved setups
function readFormula() {
  try {
    const ast = parseFormula($('formula').value);
    checkFormula(ast);
    const text = canonical(ast), nodes = formulaNodes(ast);
    const mag = Math.max(...nodes.map((x) => Math.abs(formulaLog10(x))));
    if (ast.kind === 'int' && formulaLog10(ast) > 45e6) throw new Error('too large: more than 45 million decimal digits');
    if (ast.kind === 'real' && mag > 1e5) throw new Error('too large or too small for a computation with guard digits');
    $('formula').value = formulaInUse = text;
    const m = text.match(/^2\^(\d+)-1$/);  // a Mersenne prime shows as M₁₂₇
    const sym = m && MERSENNE.includes(Number(m[1])) ? `M${SUB(m[1])}` : pretty(ast);
    const root = ast.k === 'name' ? ast.v : ast.k === 'call' ? ast.f : null;
    return { ast, text, sym, root, kind: ast.kind, mag, nodes: nodes.length, log10: formulaLog10(ast) };
  } catch (err) {
    return { error: err.message };
  }
}


/* ---- 4.6 Number cards: from a formula to its card and back ----------------------------------- */
// The card a formula comes from, with the value of its helper menu; none for a formula of its own
function presetOf(text) {
  const found = Object.keys(PRESETS).find((id) => PRESETS[id].f === text);
  if (found) return { id: found };
  let m;
  if ((m = text.match(/^2\^(\d+)-1$/)) && MERSENNE.includes(Number(m[1]))) return { id: 'mersenne', mersenneP: m[1] };
  if ((m = text.match(/^primorial\((\d+)\)([+-])1$/))
      && (m[2] === '+' ? PRIMORIAL_PLUS : PRIMORIAL_MINUS).includes(Number(m[1]))) {
    return { id: 'primorial', primorialP: `${m[1]},${m[2] === '+' ? 1 : -1}` };
  }
  if (/^random\(\d+\)$/.test(text)) return { id: 'random' };
  if ((m = text.match(/^randprime\((\d+),\d+\)$/)) && Array.from($('primeSize').options).some((o) => o.value === m[1])) {
    return { id: 'randomPrime', primeSize: m[1] };
  }
  return { id: null };  // a formula of its own: no card
}

// The cards and their helper menus follow the formula
function syncNumberMenu() {
  const p = presetOf($('formula').value);
  renderNumberPicker(p.id);
  for (const helper of ['mersenneP', 'primorialP', 'primeSize']) if (p[helper]) $(helper).value = p[helper];
  $('mersenneRow').hidden = p.id !== 'mersenne';
  $('primorialRow').hidden = p.id !== 'primorial';
  $('primeSizeRow').hidden = p.id !== 'randomPrime';
}

// Every number at once, in small groups (Constants, 𝑓, Primes, Sequences): tiles showing the
// symbol, several per row, the name and the formula on hover. The helper menus of the primes
// (which Mersenne, which primorial, what size) sit right under the Primes group.
function renderNumberPicker(active) {
  $('numberList').replaceChildren(...NUMBER_GROUPS.map((group) => {
    const box = document.createElement('div'), label = document.createElement('div'), grid = document.createElement('div');
    label.className = 'field-label';  // styled like Formula and Number of digits
    label.textContent = group;
    grid.className = 'number-grid';
    grid.setAttribute('role', 'listbox');
    grid.append(...Object.entries(PRESETS).filter(([, p]) => p.group === group).map(([id, p]) => {
      const b = document.createElement('button');
      b.textContent = p.sym;
      b.title = `${p.name} — ${p.detail ?? p.f}`;
      b.setAttribute('role', 'option');
      b.classList.toggle('active', id === active);
      b.addEventListener('click', () => pickPreset(id));  // again on 🎲: another draw
      return b;
    }));
    box.append(label, grid);
    if (group === 'Primes') box.append($('mersenneRow'), $('primorialRow'), $('primeSizeRow'));
    return box;
  }));
}

const isRandomDigits = () => /^random\(\d+\)$/.test(formulaInUse);


/* ---- 4.7 Sequences and digit helpers --------------------------------------------------------- */
// Digits of a sequence (kind 'seq'), computed on the main thread
function seqDigits(ast, n, base) {
  const digits = new Uint8Array(n), name = ast.k === 'call' ? ast.f : ast.v;
  if (name === 'random') {  // reproducible: the same seed always gives the same digits
    const rng = seededRandom(Number(ast.args[0].v));
    const lim = 2 ** 32 - (2 ** 32 % base);  // rejection sampling for a uniform distribution
    for (let i = 0; i < n; i++) {
      let r;
      do r = rng(); while (r >= lim);
      digits[i] = r % base;
    }
  } else if (name === 'champernowne') {  // 0.1 2 3 … written in base b one after another
    for (let i = 0, k = 1; i < n; k++) {
      const t = digitString(k, base);
      for (let c = 0; c < t.length && i < n; c++) digits[i++] = t.charCodeAt(c) - 48;
    }
  } else if (name === 'primes') {
    // digit k (k = 1, 2, …) is 0 if k is not prime, else k mod b; a prime equal to b counts as 1.
    // In base 2 this is exactly the binary expansion of the prime constant ρ = Σ 2^(−p)
    const composite = sieve(n);
    for (let k = 2; k <= n; k++) if (!composite[k]) digits[k - 1] = k % base || 1;
  } else {  // primegaps
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
  }
  return { intPart: '0', digits };
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

/* ==============================================================================================
 * PART 5 — PICKING A MODE, COMPUTING, BUILDING THE WALK
 * ==============================================================================================
 *
 * compute() is the one entry point: any change (number, mode, surface, rule, digits) calls it. It
 * reads the formula, shows the controls the mode needs, takes the digits from the cache or from
 * the worker, then builds the whole walk (buildWalk) and shows it complete.
 */

/* ---- 5.1 Walk mode picker -------------------------------------------------------------------- */
// The categories of the (hidden) mode menu as tabs, and every choice of the selected tab as a
// list. Picking a choice sets the menu and fires its change event, so the rest of the page only
// ever deals with the menu.
let modeTab = null;  // label of the category shown (may differ from the current mode's while browsing)
const tabName = (label) => ({ 'Cellular automata on surfaces': 'Automata', Experimental: '🧪' }[label] || label);

// Icon of each walk mode's shape, for the list of choices
const MODE_ICONS = {
  turtle: '▦', cardinal: '✥', triLR: '▲', triFixed: '△', hexRel: '⬢', hexFixed: '⬡',
  cubeRel: '⧉', cubeFixed: '▣', torusWalk: '◎', hexTorusWalk: '⬡', cubeFlat: '◼', tetraLR: '▲', octaLR: '◆', icosaLR: '⬟',
  lifeTorus: '◎', lifeHexTorus: '⬡', lifeCube: '◼', lifeTetra: '▲', lifeOcta: '◆', lifeIcosa: '⬟',
  spiral: '▦', triSpiral: '▲', hexSpiral: '⬢', jump10: '⤳', jump64: '⤳', search10: '⌕', search64: '⌕',
};

// "Cubes — base 5 (5 relative turns)" → name "Cubes", base "base 5", detail "5 relative turns"
function splitModeLabel(text) {
  const [head, tail = ''] = text.replace(/^Life — /, '').split(' — ');
  const m = tail.match(/^(base \d+)\s*(?:\((.*)\))?$/) || [null, '', ''];
  const inName = head.match(/^(.*?)\s*\((.*)\)$/);  // "torus (square grid)"
  const name = inName ? inName[1] : head;
  return { name: name[0].toUpperCase() + name.slice(1), base: m[1] || '', detail: m[2] || (inName ? inName[2] : '') };
}

function renderModePicker() {
  const groups = Array.from($('mode').querySelectorAll('optgroup'));
  const currentGroup = $('mode').selectedOptions[0].parentElement.label;
  if (!modeTab) modeTab = currentGroup;
  $('modeTabs').replaceChildren(...groups.map((g) => {
    const b = document.createElement('button');
    b.textContent = tabName(g.label);
    b.title = g.label;
    b.setAttribute('role', 'tab');
    b.classList.toggle('active', g.label === modeTab);
    b.addEventListener('click', () => {  // another tab starts on its first choice
      if (g.label === modeTab) return;
      modeTab = g.label;
      $('mode').value = g.querySelector('option').value;
      $('mode').dispatchEvent(new Event('change'));
    });
    return b;
  }));
  const group = groups.find((g) => g.label === modeTab);
  $('modeList').replaceChildren(...Array.from(group.children).map((o) => {
    const b = document.createElement('button');
    const { name, base, detail } = splitModeLabel(o.text);  // the Life tab already says "Life"
    // an automaton's pill tells the shape of its cells, where a walk's tells its base
    const mode = MODES[o.value], pill = mode.life ? SPHERES[mode.sphere].unit : base, info = mode.life ? '' : detail;
    const part = (cls, text) => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e; };
    const words = document.createElement('span');
    words.append(part('mode-name', name), ...(info ? [part('mode-detail', info)] : []));
    b.append(part('mode-icon', MODE_ICONS[o.value] || '•'), words, ...(pill ? [part('mode-base', pill)] : []));
    b.title = o.text;
    b.setAttribute('role', 'option');
    b.classList.toggle('active', o.value === $('mode').value);
    b.addEventListener('click', () => {
      if (o.value === $('mode').value) return;
      $('mode').value = o.value;
      $('mode').dispatchEvent(new Event('change'));
    });
    return b;
  }));
}

/* ---- 5.2 compute(): from the formula to a built walk ----------------------------------------- */
function compute() {
  const mode = MODES[$('mode').value];
  modeTab = $('mode').selectedOptions[0].parentElement.label;  // show the tab of the mode in use
  renderModePicker();
  if (mode.sphere) fillSphereSizes(mode.sphere);
  const n = digitsNeeded();
  if (!mode.life) $('digits').value = n;
  relabelColours(!!mode.life);
  $('automataSection').hidden = !mode.life;  // rule and hunt, for the cellular automata only
  // a new number, surface, size or rule ends any hunt: its champion would not fit any more
  stopHunt();
  $('huntStatus').textContent = '';
  $('digitsRow').hidden = !!mode.life;  // Life takes one digit per cell of the surface
  $('lifeCustomRow').hidden = !mode.life || $('lifePreset').value !== 'custom';
  $('sphereRow').hidden = mode.lattice !== 'sphere';
  syncSizeStepper();
  updateRuleText();
  if (worker) { worker.terminate(); worker = null; setBusy(false); }
  championCode = null;  // a new start: no loaded champion any more
  const F = readFormula();
  syncNumberMenu();
  // Compute applies a new number of digits: Life needs none (one digit per cell, recomputed on every
  // change), and a new random draw is a click on its 🎲 tile again
  $('compute').hidden = !!mode.life;
  if (F.error) {
    $('status').textContent = `Formula: ${F.error}`;
    return;
  }
  const { sym, kind } = F;
  $('titleSym').textContent = sym;
  const base = mode.life ? lifeStates() : mode.base;  // Life: the number of states of the rule
  const key = `${F.text}/${base}`;
  // Status wording: "π in base 3 · 20,000 digits" for walks, "10,240 cells seeded with π in base 3" for Life
  const cells = mode.life ? n : 0;
  const label = (count) => (!mode.life ? `${sym} in base ${base} · ${fmt(count)} digits`
    : count < cells ? `${fmt(count)} of ${fmt(cells)} cells seeded with ${sym} in base ${base} (the others start dead)`
    : `${fmt(cells)} cells seeded with ${sym} in base ${base}`);
  const note = FORMULA_NOTES[F.root] ? ` — ${FORMULA_NOTES[F.root](base)}` : '';

  if (kind === 'seq') {
    setCurrent(seqDigits(F.ast, n, base));
    $('status').textContent = label(n) + note;
    buildWalk();
    showAll();
    applyPendingView();
    return;
  }

  const integer = kind === 'int';
  const done = (entry, how) => {
    setCurrent(entry);
    const total = entry.total ?? current.head.length + current.digits.length;
    const what = F.root === 'randprime'
      ? `${label(total)}: a random ${fmt(Number(F.ast.args[0].v))}-digit probable prime, found after ${fmt(entry.tests)} Miller–Rabin tests`
      : integer ? label(total) : label(n) + note;
    const warning = entry.uncertain ? ' ⚠ the value is extremely close to a round number: the last digits could be off by one' : '';
    $('status').textContent = `${what} ${how}${integer && total > n && !mode.life ? ` — walking the first ${fmt(n)}` : ''}${warning}`;
    buildWalk();
    showAll();
    applyPendingView();
  };
  const hit = cache[key];
  const enough = integer ? hit && (hit.intPart.length >= n || hit.intPart.length === hit.total)
                         : hit && hit.digits.length >= n;
  if (enough) {
    done(hit, '(cached)');
    return;
  }
  // the worker also needs digitString, seededRandom, exactValue and iroot
  const src = [digitString, seededRandom, exactValue, iroot].map(String).join('\n') + `\n(${formulaWorker.toString()})()`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  const slow = F.log10 > 6e6 || (F.root === 'randprime' && Number(F.ast.args[0].v) > 1000);
  $('status').textContent =
    (F.root === 'randprime' ? `Searching for a random ${fmt(Number(F.ast.args[0].v))}-digit prime…`
      : `Computing ${integer || mode.life ? `${sym} in base ${base}` : label(n)}…`) +
    (slow ? ' (this can take a minute or more)' : '');
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'progress') {
      $('progressBar').style.width = `${Math.min(100, d.p * 100)}%`;
      return;
    }
    worker.terminate();
    worker = null;
    setBusy(false);
    if (d.type === 'error') {
      $('status').textContent = `Formula: ${d.message}`;
      return;
    }
    const entry = { intPart: d.intPart, digits: d.digits, total: d.total, tests: d.tests, uncertain: d.uncertain };
    cache[key] = entry;
    done(entry, `(${(d.ms / 1000).toFixed(2)} s)`);
  };
  worker.postMessage({ ast: F.ast, n, base, mag: F.mag, nodes: F.nodes });
}

function setBusy(busy) {
  $('compute').disabled = busy;
  $('compute').textContent = busy ? 'Computing…' : 'Compute';
  $('progressBar').style.width = '0';
  $('progress').hidden = !busy;  // the bar only shows while computing
}

/* ---- 5.3 Building the walk ------------------------------------------------------------------- */
// All positions, distances and counts are computed once into typed arrays: the animation, the
// stats and the jumps only read them.
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


/* ---- 5.4 3D projection and camera ------------------------------------------------------------ */
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

// Rotate around a centre that keeps its position on screen: the solid's own centre (the origin)
// for a surface, else the centre of the walk's bounding box. (On a surface that box grows
// unevenly with the walk: turning around it made the solid slide while auto-fit followed the
// walker.) Then recompute the projection and the 2D bounds.
function rotateView(dyaw, dpitch) {
  const [x0, x1, y0, y1, z0, z1] = bounds3 || [0, 0, 0, 0, 0, 0];
  const c = walk.sphere ? [0, 0, 0] : [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const before = projectPoint(...c);
  cam.yaw += dyaw;
  cam.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cam.pitch + dpitch));
  if (!walk.is3d) return;
  const after = projectPoint(...c);
  view.ox += (before[0] - after[0]) * view.scale;
  view.oy += (before[1] - after[1]) * view.scale;
  if (viewGoal) {  // a smooth auto-fit under way follows the same shift
    viewGoal.cx -= before[0] - after[0];
    viewGoal.cy -= before[1] - after[1];
  }
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
    ? 'Drag: rotate · Shift+drag: pan · Wheel: zoom · Double-click: auto-fit'
    : 'Wheel: zoom · Drag: pan · Double-click: auto-fit';
  $('autoRotateRow').hidden = !walk.is3d;
  $('skyRow').hidden = !walk.is3d;
  $('perspectiveRow').hidden = !perspectiveAllowed();
  updateMorphButton();  // shown only for surfaces that can change shape
}

/* ==============================================================================================
 * PART 6 — WALKS ON LATTICES AND SPIRALS
 * ==============================================================================================
 *
 * A stepper turns one digit into the next cell. Cells are identified by a numeric key, cheaper
 * than strings in the Sets that count distinct cells; positions are the cell centres.
 */

/* ---- 6.1 Square grid ------------------------------------------------------------------------- */
// Key of the 2D cell (x, y), for |x| and |y| below 2^21
function key(x, y) {
  return (x + 2 ** 21) * 2 ** 22 + (y + 2 ** 21);
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

/* ---- 6.2 Cubic lattice ----------------------------------------------------------------------- */
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

/* ---- 6.3 Hexagons ---------------------------------------------------------------------------- */
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

/* ---- 6.4 Triangles --------------------------------------------------------------------------- */
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

/* ---- 6.5 Ulam spiral: jumps and searches ----------------------------------------------------- */
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

/* ==============================================================================================
 * PART 7 — TILED SURFACES
 * ==============================================================================================
 *
 * A surface is a mesh of tiles (squares or triangles) with, for every edge, the tile across it.
 * Walks go from tile to tile through those edges, and the Game of Life uses the same adjacency,
 * so both work the same way on a cube, a polyhedron or a torus.
 *
 * Flat ↔ round: the cube, the polyhedra and the torus can be shown flat (the faces of the solid,
 * an unrolled torus) or round (inflated onto a sphere, a rolled-up torus). Only the 3D positions
 * change: the tiles, their neighbours, the walk and the Life run stay the same, which is why the
 * change can be animated while the walk goes on. The torus rolls up away from the default
 * camera, so the middle of the sheet — where the hunt puts its small starts — stays in front.
 */

/* ---- 7.1 Meshes ------------------------------------------------------------------------------ */
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

/* ---- 7.2 Cube -------------------------------------------------------------------------------- */
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

/* ---- 7.3 Polyhedra with triangular faces ----------------------------------------------------- */
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

/* ---- 7.4 Torus ------------------------------------------------------------------------------- */
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
  // it rolls up away from the default camera (towards +y), so the middle of the sheet stays in front
  if (c < 1e-6) return [X, -w, h];
  const rr = 1 / c, ph = X / rr;
  return [(rr + w) * Math.sin(ph), rr - c - (rr + w) * Math.cos(ph), h];  // − c: no jump from the flat sheet
}

function torusMesh(nv) {
  const key = `torus${nv}`;
  if (meshCache[key]) return meshCache[key];
  const nu = Math.round(nv / TORUS_TUBE);  // squares about as long around the ring as around the tube
  const { verts, add } = vertexStore();
  const at = (i, j) => add(...torusPoint(i, j, nu, nv, 1));  // i = nu and i = 0 meet (same for j)
  const quads = [], uv = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      quads.push(c.map(([a, b]) => at(a, b)));
      uv.push(...c.flat());
    }
  }
  return (meshCache[key] = finishTorus(verts, quads, 4, nu, nv, uv));
}

// A torus mesh keeps the sheet coordinates (i, j) of every tile corner (uv, in listing order):
// when unrolled (m < 1) its seams open, so shapeAt places corners per tile, not per vertex
function finishTorus(verts, tiles, sides, nu, nv, uv) {
  // outwards = away from the circle running through the middle of the tube
  const fromTubeAxis = ([x, y, z]) => { const l = Math.hypot(x, y) || 1; return [x - x / l, y - y / l, z]; };
  const mesh = finishMesh(verts, tiles, sides, nv, fromTubeAxis);
  Object.assign(mesh, { torus: true, nu, nv, uv: new Float64Array(uv) });
  return mesh;
}

/* Torus of regular hexagons (flat-topped): nu columns around the ring, nv rows around the tube;
 * odd columns sit half a row higher, so nu must be even for the columns to close up. In sheet
 * units a column is 1.5·R wide and a row √3·R high; the sheet is 2π by 2π·TUBE, so the hexagons
 * are regular when nu / nv = √3 / (1.5·TUBE). Every hexagon has 6 neighbours, all across an edge. */
const hexTorusColumns = (nv) => 2 * Math.round((nv * Math.sqrt(3)) / (3 * TORUS_TUBE));
function hexTorusMesh(nv) {
  const key = `hextorus${nv}`;
  if (meshCache[key]) return meshCache[key];
  const nu = hexTorusColumns(nv);
  const { verts, add } = vertexStore();
  const hexes = [], uv = [];
  for (let c = 0; c < nu; c++) {
    for (let r = 0; r < nv; r++) {  // tile c·nv + r, like the square torus
      const ci = c, cj = r + (c % 2) / 2;
      const corners = [0, 1, 2, 3, 4, 5].map((k) => [ci + Math.cos((k * Math.PI) / 3) / 1.5, cj + Math.sin((k * Math.PI) / 3) / Math.sqrt(3)]);
      hexes.push(corners.map(([i, j]) => add(...torusPoint(i, j, nu, nv, 1))));
      uv.push(...corners.flat());
    }
  }
  return (meshCache[key] = finishTorus(verts, hexes, 6, nu, nv, uv));
}

/* ---- 7.5 Flat ↔ round: the same tiles and neighbours, shown flat or inflated ----------------- */
/* walk.shape = { m, target, corners, cen, nrm, extent } for surfaces that can change shape:
 * polyhedra (each vertex slides from its face towards the circumscribed sphere) and the torus
 * (rolled up from a flat rectangle). The cells and their neighbours never change, so a walk or a
 * Game of Life run goes on unchanged: only the drawing and the 3D positions move. */
const MORPHABLE = ['cube', 'tetra', 'octa', 'icosa', 'torus', 'hextorus'];

function shapeAt(g, m) {
  const k = g.sides, n = g.n;
  const corners = new Float64Array(3 * k * n), cen = new Float64Array(3 * n), nrm = new Float64Array(3 * n);
  if (g.torus) {
    // per tile, from the sheet coordinates of its corners: at m < 1 the seams open, so corners are not shared
    const { nu, nv, uv } = g;
    for (let q = 0; q < k * n; q++) corners.set(torusPoint(uv[2 * q], uv[2 * q + 1], nu, nv, m), 3 * q);
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

// Torus corners are listed in sheet order, which may run against the mesh's outward order: the sign
// that makes their normals point outwards, found once by comparing with the mesh at m = 1
function shapeSign(g) {
  if (!g.torus) return 1;
  if (g.shapeSign) return g.shapeSign;
  const { nu, nv, uv } = g, k = g.sides;
  const P = Array.from({ length: k }, (_, q) => torusPoint(uv[2 * q], uv[2 * q + 1], nu, nv, 1));  // tile 0
  const nr = cross([0, 1, 2].map((d) => P[2][d] - P[0][d]), [0, 1, 2].map((d) => P[k - 1][d] - P[1][d]));
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


/* ---- 7.6 Surface sizes and walks on surfaces ------------------------------------------------- */
// Sizes (cuts per edge): each step multiplies the number of tiles by about 2 (×2.25, then ×1.78),
// not by 4 as doubling would
const STEPS_128 = [8, 12, 16, 24, 32, 48, 64, 96, 128];
const SPHERES = {
  cube: { mesh: cubeFlat, radius: (n) => n / 2,                 // half the cube side: square edge = 1 unit
          sizes: STEPS_128, initial: 32, tiles: (n) => 6 * n * n, unit: 'squares' },
  // flat polyhedra: radius = f / (edge of the solid) so that a small triangle's edge is 1 unit
  torus: { mesh: torusMesh, radius: (nv) => nv / (2 * Math.PI * TORUS_TUBE),  // edge around the tube = 1 unit
          sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (nv) => Math.round(nv / TORUS_TUBE) * nv, unit: 'squares' },
  // hexagon edge = 1 unit: the tube is nv rows of √3 around
  hextorus: { mesh: hexTorusMesh, radius: (nv) => (nv * Math.sqrt(3)) / (2 * Math.PI * TORUS_TUBE),
              sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (nv) => hexTorusColumns(nv) * nv, unit: 'hexagons' },
  tetra: { mesh: (f) => flatPolyhedron('tetra', f), radius: (f) => f / (2 * Math.SQRT2),  // edge 2√2
          sizes: STEPS_128, initial: 32, tiles: (f) => 4 * f * f, unit: 'triangles' },
  octa:  { mesh: (f) => flatPolyhedron('octa', f), radius: (f) => f / Math.SQRT2,          // edge √2
          sizes: STEPS_128, initial: 16, tiles: (f) => 8 * f * f, unit: 'triangles' },
  icosa: { mesh: (f) => flatPolyhedron('icosa', f), radius: (f) => f / 2,                  // edge 2
          sizes: STEPS_128.slice(0, -2), initial: 16, tiles: (f) => 20 * f * f, unit: 'triangles' },
};

// The surface size as a stepper: [ − ] 6,144 squares [ + ] goes through the sizes of the (hidden)
// menu one by one; the menu stays the source of truth, as for the walk modes
function syncSizeStepper() {
  const sel = $('sphereF');
  $('sizeLabel').textContent = sel.selectedOptions[0]?.text ?? '';
  $('sizeDown').disabled = sel.selectedIndex <= 0;
  $('sizeUp').disabled = sel.selectedIndex >= sel.options.length - 1;
}
function stepSize(delta) {
  const sel = $('sphereF'), i = sel.selectedIndex + delta;
  if (i < 0 || i >= sel.options.length) return;
  sel.selectedIndex = i;
  sel.dispatchEvent(new Event('change'));
}

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

/* ==============================================================================================
 * PART 8 — GAME OF LIFE ON THE SURFACES
 * ==============================================================================================
 *
 * One digit per tile, in base C (the number of states of the rule), gives the starting state:
 * 0 dead, 1 alive, 2… the dying stages of "Generations" rules. Neighbours share an edge or a
 * corner (8 on squares, 12 on triangles). A surface has no border, so nothing escapes: every run
 * ends up frozen or looping, and the Lifetime stat is the generation where it starts repeating,
 * found with a fingerprint of the whole state.
 */

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

/* ==============================================================================================
 * PART 9 — METHUSELAH HUNT
 * ==============================================================================================
 *
 * A methuselah is a small start that takes very long to settle. The hunt looks for the start with
 * the longest lifetime on the current surface, size and rule:
 * - Where: the whole surface, or a patch of radius 1, 2 or 3 around a centre cell. A radius counts
 *   Life-neighbour steps, so it is a 3×3, 5×5 or 7×7 square on squares and a small disc on
 *   triangles: one word for both. The rest of the surface starts dead.
 * - How: when a patch has at most 20,000 possible starts, all of them are tried, and the result is
 *   then the true record for that patch; otherwise 1,000 random starts, then 2,000 tweaks of the
 *   best one (hill climbing). For the same lifetime, the start with fewer live cells wins.
 * - One button: 🔍 Hunt, then ⏭ skip to the tweaks, then ■ keep the best so far.
 * The search runs in a worker with its own copy of the Life step, so the page stays fluid.
 */

/* ---- 9.1 The hunt worker --------------------------------------------------------------------- */
/* Runs in a Web Worker. Lifetime = T, the generation where the run starts repeating (dying out,
 * frozen or looping), found with the same state fingerprints as the Lifetime stat.
 * Phase 1: random starts (each cell a uniform random state). Phase 2: hill climbing — flip 1 to 3
 * random cells of the best start and keep the change when it lasts at least as long. */
function huntWorker() {
  self.onmessage = (e) => {
    const { n, start, list, B, S, C, randomRuns, tweaks, cap, patch, exhaustive, from, fromBest } = e.data;
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
    // the cells a start may use: the whole surface, or a small patch (the rest starts dead)
    const free = patch || Array.from({ length: n }, (_, t) => t);
    const randomSeed = () => { const s = new Uint8Array(n); for (const t of free) s[t] = Math.floor(Math.random() * C); return s; };
    const nthSeed = (k) => {  // start number k of an exhaustive search: k written in base C over the patch
      const s = new Uint8Array(n);
      for (const t of free) { s[t] = k % C; k = Math.floor(k / C); }
      return s;
    };
    const live = (s) => { let c = 0; for (const t of free) c += s[t] > 0; return c; };

    // from: a champion to go on tweaking (the random starts were skipped)
    let best = fromBest || null, bestSeed = from ? Uint8Array.from(from) : null, kept = 0;  // kept: tweaks applied
    const report = (phase, i, total, changed) => {
      if (changed || i % 100 === 0 || i === total) self.postMessage({
        type: 'progress', phase, i, total, best, kept, exhaustive, seed: changed ? bestSeed.slice() : null });
    };
    for (let i = 1; i <= randomRuns; i++) {
      const seed = exhaustive ? nthSeed(i - 1) : randomSeed(), r = lifetime(seed);
      // longest first; for the same lifetime, the start with fewer live cells
      const improved = !best || r.T > best.T || (r.T === best.T && live(seed) < live(bestSeed));
      if (improved) { best = r; bestSeed = seed; }
      report(1, i, randomRuns, improved);
    }
    for (let i = 1; i <= tweaks; i++) {
      const seed = bestSeed.slice();
      const flips = 1 + Math.floor(Math.random() * 3);
      for (let f = 0; f < flips; f++) seed[free[Math.floor(Math.random() * free.length)]] = Math.floor(Math.random() * C);
      const r = lifetime(seed);
      const accepted = r.T >= best.T;  // equal lifetimes are accepted too, to drift
      if (accepted) { best = r; bestSeed = seed; kept++; }
      report(2, i, tweaks, accepted);
    }
    self.postMessage({ type: 'done' });
  };
}

/* ---- 9.2 Hunt state and the one-button flow -------------------------------------------------- */
const hunt = { worker: null, key: null, best: null, seed: null, kept: 0, patch: null, exhaustive: 0, tried: 0,
               tweaks: 0, phase: 0 };  // phase: 1 random starts, 2 tweaks

// A hunt belongs to one surface, size and rule: anything else makes its champion meaningless
const huntKey = () => `${$('mode').value}|${$('sphereF').value}|${walk.life ? walk.life.ruleText : ''}`;

// Stop the hunt. When it ends normally or with ■ Keep the best so far, the best start found is loaded at once;
// when something else changed (number, surface, rule…) it is simply dropped.
function stopHunt(loadBest = false) {
  if (hunt.worker) { hunt.worker.terminate(); hunt.worker = null; }
  hunt.phase = 0;
  renderHuntList();
  if (loadBest && hunt.seed) loadChampion();
}

function lifetimeWords(r) {
  if (!r.P) return `still changing after ${fmt(r.T)} generations`;
  return r.P === 1 ? `settles at generation ${fmt(r.T)}` : `period-${fmt(r.P)} loop from generation ${fmt(r.T)}`;
}

// One button runs the whole hunt: 🔍 Hunt starts the random starts, ⏭ skips to the tweaks,
// ■ keeps the best so far. A worker cannot hear a click in the middle of its loop, so skipping
// ends it and starts another one on the tweaks, from the best start found.
const HUNT_STARTS = 1000, HUNT_TWEAKS = 2000;
function huntClick() {
  if (!hunt.worker) startHunt();
  else if (hunt.phase === 1 && hunt.tweaks) skipToTweaks();
  else stopHunt(true);
}

function setHuntPhase(phase) {
  if (phase === hunt.phase) return;
  hunt.phase = phase;
  $('huntBtn').textContent = phase === 1 && hunt.tweaks ? '⏭ Skip to the tweaks' : '■ Keep the best so far';
}

// The hunt works on random starts, so the number becomes 🎲 Random digits first
function startHunt() {
  if (!walk.life) return;
  if (!isRandomDigits()) {
    $('formula').value = presetFormula('random');
    compute();
  }
  stopHunt();
  const { patch, radius, all } = huntPlan(huntZone);
  Object.assign(hunt, { key: huntKey(), best: null, seed: null, kept: 0, patch, radius, tried: 0,
                        exhaustive: all, tweaks: all ? 0 : HUNT_TWEAKS });
  $('huntStatus').textContent = 'Starting…';
  runHuntWorker({ randomRuns: all || HUNT_STARTS, tweaks: hunt.tweaks, exhaustive: !!all });
}


/* ---- 9.3 Zones: the whole surface or a radius, as cards -------------------------------------- */
// Where the starts go: the whole surface, or the cells within a radius of 1, 2 or 3 steps.
// all: the number of possible starts when few enough to try them all (then no tweaks), else 0.
function huntPlan(zone) {
  if (zone === 'all') return { patch: null, radius: 0, all: 0 };
  const radius = Number(zone.slice(6)), patch = lifePatch(radius), count = walk.life.C ** patch.length;
  return { patch, radius, all: count <= 20000 ? count : 0 };  // 2 states on 9 squares or 13 triangles, 3 states on 9 squares
}

// Where the starts go, as cards like the walk modes: the whole surface or a radius of 1, 2 or 3,
// with the real cell counts of the current surface. The hunt button tells how many starts it tries.
let huntZone = 'all';
const HUNT_ICONS = { all: '▦', radius1: '∙', radius2: '•', radius3: '●' };
function renderHuntList() {
  if (!walk.life || !walk.geo) return;
  const part = (cls, text) => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e; };
  $('huntList').replaceChildren(...['all', 'radius1', 'radius2', 'radius3'].map((zone) => {
    const { patch, radius } = huntPlan(zone);
    const b = document.createElement('button');
    const words = document.createElement('span');
    words.append(part('mode-name', patch ? `Radius ${radius}` : 'Whole surface'),
                 part('mode-detail', `${fmt(patch ? patch.length : walk.geo.n)} cells`));
    b.append(part('mode-icon', HUNT_ICONS[zone]), words);
    b.setAttribute('role', 'option');
    b.classList.toggle('active', zone === huntZone);
    b.disabled = !!hunt.worker;  // the zone is fixed while a hunt runs
    b.addEventListener('click', () => pickHuntZone(zone));
    return b;
  }));
  if (hunt.worker) return;
  const { all } = huntPlan(huntZone);
  $('huntBtn').textContent = all ? `🔍 Hunt all ${fmt(all)}` : `🔍 Hunt ${fmt(HUNT_STARTS)} first`;
  $('huntBtn').title = all ? `Try all ${fmt(all)} starts, then load the best. Click again to keep the best so far`
    : `${fmt(HUNT_STARTS)} random starts, then ${fmt(HUNT_TWEAKS)} tweaks of the best one, then it is loaded. Click again to skip to the tweaks, then to keep the best so far`;
}

// Choosing a zone shows a first random start in it at once (clicking again draws another one):
// the whole surface is a new draw of 🎲 Random digits; a radius fills its cells at random, the rest dead
function pickHuntZone(zone) {
  huntZone = zone;
  if (zone === 'all' || !isRandomDigits()) {
    $('formula').value = presetFormula('random');
    compute();  // a new draw (built at once: random digits need no worker)
    if (zone === 'all') return;
  }
  const L = walk.life, { patch, radius } = huntPlan(zone), seed = new Uint8Array(L.seed.length);
  for (const t of patch) seed[t] = Math.floor(Math.random() * L.C);
  setLifeSeed(seed);
  championCode = encodeCells(seed, L.C);  // the link keeps this start
  $('status').textContent = `A random start within radius ${radius} (${fmt(patch.length)} cells), the rest dead · ${fmt(L.seedAlive)} live cells`;
  $('huntStatus').textContent = 'Press ▶︎ Play to watch it, or 🔍 Hunt for one that lasts longer.';
  renderHuntList();
}

function skipToTweaks() {
  hunt.worker.terminate();
  hunt.worker = null;
  if (!hunt.seed) {  // not even one start finished
    stopHunt();
    $('huntStatus').textContent = 'Stopped before the first start was measured.';
    return;
  }
  runHuntWorker({ randomRuns: 0, tweaks: hunt.tweaks, exhaustive: false, from: hunt.seed, fromBest: hunt.best });
  setHuntPhase(2);
}

function runHuntWorker(job) {
  const L = walk.life;
  const src = `(${huntWorker.toString()})()`;
  hunt.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setHuntPhase(job.randomRuns ? 1 : 2);
  renderHuntList();
  hunt.worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'done') {
      stopHunt(true);
      return;
    }
    setHuntPhase(d.phase);
    hunt.best = d.best;
    hunt.kept = d.kept;
    if (d.phase === 1) hunt.tried = d.i;
    if (d.seed) hunt.seed = d.seed;
    const phase = d.phase === 1 ? `${d.exhaustive ? 'start' : 'random start'} ${fmt(d.i)} / ${fmt(d.total)}`
      : `tweak ${fmt(d.i)} / ${fmt(d.total)} (${fmt(d.kept)} kept)`;
    $('huntStatus').textContent = `${phase} · record: ${lifetimeWords(d.best)}`;
  };
  hunt.worker.postMessage({ n: L.alive.length, start: L.nbr.start, list: L.nbr.list, B: L.B, S: L.S, C: L.C,
                            cap: 50000, patch: hunt.patch && Int32Array.from(hunt.patch), ...job });
}

/* ---- 9.4 Patches ----------------------------------------------------------------------------- */
// The cell where small starts go: the middle of the unrolled torus, of the cube face in front,
// else the tile that faces the default camera
function patchCentre() {
  const g = walk.geo, mid = (k) => Math.floor((k - 1) / 2);
  if (g.torus) return mid(g.nu) * g.nv + mid(g.nv);
  if (g.sides === 4) return 3 * g.perFace + mid(g.size) * g.size + mid(g.size);
  const cp = Math.cos(CAM0.pitch), dir = [-Math.sin(CAM0.yaw) * cp, -Math.cos(CAM0.yaw) * cp, Math.sin(CAM0.pitch)];
  let best = 0, bestDot = -Infinity;
  for (let t = 0; t < g.n; t++) {
    const c = g.cen.subarray(3 * t, 3 * t + 3), dot = (c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2]) / Math.hypot(...c);
    if (dot > bestDot) { bestDot = dot; best = t; }
  }
  return best;
}

// The cells at most r Life-neighbour steps from the centre: a 3×3, 5×5 or 7×7 square on square
// grids (r = 1, 2, 3), a small disc of triangles on the polyhedra
function lifePatch(r) {
  const { start, list } = walk.life.nbr, seen = new Set([patchCentre()]);
  let ring = [...seen];
  for (let k = 0; k < r; k++) {
    const next = [];
    for (const t of ring) for (let q = start[t]; q < start[t + 1]; q++) if (!seen.has(list[q])) { seen.add(list[q]); next.push(list[q]); }
    ring = next;
  }
  return [...seen];
}


/* ---- 9.5 Loading a start --------------------------------------------------------------------- */
// Load the champion as the starting pattern of the current Life run
function loadChampion() {
  const L = walk.life;
  if (!L || !hunt.seed || hunt.key !== huntKey()) return;
  setLifeSeed(hunt.seed);
  championCode = encodeCells(hunt.seed, L.C);
  const how = (hunt.exhaustive ? (hunt.tried >= hunt.exhaustive ? `the best of all ${fmt(hunt.exhaustive)} starts`
      : `the best of the first ${fmt(hunt.tried)} of ${fmt(hunt.exhaustive)} starts`)
    : hunt.kept ? `random start + ${fmt(hunt.kept)} tweak${hunt.kept > 1 ? 's' : ''}` : 'random start')
    + (hunt.patch ? `, radius ${hunt.radius}: ${fmt(hunt.patch.length)} cells` : '');
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

/* ==============================================================================================
 * PART 10 — SETUPS AND LINKS
 * ==============================================================================================
 *
 * A setup is a flat object of short keys, the same for the page link (#…), the saved setups in
 * this browser (localStorage) and the JSON export:
 *   x   the formula          w   the walk mode        d    the number of digits (walks)
 *   s   the surface size     r   the Life rule        ch   a Life start (champion or patch)
 * It only holds what determines the result. Display choices (colours, grid, sky, camera, zoom…),
 * the speed and the current step are never saved: a link opens with the mode's default view. A
 * Life start does not depend on the number: it replaces the digits.
 */

/* ---- 10.1 Life starts as short codes --------------------------------------------------------- */
let championCode = null;  // the loaded champion's cells, encoded (see encodeCells)
let pendingChampion = null;  // a champion to restore once a loaded setup is built

// Cells as a short code, whichever is shorter:
// - dense "C.base64url", packing 1, 2 or 4 bits per cell depending on the number of states C;
// - sparse "sC.gap-gap_state-…", the live cells only: each gap (base 36) counts the dead cells
//   since the previous live one, and "_state" follows when the state is not 1 (small starts)
function encodeCells(cells, C) {
  const bits = C <= 2 ? 1 : C <= 4 ? 2 : 4, per = 8 / bits;
  const bytes = new Uint8Array(Math.ceil(cells.length / per));
  cells.forEach((v, i) => { bytes[Math.floor(i / per)] |= v << ((i % per) * bits); });
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  const dense = `${C}.${btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  const items = [];
  let prev = -1;
  cells.forEach((v, i) => {
    if (!v) return;
    items.push((i - prev - 1).toString(36) + (v === 1 ? '' : `_${v}`));
    prev = i;
  });
  const sparse = `s${C}.${items.join('-')}`;
  return sparse.length < dense.length ? sparse : dense;
}
function decodeCells(code, n) {
  const cells = new Uint8Array(n);
  const [c, data] = code.split('.');
  if (c.startsWith('s')) {
    let i = -1;
    for (const item of data ? data.split('-') : []) {
      const [gap, v] = item.split('_');
      i += parseInt(gap, 36) + 1;
      if (i < n) cells[i] = v ? Number(v) : 1;
    }
    return cells;
  }
  const C = Number(c), bits = C <= 2 ? 1 : C <= 4 ? 2 : 4, per = 8 / bits;
  const s = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  for (let i = 0; i < n; i++) cells[i] = ((s.charCodeAt(Math.floor(i / per)) || 0) >> ((i % per) * bits)) & ((1 << bits) - 1);
  return cells;
}


/* ---- 10.2 The setup object ------------------------------------------------------------------- */
function getSetup() {
  const w = $('mode').value, mode = MODES[w], s = { x: formulaInUse, w };
  if (!mode.life) s.d = $('digits').value;
  if (mode.lattice === 'sphere') s.s = $('sphereF').value;
  if (mode.life) s.r = $('lifeRule').value;
  if (championCode) s.ch = championCode;
  return s;
}

function applySetup(s) {
  const set = (id, v) => { if (v !== undefined && v !== null) $(id).value = v; };
  if (typeof s.x !== 'string' || !MODES[s.w]) return false;
  $('formula').value = s.x;
  if (readFormula().error) return false;
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
    championCode = encodeCells(walk.life.seed, walk.life.C);  // in its shortest form, for the link
  }
  renderHuntList();
  syncLink();  // at once, not at the next periodic update
}

/* ---- 10.3 The page link ---------------------------------------------------------------------- */
// The page link always holds the current setup (#x=pi&w=turtle&…), for bookmarks and sharing.
// Readable links: #x=(1+sqrt(5))/2&w=turtle — formulas and rules keep / + ^ , : as they are
const toHash = (s) => Object.entries(s)
  .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%(2F|2B|5E|2C|3A)/g, (c) => decodeURIComponent(c))}`)
  .join('&');
function parseHash() {
  if (location.hash.length < 2) return null;
  try {
    const s = Object.fromEntries(location.hash.slice(1).split('&').map((kv) => {
      const at = kv.indexOf('=');
      return [kv.slice(0, at), decodeURIComponent(kv.slice(at + 1))];
    }));
    return s.x && s.w ? s : null;
  } catch { return null; }
}
function syncLink() {
  if ($('compute').disabled || pendingChampion) return;  // not while a setup is still being built
  const h = `#${toHash(getSetup())}`;
  if (h !== location.hash) history.replaceState(null, '', h);
}

/* ---- 10.4 Saved setups and JSON files -------------------------------------------------------- */
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

/* ==============================================================================================
 * PART 11 — ANIMATION, VIEW AND RENDERING
 * ==============================================================================================
 *
 * The walk is already built: animating only moves cur forward and draws the new segments on the
 * path layer. Three stacked canvases (grid, path, overlay) mean each frame costs only what
 * changed; everything is redrawn when the view moves (needsFull). Surfaces are redrawn whole,
 * far tiles first (painter's algorithm), and not more often than their drawing time allows.
 */

/* ---- 11.1 Animation -------------------------------------------------------------------------- */
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
  const reachedEnd = target >= walk.n && cur < walk.n;
  if (target !== cur) statsDirty = true;
  cur = Math.max(cur, target);
  if (cur >= walk.n) play(false);
  // the walk has just ended: auto-fit framed it with room to grow, so ease to the final frame,
  // the one Fit view gives (surfaces follow the walker instead)
  if (reachedEnd && !walk.sphere && $('autoFit').checked) {
    includeBox();
    viewGoal = viewFor(padBounds(bounds));
  }
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

/* ---- 11.2 View: zoom, pan and fit ------------------------------------------------------------ */
// A view as { scale, cx, cy }: the zoom and the world point at the centre of the screen. Easing
// works on this form: the scale on a log scale (a steady feeling of zoom at any size) and the
// centre in world units, so zooming out does not drift sideways.
function viewFor(b) {
  const w = b.maxX - b.minX + 2;
  const h = b.maxY - b.minY + 2;
  const scale = Math.min(40, Math.max(0.01, Math.min(cw / w, ch / h) * 0.85));
  return { scale, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
}
function setView(v) {
  view.scale = v.scale;
  view.ox = cw / 2 - v.cx * v.scale;
  view.oy = ch / 2 - v.cy * v.scale;
  needsFull = true;
}

// Frame b at once (Fit view, a new walk, a resize); this cancels any smooth auto-fit
function fitToBounds(b) {
  viewGoal = null;
  setView(viewFor(b));
}

// Does the walk go past the edges of view v (the current view, or where auto-fit is heading)?
function boundsOffscreen(v = view) {
  const m = 16, ox = v.ox ?? cw / 2 - v.cx * v.scale, oy = v.oy ?? ch / 2 - v.cy * v.scale;
  return ox + bounds.minX * v.scale < m ||
         ox + bounds.maxX * v.scale > cw - m ||
         oy + bounds.minY * v.scale < m ||
         oy + bounds.maxY * v.scale > ch - m;
}

// Smooth auto-fit: when the walk leaves the screen, the view eases towards a new frame (about
// 0.4 s, time constant 0.15 s) instead of jumping; the goal follows the walk if it keeps growing
let viewGoal = null;
function easeView(dt) {
  if (!viewGoal) return;
  const k = 1 - Math.exp(-dt / 0.15);
  const cx = (cw / 2 - view.ox) / view.scale, cy = (ch / 2 - view.oy) / view.scale;
  const scale = view.scale * (viewGoal.scale / view.scale) ** k;
  const next = { scale, cx: cx + (viewGoal.cx - cx) * k, cy: cy + (viewGoal.cy - cy) * k };
  const arrived = Math.abs(Math.log(scale / viewGoal.scale)) < 1e-3
    && Math.hypot(next.cx - viewGoal.cx, next.cy - viewGoal.cy) * scale < 0.5;
  setView(arrived ? viewGoal : next);
  if (arrived) viewGoal = null;
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
  viewGoal = null;
  $('autoFit').checked = false;
  needsFull = true;
}

/* ---- 11.3 Grids, sky and 3D frame ------------------------------------------------------------ */
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

/* ---- 11.4 Surfaces --------------------------------------------------------------------------- */
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
    // 64 shades: fine enough that a tile's colour turns smoothly with the view (8 made visible
    // jumps of about 7 % in brightness), coarse enough to keep the cache of shaded colours small
    ctx.fillStyle = shaded(level ? palette[level] : '#1f2630', Math.round((1 - Math.max(0, toward)) * 64) / 64);
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


/* ---- 11.5 Path, overlay and stats ------------------------------------------------------------ */
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
// Short enough for one line of the stats: "gen 898, period-2 loop"
function lifetimeText(L) {
  const s = L.stable;
  if (!s) return L.seen.size >= LIFE_TRACK ? `not settled after ${fmt(LIFE_TRACK)} gen` : 'not settled yet';
  const what = s.extinct ? 'dies out' : s.P === 1 ? 'frozen' : `period-${fmt(s.P)} loop`;
  return `gen ${fmt(s.T)}, ${what}`;
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
    $('digitStrip').classList.remove('line');
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
  strip.classList.remove('line');  // one line of digits; the other texts may wrap
  if (!walk.n) { strip.textContent = ''; return; }
  if (walk.points) {  // point modes: list the most recent marked cell numbers
    const a = Math.max(0, cur - 8);
    const list = Array.from(walk.labels.subarray(a, cur), (v, i) =>
      a + i === cur - 1 ? `<span class="cur">${fmt(v)}</span>` : fmt(v));
    strip.innerHTML = `Marked cells: ${a > 0 ? '… ' : ''}${list.join(', ')}`;
    return;
  }
  // One line of digits, exactly as many as fit (the strip is monospace, so it is a column count).
  // The head sits at 60 % of the line; at the start the line begins with the first digit, at the
  // end it finishes with the last one. The window then shrinks until "…", "0." and "." fit too.
  strip.classList.add('line');
  const cols = stripColumns(strip), n = walk.n, d = walk.digits;
  const intLen = Math.min(current.head.length, n);
  let b = Math.min(n, Math.max(0, cur - Math.floor(cols * 0.6)) + cols), a = Math.max(0, b - cols);
  const marks = () => (a > 0 ? 1 : intLen ? 0 : 2) + (intLen - 1 >= a && intLen - 1 < b && intLen < n ? 1 : 0)
    + (b < n ? 1 : cur >= n ? 1 : 0);  // "…" after, or the head on a blank past the last digit
  while (b - a + marks() > cols && b - a > 1) {
    if (b - 1 > cur && (a === 0 || b - cur > (cur - a) * 0.67)) b--;
    else a++;
  }
  // a number below 1 does not walk its integer part (every such number would start the same
  // way): its "0." is only shown, greyed
  let html = a > 0 ? '…' : (intLen ? '' : '<span class="dim">0.</span>');
  for (let i = a; i < b; i++) {
    // a reading head: the highlighted digit is the next one to play (step cur + 1); the stats
    // describe the digits to its left. At the end it sits on a blank after the last digit.
    html += i === cur ? `<span class="cur">${d[i]}</span>` : d[i];
    if (i === intLen - 1 && intLen < walk.n) html += '.';
  }
  strip.innerHTML = html + (b < n ? '…' : cur >= n ? '<span class="cur">\u00a0</span>' : '');
}

// How many characters fit on one line of the strip, measured again only when its font or width changes
const stripMeasure = { key: '', cols: 0, ctx: null };
function stripColumns(el) {
  // the width of the box it sits in: the strip itself is hidden while empty (width 0)
  const box = el.parentElement, bs = getComputedStyle(box);
  const width = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
  const st = getComputedStyle(el), font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`, key = `${font}|${width}`;
  if (stripMeasure.key !== key) {
    stripMeasure.ctx ??= document.createElement('canvas').getContext('2d');
    stripMeasure.ctx.font = font;
    stripMeasure.cols = Math.max(8, Math.floor((width * 20) / stripMeasure.ctx.measureText('0'.repeat(20)).width));
    stripMeasure.key = key;
  }
  return stripMeasure.cols;
}

/* ---- 11.6 The frame loop --------------------------------------------------------------------- */
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
  if (walk.n && $('autoFit').checked && boundsOffscreen(viewGoal || view)) {  // 15% room to grow
    const b = padBounds(bounds);
    const mx = (b.maxX - b.minX) * 0.15, my = (b.maxY - b.minY) * 0.15;
    viewGoal = viewFor({ minX: b.minX - mx, maxX: b.maxX + mx, minY: b.minY - my, maxY: b.maxY + my });
  }
  easeView(dt);
  if (walk.sphere) {  // the sphere is redrawn as a whole (heat map + recent trail)
    morphStep(dt);  // flat ↔ round, while it is changing
    // auto-fit turns the camera to keep the walker in front, except on a torus: the view stays
    // put and the walk is seen covering it
    if (walk.n && !walk.life && !walk.geo.torus && $('autoFit').checked && !$('autoRotate').checked) followWalker();
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

/* ==============================================================================================
 * PART 12 — INTERACTIONS AND START-UP
 * ==============================================================================================
 */

/* ---- 12.1 Buttons, menus, keyboard and mouse ------------------------------------------------- */
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
    userMovedView();  // a hand rotation ends auto-fit, as a pan or a zoom does
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
// A menu choice, or a new value in its helper menu, writes its formula
const pickPreset = (id) => { $('formula').value = presetFormula(id); computeFramed(); };
$('mersenneP').addEventListener('change', () => pickPreset('mersenne'));
$('primorialP').addEventListener('change', () => pickPreset('primorial'));
$('primeSize').addEventListener('change', () => pickPreset('randomPrime'));
$('sky').addEventListener('change', () => { needsFull = true; });
// flat ↔ round: the animation runs in tick (morphStep); the walk or Life run goes on meanwhile
$('morphBtn').addEventListener('click', () => {
  if (!walk.shape) return;
  walk.shape.target = walk.shape.target === 1 ? 0 : 1;
  updateMorphButton();
});
$('morphBtn').addEventListener('pointerdown', (e) => e.stopPropagation());  // not a drag of the view
// the animation bar sits over the view: its clicks, drags (the speed slider) and wheel are its own
for (const type of ['pointerdown', 'dblclick', 'wheel']) $('animBar').addEventListener(type, (e) => e.stopPropagation());
$('perspective').addEventListener('change', () => {
  setPerspective();
  project();
  if (walk.sphere) needsFull = true;
  else rotateView(0, 0);  // recompute the 2D bounds of the projected walk
});
$('huntBtn').addEventListener('click', huntClick);
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
$('sizeDown').addEventListener('click', () => stepSize(-1));
$('sizeUp').addEventListener('click', () => stepSize(1));
$('sphereF').addEventListener('change', () => {
  syncSizeStepper();
  if (MODES[$('mode').value].life) { compute(); return; }  // one digit per cell: maybe more digits
  if (!current) return;
  buildWalk();
  showAll();
});
$('formula').addEventListener('change', computeFramed);
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


/* ---- 12.2 Start-up --------------------------------------------------------------------------- */
// A link with a setup opens that setup; otherwise π on the turtle walk. The link then follows the
// setup: at once after each build, and every 700 ms for the other changes.
new ResizeObserver(resize).observe(stage);
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
$('version').textContent = `v${VERSION}`;
fillSetupList();
const linked = parseHash();  // a link with a setup opens that setup; otherwise the default one
if (!linked || !applySetup(linked)) compute();
setInterval(syncLink, 700);  // keep the link up to date with the setup

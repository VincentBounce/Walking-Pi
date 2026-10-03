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
const VERSION = '0.1.238';

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

    // S·arctan(u/v), or S·artanh(u/v) when hyperbolic, for whole 0 < u < v: Σ (∓1)^k u^(2k+1) /
    // ((2k+1)·v^(2k+1)), by binary splitting (Haible–Papanikolaou). Over a range of terms, exact
    // integers P, Q, B, T give the sum T / (B·Q); halves are merged with a few big products instead
    // of one division per term, so the time grows about as n·log²n instead of n² (a million digits:
    // seconds instead of minutes).
    const atanTerms = (x) => lnS / (2 * Math.log(x));  // terms for u/v = 1/x
    const bitLength = (v) => v.toString(2).length;
    const logBig = (v) => {  // ln v for a whole v > 0 of any size, as a double
      const sh = Math.max(0, bitLength(v) - 53);
      return Math.log(Number(v >> BigInt(sh))) + sh * Math.LN2;
    };
    function atanFrac(u, v, hyperbolic) {
      const u2 = u * u, v2 = v * v, terms = lnS / (2 * (logBig(v) - logBig(u)));
      const split = (a, b) => {
        if (b - a === 1) {
          progress(a);
          const p = a === 0 ? u : hyperbolic ? u2 : -u2;
          return [p, a === 0 ? v : v2, BigInt(2 * a + 1), p];
        }
        const m = (a + b) >> 1, [P1, Q1, B1, T1] = split(a, m), [P2, Q2, B2, T2] = split(m, b);
        return [P1 * P2, Q1 * Q2, B1 * B2, B2 * Q2 * T1 + B1 * P1 * T2];
      };
      const [, Q, B, T] = split(0, Math.ceil(terms) + 2);
      done += terms;
      return (S * T) / (B * Q);
    }
    const atanInv = (x, hyperbolic) => atanFrac(1n, BigInt(x), hyperbolic);  // S·arctan(1/x), S·artanh(1/x)

    // S·ln(p/q) for a fraction p/q > 0, by binary splitting: p/q = 2^k·x with x in [1/√2, √2], and
    // ln x = 2·artanh((x − 1)/(x + 1)) with |(x − 1)/(x + 1)| ≤ 0.172: 1.5 decimal digits per term.
    // Only for a small x − 1 (ln 3, ln 10, ln(22/7), ln(2^127 − 1)): with hundreds of digits in it,
    // every term would carry them, and the fixed-point lnFixed is faster.
    function lnFraction(p, q) {
      if (p <= 0n) throw new Error('logarithm of a number ≤ 0');
      let k = bitLength(p) - bitLength(q), P = k < 0 ? p << BigInt(-k) : p, Q = k > 0 ? q << BigInt(k) : q;
      if (P * P > 2n * Q * Q) { Q <<= 1n; k++; }
      if (2n * P * P < Q * Q) { P <<= 1n; k--; }
      const u = P - Q, abs = u < 0n ? -u : u, ln2k = k ? BigInt(k) * constant('ln2') : 0n;
      if (abs === 0n) return ln2k;
      if (bitLength(abs) > 64) return lnFixed((p * S) / q);
      done = 0;
      total = atanTerms(5.8);  // at most: 1/0.172 = 5.8
      const t = 2n * atanFrac(abs, P + Q, true);
      return ln2k + (u < 0n ? -t : t);
    }
    // S·ln x for a formula: a fraction (ln 3, ln 10, ln(22/7)) by binary splitting, any other value
    // in fixed point
    const lnOf = (x) => {
      if (!exact(x)) return lnFixed(real(x));
      const [p, q] = exactOf(x);
      return lnFraction(p, q);
    };

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
        case 'pi': { // Chudnovsky, by binary splitting: π = 426880·√10005·Q / T, about 14 decimal digits
          // per term (10 million base-3 digits in seconds, where Machin's arctangents took hours)
          const C3_24 = 640320n ** 3n / 24n;
          const split = (a, b) => {
            if (b - a === 1) {
              progress(a);
              if (a === 0) return [1n, 1n, 13591409n];
              const A = BigInt(a), P = (6n * A - 5n) * (2n * A - 1n) * (6n * A - 1n);
              const T = P * (13591409n + 545140134n * A);
              return [P, A * A * A * C3_24, a % 2 ? -T : T];
            }
            const m = (a + b) >> 1, [P1, Q1, T1] = split(a, m), [P2, Q2, T2] = split(m, b);
            return [P1 * P2, Q1 * Q2, T1 * Q2 + P1 * T2];
          };
          total = Math.ceil(lnS / Math.log(151931373056000)) + 2;  // 640320³ / 1728 per term
          const [, Q, T] = split(0, total);
          v = (426880n * isqrt(10005n * S * S) * Q) / T;
          break;
        }
        case 'ln2': // ln 2 = 18·artanh(1/26) − 2·artanh(1/4801) + 8·artanh(1/8749)
          total = atanTerms(26) + atanTerms(4801) + atanTerms(8749);
          v = 18n * atanInv(26, true) - 2n * atanInv(4801, true) + 8n * atanInv(8749, true);
          break;
        case 'e': { // e = 1 + Σ 1/k!, by binary splitting: P/Q = Σ_{k=a+1..b} 1/((a+1)···k), Q = (a+1)···b
          total = 1;
          for (let lf = 0; lf < lnS + 10; total++) lf += Math.log(total);  // K! > S
          const split = (a, b) => {
            if (b - a === 1) { progress(a); return [1n, BigInt(b)]; }
            const m = (a + b) >> 1, [P1, Q1] = split(a, m), [P2, Q2] = split(m, b);
            return [P1 * Q2 + P2, Q1 * Q2];
          };
          const [P, Q] = split(0, total);
          v = S + (S * P) / Q;
          break;
        }
        case 'apery': { // Amdeberhan–Zeilberger, by binary splitting:
          // ζ(3) = 1/64 Σ (−1)^k (205k²+250k+77)·(k!)^10/((2k+1)!)^5, each term −k^5/(32(2k+1)^5)
          // times the previous one: about 3 decimal digits per term
          const K = Math.ceil(lnS / Math.log(1024)) + 5;
          total = K;
          const J = (j) => BigInt(j);
          const [, Q, T] = binarySplit(0, K,
            (j) => (j === 0 ? 1n : -(J(j) ** 5n)),
            (j) => (j === 0 ? 1n : 32n * (2n * J(j) + 1n) ** 5n),
            (k) => 205n * J(k) ** 2n + 250n * J(k) + 77n);
          v = (T * S) / (64n * Q);
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
        case 'rho': { // ρ = Σ 2^(−p), the prime constant: its binary expansion is the prime barcode (bit k = 1 when k is prime)
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
    // exp and ln work in binary fixed point (a value v as V = v·2^W), where shifts are much cheaper
    // than divisions by powers of b. exp sums series by binary splitting, like the constants (the
    // "bit-burst" method); ln is then found by Newton's method on exp, doubling its precision at
    // each step. Both cost a few big multiplications per doubling of the precision, so a million
    // digits of 2^π or ln π take seconds, where term-by-term series took minutes.

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

    // The working precision in bits: the digits asked for, and guard bits for the rounding
    const fixedBits = () => Math.ceil(prec * Math.log2(base)) + 96;
    const toBin = (x, W) => (x << BigInt(W)) / S;   // S·v → v·2^W
    const fromBin = (X, W) => (X * S) >> BigInt(W);  // and back

    // e^(X / 2^W)·2^W (bit-burst). x = n + r_1 + r_2 + …: e^n by squaring e; each r_j is a chunk of
    // the bits after the point (32, 32, 64, 128… of them), r_j = c / 2^s with c < 2^(s − lo), so
    // e^r_j = Σ c^k / (k!·2^(s·k)) gains lo bits per term and is summed by binary splitting.
    function expBin(X, W) {
      const w = BigInt(W);
      if (X < 0n) return (1n << (2n * w)) / expBin(-X, W);
      const V = W + 64, v = BigInt(V);
      let y = 1n << v, e = toBin(constant('e'), V);
      for (let n = X >> w; n > 0n; n >>= 1n) {
        if (n & 1n) y = (y * e) >> v;
        if (n > 1n) e = (e * e) >> v;
      }
      const F = (X & ((1n << w) - 1n)) << (v - w);  // the bits after the point, on V bits
      for (let lo = 0, hi = 32; lo < V; lo = hi, hi *= 2) {
        const s = Math.min(hi, V), c = (F >> BigInt(V - s)) & ((1n << BigInt(s - lo)) - 1n);
        if (c === 0n) continue;
        let K = 1;
        for (let got = 0; got < V + 16; K++) got += lo + Math.log2(K);  // c^K / (K!·2^(sK)) < 2^−V
        const [, Q, T] = binarySplit(0, K, (j) => (j === 0 ? 1n : c), (j) => (j === 0 ? 1n : BigInt(j) << BigInt(s)), () => 1n);
        y = (y * ((T << v) / Q)) >> v;
      }
      return y >> (v - w);
    }

    // ln(X / 2^W)·2^W: x = 2^k·m with m in [1, 2), then ln m by Newton on exp, y ← y + m·e^(−y) − 1,
    // which doubles the number of correct bits: from a double's 50 bits to W, the last exp costing
    // about as much as all the earlier ones together
    function lnBin(X, W) {
      if (X <= 0n) throw new Error('logarithm of a number ≤ 0');
      const k = bitLength(X) - 1 - W, M = k >= 0 ? X >> BigInt(k) : X << BigInt(-k);
      const lnUnit = (m, P) => {
        if (P <= 50) return BigInt(Math.round(Math.log(Number(m) / 2 ** P) * 2 ** P));
        const h = Math.ceil(P / 2) + 16, p = BigInt(P);
        const y = lnUnit(m >> BigInt(P - h), h) << BigInt(P - h);
        return y + (m << p) / expBin(y, P) - (1n << p);
      };
      return lnUnit(M, W) + BigInt(k) * toBin(constant('ln2'), W);
    }

    // S·e^x and S·ln x for S·x
    const expFixed = (x) => { const W = fixedBits(); return fromBin(expBin(toBin(x, W), W), W); };
    const lnFixed = (x) => { const W = fixedBits(); return fromBin(lnBin(toBin(x, W), W), W); };

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
          return expFixed((real(x.b) * lnOf(x.a)) / S);  // a^b = e^(b·ln a)
        }
        case 'call': {
          const a = x.args[0];
          switch (x.f) {
            case 'sqrt': return isqrt(nonNegative(real(a)) * S);
            case 'cbrt': { const v = real(a); return v < 0n ? -icbrt(-v * S * S) : icbrt(v * S * S); }
            case 'root': { const k = Number(x.args[1].v); return iroot(nonNegative(real(a)) * S ** BigInt(k - 1), k); }
            case 'ln': return a.k === 'num' && a.v === '2' ? constant('ln2') : lnOf(a);
            case 'exp': return expFixed(real(a));
            case 'log': {  // log(x, b) = ln x / ln b
              const d = lnOf(x.args[1]);
              if (d === 0n) throw new Error('log(x, 1) does not exist');
              return (lnOf(a) * S) / d;
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
  e:       { group: 'Constants', sym: 'e',    name: "Euler's number", detail: 'e = exp(1)', f: 'e' },
  phi:     { group: 'Constants', sym: 'φ',    name: 'Golden ratio', f: 'phi' },
  gamma:   { group: 'Constants', sym: 'γ',    name: 'Euler–Mascheroni constant', f: 'gamma' },
  catalan: { group: 'Constants', sym: 'G',    name: "Catalan's constant", f: 'catalan' },
  erdos:   { group: 'Constants', sym: 'E',    name: 'Erdős–Borwein constant', f: 'erdos' },
  sqrt2:   { group: '𝑓', sym: '√2', name: 'Square root of 2', f: 'sqrt(2)' },
  cbrt2:   { group: '𝑓', sym: '∛2', name: 'Cube root of 2', f: 'cbrt(2)' },
  pi2:     { group: '𝑓', sym: 'π²', name: 'Pi squared', f: 'pi^2' },
  epi:     { group: '𝑓', sym: 'e^π',  name: "Gelfond's constant", detail: 'e^pi = exp(pi)', f: 'e^pi' },
  ln2:     { group: '𝑓', sym: 'ln 2', name: 'Natural log of 2', f: 'ln(2)' },
  zeta3:   { group: '𝑓', sym: 'ζ(3)', name: "Apéry's constant", f: 'zeta(3)' },
  frac4_3: { group: '𝑓', sym: '4/3', name: 'Four thirds', f: '4/3' },
  frac16_9: { group: '𝑓', sym: '16/9', name: 'Sixteen ninths', f: '16/9' },
  basel:   { group: '𝑓', sym: '6/π²', name: 'Probability that two whole numbers are coprime', detail: '6/pi^2 = 1/ζ(2)', f: '6/pi^2' },
  mersenne: { group: 'Primes', sym: 'Mₚ', name: 'Mersenne prime', detail: '2^p-1', f: () => `2^${$('mersenneP').value}-1` },
  primorial: { group: 'Primes', sym: 'p#±1', name: 'Primorial prime', detail: 'primorial(p)±1',
               f: () => { const [p, sign] = $('primorialP').value.split(','); return `primorial(${p})${sign > 0 ? '+' : '-'}1`; } },
  randomPrime: { group: 'Primes', sym: '🎲 p', name: 'Random prime', detail: 'randprime(size, seed)',
                 f: () => `randprime(${randomPrimeSize() ?? 300},${freshDraw()})` },  // a new draw, same size
  primeConstant: { group: 'Primes', sym: 'ρ', name: 'Prime constant', detail: 'rho = Σ 2^(−p)', f: 'rho' },
  random:  { group: 'Sequences', sym: '🎲', name: 'Random digits', detail: 'random(seed)', f: () => `random(${freshDraw()})` },
  champernowne: { group: 'Sequences', sym: 'C', name: 'Champernowne', f: 'champernowne' },
  primeBarcode: { group: 'Sequences', sym: '▮ p', name: 'Prime barcode',
                  detail: "primes · χ_P, the characteristic function of the primes; on the Ulam square spiral (2D spirals, base 2) it draws Ulam's spiral of the primes",
                  f: 'primes' },
  primeGaps: { group: 'Sequences', sym: 'gₙ', name: 'Prime gaps', detail: 'primegaps · gₙ = pₙ₊₁ − pₙ', f: 'primegaps' },
  dragon:  { group: 'Sequences', sym: '🐉', name: 'Dragon (paperfolding)',
             detail: 'dragon · a fractal on Triangles turtle, Squares turtle and Hexagons turtle', f: 'dragon' },
};
const presetFormula = (id) => (typeof PRESETS[id].f === 'function' ? PRESETS[id].f() : PRESETS[id].f);

// What the sequences and ρ₂ mean, for the status line
const FORMULA_NOTES = {
  primes: (b) => `digit k = 0 if k is not prime, else k mod ${b} (1 for k = ${b})`,
  rho: (b) => `ρ = Σ 2^(−p) = 0.0110101000101…₂, the binary barcode read as one number, written in base ${b}`,
  primegaps: (b) => `one digit per gap between odd primes: (gap / 2) mod ${b}`,
  dragon: () => 'the folds of a strip folded in two again and again (0 and 1): the dragon curve, as turns',
};

/* ---- 2.3 Walk modes -------------------------------------------------------------------------- */
// base: the base the digits are written in; lattice: how a step is taken ('square', 'tri', 'hex',
// 'cube' or 'sphere' for a tiled surface); life: a Game of Life instead of a walk. The (hidden)
// mode menu in index.html lists them, grouped as the tabs of the Walk section.
const MODES = {
  turtle:   { base: 3, lattice: 'square',
              rule: 'on a square grid: <b>0</b> turn left + step, <b>1</b> step forward, <b>2</b> turn right + step' },
  cardinal: { base: 4, lattice: 'square',
              rule: 'on a square grid: <b>0</b> north, <b>1</b> east, <b>2</b> south, <b>3</b> west' },
  spiral:   { base: 2, lattice: 'square', skipZeros: true,
              rule: 'along a square spiral (Ulam): <b>1</b> draw the step, <b>0</b> move without drawing' },
  jump10:   { base: 10, lattice: 'square', points: 'jump',
              rule: 'on the Ulam spiral: jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  jump64:   { base: 64, lattice: 'square', points: 'jump',
              rule: 'on the Ulam spiral: jump ahead <b>digit + 1</b> cells and mark the landing cell' },
  search10: { base: 10, lattice: 'square', points: 'search',
              rule: 'on the Ulam spiral: cell <b>n</b> is marked when the digits of n appear among them' },
  search64: { base: 64, lattice: 'square', points: 'search',
              rule: 'on the Ulam spiral: cell <b>n</b> is marked when the base-64 digits of n appear among them' },
  triSpiral: { base: 2, lattice: 'tri', skipZeros: true,
              rule: 'along a spiral of triangles: <b>1</b> draw the step, <b>0</b> move without drawing' },
  hexSpiral: { base: 2, lattice: 'hex', skipZeros: true,
              rule: 'along a spiral of hexagons: <b>1</b> draw the step, <b>0</b> move without drawing' },
  triLR:    { base: 2, lattice: 'tri',
              rule: 'on triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  triFixed: { base: 3, lattice: 'tri',
              rule: 'on triangles: cross the <b>0</b> horizontal, <b>1</b> “/” or <b>2</b> “\\” edge' },
  hexRel:   { base: 5, lattice: 'hex',
              rule: 'on hexagons, relative to the edge you came in through: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  hexFixed: { base: 6, lattice: 'hex',
              rule: 'on hexagons: <b>0</b> N, <b>1</b> NE, <b>2</b> SE, <b>3</b> S, <b>4</b> SW, <b>5</b> NW' },
  tetraLR:  { base: 2, lattice: 'sphere', sphere: 'tetra', initial: 48, turns: [2, 1],
              rule: 'on a tetrahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge · colour = number of visits' },
  torusWalk: { base: 3, lattice: 'sphere', sphere: 'torus', initial: 48, turns: [3, 2, 1], perspective: true, round: true,
              rule: 'on a torus of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right · colour = number of visits' },
  // hexagons: entering through edge k, edge k + 1 is a sharp right, k + 2 right, k + 3 straight on
  hexTorusWalk: { base: 5, lattice: 'sphere', sphere: 'hextorus', initial: 48, turns: [5, 4, 3, 2, 1], perspective: true, round: true,
                  rule: 'on a torus of hexagons: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right · colour = number of visits' },
  cubeFlat: { base: 3, lattice: 'sphere', sphere: 'cube', initial: 48, turns: [3, 2, 1], perspective: true,
              rule: 'on the surface of a cube: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right · colour = number of visits' },
  octaLR:   { base: 2, lattice: 'sphere', sphere: 'octa', initial: 48, perspective: true, turns: [2, 1],
              rule: 'on an octahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge · colour = number of visits' },
  icosaLR:  { base: 2, lattice: 'sphere', sphere: 'icosa', initial: 48, turns: [2, 1], round: true,
              rule: 'on an icosahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge · colour = number of visits' },
  // along the grid: from corner to corner, turning by these angles (degrees, left positive), or as close
  // to them as the edges at a corner allow
  torusGrid: { base: 3, lattice: 'sphere', sphere: 'torus', grid: true, initial: 48, turns: [90, 0, -90], perspective: true, round: true,
               rule: 'along the edges of a torus of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right' },
  triTorusGrid: { base: 5, lattice: 'sphere', sphere: 'tritorus', grid: true, initial: 48, turns: [120, 60, 0, -60, -120], perspective: true, round: true,
                  rule: 'along the edges of a torus of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  hexTorusGrid: { base: 2, lattice: 'sphere', sphere: 'hextorus', grid: true, initial: 48, turns: [60, -60], perspective: true, round: true,
                  rule: 'along the edges of a torus of hexagons: <b>0</b> turn left, <b>1</b> turn right' },
  cubeGrid:  { base: 3, lattice: 'sphere', sphere: 'cube', grid: true, initial: 48, turns: [90, 0, -90], perspective: true,
               rule: 'along the edges of the squares of a cube: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right (at a corner of the cube, the nearest edge)' },
  tetraGrid: { base: 5, lattice: 'sphere', sphere: 'tetra', grid: true, initial: 48, turns: [120, 60, 0, -60, -120],
               rule: 'along the edges of a tetrahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  octaGrid:  { base: 5, lattice: 'sphere', sphere: 'octa', initial: 48, perspective: true, grid: true, turns: [120, 60, 0, -60, -120],
               rule: 'along the edges of an octahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  // Set aside: on triangles, turns of ±60° only walk a hidden grid of hexagons (3 times fewer
  // corners), so they need many triangles for few patterns; the hexagon sphere does it directly.
  // icosaGrid2: { base: 2, lattice: 'sphere', sphere: 'icosa', grid: true, turns: [60, -60], round: true,
  //               rule: 'along the edges of an icosahedron of triangles: <b>0</b> front left, <b>1</b> front right (at a corner of the solid, the nearest edge)' },
  // icosaGrid3: { base: 3, lattice: 'sphere', sphere: 'icosa', grid: true, turns: [60, 0, -60], round: true,
  //               rule: 'along the edges of an icosahedron of triangles: <b>0</b> front left, <b>1</b> forward, <b>2</b> front right (at a corner of the solid, the nearest edge)' },
  hexSphereGrid: { base: 2, lattice: 'sphere', sphere: 'hexsphere', grid: true, turns: [60, -60], round: true,
                   rule: 'along the edges of a sphere of hexagons (and 12 pentagons): <b>0</b> turn left, <b>1</b> turn right' },
  icosaGrid: { base: 5, lattice: 'sphere', sphere: 'icosa', grid: true, initial: 48, turns: [120, 60, 0, -60, -120], round: true,
               rule: 'along the edges of an icosahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  lifeTorus:  { base: 2, lattice: 'sphere', sphere: 'torus', life: true, perspective: true, round: true,
                where: 'a torus of squares (a grid that wraps around both ways)' },
  lifeHexTorus: { base: 2, lattice: 'sphere', sphere: 'hextorus', life: true, perspective: true, round: true,
                  where: 'a torus of hexagons' },
  lifeCube:   { base: 2, lattice: 'sphere', sphere: 'cube', life: true, perspective: true,
                where: 'the surface of a cube' },
  lifeTetra:  { base: 2, lattice: 'sphere', sphere: 'tetra', life: true,
                where: 'a tetrahedron of triangles' },
  lifeOcta:   { base: 2, lattice: 'sphere', sphere: 'octa', initial: 48, perspective: true, life: true,
                where: 'an octahedron of triangles' },
  lifeIcosa:  { base: 2, lattice: 'sphere', sphere: 'icosa', life: true, round: true,
                where: 'an icosahedron of triangles' },
  lifeHexSphere: { base: 2, lattice: 'sphere', sphere: 'hexsphere', life: true, round: true,
                   where: 'a sphere of hexagons (its 12 pentagons are walls)' },
  cubeRel:  { base: 5, lattice: 'cube', perspective: true,
              rule: 'in 3D cubes, relative to your heading: <b>0</b> turn left, <b>1</b> up, <b>2</b> straight, <b>3</b> down, <b>4</b> turn right' },
  cubeFixed: { base: 6, lattice: 'cube', perspective: true,
              rule: 'in 3D cubes: <b>0</b> north, <b>1</b> east, <b>2</b> up, <b>3</b> south, <b>4</b> west, <b>5</b> down' },
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
// Decimal digits of p# ± 1 (those of p#: ⌊Σ log10 q over the primes q ≤ p⌋ + 1), computed once with
// exact decimals rather than at every load, which would sieve the primes up to 9.5 million
const PRIMORIAL_DIGITS = {
  317: 131, 337: 136, 379: 154, 991: 413, 1019: 425, 1021: 428, 1873: 790, 2053: 866, 2377: 1007,
  2657: 1115, 3229: 1368, 4093: 1750, 4297: 1844, 4547: 1939, 4583: 1953, 4787: 2038, 6569: 2811,
  11549: 4951, 13033: 5610, 13649: 5862, 15877: 6845, 18523: 8002, 23801: 10273, 24029: 10387, 42209:
  18241, 145823: 63142, 366439: 158936, 392113: 169966, 843301: 365851, 1098133: 476311, 3267113:
  1418398, 4328927: 1878843, 4778027: 2073926, 5256037: 2281955, 6354977: 2758832, 6369619: 2765105,
  6533299: 2835864, 7351117: 3191401, 9562633: 4151498,
};


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
// The 3D view: the screen's right (r), up (u) and towards-the-viewer (v) directions in world
// coordinates, the rows of a rotation matrix, so the view turns freely (see rotateView). The
// default looks from a heading of −0.6 rad, 0.5 rad above the horizon. A turn replaces the arrays,
// never changes them, so Object.assign(cam, CAM0) is a reset.
function camFrom(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { r: [cy, -sy, 0], u: [sy * sp, cy * sp, cp], v: [-sy * cp, -cy * cp, sp] };
}
const CAM0 = camFrom(-0.6, 0.5);
const cam = { ...CAM0 };
let bounds3 = null;                        // 3D bounding box of points 0..cur

const stage = $('stage');
const layers = {
  grid: $('gridLayer').getContext('2d'),
  fill: $('fillLayer').getContext('2d'),  // Fill areas, under the path
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
  const { base } = MODES[$('mode').value];
  $('sCountsLabel').textContent = Array.from({ length: base }, (_, i) => i).join(' / ');
  $('sCountsLabel').hidden = $('sCounts').hidden = base > 6 || !!MODES[$('mode').value].life;  // nothing useful to list
}

// Game of Life needs one base-C digit per cell; walks use the requested number of digits
function digitsNeeded() {
  const mode = MODES[$('mode').value], size = randomPrimeSize();
  if (mode.life) return SPHERES[mode.sphere].tiles(sphereSize());
  // a random prime is walked whole: its size (decimal digits) written in the walk's base
  return size ? Math.ceil((size * Math.log(10)) / Math.log(mode.base)) + 1 : requestedDigits();
}

// The line under the tabs says what is shown, by tab. A walk: "Walking π · 20,000 base-3 digits on
// a square grid: 0 turn left + step, …" (the digits actually walked). An automaton: "4/3 in base 2
// seeds the 2,560 cells of a torus of squares: 0 dead, 1 alive · rule B3/S23 · …".
let shownSym = 'π';  // the number's symbol, for the description and a saved setup's name
let digitsBeforeLoop = null;  // the count of digits asked before a loop cut it to its first round
let lifeStart = null;  // where a Life start comes from when it is not the number's digits (see setLifeSeed)
function describe(base, available) {
  const mode = MODES[$('mode').value], sym = `<span class="pi">${withIcons(shownSym)}</span>`;
  if (!mode.life) {
    const loop = !walk.loop ? '' : walk.loop.from ? ` (then it would go round again from step ${fmt(walk.loop.from)})` : ' (then it would start over)';
    $('description').innerHTML = `<span class="walking">Walking ${sym}</span> · ${fmt(walk.n)} base-${base} digits${loop} ${mode.rule}`;
    return;
  }
  const cells = walk.life.seed.length, C = base;
  const dying = C > 2 ? `, <b>2</b>${C > 3 ? `–<b>${C - 1}</b>` : ''} dying` : '';
  const states = walk.life.two ? '<b>0</b> dead, <b>1</b> red, <b>2</b> blue, a newborn taking the colour of most of its neighbours'
    : `<b>0</b> dead, <b>1</b> alive${dying}`;
  const seeded = available < cells ? `the first ${fmt(available)} of the ${fmt(cells)} cells (the others start dead)` : `the ${fmt(cells)} cells`;
  const start = lifeStart, number = `<span class="walking">${sym}</span> in base ${C} seeds`;
  const lead = start?.radius ? `${number} the ${fmt(start.cells)} cells within radius ${start.radius} of a cell of ${mode.where}, the others dead`
    : start ? `${{ hunt: 'A start found by the hunt', duel: 'A duel start', saved: 'A saved start' }[start]} on ${mode.where}`
    : `${number} ${seeded} of ${mode.where}`;
  $('description').innerHTML = `${lead}: ${states} · rule ${walk.life.ruleText} · neighbours share an edge or a corner`;
}

// What the Display menu offers depends only on the walk tab (the group of the mode in the menu).
// Colours: Rainbow along the walk always; cells, visits, one per digit, one colour where listed.
// Walks on surface cells: the walk as a rainbow line over the tiles, the tiles it passes through filled
// (Fill cells) in the colour of their first visit, those it encloses (Fill areas) in the colour of
// the step that closed them; or the tiles coloured by their visits.
const DISPLAY_BY_TAB = {
  '2D walks': ['colors', 'fill', 'translucent', 'cells', 'visits', 'digit', 'mono', 'grid'],
  '3D walks': ['colors', 'digit', 'mono', 'grid', 'sky', 'autoRotate', 'perspective'],
  'Walks on surface cells': ['shape', 'colors', 'visits', 'fillCells', 'fill', 'translucent', 'grid', 'sky', 'autoRotate', 'perspective'],
  'Walks on surface grids': ['shape', 'colors', 'visits', 'fill', 'grid', 'sky', 'autoRotate', 'perspective'],  // areas follow the path
  'Automata on surfaces': ['shape', 'colors', 'digit', 'mono', 'grid', 'sky', 'autoRotate', 'perspective'],
  '2D spirals': ['colors', 'fill', 'translucent', 'cells', 'visits', 'digit', 'mono', 'grid'],  // the 2D walks' menu, some of it greyed out
};
// Shown but greyed out: a spiral never crosses itself, so it closes no area and visits each cell once;
// and its marks read as cells, the line along the spiral (Rainbow along the walk) shows nothing more
const DISPLAY_GREYED = { '2D spirals': ['fill', 'visits', 'line'] };
const greyed = (item) => !!DISPLAY_GREYED[$('mode').selectedOptions[0].parentElement.label]?.includes(item);
const shows = (item) => DISPLAY_BY_TAB[$('mode').selectedOptions[0].parentElement.label].includes(item);
const useful = (item) => shows(item) && !greyed(item);
function updateDisplayMenu() {
  const rows = { colors: 'colorsRow', grid: 'gridRow', sky: 'skyRow',  // Auto-fit (Auto-rotate in 3D) heads the box
                 autoRotate: 'autoRotateRow', perspective: 'perspectiveRow' };
  for (const [item, id] of Object.entries(rows)) $(id).hidden = !shows(item);
  // a 3D view: Auto-rotate heads the box (always in sight), Auto-fit goes down among the settings
  const spin = shows('autoRotate');
  $('viewHead').append(spin ? $('autoRotateRow') : $('autoFitRow'));
  $('viewSlot').append(spin ? $('autoFitRow') : $('autoRotateRow'));
  $('fillAreasRow').hidden = !shows('fill');
  $('fillCellsRow').hidden = !shows('fillCells');
  $('fillCells').disabled = $('colorMode').value !== 'gradient';  // with the line only
  $('fillAreas').disabled = !fillAreasApply();  // greyed out with the colours it does not go with
  $('fillLoopNote').hidden = !(walk.vert && current?.fraction);  // a fraction along a grid (see areaSteps)
  // Translucent fill: only over a line, which then shows through the areas it closed in its own colour
  $('fillTranslucentRow').hidden = !shows('translucent');
  $('fillTranslucent').disabled = !($('fillAreas').checked && fillAreasApply() && $('colorMode').value !== 'cells');
  $('fillLayer').style.opacity = $('fillTranslucent').checked && !$('fillTranslucent').disabled ? 0.35 : 1;
  updateMorphButton();  // Shape: only for a surface that can change shape
}

// The colour menu means something else for the Game of Life, and depends on its number of states.
// In Life the plain states come first (the default); walks keep the gradient first.
function relabelColours(mode) {
  const life = !!mode.life, C = life ? lifeStates() : 2, two = life && !!parseRule($('lifeRule').value)?.two;
  const dying = C === 3 ? ' · dying' : C > 3 ? ` · ${C - 2} dying` : '';
  const names = !life ? { gradient: 'Rainbow along the walk', cells: 'Rainbow cells along the walk', visits: 'Rainbow by number of visits',
                      digit: 'One colour per digit', mono: 'One colour' }
    : { mono: two ? 'Civilisations: red · blue · dead' : `States: alive${dying} · dead`,
        gradient: C > 2 ? 'Age of live cells + dying stages' : 'Age of live cells + fading trail',
        digit: 'Activity (state changes)', cells: '', visits: '' };
  const sel = $('colorMode');
  const order = life ? ['mono', 'gradient', 'digit', 'cells', 'visits'] : ['gradient', 'cells', 'visits', 'digit', 'mono'];
  const byValue = Object.fromEntries(Array.from(sel.options, (o) => [o.value, o]));
  order.forEach((v) => { byValue[v].text = names[v]; sel.append(byValue[v]); });
  for (const v of ['cells', 'visits', 'digit', 'mono']) byValue[v].hidden = !shows(v);
  byValue.gradient.disabled = greyed('line');  // Rainbow along the walk: no use on a spiral
  byValue.visits.disabled = !useful('visits');
  byValue.gradient.hidden = two;  // two civilisations: a cell's colour is its civilisation
  if (sel.selectedOptions[0]?.hidden || sel.selectedOptions[0]?.disabled) {
    sel.value = Array.from(sel.options).find((o) => !o.hidden && !o.disabled).value;  // the first one left
  }
  renderColorButtons();
}

// Choices as buttons clicked directly (colours, sky); the (hidden) menu stays the source of truth
function renderChoiceButtons(sel, box) {
  box.replaceChildren(...Array.from(sel.options).filter((o) => !o.hidden).map((o) => {
    const b = document.createElement('button');
    b.textContent = o.text;
    b.classList.toggle('active', o.value === sel.value);
    b.disabled = o.disabled;
    b.addEventListener('click', () => {
      sel.value = o.value;
      sel.dispatchEvent(new Event('change'));
    });
    return b;
  }));
}
const renderColorButtons = () => renderChoiceButtons($('colorMode'), $('colorButtons'));
const renderSkyButtons = () => renderChoiceButtons($('sky'), $('skyButtons'));

function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(10_000_000, Math.max(10, n || 10));
}

// The number of digits as a stepper, like the surface size: [ − ] 20,000 digits [ + ] goes through
// DIGIT_STEPS and recomputes at once. The count can also be typed in the middle; any other count
// (typed, or from a link) then steps to the next one in DIGIT_STEPS.
// For a random prime, walked whole, the stepper sets the prime's size instead, in decimal digits:
// [ − ] 300 digits (p) [ + ], through PRIME_STEPS (100 to 2,000).
const DIGIT_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1e6, 2e6, 5e6, 1e7];
const PRIME_STEPS = [100, 200, 300, 500, 1000, 2000];
const randomPrimeSize = () => {  // the size of the random prime in the Formula field, if it is one
  const m = $('formula').value.match(/^\s*randprime\(\s*(\d+)\s*,\s*\d+\s*\)\s*$/);
  return m ? Number(m[1]) : null;
};
// A whole number (a prime…) has a fixed count of digits, known once computed: the label then says
// "all 344 digits" when it is shorter than the count asked, "20,000 of 352,987" when it is longer.
// The whole number in use, if any: its count of digits (in the field, not formulaInUse: while a new
// number is read, that one is still the old)
const wholeTotal = () => (current?.whole && current.formula === $('formula').value ? current.total : null);
function syncDigitsStepper() {
  const size = randomPrimeSize(), n = size ?? requestedDigits(), steps = size ? PRIME_STEPS : DIGIT_STEPS;
  // a walk that loops uses only the digits of its first round (see buildGridWalk): more would change nothing
  const total = size ? null : walk.loop ? walk.n : wholeTotal();
  $('digitsLabel').value = size ? `${fmt(size)} digits (p)` : walk.loop ? `${fmt(walk.n)} digits max ↻`
    : total === null ? `${fmt(n)} digits` : total <= n ? `all ${fmt(total)} digits` : `${fmt(n)} of ${fmt(total)}`;
  $('digitsLabel').title = size ? 'The size of the random prime p, in decimal digits: 100 to 2,000, then Enter (it is walked whole)'
    : 'Type a number of digits, from 10 to 10,000,000, then Enter';
  // − goes below what is walked: the whole number's own length when it is shorter than the count
  $('digitsDown').disabled = Math.min(n, total ?? n) <= steps[0];
  $('digitsUp').disabled = n >= steps.at(-1) || (total !== null && total <= n);
}
function stepDigits(delta) {
  const size = randomPrimeSize(), steps = size ? PRIME_STEPS : DIGIT_STEPS;
  const n = size ?? Math.min(requestedDigits(), wholeTotal() ?? Infinity);  // what is walked
  const next = delta > 0 ? steps.find((v) => v > n) : steps.findLast((v) => v < n);
  if (next === undefined) return;
  if (size) setPrimeSize(next);
  else { $('digits').value = next; compute(true); }
}
// Another size for the random prime: a new prime of that size, from the same seed
function setPrimeSize(size) {
  const seed = $('formula').value.match(/,\s*(\d+)/)[1];
  $('formula').value = `randprime(${Math.min(2000, Math.max(100, size))},${seed})`;
  computeFramed();
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

/* ---- 3.3 Icons ------------------------------------------------------------------------------- */
// Every icon is a small SVG drawn here, in a 24 × 24 box, with lines in the text's colour
// (currentColor): grey on a card, yellow when it is the active one, dark on a filled button. No
// emoji and no icon font, so they look the same on every system and match the flat design. The
// shapes are computed (regular polygons, spirals, the dragon curve), the rest is a few paths.
const r2 = (v) => Math.round(v * 100) / 100;
const pathOf = (pts, close = true) => `M${pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L')}${close ? 'Z' : ''}`;
const ngon = (n, r, rot = -90, cx = 12, cy = 12) => Array.from({ length: n }, (_, k) => {
  const a = ((rot + (k * 360) / n) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});
const seg = (a, b) => pathOf([a, b], false);
// Scale and centre a polyline in the box (size × size, around 12, 12)
function fitIn(pts, size = 18) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const s = size / Math.max(w, h, 1e-9);
  return pts.map(([x, y]) => [12 + (x - x0 - w / 2) * s, 12 + (y - y0 - h / 2) * s]);
}
// A walk turning by the given angle (degrees, + = left) after each step of the given length,
// starting towards angle a (−90: up)
function turtlePath(turns, lengths = turns.map(() => 1), a = -90) {
  let x = 0, y = 0;
  const pts = [[0, 0]];
  turns.forEach((t, k) => {
    x += lengths[k] * Math.cos((a * Math.PI) / 180); y += lengths[k] * Math.sin((a * Math.PI) / 180);
    pts.push([x, y]);
    a -= t;
  });
  return pts;
}
// A polygonal spiral: n turns per round, each side a little longer than the previous one, the
// last (longest) side at the bottom
const spiralOf = (n, sides) => fitIn(turtlePath(Array(sides).fill(360 / n), Array.from({ length: sides }, (_, k) => 1 + k),
  (360 / n) * (sides - 1)), 19);
// The dragon curve: turn k is the paper fold k (1 = left, 0 = right)
const dragonOf = (turns) => fitIn(turtlePath(Array.from({ length: turns }, (_, k) => {
  let j = k + 1;
  while (j % 2 === 0) j /= 2;
  return j % 4 === 1 ? 90 : -90;
})), 20);
const dots = (list, r) => list.map(([x, y]) => `<circle class="f" cx="${x}" cy="${y}" r="${r}"/>`).join('');
const pathEl = (d, cls) => `<path${cls ? ` class="${cls}"` : ''} d="${d}"/>`;

const ICONS = (() => {
  const hex = ngon(6, 9.5), tri = ngon(3, 10, -90, 12, 14), sq = [[4, 4], [20, 4], [20, 20], [4, 20]];
  const cube = (fillTop) => pathEl(pathOf(hex)) + [0, 2, 4].map((k) => pathEl(seg([12, 12], hex[k]))).join('')
    + (fillTop ? pathEl(pathOf([[12, 12], hex[4], hex[5], hex[0]]), 'f') : '');
  const torus = '<ellipse cx="12" cy="12" rx="10" ry="7"/>' + pathEl('M5.5 11Q12 17 18.5 11M7.8 12.6Q12 8 16.2 12.6');
  const [a, b, c, d] = [[12, 3], [3, 19], [21, 19], [13, 14.5]];
  const icoOut = ngon(6, 10), icoIn = ngon(3, 5, 90);
  const ico = pathEl(pathOf(icoOut)) + pathEl(pathOf(icoIn))
    + [[0, 1], [0, 2], [2, 0], [2, 2], [4, 0], [4, 1], [1, 2], [3, 0], [5, 1]].map(([o, i]) => pathEl(seg(icoOut[o], icoIn[i]))).join('');
  return {
    // walk modes
    grid: pathEl(pathOf(sq)) + pathEl('M12 4V20M4 12H20'),
    compass: pathEl('M12 3V21M3 12H21') + pathEl('M9 6L12 3L15 6M9 18L12 21L15 18M6 9L3 12L6 15M18 9L21 12L18 15'),
    triangle: pathEl(pathOf(tri)),
    triangleFilled: pathEl(pathOf(tri), 'f'),
    hexagon: pathEl(pathOf(hex)),
    hexagonFilled: pathEl(pathOf(hex), 'f'),
    cube: cube(false),
    cubeFilled: cube(true),
    torus,
    tetrahedron: pathEl(pathOf([a, b, c])) + [a, b, c].map((p) => pathEl(seg(p, d))).join(''),
    octahedron: pathEl('M12 2L21 12L12 22L3 12Z') + [[12, 2], [21, 12], [12, 22], [3, 12]].map((p) => pathEl(seg(p, [10, 14]))).join(''),
    icosahedron: ico,
    spiral: pathEl(pathOf(spiralOf(4, 11), false)),
    triSpiral: pathEl(pathOf(spiralOf(3, 7), false)),
    hexSpiral: pathEl(pathOf(spiralOf(6, 15), false)),
    jump: pathEl('M3 17Q7.5 8 12 17Q16.5 8 21 17') + pathEl('M17.5 14.5L21 17L17 18.5'),
    search: '<circle cx="10.5" cy="10.5" r="6.5"/>' + pathEl('M15.5 15.5L21 21'),
    // tabs
    walk2d: pathEl('M3 20V15H8V10H12V16H17V6H21V3'),  // a walk on the square grid
    glider: pathEl(pathOf(sq)) + pathEl('M9.33 4V20M14.67 4V20M4 9.33H20M4 14.67H20')
      + [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].map(([x, y]) => `<rect class="f" x="${r2(4 + x * 5.33)}" y="${r2(4 + y * 5.33)}" width="5.33" height="5.33"/>`).join(''),
    // hunt zones: the whole surface, then a patch of radius 1, 2 or 3
    zoneAll: pathEl(pathOf(sq)) + pathEl('M9.33 4V20M14.67 4V20M4 9.33H20M4 14.67H20'),
    zone1: dots([[12, 12]], 2.5),
    zone2: dots([[12, 12]], 4),
    zone3: dots([[12, 12]], 6),
    duel: dots([[6.5, 12], [17.5, 12]], 3.5),
    // numbers
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/>' + dots([[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]], 1.4),
    dragon: `<path class="thin" d="${pathOf(dragonOf(63), false)}"/>`,
    // a barcode: thick and thin bars, well apart so that it still reads at 15 px
    barcode: [[3, 2.6], [7, 1.4], [10, 1.4], [13, 3], [18, 1.4], [20.6, 1.4]]
      .map(([x, w]) => `<rect class="f" x="${x}" y="4" width="${w}" height="16" rx="0.3"/>`).join(''),
    // buttons
    play: pathEl('M7 4.5L19.5 12L7 19.5Z', 'f'),
    pause: '<rect class="f" x="6" y="5" width="4" height="14" rx="1"/><rect class="f" x="14" y="5" width="4" height="14" rx="1"/>',
    start: pathEl('M5.5 5V19') + pathEl('M19 5L9 12L19 19Z', 'f'),
    end: pathEl('M18.5 5V19') + pathEl('M5 5L15 12L5 19Z', 'f'),
    star: pathEl(pathOf(ngon(10, 1).map((_, k) => ngon(10, k % 2 ? 4.2 : 9.5)[k]))),
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/>' + pathEl('M15.5 8.5V5.5A2 2 0 0 0 13.5 3.5H5.5A2 2 0 0 0 3.5 5.5V13.5A2 2 0 0 0 5.5 15.5H8.5'),
    link: pathEl('M9.5 14.5L14.5 9.5') + pathEl('M8.5 11.5L6.5 13.5A3.5 3.5 0 0 0 10.5 17.5L12.5 15.5M15.5 12.5L17.5 10.5A3.5 3.5 0 0 0 13.5 6.5L11.5 8.5'),
  };
})();
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
// A text that may hold 🎲, 🐉 or ▮ (a random number, the dragon, the prime barcode), as HTML with their icons
const withIcons = (text) => text.replace(/🎲/g, icon('dice')).replace(/🐉/g, icon('dragon')).replace(/▮/g, icon('barcode'));

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
  erdos: ['real', 'E'], rho: ['real', 'ρ'],
  champernowne: ['seq', 'C'], primes: ['seq', '▮ p'], primegaps: ['seq', 'gₙ'], dragon: ['seq', '🐉'],
};
const FORMULA_FUNCTIONS = { sqrt: 1, cbrt: 1, root: 2, ln: 1, exp: 1, log: 2, zeta: 1, primorial: 1, random: 1, randprime: 2 };
const APPROX = { pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, gamma: 0.5772156649, catalan: 0.9159655942,
                 erdos: 1.6066951524, rho: 0.4146825099 };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };  // anything else binds tighter (5)
const precOf = (x) => PREC[x.k] ?? 5;
const formulaKids = (x) => (x.k === 'call' ? x.args : x.k === 'neg' ? [x.a] : x.a ? [x.a, x.b] : []);
const formulaNodes = (x) => [x, ...formulaKids(x).flatMap(formulaNodes)];

/* ---- 4.2 Parser ------------------------------------------------------------------------------ */
// A small recursive-descent parser, one function per precedence level (expr → term → unary →
// power → primary). Unicode input is turned into plain names first, so the rest only sees ASCII.
// Text → tree of { k: 'num' | 'name' | 'call' | 'neg' | '+' | '-' | '*' | '/' | '^', … }.
// Accepts π φ γ ρ √ ∛ − × · ÷, any case, and implicit products like 2pi.
function parseFormula(text) {
  const src = text.replace(/π/g, ' pi ').replace(/φ/g, ' phi ').replace(/γ/g, ' gamma ').replace(/ρ/g, ' rho ')
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
        if (k && k[0] <= 1_000_000_000n && k[0] >= -1_000_000_000n) {  // a whole power: exact when a is (its size is checked by readFormula)
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
  if (/^randprime\(\d+,\d+\)$/.test(text)) return { id: 'randomPrime' };
  return { id: null };  // a formula of its own: no card
}

// The cards and their helper menus follow the formula
function syncNumberMenu() {
  const p = presetOf($('formula').value);
  renderNumberPicker(p.id);
  $('formula').classList.toggle('custom', !p.id);  // a formula of its own lights up like a chosen card
  for (const helper of ['mersenneP', 'primorialP']) if (p[helper]) $(helper).value = p[helper];
  $('mersenneRow').hidden = p.id !== 'mersenne';
  $('primorialRow').hidden = p.id !== 'primorial';
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
      b.innerHTML = withIcons(p.sym);
      b.title = `${p.name} — ${p.detail ?? p.f}`;
      b.setAttribute('role', 'option');
      b.classList.toggle('active', id === active);
      b.addEventListener('click', () => pickPreset(id));  // again on 🎲: another draw
      return b;
    }));
    box.append(label, grid);
    if (group === 'Primes') box.append($('mersenneRow'), $('primorialRow'));
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
  } else if (name === 'dragon') {
    // regular paperfolding sequence: fold n (n = 1, 2, …) is 0 when n / 2^k (odd) ≡ 1 mod 4, else 1.
    // Read as turns (left / right) it is the dragon curve; its digits are 0 and 1 in every base.
    for (let i = 0; i < n; i++) {
      let k = i + 1;
      while (k % 2 === 0) k /= 2;
      digits[i] = k % 4 === 1 ? 0 : 1;
    }
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

// kind: the formula's ('int', 'rat' for a fraction, 'real' or 'seq'); ratio: a fraction's [p, q] (BigInt)
function setCurrent(entry, base, kind, ratio = null) {
  const t = entry.intPart.replace(/^0+/, '');   // integer part without leading zeros
  const head = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) head[i] = t.charCodeAt(i) - 48;
  // total: how many digits the whole number has (a whole number's are only sent up to the count used)
  current = { head, digits: entry.digits, base, total: entry.total ?? head.length + entry.digits.length, mode: $('mode').value,
              whole: entry.total !== undefined, formula: formulaInUse,  // whole: a whole number, its digits all known
              fraction: kind === 'rat', ratio };  // its digits end up repeating (see LOOP_FILL, torusLoops)
}

// The digits in use: n in total, the integer part (always included) then the digits after the point
function digitsInUse() {
  const n = digitsNeeded();
  const head = current.head.subarray(0, n);
  return { head, frac: current.digits.subarray(0, n - head.length) };
}
// The digits just after those walked (as many as are known, up to LOOP_AHEAD): a walk compares
// them to tell a loop (see buildGridWalk)
const LOOP_AHEAD = 64;
function digitsAhead() {
  const n = digitsNeeded(), H = current.head, D = current.digits, out = [];
  for (let i = n; i < n + LOOP_AHEAD; i++) {
    const d = i < H.length ? H[i] : D[i - H.length];
    if (d === undefined) break;
    out.push(d);
  }
  return Uint8Array.from(out);
}

// The number as copied: "pi^2 base 5 ≈ 14.41332…", with every digit in use ("=" only for a whole
// number with all its digits, the one case where nothing is cut off). Up to base 36 one
// character per digit (0–9, then a–z); above that each digit as a decimal number, space-separated.
// limit: at most that many digits after the point (for a preview).
function numberText(limit = Infinity) {
  const { head, frac } = digitsInUse(), b = current.base, shown = frac.subarray(0, limit);
  const write = (ds) => (b <= 36 ? Array.from(ds, (v) => v.toString(36)).join('') : Array.from(ds).join(' '));
  const sign = !current.digits.length && head.length === current.total ? '=' : '≈';
  return `${formulaInUse} base ${b} ${sign} ${head.length ? write(head) : '0'}${shown.length ? `.${write(shown)}` : ''}`;
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
// The icon of each tab (the menu's group labels are the tab names) and of each walk mode's shape.
// Filled: the relative modes (turn from your heading); outlined: the fixed directions.
const TAB_ICONS = { '2D walks': 'walk2d', '3D walks': 'cube', 'Walks on surface cells': 'torus', 'Walks on surface grids': 'icosahedron',
                    'Automata on surfaces': 'glider', '2D spirals': 'spiral' };
const MODE_ICONS = {
  turtle: 'grid', cardinal: 'compass', triLR: 'triangleFilled', triFixed: 'triangle', hexRel: 'hexagonFilled', hexFixed: 'hexagon',
  cubeRel: 'cubeFilled', cubeFixed: 'cube', torusWalk: 'torus', hexTorusWalk: 'torus', cubeFlat: 'cube',
  tetraLR: 'tetrahedron', octaLR: 'octahedron', icosaLR: 'icosahedron',
  torusGrid: 'torus', triTorusGrid: 'torus', hexTorusGrid: 'torus', cubeGrid: 'cube', tetraGrid: 'tetrahedron', octaGrid: 'octahedron',
  icosaGrid: 'icosahedron', /* icosaGrid2: 'icosahedron', icosaGrid3: 'icosahedron', */ hexSphereGrid: 'hexagon',
  lifeTorus: 'torus', lifeHexTorus: 'torus', lifeCube: 'cube', lifeTetra: 'tetrahedron', lifeOcta: 'octahedron', lifeIcosa: 'icosahedron', lifeHexSphere: 'hexagon',
  spiral: 'spiral', triSpiral: 'triSpiral', hexSpiral: 'hexSpiral', jump10: 'jump', jump64: 'jump', search10: 'search', search64: 'search',
};

// "Cubes — base 5 (5 relative turns)" → name "Cubes", base "base 5", detail "5 relative turns"
function splitModeLabel(text) {
  const [head, tail = ''] = text.replace(/^Life — /, '').split(' — ');
  const m = tail.match(/^(base \d+)\s*(?:\((.*)\))?$/) || [null, '', ''];
  const inName = head.match(/^(.*?)\s*\((.*)\)$/);  // "torus (square grid)"
  const name = inName ? inName[1] : head;
  return { name: name[0].toUpperCase() + name.slice(1), base: m[1] || '', detail: m[2] || (inName ? inName[2] : '') };
}

// The section's title, read with the card below it: "Walk on · Torus", "Populate · Cube"
const WALK_HEADINGS = { 'Walks on surface cells': 'Walk on', 'Walks on surface grids': 'Walk along', 'Automata on surfaces': 'Populate' };

function renderModePicker() {
  const groups = Array.from($('mode').querySelectorAll('optgroup'));
  const currentGroup = $('mode').selectedOptions[0].parentElement.label;
  if (!modeTab) modeTab = currentGroup;
  $('modeTabs').replaceChildren(...groups.map((g) => {
    const b = document.createElement('button');
    b.innerHTML = `${icon(TAB_ICONS[g.label])} ${g.label}`;
    b.setAttribute('role', 'tab');
    b.classList.toggle('active', g.label === modeTab);
    b.addEventListener('click', () => {  // another tab starts on its first choice
      if (g.label === modeTab) return;
      modeTab = g.label;
      $('mode').value = g.querySelector('option').value;
      if (MODES[$('mode').value].life) {  // the automata start from a random number on the whole surface
        $('formula').value = presetFormula('random');
        huntZone = 'all';
      }
      $('mode').dispatchEvent(new Event('change'));
    });
    return b;
  }));
  const group = groups.find((g) => g.label === modeTab);
  $('walkHeading').textContent = WALK_HEADINGS[modeTab] ?? 'Walk';
  $('modeList').replaceChildren(...Array.from(group.children).map((o) => {
    const b = document.createElement('button');
    const { name, base, detail } = splitModeLabel(o.text);  // the Life tab already says "Life"
    // an automaton's pill tells the shape of its cells, where a walk's tells its base
    const mode = MODES[o.value], pill = mode.life ? SPHERES[mode.sphere].unit : base, info = mode.life ? '' : detail;
    const part = (cls, text) => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e; };
    const words = document.createElement('span');
    words.append(part('mode-name', name), ...(info ? [part('mode-detail', info)] : []));
    const pic = part('mode-icon', '');
    pic.innerHTML = icon(MODE_ICONS[o.value]);
    b.append(pic, words, ...(pill ? [part('mode-base', pill)] : []));
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
// keepDigits: the number of digits was just set by hand (else a count cut to a loop's length comes
// back to what it was, for the new number, surface or start; see buildWalk)
function compute(keepDigits = false) {
  if (!keepDigits && digitsBeforeLoop !== null) {
    $('digits').value = digitsBeforeLoop;
    digitsBeforeLoop = null;
  }
  const mode = MODES[$('mode').value];
  modeTab = $('mode').selectedOptions[0].parentElement.label;  // show the tab of the mode in use
  renderModePicker();
  if (mode.sphere) fillSphereSizes(mode.sphere, mode.initial);
  const n = digitsNeeded(), want = mode.life ? n : n + LOOP_AHEAD;  // a walk also reads the digits ahead
  if (!mode.life && !randomPrimeSize()) $('digits').value = n;  // a random prime keeps the count for later
  syncDigitsStepper();
  relabelColours(mode);
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
  if (F.error) {
    $('status').textContent = `Formula: ${F.error}`;
    $('copyNumber').hidden = true;
    return;
  }
  const { sym, kind } = F;
  shownSym = sym;
  const base = mode.life ? lifeStates() : mode.base;  // Life: the number of states of the rule
  const key = `${F.text}/${base}`;
  // The status line under the Number: how the digits came (time, cache), what the number is, and
  // warnings; what is shown is in the description (describe)
  const note = FORMULA_NOTES[F.root] ? FORMULA_NOTES[F.root](base) : '';

  if (kind === 'seq') {
    setCurrent(seqDigits(F.ast, want, base), base, kind, kind === 'rat' ? smallExact(F.ast) : null);
    $('status').textContent = note;
    buildWalk();
    describe(base, n);
    $('copyNumber').hidden = false;
    showAll();
    applyPendingView();
    return;
  }

  const done = (entry, how) => {
    setCurrent(entry, base, kind, kind === 'rat' ? smallExact(F.ast) : null);
    const total = entry.total ?? current.head.length + current.digits.length;
    $('status').textContent = [
      how,
      F.root === 'randprime' && `a random ${fmt(Number(F.ast.args[0].v))}-digit probable prime, found after ${fmt(entry.tests)} Miller–Rabin tests`,
      note,
      entry.uncertain && '⚠ the value is extremely close to a round number: the last digits could be off by one',
    ].filter(Boolean).join(' · ');
    buildWalk();
    describe(base, total);
    syncDigitsStepper();  // a whole number's digits are now known
    $('copyNumber').hidden = false;
    showAll();
    applyPendingView();
  };
  const hit = cache[key], integer = kind === 'int';
  const enough = integer ? hit && (hit.intPart.length >= n || hit.intPart.length === hit.total)
                         : hit && hit.digits.length >= want;
  if (enough) {
    done(hit, 'Cached');
    return;
  }
  // the worker also needs digitString, seededRandom, exactValue and iroot
  const src = [digitString, seededRandom, exactValue, iroot].map(String).join('\n') + `\n(${formulaWorker.toString()})()`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  // π, e, ln 2, roots, exact numbers and sequences stay fast at millions of digits; the other series
  // grow as the square of the digits
  const quadratic = formulaNodes(F.ast).some((x) => (x.k === 'name' && ['gamma', 'catalan'].includes(x.v))
    || (x.k === 'call' && (['exp', 'zeta', 'log'].includes(x.f) || (x.f === 'ln' && canonical(x.args[0]) !== '2')))
    || (x.k === '^' && x.exp === undefined && !x.rootExp));
  const slow = F.log10 > 6e6 || (F.root === 'randprime' && Number(F.ast.args[0].v) > 1000) || (F.kind === 'real' && quadratic && n > 1e6);
  $('status').textContent =
    (F.root === 'randprime' ? `Searching for a random ${fmt(Number(F.ast.args[0].v))}-digit prime…`
      : `Computing ${sym} in base ${base}${integer || mode.life ? '' : ` · ${fmt(n)} digits`}…`) +
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
    done(entry, `Computed in ${(d.ms / 1000).toFixed(2)} s`);
  };
  worker.postMessage({ ast: F.ast, n: want, base, mag: F.mag, nodes: F.nodes });
}

// While the worker computes: the progress bar shows, and the link waits for the result
let busy = false;
function setBusy(on) {
  busy = on;
  $('progressBar').style.width = '0';
  $('progress').hidden = !on;  // the bar only shows while computing
}

/* ---- 5.3 Building the walk ------------------------------------------------------------------- */
// All positions, distances and counts are computed once into typed arrays: the animation, the
// stats and the jumps only read them.
let previousShape = null;  // the form of the surface just replaced: { target, mode }
function buildWalk() {
  previousShape = walk.shape && { target: walk.shape.target, mode: walk.shape.mode };
  visitData = firstVisitData = areaData = null;  // and its cells' visits and areas too
  fill = null;  // a new walk: its enclosed areas are computed again, and its layer starts empty
  fillDone = 0;
  layers.fill.clearRect(0, 0, cw, ch);
  walk.shape = null;  // only tiled surfaces that can change shape get one (see initShape)
  const { head, frac } = digitsInUse();
  const seq = new Uint8Array(head.length + frac.length);
  seq.set(head);
  seq.set(frac, head.length);
  if (MODES[current.mode].points) {
    buildPointWalk(seq, MODES[current.mode]);
    return;
  }
  if (MODES[current.mode].life) {
    buildLife(seq, MODES[current.mode]);
    return;
  }
  if (MODES[current.mode].lattice === 'sphere') {
    if (!MODES[current.mode].grid) { buildSphereWalk(seq, MODES[current.mode]); return; }
    buildGridWalk(seq, MODES[current.mode], digitsAhead());
    // a walk that loops takes only the digits of its first round: the count says so (and the link),
    // and the count asked comes back for the next number, surface or start (see compute)
    if (walk.loop && walk.n < requestedDigits()) {
      digitsBeforeLoop ??= requestedDigits();
      $('digits').value = walk.n;
    } else if (!walk.loop) digitsBeforeLoop = null;  // a count that does not loop is the one asked
    syncDigitsStepper();
    syncLoopRow();
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
  Object.assign(walk, { vert: null, stepTiles: null, loop: null, n: len, digits: seq, wx, wy, wz, is3d, cells, maxDist, base, counts,
                        lattice: MODES[current.mode].lattice,
                        skipZeros: !!MODES[current.mode].skipZeros,
                        points: false, keys: seq, labels: null, sphere: false, life: null,
                        xs: is3d ? new Float64Array(len + 1) : wx,
                        ys: is3d ? new Float64Array(len + 1) : wy });
  if (is3d) { setPerspective(); project(); } else walk.persp = null;
  updateHint();
  restart();
}


/* ---- 5.4 3D projection and camera ------------------------------------------------------------ */
// Orthographic projection of a 3D point onto the screen plane (world units)
function orthoPoint(x, y, z) {
  const { r, u } = cam;
  return [x * r[0] + y * r[1] + z * r[2], -(x * u[0] + y * u[1] + z * u[2])];
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
  const [r0, r1, r2] = cam.r, [u0, u1, u2] = cam.u, [v0, v1, v2] = cam.v;
  const P = walk.persp;
  const [ccx, ccy] = P ? orthoPoint(...P.c) : [0, 0];
  return (x, y, z) => {
    let X = x * r0 + y * r1 + z * r2, Y = -(x * u0 + y * u1 + z * u2);
    if (P) {
      const k = P.D / (P.D - ((x - P.c[0]) * v0 + (y - P.c[1]) * v1 + (z - P.c[2]) * v2));
      X = ccx + (X - ccx) * k;
      Y = ccy + (Y - ccy) * k;
    }
    return [X, Y];
  };
}

// Projection of the whole 3D walk (xs, ys), same formula as projectPoint
function project() {
  const { wx, wy, wz, xs, ys } = walk, proj = projector();
  for (let i = 0; i < xs.length; i++) [xs[i], ys[i]] = proj(wx[i], wy[i], wz[i]);
}

// Perspective can apply to every 3D view (checkbox; on by default for the cube walks and the cube surface)
const perspectiveAllowed = () => walk.is3d;

// Set walk.persp from the checkbox: centre and size from the whole walk (or the solid), camera
// at 2.5 × that radius, i.e. a field of view of roughly 45°
function setPerspective() {
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

// Turn the object by the rotation vector w (world coordinates: the axis, scaled by the angle in
// radians), i.e. the camera the other way (Rodrigues' formula), then make its rows orthonormal
// again so that rounding errors never add up.
function turnCam(w) {
  const a = Math.hypot(...w);
  if (!a) return;
  const k = w.map((x) => x / a), c = Math.cos(a), s = -Math.sin(a);
  const turn = (x) => {
    const kx = cross(k, x), d = (1 - c) * (k[0] * x[0] + k[1] * x[1] + k[2] * x[2]);
    return [0, 1, 2].map((i) => x[i] * c + kx[i] * s + k[i] * d);
  };
  const v = unit(turn(cam.v)), r0 = turn(cam.r), rv = r0[0] * v[0] + r0[1] * v[1] + r0[2] * v[2];
  const r = unit(r0.map((x, i) => x - rv * v[i]));
  Object.assign(cam, { r, u: cross(v, r), v });
}
const unit = (x) => { const l = Math.hypot(...x); return x.map((c) => c / l); };
// A rotation vector given on the screen's axes (right, up, towards the viewer) → in world coordinates
const screenTurn = (a, b, c) => [0, 1, 2].map((i) => a * cam.r[i] + b * cam.u[i] + c * cam.v[i]);

// Rotate (rotation vector w, see turnCam) around a centre that keeps its position on screen: the
// solid's own centre (the origin) for a surface, else the centre of the walk's bounding box. (On a
// surface that box grows unevenly with the walk: turning around it made the solid slide while
// auto-fit followed the walker.) Then recompute the projection and the 2D bounds.
function rotateView(w) {
  const [x0, x1, y0, y1, z0, z1] = bounds3 || [0, 0, 0, 0, 0, 0];
  const c = walk.sphere ? [0, 0, 0] : [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const before = projectPoint(...c);
  turnCam(w);
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
  updateDisplayMenu();
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
  Object.assign(walk, { vert: null, stepTiles: null, loop: null, n: len, digits: seq, wx: xs, wy: ys, wz: null, is3d: false, cells, maxDist, base,
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
  // flat, the sheet lies in the north–east plane: i towards the east, j towards the north
  const X = (i / nu - 0.5) * 2 * Math.PI, Y = (j / nv - 0.5) * 2 * Math.PI * TORUS_TUBE;
  let w = -Y, h = 0;  // w: offset away from the ring's centre (the north goes into the hole), h: height
  if (b > 1e-6) {  // it curls down round the tube, so its middle becomes the top of the torus, in front
    const rt = TORUS_TUBE / b, th = Y / rt;
    w = -rt * Math.sin(th);
    h = rt * (Math.cos(th) - 1) + TORUS_TUBE * b;
  }
  if (c < 1e-6) return [X, -w, h];
  const rr = 1 / c, ph = X / rr;
  return [(rr + w) * Math.sin(ph), rr - c - (rr + w) * Math.cos(ph), h];  // − c: no jump from the flat sheet
}

function torusMesh(nv, nu = Math.round(nv / TORUS_TUBE)) {  // squares about as long around the ring as around the tube
  const key = `torus${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
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
function hexTorusMesh(nv, nu = hexTorusColumns(nv)) {
  const key = `hextorus${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
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

/* Sphere of hexagons (a Goldberg polyhedron, the football's pattern): the dual of the icosahedron
 * of triangles. Each corner of its triangles becomes a cell, outlined by the centres of the
 * triangles around it: 6 around most corners, 5 around the 12 corners of the icosahedron, so 12
 * pentagons among the hexagons, as on any sphere tiled with hexagons. A pentagon is stored as a
 * hexagon whose last corner is repeated (a zero-length edge), so that every cell has 6 corners. */
function hexSphereMesh(f) {
  const key = `hexsphere${f}`;
  if (meshCache[key]) return meshCache[key];
  const ico = flatPolyhedron('icosa', f), V = ico.verts, nv = V.length / 3;
  const around = Array.from({ length: nv }, () => []);
  for (let t = 0; t < ico.n; t++) for (let q = 0; q < 3; q++) around[ico.poly[3 * t + q]].push(t);
  const cells = around.map((tris, v) => {
    // the triangles around corner v, counterclockwise seen from outside (angles in the plane ⟂ v)
    const n = [V[3 * v], V[3 * v + 1], V[3 * v + 2]], a = cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]), b = cross(n, a);
    const angle = (t) => {
      const c = [0, 1, 2].map((d) => ico.cen[3 * t + d] - n[d]);
      return Math.atan2(c[0] * b[0] + c[1] * b[1] + c[2] * b[2], c[0] * a[0] + c[1] * a[1] + c[2] * a[2]);
    };
    const ring = tris.slice().sort((x, y) => angle(x) - angle(y));
    return ring.length === 6 ? ring : [...ring, ring[ring.length - 1]];
  });
  const mesh = finishMesh(Array.from(ico.cen), cells, 6, f);  // the triangles' centres are the corners
  // a walk along its grid starts as the icosahedron's tile walk does: on triangle 0, come in
  // through its edge 0, so that the same digits draw the same path in both tabs
  mesh.gridStart = [0, ico.nbr[0]];
  // in a Game of Life the pentagons are walls: always dead, and no one's neighbour
  mesh.walls = cells.flatMap((c, v) => (c[4] === c[5] ? [v] : []));
  return (meshCache[key] = mesh);
}

/* Torus of equilateral triangles: nv rows around the tube (nv even), every other row shifted by half
 * a triangle, nu corners along each row. In sheet units a triangle is 1 wide and its row √3/2 high;
 * the sheet is 2π by 2π·TUBE, so the triangles are equilateral when nu / nv = √3 / (2·TUBE).
 * Every corner has 6 edges: the triangular grid that wraps around both ways. */
const triTorusColumns = (nv) => Math.round((nv * Math.sqrt(3)) / (2 * TORUS_TUBE));
function triTorusMesh(nv, nu = triTorusColumns(nv)) {
  const key = `tritorus${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore();
  const tris = [], uv = [];
  const P = (i, j) => [i + (j % 2) / 2, j];  // sheet coordinates of corner i of row j
  const put = (c) => { tris.push(c.map(([i, j]) => add(...torusPoint(i, j, nu, nv, 1)))); uv.push(...c.flat()); };
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {  // the two triangles between corners i, i + 1 of rows j and j + 1
      if (j % 2 === 0) {
        put([P(i, j), P(i + 1, j), P(i, j + 1)]);
        put([P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]);
      } else {
        put([P(i, j), P(i + 1, j), P(i + 1, j + 1)]);
        put([P(i, j), P(i + 1, j + 1), P(i, j + 1)]);
      }
    }
  }
  return (meshCache[key] = finishTorus(verts, tris, 3, nu, nv, uv));
}

/* ---- 7.5 Flat ↔ round: the same tiles and neighbours, shown flat or inflated ----------------- */
/* walk.shape = { m, target, corners, cen, nrm, extent, bent } for surfaces that can change shape:
 * polyhedra (each vertex slides from its face towards the circumscribed sphere) and the torus
 * (rolled up from a flat rectangle). The cells and their neighbours never change, so a walk or a
 * Game of Life run goes on unchanged: only the drawing and the 3D positions move. */
const MORPHABLE = ['cube', 'tetra', 'octa', 'icosa', 'torus', 'hextorus', 'tritorus', 'hexsphere'];

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
  // per tile: centre, normal (from two diagonals), the farthest corner; plain numbers, no arrays,
  // as this runs at every frame of a morph
  let extent = 0;
  const sign = shapeSign(g), bent = new Map(), C = corners;
  const folds = !g.torus && !g.faces && m < 1;  // only the hexagon sphere, when not round, has folded tiles
  for (let t = 0; t < n; t++) {
    const o = 3 * k * t;
    let cx = 0, cy = 0, cz = 0;
    for (let q = 0; q < k; q++) {
      const x = C[o + 3 * q], y = C[o + 3 * q + 1], z = C[o + 3 * q + 2];
      cx += x; cy += y; cz += z;
      extent = Math.max(extent, Math.hypot(x, y, z));
    }
    cx /= k; cy /= k; cz /= k;
    const i0 = o, i1 = o + 3, i2 = o + 6, il = o + 3 * (k - 1);
    const ax = C[i2] - C[i0], ay = C[i2 + 1] - C[i0 + 1], az = C[i2 + 2] - C[i0 + 2];
    const bx = C[il] - C[i1], by = C[il + 1] - C[i1 + 1], bz = C[il + 2] - C[i1 + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = (Math.hypot(nx, ny, nz) || 1) * sign;
    nx /= l; ny /= l; nz /= l;
    cen[3 * t] = cx; cen[3 * t + 1] = cy; cen[3 * t + 2] = cz;
    nrm[3 * t] = nx; nrm[3 * t + 1] = ny; nrm[3 * t + 2] = nz;
    if (!folds) continue;
    // a tile folded over an edge of the solid (the flat hexagon sphere): the normals of its parts,
    // so that it still shows when one part faces the viewer and the whole does not
    const parts = [];
    let folded = false;
    for (let q = 0; q < k; q++) {
      const a = o + 3 * q, b = o + 3 * ((q + 1) % k);
      const px = C[a] - cx, py = C[a + 1] - cy, pz = C[a + 2] - cz, qx = C[b] - cx, qy = C[b + 1] - cy, qz = C[b + 2] - cz;
      const wx = py * qz - pz * qy, wy = pz * qx - px * qz, wz = px * qy - py * qx, lw = Math.hypot(wx, wy, wz);
      if (!lw) continue;
      parts.push([wx / lw, wy / lw, wz / lw]);
      if ((wx * nx + wy * ny + wz * nz) / lw < 0.99) folded = true;
    }
    if (folded) bent.set(t, parts);
  }
  return { m, corners, cen, nrm, extent, bent };
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

// A new walk mode starts in its default form (round for the icosahedron and the torus, flat
// otherwise); the same mode rebuilt (another size, number or rule) keeps the form it had
function initShape(kind) {
  if (!MORPHABLE.includes(kind)) { walk.shape = null; updateMorphButton(); return; }
  const mode = current.mode, keep = previousShape && previousShape.mode === mode;
  const g = walk.geo, m = keep ? previousShape.target : MODES[mode].round ? 1 : 0;
  const maxExtent = Math.max(shapeAt(g, 0).extent, shapeAt(g, 1).extent);
  walk.shape = { ...shapeAt(g, m), target: m, maxExtent, mode };
}

// Put the current shape in place: tile centres of the walk's points, the frame and the view
function applyShape() {
  const sh = walk.shape, R = walk.R;
  if (walk.vert) {  // a walk along the grid: its points sit on the tiles' corners
    const { wx, wy, wz, vert } = walk, G = walk.geo.grid, k = walk.geo.sides;
    for (let i = 0; i <= walk.n; i++) {
      const c = 3 * (k * G.tileOf[vert[i]] + G.cornerOf[vert[i]]);
      wx[i] = sh.corners[c] * R; wy[i] = sh.corners[c + 1] * R; wz[i] = sh.corners[c + 2] * R;
    }
  } else if (!walk.life) {  // walk points sit on their tiles' centres
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

// Flat | Inflated (Unrolled | Rolled for a torus) in the Display menu, for surfaces that can change
// shape; the animation runs in tick (morphStep) and the walk or Life run goes on meanwhile
function updateMorphButton() {
  const sh = walk.shape;
  $('shapeRow').hidden = !sh || !shows('shape');
  if (!sh) return;
  const names = walk.geo.torus ? ['Unrolled', 'Rolled'] : ['Flat', 'Inflated'];
  $('shapeButtons').replaceChildren(...names.map((name, m) => {
    const b = document.createElement('button');
    b.textContent = name;
    b.classList.toggle('active', sh.target === m);
    b.addEventListener('click', () => { walk.shape.target = m; updateMorphButton(); });
    return b;
  }));
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
  // a torus's size: its rows (see torusDims); perRow: tiles per column across a row; steps: what rows
  // and tiles per row go by in a size of its own, keeping the sheet's columns even or rows even
  torus: { mesh: (s) => torusMesh(...torusDims('torus', s)), radius: (s) => torusDims('torus', s)[0] / (2 * Math.PI * TORUS_TUBE),  // edge around the tube = 1 unit
          columns: (nv) => Math.round(nv / TORUS_TUBE), perRow: 1, steps: [1, 1],
          sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (s) => torusDims('torus', s).reduce((a, b) => a * b), unit: 'squares' },
  // hexagon edge = 1 unit: the tube is nv rows of √3 around
  hextorus: { mesh: (s) => hexTorusMesh(...torusDims('hextorus', s)), radius: (s) => (torusDims('hextorus', s)[0] * Math.sqrt(3)) / (2 * Math.PI * TORUS_TUBE),
              columns: hexTorusColumns, perRow: 1, steps: [1, 2],  // an even count of columns
              sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (s) => torusDims('hextorus', s).reduce((a, b) => a * b), unit: 'hexagons' },
  // the icosahedron's dual: a cell per corner of its triangles (hexagon edge ≈ 1 unit)
  hexsphere: { mesh: hexSphereMesh, radius: (f) => (f * Math.sqrt(3)) / 2,
               sizes: STEPS_128.slice(0, -2), initial: 32, tiles: (f) => 10 * f * f + 2, unit: 'hexagons' },
  // triangle edge = 1 unit: the tube is nv rows of √3/2 around
  tritorus: { mesh: (s) => triTorusMesh(...torusDims('tritorus', s)), radius: (s) => (torusDims('tritorus', s)[0] * Math.sqrt(3)) / (4 * Math.PI * TORUS_TUBE),
              columns: triTorusColumns, perRow: 2, steps: [2, 2],  // an even count of rows, two triangles per column
              sizes: [16, 24, 32, 48, 64], initial: 32, tiles: (s) => 2 * torusDims('tritorus', s).reduce((a, b) => a * b), unit: 'triangles' },
  tetra: { mesh: (f) => flatPolyhedron('tetra', f), radius: (f) => f / (2 * Math.SQRT2),  // edge 2√2
          sizes: STEPS_128, initial: 32, tiles: (f) => 4 * f * f, unit: 'triangles' },
  octa:  { mesh: (f) => flatPolyhedron('octa', f), radius: (f) => f / Math.SQRT2,          // edge √2
          sizes: STEPS_128, initial: 16, tiles: (f) => 8 * f * f, unit: 'triangles' },
  icosa: { mesh: (f) => flatPolyhedron('icosa', f), radius: (f) => f / 2,                  // edge 2
          sizes: STEPS_128.slice(0, -2), initial: 32, tiles: (f) => 20 * f * f, unit: 'triangles' },  // 20,480 triangles
};

// The surface size as a stepper: [ − ] 6,144 squares [ + ] goes through the sizes of the (hidden)
// menu one by one; the menu stays the source of truth, as for the walk modes
function syncSizeStepper() {
  const sel = $('sphereF');
  syncLoopRow();
  $('sizeLabel').textContent = sel.selectedOptions[0]?.text ?? '';
  $('sizeDown').disabled = sel.selectedIndex <= 0;
  $('sizeUp').disabled = sel.selectedIndex >= sel.options.length - 1;
  const starts = modeStarts();
  $('startRow').hidden = !starts;
  if (!starts) return;
  if (document.activeElement !== $('startLabel')) $('startLabel').value = `start ${fmt(startNo())} of ${fmt(starts.length)}`;
  $('startDown').disabled = startNo() <= 1;
  $('startUp').disabled = startNo() >= starts.length;
}
// − / +: the usual sizes (from a torus size of its own, the usual ones just below or above it)
function stepSize(delta) {
  const sel = $('sphereF'), i = sel.selectedIndex + delta;
  if (i < 0 || i >= sel.options.length) return;
  sel.selectedIndex = i;
  for (const o of [...sel.options]) if (o.dataset.own && o !== sel.selectedOptions[0]) o.remove();
  sel.dispatchEvent(new Event('change'));
}

// The size in use: tiles across (a solid), rows (a torus), or rows "x" tiles per row (a torus made
// taller or wider)
const sphereSize = () => { const v = $('sphereF').value; return v.includes('x') ? v : Number(v); };
// A torus's rows and columns: its tiles per row from its rows (squares or regular tiles), unless given
function torusDims(kind, size) {
  if (typeof size === 'number') return [size, SPHERES[kind].columns(size)];
  const [rows, perRow] = size.split('x').map(Number);
  return [rows, perRow / SPHERES[kind].perRow];
}
const sizeLabel = (kind, f) => {
  const { tiles, unit } = SPHERES[kind];
  if (!TORI.includes(kind)) return `${fmt(tiles(f))} ${unit}`;
  const rows = torusDims(kind, f)[0];  // a torus as its tiles towards the north (around the tube) × east (around the ring)
  return `${fmt(rows)} × ${fmt(tiles(f) / rows)} ${unit}`;
};
// A torus size of its own (Taller, Wider, a link): an extra entry among the usual ones, by rows;
// one with the usual tiles per row is the usual size
function selectTorusSize(kind, size) {
  const sel = $('sphereF'), [rows, cols] = torusDims(kind, size);
  for (const o of [...sel.options]) if (o.dataset.own) o.remove();
  const usual = cols === SPHERES[kind].columns(rows) && [...sel.options].find((o) => Number(o.value) === rows);
  if (usual) { sel.value = usual.value; return; }
  const own = new Option(sizeLabel(kind, size), size);
  own.dataset.own = '1';
  sel.insertBefore(own, [...sel.options].find((o) => torusDims(kind, sphereSizeOf(o))[0] > rows) ?? null);
  sel.value = size;
}
const sphereSizeOf = (o) => (o.value.includes('x') ? o.value : Number(o.value));

// Fill the Sphere size menu for the kind of sphere of the current mode
// The sizes of a surface, from its default one or the walk mode's (see MODES: initial)
function fillSphereSizes(kind, initial = SPHERES[kind].initial) {
  const sel = $('sphereF'), key = `${kind} ${initial}`;
  if (sel.dataset.kind === key) return;
  sel.replaceChildren(...SPHERES[kind].sizes.map((f) => new Option(sizeLabel(kind, f), f)));
  sel.value = initial;
  sel.dataset.kind = key;
}

// Walk from tile to tile. Entering a tile through edge k (vertices counterclockwise), the digit d
// leaves through edge k + turns[d]: k + 1 is on the right, k − 1 on the left, k + 2 straight on
// (for squares).
/* Walks on surface grids: from corner to corner along the tile edges. Arriving at a corner, the digit
 * gives a turn (degrees, left positive, measured in the plane tangent to the surface there) and the
 * walker leaves by the edge closest to it: on squares, left, straight on or right; on triangles, five
 * turns of 60°. Where fewer edges meet (a cube's corners, a polyhedron's), the nearest edge is
 * taken, the first one on a tie. */
// The grid of a mesh: each corner's neighbours, a tile it belongs to (and which corner of it it is),
// the tiles on each side of each edge, and the corner's normal (the mean of its tiles' normals)
function gridGraph(g) {
  if (g.grid) return g.grid;
  const nv = g.verts.length / 3, k = g.sides, V = g.verts;
  const nbrs = Array.from({ length: nv }, () => []), tileOf = new Int32Array(nv).fill(-1), cornerOf = new Int32Array(nv);
  const edgeTiles = new Map(), normal = new Float64Array(3 * nv);
  const key = (a, b) => (a < b ? a * nv + b : b * nv + a);
  for (let t = 0; t < g.n; t++) {
    const [a, b, c] = [0, 1, 2].map((j) => g.poly[k * t + j]);
    const n = cross([0, 1, 2].map((d) => V[3 * b + d] - V[3 * a + d]), [0, 1, 2].map((d) => V[3 * c + d] - V[3 * a + d]));
    for (let j = 0; j < k; j++) {
      const p = g.poly[k * t + j], q = g.poly[k * t + (j + 1) % k];
      if (p === q) continue;  // a pentagon's repeated corner (sphere of hexagons)
      if (!nbrs[p].includes(q)) { nbrs[p].push(q); nbrs[q].push(p); }
      const e = key(p, q);
      edgeTiles.set(e, [...(edgeTiles.get(e) ?? []), t]);
      if (tileOf[p] < 0) { tileOf[p] = t; cornerOf[p] = j; }
      for (let d = 0; d < 3; d++) normal[3 * p + d] += n[d];
    }
  }
  return (g.grid = { nv, nbrs, tileOf, cornerOf, edgeTiles, normal, key });
}

/* ---- The distinct starts on the solids ---------------------------------------------------------
 * On the cube, the tetrahedron, the octahedron, the icosahedron and the sphere of hexagons, a walk
 * along the grid starts on a corner, arriving by one of its edges. The rotations that map the solid
 * onto itself map the grid onto itself, and a walk's rule only looks at its own turns, so turned
 * starts draw the same walk, turned. A mirror does not count: it swaps left and right. */
const SOLIDS = ['cube', 'tetra', 'octa', 'icosa', 'hexsphere'];
const TORI = ['torus', 'tritorus', 'hextorus'];
const STARTS_ON = [...SOLIDS, ...TORI];  // the surfaces with a start selector

// On a torus every corner is like any other (shifting the sheet maps the grid onto itself), and
// turning the torus over (u, v → −u, −v) swaps the two ways along an edge: the different walks are
// one per direction of edge, 2 on squares, 3 on triangles and hexagons. They start at the corner
// nearest the middle of the sheet (or the next one, to head the other way), heading between north
// and south through the east, in that order: north (or the nearest after it) first, then east.
function torusStarts(g) {
  const G = gridGraph(g), { nu, nv, uv } = g, k = g.sides;
  const at = (v) => { const i = 2 * (k * G.tileOf[v] + G.cornerOf[v]); return [uv[i], uv[i + 1]]; };
  // a step in the flat sheet, across the seams: east, north (in the sheet's units, see torusPoint)
  const step = (a, b) => {
    const [ua, va] = at(a), [ub, vb] = at(b);
    let du = ub - ua, dv = vb - va;
    du -= nu * Math.round(du / nu); dv -= nv * Math.round(dv / nv);
    return [(du / nu) * 2 * Math.PI, (dv / nv) * 2 * Math.PI * TORUS_TUBE];
  };
  let v0 = 0, best = Infinity;
  for (let v = 0; v < G.nv; v++) {
    const [u, w] = at(v), d = Math.hypot(((u - nu / 2) / nu) * 2 * Math.PI, ((w - nv / 2) / nv) * 2 * Math.PI * TORUS_TUBE);
    if (d < best) { best = d; v0 = v; }
  }
  const heading = ([e, n]) => (Math.atan2(e, n) * 180) / Math.PI;  // clockwise from north, −180 … 180
  const starts = new Map();  // heading (0 … 180) → [corner, the corner it arrives from]
  for (const f of G.nbrs[v0]) {
    const h = heading(step(f, v0)), key = Math.round(((h % 180) + 180) % 180) % 180;  // its direction, either way
    if (!starts.has(key)) starts.set(key, Math.abs(h - key) < 90 ? [v0, f] : [f, v0]);  // else from v0 to f, the other way
  }
  return [...starts.keys()].sort((a, b) => a - b).map((key) => starts.get(key));
}

// The rotations (3×3 matrices, by rows) that map a solid onto itself, from its corners' directions:
// those taking a corner and its nearest one onto any two corners at the same angle that map every
// corner onto a corner (12 for the tetrahedron, 24 for the cube and the octahedron, 60 for the
// icosahedron)
function solidRotations(C) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const frame = (a, b) => { const u = unit(b.map((x, d) => x - dot(a, b) * a[d])); return [a, u, cross(a, u)]; };
  const c1 = C.slice(1).reduce((best, c) => (dot(C[0], c) > dot(C[0], best) ? c : best)), cos = dot(C[0], c1), F0 = frame(C[0], c1);
  const rots = [];
  for (const a of C) for (const b of C) {
    if (a === b || Math.abs(dot(a, b) - cos) > 1e-6) continue;
    const F = frame(a, b), M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => F[0][i] * F0[0][j] + F[1][i] * F0[1][j] + F[2][i] * F0[2][j]));
    if (C.every((c) => C.some((e) => dot(M.map((row) => dot(row, c)), e) > 1 - 1e-6))) rots.push(M);
  }
  return rots;
}

// The solid's corners: of its faces, or the 12 pentagons of the sphere of hexagons (a pentagon's
// direction from its 5 corners: its centre counts the repeated one twice)
function solidCorners(g) {
  const V = g.verts, C = [];
  const put = (p) => { const u = unit(p); if (!C.some((c) => c[0] * u[0] + c[1] * u[1] + c[2] * u[2] > 1 - 1e-9)) C.push(u); };
  if (g.faces) for (const f of g.faces) f.corners.forEach(put);
  else for (const t of g.walls) put([0, 1, 2].map((d) => [0, 1, 2, 3, 4].reduce((sum, q) => sum + V[3 * g.poly[6 * t + q] + d], 0)));
  return C;
}

// The usual start: gridStart (the sphere of hexagons) or the first corner, arriving by its first edge
const firstStart = (g, G) => g.gridStart ?? [g.poly[0], G.nbrs[g.poly[0]][0]];

// The solid's face centres: of its faces, or of the icosahedron's 20 (3 corners side by side)
function solidFaceCentres(g, C) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sum = (ps) => unit([0, 1, 2].map((d) => ps.reduce((s, p) => s + p[d], 0)));
  if (g.faces) return g.faces.map((f) => sum(f.corners));
  const O = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if (dot(C[i], C[j]) > 0.3 && dot(C[i], C[k]) > 0.3 && dot(C[j], C[k]) > 0.3) O.push(sum([C[i], C[j], C[k]]));
  }
  return O;
}

// The different starts in order, as pairs [corner, the corner it arrives from], one per walk, all
// in the kite of start 1: the points of the face F it lies on that are nearer F's corner A (the one
// nearest start 1) than F's other corners; a quarter of a square face, a third of a triangle, as
// the solid's rotations turn it onto every other such kite. Each walk takes its start whose edge's
// middle lies deepest inside it (on the sphere, a point lies on the face whose centre is nearest).
// An edge gives two starts, one per direction (the same as start 1's, towards A or away from it,
// first), only one when a rotation turns it end for end. They follow by distance from A.
function startList(g) {
  if (g.starts) return g.starts;
  if (g.torus) return (g.starts = torusStarts(g));
  const G = gridGraph(g), V = g.verts, nv = G.nv, at = (v) => [V[3 * v], V[3 * v + 1], V[3 * v + 2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mid = (a, b) => unit([0, 1, 2].map((d) => V[3 * a + d] + V[3 * b + d]));
  const C = solidCorners(g), rots = solidRotations(C);
  // a turned corner is found again as the corner within 1e-6 of it (it is off by rounding errors
  // only), among those of its cell of a coarse grid and of the 26 cells around (one is enough
  // unless it lies on a cell's side)
  const cellOf = (p) => p.map((x) => Math.floor(x * 50) + 128), cellKey = ([i, j, k]) => (i * 256 + j) * 256 + k;
  const cells = new Map();
  for (let v = 0; v < nv; v++) { const k = cellKey(cellOf(at(v))); cells.set(k, [...(cells.get(k) ?? []), v]); }
  const near = (p, k) => cells.get(k)?.find((w) => Math.hypot(V[3 * w] - p[0], V[3 * w + 1] - p[1], V[3 * w + 2] - p[2]) < 1e-6);
  const turned = (m, v) => {
    const p = m.map((row) => row[0] * V[3 * v] + row[1] * V[3 * v + 1] + row[2] * V[3 * v + 2]), c = cellOf(p);
    let w = near(p, cellKey(c));
    for (let d = 0; w === undefined && d < 27; d++) w = near(p, cellKey([c[0] + (d % 3) - 1, c[1] + (Math.floor(d / 3) % 3) - 1, c[2] + Math.floor(d / 9) - 1]));
    return w;
  };
  const [v0, f0] = firstStart(g, G), q0 = mid(v0, f0);
  const nearest = (ps, q) => ps.reduce((b, p) => (dot(p, q) > dot(b, q) ? p : b));
  const centres = solidFaceCentres(g, C), O = nearest(centres, q0), top = Math.max(...C.map((c) => dot(c, O)));
  const F = C.filter((c) => dot(c, O) > top - 1e-6), A = nearest(F, q0);  // the face's corners, the kite's
  const otherCentres = centres.filter((c) => c !== O), otherCorners = F.filter((c) => c !== A);
  const depth = (q) => Math.min(dot(q, O) - Math.max(...otherCentres.map((c) => dot(q, c))), dot(q, A) - Math.max(...otherCorners.map((c) => dot(q, c))));
  const edgeKey = (a, b) => Math.min(a, b) * nv + Math.max(a, b), done = new Set(), picks = [];
  for (let v = 0; v < nv; v++) for (const w of G.nbrs[v]) {
    if (done.has(edgeKey(v, w))) continue;
    let best = null, flipped = false;
    for (const m of rots) {
      const a = turned(m, v), b = turned(m, w), near = edgeKey(a, b) === edgeKey(v0, f0) ? Infinity : depth(mid(a, b));
      done.add(edgeKey(a, b));
      flipped ||= a === w && b === v;
      if (!best || near > best.near) best = { a, b, near };
    }
    picks.push({ ...best, flipped });
  }
  const fromA = (e) => (e.near === Infinity ? Infinity : dot(mid(e.a, e.b), A));
  picks.sort((e1, e2) => fromA(e2) - fromA(e1));
  const towards = dot(at(v0), A) > dot(at(f0), A), starts = [];  // start 1 arrives at its edge's end nearer A
  for (const { a, b, flipped } of picks) {
    const [n, f] = dot(at(a), A) > dot(at(b), A) ? [a, b] : [b, a];  // the end nearer A, the other one
    const pair = towards ? [[n, f], [f, n]] : [[f, n], [n, f]];
    starts.push(...(flipped ? pair.slice(0, 1) : pair));
  }
  return (g.starts = starts);
}

// The starts of the current mode (a walk along a solid's grid), else null; the chosen one, 1 … their number
function modeStarts() {
  const mode = MODES[$('mode').value];
  return mode.grid && STARTS_ON.includes(mode.sphere) ? startList(SPHERES[mode.sphere].mesh(sphereSize())) : null;
}
const startNo = () => Math.max(1, Math.min(Number($('startNo').value) || 1, modeStarts()?.length ?? 1));
let startsShown = false;  // while the start selector is hovered: the globe shows the starts instead of the walk

// Every start's edge (two starts each, one per direction); the chosen one in yellow, an arrow in
// its middle, and the start dot on the corner it arrives at
function drawStarts(ctx) {
  const g = walk.geo, G = gridGraph(g), sh = walk.shape, R = walk.R, k = g.sides, proj = projector(), list = startList(g);
  const normal = (v) => unit([G.normal[3 * v], G.normal[3 * v + 1], G.normal[3 * v + 2]]);
  const { scale: s, ox, oy } = view;
  const at = (v) => { const c = 3 * (k * G.tileOf[v] + G.cornerOf[v]); return [sh.corners[c] * R, sh.corners[c + 1] * R, sh.corners[c + 2] * R]; };
  const edge = ([v, f]) => {  // screen ends: the corner it comes from, the corner; null when facing away
    const p = at(v);
    if (!planeVisible(normal(v), p)) return null;
    const [x0, y0] = proj(...at(f)), [x1, y1] = proj(...p);
    return [ox + x0 * s, oy + y0 * s, ox + x1 * s, oy + y1 * s];
  };
  const width = Math.max(1, Math.min(s * 0.06, 2.5));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = '#8b949e';
  ctx.beginPath();
  for (const st of list) {  // the two starts of an edge share it: drawn twice
    const h = edge(st);
    if (h) { ctx.moveTo(h[0], h[1]); ctx.lineTo(h[2], h[3]); }
  }
  ctx.stroke();
  const h = edge(list[startNo() - 1]);
  if (h) {
    const [x0, y0, x1, y1] = h, len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    const a = Math.max(8, 0.4 * len), mx = (x0 + x1) / 2 + ux * a / 2, my = (y0 + y1) / 2 + uy * a / 2;  // the head, centred on the middle
    ctx.strokeStyle = ctx.fillStyle = '#f0b429';
    ctx.lineWidth = 2 * width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx - ux * a - uy * a * 0.6, my - uy * a + ux * a * 0.6);
    ctx.lineTo(mx - ux * a + uy * a * 0.6, my - uy * a - ux * a * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3fb950';  // the start dot, as in the walk
    ctx.beginPath(); ctx.arc(x1, y1, Math.max(3, Math.min(s * 0.15, 6)), 0, 2 * Math.PI); ctx.fill();
  }
  ctx.restore();
}

// A step on the flat sheet of a torus, from corner a to corner b across the seams: columns east, rows north
function sheetDelta(g, G, a, b) {
  const k = g.sides, ia = 2 * (k * G.tileOf[a] + G.cornerOf[a]), ib = 2 * (k * G.tileOf[b] + G.cornerOf[b]);
  const du = g.uv[ib] - g.uv[ia], dv = g.uv[ib + 1] - g.uv[ia + 1];
  return [du - g.nu * Math.round(du / g.nu), dv - g.nv * Math.round(dv / g.nv)];
}

// The corner a walk along the grid goes to from v, having come from `from`, for a turn of angle
// (radians): the edge nearest the turn, between two as near the left one (a rule that turns with the
// solid). The turn is measured on the plane tangent at v; on a torus, on its flat sheet (east, north;
// see torusPoint): rolled up, its tiles are bent unevenly, squeezed on the inside of the ring and
// stretched outside, which would change the edge a turn picks from place to place, so a repeating
// pattern would not repeat.
function nextCorner(g, G, v, from, angle) {
  const V = g.verts, n = g.torus ? [0, 0, 1] : [0, 1, 2].map((d) => G.normal[3 * v + d]), nl = Math.hypot(...n);
  const flat = (w) => {  // the edge from v to w, flattened onto the plane tangent at v (or on the sheet)
    if (g.torus) { const [du, dv] = sheetDelta(g, G, v, w); return [(du / g.nu) * 2 * Math.PI, (dv / g.nv) * 2 * Math.PI * TORUS_TUBE, 0]; }
    const e = [0, 1, 2].map((d) => V[3 * w + d] - V[3 * v + d]), s = (e[0] * n[0] + e[1] * n[1] + e[2] * n[2]) / (nl * nl);
    return e.map((x, d) => x - s * n[d]);
  };
  const h = flat(from).map((x) => -x);  // the heading
  let next = -1, err = Infinity;
  for (const w of G.nbrs[v]) {
    if (w === from) continue;
    const e = flat(w), c = cross(h, e);
    const turn = Math.atan2((c[0] * n[0] + c[1] * n[1] + c[2] * n[2]) / nl, h[0] * e[0] + h[1] * e[1] + h[2] * e[2]);
    const off = Math.abs(turn - angle) - (turn > 0 ? 1e-9 : 0);
    if (off < err - 1e-12) { err = off; next = w; }
  }
  return next;
}

/* ---- Loops of a fraction on a torus -----------------------------------------------------------
 * A fraction's digits repeat with a period L. When the turns of a period add up to 0°, each period
 * shifts the walk by the same T on the flat sheet (columns east, rows north). A diagonal one, T both
 * ways, closes after the fewest periods m that make m·T a whole number of turns both ways, and how
 * many depends on the torus's size. For each start, the sizes (32 to 64 rows, proportions within
 * TORUS_RATIO of the usual ones) where it closes in at most LOOP_LAPS laps and LOOP_STEPS steps, one
 * per number of laps, the nearest the usual proportions: Browse loops goes through them. */
const TORUS_RATIO = [0.8, 1.25], LOOP_LAPS = 6, LOOP_STEPS = 20000;
let torusLoopList = null;  // { key, loops: [{ start, size, laps: [ring, tube], steps }] } for the number in use
function torusLoops() {
  const mode = MODES[$('mode').value], key = `${formulaInUse} ${$('mode').value}`;
  if (!mode.grid || !TORI.includes(mode.sphere)) return [];
  if (!current || current.formula !== formulaInUse || current.mode !== $('mode').value) return [];  // its digits are on their way
  if (torusLoopList?.key === key) return torusLoopList.loops;
  const loops = [];
  torusLoopList = { key, loops };
  if (!current.ratio) return loops;
  // the period: the order of the base modulo the denominator's part prime to it, after pre digits
  const b = BigInt(current.base), gcd = (x, y) => (y ? gcd(y, x % y) : x);
  let d = current.ratio[1], pre = 0;
  for (let c = gcd(d, b); c > 1n; c = gcd(d, b)) { d /= c; pre++; }
  if (d > 20000n) return loops;
  const q = Number(d);
  let L = 1;
  for (let r = current.base % q; q > 1 && r !== 1; r = (r * current.base) % q) L++;
  const H = current.head, D = current.digits, s0 = H.length + pre + 1;
  if (H.length + D.length < s0 + 2 * L) return loops;
  const digit = (i) => (i < H.length ? H[i] : D[i - H.length]);
  const kind = mode.sphere, S = SPHERES[kind], g = S.mesh(sphereSize()), G = gridGraph(g), angles = mode.turns.map((a) => (a * Math.PI) / 180);
  const usual = 48 / (S.columns(48) * S.perRow), gcdN = (x, y) => (y ? gcdN(y, x % y) : x);
  startList(g).forEach(([v0, f0], i) => {
    let v = v0, from = f0, x = 0, y = 0;
    const at = [];
    for (let j = 1; j <= s0 + 2 * L; j++) {  // the shifts of two periods in a row
      const w = nextCorner(g, G, v, from, angles[digit(j - 1)]), [du, dv] = sheetDelta(g, G, v, w);
      x += du; y += dv; from = v; v = w;
      if (j === s0 || j === s0 + L || j === s0 + 2 * L) at.push([x, y]);
    }
    const T = [at[1][0] - at[0][0], at[1][1] - at[0][1]];
    if (Math.abs(at[2][0] - at[1][0] - T[0]) > 1e-6 || Math.abs(at[2][1] - at[1][1] - T[1]) > 1e-6) return;  // its period turns
    if (Math.abs(T[0]) < 1e-6 || Math.abs(T[1]) < 1e-6) return;  // not diagonal: any size closes it alike
    const U = Math.round(2 * T[0]), V = Math.round(2 * T[1]), best = new Map();  // in half tiles
    for (let rows = 32; rows <= 64; rows += S.steps[0]) {
      for (let e = Math.ceil(rows / usual / TORUS_RATIO[1]); e <= rows / usual / TORUS_RATIO[0]; e++) {
        if (e % S.steps[1]) continue;
        const cols = e / S.perRow, mu = (2 * cols) / gcdN(2 * cols, Math.abs(U)), mv = (2 * rows) / gcdN(2 * rows, Math.abs(V));
        const m = (mu / gcdN(mu, mv)) * mv, laps = [Math.round((m * Math.abs(T[0])) / cols), Math.round((m * Math.abs(T[1])) / rows)];
        const steps = m * L + s0 + L, off = Math.abs(Math.log(rows / e / usual));
        if (laps[0] + laps[1] > LOOP_LAPS || steps > LOOP_STEPS) continue;
        const kept = best.get(`${laps}`);
        if (!kept || off < kept.off) best.set(`${laps}`, { start: i + 1, size: `${rows}x${e}`, laps, steps, off });
      }
    }
    loops.push(...best.values());
  });
  loops.sort((a, b) => a.laps[0] + a.laps[1] - b.laps[0] - b.laps[1] || a.start - b.start || a.steps - b.steps);
  return loops;
}
// The loop shown, if the start and size in use are one of them
function loopShown(loops) {
  const kind = MODES[$('mode').value].sphere, [rows, cols] = torusDims(kind, sphereSize());
  return loops.findIndex((l) => l.start === startNo() && `${torusDims(kind, l.size)}` === `${rows},${cols}`);
}
function syncLoopRow() {
  const loops = torusLoops();
  $('loopRow').hidden = !loops.length;
  if (!loops.length) return;
  const i = loopShown(loops), l = loops[i];
  $('loopLabel').textContent = l ? `loop ${i + 1} of ${loops.length} · ${l.laps[0]}+${l.laps[1]}` : `${loops.length} loops`;
  $('loopDown').disabled = i === 0;
  $('loopUp').disabled = i === loops.length - 1;
}
// − / +: the start, size and digits (one round) of the loop before or after
function browseLoop(delta) {
  const loops = torusLoops(), i = loopShown(loops), next = loops[i < 0 ? (delta > 0 ? 0 : loops.length - 1) : i + delta];
  if (!next) return;
  $('startNo').value = next.start;
  selectTorusSize(MODES[$('mode').value].sphere, next.size);
  digitsBeforeLoop ??= requestedDigits();  // the count asked comes back for the next number
  $('digits').value = next.steps;
  compute(true);
}

function buildGridWalk(seq, { sphere: kind, turns, base, initial }, ahead = new Uint8Array(0)) {
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize(), g = mesh(size), R = radius(size), G = gridGraph(g), V = g.verts;
  const len = seq.length, at = (v) => [V[3 * v], V[3 * v + 1], V[3 * v + 2]];
  const wx = new Float64Array(len + 1), wy = new Float64Array(len + 1), wz = new Float64Array(len + 1);
  const vert = new Int32Array(len + 1), tile = new Int32Array(len + 1), cells = new Int32Array(len + 1);
  const maxDist = new Float64Array(len + 1), counts = new Int32Array(base * (len + 1)), stepTiles = new Int32Array(2 * len);
  const seen = new Uint8Array(G.nv), angles = turns.map((a) => (a * Math.PI) / 180);
  let [v, from] = STARTS_ON.includes(kind) ? startList(g)[startNo() - 1] : firstStart(g, G);
  let distinct = 1, m = 0, coverStep = -1;
  seen[v] = 1;
  const start = at(v);
  const put = (i) => {
    const p = at(v);
    wx[i] = p[0] * R; wy[i] = p[1] * R; wz[i] = p[2] * R;
    vert[i] = v; tile[i] = G.tileOf[v]; cells[i] = distinct;
    m = Math.max(m, R * Math.hypot(p[0] - start[0], p[1] - start[1], p[2] - start[2]));
    maxDist[i] = m;
  };
  put(0);
  // A walk back on an earlier state (corner, and the corner it came from) with the same digits ahead
  // draws the same steps again, forever: it stops there, after its first round. The digits are
  // compared up to the ones ahead (LOOP_AHEAD after those walked), and only with at least LOOP_AHEAD
  // of them left, so that no other number gets cut by chance.
  const all = new Uint8Array(len + ahead.length);
  all.set(seq);
  all.set(ahead, len);
  const firstAt = new Map([[v * G.nv + from, 0]]);
  const repeats = (a, b) => { for (let x = b; x < all.length; x++) if (all[x] !== all[x - b + a]) return false; return true; };
  let steps = len, loop = null;
  for (let i = 0; i < len; i++) {
    const next = nextCorner(g, G, v, from, angles[seq[i]]);
    const sides = G.edgeTiles.get(G.key(v, next));
    stepTiles[2 * i] = sides[0]; stepTiles[2 * i + 1] = sides[1] ?? sides[0];
    from = v; v = next;
    if (!seen[v]) { seen[v] = 1; distinct++; if (distinct === G.nv) coverStep = i + 1; }
    put(i + 1);
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + seq[i]]++;
    const state = v * G.nv + from, earlier = firstAt.get(state);
    if (earlier === undefined) firstAt.set(state, i + 1);
    else if (all.length - i - 1 >= LOOP_AHEAD && repeats(earlier, i + 1)) { steps = i + 1; loop = { from: earlier }; break; }
  }
  Object.assign(walk, { n: steps, loop, digits: seq, wx, wy, wz, is3d: true, cells, maxDist, base, counts,
                        lattice: 'sphere', skipZeros: false, points: false, keys: seq, labels: null,
                        sphere: true, geo: g, R, tile, vert, stepTiles, nodes: G.nv, coverStep,
                        visits: new Int32Array(g.n), maxVisits: 0, life: null,
                        xs: new Float64Array(len + 1), ys: new Float64Array(len + 1) });
  initShape(kind);
  setPerspective();
  project();
  updateHint();
  restart();
  if (walk.shape) applyShape();
}

function buildSphereWalk(seq, { sphere: kind, turns, base, initial }) {
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize();
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
                        sphere: true, geo: g, R, tile, vert: null, stepTiles: null, loop: null, nodes: g.n, coverStep,
                        visits: new Int32Array(g.n), maxVisits: 0,
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
 * 0 dead, 1 alive, 2… the dying stages of "Generations" rules. With "Immigration" rules two
 * civilisations play by the same rule instead: 0 dead, 1 red, 2 blue; both count as live
 * neighbours, a cell keeps its colour while it survives, and a newborn takes the colour of most of
 * its live neighbours (on a tie, which only rules with an even birth count allow, the tile's index
 * decides). Neighbours share an edge or a corner (8 on squares, 12 on triangles). A surface has no border, so nothing escapes: every run
 * ends up frozen or looping, and the Lifetime stat is the generation where it starts repeating,
 * found with a fingerprint of the whole state.
 */

const LIFE_JUMP = 2000;
const LIFE_RED = '#ff7b72', LIFE_BLUE = '#4ea1ff';  // the two civilisations  // the Game of Life has no end: ⏭ jumps this many generations ahead
// fading trail after a cell dies: from a light slate grey down to the background
const LIFE_WALL = '#c4934e';  // the walls of a Life run (the hexagon sphere's pentagons)
const LIFE_TRAIL = Array.from({ length: 8 }, (_, i) => {
  const f = 1 - i / 8, mix = (a, b) => Math.round(b + (a - b) * f);
  return `rgb(${mix(0x6b, 0x1f)}, ${mix(0x7f, 0x26)}, ${mix(0x99, 0x30)})`;
});

// Neighbours of each tile: every other tile sharing an edge or a corner with it
// (12 for triangles, 8 for squares, fewer next to the solid's corners). Compact lists.
function cornerNeighbours(g) {
  if (g.life) return g.life;
  const nv = g.verts.length / 3, k = g.sides;
  const ring = k === 6 ? hexRing(g) : null;
  const byVertex = Array.from({ length: nv }, () => []);
  for (let t = 0; t < g.n; t++) for (let j = 0; j < k; j++) byVertex[g.poly[k * t + j]].push(t);
  const start = new Int32Array(g.n + 1), list = [], wall = new Set(g.walls);
  for (let t = 0; t < g.n; t++) {
    const set = new Set();
    // a wall has no neighbours, and is no one's neighbour
    if (!wall.has(t)) for (let j = 0; j < k; j++) for (const u of byVertex[g.poly[k * t + j]]) if (u !== t && !wall.has(u)) set.add(u);
    list.push(...set);
    start[t + 1] = list.length;
  }
  return (g.life = { start, list: new Int32Array(list), ring });
}

// On hexagons: the 6 neighbours of each tile in order around it (−1 for a wall or none), for the
// rules that look at where the live neighbours are (Callahan's o, m, p)
function hexRing(g) {
  const nv = g.verts.length / 3, wall = new Set(g.walls), ring = new Int32Array(6 * g.n).fill(-1), byEdge = new Map();
  for (let t = 0; t < g.n; t++) {
    if (wall.has(t)) continue;
    for (let q = 0; q < 6; q++) {
      const a = g.poly[6 * t + q], b = g.poly[6 * t + ((q + 1) % 6)];
      if (a === b) continue;  // a pentagon's repeated corner
      const key = Math.min(a, b) * nv + Math.max(a, b), other = byEdge.get(key);
      if (other === undefined) { byEdge.set(key, 6 * t + q); continue; }
      ring[6 * t + q] = Math.floor(other / 6);
      ring[other] = t;
    }
  }
  return ring;
}

// Callahan's letters for where 2, 3 or 4 live neighbours sit around a hexagon (bit q = neighbour q):
// o (ortho) side by side, m (meta) one cell apart, p (para) opposite; for 3: o in a row, p every other
function hexClass(mask) {
  const bits = [0, 1, 2, 3, 4, 5].filter((q) => (mask >> q) & 1);
  const pair = bits.length === 4 ? [0, 1, 2, 3, 4, 5].filter((q) => !((mask >> q) & 1)) : bits;
  if (pair.length === 2) return ['', 'O', 'M', 'P'][Math.min(pair[1] - pair[0], 6 - pair[1] + pair[0])];
  if (bits.length !== 3) return '';
  if (mask === 0b010101 || mask === 0b101010) return 'P';
  return [0, 1, 2, 3, 4, 5].some((q) => ((0b111 << q | 0b111 >> (6 - q)) & 63) === mask) ? 'O' : 'M';
}

// "B3/S23", "B2/S/C3" or "B3/S23/Immigration" → birth and survival tables indexed by the number of
// live neighbours, and C, the number of states: 2 for Life, more for "Generations" rules (dying
// stages), 3 for two civilisations (two: true). On hexagons, Callahan's letters ("B2o/S2m34") tell
// where the neighbours sit (iso: true): the tables are then indexed by 16 + the 6-bit mask of them.
function parseRule(text) {
  const m = text.replace(/\s/g, '').toUpperCase().match(/^B([\dOMP]*)\/S([\dOMP]*)(?:\/C(\d+)|\/(IMMIGRATION))?H?$/);
  if (!m || /^[OMP]/.test(m[1]) || /^[OMP]/.test(m[2])) return null;
  const two = !!m[4], C = two ? 3 : m[3] ? Number(m[3]) : 2, iso = /[OMP]/.test(m[1] + m[2]);
  if (C < 2 || C > 10 || (iso && two)) return null;  // one digit per cell in base C: bases 2 to 10
  const table = (spec) => {
    const a = new Uint8Array(80);
    for (const [, d, letters] of spec.matchAll(/(\d)([OMP]*)/g)) {
      if (!letters) a[+d] = 1;
      for (let mask = 0; mask < 64; mask++) {
        const bits = mask.toString(2).replace(/0/g, '').length;
        if (bits === +d && (!letters || letters.includes(hexClass(mask)))) a[16 + mask] = 1;
      }
    }
    return a;
  };
  const tail = two ? '/Immigration' : C > 2 ? `/C${C}` : '';
  return { B: table(m[1]), S: table(m[2]), C, two, iso, text: `B${m[1].toLowerCase()}/S${m[2].toLowerCase()}${tail}` };
}

// The starting counts of a Life run: live cells (and the blue ones with two civilisations), dying ones
function countSeed(L) {
  L.seedAlive = L.seedBlue = L.seedDying = 0;
  for (const v of L.seed) {
    if (L.two ? v > 0 : v === 1) L.seedAlive++;
    else if (v) L.seedDying++;
    if (L.two && v === 2) L.seedBlue++;
  }
}

// Number of states of the current Life rule = the base the number is written in
const lifeStates = () => (parseRule($('lifeRule').value) || { C: 2 }).C;

function buildLife(seq, { sphere: kind, initial }) {
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize();
  const g = mesh(size);
  const nbr = cornerNeighbours(g);
  let rule = parseRule($('lifeRule').value) || parseRule('B3/S23');
  if (rule.iso && !nbr.ring) {  // Callahan's letters need hexagons
    rule = parseRule('B3/S23');
    $('lifePreset').value = rule.text;
    $('lifeCustomRow').hidden = true;
  }
  $('lifeRule').value = rule.text;
  const seed = new Uint8Array(g.n);
  seed.set(seq.subarray(0, g.n));  // one base-C digit per cell: its initial state (0 dead, 1 alive, 2… dying)
  for (const t of g.walls ?? []) seed[t] = 0;
  const n = g.n;
  walk.life = { nbr, ring: rule.iso ? nbr.ring : null, B: rule.B, S: rule.S, C: rule.C, two: rule.two, ruleText: rule.text, seed,
                alive: new Uint8Array(n), next: new Uint8Array(n), age: new Uint16Array(n),
                died: new Int32Array(n), activity: new Uint32Array(n), ever: new Uint8Array(n) };
  countSeed(walk.life);
  lifeStart = null;  // the number's digits
  const one = new Float64Array(1);
  Object.assign(walk, { vert: null, stepTiles: null, loop: null, n: Infinity, digits: seq, wx: one, wy: one, wz: one, is3d: true, cells: null,
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
  L.alive.set(L.seed);  // cell states: 0 dead, 1 alive, 2 … C−1 dying (two civilisations: 1 red, 2 blue)
  for (let t = 0; t < L.alive.length; t++) {
    const live = L.two ? L.alive[t] > 0 : L.alive[t] === 1;
    L.age[t] = L.ever[t] = live ? 1 : 0;
  }
  L.died.fill(-1e9);
  L.activity.fill(0);
  L.maxActivity = 0;
  L.aliveCount = L.everAlive = L.seedAlive;
  L.dyingCount = L.seedDying;
  L.blueCount = L.seedBlue;
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
  const L = walk.life, { start, list } = L.nbr, ring = L.ring, a = L.alive, b = L.next, gen = cur + 1, C = L.C, two = L.two;
  let alive = 0, dying = 0, blues = 0;
  for (let t = 0; t < a.length; t++) {
    const was = a[t];
    let now;
    if (start[t] === start[t + 1]) {
      now = 0;  // a wall (a pentagon of the hexagon sphere)
    } else if (was >= 2 && !two) {
      now = was + 1 < C ? was + 1 : 0;  // one more dying stage, or dead
    } else if (two) {  // live neighbours, and how many of them are blue
      let c = 0, blue = 0;
      for (let q = start[t]; q < start[t + 1]; q++) { const v = a[list[q]]; if (v) { c++; blue += v === 2; } }
      now = was ? (L.S[c] ? was : 0) : !L.B[c] ? 0 : 2 * blue > c ? 2 : 2 * blue < c ? 1 : 1 + (t & 1);
    } else {
      let c = 0;
      if (ring) {  // where the live neighbours sit around the hexagon
        for (let q = 0; q < 6; q++) { const v = ring[6 * t + q]; if (v >= 0 && a[v] === 1) c |= 1 << q; }
        c += 16;
      } else for (let q = start[t]; q < start[t + 1]; q++) c += a[list[q]] === 1;
      now = was ? (L.S[c] ? 1 : C > 2 ? 2 : 0) : L.B[c];
    }
    b[t] = now;
    const live = two ? now > 0 : now === 1;
    if (live) alive++;
    else if (now) dying++;
    if (two && now === 2) blues++;
    if (now === was) {
      if (live && L.age[t] < 65535) L.age[t]++;
      continue;
    }
    L.maxActivity = Math.max(L.maxActivity, ++L.activity[t]);
    if (live) {
      L.born++;
      L.age[t] = 1;
      if (!L.ever[t]) { L.ever[t] = 1; L.everAlive++; }
    } else if (two || was === 1) {
      L.dead++;
      L.age[t] = 0;
      L.died[t] = gen;
    }
  }
  L.alive = b;
  L.next = a;
  L.aliveCount = alive;
  L.dyingCount = dying;
  L.blueCount = blues;
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
 * - Duel (on the cube, with two civilisations): a blue patch and a red patch of radius 1 on two
 *   opposite faces. The hunt finds the most durable blue start alone on its face (all 512 starts
 *   of its 9 cells), then the red start that does best against that blue one (all 512 again, each
 *   played with the blue one): red winning first, then red still alive when the run settles (by how
 *   many more red cells than blue), then red lasting longest before it is wiped out. Then it plays.
 * - How: when a patch has at most 20,000 possible starts, all of them are tried, and the result is
 *   then the true record for that patch; otherwise 1,000 random starts, then 2,000 tweaks of the
 *   best one (hill climbing). For the same lifetime, the start with fewer live cells wins.
 * - One button: 🔍 Hunt, then ⏭ skip to the tweaks, then ▶︎ play the best so far.
 * The search runs in a worker with its own copy of the Life step, so the page stays fluid.
 */

/* ---- 9.1 The hunt worker --------------------------------------------------------------------- */
/* Runs in a Web Worker. Lifetime = T, the generation where the run starts repeating (dying out,
 * frozen or looping), found with the same state fingerprints as the Lifetime stat.
 * Phase 1: random starts (each cell a uniform random state). Phase 2: hill climbing — flip 1 to 3
 * random cells of the best start and keep the change when it lasts at least as long. */
function huntWorker() {
  self.onmessage = (e) => {
    const { n, start, list, ring, B, S, C, two, randomRuns, tweaks, cap, patch, colours, against, exhaustive, from, fromBest } = e.data;
    const step = (a, b) => {
      for (let t = 0; t < n; t++) {  // the same generation as lifeStep
        const was = a[t];
        if (start[t] === start[t + 1]) { b[t] = 0; continue; }  // a wall
        if (two) {
          let c = 0, blue = 0;
          for (let q = start[t]; q < start[t + 1]; q++) { const v = a[list[q]]; if (v) { c++; blue += v === 2; } }
          b[t] = was ? (S[c] ? was : 0) : !B[c] ? 0 : 2 * blue > c ? 2 : 2 * blue < c ? 1 : 1 + (t & 1);
          continue;
        }
        if (was >= 2) { b[t] = was + 1 < C ? was + 1 : 0; continue; }
        let c = 0;
        if (ring) {
          for (let q = 0; q < 6; q++) { const v = ring[6 * t + q]; if (v >= 0 && a[v] === 1) c |= 1 << q; }
          c += 16;
        } else for (let q = start[t]; q < start[t + 1]; q++) c += a[list[q]] === 1;
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
    // with an opponent (against: red is hunted against a fixed blue start), the red and blue cells
    const civs = (s) => { let red = 0, blue = 0; for (let t = 0; t < n; t++) { red += s[t] === 1; blue += s[t] === 2; } return { red, blue }; };
    // { T, P } — P = 0 when still unsettled at the cap. Against an opponent: { T, winner } as soon as
    // a civilisation is wiped out, else also the red and blue cells when it settles
    const lifetime = (seed) => {
      let a = Uint8Array.from(seed), b = new Uint8Array(n);
      const seen = new Map([[fingerprint(a), 0]]);
      for (let g = 1; g <= cap; g++) {
        step(a, b);
        [a, b] = [b, a];
        const count = against && civs(a);
        if (count && !(count.red && count.blue)) return { T: g, P: 0, winner: count.red ? 'red' : 'blue' };
        const k = fingerprint(a), first = seen.get(k);
        if (first !== undefined) return { T: first, P: g - first, ...count };
        seen.set(k, g);
      }
      return { T: cap, P: 0, ...(against && civs(a)) };
    };
    // how good a run is: its lifetime; against an opponent, red winning (sooner is better), then red
    // alive at the end (by its lead in cells), then red wiped out (later is better)
    const score = (r) => (!against ? r.T : r.winner === 'red' ? 2e9 - r.T : r.winner ? r.T : 1e9 + r.red - r.blue);
    // the cells a start may use: the whole surface, or a small patch (the rest starts dead)
    const free = patch || Array.from({ length: n }, (_, t) => t).filter((t) => start[t] < start[t + 1]);
    const randomSeed = () => { const s = new Uint8Array(n); for (const t of free) s[t] = Math.floor(Math.random() * C); return s; };
    // start number k of an exhaustive search: k written in base C over the patch; with colours (one
    // side of a duel) in base 2, each cell dead or of its colour
    const nthSeed = (k) => {
      const s = against ? Uint8Array.from(against) : new Uint8Array(n), base = colours ? 2 : C;
      free.forEach((t, i) => { const d = k % base; k = Math.floor(k / base); s[t] = colours ? d * colours[i] : d; });
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
      // best score first; for the same score, the start with fewer live cells
      const improved = !best || score(r) > score(best) || (score(r) === score(best) && live(seed) < live(bestSeed));
      if (improved) { best = r; bestSeed = seed; }
      report(1, i, randomRuns, improved);
    }
    for (let i = 1; i <= tweaks; i++) {
      const seed = bestSeed.slice();
      const flips = 1 + Math.floor(Math.random() * 3);
      for (let f = 0; f < flips; f++) seed[free[Math.floor(Math.random() * free.length)]] = Math.floor(Math.random() * C);
      const r = lifetime(seed);
      const accepted = score(r) >= score(best);  // equal scores are accepted too, to drift
      if (accepted) { best = r; bestSeed = seed; kept++; }
      report(2, i, tweaks, accepted);
    }
    self.postMessage({ type: 'done' });
  };
}

/* ---- 9.2 Hunt state and the one-button flow -------------------------------------------------- */
const hunt = { worker: null, key: null, best: null, seed: null, kept: 0, patch: null, colours: null, exhaustive: 0, tried: 0,
               tweaks: 0, phase: 0,  // phase: 1 random starts, 2 tweaks
               duel: null };  // a duel: { sides, found }, its sides hunted one after the other

// A hunt belongs to one surface, size and rule: anything else makes its champion meaningless
const huntKey = () => `${$('mode').value}|${$('sphereF').value}|${walk.life ? walk.life.ruleText : ''}`;

// Stop the hunt. When it ends normally or with ▶︎ Play the best so far, the best start found is
// loaded and played at once; when something else changed (number, surface, rule…) it is dropped.
function stopHunt(loadBest = false) {
  if (hunt.worker) { hunt.worker.terminate(); hunt.worker = null; }
  hunt.duel = null;
  hunt.phase = 0;
  renderHuntList();
  if (loadBest && hunt.seed) loadChampion();
}

function lifetimeWords(r) {
  if (r.winner) return `${r.winner} wins at generation ${fmt(r.T)}`;
  const both = r.red === undefined ? '' : `, ${fmt(r.red)} red and ${fmt(r.blue)} blue`;  // a duel that settles
  if (!r.P) return `still changing after ${fmt(r.T)} generations${both}`;
  return (r.P === 1 ? `settles at generation ${fmt(r.T)}` : `period-${fmt(r.P)} loop from generation ${fmt(r.T)}`) + both;
}

// One button runs the whole hunt: 🔍 Hunt starts the random starts, ⏭ skips to the tweaks,
// ▶︎ plays the best so far. A worker cannot hear a click in the middle of its loop, so skipping
// ends it and starts another one on the tweaks, from the best start found.
const HUNT_STARTS = 1000, HUNT_TWEAKS = 2000;
function huntClick() {
  if (!hunt.worker && zoneInUse() === 'duel90') pickHuntZone('duel90');  // nothing to hunt: play it again
  else if (!hunt.worker) startHunt();
  else if (hunt.duel) nextDuelSide();
  else if (hunt.phase === 1 && hunt.tweaks) skipToTweaks();
  else stopHunt(true);
}

function setHuntPhase(phase) {
  if (phase === hunt.phase) return;
  hunt.phase = phase;
  $('huntBtn').innerHTML = phase === 1 && hunt.tweaks ? `${icon('end')} Skip to the tweaks` : `${icon('play')} Play the best so far`;
}

// The hunt works on random starts, so the number becomes 🎲 Random digits first
function startHunt() {
  if (!walk.life) return;
  if (!isRandomDigits()) {
    $('formula').value = presetFormula('random');
    compute();
  }
  stopHunt();
  const { patch, radius, all, sides } = huntPlan(zoneInUse());
  if (sides) { hunt.duel = { sides, found: [] }; runDuelSide(); return; }
  hunt.duel = null;
  Object.assign(hunt, { key: huntKey(), best: null, seed: null, kept: 0, patch, radius, colours: null, tried: 0,
                        exhaustive: all, tweaks: all ? 0 : HUNT_TWEAKS });
  $('huntStatus').textContent = 'Starting…';
  runHuntWorker({ randomRuns: all || HUNT_STARTS, tweaks: hunt.tweaks, exhaustive: !!all });
}


/* ---- 9.3 Zones: the whole surface or a radius, as cards -------------------------------------- */
// Where the starts go: the whole surface, or the cells within a radius of 1, 2 or 3 steps.
// all: the number of possible starts when few enough to try them all (then no tweaks), else 0.
function huntPlan(zone) {
  if (zone === 'all') return { patch: null, radius: 0, all: 0 };
  if (zone === 'duel') {  // red around the usual centre, blue around the same cell of the opposite face
    const g = walk.geo, c = patchCentre(), face = Math.floor(c / g.perFace);
    const red = lifePatch(1, c), blue = lifePatch(1, c + ((face ^ 1) - face) * g.perFace);
    return { patch: [...red, ...blue], radius: 1, all: 0, colours: Uint8Array.from([...red.map(() => 1), ...blue.map(() => 2)]),
             sides: [{ name: 'blue', patch: blue, colour: 2 }, { name: 'red', patch: red, colour: 1 }] };
  }
  const radius = Number(zone.slice(6)), patch = lifePatch(radius), count = walk.life.C ** patch.length;
  return { patch, radius, all: count <= 20000 ? count : 0 };  // 2 states on 9 squares or 13 triangles, 3 states on 9 squares
}

// Where the starts go, as cards like the walk modes: the whole surface or a radius of 1, 2 or 3,
// with the real cell counts of the current surface. The hunt button tells how many starts it tries.
let huntZone = 'all';
const HUNT_ICONS = { all: 'zoneAll', radius1: 'zone1', radius2: 'zone2', radius3: 'zone3', duel: 'duel', duel90: 'duel' };
// The R-pentomino (..X / XXX / .X.), as (row, column) around a face's centre cell: the most durable
// 9-cell start, the one the duel hunt finds on both sides. Found for both, it gives two mirror images
// that stay mirror images (a draw); the duel90 zone turns the red one by 90° to break that symmetry.
const R_PENTOMINO = [[-1, 1], [0, -1], [0, 0], [0, 1], [1, 0]];
// The duel needs two opposite faces: the cube (its faces come in opposite pairs 0–1, 2–3, 4–5)
const duelPossible = () => walk.geo.sides === 4 && !walk.geo.torus;
// The zone chosen, or the whole surface when a duel no longer fits (another surface or rule)
const zoneInUse = () => (huntZone.startsWith('duel') && !(duelPossible() && walk.life.two) ? 'all' : huntZone);
function renderHuntList() {
  if (!walk.life || !walk.geo) return;
  const part = (cls, text) => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e; };
  $('huntList').replaceChildren(...['all', 'radius1', 'radius2', 'radius3', 'duel', 'duel90'].map((zone) => {
    const duel = zone.startsWith('duel'), { patch, radius } = duel ? { patch: null } : huntPlan(zone);
    const b = document.createElement('button');
    const words = document.createElement('span');
    words.append(part('mode-name', zone === 'duel' ? 'Radius duel' : zone === 'duel90' ? 'Radius duel R-pentomino 90°'
                   : patch ? `Radius ${radius}` : 'Whole surface'),
                 part('mode-detail', zone === 'duel' ? '9 red cells, 9 blue on the opposite face'
                   : zone === 'duel90' ? 'blue R-pentomino, the red one turned 90° on the opposite face'
                   : `${fmt(patch ? patch.length : walk.geo.n)} cells`));
    if (zone === 'duel') b.title = 'The most durable blue start alone on its face, then the red start that does best against it on the opposite face, then the duel plays';
    if (zone === 'duel90') b.title = 'The R-pentomino in blue, and in red turned by 90° on the opposite face: no longer mirror images, so one can win';
    const pic = part('mode-icon', '');
    pic.innerHTML = icon(HUNT_ICONS[zone]);
    b.append(pic, words);
    b.setAttribute('role', 'option');
    b.classList.toggle('active', zone === zoneInUse());
    b.disabled = !!hunt.worker || (duel && !duelPossible());  // the zone is fixed while a hunt runs
    b.addEventListener('click', () => pickHuntZone(zone));
    return b;
  }));
  if (hunt.worker) return;
  if (zoneInUse() === 'duel90') {
    $('huntBtn').innerHTML = `${icon('play')} Play the duel`;
    $('huntBtn').title = 'Start the R-pentomino duel again';
    return;
  }
  const { all, sides } = huntPlan(zoneInUse());
  if (sides) {
    $('huntBtn').innerHTML = `${icon('search')} Hunt blue, then red`;
    $('huntBtn').title = 'All 512 blue starts alone, the most durable one; then all 512 red starts against it, the best one; then the duel plays';
    return;
  }
  $('huntBtn').innerHTML = `${icon('search')} ${all ? `Hunt all ${fmt(all)}` : `Hunt ${fmt(HUNT_STARTS)} first`}`;
  $('huntBtn').title = all ? `Try all ${fmt(all)} starts, then play the best. Click again to play the best so far`
    : `${fmt(HUNT_STARTS)} random starts, then ${fmt(HUNT_TWEAKS)} tweaks of the best one, then it plays. Click again to skip to the tweaks, then to play the best so far`;
}

// Choosing a zone shows a first random start in it at once (clicking again draws another one):
// the whole surface is a new draw of 🎲 Random digits; a radius fills its cells at random, the rest dead
// Each click is a new random number, and the zone is placed once it is built (see placeZone)
function pickHuntZone(zone) {
  huntZone = zone;
  if (zone.startsWith('duel') && !walk.life.two) $('lifePreset').value = $('lifeRule').value = 'B3/S23/Immigration';
  $('formula').value = presetFormula('random');
  compute();  // built at once: random digits need no worker
  $('huntStatus').textContent = '';
  if (zone === 'duel90') play(true);  // nothing drawn: the duel plays at once
}

// After every build of a Life run (new number, surface, size or rule), the chosen zone's start: the
// whole surface keeps the number's digits, a radius takes its first ones (so the formula shown is
// what seeds the cells), a duel its first ones as dead or its side's colour, or the two R-pentominoes
function placeZone() {
  const zone = zoneInUse();
  if (zone === 'all') return;
  if (zone === 'duel90') { placePentominoDuel(); return; }
  const { patch, radius, colours } = huntPlan(zone), d = walk.digits, seed = new Uint8Array(walk.life.seed.length);
  patch.forEach((t, k) => { seed[t] = colours ? (d[k] % 2) * colours[k] : d[k]; });
  setLifeSeed(seed, colours ? 'duel' : { radius, cells: patch.length });
}

// A duel hunt: all 512 blue starts alone on their face, then all 512 red starts against the best blue
// one; the red champion comes with that blue start, so it is the duel to play
function runDuelSide() {
  const { sides, found } = hunt.duel, side = sides[found.length], all = 2 ** side.patch.length;
  Object.assign(hunt, { key: huntKey(), best: null, seed: null, kept: 0, patch: side.patch, radius: 1, tried: 0,
                        colours: new Uint8Array(side.patch.length).fill(side.colour), exhaustive: all, tweaks: 0 });
  runHuntWorker({ randomRuns: all, tweaks: 0, exhaustive: true, against: found[0]?.seed ?? null });
  const last = hunt.duel.found.length === hunt.duel.sides.length - 1;
  $('huntBtn').innerHTML = last ? `${icon('play')} Play the duel` : `${icon('end')} Skip to ${hunt.duel.sides[1].name}`;
}
function nextDuelSide() {
  if (hunt.worker) { hunt.worker.terminate(); hunt.worker = null; }
  const { sides, found } = hunt.duel;
  const side = sides[found.length];
  if (hunt.seed) found.push({ ...side, seed: hunt.seed, best: hunt.best });
  else found.push(null);  // skipped before its first start: this side starts empty
  if (found.length < sides.length) { runDuelSide(); return; }
  hunt.duel = null;
  stopHunt();
  const L = walk.life, seed = new Uint8Array(L.seed.length);
  for (const f of found) if (f) f.seed.forEach((v, t) => { if (v) seed[t] = v; });
  setLifeSeed(seed, 'duel');
  $('status').innerHTML = `${icon('dice')} duel: ` + found.filter(Boolean).map((f, i) =>
    `${f.name} ${i ? 'against it' : 'alone'}: ${lifetimeWords(f.best)} (${fmt(f.seed.reduce((a, v) => a + (v === f.colour), 0))} cells)`).join(' · ');
  $('huntStatus').textContent = '';
  play(true);
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

// Blue R-pentomino on the face behind, red one turned by 90° on the face in front
function placePentominoDuel() {
  const L = walk.life, g = walk.geo, c = patchCentre(), face = Math.floor(c / g.perFace);
  const blue = c + ((face ^ 1) - face) * g.perFace, seed = new Uint8Array(L.seed.length);
  for (const [r, k] of R_PENTOMINO) {
    seed[blue + r * g.size + k] = 2;
    seed[c + k * g.size - r] = 1;  // (row, column) → (column, −row): a quarter turn
  }
  setLifeSeed(seed, 'duel');
  $('status').textContent = 'Duel: a blue R-pentomino against a red one turned by 90°, on opposite faces';
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
      if (hunt.duel) nextDuelSide();
      else stopHunt(true);
      return;
    }
    setHuntPhase(d.phase);
    hunt.best = d.best;
    hunt.kept = d.kept;
    if (d.phase === 1) hunt.tried = d.i;
    if (d.seed) hunt.seed = d.seed;
    const phase = d.phase === 1 ? `${hunt.duel ? `${hunt.duel.sides[hunt.duel.found.length].name} start`
      : d.exhaustive ? 'start' : 'random start'} ${fmt(d.i)} / ${fmt(d.total)}`
      : `tweak ${fmt(d.i)} / ${fmt(d.total)} (${fmt(d.kept)} kept)`;
    $('huntStatus').textContent = `${phase} · record: ${lifetimeWords(d.best)}`;
  };
  hunt.worker.postMessage({ n: L.alive.length, start: L.nbr.start, list: L.nbr.list, ring: L.ring, B: L.B, S: L.S, C: L.C, two: L.two,
                            cap: 50000, patch: hunt.patch && Int32Array.from(hunt.patch), colours: hunt.colours, ...job });
}

/* ---- 9.4 Patches ----------------------------------------------------------------------------- */
// The cell where small starts go: the middle of the unrolled torus, of the cube face in front,
// else the tile that faces the default camera
function patchCentre() {
  const g = walk.geo, mid = (k) => Math.floor((k - 1) / 2);
  if (g.torus) return mid(g.nu) * g.nv + mid(g.nv);
  if (g.sides === 4) return 3 * g.perFace + mid(g.size) * g.size + mid(g.size);
  const dir = CAM0.v;
  let best = 0, bestDot = -Infinity;
  for (let t = 0; t < g.n; t++) {
    const c = g.cen.subarray(3 * t, 3 * t + 3), dot = (c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2]) / Math.hypot(...c);
    if (dot > bestDot && !g.walls?.includes(t)) { bestDot = dot; best = t; }
  }
  return best;
}

// The cells at most r Life-neighbour steps from the centre: a 3×3, 5×5 or 7×7 square on square
// grids (r = 1, 2, 3), a small disc of triangles on the polyhedra
function lifePatch(r, centre = patchCentre()) {
  const { start, list } = walk.life.nbr, seen = new Set([centre]);
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
  setLifeSeed(hunt.seed, 'hunt');
  const how = (hunt.exhaustive ? (hunt.tried >= hunt.exhaustive ? `the best of all ${fmt(hunt.exhaustive)} starts`
      : `the best of the first ${fmt(hunt.tried)} of ${fmt(hunt.exhaustive)} starts`)
    : hunt.kept ? `random start + ${fmt(hunt.kept)} tweak${hunt.kept > 1 ? 's' : ''}` : 'random start')
    + (hunt.patch ? `, radius ${hunt.radius}: ${fmt(hunt.patch.length)} cells` : '');
  $('status').innerHTML = `${icon('dice')} champion: ${lifetimeWords(hunt.best)} (${how}) · ${fmt(L.seedAlive)} live cells at the start`;
  $('huntStatus').textContent = '';
  play(true);  // watch it at once
}

// Replace the starting pattern of the current Life run and go back to generation 0. how: where it
// comes from, for the description — { radius, cells } (a zone filled with the number's first
// digits), 'hunt', 'duel' or 'saved' (a link or a saved setup). The link keeps the cells.
function setLifeSeed(seed, how) {
  const L = walk.life;
  L.seed.set(seed);
  for (const t of walk.geo.walls ?? []) L.seed[t] = 0;
  countSeed(L);
  championCode = encodeCells(L.seed, L.C);  // in its shortest form
  lifeStart = how;
  describe(L.C, Infinity);
  restart();
}

/* ==============================================================================================
 * PART 10 — SETUPS AND LINKS
 * ==============================================================================================
 *
 * A setup is a flat object of short keys, the same for the page link (#…), the saved setups in
 * this browser (localStorage) and the JSON export:
 *   x   the formula          w   the walk mode        d    the number of digits (walks)
 *   s   the surface size (a torus: rows, or rows x tiles per row)
 *   r   the Life rule        ch   a Life start (champion or patch)
 *   st  the start of a walk along a solid's grid (when not 1)
 *   fa  0 when Fill areas is off
 * It only holds what determines the result. Display choices (colours, grid, sky, camera, zoom…),
 * the speed and the current step are never saved: a link opens with the mode's default view, but
 * for Fill areas, which changes what is drawn. A
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
  if (modeStarts() && startNo() > 1) s.st = startNo();
  if (!$('fillAreas').checked) s.fa = 0;
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
  $('startNo').value = s.st ?? 1;
  if (MODES[s.w].sphere) {
    fillSphereSizes(MODES[s.w].sphere, MODES[s.w].initial);
    if (TORI.includes(MODES[s.w].sphere) && String(s.s ?? '').includes('x')) selectTorusSize(MODES[s.w].sphere, String(s.s));
    else set('sphereF', s.s);
  }
  if (s.r) {
    $('lifeRule').value = s.r;
    const preset = Array.from($('lifePreset').options).find((o) => o.value === s.r);
    $('lifePreset').value = preset ? s.r : 'custom';
  }
  // the display is not part of a setup: it takes the defaults of the walk mode's tab
  displayDefaults();
  $('fillAreas').checked = String(s.fa ?? 1) !== '0';  // the one display choice kept: it changes what is drawn
  $('perspective').checked = !!MODES[s.w].perspective;
  Object.assign(cam, CAM0);
  pendingChampion = s.ch || null;
  compute();  // a champion follows once the walk is built
  return true;
}

// Called when a walk has just been built: restore a loaded setup's champion, or place the chosen
// hunt zone's start, then write the link
function applyPendingView() {
  const ch = pendingChampion;
  pendingChampion = null;
  if (ch && walk.life) setLifeSeed(decodeCells(ch, walk.life.seed.length), 'saved');
  else if (walk.life) placeZone();
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
  if (busy || pendingChampion) return;  // not while a setup is still being built
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
  const name = prompt('Name this setup', `${shownSym} · ${mode}${rule}`);
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
    const incoming = (data.setups || []).filter((x) => x && x.name && x.setup && x.setup.x && x.setup.w);
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
  return 6 * 10 ** (v * 5); // 6 → 600,000 steps per second (logarithmic slider; 50 by default)
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
    if (walk.stepTiles) {  // along the grid: the tiles on both sides of the edge just walked
      for (const t of [walk.stepTiles[2 * i - 2], walk.stepTiles[2 * i - 1]]) walk.maxVisits = Math.max(walk.maxVisits, ++walk.visits[t]);
    } else if (walk.sphere) walk.maxVisits = Math.max(walk.maxVisits, ++walk.visits[walk.tile[i]]);
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
  $('play').innerHTML = playing ? `${icon('pause')} Pause` : `${icon('play')} Play`;
  $('play').classList.toggle('on', playing);
}

// A new walk is shown complete at once; Play replays it from the start
function showAll() {
  if (walk.life) return;  // the Game of Life starts at generation 0 instead
  advanceTo(walk.n);
  if ($('autoFit').checked) fitWhole();  // framed like F or a double-click, without the margin kept for growing
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
    walk.maxVisits = 1;
    if (!walk.stepTiles) walk.visits[walk.tile[0]] = 1;  // a tile walk starts on its first tile
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
const MIN_SCALE = 1e-6;  // pixels per cell, the farthest zoom out
function viewFor(b) {
  const w = b.maxX - b.minX + 2;
  const h = b.maxY - b.minY + 2;
  // down to 10⁻⁶ pixel per cell: a walk of 10 million steps can drift millions of cells away
  const scale = Math.min(40, Math.max(MIN_SCALE, Math.min(cw / w, ch / h) * 0.925));  // a 7.5 % margin
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
  // the lines bound the cells (the walk joins cell centres, at whole coordinates), as for the
  // triangles and the hexagons: they sit half a cell away from the centres
  const x0 = (((view.ox + s / 2) % px) + px) % px;
  const y0 = (((view.oy + s / 2) % px) + px) % px;
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

// Auto-fit on the sphere: ease the camera towards the walker so that it faces the viewer
// (then it projects onto the centre), by the shortest turn: around the axis walker × viewer.
// While the starts show, towards the chosen one.
function followWalker() {
  // on a torus the position does not say which way the surface faces: use the tile's normal
  const t = walk.tile[cur], nr = walk.shape.nrm;
  const d = unit(startsShown ? [walk.wx[0], walk.wy[0], walk.wz[0]]
    : walk.geo.torus ? [nr[3 * t], nr[3 * t + 1], nr[3 * t + 2]] : [walk.wx[cur], walk.wy[cur], walk.wz[cur]]);
  const axis = cross(d, cam.v), sin = Math.hypot(...axis), angle = Math.atan2(sin, towardViewer(...d));
  if (sin > 1e-9 && angle > 1e-4) rotateView(axis.map((x) => (x / sin) * angle * 0.12));
}

// Component of a unit vector towards the viewer (> 0 on the visible half of the sphere)
function towardViewer(x, y, z) {
  const v = cam.v;
  return x * v[0] + y * v[1] + z * v[2];
}
// Is a plane (outward normal n through point p) facing us? Orthographic: n points towards the
// viewer. Perspective: n points towards the camera position, seen from p.
function planeVisible(n, p) {
  const P = walk.persp;
  if (!P) return towardViewer(...n) > 0;
  const eye = cam.v.map((v, d) => P.c[d] + v * P.D);
  return n[0] * (eye[0] - p[0]) + n[1] * (eye[1] - p[1]) + n[2] * (eye[2] - p[2]) > 0;
}

function tileVisible(t) {
  const { cen, nrm, bent } = walk.shape, R = walk.R;  // the current form, flat or round
  const c = [cen[3 * t] * R, cen[3 * t + 1] * R, cen[3 * t + 2] * R];
  return planeVisible([nrm[3 * t], nrm[3 * t + 1], nrm[3 * t + 2]], c) || !!bent.get(t)?.some((w) => planeVisible(w, c));
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
  const L = walk.life, line = !L && $('colorMode').value === 'gradient';
  if (line) {  // Rainbow along the walk: a tile walked through (Fill cells), enclosed (Fill areas), or dark
    const cells = shows('fillCells') && $('fillCells').checked && firstVisits(), areas = $('fillAreas').checked && areaSteps();
    const band = (step) => Math.min(LEVELS - 1, Math.floor((step * LEVELS) / (walk.n + 1)));
    palette = [null, ...grad, ...(shows('translucent') && $('fillTranslucent').checked ? grad.map((c) => faded(c, 0.35)) : grad)];
    levelOf = (t) => (cells && cells[t] >= 0 && cells[t] <= cur ? 1 + band(cells[t])
      : areas && areas[t] >= 0 && areas[t] <= cur ? 1 + LEVELS + band(areas[t]) : 0);
  }
  if (L) {
    const colour = $('colorMode').value;
    // dying state k (2 … C−1) → a trail colour, from light (just dying) to dark (almost dead)
    const dyingShade = (k) => Math.min(LIFE_TRAIL.length, Math.round(((k - 1) / (L.C - 1)) * LIFE_TRAIL.length));
    if (L.two && colour !== 'digit') {  // each civilisation in its colour
      palette = [null, LIFE_RED, LIFE_BLUE];
      levelOf = (t) => L.alive[t];
    } else if (colour === 'mono') {
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
  if (L && g.walls) {  // the pentagons of the hexagon sphere: walls, in stone grey
    const inner = levelOf, wall = new Set(g.walls);
    palette = [...palette, LIFE_WALL];
    levelOf = (t) => (wall.has(t) ? palette.length - 1 : inner(t));
  }
  // the torus, and any polyhedron that is not flat, is drawn tile by tile from its current form;
  // a flat polyhedron is drawn face by face below
  if (startsShown) {  // an empty globe under the distinct starts, its 12 pentagons as the walls they are in a Life run
    const wall = new Set(g.walls);
    drawShapeTiles(ctx, walk.shape, g.sides, [null, LIFE_WALL], (t) => (wall.has(t) ? 1 : 0));
    drawStarts(ctx);
    return;
  }
  if (g.torus || !g.faces || walk.shape.m > 0) {  // the line goes with its tiles, so that nearer tiles hide it
    drawShapeTiles(ctx, walk.shape, g.sides, palette, levelOf, line && pathHalves());
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
  if (line) drawSurfacePath(ctx);
}

// The step of the first visit of each tile (−1: never visited), once per walk
let firstVisitData = null;
function firstVisits() {
  if (firstVisitData) return firstVisitData;
  const first = new Int32Array(walk.geo.n).fill(-1);
  for (let i = 0; i <= walk.n; i++) if (first[walk.tile[i]] < 0) first[walk.tile[i]] = i;
  return (firstVisitData = first);
}

// Fill areas on a surface, as for a 2D walk (see Fill areas in 11.5). A closed surface has no
// outside: the largest region left at the end of the walk plays it.
// - A walk from tile to tile: the regions are read at the tiles' corners, two neighbouring corners
//   being separated once the walk has crossed the tile edge between them; a tile is filled once all
//   its corners are enclosed (the tiles the walk passes through are the Fill cells).
// - A walk along the grid: the regions are made of tiles, two neighbouring tiles being separated
//   once the walk has gone along the edge between them, so the areas follow the path exactly.
let areaData = null;
function areaSteps() {
  if (areaData) return areaData;
  const g = walk.geo, k = g.sides, G = gridGraph(g), eu = [], ev = [], crossed = [];
  if (walk.stepTiles) {  // nodes: tiles; links: the edges with a tile on each side
    const index = new Map();
    for (const [e, sides] of G.edgeTiles) if (sides.length === 2) { index.set(e, eu.length); eu.push(sides[0]); ev.push(sides[1]); crossed.push(-1); }
    for (let i = 0; i < walk.n; i++) {
      const j = index.get(G.key(walk.vert[i], walk.vert[i + 1]));
      if (j !== undefined && crossed[j] < 0) crossed[j] = i;
    }
    // a fraction's digits end up repeating: its walk draws the same figure again and again and comes
    // back on itself, closing off big areas around the surface whatever it draws. Only its small
    // areas are filled, the rings of its figures (LOOP_FILL tiles at most), whatever the digits.
    return (areaData = enclosedFrom(g.n, eu, ev, crossed, current.fraction ? LOOP_FILL : Infinity));
  }
  const index = new Map(), tile = walk.tile;  // nodes: corners; links: the tile edges
  for (const e of G.edgeTiles.keys()) { index.set(e, eu.length); eu.push(Math.floor(e / G.nv)); ev.push(e % G.nv); crossed.push(-1); }
  for (let i = 0; i < walk.n; i++) {
    const A = tile[i], B = tile[i + 1], shared = [];
    for (let p = 0; p < k; p++) for (let q = 0; q < k; q++) if (g.poly[k * A + p] === g.poly[k * B + q]) shared.push(g.poly[k * A + p]);
    if (shared.length !== 2) continue;
    const j = index.get(G.key(shared[0], shared[1]));
    if (crossed[j] < 0) crossed[j] = i;
  }
  const at = enclosedFrom(G.nv, eu, ev, crossed), steps = new Int32Array(g.n);
  for (let t = 0; t < g.n; t++) {  // a tile: once all its corners are enclosed (−1: never)
    let s = 0;
    for (let j = 0; j < k && s >= 0; j++) s = at[g.poly[k * t + j]] < 0 ? -1 : Math.max(s, at[g.poly[k * t + j]]);
    steps[t] = s;
  }
  return (areaData = steps);
}

// The step from which each node is enclosed (−1: never), for links eu[e]–ev[e] cut at step crossed[e]
// (−1: never): going back in time with a union–find, from the regions at the end, the links are
// restored from the last cut to the first; restoring one that joins a region to the outside means
// that region was enclosed from the step after it. Each region keeps its nodes as a linked list.
const LOOP_FILL = 2;
// maxSize: regions of more nodes at the end count as outside too, never filled
function enclosedFrom(n, eu, ev, crossed, maxSize = Infinity) {
  const parent = Int32Array.from({ length: n }, (_, i) => i), size = new Int32Array(n).fill(1), out = new Uint8Array(n);
  const head = Int32Array.from({ length: n }, (_, i) => i), tail = Int32Array.from(head), next = new Int32Array(n).fill(-1);
  const at = new Int32Array(n).fill(-1);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (e, step) => {
    let a = find(eu[e]), b = find(ev[e]);
    if (a === b) return;
    if (out[a] !== out[b] && step >= 0) {  // an enclosed region meets the outside
      const inside = out[a] ? b : a;
      for (let m = head[inside]; m >= 0; m = next[m]) at[m] = step + 1;
    }
    if (out[b] && !out[a]) [a, b] = [b, a];
    parent[b] = a; size[a] += size[b]; out[a] |= out[b];
    next[tail[a]] = head[b]; tail[a] = tail[b];
  };
  for (let e = 0; e < eu.length; e++) if (crossed[e] < 0) join(e, -1);  // the regions at the end
  let largest = find(0);
  for (let v = 0; v < n; v++) if (find(v) === v && size[v] > size[largest]) largest = v;
  out[largest] = 1;
  for (let v = 0; v < n; v++) if (find(v) === v && size[v] > maxSize) out[v] = 1;
  const byStep = Array.from(eu, (_, e) => e).filter((e) => crossed[e] >= 0).sort((x, y) => crossed[y] - crossed[x]);
  for (const e of byStep) join(e, crossed[e]);
  return at;
}

// Rainbow along the walk on a surface: the path through the tile centres up to the current step,
// each step in its colour, over the tiles.
const surfaceLineWidth = () => {  // about a fifth of a tile edge on screen
  const sc = walk.shape.corners;
  return Math.max(1, Math.min(walk.R * Math.hypot(sc[0] - sc[3], sc[1] - sc[4], sc[2] - sc[5]) * view.scale * 0.2, 3));
};
// A step is in sight when its tiles face the viewer: both its ends' tiles, or along the grid one of
// the two tiles beside its edge
const stepVisible = (i) => (walk.stepTiles ? tileVisible(walk.stepTiles[2 * i]) || tileVisible(walk.stepTiles[2 * i + 1])
  : facing(i) && facing(i + 1));
// On a flat polyhedron (convex, faces drawn whole): every step in sight
function drawSurfacePath(ctx) {
  const { xs, ys, n } = walk, { scale: s, ox, oy } = view;
  ctx.lineWidth = surfaceLineWidth();
  ctx.lineJoin = ctx.lineCap = 'round';
  let band = -1;
  for (let i = 0; i < cur; i++) {
    const b = Math.floor((i * BANDS) / n);
    if (b !== band) {
      if (band >= 0) ctx.stroke();
      band = b;
      ctx.strokeStyle = GRADIENT[b];
      ctx.beginPath();
    }
    if (!stepVisible(i)) continue;
    ctx.moveTo(ox + xs[i] * s, oy + ys[i] * s);
    ctx.lineTo(ox + xs[i + 1] * s, oy + ys[i + 1] * s);
  }
  if (band >= 0) ctx.stroke();
}
// On a torus or an inflated shape (drawn tile by tile, far to near): each step split in two halves,
// from each tile centre to the middle of the step, listed by tile so that drawShapeTiles draws a
// tile's halves right after the tile, and nearer tiles cover them. A half longer than its tile is
// a jump across the sheet of an unrolled torus: it is left out. Along the grid, a step is an edge:
// drawn whole after each of the two tiles beside it.
function pathHalves() {
  const halves = Array.from({ length: walk.geo.n }, () => []), { tile, wx, wy, wz } = walk;
  const c = walk.shape.corners, k = walk.geo.sides;
  const size = (t) => {  // the first edge of tile t
    const a = 3 * k * t;
    return walk.R * Math.hypot(c[a] - c[a + 3], c[a + 1] - c[a + 4], c[a + 2] - c[a + 5]);
  };
  for (let i = 0; i < cur; i++) {
    const [a, b] = walk.stepTiles ? [walk.stepTiles[2 * i], walk.stepTiles[2 * i + 1]] : [tile[i], tile[i + 1]];
    if (walk.stepTiles) {  // the whole edge, with each of its tiles, drawn from their own corners (see drawHalves)
      halves[a].push(i, i + 1, i + 1, i);
      if (b !== a) halves[b].push(i, i + 1, i + 1, i);
    } else {
      const half = Math.hypot(wx[i + 1] - wx[i], wy[i + 1] - wy[i], wz[i + 1] - wz[i]) / 2;
      if (half > size(a) || half > size(b)) continue;  // across the seam of an unrolled torus
      halves[a].push(i, i + 1);  // from point i towards the middle of step i, on its tile
      halves[b].push(i + 1, i);
    }
  }
  return halves;
}

// Torus tiles: the visible ones sorted from far to near (painter's algorithm), each filled with
// its colour darkened by how much it turns away from the viewer, then outlined if large enough
const shadeCache = new Map();
const colourProbe = document.createElement('canvas').getContext('2d');
const rgbOf = (colour) => {  // [r, g, b] of any CSS colour (the canvas normalises it to #rrggbb)
  colourProbe.fillStyle = colour;
  const hex = colourProbe.fillStyle;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
// colour laid at opacity a over the dark tile background, as an rgb() string (translucent fill)
function faded(colour, a) {
  const [r, g, b] = rgbOf(colour), [R, G, B] = rgbOf('#1f2630');
  return `rgb(${Math.round(R + (r - R) * a)}, ${Math.round(G + (g - G) * a)}, ${Math.round(B + (b - B) * a)})`;
}
function shaded(colour, shade) {  // colour darkened by shade ∈ [0, 1], as an rgb() string
  const key = `${colour}|${shade}`;
  if (!shadeCache.has(key)) {
    const k = 1 - 0.6 * shade, [r, g, b] = rgbOf(colour).map((v) => Math.round(v * k));
    shadeCache.set(key, `rgb(${r}, ${g}, ${b})`);
  }
  return shadeCache.get(key);
}

// Tiles of a shape (torus, or an inflated polyhedron): the visible ones sorted from far to near
// (painter's algorithm: a torus is not convex, so tiles facing us can hide each other), each
// filled with its colour darkened by how much it turns away from the viewer, then outlined
function drawShapeTiles(ctx, sh, k, palette, levelOf, halves = null) {
  const R = walk.R, P = walk.persp, n = walk.geo.n;
  const { scale: s, ox, oy } = view, proj = projector();
  const dir = cam.v;  // towards the viewer
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
    const corners = [];  // on the screen
    for (let q = 0; q < k; q++) {
      const i = 3 * (k * t + q), [x, y] = proj(sh.corners[i] * R, sh.corners[i + 1] * R, sh.corners[i + 2] * R);
      corners.push(ox + x * s, oy + y * s);
      ctx[q ? 'lineTo' : 'moveTo'](ox + x * s, oy + y * s);
    }
    ctx.closePath();
    ctx.fill();
    if (grid) ctx.stroke();
    if (halves && halves[t].length) drawHalves(ctx, halves[t], t, corners);
  }
}
// The halves of steps on one tile (pairs of point indices: from the first towards the middle). A walk
// along the grid draws them from the tile's own corners (on the screen: corners): a corner on the seam
// of an unrolled torus has one position, on one side of the sheet only.
function drawHalves(ctx, list, t, corners) {
  const { n } = walk, { scale: s, ox, oy } = view, k = walk.geo.sides;
  const xs = [], ys = [];  // the points of the steps on this tile
  for (const p of list) {
    if (walk.vert && corners) {
      const q = walk.geo.poly.subarray(k * t, k * t + k).indexOf(walk.vert[p]);
      xs[p] = (corners[2 * q] - ox) / s; ys[p] = (corners[2 * q + 1] - oy) / s;
    } else { xs[p] = walk.xs[p]; ys[p] = walk.ys[p]; }
  }
  ctx.save();
  ctx.lineWidth = surfaceLineWidth();
  ctx.lineCap = 'round';
  for (let j = 0; j < list.length; j += 2) {
    const p = list[j], q = list[j + 1];
    ctx.strokeStyle = GRADIENT[Math.floor((Math.min(p, q) * BANDS) / n)];
    ctx.beginPath();
    ctx.moveTo(ox + xs[p] * s, oy + ys[p] * s);
    ctx.lineTo(ox + (xs[p] + xs[q]) * s / 2, oy + (ys[p] + ys[q]) * s / 2);
    ctx.stroke();
  }
  ctx.restore();
}


/* ---- 11.5 Path, overlay and stats ------------------------------------------------------------ */
// Fill cells: the tile around a point of a 2D walk, as a path on the canvas (world → screen)
function tilePath(ctx, x, y) {
  const { scale: s, ox, oy } = view, X = (u) => ox + u * s, Y = (v) => oy + v * s;
  if (walk.lattice === 'square') { ctx.rect(X(x - 0.5), Y(y - 0.5), s, s); return; }
  let pts;
  if (walk.lattice === 'tri') {  // ▲ has its centre 2/3 down its row, ▼ 1/3 (see triStepper)
    const top = TRI_Y0 + Math.floor((y - TRI_Y0) / H) * H, up = y - top > H / 2;
    pts = up ? [[x, top], [x + 0.5, top + H], [x - 0.5, top + H]] : [[x - 0.5, top], [x + 0.5, top], [x, top + H]];
  } else {  // flat-topped hexagon of radius 1/√3 (see hexStepper)
    pts = [0, 1, 2, 3, 4, 5].map((k) => [x + Math.cos((k * Math.PI) / 3) / Math.sqrt(3), y - Math.sin((k * Math.PI) / 3) / Math.sqrt(3)]);
  }
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
  for (let k = 1; k < pts.length; k++) ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
  ctx.closePath();
}

// Visits: the cell of every point and the most visits of any cell over the whole walk, which fixes
// the log scale once, so a painted cell only changes colour when the walk comes back to it
let visitData = null;  // { cell, max, seen } for the current walk
function visitCells() {
  if (visitData) return visitData;
  const { xs, ys, lattice: lat } = walk, n = walk.n, index = new Map(), cell = new Int32Array(n + 1), total = [];
  for (let i = 0; i <= n; i++) {  // whole-number coordinates of each cell centre, per tiling
    const kx = lat === 'hex' ? Math.round(xs[i] / H) : Math.round(2 * xs[i]);
    const ky = lat === 'tri' ? Math.round(((ys[i] - TRI_Y0) * 3) / H) : Math.round(2 * ys[i]);
    const k = (kx + 33554432) * 67108864 + (ky + 33554432);
    let c = index.get(k);
    if (c === undefined) { c = total.length; index.set(k, c); total.push(0); }
    cell[i] = c;
    total[c]++;
  }
  let max = 1;
  for (const t of total) if (t > max) max = t;
  return (visitData = { cell, max, seen: new Int32Array(total.length) });
}

// Draw segments [from, to): segment i joins point i to point i+1.
function drawSegments(from, to) {
  if (to <= from) return;
  const ctx = layers.path;
  const { xs, ys } = walk;
  const { scale: s, ox, oy } = view;
  const mode = $('colorMode').value;
  // cells: always on a spiral (its line is greyed out), else for Fill cells and Visits
  if (greyed('line') || (mode === 'cells' && shows('cells')) || (mode === 'visits' && useful('visits'))) {
    // the tile of each point: Fill cells and the marks of the point modes in their step's colour,
    // Visits by the visits so far (log scale)
    let colourOf = (p) => styleColor(styleKey(Math.max(0, p - 1)));
    if (mode === 'visits') {
      const V = visitCells(), scale = (BANDS - 1) / Math.log(Math.max(2, V.max));
      if (from === 0) V.seen.fill(0);
      colourOf = (p) => GRADIENT[Math.round(Math.log(++V.seen[V.cell[p]]) * scale)];
    }
    let batch = null;  // one path per run of tiles of the same colour, filled when the colour changes
    const flush = () => { if (batch) { ctx.fillStyle = batch; ctx.fill(); } };
    // a point mode's point 0 is the spiral's centre, not a mark; a spiral's 0 draws nothing
    for (let p = from === 0 && !walk.points ? 0 : from + 1; p <= to; p++) {
      if (walk.skipZeros && p > 0 && walk.digits[p - 1] === 0) continue;
      const c = colourOf(p);
      if (c !== batch) { flush(); ctx.beginPath(); batch = c; }
      tilePath(ctx, xs[p], ys[p]);
    }
    flush();
    return;
  }
  ctx.lineWidth = Math.max(0.6, Math.min(s * 0.3, 6));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let i = from;
  while (i < to) {
    const k = styleKey(i);
    ctx.strokeStyle = styleColor(k);
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

/* ---- Fill areas ------------------------------------------------------------------------------ */
// The regions the path closes off are filled, each at the step that closes it and in the path's
// colour at that step. The regions are read at the vertices of the tiling: two neighbouring
// vertices are separated by the path once the walk has crossed the tile edge between them (the
// step's midpoint is that edge's midpoint, for squares, triangles and hexagons alike). A vertex that
// cannot be reached from outside the path's box without crossing the path is enclosed, and stays
// so: the path only ever adds walls. So each vertex gets, once for the whole walk, the step from
// which it is enclosed; the animation then paints each region when it forms, on a layer of its own
// under the path. A vertex is painted as the polygon of the tile centres around it: those polygons
// tile the plane, so the fill follows the path exactly.
const FILL_MAX_TILES = 1_500_000;  // beyond, the walk is too big to fill
let fill = null;                   // { order, at, polys, tooBig } for the current walk (see computeFill)
let fillDone = 0;                  // how many of fill.order are painted on the fill layer
// Fill areas goes with the colours where the path has one colour per step (not Visits, not By digit)
const fillAreasApply = () => useful('fill') && !['visits', 'digit'].includes($('colorMode').value);
const fillOn = () => $('fillAreas').checked && fillAreasApply() && walk.n && !walk.is3d;

function computeFill() {
  const lat = walk.lattice, { xs, ys } = walk, R = 1 / Math.sqrt(3), last = walk.n;
  // integer keys: every vertex, centre and midpoint of a lattice falls on a finer integer grid
  const q = lat === 'square' ? (x, y) => [Math.round(2 * x), Math.round(2 * y)]
    : lat === 'tri' ? (x, y) => [Math.round(4 * x), Math.round((6 * (y - TRI_Y0)) / H)]
    : (x, y) => [Math.round((6 * x) / H), Math.round(4 * y)];
  const K = (x, y) => { const [a, b] = q(x, y); return (a + 8388608) * 16777216 + (b + 8388608); };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i <= last; i++) {
    minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]);
  }
  const tileArea = lat === 'square' ? 1 : lat === 'tri' ? H / 2 : H;
  if (((maxX - minX + 4) * (maxY - minY + 4)) / tileArea > FILL_MAX_TILES) return { order: [], tooBig: true };
  const crossed = new Map();  // midpoint of each drawn step → the first step through it
  for (let i = 0; i < last; i++) {
    if (walk.skipZeros && walk.digits[i] === 0) continue;  // a spiral's 0 draws nothing
    const k = K((xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
    if (!crossed.has(k)) crossed.set(k, i);
  }
  // the tiles over the bounding box (and a margin), with their corners
  const forTiles = (f) => {
    if (lat === 'square') {
      for (let x = Math.floor(minX) - 1; x <= Math.ceil(maxX) + 1; x++) {
        for (let y = Math.floor(minY) - 1; y <= Math.ceil(maxY) + 1; y++) {
          f(x, y, [[x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x + 0.5, y + 0.5], [x - 0.5, y + 0.5]]);
        }
      }
    } else if (lat === 'tri') {  // cell (c, r): ▲ when c + r is even (see triStepper)
      for (let c = Math.floor(2 * minX) - 2; c <= Math.ceil(2 * maxX) + 2; c++) {
        for (let r = Math.floor((minY - TRI_Y0) / H) - 1; r <= Math.ceil((maxY - TRI_Y0) / H) + 1; r++) {
          const up = ((c + r) & 1) === 0, x = c / 2, top = TRI_Y0 + r * H, bot = top + H;
          f(x, top + (up ? (2 * H) / 3 : H / 3), up ? [[x, top], [x + 0.5, bot], [x - 0.5, bot]] : [[x - 0.5, top], [x + 0.5, top], [x, bot]]);
        }
      }
    } else {  // flat-topped hexagons at (b·H, −a − b/2), radius 1/√3 (see hexStepper)
      for (let b = Math.floor(minX / H) - 1; b <= Math.ceil(maxX / H) + 1; b++) {
        for (let a = Math.floor(-maxY - b / 2) - 1; a <= Math.ceil(-minY - b / 2) + 1; a++) {
          const cx = b * H, cy = -a - b / 2;
          f(cx, cy, [0, 1, 2, 3, 4, 5].map((k) => [cx + R * Math.cos((k * Math.PI) / 3), cy - R * Math.sin((k * Math.PI) / 3)]));
        }
      }
    }
  };
  // the graph of vertices: an edge per tile edge, carrying the step that crossed it (−1: never)
  const index = new Map(), vx = [], vy = [], around = [], eu = [], ev = [], es = [], seen = new Set();
  const vid = (x, y) => {
    const k = K(x, y);
    let i = index.get(k);
    if (i === undefined) { i = vx.length; index.set(k, i); vx.push(x); vy.push(y); around.push([]); }
    return i;
  };
  forTiles((cx, cy, V) => {
    const ids = V.map(([x, y]) => vid(x, y));
    for (const i of ids) around[i].push(cx, cy);
    for (let k = 0; k < ids.length; k++) {
      const a = ids[k], b = ids[(k + 1) % ids.length], e = a < b ? a * 4194304 + b : b * 4194304 + a;
      if (seen.has(e)) continue;
      seen.add(e);
      const [p, r] = [V[k], V[(k + 1) % V.length]];
      eu.push(a); ev.push(b); es.push(crossed.get(K((p[0] + r[0]) / 2, (p[1] + r[1]) / 2)) ?? -1);
    }
  });
  // Back in time with a union–find: start from the whole walk (crossed edges closed), then reopen
  // the edges from the last crossing to the first. When reopening the edge crossed at step s joins
  // a region to the outside, that region was enclosed from step s + 1 on. Each root keeps its
  // members as a linked list (head, tail, next) until it joins the outside.
  const n = vx.length, parent = new Int32Array(n), out = new Uint8Array(n);
  const head = new Int32Array(n), tail = new Int32Array(n), next = new Int32Array(n).fill(-1), at = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    parent[i] = head[i] = tail[i] = i;
    out[i] = vx[i] < minX || vx[i] > maxX || vy[i] < minY || vy[i] > maxY ? 1 : 0;
  }
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (e, step) => {
    let a = find(eu[e]), b = find(ev[e]);
    if (a === b) return;
    if (out[a] !== out[b] && step >= 0) {  // an enclosed region meets the outside
      const inside = out[a] ? b : a;
      for (let m = head[inside]; m >= 0; m = next[m]) at[m] = step + 1;
    }
    if (out[b] && !out[a]) [a, b] = [b, a];
    parent[b] = a;
    out[a] |= out[b];
    next[tail[a]] = head[b];
    tail[a] = tail[b];
  };
  for (let e = 0; e < eu.length; e++) if (es[e] < 0) join(e, -1);
  const byStep = Array.from(eu, (_, e) => e).filter((e) => es[e] >= 0).sort((x, y) => es[y] - es[x]);
  for (const e of byStep) join(e, es[e]);
  // the enclosed vertices in the order they close, each with its polygon
  const order = [];
  for (let i = 0; i < n; i++) if (at[i] >= 0) order.push(i);
  order.sort((x, y) => at[x] - at[y]);
  const polys = order.map((i) => {
    const c = around[i], pts = [];
    for (let k = 0; k < c.length; k += 2) pts.push([c[k], c[k + 1]]);
    pts.sort((u, w) => Math.atan2(u[1] - vy[i], u[0] - vx[i]) - Math.atan2(w[1] - vy[i], w[0] - vx[i]));
    return pts;
  });
  return { order: order.map((i) => at[i]), polys, tooBig: false };  // order[k]: the step closing polygon k
}

// Paint the regions closed by the walk up to step to (from where the fill layer got to), opaque,
// in the path's colour at the step that closed them. Polygons of one colour go 64 to a path: the
// time to fill a path grows faster than its size (all of a colour at once took 21 s for 170,000
// polygons, by 64 under 0.1 s)
const FILL_BATCH = 64;
function drawFill(to) {
  fill ??= computeFill();
  const ctx = layers.fill, { scale: s, ox, oy } = view, { order, polys } = fill;
  const colourAt = (k) => styleColor(styleKey(order[k] - 1));
  while (fillDone < order.length && order[fillDone] <= to) {
    const colour = colourAt(fillDone);
    ctx.beginPath();
    for (let b = 0; b < FILL_BATCH && fillDone < order.length && order[fillDone] <= to && colourAt(fillDone) === colour; b++, fillDone++) {
      const pts = polys[fillDone];
      ctx.moveTo(ox + pts[0][0] * s, oy + pts[0][1] * s);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(ox + pts[k][0] * s, oy + pts[k][1] * s);
      ctx.closePath();
    }
    ctx.fillStyle = colour;
    ctx.fill();
  }
}

function drawOverlay() {
  const ctx = layers.overlay;
  ctx.clearRect(0, 0, cw, ch);
  if (!walk.n || walk.life || startsShown) return;  // no walker in the Game of Life
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
  grid: ['Steps', 'Position', 'Distance', 'Max distance', 'Corners visited'],
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
  STAT_LABELS[walk.life ? 'life' : walk.vert ? 'grid' : 'walk'].forEach((text, i) => { $(`lStat${i}`).textContent = text; });
  $('lifetimeLabel').hidden = $('sLifetime').hidden = !walk.life;
  if (walk.life) {
    const L = walk.life, n = walk.geo.n, pc = (v) => `${fmt(v)} (${((100 * v) / n).toFixed(1)} %)`;
    $('sStep').textContent = fmt(cur);
    $('sPos').textContent = pc(L.aliveCount) + (L.two ? ` · ${fmt(L.aliveCount - L.blueCount)} red, ${fmt(L.blueCount)} blue`
      : L.C > 2 ? ` · ${fmt(L.dyingCount)} dying` : '');
    $('sDist').textContent = fmt(L.born);
    $('sMax').textContent = fmt(L.dead);
    $('sCells').textContent = pc(L.everAlive);
    $('sLifetime').textContent = lifetimeText(L);
    $('sCountsLabel').hidden = $('sCounts').hidden = true;
    $('digitStrip').classList.remove('line');
    $('digitStrip').textContent = `Rule ${L.ruleText} · seeded in base ${L.C} · ${fmt(n)} cells, ` +
      (L.two ? `${fmt(L.seedAlive - L.seedBlue)} red and ${fmt(L.seedBlue)} blue`
        : `${fmt(L.seedAlive)} alive${L.C > 2 ? ` and ${fmt(L.seedDying)} dying` : ''}`) + ' at generation 0';
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
    ? `${fmt(walk.cells[cur])} / ${fmt(walk.nodes)}` +
      (walk.coverStep >= 0 && cur >= walk.coverStep ? ` (all by step ${fmt(walk.coverStep)})`
                                                     : ` (${(100 * walk.cells[cur] / walk.nodes).toFixed(1)} %)`)
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
  // the width of the box it sits in, which keeps its width even while its details are folded away
  const box = el.closest('.stage-box') ?? el.parentElement, bs = getComputedStyle(box);
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
let lastTick = 0, spinTime = 0;
function tick(now = performance.now()) {
  const dt = Math.min(0.1, (now - (lastTick || now)) / 1000);  // seconds since the last frame (capped)
  lastTick = now;
  if (walk.is3d && $('autoRotate').checked) {
    // tumble at a constant 0.25 rad/s around an axis that drifts on the screen: mostly upright,
    // tilting forwards and back and rolling slowly, so every side shows in turn
    spinTime += dt;
    const a = [0.8 * Math.sin(spinTime * 0.11), 1, 0.6 * Math.sin(spinTime * 0.07)], l = Math.hypot(...a);
    rotateView(screenTurn(...a.map((x) => (x / l) * 0.25 * dt)));
  }
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
    if (walk.n && !walk.life && !walk.geo.torus && (startsShown || ($('autoFit').checked && !$('autoRotate').checked))) followWalker();
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
    layers.fill.clearRect(0, 0, cw, ch);
    drawn = 0;
    fillDone = 0;
  }
  if (fillOn()) drawFill(cur);  // each region when it closes, under the path
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
$('digitsDown').addEventListener('click', () => stepDigits(-1));
$('digitsUp').addEventListener('click', () => stepDigits(1));
// A typed count: while editing, the plain number (20000), digits only; compute keeps it within
// 10 … 10 million
// The two edited fields (Custom formula, number of digits): entering one shows the value in use,
// the cursor at its end (the plain number for the digits; formulaInUse is the last valid formula). Enter or ↵
// leaves the field, and leaving it computes; but a wrong formula keeps you in the field, with its
// error. Esc undoes the edit: back to the value in use. For ↵, mousedown keeps the focus from
// going to the button first.
const valueInUse = { formula: () => formulaInUse, digitsLabel: () => String(randomPrimeSize() ?? requestedDigits()), startLabel: () => String(startNo()) };
for (const input of document.querySelectorAll('.field input')) {
  input.addEventListener('focus', () => {
    input.value = valueInUse[input.id]();
    setTimeout(() => input.setSelectionRange(input.value.length, input.value.length));  // after the click places it
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = valueInUse[input.id](); input.blur(); }
    if (e.key !== 'Enter') return;
    const error = input.id === 'formula' && readFormula().error;
    if (error) { e.preventDefault(); $('status').textContent = `Formula: ${error}`; } else input.blur();
  });
}
for (const b of document.querySelectorAll('.field .enter')) {
  b.addEventListener('mousedown', (e) => { e.preventDefault(); b.previousElementSibling.blur(); });
}
$('digitsLabel').addEventListener('input', () => { $('digitsLabel').value = $('digitsLabel').value.replace(/\D/g, ''); });
$('digitsLabel').addEventListener('blur', syncDigitsStepper);  // "20,000 digits" again
$('digitsLabel').addEventListener('change', () => {
  if (!$('digitsLabel').value) return;  // emptied: the blur shows the current count again
  if (randomPrimeSize()) { setPrimeSize(Number($('digitsLabel').value)); return; }
  $('digits').value = $('digitsLabel').value;
  compute(true);
});
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
$('speed').addEventListener('input', updateSpeedLabel);
$('colorMode').addEventListener('change', () => { needsFull = true; renderColorButtons(); updateDisplayMenu(); });
$('fillAreas').addEventListener('change', () => { needsFull = true; updateDisplayMenu(); syncLink(); });
$('fillTranslucent').addEventListener('change', () => { needsFull = true; updateDisplayMenu(); });
$('fillCells').addEventListener('change', () => { needsFull = true; });
$('showGrid').addEventListener('change', () => { needsFull = true; });
$('autoFit').addEventListener('change', () => { if ($('autoFit').checked) fitNow(); });
$('autoRotate').addEventListener('change', () => { if ($('autoRotate').checked) fitNow(); });  // turning starts framed

function fitNow() {
  $('autoFit').checked = true;
  fitWhole();
}

stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const k = Math.exp(-e.deltaY * 0.0015);
  const s = Math.min(200, Math.max(MIN_SCALE, view.scale * k));
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
    userMovedView();  // a hand rotation ends auto-fit, as a pan or a zoom does, and auto-rotate
    $('autoRotate').checked = false;
    rotateView(screenTurn(dy * 0.008, dx * 0.008, 0));  // a trackball: drag right turns around the screen's up
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

// The prime menus, each prime with its number of digits (in base 10, as prime sizes are given)
for (const p of MERSENNE) $('mersenneP').add(new Option(`M${SUB(p)} · ${fmt(Math.floor(p * Math.log10(2)) + 1)} digits`, p));
$('mersenneP').value = 44497;
// primorial primes by size, + 1 and − 1 together
const primorials = [...PRIMORIAL_PLUS.map((p) => [p, 1]), ...PRIMORIAL_MINUS.map((p) => [p, -1])]
  .sort((a, b) => PRIMORIAL_DIGITS[a[0]] - PRIMORIAL_DIGITS[b[0]]);
for (const [low, top, label] of [[0, 1e3, 'up to 1,000 digits'], [1e3, 1e4, '1,000 to 10,000 digits'],
    [1e4, 1e5, '10,000 to 100,000 digits'], [1e5, 1e6, '100,000 to 1,000,000 digits'], [1e6, Infinity, 'over 1,000,000 digits']]) {
  const group = document.createElement('optgroup');
  group.label = label;
  for (const [p, sign] of primorials.filter(([q]) => PRIMORIAL_DIGITS[q] > low && PRIMORIAL_DIGITS[q] <= top)) {
    group.append(new Option(`${fmt(p)}# ${sign > 0 ? '+' : '−'} 1 · ${fmt(PRIMORIAL_DIGITS[p])} digits`, `${p},${sign}`));
  }
  $('primorialP').append(group);
}
$('primorialP').value = '392113,1';
// A menu choice, or a new value in its helper menu, writes its formula
const pickPreset = (id) => { $('formula').value = presetFormula(id); computeFramed(); };
$('mersenneP').addEventListener('change', () => pickPreset('mersenne'));
$('primorialP').addEventListener('change', () => pickPreset('primorial'));
$('sky').addEventListener('change', () => { needsFull = true; renderSkyButtons(); });
renderSkyButtons();
// the animation bar sits over the view: its clicks, drags (the speed slider) and wheel are its own
for (const type of ['pointerdown', 'dblclick', 'wheel']) {
  $('animBar').addEventListener(type, (e) => e.stopPropagation());
  $('viewTools').addEventListener(type, (e) => e.stopPropagation());  // Inflate and the Display menu too
}
$('perspective').addEventListener('change', () => {
  setPerspective();
  project();
  if (walk.sphere) needsFull = true;
  else rotateView([0, 0, 0]);  // recompute the 2D bounds of the projected walk
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
  if (!parseRule($('lifeRule').value)) { $('status').textContent = 'Enter a rule like B3/S23, B2/S/C3 (2 to 10 states), B3/S23/Immigration or, on hexagons, B2o/S2m34'; return; }
  if (MODES[$('mode').value].life) compute();  // restart from generation 0; a new state count needs a new base
});
$('copyNumber').addEventListener('click', async () => {
  const say = (text) => { $('copyNumber').innerHTML = `${icon('copy')} ${text}`; };
  try { await navigator.clipboard.writeText(numberText()); say('Copied'); } catch { say('Not allowed'); }
  setTimeout(() => say('Copy number to clipboard'), 1500);
});
// Hovering the button shows what it copies over the view (the start of it: as much as fits)
$('copyNumber').addEventListener('mouseenter', () => { $('numberPreview').textContent = numberText(20000); $('numberPreview').hidden = false; });
$('copyNumber').addEventListener('mouseleave', () => { $('numberPreview').hidden = true; });
// The start selector (hexagon sphere): − / + or a number typed, then Enter. Hovering its field
// (not − / +) shows every start on an empty globe, turned towards the chosen one.
function setStart(n) {
  $('startNo').value = Math.max(1, Math.min(n, modeStarts().length));
  syncSizeStepper();
  if (!current) return;
  if (digitsBeforeLoop !== null) { compute(); return; }  // the count asked before a loop cut it
  buildWalk();
  describe(walk.base);
  showAll();
}
$('startDown').addEventListener('click', () => setStart(startNo() - 1));
$('startUp').addEventListener('click', () => setStart(startNo() + 1));
$('startLabel').addEventListener('input', () => { $('startLabel').value = $('startLabel').value.replace(/\D/g, ''); });
$('startLabel').addEventListener('blur', syncSizeStepper);  // "start 1 of 2,304" again
$('startLabel').addEventListener('change', () => { if ($('startLabel').value) setStart(Number($('startLabel').value)); });
const startField = $('startLabel').parentElement;
startField.addEventListener('mouseenter', () => { startsShown = true; needsFull = true; });
startField.addEventListener('mouseleave', () => { startsShown = false; needsFull = true; });
$('sizeDown').addEventListener('click', () => stepSize(-1));
$('loopDown').addEventListener('click', () => browseLoop(-1));
$('loopUp').addEventListener('click', () => browseLoop(1));
$('sizeUp').addEventListener('click', () => stepSize(1));
$('sphereF').addEventListener('change', () => {
  syncSizeStepper();
  if (MODES[$('mode').value].life) { compute(); return; }  // one digit per cell: maybe more digits
  if (!current) return;
  if (digitsBeforeLoop !== null) { compute(); return; }  // the count asked before a loop cut it
  buildWalk();
  describe(walk.base);
  showAll();
});
// A formula left wrong (by clicking elsewhere) is undone: the one in use comes back
$('formula').addEventListener('change', () => {
  const { error } = readFormula();
  if (!error) { computeFramed(); return; }
  $('formula').value = formulaInUse;
  $('status').textContent = `Formula: ${error} · ${formulaInUse} kept`;
});
// A new number (or a new prime, size or fraction) starts framed
function computeFramed() {
  $('autoFit').checked = true;
  compute();
}
// Another mode in the same tab keeps the Display settings; another tab starts from its defaults
let displayTab = null;
const modeTabOf = () => $('mode').selectedOptions[0].parentElement.label;
function displayDefaults() {
  const mode = MODES[$('mode').value], surface = mode.lattice === 'sphere';
  $('colorMode').value = mode.life ? 'mono' : 'gradient';  // simplest view by default
  $('autoFit').checked = true;  // framed
  $('fillAreas').checked = true;
  $('fillCells').checked = surface;  // a surface walk shows its tiles filled
  $('fillTranslucent').checked = !surface;  // translucent areas in 2D, solid ones on a surface
  $('showGrid').checked = true;
  $('autoRotate').checked = false;
  $('sky').value = 'twilight';
  renderSkyButtons();
  displayTab = modeTabOf();
}
// Digits of a walk by default, per tab (20,000 elsewhere): on a surface, fewer digits already cover it
const TAB_DIGITS = { 'Walks on surface cells': 10000, 'Walks on surface grids': 10000 };
$('mode').addEventListener('change', () => {
  if (modeTabOf() !== displayTab) {
    $('digits').value = TAB_DIGITS[modeTabOf()] ?? 20000;
    displayDefaults();
  }
  // the form of the view belongs to the walk mode: its perspective, the camera's starting angle
  // (auto-fit may have turned it to follow a walker) and its flat or round form (see initShape)
  // come back with every new mode
  $('perspective').checked = !!MODES[$('mode').value].perspective;
  Object.assign(cam, CAM0);
  $('startNo').value = 1;
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
for (const b of document.querySelectorAll('[data-icon]')) b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon));
play(false);  // the Play button with its icon
fillSetupList();
const linked = parseHash();  // a link with a setup opens that setup; otherwise the default one
if (!linked || !applySetup(linked)) compute();
setInterval(syncLink, 700);  // keep the link up to date with the setup

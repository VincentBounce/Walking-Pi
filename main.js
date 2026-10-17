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
const VERSION = '0.1.688';

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
      for (let i = 0; i < n; i++) { const c = s.charCodeAt(intPart.length + i); digits[i] = base < 64 && c >= 97 ? c - 87 : c - 48; }  // past base 10: a, b, c…
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
// The walk's colours, per theme (see applyTheme): the rainbow darker on a light page, the digits'
// grey instead of white, the one colour a deeper amber
const PALETTES = {
  // unlit: the surfaces' tiles not walked; trail: a Life cell just dead, fading to unlit; alive: Life in one colour
  // directions: each step's colour by where it goes (its arrow), the same in every walk: left blue, straight
  // on (north) gold, right pink, back (south) turquoise, then the diagonals (↖ green, ↗ magenta, ↘ orange,
  // ↙ violet: the opposite turns far apart) and up, down;
  // digits: for the walks whose digits are no direction, in the same colours; grey: a spiral's 0
  dark: { light: 60, digits: ['#4f7bff', '#f0609f', '#f2b630', '#2fbdb7', '#9270f5', '#7fc244', '#f28042', '#d466f0'], grey: '#e6edf3', mono: '#f0b429',
          directions: { '←': '#4f7bff', '↑': '#f2b630', '→': '#f0609f', '↓': '#2fbdb7', '↖': '#7fc244', '↗': '#d466f0', '↘': '#f28042', '↙': '#9270f5', '⊙': '#f06b6b', '⊗': '#45c8f0' },
          unlit: '#1f2630', trail: '#6b7f99', fade: '#c98f1f', alive: '#e6edf3', edge: 'rgba(255, 255, 255, 0.25)', edgeRgb: [255, 255, 255], edgeAlpha: 0.25, shade: 0.6, fadeEdges: true },
  light: { light: 48, digits: ['#2f5bea', '#e8438a', '#e0a100', '#13a8a2', '#7c4dff', '#5fa82a', '#f0702a', '#c03fe0'], grey: '#6e7781', mono: '#bf8700',
           directions: { '←': '#2f5bea', '↑': '#e0a100', '→': '#e8438a', '↓': '#13a8a2', '↖': '#5fa82a', '↗': '#c03fe0', '↘': '#f0702a', '↙': '#7c4dff', '⊙': '#e5484d', '⊗': '#1aa3d6' },
           unlit: '#eef1f5', trail: '#7d8896', fade: '#c98a10', alive: '#1f2328', edge: 'rgba(0, 0, 0, 0.11)', edgeRgb: [0, 0, 0], edgeAlpha: 0.11, shade: 0.18, fadeEdges: true, tileLift: 0.22 },
};
const GRADIENT = [], DIGIT_COLORS = [], LIFE_TRAIL = [], LIFE_FADE = [], DIRECTION_COLOURS = {};
// Life's colours (civilisations), as bright as the walks' rainbow in each theme (its saturation and
// lightness), in an order that keeps them apart: up to 8, about 45° of hue between any two (red, blue,
// gold, green, violet, cyan, magenta, lime); the 12 bring close ones (orange, pink, indigo, teal), in the
// order that keeps the fewest close ones side by side in all the ways 12 are laid: in turn round a Möbius
// strip, 6 × 2 round a torus (the last pair next to the first), 3 × 4 on a square torus, 4 × 3 on the plane
const LIFE_HUES = [2, 222, 48, 135, 275, 185, 318, 90, 25, 340, 245, 160], LIFE_COLOURS = [];
let GREY;
let MONO, UNLIT, LIFE_ALIVE, EDGE, EDGE_RGB, EDGE_ALPHA, SHADE, FADE_EDGES, TILE_LIFT;  // TILE_LIFT: the tiles' rainbow mixed with white  // EDGE: the surfaces' tile edges; SHADE: how dark a tile turned away gets
function setPalette(theme) {
  const P = PALETTES[theme];
  // the surfaces' tile edges light on a dark page, dark on a light one, as the 2D grid
  UNLIT = P.unlit; LIFE_ALIVE = P.alive; EDGE = P.edge; EDGE_RGB = P.edgeRgb; EDGE_ALPHA = P.edgeAlpha;
  SHADE = P.shade; FADE_EDGES = !!P.fadeEdges; TILE_LIFT = P.tileLift ?? 0;
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), [a, b] = [hex(P.trail), hex(P.unlit)];
  // the 8 shades of a dying Life cell (a Generations rule's stages), from the trail colour to unlit; and of
  // its trail once dead (Trail), in Amber (as an ant's cells, each theme its own), not to be taken for a state
  const ink = hex(P.fade);
  for (let i = 0; i < 8; i++) {
    const f = 1 - i / 8, mix = (k) => Math.round(b[k] + (a[k] - b[k]) * f), inked = (k) => Math.round(b[k] + (ink[k] - b[k]) * f);
    LIFE_TRAIL[i] = `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
    LIFE_FADE[i] = `rgb(${inked(0)}, ${inked(1)}, ${inked(2)})`;
  }
  for (let i = 0; i < BANDS; i++) GRADIENT[i] = `hsl(${190 + (200 * i) / (BANDS - 1)}, 85%, ${P.light}%)`;
  LIFE_HUES.forEach((h, k) => { LIFE_COLOURS[k] = `hsl(${h}, 85%, ${PALETTES.light.light}%)`; });  // the light page's, on a dark one too (to compare)
  DIGIT_COLORS.splice(0, DIGIT_COLORS.length, ...P.digits);
  Object.assign(DIRECTION_COLOURS, P.directions);
  GREY = P.grey;
  MONO = P.mono;
}
setPalette(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');


/* ---- 2.2 Number cards ------------------------------------------------------------------------ */
// The formula is the single source of truth: a card only writes one, and lights up again when the
// formula matches it (presetOf, Part 4). Nothing else remembers which card was clicked.
// The Number cards, in groups: each card writes a formula (see Number formulas). Cards with a helper
// menu (Mersenne, primorial, random prime) or a random seed build it when picked. A card is a
// small tile showing the symbol; its name and formula (detail, when the formula is built) are
// in its tooltip, and the Formula field shows what it wrote.
const NUMBER_GROUPS = ['Constants', '𝑓', 'Fractions', 'Primes', 'Sequences'];
const PRESETS = {
  pi:      { group: 'Constants', sym: 'π',    name: 'Pi', f: 'pi' },
  e:       { group: 'Constants', sym: 'e',    name: "Euler's number", detail: 'e = exp(1)', f: 'e' },
  phi:     { group: 'Constants', sym: 'φ',    name: 'Golden ratio', f: 'phi' },
  gamma:   { group: 'Constants', sym: 'γ',    name: 'Euler–Mascheroni constant', f: 'gamma' },
  catalan: { group: 'Constants', sym: 'G',    name: "Catalan's constant", f: 'catalan' },
  erdos:   { group: 'Constants', sym: 'E',    name: 'Erdős–Borwein constant', f: 'erdos' },
  thuemorse: { group: 'Constants', sym: 'τ',  name: 'Prouhet–Thue–Morse constant', detail: 'thuemorse · 0.0110100110010110…₂, digit k the parity of the 1s of k in base 2', f: 'thuemorse' },
  rabbit:  { group: 'Constants', sym: 'F',    name: 'Rabbit constant', detail: 'rabbit · 0.1011010110110…₂, the Fibonacci word (1 → 10, 0 → 1)', f: 'rabbit' },
  sqrt2:   { group: '𝑓', sym: '√2', name: 'Square root of 2', f: 'sqrt(2)' },
  cbrt2:   { group: '𝑓', sym: '∛2', name: 'Cube root of 2', f: 'cbrt(2)' },
  pi2:     { group: '𝑓', sym: 'π²', name: 'Pi squared', f: 'pi^2' },
  epi:     { group: '𝑓', sym: 'e^π',  name: "Gelfond's constant", detail: 'e^pi = exp(pi)', f: 'e^pi' },
  ln2:     { group: '𝑓', sym: 'ln 2', name: 'Natural log of 2', f: 'ln(2)' },
  zeta3:   { group: '𝑓', sym: 'ζ(3)', name: "Apéry's constant", f: 'zeta(3)' },
  frac16_9: { group: '𝑓', sym: '16/9', name: 'Sixteen ninths', f: '16/9' },
  basel:   { group: '𝑓', sym: '6/π²', name: 'Probability that two whole numbers are coprime', detail: '6/pi^2 = 1/ζ(2)', f: '6/pi^2' },
  // Fractions: their digits repeat, and on a walk that turns relative to its heading, a round of
  // them that turns by a whole fraction of a turn closes into a rosette (k rounds for a k-fold one).
  // Picked among the fractions up to /999 for big rosettes drawn with few overlaps, four per walk
  rose1_923: { group: 'Fractions', sym: '1/923', name: 'A 4-fold rosette on Squares turtle', detail: '1/923 in base 3', f: '1/923' },
  rose2_541: { group: 'Fractions', sym: '2/541', name: 'A 4-fold rosette on Squares turtle', detail: '2/541 in base 3', f: '2/541' },
  rose1_709: { group: 'Fractions', sym: '1/709', name: 'A 4-fold rosette on Squares turtle', detail: '1/709 in base 3', f: '1/709' },
  rose1_983: { group: 'Fractions', sym: '1/983', name: 'A 4-fold rosette on Squares turtle', detail: '1/983 in base 3', f: '1/983' },
  rose1_383: { group: 'Fractions', sym: '1/383', name: 'A 6-fold rosette on Hexagons turtle', detail: '1/383 in base 2', f: '1/383' },
  rose3_497: { group: 'Fractions', sym: '3/497', name: 'A 6-fold rosette on Hexagons turtle', detail: '3/497 in base 2', f: '3/497' },
  rose1_463: { group: 'Fractions', sym: '1/463', name: 'A 6-fold rosette on Hexagons turtle', detail: '1/463 in base 2', f: '1/463' },
  rose1_967: { group: 'Fractions', sym: '1/967', name: 'A 6-fold rosette on Hexagons turtle', detail: '1/967 in base 2', f: '1/967' },
  rose11_604: { group: 'Fractions', sym: '11/604', name: 'A 6-fold rosette on Triangles turtle', detail: '11/604 in base 5', f: '11/604' },
  rose1_599: { group: 'Fractions', sym: '1/599', name: 'A 3-fold rosette on Triangles turtle', detail: '1/599 in base 5', f: '1/599' },
  rose1_856: { group: 'Fractions', sym: '1/856', name: 'A 6-fold rosette on Triangles turtle', detail: '1/856 in base 5', f: '1/856' },
  rose21_976: { group: 'Fractions', sym: '21/976', name: 'A 6-fold rosette on Triangles turtle', detail: '21/976 in base 5', f: '21/976' },
  // and for an ant by the digits, late highways (searched up to /1000 on squares, /255 on Cairo
  // pentagons, 3 million steps), the 1/xx last
  ant1_429: { group: 'Fractions', sym: '1/429', name: 'A highway from step 2,779,332 for the square ant by the digits', detail: '1/429 in base 2', f: '1/429' },
  ant1_917: { group: 'Fractions', sym: '1/917', name: 'A highway from step 2,126,365 for the square ant by the digits', detail: '1/917 in base 2', f: '1/917' },
  ant1_112: { group: 'Fractions', sym: '1/112', name: 'A highway from step 2,051,674 for the square ant by the digits', detail: '1/112 in base 2', f: '1/112' },
  ant1_189: { group: 'Fractions', sym: '1/189', name: 'A highway from step 1,642,864 for the Cairo ant by the digits', detail: '1/189 in base 2', f: '1/189' },
  ant1_28: { group: 'Fractions', sym: '1/28', name: 'A highway from step 1,909,973 for the square ant by the digits', detail: '1/28 in base 2', f: '1/28' },
  ant1_90: { group: 'Fractions', sym: '1/90', name: 'A highway from step 2,350,822 for the Cairo ant by the digits', detail: '1/90 in base 2', f: '1/90' },
  ant1_94: { group: 'Fractions', sym: '1/94', name: 'A highway from step 2,275,153 for the Cairo ant by the digits', detail: '1/94 in base 2', f: '1/94' },
  ant1_47: { group: 'Fractions', sym: '1/47', name: 'A highway from step 1,123,492 for the Cairo ant by the digits', detail: '1/47 in base 2', f: '1/47' },
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
  rudinshapiro: { group: 'Sequences', sym: 'RS', name: 'Rudin–Shapiro', detail: 'rudinshapiro · digit k: the parity of the blocks “11” in k written in base 2', f: 'rudinshapiro' },
  kolakoski: { group: 'Sequences', sym: 'K', name: 'Kolakoski', detail: 'kolakoski · 1 2 2 1 1 2 1 2 2 …, its own run lengths, as 0s and 1s', f: 'kolakoski' },
};
const presetFormula = (id) => (typeof PRESETS[id].f === 'function' ? PRESETS[id].f() : PRESETS[id].f);

// What the sequences and ρ₂ mean, for the status line
const FORMULA_NOTES = {
  primes: (b) => `digit k = 0 if k is not prime, else k mod ${b} (1 for k = ${b})`,
  rho: (b) => `ρ = Σ 2^(−p) = 0.0110101000101…₂, the binary barcode read as one number, written in base ${b}`,
  primegaps: (b) => `one digit per gap between odd primes: (gap / 2) mod ${b}`,
  thuemorse: () => 'the Thue–Morse sequence (0 and 1): digit k is the parity of the 1s of k in base 2',
  rudinshapiro: () => 'the Rudin–Shapiro sequence (0 and 1): digit k is the parity of the blocks 11 in k written in base 2',
  kolakoski: () => 'the Kolakoski sequence, its 1s as 0 and its 2s as 1: read as runs, 1 2 2 1 1 2 … gives its own run lengths',
  rabbit: () => 'the Fibonacci word (0 and 1): 1 becomes 10 and 0 becomes 1, again and again',
  dragon: () => 'the folds of a strip folded in two again and again (0 and 1): the dragon curve, as turns',
};

/* ---- 2.3 Walk modes -------------------------------------------------------------------------- */
// base: the base the digits are written in; arrows: each digit's step as the walker sees it, heading
// up (⊙ up toward you, ⊗ down; a spiral's □ moved, ■ drawn), shown above the digits (none where a digit is not a turn); lattice: how a step is taken ('square', 'tri', 'hex',
// 'cube' or 'sphere' for a tiled surface); life: a Game of Life instead of a walk. The (hidden)
// mode menu in index.html lists them, grouped as the tabs of the Walk section.
// The 2D walks go along the lines of a grid, or from cell to cell (cells: true), twin: the other
// way round. Along lines, the walk goes from corner to corner, and the corners of a grid are the
// cell centres of another: of squares for squares, of hexagons for triangles, of triangles for
// hexagons. So a walk along triangles takes the steps of hexagon cells, and one along hexagons
// those of triangle cells; only the grid drawn changes (lines: true). Their colours are the Display
// toggles Walk on cells, Heatmap of visits and Digits instead of a list (see relabelColours).
/* More 2D tilings (tools/tilings/build.js builds and checks them): Archimedean ones from a lattice and its points, their
 * Laves duals (one shape each, from each vertex's faces), the Pythagorean and Capital I tilings from squares. Each: a
 * lattice (basis: two vectors) and the polygons of one cell of it, in the lattice's units ((u, v): u·a + v·b); its
 * cells a row: those polygons, cell after cell (x = m·i + k: polygon k of lattice cell i), as the kites; neighbours by a
 * shared corner (their corners include every point a neighbour's corner can be on); most: the most neighbours a cell has */
const TILINGS = {
  rhombille: { name: 'Rhombille', mark: '◇', cells: 'rhombi', where: 'a grid of rhombi, 3 a hexagon (the rhombille tiling)', most: 10,
    basis: [[2, 0], [1, 1.7320508075688772]],
    polys: [[[0.666667,-0.333333],[1,0],[0.333333,0.333333],[0,0]],[[0,0],[0.333333,0.333333],[0,1],[-0.333333,0.666667]],[[0.333333,0.333333],[1,0],[0.666667,0.666667],[0,1]]] },
  rhombitri: { name: 'Rhombitri', mark: '✳', cells: 'tiles', where: 'a grid of hexagons, squares and triangles (the rhombitrihexagonal tiling)', most: 12,
    basis: [[2.366025403784439, 1.3660254037844384], [1.6728986382985834e-16, 2.732050807568877]],
    polys: [[[0.42265,-0.211325],[0.788675,-0.211325],[0.57735,0.211325],[0.211325,0.211325]],[[0.42265,-0.211325],[0.211325,0.211325],[-0.211325,0.42265],[-0.42265,0.211325],[-0.211325,-0.211325],[0.211325,-0.42265]],[[0.211325,0.211325],[0.57735,0.211325],[0.211325,0.57735]],[[0.211325,0.211325],[0.211325,0.57735],[-0.211325,0.788675],[-0.211325,0.42265]],[[0.42265,0.788675],[0.211325,0.57735],[0.57735,0.211325],[0.788675,0.42265]],[[0.42265,0.788675],[0.788675,0.42265],[0.788675,0.788675]]] },
  floret: { name: 'Florets', mark: '✿', cells: 'pentagons', where: 'a grid of floret pentagons, 6 round each flower', most: 8,
    basis: [[2.5, 0.8660254037844386], [0.5, 2.598076211353316]],
    polys: [[[0,0],[0.380952,0.095238],[0.333333,0.333333],[0.095238,0.52381],[-0.095238,0.47619]],[[0,1],[0.47619,0.619048],[0.666667,0.666667],[0.619048,0.904762],[0.380952,1.095238]],[[0.095238,0.52381],[0.333333,0.333333],[0.52381,0.380952],[0.47619,0.619048],[0,1]],[[0.52381,0.380952],[1,0],[0.904762,0.47619],[0.666667,0.666667],[0.47619,0.619048]],[[0.380952,0.095238],[0.619048,-0.095238],[1,0],[0.52381,0.380952],[0.333333,0.333333]],[[0.666667,0.666667],[0.904762,0.47619],[1.095238,0.52381],[1,1],[0.619048,0.904762]]] },
  snubtri: { name: 'Snub', mark: '✶', cells: 'tiles', where: 'a grid of hexagons and triangles (the snub trihexagonal tiling)', most: 18,
    basis: [[2.5, 0.8660254037844386], [0.5, 2.598076211353316]],
    polys: [[[0.428571,-0.142857],[0.571429,0.142857],[0.142857,0.285714]],[[0.428571,-0.142857],[0.142857,0.285714],[-0.285714,0.428571],[-0.428571,0.142857],[-0.142857,-0.285714],[0.285714,-0.428571]],[[0.142857,0.285714],[0.571429,0.142857],[0.285714,0.571429]],[[0.142857,0.285714],[0.285714,0.571429],[-0.142857,0.714286]],[[0.428571,0.857143],[0.285714,0.571429],[0.714286,0.428571]],[[0.428571,0.857143],[0.714286,0.428571],[0.857143,0.714286]],[[0.428571,0.857143],[0.857143,0.714286],[0.571429,1.142857]],[[0.285714,0.571429],[0.571429,0.142857],[0.714286,0.428571]],[[1.142857,0.285714],[0.857143,0.714286],[0.714286,0.428571]]] },
  capitalI: { name: 'Capital I', mark: '⌶', cells: 'I tiles', where: 'a grid of capital I tiles (7 squares each)', most: 6,
    basis: [[2, 1], [-1, 3]],
    polys: [[[0,0],[0.428571,-0.142857],[0.857143,-0.285714],[1.285714,-0.428571],[1.428571,-0.142857],[1,0],[1.142857,0.285714],[1.571429,0.142857],[1.714286,0.428571],[1.285714,0.571429],[0.857143,0.714286],[0.428571,0.857143],[0.285714,0.571429],[0.714286,0.428571],[0.571429,0.142857],[0.142857,0.285714]]] },
  pythagorean: { name: 'Pythagoras', mark: '◰', cells: 'squares', where: 'a grid of squares of two sizes (the Pythagorean tiling)', most: 8,
    basis: [[2, 1], [-1, 2]],
    polys: [[[0,0],[0.4,-0.2],[0.8,-0.4],[1,0],[1.2,0.4],[0.8,0.6],[0.4,0.8],[0.2,0.4]],[[-0.2,0.6],[0.2,0.4],[0.4,0.8],[0,1]]] },
  prismatic: { name: 'Prismatic', mark: '⌂', cells: 'pentagons', where: 'a grid of prismatic pentagons (houses in rows)', most: 7,
    basis: [[1, 0], [0.5, 1.8660254037844386]],
    polys: [[[-0.42265,0.845299],[0.154701,0.690599],[0.57735,0.845299],[0.366025,1.267949],[-0.633975,1.267949]],[[0.366025,0.267949],[1.366025,0.267949],[1.154701,0.690599],[0.57735,0.845299],[0.154701,0.690599]]] },
  tetrakis: { name: 'Tetrakis', mark: '◩', cells: 'triangles', where: 'a grid of triangles, 4 a square (the tetrakis tiling)', most: 14,
    basis: [[2.414213562373095, 0], [0, 2.414213562373095]],
    polys: [[[0,0],[0.5,0.5],[0,1]],[[0,0],[1,0],[0.5,0.5]],[[0.5,0.5],[1,1],[0,1]],[[1,0],[1,1],[0.5,0.5]]] },
  kisrhombille: { name: 'Kisrhombille', mark: '◬', cells: 'triangles', where: 'a grid of triangles, 12 a hexagon (the kisrhombille tiling)', most: 16,
    basis: [[4.732050807568877, 0], [2.366025403784439, 4.098076211353315]],
    polys: [[[0,0],[0.5,0],[0.333333,0.333333]],[[0,0],[0.333333,0.333333],[0,0.5]],[[0,0.5],[0.333333,0.333333],[0,1]],[[0.333333,0.333333],[0.5,0.5],[0,1]],[[0.5,0.5],[0.666667,0.666667],[0,1]],[[0.666667,0.666667],[0.5,1],[0,1]],[[1,0],[1,0.5],[0.666667,0.666667]],[[1,0],[0.666667,0.666667],[0.5,0.5]],[[0.333333,0.333333],[1,0],[0.5,0.5]],[[0.5,0],[1,0],[0.333333,0.333333]],[[0.666667,0.666667],[1,1],[0.5,1]],[[1,0.5],[1,1],[0.666667,0.666667]]] },
};
const tilingAt = (kind, x, y) => { const P = TILINGS[kind].polys, m = P.length, i = Math.floor(x / m); return P[((x % m) + m) % m].map(([u, v]) => [u + i, v + y]); };  // lattice units
const tilingWorld = (kind, [u, v]) => { const [a, b] = TILINGS[kind].basis; return [u * a[0] + v * b[0], u * a[1] + v * b[1]]; };

const MODES = {
  turtle:   { base: 3, arrows: '←↑→', lattice: 'square', lines: true, twin: 'turtleCells', ant: 'antSquare',
              rule: 'along the lines of a square grid: <b>0</b> turn left + step, <b>1</b> step forward, <b>2</b> turn right + step' },
  cardinal: { base: 4, arrows: '↑→↓←', lattice: 'square', lines: true, twin: 'cardinalCells',
              rule: 'along the lines of a square grid: <b>0</b> north, <b>1</b> east, <b>2</b> south, <b>3</b> west' },
  triTurtle: { base: 5, arrows: '↙↖↑↗↘', lattice: 'hex', lines: true, twin: 'triTurtleCells', ant: 'antTri',
              rule: 'along the lines of a triangle grid, relative to where you come from: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  triFixed: { base: 6, arrows: '↑↗↘↓↙↖', lattice: 'hex', lines: true, twin: 'triFixedCells',
              rule: 'along the lines of a triangle grid: <b>0</b> N, <b>1</b> NE, <b>2</b> SE, <b>3</b> S, <b>4</b> SW, <b>5</b> NW' },
  hexTurtle: { base: 2, arrows: '↖↗', lattice: 'tri', lines: true, twin: 'hexTurtleCells', ant: 'antHex',
              rule: 'along the lines of a hexagon grid: <b>0</b> turn left, <b>1</b> turn right' },
  hexFixed: { base: 3, lattice: 'tri', lines: true, twin: 'hexFixedCells',
              rule: 'along the lines of a hexagon grid: take the <b>0</b> “|”, <b>1</b> “\\” or <b>2</b> “/” edge' },
  turtleCells: { base: 3, arrows: '←↑→', lattice: 'square', cells: true, twin: 'turtle',
              rule: 'from cell to cell of a square grid: <b>0</b> turn left + step, <b>1</b> step forward, <b>2</b> turn right + step' },
  cardinalCells: { base: 4, arrows: '↑→↓←', lattice: 'square', cells: true, twin: 'cardinal',
              rule: 'from cell to cell of a square grid: <b>0</b> north, <b>1</b> east, <b>2</b> south, <b>3</b> west' },
  triTurtleCells: { base: 2, arrows: '↖↗', lattice: 'tri', cells: true, twin: 'triTurtle',
              rule: 'from cell to cell of a triangle grid: exit through the <b>0</b> left or <b>1</b> right edge' },
  triFixedCells: { base: 3, lattice: 'tri', cells: true, twin: 'triFixed',
              rule: 'from cell to cell of a triangle grid: cross the <b>0</b> horizontal, <b>1</b> “/” or <b>2</b> “\\” edge' },
  hexTurtleCells: { base: 5, arrows: '↙↖↑↗↘', lattice: 'hex', cells: true, twin: 'hexTurtle',
              rule: 'from cell to cell of a hexagon grid, relative to the edge you came in through: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  hexFixedCells: { base: 6, arrows: '↑↗↘↓↙↖', lattice: 'hex', cells: true, twin: 'hexFixed',
              rule: 'from cell to cell of a hexagon grid: <b>0</b> N, <b>1</b> NE, <b>2</b> SE, <b>3</b> S, <b>4</b> SW, <b>5</b> NW' },
  // on cells only: steps that do not cross a single edge (no Fill areas, see fillAreasApply)
  king: { base: 8, arrows: '↑↗→↘↓↙←↖', lattice: 'square', cells: true, fill: false,
          rule: 'from square to square as a chess king, to one of the 8 around: <b>0</b> N, <b>1</b> NE, <b>2</b> E, <b>3</b> SE, <b>4</b> S, <b>5</b> SW, <b>6</b> W, <b>7</b> NW' },
  cairo: { base: 4, arrows: '↙↖↗↘', lattice: 'cairo', cells: true, fill: false, ant: 'antCairo',
           rule: 'from pentagon to pentagon of the Cairo tiling, out through one of its 4 other edges: <b>0</b> sharp left, <b>1</b> left, <b>2</b> right, <b>3</b> sharp right' },
  // Langton's ant on the cells of a turtle walk (antOf: its walk in the list; see ANTS), its rule in the
  // ant settings (see antRuleText)
  antSquare: { get base() { return antBase('antSquare'); }, lattice: 'square', cells: true, fill: false, antOf: 'turtle', get rule() { return antRuleText('antSquare'); } },
  antTri: { get base() { return antBase('antTri'); }, lattice: 'tri', cells: true, fill: false, antOf: 'triTurtle', get rule() { return antRuleText('antTri'); } },
  antHex: { get base() { return antBase('antHex'); }, lattice: 'hex', cells: true, fill: false, antOf: 'hexTurtle', get rule() { return antRuleText('antHex'); } },
  antCairo: { get base() { return antBase('antCairo'); }, lattice: 'cairo', cells: true, fill: false, antOf: 'cairo', get rule() { return antRuleText('antCairo'); } },
  // on a surface: the ant on the cells of its walk there, which keep their colours (turns: as the walk's)
  antCube: { get base() { return antBase('antCube'); }, lattice: 'sphere', cells: true, sphere: 'cube', initial: 48, turns: [3, 2, 1], perspective: true,
             fill: false, antOf: 'cubeFlat', get rule() { return antRuleText('antCube'); } },
  antHexSphere: { get base() { return antBase('antHexSphere'); }, lattice: 'sphere', cells: true, sphere: 'hexsphere', turns: [-2, 2], round: true,
                  fill: false, antOf: 'hexSphereWalk', get rule() { return antRuleText('antHexSphere'); } },
  antIcosa: { get base() { return antBase('antIcosa'); }, lattice: 'sphere', cells: true, sphere: 'icosa', turns: [2, 1], round: true,
              fill: false, antOf: 'icosaLR', get rule() { return antRuleText('antIcosa'); } },
  spiral:   { base: 2, arrows: '□■', lattice: 'square', skipZeros: true,
              rule: 'along a square spiral (Ulam): <b>1</b> draw the step, <b>0</b> move without drawing' },
  triSpiral: { base: 2, arrows: '□■', lattice: 'tri', skipZeros: true,
              rule: 'along a spiral of triangles: <b>1</b> draw the step, <b>0</b> move without drawing' },
  cairoSpiral: { base: 2, arrows: '□■', lattice: 'cairo', skipZeros: true, fill: false,
                 rule: 'along a spiral of Cairo pentagons: <b>1</b> draw the step, <b>0</b> move without drawing' },
  hexSpiral: { base: 2, arrows: '□■', lattice: 'hex', skipZeros: true,
              rule: 'along a spiral of hexagons: <b>1</b> draw the step, <b>0</b> move without drawing' },
  tetraLR:  { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'tetraGrid', sphere: 'tetra', initial: 48, turns: [2, 1],
              rule: 'on a tetrahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  torusWalk: { base: 3, arrows: '←↑→', lattice: 'sphere', cells: true, twin: 'torusGrid', sphere: 'torus', initial: 48, turns: [3, 2, 1], perspective: true, round: true,
              rule: 'on a torus of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right' },
  triTorusWalk: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'triTorusGrid', sphere: 'tritorus', initial: 48, turns: [2, 1], perspective: true, round: true,
                  rule: 'on a torus of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  // Cairo pentagons: out through one of the 4 other edges, edge k + 1 the sharpest right (as the 2D walk)
  cairoTorusWalk: { base: 4, arrows: '↙↖↗↘', lattice: 'sphere', cells: true, sphere: 'cairotorus', initial: 32, turns: [4, 3, 2, 1], perspective: true, round: true,
                    rule: 'on a torus of Cairo pentagons: out through one of its 4 other edges, <b>0</b> sharp left, <b>1</b> left, <b>2</b> right, <b>3</b> sharp right' },
  // hexagons: entering through edge k, edge k + 1 is a sharp right, k + 2 right, k + 3 straight on
  hexTorusWalk: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', cells: true, twin: 'hexTorusGrid', sphere: 'hextorus', initial: 48, turns: [5, 4, 3, 2, 1], perspective: true, round: true,
                  rule: 'on a torus of hexagons: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  mobiusWalk: { base: 3, arrows: '←↑→', lattice: 'sphere', cells: true, twin: 'mobiusGrid', sphere: 'mobius', turns: [3, 2, 1], perspective: true, round: true,
                rule: 'on a Möbius strip of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right (over its edge, onto the face behind)' },
  mobiusHexWalk: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', cells: true, twin: 'mobiusHexGrid', sphere: 'mobiusHex', turns: [5, 4, 3, 2, 1], perspective: true, round: true,
                   rule: 'on a Möbius strip of hexagons: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (over its edge, onto the face behind)' },
  // a Klein bottle (its tube a figure 8 crossing itself): on cells, as the torus's walks
  kleinWalk: { base: 3, arrows: '←↑→', lattice: 'sphere', cells: true, sphere: 'klein', turns: [3, 2, 1], perspective: true, round: true,
               rule: 'on a Klein bottle of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right' },
  kleinHexWalk: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', cells: true, sphere: 'kleinHex', turns: [5, 4, 3, 2, 1], perspective: true, round: true,
                  rule: 'on a Klein bottle of hexagons: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  kleinTriWalk: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, sphere: 'kleinTri', turns: [2, 1], perspective: true, round: true,
                  rule: 'on a Klein bottle of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  kleinCairoWalk: { base: 4, arrows: '↙↖↗↘', lattice: 'sphere', cells: true, sphere: 'kleinCairo', turns: [4, 3, 2, 1], perspective: true, round: true,
                    rule: 'on a Klein bottle of Cairo pentagons: out through one of its 4 other edges, <b>0</b> sharp left, <b>1</b> left, <b>2</b> right, <b>3</b> sharp right' },
  mobiusCairoWalk: { base: 4, arrows: '↙↖↗↘', lattice: 'sphere', cells: true, sphere: 'mobiusCairo', turns: [4, 3, 2, 1], perspective: true, round: true,
                     rule: 'on a Möbius strip of Cairo pentagons: out through one of its 4 other edges, <b>0</b> sharp left, <b>1</b> left, <b>2</b> right, <b>3</b> sharp right (over its edge, onto the face behind)' },
  mobiusTriWalk: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'mobiusTriGrid', sphere: 'mobiusTri', turns: [2, 1], perspective: true, round: true,
                   rule: 'on a Möbius strip of triangles: exit through the <b>0</b> left or <b>1</b> right edge (over its edge, onto the face behind)' },
  cubeFlat: { base: 3, arrows: '←↑→', lattice: 'sphere', cells: true, twin: 'cubeGrid', ant: 'antCube', sphere: 'cube', initial: 48, turns: [3, 2, 1], perspective: true,
              rule: 'on the surface of a cube: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right' },
  octaLR:   { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'octaGrid', sphere: 'octa', initial: 48, perspective: true, turns: [2, 1],
              rule: 'on an octahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  // hexagons and pentagons alike: the edges two away from the one you came in through, on either side
  hexSphereWalk: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'hexSphereGrid', ant: 'antHexSphere', sphere: 'hexsphere', turns: [-2, 2], round: true,
                   rule: 'on a sphere of hexagons (and 12 pentagons): exit through the <b>0</b> front left or <b>1</b> front right edge' },
  stellaLR: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'stellaGrid', sphere: 'stella', turns: [2, 1],
              rule: 'on a stella octangula (two tetrahedra) of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  dodecaLR: { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'dodecaGrid', sphere: 'dodeca', turns: [2, 1],
              rule: 'on a dodecahedron, its pentagons cut into triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  icosaLR:  { base: 2, arrows: '↖↗', lattice: 'sphere', cells: true, twin: 'icosaGrid', ant: 'antIcosa', sphere: 'icosa', turns: [2, 1], round: true,
              rule: 'on an icosahedron of triangles: exit through the <b>0</b> left or <b>1</b> right edge' },
  // along the grid: from corner to corner, turning by these angles (degrees, left positive), or as close
  // to them as the edges at a corner allow
  torusGrid: { base: 3, arrows: '←↑→', lattice: 'sphere', twin: 'torusWalk', sphere: 'torus', grid: true, initial: 48, turns: [90, 0, -90], perspective: true, round: true,
               rule: 'along the edges of a torus of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right' },
  triTorusGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'triTorusWalk', sphere: 'tritorus', grid: true, initial: 48, turns: [120, 60, 0, -60, -120], perspective: true, round: true,
                  rule: 'along the edges of a torus of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right' },
  hexTorusGrid: { base: 2, arrows: '↖↗', lattice: 'sphere', twin: 'hexTorusWalk', sphere: 'hextorus', grid: true, initial: 48, turns: [60, -60], perspective: true, round: true,
                  rule: 'along the edges of a torus of hexagons: <b>0</b> turn left, <b>1</b> turn right' },
  mobiusGrid: { base: 3, arrows: '←↑→', lattice: 'sphere', twin: 'mobiusWalk', sphere: 'mobius', grid: true, turns: [90, 0, -90], perspective: true, round: true,
                rule: 'along the edges of a Möbius strip of squares: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right (over its edge, onto the face behind)' },
  mobiusHexGrid: { base: 2, arrows: '↖↗', lattice: 'sphere', twin: 'mobiusHexWalk', sphere: 'mobiusHex', grid: true, turns: [60, -60], perspective: true, round: true,
                   rule: 'along the edges of a Möbius strip of hexagons: <b>0</b> turn left, <b>1</b> turn right (over its edge, onto the face behind)' },
  mobiusTriGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'mobiusTriWalk', sphere: 'mobiusTri', grid: true, turns: [120, 60, 0, -60, -120], perspective: true, round: true,
                   rule: 'along the edges of a Möbius strip of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (over its edge, onto the face behind)' },
  cubeGrid:  { base: 3, arrows: '←↑→', lattice: 'sphere', twin: 'cubeFlat', sphere: 'cube', grid: true, initial: 48, turns: [90, 0, -90], perspective: true,
               rule: 'along the edges of the squares of a cube: <b>0</b> turn left, <b>1</b> straight on, <b>2</b> turn right (at a corner of the cube, the nearest edge)' },
  tetraGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'tetraLR', sphere: 'tetra', grid: true, initial: 48, turns: [120, 60, 0, -60, -120],
               rule: 'along the edges of a tetrahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  octaGrid:  { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'octaLR', sphere: 'octa', initial: 48, perspective: true, grid: true, turns: [120, 60, 0, -60, -120],
               rule: 'along the edges of an octahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  // Set aside: on triangles, turns of ±60° only walk a hidden grid of hexagons (3 times fewer
  // corners), so they need many triangles for few patterns; the hexagon sphere does it directly.
  // icosaGrid2: { base: 2, lattice: 'sphere', sphere: 'icosa', grid: true, turns: [60, -60], round: true,
  //               rule: 'along the edges of an icosahedron of triangles: <b>0</b> front left, <b>1</b> front right (at a corner of the solid, the nearest edge)' },
  // icosaGrid3: { base: 3, lattice: 'sphere', sphere: 'icosa', grid: true, turns: [60, 0, -60], round: true,
  //               rule: 'along the edges of an icosahedron of triangles: <b>0</b> front left, <b>1</b> forward, <b>2</b> front right (at a corner of the solid, the nearest edge)' },
  hexSphereGrid: { base: 2, arrows: '↖↗', lattice: 'sphere', twin: 'hexSphereWalk', sphere: 'hexsphere', grid: true, turns: [60, -60], round: true,
                   rule: 'along the edges of a sphere of hexagons (and 12 pentagons): <b>0</b> turn left, <b>1</b> turn right' },
  stellaGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'stellaLR', sphere: 'stella', grid: true, turns: [120, 60, 0, -60, -120],
                rule: 'along the edges of a stella octangula (two tetrahedra) of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a tip or a hollow corner, the nearest edge)' },
  dodecaGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'dodecaLR', sphere: 'dodeca', grid: true, turns: [120, 60, 0, -60, -120],
                rule: 'along the edges of a dodecahedron, its pentagons cut into triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  icosaGrid: { base: 5, arrows: '↙↖↑↗↘', lattice: 'sphere', twin: 'icosaLR', sphere: 'icosa', grid: true, turns: [120, 60, 0, -60, -120], round: true,
               rule: 'along the edges of an icosahedron of triangles: <b>0</b> sharp left, <b>1</b> left, <b>2</b> straight, <b>3</b> right, <b>4</b> sharp right (at a corner of the solid, the nearest edge)' },
  life2d:     { base: 2, lattice: 'square', life: true, plane: 'square', where: 'a grid of squares' },  // on the plane (see plane)
  life2dTri:  { base: 2, lattice: 'tri', life: true, plane: 'tri', where: 'a grid of triangles' },
  life2dHex:  { base: 2, lattice: 'hex', life: true, plane: 'hex', where: 'a grid of hexagons' },
  life2dCairo: { base: 2, lattice: 'cairo', life: true, plane: 'cairo', where: 'a grid of Cairo pentagons' },
  life2dKite: { base: 2, lattice: 'kite', life: true, plane: 'kite', where: 'a grid of kites (each triangle cut in 3)' },
  life2dHat: { base: 2, lattice: 'hat', life: true, plane: 'hat', where: 'a patch of hats, the tile that never repeats' },
  life2dPenrose: { base: 2, lattice: 'penrose', life: true, plane: 'penrose', where: "a patch of Penrose's rhombi (they never repeat)" },
  lifeKiteTorus: { base: 2, lattice: 'sphere', sphere: 'kitetorus', life: true, perspective: true, round: true, where: 'a torus of kites' },
  lifeMobiusKite: { base: 2, lattice: 'sphere', sphere: 'mobiusKite', life: true, perspective: true, round: true,
                    where: 'a Möbius strip of kites (both faces, over its edge onto the one behind)' },
  lifeKleinKite: { base: 2, lattice: 'sphere', sphere: 'kleinKite', life: true, perspective: true, round: true, where: 'a Klein bottle of kites' },
  lifeTorus:  { base: 2, lattice: 'sphere', sphere: 'torus', life: true, perspective: true, round: true,
                where: 'a torus of squares (a grid that wraps around both ways)' },
  lifeHexTorus: { base: 2, lattice: 'sphere', sphere: 'hextorus', life: true, perspective: true, round: true,
                  where: 'a torus of hexagons' },
  lifeTriTorus: { base: 2, lattice: 'sphere', sphere: 'tritorus', life: true, perspective: true, round: true,
                  where: 'a torus of triangles' },
  lifeCairoTorus: { base: 2, lattice: 'sphere', sphere: 'cairotorus', life: true, perspective: true, round: true,
                    where: 'a torus of Cairo pentagons' },
  // a Möbius strip: its two faces one surface, over its edge onto the face behind (2 colours: a face each)
  lifeMobius: { base: 2, lattice: 'sphere', sphere: 'mobius', life: true, perspective: true, round: true,
                where: 'a Möbius strip of squares (both faces, over its edge onto the one behind)' },
  lifeMobiusHex: { base: 2, lattice: 'sphere', sphere: 'mobiusHex', life: true, perspective: true, round: true,
                   where: 'a Möbius strip of hexagons (both faces, over its edge onto the one behind)' },
  lifeKlein: { base: 2, lattice: 'sphere', sphere: 'klein', life: true, perspective: true, round: true, where: 'a Klein bottle of squares' },
  lifeKleinHex: { base: 2, lattice: 'sphere', sphere: 'kleinHex', life: true, perspective: true, round: true, where: 'a Klein bottle of hexagons' },
  lifeKleinTri: { base: 2, lattice: 'sphere', sphere: 'kleinTri', life: true, perspective: true, round: true, where: 'a Klein bottle of triangles' },
  lifeKleinCairo: { base: 2, lattice: 'sphere', sphere: 'kleinCairo', life: true, perspective: true, round: true, where: 'a Klein bottle of Cairo pentagons' },
  lifeMobiusCairo: { base: 2, lattice: 'sphere', sphere: 'mobiusCairo', life: true, perspective: true, round: true,
                     where: 'a Möbius strip of Cairo pentagons (both faces, over its edge onto the one behind)' },
  lifeMobiusTri: { base: 2, lattice: 'sphere', sphere: 'mobiusTri', life: true, perspective: true, round: true,
                   where: 'a Möbius strip of triangles (both faces, over its edge onto the one behind)' },
  lifeCube:   { base: 2, lattice: 'sphere', sphere: 'cube', life: true, perspective: true,
                where: 'the surface of a cube' },
  lifePits:   { base: 2, lattice: 'sphere', sphere: 'pits', life: true, perspective: true,
                where: 'the surface of a cube with a pit in each face' },
  lifeTetra:  { base: 2, lattice: 'sphere', sphere: 'tetra', life: true,
                where: 'a tetrahedron of triangles' },
  lifeOcta:   { base: 2, lattice: 'sphere', sphere: 'octa', perspective: true, life: true,
                where: 'an octahedron of triangles' },
  lifeTetraKite: { base: 2, lattice: 'sphere', sphere: 'tetraKite', life: true, where: 'a tetrahedron of kites (each triangle cut in 3)' },
  lifeOctaKite: { base: 2, lattice: 'sphere', sphere: 'octaKite', perspective: true, life: true, where: 'an octahedron of kites (each triangle cut in 3)' },
  lifeIcosaKite: { base: 2, lattice: 'sphere', sphere: 'icosaKite', life: true, round: true, where: 'an icosahedron of kites (each triangle cut in 3)' },
  lifeStella: { base: 2, lattice: 'sphere', sphere: 'stella', life: true,
                where: 'a stella octangula (two tetrahedra) of triangles' },
  lifeDodeca: { base: 2, lattice: 'sphere', sphere: 'dodeca', life: true,
                where: 'a dodecahedron, its pentagons cut into triangles' },
  lifeIcosa:  { base: 2, lattice: 'sphere', sphere: 'icosa', life: true, round: true,
                where: 'an icosahedron of triangles' },
  lifeHexSphere: { base: 2, lattice: 'sphere', sphere: 'hexsphere', life: true, round: true,
                   where: 'a sphere of hexagons (its 12 pentagons are walls)' },
  cubeRel:  { base: 5, arrows: '←⊙↑⊗→', lattice: 'cube', twin: 'cubeRelCells', perspective: true,
              rule: 'in 3D cubes, relative to your heading: <b>0</b> turn left, <b>1</b> up, <b>2</b> straight, <b>3</b> down, <b>4</b> turn right' },
  cubeFixed: { base: 6, arrows: '↑→⊙↓←⊗', lattice: 'cube', twin: 'cubeFixedCells', perspective: true,
              rule: 'in 3D cubes: <b>0</b> north, <b>1</b> east, <b>2</b> up, <b>3</b> south, <b>4</b> west, <b>5</b> down' },
  diag: { base: 8, lattice: 'cube', twin: 'diagCells', perspective: true,
          rule: 'along the diagonals of the cubes, to one of their 8 corners (the 3 bits of each digit the signs of east, north and up): <b>0</b> SW down, <b>1</b> SW up, <b>2</b> NW down, <b>3</b> NW up, <b>4</b> SE down, <b>5</b> SE up, <b>6</b> NE down, <b>7</b> NE up' },
  diamond: { base: 3, arrows: '↖↑↗', lattice: 'cube', perspective: true,
             rule: 'along the bonds of a diamond, as a polymer chain: <b>0</b> gauche left, <b>1</b> trans (the zigzag goes on), <b>2</b> gauche right' },
  // the same steps from cell to cell (their centres make the same lattice), the cells coloured (see glCubes)
  cubeRelCells: { base: 5, arrows: '←⊙↑⊗→', lattice: 'cube', cells: true, twin: 'cubeRel', perspective: true,
              rule: 'from cube to cube, relative to your heading: <b>0</b> turn left, <b>1</b> up, <b>2</b> straight, <b>3</b> down, <b>4</b> turn right' },
  cubeFixedCells: { base: 6, arrows: '↑→⊙↓←⊗', lattice: 'cube', cells: true, twin: 'cubeFixed', perspective: true,
              rule: 'from cube to cube: <b>0</b> north, <b>1</b> east, <b>2</b> up, <b>3</b> south, <b>4</b> west, <b>5</b> down' },
  diagCells: { base: 8, lattice: 'cube', cells: true, twin: 'diag', shape: 'truncOcta', perspective: true,
               rule: 'from truncated octahedron to truncated octahedron (they fill space), through a hexagon (the 3 bits of each digit the signs of east, north and up): <b>0</b> SW down, <b>1</b> SW up, <b>2</b> NW down, <b>3</b> NW up, <b>4</b> SE down, <b>5</b> SE up, <b>6</b> NE down, <b>7</b> NE up' },
  // Pivot: 0 a step straight on, 1 a turn on the spot by a notch clockwise (pivot: the notches of a whole
  // turn), with no step: the turtle of the L-systems (F and +). Thue–Morse on triangles draws Koch's
  // snowflake. In 2D, along the fixed directions of a walk (steps), clockwise from north
  squarePivot: { base: 2, arrows: '↑→', lattice: 'square', lines: true, twin: 'squarePivotCells', pivot: 4, steps: 'cardinal',
                 rule: 'along the lines of a square grid: <b>0</b> step forward, <b>1</b> turn right on the spot (90°)' },
  squarePivotCells: { base: 2, arrows: '↑→', lattice: 'square', cells: true, twin: 'squarePivot', pivot: 4, steps: 'cardinal',
                      rule: 'from cell to cell of a square grid: <b>0</b> step forward, <b>1</b> turn right on the spot (90°)' },
  triPivot: { base: 2, arrows: '↑→', lattice: 'hex', lines: true, pivot: 6, steps: 'triFixed',
              rule: 'along the lines of a triangle grid: <b>0</b> step forward, <b>1</b> turn right on the spot (60°)' },
  // Parity: a step forward at each digit, then after a 1 a turn by a notch (parity: the notches of a whole
  // turn), right at an odd digit (the 1st, 3rd…), left at an even one: on squares, the rabbit constant (F)
  // draws the Fibonacci word fractal. Along the fixed directions of a walk (steps), as Pivot
  squareParity: { base: 2, arrows: '↑→', lattice: 'square', lines: true, twin: 'squareParityCells', parity: 4, steps: 'cardinal',
                  rule: 'along the lines of a square grid: <b>0</b> step forward, <b>1</b> step forward then turn right at an odd digit, left at an even one (90°)' },
  squareParityCells: { base: 2, arrows: '↑→', lattice: 'square', cells: true, twin: 'squareParity', parity: 4, steps: 'cardinal',
                       rule: 'from cell to cell of a square grid: <b>0</b> step forward, <b>1</b> step forward then turn right at an odd digit, left at an even one (90°)' },
  triParity: { base: 2, arrows: '↑→', lattice: 'hex', lines: true, parity: 6, steps: 'triFixed',
               rule: 'along the lines of a triangle grid: <b>0</b> step forward, <b>1</b> step forward then turn right at an odd digit, left at an even one (60°)' },
  hexParityCells: { base: 2, arrows: '↑→', lattice: 'hex', cells: true, parity: 6, steps: 'hexFixedCells',
                    rule: 'from cell to cell of a hexagon grid: <b>0</b> step forward, <b>1</b> step forward then turn right at an odd digit, left at an even one (60°)' },
  cubesPivot: { base: 3, arrows: '↑→⊙', lattice: 'cube', twin: 'cubesPivotCells', perspective: true, pivot: 4,
                rule: 'in 3D cubes: <b>0</b> step forward, <b>1</b> turn right on the spot, <b>2</b> turn up on the spot' },
  cubesPivotCells: { base: 3, arrows: '↑→⊙', lattice: 'cube', cells: true, twin: 'cubesPivot', perspective: true, pivot: 4,
                     rule: 'from cube to cube: <b>0</b> step forward, <b>1</b> turn right on the spot, <b>2</b> turn up on the spot' },
  hexPivotCells: { base: 2, arrows: '↑→', lattice: 'hex', cells: true, pivot: 6, steps: 'hexFixedCells',
                   rule: 'from cell to cell of a hexagon grid: <b>0</b> step forward, <b>1</b> turn right on the spot (60°)' },
};
// on the surfaces, as their turtle walks (along the grid or on cells) where a step straight on exists:
// squares, hexagons (cells), triangles (the grid); [pivot walk, its turtle walk, notches, its twin]
for (const [w, of, n, twin] of [['cubePivot', 'cubeFlat', 4, 'cubePivotGrid'], ['cubePivotGrid', 'cubeGrid', 4, 'cubePivot'],
  ['torusPivot', 'torusWalk', 4, 'torusPivotGrid'], ['torusPivotGrid', 'torusGrid', 4, 'torusPivot'], ['hexTorusPivot', 'hexTorusWalk', 6],
  ['triTorusPivotGrid', 'triTorusGrid', 6], ['kleinPivot', 'kleinWalk', 4], ['kleinHexPivot', 'kleinHexWalk', 6], ['mobiusPivot', 'mobiusWalk', 4, 'mobiusPivotGrid'], ['mobiusPivotGrid', 'mobiusGrid', 4, 'mobiusPivot'],
  ['mobiusHexPivot', 'mobiusHexWalk', 6], ['mobiusTriPivotGrid', 'mobiusTriGrid', 6], ['tetraPivotGrid', 'tetraGrid', 6],
  ['octaPivotGrid', 'octaGrid', 6], ['stellaPivotGrid', 'stellaGrid', 6], ['dodecaPivotGrid', 'dodecaGrid', 6], ['icosaPivotGrid', 'icosaGrid', 6]]) {
  const M = MODES[of], where = M.rule.split(': ')[0], after = M.rule.match(/ \([^)]*\)$/)?.[0] ?? '';  // "(at a corner of the cube, …)"
  MODES[w] = { ...M, base: 2, arrows: '↑→', twin, ant: undefined, pivot: n,
               rule: `${where}: <b>0</b> step forward, <b>1</b> turn right on the spot (${360 / n}°)${after}` };
  MODES[w.replace('Pivot', 'Parity')] = { ...MODES[w], twin: twin?.replace('Pivot', 'Parity'), pivot: undefined, parity: n,  // and its Parity walk
    rule: `${where}: <b>0</b> step forward, <b>1</b> step forward then turn right at an odd digit, left at an even one (${360 / n}°)${after}` };
}


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
  line: $('lineLayer').getContext('2d'),  // Show path over cells: above them all, the cells painted later included
  overlay: $('overlayLayer').getContext('2d'),
};
let cw = 0, ch = 0;

/* ==============================================================================================
 * PART 3 — LABELS, DIGIT COUNTS AND RANDOM DRAWS
 * ==============================================================================================
 */

/* ---- 3.1 Subtitle, colour menu and number of digits ------------------------------------------ */
function updateRuleText() {}  // the rule is shown by describe (the Play card)

// Game of Life needs one base-C digit per cell; walks use the requested number of digits
function digitsNeeded() {
  const mode = MODES[$('mode').value], size = randomPrimeSize();
  if (mode.plane) return plane.start === 'digits' ? gridSize(mode.plane, plane.side)[2] : 256;  // all the digits for a start by the digits; else a hunt's patch
  if (mode.life) return SPHERES[surfaceOf(mode)].tiles(sphereSize());
  // a random prime is walked whole: its size (decimal digits) written in the walk's base
  return size ? Math.ceil((size * Math.log(10)) / Math.log(mode.base)) + 1 : requestedDigits();
}

// The Play card says what is shown: its title the number, the loop and the base; open, the walk and
// its rule, a chip per digit (its count in the stats) when the rule names each digit: "Squares
// turtle · along the lines of a square grid", 0 turn left + step, … An automaton: "4/3 in base 2
// seeds the 2,560 cells of a torus of squares: 0 dead, 1 alive · rule B3/S23 · …".
let shownSym = 'π';  // the number's symbol, for the description and a saved setup's name
let digitsBeforeLoop = null;  // the count of digits asked before a loop cut it to its first round (8 rounds in 2D and 3D)
const LOOP_ROUNDS = 8;  // the rounds a repeat is walked at least, and the stretches a highway or a bridge takes
// A walk going off for ever (a drift, an ant's highway) walked as far as what it drew before is wide:
// rounds of `shift` each, over twice the farthest it went from the start before (radius), 8 at least
const driftRounds = (radius, shift) => Math.max(LOOP_ROUNDS, Math.ceil((2 * radius) / shift));
// The rainbow of a walk going round a loop: each round in the colours of the first one (the rounds are
// drawn over each other); i, a step; rainbowLength(), the steps the rainbow spreads over
const closedLoop = () => walk.loop?.period && !walk.loop.drift;  // a drift's rounds are side by side: one rainbow over them all
const roundStep = (i) => { const L = walk.loop; return closedLoop() && i >= L.from + L.period ? L.from + ((i - L.from) % L.period) : i; };
const rainbowLength = () => (closedLoop() ? walk.loop.from + walk.loop.period : walk.n);
let lifeStart = null;  // where a Life start comes from when it is not the number's digits (see setLifeSeed)
function describe(base, available) {
  const mode = MODES[$('mode').value], sym = `<span class="pi">${withIcons(shownSym)}</span>`;
  $('barNum').innerHTML = withIcons(shownSym);
  $('barNum').title = formulaInUse;
  const colours = antColours($('mode').value);
  $('barBase').textContent = colours ? `${colours} colours` : `base ${base}`;
  $('barBase').parentElement.classList.remove('life');
  if (colours) base = colours;  // its chips, one per colour
  $('barLoop').hidden = mode.life || !walk.loop;
  $('ruleChips').replaceChildren();
  if (!mode.life) {
    const from = walk.loop?.from;
    $('barLoop').textContent = `${fmt(walk.loop?.period ?? walk.n)} digits ${walk.loop?.drift ? '→' : '↻'}${from ? ` from step ${fmt(from)}` : ''}`;  // a round
    $('barLoop').title = from ? `Then it would go round again from step ${fmt(from)}` : 'Then it would start over';
    // the rule: what comes before its colon, then its digits as chips, when it names each one
    const at = mode.rule.indexOf(': '), lead = at < 0 ? mode.rule : mode.rule.slice(0, at);
    const items = [...mode.rule.slice(at + 2).matchAll(/<b>(\d+)<\/b>\s*([^,<]*)/g)];
    const chips = at >= 0 && items.length === base && base <= (mode.antOf ? 12 : 8);  // an ant: up to its 12 colours
    const after = mode.rule.match(/\(([^)]*)\)\s*$/)?.[1];  // a closing note: "(at a corner of the cube, the nearest edge)"
    // the words around the digits, kept in the description: "exit through the … edge"
    const tail = mode.rule.slice(at + 2), pre = tail.slice(0, tail.indexOf('<b>')).trim(), edge = / edge\b/.test(tail) ? ' edge' : '';
    const around = pre ? ` · ${pre} …${edge}` : '';
    const highway = (walk.bridges?.length ? ` · ${walk.bridges.length === 1 ? 'a bridge' : `${walk.bridges.length} bridges`} back into its cloud, from step `
      + walk.bridges.map((b) => `${fmt(b.from)} (${fmt(Math.floor((b.to - b.from) / b.period))} stretches)`).join(', ') : '')
      + (walk.highway && !walk.loop ? ` · a highway from step ${fmt(walk.highway.from)}, every ${walk.highway.period} steps` : '')
      + (loopText() ? ` · ${loopText()}` : '');  // why the length stops where it does
    $('description').innerHTML = `<b>${walkName($('mode').value)}</b> · ${walk.loop ? '' : `${fmt(walk.n)} ${mode.antOf ? 'steps' : 'digits'} · `}${chips ? lead + around + (after ? ` · ${after}` : '') : mode.rule}${highway}`;
    if (chips) {
      $('ruleChips').replaceChildren(...items.map(([, d, text]) => {
        // without the closing note and the words around the digits (they are in the description)
        const what = text.replace(/\s*\(.*$/, '').trim().replace(/\s+(or|edge)$/, '');
        const c = document.createElement('span');
        c.className = 'rule-chip';
        c.innerHTML = `<b style="background:${(mode.antOf ? antChipColour : digitColour)(Number(d))}">${d}</b><span>${what.trim()}<small id="count${d}">0</small></span>`;
        c.title = `${d}: ${what.trim()}`;
        return c;
      }));
    }
    return;
  }
  const cells = walk.life.seed.length, C = base;
  const seeded = available < cells ? `the first ${fmt(available)} of the ${fmt(cells)} cells (the others start dead)` : `the ${fmt(cells)} cells`;
  const start = lifeStart, number = `<span class="walking">${sym}</span> in base ${C} seeds`;
  const lead = walk.plane ? planeLead(number) : start?.zone ? `${zoneWords(start.zone)} on ${mode.where}, the others dead`
    : start ? `${{ hunt: 'A start found by the hunt', battle: 'A battle found by the hunt', saved: 'A saved start' }[start]} on ${mode.where}`
    : plane.start === 'digits' ? `${number} ${seeded} of ${mode.where}` : `A random soup, ${plane.density} % alive (seed ${plane.seed}), on ${mode.where}`;
  // the title: the rule (its name, or the rule itself), not the number that may have seeded it
  const known = [...$('lifePreset').options].find((o) => o.dataset.name && o.value === walk.life.ruleText);
  $('barBase').textContent = walk.life.ruleText;  // on the right, the lifetime in the middle (the title: the generation, see updateStats)
  $('barBase').title = known ? known.dataset.name : '';
  $('barBase').parentElement.classList.add('life');
  $('description').innerHTML = `${walk.life.colours > 1 ? 'A dead cell is born only if one colour has more live neighbours than any other; on a tie, it takes the one colour missing around it if just one is, else it stays dead · ' : ''}Neighbours share an edge or a corner · ${lead}`;
}

// What the Display menu offers depends only on the walk tab (the group of the mode in the menu).
// Colours: a list (colors: Rainbow along the walk always; cells, visits, one per digit, one colour
// where listed), or the toggles Heatmap of visits and Digits (heatmap); the walks on cells or along
// the grid are chosen beside the list of walks (Grid / Cells).
// Walks on surfaces, on cells: the walk as a rainbow line over the tiles, the tiles it passes through
// filled in the colour of their first visit, those it encloses (Fill areas) in the colour of the
// step that closed them; or the tiles coloured by their visits (Heatmap, on cells only).
const DISPLAY_BY_TAB = {
  '2D walks': ['heatmap', 'fill', 'translucent', 'cells', 'visits', 'digit', 'grid'],
  '3D walks': ['colors', 'digit', 'grid', 'sky', 'autoRotate', 'perspective'],
  'Walks on surfaces': ['shape', 'heatmap', 'visits', 'fill', 'translucent', 'grid', 'sky', 'autoRotate', 'perspective'],
  'Automata on the plane': ['colors', 'digit', 'mono', 'grid', 'sky'],
  'Automata on surfaces': ['shape', 'colors', 'digit', 'mono', 'grid', 'sky', 'autoRotate', 'perspective'],
  '2D spirals': ['heatmap', 'fill', 'translucent', 'cells', 'visits', 'digit', 'grid'],  // the 2D walks' menu, some of it greyed out
};
// Shown but greyed out: a spiral never crosses itself, so it closes no area and visits each cell once;
// and its marks read as cells, the line along the spiral (Rainbow along the walk) shows nothing more
const DISPLAY_GREYED = { '2D spirals': ['fill', 'visits', 'line'] };
const greyed = (item) => !!DISPLAY_GREYED[$('mode').selectedOptions[0].parentElement.label]?.includes(item);
const shows = (item) => DISPLAY_BY_TAB[$('mode').selectedOptions[0].parentElement.label].includes(item);
const useful = (item) => shows(item) && !greyed(item);
function updateDisplayMenu() {
  const rows = { colors: 'colorsRow', grid: 'gridRow', sky: 'skyRow',  // Grid heads the box
                 autoRotate: 'autoRotateRow', perspective: 'perspectiveRow' };
  for (const [item, id] of Object.entries(rows)) $(id).hidden = !shows(item);
  skyButton.hidden = $('skyRow').hidden;  // the sky's switch, among the themes
  // Heatmap of visits and Digits instead of a list of colours, on cells only (Digits in 2D only;
  // a spiral marks its cells, each once: both greyed out)
  const mode = MODES[$('mode').value];
  $('cellsLabel').hidden = !shows('heatmap') || !!mode.antOf;  // (an ant: its cells' looks need no title)
  // the cells' looks as tiles (see renderCellModes), in 2D and on a surface: no boxes for Path and Heatmap
  $('showPathRow').hidden = $('heatmapRow').hidden = true;
  renderCellModes(mode);
  $('showPath').disabled = !mode.cells;  // along the grid, the walk is the path
  // in 2D, Path fades the cells under the rainbow line (on a layer of its own), so that it shows all along
  $('pathLayer').style.opacity = shows('cells') && $('showPath').checked && !$('showPath').disabled ? 0.15 : '';
  $('heatmap').disabled = !mode.cells;
  $('heatmap').checked = $('colorMode').value === 'visits';
  // Grid stays in sight; Auto-fit (Auto-rotate in 3D) beside it while the box is open, the other one
  // at the top of the view's settings, above Centered pattern (Default orientation), Perspective and the shape
  const spin = shows('autoRotate');
  $('viewHead').prepend(spin ? $('autoRotateRow') : $('autoFitRow'));
  $('viewSection').prepend(spin ? $('autoFitRow') : $('autoRotateRow'));
  $('centeredRow').hidden = !spin;
  $('centeredName').textContent = centersPattern() ? 'Centered pattern' : 'Default orientation';
  $('fillAreasRow').hidden = !shows('fill') || !!mode.antOf;  // an ant fills no areas
  $('fillAreas').disabled = !fillAreasApply();  // greyed out with the colours it does not go with
  $('fillTooBig').hidden = !(fill?.tooBig && $('fillAreas').checked && !$('fillAreas').disabled);
  $('fillName').textContent = walk.vert && current?.fraction ? 'Area · 2 cells max on ↻' : 'Area';  // a fraction along a grid (see areaSteps)
  // Light (translucent): only over a line, which then shows through the areas it closed in its own colour
  $('fillTranslucent').disabled = !(shows('translucent') && $('fillAreas').checked && fillAreasApply());
  renderAreaModes();
  $('fillLayer').style.opacity = $('fillTranslucent').checked && !$('fillTranslucent').disabled ? 0.35 : 1;
  renderTrailButton();
  updateMorphButton();  // Shape: only for a surface that can change shape
}

// The colour menu means something else for the Game of Life, and depends on its number of states.
// In Life the plain states come first (the default); walks keep the gradient first.
function relabelColours(mode) {
  const life = !!mode.life, C = life ? lifeStates() : 2, K = life ? lifeColours : 1, two = K > 1;
  const dying = C === 3 ? ' · dying' : C > 3 ? ` · ${C - 2} dying` : '';
  const names = !life ? { gradient: 'Rainbow along the walk', cells: 'Rainbow cells along the walk', visits: 'Rainbow by number of visits',
                      digit: 'One colour per digit', mono: 'One colour' }
    : { mono: two ? `Civilisations: ${LIFE_COLOUR_NAMES.slice(0, K).join(' · ')} · dead` : `States: alive${dying} · dead`,
        gradient: C > 2 ? 'Age of live cells, warm newborns to cold old ones + dying stages' : 'Age of live cells, warm newborns to cold old ones + fading trail',
        digit: 'Activity (state changes)', cells: '', visits: '' };
  const sel = $('colorMode');
  if (mode.antOf && !shows('cells')) antRamp ??= 'ink';  // an ant on a surface: its cells by their state
  sel.querySelector('option[value="digit"]').text = mode.antOf ? "The ant's colours" : names.digit;
  if (shows('cells')) {  // 2D: along lines the rainbow line; on cells the rainbow cells or the heatmap (Digits writes over either); an ant its colours
    if (mode.antOf && sel.value !== 'digit') antRamp = 'ink';  // an ant comes in with its states, in Ink
    sel.value = mode.antOf ? 'digit' : mode.twin && !mode.cells ? 'gradient' : mode.cells && sel.value === 'visits' ? 'visits' : 'cells';
    return;
  }
  if (shows('heatmap') && mode.antOf) { if (!['digit', 'cells', 'visits'].includes(sel.value)) sel.value = 'digit'; return; }  // an ant on a surface: its looks as in 2D
  if (shows('heatmap')) {  // on a surface: the rainbow line (over the tiles walked, on cells), or the heatmap on cells
    sel.value = mode.cells && sel.value === 'visits' ? 'visits' : 'gradient';
    return;
  }
  const order = life ? ['mono', 'gradient', 'digit', 'cells', 'visits'] : ['gradient', 'cells', 'visits', 'digit', 'mono'];
  const byValue = Object.fromEntries(Array.from(sel.options, (o) => [o.value, o]));
  order.forEach((v) => { byValue[v].text = names[v]; sel.append(byValue[v]); });
  for (const v of ['cells', 'visits', 'digit', 'mono']) byValue[v].hidden = !shows(v);
  byValue.gradient.disabled = greyed('line');  // Rainbow along the walk: no use on a spiral
  byValue.visits.disabled = !useful('visits');
  if (sel.selectedOptions[0]?.hidden || sel.selectedOptions[0]?.disabled) {
    sel.value = Array.from(sel.options).find((o) => !o.hidden && !o.disabled).value;  // the first one left
  }
  renderColorButtons();
}

// Choices as buttons clicked directly (colours, sky); the (hidden) menu stays the source of truth
function renderChoiceButtons(sel, box, pictures = null) {  // pictures: an icon per value, above its name
  box.replaceChildren(...Array.from(sel.options).filter((o) => !o.hidden).map((o) => {
    const b = document.createElement('button');
    if (pictures) b.innerHTML = `${icon(pictures[o.value])}<span>${o.text}</span>`;
    else b.textContent = o.text;
    b.classList.toggle('active', o.value === sel.value);
    b.disabled = o.disabled;
    b.addEventListener('click', () => {
      sel.value = o.value;
      sel.dispatchEvent(new Event('change'));
    });
    return b;
  }));
}
// Trail: a dead cell fades through greys for a few generations (States and Age, in colours too; two states)
const trailApplies = () => !!walk.life && walk.life.C === 2 && $('colorMode').value !== 'digit';
const trailOn = () => $('lifeTrail').checked && trailApplies();
// Trail as a tile: lit (gold) when on; its picture a live cell with its comet of fading Ink behind, or alone;
// greyed for Activity and dying stages
const trailButton = $('lifeTrailButton');  // kept: it goes after Life's looks, in their row (see renderColorButtons)
function renderTrailButton() {
  const b = trailButton, on = $('lifeTrail').checked, sq = (k, c) => `<rect x="${(17 * k) / 3}" y="${17 - (17 * k) / 3}" width="7" height="7" rx="1" fill="${c}"/>`;
  b.disabled = !trailApplies();
  b.classList.toggle('active', on && !b.disabled);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${on ? sq(0, LIFE_FADE[5]) + sq(1, LIFE_FADE[3]) + sq(2, LIFE_FADE[1]) : ''}${sq(3, LIFE_ALIVE)}</svg><span>Trail</span>`;  // up the diagonal
}
// Life's looks as square buttons with pictures (States or Colours, Age, Activity); a walk's, a list
function renderColorButtons() {
  const sel = $('colorMode'), box = $('colorButtons'), L = MODES[$('mode').value]?.life;
  box.className = 'nav-shapes cell-modes';
  renderTrailButton();
  // a walk's (Space): Rainbow, Directions, as the looks of its cells
  const names = L ? { mono: 'States', gradient: 'Age', digit: 'Activity' } : { gradient: 'Rainbow', cells: 'Rainbow', visits: 'Heatmap', digit: 'Directions' };
  const picture = (v) => (L ? lifeLookPicture(v) : cellModePicture(v === 'gradient' ? 'cells' : v));
  const looks = Array.from(sel.options).filter((o) => !o.hidden && names[o.value]);
  box.replaceChildren(...looks.map((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = o.text;
    b.innerHTML = `${picture(o.value)}<span>${names[o.value]}</span>`;
    b.classList.toggle('active', o.value === sel.value);
    b.disabled = o.disabled;
    b.addEventListener('click', () => { sel.value = o.value; sel.dispatchEvent(new Event('change')); });
    return b;
  }), ...(L ? [trailButton] : []));  // then Life's Trail, a switch
}
// States: alive and dead cells (Colours: the civilisations' and dead); Age: young (warm) to old (cold), then the fading
// trail of the dead; Activity: the cells that change most, hot in the middle
function lifeLookPicture(look) {
  const g = (f) => GRADIENT[Math.round(f * (BANDS - 1))];
  const swatch = (cs) => `<svg viewBox="0 0 2 2" aria-hidden="true">${cs.map((c, i) => `<rect x="${i % 2}" y="${i >> 1}" width="1" height="1" fill="${c}"/>`).join('')}</svg>`;
  if (look === 'mono') return swatch(lifeColours > 1 ? [LIFE_COLOURS[0], UNLIT, UNLIT, LIFE_COLOURS[1]] : [LIFE_ALIVE, UNLIT, UNLIT, LIFE_ALIVE]);  // in colours: a red, a blue
  if (look === 'gradient') return swatch([g(1), g(0.5), g(0), LIFE_FADE[Math.floor(LIFE_FADE.length / 3)]]);  // warm newborns to cold old cells
  return heatRings(g);
}
// square rings, hot inside (a heatmap, Life's activity)
const heatRings = (g) => `<svg viewBox="0 0 24 24" aria-hidden="true">${[0, 0.25, 0.5, 0.75, 1].map((f, i) => `<rect x="${2 + 2 * i}" y="${2 + 2 * i}" width="${20 - 4 * i}" height="${20 - 4 * i}" rx="${2 - 0.4 * i}" fill="${g(f)}"/>`).join('')}</svg>`;
// the sky, a switch before the themes: named after the theme (Dawn on a light page, Twilight on a dark one),
// its picture the sky, or the page's plain colour; shown where there is a sky (see updateDisplayMenu)
const skyButton = document.createElement('button');
skyButton.type = 'button';
skyButton.className = 'switch';
skyButton.title = 'The background: a sky in the page\'s tone, or plain';
skyButton.addEventListener('click', () => { $('sky').value = $('sky').value === 'sky' ? 'plain' : 'sky'; $('sky').dispatchEvent(new Event('change')); });
const renderSkyButtons = () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', on = $('sky').value === 'sky';
  const name = theme === 'light' ? 'Dawn' : 'Twilight';
  $('sky').options[0].text = name;
  // the sky's picture, its colours deeper than the sky's own (pale behind a view, they would not read so small)
  const deep = { light: [[0, '#7fa7de'], [0.5, '#c6b8e6'], [0.8, '#eea3b6'], [1, '#f39a68']], dark: [[0, '#0a1a4a'], [0.45, '#2c3f8f'], [0.75, '#6b3f8e'], [1, '#c8644f']] }[theme];
  skyButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="skyPicture" x1="0" y1="0" x2="0" y2="1">${deep.map(([f, c]) => `<stop offset="${f}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`
    + `<rect x="2" y="2" width="20" height="20" rx="2" fill="${on ? 'url(#skyPicture)' : UNLIT}" stroke="var(--border)"/></svg><span>${name}</span>`;
  skyButton.classList.toggle('active', on);
  $('themeButtons').prepend(skyButton);  // first, before the themes
};

function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(50_000_000, Math.max(10, n || 10));
}

// The number of digits as a stepper, like the surface size: [ − ] 20,000 digits [ + ] goes through
// DIGIT_STEPS and recomputes at once. The count can also be typed in the middle; any other count
// (typed, or from a link) then steps to the next one in DIGIT_STEPS.
// For a random prime, walked whole, the stepper sets the prime's size instead, in decimal digits:
// [ − ] 300 digits (p) [ + ], through PRIME_STEPS (100 to 2,000).
const DIGIT_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7];
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
  // a walk that loops uses only the digits of its first round on a surface (see buildGridWalk), of 8 rounds
  // in 2D and 3D: more would change nothing
  const L = !size && walk.loop, total = size ? null : L ? L.cap ?? walk.n : wholeTotal();
  $('digitsLabel').value = size ? `${fmt(size)} digits (p)` : L && n >= total ? `${fmt(total)} digits max ${L.drift ? '→' : '↻'}`
    : L ? `${fmt(n)} digits` : total === null ? `${fmt(n)} digits` : total <= n ? `all ${fmt(total)} digits` : `${fmt(n)} of ${fmt(total)}`;
  $('digitsLabel').title = size ? 'The size of the random prime p, in decimal digits: 100 to 2,000, then Enter (it is walked whole)'
    : 'Type a number of digits, from 10 to 50,000,000, then Enter';
  // − goes below what is walked: the whole number's own length when it is shorter than the count
  $('digitsDown').disabled = Math.min(n, total ?? n) <= steps[0];
  $('digitsUp').disabled = n >= steps.at(-1) || (total !== null && total <= n);
}
// Why a walk that repeats has a most of digits: the loop (or drift), from its first step, and how many
// rounds are walked; '' when it does not repeat
function loopText() {
  const L = !randomPrimeSize() && walk.loop;
  if (!L) return '';
  const period = L.period ?? walk.n - L.from, rounds = L.rounds ?? (L.period ? LOOP_ROUNDS : 1), total = L.cap ?? walk.n;
  const far = rounds > LOOP_ROUNDS ? ', as far as what it drew before is wide' : '';
  if (walk.ant) return `→ From step ${fmt(L.from)}, the ant builds a highway: the same ${fmt(period)} steps forever, each time further on.`
    + ` It stops after ${fmt(rounds)} of them${far}, ${fmt(total)} steps.`;
  return L.drift
    ? `→ From step ${fmt(L.from)}, this walk repeats the same ${fmt(period)} steps forever, each time further on: it goes off`
      + ` for ever, and stops after ${fmt(rounds)} rounds${far}, ${fmt(total)} digits.`
    : `↻ From step ${fmt(L.from)}, this walk goes round the same ${fmt(period)} steps forever:`
      + ` it stops after ${rounds === 1 ? 'one round' : `${rounds} rounds`}, ${fmt(total)} digits, and more would draw nothing new.`;
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
// The symmetries' pictures: a flag, and its copies (turned by a, mirrored across the upright when m)
const FLAG = [[12.8, 11.6], [12.8, 1.6], [21.5, 5.4], [12.8, 9.2]];
const flags = (copies) => copies.map(([a, m]) => pathEl(pathOf(FLAG.map(([x, y]) => {
  const u = m ? 24 - x : x, c = Math.cos(a), s = Math.sin(a);
  return [12 + (u - 12) * c - (y - 12) * s, 12 + (u - 12) * s + (y - 12) * c];
})), 'f')).join('');

// A triangle cut into 4 (its corners' midpoints joined), pointing at angle rot
const tiledTriangle = (rot) => {
  const [a, b, c] = ngon(3, 10.5, rot, 12, rot === -90 ? 14 : 12), m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  return pathEl(pathOf([a, b, c])) + pathEl(pathOf([m(a, b), m(b, c), m(c, a)]));
};
// 3 hexagons around a point: flat-topped (rot 0) or pointy-topped (rot 30)
const hexCluster = (rot) => [0, 120, 240].map((d) => {
  const t = ((d + rot) * Math.PI) / 180, R = 5.2;
  return pathEl(pathOf(ngon(6, R, rot, 12 + R * Math.cos(t), 12 + R * Math.sin(t))));
}).join('');
const ICONS = (() => {
  const hex = ngon(6, 9.5), tri = ngon(3, 10, -90, 12, 14), sq = [[4, 4], [20, 4], [20, 20], [4, 20]];
  const cube = (fillTop) => pathEl(pathOf(hex)) + [0, 2, 4].map((k) => pathEl(seg([12, 12], hex[k]))).join('')
    + (fillTop ? pathEl(pathOf([[12, 12], hex[4], hex[5], hex[0]]), 'f') : '');
  const torus = '<ellipse cx="12" cy="12" rx="10" ry="7"/>' + pathEl('M5.5 11Q12 17 18.5 11M7.8 12.6Q12 8 16.2 12.6');
  const [a, b, c, d] = [[12, 3], [3, 19], [21, 19], [13, 14.5]];
  const icoOut = ngon(6, 10), icoIn = ngon(3, 5, 90);
  // the dodecahedron seen face on: a pentagon in the middle, its 5 neighbours' edges out to the rim
  const dodecaIn = ngon(5, 5, 90), dodeca = pathEl(pathOf(ngon(5, 10))) + pathEl(pathOf(dodecaIn))
    + dodecaIn.map(([x, y]) => pathEl(seg([x, y], [12 + (x - 12) * 1.618, 12 + (y - 12) * 1.618]))).join('');
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
    king: pathEl('M12 3V21M3 12H21M5.6 5.6L18.4 18.4M18.4 5.6L5.6 18.4'),  // the 8 ways out
    pentagons: pathEl('M12 3L18 7L16 13H8L6 7Z') + pathEl('M8 13L6 19L12 22L18 19L16 13'),  // two of the Cairo tiling's, sharing an edge
    penrose: pathEl('M12 3L18.5 7.7L12 12L5.5 7.7Z') + pathEl('M12 12L18.5 7.7L16 15.3Z') + pathEl('M12 12L16 15.3L12 21L8 15.3Z') + pathEl('M12 12L8 15.3L5.5 7.7Z'),  // Penrose's rhombi round a point
    hat: pathEl('M7.2 13.4L2.5 16.1L4.1 18.9L10.4 18.9L12 16.1L16.8 18.9L21.5 16.1L19.9 13.4L16.8 13.4L16.8 7.9L12 5.1L10.4 7.9L7.2 7.9Z'),  // the hat monotile
    kites: pathEl(pathOf(hex)) + hex.map((p, i) => pathEl(seg([12, 12], [(p[0] + hex[(i + 1) % 6][0]) / 2, (p[1] + hex[(i + 1) % 6][1]) / 2]))).join(''),  // a hexagon cut in 6 kites
    cube: cube(false),
    cubeFilled: cube(true),
    torus,
    loop: pathEl('M19.5 12A7.5 7.5 0 1 1 16.6 6.1') + pathEl('M17.4 2.6L16.9 6.4L13.1 5.9'),  // a circle closing on itself, its arrow at the end
    // the tilings of a surface (see FAMILIES): a 2 × 2 grid, a triangle cut in 4, 3 hexagons, and turned by 30°
    tilesSq: pathEl(pathOf(sq)) + pathEl('M12 4V20M4 12H20'),
    tilesSqStretched: pathEl('M2 8H22V16H2Z') + pathEl('M6 8V16M10 8V16M14 8V16M18 8V16M2 12H22'),  // a long sheet of squares: 5 by 2
    tilesTri: tiledTriangle(-90), tilesTriTurned: tiledTriangle(0),
    tilesHex: hexCluster(0), tilesHexTurned: hexCluster(30),
    klein: pathEl('M14 4.5C17 4.5 19 7 19 10.5S16.5 19.5 12 19.5S5 17 5 13.5S8 9 11 10.5S13 15 11 15.5') + pathEl('M14 4.5C12.5 4.5 11.5 6 12 8.5S13.5 13 11 15.5'),  // a bottle going into itself
    mobius: pathEl('M3 12C3 7.5 8.5 7.5 12 12S21 16.5 21 12S15.5 7.5 12 12S3 16.5 3 12Z') + pathEl('M6.5 10.4Q9 9.6 10.6 11.2M13.4 12.8Q15 14.4 17.5 13.6'),
    tetrahedron: pathEl(pathOf([a, b, c])) + [a, b, c].map((p) => pathEl(seg(p, d))).join(''),
    stella: pathEl(pathOf(ngon(3, 10))) + pathEl(pathOf(ngon(3, 10, 90))),  // two tetrahedra: two triangles, a star
    octahedron: pathEl('M12 2L21 12L12 22L3 12Z') + [[12, 2], [21, 12], [12, 22], [3, 12]].map((p) => pathEl(seg(p, [10, 14]))).join(''),
    icosahedron: ico,
    dodecahedron: dodeca,
    spiral: pathEl(pathOf(spiralOf(4, 11), false)),
    triSpiral: pathEl(pathOf(spiralOf(3, 7), false)),
    hexSpiral: pathEl(pathOf(spiralOf(6, 15), false)),
    search: '<circle cx="10.5" cy="10.5" r="6.5"/>' + pathEl('M15.5 15.5L21 21'),
    // a turtle (the walks turning relative to their heading) and an ant (Langton's, a tab), seen from
    // above, heading up: their head, body and flippers filled, the ant's legs bent and bold, under its body
    turtle: pathEl('M12 1.2C10.6 1.2 10 2.6 10 3.8S10.8 6.2 12 6.2 14 5 14 3.8 13.4 1.2 12 1.2Z', 'f')
      + pathEl('M7.8 8.2Q3.6 5.6 1.4 8.4Q4.4 10.8 7.6 10.6Z', 'f') + pathEl('M16.2 8.2Q20.4 5.6 22.6 8.4Q19.6 10.8 16.4 10.6Z', 'f')
      + pathEl('M8.6 17.4Q5 18 4.4 21.6Q7.6 21.4 9.6 19Z', 'f') + pathEl('M15.4 17.4Q19 18 19.6 21.6Q16.4 21.4 14.4 19Z', 'f')
      + '<ellipse cx="12" cy="13.2" rx="5.2" ry="6.4" stroke-width="1.9"/>' + pathEl('M12 10.2L14 11.4V14.2L12 15.4L10 14.2V11.4Z', 'thin'),
    ant: '<path d="M10.5 10L7 8.4 5.6 5.4M13.5 10L17 8.4 18.4 5.4M10.2 11.4L5.2 11.8 3.4 13.6M13.8 11.4L18.8 11.8 20.6 13.6M10.4 12.8L7.2 15.6 6.4 19.6M13.6 12.8L16.8 15.6 17.6 19.6M10.8 4.8L9.2 2.6 7.4 2.8M13.2 4.8L14.8 2.6 16.6 2.8" stroke-width="1.8"/>'
      + '<ellipse class="f" cx="12" cy="6.2" rx="2.5" ry="2.2"/><ellipse class="f" cx="12" cy="11.1" rx="2" ry="2.5"/><ellipse class="f" cx="12" cy="17.8" rx="3.3" ry="4.4"/>',
    walk2d: pathEl('M3 20V15H8V10H12V16H17V6H21V3'),  // a walk on the square grid
    gallery: [[3.5, 3.5], [13.5, 3.5], [3.5, 13.5], [13.5, 13.5]].map(([x, y]) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.6"/>`).join(''),
    glider: pathEl(pathOf(sq)) + pathEl('M9.33 4V20M14.67 4V20M4 9.33H20M4 14.67H20')
      + [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].map(([x, y]) => `<rect class="f" x="${r2(4 + x * 5.33)}" y="${r2(4 + y * 5.33)}" width="5.33" height="5.33"/>`).join(''),
    // hunt zones: the whole surface, then a patch of radius 1, 2 or 3
    zoneAll: pathEl(pathOf(sq)) + pathEl('M9.33 4V20M14.67 4V20M4 9.33H20M4 14.67H20'),
    // the symmetries of a Life start on the plane
    // the Game of Life's bubbles: alive, born, died, ever alive
    aliveDot: '<circle class="f" cx="12" cy="12" r="5"/>',
    born: pathEl('M12 6V18M6 12H18'),
    died: pathEl('M7.5 7.5L16.5 16.5M16.5 7.5L7.5 16.5'),
    // the themes: Light, Dark, System (half and half)
    sun: '<circle class="f" cx="12" cy="12" r="4.2"/>' + pathEl('M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7.1 7.1M16.9 16.9L18.7 18.7M5.3 18.7L7.1 16.9M16.9 7.1L18.7 5.3'),
    moon: '<path class="f" d="M19.5 14.6A8 8 0 1 1 9.4 4.5A6.3 6.3 0 0 0 19.5 14.6Z"/>',
    halfDisc: '<circle cx="12" cy="12" r="8.5"/>' + '<path class="f" d="M12 3.5A8.5 8.5 0 0 0 12 20.5Z"/>',
    pivot: pathEl('M18.4 13A6.5 6.5 0 1 1 16.6 7.4') + pathEl('M17.5 3.5V7.8H13.2'),  // a turn on the spot, clockwise
    ever: pathEl('M3 12C6.5 6.5 17.5 6.5 21 12C17.5 17.5 6.5 17.5 3 12Z') + '<circle class="f" cx="12" cy="12" r="2.5"/>',
    symNone: flags([[0, false]]),
    symMirror: flags([[0, false], [0, true], [Math.PI, false], [Math.PI, true]]),
    symRotate: flags([0, 1, 2, 3].map((k) => [(k * Math.PI) / 2, false])),
    symKaleido: flags([0, 1, 2, 3].flatMap((k) => [[(k * Math.PI) / 2, false], [(k * Math.PI) / 2, true]])),
    symHalf: flags([[0, false], [Math.PI, false]]),
    ...Object.fromEntries([2.2, 3.5, 4.8, 6, 7.2, 8.4, 9.6, 11].map((r, i) => [`zone${i + 1}`, dots([[12, 12]], r)])),
    zoneFace: '<rect class="f" x="4" y="4" width="16" height="16" rx="2"/>',  // a whole face
    duel: dots([[6.5, 12], [17.5, 12]], 3.5),
    // Life's grid edges: walls, a square in a frame
    walls: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><rect x="7.5" y="7.5" width="9" height="9" rx="0.5"/>',
    // Draw's eraser: a block tilted on its line
    eraser: pathEl('M9 19L4.5 14.5A1.5 1.5 0 0 1 4.5 12.4L13.4 3.5A1.5 1.5 0 0 1 15.5 3.5L20.5 8.5A1.5 1.5 0 0 1 20.5 10.6L12 19Z') + pathEl('M8.5 9.5L14.5 15.5') + pathEl('M9 19H20'),
    // numbers
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/>' + dots([[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]], 1.4),
    dragon: `<path class="thin" d="${pathOf(dragonOf(63), false)}"/>`,
    // a barcode: thick and thin bars, well apart so that it still reads at 15 px
    barcode: [[3, 2.6], [7, 1.4], [10, 1.4], [13, 3], [18, 1.4], [20.6, 1.4]]
      .map(([x, w]) => `<rect class="f" x="${x}" y="4" width="${w}" height="16" rx="0.3"/>`).join(''),
    // buttons
    play: pathEl('M7 4.5L19.5 12L7 19.5Z', 'f'),
    pause: '<rect class="f" x="6" y="5" width="4" height="14" rx="1"/><rect class="f" x="14" y="5" width="4" height="14" rx="1"/>',
    stop: '<rect class="f" x="6" y="6" width="12" height="12" rx="1.5"/>',
    start: pathEl('M5.5 5V19') + pathEl('M19 5L9 12L19 19Z', 'f'),
    end: pathEl('M18.5 5V19') + pathEl('M5 5L15 12L5 19Z', 'f'),
    back: '<rect class="f" x="15.5" y="5" width="3.5" height="14" rx="1"/>' + pathEl('M13 5L4 12L13 19Z', 'f'),
    step: '<rect class="f" x="5" y="5" width="3.5" height="14" rx="1"/>' + pathEl('M11 5L20 12L11 19Z', 'f'),
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
 *   'seq'   a sequence of digits defined base by base (random, champernowne, primes, primegaps,
 *           and the 0s and 1s of dragon, thuemorse, rabbit).
 *           It is not a number, so it only stands alone: random(5)+1 is refused.
 * The kind decides where digits come from: sequences on the page (seqDigits), everything else in
 * the worker. An integer is walked through its own digits only (no digits after the point).
 */

/* ---- 4.1 Vocabulary -------------------------------------------------------------------------- */
const FORMULA_NAMES = {  // name: [kind, symbol shown]
  pi: ['real', 'π'], e: ['real', 'e'], phi: ['real', 'φ'], gamma: ['real', 'γ'], catalan: ['real', 'G'],
  erdos: ['real', 'E'], rho: ['real', 'ρ'],
  champernowne: ['seq', 'C'], primes: ['seq', '▮ p'], primegaps: ['seq', 'gₙ'], dragon: ['seq', '🐉'],
  thuemorse: ['seq', 'τ'], rabbit: ['seq', 'F'], rudinshapiro: ['seq', 'RS'], kolakoski: ['seq', 'K'],
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
  } else if (name === 'thuemorse') {  // digit k: the parity of the 1s of k in base 2; 0 and 1 in every base
    for (let i = 1; i < n; i++) digits[i] = digits[i >> 1] ^ (i & 1);
  } else if (name === 'rabbit') {  // the Fibonacci word: from 1, each 1 becomes 10 and each 0 becomes 1
    digits[0] = 1;
    for (let i = 0, j = 0; j < n; i++) { if (digits[i]) { digits[j++] = 1; if (j < n) digits[j++] = 0; } else digits[j++] = 1; }
  } else if (name === 'rudinshapiro') {  // the blocks 11 of k (k & k >> 1: their last 1s), counted mod 2
    for (let i = 0; i < n; i++) { let m = i & (i >> 1), p = 0; while (m) { p ^= 1; m &= m - 1; } digits[i] = p; }
  } else if (name === 'kolakoski') {  // 1 2 2 1 1 2 …: run i is as long as term i, its terms 1 and 2 by turns
    const k = [1, 2, 2];
    for (let i = 2; k.length < n; i++) for (let r = 0; r < k[i] && k.length < n; r++) k.push(1 + (i % 2 === 0 ? 0 : 1));
    for (let i = 0; i < n; i++) digits[i] = k[i] - 1;
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
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); head[i] = base < 64 && c >= 97 ? c - 87 : c - 48; }  // past base 10: a, b, c…
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
let modeTab = null;  // the menu group of the mode in use (its display defaults, its digits)
// The icon of each tab (the menu's group labels are the tab names) and of each walk mode's shape.
// Filled: the relative modes (turn from your heading); outlined: the fixed directions.
const TAB_ICONS = { '2D walks': 'walk2d', '3D walks': 'cube', 'Walks on surfaces': 'torus',
                    'Automata on the plane': 'glider', 'Automata on surfaces': 'glider', '2D spirals': 'spiral' };
const MODE_ICONS = {
  turtle: 'grid', cardinal: 'compass', triTurtle: 'triangleFilled', triFixed: 'triangle', hexTurtle: 'hexagonFilled', hexFixed: 'hexagon',
  turtleCells: 'grid', cardinalCells: 'compass', triTurtleCells: 'triangleFilled', triFixedCells: 'triangle', hexTurtleCells: 'hexagonFilled', hexFixedCells: 'hexagon',
  king: 'king', cairo: 'pentagons', antSquare: 'grid', antTri: 'triangleFilled', antHex: 'hexagonFilled', antCairo: 'pentagons', antCube: 'cube', antHexSphere: 'hexagon', antIcosa: 'icosahedron',
  cubeRel: 'cubeFilled', cubeFixed: 'cube', cubeRelCells: 'cubeFilled', cubeFixedCells: 'cube', diag: 'cube', diagCells: 'cube', diamond: 'tetrahedron', torusWalk: 'torus', triTorusWalk: 'torus', hexTorusWalk: 'torus', cubeFlat: 'cube', mobiusWalk: 'mobius', mobiusGrid: 'mobius', mobiusHexGrid: 'mobius', mobiusHexWalk: 'mobius', mobiusTriGrid: 'mobius', mobiusTriWalk: 'mobius',
  tetraLR: 'tetrahedron', octaLR: 'octahedron', stellaLR: 'stella', stellaGrid: 'stella', lifeStella: 'stella', dodecaLR: 'dodecahedron', dodecaGrid: 'dodecahedron', lifeDodeca: 'dodecahedron', icosaLR: 'icosahedron',
  torusGrid: 'torus', triTorusGrid: 'torus', hexTorusGrid: 'torus', cubeGrid: 'cube', tetraGrid: 'tetrahedron', octaGrid: 'octahedron',
  icosaGrid: 'icosahedron', hexSphereWalk: 'hexagon', /* icosaGrid2: 'icosahedron', icosaGrid3: 'icosahedron', */ hexSphereGrid: 'hexagon',
  life2dKite: 'kites', life2dHat: 'hat', life2dPenrose: 'penrose', lifeKiteTorus: 'torus', lifeMobiusKite: 'mobius', lifeKleinKite: 'klein',
  life2d: 'grid', life2dTri: 'triangle', life2dHex: 'hexagon', life2dCairo: 'pentagons', lifeTorus: 'torus', lifeHexTorus: 'torus', lifeCairoTorus: 'torus', lifeTriTorus: 'torus', cairoTorusWalk: 'torus', lifeMobius: 'mobius', lifeMobiusHex: 'mobius', lifeMobiusTri: 'mobius', lifeMobiusCairo: 'mobius', mobiusCairoWalk: 'mobius', kleinWalk: 'klein', kleinHexWalk: 'klein', kleinTriWalk: 'klein', kleinCairoWalk: 'klein',
  lifeKlein: 'klein', lifeKleinHex: 'klein', lifeKleinTri: 'klein', lifeKleinCairo: 'klein', lifeCube: 'cube', lifeTetra: 'tetrahedron', lifeOcta: 'octahedron', lifeIcosa: 'icosahedron', lifeTetraKite: 'tetrahedron', lifeOctaKite: 'octahedron', lifeIcosaKite: 'icosahedron', lifeHexSphere: 'hexagon',
  spiral: 'spiral', triSpiral: 'triSpiral', hexSpiral: 'hexSpiral', cairoSpiral: 'pentagons',
};

// "Cubes — base 5 (5 relative turns)" → name "Cubes", base "base 5", detail "5 relative turns"
function splitModeLabel(text) {
  const [head, tail = ''] = text.replace(/^Life — /, '').split(' — ');
  const m = tail.match(/^(base \d+)\s*(?:\((.*)\))?$/) || [null, '', ''];
  const inName = head.match(/^(.*?)\s*\((.*)\)$/);  // "torus (square grid)"
  const name = inName ? inName[1] : head;
  return { name: name[0].toUpperCase() + name.slice(1), base: m[1] || '', detail: m[2] || (inName ? inName[2] : '') };
}

/* The menu, from the top: what moves (Walk, Langton's Ant, Life), where (2D, 3D, Surfaces), on
 * which shape, by which rule, and along the grid or on cells ('' where neither); in the menu's order.
 * A family's tilings (Torus, Möbius strip, Sphere) share their place, picked by tabs under the shapes. */
const NAV = {
  turtle: ['Walk', '2D', 'Squares', 'Turtle', 'grid'], turtleCells: ['Walk', '2D', 'Squares', 'Turtle', 'cells'],
  cardinal: ['Walk', '2D', 'Squares', 'Cardinal', 'grid'], cardinalCells: ['Walk', '2D', 'Squares', 'Cardinal', 'cells'],
  king: ['Walk', '2D', 'Squares', 'King', 'cells'], spiral: ['Walk', '2D', 'Squares', 'Spiral', ''],
  triTurtle: ['Walk', '2D', 'Triangles', 'Turtle', 'grid'], triTurtleCells: ['Walk', '2D', 'Triangles', 'Turtle', 'cells'],
  triFixed: ['Walk', '2D', 'Triangles', 'Fixed', 'grid'], triFixedCells: ['Walk', '2D', 'Triangles', 'Fixed', 'cells'],
  triSpiral: ['Walk', '2D', 'Triangles', 'Spiral', ''],
  hexTurtle: ['Walk', '2D', 'Hexagons', 'Turtle', 'grid'], hexTurtleCells: ['Walk', '2D', 'Hexagons', 'Turtle', 'cells'],
  hexFixed: ['Walk', '2D', 'Hexagons', 'Fixed', 'grid'], hexFixedCells: ['Walk', '2D', 'Hexagons', 'Fixed', 'cells'],
  hexSpiral: ['Walk', '2D', 'Hexagons', 'Spiral', ''],
  cairo: ['Walk', '2D', 'Cairo', 'Turtle', 'cells'], cairoSpiral: ['Walk', '2D', 'Cairo', 'Spiral', ''],
  cubeRel: ['Walk', '3D', 'Cubes', 'Turtle', 'grid'], cubeRelCells: ['Walk', '3D', 'Cubes', 'Turtle', 'cells'],
  cubeFixed: ['Walk', '3D', 'Cubes', 'Fixed', 'grid'], cubeFixedCells: ['Walk', '3D', 'Cubes', 'Fixed', 'cells'],
  diag: ['Walk', '3D', 'Cubes', 'Diagonals', 'grid'], diagCells: ['Walk', '3D', 'Cubes', 'Diagonals', 'cells'],
  diamond: ['Walk', '3D', 'Diamond', 'Polymer', 'grid'],
  cubeGrid: ['Walk', 'Surfaces', 'Cube', 'Turtle', 'grid'], cubeFlat: ['Walk', 'Surfaces', 'Cube', 'Turtle', 'cells'],
  torusGrid: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'grid'], torusWalk: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'cells'],
  hexTorusGrid: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'grid'], hexTorusWalk: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'cells'],
  triTorusGrid: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'grid'], triTorusWalk: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'cells'],
  mobiusGrid: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'grid'], mobiusWalk: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'cells'],
  mobiusHexGrid: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'grid'], mobiusHexWalk: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'cells'],
  mobiusTriGrid: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'grid'], mobiusTriWalk: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'cells'],
  tetraGrid: ['Walk', 'Surfaces', 'Tetrahedron', 'Turtle', 'grid'], tetraLR: ['Walk', 'Surfaces', 'Tetrahedron', 'Turtle', 'cells'],
  octaGrid: ['Walk', 'Surfaces', 'Octahedron', 'Turtle', 'grid'], octaLR: ['Walk', 'Surfaces', 'Octahedron', 'Turtle', 'cells'],
  stellaGrid: ['Walk', 'Surfaces', 'Stella octangula', 'Turtle', 'grid'], stellaLR: ['Walk', 'Surfaces', 'Stella octangula', 'Turtle', 'cells'],
  dodecaGrid: ['Walk', 'Surfaces', 'Dodecahedron', 'Turtle', 'grid'], dodecaLR: ['Walk', 'Surfaces', 'Dodecahedron', 'Turtle', 'cells'],
  hexSphereGrid: ['Walk', 'Surfaces', 'Sphere', 'Turtle', 'grid'], hexSphereWalk: ['Walk', 'Surfaces', 'Sphere', 'Turtle', 'cells'],
  icosaGrid: ['Walk', 'Surfaces', 'Sphere', 'Turtle', 'grid'], icosaLR: ['Walk', 'Surfaces', 'Sphere', 'Turtle', 'cells'],
  antSquare: ['Ant', '2D', 'Squares', 'Ant', 'cells'], antTri: ['Ant', '2D', 'Triangles', 'Ant', 'cells'],
  antHex: ['Ant', '2D', 'Hexagons', 'Ant', 'cells'], antCairo: ['Ant', '2D', 'Cairo', 'Ant', 'cells'],
  antCube: ['Ant', 'Surfaces', 'Cube', 'Ant', 'cells'], antHexSphere: ['Ant', 'Surfaces', 'Sphere', 'Ant', 'cells'],
  antIcosa: ['Ant', 'Surfaces', 'Sphere', 'Ant', 'cells'],
  life2dKite: ['Life', '2D', 'Kites', 'Life', ''], life2dHat: ['Life', '2D', 'Hats', 'Life', ''], life2dPenrose: ['Life', '2D', 'Penrose', 'Life', ''],
  life2d: ['Life', '2D', 'Squares', 'Life', ''], life2dTri: ['Life', '2D', 'Triangles', 'Life', ''], life2dHex: ['Life', '2D', 'Hexagons', 'Life', ''], life2dCairo: ['Life', '2D', 'Cairo', 'Life', ''],
  lifeCube: ['Life', 'Surfaces', 'Cube', 'Life', ''], lifePits: ['Life', 'Surfaces', 'Pits', 'Life', ''], lifeTorus: ['Life', 'Surfaces', 'Torus', 'Life', ''],
  lifeHexTorus: ['Life', 'Surfaces', 'Torus', 'Life', ''], lifeCairoTorus: ['Life', 'Surfaces', 'Torus', 'Life', ''], lifeTriTorus: ['Life', 'Surfaces', 'Torus', 'Life', ''],
  cairoTorusWalk: ['Walk', 'Surfaces', 'Torus', 'Turtle', 'cells'],
  lifeMobius: ['Life', 'Surfaces', 'Möbius strip', 'Life', ''], lifeMobiusHex: ['Life', 'Surfaces', 'Möbius strip', 'Life', ''],
  lifeMobiusTri: ['Life', 'Surfaces', 'Möbius strip', 'Life', ''], lifeMobiusCairo: ['Life', 'Surfaces', 'Möbius strip', 'Life', ''],
  mobiusCairoWalk: ['Walk', 'Surfaces', 'Möbius strip', 'Turtle', 'cells'],
  kleinWalk: ['Walk', 'Surfaces', 'Klein bottle', 'Turtle', 'cells'], kleinHexWalk: ['Walk', 'Surfaces', 'Klein bottle', 'Turtle', 'cells'],
  kleinTriWalk: ['Walk', 'Surfaces', 'Klein bottle', 'Turtle', 'cells'], kleinCairoWalk: ['Walk', 'Surfaces', 'Klein bottle', 'Turtle', 'cells'],
  lifeKlein: ['Life', 'Surfaces', 'Klein bottle', 'Life', ''], lifeKleinHex: ['Life', 'Surfaces', 'Klein bottle', 'Life', ''],
  lifeKleinTri: ['Life', 'Surfaces', 'Klein bottle', 'Life', ''], lifeKleinCairo: ['Life', 'Surfaces', 'Klein bottle', 'Life', ''], lifeTetra: ['Life', 'Surfaces', 'Tetrahedron', 'Life', ''],
  lifeOcta: ['Life', 'Surfaces', 'Octahedron', 'Life', ''], lifeStella: ['Life', 'Surfaces', 'Stella octangula', 'Life', ''],
  lifeDodeca: ['Life', 'Surfaces', 'Dodecahedron', 'Life', ''], lifeIcosa: ['Life', 'Surfaces', 'Sphere', 'Life', ''],
  lifeHexSphere: ['Life', 'Surfaces', 'Sphere', 'Life', ''], lifeKiteTorus: ['Life', 'Surfaces', 'Torus', 'Life', ''],
  lifeMobiusKite: ['Life', 'Surfaces', 'Möbius strip', 'Life', ''], lifeKleinKite: ['Life', 'Surfaces', 'Klein bottle', 'Life', ''], lifeTetraKite: ['Life', 'Surfaces', 'Tetrahedron', 'Life', ''],
  lifeOctaKite: ['Life', 'Surfaces', 'Octahedron', 'Life', ''], lifeIcosaKite: ['Life', 'Surfaces', 'Sphere', 'Life', ''],
  squareParity: ['Walk', '2D', 'Squares', 'Parity', 'grid'], squareParityCells: ['Walk', '2D', 'Squares', 'Parity', 'cells'],
  triParity: ['Walk', '2D', 'Triangles', 'Parity', 'grid'], hexParityCells: ['Walk', '2D', 'Hexagons', 'Parity', 'cells'],
  squarePivot: ['Walk', '2D', 'Squares', 'Pivot', 'grid'], squarePivotCells: ['Walk', '2D', 'Squares', 'Pivot', 'cells'],
  cubesPivot: ['Walk', '3D', 'Cubes', 'Pivot', 'grid'], cubesPivotCells: ['Walk', '3D', 'Cubes', 'Pivot', 'cells'],
  triPivot: ['Walk', '2D', 'Triangles', 'Pivot', 'grid'], hexPivotCells: ['Walk', '2D', 'Hexagons', 'Pivot', 'cells'],
};
// the pivot and parity walks on the surfaces: where their turtle walks are (see MODES)
// the tilings' Life on the plane (see TILINGS): their modes, after the hats
const tilingMode = (kind) => `life2d${kind[0].toUpperCase()}${kind.slice(1)}`;
for (const [kind, t] of Object.entries(TILINGS)) {
  MODES[tilingMode(kind)] = { base: 2, lattice: kind, life: true, plane: kind, where: t.where };
  MODE_ICONS[tilingMode(kind)] = `tiling-${kind}`;
  NAV[tilingMode(kind)] = ['Life', '2D', t.name, 'Life', ''];
}
for (const w of Object.keys(MODES)) if ((MODES[w].pivot || MODES[w].parity) && MODES[w].sphere) {
  const of = Object.keys(NAV).find((v) => NAV[v][3] === 'Turtle' && MODES[v].sphere === MODES[w].sphere && !!MODES[v].grid === !!MODES[w].grid);
  NAV[w] = [...NAV[of].slice(0, 3), MODES[w].pivot ? 'Pivot' : 'Parity', NAV[of][4]];
}
for (const w of Object.keys(MODES)) if (MODES[w].pivot || MODES[w].parity) MODE_ICONS[w] = MODES[w].pivot ? 'pivot' : 'walk2d';
MODE_ICONS.lifePits = 'walls';
// in each shape's rules: Turtle, then Pivot and Parity, then the others as they come; among the shapes,
// Cairo right after Squares, Hexagons before Triangles, the Klein bottle after the Möbius strip, the
// Sphere before the Tetrahedron
{
  const group = (n) => n.slice(0, 3).join(), first = [...new Set(Object.values(NAV).map(group))], rank = { Turtle: 0, Pivot: 1, Parity: 2 };
  const moves = [['Cairo', 1, 'Squares'], ['Hexagons', 0, 'Triangles'], ['Kites', 1, 'Triangles'], ['Hats', 1, 'Kites'], ['Penrose', 1, 'Hats'], ['Klein bottle', 1, 'Möbius strip'], ['Sphere', 0, 'Tetrahedron']];  // (1 after, 0 before)
  for (const [shape, after, other] of moves) for (const g of first.filter((x) => x.endsWith(`,${shape}`))) {
    const o = g.slice(0, -shape.length) + other;
    if (!first.includes(o)) continue;
    first.splice(first.indexOf(g), 1);
    first.splice(first.indexOf(o) + after, 0, g);
  }
  const sorted = Object.entries(NAV).map((e, i) => [...e, i])
    .sort(([, a, i], [, b, j]) => first.indexOf(group(a)) - first.indexOf(group(b)) || (rank[a[3]] ?? 3) - (rank[b[3]] ?? 3) || i - j);
  for (const [w] of sorted) delete NAV[w];
  for (const [w, n] of sorted) NAV[w] = n;
}
const NAV_KINDS = [['Life', 'glider'], ['Ant', 'ant'], ['Walk', 'compass']];
// in this order, by these names: the surfaces are "3D", the walks through a 3D lattice "Space"
const NAV_SPACES = ['2D', 'Surfaces', '3D'], SPACE_NAMES = { '2D': '2D', Surfaces: '3D', '3D': 'Space' };
// a tiling's icon: its polygons round a cell's middle, fitted in the 24 × 24 box
function tilingIcon(kind) {
  const m = TILINGS[kind].polys.length, polys = [];
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) for (let k = 0; k < m; k++) polys.push(tilingAt(kind, i * m + k, j).map((p) => tilingWorld(kind, p)));
  const c = tilingWorld(kind, [0.5, 0.5]), r = Math.sqrt(Math.abs(TILINGS[kind].basis[0][0] * TILINGS[kind].basis[1][1] - TILINGS[kind].basis[0][1] * TILINGS[kind].basis[1][0]) / m) * 1.6;
  const near = polys.filter((P) => { const q = [0, 1].map((d) => P.reduce((sum, p) => sum + p[d], 0) / P.length); return Math.hypot(q[0] - c[0], q[1] - c[1]) < r; });
  const s = 10 / Math.max(...near.flat().map(([x, y]) => Math.max(Math.abs(x - c[0]), Math.abs(y - c[1]))));
  return near.map((P) => pathEl(`M${P.map(([x, y]) => `${(12 + (x - c[0]) * s).toFixed(1)} ${(12 - (y - c[1]) * s).toFixed(1)}`).join('L')}Z`)).join('');
}
for (const kind of Object.keys(TILINGS)) ICONS[`tiling-${kind}`] = tilingIcon(kind);
const SHAPE_ICONS = { Squares: 'grid', Triangles: 'triangle', Hexagons: 'hexagon', Cairo: 'pentagons', Kites: 'kites', Hats: 'hat', Penrose: 'penrose', Cubes: 'cube', Diamond: 'tetrahedron',
  Cube: 'cube', Torus: 'torus', 'Möbius strip': 'mobius', Tetrahedron: 'tetrahedron', Octahedron: 'octahedron', 'Stella octangula': 'stella',
  Dodecahedron: 'dodecahedron', Sphere: 'icosahedron', Pits: 'walls', 'Klein bottle': 'klein' };
for (const [kind, t] of Object.entries(TILINGS)) SHAPE_ICONS[t.name] = `tiling-${kind}`;
const SHAPE_SHORT = { 'Klein bottle': 'Klein', 'Möbius strip': 'Möbius', 'Stella octangula': 'Stella', Tetrahedron: 'Tetra', Octahedron: 'Octa', Dodecahedron: 'Dodeca' };
// the section's title
const WALK_HEADINGS = { Walk: 'Walk', Ant: "Langton's ant", Life: 'Grid' };
// the values at a level under the choices above it (pre), in the menu's order
const navValues = (level, pre) => [...new Set(Object.values(NAV).filter((n) => pre.every((v, i) => n[i] === v)).map((n) => n[level]))];
// The mode for a choice at a level: the levels above as they are, the ones below kept where they can
// be, else the first (Grid before Cells); in a family, its tiling in use or last chosen
function navPick(level, value) {
  const want = [...NAV[$('mode').value]];
  want[level] = value;
  let best = null, top = -1;
  for (const [w, n] of Object.entries(NAV)) {
    if (n.slice(0, level + 1).some((v, i) => v !== want[i])) continue;
    let score = 0;
    for (let i = level + 1; i < 5; i++) score = score * 4 + (n[i] === want[i] ? 2 : 0) + (i === 4 && n[i] !== 'cells' ? 1 : 0);
    const fam = familyOf(w);
    if (fam && fam.F.modes[fam.F.tabs[fam.F.tab][0]].includes(w)) score += 0.5;
    if (score > top) { best = w; top = score; }
  }
  return best;
}
function navGo(level, value) {
  const w = navPick(level, value);
  if (!w || w === $('mode').value) return;
  const fam = familyOf(w);
  if (fam) torusTurned = fam.F.tabs[fam.F.tab][1];  // the tiling last chosen, turned or not
  if (MODES[w].life && !MODES[$('mode').value].life) {  // the automata start from a random number on the whole surface
    $('formula').value = presetFormula('random');
  }
  $('mode').value = w;
  $('mode').dispatchEvent(new Event('change'));
}

// Surfaces that come in several tilings are one entry each in the list (Torus, Sphere), their
// tiling picked by tabs under the list: modes, its modes per tiling (walks along the grid and on
// cells, ants, Life);
// tabs, [tiling, turned by 30° (see TURNED), icon, name]; tab, the one in use or last chosen
const FAMILIES = [
  { name: 'Torus', modes: [['torusGrid', 'torusWalk', 'lifeTorus', 'torusPivotGrid', 'torusPivot'], ['hexTorusGrid', 'hexTorusWalk', 'lifeHexTorus', 'hexTorusPivot'],
                          ['triTorusGrid', 'triTorusWalk', 'triTorusPivotGrid', 'lifeTriTorus'], ['cairoTorusWalk', 'lifeCairoTorus'], ['lifeKiteTorus']], tab: 0,
    tabs: [[0, false, 'tilesSq', 'Squares'], [3, false, 'pentagons', 'Cairo pentagons'],
           [1, false, 'tilesHex', 'Hexagons'], [1, true, 'tilesHexTurned', 'Hexagons, turned by 30° (columns round the tube)'],
           [2, false, 'tilesTri', 'Triangles'], [2, true, 'tilesTriTurned', 'Triangles, turned by 30° (rows round the tube)'], [4, false, 'kites', 'Kites (each triangle cut in 3)']] },
  { name: 'Möbius strip', modes: [['mobiusGrid', 'mobiusWalk', 'mobiusPivotGrid', 'mobiusPivot', 'lifeMobius'], ['mobiusHexGrid', 'mobiusHexWalk', 'mobiusHexPivot', 'lifeMobiusHex'],
                                 ['mobiusTriGrid', 'mobiusTriWalk', 'mobiusTriPivotGrid', 'lifeMobiusTri'], ['mobiusCairoWalk', 'lifeMobiusCairo'], ['lifeMobiusKite']], tab: 0,
    tabs: [[0, false, 'tilesSq', 'Squares'], [3, false, 'pentagons', 'Cairo pentagons'], [1, false, 'tilesHex', 'Hexagons'], [1, true, 'tilesHexTurned', 'Hexagons, turned by 30° (rows along the strip)'],
           [2, false, 'tilesTri', 'Triangles'], [2, true, 'tilesTriTurned', 'Triangles, turned by 30° (pointing along the strip)'], [4, false, 'kites', 'Kites (each triangle cut in 3)']] },
  { name: 'Klein bottle', modes: [['kleinWalk', 'lifeKlein', 'kleinPivot'], ['kleinCairoWalk', 'lifeKleinCairo'], ['kleinHexWalk', 'lifeKleinHex', 'kleinHexPivot'], ['kleinTriWalk', 'lifeKleinTri'], ['lifeKleinKite']], tab: 0,
    tabs: [[0, false, 'tilesSq', 'Squares'], [1, false, 'pentagons', 'Cairo pentagons'], [2, false, 'tilesHex', 'Hexagons'], [3, false, 'tilesTri', 'Triangles'], [4, false, 'kites', 'Kites (each triangle cut in 3)']] },
  { name: 'Sphere', modes: [['hexSphereGrid', 'hexSphereWalk', 'antHexSphere', 'lifeHexSphere'], ['icosaGrid', 'icosaLR', 'antIcosa', 'lifeIcosa', 'icosaPivotGrid'], ['lifeIcosaKite']], tab: 0,
    tabs: [[0, false, 'tilesHex', 'Hexagons (and 12 pentagons)'], [1, false, 'tilesTri', 'Triangles (an icosahedron, inflated)'], [2, false, 'kites', 'Kites (each triangle cut in 3)']] },
  { name: 'Tetrahedron', modes: [['tetraGrid', 'tetraLR', 'tetraPivotGrid', 'lifeTetra'], ['lifeTetraKite']], tab: 0,
    tabs: [[0, false, 'tilesTri', 'Triangles'], [1, false, 'kites', 'Kites (each triangle cut in 3)']] },
  { name: 'Octahedron', modes: [['octaGrid', 'octaLR', 'octaPivotGrid', 'lifeOcta'], ['lifeOctaKite']], tab: 0,
    tabs: [[0, false, 'tilesTri', 'Triangles'], [1, false, 'kites', 'Kites (each triangle cut in 3)']] },
];
for (const F of FAMILIES) for (const ms of F.modes) ms.push(...ms.filter((w) => w.includes('Pivot')).map((w) => w.replace('Pivot', 'Parity')));  // each tiling's parity walks too
// the family of a walk mode, its tiling there and its tab (null: not in a family)
function familyOf(w) {
  for (const F of FAMILIES) {
    const m = F.modes.findIndex((pair) => pair.includes(w));
    if (m < 0) continue;
    const turnable = !!TURNED[MODES[w].sphere] && !(squareSheet && SQUARE_SHEET[MODES[w].sphere]);
    return { F, m, tab: F.tabs.findIndex(([t, turned]) => t === m && turned === (turnable && torusTurned)) };
  }
  return null;
}
// Langton's ant's settings: by colour or by the digits, each with its rule (presets of its tiling, or typed)
function renderAntRow() {
  const w = $('mode').value, A = ANTS[w];
  $('digitsSection').hidden = (!!A && !antByDigits) || (!!MODES[w].life && plane.start !== 'digits');  // an ant by colour, Life not by the digits: no digit read
  $('populationRow').hidden = w !== 'antSquare';
  if (MODES[w].plane) drawing = plane.start === 'draw';  // Life on the plane draws in its Draw start
  else if (w !== 'antSquare') drawing = false;  // drawing ends with the square ant
  stage.classList.toggle('drawing', drawing);
  $('drawCells').checked = drawing;
  $('clearCells').hidden = !drawing;  // while drawing only
  $('clearCells').disabled = !population.size;
  $('antRow').hidden = !A;
  if ($('antRow').hidden) return;
  $('antColours').classList.toggle('active', !antByDigits);
  $('antDigits').classList.toggle('active', antByDigits);
  $('antPresets').replaceChildren(...(antByDigits ? A.digitPresets : A.presets).map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = r;
    b.classList.toggle('active', r === antRuleOf(w));
    b.addEventListener('click', () => setAntRule(w, r));
    return b;
  }));
  $('antRuleName').textContent = antByDigits ? `Rule, a turn per digit, mirrored on a dark cell: ${Object.keys(A.turns).join(', ')}`
    : `Rule, a turn per colour: ${Object.keys(A.turns).join(', ')}`;
  if (document.activeElement !== $('antRule')) $('antRule').value = antRuleOf(w);
  $('antRule').classList.toggle('custom', !(antByDigits ? A.digitPresets : A.presets).includes(antRuleOf(w)));  // a rule of one's own
}
// a rule typed or picked, by the digits (its base the number of its turns) or by colour
function setAntRule(w, rule) {
  if (!(antByDigits ? antDigitTurnsOf : antTurnsOf)(w, rule)) { $('antRule').value = antRuleOf(w); return; }
  (antByDigits ? antDigitRules : antRules)[w] = rule.toUpperCase().trim();
  renderModePicker();
  compute();
}
function renderModePicker() {
  const w = $('mode').value, [kind, space, shape, rule] = NAV[w];
  modeTab = modeTabOf();
  const button = (html, active, go, title = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = html;
    b.title = title;
    b.classList.toggle('active', active);
    b.addEventListener('click', go);
    return b;
  };
  // at the top: Walk, Ant, Life (while a gallery setup is only shown on hover, the one in use)
  const shownKind = NAV[galleryBefore?.w]?.[0] ?? kind;
  $('modeTabs').replaceChildren(galleryTab(), ...NAV_KINDS.map(([k, pic]) => {
    const b = button(`${icon(pic)} ${k}`, k === shownKind, () => { showPane(false); if (k !== kind) navGo(0, k); });
    b.setAttribute('role', 'tab');
    return b;
  }));
  $('walkHeading').innerHTML = icon({ Walk: 'compass', Ant: 'ant', Life: 'grid' }[kind]) + WALK_HEADINGS[kind];
  // 2D, 3D (the surfaces), Space (a 3D lattice): only those it has (no ant nor automaton in Space)
  $('navSpace').replaceChildren(...NAV_SPACES.filter((sp) => navValues(1, [kind]).includes(sp)).map((sp) => button(SPACE_NAMES[sp], sp === space, () => navGo(1, sp))));
  // the shapes, as pictures with their (short) names
  $('navShapes').replaceChildren(...navValues(2, [kind, space]).map((sh) =>
    button(`${icon(SHAPE_ICONS[sh])}<span>${SHAPE_SHORT[sh] ?? sh}</span>`, sh === shape, () => navGo(2, sh), sh)));
  // a family picked: its tilings as tabs, the same walk (along the grid or on cells) on another one
  const inFamily = familyOf(w);
  if (inFamily) inFamily.F.tab = inFamily.tab;
  $('torusTiles').hidden = !inFamily;
  if (inFamily) {
    const { F, tab } = inFamily;
    // the same kind (walk, ant, Life) on another tiling, along the grid or on cells as now; only the
    // tilings it has
    // (else the same rule on the other side, else its first walk: Cairo pentagons have no grid walk)
    const same = (f) => F.modes[f].find((v) => [0, 3, 4].every((i) => NAV[v][i] === NAV[w][i]))
      ?? F.modes[f].find((v) => [0, 3].every((i) => NAV[v][i] === NAV[w][i])) ?? F.modes[f].find((v) => NAV[v][0] === NAV[w][0]);
    const sheets = F.name === 'Torus' || F.name === 'Möbius strip', square = sheets && squareSheet;
    $('torusTiles').replaceChildren(...F.tabs.flatMap(([f, turned, pic, name], i) => {
      if (!same(f)) return [];
      const b = button(icon(pic), i === tab, () => {
        if (i === tab) return;
        F.tab = i;
        const v = same(f);
        if (v === w) { turnTorus(turned); renderModePicker(); return; }  // the same tiles, turned
        torusTurned = turned;
        $('mode').value = v;
        $('mode').dispatchEvent(new Event('change'));
      }, name);
      b.disabled = square && turned;  // a square sheet: not turned
      return [b];
    }));
    // a torus: from a long sheet (Rectangle, more round the ring than round the tube, its tiles even once
    // rolled up) or a square one (as many round the ring as round the tube, stretched along it)
    $('torusSheet').hidden = !sheets;
    if (sheets) $('torusSheet').replaceChildren(...[[false, 'Rectangle', 'A long sheet: its tiles even once rolled up'], [true, 'Square', 'A square sheet, its tiles stretched along the ring once rolled up (not turned)']]
      .map(([sq, word, title]) => button(word, sq === squareSheet, () => { turnTorus(sq ? false : torusTurned, sq); renderModePicker(); }, title)));
  } else $('torusSheet').hidden = true;
  // the rules, where there are several, each with its picture; in a family, those its tiling has not greyed
  const tiling = inFamily?.F.modes[inFamily.m], has = (...n) => !tiling || tiling.some((v) => n.every((x, i) => NAV[v][[0, 3, 4][i]] === x));
  const rules = navValues(3, [kind, space, shape]), optionOf = (v) => $('mode').querySelector(`option[value="${v}"]`);
  $('navRules').hidden = rules.length < 2;
  $('navRules').replaceChildren(...rules.map((r) => {
    const v = Object.keys(NAV).find((m) => NAV[m].slice(0, 4).join() === [kind, space, shape, r].join());
    const { base } = splitModeLabel(optionOf(v).text), alone = NAV[v][4] === '';  // a spiral: its base here, no Grid | Cells
    const b = button(`<span class="mode-icon">${icon(r === 'Turtle' ? 'turtle' : r === 'Pivot' ? 'pivot' : r === 'Parity' ? 'walk2d' : MODE_ICONS[v])}</span><span><span class="mode-name">${r}</span></span>`  // a turtle for the walks turning relative to their heading
      + (alone && base && !r.includes('base') ? `<span class="mode-base">${base}</span>` : ''), r === rule, () => navGo(3, r));
    b.disabled = !has(kind, r);
    return b;
  }));
  // Grid | Cells (Cube in 3D): each with its base and its digits, or what it is not on (that side off)
  const sides = navValues(4, [kind, space, shape, rule]).filter((s) => has(kind, rule, s));  // (Cairo pentagons: no grid)
  $('walkOn').hidden = sides.includes('');
  const side = (b, s, word, none) => {
    const v = sides.includes(s) ? navPick(4, s) : null, here = NAV[w][4] === s;
    const info = !v ? null : MODES[v].antOf ? { base: '', detail: antByDigits ? `digits ${antDigitRules[v]}` : antRules[v] } : splitModeLabel(optionOf(v).text);
    b.innerHTML = `<span class="walk-on-name">${word}${info?.base ? ` <span class="mode-base">${info.base}</span>` : ''}</span>`
      + `<span class="mode-detail">${info ? info.detail : none}</span>`;
    b.disabled = !v;
    b.classList.toggle('active', here);
  };
  const cellsWord = space === '3D' ? 'Cube' : 'Cells';
  side($('walkOnGrid'), 'grid', 'Grid', 'not on the grid');
  side($('walkOnCells'), 'cells', cellsWord, `not on ${cellsWord.toLowerCase()}s`);
  renderAntRow();
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
  if (mode.sphere) fillSphereSizes(surfaceOf(mode), mode.initial);
  const n = digitsNeeded(), want = mode.life ? n : n + LOOP_AHEAD;  // a walk also reads the digits ahead
  if (!mode.life && !randomPrimeSize()) $('digits').value = n;  // a random prime keeps the count for later
  syncDigitsStepper();
  relabelColours(mode);
  $('automataSection').hidden = !mode.life;  // rule and hunt, for the cellular automata only
  $('planeRow').hidden = !mode.plane;  // Life on the plane: its grid
  $('lifeStartRow').hidden = !mode.life;  // its start: Hunt, Draw (the plane only), Digits
  $('startSection').hidden = !mode.life;
  fitRuleToShape();
  $('colourSection').hidden = !mode.life;
  $('autoPlayRow').hidden = !mode.life;
  renderColours();
  renderRuleSection();
  if (!mode.life) { stopHunt(); $('huntRow').hidden = true; }
  renderPlaneRow();
  // a new number, surface, size or rule ends any hunt: its champion would not fit any more
  $('digitsRow').hidden = !!mode.life;  // Life takes one digit per cell of the surface
  $('sphereRow').hidden = $('sizeRow').hidden = mode.lattice !== 'sphere';  // the size under the tiles; a walk's starts and loops further down
  syncSizeStepper();
  updateRuleText();
  if (worker) { worker.terminate(); worker = null; setBusy(false); }
  const job = ++computeJob;  // a walk built later is this one's only if no other compute came since
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
    // the digits' time, then the walk's (millions of an ant's steps take far longer than its digits)
    const t0 = performance.now();
    buildWalk();
    $('status').textContent = [
      `${how} · Walk built in ${((performance.now() - t0) / 1000).toFixed(2)} s`,
      F.root === 'randprime' && `a random ${fmt(Number(F.ast.args[0].v))}-digit probable prime, found after ${fmt(entry.tests)} Miller–Rabin tests`,
      note,
      entry.uncertain && '⚠ the value is extremely close to a round number: the last digits could be off by one',
    ].filter(Boolean).join(' · ');
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
    done(hit, 'Digits cached');
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
      : `Computing ${sym} in base ${base}…`) +  // the count is beside it
    (slow ? ' (this can take a minute or more)' : '');
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'progress') {
      $('progress').classList.remove('indeterminate');
      $('progressBar').style.width = `${Math.min(100, d.p * 100)}%`;
      $('progressText').textContent = `${Math.floor(Math.min(100, d.p * 100))} %`;
      return;
    }
    worker.terminate();
    worker = null;
    if (d.type === 'error') {
      setBusy(false);
      $('status').textContent = `Formula: ${d.message}`;
      return;
    }
    const entry = { intPart: d.intPart, digits: d.digits, total: d.total, tests: d.tests, uncertain: d.uncertain };
    cache[key] = entry;
    // a long walk (millions of an ant's steps take seconds): the gauge shows first, a frame to paint it,
    // and slides on while the walk is built (the page stops meanwhile)
    const finish = () => {
      if (job !== computeJob) return;
      busy = false;  // the link follows the walk built (the gauge stays on until it is)
      done(entry, `Digits in ${(d.ms / 1000).toFixed(2)} s`);
      setBusy(false);
    };
    if (n < 1e6) { finish(); return; }
    clearTimeout(busyTimer);
    $('digitsRow').classList.add('busy');
    $('progress').classList.add('indeterminate');
    $('progressText').textContent = 'Building the walk…';
    requestAnimationFrame(() => setTimeout(finish, 0));
  };
  worker.postMessage({ ast: F.ast, n: want, base, mag: F.mag, nodes: F.nodes });
}

// While the worker computes, the link waits for the result; past half a second, a gauge takes the
// length's place, until the digits are there and the walk built
let busy = false, busyTimer = 0, computeJob = 0;
function setBusy(on) {
  busy = on;
  $('progressBar').style.width = '0';
  $('progressText').textContent = on ? 'Computing…' : '';
  $('progress').classList.toggle('indeterminate', on);  // a bar sliding along until the worker says how far it is
  clearTimeout(busyTimer);
  if (on) busyTimer = setTimeout(() => $('digitsRow').classList.add('busy'), 500);
  else $('digitsRow').classList.remove('busy');
}

/* ---- 5.3 Building the walk ------------------------------------------------------------------- */
// All positions, distances and counts are computed once into typed arrays: the animation, the
// stats and the jumps only read them.
let previousShape = null;  // the form of the surface just replaced: { target, mode }
// A walk built (a new number, mode, size, start, count of digits…): then the link follows it
function buildWalk() {
  buildWalkOf();
  syncLink();
}
/* A fraction's digits repeat, L of them from digit s0 on: the order of the base modulo the part of the
 * denominator prime to it, after as many digits as the base's factors take out of it (and the head);
 * digit(i): any digit of the number, from the first s0 + L. Null when they are not all at hand. */
function fractionPeriod() {
  if (!current.ratio) return null;
  const b = BigInt(current.base), gcd = (x, y) => (y ? gcd(y, x % y) : x);
  let d = current.ratio[1], pre = 0;
  for (let c = gcd(d, b); c > 1n; c = gcd(d, b)) { d /= c; pre++; }
  if (d > 2_000_000n) return null;
  const q = Number(d);
  let L = 1;
  for (let r = current.base % q; q > 1 && r !== 1; r = (r * current.base) % q) L++;
  const H = current.head, D = current.digits, s0 = H.length + pre + 1;
  if (H.length + D.length < s0 + L) return null;
  return { s0, L, digit: (i) => { const j = i < s0 + L ? i : s0 + ((i - s0) % L); return j < H.length ? H[j] : D[j - H.length]; } };
}
/* A fraction's 2D or 3D walk: once its digits repeat, it goes the same way every L steps, only turned
 * (then as it was after a few times L) or shifted. Its state at a point, all that its next steps
 * depend on but where it is: its last step, its head's turn in 3D (the roll) and its cell's kind
 * (▲ or ▼, a Cairo pentagon's). The first time the state comes back after a whole number of periods,
 * the walk repeats with that period; from the earliest step it holds, and shifted by drift (0: a loop
 * drawn over itself). A loop walked LOOP_ROUNDS times, a drift as far as what it drew before is wide
 * (driftRounds): cap. */
function walkRepeat() {
  const P = fractionPeriod(), most = 2_000_000;
  if (!P || P.s0 + P.L > most) return null;
  const { s0, L, digit } = P, tries = Math.min(24, Math.floor((most - s0) / L)), n = s0 + tries * L;
  const step = STEPPERS[current.mode](), { lattice: lat, cells } = MODES[current.mode], round = (v) => Math.round(v * 1e6);
  const pos = new Float64Array(3 * (n + 1)), code = new Int32Array(n + 1), codes = new Map();
  code[0] = -1;  // the start has no last step
  for (let i = 0; i < n; i++) {
    const [, x, y, z = 0, roll = ''] = step(digit(i)), a = 3 * i;
    pos.set([x, y, z], a + 3);
    const kind = cells && lat !== 'cube' ? cellTemplate(lat, x, y) : '';  // along a grid, the last step tells the corner
    const state = `${round(x - pos[a])} ${round(y - pos[a + 1])} ${round(z - pos[a + 2])} ${roll} ${kind}`;
    if (!codes.has(state)) codes.set(state, codes.size);
    code[i + 1] = codes.get(state);
  }
  let period = 0;
  for (let j = 1; j <= tries && !period; j++) if (code[s0 + j * L] === code[s0]) period = j * L;
  if (!period) return null;
  let from = s0;
  while (from > 1 && code[from - 1] === code[from - 1 + period] && digit(from - 1) === digit(from - 1 + period)) from--;
  const at = (i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]], d = at(from + period).map((v, c) => v - at(from)[c]);
  const shift = Math.hypot(...d), drift = shift > 1e-6;
  let radius = 0;
  for (let i = 0; i <= from; i++) radius = Math.max(radius, Math.hypot(...at(i)));
  const rounds = drift ? driftRounds(radius, shift) : LOOP_ROUNDS;
  return { from, period, drift, rounds, cap: from + rounds * period };
}

function buildWalkOf() {
  previousShape = walk.shape && { target: walk.shape.target, mode: walk.shape.mode };
  visitData = firstVisitData = areaData = null;  // and its cells' visits and areas too
  glClear();  // a surface drawn by WebGL before (see 11.4b)
  fill = null;  // a new walk: its enclosed areas are computed again, and its layer starts empty
  walk.ant = 0; walk.highway = null; walk.bridges = null;  // set by an ant's walk only
  walk.plane = null;  // set by Life on the plane only
  $('fillTooBig').hidden = true;
  fillDone = 0;
  layers.fill.clearRect(0, 0, cw, ch);
  walk.shape = null;  // only tiled surfaces that can change shape get one (see initShape)
  const { head, frac } = digitsInUse();
  const seq = new Uint8Array(head.length + frac.length);
  seq.set(head);
  seq.set(frac, head.length);
  if (MODES[current.mode].life) {
    buildLife(seq, MODES[current.mode]);
    return;
  }
  // a walk that loops takes only the digits of its first round: the count says so (and the link),
  // and the count asked comes back for the next number, surface or start (see compute)
  const loopCount = () => {
    if (walk.loop && walk.n < requestedDigits()) {
      digitsBeforeLoop ??= requestedDigits();
      $('digits').value = walk.n;
    } else if (!walk.loop) digitsBeforeLoop = null;  // a count that does not loop is the one asked
    syncDigitsStepper();
  };
  if (MODES[current.mode].lattice === 'sphere') {
    (MODES[current.mode].grid ? buildGridWalk : buildSphereWalk)(seq, MODES[current.mode], digitsAhead());
    loopCount();
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
  const ant = !!MODES[current.mode].antOf, step = STEPPERS[current.mode]();
  // an ant by its rule: counted by the colour it turned on (each colour its turn), not by digit; by the
  // digits: by the turn it took (left or right), the other way from its digit on a dark cell
  const byColour = ant && !antByDigits, base = byColour ? step.colours : MODES[current.mode].base;
  const counts = new Int32Array(base * (len + 1)), left = ant ? new Uint8Array(len) : null, turns = ant ? new Uint8Array(len) : null;
  const origin = is3d ? key3(0, 0, 0) : key(0, 0), seen = new Set([origin]);
  // a fraction's walk repeats (see walkRepeat), walked 8 rounds; not an ant's, whose state is all its
  // cells, nor a spiral's, whose path the digits do not steer (its sides grow: it never repeats)
  let loop = current.ratio && !ant && !MODES[current.mode].skipZeros ? walkRepeat() : null;
  let steps = loop ? Math.min(len, loop.cap) : len, m = 0, walked = 0, nextLook = 2000;
  // an ant on a highway goes on along it for ever: stopped as far as its cloud is wide (driftRounds;
  // looked for every 2,000 steps, then every 5 % of them so far, and at the end). Its last stretch on
  // fresh cells only, first walked on the highway: not a run along the edge of what it built before (a
  // growing triangle's side), which ends. Followed up to its stop: one that breaks was a bridge back into
  // its cloud (1/67 on squares, from step 14,905,581), and the hunt goes on
  const first = ant ? new Int32Array(len + 1) : null;
  const highway = (n) => {
    const h = highwayOf(wx, wy, n);
    if (!h) return;
    for (let j = n - h.period + 1; j <= n; j++) if (first[j] < h.from) return;
    const dx = wx[h.from + h.period] - wx[h.from], dy = wy[h.from + h.period] - wy[h.from], rounds = driftRounds(maxDist[h.from], Math.hypot(dx, dy));
    loop = { from: h.from, period: h.period, drift: true, rounds, cap: h.from + rounds * h.period, dx, dy };
    steps = Math.min(steps, loop.cap);
  };
  const bridges = [];
  cells[0] = 1;
  for (let i = 0; i < steps; i++) {
    const g = seq[i];
    const [k, x, y, z] = step(g);
    wx[i + 1] = x; wy[i + 1] = y;
    if (is3d) wz[i + 1] = z;
    if (ant) {  // its cells by their first visit, as the ant keeps them (one map over millions of them)
      first[i + 1] = step.first;
      cells[i + 1] = step.cells;
    } else {
      seen.add(k);
      cells[i + 1] = seen.size;
    }
    m = Math.max(m, Math.hypot(x, y, z));
    maxDist[i + 1] = m;
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + (ant ? step.took : g)]++;  // an ant: the turn it took (by the digits) or its cell's colour
    if (ant) { left[i] = step.left; turns[i] = step.turn; }
    walked = i + 1;
    if (ant && loop && walked > loop.from + loop.period
        && (Math.abs(wx[walked] - wx[walked - loop.period] - loop.dx) > 1e-6 || Math.abs(wy[walked] - wy[walked - loop.period] - loop.dy) > 1e-6)) {
      bridges.push({ from: loop.from, to: walked, period: loop.period });  // back into its cloud: not its highway
      loop = null;
      steps = len;
      nextLook = walked - (walked % 2000) + 2000;
    }
    if (ant && !loop && walked === nextLook) { highway(walked); nextLook += Math.max(2000, 2000 * Math.floor(walked / 40000)); }
  }
  if (ant && !loop) highway(steps);
  // an ant's cells, each coloured as it is once the ant has left it (the last one as it would be)
  // an ant's cells, each coloured as it is once the ant has left it (the last one as it would be): by
  // its state (Ink, Amber, Teal), or by the turn it took there (Directions)
  let keys = seq, antStates = null, antTurns = null;
  if (ant) {
    antStates = new Uint8Array(steps); antTurns = new Uint8Array(steps);
    for (let j = 0; j < steps; j++) {
      antStates[j] = j + 1 < walked ? left[j + 1] : step.next();
      antTurns[j] = j + 1 < walked ? turns[j + 1] : step.would(seq[walked] ?? 0);
    }
    keys = antRamp ? antStates : antTurns;
  }
  Object.assign(walk, { vert: null, stepTiles: null, loop, n: steps, digits: seq, wx, wy, wz, is3d, cells, maxDist, base, counts,
                        lattice: MODES[current.mode].lattice, lines: !!MODES[current.mode].lines,
                        skipZeros: !!MODES[current.mode].skipZeros, ant: ant ? step.colours : 0, turns, antStates, antTurns,
                        highway: ant ? highwayOf(wx, wy, steps) : null, bridges,
                        keys, sphere: false, life: null,
                        xs: is3d ? new Float64Array(len + 1) : wx,
                        ys: is3d ? new Float64Array(len + 1) : wy });
  if (is3d) { setPerspective(); project(); } else walk.persp = null;
  loopCount();
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

// Projection of the whole 3D walk (xs, ys), same formula as projectPoint; projected counts them (see glFlat)
let projected = 0;
function project() {
  const { wx, wy, wz, xs, ys } = walk, proj = projector();
  for (let i = 0; i < xs.length; i++) [xs[i], ys[i]] = proj(wx[i], wy[i], wz[i]);
  projected++;
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
// auto-fit followed the walker.) Then recompute the projection; the frame does not change.
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
  includeBox();  // the frame is a sphere round the walk or the solid, whichever way it turns
  needsFull = true;
}

// On a solid, a walk's pattern to keep in front (see faceWalk); elsewhere the camera's default view
const centersPattern = () => { const mode = MODES[$('mode').value]; return SOLIDS.includes(surfaceOf(mode)) && !mode.life; };
function updateHint() {
  $('end').title = Number.isFinite(walk.n) ? 'Jump to end (E)' : `Jump ${fmt(LIFE_JUMP)} generations ahead (E)`;
  $('hint').textContent = walk.is3d  // the mouse on a line, the double-click on the next (see .hint)
    ? `Drag: rotate · Right-drag or Shift+drag: pan · Wheel: zoom\nDouble-click: center, again: ${centersPattern() ? 'centered pattern' : 'default view'}`
    : 'Drag: pan · Wheel: zoom\nDouble-click: auto-fit';
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
// The king's moves, clockwise from north (screen y points down)
const KING_STEPS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

/* The Cairo tiling: equal pentagons, their corners where 4 meet on a square grid (of side CAIRO, so
 * that a pentagon has the area of a square cell), one pentagon across each side of the grid. In each
 * square of the grid a bar joins two corners where 3 pentagons meet, level when i + j is even, upright
 * when odd; each end of a bar joins the square's two nearest corners. A half bar of (√7 − 1)/6 makes
 * all the edges equal. A pentagon: (i, j, o), across the side from corner (i, j) to (i + 1, j) (o = 0)
 * or to (i, j + 1) (o = 1); its type 2·o + the parity of i + j. */
const CAIRO = Math.SQRT2, CAIRO_B = (Math.sqrt(7) - 1) / 6;
function cairoCorners(i, j, o) {  // in grid units, in turn around the pentagon (either way)
  const b = CAIRO_B, odd = (i + j) & 1;
  if (o === 0) return odd ? [[i, j], [i + 0.5, j + 0.5 - b], [i + 1, j], [i + 0.5 + b, j - 0.5], [i + 0.5 - b, j - 0.5]]
                          : [[i, j], [i + 0.5 - b, j + 0.5], [i + 0.5 + b, j + 0.5], [i + 1, j], [i + 0.5, j - 0.5 + b]];
  return odd ? [[i, j], [i + 0.5, j + 0.5 - b], [i + 0.5, j + 0.5 + b], [i, j + 1], [i - 0.5 + b, j + 0.5]]
             : [[i, j], [i + 0.5 - b, j + 0.5], [i, j + 1], [i - 0.5, j + 0.5 + b], [i - 0.5, j + 0.5 - b]];
}
const cairoMiddle = (i, j, o) => { const c = cairoCorners(i, j, o); return [0, 1].map((a) => c.reduce((sum, p) => sum + p[a], 0) / 5); };
const CAIRO_0 = cairoMiddle(0, 0, 0);  // the start's pentagon, at the origin
const cairoCentre = (i, j, o) => cairoMiddle(i, j, o).map((v, a) => (v - CAIRO_0[a]) * CAIRO);
// back from a centre (x, y) to its pentagon: across a level side, its middle halfway along it
function cairoAt(x, y) {
  const X = x / CAIRO + CAIRO_0[0], Y = y / CAIRO + CAIRO_0[1];
  return Math.abs(X - Math.floor(X) - 0.5) < 0.01 ? [Math.floor(X), Math.round(Y), 0] : [Math.round(X), Math.floor(Y), 1];
}
const cairoType = (i, j, o) => 2 * o + ((i + j) & 1);
// per type: the corners around the centre (CELL_TEMPLATES), the pentagon across each edge and the
// edge it comes in by, and, for each edge come in by, the 4 others from the leftmost to the rightmost
const CAIRO_TYPES = [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]].map(([i, j, o]) => {
  const corners = cairoCorners(i, j, o), m = cairoMiddle(i, j, o), near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
  const across = corners.map((p, k) => {
    const q = corners[(k + 1) % 5];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const o2 of [0, 1]) {
      if (!di && !dj && o2 === o) continue;
      const c = cairoCorners(i + di, j + dj, o2), e = c.findIndex((r, n) => near(r, q) ? near(c[(n + 1) % 5], p) : near(r, p) && near(c[(n + 1) % 5], q));
      if (e >= 0) return [di, dj, o2, e];
    }
  });
  const mid = (k) => [0, 1].map((a) => (corners[k][a] + corners[(k + 1) % 5][a]) / 2 - m[a]);
  const turns = corners.map((p, k) => {
    const [hx, hy] = mid(k).map((v) => -v);  // heading in, from the edge to the centre
    const angle = (e) => { const [ex, ey] = mid(e); return Math.atan2(hx * ey - hy * ex, hx * ex + hy * ey); };
    return [1, 2, 3, 4].map((d) => (k + d) % 5).sort((e, f) => angle(e) - angle(f));  // screen y down: left first
  });
  return { template: corners.map((p) => [(p[0] - m[0]) * CAIRO, (p[1] - m[1]) * CAIRO]), across, turns };
});
// spiral: round the pentagons walked, out through the leftmost edge to one not walked yet (as Ulam's
// spiral round the squares), the digits only telling which steps are drawn
function cairoStepper(spiral = false) {
  let i = 0, j = 0, o = 0, k = 0;  // the pentagon, the edge come in by
  const walked = new Set([key(0, 0)]);
  return (g) => {
    const T = CAIRO_TYPES[cairoType(i, j, o)];
    if (spiral) g = Math.max(0, T.turns[k].findIndex((e) => { const [di, dj, o2] = T.across[e]; return !walked.has(key(2 * (i + di) + o2, j + dj)); }));
    const [di, dj, o2, e] = T.across[T.turns[k][g]];
    i += di; j += dj; o = o2; k = e;
    if (spiral) walked.add(key(2 * i + o, j));
    const [x, y] = cairoCentre(i, j, o);
    return [key(2 * i + o, j), x, y, 0];
  };
}

/* A population: the cells coloured before the first step (drawn by hand, for the square ant), key(x, y)
 * → its colour (1 and up; 0, the background, is not kept). In a link as Golly's multi-state RLE, the
 * format of LifeWiki: "X,Y:rle", (X, Y) the top left cell from the start, then its rows, each a run of
 * cells, "." none, "A"… "X" colours 1… 24 ("pA"… beyond), a count before a run of more than one,
 * "$" the next row (a count before for empty ones), "!" the end: "40,-12:3A.B$2.CA!" */
let population = new Map();
const cellXY = (k) => [Math.floor(k / 2 ** 22) - 2 ** 21, (k % 2 ** 22) - 2 ** 21];  // key's inverse
const rleState = (c) => (c === 0 ? '.' : c <= 24 ? String.fromCharCode(64 + c) : String.fromCharCode(112 + Math.floor((c - 25) / 24)) + String.fromCharCode(65 + ((c - 25) % 24)));
function populationRle(pop) {
  if (!pop.size) return '';
  let x0 = Infinity, y0 = Infinity, y1 = -Infinity;
  for (const k of pop.keys()) { const [x, y] = cellXY(k); x0 = Math.min(x0, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const rows = Array.from({ length: y1 - y0 + 1 }, () => []);
  for (const [k, c] of pop) { const [x, y] = cellXY(k); rows[y - y0][x - x0] = c; }
  const run = (n, t) => (n > 1 ? n : '') + t;
  let out = '', blank = 0;
  for (const row of rows) {
    if (!row.length) { blank++; continue; }
    if (out || blank) out += run(blank + (out ? 1 : 0), '$');
    blank = 0;
    for (let x = 0; x < row.length;) {
      const c = row[x] ?? 0;
      let n = 1;
      while ((row[x + n] ?? 0) === c && x + n < row.length) n++;
      out += run(n, rleState(c));
      x += n;
    }
  }
  return `${x0},${y0}:${out}!`;
}
function populationOf(text) {
  const pop = new Map(), m = /^(-?\d+),(-?\d+):(.*)$/.exec(text ?? '');
  if (!m) return pop;
  let x = +m[1], y = +m[2], n = '';
  const s = m[3];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\d/.test(ch)) { n += ch; continue; }
    const count = n ? +n : 1;
    n = '';
    if (ch === '!') break;
    if (ch === '$') { y += count; x = +m[1]; continue; }
    let c = ch === '.' || ch === 'b' ? 0 : ch === 'o' ? 1 : ch >= 'A' && ch <= 'X' ? ch.charCodeAt(0) - 64 : -1;
    if (ch >= 'p' && ch <= 'y') c = 25 + 24 * (ch.charCodeAt(0) - 112) + (s.charCodeAt(++i) - 65);
    if (c < 0) continue;
    for (let j = 0; j < count; j++, x++) if (c) pop.set(key(x, y), c);
  }
  return pop;
}

/* Langton's ant: on each cell it turns by the cell's colour, one turn per colour (Colours), or by the
 * digit, one turn per digit, mirrored on a dark cell (Digits: left and right swap, straight on stays); the
 * cell it leaves takes the next colour. Per tiling: the turtle walk it goes through the cells with (a
 * turn: its digit) and their arrows, its turns, and rules to start from, by the digits and by colour. */
const ANTS = {
  antSquare: { arrows: '←↑→', inner: () => STEPPERS.turtle(), turns: { L: 0, N: 1, R: 2 }, digitPresets: ['LR', 'LNR'], presets: ['RL', 'RLR', 'LLRR', 'LRRRRRLLR', 'RRLLLRLLLRRR'] },
  antTri: { arrows: '↖↗', inner: () => triStepper('lr'), turns: { L: 0, R: 1 }, digitPresets: ['LR'], presets: ['RL', 'RRL', 'RLL', 'RRLL'] },
  antHex: { arrows: '↙↖↑↗↘', inner: () => hexStepper('relative'), turns: { L2: 0, L1: 1, N: 2, R1: 3, R2: 4 }, digitPresets: ['L1 R1', 'L1 N R1', 'L2 L1 R1 R2', 'L2 L1 N R1 R2'],
            presets: ['L1 R1', 'L2 R2', 'L1 L2 R1', 'R2 L1 N L1 R2'] },
  // on a surface, the walk it goes through the cells with is the surface's (see buildSphereWalk)
  antHexSphere: { arrows: '↖↗', inner: null, turns: { L: 0, R: 1 }, digitPresets: ['LR'], presets: ['RL', 'RRL', 'RLL', 'RRLL'] },
  antIcosa: { arrows: '↖↗', inner: null, turns: { L: 0, R: 1 }, digitPresets: ['LR'], presets: ['RL', 'RRL', 'RLL', 'RRLL'] },
  antCube: { arrows: '←↑→', inner: null, turns: { L: 0, N: 1, R: 2 }, digitPresets: ['LR', 'LNR'], presets: ['RL', 'RLR', 'LLRR', 'LRRRRRLLR', 'RRLLLRLLLRRR'] },
  antCairo: { arrows: '↙↖↗↘', inner: () => cairoStepper(), turns: { L2: 0, L1: 1, R1: 2, R2: 3 }, digitPresets: ['L1 R1', 'L2 R2', 'L2 L1 R1 R2'], presets: ['L1 R1', 'L2 R2', 'L1 R2', 'L2 L1 R1 R2'] },
};
const antRules = Object.fromEntries(Object.entries(ANTS).map(([w, A]) => [w, A.presets[0]]));
const antDigitRules = Object.fromEntries(Object.entries(ANTS).map(([w, A]) => [w, A.digitPresets[0]]));
let antByDigits = false;
const MIRROR = { L: 'R', R: 'L', N: 'N', L1: 'R1', R1: 'L1', L2: 'R2', R2: 'L2' };
const turnWords = (rule) => rule.toUpperCase().match(/[LR][12]?|N/g) ?? [];
// by the digits, a rule's turns, one per digit: different turns, each with its mirror among them (so that
// a dark cell turns the ant by one of them), or null; the base it reads the digits in
function antDigitTurnsOf(w, rule) {
  const words = turnWords(rule);
  if (words.join('') !== rule.toUpperCase().replace(/\s+/g, '') || words.length < 2 || new Set(words).size < words.length) return null;
  return words.every((t) => ANTS[w].turns[t] !== undefined && words.includes(MIRROR[t])) ? words : null;
}
const antBase = (w) => (antByDigits ? turnWords(antDigitRules[w]).length : 2);
const antRuleOf = (w) => (antByDigits ? antDigitRules[w] : antRules[w]);
// a walk's arrows, one per digit (an ant's: per turn of the walk it goes through the cells with), none: []
const ARROW_LISTS = {};
const arrowsOf = (w) => (ARROW_LISTS[w] ??= [...((MODES[w].antOf ? ANTS[w] : MODES[w]).arrows ?? '')]);
// a rule's turns (the turtle walk's digits), or null when it is not one: 2 to 12 of the tiling's turns
function antTurnsOf(w, rule) {
  const A = ANTS[w], words = turnWords(rule);
  if (words.join('') !== rule.toUpperCase().replace(/\s+/g, '') || words.length < 2 || words.length > 12) return null;
  const turns = words.map((t) => A.turns[t]);
  return turns.every((t) => t !== undefined) ? turns : null;
}
// a turn in words, for the Play card's chips (L, R on squares and triangles; L1, R1 on hexagons and pentagons)
const TURN_WORDS = { L: 'left', R: 'right', N: 'straight', L1: 'left', R1: 'right', L2: 'sharp left', R2: 'sharp right' };
const antRuleText = (w) => antByDigits
  ? `turning by the digit, mirrored on a dark cell (left and right swap), which changes colour as the ant leaves it: ${turnWords(antDigitRules[w]).map((t, d) => `<b>${d}</b> ${TURN_WORDS[t]}`).join(', ')}`
  : `turning by the colour of its cell, which then takes the next one: ${turnWords(antRules[w]).map((t, c) => `<b>${c}</b> ${TURN_WORDS[t]}`).join(', ')}`;
// an ant by its rule: one chip per colour, its digits unused
const antColours = (w) => (MODES[w].antOf && !antByDigits ? antTurnsOf(w, antRules[w]).length : 0);
// the step: turned, the colour of the cell it turned on; left, the colour it gave it; first, the step
// the cell it is now on was first walked; cells, how many it walked; next(), the colour the cell it is
// on would take. Its cells in one map, each its first step × 16 + its colour (12 colours at most)
// inner: the walk it goes through the cells with (a turn → [the cell it comes to, …]); here: its first cell
// pop: the cells coloured before the first step (see population), each as it is until the ant comes
function antStepper(w, inner = ANTS[w].inner(), here = key(0, 0), pop = null) {
  const A = ANTS[w], turns = antTurnsOf(w, antRules[w]), k = antByDigits ? 2 : turns.length;
  const words = turnWords(antDigitRules[w]);
  // by the digits: the turn digit g gives on a cell of colour c (mirrored on a dark one), as its index in the rule
  const took = (g, c) => (c ? words.indexOf(MIRROR[words[g]]) : g);
  let n = 0;
  const colourOf = (cell) => (pop?.get(cell) ?? 0) % k;
  const cells = new Map([[here, colourOf(here)]]);
  const step = (g) => {
    const v = cells.get(here), c = v % 16;
    step.turned = c;
    step.left = (c + 1) % k;
    cells.set(here, v - c + step.left);
    step.took = antByDigits ? took(g, c) : c;  // the chip it counts in: the turn it takes (by the digits) or its cell's colour
    step.turn = antByDigits ? A.turns[words[step.took]] : turns[c];  // the turn it takes (its walk's digit)
    const r = inner(step.turn);
    here = r[0];
    n++;
    let u = cells.get(here);
    if (u === undefined) cells.set(here, (u = n * 16 + colourOf(here)));
    step.first = Math.floor(u / 16);
    step.cells = cells.size;
    return r;
  };
  step.colours = k;
  step.next = () => ((cells.get(here) % 16) + 1) % k;
  step.would = (g) => { const c = cells.get(here) % 16; return antByDigits ? A.turns[words[took(g, c)]] : turns[c]; };  // the turn it would take
  return step;
}
// A highway: the walk ends repeating a stretch of p steps, each one shifted by the same (dx, dy) ≠ 0,
// over 1,000 steps at least (and 8 stretches, LOOP_ROUNDS): not a mere straight run through the mess; from its first step
function highwayOf(xs, ys, n) {
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  for (let p = 1; p <= n / LOOP_ROUNDS && p <= 100000; p++) {  // up to 100,000 steps: by the digits, a stretch can take many of their periods (1/53 on squares: 57,980)
    const dx = xs[n] - xs[n - p], dy = ys[n] - ys[n - p];
    if (same(dx, 0) && same(dy, 0)) continue;
    let i = n - p;
    while (i > 0 && same(xs[i - 1 + p] - xs[i - 1], dx) && same(ys[i - 1 + p] - ys[i - 1], dy)) i--;
    if (n - i >= Math.max(LOOP_ROUNDS * p, 1000)) return { from: i, period: p };
  }
  return null;
}

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
  king() {
    let x = 0, y = 0;
    return (g) => {
      x += KING_STEPS[g][0]; y += KING_STEPS[g][1];
      return [key(x, y), x, y, 0];
    };
  },
  cairo: () => cairoStepper(),
  antSquare: () => antStepper('antSquare', undefined, undefined, population),
  antTri: () => antStepper('antTri'),
  antHex: () => antStepper('antHex'),
  antCairo: () => antStepper('antCairo'),
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
  turtleCells: () => STEPPERS.turtle(),     // squares: the same steps, the grid half a cell away
  cardinalCells: () => STEPPERS.cardinal(),
  triTurtle: () => hexStepper('relative'),  // along triangles: the steps of hexagon cells (see MODES)
  triFixed: () => hexStepper('fixed'),
  hexTurtle: () => triStepper('lr'),        // along hexagons: the steps of triangle cells
  hexFixed: () => triStepper('fixed'),
  triTurtleCells: () => triStepper('lr'),
  triFixedCells: () => triStepper('fixed'),
  hexTurtleCells: () => hexStepper('relative'),
  hexFixedCells: () => hexStepper('fixed'),
  squareParity: () => parityStepper('squareParity'), squareParityCells: () => parityStepper('squareParityCells'),
  triParity: () => parityStepper('triParity'), hexParityCells: () => parityStepper('hexParityCells'),
  squarePivot: () => pivotStepper('squarePivot'), squarePivotCells: () => pivotStepper('squarePivotCells'),
  triPivot: () => pivotStepper('triPivot'), hexPivotCells: () => pivotStepper('hexPivotCells'),
  triSpiral: () => triStepper('spiral'),
  hexSpiral: () => hexStepper('spiral'),
  cairoSpiral: () => cairoStepper(true),
  cubeRel: () => cubeStepper(true),
  cubeFixed: () => cubeStepper(false),
  cubeRelCells: () => cubeStepper(true),
  cubesPivot: () => cubePivotStepper(), cubesPivotCells: () => cubePivotStepper(),
  cubeFixedCells: () => cubeStepper(false),
  diag: () => diagStepper(),
  diagCells: () => diagStepper(),
  diamond: () => diamondStepper(),
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
    return [key3(x, y, z), x, y, z, relative ? u.join() : ''];  // and the roll, for walkRepeat
  };
}

// A parity walk in 2D: its heading one of the fixed walk's directions, clockwise; the heading and the
// digit's parity come last (as a cube's roll, see walkRepeat)
function parityStepper(w) {
  const { steps, parity: n } = MODES[w], step = STEPPERS[steps]();
  let h = 0, k = 0;
  return (g) => {
    const at = step(h);
    k++;
    if (g) h = (h + (k % 2 ? 1 : n - 1)) % n;
    return [...at, `${h} ${k % 2}`];
  };
}

// A pivot walk in 3D cubes: 0 a step forward, 1 a quarter turn right, 2 a quarter turn up, both on the
// spot; its heading and its head (for walkRepeat) come last
function cubePivotStepper() {
  let x = 0, y = 0, z = 0, f = [0, 1, 0], u = [0, 0, 1];  // facing north, head up
  return (g) => {
    if (g === 1) f = cross(f, u);  // right
    else if (g === 2) [f, u] = [u, neg(f)];  // up
    else { x += f[0]; y += f[1]; z += f[2]; }
    return [key3(x, y, z), x, y, z, `${f} ${u}`];
  };
}

// Along the diagonals: digit (b2 b1 b0) in binary, the signs of the step (x, y, z)
function diagStepper() {
  let x = 0, y = 0, z = 0;
  return (g) => {
    x += g & 4 ? 1 : -1; y += g & 2 ? 1 : -1; z += g & 1 ? 1 : -1;
    return [key3(x, y, z), x, y, z];
  };
}

/* Diamond: each atom bonded to 4, along (±1, ±1, ±1) with an even number of minus signs, or along
 * their opposites (the other half of the atoms). Coming along d, the 3 bonds ahead: 1 the bond before
 * d again (trans: the zigzag goes on in its plane), 0 and 2 the gauche ones, on either side of it. */
const DIAMOND_BONDS = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
function diamondStepper() {
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  let x = 0, y = 0, z = 0, p = [1, -1, -1], d = [-1, -1, -1];  // the last two bonds
  return (g) => {
    const back = neg(d), bonds = DIAMOND_BONDS.some((b) => same(b, back)) ? DIAMOND_BONDS : DIAMOND_BONDS.map(neg);
    const side = cross(p, d), turn = (e) => side[0] * e[0] + side[1] * e[1] + side[2] * e[2];
    const e = g === 1 ? p : bonds.find((b) => !same(b, back) && !same(b, p) && (g === 0) === turn(b) > 0);
    [p, d] = [d, e];
    x += e[0]; y += e[1]; z += e[2];
    return [key3(x, y, z), x, y, z, p.join()];  // and the bond before, for walkRepeat
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

// A pivot walk in 2D: its heading one of the fixed walk's directions, clockwise; 1 turns it, in place.
// The heading comes last (as a cube's roll): a fraction's loop is found by it too (see walkRepeat)
function pivotStepper(w) {
  const { steps, pivot } = MODES[w], step = STEPPERS[steps]();
  let h = 0, at = [key(0, 0), 0, 0, 0];
  return (g) => { if (g) h = (h + 1) % pivot; else at = step(h); return [...at.slice(0, 4), h]; };
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
// outwardRef(centre) gives a vector pointing outwards near a tile (default: from the solid's centre);
// null keeps the tiles as listed (the Möbius strip has no outside)
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
    const ref = outwardRef && outwardRef(m.map((v) => v / sides));
    const inward = !!ref && nrm[0] * ref[0] + nrm[1] * ref[1] + nrm[2] * ref[2] < 0;  // no ref: as listed
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

/* Cube with pits: each face of the cube (n × n squares, n a multiple of 6) with a pit in its middle,
 * a third of the face wide and a sixth deep (as deep as wide, two pits would meet inside the cube,
 * along the edges of its core): the face's 8 outer ninths, the pit's 4 walls and its floor, 11
 * ninths a face. Still a sphere, but with 5 squares round each corner of a pit's rim (a saddle: 9
 * neighbours) and 3 round each corner of its floor. Concave: drawn tile by tile. */
function cubePits(n) {
  const key = `pits${n}`;
  if (meshCache[key]) return meshCache[key];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  const { verts, add } = vertexStore(), quads = [], a = n / 3, c = (i) => (2 * i) / n - 1;  // c: a grid line as a coordinate
  const floors = [];  // each face's pit floor, row by row: its tiles (Patterns go there)
  for (const [N, U, W] of faces) {
    const at = (h, i, j) => add(...[0, 1, 2].map((d) => N[d] * h + U[d] * c(i) + W[d] * c(j)));  // h: the height, 1 on the face
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i >= a && i < 2 * a && j >= a && j < 2 * a) continue;  // the pit's mouth
      quads.push([at(1, i, j), at(1, i + 1, j), at(1, i + 1, j + 1), at(1, i, j + 1)]);
    }
    const h = (k) => 1 - (2 * k) / n;  // k squares deep
    const deep = a / 2, floor = h(deep);
    for (let i = a; i < 2 * a; i++) for (let j = a; j < 2 * a; j++) { floors.push(quads.length); quads.push([at(floor, i, j), at(floor, i + 1, j), at(floor, i + 1, j + 1), at(floor, i, j + 1)]); }  // the floor
    for (let k = 0; k < deep; k++) for (let m = a; m < 2 * a; m++) {  // the 4 walls
      quads.push([at(h(k), a, m), at(h(k), a, m + 1), at(h(k + 1), a, m + 1), at(h(k + 1), a, m)]);
      quads.push([at(h(k), 2 * a, m), at(h(k), 2 * a, m + 1), at(h(k + 1), 2 * a, m + 1), at(h(k + 1), 2 * a, m)]);
      quads.push([at(h(k), m, a), at(h(k), m + 1, a), at(h(k + 1), m + 1, a), at(h(k + 1), m, a)]);
      quads.push([at(h(k), m, 2 * a), at(h(k), m + 1, 2 * a), at(h(k + 1), m + 1, 2 * a), at(h(k + 1), m, 2 * a)]);
    }
  }
  // outwards: off the solid. On the cube's faces, from its middle; in a pit, from the floor up (its axis:
  // the largest coordinate, at two thirds), from a wall towards the pit's middle (the coordinate at a third)
  const out = (m) => {
    const ax = [0, 1, 2].sort((p, q) => Math.abs(m[q]) - Math.abs(m[p]))[0];
    if (Math.abs(m[ax]) > 1 - 1e-6) return m;
    if (Math.abs(Math.abs(m[ax]) - 2 / 3) < 1e-6 && [0, 1, 2].every((d) => d === ax || Math.abs(m[d]) < 1 / 3 - 1e-6)) return m.map((v, d) => (d === ax ? v : 0));
    const b = [0, 1, 2].find((d) => d !== ax && Math.abs(Math.abs(m[d]) - 1 / 3) < 1e-6);
    return m.map((v, d) => (d === b ? -v : 0));
  };
  const mesh = finishMesh(verts, quads, 4, n, out);
  mesh.concave = true;
  mesh.floors = Int32Array.from(floors);  // face f's floor tile (r, c): floors[f a² + r a + c]
  mesh.floorSize = a;
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
/* Dodecahedron: its 12 pentagons, each cut into 5 triangles from its centre (corners shared by 6
 * triangles, of 3 pentagons; the centres by 5, flat). Its corners: (±1, ±1, ±1), (0, ±φ, ±1/φ) and
 * their cyclic turns (the icosahedron's dual as written above); a pentagon's 5 are the nearest to one
 * of the icosahedron's corners. */
POLYHEDRA.dodeca = (() => {
  const P = [];
  for (const a of [1, -1]) for (const b of [1, -1]) {
    for (const c of [1, -1]) P.push([a, b, c]);
    P.push([0, a * PHI, b / PHI], [a / PHI, 0, b * PHI], [a * PHI, b / PHI, 0]);
  }
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], faces = [];
  for (const n of POLYHEDRA.icosa.P) {
    const top = Math.max(...P.map((p) => dot(p, n))), ring = P.map((_, i) => i).filter((i) => dot(P[i], n) > top - 1e-9);
    const c = [0, 1, 2].map((d) => ring.reduce((sum, i) => sum + P[i][d], 0) / 5), u = P[ring[0]].map((x, d) => x - c[d]), v = cross(n, u);
    ring.sort((i, j) => Math.atan2(dot(P[i], v), dot(P[i], u) - dot(c, u)) - Math.atan2(dot(P[j], v), dot(P[j], u) - dot(c, u)));
    P.push(c);
    ring.forEach((i, k) => faces.push([P.length - 1, i, ring[(k + 1) % 5]]));
  }
  return { P, faces, corners: 20 };  // the solid's corners: the first 20 (then the pentagons' centres)
})();
/* Stella octangula (two tetrahedra, crossed): its outside, an octahedron with a small tetrahedron on
 * each face, 24 equilateral triangles; 3 meet at a tip, 8 at a corner of the octahedron (480°:
 * a saddle). It turns as the octahedron does: its starts are found on the octahedron's 6 corners
 * and 8 faces (towards the tips). Not convex: drawn tile by tile, far to near (see drawSphere). */
POLYHEDRA.stella = (() => {
  const P = [...POLYHEDRA.octa.P], faces = [];
  for (const [a, b, c] of POLYHEDRA.octa.faces) {
    const tip = [0, 1, 2].map((d) => P[a][d] + P[b][d] + P[c][d]);  // (±1, ±1, ±1): the cube's corner over the face
    P.push(tip);
    faces.push([P.length - 1, a, b], [P.length - 1, b, c], [P.length - 1, c, a]);
  }
  return { P, faces, corners: 6, concave: true };
})();

// kites: each triangle cut in 3 (see kitesOf); round a corner of the solid, a flower of 3, 4 or 5 kites (not 6)
function flatPolyhedron(name, f, kites = false) {
  const key = `${kites ? 'kite' : ''}${name}${f}`;
  if (meshCache[key]) return meshCache[key];
  const { P, faces } = POLYHEDRA[name];
  const { verts, add } = vertexStore();
  const tris = [];
  for (const [A, B, C] of faces.map((face) => face.map((v) => P[v]))) {
    const at = ([i, j]) => add(...[0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f));
    const put = (c) => { for (const t of kites ? kitesOf(c) : [c]) tris.push(t.map(at)); };  // (i, j): the face's own grid
    for (let i = 0; i < f; i++) {
      for (let j = 0; i + j < f; j++) {
        put([[i, j], [i + 1, j], [i, j + 1]]);
        if (i + j < f - 1) put([[i + 1, j], [i + 1, j + 1], [i, j + 1]]);
      }
    }
  }
  const mesh = finishMesh(verts, tris, kites ? 4 : 3, f);
  // each face as one big triangle, with its three families of grid lines, for cheap drawing
  mesh.faces = faces.map((face) => {
    const [A, B, C] = face.map((v) => P[v]);
    const mix = (p, q, t) => [0, 1, 2].map((d) => p[d] + (q[d] - p[d]) * t);
    const lines = [];
    for (let i = 0; i <= f; i++) {
      const t = i / f;
      lines.push([mix(A, B, t), mix(A, C, t)], [mix(B, A, t), mix(B, C, t)], [mix(C, A, t), mix(C, B, t)]);
    }
    if (kites) {  // and in each triangle, from its middle to its sides' middles
      const at = (i, j) => [0, 1, 2].map((d) => (A[d] * (f - i - j) + B[d] * i + C[d] * j) / f);
      const spokes = (c) => { const m = [0, 1].map((d) => (c[0][d] + c[1][d] + c[2][d]) / 3); for (let k = 0; k < 3; k++) lines.push([at(...m), at((c[k][0] + c[(k + 1) % 3][0]) / 2, (c[k][1] + c[(k + 1) % 3][1]) / 2)]); };
      for (let i = 0; i < f; i++) for (let j = 0; i + j < f; j++) {
        spokes([[i, j], [i + 1, j], [i, j + 1]]);
        if (i + j < f - 1) spokes([[i + 1, j], [i + 1, j + 1], [i, j + 1]]);
      }
    }
    const m = [0, 1, 2].map((d) => A[d] + B[d] + C[d]);
    let normal = cross(A.map((v, d) => B[d] - v), A.map((v, d) => C[d] - v));
    if (normal[0] * m[0] + normal[1] * m[1] + normal[2] * m[2] < 0) normal = normal.map((v) => -v);
    const l = Math.hypot(...normal);
    return { corners: [A, B, C], normal: normal.map((v) => v / l), lines };
  });
  mesh.perFace = (kites ? 3 : 1) * f * f;
  mesh.kite = kites;
  // faces cut from the solid's own (the dodecahedron's pentagons): its corners and its faces' centres
  const n = POLYHEDRA[name].corners;
  if (n) mesh.solid = { corners: P.slice(0, n).map(unit), centres: P.slice(n).map(unit) };
  mesh.concave = !!POLYHEDRA[name].concave;
  return (meshCache[key] = mesh);
}

/* ---- 7.4 Torus ------------------------------------------------------------------------------- */
/* Torus (a ring or "donut"): nu × nv squares, nu around the ring and nv around the tube, with
 * major radius 1 and tube radius TORUS_TUBE. Every square has 4 edge neighbours and 8 corner
 * neighbours with no exception: it is the square grid that wraps around both ways. */
const TORUS_TUBE = 0.4;
// a length round a torus or along a Möbius strip, from its proportions: the nearest multiple of 12, so that
// the blocks of 2, 3, 4, 6 and 12 colours divide it (and their middles fall on whole tiles)
const twelve = (x) => 12 * Math.max(1, Math.round(x / 12));

/* Grid point (i, j) of an nu × nv torus, rolled up by m ∈ [0, 1]: at m = 0 a flat rectangle
 * (2π by 2π·TUBE, in the x–z plane), at m = 1 the torus. The rectangle first curls into a tube
 * (m from 0 to ½: its short side bends into a circle), then the tube bends into a ring (½ to 1).
 * Bending a length L into an arc of a circle whose circumference is L / k keeps lengths along it. */
function torusPoint(i, j, nu, nv, m, flatWidth = 1) {  // flatWidth: the flat sheet's length, as a share of 2π
  const b = Math.min(1, 2 * m), c = Math.max(0, 2 * m - 1);  // tube bend, then ring bend
  // flat, the sheet lies in the north–east plane: i towards the east, j towards the north; a sheet
  // shorter than the ring (flatWidth < 1) stretches to it as it bends round (its tiles too)
  const X = (i / nu - 0.5) * 2 * Math.PI * (flatWidth + (1 - flatWidth) * c), Y = (j / nv - 0.5) * 2 * Math.PI * TORUS_TUBE;
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

/* ---- Klein bottle ----
 * A torus whose sheet is glued with its ends turned over: (x + nu, y) ≡ (x, nv − y), as the Möbius strip's,
 * and (x, y + nv) ≡ (x, y). One-sided and closed; in space it must cross itself: the figure-8 immersion,
 * its tube's cross-section a figure 8 that turns half a turn round the ring (the ends meet turned over),
 * crossing itself along the circle through the 8's middle. Flat (m = 0) as the torus's sheet. */
function kleinPoint(x, y, nu, nv, m) {
  const t = (x / nu - 0.5) * 2 * Math.PI, f = (y / nv) * 2 * Math.PI, a = TORUS_TUBE, c = Math.cos(t / 2), s = Math.sin(t / 2);
  const r = 1 + a * (c * Math.sin(f) - s * Math.sin(2 * f)), K = [r * Math.sin(t), -r * Math.cos(t), a * (s * Math.sin(f) + c * Math.sin(2 * f))];
  if (m >= 1) return K;
  const F = torusPoint(x, y, nu, nv, 0);
  return F.map((v, d) => v + (K[d] - v) * m);
}
// Its tiles as the torus's (squares, hexagons, triangles, Cairo pentagons; tiles in the same order), their
// corners one vertex per point of the bottle, found by their place on the sheet (not in space: it crosses
// itself, and the points where it does are two)
const kleinColumns = { klein: (nv) => twelve(nv / TORUS_TUBE), kleinHex: (nv) => hexTorusColumns(nv), kleinTri: (nv) => twelve((nv * Math.sqrt(3)) / (2 * TORUS_TUBE)),
  kleinCairo: (nv) => twelve(nv / TORUS_TUBE) + 1 };  // Cairo: an odd length, so that the ends turned over keep the tiling
kleinColumns.kleinKite = kleinColumns.kleinTri;  // kites: the triangles', each cut in 3
function kleinMesh(kind, nv, nu = kleinColumns[kind](nv)) {
  const key = `${kind}${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
  const tiles = [], H = Math.sqrt(3) / 2;
  if (kind === 'klein') for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) tiles.push([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]);
  if (kind === 'kleinHex') for (let c = 0; c < nu; c++) for (let r = 0; r < nv; r++) {
    const cj = r + (c % 2) / 2;
    tiles.push([0, 1, 2, 3, 4, 5].map((k) => [c + Math.cos((k * Math.PI) / 3) / 1.5, cj + Math.sin((k * Math.PI) / 3) / Math.sqrt(3)]));
  }
  if (kind === 'kleinTri' || kind === 'kleinKite') {
    const P = (i, j) => [i + (j % 2) / 2, j];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (j % 2 === 0) tiles.push([P(i, j), P(i + 1, j), P(i, j + 1)], [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]);
      else tiles.push([P(i, j), P(i + 1, j), P(i + 1, j + 1)], [P(i, j), P(i + 1, j + 1), P(i, j + 1)]);
    }
  }
  if (kind === 'kleinKite') tiles.splice(0, tiles.length, ...tiles.flatMap(kitesOf));
  if (kind === 'kleinCairo') for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) for (const o of [0, 1]) {
    const c = cairoCorners(i, j, o);
    tiles.push(c.reduce((a, [x, y], q) => a + x * c[(q + 1) % 5][1] - c[(q + 1) % 5][0] * y, 0) < 0 ? c.reverse() : c);
  }
  const ids = new Map(), verts = [], r6 = (v) => Math.round(v * 1e6) / 1e6;
  const id = (x0, y0) => {  // the point's place on the sheet, brought within it
    let x = r6(x0), y = r6(y0);
    const k = Math.floor(x / nu);
    x = r6(x - k * nu);
    if (k % 2) y = r6(nv - y);
    y = r6(((y % nv) + nv) % nv);
    const key = `${x},${y}`;
    if (!ids.has(key)) { ids.set(key, verts.length / 3); verts.push(...kleinPoint(x0, y0, nu, nv, 1)); }
    return ids.get(key);
  };
  const mesh = finishMesh(verts, tiles.map((t) => t.map(([x, y]) => id(x, y))), tiles[0].length, nv, null);  // one-sided: as listed
  return (meshCache[key] = Object.assign(mesh, { torus: true, klein: true, cairo: kind === 'kleinCairo', kite: kind === 'kleinKite', nu, nv, uv: new Float64Array(tiles.flat(2)) }));
}

function torusMesh(nv, nu = twelve(nv / TORUS_TUBE)) {  // squares about as long around the ring as around the tube
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
  // on the sheet, each tile on the side of a seam its middle is on (a triangle across the end, its middle past
  // it, drawn at the start once unrolled, with the tiles it belongs with)
  for (let t = 0; t < uv.length / (2 * sides); t++) {
    const o = 2 * sides * t;
    for (const [d, n] of [[0, nu], [1, nv]]) {
      let mid = 0;
      for (let q = 0; q < sides; q++) mid += uv[o + 2 * q + d] / sides;
      const shift = n * Math.floor(mid / n);
      if (shift) for (let q = 0; q < sides; q++) uv[o + 2 * q + d] -= shift;
    }
  }
  Object.assign(mesh, { torus: true, nu, nv, uv: new Float64Array(uv) });
  return mesh;
}

/* ---- 7.4b Möbius strip ---------------------------------------------------------------------- */
/* A Möbius strip tiled with squares, hexagons or triangles: on the flat sheet, a strip L long (its
 * middle line, a circle of radius 1 once rolled up, is L tile edges long) and W wide, its ends glued
 * with a half twist, (x + L, y) ≡ (x, W − y). Its width is MOBIUS_WIDTH times the circle's radius.
 * As a strip of paper, each tile has two faces, and a walker keeps to the face it is on: at the
 * strip's edge it goes round to the face just behind (the same tile, turned over). The faces make one
 * closed surface: every tile has as many neighbours as on a torus, and nothing is mirrored. */
const MOBIUS_WIDTH = 0.7;
const MOBIUS_KINDS = ['mobius', 'mobiusHex', 'mobiusTri', 'mobiusHexTurned', 'mobiusTriTurned', 'mobiusCairo', 'mobiusKite', 'mobiusSquare', 'mobiusHexSquare', 'mobiusTriSquare', 'mobiusCairoSquare', 'mobiusKiteSquare'];
/* A strip's length L, as a whole count of the steps its tiling repeats by along it, glued with the
 * half twist (see mobiusSheet): ok, the counts that tile it. A size is its rows (the usual length
 * for them), or rows "x" that count, a length of its own (s=16x240: 16 rows of triangles 120 long). */
const MOBIUS_ALONG = {
  mobius: { step: 1, ok: () => true },
  mobiusTri: { step: 0.5, ok: (n, nv) => n % 2 === nv % 2 },
  mobiusHex: { step: 1.5, ok: (n) => n % 2 === 1 },
  mobiusHexTurned: { step: Math.sqrt(3) / 2, ok: (n, nv) => n % 2 === (nv % 2 ? 0 : 1) },
  mobiusTriTurned: { step: Math.sqrt(3) / 2, ok: (n) => n % 2 === 0 },
  mobiusCairo: { step: 1, ok: (n, nv) => (n + nv) % 2 === 1 },
};
MOBIUS_ALONG.mobiusKite = MOBIUS_ALONG.mobiusTri;  // kites: the triangles', each cut in 3
for (const k of ['mobius', 'mobiusHex', 'mobiusTri', 'mobiusCairo', 'mobiusKite']) MOBIUS_ALONG[`${k}Square`] = MOBIUS_ALONG[k];  // a square sheet, as its tiling
const mobiusSize = (size) => (typeof size === 'number' ? [size, null] : size.split('x').map(Number));  // [rows, count along or null]
/* Sheet point (x, y) rolled up by m ∈ [0, 1]: at m = 0 the flat strip (in the x–y plane, as the
 * unrolled torus), at m = 1 the Möbius strip. As it rolls, the strip bends round the circle (keeping
 * lengths, as torusPoint does) and twists along it, up to half a turn at m = 1, so the ends meet
 * upside down: the point (x + L, y) is then the point (x, W − y). Its width is always MOBIUS_WIDTH times
 * the circle's radius; flat, its length is in proportion (flat: its share of the circle), stretched to
 * the circle as it bends round (a square sheet's tiles, much; the usual length's, hardly), as a torus's. */
function mobiusPoint(x, y, L, W, m) {
  const flat = (L * MOBIUS_WIDTH) / (2 * Math.PI * W), X0 = (x / L - 0.5) * 2 * Math.PI;
  const X = X0 * (flat + (1 - flat) * m), S = (y / W - 0.5) * MOBIUS_WIDTH;  // along, across (the circle's radius 1)
  const tw = (m * X0) / 2, w = S * Math.cos(tw), h = S * Math.sin(tw);  // across: outwards and up
  if (m < 1e-6) return [X, -w, h];
  const rr = 1 / m, ph = X / rr;
  return [(rr + w) * Math.sin(ph), rr - m - (rr + w) * Math.cos(ph), h];
}
/* The tiles of a strip nv rows wide, each as its corners (x, y) counterclockwise on the sheet, the
 * glued ends matching the tiling: L, W and the tiles.
 * - squares: nv rows of squares, L of them along;
 * - hexagons (flat-topped, edge 1): an odd number of columns 1.5 apart, nv hexagons each, odd columns
 *   half a hexagon higher; the strip's edges run zigzag along the outer hexagons (none is cut);
 * - triangles (edge 1): nv rows; L whole, or half a triangle more when nv is odd;
 * turned by 30° (as the tori, see TURNED):
 * - hexagons pointy-topped, in nv rows along the strip, √3 apart in a row, odd rows half a hexagon
 *   further on; L whole hexagons, or half one more when nv is even; the edges zigzag along them;
 * - triangles pointing along the strip, in columns √3/2 wide (vertical edges), the strip nv edges
 *   wide, an even number of columns; the edges zigzag along them. */
function mobiusSheet(kind0, size) {
  if (kind0.startsWith('mobiusKite')) { const t = mobiusSheet(kind0.replace('Kite', 'Tri'), size); return { ...t, tiles: t.tiles.flatMap(kitesOf) }; }  // the triangles', cut in 3
  // a square sheet (Square, kind …Square): as long as wide, its tiles stretched along the strip once
  // rolled up (see mobiusPoint); else the usual length, a multiple of 12
  const square = kind0.endsWith('Square'), kind = square ? kind0.slice(0, -6) : kind0;
  const [nv, own] = mobiusSize(size), step = MOBIUS_ALONG[kind].step, fit = (x) => (square ? Math.max(1, Math.round(x)) : twelve(x));
  const len = (W) => (own ? own * step : square ? W : (2 * Math.PI * W) / MOBIUS_WIDTH), tiles = [], H = Math.sqrt(3) / 2;  // its length, or the usual one
  const done = (L, W) => ({ L, W, tiles });
  if (kind === 'mobiusHexTurned') {
    const W = 1.5 * (nv - 1) + 2, S3 = Math.sqrt(3), a = Math.round(len(W) / S3 - (own && !(nv % 2) ? 0.5 : 0)), L = S3 * (nv % 2 ? a : a + 0.5);
    for (let r = 0; r < nv; r++) {
      const cy = 1.5 * r + 1;
      for (let i = -2; S3 * (i - 1) < L; i++) {
        const x0 = S3 * (i + (r % 2) / 2 + 0.5);  // its centre, from a whole count (no rounding drift)
        if (x0 < -1e-9 || x0 >= L - 1e-9) continue;
        tiles.push([0, 1, 2, 3, 4, 5].map((k) => [x0 + Math.cos(((60 * k + 30) * Math.PI) / 180), cy + Math.sin(((60 * k + 30) * Math.PI) / 180)]));
      }
    }
    return done(L, W);
  }
  if (kind === 'mobiusTriTurned') {
    const W = nv, cols = own ?? fit(len(W) / H), L = cols * H;
    for (let i = -1; i <= cols; i++) {
      const x0 = i * H, x1 = x0 + H, o0 = (((i % 2) + 2) % 2) / 2, o1 = 0.5 - o0;  // the lattice's rows on either side
      for (let y = o0 - 2; y < W + 2; y += 1) {
        const right = [[x0, y], [x1, y + 0.5], [x0, y + 1]], cr = [(2 * x0 + x1) / 3, y + 0.5];  // ▶
        if (cr[0] >= 0 && cr[0] < L && cr[1] > 0.25 && cr[1] < W - 0.25) tiles.push(right);
      }
      for (let y = o1 - 2; y < W + 2; y += 1) {
        const left = [[x1, y], [x1, y + 1], [x0, y + 0.5]], cl = [(x0 + 2 * x1) / 3, y + 0.5];  // ◀
        if (cl[0] >= 0 && cl[0] < L && cl[1] > 0.25 && cl[1] < W - 0.25) tiles.push(left);
      }
    }
    return done(L, W);
  }
  if (kind === 'mobiusCairo') {  // nv squares of the Cairo grid across, L along with L + nv odd: the ends glued turned over keep
    // the tiling (see cairoCorners); the pentagons whose middles lie on the strip, its edges zigzag along them
    const W = nv, L0 = own ?? fit(len(W)), L = (L0 + W) % 2 ? L0 : L0 + 1;
    for (let i = -1; i <= L; i++) for (let j = -1; j <= W; j++) for (const o of [0, 1]) {
      const c = cairoCorners(i, j, o), [cx, cy] = cairoMiddle(i, j, o);
      if (cx < 0 || cx >= L || cy <= 0 || cy >= W) continue;
      tiles.push(c.reduce((a, [x, y], q) => a + x * c[(q + 1) % 5][1] - c[(q + 1) % 5][0] * y, 0) < 0 ? c.reverse() : c);
    }
    return done(L, W);
  }
  if (kind === 'mobiusHex') {
    const W = Math.sqrt(3) * (nv + 0.5), a = own ?? 2 * Math.round((len(W) / 1.5 - 1) / 2) + 1, L = 1.5 * a;
    for (let c = 0; c < a; c++) for (let r = 0; r < nv; r++) {
      const cx = 1.5 * c + 1, cy = Math.sqrt(3) * (r + (c % 2) / 2) + H;
      tiles.push([0, 1, 2, 3, 4, 5].map((k) => [cx + Math.cos((k * Math.PI) / 3), cy + Math.sin((k * Math.PI) / 3)]));
    }
    return done(L, W);
  }
  if (kind === 'mobiusTri') {
    const W = nv * H, L = own ? own / 2 : nv % 2 ? fit(len(W)) - 0.5 : fit(len(W));
    for (let j = 0; j < nv; j++) {
      const y0 = j * H, y1 = y0 + H;
      for (let a = (j % 2) / 2 - 2; a < L + 2; a += 1) {
        if (a + 0.5 >= 0 && a + 0.5 < L) tiles.push([[a, y0], [a + 1, y0], [a + 0.5, y1]]);           // ▲, its centre at a + ½
        if (a + 1 >= 0 && a + 1 < L) tiles.push([[a + 0.5, y1], [a + 1, y0], [a + 1.5, y1]]);       // ▼, at a + 1
      }
    }
    return done(L, W);
  }
  const L = own ?? fit(len(nv));
  for (let i = 0; i < L; i++) for (let j = 0; j < nv; j++) tiles.push([[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]);
  return done(L, nv);
}
// The mesh of the strip's two faces: the front of each tile as on the sheet, its back the same
// corners turned over. A corner of the sheet is a corner of each face (but one where the faces
// meet, on the strip's edge); past the glued ends, the front goes on as the back
function mobiusMesh(kind, size) {
  const key = `${kind}${size}`, nv = mobiusSize(size)[0];
  if (meshCache[key]) return meshCache[key];
  const { L, W, tiles: sheet } = mobiusSheet(kind, size), k = sheet[0].length;
  const { verts, add } = vertexStore();
  const ids = sheet.map((t) => t.map(([x, y]) => add(...mobiusPoint(x, y, L, W, 1))));  // the glued ends share corners
  const n0 = verts.length / 3, uses = new Map(), onEdge = new Uint8Array(n0), home = new Float64Array(n0).fill(NaN);
  for (const t of ids) for (let q = 0; q < k; q++) {  // edges with one tile: the strip's edge
    const a = t[q], b = t[(q + 1) % k], e = Math.min(a, b) * n0 + Math.max(a, b);
    uses.set(e, (uses.get(e) ?? 0) + 1);
  }
  for (const [e, c] of uses) if (c === 1) { onEdge[Math.floor(e / n0)] = 1; onEdge[e % n0] = 1; }
  // each sheet corner seen from the side of the glued ends where it was first met: from the other
  // side (x off by about L), its faces swap
  sheet.forEach((t, i) => t.forEach(([x], q) => { if (Number.isNaN(home[ids[i][q]])) home[ids[i][q]] = x; }));
  const index = new Map(), cv = [];
  const corner = (v, side) => {
    const key = onEdge[v] ? 2 * v : 2 * v + side;
    if (!index.has(key)) { index.set(key, cv.length / 3); cv.push(verts[3 * v], verts[3 * v + 1], verts[3 * v + 2]); }
    return index.get(key);
  };
  const tiles = [], uv = [];
  for (const side of [0, 1]) sheet.forEach((t, i) => {
    const c = t.map(([x], q) => corner(ids[i][q], side ^ (Math.abs(x - home[ids[i][q]]) > L / 2 ? 1 : 0)));
    tiles.push(side ? c.reverse() : c);
    uv.push(...(side ? [...t].reverse() : t).flat());
  });
  const mesh = finishMesh(cv, tiles, k, nv, null);  // as listed: a back faces the other way
  // the step from a corner to a neighbour, on the sheet as seen from its face (a back: mirrored)
  const N = cv.length / 3, delta = new Map();
  tiles.forEach((c, t) => {
    const back = t >= sheet.length ? -1 : 1;
    for (let q = 0; q < k; q++) {
      const a = c[q], b = c[(q + 1) % k], i = 2 * (k * t + q), j = 2 * (k * t + (q + 1) % k);
      const dx = uv[j] - uv[i], dy = (uv[j + 1] - uv[i + 1]) * back;
      delta.set(a * N + b, [dx, dy]); delta.set(b * N + a, [-dx, -dy]);
    }
  });
  return (meshCache[key] = Object.assign(mesh, { torus: true, mobius: true, kite: kind.startsWith('mobiusKite'), L, W, nu: L, nv, uv: new Float64Array(uv), delta, front: sheet.length }));
}
// The sheet point of a surface: a torus, or a Möbius strip
// (a rhombus sheared into the torus's rectangle: unsheared while flat, sheared as it bends round the ring)
const sheetPoint = (g, i, j, m) => {
  if (g.mobius) return mobiusPoint(i, j, g.L, g.W, m);
  if (g.klein) return kleinPoint(i, j, g.nu, g.nv, m);
  if (g.shear) { const k = 1 - Math.max(0, 2 * m - 1); [i, j] = [i + (k * g.shear[0] * j) / g.nv, j + (k * g.shear[1] * i) / g.nu]; }
  return torusPoint(i, j, g.nu, g.nv, m, g.flatWidth ?? 1);
};

/* Torus of regular hexagons (flat-topped): nu columns around the ring, nv rows around the tube;
 * odd columns sit half a row higher, so nu must be even for the columns to close up. In sheet
 * units a column is 1.5·R wide and a row √3·R high; the sheet is 2π by 2π·TUBE, so the hexagons
 * are regular when nu / nv = √3 / (1.5·TUBE). Every hexagon has 6 neighbours, all across an edge. */
const hexTorusColumns = (nv) => twelve((2 * nv * Math.sqrt(3)) / (3 * TORUS_TUBE));
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

// A torus of Cairo pentagons: nv squares of the Cairo grid round the tube, nu round the ring (both even:
// the tiling repeats every other square), two pentagons a square (tile 2 (i·nv + j) + o, see cairoCorners),
// listed counterclockwise on the sheet as the squares are
const cairoTorusColumns = (nv) => twelve(nv / TORUS_TUBE);
function cairoTorusMesh(nv, nu = cairoTorusColumns(nv)) {
  const key = `cairotorus${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore(), tiles = [], uv = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) for (const o of [0, 1]) {
    let c = cairoCorners(i, j, o);
    if (c.reduce((a, [x, y], q) => a + x * c[(q + 1) % 5][1] - c[(q + 1) % 5][0] * y, 0) < 0) c = c.reverse();
    tiles.push(c.map(([x, y]) => add(...torusPoint(x, y, nu, nv, 1))));
    uv.push(...c.flat());
  }
  return (meshCache[key] = Object.assign(finishTorus(verts, tiles, 5, nu, nv, uv), { cairo: true }));
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
const triTorusColumns = (nv) => twelve((nv * Math.sqrt(3)) / (2 * TORUS_TUBE));
/* Kites (the deltoidal trihexagonal tiling, the grid of the hat monotile): each triangle of the triangles'
 * grid cut in 3 from its middle to its sides' middles, a kite at each corner (that corner, the middles of
 * its two sides, the triangle's middle); 6 kites round a corner of the triangles make a hexagon. A kite
 * touches 4 others by an edge and 5 more by a corner: 9 neighbours. Its corners in the triangle's turn. */
const kitesOf = (c) => {
  const m = [0, 1].map((d) => (c[0][d] + c[1][d] + c[2][d]) / 3), half = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  return [0, 1, 2].map((k) => [c[k], half(c[k], c[(k + 1) % 3]), m, half(c[(k + 2) % 3], c[k])]);
};
function triTorusMesh(nv, nu = triTorusColumns(nv), kites = false) {  // kites: each triangle cut in 3 (see kitesOf)
  const key = `${kites ? 'kite' : 'tri'}torus${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore();
  const tris = [], uv = [];
  const P = (i, j) => [i + (j % 2) / 2, j];  // sheet coordinates of corner i of row j
  const put = (c) => { for (const t of kites ? kitesOf(c) : [c]) { tris.push(t.map(([i, j]) => add(...torusPoint(i, j, nu, nv, 1)))); uv.push(...t.flat()); } };
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
  return (meshCache[key] = Object.assign(finishTorus(verts, tris, kites ? 4 : 3, nu, nv, uv), { kite: kites }));
}

/* The tori of hexagons and of triangles on a square sheet (Square): the plane's rhombus of W × W tiles,
 * its sides glued as they are, as the 2D grid's torus (the same in its 3 ways: a straight line comes
 * back after W tiles whichever way it goes). Flat, a rhombus: the hexagons' columns, or the triangles'
 * rows, each half a tile further than the last. Rolled up, it is sheared into the torus's rectangle (shear:
 * how far a side's end is moved along the other, see sheetPoint), so that each tile's sheet coordinates
 * (uv) are those of the sheared sheet, whose sides are glued straight as the usual torus's are. */
function rhombHexTorusMesh(W) {
  const key = `hexrhomb${W}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore(), hexes = [], uv = [];
  for (let c = 0; c < W; c++) for (let r = 0; r < W; r++) {  // tile c·W + r: column c, its rows half a row higher than the last's
    const corners = [0, 1, 2, 3, 4, 5].map((k) => { const i = c + Math.cos((k * Math.PI) / 3) / 1.5, j = r + c / 2 + Math.sin((k * Math.PI) / 3) / Math.sqrt(3); return [i, j - i / 2]; });
    hexes.push(corners.map(([i, j]) => add(...torusPoint(i, j, W, W, 1))));
    uv.push(...corners.flat());
  }
  return (meshCache[key] = Object.assign(finishTorus(verts, hexes, 6, W, W, uv), { shear: [0, W / 2] }));
}
function rhombTriTorusMesh(W, kites = false) {  // its rows across the ring, each round the tube (so that the tube closes on the rhombus's slanted sides, as the hexagons')
  const key = `${kites ? 'kite' : 'tri'}rhomb${W}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore(), tris = [], uv = [];
  // corner i of row j: on the sheet, row j round the ring, i + j / 2 round the tube (each row half a triangle
  // further than the last), sheared back: (j, i); the corners listed the other way round (a swap is a mirror)
  const put = (c) => {
    const t0 = [c[0], c[2], c[1]].map(([i, j]) => [j, i]);
    for (const t of kites ? kitesOf(t0) : [t0]) { tris.push(t.map(([u, v]) => add(...torusPoint(u, v, W, W, 1)))); uv.push(...t.flat()); }
  };
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {  // the two triangles between corners i, i + 1 of rows j and j + 1
    put([[i, j], [i + 1, j], [i, j + 1]]);
    put([[i + 1, j], [i + 1, j + 1], [i, j + 1]]);
  }
  return (meshCache[key] = Object.assign(finishTorus(verts, tris, kites ? 4 : 3, W, W, uv), { shear: [0, W / 2], swap: true, kite: kites }));
}

/* The same tori turned by 30° (or 90°: the same grid) on the sheet: the triangles' rows, or the
 * hexagons' columns, run around the tube instead of around the ring. Built as the usual ones on a
 * sheet whose two ways are swapped back: (i, j) → (j, i), the corners listed the other way round
 * (a swap is a mirror), so that they keep the usual one's order.
 * Triangles: nv corners around the tube (edge 1), nu rows around the ring (√3/2 apart, nu even);
 * equilateral when nu / nv = 2 / (√3·TUBE). Hexagons: nv columns around the tube (1.5 apart, nv
 * even), nu rows around the ring (√3 apart); regular when nu / nv = √3 / (2·TUBE). */
function turnedTorus(kind, build, sides, nv, nu) {
  const key = `${kind}${nv}x${nu}`;
  if (meshCache[key]) return meshCache[key];
  const { verts, add } = vertexStore();
  const tiles = [], uv = [];
  build(nv, nu, (c) => {
    const turned = [c[0], ...c.slice(1).reverse()].map(([i, j]) => [j, i]);
    tiles.push(turned.map(([i, j]) => add(...torusPoint(i, j, nu, nv, 1))));
    uv.push(...turned.flat());
  });
  return (meshCache[key] = finishTorus(verts, tiles, sides, nu, nv, uv));
}
const turnedTriColumns = (nv) => twelve((2 * nv) / (Math.sqrt(3) * TORUS_TUBE));
const turnedTriTorusMesh = (nv, nu = turnedTriColumns(nv)) => turnedTorus('tritorusTurned', (rows, cols, put) => {
  const P = (i, j) => [i + (j % 2) / 2, j];  // corner i of row j, as on the usual torus (rows: around the ring)
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
      if (j % 2 === 0) { put([P(i, j), P(i + 1, j), P(i, j + 1)]); put([P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]); }
      else { put([P(i, j), P(i + 1, j), P(i + 1, j + 1)]); put([P(i, j), P(i + 1, j + 1), P(i, j + 1)]); }
    }
  }
}, 3, nv, nu);
const turnedHexColumns = (nv) => twelve((nv * Math.sqrt(3)) / (2 * TORUS_TUBE));
const turnedHexTorusMesh = (nv, nu = turnedHexColumns(nv)) => turnedTorus('hextorusTurned', (cols, rows, put) => {
  for (let c = 0; c < cols; c++) {  // as on the usual torus: columns 1.5 apart, odd ones half a row higher
    for (let r = 0; r < rows; r++) {
      const cj = r + (c % 2) / 2;
      put([0, 1, 2, 3, 4, 5].map((k) => [c + Math.cos((k * Math.PI) / 3) / 1.5, cj + Math.sin((k * Math.PI) / 3) / Math.sqrt(3)]));
    }
  }
}, 6, nv, nu);

/* ---- 7.5 Flat ↔ round: the same tiles and neighbours, shown flat or inflated ----------------- */
/* walk.shape = { m, target, corners, cen, nrm, extent, bent } for surfaces that can change shape:
 * polyhedra (each vertex slides from its face towards the circumscribed sphere) and the torus
 * (rolled up from a flat rectangle). The cells and their neighbours never change, so a walk or a
 * Game of Life run goes on unchanged: only the drawing and the 3D positions move. */
const MORPHABLE = ['klein', 'kleinHex', 'kleinTri', 'kleinCairo', 'kleinKite', 'kitetorus', 'kitetorusSquare', 'cube', 'pits', 'tetra', 'octa', 'stella', 'dodeca', 'icosa', 'tetraKite', 'octaKite', 'icosaKite', 'torus', 'torusSquare', 'hextorus', 'tritorus', 'cairotorus', 'hextorusSquare', 'tritorusSquare', 'cairotorusSquare', 'hextorusTurned', 'tritorusTurned', 'hexsphere', ...MOBIUS_KINDS];

function shapeAt(g, m) {
  const k = g.sides, n = g.n;
  const corners = new Float64Array(3 * k * n), cen = new Float64Array(3 * n), nrm = new Float64Array(3 * n);
  if (g.torus) {
    // per tile, from the sheet coordinates of its corners: at m < 1 the seams open, so corners are not shared
    const { uv } = g;
    for (let q = 0; q < k * n; q++) corners.set(sheetPoint(g, uv[2 * q], uv[2 * q + 1], m), 3 * q);
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
  const { uv } = g, k = g.sides;
  const P = Array.from({ length: k }, (_, q) => sheetPoint(g, uv[2 * q], uv[2 * q + 1], 1));  // tile 0
  const nr = cross([0, 1, 2].map((d) => P[2][d] - P[0][d]), [0, 1, 2].map((d) => P[k - 1][d] - P[1][d]));
  g.shapeSign = nr[0] * g.nrm[0] + nr[1] * g.nrm[1] + nr[2] * g.nrm[2] >= 0 ? 1 : -1;
  return g.shapeSign;
}

// A new walk mode starts in its default form (round for the icosahedron and the torus, flat
// otherwise); the same surface rebuilt (another tiling, Grid / Cells, size, number or rule) keeps it
function initShape(kind) {
  if (!MORPHABLE.includes(kind)) { walk.shape = null; updateMorphButton(); return; }
  // the same surface (its other tilings, along the grid or on cells) keeps the form it had
  const surface = (w) => familyOf(w)?.F.name ?? MODES[w].sphere;
  const mode = current.mode, keep = previousShape && surface(previousShape.mode) === surface(mode);
  const g = walk.geo, m = keep ? previousShape.target : MODES[mode].round ? 1 : 0;
  const maxExtent = Math.max(shapeAt(g, 0).extent, shapeAt(g, 1).extent);
  walk.shape = { ...shapeAt(g, m), target: m, maxExtent, mode };
}

// The frame of a surface: the sphere round its current form (flat or round), centred on its centre,
// as wide as it looks in perspective (its outline from the camera): whichever way the solid is
// turned, it stays in the middle of the view and at most touches its sides (see viewFor)
function surfaceBounds() {
  const F = walk.R * walk.shape.extent, P = walk.persp;
  const r = P ? (F * P.D) / Math.sqrt(Math.max(1e-9, P.D * P.D - F * F)) : F;
  return { minX: -r, maxX: r, minY: -r, maxY: r };
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
  bounds = surfaceBounds();
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
    b.addEventListener('click', () => {
      walk.shape.target = m;
      updateMorphButton();
      $('perspective').checked = perspectiveFor(MODES[$('mode').value], m);  // the form's own
      $('perspective').dispatchEvent(new Event('change'));
    });
    return b;
  }));
}

// The perspective a surface starts with, in its form m: the walk mode's, but none on a solid
// inflated (a ball is seen whole without it)
const perspectiveFor = (mode, m) => !!mode.perspective && !(m === 1 && SOLIDS.includes(mode.sphere));
// One animation frame of the change of shape (about 0.7 s from flat to round)
function morphStep(dt) {
  const sh = walk.shape;
  if (!sh || sh.m === sh.target) return;
  const m = sh.target > sh.m ? Math.min(sh.target, sh.m + dt / 0.7) : Math.max(sh.target, sh.m - dt / 0.7);
  Object.assign(sh, shapeAt(walk.geo, m));
  applyShape();
}


/* ---- 7.6 Surface sizes and walks on surfaces ------------------------------------------------- */
/* Sizes, one way for every surface: a ladder of cell counts for each family (a torus, a Möbius strip or a Klein
 * bottle: the square torus's; a solid: the cube's), and each surface's sizes the allowed ones (rows a multiple
 * of steps[0], from least) whose cells are nearest them: a step of the size is about as many cells whatever
 * the tiling (cells stay regular, so not exactly). Each step about doubles the cells (×2.25, then ×1.78). A
 * new surface needs only its tiles(size) and its steps. */
const SIZE_LADDERS = { surface: { counts: [576, 1440, 2688, 5760, 9984], start: 2688 },
                       solid: { counts: [384, 864, 1536, 3456, 6144, 13824, 24576, 55296, 98304], start: 6144 } };
const mobiusRadius = (kind, s) => mobiusSheet(kind, s).W / MOBIUS_WIDTH;  // a Möbius strip's circle, its width MOBIUS_WIDTH times its radius
const SPHERES = {
  cube: { mesh: cubeFlat, radius: (n) => n / 2,                 // half the cube side: square edge = 1 unit
          tiles: (n) => 6 * n * n, unit: 'squares' },
  pits: { mesh: cubePits, radius: (n) => n / 2, steps: [6], tiles: (n) => (66 * n * n) / 9, unit: 'squares' },  // the cube with pits (a sixth deep: n a multiple of 6)
  // flat polyhedra: radius = f / (edge of the solid) so that a small triangle's edge is 1 unit
  // a torus's size: its rows (see torusDims); perRow: tiles per column across a row; steps: what rows
  // and tiles per row go by in a size of its own, keeping the sheet's columns even or rows even
  // (torus: a size of its own may share torusSquare's mesh, hence its flatWidth)
  torus: { mesh: (s) => Object.assign(torusMesh(...torusDims('torus', s)), { flatWidth: 1, square: false }), radius: (s) => torusDims('torus', s)[0] / (2 * Math.PI * TORUS_TUBE),  // edge around the tube = 1 unit
          columns: (nv) => twelve(nv / TORUS_TUBE), perRow: 1, steps: [1, 1],
          least: 3, tiles: (s) => torusDims('torus', s).reduce((a, b) => a * b), unit: 'squares' },
  // the square torus (Squares, stretched): as many squares round the ring as round the tube, a square
  // sheet unrolled, its squares stretched along the ring rolled up (see torusPoint's flatWidth)
  torusSquare: { mesh: (s) => Object.assign(torusMesh(...torusDims('torusSquare', s)), { flatWidth: TORUS_TUBE, square: true }),
                 radius: (s) => torusDims('torusSquare', s)[0] / (2 * Math.PI * TORUS_TUBE), columns: (nv) => nv, perRow: 1, steps: [1, 1],
                 least: 4, tiles: (s) => torusDims('torusSquare', s).reduce((a, b) => a * b), unit: 'squares' },
  // hexagon edge = 1 unit: the tube is nv rows of √3 around
  hextorus: { mesh: (s) => hexTorusMesh(...torusDims('hextorus', s)), radius: (s) => (torusDims('hextorus', s)[0] * Math.sqrt(3)) / (2 * Math.PI * TORUS_TUBE),
              columns: hexTorusColumns, perRow: 1, steps: [1, 2],  // an even count of columns
              least: 3, tiles: (s) => torusDims('hextorus', s).reduce((a, b) => a * b), unit: 'hexagons' },
  // on a square sheet (Square, under the tilings): as long round the ring as round the tube unrolled, its
  // tiles stretched along the ring once rolled up (as torusSquare)
  // hexagons and triangles: the plane's rhombus (see rhombHexTorusMesh), as many tiles round the ring as round the tube
  hextorusSquare: { mesh: (s) => Object.assign(rhombHexTorusMesh(torusDims('hextorusSquare', s)[0]), { flatWidth: (TORUS_TUBE * Math.sqrt(3)) / 2, square: true }),
                    radius: (s) => (torusDims('hextorusSquare', s)[0] * Math.sqrt(3)) / (2 * Math.PI * TORUS_TUBE),
                    columns: (nv) => nv, perRow: 1, steps: [1, 1],
                    least: 3, tiles: (s) => torusDims('hextorusSquare', s).reduce((a, b) => a * b), unit: 'hexagons' },
  tritorusSquare: { mesh: (s) => Object.assign(rhombTriTorusMesh(torusDims('tritorusSquare', s)[0]), { flatWidth: (TORUS_TUBE * Math.sqrt(3)) / 2, square: true }),
                    radius: (s) => torusDims('tritorusSquare', s)[0] / (2 * Math.PI * TORUS_TUBE),
                    columns: (nv) => nv, perRow: 2, steps: [1, 1],
                    tiles: (s) => 2 * torusDims('tritorusSquare', s).reduce((a, b) => a * b), unit: 'triangles' },
  kitetorusSquare: { mesh: (s) => Object.assign(rhombTriTorusMesh(torusDims('kitetorusSquare', s)[0], true), { flatWidth: (TORUS_TUBE * Math.sqrt(3)) / 2, square: true }),
                     radius: (s) => torusDims('kitetorusSquare', s)[0] / (2 * Math.PI * TORUS_TUBE),
                     columns: (nv) => nv, perRow: 6, steps: [1, 1],
                     tiles: (s) => 6 * torusDims('kitetorusSquare', s).reduce((a, b) => a * b), unit: 'kites' },
  cairotorusSquare: { mesh: (s) => Object.assign(cairoTorusMesh(...torusDims('cairotorusSquare', s)), { flatWidth: TORUS_TUBE, square: true }),
                      radius: (s) => torusDims('cairotorusSquare', s)[0] / (2 * Math.PI * TORUS_TUBE), columns: (nv) => nv, perRow: 1, steps: [2, 2],
                      tiles: (s) => 2 * torusDims('cairotorusSquare', s).reduce((a, b) => a * b), unit: 'pentagons' },
  // Cairo pentagons: the tube nv squares of their grid around, two pentagons a square
  cairotorus: { mesh: (s) => Object.assign(cairoTorusMesh(...torusDims('cairotorus', s)), { flatWidth: 1, square: false }), radius: (s) => torusDims('cairotorus', s)[0] / (2 * Math.PI * TORUS_TUBE),
                columns: cairoTorusColumns, perRow: 1, steps: [2, 2],  // even counts both ways
                tiles: (s) => 2 * torusDims('cairotorus', s).reduce((a, b) => a * b), unit: 'pentagons' },
  // the icosahedron's dual: a cell per corner of its triangles (hexagon edge ≈ 1 unit)
  hexsphere: { mesh: hexSphereMesh, radius: (f) => (f * Math.sqrt(3)) / 2,
               tiles: (f) => 10 * f * f + 2, unit: 'hexagons' },
  // triangle edge = 1 unit: the tube is nv rows of √3/2 around
  tritorus: { mesh: (s) => triTorusMesh(...torusDims('tritorus', s)), radius: (s) => (torusDims('tritorus', s)[0] * Math.sqrt(3)) / (4 * Math.PI * TORUS_TUBE),
              columns: triTorusColumns, perRow: 2, steps: [2, 2],  // an even count of rows, two triangles per column
              tiles: (s) => 2 * torusDims('tritorus', s).reduce((a, b) => a * b), unit: 'triangles' },
  // kites: the triangles', each cut in 3 (see kitesOf), on triangles twice as big (half their sizes): 3/4 of their cells
  kitetorus: { mesh: (s) => triTorusMesh(...torusDims('kitetorus', s), true), radius: (s) => (torusDims('kitetorus', s)[0] * Math.sqrt(3)) / (4 * Math.PI * TORUS_TUBE),
               columns: triTorusColumns, perRow: 6, steps: [2, 2],  // an even count of rows, six kites per column
               tiles: (s) => 6 * torusDims('kitetorus', s).reduce((a, b) => a * b), unit: 'kites' },
  // turned by 30° (see turnedTorus): rows around the ring. perColumn: tiles across a corner (a
  // column) around the tube, for the size's label
  tritorusTurned: { mesh: (s) => turnedTriTorusMesh(...torusDims('tritorusTurned', s)), radius: (s) => torusDims('tritorusTurned', s)[0] / (2 * Math.PI * TORUS_TUBE),
                    columns: turnedTriColumns, perRow: 1, perColumn: 2, steps: [1, 2],  // an even count of rows
                    least: 2, tiles: (s) => 2 * torusDims('tritorusTurned', s).reduce((a, b) => a * b), unit: 'triangles' },
  hextorusTurned: { mesh: (s) => turnedHexTorusMesh(...torusDims('hextorusTurned', s)), radius: (s) => (torusDims('hextorusTurned', s)[0] * 1.5) / (2 * Math.PI * TORUS_TUBE),
                    columns: turnedHexColumns, perRow: 1, steps: [2, 1],  // an even count of columns, around the tube
                    tiles: (s) => torusDims('hextorusTurned', s).reduce((a, b) => a * b), unit: 'hexagons' },
  // Möbius strip: its size is its rows across; square edge = 1 unit (the middle circle is nu long)
  // Möbius strips: their size is their rows across; tile edge = 1 unit (the middle circle is L long);
  // tiles: on both faces
  mobius: { mesh: (s) => mobiusMesh('mobius', s), radius: (s) => mobiusRadius('mobius', s), columns: (s) => 2 * mobiusSheet('mobius', s).L,
            tiles: (s) => 2 * mobiusSheet('mobius', s).tiles.length, unit: 'squares' },
  mobiusHex: { mesh: (s) => mobiusMesh('mobiusHex', s), radius: (s) => mobiusRadius('mobiusHex', s), columns: (s) => 2 * mobiusSheet('mobiusHex', s).tiles.length / mobiusSize(s)[0],
               tiles: (s) => 2 * mobiusSheet('mobiusHex', s).tiles.length, unit: 'hexagons' },
  mobiusHexTurned: { mesh: (s) => mobiusMesh('mobiusHexTurned', s), radius: (s) => mobiusRadius('mobiusHexTurned', s), columns: (s) => 2 * mobiusSheet('mobiusHexTurned', s).tiles.length / mobiusSize(s)[0],
                     tiles: (s) => 2 * mobiusSheet('mobiusHexTurned', s).tiles.length, unit: 'hexagons' },
  mobiusTriTurned: { mesh: (s) => mobiusMesh('mobiusTriTurned', s), radius: (s) => mobiusRadius('mobiusTriTurned', s), columns: (s) => 2 * mobiusSheet('mobiusTriTurned', s).tiles.length / mobiusSize(s)[0],
                     tiles: (s) => 2 * mobiusSheet('mobiusTriTurned', s).tiles.length, unit: 'triangles' },
  mobiusTri: { mesh: (s) => mobiusMesh('mobiusTri', s), radius: (s) => mobiusRadius('mobiusTri', s), columns: (s) => 2 * mobiusSheet('mobiusTri', s).tiles.length / mobiusSize(s)[0],
               tiles: (s) => 2 * mobiusSheet('mobiusTri', s).tiles.length, unit: 'triangles' },
  mobiusKite: { mesh: (s) => mobiusMesh('mobiusKite', s), radius: (s) => mobiusRadius('mobiusKite', s), columns: (s) => 2 * mobiusSheet('mobiusKite', s).tiles.length / mobiusSize(s)[0],
                tiles: (s) => 2 * mobiusSheet('mobiusKite', s).tiles.length, unit: 'kites' },
  // Möbius strips from a square sheet (Square): shaped as the usual ones, their tiles stretched along
  ...Object.fromEntries([['mobius', 'squares'], ['mobiusHex', 'hexagons'], ['mobiusTri', 'triangles'], ['mobiusCairo', 'pentagons'], ['mobiusKite', 'kites']].map(([base, unit]) => {
    const kind = `${base}Square`;
    return [kind, { mesh: (s) => mobiusMesh(kind, s), radius: (s) => mobiusRadius(kind, s), columns: (s) => 2 * mobiusSheet(kind, s).tiles.length / mobiusSize(s)[0],
                    tiles: (s) => 2 * mobiusSheet(kind, s).tiles.length, unit }];
  })),
  // Klein bottles: their size is their rows round the tube, as a torus's
  ...Object.fromEntries([['klein', 'squares', 1], ['kleinHex', 'hexagons', 1], ['kleinTri', 'triangles', 2], ['kleinCairo', 'pentagons', 2], ['kleinKite', 'kites', 6]].map(([kind, unit, per]) => [kind, {
    mesh: (s) => kleinMesh(kind, ...torusDims(kind, s)), radius: (s) => torusDims(kind, s)[0] / (2 * Math.PI * TORUS_TUBE), columns: kleinColumns[kind], perRow: 1,
    steps: [2, 2], tiles: (s) => per * torusDims(kind, s).reduce((a, b) => a * b), unit }])),
  mobiusCairo: { mesh: (s) => mobiusMesh('mobiusCairo', s), radius: (s) => mobiusRadius('mobiusCairo', s), columns: (s) => 2 * mobiusSheet('mobiusCairo', s).tiles.length / mobiusSize(s)[0],
                 tiles: (s) => 2 * mobiusSheet('mobiusCairo', s).tiles.length, unit: 'pentagons' },
  tetra: { mesh: (f) => flatPolyhedron('tetra', f), radius: (f) => f / (2 * Math.SQRT2),  // edge 2√2
          tiles: (f) => 4 * f * f, unit: 'triangles' },
  octa:  { mesh: (f) => flatPolyhedron('octa', f), radius: (f) => f / Math.SQRT2,          // edge √2
          tiles: (f) => 8 * f * f, unit: 'triangles' },
  icosa: { mesh: (f) => flatPolyhedron('icosa', f), radius: (f) => f / 2,                  // edge 2
          tiles: (f) => 20 * f * f, unit: 'triangles' },
  // kites: the triangles', each cut in 3, on triangles twice as big (half their sizes): 3/4 of their cells, as everywhere
  tetraKite: { mesh: (f) => flatPolyhedron('tetra', f, true), radius: (f) => f / (2 * Math.SQRT2), tiles: (f) => 12 * f * f, unit: 'kites' },
  octaKite: { mesh: (f) => flatPolyhedron('octa', f, true), radius: (f) => f / Math.SQRT2, tiles: (f) => 24 * f * f, unit: 'kites' },
  icosaKite: { mesh: (f) => flatPolyhedron('icosa', f, true), radius: (f) => f / 2, tiles: (f) => 60 * f * f, unit: 'kites' },
  stella: { mesh: (f) => flatPolyhedron('stella', f), radius: (f) => f / Math.SQRT2,       // edge √2
            tiles: (f) => 24 * f * f, unit: 'triangles' },
  dodeca: { mesh: (f) => flatPolyhedron('dodeca', f), radius: (f) => (f * PHI) / 2,        // edge 2/φ
            tiles: (f) => 60 * f * f, unit: 'triangles' },
};

// The surface size as a stepper: [ − ] 6,144 squares [ + ] goes through the sizes of the (hidden)
// menu one by one; the menu stays the source of truth, as for the walk modes
function syncSizeStepper() {
  const sel = $('sphereF');
  syncLoopRow();
  // the size (see gridSize)
  const kind = surfaceOf(MODES[$('mode').value]), f = sphereSize();
  if (SPHERES[kind]?.tiles && sel.selectedOptions[0]) $('sizeLabel').innerHTML = `${sizeShape(kind, f)}<small>${sizeCells(kind, f)}</small>`;
  else $('sizeLabel').textContent = sel.selectedOptions[0]?.text ?? '';
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
  if (MOBIUS_KINDS.includes(kind)) {  // a Möbius strip: its rows and its length, as a count of steps along (see MOBIUS_ALONG)
    const [nv, own] = mobiusSize(size);
    return [nv, own ?? Math.round(mobiusSheet(kind, nv).L / MOBIUS_ALONG[kind].step)];
  }
  if (typeof size === 'number') return [size, SPHERES[kind].columns(size)];
  const [rows, perRow] = size.split('x').map(Number);
  return [rows, perRow / SPHERES[kind].perRow];
}
/* A grid's size, one way for all of them: its height × its width, their product its cells. On the plane
 * (kind: its cells' shape), its rows × the cells of a row; on a torus or a Klein bottle, its cells round
 * the tube × round the ring; on a Möbius strip, across × along it twice round (its two faces, one strip).
 * A solid has none: its edge says its size. [height, width, cells, unit] */
function gridSize(kind, f) {
  if (PLANE_CELLS[kind]) { const h = planeW(kind, f), w = planeRow(kind, h); return [h, w, h * w, kind === 'cairo' ? 'pentagons' : PLANE_CELLS[kind]]; }
  if (!TORI.includes(kind)) return null;
  const { tiles, unit } = SPHERES[kind], cells = tiles(f);
  const h = MOBIUS_KINDS.includes(kind) ? mobiusSize(f)[0] : torusDims(kind, f)[0] * (SPHERES[kind].perColumn ?? 1);
  return [h, cells / h, cells, unit];
}
// on top, the grid as height × width (a solid: its edge); under it, its cells
const sizeShape = (kind, f) => { const d = gridSize(kind, f); return d ? `${fmt(d[0])} × ${fmt(d[1])}` : `Edge ${fmt(f)}`; };
const sizeCells = (kind, f) => { const d = gridSize(kind, f); return d ? `${fmt(d[2])} ${d[3]}` : `${fmt(SPHERES[kind].tiles(f))} ${SPHERES[kind].unit}`; };
const sizeLabel = (kind, f) => (gridSize(kind, f) ? `${sizeShape(kind, f)} ${sizeCells(kind, f)}` : sizeCells(kind, f));
// A size of its own (a link, a loop found): an extra entry among the usual ones, by rows (a torus,
// a Möbius strip) or tiles across (a solid); a torus with the usual tiles per row is the usual size
function selectSize(kind, size) {
  const sel = $('sphereF'), dims = (s) => (TORI.includes(kind) ? torusDims(kind, s) : [Number(s)]), [rows] = dims(size);
  for (const o of [...sel.options]) if (o.dataset.own) o.remove();
  const usual = `${dims(rows)}` === `${dims(size)}` && [...sel.options].find((o) => Number(o.value) === rows);
  if (usual) { sel.value = usual.value; return; }
  const own = new Option(sizeLabel(kind, size), size);
  own.dataset.own = '1';
  sel.insertBefore(own, [...sel.options].find((o) => dims(sphereSizeOf(o))[0] > rows) ?? null);
  sel.value = size;
}
// A size from a link: any number of rows or tiles across, from the surface's smallest that builds
// (least: below it a tiny torus breaks; else 1) to its largest usual one
function linkSize(kind, s) {
  const { sizes, least = 1 } = SPHERES[kind], [rows, along] = String(s).split('x');
  const n = Math.min(sizes[sizes.length - 1], Math.max(least, Math.round(Number(rows)) || sizes[0]));
  return TORI.includes(kind) && along ? `${n}x${along}` : n;
}
const sphereSizeOf = (o) => (o.value.includes('x') ? o.value : Number(o.value));

// Fill the Sphere size menu for the kind of sphere of the current mode
// The sizes of a surface, from its default one or the walk mode's (see MODES: initial)
// (each family's last size kept, see SIZE_LADDERS: on another tiling or surface of it, the size with about as many cells)
const familyCells = {}, ladderOf = (kind) => (TORI.includes(kind) ? 'surface' : 'solid');
function fillSphereSizes(kind, initial = SPHERES[kind].initial) {
  const sel = $('sphereF'), key = `${kind} ${initial}`, [was] = (sel.dataset.kind ?? '').split(' ');
  if (sel.dataset.kind === key) return;
  if (SPHERES[was] && sel.value) familyCells[ladderOf(was)] = SPHERES[was].tiles(sphereSize());
  const kept = familyCells[ladderOf(kind)];
  sel.replaceChildren(...SPHERES[kind].sizes.map((f) => new Option(sizeLabel(kind, f), f)));
  sel.value = kept ? SPHERES[kind].near(kept) : SPHERES[kind].nearest(initial);
  sel.dataset.kind = key;
}

// Walk from tile to tile (see surfaceSteps)
/* Walks on surfaces, along the grid: from corner to corner along the tile edges. Arriving at a corner, the digit
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
const SOLIDS = ['cube', 'tetra', 'octa', 'stella', 'dodeca', 'icosa', 'hexsphere', 'tetraKite', 'octaKite', 'icosaKite'];
const TORI = ['klein', 'kleinHex', 'kleinTri', 'kleinCairo', 'kleinKite', 'kitetorus', 'kitetorusSquare', 'torus', 'torusSquare', 'tritorus', 'hextorus', 'cairotorus', 'hextorusSquare', 'tritorusSquare', 'cairotorusSquare', 'tritorusTurned', 'hextorusTurned', ...MOBIUS_KINDS];  // sized by rows × tiles per row
// each surface's sizes and its first one, from its family's ladder (see SIZE_LADDERS), when first asked for
for (const [kind, S] of Object.entries(SPHERES)) {
  const { counts, start } = SIZE_LADDERS[TORI.includes(kind) ? 'surface' : 'solid'];
  let near;
  const nearest = () => near ??= (() => {
    const step = S.steps?.[0] ?? 1, sizes = [];
    for (let f = Math.ceil(Math.max(S.least ?? 2, 2) / step) * step; ; f += step) { sizes.push([f, S.tiles(f)]); if (sizes.at(-1)[1] > 1.5 * counts.at(-1)) break; }
    return (n) => sizes.reduce((a, b) => (Math.abs(Math.log(b[1] / n)) < Math.abs(Math.log(a[1] / n)) ? b : a))[0];
  })();
  let list;
  Object.defineProperty(S, 'sizes', { get: () => (list ??= [...new Set(counts.map(nearest()))]) });
  Object.defineProperty(S, 'initial', { get: () => nearest()(start) });
  S.near = (n) => S.sizes.reduce((a, b) => (Math.abs(Math.log(S.tiles(b) / n)) < Math.abs(Math.log(S.tiles(a) / n)) ? b : a));  // the usual size with about n cells
  S.nearest = (f) => S.near(S.tiles(f));  // a mode's own size: the usual one with about as many cells
}
// The triangle and hexagon tori turned by 30° (the ⟲ button by the size): the surface a mode walks on
const TURNED = { tritorus: 'tritorusTurned', hextorus: 'hextorusTurned', mobiusTri: 'mobiusTriTurned', mobiusHex: 'mobiusHexTurned' };
// a torus from a square sheet (Rectangle | Square, under its tilings): not turned
const SQUARE_SHEET = { torus: 'torusSquare', hextorus: 'hextorusSquare', tritorus: 'tritorusSquare', cairotorus: 'cairotorusSquare', kitetorus: 'kitetorusSquare',
                       mobius: 'mobiusSquare', mobiusHex: 'mobiusHexSquare', mobiusTri: 'mobiusTriSquare', mobiusCairo: 'mobiusCairoSquare', mobiusKite: 'mobiusKiteSquare' };
let torusTurned = false, squareSheet = false;
const surfaceOf = (mode) => (squareSheet && SQUARE_SHEET[mode.sphere]) || (torusTurned && TURNED[mode.sphere]) || mode.sphere;
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

// On a Möbius strip's faces, as on a torus, the different walks are one per direction of edge (2 on
// squares, 3 on hexagons and triangles): from the corner of the front nearest the middle of the sheet
// (or the next one, to head the other way), north (or the nearest after it) first, then east.
function mobiusStarts(g) {
  const G = gridGraph(g), k = g.sides, N = G.nv;
  let v0 = g.poly[0], best = Infinity;
  const face = mobiusMiddle(g) < g.L ? 0 : g.front;  // the face in view
  for (let q = k * face; q < k * (face + g.front); q++) {  // its corners
    const d = Math.hypot(g.uv[2 * q] - g.L / 2, g.uv[2 * q + 1] - g.W / 2);
    if (d < best) { best = d; v0 = g.poly[q]; }
  }
  const starts = new Map();
  for (const f of G.nbrs[v0]) {
    const [e, n] = g.delta.get(f * N + v0), h = (Math.atan2(e, n) * 180) / Math.PI;  // clockwise from north
    const key = Math.round(((h % 180) + 180) % 180) % 180;  // its direction, either way
    if (!starts.has(key)) starts.set(key, Math.abs(h - key) < 90 ? [v0, f] : [f, v0]);
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

// The solid's corners: its own (the dodecahedron's, not its pentagons' centres), of its faces, or the
// 12 pentagons of the sphere of hexagons (a pentagon's direction from its 5 corners: its centre
// counts the repeated one twice)
function solidCorners(g) {
  if (g.solid) return g.solid.corners;
  const V = g.verts, C = [];
  const put = (p) => { const u = unit(p); if (!C.some((c) => c[0] * u[0] + c[1] * u[1] + c[2] * u[2] > 1 - 1e-9)) C.push(u); };
  if (g.faces) for (const f of g.faces) f.corners.forEach(put);
  else for (const t of g.walls) put([0, 1, 2].map((d) => [0, 1, 2, 3, 4].reduce((sum, q) => sum + V[3 * g.poly[6 * t + q] + d], 0)));
  return C;
}

// The usual start: gridStart (the sphere of hexagons) or the first corner, arriving by its first edge
const firstStart = (g, G) => g.gridStart ?? [g.poly[0], G.nbrs[g.poly[0]][0]];

// The solid's face centres: its own faces' (the dodecahedron's pentagons), of its faces, or of the
// icosahedron's 20 (3 corners side by side)
function solidFaceCentres(g, C) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sum = (ps) => unit([0, 1, 2].map((d) => ps.reduce((s, p) => s + p[d], 0)));
  if (g.solid) return g.solid.centres;
  if (g.faces) return g.faces.map((f) => sum(f.corners));
  const O = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if (dot(C[i], C[j]) > 0.3 && dot(C[i], C[k]) > 0.3 && dot(C[j], C[k]) > 0.3) O.push(sum([C[i], C[j], C[k]]));
  }
  return O;
}

// The different starts in order, as pairs [corner, the corner it arrives from], one per walk, all
// in one kite, near the usual start: the points of the face F it lies on that are nearer F's
// corner A (the one nearest the usual start) than F's other corners; a quarter of a square face,
// a third of a triangle, as the solid's rotations turn it onto every other such kite. Each walk
// takes its start whose edge's middle lies deepest inside it (on the sphere, a point lies on the
// face whose centre is nearest). An edge gives two starts, towards A first, then away from it, only
// one when a rotation turns it end for end. They follow by distance from A, then by side (the face's
// next corner's first).
function startList(g) {
  if (g.starts) return g.starts;
  if (g.mobius) return (g.starts = mobiusStarts(g));
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
  // the face's other corners, the next one counterclockwise from A (seen from outside) first: B
  const otherCentres = centres.filter((c) => c !== O), turn = (c) => dot(cross(A, c), O);
  const otherCorners = F.filter((c) => c !== A).sort((c1, c2) => turn(c2) - turn(c1));
  const depth = (q) => Math.min(dot(q, O) - Math.max(...otherCentres.map((c) => dot(q, c))), dot(q, A) - Math.max(...otherCorners.map((c) => dot(q, c))));
  const edgeKey = (a, b) => Math.min(a, b) * nv + Math.max(a, b), done = new Set(), picks = [];
  for (let v = 0; v < nv; v++) for (const w of G.nbrs[v]) {
    if (done.has(edgeKey(v, w))) continue;
    let best = null, flipped = false;
    for (const m of rots) {
      const a = turned(m, v), b = turned(m, w), near = depth(mid(a, b));
      done.add(edgeKey(a, b));
      flipped ||= a === w && b === v;
      // an edge across the kite's border has a copy on each of its sides, as deep: the one on the
      // side of the face's next corner, always, so that the border's half edges stick out on one side
      const side = dot(mid(a, b), otherCorners[0]);
      if (!best || near > best.near + 1e-9 || (near > best.near - 1e-9 && side > best.side)) best = { a, b, near, side };
    }
    picks.push({ ...best, flipped });
  }
  // measured flat, in steps of the grid at any size (seen on the sphere, the farther from A, the more
  // squeezed, unlike from size to size): from the solid's corner A* to a grid corner, straight, as
  // every grid corner of the kite lies on a face around A; to an edge's middle from its two ends and
  // the grid's edge L (the longest: on the sphere of hexagons, an edge across a fold is shorter in
  // space than on the unfolded faces). Two edges mirrored across the kite's middle lie as far from
  // A: the one towards B first, as on the kite's border (else rounding errors would pick)
  let h = 0, L = 0;
  for (let v = 0; v < nv; v++) {
    h = Math.max(h, dot(at(v), O));
    for (const w of G.nbrs[v]) L = Math.max(L, Math.hypot(...[0, 1, 2].map((d) => V[3 * w + d] - V[3 * v + d])));
  }
  const corner = (c) => c.map((x) => (x * h) / dot(c, O)), As = corner(A), AB = corner(otherCorners[0]).map((x, d) => x - As[d]);
  const fromA = (v) => Math.hypot(...[0, 1, 2].map((d) => V[3 * v + d] - As[d]));
  for (const e of picks) {
    e.far = Math.sqrt((fromA(e.a) ** 2 + fromA(e.b) ** 2) / 2 - (L * L) / 4);
    e.along = dot([0, 1, 2].map((d) => V[3 * e.a + d] + V[3 * e.b + d] - 2 * As[d]), AB);
  }
  picks.sort((e1, e2) => (Math.abs(e1.far - e2.far) > 1e-9 ? e1.far - e2.far : e2.along - e1.along));
  const starts = [];
  for (const { a, b, flipped } of picks) {  // first the way to the end nearer A, then back
    // ends as far from A (a pentagon's edge): the way round A counterclockwise first
    const ccw = dot(cross([0, 1, 2].map((d) => V[3 * a + d] - As[d]), [0, 1, 2].map((d) => V[3 * b + d] - As[d])), O) > 0;
    const [n, f] = Math.abs(fromA(a) - fromA(b)) > 1e-9 ? (fromA(a) < fromA(b) ? [a, b] : [b, a]) : ccw ? [b, a] : [a, b];
    starts.push(...(flipped ? [[n, f]] : [[n, f], [f, n]]));
  }
  return (g.starts = starts);
}

// The starts of the current mode (a walk along a surface's grid or on its cells), else null; the
// chosen one, 1 … their number
function modeStarts() {
  const mode = MODES[$('mode').value];
  return (mode.grid || mode.cells) && STARTS_ON.includes(surfaceOf(mode)) ? startList(SPHERES[surfaceOf(mode)].mesh(sphereSize())) : null;
}
// A start on cells: a start along the grid, from corner f to corner v, crosses into the tile on its
// right, through that edge. The two tiles of an edge stand for its two directions as its two corners
// do, so the starts on cells are as many as along the grid, numbered alike. [tile, edge come in by]
function cellStart(g, [v, f]) {
  const k = g.sides;
  for (const t of gridGraph(g).edgeTiles.get(gridGraph(g).key(v, f))) {
    for (let e = 0; e < k; e++) if (g.poly[k * t + e] === v && g.poly[k * t + (e + 1) % k] === f) return [t, e];
  }
}
const startNo = () => Math.max(1, Math.min(Number($('startNo').value) || 1, modeStarts()?.length ?? 1));
let startsShown = false;  // while the start number is hovered: the globe shows the starts instead of the walk
let choosingStart = false;  // while the start row is hovered: the view stays as it was

// Every start's edge (two starts each, one per direction); the chosen one in yellow, an arrow in
// its middle, and the start dot on the corner it arrives at
function drawStarts(ctx) {
  const g = walk.geo, G = gridGraph(g), sh = walk.shape, R = walk.R, k = g.sides, proj = projector(), list = startList(g);
  const normal = (v) => unit([G.normal[3 * v], G.normal[3 * v + 1], G.normal[3 * v + 2]]);
  const { scale: s, ox, oy } = view;
  const at = (v) => { const c = 3 * (k * G.tileOf[v] + G.cornerOf[v]); return [sh.corners[c] * R, sh.corners[c + 1] * R, sh.corners[c + 2] * R]; };
  const centre = (t) => [sh.cen[3 * t] * R, sh.cen[3 * t + 1] * R, sh.cen[3 * t + 2] * R];
  // a start's ends and the normal where it arrives: from corner to corner, or on cells from the
  // centre of the tile it leaves to the centre of the one it enters (see cellStart)
  const ends = MODES[$('mode').value].cells
    ? (st) => { const [t, e] = cellStart(g, st); return [centre(g.nbr[k * t + e]), centre(t), [sh.nrm[3 * t], sh.nrm[3 * t + 1], sh.nrm[3 * t + 2]]]; }
    : ([v, f]) => [at(f), at(v), normal(v)];
  const edge = (st) => {  // screen ends: where it comes from, where it arrives; null when facing away
    const [q, p, n] = ends(st);
    if (!planeVisible(n, p)) return null;
    const [x0, y0] = proj(...q), [x1, y1] = proj(...p);
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
  if (Math.abs(Math.abs(angle) - Math.PI) < 1e-9) return from;  // a half turn: back
  if (g.mobius) return nextCornerAround(g, v, from, angle);
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

/* On a Möbius strip's faces, the turn is measured going round the corner, tile by tile (their
 * corners' angles, counterclockwise), and in proportion to the whole way round: where the faces meet
 * on a zigzag edge (hexagons), a corner is not flat, 240° round at an outer corner, 480° at an inner
 * one; straight on is halfway round, a turn of 60° a sixth of the way. On a flat corner, the turns of
 * nextCorner. The wedges of each corner: [the corner it starts towards, the one it ends towards,
 * its angle], once per mesh. */
function cornerWedges(g) {
  if (g.wedges) return g.wedges;
  const k = g.sides, W = Array.from({ length: g.verts.length / 3 }, () => []);
  for (let t = 0; t < g.n; t++) for (let q = 0; q < k; q++) {
    const i = 2 * (k * t + q), a = 2 * (k * t + (q + 1) % k), b = 2 * (k * t + (q + k - 1) % k), uv = g.uv;
    const ax = uv[a] - uv[i], ay = uv[a + 1] - uv[i + 1], bx = uv[b] - uv[i], by = uv[b + 1] - uv[i + 1];
    const angle = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by))));
    W[g.poly[k * t + q]].push([g.poly[k * t + (q + 1) % k], g.poly[k * t + (q + k - 1) % k], angle]);
  }
  return (g.wedges = W);
}
function nextCornerAround(g, v, from, angle) {
  const W = cornerWedges(g)[v], at = [];
  let e = from, phi = 0;
  for (let guard = 0; guard < 16; guard++) {  // counterclockwise from the edge it came by, back to it
    const wedge = W.find(([w]) => w === e);
    if (!wedge) break;
    phi += wedge[2];
    e = wedge[1];
    if (e === from) break;
    at.push([e, phi]);
  }
  const target = ((Math.PI + angle) * phi) / (2 * Math.PI);  // straight on: halfway round
  let next = at[0]?.[0] ?? from, err = Infinity;
  for (const [w, p] of at) {
    const off = Math.abs(p - target) - (p > target ? 1e-9 : 0);  // on a tie, the left one
    if (off < err - 1e-12) { err = off; next = w; }
  }
  return next;
}

/* ---- Loops of a fraction on a torus -----------------------------------------------------------
 * A fraction's digits repeat with a period L. When the turns of a period add up to 0°, each period
 * shifts the walk by the same T on the flat sheet (columns east, rows north). A diagonal one, T both
 * ways, closes after the fewest periods m that make m·T a whole number of turns both ways, and how
 * many depends on the torus's size. For each start, the sizes (32 to 64 rows, proportions within
 * TORUS_RATIO of the usual ones) where it closes within LOOP_STEPS steps without its strands touching
 * (the sheet's area over the chain's length, the room between strands, at least the motif's width
 * across T plus LOOP_GAP), one per number of laps, the nearest the usual proportions: Browse loops
 * goes through the LOOP_MAX with the fewest laps.
 * On a Möbius strip (its faces a slanted torus, see mobiusDelta), m·T must be a whole number of
 * lengths a along it, and then a whole number of 2W across once those come back a·W: its widths
 * from its narrowest to its widest size, its lengths within TORUS_RATIO of the usual one. A walk
 * straight along it depends on its length too (going once along turns it over): only one straight
 * across closes alike at any length. Its laps: along the strip, and across both faces. Only on a
 * strip of squares or of triangles, its edges straight: along the zigzag edges of the others, going
 * over to the face behind bends the walk, as on a solid's corner, and the two faces are no flat torus. */
const TORUS_RATIO = [0.8, 1.25], LOOP_STEPS = 20000, LOOP_GAP = 1, LOOP_MAX = 12;
let torusLoopList = null;  // { key, loops: [{ start, size, laps: [ring, tube], steps }] } for the number in use
function torusLoops() {
  const mode = MODES[$('mode').value], key = `${formulaInUse} ${$('mode').value} ${surfaceOf(mode)}`;
  if (!(mode.grid || mode.cells) || !TORI.includes(surfaceOf(mode))) return [];  // along the grid or on cells, on a torus or a Möbius strip
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
  const kind = surfaceOf(mode), S = SPHERES[kind], g = S.mesh(sphereSize()), walker = surfaceSteps(g, mode);
  const gcdN = (x, y) => (y ? gcdN(y, x % y) : x);
  startList(g).forEach((_, i) => {
    let state = walker.start(i), x = 0, y = 0;
    const at = [], band = [];
    for (let j = 1; j <= s0 + 2 * L; j++) {  // the shifts of two periods in a row
      const next = walker.step(state, digit(j - 1)), [du, dv] = walker.sheet(state, next);
      x += du; y += dv; state = next;
      if (j === s0 || j === s0 + L || j === s0 + 2 * L) at.push([x, y]);
      if (j >= s0 && j <= s0 + L) band.push([x, y]);
    }
    const T = [at[1][0] - at[0][0], at[1][1] - at[0][1]];
    if (Math.abs(at[2][0] - at[1][0] - T[0]) > 1e-6 || Math.abs(at[2][1] - at[1][1] - T[1]) > 1e-6) return;  // its period turns
    const len = Math.hypot(...T), across = band.map(([px, py]) => (px * T[1] - py * T[0]) / len);
    const width = Math.max(...across) - Math.min(...across), best = new Map();
    const keep = (loop) => { const kept = best.get(`${loop.laps}`); if (!kept || loop.off < kept.off) best.set(`${loop.laps}`, loop); };
    if (g.mobius) {
      if (!['mobius', 'mobiusTri'].includes(kind) || Math.abs(T[0]) < 1e-6) return;  // zigzag edges; or straight across: any length closes it alike
      const { step, ok } = MOBIUS_ALONG[kind], most = Math.floor((LOOP_STEPS - s0 - L) / L);
      for (let nv = Math.min(...S.sizes); nv <= Math.max(...S.sizes); nv++) {
        const { W, L: Lu } = mobiusSheet(kind, nv), usual = Lu / step;
        for (let n = Math.ceil(usual * TORUS_RATIO[0]); n <= usual * TORUS_RATIO[1]; n++) {
          if (!ok(n, nv)) continue;
          const Ls = n * step, whole = (x) => Math.abs(x - Math.round(x)) < 1e-6;
          let m = 1;
          for (; m <= most; m++) if (whole((m * T[0]) / Ls) && whole((m * T[1] - Math.round((m * T[0]) / Ls) * W) / (2 * W))) break;
          if (m > most || (2 * Ls * W) / (m * len) < width + LOOP_GAP) continue;
          const laps = [Math.round(Math.abs(m * T[0]) / Ls), Math.round(Math.abs(m * T[1]) / (2 * W))];
          keep({ start: i + 1, size: `${nv}x${n}`, laps, steps: m * L + s0 + L, off: Math.abs(Math.log(n / usual)) });
        }
      }
      loops.push(...best.values());
      return;
    }
    if (Math.abs(T[0]) < 1e-6 || Math.abs(T[1]) < 1e-6) return;  // not diagonal: any size closes it alike
    const U = Math.round(2 * T[0]), V = Math.round(2 * T[1]), usual = 48 / (S.columns(48) * S.perRow);  // in half tiles
    for (let rows = 32; rows <= 64; rows += S.steps[0]) {
      for (let e = Math.ceil(rows / usual / TORUS_RATIO[1]); e <= rows / usual / TORUS_RATIO[0]; e++) {
        if (e % S.steps[1]) continue;
        const cols = e / S.perRow, mu = (2 * cols) / gcdN(2 * cols, Math.abs(U)), mv = (2 * rows) / gcdN(2 * rows, Math.abs(V));
        const m = (mu / gcdN(mu, mv)) * mv, laps = [Math.round((m * Math.abs(T[0])) / cols), Math.round((m * Math.abs(T[1])) / rows)];
        const steps = m * L + s0 + L, off = Math.abs(Math.log(rows / e / usual));
        if (steps > LOOP_STEPS || (cols * rows) / (m * len) < width + LOOP_GAP) continue;
        keep({ start: i + 1, size: `${rows}x${e}`, laps, steps, off });
      }
    }
    loops.push(...best.values());
  });
  loops.sort((a, b) => a.laps[0] + a.laps[1] - b.laps[0] - b.laps[1] || a.start - b.start || a.steps - b.steps);
  loops.length = Math.min(loops.length, LOOP_MAX);
  return loops;
}
// The loop shown, if the start and size in use are one of them
function loopShown(loops) {
  const kind = surfaceOf(MODES[$('mode').value]), [rows, cols] = torusDims(kind, sphereSize());
  return loops.findIndex((l) => l.start === startNo() && `${torusDims(kind, l.size)}` === `${rows},${cols}`);
}
function syncLoopRow() {
  const loops = torusLoops();
  const i = loops.length ? loopShown(loops) : -1, l = loops[i];
  $('loopRow').hidden = !loops.length;
  $('loopLabel').classList.toggle('on', !!l);  // yellow on a loop
  if (!loops.length) return;
  $('loopLabel').innerHTML = `${icon('loop')} ${l ? `${i + 1} of ${loops.length} · ${l.laps[0]}+${l.laps[1]}` : `${loops.length} diagonal`}`;  // ↻: a loop
  $('loopDown').disabled = i === 0;
  $('loopUp').disabled = i === loops.length - 1;
}
// − / +: the start, size and digits (one round) of the loop before or after
function browseLoop(delta) {
  const loops = torusLoops(), i = loopShown(loops), next = loops[i < 0 ? (delta > 0 ? 0 : loops.length - 1) : i + delta];
  if (!next) return;
  $('startNo').value = next.start;
  selectSize(surfaceOf(MODES[$('mode').value]), next.size);
  digitsBeforeLoop ??= requestedDigits();  // the count asked comes back for the next number
  $('digits').value = next.steps;
  compute(true);
}

// A walk back on an earlier state with the same digits ahead draws the same steps again, forever: it
// stops there, after its first round. The digits are compared up to the ones ahead (LOOP_AHEAD
// after those walked), and only with at least LOOP_AHEAD of them left, so that no other number gets
// cut by chance. looped(p, state): the state at point p; the point it was at before if the walk
// goes round from there, else null.
function loopWatch(seq, ahead) {
  const all = new Uint8Array(seq.length + ahead.length), firstAt = new Map();
  all.set(seq);
  all.set(ahead, seq.length);
  const repeats = (a, b) => { for (let x = b; x < all.length; x++) if (all[x] !== all[x - b + a]) return false; return true; };
  return (p, state) => {
    const earlier = firstAt.get(state);
    if (earlier === undefined) { firstAt.set(state, p); return null; }
    return all.length - p >= LOOP_AHEAD && repeats(earlier, p) ? earlier : null;
  };
}
// A Möbius strip's two faces make a flat torus, slanted: a point of a face, on it, is along the strip
// and across both faces (the back from W to 2W, read the other way); going once along the strip
// comes back W across, on the other face, so the torus repeats by (L, W) and (0, 2W). The step from
// point p to point q, the shortest of its copies.
const mobiusAt = (g, t, [x, y]) => (t < g.front ? [x, y] : [x, 2 * g.W - y]);
function mobiusDelta(g, p, q) {
  let best = null;
  for (let a = -1; a <= 1; a++) for (let b = -2; b <= 2; b++) {
    const d = [q[0] - p[0] - a * g.L, q[1] - p[1] - a * g.W - 2 * b * g.W];
    if (!best || Math.hypot(...d) < Math.hypot(...best)) best = d;
  }
  return best;
}
// The steps of a walk on a surface, along the grid (from corner to corner, the state [corner, the
// corner it came from]) or on cells (from tile to tile, [tile, the edge it came in by]): the state
// of start i, the state after a digit, as a whole number, and on a torus or a Möbius strip the step
// on the flat sheet (columns east, rows north; on cells, from tile centre to tile centre)
function surfaceSteps(g, mode) {
  const starts = startList(g);
  if (mode.grid) {
    const G = gridGraph(g), angles = mode.turns.map((a) => (a * Math.PI) / 180), k = g.sides;
    const corner = (v) => { const i = 2 * (k * G.tileOf[v] + G.cornerOf[v]); return mobiusAt(g, G.tileOf[v], [g.uv[i], g.uv[i + 1]]); };
    return { start: (i) => starts[i], step: ([v, from], d) => [nextCorner(g, G, v, from, angles[d]), v],
             key: ([v, from]) => v * G.nv + from,
             sheet: ([a], [b]) => (g.mobius ? mobiusDelta(g, corner(a), corner(b)) : sheetDelta(g, G, a, b)) };
  }
  // Entering a tile through edge k (corners counterclockwise), the digit d leaves through edge
  // k + turns[d]: k + 1 is on the right, k − 1 on the left, k + 2 straight on (for squares). Edges
  // are counted among those with a neighbour: a pentagon of the hexagon sphere (a hexagon with an
  // edge of length 0) has 5.
  const k = g.sides, live = Array.from({ length: g.n }, (_, u) => {
    const ks = [];
    for (let e = 0; e < k; e++) if (g.nbr[k * u + e] >= 0) ks.push(e);
    return ks.length < k ? ks : null;
  });
  const centre = (t) => {
    let u = 0, v = 0;
    for (let q = 0; q < k; q++) { u += g.uv[2 * (k * t + q)]; v += g.uv[2 * (k * t + q) + 1]; }
    return [u / k, v / k];
  };
  // a pivot walk: the turns on the spot since its last step (p), and a step k/2 − p edges on from its entry;
  // a parity walk: the turn its last digit asked (p: 1 right, −1 left, 0) and the parity of the digits read (q)
  const own = mode.pivot || mode.parity;
  return {
    start: (i) => (own ? [...cellStart(g, starts[i]), 0, 0] : cellStart(g, starts[i])),
    step: ([t, entry, p, q], d) => {
      if (mode.pivot && d) return [t, entry, (p + 1) % k, 0];
      const ks = live[t], n = ks ? ks.length : k, at = ks ? ks.indexOf(entry) : entry;
      const j = (((at + (own ? k / 2 - p : mode.turns[d])) % n) + n) % n, edge = ks ? ks[j] : j, next = [g.nbr[k * t + edge], g.nbrEdge[k * t + edge]];
      return !own ? next : mode.pivot ? [...next, 0, 0] : [...next, d ? (q ? -1 : 1) : 0, 1 - q];
    },
    key: ([t, entry, p = 0, q = 0]) => ((t * k + entry) * k + ((p + k) % k)) * 2 + q,
    sheet: ([a], [b]) => {
      if (g.mobius) return mobiusDelta(g, mobiusAt(g, a, centre(a)), mobiusAt(g, b, centre(b)));
      const p = centre(a), q = centre(b), du = q[0] - p[0], dv = q[1] - p[1];
      return [du - g.nu * Math.round(du / g.nu), dv - g.nv * Math.round(dv / g.nv)];
    },
  };
}

function buildGridWalk(seq, mode, ahead = new Uint8Array(0)) {
  const { turns, base, initial } = mode, kind = surfaceOf(mode);
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize(), g = mesh(size), R = radius(size), G = gridGraph(g), V = g.verts;
  const len = seq.length, at = (v) => [V[3 * v], V[3 * v + 1], V[3 * v + 2]];
  const wx = new Float64Array(len + 1), wy = new Float64Array(len + 1), wz = new Float64Array(len + 1);
  const vert = new Int32Array(len + 1), tile = new Int32Array(len + 1), cells = new Int32Array(len + 1);
  const maxDist = new Float64Array(len + 1), counts = new Int32Array(base * (len + 1)), stepTiles = new Int32Array(2 * len);
  const seen = new Uint8Array(G.nv), angles = turns.map((a) => (a * Math.PI) / 180);
  let [v, from] = STARTS_ON.includes(kind) ? startList(g)[startNo() - 1] : firstStart(g, G);
  // p: a pivot walk's turns on the spot since its last step, a parity walk's turn asked by its last digit
  // (1 right, −1 left), in notches (N a whole turn); q: the parity of the digits a parity walk has read
  const N = mode.pivot ?? mode.parity ?? 1;
  let distinct = 1, m = 0, coverStep = -1, p = 0, q = 0;
  const key = () => ((v * G.nv + from) * N + ((p + N) % N)) * 2 + q;
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
  const looped = loopWatch(seq, ahead);  // (corner, the corner it came from)
  looped(0, key());
  let steps = len, loop = null;
  for (let i = 0; i < len; i++) {
    if (mode.pivot && seq[i]) {  // a turn on the spot: no step
      p = (p + 1) % mode.pivot;
      stepTiles[2 * i] = stepTiles[2 * i + 1] = i ? stepTiles[2 * i - 1] : G.tileOf[v];
    } else {
      const next = nextCorner(g, G, v, from, N > 1 ? (-2 * Math.PI * p) / N : angles[seq[i]]);
      const sides = G.edgeTiles.get(G.key(v, next));
      stepTiles[2 * i] = sides[0]; stepTiles[2 * i + 1] = sides[1] ?? sides[0];
      from = v; v = next; p = 0;
      if (mode.parity) { q ^= 1; p = seq[i] ? (q ? 1 : -1) : 0; }
    }
    if (!seen[v]) { seen[v] = 1; distinct++; if (distinct === G.nv) coverStep = i + 1; }
    put(i + 1);
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + seq[i]]++;
    const earlier = looped(i + 1, key());
    if (earlier !== null) { steps = i + 1; loop = { from: earlier }; break; }
  }
  Object.assign(walk, { n: steps, loop, digits: seq, wx, wy, wz, is3d: true, cells, maxDist, base, counts,
                        lattice: 'sphere', skipZeros: false, keys: seq,
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

function buildSphereWalk(seq, mode, ahead = new Uint8Array(0)) {
  const { initial } = mode, kind = surfaceOf(mode);
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize(), g = mesh(size), R = radius(size), S = surfaceSteps(g, mode);
  const len = seq.length, w = current.mode, ant = !!mode.antOf;
  // an ant: it walks the surface's cells by its turns, the cells keeping their colours (see antStepper)
  const antStep = ant ? antStepper(w, (d) => { state = S.step(state, d); return state; }, S.start(startNo() - 1)[0]) : null;
  const base = ant && !antByDigits ? antStep.colours : mode.base, turns = ant ? new Uint8Array(len) : null;
  const wx = new Float64Array(len + 1), wy = new Float64Array(len + 1), wz = new Float64Array(len + 1);
  const tile = new Int32Array(len + 1), cells = new Int32Array(len + 1), maxDist = new Float64Array(len + 1);
  const counts = new Int32Array(base * (len + 1));
  const seen = new Uint8Array(g.n);
  let state = S.start(startNo() - 1), t = state[0], distinct = 1, m = 0, coverStep = -1;
  seen[t] = 1;
  const c0 = [g.cen[3 * t], g.cen[3 * t + 1], g.cen[3 * t + 2]];
  const put = (i) => {
    wx[i] = g.cen[3 * t] * R; wy[i] = g.cen[3 * t + 1] * R; wz[i] = g.cen[3 * t + 2] * R;
    tile[i] = t;
    cells[i] = distinct;
    // distance from the start, in a straight line
    m = Math.max(m, R * Math.hypot(g.cen[3 * t] - c0[0], g.cen[3 * t + 1] - c0[1], g.cen[3 * t + 2] - c0[2]));
    maxDist[i] = m;
  };
  put(0);
  const looped = loopWatch(seq, ahead);  // (tile, the edge it came in by); not an ant's, whose state is all its cells
  looped(0, S.key(state));
  let steps = len, loop = null;
  for (let i = 0; i < len; i++) {
    if (ant) { antStep(seq[i]); turns[i] = antStep.turn; } else state = S.step(state, seq[i]);
    t = state[0];
    if (!seen[t]) { seen[t] = 1; distinct++; if (distinct === g.n) coverStep = i + 1; }
    put(i + 1);
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + (ant ? antStep.took : seq[i])]++;
    const earlier = ant ? null : looped(i + 1, S.key(state));
    if (earlier !== null) { steps = i + 1; loop = { from: earlier }; break; }
  }
  Object.assign(walk, { n: steps, digits: seq, wx, wy, wz, is3d: true, cells, maxDist, base, counts, ant: ant ? antStep.colours : 0, turns,
                        lattice: 'sphere', skipZeros: false, keys: seq,
                        sphere: true, geo: g, R, tile, vert: null, stepTiles: null, loop, nodes: g.n, coverStep,
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
// fading trail after a cell dies: from a light slate grey down to the background
const LIFE_WALL = '#c4934e';  // the walls of a Life run (the hexagon sphere's pentagons)

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

// Hensel's letters on squares (as Golly's liferules.cpp): where 1 to 7 live neighbours sit among the 8, up to the
// square's turns and mirrors (51 ways with 0 and 8). Each letter's picture for 1 to 4, a 3 × 3 bit mask (bit 3·row +
// column, the cell itself bit 4); for 5 to 7, the pictures of 3 to 1 the other way round (live ↔ dead)
const HENSEL = [['ce', [1, 2]], ['ceaikn', [5, 10, 3, 40, 33, 68]], ['ceaiknjqry', [69, 42, 11, 7, 98, 13, 14, 70, 41, 97]],
  ['ceaiknjqrytwz', [325, 170, 15, 45, 99, 71, 106, 102, 43, 101, 105, 78, 108]]];
const HENSEL_RING = [0, 1, 2, 3, 5, 6, 7, 8];  // neighbour q of the ring (see planeNeighbours): its bit in the 3 × 3 mask
const henselClass = (() => {
  const flip = (x) => ((x & 7) << 6) | ((x & 0x1c0) >> 6) | (x & 0x38);
  const turn = (x) => ((x & 4) << 6) | ((x & 32) << 2) | ((x & 256) >> 2) | ((x & 2) << 4) | (x & 16) | ((x & 128) >> 4) | ((x & 1) << 2) | ((x & 8) >> 2) | ((x & 64) >> 6);
  const least = (x) => { let m = x; for (let f = 0; f < 2; f++, x = flip(x)) for (let r = 0; r < 4; r++, x = turn(x)) m = Math.min(m, x); return m; };
  const of = new Map();
  HENSEL.forEach(([letters, pics], i) => pics.forEach((p, k) => { of.set(least(p), letters[k]); if (i < 3) of.set(least(p ^ 0x1ef), letters[k]); }));
  const table = Array.from({ length: 256 }, (_, m) => of.get(least(HENSEL_RING.reduce((x, b, q) => x | (((m >> q) & 1) << b), 0))) ?? '');
  return (mask) => table[mask];  // the letter (lower case) of a mask of the ring's 8 neighbours; '' for 0 or 8
})();
const HENSEL_LETTERS = Array.from({ length: 9 }, (_, c) => (c === 0 || c === 8 ? [] : HENSEL[Math.min(c, 8 - c) - 1][0].split('')));  // each count's letters

// "B3/S23", "B2/S/C3" or "B3/S23/Immigration" → birth and survival tables indexed by the number of
// live neighbours, and C, the number of states: 2 for Life, more for "Generations" rules (dying
// stages), 3 for two civilisations (two: true). On hexagons, Callahan's letters ("B2o/S2m34") tell
// where the neighbours sit (iso: true): the tables are then indexed by 16 + the 6-bit mask of them.
function parseRule(text) {
  const m = text.replace(/\s/g, '').toUpperCase().match(/^B([\dOMPCEKAINYQJRTWZ-]*)\/S([\dOMPCEKAINYQJRTWZ-]*)(?:\/C(\d+))?(?:\/(IMMIGRATION)|\/COLOURS(\d+))?H?$/);
  if (!m || /^[A-Z-]/.test(m[1]) || /^[A-Z-]/.test(m[2])) return null;
  // letters: Callahan's on hexagons (o, m, p), else Hensel's on squares (see henselClass), "-": all but these
  const hex = /[OMP]/.test(m[1] + m[2]), hensel = /[A-Z-]/.test((m[1] + m[2]).replace(/[OMP]/g, ''));
  if (hex && hensel) return null;
  // colours: civilisations, each newborn taking the colour most of its live neighbours have (2: Immigration),
  // apart from the states C (alive, the dying stages, dead). A cell: 0 dead, k alive of colour k (1 … K),
  // k + K × s dying of colour k at stage s (1 … C − 2). A start has live cells only: one digit a cell in
  // base K + 1 (one colour: in base C, its dying stages too)
  const colours = m[4] ? 2 : m[5] ? Number(m[5]) : 1, two = colours === 2, C = m[3] ? Number(m[3]) : 2, iso = hex ? 'hex' : hensel ? 'hensel' : false;
  if (C < 2 || C > 10 || colours > LIFE_COLOURS.length) return null;
  const ring = hensel ? 8 : 6, classOf = hensel ? (mask) => henselClass(mask).toUpperCase() : hexClass;
  const table = (spec) => {
    const a = new Uint8Array(16 + (1 << ring));  // by the count, and by 16 + the mask of where they sit
    for (const [, d, not, letters] of spec.matchAll(/(\d)(-?)([A-Z]*)/g)) {
      if (!letters) a[+d] = 1;
      for (let mask = 0; mask < 1 << ring; mask++) {
        const bits = mask.toString(2).replace(/0/g, '').length;
        if (bits === +d && (!letters || letters.includes(classOf(mask)) !== !!not)) a[16 + mask] = 1;
      }
    }
    return a;
  };
  const tail = (C > 2 ? `/C${C}` : '') + (two ? '/Immigration' : colours > 2 ? `/Colours${colours}` : '');
  return { B: table(m[1]), S: table(m[2]), C, two, colours, iso, base: colours > 1 ? colours + 1 : C, text: `B${m[1].toLowerCase()}/S${m[2].toLowerCase()}${tail}` };
}

// The starting counts of a Life run: live cells (and the blue ones with two civilisations), dying ones
function countSeed(L) {
  L.seedAlive = L.seedDying = 0;
  L.seedByColour = new Int32Array(L.colours + 1);  // civilisations: the cells of each colour
  for (const v of L.seed) {
    if (v && v <= L.colours) L.seedAlive++;
    else if (v) L.seedDying++;
    if (L.colours > 1 && v <= L.colours) L.seedByColour[v]++;
  }
  L.seedBlue = L.seedByColour[2] ?? 0;
}
// the civilisations' colours (1, 2… : red, blue, gold, green, violet, orange) and their names
const LIFE_COLOUR_NAMES = ['red', 'blue', 'gold', 'green', 'violet', 'cyan', 'magenta', 'lime', 'orange', 'pink', 'indigo', 'teal'];  // (see LIFE_HUES)
// in colours, the colour of each state from 1: alive in its colour, then fainter at each dying stage
const civColours = (K, C) => [...LIFE_COLOURS.slice(0, K), ...Array.from({ length: K * (C - 2) }, (_, i) => faded(LIFE_COLOURS[i % K], 1 - (Math.floor(i / K) + 1) / (C - 1)))];

// Number of states of the current Life rule = the base the number is written in
const lifeStates = () => (lifeRuleNow() || { base: 2 }).base;  // one colour: C; colours: K + 1 (a start has live cells only)

// A surface's start, as the Start says: its digits (one base-C digit a cell: 0 dead, 1 alive, 2… dying;
// in colours, base K + 1), or a soup as dense as said, from its seed (in colours, each live cell's colour
// drawn too)
function surfaceSeed(seq, n, C, K) {
  const seed = new Uint8Array(n), p = plane.density / 100;
  if (plane.start === 'digits') seed.set(seq.subarray(0, n));
  else for (let t = 0; t < n; t++) if (cellRandom(plane.seed, t) < p) seed[t] = K > 1 ? 1 + Math.floor(cellRandom(plane.seed + 1, t) * K) : 1;
  return seed;
}
// the same grid, another soup (a new seed, density): a surface's or the plane's
function lifeReseed() {
  if (walk.plane) { planeReseed(); return; }
  const L = walk.life;
  L.seed.set(surfaceSeed(walk.digits, L.seed.length, L.C, L.colours));
  for (const t of walk.geo.walls ?? []) L.seed[t] = 0;
  startColours(L.seed);
  setLifeSeed(L.seed.slice(), null);
}
// A start as the Start says, once the grid is built: in Hunt, a soup's colours each in its part of the
// grid (see huntParts)
function startColours(seed) {
  const K = walk.life.colours;
  if (plane.start !== 'random') return;
  // the zone picked, if it does not fit here: a smaller radius, else the soup (also for the link's start)
  const fits = huntFits(), r = hunt.zone === 'face' ? Infinity : zoneRadius(hunt.zone);
  if (hunt.zone === 'custom' || !fits[hunt.zone]) hunt.zone = [8, 7, 6, 5, 4, 3, 2, 1].map((k) => `radius${k}`).find((z) => zoneRadius(z) < r && fits[z]) ?? 'full';
  const z = zoneSeed();  // the zone picked, again on this grid (a radius, patterns)
  if (z) { seed.set(z); lifeStart = { zone: hunt.zone }; return; }
  if (K === 1) return;
  huntParts(0, K).forEach((part, i) => { for (const t of part) if (seed[t]) seed[t] = i + 1; });
}
function buildLife(seq, mode) {
  if (mode.plane) { buildLifePlane(seq); return; }
  const { initial } = mode, kind = surfaceOf(mode);
  fillSphereSizes(kind, initial);
  const { mesh, radius } = SPHERES[kind];
  const size = sphereSize();
  const g = mesh(size);
  const nbr = cornerNeighbours(g);
  fitColours(g);  // as many colours as the surface has fair spots for
  let rule = lifeRuleNow() || parseRule('B3/S23');
  if (rule.iso && (rule.iso !== 'hex' || !nbr.ring)) {  // Callahan's letters need hexagons
    rule = parseRule('B3/S23');
    $('lifePreset').value = rule.text;
  }
  $('lifeRule').value = ruleBody(rule.text);  // the colours apart (see lifeColours)
  if (plane.start === 'draw') plane.start = 'random';  // no drawing on the surfaces
  const seed = surfaceSeed(seq, g.n, rule.C, rule.colours);
  for (const t of g.walls ?? []) seed[t] = 0;
  const n = g.n;
  walk.life = { nbr, ring: rule.iso ? nbr.ring : null, B: rule.B, S: rule.S, C: rule.C, two: rule.two, colours: rule.colours, ruleText: ruleBody(rule.text), seed,
                alive: new Uint8Array(n), next: new Uint8Array(n), age: new Uint16Array(n),
                died: new Int32Array(n), activity: new Uint32Array(n), ever: new Uint8Array(n) };
  countSeed(walk.life);
  lifeStart = null;  // the number's digits
  const one = new Float64Array(1);
  Object.assign(walk, { vert: null, stepTiles: null, loop: null, n: Infinity, digits: seq, wx: one, wy: one, wz: one, is3d: true, cells: null,
                        maxDist: null, base: rule.base, counts: null, lattice: 'sphere', skipZeros: false, points: false,
                        keys: seq, sphere: true, geo: g, R: radius(size), tile: new Int32Array(1),
                        coverStep: -1, visits: new Int32Array(n), maxVisits: 0,
                        xs: new Float64Array(1), ys: new Float64Array(1) });
  initShape(kind);
  setPerspective();
  project();
  updateHint();
  startColours(walk.life.seed);  // in colours, each in its part
  countSeed(walk.life);
  restart();
  if (walk.shape) applyShape();
  hunt.top = [];  // a new surface, rule or colours: the starts found were another game's
  hunt.status = '';
  stopHunt();
  renderColours();  // the blocks a figure fits, now that it is built
  autoplay();
}

/* Life on the plane: a grid of squares, of hexagons or of triangles (a rhombus of them, as on paper),
 * plane.side cells a side, its edges glued (a torus) or dead; its cells starting as a random soup (so
 * many % alive, from a seed), the same soup copied by a symmetry (mirror, rotation, kaleidoscope on
 * squares; turned by half a turn otherwise: one draw for a cell and all its copies), a classic pattern
 * in the middle (squares), cells drawn by hand (the population, in RLE), or the number's digits. It
 * runs as the surfaces' Life does, its neighbours those sharing an edge or a corner (8 squares, 6
 * hexagons, 12 triangles; fewer on dead edges). A cell is (x, y): its column and its row, triangles
 * two a rhombus (▲ then ▼), index y × row + x. */
// the plane's sizes: the squares' side, every grid as many cells (see planeW), each up to what it runs well at
const PLANE_SIDES = { square: [16, 24, 32, 48, 64, 128, 256, 512, 1024, 2048], hex: [16, 24, 32, 48, 64, 128, 256, 512], tri: [16, 24, 32, 48, 64, 128, 256], cairo: [16, 24, 32, 48, 64, 128, 256], kite: [16, 24, 32, 48, 64, 128], hat: [16, 24, 32, 48, 64, 128], penrose: [16, 24, 32, 48, 64, 128] };
for (const kind of Object.keys(TILINGS)) PLANE_SIDES[kind] = [16, 24, 32, 48, 64, 128];
const plane = { side: 48, torus: true, start: 'random', density: 30, seed: 1 + Math.floor(Math.random() * 999999999), sym: 'none' };  // a soup of its own each visit (a link keeps its seed)
// Draw's brush: a cell or a pattern (squares only), turned by quarter turns and mirrored, in a colour
// (0: the eraser)
const brush = { id: 'cell', turn: 0, flip: false, colour: 1 };
let ghost = null;  // the cell under the pointer while drawing, where the brush would go
let cleared = null;  // the cells Clear took away, back with Undo until something else is drawn or started
// Draw's patterns, each for the rules it was found with (a rule of your own: all its grid's): [id, grid,
// rules, name, RLE (the plane's rows: two triangles or pentagons a square, its first square an even one
// on Cairo; o or A alive, B C… dying), what it does, its picture (5 × 5 pixels; else its cells)]
const BRUSH_CELL = ['cell', '', [], 'Cell', 'o!', 'one cell, again to change its state', '.....,.....,..o..'];
const DRAW_PATTERNS = [
  ['glider', 'square', ['B3/S23', 'B36/S23', 'B3/S2-i34q', 'B2i34c/S2-i3'], 'Glider', 'bo$2bo$3o!', 'flies off diagonally', '.....,..o..,...o.,.ooo.'],
  ['rpentomino', 'square', ['B3/S23'], 'R-pentomino', 'b2o$2o$bo!', 'settles at generation 1,103', '.....,..oo.,.oo..,..o..'],
  ['acorn', 'square', ['B3/S23'], 'Acorn', 'bo$3bo$2o2b3o!', 'settles at generation 5,206', '.....,.o...,...o.,oo.oo'],
  ['diehard', 'square', ['B3/S23'], 'Diehard', '6bo$2o$bo3b3o!', 'dies out at generation 130', '.....,....o,oo...,.o.oo'],
  ['pulsar', 'square', ['B3/S23'], 'Pulsar', '2b3o3b3o$$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o$$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo$$2b3o3b3o!', 'beats with period 3', 'oo.oo,o...o,.....,o...o,oo.oo'],
  ['gosper', 'square', ['B3/S23'], 'Gosper gun', '24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!', 'a glider every 30 generations', 'oo.oo,oo.oo,...+.,....+,..+++'],
  ['tship', 'square', ['B3/S2-i34q', 'B2i34c/S2-i3'], 'T-ship', '3o$bo!', 'flies, period 5 · 4 cells (tlife\'s name)', '.....,.ooo.,..o..,.....,.....'],
  ['justfriends-ship', 'square', ['B2-a/S12'], 'Ship', 'o$o$bo!', 'flies diagonally, period 6 · 3 cells', '.....,.o...,.o...,..o..,.....'],
  // found by a search of each rule's small starts (PATTERNS.md); their pictures are their cells
  ['daynight-osc', 'square', ['B3678/S34678'], 'Oscillator', '.A$.A$2A$A!', 'period 16 · 5 cells'],
  ['daynight-meth', 'square', ['B3678/S34678'], 'Methuselah', '2.A$2A2.A$2A2.A$A.2A$2A.2A!', 'settles at generation 219 · 14 cells'],
  ['loops-osc', 'hex', ['B34/S123/C3'], 'Oscillator', '2.A$.A$2A$A$A!', 'period 8 · 6 cells'],
  ['hexclassic-osc', 'hex', ['B2/S34'], 'Oscillator', '3.A$$2.A$.2A$$2A!', 'period 48 · 6 cells'],
  ['hexclassic-meth', 'hex', ['B2/S34'], 'Methuselah', '4.A$4.A$3.A$4A$3A!', 'settles at generation 254 · 10 cells'],
  ['highlife-ship0', 'square', ['B36/S23'], 'Glider', 'A$A.A$2A!', 'flies, period 4 · 5 cells'],
  ['highlife-osc', 'square', ['B36/S23'], 'Oscillator', '5.A2.A$2A2.A3.A$2A2.2A.2A!', 'period 10 · 12 cells'],
  ['highlife-meth', 'square', ['B36/S23'], 'Seed', 'A.2A$3.2A$2A$3.2A$3A!', 'keeps spreading · 12 cells'],
  ['hexlife-osc', 'hex', ['B24/S35'], 'Oscillator', '3.A$2.A$.A$A!', 'period 6 · 4 cells'],
  ['hbrink-ship0', 'hex', ['B24/S134/C4'], 'Glider', '3.AC$.AB.B$ACACAC$AB.B$.AC!', 'flies, period 2 · 16 cells'],
  ['hbrink-meth', 'hex', ['B24/S134/C4'], 'Methuselah', '4.A$.A2.A$A.2A$A2.A$.A!', 'settles at generation 1,810 · 9 cells'],
  ['brian-ship0', 'square', ['B2/S/C3'], 'Glider', '2A$2B!', 'flies, period 1 · 4 cells'],
  ['brian-ship1', 'square', ['B2/S/C3'], 'Spaceship', '.A$BAB$3.A$2.B!', 'flies, period 4 · 6 cells'],
  ['brian-meth', 'square', ['B2/S/C3'], 'Seed', '3.2A$A$.4A$4.A$3A.A!', 'keeps spreading · 12 cells'],
  ['swarm-ship', 'hex', ['B2op3m/S12mp3p4p5'], 'Glider', '2.3A$5.A$A$A3.A$.2A!', 'flies, period 8 · 9 cells'],
  ['comets-ship0', 'hex', ['B2345/S134/C5'], 'Glider', '.AC$2ABA$AC!', 'flies, period 4 · 8 cells'],
  ['comets-ship1', 'hex', ['B2345/S134/C5'], 'Spaceship', '.DCD$.BAB$C3A$2A!', 'flies, period 2 · 12 cells'],
  ['comets-ship2', 'hex', ['B2345/S134/C5'], 'Spaceship', '3.D$.CB2D$2A2B$3AC$.2A!', 'flies, period 2 · 15 cells'],
  ['comets-ship3', 'hex', ['B2345/S134/C5'], 'Spaceship', '3.BA$D.2C2A$.B.CBA$3.DB$2.D2A$2.2B$2.A!', 'flies, period 6 · 19 cells'],
  ['comets-ship4', 'hex', ['B2345/S134/C5'], 'Spaceship', '8.2AC$6.2AB2D$4.2A2C.C$2.A2BCD.D$3AD3.2B$BA4.ABA$2C$B!', 'flies, period 8 · 33 cells'],
  ['callahan-ship0', 'hex', ['B2o/S2m34'], 'Glider', '.A$A$A2.A$A$A!', 'flies, period 4 · 6 cells'],
  ['callahan-ship1', 'hex', ['B2o/S2m34'], 'Spaceship', '3.A$2.A$$2.3A$4A$.2A$A!', 'flies, period 48 · 12 cells'],
  ['callahan-osc', 'hex', ['B2o/S2m34'], 'Oscillator', '4.A$3.2A$7A$.A2.A$.A2.A!', 'period 30 · 14 cells'],
  ['callahan-meth', 'hex', ['B2o/S2m34'], 'Seed', '2.2A$.2A.A$2A2.A$A2.A$.2A!', 'keeps spreading · 12 cells'],
  ['starwars-ship0', 'square', ['B2/S345/C4'], 'Glider', 'CBA$CBA!', 'flies, period 1 · 6 cells'],
  ['starwars-meth', 'square', ['B2/S345/C4'], 'Seed', '3A$.3A$3.A$3A$2A!', 'keeps spreading · 12 cells'],
  ['maze-meth', 'square', ['B3/S12345'], 'Seed', 'A3.A$2.A$2A$5A!', 'keeps spreading · 10 cells'],
  ['cairolife-osc', 'cairo', ['B34/S23'], 'Oscillator', '3.A.A$A2.2A$3.A.A!', 'period 6 · 7 cells'],
  ['tlife-osc', 'tri', ['B3/S23'], 'Oscillator', '4A!', 'period 8 · 4 cells'],
  ['tlife-osc8', 'tri', ['B3/S23'], 'Oscillator', '.3A$.2A$3A!', 'period 8 · 8 cells'],
  ['tlife-meth4', 'tri', ['B3/S23'], 'Methuselah', '3A$.A!', 'settles at generation 430 · 4 cells'],
  ['tsparse-osc14', 'tri', ['B45/S345/C4'], 'Oscillator', '3.3A$2.A2B.A$.A.2BA$2.3A!', 'period 4 · 14 cells'],
  ['twin-osc4', 'hex', ['B2om5/S2om4o'], 'Oscillator', '2.A$2.A$2A$.A$A!', 'period 4 · 6 cells'],
  ['loops-osc7', 'hex', ['B34/S123/C3'], 'Oscillator', '.A.A$A2.A$3A$2A!', 'period 7 · 9 cells'],
  ['cairolife-osc4', 'cairo', ['B34/S23'], 'Oscillator', '3.A.A$A2.2A$3.3A!', 'period 4 · 8 cells'],
  ['tlife-meth', 'tri', ['B3/S23'], 'Methuselah', '4.A2.2A$.A3.2A.A$3A.A.3A$2.2A.A$.A.A!', 'settles at generation 1,166 · 19 cells'],
  ['tbrink-meth', 'tri', ['B34/S2/C4'], 'Seed', '3.A2.2A$.3A3.3A$2.A.3A$3A3.A$2.3A!', 'keeps spreading · 20 cells'],
  ['cairogliders-ship0', 'cairo', ['B23/S6/C3'], 'Glider', '$3.A$B.AB.A$2.B!', 'flies, period 2 · 6 cells'],
  ['cairogliders-osc', 'cairo', ['B23/S6/C3'], 'Oscillator', 'A.B2.AB2A$B3.BA.ABA$3.2A2B2.A$B2.A.A3B$2.B3.A!', 'period 6 · 25 cells'],
  ['cairogliders-meth', 'cairo', ['B23/S6/C3'], 'Seed', '5.A.A$3.A2.A2.A$A.3A3.A$2.A2.2A!', 'keeps spreading · 13 cells'],
  ['few-ship0', 'hex', ['B2/S24/C3'], 'Glider', '3.BA$4.B$4.A$2.AB$.A$2A$A!', 'flies, period 6 · 10 cells'],
  ['few-ship1', 'hex', ['B2/S24/C3'], 'Spaceship', '.ABA$B2.B$2.A$2.2A$2.2A!', 'flies, period 6 · 10 cells'],
  ['few-osc', 'hex', ['B2/S24/C3'], 'Oscillator', '.ABA$.B.BA$A2.A$B2A$A.B$BA!', 'period 9 · 15 cells'],
  ['few-meth', 'hex', ['B2/S24/C3'], 'Seed', '4.A$4.A$2A2.A$4A!', 'keeps spreading · 9 cells'],
  ['tsparse-osc', 'tri', ['B45/S345/C4'], 'Oscillator', '5.3A$2.C3.A$.A3.C$3A!', 'period 4 · 10 cells'],
  ['tsparse-meth', 'tri', ['B45/S345/C4'], 'Methuselah', '4.A.2A.A$2.2A2.2A.A$2.3A2.A$A3.A.A$.A!', 'settles at generation 733 · 17 cells'],
  ['smeth-meth', 'hex', ['B234/S1234'], 'Seed', '2.2A$.2A$A.3A$.2A$A.A!', 'keeps spreading · 12 cells'],
  ['meth-meth', 'hex', ['B234/S234'], 'Seed', '2.A.A$.A2.A$4.A$2A$2.A!', 'keeps spreading · 8 cells'],
  ['cairowars-ship0', 'cairo', ['B24/S346/C4'], 'Glider', '$3.A$BCAB.A$C.BC!', 'flies, period 2 · 9 cells'],
  ['cairowars-ship1', 'cairo', ['B24/S346/C4'], 'Spaceship', '3.A3.A$8A.A.A$B.ACBABC2A.C$A2.B2.B2.C$2.C$8.C!', 'flies, period 16 · 28 cells'],
  ['cairowars-meth', 'cairo', ['B24/S346/C4'], 'Seed', '$3.A.A$2.A.A2.A$.3A2.2A$A.3A!', 'keeps spreading · 14 cells'],
  ['seeds-ship0', 'square', ['B2/S'], 'Glider', 'A$.A$.A$A!', 'flies, period 1 · 4 cells'],
  ['longcairo-ship0', 'cairo', ['B2347/S35/C3'], 'Glider', 'AB.A$B.AB!', 'flies, period 2 · 6 cells'],
  ['longcairo-ship1', 'cairo', ['B2347/S35/C3'], 'Spaceship', '7.A$2.3A2B2A2.B$A.2B2.B2A2.B$6.B.B2.A!', 'flies, period 4 · 19 cells'],
  ['longcairo-osc', 'cairo', ['B2347/S35/C3'], 'Oscillator', 'B.2A$A.BA$B.A!', 'period 3 · 8 cells'],
  ['longcairo-meth', 'cairo', ['B2347/S35/C3'], 'Seed', '.3A3.A$.2A2.2A$A.4A!', 'keeps spreading · 13 cells'],
  // found by a search of small random starts for each rule that lacked them (checked in the app: periods, lifetimes)
  ['starwars-osc', 'square', ['B2/S345/C4'], 'Oscillator', 'ABC$.A$3A$.A!', 'period 12 · 8 cells'],
  ['seeds-osc', 'square', ['B2/S'], 'Oscillator', '2.A$A$.A!', 'period 2 · 3 cells'],
  ['mazectric-seed', 'square', ['B3/S1234'], 'Seed', '.A$A$.A!', 'grows corridors for ever · 3 cells'],
  ['swarm-osc', 'hex', ['B2op3m/S12mp3p4p5'], 'Oscillator', '4.A.A$A.A$4.A$2A$A!', 'period 2 · 8 cells'],
  ['swarm-meth', 'hex', ['B2op3m/S12mp3p4p5'], 'Seed', '.3A$.A.A$2A$2A.A!', 'keeps spreading · 10 cells'],
  ['comets-meth', 'hex', ['B2345/S134/C5'], 'Seed', '3A$3A!', 'breaks at once into 2 ships · 6 cells'],
  ['comets-puffer', 'hex', ['B2345/S134/C5'], 'Puffer', 'A.A$A.2A$2.A.A$5A$3.2A$3.2A!', 'flies at half speed leaving a trail of debris · 16 cells'],
  ['twin-osc', 'hex', ['B2om5/S2om4o'], 'Oscillator', 'A$A$A$A!', 'period 6 · 4 cells'],
  ['twin-meth', 'hex', ['B2om5/S2om4o'], 'Seed', '2A.A$4A$2A.A$.3A!', 'keeps spreading · 13 cells'],
  ['loops-osc2', 'hex', ['B34/S123/C3'], 'Oscillator', '.2A.A$2A2.A$A3.A$A3.A$4A!', 'period 22 · 14 cells'],
  ['hexmeth-osc', 'hex', ['B234/S234'], 'Oscillator', '2.A$2A$.A!', 'period 2 · 4 cells'],
  ['snowflakes-seed', 'hex', ['B1/S0123456'], 'Seed', 'A!', 'grows a snowflake · 1 cell'],
  // kites: found by a search of small starts on a kite torus (PATTERNS.md); x along a row, 6 kites a rhombus
  ['kitelife-osc', 'kite', ['B3/S235/C3'], 'Oscillator', '14.A2.A$3.A2.A.B4A.A$6.A!', 'period 12 · 11 cells'],
  ['kitelife-osc3', 'kite', ['B3/S235/C3'], 'Oscillator', '10.2A$6.A2.B$.A.A2.A!', 'period 3 · 7 cells'],
  ['kitelife-meth', 'kite', ['B3/S235/C3'], 'Methuselah', '.A2.A.A3.2A$.2A2.2A4.A!', 'settles at generation 771 · 10 cells'],
  ['kitegliders-ship', 'kite', ['B36/S1258'], 'Glider', '11.A$4.A2.A3.A!', 'flies, period 16 · 4 cells'],
  ['kitegliders-osc', 'kite', ['B36/S1258'], 'Oscillator', '3.A.2A$A.A2.A!', 'period 6 · 6 cells'],
  ['kitegliders-meth', 'kite', ['B36/S1258'], 'Methuselah', 'A.A2.A.A2.2A$2.A3.A2.2A!', 'settles at generation 110, a glider flying off · 10 cells'],
  ['kiteswarm-ship', 'kite', ['B35/S123/C5'], 'Glider', '4.B3.B2.B$.B.BA.B2A!', 'flies, period 6 · 9 cells'],
  ['kiteswarm-osc', 'kite', ['B35/S123/C5'], 'Oscillator', '4.A3.A$4.A$6.A!', 'period 5 · 4 cells'],
  ['kitedrift-ship', 'kite', ['B35/S2356/C4'], 'Spaceship', '10.C3.B2.C$3.A2.A.2A3.BA!', 'flies, period 26 · 9 cells'],
  ['kitedrift-osc', 'kite', ['B35/S2356/C4'], 'Oscillator', '10.A3.A2.A$4.2A4.2A.2A$A6.A!', 'period 4 · 11 cells'],
  ['kitedrift-meth', 'kite', ['B35/S2356/C4'], 'Methuselah', 'A10.A$.5A.A3.A!', 'settles at generation 799, a ship flying off · 9 cells'],
  ['kitesimmer-osc', 'kite', ['B346/S0127/C4'], 'Oscillator', '6.A$.A4.A!', 'period 16 · 3 cells'],
  ['kitesimmer-osc8', 'kite', ['B346/S0127/C4'], 'Oscillator', '8.A2.A$4.A$6.A!', 'period 8 · 4 cells'],
  ['kitesimmer-meth', 'kite', ['B346/S0127/C4'], 'Methuselah', '2.A4.A$3A.A5.A!', 'settles at generation 321 · 7 cells'],
  ['kitemarathon-osc', 'kite', ['B34/S0126/C5'], 'Oscillator', '7.A$.A4.A!', 'period 20 · 3 cells'],
  ['kitemarathon-osc10', 'kite', ['B34/S0126/C5'], 'Oscillator', '11.A$.A7.A2.A!', 'period 10 · 4 cells'],
  ['kitemarathon-meth', 'kite', ['B34/S0126/C5'], 'Methuselah', '2A5.A$.A.3A3.A!', 'settles at generation 454 · 8 cells'],
  ['longkites-osc', 'kite', ['B3/S1247'], 'Oscillator', '10.A$6.A.A2.2A$A.A.A!', 'period 5 · 8 cells'],
  ['longkites-meth', 'kite', ['B3/S1247'], 'Methuselah', '7.A.2A$4.3A!', 'settles at generation 157 · 6 cells'],
  // the new tilings: from a search of small starts in the app's page (tools/famoussearch.js), as found (not turned)
  ['floretlife-osc', 'floret', ['B26/S3578/C3'], 'Oscillator', '5.A.B$3.B2.A!', 'period 3 · 4 cells'],
  ['floretlife-meth', 'floret', ['B26/S3578/C3'], 'Methuselah', '2.2A.A2.A.A$A4.2A2.A.A!', 'settles at generation 207 · 10 cells'],
  ['longflorets-ship', 'floret', ['B24/S456/C4'], 'Spaceship', '.A3.B2ABA.A$3.CB.C2.CB!', 'flies, period 5 · 12 cells'],
  ['longflorets-osc', 'floret', ['B24/S456/C4'], 'Oscillator', '.B.C.4ABA$3.A2.A.C.A!', 'period 8 · 12 cells'],
  ['rhombillelife-osc', 'rhombille', ['B367/S015'], 'Oscillator', '7.A$5.A$A.A!', 'period 3 · 4 cells'],
  ['rhombillesparks-meth', 'rhombille', ['B358/S0237/C4'], 'Methuselah', '3A$2.A2.A!', 'settles at generation 856 · 5 cells'],
  ['rhombitrilife-osc', 'rhombitri', ['B279/S069/C4'], 'Oscillator', '5.A.A$A!', 'period 12 · 3 cells'],
  ['rhombitrilife-meth', 'rhombitri', ['B279/S069/C4'], 'Methuselah', '4.A2.A3.A$.A3.2A.A2.A!', 'settles at generation 529 · 8 cells'],
  ['longrhombitri-osc', 'rhombitri', ['B29/S067/C4'], 'Oscillator', '10.2C$A.C.C.2A!', 'period 13 · 7 cells'],
  ['longrhombitri-meth', 'rhombitri', ['B29/S067/C4'], 'Methuselah', 'A2.A2.A2.A$2.4A4.A!', 'settles at generation 310 · 9 cells'],
  ['snublife-osc', 'snubtri', ['B38/S1369'], 'Oscillator', '6.A.A4.A$10.A!', 'period 4 · 4 cells'],
  ['snublife-meth', 'snubtri', ['B38/S1369'], 'Methuselah', '4.2A.A2.A3.A.A$5.A.A4.A3.A!', 'settles at generation 1,411 · 10 cells'],
  ['snubembers-osc', 'snubtri', ['B359/S0146/C3'], 'Oscillator', '5.A$8.3A!', 'period 6 · 4 cells'],
  ['ilife-osc', 'capitalI', ['B345/S0236'], 'Oscillator', '.A$.2A$A!', 'period 2 · 4 cells'],
  ['pythagoraslife-osc', 'pythagorean', ['B28/S28'], 'Oscillator', 'A$A!', 'period 2 · 2 cells'],
  ['pythagorassparks-osc', 'pythagorean', ['B267/S3457'], 'Oscillator', '3.A$A.2A!', 'period 3 · 4 cells'],
  ['prismaticlife-ship', 'prismatic', ['B25/S157/C5'], 'Spaceship', '2.A.BAB.D.DC$.A.B.BADCD!', 'flies, period 4 · 14 cells'],
  ['longprisms-ship', 'prismatic', ['B245/S16/C5'], 'Spaceship', '2.A.BAB.D.DC$.A.BAB.D.DC!', 'flies, period 4 · 14 cells'],
  ['tetrakislife-osc', 'tetrakis', ['B37/S1'], 'Oscillator', 'A$A$.A!', 'period 2 · 3 cells'],
  ['tetrakislife-meth', 'tetrakis', ['B37/S1'], 'Methuselah', '.A4.A$A.4A.A!', 'settles at generation 1,527 · 8 cells'],
  ['tetrakisembers-osc', 'tetrakis', ['B3/S278'], 'Oscillator', '.A.A$2.2A!', 'period 4 · 4 cells'],
  ['kisrhombillelife-osc', 'kisrhombille', ['B356/S6789/C5'], 'Oscillator', '16.AD2C2.2A.B3.ADC3.A.BA.A3.A$11.AD2BCB2A.5A.B.D2.2A.AC2A2B!', 'period 60 · 38 cells'],
  ['longkisrhombille-osc', 'kisrhombille', ['B38/S169/C3'], 'Oscillator', '4.A.B.A.A!', 'period 3 · 4 cells'],
];
const DRAW_BY_ID = new Map([BRUSH_CELL, ...DRAW_PATTERNS].map((p) => [p[0], p]));
// the symmetries a start may have, per grid: [picture, name, as said]; a rhombus of hexagons or of
// triangles turned by half a turn is itself (Cairo pentagons: none of their own)
const SYMMETRIES = { none: ['symNone', 'None', ''], mirror: ['symMirror', 'Mirror', 'mirrored'], rotate: ['symRotate', 'Rotate', 'turning'],
                     kaleido: ['symKaleido', 'Kaleido', 'kaleidoscopic'], half: ['symHalf', 'Half turn', 'turned by half a turn'] };
const PLANE_SYMMETRIES = { square: ['none', 'mirror', 'rotate', 'kaleido'], hex: ['none', 'half'], tri: ['none', 'half'], cairo: ['none'], kite: ['none'], hat: ['none'], penrose: ['none'] };
for (const kind of Object.keys(TILINGS)) PLANE_SYMMETRIES[kind] = ['none'];
const symmetryOf = (kind) => (PLANE_SYMMETRIES[kind].includes(plane.sym) ? plane.sym : 'none');
// a cell and its copies under the grid's symmetry (index y × row + x)
function cellCopies(kind, W, t) {
  const sym = symmetryOf(kind), n = planeRow(kind, W) * W, last = W - 1;
  if (sym === 'none') return [t];
  if (sym === 'half') return [t, n - 1 - t];
  const x = t % W, y = (t - x) / W, at = ([u, v]) => v * W + u;
  const turns = [[x, y], [last - y, x], [last - x, last - y], [y, last - x]];
  if (sym === 'rotate') return turns.map(at);
  const mirrors = [[x, y], [last - x, y], [x, last - y], [last - x, last - y]];
  return (sym === 'mirror' ? mirrors : [...mirrors, ...mirrors.map(([u, v]) => [v, u])]).map(at);
}
const ROOT3_2 = Math.sqrt(3) / 2;
// The rows of a grid of side `side` (the squares' side): about as many cells as side × side squares (as the surfaces'
// sizes, see SIZE_LADDERS), its cells regular: triangles 2 a rhombus, Cairo pentagons 2 a square (an even side, so
// that it wraps round), kites 6 a rhombus (on triangles twice as big)
const planeTorus = (kind) => plane.torus && !APERIODIC[kind];  // hats and Penrose's rhombi never wrap round: they never repeat
const PLANE_PER = { square: 1, hex: 1, tri: 2, cairo: 2, kite: 6, hat: 1, penrose: 1 };
for (const [kind, t] of Object.entries(TILINGS)) PLANE_PER[kind] = t.polys.length;
const planeW = (kind, side) => (kind === 'cairo' ? 2 * Math.round(side / Math.SQRT2 / 2) : Math.round(side / Math.sqrt(PLANE_PER[kind])));
const planeRow = (kind, W) => (TILINGS[kind] ? TILINGS[kind].polys.length * W : kind === 'kite' ? 6 * W : kind === 'tri' || kind === 'cairo' ? 2 * W : W);  // cells a row (two a rhombus, two a square of Cairo pentagons, six kites a rhombus)
// kite x of row y: kite x % 3 of triangle ⌊x / 3⌋ (as the triangles' x), its corners on the triangles' lattice
const kiteCorners = (x, y) => { const t = Math.floor(x / 3), i = t >> 1; return kitesOf(t & 1 ? [[i + 1, y], [i + 1, y + 1], [i, y + 1]] : [[i, y], [i + 1, y], [i, y + 1]])[((x % 3) + 3) % 3]; };
const latticeAt = (a, b) => [a + b / 2, b * ROOT3_2];  // a corner of the triangles, a centre of the hexagons
// An aperiodic tiling's grid of side W (the hats, Penrose's rhombi): from a patch of it (items: their middles m, each
// about a square unit; poly(item): its corners), the W² items nearest a middle (a square), in W bands from the top,
// each by x (a cell (x, y) as on the other grids); the items round them, its walls
function squarePatch(items, W, poly) {
  // the middle: where a square of W² items' room (a cell about 1 square unit) holds the most of them, the nearest the
  // patch's centre (its outline is ragged: round its centre, a corner may be bare)
  const box = (d) => items.reduce(([a, b], h) => [Math.min(a, h.m[d]), Math.max(b, h.m[d])], [Infinity, -Infinity]), [bx, by] = [box(0), box(1)];
  const half = (Math.sqrt(W * W) * 1.05) / 2, centre = [(bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2];
  // (the items by unit cells of a grid over the patch, summed from a corner: a box's count at once)
  const nx = Math.ceil(bx[1] - bx[0]) + 2, ny = Math.ceil(by[1] - by[0]) + 2, sum = new Int32Array((nx + 1) * (ny + 1));
  for (const h of items) sum[(Math.floor(h.m[1] - by[0]) + 1) * (nx + 1) + Math.floor(h.m[0] - bx[0]) + 1]++;
  for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) sum[y * (nx + 1) + x] += sum[(y - 1) * (nx + 1) + x] + sum[y * (nx + 1) + x - 1] - sum[(y - 1) * (nx + 1) + x - 1];
  const count = (x0, y0, x1, y1) => sum[y1 * (nx + 1) + x1] - sum[y0 * (nx + 1) + x1] - sum[y1 * (nx + 1) + x0] + sum[y0 * (nx + 1) + x0];
  const k = Math.ceil(2 * half) + 1;
  let mid = centre, best = -1;
  for (let y = 0; y + k <= ny; y++) for (let x = 0; x + k <= nx; x++) {
    const c = [bx[0] + x + k / 2, by[0] + y + k / 2], score = count(x, y, x + k, y + k) - 1e-3 * Math.hypot(c[0] - centre[0], c[1] - centre[1]);
    if (score > best) { best = score; mid = c; }
  }
  const far = (h) => Math.max(Math.abs(h.m[0] - mid[0]), Math.abs(h.m[1] - mid[1]));
  items.sort((a, b) => far(a) - far(b));
  const cells = items.slice(0, W * W).sort((a, b) => a.m[1] - b.m[1]), rows = [];
  cells.forEach(poly);
  for (let y = 0; y < W; y++) rows.push(...cells.slice(y * W, (y + 1) * W).sort((a, b) => a.m[0] - b.m[0]));
  // the walls: the items beyond touching one of them (sharing a corner)
  const key = ([u, v]) => `${Math.round(u * 1000)},${Math.round(v * 1000)}`, inside = new Set(rows.flatMap((h) => h.p.map(key)));
  const edge = far(items[W * W - 1]) + 3, near = [];  // (the items just beyond: the next ones by distance)
  for (let k = W * W; k < items.length && far(items[k]) < edge; k++) near.push(items[k]);
  const walls = near.filter((h) => poly(h).some((q) => inside.has(key(q)))).map((h) => h.p);
  // placed as the squares' grid of side W (middle at (W − 1) / 2 both ways): another size grows from the same place
  const o = [mid[0] - (W - 1) / 2, mid[1] - (W - 1) / 2], at = (p) => p.map(([u, v]) => [u - o[0], v - o[1]]);
  return { polys: rows.map((h) => at(h.p)), walls: walls.map(at), key };
}
/* The hat (Smith, Myers, Kaplan and Goodman-Strauss, 2023): one tile, 8 kites of the kites' grid, that tiles the plane
 * only without ever repeating (about 1 in 7 turned over). Built by substitution, as Craig S. Kaplan's hatviz
 * (github.com/isohedral/hatviz, BSD 3-clause): four metatiles (H, T, P, F) are laid in a patch, which gives four
 * bigger ones, and so on; each level about 6.85 times as many hats. The plane's grid of side W: the W² hats nearest
 * the middle (a square, by the larger of their offsets), in W bands from the top, each by x (a cell (x, y) as on the
 * other grids); the hats round them, its walls. Points as {x, y}, transforms as [a, b, c, d, e, f] (x' = ax + by + c). */
const HAT = (() => {
  const hr3 = Math.sqrt(3) / 2, ident = [1, 0, 0, 0, 1, 0];
  const pt = (x, y) => ({ x, y }), hexPt = (x, y) => pt(x + 0.5 * y, hr3 * y);
  const inv = (T) => { const det = T[0] * T[4] - T[1] * T[3]; return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det, -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det]; };
  const mul = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
  const padd = (p, q) => pt(p.x + q.x, p.y + q.y), psub = (p, q) => pt(p.x - q.x, p.y - q.y);
  const trot = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0], ttrans = (x, y) => [1, 0, x, 0, 1, y];
  const rotAbout = (p, a) => mul(ttrans(p.x, p.y), mul(trot(a), ttrans(-p.x, -p.y)));
  const transPt = (M, P) => pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
  const matchSeg = (p, q) => [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
  const matchTwo = (p1, q1, p2, q2) => mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
  const intersect = (p1, q1, p2, q2) => {
    const d = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y), u = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / d;
    return pt(p1.x + u * (q1.x - p1.x), p1.y + u * (q1.y - p1.y));
  };
  const outline = [hexPt(0, 0), hexPt(-1, -1), hexPt(0, -2), hexPt(2, -2), hexPt(2, -1), hexPt(4, -2), hexPt(5, -1), hexPt(4, 0), hexPt(3, 0), hexPt(2, 2), hexPt(0, 3), hexPt(0, 2), hexPt(-1, 2)];
  // the drawn hat: each edge cut at the kites' corners along it (kites' edges 1/2 and √3/2 long), where a neighbour's corner can be
  const corners = outline.flatMap((p, i) => {
    const q = outline[(i + 1) % outline.length], L = Math.hypot(q.x - p.x, q.y - p.y), k = Math.round(Number.isInteger(Math.round(2 * L * 1e6) / 1e6) ? 2 * L : L / hr3);
    return Array.from({ length: k }, (_, j) => pt(p.x + ((q.x - p.x) * j) / k, p.y + ((q.y - p.y) * j) / k));
  });
  const hat = { hat: true };
  class Meta {
    constructor(shape) { this.shape = shape; this.children = []; }
    add(T, geom) { this.children.push({ T, geom }); }
    at(n, i) { return transPt(this.children[n].T, this.children[n].geom.shape[i]); }
    recentre() {
      const c = this.shape.reduce((s, p) => padd(s, p), pt(0, 0)), cx = c.x / this.shape.length, cy = c.y / this.shape.length;
      this.shape = this.shape.map((p) => pt(p.x - cx, p.y - cy));
      for (const ch of this.children) ch.T = mul(ttrans(-cx, -cy), ch.T);
    }
  }
  const H0 = new Meta([pt(0, 0), pt(4, 0), pt(4.5, hr3), pt(2.5, 5 * hr3), pt(1.5, 5 * hr3), pt(-0.5, hr3)]);
  H0.add(matchTwo(outline[5], outline[7], H0.shape[5], H0.shape[0]), hat);
  H0.add(matchTwo(outline[9], outline[11], H0.shape[1], H0.shape[2]), hat);
  H0.add(matchTwo(outline[5], outline[7], H0.shape[3], H0.shape[4]), hat);
  H0.add(mul(ttrans(2.5, hr3), mul([-0.5, -hr3, 0, hr3, -0.5, 0], [0.5, 0, 0, 0, -0.5, 0])), hat);  // the one turned over
  const T0 = new Meta([pt(0, 0), pt(3, 0), pt(1.5, 3 * hr3)]);
  T0.add([0.5, 0, 0.5, 0, 0.5, hr3], hat);
  const P0 = new Meta([pt(0, 0), pt(4, 0), pt(3, 2 * hr3), pt(-1, 2 * hr3)]);
  P0.add([0.5, 0, 1.5, 0, 0.5, hr3], hat);
  P0.add(mul(ttrans(0, 2 * hr3), mul([0.5, hr3, 0, -hr3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), hat);
  const F0 = new Meta([pt(0, 0), pt(3, 0), pt(3.5, hr3), pt(3, 2 * hr3), pt(-1, 2 * hr3)]);
  F0.add([0.5, 0, 1.5, 0, 0.5, hr3], hat);
  F0.add(mul(ttrans(0, 2 * hr3), mul([0.5, hr3, 0, -hr3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), hat);
  // a patch of the four metatiles, each placed along an edge of one before (hatviz's rules)
  const RULES = [['H'], [0, 0, 'P', 2], [1, 0, 'H', 2], [2, 0, 'P', 2], [3, 0, 'H', 2], [4, 4, 'P', 2], [0, 4, 'F', 3], [2, 4, 'F', 3], [4, 1, 3, 2, 'F', 0],
    [8, 3, 'H', 0], [9, 2, 'P', 0], [10, 2, 'H', 0], [11, 4, 'P', 2], [12, 0, 'H', 2], [13, 0, 'F', 3], [14, 2, 'F', 1], [15, 3, 'H', 4], [8, 2, 'F', 1],
    [17, 3, 'H', 0], [18, 2, 'P', 0], [19, 2, 'H', 2], [20, 4, 'F', 3], [20, 0, 'P', 2], [22, 0, 'H', 2], [23, 4, 'F', 3], [23, 0, 'F', 3], [16, 0, 'P', 2],
    [9, 4, 0, 2, 'T', 2], [4, 0, 'F', 3]];
  function patchOf(shapes) {
    const out = new Meta([]);
    for (const r of RULES) {
      if (r.length === 1) { out.add(ident, shapes[r[0]]); continue; }
      const [P, Q, s, e] = r.length === 4
        ? (() => { const ch = out.children[r[0]], poly = ch.geom.shape; return [transPt(ch.T, poly[(r[1] + 1) % poly.length]), transPt(ch.T, poly[r[1]]), r[2], r[3]]; })()
        : (() => { const cp = out.children[r[0]], cq = out.children[r[2]]; return [transPt(cq.T, cq.geom.shape[r[3]]), transPt(cp.T, cp.geom.shape[r[1]]), r[4], r[5]]; })();
      const poly = shapes[s].shape;
      out.add(matchTwo(poly[e], poly[(e + 1) % poly.length], P, Q), shapes[s]);
    }
    return out;
  }
  // the four bigger metatiles of a patch
  function metatilesOf(patch) {
    const bps1 = patch.at(8, 2), bps2 = patch.at(21, 2), rbps = transPt(rotAbout(bps1, (-2 * Math.PI) / 3), bps2), p72 = patch.at(7, 2), p252 = patch.at(25, 2);
    const llc = intersect(bps1, rbps, patch.at(6, 2), p72);
    let w = psub(patch.at(6, 2), llc);
    const Hs = [llc, bps1];
    w = transPt(trot(-Math.PI / 3), w);
    Hs.push(padd(Hs[1], w), patch.at(14, 2));
    w = transPt(trot(-Math.PI / 3), w);
    Hs.push(psub(Hs[3], w), patch.at(6, 2));
    const take = (shape, list) => { const m = new Meta(shape); for (const k of list) m.add(patch.children[k].T, patch.children[k].geom); return m; };
    const H = take(Hs, [0, 9, 16, 27, 26, 6, 1, 8, 10, 15]);
    const P = take([p72, padd(p72, psub(bps1, llc)), bps1, llc], [7, 2, 3, 4, 28]);
    const F = take([bps2, patch.at(24, 2), patch.at(25, 0), p252, padd(p252, psub(llc, bps1))], [21, 20, 22, 23, 24, 25]);
    const B = padd(Hs[1], psub(Hs[4], Hs[5]));
    const T = take([B, transPt(rotAbout(B, -Math.PI / 3), Hs[2]), Hs[2]], [11]);
    for (const m of [H, P, F, T]) m.recentre();
    return { H, T, P, F };
  }
  // every hat of a metatile: its transform
  const hatsOf = (geom, T, out) => { if (geom.hat) out.push(T); else for (const ch of geom.children) hatsOf(ch.geom, mul(T, ch.T), out); return out; };
  const S = 0.54;  // world units a hatviz unit: a hat about as big as a square
  const cache = {};
  return (W) => cache[W] ??= (() => {
    let shapes = { H: H0, T: T0, P: P0, F: F0 }, all;
    for (;;) { all = hatsOf(patchOf(shapes), ident, []); if (all.length >= 6 * W * W) break; shapes = metatilesOf(patchOf(shapes)); }
    // each hat: its middle (its corners' mean, moved), its corners only when wanted
    const c0 = corners.reduce((s, q) => padd(s, q), pt(0, 0)), c = pt(c0.x / corners.length, c0.y / corners.length);
    const hats = all.map((T) => { const q = transPt(T, c); return { T, m: [q.x * S, -q.y * S], flip: T[0] * T[4] - T[1] * T[3] < 0 }; });
    const poly = (h) => (h.p ??= corners.map((q) => transPt(h.T, q)).map((q) => [q.x * S, -q.y * S]));
    return squarePatch(hats, W, poly);
  })();
})();
/* Penrose's rhombi (P3): a wheel of 10 Robinson triangles cut again and again (a thin one in 2, a thick one in 3, each
 * time φ smaller; about φ² as many), two of a colour sharing their base a rhombus (thick: 72°, thin: 36°): a tiling that
 * never repeats, with five-fold symmetry. As the hats' (see squarePatch); each rhombus about a square unit */
const PENROSE = (() => {
  const phi = (1 + Math.sqrt(5)) / 2, cache = {}, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  return (W) => cache[W] ??= (() => {
    let n = 0;
    while (10 * phi ** (2 * n) < 14 * W * W) n++;  // (about 6 W² rhombi, 2 triangles each)
    const R = 1.11 * phi ** n;  // the rhombi's sides 1.11: their mean area 1
    let tris = Array.from({ length: 10 }, (_, i) => {
      const B = [R * Math.cos(((2 * i - 1) * Math.PI) / 10), R * Math.sin(((2 * i - 1) * Math.PI) / 10)], C = [R * Math.cos(((2 * i + 1) * Math.PI) / 10), R * Math.sin(((2 * i + 1) * Math.PI) / 10)];
      return i % 2 ? [0, [0, 0], C, B] : [0, [0, 0], B, C];
    });
    for (let k = 0; k < n; k++) tris = tris.flatMap(([c, A, B, C]) => {
      if (c === 0) { const P = lerp(A, B, 1 / phi); return [[0, C, P, B], [1, P, C, A]]; }
      const Q = lerp(B, A, 1 / phi), S = lerp(B, C, 1 / phi);
      return [[1, S, C, A], [1, Q, S, B], [0, S, Q, A]];
    });
    const key = ([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`, half = new Map(), items = [];
    for (const [c, A, B, C] of tris) {
      const k = `${c}|${[key(B), key(C)].sort().join('|')}`, other = half.get(k);
      if (!other) { half.set(k, A); continue; }
      const p = [A, B, other, C];
      items.push({ p, m: [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2] });
    }
    return squarePatch(items, W, (h) => h.p);
  })();
})();
const APERIODIC = { hat: HAT, penrose: PENROSE };  // the grids that never repeat: a square patch, walls round it, never a torus
function planeCorners(kind, x, y) {  // a cell's corners, in world units
  if (kind === 'square') return [[x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x + 0.5, y + 0.5], [x - 0.5, y + 0.5]];
  if (kind === 'hex') {  // pointy-topped, the centres 1 apart
    const [cx, cy] = latticeAt(x, y);
    return [0, 1, 2, 3, 4, 5].map((k) => [cx + Math.cos(Math.PI / 6 + (k * Math.PI) / 3) / Math.sqrt(3), cy + Math.sin(Math.PI / 6 + (k * Math.PI) / 3) / Math.sqrt(3)]);
  }
  if (kind === 'kite') return kiteCorners(x, y).map(([a, b]) => latticeAt(a, b));
  if (TILINGS[kind]) return tilingAt(kind, x, y).map((p) => tilingWorld(kind, p));
  if (APERIODIC[kind]) return APERIODIC[kind](walk.plane.W).polys[y * walk.plane.W + x];
  const i = x >> 1;
  if (kind === 'cairo') return cairoCorners(i, y, x & 1).map(([u, v]) => [(u - CAIRO_0[0]) * CAIRO, (v - CAIRO_0[1]) * CAIRO]);  // the walks' pentagons
  return x & 1 ? [latticeAt(i + 1, y), latticeAt(i + 1, y + 1), latticeAt(i, y + 1)] : [latticeAt(i, y), latticeAt(i + 1, y), latticeAt(i, y + 1)];
}
// a point inside a polygon (its corners in turn)
function insidePolygon(pts, u, v) {
  let inside = false;
  for (let k = 0, m = pts.length - 1; k < pts.length; m = k++) {
    const [a, b] = pts[k], [c, d] = pts[m];
    if ((b > v) !== (d > v) && u < ((c - a) * (v - b)) / (d - b) + a) inside = !inside;
  }
  return inside;
}
// the cell at a world point, or null outside the grid
function planeCellAt(kind, W, wx, wy) {
  let x, y;
  if (TILINGS[kind]) {  // its lattice cell's polygons, and those of the cells round it
    const [a, b] = TILINGS[kind].basis, det = a[0] * b[1] - a[1] * b[0], u = (wx * b[1] - wy * b[0]) / det, v = (a[0] * wy - a[1] * wx) / det, m = TILINGS[kind].polys.length;
    for (let j = Math.floor(v) - 1; j <= Math.floor(v) + 1; j++) for (let i = Math.floor(u) - 1; i <= Math.floor(u) + 1; i++) {
      if (i >= 0 && j >= 0 && i < W && j < W) for (let k = 0; k < m; k++) if (insidePolygon(planeCorners(kind, i * m + k, j), wx, wy)) return [i * m + k, j];
    }
    return null;
  }
  if (APERIODIC[kind]) { const t = APERIODIC[kind](W).polys.findIndex((p) => insidePolygon(p, wx, wy)); return t < 0 ? null : [t % W, Math.floor(t / W)]; }
  if (kind === 'cairo') {  // the pentagon holding the point, among those of the squares around
    const i0 = Math.round(wx / CAIRO), j0 = Math.round(wy / CAIRO);
    for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 2; i <= i0 + 2; i++) for (const o of [0, 1]) {
      if (i >= 0 && j >= 0 && i < W && j < W && insidePolygon(planeCorners(kind, 2 * i + o, j), wx, wy)) return [2 * i + o, j];
    }
    return null;
  }
  if (kind === 'kite') {  // its triangle's, then the kite round the corner nearest
    const t = planeCellAt('tri', W, wx, wy);
    if (!t) return null;
    for (let k = 0; k < 3; k++) if (insidePolygon(planeCorners('kite', 3 * t[0] + k, t[1]), wx, wy)) return [3 * t[0] + k, t[1]];
    return [3 * t[0], t[1]];
  }
  if (kind === 'square') { x = Math.round(wx); y = Math.round(wy); }
  else {
    const b = wy / ROOT3_2, a = wx - b / 2;
    if (kind === 'hex') {  // the nearest centre, in cube coordinates
      let q = Math.round(a), r = Math.round(b), s = Math.round(-a - b);
      const dq = Math.abs(q - a), dr = Math.abs(r - b), ds = Math.abs(s + a + b);
      if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
      x = q; y = r;
    } else { const i = Math.floor(a), j = Math.floor(b); x = 2 * i + (a - i + b - j < 1 ? 0 : 1); y = j; }
  }
  return x >= 0 && y >= 0 && x < planeRow(kind, W) && y < W ? [x, y] : null;
}
// a number in [0, 1) for cell i of a seed's soup (a hash: the same cell, the same draw)
function cellRandom(seed, i) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
// the cells' states at generation 0, as plane says
function planeSeed(kind, seq, C, K = 1) {  // K: the civilisations, a live cell of a soup one of them
  const W = planeW(kind, plane.side), row = planeRow(kind, W), n = row * W, seed = new Uint8Array(n), last = W - 1;
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < row && y < W) seed[y * row + x] = c; };
  // the symmetry: a soup or the digits read at the first of a cell's copies (as dense as without); cells
  // drawn copied to all of them
  const first = symmetryOf(kind) === 'none' ? (t) => t : (t) => Math.min(...cellCopies(kind, W, t));
  if (plane.start === 'digits') for (let t = 0; t < n; t++) seed[t] = seq[first(t)] ?? 0;
  else if (plane.start === 'random') {
    const p = plane.density / 100;
    for (let t = 0; t < n; t++) if (cellRandom(plane.seed, first(t)) < p) seed[t] = K > 1 ? 1 + Math.floor(cellRandom(plane.seed + 1, first(t)) * K) : 1;
  } else {
    // cells drawn: a colour of another count of colours as one of these (one colour: alive), a dying state kept
    for (const [k, c] of population) put(...cellXY(k), c <= K * (C - 1) ? c : K > 1 ? ((c - 1) % K) + 1 : 1);  // a state of these colours and states, else alive
    if (symmetryOf(kind) !== 'none') {
      const own = seed.slice();
      for (let t = 0; t < n; t++) if (own[t]) for (const c of cellCopies(kind, W, t)) seed[c] = own[t];
    }
  }
  return seed;
}
// the cells sharing an edge or a corner with each one (wrapping around, or not past the edges), as the
// surfaces' lists; on hexagons, also the 6 around in turn (ring: Callahan's letters)
function planeNeighbours(kind, W, torus, hensel = false) {  // hensel: squares' 8 neighbours in order too
  const row = planeRow(kind, W), n = row * W, start = new Int32Array(n + 1), list = [];
  const ring = kind === 'hex' ? new Int32Array(6 * n).fill(-1) : hensel && kind === 'square' ? new Int32Array(8 * n).fill(-1) : null;
  const at = (x, y) => {  // a cell's index (triangles: by their rhombus), −1 past a dead edge
    if (torus) { const w = kind === 'tri' ? W : row; x = kind === 'tri' ? 2 * (((x >> 1) % w + w) % w) + (x & 1) : ((x % w) + w) % w; y = ((y % W) + W) % W; }
    return x < 0 || y < 0 || x >= row || y >= W ? -1 : y * row + x;
  };
  const HEX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  // Cairo pentagons: the cells at each corner, its corners in grid units (cairoCorners), wrapping round
  // the grid every W units
  const cornerKey = (u, v) => { const r = (a) => { const k = Math.round(a * 1000); return torus ? ((k % (W * 1000)) + W * 1000) % (W * 1000) : k; }; return r(u) * 8388608 + r(v); };
  const byCorner = new Map(), cornersOf = (x, y) => (TILINGS[kind] ? tilingAt(kind, x, y) : kind === 'kite' ? kiteCorners(x, y) : APERIODIC[kind] ? APERIODIC[kind](W).polys[y * W + x] : cairoCorners(x >> 1, y, x & 1));  // (kites: on the triangles' lattice)
  if (kind === 'cairo' || kind === 'kite' || APERIODIC[kind] || TILINGS[kind]) for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) for (const [u, v] of cornersOf(x, y)) {
    const k = cornerKey(u, v);
    (byCorner.get(k) ?? byCorner.set(k, []).get(k)).push(y * row + x);
  }
  for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) {
    const t = y * row + x, around = new Set();
    start[t] = list.length;
    if (kind === 'square') HENSEL_RING.forEach((bit, q) => { const u = at(x + (bit % 3) - 1, y + Math.floor(bit / 3) - 1); if (ring) ring[8 * t + q] = u; around.add(u); });
    else if (kind === 'hex') HEX.forEach(([dx, dy], q) => { const u = at(x + dx, y + dy); ring[6 * t + q] = u; around.add(u); });
    else if (kind === 'cairo' || kind === 'kite' || APERIODIC[kind] || TILINGS[kind]) for (const [u, v] of cornersOf(x, y)) for (const c of byCorner.get(cornerKey(u, v))) around.add(c);
    else {  // triangles: the 6 around each of its 3 corners (corner (a, b): ▲ of (a, b), (a−1, b), (a, b−1); ▼ of (a−1, b), (a−1, b−1), (a, b−1))
      const i = x >> 1, corners = x & 1 ? [[i + 1, y], [i + 1, y + 1], [i, y + 1]] : [[i, y], [i + 1, y], [i, y + 1]];
      for (const [a, b] of corners) {
        for (const [p, q] of [[a, b], [a - 1, b], [a, b - 1]]) around.add(at(2 * p, q));
        for (const [p, q] of [[a - 1, b], [a - 1, b - 1], [a, b - 1]]) around.add(at(2 * p + 1, q));
      }
    }
    around.delete(-1);
    around.delete(t);
    for (const u of around) list.push(u);
  }
  start[n] = list.length;
  return { start, list: Int32Array.from(list), ring };
}
function buildLifePlane(seq) {
  const kind = MODES[current.mode].plane, sides = PLANE_SIDES[kind];
  if (!sides.includes(plane.side)) {  // a link's size not offered: the nearest one, said at once
    plane.side = sides.reduce((a, b) => (Math.abs(b - plane.side) < Math.abs(a - plane.side) ? b : a));
    renderPlaneRow();
  }
  const W = planeW(kind, plane.side), row = planeRow(kind, W), n = row * W;
  fitColours();  // as many colours as the grid has fair blocks for
  let rule = lifeRuleNow() || parseRule('B3/S23');
  if (rule.iso && kind !== { hex: 'hex', hensel: 'square' }[rule.iso]) {  // Callahan's letters need hexagons, Hensel's squares
    rule = parseRule('B3/S23');
    $('lifePreset').value = rule.text;
  }
  $('lifeRule').value = ruleBody(rule.text);  // the colours apart (see lifeColours)
  const nbr = planeNeighbours(kind, W, planeTorus(kind), rule.iso === 'hensel');
  walk.life = { nbr, ring: rule.iso ? nbr.ring : null, B: rule.B, S: rule.S, C: rule.C, two: rule.two, colours: rule.colours, ruleText: ruleBody(rule.text),
                seed: planeSeed(kind, seq, rule.C, rule.colours), alive: new Uint8Array(n), next: new Uint8Array(n), age: new Uint16Array(n),
                died: new Int32Array(n), activity: new Uint32Array(n), ever: new Uint8Array(n) };
  countSeed(walk.life);
  lifeStart = null;
  const one = new Float64Array(1);
  Object.assign(walk, { vert: null, stepTiles: null, loop: null, n: Infinity, digits: seq, wx: one, wy: one, wz: null, is3d: false, cells: null,
                        maxDist: null, base: rule.base, counts: null, lattice: 'square', skipZeros: false, points: false,
                        keys: seq, sphere: false, geo: { n }, plane: { kind, W, row, torus: planeTorus(kind) }, tile: null,
                        coverStep: -1, visits: null, maxVisits: 0, xs: one, ys: one, shape: null });
  startColours(walk.life.seed);  // in colours, each in its part
  countSeed(walk.life);
  updateHint();
  restart();
  hunt.top = [];  // a new grid, rule or colours: the starts found were another game's
  hunt.status = '';
  stopHunt();
  renderColours();  // the blocks a figure fits, now that it is built
  autoplay();
}
// the grid's frame: the corners of its four corner cells
function planeBounds() {
  const { kind, W, row } = walk.plane, b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const ends = APERIODIC[kind] ? [...APERIODIC[kind](W).polys.keys()].map((t) => [t % W, Math.floor(t / W)]) : [[0, 0], [row - 1, 0], [0, W - 1], [row - 1, W - 1]];  // (hats: all of them)
  for (const [x, y] of ends) for (const [u, v] of planeCorners(kind, x, y)) {
    b.minX = Math.min(b.minX, u); b.maxX = Math.max(b.maxX, u); b.minY = Math.min(b.minY, v); b.maxY = Math.max(b.maxY, v);
  }
  return b;
}
// the same grid, another start (a density, a seed, a symmetry, a pattern, a cell drawn): no new digits
function planeReseed() {
  const L = walk.life;
  lifeStart = null;  // the plane's own start again, not the hunt's
  L.seed.set(planeSeed(walk.plane.kind, walk.digits, L.C, L.colours));
  startColours(L.seed);
  countSeed(L);
  describe(walk.base, Infinity);
  renderPlaneRow();
  restart();
  autoplay();
  syncLink();
}
const PLANE_CELLS = { square: 'squares', hex: 'hexagons', tri: 'triangles', cairo: 'Cairo pentagons', kite: 'kites', hat: 'hats', penrose: 'rhombi' };
for (const [kind, t] of Object.entries(TILINGS)) PLANE_CELLS[kind] = t.cells;
// the description's lead: how the cells start, on which grid
// a zone of the hunt, a random start in it, in words
function zoneWords(zone) {
  const K = walk.life.colours, r = zoneRadius(zone), d = plane.density;
  if (zone === 'patterns') return `${K === 1 ? 'A pattern of the rule' : 'Patterns of the rule, one for each colour at its spot'}, turned or mirrored at random`;
  if (zone === 'face') return K === 1 ? 'Random cells on a face' : 'Each colour random cells on its face';
  return K === 1 ? (r ? `Random cells within radius ${r} of a cell` : `A random soup, ${d} % alive`)
    : r ? `Each colour random cells within radius ${r} of its spot (${K} spots)` : `Each colour a soup of its part (${walk.plane ? COLOUR_PARTS[K] : `${K} parts`}), ${d} % alive`;
}
function planeLead(number) {
  const kind = walk.plane.kind, side = fmt(walk.plane.W), soup = `${plane.density} % alive (seed ${plane.seed})`;
  const sym = SYMMETRIES[symmetryOf(kind)][2];
  const found = { hunt: 'A start found by the hunt', saved: 'A saved start', battle: 'A battle found by the hunt' }[lifeStart];
  if (lifeStart?.zone) return `${zoneWords(lifeStart.zone)}${sym ? `, ${sym},` : ''} on a ${side} × ${side} grid of ${PLANE_CELLS[kind]}, the others dead`;
  if (lifeStart?.radius) return `${number} the ${fmt(lifeStart.cells)} cells within radius ${lifeStart.radius} of the middle of a ${side} × ${side} grid of ${PLANE_CELLS[kind]}, the others dead`;
  if (found) return `${found} on a ${side} × ${side} grid of ${PLANE_CELLS[kind]}`;
  const how = { random: `A random soup, ${soup}${walk.life.colours > 1 ? `, each colour in its part (${COLOUR_PARTS[walk.life.colours]})` : ''},`, draw: `${fmt(walk.life.seedAlive)} cells drawn`, digits: `${number} the cells` }[plane.start].replace(/,?$/, sym ? `, ${sym},` : '$&');
  return `${how} on a ${side} × ${side} grid of ${PLANE_CELLS[kind]}${{ tri: ' (two a rhombus)', cairo: ' (two a square)', kite: ' (six a rhombus)', hat: ' (an aperiodic tiling: one tile that never repeats)', penrose: ' (an aperiodic tiling)' }[kind] ?? ''} ${planeTorus(kind) ? 'wrapping around (a torus)' : 'with dead edges'}`;
}
function planeFromSetup(s) {
  plane.side = Number(s.s) || 48;  // fitted to the grid's sizes when built
  plane.torus = Number(s.e) !== 1;
  const [kind, a, b] = String(s.sd ?? 'random').split('.');
  plane.sym = SYMMETRIES[s.y] ? s.y : SYMMETRIES[kind] ? kind : 'none';  // y=, or an old link's "mirror.30.7"
  if (kind === 'random' || SYMMETRIES[kind]) {
    plane.start = 'random';
    plane.density = Math.min(70, Math.max(5, Number(a) || 30));  // (as the hunt draws them, see DENSITY)
    hunt.zone = 'full';
    plane.seed = Number(b) || 1;
  } else plane.start = kind === 'draw' || kind === 'digits' || kind === 'pattern' ? kind : 'random';
  population = plane.start === 'draw' ? populationOf(s.p) : population;
  if (plane.start === 'pattern') {  // an old link's pattern: drawn in the middle
    plane.start = 'draw';
    population = new Map(orientPattern('square', (DRAW_BY_ID.get(a) ?? DRAW_BY_ID.get('acorn'))[4], 0, false).map(([x, y]) => [key(x + (plane.side >> 1), y + (plane.side >> 1)), 1]));
  }
}
// the grid's size, its edges and its start, as the controls say (the patterns and the turns of a
// square on squares only)
let surfaceDraw = false;  // a surface's Draw tab open: its patterns shown, greyed (the start stays as it was)
function renderPlaneRow() {
  const kind = MODES[$('mode').value].plane;
  if (kind) surfaceDraw = false;
  for (const b of $('lifeStartTabs').children) {  // the starts, on any grid (Draw on a surface: its patterns, to see)
    b.classList.toggle('active', surfaceDraw ? b.dataset.start === 'draw' : b.dataset.start === plane.start);
    b.disabled = false;
  }
  for (const r of $('startDraw').querySelectorAll('.draw-row')) r.hidden = !kind;  // the turns, the colours: to draw, on the plane
  if (!kind) {
    $('symmetryRow').hidden = true;
    $('startDraw').hidden = !surfaceDraw;
    if (!surfaceDraw) return;
    // a surface: the rule's patterns on its grid, greyed (they cannot be drawn here: Famous lays them)
    const cells = { '■': 'square', '▲': 'tri', '⬡': 'hex', '⬠': 'cairo', '◆': 'kite', '🎩': 'hat', '✧': 'penrose', ...Object.fromEntries(Object.entries(TILINGS).map(([k, t]) => [t.mark, k])) }[lifeMark(MODES[$('mode').value])], rule = ruleBody(parseRule(ruleBody($('lifeRule').value))?.text ?? '');
    for (const b of $('brushCards').children) {
      const p = DRAW_BY_ID.get(b.dataset.brush);
      b.hidden = !(p[1] === cells && p[2].includes(rule));
      b.disabled = true;
      b.classList.remove('active');
    }
    $('drawNote').hidden = [...$('brushCards').children].some((b) => !b.hidden);
    return;
  }
  $('drawNote').hidden = true;
  for (const b of $('brushCards').children) b.disabled = false;
  const sides = PLANE_SIDES[kind];
  $('planeLabel').innerHTML = `${sizeShape(kind, plane.side)}<small>${sizeCells(kind, plane.side)}</small>`;  // the size (see gridSize)
  $('planeDown').disabled = plane.side <= sides[0];
  $('planeUp').disabled = plane.side >= sides.at(-1);
  $('edgeTorus').classList.toggle('active', planeTorus(kind));
  $('edgeWalls').classList.toggle('active', !planeTorus(kind));
  $('edgeTorus').disabled = !!APERIODIC[kind];
  const syms = PLANE_SYMMETRIES[kind];
  $('symmetryRow').hidden = syms.length < 2;
  $('symmetryTiles').replaceChildren(...syms.map((y) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${icon(SYMMETRIES[y][0])}<span>${SYMMETRIES[y][1]}</span>`;
    b.classList.toggle('active', y === symmetryOf(kind));
    b.addEventListener('click', () => { plane.sym = y; reseedStart(); });
    return b;
  }));
  $('startDraw').hidden = plane.start !== 'draw';
  // Draw: the brushes (the patterns on squares only), the colours and the eraser, the turns (greyed for a cell)
  const rule = ruleBody(parseRule(ruleBody($('lifeRule').value))?.text ?? ''), mine = ![...$('lifePreset').options].some((o) => o.dataset.name && o.value === rule);
  const fits = (p) => p[0] === 'cell' || (p[1] === kind && (mine || p[2].includes(rule)));  // the rule's patterns; your own rule: all the grid's
  if (!fits(DRAW_BY_ID.get(brush.id))) brush.id = 'cell';
  brush.turn %= PATTERN_TURNS[kind];
  const K = ruleColours();
  brush.colour = Math.min(brush.colour, K);
  for (const b of $('brushCards').children) {
    const p = DRAW_BY_ID.get(b.dataset.brush);
    b.classList.toggle('active', p[0] === brush.id);
    b.hidden = !fits(p);
    b.querySelector('.mode-detail').textContent = p[5] + (mine && p[2].length ? ` · ${p[2][0]}` : '');  // your own rule: which rule it is for
    if (p[0] === 'cell' && b.dataset.kind !== kind) {  // the cell: one of this grid's (a hat: its drawing), at the patterns' scale
      b.querySelector('.mode-icon').innerHTML = APERIODIC[kind] ? icon(kind) : cellsIcon(kind, 'A!');
      b.dataset.kind = kind;
    }
  }
  const eraser = document.createElement('i');
  eraser.className = 'eraser';
  eraser.title = 'eraser';
  eraser.innerHTML = icon('eraser');
  $('brushColours').replaceChildren(...(K > 1 ? LIFE_COLOURS.slice(0, K) : [LIFE_ALIVE]).map((c, k) => {
    const i = document.createElement('i');
    i.style.background = c;
    i.title = K > 1 ? LIFE_COLOUR_NAMES[k] : 'alive';
    return i;
  }), eraser);
  [...$('brushColours').children].forEach((i, k) => {  // the colours 1, 2…, then the eraser (0)
    const c = i === eraser ? 0 : k + 1;
    i.classList.toggle('active', brush.colour === c);
    i.addEventListener('click', () => { brush.colour = c; renderPlaneRow(); });
  });
  $('clearDrawn').textContent = cleared ? 'Undo' : 'Clear';
  $('clearDrawn').disabled = !cleared && !population.size;
  $('brushTurn').textContent = `↻ ${(brush.turn * 360) / PATTERN_TURNS[kind]}°`;
  $('brushTurn').disabled = $('brushFlip').disabled = brush.id === 'cell';
  $('brushFlip').classList.toggle('active', brush.flip);
}
// Behind the grid (grid layer, at each view): the sky or the page outside it, the page inside it, and,
// zoomed in enough, its cells' outlines; dead edges, its border
function drawPlaneGrid() {
  const ctx = layers.grid, { kind, W, row } = walk.plane, { scale: s, ox, oy } = view;
  ctx.clearRect(0, 0, cw, ch);
  drawSky(ctx);
  const X = (u) => ox + u * s, Y = (v) => oy + v * s, outline = $('showGrid').checked && s >= 6;
  const cell = (x, y) => {  // a cell's outline, added to the path
    const c = planeCorners(kind, x, y);
    ctx.moveTo(X(c[0][0]), Y(c[0][1]));
    for (let k = 1; k < c.length; k++) ctx.lineTo(X(c[k][0]), Y(c[k][1]));
    ctx.lineTo(X(c[0][0]), Y(c[0][1]));
  };
  // the page inside, to the cells' own outline: the square; the rhombus the triangles fill; the rhombus
  // through the outer hexagons' centres, and those hexagons
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fff';
  ctx.beginPath();
  if (kind === 'square') ctx.rect(X(-0.5), Y(-0.5), W * s, W * s);
  else if (kind === 'cairo' || kind === 'kite' || APERIODIC[kind] || TILINGS[kind]) {  // ragged all round: the cells in sight
    for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) {
      const [u, v] = planeCorners(kind, x, y)[0];
      if (X(u) > -2 * s && Y(v) > -2 * s && X(u) < cw + 2 * s && Y(v) < ch + 2 * s) cell(x, y);
    }
  } else {
    const e = kind === 'hex' ? W - 1 : W;
    [[0, 0], [e, 0], [e, e], [0, e]].forEach(([a, b], k) => { const [u, v] = latticeAt(a, b); ctx[k ? 'lineTo' : 'moveTo'](X(u), Y(v)); });
    if (kind === 'hex') { ctx.fill(); ctx.beginPath(); for (let k = 0; k < W; k++) { cell(k, 0); cell(k, W - 1); cell(0, k); cell(W - 1, k); } }  // apart: the windings do not cancel
  }
  ctx.fill();
  // dead edges: a wall round the grid, a cell thick, in the colour of the hexagon sphere's walls
  if (!walk.plane.torus) {
    ctx.fillStyle = LIFE_WALL;
    ctx.beginPath();
    if (kind === 'square') { ctx.rect(X(-1.5), Y(-1.5), (W + 2) * s, (W + 2) * s); ctx.rect(X(W - 0.5), Y(-0.5), -W * s, W * s); }
    else if (APERIODIC[kind]) for (const p of APERIODIC[kind](W).walls) { ctx.moveTo(X(p[0][0]), Y(p[0][1])); for (const [u, v] of p) ctx.lineTo(X(u), Y(v)); ctx.closePath(); }  // the hats round them
    else {
      const out = TILINGS[kind] ? [...Array(TILINGS[kind].polys.length).keys()].flatMap((k) => [-1 - k, row + k]).sort((p, q) => p - q) : kind === 'hex' ? [-1, row] : kind === 'kite' ? [-6, -5, -4, -3, -2, -1, row, row + 1, row + 2, row + 3, row + 4, row + 5] : [-2, -1, row, row + 1];
      for (let x = out[0]; x <= out.at(-1); x++) { cell(x, -1); cell(x, W); }
      for (let y = 0; y < W; y++) for (const x of out) cell(x, y);
    }
    ctx.fill('evenodd');
  }
  if (!outline) return;
  ctx.strokeStyle = `rgba(${EDGE_RGB.join(', ')}, ${EDGE_ALPHA})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (kind === 'square') for (let k = 0; k <= W; k++) { ctx.moveTo(X(k - 0.5), Y(-0.5)); ctx.lineTo(X(k - 0.5), Y(W - 0.5)); ctx.moveTo(X(-0.5), Y(k - 0.5)); ctx.lineTo(X(W - 0.5), Y(k - 0.5)); }
  else for (let y = 0; y < W; y++) for (let x = 0; x < row; x++) {  // the cells in sight
    const c = planeCorners(kind, x, y), px = X(c[0][0]), py = Y(c[0][1]);
    if (px < -s || py < -s || px > cw + s || py > ch + s) continue;
    ctx.moveTo(px, py);
    for (let k = 1; k < c.length; k++) ctx.lineTo(X(c[k][0]), Y(c[k][1]));
    ctx.lineTo(px, py);
  }
  ctx.stroke();
}
// the grid's cells in the Life colours (Display), each generation: squares as one picture, a pixel a
// cell; hexagons and triangles as polygons, one path a colour
let planeCanvas = null, planeImage = null, planeColours = null;
// A grid's turns: a pattern turns by a quarter on squares and Cairo pentagons, a sixth on hexagons and triangles
const PATTERN_TURNS = { square: 4, hex: 6, tri: 6, cairo: 4, kite: 6, hat: 1, penrose: 1 };
for (const kind of Object.keys(TILINGS)) PATTERN_TURNS[kind] = 1;  // (their patterns as found: neither turned nor mirrored)
const PER_RHOMBUS = { tri: 2, cairo: 2, kite: 6 };
for (const [kind, t] of Object.entries(TILINGS)) PER_RHOMBUS[kind] = t.polys.length;  // a row's cells per step along it (a square of Cairo pentagons): patterns move by whole ones
const cellMiddle = (kind, x, y) => { const p = planeCorners(kind, x, y); return [0, 1].map((a) => p.reduce((sum, q) => sum + q[a], 0) / p.length); };
// A pattern turned and mirrored, as cells [dx, dy, state] from its first square (Cairo: an even one): the
// middles of its cells mirrored across an upright line the grid is mirrored across, turned about a point
// the grid turns about (the middle of a square or a hexagon, a corner of triangles or of 4 pentagons),
// then the cells found there, on a grid big enough
function orientPattern(kind, rle, turn, flip) {
  const V = 256, T = 128, per = PER_RHOMBUS[kind] ?? 1, grid = (i, j) => [(i - CAIRO_0[0]) * CAIRO, (j - CAIRO_0[1]) * CAIRO];
  const pivot = kind === 'square' ? [T, T] : kind === 'cairo' ? grid(T, T) : latticeAt(T, T);
  const axis = kind === 'cairo' ? grid(T + 0.5, T)[0] : pivot[0];
  const a = (2 * Math.PI * turn) / PATTERN_TURNS[kind], cos = Math.cos(a), sin = Math.sin(a), cells = [];
  for (const [k, v] of populationOf(`0,0:${rle}`)) {
    const [x, y] = cellXY(k);
    let [u, w] = cellMiddle(kind, x + per * T, y + T);
    if (flip && !TILINGS[kind]) u = 2 * axis - u;  // (the new tilings: not mirrored, see PATTERN_TURNS)
    u -= pivot[0];
    w -= pivot[1];
    const c = planeCellAt(kind, V, pivot[0] + u * cos - w * sin, pivot[1] + u * sin + w * cos);
    if (c) cells.push([...c, v]);
  }
  const square = (x) => Math.floor(x / per), i0 = Math.min(...cells.map((c) => square(c[0])));
  let j0 = Math.min(...cells.map((c) => c[1]));
  if (kind === 'cairo' && (i0 + j0) & 1) j0--;  // the tiling repeats every other square
  return cells.map(([x, y, v]) => [x - per * i0, y - j0, v]);
}
let brushMemo = null;
function brushCells() {
  const kind = walk.plane.kind, k = `${kind}|${brush.id}|${brush.turn}|${brush.flip}`;
  if (brushMemo?.k !== k) brushMemo = { k, cells: brush.id === 'cell' ? [[0, 0, 1]] : orientPattern(kind, DRAW_BY_ID.get(brush.id)[4], brush.turn, brush.flip) };
  return brushMemo.cells;
}
// where the brush's cells go, round the cell pointed at (Cairo: from an even square): wrapping round the
// grid, or the ones inside it; [x, y, state]
function brushAt([cx, cy], cells = brush.id === 'cell' ? [[0, 0, 1]] : brushCells()) {
  const { kind, W, torus } = walk.plane, row = planeRow(kind, W), per = PER_RHOMBUS[kind] ?? 1, out = [];
  const square = (x) => Math.floor(x / per);
  let i = square(cx) - ((Math.max(...cells.map((c) => square(c[0]))) + 1) >> 1), j = cy - ((Math.max(...cells.map((c) => c[1])) + 1) >> 1);
  if (kind === 'cairo' && (i + j) & 1) j--;
  for (const [dx, dy, v] of cells) {
    let x = per * i + dx, y = j + dy;
    if (torus) { x = ((x % row) + row) % row; y = ((y % W) + W) % W; }
    if (x >= 0 && y >= 0 && x < row && y < W) out.push([x, y, v]);
  }
  return out;
}
// the brush under the pointer, half seen
function drawGhost() {
  const ctx = layers.overlay, { scale: s, ox, oy } = view;
  ctx.clearRect(0, 0, cw, ch);
  if (!drawing || !ghost || !walk.plane) return;
  ctx.globalAlpha = brush.colour ? 0.55 : 0.85;  // the eraser: the dead cells' colour
  ctx.fillStyle = !brush.colour ? UNLIT : walk.life.colours > 1 ? LIFE_COLOURS[brush.colour - 1] : LIFE_ALIVE;
  ctx.beginPath();
  for (const [x, y] of brushAt(ghost)) {
    const pts = planeCorners(walk.plane.kind, x, y);
    pts.forEach(([u, v], k) => ctx[k ? 'lineTo' : 'moveTo'](ox + u * s, oy + v * s));
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}
// a pattern's picture: its own cells, fitted in the icon (dying ones fainter)
function cellsIcon(kind, rle) {
  const polys = orientPattern(kind, rle, 0, false).map(([x, y, v]) => [planeCorners(kind, x, y), v]), all = polys.flatMap((p) => p[0]);
  const x0 = Math.min(...all.map((p) => p[0])), y0 = Math.min(...all.map((p) => p[1])), w = Math.max(...all.map((p) => p[0])) - x0, h = Math.max(...all.map((p) => p[1])) - y0;
  const size = Math.max(w, h, 3);  // (at least 3 cells: a small one as big as in the others), the cells in its middle
  return `<svg class="icon rule-icon" viewBox="${x0 - (size - w) / 2 - 0.2} ${y0 - (size - h) / 2 - 0.2} ${size + 0.4} ${size + 0.4}" aria-hidden="true">${polys
    .map(([pts, v]) => `<polygon points="${pts.map((p) => p.map((c) => c.toFixed(2)).join(',')).join(' ')}"${v > 1 ? ' class="dim"' : ''}/>`).join('')}</svg>`;
}
function drawLifePlane() {
  const L = walk.life, { kind, W, row } = walk.plane, ctx = layers.path, { scale: s, ox, oy } = view, n = row * W;
  for (const c of [layers.path, layers.line, layers.fill, layers.overlay]) c.clearRect(0, 0, cw, ch);  // no walker
  if (kind === 'square') {
    if (!planeCanvas || planeCanvas.width !== W) {
      planeCanvas = document.createElement('canvas');
      planeCanvas.width = planeCanvas.height = W;
      planeImage = planeCanvas.getContext('2d').createImageData(W, W);
    }
    planeColours = new Uint32Array(planeImage.data.buffer);
  } else if (!planeColours || planeColours.length !== n || planeColours.buffer === planeImage?.data.buffer) planeColours = new Uint32Array(n);
  const px = planeColours, pack = (c) => { const [r, g, b] = rgbOf(c); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
  const colour = $('colorMode').value, trail = LIFE_TRAIL.map(pack), inked = LIFE_FADE.map(pack), alive = pack(LIFE_ALIVE), civ = [0, ...civColours(L.colours, L.C).map(pack)];
  const grad = Array.from({ length: 32 }, (_, i) => pack(GRADIENT[Math.round((i / 31) * (BANDS - 1))]));
  // the colours on a log scale, in tables (millions of cells): of an age (up to 64), of an activity
  const level = (v, max) => Math.min(31, Math.round((Math.log(v) / Math.log(Math.max(2, max))) * 31));
  const byAge = Uint32Array.from({ length: 65 }, (_, a) => grad[31 - level(a + 1, 65)]);  // the rainbow backwards: warm newborns, cold old cells
  const byActivity = colour === 'digit' ? Uint32Array.from({ length: Math.min(L.maxActivity, 65535) + 1 }, (_, v) => (v ? grad[level(v + 1, L.maxActivity + 1)] : 0)) : null;
  const byDying = Uint32Array.from({ length: L.C }, (_, st) => (st < 2 ? 0 : trail[Math.min(trail.length - 1, Math.round(((st - 1) / (L.C - 1)) * trail.length))]));
  const { alive: a, age, activity, died } = L, fade = L.C === 2 && trailOn() ? trail.length : 0;  // the trail after death (Trail)
  for (let t = 0; t < n; t++) {
    const st = a[t];
    px[t] = L.colours > 1 && colour === 'mono' ? civ[st] || (L.gen - died[t] < fade ? inked[L.gen - died[t]] : 0)
      : colour === 'digit' ? byActivity[Math.min(activity[t], 65535)]
      : colour === 'mono' ? (st === 1 ? alive : st ? byDying[st] : L.gen - died[t] < fade ? inked[L.gen - died[t]] : 0)
      : st && st <= L.colours ? byAge[Math.min(age[t], 64)] : st ? byDying[1 + Math.floor((st - 1) / L.colours)]  // (in colours too: k + K × stage)
      : L.gen - died[t] < fade ? inked[L.gen - died[t]] : 0;  // age of live cells, a trail fading after death (in Ink)
  }
  if (kind === 'square') {
    planeCanvas.getContext('2d').putImageData(planeImage, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(planeCanvas, ox - 0.5 * s, oy - 0.5 * s, W * s, W * s);
    drawGhost();
    return;
  }
  const groups = new Map();
  for (let t = 0; t < n; t++) if (px[t]) (groups.get(px[t]) ?? groups.set(px[t], []).get(px[t])).push(t);
  const small = s < 3;  // a few pixels a cell: a square at its centre does as well, and faster
  for (const [c, ts] of groups) {
    ctx.beginPath();
    for (const t of ts) {
      const x = t % row, pts = planeCorners(kind, x, (t - x) / row);
      if (small) {
        let u = 0, v = 0;
        for (const [a, b] of pts) { u += a; v += b; }
        ctx.rect(ox + (u / pts.length) * s - s / 2, oy + (v / pts.length) * s - s / 2, s, s);
        continue;
      }
      ctx.moveTo(ox + pts[0][0] * s, oy + pts[0][1] * s);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(ox + pts[k][0] * s, oy + pts[k][1] * s);
      ctx.lineTo(ox + pts[0][0] * s, oy + pts[0][1] * s);
    }
    ctx.fillStyle = `rgb(${c & 255}, ${(c >> 8) & 255}, ${(c >> 16) & 255})`;
    ctx.fill();
  }
  drawGhost();
}
// the shape a Life mode's cells have, as the rule menu marks the rules that suit it (■ ▲ ⬡); on
// coming to another mode, a rule marked for another shape gives way to the first one for this shape
// the cells of each surface (else triangles): one table for every surface, whatever its shape
const SURFACE_CELLS = { cube: '■', pits: '■', torus: '■', mobius: '■', klein: '■', hextorus: '⬡', hexsphere: '⬡', mobiusHex: '⬡', kleinHex: '⬡',
                        cairotorus: '⬠', mobiusCairo: '⬠', kleinCairo: '⬠', kitetorus: '◆', mobiusKite: '◆', kleinKite: '◆', tetraKite: '◆', octaKite: '◆', icosaKite: '◆' };
const lifeMark = (mode) => (mode.plane ? (TILINGS[mode.plane]?.mark ?? { square: '■', tri: '▲', hex: '⬡', cairo: '⬠', kite: '◆', hat: '🎩', penrose: '✧' }[mode.plane]) : SURFACE_CELLS[mode.sphere] ?? '▲');
// Life's colours, apart from its rule (which they do not change): 1, alive or dead (and a Generations
// rule's dying stages), or 2 to 6 civilisations (k= in a link). The engine reads them as the rule's tail
// ("/Immigration", "/Colours4"), which old links may still carry
let lifeColours = 1;
const ruleColours = () => lifeColours;
const ruleBody = (rule) => rule.replace(/\/(Immigration|Colours\d+)$/i, '');  // births, survivals (and dying stages), no colours
const lifeRuleNow = () => {
  const body = ruleBody($('lifeRule').value);
  return parseRule(lifeColours === 1 ? body : `${body}${lifeColours === 2 ? '/Immigration' : `/Colours${lifeColours}`}`);
};
function setRuleText(rule) {  // the rule field, and its preset if it is one
  $('lifeRule').value = rule;
  const preset = [...$('lifePreset').options].find((o) => o.value === rule);
  $('lifePreset').value = preset ? rule : 'custom';
}
// The colours, as blocks: one (black), or 2, 3, 4, 6, 8, 12 civilisations, each block its colours in
// a cols × rows grid; a block greyed when the figure has no fair spots for that many (see coloursFit)
const COLOUR_STEPS = [1, 2, 3, 4, 6, 8, 12];
const COLOUR_GRID = { 1: [1, 1], 2: [2, 1], 3: [3, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 12: [4, 3] };
// a torus's colour blocks: a round the ring, b round the tube, as square as can be on the torus as seen (its
// ring 1 / TORUS_TUBE times as long as its tube): 12 colours 6 × 2 rather than 4 × 3; on a square sheet (Square:
// the plane's grid, glued), as on the plane (see COLOUR_GRID)
function torusBlocks(K, g = walk.geo) {
  if (g?.square) { const [cols, rows] = COLOUR_GRID[K]; return [rows, cols]; }
  let best = [K, 1], err = Infinity;
  for (let b = 1; b <= K; b++) if (K % b === 0) { const e = Math.abs(Math.log(b / ((K / b) * TORUS_TUBE))); if (e < err) { err = e; best = [K / b, b]; } }
  return best;
}
// Fair spots for k colours, that the figure's symmetries swap: a solid's faces, corners or edges'
// middles (the cube: 2 opposite faces, 3 round a corner, 4 round its belt, 6 faces, 8 corners, 12
// edges…); on a torus, a lattice of k blocks (a × b, each dividing its side); a grid with dead edges,
// its halves or quarters
const SOLID_COLOURS = { tetra: [2, 4, 6], cube: [2, 3, 4, 6, 8, 12], pits: [2, 3, 4, 6], octa: [2, 3, 4, 6, 8, 12], stella: [2, 4, 6, 8], dodeca: [2, 3, 4, 12],
                        icosa: [2, 3, 4, 8, 12], hexsphere: [2, 3, 4, 8, 12] };
for (const k of ['tetra', 'octa', 'icosa']) SOLID_COLOURS[`${k}Kite`] = SOLID_COLOURS[k];  // kites: the triangles' solids
function coloursFit(k, g = walk.geo) {  // g: the surface (a torus's sizes)
  const mode = MODES[$('mode').value];
  if (k === 1) return true;
  if (mode.plane) {
    return true;  // its blocks (rounded down when they do not divide it, as on a torus); with dead edges, its halves, quarters, or slices round the middle (see planeSlices)
  }
  if (SOLID_COLOURS[mode.sphere]) return SOLID_COLOURS[mode.sphere].includes(k);
  if (g?.mobius) return true;  // a Möbius strip: in turn along it (see huntParts)
  if (g?.nu) { const [u, v] = torusBlocks(k, g); return u <= g.nu && v <= g.nv; }  // a torus: its blocks (see torusBlocks)
  return false;
}
// a new figure that cannot place as many colours: the most it can, fewer
function fitColours(g) {
  if (!coloursFit(lifeColours, g)) lifeColours = COLOUR_STEPS.findLast((k) => k < lifeColours && coloursFit(k, g));
}
const colourBlock = (k) => {
  const [cols, rows] = COLOUR_GRID[k], cs = k === 1 ? [LIFE_ALIVE] : LIFE_COLOURS.slice(0, k);
  return `<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" aria-hidden="true">${cs.map((c, i) => `<rect x="${i % cols}" y="${Math.floor(i / cols)}" width="1" height="1" fill="${c}"/>`).join('')}</svg>`;
};
function renderColours() {
  $('colourBlocks').replaceChildren(...COLOUR_STEPS.map((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${colourBlock(k)}<span>${k === 1 ? 'One' : k}</span>`;
    b.title = k === 1 ? 'One colour: alive or dead' : `${k} colours: ${LIFE_COLOUR_NAMES.slice(0, k).join(', ')}`;
    b.classList.toggle('active', k === lifeColours);
    b.disabled = !coloursFit(k);
    b.addEventListener('click', () => { lifeColours = k; compute(); });
    return b;
  }));
}
// The Rule section: the rules known for the grid's shape, as cards, each with a picture (5 × 5 pixels of
// what it is known for: "o" alive, "+" dying); then your own, as chips (how many live neighbours give
// birth, let survive) and the states, and the rule as text
const NEIGHBOURS = { '■': 8, '⬡': 6, '▲': 12, '⬠': 7, '◆': 9, '🎩': 7, '✧': 11 };  // (hats: 6 or 7, a few 4 or 5; Penrose's rhombi: 7 to 11, a few fewer)
for (const t of Object.values(TILINGS)) NEIGHBOURS[t.mark] = t.most;
const RULE_ICONS = {
  'B3/S23': '.....,..o..,...o.,.ooo.', 'B36/S23': '..ooo,.o..o,o...o,o..o.,ooo..', 'B3678/S34678': 'ooooo,oo.oo,o...o,oo.oo,ooooo',
  'B3/S12345': 'o.ooo,o.o..,o.o.o,o...o,ooooo', 'B3/S1234': 'o.o.o,o.o.o,o.o.o,o...o,ooooo', 'B2/S/C3': '.o+..,.o+..,..+o.,..+o.',
  'B2/S345/C4': '..o..,.ooo.,o+o+o,..o..,.+.+.', 'B2/S': 'o...o,..o..,o...o,.....,.o.o.', 'B45/S345/C4': 'o....,...o.,.....,.o...,....o',
  'B34/S2/C4': '.....,..o..,.o+o.,..+..', 'B34/S123/C3': '.ooo.,o...o,o...o,o...o,.ooo.', 'B24/S134/C4': '.....,..o..,.o+o.,..+..',
  'B24/S35': '.....,..o..,.o.o.,..o..', 'B234/S234': '.....,..oo.,.oo..,..o..', 'B234/S1234': '.....,..oo.,.oo..,..o..,+...+',
  'B3/S235/C3': '..o..,.o+o.,o+.+o,.o+o.,..o..', 'B3/S1247': 'o...o,.o.o.,..o..,.o.o.,o...o',
  'B3/S2-i34q': '.....,.ooo.,..o..,.....,.....', 'B2i34c/S2-i3': 'o.o..,.o...,o.o.o,...o.,..o.o', 'B2-a/S12': 'ooooo,....o,ooo.o,o...o,o.ooo',
  'B346/S0127/C4': 'o.+.o,.o.o.,+.o.+,.o.o.,o.+.o', 'B34/S0126/C5': 'ooooo,o+++o,o+.+o,o+++o,ooooo',
  'B257/S367': '.oo..,ooo.o,..ooo,.o.o.,.....', 'B245/S134/C5': '.....,.oo+.,ooo+.,..o+.,.....',
  // the new tilings' rules: a picture each from its text (mirrored; not drawn by hand)
  'B3/S023': 'o.o.o,.....,.ooo.,o...o,o...o', 'B39/S0239': 'o...o,o...o,ooooo,.o.o.,.....',
  'B26/S3578/C3': 'oo.oo,.o.o.,+.o.+,o+o+o,o...o',
  'B24/S456/C4': '..o..,.....,.+o+.,.o.o.,o...o',
  'B367/S015': 'oo.oo,.ooo.,o...o,.o.o.,o.o.o',
  'B358/S0237/C4': 'oo.oo,o+o+o,+o.o+,.....,+o.o+',
  'B279/S069/C4': '+.+.+,.+o+.,+...+,.o.o.,oo+oo',
  'B29/S067/C4': '.ooo.,..+..,.....,..o..,.o.o.',
  'B38/S1369': '.....,..o..,o.o.o,.o.o.,o...o',
  'B359/S0146/C3': '+ooo+,o+.+o,..o..,+.o.+,o+o+o',
  'B345/S0236': 'o...o,.o.o.,.....,o...o,..o..',
  'B28/S28': '..o..,o...o,o.o.o,.....,oo.oo',
  'B267/S3457': '..o..,o...o,o.o.o,..o..,oo.oo',
  'B25/S157/C5': '.+++.,o.+.o,+o+o+,o.+.o,.....',
  'B245/S16/C5': '.....,+o.o+,+.+.+,.....,oo.oo',
  'B37/S1': 'oo.oo,oo.oo,.o.o.,o...o,..o..',
  'B3/S278': 'oo.oo,.....,ooooo,.o.o.,.o.o.',
  'B356/S6789/C5': '.o.o.,+...+,.+.+.,oo.oo,..o..',
  'B38/S169/C3': 'ooooo,.....,o.o.o,..o..,..+..',
  'B36/S1258': '.....,..o..,.o.o.,.....,.....', 'B35/S123/C5': 'o+..o,....+,.o+..,...o+,+o...', 'B35/S2356/C4': '.....,...o+,..o+.,.o+..,.....',
  'B2op3m/S12mp3p4p5': 'o.o..,.o..o,o...o,..o.o,.o...', 'B2345/S134/C5': '.....,..o+.,.oo+.,..o+.,.....', 'B2om5/S2om4o': '.....,.oo..,o..o.,.oo.o,...o.',
  'B2o/S2m34': '.....,..oo.,.o...,..o..', 'B2/S24/C3': 'o....,.o...,..+..,...+.,....+', 'B1/S0123456': 'o.o.o,.ooo.,ooooo,.ooo.,o.o.o',
  'B34/S23': '..o..,.ooo.,ooooo,.ooo.,.o.o.', 'B2/S34': '.....,.o.o.,..o..,.o.o.,.....',
  'B24/S346/C4': '+o...,.+o..,..+o.,.....,...+o', 'B23/S6/C3': '.....,.o+..,o+o+.,.+o..,.....', 'B2347/S35/C3': 'o.o.o,.+.+.,o.o.o,.+.+.,o.o.o',
};
const pixelIcon = (art) => `<svg class="icon rule-icon" viewBox="0 0 5 5" aria-hidden="true">${art.split(',').flatMap((row, y) => [...row]
  .map((c, x) => (c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1"${c === '+' ? ' class="dim"' : ''}/>`))).join('')}</svg>`;
let henselShown = false;  // squares: Hensel's letters beside the counts, from a rule written with them until a rule card without
function renderRuleSection() {
  const mode = MODES[$('mode').value];
  if (!mode.life) return;
  const mark = lifeMark(mode), now = ruleBody($('lifeRule').value);
  const known = [...$('lifePreset').options].filter((o) => o.dataset.name && o.text.includes(mark)), mine = known.find((o) => o.value === now);
  $('ruleCards').replaceChildren(...known.map((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.classList.toggle('active', o.value === now);
    b.innerHTML = `<span class="mode-icon">${pixelIcon(RULE_ICONS[o.value])}</span><span><span class="mode-name">${o.dataset.name}</span>`
      + `<span class="mode-detail">${o.value} · ${(o.text.split(' — ')[1] ?? '').replace(o.dataset.name, '').replace(/^[,:]?\s*/, '')}</span></span>`;  // its words, without its name
    b.addEventListener('click', () => { henselShown = parseRule(o.value)?.iso === 'hensel'; setRuleText(o.value); compute(); });
    return b;
  }));
  // your own: the chips of the rule in use, a count a row; beside 2, 3 and 4 on hexagons, Callahan's letters (where
  // they sit: o side by side, m one cell apart, p opposite); on squares, with a rule written with them, Hensel's
  // (1 to 7, see henselClass); a count partly on when only some of its letters are
  const rule = parseRule(now) ?? parseRule('B3/S23'), N = NEIGHBOURS[mark], hex = mark === '⬡';
  if (rule.iso === 'hensel') henselShown = true;
  const hensel = mark === '■' && henselShown;  // (kept while its letters are clicked, even all on or all off)
  const lettersOf = (c) => (hex ? (c >= 2 && c <= 4 ? ['o', 'm', 'p'] : []) : hensel ? HENSEL_LETTERS[c] : []);
  const all = (c) => (lettersOf(c).length ? lettersOf(c) : ['']);  // a count without letters: one, ''
  const classOf = (m) => (hex ? hexClass(m).toLowerCase() : henselClass(m)), R = hex ? 6 : 8, ofCount = (m) => m.toString(2).replace(/0/g, '').length;
  const letters = (table) => Array.from({ length: N + 1 }, (_, c) => new Set(all(c).filter((x) => (rule.iso
    ? Array.from({ length: 1 << R }, (_, m) => m).some((m) => table[16 + m] && ofCount(m) === c && (x === '' || classOf(m) === x))
    : table[c] === 1))));
  const write = (B, S, C) => {
    const part = (set) => set.map((on, c) => {
      const ls = all(c), off = ls.filter((x) => !on.has(x));
      if (!on.size) return '';
      if (!off.length) return c;
      return hensel && off.length < on.size ? `${c}-${off.join('')}` : c + ls.filter((x) => on.has(x)).join('');  // Hensel's "-": all but these
    }).join('');
    return `B${part(B)}/S${part(S)}${C > 2 ? `/C${C}` : ''}`;
  };
  const B = letters(rule.B), S = letters(rule.S);
  const WHERE = { o: 'side by side', m: 'one cell apart', p: 'opposite' };
  const said = (c, x) => (hensel ? `${c} live neighbours, Hensel's ${x}`
    : `${c} live neighbours, ${c === 3 ? { o: 'in a row', m: 'two side by side, one apart', p: 'every other one' }[x] : `${c === 4 ? 'the 2 dead ones ' : ''}${WHERE[x]}`}`);
  for (const [id, set, cls] of [['ruleBirth', B, 'birth'], ['ruleSurvive', S, 'survive']]) {
    const chip = (text, on, title, click) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.className = on;
      b.title = title;
      b.addEventListener('click', () => { click(); setRuleText(write(B, S, rule.C)); compute(); });
      return b;
    };
    const box = (className, items) => { const d = document.createElement('div'); d.className = className; d.append(...items); return d; };
    $(id).replaceChildren(...set.map((on, c) => box('r', [
      chip(c, on.size === all(c).length ? cls : on.size ? `${cls} partly` : '', `${c} live neighbour${c === 1 ? '' : 's'}`, () => { set[c] = new Set(on.size ? [] : all(c)); }),
      ...(lettersOf(c).length ? [box('lt', lettersOf(c).map((x) => chip(x, on.has(x) ? cls : '', said(c, x), () => { on.has(x) ? on.delete(x) : on.add(x); })))] : []),
    ])));
  }
  // the states as cells, from the top: alive, its dying stages fading, dead on the panel's white (✝ on each but the
  // live one; white on the cells nearer the live colour on a light page, the dead one on a dark page); past the room
  // (a rule typed), in words. A click on the frame: one more state, back to 2 when one more would not fit
  const cells = [LIFE_ALIVE, ...Array.from({ length: rule.C - 2 }, (_, s) => faded(LIFE_ALIVE, 1 - (s + 1) / (rule.C - 1))), 'var(--panel)'];
  const room = $('statesLabel').clientHeight || 160, fit = Math.min(10, Math.floor((room + 2) / 24)), words = `${rule.C} states${rule.C > 2 ? ` · ${rule.C - 2} dying` : ''}`;
  const cross = (i) => `<b style="color:${((1 - i / (rule.C - 1) > 0.45) === (document.documentElement.dataset.theme === 'light')) ? '#fff' : '#1f2328'}">✝</b>`;
  $('statesLabel').innerHTML = rule.C > fit ? `${rule.C}<small>states</small>${rule.C > 2 ? `${rule.C - 2}<small>dying</small>` : ''}`
    : `<span class="states-cells">${cells.map((c, i) => `<i style="background:${c}">${i ? cross(i) : ''}</i>`).join('')}</span>`;
  $('statesBox').title = `${words}: alive${rule.C > 2 ? `, then ${rule.C - 2} dying stage${rule.C > 3 ? 's' : ''} (it will die)` : ''}, dead · a click: ${rule.C + 1 > fit ? 'back to 2' : 'one more'}`;
  $('statesBox').onclick = () => { setRuleText(write(B, S, rule.C + 1 > fit ? 2 : rule.C + 1)); compute(); };
  $('statesBox').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('statesBox').onclick(); } };
  // in a battle, a newborn takes the colour most of its live neighbours have; on a tie, the one colour
  // missing if just one is, else none: the ties this rule's births can meet with these colours, of each kind
  // (a birth's count split among the K colours, the two most equal), all of them, a line each
  const K = lifeColours, counts = Array.from({ length: N + 1 }, (_, c) => c).filter((c) => B[c].size);
  const splits = (c, k, top) => (k === 0 ? (c ? [] : [[]]) : Array.from({ length: Math.min(c, top) + 1 }, (_, x) => x).flatMap((x) => splits(c - x, k - 1, x).map((r) => [x, ...r])));
  const ties = counts.flatMap((c) => splits(c, K, c).filter((p) => p[0] > 0 && p[0] === p[1]));
  const say = (p) => p.filter((x) => x).join(' + '), gone = (p) => p.filter((x) => !x).length;
  $('determinedRow').hidden = K === 1;
  $('determinedRow').innerHTML = `<div class="field-label">Births by majority colour</div><div class="births">${colourBlock(K)}<span>${!ties.length ? '<small>never a tie</small>'
    : [...ties.filter((p) => gone(p) !== 1), ...ties.filter((p) => gone(p) === 1)]  // a tie a line, what it gives first: no birth, then the colour missing
      .map((p) => `<small>${gone(p) === 1 ? 'the colour missing' : 'no birth'}: ${say(p)}</small>`).join('')}</span></div>`;
  $('determinedRow').title = 'A dead cell is born only if one colour has more live neighbours than any other; on a tie, it takes the one colour missing around it if just one is, else it stays dead';
  $('ruleName').textContent = mine ? mine.dataset.name : 'Custom rule';

}
let ruleFittedTo = null;
function fitRuleToShape() {
  const w = $('mode').value, mode = MODES[w];
  if (!mode.life || ruleFittedTo === w) return;
  ruleFittedTo = w;
  // a rule known, even without its dying states (none with colours: B34/S123 is B34/S123/C3)
  const rule = $('lifeRule').value, options = [...$('lifePreset').options], now = options.find((o) => o.value === rule || o.value.replace(/\/C\d+$/, '') === rule);
  if (!now || now.text.includes(lifeMark(mode))) return;  // a rule typed, or one for this shape: kept
  const fit = options.find((o) => o.text.includes(lifeMark(mode)));
  if (fit) setRuleText(fit.value);
}

function lifeReset() {
  const L = walk.life;
  L.alive.set(L.seed);  // cell states: 0 dead, 1 alive, 2 … C−1 dying (two civilisations: 1 red, 2 blue)
  for (let t = 0; t < L.alive.length; t++) {
    const live = L.alive[t] > 0 && L.alive[t] <= L.colours;
    L.age[t] = L.ever[t] = live ? 1 : 0;
  }
  L.died.fill(-1e9);
  L.gen = 0;  // generations computed, never wound back by a loop (the trail fades on, see died)
  L.extinctAt = Array.from({ length: L.colours + 1 }, (_, k) => (k && (L.colours === 1 ? L.seedAlive : L.seedByColour[k]) === 0 ? 0 : null));  // each colour's last generation alive, once all died out
  L.activity.fill(0);
  L.maxActivity = 0;
  L.aliveCount = L.everAlive = L.seedAlive;
  L.dyingCount = L.seedDying;
  L.blueCount = L.seedBlue;
  L.byColour = L.seedByColour.slice();
  L.born = L.dead = L.bornNow = L.deadNow = L.bornMax = L.deadMax = 0;
  L.peak = L.seedAlive;
  L.peakGen = 0;
  // civilisations: each colour's births, deaths, and cells ever of it (a bit per colour a cell had)
  L.bornBy = new Int32Array(L.colours + 1);
  L.deadBy = new Int32Array(L.colours + 1);
  L.everBy = L.seedByColour.slice();
  L.everMask = Uint16Array.from(L.seed, (v) => (L.colours > 1 && v ? 1 << v : 0));  // up to 12 colours
  // lifetime: fingerprint of every generation's state; the first repeat gives the loop
  L.seen = new Map([[lifeFingerprint(L.alive), 0]]);
  L.stable = null;  // { T: first generation of the loop, P: its period, extinct }
  // a loop: the counters as it closed (each round starts from them again), and each colour's live cells over one round
  L.loopBase = null;
  L.loopSum = new Float64Array(L.colours + 1);
  L.loopMin = new Float64Array(L.colours + 1).fill(Infinity);  // (a colour the same all round: its count exact, no ≈)
  L.loopMax = new Float64Array(L.colours + 1);
  L.loopN = 0;
  L.loopAvg = null;
  L.trace = { alive: [L.seedAlive], change: [0] };  // each generation's live cells and births + deaths (see drawActivity)
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

// One generation. A cell: 0 dead, k alive of colour k (1 … K, one colour: 1), k + K × s dying of colour
// k at stage s (1 … C − 2, see parseRule). Only live cells count as neighbours (on hexagons maybe where
// they sit, Callahan's letters); a newborn takes the colour most of them have; on a tie, the one colour missing
// around it if just one is (QuadLife's way: 4 colours, 1 + 1 + 1), else none (it stays dead). With C > 2 states a cell
// that fails to survive goes through the dying stages, keeping its colour, and cannot be born again until
// it is dead. A cell dying at generation g records died = g (fading trail).
function lifeStep() {
  const L = walk.life, { start, list } = L.nbr, ring = L.ring, a = L.alive, b = L.next, gen = cur + 1, C = L.C, K = L.colours, two = K > 1, R = ring ? ring.length / a.length : 0;
  const byColour = new Int32Array(K + 1), around = new Int32Array(K + 1), last = K * (C - 1);  // last: the last dying state
  const changes = L.born + L.dead, born0 = L.born, dead0 = L.dead;  // before this generation
  L.gen++;
  let alive = 0, dying = 0;
  for (let t = 0; t < a.length; t++) {
    const was = a[t];
    let now;
    if (start[t] === start[t + 1]) {
      now = 0;  // a wall (a pentagon of the hexagon sphere)
    } else if (was > K) {
      now = was + K <= last ? was + K : 0;  // one more dying stage, or dead
    } else {
      let c = 0;
      around.fill(0);
      if (ring) {  // where the live neighbours sit around it (6 round a hexagon, 8 round a square)
        for (let q = 0; q < R; q++) { const v = ring[R * t + q]; if (v >= 0 && a[v] && a[v] <= K) { c |= 1 << q; around[a[v]]++; } }
        c += 16;
      } else for (let q = start[t]; q < start[t + 1]; q++) { const v = a[list[q]]; if (v && v <= K) { c++; around[v]++; } }
      if (was) now = L.S[c] ? was : C > 2 ? was + K : 0;
      else if (!L.B[c]) now = 0;
      else if (!two) now = 1;
      else {  // the colour most of its live neighbours have; on a tie, the one missing, else no birth
        let most = 0, tied = 0, missing = 0, gone = 0;
        for (let k = 1; k <= K; k++) {
          if (around[k] > most) { most = around[k]; tied = 1; now = k; } else if (around[k] === most) tied++;
          if (!around[k]) { gone++; missing = k; }
        }
        if (tied > 1) now = gone === 1 ? missing : 0;
      }
    }
    b[t] = now;
    const live = now > 0 && now <= K, wasLive = was > 0 && was <= K;
    if (two && live !== wasLive) {  // a colour's births, deaths, and cells it has had
      if (live) { L.bornBy[now]++; if (!(L.everMask[t] & (1 << now))) { L.everMask[t] |= 1 << now; L.everBy[now]++; } }
      else L.deadBy[was]++;
    }
    if (live) alive++;
    else if (now) dying++;
    if (two && live) byColour[now]++;
    if (now === was) {
      if (live && L.age[t] < 65535) L.age[t]++;
      continue;
    }
    L.maxActivity = Math.max(L.maxActivity, ++L.activity[t]);
    if (live) {
      L.born++;
      L.age[t] = 1;
      if (!L.ever[t]) { L.ever[t] = 1; L.everAlive++; }
    } else if (wasLive) {
      L.dead++;
      L.age[t] = 0;
      L.died[t] = L.gen;
    }
  }
  L.alive = b;
  L.next = a;
  L.aliveCount = alive;
  L.dyingCount = dying;
  L.byColour = byColour;
  for (let k = 1; k <= K; k++) if ((K === 1 ? alive : byColour[k]) === 0 && L.extinctAt[k] === null) L.extinctAt[k] = gen;  // a colour all died out (for good: none left to be born of it)
  L.blueCount = byColour[2] ?? 0;
  L.trace.alive[gen] = alive;
  L.trace.change[gen] = L.born + L.dead - changes;
  L.bornNow = L.born - born0;  // this generation's births and deaths (how fast it lays and dies)
  L.deadNow = L.dead - dead0;
  L.bornMax = Math.max(L.bornMax, L.bornNow);  // the fastest so far (the gauges' scale)
  L.deadMax = Math.max(L.deadMax, L.deadNow);
  if (alive > L.peak) { L.peak = alive; L.peakGen = gen; }  // the most alive at once, and when
  lifeTrack(gen);
}

/* ==============================================================================================
 * PART 9 — THE HUNT
 * ==============================================================================================
 *
 * On any grid, in the Hunt start: random starts in a zone and tweaks of the best, on and on until
 * stopped, the 8 best kept.
 * One colour: the start that lasts longest (a methuselah); colours: the longest, most even battle.
 * The zone: the whole grid, as dense as said, or patches of a radius; in colours, a patch (or a part
 * of the grid) for each colour, at fair spots of the figure (see huntPatches).
 */

/* ---- 9.1 The hunt worker, its zones, its results --------------------------------------------- */
/* Life in 1 to 12 colours, on any grid, one hunt: on and on until stopped, one start in 3 at random in
 * the zone, the others a tweak of one of the 8 best (1 to 3 cells changed; patterns: one colour's);
 * the 8 best kept. The zone: see huntPlan (the whole grid as dense as said, patches of a radius,
 * patterns), each colour in its part. A zone with at most 20,000 starts has them all tried (the true
 * record), then the hunt is done.
 * - One colour, the longest life: the generation the run starts repeating at (fewer cells first).
 * - Colours, a battle: it lasts and every colour keeps spreading, as much as the others.
 *   S_c = Σ g × (cells born of colour c at generation g), the later the more it counts; the balance,
 *   1 − CV / √(K − 1), CV the standard deviation of the S_c over their mean (1: all even, 0: one colour
 *   spreading alone); score = the generations with two colours side by side, before the run repeats
 *   (or the cap), × the balance.
 * In a worker with its own copy of the step (as lifeStep's). */
function huntWorker() {
  const cellRandom = (seed, i) => {  // as the page's
    let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };
  self.onmessage = (e) => {
    const { n, start, list, ring, B, S, C, K, cells: flat, copies, dense, cap, all, choices, part, parts, dies } = e.data;  // dies: only the runs dying out; dense: a start's density, drawn between these
    const around = new Int32Array(K + 1), last = K * (C - 1), live = (v) => v > 0 && v <= K, R = ring ? ring.length / n : 0;
    // a cell's next state (as lifeStep), from the states a; a newborn's colour into born
    const next = (a, t, gen, born) => {
      const was = a[t];
      if (start[t] === start[t + 1]) return 0;  // a wall (a pentagon of the hexagon sphere)
      if (was > K) return was + K <= last ? was + K : 0;  // one more dying stage, or dead
      let c = 0;
      around.fill(0);
      if (ring) {
        for (let q = 0; q < R; q++) { const v = ring[R * t + q]; if (v >= 0 && live(a[v])) { c |= 1 << q; around[a[v]]++; } }
        c += 16;
      } else for (let q = start[t]; q < start[t + 1]; q++) { const v = a[list[q]]; if (live(v)) { c++; around[v]++; } }
      if (was) return S[c] ? was : C > 2 ? was + K : 0;
      if (!B[c]) return 0;
      if (K === 1) return 1;
      let most = 0, tied = 0, now = 0, missing = 0, gone = 0;  // the colour most of its live neighbours have; on a tie, the one missing, else no birth
      for (let k = 1; k <= K; k++) {
        if (around[k] > most) { most = around[k]; tied = 1; now = k; } else if (around[k] === most) tied++;
        if (!around[k]) { gone++; missing = k; }
      }
      if (tied > 1) now = gone === 1 ? missing : 0;
      if (now) born[now]++;
      return now;
    };
    // A cell whose own state and whose neighbours' did not change keeps its state: each generation only
    // the cells changed and their neighbours are worked out (all of them where a cell with no live
    // neighbour is born: B0). The fingerprint of a state (two Zobrist hashes, a value per cell and state)
    // and the pairs of neighbours alive in two colours are kept up to date from the changes alone.
    const everyCell = B[0] || (ring && B[16]), all_ = Int32Array.from({ length: n }, (_, t) => t);
    const zob = (t, v, seed) => { let h = Math.imul((t * 64 + v) ^ seed, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return (h ^ (h >>> 13)) >>> 0; };
    const odd = (x, y) => live(x) && live(y) && x !== y;  // two colours side by side
    const mark = new Uint32Array(n);
    let stamp = 0;
    // the cells a start chooses, with their colour; then, with a symmetry, the copies of these (cell, the
    // cell copied, the copy's colour: the colour of its part)
    const cells = Array.from({ length: flat.length / 2 }, (_, i) => [flat[2 * i], flat[2 * i + 1]]);
    const copy = (s) => { for (let i = 0; i < copies.length; i += 3) s[copies[i]] = s[copies[i + 1]] ? (K > 1 ? copies[i + 2] : s[copies[i + 1]]) : 0; return s; };
    // a run: its lifetime T (the generation it starts repeating from, P later), its end state, and its score
    const run = (seed) => {
      let a = Uint8Array.from(seed), b = new Uint8Array(n), T = cap, P = 0, h1 = 0, h2 = 0, pairs = 0, contacts = 0, active = all_, nActive = n;
      let alive = 0, peak = 0;  // the live cells, the most at once
      // a battle: the live cells of each colour, how many colours have some, and from when only one has (its winner)
      const byColour = new Int32Array(K + 1);
      for (let t = 0; t < n; t++) if (live(a[t])) byColour[a[t]]++;
      let colours = byColour.filter((c, k) => k && c).length, alone = 0;
      const spread = new Float64Array(K + 1), born = new Int32Array(K + 1), changed = new Int32Array(n), list2 = new Int32Array(n);
      for (let t = 0; t < n; t++) alive += live(a[t]);
      peak = alive;
      for (let t = 0; t < n; t++) if (a[t]) {
        h1 ^= zob(t, a[t], 0x2545f491); h2 ^= zob(t, a[t], 0x6c078965);
        if (K > 1) for (let q = start[t]; q < start[t + 1]; q++) pairs += odd(a[t], a[list[q]]);
      }
      const key = () => h1 * 2097152 + (h2 & 0x1fffff), seen = new Map([[key(), 0]]), inContact = [0];  // contacts up to each generation
      let end = key();
      for (let g = 1; g <= cap; g++) {
        born.fill(0);
        b.set(a);
        let nc = 0;
        for (let i = 0; i < nActive; i++) { const t = active[i], v = next(a, t, g, born); if (v !== a[t]) { b[t] = v; changed[nc++] = t; } }
        if (K > 1) {  // the generation was in contact if its state (a) was; then the pairs of the new one
          contacts += pairs > 0;
          inContact.push(contacts);
          stamp++;
          for (let i = 0; i < nc; i++) mark[changed[i]] = stamp;
          for (let i = 0; i < nc; i++) {
            const t = changed[i];
            for (let q = start[t]; q < start[t + 1]; q++) { const u = list[q]; pairs += (odd(b[t], b[u]) - odd(a[t], a[u])) * (mark[u] === stamp ? 1 : 2); }
          }
        }
        for (let k = 1; k <= K; k++) spread[k] += g * born[k];
        if (alive > peak) peak = alive;
        for (let i = 0; i < nc; i++) {
          const t = changed[i];
          alive += live(b[t]) - live(a[t]);
          if (K > 1 && live(a[t]) && --byColour[a[t]] === 0) colours--;
          if (K > 1 && live(b[t]) && byColour[b[t]]++ === 0) colours++;
          if (a[t]) { h1 ^= zob(t, a[t], 0x2545f491); h2 ^= zob(t, a[t], 0x6c078965); }
          if (b[t]) { h1 ^= zob(t, b[t], 0x2545f491); h2 ^= zob(t, b[t], 0x6c078965); }
        }
        [a, b] = [b, a];
        if (K > 1) alone = colours <= 1 ? alone || g : 0;
        end = key();
        if (seen.has(end)) { T = seen.get(end); P = g - T; break; }
        seen.set(end, g);
        if (everyCell) continue;
        stamp++;  // next: the cells changed and their neighbours
        nActive = 0;
        for (let i = 0; i < nc; i++) {
          const t = changed[i];
          if (mark[t] !== stamp) { mark[t] = stamp; list2[nActive++] = t; }
          for (let q = start[t]; q < start[t + 1]; q++) { const u = list[q]; if (mark[u] !== stamp) { mark[u] = stamp; list2[nActive++] = u; } }
          if (ring) for (let q = 0; q < R; q++) { const u = ring[R * t + q]; if (u >= 0 && mark[u] !== stamp) { mark[u] = stamp; list2[nActive++] = u; } }
        }
        active = list2;
      }
      if (K === 1) {
        let first = 0;  // the start's cells
        for (let t = 0; t < n; t++) first += seed[t] > 0;
        const extinct = !a.some((v) => v);
        return { score: dies && !extinct ? -Infinity : T - first / 1e6, T, P, end, live: first, extinct, peak };  // peak: the most alive at once
      }
      const S_ = Array.from(spread.subarray(1)), mean = S_.reduce((x, y) => x + y, 0) / K;
      const cv = mean ? Math.sqrt(S_.reduce((x, y) => x + (y - mean) ** 2, 0) / K) / mean : Infinity;
      // (no contact at all: the longer first)
      const balance = Math.max(0, 1 - cv / Math.sqrt(K - 1)), touching = inContact[Math.min(T, inContact.length - 1)];  // 1 all even, 0 one colour doing it all (CV at most √(K − 1))
      const winner = colours === 1 ? byColour.findIndex((c, k) => k && c) : 0;
      return { score: touching * balance + T / 1e6, contacts: touching, T, P, end, balance, winner, alone };
    };
    // a random start: each cell alive (of its colour; one colour: alive or a dying state) as dense as drawn
    // (each colour at least one cell alive: a colour of few cells would else often start with none)
    const randomSeed = () => {
      const s = new Uint8Array(n), density = dense[0] + Math.random() * (dense[1] - dense[0]);
      for (const [t, k] of cells) if (Math.random() < density) s[t] = K > 1 ? k : 1 + Math.floor(Math.random() * (C - 1));  // colours: live cells only
      for (let k = 1; k <= K; k++) {
        const mine = cells.filter((c) => (K > 1 ? c[1] === k : true));
        if (mine.length && !mine.some(([t]) => s[t] === (K > 1 ? k : 1))) s[mine[Math.floor(Math.random() * mine.length)][0]] = K > 1 ? k : 1;
      }
      return copy(s);
    };
    const nthSeed = (k) => {  // start number k of them all: k written in base C over the cells
      const s = new Uint8Array(n);
      for (const [t] of cells) { s[t] = k % C; k = Math.floor(k / C); }
      return copy(s);
    };
    // Patterns: for each colour, its choices (a pattern, turned or mirrored, at its spot: [cell, state…]);
    // a start, one choice a colour (pick)
    const fromPick = (pick) => {
      const s = new Uint8Array(n);
      pick.forEach((c, i) => { const f = choices[i][c]; for (let q = 0; q < f.length; q += 2) s[f[q]] = f[q + 1]; });
      s.pick = pick;
      return s;
    };
    const randomPick = () => fromPick(choices.map((c) => Math.floor(Math.random() * c.length)));
    const nthPick = (k) => fromPick(choices.map((c) => { const d = k % c.length; k = Math.floor(k / c.length); return d; }));
    const top = [];  // the 8 best: { ...run, seed }
    const keep = (r, seed) => {
      if (r.score === -Infinity || (top.length === 8 && r.score <= top[7].score)) return false;
      // the same run: ending alike at the same T; one colour, as long with the same period (a turned copy,
      // or cells that change nothing), the fewer cells kept; colours, as long in contact as evenly (turned)
      const same = top.findIndex((x) => x.T === r.T && (K === 1 ? x.P === r.P : x.end === r.end || (x.contacts === r.contacts && Math.abs(x.balance - r.balance) < 1e-6)));
      if (same >= 0 && top[same].score >= r.score) return false;  // the same run, as good already
      if (same >= 0) top.splice(same, 1);
      top.push({ ...r, seed, pick: seed.pick });
      top.sort((x, y) => y.score - x.score);
      top.length = Math.min(top.length, 8);
      return true;
    };
    let done = 0;  // this worker's starts so far
    const report = (changed) => {
      if (changed || done % 10 === 0) self.postMessage({ type: 'progress', i: done, top: changed ? top.map((r) => ({ ...r, seed: r.seed.slice() })) : null });
    };
    // few enough starts: all of them, every parts-th from this worker's, then done
    if (all) {
      for (let i = 1 + part; i <= all; i += parts) { const seed = choices ? nthPick(i - 1) : nthSeed(i - 1); done++; report(keep(run(seed), seed)); }
      self.postMessage({ type: 'done' });
      return;
    }
    // else on and on, until stopped: one start in 3 at random, to look elsewhere; the others a tweak of one
    // of the best (patterns: one colour's choice changed; else 1 to 3 cells), to make it better
    for (;;) {
      let seed;
      if (!top.length || done % 3 === 0) seed = choices ? randomPick() : randomSeed();
      else {
        const base = top[Math.floor(Math.random() * top.length)];
        if (choices) {
          const pick = base.pick.slice(), c = Math.floor(Math.random() * K);
          pick[c] = Math.floor(Math.random() * choices[c].length);
          seed = fromPick(pick);
        } else {
          seed = base.seed.slice();
          for (let m = 1 + Math.floor(Math.random() * 3); m > 0; m--) {
            const [t, k] = cells[Math.floor(Math.random() * cells.length)];
            seed[t] = K > 1 ? (seed[t] ? 0 : k) : Math.floor(Math.random() * C);
          }
          copy(seed);
        }
      }
      done++;
      report(keep(run(seed), seed));
    }
  };
}
const hunt = { worker: null, zone: 'full', top: [], status: '', picked: null, goal: 'longest' };  // goal in one colour: longest or dies (colours: a battle)
// What the hunt looks for: the longest life, the longest till it dies out (one colour), or a battle,
// which starts with the colours that suit the figure best: one for each of its natural spots
const HUNT_GOALS = { longest: '∞ Longest', dies: '✝ Dies out', battle: '⚔ Battle' };
const BATTLE_COLOURS = { cube: 6, pits: 6, tetra: 4, octa: 8, stella: 8, dodeca: 12, icosa: 12, hexsphere: 12, tetraKite: 4, octaKite: 8, icosaKite: 12, mobius: 2, mobiusHex: 2, mobiusTri: 2, mobiusCairo: 2, mobiusKite: 2 };  // else (the plane, a torus) 4
const huntGoal = () => (walk.life?.colours > 1 ? 'battle' : hunt.goal);
function pickGoal(goal) {
  if (goal === 'battle') {
    if (lifeColours > 1) return;
    lifeColours = BATTLE_COLOURS[MODES[$('mode').value].sphere] ?? 4;  // fitted to the figure when built (see fitColours)
  } else {
    hunt.goal = goal;
    if (lifeColours === 1) { hunt.top = []; hunt.status = ''; renderHunt(); syncLink(); return; }
    lifeColours = 1;
  }
  compute();
}  // picked: the result played (its T and end)
const huntId = (r) => `${r.T}|${r.end}`;
// The zones: patches of radius 1 to 6 round each spot (Spark … Meadow), the whole grid (Wild), the rule's
// patterns (Famous); their random starts each as dense as drawn between 10 and 70 % (the records often
// come from sparse starts, the long lives on average from dense ones: PATTERNS.md, Densities)
const HUNT_ZONES = { radius1: ['zone1', 'Spark'], radius2: ['zone2', 'Seed'], radius3: ['zone3', 'Sprout'], radius4: ['zone4', 'Bloom'],
                     radius5: ['zone5', 'Grove'], radius6: ['zone6', 'Meadow'], radius7: ['zone7', 'Forest'], radius8: ['zone8', 'Jungle'],
                     face: ['zoneFace', 'Realm'],  // a whole face of a solid (see faceParts)
                     full: ['zoneAll', 'Wild'],
                     patterns: [null, 'Famous'],  // the rule's patterns, mixed (see patternChoices)
                     custom: ['link', 'Custom'] };  // a start from a link, from none of these: shown then only
const DENSITY = [0.1, 0.7];  // a random start's density, drawn between these
const density = () => DENSITY[0] + Math.random() * (DENSITY[1] - DENSITY[0]);
const zoneRadius = (zone) => (zone.startsWith('radius') ? Number(zone.slice(6)) : 0);
const COLOUR_PARTS = { 2: '2 halves', 3: '3 thirds', 4: '4 quarters', 6: '6 sixths', 8: '8 eighths', 12: '12 twelfths' };
// The rules whose colours meet only when they start side by side (measured: none in contact from 16
// cells apart): on the plane, their patches touch round the middle; the others' sit at fair spots
const NEAR_RULES = ['B3678/S34678', 'B34/S123/C3', 'B2/S34', 'B24/S35', 'B2o/S2m34', 'B34/S23', 'B2/S24/C3', 'B23/S6/C3'];
// A solid's fair spots for k colours (see coloursFit), as directions: its faces, corners or edges'
// middles, or a few of them that its turns swap (2 opposite, 3 round a corner, 4 as a tetrahedron's)
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const CORNERS8 = [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
const TETRA4 = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const EDGES12 = [[1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1], [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]];
const ICO = () => POLYHEDRA.icosa.P, nearest3 = (d) => [...ICO()].sort((p, q) => dot3(q, d) / Math.hypot(...q) - dot3(p, d) / Math.hypot(...p)).slice(0, 3);
const ICOSA_SPOTS = () => ({ 2: [ICO()[0], ICO()[0].map((v) => -v)], 3: [ICO()[0], ICO()[11], ICO()[5]], 4: TETRA4, 8: CORNERS8, 12: ICO() });
const SOLID_SPOTS = {
  cube: () => ({ 2: AXES.slice(0, 2), 3: [AXES[0], AXES[2], AXES[4]], 4: AXES.slice(0, 4), 6: AXES, 8: CORNERS8, 12: EDGES12 }),
  pits: () => ({ 2: AXES.slice(0, 2), 3: [AXES[0], AXES[2], AXES[4]], 4: AXES.slice(0, 4), 6: AXES }),  // the pits' floors
  octa: () => ({ 2: AXES.slice(0, 2), 3: [AXES[0], AXES[2], AXES[4]], 4: TETRA4, 6: AXES, 8: CORNERS8, 12: EDGES12 }),
  tetra: () => ({ 2: AXES.slice(0, 2), 4: TETRA4.map((p) => p.map((v) => -v)), 6: AXES }),  // its faces face away from its corners
  stella: () => ({ 2: [CORNERS8[0], CORNERS8[7]], 4: TETRA4, 6: AXES, 8: CORNERS8 }),
  dodeca: () => ({ 2: ICOSA_SPOTS()[2], 3: nearest3([1, 1, 1]), 4: TETRA4, 12: ICO() }),
  icosa: ICOSA_SPOTS, hexsphere: ICOSA_SPOTS,
};
for (const k of ['tetra', 'octa', 'icosa']) SOLID_SPOTS[`${k}Kite`] = SOLID_SPOTS[k];  // kites: the triangles' solids
// Each colour's part of the grid: radius r, a patch round each spot; else (r = 0) the whole grid,
// each cell to its nearest spot. Spots: on the plane, the middles of a lattice of k blocks (or, for
// a rule whose colours must start side by side, touching patches round the middle); on a torus, a
// lattice; on a solid, its fair spots (see SOLID_SPOTS); one colour, the middle or the front
// With dead edges and 3, 6, 8 or 12 colours (not halves or quarters): slices round the middle, the cells by their
// angle from it, as many in each (a colour from the middle out to the wall, as much wall as the others); a slice's
// spot: its cell nearest halfway out along its middle angle. Kept per grid
let sliceMemo = null;
const wallSlices = (K) => walk.plane && !walk.plane.torus && K !== 2 && K !== 4 && K > 1;
function planeSlices(K) {
  const { kind, W, row } = walk.plane, n = W * row, key = `${kind}|${W}|${K}`;
  if (sliceMemo?.key === key) return sliceMemo;
  const b = planeBounds(), mid = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  const at = Array.from({ length: n }, (_, t) => cellMiddle(kind, t % row, Math.floor(t / row))), angle = at.map(([u, v]) => Math.atan2(v - mid[1], u - mid[0]));
  const order = [...angle.keys()].sort((p, q) => angle[p] - angle[q]), part = new Int32Array(n), reach = Math.min(b.maxX - b.minX, b.maxY - b.minY) / 4;
  order.forEach((t, k) => { part[t] = Math.floor((k * K) / n); });
  const spots = Array.from({ length: K }, (_, i) => {
    const ts = order.slice(Math.floor((i * n) / K), Math.floor(((i + 1) * n) / K)), a = angle[ts[ts.length >> 1]], p = [mid[0] + reach * Math.cos(a), mid[1] + reach * Math.sin(a)];
    return ts.reduce((best, t) => (Math.hypot(at[t][0] - p[0], at[t][1] - p[1]) < Math.hypot(at[best][0] - p[0], at[best][1] - p[1]) ? t : best), ts[0]);
  });
  return (sliceMemo = { key, part, spots });
}
function huntParts(r, K) {
  const L = walk.life, g = walk.geo, n = L.alive.length, [cols, rows] = COLOUR_GRID[K], open = (t) => L.nbr.start[t] < L.nbr.start[t + 1];
  const parts = Array.from({ length: K }, () => []);
  if (walk.plane) {
    const { W, row } = walk.plane, block = (t) => { const x = t % row, y = (t - x) / row; return Math.floor((y * rows) / W) * cols + Math.floor((x * cols) / row); };
    if (wallSlices(K)) { const { part, spots } = planeSlices(K); if (!r) { for (let t = 0; t < n; t++) parts[part[t]].push(t); return parts; } return spots.map((t) => lifePatch(r, t)); }
    if (!r) { for (let t = 0; t < n; t++) parts[block(t)].push(t); return parts; }
    if (K === 1) return [lifePatch(r)];
    const near = NEAR_RULES.includes(L.ruleText) || K === 1, side = 2 * r + 1;
    return parts.map((_, i) => lifePatch(r, near
      ? ((W >> 1) + Math.floor(((2 * Math.floor(i / cols) - (rows - 1)) * side) / 2)) * row + (row >> 1) + Math.floor(((2 * (i % cols) - (cols - 1)) * side) / 2)
      : Math.floor(((Math.floor(i / cols) + 0.5) * W) / rows) * row + Math.floor((((i % cols) + 0.5) * row) / cols)));
  }
  // a Möbius strip: the colours' parts in turn along it twice round (its two sides one strip, 2L, see
  // mobiusLoop: s and s + L are one place, its two sides), each its stretch, 2L / K long, a patch at its
  // middle; from the start of the face in view (red first), so that a face holds whole stretches when it can
  if (g.mobius) {
    const s0 = mobiusMiddle(g) - g.L / 2, stretch = (2 * g.L) / K, along = (t) => (((mobiusLoop(g, t)[0] - s0) % (2 * g.L)) + 2 * g.L) % (2 * g.L);
    // (a tile whose middle is on a stretch's end, the sheet's end for one: in the stretch it starts, whatever the rounding)
    if (!r) { for (let t = 0; t < n; t++) parts[Math.min(K - 1, Math.floor(along(t) / stretch + 1e-9))].push(t); return parts; }
    if (K === 1) return [lifePatch(r)];
    return parts.map((_, k) => lifePatch(r, mobiusNearest(s0 + (k + 0.5) * stretch, g.W / 2)));  // at their stretches' middles
  }
  if (g.torus) {  // a torus, a Klein bottle: its blocks on the sheet (see torusBlocks), each tile in the one its middle is in
    const [a, b] = torusBlocks(K), block = (t) => { const [u, v] = sheetMiddle(g, t); return Math.floor((u * a) / g.nu) * b + Math.floor((v * b) / g.nv); };
    if (!r) { for (let t = 0; t < n; t++) parts[block(t)].push(t); return parts; }
    return parts.map((_, i) => lifePatch(r, K === 1 ? centreCells() : sheetNearest(((Math.floor(i / b) + 0.5) * g.nu) / a, (((i % b) + 0.5) * g.nv) / b)[0]));  // at their middles (a tile there, as on the plane)
  }
  const spots = K === 1 ? null : SOLID_SPOTS[MODES[$('mode').value].sphere]()[K].map(unit), up = (t) => unit(Array.from(g.cen.subarray(3 * t, 3 * t + 3)));
  // 3 colours on the cube: 2 opposite faces each (its face's axis, either way)
  const pairs = K === 3 && g.sides === 4 && !g.kite && (g.perFace || g.floors), near = (d, c) => (pairs ? Math.abs(dot3(d, c)) : dot3(d, c));
  const nearestSpot = (t) => { const c = up(t); let best = 0; spots.forEach((d, k) => { if (near(d, c) > near(spots[best], c)) best = k; }); return best; };
  if (!r) { for (let t = 0; t < n; t++) if (open(t)) parts[K === 1 ? 0 : nearestSpot(t)].push(t); return parts; }
  if (K === 1) return [lifePatch(r)];
  return spots.map((d) => lifePatch(r, centreCells(d)));  // round the open cells nearest each spot
}
// A solid's face of cell t (a cube with pits: the face its pit is in, by the largest of its coordinates);
// null without faces (the plane, a torus, the sphere of hexagons). Without t: whether there are faces
function faceOf(t = 0) {
  const g = walk.geo;
  if (walk.plane || !g || g.torus) return null;
  if (g.perFace) return Math.floor(t / g.perFace / facesPer());
  if (!g.floors) return null;
  const c = g.cen.subarray(3 * t, 3 * t + 3), ax = [0, 1, 2].reduce((m, d) => (Math.abs(c[d]) > Math.abs(c[m]) ? d : m), 0);
  return 2 * ax + (c[ax] < 0 ? 1 : 0);
}
// the triangle faces of a face of the solid: 5 for a dodecahedron's pentagon, else 1
const facesPer = () => (MODES[$('mode').value].sphere === 'dodeca' ? 5 : 1);
// Each colour's face: the one in front (one colour), else the face at its spot
function faceParts(K) {
  const g = walk.geo, spots = K === 1 ? [null] : SOLID_SPOTS[MODES[$('mode').value].sphere]()[K];
  return spots.map((d) => {
    const f = faceOf(centreCells(d ?? undefined)[0]), part = [];
    for (let t = 0; t < g.n; t++) if (walk.life.nbr.start[t] < walk.life.nbr.start[t + 1] && faceOf(t) === f) part.push(t);
    return part;
  });
}
const zoneParts = (zone, K) => (zone === 'face' ? faceParts(K) : huntParts(zoneRadius(zone), K));
// The zone: each colour's part (see huntParts). On the plane, with a symmetry it defines the start: the
// zone and all its copies, of which only the first of each cell's copies is chosen, the others copied
// from it (in colours, a copy takes the colour of the part it falls in). Returns the cells chosen [cell,
// colour], the copies [cell, cell copied, colour], the cells of a colour, how dense the random starts
// are, and how many starts when few enough to try them all.
function huntPlan() {
  const { colours: K, C } = walk.life, r = zoneRadius(hunt.zone), zone = new Set(), mine = new Map();  // mine: each cell's colour
  if (hunt.zone === 'custom') return { cells: [], copies: [], perColour: 0, density: 0, all: 0 };
  if (hunt.zone === 'patterns') {
    const choices = patternChoices(), count = choices.reduce((m, c) => m * c.length, 1);
    return { cells: [], copies: [], choices, perColour: choices[0].length, density: 0, all: count <= 20000 ? count : 0 };
  }
  zoneParts(hunt.zone, K).forEach((part, i) => { for (const t of part) { zone.add(t); if (!mine.has(t)) mine.set(t, i + 1); } });
  const cells = [], copies = [];
  if (walk.plane) {
    const { kind, W } = walk.plane;
    for (const t of [...zone]) for (const c of cellCopies(kind, W, t)) zone.add(c);
    const partOf = new Map();  // a copy outside the patches: its part's colour
    if (symmetryOf(kind) !== 'none') huntParts(0, K).forEach((p, i) => p.forEach((t) => partOf.set(t, i + 1)));
    const colourOf = (t) => mine.get(t) ?? partOf.get(t);
    for (const t of zone) {
      const first = Math.min(...cellCopies(kind, W, t));
      if (first === t) cells.push([t, colourOf(t)]); else copies.push([t, first, colourOf(t)]);
    }
  } else for (const t of zone) cells.push([t, mine.get(t)]);
  const count = K === 1 && r ? C ** cells.length : Infinity;
  return { cells, copies, perColour: Math.round(zone.size / K), all: count <= 20000 ? count : 0 };
}
// the start again, after its symmetry changed: in Hunt, a new start in the zone (the starts found were of
// another kind), else the start chosen
const reseedStart = () => (huntOn() ? pickZone(hunt.zone) : lifeReseed());
const huntOn = () => !!walk.life && plane.start === 'random' && COLOUR_STEPS.includes(walk.life.colours);
// the zones that fit the grid: a radius whose patches would overlap, or patterns with none here, greyed
function huntFits() {
  const K = walk.life.colours, key = `${$('mode').value}|${walk.life.seed.length}|${K}|${walk.plane?.torus}|${walk.life.ruleText}`;
  if (hunt.fitKey === key) return hunt.fits;
  hunt.fitKey = key;
  return (hunt.fits = Object.fromEntries(Object.keys(HUNT_ZONES).map((zone) => {
    const r = zoneRadius(zone);
    if (zone === 'patterns') return [zone, patternsOn() && patternChoices()[0].length > 0];
    if (zone === 'face' && faceOf() === null) return [zone, false];
    if (!r && zone !== 'face') return [zone, true];
    const parts = zoneParts(zone, K);
    return [zone, new Set(parts.flat()).size === parts.reduce((sum, p) => sum + p.length, 0)];
  })));
}
function renderHunt() {
  $('huntRow').hidden = !huntOn() || surfaceDraw;
  if ($('huntRow').hidden) return;
  const K = walk.life.colours, { cells, perColour, all } = huntPlan(), busy = !!hunt.worker, sym = walk.plane ? symmetryOf(walk.plane.kind) : 'none';
  const what = K > 1 ? (walk.plane ? `a battle in ${COLOUR_PARTS[K]}` : `a battle of ${K} colours`) : hunt.goal === 'dies' ? 'the longest death' : 'the longest life';
  for (const b of $('huntGoals').children) b.classList.toggle('active', b.dataset.goal === huntGoal());
  const fits = huntFits();
  for (const b of $('huntZones').children) {
    b.classList.toggle('active', b.dataset.zone === hunt.zone);
    b.disabled = busy || !fits[b.dataset.zone];
    if (b.dataset.zone === 'custom') b.hidden = hunt.zone !== 'custom';
  }
  // one line under the button: the zone before a hunt, how far it got while it runs, what it found after
  const zone = hunt.zone === 'custom' ? `${fmt(walk.life.seedAlive)} cells from a link · pick a zone to hunt in`
    : (hunt.zone === 'patterns' ? `${fmt(perColour)} patterns and ways a colour`
      : `${all ? '' : `${fmt(Math.max(1, Math.round(DENSITY[0] * perColour)))}–${fmt(Math.max(1, Math.round(DENSITY[1] * perColour)))} alive / `}${fmt(perColour)} cells${K > 1 ? ' a colour' : ''}${sym !== 'none' ? ` · ${SYMMETRIES[sym][2]}, ${fmt(cells.length)} chosen` : ''}`)
      + (all ? ` · ${fmt(all)} starts, all to try` : '');
  $('huntBtn').innerHTML = busy ? `${icon('stop')} Stop hunt and play` : `${icon('search')} Hunt ${what}`;
  $('huntBtn').disabled = !busy && hunt.zone === 'custom';  // a start from a link: a zone to hunt in first
  $('huntBtn').title = hunt.zone === 'custom' ? 'A start from a link: pick a zone to hunt in' : 'On and on until stopped: random starts and tweaks of the best, the 8 best kept; a click on one plays it';
  $('huntStatus').textContent = hunt.status || zone;
  // each result's light: a battle by its balance (green 0.6 and up: even; orange from 0.3; red: one-sided;
  // grey: the colours never touched, no battle), a life by its length against the best one's (green 80 %
  // and up, orange from 50 %)
  // a life by how far it spreads: its most live cells at once, as a share of the grid, by its cells at the
  // start (green 0.01 and up, orange from 0.002: a soup half full is red)
  const n = walk.life.seed.length;
  const light = (r) => {
    if (K > 1 && !r.contacts) return ['#8b949e', 'no contact'];
    const q = K === 1 ? r.peak / n / r.live : r.balance, [hi, lo] = K === 1 ? [0.01, 0.002] : [0.6, 0.3];
    return q >= hi ? ['#30a46c', K === 1 ? 'spreads far' : 'even'] : q >= lo ? ['#f0a020', K === 1 ? 'spreads some' : 'uneven'] : ['#e5484d', K === 1 ? 'spreads little' : 'one-sided']; };
  // built again only when the best or the one picked change, not at each count: a click lands on what was pressed
  const listKey = `${hunt.top.map(huntId).join()}|${hunt.picked}|${K}`;
  if (listKey === hunt.listKey) return;
  hunt.listKey = listKey;
  $('huntTop').replaceChildren(...hunt.top.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    const [name, detail] = K === 1
      ? [`${fmt(r.T)} generations${r.P ? '' : ' or more'}`, `${r.extinct ? 'dies out' : r.P === 1 ? 'settles' : r.P ? `period-${fmt(r.P)} loop` : 'still changing'} · ${fmt(r.live)} cells`]
      : [`${fmt(r.contacts)} generations in contact`, r.winner ? `${LIFE_COLOUR_NAMES[r.winner - 1]} wins at gen ${fmt(r.alone)}`
        : r.P ? `of ${fmt(r.T)} before it settles` : `still fighting at gen ${fmt(r.T)}, where the hunt stops`];  // its balance: on its light
    const [colour, word] = light(r);
    b.innerHTML = `<span class="mode-icon"><i class="light" style="background:${colour}" title="${word}${K > 1 ? ` · balance ${r.balance.toFixed(2)}` : ` · at most ${fmt(r.peak)} alive of ${fmt(n)} cells, from ${fmt(r.live)}`}"></i></span><span><span class="mode-name">${name}</span><span class="mode-detail">${detail}</span></span>`;
    b.classList.toggle('active', huntId(r) === hunt.picked);  // the one played, wherever it is now
    b.addEventListener('pointerdown', (e) => { if (e.button === 0) playHuntResult(r); });  // at once, even while the hunt goes on
    b.addEventListener('click', (e) => { if (!e.detail) playHuntResult(r); });  // from the keyboard
    return b;
  }));
}
// a result played: its start, kept picked (lit) until another one is
function playHuntResult(r) {
  if (hunt.worker) stopHunt();  // a result played: the hunt stops there
  hunt.picked = huntId(r);
  setLifeSeed(r.seed, walk.life.colours === 1 ? 'hunt' : 'battle');
  renderHunt();
}
// the best of several workers: the same run once (as the worker's keep), the 8 best
function mergeTops(all, K) {
  const top = [];
  for (const r of all.sort((x, y) => y.score - x.score)) {
    const same = top.some((x) => x.T === r.T && (K === 1 ? x.P === r.P : x.end === r.end || (x.contacts === r.contacts && Math.abs(x.balance - r.balance) < 1e-6)));
    if (!same && top.length < 8) top.push(r);
  }
  return top;
}
function stopHunt() {
  hunt.worker?.forEach((w) => w.terminate());
  hunt.worker = null;
  renderHunt();
}
// a zone picked: one random start in it at once (the whole grid alone: the soup)
// a random start in the zone (hunt.zone): patterns, one of each colour's; a radius, its patches half
// alive; null for the whole grid (its soup, see startColours)
function zoneSeed() {
  if (!zoneRadius(hunt.zone) && hunt.zone !== 'patterns' && hunt.zone !== 'face') return null;  // (Custom: the link's, once)
  const { cells, copies, choices } = huntPlan(), seed = new Uint8Array(walk.life.seed.length), d = density();
  if (choices) for (const c of choices) { const f = c[Math.floor(Math.random() * c.length)] ?? []; for (let q = 0; q < f.length; q += 2) seed[f[q]] = f[q + 1]; }
  else {
    for (const [t, k] of cells) if (Math.random() < d) seed[t] = k;
    for (const k of new Set(cells.map((c) => c[1]))) {  // each colour at least one cell alive (as the hunt's starts)
      const mine = cells.filter((c) => c[1] === k);
      if (!mine.some(([t]) => seed[t])) seed[mine[Math.floor(Math.random() * mine.length)][0]] = k;
    }
    for (const [t, first, k] of copies) if (seed[first]) seed[t] = k;
  }
  return seed;
}
function pickZone(zone) {
  hunt.zone = zone;
  hunt.top = [];
  hunt.status = '';
  if (zone === 'full') {  // the whole grid: a new soup each time, as dense as drawn (in whole percents)
    plane.density = Math.round(100 * density());
    plane.seed = 1 + Math.floor(Math.random() * 999999999);
    lifeReseed();  // in colours, each in its part
  } else setLifeSeed(zoneSeed(), { zone });
  renderHunt();
}
function huntClick() {
  if (hunt.worker) {  // Stop hunt and play: the one picked if still among the best, else the best
    stopHunt();
    const r = hunt.top.find((x) => huntId(x) === hunt.picked) ?? hunt.top[0];
    if (r) { playHuntResult(r); play(true); }
    return;
  }
  // as many workers as the computer has cores (one left for the page), on and on until stopped (or, few
  // enough starts, each with every parts-th of them); their best merged
  const L = walk.life, { cells, copies, all, choices } = huntPlan(), K = L.colours, parts = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
  const tops = [], done = new Int32Array(parts);
  let finished = 0;
  hunt.top = [];
  hunt.worker = Array.from({ length: parts }, (_, part) => {
    const w = new Worker(URL.createObjectURL(new Blob([`(${huntWorker.toString()})()`], { type: 'text/javascript' })));
    w.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'done') {
        if (++finished < parts) return;
        hunt.status = `All ${fmt(all)} tried · ${hunt.top.length ? `${fmt(hunt.top.length)} kept` : K > 1 ? 'no battle' : hunt.goal === 'dies' ? 'none dies out' : 'nothing lasts'}`;
        stopHunt();
        return;
      }
      if (d.top) { tops[part] = d.top; hunt.top = mergeTops(tops.flat(), K); }
      done[part] = d.i;
      const n = done.reduce((x, y) => x + y, 0);
      hunt.status = `${all ? `${fmt(n)} / ${fmt(all)}` : fmt(n)} tried · ${fmt(hunt.top.length)} kept`;
      renderHunt();
    };
    w.postMessage({ n: L.alive.length, start: L.nbr.start, list: L.nbr.list, ring: L.ring, B: L.B, S: L.S, C: L.C, K,
                    cells: Int32Array.from(cells.flat()), copies: Int32Array.from(copies.flat()), dense: DENSITY, all, choices,
                    cap: K === 1 ? 50000 : 4000, part, parts, dies: K === 1 && hunt.goal === 'dies' });
    return w;
  });
  hunt.status = 'Starting…';
  renderHunt();
}

/* ---- 9.1b Patterns ------------------------------------------------------------------------- */
// The hunt's Patterns zone: at each colour's fair spot, one of the rule's patterns (Draw's), turned or
// mirrored; the hunt mixes them, which pattern and which way for each colour. On the plane, the torus
// of squares, and faces: the cube's squares, the triangles of the tetrahedron, the octahedron, the
// icosahedron, the dodecahedron's pentagons and the stella's tips (each cut as the plane's triangles
// are, f × f, see flatPolyhedron), a pattern on a face.
const CUBE_FACES = [1, 2, 3, 4, 6];  // the cube: its colours on faces
const TRI_FACES = { tetra: () => ({ 4: TETRA4.map((p) => p.map((v) => -v)) }), octa: () => ({ 2: [CORNERS8[0], CORNERS8[7]], 4: TETRA4, 8: CORNERS8 }) };
TRI_FACES.icosa = TRI_FACES.octa;  // the icosahedron's faces include the octahedron's directions
for (const k of ['tetra', 'octa', 'icosa']) TRI_FACES[`${k}Kite`] = () => TRI_FACES[k]();
// the dodecahedron: a pentagon's 5 triangles (cut from its middle, as the plane's), the pattern in its
// first; the stella: a tip's 3 triangles, the pattern in the one most facing it
TRI_FACES.dodeca = () => ({ 2: ICOSA_SPOTS()[2], 3: nearest3([1, 1, 1]), 12: ICO() });
TRI_FACES.stella = () => ({ 2: [CORNERS8[0], CORNERS8[7]], 4: TETRA4, 8: CORNERS8 });
const patternsOn = () => {
  const m = MODES[$('mode').value], K = walk.life?.colours;
  const turned = /Turned$/.test(surfaceOf(m));  // (tilings turned by 30°: not yet)
  return !!walk.life && (!!m.plane || (!!walk.geo?.torus && !turned) || (['cube', 'pits'].includes(m.sphere) && CUBE_FACES.includes(K)) || (!!TRI_FACES[m.sphere] && (K === 1 || !!TRI_FACES[m.sphere]()[K])));
};
// the grid the patterns are of: the plane's, else the cells' (the cube's squares, the sheets', the solids' triangles)
const patternKind = () => walk.plane?.kind ?? (walk.geo.kite ? 'kite' : { 3: 'tri', 5: 'cairo', 6: 'hex' }[walk.geo.sides] ?? 'square');
// a triangle face's cells: (i, j, o) as the plane's triangle 2i + o of row j, its index in the face
const triFaceIndex = (f) => { const at = new Map(); let k = 0; for (let i = 0; i < f; i++) for (let j = 0; i + j < f; j++) { at.set(`${2 * i},${j}`, k++); if (i + j < f - 1) at.set(`${2 * i + 1},${j}`, k++); } return at; };
// colour i's cells [cell, pattern state], the pattern centred on its spot: the middle of its block of the
// plane or the torus (a lattice, see huntParts), the middle of its face of the cube
function patternAt(i, K, cells) {
  const g = walk.geo, [cols, rows] = COLOUR_GRID[K], out = [];
  const w = Math.max(...cells.map((c) => c[0])) + 1, h = Math.max(...cells.map((c) => c[1])) + 1;
  if (walk.plane) {
    const { W, row } = walk.plane, t = wallSlices(K) ? planeSlices(K).spots[i] : Math.floor(((Math.floor(i / cols) + 0.5) * W) / rows) * row + Math.floor((((i % cols) + 0.5) * row) / cols);
    return brushAt([t % row, Math.floor(t / row)], cells).map(([x, y, v]) => [y * row + x, v]);
  }
  if (g.torus && (g.mobius || g.klein || g.kite || g.sides !== 4)) return sheetPatternAt(famousSpot(i, K), cells);  // any other sheet
  if (g.torus) {  // cells u × nv + v, the pattern's rows along u
    const [a, b] = torusBlocks(K);
    const u0 = Math.floor(((Math.floor(i / b) + 0.5) * g.nu) / a) - (h >> 1), v0 = Math.floor((((i % b) + 0.5) * g.nv) / b) - (w >> 1);
    for (const [x, y, v] of cells) out.push([(((u0 + y) % g.nu) + g.nu) % g.nu * g.nv + ((((v0 + x) % g.nv) + g.nv) % g.nv), v]);
    return out;
  }
  if (g.sides === 3 || g.kite) {  // a triangle face: its own rows and triangles (kites: 3 a triangle, as on the plane), the pattern round its middle
    const sphere = MODES[$('mode').value].sphere, d = K === 1 ? null : unit(TRI_FACES[sphere]()[K][i]);
    const mid = (fc) => unit([0, 1, 2].map((a) => fc.corners.reduce((sum, c) => sum + c[a], 0)));  // a face's middle, as a direction
    const face = d ? g.faces.reduce((best, fc, k) => (dot3(mid(fc), d) > dot3(mid(g.faces[best]), d) + 1e-9 ? k : best), 0) : Math.floor(patchCentre() / g.perFace);
    const per = g.kite ? 3 : 1, wt = Math.ceil(w / per), at = triFaceIndex(g.size), i0 = Math.round(g.size / 3) - (((wt >> 1) + 1) >> 1), j0 = Math.round(g.size / 3) - (h >> 1);
    for (const [x, y, v] of cells) { const k = at.get(`${Math.floor(x / per) + 2 * i0},${y + j0}`); if (k !== undefined) out.push([face * g.perFace + per * k + (x % per), v]); }
    return out;
  }
  const dir = K === 1 ? AXES[3] : SOLID_SPOTS.cube()[K][i], f = AXES.findIndex((d) => d.every((v, k) => v === dir[k]));  // the cube: its face
  if (g.floors) {  // the cube with pits: its pit's floor
    const a = g.floorSize, m = a >> 1;
    for (const [x, y, v] of cells) {
      const r = m + y - (h >> 1), c = m + x - (w >> 1);
      if (r >= 0 && c >= 0 && r < a && c < a) out.push([g.floors[f * a * a + r * a + c], v]);
    }
    return out;
  }
  const m = g.size >> 1;
  for (const [x, y, v] of cells) {
    const r = m + y - (h >> 1), c = m + x - (w >> 1);
    if (r >= 0 && c >= 0 && r < g.size && c < g.size) out.push([f * g.perFace + r * g.size + c, v]);
  }
  return out;
}
// Famous on a sheet (a torus of hexagons, triangles or Cairo pentagons, a Möbius strip, a Klein bottle): the
// pattern's cells from the plane's geometry brought to the sheet's units (hexagons: the plane's pointy ones
// turned by 30°, as the sheets' flat ones), laid with the one nearest their middle on a tile near the spot
// and every other one on a tile too (a tiling's cells of several kinds: the first tile that fits them all)
function sheetUnits(g, kind) {  // a point of the plane (its world units) in the sheet's
  if (kind === 'square') return (p) => p;
  if (kind === 'cairo') return ([x, y]) => [x / CAIRO, y / CAIRO];
  if (g.shear) { const [su, sv] = g.shear, plain = sheetUnits({ ...g, shear: null }, kind); return (p) => { const [a, b] = plain(p), [u, v] = g.swap ? [b, a] : [a, b]; return [u - (su * v) / g.nv, v - (sv * u) / g.nu]; }; }  // (a rhombus: as its sheet, see rhombHexTorusMesh)
  if (kind === 'tri') return g.mobius ? (p) => p : ([x, y]) => [x, y / ROOT3_2];  // (a Möbius strip's sheet: edges of 1)
  const c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6), r3 = Math.sqrt(3);
  return ([x, y]) => { const X = r3 * (x * c - y * sn), Y = r3 * (x * sn + y * c); return g.mobius ? [X, Y] : [X / 1.5, Y / r3]; };
}
// a tile's place on the sheet (a Möbius strip: on its two sides as one strip, see mobiusLoop), and the
// tile at a place, across the seams (a Klein bottle's turning over)
const sheetPlace = (g, t) => (g.mobius ? mobiusLoop(g, t) : sheetMiddle(g, t));
function sheetIndex(g) {
  if (g.famousIndex) return g.famousIndex;
  const key = ([u, v]) => {
    if (g.mobius) u = ((u % (2 * g.L)) + 2 * g.L) % (2 * g.L);
    else {
      const k = Math.floor(u / g.nu);
      u -= k * g.nu;
      if (g.klein && k % 2) v = g.nv - v;
      v = ((v % g.nv) + g.nv) % g.nv;
    }
    const r = (x, n) => { const q = Math.round(x * 1000); return n && q === Math.round(n * 1000) ? 0 : q; };
    return `${r(u, g.mobius ? 2 * g.L : g.nu)},${r(v, g.mobius ? 0 : g.nv)}`;
  };
  const at = new Map();
  for (let t = 0; t < g.n; t++) at.set(key(sheetPlace(g, t)), t);
  return (g.famousIndex = { key, at });
}
// colour i's spot: the middle (one colour), else the middle of its block (a torus, a Klein bottle) or of its
// stretch (a Möbius strip), as the zones' (see huntParts)
function famousSpot(i, K) {
  const g = walk.geo;
  if (K === 1) return centreCells()[0];
  if (g.mobius) return mobiusNearest(mobiusMiddle(g) - g.L / 2 + ((i + 0.5) * 2 * g.L) / K, g.W / 2)[0];  // (as huntParts)
  const [a, b] = torusBlocks(K);
  return sheetNearest(((Math.floor(i / b) + 0.5) * g.nu) / a, (((i % b) + 0.5) * g.nv) / b)[0];
}
function sheetPatternAt(spot, cells) {
  const g = walk.geo, kind = patternKind(), unitsOf = sheetUnits(g, kind), { key, at } = sheetIndex(g);
  const pts = cells.map(([x, y]) => unitsOf(cellMiddle(kind, x, y)));
  const mid = [0, 1].map((d) => pts.reduce((sum, p) => sum + p[d], 0) / pts.length);
  const anchor = pts.reduce((best, p) => (Math.hypot(p[0] - mid[0], p[1] - mid[1]) < Math.hypot(best[0] - mid[0], best[1] - mid[1]) ? p : best));
  for (const T of lifePatch(2, [spot])) {  // the spot, then the tiles round it
    const [tu, tv] = sheetPlace(g, T), out = [];
    for (let k = 0; k < pts.length; k++) {
      const t = at.get(key([pts[k][0] - anchor[0] + tu, pts[k][1] - anchor[1] + tv]));
      if (t === undefined) break;
      out.push([t, cells[k][2]]);
    }
    if (out.length === pts.length) return out;
  }
  return [];
}
// each colour's choices: the rule's patterns (a rule of your own: all its grid's) that fit its block,
// every way they turn and mirror (the same shape once), at its spot, as [cell, state…] in its colour
function patternChoices() {
  const L = walk.life, g = walk.geo, K = L.colours, kind = patternKind(), rule = L.ruleText, [cols, rows] = COLOUR_GRID[K];
  const mine = ![...$('lifePreset').options].some((o) => o.dataset.name && o.value === rule);
  const room = walk.plane ? Math.min(walk.plane.W / cols, walk.plane.W / rows) : g.mobius ? Math.min((2 * g.L) / K, g.nv)  // (a Möbius strip: a stretch of its loop)
    : g.torus ? Math.min(g.nu / torusBlocks(K)[0], g.nv / torusBlocks(K)[1])
    : g.floors ? g.floorSize : g.sides === 3 || g.kite ? g.size / 2 : g.size;
  const shapes = [], seen = new Set(), per = PER_RHOMBUS[kind] ?? 1;
  for (const p of DRAW_PATTERNS.filter((q) => q[1] === kind && (mine || q[2].includes(rule)))) {
    for (let t = 0; t < PATTERN_TURNS[kind]; t++) for (const f of [false, true]) {
      const cells = orientPattern(kind, p[4], t, f), k = cells.map((c) => c.join(',')).sort().join(' ');
      const span = Math.max(...cells.map((c) => Math.floor(c[0] / per)), ...cells.map((c) => c[1])) + 1;
      if (span <= room - 2 && !seen.has(k)) { seen.add(k); shapes.push(cells); }
    }
  }
  // a shape kept where it lays whole for every colour (a sheet's: see sheetPatternAt)
  const laid = shapes.map((cells) => Array.from({ length: K }, (_, i) => patternAt(i, K, cells))).filter((per) => per.every((cs) => cs.length));
  return Array.from({ length: K }, (_, i) => laid.map((per) => Int32Array.from(per[i].flatMap(([t, v]) => [t, K > 1 ? i + 1 + K * (v - 1) : v]))));
}

/* ---- 9.2 Patches ----------------------------------------------------------------------------- */
// The cell where small starts go: the middle of the unrolled torus, of the cube face in front,
// else the tile that faces the default camera
function patchCentre() {
  if (walk.plane) { const { W, row } = walk.plane; return (W >> 1) * row + (row >> 1); }  // the plane: its middle cell
  const g = walk.geo, mid = (k) => Math.floor((k - 1) / 2);
  if (g.mobius || g.cairo || (g.torus && (g.kite || g.sides === 3))) return centreCells()[0];
  if (g.torus) return mid(g.nu) * g.nv + mid(g.nv);
  if (g.sides === 4 && g.perFace && !g.kite) return 3 * g.perFace + mid(g.size) * g.size + mid(g.size);  // the cube (not the one with pits)
  if (g.floors) { const a = g.floorSize; return g.floors[3 * a * a + (a >> 1) * a + (a >> 1)]; }  // the cube with pits: the front pit's floor
  const dir = CAM0.v;
  let best = 0, bestDot = -Infinity;
  for (let t = 0; t < g.n; t++) {
    const c = g.cen.subarray(3 * t, 3 * t + 3), dot = (c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2]) / Math.hypot(...c);
    if (dot > bestDot && !g.walls?.includes(t)) { bestDot = dot; best = t; }
  }
  return best;
}

// A tile's middle on the sheet of a torus or a Möbius strip (on a torus, within it), and the tiles (up to
// upto) nearest the point (u, v), all as near (on a torus, the shortest way round)
function sheetMiddle(g, t) {
  const k = g.sides;
  let u = 0, v = 0;
  for (let q = 0; q < k; q++) { u += g.uv[2 * (k * t + q)] / k; v += g.uv[2 * (k * t + q) + 1] / k; }
  return g.mobius ? [u, v] : [((u % g.nu) + g.nu) % g.nu, ((v % g.nv) + g.nv) % g.nv];
}
// A Möbius strip's two faces as one strip twice as long, 2L, whose ends meet as they are (no turning over):
// a tile's place on it, along (s) and across (y); the back's tiles after the front's, turned over
function mobiusLoop(g, t) {
  const [a, b] = sheetMiddle(g, t % g.front);
  return t < g.front ? [a, b] : [g.L + a, g.W - b];
}
// the tiles nearest the point (s, y) of that loop, all as near (round it the shortest way)
function mobiusNearest(s, y) {
  const g = walk.geo, far = new Float64Array(g.n), round = (d) => d - 2 * g.L * Math.round(d / (2 * g.L));
  for (let t = 0; t < g.n; t++) { const [a, b] = mobiusLoop(g, t); far[t] = Math.hypot(round(a - s), b - y); }
  const best = far.reduce((m, d) => Math.min(m, d), Infinity);
  return [...far.keys()].filter((t) => far[t] < best + 1e-9);
}
// the middle of the face the starting view shows, on that loop: the front's middle, or the back's
function mobiusMiddle(g) {
  let t = 0, best = Infinity;
  for (let q = 0; q < g.front; q++) { const [a, b] = sheetMiddle(g, q), d = Math.hypot(a - g.L / 2, b - g.W / 2); if (d < best) { best = d; t = q; } }
  return dot3(Array.from(g.nrm.subarray(3 * t, 3 * t + 3)), CAM0.v) * shapeSign(g) >= 0 ? g.L / 2 : (3 * g.L) / 2;
}
function sheetNearest(u, v, upto = walk.geo.n) {
  const g = walk.geo, far = new Float64Array(upto), round = (d, n) => (g.mobius ? d : d - n * Math.round(d / n));
  for (let t = 0; t < upto; t++) { const [a, b] = sheetMiddle(g, t); far[t] = Math.hypot(round(a - u, g.nu), round(b - v, g.nv)); }
  const best = far.reduce((m, d) => Math.min(m, d), Infinity);
  return [...far.keys()].filter((t) => far[t] < best + 1e-9);
}
// The cells at the middle: one, or the ones round it all as near when it is a corner (an even side:
// 2 × 2 squares); on a solid, the open cells nearest a direction (the front, else a colour's spot)
function centreCells(d) {
  const g = walk.geo, four = (u, v, nv) => [u - 1, u].flatMap((i) => [i * nv + v - 1, i * nv + v]);
  if (walk.plane) { const { W, row, kind } = walk.plane; return kind === 'square' && W % 2 === 0 && row % 2 === 0 ? four(W / 2, row / 2, row) : [patchCentre()]; }
  if (g.mobius) return mobiusNearest(mobiusMiddle(g), g.W / 2);  // the middle of the face in view
  if (g.cairo || (g.torus && (g.kite || g.sides === 3))) return sheetNearest(g.nu / 2, g.nv / 2);
  if (g.torus) return g.nu % 2 === 0 && g.nv % 2 === 0 ? four(g.nu / 2, g.nv / 2, g.nv) : [patchCentre()];
  if (!d && g.faces) {  // a solid of triangles: the middle of the face in front (a dodecahedron's pentagon)
    const per = facesPer(), f0 = Math.floor(Math.floor(patchCentre() / g.perFace) / per) * per;
    d = [0, 1, 2].map((a) => g.faces.slice(f0, f0 + per).reduce((sum, fc) => sum + fc.corners.reduce((s, c) => s + c[a], 0), 0));
  }
  if (!d && !(g.sides === 4 && !g.kite && (g.perFace || g.floors))) return [patchCentre()];
  d = unit(d ?? AXES[3]);  // the cube's front face
  // (each direction once a grid: a hunt asks for the same few, at every radius; plain numbers, as it runs over every cell)
  const key = d.join(), known = (g.centres ??= new Map()).get(key);
  if (known) return known;
  const near = new Float64Array(g.n).fill(-Infinity), { start } = walk.life.nbr, c = g.cen;
  for (let t = 0; t < g.n; t++) {
    if (start[t] === start[t + 1]) continue;
    const x = c[3 * t], y = c[3 * t + 1], z = c[3 * t + 2];
    near[t] = (x * d[0] + y * d[1] + z * d[2]) / (Math.hypot(x, y, z) || 1);
  }
  const best = near.reduce((m, v) => Math.max(m, v), -Infinity), found = [...near.keys()].filter((t) => near[t] > best - 1e-9);
  g.centres.set(key, found);
  return found;
}
// The cells at most r Life-neighbour steps from the centre cell (r = 1, 2, 3: a 3×3, 5×5 or 7×7
// square on square grids, a small disc of triangles on the polyhedra), or r − 1 steps from the cells
// round a middle corner (on an even side: 2×2, 4×4, 6×6)
function lifePatch(r, centre = centreCells()) {
  const { start, list } = walk.life.nbr, seen = new Set([centre].flat());
  let ring = [...seen];
  for (let k = seen.size > 1 ? 1 : 0; k < r; k++) {
    const next = [];
    for (const t of ring) for (let q = start[t]; q < start[t + 1]; q++) if (!seen.has(list[q])) { seen.add(list[q]); next.push(list[q]); }
    ring = next;
  }
  return [...seen];
}


/* ---- 9.3 Loading a start --------------------------------------------------------------------- */
// Replace the starting pattern of the current Life run and go back to generation 0. how: where it
// comes from, for the description — { radius, cells } (a zone filled with the number's first
// digits), 'hunt', 'duel' or 'saved' (a link or a saved setup). The link keeps the cells.
function setLifeSeed(seed, how) {
  const L = walk.life;
  cleared = null;  // another start: no Undo
  L.seed.set(seed);
  for (const t of walk.geo.walls ?? []) L.seed[t] = 0;
  countSeed(L);
  championCode = encodeCells(L.seed, walk.base);  // in its shortest form
  lifeStart = how;
  describe(walk.base, Infinity);
  restart();
  autoplay();
  syncLink();
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
let pendingRestore = null;   // the view to restore once the setup in use is built again (see galleryView)
let pendingSpin = false;     // a Gallery setup shown: Auto-rotate once built and faced (see showSetup)
// A Gallery setup is shown still and faced for SPIN_DELAY ms, then starts turning, its speed easing
// in over SPIN_EASE ms (see tick)
const SPIN_DELAY = 900, SPIN_EASE = 1200;
let spinFrom = 0, spinRamp = 0;

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
  if (squareSheet && SQUARE_SHEET[mode.sphere]) s.q = 1;  // a square sheet
  else if (torusTurned && TURNED[mode.sphere]) s.o = 1;
  if (!$('fillAreas').checked) s.fa = 0;
  if (mode.life) s.r = ruleBody($('lifeRule').value);
  if (mode.life && lifeColours > 1) s.k = lifeColours;
  if (mode.plane) {  // the grid's side, dead edges (e=1), its start ("random.30.7", "pattern.acorn", "draw" with p=, "digits"), its symmetry (y=)
    s.s = plane.side;
    if (!plane.torus) s.e = 1;
    s.sd = plane.start === 'random' ? `random.${plane.density}.${plane.seed}` : plane.start;
    if (symmetryOf(mode.plane) !== 'none') s.y = symmetryOf(mode.plane);
    if (plane.start === 'draw' && population.size) s.p = populationRle(population);
  }
  if (mode.life && !mode.plane) s.sd = plane.start === 'digits' ? 'digits' : `random.${plane.density}.${plane.seed}`;  // a surface's start
  if (mode.antOf) s.r = antByDigits ? `digits ${antDigitRules[w]}`.trim() : antRules[w];  // "digits LNR"; "digits" alone: left, right
  if (w === 'antSquare' && population.size) s.p = populationRle(population);
  if (championCode) s.ch = championCode;
  return s;
}

function applySetup(s) {
  const set = (id, v) => { if (v !== undefined && v !== null) $(id).value = v; };
  if (typeof s.x !== 'string' || !MODES[s.w]) return false;
  $('formula').value = s.x;
  if (readFormula().error) return false;
  digitsBeforeLoop = null;  // a setup says its own count of digits
  set('digits', s.d);
  set('mode', s.w);
  $('startNo').value = s.st ?? 1;
  torusTurned = Number(s.o) === 1;
  squareSheet = Number(s.q) === 1 || (torusTurned && MODES[s.w].sphere === 'torus');  // (o=1 on squares, before: their square sheet)
  if (MODES[s.w].sphere) {
    const kind = surfaceOf(MODES[s.w]);
    fillSphereSizes(kind, MODES[s.w].initial);
    if (s.s !== undefined) selectSize(kind, linkSize(kind, s.s));
  }
  if (s.r && MODES[s.w].antOf) {
    antByDigits = s.r.startsWith('digits');
    population = populationOf(s.p);
    const rule = s.r.slice(6).trim();
    if (antByDigits) antDigitRules[s.w] = antDigitTurnsOf(s.w, rule) ? rule.toUpperCase() : ANTS[s.w].digitPresets[0];
    else if (antTurnsOf(s.w, s.r)) antRules[s.w] = s.r;
  } else if (s.r) {
    if (MODES[s.w].plane) planeFromSetup(s);
    else {  // a surface's start: a soup, or its digits (an old link's, with no sd)
      const [kind, a, b] = String(s.sd ?? 'digits').split('.');
      plane.start = kind === 'random' ? 'random' : 'digits';
      if (kind === 'random') { plane.density = Math.min(70, Math.max(5, Number(a) || 30)); plane.seed = Number(b) || 1; hunt.zone = 'full'; }
    }
    ruleFittedTo = s.w;  // a link's rule as it is
    lifeColours = Number(s.k) || parseRule(s.r)?.colours || 1;  // k=, or an old link's "/Immigration"
    setRuleText(ruleBody(s.r));
  }
  // the display is not part of a setup: it takes the defaults of the walk mode's tab, when the tab
  // changes (as picking a walk does); within a tab, what was chosen stays
  if (modeTabOf() !== displayTab) displayDefaults();
  $('fillAreas').checked = String(s.fa ?? 1) !== '0';  // the one display choice kept: it changes what is drawn
  $('perspective').checked = perspectiveFor(MODES[s.w], MODES[s.w].round ? 1 : 0);
  Object.assign(cam, CAM0);
  pendingChampion = s.ch || null;
  compute();  // a champion follows once the walk is built
  return true;
}

// Called when a walk has just been built: restore a loaded setup's champion, or place the chosen
// hunt zone's start, then write the link
let huntBack = null;  // the hunt to bring back with a setup left in the Gallery (see viewNow)
function applyPendingView() {
  const ch = pendingChampion;
  pendingChampion = null;
  if (pendingSpin && walk.is3d && !pendingRestore) spinFrom = performance.now() + SPIN_DELAY;  // faced first (showAll), then turning
  pendingSpin = false;
  if (pendingRestore) {  // back from the Gallery without a click: the view as it was (see galleryView)
    const g = pendingRestore;
    pendingRestore = null;
    huntBack = g.hunt;
    $('autoFit').checked = g.autoFit;
    $('autoRotate').checked = g.autoRotate;
    Object.assign(cam, g.cam);
    if (walk.is3d) project();
    if (!walk.sphere) {  // the 2D bounds of the walk again (a surface's are the fixed solid, as in rotateView)
      const done = cur;
      cur = 0;
      bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      advanceTo(done);
    }
    Object.assign(view, g.view);
    viewGoal = null;
    faced = true;
    needsFull = true;
  }
  if (ch && walk.life) {  // a start from a link: Custom in the hunt's zones
    setLifeSeed(decodeCells(ch, walk.life.seed.length), 'saved');
    hunt.zone = 'custom';
    renderHunt();
  }
  if (huntBack && walk.life) {  // back from the Gallery: the hunt as it was (its zone, goal, results), last
    Object.assign(hunt, huntBack);
    hunt.listKey = null;
    renderHunt();
  }
  huntBack = null;
  syncLink();  // with the start a setup's champion or hunt zone gave
}

/* ---- 10.3 The page link ---------------------------------------------------------------------- */
// The page link always holds the current setup (#x=pi&w=turtle&…), for bookmarks and sharing.
// Readable links: #x=(1+sqrt(5))/2&w=turtle — formulas and rules keep / + ^ , : as they are
const toHash = (s) => Object.entries(s)
  .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%(2F|2B|5E|2C|3A|24)/g, (c) => decodeURIComponent(c))}`)
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
// The link is written when what it holds changes: a walk built (see buildWalk), Fill areas, a Life
// start (setLifeSeed), a Gallery setup kept by a click; not for one only shown on hover
function syncLink() {
  if (busy || pendingChampion || galleryBefore) return;  // not while a setup is still being built, nor shown on hover
  const h = `#${toHash(getSetup())}`;
  if (h !== location.hash) history.replaceState(null, '', h);
  syncSaveButton();
}

/* ---- 10.4 Saved setups and JSON files -------------------------------------------------------- */
// Saved setups in this browser (localStorage), as { name, setup, saved }
const SETUPS_KEY = 'walkingPi.setups', CURATED_KEY = 'walkingPi.curated';
function readSetups() {
  try { return JSON.parse(localStorage.getItem(SETUPS_KEY)) || []; } catch { return []; }
}
// The curated setups (BUILT_IN) come into Treasures once, on the first visit in this browser, and the ones
// added later (a batch number past the last one taken) once too: deleted afterwards, they stay deleted
function seedCurated() {
  try {
    const taken = Number(localStorage.getItem(CURATED_KEY)) || 0, last = Math.max(...BUILT_IN.map((b) => b[3] ?? 1));
    if (taken >= last) return;
    const list = readSetups(), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const [name, note, setup, batch = 1] of BUILT_IN) {
      if (batch <= taken || list.some((x) => same(x.setup, setup))) continue;
      let key = name;  // a name of its own (a row is deleted by its name)
      for (let k = 2; list.some((x) => x.name === key); k++) key = `${name} (${k})`;
      list.push({ name: key, note, setup, saved: new Date().toISOString() });
    }
    writeSetups(list);
    localStorage.setItem(CURATED_KEY, String(last));
  } catch { /* not kept: the next visit tries again */ }
}
function writeSetups(list) {
  try { localStorage.setItem(SETUPS_KEY, JSON.stringify(list)); return true; } catch { return false; }
}
// What tells a saved setup apart: its walk, then its surface's size, start, turn and rule
// a setup's row: 2D, 3D or Space, the walk, size, start, turn and rule (Life's rule is its title)
const setupDetail = (s) => [SPACE_NAMES[NAV[s.w]?.[1]], walkName(s.w), s.s && `size ${String(s.s).replace('x', ' × ')}`, s.st > 1 && `start ${s.st}`,
  Number(s.o) === 1 && 'turned 30°', Number(s.q) === 1 && 'square sheet', s.r && !MODES[s.w]?.life && `rule ${s.r}`].filter(Boolean).join(' · ');
// its title: a walk's number; a Game of Life's rule (its name) and colours, its number being only its start
const setupTitle = (x) => {
  if (!MODES[x.setup.w]?.life) return x.name;
  const r = String(x.setup.r ?? ''), named = [...$('lifePreset').options].find((o) => o.dataset.name && o.value === r)?.dataset.name;
  return [named ? `${named} ${r}` : r || 'Life', Number(x.setup.k) > 1 && `${x.setup.k} colours`].filter(Boolean).join(' · ');
};
// Your setups, as rows like the built-in ones (see setupRow), each with × to delete it
function fillSetupList() {
  const list = readSetups();
  // in groups as the tabs, Life, Ant, Walk, each under its name; by their titles, two rows alike numbered (2), (3)…
  const rows = list.filter((x) => NAV[x.setup.w]).map((x) => [setupTitle(x), [x.note, setupDetail(x.setup)].filter(Boolean).join(' · '), x]), seen = new Map();
  const kindOf = (x) => NAV[x.setup.w][0];
  $('yourList').replaceChildren(...NAV_KINDS.flatMap(([kind]) => {
    const mine = rows.filter(([, , x]) => kindOf(x) === kind).sort((a, b) => a[0].localeCompare(b[0]));
    if (!mine.length) return [];
    const head = document.createElement('h2');
    head.className = 'gallery-group';  // a section each, its picture as the tab's
    head.innerHTML = icon(NAV_KINDS.find(([k]) => k === kind)[1]) + kind;
    return [head, ...mine.map(([title, detail, x]) => {
      const k = (seen.get(title + detail) ?? 0) + 1;
      seen.set(title + detail, k);
      return setupRow(k > 1 ? `${title} (${k})` : title, detail, x.setup, () => deleteSetup(x.name));
    })];
  }));
  syncSaveButton();
}

// Saved under its number's name, with no question (the same setup twice is saved once; another one of
// the same number gets "(2)", "(3)", …); its row tells the walk, size, start and rule (see setupDetail)
// the saved setup that is the one in view (same number, walk, size, start, turn and rule), if any
const savedInView = () => readSetups().find((x) => isInUse(x.setup) && String(x.setup.r ?? '') === String(getSetup().r ?? ''));
// ☆ Save, or ★ (in yellow) while the setup in view is one of Treasures
function syncSaveButton() {
  const saved = savedInView(), b = $('setupSave');
  b.classList.toggle('saved', !!saved);
  b.title = saved ? `Saved in Treasures as “${saved.name}”` : 'Save the setup in view in Treasures, in this browser';
}
function saveSetup() {
  const setup = getSetup(), list = readSetups();
  const same = savedInView();
  if (same) return;  // already one of them (its ☆ is yellow)
  let name = shownSym;
  for (let k = 2; list.some((x) => x.name === name); k++) name = `${shownSym} (${k})`;
  list.push({ name, setup, saved: new Date().toISOString() });
  list.sort((a, b) => a.name.localeCompare(b.name));
  if (!writeSetups(list)) alert('This browser does not allow saving (private window?).');
  fillSetupList();
}

function deleteSetup(name) {
  writeSetups(readSetups().filter((x) => x.name !== name));
  fillSetupList();
}

function exportSetups() {
  const list = readSetups();
  if (!list.length) return;  // nothing to export yet
  const blob = new Blob([JSON.stringify({ app: 'Walking Pi', version: 1, setups: list }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'walking-pi-setups.json';
  a.click();
  URL.revokeObjectURL(a.href);
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
  } catch {
    alert('This file is not a Walking Pi setups file.');
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
// The speed, in steps per second: typed (1 to 5,000,000), or the turtle and the rabbit step through
// SPEEDS (60 by default; at 12 or less the next step's chip lights, as step by step): divisors and
// multiples of 60, so that a screen at 60 or 120 frames a second shows as many steps at every frame
// (50 a second at 60 Hz: one frame in 6 without a step, a stutter)
const SPEEDS = [6, 12, 60, 120, 600, 1200, 6000, 12000, 60000, 120000, 600000, 1200000, 6000000];
let speed = 60;
const stepsPerSecond = () => speed;
function updateSpeedLabel() {
  if (document.activeElement !== $('speedLabel')) $('speedLabel').value = `${fmt(speed)} steps/s`;
  $('slower').disabled = speed <= 1;
  $('faster').disabled = speed >= SPEEDS.at(-1);
}
function setSpeed(s) {
  speed = Math.min(SPEEDS.at(-1), Math.max(1, Math.round(s)));
  updateSpeedLabel();
  statsDirty = true;
}

function advanceTo(target) {
  target = Math.min(walk.n, target);
  if (target !== cur) faced = false;  // the walker moves: the camera follows it again (see faceWalk)
  if (walk.life) {  // Game of Life: one step = one generation
    const L = walk.life;
    for (let k = target - cur; k > 0 && !lifeEnded(); k--) {
      lifeStep();
      cur++;
      const s = L.stable;
      if (!s) continue;
      if (s.extinct || s.P === 1) { cur = s.T; play(false); break; }  // nothing moves any more: it ends there
      if (L.loopBase && !L.loopAvg) {  // the first round: each colour's live cells, for their mean over the loop
        for (let k = 1; k <= L.colours; k++) {
          const v = L.colours === 1 ? L.aliveCount : L.byColour[k];
          L.loopSum[k] += v;
          L.loopMin[k] = Math.min(L.loopMin[k], v);
          L.loopMax[k] = Math.max(L.loopMax[k], v);
        }
        if (++L.loopN === s.P) L.loopAvg = Array.from(L.loopSum, (v) => v / s.P);
      }
      if (cur >= s.T + s.P) {  // a loop: round it again from T (its state there the same), the counter too
        cur -= s.P;  // (a trail goes on fading: its time is L.gen's)
        if (!L.loopBase) L.loopBase = { born: L.born, dead: L.dead, bornBy: L.bornBy.slice(), deadBy: L.deadBy.slice() };  // births and deaths round with it
        else { L.born = L.loopBase.born; L.dead = L.loopBase.dead; L.bornBy.set(L.loopBase.bornBy); L.deadBy.set(L.loopBase.deadBy); }
      }
    }
    statsDirty = true;
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

// a Game of Life that died out or froze: shown at the generation it ended
const lifeEnded = () => { const s = walk.life?.stable; return !!s && (s.extinct || s.P === 1) && cur === s.T; };
function play(on) {
  playing = on && walk.n > 0 && cur < walk.n && !lifeEnded();
  $('play').innerHTML = playing ? `${icon('pause')} Pause` : `${icon('play')} Play`;
  $('play').classList.toggle('on', playing);
}

// A new walk is shown complete at once; Play replays it from the start
function showAll() {
  if (walk.life) return;  // the Game of Life starts at generation 0 instead
  advanceTo(walk.n);
  faceWalk();
  if ($('autoFit').checked && !choosingStart) fitWhole();  // framed like F or a double-click, without the margin kept for growing
}

// 3D walks: framed by the sphere round the walk's box (its centre, half its diagonal; in perspective,
// its outline from the camera, D/√(D² − r²) times wider), as a surface is by its solid: the same
// whichever way the walk turns, so turning it never zooms
function includeBox() {
  if (!walk.is3d || walk.sphere) return;
  const [x0, x1, y0, y1, z0, z1] = bounds3, [cx, cy] = projectPoint((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const c = MODES[current.mode].cells ? 2 * cellShape().half : 0;  // the cells of a walk on cells, past their centres
  const r = Math.hypot(x1 - x0 + c, y1 - y0 + c, z1 - z0 + c) / 2, P = walk.persp, R = P && P.D > r ? (r * P.D) / Math.sqrt(P.D * P.D - r * r) : r;
  bounds = { minX: cx - R, maxX: cx + R, minY: cy - R, maxY: cy + R };
}

// Frame everything drawn so far
function fitWhole() {
  includeBox();
  fitToBounds(padBounds(bounds));
}

// Life: a run plays as soon as it is set up (Autoplay, off at first), unless cells are being drawn
const autoplay = () => { if (walk.life && !drawing && $('autoPlay').checked) play(true); };
function restart() {
  faced = false;
  cur = 0;
  drawn = 0;
  acc = 0;
  bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  bounds3 = [0, 0, 0, 0, 0, 0];
  if (walk.sphere) {  // the frame is the whole sphere, centred on the origin
    const R = walk.R;
    bounds = surfaceBounds();  // the current form, flat or round
    bounds3 = [-R, R, -R, R, -R, R];
    walk.visits.fill(0);
    walk.maxVisits = 1;
    if (!walk.stepTiles) walk.visits[walk.tile[0]] = 1;  // a tile walk starts on its first tile
    if (walk.life) lifeReset();
  } else if (walk.plane) {  // the frame is the grid
    bounds = planeBounds();
    lifeReset();
  }
  if ($('autoFit').checked) fitToBounds(walk.sphere || walk.plane ? padBounds(bounds) : { minX: -3, maxX: 3, minY: -3, maxY: 3 });
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
  const tight = walk.is3d;  // a surface or a 3D walk: the sphere round it touches the sides, at most (see surfaceBounds, includeBox)
  const w = b.maxX - b.minX + (tight ? 0 : 2);
  const h = b.maxY - b.minY + (tight ? 0 : 2);
  // down to 10⁻⁶ pixel per cell: a walk of 10 million steps can drift millions of cells away
  const fixed = walk.sphere || walk.plane;  // a surface or a grid fills the view at any size; a walk starts no closer than 40 px a cell
  const scale = Math.min(fixed ? Infinity : 40, Math.max(MIN_SCALE, Math.min(cw / w, ch / h) * (tight ? 0.99 : 0.925)));  // else a 7.5 % margin
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

// Does the walk go past the edges of view v (the current view, or where auto-fit is heading)? Within
// 16 px of them in 2D, less in a small view, where a fit leaves 3.75 % (see viewFor); a 3D walk's frame
// (a sphere, see includeBox) touches them on purpose: past them
function boundsOffscreen(v = view) {
  const m = walk.is3d ? -1 : Math.min(16, 0.03 * Math.min(cw, ch)), ox = v.ox ?? cw / 2 - v.cx * v.scale, oy = v.oy ?? ch / 2 - v.cy * v.scale;
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
  glCanvas.width = Math.round(cw * dpr);
  glCanvas.height = Math.round(ch * dpr);
  if (first || $('autoFit').checked) fitToBounds(padBounds(bounds));
  needsFull = true;
}

// a walk's frame takes in the origin's neighbourhood; a grid or a surface is framed as it is (else a grid, from 0, sits off centre)
function padBounds(b) {
  if (walk.plane || walk.sphere) return b;
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
  stage.classList.toggle('on-sky', darkSky());  // light text over a dark sky, whatever the theme
  if (!$('showGrid').checked) return;
  const s = view.scale;
  let stepCells = 1;
  while (s * stepCells < 10) stepCells *= 5;
  // faint lines: white over a dark sky, dark over a light one, else the page's grid colour
  ctx.strokeStyle = darkSky() ? 'rgba(255,255,255,0.06)' : skyStops() ? 'rgba(0, 0, 0, 0.08)' : getComputedStyle(document.documentElement).getPropertyValue('--grid');
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (walk.is3d) {
    draw3DFrame(ctx);
    return;
  }
  // The lines bound the cells whose centres the walk joins; along lines, they go through the
  // walk's points, which are the corners of the grid drawn (see MODES)
  const r3 = Math.sqrt(3), lat = walk.lattice;
  if (lat === 'square') {  // the cell centres at whole coordinates, their sides half a cell away
    const at = walk.lines ? 0 : 0.5;
    drawLines(ctx, 1, 0, at, stepCells);
    drawLines(ctx, 0, 1, at, stepCells);
  } else if (lat === 'tri' && !walk.lines) {  // y = y0 + k·H and x ± (y − y0)/√3 = k
    drawLines(ctx, 0, 1, TRI_Y0, H * stepCells);
    drawLines(ctx, 1, 1 / r3, TRI_Y0 / r3, stepCells);
    drawLines(ctx, 1, -1 / r3, -TRI_Y0 / r3, stepCells);
  } else if (lat === 'hex' && walk.lines) {  // through the hexagon centres (b·H, −a − b/2): x = k·H and y ± x/√3 = k
    drawLines(ctx, 1, 0, 0, H * stepCells);
    drawLines(ctx, 1 / r3, 1, 0, stepCells);
    drawLines(ctx, -1 / r3, 1, 0, stepCells);
  } else if (lat === 'cairo') drawCairoGrid(ctx);
  else drawHexGrid(ctx, walk.lines);
  ctx.stroke();
}

// The lines a·x + b·y = c0 + k·step across the view (world coordinates), level ones on whole pixels
function drawLines(ctx, a, b, c0, step) {
  const { scale: s, ox, oy } = view, xL = -ox / s, xR = (cw - ox) / s, yT = -oy / s, yB = (ch - oy) / s;
  const ends = [a * xL + b * yT, a * xL + b * yB, a * xR + b * yT, a * xR + b * yB];
  const crisp = (v) => (a && b ? v : Math.round(v) + 0.5);
  for (let k = Math.ceil((Math.min(...ends) - c0) / step); c0 + k * step <= Math.max(...ends); k++) {
    const c = c0 + k * step;
    const [p, q] = Math.abs(b) > Math.abs(a)
      ? [[0, oy + ((c - a * xL) / b) * s], [cw, oy + ((c - a * xR) / b) * s]]
      : [[ox + ((c - b * yT) / a) * s, 0], [ox + ((c - b * yB) / a) * s, ch]];
    ctx.moveTo(crisp(p[0]), crisp(p[1]));
    ctx.lineTo(crisp(q[0]), crisp(q[1]));
  }
}

// 3D background: a vertical sky gradient behind the scene, in the page's tone (Dawn on a light page,
// Twilight on a dark one), or Plain (the page background)
const SKIES = {
  dark:  [[0, '#0a1530'], [0.45, '#1c2852'], [0.75, '#433262'], [0.92, '#7a4a5e'], [1, '#9c5f52']],  // twilight
  light: [[0, '#b9d0ea'], [0.5, '#dfe3f1'], [0.8, '#f2dde2'], [1, '#f8d2bd']],                          // dawn
};
const skyStops = () => ((walk.is3d || walk.plane) && $('sky').value === 'sky' ? SKIES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'] : null);
const darkSky = () => skyStops() === SKIES.dark;
function drawSky(ctx) {
  const stops = skyStops();
  if (!stops) return;  // plain: the page background shows through
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

// Hexagons of radius 1/√3, each drawing its 3 top edges (the others belong to the neighbours below):
// flat-topped around the hexagon cells' centres (b·H, −a − b/2, see hexStepper), or pointy-topped
// around the corners of the triangle cells (c/2, y0 + r·H with c + r even, see triStepper), the
// hexagons whose corners are the triangles' centres. Hidden when too small.
// The Cairo pentagons in view, each edge twice (the pentagons on both sides)
function drawCairoGrid(ctx) {
  const { scale: s, ox, oy } = view;
  if (s * CAIRO < 8) return;
  const X = (u) => ox + (u - CAIRO_0[0]) * CAIRO * s, Y = (v) => oy + (v - CAIRO_0[1]) * CAIRO * s;
  const [u0, v0] = [-ox / s / CAIRO + CAIRO_0[0], -oy / s / CAIRO + CAIRO_0[1]];
  for (let i = Math.floor(u0) - 1; i <= Math.ceil(u0 + cw / s / CAIRO) + 1; i++) {
    for (let j = Math.floor(v0) - 1; j <= Math.ceil(v0 + ch / s / CAIRO) + 1; j++) {
      for (const o of [0, 1]) {
        const c = cairoCorners(i, j, o);
        ctx.moveTo(X(c[4][0]), Y(c[4][1]));
        for (const [u, v] of c) ctx.lineTo(X(u), Y(v));
      }
    }
  }
}

function drawHexGrid(ctx, pointy) {
  const { scale: s, ox, oy } = view;
  const R = s / Math.sqrt(3);
  if (R < 5) return;
  const xL = -ox / s, xR = (cw - ox) / s, yTop = -oy / s, yBot = (ch - oy) / s;
  const v = [0, 1, 2, 3].map((k) => { const t = ((k + (pointy ? 0.5 : 0)) * Math.PI) / 3; return [R * Math.cos(t), -R * Math.sin(t)]; });
  const hexagon = (x, y) => {
    ctx.moveTo(ox + x * s + v[0][0], oy + y * s + v[0][1]);
    for (let k = 1; k < 4; k++) ctx.lineTo(ox + x * s + v[k][0], oy + y * s + v[k][1]);
  };
  if (pointy) {
    for (let r = Math.floor((yTop - TRI_Y0) / H) - 1; r <= Math.ceil((yBot - TRI_Y0) / H) + 1; r++) {
      for (let c = Math.floor(2 * xL) - 2; c <= Math.ceil(2 * xR) + 2; c++) if (((c + r) & 1) === 0) hexagon(c / 2, TRI_Y0 + r * H);
    }
  } else {
    for (let b = Math.floor(xL / H) - 1; b <= Math.ceil(xR / H) + 1; b++) {
      for (let a = Math.floor(-yBot - b / 2) - 1; a <= Math.ceil(-yTop - b / 2) + 1; a++) hexagon(b * H, -a - b / 2);
    }
  }
}

function styleKey(i) {
  switch ($('colorMode').value) {
    case 'digit': return walk.keys[i];
    default: return Math.floor((roundStep(i) * BANDS) / rainbowLength());
  }
}

// An ant's cells by their state: a ramp from pale to deep in the order of its colours (the cells it
// never walked are the background), per theme: Ink (Langton's black on white, softened), Amber.
// On a dark page the ramp goes the other way, from dark to bright. With Directions (antRamp null): by
// the turn each one took, in the walk's colours (left blue as the turtle's, right red)
const ANT_RAMPS = {
  ink: { light: ['#e7e0d0', '#b9ae98', '#6f6a60', '#2b2f3a'], dark: ['#3a4150', '#6b7486', '#a9b0bd', '#e8e2d4'] },
  amber: { light: ['#f7e6bd', '#f0c35a', '#c98a10', '#8a5200'], dark: ['#4a3a1a', '#8a6418', '#c98f1f', '#f0b429'] },
};
let antRamp = 'ink';
// state k of n along the ramp (Ink when Directions is on: an ant's rule chips are its states)
function rampColour(k, n) {
  const stops = ANT_RAMPS[antRamp ?? 'ink'][document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
  const t = n < 2 ? 0 : (Math.min(k, n - 1) * (stops.length - 1)) / (n - 1), a = Math.floor(t), f = t - a;
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), A = hex(stops[a]), B = hex(stops[Math.min(a + 1, stops.length - 1)]);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(', ')})`;
}
// a turn by its family, the same on every tiling (an ant's, a walk's relative to its heading): left blue,
// right pink (a sharp one deeper), straight on gold (↖ ↗ on hexagons and triangles are a plain left or right)
const deeper = (c) => `rgb(${rgbOf(c).map((v) => Math.round(v * 0.62)).join(', ')})`;
const antTurnColour = (a) => ({ '↖': DIRECTION_COLOURS['←'], '↗': DIRECTION_COLOURS['→'], '↙': deeper(DIRECTION_COLOURS['←']), '↘': deeper(DIRECTION_COLOURS['→']) }[a]
  ?? DIRECTION_COLOURS[a] ?? GREY);
// an ant's chips: by the digits, its turns (left, right); by its rule, its states
const antChipColour = (k) => antByDigits ? antTurnColour(arrowsOf(current.mode)[ANTS[current.mode].turns[turnWords(antDigitRules[current.mode])[k]]])
  : rampColour(k, antColours(current.mode));
// a digit's colour: its direction's (an ant's: the turn it took, or its state), else in the digits' order
const digitColour = (k) => walk.ant ? (antRamp ? rampColour(k, walk.ant) : antTurnColour(arrowsOf(current.mode)[k]))
  : walk.skipZeros ? (k ? DIGIT_COLORS[0] : GREY)  // a spiral: 1 blue, drawn; 0 grey, moved without drawing
  : arrowsOf(current.mode)[k] ? (['Turtle', 'Pivot', 'Parity'].includes(NAV[current.mode]?.[3]) ? antTurnColour : (a) => DIRECTION_COLOURS[a])(arrowsOf(current.mode)[k])  // fixed directions: by the compass
  : walk.base <= DIGIT_COLORS.length ? DIGIT_COLORS[k] : `hsl(${(k * 360) / walk.base}, 80%, 62%)`;
function styleColor(k) {
  switch ($('colorMode').value) {
    case 'digit': return digitColour(k);
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
// A walk shown whole on a solid: the camera at once in front of the walk's middle (the mean of its
// points' directions; its end where they cancel out), with no turn to watch; it follows the walker
// again (followWalker) as soon as the walker moves: playing, a step, the progress slider
let faced = false;
// The middle of a walk on a solid: the mean of its points' directions (its end where they cancel
// out), once per walk
const walkMiddle = () => {
  if (walkMiddle.of === walk.wx) return walkMiddle.d;
  const m = [0, 0, 0];
  for (let i = 0; i <= walk.n; i++) {
    const l = Math.hypot(walk.wx[i], walk.wy[i], walk.wz[i]) || 1;
    m[0] += walk.wx[i] / l; m[1] += walk.wy[i] / l; m[2] += walk.wz[i] / l;
  }
  walkMiddle.of = walk.wx;
  return (walkMiddle.d = Math.hypot(...m) > 1e-6 * walk.n ? unit(m) : unit([walk.wx[walk.n], walk.wy[walk.n], walk.wz[walk.n]]));
};
function faceWalk() {
  faced = true;
  if (choosingStart || !walk.sphere || walk.geo.torus || !$('centered').checked || $('autoRotate').checked || !walk.n) return;
  const d = walkMiddle();
  const axis = cross(d, cam.v), sin = Math.hypot(...axis), angle = Math.atan2(sin, towardViewer(...d));
  if (sin > 1e-9 && angle > 1e-4) rotateView(axis.map((x) => (x / sin) * angle));
}
// once the walker has reached the end, towards the walk's middle, as when the walk is shown whole
function followWalker() {
  // on a torus the position does not say which way the surface faces: use the tile's normal
  const t = walk.tile[cur], nr = walk.shape.nrm;
  const d = unit(walk.geo.torus && !walk.geo.mobius ? [nr[3 * t], nr[3 * t + 1], nr[3 * t + 2]]
    : cur >= walk.n && !walk.life ? walkMiddle() : [walk.wx[cur], walk.wy[cur], walk.wz[cur]]);
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
const facing = (i) => twoSidedNow() || tileVisible(walk.tile[i]);
// an unrolled torus is an open surface: both sides show
const twoSidedNow = () => false;  // every surface is seen from its face only (an unrolled torus: its top; a Möbius strip: each face its own tiles)

// Sphere: visible tiles coloured by visit count (log scale) and shading
function drawSphere() {
  const ctx = layers.path;
  ctx.clearRect(0, 0, cw, ch);
  layers.line.clearRect(0, 0, cw, ch);  // the 2D path over cells, if any was left
  const { geo: g, R, visits, maxVisits } = walk;
  const { scale: s, ox, oy } = view;
  const nv = g.verts.length / 3, proj = projector();
  // flat solids: visibility is decided once per face, and faces are drawn as single polygons
  const facePath = (f, close = true) => {
    ctx.beginPath();
    f.corners.forEach((c, i) => {
      const [x, y] = proj(c[0] * R, c[1] * R, c[2] * R);
      ctx[i ? 'lineTo' : 'moveTo'](ox + x * s, oy + y * s);
    });
    if (close) ctx.closePath();
  };
  const LEVELS = 32;
  // the rainbow of the tiles (lighter on a light page; the path keeps the plain rainbow)
  const lift = (c) => { if (!TILE_LIFT) return c; const v = rgbOf(c).map((x) => Math.round(x + (255 - x) * TILE_LIFT)); return `rgb(${v})`; };
  const grad = Array.from({ length: LEVELS }, (_, i) => lift(GRADIENT[Math.round((i / (LEVELS - 1)) * (BANDS - 1))]));
  const logLevel = (v, max) => 1 + Math.round((Math.log(v) / Math.log(Math.max(2, max))) * (LEVELS - 1));
  // palette[0] is the unlit background; levelOf(t) picks each tile's palette entry
  let palette = [null, ...grad];
  let levelOf = (t) => (visits[t] ? logLevel(visits[t], maxVisits) : 0);  // walk: visits, log scale
  const L = walk.life, line = !L && ['gradient', 'cells'].includes($('colorMode').value);  // Rainbow (the tiles Rainbow picks: cells)
  const path = !L && (MODES[$('mode').value].cells ? $('showPath').checked : line);  // on cells, with Show path only
  if (line) {  // Rainbow along the walk: a tile walked through (Fill cells), enclosed (Fill areas), or dark
    const cells = MODES[$('mode').value].cells && firstVisits(), areas = !walk.ant && $('fillAreas').checked && areaSteps();
    const band = (step) => Math.min(LEVELS - 1, Math.floor((step * LEVELS) / (walk.n + 1)));
    const tiles = path && MODES[$('mode').value].cells ? grad.map((c) => faded(c, 0.3)) : grad;  // Path: the tiles faded under the line
    palette = [null, ...tiles, ...(shows('translucent') && $('fillTranslucent').checked ? grad.map((c) => faded(c, 0.35)) : grad)];
    levelOf = (t) => (cells && cells[t] >= 0 && cells[t] <= cur ? 1 + band(cells[t])
      : areas && areas[t] >= 0 && areas[t] <= cur ? 1 + LEVELS + band(areas[t]) : 0);
  }
  if (L) {
    const colour = $('colorMode').value;
    // dying state k (2 … C−1) → a trail colour, from light (just dying) to dark (almost dead)
    const dyingShade = (k) => Math.min(LIFE_TRAIL.length, Math.round(((k - 1) / (L.C - 1)) * LIFE_TRAIL.length));
    if (L.colours > 1 && colour === 'mono') {  // each civilisation in its colour, then the trail of the dead (Trail)
      const civ = civColours(L.colours, L.C);
      palette = [null, ...civ, ...LIFE_FADE];
      levelOf = (t) => L.alive[t] || (trailOn() && L.gen - L.died[t] <= LIFE_TRAIL.length ? civ.length + L.gen - L.died[t] : 0);
    } else if (colour === 'mono') {
      palette = [null, LIFE_ALIVE, ...(L.C === 2 ? LIFE_FADE : LIFE_TRAIL)];  // the trail in Ink, the dying stages grey
      levelOf = (t) => (L.alive[t] === 1 ? 1 : L.alive[t] ? 1 + dyingShade(L.alive[t])
        : trailOn() && L.C === 2 && L.gen - L.died[t] <= LIFE_TRAIL.length ? 1 + L.gen - L.died[t] : 0);  // the trail after death (Trail)
    } else if (colour === 'digit') {  // activity: how many times the cell changed state
      levelOf = (t) => (L.activity[t] ? logLevel(L.activity[t], L.maxActivity) : 0);
    } else {  // age of live cells, the rainbow backwards (orange = newborn … cyan = old); dying stages, or a trail fading after death
      palette = [null, ...[...grad].reverse(), ...(L.C === 2 ? LIFE_FADE : LIFE_TRAIL)];
      levelOf = (t) => {
        const st = L.alive[t];
        if (st && st <= L.colours) return Math.min(LEVELS, logLevel(L.age[t], 64));  // (in colours too)
        if (st) return LEVELS + dyingShade(1 + Math.floor((st - 1) / L.colours));
        return trailOn() && L.C === 2 && L.gen - L.died[t] <= LIFE_TRAIL.length ? LEVELS + L.gen - L.died[t] : 0;
      };
    }
  }
  // an ant's cells, as in 2D (see CELL_MODES): by their colour in Ink or Amber (the times it was on each, the
  // one under it as it will be), Path's faded under its line, Directions by the turn it took there last;
  // Rainbow and Heatmap as a walk's
  const look = $('colorMode').value;
  if (walk.ant && look === 'digit' && antRamp) {
    const ramp = Array.from({ length: walk.ant }, (_, k) => rampColour(k, walk.ant));
    palette = [null, ...(path ? ramp.map((c) => faded(c, 0.3)) : ramp)];
    levelOf = (t) => (visits[t] ? 1 + (visits[t] % walk.ant) : 0);
  } else if (walk.ant && look === 'digit') {
    const arrows = arrowsOf(current.mode), last = new Int16Array(g.n).fill(-1);
    for (let p = 1; p <= Math.min(cur, walk.n - 1); p++) last[walk.tile[p]] = walk.turns[p];  // the turn it took on leaving it
    palette = [null, ...arrows.map(antTurnColour)];
    levelOf = (t) => (visits[t] && last[t] >= 0 ? 1 + last[t] : 0);
  }
  if (L && g.walls) {  // the pentagons of the hexagon sphere: walls, in stone grey
    const inner = levelOf, wall = new Set(g.walls);
    palette = [...palette, LIFE_WALL];
    levelOf = (t) => (wall.has(t) ? palette.length - 1 : inner(t));
  }
  // the torus, and any polyhedron that is not flat, is drawn tile by tile from its current form;
  // a flat polyhedron is drawn face by face below
  if (!startsShown && glSurface(palette, levelOf, path)) return;  // WebGL, when the browser has it (see 11.4b)
  glClear();
  if (startsShown) {  // an empty globe under the distinct starts, its 12 pentagons as the walls they are in a Life run
    const wall = new Set(g.walls);
    drawShapeTiles(ctx, walk.shape, g.sides, [null, LIFE_WALL], (t) => (wall.has(t) ? 1 : 0));
    drawStarts(ctx);
    return;
  }
  if (g.torus || !g.faces || g.concave || walk.shape.m > 0) {  // the line goes with its tiles, so that nearer tiles hide it
    drawShapeTiles(ctx, walk.shape, g.sides, palette, levelOf, path && pathHalves());
    return;
  }
  const px = new Float32Array(nv), py = new Float32Array(nv);  // the corners on the screen
  for (let v = 0; v < nv; v++) {
    const [x, y] = proj(g.verts[3 * v] * R, g.verts[3 * v + 1] * R, g.verts[3 * v + 2] * R);
    px[v] = ox + x * s; py[v] = oy + y * s;
  }
  const faceVisible = g.faces.map((f) => planeVisible(f.normal, f.corners[0].map((v) => v * R)));
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
      ctx.lineTo(px[first], py[first]);  // back to the first corner: closePath slows a long path down more and more
    }
  };
  // background: anti-aliasing seams between tiles show this colour instead of black
  ctx.fillStyle = UNLIT;
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
    ctx.strokeStyle = EDGE;
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
  if (path) drawSurfacePath(ctx);
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
  const [r, g, b] = rgbOf(colour), [R, G, B] = rgbOf(UNLIT);
  return `rgb(${Math.round(R + (r - R) * a)}, ${Math.round(G + (g - G) * a)}, ${Math.round(B + (b - B) * a)})`;
}
// The tile edges' opacity on a shape: on a light page, fainter as the tiles get small on screen
// (thousands of dark lines would grey the whole solid)
function edgeAlpha(sh) {
  if (!FADE_EDGES) return EDGE_ALPHA;
  // the tiles' size as the grid's density of lines shows it: 2 × area / half perimeter (each edge is
  // shared), the side of a square of that density (a hexagon of side 1: 1.73, a triangle: 0.58, a
  // square stretched 2.5 times: 1.43), over all the tiles, once per form of the surface
  if (sh.cellSizeAt !== sh.m || !sh.cellSize) {
    const c = sh.corners, k = walk.geo.sides, n = walk.geo.n;
    let area = 0, edges = 0;
    for (let t = 0; t < n; t++) {
      const o = 3 * k * t;
      for (let q = 0; q < k; q++) { const a = o + 3 * q, b = o + 3 * ((q + 1) % k); edges += Math.hypot(c[a] - c[b], c[a + 1] - c[b + 1], c[a + 2] - c[b + 2]); }
      for (let q = 1; q + 1 < k; q++) {  // a fan of triangles from corner 0
        const a = o + 3 * q, b = a + 3;
        const ux = c[a] - c[o], uy = c[a + 1] - c[o + 1], uz = c[a + 2] - c[o + 2], vx = c[b] - c[o], vy = c[b + 1] - c[o + 1], vz = c[b + 2] - c[o + 2];
        area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
      }
    }
    sh.cellSize = (2 * area) / (edges / 2); sh.cellSizeAt = sh.m;
  }
  const px = walk.R * sh.cellSize * view.scale;
  return EDGE_ALPHA * Math.min(1, Math.max(0.15, (px - 4) / 50));  // as faint at every surface's usual size, stronger zoomed in
}
function shaded(colour, shade) {  // colour darkened by shade ∈ [0, 1], as an rgb() string
  const key = `${colour}|${shade}|${SHADE}`;
  if (!shadeCache.has(key)) {
    const k = 1 - SHADE * shade, [r, g, b] = rgbOf(colour).map((v) => Math.round(v * k));
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
  const twoSided = twoSidedNow();
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
  ctx.strokeStyle = `rgba(${EDGE_RGB.join(', ')}, ${edgeAlpha(sh)})`;
  for (const [, t] of visible) {
    const level = levelOf(t);
    let toward = towardViewer(sh.nrm[3 * t], sh.nrm[3 * t + 1], sh.nrm[3 * t + 2]);
    if (twoSided) toward = Math.abs(toward);  // the back of a tile is lit like its front
    // 64 shades: fine enough that a tile's colour turns smoothly with the view (8 made visible
    // jumps of about 7 % in brightness), coarse enough to keep the cache of shaded colours small
    ctx.fillStyle = shaded(level ? palette[level] : UNLIT, Math.round((1 - Math.max(0, toward)) * 64) / 64);
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

/* ---- 11.4b Surfaces in WebGL ----------------------------------------------------------------
 * The tiles, their grid and the rainbow path on a surface, drawn by the graphics card (WebGL 2) in
 * one go, its depth buffer hiding what lies behind (no sorting of the tiles, no path cut in halves):
 * fast enough to turn a big surface smoothly. The same projection as projectPoint (orthographic, or
 * perspective around walk.persp), the same colours and shading as drawShapeTiles; the walker's arrow,
 * the starts and the sky stay on their 2D layers. Without WebGL 2, drawSphere draws in 2D as before.
 *  - tiles: each tile a fan of triangles, its colour per corner (rebuilt at each drawing: the walk
 *    paints tiles as it goes), its normal for the shading (rebuilt when the shape changes);
 *  - grid: the tile edges as lines, pulled a little towards the viewer;
 *  - path: one instance per step, a quad from point i to point i + 1, as wide on screen as
 *    surfaceLineWidth, coloured by its band of the rainbow; the points are stored once. */
const glCanvas = $('glLayer');
let GLS = null;  // { gl, programs, buffers, keys } once set up; false when WebGL 2 is missing
const GL_PROJECT = `
uniform vec3 uR, uU, uV; uniform vec4 uPersp; uniform vec2 uCC; uniform vec3 uView; uniform vec2 uScreen; uniform float uDepth;
vec3 toScreen(vec3 p) {  // pixels on the stage, and the depth towards the viewer
  float X = dot(p, uR), Y = -dot(p, uU), t = dot(p - uPersp.xyz, uV);
  if (uPersp.w > 0.0) { float k = uPersp.w / (uPersp.w - t); X = uCC.x + (X - uCC.x) * k; Y = uCC.y + (Y - uCC.y) * k; }
  return vec3(uView.y + X * uView.x, uView.z + Y * uView.x, t);
}
vec4 clipOf(vec3 s, float bias) {
  return vec4(s.x / uScreen.x * 2.0 - 1.0, 1.0 - s.y / uScreen.y * 2.0, clamp(-s.z / uDepth - bias, -1.0, 1.0), 1.0);
}`;
const GL_SHADERS = {
  tile: [`#version 300 es
in vec3 aPos; in vec3 aNrm; in vec3 aCol; uniform bool uTwoSided; uniform float uShade; uniform vec4 uPlain; out vec3 vCol;${GL_PROJECT}
void main() {
  float toward = dot(aNrm, uV); if (uTwoSided) toward = abs(toward);
  vCol = (uPlain.a > 0.0 ? uPlain.rgb : aCol) * (1.0 - uShade * (1.0 - max(0.0, toward)));  // uPlain: the back of an open sheet
  gl_Position = clipOf(toScreen(aPos), 0.0);
}`, `#version 300 es
precision mediump float; in vec3 vCol; out vec4 o; void main() { o = vec4(vCol, 1.0); }`],
  edge: [`#version 300 es
in vec3 aPos; in vec3 aNrm; uniform float uBias; uniform bool uBoth; out float vFacing;${GL_PROJECT}
void main() {  // the edges of a tile turned away are not drawn (the back of an open sheet, or of a strip's face): cut
  // pixel by pixel, as its two ends may face apart (a strip's twist); an end sent off the screen drew a wire to it
  vec3 eye = uPersp.w > 0.0 ? uPersp.xyz + uV * uPersp.w - aPos : uV;
  vFacing = uBoth ? 1.0 : dot(aNrm, eye);  // a Klein bottle: seen from both sides
  gl_Position = clipOf(toScreen(aPos), uBias);
}`, `#version 300 es
precision mediump float; uniform float uEdge; uniform vec3 uEdgeRgb; in float vFacing; out vec4 o;
void main() { if (vFacing < 0.0) discard; o = vec4(uEdgeRgb, uEdge); }`],
  // the path printed on a surface's tiles (see pathSegments): one flat ribbon per segment, in its
  // tile's plane (aN its normal), as wide as the path on screen, its ends going on half that width
  // where aE says; seen from its tile's face only (see glSurface)
  ribbon: [`#version 300 es
in vec2 aQuad; in vec3 aA; in vec3 aB; in vec3 aN; in float aE; in float aI; uniform float uN, uHalf, uBias; uniform sampler2D uGrad; out vec3 vCol;${GL_PROJECT}
void main() {
  vCol = texture(uGrad, vec2((aI + 0.5) / uN, 0.5)).rgb;
  vec3 d = aB - aA; d = length(d) > 1e-9 ? normalize(d) : vec3(1.0, 0.0, 0.0);
  vec3 side = normalize(cross(d, aN)) * uHalf;  // counterclockwise seen from the face, as its tile
  float on = aQuad.x < 0.5 ? mod(aE, 2.0) : floor(aE / 2.0);  // this end goes on past its point
  vec3 p = mix(aA, aB, aQuad.x) + side * aQuad.y + d * (aQuad.x * 2.0 - 1.0) * uHalf * on;
  gl_Position = clipOf(toScreen(p), uBias);  // over the grid lines, as the other paths
}`, `#version 300 es
precision mediump float; in vec3 vCol; out vec4 o; void main() { o = vec4(vCol, 1.0); }`],
  // the cubes of a 3D walk on cells (see glCubes): a unit cube around each point, shaded as the tiles
  cube: [`#version 300 es
in vec3 aCorner; in vec3 aNrm; in vec3 aAt; in vec3 aCol; uniform float uShade; out vec3 vCol;${GL_PROJECT}
void main() {
  vCol = aCol * (1.0 - uShade * (1.0 - abs(dot(aNrm, uV))));
  gl_Position = clipOf(toScreen(aAt + aCorner), 0.0);
}`, `#version 300 es
precision mediump float; in vec3 vCol; out vec4 o; void main() { o = vec4(vCol, 1.0); }`],
  // flat drawings, 2D walks and projected 3D walks (see glFlat): world (x, y) → pixels by uView (scale, ox, oy)
  flatPath: [`#version 300 es
in vec2 aQuad; in vec2 aA; in vec2 aB; in float aKey; uniform float uN, uWidth, uFrom, uPeriod; uniform int uColour; uniform vec3 uView; uniform vec2 uScreen; uniform sampler2D uGrad, uPal; out vec3 vCol;
void main() {
  if (aKey > 254.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }  // a step that draws nothing (a spiral's 0)
  float i = float(gl_InstanceID);
  if (uPeriod > 0.0 && i >= uFrom + uPeriod) i = uFrom + mod(i - uFrom, uPeriod);  // each round of a loop as the first (see roundStep)
  vCol = uColour == 2 ? texture(uPal, vec2((aKey + 0.5) / 256.0, 0.5)).rgb : texture(uGrad, vec2((i + 0.5) / uN, 0.5)).rgb;
  vec2 a = uView.yz + aA * uView.x, b = uView.yz + aB * uView.x, p = mix(a, b, aQuad.x);
  vec2 d = b - a; d = length(d) > 1e-4 ? normalize(d) : vec2(1.0, 0.0);
  p += (vec2(-d.y, d.x) * aQuad.y + d * (aQuad.x * 2.0 - 1.0)) * uWidth * 0.5;
  gl_Position = vec4(p.x / uScreen.x * 2.0 - 1.0, 1.0 - p.y / uScreen.y * 2.0, 0.0, 1.0);
}`, `#version 300 es
precision mediump float; in vec3 vCol; out vec4 o; void main() { o = vec4(vCol, 1.0); }`],
  // tiles: one instance per tile, (x, y, colour band, template), its polygon from the templates (6
  // corners each, the last repeated)
  flatTiles: [`#version 300 es
in vec4 aC; uniform vec2 uTpl[24]; uniform float uAlpha, uBright; uniform int uColour; uniform vec3 uView; uniform vec2 uScreen; uniform sampler2D uGrad, uPal; out vec4 vCol;
void main() {  // aC.z: the band of the rainbow, or the key of the digits' colours (uColour 2)
  vec3 c = (uColour == 2 ? texture(uPal, vec2((aC.z + 0.5) / 256.0, 0.5)) : texture(uGrad, vec2((aC.z + 0.5) / 256.0, 0.5))).rgb * uBright;
  vCol = vec4(c * uAlpha, uAlpha);  // premultiplied
  vec2 p = uView.yz + (aC.xy + uTpl[int(aC.w) * 6 + gl_VertexID]) * uView.x;
  gl_Position = vec4(p.x / uScreen.x * 2.0 - 1.0, 1.0 - p.y / uScreen.y * 2.0, 0.0, 1.0);
}`, `#version 300 es
precision mediump float; in vec4 vCol; out vec4 o; void main() { o = vCol; }`],
};
function glSetup() {
  if (GLS !== null) return GLS;
  const gl = glCanvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true });
  if (!gl) return (GLS = false);
  const program = ([vs, fs]) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  try {
    const prog = Object.fromEntries(Object.entries(GL_SHADERS).map(([k, v]) => [k, program(v)]));
    const buf = () => gl.createBuffer();
    const grad = gl.createTexture();  // the rainbow, one texel per band (again when the theme changes, see glPalette)
    gl.bindTexture(gl.TEXTURE_2D, grad);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BANDS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array.from(GRADIENT.flatMap((c) => [...rgbOf(c), 255])));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    const quad = buf();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    GLS = { gl, prog, grad, quad, pos: buf(), nrm: buf(), col: buf(), fan: buf(), edges: buf(), ribbon: buf(), flatPts: buf(), flatKeys: buf(), flatFill: buf(), flatCells: buf(), pal: gl.createTexture(), keys: {}, drawn: false };
  } catch (e) {
    console.warn('WebGL surfaces off:', e.message);
    GLS = false;
  }
  return GLS;
}
// The theme changed the walk's colours: the rainbow texture again, the one colour and the digits' made again
function glPalette() {
  if (!GLS) return;
  const { gl } = GLS;
  gl.bindTexture(gl.TEXTURE_2D, GLS.grad);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BANDS, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array.from(GRADIENT.flatMap((c) => [...rgbOf(c), 255])));
  GLS.keys.cubes = null;
  GLS.keys.pal = null;
}
function glClear() {
  if (!GLS || !GLS.drawn) return;
  GLS.gl.clearColor(0, 0, 0, 0);
  GLS.gl.clear(GLS.gl.COLOR_BUFFER_BIT | GLS.gl.DEPTH_BUFFER_BIT);
  GLS.drawn = false;
}
const glColour = new Map();  // CSS colour → [r, g, b]
const rgbCached = (c) => { if (!glColour.has(c)) glColour.set(c, rgbOf(c)); return glColour.get(c); };
// The path on a surface, in its current form, printed flat on its tiles: from tile to tile, each
// step as two halves, from a tile's centre to the middle of the edge it crosses, then on to the next
// tile's centre, each in its own tile's plane (over a solid's edge, it folds round it); along the
// grid, each step on each tile beside its edge. Seen from the tile's face only (glSurface), a step on
// a face turned away is not drawn at all, and nothing jumps across an unrolled sheet's seams.
// Per segment [Ax, Ay, Az, Bx, By, Bz, Nx, Ny, Nz, ends, step]: ends, which ends go on half the
// width past their point (1 the start, 2 the end: where two segments of the same plane meet, not at
// a fold); and the first segment of each step (at)
function pathSegments() {
  const g = walk.geo, sh = walk.shape, R = walk.R, k = g.sides, C = sh.corners, n = walk.n;
  const corner = (t, q) => [C[3 * (k * t + q)] * R, C[3 * (k * t + q) + 1] * R, C[3 * (k * t + q) + 2] * R];
  const centre = (t) => [sh.cen[3 * t] * R, sh.cen[3 * t + 1] * R, sh.cen[3 * t + 2] * R];
  const normal = (t) => [sh.nrm[3 * t], sh.nrm[3 * t + 1], sh.nrm[3 * t + 2]];
  const mid = (p, q) => p.map((x, d) => (x + q[d]) / 2);
  const out = new Float32Array(11 * 2 * Math.max(1, n)), at = new Int32Array(n + 1);
  let j = 0;
  const put = (a, b, nr, ends, i) => { out.set([...a, ...b, ...nr, ends, i], 11 * j++); };
  for (let i = 0; i < n; i++) {
    at[i] = j;
    if (walk.vert) {  // along the grid: the edge, on each tile beside it
      const [t0, t1] = [walk.stepTiles[2 * i], walk.stepTiles[2 * i + 1]];
      for (const t of t0 === t1 ? [t0] : [t0, t1]) {
        const ends = [walk.vert[i], walk.vert[i + 1]].map((v) => { for (let q = 0; q < k; q++) if (g.poly[k * t + q] === v) return corner(t, q); return null; });
        if (ends[0] && ends[1]) put(ends[0], ends[1], normal(t), 3, i);
      }
      continue;
    }
    const a = walk.tile[i], b = walk.tile[i + 1], qa = [], qb = [];  // on cells
    for (let p = 0; p < k; p++) for (let q = 0; q < k; q++) if (g.poly[k * a + p] === g.poly[k * b + q]) { qa.push(p); qb.push(q); }
    const ma = qa.length === 2 ? mid(corner(a, qa[0]), corner(a, qa[1])) : mid(centre(a), centre(b));
    const mb = qb.length === 2 ? mid(corner(b, qb[0]), corner(b, qb[1])) : mid(centre(a), centre(b));
    put(centre(a), ma, normal(a), 1, i); put(mb, centre(b), normal(b), 2, i);
  }
  at[n] = j;
  return { data: out.subarray(0, 11 * j), at };
}

// Draw the surface with its palette and levelOf (as drawSphere picks them); false if WebGL is missing
// The camera of a program on GL_PROJECT, as projectPoint's; depth: the span of the depths drawn
function glView(gl, p, depth) {
  gl.useProgram(p);
  const u = (name) => gl.getUniformLocation(p, name), P = walk.persp, cc = P ? orthoPoint(...P.c) : [0, 0];
  gl.uniform3fv(u('uR'), cam.r); gl.uniform3fv(u('uU'), cam.u); gl.uniform3fv(u('uV'), cam.v);
  gl.uniform4f(u('uPersp'), ...(P ? P.c : [0, 0, 0]), P ? P.D : 0);
  gl.uniform2f(u('uCC'), cc[0], cc[1]);
  gl.uniform3f(u('uView'), view.scale, view.ox, view.oy);
  gl.uniform2f(u('uScreen'), cw, ch);
  gl.uniform1f(u('uDepth'), depth);
  return u;
}
function glSurface(palette, levelOf, path) {
  const S = glSetup();
  if (!S) return false;
  const { gl, prog } = S, g = walk.geo, sh = walk.shape, R = walk.R, k = g.sides, n = g.n;
  // the corners of each tile in their current form (k per tile), with the tile's normal
  const geoKey = `${n}|${k}|${R}|${sh.m}|${g.verts.length}|${walk.geo.torus ? g.nu + 'x' + g.nv : ''}`;
  if (S.keys.geo !== geoKey || S.keys.geoObj !== g) {
    const pos = new Float32Array(3 * k * n), nrm = new Float32Array(3 * k * n);
    for (let t = 0; t < n; t++) for (let q = 0; q < k; q++) {
      const i = 3 * (k * t + q);
      pos[i] = sh.corners[i] * R; pos[i + 1] = sh.corners[i + 1] * R; pos[i + 2] = sh.corners[i + 2] * R;
      nrm[i] = sh.nrm[3 * t]; nrm[i + 1] = sh.nrm[3 * t + 1]; nrm[i + 2] = sh.nrm[3 * t + 2];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, S.pos); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.nrm); gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
    if (S.keys.topo !== `${n}|${k}`) {  // the fans and the edges only change with the tiling
      const fan = new Uint32Array(3 * (k - 2) * n), edges = new Uint32Array(2 * k * n);
      for (let t = 0, f = 0, e = 0; t < n; t++) {
        for (let q = 1; q < k - 1; q++) { fan[f++] = k * t; fan[f++] = k * t + q; fan[f++] = k * t + q + 1; }
        for (let q = 0; q < k; q++) { edges[e++] = k * t + q; edges[e++] = k * t + ((q + 1) % k); }
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.fan); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, fan, gl.STATIC_DRAW);
      S.fanCount = fan.length;
      S.edgeIdx = edges;
      S.keys.topo = `${n}|${k}`;
    }
    S.keys.geo = geoKey; S.keys.geoObj = g;
  }
  // each tile's colour, from its level in the palette (0: the dark background of unlit tiles)
  const col = new Uint8Array(3 * k * n), rgb = palette.map((c) => rgbCached(c ?? UNLIT));
  for (let t = 0; t < n; t++) {
    const c = rgb[levelOf(t)] ?? rgb[0];
    for (let q = 0; q < k; q++) col.set(c, 3 * (k * t + q));
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, S.col); gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
  // the frame, the projection and the view
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  // the grid lines, then the path, pulled towards the viewer by a share of a tile (not of the solid:
  // on a big one, a fixed share let lines on the faces just behind an edge show through)
  const depth = 4 * R * Math.max(sh.extent, sh.maxExtent ?? sh.extent), tileSize = R * sh.extent * Math.sqrt((4 * Math.PI) / n);
  const edgeBias = (0.07 * tileSize) / depth, pathBias = (0.15 * tileSize) / depth;
  const uniforms = (p) => glView(gl, p, depth);
  const attrib = (p, name, buffer, size, type = gl.FLOAT, normalized = false, stride = 0, offset = 0, divisor = 0) => {
    const loc = gl.getAttribLocation(p, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, type, normalized, stride, offset);
    gl.vertexAttribDivisor(loc, divisor);
  };
  const off = (p, names) => names.forEach((name) => { const loc = gl.getAttribLocation(p, name); if (loc >= 0) { gl.disableVertexAttribArray(loc); gl.vertexAttribDivisor(loc, 0); } });
  // tiles
  let u = uniforms(prog.tile);
  // drawn on their face only (a strip's faces each show their own; an unrolled torus, its top), the
  // back of an open sheet plain; the corners of a torus are listed against its normals (shapeSign)
  // a Klein bottle, one-sided: both sides of each tile, in its colours
  const open = g.torus && !g.mobius && !g.klein && sh.m < 1, front = shapeSign(g) < 0 ? gl.FRONT : gl.BACK, back = front === gl.BACK ? gl.FRONT : gl.BACK;
  gl.uniform1i(u('uTwoSided'), open || g.klein ? 1 : 0);
  gl.uniform1f(u('uShade'), SHADE);
  gl.uniform4f(u('uPlain'), 0, 0, 0, 0);
  attrib(prog.tile, 'aPos', S.pos, 3);
  attrib(prog.tile, 'aNrm', S.nrm, 3);
  attrib(prog.tile, 'aCol', S.col, 3, gl.UNSIGNED_BYTE, true);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.fan);
  if (!g.klein) gl.enable(gl.CULL_FACE);
  gl.cullFace(front);
  gl.drawElements(gl.TRIANGLES, S.fanCount, gl.UNSIGNED_INT, 0);
  if (open) {
    gl.cullFace(back);
    gl.uniform4f(u('uPlain'), ...rgbCached(UNLIT).map((c) => c / 255), 1);
    gl.drawElements(gl.TRIANGLES, S.fanCount, gl.UNSIGNED_INT, 0);
  }
  gl.disable(gl.CULL_FACE);
  off(prog.tile, ['aPos', 'aNrm', 'aCol']);
  // grid: the tile edges, when the tiles are big enough on screen
  if ($('showGrid').checked && view.scale > 6) {
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);  // the canvas stays opaque under the lines
    u = uniforms(prog.edge);
    gl.uniform1f(u('uEdge'), edgeAlpha(sh));
    gl.uniform3f(u('uEdgeRgb'), ...EDGE_RGB.map((c) => c / 255));
    gl.uniform1f(u('uBias'), edgeBias);
    gl.uniform1i(u('uBoth'), g.klein ? 1 : 0);
    attrib(prog.edge, 'aPos', S.pos, 3);
    attrib(prog.edge, 'aNrm', S.nrm, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.edges);
    if (S.keys.edgesTopo !== S.keys.topo) { gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, S.edgeIdx, gl.STATIC_DRAW); S.keys.edgesTopo = S.keys.topo; }
    gl.drawElements(gl.LINES, S.edgeIdx.length, gl.UNSIGNED_INT, 0);
    off(prog.edge, ['aPos', 'aNrm']);
    gl.disable(gl.BLEND);
  }
  // path: the steps walked so far, printed on their tiles (see pathSegments)
  if (path && cur > 0) {
    if (S.keys.segs !== walk.wx || S.keys.segsM !== sh.m) {
      const segs = pathSegments();
      gl.bindBuffer(gl.ARRAY_BUFFER, S.ribbon); gl.bufferData(gl.ARRAY_BUFFER, segs.data, gl.DYNAMIC_DRAW);
      S.segsAt = segs.at; S.keys.segs = walk.wx; S.keys.segsM = sh.m;
    }
    u = uniforms(prog.ribbon);
    gl.uniform1f(u('uN'), Math.max(1, walk.n));
    gl.uniform1f(u('uHalf'), surfaceLineWidth() / 2 / view.scale);  // the screen width, in world units
    gl.uniform1f(u('uBias'), pathBias);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.grad); gl.uniform1i(u('uGrad'), 0);
    attrib(prog.ribbon, 'aQuad', S.quad, 2);
    attrib(prog.ribbon, 'aA', S.ribbon, 3, gl.FLOAT, false, 44, 0, 1);
    attrib(prog.ribbon, 'aB', S.ribbon, 3, gl.FLOAT, false, 44, 12, 1);
    attrib(prog.ribbon, 'aN', S.ribbon, 3, gl.FLOAT, false, 44, 24, 1);
    attrib(prog.ribbon, 'aE', S.ribbon, 1, gl.FLOAT, false, 44, 36, 1);
    attrib(prog.ribbon, 'aI', S.ribbon, 1, gl.FLOAT, false, 44, 40, 1);
    if (!twoSidedNow()) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }  // from its tile's face only (an unrolled torus: both)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, S.segsAt[cur]);
    gl.disable(gl.CULL_FACE);
    off(prog.ribbon, ['aQuad', 'aA', 'aB', 'aN', 'aE', 'aI']);
  }
  S.drawn = true;
  layers.path.clearRect(0, 0, cw, ch);  // the 2D tiles of a drawing before, if any
  return true;
}

/* Flat drawings by WebGL as well: the 2D walks, and the 3D walks once projected (their projection
 * is redone on the CPU when the view turns). The whole walk so far is redrawn at each frame, fast
 * enough to pan, zoom and turn walks of millions of steps smoothly. As drawSegments and drawFill:
 *  - fill: one instance per enclosed vertex of the fill (see computeFill), in the colour of the step
 *    that closed it;
 *  - cells: one instance per point (Fill cells, the heatmap of visits, the spirals' marks), painted in
 *    the walk's order, so that a cell shows its last colour; Digits are written in 2D over them;
 *  - path: one instance per step, a quad from point i to point i + 1 (as in glSurface), in the rainbow,
 *    one colour or a colour per digit. */
// cells: always on a spiral (its line is greyed out), else for Rainbow, Heatmap and, on cells in 2D,
// Directions (a colour per digit; an ant's turns or states)
const flatCellsOn = () => greyed('line') || ($('colorMode').value === 'cells' && shows('cells')) || ($('colorMode').value === 'visits' && useful('visits'))
  || ($('colorMode').value === 'digit' && shows('cells') && !!MODES[current.mode]?.cells);
const glFlatApply = () => !walk.sphere && Number.isFinite(walk.n)
  && !($('colorMode').value === 'digit' && walk.base > 255);
// the templates of the polygons around a cell's centre, per tiling, and which one a cell takes
const CELL_TEMPLATES = {
  square: [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]],
  tri: [[[0, (-2 * H) / 3], [0.5, H / 3], [-0.5, H / 3]], [[-0.5, -H / 3], [0.5, -H / 3], [0, (2 * H) / 3]]],  // ▲, ▼
  hex: [[0, 1, 2, 3, 4, 5].map((k) => [Math.cos((k * Math.PI) / 3) / Math.sqrt(3), -Math.sin((k * Math.PI) / 3) / Math.sqrt(3)])],
  cairo: CAIRO_TYPES.map((T) => T.template),
};
const cellTemplate = (lat, x, y) => lat === 'cairo' ? cairoType(...cairoAt(x, y))
  : lat === 'tri' && y - (TRI_Y0 + Math.floor((y - TRI_Y0) / H) * H) <= H / 2 ? 1 : 0;
const templateArray = (templates) => {
  const a = new Float32Array(48);
  templates.forEach((pts, t) => { for (let q = 0; q < 6; q++) a.set(pts[Math.min(q, pts.length - 1)], 2 * (6 * t + q)); });
  return a;
};
// how many of the sorted values are ≤ v
const countUpTo = (sorted, n, v) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m; } return lo; };
function glFlat(to) {
  if (walk.is3d && MODES[current.mode].cells) return glCubes(to);
  const S = glSetup();
  if (!S) return false;
  const { gl, prog } = S, mode = $('colorMode').value, { scale: s, ox, oy } = view;
  const upload = (buffer, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); };
  // the walk's points (again after each projection of a 3D walk), and a key per step: its digit's
  // colour, 255 for a step that draws nothing
  const ptsKey = `${walk.is3d ? projected : 0}`;
  if (S.keys.flatPts !== walk.xs || S.keys.flatProj !== ptsKey) {
    const pts = new Float32Array(2 * (walk.n + 1));
    for (let i = 0; i <= walk.n; i++) { pts[2 * i] = walk.xs[i]; pts[2 * i + 1] = walk.ys[i]; }
    upload(S.flatPts, pts);
    S.keys.flatPts = walk.xs; S.keys.flatProj = ptsKey;
  }
  const keysKey = `${mode === 'digit'}|${walk.keys === walk.antStates}`;
  if (S.keys.flatKeys !== walk.digits || S.keys.flatKeysMode !== keysKey) {
    const keys = new Uint8Array(Math.max(1, walk.n));
    for (let i = 0; i < walk.n; i++) keys[i] = walk.skipZeros && walk.digits[i] === 0 ? 255 : mode === 'digit' ? walk.keys[i] : 0;
    upload(S.flatKeys, keys);
    S.keys.flatKeys = walk.digits; S.keys.flatKeysMode = keysKey;
  }
  if (S.keys.pal !== `${walk.base}|${walk.ant}|${antRamp}|${walk.skipZeros}|${current.mode}|${MONO}`) {  // the digits' colours (an ant's)
    const pal = new Uint8Array(4 * 256);
    for (let k = 0; k < 256; k++) pal.set([...rgbCached(digitColour(walk.ant ? k : Math.min(k, walk.base - 1))), 255], 4 * k);
    gl.bindTexture(gl.TEXTURE_2D, S.pal);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pal);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    S.keys.pal = `${walk.base}|${walk.ant}|${antRamp}|${walk.skipZeros}|${current.mode}|${MONO}`;
  }
  // the fill's vertices, with their colour band, once per fill
  let fillCount = 0;
  if (fillOn()) {
    fillNow();
    if (fill.count && fill.templates.length <= 4) {
      if (S.keys.flatFill !== fill) {
        const inst = new Float32Array(4 * fill.count);
        for (let k = 0; k < fill.count; k++) inst.set([fill.cx[k], fill.cy[k], Math.floor((roundStep(fill.at[k] - 1) * BANDS) / rainbowLength()), fill.tpl[k]], 4 * k);
        upload(S.flatFill, inst);
        S.fillTpl = templateArray(fill.templates);
        S.keys.flatFill = fill;
      }
      fillCount = countUpTo(fill.at, fill.count, to);
    }
  }
  // the cells: each point's tile, with its colour band (the heatmap: its visits so far), once per walk
  const cells = !walk.is3d && flatCellsOn();
  let cellCount = 0;
  if (cells) {
    const cellsKey = `${mode}|${walk.keys === walk.antStates}`;
    if (S.keys.flatCells !== walk.xs || S.keys.flatCellsMode !== cellsKey) {
      const lat = walk.lattice, inst = new Float32Array(4 * (walk.n + 1)), at = new Int32Array(walk.n + 1);
      let m = 0, V = null, scale = 0;
      if (mode === 'visits') { V = visitCells(); V.seen.fill(0); scale = (BANDS - 1) / Math.log(Math.max(2, V.max)); }
      for (let p = 0; p <= walk.n; p++) {
        if (walk.skipZeros && p > 0 && walk.digits[p - 1] === 0) continue;
        const band = mode === 'digit' ? walk.keys[Math.max(0, p - 1)]  // an ant's colour, a spiral's digit
          : V ? Math.round(Math.log(++V.seen[V.cell[p]]) * scale) : Math.floor((roundStep(Math.max(0, p - 1)) * BANDS) / rainbowLength());
        inst.set([walk.xs[p], walk.ys[p], band, cellTemplate(lat, walk.xs[p], walk.ys[p])], 4 * m);
        at[m++] = p;
      }
      upload(S.flatCells, inst.subarray(0, 4 * m));
      S.cellAt = at; S.cellN = m;
      S.cellTpl = templateArray(CELL_TEMPLATES[lat]);
      S.keys.flatCells = walk.xs; S.keys.flatCellsMode = cellsKey;
    }
    cellCount = countUpTo(S.cellAt, S.cellN, to);
  }
  const line = !cells || ($('showPath').checked && !$('showPath').disabled);
  // the frame
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.grad);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.pal);
  const common = (p) => {
    gl.useProgram(p);
    const u = (name) => gl.getUniformLocation(p, name);
    gl.uniform3f(u('uView'), s, ox, oy);
    gl.uniform2f(u('uScreen'), cw, ch);
    gl.uniform1i(u('uGrad'), 0);
    gl.uniform1i(u('uColour'), mode === 'digit' ? 2 : 0);
    return u;
  };
  const attrib = (p, name, buffer, size, type, stride, offset, divisor) => {
    const loc = gl.getAttribLocation(p, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, type, false, stride, offset);
    gl.vertexAttribDivisor(loc, divisor);
    return loc;
  };
  const off = (locs) => locs.forEach((loc) => { gl.disableVertexAttribArray(loc); gl.vertexAttribDivisor(loc, 0); });
  const tiles = (buffer, tpl, count, alpha, bright) => {
    const u = common(prog.flatTiles);
    gl.uniform2fv(u('uTpl'), tpl);
    gl.uniform1f(u('uAlpha'), alpha);
    gl.uniform1f(u('uBright'), bright);
    gl.uniform1i(u('uPal'), 1);
    const locs = [attrib(prog.flatTiles, 'aC', buffer, 4, gl.FLOAT, 16, 0, 1)];
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 6, count);
    off(locs);
  };
  if (fillCount) tiles(S.flatFill, S.fillTpl, fillCount, $('fillTranslucent').checked && !$('fillTranslucent').disabled ? 0.35 : 1, 1);
  // the cells, faded under Path (as the 2D layer, see updateDisplayMenu)
  if (cellCount) tiles(S.flatCells, S.cellTpl, cellCount, shows('cells') && line ? 0.15 : 1, 1);
  if (line && to > 0) {
    const u = common(prog.flatPath);
    if (cells) gl.uniform1i(u('uColour'), 0);  // Path: the rainbow line over the cells, whatever colours them
    gl.uniform1f(u('uN'), Math.max(1, rainbowLength()));
    gl.uniform1f(u('uFrom'), walk.loop?.from ?? 0);
    gl.uniform1f(u('uPeriod'), closedLoop() ? walk.loop.period : 0);
    gl.uniform1f(u('uWidth'), cells ? Math.max(0.6, Math.min(s * 0.12, 3)) : Math.max(0.6, Math.min(s * 0.3, 6)));
    gl.uniform1i(u('uPal'), 1);
    const locs = [attrib(prog.flatPath, 'aQuad', S.quad, 2, gl.FLOAT, 0, 0, 0), attrib(prog.flatPath, 'aA', S.flatPts, 2, gl.FLOAT, 8, 0, 1),
                  attrib(prog.flatPath, 'aB', S.flatPts, 2, gl.FLOAT, 8, 8, 1)];
    const k = gl.getAttribLocation(prog.flatPath, 'aKey');
    gl.bindBuffer(gl.ARRAY_BUFFER, S.flatKeys);
    gl.enableVertexAttribArray(k);
    gl.vertexAttribPointer(k, 1, gl.UNSIGNED_BYTE, false, 1, 0);
    gl.vertexAttribDivisor(k, 1);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, to);
    off([...locs, k]);
  }
  gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);
  S.drawn = true;
  layers.path.clearRect(0, 0, cw, ch);
  return true;
}

// A convex solid's triangles from its corners and its faces' outward normals: each face the corners
// furthest along its normal, in turn around it (6 floats per corner: position, normal)
function solidTriangles(corners, normals) {
  const out = [], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (const n of normals) {
    const top = Math.max(...corners.map((p) => dot(p, n))), face = corners.filter((p) => dot(p, n) > top - 1e-9);
    const c = [0, 1, 2].map((i) => face.reduce((sum, p) => sum + p[i], 0) / face.length), off = (p) => p.map((v, i) => v - c[i]);
    const a = off(face[0]), b = cross(n, a), angle = (p) => Math.atan2(dot(off(p), b), dot(off(p), a));
    face.sort((p, q) => angle(p) - angle(q));
    const N = n.map((v) => v / Math.hypot(...n));
    for (let k = 1; k < face.length - 1; k++) out.push(...face[0], ...N, ...face[k], ...N, ...face[k + 1], ...N);
  }
  return new Float32Array(out);
}
// The cells of the 3D walks on cells, around their centre: the cube, and the truncated octahedron
// of the diagonals (square faces towards the cells 2 away along an axis, hexagons towards the corners)
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const CORNERS = [0, 1, 2, 3, 4, 5, 6, 7].map((g) => [g & 4 ? 1 : -1, g & 2 ? 1 : -1, g & 1 ? 1 : -1]);
const CELL_SHAPES = {
  cube: { half: 0.5, triangles: solidTriangles(CORNERS.map((p) => p.map((v) => v / 2)), AXES) },
  // its 24 corners: (0, ±1/2, ±1) in every order of the axes
  truncOcta: { half: 1, triangles: solidTriangles([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].flatMap(([, j, k]) =>
    CORNERS.slice(0, 4).map(([, a, b]) => { const p = [0, 0, 0]; p[j] = a / 2; p[k] = b; return p; })), [...AXES, ...CORNERS]) },
};
// A 3D walk on cells: the cell of each point up to to (a cube, see CELL_SHAPES), drawn in the walk's
// order with the depth buffer, so that a cell shows the colour of its last visit (the rainbow by the
// step, its digit's, or one colour) and hides the ones behind it
const cellShape = () => CELL_SHAPES[MODES[current.mode].shape ?? 'cube'];
function glCubes(to) {
  const S = glSetup();
  if (!S) return false;
  const { gl, prog } = S, mode = $('colorMode').value, n = walk.n, shape = cellShape();
  if (!S.cube) { S.cube = gl.createBuffer(); S.cubeAt = gl.createBuffer(); S.cubeCol = gl.createBuffer(); }
  if (S.keys.cubeShape !== shape) {
    gl.bindBuffer(gl.ARRAY_BUFFER, S.cube); gl.bufferData(gl.ARRAY_BUFFER, shape.triangles, gl.STATIC_DRAW);
    S.keys.cubeShape = shape;
  }
  if (S.keys.cubes !== walk.wx || S.keys.cubesMode !== mode) {  // once per walk and colouring
    const at = new Float32Array(3 * (n + 1)), col = new Uint8Array(3 * (n + 1));
    const rgb = mode === 'digit' ? Array.from({ length: walk.base }, (_, d) => rgbOf(digitColour(d))) : GRADIENT.map(rgbOf);
    for (let p = 0; p <= n; p++) {
      const q = Math.max(1, p);  // the start, as its first step
      at.set([walk.wx[p], walk.wy[p], walk.wz[p]], 3 * p);
      col.set(mode === 'digit' ? rgb[walk.digits[q - 1]] : rgb[Math.floor((roundStep(q - 1) * BANDS) / rainbowLength())], 3 * p);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, S.cubeAt); gl.bufferData(gl.ARRAY_BUFFER, at, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.cubeCol); gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
    S.keys.cubes = walk.wx; S.keys.cubesMode = mode;
  }
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);  // a later visit paints over
  // the depths: no point is further than twice the walk's reach from the perspective's centre
  const u = glView(gl, prog.cube, 4 * (walk.maxDist[n] + 2));
  gl.uniform1f(u('uShade'), SHADE);
  const attrib = (name, buffer, size, type, normalized, stride, offset, divisor) => {
    const loc = gl.getAttribLocation(prog.cube, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, type, normalized, stride, offset);
    gl.vertexAttribDivisor(loc, divisor);
    return loc;
  };
  const locs = [attrib('aCorner', S.cube, 3, gl.FLOAT, false, 24, 0, 0), attrib('aNrm', S.cube, 3, gl.FLOAT, false, 24, 12, 0),
                attrib('aAt', S.cubeAt, 3, gl.FLOAT, false, 0, 0, 1), attrib('aCol', S.cubeCol, 3, gl.UNSIGNED_BYTE, true, 0, 0, 1)];
  gl.drawArraysInstanced(gl.TRIANGLES, 0, shape.triangles.length / 6, to + 1);
  locs.forEach((loc) => { gl.disableVertexAttribArray(loc); gl.vertexAttribDivisor(loc, 0); });
  gl.disable(gl.DEPTH_TEST);
  S.drawn = true;
  return true;
}

/* ---- 11.5 Path, overlay and stats ------------------------------------------------------------ */
// Fill cells: the tile around a point of a 2D walk, as a path on the canvas (world → screen)
function tilePath(ctx, x, y) {
  const { scale: s, ox, oy } = view, X = (u) => ox + u * s, Y = (v) => oy + v * s;
  if (walk.lattice === 'square') { ctx.rect(X(x - 0.5), Y(y - 0.5), s, s); return; }
  let pts;
  if (walk.lattice === 'cairo') pts = CELL_TEMPLATES.cairo[cellTemplate('cairo', x, y)].map(([dx, dy]) => [x + dx, y + dy]);
  else if (walk.lattice === 'tri') {  // ▲ has its centre 2/3 down its row, ▼ 1/3 (see triStepper)
    const top = TRI_Y0 + Math.floor((y - TRI_Y0) / H) * H, up = y - top > H / 2;
    pts = up ? [[x, top], [x + 0.5, top + H], [x - 0.5, top + H]] : [[x - 0.5, top], [x + 0.5, top], [x, top + H]];
  } else {  // flat-topped hexagon of radius 1/√3 (see hexStepper)
    pts = [0, 1, 2, 3, 4, 5].map((k) => [x + Math.cos((k * Math.PI) / 3) / Math.sqrt(3), y - Math.sin((k * Math.PI) / 3) / Math.sqrt(3)]);
  }
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
  for (let k = 1; k < pts.length; k++) ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
  ctx.lineTo(X(pts[0][0]), Y(pts[0][1]));  // back to the first corner: closePath slows a path of many tiles down more and more
}

// The population's cells (see population), under the walk, in the ant's colours by state; the ant's
// own cells cover them as it walks
function drawPopulation() {
  if (!walk.ant || current?.mode !== 'antSquare' || !population.size) return;
  const ctx = layers.fill, byColour = new Map();
  for (const [k, c] of population) {
    const col = c % walk.ant;
    if (col) (byColour.get(col) ?? byColour.set(col, []).get(col)).push(k);
  }
  for (const [col, ks] of byColour) {
    ctx.beginPath();
    for (const k of ks) { const [x, y] = cellXY(k); tilePath(ctx, x, y); }
    ctx.fillStyle = rampColour(col, walk.ant);
    ctx.fill();
  }
}

// Visits: the cell of every point and the most visits of any cell over the whole walk, which fixes
// the log scale once, so a painted cell only changes colour when the walk comes back to it
let visitData = null;  // { cell, max, seen } for the current walk
function visitCells() {
  if (visitData) return visitData;
  const { xs, ys, lattice: lat } = walk, n = walk.n, index = new Map(), cell = new Int32Array(n + 1), total = [];
  for (let i = 0; i <= n; i++) {  // whole-number coordinates of each cell centre, per tiling
    const kx = lat === 'hex' ? Math.round(xs[i] / H) : Math.round((lat === 'cairo' ? 8 : 2) * xs[i]);
    const ky = lat === 'tri' ? Math.round(((ys[i] - TRI_Y0) * 3) / H) : Math.round((lat === 'cairo' ? 8 : 2) * ys[i]);
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
  let ctx = layers.path;
  const { xs, ys } = walk;
  const { scale: s, ox, oy } = view;
  const mode = $('colorMode').value;
  let overCells = false;  // Show path: a thinner rainbow line over the coloured cells, seen where it crosses older ones
  if (flatCellsOn()) {
    // the tile of each point: Fill cells and the marks of the point modes in their step's colour,
    // Visits by the visits so far (log scale)
    let colourOf = (p) => styleColor(styleKey(Math.max(0, p - 1)));
    if (mode === 'visits') {
      const V = visitCells(), scale = (BANDS - 1) / Math.log(Math.max(2, V.max));
      if (from === 0) V.seen.fill(0);
      colourOf = (p) => GRADIENT[Math.round(Math.log(++V.seen[V.cell[p]]) * scale)];
    }
    // one path per run of tiles of the same colour, filled when the colour changes, and outlined in it
    // by a pixel: no seam of the background along an edge two runs share
    let batch = null;
    const flush = () => { if (batch) { ctx.fillStyle = ctx.strokeStyle = batch; ctx.lineWidth = 1; ctx.fill(); ctx.stroke(); } };
    // a spiral's 0 draws nothing
    for (let p = from === 0 ? 0 : from + 1; p <= to; p++) {
      if (walk.skipZeros && p > 0 && walk.digits[p - 1] === 0) continue;
      const c = colourOf(p);
      if (c !== batch) { flush(); ctx.beginPath(); batch = c; }
      tilePath(ctx, xs[p], ys[p]);
    }
    flush();
    if (!$('showPath').checked || $('showPath').disabled) return;
    overCells = true;
    ctx = layers.line;
  }
  ctx.lineWidth = overCells ? Math.max(0.6, Math.min(s * 0.12, 3)) : Math.max(0.6, Math.min(s * 0.3, 6));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // over cells (Path): the rainbow along the walk, whatever colours the cells
  const keyOf = overCells ? (j) => Math.floor((roundStep(j) * BANDS) / rainbowLength()) : styleKey, colourOfKey = overCells ? (k) => GRADIENT[k] : styleColor;
  let i = from;
  while (i < to) {
    const k = keyOf(i);
    ctx.strokeStyle = colourOfKey(k);
    ctx.beginPath();
    ctx.moveTo(ox + xs[i] * s, oy + ys[i] * s);
    while (i < to && keyOf(i) === k) {
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
let fill = null;                   // { at, cx, cy, tpl, templates, count, tooBig } for the current walk (see computeFill)
let fillDone = 0;                  // how many of the fill's polygons are painted on the fill layer
// Fill areas goes with the colours where the path has one colour per step (not Visits, not By digit)
const fillAreasApply = () => useful('fill') && MODES[$('mode').value].fill !== false && !['visits', 'digit'].includes($('colorMode').value);
// (the walk drawn may still be the last mode's while the new one is computed: a tiling with a fill)
const fillOn = () => $('fillAreas').checked && fillAreasApply() && walk.n && !walk.is3d && !!FILL_GRIDS[walk.lattice];
// the fill, computed once per walk; beside the toggle, a word when the walk is too big to fill
function fillNow() {
  if (!fill) { fill = computeFill(); updateDisplayMenu(); }
  return fill;
}

/* The fill, in typed arrays only, for walks of millions of steps. The vertices of the tiling sit on
 * a grid of whole numbers (u, v), packed into an index id = i·NJ + j (see FILL_GRIDS: i, j, uOf, vOf):
 * 1. Each step crosses one tile edge, the link between its two vertices: the first crossing of each
 *    link is noted (a bit per forward link of the lower vertex), and listed in order.
 * 2. The regions at the end: one flood fill labels each vertex with its region, never across a crossed
 *    link; a region with a vertex outside the walk's box is outside.
 * 3. Back in time, over the regions only: the crossed links reopened from the last first-crossing to
 *    the first (a union–find of the regions); when a reopened link joins a region to the outside, that
 *    region was enclosed from the step after its crossing, and it is stamped with it.
 * 4. A vertex's step: the stamp of its region, or of the first stamped region it was merged into.
 * Returns { at: steps (sorted), cx, cy: each enclosed vertex, tpl: its polygon's template, templates:
 * [[dx, dy], …] per kind of polygon (the tile centres around a vertex), count, tooBig }. */
const FILL_MAX_VERTICES = 12_000_000;  // beyond, the walk is too big to fill
const R3 = 1 / Math.sqrt(3);
const ring = (r, a0, k) => Array.from({ length: k }, (_, q) => [r * Math.cos(a0 + (q * 2 * Math.PI) / k), r * Math.sin(a0 + (q * 2 * Math.PI) / k)]);
// Per tiling: the vertices' (u, v) from (x, y) and back, which (u, v) are vertices, the packing (i, j) and back,
// the links (forward ones get bits 1, 2, 4), the step between two tile centres, half an edge, and
// the polygons of the tile centres around a vertex
const FILL_GRIDS = {
  square: {  // corners (u − ½, v − ½)
    u: (x) => Math.round(x + 0.5), v: (y) => Math.round(y + 0.5), x: (u) => u - 0.5, y: (v) => v - 0.5,
    i: (u, v, u0) => u - u0, j: (u, v, v0) => v - v0, uOf: (i, j, u0) => u0 + i, vOf: (i, j, u0, v0) => v0 + j, isVertex: () => true,
    links: [[1, 0], [0, 1]], step: 1, half: 0.5, templates: [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]], tpl: () => 0,
  },
  tri: {  // the triangles' corners (u / 2, TRI_Y0 + v·H), u + v even (see triStepper)
    u: (x) => Math.round(2 * x), v: (y) => Math.round((y - TRI_Y0) / H), x: (u) => u / 2, y: (v) => TRI_Y0 + v * H,
    i: (u, v, u0) => (u - u0) >> 1, j: (u, v, v0) => v - v0, uOf: (i, j, u0, v0) => u0 + 2 * i + ((v0 + j) & 1), vOf: (i, j, u0, v0) => v0 + j,
    isVertex: (u, v) => ((u + v) & 1) === 0,
    links: [[2, 0], [1, 1], [-1, 1]], step: R3, half: 0.5, templates: [ring(R3, Math.PI / 6, 6)], tpl: () => 0,
  },
  hex: {  // the hexagons' corners (u / (2√3), v / 2): u not a multiple of 3, v of the parity of hexParity (see hexStepper)
    u: (x) => Math.round(2 * Math.sqrt(3) * x), v: (y) => Math.round(2 * y), x: (u) => u / (2 * Math.sqrt(3)), y: (v) => v / 2,
    i: (u, v, u0) => { const t = u - u0, q = Math.floor(t / 3); return 2 * q + (t - 3 * q - 1); }, j: (u, v, v0) => (v - v0) >> 1,
    uOf: (i, j, u0) => u0 + 3 * (i >> 1) + 1 + (i & 1), vOf: (i, j, u0, v0) => v0 + 2 * j + hexParity(u0 + 3 * (i >> 1) + 1 + (i & 1)),
    isVertex: (u, v) => { const q = Math.floor(u / 3); return u - 3 * q !== 0 && (v & 1) === hexParity(u); },
    links: [[2, 0], [1, 1], [-1, 1]], step: 1, half: R3 / 2,
    templates: [ring(R3, Math.PI / 3, 3), ring(R3, 0, 3)], tpl: (u) => (u - 3 * Math.floor(u / 3) === 2 ? 0 : 1),  // a centre on the left, or on the right
  },
};
const hexParity = (u) => { const q = Math.floor(u / 3); return u - 3 * q === 1 ? (q + 1) & 1 : q & 1; };
function computeFill() {
  const G = FILL_GRIDS[walk.lattice], { xs, ys } = walk, last = walk.n;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i <= last; i++) {
    if (xs[i] < minX) minX = xs[i]; if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i]; if (ys[i] > maxY) maxY = ys[i];
  }
  // the grid over the box and a margin of 2 (u0 a multiple of 6, v0 even: the packings rely on it)
  const u0 = 6 * Math.floor((G.u(minX - 2) - 6) / 6), v0 = 2 * Math.floor((G.v(minY - 2) - 2) / 2);
  const uMax = G.u(maxX + 2) + 6, vMax = G.v(maxY + 2) + 2, NI = G.i(uMax, vMax, u0) + 2, NJ = G.j(uMax, vMax, v0) + 2, N = NI * NJ;
  if (N > FILL_MAX_VERTICES) return { at: new Int32Array(0), tooBig: true, count: 0 };
  const idOf = (u, v) => { const i = G.i(u, v, u0), j = G.j(u, v, v0); return i >= 0 && i < NI && j >= 0 && j < NJ ? i * NJ + j : -1; };
  const uAt = (id) => G.uOf((id / NJ) | 0, id % NJ, u0, v0), vAt = (id) => G.vOf((id / NJ) | 0, id % NJ, u0, v0);
  const L = G.links;
  // 1. the links crossed, at their first crossing: bit 1 << k on the lower vertex for its link k
  const cross = new Uint8Array(N), list = new Int32Array(2 * last), steps = new Int32Array(last);
  let m = 0;
  for (let s = 0; s < last; s++) {
    if (walk.skipZeros && walk.digits[s] === 0) continue;  // a spiral's 0 draws nothing
    const dx = xs[s + 1] - xs[s], dy = ys[s + 1] - ys[s], d = Math.hypot(dx, dy);
    if (Math.abs(d - G.step) > 1e-6) continue;  // only steps to a neighbouring tile cross an edge
    const mx = (xs[s] + xs[s + 1]) / 2, my = (ys[s] + ys[s + 1]) / 2, px = (-dy / d) * G.half, py = (dx / d) * G.half;
    let ua = G.u(mx + px), va = G.v(my + py), ub = G.u(mx - px), vb = G.v(my - py);
    if (vb < va || (vb === va && ub < ua)) [ua, va, ub, vb] = [ub, vb, ua, va];
    const k = L.findIndex(([du, dv]) => du === ub - ua && dv === vb - va), id = idOf(ua, va);
    if (k < 0 || id < 0 || !G.isVertex(ua, va) || (cross[id] >> k) & 1) continue;
    cross[id] |= 1 << k;
    list[2 * m] = id; list[2 * m + 1] = k; steps[m++] = s;
  }
  // 2. the regions at the end (flood fill)
  const comp = new Int32Array(N).fill(-1), queue = new Int32Array(N), outside = [];
  let regions = 0;
  for (let v0id = 0; v0id < N; v0id++) {
    if (comp[v0id] >= 0) continue;
    let qh = 0, qt = 0, out = 0;
    queue[qt++] = v0id; comp[v0id] = regions;
    while (qh < qt) {
      const id = queue[qh++], u = uAt(id), v = vAt(id), x = G.x(u), y = G.y(v);
      if (x < minX || x > maxX || y < minY || y > maxY) out = 1;
      for (let k = 0; k < L.length; k++) {
        const du = L[k][0], dv = L[k][1];
        if (G.isVertex(u + du, v + dv)) {  // forward link k from this vertex
          const n = idOf(u + du, v + dv);
          if (n >= 0 && comp[n] < 0 && !((cross[id] >> k) & 1)) { comp[n] = regions; queue[qt++] = n; }
        }
        if (G.isVertex(u - du, v - dv)) {  // and from the vertex behind
          const n = idOf(u - du, v - dv);
          if (n >= 0 && comp[n] < 0 && !((cross[n] >> k) & 1)) { comp[n] = regions; queue[qt++] = n; }
        }
      }
    }
    outside.push(out);
    regions++;
  }
  // 3. back in time, over the regions
  const parent = Int32Array.from({ length: regions }, (_, r) => r), size = new Int32Array(regions).fill(1);
  const out = Uint8Array.from(outside), stamp = new Int32Array(regions).fill(-1);
  const find = (r) => { while (parent[r] !== r) r = parent[r]; return r; };  // no compression: stamps sit on the way up
  for (let k = m - 1; k >= 0; k--) {
    const id = list[2 * k], [du, dv] = L[list[2 * k + 1]];
    let a = find(comp[id]), b = find(comp[idOf(uAt(id) + du, vAt(id) + dv)]);
    if (a === b) continue;
    if (out[a] !== out[b]) stamp[out[a] ? b : a] = steps[k] + 1;  // the inner one enclosed from the next step
    if (out[b] && !out[a]) [a, b] = [b, a];
    else if (!out[a] && !out[b] && size[a] < size[b]) [a, b] = [b, a];
    parent[b] = a; size[a] += size[b]; out[a] |= out[b];
  }
  // 4. each region's step (−1: outside)
  const atRegion = new Int32Array(regions).fill(-2);
  const regionAt = (r) => {
    let x = r;
    while (atRegion[x] === -2 && stamp[x] < 0 && parent[x] !== x) x = parent[x];
    const v = atRegion[x] !== -2 ? atRegion[x] : stamp[x];
    for (let y = r; y !== x; y = parent[y]) atRegion[y] = v;
    return (atRegion[x] = v);
  };
  // the enclosed vertices, sorted by their step (counting sort)
  const count = new Int32Array(last + 2);
  for (let id = 0; id < N; id++) { const a = regionAt(comp[id]); if (a >= 0) count[a]++; }
  let total = 0;
  for (let s = 0; s < count.length; s++) { const c = count[s]; count[s] = total; total += c; }
  const at = new Int32Array(total), cx = new Float32Array(total), cy = new Float32Array(total), tpl = new Uint8Array(total);
  for (let id = 0; id < N; id++) {
    const a = atRegion[comp[id]];
    if (a < 0) continue;
    const k = count[a]++, u = uAt(id);
    at[k] = a; cx[k] = G.x(u); cy[k] = G.y(vAt(id)); tpl[k] = G.tpl(u);
  }
  return { at, cx, cy, tpl, templates: G.templates, tooBig: false, count: total };
}

// Paint the regions closed by the walk up to step to (from where the fill layer got to), opaque,
// in the path's colour at the step that closed them. Polygons of one colour go 64 to a path: the
// time to fill a path grows faster than its size (all of a colour at once took 21 s for 170,000
// polygons, by 64 under 0.1 s)
const FILL_BATCH = 64;
function drawFill(to) {
  fillNow();
  const ctx = layers.fill, { scale: s, ox, oy } = view, { at, cx, cy, tpl, templates } = fill;
  const colourAt = (k) => styleColor(styleKey(at[k] - 1));
  while (fillDone < fill.count && at[fillDone] <= to) {
    const colour = colourAt(fillDone);
    ctx.beginPath();
    for (let b = 0; b < FILL_BATCH && fillDone < fill.count && at[fillDone] <= to && colourAt(fillDone) === colour; b++, fillDone++) {
      const pts = templates[tpl[fillDone]], X = cx[fillDone], Y = cy[fillDone];
      ctx.moveTo(ox + (X + pts[0][0]) * s, oy + (Y + pts[0][1]) * s);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(ox + (X + pts[k][0]) * s, oy + (Y + pts[k][1]) * s);
      ctx.lineTo(ox + (X + pts[0][0]) * s, oy + (Y + pts[0][1]) * s);  // not closePath (see tilePath)
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

// The activity, under the stats: a walk's distance from its start, step by step; a Game of Life's live
// cells and its changes (births and deaths, grey), generation by generation: chaos, then calm. A column of
// pixels shows the highest value in it; up to the step shown filled under it (the light gold of a choice
// picked), a walk's steps still to come faint
let curveOf = null;  // a walk's columns, once per walk and width
function drawActivity() {
  const cv = $('activity'), W = cv.clientWidth, H = cv.clientHeight, dpr = devicePixelRatio || 1;
  if (!W) return;  // folded (drawn again when the card opens)
  cv.classList.toggle('seek', !walk.life);
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const ctx = cv.getContext('2d'), css = getComputedStyle(document.documentElement);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const accent = css.getPropertyValue('--accent'), muted = css.getPropertyValue('--muted');
  // a column's highest value; fewer steps than columns: each column the step under it (no gaps, a comb)
  const columns = (n, value) => {
    const c = new Float64Array(W);
    if (n < W) { for (let x = 0; x < W; x++) c[x] = value(Math.min(n - 1, Math.floor((x * n) / W))); return c; }
    for (let i = 0; i < n; i++) { const x = Math.floor((i * W) / n); c[x] = Math.max(c[x], value(i)); }
    return c;
  };
  let series, n;
  if (walk.life) {
    const T = walk.life.trace;
    n = T.alive.length;
    series = [[columns(n, (i) => T.change[i]), muted], [columns(n, (i) => T.alive[i]), accent]];
  } else {
    if (!walk.n || !walk.wx) return;
    n = walk.n + 1;
    const { wx, wy, wz } = walk;
    if (curveOf?.wx !== wx || curveOf.W !== W || curveOf.n !== n) {
      curveOf = { wx, W, n, c: columns(n, (i) => Math.hypot(wx[i] - wx[0], wy[i] - wy[0], wz ? wz[i] - wz[0] : 0)) };
    }
    // a walk's: in its rainbow, from its first step to its last (as its path)
    const rainbow = ctx.createLinearGradient(0, 0, W, 0);
    for (let f = 0; f <= 1; f += 0.125) rainbow.addColorStop(f, GRADIENT[Math.round(f * (BANDS - 1))]);
    series = [[curveOf.c, rainbow]];
  }
  const at = Math.min(W - 1, Math.floor((Math.min(cur, n - 1) * W) / n));
  const top = series.reduce((m, [c]) => c.reduce((k, v) => Math.max(k, v), m), 0) || 1;  // one scale: the changes against the live cells
  for (const [c, colour] of series) {
    const y = (x) => H - 1 - (c[x] / top) * (H - 3);
    if (colour !== muted) {  // filled up to the step shown (Life's live cells in gold, a walk in its rainbow, faint)
      ctx.fillStyle = colour === accent ? 'rgba(240, 180, 41, 0.22)' : colour;
      ctx.globalAlpha = colour === accent ? 1 : 0.22;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= at; x++) ctx.lineTo(x + 0.5, y(x));
      ctx.lineTo(at + 1, H);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    for (const [from, to, alpha] of [[0, at, 1], [at, W - 1, 0.3]]) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let x = from; x <= to; x++) (x === from ? ctx.moveTo : ctx.lineTo).call(ctx, x + 0.5, y(x));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
// One colour: five fixed gauges, each against its own most: alive against the peak, the births and deaths of this
// generation (how fast it lays and dies; their counts so far by them) against the most in one generation so far; the
// cells ever alive and the peak (and when) against the grid
function renderGauges(L) {
  const box = $('gauges'), n = L.alive.length;
  box.hidden = L.colours !== 1;
  if (box.hidden) return;
  if (!box.childElementCount) box.innerHTML = ['Alive', 'Born', 'Died', 'Ever alive', 'Peak'].map((name) => `<div class="gauge-row"><span>${name}</span><span class="rank-bar"><i style="background:${LIFE_ALIVE}"></i></span><span class="rank-num"></span></div>`).join('');
  const varies = L.loopAvg && L.loopMax[1] > L.loopMin[1];
  [[varies ? L.loopAvg[1] : L.aliveCount, L.peak, `<b>${varies ? `≈ ${fmt(Math.round(L.loopAvg[1] * 10) / 10)}` : fmt(L.aliveCount)}</b>`], [L.bornNow, L.bornMax, fmt(L.born)],
    [L.deadNow, L.deadMax, fmt(L.dead)], [L.everAlive, n, fmt(L.everAlive)], [L.peak, n, `${fmt(L.peak)} · gen ${fmt(L.peakGen)}`]].forEach(([v, most, text], i) => {
    const r = box.children[i];
    r.children[1].firstChild.style.width = `${most ? Math.min(100, (100 * v) / most) : 0}%`;
    r.children[2].innerHTML = text;
  });
}
// A battle's ranking, always in sight under the generation: the colours by their live cells (a bar, their share of all
// the live ones), then those died out, the last first (✝ and when); a row a colour, its place, sliding to it; all dead,
// said. By each bar a table (alive, born, died, ever alive, in its colour), its titles on the rule's line: folded, its
// alive column only; the player open, all of it
function renderRanking(L) {
  const box = $('ranking'), K = L.colours, H = 18;
  box.hidden = $('rankTitles').hidden = K < 2;
  if (K < 2) return;
  if (box.dataset.k !== String(K)) {
    box.replaceChildren(...Array.from({ length: K }, (_, k) => {
      const r = document.createElement('div');
      r.className = 'rank-row';
      r.innerHTML = `<span></span><i style="background:${LIFE_COLOURS[k]}"></i><span class="rank-bar"><i style="background:${LIFE_COLOURS[k]}"></i></span>`
        + `<span class="rank-cell" style="color:${LIFE_COLOURS[k]}"></span>`.repeat(4);
      r.title = LIFE_COLOUR_NAMES[k];
      return r;
    }), Object.assign(document.createElement('span'), { className: 'all-dead' }));
    box.dataset.k = K;
  }
  const dead = (k) => L.extinctAt?.[k] !== null && L.extinctAt?.[k] !== undefined, alive = [], gone = [];
  for (let k = 1; k <= K; k++) (dead(k) ? gone : alive).push(k);
  const live = (k) => L.loopAvg?.[k] ?? L.byColour[k], mean = !!L.loopAvg;  // (a loop: each colour's mean over it, ≈)
  alive.sort((a, b) => live(b) - live(a) || a - b);
  gone.sort((a, b) => L.extinctAt[b] - L.extinctAt[a] || a - b);
  const total = alive.reduce((sum, k) => sum + live(k), 0) || 1, top = alive.length ? 0 : H;  // (all dead: a line for it on top)
  box.style.height = `${K * H + top}px`;
  [...alive, ...gone].forEach((k, place) => {
    const r = box.children[k - 1], off = dead(k);
    r.style.transform = `translateY(${top + place * H}px)`;
    r.classList.toggle('dead', off);
    r.children[0].textContent = place + 1;  // (then its colour, its bar, its table)
    const num = (v) => (mean && L.loopMax[k] > L.loopMin[k] ? `≈ ${fmt(Math.round(v * 10) / 10)}` : fmt(v));
    r.children[2].firstChild.style.width = off ? '0' : `${(100 * live(k)) / total}%`;
    [off ? `✝ gen ${fmt(L.extinctAt[k])}` : `<b>${num(live(k))}</b>`, fmt(L.bornBy[k]), fmt(L.deadBy[k]), fmt(L.everBy[k])].forEach((v, c) => { r.children[3 + c].innerHTML = v; });
  });
  box.querySelector('.all-dead').textContent = alive.length ? '' : 'All dead';
}
function updateStats() {
  // Jump to start and Step back greyed at the start (a Game of Life cannot go back), Step and Jump to end at the end (a Game of Life has none)
  $('restart').disabled = cur === 0;
  $('back').disabled = cur === 0 || !!walk.life;
  $('step').disabled = cur >= walk.n || lifeEnded();
  $('end').disabled = cur >= walk.n || !!walk.life?.stable;  // a Game of Life's end known: there already (or in its loop)
  // a Game of Life has no end: the button jumps 2,000 generations ahead, and says so
  const jump = walk.life ? `+${LIFE_JUMP / 1000}k` : icon('end');
  if ($('end').dataset.shown !== jump) {
    $('end').innerHTML = $('end').dataset.shown = jump;
    $('end').title = walk.life ? `${fmt(LIFE_JUMP)} generations ahead (E)` : 'Jump to end (E)';
  }
  // the progress: a slider to go to any step (none for the Game of Life, which has no end)
  const finite = Number.isFinite(walk.n) && !walk.life;
  $('seek').parentElement.hidden = $('seekCountOpen').hidden = !finite;  // its whole line
  if (finite) {
    $('seek').max = walk.n;
    if (document.activeElement !== $('seek')) $('seek').value = cur;
    $('seekCount').textContent = $('seekCountOpen').textContent = `${fmt(cur)} / ${fmt(walk.n)}`;
    // as wide as its widest value, so the slider keeps its width: digits 1ch each (tabular), commas and
    // the " / " much narrower
    const digits = String(walk.n).length, commas = fmt(walk.n).length - digits;
    $('seekCount').style.minWidth = `${2 * digits + 0.7 * commas + 1.6}ch`;
  }
  if (!walk.life) $('ranking').hidden = $('gauges').hidden = $('rankTitles').hidden = true;
  document.querySelector('.stage-bar .stats').classList.toggle('life', !!walk.life);
  document.querySelector('.stage-bar .stats').hidden = !!walk.life;  // Life: bubbles instead (lifeChips)
  $('lifeChips').hidden = !walk.life;
  STAT_LABELS[walk.life ? 'life' : walk.vert ? 'grid' : 'walk'].forEach((text, i) => { $(`lStat${i}`).textContent = text; });
  $('lStat0').hidden = $('sStep').hidden = !walk.life;  // a walk's step is the count by the slider
  $('lifetimeLabel').hidden = $('sLifetime').hidden = !walk.life;
  if (walk.life) {
    const L = walk.life, n = walk.geo.n, pc = (v) => `${fmt(v)} (${((100 * v) / n).toFixed(1)} %)`;
    // as bubbles: the run (lifetime, generation, alive, born, died, ever alive), then a row per colour
    const bubble = (back, inner, name, value) => `<span class="rule-chip"><b style="background:${back};--on:${back === LIFE_ALIVE ? UNLIT : '#fff'}">${inner}</b><span>${name}<small>${value}</small></span></span>`;
    // the title, in fixed widths so that it stays still: the generation, then how the run ended (✝ died
    // out, ■ frozen), or its loop: its phase, its period, from which generation
    const s = L.stable, pad = (v, like) => fmt(v).padStart(fmt(like).length, '\u2007');  // a figure space: as wide as a digit
    $('barNum').textContent = !s ? `Gen ${fmt(cur)}` : s.extinct ? `Gen ${fmt(cur)} ✝` : s.P === 1 ? `Gen ${fmt(cur)} ■`
      : `Gen ${pad(cur, s.T + s.P - 1)} ↻ ${pad(cur - s.T + 1, s.P)}/${fmt(s.P)} from ${fmt(s.T)}`;
    $('barLoop').hidden = true;
    // a row a colour, all its bubbles in it: alive, born, died, ever alive (one colour: the live cells', as the theme draws them)
    // a colour's live cells, or, once none is left, when it all died out
    const aliveBubble = (c, k, name, alive) => (L.extinctAt?.[k] !== null && L.extinctAt?.[k] !== undefined
      ? bubble(c, '✝', 'All died out', `gen ${fmt(L.extinctAt[k])}`)
      : L.loopAvg && L.loopMax[k] > L.loopMin[k] ? bubble(c, icon('aliveDot'), `${name} (mean of the loop)`, `≈ ${fmt(Math.round(L.loopAvg[k] * 10) / 10)} (${((100 * L.loopAvg[k]) / n).toFixed(1)} %)`)
      : bubble(c, icon('aliveDot'), name, pc(alive)));
    const row = (c, k, alive, born, died, ever) => [aliveBubble(c, k, 'Alive', alive), bubble(c, icon('born'), 'Born', fmt(born)),
      bubble(c, icon('died'), 'Died', fmt(died)), bubble(c, icon('ever'), 'Ever alive', pc(ever))].join('');
    $('lifeChips').innerHTML = '';  // (one colour: its gauges; a battle: the ranking's table)
    $('lifeChips').hidden = true;
    renderRanking(L);
    renderGauges(L);
    $('digitStrip').classList.remove('line');
    $('digitStrip').textContent = '';
    drawActivity();
    return;
  }
  drawActivity();
  $('sStep').textContent = `${fmt(cur)} / ${fmt(walk.n)}`;
  const x = walk.n ? walk.wx[cur] : 0;
  const y = walk.n ? (walk.is3d ? walk.wy[cur] : -walk.wy[cur]) : 0;
  const z = walk.is3d ? walk.wz[cur] : 0;
  const p = (v) => fmt(Math.round(v * 100) / 100 || 0);
  $('sPos').textContent = walk.is3d ? `(${p(x)}, ${p(y)}, ${p(z)})` : `(${p(x)}, ${p(y)})`;
  $('sDist').textContent = Math.hypot(x, y, z).toFixed(1);
  $('sMax').textContent = walk.n ? walk.maxDist[cur].toFixed(1) : '0';
  // on a surface, out of all its cells; once all are visited, the step that reached the last one
  $('sCells').textContent = !walk.n ? '1' : !walk.sphere ? fmt(walk.cells[cur])
    : walk.coverStep >= 0 && cur >= walk.coverStep ? `all ${fmt(walk.nodes)} · by step ${fmt(walk.coverStep)}`
    : `${fmt(walk.cells[cur])} / ${fmt(walk.nodes)} (${(100 * walk.cells[cur] / walk.nodes).toFixed(1)} %)`;
  if (walk.n && walk.counts) {  // each digit's count, on its chip
    const c = walk.counts.subarray(walk.base * cur, walk.base * (cur + 1));
    c.forEach((v, d) => { const e = document.getElementById(`count${d}`); if (e) e.textContent = fmt(v); });
  }
  // step by step (paused, or at the slowest speed): the chip of the next step lit in its colour, the one
  // it counts in (an ant's: the turn it takes, or by its rule the colour of its cell); an ant by the digits
  // turned the other way by a dark cell, the chip of the digit it reads dashed too; by its rule, on a cell
  // walked before, the chip of a fresh one (colour 0) dashed, as the turn it would take there
  const slow = walk.n && cur < walk.n && walk.counts && (!playing || speed <= 12);
  let next = -1;
  if (slow) for (let c = 0; c < walk.base; c++) if (walk.counts[walk.base * (cur + 1) + c] !== walk.counts[walk.base * cur + c]) next = c;
  const read = !slow || !walk.ant ? -1 : antByDigits ? walk.digits[cur] : 0;
  for (const chip of $('ruleChips').children) {
    const d = Number(chip.querySelector('small')?.id.slice(5));
    chip.classList.toggle('next', d === next);
    chip.classList.toggle('read', d === read && read !== next);
    chip.style.setProperty('--c', chip.querySelector('b')?.style.background ?? '');
  }
  // digit strip around the current step
  const strip = $('digitStrip');
  strip.classList.remove('line', 'turns');  // one line of digits; the other texts may wrap
  if (!walk.n) { strip.textContent = ''; return; }
  if (walk.ant && !antByDigits) { strip.textContent = `Rule ${antRules[current.mode]} · the number's digits are not used`; return; }  // an ant by its rule
  // One line of digits, exactly as many as fit (the strip is monospace, so it is a column count).
  // The head sits at 60 % of the line; at the start the line begins with the first digit, at the
  // end it finishes with the last one. The window then shrinks until "…", "0." and "." fit too.
  // above each digit, its step as an arrow (an ant's: the turn it took); before both lines, the walker:
  // a turtle turning relative to its heading, a compass going by fixed directions, a spiral winding round
  const mode = MODES[current.mode], arrows = arrowsOf(current.mode);
  strip.classList.add('line');
  strip.classList.toggle('turns', arrows.length > 0);
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
  const blank = '<span></span>', lrTurns = mode.antOf ? turnWords(antDigitRules[current.mode]).map((t) => ANTS[current.mode].turns[t]) : [];  // an ant's turns, per digit
  let top = blank.repeat(a > 0 ? 1 : intLen ? 0 : 2);
  for (let i = a; i < b; i++) {
    // a reading head: the highlighted digit is the next one to play (step cur + 1); the stats
    // describe the digits to its left. At the end it sits on a blank after the last digit.
    const colour = walk.base <= 8 ? ` style="color:${(walk.ant ? antChipColour : digitColour)(d[i])}"` : '';  // coloured as their chips
    // an ant's arrow coloured as its turn's chip (left, right), not as the digit it read. The head: the
    // digit and its arrow inverted, white on their colours (an ant on a dark cell: each its own), as
    // the chip lit; gold where the digits have no colours
    const turn = walk.ant ? lrTurns.indexOf(walk.turns[i]) : -1;
    const head = (c) => (colour ? ` class="cur" style="background:${c};color:#fff"` : ' class="cur"');
    const chipColour = (k) => (walk.ant ? antChipColour : digitColour)(k);
    html += i === cur ? `<span${head(colour && chipColour(d[i]))}>${d[i]}</span>` : colour ? `<span${colour}>${d[i]}</span>` : d[i];
    const arrow = arrows[walk.ant ? walk.turns[i] : d[i]];
    const arrowColour = walk.ant ? ` style="color:${antChipColour(turn)}"` : colour;
    top += arrow ? `<span${i === cur ? head(colour && chipColour(walk.ant ? turn : d[i])) : arrowColour}>${arrow}\ufe0e</span>` : blank;  // as text, not an emoji
    if (i === intLen - 1 && intLen < walk.n) { html += '.'; top += blank; }
  }
  const end = b < n ? '…' : cur >= n ? '<span class="cur">\u00a0</span>' : '';
  html += end;
  if (cur >= n) top += end;  // the head past the last digit, on both lines
  const walker = icon(mode.skipZeros ? 'spiral' : ['Turtle', 'Ant', 'Polymer'].includes(NAV[current.mode][3]) ? 'turtle' : 'compass');
  strip.innerHTML = arrows.length ? `${walker}<div class="arrows">${top}</div><div>${html}</div>` : html;
}

// How many characters fit on one line of the strip, measured again only when its font or width changes
const stripMeasure = { key: '', cols: 0, ctx: null };
function stripColumns(el) {
  // the width of the box it sits in, which keeps its width even while its details are folded away
  const box = el.closest('.stage-box') ?? el.parentElement, bs = getComputedStyle(box);
  const st = getComputedStyle(el);
  const width = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight) - parseFloat(st.paddingLeft);  // less the walker's room
  const font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`, key = `${font}|${width}`;
  if (stripMeasure.key !== key) {
    stripMeasure.ctx ??= document.createElement('canvas').getContext('2d');
    stripMeasure.ctx.font = font;
    stripMeasure.cols = Math.max(8, Math.floor((width * 20) / stripMeasure.ctx.measureText('0'.repeat(20)).width));
    stripMeasure.key = key;
  }
  return stripMeasure.cols;
}

/* ---- 11.6 The frame loop --------------------------------------------------------------------- */
/* Auto-rotate tumbles the object on the screen's three axes at once, as a three.js cube does with
 * rotation.x += 0.003, rotation.y −= 0.003, rotation.z += 0.001 at each frame: Euler angles (X, then Y,
 * then Z, on the axes right, up, towards the viewer) that grow steadily, so it rolls over every way.
 * Per frame of the screen, as there: the rates are 0.003 rad times the screen's refresh rate (the
 * shortest time seen between two frames), counted in time, so a slow frame here does not slow it. */
const SPIN_PER_FRAME = [0.003, -0.003, 0.001];
let lastTick = 0, spinTime = 0, frameMin = 1 / 60;
const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rotZ = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const matMul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
const spinAt = (t) => { const hz = 1 / frameMin; return matMul(matMul(rotX(SPIN_PER_FRAME[0] * hz * t), rotY(SPIN_PER_FRAME[1] * hz * t)), rotZ(SPIN_PER_FRAME[2] * hz * t)); };
function tick(now = performance.now()) {
  const raw = (now - (lastTick || now)) / 1000;
  if (raw > 1 / 250) frameMin = Math.min(frameMin, raw);  // the screen's refresh: its shortest frame
  const dt = Math.min(0.1, raw);  // seconds since the last frame (capped)
  lastTick = now;
  if (spinFrom && now >= spinFrom) {  // a Gallery setup starts turning (see showSetup)
    spinFrom = 0;
    if (walk.is3d) { $('autoRotate').checked = true; spinRamp = now; }
  }
  if (walk.is3d && $('autoRotate').checked) {
    // the turn from one frame to the next, Q = M(t + dt)·M(t)ᵀ, as a rotation vector on the screen's axes
    let k = 1;  // easing in after a Gallery setup's start
    if (spinRamp) { const t = Math.min(1, (now - spinRamp) / SPIN_EASE); k = t * t * (3 - 2 * t); if (t >= 1) spinRamp = 0; }
    const A = spinAt(spinTime), B = spinAt(spinTime += dt * k);
    const Q = B.map((row) => [0, 1, 2].map((j) => row[0] * A[j][0] + row[1] * A[j][1] + row[2] * A[j][2]));
    const angle = Math.acos(Math.min(1, Math.max(-1, (Q[0][0] + Q[1][1] + Q[2][2] - 1) / 2))), sin = Math.sin(angle);
    if (angle > 1e-9) {
      const axis = [Q[2][1] - Q[1][2], Q[0][2] - Q[2][0], Q[1][0] - Q[0][1]].map((x) => (x / (2 * sin)) * angle);
      rotateView(screenTurn(...axis));
    }
  }
  if (playing) {
    acc += stepsPerSecond() * dt;  // time-based, so the speed holds whatever the frame rate
    const k = Math.floor(acc);
    acc -= k;
    if (k > 0) advanceTo(cur + k);
  }
  includeBox();
  if (walk.n && !walk.sphere && $('autoFit').checked && boundsOffscreen(viewGoal || view)) {  // 15% room to grow (a surface's frame is fixed)
    const b = padBounds(bounds);
    const mx = (b.maxX - b.minX) * 0.15, my = (b.maxY - b.minY) * 0.15;
    viewGoal = viewFor({ minX: b.minX - mx, maxX: b.maxX + mx, minY: b.minY - my, maxY: b.maxY + my });
  }
  easeView(dt);
  if (walk.plane) {  // Life on the plane: the grid as one picture, each generation
    if (needsFull) glClear();
    if (needsFull) drawPlaneGrid();
    if (needsFull || statsDirty) { drawLifePlane(); updateStats(); }
    needsFull = statsDirty = false;
    requestAnimationFrame(tick);
    return;
  }
  if (walk.sphere) {  // the sphere is redrawn as a whole (heat map + recent trail)
    morphStep(dt);  // flat ↔ round, while it is changing
    // auto-fit turns the camera to keep the walker in front, except on a torus: the view stays put
    // and the walk is seen covering it (a walk shown whole is faced at once: faceWalk)
    if (walk.n && !walk.life && !walk.geo.torus && !choosingStart && !faced && $('centered').checked && !$('autoRotate').checked) followWalker();
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
    layers.line.clearRect(0, 0, cw, ch);
    layers.fill.clearRect(0, 0, cw, ch);
    drawn = 0;
    fillDone = 0;
  }
  // a line walk in WebGL, redrawn whole when anything changes (see glFlat); else in 2D, step by step
  let flat = walk.n && glFlatApply() && GLS !== false;
  if (needsFull && !flat) glClear();
  if (flat && (needsFull || drawn !== cur)) {
    flat = glFlat(cur);
    if (flat && drawn !== cur) { drawn = cur; statsDirty = true; }
  }
  if (!flat && fillOn()) drawFill(cur);  // each region when it closes, under the path
  if (needsFull) drawPopulation();
  if (!flat && walk.n && drawn < cur) {
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
// 10 … 50 million
// The edited fields (Custom formula, number of digits, start, the ant's and Life's rules): entering
// one shows the value in use, the cursor at its end (the plain number for the digits; formulaInUse is
// the last valid formula; a rule as it was). Enter or ↵ leaves the field, and leaving it applies it;
// but a wrong formula keeps you in the field, with its error. Esc undoes the edit: back to the value
// in use. For ↵, mousedown keeps the focus from going to the button first.
const valueInUse = { formula: () => formulaInUse, digitsLabel: () => String(randomPrimeSize() ?? requestedDigits()), startLabel: () => String(startNo()), speedLabel: () => String(speed),
                     antRule: () => antRuleOf($('mode').value) };
for (const input of document.querySelectorAll('.field input')) {
  let before = '';
  valueInUse[input.id] ??= () => before;  // Life's rule: as it was when entered
  input.addEventListener('focus', () => {
    before = input.value;
    input.value = valueInUse[input.id]();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  // a click into the field focuses it without placing the cursor (the focus puts it at the end);
  // once in, clicks place it as usual
  input.addEventListener('mousedown', (e) => {
    if (document.activeElement === input) return;
    e.preventDefault();
    input.focus();
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
  if (cur >= walk.n || lifeEnded()) restart();  // at the end: from the start again
  play(!playing);
});
$('step').addEventListener('click', () => { play(false); advanceTo(cur + 1); });
$('restart').addEventListener('click', () => {  // jump to start: keep playing only if it was playing
  const wasPlaying = playing;
  restart();
  play(wasPlaying);
});
// ⏭: jump to the end of a walk; with no end (Game of Life), jump LIFE_JUMP generations ahead
$('end').addEventListener('click', () => { advanceTo(Number.isFinite(walk.n) ? walk.n : cur + LIFE_JUMP); });  // (a Game of Life stops at its end, or loops)
// the turtle and the rabbit: the next speed of SPEEDS down or up; a typed one, digits only
$('slower').addEventListener('click', () => setSpeed(SPEEDS.findLast((v) => v < speed) ?? 1));
$('faster').addEventListener('click', () => setSpeed(SPEEDS.find((v) => v > speed) ?? SPEEDS.at(-1)));
$('speedLabel').addEventListener('input', () => { $('speedLabel').value = $('speedLabel').value.replace(/\D/g, ''); });
$('speedLabel').addEventListener('blur', updateSpeedLabel);  // "50 steps/s" again
$('speedLabel').addEventListener('change', () => { if ($('speedLabel').value) setSpeed(Number($('speedLabel').value)); });
// go to step v: back from the start, forward from where it is
function seekTo(v) {
  play(false);
  if (v < cur) restart();
  advanceTo(v);
  if ($('autoFit').checked) fitWhole();  // framed at once, not eased out from the start's frame
  statsDirty = true;
}
$('seek').addEventListener('input', () => seekTo(Number($('seek').value)));
// the activity curve as the slider, open: a click or a drag on it goes to that step (a walk's; Life's runs on)
const seekCurve = (e) => {
  if (walk.life || !Number.isFinite(walk.n) || !walk.n) return;
  const r = $('activity').getBoundingClientRect();
  seekTo(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * walk.n));
};
$('activity').addEventListener('pointerdown', (e) => { $('activity').setPointerCapture(e.pointerId); seekCurve(e); });
$('activity').addEventListener('pointermove', (e) => { if ($('activity').hasPointerCapture(e.pointerId)) seekCurve(e); });
$('back').addEventListener('click', () => seekTo(cur - 1));
$('colorMode').addEventListener('change', () => { needsFull = true; renderColorButtons(); updateDisplayMenu(); });
$('lifeTrail').addEventListener('change', () => { needsFull = true; renderTrailButton(); });
trailButton.addEventListener('click', () => { $('lifeTrail').checked = !$('lifeTrail').checked; $('lifeTrail').dispatchEvent(new Event('change')); });
$('fillAreas').addEventListener('change', () => { needsFull = true; updateDisplayMenu(); syncLink(); });
$('fillTranslucent').addEventListener('change', () => { needsFull = true; updateDisplayMenu(); });
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
stage.addEventListener('contextmenu', (e) => e.preventDefault());  // the right button drags the view
stage.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, pan: !walk.is3d || e.shiftKey || e.button === 2 };  // in 3D, Shift or the right button pans
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (drawing && walk.plane && !e.target.closest('.stage-box')) {  // Draw: the brush follows the pointer
    const r = stage.getBoundingClientRect();
    const cell = planeCellAt(walk.plane.kind, walk.plane.W, (e.clientX - r.left - view.ox) / view.scale, (e.clientY - r.top - view.oy) / view.scale);
    if (String(cell) !== String(ghost)) { ghost = cell; drawGhost(); }
  }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if (drag.pan) {
    view.ox += dx;
    view.oy += dy;
    userMovedView();
  } else {
    // a hand rotation keeps auto-fit (the view stays centred, as while auto-rotating), but stops
    // auto-rotate and Centered (the camera following the walker); a pan or a zoom ends auto-fit
    $('autoRotate').checked = false;
    spinFrom = spinRamp = 0;
    $('centered').checked = false;
    rotateView(screenTurn(dy * 0.008, dx * 0.008, 0));  // a trackball: drag right turns around the screen's up
  }
});
const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
// Double-click (or F): centre the view (a pan or a zoom turned Auto-fit off); with Auto-fit on, the
// view framed already, the default camera as well: no auto-rotate, the camera as when the walk was
// shown (turned towards it on a surface)
function recentre() {
  if ($('autoFit').checked && walk.is3d) {
    $('autoRotate').checked = false;
    spinFrom = spinRamp = 0;
    $('centered').checked = true;
    Object.assign(cam, CAM0);
    rotateView([0, 0, 0]);  // the projection and the frame again
    faced = false;
    if (!walk.life && cur >= walk.n) faceWalk();
  }
  fitNow();
}
stage.addEventListener('dblclick', () => { if (!drawing) recentre(); });  // drawing: a double click is two cells
// Draw cells (the square ant): a click on a cell gives it its next colour, back to none, and the walk is
// built again from that population; a drag still pans
let drawing = false, drawFrom = null;
$('drawCells').addEventListener('change', () => {
  drawing = $('drawCells').checked;
  if (drawing) $('autoFit').checked = false;  // the view stays where the cells are drawn
  stage.classList.toggle('drawing', drawing);
  renderAntRow();
});
$('clearCells').addEventListener('click', () => { population = new Map(); compute(true); });
// Life on the plane: the grid's size and edges (built again), its start (the cells only, but by the digits)
for (const [id, k] of [['planeDown', -1], ['planeUp', 1]]) {
  $(id).addEventListener('click', () => {
    const sides = PLANE_SIDES[MODES[$('mode').value].plane];
    plane.side = sides[Math.min(sides.length - 1, Math.max(0, sides.indexOf(plane.side) + k))];
    compute(true);
  });
}
for (const [id, torus, pic] of [['edgeTorus', true, 'torus'], ['edgeWalls', false, 'walls']]) {
  $(id).querySelector('svg').innerHTML = ICONS[pic];
  $(id).addEventListener('click', () => { if (plane.torus === torus) return; plane.torus = torus; compute(true); });
}
for (const b of $('lifeStartTabs').children) {
  b.addEventListener('click', () => {
    if (!MODES[$('mode').value].plane) {  // a surface: Draw shows its patterns, the others go back to the start as it was
      surfaceDraw = b.dataset.start === 'draw';
      if (surfaceDraw || plane.start === b.dataset.start) { renderPlaneRow(); renderHunt(); return; }
    }
    if (plane.start === b.dataset.start) return;
    plane.start = b.dataset.start; cleared = null; compute(true);
  });
}
$('clearDrawn').addEventListener('click', () => { [population, cleared] = cleared ? [cleared, null] : [new Map(), population]; planeReseed(); });
stage.addEventListener('pointerleave', () => { if (ghost) { ghost = null; drawGhost(); } });
$('brushCards').replaceChildren(...[BRUSH_CELL, ...DRAW_PATTERNS].map(([id, kind, , name, rle, what, art]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="mode-icon">${art ? pixelIcon(art) : cellsIcon(kind, rle)}</span><span><span class="mode-name">${name}</span><span class="mode-detail">${what}</span></span>`;
  b.dataset.brush = id;
  b.addEventListener('click', () => { brush.id = id; renderPlaneRow(); });
  return b;
}));
$('brushTurn').addEventListener('click', () => { brush.turn = (brush.turn + 1) % PATTERN_TURNS[MODES[$('mode').value].plane]; renderPlaneRow(); });
$('brushFlip').addEventListener('click', () => { brush.flip = !brush.flip; renderPlaneRow(); });
$('huntBtn').addEventListener('click', huntClick);
$('huntGoals').replaceChildren(...Object.entries(HUNT_GOALS).map(([goal, name]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = name;
  b.dataset.goal = goal;
  b.title = { longest: 'One colour: the start that lasts longest, however it ends', dies: 'One colour: the start that lasts longest and dies out, to the last cell',
              battle: 'Colours: the longest, most even battle (as many as the figure has natural spots for)' }[goal];
  b.addEventListener('click', () => pickGoal(goal));
  return b;
}));
$('autoPlay').addEventListener('change', autoplay);
$('animBar').addEventListener('mouseenter', () => requestAnimationFrame(drawActivity));  // the card opened: its curve  // turned on: it plays at once
$('huntZones').replaceChildren(...Object.entries(HUNT_ZONES).map(([zone, [pic, name]]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.zone = zone;
  b.innerHTML = `${pic ? icon(pic) : pixelIcon('.....,..o..,...o.,.ooo.')}<span>${name}</span>`;  // Patterns: a glider
  b.title = zone === 'custom' ? 'A start from a link' : zone === 'patterns' ? "The rule's patterns, one for each colour at its spot, turned or mirrored"
    : zoneRadius(zone) ? `Radius ${zoneRadius(zone)}: random starts within ${zoneRadius(zone)} steps of each spot`
    : zone === 'face' ? 'A whole face of the solid for each colour: random starts on it' : 'The whole grid: random soups';
  if (zone === 'custom') { b.hidden = true; return b; }  // shown, lit, for a start from a link
  b.addEventListener('click', () => pickZone(zone));
  return b;
}));
stage.addEventListener('pointerdown', (e) => { drawFrom = drawing && e.button === 0 && !e.target.closest('.stage-box') ? [e.clientX, e.clientY] : null; });
stage.addEventListener('pointerup', (e) => {
  if (!drawFrom || !(current.mode === 'antSquare' || walk.plane) || Math.hypot(e.clientX - drawFrom[0], e.clientY - drawFrom[1]) > 4) return;
  const r = stage.getBoundingClientRect();
  const wx = (e.clientX - r.left - view.ox) / view.scale, wy = (e.clientY - r.top - view.oy) / view.scale;
  const x = Math.round(wx), y = Math.round(wy);
  if (walk.plane) {  // Life: alive, then each dying state, back to dead; inside the grid only
    const cell = planeCellAt(walk.plane.kind, walk.plane.W, wx, wy);
    if (!cell) return;
    cleared = null;  // drawn again: no Undo
    const K = walk.life.colours;  // a pattern's state: alive in the brush's colour, or dying of it (see parseRule)
    if (brush.id !== 'cell' || !brush.colour) for (const [x, y, v] of brushAt(cell)) { if (brush.colour) population.set(key(x, y), K > 1 ? brush.colour + K * (v - 1) : v); else population.delete(key(x, y)); }
    else {  // a cell: in the brush's colour, or off if it has it; one colour: alive, then each dying state, back to dead
      const k = key(...cell), v = population.get(k) ?? 0;
      const c = walk.life.colours > 1 ? (v === brush.colour ? 0 : brush.colour) : (v + 1) % walk.life.C;
      if (c) population.set(k, c); else population.delete(k);
    }
    planeReseed();
    return;
  }
  const k = key(x, y), c = ((population.get(k) ?? 0) + 1) % (walk.ant || 2);
  if (c) population.set(k, c); else population.delete(k);
  compute(true);
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type=number], input[type=text], select')) return;
  switch (e.key) {
    case ' ': e.preventDefault(); $('play').click(); break;
    case 'ArrowRight': $('step').click(); break;
    case 'ArrowLeft': $('back').click(); break;
    case 'r': case 'R': $('restart').click(); break;
    case 'e': case 'E': $('end').click(); break;
    case 'f': case 'F': recentre(); break;
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
// Theme: Light, Dark or System (the default, following the system as it changes), kept in this browser
const systemLight = matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  const t = $('theme').value, theme = t === 'system' ? (systemLight.matches ? 'light' : 'dark') : t;
  try { localStorage.setItem('walkingTheme', t); } catch { /* not kept */ }
  renderChoiceButtons($('theme'), $('themeButtons'), { light: 'sun', dark: 'moon', system: 'halfDisc' });
  renderSkyButtons();  // the sky's switch back before them (the buttons were all made again)
  if (document.documentElement.dataset.theme === theme && MONO === PALETTES[theme].mono) return;
  document.documentElement.dataset.theme = theme;
  setPalette(theme);
  glColour.clear();
  glPalette();
  renderColorButtons();
  renderSkyButtons();
  renderColours();  // Life's colour blocks, in the theme's colours
  needsFull = statsDirty = true;  // Life's bubbles in the theme's colours too
}
try { $('theme').value = localStorage.getItem('walkingTheme') || 'system'; } catch { $('theme').value = 'system'; }
if (!$('theme').value) $('theme').value = 'system';
$('theme').addEventListener('change', applyTheme);
systemLight.addEventListener('change', () => { if ($('theme').value === 'system') applyTheme(); });
applyTheme();
// the animation bar sits over the view: its clicks, drags (the step slider) and wheel are its own
for (const type of ['pointerdown', 'dblclick', 'wheel']) {
  $('animBar').addEventListener(type, (e) => e.stopPropagation());
  $('viewTools').addEventListener(type, (e) => e.stopPropagation());  // Inflate and the Display menu too
}
$('perspective').addEventListener('change', () => {
  setPerspective();
  rotateView([0, 0, 0]);  // the projection again
  if (walk.sphere) bounds = surfaceBounds();  // its frame, larger in perspective
  if ($('autoFit').checked) fitWhole();
});
// Rule menu: a preset fills the rule field; Custom… shows the field to type any rule
$('lifePreset').addEventListener('change', () => {
  const custom = $('lifePreset').value === 'custom';
  if (custom) { $('lifeRule').focus(); return; }
  $('lifeRule').value = $('lifePreset').value;
  if (MODES[$('mode').value].life) compute();
});
$('lifeRule').addEventListener('change', () => {
  if (!parseRule(ruleBody($('lifeRule').value))) { $('status').textContent = 'Enter a rule like B3/S23, B2/S/C3 (2 to 10 states) or, on hexagons, B2o/S2m34 (the colours: Colors, above)'; return; }
  if (MODES[$('mode').value].life) compute();  // restart from generation 0; a new state count needs a new base
});
let copyReset = 0;  // the label comes back 1.5 s after the last click
$('copyNumber').addEventListener('click', async () => {
  const say = (text) => { $('copyNumber').innerHTML = `${icon('copy')} ${text}`; };
  try { await navigator.clipboard.writeText(numberText()); say('Copied'); } catch { say('Not allowed'); }
  clearTimeout(copyReset);
  copyReset = setTimeout(() => say('Copy number to clipboard'), 1500);
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
// a start typed: below the first, the first; past the last, the last; the one in use changes nothing
// (the field shows it again)
$('startLabel').addEventListener('change', () => {
  if (!$('startLabel').value) return;
  const n = Math.max(1, Math.min(Number($('startLabel').value), modeStarts().length));
  if (n !== startNo()) setStart(n);
});
// Hovering the start row ([− start +]) leaves the view as it was, whatever − and + do; the number
// shows every start on an empty globe. Leaving the row, Auto-fit and Centered take over again
$('startRow').addEventListener('mouseenter', () => { choosingStart = true; });
$('startRow').addEventListener('mouseleave', () => {
  choosingStart = false;
  faced = false;  // Centered: the camera turns to the walk (see followWalker)
  if ($('autoFit').checked) fitWhole();
});
const startField = $('startLabel').parentElement;
startField.addEventListener('mouseenter', () => { startsShown = true; needsFull = true; });
startField.addEventListener('mouseleave', () => { startsShown = false; needsFull = true; });
$('centered').addEventListener('change', () => {  // on: the camera turns to the pattern again, or back to the default view
  faced = false;
  if ($('centered').checked && !centersPattern()) { Object.assign(cam, CAM0); rotateView([0, 0, 0]); }
});
$('sizeDown').addEventListener('click', () => stepSize(-1));
// Grid or Cells: the walk in use goes to its twin; while browsing another tab, only its list changes
$('walkOnGrid').addEventListener('click', () => navGo(4, 'grid'));
$('walkOnCells').addEventListener('click', () => navGo(4, 'cells'));
for (const [id, digits] of [['antColours', false], ['antDigits', true]]) {
  $(id).addEventListener('click', () => { if (antByDigits === digits) return; antByDigits = digits; renderModePicker(); compute(); });
}
$('antRule').addEventListener('change', () => setAntRule($('mode').value, $('antRule').value));
// Heatmap of visits on a surface: the cells by their visits, else the rainbow line
$('heatmap').addEventListener('change', () => {
  $('colorMode').value = $('heatmap').checked ? 'visits' : 'gradient';
  $('colorMode').dispatchEvent(new Event('change'));
});
// an ant's cells: by their turn (Directions) or their state (Ink, Amber)
function setAntRamp(ramp) {
  antRamp = ramp;
  if (walk.ant) walk.keys = ramp ? walk.antStates : walk.antTurns;
  document.querySelectorAll('#ruleChips b').forEach((b, k) => { if (walk.ant) b.style.background = antChipColour(k); });
}
// The areas a walk closes, as tiles: Empty (none), Light (translucent, the line showing through), Plain
const AREA_MODES = [['empty', 'Empty', 'No area filled'], ['light', 'Light', 'The areas the walk closes, translucent: its line shows through'],
  ['plain', 'Plain', 'The areas the walk closes, in the colour of the step that closed them']];
function renderAreaModes() {
  const off = !fillAreasApply(), light = shows('translucent');
  const now = !$('fillAreas').checked ? 'empty' : $('fillTranslucent').checked && light ? 'light' : 'plain', c = GRADIENT[Math.round(0.55 * (BANDS - 1))];
  const picture = (look) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7L11 3L20 6L19 17L9 21L3 15Z" fill="${look === 'empty' ? 'none' : c}"`
    + `${look === 'light' ? ' fill-opacity="0.35"' : ''} stroke="${GRADIENT[Math.round(0.2 * (BANDS - 1))]}" stroke-width="2" stroke-linejoin="round"/></svg>`;  // a closed loop
  $('areaModes').replaceChildren(...AREA_MODES.map(([look, name, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.innerHTML = `${picture(look)}<span>${name}</span>`;
    b.classList.toggle('active', look === now);
    b.disabled = off || (look === 'light' && !light);
    b.addEventListener('click', () => {
      $('fillAreas').checked = look !== 'empty';
      $('fillTranslucent').checked = look === 'light';
      $('fillAreas').dispatchEvent(new Event('change'));
    });
    return b;
  }));
}
// The looks of a 2D walk on cells, as square buttons: an ant's states in Ink or Amber; Path, the rainbow
// line over its cells faded (an ant's in Amber); Directions, a colour per digit (an ant's, its turns);
// Rainbow along the walk; Heatmap of visits. [look, name, its picture's colours or null, title]
const CELL_MODES = [['ink', 'Ink', 'An ant’s cells by their state, pale to deep'], ['amber', 'Amber', 'An ant’s cells by their state, in amber'],
  ['path', 'Path', 'The walk’s rainbow line over its cells, faded'], ['cells', 'Rainbow', 'The cells in the rainbow along the walk'],
  ['digit', 'Directions', 'A colour per digit: the direction of each step (an ant’s, the turn it took: left blue, right pink, straight on gold)'], ['visits', 'Heatmap', 'The cells by how often the walk comes back to them']];
const cellModeOf = (mode) => ($('showPath').checked ? 'path' : mode.antOf && $('colorMode').value === 'digit' && antRamp ? antRamp
  : $('colorMode').value === 'gradient' ? 'cells' : $('colorMode').value);  // (a surface's Rainbow: gradient)
let pictureIds = 0;  // the gradients of the pictures, each its own id
function cellModePicture(look) {  // a 2 × 2 swatch, or the rainbow line over faded cells
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', g = (f) => GRADIENT[Math.round(f * (BANDS - 1))];
  const swatch = (cs) => `<svg viewBox="0 0 2 2" aria-hidden="true">${cs.map((c, i) => `<rect x="${i % 2}" y="${i >> 1}" width="1" height="1" fill="${c}"/>`).join('')}</svg>`;
  if (look === 'path') return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="2" fill="${ANT_RAMPS.amber[theme][1]}" opacity="0.2"/>`
    + [[4, 18, 9, 18], [9, 18, 9, 11], [9, 11, 15, 11], [15, 11, 15, 6], [15, 6, 20, 6]].map(([a, b, c, d], i) => `<path d="M${a} ${b}L${c} ${d}" stroke="${g(i / 4)}" stroke-width="2.4" stroke-linecap="round"/>`).join('') + '</svg>';
  if (look === 'ink' || look === 'amber') return swatch(ANT_RAMPS[look][theme]);
  if (look === 'digit') {  // a square cut along its diagonals: north, east, south, west, each in its colour
    const tri = [['↑', 'M12 12L2 2H22Z'], ['→', 'M12 12L22 2V22Z'], ['↓', 'M12 12L22 22H2Z'], ['←', 'M12 12L2 22V2Z']];
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${tri.map(([d, p]) => `<path d="${p}" fill="${DIRECTION_COLOURS[d]}"/>`).join('')}</svg>`;
  }
  // Rainbow: the app's rainbow from left to right; Heatmap: a hot core, cooling outwards
  const stops = (fs) => fs.map((f) => `<stop offset="${f}" stop-color="${g(f)}"/>`).join('');
  const id = `rainbow${++pictureIds}`;  // its own: another picture's, replaced, would take it away
  if (look === 'cells') return `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}">${stops([0, 0.25, 0.5, 0.75, 1])}</linearGradient></defs>`
    + `<rect x="2" y="2" width="20" height="20" rx="2" fill="url(#${id})"/></svg>`;
  return heatRings(g);
}
function renderCellModes(mode) {
  $('cellModes').hidden = !shows('cells') && !shows('heatmap') && !mode.antOf;  // a walk in 2D or on a surface, an ant anywhere
  if ($('cellModes').hidden) return;
  // an ant: all six; a walk in 2D: Path, Rainbow, Directions, Heatmap; on a surface: Path, Rainbow, Heatmap
  const looks = CELL_MODES.filter(([look]) => mode.antOf || (look !== 'ink' && look !== 'amber' && (shows('cells') || look !== 'digit'))), now = cellModeOf(mode);
  $('cellModes').replaceChildren(...looks.map(([look, name, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.innerHTML = `${cellModePicture(look)}<span>${name}</span>`;
    b.classList.toggle('active', look === now);
    b.disabled = !mode.cells || (look === 'visits' && !useful('visits'));
    b.addEventListener('click', () => pickCellMode(look));
    return b;
  }));
}
function pickCellMode(look) {
  const ant = !!MODES[$('mode').value].antOf;
  $('showPath').checked = look === 'path';
  if (ant) setAntRamp(look === 'ink' ? 'ink' : look === 'amber' || look === 'path' ? 'amber' : null);
  $('colorMode').value = look === 'ink' || look === 'amber' || (look === 'path' && ant) ? 'digit' : look === 'path' ? 'cells' : look;
  $('colorMode').dispatchEvent(new Event('change'));
  needsFull = true;
  updateDisplayMenu();
}
$('showPath').addEventListener('change', () => { needsFull = true; updateDisplayMenu(); });
$('loopDown').addEventListener('click', () => browseLoop(-1));
$('loopUp').addEventListener('click', () => browseLoop(1));
$('sizeUp').addEventListener('click', () => stepSize(1));
// Usual | Turned 30°: the triangle and hexagon tori turned or back; Rectangle | Square: the sheet of a
// torus; at the same size if it has one
function turnTorus(turned, square = squareSheet) {
  if (turned === torusTurned && square === squareSheet) return;
  const mode = MODES[$('mode').value];
  torusTurned = turned;
  squareSheet = square;
  fillSphereSizes(surfaceOf(mode), mode.initial);  // as many cells
  $('startNo').value = 1;  // the starts are not the same
  $('sphereF').dispatchEvent(new Event('change'));
}
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
  $('centered').checked = true;  // on a solid, the walker in front
  $('fillAreas').checked = true;
  $('showPath').checked = false;  // on cells, the cells alone
  $('fillTranslucent').checked = true;  // Light areas
  $('autoRotate').checked = false;  // the grid stays as chosen, on every tab
  $('sky').value = 'sky';  // Dawn or Twilight, after the theme
  renderSkyButtons();
  displayTab = modeTabOf();
}
// Digits of a walk by default, per tab (20,000 elsewhere): on a surface, fewer digits already cover it
const TAB_DIGITS = { 'Walks on surfaces': 10000 };
$('mode').addEventListener('change', () => {
  if (modeTabOf() !== displayTab) {
    $('digits').value = TAB_DIGITS[modeTabOf()] ?? 20000;
    displayDefaults();
  }
  // the form of the view belongs to the walk mode: its perspective, the camera's starting angle
  // (auto-fit may have turned it to follow a walker) and its flat or round form (see initShape)
  // come back with every new mode
  $('perspective').checked = perspectiveFor(MODES[$('mode').value], MODES[$('mode').value].round ? 1 : 0);
  Object.assign(cam, CAM0);
  $('autoFit').checked = true;  // a new walk is shown framed, whatever the view did before
  $('startNo').value = 1;
  compute();
});

/* ---- 12.2 Gallery: built-in setups ----------------------------------------------------------
 * The striking setups found so far, part of the page (nothing stored): hovering one shows it in the
 * view, leaving the list brings back the setup in use, a click keeps it. */
const BUILT_IN = [
  ['1/923', '4-fold rosette', { x: '1/923', w: 'turtle', d: 421 }],
  ['2/541', '4-fold rosette', { x: '2/541', w: 'turtle', d: 541 }],
  ['1/709', '4-fold rosette', { x: '1/709', w: 'turtle', d: 709 }],
  ['1/983', '4-fold rosette', { x: '1/983', w: 'turtle', d: 1965 }],
  ['1/383', '6-fold rosette', { x: '1/383', w: 'hexTurtle', d: 1147 }],
  ['3/497', '6-fold rosette', { x: '3/497', w: 'hexTurtle', d: 631 }],
  ['1/463', '6-fold rosette', { x: '1/463', w: 'hexTurtle', d: 1387 }],
  ['1/967', '6-fold rosette', { x: '1/967', w: 'hexTurtle', d: 2899 }],
  ['11/604', '6-fold rosette', { x: '11/604', w: 'triTurtle', d: 451 }],
  ['1/599', '3-fold rosette', { x: '1/599', w: 'triTurtle', d: 898 }],
  ['1/856', '6-fold rosette', { x: '1/856', w: 'triTurtle', d: 637 }],
  ['21/976', '6-fold rosette', { x: '21/976', w: 'triTurtle', d: 361 }],
  ['96/95', '12 diagonal loops', { x: '96/95', w: 'torusGrid', d: 5760, s: '64x160' }],
  ['96/95', 'On cells', { x: '96/95', w: 'torusWalk', d: 4320, s: 48 }],
  ['226/221', 'Round a corner', { x: '226/221', w: 'cubeGrid', d: 289, s: 24 }],
  ['1/383', 'Round the tube', { x: '1/383', w: 'triTorusGrid', d: 9168, s: '63x168', st: 2, o: 1 }],
  ['120/109', 'A belt', { x: '120/109', w: 'hexSphereGrid', d: 5760, s: 32 }],
  ['Dragon', 'Paperfolding', { x: 'dragon', w: 'turtle', d: 20000 }],
  ['Thue–Morse', 'Koch curve', { x: 'thuemorse', w: 'triPivot', d: 4096 }],
  // added later: their batch number, so that a browser that took the first ones gets these once too (see seedCurated)
  ['Möbius battle', 'A battle of 2 colours round the strip', { x: 'random(801457958)', w: 'lifeMobius', s: 8, r: 'B3/S23', k: 2, sd: 'random.69.711421864',
    ch: 's3.74-0-0-0-1-1-2-1-0-1-0-0-0-1-0-1-2-0-1-4-0-0-0-0-0-2-0-0-1-1-0-1-1-1-0-0-0-0-0-0-0-0-e8_2-2_2-0_2-1_2-1_2-0_2-1_2-0_2-1_2-1_2-2_2-0_2-0_2-0_2-2_2-0_2-0_2-1_2-1_2-0_2-0_2-1_2-1_2-0_2-2_2-1_2-2_2-0_2-0_2-1_2-1_2-1_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2-0_2' }, 2],
  ['1/438', 'A highway from step 534,473', { x: '1/438', w: 'antSquare', d: 540989, r: 'digits LR' }, 2],
  ['Rabbit', 'Fibonacci word fractal', { x: 'rabbit', w: 'squareParity', d: 4181 }],
  ['Rudin–Shapiro', 'On hexagons', { x: 'rudinshapiro', w: 'hexTurtle', d: 16384 }],
  ['Primes', 'Their barcode', { x: 'primes', w: 'spiral', d: 20000 }],
  ['π', '20,000 digits', { x: 'pi', w: 'turtle', d: 20000 }],
];
// the walk's name, as in the walk list ("Squares turtle"; a surface's own name)
const walkName = (w) => splitModeLabel($('mode').querySelector(`option[value="${w}"]`)?.text ?? w).name;
// the setup in use: same number, walk, size and start (the digits may have been cut by a loop)
// the same setup: the same number, mode, size, start and form; for Life, also its colours, start, symmetry,
// edges and cells drawn or found (what is seen; not the tools that found it: the hunt's buttons, Draw's brush)
const isInUse = (setup) => { const now = getSetup(); return ['x', 'w', 's', 'st', 'o', 'q', 'k', 'sd', 'y', 'e', 'p', 'ch'].every((k) => String(setup[k] ?? '') === String(now[k] ?? '')); };
let galleryBefore = null, galleryHover = 0;  // the setup in use while others are shown on hover
// and its view (Auto-fit, Auto-rotate, camera, framing): a setup shown on hover is framed (Auto-fit on)
// and, in 3D, turning (Auto-rotate on); a click keeps that, turning on; leaving the list brings back
// the setup in use as it was seen
let galleryView = null;
// and what is not in a link: the hunt's zone, goal and results (all of it, kept in one place)
const viewNow = () => ({ autoFit: $('autoFit').checked, autoRotate: $('autoRotate').checked, cam: { r: [...cam.r], u: [...cam.u], v: [...cam.v] }, view: { ...view },
  hunt: { zone: hunt.zone, goal: hunt.goal, top: hunt.top, picked: hunt.picked, status: hunt.status } });
// A setup's row, built-in or saved: the walk's icon, a name and a detail; hovering shows it, a click
// keeps it (see the lists' mouseleave); with onDelete, a × at its end
// A setup of the Gallery is shown framed and facing its walk: Auto-fit on (a hand rotation or zoom
// may have turned it off, and the walk could be on the far side), kept only by a click
function showSetup(setup) {  // framed and faced once built (see showAll), not before: the walk is built apart
  $('autoFit').checked = true;
  $('autoRotate').checked = false;  // still while it is faced (faceWalk does not turn a turning view)
  spinFrom = 0;
  pendingSpin = true;  // then turning, in 3D, a moment later (see applyPendingView)
  applySetup(setup);
}
function setupRow(name, detail, setup, onDelete) {
  const b = document.createElement('button');
  const part = (cls, text) => { const e = document.createElement('span'); e.className = cls; e.textContent = text; return e; };
  const words = document.createElement('span'), pic = part('mode-icon', '');
  words.append(part('mode-name', name), part('mode-detail', detail));
  pic.innerHTML = icon(SHAPE_ICONS[NAV[setup.w]?.[2]] ?? MODE_ICONS[setup.w]);  // its shape's picture, as the Grid's (the sphere, not its hexagons)
  b.append(pic, words);
  b.title = `${name}\n${detail}`;  // in full, as the row may cut them short
  if (onDelete) {
    const x = part('row-delete', '×');
    x.title = `Delete “${name}”`;
    x.addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });
    b.append(x);
  }
  b.setAttribute('role', 'option');
  b.classList.toggle('active', !galleryBefore && isInUse(setup));
  b.addEventListener('mouseenter', () => {
    clearTimeout(galleryHover);
    galleryHover = setTimeout(() => { if (!galleryBefore) { galleryBefore = getSetup(); galleryView = viewNow(); } showSetup(setup); }, 120);
  });
  b.addEventListener('click', () => {
    clearTimeout(galleryHover);
    if (!galleryBefore || !isInUse(setup)) showSetup(setup);
    pendingSpin = false;  // clicked while still: it stays still (already turning: it goes on)
    spinFrom = 0;
    galleryBefore = galleryView = null;  // kept, Auto-fit on: leaving the list no longer brings back the one before
    syncLink();  // its link (if already built; else once built)
    renderModePicker();  // its tab, at the top
    showPane(false);  // and its parameters
  });
  return b;
}
function renderGallery() {
  fillSetupList();
}
for (const list of ['yourList']) {
  $(list).addEventListener('mouseleave', () => {
    clearTimeout(galleryHover);
    if (!galleryBefore) return;
    const before = galleryBefore;
    galleryBefore = null;
    pendingRestore = galleryView;
    galleryView = null;
    pendingSpin = false;
    spinFrom = 0;
    applySetup(before);
  });
}
// The left pane shows the parameters, or the gallery: opened by hovering the Gallery tab (until the
// mouse leaves the tab and the pane) or kept open by a click on it; a setup clicked, or another tab,
// brings back the parameters
let galleryKept = false, galleryClose = 0;
function showPane(gallery) {
  if (!gallery) galleryKept = false;
  $('paramsPane').hidden = gallery;
  $('galleryPane').hidden = !gallery;
  galleryTab().classList.toggle('open', gallery);
  if (gallery) renderGallery();
}
const galleryButton = document.createElement('button');
function galleryTab() {
  if (galleryButton.dataset.ready) return galleryButton;
  const b = galleryButton;
  b.dataset.ready = '1';
  b.className = 'gallery-tab';
  b.innerHTML = `${icon('gallery')} Gallery`;
  b.title = 'Treasures and the curated setups: hover one to see it, click it to keep it';
  b.addEventListener('mouseenter', () => { clearTimeout(galleryClose); showPane(true); });
  b.addEventListener('click', () => { galleryKept = true; showPane(true); });
  return b;
}
// leaving the tab or the pane closes it at once, unless the mouse goes from one to the other: straight
// in, or across the header's bare strip between them (a short grace for that)
const leaveGallery = (e) => {
  clearTimeout(galleryClose);
  if (galleryKept || $('galleryPane').hidden) return;
  const to = e.relatedTarget, pane = document.querySelector('aside.panel');
  if (to && (pane.contains(to) || galleryButton.contains(to))) return;
  if (to && (to.tagName === 'HEADER' || to.classList?.contains('header-row') || to.id === 'modeTabs')) {
    galleryClose = setTimeout(() => showPane(false), 120);
    return;
  }
  showPane(false);
};
galleryButton.addEventListener('mouseleave', leaveGallery);
galleryButton.addEventListener('mouseenter', () => clearTimeout(galleryClose));
document.querySelector('aside.panel').addEventListener('mouseleave', leaveGallery);
document.querySelector('aside.panel').addEventListener('mouseenter', () => clearTimeout(galleryClose));

$('setupSave').addEventListener('click', saveSetup);
$('setupExport').addEventListener('click', exportSetups);
$('setupImport').addEventListener('click', () => $('setupFile').click());
$('setupFile').addEventListener('change', () => {
  if ($('setupFile').files[0]) importSetups($('setupFile').files[0]);
  $('setupFile').value = '';
});
// a setup link pasted into this tab
window.addEventListener('hashchange', () => { const s = parseHash(); if (s) applySetup(s); });


/* ---- 12.3 Start-up --------------------------------------------------------------------------- */
// A link with a setup opens that setup; otherwise π on the turtle walk. The link then follows the
// setup on its events (see syncLink).
new ResizeObserver(resize).observe(stage);
new ResizeObserver(() => { statsDirty = true; }).observe($('animBar'));  // the bar opened or closed: its digits fill its new width
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
$('version').textContent = `v${VERSION}`;
for (const b of document.querySelectorAll('[data-icon]')) b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon));
play(false);  // the Play button with its icon
seedCurated();
fillSetupList();
const linked = parseHash();  // a link with a setup opens that setup; otherwise the default one
if (!linked || !applySetup(linked)) compute();
showPane(false);

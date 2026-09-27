'use strict';

/* ------------------------------------------------------------------ *
 * Calcul des chiffres en base b (Web Worker, BigInt)                  *
 * On calcule c·b^(N+G) en entiers (G = chiffres de garde contre les   *
 * erreurs d'arrondi), on divise par b^G puis toString(b).             *
 * ------------------------------------------------------------------ */
function constantWorker() {
  self.onmessage = (e) => {
    const { id, n, base } = e.data;
    const B = BigInt(base);
    const t0 = performance.now();
    const guard = 30 + Math.ceil(Math.log(n) / Math.log(base));
    const prec = n + guard;
    const S = B ** BigInt(prec);
    const lnS = prec * Math.log(base);
    let done = 0, total = 1;
    const progress = (i) => {
      if (i % 500 === 0) self.postMessage({ type: 'progress', p: (done + i) / total });
    };

    // S·arctan(1/x), ou S·artanh(1/x) si hyperbolic
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

    // racine carrée entière (Newton, précision doublée récursivement)
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

    let v;
    switch (id) {
      case 'pi': // Machin : π = 16·arctan(1/5) − 4·arctan(1/239)
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
      case 'zeta3': { // Amdeberhan–Zeilberger : ζ(3) = 1/64 Σ (−1)^k (205k²+250k+77)·(k!)^10/((2k+1)!)^5
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
      case 'E': { // Erdős–Borwein : E = Σ 1/(2^n − 1) = Σ 2^(−n²)·(2^n + 1)/(2^n − 1)
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
      case 'sqrt2': v = isqrt(2n * S * S); break;
      case 'sqrt3': v = isqrt(3n * S * S); break;
      case 'sqrt5': v = isqrt(5n * S * S); break;
    }

    self.postMessage({ type: 'progress', p: 1 });
    const s = (v / B ** BigInt(guard)).toString(base).padStart(n + 1, '0');
    const intPart = s.slice(0, s.length - n);
    const digits = new Uint8Array(n);
    for (let i = 0; i < n; i++) digits[i] = s.charCodeAt(intPart.length + i) - 48;
    self.postMessage({ type: 'done', intPart, digits, ms: performance.now() - t0 }, [digits.buffer]);
  };
}

/* ------------------------------------------------------------------ *
 * État                                                                *
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const fmt = (v) => v.toLocaleString('en');
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, O (y vers le bas à l'écran)
const H = Math.sqrt(3) / 2;                        // hauteur d'un triangle de côté 1
const TRI_Y0 = -2 * H / 3;                         // décalage pour que le centre du triangle de départ soit en (0, 0)
const BANDS = 256;
const GRADIENT = Array.from({ length: BANDS }, (_, i) =>
  `hsl(${190 + (200 * i) / (BANDS - 1)}, 85%, 60%)`);
const DIGIT_COLORS = ['#4ea1ff', '#e6edf3', '#ff7b72', '#3fb950', '#d2a8ff', '#ffa657'];
const MONO = '#f0b429';

const CONSTANTS = {
  pi:    { sym: 'π',    name: 'Pi' },
  e:     { sym: 'e',    name: "Euler's number" },
  phi:   { sym: 'φ',    name: 'Golden ratio' },
  sqrt2: { sym: '√2',   name: 'Square root of 2' },
  sqrt3: { sym: '√3',   name: 'Square root of 3' },
  sqrt5: { sym: '√5',   name: 'Square root of 5' },
  ln2:   { sym: 'ln 2', name: 'Natural log of 2' },
  zeta3: { sym: 'ζ(3)', name: "Apéry's constant" },
  E:     { sym: 'E',    name: 'Erdős–Borwein constant' },
};

const MODES = {
  turtle:   { base: 3, lattice: 'square',
              rule: 'Base-3 digits on a square grid — <b>0</b> = turn left + step, <b>1</b> = step forward, <b>2</b> = turn right + step' },
  cardinal: { base: 4, lattice: 'square',
              rule: 'Base-4 digits on a square grid — <b>0</b> = step north, <b>1</b> = east, <b>2</b> = south, <b>3</b> = west' },
  triLR:    { base: 2, lattice: 'tri',
              rule: 'Base-2 digits on triangle tiles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge' },
  triFixed: { base: 3, lattice: 'tri',
              rule: 'Base-3 digits on triangle tiles — cross the <b>0</b> = horizontal edge, <b>1</b> = “/” edge, <b>2</b> = “\\” edge' },
  hexRel:   { base: 5, lattice: 'hex',
              rule: 'Base-5 digits on hexagonal tiles, relative to the edge you came in through — <b>0</b> = sharp left, <b>1</b> = left, <b>2</b> = straight, <b>3</b> = right, <b>4</b> = sharp right' },
  hexFixed: { base: 6, lattice: 'hex',
              rule: 'Base-6 digits on hexagonal tiles — <b>0</b> = N, <b>1</b> = NE, <b>2</b> = SE, <b>3</b> = S, <b>4</b> = SW, <b>5</b> = NW' },
  cubeRel:  { base: 5, lattice: 'cube',
              rule: 'Base-5 digits in 3D cubes, relative to your heading — <b>0</b> = turn left, <b>1</b> = turn up, <b>2</b> = straight, <b>3</b> = turn down, <b>4</b> = turn right' },
  cubeFixed: { base: 6, lattice: 'cube',
              rule: 'Base-6 digits in 3D cubes — <b>0</b> = north, <b>1</b> = east, <b>2</b> = up, <b>3</b> = south, <b>4</b> = west, <b>5</b> = down' },
};

const cache = {};        // "id/base" → { intPart: "10", digits: Uint8Array (partie fractionnaire) }
let current = null;      // entrée du cache affichée + mode de marche
let worker = null;

const walk = {
  n: 0,            // nombre de pas
  digits: null,    // chiffre de chaque pas
  xs: null, ys: null,  // positions (centres des cases) des n+1 points
  cells: null,     // cases distinctes visitées jusqu'au point i
  maxDist: null,   // distance max jusqu'au point i
  base: 3,
  counts: null,    // nombre cumulé de chaque chiffre jusqu'au pas i (base valeurs par point)
};

let cur = 0;        // nombre de pas effectués
let drawn = 0;      // nombre de pas déjà tracés sur le calque
let playing = false;
let acc = 0;
let needsFull = true;
let statsDirty = true;
let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const view = { scale: 20, ox: 0, oy: 0 };
const cam = { yaw: -0.6, pitch: 0.5 };   // rotation de la vue 3D (radians)
let bounds3 = null;                        // boîte englobante 3D des points 0..cur

const stage = $('stage');
const layers = {
  grid: $('gridLayer').getContext('2d'),
  path: $('pathLayer').getContext('2d'),
  overlay: $('overlayLayer').getContext('2d'),
};
let cw = 0, ch = 0;

/* ------------------------------------------------------------------ *
 * Calcul et construction de la marche                                 *
 * ------------------------------------------------------------------ */
function updateRuleText() {
  const { base, rule } = MODES[$('mode').value];
  $('rule').innerHTML = rule;
  $('sCountsLabel').textContent = Array.from({ length: base }, (_, i) => i).join(' / ');
}

function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(1_000_000, Math.max(10, n || 10));
}

function compute() {
  const n = requestedDigits();
  const id = $('constant').value;
  const { sym } = CONSTANTS[id];
  $('digits').value = n;
  $('titleSym').textContent = sym;
  const { base } = MODES[$('mode').value];
  const key = `${id}/${base}`;
  updateRuleText();
  if (cache[key] && cache[key].digits.length >= n) {
    current = { ...cache[key], mode: $('mode').value };
    $('status').textContent = `${fmt(n)} base-${base} digits of ${sym} (cached)`;
    buildWalk();
    play(true);
    return;
  }
  if (worker) worker.terminate();
  const src = `(${constantWorker.toString()})()`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  $('status').textContent = `Computing ${fmt(n)} base-${base} digits of ${sym}…`;
  worker.onmessage = (e) => {
    if (e.data.type === 'progress') {
      $('progressBar').style.width = `${Math.min(100, e.data.p * 100)}%`;
    } else {
      cache[key] = { intPart: e.data.intPart, digits: e.data.digits };
      current = { ...cache[key], mode: $('mode').value };
      worker.terminate();
      worker = null;
      setBusy(false);
      $('status').textContent =
        `${fmt(n)} base-${base} digits of ${sym} computed in ${(e.data.ms / 1000).toFixed(2)} s`;
      buildWalk();
      play(true);
    }
  };
  worker.postMessage({ id, n, base });
}

function setBusy(busy) {
  $('compute').disabled = busy;
  $('compute').textContent = busy ? 'Computing…' : 'Compute';
  $('progressBar').style.width = busy ? '0' : '100%';
}

function intDigits() {
  return $('intPart').checked ? Array.from(current.intPart, Number) : [];
}

function buildWalk() {
  const n = requestedDigits();
  const head = intDigits();
  const seq = new Uint8Array(head.length + n);
  seq.set(head);
  seq.set(current.digits.subarray(0, n), head.length);
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
                        xs: is3d ? new Float64Array(len + 1) : wx,
                        ys: is3d ? new Float64Array(len + 1) : wy });
  if (is3d) project();
  updateHint();
  restart();
}

// Projection orthographique de la marche 3D sur le plan de l'écran (xs, ys)
function project() {
  const { wx, wy, wz, xs, ys } = walk;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  for (let i = 0; i < xs.length; i++) {
    xs[i] = wx[i] * cy - wy[i] * sy;
    ys[i] = -(wz[i] * cp + (wx[i] * sy + wy[i] * cy) * sp);
  }
}

// Après une rotation : recalcule la projection et la boîte englobante 2D
function rotateView(dyaw, dpitch) {
  cam.yaw += dyaw;
  cam.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cam.pitch + dpitch));
  if (!walk.is3d) return;
  project();
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

/* Chaque stepper reçoit un chiffre et renvoie [clé, x, y, z] : la clé
 * unique de la case et la position de son centre (z = 0 en 2D ; en 2D
 * y pointe vers le bas de l'écran, en 3D z pointe vers le haut).      */
const STEPPERS = {
  turtle() {
    let x = 0, y = 0, d = 0;
    return (g) => {
      if (g === 0) d = (d + 3) % 4;       // gauche
      else if (g === 2) d = (d + 1) % 4;  // droite
      x += DIRS[d][0]; y += DIRS[d][1];
      return [key(x, y), x, y, 0];
    };
  },
  cardinal() {
    let x = 0, y = 0;
    return (g) => {
      x += DIRS[g][0]; y += DIRS[g][1];  // le chiffre donne la direction
      return [key(x, y), x, y, 0];
    };
  },
  triLR: () => triStepper(true),
  triFixed: () => triStepper(false),
  hexRel: () => hexStepper(true),
  hexFixed: () => hexStepper(false),
  cubeRel: () => cubeStepper(true),
  cubeFixed: () => cubeStepper(false),
};

/* Réseau cubique : x = est, y = nord, z = haut.
 * Fixe : 0 = N, 1 = E, 2 = haut, 3 = S, 4 = O, 5 = bas (opposés à ±3).
 * Relatif : repère (avant f, haut u), gauche = u × f.
 *   0 = gauche, 1 = monter, 2 = tout droit, 3 = descendre, 4 = droite. */
const CUBE_DIRS = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a) => [-a[0], -a[1], -a[2]];

function cubeStepper(relative) {
  let x = 0, y = 0, z = 0;
  let f = [0, 1, 0], u = [0, 0, 1]; // départ vers le nord, tête en haut
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

/* Pavage hexagonal (hexagones à sommet plat, centres à distance 1).
 * Position = a·u0 + b·u1 avec u0 = N = (0, −1) et u1 = NE = (H, −1/2) à l'écran.
 * Directions dans le sens horaire : 0 = N, 1 = NE, 2 = SE, 3 = S, 4 = SO, 5 = NO. */
const HEX_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

function hexStepper(relative) {
  let a = 0, b = 0, d = 0; // départ orienté vers le nord
  return (g) => {
    d = relative ? (d + g - 2 + 6) % 6 : g;  // relatif : 0 = virage serré à gauche … 4 = serré à droite
    a += HEX_DIRS[d][0]; b += HEX_DIRS[d][1];
    return [key(a, b), b * H, -a - b / 2, 0];
  };
}

/* Pavage en triangles : la case (c, r) pointe vers le haut si c + r est pair.
 * Arêtes : 0 = horizontale, 1 = « / », 2 = « \ ».
 * Triangle ▲ : 0 → dessous (c, r+1), 1 → gauche (c−1, r), 2 → droite (c+1, r)
 * Triangle ▼ : 0 → dessus (c, r−1), 1 → droite (c+1, r), 2 → gauche (c−1, r)
 * Arêtes dans le sens trigonométrique : ▲ [2, 1, 0], ▼ [0, 2, 1] ; en entrant
 * par l'arête e, la suivante dans ce sens est à droite, l'autre à gauche.      */
const TRI_CCW = { up: [2, 1, 0], down: [0, 2, 1] };

function triStepper(leftRight) {
  let c = 0, r = 0, entry = 0; // départ : triangle ▲ en (0, 0), entré par le bas
  return (g) => {
    const up = ((c + r) & 1) === 0;
    let edge = g;
    if (leftRight) {
      const ccw = up ? TRI_CCW.up : TRI_CCW.down;
      const i = ccw.indexOf(entry);
      edge = ccw[(i + (g === 1 ? 1 : 2)) % 3];  // 0 = gauche, 1 = droite
    }
    if (edge === 0) r += up ? 1 : -1;
    else c += (edge === 1) === up ? -1 : 1;
    entry = edge;
    const upNow = ((c + r) & 1) === 0;
    return [key(c, r), c / 2, r * H + (upNow ? 2 * H / 3 : H / 3) + TRI_Y0, 0];
  };
}

function key(x, y) {
  return (x + 2 ** 21) * 2 ** 22 + (y + 2 ** 21);
}

/* ------------------------------------------------------------------ *
 * Animation                                                           *
 * ------------------------------------------------------------------ */
function stepsPerFrame() {
  const v = Number($('speed').value) / 100;
  return 10 ** (v * 5 - 1); // 0,1 → 10 000 pas par image
}

function updateSpeedLabel() {
  const s = stepsPerFrame() * 60;
  $('speedLabel').textContent = `${s < 100 ? s.toFixed(s < 10 ? 1 : 0) : fmt(Math.round(s))} steps/s`;
}

function advanceTo(target) {
  target = Math.min(walk.n, target);
  const { xs, ys, wx, wy, wz, is3d } = walk;
  for (let i = cur + 1; i <= target; i++) {
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
  if ($('autoFit').checked) fitToBounds({ minX: -3, maxX: 3, minY: -3, maxY: 3 });
  needsFull = true;
  statsDirty = true;
  play(false);
}

/* ------------------------------------------------------------------ *
 * Vue (zoom / déplacement)                                            *
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
 * Rendu                                                               *
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
  // axes passant par l'origine
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.moveTo(Math.round(view.ox) + 0.5, 0); ctx.lineTo(Math.round(view.ox) + 0.5, ch);
  ctx.moveTo(0, Math.round(view.oy) + 0.5); ctx.lineTo(cw, Math.round(view.oy) + 0.5);
  ctx.stroke();
}

// 3D : boîte englobante de la marche (fil de fer) + repère des axes en haut à gauche
function draw3DFrame(ctx) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const proj = (x, y, z) => [x * cy - y * sy, -(z * cp + (x * sy + y * cy) * sp)];
  const [x0, x1, y0, y1, z0, z1] = bounds3;
  const X = [x0, x1], Y = [y0, y1], Z = [z0, z1];
  const pt = (i, j, k) => {
    const [px, py] = proj(X[i], Y[j], Z[k]);
    return [view.ox + px * view.scale, view.oy + py * view.scale];
  };
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    for (const [p, q] of [[pt(0, a, b), pt(1, a, b)], [pt(a, 0, b), pt(a, 1, b)], [pt(a, b, 0), pt(a, b, 1)]]) {
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
  }
  ctx.stroke();
  // repère : x = est (rouge), y = nord (vert), z = haut (bleu)
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

// Hexagones à sommet plat de rayon 1/√3 ; chacun trace ses 3 arêtes du haut
// (les 3 du bas sont celles des voisins S, SE et SO). Masqué si trop petit.
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

// Réseau triangulaire : droites y = y0 + k·H, x ± (y − y0)/√3 = k (k multiple de step)
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
    case 'digit': return walk.digits[i];
    case 'mono': return 0;
    default: return Math.floor((i * BANDS) / walk.n);
  }
}

function styleColor(k) {
  switch ($('colorMode').value) {
    case 'digit': return DIGIT_COLORS[k];
    case 'mono': return MONO;
    default: return GRADIENT[k];
  }
}

// Trace les segments [from, to) : le segment i relie le point i au point i+1.
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
    ctx.beginPath();
    ctx.moveTo(ox + xs[i] * s, oy + ys[i] * s);
    while (i < to && styleKey(i) === k) {
      ctx.lineTo(ox + xs[i + 1] * s, oy + ys[i + 1] * s);
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
  // départ
  ctx.fillStyle = '#3fb950';
  ctx.beginPath();
  ctx.arc(ox, oy, r, 0, Math.PI * 2);
  ctx.fill();
  // position courante + cap
  const x = ox + walk.xs[cur] * s;
  const y = oy + walk.ys[cur] * s;
  // cap = direction du dernier pas (vers le haut au départ)
  let dx = 0, dy = -1;
  if (cur > 0) {
    const ux = walk.xs[cur] - walk.xs[cur - 1], uy = walk.ys[cur] - walk.ys[cur - 1];
    const l = Math.hypot(ux, uy);
    if (l > 1e-6) { dx = ux / l; dy = uy / l; } else { dx = 0; dy = 0; } // pas dans l'axe de la vue
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
  $('sCells').textContent = walk.n ? fmt(walk.cells[cur]) : '1';
  if (walk.n) {
    const c = walk.counts.subarray(walk.base * cur, walk.base * (cur + 1));
    $('sCounts').textContent = Array.from(c, fmt).join(' / ');
  }
  // bandeau des chiffres autour du pas courant
  const strip = $('digitStrip');
  if (!walk.n) { strip.textContent = ''; return; }
  const before = 36, after = 20;
  const a = Math.max(0, cur - before);
  const b = Math.min(walk.n, cur + after);
  const d = walk.digits;
  const intLen = intDigits().length;
  let html = a > 0 ? '…' : (intLen ? '' : `${current.intPart}.`);
  for (let i = a; i < b; i++) {
    html += i === cur - 1 ? `<span class="cur">${d[i]}</span>` : d[i];
    if (i === intLen - 1) html += '.';
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
  if (needsFull || (walk.is3d && statsDirty)) drawGrid(); // la boîte 3D grandit avec la marche
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
 * Interactions                                                        *
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
$('intPart').addEventListener('change', () => { if (current) buildWalk(); });
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
    rotateView(dx * 0.008, dy * 0.008);
  }
});
const endDrag = () => { drag = null; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('dblclick', fitNow);

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type=number], select')) return;
  switch (e.key) {
    case ' ': e.preventDefault(); $('play').click(); break;
    case 'ArrowRight': $('step').click(); break;
    case 'r': case 'R': $('restart').click(); break;
    case 'e': case 'E': $('end').click(); break;
    case 'f': case 'F': fitNow(); break;
  }
});

for (const [id, { sym, name }] of Object.entries(CONSTANTS)) {
  $('constant').add(new Option(`${sym} — ${name}`, id));
}
$('constant').addEventListener('change', compute);
$('mode').addEventListener('change', compute);

new ResizeObserver(resize).observe(stage);
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
compute();

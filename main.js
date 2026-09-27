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
const DIGIT_COLORS = ['#4ea1ff', '#e6edf3', '#ff7b72', '#3fb950'];
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
  turtle:   { base: 3, tri: false,
              rule: 'Base-3 digits on a square grid — <b>0</b> = turn left + step, <b>1</b> = step forward, <b>2</b> = turn right + step' },
  cardinal: { base: 4, tri: false,
              rule: 'Base-4 digits on a square grid — <b>0</b> = step north, <b>1</b> = east, <b>2</b> = south, <b>3</b> = west' },
  triLR:    { base: 2, tri: true,
              rule: 'Base-2 digits on triangle tiles — <b>0</b> = exit through the left edge, <b>1</b> = exit through the right edge' },
  triFixed: { base: 3, tri: true,
              rule: 'Base-3 digits on triangle tiles — cross the <b>0</b> = horizontal edge, <b>1</b> = “/” edge, <b>2</b> = “\\” edge' },
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
  const xs = new Float64Array(len + 1);
  const ys = new Float64Array(len + 1);
  const cells = new Int32Array(len + 1);
  const maxDist = new Float64Array(len + 1);
  const { base } = MODES[current.mode];
  const step = STEPPERS[current.mode]();
  const counts = new Int32Array(base * (len + 1));
  const seen = new Set([key(0, 0)]);
  let m = 0;
  cells[0] = 1;
  for (let i = 0; i < len; i++) {
    const g = seq[i];
    const [a, b, x, y] = step(g);
    xs[i + 1] = x; ys[i + 1] = y;
    seen.add(key(a, b));
    cells[i + 1] = seen.size;
    m = Math.max(m, Math.hypot(x, y));
    maxDist[i + 1] = m;
    for (let c = 0; c < base; c++) counts[base * (i + 1) + c] = counts[base * i + c];
    counts[base * (i + 1) + g]++;
  }
  Object.assign(walk, { n: len, digits: seq, xs, ys, tri: MODES[current.mode].tri, cells, maxDist, base, counts });
  restart();
}

/* Chaque stepper reçoit un chiffre et renvoie [case a, case b, x, y] :
 * les coordonnées entières de la case et la position de son centre.   */
const STEPPERS = {
  turtle() {
    let x = 0, y = 0, d = 0;
    return (g) => {
      if (g === 0) d = (d + 3) % 4;       // gauche
      else if (g === 2) d = (d + 1) % 4;  // droite
      x += DIRS[d][0]; y += DIRS[d][1];
      return [x, y, x, y];
    };
  },
  cardinal() {
    let x = 0, y = 0;
    return (g) => {
      x += DIRS[g][0]; y += DIRS[g][1];  // le chiffre donne la direction
      return [x, y, x, y];
    };
  },
  triLR: () => triStepper(true),
  triFixed: () => triStepper(false),
};

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
    return [c, r, c / 2, r * H + (upNow ? 2 * H / 3 : H / 3) + TRI_Y0];
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
  const { xs, ys } = walk;
  for (let i = cur + 1; i <= target; i++) {
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
  if (walk.tri) {
    drawTriGrid(ctx, stepCells);
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
    dx = ux / l; dy = uy / l;
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
  const x = walk.n ? walk.xs[cur] : 0;
  const y = walk.n ? -walk.ys[cur] : 0;
  const p = (v) => fmt(Math.round(v * 100) / 100 || 0);
  $('sPos').textContent = `(${p(x)}, ${p(y)})`;
  $('sDist').textContent = Math.hypot(x, y).toFixed(1);
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
  if (needsFull) {
    drawGrid();
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
  drag = { x: e.clientX, y: e.clientY };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  view.ox += e.clientX - drag.x;
  view.oy += e.clientY - drag.y;
  drag = { x: e.clientX, y: e.clientY };
  userMovedView();
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

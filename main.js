'use strict';

/* ------------------------------------------------------------------ *
 * Calcul des chiffres de π en base 3 (Web Worker, BigInt, Machin)     *
 *   π = 16·arctan(1/5) − 4·arctan(1/239)                              *
 * On calcule π·3^(N+G) en entiers puis toString(3) donne "10" + N     *
 * chiffres (G = chiffres de garde contre les erreurs d'arrondi).      *
 * ------------------------------------------------------------------ */
function piWorker() {
  self.onmessage = (e) => {
    const n = e.data.n;
    const t0 = performance.now();
    const guard = 30 + Math.ceil(Math.log(n) / Math.log(3));
    const scale = 3n ** BigInt(n + guard);
    const termsFor = (x) => ((n + guard) * Math.log(3)) / (2 * Math.log(x));
    const total = termsFor(5) + termsFor(239);
    let done = 0;

    function arctanInv(x) {
      const bx = BigInt(x);
      const x2 = bx * bx;
      let term = scale / bx;
      let sum = term;
      let k = 1n;
      let sign = -1n;
      for (let i = 1; ; i++) {
        term /= x2;
        if (term === 0n) break;
        sum += sign * (term / (2n * k + 1n));
        k++;
        sign = -sign;
        if (i % 500 === 0) self.postMessage({ type: 'progress', p: (done + i) / total });
      }
      done += termsFor(x);
      return sum;
    }

    const pi = (16n * arctanInv(5) - 4n * arctanInv(239)) / 3n ** BigInt(guard);
    self.postMessage({ type: 'progress', p: 1 });
    const s = pi.toString(3);
    const digits = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) digits[i] = s.charCodeAt(i) - 48;
    self.postMessage({ type: 'done', digits, ms: performance.now() - t0 }, [digits.buffer]);
  };
}

/* ------------------------------------------------------------------ *
 * État                                                                *
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, O (y vers le bas à l'écran)
const BANDS = 256;
const GRADIENT = Array.from({ length: BANDS }, (_, i) =>
  `hsl(${190 + (200 * i) / (BANDS - 1)}, 85%, 60%)`);
const DIGIT_COLORS = ['#4ea1ff', '#e6edf3', '#ff7b72'];
const MONO = '#f0b429';

let fullDigits = null;   // "10" + fraction, en chiffres 0..2
let worker = null;

const walk = {
  n: 0,            // nombre de pas
  digits: null,    // chiffre de chaque pas
  xs: null, ys: null, dirs: null,  // positions/caps des n+1 points
  cells: null,     // cases distinctes visitées jusqu'au point i
  maxDist: null,   // distance max jusqu'au point i
  counts: null,    // nombre cumulé de 0 et 1 jusqu'au pas i
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
function requestedDigits() {
  const n = Math.round(Number($('digits').value));
  return Math.min(1_000_000, Math.max(10, n || 10));
}

function compute() {
  const n = requestedDigits();
  $('digits').value = n;
  if (fullDigits && fullDigits.length >= n + 2) {
    buildWalk();
    return;
  }
  if (worker) worker.terminate();
  const src = `(${piWorker.toString()})()`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  setBusy(true);
  $('status').textContent = `Calcul de ${n.toLocaleString('fr')} chiffres…`;
  worker.onmessage = (e) => {
    if (e.data.type === 'progress') {
      $('progressBar').style.width = `${Math.min(100, e.data.p * 100)}%`;
    } else {
      fullDigits = e.data.digits;
      worker.terminate();
      worker = null;
      setBusy(false);
      $('status').textContent =
        `${n.toLocaleString('fr')} chiffres calculés en ${(e.data.ms / 1000).toFixed(2)} s`;
      buildWalk();
      play(true);
    }
  };
  worker.postMessage({ n });
}

function setBusy(busy) {
  $('compute').disabled = busy;
  $('compute').textContent = busy ? 'Calcul…' : 'Calculer';
  if (busy) $('progressBar').style.width = '0';
}

function buildWalk() {
  const n = requestedDigits();
  const seq = $('intPart').checked ? fullDigits.subarray(0, n + 2) : fullDigits.subarray(2, n + 2);
  const len = seq.length;
  const xs = new Int32Array(len + 1);
  const ys = new Int32Array(len + 1);
  const dirs = new Uint8Array(len + 1);
  const cells = new Int32Array(len + 1);
  const maxDist = new Float64Array(len + 1);
  const counts = new Int32Array(2 * (len + 1));
  const seen = new Set([key(0, 0)]);
  let x = 0, y = 0, d = 0, m = 0;
  cells[0] = 1;
  for (let i = 0; i < len; i++) {
    const g = seq[i];
    if (g === 0) d = (d + 3) % 4;       // gauche
    else if (g === 2) d = (d + 1) % 4;  // droite
    x += DIRS[d][0];
    y += DIRS[d][1];
    xs[i + 1] = x; ys[i + 1] = y; dirs[i + 1] = d;
    seen.add(key(x, y));
    cells[i + 1] = seen.size;
    m = Math.max(m, Math.hypot(x, y));
    maxDist[i + 1] = m;
    counts[2 * (i + 1)] = counts[2 * i] + (g === 0);
    counts[2 * (i + 1) + 1] = counts[2 * i + 1] + (g === 1);
  }
  Object.assign(walk, { n: len, digits: seq, xs, ys, dirs, cells, maxDist, counts });
  restart();
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
  $('speedLabel').textContent = `${s < 100 ? s.toFixed(s < 10 ? 1 : 0) : Math.round(s).toLocaleString('fr')} pas/s`;
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
  $('play').textContent = playing ? '❚❚ Pause' : '▶︎ Lecture';
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
  const [dx, dy] = DIRS[walk.dirs[cur]];
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
  const fmt = (v) => v.toLocaleString('fr');
  $('sStep').textContent = `${fmt(cur)} / ${fmt(walk.n)}`;
  const x = walk.n ? walk.xs[cur] : 0;
  const y = walk.n ? -walk.ys[cur] : 0;
  $('sPos').textContent = `(${fmt(x)}, ${fmt(y)})`;
  $('sDist').textContent = Math.hypot(x, y).toFixed(1);
  $('sMax').textContent = walk.n ? walk.maxDist[cur].toFixed(1) : '0';
  $('sCells').textContent = walk.n ? fmt(walk.cells[cur]) : '1';
  if (walk.n) {
    const c0 = walk.counts[2 * cur], c1 = walk.counts[2 * cur + 1];
    $('sCounts').textContent = `${fmt(c0)} / ${fmt(c1)} / ${fmt(cur - c0 - c1)}`;
  }
  // bandeau des chiffres autour du pas courant
  const strip = $('digitStrip');
  if (!walk.n) { strip.textContent = ''; return; }
  const before = 36, after = 20;
  const a = Math.max(0, cur - before);
  const b = Math.min(walk.n, cur + after);
  const d = walk.digits;
  let html = a > 0 ? '…' : ($('intPart').checked ? '' : '10.');
  for (let i = a; i < b; i++) {
    html += i === cur - 1 ? `<span class="cur">${d[i]}</span>` : d[i];
    if ($('intPart').checked && i === 1) html += '.';
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
$('intPart').addEventListener('change', () => { if (fullDigits) buildWalk(); });
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

new ResizeObserver(resize).observe(stage);
updateSpeedLabel();
resize();
requestAnimationFrame(tick);
compute();

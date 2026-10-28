// Walking Pi's self-check, run in the page (it uses the app's own functions) before a commit:
//   await import(`/tools/check.js?${Date.now()}`); await walkingCheck();   // the meshes, a few seconds
//   await walkingCheck({ crawl: true });                                   // and every tab, shape and tiling, a few minutes
//   await walkingCheck({ fuzz: 400, seed: 7 });                            // 400 actions at random, menu to menu (transitions, smallest sizes)
//   await walkingCheck({ fuzz: 100, cold: true });                          // and after each, its link loaded cold beside: the same menus offered
//   await walkingCheck({ colours: true });                                 // every Life surface offers colours (more than Classic) at one of its sizes at least
//   await walkingCheck({ deep: true });                                    // every grid's rules (yours too), How it works, colours, zones, smallest size: a night's
//   await walkingCheck({ known: true });                                   // Life's known results, played on the graphics card: a minute
// Returns { ok, failures, checked }. The meshes: a torus straight and turned, its tiles' neighbours alike; a Möbius
// strip's cells away from its edges, as many neighbours as the torus of its tiles; each surface its cells as many as
// said; the grids that never repeat, their walls closed; those in a hexagon, their walls closed, turning onto themselves, as many cells as said. The crawl: no error, the link's mode the one shown, the size said its cells' count. Known:
// Life's oscillators' periods and methuselahs' loops (PATTERNS.md's), a hunt's best, reversible rules' returns to their start.

const neighbourCounts = (g, keep = () => true) => {  // how many cells have k neighbours, as shares
  const { start } = cornerNeighbours(g), walls = new Set(g.walls ?? []), c = {};
  let n = 0;
  for (let t = 0; t < g.n; t++) if (!walls.has(t) && keep(t)) { const k = start[t + 1] - start[t]; c[k] = (c[k] ?? 0) + 1; n++; }
  for (const k in c) c[k] /= n;
  return c;
};
const alike = (a, b) => Object.keys({ ...a, ...b }).every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 0.02);
const within = (a, b) => Object.keys(a).every((k) => k in b);  // (a's counts all among b's)
const show = (c) => Object.entries(c).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' ');

// a strip's tiles and the torus of the same tiles
const STRIP_TORUS = { mobius: 'torus', mobiusHex: 'torusHex', mobiusTri: 'torusTri', mobiusHexTurned: 'torusHex', mobiusTriTurned: 'torusTri', mobiusCairo: 'torusCairo', mobiusKite: 'torusKite', mobiusKiteTurned: 'torusKite' };
const torusOfStrip = (strip) => STRIP_TORUS[strip] ?? FOLDS.torus.of(MOBIUS_STRIPS[strip].kind);

function checkMeshes(fail) {
  let checked = 0;
  const size = () => 12;  // (a size every torus takes)
  // the tori: their cells as many as said; a tiling's, straight and turned alike
  const tori = Object.keys(SPHERES).filter((k) => /torus/.test(k) && !/Turned$/.test(k));
  const ref = {};
  // each tile's sheet corners its corners, in the same order (unrolled, its grid's edges drawn from them, see glSurface)
  const sheetOff = (g) => { let bad = 0; for (let s = 0; s < g.n * g.sides; s++) { const v = g.poly[s], P = sheetPoint(g, g.uv[2 * s], g.uv[2 * s + 1], 1); bad += Math.hypot(P[0] - g.verts[3 * v], P[1] - g.verts[3 * v + 1], P[2] - g.verts[3 * v + 2]) > 1e-6; } return bad; };
  // a tiling's lattice: b a quarter turn clockwise from a on screen (see tools/tilings/build.js); its sheets alike, B from A:
  // the plane's tiles turned on its tori, not mirrored (see torusSheets)
  for (const [kind, { basis: [a, b] }] of Object.entries(TILINGS)) { checked++; if (a[0] * b[1] - a[1] * b[0] <= 0) fail(`${kind}: its lattice listed the other way round`); }
  for (const kind of Object.keys(TILINGS)) if (TILINGS[kind].torus) for (const [way, S] of Object.entries(torusSheets(kind))) if (Array.isArray(S)) {
    const [a, b] = TILINGS[kind].basis, W = ([u, v]) => [u * a[0] + v * b[0], u * a[1] + v * b[1]], A = W(S[0]), B = W(S[1]);
    checked++;
    if (A[0] * B[1] - A[1] * B[0] <= 0) fail(`${kind} ${way}: its torus the plane's mirror`);
  }
  for (const kind of tori) {
    const g = SPHERES[kind].mesh(size(kind)), c = neighbourCounts(g);
    ref[kind] = c;
    checked++;
    for (const [name, h] of [[kind, g], ...(TURNED[kind] && SPHERES[TURNED[kind]] ? [[TURNED[kind], SPHERES[TURNED[kind]].mesh(size(kind))]] : [])]) if (h.uv && !h.mobius) { const bad = sheetOff(h); if (bad) fail(`${name}: ${bad} sheet corners off their corners`); }
    if (SPHERES[kind].tiles(size(kind)) !== g.n) fail(`${kind}: ${g.n} cells, said ${SPHERES[kind].tiles(size(kind))}`);
    if (TURNED[kind] && SPHERES[TURNED[kind]]) {
      const h = neighbourCounts(SPHERES[TURNED[kind]].mesh(size(kind)));
      checked++;
      if (!alike(c, h)) fail(`${kind}: straight ${show(c)}, turned ${show(h)}`);
    }
  }
  // the strips: away from their edges (a lattice side and a half), as on the torus
  for (const kind of MOBIUS_KINDS) {
    const g = SPHERES[kind].mesh(6), torus = ref[torusOfStrip(kind)], far = g.tiling ? 1.5 * Math.max(...TILINGS[g.tiling].basis.map((v) => Math.hypot(...v))) : 2;
    const y = (t) => sheetMiddle(g, t)[1];  // (its middle across the strip)
    const inside = neighbourCounts(g, (t) => t < g.front && y(t) > far && y(t) < g.W - far);
    checked++;
    if (SPHERES[kind].tiles(6) !== g.n) fail(`${kind}: ${g.n} cells, said ${SPHERES[kind].tiles(6)}`);
    { const bad = sheetOff(g); if (bad) fail(`${kind}: ${bad} sheet corners off their corners`); }  // (as the tori's)
    if (mobiusMiddle(g) !== g.L / 2) fail(`${kind}: its back facing the view, not its front`);  // (its sheet laid east and south, as a torus's)
    if (!torus) fail(`${kind}: no torus of its tiles to compare with`);
    else if (!within(inside, torus)) fail(`${kind}: inside ${show(inside)}, its torus ${show(torus)}`);
  }
  // the grids that never repeat: their walls closed round them (a point just past each side of a cell, a hundredth of the
  // side out, in a cell or a wall; each tile in every square of 3 its box covers), sizes 16 to 64
  const sarea = (P) => P.reduce((t, p, i) => t + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0);
  for (const kind of Object.keys(APERIODIC)) for (const W of [16, 24, 32, 48, 64]) {
    const h = APERIODIC[kind](W), all = Array.from({ length: h.m }, (_, k) => h.poly(k)), grid = new Map();
    all.forEach((P, j) => {
      const xs = P.map((p) => Math.floor(p[0] / 3)), ys = P.map((p) => Math.floor(p[1] / 3));
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) (grid.get(`${x},${y}`) ?? grid.set(`${x},${y}`, []).get(`${x},${y}`)).push(j);
    });
    const covered = (x, y) => (grid.get(`${Math.floor(x / 3)},${Math.floor(y / 3)}`) ?? []).some((j) => insidePolygon(all[j], x, y));
    let gaps = 0;
    const dead = new Set(h.dead);
    for (const P of all.slice(0, W * W).filter((P, t) => !dead.has(t))) {  // (the live cells)
      const o = sarea(P) > 0 ? 1 : -1;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 1e-6 && !covered((a[0] + b[0]) / 2 + 0.01 * o * (b[1] - a[1]), (a[1] + b[1]) / 2 - 0.01 * o * (b[0] - a[0]))) gaps++;
      }
    }
    checked++;
    if (gaps) fail(`${kind} ${W}: its walls open (${gaps} sides)`);
  }
  // the six-fold grids with walls in a hexagon (see planeShape): their walls closed round the live cells, and the live
  // cells turning onto each other round its centre
  const saved = { torus: plane.torus };
  for (const kind of ['hex', 'tri', 'kite', ...Object.keys(TILINGS), ...Object.keys(RECTS)]) {
    if (!tilingOf(kind) && !PLANE_PER[kind] || !hexagonFits(kind)) continue;  // (a rectangle's cells: built when first asked for, if any)
    Object.assign(plane, { torus: false });
    const W = planeW(kind, 32), row = planeRow(kind, W), sh = planeShape(kind, W);
    if (!sh) continue;  // (started on a page of blocks: no hexagon there)
    const dead = new Set(sh.dead), at = (t) => planeCorners(kind, t % row, Math.floor(t / row));
    const live = [...Array(row * W).keys()].filter((t) => !dead.has(t)).map(at), all = [...live, ...sh.walls.map(([x, y]) => planeCorners(kind, x, y))], grid = new Map(), cell = (x, y) => `${Math.floor(x / 3)},${Math.floor(y / 3)}`;
    const mid = (P) => [P.reduce((t, p) => t + p[0], 0) / P.length, P.reduce((t, p) => t + p[1], 0) / P.length];
    all.forEach((P, j) => { const c = cell(...mid(P)); (grid.get(c) ?? grid.set(c, []).get(c)).push(j); });
    const covered = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${Math.floor(x / 3) + dx},${Math.floor(y / 3) + dy}`) ?? []) if (insidePolygon(all[j], x, y)) return true; return false; };
    let gaps = 0;
    for (const P of live) {
      const o = sarea(P) > 0 ? 1 : -1;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 1e-6 && !covered((a[0] + b[0]) / 2 + (0.03 * o * (b[1] - a[1])) / len, (a[1] + b[1]) / 2 - (0.03 * o * (b[0] - a[0])) / len)) gaps++;
      }
    }
    // its symmetry: the live cells' middles turned by a turn of the grid round their mean, onto live ones
    const mids = live.map(mid), c = [0, 1].map((d) => mids.reduce((t, m) => t + m[d], 0) / mids.length), turn = (2 * Math.PI) / PATTERN_TURNS[baseOf(kind)];
    const sig = (P) => `${P.length}|${Math.round(Math.abs(sarea(P)) * 50)}`, keys = new Set(mids.map(([u, v], i) => `${Math.round(u * 100)},${Math.round(v * 100)}|${sig(live[i])}`));  // (a cell by its middle and its shape)
    const off = mids.filter(([u, v], i) => { const x = c[0] + (u - c[0]) * Math.cos(turn) - (v - c[1]) * Math.sin(turn), y = c[1] + (u - c[0]) * Math.sin(turn) + (v - c[1]) * Math.cos(turn); return ![-1, 0, 1].some((e) => [-1, 0, 1].some((f) => keys.has(`${Math.round(x * 100) + e},${Math.round(y * 100) + f}|${sig(live[i])}`))); }).length;
    checked++;
    const what = `${kind} hexagon ${W}`;
    if (gaps) fail(`${what}: its walls open (${gaps} sides)`);
    if (off) fail(`${what}: ${off} of its ${live.length} cells not turning onto others`);
    const W0 = sideW(kind, 32), want = (Math.PI / 4) * planeRow(kind, W0) * W0;  // (as a disc of ⌀ 32's, see shapeW; a grid of few big lattice cells: by big steps)
    if (Math.abs(live.length / want - 1) > 0.3 + 4 / W) fail(`${what}: ${live.length} cells, ${Math.round(want)} wanted`);
  }
  // every grid that repeats, as a torus (its sides round: a rectangle's columns not its rows; its size as Life's, whatever the mode): each cell's neighbours
  // touching it, a few cells' width away at most the shortest way round (not glued to far ones, as v0.1.1305's to 1371's)
  for (const kind of ['square', 'hex', 'tri', 'cairo', 'kite', ...Object.keys(TILINGS), ...Object.keys(RECTS)]) {
    if (!tilingOf(kind) && !PLANE_PER[kind] || APERIODIC[kind]) continue;
    Object.assign(plane, { torus: true });
    const W = colourW(kind, sideW(kind, 32)), row = planeRow(kind, W), { start, list } = planeNeighbours(kind, W, true), c0 = cellMiddle(kind, 0, 0);
    const P = [cellMiddle(kind, row, 0), cellMiddle(kind, 0, W)].map((c) => [c[0] - c0[0], c[1] - c0[1]]), mid = (t) => cellMiddle(kind, t % row, Math.floor(t / row)), reach = 3 * cellWidth(kind);
    let far = 0;
    for (let t = 0; t < row * W; t++) for (let q = start[t]; q < start[t + 1]; q++) {
      const a = mid(t), b = mid(list[q]);
      if (Math.min(...[-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => Math.hypot(b[0] + i * P[0][0] + j * P[1][0] - a[0], b[1] + i * P[0][1] + j * P[1][1] - a[1])))) > reach) far++;
    }
    checked++;
    if (far) fail(`${kind} torus ${W}: ${far} neighbours far from their cell`);
  }
  Object.assign(plane, saved);
  return checked;
}

// after an action: no error, the link's mode the one shown, a surface's cells as many as said (the crawl's, the fuzz's)
const wait = (ms) => new Promise((go) => setTimeout(go, ms));
function checker(fail) {
  const errors = [], onError = (e) => errors.push(e.message);
  window.addEventListener('error', onError);
  const c = { checked: 0, stop: () => window.removeEventListener('error', onError) };
  c.look = async (what, ms = 450) => {
    await wait(ms);
    for (let t = 0; busy && t < 600; t++) await wait(100);  // (its digits still computed: the link follows the walk once built, see buildWalk)
    c.checked++;
    const w = $('mode').value, hashW = (location.hash.match(/w=([^&]*)/) ?? [])[1], said = [...($('sizeLabel').innerText.split('\n').at(-1).matchAll(/([\d,]+)\s+[a-z]+/gi))].reduce((sum, m) => sum + Number(m[1].replace(/,/g, '')), 0);  // (its cells, its terms summed: 1,910 hexagons + 12 pentagons)
    const n = MODES[w].sphere && !MODES[w].plane ? walk.geo?.n : null;
    const bad = [errors.length && errors.splice(0).join(' / '), hashW !== w && `the link says ${hashW}`, n && said && said !== n && `${n} cells, said ${said}`].filter(Boolean);
    if (bad.length) fail(`${what} → ${w}: ${bad.join('; ')}`);
    return !bad.length;
  };
  return c;
}
async function crawl(fail) {
  const C = checker(fail), look = C.look;
  const tabs = () => [...document.querySelectorAll('#modeTabs [role=tab]')].filter((b) => !/Gallery/.test(b.textContent));  // (Life, Reversible, Ant, Walk)
  for (let ti = 0; ti < tabs().length; ti++) {
    tabs()[ti].click();
    await look(`tab ${tabs()[ti].textContent.trim()}`);
    const how = document.querySelector('#walkHeading .how-it-works');  // (its How it works open: it follows the grid and the rule)
    if (how && $('ruleTuto').hidden) { how.click(); await look(`How it works ${tabs()[ti].textContent.trim()}`); }
    for (let si = 0; si < $('navSpace').children.length; si++) {
      $('navSpace').children[si].click();
      await look(`space ${$('navSpace').children[si]?.textContent}`);
      const shapeButtons = () => $('navShapes').querySelectorAll('button');  // (in 2D, among the groups' titles)
      for (let hi = 0; hi < shapeButtons().length; hi++) {
        const b = shapeButtons()[hi], name = b.textContent.trim();
        b.click();
        await look(`shape ${name}`);
        const rulesBox = $('antRuleSection').hidden ? $('navRules') : $('antCreatures');  // its rules (Turtle, Pivot…), an ant's creatures
        if (!rulesBox.closest('[hidden]')) for (let r = 0; r < rulesBox.children.length; r++) {
          const rb = rulesBox.children[r];
          if (rb.disabled || rb.classList.contains('active')) continue;
          rb.click();
          await look(`${name} rule ${rb.textContent.trim()}`);
        }
        if ($('torusTiles').hidden) continue;
        for (let k = 0; k < $('torusTiles').children.length; k++) {
          const tile = $('torusTiles').children[k], tn = tile.textContent.trim();
          tile.click();
          await look(`${name}/${tn}`);
          if (!tile.classList.contains('switch')) continue;
          tile.click();  // (turned)
          await look(`${name}/${tn} turned`);
          tile.click();
          await wait(300);
        }
      }
    }
  }
  C.stop();
  return C.checked;
}

// The fuzz: count actions at random, as a visitor would go from menu to menu (seeded: a failure comes back with its seed): a
// tab, 2D or 3D, a shape, a tiling, colours, a zone, a rule, a start, a look, the smallest size (often), a size up, a few
// steps, a short play, the link loaded again (not back in the history: it can leave the page); after each, the crawl's checks; a failure told with the
// actions that led to it
// what the menus offer (a choice: its name, greyed or not, picked or not), the size said: a link loaded cold offers the same
const offered = (w) => {
  const d = w.document, row = (sel, all = false) => [...d.querySelectorAll(sel)].filter((b) => (all ? !b.hidden : !b.closest('[hidden]'))).map((b) => `${b.textContent.trim().slice(0, 16)}${b.disabled ? '⊘' : ''}${b.classList.contains('active') ? '•' : ''}`).join(' ');
  return { size: d.getElementById('sizeLabel').closest('[hidden]') ? '' : d.getElementById('sizeLabel').innerText, plane: d.getElementById('planeLabel').closest('[hidden]') ? '' : d.getElementById('planeLabel').innerText,
    tiles: row('#torusTiles button'), colours: row('#colourBlocks button'), zones: row('#huntZones button', w === window && surfaceDraw && huntOn()), rules: row('#navRules button') };  // (Draw open on a surface here: a view, a hunt's zones out of sight, not gone; a link loaded cold has it not)
};
async function coldLike(fail, what) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none';
  f.src = `${location.pathname}?cold=${Date.now()}${location.hash}`;
  document.body.append(f);
  await new Promise((go) => f.addEventListener('load', go, { once: true }));
  await wait(1500);
  const a = offered(window), b = offered(f.contentWindow);
  f.remove();
  const diff = Object.keys(a).filter((k) => a[k] !== b[k]).map((k) => `${k}: «${a[k]}» here, «${b[k]}» cold`);
  if (diff.length) fail(`${what} ${location.hash}: ${diff.join('; ')}`);
}
async function fuzz(fail, count, seedv, cold = false) {
  const C = checker(fail);
  let sd = seedv >>> 0 || 1;
  const rnd = () => ((sd = (Math.imul(sd, 1103515245) + 12345) >>> 0) / 4294967296), pick = (a) => a[Math.floor(rnd() * a.length)];
  const shown = (sel) => [...document.querySelectorAll(sel)].filter((b) => !b.disabled && b.offsetParent !== null && !b.closest('[hidden]'));
  const clickIn = (sel) => () => { const b = pick(shown(sel)); if (!b) return null; b.click(); return `${sel.split(' ')[0]} ${b.textContent.trim().slice(0, 24)}`; };
  const actions = [
    [3, clickIn('#modeTabs [role=tab]')], [2, clickIn('#navSpace button')], [4, clickIn('#navShapes button')], [2, clickIn('#torusTiles button')],
    [2, clickIn('#navRules button, #antCreatures button')], [2, clickIn('#colourBlocks button')], [2, clickIn('#huntZones button')], [2, clickIn('#ruleCards button')],
    [1, clickIn('#lifeStartTabs button, #antStartTabs button')], [1, clickIn('#cellModes button, #colorButtons button, #areaModes button, #symmetryTiles button')],
    [3, () => { const down = shown('#sizeDown, #planeDown')[0]; if (!down) return null; for (let k = 0; k < 14 && !down.disabled; k++) down.click(); return 'smallest'; }],
    [1, () => { const up = shown('#sizeUp, #planeUp')[0]; if (!up) return null; up.click(); return 'size up'; }],
    [2, () => { const b = shown('#step')[0]; if (!b) return null; for (let k = 0; k < 3; k++) b.click(); return '3 steps'; }],
    [1, async () => { const b = shown('#play')[0]; if (!b) return null; b.click(); await wait(400); if (shown('#play')[0]) shown('#play')[0].click(); return 'play'; }],
    [1, () => { const h = location.hash; location.hash = ''; location.hash = h; return 'link again'; }],
  ];
  const total = actions.reduce((s, a) => s + a[0], 0), trail = [];
  for (let i = 0; i < count; i++) {
    let r = rnd() * total, act = actions[0][1];
    for (const [w, f] of actions) { if ((r -= w) < 0) { act = f; break; } }
    const what = await act();
    if (!what) continue;
    trail.push(what);
    if (trail.length > 8) trail.shift();
    if (!(await C.look(`fuzz #${i} (seed ${seedv}) ${trail.join(' › ')}`, 300))) trail.length = 0;
    else if (cold) await coldLike(fail, `fuzz #${i} (seed ${seedv}) ${trail.join(' › ')}`);
  }
  C.stop();
  return C.checked;
}

// The deep crawl (a night's): every grid of Life and Reversible from its link, then on each: every rule of its menu and one of
// your own (B36/S23; blocks: their menu's), each with How it works (and its Letters page); every colour (and Mixed); every zone of
// Hunt; its smallest size; 30 generations played. No error anywhere (a click's included), the link's mode the one shown.
// only: those grids alone; from: the grid it starts at (after a crash: localStorage.walkingDeep holds the one it was on, and its failures so far)
async function deep(fail, from, only) {
  const wait = (ms) => new Promise((go) => setTimeout(go, ms)), errors = [];
  const onError = (e) => errors.push(e.message);
  window.addEventListener('error', onError);
  let checked = 0;
  const look = async (what, ms = 350) => {
    await wait(ms);
    checked++;
    if (errors.length) fail(`${what}: ${errors.splice(0).join(' / ')}`);
  };
  const play = (what) => { try { for (let g = 0; g < 30; g++) lifeStep(); } catch (e) { fail(`${what}: playing: ${e.message}`); } };
  const how = async (what) => {  // its How it works, then its Letters, closed again
    $('watchRule').click();
    await look(`${what} How it works`);
    const letters = document.querySelector('.tut-letters');
    if (letters) { letters.click(); await look(`${what} Letters`); document.querySelector('.tut-letters')?.click(); await wait(100); }
    if (!$('ruleTuto').hidden) $('ruleTuto').querySelector('.tut-close')?.click();
  };
  const all = (only ?? Object.keys(MODES)).filter((m) => MODES[m].life && [...$('mode').options].some((o) => o.value === m));
  for (const w of all.slice(Math.max(0, all.indexOf(from)))) {
    localStorage.walkingDeep = `${w} ${Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)} MB`;  // (the page's memory too)
    location.hash = `w=${w}`;
    await look(`${w} from its link`, 900);
    if ($('mode').value !== w) fail(`${w}: the link opened ${$('mode').value}`);
    for (let i = 0; i < $('ruleCards').children.length; i++) {
      const b = $('ruleCards').children[i], name = b.querySelector('.mode-name')?.textContent ?? '';
      if (/Custom/.test(name)) continue;
      b.click();
      await look(`${w} rule ${name}`, 500);
      play(`${w} rule ${name}`);
      if (i < 2) await how(`${w} rule ${name}`);  // (How it works: the first two, and your own)
    }
    if (!MODES[w].margolus) {  // (blocks: their rules tables of their own size, all in the menu)
      $('lifeRule').value = 'B36/S23';
      $('lifeRule').dispatchEvent(new Event('change'));
      await look(`${w} a rule of your own`, 500);
      play(`${w} a rule of your own`);
      await how(`${w} a rule of your own`);
    }
    for (const b of [...$('colourBlocks').children].filter((x) => !x.disabled)) { b.click(); await look(`${w} colours ${b.textContent.trim()}`); }
    if (!$('huntRow').hidden) for (const b of [...$('huntZones').children].filter((x) => !x.disabled && !x.hidden)) { b.click(); await look(`${w} zone ${b.textContent.trim()}`); }
    const down = MODES[w].plane ? $('planeDown') : $('sizeDown');
    for (let k = 0; k < 12 && !down.disabled; k++) { down.click(); await wait(250); }
    await look(`${w} smallest`, 500);
    play(`${w} smallest`);
  }
  window.removeEventListener('error', onError);
  return checked;
}

// Colours offered: every Life surface, its sizes from the least up till one offers a count of colours past Classic (none at
// any: its colours never fair there, as Klein Trihex's were, its length always half a period off)
async function coloursOffered(fail) {
  let checked = 0;
  for (const w of Object.keys(MODES).filter((m) => MODES[m].life && MODES[m].sphere && [...$('mode').options].some((o) => o.value === m))) {
    const kind = surfaceOf(MODES[w]), sizes = SPHERES[kind]?.sizes ?? [];
    let some = false;
    for (const s of sizes) {
      location.hash = `#w=${w}&s=${s}`;
      await wait(400);
      if (COLOUR_STEPS.some((K) => K > 1 && coloursFit(K, walk.geo))) { some = true; break; }
    }
    checked++;
    if (!some) fail(`${w}: Classic only at every size (${sizes.join(', ')})`);
  }
  return checked;
}

// a grid that never repeats, round (by its own measure: Ammann's an octagon): in each of 72 ways from its middle, its cells as far out as the median less 3 at most (a
// disc of its patch, never cut by the patch's edge: the pinwheel's big triangle's, v0.1.1386's), its sizes up to 128
function checkDiscs(fail) {
  let checked = 0;
  for (const kind of Object.keys(APERIODIC)) for (const side of planeSides(kind).filter((f) => f <= 128)) {
    const W = planeW(kind, side), o = (W - 1) / 2, far = new Array(72).fill(0), { poly, norm } = APERIODIC[kind](W);
    for (let t = 0; t < W * W; t++) {
      const p = poly(t), [u, v] = [0, 1].map((d) => p.reduce((sum, q) => sum + q[d], 0) / p.length - o), k = Math.floor(((Math.atan2(v, u) + Math.PI) / (2 * Math.PI)) * 72) % 72;
      far[k] = Math.max(far[k], norm(u, v));
    }
    const sorted = [...far].sort((a, b) => a - b);
    checked++;
    if (sorted[36] - sorted[0] > 3) fail(`${kind} at ${side}: its disc cut, ${(sorted[36] - sorted[0]).toFixed(1)} cells short ${far.indexOf(sorted[0]) * 5 - 180}° from its middle`);
  }
  return checked;
}

// a torus of blocks: whether its sets go round, as a side of the same remainder mod 6 does (see blocksWrap)
function checkBlockWraps(fail) {
  let checked = 0;
  for (const k0 of new Set(Object.values(MODES).filter((m) => m.margolus && m.plane).map((m) => m.plane))) {
    const kind = STRAIGHT_RECTS.has(k0) ? `${k0}Rect` : k0;  // (a torus of a slanted grid: its rectangle's)
    for (let W = 25; W <= 30; W++) { checked++; if (planeBlocks(kind, W, true).wraps !== blocksWrap(kind, W)) fail(`${kind}: blocks at side ${W} wrap otherwise than at ${18 + (W % 6)}`); }
  }
  return checked;
}

// Life's known results (its only engine the graphics card's: none here to compare with): a link's start played till it
// repeats, from generation T with period P (null: not checked); PATTERNS.md's records, and reversible rules' returns to their
// start (from a seeded start: played, and Find its return's); a hunt's 8 best of all a zone's starts (the processor's
// worker's, v0.1.1394)
const KNOWN = [
  ['#w=life2d&r=B3678/S34678&s=64&pop=draw&p=32,32:.A$.A$2A$A!', null, 16],
  ['#w=life2d&r=B3678/S34678&s=64&pop=draw&p=32,32:2.A$2A2.A$2A2.A$A.2A$2A.2A!', 219, null],
  ['#w=life2d&r=B36/S23&s=64&pop=draw&p=32,32:5.A2.A$2A2.A3.A$2A2.2A.2A!', null, 10],
  ['#w=life2d&r=B2/S/C3&s=64&pop=draw&p=32,32:3.2A$A$.4A$4.A$3A.A!', 2595, null],
  ['#w=life2d&r=B36/S23&s=64&pop=draw&p=32,32:A.2A$3.2A$2A$3.2A$3A!', 2652, 2],
  ['#w=life2d&r=B3/S12345&s=64&pop=draw&p=32,32:A3.A$2.A$2A$5A!', 430, 1],
  ['#w=life2dHex&r=B2/S34&s=64&pop=draw&p=58,16:A$2A.A$.A.A!', 0, 48],
  ['#w=life2dHex&r=B2/S34&s=64&pop=draw&p=54,16:4.A2.A$.A.3A.A$A.A.A!', 254, 20],
  ['#w=life2dHex&r=B2o/S2m34&s=64&pop=draw&p=53,16:6.A$A.5A.A.A.A$.A2.A2.A2.A!', 0, 30],
  ['#w=life2dTri&r=B3/S23&s=64&pop=draw&p=80,12:A3.2A.A!', 430, 8],
  ['#w=blocks2d&r=M15,1,2,3,4,5,6,7,8,9,10,11,12,13,14,0&s=6&g=2000&pop=random.30.6', 0, 70],
  ['#w=blocks2d&r=Q2R&s=6&g=2000&pop=random.30.6', 0, 116],
  ['#w=blocks2dTetrakis&r=M0,4,8,12,1,10,9,13,2,6,5,14,3,7,11,15*&s=8&g=2000&pop=random.30.8', 0, 84],
];
async function checkKnown(fail) {
  let checked = 0;
  for (const [link, T, P] of KNOWN) {
    location.hash = link;
    await wait(800);
    const L = walk.life;
    lifeReset();
    cur = 0;
    for (const far = (T ?? 600) + (P ?? 600); !L.stable && cur < far; cur++) lifeStep();
    checked++;
    if ((T !== null && L.stable?.T !== T) || (P !== null && L.stable?.P !== P)) fail(`${link}: repeats from ${L.stable?.T} with period ${L.stable?.P}, known ${T} and ${P}`);
  }
  // Find its return, past the generations played (Swirl on hexagons: 1,428)
  location.hash = '#w=blocks2dHex&r=M0,2,4,5,1,6,3,7&s=6&g=2000&pop=random.30.6';
  await wait(800);
  lifeReset();
  cur = 0;
  searchBack(true);
  for (let i = 0; i < 300 && backSearch.life; i++) await wait(50);
  checked++;
  if (backSearch.found !== 1428) fail(`Swirl on hexagons: its return found at ${backSearch.found}, known 1,428`);
  searchBack(false);
  // a hunt: of the 2^14 starts of 14 cells (radius 2's first), the 8 longest
  location.hash = '#w=life2d&r=B3/S23&s=48&pop=random.49.5';
  await wait(800);
  hunt.zone = 'radius2';
  const plan = { cells: huntPlan().cells.slice(0, 14), copies: [], all: 2 ** 14 };
  const top = await new Promise((done) => { const h = huntRuns(walk.life, plan, 50000, 'longest', (best, n, end) => { if (best) h.best = best; if (end) { h.stop(); done(h.best); } }); });
  checked++;
  const lives = top.map((r) => `${r.T}/${r.P}`).join(' ');
  if (lives !== '2401/2 2400/2 1942/2 1758/2 1757/2 1756/2 1755/2 1754/2') fail(`a hunt's 8 longest: ${lives}`);
  return checked;
}

window.walkingCheck = async ({ known = false, crawl: andCrawl = false, deep: andDeep = false, fuzz: actions = 0, cold = false, colours = false, seed = Date.now() % 1e6, from, only } = {}) => {
  const failures = [], fail = (s) => { failures.push(s); localStorage.walkingDeepFailures = JSON.stringify(failures); };
  let checked = checkMeshes(fail) + checkBlockWraps(fail) + checkDiscs(fail);
  if (known) checked += await checkKnown(fail);
  if (andCrawl) checked += await crawl(fail);
  if (actions) checked += await fuzz(fail, actions, seed, cold);
  if (colours) checked += await coloursOffered(fail);
  if (andDeep) checked += await deep(fail, from, only);
  return { ok: !failures.length, failures, checked };
};

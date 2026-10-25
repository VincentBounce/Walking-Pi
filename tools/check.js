// Walking Pi's self-check, run in the page (it uses the app's own functions) before a commit:
//   await import(`/tools/check.js?${Date.now()}`); await walkingCheck();   // the meshes, a few seconds
//   await walkingCheck({ crawl: true });                                   // and every tab, shape and tiling, a few minutes
//   await walkingCheck({ fuzz: 400, seed: 7 });                            // 400 actions at random, menu to menu (transitions, smallest sizes)
//   await walkingCheck({ deep: true });                                    // every grid's rules (yours too), How it works, colours, zones, smallest size: a night's
// Returns { ok, failures, checked }. The meshes: a torus straight and turned, its tiles' neighbours alike; a Möbius
// strip's cells away from its edges, as many neighbours as the torus of its tiles; each surface its cells as many as
// said; the grids that never repeat, their walls closed; those in a hexagon, their walls closed, turning onto themselves, as many cells as said. The crawl: no error, the link's mode the one shown, the size said its cells' count.

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
    const y = (t) => { const c = tileCorners(g, t); return c.reduce((s, p) => s + p[1], 0) / c.length; };
    const inside = neighbourCounts(g, (t) => t < g.front && y(t) > far && y(t) < g.W - far);
    checked++;
    if (SPHERES[kind].tiles(6) !== g.n) fail(`${kind}: ${g.n} cells, said ${SPHERES[kind].tiles(6)}`);
    if (!torus) fail(`${kind}: no torus of its tiles to compare with`);
    else if (!within(inside, torus)) fail(`${kind}: inside ${show(inside)}, its torus ${show(torus)}`);
  }
  // the grids that never repeat: their walls closed round them (a point just past each side of a cell in a cell or a
  // wall), sizes 16 to 64
  const sarea = (P) => P.reduce((t, p, i) => t + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0);
  for (const kind of Object.keys(APERIODIC)) for (const W of [16, 24, 32, 48, 64]) {
    const h = APERIODIC[kind](W), all = [...h.polys, ...h.walls], grid = new Map(), cell = (x, y) => `${Math.floor(x / 3)},${Math.floor(y / 3)}`;
    all.forEach((P, j) => { const c = cell(P.reduce((t, p) => t + p[0], 0) / P.length, P.reduce((t, p) => t + p[1], 0) / P.length); (grid.get(c) ?? grid.set(c, []).get(c)).push(j); });
    const covered = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${Math.floor(x / 3) + dx},${Math.floor(y / 3) + dy}`) ?? []) if (insidePolygon(all[j], x, y)) return true; return false; };
    let gaps = 0;
    const dead = new Set(h.dead);
    for (const P of h.polys.filter((P, t) => !dead.has(t))) {  // (the live cells)
      const o = sarea(P) > 0 ? 1 : -1;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 1e-6 && !covered((a[0] + b[0]) / 2 + (0.03 * o * (b[1] - a[1])) / len, (a[1] + b[1]) / 2 - (0.03 * o * (b[0] - a[0])) / len)) gaps++;
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
    c.checked++;
    const w = $('mode').value, hashW = (location.hash.match(/w=([^&]*)/) ?? [])[1], said = Number(($('sizeLabel').innerText.match(/([\d,]+)\s+[a-z]+\s*$/i) ?? [])[1]?.replace(/,/g, ''));
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
async function fuzz(fail, count, seedv) {
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

window.walkingCheck = async ({ crawl: andCrawl = false, deep: andDeep = false, fuzz: actions = 0, seed = Date.now() % 1e6, from, only } = {}) => {
  const failures = [], fail = (s) => { failures.push(s); localStorage.walkingDeepFailures = JSON.stringify(failures); };
  let checked = checkMeshes(fail);
  if (andCrawl) checked += await crawl(fail);
  if (actions) checked += await fuzz(fail, actions, seed);
  if (andDeep) checked += await deep(fail, from, only);
  return { ok: !failures.length, failures, checked };
};

// Walking Pi's self-check, run in the page (it uses the app's own functions) before a commit:
//   await import(`/tools/check.js?${Date.now()}`); await walkingCheck();   // the meshes, a few seconds
//   await walkingCheck({ crawl: true });                                   // and every tab, shape and tiling, a few minutes
// Returns { ok, failures, checked }. The meshes: a torus straight and turned, its tiles' neighbours alike; a Möbius
// strip's cells away from its edges, as many neighbours as the torus of its tiles; each surface its cells as many as
// said. The crawl: no error, the link's mode the one shown, the size said its cells' count.

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
const STRIP_TORUS = { mobius: 'torus', mobiusHex: 'hextorus', mobiusTri: 'tritorus', mobiusHexTurned: 'hextorus', mobiusTriTurned: 'tritorus', mobiusCairo: 'cairotorus', mobiusKite: 'kitetorus' };
const torusOfStrip = (strip) => STRIP_TORUS[strip] ?? `${MOBIUS_STRIPS[strip].kind}torus`;

function checkMeshes(fail) {
  let checked = 0;
  const size = () => 12;  // (a size every torus takes)
  // the tori: their cells as many as said; a tiling's, straight and turned alike
  const tori = Object.keys(SPHERES).filter((k) => /torus/.test(k) && !/Turned$/.test(k));
  const ref = {};
  for (const kind of tori) {
    const g = SPHERES[kind].mesh(size(kind)), c = neighbourCounts(g);
    ref[kind] = c;
    checked++;
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
  return checked;
}

async function crawl(fail) {
  const wait = (ms) => new Promise((go) => setTimeout(go, ms)), errors = [];
  const onError = (e) => errors.push(e.message);
  window.addEventListener('error', onError);
  const tabs = () => [...document.querySelectorAll('#modeTabs [role=tab]')].filter((b) => /Walk|Ant|Life/.test(b.textContent));
  let checked = 0;
  const look = async (what) => {
    await wait(450);
    checked++;
    const w = $('mode').value, hashW = (location.hash.match(/w=([^&]*)/) ?? [])[1], said = Number(($('sizeLabel').innerText.match(/([\d,]+)\s+[a-z]+\s*$/i) ?? [])[1]?.replace(/,/g, ''));
    const n = MODES[w].sphere && !MODES[w].plane ? walk.geo?.n : null;
    if (errors.length) fail(`${what} → ${w}: ${errors.splice(0).join(' / ')}`);
    if (hashW !== w) fail(`${what} → ${w}: the link says ${hashW}`);
    if (n && said && said !== n) fail(`${what} → ${w}: ${n} cells, said ${said}`);
  };
  for (const ti of [0, 1, 2]) {
    tabs()[ti].click();
    await look(`tab ${tabs()[ti].textContent.trim()}`);
    for (let si = 0; si < $('navSpace').children.length; si++) {
      $('navSpace').children[si].click();
      await look(`space ${$('navSpace').children[si]?.textContent}`);
      for (let hi = 0; hi < $('navShapes').children.length; hi++) {
        const b = $('navShapes').children[hi], name = b.textContent.trim();
        b.click();
        await look(`shape ${name}`);
        if (!$('navRules').hidden) for (let r = 0; r < $('navRules').children.length; r++) {  // its rules (Turtle, Pivot…; Ant, Worm)
          const rb = $('navRules').children[r];
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
  window.removeEventListener('error', onError);
  return checked;
}

window.walkingCheck = async ({ crawl: andCrawl = false } = {}) => {
  const failures = [], fail = (s) => failures.push(s);
  let checked = checkMeshes(fail);
  if (andCrawl) checked += await crawl(fail);
  return { ok: !failures.length, failures, checked };
};

import { parse, step, components, normal } from './engine.js';
import { grid } from './kite.js';
const F = JSON.parse(Deno.readTextFileSync('./famous.json')), G = grid(32), out = {};
// a pattern's phases (its normal forms over one period)
function phases(rule, cells, period) {
  const { B, S, C } = parse(rule);
  let a = new Uint8Array(G.n), b = new Uint8Array(G.n);
  const ox = 6 * Math.floor(G.row / 12), oy = G.W >> 1;
  for (const [x, y, s] of cells) a[(oy + y) * G.row + ox + x] = s;
  const list = [];
  for (let g = 0; g < period; g++) {
    const live = [...a.keys()].filter((t) => a[t]);
    list.push(normal(G, a, live).cells);
    step(a, b, G.start, G.list, B, S, C); [a, b] = [b, a];
  }
  return list;
}
const rle = (cells) => {
  const h = Math.max(...cells.map((c) => c[1])) + 1, rows = [];
  for (let y = 0; y < h; y++) {
    const xs = cells.filter((c) => c[1] === y), w = xs.length ? Math.max(...xs.map((c) => c[0])) + 1 : 0, line = [];
    for (let x = 0; x < w; x++) { const c = xs.find((q) => q[0] === x); line.push(c ? String.fromCharCode(64 + c[2]) : '.'); }
    let s = '', i = 0;
    while (i < line.length) { let j = i; while (j < line.length && line[j] === line[i]) j++; s += (j - i > 1 ? j - i : '') + line[i]; i = j; }
    rows.push(s.replace(/\.+$/, ''));
  }
  let r = rows.join('$');
  r = r.replace(/(\$+)/g, (m) => (m.length > 1 ? m.length + '$' : '$'));
  return r + '!';
};
for (const [rule, { ships, oscs, meths }] of Object.entries(F)) {
  const group = (fs) => {
    const by = new Map();
    for (const f of fs) {
      const ph = phases(rule, f.cells, f.period), sig = `${f.period}|${ph.map((p) => p.length).sort((a, b) => a - b).join(',')}`;
      const best = ph.reduce((m, p) => (p.length < m.length ? p : m));
      const g = by.get(sig) ?? { period: f.period, move: f.move, count: 0, cells: best, sizes: ph.map((p) => p.length) };
      g.count += f.count;
      if (f.move && Math.abs(f.move[1]) === 0 && f.move[0] > 0) { g.cells = best; g.move = f.move; }  // shown flying right if it can
      by.set(sig, g);
    }
    return [...by.values()].sort((a, b) => b.count - a.count);
  };
  out[rule] = {
    ships: group(ships).map((g) => ({ period: g.period, move: g.move, count: g.count, n: g.cells.length, rle: rle(g.cells) })),
    oscs: group(oscs).sort((a, b) => b.period - a.period || a.cells.length - b.cells.length).slice(0, 4).map((g) => ({ period: g.period, count: g.count, n: g.cells.length, rle: rle(g.cells) })),
    meths: meths.map((m) => ({ life: m.life, n: m.cells.length, rle: rle(m.cells) })),
  };
}
Deno.writeTextFileSync('./picked.json', JSON.stringify(out, null, 1));
for (const [r, o] of Object.entries(out)) { console.log('##', r); for (const s of o.ships) console.log(' ship', JSON.stringify(s)); for (const s of o.oscs) console.log(' osc', JSON.stringify(s)); for (const s of o.meths) console.log(' meth', JSON.stringify(s)); }

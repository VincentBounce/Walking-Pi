const R = JSON.parse(Deno.readTextFileSync('./stage1.json'));
const by = {}; for (const r of R) by[r.end] = (by[r.end] || 0) + 1; console.log(by);
// Life-like: settles (or still running with few cells: gliders on a small torus) with a little ash, after a long time
const good = R.filter((r) => (r.end === 'settles' || r.end === 'running') && r.rho > 0.005 && r.rho < 0.08 && r.T >= 250);
console.log('good', good.length, 'by C', [2,3,4,5].map(c => good.filter(r => (r.rule.match(/C(\d)/)?.[1] ?? '2') == c).length));
console.log('running (never settles, few cells):', good.filter(r => r.end === 'running').length);
Deno.writeTextFileSync('./good1.json', JSON.stringify(good.map(r => r.rule)));
good.sort((a, b) => b.T - a.T);
console.log(good.slice(0, 40).map(r => `${r.rule} T${r.T} ${(100*r.rho).toFixed(1)}% ${r.end}`).join('\n'));

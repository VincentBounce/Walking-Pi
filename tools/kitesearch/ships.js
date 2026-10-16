const R = JSON.parse(Deno.readTextFileSync(Deno.args[0] ?? './stage2.json'));
const S1 = Object.fromEntries(JSON.parse(Deno.readTextFileSync('./stage1.json')).map((r) => [r.rule, r]));
const withShips = R.filter((r) => r.ships.length && r.explode === 0);
console.log('rules with ships, no explosion:', withShips.length, '/', R.length);
withShips.sort((a, b) => b.ships.reduce((s, f) => s + f.count, 0) - a.ships.reduce((s, f) => s + f.count, 0));
for (const r of withShips.slice(0, 40)) {
  const s = S1[r.rule];
  console.log(`${r.rule.padEnd(14)} soup T${s.T} ${(100 * s.rho).toFixed(1)}% ${s.end} | ships ${r.ships.map((f) => `p${f.period}(${f.move})n${f.cells.length}x${f.count}`).join(' ')} | oscs ${r.oscs.length} | life ${r.life.join(',')}`);
}

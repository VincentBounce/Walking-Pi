// The traces' stats scored against Life's on squares (traces.js on a 59 × 59 torus): deno run --allow-read rank.js traces.json [life.json]
// each criterion near Life's (1 at Life's value), multiplied: settling time, its spread (more is as good), the plateau
// (the live share at 800 over 200: a lasting chaos), the share alive during it and left at the end, the ends with oscillators
const R = JSON.parse(Deno.readTextFileSync(Deno.args[0])), L = Deno.args[1] ? JSON.parse(Deno.readTextFileSync(Deno.args[1]))[0]
  : { Tmed: 777, spread: 0.5, plateau: 0.47, at200: 7.5, ash: 3.16, osc: 1 };
const near = (x, t, w) => Math.exp(-(((x - t) / w) ** 2));
export const score = (r) => (r.ok / (r.ok + r.dies + r.explodes)) ** 2 * near(Math.log(r.Tmed), Math.log(L.Tmed), 0.6) * near(Math.min(r.spread, L.spread), L.spread, 0.25)
  * near(Math.log(r.plateau + 0.01), Math.log(L.plateau), 0.5) * near(r.at200, L.at200, 5) * near(r.ash, L.ash, 2.5) * (0.3 + 0.7 * r.osc) * (r.running > 6 ? 0.3 : 1);
const top = R.map((r) => ({ ...r, score: +score(r).toFixed(3) })).sort((a, b) => b.score - a.score);
for (const r of top.slice(0, Number(Deno.args[2] ?? 25))) console.log(`${r.rule.padEnd(15)} ${String(r.score).padEnd(6)} T ${r.Tmed} (${r.Tmin}–${r.Tmax}) spread ${r.spread} plateau ${r.plateau} at200 ${r.at200}% ash ${r.ash}% osc ${(100 * r.osc).toFixed(0)}% run ${r.running}`);
Deno.writeTextFileSync(Deno.args[0].replace('.json', '-ranked.json'), JSON.stringify(top.slice(0, 60).map((r) => r.rule)));

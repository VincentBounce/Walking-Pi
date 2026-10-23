// The traces' stats scored against Life's on squares (traces.js on a 59 × 59 torus): deno run --allow-read rank.js traces.json [life.json]
// each criterion near Life's (1 at Life's value), multiplied: settling time, its spread (more is as good), the plateau
// (the live share at 800 over 200: a lasting chaos), the share alive during it and left at the end, the ends with oscillators
import { LIFE, score as lifeScore } from './stats.js';
const R = JSON.parse(Deno.readTextFileSync(Deno.args[0])), L = Deno.args[1] ? JSON.parse(Deno.readTextFileSync(Deno.args[1]))[0] : LIFE, score = (r) => lifeScore(r, L);
const top = R.map((r) => ({ ...r, score: +score(r).toFixed(3) })).sort((a, b) => b.score - a.score);
for (const r of top.slice(0, Number(Deno.args[2] ?? 25))) console.log(`${r.rule.padEnd(15)} ${String(r.score).padEnd(6)} T ${r.Tmed} (${r.Tmin}–${r.Tmax}) spread ${r.spread} plateau ${r.plateau} at200 ${r.at200}% ash ${r.ash}% osc ${(100 * r.osc).toFixed(0)}% run ${r.running}`);
Deno.writeTextFileSync(Deno.args[0].replace('.json', '-ranked.json'), JSON.stringify(top.slice(0, 60).map((r) => r.rule)));

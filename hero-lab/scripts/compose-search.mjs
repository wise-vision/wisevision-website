// Random search over the mobile composition; scores with checkComposition + framing heuristics.
// node scripts/compose-search.mjs [n] [seed]
import { launch, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition } from '../../src/hero/layout-check.ts';
const N = +(process.argv[2] ?? 300);
let seed = +(process.argv[3] ?? 1);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const U = (a, b) => a + (b - a) * rnd();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=mobile&dpr=1`);
await waitReady(page);
const TOP = 345, BOT = 760, M = 14;
function score(r) {
  const iss = checkComposition(r, M);
  const u = r.units;
  let s = -iss.length * 100;
  for (const [n, b] of Object.entries(u)) {
    if (b.y < TOP) s -= (TOP - b.y) * 2;
    if (b.y + b.h > BOT) s -= (b.y + b.h - BOT) * 2;
  }
  if (r.label) {
    if (r.label.x < M || r.label.x + r.label.w > 390 - M || r.label.y < TOP || r.label.y + r.label.h > 770) s -= 80;
  }
  s -= Math.abs(u.rover.w - 200) * 0.6; // lead rover ~ half the width
  s += Math.min(u.quadruped.w, 80) * 0.4 + Math.min(u.drone.w, 70) * 0.4 + Math.min(u.mast.h, 130) * 0.3;
  // horizontal balance: fleet centroid near centre
  const cx = (u.rover.x + u.rover.w / 2 + u.quadruped.x + u.quadruped.w / 2 + u.drone.x + u.drone.w / 2 + u.mast.x + u.mast.w / 2) / 4;
  s -= Math.abs(cx - 195) * 0.3;
  return { s, iss };
}
let best = [];
for (let i = 0; i < N; i++) {
  // local search around the last good mobile composition (see scene.ts COMPOSITIONS.mobile / RIGS.mobile)
  const J = (v, d) => v + U(-d, d);
  const cand = {
    comp: {
      roverPos: [J(-0.81, 0.4), 0, J(-4.85, 0.8)],
      roverYaw: J(-0.6, 0.25),
      bearings: [J(0.52, 0.12), J(-0.2, 0.1), J(-0.36, 0.12)],
      heights: [0, J(2.1, 0.3), 0],
      yaws: [J(2.91, 0.2), 0.4, 0.2],
      label: [Math.round(J(78, 60)), Math.round(J(67, 25))],
    },
    rig: {
      pos: [J(0.1, 0.4), J(2.24, 0.6), J(1.92, 1.2)],
      fov: U(52, 70),
      target: [J(-0.25, 0.6), J(0.69, 0.4), J(-6.97, 1.5)],
      vp: [0, U(-0.5, -0.1)],
    },
  };
  const rep = await layoutReport(page, [cand.comp, cand.rig]);
  const { s, iss } = score(rep);
  best.push({ s, iss, cand, units: rep.units, label: rep.label });
  best.sort((a, b) => b.s - a.s);
  best = best.slice(0, 5);
}
const round = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
console.log(JSON.stringify(round(best.slice(0, 3)), null, 0));
await browser.close();

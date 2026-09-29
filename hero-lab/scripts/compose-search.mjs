// Random search over the mobile composition; scores with checkComposition + framing heuristics.
// node scripts/compose-search.mjs [n] [seed]
import { launch, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition } from '../../src/hero/layout-check.ts';
const N = +(process.argv[2] ?? 300);
let seed = +(process.argv[3] ?? 1);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const U = (a, b) => a + (b - a) * rnd();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 600 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=mobile&dpr=1`);
await waitReady(page);
const TOP = 235, BOT = 575, M = 14;
function score(r) {
  const iss = checkComposition(r, M);
  const u = r.units;
  let s = -iss.length * 100;
  for (const [n, b] of Object.entries(u)) {
    if (b.y < TOP) s -= (TOP - b.y) * 2;
    if (b.y + b.h > BOT) s -= (b.y + b.h - BOT) * 2;
  }
  if (r.label) {
    if (r.label.x < M || r.label.x + r.label.w > 390 - M || r.label.y < TOP || r.label.y + r.label.h > 590) s -= 80;
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
  const cand = {
    comp: {
      roverPos: [U(-1.2, 0.6), 0, U(-6.5, -4.2)],
      roverYaw: U(-0.9, 0.9),
      bearings: [U(0.2, 0.9), U(-0.7, 0.4), U(-0.5, 0.4)],
      heights: [0, U(1.4, 2.4), 0],
      yaws: [U(2, 3.2), 0.4, 0.2],
      label: [Math.round(U(-120, 120)), Math.round(U(40, 110))],
    },
    rig: {
      pos: [U(-1, 1), U(1.3, 2.6), U(0.5, 2)],
      fov: U(42, 56),
      target: [U(-1, 2.5), U(0.2, 1.0), U(-10, -6)],
      vp: [0, U(-0.35, 0)],
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

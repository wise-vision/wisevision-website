// Grid search for a base_link placement whose projected triad clears every tyre box at the poster frame.
// node scripts/baselink-search.mjs <layout>
// Prints every candidate with its composition issues; pick one on the rover's body frame (REP-105) that is clean.
import { launch, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition } from '../../src/hero/layout-check.ts';
const layout = process.argv[2] ?? 'desktop';
const vp = layout === 'mobile' ? { width: 390, height: 780 } : { width: 1440, height: 800 };
const browser = await launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=${layout}&dpr=1`);
await waitReady(page);
const out = [];
const XS = (process.env.XS ?? '-0.3,-0.23,-0.16,-0.08,0,0.08,0.16,0.23,0.3').split(',').map(Number);
const YS = (process.env.YS ?? '0.02,0.17,0.36').split(',').map(Number);
for (const x of XS)
  for (const y of YS)
    for (const len of (process.env.LENS ?? "0.18").split(",").map(Number)) {
      const rep = await layoutReport(page, [{ baseLinkX: x, baseLinkY: y, baseLinkLen: len }, null]);
      const iss = checkComposition(rep).filter((i) => i.startsWith('base_link'));
      out.push({ x, y, len, iss: iss.join('; '), tri: rep.baseLinkTriad && Object.values(rep.baseLinkTriad).map(Math.round) });
    }
for (const o of out) console.log(JSON.stringify(o));
await browser.close();

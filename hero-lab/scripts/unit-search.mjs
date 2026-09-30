// Search one unit's bearing + scale (mobile by default) for a clean checkComposition incl. the copy zone.
// node scripts/unit-search.mjs <layout> <unitIndex 0..2> <bearings csv> <scales csv>
import { launch, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition } from '../../src/hero/layout-check.ts';
const [layout = 'mobile', idx = '2', bs = '', ss = '1.5'] = process.argv.slice(2);
const i = +idx;
const vp = layout === 'mobile' ? { width: 390, height: 780 } : { width: 1440, height: 800 };
const browser = await launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=${layout}&dpr=1`);
await waitReady(page);
// current composition (scene.ts can't be node-imported: extensionless imports)
const base = await page.evaluate(() => document.getElementById('hero').__hero.comp?.() ?? null) ?? JSON.parse(process.env.BASE_COMP);
const name = ['quadruped', 'drone', 'mast'][i];
for (const b of bs.split(',').map(Number))
  for (const s of ss.split(',').map(Number)) {
    const bearings = [...base.bearings];
    bearings[i] = b;
    const scales = [...base.scales];
    scales[i] = s;
    const rep = await layoutReport(page, [{ bearings, scales }, null]);
    const iss = [...new Set(checkComposition(rep, 8))];
    const u = rep.units[name];
    console.log(JSON.stringify({ b, s, box: [u.x, u.y, u.w, u.h].map(Math.round), iss: iss.join('; ') }));
  }
await browser.close();

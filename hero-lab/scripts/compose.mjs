// Composition tuner: node scripts/compose.mjs <layout> '<json: {comp, rig}>' [out.png]
// Renders beat 0 with overrides, prints the screen-space layout report + collision issues.
import { launch, collectErrors, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition } from '../../src/hero/layout-check.ts';
const [layout = 'mobile', json = '{}', out] = process.argv.slice(2);
const { comp, rig } = JSON.parse(json);
const vp = layout === 'mobile' ? { width: 390, height: 600 } : { width: 1440, height: 800 };
const browser = await launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
const errors = collectErrors(page);
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=${layout}&dpr=1`);
await waitReady(page);
const rep = await layoutReport(page, comp || rig ? [comp, rig] : null);
await page.waitForTimeout(800);
if (out) await page.screenshot({ path: out });
const round = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v) : v)));
console.log(JSON.stringify({ units: round(rep.units), label: round(rep.label), issues: checkComposition(rep), errors }));
await browser.close();

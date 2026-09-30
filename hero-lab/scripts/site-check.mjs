// Site-level check of the integrated hero on `astro preview` (default :4321):
//   poster = LCP, zero console errors WebGL on/off, canvas cross-fade alignment (poster vs first frame).
// node hero-lab/scripts/site-check.mjs [base]
import { chromium } from 'playwright';
import sharp from 'sharp';
const base = process.argv[2] ?? 'http://localhost:4321';
const OUT = process.env.OUT_DIR ?? '/home/adam/.hermes/cache/scratch/wvrevive/H/';
const res = [];
for (const webgl of [true, false]) {
  const browser = await chromium.launch({
    headless: true,
    args: webgl ? ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'] : ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'],
  });
  for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(() => {
      window.__lcp = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: e.startTime, el: e.element?.tagName, url: e.url }))).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(`${base}/`, { waitUntil: 'load' });
    const slot = page.locator('#hero-slot');
    try {
      await page.waitForFunction(() => {
        const s = document.getElementById('hero-slot')?.dataset.hero;
        return s && s !== 'loading' && s !== 'probing';
      }, null, { timeout: 15000 });
    } catch {}
    const state = await slot.getAttribute('data-hero');
    await page.waitForTimeout(1200);
    // isolate the two layers: poster alone (canvas + label hidden) vs the live canvas alone (img hidden)
    const show = (which) => page.evaluate((w) => {
      const s = document.getElementById('hero-slot');
      s.querySelectorAll('canvas, .wv-hero-label').forEach((n) => (n.style.visibility = w === 'poster' ? 'hidden' : ''));
      s.querySelector('img').style.visibility = w === 'live' ? 'hidden' : '';
    }, which);
    await show('poster');
    const posterShot = `${OUT}site-${name}-${webgl ? 'on' : 'off'}-poster.png`;
    await slot.screenshot({ path: posterShot });
    await show('live');
    const liveShot = `${OUT}site-${name}-${webgl ? 'on' : 'off'}-live.png`;
    await slot.screenshot({ path: liveShot });
    await show('both');
    // alignment: mean abs diff between poster frame and live frame (same slot rect), 0..255
    const [a, b] = await Promise.all([posterShot, liveShot].map((p) => sharp(p).greyscale().resize(240).raw().toBuffer()));
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    const lcp = await page.evaluate(() => window.__lcp.at(-1));
    await page.screenshot({ path: `${OUT}site-${name}-${webgl ? 'on' : 'off'}-page.png` });
    res.push({ webgl, name, state, lcp, posterVsLiveMeanDiff: +(diff / a.length).toFixed(2), errors });
    await page.close();
  }
  await browser.close();
}
console.log(JSON.stringify(res, null, 1));
if (res.some((r) => r.errors.length)) process.exit(1);

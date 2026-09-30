// Profile the hero init on the site under CPU throttle: long tasks + their attribution.
// node hero-lab/scripts/init-profile.mjs [base] [throttle]
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:4321';
const rate = +(process.argv[3] ?? 4);
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }))).observe({ type: 'longtask', buffered: true });
});
await page.goto(`${base}/`, { waitUntil: 'load' });
await page.waitForFunction(() => { const s = document.getElementById('hero-slot')?.dataset.hero; return s && s !== 'loading' && s !== 'probing'; }, null, { timeout: 60000 });
await page.waitForTimeout(3000);
const out = await page.evaluate(() => ({ lt: window.__lt, hb: performance.getEntriesByType('mark').filter((m) => m.name.startsWith('hb:')).map((m) => [m.name, Math.round(m.startTime)]), marks: performance.getEntriesByType('measure').map((m) => ({ n: m.name, s: Math.round(m.startTime), d: Math.round(m.duration) })), state: document.getElementById('hero-slot').dataset.hero }));
const tbt = out.lt.reduce((a, t) => a + Math.max(0, t.dur - 50), 0);
console.log(JSON.stringify({ rate, tbtApprox: tbt, ...out }, null, 1));
await browser.close();

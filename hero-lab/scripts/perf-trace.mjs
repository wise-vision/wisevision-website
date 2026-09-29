// Perf evidence: CDP trace of a scripted scroll through all 5 beats, desktop and 4× CPU throttled mobile.
//   node scripts/perf-trace.mjs     (preview server on :4317)
// Reports avg fps from the trace (DrawFrame / BeginFrame events) and from rAF deltas, plus p95 frame time.
import { mkdir, writeFile } from 'node:fs/promises';
import { launch, collectErrors, waitReady, BASE } from './lib.mjs';

const OUT = new URL('../out/perf/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const RUNS = [
  { name: 'desktop', vw: 1440, vh: 900, dpr: 1.5, throttle: 1 },
  { name: 'mobile-4x-throttle', vw: 390, vh: 844, dpr: 3, throttle: 4, mobile: true },
];
const DURATION_MS = 6000;

const browser = await launch();
const results = [];
for (const r of RUNS) {
  const ctx = await browser.newContext({ viewport: { width: r.vw, height: r.vh }, deviceScaleFactor: r.dpr, isMobile: !!r.mobile, hasTouch: !!r.mobile });
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto(`${BASE}/?parallax=0&lenis=0`);
  const st = await waitReady(page);
  if (!st.ready) throw new Error('webgl did not start');
  await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page);
  if (r.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: r.throttle });

  const events = [];
  cdp.on('Tracing.dataCollected', (e) => events.push(...e.value));
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res));
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink', 'gpu'] },
  });

  // scripted scroll 0 → 100% → 0 (every beat, both directions), one step per animation frame
  const deltas = await page.evaluate(async (dur) => {
    const track = document.getElementById('track');
    const range = track.offsetHeight - innerHeight;
    const out = [];
    let last = performance.now();
    const t0 = last;
    await new Promise((res) => {
      function step(now) {
        out.push(now - last);
        last = now;
        const t = (now - t0) / dur;
        if (t >= 1) return res();
        const f = t < 0.5 ? t * 2 : 2 - t * 2;
        window.scrollTo(0, range * f);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
    return out.slice(1);
  }, DURATION_MS);

  // direct cost: synchronous render of every beat with gl.finish(), i.e. CPU + GPU time per frame
  const renderCost = await page.evaluate(() => {
    const hero = document.getElementById('hero');
    const gl = hero.querySelector('canvas').getContext('webgl2');
    const times = [];
    for (let i = 0; i <= 120; i++) {
      const t = performance.now();
      hero.__hero.render(i / 120);
      gl.finish();
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    return { avgMs: times.reduce((a, b) => a + b, 0) / times.length, p95Ms: times[Math.floor(times.length * 0.95)] };
  });
  await cdp.send('Tracing.end');
  await done;
  await writeFile(`${OUT}${r.name}.trace.json`, JSON.stringify({ traceEvents: events }));

  // trace-based fps: frames actually presented by the compositor in the renderer's main frame
  const draws = events.filter((e) => e.name === 'DrawFrame').map((e) => e.ts).sort((a, b) => a - b);
  const span = draws.length > 1 ? (draws[draws.length - 1] - draws[0]) / 1e6 : 0;
  const traceFps = span ? (draws.length - 1) / span : null;
  const sorted = deltas.slice().sort((a, b) => a - b);
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  // harness ceiling: the same scroll with the hero destroyed (poster only)
  const ceiling = await page.evaluate(async (dur) => {
    window.__heroHandle.destroy();
    const track = document.getElementById('track');
    const range = track.offsetHeight - innerHeight;
    let n = 0; const t0 = performance.now();
    await new Promise((res) => { function s(now) { n++; const t = (now - t0) / dur; if (t >= 1) return res(); window.scrollTo(0, range * (t < 0.5 ? t * 2 : 2 - t * 2)); requestAnimationFrame(s); } requestAnimationFrame(s); });
    return n / ((performance.now() - t0) / 1000);
  }, 3000);
  const res = {
    run: r.name,
    cpuThrottle: r.throttle,
    frames: deltas.length,
    rafAvgFps: +(1000 / avg).toFixed(1),
    rafP95FrameMs: +p95.toFixed(1),
    traceDrawFrames: draws.length,
    traceFps: traceFps && +traceFps.toFixed(1),
    renderCostAvgMs: +renderCost.avgMs.toFixed(2),
    renderCostP95Ms: +renderCost.p95Ms.toFixed(2),
    renderBoundFps: +(1000 / renderCost.p95Ms).toFixed(0),
    harnessCeilingFps_noHero: +ceiling.toFixed(1),
    trace: `${OUT}${r.name}.trace.json`,
    consoleErrors: errors,
  };
  if (r.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  results.push(res);
  await ctx.close();
}
await browser.close();
const renderer = 'ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL ES 3.2), headless Chromium via Playwright';
const summary = { renderer, durationMs: DURATION_MS, results };
await writeFile(`${OUT}summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

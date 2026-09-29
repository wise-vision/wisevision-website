// Render the beat-0 frame of OUR scene as the LCP poster, plus the headline+CTA previews for the cold vision gate.
//   node scripts/render-poster.mjs            (needs `npm run build && npm run preview` on :4317, or HERO_LAB_URL)
// Outputs:
//   out/hero-desktop{,-base_link}.{png,avif,webp}   2880×1600
//   out/hero-mobile{,-base_link}.{png,avif,webp}    780×1200
//   public/poster/*  (copies used by the harness/preview pages; site integration copies from out/)
//   $SCRATCH/wvrevive/C/preview-{desktop,mobile}{,-base_link}.png  1440×900 / 390×844 with headline + CTA
import { mkdir, copyFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { launch, collectErrors, waitReady, BASE } from './lib.mjs';

const OUT = new URL('../out/', import.meta.url).pathname;
const PUB = new URL('../public/poster/', import.meta.url).pathname;
const DIST = new URL('../dist/poster/', import.meta.url).pathname; // vite preview serves dist/
const PREV = process.env.PREVIEW_DIR ?? '/home/adam/.hermes/cache/scratch/wvrevive/H/';
await Promise.all([OUT, PUB, DIST, PREV].map((d) => mkdir(d, { recursive: true })));

const POSTERS = [
  { name: 'hero-desktop', layout: 'desktop', vw: 1440, vh: 800, dpr: 2 }, // 2880×1600
  { name: 'hero-mobile', layout: 'mobile', vw: 390, vh: 600, dpr: 2 }, // 780×1200
].filter((p) => !process.env.ONLY || p.layout === process.env.ONLY);
// base_link won the W2 A/B (parent cold read) and is the shipped default. AB=1 re-renders the unlabelled variant too.
const VARIANTS = [
  ...(process.env.AB === '1' ? [{ suffix: '-unlabelled', label: 'none' }] : []),
  { suffix: '', label: 'base_link' },
];

const browser = await launch();
const allErrors = [];
const report = [];

for (const v of VARIANTS) {
  for (const p of POSTERS) {
    const page = await browser.newPage({ viewport: { width: p.vw, height: p.vh }, deviceScaleFactor: p.dpr });
    const errors = collectErrors(page);
    const q = new URLSearchParams({ p: '0', copy: '0', poster: '0', parallax: '0', layout: p.layout, label: v.label, dpr: String(p.dpr) });
    await page.goto(`${BASE}/?${q}`);
    const st = await waitReady(page);
    if (!st.ready) throw new Error(`WebGL did not start for ${p.name}${v.suffix}: ${JSON.stringify(st.fallback)}`);
    await page.waitForTimeout(1000); // canvas/label fade-in (700ms)
    const base = `${OUT}${p.name}${v.suffix}`;
    await page.screenshot({ path: `${base}.png` });
    await sharp(`${base}.png`).avif({ quality: 58, effort: 7, chromaSubsampling: '4:4:4' }).toFile(`${base}.avif`);
    await sharp(`${base}.png`).webp({ quality: 82, effort: 6 }).toFile(`${base}.webp`);
    for (const ext of ['avif', 'webp'])
      for (const d of [PUB, DIST]) await copyFile(`${base}.${ext}`, `${d}${p.name}${v.suffix}.${ext}`);
    await copyFile(`${base}.png`, `${PREV}poster-${p.layout}${v.suffix}.png`);
    const meta = await sharp(`${base}.png`).metadata();
    report.push({
      poster: `${p.name}${v.suffix}`,
      px: `${meta.width}x${meta.height}`,
      avifKB: +((await stat(`${base}.avif`)).size / 1024).toFixed(1),
      webpKB: +((await stat(`${base}.webp`)).size / 1024).toFixed(1),
    });
    allErrors.push(...errors.map((e) => `${p.name}${v.suffix}: ${e}`));
    await page.close();
  }
}

// headline + CTA over the poster, WebGL-free page (what the LCP frame actually looks like)
const PREVIEWS = [
  { name: 'preview-desktop', vw: 1440, vh: 900 },
  { name: 'preview-mobile', vw: 390, vh: 844 },
];
for (const v of VARIANTS) {
  for (const p of PREVIEWS) {
    const page = await browser.newPage({ viewport: { width: p.vw, height: p.vh }, deviceScaleFactor: 1 });
    const errors = collectErrors(page);
    await page.goto(`${BASE}/preview.html?variant=${encodeURIComponent(v.suffix)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(300);
    const path = `${PREV}${p.name}${v.suffix}.png`;
    await page.screenshot({ path });
    report.push({ preview: path });
    allErrors.push(...errors.map((e) => `${p.name}${v.suffix}: ${e}`));
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify({ report, consoleErrors: allErrors }, null, 2));
if (allErrors.length) process.exit(1);

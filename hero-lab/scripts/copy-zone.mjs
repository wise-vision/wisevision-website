// Measure the headline + CTA text boxes over the hero on the built site and the harness preview, mapped into the
// poster's CSS frame (object-fit: cover + object-position), padded. Output feeds POSTERS[layout].copyZone (poster.ts).
// node scripts/copy-zone.mjs [siteBase]
import { chromium } from 'playwright';
import { POSTERS, objectPosition } from '../../src/hero/poster.ts';
const site = process.argv[2] ?? 'http://localhost:4321';
const lab = process.env.HERO_LAB_URL ?? 'http://localhost:4317';
const PAD = 8;
const browser = await chromium.launch({ headless: true, args: ['--disable-webgl', '--disable-webgl2'] });
const zones = { desktop: [], mobile: [] };
// [label, url, frame (the poster's container), copy root]
for (const [where, url, slotSel, copySel] of [['site', `${site}/`, '#hero-slot', '[data-hero-root]'], ['preview', `${lab}/preview.html`, '#hero', '#hero']]) {
  for (const [layout, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(([sel, root]) => {
      const img = document.querySelector(`${sel} img`).getBoundingClientRect();
      const out = [];
      const text = (el) => {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        for (const q of rg.getClientRects()) if (q.width > 1) out.push([q.left, q.top, q.width, q.height]);
      };
      document.querySelectorAll(`${root} h1, ${root} p`).forEach(text);
      document.querySelectorAll(`${root} a`).forEach((a) => {
        const q = a.getBoundingClientRect();
        if (q.width > 0 && getComputedStyle(a).display !== 'none') out.push([q.left, q.top, q.width, q.height]);
      });
      return { img: [img.x, img.y, img.width, img.height], rects: out };
    }, [slotSel, copySel]);
    const P = POSTERS[layout], pw = P.width / 2, ph = P.height / 2;
    const [ix, iy, iw, ih] = r.img;
    const s = Math.max(iw / pw, ih / ph);
    const [opx, opy] = objectPosition(layout).map((v) => v / 100);
    const ox = ix + (iw - pw * s) * opx, oy = iy + (ih - ph * s) * opy;
    for (const [x, y, rw, rh] of r.rects)
      zones[layout].push({ x: Math.round((x - ox) / s - PAD), y: Math.round((y - oy) / s - PAD), w: Math.round(rw / s + 2 * PAD), h: Math.round(rh / s + 2 * PAD), from: where });
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(zones));

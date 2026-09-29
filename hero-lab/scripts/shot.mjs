// Quick dev screenshot: node scripts/shot.mjs <out.png> <w> <h> [query]
import { launch, collectErrors, waitReady, BASE } from './lib.mjs';
const [out = 'out/shot.png', w = '1440', h = '900', query = 'p=0&copy=0&poster=0'] = process.argv.slice(2);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = collectErrors(page);
await page.goto(`${BASE}/?${query}`);
const st = await waitReady(page);
await page.waitForTimeout(900);
await page.screenshot({ path: out });
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2');
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  return { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, hero: document.getElementById('hero').dataset.hero };
});
console.log(JSON.stringify({ out, st, info, errors }));
await browser.close();

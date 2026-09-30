import { test, expect } from '@playwright/test';

for (const vp of [{ width: 1440, height: 900, layout: 'desktop' }, { width: 390, height: 844, layout: 'mobile' }]) {
  test(`WebGL on (${vp.layout}): canvas present, zero console errors, all beats render`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__heroReady, null, { timeout: 20_000 });
    expect(await page.evaluate(() => (window as any).__heroReady)).toMatchObject({ layout: vp.layout });
    await expect(page.locator('#hero canvas')).toHaveCount(1);
    await expect(page.locator('#hero')).toHaveAttribute('data-hero', 'webgl');
    const pts = await page.evaluate(() => (window as any).__heroReady.points);
    expect(pts).toBeLessThanOrEqual(12_000);
    // DPR cap
    const dpr = await page.evaluate(() => { const c = document.querySelector('#hero canvas') as HTMLCanvasElement; return c.width / c.clientWidth; });
    expect(dpr).toBeLessThanOrEqual(vp.layout === 'mobile' ? 1.25 : 1.5);
    // headline stays HTML above the canvas
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const y of [0.25, 0.5, 0.75, 1]) {
      await page.evaluate((f) => window.scrollTo(0, (document.getElementById('track')!.offsetHeight - innerHeight) * f), y);
      await page.waitForTimeout(250);
    }
    expect(errors).toEqual([]);
  });
}

test('render on demand: no frames while idle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?parallax=0');
  await page.waitForFunction(() => (window as any).__heroReady);
  await page.waitForTimeout(400);
  const calls = await page.evaluate(async () => {
    const c = document.querySelector('#hero canvas') as HTMLCanvasElement;
    const gl = c.getContext('webgl2') as WebGL2RenderingContext;
    let n = 0;
    const orig = gl.drawArrays.bind(gl);
    (gl as any).drawArrays = (...a: any[]) => { n++; return (orig as any)(...a); };
    await new Promise((r) => setTimeout(r, 1000));
    return n;
  });
  expect(calls).toBe(0);
});

import { test, expect } from '@playwright/test';

test('WebGL disabled: poster stays, no canvas, zero console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__heroFallback);
  const fb = await page.evaluate(() => (window as any).__heroFallback);
  expect(fb).toEqual({ ok: false, reason: 'no-webgl2' });
  await expect(page.locator('#hero')).toHaveAttribute('data-hero', 'poster:no-webgl2');
  await expect(page.locator('#hero canvas')).toHaveCount(0);
  const img = page.locator('[data-hero-poster] img');
  await expect(img).toBeVisible();
  await page.waitForFunction(() => { const i = document.querySelector('[data-hero-poster] img') as HTMLImageElement; return i.complete && i.naturalWidth > 0; });
  expect(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).toMatch(/hero-desktop\.(avif|webp)$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/The AI layer for ROS\s2 robots/);
  await expect(page.getByRole('link', { name: 'Try ROS2 MCP' })).toBeVisible();
  // scrolling must not wake anything up
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  await expect(page.locator('#hero canvas')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/webgl-off-desktop.png' });
  expect(errors).toEqual([]);
});

test('reduced motion: poster stays even with WebGL available to the gate', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__heroFallback);
  expect(await page.evaluate(() => (window as any).__heroFallback.reason)).toBe('reduced-motion');
  await expect(page.locator('#hero canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('WebGL disabled, mobile: mobile poster is served', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForFunction(() => { const i = document.querySelector('[data-hero-poster] img') as HTMLImageElement; return i.complete && i.naturalWidth > 0; });
  expect(await page.locator('[data-hero-poster] img').evaluate((i: HTMLImageElement) => i.currentSrc)).toMatch(/hero-mobile\.(avif|webp)$/);
  await page.screenshot({ path: 'test-results/webgl-off-mobile.png' });
});

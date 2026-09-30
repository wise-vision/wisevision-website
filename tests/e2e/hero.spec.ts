// Site-level hero check on the built site (astro preview). Runs in CI (job hero-e2e): WebGL is disabled
// so no GPU is needed. Asserts the poster is the LCP element, the capability gate keeps it, the island never
// throws, and headline + CTA are real HTML over it.
import { test, expect } from '@playwright/test';

for (const vp of [
  { name: 'desktop', width: 1440, height: 900, poster: '/hero/hero-desktop.avif' },
  { name: 'mobile', width: 390, height: 844, poster: '/hero/hero-mobile.avif' },
]) {
  test(`home hero, WebGL off (${vp.name}): poster is LCP, gate keeps it, zero console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.addInitScript(() => {
      (window as any).__lcp = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e: any) => (window as any).__lcp.push(e.url))).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('/');
    const slot = page.locator('#hero-slot');
    await expect(slot).toHaveAttribute('data-hero', /^poster:/, { timeout: 15_000 });
    await expect(page.locator('#hero-slot canvas')).toHaveCount(0);
    const img = page.locator('#hero-slot img');
    await expect(img).toHaveAttribute('fetchpriority', 'high');
    await expect(img).toHaveAttribute('width', /\d+/);
    expect(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).toContain(vp.poster);
    expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    const lcp: string[] = await page.evaluate(() => (window as any).__lcp);
    expect(lcp.at(-1)).toContain(vp.poster);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/The AI layer for ROS\s2 robots/);
    // copy comes from content/copy/home.md (CTA label + arrow glyph), proof line + chip render in the hero foot
    await expect(page.locator('.hero-copy .btn-primary')).toHaveText(/^Try ROS2 MCP/);
    await expect(page.locator('.hero-foot .proof-line')).toContainText('MPL-2.0');
    await expect(page.locator('.hero-foot .chip')).toContainText('Why did unit 7 stop?');
    // the old CSS placeholder is gone: the poster is the only background layer
    await expect(page.locator('.hero-fallback, .grid-lines, .glow')).toHaveCount(0);
    // the WebGL runtime chunk (three.js) must never be fetched when the gate fails
    const fetched = await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /\/runtime\.[\w-]+\.js$/.test(r.name)));
    expect(fetched).toBe(false);
    expect(errors).toEqual([]);
  });
}

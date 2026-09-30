// Launch-audit regressions on the built site (astro preview). CI: job hero-e2e.
// F1: the first viewport is never reveal-gated (h1 at opacity 1 at DOMContentLoaded).
// F3: the Cloudflare Web Analytics beacon loads on site + docs pages and leaves no cookie / storage behind.
// F13: /favicon.ico and /.well-known/security.txt are served.
// F14: the tool reference table stacks into cards on phones (no horizontal scroll inside the table).
import { test, expect } from '@playwright/test';
import { stubRum } from './rum-stub';

const MOBILE = { width: 390, height: 844 };
const BEACON = /^https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js/;

test.beforeEach(async ({ page }) => { await stubRum(page); });

for (const path of ['/', '/ros2-mcp/', '/wiseos/', '/defence/', '/contact/', '/privacy/', '/no-such-page/']) {
  test(`F1 ${path} @390: h1 is visible (opacity 1) at DOMContentLoaded`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const h1 = document.querySelector('h1');
        const r = h1?.getBoundingClientRect();
        (window as any).__h1 = h1 && {
          opacity: getComputedStyle(h1).opacity,
          inViewport: !!r && r.top < innerHeight && r.bottom > 0,
          gated: h1.closest('[data-reveal]:not(.is-visible)') !== null,
        };
      });
    });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const h1 = await page.evaluate(() => (window as any).__h1);
    expect(h1).toEqual({ opacity: '1', inViewport: true, gated: false });
  });
}

test('F1: nothing inside the first viewport is left hidden by the reveal at DOMContentLoaded', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as any).__hidden = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && !el.classList.contains('is-visible'); })
        .map((el) => el.outerHTML.slice(0, 80));
    });
  });
  for (const path of ['/', '/ros2-mcp/', '/wiseos/', '/defence/', '/contact/', '/privacy/']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => (window as any).__hidden), path).toEqual([]);
  }
});

for (const path of ['/', '/privacy/', '/docs/ros2-mcp/quickstart/']) {
  test(`F3 ${path}: CF Web Analytics beacon is requested; no cookie, localStorage or sessionStorage from the site`, async ({ page, context }) => {
    const beacon: string[] = [];
    page.on('request', (r) => BEACON.test(r.url()) && beacon.push(r.url()));
    await page.goto(path, { waitUntil: 'load' });
    await expect.poll(() => beacon.length, { timeout: 10_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    const tag = page.locator('script[src^="https://static.cloudflareinsights.com/beacon.min.js"]');
    await expect(tag).toHaveCount(1);
    expect(JSON.parse((await tag.getAttribute('data-cf-beacon')) ?? '{}')).toEqual({ token: expect.stringMatching(/^[0-9a-f]{32}$/) });
    expect(await context.cookies()).toEqual([]);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    // Starlight's own theme/sidebar keys on /docs are disclosed in the privacy notice; nothing else may appear.
    const allowed = /^(starlight-theme|sl-sidebar-state)$/;
    expect(storage.local.filter((k) => !allowed.test(k))).toEqual([]);
    expect(storage.session.filter((k) => !allowed.test(k))).toEqual([]);
  });
}

test('F13: /favicon.ico and /.well-known/security.txt are served', async ({ request }) => {
  const ico = await request.get('/favicon.ico');
  expect(ico.status()).toBe(200);
  expect((await ico.body()).readUInt16LE(2)).toBe(1);
  const sec = await request.get('/.well-known/security.txt');
  expect(sec.status()).toBe(200);
  expect(await sec.text()).toMatch(/^Contact: mailto:hello@wisevision\.tech$/m);
});

test('F14 /docs/ros2-mcp/tools/ @390: tool table rows are stacked cards with no in-table horizontal scroll', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/docs/ros2-mcp/tools/');
  const table = page.locator('.sl-markdown-content table').first();
  const m = await table.evaluate((t) => {
    const row = t.querySelector('tbody tr')!;
    const [a, b] = [...row.querySelectorAll('td')].map((c) => c.getBoundingClientRect());
    return { overflow: t.scrollWidth - t.clientWidth, tr: getComputedStyle(row).display, stacked: b.top >= a.bottom - 1 };
  });
  expect(m).toEqual({ overflow: 0, tr: 'block', stacked: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

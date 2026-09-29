#!/usr/bin/env node
// Capture review screenshots from a running `astro preview`. Not part of CI.
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
//   first viewport of / at 1440x900 and 390x844 (hero island absent → #hero-slot fallback),
//   plus a full-page capture of every route at 390 and 1440 (reduced motion so reveals are visible).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const ROUTES = [['home', '/'], ['ros2-mcp', '/ros2-mcp/'], ['wiseos', '/wiseos/'], ['defence', '/defence/'], ['contact', '/contact/'], ['privacy', '/privacy/'], ['docs', '/docs/'], ['404', '/404.html']];
const SIZES = [[1440, 900], [390, 844]];

const browser = await chromium.launch();
const errors = [];
for (const [w, h] of SIZES) {
  // first viewport of home WITH motion (what a visitor sees after reveals settle)
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`/ ${w}: ${e.message}`));
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/home-first-viewport-${w}.png` });
  console.log(`${out}/home-first-viewport-${w}.png`);
  await ctx.close();
  for (const [name, path] of ROUTES) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(`${path} ${w}: ${e.message}`));
    await p.goto(`${base}${path}`, { waitUntil: 'load' });
    await p.waitForTimeout(1200); // not networkidle: the Turnstile iframe keeps polling on forms pages
    await p.screenshot({ path: `${out}/${name}-full-${w}.png`, fullPage: true });
    console.log(`${out}/${name}-full-${w}.png`);
    await c.close();
  }
}
await browser.close();
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}

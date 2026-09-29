#!/usr/bin/env node
// Capture home page screenshots from a running `astro preview`. Not part of CI.
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4321';
const out = process.argv[3] ?? 'screenshots';
const browser = await chromium.launch();
for (const [name, width, height] of [['home-1440', 1440, 900], ['home-390', 390, 844], ['docs-1440', 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.goto(`${base}${name.startsWith('docs') ? '/docs/' : '/'}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(`${out}/${name}.png`);
  await page.close();
}
await browser.close();

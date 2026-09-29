// Shared Playwright helpers for hero-lab scripts.
import { chromium } from 'playwright';

export const BASE = process.env.HERO_LAB_URL ?? 'http://localhost:4317';

/** GPU-backed headless Chromium (ANGLE over EGL → the host's real GPU, Mesa Intel UHD on this box). */
export async function launch({ webgl = true } = {}) {
  const args = webgl
    ? ['--use-gl=angle', '--use-angle=' + (process.env.HERO_ANGLE ?? 'gl-egl'), '--ignore-gpu-blocklist']
    : ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];
  return chromium.launch({ headless: true, args });
}

export function collectErrors(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function waitReady(page, timeout = 20000) {
  await page.waitForFunction(() => window.__heroReady || window.__heroFallback, null, { timeout });
  return page.evaluate(() => ({ ready: window.__heroReady ?? null, fallback: window.__heroFallback ?? null }));
}

/** Screen-space composition report from the live page; Sets are shipped as arrays and rebuilt here. */
export async function layoutReport(page, tune) {
  const r = await page.evaluate(([c, g]) => {
    const h = document.getElementById('hero').__hero;
    if (c || g) h.tune(c, g);
    const rep = h.layoutReport();
    return { ...rep, occupancy: Object.fromEntries(Object.entries(rep.occupancy).map(([k, v]) => [k, [...v]])) };
  }, tune ?? [null, null]);
  r.occupancy = Object.fromEntries(Object.entries(r.occupancy).map(([k, v]) => [k, new Set(v)]));
  return r;
}

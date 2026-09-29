// Site e2e (Playwright): runs against `astro preview` of the built dist/. CI: job hero-e2e.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: process.env.SITE_URL ?? 'http://localhost:4321' },
  webServer: {
    command: 'npx astro preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'webgl-off',
      use: { browserName: 'chromium', launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } },
    },
  ],
});

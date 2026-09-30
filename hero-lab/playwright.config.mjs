import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  workers: 1,
  use: { baseURL: process.env.HERO_LAB_URL ?? 'http://localhost:4317' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4317',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'webgl-off',
      testMatch: /webgl-off\.spec/,
      use: { launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } },
    },
    {
      name: 'webgl-on',
      testMatch: /webgl-on\.spec/,
      use: { launchOptions: { args: ['--use-gl=angle', `--use-angle=${process.env.HERO_ANGLE ?? 'gl-egl'}`, '--ignore-gpu-blocklist'] } },
    },
  ],
});

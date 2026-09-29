import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{mjs,ts}'],
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.mjs', 'src/lib/**/*.{ts,mjs,js}'],
      exclude: ['scripts/claims-lint*'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 80 },
    },
  },
});

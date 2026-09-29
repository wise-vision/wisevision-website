import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{mjs,ts}'],
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.mjs', 'src/lib/**/*.{ts,mjs,js}'],
      // src/lib/lead-form.ts is covered by the Workers-runtime suite in functions-dev/ (npm run test:functions).
      exclude: ['scripts/claims-lint*', 'scripts/screenshots.mjs', 'scripts/tests/**', 'src/lib/lead-form.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 80 },
    },
  },
});

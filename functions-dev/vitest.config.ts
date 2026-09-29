import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "..", "migrations"));
  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-08-15",
          d1Databases: ["LEADS"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
      coverage: {
        provider: "istanbul",
        include: ["**/functions/api/**/*.ts", "**/functions/_lib/**/*.ts", "**/src/lib/lead-form.ts"],
        allowExternal: true,
        reporter: ["text", "json-summary"],
        thresholds: { lines: 80 },
      },
    },
  };
});

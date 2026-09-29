import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

const e = env as unknown as { LEADS: D1Database; TEST_MIGRATIONS: D1Migration[] };
await applyD1Migrations(e.LEADS, e.TEST_MIGRATIONS);

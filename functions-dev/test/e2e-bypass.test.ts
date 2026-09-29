import { beforeEach, describe, expect, it } from "vitest";
import { handleLead } from "../../functions/_lib/lead";
import { FAIL_SECRET, db, deps, fakeMail, fakeSiteverify, jsonRequest, leadCount, makeEnv, resetDb, validLead } from "./helpers";

const KEY = "e2e-test-key-0123456789abcdef0123456789abcdef";
const noToken = (over: Record<string, unknown> = {}) => {
  const l: Record<string, unknown> = validLead({ form: "contact", ...over });
  delete l["cf-turnstile-response"];
  return l;
};

beforeEach(async () => {
  await resetDb();
});

describe("E2E bypass (X-WV-E2E header vs E2E_KEY secret)", () => {
  it("correct key: skips Turnstile, stores the row with use_case prefixed [e2e], mails", async () => {
    const verify = fakeSiteverify();
    const mail = fakeMail();
    const res = await handleLead(
      jsonRequest(noToken(), { headers: { "x-wv-e2e": KEY } }),
      makeEnv({ E2E_KEY: KEY, TURNSTILE_SECRET: FAIL_SECRET }, mail),
      deps({ fetch: verify.fn }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, duplicate: false, mail: true });
    expect(verify.calls).toHaveLength(0);
    const row = await db.prepare("SELECT use_case FROM leads").first<{ use_case: string }>();
    expect(row!.use_case).toBe("[e2e] Drive a Nav2 stack from Claude");
    expect(mail.sent).toHaveLength(1);
  });

  it("correct key with an empty use_case stores exactly [e2e]", async () => {
    const res = await handleLead(
      jsonRequest(noToken({ use_case: "" }), { headers: { "x-wv-e2e": KEY } }),
      makeEnv({ E2E_KEY: KEY }),
      deps(),
    );
    expect(res.status).toBe(200);
    const row = await db.prepare("SELECT use_case FROM leads").first<{ use_case: string }>();
    expect(row!.use_case).toBe("[e2e]");
  });

  it("wrong key: 403 e2e_forbidden, no row, Turnstile never called", async () => {
    const verify = fakeSiteverify();
    for (const wrong of [KEY.slice(0, -1) + "x", "short", KEY + "extra"]) {
      const res = await handleLead(
        jsonRequest(validLead(), { headers: { "x-wv-e2e": wrong } }),
        makeEnv({ E2E_KEY: KEY }),
        deps({ fetch: verify.fn }),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ ok: false, error: "e2e_forbidden" });
    }
    expect(verify.calls).toHaveLength(0);
    expect(await leadCount()).toBe(0);
  });

  it("missing E2E_KEY secret: the bypass is disabled (no token → 400; failing token → 403)", async () => {
    const r1 = await handleLead(jsonRequest(noToken(), { headers: { "x-wv-e2e": KEY } }), makeEnv(), deps());
    expect(r1.status).toBe(400);
    expect(await r1.json()).toMatchObject({ fields: { turnstile: "required" } });

    const r2 = await handleLead(
      jsonRequest(validLead(), { headers: { "x-wv-e2e": KEY }, ip: "198.51.100.9" }),
      makeEnv({ E2E_KEY: "", TURNSTILE_SECRET: FAIL_SECRET }),
      deps(),
    );
    expect(r2.status).toBe(403);
    expect(await r2.json()).toMatchObject({ error: "turnstile_failed" });
    expect(await leadCount()).toBe(0);
  });

  it("no header: normal Turnstile path even when E2E_KEY is set", async () => {
    const verify = fakeSiteverify();
    const res = await handleLead(jsonRequest(validLead()), makeEnv({ E2E_KEY: KEY }), deps({ fetch: verify.fn }));
    expect(res.status).toBe(200);
    expect(verify.calls).toHaveLength(1);
    const row = await db.prepare("SELECT use_case FROM leads").first<{ use_case: string }>();
    expect(row!.use_case).toBe("Drive a Nav2 stack from Claude");
  });
});

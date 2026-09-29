import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleLead } from "../../functions/_lib/lead";
import {
  FAIL_SECRET, ORIGIN, db, decodeMail, deps, fakeMail, fakeSiteverify, jsonRequest, leadCount, makeEnv, resetDb, validLead,
} from "./helpers";

beforeEach(async () => {
  await resetDb();
});

async function body(res: Response) {
  return (await res.json()) as Record<string, any>;
}

describe("POST /api/lead: happy path", () => {
  it("inserts one row and sends one mail via the send_email binding", async () => {
    const mail = fakeMail();
    const verify = fakeSiteverify();
    const res = await handleLead(jsonRequest(validLead()), makeEnv({}, mail), deps({ fetch: verify.fn }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true, duplicate: false, mail: true });
    expect(await leadCount()).toBe(1);

    const row = await db.prepare("SELECT * FROM leads").first<Record<string, any>>();
    expect(row).toMatchObject({
      form: "early-access", email: "ros.dev@example.org", org: "Acme Robotics", role: "Robotics engineer",
      use_case: "Drive a Nav2 stack from Claude", consent: 1, ua: "vitest/agent",
    });
    expect(row!.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.ip_hash).not.toContain("203.0.113.7");
    expect(row!.dedupe_key).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(row!.ts).toISOString()).toBe(row!.ts);

    expect(verify.calls).toHaveLength(1);
    expect(verify.calls[0].url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const vb = verify.calls[0].body as FormData;
    expect(vb.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX");
    expect(vb.get("remoteip")).toBe("203.0.113.7");

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].isEmailMessage).toBe(true);
    expect(mail.sent[0].from).toBe("leads@wisevision.tech");
    expect(mail.sent[0].to).toBe("adam.krawczyk0698@gmail.com");
    const m = decodeMail(mail.sent[0].raw);
    expect(m.subject).toBe("[wisevision lead] early-access — Acme Robotics");
    expect(m.headers["reply-to"]).toBe("<ros.dev@example.org>");
    expect(m.headers.from).toContain("<leads@wisevision.tech>");
    expect(m.headers.to).toBe("<adam.krawczyk0698@gmail.com>");
    for (const v of ["early-access", "ros.dev@example.org", "Acme Robotics", "Robotics engineer", "Drive a Nav2 stack from Claude", "consent:   yes", "vitest/agent"]) {
      expect(m.body).toContain(v);
    }
  });

  it("uses the email in the subject when org is empty", async () => {
    const mail = fakeMail();
    const res = await handleLead(jsonRequest(validLead({ org: "", form: "contact" })), makeEnv({}, mail), deps());
    expect(res.status).toBe(200);
    expect(decodeMail(mail.sent[0].raw).subject).toBe("[wisevision lead] contact — ros.dev@example.org");
  });

  it("accepts an application/x-www-form-urlencoded body (no-JS form post)", async () => {
    const fd = new URLSearchParams({
      form: "demo", email: "Ops@Example.COM", org: "Fleet Co", consent: "on", website: "",
      "cf-turnstile-response": "tok",
    });
    const req = new Request(`${ORIGIN}/api/lead`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "198.51.100.1", origin: ORIGIN },
      body: fd.toString(),
    });
    const res = await handleLead(req, makeEnv(), deps());
    expect(res.status).toBe(200);
    const row = await db.prepare("SELECT email, form, consent FROM leads").first();
    expect(row).toEqual({ email: "ops@example.com", form: "demo", consent: 1 });
  });

  it("accepts a multipart/form-data body", async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(validLead({ consent: "true" }))) fd.set(k, String(v));
    const req = new Request(`${ORIGIN}/api/lead`, {
      method: "POST", headers: { "cf-connecting-ip": "198.51.100.2", origin: ORIGIN }, body: fd,
    });
    const res = await handleLead(req, makeEnv(), deps());
    expect(res.status).toBe(200);
    expect(await leadCount()).toBe(1);
  });

  it("accepts a request with no Origin header (same-origin navigations may omit it)", async () => {
    const res = await handleLead(jsonRequest(validLead(), { origin: null }), makeEnv(), deps());
    expect(res.status).toBe(200);
  });

  it("does not store the raw IP and the hash rotates with the UTC day", async () => {
    const d1 = new Date("2026-10-01T10:00:00Z");
    const d2 = new Date("2026-10-02T10:00:00Z");
    await handleLead(jsonRequest(validLead({ email: "a@example.org" })), makeEnv(), deps({ now: () => d1 }));
    await handleLead(jsonRequest(validLead({ email: "b@example.org" })), makeEnv(), deps({ now: () => d2 }));
    const { results } = await db.prepare("SELECT ip_hash FROM leads ORDER BY id").all<{ ip_hash: string }>();
    expect(results).toHaveLength(2);
    expect(results[0].ip_hash).not.toBe(results[1].ip_hash);
  });
});

describe("POST /api/lead: validation (400, no row, no mail)", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["invalid email", { email: "not-an-email" }, "email"],
    ["email with spaces", { email: "a b@example.org" }, "email"],
    ["email with CRLF (header injection)", { email: "a@example.org\r\nBcc: x@evil.test" }, "email"],
    ["email too long", { email: `${"a".repeat(250)}@example.org` }, "email"],
    ["missing email", { email: undefined }, "email"],
    ["missing consent", { consent: undefined }, "consent"],
    ["consent false", { consent: false }, "consent"],
    ["consent 'off'", { consent: "off" }, "consent"],
    ["honeypot filled", { website: "http://spam.example" }, "website"],
    ["unknown form", { form: "newsletter" }, "form"],
    ["missing form", { form: undefined }, "form"],
    ["org too long", { org: "x".repeat(201) }, "org"],
    ["role too long", { role: "x".repeat(121) }, "role"],
    ["use_case too long", { use_case: "x".repeat(4001) }, "use_case"],
    ["non-string org", { org: { $ne: 1 } }, "org"],
    ["missing turnstile token", { "cf-turnstile-response": undefined }, "turnstile"],
  ];
  for (const [name, over, field] of cases) {
    it(name, async () => {
      const mail = fakeMail();
      const payload = validLead(over);
      const res = await handleLead(jsonRequest(payload), makeEnv({}, mail), deps());
      expect(res.status).toBe(400);
      const b = await body(res);
      expect(b.ok).toBe(false);
      expect(b.error).toBe("validation_failed");
      expect(Object.keys(b.fields)).toContain(field);
      expect(await leadCount()).toBe(0);
      expect(mail.sent).toHaveLength(0);
    });
  }

  it("rejects malformed JSON with 400", async () => {
    const req = new Request(`${ORIGIN}/api/lead`, {
      method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, "cf-connecting-ip": "203.0.113.9" },
      body: "{not json",
    });
    const res = await handleLead(req, makeEnv(), deps());
    expect(res.status).toBe(400);
    expect((await body(res)).error).toBe("invalid_body");
  });

  it("rejects a JSON array body with 400", async () => {
    const res = await handleLead(jsonRequest([1, 2]), makeEnv(), deps());
    expect(res.status).toBe(400);
  });

  it("rejects an unsupported content type with 415", async () => {
    const req = new Request(`${ORIGIN}/api/lead`, {
      method: "POST", headers: { "content-type": "text/plain", origin: ORIGIN }, body: "hi",
    });
    expect((await handleLead(req, makeEnv(), deps())).status).toBe(415);
  });

  it("rejects an oversized body with 413", async () => {
    const res = await handleLead(jsonRequest(validLead({ use_case: "x".repeat(40_000) })), makeEnv(), deps());
    expect(res.status).toBe(413);
    expect(await leadCount()).toBe(0);
  });

  it("does not call Turnstile when the honeypot is filled", async () => {
    const verify = fakeSiteverify();
    await handleLead(jsonRequest(validLead({ website: "x" })), makeEnv(), deps({ fetch: verify.fn }));
    expect(verify.calls).toHaveLength(0);
  });
});

describe("POST /api/lead: Turnstile", () => {
  it("returns 403 and stores nothing when siteverify fails (test secret 2x…AA)", async () => {
    const mail = fakeMail();
    const res = await handleLead(jsonRequest(validLead()), makeEnv({ TURNSTILE_SECRET: FAIL_SECRET }, mail), deps());
    expect(res.status).toBe(403);
    expect((await body(res)).error).toBe("turnstile_failed");
    expect(await leadCount()).toBe(0);
    expect(mail.sent).toHaveLength(0);
  });

  it("fails closed with 503 when siteverify is unreachable", async () => {
    const boom = (async () => { throw new TypeError("network down"); }) as unknown as typeof fetch;
    const res = await handleLead(jsonRequest(validLead()), makeEnv(), deps({ fetch: boom }));
    expect(res.status).toBe(503);
    expect(await leadCount()).toBe(0);
  });

  it("fails closed with 503 when siteverify answers non-JSON / 5xx", async () => {
    const bad = (async () => new Response("oops", { status: 502 })) as unknown as typeof fetch;
    const res = await handleLead(jsonRequest(validLead()), makeEnv(), deps({ fetch: bad }));
    expect(res.status).toBe(503);
    expect(await leadCount()).toBe(0);
  });
});

describe("POST /api/lead: rate limit (per ip_hash, 5 per 10 min, counted in D1)", () => {
  it("answers 429 on the 6th request within 10 minutes", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await handleLead(jsonRequest(validLead({ email: `u${i}@example.org` })), makeEnv(), deps());
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(await leadCount()).toBe(5);
  });

  it("counts rejected attempts too, and sets Retry-After", async () => {
    for (let i = 0; i < 5; i++) {
      await handleLead(jsonRequest(validLead({ email: "bad" })), makeEnv(), deps());
    }
    const res = await handleLead(jsonRequest(validLead()), makeEnv(), deps());
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await leadCount()).toBe(0);
  });

  it("is per IP: another IP is unaffected", async () => {
    for (let i = 0; i < 5; i++) {
      await handleLead(jsonRequest(validLead({ email: `u${i}@example.org` })), makeEnv(), deps());
    }
    const res = await handleLead(jsonRequest(validLead({ email: "other@example.org" }), { ip: "192.0.2.55" }), makeEnv(), deps());
    expect(res.status).toBe(200);
  });

  it("the window slides: after 10 minutes the IP may post again", async () => {
    const t0 = Date.parse("2026-10-01T10:00:00Z");
    for (let i = 0; i < 5; i++) {
      await handleLead(jsonRequest(validLead({ email: `u${i}@example.org` })), makeEnv(), deps({ now: () => new Date(t0 + i * 1000) }));
    }
    const blocked = await handleLead(jsonRequest(validLead({ email: "x@example.org" })), makeEnv(), deps({ now: () => new Date(t0 + 9 * 60_000) }));
    expect(blocked.status).toBe(429);
    const later = await handleLead(jsonRequest(validLead({ email: "y@example.org" })), makeEnv(), deps({ now: () => new Date(t0 + 10 * 60_000 + 5_000) }));
    expect(later.status).toBe(200);
  });
});

describe("POST /api/lead: duplicates", () => {
  it("same email + form within 24h → 200 duplicate:true, no second row, no second mail", async () => {
    const mail = fakeMail();
    const env = makeEnv({}, mail);
    const first = await handleLead(jsonRequest(validLead()), env, deps());
    expect(await body(first)).toMatchObject({ ok: true, duplicate: false });
    const second = await handleLead(jsonRequest(validLead({ email: "ROS.Dev@Example.org", org: "Other" }), { ip: "192.0.2.9" }), env, deps());
    expect(second.status).toBe(200);
    expect(await body(second)).toEqual({ ok: true, duplicate: true });
    expect(await leadCount()).toBe(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("a different form from the same email is not a duplicate", async () => {
    const mail = fakeMail();
    const env = makeEnv({}, mail);
    await handleLead(jsonRequest(validLead()), env, deps());
    const res = await handleLead(jsonRequest(validLead({ form: "demo" })), env, deps());
    expect(await body(res)).toMatchObject({ duplicate: false });
    expect(mail.sent).toHaveLength(2);
  });

  it("the same email + form after more than 24h is accepted again", async () => {
    const t0 = Date.parse("2026-10-01T10:00:00Z");
    await handleLead(jsonRequest(validLead()), makeEnv(), deps({ now: () => new Date(t0) }));
    const res = await handleLead(jsonRequest(validLead()), makeEnv(), deps({ now: () => new Date(t0 + 24 * 3600_000 + 60_000) }));
    expect(await body(res)).toMatchObject({ ok: true, duplicate: false });
    expect(await leadCount()).toBe(2);
  });

  it("dedupe_key UNIQUE makes a concurrent race safe (one row, one mail)", async () => {
    const mail = fakeMail();
    const env = makeEnv({}, mail);
    const results = await Promise.all([
      handleLead(jsonRequest(validLead(), { ip: "192.0.2.1" }), env, deps()),
      handleLead(jsonRequest(validLead(), { ip: "192.0.2.2" }), env, deps()),
      handleLead(jsonRequest(validLead(), { ip: "192.0.2.3" }), env, deps()),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await leadCount()).toBe(1);
    expect(mail.sent).toHaveLength(1);
  });
});

describe("POST /api/lead: mail failure", () => {
  it("keeps the D1 row, answers 200 mail:false and logs the failure", async () => {
    const mail = fakeMail({ fail: true });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleLead(jsonRequest(validLead()), makeEnv({}, mail), deps());
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true, duplicate: false, mail: false });
    expect(await leadCount()).toBe(1);
    expect(err).toHaveBeenCalled();
    const logged = err.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("lead_mail_failed");
    expect(logged).not.toContain("ros.dev@example.org");
    err.mockRestore();
  });

  it("keeps the row and answers mail:false when the binding is missing", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const env = makeEnv();
    delete (env as Partial<typeof env>).LEAD_MAIL;
    const res = await handleLead(jsonRequest(validLead()), env, deps());
    expect(await body(res)).toMatchObject({ ok: true, mail: false });
    expect(await leadCount()).toBe(1);
    err.mockRestore();
  });
});

describe("POST /api/lead: injection safety", () => {
  it("round-trips UTF-8 free text through the mail body", async () => {
    const mail = fakeMail();
    await handleLead(jsonRequest(validLead({ org: "Żółć Robotyka", use_case: "Łódź → Kraków, 2 AMRs ✓\nline two" })), makeEnv({}, mail), deps());
    const m = decodeMail(mail.sent[0].raw);
    expect(m.subject).toBe("[wisevision lead] early-access — Żółć Robotyka");
    expect(m.body).toContain("Łódź → Kraków, 2 AMRs ✓\nline two");
  });

  it("stores SQL-injection-ish strings verbatim (parameterised queries)", async () => {
    const evil = {
      org: "Robert'); DROP TABLE leads;--",
      role: "\" OR 1=1 --",
      use_case: "'; DELETE FROM leads WHERE '1'='1'; SELECT * FROM leads; /* <script>alert(1)</script> */",
    };
    const res = await handleLead(jsonRequest(validLead(evil)), makeEnv(), deps());
    expect(res.status).toBe(200);
    const row = await db.prepare("SELECT org, role, use_case FROM leads").first();
    expect(row).toEqual(evil);
    expect(await leadCount()).toBe(1);
  });

  it("flattens CR/LF in single-line fields so the mail subject cannot be split", async () => {
    const mail = fakeMail();
    const res = await handleLead(jsonRequest(validLead({ org: "Evil\r\nBcc: victim@example.org" })), makeEnv({}, mail), deps());
    expect(res.status).toBe(200);
    const m = decodeMail(mail.sent[0].raw);
    expect(m.headerLines.some((l) => /^bcc:/i.test(l))).toBe(false);
    expect(m.subject).toBe("[wisevision lead] early-access — Evil Bcc: victim@example.org");
    const row = await db.prepare("SELECT org FROM leads").first<{ org: string }>();
    expect(row!.org).toBe("Evil Bcc: victim@example.org");
  });
});

describe("POST /api/lead: method, origin, config", () => {
  it("405 for GET with an Allow header", async () => {
    const res = await handleLead(new Request(`${ORIGIN}/api/lead`), makeEnv(), deps());
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("405 for OPTIONS (no CORS preflight is ever granted)", async () => {
    const res = await handleLead(new Request(`${ORIGIN}/api/lead`, { method: "OPTIONS", headers: { origin: "https://evil.example" } }), makeEnv(), deps());
    expect(res.status).toBe(405);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("403 for a cross-origin POST and no CORS header", async () => {
    const res = await handleLead(jsonRequest(validLead(), { origin: "https://evil.example" }), makeEnv(), deps());
    expect(res.status).toBe(403);
    expect((await body(res)).error).toBe("cross_origin");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(await leadCount()).toBe(0);
  });

  it("403 when Sec-Fetch-Site says cross-site even without Origin", async () => {
    const res = await handleLead(jsonRequest(validLead(), { origin: null, headers: { "sec-fetch-site": "cross-site" } }), makeEnv(), deps());
    expect(res.status).toBe(403);
  });

  it("500 (no details) when a secret is missing", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleLead(jsonRequest(validLead()), makeEnv({ TURNSTILE_SECRET: "" }), deps());
    expect(res.status).toBe(500);
    expect(await body(res)).toEqual({ ok: false, error: "server_misconfigured" });
    err.mockRestore();
  });

  it("responses are JSON and never cacheable", async () => {
    const res = await handleLead(jsonRequest(validLead()), makeEnv(), deps());
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

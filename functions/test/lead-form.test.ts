import { describe, expect, it } from "vitest";
import { buildLeadPayload, submitLead } from "../../src/lib/lead-form";

function fakeFetch(status: number, json: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof json === "string" ? json : JSON.stringify(json), {
      status, headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("src/lib/lead-form.ts", () => {
  it("buildLeadPayload normalises FormData (checkbox 'on' → true, trims, keeps token + honeypot)", () => {
    const fd = new FormData();
    fd.set("form", "contact");
    fd.set("email", "  me@example.org ");
    fd.set("org", " Acme ");
    fd.set("consent", "on");
    fd.set("website", "");
    fd.set("cf-turnstile-response", "tok");
    expect(buildLeadPayload(fd)).toEqual({
      form: "contact", email: "me@example.org", org: "Acme", consent: true, website: "",
      "cf-turnstile-response": "tok",
    });
  });

  it("buildLeadPayload accepts a plain object and sets consent false when absent", () => {
    expect(buildLeadPayload({ form: "demo", email: "a@b.co" })).toMatchObject({ consent: false, website: "" });
  });

  it("submitLead posts JSON same-origin and returns ok", async () => {
    const f = fakeFetch(200, { ok: true, duplicate: false, mail: true });
    const r = await submitLead({ form: "demo", email: "a@b.co", consent: true }, { fetch: f.fn });
    expect(r).toEqual({ ok: true, duplicate: false, mail: true });
    expect(f.calls[0].url).toBe("/api/lead");
    expect(f.calls[0].init.method).toBe("POST");
    expect(f.calls[0].init.credentials).toBe("same-origin");
    expect((f.calls[0].init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("submitLead maps a 400 to field errors and a user message", async () => {
    const f = fakeFetch(400, { ok: false, error: "validation_failed", fields: { email: "invalid" } });
    const r = await submitLead({ form: "demo", email: "x" }, { fetch: f.fn });
    expect(r).toMatchObject({ ok: false, status: 400, error: "validation_failed", fields: { email: "invalid" } });
    if (!r.ok) expect(r.message).toMatch(/check/i);
  });

  it.each([
    [403, "turnstile_failed", /verification/i],
    [429, "rate_limited", /too many/i],
    [503, "turnstile_unavailable", /try again/i],
    [500, "internal_error", /hello@wisevision\.tech/],
  ])("submitLead maps %i to a friendly message", async (status, error, re) => {
    const f = fakeFetch(status, { ok: false, error });
    const r = await submitLead({}, { fetch: f.fn });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(re);
  });

  it("submitLead survives a network error and a non-JSON reply", async () => {
    const boom = (async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
    const r1 = await submitLead({}, { fetch: boom });
    expect(r1).toMatchObject({ ok: false, status: 0, error: "network_error" });
    const f = fakeFetch(502, "<html>bad gateway</html>");
    const r2 = await submitLead({}, { fetch: f.fn, endpoint: "/x" });
    expect(r2).toMatchObject({ ok: false, status: 502, error: "bad_response" });
  });
});

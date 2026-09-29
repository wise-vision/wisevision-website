import { beforeEach, describe, expect, it, vi } from "vitest";
import * as leadRoute from "../api/lead";
import * as mw from "../api/_middleware";
import { ORIGIN, jsonRequest, leadCount, makeEnv, resetDb, validLead } from "./helpers";

beforeEach(resetDb);

function ctx(request: Request, env = makeEnv(), next?: () => Promise<Response>) {
  // Plain EventContext: createPagesEventContext() requires an ASSETS binding we do not need here.
  return {
    request,
    env,
    params: {},
    data: {},
    functionPath: "/api/lead",
    next: next ?? (async () => new Response(null, { status: 404 })),
    waitUntil: () => {},
    passThroughOnException: () => {},
  };
}

describe("functions/api/lead.ts route exports", () => {
  it("onRequestPost with the Cloudflare always-fail test secret → 403 (real siteverify is not reached: fetch is injectable)", async () => {
    // The route itself must use the global fetch; stub it so no network is used in unit tests.
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ success: false }));
    const res = await leadRoute.onRequestPost(ctx(jsonRequest(validLead())) as never);
    expect(res.status).toBe(403);
    expect(spy).toHaveBeenCalledWith("https://challenges.cloudflare.com/turnstile/v0/siteverify", expect.anything());
    spy.mockRestore();
  });

  it("onRequestPost → 200 and a row when siteverify passes", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ success: true }));
    const res = await leadRoute.onRequestPost(ctx(jsonRequest(validLead())) as never);
    expect(res.status).toBe(200);
    expect(await leadCount()).toBe(1);
    spy.mockRestore();
  });

  it("onRequest (any other method) → 405", async () => {
    const res = await leadRoute.onRequest(ctx(new Request(`${ORIGIN}/api/lead`, { method: "PUT" })) as never);
    expect(res.status).toBe(405);
  });
});

describe("functions/api/_middleware.ts", () => {
  it("adds security headers to downstream responses", async () => {
    const res = await mw.onRequest(ctx(new Request(`${ORIGIN}/api/lead`), makeEnv(), async () => Response.json({ ok: true })) as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("turns a thrown error into a JSON 500 without a stack trace", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await mw.onRequest(ctx(new Request(`${ORIGIN}/api/x`), makeEnv(), async () => {
      throw new Error("secret internals at /srv/app.ts:12");
    }) as never);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "internal_error" });
    expect(text).not.toContain("secret internals");
    expect(text).not.toContain(".ts:");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    err.mockRestore();
  });

  it("turns a non-JSON 404 under /api into a JSON 404", async () => {
    const res = await mw.onRequest(ctx(new Request(`${ORIGIN}/api/nope`), makeEnv(), async () =>
      new Response("<html>not found</html>", { status: 404, headers: { "content-type": "text/html" } })) as never);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not_found" });
  });

  it("passes JSON error bodies through untouched", async () => {
    const res = await mw.onRequest(ctx(new Request(`${ORIGIN}/api/lead`), makeEnv(), async () =>
      Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } })) as never);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
  });
});

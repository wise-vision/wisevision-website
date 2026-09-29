import { describe, expect, it, vi } from "vitest";
import mailer, { type MailerEnv } from "../../workers/lead-mailer/src/index";
import { decodeMail, fakeMail } from "./helpers";

const URL_ = "https://lead-mailer.internal/send";
const good = () => ({
  subject: "[wisevision lead] contact — Żółć Robotyka",
  text: "New contact lead\nuse case:\nŁódź → Kraków ✓",
  replyTo: "ros.dev@example.org",
});

function env(mail = fakeMail(), over: Partial<MailerEnv> = {}): MailerEnv {
  return {
    LEAD_MAIL: mail.binding as unknown as SendEmail,
    LEAD_TO: "adam.krawczyk0698@gmail.com",
    LEAD_FROM: "leads@wisevision.tech",
    ...over,
  };
}

function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Request(URL_, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

describe("wv-lead-mailer: happy path", () => {
  it("sends one MIME mail to the FIXED recipient with the given subject/text/Reply-To", async () => {
    const mail = fakeMail();
    const res = await mailer.fetch(post(good()), env(mail));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].isEmailMessage).toBe(true);
    expect(mail.sent[0].from).toBe("leads@wisevision.tech");
    expect(mail.sent[0].to).toBe("adam.krawczyk0698@gmail.com");
    const m = decodeMail(mail.sent[0].raw);
    expect(m.subject).toBe("[wisevision lead] contact — Żółć Robotyka");
    expect(m.headers["reply-to"]).toBe("<ros.dev@example.org>");
    expect(m.headers.from).toContain("<leads@wisevision.tech>");
    expect(m.headers.to).toBe("<adam.krawczyk0698@gmail.com>");
    expect(m.body).toContain("Łódź → Kraków ✓");
  });

  it("the recipient can never come from the input (extra `to` key → 400, nothing sent)", async () => {
    const mail = fakeMail();
    for (const extra of [{ to: "evil@example.org" }, { from: "x@example.org" }, { bcc: "evil@example.org" }]) {
      const res = await mailer.fetch(post({ ...good(), ...extra }), env(mail));
      expect(res.status).toBe(400);
    }
    expect(mail.sent).toHaveLength(0);
  });
});

describe("wv-lead-mailer: input validation (400, nothing sent)", () => {
  const cases: [string, unknown][] = [
    ["missing subject", { text: "t", replyTo: "a@example.org" }],
    ["missing text", { subject: "s", replyTo: "a@example.org" }],
    ["missing replyTo", { subject: "s", text: "t" }],
    ["empty subject", { ...good(), subject: "" }],
    ["subject with CRLF (header injection)", { ...good(), subject: "x\r\nBcc: evil@example.org" }],
    ["subject too long", { ...good(), subject: "s".repeat(301) }],
    ["text too long", { ...good(), text: "t".repeat(20_001) }],
    ["empty text", { ...good(), text: "" }],
    ["replyTo not an email", { ...good(), replyTo: "not-an-email" }],
    ["replyTo with CRLF", { ...good(), replyTo: "a@example.org\r\nBcc: evil@example.org" }],
    ["non-string field", { ...good(), text: 42 }],
    ["array body", [good()]],
    ["null body", null],
  ];
  for (const [name, payload] of cases) {
    it(name, async () => {
      const mail = fakeMail();
      const res = await mailer.fetch(post(payload), env(mail));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false });
      expect(mail.sent).toHaveLength(0);
    });
  }

  it("invalid JSON → 400", async () => {
    const res = await mailer.fetch(post("{nope"), env());
    expect(res.status).toBe(400);
  });

  it("non-JSON content-type → 400", async () => {
    const res = await mailer.fetch(post(good(), { "content-type": "text/plain" }), env());
    expect(res.status).toBe(400);
  });

  it("oversized body → 400", async () => {
    const res = await mailer.fetch(post({ ...good(), text: "t".repeat(70_000) }), env());
    expect(res.status).toBe(400);
  });

  it("GET → 405", async () => {
    const res = await mailer.fetch(new Request(URL_), env());
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});

describe("wv-lead-mailer: failures", () => {
  it("send throws → 502 send_failed, logged without PII", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await mailer.fetch(post(good()), env(fakeMail({ fail: true })));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send_failed" });
    const logged = err.mock.calls.map((c) => JSON.stringify(c)).join("\n");
    expect(logged).toContain("lead_mailer_send_failed");
    expect(logged).not.toContain("ros.dev@example.org");
    err.mockRestore();
  });

  it("missing binding/config → 500 misconfigured", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const e = env();
    delete (e as Partial<MailerEnv>).LEAD_MAIL;
    expect((await mailer.fetch(post(good()), e)).status).toBe(500);
    expect((await mailer.fetch(post(good()), env(fakeMail(), { LEAD_TO: "" }))).status).toBe(500);
    err.mockRestore();
  });
});

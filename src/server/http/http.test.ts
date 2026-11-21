import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setServicesForTests } from "../container";
import { badRequest } from "../errors";
import { get, post, testServices } from "../testing";
import { clientIp } from "./clientIp";
import { defineRoute, json, readJson } from "./handler";
import { RateLimiter } from "./rateLimit";

const h = (xff?: string) => new Headers(xff ? { "x-forwarded-for": xff } : {});

describe("clientIp", () => {
  it("reads the address our trusted proxy appended, from the right", () => {
    expect(clientIp(h("203.0.113.5"), 1)).toBe("203.0.113.5");
    expect(clientIp(h("spoofed-by-client, 203.0.113.5"), 1)).toBe("203.0.113.5");
  });

  it("cannot be spoofed by a client-supplied leftmost entry (the rate-limit bypass)", () => {
    // An attacker sets X-Forwarded-For to anything; the proxy appends the real address on the right.
    expect(clientIp(h("1.1.1.1, 2.2.2.2, 203.0.113.9"), 1)).toBe("203.0.113.9");
    expect(clientIp(h("9.9.9.9, 203.0.113.9"), 1)).not.toBe("9.9.9.9");
  });

  it("skips the right number of hops behind a load balancer", () => {
    expect(clientIp(h("203.0.113.5, 130.211.0.1"), 2)).toBe("203.0.113.5");
  });

  it("uses the leftmost entry when fewer hops are present than trusted", () => {
    expect(clientIp(h("203.0.113.5"), 3)).toBe("203.0.113.5");
  });

  it("returns unknown when there is nothing trustworthy to read", () => {
    expect(clientIp(h(), 1)).toBe("unknown");
    expect(clientIp(h("203.0.113.5"), 0)).toBe("unknown");
    expect(clientIp(h("not-an-ip"), 1)).toBe("unknown");
    expect(clientIp(h("<script>alert(1)</script>"), 1)).toBe("unknown");
  });

  it("strips ports and brackets and unwraps IPv4-mapped IPv6", () => {
    expect(clientIp(h("203.0.113.5:51234"), 1)).toBe("203.0.113.5");
    expect(clientIp(h("[::ffff:203.0.113.5]"), 1)).toBe("203.0.113.5");
  });

  it("groups IPv6 clients by /64 so rotating addresses inside a prefix does not evade a limit", () => {
    const a = clientIp(h("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), 1);
    const b = clientIp(h("2001:db8:1:2:1111:2222:3333:4444"), 1);
    expect(a).toBe(b);
    expect(a).toBe("2001:0db8:0001:0002::/64");
    expect(clientIp(h("2001:db8:1:3::1"), 1)).not.toBe(a);
  });
});

describe("RateLimiter", () => {
  it("blocks after the limit, reports Retry-After, and recovers after the window", () => {
    const rl = new RateLimiter({ limit: 2, windowMs: 10_000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(true);
    const blocked = rl.check("a", 2_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(8);
    expect(rl.check("b", 2_000).allowed).toBe(true);
    expect(rl.check("a", 10_001).allowed).toBe(true);
  });

  it("never reports less than one second to wait", () => {
    const rl = new RateLimiter({ limit: 1, windowMs: 1000 });
    rl.check("a", 0);
    rl.check("a", 0);
    expect(rl.check("a", 999).retryAfterSec).toBe(1);
  });
});

describe("readJson", () => {
  const body = (text: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
    new Request("http://x.test", { method: "POST", headers, body: text });

  it("parses a JSON body", async () => {
    expect(await readJson(body('{"a":1}'), 100)).toEqual({ a: 1 });
  });

  it("rejects a declared length over the cap", async () => {
    await expect(
      readJson(body("x".repeat(50), { "content-type": "application/json", "content-length": "500" }), 100),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("enforces the cap on the real stream even when Content-Length lies or is absent", async () => {
    const big = JSON.stringify({ pad: "a".repeat(5000) });
    await expect(readJson(body(big), 1000)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects other content types and bad JSON", async () => {
    await expect(readJson(body("{}", { "content-type": "text/plain" }), 100)).rejects.toMatchObject({ status: 415 });
    await expect(readJson(body("{nope"), 100)).rejects.toMatchObject({ status: 400, code: "invalid_json" });
  });

  it("rejects a missing body", async () => {
    await expect(
      readJson(new Request("http://x.test", { method: "POST", headers: { "content-type": "application/json" } }), 100),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("defineRoute", () => {
  let ctx: ReturnType<typeof testServices>;
  beforeEach(() => {
    ctx = testServices();
    setServicesForTests(ctx.services);
  });
  afterEach(() => setServicesForTests(undefined));

  const ok = defineRoute({ name: "t-ok" }, async () => json({ hello: "world" }));
  const known = defineRoute({ name: "t-known" }, async () => {
    throw badRequest("Nope.", "nope");
  });
  const boom = defineRoute({ name: "t-boom" }, async () => {
    throw new Error("secret internal detail: db password is hunter2");
  });
  const limited = defineRoute({ name: "t-limited", rateLimit: { limit: 2, windowMs: 60_000 } }, async () => json({}));
  const guarded = defineRoute({ name: "t-guarded", sameOriginOnly: true }, async () => json({}));
  const withParams = defineRoute({ name: "t-params" }, async ({ params }) => json({ id: params.id }));

  it("adds a request id, timing and no-store caching", async () => {
    const res = await ok(get("/x"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(/^[\w-]{8,}$/);
    expect(res.headers.get("server-timing")).toMatch(/^app;dur=\d+$/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("keeps a caller's well-formed request id and replaces a malformed one", async () => {
    expect((await ok(get("/x", { "x-request-id": "trace-abc-12345" }))).headers.get("x-request-id")).toBe("trace-abc-12345");
    expect((await ok(get("/x", { "x-request-id": "bad id with spaces!" }))).headers.get("x-request-id")).not.toContain(" ");
  });

  it("returns known errors in a uniform envelope with the request id", async () => {
    const res = await known(get("/x"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatchObject({ code: "nope", message: "Nope." });
    expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
  });

  it("hides internal error details from the client but logs them in full", async () => {
    const res = await boom(get("/x"));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).error.code).toBe("internal_error");
    const logged = ctx.logs().find((l) => l.message && String(l.message).includes("unhandled error"));
    expect(String(logged?.message)).toContain("hunter2");
    expect(logged?.severity).toBe("ERROR");
  });

  it("rate limits per client with Retry-After", async () => {
    expect((await limited(get("/x"))).status).toBe(200);
    expect((await limited(get("/x"))).status).toBe(200);
    const res = await limited(get("/x"));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect((await res.json()).error.code).toBe("rate_limited");
  });

  it("does not let a spoofed X-Forwarded-For prefix escape the limit", async () => {
    const mk = (prefix: string) => get("/x", { "x-forwarded-for": `${prefix}, 203.0.113.50` });
    await limited(mk("1.1.1.1"));
    await limited(mk("2.2.2.2"));
    expect((await limited(mk("3.3.3.3"))).status).toBe(429);
  });

  it("buckets different clients separately", async () => {
    const as = (ip: string) => get("/x", { "x-forwarded-for": ip });
    for (let i = 0; i < 3; i++) await limited(as("198.51.100.1"));
    expect((await limited(as("198.51.100.2"))).status).toBe(200);
  });

  it("refuses requests a browser marks cross-site, but allows same-origin and non-browser clients", async () => {
    expect((await guarded(get("/x", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await guarded(get("/x", { "sec-fetch-site": "same-origin" }))).status).toBe(200);
    expect((await guarded(get("/x"))).status).toBe(200);
  });

  it("passes route params (Next supplies them as a promise)", async () => {
    const res = await withParams(get("/x/abc"), { params: Promise.resolve({ id: "abc" }) });
    expect(await res.json()).toEqual({ id: "abc" });
  });

  it("writes one access-log line per request, at the right severity, without the body", async () => {
    await ok(post("/x", { secret: "do not log me" }));
    await known(get("/x"));
    await boom(get("/x"));
    const access = ctx.logs().filter((l) => l.message === "request");
    expect(access.map((l) => [l.status, l.severity])).toEqual([
      [200, "INFO"],
      [400, "WARNING"],
      [500, "ERROR"],
    ]);
    expect(JSON.stringify(ctx.logs())).not.toContain("do not log me");
  });
});

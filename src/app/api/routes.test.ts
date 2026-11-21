/** End-to-end tests of every API route: real handler, real services, fake upstreams. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDiurnalCurve } from "@/lib/airQualityPresets";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { SAMPLE_ROOMS } from "@/lib/roomScan";
import { setServicesForTests } from "@/server/container";
import type { Storage } from "@/server/ports";
import { get, hourlyFixture, interventionsFixture, post, profileFixture, testServices } from "@/server/testing";
import { GET as airQuality } from "./air-quality/route";
import { POST as analyzeRoom } from "./analyze-room/route";
import { POST as events } from "./events/route";
import { POST as explain } from "./explain/route";
import { GET as healthz } from "./healthz/route";
import { GET as readyz } from "./readyz/route";
import { POST as createReceipt } from "./receipts/route";
import { GET as getReceipt } from "./receipts/[id]/route";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");
const liveScenario = (lat: number, lng: number) => ({
  id: "live",
  name: "Your location",
  area: "Live forecast",
  lat,
  lng,
  hourly: buildDiurnalCurve(250),
  source: "live" as const,
});

let ctx: ReturnType<typeof testServices>;
const install = (overrides: Parameters<typeof testServices>[0] = {}, env: Record<string, string> = {}) => {
  ctx = testServices(overrides, env);
  setServicesForTests(ctx.services);
  return ctx;
};
beforeEach(() => install());
afterEach(() => setServicesForTests(undefined));

const withId = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/air-quality", () => {
  it("rejects invalid coordinates with a uniform error", async () => {
    const res = await airQuality(get("/api/air-quality?lat=999&lng=1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: "invalid_coordinates" });
  });

  it("serves demo data when no API key is configured", async () => {
    const body = await (await airQuality(get("/api/air-quality?lat=28.61&lng=77.2"))).json();
    expect(body).toMatchObject({ mode: "demo", reason: "no_api_key" });
    expect(body.scenario.hourly).toHaveLength(24);
  });

  it("serves live data and caches it for nearby repeats", async () => {
    const fetchScenario = vi.fn(async (lat: number, lng: number) => liveScenario(lat, lng));
    install({ airProvider: { fetchScenario } });
    const first = await airQuality(get("/api/air-quality?lat=28.614&lng=77.209"));
    expect(first.headers.get("cache-control")).toBe("private, max-age=300");
    expect(await first.json()).toMatchObject({ mode: "live" });
    await airQuality(get("/api/air-quality?lat=28.615&lng=77.210"));
    expect(fetchScenario).toHaveBeenCalledTimes(1);
  });

  it("falls back without leaking upstream details when the upstream fails", async () => {
    install({ airProvider: { fetchScenario: vi.fn().mockRejectedValue(new Error("403 key=secret-key")) } });
    const res = await airQuality(get("/api/air-quality?lat=28.61&lng=77.2"));
    const text = await res.text();
    expect(text).not.toContain("secret-key");
    expect(JSON.parse(text)).toMatchObject({ mode: "demo", reason: "upstream_unavailable" });
  });

  it("refuses cross-site browser requests and rate-limits repeat callers", async () => {
    expect((await airQuality(get("/api/air-quality?lat=1&lng=1", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    const codes: number[] = [];
    for (let i = 0; i < 32; i++)
      codes.push((await airQuality(get("/api/air-quality?lat=1&lng=1", { "x-forwarded-for": "9.9.9.9" }))).status);
    expect(codes[0]).toBe(200);
    expect(codes.at(-1)).toBe(429);
  });
});

describe("POST /api/analyze-room", () => {
  it("rejects non-images, wrong types, bad JSON and the wrong content type", async () => {
    expect((await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: "AAAA" }))).status).toBe(400);
    expect((await analyzeRoom(post("/api/analyze-room", { mimeType: "image/gif", data: PNG }))).status).toBe(400);
    expect((await analyzeRoom(post("/api/analyze-room", "{nope"))).status).toBe(400);
    expect((await analyzeRoom(post("/api/analyze-room", "x", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await analyzeRoom(post("/api/analyze-room", "null"))).status).toBe(400);
  });

  it("bounds the body even without a content-length header", async () => {
    const huge = JSON.stringify({ mimeType: "image/png", data: "A".repeat(8 * 1024 * 1024) });
    expect((await analyzeRoom(post("/api/analyze-room", huge))).status).toBe(413);
  });

  it("tells the client to use manual input when no model is configured", async () => {
    const res = await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }));
    expect(await res.json()).toEqual({ fallback: true, reason: "ai_unavailable" });
  });

  it("returns the scan when the model succeeds, and not_a_room for non-rooms", async () => {
    const scan = SAMPLE_ROOMS[0].scan;
    install({ visionProvider: { scan: vi.fn().mockResolvedValue(scan) } });
    expect(await (await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }))).json()).toEqual({ scan });
    install({ visionProvider: { scan: vi.fn().mockResolvedValue(null) } });
    expect(await (await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }))).json()).toEqual({
      fallback: true,
      reason: "not_a_room",
    });
  });

  it("stops calling the model after the daily budget and says so", async () => {
    const scan = vi.fn().mockResolvedValue(SAMPLE_ROOMS[0].scan);
    install({ visionProvider: { scan } }, { BUDGET_GEMINI_VISION_DAILY: "1" });
    await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }));
    const second = await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }));
    expect(await second.json()).toEqual({ fallback: true, reason: "budget_exhausted" });
    expect(scan).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/explain", () => {
  const valid = { hourly: hourlyFixture, profile: profileFixture, interventions: interventionsFixture };

  it("rejects malformed input", async () => {
    expect((await explain(post("/api/explain", { hourly: [1] }))).status).toBe(400);
    expect((await explain(post("/api/explain", "x"))).status).toBe(400);
  });

  it("returns a template explanation built from server-computed numbers when Gemini is off", async () => {
    const body = await (await explain(post("/api/explain", valid))).json();
    expect(body.source).toBe("template");
    expect(body.text).toContain("648 g");
  });

  it("returns the model's text only when it passes the number guard", async () => {
    const hourly = hourlyFixture.map((pm25, hour) => ({ hour, pm25 }));
    const r = calculateHouseholdImpact(hourly, profileFixture, interventionsFixture);
    install({
      explainProvider: { explain: vi.fn().mockResolvedValue(`You avoid ${r.avoidedCigarettesHouseholdDay} cigarette-equivalents.`) },
    });
    expect((await (await explain(post("/api/explain", valid))).json()).source).toBe("gemini");
    install({ explainProvider: { explain: vi.fn().mockResolvedValue("Your risk drops by 8123%.") } });
    expect((await (await explain(post("/api/explain", valid))).json()).source).toBe("template");
  });
});

describe("receipts", () => {
  const valid = { scenarioName: "Anand Vihar", hourly: hourlyFixture, profile: profileFixture, interventions: interventionsFixture };

  it("creates a share link, then serves the stored receipt with the server's numbers", async () => {
    const created = await createReceipt(post("/api/receipts", valid));
    expect(created.status).toBe(201);
    const { id, url, expiresAt } = await created.json();
    expect(id).toMatch(/^[0-9A-Za-z]{10}$/);
    expect(url).toBe(`http://app.test/r/${id}`);
    expect(expiresAt).toBeGreaterThan(Date.now());

    const res = await getReceipt(get(`/api/receipts/${id}`), withId(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    const stored = await res.json();
    expect(stored.receipt.savedCo2GramsDay).toBe(648);
    expect(stored.scenarioName).toBe("Anand Vihar");
    expect(stored.engineVersion).toBe("1.0");
  });

  it("builds links from PUBLIC_ORIGIN when configured", async () => {
    install({}, { PUBLIC_ORIGIN: "https://vayushift.example.com" });
    const { url } = await (await createReceipt(post("/api/receipts", valid))).json();
    expect(url).toMatch(/^https:\/\/vayushift\.example\.com\/r\/[0-9A-Za-z]{10}$/);
  });

  it("ignores any receipt numbers the client tries to supply", async () => {
    const { id } = await (await createReceipt(post("/api/receipts", { ...valid, receipt: { savedCo2GramsDay: 999999 } }))).json();
    expect((await (await getReceipt(get(`/api/receipts/${id}`), withId(id))).json()).receipt.savedCo2GramsDay).toBe(648);
  });

  it("rejects invalid inputs, coordinate-like names and oversize bodies", async () => {
    expect((await createReceipt(post("/api/receipts", { ...valid, hourly: [1, 2] }))).status).toBe(400);
    expect((await createReceipt(post("/api/receipts", { ...valid, scenarioName: "28.6139, 77.2090" }))).status).toBe(400);
    expect((await createReceipt(post("/api/receipts", { ...valid, scenarioName: 7 }))).status).toBe(400);
    expect((await createReceipt(post("/api/receipts", JSON.stringify({ ...valid, pad: "x".repeat(40_000) })))).status).toBe(413);
  });

  it("returns 404 for unknown and malformed ids without touching storage for the latter", async () => {
    expect((await getReceipt(get("/api/receipts/AAAAAAAAAA"), withId("AAAAAAAAAA"))).status).toBe(404);
    const spy = vi.spyOn(ctx.services.storage.receipts, "get");
    expect((await getReceipt(get("/api/receipts/..%2F..%2Fx"), withId("../../x"))).status).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("POST /api/events", () => {
  const send = (body: unknown, headers: Record<string, string> = {}) => events(post("/api/events", body, headers));

  it("counts a valid event and answers 204 with no body", async () => {
    const res = await send({ event: "scenario_loaded", props: { preset_id: "gurugram" } });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(await ctx.services.analytics.totals()).toEqual({ "scenario_loaded:preset=gurugram": 1 });
  });

  it("honours Global Privacy Control and Do Not Track: acknowledged, never counted", async () => {
    expect((await send({ event: "scenario_loaded", props: { preset_id: "gurugram" } }, { "sec-gpc": "1" })).status).toBe(204);
    expect((await send({ event: "scenario_loaded", props: { preset_id: "gurugram" } }, { dnt: "1" })).status).toBe(204);
    expect(await ctx.services.analytics.totals()).toEqual({});
  });

  it("rejects unknown events, bad values and non-JSON", async () => {
    expect((await send({ event: "page_view" })).status).toBe(400);
    expect((await send({ event: "scenario_loaded", props: { preset_id: "my house" } })).status).toBe(400);
    expect((await events(post("/api/events", "x", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await events(post("/api/events", JSON.stringify({ event: "x", pad: "y".repeat(5000) })))).status).toBe(413);
  });

  it("refuses cross-site posts", async () => {
    expect((await send({ event: "scenario_loaded", props: { preset_id: "gurugram" } }, { "sec-fetch-site": "cross-site" })).status).toBe(
      403,
    );
  });
});

describe("health", () => {
  it("healthz reports liveness without touching any dependency", async () => {
    const ping = vi.spyOn(ctx.services.storage, "ping");
    const body = await (await healthz(get("/api/healthz"))).json();
    expect(body).toMatchObject({ status: "ok", service: "vayushift", revision: "local" });
    expect(ping).not.toHaveBeenCalled();
  });

  it("readyz is ok on the memory backend and lists which upstreams are configured, without values", async () => {
    install({ airProvider: { fetchScenario: vi.fn() } });
    const res = await readyz(get("/api/readyz"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", storage: "memory", upstreams: { airQuality: true, gemini: false } });
  });

  it("readyz returns 503 when Firestore cannot be reached, and logs it", async () => {
    const down: Storage = { ...ctx.services.storage, kind: "firestore", ping: vi.fn().mockRejectedValue(new Error("UNAVAILABLE")) };
    install({ storage: down });
    const res = await readyz(get("/api/readyz"));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded", checks: { storage: "fail" } });
    expect(ctx.logs().some((l) => l.message && String(l.message).includes("readiness check failed"))).toBe(true);
  });
});

describe("cross-cutting", () => {
  it("every response carries a request id that matches the error envelope", async () => {
    const res = await airQuality(get("/api/air-quality?lat=999&lng=1", { "x-request-id": "client-req-12345" }));
    expect(res.headers.get("x-request-id")).toBe("client-req-12345");
    expect((await res.json()).error.requestId).toBe("client-req-12345");
  });

  const validReceipt = { scenarioName: "Anand Vihar", hourly: hourlyFixture, profile: profileFixture, interventions: interventionsFixture };

  it("a storage outage on share links is a clear 503, with the real cause only in the logs", async () => {
    const broken: Storage = {
      ...ctx.services.storage,
      receipts: {
        create: vi.fn().mockRejectedValue(new Error("db password is hunter2")),
        get: vi.fn().mockRejectedValue(new Error("db password is hunter2")),
      },
    };
    install({ storage: broken });
    const created = await createReceipt(post("/api/receipts", validReceipt));
    const text = await created.text();
    expect(created.status).toBe(503);
    expect(JSON.parse(text).error.code).toBe("unavailable");
    expect(text).not.toContain("hunter2");
    expect((await getReceipt(get("/api/receipts/AAAAAAAAAA"), withId("AAAAAAAAAA"))).status).toBe(503);
    const logged = JSON.stringify(ctx.logs());
    expect(logged).toContain("hunter2");
    expect(logged).toContain("Caused by");
  });

  it("analytics is best-effort: a storage failure still answers 204 and is logged as a warning", async () => {
    const broken: Storage = {
      ...ctx.services.storage,
      analytics: { increment: vi.fn().mockRejectedValue(new Error("firestore down")), totals: vi.fn() },
    };
    install({ storage: broken });
    const res = await events(post("/api/events", { event: "scenario_loaded", props: { preset_id: "gurugram" } }));
    expect(res.status).toBe(204);
    expect(ctx.logs().some((l) => l.severity === "WARNING" && String(l.message).includes("analytics write failed"))).toBe(true);
  });

  it("air quality keeps working when the shared cache is down", async () => {
    const downCache: Storage = {
      ...ctx.services.storage,
      cache: { get: vi.fn().mockRejectedValue(new Error("firestore down")), set: vi.fn().mockRejectedValue(new Error("firestore down")) },
    };
    install({ storage: downCache, airProvider: { fetchScenario: vi.fn(async (lat: number, lng: number) => liveScenario(lat, lng)) } });
    const res = await airQuality(get("/api/air-quality?lat=28.61&lng=77.2"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ mode: "live" });
  });
});

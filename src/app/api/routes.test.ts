import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as airQuality } from "./air-quality/route";
import { POST as analyzeRoom } from "./analyze-room/route";
import { POST as explain } from "./explain/route";
import { PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { NO_INTERVENTIONS } from "@/lib/impactEngine";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");
let ip = 0;
const post = (url: string, body: unknown, raw = false) =>
  new Request(`http://t${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
    body: raw ? (body as string) : JSON.stringify(body),
  });
const get = (qs: string) => new Request(`http://t/api/air-quality?${qs}`, { headers: { "x-forwarded-for": `10.1.0.${++ip}` } });

const profile = {
  memberCount: 3, commuterCount: 1, walkerCount: 1, hasVulnerableMembers: true, roomAreaSqFt: 180, ceilingHeightFt: 10,
  windowType: "sliding_aluminum_unsealed", sleepNoiseSensitivity: "medium", commuteKmRoundTrip: 20,
  baselineCommuteMode: "private_petrol_car", baselineCookingFuel: "lpg_unvented",
};

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/air-quality", () => {
  it("rejects invalid coordinates", async () => {
    expect((await airQuality(get("lat=999&lng=1"))).status).toBe(400);
  });
  it("falls back to demo data without an API key", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const body = await (await airQuality(get("lat=28.61&lng=77.2"))).json();
    expect(body.mode).toBe("demo");
    expect(body.scenario.hourly).toHaveLength(24);
  });
  it("falls back, without leaking details, when the upstream call fails", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom key=secret-key")));
    const res = await airQuality(get("lat=28.61&lng=77.2"));
    const text = await res.text();
    expect(text).not.toContain("secret-key");
    expect(JSON.parse(text).mode).toBe("demo");
    vi.unstubAllGlobals();
  });
  it("sends the key as a header, never in the URL", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "secret-key");
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", f);
    await airQuality(get("lat=28.61&lng=77.2"));
    expect(String(f.mock.calls[0][0])).not.toContain("secret-key");
    expect(f.mock.calls[0][1].headers["X-Goog-Api-Key"]).toBe("secret-key");
    vi.unstubAllGlobals();
  });
  it("rate-limits a single client", async () => {
    const req = () => new Request("http://t/api/air-quality?lat=1&lng=1", { headers: { "x-forwarded-for": "9.9.9.9" } });
    const codes: number[] = [];
    for (let n = 0; n < 32; n++) codes.push((await airQuality(req())).status);
    expect(codes.at(-1)).toBe(429);
    expect(codes[0]).toBe(200);
  });
});

describe("POST /api/analyze-room", () => {
  it("rejects non-images, bad JSON and disallowed types", async () => {
    expect((await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: "AAAA" }))).status).toBe(400);
    expect((await analyzeRoom(post("/api/analyze-room", "{nope", true))).status).toBe(400);
    expect((await analyzeRoom(post("/api/analyze-room", { mimeType: "image/gif", data: PNG }))).status).toBe(400);
  });
  it("bounds the body even without a content-length header", async () => {
    const huge = JSON.stringify({ mimeType: "image/png", data: "A".repeat(8 * 1024 * 1024) });
    expect((await analyzeRoom(post("/api/analyze-room", huge, true))).status).toBe(413);
  });
  it("tells the client to use manual input when Gemini is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const body = await (await analyzeRoom(post("/api/analyze-room", { mimeType: "image/png", data: PNG }))).json();
    expect(body).toEqual({ fallback: true, reason: "ai_unavailable" });
  });
});

describe("POST /api/explain", () => {
  const hourly = PRESET_SCENARIOS[0].hourly.map((h) => h.pm25);
  it("rejects malformed input", async () => {
    expect((await explain(post("/api/explain", { hourly: [1] }))).status).toBe(400);
    expect((await explain(post("/api/explain", "x", true))).status).toBe(400);
  });
  it("returns a template explanation built from server-computed numbers when Gemini is off", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const body = await (
      await explain(post("/api/explain", { hourly, profile, interventions: { ...NO_INTERVENTIONS, switchCommuteToMetroN95: true } }))
    ).json();
    expect(body.source).toBe("template");
    expect(body.text).toContain("648 g");
  });
});

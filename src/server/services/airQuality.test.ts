import { describe, expect, it, vi } from "vitest";
import { buildDiurnalCurve } from "@/lib/airQualityPresets";
import type { AirScenario } from "@/lib/types";
import { createMemoryStorage } from "../adapters/memory";
import { createLogger } from "../logger";
import type { Cache } from "../ports";
import { FakeClock } from "../testing";
import { AirQualityService, type AirQualityProvider } from "./airQuality";

const FRESH = 30 * 60_000;
const STALE = 180 * 60_000;
const silent = createLogger({ level: "silent", service: { name: "t", revision: "t" } });
const live = (lat: number, lng: number, peak = 250): AirScenario => ({
  id: "live",
  name: "Your location",
  area: "Live forecast",
  lat,
  lng,
  hourly: buildDiurnalCurve(peak),
  source: "live",
});

function setup(opts: { caps?: number; provider?: AirQualityProvider | null; cache?: (base: Cache) => Cache } = {}) {
  const clock = new FakeClock();
  const storage = createMemoryStorage({ airQuality: opts.caps ?? 1000, geminiVision: 0, geminiExplain: 0 }, clock.now);
  const fetchScenario = vi.fn(async (lat: number, lng: number) => live(lat, lng));
  const provider: AirQualityProvider | undefined = opts.provider === null ? undefined : (opts.provider ?? { fetchScenario });
  const service = new AirQualityService({
    provider,
    cache: opts.cache ? opts.cache(storage.cache) : storage.cache,
    budget: storage.budget,
    log: silent,
    freshMs: FRESH,
    staleMs: STALE,
    now: clock.now,
  });
  return { service, fetchScenario, clock, storage };
}

describe("AirQualityService", () => {
  it("falls back to the demo curve when no API key is configured", async () => {
    const { service } = setup({ provider: null });
    const r = await service.get(28.614, 77.209);
    expect(r).toMatchObject({ mode: "demo", reason: "no_api_key", source: "demo" });
    expect(r.scenario.hourly).toHaveLength(24);
  });

  it("calls the upstream on a miss, then serves repeats from cache without another call", async () => {
    const { service, fetchScenario } = setup();
    expect((await service.get(28.614, 77.209)).source).toBe("upstream");
    const again = await service.get(28.614, 77.209);
    expect(again).toMatchObject({ mode: "live", source: "cache" });
    expect(fetchScenario).toHaveBeenCalledTimes(1);
  });

  it("shares one answer between nearby users, but not between distant ones", async () => {
    const { service, fetchScenario } = setup();
    await service.get(28.6141, 77.2091);
    await service.get(28.6159, 77.2108); // same 0.005 degree cell
    expect(fetchScenario).toHaveBeenCalledTimes(1);
    await service.get(28.7, 77.3); // a different cell
    expect(fetchScenario).toHaveBeenCalledTimes(2);
  });

  it("queries the cell CENTRE, so a cached answer never carries any user's exact location", async () => {
    const { service, fetchScenario } = setup();
    const r = await service.get(28.61411, 77.20912);
    const [lat, lng] = fetchScenario.mock.calls[0];
    expect(lat).toBeCloseTo(28.615, 6);
    expect(lng).toBeCloseTo(77.21, 6);
    expect(r.scenario.lat).toBeCloseTo(28.615, 6);
    expect(JSON.stringify(r)).not.toContain("28.61411");
  });

  it("refreshes once the fresh window has passed", async () => {
    const { service, fetchScenario, clock } = setup();
    await service.get(28.6, 77.2);
    clock.tick(FRESH - 1000);
    expect((await service.get(28.6, 77.2)).source).toBe("cache");
    clock.tick(2000);
    expect((await service.get(28.6, 77.2)).source).toBe("upstream");
    expect(fetchScenario).toHaveBeenCalledTimes(2);
  });

  it("makes ONE upstream call for concurrent misses on the same cell", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const fetchScenario = vi.fn(async (lat: number, lng: number) => {
      await gate;
      return live(lat, lng);
    });
    const { service } = setup({ provider: { fetchScenario } });
    const calls = Array.from({ length: 6 }, () => service.get(28.6, 77.2));
    await Promise.resolve();
    release();
    const results = await Promise.all(calls);
    expect(fetchScenario).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.source === "upstream")).toHaveLength(1);
    expect(results.filter((r) => r.source === "coalesced")).toHaveLength(5);
    expect(new Set(results.map((r) => JSON.stringify(r.scenario))).size).toBe(1);
  });

  it("serves a recent cached forecast when the upstream fails (stale-if-error)", async () => {
    const { service, fetchScenario, clock } = setup();
    await service.get(28.6, 77.2);
    fetchScenario.mockRejectedValue(new Error("Air Quality API responded 503"));
    clock.tick(FRESH + 60_000);
    const r = await service.get(28.6, 77.2);
    expect(r).toMatchObject({ mode: "live", reason: "upstream_unavailable", source: "stale" });
  });

  it("falls back to the demo curve when the upstream fails and nothing usable is cached", async () => {
    const { service, fetchScenario, clock } = setup();
    fetchScenario.mockRejectedValue(new Error("boom"));
    expect(await service.get(28.6, 77.2)).toMatchObject({ mode: "demo", reason: "upstream_unavailable" });
    // A stale entry older than the stale window is gone, so it cannot be served either.
    fetchScenario.mockResolvedValueOnce(live(28.6, 77.2));
    await service.get(28.7, 77.3);
    fetchScenario.mockRejectedValue(new Error("boom"));
    clock.tick(STALE + 1000);
    expect(await service.get(28.7, 77.3)).toMatchObject({ mode: "demo" });
  });

  it("stops calling the upstream once the daily budget is spent, serving stale data or the demo", async () => {
    const { service, fetchScenario, clock } = setup({ caps: 2 });
    await service.get(28.6, 77.2); // 1
    await service.get(28.7, 77.3); // 2
    clock.tick(FRESH + 1000);
    const stale = await service.get(28.6, 77.2); // would be a refresh, but the budget is spent
    expect(stale).toMatchObject({ mode: "live", reason: "budget_exhausted", source: "stale" });
    const fresh = await service.get(29.0, 77.0); // never cached
    expect(fresh).toMatchObject({ mode: "demo", reason: "budget_exhausted" });
    expect(fetchScenario).toHaveBeenCalledTimes(2);
  });

  it("spends budget only on real upstream calls, never on cache hits", async () => {
    const { service, storage } = setup({ caps: 3 });
    for (let i = 0; i < 10; i++) await service.get(28.6, 77.2);
    expect(await storage.budget.tryConsume("airQuality")).toBe(true);
    expect(await storage.budget.tryConsume("airQuality")).toBe(true);
    expect(await storage.budget.tryConsume("airQuality")).toBe(false); // 1 spent by the miss + 2 here = 3
  });

  it("still answers when the cache cannot be written", async () => {
    const { service } = setup({
      cache: (base) => ({ get: (k) => base.get(k), set: async () => Promise.reject(new Error("cache down")) }),
    });
    expect(await service.get(28.6, 77.2)).toMatchObject({ mode: "live", source: "upstream" });
  });

  it("does not hold a failed request in the in-flight map, so the next one retries", async () => {
    const { service, fetchScenario } = setup();
    fetchScenario.mockRejectedValueOnce(new Error("blip"));
    expect((await service.get(28.6, 77.2)).mode).toBe("demo");
    expect((await service.get(28.6, 77.2)).mode).toBe("live");
  });
});

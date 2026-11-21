import { demoFallbackFor } from "@/lib/airQualityPresets";
import type { AirScenario } from "@/lib/types";
import type { Logger } from "../logger";
import type { Cache, UsageBudget } from "../ports";

export interface AirQualityProvider {
  fetchScenario(lat: number, lng: number): Promise<AirScenario>;
}

export type AirFallbackReason = "no_api_key" | "budget_exhausted" | "upstream_unavailable";

export interface AirQualityResult {
  scenario: AirScenario;
  mode: "live" | "demo";
  reason?: AirFallbackReason;
  /** How the answer was produced, for logs and tests. */
  source: "cache" | "upstream" | "coalesced" | "stale" | "demo";
}

export interface AirQualityDeps {
  provider: AirQualityProvider | undefined;
  cache: Cache;
  budget: UsageBudget;
  log: Logger;
  freshMs: number;
  staleMs: number;
  now?: () => number;
}

/** One cache refill: the cache key, the cell centre to ask upstream about, the visitor's own point, and any stale answer. */
interface RefreshRequest {
  key: string;
  cell: { lat: number; lng: number };
  point: { lat: number; lng: number };
  stale: AirScenario | undefined;
}

/** Google's grid is about 500 m, so locations are snapped to 0.005 degrees (about 550 m) before caching. */
const CELL_DEGREES = 0.005;
const cellOf = (v: number) => Math.round(v / CELL_DEGREES) * CELL_DEGREES;

/**
 * Hourly air-quality forecasts with four protections around the upstream API:
 *  - a shared cache keyed by grid cell, so nearby users reuse one answer (and never see each other's exact point);
 *  - request coalescing: concurrent misses for one cell make a single upstream call;
 *  - a daily budget, so a traffic spike cannot run up the quota or the bill;
 *  - stale-if-error: if the upstream fails or the budget is spent, a recent cached forecast is served
 *    before falling back to the demo curve.
 * Deliberately not stale-while-revalidate: Cloud Run throttles CPU once a response is sent, so a background
 * refresh cannot be relied on.
 */
export class AirQualityService {
  private inflight = new Map<string, Promise<AirQualityResult>>();
  private readonly now: () => number;
  constructor(private readonly deps: AirQualityDeps) {
    this.now = deps.now ?? Date.now;
  }

  async get(lat: number, lng: number): Promise<AirQualityResult> {
    const { provider, cache, freshMs } = this.deps;
    if (!provider) return this.demo(lat, lng, "no_api_key");

    const cellLat = cellOf(lat);
    const cellLng = cellOf(lng);
    const key = `aq:v1:${cellLat.toFixed(3)}:${cellLng.toFixed(3)}`;

    // A cache outage must cost us the cache, not the request.
    const cached = await cache.get<AirScenario>(key).catch((err) => {
      this.deps.log.warn("air quality cache read failed", { err });
      return undefined;
    });
    if (cached && this.now() - cached.storedAt < freshMs) {
      return { scenario: cached.value, mode: "live", source: "cache" };
    }

    const pending = this.inflight.get(key);
    if (pending) {
      const shared = await pending;
      return { ...shared, source: shared.source === "upstream" ? "coalesced" : shared.source };
    }

    const run = this.refresh(provider, { key, cell: { lat: cellLat, lng: cellLng }, point: { lat, lng }, stale: cached?.value }).finally(
      () => this.inflight.delete(key),
    );
    this.inflight.set(key, run);
    return run;
  }

  private async refresh(provider: AirQualityProvider, req: RefreshRequest): Promise<AirQualityResult> {
    const { key, cell, point, stale } = req;
    const { lat, lng } = point;
    const { cache, budget, log, staleMs } = this.deps;
    const serveStaleOr = (reason: AirFallbackReason): AirQualityResult =>
      stale ? { scenario: stale, mode: "live", reason, source: "stale" } : this.demo(lat, lng, reason);

    if (!(await budget.tryConsume("airQuality"))) {
      log.warn("air quality budget exhausted", { resource: "airQuality" });
      return serveStaleOr("budget_exhausted");
    }
    try {
      // Query the cell centre: the cached answer is shared, so it must not carry any one user's exact point.
      const scenario = await provider.fetchScenario(cell.lat, cell.lng);
      await cache.set(key, scenario, staleMs).catch((err) => log.warn("air quality cache write failed", { err }));
      return { scenario, mode: "live", source: "upstream" };
    } catch (err) {
      log.warn("air quality upstream failed", { err, servedStale: Boolean(stale) });
      return serveStaleOr("upstream_unavailable");
    }
  }

  private demo(lat: number, lng: number, reason: AirFallbackReason): AirQualityResult {
    return { scenario: demoFallbackFor(lat, lng), mode: "demo", reason, source: "demo" };
  }
}

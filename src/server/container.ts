import { createFirestoreStorage } from "./adapters/firestore";
import { GeminiProvider } from "./adapters/gemini";
import { GoogleAirQualityProvider } from "./adapters/google/airQuality";
import { createMemoryStorage } from "./adapters/memory";
import { loadConfig, type AppConfig } from "./config";
import { LimiterRegistry } from "./http/rateLimit";
import { createLogger, type Logger } from "./logger";
import type { Storage } from "./ports";
import { AirQualityService, type AirQualityProvider } from "./services/airQuality";
import { AnalyticsService } from "./services/analytics";
import { ExplainService, type ExplanationProvider } from "./services/explain";
import { ReceiptService } from "./services/receipts";
import { RoomVisionService, type RoomVisionProvider } from "./services/roomVision";
import { systemClock, type Clock } from "./time";

export interface Services {
  config: AppConfig;
  logger: Logger;
  limiters: LimiterRegistry;
  storage: Storage;
  air: AirQualityService;
  room: RoomVisionService;
  explain: ExplainService;
  receipts: ReceiptService;
  analytics: AnalyticsService;
  /** Which optional upstreams are configured (booleans only; never the keys). */
  upstreams: { airQuality: boolean; gemini: boolean };
}

/** Test seams. `null` means "no provider"; `undefined` means "build the real one from config". */
export interface Overrides {
  storage?: Storage;
  logger?: Logger;
  airProvider?: AirQualityProvider | null;
  visionProvider?: RoomVisionProvider | null;
  explainProvider?: ExplanationProvider | null;
  clock?: Clock;
}

/**
 * Composition root: the only place that knows which adapter implements which port. Everything else depends
 * on interfaces, so storage or an upstream can be swapped (or a service extracted) without touching callers.
 */
export function createServices(config: AppConfig, overrides: Overrides = {}): Services {
  const clock = overrides.clock ?? systemClock;
  const logger =
    overrides.logger ??
    createLogger({
      level: config.logLevel,
      service: config.service,
      base: { service: config.service.name, revision: config.service.revision },
    });

  const storage =
    overrides.storage ??
    (config.storage === "firestore" ? createFirestoreStorage(config, logger) : createMemoryStorage(config.budgets, clock));

  const pick = <T>(override: T | null | undefined, build: () => T | undefined): T | undefined =>
    override === undefined ? build() : (override ?? undefined);

  const airProvider = pick<AirQualityProvider>(overrides.airProvider, () =>
    config.mapsApiKey ? new GoogleAirQualityProvider(config.mapsApiKey) : undefined,
  );
  const gemini = config.geminiApiKey ? new GeminiProvider(config.geminiApiKey) : undefined;
  const visionProvider = pick<RoomVisionProvider>(overrides.visionProvider, () => gemini);
  const explainProvider = pick<ExplanationProvider>(overrides.explainProvider, () => gemini);

  return {
    config,
    logger,
    limiters: new LimiterRegistry(),
    storage,
    air: new AirQualityService({
      provider: airProvider,
      cache: storage.cache,
      budget: storage.budget,
      log: logger,
      freshMs: config.airCache.freshMs,
      staleMs: config.airCache.staleMs,
      now: clock,
    }),
    room: new RoomVisionService({ provider: visionProvider, budget: storage.budget, log: logger }),
    explain: new ExplainService({
      provider: explainProvider,
      cache: storage.cache,
      budget: storage.budget,
      log: logger,
      cacheMs: config.explainCacheMs,
    }),
    receipts: new ReceiptService({ store: storage.receipts, ttlDays: config.receiptTtlDays, now: clock }),
    analytics: new AnalyticsService(storage.analytics, clock),
    upstreams: { airQuality: Boolean(airProvider), gemini: Boolean(visionProvider || explainProvider) },
  };
}

// Held on globalThis so Next's dev-mode module reloads do not rebuild the container (and lose its caches).
const KEY = Symbol.for("vayushift.services");
type Holder = { [KEY]?: Services };

export function getServices(): Services {
  const holder = globalThis as unknown as Holder;
  return (holder[KEY] ??= createServices(loadConfig()));
}

/** For tests: install a prepared container, or pass undefined to reset. */
export function setServicesForTests(services: Services | undefined): void {
  (globalThis as unknown as Holder)[KEY] = services;
}

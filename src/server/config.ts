import type { BudgetResource } from "./ports";

export type StorageBackend = "memory" | "firestore";
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  service: { name: string; revision: string };
  storage: StorageBackend;
  gcpProject: string | undefined;
  geminiApiKey: string | undefined;
  mapsApiKey: string | undefined;
  /** How many reverse proxies in front of the app append to X-Forwarded-For (Cloud Run alone: 1). */
  trustedProxyHops: number;
  /** Public origin used to build share links, e.g. https://vayushift-abc.a.run.app (no trailing slash). */
  publicOrigin: string | undefined;
  /** Daily call caps per paid upstream. Zero blocks the upstream entirely (fallbacks only). */
  budgets: Record<BudgetResource, number>;
  airCache: { freshMs: number; staleMs: number };
  explainCacheMs: number;
  receiptTtlDays: number;
  logLevel: LogLevel;
}

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n - ${problems.join("\n - ")}`);
    this.name = "ConfigError";
  }
}

type Env = Record<string, string | undefined>;

const BUDGET_ENV: Record<BudgetResource, { name: string; fallback: number }> = {
  airQuality: { name: "BUDGET_AIR_QUALITY_DAILY", fallback: 20_000 },
  geminiVision: { name: "BUDGET_GEMINI_VISION_DAILY", fallback: 300 },
  geminiExplain: { name: "BUDGET_GEMINI_EXPLAIN_DAILY", fallback: 2_000 },
};

/** Typed readers over one environment. Bad values are recorded in `problems` and replaced by the fallback. */
function reader(env: Env, problems: string[]) {
  const get = (name: string) => {
    const v = env[name]?.trim();
    return v ? v : undefined;
  };
  const int = (name: string, fallback: number, min: number, max: number) => {
    const raw = get(name);
    if (raw === undefined) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      problems.push(`${name} must be an integer between ${min} and ${max} (got "${raw}")`);
      return fallback;
    }
    return n;
  };
  const oneOf = <T extends string>(name: string, allowed: readonly T[], fallback: T): T => {
    const raw = get(name);
    if (raw === undefined) return fallback;
    const match = allowed.find((a) => a === raw);
    if (match === undefined) {
      problems.push(`${name} must be one of ${allowed.join(", ")} (got "${raw}")`);
      return fallback;
    }
    return match;
  };
  return { get, int, oneOf };
}

type Reader = ReturnType<typeof reader>;

/** PUBLIC_ORIGIN reduced to a bare origin: https only (plain http is allowed just for localhost). */
function readPublicOrigin(get: Reader["get"], problems: string[]): string | undefined {
  const raw = get("PUBLIC_ORIGIN");
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !local) problems.push("PUBLIC_ORIGIN must use https (http is only allowed for localhost)");
    return u.origin;
  } catch {
    problems.push(`PUBLIC_ORIGIN must be a valid URL (got "${raw}")`);
    return undefined;
  }
}

function readAirCache(int: Reader["int"], problems: string[]): AppConfig["airCache"] {
  const freshMinutes = int("AIR_CACHE_FRESH_MINUTES", 30, 1, 360);
  const staleMinutes = int("AIR_CACHE_STALE_MINUTES", 180, 1, 1440);
  if (staleMinutes < freshMinutes) problems.push("AIR_CACHE_STALE_MINUTES must be at least AIR_CACHE_FRESH_MINUTES");
  return { freshMs: freshMinutes * 60_000, staleMs: staleMinutes * 60_000 };
}

function readBudgets(int: Reader["int"]): Record<BudgetResource, number> {
  const read = (r: BudgetResource) => int(BUDGET_ENV[r].name, BUDGET_ENV[r].fallback, 0, 10_000_000);
  return { airQuality: read("airQuality"), geminiVision: read("geminiVision"), geminiExplain: read("geminiExplain") };
}

/**
 * Reads and validates configuration once. Every problem is collected and reported together, and the
 * server refuses to start on a bad value rather than failing later under load. Empty strings count as unset.
 */
export function loadConfig(env: Env = process.env): AppConfig {
  const problems: string[] = [];
  const { get, int, oneOf } = reader(env, problems);

  const nodeEnv = oneOf("NODE_ENV", ["development", "production", "test"] as const, "development");
  const storage = oneOf("STORAGE_BACKEND", ["memory", "firestore"] as const, "memory");
  const logLevel = oneOf("LOG_LEVEL", ["debug", "info", "warn", "error", "silent"] as const, nodeEnv === "test" ? "silent" : "info");

  const emulator = get("FIRESTORE_EMULATOR_HOST");
  const gcpProject = get("GOOGLE_CLOUD_PROJECT") ?? get("GCLOUD_PROJECT") ?? (emulator ? "demo-vayushift" : undefined);
  if (storage === "firestore" && !gcpProject) {
    problems.push("STORAGE_BACKEND=firestore requires GOOGLE_CLOUD_PROJECT (or FIRESTORE_EMULATOR_HOST for local development)");
  }

  const config: AppConfig = {
    nodeEnv,
    service: { name: get("K_SERVICE") ?? "vayushift", revision: get("K_REVISION") ?? "local" },
    storage,
    gcpProject,
    geminiApiKey: get("GEMINI_API_KEY"),
    mapsApiKey: get("GOOGLE_MAPS_API_KEY"),
    trustedProxyHops: int("TRUSTED_PROXY_HOPS", 1, 0, 5),
    publicOrigin: readPublicOrigin(get, problems),
    budgets: readBudgets(int),
    airCache: readAirCache(int, problems),
    explainCacheMs: int("EXPLAIN_CACHE_HOURS", 24, 1, 720) * 3_600_000,
    receiptTtlDays: int("RECEIPT_TTL_DAYS", 90, 1, 365),
    logLevel,
  };

  if (problems.length) throw new ConfigError(problems);
  return config;
}

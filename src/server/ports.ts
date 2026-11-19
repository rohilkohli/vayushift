/**
 * Ports: the interfaces the domain services depend on. Adapters implement them (in memory for local
 * development and tests, Firestore in production). Nothing in `services/` imports an adapter directly.
 */
import type { ActiveInterventions, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";

/** Daily-capped upstream resources. Caps protect cost and quota; see UsageBudget. */
export type BudgetResource = "airQuality" | "geminiVision" | "geminiExplain";
export const BUDGET_RESOURCES: readonly BudgetResource[] = ["airQuality", "geminiVision", "geminiExplain"];

export interface CacheEntry<T> {
  value: T;
  /** Epoch ms when the value was stored. */
  storedAt: number;
}

/** A TTL cache. Entries past their TTL are treated as absent. */
export interface Cache {
  get<T>(key: string): Promise<CacheEntry<T> | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

/** An immutable snapshot of a computed receipt, addressed by an unguessable id. Contains no personal data. */
export interface StoredReceipt {
  id: string;
  createdAt: number;
  expiresAt: number;
  /** Version of the calculation engine that produced `receipt`, so old links stay explainable. */
  engineVersion: string;
  /** A scenario name only (e.g. "Anand Vihar"); never coordinates. */
  scenarioName: string;
  hourly: number[];
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
}

export interface ReceiptStore {
  /** Returns false when the id already exists, so the caller can pick another. */
  create(receipt: StoredReceipt): Promise<boolean>;
  get(id: string): Promise<StoredReceipt | null>;
}

/** Aggregated, anonymous usage counters. No identifiers of any kind are stored. */
export interface AnalyticsStore {
  increment(day: string, event: string, dimension: string): Promise<void>;
  /** Total per "event:dimension" for a day. */
  totals(day: string): Promise<Record<string, number>>;
}

/** A daily cap on calls to a paid or quota-limited upstream. */
export interface UsageBudget {
  /** True when the call may proceed. False means the day's cap is spent: use the fallback instead. */
  tryConsume(resource: BudgetResource): Promise<boolean>;
}

/** Something that can prove it is reachable (used by the readiness probe). */
export interface Pingable {
  ping(): Promise<void>;
}

export interface Storage {
  kind: "memory" | "firestore";
  cache: Cache;
  receipts: ReceiptStore;
  analytics: AnalyticsStore;
  budget: UsageBudget;
  /** Checks the backing store is reachable. */
  ping(): Promise<void>;
}

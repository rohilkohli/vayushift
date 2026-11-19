import type { AnalyticsStore, BudgetResource, Cache, CacheEntry, ReceiptStore, StoredReceipt, Storage, UsageBudget } from "../../ports";
import { systemClock, utcDay, type Clock } from "../../time";

/** TTL cache with a size cap; the least recently used entry is dropped first. */
export class MemoryCache implements Cache {
  private map = new Map<string, CacheEntry<unknown> & { expiresAt: number }>();
  constructor(
    private readonly maxEntries = 500,
    private readonly clock: Clock = systemClock,
  ) {}

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= this.clock()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, hit);
    return { value: hit.value as T, storedAt: hit.storedAt };
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.put(key, value, this.clock(), ttlMs);
  }

  /** Inserts an entry keeping its original `storedAt`, so a mirror of a shared cache does not look fresher than it is. */
  put<T>(key: string, value: T, storedAt: number, ttlMs: number): void {
    this.map.delete(key);
    this.map.set(key, { value, storedAt, expiresAt: this.clock() + ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

export class MemoryReceiptStore implements ReceiptStore {
  private map = new Map<string, StoredReceipt>();
  constructor(
    private readonly maxEntries = 5000,
    private readonly clock: Clock = systemClock,
  ) {}

  async create(receipt: StoredReceipt): Promise<boolean> {
    if (this.map.has(receipt.id)) return false;
    this.map.set(receipt.id, structuredClone(receipt));
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    return true;
  }

  async get(id: string): Promise<StoredReceipt | null> {
    const r = this.map.get(id);
    if (!r) return null;
    if (r.expiresAt <= this.clock()) {
      this.map.delete(id);
      return null;
    }
    return structuredClone(r);
  }
}

export class MemoryAnalyticsStore implements AnalyticsStore {
  private counts = new Map<string, number>();

  async increment(day: string, event: string, dimension: string): Promise<void> {
    const key = `${day}|${event}:${dimension}`;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  async totals(day: string): Promise<Record<string, number>> {
    const prefix = `${day}|`;
    return Object.fromEntries(
      [...this.counts].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]),
    );
  }
}

export class MemoryBudget implements UsageBudget {
  private used = new Map<string, number>();
  constructor(
    private readonly caps: Record<BudgetResource, number>,
    private readonly clock: Clock = systemClock,
  ) {}

  async tryConsume(resource: BudgetResource): Promise<boolean> {
    const key = `${utcDay(this.clock())}:${resource}`;
    const used = this.used.get(key) ?? 0;
    if (used >= this.caps[resource]) return false;
    this.used.set(key, used + 1);
    return true;
  }
}

export function createMemoryStorage(caps: Record<BudgetResource, number>, clock: Clock = systemClock): Storage {
  return {
    kind: "memory",
    cache: new MemoryCache(500, clock),
    receipts: new MemoryReceiptStore(5000, clock),
    analytics: new MemoryAnalyticsStore(),
    budget: new MemoryBudget(caps, clock),
    ping: async () => undefined,
  };
}

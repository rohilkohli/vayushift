export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  /** Seconds until the window resets (always at least 1 when blocked). */
  retryAfterSec: number;
}

/**
 * Fixed-window limiter held in memory. On Cloud Run each instance keeps its own counts, so the effective
 * limit is per instance: it blunts abuse and accidents, while the daily UsageBudget (shared through
 * Firestore) is what actually protects spend. See docs/ARCHITECTURE.md.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly opts: RateLimitOptions) {}

  check(key: string, now = Date.now()): RateDecision {
    if (this.hits.size > 5000) this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.opts.windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    entry.count += 1;
    if (entry.count <= this.opts.limit) return { allowed: true, retryAfterSec: 0 };
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

/** One limiter per route name, created on first use. */
export class LimiterRegistry {
  private limiters = new Map<string, RateLimiter>();
  for(name: string, opts: RateLimitOptions): RateLimiter {
    let l = this.limiters.get(name);
    if (!l) {
      l = new RateLimiter(opts);
      this.limiters.set(name, l);
    }
    return l;
  }
}

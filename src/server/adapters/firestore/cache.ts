import { createHash } from "node:crypto";
import type { Cache, CacheEntry } from "../../ports";
import { systemClock, type Clock } from "../../time";
import { MemoryCache } from "../memory";
import type { FirestoreHandle } from "./client";

/** Entries mirrored in memory live this long, so one instance never serves another's older answer for long. */
const L1_TTL_MS = 60_000;
const COLLECTION = "cache";

/**
 * Two-level cache: a small in-memory layer in front of Firestore, which is shared by every Cloud Run instance.
 * Documents carry an `expiresAt` Timestamp, so a Firestore TTL policy on that field deletes them for free.
 * Values are stored as JSON text, which sidesteps Firestore's limits on nested arrays.
 */
export class FirestoreCache implements Cache {
  private readonly l1: MemoryCache;
  constructor(
    private readonly handle: FirestoreHandle,
    private readonly clock: Clock = systemClock,
  ) {
    this.l1 = new MemoryCache(200, clock);
  }

  private docId(key: string) {
    return createHash("sha256").update(key).digest("hex");
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    const local = await this.l1.get<T>(key);
    if (local) return local;
    const db = await this.handle.db();
    const snap = await db.collection(COLLECTION).doc(this.docId(key)).get();
    if (!snap.exists) return undefined;
    const data = snap.data() as { json: string; storedAt: number; expiresAt: { toMillis(): number } };
    const expiresAt = data.expiresAt.toMillis();
    const now = this.clock();
    if (expiresAt <= now) return undefined;
    const value = JSON.parse(data.json) as T;
    this.l1.put(key, value, data.storedAt, Math.min(L1_TTL_MS, expiresAt - now));
    return { value, storedAt: data.storedAt };
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const now = this.clock();
    this.l1.put(key, value, now, Math.min(L1_TTL_MS, ttlMs));
    const db = await this.handle.db();
    const { Timestamp } = await import("@google-cloud/firestore");
    await db.collection(COLLECTION).doc(this.docId(key)).set({
      key,
      json: JSON.stringify(value),
      storedAt: now,
      expiresAt: Timestamp.fromMillis(now + ttlMs),
    });
  }
}

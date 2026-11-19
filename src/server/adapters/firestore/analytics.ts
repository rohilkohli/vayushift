import { createHash, randomInt } from "node:crypto";
import type { AnalyticsStore } from "../../ports";
import type { FirestoreHandle } from "./client";

const COLLECTION = "analytics";
/**
 * One Firestore document sustains roughly one write per second. Popular events could exceed that, so each
 * counter is split across several shard documents and summed on read (the standard distributed-counter pattern).
 */
const SHARDS = 5;

export class FirestoreAnalyticsStore implements AnalyticsStore {
  constructor(private readonly handle: FirestoreHandle) {}

  private docId(day: string, key: string, shard: number) {
    return `${day}__${createHash("sha1").update(key).digest("hex").slice(0, 12)}__${shard}`;
  }

  async increment(day: string, event: string, dimension: string): Promise<void> {
    const db = await this.handle.db();
    const { FieldValue } = await import("@google-cloud/firestore");
    const key = `${event}:${dimension}`;
    await db
      .collection(COLLECTION)
      .doc(this.docId(day, key, randomInt(SHARDS)))
      .set({ day, key, count: FieldValue.increment(1) }, { merge: true });
  }

  async totals(day: string): Promise<Record<string, number>> {
    const db = await this.handle.db();
    const snap = await db.collection(COLLECTION).where("day", "==", day).get();
    const out: Record<string, number> = {};
    for (const doc of snap.docs) {
      const { key, count } = doc.data() as { key: string; count: number };
      out[key] = (out[key] ?? 0) + count;
    }
    return out;
  }
}

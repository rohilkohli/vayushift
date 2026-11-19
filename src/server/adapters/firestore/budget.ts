import type { Logger } from "../../logger";
import type { BudgetResource, UsageBudget } from "../../ports";
import { systemClock, utcDay, type Clock } from "../../time";
import type { FirestoreHandle } from "./client";

const COLLECTION = "usage";

/**
 * A daily cap shared by every instance, without one Firestore write per call. An instance reserves a BLOCK of
 * calls in a transaction (one write per `blockSize` calls) and spends it locally. The cap can never be exceeded;
 * at most one unused block per instance is left over at the end of the day. If Firestore is unreachable the
 * budget fails CLOSED: paid upstreams are skipped and users get the free fallbacks, so an outage cannot become a bill.
 *
 * Reservations are single-flight per resource and day: callers that find the local block empty at the same
 * moment wait for ONE reservation instead of each making their own (which would overwrite one another's leftovers).
 */
export class FirestoreBudget implements UsageBudget {
  private local = new Map<string, number>();
  private reserving = new Map<string, Promise<number>>();
  /** Day+resource pairs whose cap is fully reserved. A spent cap never recovers, so later calls skip Firestore entirely. */
  private exhausted = new Set<string>();
  constructor(
    private readonly handle: FirestoreHandle,
    private readonly caps: Record<BudgetResource, number>,
    private readonly log: Logger,
    private readonly blockSize = 10,
    private readonly clock: Clock = systemClock,
  ) {}

  async tryConsume(resource: BudgetResource): Promise<boolean> {
    const cap = this.caps[resource];
    if (cap <= 0) return false;
    const day = utcDay(this.clock());
    const key = `${day}:${resource}`;

    for (;;) {
      const left = this.local.get(key) ?? 0;
      if (left > 0) {
        this.local.set(key, left - 1);
        return true;
      }
      if (this.exhausted.has(key)) return false;
      let pending = this.reserving.get(key);
      if (!pending) {
        pending = this.reserve(day, resource, key, cap)
          .then((granted) => {
            this.local.set(key, (this.local.get(key) ?? 0) + granted);
            return granted;
          })
          .finally(() => this.reserving.delete(key));
        this.reserving.set(key, pending);
      }
      let granted: number;
      try {
        granted = await pending;
      } catch (err) {
        this.log.error("budget reservation failed; failing closed", { err, resource });
        return false;
      }
      if (granted <= 0) {
        this.exhausted.add(key); // the day's cap is fully reserved
        return false;
      }
      // Otherwise loop: take a call from the block (another waiter may have used it, in which case we reserve again).
    }
  }

  private async reserve(day: string, resource: BudgetResource, docId: string, cap: number): Promise<number> {
    const db = await this.handle.db();
    const ref = db.collection(COLLECTION).doc(docId);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? ((snap.data() as { used: number }).used ?? 0) : 0;
      if (used >= cap) return 0;
      const grant = Math.min(this.blockSize, cap - used);
      tx.set(ref, { day, resource, used: used + grant, updatedAt: this.clock() });
      return grant;
    });
  }
}

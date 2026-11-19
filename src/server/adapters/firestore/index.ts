import type { AppConfig } from "../../config";
import type { Logger } from "../../logger";
import type { Storage } from "../../ports";
import { systemClock, type Clock } from "../../time";
import { FirestoreAnalyticsStore } from "./analytics";
import { FirestoreBudget } from "./budget";
import { FirestoreCache } from "./cache";
import { FirestoreHandle } from "./client";
import { FirestoreReceiptStore } from "./receipts";

const PING_TIMEOUT_MS = 2000;

export function createFirestoreStorage(config: AppConfig, log: Logger, clock: Clock = systemClock): Storage {
  const handle = new FirestoreHandle(config);
  return {
    kind: "firestore",
    cache: new FirestoreCache(handle, clock),
    receipts: new FirestoreReceiptStore(handle, clock),
    analytics: new FirestoreAnalyticsStore(handle),
    budget: new FirestoreBudget(handle, config.budgets, log, 10, clock),
    // A read of a document that need not exist proves connectivity and read permission.
    async ping() {
      const db = await handle.db();
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error("Firestore ping timed out")), PING_TIMEOUT_MS);
      });
      await Promise.race([db.collection("_health").doc("ping").get(), timeout]).finally(() => clearTimeout(timer));
    },
  };
}

export { FirestoreAnalyticsStore, FirestoreBudget, FirestoreCache, FirestoreHandle, FirestoreReceiptStore };

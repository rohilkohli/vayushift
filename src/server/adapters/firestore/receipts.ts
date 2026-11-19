import type { ReceiptStore, StoredReceipt } from "../../ports";
import { systemClock, type Clock } from "../../time";
import { isAlreadyExists, type FirestoreHandle } from "./client";

const COLLECTION = "receipts";

type Row = Omit<StoredReceipt, "expiresAt"> & { expiresAt: { toMillis(): number } };

/**
 * Receipts are written once and never updated, so `create()` (which fails if the id exists) gives collision
 * safety for free. `expiresAt` is a Timestamp so a Firestore TTL policy removes expired links.
 */
export class FirestoreReceiptStore implements ReceiptStore {
  constructor(
    private readonly handle: FirestoreHandle,
    private readonly clock: Clock = systemClock,
  ) {}

  async create(receipt: StoredReceipt): Promise<boolean> {
    const db = await this.handle.db();
    const { Timestamp } = await import("@google-cloud/firestore");
    try {
      await db
        .collection(COLLECTION)
        .doc(receipt.id)
        .create({ ...receipt, expiresAt: Timestamp.fromMillis(receipt.expiresAt) });
      return true;
    } catch (err) {
      if (isAlreadyExists(err)) return false;
      throw err;
    }
  }

  async get(id: string): Promise<StoredReceipt | null> {
    const db = await this.handle.db();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    const row = snap.data() as Row;
    const expiresAt = row.expiresAt.toMillis();
    // TTL deletion can lag by up to a day, so expiry is enforced on read as well.
    if (expiresAt <= this.clock()) return null;
    return { ...row, expiresAt };
  }
}

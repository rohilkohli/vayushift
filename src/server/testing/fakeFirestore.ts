/**
 * An in-memory stand-in for the slice of the Firestore API our adapters use: documents (get / set with merge /
 * create), equality queries, serialised transactions, and FieldValue.increment. It lets the adapters' own logic
 * (key hashing, timestamp conversion, error mapping, sharding, block reservation) be tested without the emulator.
 * It is NOT a substitute for the emulator: query planning, indexes, security and real concurrency are only
 * exercised by storage.contract.test.ts against real Firestore in CI.
 */
import type { FirestoreHandle } from "../adapters/firestore/client";

type Doc = Record<string, unknown>;

const isIncrement = (v: unknown): v is { operand: number } =>
  typeof v === "object" && v !== null && "operand" in v && typeof (v as { operand: unknown }).operand === "number";

/** Deep-copies plain objects and arrays but keeps class instances (like Timestamp) intact, as real Firestore returns them. */
function cloneValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(cloneValue);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cloneValue(x)]));
  }
  return v;
}
const cloneDoc = (d: Doc) => cloneValue(d) as Doc;

function applyWrite(existing: Doc | undefined, data: Doc, merge: boolean): Doc {
  const base: Doc = merge && existing ? { ...existing } : {};
  for (const [k, v] of Object.entries(data)) {
    base[k] = isIncrement(v) ? ((base[k] as number | undefined) ?? 0) + v.operand : v;
  }
  return base;
}

export interface FakeFirestoreOptions {
  /** Make every transaction fail, as during an outage. */
  failTransactions?: boolean;
  /** Make every read fail. */
  failReads?: boolean;
}

export function fakeFirestore(opts: FakeFirestoreOptions = {}) {
  const docs = new Map<string, Doc>();
  let chain: Promise<unknown> = Promise.resolve();
  const counts = { reads: 0, writes: 0, transactions: 0 };

  const docRef = (collection: string, id: string) => {
    const path = `${collection}/${id}`;
    return {
      path,
      id,
      async get() {
        counts.reads++;
        if (opts.failReads) throw new Error("UNAVAILABLE");
        const data = docs.get(path);
        return { exists: data !== undefined, data: () => (data ? cloneDoc(data) : undefined), id };
      },
      async set(data: Doc, options?: { merge?: boolean }) {
        counts.writes++;
        docs.set(path, applyWrite(docs.get(path), data, options?.merge ?? false));
      },
      async create(data: Doc) {
        counts.writes++;
        if (docs.has(path)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
        docs.set(path, applyWrite(undefined, data, false));
      },
    };
  };

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => docRef(name, id),
      where: (field: string, _op: "==", value: unknown) => ({
        async get() {
          counts.reads++;
          const matches = [...docs].filter(([p, d]) => p.startsWith(`${name}/`) && d[field] === value);
          return { docs: matches.map(([p, d]) => ({ id: p.split("/")[1], data: () => cloneDoc(d) })) };
        },
      }),
    }),
    runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      counts.transactions++;
      const run = chain.then(async () => {
        if (opts.failTransactions) throw new Error("UNAVAILABLE");
        const writes = new Map<string, Doc>();
        const tx = {
          get: async (r: { path: string }) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
          set: (r: { path: string }, data: Doc) => void writes.set(r.path, data),
        };
        const out = await fn(tx);
        for (const [k, v] of writes) docs.set(k, v);
        return out;
      });
      chain = run.catch(() => undefined);
      return run;
    },
  };

  return { handle: { db: async () => db } as unknown as FirestoreHandle, docs, counts };
}

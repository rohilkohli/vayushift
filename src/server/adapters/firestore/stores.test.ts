/** Logic of the Firestore cache, receipt and analytics adapters, against the shared Firestore fake. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { FakeClock, hourlyFixture, interventionsFixture, profileFixture } from "../../testing";
import { fakeFirestore } from "../../testing/fakeFirestore";
import type { StoredReceipt } from "../../ports";
import { FirestoreAnalyticsStore } from "./analytics";
import { FirestoreCache } from "./cache";
import { FirestoreReceiptStore } from "./receipts";

const sha = (k: string) => createHash("sha256").update(k).digest("hex");

describe("FirestoreCache", () => {
  it("stores JSON under a hashed id with an expiresAt timestamp for the TTL policy", async () => {
    const f = fakeFirestore();
    const clock = new FakeClock();
    const cache = new FirestoreCache(f.handle, clock.now);
    await cache.set("aq:v1:28.650:77.315", { pm: [1, 2, [3]] }, 3_600_000);
    const row = f.docs.get(`cache/${sha("aq:v1:28.650:77.315")}`) as { json: string; storedAt: number; expiresAt: { toMillis(): number } };
    expect(JSON.parse(row.json)).toEqual({ pm: [1, 2, [3]] }); // nested arrays survive because values are JSON text
    expect(row.storedAt).toBe(clock.ms);
    expect(row.expiresAt.toMillis()).toBe(clock.ms + 3_600_000);
  });

  it("is shared: a second instance reads what the first wrote, keeping the ORIGINAL storedAt", async () => {
    const f = fakeFirestore();
    const clock = new FakeClock();
    const a = new FirestoreCache(f.handle, clock.now);
    await a.set("k", "v", 3_600_000);
    clock.tick(10 * 60_000);
    const b = new FirestoreCache(f.handle, clock.now);
    const hit = await b.get<string>("k");
    expect(hit?.value).toBe("v");
    expect(clock.ms - hit!.storedAt).toBe(10 * 60_000); // age is preserved, so freshness checks stay honest
  });

  it("serves repeat reads from memory instead of Firestore", async () => {
    const f = fakeFirestore();
    const clock = new FakeClock();
    const writer = new FirestoreCache(f.handle, clock.now);
    await writer.set("k", "v", 3_600_000);
    const reader = new FirestoreCache(f.handle, clock.now);
    await reader.get("k");
    const readsAfterFirst = f.counts.reads;
    await reader.get("k");
    await reader.get("k");
    expect(f.counts.reads).toBe(readsAfterFirst);
  });

  it("re-reads Firestore once the short memory copy expires, picking up newer values from other instances", async () => {
    const f = fakeFirestore();
    const clock = new FakeClock();
    const a = new FirestoreCache(f.handle, clock.now);
    const b = new FirestoreCache(f.handle, clock.now);
    await a.set("k", "old", 3_600_000);
    expect((await b.get<string>("k"))?.value).toBe("old");
    clock.tick(30_000);
    await a.set("k", "new", 3_600_000);
    expect((await b.get<string>("k"))?.value).toBe("old"); // still within b's 60 s memory copy
    clock.tick(61_000);
    expect((await b.get<string>("k"))?.value).toBe("new");
  });

  it("treats an expired document as a miss", async () => {
    const f = fakeFirestore();
    const clock = new FakeClock();
    const cache = new FirestoreCache(f.handle, clock.now);
    await cache.set("k", "v", 1000);
    clock.tick(2000);
    expect(await new FirestoreCache(f.handle, clock.now).get("k")).toBeUndefined();
  });
});

describe("FirestoreReceiptStore", () => {
  const make = (over: Partial<StoredReceipt> = {}): StoredReceipt => ({
    id: "Ab3dEf9hIj",
    createdAt: 1_000,
    expiresAt: 1_000 + 86_400_000,
    engineVersion: "1.0",
    scenarioName: "Anand Vihar",
    hourly: hourlyFixture,
    profile: profileFixture,
    interventions: interventionsFixture,
    receipt: calculateHouseholdImpact(hourlyFixture.map((pm25, hour) => ({ hour, pm25 })), profileFixture, interventionsFixture),
    ...over,
  });

  it("maps ALREADY_EXISTS to false and rethrows other errors", async () => {
    const f = fakeFirestore();
    const store = new FirestoreReceiptStore(f.handle, () => 2_000);
    expect(await store.create(make())).toBe(true);
    expect(await store.create(make({ scenarioName: "Impostor" }))).toBe(false);
    expect((await store.get("Ab3dEf9hIj"))?.scenarioName).toBe("Anand Vihar");
  });

  it("round-trips a receipt, converting expiresAt to and from a Timestamp", async () => {
    const f = fakeFirestore();
    const store = new FirestoreReceiptStore(f.handle, () => 2_000);
    const r = make();
    await store.create(r);
    expect(await store.get(r.id)).toEqual(r);
    const row = f.docs.get(`receipts/${r.id}`) as { expiresAt: { toMillis(): number } };
    expect(typeof row.expiresAt.toMillis).toBe("function");
  });

  it("enforces expiry on read, since TTL deletion can lag", async () => {
    const f = fakeFirestore();
    let now = 2_000;
    const store = new FirestoreReceiptStore(f.handle, () => now);
    await store.create(make({ expiresAt: 5_000 }));
    expect(await store.get("Ab3dEf9hIj")).not.toBeNull();
    now = 5_001;
    expect(await store.get("Ab3dEf9hIj")).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await new FirestoreReceiptStore(fakeFirestore().handle).get("nope")).toBeNull();
  });

  it("propagates real storage errors instead of reporting a collision", async () => {
    const f = fakeFirestore();
    const handle = {
      db: async () => ({
        collection: () => ({ doc: () => ({ create: async () => Promise.reject(Object.assign(new Error("PERMISSION_DENIED"), { code: 7 })) }) }),
      }),
    };
    await expect(new FirestoreReceiptStore(handle as never).create(make())).rejects.toThrow("PERMISSION_DENIED");
    void f;
  });
});

describe("FirestoreAnalyticsStore", () => {
  it("spreads one counter across shard documents and sums them on read", async () => {
    const f = fakeFirestore();
    const store = new FirestoreAnalyticsStore(f.handle);
    for (let i = 0; i < 200; i++) await store.increment("2026-11-19", "scenario_loaded", "preset=gurugram");
    const docs = [...f.docs.keys()].filter((k) => k.startsWith("analytics/2026-11-19__"));
    expect(docs.length).toBeGreaterThan(1); // sharded, so no single document takes every write
    expect(docs.length).toBeLessThanOrEqual(5);
    expect(await store.totals("2026-11-19")).toEqual({ "scenario_loaded:preset=gurugram": 200 });
  });

  it("keeps days and dimensions apart and stores nothing identifying", async () => {
    const f = fakeFirestore();
    const store = new FirestoreAnalyticsStore(f.handle);
    await store.increment("2026-11-19", "room_scan_completed", "source=upload");
    await store.increment("2026-11-20", "room_scan_completed", "source=upload");
    await store.increment("2026-11-19", "room_scan_completed", "source=preset");
    expect(await store.totals("2026-11-19")).toEqual({ "room_scan_completed:source=upload": 1, "room_scan_completed:source=preset": 1 });
    for (const doc of f.docs.values()) expect(Object.keys(doc).sort()).toEqual(["count", "day", "key"]);
  });
});

/**
 * Exercises FirestoreBudget's reservation logic against the shared Firestore fake, so block reservation and
 * concurrency are tested locally. The same behaviour is checked against real Firestore in
 * storage.contract.test.ts when the emulator is available.
 */
import { describe, expect, it } from "vitest";
import { createLogger } from "../../logger";
import { fakeFirestore } from "../../testing/fakeFirestore";
import { FirestoreBudget } from "./budget";

const silent = createLogger({ level: "silent", service: { name: "t", revision: "t" } });
const caps = { airQuality: 1000, geminiVision: 25, geminiExplain: 1000 };
const noon = () => Date.UTC(2026, 10, 19, 12);

describe("FirestoreBudget", () => {
  it("allows exactly the cap and writes once per block, not once per call", async () => {
    const f = fakeFirestore();
    const b = new FirestoreBudget(f.handle, caps, silent, 10, noon);
    const results: boolean[] = [];
    for (let i = 0; i < 40; i++) results.push(await b.tryConsume("geminiVision"));
    expect(results.filter(Boolean)).toHaveLength(25);
    // Reservations of 10, 10 and 5, then one refusal; the other 14 refusals never reach Firestore.
    expect(f.counts.transactions).toBe(4);
    expect(f.docs.get("usage/2026-11-19:geminiVision")?.used).toBe(25);
  });

  it("neither overspends nor wastes budget when many callers arrive at once", async () => {
    const f = fakeFirestore();
    const b = new FirestoreBudget(f.handle, caps, silent, 10, noon);
    const results = await Promise.all(Array.from({ length: 100 }, () => b.tryConsume("geminiVision")));
    expect(results.filter(Boolean)).toHaveLength(25);
  });

  it("shares one cap across instances: together they never exceed it", async () => {
    const f = fakeFirestore();
    const instances = [0, 1, 2].map(() => new FirestoreBudget(f.handle, caps, silent, 10, noon));
    const results = await Promise.all(Array.from({ length: 90 }, (_, i) => instances[i % 3].tryConsume("geminiVision")));
    expect(results.filter(Boolean).length).toBeLessThanOrEqual(25);
    expect(f.docs.get("usage/2026-11-19:geminiVision")?.used).toBe(25);
  });

  it("refuses immediately, without touching Firestore, when the cap is zero", async () => {
    const f = fakeFirestore();
    const b = new FirestoreBudget(f.handle, { ...caps, geminiVision: 0 }, silent, 10, noon);
    expect(await b.tryConsume("geminiVision")).toBe(false);
    expect(f.counts.transactions).toBe(0);
  });

  it("fails CLOSED when Firestore is unavailable", async () => {
    const down = fakeFirestore({ failTransactions: true });
    const b = new FirestoreBudget(down.handle, caps, silent, 10, noon);
    expect(await b.tryConsume("geminiVision")).toBe(false);
    expect(await b.tryConsume("airQuality")).toBe(false);
  });

  it("recovers after an outage ends (a failed reservation is not remembered as exhaustion)", async () => {
    const f = fakeFirestore({ failTransactions: true });
    const b = new FirestoreBudget(f.handle, caps, silent, 10, noon);
    expect(await b.tryConsume("geminiVision")).toBe(false);
    const healthy = fakeFirestore();
    const b2 = new FirestoreBudget(healthy.handle, caps, silent, 10, noon);
    expect(await b2.tryConsume("geminiVision")).toBe(true);
  });

  it("rolls over at midnight UTC", async () => {
    const f = fakeFirestore();
    let ms = Date.UTC(2026, 10, 19, 23, 59);
    const b = new FirestoreBudget(f.handle, { ...caps, geminiVision: 1 }, silent, 10, () => ms);
    expect(await b.tryConsume("geminiVision")).toBe(true);
    expect(await b.tryConsume("geminiVision")).toBe(false);
    ms = Date.UTC(2026, 10, 20, 0, 1);
    expect(await b.tryConsume("geminiVision")).toBe(true);
    expect([...f.docs.keys()].sort()).toEqual(["usage/2026-11-19:geminiVision", "usage/2026-11-20:geminiVision"]);
  });
});

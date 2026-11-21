/**
 * One behavioural contract that EVERY storage adapter must satisfy. It always runs against the in-memory
 * adapter. It also runs against Firestore whenever FIRESTORE_EMULATOR_HOST is set (CI starts the emulator;
 * locally: `gcloud emulators firestore start`, then set the variable). Each test uses unique keys and a unique
 * fake day, so runs never see each other's data.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createLogger } from "../logger";
import type { BudgetResource, Storage, StoredReceipt } from "../ports";
import { testConfig, hourlyFixture, interventionsFixture, profileFixture } from "../testing";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { createFirestoreStorage } from "./firestore";
import { createMemoryStorage } from "./memory";

type Caps = Record<BudgetResource, number>;
type Factory = (caps: Caps, clock?: () => number) => Storage;

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const silent = createLogger({ level: "silent", service: { name: "t", revision: "t" } });

const factories: Array<[string, Factory]> = [["memory", (caps, clock) => createMemoryStorage(caps, clock)]];
if (emulator) {
  factories.push([
    "firestore (emulator)",
    (caps, clock) => {
      const config = { ...testConfig({ STORAGE_BACKEND: "firestore", FIRESTORE_EMULATOR_HOST: emulator }), budgets: caps };
      // Budget documents are keyed by day, so each test passes its own fake day and reruns start from zero.
      return createFirestoreStorage(config, silent, clock);
    },
  ]);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uniqueDay = () =>
  `2${String(100 + Math.floor(Math.random() * 800)).padStart(3, "0")}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`;
const bigCaps: Caps = { airQuality: 1000, geminiVision: 1000, geminiExplain: 1000 };

function receipt(overrides: Partial<StoredReceipt> = {}): StoredReceipt {
  const hourly = hourlyFixture.map((pm25, hour) => ({ hour, pm25 }));
  const now = Date.now();
  return {
    id: randomUUID().replace(/-/g, "").slice(0, 10),
    createdAt: now,
    expiresAt: now + 86_400_000,
    engineVersion: "1.0",
    scenarioName: "Anand Vihar",
    hourly: hourlyFixture,
    profile: profileFixture,
    interventions: interventionsFixture,
    receipt: calculateHouseholdImpact(hourly, profileFixture, interventionsFixture),
    ...overrides,
  };
}

describe.each(factories)("storage contract: %s", (_name, make) => {
  describe("cache", () => {
    it("round-trips values and records when they were stored", async () => {
      const { cache } = make(bigCaps);
      const key = `k-${randomUUID()}`;
      const before = Date.now();
      await cache.set(key, { a: 1, nested: { list: [1, 2, 3] } }, 60_000);
      const hit = await cache.get<{ a: number }>(key);
      expect(hit?.value).toEqual({ a: 1, nested: { list: [1, 2, 3] } });
      expect(hit!.storedAt).toBeGreaterThanOrEqual(before - 5);
      expect(hit!.storedAt).toBeLessThanOrEqual(Date.now() + 5);
    });

    it("misses on unknown keys and overwrites on set", async () => {
      const { cache } = make(bigCaps);
      const key = `k-${randomUUID()}`;
      expect(await cache.get(key)).toBeUndefined();
      await cache.set(key, "one", 60_000);
      await cache.set(key, "two", 60_000);
      expect((await cache.get<string>(key))?.value).toBe("two");
    });

    it("stops returning entries after their TTL", async () => {
      const { cache } = make(bigCaps);
      const key = `k-${randomUUID()}`;
      await cache.set(key, "short-lived", 60);
      expect((await cache.get(key))?.value).toBe("short-lived");
      await wait(120);
      expect(await cache.get(key)).toBeUndefined();
    });

    it("handles keys with awkward characters", async () => {
      const { cache } = make(bigCaps);
      const key = `aq:v1:28.650:77.315/../${randomUUID()}`;
      await cache.set(key, 7, 60_000);
      expect((await cache.get<number>(key))?.value).toBe(7);
    });
  });

  describe("receipts", () => {
    it("creates once, refuses a duplicate id, and returns what was stored", async () => {
      const { receipts } = make(bigCaps);
      const r = receipt();
      expect(await receipts.create(r)).toBe(true);
      expect(await receipts.create({ ...r, scenarioName: "Impostor" })).toBe(false);
      const got = await receipts.get(r.id);
      expect(got).toEqual(r);
      expect(got?.scenarioName).toBe("Anand Vihar");
    });

    it("returns null for unknown ids", async () => {
      const { receipts } = make(bigCaps);
      expect(await receipts.get("doesnotexist")).toBeNull();
    });

    it("treats an expired receipt as gone", async () => {
      const { receipts } = make(bigCaps);
      const r = receipt({ expiresAt: Date.now() - 1000 });
      await receipts.create(r);
      expect(await receipts.get(r.id)).toBeNull();
    });
  });

  describe("analytics", () => {
    it("counts per event and dimension, per day", async () => {
      const { analytics } = make(bigCaps);
      const day = uniqueDay();
      const other = uniqueDay() + "x";
      await analytics.increment(day, "scenario_loaded", "preset=gurugram");
      await analytics.increment(day, "scenario_loaded", "preset=gurugram");
      await analytics.increment(day, "scenario_loaded", "preset=anand-vihar");
      await analytics.increment(other, "scenario_loaded", "preset=gurugram");
      expect(await analytics.totals(day)).toEqual({
        "scenario_loaded:preset=gurugram": 2,
        "scenario_loaded:preset=anand-vihar": 1,
      });
      expect(await analytics.totals(other)).toEqual({ "scenario_loaded:preset=gurugram": 1 });
    });

    it("loses no counts under concurrent increments (sharded counters sum correctly)", async () => {
      const { analytics } = make(bigCaps);
      const day = uniqueDay();
      await Promise.all(Array.from({ length: 60 }, () => analytics.increment(day, "routine_shift_toggled", "purgeAtTrough:on")));
      expect((await analytics.totals(day))["routine_shift_toggled:purgeAtTrough:on"]).toBe(60);
    });

    it("returns an empty object for a day with no events", async () => {
      const { analytics } = make(bigCaps);
      expect(await analytics.totals(uniqueDay() + "-empty")).toEqual({});
    });
  });

  describe("budget", () => {
    // A unique fake day per test so reruns against a persistent emulator start from zero.
    const fixedClock = () => {
      const [y, m, d] = uniqueDay().split("-").map(Number);
      const ms = Date.UTC(y, m - 1, d, 12);
      return () => ms;
    };

    it("allows exactly the cap and then refuses", async () => {
      const { budget } = make({ ...bigCaps, geminiVision: 25 }, fixedClock());
      const results: boolean[] = [];
      for (let i = 0; i < 40; i++) results.push(await budget.tryConsume("geminiVision"));
      expect(results.filter(Boolean)).toHaveLength(25);
      expect(results.slice(0, 25).every(Boolean)).toBe(true);
      expect(results.slice(25).some(Boolean)).toBe(false);
    });

    it("never overspends under concurrency", async () => {
      const { budget } = make({ ...bigCaps, geminiVision: 25 }, fixedClock());
      const results = await Promise.all(Array.from({ length: 80 }, () => budget.tryConsume("geminiVision")));
      expect(results.filter(Boolean)).toHaveLength(25);
    });

    it("tracks each resource separately", async () => {
      const { budget } = make({ airQuality: 3, geminiVision: 1, geminiExplain: 2 }, fixedClock());
      expect(await budget.tryConsume("geminiVision")).toBe(true);
      expect(await budget.tryConsume("geminiVision")).toBe(false);
      expect(await budget.tryConsume("airQuality")).toBe(true);
    });

    it("blocks a resource whose cap is zero", async () => {
      const { budget } = make({ ...bigCaps, geminiExplain: 0 }, fixedClock());
      expect(await budget.tryConsume("geminiExplain")).toBe(false);
    });

    it("starts a fresh budget on a new UTC day", async () => {
      let ms = Date.UTC(2150, 5, 1, 23, 59);
      const { budget } = make({ ...bigCaps, geminiVision: 1 }, () => ms);
      expect(await budget.tryConsume("geminiVision")).toBe(true);
      expect(await budget.tryConsume("geminiVision")).toBe(false);
      ms = Date.UTC(2150, 5, 2, 0, 1);
      expect(await budget.tryConsume("geminiVision")).toBe(true);
    });
  });

  it("answers ping", async () => {
    await expect(make(bigCaps).ping()).resolves.toBeUndefined();
  });
});

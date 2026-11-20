import { describe, expect, it, vi } from "vitest";
import { SAMPLE_ROOMS } from "@/lib/roomScan";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { createMemoryStorage } from "../adapters/memory";
import { AppError } from "../errors";
import { createLogger } from "../logger";
import { FakeClock, hourlyFixture, interventionsFixture, profileFixture } from "../testing";
import { AnalyticsService } from "./analytics";
import { ExplainService, type ExplanationProvider } from "./explain";
import { ReceiptService, isReceiptId, newReceiptId } from "./receipts";
import { RoomVisionService, type RoomVisionProvider } from "./roomVision";

const silent = createLogger({ level: "silent", service: { name: "t", revision: "t" } });
const caps = { airQuality: 100, geminiVision: 100, geminiExplain: 100 };
const hourly = hourlyFixture.map((pm25, hour) => ({ hour, pm25 }));
const receiptFor = (patch = {}) => calculateHouseholdImpact(hourly, profileFixture, { ...interventionsFixture, ...patch });

describe("RoomVisionService", () => {
  const scan = SAMPLE_ROOMS[0].scan;
  const make = (provider: { scan: ReturnType<typeof vi.fn> } | undefined, budgetCap = 10) =>
    new RoomVisionService({ provider: provider as RoomVisionProvider | undefined, budget: createMemoryStorage({ ...caps, geminiVision: budgetCap }).budget, log: silent });

  it("returns the scan on success", async () => {
    const provider = { scan: vi.fn().mockResolvedValue(scan) };
    expect(await make(provider).analyze("image/jpeg", "AAAA")).toEqual({ kind: "scan", scan });
    expect(provider.scan).toHaveBeenCalledWith("image/jpeg", "AAAA");
  });

  it("falls back, never errors, in every failure case", async () => {
    expect(await make(undefined).analyze("image/png", "x")).toEqual({ kind: "fallback", reason: "ai_unavailable" });
    expect(await make({ scan: vi.fn().mockResolvedValue(null) }).analyze("image/png", "x")).toEqual({ kind: "fallback", reason: "not_a_room" });
    expect(await make({ scan: vi.fn().mockResolvedValue({ ...scan, isIndoorRoom: false }) }).analyze("image/png", "x")).toEqual({ kind: "fallback", reason: "not_a_room" });
    expect(await make({ scan: vi.fn().mockRejectedValue(new Error("timeout")) }).analyze("image/png", "x")).toEqual({ kind: "fallback", reason: "ai_unavailable" });
  });

  it("does not call the model once the daily budget is spent", async () => {
    const provider = { scan: vi.fn().mockResolvedValue(scan) };
    const svc = make(provider, 1);
    expect((await svc.analyze("image/png", "x")).kind).toBe("scan");
    expect(await svc.analyze("image/png", "x")).toEqual({ kind: "fallback", reason: "budget_exhausted" });
    expect(provider.scan).toHaveBeenCalledTimes(1);
  });
});

describe("ExplainService", () => {
  const inputs = { hourly, profile: profileFixture, interventions: interventionsFixture };
  const make = (explain: ReturnType<typeof vi.fn> | undefined, budgetCap = 10) => {
    const storage = createMemoryStorage({ ...caps, geminiExplain: budgetCap });
    const svc = new ExplainService({
      provider: explain ? ({ explain } as ExplanationProvider) : undefined,
      cache: storage.cache,
      budget: storage.budget,
      log: silent,
      cacheMs: 3_600_000,
    });
    return svc;
  };
  const goodText = () => `Your choices avoid ${receiptFor().avoidedCigarettesHouseholdDay} cigarette-equivalents today and save ${receiptFor().savedCo2GramsDay} g of CO2.`;

  it("computes the receipt itself, whatever the caller claims", async () => {
    const r = await make(undefined).explain(inputs);
    expect(r.receipt).toEqual(receiptFor());
    expect(r.source).toBe("template");
  });

  it("uses the model when its text only contains engine numbers, and caches the result", async () => {
    const explain = vi.fn().mockResolvedValue(goodText());
    const svc = make(explain);
    expect((await svc.explain(inputs)).source).toBe("gemini");
    expect((await svc.explain(inputs)).text).toBe(goodText());
    expect(explain).toHaveBeenCalledTimes(1); // identical receipt: no second model call
  });

  it("passes the model only the computed metrics, never raw inputs", async () => {
    const explain = vi.fn().mockResolvedValue(goodText());
    await make(explain).explain(inputs);
    expect(JSON.parse(explain.mock.calls[0][0])).toEqual(receiptFor());
  });

  it("rejects an explanation that invents a statistic and uses the template instead", async () => {
    const r = await make(vi.fn().mockResolvedValue("This cuts your child's asthma risk by 8123% every single day.")).explain(inputs);
    expect(r.source).toBe("template");
    expect(r.text).not.toContain("8123");
  });

  it("falls back when the model fails, returns overlong text, or the budget is spent", async () => {
    expect((await make(vi.fn().mockRejectedValue(new Error("429"))).explain(inputs)).source).toBe("template");
    expect((await make(vi.fn().mockResolvedValue("word ".repeat(400))).explain(inputs)).source).toBe("template");
    const explain = vi.fn().mockResolvedValue(goodText());
    expect((await make(explain, 0).explain(inputs)).source).toBe("template");
    expect(explain).not.toHaveBeenCalled();
  });

  it("does not call the model when nothing is switched on", async () => {
    const explain = vi.fn();
    const none = { ...interventionsFixture, filtrationMode: "none" as const, switchCommuteToMetroN95: false };
    const r = await make(explain).explain({ ...inputs, interventions: none });
    expect(r.source).toBe("template");
    expect(explain).not.toHaveBeenCalled();
  });
});

describe("ReceiptService", () => {
  const base = { scenarioName: "Anand Vihar", hourly, profile: profileFixture, interventions: interventionsFixture };
  const make = (over: Partial<ConstructorParameters<typeof ReceiptService>[0]> = {}) => {
    const clock = new FakeClock();
    const storage = createMemoryStorage(caps, clock.now);
    return { clock, storage, svc: new ReceiptService({ store: storage.receipts, ttlDays: 90, now: clock.now, ...over }) };
  };

  it("stores a server-computed receipt with the engine version and a 90-day expiry", async () => {
    const { svc, clock } = make();
    const r = await svc.create(base);
    expect(r.receipt).toEqual(receiptFor());
    expect(r.engineVersion).toBe("1.0");
    expect(r.expiresAt - r.createdAt).toBe(90 * 86_400_000);
    expect(r.hourly).toEqual(hourlyFixture);
    expect((await svc.get(r.id))?.createdAt).toBe(clock.ms);
  });

  it("generates long random ids and recognises only well-formed ones", () => {
    const ids = new Set(Array.from({ length: 500 }, newReceiptId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(isReceiptId(id)).toBe(true);
    for (const bad of ["short", "../../etc/passwd", "a".repeat(11), "abc def ghi", "", null, 42]) expect(isReceiptId(bad)).toBe(false);
  });

  it("stores nothing identifying: only the scenario name, hourly numbers, household sizes and switches", async () => {
    const { svc } = make();
    const r = await svc.create(base);
    expect(Object.keys(r).sort()).toEqual(
      ["createdAt", "engineVersion", "expiresAt", "hourly", "id", "interventions", "profile", "receipt", "scenarioName"].sort(),
    );
  });

  it("refuses a scenario name that could smuggle coordinates, markup or a very long string", async () => {
    const { svc } = make();
    for (const scenarioName of ["28.6139, 77.2090", "<script>alert(1)</script>", "x".repeat(41), "", "a/b"]) {
      await expect(svc.create({ ...base, scenarioName })).rejects.toMatchObject({ status: 400, code: "invalid_scenario_name" });
    }
    await expect(svc.create({ ...base, scenarioName: "Gurugram Cyber City" })).resolves.toBeDefined();
    await expect(svc.create({ ...base, scenarioName: "Central Delhi (post-curb)".replace(/[()]/g, "") })).resolves.toBeDefined();
  });

  it("retries on an id collision and gives up with a 503 after five", async () => {
    const ids = ["AAAAAAAAAA", "AAAAAAAAAA", "BBBBBBBBBB"];
    const { svc } = make({ generateId: () => ids.shift() ?? "BBBBBBBBBB" });
    expect((await svc.create(base)).id).toBe("AAAAAAAAAA");
    expect((await svc.create(base)).id).toBe("BBBBBBBBBB");
    const stuck = make({ generateId: () => "ZZZZZZZZZZ" }).svc;
    await stuck.create(base);
    await expect(stuck.create(base)).rejects.toSatisfy((e: AppError) => e.status === 503);
  });

  it("does not return expired receipts, or even query the store for malformed ids", async () => {
    const { svc, clock, storage } = make();
    const r = await svc.create(base);
    clock.tick(91 * 86_400_000);
    expect(await svc.get(r.id)).toBeNull();
    const spy = vi.spyOn(storage.receipts, "get");
    expect(await svc.get("../../x")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("AnalyticsService", () => {
  const make = () => {
    const storage = createMemoryStorage(caps);
    return { storage, svc: new AnalyticsService(storage.analytics, () => Date.UTC(2026, 10, 19, 10)) };
  };

  it("counts each of the five PRD events under a bounded dimension", async () => {
    const { svc } = make();
    expect(await svc.record("scenario_loaded", { preset_id: "gurugram" }, false)).toBe("recorded");
    await svc.record("routine_shift_toggled", { intervention_key: "purgeAtTrough", enabled: true }, false);
    await svc.record("room_scan_completed", { source: "upload", area_sqft: 180, latency_ms: 4000 }, false);
    await svc.record("filtration_option_selected", { option_id: "quad_merv13_cr_box" }, false);
    await svc.record("impact_receipt_shared", { share_type: "link" }, false);
    expect(await svc.totals()).toEqual({
      "scenario_loaded:preset=gurugram": 1,
      "routine_shift_toggled:purgeAtTrough:on": 1,
      "room_scan_completed:source=upload": 1,
      "filtration_option_selected:option=quad_merv13_cr_box": 1,
      "impact_receipt_shared:link": 1,
    });
  });

  it("drops extra properties instead of storing them", async () => {
    const { svc } = make();
    await svc.record("room_scan_completed", { source: "preset", email: "a@b.c", lat: 28.6, userId: "u1" }, false);
    expect(JSON.stringify(await svc.totals())).not.toMatch(/a@b|28\.6|u1/);
  });

  it("rejects unknown events and values outside the allowed set", async () => {
    const { svc } = make();
    for (const [event, props] of [
      ["page_view", {}],
      ["scenario_loaded", { preset_id: "my-home-address" }],
      ["routine_shift_toggled", { intervention_key: "anything", enabled: true }],
      ["room_scan_completed", { source: "webcam" }],
      [42, {}],
    ] as const) {
      await expect(svc.record(event, props, false)).rejects.toBeInstanceOf(AppError);
    }
    expect(await svc.totals()).toEqual({});
  });

  it("counts nothing for visitors who opted out (Global Privacy Control / Do Not Track), but still validates", async () => {
    const { svc } = make();
    expect(await svc.record("scenario_loaded", { preset_id: "gurugram" }, true)).toBe("ignored");
    expect(await svc.totals()).toEqual({});
    await expect(svc.record("page_view", {}, true)).rejects.toBeInstanceOf(AppError);
  });

  it("buckets by UTC day", async () => {
    const storage = createMemoryStorage(caps);
    let now = Date.UTC(2026, 10, 19, 23, 59);
    const svc = new AnalyticsService(storage.analytics, () => now);
    await svc.record("scenario_loaded", { preset_id: "live" }, false);
    now = Date.UTC(2026, 10, 20, 0, 1);
    await svc.record("scenario_loaded", { preset_id: "live" }, false);
    expect(await svc.totals("2026-11-19")).toEqual({ "scenario_loaded:preset=live": 1 });
    expect(await svc.totals("2026-11-20")).toEqual({ "scenario_loaded:preset=live": 1 });
  });
});

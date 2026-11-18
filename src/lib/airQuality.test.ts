import { describe, expect, it } from "vitest";
import { aqiToPm25, cigaretteEquivalent, findVentilationWindow, pm25ToAqi } from "./airQuality";
import { PRESET_SCENARIOS, buildDiurnalCurve } from "./airQualityPresets";
import { grapStageFromAqi } from "./grapRules";

describe("cigaretteEquivalent (Berkeley Earth)", () => {
  it("220 µg/m³ for 24 h is exactly 10 cigarettes", () => {
    expect(cigaretteEquivalent(220, 24)).toBeCloseTo(10, 10);
  });
  it("cutting 220 to 44 µg/m³ for 10 h saves 3.33 cigarettes", () => {
    expect(cigaretteEquivalent(220, 10) - cigaretteEquivalent(44, 10)).toBeCloseTo(3.33, 2);
  });
  it("returns 0 for non-positive inputs", () => {
    expect(cigaretteEquivalent(-5, 10)).toBe(0);
    expect(cigaretteEquivalent(50, 0)).toBe(0);
  });
});

describe("CPCB conversion", () => {
  it.each([
    [0, 0],
    [30, 50],
    [60, 100],
    [90, 200],
    [120, 300],
    [250, 400],
    [380, 500],
  ])("PM2.5 %i maps to AQI %i", (pm, aqi) => {
    expect(pm25ToAqi(pm)).toBe(aqi);
  });
  it("caps at 500 and handles negatives", () => {
    expect(pm25ToAqi(900)).toBe(500);
    expect(pm25ToAqi(-3)).toBe(0);
  });
  it("round-trips within rounding error", () => {
    for (const pm of [15, 75, 110, 200, 300]) {
      expect(Math.abs(aqiToPm25(pm25ToAqi(pm)) - pm)).toBeLessThan(2);
    }
  });
});

describe("GRAP stage boundaries", () => {
  it.each([
    [200, "NONE"],
    [201, "STAGE_1"],
    [300, "STAGE_1"],
    [301, "STAGE_2"],
    [400, "STAGE_2"],
    [401, "STAGE_3"],
    [450, "STAGE_3"],
    [451, "STAGE_4"],
  ])("AQI %i is %s", (aqi, stage) => {
    expect(grapStageFromAqi(aqi)).toBe(stage);
  });
  it("treats NaN as no stage", () => {
    expect(grapStageFromAqi(Number.NaN)).toBe("NONE");
  });
});

describe("findVentilationWindow", () => {
  it("finds the afternoon trough starting at 15:00 on every preset", () => {
    for (const s of PRESET_SCENARIOS) {
      const w = findVentilationWindow(s.hourly);
      expect(w.startHour).toBe(15);
      expect(w.endHour).toBe(16.5);
    }
  });
  it("reports a reduction of roughly half against the morning peak", () => {
    const w = findVentilationWindow(PRESET_SCENARIOS[0].hourly);
    expect(w.reductionVsMorningPct).toBeGreaterThan(40);
    expect(w.reductionVsMorningPct).toBeLessThan(60);
  });
  it("recommends normal ventilation when the trough is moderate", () => {
    expect(findVentilationWindow(PRESET_SCENARIOS[2].hourly).advice.mode).toBe("normal");
  });
  it("limits ventilation when the afternoon trough exceeds 250", () => {
    const w = findVentilationWindow(buildDiurnalCurve(520));
    expect(w.advice.mode).toBe("brief");
  });
  it("tells the user to stay sealed when every hour exceeds 300", () => {
    const flat = Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 340 }));
    const w = findVentilationWindow(flat);
    expect(w.advice.mode).toBe("sealed");
    expect(w.advice.minutes).toBe(5);
  });
  it("rejects a series that is not 24 hours", () => {
    expect(() => findVentilationWindow([{ hour: 0, pm25: 10 }])).toThrow(RangeError);
  });
});

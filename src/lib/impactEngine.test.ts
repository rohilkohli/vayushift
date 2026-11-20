import { describe, expect, it } from "vitest";
import {
  NO_INTERVENTIONS,
  calculateHouseholdImpact,
  clampMembers,
  fieldCadrM3h,
  modelIndoor,
  requiredCadrM3h,
  roomVolumeM3,
} from "./impactEngine";
import { PRESET_SCENARIOS } from "./airQualityPresets";
import { findVentilationWindow } from "./airQuality";
import { FILTERS, METRO_CO2_SAVED_G_PER_KM } from "./constants";
import type { HouseholdProfile } from "./types";

const profile: HouseholdProfile = {
  memberCount: 3,
  commuterCount: 1,
  walkerCount: 1,
  hasChildren: true,
  hasSeniors: false,
  hasRespiratoryCondition: false,
  roomAreaSqFt: 180,
  ceilingHeightFt: 10,
  windowType: "sliding_aluminum_unsealed",
  sleepNoiseSensitivity: "medium",
  commuteKmRoundTrip: 20,
  baselineCommuteMode: "private_petrol_car",
  baselineCookingFuel: "lpg_unvented",
};
const hourly = PRESET_SCENARIOS[0].hourly;

describe("room sizing", () => {
  it("180 sq ft x 10 ft is about 51 m³ and needs 255 m³/h for 5 ACH", () => {
    expect(roomVolumeM3(180, 10)).toBeCloseTo(50.97, 1);
    expect(requiredCadrM3h(roomVolumeM3(180, 10))).toBe(255);
  });
});

describe("indoor model", () => {
  const base = { outdoorPm25: 200, volumeM3: 51, profile, sealed: false } as const;
  it("indoor is below outdoor and falls with better filtration", () => {
    const none = modelIndoor({ ...base, filtration: "none" }).pm25;
    const fan = modelIndoor({ ...base, filtration: "single_merv13_fan" }).pm25;
    const cube = modelIndoor({ ...base, filtration: "quad_merv13_cr_box" }).pm25;
    expect(none).toBeLessThan(200);
    expect(cube).toBeLessThan(fan);
    expect(fan).toBeLessThan(none);
  });
  it("sealing reduces indoor PM2.5", () => {
    const open = modelIndoor({ ...base, filtration: "none" }).pm25;
    const sealed = modelIndoor({ ...base, filtration: "none", sealed: true }).pm25;
    expect(sealed).toBeLessThan(open);
  });
  it("modelled reductions stay near published results for a ~50 m³ room", () => {
    const none = modelIndoor({ ...base, filtration: "none" }).pm25;
    for (const f of Object.values(FILTERS)) {
      const c = modelIndoor({ ...base, filtration: f.id }).pm25;
      const reduction = (1 - c / none) * 100;
      expect(Math.abs(reduction - f.literatureReductionPct)).toBeLessThan(15);
    }
  });
  it("a bigger room dilutes filter benefit", () => {
    const small = modelIndoor({ ...base, volumeM3: 40, filtration: "quad_merv13_cr_box" }).pm25;
    const big = modelIndoor({ ...base, volumeM3: 150, filtration: "quad_merv13_cr_box" }).pm25;
    expect(big).toBeGreaterThan(small);
  });
  it("field CADR is derated below nominal", () => {
    expect(fieldCadrM3h("quad_merv13_cr_box")).toBeLessThan(FILTERS.quad_merv13_cr_box.nominalCadrM3h);
    expect(fieldCadrM3h("none")).toBe(0);
  });
});

describe("calculateHouseholdImpact", () => {
  it("returns zero impact when nothing is switched on", () => {
    const r = calculateHouseholdImpact(hourly, profile, NO_INTERVENTIONS);
    expect(r.avoidedCigarettesHouseholdDay).toBe(0);
    expect(r.savedCo2GramsDay).toBe(0);
    expect(r.indoorReductionPct).toBe(0);
  });
  it("metro switch saves 32.4 g CO2 per km: 20 km is 648 g", () => {
    const r = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, switchCommuteToMetroN95: true });
    expect(r.savedCo2GramsDay).toBe(20 * METRO_CO2_SAVED_G_PER_KM);
    expect(r.savedCo2GramsDay).toBe(648);
  });
  it("CO2 scales with the number of commuters", () => {
    const r = calculateHouseholdImpact(hourly, { ...profile, commuterCount: 2 }, { ...NO_INTERVENTIONS, switchCommuteToMetroN95: true });
    expect(r.savedCo2GramsDay).toBe(1296);
  });
  it("each intervention adds a non-negative contribution", () => {
    const keys = [
      { shiftWalkToTrough: true },
      { purgeAtTrough: true },
      { filtrationMode: "quad_merv13_cr_box" as const },
      { sealWindowsWithEpdm: true },
      { switchToInduction: true },
      { switchCommuteToMetroN95: true },
    ];
    for (const k of keys) {
      const r = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, ...k });
      expect(r.avoidedCigarettesHouseholdDay).toBeGreaterThan(0);
      expect(r.components.every((c) => c.avoidedCigarettes >= 0)).toBe(true);
    }
  });
  it("combined interventions beat any single one", () => {
    const all = calculateHouseholdImpact(hourly, profile, {
      shiftWalkToTrough: true,
      purgeAtTrough: true,
      sealWindowsWithEpdm: true,
      filtrationMode: "quad_merv13_cr_box",
      switchToInduction: true,
      switchCommuteToMetroN95: true,
    });
    const one = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, filtrationMode: "quad_merv13_cr_box" });
    expect(all.avoidedCigarettesHouseholdDay).toBeGreaterThan(one.avoidedCigarettesHouseholdDay);
    expect(all.indoorReductionPct).toBeGreaterThan(60);
  });
  it("per-person is household divided by members", () => {
    const r = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, filtrationMode: "commercial_h13_hepa" });
    expect(r.avoidedCigarettesPerPersonDay).toBeCloseTo(r.avoidedCigarettesHouseholdDay / 3, 1);
  });
  it("season total is 90 x daily", () => {
    const r = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, filtrationMode: "quad_merv13_cr_box" });
    expect(r.avoidedCigarettesSeason90Days).toBeCloseTo(r.avoidedCigarettesHouseholdDay * 90, 0);
  });
  it("is deterministic", () => {
    const on = { ...NO_INTERVENTIONS, filtrationMode: "quad_merv13_cr_box" as const, shiftWalkToTrough: true };
    expect(calculateHouseholdImpact(hourly, profile, on)).toEqual(calculateHouseholdImpact(hourly, profile, on));
  });
  it("clamps household size to 1-15", () => {
    expect(clampMembers(0)).toBe(1);
    expect(clampMembers(99)).toBe(15);
    expect(clampMembers(Number.NaN)).toBe(3);
    expect(clampMembers(4.6)).toBe(5);
  });
  it("cleaner air gives smaller savings than severe smog", () => {
    const on = { ...NO_INTERVENTIONS, filtrationMode: "quad_merv13_cr_box" as const };
    const severe = calculateHouseholdImpact(PRESET_SCENARIOS[0].hourly, profile, on);
    const mild = calculateHouseholdImpact(PRESET_SCENARIOS[2].hourly, profile, on);
    expect(mild.avoidedCigarettesHouseholdDay).toBeLessThan(severe.avoidedCigarettesHouseholdDay);
  });
  it("walk shift credits both the cleaner hour and the N95 mask", () => {
    const w = findVentilationWindow(hourly);
    const r = calculateHouseholdImpact(hourly, profile, { ...NO_INTERVENTIONS, shiftWalkToTrough: true }, w);
    const walk = r.components.find((c) => c.key === "walk")!;
    const expected = ((w.morningPeakMeanPm25 - w.meanPm25 * 0.15) / 22) * (0.75 / 24);
    expect(walk.avoidedCigarettes).toBeCloseTo(expected, 2);
  });
});

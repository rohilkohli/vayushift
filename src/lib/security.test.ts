import { describe, expect, it } from "vitest";
import { checkImagePayload, parseCoords, sniffImageType } from "./validation";
import { validateRoomScan, SAMPLE_ROOMS } from "./roomScan";
import { allowedNumbers, narrativeUsesOnlyAllowedNumbers, templateExplanation } from "./explain";
import { NO_INTERVENTIONS, calculateHouseholdImpact } from "./impactEngine";
import { PRESET_SCENARIOS } from "./airQualityPresets";
import { buildAdvisory, heaterPlan } from "./rwa";

const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");

describe("parseCoords", () => {
  it("rounds to 3 decimals", () => {
    expect(parseCoords(28.613912, 77.209041)).toEqual({ lat: 28.614, lng: 77.209 });
  });
  it.each([[91, 0], [0, 181], ["x", 1], [Number.NaN, 1], [null, undefined]])("rejects %s,%s", (a, b) => {
    expect(parseCoords(a, b)).toBeNull();
  });
});

describe("image checks", () => {
  it("accepts a real PNG signature", () => {
    expect(checkImagePayload("image/png", PNG_B64).ok).toBe(true);
  });
  it("rejects a disallowed MIME type", () => {
    expect(checkImagePayload("image/svg+xml", PNG_B64).ok).toBe(false);
  });
  it("rejects bytes that are not an image even with a valid MIME claim", () => {
    const text = Buffer.from("<script>alert(1)</script>").toString("base64");
    expect(checkImagePayload("image/png", text).ok).toBe(false);
  });
  it("rejects malformed base64 and oversized payloads", () => {
    expect(checkImagePayload("image/png", "not base64!!").ok).toBe(false);
    expect(checkImagePayload("image/png", "A".repeat(8 * 1024 * 1024)).ok).toBe(false);
  });
  it("sniffs jpeg and webp", () => {
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
  });
});


describe("validateRoomScan", () => {
  const good = { ...SAMPLE_ROOMS[0].scan, cookingApplianceDetected: "lpg_gas_stove" };
  it("accepts a valid scan and maps the LPG label", () => {
    const s = validateRoomScan(good);
    expect(s?.cookingApplianceDetected).toBe("lpg_unvented");
  });
  it("clamps implausible dimensions", () => {
    const s = validateRoomScan({ ...good, estimatedAreaSqFt: 99999, estimatedCeilingHeightFt: 1 });
    expect(s?.estimatedAreaSqFt).toBe(800);
    expect(s?.estimatedCeilingHeightFt).toBe(7);
  });
  it("rejects bad enums, missing fields and non-objects", () => {
    expect(validateRoomScan({ ...good, windowType: "glass_palace" })).toBeNull();
    expect(validateRoomScan({ ...good, isIndoorRoom: "yes" })).toBeNull();
    expect(validateRoomScan(null)).toBeNull();
    expect(validateRoomScan("hi")).toBeNull();
  });
  it("strips markup and limits free text (prompt-injection hardening)", () => {
    const s = validateRoomScan({ ...good, infiltrationRiskNotes: ["<img src=x onerror=1>" + "a".repeat(500)], recommendedPlacementSpot: "<b>x</b>" });
    expect(s?.infiltrationRiskNotes[0]).not.toContain("<");
    expect(s?.infiltrationRiskNotes[0].length).toBeLessThanOrEqual(120);
    expect(s?.recommendedPlacementSpot).not.toContain("<");
  });
});

describe("narrative guard", () => {
  const receipt = calculateHouseholdImpact(PRESET_SCENARIOS[0].hourly, {
    memberCount: 3, commuterCount: 1, walkerCount: 1, hasVulnerableMembers: true, roomAreaSqFt: 180,
    ceilingHeightFt: 10, windowType: "sliding_aluminum_unsealed", sleepNoiseSensitivity: "medium",
    commuteKmRoundTrip: 20, baselineCommuteMode: "private_petrol_car", baselineCookingFuel: "lpg_unvented",
  }, { ...NO_INTERVENTIONS, switchCommuteToMetroN95: true });
  const allowed = allowedNumbers(receipt);
  it("accepts text using only engine numbers", () => {
    expect(narrativeUsesOnlyAllowedNumbers(`The metro saves ${receipt.savedCo2GramsDay} g of CO2 today.`, allowed)).toBe(true);
  });
  it("rejects invented statistics", () => {
    expect(narrativeUsesOnlyAllowedNumbers("This cuts your risk of asthma by 37%.", allowed)).toBe(false);
  });
  it("template fallback only uses allowed numbers", () => {
    expect(narrativeUsesOnlyAllowedNumbers(templateExplanation(receipt), allowed)).toBe(true);
  });
  it("template handles the empty state", () => {
    const none = calculateHouseholdImpact(PRESET_SCENARIOS[0].hourly, { ...SAMPLE_PROFILE }, NO_INTERVENTIONS);
    expect(templateExplanation(none)).toMatch(/Switch on/);
  });
});
const SAMPLE_PROFILE = {
  memberCount: 3, commuterCount: 1, walkerCount: 1, hasVulnerableMembers: false, roomAreaSqFt: 180,
  ceilingHeightFt: 10, windowType: "sliding_aluminum_unsealed" as const, sleepNoiseSensitivity: "low" as const,
  commuteKmRoundTrip: 20, baselineCommuteMode: "private_petrol_car" as const, baselineCookingFuel: "lpg_unvented" as const,
};


describe("RWA tools", () => {
  it("4 heaters for 100 flats is Rs 6,400 total and Rs 64 per flat", () => {
    expect(heaterPlan(100, 4)).toEqual({ totalCostInr: 6400, perFlatInr: 64 });
  });
  it("clamps nonsense input", () => {
    expect(heaterPlan(0, -3)).toEqual({ totalCostInr: 0, perFlatInr: 0 });
  });
  it("produces English and Hindi advisories", () => {
    const a = buildAdvisory({ stage: "STAGE_3", aqi: 432, locationName: "Anand Vihar", flats: 100, guards: 4 });
    expect(a.en).toContain("Stage III");
    expect(a.en).toContain("Rs 64 per flat");
    expect(a.hi).toContain("चरण III");
    expect(a.combined).toContain(a.hi);
  });
});

import { compareFilters } from "./impactEngine";
import { vehicleRestricted } from "./grapRules";
import { parseHourly, parseInterventions, parseProfile } from "./requestSchemas";

describe("compareFilters", () => {
  it("ranks cube above fan and meets the 5 ACH target for a 180 sq ft room", () => {
    const out = compareFilters(PRESET_SCENARIOS[0].hourly, SAMPLE_PROFILE, false);
    const by = Object.fromEntries(out.map((o) => [o.id, o]));
    expect(by.quad_merv13_cr_box.modelledReductionPct).toBeGreaterThan(by.single_merv13_fan.modelledReductionPct);
    expect(by.quad_merv13_cr_box.meetsTargetAch).toBe(true);
    expect(by.single_merv13_fan.meetsTargetAch).toBe(false);
  });
});

describe("vehicleRestricted", () => {
  it("restricts old petrol and BS-IV diesel only from Stage III", () => {
    expect(vehicleRestricted("STAGE_2", "petrol_bs3")).toBe(false);
    expect(vehicleRestricted("STAGE_3", "petrol_bs3")).toBe(true);
    expect(vehicleRestricted("STAGE_4", "diesel_bs4")).toBe(true);
    expect(vehicleRestricted("STAGE_4", "cng_ev")).toBe(false);
  });
});

describe("request schemas", () => {
  it("accepts a valid household and rejects out-of-range or unknown values", () => {
    expect(parseProfile(SAMPLE_PROFILE)).not.toBeNull();
    expect(parseProfile({ ...SAMPLE_PROFILE, roomAreaSqFt: 1e9 })).toBeNull();
    expect(parseProfile({ ...SAMPLE_PROFILE, windowType: "x" })).toBeNull();
    expect(parseProfile(null)).toBeNull();
  });
  it("requires exactly 24 finite hourly values", () => {
    expect(parseHourly(PRESET_SCENARIOS[0].hourly.map((h) => h.pm25))).toHaveLength(24);
    expect(parseHourly([1, 2, 3])).toBeNull();
    expect(parseHourly(Array(24).fill("a"))).toBeNull();
    expect(parseHourly(Array(24).fill(-1))).toBeNull();
  });
  it("validates interventions", () => {
    expect(parseInterventions({ filtrationMode: "none" })).not.toBeNull();
    expect(parseInterventions({ filtrationMode: "bogus" })).toBeNull();
  });
});

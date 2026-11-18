import { describe, expect, it } from "vitest";
import { RateLimiter, checkImagePayload, parseCoords, sniffImageType } from "./validation";
import { validateRoomScan, SAMPLE_ROOMS } from "./roomScan";
import { allowedNumbers, narrativeUsesOnlyAllowedNumbers, templateExplanation } from "./explain";
import { NO_INTERVENTIONS, calculateHouseholdImpact } from "./impactEngine";
import { PRESET_SCENARIOS } from "./airQualityPresets";
import { parseForecast } from "./liveAirQuality";
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

describe("RateLimiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.allow("a", 0)).toBe(true);
    expect(rl.allow("a", 1)).toBe(true);
    expect(rl.allow("a", 2)).toBe(false);
    expect(rl.allow("b", 2)).toBe(true);
    expect(rl.allow("a", 1500)).toBe(true);
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

describe("parseForecast", () => {
  const mk = (n: number) => ({
    hourlyForecasts: Array.from({ length: n }, (_, i) => ({
      dateTime: new Date(Date.UTC(2026, 10, 18, i, 30)).toISOString(),
      pollutants: [{ code: "pm25", concentration: { value: 100 + i } }],
    })),
  });
  it("builds a 24-slot series", () => {
    const out = parseForecast(mk(24));
    expect(out).toHaveLength(24);
    expect(out!.every((h) => h.pm25 >= 100)).toBe(true);
  });
  it("fills gaps when at least 12 hours are present", () => {
    expect(parseForecast(mk(14))).toHaveLength(24);
  });
  it("returns null for sparse or malformed bodies", () => {
    expect(parseForecast(mk(5))).toBeNull();
    expect(parseForecast({})).toBeNull();
    expect(parseForecast(null)).toBeNull();
  });
});

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

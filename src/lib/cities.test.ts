import { describe, expect, it } from "vitest";
import { CITIES, cityById } from "./cities";
import { isDelhiNcr } from "./grapRules";
import { en } from "./i18n/en";
import { hi } from "./i18n/hi";
import { parseCoords } from "./validation";

describe("city list", () => {
  it("has unique ids and unique names", () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    expect(new Set(CITIES.map((c) => c.name)).size).toBe(CITIES.length);
  });
  it("covers the cities the problem statement names, plus other large ones", () => {
    for (const id of ["delhi", "mumbai", "kolkata", "noida"]) expect(cityById(id), id).toBeDefined();
    expect(CITIES.length).toBeGreaterThanOrEqual(10);
  });
  it("keeps every city inside India and accepted by the API's coordinate check", () => {
    for (const c of CITIES) {
      expect(c.lat, c.id).toBeGreaterThan(6);
      expect(c.lat, c.id).toBeLessThan(37);
      expect(c.lng, c.id).toBeGreaterThan(68);
      expect(c.lng, c.id).toBeLessThan(98);
      expect(parseCoords(String(c.lat), String(c.lng)), c.id).not.toBeNull();
    }
  });
  it("has an English and a Hindi display name for every city", () => {
    for (const c of CITIES) {
      expect(en.cityName[c.id], c.id).toBeTruthy();
      expect(hi.cityName[c.id], c.id).toMatch(/[ऀ-ॿ]/);
    }
  });
  it("returns undefined for an unknown id", () => expect(cityById("atlantis")).toBeUndefined());
});

describe("isDelhiNcr", () => {
  it("is true for the NCR cities and false for the rest", () => {
    for (const id of ["delhi", "noida", "gurugram"]) {
      const c = cityById(id)!;
      expect(isDelhiNcr(c.lat, c.lng), id).toBe(true);
    }
    for (const id of ["mumbai", "kolkata", "chennai", "bengaluru", "lucknow", "jaipur"]) {
      const c = cityById(id)!;
      expect(isDelhiNcr(c.lat, c.lng), id).toBe(false);
    }
  });
});

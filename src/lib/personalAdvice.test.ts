import { describe, expect, it } from "vitest";
import { buildDiurnalCurve } from "./airQualityPresets";
import { pm25ToAqi } from "./airQuality";
import { ACTIVITY_LIMITS, LIMITED_ACTIVITY_MINUTES, bestOutingHour, groupsFor, levelFor, personalAdvice } from "./personalAdvice";

const none = { hasChildren: false, hasSeniors: false, hasRespiratoryCondition: false };
const flat = (pm: number) => Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: pm }));

describe("levelFor", () => {
  it("is stricter for sensitive groups than for healthy adults at the same AQI", () => {
    expect(levelFor(120, "adults")).toBe("ok");
    expect(levelFor(120, "children")).toBe("limit");
    expect(levelFor(180, "seniors")).toBe("indoors");
    expect(levelFor(180, "adults")).toBe("ok");
  });
  it("switches exactly at the documented limits", () => {
    const s = ACTIVITY_LIMITS.sensitive;
    expect(levelFor(s.okUpTo, "respiratory")).toBe("ok");
    expect(levelFor(s.okUpTo + 1, "respiratory")).toBe("limit");
    expect(levelFor(s.limitUpTo, "respiratory")).toBe("limit");
    expect(levelFor(s.limitUpTo + 1, "respiratory")).toBe("indoors");
    const a = ACTIVITY_LIMITS.adults;
    expect(levelFor(a.okUpTo + 1, "adults")).toBe("limit");
    expect(levelFor(a.limitUpTo + 1, "adults")).toBe("indoors");
  });
  it("keeps limited activity short", () => expect(LIMITED_ACTIVITY_MINUTES).toBe(30));
});

describe("groupsFor", () => {
  it("always includes healthy adults, and only the sensitive groups that are selected", () => {
    expect(groupsFor(none)).toEqual(["adults"]);
    expect(groupsFor({ hasChildren: true, hasSeniors: false, hasRespiratoryCondition: true })).toEqual([
      "children",
      "respiratory",
      "adults",
    ]);
  });
});

describe("bestOutingHour", () => {
  it("finds the cleanest daytime hour, ignoring a cleaner night", () => {
    const hourly = flat(200);
    hourly[3].pm25 = 10; // night: not an outing hour
    hourly[15].pm25 = 60;
    expect(bestOutingHour(hourly)).toEqual({ hour: 15, aqi: pm25ToAqi(60) });
  });
  it("prefers the earlier hour on a tie", () => expect(bestOutingHour(flat(80)).hour).toBe(6));
});

describe("personalAdvice", () => {
  const severe = buildDiurnalCurve(285);
  it("tells a family with a child to stay in at the peak, and when the best time is", () => {
    const a = personalAdvice(severe, 8, { ...none, hasChildren: true });
    const child = a.groups.find((g) => g.group === "children")!;
    expect(child.nowLevel).toBe("indoors");
    expect(child.bestHour).toBeGreaterThanOrEqual(12);
    expect(child.bestHour).toBeLessThanOrEqual(17);
    expect(child.bestAqi).toBeLessThan(child.nowAqi);
  });
  it("gives different advice to different households in the same air", () => {
    const air = flat(80); // AQI about 166: above the sensitive limit (150), below the adult one (200)
    const family = personalAdvice(air, 12, { ...none, hasChildren: true, hasSeniors: true });
    const adult = personalAdvice(air, 12, none);
    expect(family.groups.find((g) => g.group === "children")!.nowLevel).toBe("indoors");
    expect(adult.groups.find((g) => g.group === "adults")!.nowLevel).toBe("ok");
  });
  it("advises a mask only when even the best hour is not clean enough", () => {
    expect(personalAdvice(flat(20), 12, { ...none, hasChildren: true }).groups[0].mask).toBe(false);
    expect(personalAdvice(flat(200), 12, { ...none, hasChildren: true }).groups[0].mask).toBe(true);
  });
  it("shortens airing for a household with a sensitive member when the window is still polluted", () => {
    const afternoonLow = buildDiurnalCurve(190); // window mean is moderate, mode stays normal
    const withChild = personalAdvice(afternoonLow, 12, { ...none, hasChildren: true });
    const adultsOnly = personalAdvice(afternoonLow, 12, none);
    expect(adultsOnly.shortenAiringTo).toBeNull();
    expect(withChild.windowAqi).toBeGreaterThan(100);
    expect(withChild.shortenAiringTo).toBe(10);
  });
  it("does not shorten airing when the air is already clean", () => {
    expect(personalAdvice(flat(20), 12, { ...none, hasChildren: true }).shortenAiringTo).toBeNull();
  });
  it("clamps an out-of-range hour instead of crashing", () => {
    expect(() => personalAdvice(flat(50), 99, none)).not.toThrow();
    expect(() => personalAdvice(flat(50), -3, none)).not.toThrow();
  });
});

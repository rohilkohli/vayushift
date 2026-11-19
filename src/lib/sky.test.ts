import { describe, expect, it } from "vitest";
import { isNightHour, luminance, skyForHour } from "./skyPalette";
import { PHASE_LABEL, phaseForHour } from "./skyPhase";

const WINDOW = { startHour: 15, endHour: 16.5 };

describe("skyForHour", () => {
  it("keeps the stops behind the hero text dark enough for white copy (4.5:1) at every half hour", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const s = skyForHour(h);
      for (const stop of s.stops.slice(0, 3)) expect(luminance(stop)).toBeLessThanOrEqual(0.183);
    }
  });
  it("returns seven valid hex stops", () => {
    for (const stop of skyForHour(12).stops) expect(stop).toMatch(/^#[0-9a-f]{6}$/);
    expect(skyForHour(12).stops).toHaveLength(7);
  });
  it("blends smoothly: no stop jumps abruptly between adjacent hours", () => {
    const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    for (let h = 0; h < 23; h++) {
      const a = skyForHour(h).stops;
      const b = skyForHour(h + 1).stops;
      a.forEach((stop, s) => {
        for (let c = 0; c < 3; c++) expect(Math.abs(channel(stop, c) - channel(b[s], c))).toBeLessThan(70);
      });
    }
  });
  it("wraps 24 to midnight", () => {
    expect(skyForHour(24).stops).toEqual(skyForHour(0).stops);
  });
  it("moves the sun along an arc: low at the ends, highest around midday", () => {
    expect(skyForHour(0).sunY).toBeCloseTo(62, 0);
    expect(skyForHour(11.5).sunY).toBeLessThan(skyForHour(0).sunY);
    expect(skyForHour(11.5).sunY).toBeCloseTo(18, 0);
    expect(skyForHour(20).sunX).toBeGreaterThan(skyForHour(8).sunX);
  });
  it("flags night from 21:00 to 04:59 only", () => {
    expect([20, 21, 23, 0, 4, 5, 6, 12].map(isNightHour)).toEqual([false, true, true, true, true, false, false, false]);
    expect(skyForHour(22).night).toBe(true);
    expect(skyForHour(15).night).toBe(false);
  });
  it("speeds the wind up in the afternoon mixing window", () => {
    expect(skyForHour(15).windSpeed).toBeGreaterThan(skyForHour(9).windSpeed * 2);
  });
});

describe("phaseForHour", () => {
  it.each([
    [15, "window"],
    [16, "window"],
    [17, "transition"],
    [8, "morning"],
    [10, "morning"],
    [11, "transition"],
    [21, "night"],
    [3, "night"],
  ])("hour %i is %s", (hour, phase) => {
    expect(phaseForHour(hour, WINDOW)).toBe(phase);
  });
  it("follows a forecast window that is not at 15:00", () => {
    expect(phaseForHour(13, { startHour: 13, endHour: 14.5 })).toBe("window");
    expect(phaseForHour(15, { startHour: 13, endHour: 14.5 })).toBe("transition");
  });
  it("has a label for every phase", () => {
    expect(Object.keys(PHASE_LABEL).sort()).toEqual(["morning", "night", "transition", "window"]);
  });
});

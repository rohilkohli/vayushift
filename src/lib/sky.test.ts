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
  it("moves the sun along an arc: low at sunrise and sunset, highest at noon, travelling left to right", () => {
    expect(skyForHour(12).sun.y).toBeCloseTo(16, 0);
    expect(skyForHour(6).sun.y).toBeCloseTo(72, 0);
    expect(skyForHour(18).sun.y).toBeCloseTo(72, 0);
    expect(skyForHour(9).sun.x).toBeLessThan(skyForHour(12).sun.x);
    expect(skyForHour(12).sun.x).toBeLessThan(skyForHour(16).sun.x);
  });
  it("hands over to the moon: it is high at midnight and travels left to right", () => {
    expect(skyForHour(0).moon.y).toBeCloseTo(16, 0);
    expect(skyForHour(20).moon.x).toBeLessThan(skyForHour(0).moon.x);
    expect(skyForHour(0).moon.x).toBeLessThan(skyForHour(4).moon.x);
  });
  it("shows the sun by day only and the moon by night only, with a smooth overlap at the horizon", () => {
    expect(skyForHour(12).sun.opacity).toBe(1);
    expect(skyForHour(12).moon.opacity).toBe(0);
    expect(skyForHour(0).moon.opacity).toBe(1);
    expect(skyForHour(0).sun.opacity).toBe(0);
    // Dawn and dusk: one fades out while the other fades in, never both fully off.
    for (const h of [5.5, 6, 6.5, 18, 18.5, 19]) {
      const s = skyForHour(h);
      expect(s.sun.opacity + s.moon.opacity).toBeGreaterThan(0.05);
    }
  });
  it("fades stars in after dusk and out before dawn, and keeps them out of the day", () => {
    expect(skyForHour(0).stars).toBe(1);
    expect(skyForHour(12).stars).toBe(0);
    expect(skyForHour(19.5).stars).toBeGreaterThan(0);
    expect(skyForHour(19.5).stars).toBeLessThan(1);
    expect(skyForHour(22).stars).toBeGreaterThan(skyForHour(19.5).stars);
    expect(skyForHour(5).stars).toBeGreaterThan(skyForHour(5.8).stars);
  });
  it("brings clouds and birds out by day and not at night", () => {
    expect(skyForHour(12).day).toBe(1);
    expect(skyForHour(0).day).toBe(0);
    expect(skyForHour(23).day).toBe(0);
  });
  it("changes every scene value gradually: no step between adjacent half hours exceeds 0.45", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const a = skyForHour(h);
      const b = skyForHour(h + 0.5);
      for (const [x, y] of [
        [a.sun.opacity, b.sun.opacity],
        [a.moon.opacity, b.moon.opacity],
        [a.stars, b.stars],
        [a.day, b.day],
      ]) {
        expect(Math.abs(x - y)).toBeLessThan(0.45);
      }
    }
  });
  it("tints clouds with the light: white at noon, warmer at sunset, dim at night", () => {
    expect(skyForHour(12).cloud).toBe("#ffffff");
    expect(luminance(skyForHour(0).cloud)).toBeLessThan(luminance(skyForHour(18).cloud));
    expect(luminance(skyForHour(18).cloud)).toBeLessThan(luminance(skyForHour(12).cloud));
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

import { describe, expect, it } from "vitest";
import { buildDiurnalCurve } from "./airQualityPresets";
import { findVentilationWindow } from "./airQuality";
import { BOTTOM, LEFT, RIGHT, TOP, horizonGeometry, pct, smoothPath } from "./horizonGeometry";

const hourly = buildDiurnalCurve(285);
const window = findVentilationWindow(hourly);
const indoor = hourly.map((h) => h.pm25 * 0.5);

describe("smoothPath", () => {
  it("starts at the first point and ends at the last", () => {
    const d = smoothPath([
      [0, 10],
      [50, 40],
      [100, 20],
    ]);
    expect(d.startsWith("M0.0,10.0")).toBe(true);
    expect(d.endsWith("100.0,20.0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });
});

describe("horizonGeometry", () => {
  const g = horizonGeometry(hourly, indoor, window, 8);
  it("places the first and last hour on the plot edges", () => {
    expect(g.x(0)).toBe(LEFT);
    expect(g.x(23)).toBe(RIGHT);
  });
  it("puts higher pollution higher on the chart, inside the plot area", () => {
    expect(g.outY).toBeGreaterThanOrEqual(TOP);
    expect(g.outY).toBeLessThanOrEqual(BOTTOM);
    expect(g.inY).toBeGreaterThan(g.outY); // indoor is lower, so further down
  });
  it("reports the readings at the selected hour", () => {
    expect(g.outNow).toBe(hourly[8].pm25);
    expect(g.inNow).toBe(indoor[8]);
    expect(g.cursorX).toBe(g.x(8));
  });
  it("sizes the low-smog band from the window's hours", () => {
    expect(g.bandW).toBeCloseTo(((window.endHour - window.startHour) / 23) * (RIGHT - LEFT));
    expect(g.bandX).toBeGreaterThan(LEFT);
  });
  it("closes the filled area along the baseline", () => expect(g.area.endsWith(`L${RIGHT},${BOTTOM} L${LEFT},${BOTTOM} Z`)).toBe(true));
});

describe("pct", () => {
  it("expresses a position as a percentage of the box", () => expect(pct(450, 900)).toBe("50%"));
});

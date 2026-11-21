import type { HourlyAir, VentilationWindow } from "./types";

/** The chart is drawn in a 900 x 140 box; the plot area sits inside these margins. */
export const W = 900;
export const H = 140;
export const LEFT = 20;
export const RIGHT = 880;
export const TOP = 18;
export const BOTTOM = 112;
export const TICKS = [0, 4, 8, 12, 16, 20, 23];

/** The y-axis always reaches at least this PM2.5, so a clean day does not look dramatic. */
const MIN_AXIS_PM25 = 360;

type Point = [number, number];

/** Smooth Catmull-Rom curve through the points, as an SVG path. */
export function smoothPath(pts: Point[]): string {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** A position inside the box, as a percentage of its width or height (for absolutely positioned overlays). */
export const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** Everything the horizon chart needs to draw, computed from the data and the selected hour. */
export function horizonGeometry(hourly: HourlyAir[], indoor: number[], w: VentilationWindow, hour: number) {
  const maxPm = Math.max(MIN_AXIS_PM25, Math.max(...hourly.map((h) => h.pm25)) * 1.05);
  const x = (i: number) => LEFT + (i / 23) * (RIGHT - LEFT);
  const y = (pm: number) => BOTTOM - (Math.min(maxPm, pm) / maxPm) * (BOTTOM - TOP);
  const outLine = smoothPath(hourly.map((h, i): Point => [x(i), y(h.pm25)]));
  const inLine = smoothPath(indoor.map((v, i): Point => [x(i), y(v)]));
  const outNow = hourly[hour].pm25;
  const inNow = indoor[hour];
  return {
    x,
    outLine,
    inLine,
    area: `${outLine} L${RIGHT},${BOTTOM} L${LEFT},${BOTTOM} Z`,
    bandX: LEFT + (w.startHour / 23) * (RIGHT - LEFT),
    bandW: ((w.endHour - w.startHour) / 23) * (RIGHT - LEFT),
    cursorX: x(hour),
    outNow,
    inNow,
    outY: y(outNow),
    inY: y(inNow),
  };
}

export type HorizonGeometry = ReturnType<typeof horizonGeometry>;

import {
  CIGARETTE_PM25_UG_M3,
  CPCB_PM25_BREAKPOINTS,
  MORNING_PEAK_END,
  MORNING_PEAK_START,
  VENT_BRIEF_ABOVE_PM25,
  VENT_DAY_END,
  VENT_DAY_START,
  VENT_SEALED_ABOVE_PM25,
  VENT_WINDOW_HOURS,
} from "./constants";
import type { HourlyAir, VentilationAdvice, VentilationWindow } from "./types";

const round = (n: number, dp = 1) => Number(n.toFixed(dp));

/** Berkeley Earth: cigarettes = PM2.5 / 22 x hours / 24. */
export function cigaretteEquivalent(pm25: number, hours: number): number {
  if (pm25 <= 0 || hours <= 0) return 0;
  return (pm25 / CIGARETTE_PM25_UG_M3) * (hours / 24);
}

/** CPCB piecewise-linear PM2.5 (µg/m³) to AQI. Values above the table extrapolate on the top band, capped at 500. */
export function pm25ToAqi(pm25: number): number {
  const pm = Math.max(0, pm25);
  const band =
    CPCB_PM25_BREAKPOINTS.find((b) => pm <= b.pmHi) ??
    CPCB_PM25_BREAKPOINTS[CPCB_PM25_BREAKPOINTS.length - 1];
  const t = (Math.min(pm, band.pmHi) - band.pmLo) / (band.pmHi - band.pmLo);
  return Math.round(band.aqiLo + t * (band.aqiHi - band.aqiLo));
}

/** Inverse of pm25ToAqi, clamped to 0-500. */
export function aqiToPm25(aqi: number): number {
  const a = Math.min(500, Math.max(0, aqi));
  const band =
    CPCB_PM25_BREAKPOINTS.find((b) => a <= b.aqiHi) ??
    CPCB_PM25_BREAKPOINTS[CPCB_PM25_BREAKPOINTS.length - 1];
  const t = (a - band.aqiLo) / (band.aqiHi - band.aqiLo);
  return round(band.pmLo + t * (band.pmHi - band.pmLo));
}

/** Linear interpolation of an hourly series at fractional hour h (0-23). */
export function valueAt(hourly: readonly HourlyAir[], h: number): number {
  const lo = Math.min(23, Math.max(0, Math.floor(h)));
  const hi = Math.min(23, lo + 1);
  const frac = h - lo;
  return hourly[lo].pm25 * (1 - frac) + hourly[hi].pm25 * frac;
}

/** Time-weighted mean over [start, end] (hours) using 6-minute steps. */
export function meanBetween(hourly: readonly HourlyAir[], start: number, end: number): number {
  const step = 0.1;
  let sum = 0;
  let n = 0;
  for (let h = start; h <= end + 1e-9; h += step) {
    sum += valueAt(hourly, h);
    n += 1;
  }
  return sum / n;
}

export function ventilationAdvice(troughMean: number, dayMin: number): VentilationAdvice {
  if (dayMin > VENT_SEALED_ABOVE_PM25) {
    return {
      mode: "sealed",
      minutes: 5,
      headline: "Outdoor air stays above 300 µg/m³ all day. Keep windows shut; crack one for 5 minutes only if the room feels stuffy, then run filtration on high.",
    };
  }
  if (troughMean > VENT_BRIEF_ABOVE_PM25) {
    return {
      mode: "brief",
      minutes: 10,
      headline: "Even the afternoon low is above 250 µg/m³. Limit fresh air to 10 minutes, then run filtration on high.",
    };
  }
  return {
    mode: "normal",
    minutes: 15,
    headline: "Open windows for 15 minutes inside the afternoon window, then close up.",
  };
}

/**
 * Finds the daytime 90-minute window with the lowest mean PM2.5, compares it
 * with the 07:00-10:00 morning peak and attaches a safety-aware recommendation.
 */
export function findVentilationWindow(hourly: readonly HourlyAir[]): VentilationWindow {
  if (hourly.length !== 24) throw new RangeError("hourly series must have 24 entries");
  let bestStart = VENT_DAY_START;
  let bestMean = Infinity;
  for (let s = VENT_DAY_START; s + VENT_WINDOW_HOURS <= VENT_DAY_END + 1e-9; s += 0.5) {
    const m = meanBetween(hourly, s, s + VENT_WINDOW_HOURS);
    if (m < bestMean) {
      bestMean = m;
      bestStart = s;
    }
  }
  const morning = meanBetween(hourly, MORNING_PEAK_START, MORNING_PEAK_END);
  const dayMin = Math.min(...hourly.map((h) => h.pm25));
  return {
    startHour: bestStart,
    endHour: bestStart + VENT_WINDOW_HOURS,
    meanPm25: round(bestMean),
    morningPeakMeanPm25: round(morning),
    reductionVsMorningPct: morning > 0 ? round(((morning - bestMean) / morning) * 100) : 0,
    advice: ventilationAdvice(bestMean, dayMin),
  };
}

export function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

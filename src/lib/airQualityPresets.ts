import type { AirScenario, HourlyAir } from "./types";

/**
 * Winter diurnal shape (index = local hour): morning peak ~08:00, deep
 * afternoon trough ~15:00-16:00, second peak ~20:00-21:00. Shape follows the
 * published multi-city pattern; the amplitudes below are demo scenarios, not
 * recorded station data.
 */
const DIURNAL_SHAPE = [
  1.15, 1.16, 1.17, 1.15, 1.1, 1.06, 1.12, 1.24, 1.3, 1.22, 1.02, 0.86, 0.78, 0.74, 0.74, 0.67,
  0.66, 0.74, 0.98, 1.15, 1.25, 1.26, 1.22, 1.18,
];

const MORNING_PEAK_SHAPE = 1.3;

export function buildDiurnalCurve(morningPeakPm25: number): HourlyAir[] {
  const scale = morningPeakPm25 / MORNING_PEAK_SHAPE;
  return DIURNAL_SHAPE.map((f, hour) => ({ hour, pm25: Math.round(f * scale) }));
}

const preset = (
  id: string,
  name: string,
  area: string,
  lat: number,
  lng: number,
  morningPeak: number,
): AirScenario => ({ id, name, area, lat, lng, hourly: buildDiurnalCurve(morningPeak), source: "preset" });

export const PRESET_SCENARIOS: readonly AirScenario[] = [
  preset("anand-vihar", "Anand Vihar", "Severe peak", 28.6469, 77.3158, 285),
  preset("gurugram", "Gurugram", "Very poor morning", 28.4947, 77.0887, 190),
  preset("central-delhi", "Central Delhi", "Post-curb recovery", 28.6315, 77.2167, 125),
];

export const DEFAULT_SCENARIO = PRESET_SCENARIOS[0];

export function getPreset(id: string): AirScenario | undefined {
  return PRESET_SCENARIOS.find((s) => s.id === id);
}

import type { AirScenario, HourlyAir } from "./types";

/**
 * Winter diurnal shape (index = local hour): morning peak ~08:00, deep
 * afternoon trough ~15:00-16:00, second peak ~20:00-21:00. Shape follows the
 * published multi-city pattern; the amplitudes below are demo scenarios, not
 * recorded station data.
 */
const DIURNAL_SHAPE = [
  1.15, 1.16, 1.17, 1.15, 1.1, 1.06, 1.12, 1.24, 1.3, 1.22, 1.02, 0.86, 0.78, 0.74, 0.74, 0.67, 0.66, 0.74, 0.98, 1.15, 1.25, 1.26, 1.22,
  1.18,
];

const MORNING_PEAK_SHAPE = 1.3;

export function buildDiurnalCurve(morningPeakPm25: number): HourlyAir[] {
  const scale = morningPeakPm25 / MORNING_PEAK_SHAPE;
  return DIURNAL_SHAPE.map((f, hour) => ({ hour, pm25: Math.round(f * scale) }));
}

type PresetSpec = Pick<AirScenario, "id" | "name" | "area" | "lat" | "lng"> & { morningPeak: number };

const preset = ({ morningPeak, ...place }: PresetSpec): AirScenario => ({
  ...place,
  hourly: buildDiurnalCurve(morningPeak),
  source: "preset",
});

export const PRESET_SCENARIOS: readonly AirScenario[] = [
  preset({ id: "anand-vihar", name: "Anand Vihar", area: "Severe peak", lat: 28.6469, lng: 77.3158, morningPeak: 285 }),
  preset({ id: "gurugram", name: "Gurugram", area: "Very poor morning", lat: 28.4947, lng: 77.0887, morningPeak: 190 }),
  preset({ id: "central-delhi", name: "Central Delhi", area: "Post-curb recovery", lat: 28.6315, lng: 77.2167, morningPeak: 125 }),
];

export const DEFAULT_SCENARIO = PRESET_SCENARIOS[0];

/** Preset-shaped stand-in used when live data is unavailable. */
export function demoFallbackFor(lat: number, lng: number, morningPeak = 190): AirScenario {
  return { id: "fallback", name: "Your location", area: "Demo data", lat, lng, hourly: buildDiurnalCurve(morningPeak), source: "preset" };
}

import type { CommuteMode, CookingFuel, FiltrationMode, WindowType } from "./types";

/**
 * Every number the engine uses lives here, tagged as either `cited`
 * (taken from a published source) or `assumption` (modelling choice that a
 * reader should be able to challenge). Nothing here is produced by an LLM.
 */

/** Berkeley Earth: 22 µg/m³ for 24 h ≈ 1 cigarette. [cited] */
export const CIGARETTE_PM25_UG_M3 = 22;

/** Delhi Metro vs private transport, g CO2 per passenger-km. [cited] */
export const METRO_CO2_SAVED_G_PER_KM = 32.4;

/** Realistic N95/FFP2 fitted reduction (theoretical 95%). [cited in PRD] */
export const N95_REDUCTION = 0.85;

/** CPCB PM2.5 (µg/m³) to AQI breakpoints. [cited] */
export const CPCB_PM25_BREAKPOINTS: ReadonlyArray<{
  pmLo: number;
  pmHi: number;
  aqiLo: number;
  aqiHi: number;
}> = [
  { pmLo: 0, pmHi: 30, aqiLo: 0, aqiHi: 50 },
  { pmLo: 30, pmHi: 60, aqiLo: 51, aqiHi: 100 },
  { pmLo: 60, pmHi: 90, aqiLo: 101, aqiHi: 200 },
  { pmLo: 90, pmHi: 120, aqiLo: 201, aqiHi: 300 },
  { pmLo: 120, pmHi: 250, aqiLo: 301, aqiHi: 400 },
  { pmLo: 250, pmHi: 380, aqiLo: 401, aqiHi: 500 },
];

/** Safe-ventilation thresholds. [PRD safety overrides] */
export const VENT_BRIEF_ABOVE_PM25 = 250;
export const VENT_SEALED_ABOVE_PM25 = 300;

/** Window search: 90-minute window fully inside daylight hours. [assumption] */
export const VENT_WINDOW_HOURS = 1.5;
export const VENT_DAY_START = 9;
export const VENT_DAY_END = 18;
export const MORNING_PEAK_START = 7;
export const MORNING_PEAK_END = 10;

/** Single-zone indoor model. [assumptions, calibrated against cited filter results for a ~50 m³ room] */
export const INFILTRATION_ACH: Record<WindowType, number> = {
  sliding_aluminum_unsealed: 1.2,
  casement_wood_unsealed: 0.9,
  upvc_sealed: 0.4,
};
export const PARTICLE_PENETRATION = 0.8;
export const DEPOSITION_PER_HOUR = 0.2;
/** EPDM strip cuts exterior seepage by ~30%. [cited in PRD] */
export const EPDM_SEEPAGE_FACTOR = 0.7;
/** Real rooms mix imperfectly and filters load, so nominal CADR is derated. [assumption] */
export const FIELD_CADR_DERATE = 0.7;
export const TARGET_ACH = 5;

export interface FilterSpec {
  id: Exclude<FiltrationMode, "none">;
  name: string;
  nominalCadrM3h: number; // assumption
  costInr: number;
  literatureReductionPct: number; // cited
  noiseDeltaDbDay: number;
  noiseDeltaDbNight: number;
  sourceId: string;
  note: string;
}

export const FILTERS: Record<Exclude<FiltrationMode, "none">, FilterSpec> = {
  quad_merv13_cr_box: {
    id: "quad_merv13_cr_box",
    name: "4-filter MERV-13 Corsi-Rosenthal cube",
    nominalCadrM3h: 400,
    costInr: 3800,
    literatureReductionPct: 70,
    noiseDeltaDbDay: 5,
    noiseDeltaDbNight: 10,
    sourceId: "crbox",
    note: "Best value. Run on high 18:00-22:00, low overnight. Use only a certified box fan with thermal protection.",
  },
  single_merv13_fan: {
    id: "single_merv13_fan",
    name: "Single-filter MERV-13 box fan",
    nominalCadrM3h: 100,
    costInr: 2100,
    literatureReductionPct: 43.3,
    noiseDeltaDbDay: 5,
    noiseDeltaDbNight: 10,
    sourceId: "asu",
    note: "Ultra-budget. Best for small rooms or as a stopgap.",
  },
  commercial_h13_hepa: {
    id: "commercial_h13_hepa",
    name: "Commercial H13 HEPA purifier",
    nominalCadrM3h: 300,
    costInr: 11500,
    literatureReductionPct: 78,
    noiseDeltaDbDay: 0,
    noiseDeltaDbNight: 0,
    sourceId: "crbox",
    note: "Quietest option, suited to light sleepers. Check its rated CADR against your room.",
  },
};

export const EPDM_COST_INR = 450;

/** Average indoor PM2.5 increment while cooking, µg/m³. LPG unvented from cited trial; others assumed. */
export const COOKING_INCREMENT_UG_M3: Record<CookingFuel, number> = {
  lpg_unvented: 20.8,
  lpg_chimney: 12,
  electric_induction: 10.8,
};
/** Induction with the exhaust running. [assumption: exhaust removes about half] */
export const INDUCTION_WITH_EXHAUST_FACTOR = 0.5;
export const COOKING_HOURS_PER_DAY = 1.5;
export const HOURS_IN_ROOM_PER_DAY = 12;

/** Breathing rates, m³/h. [assumptions, typical adult values] */
export const BREATHING_M3_H = { rest: 0.5, walk: 1.5, commute: 0.8 } as const;

/** Activity durations. [assumptions] */
export const WALK_HOURS = 0.75;
export const COMMUTE_ROUTE_SPEED_KMH: Record<CommuteMode, number> = {
  private_petrol_car: 22,
  private_diesel_car: 22,
  auto_rickshaw: 18,
  two_wheeler: 25,
};
export const METRO_SPEED_KMH = 32;
export const METRO_LAST_MILE_HOURS = 0.33;
/** In-vehicle PM2.5 relative to roadside outdoors. [assumptions] */
export const IN_VEHICLE_FACTOR: Record<CommuteMode, number> = {
  private_petrol_car: 0.7,
  private_diesel_car: 0.7,
  auto_rickshaw: 1.0,
  two_wheeler: 1.0,
};
export const METRO_IN_VEHICLE_FACTOR = 0.35;
export const COMMUTE_HOURS_OF_DAY = [8, 9, 18, 19];

export const SEASON_DAYS = 90;
export const MEMBER_MIN = 1;
export const MEMBER_MAX = 15;
export const CUFT_TO_M3 = 0.0283168;

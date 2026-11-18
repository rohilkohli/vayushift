export type GrapStage = "NONE" | "STAGE_1" | "STAGE_2" | "STAGE_3" | "STAGE_4";

export type WindowType = "sliding_aluminum_unsealed" | "casement_wood_unsealed" | "upvc_sealed";
export type CookingFuel = "lpg_unvented" | "lpg_chimney" | "electric_induction";
export type CommuteMode = "private_petrol_car" | "private_diesel_car" | "auto_rickshaw" | "two_wheeler";
export type FiltrationMode = "none" | "single_merv13_fan" | "quad_merv13_cr_box" | "commercial_h13_hepa";
export type NoiseSensitivity = "low" | "medium" | "high";

/** One hour of outdoor air-quality data (local hour 0-23). */
export interface HourlyAir {
  hour: number;
  pm25: number; // µg/m³
}

export interface AirScenario {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  /** 24 values, index = local hour. */
  hourly: HourlyAir[];
  source: "preset" | "live";
}

export interface HouseholdProfile {
  memberCount: number;
  commuterCount: number;
  walkerCount: number;
  hasVulnerableMembers: boolean;
  roomAreaSqFt: number;
  ceilingHeightFt: number;
  windowType: WindowType;
  sleepNoiseSensitivity: NoiseSensitivity;
  commuteKmRoundTrip: number;
  baselineCommuteMode: CommuteMode;
  baselineCookingFuel: CookingFuel;
}

export interface ActiveInterventions {
  shiftWalkToTrough: boolean;
  purgeAtTrough: boolean;
  sealWindowsWithEpdm: boolean;
  filtrationMode: FiltrationMode;
  switchToInduction: boolean;
  switchCommuteToMetroN95: boolean;
}

export interface VentilationAdvice {
  /** normal: 15 min; brief: 5 min crack only; sealed: do not open windows. */
  mode: "normal" | "brief" | "sealed";
  minutes: number;
  headline: string;
}

export interface VentilationWindow {
  startHour: number; // may be fractional (e.g. 15.5)
  endHour: number;
  meanPm25: number;
  morningPeakMeanPm25: number;
  reductionVsMorningPct: number;
  advice: VentilationAdvice;
}

export interface ImpactComponent {
  key: "walk" | "purge" | "room" | "cooking" | "commute";
  label: string;
  /** Household totals (summed over affected people). */
  avoidedCigarettes: number;
  avoidedPm25Micrograms: number;
}

export interface DirectImpactReceipt {
  baselineIndoorPm25: number;
  managedIndoorPm25: number;
  indoorReductionPct: number;
  requiredCadrM3h: number;
  roomVolumeM3: number;
  avoidedCigarettesPerPersonDay: number;
  avoidedCigarettesHouseholdDay: number;
  avoidedCigarettesSeason90Days: number;
  avoidedPm25MicrogramsDay: number;
  savedCo2GramsDay: number;
  components: ImpactComponent[];
}

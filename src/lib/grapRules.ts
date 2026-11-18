import type { GrapStage } from "./types";

/** CAQM GRAP stage from AQI: I 201-300, II 301-400, III 401-450, IV >450. */
export function grapStageFromAqi(aqi: number): GrapStage {
  if (!Number.isFinite(aqi) || aqi <= 200) return "NONE";
  if (aqi <= 300) return "STAGE_1";
  if (aqi <= 400) return "STAGE_2";
  if (aqi <= 450) return "STAGE_3";
  return "STAGE_4";
}

export interface GrapInfo {
  stage: GrapStage;
  roman: string;
  band: string;
  category: string;
  /** Plain-language summary of typical measures. Confirm current orders with CAQM. */
  measures: string[];
  householdActions: string[];
}

export const GRAP_INFO: Record<GrapStage, GrapInfo> = {
  NONE: {
    stage: "NONE",
    roman: "-",
    band: "AQI 0-200",
    category: "Below GRAP",
    measures: ["No GRAP stage is active at this AQI."],
    householdActions: ["Ventilate normally and keep filtration for sensitive members."],
  },
  STAGE_1: {
    stage: "STAGE_1",
    roman: "I",
    band: "AQI 201-300",
    category: "Poor",
    measures: [
      "Dust control at construction sites and on roads",
      "No open burning of waste or biomass",
      "Stricter pollution-under-control (PUC) checks",
    ],
    householdActions: ["Ventilate in the afternoon low only", "Wet-sweep instead of dry sweeping"],
  },
  STAGE_2: {
    stage: "STAGE_2",
    roman: "II",
    band: "AQI 301-400",
    category: "Very poor",
    measures: [
      "Diesel generator sets restricted except for essential services",
      "No coal or firewood in eateries",
      "More public transport and higher parking fees",
    ],
    householdActions: ["Run filtration in bedrooms", "Plan errands for the afternoon low", "Prefer metro over solo driving"],
  },
  STAGE_3: {
    stage: "STAGE_3",
    roman: "III",
    band: "AQI 401-450",
    category: "Severe",
    measures: [
      "Older petrol (BS-III) and diesel (BS-IV) light vehicles restricted in NCR",
      "Non-essential construction and demolition paused",
      "Schools may shift younger classes to online mode",
    ],
    householdActions: ["Keep windows sealed outside the afternoon low", "N95 for unavoidable outdoor trips", "Replace biomass heating for staff with electric heaters"],
  },
  STAGE_4: {
    stage: "STAGE_4",
    roman: "IV",
    band: "AQI above 450",
    category: "Severe+",
    measures: [
      "Entry of non-essential trucks into Delhi restricted",
      "Public construction projects paused",
      "Schools and offices may move to online or work-from-home",
    ],
    householdActions: ["Stay indoors with filtration on high", "Avoid all non-essential outdoor activity", "Check on elderly neighbours"],
  },
};

export const GRAP_DISCLAIMER =
  "Summary of typical GRAP measures for awareness only. Official restrictions change by order: confirm at caqm.nic.in.";

export type VehicleClass = "petrol_bs3" | "diesel_bs4" | "petrol_bs6" | "diesel_bs6" | "cng_ev";

export const VEHICLE_LABELS: Record<VehicleClass, string> = {
  petrol_bs3: "Petrol car, BS-III or older",
  diesel_bs4: "Diesel car, BS-IV",
  petrol_bs6: "Petrol car, BS-VI",
  diesel_bs6: "Diesel car, BS-VI",
  cng_ev: "CNG or electric",
};

/** Light-vehicle restriction check for Stage III and above (Delhi-NCR). Awareness only. */
export function vehicleRestricted(stage: GrapStage, v: VehicleClass): boolean {
  const high = stage === "STAGE_3" || stage === "STAGE_4";
  return high && (v === "petrol_bs3" || v === "diesel_bs4");
}

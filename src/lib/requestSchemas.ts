import { clampMembers } from "./impactEngine";
import type {
  ActiveInterventions,
  CommuteMode,
  CookingFuel,
  FiltrationMode,
  HourlyAir,
  HouseholdProfile,
  NoiseSensitivity,
  WindowType,
} from "./types";

const WINDOWS: WindowType[] = ["sliding_aluminum_unsealed", "casement_wood_unsealed", "upvc_sealed"];
const FUELS: CookingFuel[] = ["lpg_unvented", "lpg_chimney", "electric_induction"];
const MODES: CommuteMode[] = ["private_petrol_car", "private_diesel_car", "auto_rickshaw", "two_wheeler"];
const FILTERS: FiltrationMode[] = ["none", "single_merv13_fan", "quad_merv13_cr_box", "commercial_h13_hepa"];
const NOISE: NoiseSensitivity[] = ["low", "medium", "high"];

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

export function parseHourly(v: unknown): HourlyAir[] | null {
  if (!Array.isArray(v) || v.length !== 24) return null;
  const out: HourlyAir[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const pm = num(v[hour], 0, 2000);
    if (pm === null) return null;
    out.push({ hour, pm25: pm });
  }
  return out;
}

type Present<T> = { [K in keyof T]: NonNullable<T[K]> };

/** The object itself when no field is null (every field validated), otherwise null. */
function allPresent<T extends Record<string, unknown>>(fields: T): Present<T> | null {
  return Object.values(fields).every((x) => x !== null) ? (fields as Present<T>) : null;
}

export function parseProfile(v: unknown): HouseholdProfile | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as Record<string, unknown>;
  const f = allPresent({
    memberCount: num(p.memberCount, 1, 15),
    commuterCount: num(p.commuterCount, 0, 15),
    walkerCount: num(p.walkerCount, 0, 15),
    roomAreaSqFt: num(p.roomAreaSqFt, 40, 800),
    ceilingHeightFt: num(p.ceilingHeightFt, 7, 14),
    commuteKmRoundTrip: num(p.commuteKmRoundTrip, 0, 200),
    windowType: oneOf(p.windowType, WINDOWS),
    baselineCookingFuel: oneOf(p.baselineCookingFuel, FUELS),
    baselineCommuteMode: oneOf(p.baselineCommuteMode, MODES),
    sleepNoiseSensitivity: oneOf(p.sleepNoiseSensitivity, NOISE),
  });
  if (!f) return null;
  return {
    ...f,
    memberCount: clampMembers(f.memberCount),
    hasChildren: p.hasChildren === true,
    hasSeniors: p.hasSeniors === true,
    hasRespiratoryCondition: p.hasRespiratoryCondition === true,
  };
}

export function parseInterventions(v: unknown): ActiveInterventions | null {
  if (typeof v !== "object" || v === null) return null;
  const i = v as Record<string, unknown>;
  const filtration = oneOf(i.filtrationMode, FILTERS);
  if (!filtration) return null;
  return {
    shiftWalkToTrough: i.shiftWalkToTrough === true,
    purgeAtTrough: i.purgeAtTrough === true,
    sealWindowsWithEpdm: i.sealWindowsWithEpdm === true,
    filtrationMode: filtration,
    switchToInduction: i.switchToInduction === true,
    switchCommuteToMetroN95: i.switchCommuteToMetroN95 === true,
  };
}

import { clampMembers } from "./impactEngine";
import type { ActiveInterventions, CommuteMode, CookingFuel, FiltrationMode, HourlyAir, HouseholdProfile, NoiseSensitivity, WindowType } from "./types";

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

export function parseProfile(v: unknown): HouseholdProfile | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as Record<string, unknown>;
  const members = num(p.memberCount, 1, 15);
  const commuters = num(p.commuterCount, 0, 15);
  const walkers = num(p.walkerCount, 0, 15);
  const area = num(p.roomAreaSqFt, 40, 800);
  const ceiling = num(p.ceilingHeightFt, 7, 14);
  const km = num(p.commuteKmRoundTrip, 0, 200);
  const windowType = oneOf(p.windowType, WINDOWS);
  const fuel = oneOf(p.baselineCookingFuel, FUELS);
  const mode = oneOf(p.baselineCommuteMode, MODES);
  const noise = oneOf(p.sleepNoiseSensitivity, NOISE);
  if ([members, commuters, walkers, area, ceiling, km].includes(null) || !windowType || !fuel || !mode || !noise) return null;
  return {
    memberCount: clampMembers(members!),
    commuterCount: commuters!,
    walkerCount: walkers!,
    hasChildren: p.hasChildren === true,
    hasSeniors: p.hasSeniors === true,
    hasRespiratoryCondition: p.hasRespiratoryCondition === true,
    roomAreaSqFt: area!,
    ceilingHeightFt: ceiling!,
    windowType,
    sleepNoiseSensitivity: noise,
    commuteKmRoundTrip: km!,
    baselineCommuteMode: mode,
    baselineCookingFuel: fuel,
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

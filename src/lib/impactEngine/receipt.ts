import { findVentilationWindow, meanBetween } from "../airQuality";
import { METRO_CO2_SAVED_G_PER_KM, SEASON_DAYS } from "../constants";
import type { ActiveInterventions, DirectImpactReceipt, HourlyAir, HouseholdProfile, ImpactComponent, VentilationWindow } from "../types";
import { episodeCig, episodeUg } from "./episodes";
import { buildPairs, type Pair } from "./pairs";
import { clampMembers, modelIndoor, requiredCadrM3h, roomVolumeM3 } from "./room";
import { clamp, roundTo } from "./util";

/** Bump when the calculation changes, so stored receipts record which engine produced them. */
export const ENGINE_VERSION = "1.0";

export const NO_INTERVENTIONS: ActiveInterventions = {
  shiftWalkToTrough: false,
  purgeAtTrough: false,
  sealWindowsWithEpdm: false,
  filtrationMode: "none",
  switchToInduction: false,
  switchCommuteToMetroN95: false,
};

/** The household with counts forced into range: nobody can commute or walk who does not live there. */
function normaliseProfile(raw: HouseholdProfile): HouseholdProfile {
  const members = clampMembers(raw.memberCount);
  return {
    ...raw,
    memberCount: members,
    commuterCount: clamp(Math.round(raw.commuterCount), 0, members),
    walkerCount: clamp(Math.round(raw.walkerCount), 0, members),
  };
}

const sum = (episodes: Pair["before"], f: (e: Pair["before"][number]) => number) => episodes.reduce((s, e) => s + f(e), 0);

/** What one action avoids for the household: exposure before minus exposure after, never below zero, times the people it affects. */
function toComponent(p: Pair): ImpactComponent {
  const cig = sum(p.before, episodeCig) - sum(p.after, episodeCig);
  const ug = sum(p.before, episodeUg) - sum(p.after, episodeUg);
  return {
    key: p.key,
    label: p.label,
    avoidedCigarettes: roundTo(Math.max(0, cig) * p.people, 2),
    avoidedPm25Micrograms: Math.round(Math.max(0, ug) * p.people),
  };
}

/**
 * Deterministic household impact. Every figure shown to the user, and every
 * figure handed to the LLM as context, originates here.
 */
export function calculateHouseholdImpact(
  hourly: readonly HourlyAir[],
  rawProfile: HouseholdProfile,
  on: ActiveInterventions,
  window: VentilationWindow = findVentilationWindow(hourly),
): DirectImpactReceipt {
  const profile = normaliseProfile(rawProfile);
  const members = profile.memberCount;
  const volume = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
  const dailyMean = meanBetween(hourly, 0, 23);
  const indoor = { outdoorPm25: dailyMean, volumeM3: volume, profile };
  const base = modelIndoor({ ...indoor, sealed: false, filtration: "none" });
  const managed = modelIndoor({ ...indoor, sealed: on.sealWindowsWithEpdm, filtration: on.filtrationMode });

  const components = buildPairs({ profile, hourly, on, window, base, managed }).map(toComponent);
  const household = components.reduce((s, c) => s + c.avoidedCigarettes, 0);
  const co2 = on.switchCommuteToMetroN95 ? Math.round(profile.commuteKmRoundTrip * METRO_CO2_SAVED_G_PER_KM * profile.commuterCount) : 0;

  return {
    baselineIndoorPm25: roundTo(base.pm25, 1),
    managedIndoorPm25: roundTo(managed.pm25, 1),
    indoorReductionPct: base.pm25 > 0 ? roundTo(((base.pm25 - managed.pm25) / base.pm25) * 100, 1) : 0,
    requiredCadrM3h: requiredCadrM3h(volume),
    roomVolumeM3: roundTo(volume, 1),
    avoidedCigarettesPerPersonDay: roundTo(household / members, 2),
    avoidedCigarettesHouseholdDay: roundTo(household, 2),
    avoidedCigarettesSeason90Days: roundTo(household * SEASON_DAYS, 1),
    avoidedPm25MicrogramsDay: components.reduce((s, c) => s + c.avoidedPm25Micrograms, 0),
    savedCo2GramsDay: co2,
    components,
  };
}

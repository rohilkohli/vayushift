import { cigaretteEquivalent, findVentilationWindow, meanBetween } from "./airQuality";
import {
  BREATHING_M3_H,
  COMMUTE_HOURS_OF_DAY,
  COMMUTE_ROUTE_SPEED_KMH,
  COOKING_HOURS_PER_DAY,
  COOKING_INCREMENT_UG_M3,
  CUFT_TO_M3,
  DEPOSITION_PER_HOUR,
  EPDM_SEEPAGE_FACTOR,
  FIELD_CADR_DERATE,
  FILTERS,
  HOURS_IN_ROOM_PER_DAY,
  IN_VEHICLE_FACTOR,
  INDUCTION_WITH_EXHAUST_FACTOR,
  INFILTRATION_ACH,
  MEMBER_MAX,
  MEMBER_MIN,
  METRO_CO2_SAVED_G_PER_KM,
  METRO_IN_VEHICLE_FACTOR,
  METRO_LAST_MILE_HOURS,
  METRO_SPEED_KMH,
  N95_REDUCTION,
  PARTICLE_PENETRATION,
  SEASON_DAYS,
  TARGET_ACH,
  WALK_HOURS,
} from "./constants";
import type {
  ActiveInterventions,
  DirectImpactReceipt,
  FiltrationMode,
  HourlyAir,
  HouseholdProfile,
  ImpactComponent,
  VentilationWindow,
} from "./types";

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

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const roundTo = (n: number, dp: number) => Number(n.toFixed(dp));

export function clampMembers(n: number): number {
  return clamp(Math.round(Number.isFinite(n) ? n : 3), MEMBER_MIN, MEMBER_MAX);
}

export function roomVolumeM3(areaSqFt: number, ceilingFt: number): number {
  return areaSqFt * ceilingFt * CUFT_TO_M3;
}

/** Required clean air delivery rate for TARGET_ACH air changes per hour, rounded up. */
export function requiredCadrM3h(volumeM3: number, ach = TARGET_ACH): number {
  return Math.ceil(volumeM3 * ach);
}

/** Field CADR (m³/h) after derating for mixing and filter loading. */
export function fieldCadrM3h(mode: FiltrationMode): number {
  return mode === "none" ? 0 : FILTERS[mode].nominalCadrM3h * FIELD_CADR_DERATE;
}

export interface IndoorInputs {
  outdoorPm25: number;
  volumeM3: number;
  profile: Pick<HouseholdProfile, "windowType">;
  sealed: boolean;
  filtration: FiltrationMode;
}

/**
 * Single-zone steady-state mass balance:
 *   C_in = P * a * C_out / (a + k + Q/V)
 * a = infiltration ACH, k = deposition, Q = filter CADR, V = room volume.
 * Returns the indoor concentration and the factor by which in-room sources are removed.
 */
export function modelIndoor(i: IndoorInputs): { pm25: number; sourceFactor: number } {
  const a = INFILTRATION_ACH[i.profile.windowType] * (i.sealed ? EPDM_SEEPAGE_FACTOR : 1);
  const q = fieldCadrM3h(i.filtration) / Math.max(i.volumeM3, 1);
  const denom = a + DEPOSITION_PER_HOUR + q;
  return {
    pm25: (PARTICLE_PENETRATION * a * i.outdoorPm25) / denom,
    sourceFactor: (a + DEPOSITION_PER_HOUR) / denom,
  };
}

function cookingIncrement(
  profile: HouseholdProfile,
  induction: boolean,
): number {
  if (induction) {
    return COOKING_INCREMENT_UG_M3.electric_induction * INDUCTION_WITH_EXHAUST_FACTOR;
  }
  return COOKING_INCREMENT_UG_M3[profile.baselineCookingFuel];
}

/** An exposure episode: concentration (µg/m³) held for hours at a breathing rate (m³/h). */
interface Episode {
  conc: number;
  hours: number;
  breathing: number;
}

const episodeUg = (e: Episode) => e.conc * e.hours * e.breathing;
const episodeCig = (e: Episode) => cigaretteEquivalent(e.conc, e.hours);

function commuteEpisodes(
  profile: HouseholdProfile,
  hourly: readonly HourlyAir[],
  metro: boolean,
): Episode[] {
  const roadside =
    COMMUTE_HOURS_OF_DAY.reduce((s, h) => s + hourly[h].pm25, 0) / COMMUTE_HOURS_OF_DAY.length;
  const km = profile.commuteKmRoundTrip;
  if (!metro) {
    return [
      {
        conc: roadside * IN_VEHICLE_FACTOR[profile.baselineCommuteMode],
        hours: km / COMMUTE_ROUTE_SPEED_KMH[profile.baselineCommuteMode],
        breathing: BREATHING_M3_H.commute,
      },
    ];
  }
  return [
    { conc: roadside * METRO_IN_VEHICLE_FACTOR, hours: km / METRO_SPEED_KMH, breathing: BREATHING_M3_H.commute },
    { conc: roadside * (1 - N95_REDUCTION), hours: METRO_LAST_MILE_HOURS, breathing: BREATHING_M3_H.walk },
  ];
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
  const profile: HouseholdProfile = {
    ...rawProfile,
    memberCount: clampMembers(rawProfile.memberCount),
    commuterCount: clamp(Math.round(rawProfile.commuterCount), 0, clampMembers(rawProfile.memberCount)),
    walkerCount: clamp(Math.round(rawProfile.walkerCount), 0, clampMembers(rawProfile.memberCount)),
  };
  const members = profile.memberCount;
  const volume = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
  const dailyMean = meanBetween(hourly, 0, 23);
  const morning = window.morningPeakMeanPm25;
  const trough = window.meanPm25;

  const base = modelIndoor({ outdoorPm25: dailyMean, volumeM3: volume, profile, sealed: false, filtration: "none" });
  const managed = modelIndoor({
    outdoorPm25: dailyMean,
    volumeM3: volume,
    profile,
    sealed: on.sealWindowsWithEpdm,
    filtration: on.filtrationMode,
  });

  const rest = BREATHING_M3_H.rest;
  const pairs: Array<{
    key: ImpactComponent["key"];
    label: string;
    people: number;
    before: Episode[];
    after: Episode[];
  }> = [
    {
      key: "room",
      label: "Sealing and filtration",
      people: members,
      before: [{ conc: base.pm25, hours: HOURS_IN_ROOM_PER_DAY, breathing: rest }],
      after: [{ conc: managed.pm25, hours: HOURS_IN_ROOM_PER_DAY, breathing: rest }],
    },
    {
      key: "cooking",
      label: "Cooking fuel",
      people: members,
      before: [
        {
          conc: cookingIncrement(profile, false) * base.sourceFactor,
          hours: COOKING_HOURS_PER_DAY,
          breathing: rest,
        },
      ],
      after: [
        {
          conc: cookingIncrement(profile, on.switchToInduction) * managed.sourceFactor,
          hours: COOKING_HOURS_PER_DAY,
          breathing: rest,
        },
      ],
    },
    {
      key: "purge",
      label: "Ventilation timing",
      people: members,
      before: [{ conc: morning, hours: window.advice.minutes / 60, breathing: rest }],
      after: [{ conc: on.purgeAtTrough ? trough : morning, hours: window.advice.minutes / 60, breathing: rest }],
    },
    {
      key: "walk",
      label: "Walk timing",
      people: profile.walkerCount,
      before: [{ conc: morning, hours: WALK_HOURS, breathing: BREATHING_M3_H.walk }],
      after: [
        on.shiftWalkToTrough
          ? { conc: trough * (1 - N95_REDUCTION), hours: WALK_HOURS, breathing: BREATHING_M3_H.walk }
          : { conc: morning, hours: WALK_HOURS, breathing: BREATHING_M3_H.walk },
      ],
    },
    {
      key: "commute",
      label: "Commute mode",
      people: profile.commuterCount,
      before: commuteEpisodes(profile, hourly, false),
      after: commuteEpisodes(profile, hourly, on.switchCommuteToMetroN95),
    },
  ];

  const components: ImpactComponent[] = pairs.map((p) => {
    const cig = p.before.reduce((s, e) => s + episodeCig(e), 0) - p.after.reduce((s, e) => s + episodeCig(e), 0);
    const ug = p.before.reduce((s, e) => s + episodeUg(e), 0) - p.after.reduce((s, e) => s + episodeUg(e), 0);
    return {
      key: p.key,
      label: p.label,
      avoidedCigarettes: roundTo(Math.max(0, cig) * p.people, 2),
      avoidedPm25Micrograms: Math.round(Math.max(0, ug) * p.people),
    };
  });

  const household = components.reduce((s, c) => s + c.avoidedCigarettes, 0);
  const micrograms = components.reduce((s, c) => s + c.avoidedPm25Micrograms, 0);
  const co2 = on.switchCommuteToMetroN95
    ? Math.round(profile.commuteKmRoundTrip * METRO_CO2_SAVED_G_PER_KM * profile.commuterCount)
    : 0;

  return {
    baselineIndoorPm25: roundTo(base.pm25, 1),
    managedIndoorPm25: roundTo(managed.pm25, 1),
    indoorReductionPct: base.pm25 > 0 ? roundTo(((base.pm25 - managed.pm25) / base.pm25) * 100, 1) : 0,
    requiredCadrM3h: requiredCadrM3h(volume),
    roomVolumeM3: roundTo(volume, 1),
    avoidedCigarettesPerPersonDay: roundTo(household / members, 2),
    avoidedCigarettesHouseholdDay: roundTo(household, 2),
    avoidedCigarettesSeason90Days: roundTo(household * SEASON_DAYS, 1),
    avoidedPm25MicrogramsDay: micrograms,
    savedCo2GramsDay: co2,
    components,
  };
}

export interface FilterComparison {
  id: Exclude<FiltrationMode, "none">;
  modelledReductionPct: number;
  indoorPm25: number;
  cadrFieldM3h: number;
  meetsTargetAch: boolean;
}

/** Compares every filter option for one room, using the same mass-balance as the receipt. */
export function compareFilters(
  hourly: readonly HourlyAir[],
  profile: HouseholdProfile,
  sealed: boolean,
): FilterComparison[] {
  const volume = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
  const outdoor = meanBetween(hourly, 0, 23);
  const none = modelIndoor({ outdoorPm25: outdoor, volumeM3: volume, profile, sealed, filtration: "none" }).pm25;
  const need = requiredCadrM3h(volume);
  return (Object.keys(FILTERS) as Array<Exclude<FiltrationMode, "none">>).map((id) => {
    const pm = modelIndoor({ outdoorPm25: outdoor, volumeM3: volume, profile, sealed, filtration: id }).pm25;
    return {
      id,
      modelledReductionPct: none > 0 ? roundTo(((none - pm) / none) * 100, 0) : 0,
      indoorPm25: roundTo(pm, 1),
      cadrFieldM3h: Math.round(fieldCadrM3h(id)),
      meetsTargetAch: fieldCadrM3h(id) >= need,
    };
  });
}

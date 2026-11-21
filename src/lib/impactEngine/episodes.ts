import { cigaretteEquivalent } from "../airQuality";
import {
  BREATHING_M3_H,
  COMMUTE_HOURS_OF_DAY,
  COMMUTE_ROUTE_SPEED_KMH,
  COOKING_INCREMENT_UG_M3,
  IN_VEHICLE_FACTOR,
  INDUCTION_WITH_EXHAUST_FACTOR,
  METRO_IN_VEHICLE_FACTOR,
  METRO_LAST_MILE_HOURS,
  METRO_SPEED_KMH,
  N95_REDUCTION,
} from "../constants";
import type { HourlyAir, HouseholdProfile } from "../types";

/** An exposure episode: concentration (µg/m³) held for hours at a breathing rate (m³/h). */
export interface Episode {
  conc: number;
  hours: number;
  breathing: number;
}

/** Micrograms inhaled during the episode. */
export const episodeUg = (e: Episode) => e.conc * e.hours * e.breathing;

/** The episode expressed as cigarette-equivalents. */
export const episodeCig = (e: Episode) => cigaretteEquivalent(e.conc, e.hours);

/** The indoor PM2.5 bump from cooking, with the household's fuel or with induction plus exhaust. */
export function cookingIncrement(profile: HouseholdProfile, induction: boolean): number {
  if (induction) return COOKING_INCREMENT_UG_M3.electric_induction * INDUCTION_WITH_EXHAUST_FACTOR;
  return COOKING_INCREMENT_UG_M3[profile.baselineCookingFuel];
}

/** The commute as episodes: the household's usual vehicle, or the metro plus an N95 for the last mile. */
export function commuteEpisodes(profile: HouseholdProfile, hourly: readonly HourlyAir[], metro: boolean): Episode[] {
  const roadside = COMMUTE_HOURS_OF_DAY.reduce((s, h) => s + hourly[h].pm25, 0) / COMMUTE_HOURS_OF_DAY.length;
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

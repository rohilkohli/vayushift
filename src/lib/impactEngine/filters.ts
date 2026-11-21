import { meanBetween } from "../airQuality";
import { FILTERS } from "../constants";
import type { FiltrationMode, HourlyAir, HouseholdProfile } from "../types";
import { fieldCadrM3h, modelIndoor, requiredCadrM3h, roomVolumeM3 } from "./room";
import { roundTo } from "./util";

export interface FilterComparison {
  id: Exclude<FiltrationMode, "none">;
  modelledReductionPct: number;
  indoorPm25: number;
  cadrFieldM3h: number;
  meetsTargetAch: boolean;
}

/** Compares every filter option for one room, using the same mass-balance as the receipt. */
export function compareFilters(hourly: readonly HourlyAir[], profile: HouseholdProfile, sealed: boolean): FilterComparison[] {
  const volume = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
  const outdoor = meanBetween(hourly, 0, 23);
  const indoorWith = (filtration: FiltrationMode) =>
    modelIndoor({ outdoorPm25: outdoor, volumeM3: volume, profile, sealed, filtration }).pm25;
  const none = indoorWith("none");
  const need = requiredCadrM3h(volume);
  return (Object.keys(FILTERS) as Array<Exclude<FiltrationMode, "none">>).map((id) => {
    const pm = indoorWith(id);
    return {
      id,
      modelledReductionPct: none > 0 ? roundTo(((none - pm) / none) * 100, 0) : 0,
      indoorPm25: roundTo(pm, 1),
      cadrFieldM3h: Math.round(fieldCadrM3h(id)),
      meetsTargetAch: fieldCadrM3h(id) >= need,
    };
  });
}

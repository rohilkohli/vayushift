import {
  CUFT_TO_M3,
  DEPOSITION_PER_HOUR,
  EPDM_SEEPAGE_FACTOR,
  FIELD_CADR_DERATE,
  FILTERS,
  INFILTRATION_ACH,
  MEMBER_MAX,
  MEMBER_MIN,
  PARTICLE_PENETRATION,
  TARGET_ACH,
} from "../constants";
import type { FiltrationMode, HouseholdProfile } from "../types";
import { clamp } from "./util";

/** A household size the engine accepts: a whole number inside the allowed range (3 if the input is not a number). */
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

export interface IndoorResult {
  pm25: number;
  /** The factor by which in-room sources (such as cooking) are reduced. */
  sourceFactor: number;
}

/**
 * Single-zone steady-state mass balance:
 *   C_in = P * a * C_out / (a + k + Q/V)
 * a = infiltration ACH, k = deposition, Q = filter CADR, V = room volume.
 * Returns the indoor concentration and the factor by which in-room sources are removed.
 */
export function modelIndoor(i: IndoorInputs): IndoorResult {
  const a = INFILTRATION_ACH[i.profile.windowType] * (i.sealed ? EPDM_SEEPAGE_FACTOR : 1);
  const q = fieldCadrM3h(i.filtration) / Math.max(i.volumeM3, 1);
  const denom = a + DEPOSITION_PER_HOUR + q;
  return {
    pm25: (PARTICLE_PENETRATION * a * i.outdoorPm25) / denom,
    sourceFactor: (a + DEPOSITION_PER_HOUR) / denom,
  };
}

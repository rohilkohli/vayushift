import { BREATHING_M3_H, COOKING_HOURS_PER_DAY, HOURS_IN_ROOM_PER_DAY, N95_REDUCTION, WALK_HOURS } from "../constants";
import type { ActiveInterventions, HourlyAir, HouseholdProfile, ImpactComponent, VentilationWindow } from "../types";
import { commuteEpisodes, cookingIncrement, type Episode } from "./episodes";
import type { IndoorResult } from "./room";

/** One action's exposure without it (`before`) and with the household's choice (`after`), for `people` people. */
export interface Pair {
  key: ImpactComponent["key"];
  label: string;
  people: number;
  before: Episode[];
  after: Episode[];
}

/** Everything the five action pairs are built from. */
export interface PairContext {
  profile: HouseholdProfile;
  hourly: readonly HourlyAir[];
  on: ActiveInterventions;
  window: VentilationWindow;
  /** Indoor air with no sealing or filtering, and with the household's choices. */
  base: IndoorResult;
  managed: IndoorResult;
}

const REST = BREATHING_M3_H.rest;
const WALK = BREATHING_M3_H.walk;

const roomPair = ({ profile, base, managed }: PairContext): Pair => ({
  key: "room",
  label: "Sealing and filtration",
  people: profile.memberCount,
  before: [{ conc: base.pm25, hours: HOURS_IN_ROOM_PER_DAY, breathing: REST }],
  after: [{ conc: managed.pm25, hours: HOURS_IN_ROOM_PER_DAY, breathing: REST }],
});

const cookingPair = ({ profile, on, base, managed }: PairContext): Pair => ({
  key: "cooking",
  label: "Cooking fuel",
  people: profile.memberCount,
  before: [{ conc: cookingIncrement(profile, false) * base.sourceFactor, hours: COOKING_HOURS_PER_DAY, breathing: REST }],
  after: [{ conc: cookingIncrement(profile, on.switchToInduction) * managed.sourceFactor, hours: COOKING_HOURS_PER_DAY, breathing: REST }],
});

const purgePair = ({ profile, on, window: w }: PairContext): Pair => {
  const hours = w.advice.minutes / 60;
  return {
    key: "purge",
    label: "Ventilation timing",
    people: profile.memberCount,
    before: [{ conc: w.morningPeakMeanPm25, hours, breathing: REST }],
    after: [{ conc: on.purgeAtTrough ? w.meanPm25 : w.morningPeakMeanPm25, hours, breathing: REST }],
  };
};

const walkPair = ({ profile, on, window: w }: PairContext): Pair => ({
  key: "walk",
  label: "Walk timing",
  people: profile.walkerCount,
  before: [{ conc: w.morningPeakMeanPm25, hours: WALK_HOURS, breathing: WALK }],
  after: [
    on.shiftWalkToTrough
      ? { conc: w.meanPm25 * (1 - N95_REDUCTION), hours: WALK_HOURS, breathing: WALK }
      : { conc: w.morningPeakMeanPm25, hours: WALK_HOURS, breathing: WALK },
  ],
});

const commutePair = ({ profile, hourly, on }: PairContext): Pair => ({
  key: "commute",
  label: "Commute mode",
  people: profile.commuterCount,
  before: commuteEpisodes(profile, hourly, false),
  after: commuteEpisodes(profile, hourly, on.switchCommuteToMetroN95),
});

/** The five actions the receipt accounts for, in the order they are listed. */
export const buildPairs = (ctx: PairContext): Pair[] => [roomPair(ctx), cookingPair(ctx), purgePair(ctx), walkPair(ctx), commutePair(ctx)];

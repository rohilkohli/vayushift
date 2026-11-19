import { FILTERS } from "@/lib/constants";
import { PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { badRequest } from "../errors";
import type { AnalyticsStore } from "../ports";
import { utcDay } from "../time";

/**
 * Privacy-first product analytics. Only the five events in the PRD are accepted, each with a small closed
 * set of allowed values; anything else is rejected. We keep daily COUNTERS only: no user id, session id, IP,
 * user agent or timestamp finer than a day ever reaches storage. Requests carrying Global Privacy Control or
 * Do Not Track are dropped before any counting.
 */
const INTERVENTION_KEYS = [
  "shiftWalkToTrough",
  "purgeAtTrough",
  "sealWindowsWithEpdm",
  "switchToInduction",
  "switchCommuteToMetroN95",
] as const;
const PRESET_IDS = [...PRESET_SCENARIOS.map((s) => s.id), "live", "fallback"];
const FILTER_IDS = Object.keys(FILTERS);

type Props = Record<string, unknown>;

const pick = <T extends string>(value: unknown, allowed: readonly T[], field: string): T => {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw badRequest(`Invalid value for ${field}.`, "invalid_event_property");
};

/** For each event: how its properties become one bounded dimension string. */
const EVENTS: Record<string, (p: Props) => string> = {
  scenario_loaded: (p) => `preset=${pick(p.preset_id, PRESET_IDS, "preset_id")}`,
  routine_shift_toggled: (p) => `${pick(p.intervention_key, INTERVENTION_KEYS, "intervention_key")}:${p.enabled === true ? "on" : "off"}`,
  room_scan_completed: (p) => `source=${pick(p.source, ["upload", "preset"] as const, "source")}`,
  filtration_option_selected: (p) => `option=${pick(p.option_id, FILTER_IDS, "option_id")}`,
  impact_receipt_shared: (p) => `${pick(p.share_type, ["personal_receipt", "rwa_whatsapp", "link"] as const, "share_type")}`,
};
export const EVENT_NAMES = Object.keys(EVENTS);

export type RecordOutcome = "recorded" | "ignored";

export class AnalyticsService {
  constructor(
    private readonly store: AnalyticsStore,
    private readonly now: () => number = Date.now,
  ) {}

  async record(event: unknown, props: unknown, optedOut: boolean): Promise<RecordOutcome> {
    if (typeof event !== "string" || !(event in EVENTS)) throw badRequest("Unknown event.", "unknown_event");
    const dimension = EVENTS[event]((typeof props === "object" && props !== null ? props : {}) as Props);
    if (optedOut) return "ignored";
    await this.store.increment(utcDay(this.now()), event, dimension);
    return "recorded";
  }

  totals(day = utcDay(this.now())) {
    return this.store.totals(day);
  }
}

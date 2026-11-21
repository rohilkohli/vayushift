"use client";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/clientApi";
import { NO_INTERVENTIONS } from "@/lib/impactEngine";
import { parseInterventions, parseProfile } from "@/lib/requestSchemas";
import type { ActiveInterventions, HouseholdProfile } from "@/lib/types";

export const DEFAULT_PROFILE: HouseholdProfile = {
  memberCount: 3,
  commuterCount: 1,
  walkerCount: 1,
  hasChildren: true,
  hasSeniors: false,
  hasRespiratoryCondition: false,
  roomAreaSqFt: 180,
  ceilingHeightFt: 10,
  windowType: "sliding_aluminum_unsealed",
  sleepNoiseSensitivity: "medium",
  commuteKmRoundTrip: 20,
  baselineCommuteMode: "private_petrol_car",
  baselineCookingFuel: "lpg_unvented",
};

const KEY = "vayushift.household.v1";

interface Saved {
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

/** Household state persisted locally. Storage can be blocked, so every access is guarded. */
export function useHousehold() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [interventions, setInterventions] = useState<ActiveInterventions>(NO_INTERVENTIONS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // Stored data is untrusted: only accept it if it passes the same validation as API input.
        const saved = JSON.parse(raw) as Partial<Saved>;
        const p = parseProfile(saved.profile);
        const i = parseInterventions(saved.interventions);
        if (p) setProfile(p);
        if (i) setInterventions(i);
      }
    } catch {
      /* ignore corrupt or blocked storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ profile, interventions }));
    } catch {
      /* ignore */
    }
  }, [profile, interventions, ready]);

  const patchProfile = useCallback((p: Partial<HouseholdProfile>) => setProfile((s) => ({ ...s, ...p })), []);

  /** Applies a change and records it (anonymously, and only if the visitor has not opted out). */
  const changeInterventions = useCallback((p: Partial<ActiveInterventions>) => {
    setInterventions((s) => ({ ...s, ...p }));
    for (const [key, value] of Object.entries(p)) {
      if (typeof value === "boolean") track({ event: "routine_shift_toggled", props: { intervention_key: key, enabled: value } });
      else if (key === "filtrationMode" && value !== "none")
        track({ event: "filtration_option_selected", props: { option_id: String(value) } });
    }
  }, []);

  return { profile, interventions, patchProfile, changeInterventions };
}

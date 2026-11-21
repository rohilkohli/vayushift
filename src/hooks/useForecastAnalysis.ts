"use client";
import { useMemo } from "react";
import { findVentilationWindow, pm25ToAqi } from "@/lib/airQuality";
import { grapStageFromAqi } from "@/lib/grapRules";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import type { ActiveInterventions, AirScenario, HouseholdProfile } from "@/lib/types";

/**
 * Everything computed from the forecast and the household: the best airing window, the impact receipt, and the
 * air right now (`realHour` is the actual hour in India, not the scrubbed one). All of it comes from the engine.
 */
export function useForecastAnalysis(
  scenario: AirScenario,
  profile: HouseholdProfile,
  interventions: ActiveInterventions,
  realHour: number,
) {
  const ventWindow = useMemo(() => findVentilationWindow(scenario.hourly), [scenario]);
  const receipt = useMemo(
    () => calculateHouseholdImpact(scenario.hourly, profile, interventions, ventWindow),
    [scenario, profile, interventions, ventWindow],
  );
  const pm25 = scenario.hourly[realHour].pm25;
  const aqi = pm25ToAqi(pm25);
  const peakAqi = pm25ToAqi(Math.max(...scenario.hourly.map((h) => h.pm25)));
  return { ventWindow, receipt, pm25, aqi, peakAqi, stage: grapStageFromAqi(aqi) };
}

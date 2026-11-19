/** What kind of hour is the scrubber on? Drives the hero headline, copy and badge. */
export type Phase = "window" | "morning" | "night" | "transition";

export const PHASE_LABEL: Record<Phase, string> = {
  window: "Solar mixing window open",
  morning: "Morning inversion peak",
  night: "Nocturnal smog lock",
  transition: "Atmospheric transition",
};

/**
 * The low-smog window comes from the forecast (see findVentilationWindow), not a fixed 15:00,
 * so the phase stays truthful for any scenario.
 */
export function phaseForHour(hour: number, window: { startHour: number; endHour: number }): Phase {
  if (hour >= Math.floor(window.startHour) && hour < window.endHour) return "window";
  if (hour >= 7 && hour <= 10) return "morning";
  if (hour >= 20 || hour <= 5) return "night";
  return "transition";
}

import type { DirectImpactReceipt } from "./types";

/** The only numbers a narrative is allowed to mention. */
export function allowedNumbers(r: DirectImpactReceipt, extra: number[] = []): string[] {
  const nums = [
    r.avoidedCigarettesPerPersonDay,
    r.avoidedCigarettesHouseholdDay,
    r.avoidedPm25MicrogramsDay,
    r.savedCo2GramsDay,
    r.indoorReductionPct,
    r.baselineIndoorPm25,
    r.managedIndoorPm25,
    ...r.components.flatMap((c) => [c.avoidedCigarettes, c.avoidedPm25Micrograms]),
    ...extra,
  ];
  return nums.flatMap((n) => [String(n), n.toFixed(1), n.toFixed(2), Math.round(n).toString()]);
}

/**
 * Anti-hallucination guard: every number in the LLM text must be one the
 * engine produced (or a plain 0-24 clock/duration digit). Otherwise reject.
 */
export function narrativeUsesOnlyAllowedNumbers(text: string, allowed: string[]): boolean {
  const found = text.replace(/PM2\.5|PM10|CO2|NO2|O3/g, " ").match(/\d[\d,]*\.?\d*/g) ?? [];
  const set = new Set(allowed);
  return found.every((tok) => {
    const t = tok.replace(/,/g, "").replace(/\.$/, "");
    return set.has(t) || (Number.isInteger(Number(t)) && Number(t) <= 24);
  });
}

/** Deterministic fallback used whenever the model is unavailable or fails the guard. */
export function templateExplanation(r: DirectImpactReceipt): string {
  const top = [...r.components].sort((a, b) => b.avoidedCigarettes - a.avoidedCigarettes)[0];
  if (!top || r.avoidedCigarettesHouseholdDay <= 0) {
    return "Switch on a routine shift or choose a filter to see how your choices change the air you breathe today.";
  }
  const co2 = r.savedCo2GramsDay > 0 ? ` and keeps ${r.savedCo2GramsDay} g of CO2 out of the air` : "";
  return (
    `Your choices avoid about ${r.avoidedCigarettesHouseholdDay} cigarette-equivalents of PM2.5 for your household today` +
    `${co2}. The biggest contribution comes from ${top.label.toLowerCase()} (${top.avoidedCigarettes}). ` +
    `${r.indoorReductionPct > 0 ? `Indoor PM2.5 is modelled to fall from ${r.baselineIndoorPm25} to ${r.managedIndoorPm25} µg/m³. ` : ""}` +
    `These are estimates for your own exposure, not a change in the city's air.`
  );
}

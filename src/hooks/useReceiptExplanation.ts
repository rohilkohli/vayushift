"use client";
import { useEffect, useState } from "react";
import { templateExplanation } from "@/lib/explain";
import type { Messages } from "@/lib/i18n";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";
import { useLang } from "./useLang";

type Source = "gemini" | "template";

/** The explanation written without the network, in the current language and from the engine's figures only. */
function localExplanation(lang: string, t: Messages, receipt: DirectImpactReceipt): string {
  if (lang === "en") return templateExplanation(receipt);
  if (receipt.avoidedCigarettesHouseholdDay <= 0) return t.explainEmpty;
  if (!t.explainTemplate) return templateExplanation(receipt);
  return t.explainTemplate(
    receipt.avoidedCigarettesHouseholdDay,
    receipt.savedCo2GramsDay,
    receipt.baselineIndoorPm25,
    receipt.managedIndoorPm25,
    receipt.indoorReductionPct,
  );
}

interface Inputs {
  open: boolean;
  receipt: DirectImpactReceipt;
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

/**
 * The plain-language "why your choices mattered" text. It shows a template at once, then (in English, with something
 * to explain) asks the server for a Gemini version that is guarded against invented numbers and swaps it in if it
 * arrives. The Gemini text is English, so Hindi keeps the Hindi template.
 */
export function useReceiptExplanation({ open, receipt, scenario, profile, interventions }: Inputs) {
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("template");
  const [loading, setLoading] = useState(false);
  const hourly = scenario.hourly;

  useEffect(() => {
    if (!open) return;
    setText(localExplanation(lang, t, receipt));
    setSource("template");
    if (receipt.avoidedCigarettesHouseholdDay <= 0 || lang !== "en") return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourly: hourly.map((h) => h.pm25), profile, interventions }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((d: { text: string; source: Source }) => {
        setText(d.text);
        setSource(d.source);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [open, receipt, hourly, profile, interventions, lang, t]);

  return { text, source, loading };
}

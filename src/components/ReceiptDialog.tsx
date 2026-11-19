"use client";
import { useEffect, useRef, useState } from "react";
import { templateExplanation } from "@/lib/explain";
import { createShareLink, track } from "@/lib/clientApi";
import { SOURCES } from "@/lib/sources";
import { Icon } from "./Icon";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: DirectImpactReceipt;
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

export function ReceiptDialog({ open, onClose, receipt, scenario, profile, interventions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [source, setSource] = useState<"gemini" | "template">("template");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fallback = templateExplanation(receipt);
    setText(fallback);
    setSource("template");
    if (receipt.avoidedCigarettesHouseholdDay <= 0) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourly: scenario.hourly.map((h) => h.pm25), profile, interventions }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((d: { text: string; source: "gemini" | "template" }) => {
        setText(d.text);
        setSource(d.source);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // The receipt is derived from the same inputs, so those are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scenario, profile, interventions]);

  const shareText =
    `My VayuShift receipt (${scenario.name}): ${receipt.avoidedCigarettesHouseholdDay} cigarette-equivalents of PM2.5 avoided ` +
    `and ${receipt.savedCo2GramsDay} g CO2 saved today. Estimates, not medical advice.`;

  const empty = receipt.avoidedCigarettesHouseholdDay <= 0 && receipt.savedCo2GramsDay <= 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast("Receipt copied.");
      track({ event: "impact_receipt_shared", props: { share_type: "personal_receipt" } });
    } catch {
      setToast("Copy failed. Select the text and copy it manually.");
    }
  }

  /** Freezes this receipt behind a short link (the server recomputes every number) and copies it. */
  async function copyLink() {
    setSharing(true);
    setToast("");
    try {
      const link = await createShareLink({
        scenarioName: scenario.name,
        hourly: scenario.hourly.map((h) => h.pm25),
        profile,
        interventions,
      });
      await navigator.clipboard.writeText(link.url);
      setToast("Share link copied. It stays valid for 90 days.");
      track({ event: "impact_receipt_shared", props: { share_type: "link" } });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not create a share link.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="receipt-title"
      className="glass m-auto w-[min(42rem,calc(100%-2rem))] rounded-[2.5rem] border-0 p-0"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="receipt-title" className="serif m-0 text-3xl font-medium">Lungs &amp; Sky receipt</h2>
          <button type="button" onClick={onClose} className="pill">
            Close
          </button>
        </div>

        {empty ? (
          <div className="chip mt-5 rounded-3xl p-6 text-center">
            <Icon name="wb_twilight" className="accent !text-4xl" />
            <p className="serif m-0 mt-2 text-2xl">Nothing switched on yet</p>
            <p className="ink-soft mx-auto mb-4 mt-1 max-w-sm text-sm">
              Turn on a routine shift, add a sealed window or choose a filter, and your receipt fills in with what each choice saves.
            </p>
            <button type="button" onClick={onClose} className="btn-primary">Back to routines</button>
          </div>
        ) : (
        <>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Per person, per day", `${receipt.avoidedCigarettesPerPersonDay} cig-eq`],
            ["Household, per day", `${receipt.avoidedCigarettesHouseholdDay} cig-eq`],
            ["90-day season", `${receipt.avoidedCigarettesSeason90Days} cig-eq`],
            ["Inhaled PM2.5 avoided", `${receipt.avoidedPm25MicrogramsDay} µg`],
            ["CO₂ saved", `${receipt.savedCo2GramsDay} g`],
            ["Indoor PM2.5 (modelled)", `${receipt.baselineIndoorPm25} → ${receipt.managedIndoorPm25} µg/m³`],
          ].map(([k, v]) => (
            <div key={k} className="chip rounded-2xl p-3">
              <dt className="label">{k}</dt>
              <dd className="serif m-0 text-xl italic">{v}</dd>
            </div>
          ))}
        </dl>

        <h3 className="label mt-5">Where it comes from</h3>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">Contribution of each action</caption>
          <thead><tr><th scope="col" className="py-1">Action</th><th scope="col">Cig-eq/day</th><th scope="col">µg avoided</th></tr></thead>
          <tbody>
            {receipt.components.map((c) => (
              <tr key={c.key}><th scope="row" className="py-1 font-normal">{c.label}</th><td>{c.avoidedCigarettes}</td><td>{c.avoidedPm25Micrograms}</td></tr>
            ))}
          </tbody>
        </table>

        <h3 className="label mt-5">Why your choices mattered</h3>
        {loading ? (
          <div className="mt-3 space-y-2" aria-busy="true">
            <span className="skeleton w-full" aria-hidden="true" />
            <span className="skeleton w-11/12" aria-hidden="true" />
            <span className="skeleton w-2/3" aria-hidden="true" />
            <span className="sr-only" role="status">Writing your explanation</span>
          </div>
        ) : (
          <p aria-live="polite" className="mt-2">{text}</p>
        )}
        <p className="text-xs ink-soft">
          {source === "gemini" ? "Explained by Gemini using only the numbers above." : "Template explanation using only the numbers above."}
        </p>
        </>
        )}

        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">How is this calculated?</summary>
          <ul className="list-disc pl-5 text-sm">
            <li>Cigarette-equivalents = PM2.5 (µg/m³) ÷ 22 × hours ÷ 24. A communication aid, not a medical measure.</li>
            <li>Indoor PM2.5 uses a single-room mass balance: C_in = P·a·C_out ÷ (a + k + CADR/V). Model assumptions are in <code>src/lib/constants.ts</code>.</li>
            <li>CO₂ saved = km × 32.4 g, for each commuter who switches to metro.</li>
            <li>These figures describe your personal exposure and emissions, not a change in the city's AQI.</li>
          </ul>
          <ul className="mt-2 list-none p-0 text-sm">
            {Object.values(SOURCES).map((s) => (
              <li key={s.id} className="py-1">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{s.label}</a>: {s.supports}
              </li>
            ))}
          </ul>
        </details>

        {!empty && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copy} className="btn-primary">Copy receipt</button>
            <button type="button" onClick={copyLink} disabled={sharing} className="pill">
              {sharing ? "Creating link…" : "Copy share link"}
            </button>
            <p role="status" aria-live="polite" className="m-0 text-sm font-semibold">{toast}</p>
          </div>
        )}
      </div>
    </dialog>
  );
}

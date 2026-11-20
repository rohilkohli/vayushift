"use client";
import { useEffect, useRef, useState } from "react";
import { templateExplanation } from "@/lib/explain";
import { createShareLink, track } from "@/lib/clientApi";
import { SOURCES } from "@/lib/sources";
import { useLang } from "@/hooks/useLang";
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
  const { lang, t, englishAttrs } = useLang();
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
    const empty = receipt.avoidedCigarettesHouseholdDay <= 0;
    const fallback =
      lang === "en" || empty || !t.explainTemplate
        ? empty && lang !== "en"
          ? t.explainEmpty
          : templateExplanation(receipt)
        : t.explainTemplate(receipt.avoidedCigarettesHouseholdDay, receipt.savedCo2GramsDay, receipt.baselineIndoorPm25, receipt.managedIndoorPm25, receipt.indoorReductionPct);
    setText(fallback);
    setSource("template");
    // The Gemini explanation is written in English, so Hindi shows the Hindi template instead.
    if (empty || lang !== "en") return;
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
  }, [open, scenario, profile, interventions, lang, t]);

  const shareText = t.shareText(scenario.name, receipt.avoidedCigarettesHouseholdDay, receipt.savedCo2GramsDay);

  const empty = receipt.avoidedCigarettesHouseholdDay <= 0 && receipt.savedCo2GramsDay <= 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast(t.receiptCopied);
      track({ event: "impact_receipt_shared", props: { share_type: "personal_receipt" } });
    } catch {
      setToast(t.receiptCopyFailed);
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
      setToast(t.linkCopied);
      track({ event: "impact_receipt_shared", props: { share_type: "link" } });
    } catch (err) {
      setToast(err instanceof Error ? err.message : t.linkFailed);
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
          <h2 id="receipt-title" className="serif m-0 text-3xl font-medium">{t.receiptTitle}</h2>
          <button type="button" onClick={onClose} className="pill">
            {t.close}
          </button>
        </div>

        {empty ? (
          <div className="chip mt-5 rounded-3xl p-6 text-center">
            <Icon name="wb_twilight" className="accent !text-4xl" />
            <p className="serif m-0 mt-2 text-2xl">{t.emptyTitle}</p>
            <p className="ink-soft mx-auto mb-4 mt-1 max-w-sm text-sm">{t.emptyBody}</p>
            <button type="button" onClick={onClose} className="btn-primary">{t.backToRoutines}</button>
          </div>
        ) : (
        <>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {[
            [t.rcPerPerson, `${receipt.avoidedCigarettesPerPersonDay} ${t.cigEqPerDay}`],
            [t.rcHousehold, `${receipt.avoidedCigarettesHouseholdDay} ${t.cigEqPerDay}`],
            [t.rcSeason, `${receipt.avoidedCigarettesSeason90Days} ${t.cigEqPerDay}`],
            [t.rcInhaled, `${receipt.avoidedPm25MicrogramsDay} µg`],
            [t.rcCo2, `${receipt.savedCo2GramsDay} g`],
            [t.rcIndoor, `${receipt.baselineIndoorPm25} → ${receipt.managedIndoorPm25} µg/m³`],
          ].map(([k, v]) => (
            <div key={k} className="chip rounded-2xl p-3">
              <dt className="label">{k}</dt>
              <dd className="serif m-0 text-xl italic">{v}</dd>
            </div>
          ))}
        </dl>

        <h3 className="label mt-5">{t.whereFrom}</h3>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{t.contribCaption}</caption>
          <thead><tr><th scope="col" className="py-1">{t.thAction}</th><th scope="col">{t.thCigDay}</th><th scope="col">{t.thUgAvoided}</th></tr></thead>
          <tbody>
            {receipt.components.map((c) => (
              <tr key={c.key}><th scope="row" className="py-1 font-normal" {...englishAttrs}>{c.label}</th><td>{c.avoidedCigarettes}</td><td>{c.avoidedPm25Micrograms}</td></tr>
            ))}
          </tbody>
        </table>

        <h3 className="label mt-5">{t.whyTitle}</h3>
        {loading ? (
          <div className="mt-3 space-y-2" aria-busy="true">
            <span className="skeleton w-full" aria-hidden="true" />
            <span className="skeleton w-11/12" aria-hidden="true" />
            <span className="skeleton w-2/3" aria-hidden="true" />
            <span className="sr-only" role="status">{t.writing}</span>
          </div>
        ) : (
          <p aria-live="polite" className="mt-2">{text}</p>
        )}
        <p className="text-xs ink-soft">
          {source === "gemini" ? t.srcGemini : t.srcTemplate}
        </p>
        </>
        )}

        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">{t.howTitle}</summary>
          <ul className="list-disc pl-5 text-sm">
            <li>{t.how1}</li>
            <li>{t.how2} <code>src/lib/constants.ts</code>.</li>
            <li>{t.how3}</li>
            <li>{t.how4}</li>
          </ul>
          <ul className="mt-2 list-none p-0 text-sm">
            {Object.values(SOURCES).map((s) => (
              <li key={s.id} className="py-1" {...englishAttrs}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{s.label}</a>: {s.supports}
              </li>
            ))}
          </ul>
        </details>

        {!empty && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copy} className="btn-primary">{t.copyReceipt}</button>
            <button type="button" onClick={copyLink} disabled={sharing} className="pill">
              {sharing ? t.creatingLink : t.copyLink}
            </button>
            <p role="status" aria-live="polite" className="m-0 text-sm font-semibold">{toast}</p>
          </div>
        )}
      </div>
    </dialog>
  );
}

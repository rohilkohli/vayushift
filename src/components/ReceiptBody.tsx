"use client";
import type { DirectImpactReceipt } from "@/lib/types";
import { useLang } from "@/hooks/useLang";

interface Explanation {
  text: string;
  source: "gemini" | "template";
  loading: boolean;
}

/** What each action avoided, per day. The action names come from the engine, so they stay English. */
function ContributionTable({ receipt }: { receipt: DirectImpactReceipt }) {
  const { t, englishAttrs } = useLang();
  return (
    <table className="mt-2 w-full text-left text-sm">
      <caption className="sr-only">{t.contribCaption}</caption>
      <thead>
        <tr>
          <th scope="col" className="py-1">
            {t.thAction}
          </th>
          <th scope="col">{t.thCigDay}</th>
          <th scope="col">{t.thUgAvoided}</th>
        </tr>
      </thead>
      <tbody>
        {receipt.components.map((c) => (
          <tr key={c.key}>
            <th scope="row" className="py-1 font-normal" {...englishAttrs}>
              {c.label}
            </th>
            <td>{c.avoidedCigarettes}</td>
            <td>{c.avoidedPm25Micrograms}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The plain-language explanation, with a placeholder while the Gemini version is being written. */
function ExplanationBlock({ explanation }: { explanation: Explanation }) {
  const { t } = useLang();
  return (
    <>
      {explanation.loading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <span className="skeleton w-full" aria-hidden="true" />
          <span className="skeleton w-11/12" aria-hidden="true" />
          <span className="skeleton w-2/3" aria-hidden="true" />
          <span className="sr-only" role="status">
            {t.writing}
          </span>
        </div>
      ) : (
        <p aria-live="polite" className="mt-2">
          {explanation.text}
        </p>
      )}
      <p className="text-xs ink-soft">{explanation.source === "gemini" ? t.srcGemini : t.srcTemplate}</p>
    </>
  );
}

/** The six headline figures, the per-action breakdown and the plain-language explanation. */
export function ReceiptBody({ receipt, explanation }: { receipt: DirectImpactReceipt; explanation: Explanation }) {
  const { t } = useLang();
  const figures = [
    [t.rcPerPerson, `${receipt.avoidedCigarettesPerPersonDay} ${t.cigEqPerDay}`],
    [t.rcHousehold, `${receipt.avoidedCigarettesHouseholdDay} ${t.cigEqPerDay}`],
    [t.rcSeason, `${receipt.avoidedCigarettesSeason90Days} ${t.cigEqPerDay}`],
    [t.rcInhaled, `${receipt.avoidedPm25MicrogramsDay} µg`],
    [t.rcCo2, `${receipt.savedCo2GramsDay} g`],
    [t.rcIndoor, `${receipt.baselineIndoorPm25} → ${receipt.managedIndoorPm25} µg/m³`],
  ];
  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {figures.map(([k, v]) => (
          <div key={k} className="chip rounded-2xl p-3">
            <dt className="label">{k}</dt>
            <dd className="serif m-0 text-xl italic">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="label mt-5">{t.whereFrom}</h3>
      <ContributionTable receipt={receipt} />
      <h3 className="label mt-5">{t.whyTitle}</h3>
      <ExplanationBlock explanation={explanation} />
    </>
  );
}

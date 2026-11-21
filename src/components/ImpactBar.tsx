"use client";
import type { DirectImpactReceipt } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { AnimatedNumber } from "./AnimatedNumber";

/** Persistent summary shown on tabs that don't already have the Daily Sanctuary Delta card. */
export function ImpactBar({ receipt, onOpen }: { receipt: DirectImpactReceipt; onOpen: () => void }) {
  const t = useT();
  return (
    <div className="glass flex flex-wrap items-center gap-x-6 gap-y-1 rounded-full px-5 py-2" aria-label={t.impactAria}>
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {receipt.avoidedCigarettesHouseholdDay <= 0 && receipt.savedCo2GramsDay <= 0 ? (
          <p className="m-0 text-sm">
            <span className="label">{t.impactLabel}</span> {t.impactEmpty}
          </p>
        ) : (
          <>
            <p className="m-0 text-sm">
              <span className="label">{t.lungsProtected}</span>{" "}
              <strong className="serif text-2xl italic">
                −<AnimatedNumber value={receipt.avoidedCigarettesHouseholdDay} decimals={2} />
              </strong>{" "}
              <abbr title={t.cigEqTitle} className="no-underline">
                {t.cigEqPerDay}
              </abbr>
              {t.perDay}
            </p>
            <p className="m-0 text-sm">
              <span className="label">{t.skyProtected}</span>{" "}
              <strong className="serif text-2xl italic">
                −<AnimatedNumber value={receipt.savedCo2GramsDay} />
              </strong>{" "}
              {t.co2PerDay}
            </p>
          </>
        )}
      </div>
      <button type="button" onClick={onOpen} aria-label={t.viewReceipt} className="btn-primary ml-auto shrink-0">
        {t.receiptShort}
      </button>
    </div>
  );
}

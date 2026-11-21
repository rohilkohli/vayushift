"use client";
import type { DirectImpactReceipt } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { AnimatedNumber } from "./AnimatedNumber";
import { Icon } from "./Icon";

interface Props {
  receipt: DirectImpactReceipt;
  onOpenReceipt: () => void;
}

/** The "Daily Sanctuary Delta": cigarette-equivalents and CO₂ avoided today, with the way into the full receipt. */
export function DeltaCard({ receipt, onOpenReceipt }: Props) {
  const t = useT();
  return (
    <aside className="glass liquid lift relative w-full max-w-[390px] overflow-hidden rounded-[44px] p-8" aria-labelledby="delta-h">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ffdbce] opacity-50 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between">
        <h3 id="delta-h" className="label m-0 flex items-center gap-2">
          <Icon name="wb_twilight" className="accent" /> {t.deltaTitle}
        </h3>
      </div>
      <div className="relative mt-6" aria-live="polite" aria-atomic="true">
        <p className="m-0 flex items-baseline gap-2">
          <span className="serif text-[54px] italic leading-none">
            {receipt.avoidedCigarettesHouseholdDay > 0 && "−"}
            <AnimatedNumber value={receipt.avoidedCigarettesHouseholdDay} decimals={2} />
          </span>
          <span className="accent text-[13px] font-semibold">{t.cigEquivalent}</span>
        </p>
        <p className="ink-soft m-0 mt-1 text-[13px]">{t.neverInhaled}</p>
        <hr className="my-5 border-0 border-t border-current opacity-15" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="m-0 flex items-baseline gap-2">
              <span className="serif text-4xl italic leading-none">
                {receipt.savedCo2GramsDay > 0 && "−"}
                <AnimatedNumber value={receipt.savedCo2GramsDay} /> g
              </span>
              <span className="label">CO₂</span>
            </p>
            <p className="ink-soft m-0 mt-1 text-[13px]">{receipt.savedCo2GramsDay > 0 ? t.co2Shielded : t.co2Hint}</p>
          </div>
          <span className="chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Icon name="directions_subway" />
          </span>
        </div>
      </div>
      <button type="button" onClick={onOpenReceipt} className="btn-primary relative mt-6 w-full" aria-label={t.viewReceipt}>
        {t.fullReceipt}
      </button>
    </aside>
  );
}

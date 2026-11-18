import type { DirectImpactReceipt } from "@/lib/types";

/** Persistent summary shown on tabs that don't already have the Daily Sanctuary Delta card. */
export function ImpactBar({ receipt, onOpen }: { receipt: DirectImpactReceipt; onOpen: () => void }) {
  return (
    <div className="glass flex flex-wrap items-center gap-x-6 gap-y-1 rounded-full px-5 py-2" aria-label="Today's impact">
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="m-0 text-sm">
          <span className="label">Lungs protected</span>{" "}
          <strong className="serif text-2xl italic">−{receipt.avoidedCigarettesHouseholdDay}</strong>{" "}
          <abbr title="cigarette-equivalents" className="no-underline">cig-eq</abbr>/day
        </p>
        <p className="m-0 text-sm">
          <span className="label">Sky protected</span> <strong className="serif text-2xl italic">−{receipt.savedCo2GramsDay}</strong> g CO₂/day
        </p>
      </div>
      <button type="button" onClick={onOpen} aria-label="View full receipt" className="btn-primary ml-auto shrink-0">
        Receipt
      </button>
    </div>
  );
}

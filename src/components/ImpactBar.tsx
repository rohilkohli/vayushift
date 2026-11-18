import type { DirectImpactReceipt } from "@/lib/types";

export function ImpactBar({ receipt, onOpen }: { receipt: DirectImpactReceipt; onOpen: () => void }) {
  return (
    <div className="glass flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[2rem] px-4 py-2 md:px-5 md:py-3" aria-label="Today's impact">
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap gap-x-6 gap-y-1">
        <p className="m-0 text-sm">
          <span className="label">Lungs protected</span>{" "}
          <strong className="serif text-2xl">{receipt.avoidedCigarettesHouseholdDay}</strong> <abbr title="cigarette-equivalents" className="no-underline">cig-eq</abbr>/day
        </p>
        <p className="m-0 text-sm">
          <span className="label">Sky protected</span>{" "}
          <strong className="serif text-2xl">{receipt.savedCo2GramsDay}</strong> g CO₂/day
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label="View full receipt"
        className="ml-auto min-h-11 shrink-0 rounded-full bg-[#0f2a44] px-5 text-sm font-bold text-white"
      >
        Receipt
      </button>
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";
import { useLang } from "@/hooks/useLang";
import { useReceiptExplanation } from "@/hooks/useReceiptExplanation";
import { useReceiptSharing } from "@/hooks/useReceiptSharing";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";
import { Icon } from "./Icon";
import { ReceiptBody } from "./ReceiptBody";
import { ReceiptMethod } from "./ReceiptMethod";

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: DirectImpactReceipt;
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

/** What to show before anything is switched on: an invitation back to the routines. */
function EmptyReceipt({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  return (
    <div className="chip mt-5 rounded-3xl p-6 text-center">
      <Icon name="wb_twilight" className="accent !text-4xl" />
      <p className="serif m-0 mt-2 text-2xl">{t.emptyTitle}</p>
      <p className="ink-soft mx-auto mb-4 mt-1 max-w-sm text-sm">{t.emptyBody}</p>
      <button type="button" onClick={onClose} className="btn-primary">
        {t.backToRoutines}
      </button>
    </div>
  );
}

/** The "Lungs & Sky receipt" as a modal dialog: the figures, where they come from, and ways to share them. */
export function ReceiptDialog({ open, onClose, receipt, scenario, profile, interventions }: Props) {
  const { t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const explanation = useReceiptExplanation({ open, receipt, scenario, profile, interventions });
  const sharing = useReceiptSharing({ receipt, scenario, profile, interventions });
  const empty = receipt.avoidedCigarettesHouseholdDay <= 0 && receipt.savedCo2GramsDay <= 0;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="receipt-title"
      className="glass m-auto w-[min(42rem,calc(100%-2rem))] rounded-[2.5rem] border-0 p-0"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="receipt-title" className="serif m-0 text-3xl font-medium">
            {t.receiptTitle}
          </h2>
          <button type="button" onClick={onClose} className="pill">
            {t.close}
          </button>
        </div>
        {empty ? <EmptyReceipt onClose={onClose} /> : <ReceiptBody receipt={receipt} explanation={explanation} />}
        <ReceiptMethod />
        {!empty && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={sharing.copy} className="btn-primary">
              {t.copyReceipt}
            </button>
            <button type="button" onClick={sharing.copyLink} disabled={sharing.sharing} className="pill">
              {sharing.sharing ? t.creatingLink : t.copyLink}
            </button>
            <p role="status" aria-live="polite" className="m-0 text-sm font-semibold">
              {sharing.toast}
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}

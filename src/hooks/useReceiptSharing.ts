"use client";
import { useState } from "react";
import { createShareLink, track } from "@/lib/clientApi";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";
import { useT } from "./useLang";

interface Inputs {
  receipt: DirectImpactReceipt;
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

/** Copying the receipt text, or freezing it behind a short link and copying that. `toast` is the message to show. */
export function useReceiptSharing({ receipt, scenario, profile, interventions }: Inputs) {
  const t = useT();
  const [toast, setToast] = useState("");
  const [sharing, setSharing] = useState(false);
  const name = scenario.name === "Your location" ? t.yourLocation : scenario.name;
  const shareText = t.shareText(name, receipt.avoidedCigarettesHouseholdDay, receipt.savedCo2GramsDay);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast(t.receiptCopied);
      track({ event: "impact_receipt_shared", props: { share_type: "personal_receipt" } });
    } catch {
      setToast(t.receiptCopyFailed);
    }
  }

  /** The server recomputes every number from these inputs, so the link cannot show anything the engine did not produce. */
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

  return { toast, sharing, copy, copyLink };
}

/** Browser-side helpers for the VayuShift API. Nothing here runs on the server. */
import type { ActiveInterventions, HouseholdProfile } from "./types";

/** Every API error has the same envelope: { error: { code, message, requestId } }. */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export interface ShareInput {
  scenarioName: string;
  hourly: number[];
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

export interface ShareLink {
  id: string;
  url: string;
  expiresAt: number;
}

/** Freezes the current receipt behind a short link. The server recomputes every number from these inputs. */
export async function createShareLink(input: ShareInput): Promise<ShareLink> {
  const res = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res, "Could not create a share link. Please try again."));
  return (await res.json()) as ShareLink;
}

/** The five product events from the PRD, each with a small closed set of values (the server rejects anything else). */
export type TrackedEvent =
  | { event: "scenario_loaded"; props: { preset_id: string } }
  | { event: "routine_shift_toggled"; props: { intervention_key: string; enabled: boolean } }
  | { event: "room_scan_completed"; props: { source: "upload" | "preset" } }
  | { event: "filtration_option_selected"; props: { option_id: string } }
  | { event: "impact_receipt_shared"; props: { share_type: "personal_receipt" | "rwa_whatsapp" | "link" } };

/** True when the visitor has asked not to be measured (Global Privacy Control or Do Not Track). */
export function trackingOptedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || navigator.doNotTrack === "1";
}

/**
 * Fire-and-forget anonymous analytics. Sent only when the visitor has not opted out; the server keeps daily counters
 * and nothing that identifies anyone. Uses a beacon so it never delays or breaks the page, and swallows every failure.
 */
export function track(e: TrackedEvent): void {
  try {
    if (trackingOptedOut()) return;
    const body = JSON.stringify(e);
    const sent = navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }));
    if (!sent)
      void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
        () => undefined,
      );
  } catch {
    /* analytics must never affect the app */
  }
}

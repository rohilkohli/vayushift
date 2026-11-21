"use client";
import { useRef, useState } from "react";
import type { Messages } from "@/lib/i18n";
import { apiErrorMessage, track } from "@/lib/clientApi";
import { downscaleToJpegBase64 } from "@/lib/imageResize";
import type { RoomScan } from "@/lib/roomScan";
import type { HouseholdProfile } from "@/lib/types";
import { useT } from "./useLang";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PICKED_BYTES = 20 * 1024 * 1024;

type ScanReply = { scan?: RoomScan; fallback?: boolean; reason?: string };

/** The household fields a scan can fill in. Windows are left alone when none were visible. */
function profilePatchFrom(s: RoomScan): Partial<HouseholdProfile> {
  const gas = s.cookingApplianceDetected === "lpg_unvented" || s.cookingApplianceDetected === "both";
  return {
    roomAreaSqFt: s.estimatedAreaSqFt,
    ceilingHeightFt: s.estimatedCeilingHeightFt,
    ...(s.windowType !== "none_visible" ? { windowType: s.windowType } : {}),
    ...(gas
      ? { baselineCookingFuel: s.exhaustTypeDetected === "ducted_chimney" ? ("lpg_chimney" as const) : ("lpg_unvented" as const) }
      : {}),
  };
}

/** What to tell the visitor when the server answered without a usable scan. */
function missingScanMessage(reason: string | undefined, t: Messages): string {
  if (reason === "not_a_room") return t.msgNotRoom;
  if (reason === "budget_exhausted") return t.msgBudget;
  return t.msgUnavailable;
}

/** Why a picked file cannot be analysed, or null if it can. */
function fileProblem(file: File, t: Messages): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return t.msgBadType;
  return file.size > MAX_PICKED_BYTES ? t.msgTooLarge : null;
}

/**
 * Room details from a sample room or an uploaded photo. A photo is resized on the device, sent once to the server
 * for analysis and never stored; any failure leaves the manual sliders in charge and says why.
 */
export function useRoomScan(onProfile: (p: Partial<HouseholdProfile>) => void) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scan, setScan] = useState<RoomScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function applyScan(s: RoomScan, note: string, source: "upload" | "preset") {
    track({ event: "room_scan_completed", props: { source } });
    setScan(s);
    onProfile(profilePatchFrom(s));
    setMessage(note);
  }

  async function analyse(file: File) {
    const data = await downscaleToJpegBase64(file);
    const res = await fetch("/api/analyze-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: "image/jpeg", data }),
    });
    if (!res.ok) return setMessage(await apiErrorMessage(res, t.msgGeneric));
    const body = (await res.json()) as ScanReply;
    if (body.scan) applyScan(body.scan, t.msgAnalysed, "upload");
    else setMessage(missingScanMessage(body.reason, t));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = fileProblem(file, t);
    if (problem) return setMessage(problem);
    setBusy(true);
    setMessage(t.msgInspecting);
    try {
      await analyse(file);
    } catch {
      setMessage(t.msgUnreadable);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return { busy, message, scan, fileRef, applyScan, onFile };
}

"use client";
import { useMemo, useRef, useState } from "react";
import { EPDM_COST_INR, FILTERS } from "@/lib/constants";
import { compareFilters } from "@/lib/impactEngine";
import { downscaleToJpegBase64 } from "@/lib/imageResize";
import { SAMPLE_ROOMS, type RoomScan } from "@/lib/roomScan";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, FiltrationMode, HouseholdProfile, WindowType } from "@/lib/types";
import { Switch } from "./Switch";

interface Props {
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

const WINDOW_LABELS: Record<WindowType, string> = {
  sliding_aluminum_unsealed: "Aluminium sliding, unsealed",
  casement_wood_unsealed: "Wooden casement, unsealed",
  upvc_sealed: "uPVC, sealed",
};

export function IndoorLab({ scenario, profile, interventions, receipt, onProfile, onInterventions }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scan, setScan] = useState<RoomScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = useMemo(
    () => compareFilters(scenario.hourly, profile, interventions.sealWindowsWithEpdm),
    [scenario, profile, interventions.sealWindowsWithEpdm],
  );

  function applyScan(s: RoomScan, note: string) {
    setScan(s);
    onProfile({
      roomAreaSqFt: s.estimatedAreaSqFt,
      ceilingHeightFt: s.estimatedCeilingHeightFt,
      ...(s.windowType !== "none_visible" ? { windowType: s.windowType } : {}),
      ...(s.cookingApplianceDetected === "lpg_unvented" || s.cookingApplianceDetected === "both"
        ? { baselineCookingFuel: s.exhaustTypeDetected === "ducted_chimney" ? ("lpg_chimney" as const) : ("lpg_unvented" as const) }
        : {}),
    });
    setMessage(note);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Please choose a JPEG, PNG or WebP photo.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("That photo is too large. Try a smaller one.");
      return;
    }
    setBusy(true);
    setMessage("Inspecting window seals, stove type and room size…");
    try {
      const data = await downscaleToJpegBase64(file);
      const res = await fetch("/api/analyze-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: "image/jpeg", data }),
      });
      const body = (await res.json()) as { scan?: RoomScan; fallback?: boolean; reason?: string; error?: string };
      if (body.scan) applyScan(body.scan, "Room analysed. You can fine-tune the values below.");
      else if (body.reason === "not_a_room")
        setMessage("We couldn't detect an indoor room, so the manual sliders are in use. Pick a sample room or adjust the values.");
      else if (body.fallback) setMessage("Photo analysis is unavailable right now. Use a sample room or the manual sliders.");
      else setMessage(body.error ?? "Something went wrong. Use the manual sliders instead.");
    } catch {
      setMessage("Could not read that photo. Use a sample room or the manual sliders.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const noiseTip =
    profile.sleepNoiseSensitivity === "high"
      ? "You are a light sleeper: run a DIY box on high from 18:00 to 22:00, then switch it off at bedtime, or choose the HEPA unit."
      : profile.sleepNoiseSensitivity === "medium"
        ? "Run DIY boxes on high in the evening and on low overnight."
        : "DIY boxes can run on a low setting overnight.";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        <div>
          <p className="label">Indoor Air Lab</p>
          <h2 className="serif mt-2 text-4xl font-medium leading-tight">Size clean air for your room.</h2>
          <p className="mt-3 text-lg text-[#3b4f66]">
            Choose a sample room, or upload a photo. Photos are resized on your device, stripped of location data, analysed once
            and never stored.
          </p>
        </div>

        <section className="glass rounded-[2rem] p-5" aria-labelledby="scan-h">
          <h3 id="scan-h" className="label">Scan a room</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_ROOMS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => applyScan(r.scan, `Loaded sample: ${r.label}.`)}
                className="min-h-11 rounded-full border-2 border-[#0f2a44] bg-white px-4 text-sm font-bold"
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label htmlFor="room-photo" className="block text-sm font-semibold">Upload a room photo (JPEG, PNG or WebP)</label>
            <input
              id="room-photo"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1 block min-h-11 w-full text-sm"
            />
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-semibold">{message}</p>
          {scan && (
            <ul className="mt-2 list-disc pl-5 text-sm text-[#3b4f66]">
              {scan.infiltrationRiskNotes.map((n) => <li key={n}>{n}</li>)}
              {scan.recommendedPlacementSpot && <li>Placement: {scan.recommendedPlacementSpot}</li>}
            </ul>
          )}
        </section>

        <section className="glass rounded-[2rem] p-5" aria-labelledby="room-h">
          <h3 id="room-h" className="label">Room details</h3>
          <div className="mt-3 space-y-4">
            <label className="block text-sm font-semibold">
              Floor area: {profile.roomAreaSqFt} sq ft
              <input type="range" min={60} max={500} step={10} value={profile.roomAreaSqFt}
                onChange={(e) => onProfile({ roomAreaSqFt: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              Ceiling height: {profile.ceilingHeightFt} ft
              <input type="range" min={8} max={12} step={0.5} value={profile.ceilingHeightFt}
                onChange={(e) => onProfile({ ceilingHeightFt: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              Windows
              <select value={profile.windowType} onChange={(e) => onProfile({ windowType: e.target.value as WindowType })}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3">
                {Object.entries(WINDOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Sensitivity to night-time noise
              <select value={profile.sleepNoiseSensitivity}
                onChange={(e) => onProfile({ sleepNoiseSensitivity: e.target.value as HouseholdProfile["sleepNoiseSensitivity"] })}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (light sleeper)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-5" aria-labelledby="cadr-h">
          <h3 id="cadr-h" className="label">Target</h3>
          <p className="serif m-0 mt-2 text-5xl">{receipt.requiredCadrM3h} <span className="text-xl">m³/h</span></p>
          <p className="m-0 text-sm text-[#3b4f66]">
            Clean air delivery needed for 5 air changes an hour in {receipt.roomVolumeM3} m³.
          </p>
          <p className="mt-3 text-sm font-semibold">
            Modelled indoor PM2.5 now: {receipt.baselineIndoorPm25} µg/m³ → with your choices: {receipt.managedIndoorPm25} µg/m³
            ({receipt.indoorReductionPct}% lower). This is a model, not a sensor reading.
          </p>
        </section>
      </div>

      <div className="space-y-4">
        <h3 className="label">Filtration options</h3>
        <ul className="m-0 list-none space-y-4 p-0">
          {options.map((o) => {
            const f = FILTERS[o.id];
            const selected = interventions.filtrationMode === o.id;
            return (
              <li key={o.id} className={`glass rounded-[2rem] p-5 ${selected ? "ring-4 ring-[#0a6b63]" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="serif m-0 text-2xl font-medium">{f.name}</h4>
                  <p className="serif m-0 text-2xl">₹{f.costInr.toLocaleString("en-IN")}</p>
                </div>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-sm font-semibold">
                  <li className="rounded-full bg-white px-3 py-1">Modelled in your room: {o.modelledReductionPct}% lower PM2.5</li>
                  <li className="rounded-full bg-white px-3 py-1">Published result: about {f.literatureReductionPct}%</li>
                  <li className="rounded-full bg-white px-3 py-1">Field CADR ≈ {o.cadrFieldM3h} m³/h</li>
                  <li className="rounded-full bg-white px-3 py-1">
                    Noise: {f.noiseDeltaDbDay ? `+${f.noiseDeltaDbDay} dB day, +${f.noiseDeltaDbNight} dB night` : "quiet"}
                  </li>
                </ul>
                <p className="mt-3 text-sm text-[#3b4f66]">{f.note}</p>
                <p className="m-0 text-sm font-semibold">
                  {o.meetsTargetAch ? "Meets the 5 air-change target for this room." : "Below the 5 air-change target alone; fine for a smaller room or paired with sealing."}
                </p>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onInterventions({ filtrationMode: (selected ? "none" : o.id) as FiltrationMode })}
                  className={`mt-3 min-h-11 rounded-full border-2 border-[#0f2a44] px-5 text-sm font-bold ${
                    selected ? "bg-[#0f2a44] text-white" : "bg-white text-[#0f2a44]"
                  }`}
                >
                  {selected ? "✓ Selected" : "Select this option"}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="glass flex items-center gap-4 rounded-[2rem] p-5">
          <div className="flex-1">
            <p id="epdm-d" className="m-0 font-bold">EPDM foam seal for window tracks · ₹{EPDM_COST_INR}</p>
            <p className="m-0 text-sm text-[#3b4f66]">Cuts outdoor air leaking into the room by about 30%.</p>
          </div>
          <Switch checked={interventions.sealWindowsWithEpdm} onChange={(v) => onInterventions({ sealWindowsWithEpdm: v })} label="Add EPDM window seal" describedBy="epdm-d" />
        </div>

        <aside className="glass rounded-[2rem] p-5 text-sm" aria-labelledby="tips-h">
          <h4 id="tips-h" className="label">Sleep and safety</h4>
          <p className="mt-2">{noiseTip}</p>
          <ul className="list-disc pl-5">
            <li>Use only a certified box fan with thermal protection. Never leave a damaged fan running.</li>
            <li>Use pleated filters rated MERV-13 or better; swap them when visibly dirty.</li>
            <li>Avoid purifiers that make ozone.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

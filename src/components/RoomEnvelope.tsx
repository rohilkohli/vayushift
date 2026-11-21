"use client";
import type { CSSProperties } from "react";
import type { useRoomScan } from "@/hooks/useRoomScan";
import { useLang } from "@/hooks/useLang";
import { SAMPLE_ROOMS } from "@/lib/roomScan";
import type { HouseholdProfile, WindowType } from "@/lib/types";
import { Icon } from "./Icon";

type Scanner = ReturnType<typeof useRoomScan>;
type OnProfile = (p: Partial<HouseholdProfile>) => void;

const WINDOW_TYPES: WindowType[] = ["sliding_aluminum_unsealed", "casement_wood_unsealed", "upvc_sealed"];

/** The fill of a range slider's track, as a percentage of its span. */
const fill = (value: number, min: number, max: number): CSSProperties =>
  ({ "--p": `${((value - min) / (max - min)) * 100}%` }) as CSSProperties;

/** Floor area and ceiling height sliders. */
function RoomSliders({ profile, onProfile }: { profile: HouseholdProfile; onProfile: OnProfile }) {
  const { t } = useLang();
  return (
    <>
      <label className="mt-4 block text-sm font-semibold">
        {t.floorArea(profile.roomAreaSqFt)}
        <input
          type="range"
          min={60}
          max={500}
          step={10}
          value={profile.roomAreaSqFt}
          style={fill(profile.roomAreaSqFt, 60, 500)}
          onChange={(e) => onProfile({ roomAreaSqFt: Number(e.target.value) })}
          className="mt-1 block h-11 w-full"
        />
      </label>
      <label className="block text-sm font-semibold">
        {t.ceilingHeight(profile.ceilingHeightFt)}
        <input
          type="range"
          min={8}
          max={12}
          step={0.5}
          value={profile.ceilingHeightFt}
          style={fill(profile.ceilingHeightFt, 8, 12)}
          onChange={(e) => onProfile({ ceilingHeightFt: Number(e.target.value) })}
          className="block h-11 w-full"
        />
      </label>
    </>
  );
}

/** Window type and night-time noise sensitivity. */
function WindowsAndSleep({ profile, onProfile }: { profile: HouseholdProfile; onProfile: OnProfile }) {
  const { t } = useLang();
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">
        {t.windows}
        <select value={profile.windowType} onChange={(e) => onProfile({ windowType: e.target.value as WindowType })} className="field">
          {WINDOW_TYPES.map((k) => (
            <option key={k} value={k}>
              {t.windowType[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t.noiseLabel}
        <select
          value={profile.sleepNoiseSensitivity}
          onChange={(e) => onProfile({ sleepNoiseSensitivity: e.target.value as HouseholdProfile["sleepNoiseSensitivity"] })}
          className="field"
        >
          <option value="low">{t.noiseLow}</option>
          <option value="medium">{t.noiseMedium}</option>
          <option value="high">{t.noiseHigh}</option>
        </select>
      </label>
    </div>
  );
}

/** Sample rooms: fill in the room with no upload, no network and no API key. */
function SampleRooms({ scanner }: { scanner: Scanner }) {
  const { t, englishAttrs } = useLang();
  const { scan, applyScan } = scanner;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {SAMPLE_ROOMS.map((r) => (
        <button
          key={r.id}
          type="button"
          className="pill"
          aria-pressed={scan === r.scan}
          onClick={() => applyScan(r.scan, t.sampleLoaded(r.label), "preset")}
        >
          <span {...englishAttrs}>{r.label}</span>
        </button>
      ))}
    </div>
  );
}

/** The optional photo upload, and what the scan said and found. */
function PhotoUpload({ scanner }: { scanner: Scanner }) {
  const { t, englishAttrs } = useLang();
  const { scan, busy, message, fileRef, onFile } = scanner;
  return (
    <>
      <div className="mt-4">
        <label htmlFor="room-photo" className="block text-sm font-semibold">
          {t.scanLabel}
        </label>
        <input
          id="room-photo"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="mt-1 block min-h-11 w-full text-sm"
        />
        <p className="ink-soft m-0 text-xs">{t.scanPrivacy}</p>
      </div>
      <p role="status" aria-live="polite" className="m-0 mt-2 min-h-6 text-sm font-semibold">
        {message}
      </p>
      {scan && (
        <ul className="ink-soft m-0 list-disc pl-5 text-sm">
          {scan.infiltrationRiskNotes.map((n) => (
            <li key={n} {...englishAttrs}>
              {n}
            </li>
          ))}
          {scan.recommendedPlacementSpot && <li {...englishAttrs}>{t.placement(scan.recommendedPlacementSpot)}</li>}
        </ul>
      )}
    </>
  );
}

interface Props {
  profile: HouseholdProfile;
  onProfile: OnProfile;
  scanner: Scanner;
}

/** The room: its size, windows and sleep sensitivity, with sample rooms and an optional photo to fill them in. */
export function RoomEnvelope({ profile, onProfile, scanner }: Props) {
  const t = useLang().t;
  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="env-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="env-h" className="serif m-0 flex items-center gap-2 text-xl font-medium">
          <Icon name="crop_square" /> {t.envelope}
        </h3>
        <p className="chip m-0 rounded-full px-3 py-1 text-xs font-bold">{t.envelopeChip(profile.roomAreaSqFt, profile.ceilingHeightFt)}</p>
      </div>
      <RoomSliders profile={profile} onProfile={onProfile} />
      <SampleRooms scanner={scanner} />
      <WindowsAndSleep profile={profile} onProfile={onProfile} />
      <PhotoUpload scanner={scanner} />
    </section>
  );
}

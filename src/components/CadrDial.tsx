"use client";
import { fieldCadrM3h } from "@/lib/impactEngine";
import type { DirectImpactReceipt, FiltrationMode } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { AnimatedNumber } from "./AnimatedNumber";
import { Icon } from "./Icon";

interface Props {
  receipt: DirectImpactReceipt;
  filtration: FiltrationMode;
}

const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The ring: a faint track, an arc filled to `progress` (0 to 1), and a dotted inner circle. */
function Ring({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e9a23b" />
          <stop offset="100%" stopColor="#c25a32" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="130" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
      <circle
        cx="130"
        cy="130"
        r={RADIUS}
        fill="none"
        className="ring-progress"
        strokeOpacity={progress > 0 ? 1 : 0}
        stroke="url(#ringGrad)"
        style={{ filter: "drop-shadow(0 0 6px rgba(226, 120, 80, 0.55))" }}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
      />
      <circle
        cx="130"
        cy="130"
        r={RADIUS - 14}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeDasharray="3 6"
      />
    </svg>
  );
}

/** The ring that fills as the chosen filter approaches the clean air delivery the room needs (5 air changes an hour). */
export function CadrDial({ receipt, filtration }: Props) {
  const t = useT();
  const active = filtration !== "none";
  const fieldCadr = Math.round(fieldCadrM3h(filtration));
  const ach = receipt.roomVolumeM3 > 0 ? fieldCadr / receipt.roomVolumeM3 : 0;
  const progress = Math.min(1, fieldCadr / Math.max(1, receipt.requiredCadrM3h));
  return (
    <div
      className="glass relative mx-auto flex aspect-square w-full max-w-[400px] flex-col items-center justify-center rounded-full p-10 text-center"
      role="group"
      aria-label={t.dialAria}
    >
      <Ring progress={progress} />
      <p className="chip relative m-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
        <span className="h-2 w-2 rounded-full bg-[#c25a32]" aria-hidden="true" />
        {active ? t.dialActive : t.dialNone}
      </p>
      <p className="serif relative m-0 mt-3 text-7xl leading-none" aria-live="polite">
        <AnimatedNumber value={active ? fieldCadr : receipt.requiredCadrM3h} />
        <span className="ink-soft ml-1 text-2xl">m³/h</span>
      </p>
      <p className="label relative m-0 mt-2">{active ? t.dialCadr : t.dialTarget}</p>
      <p className="chip relative m-0 mt-4 rounded-full px-4 py-1.5 text-xs font-semibold">
        PM2.5 {receipt.baselineIndoorPm25} → {receipt.managedIndoorPm25} µg/m³
        {receipt.indoorReductionPct > 0 && <span className="accent ml-2 font-bold">−{Math.round(receipt.indoorReductionPct)}%</span>}
      </p>
      <p className="ink-soft relative m-0 mt-3 flex items-center gap-1 text-xs font-medium">
        <Icon name="autorenew" />
        {active && ach > 0 ? t.turnover(Math.round(60 / ach), ach.toFixed(1)) : t.roomVolume(receipt.roomVolumeM3)}
      </p>
    </div>
  );
}

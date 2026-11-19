"use client";
import { Icon } from "./Icon";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  subtitle: string;
  icon: string;
  /** Cigarette-equivalents this action avoids per day (shown whether on or off). */
  cig?: number;
  describedBy?: string;
}

/** Frosted pill that is also a real switch. On/Off is written as text, not just shown by fill. */
export function RoutineToggle({ checked, onChange, title, subtitle, icon, cig, describedBy }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`glass liquid press flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-[2rem] px-5 py-3 text-left hover:-translate-y-0.5 ${
        checked ? "ring-2 ring-[#ffad8f]" : ""
      }`}
      style={checked ? { boxShadow: "0 12px 28px -6px rgba(255,173,143,0.55)" } : undefined}
    >
      <span className="flex items-center gap-3">
        <Icon name={icon} className={checked ? "accent" : "ink-soft"} />
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold leading-tight">{title}</span>
          <span id={describedBy} className={`text-[11px] leading-tight ${checked ? "accent font-semibold" : "ink-soft"}`}>
            {subtitle}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {cig !== undefined && (
          <span className="chip rounded-full px-2.5 py-0.5 text-[11px] font-bold">−{cig} cig</span>
        )}
        <span key={String(checked)} className="pop text-[10px] font-bold uppercase tracking-widest">{checked ? "✓ On" : "Off"}</span>
      </span>
    </button>
  );
}

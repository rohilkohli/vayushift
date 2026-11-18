"use client";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  describedBy?: string;
}

/** Accessible toggle: a real button with role="switch". State is conveyed by text, not colour alone. */
export function Switch({ checked, onChange, label, describedBy }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition-colors ${
        checked ? "border-[#0f2a44] bg-[#0f2a44] text-white" : "border-[#0f2a44] bg-white text-[#0f2a44]"
      }`}
    >
      <span aria-hidden="true">{checked ? "✓" : "○"}</span>
      {checked ? "On" : "Off"}
    </button>
  );
}

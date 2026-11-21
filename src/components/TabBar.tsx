"use client";
import type { RefObject } from "react";
import { useT } from "@/hooks/useLang";
import { Icon } from "./Icon";

export interface TabDef {
  id: string;
  label: string;
  /** Shorter label for the phone bottom bar so it never wraps. */
  short: string;
  icon: string;
}

interface Props {
  tabs: readonly TabDef[];
  tab: string;
  onTab: (id: string) => void;
  tabRefs: RefObject<Array<HTMLButtonElement | null>>;
}

/** The tab list: a floating bar at the bottom on a phone, part of the header on a wide screen. Arrow keys move between tabs. */
export function TabBar({ tabs, tab, onTab, tabRefs }: Props) {
  const t = useT();
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    onTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={t.sections}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      className="pointer-events-auto glass fixed inset-x-5 z-50 flex items-center justify-between gap-1 rounded-full p-1.5 lg:static lg:inset-auto lg:justify-start"
    >
      {tabs.map((def, i) => (
        <button
          key={def.id}
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          id={`tab-${def.id}`}
          role="tab"
          type="button"
          aria-selected={tab === def.id}
          aria-controls={`panel-${def.id}`}
          tabIndex={tab === def.id ? 0 : -1}
          onClick={() => onTab(def.id)}
          onKeyDown={(e) => onKey(e, i)}
          className="pill flex-1 !px-4 !text-[13px] lg:flex-none lg:!px-5"
          style={{ background: tab === def.id ? undefined : "transparent" }}
        >
          <Icon name={def.icon} className="lg:hidden" />
          <span aria-hidden="true" className="lg:hidden">
            {def.short}
          </span>
          <span aria-hidden="true" className="hidden lg:inline">
            {def.label}
          </span>
          <span className="sr-only">{def.label}</span>
        </button>
      ))}
    </div>
  );
}

import type { RefObject } from "react";
import type { AirScenario } from "@/lib/types";
import { Icon } from "./Icon";

export interface TabDef {
  id: string;
  label: string;
  /** Shorter label for the phone bottom bar so it never wraps. */
  short: string;
  icon: string;
}

interface Props {
  scenario: AirScenario;
  presets: readonly AirScenario[];
  onSelect: (s: AirScenario) => void;
  onLocate: () => void;
  loadingLive: boolean;
  tabs: readonly TabDef[];
  tab: string;
  onTab: (id: string) => void;
  tabRefs: RefObject<Array<HTMLButtonElement | null>>;
}

export function Header({ scenario, presets, onSelect, onLocate, loadingLive, tabs, tab, onTab, tabRefs }: Props) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    onTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 pt-3 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pt-5">
        <div className="pointer-events-auto glass flex w-full min-w-0 items-center gap-2 self-start rounded-full py-1.5 pl-4 pr-1.5 lg:w-auto">
          <span className="flex items-center gap-2 pr-1">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full ping-soft rounded-full bg-[#ffb59a] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8c4e35]" />
            </span>
            <h1 className="serif m-0 text-[22px] font-medium leading-none tracking-tight">VayuShift</h1>
            <span className="label hidden sm:inline">· New Delhi</span>
          </span>
          <span className="hidden h-4 w-px bg-current opacity-20 sm:block" aria-hidden="true" />
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">Choose a scenario</legend>
            <div className="no-scrollbar fade-x flex snap-x items-center gap-1 overflow-x-auto pr-4">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={scenario.id === p.id}
                  onClick={() => onSelect(p)}
                  className="pill whitespace-nowrap !px-3 !text-[11px]"
                >
                  {p.name}
                </button>
              ))}
              <button type="button" onClick={onLocate} disabled={loadingLive} className="pill whitespace-nowrap !px-3 !text-[11px]" aria-label="Use my location">
                <Icon name="near_me" />
                <span className="hidden md:inline">{loadingLive ? "Locating…" : "My location"}</span>
              </button>
            </div>
          </fieldset>
        </div>

        <div
          role="tablist"
          aria-label="Sections"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          className="pointer-events-auto glass fixed inset-x-5 z-50 flex items-center justify-between gap-1 rounded-full p-1.5 lg:static lg:inset-auto lg:justify-start"
        >
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => onTab(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="pill flex-1 !px-4 !text-[13px] lg:flex-none lg:!px-5"
              style={{ background: tab === t.id ? undefined : "transparent" }}
            >
              <Icon name={t.icon} className="lg:hidden" />
              <span aria-hidden="true" className="lg:hidden">{t.short}</span>
              <span aria-hidden="true" className="hidden lg:inline">{t.label}</span>
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

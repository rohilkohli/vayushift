"use client";
import type { RefObject } from "react";
import type { AirScenario } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { CityPicker } from "./CityPicker";
import { Icon } from "./Icon";
import { TabBar, type TabDef } from "./TabBar";

export type { TabDef };

interface Props {
  scenario: AirScenario;
  presets: readonly AirScenario[];
  onSelect: (s: AirScenario) => void;
  onLocate: () => void;
  /** The city picked from the list (null when a demo scenario or "my location" is showing) and the handler for picking one. */
  cityId: string | null;
  onCity: (id: string) => void;
  loadingLive: boolean;
  tabs: readonly TabDef[];
  tab: string;
  onTab: (id: string) => void;
  tabRefs: RefObject<Array<HTMLButtonElement | null>>;
  highContrast: boolean;
  onToggleContrast: () => void;
}

const PILL = "pill whitespace-nowrap !px-3 !text-[11px]";

/** The fixed top bar: the name, where to look (city, my location), the contrast and language switches, and the tabs. */
export function Header(props: Props) {
  const { lang, t, setLang } = useLang();
  const otherLang = lang === "en" ? "hi" : "en";
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
          </span>
          <span className="hidden h-4 w-px bg-current opacity-20 sm:block" aria-hidden="true" />
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{t.chooseScenario}</legend>
            <div className="no-scrollbar fade-x flex snap-x items-center gap-1 overflow-x-auto pr-4">
              <CityPicker
                scenario={props.scenario}
                presets={props.presets}
                cityId={props.cityId}
                disabled={props.loadingLive}
                onSelect={props.onSelect}
                onCity={props.onCity}
              />
              <button type="button" onClick={props.onLocate} disabled={props.loadingLive} className={PILL} aria-label={t.useMyLocation}>
                <Icon name="near_me" />
                <span className="hidden md:inline">{props.loadingLive ? t.locating : t.myLocation}</span>
              </button>
              <button
                type="button"
                onClick={props.onToggleContrast}
                aria-pressed={props.highContrast}
                aria-label={t.highContrast}
                title={t.highContrast}
                className={PILL}
              >
                <Icon name="contrast" />
                <span className="hidden 2xl:inline">{t.highContrast}</span>
              </button>
              {/* The label is written in the language you would switch TO, and marked as such for screen readers. */}
              <button
                type="button"
                onClick={() => setLang(otherLang)}
                className={PILL}
                aria-label={t.switchLanguage}
                title={t.switchLanguage}
              >
                <Icon name="translate" />
                <span lang={otherLang}>{t.languageButton}</span>
              </button>
            </div>
          </fieldset>
        </div>
        <TabBar tabs={props.tabs} tab={props.tab} onTab={props.onTab} tabRefs={props.tabRefs} />
      </div>
    </header>
  );
}

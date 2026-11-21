"use client";
import { CITIES } from "@/lib/cities";
import type { AirScenario } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { Icon } from "./Icon";

const DEMO_PREFIX = "demo:";

interface Props {
  scenario: AirScenario;
  presets: readonly AirScenario[];
  /** The city picked from the list, or null when a demo scenario or the visitor's own location is showing. */
  cityId: string | null;
  disabled: boolean;
  onSelect: (s: AirScenario) => void;
  onCity: (id: string) => void;
}

/** One list for everything the visitor can look at: the live cities, then the three Delhi demo scenarios. */
export function CityPicker({ scenario, presets, cityId, disabled, onSelect, onCity }: Props) {
  const t = useT();
  // What the list shows as chosen: the picked city, else the demo scenario on screen, else nothing (a live location).
  const value = cityId ?? (presets.some((p) => p.id === scenario.id) ? `${DEMO_PREFIX}${scenario.id}` : "");

  const choose = (v: string) => {
    const demo = v.startsWith(DEMO_PREFIX) ? presets.find((p) => p.id === v.slice(DEMO_PREFIX.length)) : undefined;
    if (demo) onSelect(demo);
    else if (v) onCity(v);
  };

  return (
    <label className="pill relative whitespace-nowrap !pl-3 !pr-2 !text-[11px]">
      <Icon name="location_city" />
      <span className="sr-only">{t.chooseCity}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => choose(e.target.value)}
        className="cursor-pointer appearance-none border-0 bg-transparent font-[inherit] text-[11px] font-bold text-inherit outline-none"
      >
        <option value="" disabled>
          {t.pickCity}
        </option>
        <optgroup label={t.liveCities}>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {t.cityName[c.id] ?? c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label={t.demoScenarios}>
          {presets.map((p) => (
            <option key={p.id} value={`${DEMO_PREFIX}${p.id}`}>
              {p.name}
            </option>
          ))}
        </optgroup>
      </select>
      <Icon name="expand_more" />
    </label>
  );
}

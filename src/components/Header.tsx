import { GRAP_INFO } from "@/lib/grapRules";
import type { AirScenario, GrapStage } from "@/lib/types";

interface Props {
  scenario: AirScenario;
  presets: readonly AirScenario[];
  onSelect: (s: AirScenario) => void;
  onLocate: () => void;
  loadingLive: boolean;
  aqi: number;
  pm25: number;
  stage: GrapStage;
}

export function Header({ scenario, presets, onSelect, onLocate, loadingLive, aqi, pm25, stage }: Props) {
  const info = GRAP_INFO[stage];
  const isLive = scenario.source === "live";
  return (
    <header className="mx-auto max-w-6xl px-5 pt-5">
      <div className="glass flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[2rem] px-5 py-4">
        <h1 className="serif text-3xl font-medium">VayuShift</h1>
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Choose a scenario</legend>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={scenario.id === p.id}
                onClick={() => onSelect(p)}
                className={`min-h-11 rounded-full border-2 border-[#0f2a44] px-4 text-sm font-bold ${
                  scenario.id === p.id ? "bg-[#0f2a44] text-white" : "bg-white text-[#0f2a44]"
                }`}
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onLocate}
              disabled={loadingLive}
              className="min-h-11 rounded-full border-2 border-[#8c3f22] bg-white px-4 text-sm font-bold text-[#8c3f22] disabled:opacity-60"
            >
              {loadingLive ? "Locating…" : "Use my location"}
            </button>
          </div>
        </fieldset>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="rounded-full bg-white px-3 py-2">
            Now: AQI {aqi} · PM2.5 {pm25} µg/m³
          </span>
          <span className="rounded-full bg-[#fde7d3] px-3 py-2 text-[#6b2d14]">
            {stage === "NONE" ? "GRAP: not active" : `GRAP Stage ${info.roman} · ${info.category}`}
          </span>
          <span className="rounded-full bg-white px-3 py-2">{isLive ? "Live forecast" : "Demo telemetry"}</span>
        </div>
      </div>
    </header>
  );
}

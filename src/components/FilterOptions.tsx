"use client";
import { EPDM_COST_INR, FILTERS } from "@/lib/constants";
import type { compareFilters } from "@/lib/impactEngine";
import type { ActiveInterventions, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { Icon } from "./Icon";
import { RoutineToggle } from "./RoutineToggle";

type Options = ReturnType<typeof compareFilters>;

interface Props {
  options: Options;
  receipt: DirectImpactReceipt;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

/** One filter option: cost, modelled and published reduction, airflow, noise, and the button to choose it. */
function FilterCard({
  option,
  rank,
  selected,
  onToggle,
}: {
  option: Options[number];
  rank: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t, englishAttrs } = useLang();
  const f = FILTERS[option.id];
  return (
    <li className={`glass liquid lift rounded-[2.2rem] p-6 ${selected ? "ring-2 ring-[#c25a32]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 flex flex-wrap items-center gap-2">
            {rank === 0 && (
              <span className="rounded-full bg-[#ffdbce] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6f3720]">
                {t.bestValue}
              </span>
            )}
            <span className="label">{option.meetsTargetAch ? t.meetsTarget : t.belowTarget}</span>
          </p>
          <h4 className="serif m-0 mt-1 text-2xl font-medium" {...englishAttrs}>
            {f.name}
          </h4>
        </div>
        <p className="serif m-0 text-2xl">₹{f.costInr.toLocaleString("en-IN")}</p>
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-xs font-semibold">
        <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1">
          <Icon name="blur_on" /> {t.modelled(option.modelledReductionPct)}
        </li>
        <li className="chip rounded-full px-3 py-1">{t.published(f.literatureReductionPct)}</li>
        <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1">
          <Icon name="air" /> {t.cadrApprox(option.cadrFieldM3h)}
        </li>
        <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1">
          <Icon name="volume_up" /> {f.noiseDeltaDbDay ? t.noiseDb(f.noiseDeltaDbDay, f.noiseDeltaDbNight) : t.quiet}
        </li>
      </ul>
      <p className="ink-soft m-0 mt-3 text-sm" {...englishAttrs}>
        {f.note}
      </p>
      <div className="mt-4 flex justify-end">
        <button type="button" aria-pressed={selected} onClick={onToggle} className="pill">
          {selected ? t.configured : t.selectConfig}
        </button>
      </div>
    </li>
  );
}

const NOISE_TIP = { high: "tipHigh", medium: "tipMedium", low: "tipLow" } as const;

/** The right-hand column of Room Sanctuary: the filters ranked for this room, the window seal, and sleep and safety tips. */
export function FilterOptions({ options, receipt, profile, interventions, onInterventions }: Props) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <p className="label scrim inline-flex items-center gap-2 rounded-full px-4 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ffad8f]" aria-hidden="true" /> {t.filtersBadge(receipt.requiredCadrM3h)}
      </p>
      <ul className="stagger m-0 list-none space-y-4 p-0">
        {options.map((o, idx) => {
          const selected = interventions.filtrationMode === o.id;
          return (
            <FilterCard
              key={o.id}
              option={o}
              rank={idx}
              selected={selected}
              onToggle={() => onInterventions({ filtrationMode: selected ? "none" : o.id })}
            />
          );
        })}
      </ul>
      <RoutineToggle
        icon="door_front"
        title={t.epdmTitle(EPDM_COST_INR)}
        subtitle={t.epdmSub}
        checked={interventions.sealWindowsWithEpdm}
        onChange={(v) => onInterventions({ sealWindowsWithEpdm: v })}
        describedBy="t-epdm"
      />
      <aside className="glass liquid rounded-[2rem] p-5 text-sm" aria-labelledby="tips-h">
        <h4 id="tips-h" className="label m-0">
          {t.tipsTitle}
        </h4>
        <p className="mt-2">{t[NOISE_TIP[profile.sleepNoiseSensitivity]]}</p>
        <ul className="m-0 list-disc pl-5">
          <li>{t.safety1}</li>
          <li>{t.safety2}</li>
          <li>{t.safety3}</li>
        </ul>
      </aside>
    </div>
  );
}

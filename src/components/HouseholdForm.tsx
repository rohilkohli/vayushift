"use client";
import { clampMembers } from "@/lib/impactEngine";
import type { CommuteMode, CookingFuel, HouseholdProfile } from "@/lib/types";
import { useT } from "@/hooks/useLang";

interface Props {
  profile: HouseholdProfile;
  onProfile: (p: Partial<HouseholdProfile>) => void;
}

const COMMUTE_MODES: CommuteMode[] = ["private_petrol_car", "private_diesel_car", "auto_rickshaw", "two_wheeler"];
const COOKING_FUELS: CookingFuel[] = ["lpg_unvented", "lpg_chimney", "electric_induction"];

type WhoKey = "hasChildren" | "hasSeniors" | "hasRespiratoryCondition";
const WHO: readonly WhoKey[] = ["hasChildren", "hasSeniors", "hasRespiratoryCondition"];

/** People at home, commute and cooking: the four inputs the impact engine reads about a household. */
function HouseholdFields({ profile, onProfile }: Props) {
  const t = useT();
  const setPeople = (raw: string) => {
    const n = clampMembers(Number(raw));
    onProfile({ memberCount: n, commuterCount: Math.min(profile.commuterCount, n), walkerCount: Math.min(profile.walkerCount, n) });
  };
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-sm font-semibold">
        {t.people}
        <input type="number" min={1} max={15} value={profile.memberCount} className="field" onChange={(e) => setPeople(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        {t.commuteKm}
        <input
          type="number"
          min={0}
          max={200}
          value={profile.commuteKmRoundTrip}
          className="field"
          onChange={(e) => onProfile({ commuteKmRoundTrip: Math.min(200, Math.max(0, Number(e.target.value) || 0)) })}
        />
      </label>
      <label className="block text-sm font-semibold">
        {t.usualCommute}
        <select
          value={profile.baselineCommuteMode}
          onChange={(e) => onProfile({ baselineCommuteMode: e.target.value as CommuteMode })}
          className="field"
        >
          {COMMUTE_MODES.map((k) => (
            <option key={k} value={k}>
              {t.commuteMode[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t.cooking}
        <select
          value={profile.baselineCookingFuel}
          onChange={(e) => onProfile({ baselineCookingFuel: e.target.value as CookingFuel })}
          className="field"
        >
          {COOKING_FUELS.map((k) => (
            <option key={k} value={k}>
              {t.fuel[k]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Which groups live here (children, older adults, a lung or heart condition), for the personalised guidance. */
function WhoLivesHere({ profile, onProfile }: Props) {
  const t = useT();
  const label: Record<WhoKey, string> = { hasChildren: t.hasChildren, hasSeniors: t.hasSeniors, hasRespiratoryCondition: t.hasRespiratory };
  return (
    <fieldset className="m-0 mt-3 border-0 p-0">
      <legend className="label mb-1 p-0">{t.whoLives}</legend>
      <div className="flex flex-wrap gap-x-6">
        {WHO.map((key) => (
          <label key={key} className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={profile[key]} onChange={(e) => onProfile({ [key]: e.target.checked })} className="h-5 w-5" />
            {label[key]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Who lives here and how they commute and cook. Everything the engine needs about the household. */
export function HouseholdForm(props: Props) {
  const t = useT();
  const anySensitive = WHO.some((k) => props.profile[k]);
  return (
    <details className="glass liquid rounded-[32px] p-5" open>
      <summary className="label min-h-11 cursor-pointer py-2">{t.household}</summary>
      <HouseholdFields {...props} />
      <WhoLivesHere {...props} />
      {anySensitive && <p className="ink-soft m-0 text-sm">{t.vulnerableNote}</p>}
    </details>
  );
}

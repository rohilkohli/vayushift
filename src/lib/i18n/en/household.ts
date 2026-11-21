import type { ActivityLevel } from "../../personalAdvice";

/** The figures one household-guidance sentence is built from (all computed by lib/personalAdvice). */
interface PersonalLineArgs {
  nowLevel: ActivityLevel;
  bestLevel: ActivityLevel;
  nowAqi: number;
  best: string;
  bestAqi: number;
  minutes: number;
}

/** The household form and the guidance for who is at home. */
export const household = {
  // ---- household form
  household: "Your household",
  people: "People at home",
  commuteKm: "Commute, km round trip",
  usualCommute: "Usual commute",
  cooking: "Cooking",
  whoLives: "Who lives here",
  hasChildren: "Children (under 12)",
  hasSeniors: "Older adults (65+)",
  hasRespiratory: "Asthma, heart or lung condition",
  vulnerableNote: "Sensitive groups should take extra care. This app does not replace advice from your doctor.",

  // ---- who's at home: outdoor guidance
  personalTitle: "Outdoor guidance for your household",
  personalIntro: (time: string) => `For ${time}. Tighter limits apply to children, older adults and people with lung or heart conditions.`,
  groupName: {
    children: "Children",
    seniors: "Older adults",
    respiratory: "Asthma, heart or lung condition",
    adults: "Healthy adults",
  } as Record<string, string>,
  personalLine: ({ nowLevel, bestLevel, nowAqi, best, bestAqi, minutes }: PersonalLineArgs) =>
    nowLevel === "ok"
      ? `Outdoor play and walks are fine now (AQI ${nowAqi}).`
      : nowLevel === "limit"
        ? `Keep outdoor time to ${minutes} minutes of light activity now (AQI ${nowAqi}). Best time today: ${best} (AQI ${bestAqi}).`
        : bestLevel === "indoors"
          ? `Stay indoors all day: even the best hour, ${best}, is AQI ${bestAqi}.`
          : `Stay indoors now (AQI ${nowAqi}). If you must go out, ${best} is best (AQI ${bestAqi}).`,
  personalMask: "If you go out, wear a fitted N95.",
  airingShort: (minutes: number, aqi: number) =>
    `Because someone sensitive lives here, air the home for only ${minutes} minutes, even in the low-smog window (its average is AQI ${aqi}), and keep them in another room meanwhile.`,
  commuteMode: {
    private_petrol_car: "Petrol car",
    private_diesel_car: "Diesel car",
    auto_rickshaw: "Auto-rickshaw",
    two_wheeler: "Two-wheeler",
  } as Record<string, string>,
  fuel: {
    lpg_unvented: "LPG, no exhaust",
    lpg_chimney: "LPG with chimney",
    electric_induction: "Induction",
  } as Record<string, string>,
};

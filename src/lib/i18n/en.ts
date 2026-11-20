import type { Phase } from "../skyPhase";

type Mode = "normal" | "brief" | "sealed";

/**
 * Every user-facing sentence of the interface, in English. hi.ts must provide the same keys with the same
 * signatures (the compiler enforces it). Messages with numbers are functions, so word order can differ by
 * language while the figures still come only from the calculation engine.
 */
export const en = {
  // ---- shell
  skipToContent: "Skip to content",
  chooseScenario: "Choose a scenario",
  chooseCity: "City",
  pickCity: "Pick a city",
  liveCities: "Live forecast",
  demoScenarios: "Demo scenarios",
  /** Display names for the city list (ids from lib/cities.ts). */
  cityName: {
    delhi: "Delhi", noida: "Noida", gurugram: "Gurugram", mumbai: "Mumbai", kolkata: "Kolkata", lucknow: "Lucknow",
    patna: "Patna", jaipur: "Jaipur", ahmedabad: "Ahmedabad", pune: "Pune", hyderabad: "Hyderabad",
    bengaluru: "Bengaluru", chennai: "Chennai",
  } as Record<string, string>,
  useMyLocation: "Use my location",
  locating: "Locating…",
  myLocation: "My location",
  sections: "Sections",
  highContrast: "High contrast",
  switchLanguage: "Switch language to Hindi",
  languageButton: "हिन्दी",
  tabSky: "Living Sky",
  tabSkyShort: "Sky",
  tabLab: "Room Sanctuary",
  tabLabShort: "Sanctuary",
  tabCommunity: "Community",
  tabCommunityShort: "Community",

  // ---- status bar and location
  statusRegion: "Air quality status",
  loadingAir: "Loading air quality for your location",
  nowLine: (aqi: number, pm: number) => `Now · AQI ${aqi} · PM2.5 ${pm} µg/m³`,
  /** The server names a located scenario "Your location" (in English); the interface shows it in the current language. */
  yourLocation: "Your location",
  grapOff: "GRAP: not active",
  grapStage: (roman: string, category: string) => `GRAP Stage ${roman} · ${category}`,
  sourceLive: "Live forecast",
  sourceDemo: "Demo telemetry",
  /** Where live data came from and how current it is (time in Indian Standard Time). */
  sourceLine: (provider: string, time: string) => `Source: ${provider} · updated ${time} IST`,
  scenarioLoaded: (name: string) => `Loaded ${name} scenario.`,
  cityLive: (name: string) => `Showing the live forecast for ${name}.`,
  cityDemo: (name: string) => `Live data is unavailable for ${name}, so a demo smog pattern is shown.`,
  locUnavailable: "Location is not available in this browser. Showing demo data.",
  locFinding: "Finding your location…",
  locLive: "Showing the live forecast for your location.",
  locDemo: "Live data is unavailable, so a demo smog pattern is shown for your location.",
  locFailed: "Could not load air data. Showing the previous scenario.",
  locDenied: "Location permission was denied. Pick a preset instead.",
  grapCategory: {
    "Below GRAP": "Below GRAP",
    Poor: "Poor",
    "Very poor": "Very poor",
    Severe: "Severe",
    "Severe+": "Severe+",
  } as Record<string, string>,

  // ---- phases and hero copy
  phase: {
    window: "Solar mixing window open",
    morning: "Morning inversion peak",
    night: "Nocturnal smog lock",
    transition: "Atmospheric transition",
  } as Record<Phase, string>,
  adviceSentence: (mode: Mode, minutes: number, original: string) => {
    void mode;
    void minutes;
    return original;
  },
  heroWindow: (mode: Mode, minutes: number) =>
    mode === "normal"
      ? `Open your windows for ${minutes} minutes of afternoon light.`
      : mode === "brief"
        ? `Keep windows shut. If you must, open for ${minutes} minutes.`
        : "Keep windows shut today. Let filtration do the work.",
  heroMorning: "Keep windows sealed through the morning inversion.",
  heroNight: "Let your bedroom sanctuary filter the night air.",
  heroTransition: "Steady indoor filtration as the sky shifts.",
  subWindow: (advice: string, mean: number, pct: number, peak: number, aqi: number, cigs: string) =>
    `${advice} Outdoor PM2.5 in that window averages ${mean} µg/m³, about ${pct}% lower than the 07:00 to 10:00 peak (${peak} µg/m³, AQI ${aqi}, roughly ${cigs} cigarettes a day).`,
  subMorning: (out: number, start: string, inn: number) =>
    `Cold surface air traps exhaust at ${out} µg/m³ outdoors. Hold ventilation until ${start} and keep filtration running; the room is modelled at ${inn} µg/m³.`,
  subNight: (out: number, inn: number) =>
    `Overnight the air holds at ${out} µg/m³ outdoors, while your sealed room is modelled at ${inn} µg/m³.`,
  subTransition: (out: number, name: string, inn: number, span: string) =>
    `Outdoor PM2.5 is ${out} µg/m³ in ${name}. Your routines hold indoor exposure near ${inn} µg/m³. The next low-smog window is ${span}.`,
  outsideBasin: (hour: string) => `Outside basin, ${hour}`,
  sanctuaryModelled: "Sanctuary room, modelled",
  hazeBadge: (pct: number) => `−${pct}% haze`,

  // ---- delta card
  deltaTitle: "Daily Sanctuary Delta",
  cigEquivalent: "cig equivalent",
  neverInhaled: "never inhaled by your household today",
  co2Shielded: "shielded via Delhi Metro vs. your usual commute",
  co2Hint: "switch the commute to metro to see this",
  viewReceipt: "View full receipt",
  fullReceipt: "Full receipt",
  stepEarly: "Early morning",
  stepBoundary: "Boundary rising",
  stepOptimal: "Optimal window",
  stepEvening: "Evening build-up",
  stepNight: "Night haze trapped",

  // ---- routine switches
  shiftsTitle: "Routine shifts · switch on to see the effect",
  purgeTitle: "Afternoon air shift",
  purgeActive: (h: string) => `Active window ${h}`,
  purgeIdle: (h: string) => `Air the home at ${h}`,
  walkTitle: "Walk at the low point",
  walkSub: (h: string) => `45 min at ${h} with an N95`,
  cookTitle: "Induction cooking",
  cookSub: (ug: number) => `Cuts the ${ug} µg/m³ cooking bump`,
  commuteTitle: "Metro + N95 corridor",
  commuteSub: (km: number, mode: string) => `${km} km vs ${mode}`,
  switchOn: "✓ On",
  switchOff: "Off",
  cigShort: "cig",

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
  personalLine: (nowLevel: "ok" | "limit" | "indoors", bestLevel: "ok" | "limit" | "indoors", nowAqi: number, best: string, bestAqi: number, minutes: number) =>
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

  // ---- 24-hour horizon
  horizonTitle: "Scrub 24-hour atmospheric horizon",
  jumpTo: (h: string) => `Jump to ${h} safe window`,
  pause: "Pause sky",
  play: "Play 24h sky",
  chartTitle: "24-hour outdoor and indoor PM2.5",
  chartDesc: (start: string, end: string, mean: number, time: string, out: number, inn: number) =>
    `Solid line: outdoor PM2.5. Dashed line: modelled indoor PM2.5. Lowest 90-minute window ${start} to ${end} at ${mean} micrograms per cubic metre. Selected hour ${time}: outdoor ${out}, indoor ${inn}.`,
  hourOfDay: "Hour of day",
  valueText: (time: string, out: number, inn: number) => `${time}, outdoor PM2.5 ${out} micrograms per cubic metre, indoor ${inn}`,
  legendOutdoor: "Outdoor PM2.5",
  legendIndoor: "Sanctuary room, modelled",
  legendWindow: "Low-smog window",
  viewTable: "View hourly values as a table",
  tableCaption: "Hourly outdoor PM2.5, AQI and modelled indoor PM2.5",
  thHour: "Hour",
  thOutdoor: "Outdoor µg/m³",
  thAqi: "AQI",
  thIndoor: "Indoor µg/m³",

  // ---- impact bar
  impactAria: "Today's impact",
  impactLabel: "Your impact",
  impactEmpty: "Turn on a routine shift or pick a filter to see what it saves.",
  lungsProtected: "Lungs protected",
  cigEqTitle: "cigarette-equivalents",
  cigEqPerDay: "cig-eq",
  perDay: "/day",
  skyProtected: "Sky protected",
  co2PerDay: "g CO₂/day",
  receiptShort: "Receipt",

  // ---- Room Sanctuary
  labBadge: "Indoor purity dynamics · Room sanctuary",
  labHeadline: "Sculpting an island of pure alpine breath indoors.",
  dialAria: "Clean air delivery dial",
  dialActive: "Active sanctuary",
  dialNone: "No filter selected",
  dialCadr: "Clean air delivery (CADR)",
  dialTarget: "Target CADR for 5 ACH",
  turnover: (min: number, ach: string) => `Air turnover: ${min} min · ${ach} ACH`,
  roomVolume: (v: number) => `Room volume ${v} m³`,
  envelope: "Room envelope",
  envelopeChip: (area: number, h: number) => `${area} sq ft · ${h} ft ceiling`,
  floorArea: (n: number) => `Floor area: ${n} sq ft`,
  ceilingHeight: (n: number) => `Ceiling height: ${n} ft`,
  sampleLoaded: (label: string) => `Loaded sample: ${label}.`,
  windows: "Windows",
  windowType: {
    sliding_aluminum_unsealed: "Aluminium sliding, unsealed",
    casement_wood_unsealed: "Wooden casement, unsealed",
    upvc_sealed: "uPVC, sealed",
  } as Record<string, string>,
  noiseLabel: "Night-time noise sensitivity",
  noiseLow: "Low",
  noiseMedium: "Medium",
  noiseHigh: "High (light sleeper)",
  scanLabel: "Or scan your own room (JPEG, PNG or WebP)",
  scanPrivacy: "Resized on your device, stripped of location data, analysed once, never stored.",
  placement: (p: string) => `Placement: ${p}`,
  msgBadType: "Please choose a JPEG, PNG or WebP photo.",
  msgTooLarge: "That photo is too large. Try a smaller one.",
  msgInspecting: "Inspecting window seals, stove type and room size…",
  msgAnalysed: "Room analysed. You can fine-tune the values below.",
  msgNotRoom: "We couldn't detect an indoor room, so the manual sliders are in use. Pick a sample room or adjust the values.",
  msgBudget: "Photo analysis has reached today's limit. Use a sample room or the manual sliders.",
  msgUnavailable: "Photo analysis is unavailable right now. Use a sample room or the manual sliders.",
  msgUnreadable: "Could not read that photo. Use a sample room or the manual sliders.",
  msgGeneric: "Something went wrong. Use the manual sliders instead.",
  filtersBadge: (cadr: number) => `Deployable filter arrays · Needs ${cadr} m³/h for your room`,
  bestValue: "Best value",
  meetsTarget: "Meets 5-ACH target",
  belowTarget: "Below 5-ACH target alone",
  modelled: (pct: number) => `Modelled: ${pct}% lower PM2.5`,
  published: (pct: number) => `Published: ~${pct}%`,
  cadrApprox: (n: number) => `CADR ≈ ${n} m³/h`,
  noiseDb: (day: number, night: number) => `+${day} dB day, +${night} dB night`,
  quiet: "Quiet",
  configured: "✓ Configured & active",
  selectConfig: "Select configuration",
  epdmTitle: (cost: number) => `+ ₹${cost} EPDM window track seal`,
  epdmSub: "Blocks about 30% of exterior seepage",
  tipsTitle: "Sleep and safety",
  tipHigh: "You are a light sleeper: run a DIY box on high from 18:00 to 22:00, then switch it off at bedtime, or choose the HEPA unit.",
  tipMedium: "Run DIY boxes on high in the evening and on low overnight.",
  tipLow: "DIY boxes can run on a low setting overnight.",
  safety1: "Use only a certified box fan with thermal protection. Never leave a damaged fan running.",
  safety2: "Use pleated filters rated MERV-13 or better; swap them when visibly dirty.",
  safety3: "Avoid purifiers that make ozone.",
  statOutdoor: "Exterior PM2.5, 24 h avg",
  statOutdoorNote: "Outdoor average for this scenario",
  statIndoor: "Modelled sanctuary PM2.5",
  statIndoorNote: "A model, not a sensor reading",
  statAch: "Filter air changes",
  statAchUnit: "per hour",
  statAchOn: "From the selected option",
  statAchOff: "Select an option above",
  statTarget: "Target CADR",
  statTargetNote: "5 air changes per hour",

  // ---- Community
  communityBadge: "Community and GRAP playbook",
  grapNone: "No GRAP stage is active right now.",
  grapOutsideNcr: "GRAP is the Delhi-NCR action plan. For your city, treat these stages as a reference scale for how severe the air is, not as official orders.",
  grapHeadline: (roman: string, category: string) => `GRAP Stage ${roman}: ${category}.`,
  aqiLine: (aqi: number, peak: number, worse: boolean) =>
    `Current AQI ${aqi}; today's peak AQI ${peak}. ${worse ? "Conditions can worsen later today." : ""}`,
  measuresTitle: "What typically applies",
  householdActions: "What households can do",
  allStages: "All stages",
  meterAria: "Where today's air sits across GRAP stages",
  stateCurrent: "current stage",
  statePassed: "already passed",
  stateAhead: "not reached",
  grapTableCaption: "GRAP stages and AQI bands",
  thStage: "Stage",
  thBand: "AQI band",
  thCategory: "Category",
  currentMark: " (current)",
  vehicleTitle: "Vehicle check",
  yourVehicle: "Your vehicle",
  vehicleRestricted: "Likely restricted at this stage in Delhi-NCR. Plan another way to travel.",
  vehicleFree: "Not restricted by the Stage III rule for light vehicles at the current stage.",
  heaterTitle: "Night-guard heater calculator",
  flats: "Flats in society",
  guards: "Night guards",
  heaterSum: (guards: number, unit: string) => `${guards} × ₹${unit} = `,
  heaterAbout: "about",
  heaterPerFlat: (n: number) => `₹${n} per flat`,
  heaterTail: "one time. Replaces open biomass fires at the gate. Heater price is an assumption.",
  advisoryTitle: "WhatsApp advisory (English + हिन्दी)",
  copyAdvisory: "Copy advisory",
  copied: "✓ Copied",
  shareWhatsApp: "Share on WhatsApp",
  advisoryCopied: "Advisory copied. Paste it into your WhatsApp group.",
  advisoryCopyFailed: "Copy failed. Select the text above and copy it manually.",
  vehicleLabel: {
    petrol_bs3: "Petrol car, BS-III or older",
    diesel_bs4: "Diesel car, BS-IV",
    petrol_bs6: "Petrol car, BS-VI",
    diesel_bs6: "Diesel car, BS-VI",
    cng_ev: "CNG or electric",
  } as Record<string, string>,

  // ---- Receipt dialog
  receiptTitle: "Lungs & Sky receipt",
  close: "Close",
  emptyTitle: "Nothing switched on yet",
  emptyBody: "Turn on a routine shift, add a sealed window or choose a filter, and your receipt fills in with what each choice saves.",
  backToRoutines: "Back to routines",
  rcPerPerson: "Per person, per day",
  rcHousehold: "Household, per day",
  rcSeason: "90-day season",
  rcInhaled: "Inhaled PM2.5 avoided",
  rcCo2: "CO₂ saved",
  rcIndoor: "Indoor PM2.5 (modelled)",
  whereFrom: "Where it comes from",
  contribCaption: "Contribution of each action",
  thAction: "Action",
  thCigDay: "Cig-eq/day",
  thUgAvoided: "µg avoided",
  whyTitle: "Why your choices mattered",
  writing: "Writing your explanation",
  srcGemini: "Explained by Gemini using only the numbers above.",
  srcTemplate: "Template explanation using only the numbers above.",
  howTitle: "How is this calculated?",
  how1: "Cigarette-equivalents = PM2.5 (µg/m³) ÷ 22 × hours ÷ 24. A communication aid, not a medical measure.",
  how2: "Indoor PM2.5 uses a single-room mass balance: C_in = P·a·C_out ÷ (a + k + CADR/V). Model assumptions are in",
  how3: "CO₂ saved = km × 32.4 g, for each commuter who switches to metro.",
  how4: "These figures describe your personal exposure and emissions, not a change in the city's AQI.",
  copyReceipt: "Copy receipt",
  creatingLink: "Creating link…",
  copyLink: "Copy share link",
  receiptCopied: "Receipt copied.",
  receiptCopyFailed: "Copy failed. Select the text and copy it manually.",
  linkCopied: "Share link copied. It stays valid for 90 days.",
  linkFailed: "Could not create a share link.",
  shareText: (name: string, cig: number, co2: number) =>
    `My VayuShift receipt (${name}): ${cig} cigarette-equivalents of PM2.5 avoided and ${co2} g CO2 saved today. Estimates, not medical advice.`,
  explainEmpty: "Switch on a routine shift or choose a filter to see how your choices change the air you breathe today.",
  /** Template explanation of a receipt; null means "use the engine's English text". */
  explainTemplate: null as null | ((cig: number, co2: number, base: number, managed: number, reductionPct: number) => string),
};

export type Messages = typeof en;

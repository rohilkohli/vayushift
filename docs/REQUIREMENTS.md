# Requirements traceability

Problem statement (Challenge 6): help households and communities in dense cities cope with severe winter smog, using
real forecasts, a room photo, and low-cost indoor air fixes, with results people can see and share.

Each requirement links to the code that implements it and the tests that check it. "Live" means it was also run against
the real deployed service and Google APIs (see [TESTING.md](TESTING.md)).

## Who it is for

| User | Need |
| --- | --- |
| Family with a child, an elder or an asthmatic member | When is it safe to open a window or go out? |
| Commuter | What does switching how I travel change? |
| Renter in a leaky flat | What can I do for the bedroom for under a few thousand rupees? |
| RWA / apartment-society volunteer | What stage are we in, and how do I tell neighbours in Hindi? |

## Requirements

| ID | Requirement | Code | Tests | Live |
| --- | --- | --- | --- | :---: |
| R1 | Show an hour-by-hour PM2.5 forecast for the user's location, not one citywide number | `src/server/services/airQuality.ts`, `adapters/google/airQuality.ts`, `components/HorizonScrubber.tsx` | `services/airQuality.test.ts`, `google/airQuality.test.ts`, `routes.test.ts` | Yes |
| R2 | Find the safest time to be outdoors, and **say so honestly** when there is no safe time | `src/lib/airQuality.ts` (window search, advice downgrade at >250 and >300 µg/m³) | `lib/airQuality.test.ts` | - |
| R3 | Show indoor air as well as outdoor, and what each routine choice changes | `src/lib/impactEngine/room.ts` (`modelIndoor`), `components/Choreographer.tsx`, `RoutineShifts.tsx` | `lib/impactEngine.test.ts` | - |
| R4 | Read a room from a photo and size the filtration needed | `src/server/services/roomVision.ts`, `adapters/gemini`, `lib/roomScan.ts`, `components/IndoorLab.tsx`, `hooks/useRoomScan.ts` | `security.test.ts`, `services.test.ts`, `routes.test.ts` | Partly (API only, synthetic image) |
| R5 | Compare low-cost filters (DIY box, box fan, HEPA) by cost, noise and result | `impactEngine/filters.ts` (`compareFilters`), `impactEngine/room.ts` (`roomVolumeM3`) | `impactEngine.test.ts` | - |
| R6 | Plain-language explanation of the result, **without the model inventing numbers** | `src/server/services/explain.ts`, `lib/explain.ts` (number guard) | `services.test.ts` | Yes |
| R7 | Show the effect of choices as a household "receipt" (cigarette-equivalents, µg inhaled, g CO₂) | `impactEngine/receipt.ts` (`calculateHouseholdImpact`), `components/ReceiptDialog.tsx`, `ImpactBar.tsx` | `impactEngine.test.ts` | - |
| R8 | Share a receipt by link, with no personal data and with expiry | `src/server/services/receipts.ts`, `app/api/receipts`, `app/r/[id]/page.tsx` | `services.test.ts`, `routes.test.ts`, storage contract | Yes |
| R9 | Community tools: GRAP stage, vehicle check, heater cost, bilingual (English and Hindi) advisory | `src/lib/grapRules.ts`, `lib/rwa.ts`, `components/CommunityPlaybook.tsx`, `GrapPanels.tsx` | `lib/airQuality.test.ts` (GRAP boundaries) | - |
| R10 | Keep working with no keys, no network or an upstream outage | demo scenarios (`lib/airQualityPresets.ts`), template text, stale-if-error cache | `services/airQuality.test.ts`, `services.test.ts` | Yes (fallback observed) |
| R11 | Never let abuse become a bill | `adapters/firestore/budget.ts`, `http/rateLimit.ts` | `budget.test.ts`, `http.test.ts` | - |
| R12 | Respect privacy: no accounts, no identifiers, honour opt-outs | `services/analytics.ts`, `lib/clientApi.ts` | `routes.test.ts`, `services.test.ts` | Yes |
| R13 | Usable by people with disabilities and in different conditions, including in Hindi and in high contrast | see [ACCESSIBILITY.md](ACCESSIBILITY.md); `src/lib/i18n/*`, `hooks/useLang.tsx`, `hooks/useContrast.ts` | `accessibility.test.tsx`, `language.test.tsx`, `i18n.test.ts`, `contrast.test.ts`, `contrast.test.tsx` | - |
| R15 | Look at any large Indian city, with the data source and time shown, and never another city's air | `lib/cities.ts`, `hooks/useForecast.ts`, `components/CityPicker.tsx`, `StatusBar.tsx`, `adapters/google/airQuality.ts` (`fetchedAt`, `provider`) | `cities.test.ts`, `personalisation.test.tsx`, `google/airQuality.test.ts` | Yes |
| R16 | Advice that depends on who lives at home | `lib/personalAdvice.ts`, `components/PersonalGuidance.tsx`, `HouseholdForm.tsx` | `personalAdvice.test.ts`, `personalisation.test.tsx` | - |
| R14 | Observable and safe to operate | `server/logger.ts`, `app/api/healthz`, `readyz`, `instrumentation.ts` | `logger.test.ts`, `config.test.ts`, CI container smoke test | Yes |

## Where the problem statement is only partly met

| Gap | Why |
| --- | --- |
| Indoor PM2.5 is modelled, not measured | No sensors; the model's constants are assumptions calibrated to published reductions |
| Cigarette-equivalents are a communication aid | Not a clinical measure; stated in the UI and README |
| Receipts describe one household | One household does not change the city's AQI; stated in the UI |
| Hindi covers the interface, not every data sentence | The GRAP measures, filter notes, source citations and the Gemini explanation stay English (marked `lang="en"`); the Hindi text has not had a native-speaker review |
| Photo analysis checked with a synthetic image only | No real room photo has been sent through the deployed route yet |

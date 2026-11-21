# Problem statement alignment

**Challenge 6, Urban Air Quality Assistant:** a GenAI-powered assistant that helps families and communities navigate
severe winter smog, suggesting low-emission daily routines, indoor air quality fixes and sustainable alternatives,
tailored to their location and lifestyle, and explaining the direct impact of their choices.

Every row below names where to see it in the running app and the code and tests behind it. A step-by-step tour for
evaluators, with example inputs, is in [`docs/SAMPLE_INPUTS.md`](docs/SAMPLE_INPUTS.md). The full requirement-by-requirement
trace is in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## The three things the statement asks for

| The statement asks for | What VayuShift does | See it in the app | Code and tests |
| --- | --- | --- | --- |
| **Low-emission daily routines** | Finds the cleanest window of the day, and turns routine changes (airing at the low point, walking then, induction cooking, metro with an N95) into cigarette-equivalents and CO₂ avoided | Living Sky tab: the 24-hour horizon and the four routine switches | `lib/airQuality.ts`, `lib/impactEngine/`, `components/RoutineShifts.tsx`; `airQuality.test.ts`, `impactEngine.test.ts` |
| **Indoor air quality hacks** | Sizes the filtration a room needs (5 air changes an hour), compares a DIY box, a box fan and a HEPA unit by cost, noise and modelled reduction, adds window sealing and sleep advice, and can read the room from a photo | Room Sanctuary tab | `lib/impactEngine/room.ts`, `filters.ts`, `lib/roomScan.ts`, `components/IndoorLab.tsx` |
| **Sustainable alternatives and their direct impact** | Metro and walking instead of a car, induction instead of gas, each with what it saves and the formula and source behind it; a receipt per person, household and season, with a shareable link | The receipt dialog | `lib/impactEngine/receipt.ts`, `lib/sources.ts`, `components/ReceiptDialog.tsx`; `routes.test.ts` |

## Tailored to location and lifestyle

| Aspect | How |
| --- | --- |
| **Location** | 13 Indian cities from a list, or the visitor's own location. Each uses that place's live forecast, never Delhi's. Coordinates are rounded before any upstream call |
| **Household** | Who lives at home (children, older adults, an asthma, heart or lung condition) changes the advice: at the same AQI a child may be told to stay in while a healthy adult is told it is fine. Each group gets its limit, the best hour to go out and mask advice. Airing is shortened for a household with a sensitive member when the low-smog window is still polluted |
| **Lifestyle** | Commute mode and distance, cooking fuel, room size and windows, night-time noise sensitivity |
| **Language** | Full English and Hindi interface; a ready-to-share advisory in both for apartment-society groups |

## Real data, shown honestly

- **Outdoor air comes from the Google Air Quality API** (hourly PM2.5 forecast), never from the language model. The page
  shows the source and when it was updated, in Indian Standard Time.
- **If live data is unavailable** the app says so ("Demo telemetry") and uses a labelled demo curve. It does not
  pretend.
- **The model never does the maths.** Every figure comes from a deterministic engine. Gemini reads a room photo into a
  checked schema and explains results; the server rejects any explanation containing a number the engine did not compute
  (`lib/explain.ts`, `services.test.ts`).
- **Explains why, not only what.** Each recommendation carries the numbers behind it, and the receipt lists the formulas
  and published sources.

## Community

The Community tab shows today's GRAP stage and what typically applies, a vehicle check, a night-guard heater cost
calculator and a WhatsApp advisory. GRAP is the Delhi-NCR plan, so outside the NCR the page says the stages are a
reference scale, not official orders.

## Where it only partly meets the statement

- Indoor PM2.5 is modelled, not measured (no sensors); constants are assumptions calibrated to published reductions.
- Cigarette-equivalents are a communication aid, not a clinical measure, and the guidance is general, not medical advice.
- Receipts describe one household's exposure; one household does not change a city's AQI.
- Photo analysis has been checked with a synthetic image only. The Hindi text has not had a native-speaker review.

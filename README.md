# VayuShift

**Vertical:** Urban air quality and household climate action (PromptWars Virtual, Challenge 6).

VayuShift turns an hourly smog forecast and a room photo into a timed daily routine, low-cost indoor air fixes
and a receipt that shows the direct effect of each choice. It is aimed at families and apartment societies
(RWAs) in Delhi-NCR, and works anywhere the Google Air Quality API has coverage.

## The problem

Air quality apps show a red number and stop. In winter smog, the useful questions are *when* to open a window,
*what* to do about the bedroom, and *whether it mattered*. VayuShift answers those three.

## How it works

| Tab | What it does | Decision logic |
| --- | --- | --- |
| **Living Sky** | A scrubbable 24-hour horizon (outdoor and modelled indoor PM2.5, jump to the safe window, play the day), the best 90-minute daytime window, four routine switches. Scrubbing changes the hero advice, the readouts and the sky itself (palette, sun or moon arc, wind speed, day or night theme). Deep-link an hour with `?hour=15` | Searches daytime windows for the lowest mean PM2.5, compares with the 07:00-10:00 peak, and **downgrades its own advice** when the afternoon low is above 250 µg/m³ (brief airing) or every hour is above 300 (stay sealed) |
| **Indoor Air Lab** | Photo or sample room, then CADR target and filter comparison | Gemini extracts room facts into a fixed schema; a single-room mass balance computes indoor PM2.5 for a DIY MERV-13 box, a box fan, or a HEPA unit, with cost, noise and sleep advice |
| **Community** | GRAP stage, vehicle check, guard-heater cost, bilingual WhatsApp card | AQI to GRAP stage (201/301/401/450), deterministic English and Hindi templates |
| **Receipt** | Avoided cigarette-equivalents, µg inhaled, g CO₂ | Every number comes from `src/lib/impactEngine.ts` |

### The one rule: the model never does maths

All figures are computed by pure TypeScript in `src/lib`. Gemini is used for two things only:

1. reading a room photo into a schema-constrained JSON object, which is **re-validated** (enums checked, numbers clamped, text stripped and length-limited);
2. writing a three-sentence explanation of numbers the engine already produced. The server **rejects any
   explanation containing a number the engine did not produce** and falls back to a template.

GRAP advice and the bilingual advisory are fixed templates on purpose: legal text should not be generated.

If `GEMINI_API_KEY` or `GOOGLE_MAPS_API_KEY` is missing, slow or rejected, the app keeps working with bundled
demo scenarios, sample rooms and template text.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY and GOOGLE_MAPS_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # 85 tests
npm run lint                 # type-check
```

## Code map

```
src/lib/constants.ts        every model number, tagged cited or assumption
src/lib/airQuality.ts       AQI conversion, cigarette equivalence, ventilation window
src/lib/impactEngine.ts     indoor mass balance, filter comparison, household receipt
src/lib/grapRules.ts        GRAP stages and vehicle check
src/lib/rwa.ts              heater calculator and bilingual advisory
src/lib/roomScan.ts         schema, validator, sample rooms
src/lib/explain.ts          number guard and fallback text
src/lib/validation.ts       coordinates, image sniffing, rate limiter
src/app/api/*               air-quality, analyze-room, explain (all validate input)
src/components/*            UI; no chart library, plain SVG
```

## Security

- Secrets stay server-side; upstream errors are never echoed back (they can contain the request URL).
- Every API route validates input, limits request size, and is rate-limited per client (in-memory, per instance).
- Uploads are checked by **file signature**, not just MIME type, capped at 5 MB, resized on the device and
  re-encoded (this strips EXIF/GPS), processed in memory, never stored or logged.
- Model output is untrusted: schema-checked, clamped and rendered through React's escaping. The prompt tells the
  model to ignore text inside images.
- The `/api/explain` route accepts inputs, never numbers, and recomputes everything itself.
- Coordinates are rounded to about 110 m before any upstream call.
- Security headers: CSP, `nosniff`, referrer policy, permissions policy, no `X-Powered-By`.
- No accounts and no database. The household profile is kept in `localStorage` only.

## Accessibility

Skip link; tabs with arrow-key support; real `role="switch"` buttons whose state is also written as text;
the chart has a title, description and a table alternative, and its window is hatched as well as coloured;
labelled form controls; live regions for results; native `<dialog>` with focus handling; 44 px touch targets;
reduced-motion and forced-colours support; Hindi text is marked `lang="hi"`. The UI follows the supplied Stitch "Living Sky" design (sky gradient, frosted glass, Playfair + Plus Jakarta Sans) with a
night variant that switches on after 19:00 IST (`?sky=day` or `?sky=night` overrides it). Translucent glass is made more
opaque than the mock, and hero copy sits on a dark scrim, so text stays legible. An axe-core scan (WCAG 2.1 A/AA) found
no violations on any tab in day and night mode at desktop and 390 px widths, and a separate pixel check of the rendered
backdrop confirmed every text element meets 4.5:1 (3:1 for large text).

## Testing

`npm test` runs Vitest across the engine, the security helpers and the three API routes (including key-in-header, error-leak, body-size and rate-limit checks): cigarette equivalence (220 µg/m³ for 24 h is
10), CPCB conversion, GRAP boundaries (200/201/300/301/400/401/450/451), window search and the 250/300 overrides,
CADR sizing (180 sq ft at 10 ft needs 255 m³/h), 20 km by metro is 648 g CO₂, heater cost (₹64 a flat),
filter ordering, determinism, input validation, image sniffing, rate limiting, prompt-injection hardening and the
number guard.

## Assumptions and limits (please read)

- **Indoor PM2.5 is a model, not a measurement.** It uses a single-zone mass balance with infiltration, deposition
  and a derated filter CADR. Infiltration rates, filter CADRs and in-vehicle factors are assumptions, calibrated so
  modelled filter reductions land near the published figures (see `constants.ts`). Not yet validated against sensors.
- **Cigarette-equivalents** (PM2.5 ÷ 22 × hours ÷ 24) are a communication aid, not a clinical measure.
- **Personal vs city impact:** receipts describe your own exposure and emissions. One household does not change the city's AQI.
- The bundled Delhi scenarios are **synthetic**, shaped after the published winter diurnal pattern. They are not station data.
- The live Air Quality API adapter is unit-tested against a fixture but could not be exercised with a real key in the build environment.
- Metro CO₂ saving uses the single published 32.4 g/km figure for every baseline mode.
- GRAP measures are a short awareness summary; always confirm current orders with CAQM.
- Not medical advice. Sensitive groups should follow their doctor's guidance.
- Rate limiting is per server instance; use an edge or shared limiter for production scale.

## Deployment

Standard Next.js app. Set `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` as server environment variables on Vercel or Cloud Run.

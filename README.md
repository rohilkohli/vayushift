# VayuShift

**Vertical:** Urban air quality and household climate action (PromptWars Virtual, Challenge 6).

VayuShift turns an hourly smog forecast and a room photo into a timed daily routine, low-cost indoor air fixes
and a receipt that shows the direct effect of each choice. It is aimed at families and apartment societies
(RWAs) in Delhi-NCR, and works anywhere the Google Air Quality API has coverage.

**Live:** https://vayushift-933086836183.asia-south1.run.app (Google Cloud Run, Firestore, real Air Quality and Gemini APIs)

| Read this | For |
| --- | --- |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Problem statement to code to tests, and where it is only partly met |
| [`docs/GOOGLE_SERVICES.md`](docs/GOOGLE_SERVICES.md) | Every Google service used, and how each was confirmed |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model: each threat, its control, and the test that proves it |
| [`docs/TESTING.md`](docs/TESTING.md) | What the 248 tests prove, live verification, and bugs only the real systems exposed |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | What is built, how it was checked, what is not covered |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/openapi.yaml`](docs/openapi.yaml) | Design, data model, failure modes, API |

## The problem

Air quality apps show a red number and stop. In winter smog, the useful questions are *when* to open a window,
*what* to do about the bedroom, and *whether it mattered*. VayuShift answers those three.

## How it works

| Tab | What it does | Decision logic |
| --- | --- | --- |
| **Living Sky** | A scrubbable 24-hour horizon (outdoor and modelled indoor PM2.5, jump to the safe window, play the day), the best 90-minute daytime window, four routine switches. Scrubbing changes the hero advice, the readouts and the sky itself (palette, sun and moon, stars, clouds, birds, wind speed, day or night theme). Deep-link an hour with `?hour=15` | Searches daytime windows for the lowest mean PM2.5, compares with the 07:00-10:00 peak, and **downgrades its own advice** when the afternoon low is above 250 µg/m³ (brief airing) or every hour is above 300 (stay sealed) |
| **Indoor Air Lab** | Photo or sample room, then CADR target and filter comparison | Gemini extracts room facts into a fixed schema; a single-room mass balance computes indoor PM2.5 for a DIY MERV-13 box, a box fan, or a HEPA unit, with cost, noise and sleep advice |
| **Community** | GRAP stage, vehicle check, guard-heater cost, bilingual WhatsApp card | AQI to GRAP stage (201/301/401/450), deterministic English and Hindi templates |
| **Receipt** | Avoided cigarette-equivalents, µg inhaled, g CO₂, and a **shareable link** (`/r/<id>`, valid 90 days) | Every number comes from `src/lib/impactEngine.ts`, computed on the server |

### The one rule: the model never does maths

All figures are computed by pure TypeScript in `src/lib`. Gemini is used for two things only:

1. reading a room photo into a schema-constrained JSON object, which is **re-validated** (enums checked, numbers clamped, text stripped and length-limited);
2. writing a three-sentence explanation of numbers the engine already produced. The server **rejects any
   explanation containing a number the engine did not produce** and falls back to a template.

GRAP advice and the bilingual advisory are fixed templates on purpose: legal text should not be generated.

If `GEMINI_API_KEY` or `GOOGLE_MAPS_API_KEY` is missing, slow, rejected or over its daily budget, the app keeps
working with bundled demo scenarios, sample rooms and template text.

## Backend at a glance

A modular monolith on **Google Cloud Run** with **Firestore**. Full design, data model, failure modes and
security model: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). API reference: [`docs/openapi.yaml`](docs/openapi.yaml).

- **Layers:** pure domain (`src/lib`), services behind ports and adapters (`src/server`), thin routes (`src/app/api`).
- **Air-quality cache** shared across users by ~550 m grid cell, with request coalescing and stale-if-error.
- **Daily budgets** on Gemini and the Air Quality API, shared through Firestore, failing closed so an outage cannot become a bill.
- **Shareable receipts** and **privacy-first analytics** (daily counters only; honours Global Privacy Control and Do Not Track).
- **Operations:** structured logs for Cloud Logging and Error Reporting with trace linking, `/api/healthz` and `/api/readyz`,
  configuration validated at start-up (a bad revision never takes traffic).
- **Delivery:** multi-stage `Dockerfile`, GitHub Actions CI (including the Firestore emulator) and a Cloud Run deploy
  workflow using Workload Identity Federation, with one-time setup in `infra/setup.sh`.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: everything works with no keys and no database
npm run dev                  # http://localhost:3000
npm test                     # unit, service, adapter-logic and route tests
npm run lint                 # type-check
```

With real storage locally (needs the Google Cloud CLI and Java for the emulator):

```bash
gcloud emulators firestore start --host-port=127.0.0.1:8080
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 STORAGE_BACKEND=firestore npm run dev
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:emulator    # the storage contract against Firestore
```

Container: `docker build -t vayushift . && docker run -p 8080:8080 vayushift`.

### Configuration

All optional; see `.env.example`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY` | Upstream APIs (Secret Manager in production) | unset: demo data and templates |
| `STORAGE_BACKEND` | `memory` or `firestore` | `memory` |
| `GOOGLE_CLOUD_PROJECT` | Required for Firestore; also links logs to traces. **Cloud Run does not set it** | unset |
| `PUBLIC_ORIGIN` | Public https URL, used to build share links. Set it in production | request host |
| `TRUSTED_PROXY_HOPS` | Proxies that append to `X-Forwarded-For` (Cloud Run alone: 1; behind an HTTPS load balancer: 2) | `1` |
| `BUDGET_AIR_QUALITY_DAILY`, `BUDGET_GEMINI_VISION_DAILY`, `BUDGET_GEMINI_EXPLAIN_DAILY` | Daily call caps (`0` switches an upstream off) | 20000 / 300 / 2000 |
| `AIR_CACHE_FRESH_MINUTES`, `AIR_CACHE_STALE_MINUTES` | Forecast cache freshness and stale-if-error window | 30 / 180 |
| `RECEIPT_TTL_DAYS`, `EXPLAIN_CACHE_HOURS`, `LOG_LEVEL` | Retention, explanation cache, verbosity | 90 / 24 / `info` |

## Code map

```
src/lib/                    domain: pure functions and constants, no I/O
  constants.ts              every model number, tagged cited or assumption
  impactEngine.ts           indoor mass balance, filter comparison, household receipt
  airQuality.ts, grapRules.ts, rwa.ts, roomScan.ts, explain.ts, skyPalette.ts ...
  clientApi.ts              browser helpers: share link, privacy-respecting event beacon
src/server/
  config.ts                 validated configuration
  logger.ts, errors.ts      Cloud Logging JSON, uniform errors
  ports.ts                  interfaces the services depend on
  services/                 air quality, room vision, explain, receipts, analytics
  adapters/memory|firestore|google|gemini   implementations of the ports
  http/                     route handler, client IP, rate limiter
  container.ts              the one place that wires adapters to services
src/app/api/*               thin routes: parse, call a service, respond
src/app/r/[id]/             server-rendered shared receipt page
src/components/             UI; no chart library, plain SVG
docs/                       ARCHITECTURE, SECURITY, TESTING, ACCESSIBILITY, REQUIREMENTS, GOOGLE_SERVICES, openapi.yaml
infra/setup.sh              one-time Google Cloud setup
.github/workflows/          CI and Cloud Run deploy
```

## Security

- **Secrets** stay server-side (Secret Manager in production). The Air Quality key is sent in a header, never a URL;
  upstream error bodies are never returned; the logger redacts secret-named fields.
- **Rate limiting uses the right end of `X-Forwarded-For`**, so a forged header cannot bypass it. Cost-bearing routes also
  refuse requests a browser marks cross-site.
- **Input is validated at every boundary:** request bodies are size-capped on the *stream*, uploads are checked by file
  signature and capped at 5 MB, resized and re-encoded on the device (stripping EXIF/GPS), processed in memory and never stored.
- **Model output is untrusted:** schema-checked, clamped, stripped and rendered through React's escaping; the prompt tells the
  model to ignore text in images. The server recomputes every number and rejects invented ones.
- **Share links** use CSPRNG ids (about 59 bits), hold no personal data, and expire.
- **Privacy:** no accounts; analytics are daily counters with no identifiers; Global Privacy Control and Do Not Track are honoured.
  Coordinates are rounded and snapped to a ~550 m cell before any upstream call.
- **Least privilege:** the runtime account has Firestore data access and two named secrets only; deployment uses Workload
  Identity Federation limited to this repository (no stored keys).
- **Headers:** CSP, HSTS, `nosniff`, referrer and permissions policies, COOP, no `X-Powered-By`.
- **Dependencies:** `npm audit` is clean (PostCSS is pinned to a patched version through an `overrides` entry).

## Accessibility

Skip link; tabs with arrow-key support; real `role="switch"` buttons whose state is also written as text;
the chart has a title, description and a table alternative, and its window is hatched as well as coloured;
labelled form controls; live regions for results; native `<dialog>` with focus handling; 44 px touch targets;
deep-linkable tabs; reduced-motion, reduced-transparency and forced-colours support; Hindi text is marked `lang="hi"`.
The UI follows the supplied Stitch "Living Sky" design (sky gradient, frosted glass, Fraunces + Geist, self-hosted) with a
night variant. Details and gaps: [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md). Text stays legible over the moving sun and moon: an axe-core scan (WCAG 2.1 A/AA) is clean on every tab,
and a pixel check of the rendered backdrop at all 24 hours confirmed text contrast (99% of pixels behind each line meet
4.5:1, or 3:1 for large text; the excluded 1% are isolated star specks and thin sun rays).

## Testing

`npm test` runs Vitest: the calculation engine (220 µg/m³ for 24 h is 10 cigarettes; 180 sq ft at 10 ft needs 255 m³/h;
20 km by metro is 648 g CO₂; GRAP boundaries 200/201/300/301/400/401/450/451), validation and security helpers,
configuration, logging, client-IP and rate limiting, every service against fake providers, the Firestore adapters'
logic against an in-memory Firestore fake, the daily budget under concurrency, every API route end to end, and a test
that keeps `docs/openapi.yaml` in step with the routes. A shared **storage contract** runs against the in-memory adapter
always, and against **real Firestore** whenever the emulator is available (CI does this).

## Assumptions and limits (please read)

- **Indoor PM2.5 is a model, not a measurement.** It uses a single-zone mass balance with infiltration, deposition
  and a derated filter CADR. Infiltration rates, filter CADRs and in-vehicle factors are assumptions, calibrated so
  modelled filter reductions land near the published figures (see `constants.ts`). Not yet validated against sensors.
- **Cigarette-equivalents** (PM2.5 ÷ 22 × hours ÷ 24) are a communication aid, not a clinical measure.
- **Personal vs city impact:** receipts describe your own exposure and emissions. One household does not change the city's AQI.
- The bundled Delhi scenarios are **synthetic**, shaped after the published winter diurnal pattern. They are not station data.
- **What has been run for real, and what has not.** The deployed service was checked by hand against live Firestore, the
  live Air Quality API and the live Gemini API (see `docs/TESTING.md`); that found three bugs the fakes could not. Not yet
  done: photo analysis with a real room photo through the deployed route (only a synthetic image was tried), and the
  GitHub deploy workflow and `infra/setup.sh` (the service was deployed with `gcloud` directly). Live-API checks are
  manual, not part of CI.
- **Accessibility checks are manual** (axe-core and a pixel contrast check), not in CI, and were run before the font change.
- **Rate limits are per instance.** The shared daily budget is what protects spend; add Cloud Armor for volumetric attacks.
- **The number guard** confirms a number exists in the computed set, not that it is attached to the right quantity.
- Metro CO₂ saving uses the single published 32.4 g/km figure for every baseline mode.
- GRAP measures are a short awareness summary; always confirm current orders with CAQM.
- Not medical advice. Sensitive groups should follow their doctor's guidance.

## Deployment

One-time: run `infra/setup.sh` in Cloud Shell (enables APIs, creates Firestore with TTL policies, a least-privilege runtime
account, secrets, and keyless GitHub deployment). Then add the printed repository variables and run the **Deploy to Cloud Run**
workflow, or push a tag such as `v1.0.0`. Settings and their reasons are in `docs/ARCHITECTURE.md`.

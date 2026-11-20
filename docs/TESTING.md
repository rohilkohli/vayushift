# Testing

`npm test` runs 283 tests in 21 files (Vitest 5). `npm run lint` type-checks. Both run in CI on every push.

## What each file proves

| File | Tests | Proves |
| --- | ---: | --- |
| `src/lib/impactEngine.test.ts` | 17 | The numbers: 220 µg/m³ for 24 h is 10 cigarette-equivalents; 180 sq ft at 10 ft needs 255 m³/h; 20 km by metro is 648 g CO₂ |
| `src/lib/airQuality.test.ts` | 27 | AQI breakpoints, safe-window search, advice downgrades |
| `src/lib/security.test.ts` | 27 | Image checks (magic bytes, size), text stripping, model-output validation |
| `src/lib/sky.test.ts` | 23 | The sky is a continuous function of the hour; sun, moon, star and cloud behaviour |
| `src/server/config.test.ts` | 9 | Configuration collects *all* problems; a bad config is refused |
| `src/server/logger.test.ts` | 10 | Cloud Logging JSON shape, secret redaction, error reporting markers |
| `src/server/http/http.test.ts` | 24 | Client-IP resolution (including the spoofing case), rate limiter, handler behaviour |
| `src/server/services/services.test.ts` | 20 | Vision, explanation (number guard), receipts and analytics services against fake providers |
| `src/server/services/airQuality.test.ts` | 12 | Cell caching, request coalescing, stale-if-error, cache outage tolerance |
| `src/server/adapters/google/airQuality.test.ts` | 9 | Response parsing; the exact request shape Google accepts |
| `src/server/adapters/firestore/*.test.ts` | 22 | Budget under concurrency and exhaustion; cache, receipts, analytics against an in-memory Firestore fake; the module loader |
| `src/server/adapters/storage.contract.test.ts` | 16 | One contract that every storage adapter must pass |
| `src/app/api/routes.test.ts` | 29 | Every route end to end: validation, errors, cross-site refusal, privacy headers |
| `src/components/accessibility.test.tsx` | 7 | axe-core (WCAG 2.1 A/AA and best practice) on the first screen and **every tab**; landmarks, skip link, slider text, table alternative, switches; plus a self-check that the harness catches deliberately bad markup |
| `src/lib/i18n/i18n.test.ts` | 8 | The English and Hindi catalogues have the same keys; every number-bearing Hindi sentence keeps all its figures; the Hindi advice states the same thresholds and minutes as the English engine text; the Hindi explanation carries only the engine's figures; language selection order (`?lang=`, saved choice, browser) |
| `src/components/language.test.tsx` | 6 | The switch toggles the whole interface and `<html lang>`, remembers the choice, re-renders a status message already on screen, opens from `?lang=hi`; **every tab in Hindi passes axe**; English-only data inside Hindi is marked `lang="en"` |
| `src/lib/contrast.test.ts` | 6 | Reads the high-contrast colour tokens straight from `globals.css` and checks every text/background pairing, by day and by night, against WCAG AAA (7:1) |
| `src/components/contrast.test.tsx` | 8 | The high-contrast toggle: off by default, on/off with `aria-pressed`, remembered, starts from the device's "more contrast" setting, `?contrast=` beats a saved choice beats the device, label follows the language, axe clean on every tab with the mode on |
| `src/app/api/openapi.test.ts` | 3 | `docs/openapi.yaml` and the real routes cannot drift apart |

## Three levels of confidence

1. **Always:** unit, service and route tests, with faked providers.
2. **CI, on the Firestore emulator:** the storage contract runs against *real Firestore semantics*, not just the fake.
3. **CI, in the built container:** boots the production image, calls `/api/healthz` and `/api/readyz`, and checks that a
   bad configuration stops the container and that the Firestore client loads inside the bundle.

## Live verification (a record, not an automated test)

After the first Cloud Run deployment, these were run by hand against the real service and real Google APIs:

| Check | Result |
| --- | --- |
| `/api/readyz` against real Firestore | `ok` |
| `/api/air-quality` with the real key | Live 24-hour forecast; repeat call served from the shared cache |
| `/api/explain` with the real Gemini key | `source: gemini`, text accepted by the number guard |
| Share link create, fetch, page render | All succeeded |
| Cross-site request | 403 |
| Invalid analytics event | 400 |

## Bugs that only the real systems exposed

The faked tests could not have caught these; running against the real services did.

| Bug | Found by |
| --- | --- |
| The Firestore client failed to load in the production bundle (`a is not a constructor`) | First live `/api/readyz`. Now guarded by a unit test and a CI step |
| The Air Quality request put `startTime`/`endTime` at the top level; Google rejects it with HTTP 400 (live data silently fell back to demo) | Calling the live API. Now locked in by a request-shape test |
| `gemini-2.5-flash` returns 404 for new keys, so every explanation silently used the template | Reading the live logs. Newer flash models spend the token budget on hidden thinking and truncate the reply; `gemini-3.1-flash-lite` was chosen after comparing them |

## Not covered

- **No live-API tests in CI** (they would need keys and cost money). The live checks above are manual.
- **No browser or end-to-end UI tests.** Accessibility is checked in jsdom (structure, names, roles), which cannot judge colour contrast or real screen-reader behaviour.
- **Photo analysis** has been tested against the real Gemini API with a synthetic image only, not a real room photo through
  the deployed route.
- The deploy workflow and `infra/setup.sh` have not been run (deployment was done with `gcloud` directly).
- The indoor model is not validated against sensors.

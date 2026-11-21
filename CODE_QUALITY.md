# Code quality

How the code is organised, the limits it is held to, and where each rule is enforced. Everything on this page is
checked by `npm run check` (type-check, lint, format check, tests) and by CI on every push.

## Limits enforced by lint

From [`eslint.config.mjs`](eslint.config.mjs), run with `--max-warnings 0`, so a warning fails the build:

| Rule | Limit |
| --- | --- |
| `max-lines` | 200 lines per file, blank lines and comments excluded |
| `max-lines-per-function` | 60 lines (components count as functions) |
| `complexity` | cyclomatic complexity 12 |
| `max-depth` | 4 |
| `max-params` | 5 (longer lists take one object) |
| `no-explicit-any`, `no-non-null-assertion` | forbidden |
| `consistent-type-imports` | type-only imports are written as such |
| `no-console` | forbidden except in the logger and the instrumentation hook |
| `no-warning-comments` | no TODO, FIXME, XXX or HACK |
| `eqeqeq`, `prefer-const`, `no-unused-vars` | on |
| `react-hooks/rules-of-hooks`, `exhaustive-deps` | errors |
| `jsx-a11y` recommended set | on for every component |

TypeScript runs in `strict` mode. [Prettier](.prettierrc.json) (140 columns) and [`.editorconfig`](.editorconfig) keep the
style uniform; CI fails if a file is not formatted.

**What is exempt.** Test files and test fixtures (`src/**/*.test.*`, `src/server/testing/`) are exempt from the file and
function size limits only, because a scenario test is naturally long. Everything else about them is linted. There are
no inline `eslint-disable` comments in the source.

## How the code is organised

Each module has one job, named in its opening comment. The median source file is about 50 lines and the longest is
under 200.

```
src/lib/                    domain: pure functions and constants, no I/O
  impactEngine/             room.ts (volume, filter airflow, indoor mass balance), episodes.ts (exposure periods),
                            pairs.ts (the five actions, before and after), receipt.ts (household total), filters.ts
  personalAdvice.ts         per-group outdoor guidance for who is at home
  horizonGeometry.ts        the chart's coordinates, as pure functions
  i18n/en/*, i18n/hi/*      one module per screen section; the compiler requires Hindi to match English
  airQuality.ts, grapRules.ts, rwa.ts, roomScan.ts, cities.ts, ist.ts ...
src/server/
  ports.ts                  the interfaces the services depend on
  services/                 air quality, room vision, explanation, receipts, analytics
  adapters/                 memory, firestore, google, gemini: implementations of the ports
  http/                     route wrapper, client IP, rate limiter
  container.ts              the one place that wires adapters to services
src/hooks/                  state with a single purpose: useForecast, useSkyClock, useTabs, useHousehold,
                            useRoomScan, useReceiptExplanation, useReceiptSharing ...
src/components/             presentational pieces; App.tsx only composes hooks and panels
src/app/api/*               thin routes: parse, call a service, respond
```

## SOLID, with the files that apply each principle

| Principle | How it is applied | Where |
| --- | --- | --- |
| **Single responsibility** | One reason to change per module: the indoor model, the exposure episodes, the receipt total and the filter comparison are separate files; each screen section, hook and chart part is its own module | [`src/lib/impactEngine/`](src/lib/impactEngine/), [`src/hooks/`](src/hooks/), [`HorizonChart.tsx`](src/components/HorizonChart.tsx), [`ReceiptBody.tsx`](src/components/ReceiptBody.tsx) |
| **Open/closed** | The five receipt actions are a list of small builders; adding an action means adding one builder and one list entry, and the totals code does not change. New languages and cities are data | [`pairs.ts`](src/lib/impactEngine/pairs.ts), [`cities.ts`](src/lib/cities.ts), [`i18n/`](src/lib/i18n/) |
| **Liskov substitution** | Every storage adapter honours the same ports and runs the same contract test, so memory and Firestore are interchangeable | [`storage.contract.test.ts`](src/server/adapters/storage.contract.test.ts) |
| **Interface segregation** | Ports are as narrow as their callers need (a cache has `get` and `set`; a budget has one method). Components take the few props they use, and hooks return only what the page reads | [`ports.ts`](src/server/ports.ts) |
| **Dependency inversion** | Services depend on ports, never on Firestore or Gemini directly. One composition root chooses the adapters; routes ask it for services | [`container.ts`](src/server/container.ts) |

## Habits the code follows

- **Pure first.** Anything that can be a pure function is one (the engine, the chart geometry, the personal advice, the
  forecast parser), and is tested without a browser.
- **No arithmetic in components.** A component formats numbers the engine produced; it does not compute them.
- **Untrusted input is validated at the boundary** (request bodies, uploads, model output, stored data), once, in
  [`validation.ts`](src/lib/validation.ts) and [`requestSchemas.ts`](src/lib/requestSchemas.ts).
- **Every user-facing sentence lives in the catalogues**, with numbers as parameters, so wording can change without
  touching logic, and a translation cannot drift from the English keys.
- **Decisions are recorded** in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Known limits

- The size limits are lint-enforced; whether a module is *well* factored is a judgement, and review is still needed.
- The test files are exempt from the size limits (see above).
- Coverage is reported by the tests, not gated in CI.

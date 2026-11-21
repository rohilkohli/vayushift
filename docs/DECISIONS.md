# Architecture decision records

Short records of the decisions that shaped the code: what was chosen, why, and what it costs. Newest decisions are at the end.

## ADR 1. The language model never does arithmetic

- **Context.** A smog assistant that states wrong numbers is worse than none, and models invent plausible figures.
- **Decision.** A deterministic engine (`src/lib/impactEngine/`) computes every number. Gemini is used for two jobs only:
  reading a room photo into a fixed schema, and explaining results already computed. The server re-validates the photo
  output and rejects any explanation containing a number the engine did not produce, falling back to a template.
- **Consequences.** Numbers are reproducible and testable. The guard checks that a number exists in the computed set, not
  that it is attached to the right quantity.

## ADR 2. Ports and adapters with one composition root

- **Context.** The service must run with no keys (tests, local), on Firestore (production) and against fakes.
- **Decision.** Services depend on narrow ports (`src/server/ports.ts`); memory, Firestore, Google and Gemini adapters
  implement them; `container.ts` is the only place that chooses. A contract test runs against every storage adapter.
- **Consequences.** Swapping storage is one line. More files than a flat design.

## ADR 3. Cloud Run and Firestore

- **Context.** A small stateless service with spiky traffic and short-lived data.
- **Decision.** Cloud Run (scale to zero, standalone Next image) and Firestore Native with TTL policies for cache and receipts;
  secrets in Secret Manager; a dedicated least-privilege runtime account.
- **Consequences.** Idle cost is near zero. Cold starts take a few seconds after a quiet spell.

## ADR 4. Protect the upstream APIs and the bill

- **Context.** The Air Quality and Gemini APIs cost money per call and can fail.
- **Decision.** A shared cache keyed by a ~550 m grid cell, request coalescing, stale-if-error, and daily call budgets shared
  through Firestore that fail closed. Rate limits use the right end of `X-Forwarded-For`; cost-bearing routes refuse
  cross-site requests.
- **Consequences.** Nearby visitors share one answer. Rate limits are per instance; the shared budget is what bounds spend.

## ADR 5. No UI or chart library; self-hosted fonts

- **Context.** First-load size, licences and the content-security policy.
- **Decision.** Charts and the living sky are inline SVG and CSS; text fonts are self-hosted through `next/font`.
- **Consequences.** About 144 kB first-load JavaScript and nothing third-party to allow, at the cost of drawing the chart ourselves
  (`lib/horizonGeometry.ts`, tested).

## ADR 6. Typed message catalogues with numbers as parameters

- **Context.** A Hindi interface must carry exactly the engine's figures and cannot drift from the English one.
- **Decision.** One module per screen section in `i18n/en/` and `i18n/hi/`; the Hindi catalogue is typed against the English
  one, so a missing key or changed signature fails compilation. Messages with figures are functions that receive the numbers.
  Hindi shows a Hindi template explanation instead of the English Gemini text.
- **Consequences.** Data text (GRAP measures, filter notes) stays English and is marked `lang="en"`.

## ADR 7. Size and shape limits are enforced, not described

- **Context.** Long components and functions are the common way a codebase becomes hard to review.
- **Decision.** ESLint fails the build above 200 lines per file, 60 per function, complexity 12 and 5 parameters; Prettier is
  checked in CI; hooks hold state, components present, pure functions in `src/lib` do the work.
- **Consequences.** More, smaller files. Test files are exempt from the size limits only.

## ADR 8. Household guidance uses CPCB bands, tightened for sensitive groups

- **Context.** Two households in the same air should not get the same advice.
- **Decision.** `lib/personalAdvice.ts` classifies outdoor activity as fine, limited or indoors per group. Healthy adults follow
  the CPCB bands (fine to AQI 200, limit to 300). Children, older adults and people with lung or heart conditions are tighter
  (fine to 100, limit to 150), because CPCB lists breathing discomfort for sensitive people from the Satisfactory band. These are
  general precautions, not medical advice, and the thresholds are named constants with tests.
- **Consequences.** Sensitive households are told to stay in more often; the numbers are visible and adjustable in one file.

## ADR 9. Cities use the same live API; GRAP is scoped to Delhi-NCR

- **Context.** A Mumbai visitor must not see Delhi's air or Delhi's rules.
- **Decision.** The city list calls the same `/api/air-quality` route as "my location" with the city's coordinates. GRAP is the
  Delhi-NCR plan, so outside a coarse NCR bounding box the page labels the stages a reference scale.
- **Consequences.** City coordinates are city centres, not neighbourhoods; a visitor can use "my location" for precision.

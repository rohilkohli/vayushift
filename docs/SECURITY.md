# Security

Threat model, the control for each threat, and the test or check that proves it. Anything not proven is listed
under [Known gaps](#known-gaps).

## What is worth protecting

| Asset | Why it matters |
| --- | --- |
| Gemini and Google Maps API keys | A leaked key becomes a bill |
| The daily spend on those APIs | A flood of requests becomes a bill even without a leak |
| Room photos | Private; may carry EXIF or GPS data |
| Shared receipts | Must not expose personal data or be guessable |
| Service availability | Public, unauthenticated demo |

There are no accounts, no passwords and no stored personal data, which removes whole classes of risk.

## Threats and controls

| Threat | Control | Where | Proof |
| --- | --- | --- | --- |
| Key leaks to the browser | Keys exist only on the server; production reads them from Secret Manager. The Air Quality key travels in a header, never a URL | `src/server/config.ts`, `adapters/google/airQuality.ts` | `airQuality.test.ts` ("key in a header, never in the URL") |
| Key leaks through logs or errors | Logger redacts secret-named fields; upstream error bodies are never returned to the caller | `src/server/logger.ts`, `http/handler.ts` | `logger.test.ts`, `google/airQuality.test.ts` ("without exposing the response body") |
| Key abuse if it still leaks | Each key is restricted to a single API (Air Quality only; Generative Language only) | Google Cloud API key restrictions | Checked in the console at creation |
| Rate-limit bypass by forging `X-Forwarded-For` | The client address is the *rightmost* trusted entry; the leftmost is attacker-controlled and ignored. IPv6 is grouped by /64 | `src/server/http/clientIp.ts` | `http.test.ts` ("cannot be spoofed by a client-supplied leftmost entry") |
| A bill from a request flood | Daily budgets on Gemini and the Air Quality API, shared through Firestore. They **fail closed**: if the budget cannot be read, the upstream is not called | `adapters/firestore/budget.ts` | `budget.test.ts` (including concurrency and exhaustion) |
| Cross-site abuse of cost-bearing routes | Requests with `Sec-Fetch-Site: cross-site` are refused (403) | `http/handler.ts` | `routes.test.ts`; confirmed on the live service |
| Oversized or malformed bodies | Body size capped while *streaming* (not just via `Content-Length`); JSON validated with a schema | `http/handler.ts`, `lib/requestSchemas.ts` | `http.test.ts`, `routes.test.ts` |
| Malicious or disguised uploads | Image type decided by magic bytes, not the declared type; 5 MB cap; resized and re-encoded on the device (strips EXIF and GPS); processed in memory, never stored | `lib/validation.ts`, `lib/roomScan.ts` | `security.test.ts` |
| Prompt injection through a photo | Prompt tells the model to ignore text in images; output is schema-constrained, then re-validated (enums, clamped numbers, stripped and length-limited text) | `adapters/gemini`, `lib/roomScan.ts` | `security.test.ts`, `services.test.ts` |
| The model invents numbers | The model never calculates. The server rejects any explanation containing a number the engine did not produce and falls back to a template | `lib/explain.ts`, `services/explain.ts` | `services.test.ts`; observed live (a Gemini text accepted only because its figures matched the engine) |
| Guessable share links | 10-character CSPRNG ids (about 59 bits); receipts hold no personal data and expire (TTL, 90 days) | `services/receipts.ts` | `services.test.ts`, storage contract |
| Cross-site scripting | React escaping, no `dangerouslySetInnerHTML`, strict CSP | `next.config.mjs` | Headers checked on the running server |
| Clickjacking, MIME sniffing, downgrade | CSP, `nosniff`, HSTS (2 years, subdomains), COOP, Referrer-Policy, Permissions-Policy; no `X-Powered-By` | `next.config.mjs` | Verified live (`Strict-Transport-Security: max-age=63072000`) |
| Tracking | Analytics are daily counters with no identifiers; Global Privacy Control and Do Not Track are honoured | `services/analytics.ts`, `lib/clientApi.ts` | `routes.test.ts`, `services.test.ts` |
| Location privacy | Coordinates are snapped to a ~550 m cell before any upstream call | `services/airQuality.ts` | `services/airQuality.test.ts` |
| Misconfigured deploy | Configuration is validated at start-up; a bad revision exits instead of taking traffic | `src/instrumentation.ts`, `config.ts` | `config.test.ts`; container smoke test in CI |
| Over-privileged runtime | The runtime service account has Firestore data access and read access to two named secrets only. No key files; credentials come from the attached account | `infra/setup.sh`, Cloud Run | IAM policy inspected after setup |
| Vulnerable dependencies | `npm audit` is clean. PostCSS is pinned to a patched version via an `overrides` entry | `package.json` | `npm audit` (0 vulnerabilities) |
| Internal details in errors | Uniform error shape; internals are logged, never returned | `http/handler.ts`, `errors.ts` | `http.test.ts` |

## Known gaps

- **Rate limits are per instance.** With several Cloud Run instances, a determined caller gets more than one
  instance's allowance. The shared daily budget caps spend regardless; Cloud Armor would be needed for volumetric
  attacks.
- **The number guard** checks that a number exists in the computed set, not that it is attached to the right quantity.
- **No authentication.** Anyone with a share link can read that receipt (by design; it holds no personal data).
- **Service is public** (`--allow-unauthenticated`), as a demo must be.
- No automated penetration test has been run.

## Reporting

Open a GitHub issue without exploit detail, or contact the repository owner directly.

# Google services

Every Google service the project uses, what for, and how it was confirmed to work. Nothing is listed that is not used.

| Service | Used for | Where | Confirmed |
| --- | --- | --- | --- |
| **Air Quality API** (Google Maps Platform) | Hourly PM2.5 forecast for the user's location | `src/server/adapters/google/airQuality.ts` | Called live with the production key: 24 hourly forecasts for Delhi, region `in` |
| **Gemini API** (`gemini-3.1-flash-lite`) | (1) Reads a room photo into a schema-constrained object. (2) Writes a three-sentence explanation of numbers the engine computed | `src/server/adapters/gemini/index.ts` | Explanation served live (`source: gemini`); vision call checked against the real API |
| **Cloud Firestore** (Native mode, asia-south1) | Shared forecast cache, shareable receipts, analytics counters, daily budgets. TTL policies on `expiresAt` | `src/server/adapters/firestore/*` | `/api/readyz` pings the real database; receipt created, fetched and rendered live |
| **Cloud Run** | Hosts the container (min 0, max 10 instances) | `Dockerfile`, `.github/workflows/deploy.yml` | Live: `https://vayushift-933086836183.asia-south1.run.app` |
| **Cloud Build** / **Artifact Registry** | Builds and stores the image (`gcloud run deploy --source`) | - | Four successful revisions |
| **Secret Manager** | Holds both API keys; the runtime account can read only those two secrets | `infra/setup.sh` | Keys attached to the service as secret environment variables |
| **Cloud Logging / Error Reporting** | Structured JSON logs with severity, trace links and error markers | `src/server/logger.ts` | Used to find all three production bugs (see [TESTING.md](TESTING.md)) |
| **IAM** (service account, API key restrictions) | Least privilege: a dedicated runtime account; each API key limited to one API | `infra/setup.sh` | Configured at creation |

## Why these, and not others

- **Air Quality API** gives a *forecast*, which the whole product depends on (when to act), not only a current reading.
- **Firestore** because the data is small, keyed and short-lived, and the shared daily budget needs transactions. It is
  serverless, so it costs nothing when idle.
- **Cloud Run** because the app is a stateless container that should scale to zero.
- **Gemini** for the two things that need language or vision, and nothing else: the model never does arithmetic.

## Not used (deliberately)

- **Firebase Authentication:** the product has no accounts, by design (privacy).
- **Google Maps JavaScript API:** the app needs air quality at a point, not a map.

## Cost control

Daily call caps (300 photo scans, 2,000 explanations, 20,000 air-quality calls) fail closed. Each API key is restricted to
one API. A billing budget alert is recommended and has not been created.

## Honest limits

- The deploy workflow (Workload Identity Federation) and `infra/setup.sh` were written but not run; the live service was
  deployed with `gcloud run deploy`.
- Photo analysis has been checked against the real Gemini API with a synthetic image, not a real room photo.

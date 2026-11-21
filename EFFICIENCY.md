# Efficiency

Where the app avoids work, and what that is measured by. Figures are from the production build (`npm run build`) unless
stated.

## What the browser downloads and runs

| Choice | Effect |
| --- | --- |
| No chart, animation or UI library: charts are plain SVG, the sky is inline SVG and CSS | First-load JavaScript for the page is about 144 kB (103 kB of it shared by all routes) |
| Text fonts self-hosted with `next/font` (Fraunces, Geist; Devanagari only loaded when a Devanagari character is drawn) | No runtime request to a font CDN for text, no layout shift, nothing for the CSP to allow |
| The sky is driven by CSS variables set on the root element, not by React state | A frame of the sky animation does not re-render the page |
| Smoothing uses `requestAnimationFrame` and exponential easing; reduced-motion applies the change instantly | No per-frame timers, and no motion for people who ask for none |
| Engine results are memoised (`useMemo`) on the forecast, household and choices | Toggling one switch recomputes once, not per component |
| A room photo is resized and re-encoded on the device before it is sent (capped at 5 MB server-side) | Small uploads, and EXIF/GPS never leave the phone |
| Components that are not on screen stay mounted but hidden | Switching tabs is instant and keeps the scrubber position |

## What the server avoids

| Mechanism | Effect |
| --- | --- |
| **Shared forecast cache** keyed by a ~550 m grid cell (30 minutes fresh, 3 hours stale-if-error) | Nearby visitors reuse one upstream call; an upstream outage does not reach the user |
| **Request coalescing** | Concurrent misses for one cell make a single upstream call |
| **Daily budgets** on the Air Quality and Gemini APIs, shared through Firestore and failing closed | A traffic spike cannot become a bill; the app falls back to labelled demo data |
| **Explanation cache** (24 hours) keyed by the computed figures | The same receipt is not sent to Gemini twice |
| Live forecasts are served with `Cache-Control: private, max-age=300` | The browser reuses a recent answer |
| `Server-Timing` and a request id on every response | Slow requests can be found in Cloud Logging |

## What the container does

- Multi-stage build; Next's `standalone` output carries only the files the server needs, and the final image has no
  development dependencies.
- Cloud Run scales to zero, so an idle service costs nothing; Firestore is serverless and has TTL policies on cache
  and receipts, so storage does not grow without bound.
- The Firestore client is loaded on first use, so the in-memory backend (local development, tests) never loads it.

## Algorithmic cost

- The 24-hour forecast, the window search and the indoor model are small fixed-size loops (24 hours, 6-minute steps);
  a whole receipt takes about 0.02 ms (measured over 1,000 runs on a development machine) and runs on the client and the
  server from the same code.
- The share link recomputes the receipt on the server from the inputs, so a link stores a few hundred bytes, not figures.

## Not measured

A Lighthouse or load-test report has not been run against the deployed service, so no such score is claimed. Cold-start
time on Cloud Run is a few seconds after a quiet spell; setting a minimum of one instance removes it, at a small cost.

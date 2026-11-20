# Sample inputs for evaluators

Live app: https://vayushift-933086836183.asia-south1.run.app

You do not need an account, a photo or any setup. Each step below says what to do, what you should see, and which
requirement from the problem statement it demonstrates. The whole tour takes about five minutes.

## 1. Real-time outdoor data (not predefined)

| Do this | You should see |
| --- | --- |
| Open the app and press **My location** (allow location), **or** open the **Pick a city** list and choose **Mumbai** | The status bar shows **Live forecast · Source: Google Air Quality API · updated HH:MM IST**, and a message "Showing the live forecast for Mumbai." The figures are that place's real hourly PM2.5, not Delhi's |
| Choose **Delhi**, then **Chennai** | Different curves and different advice for each city. Without a location or city, the first screen uses a clearly labelled **Demo telemetry** scenario |
| Open the **Community** tab while on Mumbai | A note that GRAP is the Delhi-NCR plan and that the stages are a reference scale elsewhere |

Gemini never produces an air-quality figure. If the live service is unavailable, the page says "Demo telemetry" instead
of pretending.

## 2. Personalised guidance (same city, different households)

On **Living Sky**, scroll to **Your household** and **Who lives here**, then read **Outdoor guidance for your household**.

| Household to try | What changes |
| --- | --- |
| Tick **Children (under 12)** only | A "Children" card with a stricter limit than "Healthy adults": the same AQI can be "fine" for adults and "stay indoors" for a child, with the best hour to go out and whether to wear an N95 |
| Also tick **Older adults (65+)** and **Asthma, heart or lung condition** | One card per group, each with its own advice |
| Untick everything | Only "Healthy adults" |
| With a sensitive group ticked, scrub the hour slider to **15:00** | When even the low-smog window is polluted, the app shortens recommended airing to 10 minutes and tells the household to keep the sensitive person in another room |
| Set **Usual commute** to *Diesel car*, **Commute, km round trip** to *30*, switch on **Metro + N95 corridor** | The cigarette-equivalents avoided and the CO₂ saved update, with the working shown on the receipt |

## 3. Low-emission daily routine

- Drag the **24-hour horizon** or press **Play 24h sky**: the advice, the numbers and the sky follow the hour (morning
  inversion peak, solar mixing window, night).
- Press **Jump to … safe window** to land on the cleanest 90 minutes of the day.
- Switch on **Afternoon air shift**, **Walk at the low point**, **Induction cooking** and **Metro + N95 corridor**:
  each shows what it saves on its own, and the total updates the **Daily Sanctuary Delta** card.

## 4. Indoor air quality

Open **Room Sanctuary**.

| Do this | You should see |
| --- | --- |
| In **Or scan your own room**, press a **sample room** (for example *Kids study (120 sq ft)*) | Room size, window type and stove are filled in and the filter options re-rank for that room |
| Compare **DIY MERV-13 box**, **box fan** and **HEPA unit** | Cost, noise, modelled indoor PM2.5 reduction and whether each meets the 5-air-changes-per-hour target |
| Set **Night-time noise sensitivity** to *High* | Sleep advice changes (run the DIY box in the evening, switch it off at bedtime, or choose HEPA) |
| *(Optional)* Upload any JPEG, PNG or WebP photo of a room | Gemini reads it into a checked schema; the values stay editable. A photo that is not a room is rejected politely and the sliders are used instead |

## 5. Explaining the impact

Press **Full receipt** (or **Receipt** on the other tabs):

- per person, per household and per 90-day season figures, each with the formula and its source;
- a plain-language explanation written by Gemini **only from the numbers shown**; the server rejects any sentence that
  contains a number the engine did not compute and falls back to a template (the receipt says which one you are reading);
- **Copy share link** creates a link valid for 90 days.

## 6. Community

On **Community**: today's GRAP stage and what typically applies, a vehicle check (try *Petrol car, BS-III or older*),
the night-guard heater calculator, and a ready-to-share **WhatsApp advisory in English and Hindi**.

## 7. Language and accessibility

- **हिन्दी** in the header switches the whole interface to Hindi; the figures stay identical.
- **High contrast** in the header (or your device's "more contrast" setting, or `?contrast=high`) switches to a theme whose
  every text and background pairing is at least 7:1.
- Everything works from the keyboard (Tab, arrow keys on the slider and tabs); the first Tab stop is a "Skip to content" link.

## URL shortcuts

| URL | Effect |
| --- | --- |
| `/?hour=8` | Opens at 08:00 |
| `/?lang=hi` | Opens in Hindi |
| `/?contrast=high` | Opens in high contrast |
| `/?sky=night` | Forces the night theme |
| `/#lab`, `/#community` | Opens that tab |

## Calling the API directly

```bash
# Hourly forecast for Mumbai (live when the upstream is reachable, otherwise a labelled demo curve)
curl "https://vayushift-933086836183.asia-south1.run.app/api/air-quality?lat=19.076&lng=72.8777" \
  -H "Origin: https://vayushift-933086836183.asia-south1.run.app"
```

The response is `{ scenario: { hourly: [24 values], source, fetchedAt, provider }, mode: "live" | "demo" }`. Browsers
send the `Origin` header themselves; cross-site requests are refused (see `docs/SECURITY.md`). The full API is in
`docs/openapi.yaml`.

## Run it yourself

```bash
npm install
npm run dev        # http://localhost:3000, works with no API keys (demo data, sample rooms, template text)
npm test           # 310 tests
```

Set `GOOGLE_MAPS_API_KEY` for live air quality and `GEMINI_API_KEY` for photo reading and explanations
(see the Configuration section of the README).

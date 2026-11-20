# Accessibility

Target: WCAG 2.1 AA. This page lists what is built, how it was checked, and what is not yet covered.

## What is built

| Area | Implementation |
| --- | --- |
| Landmarks and skip | A skip link to the main content; one `main` landmark |
| Tabs | `role="tablist"` / `aria-selected`, arrow-key navigation, deep-linkable (`#tab`) |
| Switches | Real buttons with `role="switch"`; the on/off state is also written as text, not colour alone |
| 24-hour horizon chart | `role="img"` labelled by a title and description; a full **table alternative** (`<caption>`, current hour marked with `aria-current`); the low-smog window is **hatched as well as coloured** |
| The hour slider | Labelled "Hour of day"; `aria-valuetext` announces the time with outdoor and indoor PM2.5 in words ("08:00, outdoor PM2.5 148 micrograms per cubic metre, indoor 90") |
| Live results | Results and status changes use `role="status"` / `aria-live` regions |
| Dialog | Native `<dialog>` with focus handling, closable by keyboard |
| Forms | Every control is labelled; errors are described in text |
| Touch | 44 px minimum targets on interactive controls |
| Language | Hindi text is marked `lang="hi"` so screen readers switch voice |
| Motion | `prefers-reduced-motion` stops drifting clouds, birds and sun rays, and makes sky changes instant. Autoplay is user-started |
| Transparency | `prefers-reduced-transparency` replaces frosted glass with solid panels |
| Forced colours | `forced-colors` mode keeps borders and focus rings visible |
| Focus | Visible focus ring that works on both light and dark backdrops |
| Decorative art | The sky scene (sun, moon, stars, clouds, birds, wind) is `aria-hidden` |

## The hard part: text over a moving sky

The background changes with the hour, so text contrast is not fixed. Two checks were run:

1. **axe-core (WCAG 2.1 A/AA)** on every tab: clean.
2. **A pixel check of the rendered backdrop at all 24 hours**: for each line of text, at least 99% of the pixels behind it meet
   4.5:1 (3:1 for large text). The excluded 1% are isolated star specks and thin sun rays.

Headlines carry a faint text shadow rather than a panel behind them.

**Automated (runs in CI):** `src/components/accessibility.test.tsx` renders the whole app and runs axe-core (WCAG 2.1 A/AA
and best-practice rules) on the first screen and every tab, and checks the skip link, landmarks, slider text, table
alternative and switches. It includes a self-check that deliberately bad markup is flagged, so a clean run means something.

**Still manual:** colour contrast. jsdom paints nothing, so contrast is excluded from the automated run. The pixel check
predates the font change (Fraunces and Geist) and the removal of the dark headline panel, and has not been re-run.

## Not covered yet

- No language switch for the whole interface (only the Community advisory is bilingual).
- Not tested with a real screen reader (NVDA, VoiceOver, TalkBack); only axe and the checks above.
- The sky animation cannot be paused independently of "reduce motion" (the autoplay can be).

## How to check it yourself

Run `npm run dev`, open each tab, press Tab through the page, and try the slider with the arrow keys. In browser dev
tools, emulate `prefers-reduced-motion` and `forced-colors`.

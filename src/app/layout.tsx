import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

/**
 * Fonts are downloaded at build time and served from our own origin: no runtime request to Google, no
 * layout shift (next/font sizes the fallback to match), and nothing for the CSP to allow.
 * Fraunces (display serif, optical size axis so it stays crisp from body-size to hero) for headlines and
 * the big figures; Geist (neutral UI sans with tabular figures) for everything else. Both are variable,
 * open-licence (OFL) families.
 */
const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});
const ui = Geist({ subsets: ["latin"], display: "swap", variable: "--font-ui" });
// Fraunces and Geist have no Devanagari glyphs; these take over for Hindi text. preload is off so English-only
// visitors never download them (the browser fetches them only when a Devanagari character is drawn).
const hiDisplay = Noto_Serif_Devanagari({ subsets: ["devanagari"], display: "swap", variable: "--font-hi-display", preload: false });
const hiUi = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", variable: "--font-hi-ui", preload: false });

export const metadata: Metadata = {
  title: "VayuShift: your daily clean-air plan",
  description:
    "Turn hourly smog forecasts and a room photo into a timed daily routine, low-cost indoor air fixes and a verifiable impact receipt.",
};

export const viewport: Viewport = { themeColor: "#0f2a44", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${hiDisplay.variable} ${hiUi.variable}`}>
      <head>
        {/* Icon font only: the text fonts above are self-hosted. display=block keeps icons invisible until the font
            arrives, instead of showing their ligature names ("near_me") as stray letters while it loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

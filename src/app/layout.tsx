import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
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

export const metadata: Metadata = {
  title: "VayuShift: your daily clean-air plan",
  description:
    "Turn hourly smog forecasts and a room photo into a timed daily routine, low-cost indoor air fixes and a verifiable impact receipt.",
};

export const viewport: Viewport = { themeColor: "#0f2a44", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <head>
        {/* Icon font only: the text fonts above are self-hosted. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

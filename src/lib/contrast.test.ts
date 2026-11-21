import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { luminance } from "./skyPalette";

/**
 * The high-contrast mode is only worth having if its colours really are high contrast. This reads the tokens
 * straight out of globals.css (so the test cannot drift from the stylesheet) and checks each text/background
 * pairing against WCAG AAA (7:1 for normal text).
 */
const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe.each([
  ["day", 'html[data-contrast="high"]'],
  ["night", 'html[data-contrast="high"][data-sky="night"]'],
])("high contrast, %s", (_name, selector) => {
  const t = tokens(selector);

  it("defines every colour the interface reads", () => {
    for (const key of [
      "--hc-bg",
      "--hc-fg",
      "--ink",
      "--ink-soft",
      "--accent",
      "--good",
      "--glass",
      "--chip",
      "--sel-bg",
      "--sel-fg",
      "--hero-ink",
    ]) {
      expect(t[key], key).toBeDefined();
    }
  });

  it("meets 7:1 (WCAG AAA) for every text and background pairing", () => {
    const pairs: Array<[string, string, string]> = [
      ["body text", t["--ink"], t["--hc-bg"]],
      ["secondary text", t["--ink-soft"], t["--hc-bg"]],
      ["accent text", t["--accent"], t["--hc-bg"]],
      ["positive text", t["--good"], t["--hc-bg"]],
      ["headline on the page", t["--hero-ink"], t["--hc-bg"]],
      ["text on panels", t["--ink"], t["--glass"]],
      ["text on chips and fields", t["--ink"], t["--chip"]],
      ["selected pill", t["--sel-fg"], t["--sel-bg"]],
      ["border against the page", t["--hc-fg"], t["--hc-bg"]],
    ];
    for (const [what, fg, bg] of pairs) {
      expect(ratio(fg, bg), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("high contrast, fixed pairings", () => {
  it("the dark scrim keeps white text at the maximum ratio", () => {
    expect(ratio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("the ratio helper agrees with known values", () => {
    expect(ratio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(ratio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

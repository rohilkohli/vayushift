import { describe, expect, it } from "vitest";
import { ventilationAdvice } from "../airQuality";
import { en } from "./en";
import { hi } from "./hi";
import { MESSAGES, initialLang } from "./index";

const DEVANAGARI = /[ऀ-ॿ]/;
/** The figures in a sentence. Digits that are part of a name (PM2.5, CO2) are not figures. */
const numbers = (s: string) => (s.replace(/PM2\.5|CO2|CO₂/g, "").match(/\d+(?:\.\d+)?/g) ?? []).sort();

describe("catalogues", () => {
  it("Hindi defines exactly the keys English does, with the same kinds of value", () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      // English keeps the engine's own sentence for the explanation (null); Hindi supplies a template (a function).
      if (key === "explainTemplate") continue;
      expect(typeof hi[key], key).toBe(typeof en[key]);
    }
    expect(en.explainTemplate).toBeNull();
    expect(typeof hi.explainTemplate).toBe("function");
  });

  it("no Hindi string is empty or still plain English", () => {
    const leaves = (v: unknown): string[] =>
      typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(leaves) : [];
    // These legitimately contain no Devanagari: names, units, abbreviations, or text that is the same in both languages.
    const same = new Set(["English", "WhatsApp advisory (English + हिन्दी)", "AQI", "CO₂", ""]);
    for (const [key, value] of Object.entries(hi)) {
      for (const s of leaves(value)) {
        if (same.has(s)) continue;
        expect(s.trim().length, key).toBeGreaterThan(0);
        expect(DEVANAGARI.test(s) || /^[\d\s.,µ/³²%+−×=≈→·:()₹-]+$/.test(s), `${key}: "${s}"`).toBe(true);
      }
    }
  });

  it("every message that takes numbers keeps all of them, in both languages", () => {
    const args = { n: 7, m: 12, p: 34, q: 56, r: 78 };
    const call = (f: (...a: never[]) => string, ...a: unknown[]) => (f as (...x: unknown[]) => string)(...a);
    const cases: Array<[keyof typeof en, unknown[]]> = [
      ["nowLine", [args.n, args.m]],
      ["subMorning", [args.n, "08:00", args.m]],
      ["subNight", [args.n, args.m]],
      ["subTransition", [args.n, "Delhi", args.m, "13:00 – 14:30"]],
      ["valueText", ["08:00", args.n, args.m]],
      ["chartDesc", [{ start: "13:00", end: "14:30", mean: args.n, time: "08:00", out: args.m, inn: args.p }]],
      ["subWindow", [{ advice: "Keep windows shut.", mean: args.n, pct: args.m, peak: args.p, aqi: args.q, cigs: "9.9" }]],
      ["personalLine", [{ nowLevel: "limit", bestLevel: "ok", nowAqi: args.n, best: "15:00", bestAqi: args.m, minutes: args.p }]],
      ["turnover", [args.n, "5.1"]],
      ["envelopeChip", [180, 10]],
      ["filtersBadge", [255]],
      ["modelled", [67]],
      ["noiseDb", [4, 9]],
      ["shareText", ["Delhi", 8.57, 648]],
    ];
    for (const [key, a] of cases) {
      const values = a.flatMap((x) => (typeof x === "object" && x !== null ? Object.values(x) : [x]));
      const wanted = numbers(
        values
          .filter((x) => typeof x === "number" || /\d/.test(String(x)))
          .map(String)
          .join(" "),
      );
      for (const lang of [en, hi] as const) {
        const out = call(lang[key] as never, ...a);
        for (const n of wanted) expect(out, `${key}: ${n}`).toContain(n);
      }
    }
  });

  it("the Hindi advice states the same thresholds and minutes as the English engine text", () => {
    for (const [trough, dayMin] of [
      [100, 400],
      [300, 100],
      [100, 100],
    ] as const) {
      const advice = ventilationAdvice(trough, dayMin);
      const hindi = hi.adviceSentence(advice.mode, advice.minutes, advice.headline);
      expect(DEVANAGARI.test(hindi)).toBe(true);
      expect(numbers(hindi), advice.mode).toEqual(numbers(advice.headline));
      // English mode returns the engine's own sentence unchanged.
      expect(en.adviceSentence(advice.mode, advice.minutes, advice.headline)).toBe(advice.headline);
    }
  });

  it("the Hindi receipt explanation carries the engine's figures and nothing invented", () => {
    const text = hi.explainTemplate!(8.57, 648, 151.8, 30.8, 79.7);
    expect(numbers(text)).toEqual(numbers("8.57 648 151.8 30.8"));
    const noCo2 = hi.explainTemplate!(2.5, 0, 90, 60, 0);
    expect(numbers(noCo2)).toEqual(numbers("2.5"));
  });

  it("MESSAGES maps each language to its catalogue", () => {
    expect(MESSAGES.en).toBe(en);
    expect(MESSAGES.hi).toBe(hi);
  });
});

describe("initialLang", () => {
  it("prefers an explicit ?lang=, then the saved choice, then the browser language", () => {
    expect(initialLang("?lang=hi", "en", "en-US")).toBe("hi");
    expect(initialLang("?lang=en", "hi", "hi-IN")).toBe("en");
    expect(initialLang("", "hi", "en-US")).toBe("hi");
    expect(initialLang("", null, "hi-IN")).toBe("hi");
    expect(initialLang("", null, "en-GB")).toBe("en");
    expect(initialLang("", null, undefined)).toBe("en");
  });

  it("ignores values it does not support", () => {
    expect(initialLang("?lang=fr", "de", "en-US")).toBe("en");
    expect(initialLang("?lang=<script>", null, "fr")).toBe("en");
  });
});

import { en, type Messages } from "./en";
import { hi } from "./hi";

export type Lang = "en" | "hi";
export type { Messages };

export const MESSAGES: Record<Lang, Messages> = { en, hi };
export const LANG_STORAGE_KEY = "vayushift-lang";

export const isLang = (v: unknown): v is Lang => v === "en" || v === "hi";

/** The language to start in: an explicit ?lang=, then the saved choice, then the browser's language. */
export function initialLang(search: string, saved: string | null, browser: string | undefined): Lang {
  const asked = new URLSearchParams(search).get("lang");
  if (isLang(asked)) return asked;
  if (isLang(saved)) return saved;
  return browser?.toLowerCase().startsWith("hi") ? "hi" : "en";
}

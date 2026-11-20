"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANG_STORAGE_KEY, MESSAGES, initialLang, type Lang, type Messages } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  t: Messages;
  setLang: (l: Lang) => void;
  /** Spread onto elements whose text stays in English inside the Hindi interface, so screen readers switch voice. */
  englishAttrs: { lang?: "en" };
}

const LangContext = createContext<LangContextValue>({ lang: "en", t: MESSAGES.en, setLang: () => {}, englishAttrs: {} });

/**
 * Holds the interface language. It always starts as English so the server and first client render match, then
 * switches (once, after hydration) to ?lang=, the saved choice, or the browser's language. The choice is
 * remembered in this browser only, and <html lang> follows it.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // storage blocked: fine, fall back to the browser language
    }
    setLangState(initialLang(globalThis.location.search, saved, navigator.language));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      // not remembered; still applied for this visit
    }
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({ lang, t: MESSAGES[lang], setLang, englishAttrs: lang === "hi" ? { lang: "en" } : {} }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
/** The current language's messages. */
export const useT = () => useContext(LangContext).t;

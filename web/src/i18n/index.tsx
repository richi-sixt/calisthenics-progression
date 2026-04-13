"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { format as dateFnsFormat } from "date-fns";
import { de as deLocale } from "date-fns/locale/de";
import { enUS as enLocale } from "date-fns/locale/en-US";
import en from "./translations/en";
import de from "./translations/de";

type TranslationKey = keyof typeof en;
type Locale = "en" | "de";

const dateFnsLocales: Record<Locale, import("date-fns").Locale> = {
  en: enLocale,
  de: deLocale,
};

const translations: Record<Locale, Record<string, string>> = { en, de };

const STORAGE_KEY = "calisthenics-progression-lang";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "de" || stored === "en") return stored;
  return navigator.language.startsWith("de") ? "de" : "en";
}

/** Locale-aware date format patterns */
const dateFormats: Record<Locale, { short: string; long: string; dateTime: string }> = {
  en: { short: "MMM d, yyyy", long: "MMMM d, yyyy", dateTime: "MMM d, yyyy 'at' HH:mm" },
  de: { short: "dd.MM.yyyy", long: "d. MMMM yyyy", dateTime: "dd.MM.yyyy, HH:mm" },
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Format a date string locale-aware. Variants: "short" (default), "long", "dateTime" */
  formatDate: (date: string | Date, variant?: "short" | "long" | "dateTime") => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (
      key: TranslationKey,
      params?: Record<string, string | number>
    ): string => {
      let text = translations[locale][key] ?? translations["en"][key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: string | Date, variant: "short" | "long" | "dateTime" = "short"): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      const pattern = dateFormats[locale][variant];
      return dateFnsFormat(d, pattern, { locale: dateFnsLocales[locale] });
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export type { Locale, TranslationKey };

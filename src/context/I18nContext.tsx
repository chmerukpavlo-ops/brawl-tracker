import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  intlLocale,
  isLocale,
  translate,
  translateArray,
  type Locale,
  type TranslateVars,
  type TranslationKey,
} from "../i18n";
import { parseUrl, updateUrl } from "../navigation/urlState";
import { haptic } from "../hooks/useHaptic";

const STORAGE_KEY = "brawl_locale";

export type TranslateFunction = (
  key: TranslationKey,
  vars?: TranslateVars
) => string;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslateFunction;
  /** Helper for arrays of translations (e.g. loading phrases). */
  tArray: (key: TranslationKey) => readonly string[];
  /** BCP-47 locale tag (`uk-UA` / `en-US`) for `Intl.*` APIs. */
  intlLocale: string;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (d: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (d: Date | number, now?: number) => string;
  systemLocale: Locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readPersistedLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writePersistedLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore quota errors */
  }
}

const RTF_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
  ["second", 1000],
];

function pickUrlLocale(): Locale | null {
  const url = parseUrl();
  return isLocale(url.lang) ? url.lang : null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const systemLocale = useMemo(() => detectBrowserLocale(), []);

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return (
      pickUrlLocale() ??
      readPersistedLocale() ??
      detectBrowserLocale() ??
      DEFAULT_LOCALE
    );
  });

  // Keep <html lang> in sync with the active locale.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState((prev) => {
      if (prev === next) return prev;
      writePersistedLocale(next);
      haptic.medium();
      return next;
    });
  }, []);

  const intl = useMemo(() => intlLocale(locale), [locale]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(intl),
    [intl]
  );

  const t = useCallback<TranslateFunction>(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const tArray = useCallback(
    (key: TranslationKey) => translateArray(locale, key),
    [locale]
  );

  const formatNumber = useCallback(
    (n: number, options?: Intl.NumberFormatOptions) => {
      if (!options) return numberFormatter.format(n);
      return new Intl.NumberFormat(intl, options).format(n);
    },
    [intl, numberFormatter]
  );

  const formatDate = useCallback(
    (d: Date | number, options?: Intl.DateTimeFormatOptions) => {
      const date = typeof d === "number" ? new Date(d) : d;
      const opts: Intl.DateTimeFormatOptions =
        options ?? { year: "numeric", month: "short", day: "numeric" };
      return new Intl.DateTimeFormat(intl, opts).format(date);
    },
    [intl]
  );

  const formatRelativeTime = useCallback(
    (d: Date | number, now: number = Date.now()) => {
      const ts = typeof d === "number" ? d : d.getTime();
      const diff = ts - now;
      const abs = Math.abs(diff);

      // Within 30s — collapse to "щойно" / "just now".
      if (abs < 30_000) {
        return locale === "uk" ? "щойно" : "just now";
      }

      const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
      for (const [unit, ms] of RTF_UNITS) {
        if (abs >= ms) {
          const value = Math.round(diff / ms);
          return rtf.format(value, unit);
        }
      }
      return rtf.format(Math.round(diff / 1000), "second");
    },
    [intl, locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      tArray,
      intlLocale: intl,
      formatNumber,
      formatDate,
      formatRelativeTime,
      systemLocale,
    }),
    [locale, setLocale, t, tArray, intl, formatNumber, formatDate, formatRelativeTime, systemLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}

export { I18nContext };

/**
 * Updates the URL's `?lang=` parameter without overwriting other state.
 * Should be called when the user explicitly changes locale and we want the
 * change to be shareable.
 */
export function syncLocaleToUrl(locale: Locale): void {
  updateUrl({ lang: locale }, { replace: true });
}

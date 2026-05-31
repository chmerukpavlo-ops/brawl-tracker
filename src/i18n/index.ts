import { en } from "./locales/en";
import { uk, type Translations } from "./locales/uk";

export type Locale = "uk" | "en";
export const LOCALES: Locale[] = ["uk", "en"];
export const DEFAULT_LOCALE: Locale = "uk";

export const translations: Record<Locale, Translations> = { uk, en };

export const LOCALE_LABELS: Record<Locale, { native: string; flag: string }> = {
  uk: { native: "Українська", flag: "🇺🇦" },
  en: { native: "English", flag: "🇬🇧" },
};

/**
 * Walks an arbitrarily nested record and produces dotted paths whose leaves
 * are strings. Arrays of strings are treated as leaves (mostly for loading
 * phrase rotations).
 */
type DotNotation<T, Prev extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prev}${K}`
    : T[K] extends string[] | readonly string[]
      ? `${Prev}${K}`
      : T[K] extends object
        ? DotNotation<T[K], `${Prev}${K}.`>
        : never;
}[keyof T & string];

export type TranslationKey = DotNotation<Translations>;

export type TranslateVars = Record<string, string | number>;

function lookup(dict: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in (acc as object)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

function applyVars(value: string, vars?: TranslateVars): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? `{${k}}` : String(v);
  });
}

/**
 * Translate a string by dotted key. Falls back to the default locale and
 * eventually to the key itself. Logs a `console.warn` once per missing key
 * (in dev) so that QA notices it without flooding the console.
 */
const warnedKeys = new Set<string>();

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: TranslateVars
): string {
  const primary = lookup(translations[locale], key);
  if (typeof primary === "string") return applyVars(primary, vars);
  const fallback = lookup(translations[DEFAULT_LOCALE], key);
  if (typeof fallback === "string") {
    if (
      typeof console !== "undefined" &&
      !warnedKeys.has(`${locale}:${key}`) &&
      locale !== DEFAULT_LOCALE
    ) {
      warnedKeys.add(`${locale}:${key}`);
      console.warn(
        `[i18n] Missing translation for "${key}" in locale "${locale}". Using default.`
      );
    }
    return applyVars(fallback, vars);
  }
  if (!warnedKeys.has(key)) {
    warnedKeys.add(key);
    if (typeof console !== "undefined") {
      console.warn(`[i18n] Unknown translation key "${key}".`);
    }
  }
  return key;
}

/**
 * Returns the array variant of a translation (for arrays like loading
 * phrases). Falls back gracefully to an empty array on miss.
 */
export function translateArray(
  locale: Locale,
  key: TranslationKey
): readonly string[] {
  const primary = lookup(translations[locale], key);
  if (Array.isArray(primary)) return primary as readonly string[];
  const fallback = lookup(translations[DEFAULT_LOCALE], key);
  if (Array.isArray(fallback)) return fallback as readonly string[];
  return [];
}

/** Returns a normalized BCP-47 locale tag suitable for `Intl.*` APIs. */
export function intlLocale(locale: Locale): string {
  return locale === "uk" ? "uk-UA" : "en-US";
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const browser = (navigator.language || "uk").toLowerCase();
  if (browser.startsWith("uk")) return "uk";
  if (browser.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export function isLocale(input: unknown): input is Locale {
  return typeof input === "string" && (input === "uk" || input === "en");
}

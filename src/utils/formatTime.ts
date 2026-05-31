const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type SupportedLocale = "uk" | "en";

function readLocale(): SupportedLocale {
  if (typeof localStorage !== "undefined") {
    try {
      const v = localStorage.getItem("brawl_locale");
      if (v === "en") return "en";
    } catch {
      /* ignore */
    }
  }
  return "uk";
}

function intlTag(locale: SupportedLocale): string {
  return locale === "uk" ? "uk-UA" : "en-US";
}

/**
 * Formats a timestamp as "just now / N minutes ago / N hours ago / N days ago".
 *
 * Locale auto-detected from `localStorage.brawl_locale` so it stays in sync
 * with the active UI locale even when the caller doesn't have access to the
 * `useI18n` context (e.g. modules outside React tree).
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const locale = readLocale();
  const diff = Math.max(0, now - timestamp);

  if (diff < 30_000) {
    return locale === "uk" ? "щойно" : "just now";
  }

  const rtf = new Intl.RelativeTimeFormat(intlTag(locale), { numeric: "auto" });

  if (diff < HOUR) {
    const mins = Math.max(1, Math.floor(diff / MINUTE));
    return rtf.format(-mins, "minute");
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return rtf.format(-hours, "hour");
  }

  const days = Math.floor(diff / DAY);
  return rtf.format(-days, "day");
}

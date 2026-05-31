/**
 * Localized countdown / relative-time formatter for the encyclopedia
 * event rotation. Pure & dependency-free — no `Intl.RelativeTimeFormat`
 * because we want concrete, compact strings ("4h 12m") instead of fuzzy
 * ones ("in 4 hours").
 */

import type { TranslateFunction } from "../context/I18nContext";

export type CountdownLocale = "uk" | "en";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Decompose a positive duration in ms into d/h/m/s. Negative durations
 * are clamped to zero — the UI treats those as "ended".
 */
export function decomposeDuration(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms));
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);
  const seconds = Math.floor((total % MINUTE) / SECOND);
  return { totalMs: total, days, hours, minutes, seconds };
}

/**
 * Renders a duration as a compact two-unit string driven by the i18n
 * `encyclopedia.time.*` keys. Picks the two most significant non-zero
 * units; for ranges below a minute we drop to plain seconds.
 */
export function formatCountdown(
  ms: number,
  t: TranslateFunction,
  _locale: CountdownLocale = "uk"
): string {
  const parts = decomposeDuration(ms);
  if (parts.totalMs <= 0) return "0";

  if (parts.days > 0) {
    if (parts.hours > 0) {
      return t("encyclopedia.time.daysHours", {
        days: String(parts.days),
        hours: String(parts.hours),
      });
    }
    return t("encyclopedia.time.days", { count: String(parts.days) });
  }

  if (parts.hours > 0) {
    if (parts.minutes > 0) {
      return t("encyclopedia.time.hoursMinutes", {
        hours: String(parts.hours),
        minutes: String(parts.minutes),
      });
    }
    return t("encyclopedia.time.hours", { count: String(parts.hours) });
  }

  if (parts.minutes > 0) {
    return t("encyclopedia.time.minutes", { count: String(parts.minutes) });
  }

  return t("encyclopedia.time.seconds", { count: String(parts.seconds) });
}

/**
 * Returns ms remaining until `iso`. Negative if already past.
 * Tolerates a non-ISO string (returns NaN) so callers can guard with
 * `Number.isFinite`.
 */
export function msUntil(iso: string, now: number = Date.now()): number {
  const target = Date.parse(iso);
  if (!Number.isFinite(target)) return Number.NaN;
  return target - now;
}

/**
 * High-level helper: returns a description for an event window:
 *  - `endsIn`   while we're inside the window
 *  - `startsIn` before the window opens
 *  - `ended`    after the window closes
 */
export interface EventStatus {
  state: "starts" | "ends" | "ended";
  remainingMs: number;
  label: string;
}

export function describeEventWindow(
  startIso: string,
  endIso: string,
  t: TranslateFunction,
  now: number = Date.now()
): EventStatus {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(end)) {
    return { state: "ended", remainingMs: 0, label: t("encyclopedia.events.ended") };
  }
  if (Number.isFinite(start) && now < start) {
    const remaining = start - now;
    return {
      state: "starts",
      remainingMs: remaining,
      label: t("encyclopedia.events.startsIn", {
        time: formatCountdown(remaining, t),
      }),
    };
  }
  if (now >= end) {
    return { state: "ended", remainingMs: 0, label: t("encyclopedia.events.ended") };
  }
  const remaining = end - now;
  return {
    state: "ends",
    remainingMs: remaining,
    label: t("encyclopedia.events.endsIn", {
      time: formatCountdown(remaining, t),
    }),
  };
}

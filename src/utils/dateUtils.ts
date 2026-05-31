const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(d1: Date, d2: Date): number {
  return Math.round(
    (startOfDay(d2).getTime() - startOfDay(d1).getTime()) / DAY_MS
  );
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

export function getWeekDates(reference: Date = new Date()): string[] {
  const ref = startOfDay(reference);
  const day = ref.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(ref, offsetToMonday);
  return Array.from({ length: 7 }, (_, i) => formatDate(addDays(monday, i)));
}

export const WEEKDAY_LABELS_UK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export function formatShortDate(value: string): string {
  const d = parseDate(value);
  if (!d) return value;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Short relative-time label in Ukrainian (e.g. "щойно", "5 хв тому",
 * "3 дні тому", "2 тижні тому"). Returned without grammar for older dates.
 */
export function formatRelativeUk(timestamp: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return "щойно";
  const min = Math.floor(sec / 60);
  if (min < 1) return `${sec} с тому`;
  if (min < 60) return `${min} хв тому`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} год тому`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} тиж тому`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} міс тому`;
  const years = Math.floor(days / 365);
  return `${years} р тому`;
}

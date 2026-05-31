/**
 * brawl_analytics_consent
 *
 *   "granted"  → user opted-in; adapter may load + send events
 *   "denied"   → user opted-out; adapter MUST stay dormant
 *    null      → user has not made a decision yet (banner shows)
 *
 * Deliberately stored separately from `brawl_telemetry_consent`
 * (Sentry) so users can grant analytics without grants for crash
 * reporting and vice versa — the two have different threat models and
 * the consent UI exposes both toggles independently.
 */

const STORAGE_KEY = "brawl_analytics_consent";

export type AnalyticsConsent = "granted" | "denied";

type ConsentListener = (next: AnalyticsConsent | null) => void;

const listeners = new Set<ConsentListener>();

function safeRead(): AnalyticsConsent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
    return null;
  } catch {
    return null;
  }
}

function safeWrite(value: AnalyticsConsent | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    /* private mode / quota — degrade gracefully */
  }
}

/** Synchronous read for early bootstrap (`main.tsx`). */
export function getAnalyticsConsent(): AnalyticsConsent | null {
  return safeRead();
}

/** True only when the user has explicitly granted consent. */
export function hasAnalyticsConsent(): boolean {
  return safeRead() === "granted";
}

/** Persist a new consent value and notify listeners. */
export function setAnalyticsConsent(value: AnalyticsConsent | null): void {
  safeWrite(value);
  for (const cb of listeners) cb(value);
}

/** Subscribe to consent changes. Returns the unsubscribe function. */
export function subscribeAnalyticsConsent(cb: ConsentListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

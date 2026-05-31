/**
 * brawl_telemetry_consent
 *
 *   "granted"  → user opted-in; SDK may load + send events
 *   "denied"   → user opted-out; SDK MUST stay dormant
 *    null      → user has not made a decision yet (show banner)
 *
 * The default is `null`, NOT `granted` — privacy is opt-in.
 */

const STORAGE_KEY = "brawl_telemetry_consent";

export type TelemetryConsent = "granted" | "denied";

type ConsentListener = (next: TelemetryConsent | null) => void;

const listeners = new Set<ConsentListener>();

function safeRead(): TelemetryConsent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
    return null;
  } catch {
    return null;
  }
}

function safeWrite(value: TelemetryConsent | null): void {
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

/** Synchronous read for early bootstrap (main.tsx). */
export function getConsent(): TelemetryConsent | null {
  return safeRead();
}

/** True only when the user has explicitly granted consent. */
export function hasConsent(): boolean {
  return safeRead() === "granted";
}

/** Persist a new consent value and notify listeners. */
export function setConsent(value: TelemetryConsent | null): void {
  safeWrite(value);
  for (const cb of listeners) cb(value);
}

/** Subscribe to consent changes. Returns the unsubscribe function. */
export function subscribeConsent(cb: ConsentListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Stable, anonymous, per-device user identifier. Used solely as a
 * Sentry `user.id` so events from the same browser cluster together
 * — there is NO link to a player tag, nickname, club, IP, or email.
 *
 * The ID is generated lazily on first read; uninstalling the app
 * (or clearing storage) gives the user a brand new identity.
 */
const KEY = "brawl_anon_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without `crypto.randomUUID` (pre-2021
  // Safari etc.). Quality is good enough for clustering — we're not
  // using this as a security primitive.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateAnonId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = uuid();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // No localStorage available — fall back to a per-page id; it
    // won't persist, but events still cluster within a session.
    return uuid();
  }
}

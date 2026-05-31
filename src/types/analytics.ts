/**
 * Type-safe analytics event taxonomy.
 *
 * The `AnalyticsEvent` discriminated union is the single source of truth
 * for everything we send to a backend. Two upsides:
 *   1. The compiler catches typos in event names and missing properties.
 *   2. Every entry doubles as documentation — if it's not in this file,
 *      we don't track it.
 *
 * Add a new event by extending the union below, then update
 * `ANALYTICS.md` so reviewers can see the change next to the code.
 *
 * Privacy contract: properties MUST NOT contain player tags, nicknames,
 * club names, AI prompts, IP, or any other identifier. The facade
 * scrubs the obvious cases (Brawl Stars hash tags) defensively, but the
 * event author is responsible for not putting PII in the payload in the
 * first place.
 */
export interface AnalyticsAdapter {
  /** Load the underlying SDK / inject the tracking script. */
  init(): void | Promise<void>;
  /** Emit a virtual page view (we are a SPA, no real navigations). */
  trackPageView(path: string, properties?: Record<string, unknown>): void;
  /** Emit a custom event. */
  trackEvent(name: string, properties?: Record<string, unknown>): void;
  /** Associate the current visitor with an anonymous, locally-generated id. */
  identify(anonymousId: string, traits?: Record<string, unknown>): void;
  /** Forget the current identity (e.g. user opts out). */
  reset(): void;
  /** Toggle the kill-switch. While `true` no events leave the device. */
  setOptOut(optOut: boolean): void;
}

// ─── Properties payload shapes ───────────────────────────────────────
//
// Each event is keyed by `name`. Properties are a closed shape so the
// editor autocompletes and the linter blocks malformed `track()` calls.
//
// Keep property names in `snake_case` to match the dashboards (Plausible,
// Umami, PostHog) that surface them as-is. Numeric counts go in plain
// numbers; durations in milliseconds with a `_ms` suffix.

export type AnalyticsEvent =
  // ─── Discovery / search ─────────────────────────────────────────
  | { name: "search_player"; properties: { has_result: boolean; is_demo: boolean; from_history: boolean } }
  | { name: "view_battle_log"; properties: { battles_count: number } }
  | { name: "filter_battles"; properties: { mode?: string; result?: string } }
  | { name: "view_battle_detail"; properties: { mode: string; result: string } }
  // ─── Pinned profiles / "my player" ─────────────────────────────
  | { name: "pin_player"; properties: { has_group: boolean } }
  | { name: "unpin_player"; properties: Record<string, never> }
  | { name: "set_my_player"; properties: { from: "search" | "history" | "settings" } }
  // ─── Encyclopedia ───────────────────────────────────────────────
  | { name: "open_brawler_detail"; properties: { rarity?: string; class?: string } }
  | { name: "open_map_detail"; properties: { mode?: string } }
  | { name: "open_game_mode_detail"; properties: { mode: string } }
  // ─── AI Coach ───────────────────────────────────────────────────
  | { name: "ai_coach_request"; properties: { preset?: string; streaming: boolean } }
  | { name: "ai_coach_complete"; properties: { duration_ms: number; chars: number } }
  | { name: "ai_coach_cancel"; properties: { duration_ms: number } }
  | { name: "ai_advice_save"; properties: Record<string, never> }
  // ─── Comparison / leaderboards ──────────────────────────────────
  | { name: "compare_players"; properties: { count: number } }
  | { name: "view_leaderboard"; properties: { type: string; country: string } }
  | { name: "view_club"; properties: { source: "profile" | "leaderboard" } }
  // ─── Goals / streak / achievements ──────────────────────────────
  | { name: "set_goal"; properties: { type: string; days?: number } }
  | { name: "complete_goal"; properties: { type: string } }
  | { name: "unlock_achievement"; properties: { id: string } }
  | { name: "checkin"; properties: { streak: number } }
  // ─── Sharing ────────────────────────────────────────────────────
  | { name: "share"; properties: { type: "qr" | "url" | "image" | "native"; target: string } }
  // ─── Settings & preferences ────────────────────────────────────
  | { name: "theme_change"; properties: { theme: string } }
  | { name: "locale_change"; properties: { locale: string } }
  | { name: "haptic_toggle"; properties: { enabled: boolean } }
  | { name: "notification_subscribe"; properties: { type: string } }
  // ─── Backup ─────────────────────────────────────────────────────
  | { name: "backup_export"; properties: { encrypted: boolean; size_bytes: number } }
  | { name: "backup_import"; properties: { strategy: string; categories_count: number } }
  // ─── PWA lifecycle ──────────────────────────────────────────────
  | { name: "pwa_install"; properties: { platform: string } }
  | { name: "pwa_install_dismissed"; properties: Record<string, never> }
  | { name: "pwa_update_accepted"; properties: Record<string, never> }
  // ─── Onboarding ─────────────────────────────────────────────────
  | { name: "onboarding_step"; properties: { step: number; total: number } }
  | { name: "onboarding_complete"; properties: { skipped: boolean; duration_ms: number } }
  | { name: "onboarding_skip"; properties: { at_step: number } }
  // ─── Errors recovered ───────────────────────────────────────────
  | { name: "error_recovered"; properties: { context: string } };

/** Convenience: extract the union of every valid event name. */
export type AnalyticsEventName = AnalyticsEvent["name"];

/**
 * Backend identifiers consumed by the facade.
 *
 * - `noop` — default; no script loaded, no events sent
 * - `plausible` — privacy-first, cookieless
 * - `umami` — open source, cookieless
 * - `posthog` — feature-rich; we use the HTTP capture endpoint, not the
 *   `posthog-js` SDK, to avoid shipping ~30 KB of vendor JS
 */
export type AnalyticsBackend = "noop" | "plausible" | "umami" | "posthog";

export interface AnalyticsAdapterFactoryOptions {
  /** Application version, surfaced as a per-event property. */
  release?: string;
  /** Build environment ("production" / "development"). */
  environment?: string;
}

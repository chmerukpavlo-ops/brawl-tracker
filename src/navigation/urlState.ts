import { TABS_ORDER, type TabId } from "./types";

export interface UrlState {
  tab?: TabId;
  /** Player tag without leading `#`, uppercase. */
  tag?: string;
  /** Brawler id (numeric). */
  brawler?: number;
  /** Achievement id (string key). */
  achievement?: string;
  /** Second player tag for compare flow (normalized, no `#`). */
  compare?: string;
  /** Club tag for ClubSheet (normalized, no `#`). */
  club?: string;
  /** Coach state: preset id (e.g. `upgrade_priority`) or `"open"` for generic. */
  coach?: string;
  /** Saved advice id for `AdviceDetailSheet` deep link. */
  advice?: string;
  /** Leaderboard country (`global` or 2-letter ISO code, uppercase). */
  leaderboard?: string;
  /** Leaderboard kind: "players" or "clubs". Defaults to "players" when absent. */
  leaderboard_type?: "players" | "clubs";
  /** Initial leaderboard search query (1..40 chars). */
  leaderboard_search?: string;
  /** Pre-opened settings section anchor (e.g. `notifications`). */
  settings_section?: "notifications";
  /** Forced UI language override (`uk` / `en`). */
  lang?: "uk" | "en";
  /** Tag of a pinned player to open the edit sheet for (uppercase, no #). */
  pin_edit?: string;
  /** UTM source for analytics (preserved between navigations). */
  utm?: string;
}

const TAG_RE = /^[A-Z0-9]{3,15}$/;
const ACHIEVEMENT_RE = /^[a-z0-9_]{2,50}$/;
const COACH_RE = /^[a-z0-9_]{2,40}$/;
const ADVICE_RE = /^[a-zA-Z0-9_-]{6,64}$/;
const LEADERBOARD_RE = /^(global|[A-Z]{2})$/;
const URLCHANGE_EVENT = "brawl:urlchange";

function isTabId(value: string | null): value is TabId {
  return !!value && (TABS_ORDER as readonly string[]).includes(value);
}

export function normalizeTag(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const norm = raw.trim().replace(/^#+/, "").toUpperCase();
  return TAG_RE.test(norm) ? norm : undefined;
}

export function parseUrl(search?: string): UrlState {
  if (typeof window === "undefined" && search === undefined) return {};
  const query =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(query);
  const out: UrlState = {};

  const tab = params.get("tab");
  if (isTabId(tab)) out.tab = tab;

  const tag = normalizeTag(params.get("tag"));
  if (tag) {
    out.tag = tag;
  } else {
    // Web Share Target: when invited via OS share sheet, the inviting app
    // typically sends a player invite link in `text` or `url`. Extract a tag.
    const sharedText = params.get("text") ?? params.get("url");
    if (sharedText) {
      const match = sharedText.match(/[#?](?:tag=)?#?([A-Z0-9]{3,15})/i);
      const extracted = match ? normalizeTag(match[1]) : undefined;
      if (extracted) out.tag = extracted;
    }
  }

  const brawler = params.get("brawler");
  if (brawler) {
    const n = Number(brawler);
    if (Number.isFinite(n) && n > 0 && n < 1e12) out.brawler = Math.floor(n);
  }

  const achievement = params.get("achievement");
  if (achievement && ACHIEVEMENT_RE.test(achievement)) {
    out.achievement = achievement;
  }

  const compare = normalizeTag(params.get("compare"));
  if (compare) out.compare = compare;

  const club = normalizeTag(params.get("club"));
  if (club) out.club = club;

  const coach = params.get("coach");
  if (coach && COACH_RE.test(coach)) out.coach = coach;

  const advice = params.get("advice");
  if (advice && ADVICE_RE.test(advice)) out.advice = advice;

  const leaderboard = params.get("leaderboard");
  if (leaderboard) {
    const upper = leaderboard.toUpperCase();
    const normalized = upper === "GLOBAL" ? "global" : upper;
    if (LEADERBOARD_RE.test(normalized)) out.leaderboard = normalized;
  }

  const leaderboardType = params.get("leaderboard_type");
  if (leaderboardType === "players" || leaderboardType === "clubs") {
    out.leaderboard_type = leaderboardType;
  }

  const leaderboardSearch = params.get("leaderboard_search");
  if (leaderboardSearch) {
    const q = leaderboardSearch.slice(0, 40).trim();
    if (q.length >= 1) out.leaderboard_search = q;
  }

  const lang = params.get("lang");
  if (lang === "uk" || lang === "en") {
    out.lang = lang;
  }

  const settingsNotifications = params.get("settings_notifications");
  if (settingsNotifications === "open") {
    out.settings_section = "notifications";
  }

  const pinEdit = normalizeTag(params.get("pin_edit"));
  if (pinEdit) out.pin_edit = pinEdit;

  const utm = params.get("utm_source");
  if (utm) out.utm = utm.slice(0, 40);

  return out;
}

function toParams(state: UrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tab) params.set("tab", state.tab);
  if (state.tag) params.set("tag", state.tag);
  if (state.brawler !== undefined) params.set("brawler", String(state.brawler));
  if (state.achievement) params.set("achievement", state.achievement);
  if (state.compare) params.set("compare", state.compare);
  if (state.club) params.set("club", state.club);
  if (state.coach) params.set("coach", state.coach);
  if (state.advice) params.set("advice", state.advice);
  if (state.leaderboard) params.set("leaderboard", state.leaderboard);
  if (state.leaderboard_type) params.set("leaderboard_type", state.leaderboard_type);
  if (state.leaderboard_search) params.set("leaderboard_search", state.leaderboard_search);
  if (state.lang) params.set("lang", state.lang);
  if (state.settings_section === "notifications") {
    params.set("settings_notifications", "open");
  }
  if (state.pin_edit) params.set("pin_edit", state.pin_edit);
  if (state.utm) params.set("utm_source", state.utm);
  return params;
}

function getPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

function getOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin || "";
}

export function buildUrl(state: UrlState, baseUrl?: string): string {
  const params = toParams(state);
  const qs = params.toString();
  const base = baseUrl ?? getPathname();
  return qs ? `${base}?${qs}` : base;
}

export function getShareableUrl(state: UrlState): string {
  const path = getPathname();
  const url = buildUrl(state, path);
  return `${getOrigin()}${url}`;
}

export function getCurrentShareableUrl(extra: UrlState = {}): string {
  return getShareableUrl({ ...parseUrl(), ...extra });
}

export interface UpdateUrlOptions {
  /** Use history.replaceState instead of pushState. */
  replace?: boolean;
  /** Replace the whole state instead of merging with current. */
  clear?: boolean;
}

export function updateUrl(
  patch: UrlState,
  options: UpdateUrlOptions = {}
): void {
  if (typeof window === "undefined") return;
  const current = options.clear ? {} : parseUrl();
  const next: UrlState = { ...current };
  (Object.keys(patch) as (keyof UrlState)[]).forEach((k) => {
    const v = patch[k];
    if (v === undefined || v === null) {
      delete next[k];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next as any)[k] = v;
    }
  });

  const newRelative = buildUrl(next, getPathname());
  const target = `${getOrigin()}${newRelative}`;
  if (target === window.location.href) return;

  try {
    if (options.replace) {
      window.history.replaceState(window.history.state, "", newRelative);
    } else {
      window.history.pushState(window.history.state, "", newRelative);
    }
    window.dispatchEvent(new CustomEvent(URLCHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function clearTransientUrlParams(): void {
  updateUrl({ brawler: undefined, achievement: undefined, coach: undefined }, {
    replace: true,
  });
}

export function subscribeUrlChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  window.addEventListener(URLCHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(URLCHANGE_EVENT, callback);
  };
}

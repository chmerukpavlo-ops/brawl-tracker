import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  type AchievementCategory,
  type AchievementDef,
  type AchievementEventPayloadMap,
  type AchievementEventType,
} from "../data/achievements";
import type {
  AchievementsAux,
  AchievementsState,
  UnlockedAchievement,
} from "../types";

const STORAGE_KEY = "brawl_achievements";
const NOTIFICATIONS_PREF_KEY = "brawl_achievements_notifications";
const DIAMOND_PREF_KEY = "brawl_achievements_diamond_celebration";
const MAX_UNLOCKED_KEPT = 200;

const DEFAULT_AUX: AchievementsAux = {
  demoTagsSeen: [],
  usedAiPresets: [],
  leaderboardCountries: [],
};

const DEFAULT_STATE: AchievementsState = {
  unlocked: [],
  progress: {},
  stats: { totalUnlocked: 0, totalXpFromAchievements: 0 },
  aux: { ...DEFAULT_AUX },
};

function readState(): AchievementsState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };
    const unlocked: UnlockedAchievement[] = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter(
          (u: unknown): u is UnlockedAchievement =>
            !!u &&
            typeof u === "object" &&
            typeof (u as UnlockedAchievement).id === "string" &&
            typeof (u as UnlockedAchievement).unlockedAt === "number"
        )
      : [];
    const progress: AchievementsState["progress"] =
      parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {};
    const aux: AchievementsAux = {
      demoTagsSeen: Array.isArray(parsed.aux?.demoTagsSeen)
        ? parsed.aux.demoTagsSeen.filter((s: unknown): s is string => typeof s === "string")
        : [],
      usedAiPresets: Array.isArray(parsed.aux?.usedAiPresets)
        ? parsed.aux.usedAiPresets.filter((s: unknown): s is string => typeof s === "string")
        : [],
      leaderboardCountries: Array.isArray(parsed.aux?.leaderboardCountries)
        ? parsed.aux.leaderboardCountries.filter(
            (s: unknown): s is string => typeof s === "string"
          )
        : [],
    };
    const stats = {
      totalUnlocked: Number(parsed.stats?.totalUnlocked ?? unlocked.length),
      totalXpFromAchievements: Number(parsed.stats?.totalXpFromAchievements ?? 0),
    };
    return { unlocked, progress, stats, aux };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(state: AchievementsState): void {
  if (typeof localStorage === "undefined") return;
  try {
    const trimmed: AchievementsState =
      state.unlocked.length > MAX_UNLOCKED_KEPT
        ? { ...state, unlocked: state.unlocked.slice(-MAX_UNLOCKED_KEPT) }
        : state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

let state: AchievementsState = readState();
const listeners = new Set<() => void>();

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notify(): void {
  listeners.forEach((l) => l());
}

function setStateAch(next: AchievementsState): void {
  state = next;
  writeState(state);
  notify();
}

function isUnlockedId(id: string): boolean {
  return state.unlocked.some((u) => u.id === id);
}

interface UpdatePlan {
  achievementId: string;
  /**
   * "set" → progress = computed value (idempotent).
   * "inc" → progress = current + 1 (cap at target).
   * "max" → progress = max(current, value).
   */
  mode: "set" | "inc" | "max";
  value?: number;
}

function eventToPlans<T extends AchievementEventType>(
  type: T,
  payload: AchievementEventPayloadMap[T],
  nextAux: AchievementsAux
): UpdatePlan[] {
  switch (type) {
    case "search_success": {
      const p = payload as AchievementEventPayloadMap["search_success"] | undefined;
      const plans: UpdatePlan[] = [
        { achievementId: "first_search", mode: "inc" },
        { achievementId: "search_10", mode: "inc" },
        { achievementId: "search_50", mode: "inc" },
        { achievementId: "search_200", mode: "inc" },
      ];
      const trophies = p?.trophies ?? 0;
      if (trophies >= 60_000) plans.push({ achievementId: "found_60k", mode: "set", value: 1 });
      if (trophies >= 80_000) plans.push({ achievementId: "found_80k", mode: "set", value: 1 });
      if (trophies >= 100_000) plans.push({ achievementId: "found_100k", mode: "set", value: 1 });
      if (p?.isDemo) {
        plans.push({ achievementId: "search_demo_all", mode: "set", value: 1 });
        if (p.tag) {
          const norm = p.tag.replace(/^#+/, "").toUpperCase();
          if (!nextAux.demoTagsSeen.includes(norm)) {
            nextAux.demoTagsSeen.push(norm);
          }
        }
      }
      return plans;
    }
    case "ai_advice":
      return [
        { achievementId: "first_ai_advice", mode: "inc" },
        { achievementId: "ai_advice_10", mode: "inc" },
      ];
    case "ai_preset_used": {
      const p = payload as AchievementEventPayloadMap["ai_preset_used"];
      if (!p?.presetId) return [];
      if (!nextAux.usedAiPresets.includes(p.presetId)) {
        nextAux.usedAiPresets.push(p.presetId);
      }
      const count = nextAux.usedAiPresets.length;
      return [
        { achievementId: "ai_explorer", mode: "max", value: count },
        { achievementId: "ai_scholar", mode: "max", value: count },
      ];
    }
    case "advice_saved": {
      const p = payload as AchievementEventPayloadMap["advice_saved"];
      return [
        { achievementId: "advice_first", mode: "set", value: 1 },
        { achievementId: "advice_collector", mode: "max", value: p.totalAfter },
      ];
    }
    case "advice_pinned":
      return [{ achievementId: "advice_pinned", mode: "set", value: 1 }];
    case "voice_play":
      return [{ achievementId: "voice_listener", mode: "set", value: 1 }];
    case "voice_long_session": {
      const p = payload as AchievementEventPayloadMap["voice_long_session"];
      if ((p?.durationSec ?? 0) < 60) return [];
      return [{ achievementId: "voice_attentive", mode: "set", value: 1 }];
    }
    case "leaderboard_view":
      return [{ achievementId: "leaderboard_explorer", mode: "set", value: 1 }];
    case "leaderboard_country_change": {
      const p = payload as AchievementEventPayloadMap["leaderboard_country_change"];
      if (!p?.country) return [];
      if (!nextAux.leaderboardCountries.includes(p.country)) {
        nextAux.leaderboardCountries.push(p.country);
      }
      return [
        {
          achievementId: "leaderboard_globalist",
          mode: "max",
          value: nextAux.leaderboardCountries.length,
        },
      ];
    }
    case "leaderboard_self_found":
      return [{ achievementId: "leaderboard_elite", mode: "set", value: 1 }];
    case "club_leaderboard_view":
      return [
        { achievementId: "club_leaderboard_explorer", mode: "set", value: 1 },
      ];
    case "my_club_found":
      return [{ achievementId: "my_club_top_member", mode: "set", value: 1 }];
    case "leaderboard_search":
      return [{ achievementId: "searcher_curious", mode: "inc", value: 1 }];
    case "leaderboard_api_search": {
      const p = payload as AchievementEventPayloadMap["leaderboard_api_search"];
      if (!p?.found) return [];
      return [{ achievementId: "searcher_deep", mode: "inc", value: 1 }];
    }
    case "copy_tag":
      return [{ achievementId: "copy_tag", mode: "set", value: 1 }];
    case "share":
      return [{ achievementId: "share_first", mode: "set", value: 1 }];
    case "compare":
      return [
        { achievementId: "compare_first", mode: "set", value: 1 },
        { achievementId: "compare_pro", mode: "inc" },
      ];
    case "club_view": {
      const p = payload as AchievementEventPayloadMap["club_view"];
      const plans = [
        { achievementId: "club_explorer", mode: "set" as const, value: 1 },
      ];
      if ((p?.memberCount ?? 0) >= 25) {
        plans.push({ achievementId: "club_big", mode: "set" as const, value: 1 });
      }
      return plans;
    }
    case "club_member_open":
      return [{ achievementId: "club_family", mode: "set", value: 1 }];
    case "settings_visit":
      return [{ achievementId: "settings_explorer", mode: "inc" }];
    case "favorite_added": {
      const p = payload as AchievementEventPayloadMap["favorite_added"];
      return [
        { achievementId: "favorites_5", mode: "max", value: p.totalAfter },
        { achievementId: "favorites_max", mode: "max", value: p.totalAfter },
      ];
    }
    case "pin_collector_5": {
      const p = payload as AchievementEventPayloadMap["pin_collector_5"];
      return [
        { achievementId: "ach_collector", mode: "max", value: p.totalAfter },
      ];
    }
    case "pin_group_created":
      return [{ achievementId: "ach_curator", mode: "set", value: 1 }];
    case "pin_note_added":
      return [{ achievementId: "ach_archivist", mode: "set", value: 1 }];
    case "pin_view": {
      const p = payload as AchievementEventPayloadMap["pin_view"];
      return [{ achievementId: "ach_super_fan", mode: "max", value: p.totalAfter }];
    }
    case "notifications_enabled":
      return [{ achievementId: "ach_connected", mode: "set", value: 1 }];
    case "notifications_test":
      return [{ achievementId: "ach_tester", mode: "set", value: 1 }];
    case "pwa_installed":
      return [{ achievementId: "ach_real_fan", mode: "set", value: 1 }];
    case "pwa_offline_used":
      return [{ achievementId: "ach_always_connected", mode: "set", value: 1 }];
    case "my_player_set":
      return [{ achievementId: "my_player_set", mode: "set", value: 1 }];
    case "streak_check": {
      const p = payload as AchievementEventPayloadMap["streak_check"];
      return [
        { achievementId: "streak_3", mode: "max", value: p.streak },
        { achievementId: "streak_7", mode: "max", value: p.streak },
        { achievementId: "streak_30", mode: "max", value: p.streak },
        { achievementId: "streak_100", mode: "max", value: p.streak },
      ];
    }
    case "trophy_record":
      return [
        { achievementId: "record_first", mode: "inc" },
        { achievementId: "record_5", mode: "inc" },
      ];
    case "haptic_toggle": {
      const p = payload as AchievementEventPayloadMap["haptic_toggle"];
      if (!p.enabled) return [{ achievementId: "haptic_off", mode: "set", value: 1 }];
      return [];
    }
    case "long_press":
      return [{ achievementId: "long_press_first", mode: "set", value: 1 }];
    case "swipe_tab":
      return [{ achievementId: "swipe_master", mode: "inc" }];
    case "app_open": {
      const p = payload as AchievementEventPayloadMap["app_open"];
      const plans: UpdatePlan[] = [];
      if (p.hour >= 0 && p.hour < 4) plans.push({ achievementId: "night_owl", mode: "set", value: 1 });
      if (p.hour >= 5 && p.hour < 7) plans.push({ achievementId: "early_bird", mode: "set", value: 1 });
      return plans;
    }
    default:
      return [];
  }
}

function trackEvent<T extends AchievementEventType>(
  type: T,
  payload?: AchievementEventPayloadMap[T]
): UnlockedAchievement[] {
  const now = Date.now();
  const nextAux: AchievementsAux = {
    demoTagsSeen: [...state.aux.demoTagsSeen],
    usedAiPresets: [...state.aux.usedAiPresets],
    leaderboardCountries: [...state.aux.leaderboardCountries],
  };
  const plans = eventToPlans(type, payload as AchievementEventPayloadMap[T], nextAux);
  const auxChanged =
    nextAux.demoTagsSeen.length !== state.aux.demoTagsSeen.length ||
    nextAux.usedAiPresets.length !== state.aux.usedAiPresets.length ||
    nextAux.leaderboardCountries.length !== state.aux.leaderboardCountries.length;
  if (plans.length === 0 && !auxChanged) {
    return [];
  }

  const nextProgress: AchievementsState["progress"] = { ...state.progress };
  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const plan of plans) {
    const def = ACHIEVEMENTS_BY_ID[plan.achievementId];
    if (!def) continue;
    if (isUnlockedId(plan.achievementId)) continue;

    const currentEntry = nextProgress[plan.achievementId];
    const current = currentEntry?.current ?? 0;
    let nextValue = current;
    if (plan.mode === "inc") nextValue = current + 1;
    else if (plan.mode === "set") nextValue = plan.value ?? 0;
    else if (plan.mode === "max") nextValue = Math.max(current, plan.value ?? 0);
    nextValue = Math.min(nextValue, def.target);

    if (nextValue !== current) {
      nextProgress[plan.achievementId] = {
        id: plan.achievementId,
        current: nextValue,
        updatedAt: now,
      };
    }

    if (nextValue >= def.target) {
      newlyUnlocked.push({
        id: plan.achievementId,
        unlockedAt: now,
        progress: nextValue,
        seen: false,
      });
    }
  }

  const nextUnlocked = [...state.unlocked, ...newlyUnlocked];
  const totalXp =
    state.stats.totalXpFromAchievements +
    newlyUnlocked.reduce(
      (sum, u) => sum + (ACHIEVEMENTS_BY_ID[u.id]?.xpReward ?? 0),
      0
    );

  setStateAch({
    unlocked: nextUnlocked,
    progress: nextProgress,
    stats: {
      totalUnlocked: nextUnlocked.length,
      totalXpFromAchievements: totalXp,
    },
    aux: nextAux,
  });

  return newlyUnlocked;
}

function markSeen(id: string): void {
  if (!state.unlocked.some((u) => u.id === id && !u.seen)) return;
  const nextUnlocked = state.unlocked.map((u) =>
    u.id === id ? { ...u, seen: true } : u
  );
  setStateAch({ ...state, unlocked: nextUnlocked });
}

function resetAll(): void {
  setStateAch({ ...DEFAULT_STATE, aux: { ...DEFAULT_AUX } });
}

// Module-level trackEvent for non-React call sites (e.g. context).
export function trackAchievementEvent<T extends AchievementEventType>(
  type: T,
  payload?: AchievementEventPayloadMap[T]
): UnlockedAchievement[] {
  return trackEvent(type, payload);
}

// ── Prefs (notifications + diamond celebration) ──────────────
function readBoolPref(key: string, def: boolean): boolean {
  if (typeof localStorage === "undefined") return def;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return def;
    return raw === "true";
  } catch {
    return def;
  }
}

function makeBoolStore(key: string, def: boolean) {
  let value = readBoolPref(key, def);
  const subs = new Set<() => void>();
  return {
    subscribe(l: () => void): () => void {
      subs.add(l);
      return () => subs.delete(l);
    },
    get(): boolean {
      return value;
    },
    set(next: boolean): void {
      if (value === next) return;
      value = next;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* ignore */
      }
      subs.forEach((l) => l());
    },
  };
}

const notifyStore = makeBoolStore(NOTIFICATIONS_PREF_KEY, true);
const diamondStore = makeBoolStore(DIAMOND_PREF_KEY, true);

export function useAchievementNotifications(): [boolean, (next: boolean) => void] {
  const v = useSyncExternalStore(notifyStore.subscribe, notifyStore.get, notifyStore.get);
  return [v, notifyStore.set];
}

export function useDiamondCelebration(): [boolean, (next: boolean) => void] {
  const v = useSyncExternalStore(diamondStore.subscribe, diamondStore.get, diamondStore.get);
  return [v, diamondStore.set];
}

export function getAchievementNotifications(): boolean {
  return notifyStore.get();
}

export function getDiamondCelebration(): boolean {
  return diamondStore.get();
}

// ── Hook ─────────────────────────────────────────────────────
export interface AchievementProgressInfo {
  current: number;
  target: number;
  percentage: number;
}

export interface UseAchievementsApi {
  state: AchievementsState;
  allAchievements: AchievementDef[];
  unlockedAchievements: AchievementDef[];
  lockedAchievements: AchievementDef[];
  isUnlocked: (id: string) => boolean;
  getProgress: (id: string) => AchievementProgressInfo;
  trackEvent: <T extends AchievementEventType>(
    type: T,
    payload?: AchievementEventPayloadMap[T]
  ) => UnlockedAchievement[];
  markSeen: (id: string) => void;
  resetAll: () => void;
  unseenUnlocks: UnlockedAchievement[];
  getByCategory: (category: AchievementCategory) => AchievementDef[];
}

export function useAchievements(): UseAchievementsApi {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);

  const unlockedSet = useMemo(
    () => new Set(snapshot.unlocked.map((u) => u.id)),
    [snapshot.unlocked]
  );

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)),
    [unlockedSet]
  );

  const lockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id)),
    [unlockedSet]
  );

  const isUnlocked = useCallback(
    (id: string) => unlockedSet.has(id),
    [unlockedSet]
  );

  const getProgress = useCallback(
    (id: string): AchievementProgressInfo => {
      const def = ACHIEVEMENTS_BY_ID[id];
      const target = def?.target ?? 1;
      const current = snapshot.progress[id]?.current ?? (unlockedSet.has(id) ? target : 0);
      return {
        current: Math.min(current, target),
        target,
        percentage:
          target === 0
            ? 0
            : Math.min(100, Math.round((Math.min(current, target) / target) * 100)),
      };
    },
    [snapshot.progress, unlockedSet]
  );

  const track = useCallback(
    <T extends AchievementEventType>(
      type: T,
      payload?: AchievementEventPayloadMap[T]
    ) => trackEvent(type, payload),
    []
  );

  const markSeenCb = useCallback((id: string) => markSeen(id), []);
  const resetAllCb = useCallback(() => resetAll(), []);

  const unseenUnlocks = useMemo(
    () => snapshot.unlocked.filter((u) => !u.seen),
    [snapshot.unlocked]
  );

  const getByCategory = useCallback(
    (category: AchievementCategory) =>
      ACHIEVEMENTS.filter((a) => a.category === category),
    []
  );

  return useMemo(
    () => ({
      state: snapshot,
      allAchievements: ACHIEVEMENTS,
      unlockedAchievements,
      lockedAchievements,
      isUnlocked,
      getProgress,
      trackEvent: track,
      markSeen: markSeenCb,
      resetAll: resetAllCb,
      unseenUnlocks,
      getByCategory,
    }),
    [
      snapshot,
      unlockedAchievements,
      lockedAchievements,
      isUnlocked,
      getProgress,
      track,
      markSeenCb,
      resetAllCb,
      unseenUnlocks,
      getByCategory,
    ]
  );
}

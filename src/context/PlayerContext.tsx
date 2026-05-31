import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PlayerStats,
  DEMO_PLAYERS,
  type BrawlerInfo,
  type FavoritePlayer,
  type MyPlayerSettings,
} from "../types";
import {
  type AiPromptPreset,
  getPresetById,
} from "../data/aiPrompts";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useMyPlayer } from "../hooks/useMyPlayer";
import { usePinnedPlayers } from "../hooks/usePinnedPlayers";
import { useCompare } from "../hooks/useCompare";
import { useClub } from "../hooks/useClub";
import { useNotifications } from "../hooks/useNotifications";
import { useSearchPlayerMutation } from "../hooks/mutations/useSearchPlayerMutation";
import { useHealthQuery } from "../hooks/queries/useHealthQuery";
import { ApiError, queryClient } from "../lib/queryClient";
import { queryKeys } from "../lib/queryKeys";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "./ToastContext";
import {
  ActionLog,
  HandleQueryOptions,
  TabId,
  UpdateButtonState,
} from "../navigation/types";
import {
  clearPlayerCache,
  isStale,
  loadPlayerCache,
  savePlayerCache,
} from "../utils/playerCache";
import { addSnapshot, buildSnapshot } from "../utils/trophyHistory";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { favoriteRecordPreset } from "../utils/notificationPresets";
import {
  getLastNotifiedRecord,
  setLastNotifiedRecord,
} from "../utils/recordTracker";
import { parseUrl, updateUrl } from "../navigation/urlState";
import { streamSse } from "../utils/sseClient";
import { addSavedAdvice, getAutoSaveEnabled } from "../hooks/useAiHistory";
import { track } from "../lib/analytics";

const PREV_TROPHIES_KEY = "previous_trophies";
const CACHE_FRESH_MS = 60_000;

const AI_LOADING_PHRASES = [
  "Аналізуємо твої перемоги 3в3...",
  "Радимося з Шелі щодо тактики...",
  "Рахуємо шанси виживання у соло-шд...",
  "Прораховуємо комбінації Гіперзарядів...",
  "AI-Тренер розкладає колоду тактик...",
];

interface AddFavoriteResult {
  added: boolean;
  limitReached: boolean;
}

export interface FetchAiCoachOptions {
  /** Preset id з `AI_PROMPT_PRESETS`. Якщо немає — generic prompt. */
  presetId?: string | null;
  /** Brawler для пресетів з `requiresBrawler` (наприклад, `brawler_deep_dive`). */
  brawler?: BrawlerInfo | null;
}

interface PlayerContextValue {
  playerData: PlayerStats | null;
  previousTrophies: number;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: number | null;
  updateButtonState: UpdateButtonState;
  isDemoMode: boolean;
  setIsDemoMode: (v: boolean) => void;
  searchHistory: string[];
  clearHistory: () => void;
  removeFromHistory: (tag: string) => void;
  myPlayer: MyPlayerSettings;
  setMyPlayer: (tag: string, customName?: string) => void;
  updateMyPlayerName: (name: string | undefined) => void;
  clearMyPlayer: () => void;
  isMyPlayer: (tag: string) => boolean;
  /** @deprecated використовуй myPlayer.tag */
  savedTag: string | null;
  /** @deprecated використовуй setMyPlayer */
  setSavedTag: (tag: string) => void;
  /** @deprecated використовуй isMyPlayer */
  isMyTag: (tag: string) => boolean;
  favorites: FavoritePlayer[];
  addFavorite: (
    tag: string,
    options?: Partial<
      Pick<
        FavoritePlayer,
        | "customName"
        | "iconEmoji"
        | "lastTrophies"
        | "originalName"
        | "color"
        | "groupId"
        | "note"
        | "tags"
      >
    >
  ) => AddFavoriteResult;
  removeFavorite: (tag: string) => void;
  updateFavorite: (tag: string, patch: Partial<FavoritePlayer>) => void;
  isFavorite: (tag: string) => boolean;
  clearFavorites: () => void;
  /** Pinned/favorite player by tag, or `undefined`. */
  getFavorite: (tag: string) => FavoritePlayer | undefined;
  /** Display name resolution (custom > original > tag). */
  getDisplayName: (tag: string, fallback?: string) => string;
  /** Pinned-related API surface (groups, sections, helpers). */
  pinned: ReturnType<typeof usePinnedPlayers>;
  /** Notifications API (permission, settings, scheduling, presets). */
  notifications: ReturnType<typeof useNotifications>;
  /** Controlled state for the global notifications consent sheet. */
  notificationsConsent: {
    open: boolean;
    trigger: "first_pinned" | "first_goal" | "streak_milestone" | "manual";
  };
  openNotificationsConsent: (
    trigger: "first_pinned" | "first_goal" | "streak_milestone" | "manual"
  ) => void;
  closeNotificationsConsent: () => void;
  isApiConfigured: boolean;
  serverUptime: string;
  activityLogs: ActionLog[];
  totalRequests: number;
  aiAdvice: string | null;
  isAiLoading: boolean;
  aiLoadingMessage: string;
  aiStreamingActive: boolean;
  abortAiCoach: () => void;
  /** Поточний AI-пресет (для UI-бейджу та повторного запуску). */
  activeAiPreset: AiPromptPreset | null;
  /** Brawler, до якого прив'язаний пресет (для `brawler_deep_dive`). */
  activeAiBrawler: BrawlerInfo | null;
  clearAiPreset: () => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  handleQuery: (targetTag: string, options?: HandleQueryOptions) => Promise<boolean>;
  refreshPlayer: () => Promise<void>;
  fetchAiCoach: (options?: FetchAiCoachOptions) => Promise<void>;
  loadDemoPlayer: () => void;
  clearAllCache: () => void;
  /** Compare slot — second player for side-by-side view. */
  comparePlayer: PlayerStats | null;
  isComparing: boolean;
  compareError: string | null;
  compareWith: (tag: string, opts?: { silent?: boolean }) => Promise<boolean>;
  clearCompare: () => void;
  setComparePlayer: (player: PlayerStats | null) => void;
  swapWithCompare: () => Promise<void>;
  /** Club slot — viewable club details. */
  clubInfo: import("../types").ClubInfo | null;
  isClubLoading: boolean;
  clubError: string | null;
  fetchClub: (tag: string, opts?: { silent?: boolean; forceFresh?: boolean }) => Promise<boolean>;
  clearClub: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function formatUptime(totalSecs: number) {
  const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
  const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
  const secs = (totalSecs % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { searchHistory, saveToHistory, clearHistory, removeFromHistory } = useSearchHistory();
  const { showRecord, showError, showInfo } = useToast();
  const pinSuggestRef = useRef<Set<string>>(new Set());
  const {
    myPlayer,
    setMyPlayer: rawSetMyPlayer,
    updateMyPlayerName,
    clearMyPlayer,
    isMyPlayer,
  } = useMyPlayer();
  const pinned = usePinnedPlayers();
  const notifications = useNotifications();
  const [notificationsConsent, setNotificationsConsent] = useState<{
    open: boolean;
    trigger: "first_pinned" | "first_goal" | "streak_milestone" | "manual";
  }>({ open: false, trigger: "manual" });
  const {
    favorites,
    addFavorite: rawAddFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
    clearFavorites,
  } = {
    favorites: pinned.pinned,
    addFavorite: pinned.addPin,
    removeFavorite: pinned.removePin,
    updateFavorite: pinned.updateFavorite,
    isFavorite: pinned.isPinned,
    clearFavorites: pinned.clearFavorites,
  };

  const setMyPlayer = useCallback(
    (tag: string, customName?: string) => {
      rawSetMyPlayer(tag, customName);
      trackAchievementEvent("my_player_set");
    },
    [rawSetMyPlayer]
  );

  const addFavorite = useCallback(
    (
      tag: string,
      options?: Parameters<typeof rawAddFavorite>[1]
    ) => {
      const beforeCount = favorites.length;
      const result = rawAddFavorite(tag, options);
      if (result.added) {
        trackAchievementEvent("favorite_added", {
          totalAfter: beforeCount + 1,
        });
        track({
          name: "pin_player",
          properties: { has_group: !!options?.groupId },
        });
        if (beforeCount + 1 >= 5) {
          trackAchievementEvent("pin_collector_5", {
            totalAfter: beforeCount + 1,
          });
        }
        if (options?.note && options.note.trim().length > 0) {
          trackAchievementEvent("pin_note_added");
        }
        // First pin ever → show notifications consent if eligible.
        if (beforeCount === 0 && notifications.shouldPromptUser()) {
          setNotificationsConsent({ open: true, trigger: "first_pinned" });
        }
      }
      return result;
    },
    [rawAddFavorite, favorites.length, notifications]
  );

  const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
  const [previousTrophies, setPreviousTrophies] = useState(() => {
    const saved = localStorage.getItem(PREV_TROPHIES_KEY);
    return saved ? Number(saved) : 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [updateButtonState, setUpdateButtonState] = useState<UpdateButtonState>("idle");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const {
    comparePlayer,
    isComparing,
    compareError,
    compareWith,
    clearCompare,
    setComparePlayer,
  } = useCompare({ isDemoMode });
  const {
    clubInfo,
    isClubLoading,
    clubError,
    fetchClub,
    clearClub,
  } = useClub({ isDemoMode });
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActionLog[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState("");
  const [aiStreamingActive, setAiStreamingActive] = useState(false);
  const [activeAiPreset, setActiveAiPreset] = useState<AiPromptPreset | null>(null);
  const [activeAiBrawler, setActiveAiBrawler] = useState<BrawlerInfo | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [activeTab, _setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "home";
    return parseUrl().tab ?? "home";
  });
  const setActiveTab = useCallback((tab: TabId) => {
    _setActiveTab((cur) => {
      if (cur === tab) return cur;
      const urlTab = parseUrl().tab ?? "home";
      if (urlTab !== tab) {
        updateUrl({ tab });
      }
      return tab;
    });
  }, []);
  const [initialized, setInitialized] = useState(false);

  // ── Data layer (TanStack Query) ────────────────────────────────
  // Health probe — auto-refreshes every minute, surfaces apiTokenConfigured
  // so we can hide demo mode once the backend has a real token.
  const healthQuery = useHealthQuery();
  const healthReady = !healthQuery.isPending;
  const searchPlayer = useSearchPlayerMutation();

  useEffect(() => {
    if (!healthQuery.data) return;
    setIsApiConfigured(!!healthQuery.data.apiTokenConfigured);
    if (healthQuery.data.apiTokenConfigured) setIsDemoMode(false);
    if (typeof healthQuery.data.uptime === "number") {
      setUptimeSeconds(Math.floor(healthQuery.data.uptime));
    }
  }, [healthQuery.data]);

  const serverUptime = formatUptime(uptimeSeconds);

  useEffect(() => {
    const timer = setInterval(() => setUptimeSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAiLoading) {
      const phrases = (() => {
        try {
          const v = localStorage.getItem("brawl_locale");
          if (v === "en") {
            return [
              "Reviewing your 3v3 wins...",
              "Talking strategy with Shelly...",
              "Crunching the best Hypercharge combos...",
              "Picking the best tips for your profile...",
            ];
          }
        } catch {
          /* ignore */
        }
        return AI_LOADING_PHRASES;
      })();
      setAiLoadingMessage(phrases[0]);
      let idx = 1;
      interval = setInterval(() => {
        setAiLoadingMessage(phrases[idx % phrases.length]);
        idx++;
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isAiLoading]);

  useEffect(() => {
    if (updateButtonState === "success") {
      const t = setTimeout(() => setUpdateButtonState("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [updateButtonState]);

  const handleQuery = useCallback(
    async (
      targetTag: string,
      options?: HandleQueryOptions
    ): Promise<boolean> => {
      const cleanTag = targetTag.toUpperCase().trim().replace("#", "");
      if (!cleanTag) return false;
      const formattedTag = `#${cleanTag}`;

      const cached = options?.forceFresh ? null : loadPlayerCache(cleanTag);
      const hasFreshUI = !!cached;

      if (cached) {
        setPlayerData(cached.data);
        setPreviousTrophies(cached.data.trophies);
        setLastUpdated(cached.timestamp);
        saveToHistory(formattedTag);
        if (options?.navigateHome !== false) setActiveTab("home");
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setUpdateButtonState("loading");
      setAiAdvice(null);
      setTotalRequests((p) => p + 1);

      const useDemo = options?.bypassDemo ? false : isDemoMode;
      const timestamp = new Date().toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      try {
        const data = await searchPlayer.mutateAsync({
          tag: cleanTag,
          demo: useDemo,
        });

        const now = Date.now();

        // ── "New personal record" toast (own profile only) ─────────
        // Three-way guard:
        //   1. The fresh response's `highestTrophies` strictly beats
        //      whatever we had cached / in memory.
        //   2. We've never notified about *this exact value* on this
        //      tag (per-tag, per-value dedup via recordTracker — so
        //      manual refreshes / SWR revalidations don't re-fire).
        //   3. It's the user's own profile. Looking up someone else
        //      should never imply *we* hit a record.
        const prevHighOwn =
          cached?.data.highestTrophies ?? playerData?.highestTrophies ?? 0;
        const alreadyNotifiedOwn = getLastNotifiedRecord(cleanTag);
        const isOwnProfile = isMyPlayer(formattedTag);
        const isRealRecord =
          data.highestTrophies > 0 &&
          prevHighOwn > 0 &&
          data.highestTrophies > prevHighOwn &&
          data.highestTrophies > alreadyNotifiedOwn;

        if (isRealRecord && isOwnProfile) {
          showRecord(
            `Новий рекорд: ${data.highestTrophies.toLocaleString("uk-UA")} 🏆`
          );
          setLastNotifiedRecord(cleanTag, data.highestTrophies);
          trackAchievementEvent("trophy_record", {
            newRecord: data.highestTrophies,
          });
        }

        // ── Pinned-player record push notification ─────────────────
        // Same correctness fix: compare `highestTrophies` against the
        // pin's stored `lastHighest`, not its `lastTrophies` (which
        // moves with every match). Dedup is already handled by
        // `notifications.hasNotifiedRecord` keyed on the threshold.
        if (
          isFavorite(formattedTag) &&
          data.highestTrophies > 0 &&
          !isMyPlayer(formattedTag) &&
          !notifications.hasNotifiedRecord(formattedTag, data.highestTrophies)
        ) {
          const prevHighPin =
            pinned.getPin(formattedTag)?.lastHighest ?? 0;
          if (data.highestTrophies > prevHighPin && prevHighPin > 0) {
            notifications.showNotification(
              favoriteRecordPreset(data.name, formattedTag, data.highestTrophies)
            );
            notifications.markRecordNotified(
              formattedTag,
              data.highestTrophies
            );
          }
        }

        // Legacy `previousTrophies` state is kept so any consumer of
        // `usePlayer().previousTrophies` (UI delta indicators) keeps
        // working — only the record-detection logic moved off it.
        setPreviousTrophies(data.trophies);
        localStorage.setItem(PREV_TROPHIES_KEY, String(data.trophies));

        savePlayerCache(cleanTag, data, now);
        addSnapshot(formattedTag, buildSnapshot(data, now));

        if (isFavorite(formattedTag)) {
          updateFavorite(formattedTag, {
            lastTrophies: data.trophies,
            // Track personal-record value so the next refresh has a
            // correct baseline for the pinned-record notification.
            lastHighest: data.highestTrophies,
            lastUpdated: now,
            originalName: data.name,
          });
          const totalAfter = (pinned.getPin(formattedTag)?.viewCount ?? 0) + 1;
          pinned.recordView(formattedTag);
          trackAchievementEvent("pin_view", { tag: formattedTag, totalAfter });
        } else if (
          !isMyPlayer(formattedTag) &&
          !pinSuggestRef.current.has(formattedTag) &&
          options?.navigateHome !== false
        ) {
          pinSuggestRef.current.add(formattedTag);
          const cleanLocalTag = cleanTag;
          const playerLabel = data.name;
          window.setTimeout(() => {
            showInfo(`${playerLabel} · ${formattedTag}`, {
              duration: 6000,
              action: {
                label: "📌",
                onClick: () => {
                  const r = addFavorite(formattedTag, {
                    originalName: data.name,
                    lastTrophies: data.trophies,
                  });
                  if (r.added) {
                    haptic.medium();
                    updateUrl({ pin_edit: cleanLocalTag }, { replace: true });
                  } else if (r.limitReached) {
                    haptic.error();
                  }
                },
              },
            });
          }, 600);
        }

        setPlayerData(data);
        setLastUpdated(now);
        saveToHistory(formattedTag);
        setUpdateButtonState("success");
        haptic.success();
        updateUrl({ tag: cleanTag }, { replace: true });

        trackAchievementEvent("search_success", {
          trophies: data.trophies,
          isDemo: useDemo,
          tag: formattedTag,
        });

        // Product analytics — payload is intentionally tag-less. The
        // dashboard cares about *whether* the search worked, not who
        // was searched. `is_force_fresh` lets us tell deliberate
        // "Refresh" taps from cold opens in funnels.
        track({
          name: "search_player",
          properties: {
            has_result: true,
            is_demo: useDemo,
            from_history: options?.forceFresh === true,
          },
        });

        setActivityLogs((prev) => [
          { time: timestamp, tag: formattedTag, status: "200 OK", ok: true },
          ...prev.slice(0, 7),
        ]);

        if (!hasFreshUI && options?.navigateHome !== false) setActiveTab("home");
        return true;
      } catch (err: unknown) {
        const status = err instanceof ApiError ? err.status : 0;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Не вдалося завантажити статистику.";

        setActivityLogs((prev) => [
          {
            time: timestamp,
            tag: formattedTag,
            status: status ? `${status} ERR` : "NETERR",
            ok: false,
          },
          ...prev.slice(0, 7),
        ]);

        // Track failed searches separately — same event, different
        // `has_result`. This lets us see funnel drop-off on the
        // dashboard.
        track({
          name: "search_player",
          properties: {
            has_result: false,
            is_demo: useDemo,
            from_history: options?.forceFresh === true,
          },
        });

        if (hasFreshUI) {
          showError(`Не вдалося оновити: ${message}`);
        } else {
          showError(message);
        }
        setUpdateButtonState("idle");
        haptic.error();
        return false;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      isDemoMode,
      playerData?.highestTrophies,
      playerData?.trophies,
      saveToHistory,
      isFavorite,
      isMyPlayer,
      updateFavorite,
      addFavorite,
      showRecord,
      showError,
      showInfo,
      pinned,
      notifications,
      searchPlayer,
    ]
  );

  const refreshPlayer = useCallback(async () => {
    if (!playerData?.tag) return;
    await handleQuery(playerData.tag, { navigateHome: false, forceFresh: true });
  }, [playerData?.tag, handleQuery]);

  const loadDemoPlayer = useCallback(() => {
    const demo = DEMO_PLAYERS["BrawlMaster"];
    setPlayerData(demo);
    setLastUpdated(Date.now());
    setActiveTab("home");
  }, []);

  const clearAllCache = useCallback(() => {
    clearPlayerCache();
    // Reset every TanStack-managed cache slice (player/club/leaderboard/…).
    queryClient.removeQueries({ queryKey: queryKeys.all });
    setLastUpdated(null);
  }, []);

  const swapWithCompare = useCallback(async () => {
    if (!comparePlayer || !playerData) return;
    const next = comparePlayer;
    const prev = playerData;
    setComparePlayer(prev);
    setPlayerData(next);
    setPreviousTrophies(next.trophies);
    setLastUpdated(Date.now());
    updateUrl(
      {
        tag: next.tag.replace(/^#/, "").toUpperCase(),
        compare: prev.tag.replace(/^#/, "").toUpperCase(),
      },
      { replace: true }
    );
    haptic.selection();
  }, [comparePlayer, playerData, setComparePlayer]);

  // When the user switches to a different primary player, drop the compare
  // slot — comparing an old player against a fresh profile is rarely the intent.
  const myPlayerTag = myPlayer.tag;
  const lastClearTagRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!myPlayerTag) return;
    if (lastClearTagRef.current === myPlayerTag) return;
    lastClearTagRef.current = myPlayerTag;
    clearCompare();
  }, [myPlayerTag, clearCompare]);

  const abortAiCoach = useCallback(() => {
    const controller = aiAbortRef.current;
    if (controller) {
      controller.abort();
      aiAbortRef.current = null;
    }
  }, []);

  const clearAiPreset = useCallback(() => {
    setActiveAiPreset(null);
    setActiveAiBrawler(null);
    updateUrl({ coach: undefined });
  }, []);

  const fetchAiCoach = useCallback(
    async (options?: FetchAiCoachOptions) => {
      if (!playerData) return;

      const preset = options?.presetId
        ? getPresetById(options.presetId)
        : null;
      const brawler = options?.brawler ?? null;

      if (preset?.requiresBrawler && !brawler) {
        showError("Спочатку обери конкретного бравлера");
        return;
      }

      // Скасуй попередній стрім якщо існує.
      if (aiAbortRef.current) {
        aiAbortRef.current.abort();
        aiAbortRef.current = null;
      }

      const controller = new AbortController();
      aiAbortRef.current = controller;

      setActiveAiPreset(preset);
      setActiveAiBrawler(brawler);
      if (preset) {
        updateUrl({ coach: preset.id });
      } else {
        updateUrl({ coach: undefined });
      }

      setIsAiLoading(true);
      setAiStreamingActive(true);
      setAiAdvice("");
      setTotalRequests((p) => p + 1);
      haptic.light();

      const aiStartedAt = Date.now();
      track({
        name: "ai_coach_request",
        properties: { preset: preset?.id, streaming: true },
      });

      const currentLocale = (() => {
        try {
          const v = localStorage.getItem("brawl_locale");
          return v === "en" ? "en" : "uk";
        } catch {
          return "uk";
        }
      })();

      const body = JSON.stringify({
        playerData,
        presetId: preset?.id,
        brawler: brawler ?? undefined,
        locale: currentLocale,
      });

      // Накопичувач — щоб мати остаточний текст при auto-save.
      let accumulator = "";
      let receivedAny = false;
      let streamFailed = false;
      let streamFailReason: unknown = null;

      try {
        const events = streamSse("/api/gemini/coach/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });

        for await (const event of events) {
          if (controller.signal.aborted) break;
          if (event.type === "chunk") {
            if (event.text) {
              receivedAny = true;
              accumulator += event.text;
              setAiAdvice((prev) => (prev ?? "") + event.text);
            }
          } else if (event.type === "done") {
            break;
          } else if (event.type === "error") {
            throw new Error(event.message || "AI stream error");
          }
        }
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (controller.signal.aborted || name === "AbortError") {
          // Користувач cancel — silent.
          track({
            name: "ai_coach_cancel",
            properties: { duration_ms: Date.now() - aiStartedAt },
          });
        } else {
          streamFailed = true;
          streamFailReason = err;
        }
      }

      // Fallback: якщо стрім зламався і ми не отримали жодного chunk —
      // тихо звертаємось до blocking endpoint, щоб користувач все одно
      // побачив пораду.
      if (streamFailed && !receivedAny && !controller.signal.aborted) {
        try {
          const response = await fetch("/api/gemini/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (!response.ok) throw new Error("AI response not ok");
          const data = await response.json();
          if (!controller.signal.aborted) {
            const adviceText =
              typeof data?.advice === "string"
                ? data.advice
                : "Коуч замислився. Спробуйте ще раз.";
            setAiAdvice(adviceText);
            accumulator = adviceText;
            receivedAny = true;
          }
        } catch {
          if (!controller.signal.aborted) {
            setAiAdvice(null);
            showError("Не вдалося отримати поради AI");
          }
        }
      } else if (streamFailed && receivedAny) {
        // Часткова відповідь є — залишаємо її і повідомляємо про обрив.
        showError("Стрім перервано. Показано часткову відповідь.");
        console.warn("[AI Coach] stream failed mid-flight:", streamFailReason);
      }

      if (receivedAny && !controller.signal.aborted) {
        trackAchievementEvent("ai_advice");
        track({
          name: "ai_coach_complete",
          properties: {
            duration_ms: Date.now() - aiStartedAt,
            chars: accumulator.length,
          },
        });
        if (preset) {
          trackAchievementEvent("ai_preset_used", { presetId: preset.id });
        }
        if (getAutoSaveEnabled() && accumulator.trim().length > 0) {
          addSavedAdvice(
            {
              playerTag: playerData.tag,
              playerName: playerData.name,
              playerTrophies: playerData.trophies,
              advice: accumulator,
              presetId: preset?.id,
              presetTitle: preset?.title,
              presetCategory: preset?.category,
              presetIcon: preset?.icon,
              brawlerId: brawler?.id,
              brawlerName: brawler?.name,
            },
            { autoSave: true }
          );
        }
      }

      aiAbortRef.current = null;
      setIsAiLoading(false);
      setAiStreamingActive(false);
    },
    [playerData, showError]
  );

  // Скасовуємо активний стрім при розмонтуванні.
  useEffect(
    () => () => {
      if (aiAbortRef.current) {
        aiAbortRef.current.abort();
        aiAbortRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!healthReady || initialized) return;
    setInitialized(true);

    const url = parseUrl();
    if (url.tab) _setActiveTab(url.tab);

    if (url.tag) {
      handleQuery(`#${url.tag}`, { navigateHome: false });
      return;
    }

    const tag = myPlayer.tag;
    if (!tag) {
      const demo = DEMO_PLAYERS["BrawlMaster"];
      setPlayerData(demo);
      setLastUpdated(Date.now());
      return;
    }

    const cached = loadPlayerCache(tag);
    if (cached) {
      setPlayerData(cached.data);
      setPreviousTrophies(cached.data.trophies);
      setLastUpdated(cached.timestamp);
      if (isStale(cached.ageMs, CACHE_FRESH_MS)) {
        handleQuery(tag, { navigateHome: false });
      }
    } else {
      handleQuery(tag, { navigateHome: false });
    }
  }, [healthReady, initialized, handleQuery, myPlayer.tag]);

  const savedTag = myPlayer.tag;
  const setSavedTag = useCallback(
    (tag: string) => setMyPlayer(tag),
    [setMyPlayer]
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      playerData,
      previousTrophies,
      isLoading,
      isRefreshing,
      lastUpdated,
      updateButtonState,
      isDemoMode,
      setIsDemoMode,
      searchHistory,
      clearHistory,
      removeFromHistory,
      myPlayer,
      setMyPlayer,
      updateMyPlayerName,
      clearMyPlayer,
      isMyPlayer,
      savedTag,
      setSavedTag,
      isMyTag: isMyPlayer,
      favorites,
      addFavorite,
      removeFavorite,
      updateFavorite,
      isFavorite,
      clearFavorites,
      getFavorite: pinned.getPin,
      getDisplayName: pinned.getDisplayName,
      pinned,
      notifications,
      notificationsConsent,
      openNotificationsConsent: (
        trigger: "first_pinned" | "first_goal" | "streak_milestone" | "manual"
      ) => setNotificationsConsent({ open: true, trigger }),
      closeNotificationsConsent: () =>
        setNotificationsConsent((cur) => ({ ...cur, open: false })),
      isApiConfigured,
      serverUptime,
      activityLogs,
      totalRequests,
      aiAdvice,
      isAiLoading,
      aiLoadingMessage,
      aiStreamingActive,
      abortAiCoach,
      activeAiPreset,
      activeAiBrawler,
      clearAiPreset,
      activeTab,
      setActiveTab,
      handleQuery,
      refreshPlayer,
      fetchAiCoach,
      loadDemoPlayer,
      clearAllCache,
      comparePlayer,
      isComparing,
      compareError,
      compareWith,
      clearCompare,
      setComparePlayer,
      swapWithCompare,
      clubInfo,
      isClubLoading,
      clubError,
      fetchClub,
      clearClub,
    }),
    [
      playerData,
      previousTrophies,
      isLoading,
      isRefreshing,
      lastUpdated,
      updateButtonState,
      isDemoMode,
      searchHistory,
      clearHistory,
      removeFromHistory,
      myPlayer,
      setMyPlayer,
      updateMyPlayerName,
      clearMyPlayer,
      isMyPlayer,
      savedTag,
      setSavedTag,
      favorites,
      addFavorite,
      removeFavorite,
      updateFavorite,
      isFavorite,
      clearFavorites,
      pinned,
      notifications,
      notificationsConsent,
      isApiConfigured,
      serverUptime,
      activityLogs,
      totalRequests,
      aiAdvice,
      isAiLoading,
      aiLoadingMessage,
      aiStreamingActive,
      abortAiCoach,
      activeAiPreset,
      activeAiBrawler,
      clearAiPreset,
      activeTab,
      handleQuery,
      refreshPlayer,
      fetchAiCoach,
      loadDemoPlayer,
      clearAllCache,
      comparePlayer,
      isComparing,
      compareError,
      compareWith,
      clearCompare,
      setComparePlayer,
      swapWithCompare,
      clubInfo,
      isClubLoading,
      clubError,
      fetchClub,
      clearClub,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

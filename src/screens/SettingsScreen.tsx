import { useEffect, useState } from "react";
import {
  ChevronDown,
  Database,
  Globe,
  Headphones,
  History,
  Library,
  Pin,
  Play,
  Sparkles,
  Square,
  Star,
  Volume2,
  Wifi,
  Zap,
  Activity,
  Bell,
  BellOff,
  Terminal,
  Trash2,
  Vibrate,
  VibrateOff,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import PlayerSearch from "../components/PlayerSearch";
import TagBadge from "../components/TagBadge";
import PinnedPlayersList from "../components/PinnedPlayersList";
import NotificationsSettingsSection from "../components/NotificationsSettingsSection";
import { lazy, Suspense } from "react";
import PwaSettingsSection from "../components/PwaSettingsSection";
import { useOnboarding } from "../hooks/useOnboarding";

const BackupSection = lazy(() => import("../components/settings/BackupSection"));
const PrivacySection = lazy(() => import("../components/settings/PrivacySection"));
const AccessibilitySection = lazy(
  () => import("../components/settings/AccessibilitySection")
);
import StreakBadge from "../components/StreakBadge";
import WeekCalendar from "../components/WeekCalendar";
import { haptic, useHapticEnabled } from "../hooks/useHaptic";
import { useDailyCheckin, MILESTONES } from "../hooks/useDailyCheckin";
import {
  useAutoGoalsEnabled,
  useOverlayEnabled,
  useGoals,
} from "../hooks/useGoals";
import {
  trackAchievementEvent,
  useAchievementNotifications,
  useAchievements,
  useDiamondCelebration,
} from "../hooks/useAchievements";
import AchievementsSection from "../components/AchievementsSection";
import { countCachedPlayers } from "../utils/playerCache";
import {
  clearTrophyHistory,
  countTotalSnapshots,
  getAllPlayerTagsWithHistory,
} from "../utils/trophyHistory";
import { formatRelativeTime } from "../utils/formatTime";
import { Flame, LineChart, Link as LinkIcon, Target, Trophy as TrophyIcon } from "lucide-react";
import { getCurrentShareableUrl } from "../navigation/urlState";
import { copyToClipboard } from "../utils/share";
import { useAiHistory, useAdviceAutoSave } from "../hooks/useAiHistory";
import AiHistoryView from "../components/AiHistoryView";
import {
  speakTestPhrase,
  useTextToSpeech,
} from "../hooks/useTextToSpeech";
import LanguageToggle from "../components/LanguageToggle";
import { useI18n } from "../context/I18nContext";
import { useTranslation } from "../hooks/useTranslation";
import { LOCALE_LABELS } from "../i18n";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, systemLocale } = useI18n();
  const {
    handleQuery,
    isLoading,
    isDemoMode,
    setIsDemoMode,
    searchHistory,
    clearHistory,
    isApiConfigured,
    serverUptime,
    activityLogs,
    totalRequests,
    lastUpdated,
    clearAllCache,
    playerData,
    myPlayer,
    setMyPlayer,
    clearMyPlayer,
    isMyPlayer,
    favorites,
    clearFavorites,
    activeTab,
  } = usePlayer();
  const { showSuccess, showInfo, showError } = useToast();
  const { state: streakState, resetStreak } = useDailyCheckin();
  const [autoGoalsEnabled, setAutoGoalsEnabled] = useAutoGoalsEnabled();
  const [overlayEnabled, setOverlayEnabled] = useOverlayEnabled();
  const { goals, clearAll: clearAllGoals } = useGoals();
  const activeGoalsCount = goals.filter((g) => !g.achievedAt).length;
  const achievedGoalsCount = goals.length - activeGoalsCount;
  const { resetAll: resetAchievements, state: achievementsState } =
    useAchievements();
  const [achievementNotifs, setAchievementNotifs] =
    useAchievementNotifications();
  const [diamondCeleb, setDiamondCeleb] = useDiamondCelebration();

  const [devOpen, setDevOpen] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useHapticEnabled();
  const { history: aiHistory, pinned: pinnedAdvices, clearHistory: clearAiHistory } =
    useAiHistory();
  const [autoSaveAdvice, setAutoSaveAdvice] = useAdviceAutoSave();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const {
    isSupported: ttsSupported,
    voices: ttsVoices,
    voice: ttsActiveVoice,
    prefs: voicePrefs,
    playback: voicePlayback,
    setPrefs: setVoicePrefs,
    setRate: setVoiceRate,
    setVoice: setVoiceName,
    stop: stopVoice,
  } = useTextToSpeech();
  const hasUkVoice = ttsVoices.some((v) => (v.lang ?? "").toLowerCase().startsWith("uk"));
  const isTestPlaying =
    voicePlayback.sourceId === "test" &&
    (voicePlayback.isSpeaking || voicePlayback.isPaused);
  const [cachedCount, setCachedCount] = useState<number>(() => countCachedPlayers());
  const [snapshotCount, setSnapshotCount] = useState<number>(() => countTotalSnapshots());
  const [historyPlayersCount, setHistoryPlayersCount] = useState<number>(
    () => getAllPlayerTagsWithHistory().length
  );
  const [now, setNow] = useState(() => Date.now());
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setCachedCount(countCachedPlayers());
    setSnapshotCount(countTotalSnapshots());
    setHistoryPlayersCount(getAllPlayerTagsWithHistory().length);
  }, [lastUpdated]);

  useEffect(() => {
    if (activeTab === "settings") {
      trackAchievementEvent("settings_visit");
    }
  }, [activeTab]);

  const onSearch = async (tag: string) => {
    await handleQuery(tag);
  };

  const handleClearHistory = () => {
    clearHistory();
    showSuccess("Історію очищено");
  };

  const handleClearCache = () => {
    clearAllCache();
    setCachedCount(0);
    haptic.medium();
    showSuccess("Кеш очищено");
  };

  const handleClearTrophyHistory = () => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "Видалити всю історію кубків для всіх гравців? Дію не можна скасувати."
          )
        : true;
    if (!confirmed) return;
    clearTrophyHistory();
    setSnapshotCount(0);
    setHistoryPlayersCount(0);
    haptic.medium();
    showSuccess("Історію кубків очищено");
  };

  const handleSetCurrentAsMine = () => {
    if (!playerData) return;
    setMyPlayer(playerData.tag);
    haptic.success();
    showSuccess("Профіль збережено як основний");
  };

  const handleClearMyPlayer = () => {
    clearMyPlayer();
    haptic.medium();
    showInfo("Прибрано основний профіль");
  };

  const handleClearFavorites = () => {
    clearFavorites();
    haptic.medium();
    showSuccess("Улюблених очищено");
  };

  const handleToggleAutoGoals = (next: boolean) => {
    if (autoGoalsEnabled === next) return;
    setAutoGoalsEnabled(next);
    haptic.selection();
    showInfo(next ? "Авто цілі увімкнено" : "Авто цілі вимкнено");
  };

  const handleToggleOverlay = (next: boolean) => {
    if (overlayEnabled === next) return;
    setOverlayEnabled(next);
    haptic.selection();
    showInfo(
      next ? "Святкування увімкнено" : "Тільки тихий toast при досягненні"
    );
  };

  const handleClearGoals = () => {
    if (goals.length === 0) return;
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Видалити всі цілі (активні та досягнуті)?")
        : true;
    if (!confirmed) return;
    clearAllGoals();
    haptic.medium();
    showSuccess("Цілі очищено");
  };

  const handleResetStreak = () => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "Скинути streak і всю статистику активності? Дію не можна скасувати."
          )
        : true;
    if (!confirmed) return;
    resetStreak();
    haptic.medium();
    showInfo("Статистику активності скинуто");
  };

  const handleToggleAchievementNotifs = (next: boolean) => {
    if (achievementNotifs === next) return;
    setAchievementNotifs(next);
    haptic.selection();
    showInfo(next ? "Сповіщення увімкнено" : "Розблокування без toast");
  };

  const handleToggleVoiceEnabled = (next: boolean) => {
    if (voicePrefs.enabled === next) return;
    setVoicePrefs({ enabled: next });
    haptic.selection();
    if (!next) stopVoice();
    showInfo(next ? "Голосове озвучення увімкнено" : "Голосове озвучення вимкнено");
  };

  const handleToggleAutoPlayVoice = (next: boolean) => {
    if (voicePrefs.autoPlay === next) return;
    setVoicePrefs({ autoPlay: next });
    haptic.selection();
    showInfo(next ? "Авто-озвучення нових порад увімкнено" : "Авто-озвучення вимкнено");
  };

  const handleVoiceTest = () => {
    if (!ttsSupported) {
      showError("Голосове озвучення не підтримується у цьому браузері");
      return;
    }
    if (isTestPlaying) {
      stopVoice();
      haptic.medium();
      return;
    }
    const ok = speakTestPhrase();
    if (!ok) {
      showError("Не вдалося запустити демо-фразу");
    } else {
      haptic.light();
    }
  };

  const handleToggleAutoSaveAdvice = (next: boolean) => {
    if (autoSaveAdvice === next) return;
    setAutoSaveAdvice(next);
    haptic.selection();
    showInfo(next ? "Авто-збереження порад увімкнено" : "Авто-збереження вимкнено");
  };

  const handleClearAiHistory = () => {
    const pinnedCount = pinnedAdvices.length;
    const message =
      pinnedCount > 0
        ? `Очистити бібліотеку? Закріплені (${pinnedCount}) лишаться.`
        : "Очистити всю бібліотеку порад?";
    const confirmed = typeof window !== "undefined" ? window.confirm(message) : true;
    if (!confirmed) return;
    clearAiHistory({ keepPinned: pinnedCount > 0 });
    haptic.medium();
    showSuccess("Бібліотеку очищено");
  };

  const handleToggleDiamondCeleb = (next: boolean) => {
    if (diamondCeleb === next) return;
    setDiamondCeleb(next);
    haptic.selection();
    showInfo(
      next ? "Святкування для diamond увімкнено" : "Святкування для diamond вимкнено"
    );
  };

  const handleCopyCurrentLink = async () => {
    const url = getCurrentShareableUrl();
    const ok = await copyToClipboard(url);
    if (ok) {
      haptic.light();
      showSuccess("Посилання на екран скопійовано");
    } else {
      showError("Не вдалося скопіювати посилання");
    }
  };

  const handleResetAchievements = () => {
    const first =
      typeof window !== "undefined"
        ? window.confirm("Скинути всі досягнення?")
        : true;
    if (!first) return;
    const second =
      typeof window !== "undefined"
        ? window.confirm(
            "Точно? Прогрес ВСІХ досягнень буде втрачено остаточно."
          )
        : true;
    if (!second) return;
    resetAchievements();
    haptic.error();
    showSuccess("Досягнення скинуто");
  };

  const handleSetDemo = (demo: boolean) => {
    if (isDemoMode !== demo) {
      haptic.selection();
      setIsDemoMode(demo);
      showInfo(demo ? "Demo-режим увімкнено" : "Real API увімкнено");
    }
  };

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <header>
        <h1 className="text-xl font-black uppercase tracking-widest text-white">
          {t("settings.title")}
        </h1>
      </header>

      <PlayerSearch onSearch={onSearch} isLoading={isLoading} />

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
          Джерело даних
        </p>
        <div className="flex gap-2 rounded-xl bg-[#1a0a2e] p-1">
          <button
            onClick={() => handleSetDemo(true)}
            className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              isDemoMode
                ? "bg-[#facc15] text-[#1a0a2e]"
                : "text-slate-400"
            }`}
          >
            <Zap className="h-4 w-4" />
            Demo
          </button>
          <button
            onClick={() => handleSetDemo(false)}
            className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              !isDemoMode
                ? "bg-[#7c3aed] text-white"
                : "text-slate-400"
            }`}
          >
            <Wifi className="h-4 w-4" />
            Real API
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <Globe className="h-4 w-4 text-[#a78bfa]" />
          {t("settings.language")}
        </p>
        <p className="mb-3 text-[11px] text-slate-400">
          {t("settings.languageDescription")}
        </p>
        <LanguageToggle syncToUrl />
        {systemLocale !== locale && (
          <p className="mt-2 text-[10px] text-slate-500">
            {t("settings.detectedSystem", {
              language: `${LOCALE_LABELS[systemLocale].flag} ${LOCALE_LABELS[systemLocale].native}`,
            })}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
          Вібрація
        </p>
        <div className="flex gap-2 rounded-xl bg-[#1a0a2e] p-1">
          <button
            onClick={() => {
              setHapticEnabled(true);
              haptic.medium();
              trackAchievementEvent("haptic_toggle", { enabled: true });
            }}
            className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              hapticEnabled
                ? "bg-[#facc15] text-[#1a0a2e]"
                : "text-slate-400"
            }`}
          >
            <Vibrate className="h-4 w-4" />
            Увімкнено
          </button>
          <button
            onClick={() => {
              setHapticEnabled(false);
              trackAchievementEvent("haptic_toggle", { enabled: false });
            }}
            className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              !hapticEnabled
                ? "bg-[#7c3aed] text-white"
                : "text-slate-400"
            }`}
          >
            <VibrateOff className="h-4 w-4" />
            Вимкнено
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Pin className="h-3.5 w-3.5" />
          Мій профіль
        </p>
        {myPlayer.tag ? (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a78bfa]/15 ring-1 ring-[#a78bfa]/30">
              <Pin className="h-5 w-5 text-[#a78bfa]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black uppercase text-white">
                {myPlayer.customName || playerData?.name || "Профіль"}
              </p>
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {myPlayer.tag}
              </p>
            </div>
            <button
              onClick={handleClearMyPlayer}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase text-rose-300 active:scale-95"
            >
              Скинути
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Збережи свій тег як основний для миттєвого старту при відкритті застосунку.
            </p>
            {playerData && (
              <button
                onClick={handleSetCurrentAsMine}
                disabled={isMyPlayer(playerData.tag)}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#a78bfa] text-xs font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95 disabled:opacity-50"
              >
                <Pin className="h-4 w-4" />
                Зробити поточний моїм
              </button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <Flame className="h-3.5 w-3.5" />
            Активність
          </p>
        </div>

        <StreakBadge variant="full" />

        <WeekCalendar />

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Усього входів
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {streakState.totalCheckins}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Найдовший
            </p>
            <p className="mt-1 text-lg font-black text-[#fb923c]">
              {streakState.longestStreak}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Total XP
            </p>
            <p className="mt-1 text-lg font-black text-[#facc15]">
              {streakState.totalXp.toLocaleString("uk-UA")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Найближчі milestones
          </p>
          <ul className="space-y-2">
            {MILESTONES.map((m) => {
              const achieved = streakState.currentStreak >= m.days;
              const remaining = Math.max(0, m.days - streakState.currentStreak);
              const progress = Math.min(100, (streakState.currentStreak / m.days) * 100);
              return (
                <li key={m.days} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={achieved ? "text-[#22c55e]" : "text-slate-300"}>
                      {m.emoji} {m.days} днів — {m.reward}
                    </span>
                    <span className={achieved ? "text-[#22c55e]" : "text-slate-500"}>
                      {achieved ? "✓" : `+${m.xp} XP`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        achieved
                          ? "bg-[#22c55e]"
                          : "bg-gradient-to-r from-[#fb923c] to-[#facc15]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {!achieved && remaining > 0 && (
                    <p className="text-[10px] text-slate-500">
                      Ще {remaining} {remaining === 1 ? "день" : "днів"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="px-1 text-[10px] text-slate-500">
          XP накопичується для майбутніх можливостей: косметика, AI-кредити та більше.
        </p>

        {streakState.totalCheckins > 0 && (
          <button
            onClick={handleResetStreak}
            className="flex w-full min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-wider text-rose-300 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Скинути статистику
          </button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-1.5">
          <TrophyIcon className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Досягнення
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Сповіщення
          </p>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-white">
                  Сповіщення про досягнення
                </p>
                <p className="text-[11px] text-slate-500">
                  Toast зверху при кожному unlock.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={achievementNotifs}
                onClick={() => handleToggleAchievementNotifs(!achievementNotifs)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  achievementNotifs ? "bg-[#facc15]" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    achievementNotifs ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-white">
                  Святкування diamond
                </p>
                <p className="text-[11px] text-slate-500">
                  Особлива анімація для найвищого рангу.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={diamondCeleb}
                onClick={() => handleToggleDiamondCeleb(!diamondCeleb)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  diamondCeleb ? "bg-cyan-300" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    diamondCeleb ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <div className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <TrophyIcon className="h-3.5 w-3.5 text-[#facc15]" />
                {achievementsState.stats.totalUnlocked} розблоковано · {" "}
                <span className="text-[#facc15]">
                  {achievementsState.stats.totalXpFromAchievements.toLocaleString("uk-UA")} XP
                </span>
              </span>
              {achievementsState.stats.totalUnlocked > 0 && (
                <button
                  type="button"
                  onClick={handleResetAchievements}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#ef4444] active:opacity-70"
                >
                  <Trash2 className="h-3 w-3" />
                  Скинути
                </button>
              )}
            </div>
          </div>
        </div>

        <AchievementsSection />
      </section>

      <NotificationsSettingsSection />

      <PwaSettingsSection />

      <OnboardingResetCard />

      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-[#2a1a4a]/60" />
        }
      >
        <BackupSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-[#2a1a4a]/60" />
        }
      >
        <AccessibilitySection />
      </Suspense>

      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-[#2a1a4a]/60" />
        }
      >
        <PrivacySection />
      </Suspense>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <Star className="h-3.5 w-3.5" />
            {t("pinned.fullSectionTitle")}
          </p>
        </div>
        <PinnedPlayersList />
        {favorites.length > 0 && (
          <button
            onClick={handleClearFavorites}
            className="mt-3 flex w-full min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-wider text-rose-300 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Очистити всіх улюблених
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Статус API
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              isApiConfigured
                ? "bg-[#22c55e]/20 text-[#22c55e]"
                : "bg-[#facc15]/20 text-[#facc15]"
            }`}
          >
            {isApiConfigured ? "Токен OK" : "Демо режим"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <LinkIcon className="h-3.5 w-3.5" />
          Поточний екран
        </p>
        <button
          type="button"
          onClick={handleCopyCurrentLink}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-200 active:scale-95"
        >
          <LinkIcon className="h-4 w-4" />
          Скопіювати посилання на екран
        </button>
        <p className="mt-2 text-[10px] leading-snug text-slate-500">
          Збереже поточний таб, гравця та відкриті панелі — щоб одержувач побачив той самий стан.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <Database className="h-3.5 w-3.5" />
            Кеш
          </p>
          {cachedCount > 0 && (
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#ef4444] active:opacity-70"
            >
              <Trash2 className="h-3 w-3" />
              Очистити кеш
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Збережено профілів</span>
            <span className="font-black text-white">{cachedCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Останнє оновлення</span>
            <span className="font-bold text-slate-200">
              {lastUpdated ? formatRelativeTime(lastUpdated, now) : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Target className="h-3.5 w-3.5" />
          Цілі по кубках
        </p>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-white">
                Автоматичні цілі
              </p>
              <p className="text-[11px] text-slate-500">
                Створювати наступну milestone-ціль після кожного апдейту.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoGoalsEnabled}
              onClick={() => handleToggleAutoGoals(!autoGoalsEnabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                autoGoalsEnabled ? "bg-[#facc15]" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoGoalsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-white">
                Святкування при досягненні
              </p>
              <p className="text-[11px] text-slate-500">
                Повноекранне святкування з конфеті замість тихого toast.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={overlayEnabled}
              onClick={() => handleToggleOverlay(!overlayEnabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                overlayEnabled ? "bg-[#7c3aed]" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  overlayEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <div className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-slate-400">
              <TrophyIcon className="h-3.5 w-3.5 text-[#facc15]" />
              {activeGoalsCount} активних
              <span className="text-slate-600">·</span>
              {achievedGoalsCount} досягнуто
            </span>
            {goals.length > 0 && (
              <button
                type="button"
                onClick={handleClearGoals}
                className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#ef4444] active:opacity-70"
              >
                <Trash2 className="h-3 w-3" />
                Очистити
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <LineChart className="h-3.5 w-3.5" />
            Історія кубків
          </p>
          {snapshotCount > 0 && (
            <button
              onClick={handleClearTrophyHistory}
              className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#ef4444] active:opacity-70"
            >
              <Trash2 className="h-3 w-3" />
              Очистити
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Snapshots</span>
            <span className="font-black text-white">{snapshotCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Гравців</span>
            <span className="font-black text-white">{historyPlayersCount}</span>
          </div>
        </div>
        {snapshotCount === 0 && (
          <p className="mt-2 text-[10px] text-slate-500">
            Snapshots з'являться після оновлень профілю.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Headphones className="h-3.5 w-3.5" />
          Голосове озвучення
        </p>

        {!ttsSupported ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-[11px] text-slate-500">
            Цей браузер не підтримує Web Speech API. Спробуйте Chrome, Edge або Safari
            на актуальній версії.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-white">Увімкнено</p>
                <p className="text-[11px] text-slate-500">
                  Показувати кнопку «Прослухати» біля AI-порад.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={voicePrefs.enabled}
                onClick={() => handleToggleVoiceEnabled(!voicePrefs.enabled)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  voicePrefs.enabled ? "bg-[#facc15]" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    voicePrefs.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-white">
                  Авто-озвучення нових порад
                </p>
                <p className="text-[11px] text-slate-500">
                  Щойно стрім AI закінчиться — автоматично почати читати.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={voicePrefs.autoPlay}
                onClick={() => handleToggleAutoPlayVoice(!voicePrefs.autoPlay)}
                disabled={!voicePrefs.enabled}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                  voicePrefs.autoPlay ? "bg-[#7c3aed]" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    voicePrefs.autoPlay ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <div className="space-y-2 rounded-xl bg-[#1a0a2e] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Volume2 className="h-3 w-3" />
                Голос
                {ttsActiveVoice && (
                  <span className="ml-auto text-slate-400 normal-case">
                    {ttsActiveVoice.lang}
                  </span>
                )}
              </p>
              {ttsVoices.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Системні голоси ще завантажуються. Якщо вони так і не зʼявляться —
                  у браузері немає встановлених TTS-голосів.
                </p>
              ) : (
                <>
                  <select
                    value={voicePrefs.voiceName ?? ""}
                    onChange={(e) => setVoiceName(e.target.value || null)}
                    disabled={!voicePrefs.enabled}
                    className="w-full rounded-lg border border-white/10 bg-[#2a1a4a] px-3 py-2 text-xs text-white focus:border-[#7c3aed]/50 focus:outline-none disabled:opacity-50"
                    aria-label="Виберіть голос"
                  >
                    <option value="">Авто (uk → ru → en)</option>
                    {ttsVoices
                      .slice()
                      .sort((a, b) => a.lang.localeCompare(b.lang))
                      .map((v) => (
                        <option key={`${v.name}-${v.lang}`} value={v.name}>
                          {v.name} · {v.lang}
                          {v.default ? " · default" : ""}
                        </option>
                      ))}
                  </select>
                  {!hasUkVoice && (
                    <p className="text-[10px] leading-snug text-[#facc15]">
                      Українські голоси відсутні у системі. Використовується найближчий
                      доступний (англійський або російський).
                    </p>
                  )}
                </>
              )}
            </div>

            <SliderRow
              label="Швидкість"
              min={0.5}
              max={2}
              step={0.25}
              value={voicePrefs.rate}
              onChange={(v) => setVoiceRate(v)}
              disabled={!voicePrefs.enabled}
            />
            <SliderRow
              label="Висота"
              min={0.5}
              max={2}
              step={0.1}
              value={voicePrefs.pitch}
              onChange={(v) => setVoicePrefs({ pitch: v })}
              disabled={!voicePrefs.enabled}
            />
            <SliderRow
              label="Гучність"
              min={0}
              max={1}
              step={0.05}
              value={voicePrefs.volume}
              onChange={(v) => setVoicePrefs({ volume: v })}
              disabled={!voicePrefs.enabled}
            />

            <button
              type="button"
              onClick={handleVoiceTest}
              disabled={!voicePrefs.enabled}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#7c3aed]/40 bg-[#7c3aed]/15 text-xs font-black uppercase tracking-wider text-[#c4b5fd] active:scale-95 disabled:opacity-40"
            >
              {isTestPlaying ? (
                <>
                  <Square className="h-4 w-4 fill-current" />
                  Зупинити тест
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Тест голосу
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Sparkles className="h-3.5 w-3.5" />
          Бібліотека порад
        </p>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-2 rounded-xl bg-[#1a0a2e] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-white">
                Зберігати поради автоматично
              </p>
              <p className="text-[11px] text-slate-500">
                Кожна AI-порада додається у бібліотеку без зайвих кліків.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSaveAdvice}
              onClick={() => handleToggleAutoSaveAdvice(!autoSaveAdvice)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                autoSaveAdvice ? "bg-[#facc15]" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoSaveAdvice ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <div className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-slate-400">
              <Library className="h-3.5 w-3.5 text-[#a78bfa]" />
              {aiHistory.length} {aiHistory.length === 1 ? "запис" : "записів"}
              {pinnedAdvices.length > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-[#facc15]">{pinnedAdvices.length} закріп.</span>
                </>
              )}
            </span>
            {aiHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearAiHistory}
                className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#ef4444] active:opacity-70"
              >
                <Trash2 className="h-3 w-3" />
                Очистити
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#7c3aed]/40 bg-[#7c3aed]/15 text-xs font-black uppercase tracking-wider text-[#c4b5fd] active:scale-95"
          >
            <Library className="h-4 w-4" />
            Переглянути бібліотеку
          </button>
        </div>
      </section>

      <AiHistoryView open={libraryOpen} onClose={() => setLibraryOpen(false)} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
            <History className="h-3.5 w-3.5" />
            Історія
          </p>
          {searchHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-[10px] font-bold uppercase text-[#ef4444]"
            >
              Очистити
            </button>
          )}
        </div>
        {searchHistory.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                context="history"
                onShortPress={() => handleQuery(tag)}
                className="min-h-[36px] rounded-full border border-white/10 bg-[#2a1a4a] px-3 text-xs font-bold text-slate-300 active:scale-95"
              >
                {tag}
              </TagBadge>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-[#2a1a4a]/40 px-4 py-3">
            <History className="h-5 w-5 shrink-0 text-slate-600" strokeWidth={1.5} />
            <p className="text-xs text-slate-500">
              Історія пуста. Знайди першого гравця ✨
            </p>
          </div>
        )}
      </section>

      {isDev && (
        <section className="rounded-2xl border border-white/10 bg-[#2a1a4a]">
          <button
            onClick={() => setDevOpen(!devOpen)}
            className="flex w-full min-h-[48px] items-center justify-between px-4 py-3"
          >
            <span className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              <Terminal className="h-4 w-4" />
              Developer
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${devOpen ? "rotate-180" : ""}`}
            />
          </button>

          {devOpen && (
            <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Uptime</span>
                <span className="font-bold text-white">{serverUptime}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Запитів</span>
                <span className="font-bold text-white">{totalRequests}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#1a0a2e] overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-500">
                  <Activity className="h-3 w-3" />
                  Логи
                </div>
                {activityLogs.length === 0 ? (
                  <p className="p-3 text-xs text-slate-600">Немає записів</p>
                ) : (
                  activityLogs.map((log, i) => (
                    <div
                      key={i}
                      className="flex justify-between border-b border-white/5 px-3 py-2 text-[10px] font-mono last:border-0"
                    >
                      <span className="text-slate-500">{log.time}</span>
                      <span className="text-slate-300">{log.tag}</span>
                      <span className={log.ok ? "text-[#22c55e]" : "text-[#ef4444]"}>
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <p className="text-center text-[10px] text-slate-600">© 2026 Brawl Stats</p>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block space-y-1 rounded-xl bg-[#1a0a2e] p-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full accent-[#facc15]"
        aria-label={label}
      />
    </label>
  );
}

function OnboardingResetCard() {
  const { t } = useTranslation();
  const { reset } = useOnboarding();

  return (
    <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/15 text-[#facc15]">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-widest text-white">
            {t("onboarding.settings.title")}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
            {t("onboarding.settings.body")}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#facc15]/40 bg-[#facc15]/10 px-4 text-[11px] font-black uppercase tracking-wider text-[#facc15] active:scale-95"
          >
            {t("onboarding.settings.cta")}
          </button>
        </div>
      </div>
    </section>
  );
}

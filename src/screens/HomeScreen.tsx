import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Trophy,
  Users,
  User,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import ProfileCard from "../components/ProfileCard";
import PinnedPlayersStrip from "../components/PinnedPlayersStrip";
import UpdateStatsButton from "../components/UpdateStatsButton";
import PullToRefresh from "../components/PullToRefresh";
import AnimatedCounter from "../components/AnimatedCounter";
import ModesMiniChart from "../components/ModesMiniChart";
import BrawlerAvatar from "../components/BrawlerAvatar";
import StreakBadge from "../components/StreakBadge";
import GoalProgressCard from "../components/GoalProgressCard";
import AddGoalSheet from "../components/AddGoalSheet";
import ProfileCardSkeleton from "../components/skeletons/ProfileCardSkeleton";
import ModeCardSkeleton from "../components/skeletons/ModeCardSkeleton";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import BrawlerIllustration from "../components/illustrations/BrawlerIllustration";
import { useMinDuration } from "../hooks/useMinDuration";
import { useDailyCheckin } from "../hooks/useDailyCheckin";
import { getProgress, useGoals } from "../hooks/useGoals";
import { calculateProgress } from "../utils/brawlerProgress";
import DonutChart from "../components/DonutChart";
import { brawlersMetadata, type BrawlerInfo } from "../types";
import { formatRelativeTime } from "../utils/formatTime";
import { updateUrl } from "../navigation/urlState";
import { useTranslation } from "../hooks/useTranslation";

const STALE_LABEL_AFTER_MS = 5 * 60 * 1000;

export default function HomeScreen() {
  const { t } = useTranslation();
  const {
    playerData,
    isLoading,
    isRefreshing,
    lastUpdated,
    setActiveTab,
    refreshPlayer,
    loadDemoPlayer,
  } = usePlayer();
  const showSkeleton = useMinDuration(isLoading && !playerData, 300);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openBrawler = (b: BrawlerInfo) => {
    updateUrl({ brawler: b.id });
  };
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const { status: streakStatus, state: streakState } = useDailyCheckin();
  const showAtRiskBanner =
    streakStatus === "at_risk" &&
    streakState.currentStreak > 0 &&
    new Date().getHours() >= 18;
  const { activeGoals } = useGoals();
  const goalsForPlayer = useMemo(
    () => (playerData ? activeGoals(playerData.tag) : []),
    [activeGoals, playerData]
  );
  const topGoal = useMemo(() => {
    if (!playerData || goalsForPlayer.length === 0) return null;
    return goalsForPlayer.reduce((best, g) => {
      const bp = getProgress(best, playerData.trophies).percentage;
      const gp = getProgress(g, playerData.trophies).percentage;
      return gp > bp ? g : best;
    });
  }, [goalsForPlayer, playerData]);

  const collectionProgress = useMemo(
    () => (playerData ? calculateProgress(playerData.brawlers) : null),
    [playerData]
  );

  if (!playerData && showSkeleton) {
    return (
      <div className="h-full space-y-6 overflow-y-auto px-4 pb-6 pt-4">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">
            Brawl <span className="text-[#facc15]">Stats</span>
          </h1>
          <div className="flex items-center gap-2">
            <Skeleton rounded="rounded-full" className="h-11 w-16" />
            <Skeleton rounded="rounded-xl" className="h-11 w-11" />
          </div>
        </header>
        <ProfileCardSkeleton />
        <Skeleton rounded="rounded-2xl" className="h-[52px] w-full" />
        <section>
          <Skeleton className="mb-3 h-3 w-20" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ModeCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="mb-3 h-3 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <React.Fragment key={i}>
                <Skeleton
                  rounded="rounded-2xl"
                  className="h-[120px] w-[120px] shrink-0"
                />
              </React.Fragment>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!playerData) {
    return (
      <EmptyState
        illustration={<BrawlerIllustration variant="empty" />}
        title="Хто твій бравлер?"
        description="Введи свій тег, щоб побачити статистику, улюблених бійців і отримати поради від AI-тренера"
        action={{
          label: "Знайти профіль",
          onClick: () => setActiveTab("settings"),
        }}
        secondaryAction={{
          label: "Спробувати демо",
          onClick: loadDemoPlayer,
        }}
      />
    );
  }

  const topBrawlers = [...(playerData.brawlers ?? [])]
    .sort((a, b) => b.trophies - a.trophies)
    .slice(0, 5);

  const modes = [
    {
      label: "3v3",
      value: playerData["3vs3Victories"],
      icon: Users,
      color: "from-[#3b82f6]/20 to-[#1e3a8a]/10",
      border: "border-[#3b82f6]/30",
      text: "text-[#60a5fa]",
    },
    {
      label: "Solo Showdown",
      value: playerData.soloVictories,
      icon: User,
      color: "from-[#7c3aed]/20 to-[#4c1d95]/10",
      border: "border-[#7c3aed]/30",
      text: "text-[#a78bfa]",
    },
    {
      label: "Duo Showdown",
      value: playerData.duoVictories,
      icon: Users,
      color: "from-[#22c55e]/20 to-[#14532d]/10",
      border: "border-[#22c55e]/30",
      text: "text-[#4ade80]",
    },
    {
      label: "Рекорд",
      value: playerData.highestTrophies,
      icon: Trophy,
      color: "from-[#facc15]/20 to-[#854d0e]/10",
      border: "border-[#facc15]/30",
      text: "text-[#facc15]",
    },
  ];

  const refreshingOverlay = isLoading && !!playerData;
  const showStaleLabel =
    lastUpdated !== null && now - lastUpdated > STALE_LABEL_AFTER_MS;

  return (
    <PullToRefresh onRefresh={refreshPlayer}>
      <div
        className={`space-y-6 px-4 pb-6 pt-4 transition-opacity duration-200 ${refreshingOverlay ? "opacity-70" : "opacity-100"}`}
      >
        <header className="flex items-center justify-between gap-2">
          <h1 className="flex min-w-0 items-center gap-2 text-xl font-black uppercase tracking-widest text-white">
            Brawl <span className="text-[#facc15]">Stats</span>
            {isRefreshing && (
              <RefreshCw
                className="h-4 w-4 animate-spin text-[#facc15]"
                aria-label="Оновлення"
              />
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <StreakBadge
              variant="compact"
              onClick={() => setActiveTab("settings")}
            />
            <button
              onClick={() => setActiveTab("settings")}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 active:scale-95"
              aria-label="Налаштування"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {showAtRiskBanner && (
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-[#facc15]/40 bg-[#facc15]/10 px-3.5 py-2.5 text-left active:scale-[0.99]"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#facc15]" />
            <p className="min-w-0 flex-1 text-xs font-bold text-[#facc15]">
              Не загуби streak! Зайди ще раз, щоб зберегти {streakState.currentStreak}{" "}
              {streakState.currentStreak === 1 ? "день" : "днів"}.
            </p>
          </button>
        )}

        <div className="space-y-2">
          <ProfileCard player={playerData} onClick={() => setActiveTab("stats")} />
          <PinnedPlayersStrip />
          <div className="flex items-center justify-between gap-2 px-1">
            {collectionProgress && (
              <button
                type="button"
                onClick={() => setActiveTab("stats")}
                aria-label="Колекція бравлерів"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 active:scale-95"
              >
                <DonutChart
                  size={24}
                  strokeWidth={4}
                  value={collectionProgress.percentage}
                  color="#facc15"
                  trackColor="rgba(255,255,255,0.12)"
                  animate={false}
                  ariaLabel={`Колекція ${collectionProgress.percentage}%`}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Колекція{" "}
                  <span className="text-[#facc15]">
                    {collectionProgress.unlocked}/{collectionProgress.total}
                  </span>
                </span>
              </button>
            )}
            {showStaleLabel && (
              <p className="text-[10px] font-medium text-slate-500">
                Оновлено {formatRelativeTime(lastUpdated, now)}
              </p>
            )}
          </div>
        </div>
        <UpdateStatsButton />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
              <Target className="h-3.5 w-3.5" />
              Найближча ціль
            </h2>
            <button
              type="button"
              onClick={() => setGoalSheetOpen(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-[#facc15] active:opacity-70"
            >
              <Plus className="h-3 w-3" />
              {topGoal ? "Додати" : "Поставити"}
            </button>
          </div>
          {topGoal ? (
            <GoalProgressCard
              goal={topGoal}
              currentTrophies={playerData.trophies}
              onTap={() => setActiveTab("stats")}
            />
          ) : (
            <button
              type="button"
              onClick={() => setGoalSheetOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#facc15]/30 bg-[#facc15]/5 px-4 py-3 text-left active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/10 ring-1 ring-[#facc15]/30">
                <Target className="h-5 w-5 text-[#facc15]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black uppercase text-white">
                  Постав свою ціль
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  Відстежуй прогрес до бажаних кубків
                </p>
              </div>
            </button>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              {t("home.modes")}
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-[#7c3aed] px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_0_12px_rgba(124,58,237,0.35)] active:scale-95"
            >
              <ModesMiniChart
                threeVsThree={playerData["3vs3Victories"]}
                solo={playerData.soloVictories}
                duo={playerData.duoVictories}
              />
              {t("home.statistics")}
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {modes.map((mode) => (
              <div
                key={mode.label}
                className={`rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-md ${mode.color} ${mode.border}`}
              >
                <mode.icon className={`mb-2 h-5 w-5 ${mode.text}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {mode.label}
                </p>
                <AnimatedCounter
                  value={mode.value}
                  className={`text-xl font-black ${mode.text}`}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
            {t("home.favoriteBrawlers")}
          </h2>
          <div
            data-scroll-x="true"
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {topBrawlers.map((b) => {
              const meta = brawlersMetadata[b.name];
              const displayName = meta?.name ?? b.name;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBrawler(b)}
                  aria-label={`Деталі бійця ${displayName}`}
                  className="flex w-[120px] shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-left transition-transform active:scale-[0.98]"
                >
                  <BrawlerAvatar
                    brawlerId={b.id}
                    brawlerName={b.name}
                    size={56}
                    rounded="rounded-2xl"
                  />
                  <p className="mt-2 w-full truncate text-center text-xs font-bold uppercase text-white">
                    {displayName}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-[#facc15]" />
                    <span className="text-sm font-black text-[#facc15]">{b.trophies}</span>
                  </div>
                  <span className="mt-0.5 text-[10px] font-bold text-slate-500">
                    PWR {b.power}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <AddGoalSheet
        open={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        tag={playerData.tag}
        currentTrophies={playerData.trophies}
      />
    </PullToRefresh>
  );
}

import React, { Suspense, lazy, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import PlayerProfile from "../components/PlayerProfile";
import CopyTagButton from "../components/CopyTagButton";
import ComparePlayersButton from "../components/ComparePlayersButton";
import ModesChart from "../components/ModesChart";
import GoalsList from "../components/GoalsList";
import BrawlerCollectionSection from "../components/BrawlerCollectionSection";
import TrophyProgressSection from "./sections/TrophyProgressSection";
import ShareButton from "../components/ShareButton";
import ClubBadge from "../components/ClubBadge";
import AdvicePreviewCard from "../components/AdvicePreviewCard";
import CoachPanelSkeleton from "../components/skeletons/CoachPanelSkeleton";
import { useAiHistory } from "../hooks/useAiHistory";
import { sharePlayerPreset } from "../utils/sharePresets";
import { updateUrl } from "../navigation/urlState";
import { ChevronRight, Library, Shield, Target } from "lucide-react";
import ProfileCardSkeleton from "../components/skeletons/ProfileCardSkeleton";
import BrawlersGridSkeleton from "../components/skeletons/BrawlersGridSkeleton";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import BrawlerIllustration from "../components/illustrations/BrawlerIllustration";
import { useMinDuration } from "../hooks/useMinDuration";
import { useTranslation } from "../hooks/useTranslation";

// Lazy-loaded — the battle log section pulls in its own helpers, the
// detail bottom-sheet and a sparkline chart, so we keep it out of the
// initial Stats bundle to preserve cold-start TTI.
const BattleLogSection = lazy(
  () => import("../components/battle/BattleLogSection")
);

// CoachPanel transitively imports the TTS hook, prompt picker, voice
// player and markdown parsing. Defer until the Stats tab actually
// becomes visible — saves ~30 KB on cold start for users who never
// open this tab.
const CoachPanel = lazy(() => import("../components/CoachPanel"));

// History modal — only mounted when the user clicks "Усі поради".
const AiHistoryView = lazy(() => import("../components/AiHistoryView"));

export default function StatsScreen() {
  const { t } = useTranslation();
  const { playerData, isLoading, setActiveTab } = usePlayer();
  const { getRecent } = useAiHistory();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const showSkeleton = useMinDuration(isLoading && !playerData, 300);
  const recentAdvices = getRecent(3);

  if (!playerData && showSkeleton) {
    return (
      <div className="space-y-5 px-4 pb-6 pt-4">
        <header>
          <h1 className="text-xl font-black uppercase tracking-widest text-white">
            {t("stats.title")}
          </h1>
        </header>
        <ProfileCardSkeleton />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <React.Fragment key={i}>
              <Skeleton rounded="rounded-2xl" className="h-20" />
            </React.Fragment>
          ))}
        </div>
        <BrawlersGridSkeleton count={6} />
      </div>
    );
  }

  if (!playerData) {
    return (
      <EmptyState
        illustration={<BrawlerIllustration variant="search" />}
        title={t("home.noProfile")}
        description={t("home.noProfileHint")}
        action={{
          label: t("home.goToSettings"),
          onClick: () => setActiveTab("settings"),
        }}
      />
    );
  }

  const refreshingOverlay = isLoading;

  return (
    <div
      className={`space-y-5 px-4 pb-6 pt-4 transition-opacity duration-200 ${refreshingOverlay ? "opacity-70" : "opacity-100"}`}
    >
      <header>
        <h1 className="text-xl font-black uppercase tracking-widest text-white">
          {t("stats.title")}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyTagButton tag={playerData.tag} />
          <ShareButton
            payload={() => sharePlayerPreset(playerData)}
            variant="pill"
            size="sm"
            ariaLabel={`Поділитися профілем ${playerData.name}`}
          />
          <ComparePlayersButton />
        </div>
      </header>

      <PlayerProfile
        player={playerData}
        beforeBrawlers={
          <ModesChart
            threeVsThree={playerData["3vs3Victories"]}
            solo={playerData.soloVictories}
            duo={playerData.duoVictories}
          />
        }
      />

      {playerData.club?.name && playerData.club?.tag && (
        <section>
          <div className="mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Клуб
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateUrl({
                club: playerData.club!.tag!.replace(/^#/, "").toUpperCase(),
              })
            }
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-left transition-transform active:scale-[0.98]"
            aria-label={`Переглянути клуб ${playerData.club.name}`}
          >
            <ClubBadge club={{ name: playerData.club.name, badgeId: 0, type: "open" }} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black uppercase text-white">
                {playerData.club.name}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {playerData.club.tag} · переглянути учасників
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        </section>
      )}

      <TrophyProgressSection />

      <BrawlerCollectionSection />

      <Suspense fallback={null}>
        <BattleLogSection />
      </Suspense>

      <section className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Цілі
          </p>
        </div>
        <GoalsList tag={playerData.tag} currentTrophies={playerData.trophies} />
      </section>

      <Suspense fallback={<CoachPanelSkeleton />}>
        <CoachPanel />
      </Suspense>

      {recentAdvices.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Library className="h-3.5 w-3.5 text-slate-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Останні поради
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#a78bfa] active:opacity-70"
              aria-label="Усі поради"
            >
              Усі поради
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <ul className="space-y-2">
            {recentAdvices.map((advice) => (
              <li key={advice.id}>
                <AdvicePreviewCard
                  advice={advice}
                  onOpen={() => updateUrl({ advice: advice.id })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {libraryOpen && (
        <Suspense fallback={null}>
          <AiHistoryView open={libraryOpen} onClose={() => setLibraryOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

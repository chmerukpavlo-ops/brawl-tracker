import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useUrlState } from "../hooks/useUrlState";
import { updateUrl } from "../navigation/urlState";
import { ACHIEVEMENTS_BY_ID } from "../data/achievements";
import { getPresetById } from "../data/aiPrompts";
import { useAiHistory } from "../hooks/useAiHistory";
import { useToast } from "../context/ToastContext";
import { useMountOnce } from "../hooks/useMountOnce";

// Every modal/sheet below is lazy-loaded — they're triggered by
// either a user gesture or a deep link, and their chunks shouldn't
// block first paint. `useMountOnce` keeps each sheet alive after
// first open so the internal `AnimatePresence` can play its exit.
const BrawlerDetailSheet = lazy(() => import("./BrawlerDetailSheet"));
const AchievementDetailSheet = lazy(() => import("./AchievementDetailSheet"));
const CompareSheet = lazy(() => import("./CompareSheet"));
const ClubSheet = lazy(() => import("./ClubSheet"));
const AdviceDetailSheet = lazy(() => import("./AdviceDetailSheet"));
const EditPinSheet = lazy(() => import("./EditPinSheet"));
const NotificationsConsent = lazy(() => import("./NotificationsConsent"));

const APP_TITLE = "Brawl Stats";

export default function DeepLinkController() {
  const urlState = useUrlState();
  const {
    activeTab,
    setActiveTab,
    playerData,
    handleQuery,
    isLoading,
    comparePlayer,
    compareWith,
    compareError,
    isComparing,
    swapWithCompare,
    setMyPlayer,
    fetchAiCoach,
    activeAiPreset,
    isAiLoading,
  } = usePlayer();
  const { showError } = useToast();

  // Sync URL tab → app state (e.g. on browser back/forward).
  // No `tab` param in URL is treated as "home".
  useEffect(() => {
    const target = urlState.tab ?? "home";
    if (target !== activeTab) {
      setActiveTab(target);
    }
  }, [urlState.tab, activeTab, setActiveTab]);

  // Sync URL tag → loaded player (e.g. on browser back/forward).
  //
  // Additional `lastFetchedTagRef` guard: defensively suppress a second
  // `handleQuery` call for the *same target tag*, even if the effect
  // re-fires for unrelated reasons (consumer re-render, parent state
  // tick, React Strict Mode double-invoke). Without it, an unstable
  // upstream dep used to cascade into ~10-80 redundant fetches/s.
  const lastFetchedTagRef = useRef<string | null>(null);
  useEffect(() => {
    if (!urlState.tag) {
      // URL no longer carries a tag → arm the ref for the next deep link.
      lastFetchedTagRef.current = null;
      return;
    }
    if (isLoading) return;
    const wanted = urlState.tag.toUpperCase();
    const current = playerData?.tag?.replace(/^#/, "").toUpperCase();
    if (wanted === current) {
      lastFetchedTagRef.current = wanted;
      return;
    }
    if (lastFetchedTagRef.current === wanted) return;
    lastFetchedTagRef.current = wanted;
    handleQuery(`#${wanted}`, { navigateHome: false });
  }, [urlState.tag, playerData?.tag, isLoading, handleQuery]);

  // Find brawler in player data for global sheet.
  const matchedBrawler = useMemo(() => {
    if (urlState.brawler === undefined || !playerData?.brawlers) return null;
    return (
      playerData.brawlers.find((b) => b.id === urlState.brawler) ?? null
    );
  }, [urlState.brawler, playerData?.brawlers]);

  // If URL targets a brawler that doesn't exist in player's collection, clean up.
  useEffect(() => {
    if (urlState.brawler === undefined) return;
    if (!playerData?.brawlers) return;
    if (!matchedBrawler) {
      updateUrl({ brawler: undefined }, { replace: true });
    }
  }, [urlState.brawler, playerData?.brawlers, matchedBrawler]);

  const matchedAchievement = useMemo(() => {
    if (!urlState.achievement) return null;
    return ACHIEVEMENTS_BY_ID[urlState.achievement] ?? null;
  }, [urlState.achievement]);

  // Strip unknown achievement param.
  useEffect(() => {
    if (urlState.achievement && !matchedAchievement) {
      updateUrl({ achievement: undefined }, { replace: true });
    }
  }, [urlState.achievement, matchedAchievement]);

  // Saved advice deep link.
  const { getAdvice } = useAiHistory();
  const matchedAdvice = useMemo(
    () => getAdvice(urlState.advice ?? null),
    [getAdvice, urlState.advice]
  );

  // Strip unknown advice param.
  useEffect(() => {
    if (urlState.advice && !matchedAdvice) {
      updateUrl({ advice: undefined }, { replace: true });
    }
  }, [urlState.advice, matchedAdvice]);

  // Compare deep-link: ?compare=TAG → load + open the global CompareSheet.
  const lastCompareLoadRef = useRef<string | null>(null);
  useEffect(() => {
    const wanted = urlState.compare;
    if (!wanted) {
      lastCompareLoadRef.current = null;
      return;
    }
    if (lastCompareLoadRef.current === wanted) return;
    const currentCompareTag = comparePlayer?.tag
      ?.replace(/^#/, "")
      .toUpperCase();
    if (currentCompareTag === wanted) {
      lastCompareLoadRef.current = wanted;
      return;
    }
    lastCompareLoadRef.current = wanted;
    compareWith(wanted, { silent: true }).then((ok) => {
      if (!ok) {
        showError("Не вдалося завантажити другого гравця");
        updateUrl({ compare: undefined }, { replace: true });
        lastCompareLoadRef.current = null;
      }
    });
  }, [urlState.compare, comparePlayer?.tag, compareWith, showError]);

  // Coach deep-link: ?coach=<presetId|open> → переключити на Stats і
  // запустити аналіз. Виконуємо рівно один раз на унікальний param.
  const lastCoachRef = useRef<string | null>(null);
  useEffect(() => {
    const wanted = urlState.coach;
    if (!wanted) {
      lastCoachRef.current = null;
      return;
    }
    if (!playerData) return;
    if (lastCoachRef.current === wanted) return;
    if (isAiLoading) return;
    // Якщо вже працюємо з цим preset — не запускати ще раз.
    if (activeAiPreset?.id === wanted) {
      lastCoachRef.current = wanted;
      return;
    }
    lastCoachRef.current = wanted;
    if (activeTab !== "stats") setActiveTab("stats");
    if (wanted === "open") {
      fetchAiCoach();
    } else {
      const preset = getPresetById(wanted);
      if (!preset) {
        updateUrl({ coach: undefined }, { replace: true });
        return;
      }
      if (preset.requiresBrawler) {
        // Без бравлера не можемо запустити — лишаємо badge активним,
        // а контекст відмовиться через showError("Спочатку обери бравлера").
        return;
      }
      fetchAiCoach({ presetId: preset.id });
    }
  }, [
    urlState.coach,
    playerData,
    isAiLoading,
    activeAiPreset?.id,
    activeTab,
    setActiveTab,
    fetchAiCoach,
  ]);

  const showCompareSheet = !!(
    urlState.compare &&
    playerData &&
    comparePlayer &&
    comparePlayer.tag.replace(/^#/, "").toUpperCase() === urlState.compare
  );

  const handleMakeMine = () => {
    if (!comparePlayer) return;
    setMyPlayer(comparePlayer.tag, comparePlayer.name);
    updateUrl(
      {
        tag: comparePlayer.tag.replace(/^#/, "").toUpperCase(),
        compare: undefined,
      },
      { replace: false }
    );
  };

  const handleReloadCompare = () => {
    if (!comparePlayer) return;
    compareWith(comparePlayer.tag, { silent: false });
  };

  // Document title sync.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (urlState.club) {
      document.title = `Клуб ${urlState.club} | ${APP_TITLE}`;
      return;
    }
    if (matchedBrawler && playerData) {
      document.title = `${matchedBrawler.name} — ${playerData.name} | ${APP_TITLE}`;
      return;
    }
    if (matchedAchievement) {
      document.title = `${matchedAchievement.title} | ${APP_TITLE}`;
      return;
    }
    if (playerData) {
      const prefix = activeTab === "stats" ? "Stats: " : "";
      document.title = `${prefix}${playerData.name} | ${APP_TITLE}`;
      return;
    }
    document.title = APP_TITLE;
  }, [playerData, activeTab, matchedBrawler, matchedAchievement, urlState.club]);

  const mountBrawler = useMountOnce(!!matchedBrawler);
  const mountAchievement = useMountOnce(!!matchedAchievement);
  const mountCompare = useMountOnce(showCompareSheet);
  const mountClub = useMountOnce(!!urlState.club);
  const mountAdvice = useMountOnce(!!matchedAdvice);
  const mountEditPin = useMountOnce(!!urlState.pin_edit);

  return (
    <>
      {mountBrawler && (
        <Suspense fallback={null}>
          <BrawlerDetailSheet
            brawler={matchedBrawler}
            player={playerData ?? undefined}
            onClose={() => updateUrl({ brawler: undefined })}
          />
        </Suspense>
      )}
      {mountAchievement && (
        <Suspense fallback={null}>
          <AchievementDetailSheet
            achievement={matchedAchievement}
            onClose={() => updateUrl({ achievement: undefined })}
          />
        </Suspense>
      )}
      {mountCompare && (
        <Suspense fallback={null}>
          <CompareSheet
            open={showCompareSheet}
            playerA={playerData ?? null}
            playerB={comparePlayer}
            onClose={() => updateUrl({ compare: undefined })}
            onSwap={swapWithCompare}
            onReload={handleReloadCompare}
            isComparing={isComparing}
            error={compareError}
            onMakeMine={handleMakeMine}
          />
        </Suspense>
      )}
      {mountClub && (
        <Suspense fallback={null}>
          <ClubSheet />
        </Suspense>
      )}
      {mountAdvice && (
        <Suspense fallback={null}>
          <AdviceDetailSheet
            advice={matchedAdvice}
            onClose={() => updateUrl({ advice: undefined })}
          />
        </Suspense>
      )}
      {mountEditPin && (
        <Suspense fallback={null}>
          <EditPinSheet
            tag={urlState.pin_edit ? `#${urlState.pin_edit}` : null}
            onClose={() => updateUrl({ pin_edit: undefined }, { replace: true })}
          />
        </Suspense>
      )}
      <GlobalNotificationsConsent />
    </>
  );
}

function GlobalNotificationsConsent() {
  const { notificationsConsent, closeNotificationsConsent } = usePlayer();
  const mount = useMountOnce(notificationsConsent.open);
  if (!mount) return null;
  return (
    <Suspense fallback={null}>
      <NotificationsConsent
        open={notificationsConsent.open}
        trigger={notificationsConsent.trigger}
        onClose={closeNotificationsConsent}
      />
    </Suspense>
  );
}

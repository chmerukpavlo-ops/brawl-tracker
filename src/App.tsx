import { type ReactNode, lazy, Suspense, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "./context/I18nContext";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";
import { PwaProvider } from "./context/PwaContext";
import { queryClient } from "./lib/queryClient";
import { useOnboarding } from "./hooks/useOnboarding";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { useHighContrast } from "./hooks/useHighContrast";
import { trackPageView } from "./lib/analytics";
import BottomTabBar from "./navigation/BottomTabBar";
import SwipeableScreens from "./navigation/SwipeableScreens";
import type { TabId } from "./navigation/types";
import ToastContainer from "./components/ToastContainer";
import TopProgressBar from "./components/TopProgressBar";
import DailyCheckinController from "./components/DailyCheckinController";
import GoalAchievementController from "./components/GoalAchievementController";
import AchievementController from "./components/AchievementController";
import DeepLinkController from "./components/DeepLinkController";
import InstallPrompt from "./components/InstallPrompt";
import UpdatePrompt from "./components/UpdatePrompt";
import OfflineIndicator from "./components/OfflineIndicator";
import HomeScreen from "./screens/HomeScreen";
import ScreenSkeleton from "./components/ui/ScreenSkeleton";
import ChunkLoadErrorBoundary from "./components/ui/ChunkLoadErrorBoundary";
import ErrorBoundary from "./components/ErrorBoundary";
import ConsentBanner from "./components/ConsentBanner";
import LiveRegions from "./components/a11y/LiveRegions";
import SkipLink from "./components/a11y/SkipLink";

// Only the *default* tab (Home) ships in the initial bundle. The
// other three are dynamic imports — each becomes its own chunk and
// loads on first tab activation.
const StatsScreen = lazy(() => import("./screens/StatsScreen"));
const LeadersScreen = lazy(() => import("./screens/LeadersScreen"));
const EncyclopediaScreen = lazy(() => import("./screens/EncyclopediaScreen"));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen"));

function LazyScreen({ children }: { children: ReactNode }) {
  return (
    <ChunkLoadErrorBoundary>
      <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>
    </ChunkLoadErrorBoundary>
  );
}

function AppShell() {
  const { activeTab, setActiveTab, isLoading, isAiLoading } = usePlayer();
  const onboarding = useOnboarding();

  // The hooks below have side-effects (set `<html data-*>` attributes)
  // — calling them once at the shell level is enough; their state
  // is read elsewhere via the same hooks.
  useReducedMotion();
  useHighContrast();

  // Emit a pageview every time the active tab changes. A SPA has no
  // real navigation event so analytics dashboards rely on us telling
  // them when "screens" change.
  useEffect(() => {
    trackPageView(`/tabs/${activeTab}`);
  }, [activeTab]);

  const screens: Record<TabId, ReactNode> = {
    home: <HomeScreen />,
    stats: (
      <LazyScreen>
        <StatsScreen />
      </LazyScreen>
    ),
    leaders: (
      <LazyScreen>
        <LeadersScreen />
      </LazyScreen>
    ),
    library: (
      <LazyScreen>
        <EncyclopediaScreen />
      </LazyScreen>
    ),
    settings: (
      <LazyScreen>
        <SettingsScreen />
      </LazyScreen>
    ),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e] font-sans text-slate-200">
      <SkipLink />
      <div className="relative mx-auto flex h-screen w-full max-w-[430px] flex-col">
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 overflow-hidden pb-20 pt-[env(safe-area-inset-top)] focus:outline-none"
        >
          <SwipeableScreens
            activeTab={activeTab}
            onTabChange={setActiveTab}
            screens={screens}
          />
        </main>

        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <ToastContainer />
        <TopProgressBar isActive={isLoading || isAiLoading} />
        <OfflineIndicator />
        <UpdatePrompt />
        <InstallPrompt />
        <DailyCheckinController />
        <GoalAchievementController />
        <AchievementController />
        <DeepLinkController />
      </div>

      <LiveRegions />

      {/* Lazy-loaded so the ~10 KB onboarding bundle only ships for the
          fraction of users that actually see the tour. */}
      <AnimatePresence>
        {onboarding.isVisible && (
          <ChunkLoadErrorBoundary>
            <Suspense fallback={null}>
              <OnboardingFlowLazy onComplete={onboarding.complete} />
            </Suspense>
          </ChunkLoadErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
}

const OnboardingFlowLazy = lazy(() => import("./components/onboarding/OnboardingFlow"));

export default function App() {
  return (
    <ErrorBoundary scope="root">
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider>
            <PwaProvider>
              <PlayerProvider>
                <AppShell />
                <ConsentBanner />
              </PlayerProvider>
            </PwaProvider>
          </ToastProvider>
        </I18nProvider>
        <ReactQueryDevtoolsLazy />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * Devtools are dev-only — the lazy import is replaced with a no-op in
 * production builds so nothing ships in the client bundle.
 */
const DevtoolsImpl = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : null;

function ReactQueryDevtoolsLazy() {
  if (!DevtoolsImpl) return null;
  return (
    <Suspense fallback={null}>
      <DevtoolsImpl initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import OnboardingHeader from "./OnboardingHeader";
import SwipeableSteps from "./SwipeableSteps";
import WelcomeStep from "./WelcomeStep";
import PreferencesStep from "./PreferencesStep";
import FeaturesStep from "./FeaturesStep";
import FindTagStep from "./FindTagStep";
import CompleteStep from "./CompleteStep";
import { useTranslation } from "../../hooks/useTranslation";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { track } from "../../lib/analytics";

interface OnboardingFlowProps {
  /** Mark onboarding done and dismiss the overlay. */
  onComplete: (opts?: { skipped?: boolean }) => void;
}

const TOTAL_STEPS = 5;

/**
 * Fullscreen onboarding overlay. Renders into a portal so it stays
 * above the BottomTabBar and PWA prompts regardless of the AppShell's
 * z-stacking. Body scroll is locked while visible.
 */
export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const reduceMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [loadedTag, setLoadedTag] = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState<string | undefined>(undefined);
  const [confirmSkip, setConfirmSkip] = useState(false);
  // Forms (find-tag step) shouldn't be swipe-dismissable — accidental
  // horizontal flicks while typing are a fast way to lose typed input.
  const swipeAllowed = step !== 3;
  const containerRef = useRef<HTMLDivElement>(null);
  // Funnel timing — we want to know how long users spend in the tour
  // and which step they bail on. The timer survives re-renders via ref.
  const startedAt = useRef<number>(Date.now());

  // Emit `onboarding_step` whenever `step` changes — including the
  // initial mount (step 0). Dashboard picks up the funnel without us
  // wiring per-step manual calls.
  useEffect(() => {
    track({
      name: "onboarding_step",
      properties: { step, total: TOTAL_STEPS },
    });
  }, [step]);

  // Lock body scroll while overlay is mounted.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ESC key prompts the skip confirmation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmSkip(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Move focus to the container on mount and after every step change
  // so screen readers announce the new step heading.
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const handleNavigate = useCallback(
    (next: number) => {
      setStep(Math.max(0, Math.min(next, TOTAL_STEPS - 1)));
    },
    []
  );

  const handleFindTagLoaded = useCallback(
    (info: { tag: string | null; playerName?: string }) => {
      setLoadedTag(info.tag);
      setLoadedName(info.playerName);
      goNext();
    },
    [goNext]
  );

  const handleHeaderSkip = useCallback(() => {
    setConfirmSkip(true);
  }, []);

  if (typeof document === "undefined") return null;

  const overlay = (
    <motion.div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.welcome.title")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.25 }}
      className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e] text-slate-200 outline-none"
    >
      <OnboardingHeader
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onSkip={handleHeaderSkip}
      />

      {/* Width-constrain identical to AppShell so layout matches. */}
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        <SwipeableSteps
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          onNavigate={handleNavigate}
          allowSwipe={swipeAllowed}
        >
          <WelcomeStep onNext={goNext} />
          <PreferencesStep onNext={goNext} />
          <FeaturesStep onNext={goNext} />
          <FindTagStep onLoaded={handleFindTagLoaded} onSkip={goNext} />
          <CompleteStep
            loadedTag={loadedTag}
            playerName={loadedName}
            onFinish={() => {
              track({
                name: "onboarding_complete",
                properties: {
                  skipped: false,
                  duration_ms: Date.now() - startedAt.current,
                },
              });
              onComplete();
            }}
          />
        </SwipeableSteps>
      </div>

      <AnimatePresence>
        {confirmSkip && (
          <SkipConfirmDialog
            onConfirm={() => {
              setConfirmSkip(false);
              track({
                name: "onboarding_skip",
                properties: { at_step: step },
              });
              track({
                name: "onboarding_complete",
                properties: {
                  skipped: true,
                  duration_ms: Date.now() - startedAt.current,
                },
              });
              onComplete({ skipped: true });
            }}
            onCancel={() => setConfirmSkip(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(overlay, document.body);
}

interface SkipConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function SkipConfirmDialog({ onConfirm, onCancel }: SkipConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="absolute left-1/2 top-1/2 z-20 w-[88vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#2a1a4a] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.5)]"
      >
        <h2 className="text-[15px] font-black uppercase tracking-tight text-white">
          {t("onboarding.skipConfirmTitle")}
        </h2>
        <p className="mt-2 text-[12px] leading-snug text-slate-300">
          {t("onboarding.skipConfirmBody")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex w-full min-h-[44px] items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-[11.5px] font-black uppercase tracking-wider text-rose-200 active:scale-95"
          >
            {t("onboarding.skipConfirmYes")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#facc15] text-[11.5px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95"
          >
            {t("onboarding.skipConfirmNo")}
          </button>
        </div>
      </motion.div>
    </>
  );
}

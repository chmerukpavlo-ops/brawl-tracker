import { X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { haptic } from "../../hooks/useHaptic";

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  onSkip: () => void;
}

/**
 * Top bar of the onboarding flow — a compact dot progress indicator on
 * the left and a Skip link on the right. Dots fill in (yellow) as the
 * user advances; current step is enlarged for a clearer signal.
 */
export default function OnboardingHeader({
  currentStep,
  totalSteps,
  onSkip,
}: OnboardingHeaderProps) {
  const { t } = useTranslation();

  const handleSkip = () => {
    haptic.light();
    onSkip();
  };

  return (
    <header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className="relative z-10 flex items-center justify-between px-5 pb-3 pt-3"
    >
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep + 1}
        aria-label={t("onboarding.stepLabel", {
          current: currentStep + 1,
          total: totalSteps,
        })}
        className="flex items-center gap-1.5"
      >
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isCurrent
                  ? "w-7 bg-[#facc15] shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                  : isDone
                  ? "w-2 bg-[#facc15]/70"
                  : "w-2 bg-white/15"
              }`}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 active:opacity-70"
      >
        <span>{t("onboarding.skip")}</span>
        <X className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}

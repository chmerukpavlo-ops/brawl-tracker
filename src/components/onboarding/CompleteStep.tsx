import { motion } from "motion/react";
import { Bot, Check, Pin, Target } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { usePlayer } from "../../context/PlayerContext";
import { haptic } from "../../hooks/useHaptic";

interface CompleteStepProps {
  /** Tag of the player loaded during step 4, or null if skipped. */
  loadedTag: string | null;
  /** Player name resolved during step 4, for nicer copy. */
  playerName?: string;
  onFinish: () => void;
}

/**
 * Final step — celebratory checkmark + quick-action buttons that route
 * the user to the most likely "first interesting thing" depending on
 * whether a tag was loaded earlier.
 */
export default function CompleteStep({
  loadedTag,
  playerName,
  onFinish,
}: CompleteStepProps) {
  const { t } = useTranslation();
  const { addFavorite, setActiveTab, isFavorite, playerData } = usePlayer();

  const subtitle = playerName
    ? t("onboarding.complete.subtitleWithPlayer", { name: playerName })
    : t("onboarding.complete.subtitleGeneric");

  const handlePin = () => {
    if (!loadedTag) return;
    haptic.medium();
    const result = addFavorite(loadedTag, {
      originalName: playerName,
      lastTrophies: playerData?.trophies,
    });
    if (result.added) haptic.success();
  };

  const handleViewGoals = () => {
    haptic.light();
    setActiveTab("settings");
  };

  const handleOpenAi = () => {
    haptic.light();
    setActiveTab("stats");
  };

  const finish = () => {
    haptic.success();
    onFinish();
  };

  const alreadyPinned = loadedTag ? isFavorite(loadedTag) : false;

  return (
    <div className="flex h-full flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative mt-6"
      >
        <div className="absolute -inset-6 rounded-full bg-emerald-400/20 blur-3xl" />
        <motion.div
          initial={{ rotate: -45, scale: 0.4 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 360, damping: 18 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-[26px] border border-emerald-400/50 bg-gradient-to-br from-emerald-500/30 to-emerald-700/15 shadow-[0_0_32px_rgba(74,222,128,0.45)]"
        >
          <Check
            className="h-12 w-12 text-emerald-200"
            strokeWidth={3.5}
          />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-6 text-2xl font-black uppercase tracking-tight text-white"
      >
        {t("onboarding.complete.title")}
      </motion.h1>

      <motion.p
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.32 }}
        className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-slate-300"
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.42 }}
        className="mt-8 w-full max-w-[300px] space-y-2"
      >
        {loadedTag && (
          <button
            type="button"
            onClick={handlePin}
            disabled={alreadyPinned}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 text-[11.5px] font-black uppercase tracking-wider text-[#facc15] active:scale-95 disabled:opacity-50"
          >
            <Pin className="h-4 w-4" />
            {alreadyPinned ? t("pinned.pinned") : t("onboarding.complete.actionPin")}
          </button>
        )}
        <button
          type="button"
          onClick={handleOpenAi}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/10 text-[11.5px] font-black uppercase tracking-wider text-fuchsia-200 active:scale-95"
        >
          <Bot className="h-4 w-4" />
          {t("onboarding.complete.actionAi")}
        </button>
        <button
          type="button"
          onClick={handleViewGoals}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-[11.5px] font-black uppercase tracking-wider text-emerald-200 active:scale-95"
        >
          <Target className="h-4 w-4" />
          {t("onboarding.complete.actionGoals")}
        </button>
      </motion.div>

      <motion.button
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55 }}
        type="button"
        onClick={finish}
        className="mt-auto inline-flex min-h-[52px] w-full max-w-[300px] items-center justify-center rounded-2xl bg-[#facc15] text-[13px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_24px_rgba(250,204,21,0.4)] active:scale-95"
      >
        {t("onboarding.complete.finish")}
      </motion.button>
    </div>
  );
}

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Share2 } from "lucide-react";
import { TIER_COLOR, type AchievementDef } from "../data/achievements";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { shareData } from "../utils/share";
import { shareAchievementPreset } from "../utils/sharePresets";
import { haptic } from "../hooks/useHaptic";

interface AchievementUnlockToastProps {
  key?: React.Key;
  achievement: AchievementDef;
  onDismiss: () => void;
  onTap?: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION = 5000;

export default function AchievementUnlockToast({
  achievement,
  onDismiss,
  onTap,
  durationMs = DEFAULT_DURATION,
}: AchievementUnlockToastProps) {
  const reduced = usePrefersReducedMotion();
  const tier = TIER_COLOR[achievement.tier];
  const isDiamond = achievement.tier === "diamond";

  // Hold the latest `onDismiss` in a ref so the auto-dismiss timer
  // below can fire it without listing it as a dep. Otherwise an
  // unstable parent (e.g. an inline arrow) would clear + reschedule
  // the timer on every render and the toast would never auto-close.
  // The ref also makes the component immune to future regressions
  // from callers that forget to memoize their callbacks.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const t = window.setTimeout(() => onDismissRef.current(), durationMs);
    return () => window.clearTimeout(t);
  }, [achievement.id, durationMs]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.92 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.92 }}
      transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 28 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${tier.border} ${tier.bg} ${tier.glow} backdrop-blur-xl`}
    >
      {isDiamond && !reduced && (
        <motion.span
          aria-hidden
          initial={{ backgroundPosition: "0% 50%" }}
          animate={{ backgroundPosition: "200% 50%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(185,242,255,0.4)_50%,transparent_100%)] bg-[length:200%_200%]"
        />
      )}

      <div className="relative flex w-full items-center gap-3 px-4 py-3 text-left">
        <button
          type="button"
          onClick={() => {
            onTap?.();
            onDismiss();
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <motion.div
            aria-hidden
            initial={reduced ? undefined : { rotate: -12, scale: 0.7 }}
            animate={reduced ? undefined : { rotate: [-12, 8, 0], scale: [0.7, 1.15, 1] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-2 ${tier.bg} ring-white/15 text-2xl`}
          >
            {achievement.icon}
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${tier.text}`}>
              🏆 Досягнення · {tier.label}
            </p>
            <p className="truncate text-sm font-black uppercase text-white">
              {achievement.title}
            </p>
            {achievement.xpReward !== undefined && (
              <p className="text-[11px] font-bold text-[#facc15]">
                +{achievement.xpReward} XP
              </p>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            haptic.light();
            await shareData(shareAchievementPreset(achievement));
          }}
          aria-label={`Поділитися досягненням ${achievement.title}`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 ${tier.bg} text-slate-100 active:scale-95`}
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {isDiamond && !reduced && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={{ opacity: 0, y: 10, x: Math.random() * 30 - 15 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-10, -40],
              }}
              transition={{
                duration: 1.4,
                delay: i * 0.12,
                repeat: Infinity,
              }}
              style={{ left: `${10 + i * 11}%`, fontSize: 12 }}
              className="pointer-events-none absolute top-1/2"
            >
              ✨
            </motion.span>
          ))}
        </>
      )}
    </motion.div>
  );
}

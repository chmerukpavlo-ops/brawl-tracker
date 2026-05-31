import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { useDailyCheckin } from "../hooks/useDailyCheckin";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import AnimatedCounter from "./AnimatedCounter";

interface StreakBadgeProps {
  variant?: "compact" | "full";
  onClick?: () => void;
}

const STATUS_COLOR: Record<string, { text: string; ring: string; bg: string }> = {
  active: { text: "text-[#fb923c]", ring: "ring-[#fb923c]/40", bg: "bg-[#fb923c]/10" },
  at_risk: { text: "text-[#facc15]", ring: "ring-[#facc15]/40", bg: "bg-[#facc15]/10" },
  broken: { text: "text-slate-500", ring: "ring-slate-500/30", bg: "bg-slate-500/10" },
  new: { text: "text-slate-400", ring: "ring-white/10", bg: "bg-white/5" },
};

export default function StreakBadge({ variant = "compact", onClick }: StreakBadgeProps) {
  const { state, status, nextMilestone, daysUntilNextMilestone } = useDailyCheckin();
  const reduced = usePrefersReducedMotion();
  const palette = STATUS_COLOR[status];
  const flameAnim = !reduced && status === "active";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Streak: ${state.currentStreak} днів`}
        className={`flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/10 px-3 ${palette.bg} ring-1 ${palette.ring} active:scale-95`}
      >
        <motion.span
          animate={flameAnim ? { scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className={`flex items-center justify-center ${palette.text}`}
        >
          <Flame className="h-4 w-4" fill={status === "active" ? "currentColor" : "none"} />
        </motion.span>
        <span className={`text-xs font-black ${palette.text}`}>
          {state.currentStreak}
        </span>
      </button>
    );
  }

  const progress =
    nextMilestone && daysUntilNextMilestone !== null
      ? Math.max(
          0,
          Math.min(
            100,
            ((nextMilestone.days - daysUntilNextMilestone) / nextMilestone.days) * 100
          )
        )
      : status === "active"
        ? 100
        : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-5">
      <div className="flex items-center gap-4">
        <motion.div
          animate={flameAnim ? { scale: [1, 1.06, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${palette.bg} ring-1 ${palette.ring}`}
        >
          {flameAnim && (
            <span className="absolute inset-0 -z-0 rounded-2xl bg-[#fb923c]/30 blur-xl" aria-hidden />
          )}
          <Flame
            className={`relative h-8 w-8 ${palette.text}`}
            fill={status === "active" ? "currentColor" : "none"}
          />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Streak
          </p>
          <div className="flex items-baseline gap-1.5">
            <AnimatedCounter
              value={state.currentStreak}
              className={`text-3xl font-black ${palette.text}`}
            />
            <span className="text-xs font-bold text-slate-500">
              {state.currentStreak === 1 ? "день" : "днів підряд"}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Найдовший: <span className="font-black text-white">{state.longestStreak}</span>
            {" · "}
            Total XP: <span className="font-black text-[#facc15]">{state.totalXp.toLocaleString("uk-UA")}</span>
          </p>
        </div>
      </div>

      {nextMilestone && daysUntilNextMilestone !== null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-500">До наступного</span>
            <span className="text-slate-300">
              {nextMilestone.emoji} {nextMilestone.reward}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[#fb923c] to-[#facc15]"
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            Ще {daysUntilNextMilestone}{" "}
            {daysUntilNextMilestone === 1 ? "день" : "днів"} до бонусу{" "}
            <span className="font-black text-[#facc15]">+{nextMilestone.xp} XP</span>
          </p>
        </div>
      )}
    </div>
  );
}

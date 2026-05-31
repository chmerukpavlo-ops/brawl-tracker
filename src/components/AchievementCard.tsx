import React from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import {
  CATEGORY_LABEL,
  TIER_COLOR,
  type AchievementDef,
} from "../data/achievements";

interface AchievementCardProps {
  key?: React.Key;
  achievement: AchievementDef;
  isUnlocked: boolean;
  progress?: { current: number; target: number; percentage: number };
  onTap?: () => void;
}

export default function AchievementCard({
  achievement,
  isUnlocked,
  progress,
  onTap,
}: AchievementCardProps) {
  const tierStyle = TIER_COLOR[achievement.tier];
  const hidden = achievement.secret && !isUnlocked;
  const showProgress = !isUnlocked && progress && progress.current > 0 && !hidden;

  return (
    <button
      type="button"
      onClick={onTap}
      data-no-swipe="true"
      className={`relative w-full overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[0.99] ${
        isUnlocked
          ? `${tierStyle.border} ${tierStyle.bg} ${tierStyle.glow}`
          : "border-white/10 bg-[#2a1a4a]/70 opacity-80"
      }`}
    >
      {achievement.tier === "diamond" && isUnlocked && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.25 }}
          animate={{
            opacity: [0.25, 0.45, 0.25],
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute inset-0 -z-0 bg-[linear-gradient(120deg,rgba(185,242,255,0)_0%,rgba(185,242,255,0.35)_50%,rgba(185,242,255,0)_100%)] bg-[length:200%_200%]"
        />
      )}

      <div className="relative flex items-start gap-3">
        <div
          aria-hidden
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ring-1 ${
            isUnlocked
              ? `${tierStyle.bg} ring-white/10`
              : "bg-[#1a0a2e] ring-white/5 grayscale opacity-60"
          }`}
        >
          {hidden ? <span>❓</span> : <span>{achievement.icon}</span>}
          {!isUnlocked && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a0a2e] ring-1 ring-white/10">
              <Lock className="h-3 w-3 text-slate-400" strokeWidth={2.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p
              className={`truncate text-sm font-black uppercase ${
                isUnlocked ? "text-white" : "text-slate-300"
              }`}
            >
              {hidden ? "Прихована" : achievement.title}
            </p>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${tierStyle.bg} ${tierStyle.text}`}
            >
              {tierStyle.label}
            </span>
          </div>
          <p
            className={`mt-0.5 line-clamp-2 text-[11px] ${
              isUnlocked ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {hidden ? "???" : achievement.description}
          </p>

          {showProgress && progress && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316]"
                />
              </div>
              <p className="mt-1 text-[10px] font-bold tabular-nums text-slate-500">
                {progress.current} / {progress.target}
              </p>
            </div>
          )}

          {!isUnlocked && !showProgress && (
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {CATEGORY_LABEL[achievement.category]}
              {achievement.xpReward && ` · +${achievement.xpReward} XP`}
            </p>
          )}

          {isUnlocked && (
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Розблоковано
              {achievement.xpReward && ` · +${achievement.xpReward} XP`}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

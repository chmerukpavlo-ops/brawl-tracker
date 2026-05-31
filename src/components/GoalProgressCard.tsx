import { useState, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Flag, Sparkles, Target, Trash2 } from "lucide-react";
import type { TrophyGoal } from "../types";
import { getProgress } from "../hooks/useGoals";

interface GoalProgressCardProps {
  goal: TrophyGoal;
  currentTrophies: number;
  variant?: "full" | "compact";
  onTap?: () => void;
  onDelete?: () => void;
  highlightAchieved?: boolean;
}

function formatNumber(value: number): string {
  return value.toLocaleString("uk-UA");
}

export default function GoalProgressCard({
  goal,
  currentTrophies,
  variant = "full",
  onTap,
  onDelete,
  highlightAchieved = false,
}: GoalProgressCardProps) {
  const { remaining, percentage, isAchieved } = getProgress(goal, currentTrophies);
  const [menuOpen, setMenuOpen] = useState(false);
  const showGlow = percentage > 80 || isAchieved;
  const title =
    goal.label || (goal.type === "auto" ? "Наступний milestone" : "Власна ціль");

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#2a1a4a] px-3 py-2 text-left active:scale-[0.98]"
      >
        <Target className="h-3.5 w-3.5 shrink-0 text-[#facc15]" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span className="truncate text-slate-300">{title}</span>
            <span className="shrink-0 text-[#facc15]">
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316]"
            />
          </div>
          <p className="mt-1 text-[10px] font-bold text-slate-500">
            {isAchieved
              ? "Досягнуто"
              : `Ще ${formatNumber(remaining)} до ${formatNumber(goal.targetTrophies)}`}
          </p>
        </div>
      </button>
    );
  }

  const handleMenuToggle = (e: MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete?.();
  };

  const cardClasses = isAchieved
    ? "border-[#22c55e]/40 bg-[#22c55e]/5"
    : highlightAchieved && percentage >= 100
      ? "border-[#facc15]/40 bg-[#facc15]/5"
      : "border-white/10 bg-[#2a1a4a]";

  return (
    <div
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : -1}
      onClick={onTap}
      onKeyDown={(e) => {
        if (onTap && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onTap();
        }
      }}
      className={`relative rounded-2xl border p-4 transition-transform ${cardClasses} ${onTap ? "active:scale-[0.99] cursor-pointer" : ""}`}
    >
      <div className="mb-3 flex items-start gap-2">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
            isAchieved
              ? "bg-[#22c55e]/15 ring-[#22c55e]/40 text-[#22c55e]"
              : "bg-[#facc15]/10 ring-[#facc15]/30 text-[#facc15]"
          }`}
        >
          {isAchieved ? <Check className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {goal.type === "auto" ? "Автоматична ціль" : "Власна ціль"}
            {isAchieved && " · Досягнуто"}
          </p>
          <p className="truncate text-sm font-black uppercase text-white">
            {title}
          </p>
          {goal.reward && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-bold text-slate-400">
              <Sparkles className="h-3 w-3 shrink-0 text-[#facc15]" />
              {goal.reward}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <span
            className={`text-2xl font-black tabular-nums ${
              isAchieved ? "text-[#22c55e]" : "text-[#facc15]"
            }`}
          >
            {percentage.toFixed(0)}
          </span>
          <span className="text-[10px] font-bold text-slate-500">%</span>
        </div>
        {onDelete && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleMenuToggle}
              aria-label="Меню цілі"
              aria-expanded={menuOpen}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 active:bg-white/5 active:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    aria-hidden
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-40 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#1a0a2e] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  >
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full min-h-[40px] items-center gap-2 px-3 text-xs font-bold text-rose-300 active:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Видалити ціль
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div
        className={`h-3 overflow-hidden rounded-full bg-white/5 ${
          showGlow ? "shadow-[0_0_16px_rgba(250,204,21,0.4)]" : ""
        }`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${
            isAchieved
              ? "bg-gradient-to-r from-[#22c55e] to-[#4ade80]"
              : "bg-gradient-to-r from-[#facc15] to-[#f97316]"
          }`}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
        <span className="tabular-nums text-slate-300">
          <span className="text-white">{formatNumber(currentTrophies)}</span>
          <span className="text-slate-600"> / </span>
          <span className="text-slate-400">{formatNumber(goal.targetTrophies)}</span>
          <span className="text-slate-600"> 🏆</span>
        </span>
        <span className={`tabular-nums ${isAchieved ? "text-[#22c55e]" : "text-[#facc15]"}`}>
          {isAchieved
            ? "Готово!"
            : `Залишилось ${formatNumber(remaining)}`}
        </span>
      </div>
    </div>
  );
}

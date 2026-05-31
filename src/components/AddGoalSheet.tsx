import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Target } from "lucide-react";
import BottomSheet from "./BottomSheet";
import GoalProgressCard from "./GoalProgressCard";
import {
  GOALS_LIMIT,
  getNextAutoMilestone,
  useGoals,
} from "../hooks/useGoals";
import type { TrophyGoal } from "../types";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";

interface AddGoalSheetProps {
  open: boolean;
  onClose: () => void;
  tag: string;
  currentTrophies: number;
}

const LABEL_MAX = 30;
const REWARD_MAX = 100;
const MAX_TROPHIES = 999_999;

type TabId = "quick" | "custom";

function buildSuggestions(currentTrophies: number): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  let next = getNextAutoMilestone(currentTrophies);
  for (let i = 0; i < 4 && next <= MAX_TROPHIES; i++) {
    if (!seen.has(next)) {
      seen.add(next);
      result.push(next);
    }
    next = getNextAutoMilestone(next);
  }
  for (const big of [50_000, 100_000, 200_000]) {
    if (big > currentTrophies && !seen.has(big)) {
      seen.add(big);
      result.push(big);
    }
  }
  return result.sort((a, b) => a - b).slice(0, 6);
}

export default function AddGoalSheet({
  open,
  onClose,
  tag,
  currentTrophies,
}: AddGoalSheetProps) {
  const { goals, addGoal } = useGoals();
  const { showSuccess, showError, showInfo } = useToast();

  const [tab, setTab] = useState<TabId>("quick");
  const [customTarget, setCustomTarget] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [reward, setReward] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTab("quick");
    setCustomTarget(String(getNextAutoMilestone(currentTrophies)));
    setLabel("");
    setReward("");
  }, [open, currentTrophies]);

  const activeTargetsForTag = useMemo(() => {
    const normalizedTag = tag.replace(/^#+/, "").toUpperCase();
    return new Set(
      goals
        .filter(
          (g) =>
            !g.achievedAt &&
            g.tag.replace(/^#+/, "").toUpperCase() === normalizedTag
        )
        .map((g) => g.targetTrophies)
    );
  }, [goals, tag]);

  const suggestions = useMemo(
    () => buildSuggestions(currentTrophies),
    [currentTrophies]
  );

  const parsedCustom = Number.parseInt(customTarget, 10);
  const customValid =
    Number.isFinite(parsedCustom) &&
    parsedCustom > 0 &&
    parsedCustom <= MAX_TROPHIES;
  const customAlreadyActive =
    customValid && activeTargetsForTag.has(parsedCustom);

  const previewGoal: TrophyGoal | null = useMemo(() => {
    const target = tab === "quick" ? null : customValid ? parsedCustom : null;
    if (!target) return null;
    return {
      id: "preview",
      tag,
      targetTrophies: target,
      createdAt: Date.now(),
      startTrophies: currentTrophies,
      type: "custom",
      label: label.trim() || undefined,
      reward: reward.trim() || undefined,
    };
  }, [tab, customValid, parsedCustom, tag, currentTrophies, label, reward]);

  const handleQuick = (target: number) => {
    if (activeTargetsForTag.has(target)) {
      showInfo("Така ціль вже активна");
      return;
    }
    const result = addGoal({
      tag,
      targetTrophies: target,
      startTrophies: currentTrophies,
      type: "custom",
    });
    if (result.limitReached) {
      showError(`Ліміт ${GOALS_LIMIT} цілей досягнуто`);
      return;
    }
    if (result.duplicate) {
      showInfo("Така ціль вже активна");
      return;
    }
    haptic.success();
    showSuccess(`Ціль ${target.toLocaleString("uk-UA")} створена`);
    onClose();
  };

  const handleCreateCustom = () => {
    if (!customValid) {
      showError("Невірне значення цілі");
      return;
    }
    if (customAlreadyActive) {
      showInfo("Така ціль вже активна");
      return;
    }
    const result = addGoal({
      tag,
      targetTrophies: parsedCustom,
      startTrophies: currentTrophies,
      type: "custom",
      label: label.trim() || undefined,
      reward: reward.trim() || undefined,
    });
    if (result.limitReached) {
      showError(`Ліміт ${GOALS_LIMIT} цілей досягнуто`);
      return;
    }
    if (result.duplicate) {
      showInfo("Така ціль вже активна");
      return;
    }
    haptic.success();
    showSuccess("Ціль створена");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Поставити ціль">
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Тип цілі"
          className="grid grid-cols-2 gap-0.5 rounded-xl bg-[#1a0a2e] p-1"
        >
          <button
            role="tab"
            aria-selected={tab === "quick"}
            onClick={() => setTab("quick")}
            className={`min-h-[40px] rounded-lg text-xs font-black uppercase transition-colors ${
              tab === "quick" ? "bg-[#facc15] text-[#1a0a2e]" : "text-slate-400"
            }`}
          >
            Швидкі
          </button>
          <button
            role="tab"
            aria-selected={tab === "custom"}
            onClick={() => setTab("custom")}
            className={`min-h-[40px] rounded-lg text-xs font-black uppercase transition-colors ${
              tab === "custom" ? "bg-[#7c3aed] text-white" : "text-slate-400"
            }`}
          >
            Кастомна
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "quick" ? (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="space-y-2"
            >
              <p className="text-xs text-slate-400">
                Вибери одну з найближчих milestones — застосунок одразу почне
                рахувати прогрес.
              </p>
              <ul className="space-y-2">
                {suggestions.map((target) => {
                  const active = activeTargetsForTag.has(target);
                  const remaining = Math.max(0, target - currentTrophies);
                  return (
                    <li key={target}>
                      <button
                        type="button"
                        disabled={active}
                        onClick={() => handleQuick(target)}
                        className={`flex w-full min-h-[56px] items-center gap-3 rounded-2xl border px-4 text-left transition-transform active:scale-[0.99] ${
                          active
                            ? "border-[#22c55e]/30 bg-[#22c55e]/5 opacity-70"
                            : "border-white/10 bg-[#1a0a2e] active:border-[#facc15]/40"
                        }`}
                      >
                        <Target
                          className={`h-5 w-5 shrink-0 ${
                            active ? "text-[#22c55e]" : "text-[#facc15]"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-white">
                            {target.toLocaleString("uk-UA")} 🏆
                          </p>
                          <p className="text-[11px] font-bold text-slate-500">
                            Ще {remaining.toLocaleString("uk-UA")}
                          </p>
                        </div>
                        {active && (
                          <span className="flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-black uppercase text-[#22c55e]">
                            <Check className="h-3 w-3" />
                            Активна
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Цільові кубки
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customTarget}
                  onChange={(e) =>
                    setCustomTarget(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))
                  }
                  min={1}
                  max={MAX_TROPHIES}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1a0a2e] px-3 text-base font-black tabular-nums text-white outline-none focus:border-[#facc15]/50"
                />
                <span className="text-[10px] text-slate-500">
                  Поточні: {currentTrophies.toLocaleString("uk-UA")} · max{" "}
                  {MAX_TROPHIES.toLocaleString("uk-UA")}
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Назва (опційно)
                </span>
                <input
                  type="text"
                  value={label}
                  maxLength={LABEL_MAX}
                  placeholder="Топ-1000 області"
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#facc15]/50"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Винагорода / мотивація (опційно)
                </span>
                <textarea
                  value={reward}
                  maxLength={REWARD_MAX}
                  rows={2}
                  placeholder="Купити Hypercharge"
                  onChange={(e) => setReward(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2 text-sm text-white outline-none focus:border-[#facc15]/50"
                />
              </label>

              {previewGoal && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Прев'ю
                  </p>
                  <GoalProgressCard
                    goal={previewGoal}
                    currentTrophies={currentTrophies}
                    variant="compact"
                  />
                </div>
              )}

              {customAlreadyActive && (
                <p className="text-[11px] font-bold text-[#facc15]">
                  Така ціль вже активна — обери інше число.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-300 active:scale-95"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  disabled={!customValid || customAlreadyActive}
                  className="min-h-[48px] flex-[1.6] rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95 disabled:opacity-50"
                >
                  Створити ціль
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

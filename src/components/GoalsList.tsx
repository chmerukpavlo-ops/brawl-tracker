import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Plus, Target, Trophy } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useGoals } from "../hooks/useGoals";
import { haptic } from "../hooks/useHaptic";
import GoalProgressCard from "./GoalProgressCard";
import AddGoalSheet from "./AddGoalSheet";
import EmptyState from "./EmptyState";
import BrawlerIllustration from "./illustrations/BrawlerIllustration";

interface GoalsListProps {
  tag: string;
  currentTrophies: number;
}

type TabId = "active" | "achieved";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" });
}

export default function GoalsList({ tag, currentTrophies }: GoalsListProps) {
  const { activeGoals, achievedGoals, removeGoal } = useGoals();
  const { showInfo } = useToast();
  const { playerData } = usePlayer();
  const [tab, setTab] = useState<TabId>("active");
  const [sheetOpen, setSheetOpen] = useState(false);

  const active = useMemo(() => activeGoals(tag), [activeGoals, tag]);
  const achieved = useMemo(() => achievedGoals(tag), [achievedGoals, tag]);
  const list = tab === "active" ? active : achieved;
  const showFor = playerData?.tag === tag ? currentTrophies : currentTrophies;

  const handleDelete = (id: string) => {
    removeGoal(id);
    haptic.light();
    showInfo("Ціль видалена");
  };

  return (
    <>
      <div className="space-y-3">
        <LayoutGroup>
          <div
            role="tablist"
            aria-label="Цілі"
            className="flex items-center gap-0.5 rounded-xl bg-[#1a0a2e] p-1"
          >
            {(
              [
                { id: "active" as const, label: "Активні", count: active.length },
                { id: "achieved" as const, label: "Досягнуті", count: achieved.length },
              ]
            ).map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t.id)}
                  className={`relative flex-1 min-h-[40px] rounded-lg text-xs font-black uppercase transition-colors ${
                    isActive ? "text-[#1a0a2e]" : "text-slate-400"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="goals-tab-pill"
                      className="absolute inset-0 -z-0 rounded-lg bg-[#facc15]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">
                    {t.label}
                    {t.count > 0 && (
                      <span className={`ml-1.5 text-[10px] font-bold ${isActive ? "text-[#1a0a2e]/70" : "text-slate-500"}`}>
                        {t.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <AnimatePresence mode="popLayout" initial={false}>
          {list.length === 0 ? (
            <motion.div
              key={`empty-${tab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tab === "active" ? (
                <EmptyState
                  illustration={<BrawlerIllustration variant="empty" />}
                  title="Поки немає активних цілей"
                  description="Постав ціль і відстежуй, скільки кубків залишилось до досягнення."
                  action={{ label: "Додати ціль", onClick: () => setSheetOpen(true) }}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-[#2a1a4a]/40 px-4 py-3">
                  <Trophy className="h-5 w-5 shrink-0 text-slate-600" strokeWidth={1.5} />
                  <p className="text-xs text-slate-500">
                    Поки що жодну ціль не досягнуто.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.ul
              key={`list-${tab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {list.map((goal) => (
                <motion.li
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.22 }}
                >
                  {tab === "active" ? (
                    <GoalProgressCard
                      goal={goal}
                      currentTrophies={showFor}
                      onDelete={() => handleDelete(goal.id)}
                    />
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a0a2e]/40 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/15 ring-1 ring-[#22c55e]/30">
                        <Trophy className="h-4 w-4 text-[#22c55e]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black uppercase text-white">
                          {goal.label || `${goal.targetTrophies.toLocaleString("uk-UA")} 🏆`}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {goal.achievedAt ? formatDate(goal.achievedAt) : "—"}
                          {goal.type === "auto" && " · Авто"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(goal.id)}
                        className="text-[10px] font-bold uppercase text-slate-500 active:text-rose-300"
                      >
                        Видалити
                      </button>
                    </div>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-300 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <Target className="h-3.5 w-3.5" />
          Додати ціль
        </button>
      </div>

      <AddGoalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tag={tag}
        currentTrophies={currentTrophies}
      />
    </>
  );
}

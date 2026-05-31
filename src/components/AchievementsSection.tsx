import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy } from "lucide-react";
import {
  CATEGORY_LABEL,
  type AchievementCategory,
  type AchievementDef,
} from "../data/achievements";
import { useAchievements } from "../hooks/useAchievements";
import AchievementCard from "./AchievementCard";
import DonutChart from "./DonutChart";
import EmptyState from "./EmptyState";
import BrawlerIllustration from "./illustrations/BrawlerIllustration";
import { updateUrl } from "../navigation/urlState";

type FilterId = "all" | "unlocked" | "in_progress" | AchievementCategory;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Усі" },
  { id: "unlocked", label: "Розблоковані" },
  { id: "in_progress", label: "Активні" },
  { id: "exploration", label: CATEGORY_LABEL.exploration },
  { id: "mastery", label: CATEGORY_LABEL.mastery },
  { id: "collection", label: CATEGORY_LABEL.collection },
  { id: "streak", label: CATEGORY_LABEL.streak },
  { id: "special", label: CATEGORY_LABEL.special },
];

export default function AchievementsSection() {
  const { allAchievements, isUnlocked, getProgress, state, unlockedAchievements } =
    useAchievements();
  const [filter, setFilter] = useState<FilterId>("all");
  const openDetail = (a: AchievementDef) => updateUrl({ achievement: a.id });

  const total = allAchievements.length;
  const unlocked = unlockedAchievements.length;
  const percentage = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  const filtered = useMemo(() => {
    const list = allAchievements.filter((a) => {
      if (filter === "all") return true;
      if (filter === "unlocked") return isUnlocked(a.id);
      if (filter === "in_progress") {
        if (isUnlocked(a.id)) return false;
        const p = state.progress[a.id]?.current ?? 0;
        return p > 0;
      }
      return a.category === filter;
    });
    // sort: unlocked first (by date desc), then by progress desc, then by tier
    return [...list].sort((a, b) => {
      const aUnlocked = isUnlocked(a.id);
      const bUnlocked = isUnlocked(b.id);
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
      if (aUnlocked && bUnlocked) {
        const at =
          state.unlocked.find((u) => u.id === a.id)?.unlockedAt ?? 0;
        const bt =
          state.unlocked.find((u) => u.id === b.id)?.unlockedAt ?? 0;
        return bt - at;
      }
      const ap = getProgress(a.id).percentage;
      const bp = getProgress(b.id).percentage;
      return bp - ap;
    });
  }, [allAchievements, filter, isUnlocked, getProgress, state]);

  const recentUnlocks = useMemo(() => {
    return [...state.unlocked]
      .sort((a, b) => b.unlockedAt - a.unlockedAt)
      .slice(0, 3)
      .map((u) => allAchievements.find((a) => a.id === u.id))
      .filter((a): a is AchievementDef => !!a);
  }, [state.unlocked, allAchievements]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
          <DonutChart
            value={percentage}
            size={84}
            strokeWidth={9}
            color="#facc15"
            gradientTo="#f97316"
            ariaLabel={`Розблоковано ${unlocked} з ${total}`}
            centerContent={
              <div>
                <p className="text-base font-black tabular-nums text-white">
                  {unlocked}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  з {total}
                </p>
              </div>
            }
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Прогрес досягнень
            </p>
            <p className="text-2xl font-black tabular-nums text-[#facc15]">
              {percentage}%
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              XP з ачивок:{" "}
              <span className="font-black text-white">
                {state.stats.totalXpFromAchievements.toLocaleString("uk-UA")}
              </span>
            </p>
          </div>
        </div>

        {recentUnlocks.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Останні розблокування
            </p>
            <div className="space-y-2">
              {recentUnlocks.map((a) => (
                <AchievementCard
                  key={`recent-${a.id}`}
                  achievement={a}
                  isUnlocked
                  onTap={() => openDetail(a)}
                />
              ))}
            </div>
          </div>
        )}

        <div
          data-scroll-x="true"
          role="tablist"
          aria-label="Фільтр досягнень"
          className="flex shrink-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`min-h-[34px] shrink-0 rounded-full border px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  active
                    ? "border-[#facc15]/60 bg-[#facc15] text-[#1a0a2e]"
                    : "border-white/10 bg-white/5 text-slate-300 active:scale-95"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key={`empty-${filter}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <EmptyState
                illustration={<BrawlerIllustration variant="empty" />}
                title="Поки нічого тут немає"
                description="Спробуй інший фільтр або виконуй дії в застосунку, щоб розблокувати ачивки."
              />
            </motion.div>
          ) : (
            <motion.ul
              key={`grid-${filter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {filtered.map((a) => (
                <li key={a.id}>
                  <AchievementCard
                    achievement={a}
                    isUnlocked={isUnlocked(a.id)}
                    progress={getProgress(a.id)}
                    onTap={() => openDetail(a)}
                  />
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {unlocked === total && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#facc15]/40 bg-[#facc15]/5 px-4 py-3">
            <Trophy className="h-5 w-5 shrink-0 text-[#facc15]" />
            <p className="text-xs font-bold text-[#facc15]">
              Усі досягнення розблоковано! Ти справжній майстер.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

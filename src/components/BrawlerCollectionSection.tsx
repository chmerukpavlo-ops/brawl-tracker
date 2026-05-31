import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Layers, Library, Lock } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { calculateProgress } from "../utils/brawlerProgress";
import BrawlerProgressDonut from "./BrawlerProgressDonut";
import RarityBreakdown from "./RarityBreakdown";
import MissingBrawlersList from "./MissingBrawlersList";
import type { BrawlerClass, BrawlerRarity } from "../data/allBrawlers";

type TabId = "overall" | "classes" | "missing";

const TABS: { id: TabId; label: string; icon: typeof Library }[] = [
  { id: "overall", label: "Загалом", icon: Library },
  { id: "classes", label: "По класах", icon: Layers },
  { id: "missing", label: "Не вистачає", icon: Lock },
];

export default function BrawlerCollectionSection() {
  const { playerData, lastUpdated } = usePlayer();
  const [tab, setTab] = useState<TabId>("overall");

  const progress = useMemo(
    () => calculateProgress(playerData?.brawlers),
    // refresh on data change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerData?.brawlers, lastUpdated]
  );

  if (!playerData) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Library className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Колекція
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <BrawlerProgressDonut
            unlocked={progress.unlocked}
            total={progress.total}
            percentage={progress.percentage}
          />
          <div className="w-full min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              По рідкості
            </p>
            <RarityBreakdown<BrawlerRarity>
              items={progress.byRarity}
              labelFor={(k) => k}
              variant="rarity"
            />
          </div>
        </div>

        {progress.unknownUnlocked > 0 && (
          <p className="mt-3 text-[10px] text-slate-500">
            Невідомих у каталозі: {progress.unknownUnlocked} (можливо, нові бравлери).
          </p>
        )}
      </div>

      <LayoutGroup>
        <div
          role="tablist"
          aria-label="Розділ колекції"
          className="flex items-center gap-0.5 rounded-xl bg-[#1a0a2e] p-1"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`relative flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${
                  active ? "text-[#1a0a2e]" : "text-slate-400"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="collection-tab-pill"
                    className="absolute inset-0 -z-0 rounded-lg bg-[#facc15]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "overall" && (
            <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Цифри колекції
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Розблоковано" value={progress.unlocked} accent="text-[#facc15]" />
                <Stat label="Залишилось" value={progress.locked} accent="text-rose-300" />
                <Stat label="Всього" value={progress.total} accent="text-white" />
              </div>
            </div>
          )}

          {tab === "classes" && (
            <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
              <RarityBreakdown<BrawlerClass>
                items={progress.byClass}
                labelFor={(k) => k}
                variant="class"
              />
            </div>
          )}

          {tab === "missing" && (
            <MissingBrawlersList missing={progress.missing} defaultExpanded />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#1a0a2e] p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-black tabular-nums ${accent}`}>
        {value.toLocaleString("uk-UA")}
      </p>
    </div>
  );
}

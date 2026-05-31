import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Bot,
  Crown,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PlayerStats } from "../types";
import { getComparisonStats } from "../utils/compareMetrics";
import BottomSheet from "./BottomSheet";
import CompareOverviewTab from "./CompareOverviewTab";
import CompareStatsTab from "./CompareStatsTab";
import CompareBrawlersTab from "./CompareBrawlersTab";
import CompareAiTab from "./CompareAiTab";
import ShareButton from "./ShareButton";
import { shareComparisonPreset } from "../utils/sharePresets";
import { haptic } from "../hooks/useHaptic";

interface CompareSheetProps {
  open: boolean;
  playerA: PlayerStats | null;
  playerB: PlayerStats | null;
  onClose: () => void;
  onSwap: () => void;
  onReload?: () => void;
  /** Show a loading indicator overlay (e.g. while refetching playerB). */
  isComparing?: boolean;
  error?: string | null;
  /** Optional handler when user wants to make B the primary profile. */
  onMakeMine?: () => void;
}

type CompareTabId = "overview" | "stats" | "brawlers" | "ai";

const TABS: Array<{ id: CompareTabId; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Огляд", icon: <Crown className="h-3.5 w-3.5" /> },
  { id: "stats", label: "Стата", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "brawlers", label: "Бійці", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "ai", label: "AI", icon: <Bot className="h-3.5 w-3.5" /> },
];

export default function CompareSheet({
  open,
  playerA,
  playerB,
  onClose,
  onSwap,
  onReload,
  isComparing,
  error,
  onMakeMine,
}: CompareSheetProps) {
  const [tab, setTab] = useState<CompareTabId>("overview");

  useEffect(() => {
    if (open) setTab("overview");
  }, [open, playerB?.tag]);

  const result = useMemo(() => {
    if (!playerA || !playerB) return null;
    return getComparisonStats(playerA, playerB);
  }, [playerA, playerB]);

  // Edge case: comparing self with self.
  const selfCompare = !!(
    playerA &&
    playerB &&
    playerA.tag.replace(/^#/, "").toUpperCase() ===
      playerB.tag.replace(/^#/, "").toUpperCase()
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Порівняння">
      <div className="flex flex-col gap-4 pt-1">
        {playerA && playerB && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-wide text-white">
                <span className="text-[#facc15]">{playerA.name}</span>
                <span className="mx-1.5 text-slate-500">vs</span>
                <span className="text-[#c4b5fd]">{playerB.name}</span>
              </p>
              {selfCompare && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Це той самий гравець — всі метрики однакові
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onReload && (
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    onReload();
                  }}
                  aria-label="Перезавантажити"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-95"
                >
                  {isComparing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onSwap();
                }}
                aria-label="Поміняти місцями"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/20 text-[#c4b5fd] active:scale-95"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-xs text-[#fca5a5]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="min-w-0">{error}</span>
          </div>
        )}

        {!playerA && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
            Спочатку завантаж свій профіль на табі «Статистика».
          </div>
        )}

        {playerA && !playerB && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
            Обери другого гравця.
          </div>
        )}

        {playerA && playerB && result && (
          <>
            <div className="flex gap-1.5 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      haptic.light();
                    }}
                    className={`relative flex flex-1 min-h-[36px] items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                      active
                        ? "bg-[#7c3aed] text-white shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                        : "text-slate-400 active:text-slate-200"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {tab === "overview" && <CompareOverviewTab result={result} />}
                {tab === "stats" && <CompareStatsTab result={result} />}
                {tab === "brawlers" && <CompareBrawlersTab result={result} />}
                {tab === "ai" && (
                  <CompareAiTab playerA={playerA} playerB={playerB} />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <ShareButton
                variant="pill"
                size="md"
                label="Поділитися"
                payload={() => shareComparisonPreset(result)}
                ariaLabel="Поділитися порівнянням"
                className="justify-center"
              />
              {onMakeMine && (
                <button
                  type="button"
                  onClick={() => {
                    haptic.medium();
                    onMakeMine();
                  }}
                  className="min-h-[40px] rounded-full border border-[#facc15]/30 bg-[#facc15]/10 px-3 text-xs font-black uppercase tracking-wider text-[#facc15] active:scale-95"
                >
                  Зробити моїм
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

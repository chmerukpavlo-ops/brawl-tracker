import { forwardRef, useCallback, useState } from "react";
import { Crown, Star, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { PlayerRanking } from "../types";
import { haptic } from "../hooks/useHaptic";
import { useLongPress } from "../hooks/useLongPress";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { highlightSubstring } from "../utils/highlightText";
import { useI18n } from "../context/I18nContext";

interface LeaderboardRowProps {
  ranking: PlayerRanking;
  isMyPlayer?: boolean;
  isFavorite?: boolean;
  onTap: (ranking: PlayerRanking) => void;
  contextItems?: ContextMenuItem[];
  /** Optional substring to highlight in the player name / club name. */
  highlight?: string;
  /** When true, brief glow pulse to draw attention (e.g. "find me" jump). */
  pulse?: boolean;
}

function rankBadgeStyle(rank: number): string {
  if (rank === 1) {
    return "bg-gradient-to-br from-[#facc15] to-[#eab308] text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.45)]";
  }
  if (rank === 2) {
    return "bg-slate-300 text-[#1a0a2e]";
  }
  if (rank === 3) {
    return "bg-gradient-to-br from-amber-700 to-amber-800 text-white";
  }
  if (rank <= 10) {
    return "bg-[#facc15]/15 text-[#facc15] ring-1 ring-[#facc15]/30";
  }
  if (rank <= 50) {
    return "bg-[#7c3aed]/20 text-[#c4b5fd] ring-1 ring-[#7c3aed]/30";
  }
  return "bg-white/5 text-slate-300";
}

const LeaderboardRow = forwardRef<HTMLDivElement, LeaderboardRowProps>(
  function LeaderboardRow(
    { ranking, isMyPlayer, isFavorite, onTap, contextItems, highlight, pulse },
    ref
  ) {
    const { formatNumber } = useI18n();
    const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
    const longPress = useLongPress(
      useCallback((pos: { clientX: number; clientY: number }) => {
        if (!contextItems || contextItems.length === 0) return;
        haptic.medium();
        setAnchor({ x: pos.clientX, y: pos.clientY });
      }, [contextItems])
    );

    const handleClick = () => {
      if (anchor) return;
      haptic.light();
      onTap(ranking);
    };

    const initial = ranking.name.trim().slice(0, 1).toUpperCase() || "?";
    const highlightStyle = isMyPlayer
      ? "border-[#facc15] bg-[#facc15]/10 ring-2 ring-[#facc15]/30 shadow-[0_0_20px_rgba(250,204,21,0.18)]"
      : isFavorite
        ? "border-[#a78bfa]/50 bg-[#7c3aed]/10"
        : "border-white/10 bg-[#2a1a4a]";

    return (
      <div ref={ref}>
        <motion.button
          type="button"
          layout
          onClick={handleClick}
          {...longPress}
          style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
          whileTap={{ scale: 0.98 }}
          animate={
            pulse
              ? {
                  boxShadow: [
                    "0 0 0 rgba(250,204,21,0)",
                    "0 0 24px rgba(250,204,21,0.6)",
                    "0 0 0 rgba(250,204,21,0)",
                  ],
                }
              : undefined
          }
          transition={pulse ? { duration: 1.4, repeat: 1 } : undefined}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${highlightStyle}`}
          aria-label={`Гравець ${ranking.name} на ${ranking.rank} позиції з ${ranking.trophies} кубками`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums ${rankBadgeStyle(
              ranking.rank
            )}`}
          >
            {ranking.rank === 1 ? (
              <Crown className="h-4 w-4 fill-current" />
            ) : (
              `#${ranking.rank}`
            )}
          </span>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a0a2e] text-sm font-black uppercase text-[#facc15] ring-1 ring-white/10">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-black uppercase text-white">
                {highlight
                  ? highlightSubstring(ranking.name, highlight)
                  : ranking.name}
              </p>
              {isMyPlayer && (
                <span className="shrink-0 rounded-full bg-[#facc15] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1a0a2e]">
                  ти
                </span>
              )}
              {isFavorite && !isMyPlayer && (
                <Star className="h-3 w-3 shrink-0 fill-[#a78bfa] text-[#a78bfa]" />
              )}
            </div>
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {highlight && ranking.club?.name
                ? highlightSubstring(
                    ranking.club.name,
                    highlight,
                    "rounded px-0.5 bg-[#facc15]/20 text-[#facc15]"
                  )
                : (ranking.club?.name ?? ranking.tag)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-[#facc15]" />
            <span className="text-sm font-black tabular-nums text-[#facc15]">
              {formatNumber(ranking.trophies)}
            </span>
          </div>
        </motion.button>

        {contextItems && contextItems.length > 0 && (
          <ContextMenu
            open={!!anchor}
            anchor={anchor}
            items={contextItems}
            onClose={() => setAnchor(null)}
          />
        )}
      </div>
    );
  }
);

export default LeaderboardRow;

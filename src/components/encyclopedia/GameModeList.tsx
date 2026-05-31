import OptimizedImage from "../ui/OptimizedImage";
import type { BrawlifyGameMode } from "../../types/brawlify";
import { haptic } from "../../hooks/useHaptic";
import { motion } from "motion/react";
import { useTranslation } from "../../hooks/useTranslation";

interface GameModeListProps {
  modes: BrawlifyGameMode[];
  onSelect: (mode: BrawlifyGameMode) => void;
}

/**
 * Vertical list of game modes (sorted by Brawlify's `sort1`/`sort2`).
 * Disabled (rotated-out) modes are pushed to the bottom and rendered
 * with reduced opacity so users can still browse them.
 */
export default function GameModeList({ modes, onSelect }: GameModeListProps) {
  const { t } = useTranslation();
  const ordered = [...modes].sort((a, b) => {
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
    if (a.sort1 !== b.sort1) return a.sort1 - b.sort1;
    if (a.sort2 !== b.sort2) return a.sort2 - b.sort2;
    return a.name.localeCompare(b.name);
  });

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
        {t("encyclopedia.state.empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {ordered.map((mode) => (
        <li key={mode.id}>
          <ModeRow mode={mode} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

function ModeRow({
  mode,
  onSelect,
}: {
  mode: BrawlifyGameMode;
  onSelect: (mode: BrawlifyGameMode) => void;
}) {
  const accent = mode.color || "#a78bfa";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptic.light();
        onSelect(mode);
      }}
      className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r p-3 text-left transition-colors active:bg-white/5 ${
        mode.disabled ? "opacity-50" : ""
      }`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${accent}1f, transparent 60%)`,
      }}
      aria-label={mode.name}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10"
        style={{ backgroundColor: `${accent}20` }}
      >
        {mode.imageUrl ? (
          <OptimizedImage
            src={mode.imageUrl}
            alt={mode.name}
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs font-black text-white">
            {mode.name.charAt(0)}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black uppercase tracking-wide text-white">
          {mode.name}
        </p>
        {mode.shortDescription && (
          <p className="line-clamp-1 text-[11px] text-slate-400">
            {mode.shortDescription}
          </p>
        )}
      </div>
    </motion.button>
  );
}

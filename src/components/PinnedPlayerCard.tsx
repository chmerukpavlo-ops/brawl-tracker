import { forwardRef, useCallback, useState, type ReactNode } from "react";
import { ChevronRight, Pencil, Pin, Trash2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { FavoritePlayer } from "../types";
import { haptic } from "../hooks/useHaptic";
import { useLongPress } from "../hooks/useLongPress";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { useI18n } from "../context/I18nContext";

export type PinnedPlayerCardVariant = "full" | "compact" | "horizontal";

interface PinnedPlayerCardProps {
  pin: FavoritePlayer;
  /** Best-effort live name from API/cache, used as fallback when no customName. */
  liveName?: string;
  /** Live trophies from cache for delta calculation; falls back to `pin.lastTrophies`. */
  liveTrophies?: number;
  variant?: PinnedPlayerCardVariant;
  onTap: (pin: FavoritePlayer) => void;
  onEdit?: (pin: FavoritePlayer) => void;
  onRemove?: (pin: FavoritePlayer) => void;
  contextItems?: ContextMenuItem[];
  /** Render the row as a drag handle target (for reorder mode). */
  reorderable?: boolean;
  /** Right-side adornment used in horizontal variant (e.g. drag handle). */
  rightSlot?: ReactNode;
}

function safeInitial(name: string | undefined, tag: string): string {
  const source = (name ?? "").trim() || tag;
  return source.replace(/^#+/, "").slice(0, 1).toUpperCase() || "?";
}

const PinnedPlayerCard = forwardRef<HTMLLIElement | HTMLDivElement, PinnedPlayerCardProps>(
  function PinnedPlayerCard(
    {
      pin,
      liveName,
      liveTrophies,
      variant = "full",
      onTap,
      onEdit,
      onRemove,
      contextItems,
      reorderable = false,
      rightSlot,
    },
    _ref
  ) {
    const { t, formatNumber } = useI18n();
    const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

    const longPressHandlers = useLongPress(
      useCallback(
        (pos: { clientX: number; clientY: number }) => {
          if (!contextItems || contextItems.length === 0) return;
          haptic.medium();
          setAnchor({ x: pos.clientX, y: pos.clientY });
        },
        [contextItems]
      )
    );

    const displayName = pin.customName?.trim() || pin.originalName || liveName || pin.tag;
    const showRealName =
      !!pin.customName?.trim() && !!liveName && pin.customName !== liveName;
    const trophies = liveTrophies ?? pin.lastTrophies;
    const delta =
      pin.lastTrophies !== undefined && liveTrophies !== undefined
        ? liveTrophies - pin.lastTrophies
        : 0;

    const accent = pin.color ?? null;
    const accentRing = accent
      ? { borderColor: `${accent}99`, boxShadow: `0 0 18px ${accent}33` }
      : undefined;
    const initial = safeInitial(displayName, pin.tag);
    const noteSnippet = pin.note?.trim();

    const handleClick = () => {
      haptic.light();
      onTap(pin);
    };

    if (variant === "horizontal") {
      return (
        <button
          type="button"
          onClick={handleClick}
          onContextMenu={(e) => {
            if (!contextItems?.length) return;
            e.preventDefault();
            haptic.medium();
            setAnchor({ x: e.clientX, y: e.clientY });
          }}
          {...longPressHandlers}
          className="group relative flex w-[120px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3 text-center transition-transform active:scale-95"
          style={accentRing}
          aria-label={`${displayName} ${pin.tag}`}
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            style={{
              boxShadow: accent ? `inset 0 0 0 2px ${accent}` : "inset 0 0 0 1px rgba(255,255,255,0.1)",
              backgroundColor: accent ? `${accent}22` : "rgba(255,255,255,0.06)",
            }}
          >
            {pin.iconEmoji ?? initial}
          </span>
          <span className="line-clamp-1 w-full text-[11px] font-black uppercase tracking-wide text-white">
            {displayName}
          </span>
          {trophies !== undefined ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#facc15]">
              <Trophy className="h-3 w-3" />
              {formatNumber(trophies)}
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">{pin.tag}</span>
          )}
          {contextItems?.length ? (
            <ContextMenu
              open={!!anchor}
              anchor={anchor}
              items={contextItems}
              onClose={() => setAnchor(null)}
            />
          ) : null}
        </button>
      );
    }

    if (variant === "compact") {
      return (
        <div
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2"
          style={accentRing}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a0a2e] text-lg ring-1 ring-white/10">
            {pin.iconEmoji ?? initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase text-white">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-slate-500">{pin.tag}</p>
          </div>
          {trophies !== undefined && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#facc15]">
              <Trophy className="h-3 w-3" />
              {formatNumber(trophies)}
            </span>
          )}
          {rightSlot}
        </div>
      );
    }

    // full
    return (
      <div
        className="relative flex items-stretch gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3"
        style={accentRing}
      >
        <button
          type="button"
          onClick={handleClick}
          onContextMenu={(e) => {
            if (!contextItems?.length) return;
            e.preventDefault();
            haptic.medium();
            setAnchor({ x: e.clientX, y: e.clientY });
          }}
          {...longPressHandlers}
          className="flex flex-1 items-center gap-3 text-left active:opacity-70"
          aria-label={`${displayName} (${pin.tag})`}
        >
          <span
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{
              backgroundColor: accent ? `${accent}1a` : "rgba(255,255,255,0.05)",
              boxShadow: accent ? `inset 0 0 0 2px ${accent}` : "inset 0 0 0 1px rgba(255,255,255,0.1)",
            }}
          >
            {pin.iconEmoji ?? initial}
            <Pin className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-[#facc15] p-0.5 text-[#1a0a2e]" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black uppercase text-white">
              {displayName}
            </p>
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {showRealName ? `${liveName} · ${pin.tag}` : pin.tag}
            </p>

            {pin.tags && pin.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {pin.tags.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300"
                  >
                    {label}
                  </span>
                ))}
                {pin.tags.length > 2 && (
                  <span className="text-[9px] text-slate-500">
                    +{pin.tags.length - 2}
                  </span>
                )}
              </div>
            )}

            {noteSnippet && (
              <p className="mt-1 line-clamp-2 text-[11px] italic text-slate-400">
                {noteSnippet}
              </p>
            )}
          </div>

          {trophies !== undefined && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1 text-xs font-black text-[#facc15]">
                <Trophy className="h-3 w-3" />
                {formatNumber(trophies)}
              </span>
              {delta !== 0 && (
                <span
                  className={`text-[10px] font-bold ${
                    delta > 0 ? "text-[#22c55e]" : "text-rose-400"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {formatNumber(delta)}
                </span>
              )}
              {(pin.viewCount ?? 0) > 0 && (
                <span className="text-[9px] text-slate-500">
                  {pin.viewCount}✨
                </span>
              )}
            </div>
          )}
        </button>

        {reorderable ? (
          rightSlot ?? null
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(pin);
                }}
                aria-label={t("pinned.edit")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-90"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(pin);
                }}
                aria-label={t("pinned.remove")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 active:scale-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {!onEdit && !onRemove && (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </div>
        )}

        {contextItems?.length ? (
          <ContextMenu
            open={!!anchor}
            anchor={anchor}
            items={contextItems}
            onClose={() => setAnchor(null)}
          />
        ) : null}
      </div>
    );
  }
);

export default PinnedPlayerCard;

/**
 * Wraps the card in a layout-animated `motion.div` (used by lists outside of
 * Reorder.Group).
 */
export function PinnedPlayerCardMotion(
  props: PinnedPlayerCardProps & { layoutId?: string }
) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
    >
      <PinnedPlayerCard {...props} />
    </motion.div>
  );
}

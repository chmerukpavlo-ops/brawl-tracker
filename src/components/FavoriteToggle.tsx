import { useCallback, type MouseEvent, type PointerEvent } from "react";
import { Star } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";
import type { PlayerStats } from "../types";

interface FavoriteToggleProps {
  tag: string;
  player?: PlayerStats | null;
  size?: "sm" | "md";
  className?: string;
}

export default function FavoriteToggle({
  tag,
  player,
  size = "md",
  className = "",
}: FavoriteToggleProps) {
  const { isFavorite, addFavorite, removeFavorite } = usePlayer();
  const { showSuccess, showError, showInfo } = useToast();

  const active = isFavorite(tag);
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const button = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  const handleToggle = useCallback(
    (e: MouseEvent | PointerEvent) => {
      e.stopPropagation();
      if (active) {
        removeFavorite(tag);
        haptic.medium();
        showInfo("Прибрано з улюблених");
      } else {
        const result = addFavorite(tag, {
          lastTrophies: player?.trophies,
        });
        if (result.limitReached) {
          haptic.error();
          showError("Досягнуто ліміт 20 улюблених. Видали когось.");
          return;
        }
        haptic.light();
        showSuccess("Додано в улюблені");
      }
    },
    [active, addFavorite, removeFavorite, tag, player?.trophies, showSuccess, showError, showInfo]
  );

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={active}
      aria-label={active ? "Прибрати з улюблених" : "Додати в улюблені"}
      className={`flex ${button} items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all active:scale-90 ${active ? "text-[#facc15]" : "text-slate-400"} ${className}`}
    >
      <Star
        className={dim}
        strokeWidth={active ? 2.5 : 2}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

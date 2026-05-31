import { useCallback, type MouseEvent, type PointerEvent } from "react";
import { Pin, PinOff } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";

interface MyPlayerToggleProps {
  tag: string;
  size?: "sm" | "md";
  className?: string;
}

export default function MyPlayerToggle({
  tag,
  size = "md",
  className = "",
}: MyPlayerToggleProps) {
  const { isMyPlayer, setMyPlayer, clearMyPlayer, myPlayer } = usePlayer();
  const { showSuccess, showInfo } = useToast();

  const active = isMyPlayer(tag);
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const button = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  const handleClick = useCallback(
    (e: MouseEvent | PointerEvent) => {
      e.stopPropagation();
      if (active) {
        clearMyPlayer();
        haptic.medium();
        showInfo("Прибрано основний профіль");
      } else {
        const wasReplaced = !!myPlayer.tag;
        setMyPlayer(tag);
        haptic.success();
        showSuccess(
          wasReplaced
            ? "Замінено основний профіль"
            : "Профіль збережено як основний"
        );
      }
    },
    [active, clearMyPlayer, setMyPlayer, myPlayer.tag, tag, showSuccess, showInfo]
  );

  const Icon = active ? Pin : PinOff;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Прибрати основний профіль" : "Зробити моїм профілем"}
      className={`flex ${button} items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all active:scale-90 ${active ? "text-[#a78bfa]" : "text-slate-400"} ${className}`}
    >
      <Icon className={dim} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}

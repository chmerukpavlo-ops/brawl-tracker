import { useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { haptic } from "../hooks/useHaptic";

export default function UpdateStatsButton() {
  const { playerData, updateButtonState, refreshPlayer } = usePlayer();
  const [pressed, setPressed] = useState(false);

  const handleClick = async () => {
    if (!playerData?.tag || updateButtonState === "loading") return;
    haptic.light();
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    await refreshPlayer();
  };

  const isLoading = updateButtonState === "loading";
  const isSuccess = updateButtonState === "success";
  const isPressed = pressed || updateButtonState === "pressed";

  const base =
    "w-full min-h-[52px] rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg";

  let className = `${base} bg-[#facc15] text-[#1a0a2e] shadow-[0_0_24px_rgba(250,204,21,0.35)]`;
  let icon = <Zap className="h-5 w-5" />;
  let label = "Оновити статистику";

  if (isPressed && !isLoading && !isSuccess) {
    className = `${base} bg-[#eab308] text-[#1a0a2e] scale-95`;
  }
  if (isLoading) {
    className = `${base} bg-[#3b82f6] text-white shadow-[0_0_24px_rgba(59,130,246,0.35)]`;
    icon = <Loader2 className="h-5 w-5 animate-spin" />;
    label = "Завантаження...";
  }
  if (isSuccess) {
    className = `${base} bg-[#22c55e] text-white shadow-[0_0_24px_rgba(34,197,94,0.35)]`;
    icon = <Check className="h-5 w-5" />;
    label = "Дані оновлено";
  }

  return (
    <button
      onClick={handleClick}
      disabled={!playerData || isLoading}
      className={`${className} disabled:opacity-50`}
    >
      {icon}
      {label}
    </button>
  );
}

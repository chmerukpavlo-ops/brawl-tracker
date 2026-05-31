import { useState } from "react";
import { Loader2, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { updateUrl } from "../navigation/urlState";
import { haptic } from "../hooks/useHaptic";
import PlayerPickerSheet from "./PlayerPickerSheet";

export default function ComparePlayersButton() {
  const {
    playerData,
    comparePlayer,
    isComparing,
    compareWith,
  } = usePlayer();
  const { showSuccess, showError } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!playerData) return null;

  const excludeTag = playerData.tag;

  const handleClick = () => {
    haptic.light();
    if (comparePlayer) {
      const tag = comparePlayer.tag.replace(/^#/, "").toUpperCase();
      updateUrl({ compare: tag });
      return;
    }
    setPickerOpen(true);
  };

  const handlePick = async (tag: string) => {
    setPickerOpen(false);
    const ok = await compareWith(tag);
    if (ok) {
      updateUrl({ compare: tag });
      showSuccess("Профіль завантажено");
    } else {
      showError("Не вдалося завантажити гравця");
    }
  };

  const label = comparePlayer ? "До порівняння" : "Порівняти";

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.96 }}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-black uppercase tracking-wider transition-colors ${
          comparePlayer
            ? "border-[#7c3aed]/40 bg-[#7c3aed]/15 text-[#c4b5fd]"
            : "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#fca5a5]"
        }`}
        aria-label={label}
      >
        {isComparing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UsersRound className="h-4 w-4" />
        )}
        {label}
      </motion.button>

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        excludeTag={excludeTag}
        title="Порівняти з..."
        description="Обери другого гравця, щоб побачити їх пліч-о-пліч."
      />
    </>
  );
}

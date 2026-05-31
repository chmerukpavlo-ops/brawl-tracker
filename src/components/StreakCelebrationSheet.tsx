import { useEffect } from "react";
import { motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import AnimatedCounter from "./AnimatedCounter";
import type { Milestone } from "../hooks/useDailyCheckin";
import ShareButton from "./ShareButton";
import { shareStreakPreset } from "../utils/sharePresets";

interface StreakCelebrationSheetProps {
  milestone: Milestone | null;
  streak: number;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 8000;

const FLOATING_EMOJIS = ["🎉", "✨", "🔥", "⭐", "🏆"];

export default function StreakCelebrationSheet({
  milestone,
  streak,
  onClose,
}: StreakCelebrationSheetProps) {
  const open = !!milestone;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!milestone) {
    return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Вітаємо!">
      <div className="relative space-y-5 pt-2 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 flex justify-around overflow-hidden">
          {FLOATING_EMOJIS.map((e, i) => (
            <motion.span
              key={`${e}-${i}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{
                y: [0, 200],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeIn",
              }}
              className="text-2xl"
              aria-hidden
            >
              {e}
            </motion.span>
          ))}
        </div>

        <div className="relative flex flex-col items-center pt-4">
          <div className="absolute inset-x-0 top-2 -z-10 mx-auto h-32 w-32 rounded-full bg-[#fb923c]/30 blur-3xl" />
          <motion.div
            initial={{ scale: 0.5, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="text-7xl"
          >
            {milestone.emoji}
          </motion.div>
          <h3 className="mt-3 text-2xl font-black uppercase tracking-wide text-white">
            {milestone.reward}
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-300">
            Streak: <span className="text-[#fb923c]">{streak} днів</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#facc15]/40 bg-[#facc15]/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#facc15]/80">
            Бонус XP
          </p>
          <AnimatedCounter
            value={milestone.xp}
            className="text-3xl font-black text-[#facc15]"
          />
        </div>

        <div className="flex gap-2">
          <ShareButton
            payload={() => shareStreakPreset(streak)}
            variant="pill"
            size="md"
            label="Поділитися"
            className="flex-1 justify-center"
            ariaLabel="Поділитися streak"
          />
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-[2] rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
          >
            Продовжуй у тому ж дусі
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

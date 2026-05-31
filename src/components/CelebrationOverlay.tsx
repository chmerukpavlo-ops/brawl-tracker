import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X } from "lucide-react";
import type { TrophyGoal } from "../types";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { haptic } from "../hooks/useHaptic";
import ShareButton from "./ShareButton";
import { shareGoalAchievedPreset } from "../utils/sharePresets";

interface CelebrationOverlayProps {
  goal: TrophyGoal | null;
  playerName?: string;
  playerTag?: string;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 10_000;
const CONFETTI_EMOJIS = ["🏆", "🎊", "⭐", "✨", "💫", "🎉"];
const CONFETTI_COUNT = 26;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function durationLabel(createdAt: number, achievedAt: number): string {
  const ms = Math.max(0, achievedAt - createdAt);
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) {
    return `${days} ${days === 1 ? "день" : days < 5 ? "дні" : "днів"}`;
  }
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) {
    return `${hours} ${hours === 1 ? "годину" : hours < 5 ? "години" : "годин"}`;
  }
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `${minutes} ${minutes === 1 ? "хвилину" : minutes < 5 ? "хвилини" : "хвилин"}`;
}

export default function CelebrationOverlay({
  goal,
  playerName,
  playerTag,
  onClose,
}: CelebrationOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const open = !!goal;

  useEffect(() => {
    if (!open) return;
    haptic.success();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([20, 60, 20, 60, 80]);
      } catch {
        /* ignore */
      }
    }
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const confetti = useMemo(() => {
    if (!goal || reduced) return [];
    const rand = seededRandom(hashId(goal.id));
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      emoji: CONFETTI_EMOJIS[Math.floor(rand() * CONFETTI_EMOJIS.length)],
      leftPct: Math.floor(rand() * 96) + 2,
      delay: rand() * 1.6,
      duration: 2.2 + rand() * 1.4,
      rotate: Math.floor(rand() * 720) - 360,
      size: 14 + Math.floor(rand() * 16),
    }));
  }, [goal, reduced]);

  if (!goal) return null;

  const sharePayload = () =>
    shareGoalAchievedPreset(
      goal,
      playerName && playerTag
        ? { name: playerName, tag: playerTag }
        : undefined
    );

  const duration =
    goal.achievedAt && goal.createdAt
      ? durationLabel(goal.createdAt, goal.achievedAt)
      : null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="celebration"
          role="dialog"
          aria-modal="true"
          aria-label="Ціль досягнута"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.1 : 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6 backdrop-blur-xl"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          onClick={onClose}
        >
          {!reduced &&
            confetti.map((c) => (
              <motion.span
                key={c.id}
                aria-hidden
                initial={{ y: -40, opacity: 0, rotate: 0 }}
                animate={{
                  y: ["-10%", "110%"],
                  opacity: [0, 1, 1, 0],
                  rotate: c.rotate,
                }}
                transition={{
                  duration: c.duration,
                  delay: c.delay,
                  repeat: Infinity,
                  ease: "easeIn",
                }}
                className="pointer-events-none absolute top-0"
                style={{
                  left: `${c.leftPct}%`,
                  fontSize: c.size,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                }}
              >
                {c.emoji}
              </motion.span>
            ))}

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.7, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 240, damping: 18 }
            }
            className="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-[#facc15]/40 bg-gradient-to-b from-[#2d1b4e] to-[#1a0a2e] p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 active:opacity-70"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#facc15]/40 blur-2xl" aria-hidden />
              <motion.div
                initial={reduced ? undefined : { scale: 0, rotate: -20 }}
                animate={reduced ? undefined : { scale: [0, 1.2, 1], rotate: [-20, 8, 0] }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#facc15]/15 ring-2 ring-[#facc15]/50"
              >
                <Trophy className="h-12 w-12 text-[#facc15]" fill="currentColor" />
              </motion.div>
            </div>

            <p className="text-xs font-black uppercase tracking-widest text-[#facc15]">
              Ціль досягнута!
            </p>
            <h2 className="mt-1 text-3xl font-black uppercase text-white">
              {goal.targetTrophies.toLocaleString("uk-UA")}
              <span className="ml-1.5 text-base text-[#facc15]">кубків</span>
            </h2>
            {goal.label && (
              <p className="mt-1 text-sm font-bold text-slate-300">{goal.label}</p>
            )}
            {goal.reward && (
              <p className="mt-3 inline-block rounded-xl border border-[#facc15]/30 bg-[#facc15]/5 px-3 py-1.5 text-xs font-bold text-[#facc15]">
                🎁 {goal.reward}
              </p>
            )}

            {duration && (
              <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Підкорено за {duration}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <ShareButton
                payload={sharePayload}
                variant="pill"
                size="md"
                label="Похвалитись"
                className="flex-1 justify-center"
                ariaLabel="Поділитися досягненням"
              />
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] flex-[1.4] rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
              >
                Продовжити гру
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

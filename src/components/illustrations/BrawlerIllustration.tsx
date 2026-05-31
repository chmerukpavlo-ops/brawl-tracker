import { motion } from "motion/react";

export type IllustrationVariant =
  | "empty"
  | "search"
  | "trophy"
  | "error"
  | "leaderboard";

interface BrawlerIllustrationProps {
  variant: IllustrationVariant;
  size?: "lg" | "md";
}

interface VariantConfig {
  center: string;
  left: string;
  right: string;
  glow: string;
  label: string;
}

const VARIANTS: Record<IllustrationVariant, VariantConfig> = {
  empty: {
    center: "🎮",
    left: "🔫",
    right: "🦇",
    glow: "bg-[#7c3aed]",
    label: "Бравлери чекають",
  },
  search: {
    center: "🔍",
    left: "🎮",
    right: "✨",
    glow: "bg-[#a78bfa]",
    label: "Пошук",
  },
  trophy: {
    center: "🏆",
    left: "⭐",
    right: "💎",
    glow: "bg-[#facc15]",
    label: "Трофеї",
  },
  error: {
    center: "😵",
    left: "💥",
    right: "💢",
    glow: "bg-[#ef4444]",
    label: "Помилка",
  },
  leaderboard: {
    center: "🏆",
    left: "👑",
    right: "🥇",
    glow: "bg-[#facc15]",
    label: "Лідерборд",
  },
};

const FLOAT_DURATION = 3.2;

function floatTransition(delay: number) {
  return {
    duration: FLOAT_DURATION,
    repeat: Infinity,
    ease: [0.42, 0, 0.58, 1] as const,
    delay,
  };
}

export default function BrawlerIllustration({
  variant,
  size = "lg",
}: BrawlerIllustrationProps) {
  const cfg = VARIANTS[variant];
  const isLg = size === "lg";

  const centerSize = isLg ? "text-7xl" : "text-5xl";
  const sideSize = isLg ? "text-4xl" : "text-3xl";
  const containerHeight = isLg ? "h-36" : "h-24";
  const glowSize = isLg ? "h-40 w-40" : "h-24 w-24";

  return (
    <div
      role="img"
      aria-label={cfg.label}
      className={`relative flex w-full items-center justify-center ${containerHeight}`}
    >
      <div
        className={`pointer-events-none absolute ${glowSize} rounded-full opacity-25 blur-3xl ${cfg.glow}`}
        aria-hidden
      />

      <motion.span
        aria-hidden
        animate={{ y: [-4, 4, -4], rotate: [-6, -3, -6] }}
        transition={floatTransition(0.4)}
        className={`absolute left-[18%] ${sideSize} opacity-60 drop-shadow-lg`}
      >
        {cfg.left}
      </motion.span>

      <motion.span
        aria-hidden
        animate={{ y: [-6, 6, -6] }}
        transition={floatTransition(0)}
        className={`relative z-10 ${centerSize} drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]`}
      >
        {cfg.center}
      </motion.span>

      <motion.span
        aria-hidden
        animate={{ y: [-4, 4, -4], rotate: [6, 3, 6] }}
        transition={floatTransition(0.8)}
        className={`absolute right-[18%] ${sideSize} opacity-60 drop-shadow-lg`}
      >
        {cfg.right}
      </motion.span>
    </div>
  );
}

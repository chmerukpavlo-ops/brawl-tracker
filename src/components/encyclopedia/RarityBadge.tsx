import type { BrawlifyRarity } from "../../types/brawlify";

interface RarityBadgeProps {
  rarity: BrawlifyRarity | undefined;
  className?: string;
}

/**
 * Brawlify provides a dedicated `color` (hex) per rarity. We use it as
 * an accent for both background and border so the badge feels native to
 * the source even when we don't have an explicit i18n label for a new
 * rarity tier (Brawlify ships ~7 today; the game adds them rarely).
 */
export default function RarityBadge({ rarity, className }: RarityBadgeProps) {
  if (!rarity) return null;
  const color = rarity.color || "#a78bfa";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${className ?? ""}`}
      style={{
        color,
        borderColor: `${color}66`,
        backgroundColor: `${color}1f`,
      }}
    >
      {rarity.name}
    </span>
  );
}

import { motion } from "motion/react";
import OptimizedImage from "../ui/OptimizedImage";
import RarityBadge from "./RarityBadge";
import type { BrawlifyBrawler } from "../../types/brawlify";
import { haptic } from "../../hooks/useHaptic";

interface BrawlerCardProps {
  brawler: BrawlifyBrawler;
  onSelect: (brawler: BrawlifyBrawler) => void;
}

/**
 * Encyclopedia tile for a brawler. Renders the official Brawlify
 * portrait at ~144px so the grid is dense yet recognisable, with the
 * rarity badge floating at the bottom-left and the class label at the
 * top-right (when available).
 */
export default function BrawlerCard({ brawler, onSelect }: BrawlerCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic.light();
        onSelect(brawler);
      }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-2 text-left active:from-white/10"
      aria-label={brawler.name}
    >
      <div
        className="relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl"
        style={{
          background: `radial-gradient(120% 80% at 50% 30%, ${brawler.rarity?.color ?? "#7c3aed"}33, transparent 70%)`,
        }}
      >
        <OptimizedImage
          src={brawler.imageUrl}
          alt={brawler.name}
          width={144}
          height={144}
          responsiveWidths={[120, 240]}
          sizes="160px"
          className="h-[88%] w-[88%] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] transition-transform duration-200 group-active:scale-[0.97]"
        />
        {brawler.class?.name && (
          <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-200 backdrop-blur-sm">
            {brawler.class.name}
          </span>
        )}
      </div>
      <p className="truncate text-center text-[11px] font-black uppercase tracking-wide text-white">
        {brawler.name}
      </p>
      <div className="mt-1 flex justify-center">
        <RarityBadge rarity={brawler.rarity} />
      </div>
    </motion.button>
  );
}

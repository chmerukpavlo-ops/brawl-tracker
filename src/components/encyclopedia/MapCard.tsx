import { motion } from "motion/react";
import OptimizedImage from "../ui/OptimizedImage";
import type { BrawlifyMap } from "../../types/brawlify";
import { haptic } from "../../hooks/useHaptic";
import { useTranslation } from "../../hooks/useTranslation";

interface MapCardProps {
  map: BrawlifyMap;
  onSelect: (map: BrawlifyMap) => void;
}

export default function MapCard({ map, onSelect }: MapCardProps) {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        haptic.light();
        onSelect(map);
      }}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left active:bg-white/10"
      aria-label={map.name}
    >
      <div className="relative w-full">
        {map.imageUrl ? (
          <OptimizedImage
            src={map.imageUrl}
            alt={map.name}
            width={320}
            height={240}
            responsiveWidths={[200, 320]}
            sizes="(min-width: 640px) 240px, 50vw"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-white/10 to-white/5" />
        )}
        {map.new && (
          <span className="absolute left-2 top-2 rounded-md bg-[#facc15] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
            {t("encyclopedia.map.newBadge")}
          </span>
        )}
        {map.disabled && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur-sm">
            {t("encyclopedia.map.disabled")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 py-2">
        <p className="truncate text-sm font-black uppercase tracking-wide text-white">
          {map.name}
        </p>
        {map.gameMode?.name && (
          <p
            className="truncate text-[10px] font-bold uppercase tracking-widest"
            style={{ color: map.gameMode.color || "#c4b5fd" }}
          >
            {map.gameMode.name}
          </p>
        )}
      </div>
    </motion.button>
  );
}

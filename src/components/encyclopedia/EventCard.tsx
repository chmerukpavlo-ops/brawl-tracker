import { motion } from "motion/react";
import OptimizedImage from "../ui/OptimizedImage";
import Countdown from "./Countdown";
import type { BrawlifyEvent } from "../../types/brawlify";
import { haptic } from "../../hooks/useHaptic";
import { useTranslation } from "../../hooks/useTranslation";

interface EventCardProps {
  event: BrawlifyEvent;
  onSelectMap: (mapId: number) => void;
}

export default function EventCard({ event, onSelectMap }: EventCardProps) {
  const { t } = useTranslation();
  const accent = event.map?.gameMode?.color || "#a78bfa";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptic.light();
        onSelectMap(event.map.id);
      }}
      className="flex w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left active:bg-white/10"
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-black/30">
        {event.map?.imageUrl ? (
          <OptimizedImage
            src={event.map.imageUrl}
            alt={event.map.name}
            width={160}
            height={120}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}10)` }}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black uppercase tracking-wide text-white">
            {event.map?.name ?? "—"}
          </p>
          {event.map?.gameMode?.name && (
            <p
              className="truncate text-[10px] font-bold uppercase tracking-widest"
              style={{ color: accent }}
            >
              {event.map.gameMode.name}
            </p>
          )}
          {event.modifier?.name && (
            <p className="mt-1 truncate text-[10px] text-slate-400">
              {t("encyclopedia.events.modifier", { name: event.modifier.name })}
            </p>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Countdown startIso={event.startTime} endIso={event.endTime} />
          {typeof event.reward === "number" && event.reward > 0 && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
              {t("encyclopedia.events.reward", { count: String(event.reward) })}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

import { useEffect } from "react";
import BottomSheet from "../BottomSheet";
import OptimizedImage from "../ui/OptimizedImage";
import type { BrawlifyMap } from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";
import { useMapQuery } from "../../hooks/queries/useEncyclopediaQueries";

interface Props {
  map: BrawlifyMap | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Map detail sheet. Re-fetches the *full* map record (with `stats` and
 * `teamStats`) from `/api/v1/brawlify/maps/:id` on open, falling back
 * to the lighter list payload while the detail loads.
 */
export default function MapSheet({ map, open, onClose }: Props) {
  const { t } = useTranslation();
  // Only enable the detail query while open, otherwise React Query keeps
  // the request in flight after the sheet closes.
  const { data: detail } = useMapQuery(open && map ? map.id : null);
  const enriched = detail?.data ?? map ?? null;

  useEffect(() => {
    if (!open) return;
    // Pre-warm: nothing to do — query auto-runs above.
  }, [open, map?.id]);

  return (
    <BottomSheet open={open && !!enriched} onClose={onClose} title={enriched?.name ?? ""}>
      {enriched && (
        <div className="space-y-5 pt-1">
          {enriched.imageUrl && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <OptimizedImage
                src={enriched.imageUrl}
                alt={enriched.name}
                width={420}
                height={560}
                responsiveWidths={[300, 600]}
                sizes="100vw"
                eager
                className="h-auto w-full object-contain"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Cell
              label={t("encyclopedia.map.mode")}
              value={enriched.gameMode?.name ?? "—"}
              accent={enriched.gameMode?.color}
            />
            <Cell
              label={t("encyclopedia.map.environment")}
              value={enriched.environment?.name ?? "—"}
            />
          </div>

          {enriched.credit && (
            <p className="text-[11px] italic text-slate-400">
              {t("encyclopedia.map.credit", { author: enriched.credit })}
            </p>
          )}

          {enriched.stats && enriched.stats.length > 0 ? (
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("encyclopedia.map.topBrawlers")}
              </p>
              <ul className="space-y-1.5">
                {[...enriched.stats]
                  .sort((a, b) => b.winRate - a.winRate)
                  .slice(0, 8)
                  .map((stat, idx) => (
                    <li
                      key={`${stat.brawler}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                    >
                      <span className="font-mono text-[11px] font-black text-slate-300">
                        #{idx + 1}
                      </span>
                      <span className="flex-1 truncate text-sm font-bold text-white">
                        ID {stat.brawler}
                      </span>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        {t("encyclopedia.map.winRate", {
                          value: stat.winRate.toFixed(1),
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-400">
              {t("encyclopedia.map.noStats")}
            </p>
          )}

          <p className="pt-1 text-center text-[10px] text-slate-500">
            {t("encyclopedia.credit")}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-sm font-bold"
        style={{ color: accent || "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}

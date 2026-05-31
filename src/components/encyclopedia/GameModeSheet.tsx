import BottomSheet from "../BottomSheet";
import OptimizedImage from "../ui/OptimizedImage";
import type { BrawlifyGameMode, BrawlifyMap } from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  mode: BrawlifyGameMode | null;
  open: boolean;
  onClose: () => void;
  /** All maps from the current dataset — we filter to this mode locally. */
  maps?: BrawlifyMap[];
  onSelectMap?: (map: BrawlifyMap) => void;
}

/**
 * Game mode detail sheet. Surfaces the Brawlify tutorial / description
 * plus the list of maps that currently use the mode (data we already
 * have in cache from the maps query).
 */
export default function GameModeSheet({
  mode,
  open,
  onClose,
  maps,
  onSelectMap,
}: Props) {
  const { t } = useTranslation();
  const accent = mode?.color || "#a78bfa";
  const modeMaps = mode
    ? (maps ?? []).filter(
        (m) => m.gameMode?.scId === mode.scId || m.gameMode?.id === mode.id
      )
    : [];

  return (
    <BottomSheet open={open && !!mode} onClose={onClose} title={mode?.name ?? ""}>
      {mode && (
        <div className="space-y-5 pt-1">
          <header className="overflow-hidden rounded-2xl border border-white/10">
            <div
              className="flex items-center gap-3 p-4"
              style={{
                background: `linear-gradient(135deg, ${accent}40, ${accent}10)`,
              }}
            >
              {mode.imageUrl && (
                <OptimizedImage
                  src={mode.imageUrl}
                  alt={mode.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-xl object-contain"
                />
              )}
              <div className="min-w-0">
                <p className="text-xl font-black uppercase tracking-wide text-white">
                  {mode.name}
                </p>
                {mode.shortDescription && (
                  <p className="text-xs text-slate-200/80">
                    {mode.shortDescription}
                  </p>
                )}
              </div>
            </div>
          </header>

          {(mode.tutorial || mode.description) && (
            <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("encyclopedia.mode.tutorial")}
              </p>
              <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                {mode.tutorial || mode.description}
              </p>
              <p className="text-[10px] italic text-slate-500">
                {t("encyclopedia.state.enDisclaimer")}
              </p>
            </section>
          )}

          {modeMaps.length > 0 && (
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("encyclopedia.mode.maps")} · {modeMaps.length}
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {modeMaps.slice(0, 12).map((map) => (
                  <li key={map.id}>
                    <button
                      type="button"
                      onClick={() => onSelectMap?.(map)}
                      className="flex w-full flex-col gap-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-1.5 text-left active:bg-white/10"
                    >
                      {map.imageUrl ? (
                        <OptimizedImage
                          src={map.imageUrl}
                          alt={map.name}
                          width={160}
                          height={120}
                          className="aspect-[4/3] w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="aspect-[4/3] w-full rounded-lg bg-white/5" />
                      )}
                      <p className="truncate px-1 pb-0.5 text-[11px] font-bold text-white">
                        {map.name}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="pt-1 text-center text-[10px] text-slate-500">
            {t("encyclopedia.credit")}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

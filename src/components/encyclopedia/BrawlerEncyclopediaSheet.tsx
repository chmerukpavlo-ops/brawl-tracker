import { ExternalLink, Sparkles, Wrench } from "lucide-react";
import BottomSheet from "../BottomSheet";
import OptimizedImage from "../ui/OptimizedImage";
import RarityBadge from "./RarityBadge";
import type {
  BrawlifyBrawler,
  BrawlifyGadget,
  BrawlifyStarPower,
} from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  brawler: BrawlifyBrawler | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Brawlify-backed brawler detail sheet for the Encyclopedia tab.
 * Pure reference data — no player progress overlay (that lives in the
 * existing `BrawlerDetailSheet` triggered from the Stats screen).
 */
export default function BrawlerEncyclopediaSheet({
  brawler,
  open,
  onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      open={open && !!brawler}
      onClose={onClose}
      title={brawler?.name ?? ""}
    >
      {brawler && (
        <div className="space-y-5 pt-1">
          <header className="flex flex-col items-center text-center">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-3xl"
              style={{
                background: `radial-gradient(110% 80% at 50% 30%, ${brawler.rarity?.color ?? "#7c3aed"}40, transparent 70%)`,
              }}
            >
              <OptimizedImage
                src={brawler.imageUrl}
                alt={brawler.name}
                width={224}
                height={224}
                responsiveWidths={[200, 320]}
                sizes="224px"
                eager
                className="h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
              />
            </div>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-wide text-white">
              {brawler.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <RarityBadge rarity={brawler.rarity} />
              {brawler.class?.name && (
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  {brawler.class.name}
                </span>
              )}
              {typeof brawler.unlock === "number" && brawler.unlock > 0 && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  {t("encyclopedia.brawler.unlock", {
                    trophies: String(brawler.unlock),
                  })}
                </span>
              )}
            </div>
          </header>

          {brawler.description && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("encyclopedia.brawler.description")}
              </p>
              <p className="text-sm leading-relaxed text-slate-200">
                {brawler.description}
              </p>
              <p className="mt-2 text-[10px] italic text-slate-500">
                {t("encyclopedia.state.enDisclaimer")}
              </p>
            </section>
          )}

          <KitSection
            title={t("encyclopedia.brawler.starPowers")}
            emptyLabel={t("encyclopedia.brawler.noStarPowers")}
            items={brawler.starPowers}
            tone="from-[#facc15]/15 to-transparent"
            icon={<Sparkles className="h-4 w-4 text-[#facc15]" />}
          />

          <KitSection
            title={t("encyclopedia.brawler.gadgets")}
            emptyLabel={t("encyclopedia.brawler.noGadgets")}
            items={brawler.gadgets}
            tone="from-emerald-400/15 to-transparent"
            icon={<Wrench className="h-4 w-4 text-emerald-300" />}
          />

          {brawler.link && (
            <a
              href={brawler.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200 transition-colors active:bg-white/10"
            >
              {t("encyclopedia.brawler.openInBrawlify")}
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>
          )}

          <p className="pt-1 text-center text-[10px] text-slate-500">
            {t("encyclopedia.credit")}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

interface KitSectionProps {
  title: string;
  emptyLabel: string;
  items: (BrawlifyStarPower | BrawlifyGadget)[];
  tone: string;
  icon: React.ReactNode;
}

function KitSection({ title, emptyLabel, items, tone, icon }: KitSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">
          {title}
        </h4>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex gap-3 rounded-xl border border-white/10 bg-gradient-to-br ${tone} p-3`}
            >
              {item.imageUrl && (
                <OptimizedImage
                  src={item.imageUrl}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-lg object-contain"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {item.name}
                </p>
                <p className="text-xs leading-relaxed text-slate-300">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

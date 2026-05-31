import { Award, ChevronUp, Sparkles, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, type ReactNode } from "react";
import type { BrawlerInfo, PlayerStats } from "../types";
import { brawlersMetadata } from "../types";
import BottomSheet from "./BottomSheet";
import BrawlerAvatar from "./BrawlerAvatar";
import AnimatedCounter from "./AnimatedCounter";
import ShareButton from "./ShareButton";
import { getRankTierName, getRarityStyle } from "../utils/rarityColors";
import { shareBrawlerPreset } from "../utils/sharePresets";
import { usePlayer } from "../context/PlayerContext";
import { haptic } from "../hooks/useHaptic";

interface BrawlerDetailSheetProps {
  brawler: BrawlerInfo | null;
  player?: PlayerStats;
  onClose: () => void;
}

export default function BrawlerDetailSheet({
  brawler,
  player,
  onClose,
}: BrawlerDetailSheetProps) {
  const { fetchAiCoach, setActiveTab } = usePlayer();
  const open = !!brawler;
  const meta = brawler ? brawlersMetadata[brawler.name] : undefined;
  const rarity = getRarityStyle(meta?.rarity);
  const displayName = meta?.name ?? brawler?.name ?? "Brawler";

  const handleAiAdvice = useCallback(() => {
    if (!brawler) return;
    haptic.medium();
    setActiveTab("stats");
    onClose();
    fetchAiCoach({ presetId: "brawler_deep_dive", brawler });
  }, [brawler, setActiveTab, onClose, fetchAiCoach]);

  const progress = brawler
    ? Math.min(
        100,
        Math.round(
          (brawler.trophies / Math.max(1, brawler.highestTrophies)) * 100
        )
      )
    : 0;
  const isRecord = !!brawler && brawler.trophies >= brawler.highestTrophies;
  const trophiesToRecord = brawler
    ? Math.max(0, brawler.highestTrophies - brawler.trophies)
    : 0;

  return (
    <BottomSheet open={open} onClose={onClose} title={displayName}>
      {brawler && (
        <div className="space-y-5 pt-2">
          <div className="relative flex flex-col items-center text-center">
            <div
              className={`pointer-events-none absolute left-1/2 top-2 -z-10 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl ${rarity.glow}`}
              aria-hidden
            />
            <BrawlerAvatar
              brawlerId={brawler.id}
              brawlerName={brawler.name}
              size={96}
              rounded="rounded-3xl"
              className="ring-2 ring-white/15"
            />
            <h3 className="mt-3 text-2xl font-black uppercase tracking-wide text-white">
              {displayName}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${rarity.bg} ${rarity.border} ${rarity.text}`}
              >
                {rarity.label}
              </span>
              {meta?.class && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {meta.class}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={<Zap className="h-4 w-4 text-cyan-400" />}
              label="Power"
              value={brawler.power}
              accent="text-cyan-300"
            />
            <StatTile
              icon={<Trophy className="h-4 w-4 text-[#facc15]" />}
              label="Кубки"
              value={brawler.trophies}
              accent="text-[#facc15]"
            />
            <StatTile
              icon={<Award className="h-4 w-4 text-[#a78bfa]" />}
              label={`Ранг · ${getRankTierName(brawler.rank)}`}
              value={brawler.rank}
              accent="text-[#a78bfa]"
            />
            <StatTile
              icon={<ChevronUp className="h-4 w-4 text-[#4ade80]" />}
              label="Рекорд"
              value={brawler.highestTrophies}
              accent="text-[#4ade80]"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                До рекорду
              </span>
              <span className="text-xs font-bold text-slate-300">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#f59e0b]"
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-400">
              {isRecord
                ? "🔥 Поточний рекорд!"
                : `Залишилось ${trophiesToRecord.toLocaleString("uk-UA")} кубків до особистого рекорду`}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#facc15]/70" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Гаджети та сили
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Дані про спорядження бійця з'являться у наступному оновленні.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAiAdvice}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#7c3aed]/40 bg-gradient-to-br from-[#7c3aed]/15 to-[#a78bfa]/5 p-4 text-left transition-transform active:scale-[0.98]"
            aria-label={`AI поради по бійцю ${displayName}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#facc15]/30 bg-[#facc15]/15 text-[#facc15]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  AI поради по бійцю
                </p>
                <p className="text-[10px] text-slate-400">
                  Сильні сторони, star power, гайд по матчапах
                </p>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 rotate-90 text-[#c4b5fd]" />
          </button>

          {player && (
            <ShareButton
              payload={() =>
                shareBrawlerPreset(brawler, {
                  name: player.name,
                  tag: player.tag,
                })
              }
              variant="primary"
              size="md"
              label="Поділитися бійцем"
              className="w-full"
              ariaLabel={`Поділитися бійцем ${displayName}`}
            />
          )}
        </div>
      )}
    </BottomSheet>
  );
}

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  accent: string;
}

function StatTile({ icon, label, value, accent }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {icon}
        <span className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <AnimatedCounter value={value} className={`text-lg font-black ${accent}`} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { BattleLogEntry } from "../../types/battle";
import {
  computeResult,
  findMyPlayerInBattle,
  getModeColor,
  getModeLabel,
  parseBattleTime,
} from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";
import { useI18n } from "../../context/I18nContext";
import { useLongPress } from "../../hooks/useLongPress";
import { haptic } from "../../hooks/useHaptic";
import BrawlerAvatar from "../BrawlerAvatar";
import { brawlersMetadata } from "../../types";
import ContextMenu, { type ContextMenuItem } from "../ContextMenu";

interface BattleListItemProps {
  entry: BattleLogEntry;
  myTag: string;
  onTap: (entry: BattleLogEntry) => void;
  /** When supplied, exposes "filter by this brawler" in the long-press menu. */
  onFilterByBrawler?: (brawlerId: number) => void;
  /** When supplied, exposes "filter by this mode". */
  onFilterByMode?: (mode: string) => void;
}

/**
 * One row in the battle log. Compact left/center/right composition
 * tuned for 360-wide screens. Supports long-press → context menu with
 * quick filter actions; primary tap opens the detail sheet.
 */
export default function BattleListItem({
  entry,
  myTag,
  onTap,
  onFilterByBrawler,
  onFilterByMode,
}: BattleListItemProps) {
  const { t } = useTranslation();
  const { formatRelativeTime } = useI18n();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const result = computeResult(entry);
  const me = useMemo(() => findMyPlayerInBattle(entry, myTag), [entry, myTag]);
  const modeColor = getModeColor(entry.battle.mode);
  const modeLabel = getModeLabel(entry.battle.mode, t as (k: string) => string);
  const brawlerDisplay = me
    ? brawlersMetadata[me.brawler.name]?.name ?? me.brawler.name
    : null;

  const time = parseBattleTime(entry.battleTime);

  const trophyChange = entry.battle.trophyChange;
  const deltaColor =
    typeof trophyChange === "number"
      ? trophyChange > 0
        ? "text-emerald-300"
        : trophyChange < 0
          ? "text-rose-300"
          : "text-slate-300"
      : "text-slate-500";
  const deltaText =
    typeof trophyChange === "number"
      ? trophyChange > 0
        ? `+${trophyChange}`
        : `${trophyChange}`
      : "—";

  const resultColor =
    result === "victory"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : result === "defeat"
        ? "border-rose-500/30 bg-rose-500/5"
        : "border-white/10 bg-white/[0.02]";
  const resultBadge =
    result === "victory"
      ? "bg-emerald-500/15 text-emerald-300"
      : result === "defeat"
        ? "bg-rose-500/15 text-rose-300"
        : "bg-slate-500/15 text-slate-300";
  const resultLabel =
    result === "victory"
      ? t("battles.result.victory")
      : result === "defeat"
        ? t("battles.result.defeat")
        : t("battles.result.draw");

  const subtitle = (() => {
    if (typeof entry.battle.rank === "number") {
      return t("battles.result.rank", { rank: entry.battle.rank });
    }
    const typeKey = `battles.type.${entry.battle.type}`;
    const fallback = entry.battle.type;
    const typeLabel = (t as (k: string) => string)(typeKey);
    return typeLabel === typeKey ? fallback : typeLabel;
  })();

  const longPress = useLongPress(
    (e) => {
      haptic.medium();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    { delay: 480 }
  );

  const ariaLabel = t("battles.item.relativeAria", {
    result: resultLabel,
    mode: modeLabel,
    map: entry.event.map ?? "—",
    delta: deltaText,
    time: formatRelativeTime(time),
  });

  const handleClick = () => {
    haptic.light();
    onTap(entry);
  };

  const menuItems = useMemo<ContextMenuItem[]>(() => {
    const items: ContextMenuItem[] = [];
    if (onFilterByMode) {
      items.push({
        id: "filter-mode",
        label: `${t("battles.filters.modes")}: ${modeLabel}`,
        onClick: () => onFilterByMode(entry.battle.mode),
      });
    }
    if (onFilterByBrawler && me?.brawler.id) {
      items.push({
        id: "filter-brawler",
        label: `${t("battles.filters.brawlers")}: ${brawlerDisplay ?? me.brawler.name}`,
        onClick: () => onFilterByBrawler(me.brawler.id),
      });
    }
    return items;
  }, [onFilterByMode, onFilterByBrawler, me, brawlerDisplay, modeLabel, entry.battle.mode, t]);

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        {...longPress}
        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-[0.99] ${resultColor}`}
      >
        {/* Mode chip + brawler avatar */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <BrawlerAvatar
            brawlerId={me?.brawler.id}
            brawlerName={me?.brawler.name}
            size={40}
            rounded="rounded-xl"
          />
          <span
            className={`max-w-[60px] truncate rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${modeColor.bg} ${modeColor.text}`}
            style={{ boxShadow: `inset 0 0 0 1px ${modeColor.accent}33` }}
          >
            {modeLabel}
          </span>
        </div>

        {/* Center text — map + brawler name */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black uppercase tracking-wide text-white">
            {entry.event.map ?? modeLabel}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {brawlerDisplay ?? "—"} · {subtitle}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500" suppressHydrationWarning>
            {formatRelativeTime(time)}
          </p>
        </div>

        {/* Right column — result + trophy delta */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-widest ${resultBadge}`}
          >
            {resultLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-black tabular-nums ${deltaColor}`}
          >
            <Trophy className="h-3 w-3" />
            {deltaText}
          </span>
        </div>
      </motion.button>

      {menu && menuItems.length > 0 && (
        <ContextMenu
          open={!!menu}
          anchor={menu}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

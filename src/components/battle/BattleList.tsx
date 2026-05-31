import { AnimatePresence, motion } from "motion/react";
import type { BattleLogEntry } from "../../types/battle";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../EmptyState";
import BattleListItem from "./BattleListItem";

interface BattleListProps {
  entries: BattleLogEntry[];
  myTag: string;
  /** True only when there is no underlying log at all (vs. filtered to zero). */
  isUnfilteredEmpty: boolean;
  onTap: (entry: BattleLogEntry) => void;
  onFilterByMode?: (mode: string) => void;
  onFilterByBrawler?: (brawlerId: number) => void;
  onClearFilters?: () => void;
}

/**
 * Renders the filtered battle list. Picks the right empty state based
 * on whether the user filtered everything out or has no battles at all.
 */
export default function BattleList({
  entries,
  myTag,
  isUnfilteredEmpty,
  onTap,
  onFilterByMode,
  onFilterByBrawler,
  onClearFilters,
}: BattleListProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    if (isUnfilteredEmpty) {
      return (
        <EmptyState
          compact
          illustration="🎮"
          title={t("battles.empty.title")}
          description={t("battles.empty.body")}
        />
      );
    }
    return (
      <EmptyState
        compact
        illustration="🔍"
        title={t("battles.emptyFiltered.title")}
        description={t("battles.emptyFiltered.body")}
        action={
          onClearFilters
            ? { label: t("battles.filters.clear"), onClick: onClearFilters }
            : undefined
        }
      />
    );
  }

  return (
    <motion.ul
      role="list"
      className="space-y-2"
      // Stagger via parent transitions so each row settles smoothly.
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.03, delayChildren: 0.05 },
        },
      }}
    >
      <AnimatePresence initial={false}>
        {entries.map((entry, idx) => (
          <li key={`${entry.battleTime}-${idx}`}>
            <BattleListItem
              entry={entry}
              myTag={myTag}
              onTap={onTap}
              onFilterByMode={onFilterByMode}
              onFilterByBrawler={onFilterByBrawler}
            />
          </li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

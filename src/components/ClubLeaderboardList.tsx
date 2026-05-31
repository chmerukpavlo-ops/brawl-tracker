import { forwardRef, useMemo } from "react";
import type { ClubRanking } from "../types";
import ClubLeaderboardRow from "./ClubLeaderboardRow";
import LeaderRowSkeleton from "./skeletons/LeaderRowSkeleton";
import EmptyState from "./EmptyState";
import BrawlerIllustration from "./illustrations/BrawlerIllustration";
import type { ContextMenuItem } from "./ContextMenu";
import { useTranslation } from "../hooks/useTranslation";

interface ClubLeaderboardListProps {
  rankings: ClubRanking[];
  isLoading?: boolean;
  myClubTag?: string | null;
  favoriteTags?: Set<string>;
  rowRefs?: Map<string, HTMLDivElement | null>;
  onSelectClub: (ranking: ClubRanking) => void;
  buildContextMenu?: (ranking: ClubRanking) => ContextMenuItem[] | undefined;
  /** Substring highlight forwarded to rows. */
  highlightQuery?: string;
  /** Tag (uppercase, no `#`) which should pulse briefly. */
  pulseTag?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
}

interface Group {
  id: string;
  label: string;
  range: string;
  items: ClubRanking[];
}

function groupRankings(
  rankings: ClubRanking[],
  labels: { top3: string; top10: string; top50: string; rest: string }
): Group[] {
  if (rankings.length === 0) return [];
  const top3 = rankings.filter((r) => r.rank <= 3);
  const top10 = rankings.filter((r) => r.rank > 3 && r.rank <= 10);
  const top50 = rankings.filter((r) => r.rank > 10 && r.rank <= 50);
  const rest = rankings.filter((r) => r.rank > 50);
  const groups: Group[] = [];
  if (top3.length > 0) groups.push({ id: "top3", label: labels.top3, range: "1–3", items: top3 });
  if (top10.length > 0) groups.push({ id: "top10", label: labels.top10, range: "4–10", items: top10 });
  if (top50.length > 0) groups.push({ id: "top50", label: labels.top50, range: "11–50", items: top50 });
  if (rest.length > 0) groups.push({ id: "rest", label: labels.rest, range: "51+", items: rest });
  return groups;
}

function normalizeTag(tag: string | null | undefined): string {
  return (tag ?? "").replace(/^#+/, "").toUpperCase();
}

const ClubLeaderboardList = forwardRef<HTMLDivElement, ClubLeaderboardListProps>(
  function ClubLeaderboardList(
    {
      rankings,
      isLoading = false,
      myClubTag,
      favoriteTags,
      rowRefs,
      onSelectClub,
      buildContextMenu,
      highlightQuery,
      pulseTag,
      emptyTitle,
      emptyDescription,
      emptyAction,
    },
    ref
  ) {
    const { t } = useTranslation();
    const labels = useMemo(
      () => ({
        top3: t("leaders.rankBands.top3"),
        top10: t("leaders.rankBands.top10"),
        top50: t("leaders.rankBands.top50"),
        rest: t("leaders.rankBands.rest"),
      }),
      [t]
    );
    const groups = useMemo(() => groupRankings(rankings, labels), [rankings, labels]);
    const myTag = normalizeTag(myClubTag);

    if (isLoading && rankings.length === 0) {
      return (
        <div ref={ref} className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LeaderRowSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!isLoading && rankings.length === 0) {
      return (
        <div ref={ref}>
          <EmptyState
            illustration={<BrawlerIllustration variant="leaderboard" />}
            title={emptyTitle ?? t("leaders.clubNotFoundInTop")}
            description={emptyDescription}
            action={emptyAction}
          />
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-5">
        {groups.map((group) => (
          <section key={group.id} className="space-y-2">
            <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-[#1a0a2e]/95 px-4 py-2 backdrop-blur">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#facc15]">
                {group.label}
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {group.range}
              </span>
            </header>
            <ul className="space-y-2">
              {group.items.map((r) => {
                const norm = normalizeTag(r.tag);
                const isMine = !!myTag && norm === myTag;
                const isFav = favoriteTags?.has(norm) ?? false;
                return (
                  <li key={r.tag}>
                    <ClubLeaderboardRow
                      ref={(el) => {
                        if (rowRefs) rowRefs.set(norm, el);
                      }}
                      ranking={r}
                      isMyClub={isMine}
                      isFavorite={isFav}
                      onTap={onSelectClub}
                      contextItems={buildContextMenu?.(r)}
                      highlight={highlightQuery}
                      pulse={!!pulseTag && norm === pulseTag.toUpperCase()}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
  }
);

export default ClubLeaderboardList;

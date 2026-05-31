import { useMemo, type MouseEvent } from "react";
import { ChevronRight, Shield, Trophy } from "lucide-react";
import { PlayerStats } from "../types";
import { usePlayer } from "../context/PlayerContext";
import AnimatedCounter from "./AnimatedCounter";
import BrawlerAvatar from "./BrawlerAvatar";
import TagBadge from "./TagBadge";
import FavoriteToggle from "./FavoriteToggle";
import MyPlayerToggle from "./MyPlayerToggle";
import TrophyChart from "./TrophyChart";
import { getSnapshots } from "../utils/trophyHistory";
import ShareButton from "./ShareButton";
import { sharePlayerPreset } from "../utils/sharePresets";
import { updateUrl } from "../navigation/urlState";

interface ProfileCardProps {
  player: PlayerStats;
  onClick?: () => void;
}

export default function ProfileCard({ player, onClick }: ProfileCardProps) {
  const { isMyPlayer, favorites, lastUpdated } = usePlayer();
  const sparklineData = useMemo(
    () => getSnapshots(player.tag, { limit: 60 }),
    // refresh sparkline whenever a new fetch lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player.tag, lastUpdated]
  );
  const topBrawler = [...(player.brawlers ?? [])].sort(
    (a, b) => b.trophies - a.trophies
  )[0];
  const isMine = isMyPlayer(player.tag);
  const favOverride = favorites.find(
    (f) => f.tag.replace(/^#+/, "").toUpperCase() === player.tag.replace(/^#+/, "").toUpperCase()
  );
  const customName = favOverride?.customName;
  const pinEmoji = favOverride?.iconEmoji;
  const pinColor = favOverride?.color;
  const displayName = customName || player.name;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`relative w-full cursor-pointer rounded-2xl border bg-gradient-to-br from-[#2d1b4e] to-[#2a1a4a] p-4 text-left shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-transform active:scale-[0.98] ${
        isMine ? "border-[#a78bfa]/40 ring-1 ring-[#a78bfa]/30" : "border-white/10"
      }`}
      style={
        pinColor
          ? {
              boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px ${pinColor}66, 0 0 24px ${pinColor}22`,
            }
          : undefined
      }
    >
      {isMine && (
        <span className="absolute -top-2 left-4 rounded-full bg-[#a78bfa] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#1a0a2e]">
          Мій
        </span>
      )}
      {pinEmoji && (
        <span
          className="absolute -top-2 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#1a0a2e] text-sm ring-2"
          style={{
            boxShadow: pinColor
              ? `0 0 0 2px ${pinColor}`
              : "0 0 0 2px rgba(250,204,21,0.6)",
          }}
          aria-hidden
        >
          {pinEmoji}
        </span>
      )}
      <div className="flex items-center gap-4">
        <BrawlerAvatar
          brawlerId={topBrawler?.id}
          brawlerName={topBrawler?.name}
          size={56}
          rounded="rounded-2xl"
          className="ring-2 ring-[#7c3aed]/30"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black uppercase tracking-wide text-white">
            {displayName}
          </h2>
          {customName && (
            <p className="truncate text-[10px] font-bold text-slate-500">
              {player.name}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-1.5">
            <TagBadge
              tag={player.tag}
              context="profile"
              playerName={player.name}
              trophies={player.trophies}
              className="!px-2 !py-0.5 text-[10px] !text-slate-400"
            />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#facc15]" />
            <AnimatedCounter
              value={player.trophies}
              className="text-base font-black text-[#facc15]"
            />
          </div>
          {player.club?.name && player.club?.tag && (
            <button
              type="button"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                updateUrl({
                  club: player.club!.tag!.replace(/^#/, "").toUpperCase(),
                });
              }}
              className="mt-1 inline-flex items-center gap-1 truncate text-[10px] font-medium text-slate-400 active:opacity-70"
              aria-label={`Відкрити клуб ${player.club.name}`}
            >
              <Shield className="h-3 w-3 text-[#a78bfa]" />
              <span className="truncate">{player.club.name}</span>
              <ChevronRight className="h-3 w-3 text-slate-500" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <FavoriteToggle tag={player.tag} player={player} size="sm" />
          <MyPlayerToggle tag={player.tag} size="sm" />
          <ShareButton
            payload={() => sharePlayerPreset(player)}
            variant="icon"
            size="sm"
            ariaLabel={`Поділитися профілем ${displayName}`}
          />
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
      </div>

      {sparklineData.length >= 2 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-1 h-6 opacity-50"
        >
          <TrophyChart
            snapshots={sparklineData}
            variant="sparkline"
            height={24}
            color="#facc15"
          />
        </div>
      )}
    </div>
  );
}

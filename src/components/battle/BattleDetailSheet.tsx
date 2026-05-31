import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Bot,
  Clock,
  ImageOff,
  Pin,
  Search,
  Star,
  Swords,
  Users,
} from "lucide-react";
import type {
  BattleLogEntry,
  BattlePlayer,
} from "../../types/battle";
import { brawlersMetadata } from "../../types";
import {
  computeResult,
  findMyPlayerInBattle,
  formatDuration,
  getMapImageUrl,
  getModeColor,
  getModeLabel,
  isAnonymousTag,
  parseBattleTime,
  splitTeams,
} from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";
import { useI18n } from "../../context/I18nContext";
import { usePlayer } from "../../context/PlayerContext";
import { useToast } from "../../context/ToastContext";
import { haptic } from "../../hooks/useHaptic";
import BottomSheet from "../BottomSheet";
import BrawlerAvatar from "../BrawlerAvatar";
import { usePrefetchPlayer } from "../../hooks/usePrefetchPlayer";

interface BattleDetailSheetProps {
  open: boolean;
  entry: BattleLogEntry | null;
  myTag: string;
  onClose: () => void;
}

/**
 * Fullscreen-ish bottom sheet showing every detail of a single match:
 * map preview, teams (or showdown player list), star player, duration,
 * type. Each opponent tag is tappable → confirms then searches that
 * player. Includes a CTA to ask the AI Coach about this specific match.
 */
export default function BattleDetailSheet({
  open,
  entry,
  myTag,
  onClose,
}: BattleDetailSheetProps) {
  const { t } = useTranslation();
  const { formatDate, formatRelativeTime } = useI18n();
  const { handleQuery, setActiveTab, addFavorite, isFavorite } = usePlayer();
  const { showInfo, showSuccess } = useToast();
  const prefetchPlayer = usePrefetchPlayer();
  const [searching, setSearching] = useState<string | null>(null);

  if (!entry) {
    return <BottomSheet open={open} onClose={onClose} title={t("battles.detail.title")}>{null}</BottomSheet>;
  }

  const result = computeResult(entry);
  const me = findMyPlayerInBattle(entry, myTag);
  const teams = splitTeams(entry, myTag);
  const modeColor = getModeColor(entry.battle.mode);
  const modeLabel = getModeLabel(entry.battle.mode, t as (k: string) => string);
  const time = parseBattleTime(entry.battleTime);
  const mapImage = getMapImageUrl(entry.event.id);

  const resultBadge =
    result === "victory"
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40"
      : result === "defeat"
        ? "bg-rose-500/20 text-rose-200 ring-rose-400/40"
        : "bg-slate-500/20 text-slate-200 ring-slate-400/40";
  const resultLabel =
    result === "victory"
      ? t("battles.result.victory")
      : result === "defeat"
        ? t("battles.result.defeat")
        : t("battles.result.draw");

  const typeKey = `battles.type.${entry.battle.type}`;
  const typeLabelRaw = (t as (k: string) => string)(typeKey);
  const typeLabel = typeLabelRaw === typeKey ? entry.battle.type : typeLabelRaw;

  const handleSearchPlayer = async (tag: string) => {
    if (isAnonymousTag(tag) || searching) return;
    haptic.medium();
    setSearching(tag);
    const ok = await handleQuery(tag, { navigateHome: false });
    setSearching(null);
    if (ok) {
      haptic.success();
      setActiveTab("stats");
      onClose();
    }
  };

  const handlePinPlayer = (player: BattlePlayer) => {
    haptic.light();
    if (isFavorite(player.tag)) {
      showInfo(t("pinned.pinned"));
      return;
    }
    const r = addFavorite(player.tag, {
      originalName: player.name,
      lastTrophies: player.brawler?.trophies,
    });
    if (r.added) {
      haptic.success();
      showSuccess(t("pinned.pinned"));
    }
  };

  const handleAskAi = () => {
    haptic.medium();
    showInfo(t("battles.detail.sharedAi"));
    setActiveTab("stats");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("battles.detail.title")}>
      <div className="space-y-4">
        {/* Header — mode chip + result */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${modeColor.bg} ${modeColor.text}`}
              style={{ boxShadow: `inset 0 0 0 1px ${modeColor.accent}40` }}
            >
              {modeLabel}
            </span>
            <h3 className="mt-2 truncate text-base font-black uppercase tracking-wide text-white">
              {entry.event.map ?? modeLabel}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {formatDate(time)} · {formatRelativeTime(time)}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ${resultBadge}`}
            >
              {resultLabel}
            </span>
            {typeof entry.battle.rank === "number" && (
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                {t("battles.result.rank", { rank: entry.battle.rank })}
              </p>
            )}
            {typeof entry.battle.trophyChange === "number" && (
              <p
                className={`mt-1 text-sm font-black tabular-nums ${
                  entry.battle.trophyChange > 0
                    ? "text-emerald-300"
                    : entry.battle.trophyChange < 0
                      ? "text-rose-300"
                      : "text-slate-300"
                }`}
              >
                {entry.battle.trophyChange > 0 ? "+" : ""}
                {entry.battle.trophyChange}
              </p>
            )}
          </div>
        </div>

        {/* Map preview */}
        <MapPreview src={mapImage} mapName={entry.event.map} />

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2">
          <MetaCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label={t("battles.detail.durationLabel")}
            value={formatDuration(entry.battle.duration)}
          />
          <MetaCard
            icon={<Swords className="h-3.5 w-3.5" />}
            label={t("battles.detail.typeLabel")}
            value={typeLabel}
          />
        </div>

        {/* Star player */}
        {entry.battle.starPlayer && (
          <div className="rounded-2xl border border-[#facc15]/30 bg-gradient-to-br from-[#facc15]/10 to-transparent p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#facc15]">
              <Star className="h-3.5 w-3.5 fill-[#facc15] text-[#facc15]" />
              {t("battles.detail.starPlayer")}
            </p>
            <p className="mt-1 truncate text-sm font-black text-white">
              {entry.battle.starPlayer.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {brawlersMetadata[entry.battle.starPlayer.brawler.name]?.name ??
                entry.battle.starPlayer.brawler.name}{" "}
              · Pwr {entry.battle.starPlayer.brawler.power}
            </p>
          </div>
        )}

        {/* Teams / players */}
        {teams ? (
          <>
            <PlayerSection
              icon={<Users className="h-3.5 w-3.5" />}
              title={t("battles.detail.myTeam")}
              players={teams.my}
              myTag={myTag}
              accent="text-emerald-300"
              onSearch={handleSearchPlayer}
              onPin={handlePinPlayer}
              onPrefetch={prefetchPlayer}
              searching={searching}
            />
            <PlayerSection
              icon={<Swords className="h-3.5 w-3.5" />}
              title={t("battles.detail.opponents")}
              players={teams.opponents}
              myTag={myTag}
              accent="text-rose-300"
              onSearch={handleSearchPlayer}
              onPin={handlePinPlayer}
              onPrefetch={prefetchPlayer}
              searching={searching}
            />
          </>
        ) : entry.battle.players && entry.battle.players.length > 0 ? (
          <PlayerSection
            icon={<Users className="h-3.5 w-3.5" />}
            title={t("battles.detail.players")}
            players={entry.battle.players}
            myTag={myTag}
            accent="text-slate-300"
            onSearch={handleSearchPlayer}
            onPin={handlePinPlayer}
            onPrefetch={prefetchPlayer}
            searching={searching}
            withRank={typeof entry.battle.rank === "number"}
          />
        ) : null}

        {/* Bottom CTA */}
        <button
          type="button"
          onClick={handleAskAi}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/10 text-[12px] font-black uppercase tracking-wider text-fuchsia-100 active:scale-95"
        >
          <Bot className="h-4 w-4" />
          {t("battles.detail.askAi")}
        </button>

        {me && (
          <p className="text-center text-[10px] text-slate-500">
            {brawlersMetadata[me.brawler.name]?.name ?? me.brawler.name} · Pwr {me.brawler.power} · {me.brawler.trophies}🏆
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

function MapPreview({
  src,
  mapName,
}: {
  src: string | null;
  mapName: string | null;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#1a0a2e] text-center">
        <div>
          <ImageOff className="mx-auto h-5 w-5 text-slate-500" />
          <p className="mt-1 text-[11px] text-slate-500">{mapName ?? "—"}</p>
        </div>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative h-32 overflow-hidden rounded-2xl border border-white/10 bg-[#1a0a2e]"
    >
      <img
        src={src}
        alt={mapName ?? ""}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a0a2e]/90 via-transparent to-transparent" />
      {mapName && (
        <p className="absolute bottom-2 left-3 truncate pr-3 text-[11px] font-black uppercase tracking-widest text-white drop-shadow-lg">
          {mapName}
        </p>
      )}
    </motion.div>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

interface PlayerSectionProps {
  icon: ReactNode;
  title: string;
  players: BattlePlayer[];
  myTag: string;
  accent: string;
  onSearch: (tag: string) => void;
  onPin: (player: BattlePlayer) => void;
  onPrefetch: (tag: string) => void;
  searching: string | null;
  withRank?: boolean;
}

function PlayerSection({
  icon,
  title,
  players,
  myTag,
  accent,
  onSearch,
  onPin,
  onPrefetch,
  searching,
  withRank,
}: PlayerSectionProps) {
  return (
    <section>
      <p
        className={`mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent}`}
      >
        {icon}
        {title}
      </p>
      <ul role="list" className="space-y-1.5">
        {players.map((p, idx) => (
          <li key={`${p.tag}-${idx}`}>
            <PlayerRow
              player={p}
              rank={withRank ? idx + 1 : undefined}
              isMe={p.tag.toUpperCase() === myTag.toUpperCase()}
              isSearching={searching === p.tag}
              onSearch={() => onSearch(p.tag)}
              onPin={() => onPin(p)}
              onPrefetch={() => onPrefetch(p.tag)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayerRow({
  player,
  rank,
  isMe,
  isSearching,
  onSearch,
  onPin,
  onPrefetch,
}: {
  player: BattlePlayer;
  rank?: number;
  isMe: boolean;
  isSearching: boolean;
  onSearch: () => void;
  onPin: () => void;
  onPrefetch: () => void;
}) {
  const displayBrawler =
    brawlersMetadata[player.brawler.name]?.name ?? player.brawler.name;
  const anonymous = isAnonymousTag(player.tag);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-2.5 ${
        isMe
          ? "border-[#facc15]/40 bg-[#facc15]/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {typeof rank === "number" && (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
            rank <= 3
              ? "bg-[#facc15]/20 text-[#facc15]"
              : "bg-white/5 text-slate-400"
          }`}
        >
          {rank}
        </span>
      )}

      <BrawlerAvatar
        brawlerId={player.brawler.id}
        brawlerName={player.brawler.name}
        size={32}
        rounded="rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[12px] font-black text-white">
          {player.name}
          {isMe && (
            <span className="rounded-full bg-[#facc15]/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-widest text-[#facc15]">
              YOU
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-[10.5px] text-slate-400">
          {displayBrawler} · Pwr {player.brawler.power} · {player.brawler.trophies}🏆
        </p>
      </div>

      {!isMe && !anonymous && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onPin}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-[#facc15] active:scale-95"
            aria-label={`Pin ${player.name}`}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onSearch}
            onPointerEnter={onPrefetch}
            disabled={isSearching}
            className="flex h-8 items-center gap-1 rounded-lg bg-[#facc15]/15 px-2 text-[10px] font-black uppercase tracking-wider text-[#facc15] disabled:opacity-50 active:scale-95"
            aria-label={`Find ${player.name}`}
          >
            <Search className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

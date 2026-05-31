import React, { useMemo, useState } from "react";
import {
  Trophy,
  Users,
  User,
  Zap,
  Search,
  ChevronDown,
  ChevronRight,
  Pin,
  Shield,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { PlayerStats, BrawlerInfo, brawlersMetadata } from "../types";
import AnimatedCounter from "./AnimatedCounter";
import BrawlerAvatar from "./BrawlerAvatar";
import BrawlersGridSkeleton from "./skeletons/BrawlersGridSkeleton";
import EmptyState from "./EmptyState";
import TagBadge from "./TagBadge";
import FavoriteToggle from "./FavoriteToggle";
import MyPlayerToggle from "./MyPlayerToggle";
import ShareButton from "./ShareButton";
import EditPinSheet from "./EditPinSheet";
import { sharePlayerPreset } from "../utils/sharePresets";
import { updateUrl } from "../navigation/urlState";
import { usePlayer } from "../context/PlayerContext";
import { useTranslation } from "../hooks/useTranslation";

const DEFAULT_VISIBLE = 6;

interface PlayerProfileProps {
  player: PlayerStats;
  beforeBrawlers?: React.ReactNode;
}

function parseNameColor(nameColor?: string) {
  if (!nameColor) return undefined;
  const hex = nameColor.replace(/^0x/i, "").replace(/^ff/i, "");
  return `#${hex}`;
}

function getTrophyStyle(trophies: number) {
  if (trophies > 750) {
    return "border-[#facc15]/50 shadow-[0_0_24px_rgba(250,204,21,0.22)] bg-gradient-to-br from-[#facc15]/10 to-transparent";
  }
  if (trophies > 500) {
    return "border-[#7c3aed]/45 shadow-[0_0_20px_rgba(124,58,237,0.25)] bg-gradient-to-br from-[#7c3aed]/10 to-transparent";
  }
  return "border-white/10 bg-[#2a1a4a]/60";
}

function BrawlerCard({
  brawler,
  onClick,
}: {
  brawler: BrawlerInfo;
  onClick?: () => void;
}) {
  const meta = brawlersMetadata[brawler.name];
  const displayName = meta?.name ?? brawler.name;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Деталі бійця ${displayName}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`w-full rounded-2xl border p-3.5 text-left backdrop-blur-md transition-colors active:scale-[0.98] ${getTrophyStyle(brawler.trophies)}`}
    >
      <div className="flex items-start gap-3">
        <BrawlerAvatar brawlerId={brawler.id} brawlerName={brawler.name} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold uppercase tracking-wide text-white">
            {displayName}
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {meta?.rarity ?? "Brawler"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">Power {brawler.power}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-[#facc15]" />
          <span className="text-sm font-black text-[#facc15]">
            {brawler.trophies.toLocaleString("uk-UA")}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function PlayerProfile({ player, beforeBrawlers }: PlayerProfileProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"trophies" | "power" | "name">("trophies");
  const [expanded, setExpanded] = useState(false);
  const [editPinOpen, setEditPinOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const { pinned } = usePlayer();
  const { t } = useTranslation();
  const pin = pinned.getPin(player.tag);
  const note = pin?.note?.trim();

  const openBrawler = (brawler: BrawlerInfo) => {
    updateUrl({ brawler: brawler.id });
  };

  const filteredBrawlers = useMemo(() => {
    return [...(player.brawlers ?? [])]
      .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b[sortBy] - a[sortBy];
      });
  }, [player.brawlers, search, sortBy]);

  const visibleBrawlers = expanded
    ? filteredBrawlers
    : filteredBrawlers.slice(0, DEFAULT_VISIBLE);

  const canExpand = filteredBrawlers.length > DEFAULT_VISIBLE;

  const stats = [
    { label: "3v3", sub: "Перемоги", value: player["3vs3Victories"], icon: Users, accent: "text-[#60a5fa]" },
    { label: "Solo", sub: "Перемоги", value: player.soloVictories, icon: User, accent: "text-[#a78bfa]" },
    { label: "Duo", sub: "Перемоги", value: player.duoVictories, icon: Users, accent: "text-[#4ade80]" },
    { label: "Рекорд", sub: "Кубки", value: player.highestTrophies, icon: Trophy, accent: "text-[#facc15]" },
  ];

  return (
    <div className="w-full space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2d1b4e] to-[#2a1a4a] p-6 shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#facc15]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#7c3aed]/15 blur-3xl" />

        <div className="relative">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <TagBadge
              tag={player.tag}
              context="profile"
              playerName={player.name}
              trophies={player.trophies}
            />
            <span className="rounded-full bg-[#facc15]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#facc15] ring-1 ring-[#facc15]/20">
              Lvl {player.expLevel}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <FavoriteToggle tag={player.tag} player={player} size="sm" />
              {pin && (
                <button
                  type="button"
                  onClick={() => setEditPinOpen(true)}
                  aria-label={t("pinned.edit")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#facc15]/40 bg-[#facc15]/10 text-[#facc15] active:scale-90"
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              )}
              <MyPlayerToggle tag={player.tag} size="sm" />
              <ShareButton
                payload={() => sharePlayerPreset(player)}
                variant="icon"
                size="sm"
                ariaLabel={`Поділитися профілем ${player.name}`}
              />
            </div>
          </div>

          <h1
            className="text-2xl font-black uppercase leading-tight tracking-tight text-white"
            style={{ color: parseNameColor(player.nameColor) }}
          >
            {pin?.customName?.trim() || player.name}
          </h1>
          {pin?.customName?.trim() && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {player.name}
            </p>
          )}

          {note && (
            <button
              type="button"
              onClick={() => setNoteOpen((o) => !o)}
              aria-expanded={noteOpen}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left active:scale-[0.99]"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Pencil className="h-3 w-3" />
                {t("pinned.note")}
              </div>
              <p
                className={`whitespace-pre-line text-[12px] italic text-slate-300 ${
                  noteOpen ? "" : "line-clamp-3"
                }`}
              >
                {note}
              </p>
            </button>
          )}

          {player.club?.name && player.club?.tag && (
            <button
              type="button"
              onClick={() => {
                updateUrl({ club: player.club!.tag!.replace(/^#/, "").toUpperCase() });
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 active:scale-95"
              aria-label={`Відкрити клуб ${player.club.name}`}
            >
              <Shield className="h-3.5 w-3.5 text-[#a78bfa]" />
              <span>Клуб · <span className="font-bold text-white">{player.club.name}</span></span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
          {player.club?.name && !player.club?.tag && (
            <p className="mt-2 text-xs font-medium text-slate-400">
              Клуб · <span className="font-bold text-slate-200">{player.club.name}</span>
            </p>
          )}

          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-[#facc15]/25 bg-[#facc15]/10 px-4 py-3 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#facc15]/20 ring-1 ring-[#facc15]/30">
              <Trophy className="h-5 w-5 text-[#facc15]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#facc15]/70">
                Загальні кубки
              </p>
              <AnimatedCounter value={player.trophies} className="text-2xl font-black text-[#facc15]" />
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <stat.icon className={`h-4 w-4 ${stat.accent}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {stat.label}
              </span>
            </div>
            <AnimatedCounter value={stat.value} className="text-xl font-black text-white" />
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{stat.sub}</p>
          </motion.div>
        ))}
      </section>

      {beforeBrawlers}

      <section className="rounded-3xl border border-white/10 bg-[#2a1a4a] p-5">
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Бравлери</h2>
            <p className="text-[11px] text-slate-500">{filteredBrawlers.length} у колекції</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Пошук..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a0a2e]/60 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
              />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-xl border border-white/10 bg-[#1a0a2e]/60 py-2 pl-3 pr-8 text-xs font-bold uppercase text-slate-300 outline-none focus:border-[#facc15]/40"
              >
                <option value="trophies">Кубки</option>
                <option value="power">Сила</option>
                <option value="name">Ім'я</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#facc15]/60 ring-1 ring-[#facc15]/50" />
            &gt;750 кубків
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#7c3aed]/60 ring-1 ring-[#7c3aed]/50" />
            &gt;500 кубків
          </span>
        </div>

        <motion.div layout className="overflow-hidden">
          {!player.brawlers ? (
            <BrawlersGridSkeleton count={6} />
          ) : filteredBrawlers.length > 0 ? (
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-2 gap-3"
                transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
              >
                <AnimatePresence mode="popLayout">
                  {visibleBrawlers.map((brawler) => (
                    <React.Fragment key={brawler.id}>
                      <BrawlerCard
                        brawler={brawler}
                        onClick={() => openBrawler(brawler)}
                      />
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          ) : (
            <EmptyState
              compact
              illustration="🔍"
              title="Нічого не знайдено"
              description={search ? `За запитом "${search}" нічого немає` : undefined}
              action={
                search
                  ? {
                      label: "Скинути пошук",
                      onClick: () => setSearch(""),
                      variant: "secondary",
                    }
                  : undefined
              }
            />
          )}
        </motion.div>

        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1a0a2e]/40 text-xs font-black uppercase tracking-wider text-slate-300 active:scale-[0.98]"
          >
            {expanded ? "Згорнути" : `Показати всі (${filteredBrawlers.length})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </section>
      <EditPinSheet
        tag={editPinOpen ? player.tag : null}
        onClose={() => setEditPinOpen(false)}
      />
    </div>
  );
}

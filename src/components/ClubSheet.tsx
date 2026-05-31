import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  BarChart3,
  Bot,
  ChevronDown,
  Crown,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import EmptyState from "./EmptyState";
import ClubBadge from "./ClubBadge";
import ClubMemberRow from "./ClubMemberRow";
import ShareButton from "./ShareButton";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useUrlState } from "../hooks/useUrlState";
import { updateUrl } from "../navigation/urlState";
import { haptic } from "../hooks/useHaptic";
import { trackAchievementEvent } from "../hooks/useAchievements";
import {
  calculateClubStats,
  getClubTypeLabel,
  getClubTypeStyle,
  getRoleLabel,
  sortMembersByRole,
  sortMembersByTrophies,
} from "../utils/clubMetrics";
import { shareClubPreset } from "../utils/sharePresets";

type ClubTabId = "members" | "top" | "info" | "ai";

const TABS: Array<{ id: ClubTabId; label: string; icon: ReactNode }> = [
  { id: "members", label: "Учасники", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "top", label: "Топ-10", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "info", label: "Інфо", icon: <Info className="h-3.5 w-3.5" /> },
  { id: "ai", label: "AI", icon: <Bot className="h-3.5 w-3.5" /> },
];

export default function ClubSheet() {
  const urlState = useUrlState();
  const {
    clubInfo,
    isClubLoading,
    clubError,
    fetchClub,
    handleQuery,
    myPlayer,
    playerData,
  } = usePlayer();
  const { showInfo, showError } = useToast();
  const [tab, setTab] = useState<ClubTabId>("members");
  const [memberSort, setMemberSort] = useState<"trophies" | "role">("trophies");
  const [descExpanded, setDescExpanded] = useState(false);

  const open = !!urlState.club;
  const targetTag = urlState.club ?? null;
  const currentTag = clubInfo?.tag.replace(/^#/, "").toUpperCase() ?? null;
  const ready = open && clubInfo && targetTag === currentTag;

  // Fetch when URL changes.
  useEffect(() => {
    if (!targetTag) return;
    if (currentTag === targetTag) return;
    fetchClub(targetTag, { silent: true }).then((ok) => {
      if (!ok) {
        showError("Не вдалося завантажити клуб");
      }
    });
  }, [targetTag, currentTag, fetchClub, showError]);

  // Reset internal state when sheet (re)opens.
  useEffect(() => {
    if (open) {
      setTab("members");
      setDescExpanded(false);
      setMemberSort("trophies");
    }
  }, [open, targetTag]);

  const close = useCallback(() => {
    updateUrl({ club: undefined });
  }, []);

  const stats = useMemo(() => calculateClubStats(clubInfo), [clubInfo]);
  const sortedMembers = useMemo(() => {
    if (!clubInfo) return [];
    return memberSort === "trophies"
      ? sortMembersByTrophies(clubInfo.members)
      : sortMembersByRole(clubInfo.members);
  }, [clubInfo, memberSort]);
  const topMembers = useMemo(
    () => (clubInfo ? sortMembersByTrophies(clubInfo.members).slice(0, 10) : []),
    [clubInfo]
  );

  const handleSelectMember = useCallback(
    async (tag: string) => {
      trackAchievementEvent("club_member_open");
      close();
      const ok = await handleQuery(tag, { navigateHome: true });
      if (!ok) {
        showError("Профіль недоступний");
      } else {
        showInfo("Переключено профіль");
      }
    },
    [handleQuery, close, showError, showInfo]
  );

  const handleReload = useCallback(() => {
    if (!targetTag) return;
    haptic.light();
    fetchClub(targetTag, { forceFresh: true });
  }, [targetTag, fetchClub]);

  const typeStyle = clubInfo ? getClubTypeStyle(clubInfo.type) : null;

  return (
    <BottomSheet open={open} onClose={close} title="Клуб">
      <div className="space-y-4 pt-2">
        {isClubLoading && !ready && (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Завантажуємо клуб...
          </div>
        )}

        {clubError && !ready && (
          <div className="space-y-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <p className="font-bold">{clubError}</p>
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-200 active:scale-95"
            >
              <RefreshCw className="h-3 w-3" />
              Спробувати ще
            </button>
          </div>
        )}

        {ready && clubInfo && typeStyle && (
          <>
            <header className="space-y-3">
              <div className="flex items-start gap-3">
                <ClubBadge club={clubInfo} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-black uppercase tracking-wide text-white">
                    {clubInfo.name}
                  </h2>
                  <p className="truncate text-[11px] text-slate-500">
                    {clubInfo.tag}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                    >
                      {getClubTypeLabel(clubInfo.type)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#facc15]/30 bg-[#facc15]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#facc15]">
                      <Trophy className="h-3 w-3" />
                      {clubInfo.requiredTrophies.toLocaleString("uk-UA")}+
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReload}
                  aria-label="Оновити"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-95"
                >
                  {isClubLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>

              {clubInfo.description && (
                <DescriptionBlock
                  description={clubInfo.description}
                  expanded={descExpanded}
                  onToggle={() => setDescExpanded((v) => !v)}
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Учасники"
                  value={`${stats.memberCount}/30`}
                  icon={<Users className="h-4 w-4 text-[#a78bfa]" />}
                  accent="text-[#c4b5fd]"
                  progress={stats.fillRatio}
                />
                <StatTile
                  label="Сума кубків"
                  value={stats.totalTrophies.toLocaleString("uk-UA")}
                  icon={<Trophy className="h-4 w-4 text-[#facc15]" />}
                  accent="text-[#facc15]"
                />
                <StatTile
                  label="Середнє"
                  value={stats.avgTrophies.toLocaleString("uk-UA")}
                  icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                  accent="text-emerald-300"
                />
                {stats.topPlayer && (
                  <StatTile
                    label={`Топ: ${stats.topPlayer.name}`}
                    value={stats.topPlayer.trophies.toLocaleString("uk-UA")}
                    icon={<Crown className="h-4 w-4 text-[#facc15]" />}
                    accent="text-[#facc15]"
                  />
                )}
              </div>
            </header>

            <div className="flex gap-1.5 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      haptic.light();
                    }}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      active
                        ? "bg-[#7c3aed] text-white shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                        : "text-slate-400 active:text-slate-200"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {tab === "members" && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {sortedMembers.length} учасників
                      </p>
                      <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
                        {(
                          [
                            { id: "trophies", label: "За кубками" },
                            { id: "role", label: "За роллю" },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setMemberSort(s.id)}
                            className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                              memberSort === s.id
                                ? "bg-[#7c3aed] text-white"
                                : "text-slate-400"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {sortedMembers.length === 0 ? (
                      <EmptyState
                        compact
                        illustration="🏚️"
                        title="Клуб порожній"
                        description="Поки що в цьому клубі немає учасників"
                      />
                    ) : (
                      <ul className="space-y-2">
                        {sortedMembers.map((m, idx) => (
                          <li key={m.tag}>
                            <ClubMemberRow
                              member={m}
                              rank={memberSort === "trophies" ? idx + 1 : undefined}
                              onSelect={handleSelectMember}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {tab === "top" && (
                  <ul className="space-y-2">
                    {topMembers.map((m, idx) => (
                      <li key={m.tag}>
                        <ClubMemberRow
                          member={m}
                          rank={idx + 1}
                          onSelect={handleSelectMember}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {tab === "info" && (
                  <div className="space-y-3">
                    <InfoRow label="Тип" value={getClubTypeLabel(clubInfo.type)} />
                    <InfoRow
                      label="Вимога"
                      value={`${clubInfo.requiredTrophies.toLocaleString("uk-UA")} кубків`}
                    />
                    <InfoRow
                      label="Загалом кубків"
                      value={stats.totalTrophies.toLocaleString("uk-UA")}
                    />
                    <InfoRow
                      label="Середній учасник"
                      value={stats.avgTrophies.toLocaleString("uk-UA")}
                    />
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Розподіл ролей
                      </p>
                      <div className="space-y-1.5">
                        {(["president", "vicePresident", "senior", "member"] as const).map(
                          (role) => {
                            const count = stats.roles[role];
                            const ratio = stats.memberCount
                              ? count / stats.memberCount
                              : 0;
                            return (
                              <div key={role}>
                                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">
                                    {getRoleLabel(role)}
                                  </span>
                                  <span className="font-black text-slate-200">
                                    {count}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ratio * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full bg-[#a78bfa]"
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "ai" && (
                  <AiClubAnalysis clubInfo={clubInfo} myTag={myPlayer.tag ?? playerData?.tag} />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="pt-2">
              <ShareButton
                variant="pill"
                size="md"
                label="Поділитися клубом"
                payload={() => shareClubPreset(clubInfo)}
                className="w-full justify-center"
                ariaLabel="Поділитися клубом"
              />
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function DescriptionBlock({
  description,
  expanded,
  onToggle,
}: {
  description: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isLong = description.length > 140;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p
        className={`text-xs leading-relaxed text-slate-300 ${
          !expanded && isLong ? "line-clamp-3" : ""
        }`}
      >
        {description}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#a78bfa] active:opacity-70"
        >
          {expanded ? "Згорнути" : "Показати більше"}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
  progress,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {icon}
        <span className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className={`text-base font-black ${accent}`}>{value}</p>
      {typeof progress === "number" && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, progress) * 100}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-[#a78bfa]"
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}

function AiClubAnalysis({
  clubInfo,
  myTag,
}: {
  clubInfo: import("../types").ClubInfo;
  myTag?: string | null;
}) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const ask = useCallback(async () => {
    setLoading(true);
    haptic.light();
    setAdvice(null);
    try {
      const currentLocale = (() => {
        try {
          const v = localStorage.getItem("brawl_locale");
          return v === "en" ? "en" : "uk";
        } catch {
          return "uk";
        }
      })();
      const res = await fetch("/api/gemini/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubInfo, myTag, locale: currentLocale }),
      });
      if (!res.ok) throw new Error("AI failed");
      const data = await res.json();
      setAdvice(data.advice || "AI замислився. Спробуй ще.");
      haptic.success();
    } catch {
      showError("Не вдалося отримати AI-аналіз");
      haptic.error();
    } finally {
      setLoading(false);
    }
  }, [clubInfo, myTag, showError]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#facc15] text-sm font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {loading ? "Аналізую..." : advice ? "Запитати ще раз" : "AI-аналіз клубу"}
      </button>

      {advice && (
        <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-300">
          {advice.split("\n").map((line, idx) => {
            if (line.trim().startsWith("###")) {
              return (
                <h4
                  key={idx}
                  className="mt-3 text-xs font-black uppercase tracking-widest text-[#facc15]"
                >
                  {line.replace(/^###\s*/, "").trim()}
                </h4>
              );
            }
            if (line.includes("**")) {
              const parts = line.split("**");
              return (
                <p key={idx} className="my-1.5">
                  {parts.map((part, pIdx) =>
                    pIdx % 2 === 1 ? (
                      <strong key={pIdx} className="text-[#facc15]">
                        {part}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            }
            return (
              <p key={idx} className="my-1 text-slate-400">
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

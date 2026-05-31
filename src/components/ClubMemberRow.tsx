import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Crown,
  Pin,
  Search,
  Share2,
  Shield,
  Star,
  StarOff,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type { ClubMember, ClubRole } from "../types";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";
import { useLongPress } from "../hooks/useLongPress";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { getRoleStyle, getRoleLabel } from "../utils/clubMetrics";
import { buildPlayerShareUrl, shareData } from "../utils/share";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";

interface ClubMemberRowProps {
  member: ClubMember;
  rank?: number;
  onSelect: (tag: string) => void;
}

function RoleIcon({ role }: { role: ClubRole | string }) {
  if (role === "president") return <Crown className="h-3 w-3" />;
  if (role === "vicePresident") return <Shield className="h-3 w-3" />;
  if (role === "senior") return <Star className="h-3 w-3" />;
  return <UserIcon className="h-3 w-3" />;
}

export default function ClubMemberRow({
  member,
  rank,
  onSelect,
}: ClubMemberRowProps) {
  const { isMyPlayer, setMyPlayer, isFavorite, addFavorite, removeFavorite } =
    usePlayer();
  const { showSuccess, showError, showInfo } = useToast();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const open = !!anchor;

  const isMe = isMyPlayer(member.tag);
  const roleStyle = getRoleStyle(member.role);

  const handleLong = useCallback(
    (pos: { clientX: number; clientY: number }) => {
      haptic.medium();
      trackAchievementEvent("long_press");
      setAnchor({ x: pos.clientX, y: pos.clientY });
    },
    []
  );
  const longPress = useLongPress(handleLong);

  const handleSelect = useCallback(() => {
    if (open) return;
    haptic.light();
    onSelect(member.tag);
  }, [open, onSelect, member.tag]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(member.tag);
      haptic.light();
      showSuccess("Тег скопійовано");
      trackAchievementEvent("copy_tag");
    } catch {
      showError("Не вдалося скопіювати тег");
    }
  }, [member.tag, showSuccess, showError]);

  const handleShare = useCallback(async () => {
    const text = `🏆 ${member.name} (${member.tag}) — ${member.trophies.toLocaleString("uk-UA")} кубків`;
    const res = await shareData({
      title: `${member.name} — Brawl Stats`,
      text,
      url: buildPlayerShareUrl(member.tag),
    });
    if (res.success && res.method === "clipboard") {
      showSuccess("Посилання скопійовано");
    }
  }, [member.name, member.tag, member.trophies, showSuccess]);

  const handleToggleFavorite = useCallback(() => {
    if (isFavorite(member.tag)) {
      removeFavorite(member.tag);
      haptic.medium();
      showInfo("Прибрано з улюблених");
    } else {
      const result = addFavorite(member.tag, {
        customName: member.name,
        lastTrophies: member.trophies,
      });
      if (result.limitReached) {
        haptic.error();
        showError("Досягнуто ліміт 20 улюблених");
        return;
      }
      haptic.light();
      showSuccess("Додано в улюблені");
    }
  }, [
    isFavorite,
    removeFavorite,
    addFavorite,
    member.tag,
    member.name,
    member.trophies,
    showSuccess,
    showInfo,
    showError,
  ]);

  const handleMakeMine = useCallback(() => {
    setMyPlayer(member.tag, member.name);
    haptic.success();
    showSuccess("Профіль збережено як основний");
  }, [setMyPlayer, member.tag, member.name, showSuccess]);

  const items = useMemo<ContextMenuItem[]>(() => {
    const favorited = isFavorite(member.tag);
    return [
      {
        id: "open",
        label: "Переглянути профіль",
        icon: <Search className="h-4 w-4 text-[#a78bfa]" />,
        onClick: () => onSelect(member.tag),
      },
      {
        id: "copy",
        label: "Копіювати тег",
        icon: <Copy className="h-4 w-4 text-slate-400" />,
        onClick: handleCopy,
      },
      {
        id: "share",
        label: "Поділитися",
        icon: <Share2 className="h-4 w-4 text-[#60a5fa]" />,
        onClick: handleShare,
      },
      {
        id: "favorite",
        label: favorited ? "Прибрати з улюблених" : "Додати в улюблені",
        icon: favorited ? (
          <StarOff className="h-4 w-4 text-slate-400" />
        ) : (
          <Star className="h-4 w-4 text-[#facc15]" />
        ),
        onClick: handleToggleFavorite,
      },
      {
        id: "make-mine",
        label: "Зробити моїм профілем",
        icon: <Pin className="h-4 w-4 text-[#a78bfa]" />,
        onClick: handleMakeMine,
        disabled: isMe,
      },
    ];
  }, [
    isFavorite,
    member.tag,
    onSelect,
    handleCopy,
    handleShare,
    handleToggleFavorite,
    handleMakeMine,
    isMe,
  ]);

  return (
    <>
      <motion.button
        type="button"
        layout
        onClick={handleSelect}
        {...longPress}
        style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
        className={`group relative flex w-full items-center gap-3 rounded-2xl border bg-white/[0.03] p-3 text-left transition-colors active:scale-[0.98] ${
          isMe
            ? "border-[#facc15]/40 ring-1 ring-[#facc15]/40 shadow-[0_0_18px_rgba(250,204,21,0.25)]"
            : "border-white/10"
        }`}
        aria-label={`Профіль ${member.name}`}
      >
        {typeof rank === "number" && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase tracking-widest ${
              rank === 1
                ? "bg-[#facc15] text-[#1a0a2e]"
                : rank === 2
                ? "bg-slate-300 text-[#1a0a2e]"
                : rank === 3
                ? "bg-[#cd7f32] text-[#1a0a2e]"
                : "bg-white/10 text-slate-300"
            }`}
          >
            {rank}
          </span>
        )}
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a0a2e] ring-1 ring-white/10">
          <UserIcon className="h-5 w-5 text-slate-400" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{member.name}</p>
            {isMe && (
              <span className="rounded-full bg-[#facc15] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#1a0a2e]">
                Це ти
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[2px] text-[9px] font-black uppercase tracking-widest ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
            >
              <RoleIcon role={member.role} />
              {getRoleLabel(member.role)}
            </span>
            <span className="truncate text-[10px] text-slate-500">{member.tag}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[#facc15]">
          <Trophy className="h-3.5 w-3.5" />
          <span className="text-sm font-black">
            {member.trophies.toLocaleString("uk-UA")}
          </span>
        </div>
      </motion.button>
      <ContextMenu open={open} anchor={anchor} items={items} onClose={() => setAnchor(null)} />
    </>
  );
}

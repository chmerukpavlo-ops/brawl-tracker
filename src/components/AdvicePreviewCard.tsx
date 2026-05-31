import { useCallback, useMemo, useState } from "react";
import {
  ChevronRight,
  Copy,
  Pin,
  PinOff,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import type { SavedAdvice } from "../types";
import { CATEGORY_STYLE } from "../data/aiPrompts";
import { getPresetIcon } from "../data/aiPromptIcons";
import { formatRelativeUk } from "../utils/dateUtils";
import { haptic } from "../hooks/useHaptic";
import { useLongPress } from "../hooks/useLongPress";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";

interface AdvicePreviewCardProps {
  advice: SavedAdvice;
  onOpen: () => void;
  onTogglePin?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  highlighted?: boolean;
}

function plainPreview(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/[*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AdvicePreviewCard({
  advice,
  onOpen,
  onTogglePin,
  onShare,
  onDelete,
  onCopy,
  highlighted,
}: AdvicePreviewCardProps) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const open = !!anchor;

  const preview = useMemo(() => {
    const cleaned = plainPreview(advice.advice);
    return cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned;
  }, [advice.advice]);

  const style =
    advice.presetCategory && advice.presetCategory in CATEGORY_STYLE
      ? CATEGORY_STYLE[advice.presetCategory as keyof typeof CATEGORY_STYLE]
      : { bg: "bg-[#7c3aed]/15", text: "text-[#c4b5fd]", border: "border-[#7c3aed]/30", glow: "" };
  const Icon = getPresetIcon(advice.presetIcon);

  const handleLong = useCallback(
    (pos: { clientX: number; clientY: number }) => {
      haptic.medium();
      setAnchor({ x: pos.clientX, y: pos.clientY });
    },
    []
  );
  const longPress = useLongPress(handleLong);

  const items = useMemo<ContextMenuItem[]>(() => {
    const list: ContextMenuItem[] = [
      {
        id: "open",
        label: "Переглянути",
        icon: <ChevronRight className="h-4 w-4 text-[#a78bfa]" />,
        onClick: onOpen,
      },
    ];
    if (onTogglePin) {
      list.push({
        id: "pin",
        label: advice.isPinned ? "Зняти закріплення" : "Закріпити",
        icon: advice.isPinned ? (
          <PinOff className="h-4 w-4 text-slate-400" />
        ) : (
          <Pin className="h-4 w-4 text-[#facc15]" />
        ),
        onClick: onTogglePin,
      });
    }
    if (onShare) {
      list.push({
        id: "share",
        label: "Поділитися",
        icon: <Share2 className="h-4 w-4 text-[#60a5fa]" />,
        onClick: onShare,
      });
    }
    if (onCopy) {
      list.push({
        id: "copy",
        label: "Копіювати текст",
        icon: <Copy className="h-4 w-4 text-slate-400" />,
        onClick: onCopy,
      });
    }
    if (onDelete) {
      list.push({
        id: "delete",
        label: "Видалити",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: onDelete,
        variant: "danger",
        divider: true,
      });
    }
    return list;
  }, [onOpen, onTogglePin, onShare, onCopy, onDelete, advice.isPinned]);

  return (
    <>
      <motion.button
        type="button"
        layout
        onClick={() => {
          if (open) return;
          haptic.light();
          onOpen();
        }}
        {...longPress}
        style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
        className={`group relative w-full overflow-hidden rounded-2xl border bg-[#2a1a4a] p-3.5 text-left transition-transform active:scale-[0.98] ${
          highlighted
            ? "border-[#facc15]/50 ring-1 ring-[#facc15]/30 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
            : "border-white/10"
        }`}
        aria-label={`Порада ${advice.presetTitle ?? "AI"} для ${advice.playerName}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.bg} ${style.border}`}
          >
            <Icon className={`h-4 w-4 ${style.text}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="line-clamp-1 text-sm font-black uppercase tracking-wide text-white">
                {advice.presetTitle ?? "Загальний аналіз"}
              </h4>
              {advice.isPinned ? (
                <Pin className="h-3.5 w-3.5 shrink-0 rotate-12 fill-[#facc15] text-[#facc15]" />
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="truncate font-bold text-slate-300">
                {advice.playerName}
              </span>
              <span>·</span>
              <Trophy className="h-3 w-3 text-[#facc15]" />
              <span>{advice.playerTrophies.toLocaleString("uk-UA")}</span>
              <span>·</span>
              <span>{formatRelativeUk(advice.createdAt)}</span>
            </div>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
          {preview || "Порожня порада"}
        </p>

        {(advice.brawlerName || (advice.tags && advice.tags.length > 0)) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {advice.brawlerName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300">
                <Sparkles className="h-2.5 w-2.5" />
                {advice.brawlerName}
              </span>
            )}
            {advice.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-300 ring-1 ring-white/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </motion.button>
      <ContextMenu
        open={open}
        anchor={anchor}
        items={items}
        onClose={() => setAnchor(null)}
      />
    </>
  );
}

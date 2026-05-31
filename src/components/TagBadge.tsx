import React, { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Copy,
  FolderInput,
  Pencil,
  Pin,
  Search,
  Share2,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useLongPress } from "../hooks/useLongPress";
import { usePrefetchPlayer } from "../hooks/usePrefetchPlayer";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";
import { trackAchievementEvent } from "../hooks/useAchievements";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import EditPinSheet from "./EditPinSheet";
import { useTranslation } from "../hooks/useTranslation";
import { buildPlayerShareUrl, shareData } from "../utils/share";

export type TagContext = "profile" | "history" | "leaderboard" | "general";

interface TagBadgeProps {
  key?: React.Key;
  tag: string;
  context?: TagContext;
  playerName?: string;
  trophies?: number;
  children?: ReactNode;
  className?: string;
  onShortPress?: () => void;
}

const DEFAULT_BADGE_CLASS =
  "inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-white/10";

export default function TagBadge({
  tag,
  context = "general",
  playerName,
  trophies,
  children,
  className = "",
  onShortPress,
}: TagBadgeProps) {
  const {
    handleQuery,
    removeFromHistory,
    isMyPlayer,
    setMyPlayer,
    isFavorite,
    addFavorite,
    removeFavorite,
    pinned,
  } = usePlayer();
  const { showSuccess, showError, showInfo } = useToast();
  const { t } = useTranslation();
  const prefetchPlayer = usePrefetchPlayer();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [editPinOpen, setEditPinOpen] = useState(false);

  const open = !!anchor;

  const closeMenu = useCallback(() => setAnchor(null), []);

  const handleLong = useCallback(
    (pos: { clientX: number; clientY: number }) => {
      haptic.medium();
      trackAchievementEvent("long_press");
      setAnchor({ x: pos.clientX, y: pos.clientY });
    },
    []
  );

  const longPress = useLongPress(handleLong);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tag);
      haptic.light();
      showSuccess("Тег скопійовано");
    } catch {
      showError("Не вдалося скопіювати тег");
    }
  }, [tag, showSuccess, showError]);

  const handleSearch = useCallback(() => {
    handleQuery(tag);
  }, [handleQuery, tag]);

  const handleShare = useCallback(async () => {
    const name = playerName || tag;
    const text = trophies
      ? `🏆 ${name} (${tag}) — ${trophies.toLocaleString("uk-UA")} кубків`
      : `${name} (${tag})`;
    const result = await shareData({
      title: `${name} — Brawl Stats`,
      text,
      url: buildPlayerShareUrl(tag),
    });
    if (!result.success && !result.cancelled) {
      showError("Не вдалося поділитися");
      return;
    }
    if (result.success && result.method === "clipboard") {
      haptic.light();
      showSuccess("Посилання скопійовано");
    }
  }, [playerName, tag, trophies, showSuccess, showError]);

  const handleRemove = useCallback(() => {
    removeFromHistory(tag);
    haptic.heavy();
    showSuccess("Видалено з історії");
  }, [removeFromHistory, tag, showSuccess]);

  const handleMakeMine = useCallback(() => {
    setMyPlayer(tag);
    haptic.success();
    showSuccess("Профіль збережено як основний");
  }, [setMyPlayer, tag, showSuccess]);

  const handleToggleFavorite = useCallback(() => {
    if (isFavorite(tag)) {
      removeFavorite(tag);
      haptic.medium();
      showInfo("Прибрано з улюблених");
    } else {
      const result = addFavorite(tag, { customName: playerName, lastTrophies: trophies });
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
    addFavorite,
    removeFavorite,
    tag,
    playerName,
    trophies,
    showSuccess,
    showError,
    showInfo,
  ]);

  const items = useMemo<ContextMenuItem[]>(() => {
    const copy: ContextMenuItem = {
      id: "copy",
      label: "Копіювати тег",
      icon: <Copy className="h-4 w-4 text-slate-400" />,
      onClick: handleCopy,
    };
    const search: ContextMenuItem = {
      id: "search",
      label: "Шукати",
      icon: <Search className="h-4 w-4 text-[#a78bfa]" />,
      onClick: handleSearch,
    };
    const share: ContextMenuItem = {
      id: "share",
      label: "Поділитися",
      icon: <Share2 className="h-4 w-4 text-[#60a5fa]" />,
      onClick: handleShare,
    };
    const makeMine: ContextMenuItem = {
      id: "make-mine",
      label: "Зробити моїм профілем",
      icon: <Pin className="h-4 w-4 text-[#a78bfa]" />,
      onClick: handleMakeMine,
      disabled: isMyPlayer(tag),
    };
    const favorited = isFavorite(tag);
    const favorite: ContextMenuItem = {
      id: "favorite",
      label: favorited ? t("pinned.unpinPlayer") : t("pinned.pinPlayer"),
      icon: favorited ? (
        <StarOff className="h-4 w-4 text-slate-400" />
      ) : (
        <Star className="h-4 w-4 text-[#facc15]" />
      ),
      onClick: handleToggleFavorite,
    };
    const editPin: ContextMenuItem = {
      id: "edit-pin",
      label: t("pinned.rename"),
      icon: <Pencil className="h-4 w-4 text-[#facc15]" />,
      onClick: () => setEditPinOpen(true),
      disabled: !favorited,
    };
    const moveGroup: ContextMenuItem = {
      id: "move-group",
      label: t("pinned.moveToGroup"),
      icon: <FolderInput className="h-4 w-4 text-[#a78bfa]" />,
      onClick: () => setEditPinOpen(true),
      disabled: !favorited || pinned.groups.length === 0,
    };
    const remove: ContextMenuItem = {
      id: "remove",
      label: "Видалити з історії",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleRemove,
      variant: "danger",
      divider: true,
    };

    switch (context) {
      case "profile":
        return [copy, share, favorite, editPin, moveGroup, makeMine];
      case "history":
        return [search, copy, share, favorite, editPin, remove];
      case "leaderboard":
        return [search, copy, share, favorite, editPin];
      case "general":
      default:
        return [search, copy, share, favorite, editPin];
    }
  }, [
    context,
    handleCopy,
    handleSearch,
    handleShare,
    handleMakeMine,
    handleRemove,
    handleToggleFavorite,
    isMyPlayer,
    isFavorite,
    pinned.groups.length,
    t,
    tag,
  ]);

  const handleClick = useCallback(() => {
    if (open) return;
    onShortPress?.();
  }, [open, onShortPress]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleClick}
        onPointerEnter={() => prefetchPlayer(tag)}
        {...longPress}
        className={
          children
            ? `inline-block select-none ${className}`
            : `${DEFAULT_BADGE_CLASS} select-none active:scale-95 ${className}`
        }
        style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
      >
        {children ?? tag}
      </button>
      <ContextMenu open={open} anchor={anchor} items={items} onClose={closeMenu} />
      <EditPinSheet
        tag={editPinOpen ? tag : null}
        onClose={() => setEditPinOpen(false)}
      />
    </>
  );
}

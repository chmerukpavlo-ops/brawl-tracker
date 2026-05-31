import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import BottomSheet from "./BottomSheet";
import PinnedPlayerCard from "./PinnedPlayerCard";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { haptic } from "../hooks/useHaptic";
import { loadPlayerCache } from "../utils/playerCache";
import {
  PIN_COLOR_PALETTE,
  PIN_EMOJI_PALETTE,
  PIN_NAME_LIMIT,
  PIN_NOTE_LIMIT,
  type FavoritePlayer,
} from "../types";

interface EditPinSheetProps {
  /** Tag (with or without `#`) of the pinned player to edit. */
  tag: string | null;
  onClose: () => void;
}

export default function EditPinSheet({ tag, onClose }: EditPinSheetProps) {
  const {
    pinned,
    updateFavorite,
    removeFavorite,
  } = usePlayer();
  const { t } = useTranslation();
  const { showSuccess, showInfo, showError } = useToast();

  const pin = useMemo<FavoritePlayer | undefined>(
    () => (tag ? pinned.getPin(tag) : undefined),
    [pinned, tag]
  );

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [groupId, setGroupId] = useState<string | undefined>();
  const [tagsInput, setTagsInput] = useState("");
  const [note, setNote] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    if (!pin) return;
    setName(pin.customName ?? "");
    setEmoji(pin.iconEmoji);
    setColor(pin.color);
    setGroupId(pin.groupId);
    setTagsInput((pin.tags ?? []).join(", "));
    setNote(pin.note ?? "");
    setCreatingGroup(false);
    setNewGroupName("");
  }, [pin]);

  if (!pin) {
    return (
      <BottomSheet open={false} onClose={onClose}>
        {null}
      </BottomSheet>
    );
  }

  const cached = loadPlayerCache(pin.tag);

  const previewPin: FavoritePlayer = {
    ...pin,
    customName: name.trim() || undefined,
    iconEmoji: emoji,
    color,
    groupId,
    note: note.trim() || undefined,
    tags: tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6),
  };

  const handleSave = () => {
    const hadNote = !!pin.note?.trim();
    const willHaveNote = !!note.trim();
    updateFavorite(pin.tag, {
      customName: name,
      iconEmoji: emoji,
      color,
      groupId,
      note,
      tags: tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (!hadNote && willHaveNote) {
      trackAchievementEvent("pin_note_added");
    }
    haptic.success();
    showSuccess(t("pinned.saved"));
    onClose();
  };

  const handleRemove = () => {
    removeFavorite(pin.tag);
    haptic.heavy();
    showInfo(t("pinned.unpinned"));
    onClose();
  };

  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const result = pinned.createGroup(trimmed);
    if (result.limitReached) {
      showError(t("pinned.groupsLimitReached"));
      return;
    }
    if (result.group) {
      setGroupId(result.group.id);
      setCreatingGroup(false);
      setNewGroupName("");
      trackAchievementEvent("pin_group_created");
    }
  };

  return (
    <BottomSheet
      open={!!tag}
      onClose={onClose}
      title={`${t("pinned.title")} ${pin.tag}`}
    >
      <div className="space-y-4 pt-1">
        <div>
          <PinnedPlayerCard
            pin={previewPin}
            liveName={cached?.data.name}
            liveTrophies={cached?.data.trophies}
            onTap={() => {}}
            variant="full"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.customName")}
          </label>
          <input
            type="text"
            value={name}
            maxLength={PIN_NAME_LIMIT}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("pinned.customNamePlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
          />
          <p className="mt-1 text-right text-[10px] text-slate-500">
            {name.length} / {PIN_NAME_LIMIT}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.icon")}
          </label>
          <div className="grid grid-cols-8 gap-1.5">
            {PIN_EMOJI_PALETTE.map((e) => {
              const active = emoji === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(active ? undefined : e)}
                  className={`flex h-9 items-center justify-center rounded-lg text-lg transition-all active:scale-90 ${
                    active
                      ? "bg-[#facc15]/15 ring-1 ring-[#facc15]/60"
                      : "bg-white/5"
                  }`}
                  aria-pressed={active}
                  aria-label={`Іконка ${e}`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.color")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setColor(undefined)}
              aria-pressed={!color}
              className={`flex h-8 min-w-[44px] items-center justify-center rounded-lg border text-[10px] font-black uppercase tracking-widest active:scale-90 ${
                !color
                  ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                  : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {t("common.none")}
            </button>
            {PIN_COLOR_PALETTE.map((c) => {
              const active = color === c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-pressed={active}
                  aria-label={c.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform active:scale-90 ${
                    active ? "ring-2 ring-white/80" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.group")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroupId(undefined)}
              aria-pressed={!groupId}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider active:scale-95 ${
                !groupId
                  ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {t("pinned.noGroup")}
            </button>
            {pinned.groups.map((g) => {
              const active = groupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider active:scale-95 ${
                    active
                      ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                  style={
                    active && g.color
                      ? { borderColor: `${g.color}99`, color: g.color }
                      : undefined
                  }
                >
                  {g.emoji && <span aria-hidden>{g.emoji}</span>}
                  {g.name}
                </button>
              );
            })}
            {!creatingGroup ? (
              <button
                type="button"
                onClick={() => setCreatingGroup(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-white/20 bg-white/[0.02] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
              >
                <Plus className="h-3 w-3" />
                {t("pinned.createGroupShort")}
              </button>
            ) : null}
          </div>
          {creatingGroup && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t("pinned.newGroupNamePlaceholder")}
                className="flex-1 rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                className="min-h-[36px] rounded-xl bg-[#facc15] px-3 text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingGroup(false);
                  setNewGroupName("");
                }}
                aria-label={t("common.cancel")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.tags")}
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={t("pinned.tagsPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t("pinned.note")}
          </label>
          <textarea
            value={note}
            maxLength={PIN_NOTE_LIMIT}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("pinned.notePlaceholder")}
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
          />
          <p className="mt-1 text-right text-[10px] text-slate-500">
            {note.length} / {PIN_NOTE_LIMIT}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-300 active:scale-95"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-[2] rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
          >
            {t("common.save")}
          </button>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-black uppercase tracking-wider text-rose-300 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          {t("pinned.unpinPlayer")}
        </button>

        <p className="text-center text-[10px] text-slate-500">
          {t("pinned.privacyHint")}
        </p>
      </div>
    </BottomSheet>
  );
}

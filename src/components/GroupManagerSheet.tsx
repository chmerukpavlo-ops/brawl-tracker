import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { haptic } from "../hooks/useHaptic";
import {
  PINNED_GROUPS_LIMIT,
  PIN_COLOR_PALETTE,
  PIN_EMOJI_PALETTE,
  PIN_GROUP_NAME_LIMIT,
  type PinnedGroup,
} from "../types";

interface GroupManagerSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function GroupManagerSheet({ open, onClose }: GroupManagerSheetProps) {
  const { pinned } = usePlayer();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState<string | undefined>();
  const [editColor, setEditColor] = useState<string | undefined>();
  const [pendingDelete, setPendingDelete] = useState<PinnedGroup | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of pinned.pinned) {
      if (p.groupId) out[p.groupId] = (out[p.groupId] ?? 0) + 1;
    }
    return out;
  }, [pinned.pinned]);

  const handleCreate = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    const r = pinned.createGroup(trimmed);
    if (r.limitReached) {
      showError(t("pinned.groupsLimitReached"));
      return;
    }
    if (r.group) {
      trackAchievementEvent("pin_group_created");
      showSuccess(r.group.name);
      setDraftName("");
    }
  };

  const startEdit = (g: PinnedGroup) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditEmoji(g.emoji);
    setEditColor(g.color);
  };

  const saveEdit = () => {
    if (!editingId) return;
    pinned.updateGroup(editingId, {
      name: editName,
      emoji: editEmoji,
      color: editColor,
    });
    setEditingId(null);
    haptic.success();
  };

  const confirmDelete = (mode: "remove" | "ungroup" | "reassign") => {
    if (!pendingDelete) return;
    if (mode === "remove") {
      pinned.deleteGroup(pendingDelete.id, { removeMembers: true });
    } else if (mode === "ungroup") {
      pinned.deleteGroup(pendingDelete.id, { reassignTo: null });
    } else {
      pinned.deleteGroup(pendingDelete.id, { reassignTo: reassignTarget });
    }
    setPendingDelete(null);
    setReassignTarget(null);
    haptic.heavy();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("pinned.groupsTitle")}>
      <div className="space-y-4 pt-1">
        <p className="text-[11px] text-slate-400">
          {t("pinned.groupsLimit", {
            count: pinned.groups.length,
            limit: PINNED_GROUPS_LIMIT,
          })}
        </p>

        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={PIN_GROUP_NAME_LIMIT}
            placeholder={t("pinned.newGroupNamePlaceholder")}
            className="flex-1 rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!draftName.trim() || pinned.groups.length >= PINNED_GROUPS_LIMIT}
            className="flex min-h-[40px] items-center gap-1 rounded-xl bg-[#facc15] px-3 text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("pinned.createGroup")}
          </button>
        </div>

        <ul className="space-y-2">
          {pinned.groups.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-slate-400">
              {t("pinned.empty")}
            </li>
          )}

          {pinned.groups.map((g) => {
            const isEditing = editingId === g.id;
            const memberCount = counts[g.id] ?? 0;
            return (
              <motion.li
                key={g.id}
                layout
                className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-3"
                style={
                  g.color
                    ? { boxShadow: `inset 3px 0 0 ${g.color}` }
                    : undefined
                }
              >
                {!isEditing ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a0a2e] text-lg ring-1 ring-white/10">
                      {g.emoji ?? "📁"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase text-white">
                        {g.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {t("pinned.membersOf", { count: memberCount })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      aria-label={t("pinned.edit")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-90"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(g)}
                      aria-label={t("pinned.deleteGroup")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 active:scale-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      maxLength={PIN_GROUP_NAME_LIMIT}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2 text-sm text-white outline-none focus:border-[#facc15]/40"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditEmoji(undefined)}
                        aria-pressed={!editEmoji}
                        className={`flex h-8 min-w-[44px] items-center justify-center rounded-lg border text-[10px] font-black uppercase tracking-widest active:scale-90 ${
                          !editEmoji
                            ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                            : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {t("common.none")}
                      </button>
                      {PIN_EMOJI_PALETTE.slice(0, 10).map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEditEmoji(e)}
                          aria-pressed={editEmoji === e}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all active:scale-90 ${
                            editEmoji === e
                              ? "bg-[#facc15]/15 ring-1 ring-[#facc15]/60"
                              : "bg-white/5"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditColor(undefined)}
                        aria-pressed={!editColor}
                        className={`flex h-7 min-w-[44px] items-center justify-center rounded-lg border text-[10px] font-black uppercase tracking-widest active:scale-90 ${
                          !editColor
                            ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                            : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {t("common.none")}
                      </button>
                      {PIN_COLOR_PALETTE.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditColor(c.hex)}
                          aria-pressed={editColor === c.hex}
                          aria-label={c.label}
                          className={`h-7 w-7 rounded-lg active:scale-90 ${
                            editColor === c.hex ? "ring-2 ring-white/80" : ""
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-[40px] flex-1 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="min-h-[40px] flex-[2] rounded-xl bg-[#facc15] text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95"
                      >
                        {t("common.save")}
                      </button>
                    </div>
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>

        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3"
          >
            <p className="text-xs font-black text-rose-200">
              {t("pinned.deleteGroupConfirm", {
                count: counts[pendingDelete.id] ?? 0,
              })}
            </p>
            <button
              type="button"
              onClick={() => confirmDelete("remove")}
              className="w-full min-h-[40px] rounded-xl border border-rose-500/40 bg-rose-500/15 text-[11px] font-black uppercase tracking-wider text-rose-200 active:scale-95"
            >
              {t("pinned.deleteGroupOptionRemove")}
            </button>
            <button
              type="button"
              onClick={() => confirmDelete("ungroup")}
              className="w-full min-h-[40px] rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95"
            >
              {t("pinned.deleteGroupOptionUngroup")}
            </button>
            {pinned.groups.filter((g) => g.id !== pendingDelete.id).length > 0 && (
              <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
                <summary className="flex cursor-pointer items-center justify-between font-black uppercase tracking-wider">
                  {t("pinned.deleteGroupOptionMove")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pinned.groups
                    .filter((g) => g.id !== pendingDelete.id)
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setReassignTarget(g.id);
                          confirmDelete("reassign");
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95"
                      >
                        {g.emoji ?? "📁"} {g.name}
                      </button>
                    ))}
                </div>
              </details>
            )}
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="w-full min-h-[36px] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 active:scale-95"
            >
              {t("common.cancel")}
            </button>
          </motion.div>
        )}
      </div>
    </BottomSheet>
  );
}

import { useState } from "react";
import { Download, FolderOpen, Pin, Sparkles, Trash2, Upload } from "lucide-react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { haptic } from "../hooks/useHaptic";
import { loadPlayerCache } from "../utils/playerCache";
import { copyToClipboard } from "../utils/share";
import EditPinSheet from "./EditPinSheet";
import GroupManagerSheet from "./GroupManagerSheet";
import PinnedPlayerCard from "./PinnedPlayerCard";
import EmptyState from "./EmptyState";
import type { ContextMenuItem } from "./ContextMenu";
import type { FavoritePlayer } from "../types";

export default function PinnedPlayersList() {
  const { pinned, handleQuery, setActiveTab } = usePlayer();
  const { showSuccess, showInfo, showError } = useToast();
  const { t } = useTranslation();

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");

  const handleClose = () => setEditingTag(null);

  const handleSelect = async (pin: FavoritePlayer) => {
    const ok = await handleQuery(pin.tag, { navigateHome: false });
    if (ok) setActiveTab("home");
    else showError(t("leaders.failedLoadProfile"));
  };

  const handleRemove = (pin: FavoritePlayer) => {
    pinned.removeFavorite(pin.tag);
    haptic.heavy();
    showInfo(t("pinned.unpinned"));
  };

  const buildContextMenu = (pin: FavoritePlayer): ContextMenuItem[] => [
    {
      id: "open",
      label: t("common.open"),
      icon: <Sparkles className="h-4 w-4 text-[#a78bfa]" />,
      onClick: () => handleSelect(pin),
    },
    {
      id: "rename",
      label: t("pinned.rename"),
      icon: <Pin className="h-4 w-4 text-[#facc15]" />,
      onClick: () => setEditingTag(pin.tag),
    },
    {
      id: "remove",
      label: t("pinned.remove"),
      icon: <Trash2 className="h-4 w-4 text-rose-300" />,
      variant: "danger",
      onClick: () => handleRemove(pin),
    },
  ];

  const handleExport = async () => {
    const json = pinned.exportPins();
    const ok = await copyToClipboard(json);
    if (ok) showSuccess(t("toast.linkCopied"));
    else showError(t("errors.generic"));
  };

  const handleImport = () => {
    const summary = pinned.importPins(importJson.trim());
    if (summary.errors.length > 0) {
      showError(
        `${t("pinned.importErrors", { errors: summary.errors.join(", ") })}`
      );
    }
    showSuccess(
      t("pinned.importDone", {
        added: summary.added,
        skipped: summary.skipped,
      })
    );
    setImportJson("");
    setImportOpen(false);
  };

  if (pinned.pinned.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          compact
          illustration="📌"
          title={t("pinned.empty")}
          description={t("pinned.emptyHint")}
        />
        <button
          type="button"
          onClick={() => setGroupSheetOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {t("pinned.groupsTitle")}
        </button>
        <GroupManagerSheet
          open={groupSheetOpen}
          onClose={() => setGroupSheetOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {t("pinned.fullSectionTitle")} ·{" "}
          {t("pinned.countLabel", {
            count: pinned.pinned.length,
            limit: pinned.limits.players,
          })}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGroupSheetOpen(true)}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
          >
            {t("pinned.groupsTitle")}
          </button>
          <button
            type="button"
            onClick={() => setReorderMode((r) => !r)}
            aria-pressed={reorderMode}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider active:scale-95 ${
              reorderMode
                ? "border-[#facc15]/60 bg-[#facc15]/10 text-[#facc15]"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {reorderMode ? t("pinned.reorderModeOff") : t("pinned.reorderMode")}
          </button>
        </div>
      </div>

      {reorderMode ? (
        <Reorder.Group
          axis="y"
          values={pinned.pinned}
          onReorder={(next) => {
            // Compute index moves between old and new.
            const oldOrder = pinned.pinned.map((p) => p.tag);
            const newOrder = next.map((p) => p.tag);
            for (let i = 0; i < newOrder.length; i++) {
              if (oldOrder[i] !== newOrder[i]) {
                const from = oldOrder.indexOf(newOrder[i]);
                pinned.reorderFavorites(from, i);
                haptic.selection();
                return;
              }
            }
          }}
          className="space-y-2"
        >
          {pinned.pinned.map((pin) => (
            <Reorder.Item
              key={pin.tag}
              value={pin}
              className="cursor-grab active:cursor-grabbing"
            >
              <PinnedPlayerCard
                pin={pin}
                liveName={loadPlayerCache(pin.tag)?.data.name}
                liveTrophies={loadPlayerCache(pin.tag)?.data.trophies}
                onTap={() => {}}
                reorderable
                rightSlot={
                  <span className="flex h-8 w-8 items-center justify-center text-slate-500">
                    ⠿
                  </span>
                }
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <AnimatePresence initial={false}>
          {pinned.groupSections.map(({ group, items }) => {
            if (items.length === 0 && group !== null) return null;
            return (
              <motion.section
                key={group?.id ?? "__ungrouped__"}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <header className="flex items-center justify-between">
                  <h3
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                    style={group?.color ? { color: group.color } : { color: "#94a3b8" }}
                  >
                    <span aria-hidden>{group?.emoji ?? (group ? "📁" : "•")}</span>
                    {group?.name ?? t("pinned.noGroup")}
                    <span className="text-slate-500">· {items.length}</span>
                  </h3>
                </header>
                <ul className="space-y-2">
                  {items.map((pin) => {
                    const cached = loadPlayerCache(pin.tag);
                    return (
                      <li key={pin.tag}>
                        <PinnedPlayerCard
                          pin={pin}
                          variant="full"
                          liveName={cached?.data.name}
                          liveTrophies={cached?.data.trophies}
                          onTap={handleSelect}
                          onEdit={(p) => setEditingTag(p.tag)}
                          onRemove={handleRemove}
                          contextItems={buildContextMenu(pin)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            );
          })}
        </AnimatePresence>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#1a0a2e]/40 p-3">
        <p className="text-[10px] text-slate-500">{t("pinned.sectionFooter")}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
          >
            <Upload className="h-3 w-3" />
            {t("pinned.exportTitle")}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            aria-pressed={importOpen}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
          >
            <Download className="h-3 w-3" />
            {t("pinned.importTitle")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {importOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={5}
              placeholder={t("pinned.importPaste")}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2.5 font-mono text-[11px] text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportJson("");
                  setImportOpen(false);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="rounded-xl bg-[#facc15] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#1a0a2e] disabled:opacity-50 active:scale-95"
              >
                {t("common.apply")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditPinSheet tag={editingTag} onClose={handleClose} />
      <GroupManagerSheet
        open={groupSheetOpen}
        onClose={() => setGroupSheetOpen(false)}
      />
    </div>
  );
}

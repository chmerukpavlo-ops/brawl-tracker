import { useCallback, useMemo, useState } from "react";
import { Eraser, Filter, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import EmptyState from "./EmptyState";
import AdvicePreviewCard from "./AdvicePreviewCard";
import { useAiHistory } from "../hooks/useAiHistory";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { updateUrl } from "../navigation/urlState";
import { CATEGORY_LABEL, type PromptCategory } from "../data/aiPrompts";
import { shareAdvicePreset } from "../utils/sharePresets";
import { shareData } from "../utils/share";
import { haptic } from "../hooks/useHaptic";
import type { SavedAdvice } from "../types";

interface AiHistoryViewProps {
  open: boolean;
  onClose: () => void;
}

type SortKey = "newest" | "oldest" | "pinned";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Новіші" },
  { id: "oldest", label: "Старіші" },
  { id: "pinned", label: "Закріплені вгорі" },
];

export default function AiHistoryView({ open, onClose }: AiHistoryViewProps) {
  const {
    history,
    removeAdvice,
    restoreAdvice,
    togglePin,
    clearHistory,
  } = useAiHistory();
  const { playerData } = usePlayer();
  const { showSuccess, showInfo } = useToast();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pinned");
  const [filterOnlyMine, setFilterOnlyMine] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<PromptCategory | "all">(
    "all"
  );

  const myTag = playerData?.tag?.replace(/^#/, "").toUpperCase();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = history;
    if (filterOnlyMine && myTag) {
      list = list.filter((it) => it.playerTag === myTag);
    }
    if (filterPinned) {
      list = list.filter((it) => it.isPinned);
    }
    if (categoryFilter !== "all") {
      list = list.filter((it) => it.presetCategory === categoryFilter);
    }
    if (q) {
      list = list.filter(
        (it) =>
          it.advice.toLowerCase().includes(q) ||
          it.playerName.toLowerCase().includes(q) ||
          (it.presetTitle ?? "").toLowerCase().includes(q) ||
          (it.note ?? "").toLowerCase().includes(q) ||
          (it.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [history, query, filterOnlyMine, filterPinned, categoryFilter, myTag]);

  const sorted = useMemo(() => {
    if (sortKey === "newest") {
      return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    }
    if (sortKey === "oldest") {
      return [...filtered].sort((a, b) => a.createdAt - b.createdAt);
    }
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [filtered, sortKey]);

  const hasActiveFilters =
    !!query || filterOnlyMine || filterPinned || categoryFilter !== "all";

  const resetFilters = useCallback(() => {
    setQuery("");
    setFilterOnlyMine(false);
    setFilterPinned(false);
    setCategoryFilter("all");
  }, []);

  const handleOpenAdvice = useCallback((advice: SavedAdvice) => {
    updateUrl({ advice: advice.id });
  }, []);

  const handleDelete = useCallback(
    (advice: SavedAdvice) => {
      const removed = removeAdvice(advice.id);
      haptic.heavy();
      if (removed) {
        showSuccess("Пораду видалено", {
          action: {
            label: "Скасувати",
            onClick: () => {
              restoreAdvice(removed);
              showInfo("Пораду повернено");
            },
          },
          duration: 5000,
        });
      }
    },
    [removeAdvice, restoreAdvice, showSuccess, showInfo]
  );

  const handleShare = useCallback(async (advice: SavedAdvice) => {
    const result = await shareData(shareAdvicePreset(advice));
    if (result.success && result.method === "clipboard") {
      showInfo("Посилання скопійовано");
    }
  }, [showInfo]);

  const handleTogglePin = useCallback(
    (advice: SavedAdvice) => {
      const next = togglePin(advice.id);
      haptic.medium();
      showInfo(next ? "Закріплено" : "Знято з закріплення");
    },
    [togglePin, showInfo]
  );

  const handleClear = useCallback(() => {
    const pinnedCount = history.filter((it) => it.isPinned).length;
    const message =
      pinnedCount > 0
        ? `Очистити історію? Закріплені (${pinnedCount}) лишаться.`
        : "Очистити всю історію порад?";
    if (!confirm(message)) return;
    clearHistory({ keepPinned: pinnedCount > 0 });
    haptic.heavy();
    showSuccess("Бібліотеку очищено");
  }, [history, clearHistory, showSuccess]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Бібліотека порад">
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>{history.length} записів усього</span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-200 active:scale-95"
            >
              <Eraser className="h-3 w-3" />
              Очистити
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук по порадах…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-[#7c3aed]/50 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистити пошук"
              className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filterPinned}
            label="📌 Закріплені"
            onClick={() => setFilterPinned((v) => !v)}
          />
          <FilterChip
            active={filterOnlyMine}
            label="Поточний"
            onClick={() => setFilterOnlyMine((v) => !v)}
            disabled={!myTag}
          />
          {(Object.keys(CATEGORY_LABEL) as PromptCategory[]).map((cat) => (
            <div key={cat}>
              <FilterChip
                active={categoryFilter === cat}
                label={CATEGORY_LABEL[cat]}
                onClick={() =>
                  setCategoryFilter((current) => (current === cat ? "all" : cat))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Filter className="h-3 w-3" />
            Сортування
          </span>
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortKey(s.id)}
                className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                  sortKey === s.id
                    ? "bg-[#7c3aed] text-white"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {sorted.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                compact
                illustration={hasActiveFilters ? "🔎" : "📚"}
                title={
                  hasActiveFilters
                    ? "Нічого не знайшли"
                    : "Бібліотека порожня"
                }
                description={
                  hasActiveFilters
                    ? "Спробуй скинути фільтри або зміни запит"
                    : "Запитай AI-Тренера на вкладці Stats — поради збережуться сюди"
                }
                action={
                  hasActiveFilters
                    ? { label: "Скинути фільтри", onClick: resetFilters, variant: "secondary" }
                    : undefined
                }
              />
            </motion.div>
          ) : (
            <motion.ul
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {sorted.map((advice) => (
                <li key={advice.id}>
                  <AdvicePreviewCard
                    advice={advice}
                    onOpen={() => handleOpenAdvice(advice)}
                    onTogglePin={() => handleTogglePin(advice)}
                    onShare={() => handleShare(advice)}
                    onDelete={() => handleDelete(advice)}
                  />
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${
        active
          ? "border-[#facc15] bg-[#facc15] text-[#1a0a2e]"
          : "border-white/10 bg-white/5 text-slate-400 active:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

import { useMemo, useState } from "react";
import { ArrowLeft, BookmarkCheck, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BottomSheet from "./BottomSheet";
import BrawlerAvatar from "./BrawlerAvatar";
import EmptyState from "./EmptyState";
import {
  AI_PROMPT_PRESETS,
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  type AiPromptPreset,
  type PromptCategory,
} from "../data/aiPrompts";
import { getPresetIcon } from "../data/aiPromptIcons";
import { usePlayer } from "../context/PlayerContext";
import { haptic } from "../hooks/useHaptic";
import { findCachedAdvice } from "../hooks/useAiHistory";
import { updateUrl } from "../navigation/urlState";
import { formatRelativeUk } from "../utils/dateUtils";
import type { BrawlerInfo, SavedAdvice } from "../types";

interface AiPromptPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: AiPromptPreset, brawler?: BrawlerInfo) => void;
}

type CategoryFilter = PromptCategory | "all";

export default function AiPromptPicker({
  open,
  onClose,
  onSelect,
}: AiPromptPickerProps) {
  const { playerData } = usePlayer();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [pendingPreset, setPendingPreset] = useState<AiPromptPreset | null>(null);

  const myTag = playerData?.tag;

  const filtered = useMemo(
    () =>
      filter === "all"
        ? AI_PROMPT_PRESETS
        : AI_PROMPT_PRESETS.filter((p) => p.category === filter),
    [filter]
  );

  const handlePresetTap = (preset: AiPromptPreset) => {
    haptic.light();
    if (preset.requiresBrawler) {
      setPendingPreset(preset);
      return;
    }
    onSelect(preset);
    onClose();
  };

  const handleOpenCached = (advice: SavedAdvice) => {
    haptic.light();
    onClose();
    updateUrl({ advice: advice.id });
  };

  const handleBrawlerPicked = (brawler: BrawlerInfo) => {
    if (!pendingPreset) return;
    haptic.medium();
    onSelect(pendingPreset, brawler);
    setPendingPreset(null);
    onClose();
  };

  const handleBack = () => {
    setPendingPreset(null);
  };

  const handleClose = () => {
    setPendingPreset(null);
    onClose();
  };

  const title = pendingPreset
    ? `Обери бійця · ${pendingPreset.title}`
    : "Швидкі питання";

  return (
    <BottomSheet open={open} onClose={handleClose} title={title}>
      <AnimatePresence mode="wait">
        {pendingPreset ? (
          <motion.div
            key="brawler"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <BrawlerSubPicker
              onPick={handleBrawlerPicked}
              onBack={handleBack}
            />
          </motion.div>
        ) : (
          <motion.div
            key="presets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-3 pt-1"
          >
            <CategoryFilters value={filter} onChange={setFilter} />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filtered.map((preset) => {
                const cached =
                  myTag && !preset.requiresBrawler
                    ? findCachedAdvice(myTag, preset.id, null)
                    : null;
                return (
                  <div key={preset.id}>
                    <PresetCard
                      preset={preset}
                      cached={cached}
                      onTap={() => handlePresetTap(preset)}
                      onOpenCached={cached ? () => handleOpenCached(cached) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}

function CategoryFilters({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
}) {
  const items: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "Усі" },
    ...(Object.keys(CATEGORY_LABEL) as PromptCategory[]).map((id) => ({
      id,
      label: CATEGORY_LABEL[id],
    })),
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
              active
                ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                : "border-white/10 bg-white/5 text-slate-400 active:text-slate-200"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function PresetCard({
  preset,
  cached,
  onTap,
  onOpenCached,
}: {
  preset: AiPromptPreset;
  cached?: SavedAdvice | null;
  onTap: () => void;
  onOpenCached?: () => void;
}) {
  const Icon = getPresetIcon(preset.icon);
  const style = CATEGORY_STYLE[preset.category];

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-2xl border bg-white/[0.04] transition-colors ${style.border}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 -z-10 opacity-50 ${style.bg}`}
        aria-hidden
      />
      <motion.button
        type="button"
        layout
        whileTap={{ scale: 0.97 }}
        onClick={onTap}
        aria-label={preset.title}
        className="w-full p-3 text-left"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.bg} ${style.border}`}
          >
            <Icon className={`h-5 w-5 ${style.text}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate text-sm font-black uppercase text-white">
                {preset.title}
              </h4>
              {preset.requiresBrawler && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                  + боєць
                </span>
              )}
              {cached && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-[#facc15]/30 bg-[#facc15]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#facc15]">
                  <BookmarkCheck className="h-2.5 w-2.5" />
                  Збережено
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
              {preset.description}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
        </div>
      </motion.button>
      {cached && onOpenCached && (
        <button
          type="button"
          onClick={onOpenCached}
          className="flex w-full items-center justify-between gap-2 border-t border-white/10 bg-[#1a0a2e]/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#facc15] active:opacity-80"
        >
          <span className="inline-flex items-center gap-1">
            <BookmarkCheck className="h-3 w-3" />
            Переглянути збережене
          </span>
          <span className="text-[9px] font-bold text-slate-500">
            {formatRelativeUk(cached.createdAt)}
          </span>
        </button>
      )}
    </div>
  );
}

function BrawlerSubPicker({
  onPick,
  onBack,
}: {
  onPick: (brawler: BrawlerInfo) => void;
  onBack: () => void;
}) {
  const { playerData } = usePlayer();
  const [search, setSearch] = useState("");

  const brawlers = useMemo(() => {
    const list = playerData?.brawlers ?? [];
    const filtered = search.trim()
      ? list.filter((b) =>
          b.name.toLowerCase().includes(search.toLowerCase().trim())
        )
      : list;
    return [...filtered].sort((a, b) => b.trophies - a.trophies);
  }, [playerData?.brawlers, search]);

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            inputMode="search"
            placeholder="Знайти бравлера"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-[#7c3aed]/50 focus:outline-none"
          />
        </div>
      </div>

      {brawlers.length === 0 ? (
        <EmptyState
          compact
          illustration="🔍"
          title="Нічого не знайшли"
          description="Спробуй інше ім'я"
        />
      ) : (
        <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {brawlers.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPick(b)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition-colors active:scale-[0.98]"
              >
                <BrawlerAvatar
                  brawlerId={b.id}
                  brawlerName={b.name}
                  size={36}
                  rounded="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {b.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Lvl {b.power} · {b.trophies.toLocaleString("uk-UA")}🏆
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

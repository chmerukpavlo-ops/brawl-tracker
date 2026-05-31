import { useMemo, useState, type ReactNode } from "react";
import { History, Search, Star, UserPlus, X } from "lucide-react";
import { motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import EmptyState from "./EmptyState";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";

interface PlayerPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (tag: string) => void | Promise<void>;
  /** Tag that should not be selectable (e.g. current main player). */
  excludeTag?: string;
  title?: string;
  /** Visible above the tabs. */
  description?: string;
}

type PickerTabId = "favorites" | "history" | "search";

const TABS: Array<{ id: PickerTabId; label: string; icon: ReactNode }> = [
  { id: "favorites", label: "Улюблені", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "history", label: "Історія", icon: <History className="h-3.5 w-3.5" /> },
  { id: "search", label: "Новий пошук", icon: <Search className="h-3.5 w-3.5" /> },
];

function normalize(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

const TAG_RE = /^[A-Z0-9]{3,15}$/;

export default function PlayerPickerSheet({
  open,
  onClose,
  onPick,
  excludeTag,
  title = "Обери гравця",
  description,
}: PlayerPickerSheetProps) {
  const { favorites, searchHistory, removeFromHistory } = usePlayer();
  const { showInfo } = useToast();
  const [tab, setTab] = useState<PickerTabId>(() =>
    favorites.length > 0 ? "favorites" : searchHistory.length > 0 ? "history" : "search"
  );
  const [input, setInput] = useState("");

  const excludeKey = excludeTag ? normalize(excludeTag) : null;

  const filteredFavorites = useMemo(
    () =>
      favorites.filter(
        (f) => !excludeKey || normalize(f.tag) !== excludeKey
      ),
    [favorites, excludeKey]
  );
  const filteredHistory = useMemo(
    () =>
      searchHistory.filter(
        (t) => !excludeKey || normalize(t) !== excludeKey
      ),
    [searchHistory, excludeKey]
  );

  const pick = async (rawTag: string) => {
    const clean = normalize(rawTag);
    if (!TAG_RE.test(clean)) {
      showInfo("Перевір тег: 3–15 латинських букв/цифр");
      return;
    }
    if (excludeKey && clean === excludeKey) {
      showInfo("Це той самий гравець — обери іншого");
      haptic.light();
      return;
    }
    haptic.selection();
    await onPick(clean);
  };

  const submitSearch = () => {
    if (!input.trim()) return;
    pick(input);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pt-2">
        {description && (
          <p className="text-xs text-slate-400">{description}</p>
        )}

        <div className="flex gap-1.5 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1">
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
                className={`relative flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-[#7c3aed] text-white shadow-[0_0_18px_rgba(124,58,237,0.45)]"
                    : "text-slate-400 active:text-slate-200"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "favorites" &&
          (filteredFavorites.length === 0 ? (
            <EmptyState
              compact
              illustration="⭐"
              title="Поки порожньо"
              description="Додай улюблених гравців у Налаштуваннях"
            />
          ) : (
            <ul className="space-y-2">
              {filteredFavorites.map((f) => (
                <li key={f.tag}>
                  <button
                    type="button"
                    onClick={() => pick(f.tag)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-xl">{f.iconEmoji ?? "⭐"}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {f.customName ?? f.tag}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{f.tag}</p>
                      </div>
                    </div>
                    {typeof f.lastTrophies === "number" && (
                      <span className="shrink-0 text-xs font-black text-[#facc15]">
                        {f.lastTrophies.toLocaleString("uk-UA")} 🏆
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {tab === "history" &&
          (filteredHistory.length === 0 ? (
            <EmptyState
              compact
              illustration="🔍"
              title="Історія порожня"
              description="Знайди когось — і він з’явиться тут"
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {filteredHistory.map((t) => (
                <li key={t} className="group flex items-center gap-1 rounded-full border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => pick(t)}
                    className="rounded-full px-3 py-2 text-xs font-bold uppercase text-slate-200 active:scale-95"
                  >
                    {t}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromHistory(t)}
                    aria-label={`Видалити ${t} з історії`}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 active:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {tab === "search" && (
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Тег гравця
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#facc15]">#</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value.replace(/#/g, "").toUpperCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                  }}
                  placeholder="ABCDE12"
                  className="w-full min-h-[48px] rounded-2xl border border-white/10 bg-[#1a0a2e] py-3 pl-8 pr-4 text-sm font-bold uppercase text-white placeholder-slate-600 outline-none focus:border-[#facc15]/50"
                />
              </div>
              <button
                type="button"
                onClick={submitSearch}
                disabled={!input.trim()}
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-[#facc15] text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-50"
                aria-label="Шукати"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>
            <motion.button
              type="button"
              onClick={submitSearch}
              disabled={!input.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full min-h-[48px] rounded-2xl bg-[#7c3aed] text-sm font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] disabled:opacity-50"
            >
              Завантажити
            </motion.button>
            <p className="text-[10px] leading-snug text-slate-500">
              Підказка: тег у грі починається з <span className="font-bold text-slate-400">#</span>, тут — без нього.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

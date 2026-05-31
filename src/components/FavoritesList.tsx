import { useState } from "react";
import { Pencil, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import EditFavoriteSheet from "./EditFavoriteSheet";
import EmptyState from "./EmptyState";
import type { FavoritePlayer } from "../types";
import { loadPlayerCache } from "../utils/playerCache";

export default function FavoritesList() {
  const { favorites, handleQuery, setActiveTab } = usePlayer();
  const [editing, setEditing] = useState<FavoritePlayer | null>(null);

  if (favorites.length === 0) {
    return (
      <EmptyState
        compact
        illustration="⭐"
        title="Немає улюблених"
        description="Додай гравця зірочкою з профілю — він з'явиться тут"
      />
    );
  }

  const handleSelect = (fav: FavoritePlayer) => {
    handleQuery(fav.tag);
    setActiveTab("home");
  };

  return (
    <>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {favorites.map((fav) => {
            const cached = loadPlayerCache(fav.tag);
            const playerName = cached?.data.name;
            const displayName = fav.customName || playerName || fav.tag;
            const showRealName = !!fav.customName && !!playerName && fav.customName !== playerName;
            const lastTrophies = fav.lastTrophies ?? cached?.data.trophies;
            const cachedTrophies = cached?.data.trophies;
            const delta =
              fav.lastTrophies !== undefined && cachedTrophies !== undefined
                ? cachedTrophies - fav.lastTrophies
                : 0;

            return (
              <motion.li
                key={fav.tag}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(fav)}
                  className="flex flex-1 items-center gap-3 text-left active:opacity-70"
                  aria-label={`Завантажити ${displayName}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a0a2e] text-xl ring-1 ring-white/10">
                    {fav.iconEmoji ?? "⭐"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {showRealName ? `${playerName} · ${fav.tag}` : fav.tag}
                    </p>
                  </div>
                  {lastTrophies !== undefined && (
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-[#facc15]" />
                        <span className="text-xs font-black text-[#facc15]">
                          {lastTrophies.toLocaleString("uk-UA")}
                        </span>
                      </div>
                      {delta !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 text-[10px] font-bold ${
                            delta > 0 ? "text-[#22c55e]" : "text-rose-400"
                          }`}
                        >
                          {delta > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {delta > 0 ? "+" : ""}
                          {delta.toLocaleString("uk-UA")}
                        </span>
                      )}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(fav)}
                  aria-label="Редагувати"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 active:scale-90"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <EditFavoriteSheet favorite={editing} onClose={() => setEditing(null)} />
    </>
  );
}

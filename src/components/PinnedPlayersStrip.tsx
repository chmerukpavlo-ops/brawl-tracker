import { Pencil, Pin } from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { loadPlayerCache } from "../utils/playerCache";
import PinnedPlayerCard from "./PinnedPlayerCard";
import type { FavoritePlayer } from "../types";

interface PinnedPlayersStripProps {
  /** Cap on rendered cards (older are hidden behind a "+N more" pill). */
  maxVisible?: number;
}

export default function PinnedPlayersStrip({
  maxVisible = 12,
}: PinnedPlayersStripProps) {
  const { pinned, handleQuery, setActiveTab } = usePlayer();
  const { showError } = useToast();
  const { t } = useTranslation();

  if (pinned.pinned.length === 0) return null;

  const visible = pinned.pinned.slice(0, maxVisible);
  const overflow = pinned.pinned.length - visible.length;

  const handleSelect = async (pin: FavoritePlayer) => {
    const ok = await handleQuery(pin.tag, { navigateHome: false });
    if (ok) {
      setActiveTab("home");
    } else {
      showError(t("leaders.failedLoadProfile"));
    }
  };

  return (
    <section
      className="relative -mx-4 px-4"
      data-scroll-x="true"
      aria-label={t("pinned.sectionTitle")}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Pin className="h-3.5 w-3.5 text-[#facc15]" />
          {t("pinned.sectionTitle")}
          <span className="text-slate-600">· {pinned.pinned.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          aria-label={t("pinned.edit")}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 active:scale-90"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <motion.div
        layout
        className="-mx-4 flex gap-2 overflow-x-auto scroll-smooth px-4 pb-2 snap-x snap-mandatory"
        data-scroll-x="true"
        style={{ scrollbarWidth: "none" }}
      >
        {visible.map((pin) => {
          const cached = loadPlayerCache(pin.tag);
          return (
            <PinnedPlayerCard
              key={pin.tag}
              pin={pin}
              variant="horizontal"
              onTap={handleSelect}
              liveName={cached?.data.name}
              liveTrophies={cached?.data.trophies}
            />
          );
        })}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="flex w-[120px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-center text-slate-300 active:scale-95"
          >
            <span className="text-2xl">＋</span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              +{overflow}
            </span>
          </button>
        )}
      </motion.div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import type { FavoritePlayer } from "../types";

interface EditFavoriteSheetProps {
  favorite: FavoritePlayer | null;
  onClose: () => void;
}

const NAME_LIMIT = 20;
const EMOJI_OPTIONS = ["⭐", "🔥", "💪", "🎯", "👑", "💎", "🚀", "⚡", "🦾", "🏆", "🐺", "🎮"];

export default function EditFavoriteSheet({ favorite, onClose }: EditFavoriteSheetProps) {
  const { updateFavorite, removeFavorite } = usePlayer();
  const { showSuccess } = useToast();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(EMOJI_OPTIONS[0]);

  useEffect(() => {
    if (!favorite) return;
    setName(favorite.customName ?? "");
    setEmoji(favorite.iconEmoji ?? EMOJI_OPTIONS[0]);
  }, [favorite]);

  if (!favorite) {
    return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  }

  const handleSave = () => {
    const trimmed = name.trim().slice(0, NAME_LIMIT);
    updateFavorite(favorite.tag, {
      customName: trimmed.length > 0 ? trimmed : undefined,
      iconEmoji: emoji,
    });
    showSuccess("Збережено");
    onClose();
  };

  const handleRemove = () => {
    removeFavorite(favorite.tag);
    showSuccess("Видалено з улюблених");
    onClose();
  };

  return (
    <BottomSheet open={!!favorite} onClose={onClose} title={`Редагувати ${favorite.tag}`}>
      <div className="space-y-5 pt-2">
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Власна назва
          </label>
          <input
            type="text"
            value={name}
            maxLength={NAME_LIMIT}
            onChange={(e) => setName(e.target.value)}
            placeholder="Брат, Союзник, Pro..."
            className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#facc15]/40"
          />
          <p className="mt-1 text-right text-[10px] text-slate-500">
            {name.length} / {NAME_LIMIT}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Іконка
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all active:scale-90 ${
                  emoji === e
                    ? "border-[#facc15]/60 bg-[#facc15]/10 ring-1 ring-[#facc15]/40"
                    : "border-white/10 bg-white/5"
                }`}
                aria-label={`Іконка ${e}`}
                aria-pressed={emoji === e}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-300 active:scale-95"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] flex-[2] rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
          >
            Зберегти
          </button>
        </div>

        <button
          type="button"
          onClick={handleRemove}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-black uppercase tracking-wider text-rose-300 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          Видалити з улюблених
        </button>
      </div>
    </BottomSheet>
  );
}

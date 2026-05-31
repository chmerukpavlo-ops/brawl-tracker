import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BottomSheet from "./BottomSheet";
import {
  LEADERBOARD_COUNTRIES,
  getCountryMeta,
} from "../data/countries";
import { haptic } from "../hooks/useHaptic";
import { useTranslation } from "../hooks/useTranslation";

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export default function CountryPicker({
  value,
  onChange,
  className = "",
}: CountryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const meta = getCountryMeta(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LEADERBOARD_COUNTRIES;
    return LEADERBOARD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (code: string) => {
    haptic.selection();
    onChange(code);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic.light();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#2a1a4a] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white active:scale-95 ${className}`}
        aria-label={`${t("leaders.region")}: ${meta.name}`}
      >
        <span aria-hidden className="text-base">
          {meta.flag}
        </span>
        <span className="truncate">{meta.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("leaders.region")}>
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              inputMode="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("leaders.findCountry")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-[#7c3aed]/50 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("common.clear")}
                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-400"
              >
                {t("leaders.notFoundCountry")}
              </motion.p>
            ) : (
              <motion.ul
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1"
              >
                {filtered.map((c) => {
                  const isActive = c.code === value;
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c.code)}
                        className={`flex w-full items-center gap-2 rounded-2xl border p-2.5 text-left transition-colors active:scale-[0.98] ${
                          isActive
                            ? "border-[#facc15] bg-[#facc15]/10 ring-1 ring-[#facc15]/30"
                            : "border-white/10 bg-[#2a1a4a]/60 active:border-white/20"
                        }`}
                        aria-pressed={isActive}
                      >
                        <span aria-hidden className="text-xl">
                          {c.flag}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black uppercase text-white">
                            {c.name}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {c.code === "global" ? "world" : c.code}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </BottomSheet>
    </>
  );
}

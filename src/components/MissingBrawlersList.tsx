import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { BrawlerDefinition, BrawlerRarity } from "../data/allBrawlers";
import { RARITY_ORDER } from "../data/allBrawlers";
import { groupMissingByRarity } from "../utils/brawlerProgress";
import { getRarityStyle } from "../utils/rarityColors";
import BrawlerAvatar from "./BrawlerAvatar";

interface MissingBrawlersListProps {
  missing: BrawlerDefinition[];
  defaultExpanded?: boolean;
}

export default function MissingBrawlersList({
  missing,
  defaultExpanded = false,
}: MissingBrawlersListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (missing.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-[#22c55e]" />
        <p className="text-xs font-bold text-[#22c55e]">
          Колекція завершена!
        </p>
      </div>
    );
  }

  const groups = groupMissingByRarity(missing);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#2a1a4a] px-4 py-3 active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-black uppercase tracking-wider text-white">
            Не вистачає
          </p>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-300">
            {missing.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="missing-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4 overflow-hidden"
          >
            {RARITY_ORDER.map((rarity: BrawlerRarity) => {
              const list = groups.get(rarity) ?? [];
              if (list.length === 0) return null;
              const style = getRarityStyle(rarity);
              return (
                <section key={rarity} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-2 w-2 rounded-full ${style.glow}`}
                    />
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${style.text}`}>
                      {style.label}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500">
                      {list.length}
                    </span>
                  </div>
                  <ul className="grid grid-cols-4 gap-2">
                    {list.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-[#1a0a2e]/60 p-2"
                        title={b.displayName}
                      >
                        <span className="relative">
                          <span className="block grayscale opacity-40">
                            <BrawlerAvatar
                              brawlerId={b.id}
                              brawlerName={b.name}
                              size={44}
                            />
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Lock className="h-3.5 w-3.5 text-white/70" strokeWidth={2.5} />
                          </span>
                        </span>
                        <p className="w-full truncate text-center text-[10px] font-bold text-slate-400">
                          {b.displayName}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

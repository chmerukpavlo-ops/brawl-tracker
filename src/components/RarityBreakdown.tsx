import { motion } from "motion/react";
import type { CategoryProgress } from "../utils/brawlerProgress";
import type { BrawlerClass, BrawlerRarity } from "../data/allBrawlers";
import { getRarityStyle } from "../utils/rarityColors";

type Category = BrawlerRarity | BrawlerClass;

interface RarityBreakdownProps<K extends Category> {
  items: CategoryProgress<K>[];
  labelFor: (key: K) => string;
  variant?: "rarity" | "class";
}

const CLASS_COLOR: Record<BrawlerClass, { from: string; to: string; text: string }> = {
  "Damage Dealer": { from: "from-rose-500", to: "to-rose-600", text: "text-rose-300" },
  "Tank": { from: "from-emerald-500", to: "to-emerald-600", text: "text-emerald-300" },
  "Marksman": { from: "from-amber-500", to: "to-amber-600", text: "text-amber-300" },
  "Assassin": { from: "from-violet-500", to: "to-violet-600", text: "text-violet-300" },
  "Support": { from: "from-sky-500", to: "to-sky-600", text: "text-sky-300" },
  "Controller": { from: "from-fuchsia-500", to: "to-fuchsia-600", text: "text-fuchsia-300" },
  "Artillery": { from: "from-orange-500", to: "to-orange-600", text: "text-orange-300" },
};

export default function RarityBreakdown<K extends Category>({
  items,
  labelFor,
  variant = "rarity",
}: RarityBreakdownProps<K>) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-500">Поки немає даних для розбивки.</p>
    );
  }
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="space-y-2"
    >
      {items.map((item) => {
        const isComplete = item.unlocked === item.total;
        let dotClass = "bg-slate-500";
        let fillClass = "from-[#facc15] to-[#f97316]";
        let textClass = "text-slate-200";
        let label = labelFor(item.key);

        if (variant === "rarity") {
          const style = getRarityStyle(item.key as BrawlerRarity);
          dotClass = style.glow;
          textClass = style.text;
          label = style.label;
          fillClass =
            (item.key as BrawlerRarity) === "LEGENDARY"
              ? "from-amber-400 to-amber-500"
              : (item.key as BrawlerRarity) === "MYTHIC"
                ? "from-violet-500 to-violet-600"
                : (item.key as BrawlerRarity) === "EPIC"
                  ? "from-rose-500 to-rose-600"
                  : (item.key as BrawlerRarity) === "SUPER_RARE"
                    ? "from-sky-500 to-blue-600"
                    : (item.key as BrawlerRarity) === "RARE"
                      ? "from-emerald-500 to-emerald-600"
                      : "from-slate-400 to-slate-500";
        } else {
          const c = CLASS_COLOR[item.key as BrawlerClass];
          if (c) {
            fillClass = `${c.from} ${c.to}`;
            textClass = c.text;
            dotClass = c.from.replace("from-", "bg-");
          }
        }

        return (
          <motion.li
            key={String(item.key)}
            variants={{
              hidden: { opacity: 0, x: -6 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center gap-2.5"
          >
            <span
              aria-hidden
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`truncate text-[11px] font-black uppercase tracking-wider ${textClass}`}>
                  {label}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-black tabular-nums ${
                    isComplete ? "text-[#22c55e]" : "text-slate-300"
                  }`}
                >
                  {item.unlocked}
                  <span className="text-slate-600">/{item.total}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${fillClass}`}
                />
              </div>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

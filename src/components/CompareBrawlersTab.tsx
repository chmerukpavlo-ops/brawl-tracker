import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { BrawlerInfo } from "../types";
import { brawlersMetadata } from "../types";
import type { ComparisonResult } from "../utils/compareMetrics";
import BrawlerAvatar from "./BrawlerAvatar";
import EmptyState from "./EmptyState";

interface Props {
  result: ComparisonResult;
}

type Tab = "common" | "onlyA" | "onlyB";

export default function CompareBrawlersTab({ result }: Props) {
  const [tab, setTab] = useState<Tab>("common");
  const { brawlers, playerA, playerB } = result;
  const counts = brawlers.counts;

  const tabs = useMemo(
    () => [
      { id: "common" as Tab, label: "Спільні", value: counts.common },
      { id: "onlyA" as Tab, label: `Тільки ${shortName(playerA.name)}`, value: counts.onlyA },
      { id: "onlyB" as Tab, label: `Тільки ${shortName(playerB.name)}`, value: counts.onlyB },
    ],
    [counts.common, counts.onlyA, counts.onlyB, playerA.name, playerB.name]
  );

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-slate-500">
        Спільних: <span className="font-black text-slate-300">{counts.common}</span>{" "}· Тільки A:{" "}
        <span className="font-black text-[#facc15]">{counts.onlyA}</span>{" "}· Тільки B:{" "}
        <span className="font-black text-[#c4b5fd]">{counts.onlyB}</span>
      </p>

      <div className="flex gap-1.5 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                active
                  ? "bg-[#7c3aed] text-white"
                  : "text-slate-400 active:text-slate-200"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[9px] ${
                  active ? "bg-white/15 text-white" : "bg-white/5 text-slate-500"
                }`}
              >
                {t.value}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "common" && (
        <CommonList
          items={brawlers.common}
          playerAName={playerA.name}
          playerBName={playerB.name}
        />
      )}
      {tab === "onlyA" && (
        <ExclusiveGrid
          items={brawlers.onlyA}
          accent="a"
          missingName={playerB.name}
        />
      )}
      {tab === "onlyB" && (
        <ExclusiveGrid
          items={brawlers.onlyB}
          accent="b"
          missingName={playerA.name}
        />
      )}
    </div>
  );
}

function shortName(name: string): string {
  return name.split(/[\s|]/)[0] ?? name;
}

function CommonList({
  items,
  playerAName,
  playerBName,
}: {
  items: ComparisonResult["brawlers"]["common"];
  playerAName: string;
  playerBName: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        illustration="🧩"
        title="Спільних бійців немає"
        description="Перетину поки нема — у вас зовсім різні колекції"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((row) => {
        const meta = brawlersMetadata[row.name];
        const displayName = meta?.name ?? row.name;
        const max = Math.max(row.a.trophies, row.b.trophies, 1);
        const ratioA = row.a.trophies / max;
        const ratioB = row.b.trophies / max;
        return (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <BrawlerAvatar
              brawlerId={row.a.id}
              brawlerName={row.a.name}
              size={40}
              rounded="rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-black uppercase text-white">
                  {displayName}
                </p>
                <span
                  className="shrink-0 text-[10px] font-black uppercase text-slate-500"
                  title={`${playerAName} vs ${playerBName}`}
                >
                  {row.winner === "tie" ? "=" : row.winner === "a" ? "A" : "B"}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-[minmax(36px,auto)_1fr_minmax(36px,auto)] items-center gap-1.5 text-[11px]">
                <span
                  className={`text-right font-black ${
                    row.winner === "a" ? "text-[#facc15]" : "text-slate-300"
                  }`}
                >
                  {row.a.trophies.toLocaleString("uk-UA")}
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex h-1.5 overflow-hidden rounded-l-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratioA * 100}%` }}
                      transition={{ duration: 0.45 }}
                      className={`ml-auto h-full rounded-l-full ${
                        row.winner === "a" ? "bg-[#facc15]" : "bg-[#facc15]/40"
                      }`}
                    />
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-r-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratioB * 100}%` }}
                      transition={{ duration: 0.45 }}
                      className={`h-full rounded-r-full ${
                        row.winner === "b" ? "bg-[#a78bfa]" : "bg-[#7c3aed]/40"
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`font-black ${
                    row.winner === "b" ? "text-[#c4b5fd]" : "text-slate-300"
                  }`}
                >
                  {row.b.trophies.toLocaleString("uk-UA")}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ExclusiveGrid({
  items,
  accent,
  missingName,
}: {
  items: BrawlerInfo[];
  accent: "a" | "b";
  missingName: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        illustration="🟰"
        title="Унікальних немає"
        description="Усі бійці є в обох колекціях"
      />
    );
  }
  const dot =
    accent === "a"
      ? "ring-[#facc15]/40 bg-[#facc15]/5"
      : "ring-[#a78bfa]/40 bg-[#7c3aed]/10";
  return (
    <div>
      <p className="mb-2 text-[10px] text-slate-500">
        У <span className="font-bold text-slate-300">{missingName}</span> цих ще немає
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((b) => {
          const meta = brawlersMetadata[b.name];
          const name = meta?.name ?? b.name;
          return (
            <li
              key={b.id}
              className={`flex flex-col items-center gap-1 rounded-2xl border border-white/10 p-2 ring-1 ${dot}`}
            >
              <BrawlerAvatar
                brawlerId={b.id}
                brawlerName={b.name}
                size={48}
                rounded="rounded-xl"
              />
              <p className="line-clamp-1 text-[10px] font-bold uppercase text-white">
                {name}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-black text-[#facc15]">
                <Trophy className="h-3 w-3" />
                {b.trophies.toLocaleString("uk-UA")}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

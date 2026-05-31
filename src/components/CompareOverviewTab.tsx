import { Crown, Minus, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { PlayerStats } from "../types";
import type { ComparisonResult, ComparisonMetric } from "../utils/compareMetrics";
import { dualBarRatio, formatPct } from "../utils/compareMetrics";
import BrawlerAvatar from "./BrawlerAvatar";
import AnimatedCounter from "./AnimatedCounter";

interface Props {
  result: ComparisonResult;
}

export default function CompareOverviewTab({ result }: Props) {
  const { playerA, playerB, overall, metrics } = result;
  const heroMetrics = metrics.filter((m) =>
    ["trophies", "v3Victories", "brawlersCount", "maxedBrawlers"].includes(m.key)
  );

  return (
    <div className="space-y-5">
      <WinnerBanner
        winner={overall.winner}
        playerA={playerA}
        playerB={playerB}
      />

      <VersusCard playerA={playerA} playerB={playerB} winner={overall.winner} />

      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Ключові метрики
        </p>
        <div className="space-y-2.5">
          {heroMetrics.map((m) => (
            <div key={m.key}>
              <DualBar metric={m} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WinnerBanner({
  winner,
  playerA,
  playerB,
}: {
  winner: ComparisonResult["overall"]["winner"];
  playerA: PlayerStats;
  playerB: PlayerStats;
}) {
  const isTie = winner === "tie";
  const winnerName =
    winner === "a" ? playerA.name : winner === "b" ? playerB.name : null;
  const accent =
    winner === "a"
      ? "border-[#facc15]/40 bg-[#facc15]/10 text-[#facc15]"
      : winner === "b"
      ? "border-[#a78bfa]/40 bg-[#7c3aed]/15 text-[#c4b5fd]"
      : "border-white/10 bg-white/5 text-slate-200";

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`relative overflow-hidden rounded-2xl border p-4 text-center ${accent}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-current blur-3xl" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-current blur-3xl" />
      </div>
      <div className="relative flex items-center justify-center gap-2">
        {isTie ? (
          <Minus className="h-5 w-5" />
        ) : (
          <Crown className="h-5 w-5" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {isTie ? "Нічия" : "Переможець"}
        </span>
      </div>
      <p className="relative mt-1 text-lg font-black tracking-wide">
        {isTie ? "🤝 Рівно у всьому" : `🏆 ${winnerName}`}
      </p>
    </motion.div>
  );
}

function VersusCard({
  playerA,
  playerB,
  winner,
}: {
  playerA: PlayerStats;
  playerB: PlayerStats;
  winner: ComparisonResult["overall"]["winner"];
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-[#1a0a2e]/40 p-4">
      <SideAvatar
        side="a"
        player={playerA}
        isWinner={winner === "a"}
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#1a0a2e] text-xs font-black uppercase tracking-widest text-slate-300"
      >
        VS
      </motion.div>
      <SideAvatar
        side="b"
        player={playerB}
        isWinner={winner === "b"}
      />
    </div>
  );
}

function SideAvatar({
  side,
  player,
  isWinner,
}: {
  side: "a" | "b";
  player: PlayerStats;
  isWinner: boolean;
}) {
  const topBrawler = player.brawlers?.[0];
  const sideAccent =
    side === "a"
      ? "ring-[#facc15]/40 bg-[#facc15]/5"
      : "ring-[#a78bfa]/40 bg-[#7c3aed]/10";
  const winnerGlow = isWinner
    ? "shadow-[0_0_24px_rgba(74,222,128,0.45)] ring-emerald-400/60"
    : "";
  const align = side === "a" ? "items-start text-left" : "items-end text-right";

  return (
    <div className={`flex flex-col gap-2 ${align}`}>
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ring-2 ${sideAccent} ${winnerGlow}`}
      >
        <BrawlerAvatar
          brawlerId={topBrawler?.id ?? null}
          brawlerName={topBrawler?.name}
          size={56}
          rounded="rounded-xl"
        />
      </div>
      <div className={align}>
        <p className="line-clamp-1 text-sm font-black uppercase text-white">
          {player.name}
        </p>
        <div
          className={`mt-0.5 flex items-center gap-1 text-[#facc15] ${
            side === "a" ? "justify-start" : "justify-end"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          <AnimatedCounter
            value={player.trophies}
            className="text-base font-black"
          />
        </div>
      </div>
    </div>
  );
}

function DualBar({ metric }: { metric: ComparisonMetric }) {
  const { valueA, valueB, winner } = metric;
  const { ratioA, ratioB } = dualBarRatio(valueA, valueB);
  const colorA = winner === "a" ? "bg-[#facc15]" : "bg-[#facc15]/40";
  const colorB = winner === "b" ? "bg-[#a78bfa]" : "bg-[#7c3aed]/40";
  const fmt = metric.format ?? ((n: number) => String(n));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
        <span
          className={`font-black ${
            winner === "a" ? "text-[#facc15]" : "text-slate-200"
          }`}
        >
          {fmt(valueA)}
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {metric.label}
        </span>
        <span
          className={`font-black ${
            winner === "b" ? "text-[#c4b5fd]" : "text-slate-200"
          }`}
        >
          {fmt(valueB)}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ratioA * 100}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`ml-auto h-full rounded-l-full ${colorA}`}
          />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {winner === "tie" ? "=" : formatPct(metric.percentage)}
        </span>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ratioB * 100}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-r-full ${colorB}`}
          />
        </div>
      </div>
    </div>
  );
}

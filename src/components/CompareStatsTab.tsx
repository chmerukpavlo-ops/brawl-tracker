import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import type {
  ComparisonMetric,
  ComparisonResult,
} from "../utils/compareMetrics";
import { dualBarRatio, formatPct } from "../utils/compareMetrics";

type SortMode = "default" | "diff" | "value";

interface Props {
  result: ComparisonResult;
}

export default function CompareStatsTab({ result }: Props) {
  const [sort, setSort] = useState<SortMode>("default");
  const [reversed, setReversed] = useState(false);

  const sorted = useMemo(() => {
    const list = [...result.metrics];
    if (sort === "diff") {
      list.sort((a, b) => b.percentage - a.percentage);
    } else if (sort === "value") {
      list.sort(
        (a, b) =>
          Math.max(b.valueA, b.valueB) - Math.max(a.valueA, a.valueB)
      );
    }
    return reversed ? list.reverse() : list;
  }, [result.metrics, sort, reversed]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-white/5 bg-[#1a0a2e]/60 p-1">
          {(
            [
              { id: "default", label: "За замовч." },
              { id: "diff", label: "За різницею" },
              { id: "value", label: "За значенням" },
            ] as Array<{ id: SortMode; label: string }>
          ).map((s) => {
            const active = sort === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  active
                    ? "bg-[#7c3aed] text-white"
                    : "text-slate-400 active:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setReversed((v) => !v)}
          className="flex min-h-[32px] items-center justify-center rounded-lg border border-white/10 px-2 text-slate-400 active:text-slate-200"
          aria-label={reversed ? "За зростанням" : "За спаданням"}
        >
          {reversed ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <ul className="space-y-2">
        {sorted.map((m) => (
          <li key={m.key}>
            <StatRow metric={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatRow({ metric }: { metric: ComparisonMetric }) {
  const fmt = metric.format ?? ((n: number) => String(n));
  const { ratioA, ratioB } = dualBarRatio(metric.valueA, metric.valueB);
  const tone =
    metric.winner === "a"
      ? "border-[#facc15]/30"
      : metric.winner === "b"
      ? "border-[#a78bfa]/30"
      : "border-white/5";

  return (
    <div
      className={`rounded-2xl border bg-white/[0.04] p-3 ${tone}`}
      role="group"
      aria-label={metric.label}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {metric.label}
        </span>
        {metric.winner !== "tie" ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
              metric.winner === "a"
                ? "bg-[#facc15]/15 text-[#facc15]"
                : "bg-[#7c3aed]/20 text-[#c4b5fd]"
            }`}
          >
            {metric.winner === "a" ? "A" : "B"} {formatPct(metric.percentage)}
          </span>
        ) : (
          <span className="text-[9px] font-black uppercase text-slate-500">=</span>
        )}
      </div>

      <div className="grid grid-cols-[minmax(40px,auto)_1fr_minmax(40px,auto)] items-center gap-2 text-xs">
        <span
          className={`text-right font-black ${
            metric.winner === "a" ? "text-[#facc15]" : "text-slate-200"
          }`}
        >
          {fmt(metric.valueA)}
        </span>
        <div className="grid grid-cols-2 gap-1">
          <div className="flex h-2 overflow-hidden rounded-l-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratioA * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`ml-auto h-full rounded-l-full ${
                metric.winner === "a" ? "bg-[#facc15]" : "bg-[#facc15]/40"
              }`}
            />
          </div>
          <div className="flex h-2 overflow-hidden rounded-r-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratioB * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-r-full ${
                metric.winner === "b" ? "bg-[#a78bfa]" : "bg-[#7c3aed]/40"
              }`}
            />
          </div>
        </div>
        <span
          className={`font-black ${
            metric.winner === "b" ? "text-[#c4b5fd]" : "text-slate-200"
          }`}
        >
          {fmt(metric.valueB)}
        </span>
      </div>
    </div>
  );
}

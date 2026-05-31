import { motion } from "motion/react";

interface ModesChartProps {
  threeVsThree: number;
  solo: number;
  duo: number;
}

const MODES = [
  { key: "3v3", label: "3v3", color: "#3b82f6", text: "text-[#60a5fa]" },
  { key: "solo", label: "Solo Showdown", color: "#7c3aed", text: "text-[#a78bfa]" },
  { key: "duo", label: "Duo Showdown", color: "#22c55e", text: "text-[#4ade80]" },
] as const;

export default function ModesChart({ threeVsThree, solo, duo }: ModesChartProps) {
  const values = [threeVsThree, solo, duo];
  const total = Math.max(values.reduce((s, v) => s + v, 0), 1);

  const segments = MODES.map((mode, i) => ({
    ...mode,
    value: values[i],
    pct: (values[i] / total) * 100,
  }));

  const cx = 52;
  const cy = 52;
  const r = 40;
  const stroke = 14;
  const circumference = 2 * Math.PI * r;

  let offset = 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-[#2a1a4a] p-5">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white">
        Розподіл перемог
      </h2>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width={104} height={104} viewBox="0 0 104 104" aria-hidden>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#1a0a2e"
              strokeWidth={stroke}
            />
            {segments.map((seg) => {
              const dash = (seg.pct / 100) * circumference;
              const gap = circumference - dash;
              const rotation = (offset / 100) * 360 - 90;
              offset += seg.pct;
              return (
                <circle
                  key={seg.key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeLinecap="round"
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase text-slate-500">Всього</span>
            <span className="text-sm font-black text-white">
              {total.toLocaleString("uk-UA")}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {segments.map((seg, i) => (
            <div key={seg.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-bold text-slate-300">{seg.label}</span>
                <span className={`shrink-0 font-black ${seg.text}`}>
                  {Math.round(seg.pct)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1a0a2e]/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${seg.pct}%` }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                {seg.value.toLocaleString("uk-UA")} перемог
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

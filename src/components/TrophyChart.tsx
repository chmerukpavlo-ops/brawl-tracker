import { useMemo, useRef, useState, type PointerEvent } from "react";
import { motion } from "motion/react";
import { downsample, type TrophySnapshot } from "../utils/trophyHistory";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export type TrophyChartVariant = "full" | "sparkline";

interface TrophyChartProps {
  snapshots: TrophySnapshot[];
  height?: number;
  showAxes?: boolean;
  showTooltip?: boolean;
  showAnimation?: boolean;
  showHighlights?: boolean;
  fillGradient?: boolean;
  color?: string;
  variant?: TrophyChartVariant;
  emptyMessage?: string;
  className?: string;
}

const VIRTUAL_W = 400;
const TARGET_POINTS = 100;

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function TrophyChart({
  snapshots,
  height,
  showAxes,
  showTooltip,
  showAnimation,
  showHighlights,
  fillGradient,
  color = "#facc15",
  variant = "full",
  emptyMessage = "Збираємо дані... зайди ще раз через час",
  className = "",
}: TrophyChartProps) {
  const reduced = usePrefersReducedMotion();
  const isSparkline = variant === "sparkline";
  const effHeight = height ?? (isSparkline ? 40 : 160);
  const effShowAxes = showAxes ?? !isSparkline;
  const effShowTooltip = showTooltip ?? !isSparkline;
  const effShowAnimation = (showAnimation ?? !isSparkline) && !reduced;
  const effShowHighlights = showHighlights ?? !isSparkline;
  const effFillGradient = fillGradient ?? !isSparkline;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo<TrophySnapshot[]>(
    () => downsample(snapshots, TARGET_POINTS),
    [snapshots]
  );

  const enoughData = data.length >= 2;

  const scale = useMemo(() => {
    if (!enoughData) return null;
    const innerLeft = effShowAxes ? 32 : 4;
    const innerRight = VIRTUAL_W - 4;
    const innerTop = 6;
    const innerBottom = effHeight - (effShowAxes ? 18 : 4);
    const innerW = innerRight - innerLeft;
    const innerH = Math.max(1, innerBottom - innerTop);

    let minY = Infinity;
    let maxY = -Infinity;
    let maxIdx = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i].trophies;
      if (v < minY) minY = v;
      if (v > maxY) {
        maxY = v;
        maxIdx = i;
      }
    }
    const pad = Math.max(1, (maxY - minY) * 0.08);
    const yMin = Math.max(0, minY - pad);
    const yMax = maxY + pad;
    const yRange = Math.max(1, yMax - yMin);

    const xAt = (i: number) =>
      data.length === 1
        ? innerLeft + innerW / 2
        : innerLeft + (i / (data.length - 1)) * innerW;
    const yAt = (v: number) => innerBottom - ((v - yMin) / yRange) * innerH;

    return {
      innerLeft,
      innerRight,
      innerTop,
      innerBottom,
      innerW,
      innerH,
      yMin,
      yMax,
      yRange,
      maxIdx,
      xAt,
      yAt,
    };
  }, [data, effShowAxes, effHeight, enoughData]);

  if (!enoughData) {
    if (isSparkline) {
      return (
        <div
          className={`relative ${className}`}
          style={{ height: effHeight }}
          aria-hidden
        >
          <svg
            viewBox={`0 0 ${VIRTUAL_W} ${effHeight}`}
            width="100%"
            height={effHeight}
            preserveAspectRatio="none"
          >
            <line
              x1={4}
              y1={effHeight / 2}
              x2={VIRTUAL_W - 4}
              y2={effHeight / 2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      );
    }
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-[#1a0a2e]/40 px-4 text-center ${className}`}
        style={{ height: effHeight }}
      >
        <svg
          viewBox={`0 0 ${VIRTUAL_W} 60`}
          width="80%"
          height="40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={`M4,40 Q100,20 200,30 T${VIRTUAL_W - 4},10`}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            fill="none"
          />
        </svg>
        <p className="text-xs font-medium text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  if (!scale) return null;

  const linePath =
    "M" +
    data
      .map((s, i) => `${scale.xAt(i).toFixed(2)},${scale.yAt(s.trophies).toFixed(2)}`)
      .join(" L");

  const lastIdx = data.length - 1;
  const fillPath = `${linePath} L${scale.xAt(lastIdx).toFixed(2)},${scale.innerBottom} L${scale.xAt(0).toFixed(2)},${scale.innerBottom} Z`;

  const gradientId = `trophy-chart-fill-${variant}`;
  const glowId = `trophy-chart-glow-${variant}`;

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!effShowTooltip || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const virtX = ratio * VIRTUAL_W;
    let closest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(scale.xAt(i) - virtX);
      if (d < bestDist) {
        bestDist = d;
        closest = i;
      }
    }
    setHoverIdx(closest);
  };

  const handlePointerLeave = () => setHoverIdx(null);

  const gridLines = effShowAxes
    ? Array.from({ length: 4 }, (_, i) => {
        const ratio = i / 3;
        const v = scale.yMax - ratio * scale.yRange;
        const y = scale.innerTop + ratio * scale.innerH;
        return { v: Math.round(v), y };
      })
    : [];

  const xLabels = effShowAxes
    ? [0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => ({
        i,
        x: scale.xAt(i),
        label: formatDateLabel(data[i].timestamp),
      }))
    : [];

  const hoverPoint = hoverIdx !== null ? data[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? scale.xAt(hoverIdx) : 0;
  const hoverY = hoverPoint ? scale.yAt(hoverPoint.trophies) : 0;
  const prevHoverTrophies =
    hoverIdx !== null && hoverIdx > 0 ? data[hoverIdx - 1].trophies : null;
  const hoverDelta =
    hoverPoint && prevHoverTrophies !== null ? hoverPoint.trophies - prevHoverTrophies : null;

  const tooltipLeftPct = (hoverX / VIRTUAL_W) * 100;
  const tooltipAlignRight = tooltipLeftPct > 70;
  const tooltipTransform = tooltipAlignRight
    ? "translate(-100%, -120%)"
    : tooltipLeftPct < 30
      ? "translate(0%, -120%)"
      : "translate(-50%, -120%)";

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ height: effHeight }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIRTUAL_W} ${effHeight}`}
        width="100%"
        height={effHeight}
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        className="block touch-pan-y"
        role="img"
        aria-label="Графік прогресу кубків"
      >
        <defs>
          {effFillGradient && (
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          )}
          {effShowHighlights && (
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {effShowAxes &&
          gridLines.map((g, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={scale.innerLeft}
                y1={g.y}
                x2={scale.innerRight}
                y2={g.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={scale.innerLeft - 4}
                y={g.y + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgba(148,163,184,0.6)"
                fontFamily="system-ui, sans-serif"
              >
                {g.v}
              </text>
            </g>
          ))}

        {effFillGradient && (
          <motion.path
            d={fillPath}
            fill={`url(#${gradientId})`}
            stroke="none"
            initial={effShowAnimation ? { opacity: 0 } : undefined}
            animate={effShowAnimation ? { opacity: 1 } : undefined}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        )}

        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={isSparkline ? 1.5 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={effShowAnimation ? { pathLength: 0 } : undefined}
          animate={effShowAnimation ? { pathLength: 1 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut" }}
          filter={effShowHighlights ? `url(#${glowId})` : undefined}
        />

        {effShowHighlights && (
          <>
            <motion.circle
              cx={scale.xAt(scale.maxIdx)}
              cy={scale.yAt(data[scale.maxIdx].trophies)}
              r={3.5}
              fill="#facc15"
              stroke="#1a0a2e"
              strokeWidth={1.5}
              initial={effShowAnimation ? { scale: 0 } : undefined}
              animate={effShowAnimation ? { scale: 1 } : undefined}
              transition={{ duration: 0.3, delay: 0.7 }}
            />
            <motion.circle
              cx={scale.xAt(lastIdx)}
              cy={scale.yAt(data[lastIdx].trophies)}
              r={4.5}
              fill={color}
              stroke="#1a0a2e"
              strokeWidth={2}
              initial={effShowAnimation ? { scale: 0 } : undefined}
              animate={effShowAnimation ? { scale: [0, 1.4, 1] } : undefined}
              transition={{ duration: 0.5, delay: 0.85 }}
              filter={`url(#${glowId})`}
            />
          </>
        )}

        {hoverPoint && (
          <>
            <line
              x1={hoverX}
              y1={scale.innerTop}
              x2={hoverX}
              y2={scale.innerBottom}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={4}
              fill={color}
              stroke="#1a0a2e"
              strokeWidth={2}
            />
          </>
        )}

        {effShowAxes &&
          xLabels.map((xl, i) => (
            <text
              key={`xl-${i}`}
              x={xl.x}
              y={effHeight - 4}
              textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
              fontSize="9"
              fill="rgba(148,163,184,0.6)"
              fontFamily="system-ui, sans-serif"
            >
              {xl.label}
            </text>
          ))}
      </svg>

      {hoverPoint && effShowTooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[120px] rounded-xl border border-white/10 bg-[#1a0a2e]/95 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-sm"
          style={{
            left: `${tooltipLeftPct}%`,
            top: `${(hoverY / effHeight) * 100}%`,
            transform: tooltipTransform,
          }}
          role="status"
        >
          <p className="flex items-baseline gap-1 text-sm font-black text-[#facc15]">
            <span className="tabular-nums">
              {hoverPoint.trophies.toLocaleString("uk-UA")}
            </span>
            <span className="text-[10px] font-bold text-slate-500">🏆</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {formatDateLabel(hoverPoint.timestamp)} {formatTimeLabel(hoverPoint.timestamp)}
          </p>
          {hoverDelta !== null && hoverDelta !== 0 && (
            <p
              className={`text-[10px] font-black tabular-nums ${
                hoverDelta > 0 ? "text-[#22c55e]" : "text-rose-400"
              }`}
            >
              {hoverDelta > 0 ? "+" : ""}
              {hoverDelta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

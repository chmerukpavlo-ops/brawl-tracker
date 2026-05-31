import { useMemo } from "react";
import type { TimelinePoint } from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";

interface TrophyTimelineProps {
  points: TimelinePoint[];
  /** Render width (svg viewbox). */
  width?: number;
  /** Render height (svg viewbox). */
  height?: number;
}

/**
 * Lightweight inline SVG sparkline of cumulative trophy delta over the
 * recent battle window. No `recharts` dependency — keeps the bundle
 * lean and the chart fully theme-aware.
 *
 * The line is a Catmull-Rom-ish smoothed path with a gradient fill
 * underneath. We also draw a baseline at y=0 (relative to the data) so
 * the user can see at a glance whether they're net positive or not.
 */
export default function TrophyTimeline({
  points,
  width = 320,
  height = 88,
}: TrophyTimelineProps) {
  const { t } = useTranslation();

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    // Normalize the cumulative series into the SVG viewport. We extend
    // the y-range by a small margin so the line never touches the edge.
    const values = points.map((p) => p.cumulative);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const padX = 6;
    const padY = 8;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;

    const projected = points.map((p, i) => {
      const x = padX + i * step;
      // Invert y because SVG origin is top-left.
      const y = padY + innerH - ((p.cumulative - min) / range) * innerH;
      return { x, y, point: p };
    });

    // Build a smooth path via quadratic bézier through midpoints.
    let d = `M ${projected[0].x} ${projected[0].y}`;
    for (let i = 1; i < projected.length; i++) {
      const prev = projected[i - 1];
      const cur = projected[i];
      const midX = (prev.x + cur.x) / 2;
      d += ` Q ${prev.x} ${prev.y} ${midX} ${(prev.y + cur.y) / 2} T ${cur.x} ${cur.y}`;
    }

    // Closed area path for gradient fill.
    const area = `${d} L ${projected[projected.length - 1].x} ${height - padY} L ${projected[0].x} ${height - padY} Z`;

    const baselineY = padY + innerH - ((0 - min) / range) * innerH;

    const lastPoint = projected[projected.length - 1];
    const positive = lastPoint.point.cumulative >= 0;

    return {
      projected,
      d,
      area,
      baselineY,
      stroke: positive ? "#facc15" : "#fb7185",
      fillGradId: positive ? "tt-fill-gold" : "tt-fill-rose",
    };
  }, [points, width, height]);

  if (!geometry) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-4 text-center text-[11px] text-slate-500">
        {t("battles.empty.body")}
      </div>
    );
  }

  const finalValue = geometry.projected[geometry.projected.length - 1].point.cumulative;
  const signLabel = finalValue > 0 ? `+${finalValue}` : `${finalValue}`;
  const accent = geometry.stroke;

  return (
    <figure
      aria-label={t("battles.timeline.title")}
      className="rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-3"
    >
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t("battles.timeline.title")}
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {t("battles.timeline.hint")}
          </p>
        </div>
        <span
          className="shrink-0 text-base font-black tabular-nums"
          style={{ color: accent }}
        >
          {signLabel}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-hidden="false"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="tt-fill-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tt-fill-rose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={0}
          x2={width}
          y1={geometry.baselineY}
          y2={geometry.baselineY}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="2 4"
          strokeWidth={1}
        />

        <path d={geometry.area} fill={`url(#${geometry.fillGradId})`} />
        <path
          d={geometry.d}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint dot for visual emphasis. */}
        {(() => {
          const last = geometry.projected[geometry.projected.length - 1];
          return (
            <circle cx={last.x} cy={last.y} r={3} fill={accent} stroke="#1a0a2e" strokeWidth={1.5} />
          );
        })()}
      </svg>
    </figure>
  );
}

import { type ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface DonutChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerContent?: ReactNode;
  animate?: boolean;
  ariaLabel?: string;
  /**
   * Optional second color → renders a vertical linearGradient (top-bottom).
   */
  gradientTo?: string;
  className?: string;
}

export default function DonutChart({
  value,
  max = 100,
  size = 160,
  strokeWidth = 14,
  color = "#facc15",
  trackColor = "rgba(255,255,255,0.08)",
  centerContent,
  animate = true,
  gradientTo,
  ariaLabel,
  className = "",
}: DonutChartProps) {
  const reduced = usePrefersReducedMotion();
  const shouldAnimate = animate && !reduced;
  const clamped = Math.max(0, Math.min(value, max));
  const ratio = max === 0 ? 0 : clamped / max;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const cx = size / 2;
  const cy = size / 2;
  const gradientId = gradientTo ? `donut-gradient-${color}-${gradientTo}` : null;
  const strokeUrl = gradientId ? `url(#${gradientId})` : color;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `Прогрес ${Math.round(ratio * 100)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={strokeUrl}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={shouldAnimate ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            shouldAnimate
              ? { duration: 1, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0 }
          }
        />
      </svg>
      {centerContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerContent}
        </div>
      )}
    </div>
  );
}

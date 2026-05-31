import AnimatedCounter from "./AnimatedCounter";
import DonutChart from "./DonutChart";

interface BrawlerProgressDonutProps {
  unlocked: number;
  total: number;
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export default function BrawlerProgressDonut({
  unlocked,
  total,
  percentage,
  size = 168,
  strokeWidth = 14,
}: BrawlerProgressDonutProps) {
  return (
    <DonutChart
      value={percentage}
      max={100}
      size={size}
      strokeWidth={strokeWidth}
      color="#facc15"
      gradientTo="#f97316"
      ariaLabel={`Розблоковано ${unlocked} з ${total} бравлерів, ${percentage}%`}
      centerContent={
        <div>
          <div className="flex items-baseline justify-center gap-1">
            <AnimatedCounter
              value={unlocked}
              className="text-2xl font-black text-white"
            />
            <span className="text-sm font-black text-slate-500">
              / {total}
            </span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Розблоковано
          </p>
          <p className="mt-1 text-base font-black text-[#facc15]">
            {percentage}%
          </p>
        </div>
      }
    />
  );
}

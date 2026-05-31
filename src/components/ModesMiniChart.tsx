interface ModesMiniChartProps {
  threeVsThree: number;
  solo: number;
  duo: number;
}

const BAR_W = 4;
const GAP = 2;
const HEIGHT = 16;

export default function ModesMiniChart({ threeVsThree, solo, duo }: ModesMiniChartProps) {
  const bars = [
    { value: threeVsThree, color: "#3b82f6" },
    { value: solo, color: "#a78bfa" },
    { value: duo, color: "#4ade80" },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);
  const width = bars.length * BAR_W + (bars.length - 1) * GAP;

  return (
    <svg
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className="shrink-0"
      aria-hidden
    >
      {bars.map((bar, i) => {
        const h = Math.max(3, Math.round((bar.value / max) * HEIGHT));
        return (
          <rect
            key={i}
            x={i * (BAR_W + GAP)}
            y={HEIGHT - h}
            width={BAR_W}
            height={h}
            rx={1}
            fill={bar.color}
          />
        );
      })}
    </svg>
  );
}

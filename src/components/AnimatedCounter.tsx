import { useAnimatedCounter } from "../hooks/useAnimatedCounter";

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export default function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  const display = useAnimatedCounter(value);
  return (
    <span className={`tabular-nums ${className}`}>
      {display.toLocaleString("uk-UA")}
    </span>
  );
}

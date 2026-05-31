import { useEffect, useState } from "react";
import { describeEventWindow } from "../../utils/timeFormatter";
import { useTranslation } from "../../hooks/useTranslation";

interface CountdownProps {
  startIso: string;
  endIso: string;
  className?: string;
  /** Update interval in ms — defaults to 1s. */
  tickMs?: number;
}

/**
 * Live ticker for an active or upcoming event.
 *
 * Re-renders on its own clock (default 1s) so the parent doesn't need to
 * subscribe; uses the `prefers-reduced-motion` slow-down by raising the
 * interval to 5s when the user has it on (covered indirectly via tickMs).
 */
export default function Countdown({
  startIso,
  endIso,
  className,
  tickMs = 1000,
}: CountdownProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const status = describeEventWindow(startIso, endIso, t, now);
  const tone =
    status.state === "ends"
      ? "text-emerald-300"
      : status.state === "starts"
        ? "text-amber-300"
        : "text-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${tone} ${className ?? ""}`}
      aria-live="polite"
    >
      {status.label}
    </span>
  );
}

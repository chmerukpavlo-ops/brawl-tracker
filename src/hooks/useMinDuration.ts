import { useEffect, useRef, useState } from "react";

export function useMinDuration(isActive: boolean, minMs: number = 300): boolean {
  const [held, setHeld] = useState<boolean>(isActive);
  const startedAtRef = useRef<number | null>(isActive ? Date.now() : null);

  useEffect(() => {
    if (isActive) {
      startedAtRef.current = Date.now();
      setHeld(true);
      return;
    }

    if (!held) return;

    const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
    if (elapsed >= minMs) {
      setHeld(false);
      return;
    }

    const timer = setTimeout(() => setHeld(false), minMs - elapsed);
    return () => clearTimeout(timer);
  }, [isActive, held, minMs]);

  return held;
}

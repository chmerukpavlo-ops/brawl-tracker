import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function read(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    try {
      const mq = window.matchMedia(QUERY);
      const handler = (event: MediaQueryListEvent) => setPrefers(event.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch {
      /* ignore */
    }
  }, []);

  return prefers;
}

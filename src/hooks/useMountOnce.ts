import { useEffect, useState } from "react";

/**
 * Returns `true` once `active` has been `true` at least once, then
 * stays `true` for the lifetime of the component. Lets us
 * conditionally mount a lazy-loaded sheet/modal so its chunk only
 * downloads when actually needed — without breaking the close
 * animation (the component remains mounted while `active` flips back
 * to false so its internal `AnimatePresence` can play the exit).
 */
export function useMountOnce(active: boolean): boolean {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active && !mounted) setMounted(true);
  }, [active, mounted]);
  return mounted;
}

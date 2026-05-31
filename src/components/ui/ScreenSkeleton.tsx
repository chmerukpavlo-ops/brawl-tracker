/**
 * Suspense fallback used while a lazy-loaded screen is being fetched.
 * Matches the rough chrome of every tab (status header + content area)
 * so the transition feels structural rather than blank.
 */
export default function ScreenSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col gap-4 px-4 pt-6"
      aria-busy="true"
      aria-label="Loading screen"
    >
      <div className="h-7 w-1/3 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="h-44 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="h-20 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  );
}

import Skeleton from "../Skeleton";

export default function BrawlerCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#2a1a4a]/60 p-3.5">
      <div className="flex items-start gap-3">
        <Skeleton rounded="rounded-xl" className="h-11 w-11" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3.5 w-12" />
      </div>
    </div>
  );
}

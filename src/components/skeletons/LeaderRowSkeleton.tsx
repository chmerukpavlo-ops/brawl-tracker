import Skeleton from "../Skeleton";

export default function LeaderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#2a1a4a]/60 p-4">
      <Skeleton rounded="rounded-xl" className="h-10 w-10" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

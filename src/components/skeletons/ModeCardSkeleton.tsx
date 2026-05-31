import Skeleton from "../Skeleton";

export default function ModeCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Skeleton rounded="rounded-lg" className="mb-2 h-5 w-5" />
      <Skeleton className="h-2.5 w-2/3" />
      <Skeleton className="mt-2 h-6 w-1/2" />
    </div>
  );
}

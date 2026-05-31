import Skeleton from "../Skeleton";

export default function ProfileCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#2d1b4e] to-[#2a1a4a] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-4">
        <Skeleton rounded="rounded-2xl" className="h-14 w-14" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton rounded="rounded-full" className="h-5 w-5" />
      </div>
    </div>
  );
}

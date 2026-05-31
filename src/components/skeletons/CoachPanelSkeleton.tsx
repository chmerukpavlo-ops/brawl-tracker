import Skeleton from "../Skeleton";

interface CoachPanelSkeletonProps {
  caption?: string;
}

export default function CoachPanelSkeleton({ caption }: CoachPanelSkeletonProps) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#1a0a2e]/60 p-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/4" />
      {caption && (
        <p className="pt-1 text-center text-[11px] font-medium text-[#facc15]/80">
          {caption}
        </p>
      )}
    </div>
  );
}

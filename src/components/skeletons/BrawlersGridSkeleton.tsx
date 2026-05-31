import BrawlerCardSkeleton from "./BrawlerCardSkeleton";

interface BrawlersGridSkeletonProps {
  count?: number;
}

export default function BrawlersGridSkeleton({ count = 6 }: BrawlersGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <BrawlerCardSkeleton key={i} />
      ))}
    </div>
  );
}

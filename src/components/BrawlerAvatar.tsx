import { useEffect, useState } from "react";
import { brawlersMetadata } from "../types";
import { getBrawlerImageUrl } from "../utils/brawlerImage";

interface BrawlerAvatarProps {
  brawlerId?: number | null;
  brawlerName?: string;
  size?: number;
  className?: string;
  rounded?: string;
}

export default function BrawlerAvatar({
  brawlerId,
  brawlerName,
  size = 44,
  className = "",
  rounded = "rounded-xl",
}: BrawlerAvatarProps) {
  const url = getBrawlerImageUrl(brawlerId ?? null);
  const fallbackEmoji =
    (brawlerName && brawlersMetadata[brawlerName.toUpperCase()]?.imageFallback) ?? "⭐";

  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [url]);

  const baseClass = `inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#1a0a2e] ring-1 ring-white/10 ${rounded} ${className}`;
  const style = { width: size, height: size };
  const emojiSize = Math.round(size * 0.55);

  if (!url || errored) {
    return (
      <span className={baseClass} style={style} aria-hidden>
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{fallbackEmoji}</span>
      </span>
    );
  }

  return (
    <span className={baseClass} style={style}>
      <img
        src={url}
        alt={brawlerName ?? "Brawler"}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </span>
  );
}

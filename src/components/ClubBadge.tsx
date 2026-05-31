import { Shield } from "lucide-react";
import type { ClubInfo } from "../types";

interface ClubBadgeProps {
  club: Pick<ClubInfo, "name" | "badgeId" | "type"> | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 36, icon: 18, text: "text-xs" },
  md: { box: 48, icon: 22, text: "text-sm" },
  lg: { box: 72, icon: 34, text: "text-lg" },
} as const;

/**
 * Brawl Stars API does not expose a public CDN URL for the badgeId, so we
 * render a glyph badge using the first letter (or emoji-like glyph) of the
 * club name, with a tone derived from `badgeId` for visual variety.
 */
export default function ClubBadge({
  club,
  size = "md",
  showName = false,
  className = "",
}: ClubBadgeProps) {
  const cfg = SIZE_MAP[size];
  const name = club?.name ?? "Клуб";
  const initial = (name.match(/\p{L}/u)?.[0] ?? "C").toUpperCase();
  // Pick a tone by hash so different clubs visually differ.
  const tones = [
    { ring: "ring-[#facc15]/40", from: "from-[#facc15]/20", text: "text-[#facc15]" },
    { ring: "ring-[#a78bfa]/40", from: "from-[#7c3aed]/25", text: "text-[#c4b5fd]" },
    { ring: "ring-[#60a5fa]/40", from: "from-[#3b82f6]/25", text: "text-[#93c5fd]" },
    { ring: "ring-emerald-400/40", from: "from-emerald-500/20", text: "text-emerald-300" },
    { ring: "ring-rose-400/40", from: "from-rose-500/20", text: "text-rose-300" },
  ];
  const hash = (club?.badgeId ?? Math.abs(hashString(name))) % tones.length;
  const tone = tones[hash] ?? tones[0];

  const badge = (
    <span
      style={{ width: cfg.box, height: cfg.box }}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.from} to-[#1a0a2e] ring-2 ${tone.ring}`}
      aria-hidden
    >
      {name === "Клуб" ? (
        <Shield size={cfg.icon} className={tone.text} />
      ) : (
        <span className={`font-black uppercase ${tone.text}`} style={{ fontSize: cfg.icon }}>
          {initial}
        </span>
      )}
    </span>
  );

  if (!showName) {
    return <span className={className}>{badge}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {badge}
      <span className={`min-w-0 truncate font-bold text-white ${cfg.text}`}>{name}</span>
    </span>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

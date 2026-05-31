import type { BrawlerMetadata } from "../types";

type Rarity = BrawlerMetadata["rarity"];

export interface RarityStyle {
  label: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
}

const STYLES: Record<Rarity, RarityStyle> = {
  COMMON: {
    label: "Common",
    bg: "bg-slate-500/10",
    border: "border-slate-400/30",
    text: "text-slate-200",
    glow: "bg-slate-400/30",
  },
  RARE: {
    label: "Rare",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/30",
    text: "text-emerald-300",
    glow: "bg-emerald-400/30",
  },
  SUPER_RARE: {
    label: "Super Rare",
    bg: "bg-blue-500/10",
    border: "border-blue-400/30",
    text: "text-blue-300",
    glow: "bg-blue-400/30",
  },
  EPIC: {
    label: "Epic",
    bg: "bg-rose-500/10",
    border: "border-rose-400/30",
    text: "text-rose-300",
    glow: "bg-rose-400/30",
  },
  MYTHIC: {
    label: "Mythic",
    bg: "bg-violet-500/10",
    border: "border-violet-400/30",
    text: "text-violet-300",
    glow: "bg-violet-400/30",
  },
  LEGENDARY: {
    label: "Legendary",
    bg: "bg-amber-500/10",
    border: "border-amber-400/40",
    text: "text-amber-300",
    glow: "bg-amber-400/40",
  },
};

const DEFAULT_STYLE: RarityStyle = STYLES.COMMON;

export function getRarityStyle(rarity?: Rarity): RarityStyle {
  if (!rarity) return DEFAULT_STYLE;
  return STYLES[rarity] ?? DEFAULT_STYLE;
}

export function getRankTierName(rank: number): string {
  if (rank >= 35) return "Майстер";
  if (rank >= 31) return "Легенда";
  if (rank >= 26) return "Експерт";
  if (rank >= 21) return "Профі";
  if (rank >= 16) return "Срібло";
  if (rank >= 11) return "Бронза";
  return "Новачок";
}

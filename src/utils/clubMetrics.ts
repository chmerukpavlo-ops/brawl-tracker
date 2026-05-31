import type { ClubInfo, ClubMember, ClubRole, ClubType } from "../types";

export interface RoleStyle {
  bg: string;
  text: string;
  border: string;
}

export const ROLE_LABEL: Record<ClubRole, string> = {
  president: "Президент",
  vicePresident: "Віце-президент",
  senior: "Старший",
  member: "Учасник",
};

export const ROLE_STYLE: Record<ClubRole, RoleStyle> = {
  president: {
    bg: "bg-[#facc15]/15",
    text: "text-[#facc15]",
    border: "border-[#facc15]/40",
  },
  vicePresident: {
    bg: "bg-[#a78bfa]/15",
    text: "text-[#c4b5fd]",
    border: "border-[#a78bfa]/40",
  },
  senior: {
    bg: "bg-[#60a5fa]/15",
    text: "text-[#93c5fd]",
    border: "border-[#60a5fa]/40",
  },
  member: {
    bg: "bg-white/5",
    text: "text-slate-300",
    border: "border-white/10",
  },
};

const ROLE_ORDER: Record<ClubRole, number> = {
  president: 0,
  vicePresident: 1,
  senior: 2,
  member: 3,
};

export function getRoleLabel(role: ClubRole | string): string {
  return ROLE_LABEL[role as ClubRole] ?? ROLE_LABEL.member;
}

export function getRoleStyle(role: ClubRole | string): RoleStyle {
  return ROLE_STYLE[role as ClubRole] ?? ROLE_STYLE.member;
}

export function getRoleOrder(role: ClubRole | string): number {
  return ROLE_ORDER[role as ClubRole] ?? 99;
}

export const CLUB_TYPE_LABEL: Record<ClubType, string> = {
  open: "Відкритий",
  inviteOnly: "За запрошенням",
  closed: "Закритий",
};

export interface ClubTypeStyle {
  bg: string;
  text: string;
  border: string;
}

export const CLUB_TYPE_STYLE: Record<ClubType, ClubTypeStyle> = {
  open: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
  inviteOnly: {
    bg: "bg-[#facc15]/10",
    text: "text-[#facc15]",
    border: "border-[#facc15]/40",
  },
  closed: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/40",
  },
};

export function getClubTypeLabel(type: ClubType | string): string {
  return CLUB_TYPE_LABEL[type as ClubType] ?? "—";
}

export function getClubTypeStyle(type: ClubType | string): ClubTypeStyle {
  return CLUB_TYPE_STYLE[type as ClubType] ?? CLUB_TYPE_STYLE.open;
}

export interface ClubStats {
  totalTrophies: number;
  avgTrophies: number;
  memberCount: number;
  topPlayer: ClubMember | null;
  fillRatio: number;
  /** Per-role member counts (for donut/badges). */
  roles: Record<ClubRole, number>;
}

export function calculateClubStats(club: ClubInfo | null | undefined): ClubStats {
  const members = club?.members ?? [];
  const memberCount = members.length;
  const totalTrophies =
    typeof club?.trophies === "number" && club.trophies > 0
      ? club.trophies
      : members.reduce((sum, m) => sum + (m.trophies || 0), 0);
  const avgTrophies = memberCount ? Math.round(totalTrophies / memberCount) : 0;
  const topPlayer =
    members.length > 0
      ? [...members].sort((a, b) => b.trophies - a.trophies)[0]
      : null;
  const roles: Record<ClubRole, number> = {
    president: 0,
    vicePresident: 0,
    senior: 0,
    member: 0,
  };
  for (const m of members) {
    const r = (m.role as ClubRole) in roles ? (m.role as ClubRole) : "member";
    roles[r] += 1;
  }
  return {
    totalTrophies,
    avgTrophies,
    memberCount,
    topPlayer,
    fillRatio: Math.min(1, memberCount / 30),
    roles,
  };
}

export function sortMembersByTrophies(members: ClubMember[]): ClubMember[] {
  return [...members].sort((a, b) => b.trophies - a.trophies);
}

export function sortMembersByRole(members: ClubMember[]): ClubMember[] {
  return [...members].sort((a, b) => {
    const r = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (r !== 0) return r;
    return b.trophies - a.trophies;
  });
}

export function normalizeClubTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

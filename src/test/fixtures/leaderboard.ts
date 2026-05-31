import type { PlayerRanking, ClubRanking } from "../../types";

export function mockLeaderboard(count = 5): PlayerRanking[] {
  return Array.from({ length: count }, (_, i) => ({
    tag: `#LB${i + 1}`,
    name: `LbPlayer${i + 1}`,
    trophies: 200_000 - i * 1_000,
    rank: i + 1,
    club: { name: `Club ${i + 1}` },
  }));
}

export function mockClubLeaderboard(count = 5): ClubRanking[] {
  return Array.from({ length: count }, (_, i) => ({
    tag: `#CLB${i + 1}`,
    name: `LbClub${i + 1}`,
    badgeId: 8_000_000 + i,
    trophies: 800_000 - i * 5_000,
    memberCount: 30,
    rank: i + 1,
  }));
}

import type { ClubInfo, ClubMember } from "../../types";

export function mockClubMember(overrides: Partial<ClubMember> = {}): ClubMember {
  return {
    tag: "#MEMBER1",
    name: "Member One",
    role: "member",
    trophies: 12_000,
    ...overrides,
  };
}

export function mockClub(overrides: Partial<ClubInfo> = {}): ClubInfo {
  return {
    tag: "#CLUB1",
    name: "Test Club",
    description: "A test club used in unit + integration suites.",
    type: "open",
    badgeId: 8_000_000,
    requiredTrophies: 10_000,
    trophies: 120_000,
    members: [
      mockClubMember({ tag: "#PRES", name: "President", role: "president" }),
      mockClubMember({ tag: "#VP", name: "Vice", role: "vicePresident" }),
      mockClubMember({ tag: "#SEN1", name: "Senior", role: "senior" }),
      mockClubMember({ tag: "#MEM1", name: "Regular", role: "member" }),
    ],
    ...overrides,
  };
}

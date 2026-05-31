import type { BrawlerMetadata } from "../types";

export type BrawlerRarity = BrawlerMetadata["rarity"];
export type BrawlerClass =
  | "Damage Dealer"
  | "Tank"
  | "Marksman"
  | "Assassin"
  | "Support"
  | "Controller"
  | "Artillery";

export interface BrawlerDefinition {
  id: number;
  name: string;
  displayName: string;
  rarity: BrawlerRarity;
  class: BrawlerClass;
}

/**
 * Каталог бравлерів станом на 2025-2026. Покриває ~85 персонажів, які
 * використовуються у Brawl Stars. Якщо у player.brawlers є невідомий
 * бравлер — він просто додатково рахується як unlocked (див. brawlerProgress).
 */
export const ALL_BRAWLERS: BrawlerDefinition[] = [
  // Starting / Trophy Road Rare
  { id: 16000000, name: "SHELLY", displayName: "Shelly", rarity: "COMMON", class: "Damage Dealer" },
  { id: 16000001, name: "COLT", displayName: "Colt", rarity: "COMMON", class: "Marksman" },
  { id: 16000002, name: "BULL", displayName: "Bull", rarity: "COMMON", class: "Tank" },
  { id: 16000003, name: "BROCK", displayName: "Brock", rarity: "COMMON", class: "Marksman" },
  { id: 16000004, name: "RICO", displayName: "Rico", rarity: "SUPER_RARE", class: "Damage Dealer" },
  { id: 16000005, name: "SPIKE", displayName: "Spike", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000006, name: "BARLEY", displayName: "Barley", rarity: "RARE", class: "Artillery" },
  { id: 16000007, name: "JESSIE", displayName: "Jessie", rarity: "SUPER_RARE", class: "Damage Dealer" },
  { id: 16000008, name: "NITA", displayName: "Nita", rarity: "RARE", class: "Damage Dealer" },
  { id: 16000009, name: "DYNAMIKE", displayName: "Dynamike", rarity: "SUPER_RARE", class: "Artillery" },
  { id: 16000010, name: "EL PRIMO", displayName: "El Primo", rarity: "RARE", class: "Tank" },
  { id: 16000011, name: "MORTIS", displayName: "Mortis", rarity: "MYTHIC", class: "Assassin" },
  { id: 16000012, name: "CROW", displayName: "Crow", rarity: "LEGENDARY", class: "Assassin" },
  { id: 16000013, name: "POCO", displayName: "Poco", rarity: "RARE", class: "Support" },
  { id: 16000014, name: "BO", displayName: "Bo", rarity: "EPIC", class: "Marksman" },
  { id: 16000015, name: "PIPER", displayName: "Piper", rarity: "EPIC", class: "Marksman" },
  { id: 16000016, name: "PAM", displayName: "Pam", rarity: "EPIC", class: "Support" },
  { id: 16000017, name: "TARA", displayName: "Tara", rarity: "MYTHIC", class: "Damage Dealer" },
  { id: 16000018, name: "DARRYL", displayName: "Darryl", rarity: "SUPER_RARE", class: "Tank" },
  { id: 16000019, name: "PENNY", displayName: "Penny", rarity: "SUPER_RARE", class: "Controller" },
  { id: 16000020, name: "FRANK", displayName: "Frank", rarity: "EPIC", class: "Tank" },
  { id: 16000021, name: "GENE", displayName: "Gene", rarity: "MYTHIC", class: "Support" },
  { id: 16000022, name: "TICK", displayName: "Tick", rarity: "SUPER_RARE", class: "Artillery" },
  { id: 16000023, name: "LEON", displayName: "Leon", rarity: "LEGENDARY", class: "Assassin" },
  { id: 16000024, name: "ROSA", displayName: "Rosa", rarity: "RARE", class: "Tank" },
  { id: 16000025, name: "CARL", displayName: "Carl", rarity: "SUPER_RARE", class: "Damage Dealer" },
  { id: 16000026, name: "BIBI", displayName: "Bibi", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000027, name: "8-BIT", displayName: "8-Bit", rarity: "SUPER_RARE", class: "Damage Dealer" },
  { id: 16000028, name: "SANDY", displayName: "Sandy", rarity: "LEGENDARY", class: "Support" },
  { id: 16000029, name: "BEA", displayName: "Bea", rarity: "EPIC", class: "Marksman" },
  { id: 16000030, name: "EMZ", displayName: "Emz", rarity: "SUPER_RARE", class: "Controller" },
  { id: 16000031, name: "MR. P", displayName: "Mr. P", rarity: "MYTHIC", class: "Controller" },
  { id: 16000032, name: "MAX", displayName: "Max", rarity: "MYTHIC", class: "Support" },
  { id: 16000033, name: "JACKY", displayName: "Jacky", rarity: "SUPER_RARE", class: "Tank" },
  { id: 16000034, name: "GALE", displayName: "Gale", rarity: "MYTHIC", class: "Controller" },
  { id: 16000035, name: "NANI", displayName: "Nani", rarity: "EPIC", class: "Marksman" },
  { id: 16000036, name: "SPROUT", displayName: "Sprout", rarity: "MYTHIC", class: "Controller" },
  { id: 16000037, name: "SURGE", displayName: "Surge", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000038, name: "COLETTE", displayName: "Colette", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000039, name: "AMBER", displayName: "Amber", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000040, name: "LOU", displayName: "Lou", rarity: "MYTHIC", class: "Controller" },
  { id: 16000041, name: "BYRON", displayName: "Byron", rarity: "MYTHIC", class: "Support" },
  { id: 16000042, name: "EDGAR", displayName: "Edgar", rarity: "EPIC", class: "Assassin" },
  { id: 16000043, name: "RUFFS", displayName: "Colonel Ruffs", rarity: "MYTHIC", class: "Support" },
  { id: 16000044, name: "STU", displayName: "Stu", rarity: "EPIC", class: "Assassin" },
  { id: 16000045, name: "BELLE", displayName: "Belle", rarity: "MYTHIC", class: "Marksman" },
  { id: 16000046, name: "SQUEAK", displayName: "Squeak", rarity: "MYTHIC", class: "Artillery" },
  { id: 16000047, name: "GROM", displayName: "Grom", rarity: "EPIC", class: "Artillery" },
  { id: 16000048, name: "BUZZ", displayName: "Buzz", rarity: "MYTHIC", class: "Assassin" },
  { id: 16000049, name: "GRIFF", displayName: "Griff", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000050, name: "ASH", displayName: "Ash", rarity: "MYTHIC", class: "Tank" },
  { id: 16000051, name: "MEG", displayName: "Meg", rarity: "LEGENDARY", class: "Tank" },
  { id: 16000052, name: "LOLA", displayName: "Lola", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000053, name: "FANG", displayName: "Fang", rarity: "EPIC", class: "Assassin" },
  { id: 16000054, name: "EVE", displayName: "Eve", rarity: "MYTHIC", class: "Damage Dealer" },
  { id: 16000055, name: "JANET", displayName: "Janet", rarity: "MYTHIC", class: "Marksman" },
  { id: 16000056, name: "BONNIE", displayName: "Bonnie", rarity: "EPIC", class: "Marksman" },
  { id: 16000057, name: "OTIS", displayName: "Otis", rarity: "MYTHIC", class: "Controller" },
  { id: 16000058, name: "SAM", displayName: "Sam", rarity: "EPIC", class: "Tank" },
  { id: 16000059, name: "GUS", displayName: "Gus", rarity: "SUPER_RARE", class: "Support" },
  { id: 16000060, name: "BUSTER", displayName: "Buster", rarity: "MYTHIC", class: "Tank" },
  { id: 16000061, name: "CHESTER", displayName: "Chester", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000062, name: "GRAY", displayName: "Gray", rarity: "MYTHIC", class: "Support" },
  { id: 16000063, name: "MANDY", displayName: "Mandy", rarity: "MYTHIC", class: "Marksman" },
  { id: 16000064, name: "R-T", displayName: "R-T", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000065, name: "WILLOW", displayName: "Willow", rarity: "MYTHIC", class: "Controller" },
  { id: 16000066, name: "MAISIE", displayName: "Maisie", rarity: "EPIC", class: "Marksman" },
  { id: 16000067, name: "HANK", displayName: "Hank", rarity: "EPIC", class: "Tank" },
  { id: 16000068, name: "CORDELIUS", displayName: "Cordelius", rarity: "LEGENDARY", class: "Assassin" },
  { id: 16000069, name: "DOUG", displayName: "Doug", rarity: "MYTHIC", class: "Support" },
  { id: 16000070, name: "PEARL", displayName: "Pearl", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000071, name: "CHUCK", displayName: "Chuck", rarity: "EPIC", class: "Controller" },
  { id: 16000072, name: "CHARLIE", displayName: "Charlie", rarity: "MYTHIC", class: "Controller" },
  { id: 16000073, name: "MICO", displayName: "Mico", rarity: "LEGENDARY", class: "Assassin" },
  { id: 16000074, name: "KIT", displayName: "Kit", rarity: "LEGENDARY", class: "Support" },
  { id: 16000075, name: "LARRY & LAWRIE", displayName: "Larry & Lawrie", rarity: "EPIC", class: "Damage Dealer" },
  { id: 16000076, name: "MELODIE", displayName: "Melodie", rarity: "MYTHIC", class: "Assassin" },
  { id: 16000077, name: "ANGELO", displayName: "Angelo", rarity: "MYTHIC", class: "Marksman" },
  { id: 16000078, name: "DRACO", displayName: "Draco", rarity: "LEGENDARY", class: "Tank" },
  { id: 16000079, name: "LILY", displayName: "Lily", rarity: "MYTHIC", class: "Assassin" },
  { id: 16000080, name: "BERRY", displayName: "Berry", rarity: "EPIC", class: "Support" },
  { id: 16000081, name: "CLANCY", displayName: "Clancy", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000082, name: "MOE", displayName: "Moe", rarity: "LEGENDARY", class: "Damage Dealer" },
  { id: 16000083, name: "KENJI", displayName: "Kenji", rarity: "LEGENDARY", class: "Assassin" },
  { id: 16000084, name: "SHADE", displayName: "Shade", rarity: "MYTHIC", class: "Assassin" },
  { id: 16000085, name: "JUJU", displayName: "Juju", rarity: "EPIC", class: "Controller" },
  { id: 16000086, name: "MEEPLE", displayName: "Meeple", rarity: "EPIC", class: "Controller" },
  { id: 16000087, name: "OLLIE", displayName: "Ollie", rarity: "LEGENDARY", class: "Controller" },
  { id: 16000088, name: "FINX", displayName: "Finx", rarity: "MYTHIC", class: "Damage Dealer" },
  { id: 16000089, name: "LUMI", displayName: "Lumi", rarity: "LEGENDARY", class: "Damage Dealer" },
];

export const RARITY_ORDER: BrawlerRarity[] = [
  "COMMON",
  "RARE",
  "SUPER_RARE",
  "EPIC",
  "MYTHIC",
  "LEGENDARY",
];

export const CLASS_ORDER: BrawlerClass[] = [
  "Damage Dealer",
  "Tank",
  "Marksman",
  "Assassin",
  "Support",
  "Controller",
  "Artillery",
];

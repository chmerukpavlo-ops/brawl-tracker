import type { BrawlerInfo } from "../types";
import {
  ALL_BRAWLERS,
  CLASS_ORDER,
  RARITY_ORDER,
  type BrawlerClass,
  type BrawlerDefinition,
  type BrawlerRarity,
} from "../data/allBrawlers";

export function normalizeBrawlerName(name: string): string {
  return name.trim().toUpperCase();
}

export interface CategoryProgress<K extends string> {
  key: K;
  total: number;
  unlocked: number;
  percentage: number;
}

export interface CollectionProgress {
  total: number;
  unlocked: number;
  locked: number;
  percentage: number;
  unknownUnlocked: number;
  byRarity: CategoryProgress<BrawlerRarity>[];
  byClass: CategoryProgress<BrawlerClass>[];
  missing: BrawlerDefinition[];
  unlockedDefinitions: BrawlerDefinition[];
  unlockedIds: Set<number>;
}

interface CategoryAccumulator<K extends string> {
  key: K;
  total: number;
  unlocked: number;
}

function buildCategoryList<K extends string>(
  order: K[],
  acc: Map<K, CategoryAccumulator<K>>
): CategoryProgress<K>[] {
  return order
    .map((k) => acc.get(k))
    .filter((v): v is CategoryAccumulator<K> => !!v && v.total > 0)
    .map((v) => ({
      key: v.key,
      total: v.total,
      unlocked: v.unlocked,
      percentage:
        v.total === 0 ? 0 : Math.round((v.unlocked / v.total) * 100),
    }));
}

export function calculateProgress(
  playerBrawlers: BrawlerInfo[] | undefined | null,
  catalog: BrawlerDefinition[] = ALL_BRAWLERS
): CollectionProgress {
  const ownedIds = new Set<number>();
  const ownedNames = new Set<string>();
  if (playerBrawlers) {
    for (const b of playerBrawlers) {
      if (typeof b.id === "number") ownedIds.add(b.id);
      if (typeof b.name === "string") ownedNames.add(normalizeBrawlerName(b.name));
    }
  }

  const total = catalog.length;
  const unlockedIds = new Set<number>();
  const unlockedDefinitions: BrawlerDefinition[] = [];
  const missing: BrawlerDefinition[] = [];

  const rarityAcc = new Map<BrawlerRarity, CategoryAccumulator<BrawlerRarity>>();
  for (const r of RARITY_ORDER) {
    rarityAcc.set(r, { key: r, total: 0, unlocked: 0 });
  }
  const classAcc = new Map<BrawlerClass, CategoryAccumulator<BrawlerClass>>();
  for (const c of CLASS_ORDER) {
    classAcc.set(c, { key: c, total: 0, unlocked: 0 });
  }

  for (const def of catalog) {
    const isOwned =
      ownedIds.has(def.id) || ownedNames.has(normalizeBrawlerName(def.name));
    const rBucket = rarityAcc.get(def.rarity);
    if (rBucket) {
      rBucket.total += 1;
      if (isOwned) rBucket.unlocked += 1;
    }
    const cBucket = classAcc.get(def.class);
    if (cBucket) {
      cBucket.total += 1;
      if (isOwned) cBucket.unlocked += 1;
    }
    if (isOwned) {
      unlockedIds.add(def.id);
      unlockedDefinitions.push(def);
    } else {
      missing.push(def);
    }
  }

  const playerOwnedCount = playerBrawlers?.length ?? 0;
  const knownUnlocked = unlockedIds.size;
  const unknownUnlocked = Math.max(0, playerOwnedCount - knownUnlocked);

  if (unknownUnlocked > 0 && typeof console !== "undefined") {
    console.warn(
      `[brawlerProgress] У гравця ${unknownUnlocked} бравлерів поза каталогом — каталог потребує оновлення`
    );
  }

  const effectiveTotal = total + unknownUnlocked;
  const effectiveUnlocked = knownUnlocked + unknownUnlocked;
  const percentage =
    effectiveTotal === 0
      ? 0
      : Math.round((effectiveUnlocked / effectiveTotal) * 100);

  return {
    total: effectiveTotal,
    unlocked: effectiveUnlocked,
    locked: Math.max(0, effectiveTotal - effectiveUnlocked),
    percentage,
    unknownUnlocked,
    byRarity: buildCategoryList(RARITY_ORDER, rarityAcc),
    byClass: buildCategoryList(CLASS_ORDER, classAcc),
    missing,
    unlockedDefinitions,
    unlockedIds,
  };
}

export function groupMissingByRarity(
  missing: BrawlerDefinition[]
): Map<BrawlerRarity, BrawlerDefinition[]> {
  const map = new Map<BrawlerRarity, BrawlerDefinition[]>();
  for (const r of RARITY_ORDER) map.set(r, []);
  for (const def of missing) {
    const arr = map.get(def.rarity);
    if (arr) arr.push(def);
  }
  return map;
}

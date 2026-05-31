const BASE_URL = "https://cdn.brawlify.com/brawlers/borders";

export function getBrawlerImageUrl(brawlerId: number | undefined | null): string | null {
  if (!brawlerId || !Number.isFinite(brawlerId)) return null;
  return `${BASE_URL}/${brawlerId}.png`;
}

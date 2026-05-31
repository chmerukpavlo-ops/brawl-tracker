import type { Meta, StoryObj } from "@storybook/react-vite";
import RarityBadge from "./RarityBadge";

const meta: Meta<typeof RarityBadge> = {
  title: "UI Primitives/RarityBadge",
  component: RarityBadge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Small chip used on every BrawlerCard (and inside the brawler " +
          "detail sheet) to surface Brawlify's `rarity` payload. The colour " +
          "comes straight from the API so when Supercell ships a new tier " +
          "we don't need to add a translation — the chip is rendered with " +
          "Brawlify's own hex.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RarityBadge>;

const RARITY = (id: number, name: string, color: string) => ({ id, name, color });

export const Common: Story = {
  args: { rarity: RARITY(1, "Common", "#94a3b8") },
};
export const Rare: Story = {
  args: { rarity: RARITY(2, "Rare", "#22c55e") },
};
export const SuperRare: Story = {
  args: { rarity: RARITY(3, "Super Rare", "#3b82f6") },
};
export const Epic: Story = {
  args: { rarity: RARITY(4, "Epic", "#a855f7") },
};
export const Mythic: Story = {
  args: { rarity: RARITY(5, "Mythic", "#ef4444") },
};
export const Legendary: Story = {
  args: { rarity: RARITY(6, "Legendary", "#facc15") },
};

/**
 * The badge tolerates `undefined` (Brawlify occasionally omits the
 * `rarity` field for unreleased brawlers). It must render nothing
 * rather than a fallback chip — false rarity info is worse than none.
 */
export const Missing: Story = {
  args: { rarity: undefined },
  parameters: {
    docs: {
      description: {
        story:
          "When the API doesn't return a rarity object the badge collapses " +
          "to nothing. Callers rely on this to avoid extra null checks.",
      },
    },
  },
};

export const AllVariants: StoryObj = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3 bg-[#1a0a2e] p-6">
      {[
        ["Common", "#94a3b8"],
        ["Rare", "#22c55e"],
        ["Super Rare", "#3b82f6"],
        ["Epic", "#a855f7"],
        ["Mythic", "#ef4444"],
        ["Legendary", "#facc15"],
      ].map(([name, color], i) => (
        <RarityBadge key={name} rarity={{ id: i + 1, name, color }} />
      ))}
    </div>
  ),
};

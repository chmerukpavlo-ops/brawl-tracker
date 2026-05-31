import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import BrawlerCard from "./BrawlerCard";
import { BRAWLER_FIXTURES } from "../../test/fixtures/brawler";

const meta: Meta<typeof BrawlerCard> = {
  title: "Features/BrawlerCard",
  component: BrawlerCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The encyclopedia tile. Renders Brawlify's portrait, the rarity " +
          "chip, and the class label as a single 88×88-ish thumbnail. " +
          "Tapping the card opens the brawler detail sheet (here we wire " +
          "the action to a Storybook spy via the `onSelect` arg).\n\n" +
          "**Tip**: switch the rarity in Controls to see the radial " +
          "background shift to match `rarity.color`.",
      },
    },
  },
  args: {
    onSelect: fn(),
    brawler: BRAWLER_FIXTURES.shelly,
  },
};

export default meta;
type Story = StoryObj<typeof BrawlerCard>;

export const Common: Story = {
  args: { brawler: BRAWLER_FIXTURES.shelly },
};

export const Rare: Story = {
  args: { brawler: BRAWLER_FIXTURES.colt },
};

export const Epic: Story = {
  args: { brawler: BRAWLER_FIXTURES.jacky },
};

export const Mythic: Story = {
  args: { brawler: BRAWLER_FIXTURES.crow },
};

export const Legendary: Story = {
  args: { brawler: BRAWLER_FIXTURES.amber },
};

/**
 * The encyclopedia grid renders ~80 cards in a 3-column scroll-list.
 * This story validates that the gradient backgrounds don't bleed
 * across cells and that the column gap reads right at small widths.
 */
export const Grid: StoryObj = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid w-[360px] grid-cols-3 gap-2 bg-[#1a0a2e] p-4">
      {Object.values(BRAWLER_FIXTURES).map((brawler) => (
        <BrawlerCard key={brawler.id} brawler={brawler} onSelect={() => {}} />
      ))}
    </div>
  ),
};

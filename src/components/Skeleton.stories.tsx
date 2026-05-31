import type { Meta, StoryObj } from "@storybook/react-vite";
import Skeleton from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI Primitives/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Shimmer skeleton placeholder. Used while we wait for player data, " +
          "battle log, or brawler portraits. The opacity-pulse animation halves " +
          "the perceived loading time vs. a plain spinner; the gradient sweep " +
          "adds direction so users sense progress.\n\n" +
          "**Accessibility**: ships with `aria-busy` and `aria-live='polite'` " +
          "so screen readers announce when the skeleton is replaced with real content.",
      },
    },
  },
  argTypes: {
    shimmer: {
      control: "boolean",
      description: "Toggle the moving gradient sweep on top of the opacity pulse.",
    },
    rounded: {
      control: "select",
      options: ["rounded-md", "rounded-xl", "rounded-2xl", "rounded-full"],
    },
  },
  args: {
    shimmer: true,
    rounded: "rounded-xl",
    className: "h-16 w-64",
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {};

export const NoShimmer: Story = {
  args: { shimmer: false },
  parameters: {
    docs: {
      description: {
        story:
          "Disable the gradient sweep when stacking many skeletons — the " +
          "combined motion can feel busy. The opacity pulse alone is enough.",
      },
    },
  },
};

export const Avatar: Story = {
  args: { className: "h-16 w-16", rounded: "rounded-full" },
};

export const Card: Story = {
  args: { className: "h-32 w-72", rounded: "rounded-2xl" },
};

/**
 * A real-world example: the Pinned Players strip while data is in
 * flight. Composing skeletons gives a believable layout preview
 * without any business logic in the component.
 */
export const PinnedPlayersGrid: StoryObj = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid w-80 grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3"
        >
          <Skeleton className="h-12 w-12" rounded="rounded-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  ),
};

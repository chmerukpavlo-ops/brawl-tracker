import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Search } from "lucide-react";
import EmptyState from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "UI Primitives/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Empty / zero-data states across the app — pinned grid before " +
          "anything is pinned, battle log before the first sync, leaderboard " +
          "without filters. The component leans into a friendly emoji or " +
          "illustration plus a single primary CTA so the screen never feels punitive.",
      },
    },
  },
  args: {},
  argTypes: {
    illustration: {
      control: "text",
      description:
        "Pass an emoji string for the floating animation, or a ReactNode " +
        "for a custom SVG / lucide icon (animation skipped).",
    },
    compact: {
      control: "boolean",
      description: "Use compact spacing for inline empty states inside cards.",
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoPlayersYet: Story = {
  args: {
    illustration: "📌",
    title: "Закріплених гравців немає",
    description:
      "Знайди гравця, утримай тег і обери «Закріпити», щоб слідкувати за прогресом.",
    action: {
      label: "Знайти гравця",
      onClick: fn(),
    },
  },
};

export const NoBattles: Story = {
  args: {
    illustration: "⚔️",
    title: "Журнал боїв пустий",
    description:
      "Зіграй кілька матчів — Brawl Stars API віддає до 25 останніх боїв.",
  },
};

export const SearchMiss: Story = {
  args: {
    illustration: <Search className="h-16 w-16 text-violet-300" />,
    title: "Нічого не знайдено",
    description:
      "Перевір тег — він має починатися з #, без пробілів.",
    secondaryAction: {
      label: "Спробувати ще раз",
      onClick: fn(),
    },
  },
};

export const Compact: Story = {
  args: {
    illustration: "🤖",
    title: "AI Coach ще не давав порад",
    description: "Відкрий профіль гравця і натисни «Запитати тренера».",
    compact: true,
  },
  parameters: { layout: "centered" },
};

export const WithBothActions: Story = {
  args: {
    illustration: "📊",
    title: "Графік прогресу порожній",
    description:
      "Як тільки трофеї змінюються, ми будуємо лінію. Спершу синхронізуй профіль.",
    action: { label: "Синхронізувати", onClick: fn() },
    secondaryAction: { label: "Дізнатися більше", onClick: fn() },
  },
};

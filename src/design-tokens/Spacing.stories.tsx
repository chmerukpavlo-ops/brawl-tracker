import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  title: "Design Tokens/Spacing",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};

export default meta;

const SPACING_SCALE = [
  { name: "0.5", token: "p-0.5", px: 2 },
  { name: "1", token: "p-1", px: 4 },
  { name: "2", token: "p-2", px: 8 },
  { name: "3", token: "p-3", px: 12 },
  { name: "4", token: "p-4", px: 16 },
  { name: "5", token: "p-5", px: 20 },
  { name: "6", token: "p-6", px: 24 },
  { name: "8", token: "p-8", px: 32 },
  { name: "12", token: "p-12", px: 48 },
];

const RADIUS_SCALE = [
  { name: "sm", token: "rounded-sm", px: 2 },
  { name: "md", token: "rounded-md", px: 6 },
  { name: "lg", token: "rounded-lg", px: 8 },
  { name: "xl", token: "rounded-xl", px: 12 },
  { name: "2xl", token: "rounded-2xl", px: 16 },
  { name: "3xl", token: "rounded-3xl", px: 24 },
  { name: "full", token: "rounded-full", px: 9999 },
];

/**
 * Tailwind 4's default spacing scale, with a visual ruler so designers
 * can eyeball the rhythm. The app sticks to the "even" steps
 * (2 / 4 / 8 / 12 / 16 / 24) for almost everything; odd values like
 * `p-5` show up in dense card headers where 4 → 6 jumps too much.
 *
 * Touch targets (`min-h-[44px]`) and bottom-tab heights (`h-14`) are
 * documented in the Accessibility story.
 */
export const Scale: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-[#1a0a2e] p-6">
      <h1 className="mb-2 text-2xl font-black uppercase tracking-wider text-white">
        Spacing & radius
      </h1>
      <p className="mb-8 text-sm text-slate-400">
        Базується на Tailwind 4 4-пиксельному кроку. Активно
        використовуємо парні значення.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white">
          Padding / margin
        </h2>
        <div className="space-y-3">
          {SPACING_SCALE.map((step) => (
            <div
              key={step.name}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#2a1a4a] p-4"
            >
              <span className="w-12 font-mono text-xs font-bold text-slate-400">
                {step.name}
              </span>
              <span className="w-20 font-mono text-[10px] text-slate-500">
                {step.token}
              </span>
              <span className="w-12 font-mono text-[10px] text-slate-500">
                {step.px}px
              </span>
              <div
                className="h-3 rounded-full bg-yellow-400/80"
                style={{ width: step.px }}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white">
          Radius
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADIUS_SCALE.map((step) => (
            <div
              key={step.name}
              className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4 text-center"
            >
              <div
                className={`mx-auto mb-3 h-16 w-16 bg-violet-500/40 ${step.token}`}
              />
              <p className="text-[11px] font-bold uppercase tracking-widest text-white">
                {step.name}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {step.token}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};

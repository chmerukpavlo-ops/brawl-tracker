import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  title: "Design Tokens/Colors",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    a11y: {
      // Token swatches don't need `<button>` semantics — disable
      // the rule that complains about decorative elements.
      config: { rules: [{ id: "color-contrast", enabled: true }] },
    },
  },
};

export default meta;

interface Swatch {
  name: string;
  value: string;
  /** Token reference (Tailwind class or CSS var) for documentation. */
  token: string;
  /** Optional foreground colour for legible swatch labels. */
  fg?: string;
}

interface SwatchGroupProps {
  title: string;
  description?: string;
  swatches: Swatch[];
}

function SwatchGroup({ title, description, swatches }: SwatchGroupProps) {
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-white">
        {title}
      </h2>
      {description && (
        <p className="mb-4 text-xs text-slate-400">{description}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {swatches.map((s) => (
          <div
            key={s.name}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#2a1a4a]"
          >
            <div
              className="flex h-24 items-end p-3"
              style={{ background: s.value, color: s.fg ?? "#fff" }}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider drop-shadow">
                {s.value}
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white">
                {s.name}
              </p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                {s.token}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The full app palette, organised by intent. Swatch values are the
 * raw hex / rgb that the production code uses today (Tailwind 4
 * inlines arbitrary `bg-[#...]` calls instead of routing through
 * `@theme` tokens, so we read the values straight from the source).
 *
 * When we eventually consolidate into a token system (see
 * `STORYBOOK.md` roadmap), this story stays the same — only the
 * `token` column updates.
 */
export const Palette: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-[#1a0a2e] p-6">
      <h1 className="mb-2 text-2xl font-black uppercase tracking-wider text-white">
        Palette
      </h1>
      <p className="mb-8 text-sm text-slate-400">
        Кольорова система застосунку. Контраст основних поєднань — на
        вкладці <em>Accessibility</em>.
      </p>

      <SwatchGroup
        title="Surfaces"
        description="Базовий gradient + контейнери. Темний фіолет — фірмовий gaming-настрій."
        swatches={[
          { name: "BG primary", value: "#1a0a2e", token: "bg-[#1a0a2e]" },
          { name: "BG midnight", value: "#0a0510", token: "bg-[#0a0510]" },
          { name: "Card", value: "#2a1a4a", token: "bg-[#2a1a4a]" },
          { name: "Card alt", value: "#2d1b4e", token: "bg-[#2d1b4e]" },
        ]}
      />

      <SwatchGroup
        title="Brand"
        description="CTA жовтий — основний accent. Фіолет — second-tier highlight."
        swatches={[
          { name: "Primary CTA", value: "#facc15", token: "bg-yellow-400", fg: "#1a0a2e" },
          { name: "Primary deep", value: "#eab308", token: "bg-yellow-500", fg: "#1a0a2e" },
          { name: "Accent", value: "#a78bfa", token: "bg-violet-400", fg: "#1a0a2e" },
          { name: "Accent deep", value: "#7c3aed", token: "bg-violet-600" },
        ]}
      />

      <SwatchGroup
        title="Status"
        description="Емоційні сигнали. Завжди парується з іконкою — колір не єдиний носій сенсу (WCAG 1.4.1)."
        swatches={[
          { name: "Success", value: "#34d399", token: "text-emerald-400", fg: "#0a0510" },
          { name: "Warning", value: "#fbbf24", token: "text-amber-400", fg: "#0a0510" },
          { name: "Error", value: "#f87171", token: "text-rose-400", fg: "#0a0510" },
          { name: "Info", value: "#60a5fa", token: "text-blue-400", fg: "#0a0510" },
        ]}
      />

      <SwatchGroup
        title="Text"
        description="Кожен tier — мінімум 4.5:1 на основному фоні."
        swatches={[
          { name: "Foreground", value: "#ffffff", token: "text-white", fg: "#1a0a2e" },
          { name: "Body", value: "#e2e8f0", token: "text-slate-200", fg: "#1a0a2e" },
          { name: "Muted", value: "#94a3b8", token: "text-slate-400", fg: "#1a0a2e" },
          { name: "Subtle", value: "#64748b", token: "text-slate-500", fg: "#1a0a2e" },
        ]}
      />

      <SwatchGroup
        title="Brawl rarities"
        description="Brawlify повертає `rarity.color` — палітра відповідає grayscale → mythic crescendo з гри."
        swatches={[
          { name: "Common", value: "#94a3b8", token: "rarity.common" },
          { name: "Rare", value: "#22c55e", token: "rarity.rare" },
          { name: "Super Rare", value: "#3b82f6", token: "rarity.superRare" },
          { name: "Epic", value: "#a855f7", token: "rarity.epic" },
          { name: "Mythic", value: "#ef4444", token: "rarity.mythic" },
          { name: "Legendary", value: "#facc15", token: "rarity.legendary", fg: "#1a0a2e" },
        ]}
      />
    </div>
  ),
};

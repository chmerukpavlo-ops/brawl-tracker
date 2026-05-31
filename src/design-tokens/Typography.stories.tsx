import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  title: "Design Tokens/Typography",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};

export default meta;

interface TypeRow {
  name: string;
  className: string;
  sample?: string;
  spec: string;
}

const HEADINGS: TypeRow[] = [
  { name: "Display", className: "text-4xl font-black uppercase tracking-tight text-white", spec: "36px / 800 / -0.025em" },
  { name: "H1", className: "text-2xl font-black uppercase tracking-wider text-white", spec: "24px / 800 / 0.05em" },
  { name: "H2", className: "text-xl font-black uppercase tracking-wide text-white", spec: "20px / 800 / 0.025em" },
  { name: "H3", className: "text-lg font-black uppercase tracking-wide text-white", spec: "18px / 800 / 0.025em" },
  { name: "Section", className: "text-sm font-black uppercase tracking-widest text-white", spec: "14px / 800 / 0.1em" },
];

const BODY: TypeRow[] = [
  { name: "Body large", className: "text-base text-slate-200", spec: "16px / 400" },
  { name: "Body", className: "text-sm text-slate-200", spec: "14px / 400" },
  { name: "Body small", className: "text-xs text-slate-400", spec: "12px / 400" },
  { name: "Caption", className: "text-[11px] uppercase tracking-widest text-slate-500", spec: "11px / 400 / 0.1em" },
];

const NUMERIC: TypeRow[] = [
  { name: "Stat huge", className: "font-mono text-4xl font-black tabular-nums text-white", sample: "65000", spec: "JetBrains Mono / 36px / 800" },
  { name: "Stat large", className: "font-mono text-2xl font-bold tabular-nums text-white", sample: "12,345", spec: "JetBrains Mono / 24px / 700" },
  { name: "Stat", className: "font-mono text-base font-bold tabular-nums text-white", sample: "+5", spec: "JetBrains Mono / 16px / 700" },
  { name: "Tag", className: "font-mono text-xs font-bold tabular-nums text-slate-400", sample: "#PYLQ20", spec: "JetBrains Mono / 12px / 700" },
];

function TypeTable({ title, rows }: { title: string; rows: TypeRow[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white">
        {title}
      </h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.name}
            className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {row.name}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {row.spec}
              </span>
            </div>
            <p className={row.className}>
              {row.sample ?? "Brawl Stars Tracker — швидкий пошук гравця"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Two type families:
 *   - **Space Grotesk** — UI text, headings. Geometric, friendly,
 *     reads small. Loaded from Google Fonts in `index.css`.
 *   - **JetBrains Mono** — numerics, tags, code. Tabular figures
 *     keep stats from jittering during animated counters.
 *
 * The line-height + letter-spacing values come from a few rounds of
 * tuning against the BrawlerCard / ProfileCard density target. Every
 * heading uses `uppercase` + `tracking-*` to hit the BrawlStars
 * "esports HUD" feel without leaning on a custom display face.
 */
export const Catalogue: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-[#1a0a2e] p-6">
      <h1 className="mb-2 text-2xl font-black uppercase tracking-wider text-white">
        Typography
      </h1>
      <p className="mb-8 text-sm text-slate-400">
        Space Grotesk (sans) + JetBrains Mono (numerics). Усі розміри в rem
        — масштабуються з системних налаштувань (WCAG 1.4.4).
      </p>

      <TypeTable title="Headings" rows={HEADINGS} />
      <TypeTable title="Body" rows={BODY} />
      <TypeTable title="Numerics & tags" rows={NUMERIC} />
    </div>
  ),
};

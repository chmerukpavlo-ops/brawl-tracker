import { useTranslation } from "../../hooks/useTranslation";

/**
 * "Skip to main content" link — the first focusable element in the
 * tab order. Visually hidden by default; pops into view when focused
 * via keyboard, so sighted keyboard users can bypass the BottomTabBar
 * + global controls and jump straight into the screen content.
 *
 * Required by WCAG 2.4.1 for any page where the same chrome appears
 * before the main content. Costs us one DOM node and zero pixels —
 * pure win.
 *
 * The target ID (`main-content`) must match the `id` on the `<main>`
 * element in `App.tsx`.
 */
export default function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      // The link uses a "show on focus" pattern: it's pulled out of
      // the viewport (via `-translate-y-full`) until it receives
      // keyboard focus, at which point it slides into view at the
      // top-left corner.
      className="sr-only fixed left-3 top-3 z-[100] inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-[#1a0a2e] shadow-2xl outline-none ring-2 ring-yellow-300 ring-offset-2 ring-offset-[#1a0a2e] focus:not-sr-only focus-visible:not-sr-only"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}

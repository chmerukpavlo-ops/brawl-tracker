import { useRef } from "react";
import { Home, BarChart3, Trophy, BookOpen, Settings } from "lucide-react";
import { TabId, TABS_ORDER } from "./types";
import { haptic } from "../hooks/useHaptic";
import { useTranslation } from "../hooks/useTranslation";
import { useArrowNavigation } from "../hooks/useArrowNavigation";

const TAB_ICONS: Record<TabId, typeof Home> = {
  home: Home,
  stats: BarChart3,
  leaders: Trophy,
  library: BookOpen,
  settings: Settings,
};

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/**
 * The five-tab bottom navigation. Implements the WAI-ARIA "Tabs"
 * pattern with manual activation:
 *
 *   - The container has `role="tablist"`.
 *   - Each button has `role="tab"`, `aria-selected`, `tabindex`
 *     either 0 (selected) or -1 (unselected — roving tabindex).
 *   - Arrow keys move focus *and* activate the tab. Home / End jump
 *     to the first / last tab respectively.
 *
 * Touch targets are ≥ 56×64px, comfortably above the 44px AAA floor
 * (and matches Material's bottom-nav guideline).
 */
export default function BottomTabBar({
  activeTab,
  onTabChange,
}: BottomTabBarProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = TABS_ORDER.indexOf(activeTab);

  const { onKeyDown } = useArrowNavigation({
    orientation: "horizontal",
    loop: true,
    homeEnd: true,
    count: TABS_ORDER.length,
    index: activeIndex,
    onIndexChange: (next) => {
      const id = TABS_ORDER[next];
      if (!id || id === activeTab) return;
      haptic.selection();
      onTabChange(id);
      // Move keyboard focus to the newly-activated tab — the WAI-ARIA
      // pattern calls this "Tabs with Automatic Activation".
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)
          ?.focus();
      });
    },
  });

  return (
    <nav
      aria-label={t("a11y.primaryNavigation")}
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-white/10 bg-[#1a0a2e]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex items-stretch justify-around px-2 pt-1"
      >
        {TABS_ORDER.map((id) => {
          const Icon = TAB_ICONS[id];
          const active = activeTab === id;
          const label = t(`tabs.${id}` as const);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              data-tab-id={id}
              aria-selected={active}
              aria-controls={`tab-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                if (id !== activeTab) haptic.light();
                onTabChange(id);
              }}
              className="flex min-h-[56px] min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              aria-label={label}
            >
              <Icon
                aria-hidden="true"
                className={`h-5 w-5 ${active ? "text-[#facc15]" : "text-slate-400"}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  active ? "text-[#facc15]" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

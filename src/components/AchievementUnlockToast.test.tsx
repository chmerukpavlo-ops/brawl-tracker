import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import AchievementUnlockToast from "./AchievementUnlockToast";
import type { AchievementDef } from "../data/achievements";

const ACHIEVEMENT: AchievementDef = {
  id: "first_search",
  category: "exploration",
  tier: "bronze",
  title: "Перший пошук",
  description: "Знайди свого першого гравця",
  icon: "🔍",
  target: 1,
  xpReward: 10,
};

describe("AchievementUnlockToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onDismiss once after the default 5 s timeout", () => {
    const onDismiss = vi.fn();
    render(
      <AchievementUnlockToast achievement={ACHIEVEMENT} onDismiss={onDismiss} />
    );

    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does NOT reset the timer when the parent re-renders with a new onDismiss reference", () => {
    // This is the core regression. Before the ref-based fix, every
    // parent render produced a fresh arrow function, the effect
    // re-ran with the new dep, the previous setTimeout was cleared
    // and rescheduled → the toast effectively never auto-dismissed.
    const finalDismiss = vi.fn();

    const { rerender } = render(
      <AchievementUnlockToast
        achievement={ACHIEVEMENT}
        onDismiss={() => {
          /* initial — should never fire because parent will swap it */
        }}
      />
    );

    // 4 s in: parent passes a brand-new onDismiss reference (the
    // exact pattern that broke the timer pre-fix).
    vi.advanceTimersByTime(4000);
    rerender(
      <AchievementUnlockToast
        achievement={ACHIEVEMENT}
        onDismiss={finalDismiss}
      />
    );

    // The remaining 1 s of the ORIGINAL timer should be enough.
    vi.advanceTimersByTime(1000);
    expect(finalDismiss).toHaveBeenCalledTimes(1);
  });

  it("respects a custom durationMs", () => {
    const onDismiss = vi.fn();
    render(
      <AchievementUnlockToast
        achievement={ACHIEVEMENT}
        onDismiss={onDismiss}
        durationMs={1000}
      />
    );

    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clears the timer on unmount (no late dismiss)", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <AchievementUnlockToast achievement={ACHIEVEMENT} onDismiss={onDismiss} />
    );

    unmount();
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("re-arms the timer when the achievement id changes", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <AchievementUnlockToast achievement={ACHIEVEMENT} onDismiss={onDismiss} />
    );

    vi.advanceTimersByTime(4000);
    rerender(
      <AchievementUnlockToast
        achievement={{ ...ACHIEVEMENT, id: "next_one" }}
        onDismiss={onDismiss}
      />
    );

    // Old timer should be cleared by the id change → 1 s shouldn't
    // fire anything yet (we're only 1 s into the new toast).
    vi.advanceTimersByTime(1000);
    expect(onDismiss).not.toHaveBeenCalled();

    // 5 s after the id swap.
    vi.advanceTimersByTime(4000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

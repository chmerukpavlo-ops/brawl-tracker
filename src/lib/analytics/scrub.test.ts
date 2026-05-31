import { describe, expect, it } from "vitest";
import { scrubAnalyticsProps } from "./scrub";

describe("scrubAnalyticsProps", () => {
  it("returns an empty object for undefined input", () => {
    expect(scrubAnalyticsProps(undefined)).toEqual({});
  });

  it("strips Brawl Stars hash tags from string values", () => {
    // Brawl Stars tags use the restricted alphabet [0289PYLQGRJCUVO]
    // — only those characters are valid input for the scrubber.
    const out = scrubAnalyticsProps({
      tag: "#2PP0LJL8",
      label: "Look at #2PP0LJL8 trophies",
      count: 42,
    });
    // The exact replacement token comes from `scrubText` in
    // src/lib/telemetry.ts — we just assert the digits are gone.
    expect(out.tag).not.toContain("2PP0LJL8");
    expect(String(out.tag)).toContain("PLAYER_TAG");
    expect(out.label).not.toContain("2PP0LJL8");
    expect(out.count).toBe(42);
  });

  it("walks nested objects", () => {
    const out = scrubAnalyticsProps({
      meta: {
        primary: "#PYLQ20",
        nested: { tag: "#GRJCUV" },
      },
    });
    const meta = out.meta as Record<string, unknown>;
    expect(meta.primary).not.toContain("PYLQ20");
    const nested = meta.nested as Record<string, unknown>;
    expect(nested.tag).not.toContain("GRJCUV");
  });

  it("walks arrays", () => {
    const out = scrubAnalyticsProps({ list: ["#22YYPP", "safe"] });
    expect(Array.isArray(out.list)).toBe(true);
    const list = out.list as unknown[];
    expect(list[0]).not.toContain("22YYPP");
    expect(list[1]).toBe("safe");
  });

  it("does not mutate the input object", () => {
    const input = { tag: "#0289PY", count: 1 };
    const snapshot = { ...input };
    scrubAnalyticsProps(input);
    expect(input).toEqual(snapshot);
  });

  it("preserves non-string primitives untouched", () => {
    const out = scrubAnalyticsProps({
      bool: true,
      num: 0,
      neg: -1,
      nullable: null,
    });
    expect(out).toEqual({ bool: true, num: 0, neg: -1, nullable: null });
  });
});

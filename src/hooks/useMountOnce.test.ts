import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { renderHook } from "../test/utils/renderHook";
import { useMountOnce } from "./useMountOnce";

describe("useMountOnce", () => {
  it("returns false until `active` becomes true", () => {
    const { result } = renderHook(({ active }: { active: boolean }) => useMountOnce(active), {
      bare: true,
      initialProps: { active: false },
    });
    expect(result.current).toBe(false);
  });

  it("flips to true on the first truthy `active` and stays true", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useMountOnce(active),
      { bare: true, initialProps: { active: false } }
    );
    expect(result.current).toBe(false);

    act(() => rerender({ active: true }));
    expect(result.current).toBe(true);

    // Flipping back to false MUST NOT unmount — exit animations
    // depend on the component staying alive.
    act(() => rerender({ active: false }));
    expect(result.current).toBe(true);
  });

  it("starts as true if `active` is initially true", () => {
    const { result } = renderHook(({ active }: { active: boolean }) => useMountOnce(active), {
      bare: true,
      initialProps: { active: true },
    });
    expect(result.current).toBe(true);
  });
});

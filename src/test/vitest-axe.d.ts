/**
 * Type-only augmentation that wires `vitest-axe`'s custom matchers
 * into vitest 4's expect interface.
 *
 * `vitest-axe@1.x` ships an `extend-expect.d.ts` that augments the
 * pre-v2 `Vi.Assertion` namespace, but that namespace was removed in
 * vitest@2. Until upstream catches up we redeclare the matchers
 * against the current `@vitest/expect` `Matchers` interface so
 * `expect(node).toHaveNoViolations()` type-checks under tsc.
 *
 * The implementation still comes from `vitest-axe/matchers` (wired
 * via `expect.extend(...)` in `src/test/setup.ts`); this file only
 * teaches the compiler about the new method names.
 */
import "vitest";
import type { AxeResults } from "axe-core";

declare module "@vitest/expect" {
  interface Matchers<T = unknown> {
    toHaveNoViolations: T extends AxeResults ? () => void : never;
  }
}

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations: T extends AxeResults ? () => void : never;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations: () => void;
  }
}

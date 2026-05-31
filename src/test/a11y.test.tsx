import { describe, it, expect } from "vitest";
import "./vitest-axe.d";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import LiveRegions from "../components/a11y/LiveRegions";
import SkipLink from "../components/a11y/SkipLink";
import { I18nProvider } from "../context/I18nContext";

/**
 * Smoke a11y suite. Each component (or composition) is rendered into
 * an isolated DOM and audited by axe-core via `vitest-axe`. We
 * deliberately keep this file *fast* — a couple of milliseconds per
 * test — so it can stay green on every commit. Heavier full-screen
 * audits live in the Playwright E2E suite (`e2e/a11y.spec.ts`).
 *
 * Failure here means a regression in our shared a11y primitives. If
 * the violation is in a feature component, prefer adding a focused
 * test next to that component.
 */
describe("a11y primitives", () => {
  it("LiveRegions has no axe violations", async () => {
    const { container } = render(<LiveRegions />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SkipLink has no axe violations", async () => {
    const { container } = render(
      <I18nProvider>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          <h1>Main content</h1>
        </main>
      </I18nProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

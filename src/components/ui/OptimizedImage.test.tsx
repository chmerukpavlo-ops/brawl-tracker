import { describe, it, expect } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders, screen } from "../../test/utils/renderWithProviders";
import OptimizedImage from "./OptimizedImage";

describe("<OptimizedImage />", () => {
  it("renders with lazy loading + async decoding by default", () => {
    renderWithProviders(
      <OptimizedImage src="https://cdn.brawlify.com/x.png" alt="X" width={48} height={48} />
    );
    const img = screen.getByRole("img", { name: "X" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("width", "48");
    expect(img).toHaveAttribute("height", "48");
  });

  it("renders eager + fetchPriority=high when `eager` is set", () => {
    renderWithProviders(
      <OptimizedImage src="https://cdn.brawlify.com/hero.png" alt="hero" width={300} height={120} eager />
    );
    const img = screen.getByRole("img", { name: "hero" });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("builds a `srcSet` from `responsiveWidths`", () => {
    renderWithProviders(
      <OptimizedImage
        src="https://cdn.brawlify.com/a.png"
        alt="a"
        width={100}
        height={100}
        responsiveWidths={[80, 160, 320]}
        sizes="(max-width: 600px) 80px, 160px"
      />
    );
    const img = screen.getByRole("img", { name: "a" });
    const srcSet = img.getAttribute("srcset") ?? "";
    expect(srcSet).toContain("?w=80 80w");
    expect(srcSet).toContain("?w=160 160w");
    expect(srcSet).toContain("?w=320 320w");
  });

  it("renders the fallback when the image errors", () => {
    renderWithProviders(
      <OptimizedImage
        src="https://cdn.brawlify.com/missing.png"
        alt="missing"
        width={48}
        height={48}
        fallback={<span data-testid="fallback">⭐</span>}
      />
    );
    const img = screen.getByRole("img", { name: "missing" });
    fireEvent.error(img);
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import {
  scrubText,
  scrubEvent,
  scrubBreadcrumb,
  isInitialized,
  captureException,
  addBreadcrumb,
  startSpan,
} from "./telemetry";

describe("scrubText", () => {
  it("redacts emails", () => {
    expect(scrubText("Contact me at user@example.com please")).toBe(
      "Contact me at [email] please"
    );
  });

  it("redacts hash-prefixed player tags", () => {
    expect(scrubText("Loaded player #2PP0LJL8")).toBe("Loaded player #PLAYER_TAG");
  });

  it("redacts URL-encoded tags", () => {
    expect(scrubText("/api/v1/player/%232PP0LJL8")).toBe(
      "/api/v1/player/%23PLAYER_TAG"
    );
  });

  it("redacts tags in query strings", () => {
    expect(scrubText("?tag=2PP0LJL8&fresh=true")).toBe(
      "?tag=PLAYER_TAG&fresh=true"
    );
  });

  it("leaves non-tag strings alone", () => {
    expect(scrubText("Hello world, here is some plain text.")).toBe(
      "Hello world, here is some plain text."
    );
  });

  it("does not match common English words that share BS-tag letters", () => {
    // 'POPULAR' contains "P", "O", "P", "U" — all BS-tag chars — but
    // there's no `#` or `tag=` anchor, so we must NOT redact.
    expect(scrubText("This is POPULAR among players")).toBe(
      "This is POPULAR among players"
    );
  });

  it("redacts multiple occurrences in one pass", () => {
    expect(scrubText("Compare #2PP0LJL8 with #YQ0VOOR")).toBe(
      "Compare #PLAYER_TAG with #PLAYER_TAG"
    );
  });
});

describe("scrubEvent", () => {
  it("scrubs request.url", () => {
    const event = { request: { url: "/api/v1/player/%232PP0LJL8" } };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request.url).toBe("/api/v1/player/%23PLAYER_TAG");
  });

  it("removes request headers + cookies entirely", () => {
    const event = {
      request: {
        url: "/api/health",
        headers: { authorization: "Bearer secret-token" },
        cookies: { session: "abc" },
      },
    };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request.headers).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
  });

  it("scrubs exception messages", () => {
    const event = {
      exception: {
        values: [
          { type: "ApiError", value: "Failed to load player #2PP0LJL8" },
          { type: "Error", value: "user@example.com is invalid" },
        ],
      },
    };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.exception.values[0].value).toBe(
      "Failed to load player #PLAYER_TAG"
    );
    expect(scrubbed.exception.values[1].value).toBe("[email] is invalid");
  });

  it("recursively scrubs breadcrumbs", () => {
    const event = {
      breadcrumbs: [
        { category: "fetch", data: { url: "/api/v1/player/%232PP0LJL8" } },
        { category: "ui", message: "Pinned #YQ0VOOR" },
      ],
    };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.breadcrumbs[0].data.url).toBe("/api/v1/player/%23PLAYER_TAG");
    expect(scrubbed.breadcrumbs[1].message).toBe("Pinned #PLAYER_TAG");
  });

  it("returns non-object inputs unchanged", () => {
    expect(scrubEvent(null)).toBeNull();
    expect(scrubEvent("string")).toBe("string");
  });
});

describe("scrubBreadcrumb", () => {
  it("scrubs fetch crumb urls", () => {
    const crumb = { category: "fetch", data: { url: "/api/player/#2PP0LJL8" } };
    const out = scrubBreadcrumb(crumb);
    expect(out.data.url).toBe("/api/player/#PLAYER_TAG");
  });

  it("scrubs navigation `to` urls", () => {
    const crumb = {
      category: "navigation",
      data: { to: "/profile?tag=2PP0LJL8" },
    };
    const out = scrubBreadcrumb(crumb);
    expect(out.data.to).toBe("/profile?tag=PLAYER_TAG");
  });

  it("returns the crumb when no scrubbable fields", () => {
    const crumb = { category: "ui", message: "click button" };
    expect(scrubBreadcrumb(crumb)).toEqual(crumb);
  });
});

describe("uninitialized telemetry is a strict no-op", () => {
  // Critical invariant — the rest of the app calls these freely on
  // every render. None of them must throw or send anything to the
  // network when Sentry hasn't been booted.
  it("isInitialized returns false", () => {
    expect(isInitialized()).toBe(false);
  });

  it("captureException is silent", () => {
    expect(() => captureException(new Error("boom"))).not.toThrow();
  });

  it("addBreadcrumb is silent", () => {
    expect(() =>
      addBreadcrumb({ category: "test", message: "x" })
    ).not.toThrow();
  });

  it("startSpan passes through to fn()", async () => {
    const result = await startSpan({ name: "x", op: "test" }, async () => 42);
    expect(result).toBe(42);
  });

  it("startSpan re-throws errors from fn()", async () => {
    await expect(
      startSpan({ name: "x", op: "test" }, async () => {
        throw new Error("nope");
      })
    ).rejects.toThrow("nope");
  });
});

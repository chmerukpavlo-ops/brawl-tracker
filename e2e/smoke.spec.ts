import { test, expect } from "@playwright/test";

/**
 * Smoke checks: app boots, PWA manifest is valid, basic accessibility
 * tree is present. If these fail, every other e2e is going to fail
 * for the same reason — keep this fast (< 5 s) so CI surfaces the
 * regression first.
 */

test.beforeEach(async ({ context }) => {
  // Start every test from a clean storage state.
  await context.clearCookies();
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* private mode */
    }
  });
});

test("renders the app shell without errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  // The root div is always present; we wait on a stable selector
  // rather than a screen-specific text (onboarding may or may not
  // be visible depending on flow).
  await expect(page.locator("#root")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("PWA manifest is reachable and well-formed", async ({ page, request }) => {
  await page.goto("/");
  const manifestHref = await page.getAttribute('link[rel="manifest"]', "href");
  expect(manifestHref, "manifest <link> should exist").toBeTruthy();

  const response = await request.get(manifestHref!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBeTruthy();
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);
  expect(manifest.start_url).toBeTruthy();
});

test("preconnects to Brawlify CDN", async ({ page }) => {
  await page.goto("/");
  const preconnect = await page.locator('link[rel="preconnect"][href*="brawlify"]').count();
  expect(preconnect).toBeGreaterThan(0);
});

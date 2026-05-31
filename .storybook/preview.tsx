import type { Preview, Decorator } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { I18nProvider, useI18n } from "../src/context/I18nContext";
import { ToastProvider } from "../src/context/ToastContext";
import "../src/index.css";
import "./storybook.css";

// Storybook stories should never share React Query cache between
// renders — flipping a control would otherwise re-use stale data
// from the previous knob value. `gcTime: 0` purges immediately and
// `retry: false` keeps failures snappy.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0, staleTime: 0 },
    mutations: { retry: false },
  },
});

/**
 * Bridges the Storybook toolbar's `locale` global into the app's
 * `I18nProvider`. The provider doesn't accept an `initialLocale`
 * prop (it reads from URL / localStorage / navigator) so we seed
 * localStorage before render, then call `setLocale` for live
 * toolbar changes inside the tree.
 */
function LocaleSync({ locale }: { locale: string }) {
  const { setLocale } = useI18n();
  useEffect(() => {
    if (locale === "en" || locale === "uk") {
      setLocale(locale);
    }
  }, [locale, setLocale]);
  return null;
}

const withProviders: Decorator = (Story, context) => {
  const locale = (context.globals.locale as string) ?? "uk";
  // Seed localStorage so the very first render of `I18nProvider`
  // already picks the toolbar locale (avoids a one-frame flash).
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("brawl_locale", locale);
    } catch {
      /* ignore */
    }
  }
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <LocaleSync locale={locale} />
        <ToastProvider>
          <div className="font-sans antialiased text-slate-200">
            <Story />
          </div>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const preview: Preview = {
  parameters: {
    // The action / control conveniences below match what the legacy
    // `addon-essentials` set up automatically. With v10's split
    // model we re-declare them here (cheap, explicit).
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // The app's true canvas is a near-black violet — anything else
    // and the gradient backgrounds in the stories look broken.
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "#1a0a2e" },
        { name: "midnight", value: "#0a0510" },
        { name: "white", value: "#ffffff" },
      ],
    },

    // Mobile-first: default to a generic phone viewport. Larger
    // sizes are available for testing pinned-grid layouts.
    viewport: {
      viewports: {
        iphoneSE: { name: "iPhone SE", styles: { width: "375px", height: "667px" }, type: "mobile" },
        iphone13: { name: "iPhone 13", styles: { width: "390px", height: "844px" }, type: "mobile" },
        pixel5: { name: "Pixel 5", styles: { width: "393px", height: "851px" }, type: "mobile" },
        ipadMini: { name: "iPad mini", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" }, type: "desktop" },
      },
      defaultViewport: "iphone13",
    },

    a11y: {
      // `manual: false` runs axe automatically every time the story
      // re-renders — failures show up in the "Accessibility" panel.
      // `element: "#storybook-root"` keeps the audit scoped so the
      // Storybook chrome itself isn't blamed for our violations.
      element: "#storybook-root",
      manual: false,
    },

    layout: "centered",
  },

  globalTypes: {
    locale: {
      description: "Locale",
      defaultValue: "uk",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "uk", title: "Українська" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    // The theme decorator flips `<html data-contrast>` between
    // values, mirroring the production `useHighContrast` hook so the
    // user can preview every story in either palette.
    withThemeByDataAttribute({
      themes: {
        default: "default",
        "high-contrast": "more",
      },
      defaultTheme: "default",
      attributeName: "data-contrast",
      parentSelector: "html",
    }),
    withProviders,
  ],
};

export default preview;

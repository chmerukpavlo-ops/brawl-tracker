import { addons } from "storybook/manager-api";
import { create, themes } from "storybook/theming";

/**
 * Brand the Storybook UI itself (sidebar, toolbar, header). The
 * preview iframe is themed separately by `addon-themes`.
 */
addons.setConfig({
  theme: create({
    ...themes.dark,
    base: "dark",
    brandTitle: "Brawl Stars Tracker — UI Kit",
    brandUrl: "https://github.com/brawl-stars-tracker",
    appBg: "#1a0a2e",
    appContentBg: "#1a0a2e",
    appBorderColor: "rgba(255,255,255,0.08)",
    barBg: "#2a1a4a",
    colorPrimary: "#facc15",
    colorSecondary: "#a78bfa",
  }),
});

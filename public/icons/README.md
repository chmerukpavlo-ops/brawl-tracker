# PWA icons — placeholders

The PNG files referenced in `vite.config.ts` (`icon-192.png`, `icon-512.png`,
`icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`) are
**not committed** because they have to be produced from the brand asset.

The SVG `public/favicon.svg` (and `public/icon.svg`) is shipped as a vector
source and is enough for modern browsers; iOS/Android install flows still
need real PNGs to render correctly on home screens.

## How to generate the PNG bundle

1. Open `public/favicon.svg` in any vector tool (Figma, Illustrator, Inkscape).
2. Export at the following sizes, **all PNG-24 with transparency**:

   | File                              | Size      | Notes                                    |
   | --------------------------------- | --------- | ---------------------------------------- |
   | `public/icons/icon-192.png`       | 192×192   | Standard launcher icon                   |
   | `public/icons/icon-512.png`       | 512×512   | Used for splash + adaptive icons         |
   | `public/icons/icon-maskable-192.png` | 192×192 | Add ≥10% safe-area padding all around    |
   | `public/icons/icon-maskable-512.png` | 512×512 | Same — content must fit inside circle    |
   | `public/icons/apple-touch-icon.png`  | 180×180 | iOS home-screen icon (no transparency)   |
   | `public/favicon.ico`              | 32×32     | Optional — covers ancient browsers       |

3. Run `npm run build`. The plugin auto-injects them into the manifest.

## Maskable safe area

For maskable icons, keep the meaningful content within the inner ~80% circle
(40% radius from center). Tools like
[maskable.app](https://maskable.app/editor) preview crops on Android.

## Splash screens (iOS, optional)

iOS needs per-device splash images for the most polished install experience.
Use [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator)
or similar. They are not required for Lighthouse PWA score 90+.

## CLI shortcut

If you have `pwa-asset-generator` installed globally, this one-liner produces
all sizes from the SVG:

```bash
npx pwa-asset-generator public/favicon.svg public/icons \
  --background "#1a0a2e" \
  --opaque false \
  --maskable true \
  --favicon false \
  --type png
```

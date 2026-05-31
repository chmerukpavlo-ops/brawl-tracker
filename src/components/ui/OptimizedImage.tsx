import { useState, type ImgHTMLAttributes, type ReactNode } from "react";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> {
  /** Source URL. Required (not optional like the raw img element). */
  src: string;
  /** Required for a11y; pass "" for decorative images. */
  alt: string;
  /** Width hint in px — sets the intrinsic width to avoid CLS. */
  width: number;
  /** Height hint in px — sets the intrinsic height to avoid CLS. */
  height: number;
  /** When given, rendered into srcSet as `${src}?w=N N${unit}`. */
  responsiveWidths?: readonly number[];
  /** Sizes attribute, paired with `responsiveWidths`. */
  sizes?: string;
  /** Fallback rendered when the image errors or fails to load. */
  fallback?: ReactNode;
  /** Disable native lazy loading (rare — only above-the-fold hero images). */
  eager?: boolean;
}

/**
 * Thin `<img>` wrapper that enforces the perf basics:
 *   - intrinsic `width` / `height` to reserve layout space → no CLS
 *   - native `loading="lazy"` (and `decoding="async"`)
 *   - optional responsive `srcSet` for CDNs that accept `?w=` resize
 *
 * For Brawlify CDN the resize is best-effort: their CDN ignores
 * unknown query params, so the fallback still resolves to the full
 * image. No measurable regression if the param is not honored.
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  responsiveWidths,
  sizes,
  fallback = null,
  eager = false,
  className,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored && fallback) return <>{fallback}</>;

  const srcSet =
    responsiveWidths && responsiveWidths.length > 0
      ? responsiveWidths
          .map((w) => `${appendWidth(src, w)} ${w}w`)
          .join(", ")
      : undefined;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      // `fetchpriority` is honored by Chrome/Edge; ignored elsewhere.
      // Hero/eager images get "high" so they aren't deprioritized.
      fetchPriority={eager ? "high" : "auto"}
      draggable={false}
      className={className}
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}

function appendWidth(url: string, w: number): string {
  // Don't mangle relative URLs or data: URIs.
  if (!/^https?:\/\//i.test(url)) return url;
  return url.includes("?") ? `${url}&w=${w}` : `${url}?w=${w}`;
}

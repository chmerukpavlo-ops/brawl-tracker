#!/usr/bin/env node
/**
 * Zero-dependency PWA icon generator.
 *
 * Emits solid placeholder PNGs (background `#1a0a2e` with a centered yellow
 * lightning glyph) at every size required by the manifest:
 *
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-192.png    (extra safe-area padding)
 *   public/icons/icon-maskable-512.png
 *   public/icons/apple-touch-icon.png     (180×180, no transparency)
 *
 * Files that already exist are left untouched — when the designer ships real
 * artwork, drop the PNGs into `public/icons/` and this script becomes a no-op.
 * The script runs automatically before `vite build` via the `prebuild` hook.
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BG = [0x1a, 0x0a, 0x2e]; // brand purple
const FG = [0xfa, 0xcc, 0x15]; // signature yellow
const STROKE = [0x06, 0x03, 0x10]; // near-black outline

/** Build an RGB(A) pixel buffer of `size×size` filled with the bg color. */
function makeCanvas(size, withAlpha) {
  const channels = withAlpha ? 4 : 3;
  const buf = Buffer.alloc(size * size * channels);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * channels;
      buf[i] = BG[0];
      buf[i + 1] = BG[1];
      buf[i + 2] = BG[2];
      if (withAlpha) buf[i + 3] = 0xff;
    }
  }
  return { buf, channels };
}

function setPixel(buf, channels, size, x, y, rgb) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * channels;
  buf[i] = rgb[0];
  buf[i + 1] = rgb[1];
  buf[i + 2] = rgb[2];
  if (channels === 4) buf[i + 3] = 0xff;
}

/**
 * Rasterize a polygon defined as a closed list of (x, y) vertices using a
 * simple even-odd scanline fill. Fast enough for our 512×512 max.
 */
function fillPolygon(buf, channels, size, points, rgb) {
  if (points.length < 3) return;
  const ymin = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))));
  const ymax = Math.min(size - 1, Math.ceil(Math.max(...points.map((p) => p[1]))));
  for (let y = ymin; y <= ymax; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if (y1 === y2) continue;
      if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
      const t = (y - y1) / (y2 - y1);
      xs.push(x1 + t * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length; k += 2) {
      const xStart = Math.ceil(xs[k]);
      const xEnd = Math.floor(xs[k + 1] ?? xs[k]);
      for (let x = xStart; x <= xEnd; x++) {
        setPixel(buf, channels, size, x, y, rgb);
      }
    }
  }
}

/** Stroke a polygon by stepping pixel-by-pixel along each edge (Bresenham-ish). */
function strokePolygon(buf, channels, size, points, rgb, thickness) {
  const half = Math.max(1, Math.floor(thickness / 2));
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.ceil(Math.hypot(dx, dy));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(x1 + dx * t);
      const y = Math.round(y1 + dy * t);
      for (let oy = -half; oy <= half; oy++) {
        for (let ox = -half; ox <= half; ox++) {
          setPixel(buf, channels, size, x + ox, y + oy, rgb);
        }
      }
    }
  }
}

/** Draw the yellow lightning bolt centered on `size×size`. */
function drawBolt(buf, channels, size, scale = 1) {
  const cx = size / 2;
  const cy = size / 2;
  const s = (size / 512) * scale;
  // Coordinates copied from the SVG glyph in public/favicon.svg.
  const pts = [
    [cx + -64 * s, cy + -110 * s],
    [cx + 24 * s, cy + -110 * s],
    [cx + -8 * s, cy + -16 * s],
    [cx + 56 * s, cy + -16 * s],
    [cx + -28 * s, cy + 110 * s],
    [cx + 0 * s, cy + 6 * s],
    [cx + -64 * s, cy + 6 * s],
  ];
  fillPolygon(buf, channels, size, pts, FG);
  strokePolygon(buf, channels, size, pts, STROKE, Math.max(2, Math.round(size / 64)));
}

// ── Tiny PNG encoder (8-bit, RGB or RGBA, no filtering) ───────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixelBuf, channels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = channels === 4 ? 6 : 2; // colour type (6=RGBA, 2=RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add filter byte (0 = None) at the start of every scanline.
  const stride = size * channels;
  const filtered = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    filtered[y * (stride + 1)] = 0;
    pixelBuf.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(filtered);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Targets ────────────────────────────────────────────────────────
const targets = [
  { name: "icon-192.png", size: 192, alpha: true, scale: 0.78 },
  { name: "icon-512.png", size: 512, alpha: true, scale: 0.78 },
  // Maskable variants need ~20% safe-area padding so the glyph survives the
  // Android adaptive-icon circle crop.
  { name: "icon-maskable-192.png", size: 192, alpha: true, scale: 0.58 },
  { name: "icon-maskable-512.png", size: 512, alpha: true, scale: 0.58 },
  // iOS requires opaque (no transparency).
  { name: "apple-touch-icon.png", size: 180, alpha: false, scale: 0.78 },
];

let generated = 0;
let skipped = 0;
for (const target of targets) {
  const dest = join(outDir, target.name);
  if (existsSync(dest)) {
    skipped++;
    continue;
  }
  const { buf, channels } = makeCanvas(target.size, target.alpha);
  drawBolt(buf, channels, target.size, target.scale);
  writeFileSync(dest, encodePng(target.size, buf, channels));
  generated++;
}

const msg = `[pwa-icons] generated ${generated} placeholder(s), skipped ${skipped} existing`;
console.log(msg);

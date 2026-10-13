// The three tray drawings, in two inks, generated rather than shipped as files.
//
// WHY GENERATED. macOS ships ONE 18x18 asset per drawing with template-rendering intent
// and the OS recolours it for light mode, dark mode and the highlighted menu. WINDOWS
// TRAY ICONS GET NO SUCH TREATMENT — the shell draws the bitmap exactly as given, so a
// dark-ink icon is invisible on a dark taskbar and a light-ink one is invisible on a
// light one. That is six PNGs, at four DPI sizes each, which as checked-in binaries are
// twenty-four files nobody can review in a diff and which will drift from each other.
//
// Drawn from a shared outline, they cannot drift: the ink is a parameter, the slash is
// the same slash, and a test can assert the light and dark variants differ in exactly
// the way they are supposed to.
//
// The glyph is Sezgir's sound wave — the same subject as the app icon (build/icon.ico).
//
// The three drawings keep their historical names (`nib`, `nib-filled`, `nib-slash`) because
// the tray state machine and its tests speak in them: `nib` is the wave alone (idle),
// `nib-filled` is a solid disc with the wave knocked out of it (recording or working), and
// `nib-slash` is the wave with a line ruled across it (something is blocking dictation).

import { deflateSync } from 'node:zlib';

import type { TrayImage, TrayTheme } from './tray-state.js';
import { trayInkFor } from './tray-state.js';

/** The sizes Windows asks a tray icon for across the DPI settings people actually use. */
export const TRAY_ICON_SIZES: readonly number[] = [16, 20, 24, 32];

/** Coverage samples per axis inside one pixel. 4 means 16 samples; the edges read clean. */
const SUPERSAMPLE = 4;

type Point = readonly [number, number];

/** The wave, in a unit square: each bar's centre x and its full height. Four bars stay legible at 16 px. */
const BARS: readonly (readonly [number, number])[] = [
  [0.23, 0.3],
  [0.41, 0.66],
  [0.59, 0.5],
  [0.77, 0.24],
];
const BAR_WIDTH = 0.12;

/** The disc behind the wave in the `nib-filled` drawing. */
const DISC_CENTRE: Point = [0.5, 0.5];
const DISC_RADIUS = 0.47;

const SLASH_FROM: Point = [0.14, 0.86];
const SLASH_TO: Point = [0.86, 0.14];
const SLASH_WIDTH = 0.1;
/** The gap knocked out around the slash so it reads as ON TOP of the wave, not through it. */
const SLASH_GAP = 0.2;

// ---------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------

function distanceToSegment(x: number, y: number, from: Point, to: Point): number {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(x - px, y - py);
}

/** Whether a unit-square point is on one of the wave's bars (rounded ends, like the app icon). */
function onWave(x: number, y: number): boolean {
  for (const [centre, height] of BARS) {
    const half = Math.max(0, height / 2 - BAR_WIDTH / 2);
    if (distanceToSegment(x, y, [centre, 0.5 - half], [centre, 0.5 + half]) <= BAR_WIDTH / 2) return true;
  }
  return false;
}

/** Whether a unit-square point is inked, for one drawing. */
function isInk(image: TrayImage, x: number, y: number): boolean {
  const nearSlash = distanceToSegment(x, y, SLASH_FROM, SLASH_TO);

  // The slash is drawn last and knocks a gap out of everything under it, so it stays
  // legible at 16 px where a slash drawn merely on top of a stroke turns into mud.
  if (image === 'nib-slash') {
    if (nearSlash <= SLASH_WIDTH / 2) return true;
    if (nearSlash <= SLASH_GAP / 2) return false;
  }

  if (image === 'nib-filled') {
    // A solid disc with the wave knocked out — at 16 px the recording state must read as a
    // different shape, not as the same wave drawn a little bolder.
    if (onWave(x, y)) return false;
    return Math.hypot(x - DISC_CENTRE[0], y - DISC_CENTRE[1]) <= DISC_RADIUS;
  }

  return onWave(x, y);
}

// ---------------------------------------------------------------------------------
// Rasterising
// ---------------------------------------------------------------------------------

function parseInk(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/** RGBA rows, straight (un-premultiplied) alpha, which is what PNG stores. */
export function rasteriseTrayIcon(image: TrayImage, theme: TrayTheme, size: number): Buffer {
  const [r, g, b] = parseInk(trayInkFor(theme));
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size;
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size;
          if (isInk(image, x, y)) hits += 1;
        }
      }
      const alpha = Math.round((hits / (SUPERSAMPLE * SUPERSAMPLE)) * 255);
      const at = (py * size + px) * 4;
      pixels[at] = r;
      pixels[at + 1] = g;
      pixels[at + 2] = b;
      pixels[at + 3] = alpha;
    }
  }

  return pixels;
}

// ---------------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

/** A minimal 8-bit RGBA PNG. Filter 0 on every row — these are tiny and incompressible-ish. */
export function encodePng(pixels: Buffer, size: number): Buffer {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** One drawing, one ink, one size, as PNG bytes. */
export function trayIconPng(image: TrayImage, theme: TrayTheme, size: number): Buffer {
  return encodePng(rasteriseTrayIcon(image, theme, size), size);
}

/** A `data:` URL, which is how `nativeImage.createFromDataURL` takes it. */
export function trayIconDataUrl(image: TrayImage, theme: TrayTheme, size: number): string {
  return `data:image/png;base64,${trayIconPng(image, theme, size).toString('base64')}`;
}

/**
 * How much of the icon is inked, 0…1. Not decorative: a drawing that rasterises to
 * nothing is INVISIBLE, and an invisible tray icon looks exactly like a crashed app. A
 * test holds every drawing above a floor, at every size, in both inks.
 */
export function inkCoverage(image: TrayImage, theme: TrayTheme, size: number): number {
  const pixels = rasteriseTrayIcon(image, theme, size);
  let total = 0;
  for (let i = 3; i < pixels.length; i += 4) total += pixels[i] ?? 0;
  return total / (size * size * 255);
}

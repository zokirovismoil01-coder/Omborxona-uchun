#!/usr/bin/env python3
"""Draw Sezgir's app icon: a gold sound wave on a deep-blue rounded square.

Writes build/icon.ico (16–256 px, for the installer and the .exe) and build/icon-128.png
(the brand mark the pages inline as a data URI — src/renderer/brand-icon.ts). Run it again
after changing the drawing, then paste the printed base64 into brand-icon.ts:

    python3 scripts/make-icons.py
"""
import base64
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')

SIZE = 1024
BACKGROUND_TOP = (16, 33, 62)
BACKGROUND_BOTTOM = (28, 58, 104)
BAR_TOP = (255, 205, 86)
BAR_BOTTOM = (247, 151, 30)

# The wave: bar centres across the tile and each bar's height, both as fractions of the tile.
BARS = [(0.22, 0.20), (0.36, 0.42), (0.50, 0.62), (0.64, 0.42), (0.78, 0.20)]
BAR_WIDTH = 0.095


def vertical_gradient(size, top, bottom):
    gradient = Image.new('RGB', (1, size))
    for y in range(size):
        t = y / (size - 1)
        gradient.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return gradient.resize((size, size))


def draw(size=SIZE):
    tile = vertical_gradient(size, BACKGROUND_TOP, BACKGROUND_BOTTOM).convert('RGBA')
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    tile.putalpha(mask)

    bars_mask = Image.new('L', (size, size), 0)
    pen = ImageDraw.Draw(bars_mask)
    width = size * BAR_WIDTH
    for centre, height in BARS:
        x = size * centre
        half = size * height / 2
        pen.rounded_rectangle(
            (x - width / 2, size / 2 - half, x + width / 2, size / 2 + half),
            radius=width / 2,
            fill=255,
        )
    bars = vertical_gradient(size, BAR_TOP, BAR_BOTTOM).convert('RGBA')
    bars.putalpha(bars_mask)
    return Image.alpha_composite(tile, bars)


def main():
    os.makedirs(BUILD, exist_ok=True)
    big = draw()
    icon_sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    big.save(os.path.join(BUILD, 'icon.ico'), sizes=[(s, s) for s in icon_sizes])
    mark = big.resize((128, 128), Image.LANCZOS)
    mark_path = os.path.join(BUILD, 'icon-128.png')
    mark.save(mark_path, optimize=True)
    big.resize((512, 512), Image.LANCZOS).save(os.path.join(BUILD, 'icon-512.png'), optimize=True)
    with open(mark_path, 'rb') as fh:
        print(base64.b64encode(fh.read()).decode('ascii'))


if __name__ == '__main__':
    main()

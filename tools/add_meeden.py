"""Append MEEDEN Airbrush Paints (new brand) to data.js.

Usage: python3 -I tools/add_meeden.py <meeden-60-chart.jpg> [check.png]
Needs Pillow.

Source: MEEDEN's airbrush colour chart (768 x 768, sprayed swatches with names; fluorescents and metallics on black),
sent by the owner 2026-11-27 (data/meeden/). Swatch = median of a small ellipse in the middle of each sprayed patch,
so every colour is an estimate from a product image. No product codes are printed, so the code field is empty.
Groups: 'ƕ' Airbrush Paint (41), 'Ɩ' Fluorescent (4, fx), 'Ɨ' Metallic (12, MET_G).
Chart typos fixed: Emarald -> Emerald, Muave -> Mauve, Yellow Orcha -> Yellow Ochre.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [60, 190, 318, 448, 578, 709]
ROWS = [(25, 'ƕ', ['Titanium White', 'Pale Purple', 'Pink', 'Emerald Green', 'Olive Green', 'Cobalt Blue']),
        (97, 'ƕ', ['Viridian Green', 'Cerulean Blue', 'Gray', 'Orange Yellow', 'Naples Yellow', 'Light Grayish Blue']),
        (178, 'ƕ', ['Black', 'Crimson Red', 'Raw Umber', 'Burnt Umber', 'Sky Blue', 'Sangria Red/Light Red']),
        (261, 'ƕ', ['Champagne', 'Chromium Oxide Green', 'Sienna', 'Vermilion Red', 'Mauve Pale', 'Sap Green']),
        (337, 'ƕ', ['Yellow Ochre', 'Pale Green', 'Rose', 'Lemon Yellow', 'Prussian Blue', 'Light Sap Green']),
        (417, 'ƕ', ['Scarlet Red', 'Deep Green', 'Phthalocyanine Blue', 'Phthalocyanine Green', 'Indian Yellow',
                    'Deep Yellow']),
        (491, 'ƕ', ['Prussian Green', 'Pale Yellow', 'Mars Brown', 'Ultramarine Blue', 'Cochineal']),
        (558, 'Ɩ', ['Fluorescent Pink', 'Fluorescent Violet Purple', 'Fluorescent Lake Blue',
                    'Fluorescent Lemon Yellow']),
        (638, 'Ɨ', ['Metallic Purple Pale', 'Metallic Fruit Green', 'Metallic Silver', 'Metallic Gold',
                    'Metallic Yellow Pale', 'Metallic Silver Black']),
        (715, 'Ɨ', ['Metallic Red Copper', 'Metallic Rose', 'Metallic Lemon Yellow', 'Metallic Deep Gold',
                    'Metallic Peach Red', 'Metallic Cerulean Blue'])]


def sample(im, x, y, rx=22, ry=10):
    px = [im.getpixel((i, j)) for i in range(x - rx, x + rx + 1) for j in range(y - ry, y + ry + 1)
          if ((i - x) / rx) ** 2 + ((j - y) / ry) ** 2 <= 1]
    return '#%02x%02x%02x' % tuple(round(st.median(p[c] for p in px)) for c in range(3))


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    rows = [(g, n, sample(im, x, y), x, y) for y, g, names in ROWS for x, n in zip(XS, names)]
    src = open('data.js', encoding='utf-8').read()
    if '\n#ƕ\n' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = []
    for g in 'ƕƖƗ':
        lines.append('#' + g)
        lines += [f'{n}||{h}' for gg, n, h, _, _ in rows if gg == g]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(rows))
    if len(sys.argv) > 2:
        sheet = Image.new('RGB', (760, 44 * 29), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (g, n, h, x, y) in enumerate(rows):
            ox, oy = i // 29 * 380, i % 29 * 44
            sheet.paste(im.crop((x - 40, y - 20, x + 40, y + 20)).resize((84, 42)), (ox, oy))
            d.rectangle((ox + 88, oy, ox + 130, oy + 42), fill=h)
            d.text((ox + 136, oy + 15), f'{g} {n} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

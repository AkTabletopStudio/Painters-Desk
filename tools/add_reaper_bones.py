"""Append Reaper Master Series Paints Bones (ultra-coverage, 9401-9454) to data.js.

Usage: python3 -I tools/add_reaper_bones.py <bones-chart.png> [check.png]
Needs Pillow.

Source: a Reaper Bones paint chart (800 x 353, a retailer's promo image with Reaper's Bones logo, 54 squares, each with
its code and name printed in white across the middle), sent by the owner 2026-11-15 (project folder data/reaper/).
Swatch = median of a band along the bottom of each square, below the white text. The 7 metallics (9448-9454) are
shaded squares, so their band median is a mid tone. Colours are a digital chart, so every colour is an estimate.
Group 'Ŷ' Bones (Reaper), code = Reaper's 4-digit number; metallics in MET_K.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [6, 73, 140, 207, 273, 339, 406, 473, 539, 607, 674, 741]
YS = [4, 73, 141, 210, 278]
SIZE = 55
NAMES = ['Dragon Red', 'Heraldic Red', 'Monster Maw', 'Cinnamon Red', 'Volcanic Orange', 'Sunrise Orange',
         'Lantern Yellow', 'Candlelight Yellow', 'Canary Yellow', 'Dragon Green', 'Wilderness Green', 'Ancient Oak',
         'Naga Green', 'Catseye Green', 'Dungeon Slime', 'Spectral Glow', 'Void Blue', 'Oceanic Blue', 'Tropical Blue',
         'Glacier Blue', 'Frost Blue', 'Nightsky Indigo', 'Styx Purple', 'Runic Purple',
         'Icy Violet', 'Charred Brown', 'Nut Brown', 'Saddle Brown', 'Rich Leather', 'Polished Leather', 'Desert Stone',
         'Desert Sand', 'Mountain Stone', 'Wolf Grey', 'Skeleton Bone', 'Bleached Linen',
         'Dragon Black', 'Tempest Grey', 'Dragon White', 'Ebony Flesh', 'Ruddy Flesh', 'Barbarian Flesh',
         'Warrior Flesh', 'Scholar Flesh', 'Youthful Flesh', 'Pale Flesh', 'Undead Flesh', 'Dragon Copper',
         'Dragon Bronze', 'Dragon Gold', 'Dwarven Gold', 'Blade Steel', 'Filigree Silver', 'Shining Mithril']


def med(im, b):
    px = [im.getpixel((x, y)) for x in range(b[0], b[2]) for y in range(b[1], b[3])]
    return tuple(round(st.median(p[i] for p in px)) for i in range(3))


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    paints = []
    for i, n in enumerate(NAMES):
        x, y = XS[i % 12], YS[i // 12]
        b = (x + 4, y + 43, x + SIZE - 4, y + SIZE - 3)
        paints.append((str(9401 + i), n, '#%02x%02x%02x' % med(im, b), b))
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ŷ\n' in src:
        sys.exit('Bones already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ŷ'] + [f'{n}|{c}|{h}' for c, n, h, _ in paints]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(paints))
    if len(sys.argv) > 2:
        W, H = 380, 30
        sheet = Image.new('RGB', (W * 2, H * 27), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (c, n, h, b) in enumerate(paints):
            ox, oy = i // 27 * W, i % 27 * H
            sheet.paste(im.crop((b[0] - 4, b[3] + 3 - SIZE, b[0] - 4 + SIZE, b[3] + 3)).resize((H - 2, H - 2)), (ox, oy))
            d.rectangle((ox + 34, oy, ox + 84, oy + H - 2), fill=h)
            d.text((ox + 92, oy + 9), f'{c} {n} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

"""Append Warcolours Nostalgia Colours '88 (70 paints, 01-70) to data.js.

Usage: python3 -I tools/add_warcolours_nostalgia88.py <nostalgia-88-chart.png> [check.png]
Needs Pillow.

Source, sent by the owner 2026-11-15 (project folder data/warcolours/): Warcolours' "Nostalgia Colours '88 paint range"
product chart, squares numbered 01-70 grouped by the original 1988 sets, names printed under each square. A second,
"nostalgia 88 full reference" sheet was also sent, but it renames the inks (Plasma Red for Red Ink etc.) and its colours
differ, so the product chart is used. Swatch = median of the top-left of each square (away from the number badge);
metallic squares are shaded left to right, so their swatch is a band at the left edge. Digital colours from the maker:
estimates. Group 'Ŕ' Nostalgia '88 under Warcolours, code = the chart number ('01'). The chart's 'Titilating Pink'
is written Titillating Pink.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [405, 458, 512, 565, 618, 671, 724, 776, 830]
YS = [96, 175, 253, 333, 412, 491, 570, 648]
S = 45
ROWS = [
    ['01 Bronzed Flesh', '02 Chaos Black', '03 Woodland Green', '04 Blood Red', '05 Skull White', '06 Shining Gold',
     '07 Sunburst Yellow', '08 Enchanted Blue', '09 Mithril Silver'],
    ['10 Swamp Brown', '11 Rotting Flesh', '12 Orc Brown', '13 Hobgoblin Orange', '14 Elf Grey', '15 Spearstaff Brown',
     '16 Worm Purple', '17 Goblin Green', '18 Chainmail'],
    ['19 Brazen Brass', '20 Bilious Green', '21 Ghoul Grey', '22 Bestial Brown', '23 Electric Blue', '24 Red Gore',
     '25 Imperial Purple', '26 Moody Blue', '27 Titillating Pink'],
    ['29 Red Ink', '30 Orange Ink', '31 Yellow Ink', '32 Green Ink', '33 Blue Ink', '34 Purple Ink', '35 Brown Ink',
     '36 Chestnut Ink', '37 Black Ink'],
    ['38 Boltgun Metal', '39 Salamander Green', '40 Salamander Black', '41 Ultramarine', '42 Marine Dark Blue',
     '43 Cosmic Wolf Grey', '44 Blue Grey', '45 Blood Angel Orange', '46 Terracotta'],
    ['47 Tin Bitz', '48 Striking Scorpion Green', '49 Bad Moon Yellow', '50 Go Fasta Red', '51 Ork Flesh',
     '52 Serpentbite Leather', '53 Fire Dragon Crimson', '54 Hawk Turquoise', '55 Bleached Bone'],
    ['56 Fire Orange', '57 Jungle Green', '58 Sulphur Desert Yellow', '59 Codex Grey', '60 Battle Green',
     '61 Horizon Blue', '62 Nightworld Blue', '63 Ash Waste Grey', '64 Imperial Strike Green'],
    ['65 Polished Blue', '66 Burnished Gold', '67 Dwarf Bronze', '68 Amethyst Purple', '69 Beaten Copper',
     '70 Glistening Green', None, None, '28 Smelly Primer'],
]
METAL = {'06', '09', '18', '19', '38', '47', '65', '66', '67', '68', '69', '70'}


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    rows, chk = [], []
    for y, row in zip(YS, ROWS):
        for x, item in zip(XS, row):
            if not item:
                continue
            code, name = item.split(' ', 1)
            b = (x + 3, y + 5, x + 13, y + 38) if code in METAL else (x + 4, y + 4, x + 28, y + 26)
            px = [im.getpixel((a, c)) for a in range(b[0], b[2]) for c in range(b[1], b[3])]
            h = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
            rows.append((code, f'{name}|{code}|{h}'))
            chk.append((im.crop((x, y, x + S, y + S)), h, f'{code} {name} {h}'))
    rows.sort()
    assert len(rows) == 70
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ŕ\n' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n#Ŕ\n' + '\n'.join(r for _, r in rows) + tail)
    print('added', len(rows))
    if len(sys.argv) > 2:
        H = 26
        s = Image.new('RGB', (380, H * len(chk)), 'white')
        d = ImageDraw.Draw(s)
        for i, (c, h, t) in enumerate(chk):
            s.paste(c.resize((H - 2, H - 2)), (0, i * H))
            d.rectangle((30, i * H, 80, i * H + H - 2), fill=h)
            d.text((88, i * H + 7), t, fill='black')
        s.save(sys.argv[2])


if __name__ == '__main__':
    main()

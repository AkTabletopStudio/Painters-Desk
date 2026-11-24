"""Append Gilded Goblin (new brand, 18 paints) to data.js.

Usage: python3 -I tools/add_gilded_goblin.py <original-12-swatches.jpg> <arcane-expansion-swatches.jpg> [check.png]
Needs Pillow.

Source: Gilded Goblin's own swatch sheets (brush strokes on white, names printed under each), sent by the owner
2026-11-21 with the Complete Paint Collection product text (data/gilded-goblin/). 12 original colours
(Core, Natural Tones, Fantasy) + 6 Arcane Expansion colours, 18 ml dropper bottles. Swatch = median of a box in the
middle of each stroke (2576 px images), so every colour is an estimate from a product photo. No product codes, so
the code field holds the set the paint belongs to. Group 'Ɛ'.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

K = 2576 / 1932  # positions below were read off a 1932 px view
ORIG = [('Golden Ochre', 295, 340, 'Natural Tones'), ('Light Skin', 715, 340, 'Natural Tones'),
        ('Ancient Bone', 1135, 340, 'Natural Tones'), ('Titanium White', 1590, 340, 'Core'),
        ('Sage Blue', 290, 960, 'Fantasy'), ('Imperial Blue', 715, 960, 'Fantasy'),
        ('Royal Violet', 1150, 960, 'Fantasy'), ('Herald Red', 1575, 960, 'Fantasy'),
        ('Void Black', 300, 1600, 'Core'), ('Castle Gray', 735, 1600, 'Core'),
        ('Oak Umber', 1150, 1600, 'Natural Tones'), ('Goblin Green', 1590, 1600, 'Fantasy')]
ARC = [('Illuminator Yellow', 1505, 520), ('Cinnabar Orange', 330, 520), ('Alchemist Pink', 915, 500),
       ('Witchbrew Green', 345, 1370), ('Arcane Azure', 920, 1290), ('Deepwood Emerald', 1545, 1340)]
ORDER = ['Titanium White', 'Castle Gray', 'Void Black', 'Ancient Bone', 'Light Skin', 'Golden Ochre', 'Oak Umber',
         'Herald Red', 'Imperial Blue', 'Royal Violet', 'Sage Blue', 'Goblin Green', 'Illuminator Yellow',
         'Cinnabar Orange', 'Alchemist Pink', 'Witchbrew Green', 'Arcane Azure', 'Deepwood Emerald']


def sample(im, x, y):
    x, y = int(x * K), int(y * K)
    px = [im.getpixel((i, j)) for i in range(x - 50, x + 50, 3) for j in range(y - 140, y + 140, 3)]
    return '#%02x%02x%02x' % tuple(round(st.median(p[c] for p in px)) for c in range(3)), im.crop((x - 50, y - 140, x + 50, y + 140))


def main():
    a, b = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
    got = {n: (*sample(a, x, y), s) for n, x, y, s in ORIG}
    got.update({n: (*sample(b, x, y), 'Arcane Expansion') for n, x, y in ARC})
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ɛ\n' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ɛ'] + [f'{n}|{got[n][2]}|{got[n][0]}' for n in ORDER]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('\n'.join(lines))
    if len(sys.argv) > 3:
        sheet = Image.new('RGB', (420, 40 * 18), 'white')
        d = ImageDraw.Draw(sheet)
        for i, n in enumerate(ORDER):
            sheet.paste(got[n][1].resize((14, 38)), (0, i * 40))
            d.rectangle((20, i * 40, 70, i * 40 + 38), fill=got[n][0])
            d.text((78, i * 40 + 14), f'{n} {got[n][0]} {got[n][2]}', fill='black')
        sheet.save(sys.argv[3])


if __name__ == '__main__':
    main()

"""Append the 19 Warcolours SHADE gel washes to data.js as group 'Ž' (Shade, Warcolours, PT_G wash).

Usage: python3 -I tools/add_warcolours_shade.py <shade-swatch-reference.png> [check.png]
Needs Pillow.

Source: Warcolours' "shade full swatch reference" (1200 x 800, flat digital circles in the same series as the other
Warcolours sheets), sent by the owner 2026-11-15 (project folder data/warcolours/). Swatch = median of the inner disc.
Names as printed (Orange, Red ... Black); no product codes.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

ROWS = [['Orange', 'Red', 'Brown', 'Ochre', 'Yellow'], ['Olive', 'Green', 'Emerald', 'Turquoise', 'Blue'],
        ['Marine', 'Violet', 'Purple', 'Pink', 'Flesh'], ['Cool Grey', 'Warm Grey', 'Blue Grey', 'Black']]
XS = [338, 469, 600, 731, 862]
YS = [245, 376, 507, 638]
R = 18


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    out = []
    for y, row in zip(YS, ROWS):
        for x, n in zip(XS, row):
            px = [im.getpixel((a, b)) for a in range(x - R, x + R) for b in range(y - R, y + R) if (a - x) ** 2 + (b - y) ** 2 < R * R]
            out.append((n, '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3)), x, y))
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ž\n' in src:
        sys.exit('Shade already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ž'] + [f'{n}||{c}' for n, c, _, _ in out]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(out))
    if len(sys.argv) > 2:
        sheet = Image.new('RGB', (360, len(out) * 40), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (n, c, x, y) in enumerate(out):
            sheet.paste(im.crop((x - 32, y - 32, x + 32, y + 32)).resize((38, 38)), (0, i * 40))
            d.rectangle((44, i * 40, 100, i * 40 + 38), fill=c)
            d.text((110, i * 40 + 13), f'{n} {c}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

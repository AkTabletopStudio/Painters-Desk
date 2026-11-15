"""Append the 5 Warcolours Pearlescents to data.js as group 'Ż' (Pearlescents, Warcolours).

Usage: python3 -I tools/add_warcolours_pearlescents.py <pearlescent-swatch-reference.png> [check.png]
Needs Pillow.

Source: Warcolours' "pearlescent full swatch reference" (1200 x 800, the same digital series as the other Warcolours
sheets), sent by the owner 2026-11-15 (project folder data/warcolours/). Each colour is shown over a white base (almost
white) and a black base, where its tint shows. Swatch = median of the inner disc over the black base, so each is the
colour the pearl gives over a dark basecoat. No product codes. 'Pearl ...' names make them the pearl paint type.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

NAMES = ['Pearl Yellow', 'Pearl Red', 'Pearl Blue', 'Pearl Violet', 'Pearl Green']
XS = [371, 485, 600, 714, 828]
Y, R = 576, 30


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    cols = []
    for x in XS:
        px = [im.getpixel((a, b)) for a in range(x - R, x + R) for b in range(Y - R, Y + R) if (a - x) ** 2 + (b - Y) ** 2 < R * R]
        cols.append('#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3)))
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ż\n' in src:
        sys.exit('Pearlescents already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ż'] + [f'{n}||{c}' for n, c in zip(NAMES, cols)]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', list(zip(NAMES, cols)))
    if len(sys.argv) > 2:
        sheet = Image.new('RGB', (420, 5 * 70), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (x, n, c) in enumerate(zip(XS, NAMES, cols)):
            sheet.paste(im.crop((x - 45, Y - 45, x + 45, Y + 45)).resize((66, 66)), (0, i * 70))
            d.rectangle((72, i * 70, 140, i * 70 + 66), fill=c)
            d.text((150, i * 70 + 28), f'{n} {c}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

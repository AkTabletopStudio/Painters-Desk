"""Append the 3 MEEDEN fluorescents that are in the 60-colour box but not on the colour chart.

Usage: python3 -I tools/add_meeden_bottles.py <meeden-60-bottles.jpg>
Needs Pillow.

Source: MEEDEN's 60-colour set box photo (768 x 768), sent by the owner 2026-11-27 (data/meeden/). Names are read off
the bottle labels; swatch = median of a small patch on each bottle's shoulder, above the label. Bottle colours read
lighter than the sprayed chart (Fluorescent Violet Purple bottle #a857ab vs chart #880c71), so these are rough
estimates, used at the owner's request until a chart swatch turns up. Appended as a second '#Ɩ' block.
"""
import re, statistics as st, sys
from PIL import Image

BOTTLES = [('Fluorescent Golden Yellow', 213, 268), ('Fluorescent Green', 385, 268), ('Fluorescent Purple', 441, 268)]


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    src = open('data.js', encoding='utf-8').read()
    if '\nFluorescent Golden Yellow||#' in src:
        sys.exit('already present')
    lines = ['#Ɩ']
    for n, x, y in BOTTLES:
        px = [im.getpixel((i, j)) for i in range(x - 12, x + 13) for j in range(y - 3, y + 4)]
        lines.append(n + '||#%02x%02x%02x' % tuple(round(st.median(p[c] for p in px)) for c in range(3)))
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('\n'.join(lines))


if __name__ == '__main__':
    main()

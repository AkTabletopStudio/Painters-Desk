"""Append the Warcolours Layer range (92 colours) to data.js.

Usage: python3 -I tools/add_warcolours_layer.py <layer-swatch-reference.png>
Needs Pillow.

Source, sent by the owner 2026-11-15 (project folder data/warcolours/): Warcolours' "warcolours layer - full swatch
reference" image (18 hue families x 5 tones, Tone 1 lightest, plus White and Black). Each swatch is the median of a
small patch of the flat circle, beside its number. 91 of the 92 colours also appear exactly (within 3/255) as fills in
Warcolours' own printable colour wheel PDF (colour-wheel-printable.pdf, warcolours.com), so these are the maker's own
published digital colours, not photos of paint: still estimates of the real paint.
Group 'Ŀ' Layer under brand Warcolours. Warcolours prints no product codes, so code is empty; names are
'<Family> <tone>' as Warcolours sells them (e.g. 'Blue Grey 3').
"""
import re, statistics as st, sys
from PIL import Image

XS = [261, 336, 411, 487, 562, 637, 713, 788, 863, 939]
TOP = ['Orange', 'Red', 'Brown', 'Ochre', 'Yellow', 'Olive', 'Green', 'Emerald', 'Turquoise']
BOT = ['Blue', 'Marine', 'Violet', 'Purple', 'Pink', 'Flesh', 'Cool Grey', 'Warm Grey', 'Blue Grey']
YT, YB = [168, 223, 279, 334, 389], [480, 535, 590, 646, 701]


def main():
    im = Image.open(sys.argv[1]).convert('RGB')

    def samp(x, y):
        px = [im.getpixel((a, b)) for a in range(x + 5, x + 12) for b in range(y - 12, y - 5)]
        return '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
    rows = []
    for fams, ys in ((TOP, YT), (BOT, YB)):
        for i, f in enumerate(fams):
            rows += [f'{f} {t + 1}||{samp(XS[i], y)}' for t, y in enumerate(ys)]
    rows += [f'White||{samp(939, 480)}', f'Black||{samp(939, 535)}']
    assert len(rows) == 92
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ŀ\n' in src:
        sys.exit('Warcolours Layer already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n#Ŀ\n' + '\n'.join(rows) + tail)
    print('added', len(rows))


if __name__ == '__main__':
    main()

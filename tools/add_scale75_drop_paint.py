"""Append Scale75 Drop & Paint (airbrush acrylics, SDP-01..SDP-128) to data.js.

Usage: python3 -I tools/add_scale75_drop_paint.py <238207_2.jpg> <238208_2.jpg> <names.csv> [check.png]
Needs Pillow.

Sources, sent by the owner 2026-11-15 (project folder data/scale75/drop-and-paint/ and data/scale75/):
- Scale75's swatch sheets for the two Color Palace boxes (SSE-125 Vol 1 = 238207_2.jpg, SSE-126 Vol 2 = 238208_2.jpg),
  each an 8 x 8 grid of airbrushed squares labelled SDP01..SDP128. Between them they hold all 128 colours.
- A distributor's stand contents list (drop-and-paint-list.csv: item, SKU SDP-01.., name) for the names.
Swatch = median of a patch near the top of each square, where the airbrushed colour is densest (the squares fade
lighter towards the bottom). Metallic squares are shaded left to right, so for SDP-105..128 the whole square is used.
So every colour is an estimate from a product image.
Groups: 'Ď' Drop & Paint (SDP-01..104, PT_G 'op' so Burnt/Natural Shade aren't washes), 'Ĕ' Drop & Paint Metallics (SDP-105..128, in MET_G). Code = SKU.
The list's 'Pastel Tuquoise' is written Pastel Turquoise, and 'Mc Queen' McQueen Red (Scale75's bottle label).
"""
import csv, re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [189, 280, 373, 465, 559, 651, 744, 836]      # square left edges (both sheets, +-1 px)
YS = [47, 176, 305, 434, 561, 688, 816, 942]       # square top edges
SIZE = 76
ROWS = {0: [1, 17, 33, 41, 49, 65, 81, 89],         # first code in each row of each sheet
        1: [9, 25, 57, 73, 97, 105, 113, 121]}
FIX = {'Pastel Tuquoise': 'Pastel Turquoise', 'Mc Queen': 'McQueen Red'}  # McQueen Red as on Scale75's bottle render


def med(im, b):
    px = [im.getpixel((x, y)) for x in range(b[0], b[2]) for y in range(b[1], b[3])]
    return tuple(round(st.median(p[i] for p in px)) for i in range(3))


def main():
    sheets = [Image.open(f).convert('RGB') for f in sys.argv[1:3]]
    names = {}
    for r in csv.DictReader(open(sys.argv[3], encoding='utf-8')):
        names[int(r['sku'].split('-')[1])] = FIX.get(r['name'], r['name'])
    assert sorted(names) == list(range(1, 129))
    col, boxes = {}, {}
    for s, firsts in ROWS.items():
        for ry, first in enumerate(firsts):
            for cx in range(8):
                n = first + cx
                x, y = XS[cx], YS[ry]
                b = (x + 6, y + 6, x + SIZE - 6, y + SIZE - 6) if n >= 105 else (x + 10, y + 6, x + SIZE - 10, y + 30)
                col[n] = '#%02x%02x%02x' % med(sheets[s], b)
                boxes[n] = (s, b)
    assert sorted(col) == list(range(1, 129))

    src = open('data.js', encoding='utf-8').read()
    if '\n#Ď\n' in src:
        sys.exit('Drop & Paint already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ď'] + [f'{names[n]}|SDP-{n:02d}|{col[n]}' for n in range(1, 105)]
    lines += ['#Ĕ'] + [f'{names[n]}|SDP-{n:02d}|{col[n]}' for n in range(105, 129)]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(col))

    if len(sys.argv) > 4:
        W, H = 460, 26
        sheet = Image.new('RGB', (W * 2, H * 64), 'white')
        d = ImageDraw.Draw(sheet)
        for n in range(1, 129):
            s, b = boxes[n]
            ox, oy = (n - 1) // 64 * W, (n - 1) % 64 * H
            x, y = b[0] - 10, b[1] - 6
            sheet.paste(sheets[s].crop((x, y, x + SIZE, y + SIZE)).resize((H - 2, H - 2)), (ox, oy))
            d.rectangle((ox + 30, oy, ox + 80, oy + H - 2), fill=col[n])
            d.text((ox + 88, oy + 7), f'SDP-{n:02d} {names[n]} {col[n]}', fill='black')
        sheet.save(sys.argv[4])


if __name__ == '__main__':
    main()

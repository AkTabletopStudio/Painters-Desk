"""Append Scale75 Prism Effect (Chromaflair colour-shift) paints SPE-01..SPE-16 to data.js (group 'Ş').

Usage: python3 -I tools/add_scale75_prism.py <folder with cars-spe01-04.webp .. cars-spe13-16.webp>

Source: Scale75's product images (owner upload 2026-11-10, project files data/scale75/prism/): each image shows
four test cars, painted over WHITE primer (left) and BLACK primer (right). Names are from the bottle labels and the
Dec 2022 newsletter (Boreal Lights SSE-080 = 01-08, Solar Flares SSE-081 = 09-16).
The swatch is the white-primer car (25th-75th brightness percentile of the car pixels), which matches the bottle
colour and the paint names best. These paints shift colour with angle and with primer, so one swatch is only a rough
guide; the black-primer colour is printed by this script for reference. Estimates of photos.
"""
import sys
import numpy as np
from PIL import Image

NAMES = ['Golden Moon', 'Blue Sand', 'Green Pearl', 'Pink Nacre', 'Boreal Beetle', 'Emerald Dimension', 'Green Sun',
         'Dead Star', 'Golden Coral', 'Copper Fire', 'Purple Quasar', 'Solar Sand', 'Silver Sun', 'Violet Sunset',
         'Metallic Rose', 'Sulfur Ore']


def car(a, r, side):
    H, W, _ = a.shape
    y0, y1 = int(H * r / 4 + H * 0.03), int(H * r / 4 + H * 0.17)
    x0, x1, bg = (int(W * .1), int(W * .44), 255) if side == 'W' else (int(W * .56), int(W * .92), 0)
    p = a[y0:y1, x0:x1].reshape(-1, 3)
    p = p[np.abs(p - bg).sum(1) > 90]
    s = p.sum(1)
    lo, hi = np.percentile(s, [25, 75])
    return '#%02x%02x%02x' % tuple(np.median(p[(s >= lo) & (s <= hi)], 0).astype(int))


def main(folder):
    rows = []
    for i, f in enumerate(['cars-spe01-04', 'cars-spe05-08', 'cars-spe09-12', 'cars-spe13-16']):
        a = np.asarray(Image.open(f'{folder}/{f}.webp').convert('RGB')).astype(int)
        for r in range(4):
            n = i * 4 + r
            rows.append(f'{NAMES[n]}|SPE-{n + 1:02d}|{car(a, r, "W")}')
            print(rows[-1], 'black primer:', car(a, r, 'B'))
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '|SPE-01|' in raw:
        sys.exit('Prism Effect already in data.js')
    s = s[:a0] + raw.rstrip('\n') + '\n#Ş\n' + '\n'.join(rows) + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    main(*sys.argv[1:])

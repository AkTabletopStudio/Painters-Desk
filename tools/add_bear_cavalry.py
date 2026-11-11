"""Append Bear Cavalry paints to data.js.

Usage: python3 -I tools/add_bear_cavalry.py <dir with card-01.png .. card-12.png> [check.png]
Needs Pillow and numpy.

Source: Bear Cavalry's own swatch cards (owner upload 2026-11-07, copies in project files data/bear-cavalry/): 12
images of 1-7 hand-painted cards each, one paint per card, brushed over a white square (left) and over the black card
(right). Names are typed from the cards; Bear Cavalry prints no codes. Swatches are the median of the paint inside
the white square (pixels clearly off the white), so they are estimates of a photo of hand-painted strokes. White Room
is white on white, so it's the median of the whole square. Each image is white-balanced so its bare white squares
read neutral (the photos have a slight blue cast).
Bear Cavalry tints its paints with NovoColor II colourants (owner's notes), which doesn't change the swatches.
Group: 'Ü' Bear Cavalry.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

# Cards in each image, top row left to right, then the next row.
CARDS = [
    ['Blood Red Skies', 'The Red Baron', 'Sekigahara', 'Rust in Peace', 'Burnt Offering'],
    ['Agent Orange', 'Pyrrhic Dawn'],
    ['Gold Dust Woman', 'Battle of Yellow Tavern', 'Screaming Sun', 'Pale Rider'],
    ['Nuclear Sludge'],
    ['Forest of Shadows', 'Poison Ivy', 'Emerald Scream', 'Green Hell', '82nd All the Way'],
    ['Lucky 38', 'Freezing Moon'],
    ["Bismark's Grave", "Neptune's Fury", 'Blue Licks'],
    ['Twilight at Gettysburg', 'Purple Rain', 'Violet Skies', 'Purple People Eater', 'Pale Blue Dot', 'Dark Eternal Night'],
    ['Mindcrime Magenta'],
    ['White Room', 'Ultimate Cup of Coffee', 'Iron Man', 'Grey Goose', 'Ravenskill', 'Glass Moon Light'],
    ['Fade to Black', 'Hell Bent for Leather', 'March of the Fire Ants', 'Black Rose Immortal', "Hunter's Quiver", 'Bison-Beast'],
    ['Battle of Marathon', 'Seven Pillars of Wisdom', 'Terracotta Pie', 'Count of Tuscany', 'Pure Filth', 'Sunburned Skin', 'Boone Tan'],
]


def white_squares(a):
    """Bounding boxes of the white squares, in reading order. Paint strokes split a square into several white parts,
    so parts that share rows and sit close together are merged."""
    w = (a.min(2) > 200) & ((a.max(2) - a.min(2)) < 40)
    H, W = w.shape
    seen = np.zeros_like(w)
    parts = []
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            if w[y, x] and not seen[y, x]:
                q, ys, xs = deque([(y, x)]), [], []
                seen[y, x] = 1
                while q:
                    cy, cx = q.popleft()
                    ys.append(cy); xs.append(cx)
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < H and 0 <= nx < W and w[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = 1; q.append((ny, nx))
                if max(ys) - min(ys) > 40:  # skips the white lettering
                    parts.append([min(xs), min(ys), max(xs), max(ys)])
    boxes = []
    for p in sorted(parts):
        for b in boxes:
            if p[1] < b[3] and p[3] > b[1] and p[0] - b[2] < 65:
                b[:] = [min(b[0], p[0]), min(b[1], p[1]), max(b[2], p[2]), max(b[3], p[3])]
                break
        else:
            boxes.append(p)
    rows = []
    for b in sorted(boxes, key=lambda b: b[1]):
        if rows and abs(rows[-1][0][1] - b[1]) < 60:
            rows[-1].append(b)
        else:
            rows.append([b])
    out = [b for r in rows for b in sorted(r)]
    for b in out:  # a stroke can hide the right part of a square: squares are at least ~55 px wide
        b[2] = max(b[2], b[0] + 55)
    return out


def main(d, check=None):
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '\n#Ü\n' in raw:
        sys.exit('Bear Cavalry already in data.js')
    rows, sheets = [], []
    for k, names in enumerate(CARDS, 1):
        pim = Image.open(f'{d}/card-{k:02d}.png').convert('RGB')
        a = np.asarray(pim).astype(float)
        boxes = white_squares(a)
        if len(boxes) != len(names):
            sys.exit(f'card-{k:02d}: found {len(boxes)} white squares, expected {len(names)}: {boxes}')
        # white balance: scale each channel so the bare white squares on this image read neutral
        paper = np.median(a[(a.min(2) > 200) & ((a.max(2) - a.min(2)) < 40)], 0)
        gain = paper.max() / paper
        dr = ImageDraw.Draw(pim)
        for name, (x0, y0, x1, y1) in zip(names, boxes):
            px = a[y0 + 2:y1 - 1, x0 + 2:x1 - 1].reshape(-1, 3)
            paint = px[np.abs(px - 245).sum(1) > 45]
            if name == 'White Room' or len(paint) < 50:
                paint = px
            rgb = np.clip(np.median(paint, 0) * gain, 0, 255)
            rows.append(f'{name}||#%02x%02x%02x' % tuple(int(round(v)) for v in rgb))
            dr.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=2)
        sheets.append(pim.resize((375, 375)))
    s = s[:a0] + raw.rstrip('\n') + '\n#Ü\n' + '\n'.join(rows) + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)
    if check:
        out = Image.new('RGB', (375 * 6, 750))
        for i, sh in enumerate(sheets):
            out.paste(sh, ((i % 6) * 375, (i // 6) * 375))
        out.save(check)
    print(f'added {len(rows)} paints')
    print('\n'.join(rows))


if __name__ == '__main__':
    main(*sys.argv[1:])

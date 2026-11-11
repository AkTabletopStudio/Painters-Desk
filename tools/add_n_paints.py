"""Append Nocturna Models N-Paint to data.js.

Usage: python3 -I tools/add_n_paints.py <charts dir> <antinea-n-paints-database.pdf>
Needs Pillow and numpy and poppler (pdfimages).

Source: Nocturna Models' own set cards (owner upload 2026-11-07, copies in project files data/nocturna/charts/): one
680 x 453 image per set, with a row of 8 colour boxes (3 on the Auxiliary card) labelled with name and code. Names and
codes are typed from the cards, keeping Nocturna's spellings ('Nocturne Skin', 'Scarlett Red', 'Sulfide Yellow').
The card boxes are flat graphic fills (Thunder Blue is #0504e8), so for the 48 Basic colours the swatches come from
Antinea's "Nocturna - N-Paints Database" (data/nocturna/): plastic spoons primed white, airbrushed with each paint and
photographed on black under CRI 95+ daylight lamps; the swatch is the median of the middle of each bowl. Her handles
mislabel the Blue set from Ghost Blue on, so spoons are matched to the cards by position. Metal, Ink and the Aux white
and black aren't on the spoons, so they use the card box median (Metal boxes are gradients, so rougher). All swatches
are estimates. The script prints the cards vs spoons CIE76 dE for the 48 as a check.
Groups: 'Ñ' N-Paint Basic (plus Sketching White and Outlining Black from the Aux card; the matte medium is left out),
'Ö' N-Paint Metal (MET_G), 'Ô' N-Paint Ink (PT_G ink).
"""
import math, os, statistics as st, subprocess, sys, tempfile
import numpy as np
from PIL import Image

XS = [22, 101, 180, 260, 340, 419, 498, 577]  # left edge of each box on an 8-colour card
AUX_XS = [20, 100, 179]
W, Y0, Y1 = 72, 358, 406
CARDS = [
    ('flesh', 'Ñ', ['Dark Shade', 'Nocturne Skin', 'Red Flesh', 'Evil Flesh', 'Warrior Skin', 'Gnome Flesh', 'Elven Flesh', 'Northern Flesh'], 1),
    ('grey', 'Ñ', ['Purple Black', 'Slate Grey', 'Darkness Grey', 'Blue Mountain', 'Pilgrim Grey', 'Granite Stone', 'Sand Grey', 'Sky Grey'], 9),
    ('red', 'Ñ', ['Dead Purple', 'Crimson Hell', 'Ruby Red', 'Red Purple', 'Demon Red', 'Scarlett Red', 'Orange Rust', 'Sulfide Yellow'], 17),
    ('blue', 'Ñ', ['Kingdom Blue', 'Dragon Blue', 'Thunder Blue', 'Spectral Blue', 'Ghost Blue', 'Spirit Blue', 'Ignis Fatuus', 'Ocean Light'], 25),
    ('green', 'Ñ', ['Woodland Green', 'Forest Green', 'Bestial Green', 'Orc Green', 'Elven Green', 'Army Green', 'Poison Green', 'Snake Fang'], 33),
    ('brown', 'Ñ', ['Mud Brown', 'Chestnut Brown', 'Brutal Brown', 'Leather Brown', 'Earth Brown', 'Desert Brown', 'Yellow Sand', 'Sunny Yellow'], 41),
    ('metal', 'Ö', ['Old Brass', 'Dwarf Shield', 'Copper Coin', 'Runic Gold', 'Golden Shine', 'Heavy Armour', 'Iron Fist', 'Silver Blade'], 49),
    ('ink', 'Ô', ['Asphalt Ink', 'Umber Ink', 'Brown Beast Ink', 'Olive Ink', 'Turquoise Ink', 'Midnight Ink', 'Deep Scarlet Ink', 'Fiery Red Ink'], 57),
]
AUX = [('Sketching White', 'AUX01'), ('Outlining Black', 'AUX02')]
# Antinea's spoons, top to bottom per set photo, as card names (her handles mislabel the Blue set from Ghost Blue on).
SPOON_SETS = [c[2] for c in CARDS[:6]]


def box(im, x0):
    px = im[Y0 + 10:Y1 - 10, x0 + 10:x0 + W - 10].reshape(-1, 3)
    return tuple(int(round(v)) for v in np.median(px, 0))


def rgb2lab(rgb):
    lin = [(c / 255 / 12.92) if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4 for c in rgb]
    r, g, b = lin
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def spoons(pdf):
    """name -> median RGB of the middle of each spoon bowl in Antinea's photos."""
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-j', pdf, os.path.join(tmp, 'n')], check=True)
    out = {}
    for k, names in enumerate(SPOON_SETS):
        im = np.asarray(Image.open(os.path.join(tmp, f'n-{k:03d}.jpg')).convert('RGB')).astype(float)
        lit = im.sum(2) > 90
        rows = np.nonzero(lit.mean(1) > 0.1)[0]
        top, step = rows[0], (rows[-1] - rows[0]) / 8
        for i, name in enumerate(names):
            y0, y1 = int(top + i * step), int(top + (i + 1) * step)
            cols = np.nonzero(lit[y0:y1].mean(0) > 0.3)[0]
            x0, x1 = cols[0], cols[-1]
            bw = (x1 - x0) * 0.38
            hl = lit[y0:y1, x0:x0 + (x1 - x0) // 5].sum(0).mean()
            hr = lit[y0:y1, x1 - (x1 - x0) // 5:x1].sum(0).mean()
            bx0, bx1 = (x0, x0 + bw) if hl > hr else (x1 - bw, x1)
            cy, bh = (y0 + y1) / 2, y1 - y0
            px = im[int(cy - bh * .18):int(cy + bh * .18), int(bx0 + bw * .3):int(bx1 - bw * .3)].reshape(-1, 3)
            out[name] = tuple(np.median(px, 0))
    return out


def main(cards, spoon_pdf):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#Ñ\n' in raw:
        sys.exit('N-Paint already in data.js')
    sp = spoons(spoon_pdf)
    groups, got = {}, {}
    for card, g, names, n0 in CARDS:
        im = np.asarray(Image.open(os.path.join(cards, card + '.png')).convert('RGB')).astype(float)
        for i, (name, x0) in enumerate(zip(names, XS)):
            got[name] = box(im, x0)
            rgb = tuple(int(round(v)) for v in sp[name]) if name in sp else got[name]
            groups.setdefault(g, []).append(f'{name}|NA{n0 + i:02d}|#%02x%02x%02x' % rgb)
    im = np.asarray(Image.open(os.path.join(cards, 'aux.png')).convert('RGB')).astype(float)
    for (name, code), x0 in zip(AUX, AUX_XS):
        groups['Ñ'].append(f'{name}|{code}|#%02x%02x%02x' % box(im, x0))
    block = []
    for g in 'ÑÖÔ':
        block += ['#' + g] + groups[g]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print('added', sum(len(v) for v in groups.values()), 'paints')
    d = sorted(((math.dist(rgb2lab(got[n]), rgb2lab(sp[n])), n) for n in sp), reverse=True)
    print('cards vs spoons dE76: median %.1f' % st.median(x for x, _ in d))
    for x, n in d[:8]:
        print('  %.1f %s' % (x, n))


if __name__ == '__main__':
    main(*sys.argv[1:])

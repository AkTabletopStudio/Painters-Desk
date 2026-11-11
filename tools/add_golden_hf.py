"""Append the rest of the Golden High Flow range to data.js (group 'Ê').

Usage: python3 -I tools/add_golden_hf.py <folder with chart-1.png .. chart-7.png>

Source: screenshots of Golden's own High Flow colour table (owner upload 2026-11-09, copies in project files
data/golden/high-flow/chart-*.png). Each row has a painted stroke swatch drawn over black stripes. The stroke is
sampled from the 55th-85th percentile of lightness among the non-white pixels, which skips the stripes and
the anti-aliased edges, so transparent colours show as a glaze over white. Fluorescent Chartreuse is blown out
in the screenshot (near white), so its swatch comes from Golden's listed Lab (L106 a-33.6 b121, clipped to sRGB).
The other fluorescents are re-sampled the same way from Golden's larger single-colour swatch images
(owner upload 2026-11-09, data/golden/high-flow/swatches/85xx-*.webp), which agree with the table within a few
units. Fluorescent Orange-Yellow (8506) is not in the table screenshots, so it comes only from its swatch image.
The 10 Mixing set colours already in 'Ê' (pigment codes, from the set's swatch card) are left as they are.
Quinacridone / Nickel Azo Gold (8542) is discontinued and left out. Code = Golden product number.
All swatches are estimates of an on-screen chart.
"""
import sys
import numpy as np
from PIL import Image

ROWS = """Primary Yellow|8580
Benzimidazolone Yellow Light|8554
Benzimidazolone Yellow Medium|8553
Nickel Azo Yellow|8534
India Yellow Hue|8508
Diarylide Yellow|8527
Pyrrole Orange|8539
Naphthol Red Light|8532
Pyrrole Red|8582
Primary Magenta|8579
Light Magenta|8514
Naphthol Red Medium|8531
Naphthol Pink|8525
Quinacridone Red|8541
Alizarin Crimson Hue|8521
Quinacridone Magenta|8540
Medium Magenta|8519
Permanent Violet Dark|8536
Dioxazine Purple|8504
Ultramarine Blue|8551
Light Ultramarine Blue|8517
Cobalt Blue|8502
Anthraquinone Blue|8522
Prussian Blue Hue|8581
Phthalo Blue (Red Shade)|8576
Phthalo Blue (Green Shade)|8537
Light Phthalo Blue|8515
Cerulean Blue Hue|8526
Primary Cyan|8578
Teal|8547
Turquoise (Phthalo)|8550
Cobalt Turquoise|8503
Phthalo Green (Blue Shade)|8538
Viridian Green Hue|8586
Phthalo Green (Yellow Shade)|8577
Light Phthalo Green|8516
Permanent Green Light|8535
Sap Green Hue|8545
Chromium Oxide Green|8501
Light Green (Yellow Shade)|8587
Green Gold|8528
Titan Green Pale|8583
Titan Buff|8548
Yellow Ochre|8588
Yellow Oxide|8552
Raw Sienna|8543
Titan Mars Pale|8584
Titan Violet Pale|8585
Burnt Sienna|8523
Burnt Umber|8500
Raw Umber|8544
Sepia|8546
Carbon Black|8524
Mars Black|8518
Payne's Gray|8575
Titanium White|8549
N5 Neutral Gray|8533
N8 Neutral Gray|8520
Transparent Benzimidazolone Yellow Medium|8555
Transparent Naphthol Red Light|8558
Transparent Quinacridone Red|8561
Transparent Dioxazine Purple|8556
Transparent Phthalo Blue (Green Shade)|8559
Transparent Phthalo Green (Blue Shade)|8560
Transparent Yellow Iron Oxide|8565
Transparent Red Iron Oxide|8563
Transparent Brown Iron Oxide|8562
Transparent Shading Gray|8564
Iridescent Copper (Fine)|8571
Iridescent Bronze (Fine)|8512
Iridescent Gold (Fine)|8572
Iridescent Gold Deep (Fine)|8513
Iridescent Bright Gold (Fine)|8511
Iridescent Pearl (Fine)|8574
Iridescent Silver (Fine)|8573
Interference Gold (Fine)|8509
Interference Blue (Fine)|8510
Fluorescent Chartreuse|8567
Fluorescent Orange|8569
Fluorescent Pink|8570
Fluorescent Magenta|8505
Fluorescent Violet|8507
Fluorescent Blue|8566
Fluorescent Green|8568
Quinacridone / Nickel Azo Gold|8542""".split('\n')
SKIP = {'8542'}
FIXED = {'8567': '#e2f82e'}


def lum(p):
    c = p / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    return c @ [0.2126, 0.7152, 0.0722]


def sample(folder):
    out = []
    for i in range(1, 8):
        a = np.asarray(Image.open(f'{folder}/chart-{i}.png').convert('RGB')).astype(int)
        H = a.shape[0]
        dark = (a[:, 400:3500].sum(2) < 450).mean(1)
        b = [0] + [y for y in range(H) if dark[y] > 0.8] + [H]
        last = None
        for y in b:
            if last is not None and y - last > 60:
                reg = a[last + 10:y - 10, 15:240].reshape(-1, 3)
                p = reg[np.abs(reg - 255).sum(1) > 40]
                L = lum(p)
                lo, hi = np.percentile(L, [55, 85])
                out.append('#%02x%02x%02x' % tuple(np.median(p[(L >= lo) & (L <= hi)], 0).astype(int)))
            last = y
    return out


def swatch(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int).reshape(-1, 3)
    p = a[np.abs(a - 255).sum(1) > 40]
    L = lum(p)
    lo, hi = np.percentile(L, [55, 85])
    return '#%02x%02x%02x' % tuple(np.median(p[(L >= lo) & (L <= hi)], 0).astype(int))


SWATCH = {'8505': 'fluorescent-magenta', '8506': 'fluorescent-orange-yellow', '8507': 'fluorescent-violet',
          '8566': 'fluorescent-blue', '8568': 'fluorescent-green', '8569': 'fluorescent-orange', '8570': 'fluorescent-pink'}


def main(folder):
    hx = sample(folder)
    ROWS.insert(ROWS.index('Fluorescent Pink|8570'), 'Fluorescent Orange-Yellow|8506')
    hx.insert(ROWS.index('Fluorescent Orange-Yellow|8506'), None)
    for c, nm in SWATCH.items():
        FIXED[c] = swatch(f'{folder}/swatches/{c}-{nm}-swatch.webp')
    if len(hx) != len(ROWS):
        sys.exit(f'expected {len(ROWS)} rows, found {len(hx)}')
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '|8580|' in raw:
        sys.exit('High Flow chart colours already in data.js')
    have, g = set(), None
    for l in raw.split('\n'):
        if l.startswith('#'):
            g = l[1:]
        elif g == 'Ê' and l:
            have.add(l.split('|')[0])
    lines = []
    for r, h in zip(ROWS, hx):
        n, c = r.split('|')
        if c in SKIP or n in have:
            continue
        lines.append(f'{n}|{c}|{FIXED.get(c, h)}')
    s = s[:a0] + raw.rstrip('\n') + '\n#Ê\n' + '\n'.join(lines) + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(len(lines), 'added;', len(have), 'already there')


if __name__ == '__main__':
    main(*sys.argv[1:])

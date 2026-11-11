"""Append Golden Heavy Body Acrylics to data.js.

Usage: python3 -I tools/add_golden.py <Golden_Acrylics_Chart.pdf> <FL_ColorSpecs_042224.pdf> <high-flow/swatch-card.png> [check.png]
Needs Pillow, numpy and poppler (pdfimages, pdftotext).

Sources, both sent by the owner 2026-11-06 (copies in project files data/golden/):
- Golden's hand-painted Acrylic Colors chart (c. 2018, #10121): one 300 dpi scan, 3 panels x 5 columns x 8 rows, 116
  Heavy Body colours. Names were read from the chart (below, in chart order) and keep Golden's spellings, such as
  'Turquois (Phthalo)'. Swatches are the median of the paint stroke in each box (pixels clearly off the white card,
  central part of the stroke only), so they are estimates of a scan of hand-painted strokes.
- Golden's Fluid Acrylics colour specifications (Apr 2024): pigments (C.I. names) and measured CIE L*a*b*. The code
  field is the pigment list for colours named in that sheet; colours not in it get no code. The sheet's Lab values are
  used only for Titanium White and Zinc White, which the chart paints half over black card so the stroke can't be
  sampled. Lab is also printed as a check against the chart samples (dE76).
- Golden's High Flow 10-colour mixing set (owner's product photos, data/golden/high-flow/): a swatch card with each
  colour full strength (left half) and thinned (right half), and bottle labels giving the pigments. Swatches are the
  median of the middle of the full-strength half. The Phthalo Green (Yellow Shade) label reads 'PB36' in the photo;
  Golden's spec sheet gives PG36 for that colour, so PG36 is used.
Groups: 'Ë' Heavy Body, 'Ê' High Flow (typed as ink, like other ink-thin acrylics). The Fluids sheet's iridescent, interference and fluorescent colours aren't on the chart and
have no measured colour, so they're left out.
"""
import math, os, re, statistics as st, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw

NAMES = [
    # panel 1
    'Titanate Yellow', 'C.P. Cadmium Yellow Primrose', 'Hansa Yellow Light', 'Bismuth Vanadate Yellow', 'Light Bismuth Yellow',
    'Quinacridone / Nickel Azo Gold', 'Quinacridone Burnt Orange', 'C.P. Cadmium Yellow Dark', 'Diarylide Yellow', 'C.P. Cadmium Orange',
    'C.P. Cadmium Red Dark', 'Pyrrole Red Dark', 'Primary Magenta', 'Light Magenta', 'Naphthol Red Medium',
    'Light Violet', 'Ultramarine Violet', 'Dioxazine Purple', 'Smalt Hue', 'Ultramarine Blue',
    'Cerulean Blue Deep', 'Manganese Blue Hue', 'Azurite Hue', 'Teal', 'Cobalt Teal',
    'Jenkins Green', 'Sap Green Hue', 'Terre Verte Hue', 'Chromium Oxide Green Dark', 'Chromium Oxide Green',
    'Mars Yellow', 'Titan Mars Pale', 'Transparent Red Iron Oxide', 'Red Oxide', 'Violet Oxide',
    'Paynes Gray', 'Graphite Gray', 'Zinc White', 'Titanium White', 'N2 Neutral Gray',
    # panel 2
    'C.P. Cadmium Yellow Light', 'Primary Yellow', 'Benzimidazolone Yellow Light', 'Hansa Yellow Medium', 'Benzimidazolone Yellow Medium',
    'Vat Orange', 'Pyrrole Orange', 'Light Orange', 'C.P. Cadmium Red Light', 'Pyrrole Red Light',
    'Quinacridone Red', 'Alizarin Crimson Hue', 'Quinacridone Crimson', 'Permanent Maroon', 'Quinacridone Magenta',
    'Light Ultramarine Blue', 'Cobalt Blue', 'Cobalt Blue Hue', 'Cerulean Blue, Chromium', 'Anthraquinone Blue',
    'Light Turquois (Phthalo)', 'Turquois (Phthalo)', 'Cobalt Turquois', 'Phthalo Green (Blue Shade)', 'Viridian Green Hue',
    'Light Green (Blue Shade)', 'Light Green (Yellow Shade)', 'Green Gold', 'Titan Green Pale', 'Titan Buff',
    'Titan Violet Pale', 'Burnt Sienna', 'Transparent Brown Iron Oxide', 'Burnt Umber Light', 'Burnt Umber',
    'N3 Neutral Gray', 'N4 Neutral Gray', 'N5 Neutral Gray', 'N6 Neutral Gray', 'N7 Neutral Gray',
    # panel 3
    'Hansa Yellow Opaque', 'C.P. Cadmium Yellow Medium', 'Cadmium Yellow Medium Hue', 'Nickel Azo Yellow', 'Indian Yellow Hue',
    'Quinacridone Red Light', 'Naphthol Red Light', 'Pyrrole Red', 'C.P. Cadmium Red Medium', 'Cadmium Red Medium Hue',
    'Medium Magenta', 'Quinacridone Violet', 'Permanent Violet Dark', 'Cobalt Violet Hue', 'Medium Violet',
    'Prussian Blue Hue', 'Phthalo Blue (Red Shade)', 'Phthalo Blue (Green Shade)', 'Light Phthalo Blue', 'Primary Cyan',
    'Phthalo Green (Yellow Shade)', 'Light Phthalo Green', 'Permanent Green Light', 'Cobalt Green', 'Hookers Green Hue',
    'Naples Yellow Hue', 'Yellow Ochre', 'Yellow Oxide', 'Transparent Yellow Iron Oxide', 'Raw Sienna',
    'Raw Umber', 'Van Dyke Brown Hue', 'Carbon Black', 'Mars Black', 'Bone Black',
    'N8 Neutral Gray',
]
# Spec-sheet spellings that differ from the chart.
ALIAS = {'Turquoise (Phthalo)': 'Turquois (Phthalo)', 'Cobalt Turquoise': 'Cobalt Turquois', 'Payne’s Gray': 'Paynes Gray',
         'India Yellow Hue': 'Indian Yellow Hue'}
# Box edges in the 7650 x 3300 scan (found from the grey box outlines).
COLS = [88, 559, 1033, 1508, 1982, 2626, 3107, 3592, 4077, 4564, 5173, 5659, 6146, 6637, 7128]
ROWS = [77, 473, 868, 1264, 1660, 2056, 2452, 2855]
BW, BH = 440, 250
WHITES = {'Zinc White', 'Titanium White'}
# High Flow set: name, pigment (bottle label), full-strength half of its swatch on the 3840 px card (x0, y0, x1, y1).
HIGH_FLOW = [('Benzimidazolone Yellow Light', 'PY175', (276, 199, 745, 666)), ('Benzimidazolone Yellow Medium', 'PY154', (1404, 199, 1869, 666)),
             ('Naphthol Red Light', 'PR112', (2670, 203, 3107, 666)), ('Quinacridone Magenta', 'PR122', (258, 1099, 726, 1567)),
             ('Phthalo Blue (Red Shade)', 'PB15:0', (1398, 1099, 1875, 1567)), ('Phthalo Blue (Green Shade)', 'PB15:3', (2646, 1099, 3111, 1567)),
             ('Phthalo Green (Blue Shade)', 'PG7', (258, 2000, 726, 2467)), ('Phthalo Green (Yellow Shade)', 'PG36', (1398, 2000, 1853, 2467)),
             ('Carbon Black', 'PBk7', (2636, 2000, 3121, 2473)), ('Titanium White', 'PW6', (1423, 2896, 2356, 3364))]


def spec(pdf):
    """name -> [pigments, Lab or None] from the Fluids spec sheet's layout text."""
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout.split('\n')
    out, cur = {}, None
    pig = re.compile(r'\bP(?:Bk|Br|[YROVBGW])\d+(?::\d)?(?:\(HR70\))?')
    for l in txt:
        if not l.strip() or l.startswith('COLOR NAME') or l.lstrip().startswith('CLASSIFICATION'):
            continue
        if l[:1].strip():
            cur = ALIAS.get(re.split(r'\s{2,}', l)[0].strip(), re.split(r'\s{2,}', l)[0].strip())
            m = re.search(r'(?:\d+-\d*|N/A)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*$', l)
            out[cur] = [[], tuple(map(float, m.groups())) if m else None]
        if cur:
            out[cur][0] += pig.findall(l)
    return {k: [' / '.join(dict.fromkeys(v[0])), v[1]] for k, v in out.items()}


def lab2rgb(L, a, b):
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    f = lambda t: t ** 3 if t ** 3 > 0.008856 else (t - 16 / 116) / 7.787
    X, Y, Z = 0.95047 * f(fx), f(fy), 1.08883 * f(fz)
    r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z
    g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
    bb = 0.0557 * X - 0.2040 * Y + 1.0570 * Z
    gam = lambda c: 255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)
    return tuple(max(0, min(255, round(gam(c)))) for c in (r, g, bb))


def rgb2lab(rgb):
    lin = [(c / 255 / 12.92) if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4 for c in rgb]
    r, g, b = lin
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def sample(im, x0, y0):
    box = im[y0 + 15:y0 + BH - 15, x0 + 15:x0 + BW - 15]
    paper = np.median(np.concatenate([box[:12].reshape(-1, 3), box[-12:].reshape(-1, 3)]), 0)
    d = np.sqrt(((box - paper) ** 2).sum(2))
    ys, xs = np.nonzero(d > 40)
    if len(ys) < 500:
        ys, xs = np.nonzero(d > 15)
    y1, y2 = np.percentile(ys, [20, 80]).astype(int)
    x1, x2 = np.percentile(xs, [15, 75]).astype(int)  # strokes end in a ridge on the right
    m = d[y1:y2, x1:x2] > 15
    px = box[y1:y2, x1:x2][m]
    return tuple(int(round(v)) for v in np.median(px, 0)), (x0 + 15 + x1, y0 + 15 + y1, x0 + 15 + x2, y0 + 15 + y2)


def high_flow(card):
    im = np.asarray(Image.open(card).convert('RGB')).astype(float)
    out = []
    for name, pig, (x0, y0, x1, y1) in HIGH_FLOW:
        dx, dy = (x1 - x0) // 5, (y1 - y0) // 5
        px = im[y0 + dy:y1 - dy, x0 + dx:x1 - dx].reshape(-1, 3)
        out.append(f'{name}|{pig}|#%02x%02x%02x' % tuple(int(round(v)) for v in np.median(px, 0)))
    return out


def main(chart, specpdf, card, check=None):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#Ë\n' in raw:
        sys.exit('Golden paints already in data.js')
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-j', chart, os.path.join(tmp, 'g')], check=True)
    pim = Image.open(os.path.join(tmp, 'g-000.jpg')).convert('RGB')
    im = np.asarray(pim).astype(float)
    sp = spec(specpdf)
    draw = ImageDraw.Draw(pim) if check else None
    rows, des = [], []
    for i, name in enumerate(NAMES):
        p, r, c = i // 40, (i % 40) // 5, i % 5
        x0, y0 = COLS[p * 5 + c], ROWS[r]
        pig, lab = sp.get(name, ['', None])
        if name in WHITES:
            rgb = lab2rgb(*lab)  # chart paints whites half over black card
        else:
            rgb, rect = sample(im, x0, y0)
            if draw:
                draw.rectangle(rect, outline=(255, 0, 255), width=6)
            if lab:
                des.append((math.dist(rgb2lab(rgb), lab), name))
        rows.append(f'{name}|{pig}|#%02x%02x%02x' % rgb)
    missing = [n for n in sp if n not in NAMES]
    hf = high_flow(card)
    s = s[:a] + raw.rstrip('\n') + '\n#Ë\n' + '\n'.join(rows) + '\n#Ê\n' + '\n'.join(hf) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    if check:
        pim.resize((pim.width // 4, pim.height // 4)).save(check)
    print(f'added {len(rows)} Heavy Body + {len(hf)} High Flow paints; {sum(1 for r in rows if r.split("|")[1])} with pigments')
    print('spec-sheet colours not on chart:', missing)
    if des:
        print('chart vs spec Lab dE76: median %.1f over %d' % (st.median(d for d, _ in des), len(des)))
        for d, n in sorted(des, reverse=True)[:12]:
            print('  %.1f %s' % (d, n))


if __name__ == '__main__':
    main(*sys.argv[1:])

"""Golden Heavy Body: add the missing colours, and optionally re-sample the existing ones (group 'Ë').

Usage: python3 -I tools/add_golden_hb.py <heavy-body swatch folder> [--recolour]

Source: Golden's own product swatch images (owner upload 2026-11-10, project files data/golden/heavy-body/,
named <Golden number>-<colour>-swatch-800.webp / -drawdown-800.webp / -tint-glaze-800.webp).
'swatch' images are a brush stroke over black stripes: the 55th-85th lightness percentile of the non-white
pixels is used, which skips the stripes and the thin edges. Where only a 'drawdown' exists (4640), the rows of the
black bar are dropped and the middle of the paint over white is used. Tint/glaze images are not used.
Added (code = Golden number): 5 colours not on the site, 14 iridescents, 6 interference colours, 8 fluorescents.
Left out: mica flakes, micaceous iron oxide, coarse alumina (texture gels) and 4900 phosphorescent (glows, no colour).
Fluorescent Chartreuse is blown out to pale yellow in the photo, so it uses Golden's listed Lab, as in High Flow.
--recolour replaces the hex of existing 'Ë' paints with their swatch sample (names and codes, so saved keys, stay
the same), except Titanium White and Zinc White, whose white-on-white strokes can't be sampled.
All swatches are estimates of on-screen photos.
"""
import sys, glob, os, re
import numpy as np
from PIL import Image

NEW = {'1006': 'Benzimidazolone Burnt Orange', '1193': 'Isoindolinone Yellow', '1222': 'Naples Yellow Deep',
       '1302': 'Azo Gold', '1579': 'Naphthol Pink',
       '4003': 'Iridescent Bronze (Fine)', '4005': 'Iridescent Copper (Fine)', '4006': 'Iridescent Copper Light (Fine)',
       '4010': 'Iridescent Gold (Fine)', '4012': 'Iridescent Bright Gold (Fine)', '4015': 'Iridescent Gold Deep (Fine)',
       '4020': 'Iridescent Pearl (Fine)', '4025': 'Iridescent Silver (Fine)',
       '4027': 'Iridescent Stainless Steel (Coarse)', '4028': 'Iridescent Stainless Steel (Fine)',
       '4105': 'Iridescent Copper (Coarse)', '4106': 'Iridescent Copper Light (Coarse)',
       '4110': 'Iridescent Gold (Coarse)', '4120': 'Iridescent Pearl (Coarse)',
       '4030': 'Interference Blue (Fine)', '4040': 'Interference Gold (Fine)', '4050': 'Interference Green (Fine)',
       '4055': 'Interference Orange (Fine)', '4060': 'Interference Red (Fine)', '4070': 'Interference Violet (Fine)',
       '4605': 'Fluorescent Blue', '4615': 'Fluorescent Chartreuse', '4620': 'Fluorescent Green',
       '4625': 'Fluorescent Magenta', '4630': 'Fluorescent Orange', '4640': 'Fluorescent Orange-Yellow',
       '4645': 'Fluorescent Pink', '4650': 'Fluorescent Red'}
FIXED = {'4615': '#e2f82e'}
NO_RECOLOUR = {'1380', '1415'}


def lum(p):
    c = p / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    return c @ [0.2126, 0.7152, 0.0722]


def stripe(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int).reshape(-1, 3)
    p = a[np.abs(a - 255).sum(1) > 40]
    L = lum(p)
    lo, hi = np.percentile(L, [55, 85])
    return np.median(p[(L >= lo) & (L <= hi)], 0)


def drawdown(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    a = a[~(a[:, :8].sum(2).mean(1) < 150)].reshape(-1, 3)
    p = a[np.abs(a - 255).sum(1) > 40]
    L = lum(p)
    lo, hi = np.percentile(L, [20, 80])
    return np.median(p[(L >= lo) & (L <= hi)], 0)


def sample(folder):
    out = {}
    for f in sorted(glob.glob(folder + '/*.webp')):
        m = re.match(r'(\d{4})-(.*?)-(swatch|drawdown|tint-glaze)', os.path.basename(f))
        code, name, kind = m.groups()
        if kind == 'tint-glaze' or (code in out and (out[code][2] == 'swatch' or kind == 'drawdown')):
            continue
        c = stripe(f) if kind == 'swatch' else drawdown(f)
        out[code] = (name, '#%02x%02x%02x' % tuple(c.astype(int)), kind)
    return out


def norm(n):
    n = n.lower().replace('’', "'").replace("'", '').replace('napthol', 'naphthol')
    n = re.sub(r'[^a-z0-9]+', '-', n).strip('-').replace('c-p-', '')
    return (n.replace('turquois-', 'turquoise-').replace('turquoisee', 'turquoise')
            .replace('indian-', 'india-').replace('transparent-yellow-iron-oxide', 'transparent-yellow-oxide'))


def main(folder, *flags):
    S = sample(folder)
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '|4605|' in raw:
        sys.exit('Heavy Body additions already in data.js')
    byn = {norm(v[0]): k for k, v in S.items() if k[0] == '1'}
    g, lines, changed = None, [], 0
    for l in raw.split('\n'):
        if l.startswith('#'):
            g = l[1:]
        elif g == 'Ë' and l and '--recolour' in flags:
            n, c, h = l.split('|')
            k = byn.get(norm(n))
            if k and k not in NO_RECOLOUR and S[k][1] != h:
                l = f'{n}|{c}|{S[k][1]}'
                changed += 1
        lines.append(l)
    raw = '\n'.join(lines)
    add = [f'{n}|{c}|{FIXED.get(c, S[c][1])}' for c, n in NEW.items()]
    s = s[:a0] + raw.rstrip('\n') + '\n#Ë\n' + '\n'.join(add) + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(len(add), 'added;', changed, 'recoloured')


if __name__ == '__main__':
    main(*sys.argv[1:])

"""Re-sample Kimera Kolors swatches from Kimera's own colour chart and append the Velvet inks to data.js.

Usage: python3 -I tools/add_kimera_chart.py <chart-300dpi.png> [check.png]
       (render the chart first: pdftoppm -r 300 -png kolors-charts.pdf chart)
Needs Pillow.

Source: "Kimera Kolors Chart" (kolors-charts.pdf, one page), sent by the owner 2026-11-15, with swatches hand-painted
by Maria zur Nedden. Pure Pigments and Signature Blend paints are squares painted full strength at the top and thinned
to transparent below; each swatch is the median of a patch near the top of the square, right of the black coverage
line. Velvet inks are vertical brush strokes, pooled almost black at the very top; each swatch is the median of a
patch in the upper third of the stroke, where the ink's hue shows (White: the top, as it is painted on black).
So every colour is an estimate taken from a scan of hand-painted swatches.

The 33 Pure Pigments ('Ç') and 39 Signature paints ('Ð') already on the site keep their keys; only the colour changes.
Site-only paints not on this chart (Viridian Green, Dioxazine Violet, Cobalt Violet Grey) are left alone.
The 30 Velvet inks are appended as a new group 'Ý' (Velvet Inks), code = the pigments printed under each stroke.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

X0, DX = 349, 251.1          # centre of the first square column and column pitch, 300 dpi render
PURE_TOP = (625, 1163, 1700)
SIG_TOP = (2468, 3123, 3773)
VEL_X = [290, 394, 502, 608, 717, 821, 933, 1042, 1150, 1254, 1362, 1469, 1584, 1693, 1802, 1904, 2017, 2127, 2229,
         2342, 2449, 2554, 2658, 2770, 2879, 2984, 3099, 3204, 3318, 3424]
VEL_Y = (4590, 4640)   # upper third of each stroke, where the hue reads; the pooled top is near black
WHITE_Y = (4505, 4560)  # White is painted on a black card, so only its top is solid white

# Site names, in chart order (row by row). Chart spellings differ for a few: Cobalt Blue Green, Alizarine Crimson,
# Caucasian Skintone, Khaki Brown (leaflet: Kiwi Brown), Pumpskin, Pastel Green (leaflet: Soft Green), Tooth & Nails.
PURE = [
    ['Carbon Black', 'The White', 'Permanent Yellow', 'Cold Yellow', 'Warm Yellow', 'Diarylide Yellow', 'Yellow Oxide',
     'Honey Moon Yellow', 'Dark Ochre', 'Mars Orange', 'Orange', 'Scarlet', 'Toluidine Red'],
    ['Phthalo Green', 'Cobalt Bluegreen', 'Turquoise Deep', 'Phthalo Blue GS', 'Phthalo Blue RS', 'Ultramarine Blue',
     'Indigo', 'Violet', 'Perylene Violet', 'Purple', 'Magenta', 'Alizarin Crimson', 'The Red'],
    ['Emerald Green', 'Oxide Green', 'Oxide Brown Dark', 'Oxide Brown Medium', 'Oxide Brown Light', 'Royal Brown',
     'Red Oxide']]
SIG = [
    ['Caucasian Skin', 'Golden Brown', 'Cartacci Red', 'Samurai Green', 'Kiwi Brown', 'Silver Grey', 'Nature Green',
     'Ground Brown', 'Fallen Grass', 'Sun Ray', 'Morning Sky', 'Cloudy Sky', 'Iron Hue'],
    ['Gold 79', 'Salmon Skin', 'Pink Skin', 'Fuchsia Skin', 'Sea Blue', 'Blue Black', 'Tenebrous Teal', 'Darkness',
     'Deep Rusto', 'Viridian Grim', 'Poison Green', 'Dark Honey', 'Bone Khaki'],
    ['Black Skintone', 'Pale Carmine Red', 'Middle Brown', 'Pumpkin', 'Shiny Skintone', 'Ivory Light',
     'Undead Skintone', 'Dark Mud', 'Soft Green', 'Cold Armour', 'Cherry Wood', 'Peach Skin', 'Tooth and Nails']]
VELVET = [('Red', 'PR170'), ('Yellow', 'PR151'), ('Black', 'PBK7'), ('White', 'PW6'), ('Blue', 'PB15.4'),
          ('Magenta', 'PR122'), ('Rust', 'PY83, PBR25'), ('Rich Gold', 'PBR25, PY83, PY151'),
          ('Green Gold', 'PBR25, PG7, PY151, PY83'), ('Acid Green', 'PB36, PY151'), ('Forest Green', 'PG7, PY151'),
          ('Petroleum', 'PG7, PBR25'), ('Dark Ocean', 'PBK7, PB16'), ('Deep Turquoise', 'PB16'),
          ('Phthalo Green', 'PG7'), ('Tomato', 'PR255, PO34'), ('Flame Orange', 'PR255, PY170'),
          ('Egg Yolk', 'PR170, PR122'), ('Indigo', 'PB60'), ('Violet', 'PV23'), ('Perylene Violet', 'PV29'),
          ('Dark Purple', 'PB60, PR122'), ('Wine', 'PV29, PR170'), ('Carmine', 'PR170, PR122'),
          ('Smoke', 'PBR25, PBK7'), ('Sepia', 'PBK7, PY83, PBR25'), ('Royal Brown', 'PBR25'),
          ('Alizarine Crimson', 'PR179'), ('Leather', 'PR101'), ('Papyrus', 'PBK7, PY82')]
# The chart prints 'PR151' under Velvet Yellow; PR151 isn't a real pigment (PY151 is), kept as printed.


def med(im, x0, y0, x1, y1):
    px = [im.getpixel((x, y)) for x in range(x0, x1, 2) for y in range(y0, y1, 2)]
    return tuple(round(st.median(p[i] for p in px)) for i in range(3))


def hx(c):
    return '#%02x%02x%02x' % c


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    new, boxes = {}, []
    for tops, rows, g in ((PURE_TOP, PURE, 'Ç'), (SIG_TOP, SIG, 'Ð')):
        for top, row in zip(tops, rows):
            for c, n in enumerate(row):
                x = round(X0 + DX * c)
                b = (x - 25, top + 20, x + 70, top + 55)
                new[(g, n)] = hx(med(im, *b))
                boxes.append((g, n, b))
    vel = []
    for (n, pig), x in zip(VELVET, VEL_X):
        y0, y1 = WHITE_Y if n == 'White' else VEL_Y
        b = (x - 12, y0, x + 12, y1)
        vel.append((n, pig, hx(med(im, *b))))
        boxes.append(('Ý', n, b))

    src = open('data.js', encoding='utf-8').read()
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    out, g, old, seen = [], None, {}, set()
    for line in body.split('\n'):
        if line.startswith('#'):
            g = line[1:]
        elif (g, line.split('|')[0]) in new:
            n, code, h = line.split('|')
            old[(g, n)] = h
            seen.add((g, n))
            line = f'{n}|{code}|{new[(g, n)]}'
        out.append(line)
    missing = set(new) - seen
    if missing:
        sys.exit(f'not found in data.js: {sorted(missing)}')
    if '#Ý' in body:
        sys.exit('Velvet group already present')
    out.append('#Ý')
    out += [f'{n}|{pig}|{h}' for n, pig, h in vel]
    open('data.js', 'w', encoding='utf-8').write(head + '\n'.join(out) + tail)
    print(f'resampled {len(seen)}, added {len(vel)} Velvets')

    if len(sys.argv) > 2:   # check sheet: chart crop | old | new
        rows = [(g, n, b) for g, n, b in boxes]
        W, H = 520, 30
        sheet = Image.new('RGB', (W, H * len(rows)), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (g, n, b) in enumerate(rows):
            y = i * H
            crop = im.crop((b[0] - 30, b[1] - 20, b[2] + 30, b[3] + 20)).resize((90, H - 2))
            sheet.paste(crop, (0, y))
            o = old.get((g, n))
            if o:
                d.rectangle((95, y, 145, y + H - 2), fill=o)
            d.rectangle((150, y, 200, y + H - 2), fill=new[(g, n)] if g != 'Ý' else dict((v[0], v[2]) for v in vel)[n])
            d.text((210, y + 9), f'{g} {n}  old {o or "-"}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

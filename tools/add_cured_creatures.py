"""Append Kimera Kolors paints, and the Scale75 Artist paints the site lacks, to data.js.

Usage: python3 -I tools/add_cured_creatures.py <curedcreatures-4.jpg> <-5.jpg> <-6.jpg> <-7.jpg> [check.png]
Needs Pillow.

Source: photos of Cured Creatures' hand-painted paint reference charts (curedcreatures.com, "Paint reference charts
v2"), sent by the owner 2026-11-03. Kimera publishes no colour chart and the sandbox can't reach its site. Each chart
photo has four sheets (2 x 2) sorted by colour family, mixing Kimera, Scale75 Artist and Schmincke paints; each paint
is a square painted full strength at the top and thinned with water below. Names were read from the handwritten
labels (below, with the sheet, row and column of each Kimera square). Swatches are the median of a strip at the top of
the square, where the paint is undiluted, so they are estimates of a photo of hand-painted swatches.
The chart lists pigments for Kimera's Pure Pigments and none for its Signature sets (its own legend says so), which
is how the two groups are split. Kimera paints not on the charts are missing.
Groups: 'Ç' Pure Pigments, 'Ð' Signature Series. Code = series name.
The charts' Scale75 Artist ('S75') paints not already on the site are appended as a second '#0' (Scale75 Artist)
block, code 'Artist'. The 31 Artist paints already on the site match the charts with a median CIE76 delta E of 8.2
(data/curedcreatures/scale75-artist-compare.csv), so those were left alone.
"""
import statistics as st, sys
from PIL import Image, ImageDraw

Q = [(0, 0), (540, 0), (0, 382), (540, 382)]  # sheet origins in each 1080 px photo
# Kimera paints with a pigment listed on the chart (Pure Pigments range).
PURE = {'Ultramarine Blue', 'Phthalo Blue RS', 'Phthalo Blue GS', 'Turquoise Deep', 'Cobalt Bluegreen', 'Oxide Green',
        'Phthalo Green', 'Toluidine Red', 'The Red', 'Alizarin Crimson', 'Magenta', 'Purple', 'Violet', 'Honey Moon Yellow',
        'Yellow Oxide', 'Dark Ochre', 'Cold Yellow', 'Warm Yellow', 'Diarylide Yellow', 'Orange', 'The White', 'Carbon Black',
        'Mars Orange', 'Royal Brown', 'Red Oxide', 'Oxide Brown Light', 'Oxide Brown Medium', 'Oxide Brown Dark'}
# (photo 4-7, sheet 0-3, row 0-1, column 0-7, name)
PAINTS = [(4,0,0,1,'Ultramarine Blue'),(4,0,0,6,'Phthalo Blue RS'),(4,0,0,7,'Phthalo Blue GS'),(4,0,1,2,'Blue Black'),
(4,1,0,0,'Turquoise Deep'),(4,1,0,1,'Tenebrous Teal'),(4,1,0,2,'Sea Blue'),(4,1,0,5,'Cobalt Bluegreen'),(4,1,0,6,'Morning Sky'),(4,1,0,7,'Samurai Green'),
(4,2,0,3,'Nature Green'),(4,2,0,4,'Oxide Green'),(4,2,1,0,'Fallen Grass'),(4,2,1,1,'Viridian Grim'),(4,2,1,3,'Phthalo Green'),
(4,3,0,1,'Soft Green'),
(5,0,0,0,'Toluidine Red'),(5,0,0,3,'The Red'),(5,0,0,4,'Pale Carmine Red'),(5,0,0,5,'Pink Skin'),(5,0,0,6,'Alizarin Crimson'),(5,0,0,7,'Cartacci Red'),(5,0,1,3,'Magenta'),
(5,1,0,2,'Fuchsia Skin'),
(5,2,0,0,'Black Skintone'),(5,2,0,1,'Purple'),(5,2,0,5,'Violet'),(5,2,0,6,'Deep Rusto'),(5,2,1,0,'Undead Skintone'),(5,2,1,1,'Darkness'),(5,2,1,3,'Cobalt Violet Grey'),
(5,3,0,0,'Cold Armour'),(5,3,0,5,'Silver Grey'),
(6,0,0,0,'Honey Moon Yellow'),(6,0,0,1,'Yellow Oxide'),(6,0,0,3,'Kiwi Brown'),(6,0,0,4,'Golden Brown'),(6,0,0,5,'Gold 79'),(6,0,1,0,'Dark Honey'),(6,0,1,1,'Dark Ochre'),(6,0,1,2,'Cherry Wood'),
(6,1,0,2,'Cold Yellow'),(6,1,0,7,'Warm Yellow'),(6,1,1,1,'Diarylide Yellow'),
(6,2,0,0,'Poison Green'),(6,2,0,1,'Sun Ray'),(6,2,0,3,'Ivory Light'),(6,2,0,4,'Shiny Skintone'),(6,2,0,5,'Peach Skin'),
(6,3,0,1,'Orange'),(6,3,0,3,'Salmon Skin'),(6,3,1,0,'Pumpkin'),(6,3,1,2,'Caucasian Skin'),
(7,0,0,0,'The White'),(7,0,0,6,'Carbon Black'),(7,1,0,1,'Iron Hue'),
(7,2,0,0,'Tooth and Nails'),(7,2,0,2,'Cloudy Sky'),(7,2,0,4,'Bone Khaki'),(7,2,0,6,'Ground Brown'),(7,2,1,0,'Dark Mud'),
(7,3,0,0,'Mars Orange'),(7,3,0,1,'Middle Brown'),(7,3,0,3,'Royal Brown'),(7,3,0,4,'Red Oxide'),(7,3,1,1,'Oxide Brown Light'),(7,3,1,4,'Oxide Brown Medium'),(7,3,1,5,'Oxide Brown Dark')]

# Scale75 Artist paints on the charts (same layout).
S75 = [(4,0,0,0,'Oxford Blue'),(4,0,0,2,'Light Ultramarine'),(4,0,0,3,'Dark Prussian Blue'),(4,0,0,4,'Dark Ultramarine'),(4,0,0,5,'Cobalt Blue'),(4,0,1,0,'Prusian Blue'),(4,0,1,1,'Primary Blue'),
(4,1,0,3,'Turquoise'),(4,1,0,4,'Turquoise Blue'),(4,2,0,0,'Lime Green'),(4,2,0,1,'Spring Green'),(4,2,0,2,'Light Moss Green'),(4,2,0,5,'Alizarin Green'),(4,2,0,6,'Moss Green'),(4,2,0,7,'Sap Green'),(4,2,1,2,'Jade Green'),(4,2,1,4,'Emerald Green'),(4,3,0,0,'Pastel Green'),
(5,0,0,1,'Coral Red'),(5,0,0,2,'Primary Red'),(5,0,1,0,'Burgundy Wine Red'),(5,0,1,1,'Crimson'),(5,0,1,2,'Magenta'),(5,1,0,0,'Pale Skin'),(5,1,0,1,'Pink Flesh'),(5,1,0,3,'Pastel Pink'),
(5,2,0,2,'Purple'),(5,2,0,3,'Dark Violet'),(5,2,0,4,'Violet'),(5,2,1,2,'Dark Brown Ochre'),(5,2,1,4,'Pastel Violet'),(5,3,0,1,'Violet Grey'),(5,3,0,2,'Artic Blue'),(5,3,0,3,'Pastel Blue'),(5,3,0,4,'Green Grey'),(5,3,0,6,'Sky Blue'),
(6,0,0,2,'Yellow Ochre'),(6,0,0,6,'Raw Sienna'),(6,0,0,7,'Yellow Oxide'),(6,1,0,0,'Lemon Yellow'),(6,1,0,3,'Primary Yellow'),(6,1,0,5,'Vanilla Yellow'),(6,1,0,6,'Intense Yellow'),(6,1,1,0,'Naples Yellow'),(6,2,0,2,'Vanilla White'),(6,2,0,6,'Golden Flesh'),
(6,3,0,0,'Orange'),(6,3,0,2,'Permanent Orange'),(6,3,1,1,'Light Skin'),(7,0,0,1,'Art White'),(7,0,0,7,'Art Black'),(7,1,0,0,'Pearl Grey'),(7,1,0,2,'Titanium Grey'),
(7,2,0,1,'Off White'),(7,2,0,3,'Buff'),(7,2,0,5,'Cork Brown'),(7,2,0,7,'Wood'),(7,2,1,1,'Raw Umber'),(7,2,1,2,'Earth Green'),(7,2,1,3,'Olive Green'),
(7,3,0,2,'Burnt Sienna'),(7,3,0,5,'Red Ochre'),(7,3,1,0,'Burnt Umber'),(7,3,1,2,'Burnt Skin'),(7,3,1,3,'Burnt Sienna Umber')]


def box(ims, n, q, r, c):
    qx, qy = Q[q]
    im = ims[n]
    y0 = qy + (89 if r == 0 else 246)
    x0 = round(qx + 18 + c * 63.8)
    sp = [a for a, b in spans(ims, n, q, r) if abs(a - x0) < 20]
    if sp:
        x0 = sp[0]
    bg = im.getpixel((qx + 5, y0 + 20))
    frac = lambda y: sum(sum(abs(a - b) for a, b in zip(im.getpixel((x, y)), bg)) > 40 for x in range(x0 + 16, x0 + 48)) / 32
    top = next((y for y in range(y0 - 15, y0 + 10) if frac(y) > 0.8 and frac(y + 1) > 0.8), y0 + 1)
    return x0 + 16, top + 4, x0 + 48, top + 15


def spans(ims, n, q, r):
    """Left and right x of each painted square in a sheet row."""
    qx, qy = Q[q]
    im = ims[n]
    y0 = qy + (89 if r == 0 else 246)
    bg = im.getpixel((qx + 5, y0 + 20))
    ys = range(y0 + 4, y0 + 22)
    col = [sum(sum(abs(a - b) for a, b in zip(im.getpixel((x, y)), bg)) > 18 for y in ys) / len(ys) for x in range(qx, qx + 540)]
    runs, start = [], None
    for i, v in enumerate(col + [0]):
        if v > 0.6 and start is None:
            start = i
        if v <= 0.6 and start is not None:
            if i - start > 35:
                runs.append((qx + start, qx + i))
            start = None
    return runs


def main(paths, check=None):
    ims = {n: Image.open(p).convert('RGB') for n, p in zip((4, 5, 6, 7), paths)}
    for im in ims.values():
        if im.width != 1080:
            sys.exit(f'expected 1080 px wide photos, got {im.size}')
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#Ç\n' in raw:
        sys.exit('Kimera paints already in data.js')
    def sample(lst):
        out = []
        for n, q, r, c, name in lst:
            bx = box(ims, n, q, r, c)
            px = [ims[n].getpixel((x, y)) for x in range(bx[0], bx[2]) for y in range(bx[1], bx[3])]
            out.append((name, '#%02x%02x%02x' % tuple(round(st.median(v)) for v in zip(*px)), n, bx))
        return out
    have, g = set(), None
    for l in raw.split('\n'):
        if l.startswith('#'):
            g = l[1:]
        elif l and g == '0':
            have.add(l.split('|')[0])
    got = sample(PAINTS)
    s75 = [p for p in sample(S75) if p[0] not in have]
    block = []
    for g, code, keep in (('Ç', 'Pure Pigments', True), ('Ð', 'Signature', False)):
        block.append('#' + g)
        block += [f'{nm}|{code}|{h}' for nm, h, _, _ in sorted(got) if (nm in PURE) == keep]
    block += ['#0'] + [f'{nm}|Artist|{h}' for nm, h, _, _ in sorted(s75)]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(got)} Kimera and {len(s75)} Scale75 Artist paints')
    got += s75
    if check:
        sheet = Image.new('RGB', (1600, ((len(got) + 7) // 8) * 140), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (nm, h, n, bx) in enumerate(got):
            x, y = (i % 8) * 200, (i // 8) * 140
            sheet.paste(ims[n].crop((bx[0] - 20, bx[1] - 30, bx[0] + 60, bx[1] + 40)).resize((120, 105)), (x, y))
            d.rectangle((x + 125, y, x + 195, y + 105), fill=h)
            d.text((x, y + 110), nm, fill='black')
        sheet.save(check)


if __name__ == '__main__':
    main(sys.argv[1:5], *sys.argv[5:6])

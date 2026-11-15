"""Append Warcolours Antithesis, Onecoat, Glaze, Metallic, Fluorescent and Gem ranges to data.js.

Usage: python3 -I tools/add_warcolours_more.py <dir with the *-swatch-reference.png files> [check.png]
Needs Pillow.

Source, sent by the owner 2026-11-15 (project folder data/warcolours/): Warcolours' "full swatch reference" sheets,
the same series as the Layer sheet that the owner chose for the Layer range (tools/add_warcolours_layer.py). Flat
swatches use the median of a patch at the centre of each circle; the Metallic and Gem circles are shaded, so their
swatch is the median of the whole inner disc. These are Warcolours' published digital colours, not photos of paint, so
they are estimates. Names follow Warcolours' product names (bottle labels: 'Yellow Glaze', 'Fluorescent Blue').
The Metallic circles (and Onecoat Silver/Gold) have a white shine across the middle, so their swatch is a band
at the left edge. The Glaze sheet repeats the Antithesis colours exactly, so Glazes are sampled from Warcolours'
bottle renders (glaze-bottles.png) instead.
Groups (brand Warcolours): 'Ł' Antithesis (contrast), 'Ń' Onecoat, 'Ő' Transparents (ink type), 'Œ' Inkredible inks,
'Ň' Metallics (MET_G), 'Ō' Fluorescents (fx), 'Ŏ' Gems (ink type), 'Ņ' Glazes (ink type). No product codes, so code
is empty. Pearlescents and the SHADE set are not included.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

RANGES = [
    ('Ł', 'antithesis', [362, 457, 552, 647, 742, 837], [198, 294, 389, 484, 579, 674], 21, False, 'Antithesis {}',
     ['Yellow', 'Ochre', 'Orange', 'Red', 'Blood', 'Purple', 'Elf Flesh', 'Dwarf Flesh', 'Leather', 'Fur', 'Wood', 'Brown',
      'Dead Flesh', 'Olive', 'Khaki', 'Green', 'Goblinoid', 'Dark Green', 'Emerald', 'Water', 'Turquoise', 'Sky', 'Blue',
      'Ultramarine', 'Marine', 'Indigo', 'Violet', 'Pink', 'Ultraviolet', 'Beige', 'Bone', 'Warm Grey', 'Blue Grey',
      'Pale Grey', 'Cool Grey', 'Black']),
    ('Ń', 'onecoat', [336, 468, 600, 732, 864], [245, 377, 509, 641], 29, False, '{}',
     ['White', 'Yellow', 'Orange', 'Red-Orange', 'Red', 'Magenta', 'Pink', 'Purple', 'Violet', 'Blue', 'Baby Blue',
      'Turquoise', 'Green', 'Yellow-Green', 'Ochre', 'Beige', 'Grey', 'Black', 'Silver', 'Gold']),
    ('Ő', 'transparent', [340, 470, 600, 730, 860], [254, 384, 514, 644], 29, True, 'Transparent {}',
     ['Orange', 'Red', 'Brown', 'Ochre', 'Yellow', 'Olive', 'Green', 'Emerald', 'Turquoise', 'Blue', 'Marine', 'Violet',
      'Purple', 'Pink', 'Flesh', 'Cool Grey', 'Warm Grey', 'Blue Grey', 'Black', 'White']),
    ('Œ', 'inkredible', [303, 421, 540, 658, 777, 895], [253, 381, 510, 639], 27, False, '{}',
     ['White', 'Yellow', 'Golden Yellow', 'Orange', 'Scarlet', 'Carmine', 'Magenta', 'Purple Violet', 'Violet',
      'Phthalo Blue', 'Indigo', 'Cyan Blue', 'Turquoise', 'Phthalo Green', 'Sap Green', 'Yellow Green', 'Olive Green',
      'Ochre', 'Burnt Sienna', 'Umber', 'Sepia', 'Black']),
    ('Ň', 'metallic', [403, 501, 599, 697, 795], [192, 290, 388, 486, 585, 683], 22, True, 'Metallic {}',
     ['White', 'Silver', 'Tin', 'Pewter', 'Lead', 'Black Silver', 'Pale Gold', 'Bright Gold', 'Antique Gold', 'Black Gold',
      'Yellow', 'Sand', 'Brown', 'Choco', 'Lemon', 'Green', 'Dark Green', 'Emerald', 'Turquoise', 'Sky', 'Blue',
      'Ultramarine', 'Violet', 'Magenta', 'Crimson', 'Red', 'Copper', 'Dark Copper', 'Black Copper']),
    ('Ō', 'fluorescent', [128, 285, 443, 600, 758, 915, 1073], [449], 37, False, 'Fluorescent {}',
     ['Blue', 'Green', 'Yellow', 'Orange', 'Red', 'Pink', 'Violet']),
    ('Ŏ', 'gem', [412, 599, 787], [356, 558], 46, True, '{} Gem',
     ['Citrine', 'Emerald', 'Turquoise', 'Sapphire', 'Amethyst', 'Ruby']),
]

GLAZE_NAMES = ['Yellow', 'Skin', 'Orange', 'Red', 'Pink', 'Violet', 'Blue', 'Light Blue', 'Undead', 'Olive', 'Khaki',
               'Green', 'Bone', 'Warm Grey', 'Blue Grey', 'Cool Grey', 'Flesh', 'Beige', 'Brown', 'Wood']
GLAZE_BOTTLES = ([(x, 120, 255) for x in (241, 335, 431, 526, 690, 783, 872, 956)] +
                 [(x, 345, 505) for x in (467, 563, 654, 748)] +
                 [(x, 600, 765) for x in (254, 347, 443, 538, 679, 762, 848, 944)])


def main():
    d = sys.argv[1].rstrip('/')
    src = open('data.js', encoding='utf-8').read()
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    out, chk = [], []
    for g, f, xs, ys, r, shaded, fmt, names in RANGES:
        if f'\n#{g}\n' in body:
            sys.exit(f'group {g} already present')
        im = Image.open(f'{d}/{f}-swatch-reference.png').convert('RGB')
        pts = [(x, y) for y in ys for x in xs][:len(names)]
        assert len(pts) == len(names), f
        out.append('#' + g)
        for (x, y), n in zip(pts, names):
            if g == 'Ň' or n in ('Silver', 'Gold'):
                # shaded metal: a band at the left edge, past the white shine in the middle (gems: whole disc)
                px = [im.getpixel((a, b)) for a in range(int(x - r * 0.85), int(x - r * 0.55))
                      for b in range(int(y - r * 0.3), int(y + r * 0.3))]
            else:
                k = r * 0.7 if shaded else r * 0.35
                px = [im.getpixel((a, b)) for a in range(int(x - k), int(x + k) + 1)
                      for b in range(int(y - k), int(y + k) + 1) if (a - x) ** 2 + (b - y) ** 2 <= k * k]
            h = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
            out.append(f'{fmt.format(n)}||{h}')
            chk.append((im.crop((x - r - 4, y - r - 4, x + r + 4, y + r + 4)), h, f'{g} {fmt.format(n)} {h}'))
    # Glazes: the Glaze sheet repeats the Antithesis colours exactly, so they come from Warcolours' bottle renders
    # (glaze-bottles.png) instead: median of the coloured body of each bottle, white label and skull left out.
    im = Image.open(f'{d}/glaze-bottles.png').convert('RGB')
    out.append('#Ņ')
    for (x, y0, y1), n in zip(GLAZE_BOTTLES, GLAZE_NAMES):
        px = [p for p in (im.getpixel((a, b)) for a in range(x - 28, x + 29) for b in range(y0, y1)) if 60 < sum(p) < 690]
        h = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
        out.append(f'{n} Glaze||{h}')
        chk.append((im.crop((x - 40, y0, x + 40, y1)), h, f'Ņ {n} Glaze {h}'))
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(out) + tail)
    print('added', len(chk))
    if len(sys.argv) > 2:
        H = 26
        s = Image.new('RGB', (420, H * len(chk)), 'white')
        dr = ImageDraw.Draw(s)
        for i, (c, h, t) in enumerate(chk):
            s.paste(c.resize((H - 2, H - 2)), (0, i * H))
            dr.rectangle((30, i * H, 80, i * H + H - 2), fill=h)
            dr.text((88, i * H + 7), t, fill='black')
        s.save(sys.argv[2])


if __name__ == '__main__':
    main()

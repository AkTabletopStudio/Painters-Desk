"""Append Army Painter Warpaints Fanatic x John Blanche (Volumes 1-4) to data.js.

Usage: python3 tools/add_john_blanche.py <john-blanche-colours.jpg>
Needs Pillow. The image is Army Painter's 1200x1200 "Brand new colours" promo chart (four rows of
ten hexagons). Swatches are sampled from that image, so they are estimates. Washes are averaged
from the tint (top) and pooled shade (bottom) of their textured hexes; Grim Rust (effects) uses the
rust splatter; metallics use the median of their gradient. The code column carries volume and type.
"""
import statistics as st, sys
from PIL import Image

GROUP = 'C'
VOLS = [
    ['The Darkness', 'Ivory White', 'Moonbeam Yellow', 'Ironclad Grey', 'Blighted Green', 'Banshee Brown',
     'Bloodmoon Red:Speedpaint', 'Warm Skin Shade:Wash', 'Grimdark Shadow:Wash', 'Emperor Gold:Metallic'],
    ['Fiery Vermilion', 'Blanched Berry', 'Sunburst Ochre', 'Midnight Olive', 'Tainted Garden', 'Ruddy Terra',
     'Turnbull Turquoise:Speedpaint', 'Voodoo Shade:Wash', 'Grim Rust:Effects', 'Heavy Metal:Metallic'],
    ['Frostveil', 'Skyshard', 'Moonpetal', 'Ashroot', 'Shadow Thorn', 'Bramble Grove', 'Dewpath', 'Iceborn',
     'Pine Hollow Shade:Wash', 'Nightroot Shade:Wash'],
    ['Emberveil', 'Gladeshard', 'Sunpetal', 'Umberroot', 'Blood Thorn', 'Thicket Grove', 'Rootpath', 'Hearthborn',
     'Grove Hollow Shade:Wash', 'Vineroot Shade:Wash'],
]
XS = [90, 203, 316, 430, 543, 656, 769, 883, 996, 1110]  # hexagon centres in the 1200px chart
YS = [285, 532, 778, 1025]


def med(px):
    return [st.median(c) for c in zip(*px)]


def sample(im, x, y, name, typ):
    band = lambda ys: [im.getpixel((xx, yy)) for xx in range(x - 30, x + 31, 2) for yy in ys]
    top, bot = band(range(y - 52, y - 30, 2)), band(range(y + 34, y + 48, 2))  # above and below the label
    if typ == 'Wash':
        rgb = [(a + b) / 2 for a, b in zip(med(top), med(bot))]
    elif name == 'Grim Rust':
        rgb = med([p for p in (im.getpixel((xx, yy)) for xx in range(x - 50, x + 51) for yy in range(y - 50, y + 51))
                   if p[0] > 150 and p[1] > 70 and p[2] < 60])
    else:
        rgb = med(band(list(range(y - 48, y - 34, 2)) + list(range(y + 34, y + 48, 2))))
    return '#%02x%02x%02x' % tuple(round(c) for c in rgb)


def main(img):
    im = Image.open(img).convert('RGB')
    if im.size != (1200, 1200):
        sys.exit(f'expected the 1200x1200 promo chart, got {im.size}')
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#' + GROUP + '\n' in raw:
        sys.exit('John Blanche paints already in data.js')
    block = ['#' + GROUP]
    for v, (row, y) in enumerate(zip(VOLS, YS), 1):
        for entry, x in zip(row, XS):
            name, _, typ = entry.partition(':')
            block.append(f"{name}|Vol. {v}{' ' + typ if typ else ''}|{sample(im, x, y, name, typ)}")
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(block) - 1} paints')


if __name__ == '__main__':
    main(sys.argv[1])

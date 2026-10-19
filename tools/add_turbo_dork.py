"""Append Turbo Dork (Metallic, TurboShift, ZeniShift) to data.js.

Usage: python3 tools/add_turbo_dork.py <turbo-dork-80-colours.png>
Needs Pillow. The image is Turbo Dork's 1500x1500 "Check out all 80 paint colors" promo: a 10x8 grid of
bottles in alphabetical order, each on a background of the paint's colour (a vertical gradient for
colour-shift paints). Swatches come from the background either side of the bottle, so they are estimates.
For shift paints the two halves of the background are split into two colour clusters and the larger one is
kept, so the wheel shows the paint's main colour, not a muddy average of both ends of the shift.
The code column carries the basecoat Turbo Dork recommends (black, white, coloured or zenithal), from their product pages.
"""
import statistics as st, sys
from PIL import Image

# (name, group, basecoat) in the grid's order. D = Metallic, I = TurboShift, Q = ZeniShift.
PAINTS = [
    ('3D Glasses', 'I', 'black'), ('4D Glasses', 'I', 'black'), ('Absinthe', 'D', 'colored'),
    ('Afterburner', 'I', 'black'), ('All That Glitters', 'D', 'black'), ('Appleseed', 'D', 'colored'),
    ('Bees Knees', 'D', 'colored'), ('Black Ice', 'D', 'black'), ('Blue Raspberry', 'I', 'black'),
    ('Blue Steel', 'D', 'black'),
    ('Box Wine', 'D', 'black'), ('Bubblegum Crisis', 'Q', 'zenithal'), ('Bullion', 'D', 'black'),
    ('Cartridge Family', 'D', 'black'), ('Cloud Nine', 'I', 'black'), ('Cold Open', 'I', 'black'),
    ('Cool Ranch', 'D', 'colored'), ('Crystal Cavern', 'I', 'black'), ('Curacao', 'D', 'colored'),
    ('Cyberia', 'I', 'black'),
    ('Da Ba Dee', 'D', 'colored'), ('Dark Net', 'I', 'black'), ('Dark Ritual', 'I', 'black'),
    ('Death By', 'D', 'black'), ('Dork', 'D', 'colored'), ('Dream On', 'I', 'black'),
    ('Electrum', 'I', 'black'), ('Fae Wylds', 'Q', 'zenithal'), ('Fahrenheit', 'D', 'colored'),
    ('Forrest Flux', 'I', 'black'),
    ('Galaxia', 'I', 'black'), ('Gold Rush', 'D', 'black'), ('Gordian Knot', 'D', 'colored'),
    ('Grave Robber', 'I', 'black'), ('Ground Is Lava', 'I', 'black'), ('Hemogoblin', 'Q', 'zenithal'),
    ('Hotline', 'D', 'colored'), ('Ice To Never', 'I', 'black'), ('Laserface', 'I', 'black'),
    ('Let Them Eat Cake', 'I', 'black'),
    ('Leviathan', 'I', 'black'), ('Life On Mars', 'D', 'black'), ('Lunar Eclipse', 'I', 'black'),
    ('Maguro', 'D', 'colored'), ('Malum Malus', 'D', 'colored'), ('Miami Sunset', 'I', 'black'),
    ('Midnight City', 'Q', 'zenithal'), ('Molten Mantle', 'I', 'black'), ('Motherlode', 'I', 'white'),
    ('Multipass', 'D', 'colored'),
    ('Orange You Glad', 'D', 'colored'), ('Peacock', 'I', 'black'), ('Pearly Gates', 'D', 'white'),
    ('People Eater', 'D', 'colored'), ('Prism Power', 'Q', 'zenithal'), ('Pucker', 'D', 'colored'),
    ('Purl Grey', 'D', 'colored'), ('Radium', 'I', 'black'), ('Rainbow Roll', 'I', 'black'),
    ('Red Queen', 'D', 'colored'),
    ('Redrum', 'D', 'colored'), ('Romeo/Juliet', 'Q', 'zenithal'), ('Sakura', 'D', 'colored'),
    ('Scarab', 'I', 'black'), ('Shell Shocked', 'I', 'black'), ('Shifting Sands', 'I', 'black'),
    ('Silver Fox', 'D', 'black'), ('Six Shooter', 'D', 'black'), ('Skyrat', 'I', 'black'),
    ('Sparkle Motion', 'D', 'black'),
    ('Spicy Meatball', 'D', 'colored'), ('Sugar Rush', 'I', 'black'), ('Summoning Sickness', 'D', 'colored'),
    ('Syringa', 'D', 'colored'), ('Taro', 'D', 'colored'), ('Tinstar', 'D', 'black'),
    ('Turbo', 'D', 'colored'), ('Twin Sons', 'Q', 'zenithal'), ('Two Cents', 'D', 'black'),
    ('Wavelength', 'I', 'black'),
]
CELL = 150


def lab(c):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = map(lin, c)
    x, y, z = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def med(px):
    return tuple(round(st.median(c)) for c in zip(*px))


def sample(im, col, row, shift):
    x0, y0 = col * CELL, row * CELL
    px = [im.getpixel((x0 + x, y0 + y)) for x in [*range(8, 42), *range(108, 142)] for y in range(8, 142)]
    if not shift:
        return med(px)
    # Two-means in Lab, seeded with the top and bottom of the gradient; keep the larger cluster.
    labs = [lab(p) for p in px]
    top = [i for i, _ in enumerate(px) if (i % 134) < 30]
    bot = [i for i, _ in enumerate(px) if (i % 134) > 104]
    cs = [tuple(st.mean(labs[i][k] for i in top) for k in range(3)), tuple(st.mean(labs[i][k] for i in bot) for k in range(3))]
    for _ in range(10):
        groups = [[], []]
        for i, l in enumerate(labs):
            groups[min((0, 1), key=lambda j: sum((l[k] - cs[j][k]) ** 2 for k in range(3)))].append(i)
        cs = [tuple(st.mean(labs[i][k] for i in g) for k in range(3)) if g else cs[j] for j, g in enumerate(groups)]
    big = max(groups, key=len)
    return med([px[i] for i in big])


def main(img):
    im = Image.open(img).convert('RGB')
    if im.size != (1500, 1500):
        sys.exit(f'expected the 1500x1500 80-colour promo, got {im.size}')
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#D\n' in raw or '\nPeople Eater|' in raw:
        sys.exit('Turbo Dork paints already in data.js')
    out = {'D': [], 'I': [], 'Q': []}
    for n, (name, g, base) in enumerate(PAINTS):
        c = sample(im, n % 10, n // 10, g != 'D')
        out[g].append(f'{name}|{base.replace("colored", "coloured").capitalize()} base|#%02x%02x%02x' % c)
    block = [line for g in 'DIQ' for line in ['#' + g, *out[g]]]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(PAINTS)} paints')


if __name__ == '__main__':
    main(sys.argv[1])

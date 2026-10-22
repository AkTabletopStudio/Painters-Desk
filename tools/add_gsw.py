"""Append Green Stuff World paints to data.js.

Usage: python3 -I tools/add_gsw.py <GSW-Acrylic_EN-MaxxFormula.pdf> <GSW-Color-Chart_2025.pdf>
Needs Pillow and poppler (pdftoppm, pdftotext).

Acrylic Colors (group 5) take their codes, names and swatches from GSW's acrylic equivalence chart, where each code
sits in a flat colour cell. Everything else is sampled from GSW's 2025 Color Chart rendered at 220 dpi, on an
8-column grid (10 for Fluor). Names follow the chart; its text is outlined, so they are typed in below. Swatches are
estimates of printed artwork, not of the paints: gradients use the median, wash and intensity inks the darker half,
colour-shift paints the larger of two colour clusters, and splattered acrylic inks only the splatter.
Left out: primers, chrome, auxiliaries/varnishes/mediums, UV resins and liquid pigments.
Groups: 5 Acrylic Colors, 6 Opaque Colors, ! Fluor, + Metallic & Colorshift, ~ Washes & Inks, ^ Dipping Inks, = Acrylic Inks.
"""
import os, re, statistics as st, subprocess, sys, tempfile
from PIL import Image

DPI = 220
OPAQUE = [(4109, 'Firethorn Brown'), (4110, 'Feral Brown'), (4111, 'Granite Grey'), (4112, 'Dead Flush'), (4113, 'Putrid Green'),
          (4114, 'Dark Evergreen'), (4115, 'Blue Base'), (4116, 'Scab Red'), (4117, 'Primaris Red'), (4118, 'Light Tan'),
          (4119, 'Dark Rose Tan'), (4120, 'Blazing Yellow'), (4121, 'Golden Brown'), (4122, 'Orange Peel'), (4123, 'Wilted Green'),
          (4124, 'Pickle Green'), (4125, 'Terror Blue-Grey'), (4126, 'Dark Concrete'), (4127, 'Glazier Blue'), (4128, 'Gypsum White'),
          (4129, 'Khaki Bone'), (4130, 'Donkey Grey'), (4131, 'Mead Violet'), (4132, 'Nightmare Purple')]
FLUOR = [(1760, 'Fluor White'), (1701, 'Fluor Yellow'), (1702, 'Fluor Yellow-Orange'), (1703, 'Fluor Orange'), (1704, 'Fluor Red'),
         (1705, 'Fluor Rose'), (1706, 'Fluor Violet'), (1707, 'Fluor Blue'), (1776, 'Fluor Turquoise'), (1700, 'Fluor Lime')]
METAL = [(1860, 'Gunmetal Grey'), (1861, 'Quicksilver'), (1862, 'Anthrax Metal'), (1863, 'Mystic White'), (1864, 'Sharkfin Blue'),
         (1865, 'Tinmetal Grey'), (1866, 'Dark Elder Bronze'), (1867, 'Gladius Bronze'), (1868, 'Steampunk Copper'), (1869, 'Shiny Gold'),
         (1870, 'El Dorado'), (1871, 'Antique Gold'), (1872, 'Neptunus Blue'), (1873, 'Sirenscale Green'), (1874, 'Caesar Red'),
         (1875, 'Persian Violet'), (1876, 'Aqua Turquoise'), (1877, 'Orchid Purple')]
FILTERS = [(2582, 'Blue Interference'), (2583, 'Purple Interference'), (2584, 'Turquoise Interference'), (2585, 'Green Interference'),
           (2586, 'Gold Interference'), (2587, 'Red Interference')]
SHIFT = [(1552, 'Cobalt Blue'), (1553, 'Mystic Gold'), (1554, 'Storm Surge Green'), (1555, 'Toxic Purple'), (1556, 'Tropical Green'),
         (1557, 'Psychotic Illusions'), (1558, 'Nebula Copper'), (1559, 'Celestial Azure'), (1606, 'Burning Gold'), (1607, 'Martian Green'),
         (1608, 'Red Goblin'), (1609, 'Emerald Getaway'), (1671, 'Royal Burgundy'), (1672, 'Pinky Blue'), (1674, 'Evil Forest'),
         (1727, 'Solar Anomalie'), (1728, 'Darth Blue'), (1729, 'Borealis Green'), (1673, 'Holographic Paint')]
WASH = [(1710, 'Atramentum Black'), (1711, 'Blush Red'), (1712, 'Aether Blue'), (1713, 'Pecatum Flesh'), (1714, 'Vicious Purple'),
        (1715, 'Moss Green'), (1716, 'Andalusian Earth'), (1717, 'Ancient Sepia')]
INTENSITY = [(1720, 'Swamp Brown'), (1721, 'Crimson Magenta'), (1722, 'Viridis Green'), (1723, 'Hydromiel Yellow'), (1724, 'Phoenix Orange'),
             (1725, 'Sanguinem Red'), (1730, 'Opulentus Black'), (1731, 'Sacra Purple'), (1732, 'Tenebris Blue'), (1733, 'Gorgon Dark Green'),
             (1734, 'Walnut Brown'), (1735, 'Sepia Vetus'), (3506, 'OSL White')]
CANDY = [(1726, 'Amber Orange'), (1737, 'Jade Green'), (1738, 'Amethyst Purple'), (1739, 'Sapphire Blue'), (1755, 'Tiger Eye Brown'),
         (1756, 'Ruby Red'), (1757, 'Quartz Magenta'), (1759, 'Citrine Yellow')]
DIPPING = [(4214, 'Papyrus'), (4215, 'Misted Yellow'), (4216, 'Radiant Orange'), (4217, 'Red Cloak'), (4218, 'Garnet Purple'),
           (4219, 'Glorious Magenta'), (4220, 'Green Stone'), (4221, 'Cool Blue'), (4222, 'Dusty Blue'), (4223, 'Zombie'),
           (4224, 'Elfwood Brown'), (4225, 'Skeleton Brown'), (4226, 'Green Ghost'), (4227, 'Hulky Green'), (4228, 'Ork Flesh'),
           (4229, 'Azure'), (4230, 'Indigo Blue'), (4231, 'Nightshade Purple'), (4232, 'Amberglow'), (4233, 'Limelight'),
           (4234, 'Acid Green'), (4235, 'Turquoise Ghost'), (4236, 'Goth Skin'), (4237, 'Burgundy'), (4238, 'Deep Black'),
           (4239, 'Yellow Submarine'), (4240, 'Seraphim Flesh'), (4241, 'Nude Skin'), (4242, 'Blue Glacier'), (4243, 'Violet Hint'),
           (4244, 'Morrow Purple'), (4245, 'Purple Vanity'), (4246, 'Green Shark Skin'), (4247, 'Grey Mist'), (4248, 'Red Opulence'),
           (4249, 'Skull Linen')]
INKS = [(4273, 'Transparent Orange'), (4274, 'Transparent Red'), (4275, 'Transparent Magenta'), (4276, 'Transparent Blue'),
        (4277, 'Transparent Cold Green'), (4278, 'Transparent Warm Green'), (4279, 'Transparent Purple'), (4280, 'Transparent Burgundy'),
        (4281, 'Transparent Yellow'), (4282, 'Transparent Ochre'), (4283, 'Transparent Brown'), (5094, 'Transparent Sepia'),
        (4284, 'Transparent Turquoise'), (4285, 'OSL White'), (4286, 'Black'), (4287, 'Turquoise'), (4288, 'Orange'), (4289, 'Red'),
        (4290, 'Blue'), (4291, 'Light Brown'), (4292, 'Brown'), (4293, 'Green'), (4294, 'Yellow'), (5095, 'Siena'),
        (5096, 'Fluor Yellow'), (5097, 'Fluor Green'), (5098, 'Fluor Orange'), (5099, 'Fluor Magenta')]
# (group, page, row tops at 220 dpi, paints, sampling mode, code suffix); one row per 8 paints (10 for Fluor)
SECTIONS = [('6', 2, [74, 207, 336], OPAQUE, 'stroke', ''),
            ('!', 1, [2956], FLUOR, 'flat', ''),
            ('+', 2, [545, 675, 850], METAL, 'median', ''),
            ('+', 2, [850], FILTERS, 'median', ''),
            ('+', 2, [993, 1136, 1279], SHIFT, 'cluster', ''),
            ('~', 2, [1498], WASH, 'dark', ' Wash'),
            ('~', 2, [1671, 1820], INTENSITY, 'dark', ' Ink'),
            ('~', 2, [1968], CANDY, 'median', ' Ink'),
            ('^', 1, [3378, 3508, 3638, 3767, 3897], DIPPING, 'median', ''),
            ('=', 2, [3369, 3512, 3655, 3799], INKS, 'splat', '')]
FIRST_COL = {'+850': 2}  # Aqua Turquoise and Orchid Purple open the filter row


def render(pdf, dpi, out):
    subprocess.run(['pdftoppm', '-r', str(dpi), '-png', pdf, out], check=True)


def lab(c):
    def f(u):
        u /= 255
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = map(f, c)
    x, y, z = (r * .4124 + g * .3576 + b * .1805) / .9505, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.089
    f2 = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    return 116 * f2(y) - 16, 500 * (f2(x) - f2(y)), 200 * (f2(y) - f2(z))


def med(px):
    return tuple(round(st.median(ch)) for ch in zip(*px))


def swatch(im, x0, y0, w, h, mode):
    # skip the round 'mixing ball' marker in the top-right corner
    px = [im.getpixel((x, y)) for x in range(x0 + 6, x0 + w - 6, 2) for y in range(y0 + 6, y0 + h - 6, 2)
          if not (x > x0 + w - 45 and y < y0 + 40)]
    if mode in ('flat', 'median'):
        return med(px)
    if mode == 'stroke':  # brush stroke on white: drop the white paper
        return med([p for p in px if sum(p) < 690] or px)
    if mode == 'dark':  # white glow fading into the ink: keep the darker half
        px.sort(key=lambda p: lab(p)[0])
        return med(px[:len(px) // 2])
    if mode == 'splat':  # ink splatter on a dark grey card
        bg = med([im.getpixel((x0 + 6 + i, y0 + h - 8)) for i in range(4)])
        keep = [p for p in px if sum(abs(a - b) for a, b in zip(p, bg)) > 60 and sum(p) < 720]
        return med(keep or px)
    if mode == 'cluster':  # colour shift: main colour = larger of two Lab clusters
        L = [lab(p) for p in px]
        c = [L[0], L[-1]]
        for _ in range(10):
            g = [[], []]
            for p, l in zip(px, L):
                g[min((0, 1), key=lambda k: sum((a - b) ** 2 for a, b in zip(l, c[k])))].append((p, l))
            c = [tuple(st.mean(v[1][i] for v in gg) for i in range(3)) if gg else c[k] for k, gg in enumerate(g)]
        return med([p for p, _ in max(g, key=len)])
    raise ValueError(mode)


def acrylics(pdf, tmp):
    """Group 5 from the equivalence chart: code text in the left column, flat colour cell behind it."""
    subprocess.run(['pdftotext', '-bbox', pdf, f'{tmp}/eq.html'], check=True)
    render(pdf, 288, f'{tmp}/eq')
    pages = open(f'{tmp}/eq.html', encoding='utf-8').read().split('<page ')[1:]
    out, k = [], 288 / 72
    for pi, p in enumerate(pages, 1):
        ws = [(float(a), float(b), t) for a, b, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([^<]*)</word>', p)]
        im = Image.open(f'{tmp}/eq-{pi}.png').convert('RGB')
        for x0, y0, t in ws:
            if not (re.fullmatch(r'\d{4}', t) and x0 < 100):
                continue
            name = ' '.join(w[2] for w in sorted((w for w in ws if 105 < w[0] < 215 and y0 - 22 < w[1] < y0 + 4), key=lambda w: (round(w[1]), w[0])))
            if name == 'Cyber Yellow' and t == '1780':
                t = '1781'  # misprint on the equivalence chart; the Color Chart and GSW's shop list it as 1781
            out.append((name.replace('&amp;', '&'), t, med([im.getpixel((int(x * k), int(y * k))) for x in range(32, 58) for y in range(int(y0 - 16), int(y0 - 3))])))
    return out


def main(eq_pdf, chart_pdf):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#5\n' in raw:
        sys.exit('Green Stuff World paints already in data.js')
    with tempfile.TemporaryDirectory() as tmp:
        groups = {'5': acrylics(eq_pdf, tmp)}
        assert len(groups['5']) == 104, len(groups['5'])
        render(chart_pdf, DPI, f'{tmp}/cc')
        pages = {n: Image.open(f'{tmp}/cc-{n}.png').convert('RGB') for n in (1, 2)}
        for g, pg, tops, paints, mode, suf in SECTIONS:
            cols = 10 if g == '!' else 8
            pitch, w = (126.2, 112) if cols == 10 else (158.4, 139)
            first = FIRST_COL.get(f'{g}{tops[0]}', 0)
            for i, (code, name) in enumerate(paints):
                j = i + first
                x0, y0 = round(26 + (j % cols) * pitch), tops[j // cols]
                groups.setdefault(g, []).append((name, f'{code}{suf}', swatch(pages[pg], x0, y0, w, 86, mode)))
    block = []
    for g in ('5', '6', '!', '+', '~', '^', '='):
        block.append('#' + g)
        block += [f'{n}|{c}|#%02x%02x%02x' % h for n, c, h in groups[g]]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print('added', sum(map(len, groups.values())), 'paints:', {g: len(v) for g, v in groups.items()})


if __name__ == '__main__':
    main(*sys.argv[1:3])

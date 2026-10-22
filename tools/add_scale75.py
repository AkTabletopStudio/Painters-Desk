"""Append Scale75 (Scalecolor, Fantasy & Games, Instant Colors, Artist) to data.js.

Usage: python3 tools/add_scale75.py <scalecolor.png> <fantasy-games.png> <instant-colors.png> <artist-sheet.png>
Needs Pillow. Sources (owner's uploads, kept in project files data/scale75/):
  scalecolor.png     Scale75's Scalecolor chart, 828x2200, 5-column grid SC00-SC62
  fantasy-games.png  Scale75's Fantasy & Games chart, 828x1815, 5-column grid SFG00-SFG47
  instant-colors.png Scale75's Instant Colors promo, 1414x991, a flat square per paint (a potion bottle drawn on
                     top, so only a strip down the square's left edge is sampled)
  artist-sheet.png   a Reddit user's hand-painted Scalecolor Artist swatch sheet, 2480x3100, two blobs per paint
                     (thin, then solid); the solid blob is sampled. No product codes on it, so code is 'Artist'.
Swatches are the median of a patch, so they are estimates of printed charts and photos, not of the paints.
SFG37 is printed 'Chink Orange' on the chart; Scale75 renamed it Vulcan Orange (on current bottles).
7 = Scalecolor, 8 = Fantasy & Games, 9 = Instant Colors, 0 = Artist.
"""
import statistics as st, sys
from PIL import Image

SC = ['Black', 'White', 'Nacar', 'Graphite', 'Anthracite Gray', 'Artic Blue', 'Bering Blue', 'Caspian Blue', 'Abyssal Blue', 'White Sands',
      'Tenere Yellow', 'Sahara Yellow', 'Gobi Brown', 'Dubai Brown', 'Kalahari Orange', 'Adriatic Blue', 'Eclipse Grey', 'Pale Skin', 'Light Skin', 'Golden Skin',
      'Basic Flesh', 'Pink Flesh', 'Arabic Shadow', 'Indian Shadow', 'African Shadow', 'Birch', 'Sandalwood', 'Iroko', 'Orange Leather', 'Walnut',
      'Red Leather', 'Brown Leather', 'Black Leather', 'Sunset Purple', 'Fuchsia', 'Deep Red', 'Blood Red', 'Antares Red', 'Aldebaran Red', 'Mars Orange',
      'Sol Yellow', 'Black Forest Green', 'Boreal Green', 'Irati Green', 'Sherwood Green', 'Ardennes Green', 'Field Gray', 'Spring Green', 'Fall Green', 'Caribbean Blue',
      'Sky Blue', 'Mediterranean Blue', 'Tesla Blue', 'Cantabric Blue', 'Navy Blue', 'Deep Blue', 'Violet', 'Petroleum Gray', 'Graphene Gray', 'Brown Gray',
      'Rainy Gray', 'Thar Brown', 'Mojave White']
FG = ['Decay Black', 'Purity White', 'Hastur Purple', 'Mayhem Red', 'Baal Crimson', 'Beherit Red', 'Tiamat Orange', 'Ishtar Pink', 'Marduk Yellow', 'Lilith Yellow',
      'Misfits Green', 'Bloodfest Crimson', 'Braineater Azure', 'Undead Flesh', 'Resurrection Flesh', 'Harvester Flesh', 'Hellbound Flesh', 'Moonray Flesh', 'Riff Green', 'Orcish Dermis',
      'Merm Green', 'Greenskin Flesh', 'Surfer Orc Flesh', 'Slimer Green', 'Goblin Flesh', 'Toxic Waste Green', 'Huldra Blue', 'Eldandil Violet', 'Arphen Jade', 'Arianrhod Blue',
      'Amarth Blue', 'Joridyn Turquoise', 'Lendanis Grey', 'Hiril Blue', 'Arbuckles Brown', 'Bosh Chestnut', 'Sharpnel Red', 'Vulcan Orange', 'Cokum Copper', 'Peanut Butter',
      'Blackert Brown', 'Hykey Yellow', 'Necro Grey', 'Despair Green', 'Tindalos Red', 'Rlyeh Grey', 'Innsmouth Blue', 'Miskatonic Grey']
SIN = ['Shadow Black', 'Werewolf Brown', 'Dragon Blood', 'Health Red', 'Love Affair', 'Life Red', 'Ragweed Orange', 'Drain Life', 'Full Healing', 'Estus Yellow',
       'Zucchini Skin', 'Dead Flesh', 'Fairy Blood', 'Zombie Skin', 'Phoenix Feather', 'Human Flesh', 'Undead Dragon', 'Phoenix Egg', 'Paralyze Blue', 'Evil Root',
       'Toad Green', 'Sulfur Yellow', 'Belladonna Green', 'Corrupted Stamina', 'Rotten Pus', 'Acid Green', 'Remove Mana', 'Arcane Purple', 'Elixir Green', 'Replenish Blue',
       'Mana Regeneration', 'Magic Blue', 'Grey Spell', 'Ancestral Blue', 'Grizzly Brown', 'Endurance Brown', 'Rage Brown', 'Frenzy Orange', 'Ogre Brown', 'Salmon Fury',
       'Wild Beast', 'Savage Beige', 'Golem Grey', 'Basilisk Green', 'Demon Brown', 'Dark Kraken', 'Leviathan Blue', 'Spectral Wolf']
# Instant Colors squares: (square left edges, top, bottom, codes) in chart order
SIN_ROWS = [([88, 162, 236, 310], 25, 87, [2, 3, 4, 5]), ([395, 469, 543, 617], 30, 91, [6, 7, 8, 9]),
            ([84, 158, 241, 315, 389, 463, 537, 611], 353, 415, range(10, 18)),
            ([85, 159, 233, 307, 381, 454, 525, 599], 678, 740, range(18, 26)),
            ([796, 870, 944, 1018, 1087, 1161, 1235, 1309], 32, 93, range(26, 34)),
            ([794, 867, 949, 1023, 1097, 1171, 1246, 1320], 354, 416, range(34, 42)),
            ([793, 873, 947, 1021, 1095, 1169, 1243, 1315], 657, 719, [0, 42, 43, 44, 45, 46, 47, 1])]
# Artist sheet: (name, x range of the solid blob, y), in sheet pixels
ART = [('Light Skin', 310, 434, 321), ('Golden Flesh', 310, 434, 415), ('Pink Flesh', 310, 434, 502), ('Magenta', 302, 434, 682),
       ('Purple', 302, 434, 780), ('Pastel Violet', 302, 434, 870), ('Dark Violet', 302, 434, 956), ('Vanilla White', 798, 930, 324),
       ('Vanilla Yellow', 794, 938, 415), ('Primary Yellow', 794, 938, 504), ('Intense Yellow', 787, 930, 597), ('Naples Yellow', 794, 930, 682),
       ('Orange', 787, 922, 873), ('Primary Red', 787, 915, 949), ('Crimson', 849, 922, 1046), ('Artic Blue', 1252, 1383, 313),
       ('Pastel Blue', 1252, 1383, 406), ('Turquoise Blue', 1249, 1380, 499), ('Primary Blue', 1249, 1380, 589), ('Cobalt Blue', 1249, 1383, 677),
       ('Prusian Blue', 1259, 1380, 769), ('Light Ultramarine', 1249, 1383, 863), ('Dark Ultramarine', 1249, 1383, 949), ('Pastel Green', 1752, 1876, 310),
       ('Spring Green', 1748, 1872, 403), ('Sap Green', 1810, 1876, 493), ('Emerald Green', 1748, 1876, 586), ('Light Moss Green', 1736, 1876, 676),
       ('Moss Green', 1736, 1868, 766), ('Olive Green', 1728, 1868, 856), ('Earth Green', 1724, 1868, 946)]


def med(px):
    return '#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px))


def grid(im, s, xs, top, pitch, h, n):
    """Centre patch of each cell of a 5-column chart; xs/top/pitch/h measured on a copy scaled by 1/s."""
    out = []
    for i in range(n):
        x0, y0 = (xs[i % 5] + xs[i % 5 + 1]) / 2 * s, (top + i // 5 * pitch + h / 2) * s
        out.append(med([im.getpixel((int(x0 + dx), int(y0 + dy))) for dx in range(-25, 26, 2) for dy in range(-18, 19, 2)]))
    return out


def artist(im):
    paper = [im.getpixel((x, y)) for x in range(1000, 1100) for y in range(1200, 1300)]
    paper = tuple(st.median(c) for c in zip(*paper))
    out = []
    for name, x0, x1, y in ART:
        for t in (40, 12):  # Vanilla White is barely off the paper
            cols = [x for x in range(x0, x1) if sum(abs(a - b) for a, b in zip(im.getpixel((x, y)), paper)) > t]
            if len(cols) > 30:
                break
        cl = [[cols[0]]]
        for x in cols[1:]:
            (cl[-1].append(x) if x - cl[-1][-1] <= 4 else cl.append([x]))
        c = max(cl[-2:], key=len) if len(cl) > 1 and len(cl[-1]) < 15 else cl[-1]
        a, b = c[0] + (c[-1] - c[0]) // 4, c[-1] - (c[-1] - c[0]) // 4
        out.append((name, med([im.getpixel((x, yy)) for x in range(a, b) for yy in range(y - 12, y + 13)])))
    return out


def main(paths):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#7\n' in raw:
        sys.exit('Scale75 paints already in data.js')
    sc, fg, ins, art = (Image.open(p).convert('RGB') for p in paths)
    for im, size in ((sc, (828, 2200)), (fg, (828, 1815)), (ins, (1414, 991)), (art, (2480, 3100))):
        if im.size != size:
            sys.exit(f'expected a {size} image, got {im.size}')
    block = ['#7'] + [f'{n}|SC{i:02d}|{h}' for i, (n, h) in enumerate(zip(SC, grid(sc, 828 / 753, [20, 163, 306, 449, 592, 735], 148, 141.0, 75, 63)))]
    block += ['#8'] + [f'{n}|SFG{i:02d}|{h}' for i, (n, h) in enumerate(zip(FG, grid(fg, 1, [22, 180, 338, 495, 652, 807], 235, 155.1, 83, 48)))]
    sin = {}
    for lefts, t, bt, codes in SIN_ROWS:
        for x, c in zip(lefts, codes):
            sin[c] = med([ins.getpixel((xx, yy)) for xx in range(x + 2, x + 8) for yy in range(t + 4, bt - 4)])
    block += ['#9'] + [f'{n}|SIN{i:02d}|{sin[i]}' for i, n in enumerate(SIN)]
    block += ['#0'] + [f'{n}|Artist|{h}' for n, h in artist(art)]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(block) - 4} paints')


if __name__ == '__main__':
    main(sys.argv[1:5])

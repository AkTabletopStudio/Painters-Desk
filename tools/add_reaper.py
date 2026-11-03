"""Append Reaper Master Series Paints (Core Colors) to data.js.

Usage: python3 -I tools/add_reaper.py <danbecker-msp-1.png> ... <danbecker-msp-6.png>
Needs Pillow.

Source: six phone screenshots (1284 px wide) of Dan Becker's Reaper MSP swatch chart (danbecker.info), sent by the
owner 2026-11-03, because Reaper publishes no colour chart and the sandbox can't reach reapermini.com. Each paint is a
flat colour bar, three to a row (one triad per row), with an abbreviated name. The chart's colours are its own
estimates, so these swatches are estimates of estimates. Each bar is sampled from a strip at its left end, clear of
the text and the tick marks.
Names are Reaper's full names, expanded from the chart's abbreviations (typed in below).
Groups: '{' Master Series Paints, '}' Metallics (MET_G), '[' Clears & Inks (ink type). Codes '09001'.
Left out: additives (Flow Improver, Brush-on Sealer and Primer, Black Primer, Matte Additive, Slow Dry).
"""
import statistics as st, sys
from PIL import Image

# Rows (triads) on each screenshot, top to bottom.
SHOTS = [
    [(1, 2, 3), (133, 134, 135), (169, 170, 171), (139, 140, 141), (67, 68, 69), (181, 182, 183), (4, 5, 6), (7, 8, 9),
     (190, 191, 192), (31, 32, 33), (154, 155, 156), (58, 59, 60), (121, 122, 123), (142, 143, 144)],
    [(46, 47, 48), (91, 92, 93), (43, 44, 45), (73, 74, 75), (127, 128, 129), (109, 110, 111), (199, 200, 201),
     (202, 203, 204), (70, 71, 72), (160, 161, 162)],
    [(193, 194, 195), (76, 77, 78), (16, 17, 18), (115, 116, 117), (187, 188, 189), (151, 152, 153), (55, 56, 57),
     (19, 20, 21), (79, 80, 81), (118, 119, 120)],
    [(28, 29, 30), (136, 137, 138), (178, 179, 180), (40, 41, 42), (10, 11, 12), (13, 14, 15), (184, 185, 186),
     (145, 146, 147), (157, 158, 159), (175, 176, 177), (166, 167, 168), (34, 35, 36), (82, 83, 84), (148, 149, 150)],
    [(22, 23, 24), (25, 26, 27), (61, 62, 63), (85, 86, 87), (172, 173, 174), (88, 89, 90), (163, 164, 165), (37, 38, 39),
     (49, 50, 51), (52, 53, 54), (205, 206, 207), (100, 101, 102)],
    [(103, 104, 105), (124, 125, 126), (196, 197, 198), (94, 95, 96), (97, 98, 99), (130, 131, 132), (64, 65, 66),
     (112, 113, 114), (208, 209, 210), (211, 212, 213)],
]
NAMES = {
    1: 'Red Brick', 2: 'Deep Red', 3: 'Blood Red', 4: 'Fire Red', 5: 'Phoenix Red', 6: 'Fire Orange', 7: 'Marigold Yellow',
    8: 'Sun Yellow', 9: 'Lemon Yellow', 10: 'Pine Green', 11: 'Leaf Green', 12: 'Pale Green', 13: 'Forest Green',
    14: 'Grass Green', 15: 'Jade Green', 16: 'Sapphire Blue', 17: 'True Blue', 18: 'Sky Blue', 19: 'Midnight Blue',
    20: 'Twilight Blue', 21: 'Snowshadow Blue', 22: 'Nightshade Purple', 23: 'Imperial Purple', 24: 'Amethyst Purple',
    25: 'Burgundy Wine', 26: 'Violet Red', 27: 'Pale Violet Red', 28: 'Muddy Brown', 29: 'Earth Brown', 30: 'Leather Brown',
    31: 'Tanned Leather', 32: 'Amber Gold', 33: 'Golden Blond', 34: 'Muddy Olive', 35: 'Olive Green', 36: 'Pale Olive',
    37: 'Pure Black', 38: 'Rainy Grey', 39: 'Pure White', 40: 'Dark Skin Shadow', 41: 'Dark Skin', 42: 'Dark Skin Highlight',
    43: 'Tanned Shadow', 44: 'Tanned Skin', 45: 'Tanned Highlight', 46: 'Fair Shadow', 47: 'Fair Skin', 48: 'Fair Highlight',
    49: 'Ancient Bronze', 50: 'Antique Gold', 51: 'New Gold', 52: 'Shadowed Steel', 53: 'Honed Steel', 54: 'Polished Silver',
    55: 'Breonne Blue', 56: 'Templar Blue', 57: 'Ashen Blue', 58: 'Aged Bone', 59: 'Bare Bone', 60: 'Polished Bone',
    61: 'Linen White', 62: 'Leather White', 63: 'Ghost White', 64: 'Brown Liner', 65: 'Grey Liner', 66: 'Blue Liner',
    67: 'Rosy Shadow', 68: 'Rosy Skin', 69: 'Rosy Highlight', 70: 'Mahogany Brown', 71: 'Chestnut Brown', 72: 'Rust Brown',
    73: 'Chestnut Gold', 74: 'Palomino Gold', 75: 'Buckskin Pale', 76: 'Deep Ocean', 77: 'Marine Teal', 78: 'Surf Aqua',
    79: 'Deep Amethyst', 80: 'Indigo Sky', 81: 'Pale Indigo', 82: 'Jungle Moss', 83: 'Highland Moss', 84: 'Pale Lichen',
    85: 'Shadowed Stone', 86: 'Stone Grey', 87: 'Weathered Stone', 88: 'Stormy Grey', 89: 'Cloudy Grey', 90: 'Misty Grey',
    91: 'Golden Shadow', 92: 'Golden Skin', 93: 'Golden Highlight', 94: 'Clear Red', 95: 'Clear Yellow', 96: 'Clear Green',
    97: 'Clear Blue', 98: 'Clear Magenta', 99: 'Clear Purple', 100: 'Pearl White', 101: 'Ruby Red', 102: 'Copper Orange',
    103: 'Emerald Green', 104: 'Sparkle Blue', 105: 'Sparkling Amethyst', 109: 'Ruddy Leather', 110: 'Oiled Leather',
    111: 'Burnt Orange', 112: 'Shadow Red', 113: 'Shadow Green', 114: 'Shadow Violet', 115: 'Ritter Blue',
    116: 'Brilliant Blue', 117: 'Cyan Blue', 118: 'Dusky Grape', 119: 'Bruised Purple', 120: 'Faded Purple',
    121: 'Khaki Shadow', 122: 'Terran Khaki', 123: 'Khaki Highlight', 124: 'Adamantium', 125: 'Scorched Metal',
    126: 'Gunmetal Blue', 127: 'Uniform Brown', 128: 'Green Ochre', 129: 'Faded Khaki', 130: 'Clear Orange',
    131: 'Clear Viridian', 132: 'Clear Plum', 133: 'Bloodstain Red', 134: 'Clotted Red', 135: 'Carnage Red',
    136: 'Walnut Brown', 137: 'Blackened Brown', 138: 'Intense Brown', 139: 'Antique Rose', 140: 'Blushing Rose',
    141: 'Porcelain Rose', 142: 'Stained Ivory', 143: 'Yellowed Bone', 144: 'Creamy Ivory', 145: 'Moth Green',
    146: 'Spring Green', 147: 'Lemon Green', 148: 'Ghoul Skin', 149: 'Moldy Skin', 150: 'Bloodless Skin',
    151: 'Steely Blue', 152: 'Military Blue', 153: 'Weathered Blue', 154: 'Dune Shadow', 155: 'Desert Khaki',
    156: 'Desert Sand', 157: 'Olive Shadow', 158: 'Olive Drab', 159: 'Worn Olive', 160: 'Woodstain Brown',
    161: 'Shield Brown', 162: 'Driftwood Brown', 163: 'Dark Elf Shadow', 164: 'Dark Elf Skin', 165: 'Dark Elf Highlight',
    166: 'Shadowed Green', 167: 'Field Green', 168: 'Mist Green', 169: 'Muddy Clay', 170: 'Terracotta', 171: 'Fired Clay',
    172: 'Stormcover Grey', 173: 'Coldstone Grey', 174: 'Icy Grey', 175: 'Swamp Green', 176: 'Military Green',
    177: 'Camouflage Green', 178: 'Cinder Brown', 179: 'Volcanic Brown', 180: 'Ashen Brown', 181: 'Bright Coral',
    182: 'Saffron Sunset', 183: 'Cloud Pink', 184: 'Serpent Shadow', 185: 'Reptilian Green', 186: 'Scaly Highlight',
    187: 'Ultramarine Shadow', 188: 'Ultramarine Blue', 189: 'Ultramarine Highlight', 190: 'Sand Brown', 191: 'Sandy Tan',
    192: 'Sandy Yellow', 193: 'Stormy Sea', 194: 'Cloud Sea', 195: 'Seafoam Blue', 196: 'Aged Pewter', 197: 'Old Bronze',
    198: 'Tarnished Brass', 199: 'Russet Brown', 200: 'Harvest Brown', 201: 'Orange Brown', 202: 'Troll Shadow',
    203: 'Gnoll Brown', 204: 'Half-Orc Highlight', 205: 'Blackened Steel', 206: 'Tarnished Steel', 207: 'Pale Silver',
    208: 'Black Ink', 209: 'Brown Ink', 210: 'Red Ink', 211: 'Green Ink', 212: 'Blue Ink', 213: 'Purple Ink',
}
METAL = {49, 50, 51, 52, 53, 54, 100, 101, 102, 103, 104, 105, 124, 125, 126, 196, 197, 198, 205, 206, 207}
INK = {94, 95, 96, 97, 98, 99, 130, 131, 132, 208, 209, 210, 211, 212, 213}
COLS = (17, 431, 845)  # left edge of each bar, px


def rows(im, want):
    """Top y of each bar row: the first full colour bar, then a fixed pitch measured from the detected bars."""
    tops, start = [], None
    for y in range(150, im.height):
        px = [im.getpixel((x, y)) for x in range(330, 590, 4)]
        on = sum(min(c) < 240 for c in px) / len(px) > 0.6
        if on and start is None:
            start = y
        if not on and start is not None:
            if 90 < y - start < 120:
                tops.append(start)
            start = None
    pitch = st.median(b - a for a, b in zip(tops, tops[1:]) if b - a < 200)
    return [round(tops[0] + k * pitch) for k in range(want)]


def sample(im, x0, y0):
    px = [im.getpixel((x0 + dx, y0 + dy)) for dx in range(6, 32) for dy in range(6, 40)]
    return '#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px))


def main(paths):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#{\n' in raw:
        sys.exit('Reaper paints already in data.js')
    got = {}
    for path, triads in zip(paths, SHOTS):
        im = Image.open(path).convert('RGB')
        if im.width != 1284:
            sys.exit(f'{path}: expected a 1284 px wide screenshot, got {im.size}')
        for top, triad in zip(rows(im, len(triads)), triads):
            for x0, num in zip(COLS, triad):
                got[num] = sample(im, x0, top)
    assert set(got) == set(NAMES), sorted(set(NAMES) ^ set(got))
    block = []
    for g, keep in (('{', lambda n: n not in METAL and n not in INK), ('}', METAL.__contains__), ('[', INK.__contains__)):
        block.append('#' + g)
        block += [f'{NAMES[n]}|09{n:03d}|{got[n]}' for n in sorted(got) if keep(n)]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(got)} paints')


if __name__ == '__main__':
    main(sys.argv[1:7])

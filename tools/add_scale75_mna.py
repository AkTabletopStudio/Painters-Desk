"""Append Scale75 Metal n' Alchemy (SC63-SC78, SC87-SC94) to data.js as group '%'.

Usage: python3 tools/add_scale75_mna.py <metal-n-alchemy-chart.png>
Needs Pillow. The image is Scale75's Metal n' Alchemy leaflet, 2233x1168, with a column of 24 metallic swatches down
the right (code printed in the middle of each). Swatches are the median of the strips either side of the code, so they
are estimates of printed metallics. The same swatches sampled from Scale75's catalogue page agree to within a few RGB
units.
"""
import statistics as st, sys
from PIL import Image

MNA = [('Black Metal', 63), ('Thrash Metal', 64), ('Heavy Metal', 65), ('Speed Metal', 66), ('White Alchemy', 67), ('Cobalt Alchemy', 68),
       ('Emerald Alchemy', 69), ('Amethyst Alchemy', 70), ('Necro Gold', 71), ('Viking Gold', 72), ('Dwarven Gold', 73), ('Elven Gold', 74),
       ('Citrine Alchemy', 75), ('Tourmaline Alchemy', 76), ('Kunzite Alchemy', 77), ('Peridot Alchemy', 78), ('Decayed Metal', 87), ('Old Copper', 88),
       ('Garnet Alchemy', 89), ('Ruby Alchemy', 90), ('Pure Copper', 91), ('Victorian Brass', 92), ('Amber Alchemy', 93), ('Moonstone Alchemy', 94)]
S = 2233 / 2000  # positions below were measured on a 2000px-wide copy


def main(path):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#%\n' in raw:
        sys.exit("Metal n' Alchemy already in data.js")
    im = Image.open(path).convert('RGB')
    if im.size != (2233, 1168):
        sys.exit(f'expected the 2233x1168 leaflet, got {im.size}')
    block = ['#%']
    for k, (name, num) in enumerate(MNA):
        yc = (89 + k * 38.96) * S
        px = [im.getpixel((int(x * S), int(yc + dy))) for x0, x1 in ((1556, 1592), (1658, 1695)) for x in range(x0, x1) for dy in range(-10, 11)]
        block.append(f'{name}|SC{num}|#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px)))
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(block) - 1} paints')


if __name__ == '__main__':
    main(sys.argv[1])

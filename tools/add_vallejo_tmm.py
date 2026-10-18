"""Append Vallejo True Metallic Metal (77.101-77.180) to data.js.

Usage: python3 tools/add_vallejo_tmm.py <tmm-contents-chart.png>
Needs Pillow. The image is Vallejo's 1000x666 "Contents" chart: four bands (Light, Base, Shade,
Airbrush), each two rows of ten brush strokes. Swatches are the median of the stroke around its code
label (text excluded), so they are estimates. The chart misprints 77.140 and 77.160 as 11.140/11.160.
The code column carries the code and its type, e.g. '77.121 Base'.
"""
import statistics as st, sys
from PIL import Image

GROUP = 'L'
NAMES = ['Sterling Silver', 'Radiant Yellow', 'Imperial Gold', 'Ancient Copper', 'Forged Red', 'Ruby Red',
         'Crimson Magenta', 'Amethyst Purple', 'Celestial Violet', 'Ultramarine Blue',
         'Sapphire Blue', 'Hydra Turquoise', 'Beetle Green', 'Dusken Green', 'Amber Green', 'Greenish Gold',
         'Arcane Gold', 'Rusty Metal', 'Aged Metal', 'Obsidian Black']
TYPES = ['Light', 'Base', 'Shade', 'Airbrush']
XS = [round(155 + 84.7 * i) for i in range(10)]  # code label centres
YS = [73, 143, 231, 301, 389, 459, 547, 617]


def sample(im, x, y):
    px = [im.getpixel((xx, yy)) for xx in range(x - 24, x + 25) for yy in [*range(y - 12, y - 8), *range(y + 9, y + 13)]]
    px += [im.getpixel((xx, yy)) for xx in [*range(x - 34, x - 27), *range(x + 28, x + 35)] for yy in range(y - 7, y + 8)]
    return '#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px))


def main(img):
    im = Image.open(img).convert('RGB')
    if im.size != (1000, 666):
        sys.exit(f'expected the 1000x666 contents chart, got {im.size}')
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#' + GROUP + '\n' in raw or '|77.101' in raw:
        sys.exit('True Metallic Metal paints already in data.js')
    block = ['#' + GROUP]
    for t, typ in enumerate(TYPES):
        for i, name in enumerate(NAMES):
            x, y = XS[i % 10], YS[t * 2 + i // 10]
            block.append(f'{name}|77.{101 + t * 20 + i} {typ}|{sample(im, x, y)}')
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(block) - 1} paints')


if __name__ == '__main__':
    main(sys.argv[1])

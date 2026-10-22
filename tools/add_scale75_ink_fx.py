"""Append Scale75 Inktensity (SC79-SC86, SC95-SC102) as group '*' and FX Fluor (SFX00-SFX07) as group '@' to data.js.

Usage: python3 tools/add_scale75_ink_fx.py <inktensity-fx-fluor-catalogue.png>
Needs Pillow. The image is Scale75's 1881x1323 catalogue spread with a list per range: a coloured box with the code
printed in it, then the name. Swatches are the median of the strips either side of the code. They are estimates of
printed boxes: inks are shown at full strength, and print can't reach the fluorescents' brightness.
"""
import statistics as st, sys
from PIL import Image

INK = [('Inktense Black', 79), ('Inktense Wood', 80), ('Inktense Chestnut', 81), ('Inktense Violet', 82), ('Inktense Blue', 83),
       ('Inktense Green', 84), ('Inktense Red', 85), ('Inktense Yellow', 86), ('Inktense Brown', 95), ('Inktense Crimson', 96),
       ('Inktense Oxide', 97), ('Inktense Ochre', 98), ('Inktense Cyan', 99), ('Inktense Lime', 100), ('Inktense Olive', 101), ('Inktense White', 102)]
FX = ['Brilli White', 'Orange Neon', 'Acid Pink', 'Psychedelic Purple', 'Electric Blue', 'Techno Green', 'Speed Yellow', 'Red Ecstasy']


def main(path):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#*\n' in raw:
        sys.exit('Inktensity already in data.js')
    im = Image.open(path).convert('RGB')
    if im.size != (1881, 1323):
        sys.exit(f'expected the 1881x1323 catalogue spread, got {im.size}')

    def col(xs, y0, pitch, n):
        out = []
        for k in range(n):
            y = round(y0 + k * pitch)
            px = [im.getpixel((x, yy)) for x0, x1 in xs for x in range(x0, x1) for yy in range(y - 8, y + 9)]
            out.append('#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px)))
        return out
    block = ['#*'] + [f'{n}|SC{c}|{h}' for (n, c), h in zip(INK, col([(579, 594), (647, 660)], 670, 35.8, 16))]
    block += ['#@'] + [f'{n}|SFX{i:02d}|{h}' for i, (n, h) in enumerate(zip(FX, col([(1520, 1534), (1588, 1601)], 473, 35.9, 8)))]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(block) - 2} paints')


if __name__ == '__main__':
    main(sys.argv[1])

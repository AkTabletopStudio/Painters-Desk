"""Append Tamiya (XF, X, AS, PS, TS) to data.js.

Usage: python3 tools/add_tamiya.py <xf.jpg> <x.jpg> <as.jpg> <ps.jpg> <ts.jpg>
Needs Pillow. Each image is a 1200px-wide Tamiya paint chip chart: a 10-column grid of hexagonal chips in
code order. Swatches are the median of a patch near the top of each chip (clear of the printed labels), so
they are estimates of printed chips, not of the paints.
Clears, thinner, flat base and Lame Flake (glitter in clear) are skipped. Names follow the charts, except
XF-80 to XF-90, where the chart's labels disagree with Tamiya's own names (XF-90 is printed 'Purple'), so
Tamiya's names are used. U = XF, h = X, 2 = AS, 3 = PS, 4 = TS.
"""
import statistics as st, sys
from PIL import Image

SKIP = None
XF = ['Flat Black', 'Flat White', 'Flat Yellow', 'Yellow Green', 'Flat Green', 'Copper', 'Flat Red', 'Flat Blue', 'Hull Red', 'Flat Brown',
      'J.N. Green', 'J.N. Gray', 'J.A. Green', 'J.A. Gray', 'Flat Flesh', 'Flat Aluminum', 'Sea Blue', 'Medium Blue', 'Sky Gray', 'Medium Gray',
      'Sky', 'RLM Gray', 'Light Blue', 'Dark Gray', 'Light Sea Gray', 'Deep Green', 'Black Green', 'Dark Copper', 'Khaki', 'Field Blue',
      'Khaki Drab', 'Flat Earth', 'Neutral Gray', 'Dark Sea Gray', 'Deck Tan', 'Metallic Gray', 'Buff', 'Olive Green', 'Desert Yellow', 'Dark Yellow',
      'Dark Green', 'Olive Drab', 'German Gray', 'Red Brown', 'Field Gray', 'Light Gray', 'NATO Green', 'NATO Brown', 'NATO Black', 'Dark Green 2',
      'Cockpit Green (IJN)', 'Brown (JGSDF)', 'Dark Green (JGSDF)', 'Olive Drab (JGSDF)', 'IJN Gray', 'Gray Green', 'IJN Gray (Sasebo Arsenal)', 'Wooden Deck Tan', 'Linoleum Deck Brown', 'Royal Light Gray',
      'Dark Green 2 (RAF)', 'Ocean Gray 2 (RAF)', 'Medium Sea Gray 2 (RAF)', 'Dark Iron', 'Rubber Black', SKIP, 'IJN Gray (Maizuru Arsenal)', 'Dark Yellow 2', 'Dark Green 2', 'Red Brown 2']
XF_NUM = [*range(1, 29), *range(49, 91)]
X = ['Black', 'White', 'Royal Blue', 'Blue', 'Green', 'Orange', 'Red', 'Lemon Yellow', 'Brown', 'Gun Metal',
     'Chrome Silver', 'Gold Leaf', 'Metallic Blue', 'Sky Blue', 'Light Green', 'Purple', 'Pink', 'Semi Gloss Black', 'Smoke', SKIP,
     SKIP, SKIP, 'Clear Blue', 'Clear Yellow', 'Clear Green', 'Clear Orange', 'Clear Red', 'Park Green', 'Titanium Gold', 'Titanium Silver',
     'Bronze', 'Metallic Brown', SKIP]
X_NUM = [*range(1, 29), 31, 32, 33, 34, 35]
AS = ['Dark Green', 'Light Gray (IJN)', 'Gray Green (Luftwaffe)', 'Gray Violet (Luftwaffe)', 'Light Blue (Luftwaffe)', 'Olive Drab (USAF)', 'Neutral Gray (USAF)', 'Navy Blue', 'Dark Green', 'Ocean Gray',
      'Medium Sea Gray', 'Bare Metal Silver', 'Green (USAF)', 'Olive Green (USAF)', 'Tan (USAF)', 'Light Gray', 'Dark Green (IJA)', 'Light Gray (IJA)', 'Intermediate Blue (US Navy)', 'Insignia White (US Navy)',
      'Dark Green 2 (IJN)', 'Dark Earth', 'Light Green (Luftwaffe)', 'Dark Green (Luftwaffe)', 'Dark Ghost Gray', 'Light Ghost Gray', 'Gunship Gray 2', 'Medium Gray', 'Gray Green', 'Dark Green 2 (RAF)',
      'Ocean Gray 2 (RAF)', 'Medium Sea Gray (RAF)']
PS = ['White', 'Red', 'Light Blue', 'Blue', 'Black', 'Yellow', 'Orange', 'Light Green', 'Green', 'Purple',
      'Pink', 'Silver', 'Gold', 'Copper', 'Metallic Red', 'Metallic Blue', 'Metallic Green', 'Metallic Purple', 'Camel Yellow', 'Fluorescent Red',
      'Park Green', 'Racing Green', 'Gun Metal', 'Fluorescent Orange', 'Bright Green', 'Fluorescent Yellow', 'Fluorescent Green', 'Fluorescent Pink', 'Brilliant Blue', 'Smoke',
      'Corsa Gray', 'Cherry Red', 'Bright Red', 'Blue Violet', 'Translucent Silver', 'Translucent Red', 'Translucent Blue', 'Translucent Light Blue', 'Translucent Pink', 'Bright Silver',
      'Translucent Yellow', 'Translucent Orange', 'Translucent Green', 'Translucent Purple', 'Iridescent Purple/Green', 'Iridescent Pink/Gold', 'Metallic Silver (Chrome)', 'Sky Blue Anodized Aluminum', 'Sparkling Pink Anodized Aluminum', 'Purple Anodized Aluminum',
      'Champagne Gold Anodized Aluminum', SKIP, 'Cobalt Green', SKIP, 'Mustard Yellow', 'Pearl White', SKIP, 'Dark Metallic Blue', 'Mica Red', 'Metallic Orange',
      'Pure Orange', 'Bright Gun Metal']
PS_NUM = [*range(1, 26), *range(27, 64)]
TS = ['Red Brown', 'Dark Green', 'Dark Yellow', 'German Gray', 'Olive Drab', 'Matte Black', 'Racing White', 'Italian Red', 'British Green', 'French Blue',
      'Maroon', 'Orange', SKIP, 'Black', 'Blue', 'Yellow', 'Gloss Aluminum', 'Metallic Red', 'Metallic Blue', 'Metallic Green',
      'Gold', 'Light Green', 'Light Blue', 'Purple', 'Pink', 'Pure White', 'Matte White', 'Olive Drab 2', 'Semi Gloss Black', 'Silver Leaf',
      'Bright Orange', 'Haze Gray', 'Dull Red', 'Camel Yellow', 'Park Green', 'Fluorescent Red', 'Lavender', 'Gun Metal', 'Mica Red', 'Metallic Black',
      'Coral Blue', 'Light Gun Metal', 'Racing Green', 'Brilliant Blue', 'Pearl White', 'Light Sand', 'Chrome Yellow', 'Gunship Gray', 'Bright Red', 'Mica Blue',
      'Racing Blue', 'Candy Lime Green', 'Deep Metallic Blue', 'Light Metallic Blue', 'Dark Blue', 'Brilliant Orange', 'Blue Violet', 'Pearl Light Blue', 'Pearl Light Red', 'Pearl Green',
      'NATO Green', 'NATO Brown', 'NATO Black', 'Dark Mica Blue', SKIP, 'IJN Gray (Kure Arsenal)', 'IJN Gray (Sasebo Arsenal)', 'Wooden Deck Tan', 'Linoleum Deck Brown', 'Olive Drab (JGSDF)',
      'Smoke', 'Clear Blue', 'Clear Orange', 'Clear Red', 'Champagne Gold', 'Mica Silver', 'Flat Flesh 2', 'Field Gray 2', SKIP, SKIP,
      'Royal Light Gray', 'Black Rubber', 'Metallic Silver', 'Metallic Gold', 'Bright Mica Red', 'Brilliant Red', 'Titanium Gold', 'Titanium Silver', 'Pearl Blue', 'Brown (JGSDF)',
      'Dark Green (JGSDF)', 'Metallic Orange', 'Pure Blue', 'Metallic Gray', 'Pure Metallic Red', 'Fluorescent Orange', 'Pearl Yellow', 'Pure Orange', 'IJN Gray', 'Semi Gloss Bright Gun Metal',
      'Base White']
# (group, prefix, names, numbers, first chip top y, row pitch)
CHARTS = [('U', 'XF', XF, XF_NUM, 12, 109.7), ('h', 'X', X, X_NUM, 17, 104), ('2', 'AS', AS, range(1, 33), 0, 105),
          ('3', 'PS', PS, PS_NUM, 15, 109.2), ('4', 'TS', TS, range(1, 102), 15, 97.6)]


def sample(im, i, top, pitch):
    x0, y0 = (i % 10) * 120, round(top + (i // 10) * pitch)
    return tuple(round(st.median(c)) for c in zip(*[im.getpixel((x0 + x, y0 + y)) for x in range(18, 56) for y in range(12, 30)]))


def main(paths):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#U\n' in raw:
        sys.exit('Tamiya paints already in data.js')
    block, n = [], 0
    for path, (g, pre, names, nums, top, pitch) in zip(paths, CHARTS):
        im = Image.open(path).convert('RGB')
        if im.width != 1200:
            sys.exit(f'{path}: expected a 1200px-wide chip chart, got {im.size}')
        assert len(names) == len(nums), pre
        block.append('#' + g)
        for i, (name, num) in enumerate(zip(names, nums)):
            if name:
                block.append(f'{name}|{pre}-{num}|#%02x%02x%02x' % sample(im, i, top, pitch))
                n += 1
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {n} paints')


if __name__ == '__main__':
    main(sys.argv[1:6])

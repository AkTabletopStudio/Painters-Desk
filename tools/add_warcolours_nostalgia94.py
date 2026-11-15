"""Append Warcolours Nostalgia Colours (1994 range, 75 paints) to data.js.

Usage: python3 -I tools/add_warcolours_nostalgia94.py <nostalgia-94-chart.png> [check.png]
Needs Pillow.

Source, sent by the owner 2026-11-15 (project folder data/warcolours/): Warcolours' "Nostalgia Colours - 1994 paint
recipe reincarnation" chart: hexagons with a 5-digit code and a name, in three panels (paints, metallics, washes and
glazes). Swatch = median of a patch at the centre of each hexagon; metallic hexagons are shaded left to right, so their
swatch is a band left of centre. Digital colours from the maker: estimates.
Codes were read from a small image. 83305 and 83355 are hard to tell apart: Mithril Silver is taken as 83305 (the only
gap in 83301-83375) and Blue Glaze as 83355. The chart's 'tantacle pink' is written Tentacle Pink; 'bad loona yellow'
and 'boubonic brown' are kept as printed.
Group 'Ś' Nostalgia '94 under Warcolours. Metallics are in MET_K; washes and glazes are typed by name.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [395, 453, 511, 570, 628, 686, 745, 803]
PANELS = [  # (centre y, names in order left to right)
    (73, ['83312 Smelly Primer', '83301 Skull White', '83302 Chaos Black', '83330 Elf Grey', '83346 Cosmic Wolves Grey',
          '83345 Shadow Grey', '83369 Hideous Blue', '83368 Festering Blue']),
    (131, ['83316 Bad Loona Yellow', '83304 Sunburst Yellow', '83335 Golden Yellow', '83308 Fiery Orange',
           '83334 Blood Cherub Red', '83314 Blazing Orange', '83303 Blood Red', '83310 Ruby Red']),
    (190, ['83358 Crimson Gore', '83317 Bleached Bone', '83321 Bronzed Flesh', '83331 Elf Flesh', '83333 Dwarf Flesh',
           '83344 Boubonic Brown', '83360 Vomit Brown', '83323 Leprous Brown']),
    (248, ['83322 Serpentbite Leather', '83327 Vermin Fur', '83326 Bestial Brown', '83365 Emerald Green',
           '83332 Jade Green', '83359 Putrid Green', '83366 Scorpion Green', '83307 Goblin Green']),
    (306, ['83329 Snot Green', '83315 Dark Cherub Green', '83367 Hawk Turquoise', '83325 Lightning Bolt Blue',
           '83320 Enchanted Blue', '83313 Ultramarine Blue', '83311 Regal Blue', '83361 Deadly Nightshade']),
    (364, ['83343 Rotting Flesh', '83363 Tentacle Pink', '83324 Warplock Purple', '83328 Liche Purple',
           '83362 Nauseating Blue']),
    (467, ['83305 Mithril Silver', '83309 Chainmail', '83347 Boltgun Metal', '83370 Burnished Gold', '83306 Shining Gold',
           '83364 Brazen Brass', '83352 Glistening Green', '83348 Polished Blue']),
    (525, ['83351 Beaten Copper', '83349 Dwarf Bronze', '83318 Tin Bitz', '83350 Amethyst Purple']),
    (598, ['83339 Yellow Wash', '83353 Orange Wash', '83319 Red Wash', '83356 Purple Wash', '83338 Blue Wash',
           '83337 Orc Flesh Wash', '83371 Green Wash', '83336 Flesh Wash']),
    (656, ['83341 Chestnut Wash', '83340 Brown Wash', '83342 Armour Wash', '83357 Black Wash', '83354 Yellow Glaze',
           '83372 Red Glaze', '83374 Purple Glaze', '83375 Turquoise Glaze']),
]
GLAZE_ROW = (714, [(570, '83355 Blue Glaze'), (630, '83373 Green Glaze')])
METAL_Y = (467, 525)


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    items = [(x, y, it) for y, names in PANELS for x, it in zip(XS, names)] + [(x, GLAZE_ROW[0], it) for x, it in GLAZE_ROW[1]]
    rows, chk = [], []
    for x, y, it in items:
        code, name = it.split(' ', 1)
        b = (x - 15, y - 4, x - 7, y + 10) if y in METAL_Y else (x - 8, y - 2, x + 8, y + 12)
        px = [im.getpixel((a, c)) for a in range(b[0], b[2]) for c in range(b[1], b[3])]
        h = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
        rows.append(f'{name}|{code}|{h}')
        chk.append((im.crop((x - 26, y - 26, x + 26, y + 26)), h, f'{code} {name} {h}'))
    assert len(rows) == 75 and len({r.split('|')[1] for r in rows}) == 75
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ś\n' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n#Ś\n' + '\n'.join(rows) + tail)
    print('added', len(rows))
    if len(sys.argv) > 2:
        H = 26
        s = Image.new('RGB', (380, H * len(chk)), 'white')
        d = ImageDraw.Draw(s)
        for i, (c, h, t) in enumerate(chk):
            s.paste(c.resize((H - 2, H - 2)), (0, i * H))
            d.rectangle((30, i * H, 80, i * H + H - 2), fill=h)
            d.text((88, i * H + 7), t, fill='black')
        s.save(sys.argv[2])


if __name__ == '__main__':
    main()

"""Add documented Scale75 Scalecolor matches from the Dakka Dakka Paint Range Compatibility Chart to MT in data.js.

Usage: python3 tools/add_scale75_matches.py   (run after tools/add_scale75.py)
Rows were read off the owner's screenshots of the chart (project files data/scale75/dakka/). Each pairs a Scalecolor
paint with the chart's New Citadel, Army Painter and Two Thin Coats paints in the same row; names not on the site are
skipped. Left out as chart errors: Black = Waaagh! Flesh, Petroleum Grey = Leadbelcher, 'Violet Blue' (not a Scale75
paint). Metal n' Alchemy rows are not added because those paints aren't on the site yet. Source letter 'd'.
"""
import json, sys

ROWS = [  # Scalecolor, Citadel, Army Painter, Two Thin Coats
    ('White', 'White Scar', 'Matt White', 'White Star'), ('Pale Skin', 'Kislev Flesh', 'Kobold Skin', 'Elven Skin'),
    ('Sol Yellow', 'Yriel Yellow', None, 'Skulker Yellow'), ('Sahara Yellow', 'Tallarn Sand', 'Desert Yellow', None),
    ('Antares Red', 'Evil Sunz Scarlet', 'Pure Red', 'Demon Red'), ('Indian Shadow', 'Wazdakka Red', 'Dragon Red', 'Evil Eye Red'),
    ('Deep Red', 'Khorne Red', 'Chaotic Red', 'Asmodeus Red'), ('Fuchsia', 'Screamer Pink', None, 'Sword Hilt Burgundy'),
    ('Navy Blue', 'Macragge Blue', 'Dark Sky', 'Marine Blue'), ('Sky Blue', 'Lothern Blue', 'Voidshield Blue', None),
    ('Adriatic Blue', 'Sotek Green', 'Hydra Turquoise', None), ('Irati Green', 'Warpstone Glow', None, 'Emerald Green'),
    ('Ardennes Green', 'Elysian Green', None, None), ('Spring Green', 'Moot Green', None, 'Ethereal Green'),
    ('Boreal Green', 'Castellan Green', None, 'Fury Green'), ('Golden Skin', 'Ushabti Bone', 'Skeleton Bone', 'Skeleton Legion'),
    ('Thar Brown', 'Zandri Dust', None, 'Dragon Fang'), ('White Sands', 'Screaming Skull', None, 'Vampire Fang'),
    ('Kalahari Orange', "Bugman's Glow", 'Tanned Flesh', 'Barbarian Brawn'), ('Iroko', 'Zamesi Desert', None, None),
    ('Mars Orange', 'Skrag Brown', None, 'Dry Rust Brown'), ('Black Leather', 'Rhinox Hide', None, 'Cuirass Leather'),
    ('Arabic Shadow', 'Baneblade Brown', None, 'Wasteland Brown'), ('Gobi Brown', 'Steel Legion Drab', 'Leather Brown', 'Dust Bowl'),
    ('Bering Blue', 'Fenrisian Grey', None, 'Gravestone Blue'), ('Nacar', 'Administratum Grey', 'Ash Grey', 'Carcharodon Grey'),
    ('Artic Blue', 'Dawnstone', 'Uniform Grey', 'Wizard Grey'), ('Anthracite Gray', 'Stormvermin Fur', None, 'Rodent Grey')]
CIT, AP, TTC = set('bslctadp'), set('ACRS'), set('HNOJqzrk')


def main():
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    g, P = 'M', []
    for l in s[a:b].split('\n'):
        if l[:1] == '#':
            g = l[1]
            continue
        n, c, h = l.split('|')
        P.append((g, n))
    m0 = s.index('const MT=') + 9
    m1 = s.index(';', m0)
    MT = json.loads(s[m0:m1])

    def find(name, groups):
        hit = [i for i, (gg, n) in enumerate(P) if gg in groups and n.lower() == name.lower()]
        return hit[0] if hit else None
    added, miss = 0, []
    for sc, *others in ROWS:
        i = find(sc, {'7'})
        assert i is not None, sc
        for name, groups in zip(others, (CIT, AP, TTC)):
            j = name and find(name, groups)
            if name and j is None:
                miss.append(name)
            if j is None:
                continue
            for x, y in ((i, j), (j, i)):
                lst = MT.setdefault(str(x), [])
                if [y, 'd'] not in lst:
                    lst.append([y, 'd'])
            added += 1
    s = s[:m0] + json.dumps(MT, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {added} matches; not on the site: {miss}')


if __name__ == '__main__':
    main()

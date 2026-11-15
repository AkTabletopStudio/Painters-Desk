"""Append Warcolours 'Nostalgia Colours Rackham' (100 paints, codes 001-100) to data.js.

Usage: python3 -I tools/add_warcolours_rackham.py <rackham-chart.png> [check.png]
Needs Pillow.

Source: Warcolours' Nostalgia Colours Rackham product chart (1200 x 800, a 10 x 10 grid of painted blobs, each with
its number badge at bottom right and the English/French name below), sent by the owner 2026-11-15 (project folder
data/warcolours/rackham-chart.png). Swatch = median of a patch in the upper left of each blob, clear of the badge.
Metallic blobs (Polished Silver, Chainmail, Bright Gold, Copper) are shaded with a bright highlight, so their patch is a
band at the blob's left edge, as for the other Warcolours metallics.
So every colour is an estimate from a product image. A second 'complete set' sheet the owner also sent uses CSS named
colours, so it was not used. Group 'Ű' Rackham (Warcolours), code = the chart number.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [394, 436, 478, 520, 563, 604, 646, 688, 732, 774]   # blob left edges
METAL = {'049', '098', '099', '100'}
YS = [258, 313, 362, 412, 458, 507, 552, 600, 647, 693]   # blob top edges
GRID = """003 Abyssal Blue|051 Sea Blue|004 Ephren Blue|052 Solhim Blue|007 Wizard Blue|053 Dark Sky|005 Migol Blue|012 Precious Blue|008 Sacred Blue|009 Glacier Blue
054 Alahan Turquoise|055 Cynwall Turquoise|056 Palladin Turquoise|013 Antique Green|010 Patino Green|019 Chitin Green|057 Aarklash Green|058 Jade Green|059 Fern Green|060 Khidarym Green
018 Disha Green|014 Quithayran Green|061 Leaf Green|015 Mystic Green|062 Toxic Green|050 Mutant Flesh|017 Avagddu Green|016 Chasm Green|063 Larva Green|011 Dead Flesh
020 Dirty Leather|022 Soil of Avagddu|024 Syhar Soil|023 Kallienne Yellow|021 Beastly Leather|029 Tanned Skin|028 Cadwe Skin|030 Craggy Skin|027 Elven Flesh|064 Alahan Flesh
025 Forgotten Gold|065 Alahan Yellow|066 Sand Yellow|026 Parchment Yellow|041 Noesis White|039 Royal Yellow|067 Golden Yellow|040 Lahn Yellow|068 Bright Yellow|069 White Yellow
034 Natural Leather|035 Arkavia Red|073 Toxic Red|036 Rackham Red|074 Bright Red|037 Fusion Red|070 Kelt Orange|038 Merin's Fire|071 Sessair Orange|072 Tir-Na-Bor Orange
075 Yllia Pink|046 Celestial Pink|076 Vile-Tis Pink|033 Fiend Flesh|032 Pink Flesh|077 No-Dan-Kar Purple|078 Tir-Na-Bor Purple|079 Sessair Purple|080 Bran-O-Kor Purple|031 Pearly Flesh
006 Divine Purple|081 Akkylannie Violet|082 Yllia Violet|083 Nefara Violet|084 Acheron Violet|085 Acheron Grey|044 Steel Grey|086 Kamahru Grey|087 Sessair Grey|088 No-Dan-Kar Grey
089 Abyss Grey|045 Grey of Darkness|090 Stone Grey|043 Sharp Grey|091 Ash Grey|092 Wolfen Grey|093 Akkylannie Grey|094 Bran-O-Kor Grey|042 Wildcat Grey|095 Kelt Grey
047 Alchemical Yellow|048 Luminescent Green|096 Luminescent Pink|097 Alchemical Orange|001 Eternal White|049 Polished Silver|100 Chainmail|099 Bright Gold|098 Copper|002 Accursed Black"""


def med(im, b):
    px = [im.getpixel((x, y)) for x in range(b[0], b[2]) for y in range(b[1], b[3])]
    return tuple(round(st.median(p[i] for p in px)) for i in range(3))


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    paints = []
    for ry, row in enumerate(GRID.split('\n')):
        cells = row.split('|')
        assert len(cells) == 10, row
        for cx, cell in enumerate(cells):
            code, name = cell.split(' ', 1)
            x, y = XS[cx], YS[ry]
            b = (x + 2, y + 6, x + 9, y + 26) if code in METAL else (x + 5, y + 5, x + 21, y + 18)
            paints.append((int(code), code, name, '#%02x%02x%02x' % med(im, b), b))
    assert sorted(p[0] for p in paints) == list(range(1, 101))
    paints.sort()

    src = open('data.js', encoding='utf-8').read()
    if '\n#Ű\n' in src:
        sys.exit('Rackham already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ű'] + [f'{n}|{c}|{h}' for _, c, n, h, _ in paints]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(paints))

    if len(sys.argv) > 2:
        W, H = 400, 26
        sheet = Image.new('RGB', (W * 2, H * 50), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (_, c, n, h, b) in enumerate(paints):
            ox, oy = i // 50 * W, i % 50 * H
            sheet.paste(im.crop((b[0] - 5, b[1] - 5, b[0] + 35, b[1] + 30)).resize((H + 8, H - 2)), (ox, oy))
            d.rectangle((ox + 40, oy, ox + 90, oy + H - 2), fill=h)
            d.text((ox + 96, oy + 7), f'{c} {n} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

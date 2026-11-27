"""Append NicPro Model Paint (new brand) to data.js.

Usage: python3 -I tools/add_nicpro.py <nicpro-80-chart.jpg> [check.png]
Needs Pillow.

Source: NicPro's "80 Colors Model Paint" chart (1200 x 1200, glossy paint domes with names, lightfastness and opacity),
sent by the owner 2026-11-27 (data/nicpro/). Swatch = median of a disc in the middle of each dome, leaving out the
brightest pixels (the gloss highlight), so every colour is an estimate from a product image. No product codes are
printed, so the code field is empty. The thinner, varnishes and metallic medium are left out.
Groups: 'Ƒ' Model Paint (67, incl. Gloss Black), 'ƒ' Wash (4), 'Ɠ' Metallic (8, MET_G), 'Ɣ' Special Color (2).
'US Oilve Drab' on the chart is spelled US Olive Drab here.
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

XS = [62, 145, 228, 311, 395, 477, 560, 643, 727, 809, 893, 976, 1060, 1143]
ROWS = [(255, ['White', 'Ivory', 'Pale Grey Blue', 'Pale Green Grey', 'Skin Tone', 'Medium Flesh Tone', 'Buff',
               'Lemon Yellow', 'Medium Yellow', 'Ochre', 'Sunny Skin Tone', 'Orange', 'Vermilion', 'Red']),
        (405, ['Pink', 'Magenta', 'Lavender', 'Purple', 'Royal Purple', 'Dark Prussian Blue', 'Prussian Blue',
               'Navy Blue', 'Ultramarine Blue', 'Cobalt Blue', 'Sky Blue', 'Sunrise Blue', 'Grey Blue', 'Turquoise']),
        (550, ['Emerald Green', 'Lime Green', 'Grass Green', 'Flat Green', 'Olive Green', 'Dark Green', 'Gunship Green',
               'Military Green', 'Black Green', 'US Olive Drab', 'Green Grey', 'Khaki', 'Green Brown', 'Dark Beige']),
        (698, ['Bone White', 'Desert Sand', 'Flat Flesh', 'Leather Brown', 'Earth Brown', 'Cork Brown', 'Orange Brown',
               'Burnt Sienna', 'Saddle Brown', 'Burnt Umber', 'Red Leather', 'Deep Red', 'Gory Red', 'Black Red']),
        (845, ['Deck Tan', 'White Grey', 'Silver Grey', 'Sky Grey', 'Gray', 'Natural Gray', 'German Gray', 'Black',
               'Chocolate Brown', 'Camo Black Brown', 'Flesh Wash', 'Umber Wash', 'Sepia Wash', 'Black Wash'])]
METALS = [(50, 'Metallic Gunmetal'), (123, 'Metallic Chainmail'), (196, 'Metallic Tinny Tin'), (268, 'Metallic Copper'),
          (340, 'Metallic Brass'), (412, 'Metallic Bronze'), (484, 'Metallic Gold'), (556, 'Metallic Silver')]
Y2 = 1035


def sample(im, x, y, r=22):
    px = [im.getpixel((i, j)) for i in range(x - r, x + r) for j in range(y - r, y + r) if (i - x) ** 2 + (j - y) ** 2 < r * r]
    px.sort(key=sum)
    px = px[:int(len(px) * 0.8)]  # drop the gloss highlight
    return '#%02x%02x%02x' % tuple(round(st.median(p[c] for p in px)) for c in range(3))


def main():
    im = Image.open(sys.argv[1]).convert('RGB')
    out = []
    for y, names in ROWS:
        for x, n in zip(XS, names):
            out.append(('ƒ' if n.endswith(' Wash') else 'Ƒ', n, x, y))
    out.append(('Ƒ', 'Gloss Black', 718, Y2))
    out += [('Ɠ', n, x, Y2) for x, n in METALS]
    out += [('Ɣ', 'Orange Rust', 1075, Y2), ('Ɣ', 'Fresh Blood', 1147, Y2)]
    rows = [(g, n, sample(im, x, y), x, y) for g, n, x, y in out]
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ƒ\n' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = []
    for g in 'ƑƒƓƔ':
        lines.append('#' + g)
        lines += [f'{n}||{h}' for gg, n, h, _, _ in rows if gg == g]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(rows))
    if len(sys.argv) > 2:
        sheet = Image.new('RGB', (760, 44 * 43), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (g, n, h, x, y) in enumerate(rows):
            ox, oy = i // 43 * 380, i % 43 * 44
            sheet.paste(im.crop((x - 30, y - 30, x + 30, y + 30)).resize((42, 42)), (ox, oy))
            d.rectangle((ox + 46, oy, ox + 90, oy + 42), fill=h)
            d.text((ox + 96, oy + 15), f'{g} {n} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

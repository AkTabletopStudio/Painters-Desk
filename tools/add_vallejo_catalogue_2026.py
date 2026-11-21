"""Append Vallejo ranges from the Vallejo 2026 catalogue colour charts to data.js.

Usage: python3 -I tools/add_vallejo_catalogue_2026.py <dir> [check.png]
<dir> holds, per chart page N: hN.png (pdftoppm -r 150) and bN.html (pdftotext -bbox) for that page.
Needs Pillow.

Source: Vallejo's 2026 catalogue (Catalogo_2026-R02), sent by the owner 2026-11-21 (data/vallejo/catalogue-2026/).
Pages (whole catalogue numbering): 25 Liquid Metal, 44 Metal Color, 72 Game Air, 90 Hobby Paint sprays,
138 Wash FX, 142 Premium Color. Each swatch colour is the median of the printed swatch at 150 dpi, so every colour
is an estimate from the printed chart. Metallic swatches are shaded, spray swatches are speckled circles and Wash FX
swatches are washes over a sculpted wheel, so those medians are rougher.
Varnishes, primers, mediums and other auxiliary products are left out.
"""
import html, re, statistics as st, sys
from PIL import Image, ImageDraw

S = 150 / 72
# page: (codes regex, swatch box relative to code (x0, y0, xc=code centre), name column (from, to) rel. x0 or xc)
PAGES = {
    25: (r'70\.79\d', lambda x, y, c: (x + 4, y - 30, x + 44, y - 6), (-2, 48, 'x')),
    44: (r'77\.7\d\d', lambda x, y, c: (x - 72, y + 10, x - 14, y + 52), (-2, 160, 'x')),
    72: (r'76\.\d{3}', lambda x, y, c: (x + 4, y - 30, x + 44, y - 6), (-2, 48, 'x')),
    90: (r'28\.0\d\d', lambda x, y, c: (c - 14, y - 52, c + 14, y - 24), (-40, 40, 'c')),
    138: (r'76\.5[0-4]\d', lambda x, y, c: (c - 22, y - 62, c + 22, y - 18), (-45, 45, 'c')),
    # Premium metallic and candy swatches have a light centre: sample their darker right-hand edge.
    142: (r'62\.0[0-5]\d|62\.07\d', lambda x, y, c: (x + 4, y - 30, x + 44, y - 6), (-2, 48, 'x')),
}
EDGE = lambda x, y, c: (x + 34, y - 30, x + 44, y - 6)


def grp(c):
    n = int(c[3:])
    if c.startswith('70.'):
        return 'Ɖ'
    if c.startswith('77.'):
        return 'ƈ'
    if c.startswith('28.'):
        return 'Ƌ'
    if c.startswith('76.'):
        return 'Ɗ' if n >= 500 else 'Ƈ'
    return 'ƌ' if n <= 20 else 'ƍ' if n <= 40 else 'Ǝ' if n <= 53 else 'Ə'


ORDER = 'ƇƈƉƊƋƌƍƎƏ'


def page(d, n, rx, box, col):
    im = Image.open(f'{d}/h{n}.png').convert('RGB')
    words = [(float(a), float(b), float(c), float(e), html.unescape(t)) for a, b, c, e, t in re.findall(
        r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<', open(f'{d}/b{n}.html', encoding='utf-8').read())]
    out = {}
    for x0, y0, x1, y1, t in words:
        if not re.fullmatch(rx, t) or t in out or (n == 25 and y0 > 700):
            continue
        xc = (x0 + x1) / 2
        ref = x0 if col[2] == 'x' else xc
        below = [w for w in words if y0 + 5 < w[1] < y0 + 22 and ref + col[0] <= w[0] < ref + col[1] and not re.fullmatch(r'\d+', w[4])]
        if not below:
            continue
        top = min(w[1] for w in below)
        name = ' '.join(w[4] for w in sorted(w for w in below if abs(w[1] - top) < 2)).split(' / ')[0].strip()
        bx = EDGE if n == 142 and (t >= '62.041') else box
        b = [int(v * S) for v in bx(x0, y0, xc)]
        px = [im.getpixel((i, j)) for i in range(b[0], b[2]) for j in range(b[1], b[3])]
        hx = '#%02x%02x%02x' % tuple(round(st.median(p[k] for p in px)) for k in range(3))
        out[t] = (name, hx, im.crop((b[0] - 8, b[1] - 8, b[2] + 8, b[3] + 8)))
    return out


def main():
    d = sys.argv[1].rstrip('/')
    allp = {}
    for n, (rx, box, col) in PAGES.items():
        got = page(d, n, rx, box, col)
        print(n, len(got))
        allp.update(got)
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ƈ\n' in src:
        sys.exit('already present')
    have = set(re.findall(r'\|(\d\d\.\d{3})[ |]', src))
    codes = sorted((c for c in allp if c not in have), key=lambda c: (ORDER.index(grp(c)), c))
    lines, g = [], None
    for c in codes:
        if grp(c) != g:
            g = grp(c)
            lines.append('#' + g)
        lines.append(f'{allp[c][0]}|{c}|{allp[c][1]}')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(codes), {g: sum(grp(c) == g for c in codes) for g in ORDER}, 'skipped (on site):', sorted(set(allp) & have))
    if len(sys.argv) > 2:
        W, H, R = 380, 30, 50
        sheet = Image.new('RGB', (W * 4, H * R), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, c in enumerate(codes):
            ox, oy = i // R * W, i % R * H
            sheet.paste(allp[c][2].resize((40, H - 2)), (ox, oy))
            dr.rectangle((ox + 44, oy, ox + 84, oy + H - 2), fill=allp[c][1])
            dr.text((ox + 90, oy + 9), f'{c} {allp[c][0]} {allp[c][1]}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

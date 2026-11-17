"""Append Vallejo Squidmar Color (74.201-74.272) to data.js.

Usage: pdftoppm -f 1 -l 1 -r 200 -png CC346-Squidmar-Color.pdf <dir>/hi
       pdftotext -f 1 -l 1 -bbox CC346-Squidmar-Color.pdf <dir>/bbox.html
       python3 -I tools/add_vallejo_squidmar.py <dir> [check.png]
Needs Pillow.

Source: Vallejo's own Squidmar Color chart (CC346, InDesign PDF), sent by the owner 2026-11-17 (project folder
data/vallejo/squidmar/). Each paint is a printed swatch square with its code and English/Spanish names below.
Swatch = median of the middle of the square above each code, at 200 dpi. English name = the words on the line under
the code (curly apostrophes made straight; the chart's 'Ancient ink' / 'Leather ink' capitalised). These are Vallejo's printed chart colours, so estimates. Metallic squares are shaded; their median is a mid tone.
Groups: 'ž' Squidmar Color (74.201-74.248), 'ſ' Squidmar Metallic (74.249-74.255, MET_G),
'ƀ' Squidmar Fluorescent (74.256-74.260, fx), 'Ɓ' Squidmar Ink (74.261-74.272, ink). Code = Vallejo code.
"""
import html, re, statistics as st, sys
from PIL import Image, ImageDraw

S = 200 / 72


def grp(n):
    return 'ž' if n <= 248 else 'ſ' if n <= 255 else 'ƀ' if n <= 260 else 'Ɓ'


def main():
    d = sys.argv[1].rstrip('/')
    im = Image.open(f'{d}/hi-1.png').convert('RGB')
    words = [(float(a), float(b), float(c), float(e), html.unescape(w)) for a, b, c, e, w in
             re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<',
                        open(f'{d}/bbox.html', encoding='utf-8').read())]
    out, crops = [], {}
    for x0, y0, x1, y1, w in words:
        m = re.fullmatch(r'74\.2(\d\d)', w)
        if not m:
            continue
        n = 200 + int(m.group(1))
        # English name: words just below the code, in this column (columns are ~48 pt apart).
        nm = sorted((round(b), a, t) for a, b, c, e, t in words
                    if x0 - 2 <= a < x0 + 44 and 5 < b - y0 < 10)
        name = ' '.join(t for _, _, t in nm).replace('\u2019', "'").replace(' ink', ' Ink')
        b = (int((x0 + 6) * S), int((y0 - 38) * S), int((x0 + 34) * S), int((y0 - 12) * S))
        px = [im.getpixel((x, y)) for x in range(b[0], b[2], 2) for y in range(b[1], b[3], 2)]
        c = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
        out.append((n, name, c))
        crops[n] = im.crop((int((x0 - 2) * S), int((y0 - 48) * S), int((x0 + 46) * S), int((y0 - 2) * S)))
    out.sort()
    assert [o[0] for o in out] == list(range(201, 273)), [o[0] for o in out]
    src = open('data.js', encoding='utf-8').read()
    if '\n#ž\n' in src:
        sys.exit('Squidmar already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines, g = [], None
    for n, name, c in out:
        if grp(n) != g:
            g = grp(n)
            lines.append('#' + g)
        lines.append(f'{name}|74.{n}|{c}')
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(out))
    if len(sys.argv) > 2:
        W, H = 380, 26
        sheet = Image.new('RGB', (W * 2, H * 36), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (n, name, c) in enumerate(out):
            ox, oy = i // 36 * W, i % 36 * H
            sheet.paste(crops[n].resize((H - 2, H - 2)), (ox, oy))
            dr.rectangle((ox + 30, oy, ox + 80, oy + H - 2), fill=c)
            dr.text((ox + 88, oy + 7), f'74.{n} {name} {c}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

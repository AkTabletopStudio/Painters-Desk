"""Append Vallejo Mecha Color (69.xxx) to data.js and link Vallejo's own equivalences.

Usage: pdftoppm -f 1 -l 1 -r 200 -png CC337-Mecha_Color_b.pdf <dir>/hi
       pdftotext -f 1 -l 1 -bbox CC337-Mecha_Color_b.pdf <dir>/bbox.html
       python3 -I tools/add_vallejo_mecha.py <dir> [check.png]
Needs Pillow.

Source: Vallejo's Mecha Color chart (CC337, InDesign PDF), sent by the owner 2026-11-21 (data/vallejo/mecha/). Each
paint is a printed swatch above its code and name. Swatch = median of the middle of that swatch at 200 dpi, so every
colour is an estimate from the printed chart. Metallic swatches are shaded; their median is a mid tone.
Groups: 'Ƃ' Mecha Color 69.001-69.042, 'Ƅ' Mecha Fluorescent 69.054-69.057 (fx), 'ƃ' Mecha Metallic 69.058-69.068
(MET_G), 'ƅ' Mecha Weathering washes 69.505-69.522 (wash), 'Ɔ' Mecha Weathering effects 69.813-69.821 (tech).
Primers 70.640-644, varnishes and auxiliary products are left out.
The chart's "Mecha Color equivalences" table gives a Vallejo equivalent (Model Color / Model Air / Game Color / Model
Wash) and a Mr. Color code for each paint. Those on the site become two-way chart matches in MT, source 'v'
(MSRC 'Vallejo Mecha Color chart'). Mr. Color codes marked * (approximate) and Gundam UG/CG codes are skipped.
"""
import html, json, re, statistics as st, sys
from PIL import Image, ImageDraw

S = 200 / 72
SRC = 'v'
VALLEJO = set('VuifxwYZLÕžſƀƁ')


def grp(c):
    n = int(c[3:])
    return 'Ƃ' if n <= 42 else 'Ƅ' if n <= 57 else 'ƃ' if n <= 68 else 'ƅ' if n < 600 else 'Ɔ'


def main():
    d = sys.argv[1].rstrip('/')
    im = Image.open(f'{d}/hi-1.png').convert('RGB')
    words = [(float(a), float(b), html.unescape(t)) for a, b, t in
             re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([^<]*)<', open(f'{d}/bbox.html', encoding='utf-8').read())]
    out, crops, eq = {}, {}, {}
    for x, y, t in words:
        if not re.fullmatch(r'69\.\d{3}', t) or (x < 420) or (420 < x < 800 and y > 150) or (x > 800 and y > 420):
            continue
        n = int(t[3:])
        if 701 <= n <= 703:
            continue
        name = ' '.join(u for a, b, u in sorted(words) if x - 2 <= a < x + 46 and 5 < b - y < 10)
        b = (int((x + 6) * S), int((y - 20) * S), int((x + 40) * S), int((y - 5) * S))
        px = [im.getpixel((i, j)) for i in range(b[0], b[2], 2) for j in range(b[1], b[3], 2)]
        out[t] = (name, '#%02x%02x%02x' % tuple(round(st.median(p[k] for p in px)) for k in range(3)))
        crops[t] = im.crop((int((x - 2) * S), int((y - 26) * S), int((x + 46) * S), int(y * S)))
    # Equivalence table: rows of  69.xxx  name  <Vallejo code>  <Mr. Color code>, three column groups.
    for x, y, t in words:
        if re.fullmatch(r'69\.\d{3}', t) and 420 < x < 800 and y > 280:
            row = [u for a, b, u in sorted(words) if abs(b - y) < 2 and x + 20 < a < x + 125]
            v = next((u for u in row if re.fullmatch(r'7\d\.\d{3}', u)), None)
            mr = row[-1] if row and re.fullmatch(r'C\d+', row[-1]) else None
            eq[t] = (v, mr)
    codes = sorted(out)
    assert len(codes) == 68, len(codes)
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ƃ\n' in src:
        sys.exit('Mecha Color already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    idx, g, n = {}, None, 0
    for l in body.split('\n'):
        if not l:
            continue
        if l[0] == '#':
            g = l[1:]
            continue
        c = l.split('|')[1]
        if g in VALLEJO:
            idx.setdefault(('V', c), n)
        elif g == '?':
            idx.setdefault(('?', c), n)
        n += 1
    lines, g, mine = [], None, {}
    for c in sorted(codes, key=lambda c: (('ƂƄƃƅƆ').index(grp(c)), c)):
        if grp(c) != g:
            g = grp(c)
            lines.append('#' + g)
        mine[c] = n + len(lines) - len({l for l in lines if l[0] == '#'})
        lines.append(f'{out[c][0]}|{c}|{out[c][1]}')
    src = head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail
    m0 = src.index('const MT=') + 9
    m1 = src.index(';', m0)
    mt = json.loads(src[m0:m1])
    links, missing = 0, []
    for c, (v, mr) in eq.items():
        for k in ([('V', v)] if v else []) + ([('?', 'C-' + mr[1:])] if mr else []):
            j = idx.get(k)
            if j is None:
                missing.append(k[1])
                continue
            for a, b in ((mine[c], j), (j, mine[c])):
                lst = mt.setdefault(str(a), [])
                if not any(e[0] == b for e in lst):
                    lst.append([b, SRC])
            links += 1
    src = src[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + src[m1:]
    open('data.js', 'w', encoding='utf-8').write(src)
    print(f'added {len(codes)}, {links} chart matches; not on site: {sorted(set(missing))}')
    if len(sys.argv) > 2:
        W, H = 420, 26
        sheet = Image.new('RGB', (W * 2, H * 34), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, c in enumerate(sorted(codes)):
            ox, oy = i // 34 * W, i % 34 * H
            sheet.paste(crops[c].resize((H + 10, H - 2)), (ox, oy))
            dr.rectangle((ox + 40, oy, ox + 90, oy + H - 2), fill=out[c][1])
            dr.text((ox + 96, oy + 7), f'{c} {out[c][0]} {out[c][1]}  eq {eq.get(c)}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

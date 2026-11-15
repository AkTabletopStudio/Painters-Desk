"""Append AK Real Colors (lacquer acrylics, RC804-RC980) to data.js as group 'Ź' under AK Interactive.

Usage: pdftoppm -r 200 -png RealColors_Conversion_Chart.pdf <dir>/rcp
       pdftotext -bbox RealColors_Conversion_Chart.pdf <dir>/rc-bbox.html
       python3 -I tools/add_ak_real_colors.py <dir> [check.png]
Needs Pillow.

Source: AK's own "Real Colors Conversion Chart" (akrealcolors.com, InDesign PDF dated April 2024, 7 pages), sent by
the owner 2026-11-15 (project folder data/ak-real-colors-conversion-chart-2024.pdf). Each row's Ref. cell is filled with
the paint's colour. Swatch = median of the cell to the left of the printed code, at 200 dpi. Names are the chart's Name column, read from the PDF text
(several wrap over two lines, so they are joined from word positions).
These are AK's printed fills, not photos of paint. The three varnishes (RC801-803, drawn as grey gradients) are left
out. Code = RC number. The chart also lists Tamiya / Vallejo / Mr. Hobby equivalents (not used here).
"""
import html, re, statistics as st, sys
from PIL import Image, ImageDraw

S = 200 / 72
SKIP = {'RC801', 'RC802', 'RC803'}


def main():
    d = sys.argv[1].rstrip('/')
    pages = open(f'{d}/rc-bbox.html', encoding='utf-8').read().split('<page')[1:]
    out, crops = [], {}
    for pi, pg in enumerate(pages):
        im = Image.open(f'{d}/rcp-{pi + 1}.png').convert('RGB')
        words = [(float(a), float(b), float(c), float(e), html.unescape(w)) for a, b, c, e, w in
                 re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<', pg)]
        for wx0, wy0, wx1, wy1, code in words:
            if not re.fullmatch(r'RC\d{3}', code) or code in SKIP or wx0 > 100:
                continue
            ym = (wy0 + wy1) / 2   # name words: Name column (x 88-185 pt, not the BS/RAL column), within half a row of the code
            nm = sorted((round(b), a, t) for a, b, c, e, t in words if 88 <= a <= 185 and t != "-" and not t.startswith("RAL") and abs((b + e) / 2 - ym) < 11)
            name = ' '.join(t for _, _, t in nm)
            x0, y0, x1, y1 = wx0 * S, wy0 * S, wx1 * S, wy1 * S
            px = [im.getpixel((x, y)) for x in range(int(x0 - 48), int(x0 - 6), 2) for y in range(int(y0 - 6), int(y1 + 6), 2)]
            c = '#%02x%02x%02x' % tuple(round(st.median(p[i] for p in px)) for i in range(3))
            out.append((code, name, c))
            crops[code] = im.crop((int(x0 - 60), int(y0 - 14), int(x1 + 60), int(y1 + 14)))
    out.sort(key=lambda o: int(o[0][2:]))
    assert len(out) == 177, len(out)
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ź\n' in src:
        sys.exit('Real Colors already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ź'] + [f'{n}|{c}|{h}' for c, n, h in out]
    open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
    print('added', len(out))
    if len(sys.argv) > 2:
        W, H, N = 520, 24, 66
        sheet = Image.new('RGB', (W * 2, H * N), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (c, n, h) in enumerate(out):
            ox, oy = i // N * W, i % N * H
            sheet.paste(crops[c].resize((90, H - 2)), (ox, oy))
            dr.rectangle((ox + 94, oy, ox + 140, oy + H - 2), fill=h)
            dr.text((ox + 146, oy + 6), f'{c} {n} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

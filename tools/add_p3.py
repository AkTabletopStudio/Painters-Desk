"""Append Formula P3 (Privateer Press / Steamforged) paints to data.js.

Usage: python3 -I tools/add_p3.py <P3-Paint-Line-Web_2022_v2.pdf>
Needs Pillow and poppler (pdftoppm, pdftotext).

Source: the official Formula P3 Paint Line chart (April 2022), sent by the owner 2026-11-03. Each paint is a printed
colour dot left of its name and 'PIP 93xxx' code. Names and codes come from the PDF text. Swatches are the median of
the dot rendered at 300 dpi, so they are estimates of printed dots. Metallic dots are printed gradients, so their
median is rougher. Ink and wash dots fade to white, so only their darker half is used.
Groups: 'Å' Paints, 'Ø' Metallics (MET_G), 'Æ' Inks & Washes (typed ink / wash by name). Codes '93028'.
"""
import os, re, statistics as st, subprocess, sys, tempfile
from html import unescape
from PIL import Image

DPI = 300
METAL = {'Pig Iron', 'Solid Gold', 'Rhulic Gold', 'Molten Bronze', 'Blighted Gold', 'Orgoth Bronze', 'Brass Balls',
         'Galvanized Steel', 'Deathless Metal', 'Boiler Black', 'Radiant Platinum', 'Quick Silver', 'Cold Steel'}


def words(pdf):
    xml = subprocess.run(['pdftotext', '-f', '1', '-l', '1', '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    return [(float(a), float(b), float(c), float(d), unescape(t)) for a, b, c, d, t in
            re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]


def paints(ws):
    for w in ws:
        if w[4] != 'PIP':
            continue
        code = next(v[4] for v in ws if abs(v[1] - w[1]) < 1 and 0 < v[0] - w[2] < 6)
        name = ' '.join(v[4] for v in sorted(ws, key=lambda v: v[0]) if abs(v[0] - w[0]) < 200 and v[0] >= w[0] - 1
                        and v[0] < w[0] + 130 and 12 < w[1] - v[1] < 18)
        yield name.replace('’', "'").replace('  ', ' ').strip(), code, w[0] - 16.3, w[1] - 1.5


def swatch(im, cx, cy, dark):
    k = DPI / 72
    px = [im.getpixel((round((cx + dx / 4) * k), round((cy + dy / 4) * k))) for dx in range(-28, 29) for dy in range(-28, 29)
          if dx * dx + dy * dy <= 28 * 28]
    if dark:
        px = sorted(px, key=sum)[:len(px) // 2]
    return '#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px))


def main(pdf):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#Å\n' in raw:
        sys.exit('P3 paints already in data.js')
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', str(DPI), '-png', '-singlefile', pdf, os.path.join(tmp, 'p')],
                   check=True, stderr=subprocess.DEVNULL)
    im = Image.open(os.path.join(tmp, 'p.png')).convert('RGB')
    got = []
    for name, code, cx, cy in paints(words(pdf)):
        fx = re.search(r'\b(Ink|Wash)$', name)
        g = 'Ø' if name in METAL else 'Æ' if fx else 'Å'
        got.append((g, name, code, swatch(im, cx, cy, bool(fx))))
    block = []
    for g in 'ÅØÆ':
        block.append('#' + g)
        block += [f'{n}|{c}|{h}' for gg, n, c, h in got if gg == g]
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(got)} paints')


if __name__ == '__main__':
    main(sys.argv[1])

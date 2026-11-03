"""Append AMMO ATOM acrylics to data.js, with the chart's Tamiya and Vallejo equivalents.

Usage: python3 -I tools/add_ammo_atom.py <atom-user-guide.pdf> [hobby.csv]
Needs Pillow and poppler (pdftoppm, pdftotext).

Source: AMMO's ATOM user guide (owner upload, 2026-11-03). Pages 7-9 are a table with one row per paint:
code, English name, Spanish name, a flat colour cell (sometimes with a RAL/RLM/FS label printed on it), then
equivalents in AMMO acrylic, Mr. Hobby Aqueous (H-), Mr. Color (C-), Tamiya, Vallejo Model Color and Model Air.
Swatches are the median of the colour cell rendered at 300 dpi, leaving out the printed label, so they are
estimates of printed artwork, not of the paints. Metallic cells are printed gradients, so their median is rougher.
Tamiya, Model Color and Model Air equivalents go into MT with source 'm' (chart-documented matches).
The Mr. Hobby columns are written to the optional CSV for when Mr. Hobby paints are added.
Left out: ATOM-20500 Thinner and Cleaner. Group '_' = ATOM.
"""
import csv, json, os, re, statistics as st, subprocess, sys, tempfile
from html import unescape
from PIL import Image

PAGES = (7, 9)
DPI = 300
GROUP = '_'
SRC = 'm'
# Column x ranges in PDF points (A4 page), measured from the chart's cell borders.
COLS = {'ral': (215.8, 275.0), 'ammo': (275.0, 368.0), 'hobby': (368.0, 411.0), 'mrc': (411.0, 454.0),
        'tamiya': (454.0, 478.0), 'mc': (478.0, 522.0), 'ma': (522.0, 565.0)}
UPPER = {'RAL', 'RLM', 'DG', 'IDF', 'US', 'IJA', 'IJN', 'NATO', 'I', 'II', 'III', '4BO', 'FS'}
FIX = {'Burint Iron': 'Burnt Iron', 'Fucsia': 'Fuchsia', 'Schwartzgrün RLM 70': 'Schwarzgrün RLM 70'}


def title(s):
    s = re.sub(r'\b(RAL|RLM)(\d)', r'\1 \2', s.replace('´', "'"))
    out = ' '.join(w if w in UPPER else w.capitalize() if w.isalpha() else
                   re.sub(r'[A-Za-zÀ-ÿ]+', lambda m: m[0] if m[0] in UPPER else m[0].capitalize(), w) for w in s.split())
    return FIX.get(out, out)


def words(pdf, page):
    xml = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    return [(float(a), float(b), float(c), float(d), unescape(t)) for a, b, c, d, t in
            re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]


def rows(pdf, page):
    ws = words(pdf, page)
    starts = sorted((w[1], w[4]) for w in ws if re.fullmatch(r'ATOM-20\d\d\d', w[4]))
    for k, (y, code) in enumerate(starts):
        y1 = starts[k + 1][0] if k + 1 < len(starts) else y + 12.47
        mine = [w for w in ws if y - 1 <= w[1] < y1 - 1]
        col = lambda a, b: ' '.join(w[4] for w in sorted(mine, key=lambda w: (round(w[1]), w[0])) if a <= w[0] < b)
        yield {'code': code, 'name': col(77, 148), 'y': y, 'labels': [w for w in mine if COLS['ral'][0] <= w[0] < COLS['ral'][1]],
               **{c: col(*COLS[c]) for c in ('hobby', 'mrc', 'tamiya', 'mc', 'ma')}}


def swatch(im, r):
    k = DPI / 72
    x0, x1 = COLS['ral'][0] + 1, COLS['ral'][1] - 1
    y0, y1 = r['y'] - 2.2 + 1, r['y'] + 10.0 - 1
    pad = 1.0
    keep = lambda x, y: not any(w[0] - pad <= x <= w[2] + pad and w[1] - pad <= y <= w[3] + pad for w in r['labels'])
    px = [im.getpixel((round(x * k), round(y * k))) for x in [x0 + i * 0.5 for i in range(int((x1 - x0) * 2))]
          for y in [y0 + j * 0.5 for j in range(int((y1 - y0) * 2))] if keep(x, y)]
    return '#%02x%02x%02x' % tuple(round(st.median(c)) for c in zip(*px))


def codes(s, pre):
    return re.findall(pre, s)


def main(pdf, hobby_csv=None):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if f'\n#{GROUP}\n' in raw:
        sys.exit('ATOM paints already in data.js')
    # Index the existing paints so chart codes can be matched.
    idx, g, n = {}, 'M', 0
    for l in raw.split('\n'):
        if not l:
            continue
        if l[0] == '#':
            g = l[1]
            continue
        idx[(g, l.split('|')[1])] = n
        n += 1
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-f', str(PAGES[0]), '-l', str(PAGES[1]), '-r', str(DPI), '-png', pdf, os.path.join(tmp, 'p')],
                   check=True, stderr=subprocess.DEVNULL)
    block, docs, extra = ['#' + GROUP], [], []
    for page in range(PAGES[0], PAGES[1] + 1):
        im = Image.open(os.path.join(tmp, f'p-{page:02d}.png')).convert('RGB')
        for r in rows(pdf, page):
            if r['code'] == 'ATOM-20500':
                continue
            i = n + len(block) - 1
            block.append(f"{title(r['name'])}|{r['code']}|{swatch(im, r)}")
            for c in codes(r['tamiya'], r'XF-\d+|X-\d+'):
                docs.append((i, ('U' if c.startswith('XF') else 'h', c)))
            for grp, col in (('Z', 'mc'), ('Y', 'ma')):
                for c in re.findall(r'7[01]\.?\d{3}', r[col]):
                    docs.append((i, (grp, c[:2] + '.' + c[-3:])))
            extra.append([r['code'], title(r['name']), r['hobby'], r['mrc'], r['tamiya'], r['mc'], r['ma']])
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    m0 = s.index('const MT=') + 9
    m1 = s.index(';', m0)
    mt = json.loads(s[m0:m1])
    missing = []
    for i, key in docs:
        j = idx.get(key)
        if j is None:
            missing.append(key)
            continue
        for x, y in ((i, j), (j, i)):
            lst = mt.setdefault(str(x), [])
            if [y, SRC] not in lst:
                lst.append([y, SRC])
    s = s[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    if hobby_csv:
        with open(hobby_csv, 'w', newline='', encoding='utf-8') as f:
            csv.writer(f).writerows([['atom', 'name', 'hobby_color', 'mr_color', 'tamiya', 'model_color', 'model_air'], *extra])
    print(f'added {len(block) - 1} paints, {len(docs) - len(missing)} chart matches; not on site: {missing}')


if __name__ == '__main__':
    main(*sys.argv[1:3])

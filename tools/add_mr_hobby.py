"""Append Mr. Hobby (GSI Creos) Mr. Color, Aqueous Hobby Color and Acrysion paints to data.js.

Usage: python3 -I tools/add_mr_hobby.py <Mr.HOBBY CATALOGUE 2024-2025.pdf> [atom-equivalents.csv]
Needs Pillow and poppler (pdftoppm, pdftotext).

Source: the Mr. Hobby Catalogue 2024-2025 (owner upload, 2026-11-03). Each paint is a cell with its number in a dark
box, the finish (G, SG, M, ME, PA, F) under it, a flat printed colour sample to the right and the name below.
Codes and names come from the PDF text. Swatches are the median of the colour sample rendered at 200 dpi, so they are
estimates of printed samples, not of the paints (the catalogue says the same).
Pages used: 1-2 Mr. Color C1-C609, 6 Aqueous Hobby Color H1-H515, 8 Acrysion N1-N127.
Left out: clears, flat base, top coats, the GX/GGX/Super Metallic/Crystal/Velvet/CA side ranges and the fluorescent
Aqueous cells printed without a number.
With the optional CSV (written by tools/add_ammo_atom.py), AMMO's ATOM chart's Mr. Color and Aqueous equivalents
are added to MT as chart-documented matches (source 'm').
Groups: '?' Mr. Color, ':' Aqueous Hobby Color, ';' Acrysion. Codes 'C-1', 'H-1', 'N-1'.
"""
import csv, json, os, re, statistics as st, subprocess, sys, tempfile
from html import unescape
from PIL import Image

DPI = 200
# (page, group, code prefix, area x0, y0, x1, y1 in points)
AREAS = [(1, '?', 'C', 600, 330, 1190, 842), (2, '?', 'C', 0, 40, 600, 450),
         (6, ':', 'H', 0, 120, 600, 760), (6, ':', 'H', 600, 40, 1190, 100), (8, ';', 'N', 0, 150, 600, 520)]
CAT = {'P', 'C', 'A', 'T', 'S', 'US', 'UK', 'J', 'G', 'R', 'I', 'PC', 'PS', 'PT', 'AC'}
FINISH = {'G', 'SG', 'M', 'ME', 'PA', 'F', 'MG', 'M75%', '3/4', '3/4 M'}
SKIP = re.compile(r'\b[cg]lear\b|flat base|top coat|semi-gloss clear|semi-gross clear', re.I)
# Line breaks and typos in the catalogue's name text.
FIX = {'Emerald G Reen': 'Emerald Green', 'Emerald Reen': 'Emerald Green', 'Light G Ull Gray': 'Light Gull Gray', 'Khaki J': 'Khaki', 'Darkgray 1': 'Dark Gray 1',
       'Darkgray 2': 'Dark Gray 2', 'RLM 02GRAY': 'RLM 02 Gray', 'Phthalo Cyanne Blue': 'Phthalo Cyanine Blue'}
# Printed samples that clearly don't match the name (C-385 Red is printed teal like C-391; C-393 Blue is printed black).
BAD = {'C-385', 'C-393'}
UPPER = {'IDF', 'IJN', 'IJA', 'US', 'UK', 'RLM', 'JASDF', 'JMSDF', 'JGSDF', 'FS', 'BS', 'II', 'III', 'GX', 'DG'}


def title(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'(?i)\b(RLM)\s*(\d)', r'\1 \2', s)
    def w(m):
        t = m[0]
        if t.upper() in UPPER or re.fullmatch(r'(FS|BS)\d+\w*|RLM\d+|\d\w*', t, re.I):
            return t.upper()
        return t.capitalize()
    s = re.sub(r"[A-Za-z0-9%]+(?:'[A-Za-z]+)?", w, s).replace('Gross', 'Gloss').replace('Camoflage', 'Camouflage')
    s = re.sub(r'\bF S(\d)', r'FS\1', s)
    s = re.sub(r'"([^"]+)"', r'(\1)', s).replace('(4BO) 1947-', '(4BO, 1947-)')
    s = re.sub(r'IDF Gray(\d) -1981 (\w+)', r'IDF Gray \1 (-1981 \2)', s).replace('IDF Gray3', 'IDF Gray 3')
    return FIX.get(s, s)


def words(pdf, page):
    xml = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox', pdf, '-'], capture_output=True,
                         text=True, errors='replace').stdout
    return [(float(a), float(b), float(c), float(d), unescape(t)) for a, b, c, d, t in
            re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]


def cells(ws, pre, box):
    x0, y0, x1, y1 = box
    big = [w for w in ws if w[3] - w[1] > 9.5 and x0 <= w[0] < x1 and y0 <= w[1] < y1]
    for w in big:
        if not re.fullmatch(r'\d{1,3}', w[4]):
            continue
        p = [v for v in big if v[4] in ('C', 'H', 'N') and 0 < w[0] - v[2] < 8 and abs(v[1] - w[1]) < 3]
        if pre != 'C' and not p:
            continue
        left = p[0][0] if p else (w[0] + w[2]) / 2 - 6
        top = min([w[1]] + [v[1] for v in p])
        inside = [v for v in ws if left - 1 <= v[0] < left + 52 and top + 9 <= v[1] < top + 37]
        fin = ' '.join(v[4] for v in sorted(inside, key=lambda v: v[0]) if v[1] < top + 18 and v[0] < left + 20)
        # Nation and use letters (P, A, US, UK...) and the red '2' (two-coat) mark sit at the right of the name.
        name = [v for v in inside if v[1] >= top + 18 and not (v[0] > left + 22 and v[4] in CAT or v[0] > left + 26 and v[4] == '2')]
        name = ' '.join(v[4] for v in sorted(name, key=lambda v: (round(v[1] / 3), v[0])))
        yield {'num': int(w[4]), 'left': left, 'top': top, 'fin': fin, 'name': name}


def swatch(im, c):
    k = DPI / 72
    px = [im.getpixel((round(x * k), round(y * k))) for x in [c['left'] + 21 + i * 0.5 for i in range(54)]
          for y in [c['top'] + 3 + j * 0.5 for j in range(24)]]
    return '#%02x%02x%02x' % tuple(round(st.median(v)) for v in zip(*px))


def main(pdf, atom_csv=None):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#?\n' in raw:
        sys.exit('Mr. Hobby paints already in data.js')
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
    got = {}
    for page, grp, pre, *box in AREAS:
        png = os.path.join(tmp, f'p{page}.png')
        if not os.path.exists(png):
            subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-r', str(DPI), '-png', '-singlefile', pdf, png[:-4]],
                           check=True, stderr=subprocess.DEVNULL)
        im = Image.open(png).convert('RGB')
        for c in cells(words(pdf, page), pre, box):
            if not c['name'] or SKIP.search(c['name']) or f"{pre}-{c['num']}" in BAD:
                continue
            got.setdefault(grp, {})[c['num']] = (title(c['name']), f"{pre}-{c['num']}", swatch(im, c), c['fin'])
    block, mets = [], []
    for grp in ('?', ':', ';'):
        block.append('#' + grp)
        for num in sorted(got[grp]):
            nm, code, h, fin = got[grp][num]
            block.append(f'{nm}|{code}|{h}')
            if fin in ('ME', 'PA'):
                mets.append((grp, nm, fin))
    count = len(block) - 3
    # Index the new paints.
    i = n
    for l in block:
        if l[0] == '#':
            g = l[1]
            continue
        idx[(g, l.split('|')[1])] = i
        i += 1
    s = s[:a] + raw.rstrip('\n') + '\n' + '\n'.join(block) + s[b:]
    links, missing = 0, []
    if atom_csv:
        m0 = s.index('const MT=') + 9
        m1 = s.index(';', m0)
        mt = json.loads(s[m0:m1])
        for row in csv.DictReader(open(atom_csv, encoding='utf-8')):
            ai = idx.get(('_', row['atom']))
            for grp, col in ((':', 'hobby_color'), ('?', 'mr_color')):
                for c in re.findall(r'[HC]-\d+', row[col]):
                    j = idx.get((grp, c))
                    if ai is None or j is None:
                        missing.append(c)
                        continue
                    for x, y in ((ai, j), (j, ai)):
                        lst = mt.setdefault(str(x), [])
                        if [y, 'm'] not in lst:
                            lst.append([y, 'm'])
                    links += 1
        s = s[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {count} paints ({", ".join(f"{g} {len(got[g])}" for g in got)}), {links} ATOM chart links; not found: {missing}')
    print('metallic/pearl finish:', mets)


if __name__ == '__main__':
    main(*sys.argv[1:3])

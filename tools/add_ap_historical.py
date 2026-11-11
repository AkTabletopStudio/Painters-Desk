"""Append Army Painter Warpaints Historical paints to data.js.

Usage: python3 -I tools/add_ap_historical.py <Colour-Comparison-Chart-Historical-to-Fanatic-2026.pdf>
Needs PyMuPDF (pip install pymupdf).

Source: Army Painter's own "Colour Comparison Chart, Historical to Fanatic" (owner upload 2026-11-09, copy in project
files data/ap-historical/). It is a vector PDF: each paint is a hexagon filled with a flat colour and its name written
inside, Historical paint on the left, its Warpaints Fanatic twin (or UNIQUE COLOUR) on the right. Those fills match the
site's existing Warpaints Fanatic swatches exactly for ordinary paints, so they come from the same official values.
Swatches are still estimates of a printed colour.
- Unique colours use the chart's fill.
- Paints the chart says are a Fanatic paint under a new label keep that Fanatic paint's swatch from data.js (washes and
  metals are flat icons on the chart), and get a chart-documented match (MT source 'w') to it.
- Dark Drab and Dark Feldgrau are the same paint (chart note), so they are linked too.
Codes (WP4020P..WP4166P) come from Army Painter's Warpaints Historical store listing, see tools/ap_historical.json.
Group: 'Ħ' Warpaints Historical, sorted by code.
"""
import json, os, sys
import pymupdf

HIST_X = (28, 169, 309, 449, 590, 729)  # left edge of each set's Historical column, in PDF points


def chart(path):
    page = pymupdf.open(path)[0]
    hexes = {}
    for d in page.get_drawings():
        r = d['rect']
        if d.get('fill') and 15 < r.width < 40 and 15 < r.height < 45:
            hexes[(round(r.x0), round(r.y0))] = '#%02x%02x%02x' % tuple(round(c * 255) for c in d['fill'])
    words = page.get_text('words')

    def label(x0, y0):
        ws = sorted((w for w in words if x0 - 2 <= (w[0] + w[2]) / 2 <= x0 + 35 and y0 - 2 <= (w[1] + w[3]) / 2 <= y0 + 38),
                    key=lambda w: (round(w[1]), w[0]))
        return ' '.join(w[4] for w in ws).replace(' *Masterclass', '')
    hist, twin = {}, {}
    for (x, y), h in hexes.items():
        if x not in HIST_X:
            continue
        n = label(x, y)
        if n in hist and hist[n] != h:
            sys.exit(f'{n}: two colours on the chart, {hist[n]} and {h}')
        hist[n] = h
        for dx in (50, 51, 55):
            for dy in (0, 1, -1):
                if (x + dx, y + dy) in hexes:
                    twin[n] = label(x + dx, y + dy)
    return hist, twin


def main(pdf):
    here = os.path.dirname(os.path.abspath(__file__))
    codes = json.load(open(os.path.join(here, 'ap_historical.json'), encoding='utf-8'))['codes']
    hist, twin = chart(pdf)
    if set(hist) != set(codes):
        sys.exit(f'chart vs store list differ: {set(hist) ^ set(codes)}')
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '\n#Ħ\n' in raw:
        sys.exit('Warpaints Historical already in data.js')
    idx, g, i = {}, None, 0
    for l in raw.split('\n'):
        if l.startswith('#'):
            g = l[1]
            continue
        n, c, h = l.split('|')
        idx.setdefault((g, n), (i, h))
        i += 1
    rows, links, at = [], [], {}
    for n in sorted(hist, key=lambda n: codes[n]):
        h = hist[n]
        t = twin.get(n)
        if t:
            src = idx.get(('A', t)) or idx.get(('C', t))
            if not src:
                sys.exit(f'{n}: Fanatic twin {t} not in data.js')
            h = src[1]
            links.append((i, src[0]))
        at[n] = i
        rows.append(f'{n}|{codes[n]}|{h}')
        i += 1
    links.append((at['Dark Drab'], at['Dark Feldgrau']))
    s = s[:a0] + raw.rstrip('\n') + '\n#Ħ\n' + '\n'.join(rows) + s[b0:]
    m0 = s.index('const MT=') + 9
    m1 = s.index(';', m0)
    mt = json.loads(s[m0:m1])
    for a, b in links:
        for x, y in ((a, b), (b, a)):
            l = mt.setdefault(str(x), [])
            if [y, 'w'] not in l:
                l.append([y, 'w'])
    s = s[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(rows)} paints, {len(links)} chart links')
    print('\n'.join(rows))


if __name__ == '__main__':
    main(*sys.argv[1:])

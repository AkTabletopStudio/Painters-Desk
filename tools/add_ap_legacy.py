"""Append Army Painter's old Warpaints names (before Warpaints Fanatic) to data.js as 'Warpaints Legacy'.

Usage: python3 -I tools/add_ap_legacy.py <A3_Fanatic_Colour_Conversion_Chart_WEB.pdf>
Needs PyMuPDF (pip install pymupdf).

Source: Army Painter's own "Warpaints Fanatic Conversion Chart" (owner upload 2026-11-09, copy in project files
data/ap-fanatic-conversion/). Each cell is one Fanatic paint: its name in MalagaOTCE 6pt, then up to three 5pt lines
under it at fixed offsets: the old Warpaints paint (+8pt), the Warpaints Air paint (+15pt) and the Citadel paint
(+23pt). Army Painter calls these close matches, not always exact.
- Only old names that differ from their Fanatic name are added (a name kept in Fanatic is already on the site).
- Swatch = the Fanatic paint's swatch in data.js (the owner asked for the close-match swatch, 2026-11-09).
- Each legacy paint gets an MT link with source 'L' to its Fanatic replacement; app.js shows it as "Replaced by" and
  copies the replacement's paint type (wash, metallic and so on).
Group: 'Ŵ' Warpaints Legacy, sorted by name, no codes.
"""
import json, sys
import pymupdf

FIX = {'ﬂ': 'fl', 'ﬁ': 'fi'}


def clean(t):
    t = ' '.join(t.split())
    for a, b in FIX.items():
        t = t.replace(a, b)
    return t


def chart(path):
    page = pymupdf.open(path)[0]
    heads, subs = [], []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = clean(''.join(s['text'] for s in l['spans']))
            if not t:
                continue
            s = l['spans'][0]
            x, y = l['bbox'][0], l['bbox'][1]
            if s['font'] == 'MalagaOTCE-Med' and s['size'] == 6.0:
                heads.append((x, y, t))
            elif s['font'] == 'SupriaSans-CondRegular' and s['size'] == 5.0:
                subs.append((x, y, t))
    old = {}
    for x, y, t in subs:
        for hx, hy, ht in heads:
            if abs(hx - x) < 3 and 5 < y - hy < 11:
                if ht == 'M':  # Matt White's heading is drawn white on white, only a stray 'M' is text
                    ht = 'Matt White'
                if t in old and old[t] != ht:
                    sys.exit(f'{t}: two Fanatic matches, {old[t]} and {ht}')
                old[t] = ht
    return old


def main(pdf):
    old = chart(pdf)
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '\n#Ŵ\n' in raw:
        sys.exit('Warpaints Legacy already in data.js')
    fan, g, i = {}, None, 0
    for l in raw.split('\n'):
        if l.startswith('#'):
            g = l[1]
            continue
        n, c, h = l.split('|')
        if g == 'A':
            fan.setdefault(n, (i, h))
        i += 1
    rows, links = [], []
    for n in sorted(old):
        t = old[n]
        if n == t:
            continue
        if t not in fan:
            sys.exit(f'{n}: Fanatic match {t} not in data.js')
        j, h = fan[t]
        rows.append(f'{n}||{h}')
        links.append((i, j))
        i += 1
    s = s[:a0] + raw.rstrip('\n') + '\n#Ŵ\n' + '\n'.join(rows) + s[b0:]
    m0 = s.index('const MT=') + 9
    m1 = s.index(';', m0)
    mt = json.loads(s[m0:m1])
    for a, b in links:
        for x, y in ((a, b), (b, a)):
            l = mt.setdefault(str(x), [])
            if [y, 'L'] not in l:
                l.append([y, 'L'])
    s = s[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(rows)} paints ({len(old) - len(rows)} old names kept in Fanatic skipped)')
    for n in sorted(old):
        if n != old[n]:
            print(f'{n} -> {old[n]}')


if __name__ == '__main__':
    main(*sys.argv[1:])

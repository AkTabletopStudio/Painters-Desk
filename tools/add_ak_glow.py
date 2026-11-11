"""Append AK Interactive Glow Precision Fluor (group 'Ŧ') to data.js.

Usage: python3 -I tools/add_ak_glow.py <Glow Precision Fluor guide.pdf>   (needs PyMuPDF)

Source: AK's Glow Precision Fluor guide (owner upload 2026-11-10, project files data/ak-glow-fluor/). Page 9 lists the
six fluors (AK12109-AK12114) on flat colour bars; each bar's vector fill is read directly. The White Precision Base
(AK12108, page 8) has no swatch, so it gets plain white. Enamel paints; swatches are estimates, and fluorescents
look duller on screen than in the bottle.
"""
import sys, re
import pymupdf

NAMES = {'AK12109': 'Pink Fluor', 'AK12110': 'Red Fluor', 'AK12111': 'Yellow Fluor', 'AK12112': 'Light Orange Fluor',
         'AK12113': 'Orange Fluor', 'AK12114': 'Green Fluor'}


def main(pdf):
    pg = pymupdf.open(pdf)[8]
    D = [x for x in pg.get_drawings() if x.get('fill') and x['rect'].width > 60]
    out = {}
    for w in pg.get_text('words'):
        if w[4] in NAMES:
            y = (w[1] + w[3]) / 2
            f = [x for x in D if x['rect'].y0 - 1 < y < x['rect'].y1 + 1]
            out[w[4]] = '#%02x%02x%02x' % tuple(round(v * 255) for v in f[-1]['fill'])
    if len(out) != 6:
        sys.exit(f'expected 6 fluors, found {sorted(out)}')
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '|AK12109|' in raw:
        sys.exit('Glow Precision Fluor already in data.js')
    lines = ['White Precision Base|AK12108|#fafafa'] + [f'{NAMES[k]}|{k}|{out[k]}' for k in sorted(out)]
    s = s[:a0] + raw.rstrip('\n') + '\n#Ŧ\n' + '\n'.join(lines) + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print('\n'.join(lines))


if __name__ == '__main__':
    main(*sys.argv[1:])

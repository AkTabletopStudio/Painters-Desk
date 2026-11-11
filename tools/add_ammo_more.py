"""Append five more AMMO by Mig ranges to data.js.

Usage: python3 -I tools/add_ammo_more.py <IONIC colours leaflet.pdf> <AMMO Wargames catalogue 2024 (A.MIG-8304).pdf> <Shaders user guide.pdf>
Needs PyMuPDF (pip install pymupdf).

Sources (owner uploads 2026-11-09, copies in project files data/ammo/):
- IONIC Smart Colors leaflet, page 2: 180 paints IONIC-0001..0180. Each row has a flat vector colour fill, read
  directly. The 8 metallics (0173-0180) are pictures, sampled from a 300 dpi render.
- AMMO Wargames catalogue 2024 (A.MIG-8304), tables with a COLOR column:
  page 20 Acrylic Colors for Figures AMMO.F-501..553 (vector fills; F-500 Retarder is left out, it is not a colour;
  F-501 white has no fill so it is sampled),
  page 29 Oilbrusher A.MIG-3500..3539 (flat colour pictures, sampled; the 5 metal ones are shaded, whole-cell median),
  page 16 Dio Drybrush A.MIG-0600..0653 (flat colour pictures, sampled),
  page 17 Matt Shaders A.MIG-0720..0759 (glossy gradient pictures; the left edge of the cell, where the colour is
  strongest, is sampled).
- Shaders user guide, page 4: the 20 original Shaders A.MIG-0850..0869 painted as strips that run from black to full
  colour; sampled just above the labels, where the paint is strongest. The catalogue's cells for these are much paler
  than the painted strips, so the guide is used. Shaders are semi-transparent, so their swatches are rougher.
All swatches are estimates of printed colours.
Name fixes: catalogue prints F-539 as 'BRIGHT ORANGE / VIOLETA INTENSO' (copy of F-538) with a violet swatch, so it is
named Bright Violet; 'MATT LIGHT YELLOW MATT' / 'MATT YELLOW MATT' are Matt Light Yellow / Matt Yellow. Other names are as printed (Terracota, Saphire Blue).
Groups: 'Ï' IONIC Smart Colors, 'Ò' Acrylic Colors for Figures, 'Ó' Oilbrusher, 'Ú' Dio Drybrush, 'Û' Shaders,
each sorted by code and appended at the end of RAW.
"""
import re, sys
import pymupdf

KEEP_UP = re.compile(r'^(FS-?\d+|S-\d+|RAL|II|III|IV)$')


def title(s):
    out = []
    for w in s.split():
        out.append(w if KEEP_UP.match(w) else '-'.join(x[:1].upper() + x[1:].lower() for x in w.split('-')))
    return ' '.join(out)


def hexc(rgb):
    return '#%02x%02x%02x' % tuple(rgb)


def med(px):
    px = sorted(px, key=lambda v: sum(v))
    return px[len(px) // 2][:3]


def rows(page, rx, name_dx, cell_dx, cell_w, region):
    """region: 'flat' (middle of cell), 'left' (strong end of a gradient), 'all' (whole cell)."""
    W = page.get_text('words')
    F = [x for x in page.get_drawings() if x.get('fill') and cell_w - 10 < x['rect'].width < cell_w + 10 and x['rect'].height < 20]
    pix = page.get_pixmap(dpi=300)
    s = pix.width / page.rect.width
    out = {}
    for c in W:
        if not re.match(rx, c[4]):
            continue
        y = (c[1] + c[3]) / 2
        nm = ' '.join(w[4] for w in sorted((w for w in W if abs((w[1] + w[3]) / 2 - y) < 2.5 and c[0] + name_dx[0] < w[0] < c[0] + name_dx[1]), key=lambda w: w[0]))
        nm = nm.split(' / ')[0].strip()
        f = [x for x in F if x['rect'].y0 - 1 < y < x['rect'].y1 + 1 and c[0] + cell_dx - 15 < x['rect'].x0 < c[0] + cell_dx + 15]
        x0 = c[0] + cell_dx
        if f and region == 'flat':
            h = hexc(round(v * 255) for v in f[-1]['fill'])
            src = 'vector'
        else:
            xs = {'flat': (0.2, 0.8), 'left': (0.04, 0.14), 'all': (0.05, 0.95)}[region]
            px = []
            for i in range(12):
                for dy in (-2, -1, 0, 1, 2):
                    px.append(pix.pixel(int((x0 + cell_w * (xs[0] + (xs[1] - xs[0]) * i / 11)) * s), int((y + dy) * s)))
            h = hexc(med(px))
            src = 'sampled'
        code = re.sub(r'^AMMOF(\d+)$', r'AMMO.F-\1', c[4])
        out[code] = (nm, h, src)
    return out


def main(ionic_pdf, cat_pdf, shader_pdf):
    ion = pymupdf.open(ionic_pdf)[1]
    cat = pymupdf.open(cat_pdf)
    I = rows(ion, r'IONIC-\d{4}$', (100, 270), 49, 59, 'flat')
    for k in list(I):
        if int(k[-4:]) >= 173:  # metallic pictures
            I[k] = rows(ion, '^' + k + '$', (100, 270), 49, 59, 'all')[k]
    Fg = rows(cat[20], r'(AMMO\.F-|AMMOF)\d+$', (40, 175), 178, 63, 'flat')
    Fg.pop('AMMO.F-500', None)
    O = rows(cat[29], r'A\.MIG-35\d\d$', (40, 175), 178, 64, 'flat')
    for k in [k for k in O if int(k[-4:]) >= 3535]:
        O[k] = rows(cat[29], '^' + re.escape(k) + '$', (40, 175), 178, 64, 'all')[k]
    D = rows(cat[16], r'A\.MIG-06\d\d$', (40, 175), 178, 64, 'flat')
    S = rows(cat[17], r'A\.MIG-0(7[2-5]\d|8[5-6]\d)$', (40, 175), 178, 64, 'left')
    # Original Shaders: strips in the guide, 20 columns at 80 dpi from x=57 px, step 63.7 px, sampled at y=790 px.
    gp = pymupdf.open(shader_pdf)[3].get_pixmap(dpi=80)
    for i in range(20):
        k = 'A.MIG-%04d' % (850 + i)
        xc = 57 + i * 63.7
        S[k] = (S[k][0], hexc(med([gp.pixel(int(xc + dx), 790) for dx in range(-15, 16, 3)])), 'sampled')
    fix = {'AMMO.F-539': 'BRIGHT VIOLET', 'A.MIG-0720': 'MATT LIGHT YELLOW', 'A.MIG-0721': 'MATT YELLOW'}
    counts = {'Ï': (I, 180), 'Ò': (Fg, 53), 'Ó': (O, 40), 'Ú': (D, 54), 'Û': (S, 60)}
    for g, (d, n) in counts.items():
        if len(d) != n:
            sys.exit(f'{g}: expected {n} paints, found {len(d)}: {sorted(d)}')
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    raw = s[a0:b0]
    if '\n#Ï\n' in raw:
        sys.exit('IONIC already in data.js')
    add = ''
    for g, (d, n) in counts.items():
        lines = [f"{title(fix.get(k, d[k][0]))}|{k}|{d[k][1]}" for k in sorted(d)]
        add += f'\n#{g}\n' + '\n'.join(lines)
        print(f'#{g} {len(lines)} paints, {sum(v[2] == "sampled" for v in d.values())} sampled')
    s = s[:a0] + raw.rstrip('\n') + add + s[b0:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(add)


if __name__ == '__main__':
    main(*sys.argv[1:])

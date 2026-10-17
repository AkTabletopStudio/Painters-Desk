"""Append AK Interactive 3rd Generation Acrylics to data.js from the AK 2021 equivalence chart (PDF).

Usage: python3 tools/add_ak3g.py <AK_ACRYLICS_2021_TABLA_EQUIVALENCIAS.pdf>
Needs PyMuPDF. Swatch colours are read from the chart's printed Color cells, so they are estimates.
The chart's Type column becomes the sub-range; Vallejo codes in the chart become documented matches.
"""
import json, re, sys
import pymupdf

GROUPS = {  # chart Type cell colour or label -> (group letter, label)
    '#f06522': 'e', '#f26931': 'e', '#fff200': 'g', '#81afd0': 'j', '#134b97': 'm', '#483d36': 'n',
    'AFV': 'o', 'FIG': 'v', 'AIR': 'y',
}
SKIP = '#a6a8a8'  # auxiliaries (retarder, mediums): not paints


def hx(f):
    return None if f is None else '#%02x%02x%02x' % tuple(round(c * 255) for c in f[:3])


def parse(path):
    doc = pymupdf.open(path)
    rows, seen = [], set()
    for page in doc:
        words = page.get_text('words')
        hdr = {}
        for w in words:
            if w[4] in ('Ref.', 'Type', 'Color', 'Vallejo') and w[4] not in hdr:
                hdr[w[4]] = w
        if 'Ref.' not in hdr:
            continue
        fills = [(d['rect'], d['fill']) for d in page.get_drawings() if d.get('fill') is not None]
        refs = sorted([w for w in words if re.fullmatch(r'AK1\d{4}', w[4])], key=lambda w: w[1])
        ycs = [(w[1] + w[3]) / 2 for w in refs]
        pix = None
        for k, r in enumerate(refs):
            if r[4] in seen:
                continue
            yc = ycs[k]
            top = max(yc - 12, (ycs[k - 1] + yc) / 2 if k else yc - 12)
            bot = min(yc + 12, (ycs[k + 1] + yc) / 2 if k + 1 < len(refs) else yc + 12)
            band = [w for w in words if top <= (w[1] + w[3]) / 2 < bot and w[0] > r[2]]

            def col(x0, x1):
                ws = sorted([w for w in band if x0 <= (w[0] + w[2]) / 2 < x1], key=lambda w: (round(w[1] / 3), w[0]))
                return [w[4] for w in ws]

            name = col(r[2], hdr['Color'][0] - 2)
            typ = next((t for t in name if t in ('AFV', 'AIR', 'FIG')), '')
            if typ:
                name.remove(typ)
            vall = ' '.join(col(hdr['Vallejo'][0] - 10, hdr['Vallejo'][2] + 10))

            def fill_at(xc, tall=False):
                best = None
                for rect, f in fills:
                    if rect.x0 <= xc <= rect.x1 and rect.y0 - 1 <= yc <= rect.y1 + 1 and rect.width < 80 and (tall or rect.height < 40):
                        best = f
                return hx(best)

            tx = (hdr['Type'][0] + hdr['Type'][2]) / 2
            cx = (hdr['Color'][0] + hdr['Color'][2]) / 2
            tfill, cfill = fill_at(tx, True), fill_at(cx)
            if cfill is None:  # cell drawn without a vector fill: sample the rendered page
                pix = pix or page.get_pixmap(dpi=144)
                s = 144 / 72
                cfill = '#%02x%02x%02x' % pix.pixel(int(cx * s), int(yc * s))[:3]
            seen.add(r[4])
            rows.append(dict(ref=r[4], name=' '.join(name).replace('ﬂ', 'fl').replace('ﬁ', 'fi'),
                             type=typ or tfill, colour=cfill, vallejo=vall))
    return rows


def main(pdf):
    rows = parse(pdf)
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '|AK11001|' in raw:
        sys.exit('AK 3rd Gen already in data.js')
    lines = [l for l in raw.split('\n') if l and l[0] != '#']
    code_ix = {}
    for i, l in enumerate(lines):
        code_ix.setdefault(l.split('|')[1], i)
    by_group = {}
    for r in rows:
        if r['type'] == SKIP:
            continue
        g = GROUPS[r['type']]
        by_group.setdefault(g, []).append(r)
    block, ix, n = [], len(lines), 0
    mt_line = next(l for l in s.split('\n') if l.startswith('const MT='))
    mt = json.loads(mt_line[len('const MT='):].rstrip(';'))
    links = 0
    for g in 'egjmnovy':
        block.append('#' + g)
        for r in by_group.get(g, []):
            block.append(f"{r['name']}|{r['ref']}|{r['colour']}")
            v = r['vallejo']
            code = {3: f'70.{v}', 5: f'{v[:2]}.{v[2:]}'}.get(len(v)) if v.isdigit() else None
            j = code_ix.get(code)
            if j is not None:
                mt.setdefault(str(ix), []).append([j, 'k'])
                mt.setdefault(str(j), []).append([ix, 'k'])
                links += 1
            ix += 1
            n += 1
    new_raw = raw.rstrip('\n') + '\n' + '\n'.join(block)
    s = s[:a] + new_raw + s[b:]
    s = s.replace(mt_line, 'const MT=' + json.dumps(mt, separators=(',', ':')) + ';')
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {n} paints, {links} Vallejo chart links', {g: len(v) for g, v in by_group.items()})


if __name__ == '__main__':
    main(sys.argv[1])

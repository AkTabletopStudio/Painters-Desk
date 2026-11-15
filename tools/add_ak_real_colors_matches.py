"""Link AK Real Colors (group 'Ź') to the Tamiya, Vallejo and Mr. Hobby paints that AK's conversion chart lists for them.

Usage: pdftotext -bbox RealColors_Conversion_Chart.pdf <dir>/rc-bbox.html
       python3 -I tools/add_ak_real_colors_matches.py <dir>/rc-bbox.html
Adds two-way chart-documented matches to MT in data.js with source 'r' (MSRC 'AK Real Colors conversion chart').
Read per row (words within half a line of the RC code): Tamiya XF-/X- codes (groups U / h), Vallejo 70.xxx Model Color
(Z) and 71.xxx Model Air (Y), Mr. Hobby C<n> Mr. Color (?) and H<n> Aqueous (:). Hataka, MRP, Model Master and
Lifecolor columns are not on the site. Codes the site doesn't have are reported and skipped.
"""
import html, json, re, sys

SRC = 'r'


def main():
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    idx, g, n = {}, None, 0
    for l in s[a:b].split('\n'):
        if not l:
            continue
        if l[0] == '#':
            g = l[1:]
            continue
        idx.setdefault((g, l.split('|')[1]), n)
        n += 1
    docs, missing = [], []
    for pg in open(sys.argv[1], encoding='utf-8').read().split('<page')[1:]:
        words = [(float(x0), (float(y0) + float(y1)) / 2, html.unescape(w)) for x0, y0, x1, y1, w in
                 re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<', pg)]
        for x, y, code in words:
            if not re.fullmatch(r'RC\d{3}', code) or x > 100 or ('Ź', code) not in idx:
                continue
            row = ' '.join(t for wx, wy, t in sorted(words) if abs(wy - y) < 5 and 185 < wx < 500)
            keys = [('U' if c.startswith('XF') else 'h', c) for c in re.findall(r'\bXF?-\d+\b', row)]
            keys += [('Z' if c.startswith('70') else 'Y', c) for c in re.findall(r'\b7[01]\.\d{3}\b', row)]
            keys += [('?', 'C-' + str(int(c))) for c in re.findall(r'\bC(\d+)\b', row)]
            keys += [(':', 'H-' + str(int(c))) for c in re.findall(r'\bH(\d+)\b', row)]
            for k in keys:
                j = idx.get(k)
                if j is None:
                    missing.append(k)
                else:
                    docs.append((idx[('Ź', code)], j))
    m0 = s.index('const MT=') + 9
    m1 = s.index(';', m0)
    mt = json.loads(s[m0:m1])
    added = 0
    for i, j in docs:
        for x, y in ((i, j), (j, i)):
            lst = mt.setdefault(str(x), [])
            if not any(e[0] == y for e in lst):
                lst.append([y, SRC])
                added += 1
    s = s[:m0] + json.dumps(mt, ensure_ascii=False, separators=(',', ':')) + s[m1:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'{len(docs)} chart matches ({added} new links); not on site: {sorted(set(missing))}')


if __name__ == '__main__':
    main()

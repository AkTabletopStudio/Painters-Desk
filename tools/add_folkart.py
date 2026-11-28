"""Append FolkArt (Plaid) acrylics as a new brand to data.js.

Usage: python3 -I tools/add_folkart.py <FOLKART_CATALOG_FINAL.pdf> <workdir> [check.png]
Needs Pillow and poppler (pdftotext, pdftoppm).

Source: FolkArt 2025 catalogue (168 pages), uploaded by the owner 2026-11-28 (data/folkart/README.md lists every line).
Owner picked "core four plus effects": Matte, Multi-Surface (+ its metallics), Metallic, Color Shift, Perle,
Treasure Gold, Neon, Glossy, Flat. Names and Plaid item numbers come from the page text (pdftotext -bbox); when a
colour has several sizes the 2oz number is used. Swatches are sampled from 150 dpi page renders: for the photographed
paint dollops, a box in the lower middle of the dollop above each code, dropping the brightest and darkest pixels
(light neutrals use the lighter half so whites don't come out grey); Neon = centre of the blacklight circle above the
code; Flat = the big circle next to the code. All colours are estimates from catalogue photos.
Catalogue typos fixed: Conch Shelll, Mossy Medow, Turquise. Page 16 prints 6309CA for both Bronze and Fire Opal.
"""
import html, json, os, re, statistics as st, subprocess, sys
from PIL import Image, ImageDraw

K = 150 / 72
SECTIONS = [  # group, pages
    ('Ƙ', [7, 8, 9, 10, 11, 12, 13]), ('ƙ', [15, 16, 17]), ('ƛ', [37, 38, 39]), ('Ɯ', [43, 44]), ('Ɲ', [35]),
    ('ƞ', [47, 48]), ('Ɵ', [67]), ('Ơ', [81, 82]), ('ơ', [85])]
FIX = {'Conch Shelll': 'Conch Shell', 'Mossy Medow': 'Mossy Meadow', 'Turquise': 'Turquoise'}
CODE = re.compile(r'^(\d{3,6}(CA|C)?|K\d{3}|\d+oz|-|/)$')
def words(p):
    t=subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-bbox',sys.argv[1],'-'],capture_output=True,text=True).stdout
    return [(float(a),float(b),float(c),float(d),html.unescape(w)) for a,b,c,d,w in re.findall(r'xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<',t)]
def lines(ws):
    ws=sorted(ws,key=lambda w:(round(w[1]),w[0]));L=[]
    for w in ws:
        if L and abs(L[-1][0][1]-w[1])<2.5: L[-1].append(w)
        else: L.append([w])
    return [sorted(l) for l in L]
def clusters(l,gap=12):
    C=[]
    for w in l:
        if C and w[0]-C[-1][-1][2]<gap: C[-1].append(w)
        else: C.append([w])
    return C
CODE=re.compile(r'^(\d{3,6}(CA|C)?|K\d{3}|\d+oz|-|/)$')
def page(p):
    out=[];L=lines(words(p))
    for i,l in enumerate(L):
        if not all(CODE.match(w[4]) for w in l) or not any(re.match(r'^\d{3,6}',w[4]) for w in l): continue
        y=l[0][1]
        names=[x for x in L[i+1:i+4] if 0<x[0][1]-y<40 and not all(CODE.match(w[4]) for w in x)]
        for c in clusters(l):
            toks=[w[4] for w in c]
            codes=[t for t in toks if re.match(r'^\d{3,6}',t) or t.startswith('K')]
            if not codes: continue
            code=codes[0]
            cx=(c[0][0]+c[-1][2])/2
            nm=[]
            for nl in names:
                best=min(clusters(nl),key=lambda k:abs((k[0][0]+k[-1][2])/2-cx))
                if abs((best[0][0]+best[-1][2])/2-cx)<40: nm.append(' '.join(w[4] for w in best))
            out.append(dict(p=p,code=code,name=' '.join(nm),x=cx,y=y))
    return out
def sample(im, x, y):
    X = int(x * K); W, H = im.size
    def ink(j):
        return sum(1 for i in range(max(0, X - 15), min(W, X + 16)) if 765 - sum(im.getpixel((i, j))) > 25) > 15
    j = int((y - 3) * K)
    while j > 0 and not ink(j): j -= 1
    bot = j
    while j > 0 and ink(j): j -= 1
    top = j; h = bot - top
    cy = top + h * 0.55; ry = max(3, h * 0.2); rx = int(22 * K * 0.5)
    px = sorted((im.getpixel((i, j)) for i in range(X - rx, X + rx) for j in range(int(cy - ry), int(cy + ry))), key=sum)
    n = len(px); q = px[int(n * .1):int(n * .7)]
    m = [st.median(p[c] for p in q) for c in range(3)]
    if min(m) > 165 and max(m) - min(m) < 20: q = px[int(n * .5):int(n * .95)]
    return '#%02x%02x%02x' % tuple(round(st.median(p[c] for p in q)) for c in range(3)), (X, top, bot)


def spot(im, x, y):
    px = [im.getpixel((int(i * K), int(j * K))) for i in range(int(x) - 10, int(x) + 10) for j in range(int(y) - 10, int(y) + 10)]
    return '#%02x%02x%02x' % tuple(round(st.median(p[c] for p in px)) for c in range(3)), (int(x * K), int((y - 25) * K), int((y + 25) * K))


def clean(n):
    n = re.sub(r'\d+oz - \w+ ', '', n)
    n = re.sub(r' (SEE MORE COLORS|NEON COLORS)$', '', n)
    n = re.sub(r' SHIFTS TO .*$', '', n)
    n = ' '.join(w.capitalize() if '-' not in w else '-'.join(x.capitalize() for x in w.split('-')) for w in n.split())
    return FIX.get(n, n)


def main():
    work = sys.argv[2]; os.makedirs(work, exist_ok=True)
    rows = []
    for g, pages in SECTIONS:
        for p in pages:
            png = os.path.join(work, f'p{p}.png')
            if not os.path.exists(png):
                subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', '150', '-singlefile', '-png', sys.argv[1], png[:-4]], check=True)
            im = Image.open(png).convert('RGB')
            for r in page(p):
                if p == 67: h, box = spot(im, r['x'], r['y'] - 72)
                elif p == 85: h, box = spot(im, 367 if r['x'] < 460 else 576, r['y'] + 15)
                else: h, box = sample(im, r['x'], r['y'])
                gg = g
                if g == 'ƙ' and (p == 16 and r['y'] > 590 or p == 17 and r['y'] > 690): gg = 'ƚ'  # Multi-Surface metallics
                rows.append(dict(g=gg, n=clean(r['name']), c=r['code'], h=h, p=p, box=box))
    src = open('data.js', encoding='utf-8').read()
    if '\n#Ƙ\n' in src: sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = []
    for g in 'ƘƙƚƛƜƝƞƟƠơ':
        lines.append('#' + g); lines += [f"{r['n']}|{r['c']}|{r['h']}" for r in rows if r['g'] == g]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(rows))
    if len(sys.argv) > 3:
        per = 60; cols = (len(rows) + per - 1) // per
        sheet = Image.new('RGB', (cols * 330, per * 36), 'white'); d = ImageDraw.Draw(sheet)
        for i, r in enumerate(rows):
            im = Image.open(os.path.join(work, f"p{r['p']}.png")).convert('RGB')
            X, top, bot = r['box']; ox, oy = i // per * 330, i % per * 36
            sheet.paste(im.crop((X - 60, top - 5, X + 60, bot + 5)).resize((70, 34)), (ox, oy))
            d.rectangle((ox + 72, oy, ox + 106, oy + 34), fill=r['h'])
            d.text((ox + 110, oy + 12), f"{r['g']} {r['c']} {r['n'][:20]}", fill='black')
        sheet.save(sys.argv[3])


if __name__ == '__main__':
    main()

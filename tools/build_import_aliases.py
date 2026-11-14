"""Build import-aliases.js: a background lookup that helps the My paints CSV import recognise paints exported from other sites.

Usage: python3 tools/build_import_aliases.py <import-sources dir>
The sources dir holds pinned snapshots of other paint lists (project folder data/import-sources/):
  miniature-paints@<sha>/    Arcturus5404/miniature-paints (Miniature Painter Pro), MIT, one Markdown table per brand
  hobby-desk-data@<sha>/     alexparlett/hobby-desk-data, <brand>/<range>.json with name, sku, range, hex
  minipainter@<sha>/         ArturSkowronski/minipainter, MIT, catalog JSON (ids like citadel/abaddon-black)
  paint-conversion@<sha>/    redgrimm/paint-conversion, MIT, generated HTML charts (names, ranges, hex)
  citadel-paints-api@<sha>/  lizkaufman/citadel-paints-api, names and types only

Nothing here touches the wheel: data.js swatches are never changed. For each outside paint:
  - same brand + same name as one of our paints: its code/SKU becomes another code for our paint
  - same brand + same code as one of our paints but another name: its name becomes another name for our paint
  - otherwise it is kept as a "known paint, not on the site yet" row (brand, name, code, range, reference colour),
    so the import can say so instead of "not found". Those colours are other sites' estimates, shown only in the import preview.
Names are normalised exactly like csvNorm() in account.js; codes like csvCode().
"""
import glob, html, json, os, re, sys, unicodedata

SRC = sys.argv[1]
app = open('app.js', encoding='utf-8').read()
BRANDS = [(m[0], re.findall(r"'([^']*)'", m[1])) for m in re.findall(r"\['([^']+)',\[([^\]]*)\]\]", re.search(r'const BRANDS=(\[.*?\]\]\]);', app).group(1))]
BI = {b: i for i, (b, _) in enumerate(BRANDS)}
G2B = {g: i for i, (_, gs) in enumerate(BRANDS) for g in gs}
GL = {}
for m in re.finditer(r"(?:'([^']*)'|(\w+))\s*:\s*'([^']*)'", re.search(r'const GL=\{(.*?)\};', app).group(1)):
    GL[m.group(1) if m.group(1) is not None else m.group(2)] = m.group(3)


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[’'`]", '', s).replace('&', ' and ')
    s = ' ' + re.sub(r'[^a-z0-9]+', ' ', s) + ' '
    s = re.sub(r'\bmatte\b', 'matt', s)
    s = re.sub(r'\bcolour', 'color', s)
    s = re.sub(r'\bgrey', 'gray', s)
    return re.sub(r'\s+', ' ', s).strip()


def code(s):
    return re.sub(r'[^a-z0-9]', '', str(s or '').lower())


# Our paints (index = position in data.js RAW; data.js only grows at the end, so indices are stable).
s = open('data.js', encoding='utf-8').read()
raw = s[s.index('`') + 1:s.index('`;')]
P, g = [], 'M'
for l in raw.split('\n'):
    if not l:
        continue
    if l[0] == '#':
        g = l[1:]
        continue
    n, c, h = l.split('|')[:3]
    P.append(dict(n=n, c=c, g=g, b=G2B.get(g), i=len(P)))
byN, byC = {}, {}
for p in P:
    if p['b'] is None:
        continue
    byN.setdefault((p['b'], norm(p['n'])), []).append(p)
    if len(code(p['c'])) >= 2:
        byC.setdefault((p['b'], code(p['c'])), []).append(p)

GENERIC = set('color colors paint paints range series acrylic acrylics the and of set new hobby model citadel vallejo warpaints army painter pro'.split())


def pick(cands, rng):
    """Same-name paints in one brand (e.g. Citadel Base and Air): keep those whose range shares a word with the outside range."""
    if len(cands) < 2 or not rng:
        return cands
    w = set(norm(rng).split()) - GENERIC
    hit = [p for p in cands if w & (set(norm(GL.get(p['g'], '')).split()) - GENERIC)]
    return hit or cands


# Brand names as other sites write them -> our brand, or a brand we don't carry (kept as its display name).
OURS = {
    'Army Painter': ['the army painter', 'army painter', 'army_painter', 'armypainter'],
    'Citadel / Warhammer': ['citadel colour', 'citadel color', 'games workshop', 'citadel_colour'],
    'Pro Acryl': ['monument', 'monument hobbies', 'monument pro acryl', 'pro acryl'],
    'Vallejo': ['vallejo', 'acrylicos vallejo'],
    'AK Interactive': ['ak', 'ak interactive', 'ak-interactive'],
    'Two Thin Coats': ['two thin coats', 'duncan rhodes', 'duncan rhodes painting academy'],
    'Turbo Dork': ['turbo dork', 'turbodork'],
    'Tamiya': ['tamiya'],
    'Scale75': ['scale75', 'scale 75', 'scale color'],
    'Green Stuff World': ['greenstuffworld', 'green stuff world'],
    'AMMO by Mig': ['mig', 'ammo', 'ammo by mig', 'ammo by mig jimenez', 'mig jimenez'],
    'Mr. Hobby': ['mrhobby', 'mr hobby', 'gsi creos', 'mr color'],
    'Reaper': ['reaper', 'reaper miniatures', 'reaper msp'],
    'Formula P3': ['p3', 'formula p3', 'privateer press', 'privateer press formula p3'],
    'Kimera Kolors': ['kimera', 'kimera kolors', 'kimerakolors'],
    'Golden': ['golden', 'golden artist colors'],
}
BRAND = {}
for b, al in OURS.items():
    for a in al:
        BRAND[norm(a)] = BI[b]
OTHER = {'AKRC': 'AK Real Colors', 'Acrilex': 'Acrilex', 'AppleBarrel': 'Apple Barrel', 'Arteza': 'Arteza', 'CoatDArmes': "Coat d'Arms",
         'Creature': 'Creature Caster', 'Duncan': 'Duncan', 'FolkArt': 'FolkArt', 'Foundry': 'Foundry', 'Humbrol': 'Humbrol', 'Italeri': 'Italeri',
         'Liquitex': 'Liquitex', 'MissionModels': 'Mission Models', 'MrPaint': 'Mr. Paint', 'Revell': 'Revell', 'TomColor': 'Tom Color',
         'Warcolours': 'Warcolours', 'colour-forge': 'Colour Forge', 'warcolours': 'Warcolours'}
for k, v in list(OTHER.items()):
    BRAND.setdefault(norm(v), v)
for a in ['ak real colors', 'ak real colours', 'real colors', 'coat darms', 'coat d armes', 'the foundry', 'wargames foundry', 'mission models paints', 'mr paint',
          'tom color', 'creature caster', 'colourforge', 'colour forge', 'war colours', 'warcolors']:
    BRAND.setdefault(norm(a), {'ak real colors': 'AK Real Colors', 'ak real colours': 'AK Real Colors', 'real colors': 'AK Real Colors'}.get(a) or
                     {'coat darms': "Coat d'Arms", 'coat d armes': "Coat d'Arms", 'the foundry': 'Foundry', 'wargames foundry': 'Foundry',
                      'mission models paints': 'Mission Models', 'mr paint': 'Mr. Paint', 'tom color': 'Tom Color', 'creature caster': 'Creature Caster',
                      'colourforge': 'Colour Forge', 'colour forge': 'Colour Forge', 'war colours': 'Warcolours', 'warcolors': 'Warcolours'}[a])

SKIP = re.compile(r'varnish|medium|thinner|retarder|cleaner|primer|sealer|flow improver|stabili[sz]er|additive|reducer|^set |\bset x|spare .*pots|'
                  r'\bresin\b|conductive|texture|\bgel\b|clear base|airbrush$|^satin |^gloss |^matt |^matte ', re.I)
KEEP = re.compile(r'^(matt|matte|gloss|satin) (black|white)$', re.I)  # Matt Black / Matt White are paints, not finishes

rows = []  # (brand: int or str, name, code, range, hex, source)


def add(b, n, c, r, h, src):
    n = html.unescape(str(n or '')).strip()
    if not n or n.lower() == 'null':
        return
    rows.append((b, n, str(c or '').strip() if str(c or '').lower() != 'null' else '', str(r or '').strip() if str(r or '').lower() != 'null' else '', (h or '').lower(), src))


def one(pattern):
    m = glob.glob(os.path.join(SRC, pattern))
    return m[0] if m else None


d = one('miniature-paints@*')
if d:
    files = {'Army_Painter': 'Army Painter', 'Citadel_Colour': 'Citadel / Warhammer', 'Monument': 'Pro Acryl', 'Vallejo': 'Vallejo', 'AK': 'AK Interactive',
             'TurboDork': 'Turbo Dork', 'Tamiya': 'Tamiya', 'Scale75': 'Scale75', 'GreenStuffWorld': 'Green Stuff World', 'Mig': 'AMMO by Mig', 'MrHobby': 'Mr. Hobby',
             'Reaper': 'Reaper', 'P3': 'Formula P3', 'KimeraKolors': 'Kimera Kolors', 'Golden': 'Golden'}
    for f in sorted(glob.glob(d + '/*.md')):
        k = os.path.basename(f)[:-3]
        if k in ('Pantone', 'RAL'):
            continue
        b = BI[files[k]] if k in files else OTHER.get(k)
        if b is None:
            continue
        L = open(f, encoding='utf-8').read().split('\n')
        hd = [x.strip() for x in L[3].strip('|').split('|')]
        for l in L[5:]:
            if l.startswith('|'):
                c = dict(zip(hd, [x.strip() for x in l.strip('|').split('|')]))
                m = re.search(r'`(#[0-9A-Fa-f]{6})`', c.get('Hex', ''))
                add(b, c.get('Name'), c.get('Code'), c.get('Set'), m.group(1) if m else '', 'mpp')
d = one('hobby-desk-data@*')
if d:
    dirs = {'ak-interactive': 'AK Interactive', 'army-painter': 'Army Painter', 'games-workshop': 'Citadel / Warhammer', 'greenstuffworld': 'Green Stuff World',
            'kimera': 'Kimera Kolors', 'monument-hobbies': 'Pro Acryl', 'p3': 'Formula P3', 'reaper': 'Reaper', 'scale75': 'Scale75', 'turbodork': 'Turbo Dork',
            'two-thin-coats': 'Two Thin Coats', 'vallejo': 'Vallejo'}
    for f in sorted(glob.glob(d + '/*/*.json')):
        dr = f.split('/')[-2]
        for p in json.load(open(f, encoding='utf-8')):
            rng = ' '.join(x for x in (p.get('range'), p.get('category')) if x)
            if f.endswith('ak_real_colors.json'):
                b = 'AK Real Colors'
            else:
                b = BI[dirs[dr]] if dr in dirs else OTHER.get(dr)
            add(b, p.get('name'), p.get('sku'), rng, p.get('hex'), 'hdd')
d = one('minipainter@*')
if d:
    prov = {'citadel': 'Citadel / Warhammer', 'army_painter': 'Army Painter', 'vallejo': 'Vallejo', 'ak_interactive': 'AK Interactive'}
    for f in sorted(glob.glob(d + '/*.json')):
        k = os.path.basename(f)[:-5]
        if k not in prov:
            continue
        for p in json.load(open(f, encoding='utf-8'))['paints']:
            rgb = p.get('rgb') or {}
            add(BI[prov[k]], p['name'], p['id'], '/'.join(p.get('usage_roles') or []), '#%02x%02x%02x' % (rgb.get('r', 0), rgb.get('g', 0), rgb.get('b', 0)) if rgb else '', 'mini')
d = one('paint-conversion@*')
if d:
    pages = {'index.html': 'Citadel / Warhammer', 'vallejo-model.html': 'Vallejo', 'vallejo-game.html': 'Vallejo', 'army-painter.html': 'Army Painter', 'p3.html': 'Formula P3'}
    for f, b in pages.items():
        t = open(os.path.join(d, f), encoding='utf-8').read()
        for m in re.finditer(r'<td class="filled">\s*<strong[^>]*>(.*?)</strong><br>(.*?)</td>', t, re.S):
            parts = [x.strip() for x in html.unescape(m.group(2)).split(' - ')]
            add(BI[b], m.group(1), '', ' '.join(parts[1:-1]), parts[-1] if re.fullmatch(r'#[0-9a-fA-F]{6}', parts[-1]) else '', 'conv')
d = one('citadel-paints-api@*')
if d:
    t = open(os.path.join(d, 'data.ts'), encoding='utf-8').read()
    for n, ty in re.findall(r'name: "([^"]*)",\s*type: "([^"]*)"', t):
        add(BI['Citadel / Warhammer'], n, '', ty, '', 'api')

# Near spellings in one brand: "Bugman Glow" / "Bugman's Glow", "Cassandora" / "Casandora" (one letter out, long names only).
def lev1(a, b):
    if abs(len(a) - len(b)) > 1 or a == b:
        return a == b
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]:
        i += 1
    return a[i + 1:] == b[i + 1:] or a[i + 1:] == b[i:] or a[i:] == b[i + 1:]


squash = lambda t: re.sub(r's\b', '', t).replace(' ', '')
NEAR = {}
for (b, nn), ps in byN.items():
    NEAR.setdefault(b, []).append((squash(nn), ps))


def near(b, nn):
    q = squash(nn)
    if len(q) < 8:
        return None
    hit = [ps for k, ps in NEAR.get(b, []) if k == q] or [ps for k, ps in NEAR.get(b, []) if len(k) >= 8 and lev1(k, q)]
    return hit[0] if len(hit) == 1 else None


ORDER = {'hdd': 0, 'conv': 1, 'mpp': 2, 'mini': 3, 'api': 4}
rows.sort(key=lambda x: ORDER[x[5]])
# Gloss/variant spellings: "Agrax Earthshade (Gloss)" and "Agrax Earthshade Gloss" are the same paint.
cAl, nAl, nCk, known = {}, {}, {}, {}
jac = lambda a, b: len(set(a.split()) & set(b.split())) / max(1, min(len(a.split()), len(b.split())))
for b, n, c, r, h, src in rows:
    if SKIP.search(n) and not KEEP.search(n):
        continue
    nn, cc = norm(n), code(c)
    if isinstance(b, int):
        hit = byN.get((b, nn)) or byN.get((b, norm(re.sub(r'\s*\((gloss|matt|metallic)\)', r' \1', n, flags=re.I))))
        if hit:
            hit = pick(hit, r)
            if len(cc) >= 2 and not any(code(p['c']) == cc for p in hit):
                cAl.setdefault(f'{b}|{cc}', set()).update(p['i'] for p in hit)
            continue
        hit = byC.get((b, cc)) if len(cc) >= 3 else None
        if hit:
            hit = pick(hit, r)
            # Same code, other name: sure only if the names share most words ("Ninjon Dark Ivory" / "Dark Ivory"), else check.
            sure = any(jac(nn, norm(p['n'])) >= .5 or squash(nn) == squash(norm(p['n'])) for p in hit)
            (nAl if sure else nCk).setdefault(f'{b}|{nn}', set()).update(p['i'] for p in hit)
            continue
        hit = near(b, nn)
        if hit:
            (nAl if squash(nn) in [squash(norm(p['n'])) for p in hit] else nCk).setdefault(f'{b}|{nn}', set()).update(p['i'] for p in pick(hit, r))
            continue
    key = (b, nn)
    if key not in known or (not known[key][4] and h) or (not known[key][2] and c):
        known[key] = [b, n, c if not c.count('/') else '', r, h if re.fullmatch(r'#[0-9a-f]{6}', h or '') else '']

# A name alias that equals one of our own names in that brand would be ambiguous; leave those to the normal match.
nAl = {k: v for k, v in nAl.items() if (int(k.split('|')[0]), k.split('|', 1)[1]) not in byN}
nCk = {k: v for k, v in nCk.items() if (int(k.split('|')[0]), k.split('|', 1)[1]) not in byN and k not in nAl}
xs = sorted(known.values(), key=lambda x: (str(x[0]), x[1].lower()))
out = {
    'b': BRAND,
    'c': {k: sorted(v) for k, v in sorted(cAl.items())},
    'n': {k: sorted(v) for k, v in sorted(nAl.items())},
    'k': {k: sorted(v) for k, v in sorted(nCk.items())},  # likely the same paint, but shown as "check" in the import
    'x': xs,
}
js = ('// Background lookup for the My paints CSV import (generated by tools/build_import_aliases.py; do not edit by hand).\n'
      '// Other sites\' names, codes and SKUs for our paints, and paints we don\'t list yet with those sites\' reference colours.\n'
      '// Sources: Arcturus5404/miniature-paints (MIT, Rick Fleuren), alexparlett/hobby-desk-data, ArturSkowronski/minipainter (MIT),\n'
      '// redgrimm/paint-conversion (MIT, David Gill-Comeau), lizkaufman/citadel-paints-api. Never used for wheel swatches.\n'
      'var CSV_AL=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
open('import-aliases.js', 'w', encoding='utf-8').write(js)
print(f"codes {len(cAl)}, names {len(nAl)} sure + {len(nCk)} to check, not on site {len(xs)} "
      f"({sum(1 for x in xs if isinstance(x[0], int))} in our brands), {len(js)//1024} KB")

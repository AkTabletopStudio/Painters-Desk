"""Apply swatch fixes and new paints from hand-painted swatch card photos (owner upload 2026-11-10).

Usage: python3 -I tools/apply_online_swatches.py <folder with replacements.json and new-paints.json>

Source: photos of hand-painted swatch cards (project files data/online-swatches/photos), sampled with the scripts in
data/online-swatches/scripts (right-hand, full-strength half of each card). Only opaque, non-metallic, non-wash paints
whose photo differs clearly (dE76 > 20, hue within 25 deg) were replaced; very dark paints where the photo looked
washed out by glare were left alone. New paints are appended at the end of RAW so existing indices stay the same.
Swatches are estimates from photos.
"""
import json, sys

def main(folder):
    rep = json.load(open(folder + '/replacements.json', encoding='utf-8'))
    new = json.load(open(folder + '/new-paints.json', encoding='utf-8'))
    s = open('data.js', encoding='utf-8').read()
    a0, b0 = s.index('`') + 1, s.index('`;')
    lines = s[a0:b0].split('\n')
    if any('|AK11270|' in l for l in lines):
        sys.exit('already applied')
    todo = {(r['g'], r['name'], r['code'], r['old'].lower()): r['new'] for r in rep}
    g = None; done = set()
    for i, l in enumerate(lines):
        if l.startswith('#'): g = l[1:]; continue
        p = l.split('|')
        if len(p) >= 3:
            k = (g, p[0], p[1], p[2].lower())
            if k in todo and k not in done:
                p[2] = todo[k]; lines[i] = '|'.join(p); done.add(k)
    miss = set(todo) - done
    if miss: sys.exit(f'not found: {miss}')
    add = ['#Ï'] + [f'{n}||{h}' for n, h in new['ion']]
    add += ['#Ť'] + [f'{n}|{c}|{h}' for n, c, h in new['ak']]
    add += ['#Ç'] + [f'{n}|Pure Pigments|{h}' for n, h in new['kim']]
    raw = '\n'.join(lines).rstrip('\n') + '\n' + '\n'.join(add)
    open('data.js', 'w', encoding='utf-8').write(s[:a0] + raw + s[b0:])
    print(len(done), 'replaced,', len(add) - 3, 'added')

if __name__ == '__main__':
    main(*sys.argv[1:])

#!/usr/bin/env python3
"""Build backlog-names.js (game -> faction -> unit NAMES) from BSData catalogue repos (github.com/BSData).

Only names are taken: the game system name, each faction catalogue's name and the names of the units/models
it lists. No rules, profiles, points or other text. BSData repos carry no licence file; names of units are
product names used to describe a painter's own models.

Usage: python3 tools/build_backlog_names.py OUT.json REPO_DIR [REPO_DIR ...]
       python3 tools/build_backlog_names.py --js OUT.json backlog-names.js   (merge a JSON into the site file)
Each REPO_DIR is a clone (or unzipped download) of one BSData repo: one .gst/.gstz and its .cat/.catz files.
"""
import sys, os, re, json, zipfile
import xml.etree.ElementTree as ET

def load(path):
    if path.endswith('z'):
        with zipfile.ZipFile(path) as z:
            return ET.fromstring(z.read(z.namelist()[0]))
    return ET.parse(path).getroot()

def tag(e): return e.tag.split('}')[-1]
def kids(e, name): return [c for c in e if tag(c) == name]

SKIP = re.compile(r'^(\[|\(|Detachment|Game Type|Battle Size|Configuration|Show/Hide|Army Rule|Legends|Crusade|'
                  r'Warlord|Enhancement|Stratagem|Faction|Allegiance|Grand Strategy|Battle Tactic|Battle Traits?|'
                  r'Spell|Prayer|Manifestation Lore|Lore of|Regiments? of Renown|Heroic Trait|Artefact|Triumph|'
                  r'Notes?|Rules?|Roster|Point|Upgrade|Mission|Secondary|Primary|Tactical|Ploy|Equipment|Option|'
                  r'Selections?|Settings?|Allied|Ally|Allies|Reference|Psychic|Unit Filter|Army Composition)\b', re.I)

def clean(n):
    n = re.sub(r'\s+', ' ', (n or '')).strip()
    n = re.sub(r'\s*\[(Legends|Legacy|Unaligned|FW|Forge ?World|NPO|OOP|Imperial Armour)\]\s*$', '', n, flags=re.I)
    return n

def repo_names(d):
    files = []
    for root, _, fs in os.walk(d):
        if '.git' in root: continue
        files += [os.path.join(root, f) for f in fs if re.search(r'\.(gst|cat)z?$', f)]
    game, cats, byid = None, [], {}
    for f in files:
        try: r = load(f)
        except Exception as e: print('skip', f, e, file=sys.stderr); continue
        if tag(r) == 'gameSystem': game = clean(r.get('name'))
        for e in r.iter():
            if tag(e) == 'selectionEntry' and e.get('id'): byid[e.get('id')] = e.get('type')
        if tag(r) == 'catalogue': cats.append(r)
    out = []
    for c in cats:
        if c.get('library') == 'true': continue
        names = set()
        for grp in kids(c, 'selectionEntries'):
            for e in kids(grp, 'selectionEntry'):
                if e.get('type') in ('unit', 'model') and e.get('hidden') != 'true': names.add(clean(e.get('name')))
        for grp in kids(c, 'entryLinks'):
            for e in kids(grp, 'entryLink'):
                if e.get('type') == 'selectionEntry' and byid.get(e.get('targetId')) in ('unit', 'model') and e.get('hidden') != 'true':
                    names.add(clean(e.get('name')))
        names = sorted(n for n in names if n and len(n) <= 80 and not SKIP.match(n))
        if names: out.append([clean(c.get('name')), names])
    out.sort(key=lambda x: x[0].lower())
    return game, out

def main(a):
    if a[0] == '--js':
        data = json.load(open(a[1], encoding='utf-8'))
        with open(a[2], 'w', encoding='utf-8') as f:
            f.write('// Game, faction and unit names for the Backlog suggestions, built by tools/build_backlog_names.py from\n'
                    '// BSData catalogues (github.com/BSData). Names only: no rules, points or other text. [game, [[faction, [units]]]]\n')
            f.write('window.BL_NAMES=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
        return
    games = []
    for d in a[1:]:
        g, fac = repo_names(d)
        if g and fac:
            games.append([g, fac]); print(f'{g}: {len(fac)} factions, {sum(len(x[1]) for x in fac)} units', file=sys.stderr)
    json.dump(games, open(a[0], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

if __name__ == '__main__': main(sys.argv[1:])

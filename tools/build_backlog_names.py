#!/usr/bin/env python3
"""Build backlog-units.js (game -> faction -> unit NAMES) from BSData catalogue repos (once github.com/BSData,
now copies kept by other GitHub users after BSData took its repos down in November 2026).

Only names are taken: each faction catalogue's name and the names of the units/models it lists. No rules,
profiles, points or other text. Reads BattleScribe .gst/.cat(z) XML and the JSON form of the same files.

Usage: python3 tools/build_backlog_names.py OUT.json "Game title=DIR[;glob,glob]" ...
       python3 tools/build_backlog_names.py --js OUT.json backlog-units.js
"Game title" is the name shown on the site (match backlog-names.js). DIR is one copied repo; the optional
globs pick which files in it to read (e.g. only one edition), default every .gst/.cat/.json file.
"""
import sys, os, re, json, zipfile, fnmatch
import xml.etree.ElementTree as ET

def tag(e): return e.tag.split('}')[-1]
def kids(e, name): return [c for c in e if tag(c) == name]

def from_json(k, v):
    # The JSON copies mirror the XML: {"catalogue": {..., "entryLinks": [{...}]}} -> <catalogue><entryLinks><entryLink/>
    e = ET.Element(k)
    for a, b in v.items():
        if isinstance(b, list):
            c = ET.SubElement(e, a)
            child = re.sub(r'^shared(\w)', lambda m: m.group(1).lower(), a)
            child = child[:-3] + 'y' if child.endswith('ies') else child[:-1]
            for x in b:
                if isinstance(x, dict): c.append(from_json(child, x))
        elif not isinstance(b, dict) and b is not None:
            e.set(a, str(b).lower() if isinstance(b, bool) else str(b))
    return e

def load(path):
    if path.endswith('.json'):
        d = json.load(open(path, encoding='utf-8'))
        k = next((k for k in ('gameSystem', 'catalogue') if k in d), None)
        return from_json(k, d[k]) if k else None
    if path.endswith('z'):
        with zipfile.ZipFile(path) as z:
            return ET.fromstring(z.read(z.namelist()[0]))
    return ET.parse(path).getroot()

SKIP = re.compile(r'^(\[|\(|Detachment|Game Type|Battle Size|Configuration|Show/Hide|Army Rule|Legends|Crusade|'
                  r'Warlord|Enhancement|Stratagem|Faction|Allegiance|Grand Strategy|Battle Tactic|Battle Traits?|'
                  r'Spell|Prayer|Manifestation Lore|Lore of|Regiments? of Renown|Heroic Trait|Artefact|Triumph|'
                  r'Notes?|Rules?|Roster|Point|Upgrade|Mission|Secondary|Primary|Tactical|Ploy|Equipment|Option|'
                  r'Selections?|Settings?|Allied|Ally|Allies|Reference|Psychic|Unit Filter|Army Composition|'
                  r'Command Card|Lvl \d|Dead or Dismissed|Inducement)\b|^(Mercenary|Journeyman) \[', re.I)
SKIP_FAC = re.compile(r'^(College of|Non-player|Battlefield Fortifications|Universal|Library)\b', re.I)

def tidy(n):
    n = re.sub(r'\s+', ' ', (n or '')).strip().lstrip('>').strip().rstrip('*').strip()
    n = re.sub(r'\s*\[(Legends|Legacy|Unaligned|FW|Forge ?World|NPO|OOP|Imperial Armour|retired|Formation Support|[A-Z]{1,3}\d{2,4})\]\s*', ' ', n, flags=re.I).strip()
    sized = re.search(r'\(\d+\)', n)
    n = re.sub(r'\s*\((Scourge of \w+|Legends|\d+)\)\s*', ' ', n, flags=re.I).strip()          # AoS copies, "(10)" sizes
    if sized: n = re.sub(r'\s+(Troop|Regiment|Horde|Legion|Large Infantry|Monster|Hero|Fleet)$', '', n)      # Kings of War unit sizes
    n = re.sub(r'\s*\([A-Z]{1,4}\d{2,4}[A-Za-z]{0,2}\)$', '', n).replace('*', '')                                             # Flames of War box codes
    n = re.sub(r'^[•*]+\s*(\[[^\]]*\]\s*)?', '', n).rstrip('*').strip()                        # Legion uniques, Team Yankee tags
    head, par, rest = n.partition('(')                                                               # MARVEL NAMES (Real Name)
    if len(head) > 5 and re.search(r'[A-Z]{3}', head) and not re.search(r'[a-z]', head): n = head.title() + par + rest
    return n

def fac_name(n):
    n = re.sub(r'^[\(\[\{](Good|Neutral|Evil)[\)\]\}]\s*', '', tidy(n))                              # Kings of War sides
    n = n.split(' - ')[-1].strip()                                                                  # "Imperium - Space Marines"
    return n[:1].upper() + n[1:]

def repo_names(d, globs):
    files = []
    for root, dirs, fs in os.walk(d):
        dirs[:] = [x for x in dirs if not x.startswith('.')]
        for f in fs:
            rel = os.path.relpath(os.path.join(root, f), d)
            if re.search(r'\.(gst|cat)z?$|\.json$', f) and (not globs or any(fnmatch.fnmatch(rel, g) for g in globs)):
                files.append(os.path.join(root, f))
    cats, byid = [], {}
    for f in files:
        try: r = load(f)
        except Exception as e: print('skip', f, e, file=sys.stderr); continue
        if r is None: continue
        for e in r.iter():
            if tag(e) == 'selectionEntry' and e.get('id'): byid[e.get('id')] = e.get('type')
        if tag(r) == 'catalogue': cats.append(r)
    out = {}
    for c in cats:
        if c.get('library') == 'true': continue
        names = set()
        for grp in kids(c, 'selectionEntries') + kids(c, 'sharedSelectionEntries'):
            for e in kids(grp, 'selectionEntry'):
                if e.get('type') in ('unit', 'model') and e.get('hidden') != 'true' and tag(grp) == 'selectionEntries': names.add(tidy(e.get('name')))
        for grp in kids(c, 'entryLinks'):
            for e in kids(grp, 'entryLink'):
                if e.get('type') == 'selectionEntry' and byid.get(e.get('targetId')) in ('unit', 'model') and e.get('hidden') != 'true':
                    names.add(tidy(e.get('name')))
        names = {re.sub(r'\s*\[\d+\]$', '', n) for n in names if n and len(n) <= 80 and not SKIP.match(n) and ' or ' not in n and ';' not in n and not n.endswith('[Crucible]')}
        f = fac_name(c.get('name'))
        if names and not SKIP_FAC.match(f): out.setdefault(f, set()).update(names)
    fac = sorted(([f, sorted(u, key=str.lower)] for f, u in out.items()), key=lambda x: x[0].lower())
    if len(fac) == 1: fac[0][0] = ''      # one-faction games (Frostgrave, Marvel Crisis Protocol): units only
    return fac

def main(a):
    if a[0] == '--js':
        data = json.load(open(a[1], encoding='utf-8'))
        with open(a[2], 'w', encoding='utf-8') as f:
            f.write('// Faction and unit names for the Backlog suggestions, built by tools/build_backlog_names.py from copies of\n'
                    '// the BSData catalogues. Names only: no rules, points or other text. [game, [[faction, [units]]]]\n'
                    '// Kept apart from backlog-names.js so it can be deleted on its own: the Backlog works without it.\n')
            f.write('window.BL_UNITS=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
        return
    games = []
    for spec in a[1:]:
        g, rest = spec.split('=', 1)
        d, _, gl = rest.partition(';')
        fac = repo_names(d, [x for x in gl.split(',') if x])
        if fac:
            games.append([g, fac]); print(f'{g}: {len(fac)} factions, {sum(len(x[1]) for x in fac)} units', file=sys.stderr)
    json.dump(games, open(a[0], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

if __name__ == '__main__': main(sys.argv[1:])

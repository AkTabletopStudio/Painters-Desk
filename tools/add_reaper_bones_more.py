"""Append more Reaper Bones paints (from Reaper's store tiles) to data.js as a second 'Ŷ' block.

Usage: ffmpeg -i reaper-screen-recording-2026-11-21.mp4 -vf fps=15 <frames>/a%03d.png
       ffmpeg -i reaper-screen-recording-2026-11-21b.mp4 -vf fps=15 <frames2>/a%03d.png
       ffmpeg -i reaper-screen-recording-2026-11-21c.mp4 -vf fps=15 <frames3>/a%03d.png
       python3 -I tools/add_reaper_bones_more.py <frames dir> <frames2 dir> <frames3 dir> <09496 screenshot> [check.png]
Needs Pillow.

Source: a screen recording by the owner (2026-11-21, data/reaper/bones-2/) scrolling reapermini.com's Bones paint
listing, and two more recordings (…-21b.mp4, …-21c.mp4) of the same store in its two-column grid for 09455-09481.
Solid White is a white tile on the white page, so it is taken as #ffffff.
09496 Reliquary Gold comes from the owner's screenshot of Reaper's same tile on a retailer page (talon.games),
data/reaper/bones-2/09496-reliquary-gold-talon-games.png (left-edge strip median).
09455-09495 are flat square tiles (median of a strip down the tile's left edge, clear of the text);
09497-09508 are glossy round tiles (median of the whole ball, leaving out the white text and highlight and the black
text outline). These are Reaper's web tile colours, not photos of paint, so every colour is an estimate.
Skeleton Key, Drow Silver and Cursed Gold are metallic (gradient tiles, MET_K). Elven Green (09488) has no tile
image in the recordings; it was added afterwards by hand at the end of RAW from the owner's screenshot
data/reaper/bones-2/09488-elven-green-reapermini.png (left-edge strip median of the tile, #264033).
Name 09500 is the product title 'Brinewind Brown' (its tile art says 'Brinewood').
"""
import re, statistics as st, sys
from PIL import Image, ImageDraw

# code, name, frame number, a y inside the tile
T = [(9465, 'Skeleton Key', 69, 800), (9466, 'Dungeon Grey', 63, 980), (9467, 'Crimson Red', 49, 1080),
     (9468, 'Brilliant Red', 35, 930), (9469, 'Fireball Orange', 25, 930), (9470, 'Golden Yellow', 5, 1050),
     (9471, 'Bright Turquoise', 5, 2000), (9482, 'Suntan Flesh', 200, 680), (9483, 'Twilight Purple', 195, 670),
     (9484, 'Pale Saffron', 193, 970), (9485, 'Meadow Green', 186, 760), (9486, 'Tendril Pink', 180, 760),
     (9487, 'Yellow Mold', 168, 700), (9489, "Siren's Song", 154, 760), (9490, 'Bugbear Fur', 146, 720),
     (9491, 'Minotaur Hide', 138, 830), (9492, 'Wyvern Leather', 126, 790), (9493, 'Gargoyle Grey', 115, 740),
     (9494, 'Gnome Flesh', 104, 690), (9495, 'Drow Silver', 91, 730),
     (9497, 'Mermaid Scale', 329, 1800), (9498, 'Doxy Blush', 295, 650), (9499, 'Treasure Map', 290, 760),
     (9500, 'Brinewind Brown', 286, 780), (9501, 'Pieces of Eight', 278, 790), (9502, 'Stormchaser Blue', 274, 690),
     (9503, 'Ghostfire', 265, 720), (9504, 'Skull and Crossbones', 254, 800), (9505, 'Chum Red', 244, 690),
     (9506, 'Sharkbite', 235, 690), (9507, 'Kraken Ink', 230, 820), (9508, 'Squog Green', 221, 860)]
# second and third recordings, two columns of ~523 px tiles: code, name, recording (2 or 3), frame, left edge x, y inside
T2 = [(9455, 'Troll Hide', 2, 1, 100, 800), (9456, 'Orc Skin', 2, 1, 670, 800), (9457, 'Goblin Skin', 2, 1, 100, 1900),
      (9458, 'Kobold Scale', 2, 1, 670, 1900), (9459, 'Ogre Skin', 2, 30, 100, 1100), (9460, 'Gnoll Pelt', 2, 30, 670, 1100),
      (9461, 'Vampiric Mist', 2, 30, 100, 2180), (9462, 'Succubus Kiss', 2, 30, 670, 2180),
      (9463, 'Eldritch Purple', 2, 60, 100, 1120), (9464, 'Cursed Gold', 2, 60, 670, 1120),
      (9472, 'Dragon Blue', 3, 14, 670, 1080), (9473, 'Gem Purple', 3, 14, 100, 2160),
      (9474, 'Caucasian Flesh', 3, 14, 670, 2160), (9475, 'Maiden Flesh', 3, 27, 100, 1760),
      (9476, 'Woodland Brown', 3, 27, 670, 1760), (9477, 'Witchcraft Purple', 3, 54, 100, 730),
      (9478, 'Solid White', 3, 41, 670, None), (9479, 'Solid Black', 3, 68, 100, 950),
      (9480, 'Blue Flame', 3, 68, 670, 950), (9481, 'Turf Green', 3, 68, 100, 2030)]


def run(im, x, y, g):
    nb = lambda yy: min(im.getpixel((x, yy))) < 235
    a = b = y
    gap = 0
    while a > 150 and gap < g:
        a -= 1
        gap = 0 if nb(a) else gap + 1
    a += gap
    gap = 0
    while b < 2700 and gap < g:
        b += 1
        gap = 0 if nb(b) else gap + 1
    return a, b - gap


def med(px):
    return '#%02x%02x%02x' % tuple(round(st.median(p[k] for p in px)) for k in range(3))


def main():
    d = sys.argv[1].rstrip('/')
    out = []
    dirs = {2: sys.argv[2].rstrip('/'), 3: sys.argv[3].rstrip('/')}
    for code, name, k, n, x, y in T2:
        im = Image.open(f'{dirs[k]}/a{n:03d}.png').convert('RGB')
        if y is None:  # Solid White: a white tile on the white page
            out.append((code, name, '#ffffff', Image.new('RGB', (60, 60), 'white')))
            continue
        a, b = run(im, x + 10, y, 3)
        assert 430 < b - a < 560, (code, a, b)
        px = [im.getpixel((i, j)) for i in range(x, x + 40, 2) for j in range(a + 16, b - 16, 2)]
        out.append((code, name, med(px), im.crop((x - 12, a, x + 512, b)).resize((60, int(60 * (b - a) / 524)))))
    shot = Image.open(sys.argv[4]).convert('RGB')  # 924 x 1999 phone screenshot, tile at x 33-891, y 440-1299
    px = [shot.getpixel((i, j)) for i in range(45, 105, 2) for j in range(460, 1280, 4)]
    out.append((9496, 'Reliquary Gold', med(px), shot.crop((33, 440, 891, 1299)).resize((60, 60))))
    for code, name, n, y in T:
        im = Image.open(f'{d}/a{n:03d}.png').convert('RGB')
        if code < 9497:
            a, b = run(im, 362, y, 3)
            assert 560 < b - a < 660, (code, a, b)
            box = (352, a + 20, 392, b - 20)
        else:
            a, b = run(im, 642, y, 45)
            a = b - 553  # the balls are 553 px across; white text can split the run, its bottom edge is reliable
            r, cy = (b - a) / 2 - 12, (a + b) / 2
            px = [p for i in range(642 - 270, 642 + 270, 3) for j in range(a, b, 3)
                  if (i - 642) ** 2 + (j - cy) ** 2 < r * r
                  for p in [im.getpixel((i, j))] if sum(p) > 30 and min(p) < 225]
        if code < 9497:
            px = [im.getpixel((i, j)) for i in range(box[0], box[2], 2) for j in range(box[1], box[3], 2)]
        out.append((code, name, med(px), im.crop((300, a, 984, b)).resize((60, int(60 * (b - a) / 684)))))
    src = open('data.js', encoding='utf-8').read()
    if '|9455|' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ŷ'] + [f'{nm}|{c}|{h}' for c, nm, h, _ in sorted(out, key=lambda o: o[0])]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(out))
    if len(sys.argv) > 5:
        H = 56
        sheet = Image.new('RGB', (760, H * 32), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (c, nm, h, cr) in enumerate(sorted(out, key=lambda o: o[0])):
            ox, oy = i // 32 * 380, i % 32 * H
            sheet.paste(cr, (ox, oy))
            dr.rectangle((ox + 66, oy + 4, ox + 116, oy + H - 6), fill=h)
            dr.text((ox + 122, oy + 20), f'{c} {nm} {h}', fill='black')
        sheet.save(sys.argv[5])


if __name__ == '__main__':
    main()

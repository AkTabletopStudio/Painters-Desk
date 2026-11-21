"""Append more Reaper Bones paints (from Reaper's store tiles) to data.js as a second 'Ŷ' block.

Usage: ffmpeg -i reaper-screen-recording-2026-11-21.mp4 -vf fps=15 <frames>/a%03d.png
       python3 -I tools/add_reaper_bones_more.py <frames dir> [check.png]
Needs Pillow.

Source: a screen recording by the owner (2026-11-21, data/reaper/bones-2/) scrolling reapermini.com's Bones paint
listing. 09465-09495 are flat square tiles (median of a strip down the tile's left edge, clear of the text);
09497-09508 are glossy round tiles (median of the whole ball, leaving out the white text and highlight and the black
text outline). These are Reaper's web tile colours, not photos of paint, so every colour is an estimate.
Skeleton Key and Drow Silver are metallic (gradient tiles, MET_K). Elven Green (09488) and Turf Green have no tile
image on the store, so they are left out, as are codes the recording does not show.
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
    if '|9465|' in src:
        sys.exit('already present')
    head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
    lines = ['#Ŷ'] + [f'{nm}|{c}|{h}' for c, nm, h, _ in out]
    open('data.js', 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + '\n'.join(lines) + tail)
    print('added', len(out))
    if len(sys.argv) > 2:
        H = 56
        sheet = Image.new('RGB', (760, H * 16), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (c, nm, h, cr) in enumerate(out):
            ox, oy = i // 16 * 380, i % 16 * H
            sheet.paste(cr, (ox, oy))
            dr.rectangle((ox + 66, oy + 4, ox + 116, oy + H - 6), fill=h)
            dr.text((ox + 122, oy + 20), f'{c} {nm} {h}', fill='black')
        sheet.save(sys.argv[2])


if __name__ == '__main__':
    main()

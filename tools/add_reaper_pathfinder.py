"""Append Reaper Master Series Paints: Pathfinder Colors of Golarion (89501-89556) to data.js.

Usage: ffmpeg -i reapermini-pathfinder-scroll.mp4 -vf fps=6 <frames>/f%03d.png
       python3 -I tools/add_reaper_pathfinder.py <frames dir> [check.png]
Needs Pillow.

Source: a screen recording by the owner (2026-11-15, project folder data/reaper/pathfinder/) scrolling Reaper's own
store page for the range on reapermini.com. Each paint is shown as a flat colour tile with its number and name.
Tiles are found in each frame (two columns, ~523 px squares), sampled as the median of a strip down the left edge of
the tile (clear of the white/black text and the Pathfinder logo), and de-duplicated across frames in scroll order,
giving 28 rows of 2. Unicorn White's tile is pure white on the white page, so it is taken as #ffffff.
These are Reaper's web tile colours, not photos of paint: Andoran Blue and Ezren Blue share one tile colour there.
The 8 metallics (89549-89556) have gradient tiles; their swatch is the strip median. Group 'Ÿ', code = SKU.
"""
import glob, re, statistics as st, sys
from PIL import Image, ImageDraw

NAMES = ['Shelyn Blush', 'Milani Rose', 'Sinspawn Pink', 'Seoni Scarlet', 'Merisiel Red', 'Cailean Wine',
         'Asmodeus Red', 'Urgathoa Red', 'Cavalier Orange', 'Numeria Rust', 'Osirian Sand', 'Cairn Stone',
         'Calistria Yellow', 'Sarenrae Yellow', 'Boggard Green', 'Alchemical Green', 'Lini Green', 'Tian Xia Jade',
         'Goblin Green', 'Hodag Green', 'Medusa Green', 'Grindylow Blue', 'Akata Blue', 'Ice Devil Blue',
         'Irrisen Blue', 'Marid Blue', 'Andoran Blue', 'Ezren Blue', 'Hobgoblin Blue', 'Desna Blue', 'Kraken Purple',
         'Ghoul Violet', 'Azlanti Violet', 'Arclord Purple', 'Pharasma Purple', 'Seugathi Purple',
         'Thuvian Sun Orchid', 'Mwangi Brown', 'Kellid Tan', 'Taldan Pink', 'Kyonin Beige', 'Shoanti Sienna',
         'Gug Umber', 'Mana Waste Gray', 'Gozreh Gray', 'Besmara Black', 'Unicorn White', 'Skeleton White',
         'Cold Iron', 'Crusader Silver', 'Keleshite Gold', 'Valeros Gold', 'Brevoy Copper', 'Clockwork Brass',
         'Brigh Bronze', 'Adamantine']
XL,XR=112,682
def runs(im,x):
    out=[];s=None
    for y in range(200,2700):
        p=im.getpixel((x,y)); nb=min(p)<238
        if nb and s is None: s=y
        if not nb and s is not None:
            if 480<=y-s<=560: out.append((s,y))
            s=None
    return out
def med(im,x0,y0,y1):
    px=[im.getpixel((x,y)) for x in range(x0,x0+60,2) for y in range(y0+15,y1-15,4)]
    return tuple(round(st.median(p[i] for p in px)) for i in range(3))
seq=[]
def main():
  for f in sorted(glob.glob(sys.argv[1].rstrip('/')+'/f*.png')):
      im=Image.open(f).convert('RGB')
      L=runs(im,XL); R=runs(im,XR)
      ys=sorted(set([a for a,b in L]+[c for c,d in R]))
      used=set()
      for a in ys:
          if any(abs(a-u)<15 for u in used): continue
          used.add(a)
          l=[(c,d) for c,d in L if abs(c-a)<15]; r=[(c,d) for c,d in R if abs(c-a)<15]
          lc=med(im,XL,*l[0]) if l else None
          rc=med(im,XR,*r[0]) if r else None
          seq.append((f,a,lc,rc))
  def close(p,q): return p is not None and q is not None and sum(abs(p[i]-q[i]) for i in range(3))<15
  rows=[]
  for f,a,lc,rc in seq:
      hit=None
      for i,r in enumerate(rows):
          if (lc and close(r[1],lc)) and (rc is None or r[2] is None or close(r[2],rc)): hit=i
          elif lc is None and rc and close(r[2],rc): hit=i
      if hit is not None:
          r=rows[hit]; rows[hit]=(r[0],r[1] or lc,r[2] or rc,r[3]); continue
      rows.append((f,lc,rc,a))
  h=lambda c:'#%02x%02x%02x'%c if c else None
  assert len(rows) == 28, len(rows)
  cols = []
  for r in rows:
      cols += [h(r[1]) or '#ffffff', h(r[2])]
  src = open('data.js', encoding='utf-8').read()
  if '\n#Ÿ\n' in src:
      sys.exit('Pathfinder already present')
  head, body, tail = re.match(r'(.*?const RAW=`)(.*?)(`;.*)', src, re.S).groups()
  lines = ['#Ÿ'] + [f'{n}|{89501 + i}|{c}' for i, (n, c) in enumerate(zip(NAMES, cols))]
  open('data.js', 'w', encoding='utf-8').write(head + body + '\n' + '\n'.join(lines) + tail)
  print('added', len(cols))
  if len(sys.argv) > 2:
      W, H = 360, 26
      sheet = Image.new('RGB', (W * 2, H * 28), 'white')
      d = ImageDraw.Draw(sheet)
      for i, (n, c) in enumerate(zip(NAMES, cols)):
          ox, oy = i // 28 * W, i % 28 * H
          d.rectangle((ox, oy, ox + 50, oy + H - 2), fill=c, outline='#999')
          d.text((ox + 58, oy + 7), f'{89501 + i} {n} {c}', fill='black')
      sheet.save(sys.argv[2])


if __name__ == '__main__':
  main()

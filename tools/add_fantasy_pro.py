"""Append Vallejo Fantasy-Pro (made with Nocturna Models) to data.js.

Usage: python3 -I tools/add_fantasy_pro.py <antinea-fantasy-pro-database.pdf>
Needs Pillow, numpy and poppler (pdfimages).

Sources (project files data/nocturna/):
- Vallejo's step-by-step set sheets for 74.101 Fairy Flesh, 74.102 Malefic Flesh, 74.103 Crimson Red and 74.104
  Imperial Purple (owner uploads 2026-11-07): names and codes are typed from their Contents rows (English names).
- Antinea's "Vallejo/Nocturna - Fantasy Pro Database": one photo per paint, codes 74.001-74.032 in order, of a
  bottle whose white-primed dropper tip was airbrushed with the paint. Swatches are the median of the tip, so they are
  estimates of a photo of a thin airbrushed coat.
Group: 'Õ' Fantasy-Pro, under Vallejo.
"""
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

NAMES = {
    1: 'Nocturna Shadow', 2: 'Burned Flesh', 3: 'Reddish Flesh', 4: 'Base Flesh', 5: 'Medium Flesh', 6: 'Natural Flesh',
    7: 'Fairy Flesh', 8: 'Highlight Skin',
    9: 'Deep Forest Skin', 10: 'Frozen Flesh', 11: 'Purple Shadow', 12: 'Malefic Flesh', 13: 'Forest Skin', 14: 'Cold Flesh',
    15: 'Pale Flesh', 16: 'White Flesh',
    17: 'Chalice Red', 18: 'Crimson', 19: 'Devil Red', 20: 'Sanctuary Red', 21: 'Magenta Blood', 22: 'Inferno Red',
    23: 'Worn Red', 24: 'Fire Flame',
    25: 'Imperial Purple', 26: 'Purple Hex', 27: 'Amethyst', 28: 'Witch Purple', 29: 'Lipstick', 30: 'Violet Vamp',
    31: 'Blueberry', 32: 'Orchid Light',
}
TIP = (118, 45, 152, 105)  # x0, y0, x1, y1 of the dropper tip in each 272 x 734 photo


def main(pdf):
    s = open('data.js', encoding='utf-8').read()
    a, b = s.index('`') + 1, s.index('`;')
    raw = s[a:b]
    if '\n#Õ\n' in raw:
        sys.exit('Fantasy-Pro already in data.js')
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-j', pdf, os.path.join(tmp, 'f')], check=True)
    rows = []
    for n, name in NAMES.items():
        im = np.asarray(Image.open(os.path.join(tmp, f'f-{n - 1:03d}.jpg')).convert('RGB')).astype(float)
        x0, y0, x1, y1 = TIP
        rgb = np.median(im[y0:y1, x0:x1].reshape(-1, 3), 0)
        rows.append(f'{name}|74.{n:03d}|#%02x%02x%02x' % tuple(int(round(v)) for v in rgb))
    s = s[:a] + raw.rstrip('\n') + '\n#Õ\n' + '\n'.join(rows) + s[b:]
    open('data.js', 'w', encoding='utf-8').write(s)
    print(f'added {len(rows)} paints')
    print('\n'.join(rows))


if __name__ == '__main__':
    main(sys.argv[1])

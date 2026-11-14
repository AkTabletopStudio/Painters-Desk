#!/usr/bin/env python3
"""Makes the two Classic theme icons (icons/themes/classic.svg, classicd.svg): a plain 12-step colour wheel on a flat tile.
Run from the repo root: python3 tools/theme_classic.py"""
import math
HUES = ['#e5484d', '#f2762e', '#f5a524', '#f2cf30', '#a6c937', '#46a758', '#12a594', '#0f9bd8', '#3e63dd', '#6e56cf', '#a144af', '#d6409f']

def wedge(i, r1, r2, cx=256, cy=256, gap=1.6):
    a0 = math.radians(i * 30 - 90 + gap); a1 = math.radians((i + 1) * 30 - 90 - gap)
    p = lambda r, a: f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}'
    return f'M{p(r2, a0)}A{r2} {r2} 0 0 1 {p(r2, a1)}L{p(r1, a1)}A{r1} {r1} 0 0 0 {p(r1, a0)}Z'

def icon(bg, edge, hub):
    w = ''.join(f'<path d="{wedge(i, 96, 186)}" fill="{c}"/>' for i, c in enumerate(HUES))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
            f'<rect x="12" y="12" width="488" height="488" rx="96" fill="{bg}" stroke="{edge}" stroke-width="8"/>{w}'
            f'<circle cx="256" cy="256" r="52" fill="{hub}"/></svg>\n')

open('icons/themes/classic.svg', 'w').write(icon('#ffffff', '#c3c8d0', '#d0d5dc'))
open('icons/themes/classicd.svg', 'w').write(icon('#2a2c30', '#4b4f57', '#4b4f57'))

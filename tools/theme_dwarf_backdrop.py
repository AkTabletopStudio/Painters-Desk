"""Dwarven hall backdrop: receding stepped stone arches with gold inlay, jade pillars,
a lit doorway, braziers. Original geometric artwork, generated. Usage: python3 dwarf.py out.svg"""
import math, random, sys
random.seed(3)
W, H = 1600, 1000
VX, VY = 800, 470  # vanishing point
o = []
def f(v): return f"{v:.1f}".rstrip('0').rstrip('.')
def add(s): o.append(s)
def poly(pts): return 'M' + 'L'.join(f"{f(x)} {f(y)}" for x, y in pts) + 'Z'

def arch(s):
    """stepped dwarven arch scaled by s about the vanishing point; returns outline points"""
    hw, base, sh, top = 560 * s, 560 * s, 300 * s, 520 * s
    st = 40 * s
    pts = [(-hw, base), (-hw, -sh * .2), (-hw + st, -sh * .2), (-hw + st, -sh * .5),
           (-hw * .55, -sh), (-hw * .55, -sh - st), (-hw * .2, -top + st * .4), (0, -top),
           (hw * .2, -top + st * .4), (hw * .55, -sh - st), (hw * .55, -sh), (hw - st, -sh * .5),
           (hw - st, -sh * .2), (hw, -sh * .2), (hw, base)]
    return [(VX + x, VY + y) for x, y in pts]

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">')
add('<defs>'
    '<radialGradient id="door" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffe3a8"/><stop offset=".5" stop-color="#e9a54c"/><stop offset="1" stop-color="#7a4a1c"/></radialGradient>'
    '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>'
    '<radialGradient id="blue" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8fe3ff" stop-opacity=".6"/><stop offset="1" stop-color="#8fe3ff" stop-opacity="0"/></radialGradient>'
    '<radialGradient id="halo" cx=".5" cy=".47" r=".6"><stop offset="0" stop-color="#3d6b5c" stop-opacity=".55"/><stop offset="1" stop-color="#3d6b5c" stop-opacity="0"/></radialGradient>'
    '<linearGradient id="pil" x1="0" x2="1"><stop offset="0" stop-color="#0d1916"/><stop offset=".45" stop-color="#2a4a40"/><stop offset=".6" stop-color="#1d362f"/><stop offset="1" stop-color="#0a1311"/></linearGradient>'
    '<linearGradient id="flr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16251f"/><stop offset="1" stop-color="#0b1210"/></linearGradient>'
    '</defs>')
add(f'<rect width="{W}" height="{H}" fill="#0b1311"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#halo)"/>')

# receding arches, far to near; each band filled with stone, rimmed in gold
scales = [0.12 * (1.32 ** i) for i in range(11)]
for i, s in reversed(list(enumerate(scales))):
    pass
for i in range(len(scales) - 1, -1, -1):
    s = scales[i]
    depth = i / (len(scales) - 1)          # 0 far .. 1 near
    shade = 0.10 + 0.5 * (1 - depth)       # far arches are lit by the door
    g = int(26 + 40 * (1 - depth)); r = int(16 + 20 * (1 - depth)); b = int(22 + 32 * (1 - depth))
    add(f'<path d="{poly(arch(s))}" fill="rgb({r},{g},{b})"/>')
    add(f'<path d="{poly(arch(s * .93))}" fill="rgb({r-6},{g-8},{b-7})"/>')
    gold_op = .25 + .6 * (1 - depth)
    add(f'<path d="{poly(arch(s))}" fill="none" stroke="#c99a45" stroke-width="{f(1 + 3 * s)}" opacity="{f(gold_op)}" stroke-linejoin="miter"/>')
    add(f'<path d="{poly(arch(s * .965))}" fill="none" stroke="#8a6a2e" stroke-width="{f(.6 + 1.2 * s)}" opacity="{f(gold_op * .8)}"/>')

# lit doorway at the end of the hall
ds = scales[0] * .7
door = [(VX - 60 * ds * 8, VY + 70), (VX - 60 * ds * 8, VY - 40), (VX, VY - 90), (VX + 60 * ds * 8, VY - 40), (VX + 60 * ds * 8, VY + 70)]
add(f'<ellipse cx="{VX}" cy="{VY}" rx="260" ry="220" fill="url(#glow)"/>')
add(f'<path d="{poly(door)}" fill="url(#door)"/>')
add(f'<path d="{poly(door)}" fill="none" stroke="#f0c76a" stroke-width="3"/>')

# floor: perspective tiles with gold diamond runner
fy = VY + 70
add(f'<path d="M0 {fy}L{W} {fy}L{W} {H}L0 {H}Z" fill="url(#flr)"/>')
for k in range(-14, 15):
    x = VX + k * 160
    add(f'<path d="M{VX + k * 9} {fy}L{f(x)} {H}" stroke="#2b463c" stroke-width="1.3" opacity=".7"/>')
y = fy; step = 6
while y < H:
    add(f'<path d="M0 {f(y)}L{W} {f(y)}" stroke="#2b463c" stroke-width="1.2" opacity=".6"/>')
    step *= 1.28; y += step
# central runner with diamonds
def fx(t, k):  # x on a floor ray k (in 9px units at horizon, 160 at bottom) at depth t (0 horizon..1 bottom)
    return VX + k * (9 + (160 - 9) * t)
for k in (-1.3, 1.3):
    add(f'<path d="M{f(fx(0,k))} {fy}L{f(fx(1,k))} {H}" stroke="#c99a45" stroke-width="2.5" opacity=".75"/>')
t = .04
while t < 1:
    t2 = min(1, t * 1.5 + .03); ym = fy + (H - fy) * (t + t2) / 2
    pts = [(fx((t + t2) / 2, 0), fy + (H - fy) * t), (fx((t + t2) / 2, 1.1), ym), (fx((t + t2) / 2, 0), fy + (H - fy) * t2), (fx((t + t2) / 2, -1.1), ym)]
    add(f'<path d="{poly(pts)}" fill="none" stroke="#c99a45" stroke-width="{f(1 + 2 * t)}" opacity=".7"/>')
    t = t2

# pillars down both sides with braziers
for side in (-1, 1):
    for j, t in enumerate((.18, .32, .5, .75)):
        x = VX + side * (95 + 560 * t * 1.25); w = 20 + 120 * t * t + 20 * t; yb = fy + (H - fy) * t * .9; yt = VY - 140 - 600 * t
        add(f'<path d="M{f(x - w/2)} {f(yb)}L{f(x - w/2)} {f(yt)}L{f(x + w/2)} {f(yt)}L{f(x + w/2)} {f(yb)}Z" fill="url(#pil)"/>')
        add(f'<path d="M{f(x - w*.32)} {f(yb)}L{f(x - w*.32)} {f(yt)}M{f(x + w*.32)} {f(yb)}L{f(x + w*.32)} {f(yt)}" stroke="#c99a45" stroke-width="{f(.6 + 1.6 * t)}" opacity="{f(.3 + .5 * t)}"/>')
        # stepped capital and base
        for (ya, dirn) in ((yt, 1), (yb, -1)):
            c1, c2 = w * .2, w * .12
            add(f'<path d="M{f(x - w/2 - c1)} {f(ya)}L{f(x + w/2 + c1)} {f(ya)}L{f(x + w/2 + c1)} {f(ya + dirn*c2)}L{f(x + w/2)} {f(ya + dirn*c2*2.4)}L{f(x - w/2)} {f(ya + dirn*c2*2.4)}L{f(x - w/2 - c1)} {f(ya + dirn*c2)}Z" fill="#1d332c" stroke="#c99a45" stroke-width="{f(.6 + 1.6 * t)}" opacity=".95"/>')
        # gold chevron bands on the pillar
        for yy in (yb - (yb - yt) * .18, yb - (yb - yt) * .62):
            add(f'<path d="M{f(x - w/2)} {f(yy)}L{f(x)} {f(yy + w*.28)}L{f(x + w/2)} {f(yy)}" fill="none" stroke="#d6a94e" stroke-width="{f(1 + 3 * t)}" opacity="{f(.45 + .45 * t)}"/>')
        # brazier with blue flame in front of pillar
        bx = x - side * w * .9; by = yb + 4; bs = 6 + 30 * t
        add(f'<ellipse cx="{f(bx)}" cy="{f(by - bs * 1.6)}" rx="{f(bs * 3)}" ry="{f(bs * 3)}" fill="url(#blue)"/>')
        add(f'<path d="M{f(bx - bs*.7)} {f(by - bs*1.1)}L{f(bx + bs*.7)} {f(by - bs*1.1)}L{f(bx + bs*.35)} {f(by - bs*.5)}L{f(bx + bs*.2)} {f(by)}L{f(bx - bs*.2)} {f(by)}L{f(bx - bs*.35)} {f(by - bs*.5)}Z" fill="#6b5226" stroke="#d6a94e" stroke-width="{f(.5 + t)}"/>')
        add(f'<path d="M{f(bx - bs*.45)} {f(by - bs*1.1)}Q{f(bx - bs*.3)} {f(by - bs*2)} {f(bx)} {f(by - bs*2.5)}Q{f(bx + bs*.3)} {f(by - bs*2)} {f(bx + bs*.45)} {f(by - bs*1.1)}Z" fill="#c9f2ff"/>')

# foreground: great pillars framing the page, with knot-square medallions and torches
for side in (-1, 1):
    x0 = 0 if side < 0 else W
    pw = 190
    xs = x0 if side < 0 else W - pw
    add(f'<rect x="{xs}" y="0" width="{pw}" height="{H}" fill="url(#pil)"/>')
    add(f'<rect x="{xs + 18}" y="0" width="{pw - 36}" height="{H}" fill="none" stroke="#c99a45" stroke-width="3" opacity=".8"/>')
    for yy in range(60, H, 230):
        cx = xs + pw / 2
        add(f'<path d="M{cx} {yy}L{cx + 46} {yy + 46}L{cx} {yy + 92}L{cx - 46} {yy + 46}Z" fill="#14231e" stroke="#d6a94e" stroke-width="3"/>')
        add(f'<path d="M{cx} {yy + 16}L{cx + 30} {yy + 46}L{cx} {yy + 76}L{cx - 30} {yy + 46}Z" fill="none" stroke="#d6a94e" stroke-width="2"/>')
        add(f'<path d="M{cx - 15} {yy + 31}L{cx + 15} {yy + 61}M{cx + 15} {yy + 31}L{cx - 15} {yy + 61}" stroke="#d6a94e" stroke-width="2"/>')
        add(f'<path d="M{xs + 18} {yy + 140}L{cx} {yy + 170}L{xs + pw - 18} {yy + 140}" fill="none" stroke="#c99a45" stroke-width="3" opacity=".8"/>')
    tx = xs + (pw + 40 if side < 0 else -40); ty = 640
    add(f'<ellipse cx="{tx}" cy="{ty}" rx="150" ry="150" fill="url(#glow)"/>')
    add(f'<path d="M{tx - 14} {ty + 6}L{tx + 14} {ty + 6}L{tx + 6} {ty + 60}L{tx - 6} {ty + 60}Z" fill="#5a4320" stroke="#d6a94e" stroke-width="2"/>')
    add(f'<path d="M{tx - 16} {ty + 6}Q{tx - 14} {ty - 26} {tx} {ty - 46}Q{tx + 14} {ty - 26} {tx + 16} {ty + 6}Z" fill="#ff9a3a"/>')
    add(f'<path d="M{tx - 8} {ty + 4}Q{tx - 6} {ty - 14} {tx} {ty - 26}Q{tx + 6} {ty - 14} {tx + 8} {ty + 4}Z" fill="#ffe29a"/>')

# chandelier silhouette hanging from the vault
cy = 250
add(f'<path d="M{VX} 0L{VX} {cy - 60}" stroke="#3a2f1c" stroke-width="4"/>')
add(f'<path d="M{VX - 110} {cy}L{VX - 70} {cy - 60}L{VX + 70} {cy - 60}L{VX + 110} {cy}L{VX + 40} {cy + 50}L{VX - 40} {cy + 50}Z" fill="#1a1611" stroke="#b88a3c" stroke-width="3"/>')
add(f'<path d="M{VX} {cy - 60}L{VX} {cy + 50}M{VX - 70} {cy - 60}L{VX - 40} {cy + 50}M{VX + 70} {cy - 60}L{VX + 40} {cy + 50}M{VX - 110} {cy}L{VX + 110} {cy}" stroke="#b88a3c" stroke-width="2"/>')
for k in range(-4, 5):
    x = VX + k * 26
    add(f'<rect x="{x - 3}" y="{cy - 16 - abs(k) * 4}" width="6" height="16" fill="#efe2c2"/>')
    add(f'<ellipse cx="{x}" cy="{cy - 22 - abs(k) * 4}" rx="4" ry="7" fill="#ffd27a"/>')
    add(f'<circle cx="{x}" cy="{cy - 22 - abs(k) * 4}" r="16" fill="url(#glow)"/>')
# embers
for _ in range(50):
    add(f'<circle cx="{f(random.uniform(150, W - 150))}" cy="{f(random.uniform(200, 950))}" r="{f(random.uniform(.8, 2))}" fill="#ffc46b" opacity="{f(random.uniform(.2, .6))}"/>')
add('</svg>')
open(sys.argv[1], 'w').write(''.join(o))

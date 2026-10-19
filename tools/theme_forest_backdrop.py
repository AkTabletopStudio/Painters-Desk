"""Stylised Wildwood backdrop: flat layered forest, framing branches, a few small toadstools.
Original artwork, generated. Usage: python3 wood.py out.svg"""
import math, random, sys
random.seed(7)
W, H = 1600, 1000
out = []
def f(v): return f"{v:.1f}".rstrip('0').rstrip('.')
def add(s): out.append(s)

def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d for a, b, c, d in zip(p0, p1, p2, p3))

def leaf(x, y, ang, L, col, vein=None):
    w = L * 0.42
    ca, sa = math.cos(ang), math.sin(ang)
    def P(px, py): return f"{f(x + px*ca - py*sa)} {f(y + px*sa + py*ca)}"
    d = f"M{P(0,0)}Q{P(L*.45,-w)} {P(L,0)}Q{P(L*.45,w)} {P(0,0)}Z"
    add(f'<path d="{d}" fill="{col}"/>')
    if vein: add(f'<path d="M{P(L*.08,0)}L{P(L*.8,0)}" stroke="{vein}" stroke-width="1.4" fill="none" stroke-linecap="round"/>')

def branch(p0, p1, p2, p3, w0, bark, leaves, n_leaf, side_twigs=3, Lr=(26, 40)):
    # tapered branch as filled polygon
    N = 40; left = []; right = []
    for i in range(N + 1):
        t = i / N
        x, y = bez(p0, p1, p2, p3, t)
        x2, y2 = bez(p0, p1, p2, p3, min(1, t + .01)); x1, y1 = bez(p0, p1, p2, p3, max(0, t - .01))
        a = math.atan2(y2 - y1, x2 - x1); w = w0 * (1 - t * .85) / 2
        left.append((x - math.sin(a) * w, y + math.cos(a) * w)); right.append((x + math.sin(a) * w, y - math.cos(a) * w))
    pts = left + right[::-1]
    add('<path d="M' + 'L'.join(f"{f(a)} {f(b)}" for a, b in pts) + f'Z" fill="{bark}"/>')
    tw = []
    for k in range(side_twigs):
        t = .3 + .55 * k / max(1, side_twigs - 1) + random.uniform(-.05, .05)
        x, y = bez(p0, p1, p2, p3, t); x2, y2 = bez(p0, p1, p2, p3, t + .01)
        a = math.atan2(y2 - y1, x2 - x1) if False else math.atan2(y2 - y, x2 - x)
        s = 1 if k % 2 else -1; a2 = a + s * random.uniform(.5, .8); ln = w0 * random.uniform(3, 4.5)
        e = (x + math.cos(a2) * ln, y + math.sin(a2) * ln)
        add(f'<path d="M{f(x)} {f(y)}Q{f((x+e[0])/2 + s*8)} {f((y+e[1])/2 - 6)} {f(e[0])} {f(e[1])}" stroke="{bark}" stroke-width="{f(w0*.28)}" fill="none" stroke-linecap="round"/>')
        tw.append((x, y, e, a2))
    # leaves along branch and twigs
    for i in range(n_leaf):
        t = .25 + .75 * i / n_leaf
        x, y = bez(p0, p1, p2, p3, t); x2, y2 = bez(p0, p1, p2, p3, min(1, t + .01))
        a = math.atan2(y2 - y, x2 - x); s = 1 if i % 2 else -1
        c = random.choice(leaves)
        leaf(x, y, a + s * random.uniform(.6, 1.1), random.uniform(*Lr), c[0], c[1])
    for (x, y, e, a2) in tw:
        for j in range(5):
            t = .3 + .7 * j / 4
            px, py = x + (e[0] - x) * t, y + (e[1] - y) * t; s = 1 if j % 2 else -1
            c = random.choice(leaves)
            leaf(px, py, a2 + s * random.uniform(.5, 1.0) if j < 4 else a2, random.uniform(*Lr) * .9, c[0], c[1])

def trunk(x, w, top, col, lean=0):
    add(f'<path d="M{f(x-w/2-lean)} {f(top)}C{f(x-w/2)} {H*.5} {f(x-w*.55)} {H*.8} {f(x-w*.9)} {H}L{f(x+w*.9)} {H}C{f(x+w*.55)} {H*.8} {f(x+w/2)} {H*.5} {f(x+w/2-lean)} {f(top)}Z" fill="{col}"/>')

def canopy(cx, cy, r, col):
    for _ in range(7):
        a = random.uniform(0, 2*math.pi); d = random.uniform(0, r*.55)
        add(f'<circle cx="{f(cx+math.cos(a)*d)}" cy="{f(cy+math.sin(a)*d*.6)}" r="{f(r*random.uniform(.45,.7))}" fill="{col}"/>')

def mushroom(x, y, s, cap, stem, dots=True):
    add(f'<path d="M{f(x-s*.18)} {f(y)}Q{f(x-s*.22)} {f(y-s*.5)} {f(x-s*.14)} {f(y-s*.75)}L{f(x+s*.14)} {f(y-s*.75)}Q{f(x+s*.22)} {f(y-s*.5)} {f(x+s*.18)} {f(y)}Z" fill="{stem}"/>')
    add(f'<path d="M{f(x-s*.55)} {f(y-s*.68)}Q{f(x-s*.5)} {f(y-s*1.25)} {f(x)} {f(y-s*1.28)}Q{f(x+s*.5)} {f(y-s*1.25)} {f(x+s*.55)} {f(y-s*.68)}Q{f(x)} {f(y-s*.58)} {f(x-s*.55)} {f(y-s*.68)}Z" fill="{cap}"/>')
    if dots:
        for dx, dy, r in ((-.25, -.92, .07), (.08, -1.08, .08), (.3, -.85, .06), (-.05, -.8, .045)):
            add(f'<circle cx="{f(x+dx*s)}" cy="{f(y+dy*s)}" r="{f(r*s)}" fill="#f7efd8" opacity=".9"/>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">')
add('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1d8"/><stop offset=".6" stop-color="#e3ebc8"/><stop offset="1" stop-color="#d3e0b0"/></linearGradient>'
    '<radialGradient id="sun" cx=".5" cy=".18" r=".55"><stop offset="0" stop-color="#fff8dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></radialGradient></defs>')
add(f'<rect width="{W}" height="{H}" fill="url(#sky)"/><rect width="{W}" height="{H}" fill="url(#sun)"/>')

# far layer: pale trunks and canopies
far = "#cbd9ab"
for x in (90, 260, 470, 1130, 1330, 1520):
    trunk(x + random.uniform(-20, 20), random.uniform(26, 38), 260, far)
for x in range(-60, W + 120, 150):
    canopy(x + random.uniform(-30, 30), random.uniform(170, 260), random.uniform(90, 120), "#d4e0b4")
# mid layer
mid = "#a9c088"
for x in (40, 330, 1260, 1560):
    trunk(x, random.uniform(48, 60), 200, mid)
add(f'<path d="M0 {H*.80}C{W*.2} {H*.74} {W*.35} {H*.82} {W*.5} {H*.79}S{W*.82} {H*.73} {W} {H*.78}L{W} {H}L0 {H}Z" fill="#b8cd92"/>')
# near ground
add(f'<path d="M0 {H*.88}C{W*.18} {H*.84} {W*.32} {H*.9} {W*.5} {H*.89}S{W*.8} {H*.84} {W} {H*.87}L{W} {H}L0 {H}Z" fill="#8fae66"/>')
add(f'<path d="M0 {H*.95}C{W*.25} {H*.92} {W*.6} {H*.97} {W} {H*.93}L{W} {H}L0 {H}Z" fill="#78985a"/>')

# near trunks at edges
trunk(-10, 120, -10, "#6b5a3e", lean=-10)
trunk(W + 10, 130, -10, "#6b5a3e", lean=10)
add(f'<path d="M30 0C40 300 34 600 58 {H}" stroke="#5a4b33" stroke-width="5" fill="none" opacity=".5"/>')
add(f'<path d="M{W-40} 0C{W-50} 300 {W-36} 600 {W-62} {H}" stroke="#5a4b33" stroke-width="5" fill="none" opacity=".5"/>')

L = [("#6f9a48", "#5a823a"), ("#86ad55", "#6f9744"), ("#a5c46a", "#8aab52"), ("#5e8a44", "#4d7438")]
bark = "#6b5a3e"
# framing branches from top corners
branch((0, 40), (180, 30), (300, 120), (520, 90), 26, bark, L, 26, 4)
branch((0, 210), (120, 190), (210, 240), (330, 250), 16, bark, L, 14, 2)
branch((W, 50), (W-200, 20), (W-320, 140), (W-560, 110), 26, bark, L, 26, 4)
branch((W, 250), (W-120, 220), (W-200, 290), (W-330, 300), 16, bark, L, 14, 2)
# small hanging vines
for x0, ln in ((470, 150), (620, 90), (W-500, 170), (W-660, 100)):
    add(f'<path d="M{x0} 70Q{x0+8} {70+ln/2} {x0-4} {70+ln}" stroke="#7f9e52" stroke-width="2" fill="none"/>')
    for k in range(5):
        yy = 80 + ln * k / 5
        leaf(x0 + (2 if k % 2 else -2), yy, math.pi/2 + (.9 if k % 2 else -.9) + (math.pi if k % 2 == 0 else 0) * 0, 12, "#8db35a")

# toadstools and ferns, kept to the corners
def tuft(x, y, s, col):
    for k in range(7):
        a = -math.pi/2 + (k - 3) * .22
        add(f'<path d="M{f(x)} {f(y)}Q{f(x+math.cos(a)*s*.5+ (k-3)*3)} {f(y+math.sin(a)*s*.6)} {f(x+math.cos(a)*s)} {f(y+math.sin(a)*s)}" stroke="{col}" stroke-width="3" fill="none" stroke-linecap="round"/>')
for x, y, s in ((80, 975, 50), (170, 940, 40), (W-90, 965, 52), (W-190, 945, 38), (300, 905, 34), (W-330, 900, 32), (700, 935, 26)):
    tuft(x, y, s, "#5d7f40")
mushroom(120, 960, 70, "#c4553f", "#efe5c8")
mushroom(190, 975, 44, "#d26a4a", "#efe5c8")
mushroom(W-150, 955, 78, "#c4553f", "#efe5c8")
mushroom(W-235, 968, 40, "#b98a4e", "#efe5c8", dots=False)
mushroom(360, 912, 30, "#c97a52", "#efe5c8", dots=False)
mushroom(W-380, 905, 28, "#c4553f", "#efe5c8")
# fireflies / pollen
for _ in range(40):
    add(f'<circle cx="{f(random.uniform(80,W-80))}" cy="{f(random.uniform(300,850))}" r="{f(random.uniform(1.5,3.2))}" fill="#fff6c8" opacity="{f(random.uniform(.35,.8))}"/>')
add('</svg>')
open(sys.argv[1], 'w').write(''.join(out))

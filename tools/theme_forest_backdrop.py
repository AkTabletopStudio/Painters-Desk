# Generates the Wildwood theme backdrop SVG (original art). Render to themes/forest-glade.jpg at 1920x1200.
import random,sys,math
random.seed(12)
W,H=1920,1200; HZ=640  # vanishing glow
o=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
o.append('''<defs>
<radialGradient id="sun" cx=".5" cy=".46" r=".6"><stop offset="0" stop-color="#fffbe0"/><stop offset=".18" stop-color="#f6eaa8"/><stop offset=".45" stop-color="#b9c978"/><stop offset=".8" stop-color="#5d7f3e"/><stop offset="1" stop-color="#2f4a24"/></radialGradient>
<radialGradient id="bloom" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8d6" stop-opacity=".9"/><stop offset=".5" stop-color="#ffeaa0" stop-opacity=".35"/><stop offset="1" stop-color="#ffeaa0" stop-opacity="0"/></radialGradient>
<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity=".0"/><stop offset=".3" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
<linearGradient id="bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e2316"/><stop offset=".55" stop-color="#5a4426"/><stop offset=".8" stop-color="#7f8a3a"/><stop offset="1" stop-color="#3a2c1a"/></linearGradient>
<linearGradient id="barkR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#2e2316"/><stop offset=".55" stop-color="#5a4426"/><stop offset=".8" stop-color="#7f8a3a"/><stop offset="1" stop-color="#3a2c1a"/></linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb05a"/><stop offset=".4" stop-color="#5f7d34"/><stop offset="1" stop-color="#2c3d1c"/></linearGradient>
<linearGradient id="path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e7b8"/><stop offset="1" stop-color="#8d7c5a"/></linearGradient>
<radialGradient id="cap" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ff6a4a"/><stop offset=".6" stop-color="#c8281c"/><stop offset="1" stop-color="#7a1410"/></radialGradient>
<linearGradient id="stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8dcc0"/><stop offset=".6" stop-color="#fff7e4"/><stop offset="1" stop-color="#c9b896"/></linearGradient>
<linearGradient id="hcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e09a4a"/><stop offset="1" stop-color="#9a5a24"/></linearGradient>
<filter id="leaf" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="22"/></filter>
<filter id="leafsoft" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18" result="d"/><feGaussianBlur in="d" stdDeviation="2.2"/></filter>
<filter id="haze" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="28"/></filter><filter id="rayb" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="barkt" x="-10%" y="-5%" width="120%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".012 .09" numOctaves="4" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="10" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".02 .25" numOctaves="3" seed="2" result="n2"/><feColorMatrix in="n2" values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .04  0 0 0 1.2 -.45" result="streak"/><feComposite in="streak" in2="d" operator="in" result="s2"/><feMerge><feMergeNode in="d"/><feMergeNode in="s2"/></feMerge></filter>
<filter id="moss" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="13" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="1"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 -.08"/></filter>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0a1406" stop-opacity=".55"/></radialGradient>
</defs>''')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')
cx=W/2
# distant misty trunks
def trunk(x,w,top,bot,fill,filt,op=1):
    return f'<path d="M{x-w/2:.0f} {bot} C{x-w*.45:.0f} {top+ (bot-top)*.5:.0f} {x-w*.35:.0f} {top+40:.0f} {x-w*.3:.0f} {top} L{x+w*.3:.0f} {top} C{x+w*.35:.0f} {top+40:.0f} {x+w*.45:.0f} {top+(bot-top)*.5:.0f} {x+w/2:.0f} {bot}Z" fill="{fill}" opacity="{op}" filter="url(#{filt})"/>'
for layer,(n,wr,col,op,bot) in enumerate([(16,(14,28),'#a8b77e',.55,HZ+60),(12,(24,46),'#7f9558',.7,HZ+120),(9,(36,70),'#5c7340',.85,HZ+200)]):
    for i in range(n):
        x=random.uniform(0,W)
        if abs(x-cx)<120+layer*60: x+= (1 if x>cx else -1)*(160+layer*60)
        o.append(trunk(x,random.uniform(*wr),-20,bot,col,'haze',op))
    o.append(f'<ellipse cx="{cx}" cy="{HZ-40}" rx="{560-layer*90}" ry="{380-layer*50}" fill="url(#bloom)" opacity=".55"/>')
# mid canopy clusters (back)
def lerp(a,b,t): return a+(b-a)*t
def leafcol(x,y,base):
    # brighter, yellower toward the light at the centre
    d=min(1,math.hypot((x-cx)/900,(y-HZ)/700)); t=1-d
    r,g,b=base; r=lerp(r,215,t*.55); g=lerp(g,225,t*.45); b=lerp(b,120,t*.25)
    k=random.uniform(.8,1.15)
    return f'#{int(min(255,r*k)):02x}{int(min(255,g*k)):02x}{int(min(255,b*k)):02x}'
def foliage(cxs,cys,r,cols,n,filt,spread=1.0,op=1):
    s=f'<g filter="url(#{filt})" opacity="{op}">'
    bases=[(48,78,30),(62,98,38),(82,118,46),(38,64,26),(100,138,56)]
    for i in range(n*6):
        a=random.uniform(0,2*math.pi); d=random.uniform(0,r)**.9*r**.1*spread
        x=cxs+math.cos(a)*d*1.5; y=cys+math.sin(a)*d*.85; rr=random.uniform(r*.04,r*.13)
        s+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.0f}" fill="{leafcol(x,y,random.choice(bases))}"/>'
    return s+'</g>'
for (x,y,r) in ((300,180,260),(1620,170,280),(960,40,300),(620,90,220),(1300,80,240)):
    o.append(foliage(x,y,r,['#6f8f3c','#5a7a30','#87a548','#9cba58'],60,'leafsoft',op=.9))
# light rays
for i in range(7):
    x0=cx+random.uniform(-260,200); w=random.uniform(30,90); ang=random.uniform(-.55,.25)
    o.append(f'<path d="M{x0:.0f} -40 L{x0+w:.0f} -40 L{x0+w+ang*-900+260:.0f} {H} L{x0+ang*-900:.0f} {H}Z" fill="url(#ray)" filter="url(#rayb)" opacity=".9" style="mix-blend-mode:screen"/>')
# ground
o.append(f'<path d="M0 {HZ+90} Q{cx} {HZ+30} {W} {HZ+90} V{H} H0Z" fill="url(#ground)" filter="url(#moss)"/>')
# stone path winding to glow
pts=[]
for k in range(0,15):
    t=k/14; y=HZ+70+(H-HZ-40)*t**1.6; x=cx+math.sin(t*3.0)*120*t; w=20+t*230
    pts.append((x,y,w))
for (x,y,w) in pts:
    pass
left=' '.join(f'L{x-w:.0f} {y:.0f}' for x,y,w in pts); right=' '.join(f'L{x+w:.0f} {y:.0f}' for x,y,w in reversed(pts))
o.append(f'<path d="M{pts[0][0]:.0f} {pts[0][1]:.0f} {left} L{pts[-1][0]-pts[-1][2]:.0f} {H+20} L{pts[-1][0]+pts[-1][2]:.0f} {H+20} {right}Z" fill="#7a6a48" opacity=".55" filter="url(#moss)"/>')
for (x,y,w) in pts[2:]:
    t=(y-HZ)/(H-HZ)
    for j in range(3):
        sx=x+random.uniform(-w*.7,w*.7); sw=w*random.uniform(.28,.42); sh=sw*.32
        o.append(f'<ellipse cx="{sx:.0f}" cy="{y+random.uniform(-6,6):.0f}" rx="{sw:.0f}" ry="{sh:.0f}" fill="url(#path)" opacity="{.75+.25*t:.2f}" filter="url(#moss)"/>')
# grass: thousands of blades, lighter toward the light
gb={}
for i in range(5200):
    x=random.uniform(-20,W+20); y=random.uniform(HZ+80,H+20); sdep=(y-HZ)/(H-HZ)
    if abs(x-cx-math.sin(sdep*3)*120*sdep)<20+sdep*215 and random.random()<.85: continue
    h=6+46*sdep*random.uniform(.6,1.3); lean=random.uniform(-.5,.5)*h
    c=leafcol(x,y,random.choice([(70,100,36),(90,124,44),(56,84,30),(110,140,52)]))
    gb.setdefault(c,[]).append(f'M{x:.0f} {y:.0f} q{lean*.3:.1f} {-h*.6:.1f} {lean:.1f} {-h:.1f}')
for c,ps in gb.items(): o.append(f'<path d="{"".join(ps)}" stroke="{c}" stroke-width="2" fill="none" stroke-linecap="round"/>')
# ferns
def fern(x,y,s,flip):
    p=f'<g transform="translate({x} {y}) scale({s*flip} {s})" stroke="#4f7a2a" stroke-width="2.4" fill="none" stroke-linecap="round">'
    for k in range(5):
        a=-150+k*28; L=90-abs(k-2)*14
        ex=L*math.cos(math.radians(a)); ey=L*math.sin(math.radians(a))
        p+=f'<path d="M0 0 Q{ex*.5:.0f} {ey*.7-10:.0f} {ex:.0f} {ey:.0f}"/>'
        for j in range(1,9):
            t=j/9; px=ex*t; py=ey*t-8*math.sin(t*math.pi)
            p+=f'<path d="M{px:.0f} {py:.0f} l{-6:.0f} {-8:.0f} M{px:.0f} {py:.0f} l{7:.0f} {-5:.0f}" stroke="#6a9a34" stroke-width="2"/>'
    return p+'</g>'
for (x,y,sc,f) in ((120,1180,1.6,1),(520,1170,1.2,-1),(1400,1185,1.4,1),(1800,1170,1.7,-1),(640,990,.7,1),(1290,1000,.7,-1)):
    o.append(fern(x,y,sc,f))
# flowers: lavender spikes and pink clusters
for i in range(55):
    x=random.uniform(0,W); y=random.uniform(HZ+200,H); s=(y-HZ)/(H-HZ)
    if abs(x-cx-math.sin(s*3)*120*s)<60+s*240: continue
    if random.random()<.5:
        h=40+70*s
        o.append(f'<path d="M{x:.0f} {y:.0f} v{-h:.0f}" stroke="#5d7a34" stroke-width="2"/>')
        for k in range(7): o.append(f'<circle cx="{x+random.uniform(-3,3):.0f}" cy="{y-h+k*h*.09:.0f}" r="{2+3*s:.1f}" fill="{random.choice(["#9a7ad8","#b694e6","#7d5cc4"])}"/>')
    else:
        for k in range(6): o.append(f'<circle cx="{x+random.uniform(-14,14)*(.5+s):.0f}" cy="{y+random.uniform(-10,4)*(.5+s):.0f}" r="{2.5+4*s:.1f}" fill="{random.choice(["#f29ac0","#ffd1e2","#e86a9a","#fff4f8"])}"/>')
# big framing trees left/right
def bigtree(side):
    x0=0 if side<0 else W
    sgn=-side
    base=H+40
    s=f'<path d="M{x0+sgn*-60} {base} C{x0+sgn*260} {base-120} {x0+sgn*230} {base-420} {x0+sgn*200} {base-700} C{x0+sgn*180} {base-900} {x0+sgn*260} {base-1000} {x0+sgn*420} {-40} L{x0+sgn*-60} -40Z" fill="url(#{"bark" if side<0 else "barkR"})" filter="url(#barkt)"/>'
    # branch arching over
    s+=f'<path d="M{x0+sgn*170} {base-860} C{x0+sgn*300} {base-1010} {x0+sgn*470} {base-1000} {x0+sgn*640} {base-1120} L{x0+sgn*650} {base-1108} C{x0+sgn*500} {base-970} {x0+sgn*330} {base-930} {x0+sgn*200} {base-760}Z" fill="#4a3820" filter="url(#barkt)"/>'
    # roots
    for k in range(0):
        rx=x0+sgn*random.uniform(120,260)
        s+=f'<path d="M{rx:.0f} {base-140:.0f} C{rx+sgn*60:.0f} {base-80:.0f} {rx+sgn*120:.0f} {base-60:.0f} {rx+sgn*random.uniform(160,240):.0f} {base-10:.0f} L{rx+sgn*40:.0f} {base:.0f}Z" fill="#3e2f1c" filter="url(#barkt)"/>'
    # bark streaks
    st=''
    for k in range(70):
        bx=x0+sgn*random.uniform(-40,230); by=random.uniform(base-1000,base-40); L=random.uniform(40,160)
        st+=f'M{bx:.0f} {by:.0f} q{random.uniform(-6,6):.0f} {L/2:.0f} {random.uniform(-4,4):.0f} {L:.0f} '
    s+=f'<path d="{st}" stroke="#20180e" stroke-width="2.5" opacity=".55" fill="none"/>'
    st=''
    for k in range(40):
        bx=x0+sgn*random.uniform(130,215); by=random.uniform(base-1000,base-40); L=random.uniform(30,110)
        st+=f'M{bx:.0f} {by:.0f} q{random.uniform(-4,4):.0f} {L/2:.0f} {random.uniform(-3,3):.0f} {L:.0f} '
    s+=f'<path d="{st}" stroke="#c9b26a" stroke-width="1.6" opacity=".35" fill="none"/>'
    # moss patches
    for k in range(0):
        my=random.uniform(base-760,base-60); mx=x0+sgn*random.uniform(100,220)
        s+=f'<ellipse cx="{mx:.0f}" cy="{my:.0f}" rx="{random.uniform(20,60):.0f}" ry="{random.uniform(30,90):.0f}" fill="{random.choice(["#6f8f2e","#8aab3a","#5a7a26"])}" opacity=".85" filter="url(#moss)"/>'
    return s
o.append(bigtree(-1)); o.append(bigtree(1))
# front canopy with hanging vines
for (x,y,r) in ((180,60,320),(1760,40,330),(560,-40,260),(1380,-50,260),(960,-120,280)):
    o.append(foliage(x,y,r,['#3f5f22','#557a2c','#6c9036','#2f4a1a','#86a83e'],90,'leaf'))
for i in range(26):
    x=random.choice([random.uniform(60,700),random.uniform(1220,1880)]); l=random.uniform(120,420)
    o.append(f'<path d="M{x:.0f} 40 C{x+random.uniform(-30,30):.0f} {40+l*.4:.0f} {x+random.uniform(-30,30):.0f} {40+l*.7:.0f} {x+random.uniform(-15,15):.0f} {40+l:.0f}" stroke="#5f8230" stroke-width="{random.uniform(2,4):.1f}" fill="none"/>')
    for k in range(int(l/30)):
        o.append(f'<ellipse cx="{x+random.uniform(-10,10):.0f}" cy="{50+k*30:.0f}" rx="7" ry="4" fill="{random.choice(["#7aa23a","#5f8a2c","#9cc24a"])}" transform="rotate({random.uniform(-40,40):.0f} {x:.0f} {50+k*30:.0f})"/>')
# toadstools
def toad(x,y,s):
    r=f'<g transform="translate({x} {y}) scale({s})">'
    r+='<ellipse cx="0" cy="2" rx="40" ry="8" fill="#203014" opacity=".45"/>'
    r+='<path d="M-12 0 C-14 -30 -10 -60 -8 -78 L8 -78 C10 -60 14 -30 12 0Z" fill="url(#stem)"/>'
    r+='<path d="M-11 -62 Q0 -56 11 -62 L10 -56 Q0 -50 -10 -56Z" fill="#efe4c8"/>'
    r+='<ellipse cx="0" cy="-72" rx="30" ry="8" fill="#6a5a40" opacity=".45"/>'
    r+='<path d="M-52 -74 C-50 -120 -20 -134 0 -134 C20 -134 50 -120 52 -74 Q0 -86 -52 -74Z" fill="url(#cap)"/>'
    for (dx,dy,rr) in ((-30,-96,5),(-12,-116,6),(10,-110,5),(30,-94,6),(-2,-94,4),(40,-80,3),(-42,-82,3),(20,-124,3.5)):
        r+=f'<ellipse cx="{dx}" cy="{dy}" rx="{rr}" ry="{rr*.8}" fill="#fff6ea"/>'
    r+='<path d="M-52 -74 Q0 -86 52 -74 Q0 -78 -52 -74Z" fill="#5a120c" opacity=".6"/><path d="M-40 -100 Q-30 -122 -6 -128" stroke="#ffc0aa" stroke-width="5" fill="none" opacity=".55"/><path d="M-8 -78 C-10 -50 -12 -30 -12 0" stroke="#b8a888" stroke-width="5" opacity=".5" fill="none"/>'
    return r+'</g>'
for (x,y,s) in ((330,1090,1.5),(410,1120,.9),(250,1040,.7),(1500,1110,1.25),(1600,1150,1.6),(1430,1060,.7),(700,880,.55),(1230,900,.5),(1180,920,.35)):
    o.append(toad(x,y,s))
# mushroom house on right
hx,hy=1560,880
o.append(f'<g transform="translate({hx} {hy})"><ellipse cx="0" cy="8" rx="120" ry="16" fill="#203014" opacity=".5"/>'
 f'<path d="M-70 0 C-80 -80 -60 -150 -50 -170 L50 -170 C60 -150 80 -80 70 0Z" fill="url(#stem)"/>'
 f'<path d="M-22 0 V-50 Q-22 -78 0 -80 Q22 -78 22 -50 V0Z" fill="#7a4a24"/><path d="M-22 -50 Q-22 -78 0 -80 Q22 -78 22 -50" fill="none" stroke="#4a2c14" stroke-width="4"/><circle cx="12" cy="-34" r="3" fill="#e8c060"/>'
 f'<g filter="url(#glow)"><circle cx="-40" cy="-110" r="15" fill="#ffd46a"/><circle cx="38" cy="-118" r="13" fill="#ffd46a"/></g>'
 f'<path d="M-40 -125 v30 M-55 -110 h30 M38 -131 v26 M25 -118 h26" stroke="#7a4a24" stroke-width="3"/>'
 f'<path d="M-160 -150 C-150 -260 -60 -300 0 -300 C60 -300 150 -260 160 -150 Q0 -190 -160 -150Z" fill="url(#hcap)"/>'
 + ''.join(f'<ellipse cx="{dx}" cy="{dy}" rx="{rr}" ry="{rr*.75}" fill="#f6e6c4" opacity=".9"/>' for dx,dy,rr in ((-100,-200,12),(-50,-250,14),(10,-270,10),(60,-235,15),(110,-190,11),(-10,-210,9),(130,-165,7),(-130,-170,8)))
 + '<path d="M-160 -150 Q0 -190 160 -150 Q0 -168 -160 -150Z" fill="#5a3416" opacity=".7"/><path d="M-120 -230 Q-70 -290 0 -296" stroke="#ffd09a" stroke-width="10" fill="none" opacity=".35" stroke-linecap="round"/>'
 + '<path d="M40 -160 C55 -110 62 -60 66 0" stroke="#a89878" stroke-width="16" opacity=".35" fill="none"/>'
 + '<path d="M-80 0 q20 -26 40 -6 q16 -22 36 -4 q22 -20 44 2 q20 -18 40 8 Z" fill="#4f7a2a"/>'
 + '<path d="M-26 0 V-50 Q-26 -84 0 -86 Q26 -84 26 -50 V0" fill="none" stroke="#b89a6a" stroke-width="5"/>'
 + '<path d="M-60 -140 v-12 h-14 v12" fill="none"/></g>')
o.append(f'<path d="M{hx+90} {hy-300} q10 -40 0 -80 q-14 -40 6 -80" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none" opacity=".18" filter="url(#haze)"/>')
# deer in the misty mid-distance (original drawing), backlit with a warm rim
dx,dy,ds=760,790,.95
body=('M-62 -58 C-74 -66 -74 -86 -58 -92 C-30 -100 10 -98 40 -94 C52 -92 58 -96 62 -104 '
 'C66 -118 70 -132 74 -142 C76 -150 82 -156 90 -156 C96 -156 100 -152 104 -148 L118 -140 C122 -137 121 -132 116 -131 '
 'L102 -130 C96 -128 92 -124 90 -118 C86 -104 80 -88 72 -76 C66 -66 60 -60 52 -56 '
 'C54 -40 54 -22 56 0 L50 0 C47 -18 44 -34 40 -48 C34 -50 26 -52 18 -52 '
 'C18 -34 20 -18 22 0 L16 0 C13 -18 9 -34 6 -52 C-10 -52 -26 -54 -38 -56 '
 'C-40 -38 -40 -18 -38 0 L-44 0 C-48 -18 -50 -38 -52 -54 C-56 -46 -58 -36 -60 -22 '
 'C-60 -12 -58 -6 -56 0 L-62 0 C-66 -12 -68 -26 -66 -40 Z')
o.append(f'<g transform="translate({dx} {dy}) scale({ds})"><ellipse cx="0" cy="2" rx="80" ry="8" fill="#2a3a18" opacity=".35"/>'
 f'<path d="{body}" fill="#7a5230"/>'
 f'<path d="{body}" fill="none" stroke="#ffd98a" stroke-width="2.5" stroke-opacity=".55" transform="translate(1.5 -1)"/>'
 '<path d="M-60 -88 l-10 -10 l4 10z" fill="#7a5230"/>'
 '<path d="M88 -154 l-4 -12 l6 -8 M90 -156 l8 -14 l10 -4 M98 -170 l2 -10" stroke="#5e3e22" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
 '<path d="M84 -150 l-6 -10 l9 4z" fill="#6e4828"/><circle cx="98" cy="-146" r="1.6" fill="#1a1008"/>'
 '<g fill="#efd8b0" opacity=".6"><circle cx="-34" cy="-84" r="2.4"/><circle cx="-16" cy="-88" r="2.4"/><circle cx="2" cy="-86" r="2.4"/><circle cx="20" cy="-88" r="2.4"/><circle cx="-24" cy="-76" r="2"/><circle cx="-6" cy="-78" r="2"/><circle cx="12" cy="-78" r="2"/></g>'
 '<path d="M-50 -60 C-20 -56 20 -56 46 -60" stroke="#5a3a1e" stroke-width="6" opacity=".35" fill="none"/></g>')
o.append(f'<ellipse cx="{dx+10}" cy="{dy-80}" rx="180" ry="120" fill="url(#bloom)" opacity=".25"/>')
# butterflies
def bfly(x,y,s,c1,c2,rot):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 0 C-14 -20 -30 -14 -24 -2 C-30 6 -18 16 0 4Z" fill="{c1}"/><path d="M0 0 C14 -20 30 -14 24 -2 C30 6 18 16 0 4Z" fill="{c1}"/>'
            f'<path d="M0 0 C-14 -20 -30 -14 -24 -2" stroke="{c2}" stroke-width="2.5" fill="none"/><path d="M0 0 C14 -20 30 -14 24 -2" stroke="{c2}" stroke-width="2.5" fill="none"/><rect x="-1.5" y="-8" width="3" height="14" rx="1.5" fill="#2a1a0a"/></g>')
for (x,y,s,r) in ((620,520,1.1,-15),(700,450,.8,10),(1300,560,.9,20),(1180,420,.7,-10),(980,360,.6,5)):
    o.append(bfly(x,y,s,random.choice(['#f08a2a','#f5a43a','#ffd25a']),'#2a1a0a',r))
# fireflies / sparkles
for i in range(140):
    x=random.uniform(0,W); y=random.uniform(250,H-60); r=random.choice([1.5,2,2.5,3.5])
    o.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#fff4b0" opacity="{random.uniform(.35,.95):.2f}" filter="url(#glow)"/>')
# central bloom & vignette & grain
o.append(f'<ellipse cx="{cx}" cy="{HZ-60}" rx="320" ry="260" fill="url(#bloom)" opacity=".7"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#grain)"/>')
o.append('</svg>')
open(sys.argv[1],'w').write('\n'.join(o))

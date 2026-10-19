# Generates the Grimdark theme backdrop SVG (original art). Render it to themes/grim-hive.jpg at 1920x1200 in a browser.
import random,sys,math
random.seed(41)
W,H=1920,1200; GY=1010
o=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
o.append('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121010"/><stop offset=".35" stop-color="#2a201b"/><stop offset=".7" stop-color="#5b2c18"/><stop offset="1" stop-color="#a24a18"/></linearGradient>
<radialGradient id="hot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb25a" stop-opacity=".85"/><stop offset=".35" stop-color="#f2621e" stop-opacity=".45"/><stop offset="1" stop-color="#7a200c" stop-opacity="0"/></radialGradient>
<linearGradient id="flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff4c2"/><stop offset=".25" stop-color="#ffc35a"/><stop offset=".6" stop-color="#f05a1a"/><stop offset="1" stop-color="#8a1c0a" stop-opacity="0"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cdd6e0" stop-opacity=".22"/><stop offset="1" stop-color="#cdd6e0" stop-opacity="0"/></linearGradient>
<filter id="smoke" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0016 .0042" numOctaves="6" seed="7"/><feColorMatrix values="0 0 0 0 .16  0 0 0 0 .13  0 0 0 0 .11  0 0 0 1.5 -.55"/></filter>
<filter id="smoke2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".003 .007" numOctaves="5" seed="19"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .22  0 0 0 0 .12  0 0 0 1.4 -.62"/></filter>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
<filter id="rough2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="4" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter>
<filter id="haze" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" result="d"/><feGaussianBlur in="d" stdDeviation="1.6"/></filter>
<filter id="fire" x="-60%" y="-60%" width="220%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".04 .09" numOctaves="3" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="d"/><feGaussianBlur in="d" stdDeviation="1.2" result="b"/><feGaussianBlur in="d" stdDeviation="8" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="b"/></feMerge></filter>
<filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="gl" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.12"/></filter>
<linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="m1"><rect width="1920" height="1200" fill="url(#mg1)"/></mask>
<linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="m2"><rect y="780" width="1920" height="400" fill="url(#mg2)"/></mask>
<linearGradient id="midg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20160f"/><stop offset=".7" stop-color="#2e1d14"/><stop offset="1" stop-color="#5a2a14"/></linearGradient>
<linearGradient id="fadeL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
</defs>''')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
# fire glow on horizon
for x,r in ((300,420),(980,520),(1600,460)):
    o.append(f'<ellipse cx="{x}" cy="{GY-60}" rx="{r}" ry="{r*.55:.0f}" fill="url(#hot)" opacity=".8"/>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#smoke2)" opacity=".9"/>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#smoke)" mask="url(#m1)"/>')
# cold light beams from upper left
for x0,w in ((-200,180),(80,90),(260,140)):
    o.append(f'<path d="M{x0} -50 L{x0+w} -50 L{x0+w+900} {GY} L{x0+600} {GY}Z" fill="url(#beam)" filter="url(#soft)" opacity=".8"/>')
# lightning, thin and forked
def bolt(x,y,n,sp):
    p=[(x,y)]
    for i in range(n): x+=random.uniform(-sp,sp); y+=random.uniform(14,30); p.append((x,y))
    return p
pts=bolt(1500,0,16,24); d='M'+' L'.join(f'{a:.0f} {b:.0f}' for a,b in pts)
br=''.join('<path d="M'+' L'.join(f'{a:.0f} {b:.0f}' for a,b in bolt(*pts[k],6,20))+'"/>' for k in (5,10))
o.append(f'<g fill="none" stroke="#dce8ff" stroke-linejoin="round" filter="url(#gl)" opacity=".75"><path d="{d}" stroke-width="2.4"/><g stroke-width="1.2">{br}</g></g>')
# gothic spire helper (tall tapering with pinnacles and finials)
def gspire(x,w,h,base,detail=True):
    t=base-h; s=f'M{x:.0f} {base} '
    s+=f'V{t+h*.5:.0f} L{x+w*.08:.0f} {t+h*.46:.0f} L{x+w*.08:.0f} {t+h*.36:.0f} L{x+w*.22:.0f} {t+h*.32:.0f} L{x+w*.5:.0f} {t:.0f} L{x+w*.78:.0f} {t+h*.32:.0f} L{x+w*.92:.0f} {t+h*.36:.0f} L{x+w*.92:.0f} {t+h*.46:.0f} L{x+w:.0f} {t+h*.5:.0f} V{base}Z'
    if detail:
        for px in (x-4,x+w-4):
            s+=f' M{px:.0f} {t+h*.52:.0f} l4 {-h*.12:.0f} l4 {h*.12:.0f}Z'
    return s
def layer(n,ymin,ymax,wmin,wmax,base,col,filt,op=1,gap=(0,30)):
    x=-60; ps=[]
    while x<W+60:
        w=random.uniform(wmin,wmax); h=random.uniform(ymin,ymax)
        if random.random()<.25:  # block hab towers with stepped tops
            ps.append(f'M{x:.0f} {base} V{base-h*.7:.0f} H{x+w*.15:.0f} V{base-h*.78:.0f} H{x+w*.85:.0f} V{base-h*.7:.0f} H{x+w:.0f} V{base}Z')
        else: ps.append(gspire(x,w,h,base))
        x+=w+random.uniform(*gap)
    return f'<path d="{" ".join(ps)}" fill="{col}" opacity="{op}" filter="url(#{filt})"/>'
o.append(f'<path d="{gspire(820,280,900,GY)} {gspire(700,120,640,GY)} {gspire(1100,130,700,GY)}" fill="#55392a" opacity=".7" filter="url(#haze)"/>')
o.append(layer(0,380,620,50,110,GY,'#4a3226','haze',.85))
o.append(f'<rect y="{GY-420}" width="{W}" height="420" fill="#7a3a1c" opacity=".18" filter="url(#soft)"/>')
# lit windows in far layer
for i in range(160):
    x=random.uniform(0,W); y=random.uniform(GY-380,GY-40)
    o.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="2" height="4" fill="#ffb25a" opacity="{random.uniform(.25,.7):.2f}"/>')
o.append(layer(1,180,560,60,170,GY,'url(#midg)','rough',1,(20,90)))
# smokestacks with flame plumes
for x in (180,760,1350,1760):
    h=random.uniform(420,560); t=GY-h; w=34
    o.append(f'<path d="M{x} {GY} L{x+4} {t:.0f} H{x+w-4} L{x+w} {GY}Z M{x-6} {t:.0f} h{w+12} v14 h{-w-12}z" fill="#1d1511" filter="url(#rough)"/>')
    o.append(f'<ellipse cx="{x+w/2}" cy="{t-60:.0f}" rx="110" ry="140" fill="url(#hot)" opacity=".7"/>')
    o.append(f'<path d="M{x+3} {t:.0f} C{x-20} {t-60:.0f} {x+10} {t-120:.0f} {x+w/2} {t-190:.0f} C{x+w+10} {t-110:.0f} {x+w+16} {t-60:.0f} {x+w-3} {t:.0f}Z" fill="url(#flame)" filter="url(#fire)"/>')
    for j in range(7):
        o.append(f'<circle cx="{x+w/2+j*22+random.uniform(-10,10):.0f}" cy="{t-200-j*60:.0f}" r="{40+j*16}" fill="#1f1815" opacity="{.55-j*.06:.2f}" filter="url(#soft)"/>')
# mid ruins: framing wall fragment (left) and columns with a broken arch (right)
def lancet(x,y,w,h):
    return f'M{x:.0f} {y+h:.0f} V{y+w*.6:.0f} Q{x:.0f} {y:.0f} {x+w/2:.0f} {y-w*.35:.0f} Q{x+w:.0f} {y:.0f} {x+w:.0f} {y+w*.6:.0f} V{y+h:.0f}Z'
top='M-20 1240 V300 L60 260 L90 300 L130 240 L170 285 L210 330 L250 300 L300 380 L340 360 L380 470 L420 520 L440 640 L470 700 V1240Z'
holes=lancet(70,420,90,330)+' '+lancet(230,500,80,300)+' '+lancet(110,330,30,60)
o.append(f'<ellipse cx="190" cy="640" rx="220" ry="300" fill="url(#hot)" opacity=".55"/>')
o.append(f'<path d="{top} {holes}" fill-rule="evenodd" fill="#120d0b" filter="url(#rough)"/>')
o.append(f'<path d="{holes}" fill="none" stroke="#ff8a3a" stroke-opacity=".35" stroke-width="3" filter="url(#rough)"/>')
o.append('<path d="M470 1240 V700 L520 760 L560 1240Z" fill="#0f0b09" filter="url(#rough)"/>')
cols=''
for cx,ch in ((1560,620),(1760,760)):
    cols+=f'M{cx} 1240 V{GY-ch} h70 V1240Z M{cx-14} {GY-ch+80} h98 v22 h-98z M{cx-10} {GY-ch+102} h90 v10 h-90z M{cx+16} 1240 V{GY-ch+120} h6 V1240z '
cols+=f'M1560 {GY-620} l14 -40 l12 22 l18 -55 l10 30 l16 -18 V{GY-620}Z M1760 {GY-760} l10 -30 l20 18 l12 -60 l14 40 l14 -22 V{GY-760}Z'
o.append(f'<path d="{cols}" fill="#120d0b" filter="url(#rough)"/>')
o.append(f'<path d="M1556 {GY} V{GY-620} M1756 {GY} V{GY-760}" stroke="#ff8a3a" stroke-opacity=".3" stroke-width="3" filter="url(#rough)"/>')
# tattered hanging banner on the right column
o.append(f'<path d="M1772 {GY-700} h46 v190 l-8 -14 l-6 22 l-8 -18 l-8 26 l-8 -20 l-8 16z" fill="#3a0e0d" opacity=".9" filter="url(#rough)"/><path d="M1776 {GY-690} h38 M1795 {GY-670} v120" stroke="#a8823a" stroke-width="2" opacity=".7" filter="url(#rough)"/>')
# ground fires
for x in (120,640,900,1120,1400,1690):
    y=GY+random.uniform(60,110); s=random.uniform(.8,1.5)
    o.append(f'<ellipse cx="{x}" cy="{y:.0f}" rx="{200*s:.0f}" ry="{90*s:.0f}" fill="url(#hot)"/>')
    for j in range(4):
        dx=random.uniform(-40,40)*s; h=random.uniform(60,140)*s; w=random.uniform(18,34)*s
        o.append(f'<path d="M{x+dx-w:.0f} {y:.0f} C{x+dx-w:.0f} {y-h*.5:.0f} {x+dx-4:.0f} {y-h*.7:.0f} {x+dx:.0f} {y-h:.0f} C{x+dx+6:.0f} {y-h*.6:.0f} {x+dx+w:.0f} {y-h*.45:.0f} {x+dx+w:.0f} {y:.0f}Z" fill="url(#flame)" filter="url(#fire)"/>')
# foreground rubble mounds
fg='M-30 '+str(H+40)+f' V{GY+60} '
x=0
while x<W:
    x+=random.uniform(30,90); fg+=f'L{x:.0f} {GY+random.uniform(40,110):.0f} '
fg+=f'L{W+30} {H+40}Z'
o.append(f'<path d="{fg}" fill="#0a0807" filter="url(#rough2)"/>')
# broken slabs & a fallen column drum
for i in range(26):
    x=random.uniform(0,W); y=random.uniform(GY+80,H-20); s=random.uniform(18,60)
    o.append(f'<path d="M{x:.0f} {y:.0f} l{s:.0f} {-s*.35:.0f} l{s*.5:.0f} {s*.45:.0f} l{-s*.4:.0f} {s*.35:.0f}z" fill="#15100d" filter="url(#rough)"/>')
o.append(f'<g filter="url(#rough)"><rect x="1180" y="{GY+40}" width="210" height="70" rx="10" fill="#17110e" transform="rotate(-8 1285 {GY+75})"/><ellipse cx="1388" cy="{GY+60}" rx="20" ry="36" fill="#241a15" transform="rotate(-8 1285 {GY+75})"/></g>')
# embers drifting up-right
for i in range(220):
    x=random.uniform(0,W); y=random.uniform(200,H); l=random.uniform(2,7)
    o.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x+l:.1f}" y2="{y-l*1.3:.1f}" stroke="#ffbe6a" stroke-width="{random.choice([1,1.4,2])}" stroke-linecap="round" opacity="{random.uniform(.3,1):.2f}" filter="url(#gl)"/>')
# drifting foreground smoke
o.append(f'<rect width="{W}" height="{H}" filter="url(#smoke2)" mask="url(#m2)" opacity=".5"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#fadeL)"/>')
o.append(f'<rect width="{W}" height="{H}" filter="url(#grain)"/>')
o.append('</svg>')
open(sys.argv[1],'w').write('\n'.join(o))

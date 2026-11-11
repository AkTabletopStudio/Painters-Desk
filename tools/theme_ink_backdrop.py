# Regenerates the Japanese Ink theme artwork: python3 tools/theme_ink_backdrop.py themes
import random, math, sys
out=sys.argv[1]
def ridge(seed,w,base,amp,rough=.55,n=9,tilt=0.0):
    r=random.Random(seed)
    pts=[0.0,0.0]
    disp=1.0
    for _ in range(n):
        new=[]
        for a,b in zip(pts,pts[1:]):
            new+= [a,(a+b)/2+r.uniform(-disp,disp)]
        new.append(pts[-1]); pts=new; disp*=rough
    m=len(pts)
    return [(i*w/(m-1), base-amp*(p+tilt*(i/(m-1)))) for i,p in enumerate(pts)]
def path(pts,bottom):
    d='M%.0f %.0f '%(pts[0][0],bottom)+' '.join('L%.1f %.1f'%p for p in pts)+' L%.0f %.0f Z'%(pts[-1][0],bottom)
    return d
W,H=1600,460
INK='#16161a'
defs='''<defs>
<filter id="wet" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".011 .02" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.6"/></filter>
<filter id="far" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".008 .016" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="d"/><feGaussianBlur in="d" stdDeviation="3.2"/></filter>
<filter id="gran" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="4" seed="21" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 -.42" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in" result="g"/><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="2" seed="5" result="n2"/><feDisplacementMap in="g" in2="n2" scale="16"/></filter>
<filter id="dry" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".006 .75" numOctaves="3" seed="13" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -1.25" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in" result="g"/><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="2" result="n2"/><feDisplacementMap in="g" in2="n2" scale="7"/></filter>
<filter id="sunf" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".05 .09" numOctaves="3" seed="31" result="m"/><feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .9 0 0 0 .42" result="ma"/><feComposite in="d" in2="ma" operator="in"/></filter>
<linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6672" stop-opacity=".46"/><stop offset=".55" stop-color="#5d6672" stop-opacity=".12"/><stop offset="1" stop-color="#5d6672" stop-opacity="0"/></linearGradient>
<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33383f" stop-opacity=".62"/><stop offset=".5" stop-color="#33383f" stop-opacity=".2"/><stop offset="1" stop-color="#33383f" stop-opacity="0"/></linearGradient>
<linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="@INK" stop-opacity=".9"/><stop offset=".45" stop-color="@INK" stop-opacity=".5"/><stop offset="1" stop-color="@INK" stop-opacity="0"/></linearGradient>
<linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".42" stop-color="#fff" stop-opacity=".5"/><stop offset=".62" stop-color="#fff" stop-opacity="1"/></linearGradient>
<linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset=".97" stop-color="#000" stop-opacity="1"/></linearGradient><mask id="mL"><rect width="1600" height="460" fill="url(#fadeL)"/><rect width="1600" height="460" fill="url(#fadeB)"/></mask>
</defs>'''.replace('@INK',INK)
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'%(W,H),defs,'<g mask="url(#mL)">']
# sun behind the ridges
b.append('<circle cx="1436" cy="112" r="70" fill="#c0332a" filter="url(#sunf)"/>')
# far ridge
far=ridge(11,W,250,95,rough=.5,n=7,tilt=.9)
b.append('<path d="%s" fill="url(#g1)" filter="url(#far)"/>'%path(far,H))
mid=ridge(27,W,305,85,rough=.56,n=8,tilt=.7)
b.append('<path d="%s" fill="url(#g2)" filter="url(#wet)"/>'%path(mid,H))
b.append('<path d="%s" fill="url(#g2)" filter="url(#gran)" opacity=".55"/>'%path(mid,H))
# near dark ridge, right-hand side only
near=[(x,y) for x,y in ridge(5,W,372,70,rough=.6,n=8,tilt=1.5)]
near=[(x,y+max(0,(980-x))*.16) for x,y in near]
b.append('<path d="%s" fill="url(#g3)" filter="url(#wet)"/>'%path(near,H))
b.append('<path d="%s" fill="url(#g3)" filter="url(#gran)" opacity=".8"/>'%path(near,H))
b.append('</g>')
# birds: quick two-stroke ticks
r=random.Random(3)
for (x,y,s) in [(1236,92,1),(1274,70,.8),(1306,100,.7),(1206,62,.55),(1338,52,.5)]:
    b.append('<path d="M%.1f %.1f q%.1f %.1f %.1f %.1f q%.1f %.1f %.1f %.1f" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round" opacity=".8"/>'%(x,y,7*s,-9*s,14*s,2*s,6*s,-11*s,17*s,-6*s,INK,2.6*s))
b.append('</svg>')
open(out+'/ink-mountains.svg','w').write('\n'.join(b))

# bottom: low shoreline + reeds + boat, fades upward into paper
W2,H2=1600,300
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'%(W2,H2),defs.replace('<mask id="mL">','<mask id="mLx">')]
sh=ridge(41,W2,205,46,rough=.5,n=7,tilt=-.8)
b.append('<linearGradient id="fs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".3" stop-color="#fff"/><stop offset=".6" stop-color="#fff"/><stop offset=".95" stop-color="#000"/></linearGradient><mask id="ms"><rect width="1600" height="300" fill="url(#fs)"/></mask>')
b.append('<g mask="url(#ms)"><path d="%s" fill="#5d6672" opacity=".3" filter="url(#far)"/></g>'%path(sh,H2+40))
# water lines (dry brush)
r=random.Random(8)
for i in range(9):
    y=232+i*8+r.uniform(-2,2); x=r.uniform(80,1200); l=r.uniform(120,420)
    b.append('<path d="M%.0f %.0f h%.0f" stroke="%s" stroke-width="%.1f" stroke-linecap="round" opacity="%.2f" filter="url(#dry)"/>'%(x,y,l,INK,r.uniform(3,7),r.uniform(.5,.8)))
# small boat with figure
bx,by=1130,226
b.append('<g fill="%s" opacity=".85"><path d="M%d %d q34 13 78 0 l-9 9 q-30 6 -60 0 z"/><path d="M%d %d l5 -22 l4 22 z"/><circle cx="%d" cy="%d" r="3.2"/><path d="M%d %d l34 -40" stroke="%s" stroke-width="1.4" fill="none"/></g>'%(INK,bx,by,bx+26,by+2,bx+31,by-24,bx+52,by+2,INK))
b.append('<path d="M%d %d h96" stroke="%s" stroke-width="3" opacity=".35" filter="url(#dry)"/>'%(bx-8,by+14,INK))
# reeds bottom-left
for i in range(26):
    x=40+r.uniform(0,300); h=r.uniform(50,150); lean=r.uniform(-28,46)
    b.append('<path d="M%.0f %d q%.0f %.0f %.0f %.0f" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round" opacity="%.2f"/>'%(x,H2,lean*.2,-h*.6,lean,-h,INK,r.uniform(1.2,3.2),r.uniform(.45,.85)))
    if r.random()<.45:
        b.append('<ellipse cx="%.0f" cy="%.0f" rx="2.6" ry="9" fill="%s" opacity=".8" transform="rotate(%.0f %.0f %.0f)"/>'%(x+lean,H2-h,INK,lean*.5,x+lean,H2-h))
b.append('</svg>')
open(out+'/ink-shore.svg','w').write('\n'.join(b))

# washi tile: long fibres + flecks
r=random.Random(77); T=420
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><rect width="%d" height="%d" fill="#f2ebdb"/>'%(T,T,T,T,T,T)]
for i in range(150):
    x,y=r.uniform(0,T),r.uniform(0,T); a=r.uniform(0,math.pi); l=r.uniform(14,60); c=r.uniform(-10,10)
    dx,dy=math.cos(a)*l,math.sin(a)*l
    col=r.choice(['#fffdf6','#fffdf6','#b9a57c','#8d7b58'])
    for ox in (0,T,-T):
        for oy in (0,T,-T):
            if -70<x+ox<T+70 and -70<y+oy<T+70:
                b.append('<path d="M%.1f %.1f q%.1f %.1f %.1f %.1f" fill="none" stroke="%s" stroke-width="%.2f" opacity="%.2f"/>'%(x+ox,y+oy,dx/2+c,dy/2-c,dx,dy,col,r.uniform(.5,1.1),r.uniform(.2,.5) if col=='#fffdf6' else r.uniform(.07,.17)))
for i in range(40):
    b.append('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="#7d6c4c" opacity="%.2f"/>'%(r.uniform(4,T-4),r.uniform(4,T-4),r.uniform(.4,1.1),r.uniform(.12,.3)))
b.append('</svg>')
open(out+'/ink-washi.svg','w').write('\n'.join(b))

# brush underline for headings
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 40" preserveAspectRatio="none">',defs.replace('<mask id="mL">','<mask id="mLy">'),
'<path d="M6 22 C60 8 150 12 300 16 C420 19 520 15 594 21 C520 27 420 30 300 28 C170 27 70 33 6 22Z" fill="%s" filter="url(#dry)"/>'%INK,
'<path d="M4 21 C40 12 90 13 170 16 C90 22 50 29 4 21Z" fill="%s"/>'%INK,'</svg>']
open(out+'/ink-line.svg','w').write('\n'.join(b))

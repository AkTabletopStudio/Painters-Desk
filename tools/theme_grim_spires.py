import random, math, sys
out=sys.argv[1]
W,H=1600,1000
def spire(r,x,base,w,h):
    """Gothic hive spire as one polygon path: stepped tiers, pinnacles, needle top."""
    pts=[(x-w/2-w*.18,base),(x-w/2-w*.18,base-h*.08),(x-w/2,base-h*.14)]
    tiers=r.choice([2,3,3,4]); cw=w/2; y=base-h*.14
    seg=(h*.62)/tiers
    left=[]
    for t in range(tiers):
        y2=y-seg*r.uniform(.8,1.1)
        left.append((x-cw,y2))
        # pinnacle on the ledge
        pw=cw*.16; ph=seg*r.uniform(.25,.5)
        left+= [(x-cw,y2-ph*.3),(x-cw+pw/2,y2-ph),(x-cw+pw,y2-ph*.3),(x-cw+pw,y2)]
        cw*=r.uniform(.66,.8)
        left.append((x-cw,y2)); y=y2
    top=y-h*r.uniform(.2,.34)
    left+= [(x-cw,y-h*.03),(x-cw*.35,y-h*.1),(x,top)]
    pts+=left
    right=[(2*x-px,py) for px,py in reversed(pts)]
    allp=pts+right[1:]
    return 'M'+' L'.join('%.1f %.1f'%p for p in allp)+'Z', top
def block(r,x,base,w,h):
    # manufactorum block with chimneys
    d='M%.0f %.0f V%.0f H%.0f V%.0f Z'%(x,base,base-h,x+w,base)
    for k in range(r.choice([1,2,3])):
        cx=x+w*r.uniform(.1,.8); cw=w*r.uniform(.07,.12); ch=h*r.uniform(.3,.9)
        d+='M%.0f %.0f V%.0f l%.0f %.0f h%.0f l%.0f %.0f V%.0f Z'%(cx,base-h,base-h-ch,-cw*.2,-6,cw*1.4,-cw*.2,6,base-h)
    return d
defs='''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0908"/><stop offset=".45" stop-color="#1a1310"/><stop offset=".72" stop-color="#3a1d12"/><stop offset=".86" stop-color="#7a3414"/><stop offset="1" stop-color="#b8521a"/></linearGradient>
<radialGradient id="glow" cx=".62" cy=".86" r=".55"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".75"/><stop offset=".4" stop-color="#c2481a" stop-opacity=".35"/><stop offset="1" stop-color="#c2481a" stop-opacity="0"/></radialGradient>
<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a04a1c" stop-opacity="0"/><stop offset="1" stop-color="#d0641f" stop-opacity=".62"/></linearGradient>
<linearGradient id="fog2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1c10" stop-opacity="0"/><stop offset="1" stop-color="#6e2d12" stop-opacity=".7"/></linearGradient>
<filter id="smoke" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0035 .009" numOctaves="5" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 .05  0 0 0 0 .035  0 0 0 0 .03  1.7 0 0 0 -.62"/></filter>
<filter id="smoke2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".005 .012" numOctaves="4" seed="23"/><feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .22  0 0 0 0 .08  1.5 0 0 0 -.7"/></filter>
<filter id="haze"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.5"/></filter>
<filter id="bl"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .11 0"/></filter>
</defs>'''
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMax slice">'%(W,H),defs,
 '<rect width="%d" height="%d" fill="url(#sky)"/>'%(W,H),'<rect width="%d" height="%d" fill="url(#glow)"/>'%(W,H),
 '<rect width="%d" height="1000" filter="url(#smoke)"/>'%W]
r=random.Random(40)
# far layer
g=[]
x=-40
while x<W+60:
    w=r.uniform(50,110); h=r.uniform(380,760)
    d,_=spire(r,x,1000,w,h); g.append('<path d="%s"/>'%d); x+=w*r.uniform(.9,1.9)
b.append('<g fill="#5a3020" opacity=".85">%s</g>'%''.join(g))
b.append('<rect y="300" width="%d" height="700" fill="url(#fog)"/>'%W)
b.append('<rect width="%d" height="1000" filter="url(#smoke2)" opacity=".45"/>'%W)
# mid layer
g=[];win=[]
x=-30
while x<W+60:
    w=r.uniform(70,130)
    h=r.uniform(300,600)
    d,top=spire(r,x,1000,w,h); g.append('<path d="%s"/>'%d)
    for k in range(int(h/38)):
        if r.random()<.6:
            wy=940-h*.15-k*26-r.uniform(0,10)
            if wy>top+h*.42: win.append((x+r.uniform(-w*.25,w*.25),wy,r.uniform(.5,1)))
    x+=w*r.uniform(.95,1.7)
b.append('<g fill="#22140f" filter="url(#rough)">%s</g>'%''.join(g))
b.append('<g fill="#ffb054">%s</g>'%''.join('<rect x="%.0f" y="%.0f" width="2.4" height="7" opacity="%.2f"/>'%w_ for w_ in win))
b.append('<rect y="480" width="%d" height="520" fill="url(#fog2)"/>'%W)
# near layer: two big cathedral-spires at the edges + low ruin line
g=[];win=[]
for (x,w,h) in [(120,230,900),(330,120,520),(1500,260,980),(1290,130,600),(1110,90,380)]:
    d,top=spire(r,x,1010,w,h); g.append('<path d="%s"/>'%d)
    for k in range(26):
        wy=1000-h*.16-k*24
        if wy>top+h*.45 and r.random()<.55: win.append((x+r.uniform(-w*.2,w*.2),wy,r.uniform(.6,1)))
pts=[(0,1000)]
x=0
while x<W:
    pts.append((x,r.uniform(930,985))); x+=r.uniform(14,60)
pts.append((W,1000))
g.append('<path d="M'+' L'.join('%.0f %.0f'%p for p in pts)+'Z"/>')
b.append('<g fill="#0a0706" filter="url(#rough)">%s</g>'%''.join(g))
b.append('<g fill="#ffc46b">%s</g>'%''.join('<rect x="%.0f" y="%.0f" width="3" height="10" opacity="%.2f"/>'%w_ for w_ in win))
b.append('<g fill="#ff9a3a" filter="url(#bl)" opacity=".5">%s</g>'%''.join('<rect x="%.0f" y="%.0f" width="5" height="12"/>'%(a,c) for a,c,_ in win))
# embers
e=[]
for k in range(110):
    x,y=r.uniform(0,W),r.uniform(250,980); s=r.uniform(.8,2.4)
    e.append('<path d="M%.0f %.0f l%.1f %.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round" opacity="%.2f"/>'%(x,y,s*1.6,-s*3.2,r.choice(['#ffb347','#ff7a2a','#ffd58a']),s*.8,r.uniform(.35,.95)))
b.append(''.join(e))
b.append('<rect width="%d" height="%d" filter="url(#grain)"/>'%(W,H))
b.append('</svg>')
open(out+'/grim-spires.svg','w').write('\n'.join(b))

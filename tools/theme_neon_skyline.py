import random, math, sys
out=sys.argv[1]
W,H=1600,560; HZ=440
r=random.Random(84)
NE=['#ff2a6d','#2de2e6','#f9f871','#b537f2','#39ff88']
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'%(W,H),'''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07011a" stop-opacity="0"/><stop offset=".35" stop-color="#1a0540" stop-opacity=".9"/><stop offset=".62" stop-color="#4a0d6b"/><stop offset=".786" stop-color="#c2217a"/><stop offset=".787" stop-color="#16042f"/><stop offset="1" stop-color="#07011a" stop-opacity="0"/></linearGradient>
<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff275"/><stop offset=".45" stop-color="#ff9e3d"/><stop offset="1" stop-color="#ff2a6d"/></linearGradient>
<radialGradient id="halo"><stop offset=".55" stop-color="#ff2a6d" stop-opacity=".55"/><stop offset="1" stop-color="#ff2a6d" stop-opacity="0"/></radialGradient>
<clipPath id="above"><rect width="%d" height="%d"/></clipPath>
<filter id="gl" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="4"/></filter>
<linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".34" stop-color="#fff" stop-opacity=".28"/><stop offset=".56" stop-color="#fff"/></linearGradient>
<mask id="m"><rect width="%d" height="%d" fill="url(#fadeL)"/></mask>
</defs>'''%(W,HZ,W,H),'<rect width="%d" height="%d" fill="url(#sky)"/>'%(W,H),'<g mask="url(#m)">']
for k in range(150):
    b.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="#fff" opacity="%.2f"/>'%(r.uniform(0,W),r.uniform(0,HZ-140),r.uniform(.5,1.5),r.uniform(.3,.9)))
# sun
SX,SY,SR=1170,330,190
b.append('<circle cx="%d" cy="%d" r="%d" fill="url(#halo)"/>'%(SX,SY,SR*1.5))
b.append('<g clip-path="url(#above)"><circle cx="%d" cy="%d" r="%d" fill="url(#sun)"/>'%(SX,SY,SR))
y=SY-10;t=5
while y<HZ:
    b.append('<rect x="%d" y="%.0f" width="%d" height="%.0f" fill="#3a0a5e"/>'%(SX-SR,y,SR*2,t)); y+=t+max(9,26-t*1.2); t+=2.2
b.append('</g>')
# wireframe mountains
def mtn(x0,x1,hmax,seed):
    rr=random.Random(seed); pts=[]; x=x0
    while x<x1:
        pts.append((x,HZ-rr.uniform(.25,1)*hmax*(1-abs((x-(x0+x1)/2)/((x1-x0)/2))**2*.7))); x+=rr.uniform(40,90)
    pts=[(x0,HZ)]+pts+[(x1,HZ)]
    s='<path d="M'+' L'.join('%.0f %.0f'%p for p in pts)+'Z" fill="#12052e" stroke="#2de2e6" stroke-width="1.6" stroke-linejoin="round"/>'
    for i in range(1,len(pts)-1):
        px,py=pts[i]
        s+='<path d="M%.0f %.0f L%.0f %d M%.0f %.0f L%.0f %d" stroke="#2de2e6" stroke-width=".9" opacity=".55"/>'%(px,py,px-rr.uniform(20,50),HZ,px,py,px+rr.uniform(20,50),HZ)
    return s
b.append(mtn(560,1040,150,3)); b.append(mtn(1240,1600,120,6)); b.append(mtn(850,1330,90,11))
# skyline
def building(x,w,h,signs=()):
    s='<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" fill="#0e0428" stroke="#2a0f5c" stroke-width="1.5"/>'%(x,HZ-h,w,h)
    yy=HZ-h+12
    while yy<HZ-8:
        xx=x+7
        while xx<x+w-6:
            if r.random()<.42: s+='<rect x="%.0f" y="%.0f" width="3.4" height="4.6" fill="%s" opacity="%.2f"/>'%(xx,yy,r.choice(NE+['#ffb347','#ffffff']),r.uniform(.5,1))
            xx+=8.5
        yy+=10.5
    if r.random()<.5: s+='<path d="M%.0f %.0f v-26" stroke="#2a0f5c" stroke-width="2"/><circle cx="%.0f" cy="%.0f" r="2.6" fill="#ff2a6d"/>'%(x+w/2,HZ-h,x+w/2,HZ-h-28)
    return s
def sign_h(x,y,word,col,fs=15):
    w=len(word)*fs*.78+22; h=fs+14
    box='<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="5" fill="#0a0220" stroke="%s" stroke-width="2.4"/>'%(x,y,w,h,col)
    return '<g filter="url(#gl)" opacity=".8">%s</g>%s<text x="%.0f" y="%.0f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="%d" letter-spacing="3" fill="#fff" stroke="%s" stroke-width=".5">%s</text>'%(box,box,x+w/2+1.5,y+h/2+fs*.36,fs,col,word)
def sign_v(x,y,word,col,fs=13):
    h=len(word)*(fs+3)+16; w=fs+12
    box='<rect x="%.0f" y="%.0f" width="%.0f" height="%.0f" rx="5" fill="#0a0220" stroke="%s" stroke-width="2.4"/>'%(x,y,w,h,col)
    t=''.join('<text x="%.0f" y="%.0f" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="%d" fill="#fff" stroke="%s" stroke-width=".5">%s</text>'%(x+w/2,y+fs+8+i*(fs+3),fs,col,ch) for i,ch in enumerate(word))
    return '<g filter="url(#gl)" opacity=".8">%s</g>%s%s'%(box,box,t)
B=[(-10,95,300),(92,80,380),(180,92,330),(280,70,240),(356,84,190),(446,60,120),(510,50,80),
   (1360,70,150),(1420,90,250),(1505,100,340)]
for x,w,h in B: b.append(building(x,w,h))
S=[sign_h(60,84,'PAINTS','#ff2a6d',17),sign_v(160,120,'ZENITHAL','#2de2e6'),sign_v(256,150,'GLAZE','#39ff88'),sign_h(186,268,'WHEEL','#2de2e6',13),
   sign_h(10,238,'NMM','#39ff88',13),sign_h(96,318,'OSL','#b537f2',13),sign_v(338,214,'LAYER','#b537f2'),sign_h(360,330,'EDGE','#f9f871',12),
   sign_v(1476,206,'RAMP','#f9f871'),sign_v(1392,300,'WASH','#ff2a6d'),sign_h(1512,150,'BLEND','#2de2e6',13),sign_h(1436,380,'INK','#ff2a6d',12)]
b+=S
# horizon line + short grid below
b.append('<rect y="%d" width="%d" height="2.5" fill="#2de2e6"/><rect y="%d" width="%d" height="10" fill="#2de2e6" filter="url(#gl)" opacity=".8"/>'%(HZ-1,W,HZ-5,W))
b.append('</g></svg>')
open(out+'/cyber-skyline.svg','w').write('\n'.join(b))

# floor grid, anchored to the bottom of the screen
W2,H2=1600,420
g=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMax slice">'%(W2,H2),
'<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="m"><rect width="%d" height="%d" fill="url(#f)"/></mask><linearGradient id="lane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2a6d" stop-opacity="0"/><stop offset="1" stop-color="#ff2a6d" stop-opacity=".28"/></linearGradient></defs><g mask="url(#m)">'%(W2,H2)]
g.append('<path d="M%d 0 L%d %d H%d Z" fill="url(#lane)"/>'%(W2/2,W2/2+170,H2,W2/2-170))
for i in range(-26,27):
    g.append('<path d="M%d 0 L%.0f %d" stroke="#2de2e6" stroke-width="1.6" opacity=".8"/>'%(W2/2+i*8,W2/2+i*190,H2))
y=6;step=7
while y<H2:
    g.append('<path d="M0 %.0f H%d" stroke="#2de2e6" stroke-width="%.1f" opacity=".8"/>'%(y,W2,1+y/H2*1.4)); step*=1.33; y+=step
g.append('</g></svg>')
open(out+'/cyber-grid.svg','w').write('\n'.join(g))

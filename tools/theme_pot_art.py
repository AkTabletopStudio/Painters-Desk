import random, math, sys
out=sys.argv[1]
C=['#f2545b','#ff9f1c','#ffd23f','#2ec4b6','#3a86ff','#8338ec']
# drips: 600px tile, six 100px colour blocks, each with 1-2 drips
r=random.Random(12)
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 64" width="600" height="64">']
for i,c in enumerate(C):
    x0=i*100
    d='M%d 0 H%d V10 '%(x0,x0+100)
    # walk right-to-left along the bottom edge adding drips
    xs=sorted(r.sample(range(14,88,12),r.choice([2,2,3])),reverse=True)
    cur=x0+100
    for dx in xs:
        cx=x0+dx; w=r.choice([5,6,7,8]); L=r.choice([10,16,22,28,34])
        d+='H%d Q%d 10 %d %d V%d A%d %d 0 0 1 %d %d V%d Q%d 10 %d 10 '%(cx+w+5,cx+w,cx+w,16,10+L,w,w,cx-w,10+L,16,cx-w,cx-w-5)
    d+='H%d Z'%x0
    b.append('<path d="%s" fill="%s"/>'%(d,c))
b.append('</svg>')
open(out+'/pot-drips.svg','w').write('\n'.join(b))

def blob(r,cx,cy,rad,n=9,j=.28):
    pts=[]
    for k in range(n):
        a=2*math.pi*k/n; rr=rad*(1+r.uniform(-j,j))
        pts.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr))
    d=''
    for k in range(n):
        p0=pts[k-1];p1=pts[k];p2=pts[(k+1)%n];p3=pts[(k+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/5,p1[1]+(p2[1]-p0[1])/5); c2=(p2[0]-(p3[0]-p1[0])/5,p2[1]-(p3[1]-p1[1])/5)
        if k==0:d='M%.1f %.1f '%p1
        d+='C%.1f %.1f %.1f %.1f %.1f %.1f '%(c1+c2+p2)
    return d+'Z'
def splat(r,cx,cy,rad,col,ink='#1b1b1b'):
    s=[]
    d=blob(r,cx,cy,rad)
    s.append('<path d="%s" fill="%s" transform="translate(7 7)"/>'%(d,ink))
    s.append('<path d="%s" fill="%s" stroke="%s" stroke-width="4" stroke-linejoin="round"/>'%(d,col,ink))
    # shine
    s.append('<path d="M%.0f %.0f q%.0f %.0f %.0f %.0f" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"/>'%(cx-rad*.5,cy-rad*.2,rad*.12,-rad*.38,rad*.5,-rad*.5))
    for k in range(r.choice([3,4,5])):
        a=r.uniform(0,2*math.pi); dist=rad*r.uniform(1.35,1.9); rr=rad*r.uniform(.07,.2)
        x,y=cx+math.cos(a)*dist,cy+math.sin(a)*dist
        s.append('<circle cx="%.0f" cy="%.0f" r="%.0f" fill="%s" transform="translate(4 4)"/><circle cx="%.0f" cy="%.0f" r="%.0f" fill="%s" stroke="%s" stroke-width="3.5"/>'%(x,y,rr,ink,x,y,rr,col,ink))
    return ''.join(s)
# top-right cluster
r=random.Random(5)
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360" width="560" height="360">']
b.append(splat(r,430,120,88,C[3])); b.append(splat(r,250,84,52,C[2])); b.append(splat(r,330,250,40,C[0]))
b.append('</svg>'); open(out+'/pot-splats-a.svg','w').write('\n'.join(b))
r=random.Random(9)
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">']
b.append(splat(r,150,220,80,C[5])); b.append(splat(r,330,250,46,C[1])); b.append(splat(r,280,110,34,C[4]))
b.append('</svg>'); open(out+'/pot-splats-b.svg','w').write('\n'.join(b))
# marker swipe under h1
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 40" preserveAspectRatio="none"><path d="M8 14 C120 4 300 8 592 10 L586 30 C400 26 180 30 14 34 Z" fill="#ffd23f"/><path d="M30 34 C200 30 380 31 560 33" stroke="#ffd23f" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/></svg>']
open(out+'/pot-swipe.svg','w').write('\n'.join(b))

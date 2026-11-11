import random, math, sys
out=sys.argv[1]
W,H=1600,1000
r=random.Random(17)
INK='#5a3d1e'; GOLD='#b8862a'
b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMaxYMin slice">'%(W,H),'''<defs>
<filter id="age" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .009" numOctaves="5" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .12  1.3 0 0 0 -.62"/></filter>
<filter id="fib" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7 .9" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .1  0 0 0 .1 0"/></filter>
<radialGradient id="vg" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#8a5a1e" stop-opacity="0"/><stop offset="1" stop-color="#6b3f12" stop-opacity=".42"/></radialGradient>
<filter id="wob"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter>
</defs>''','<rect width="%d" height="%d" fill="#ecdfbd"/>'%(W,H),'<rect width="%d" height="%d" filter="url(#age)" opacity=".55"/>'%(W,H),'<rect width="%d" height="%d" filter="url(#fib)"/>'%(W,H)]
# celestial chart, top right
cx,cy=1260,300
g=['<g fill="none" stroke="%s" filter="url(#wob)">'%INK]
for rad,sw,da in [(300,2.2,''),(290,.8,''),(236,1.2,'6 5'),(176,1.4,''),(112,1,'2 6'),(60,1.4,'')]:
    g.append('<circle cx="%d" cy="%d" r="%d" stroke-width="%s" %s opacity=".7"/>'%(cx,cy,rad,sw,'stroke-dasharray="%s"'%da if da else ''))
for k in range(72):
    a=math.radians(k*5); r1=290; r2=300 if k%2 else (278 if k%6 else 266)
    g.append('<path d="M%.1f %.1f L%.1f %.1f" stroke-width="%s" opacity=".7"/>'%(cx+math.cos(a)*r1,cy+math.sin(a)*r1,cx+math.cos(a)*r2,cy+math.sin(a)*r2,1.6 if k%6==0 else .8))
for k in range(12):
    a=math.radians(k*30+15)
    g.append('<path d="M%.1f %.1f L%.1f %.1f" stroke-width=".7" opacity=".4"/>'%(cx+math.cos(a)*60,cy+math.sin(a)*60,cx+math.cos(a)*290,cy+math.sin(a)*290))
# tilted ecliptic ellipse + orbits
g.append('<ellipse cx="%d" cy="%d" rx="290" ry="96" transform="rotate(-23 %d %d)" stroke-width="1.3" opacity=".65"/>'%(cx,cy,cx,cy))
g.append('<ellipse cx="%d" cy="%d" rx="236" ry="150" transform="rotate(31 %d %d)" stroke-width=".9" stroke-dasharray="10 4" opacity=".5"/>'%(cx,cy,cx,cy))
g.append('</g>')
b+=g
# sun at centre, planets on rings
b.append('<circle cx="%d" cy="%d" r="20" fill="%s"/><g stroke="%s" stroke-width="2.2">%s</g>'%(cx,cy,GOLD,GOLD,''.join('<path d="M%.1f %.1f L%.1f %.1f"/>'%(cx+math.cos(math.radians(a))*26,cy+math.sin(math.radians(a))*26,cx+math.cos(math.radians(a))*(40 if a%45 else 48),cy+math.sin(math.radians(a))*(40 if a%45 else 48)) for a in range(0,360,22))))
for rad,a,pr,col in [(112,200,7,'#9b1d20'),(176,320,10,'#1f3f6b'),(236,95,6,'#2f6a5a'),(176,150,5,GOLD)]:
    x,y=cx+math.cos(math.radians(a))*rad,cy+math.sin(math.radians(a))*rad
    b.append('<circle cx="%.1f" cy="%.1f" r="%d" fill="%s" stroke="%s" stroke-width="1.2"/>'%(x,y,pr,col,INK))
# constellations scattered left/bottom
def star(x,y,s,col=INK):
    return '<path d="M%.1f %.1f l%.1f %.1f l%.1f %.1f l%.1f %.1f l%.1f %.1f l%.1f %.1f l%.1f %.1f l%.1f %.1f Z" fill="%s"/>'%(x,y-s, s*.28,s*.72, s*.72,s*.28, -s*.72,s*.28, -s*.28,s*.72, -s*.28,-s*.72, -s*.72,-s*.28, s*.72,-s*.28,col)
for (ox,oy,n,sc) in [(560,150,6,150),(160,760,7,190),(900,820,5,150),(1380,760,6,170)]:
    pts=[(ox+r.uniform(-sc,sc),oy+r.uniform(-sc*.6,sc*.6)) for _ in range(n)]
    pts.sort()
    b.append('<path d="M'+' L'.join('%.0f %.0f'%p for p in pts)+'" fill="none" stroke="%s" stroke-width="1" stroke-dasharray="3 5" opacity=".55"/>'%INK)
    for i,p in enumerate(pts): b.append(star(p[0],p[1],r.uniform(5,10),GOLD if i%3==0 else INK))
for k in range(70):
    b.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="%s" opacity="%.2f"/>'%(r.uniform(0,W),r.uniform(0,H),r.uniform(.8,1.8),INK,r.uniform(.25,.6)))
# compass rose bottom-left
rx,ry=250,300
b.append('<g opacity=".0"></g>')
b.append('<rect width="%d" height="%d" fill="url(#vg)"/>'%(W,H))
b.append('</svg>')
open(out+'/arcane-chart.svg','w').write('\n'.join(b))

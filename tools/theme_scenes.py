import random, math, sys
out=sys.argv[1]
W,H=1600,1000
def md(r,n,rough):
    pts=[r.uniform(-.3,.3),r.uniform(-.3,.3)];d=1.0
    for _ in range(n):
        new=[]
        for a,b in zip(pts,pts[1:]): new+=[a,(a+b)/2+r.uniform(-d,d)]
        new.append(pts[-1]);pts=new;d*=rough
    return pts
def ridge(r,base,amp,style):
    if style=='angular':
        p=md(r,5,.62)
    elif style=='jagged': p=md(r,8,.68)
    else: p=md(r,8,.5)
    m=len(p); return [(i*W/(m-1),base-amp*v) for i,v in enumerate(p)]
def poly(pts,extra=''):
    return '<path d="M0 %d '%(H+10)+' '.join('L%.1f %.1f'%q for q in pts)+' L%d %d Z" %s/>'%(W,H+10,extra)
def conifers(r,pts,scale,col):
    s=[]
    x=0
    while x<W:
        i=min(len(pts)-1,int(x/W*(len(pts)-1))); y=pts[i][1]+4
        h=scale*r.uniform(.6,1.25); w=h*.36
        d='M%.1f %.1f '%(x,y-h)
        for k in range(1,5):
            yy=y-h+h*k/4.4; ww=w*k/4
            d+='L%.1f %.1f L%.1f %.1f '%(x+ww,yy,x+ww*.45,yy-h*.03)
        d+='L%.1f %.1f L%.1f %.1f '%(x+w*.12,y,x-w*.12,y)
        for k in range(4,0,-1):
            yy=y-h+h*k/4.4; ww=w*k/4
            d+='L%.1f %.1f L%.1f %.1f '%(x-ww*.45,yy-h*.03,x-ww,yy)
        s.append('<path d="%sZ"/>'%d); x+=w*r.uniform(.9,2.4)
    return '<g fill="%s">%s</g>'%(col,''.join(s))
def flt(seed):
    return '''<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="'''+str(seed)+'''" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter>
<filter id="bl"><feGaussianBlur stdDeviation="6"/></filter><filter id="bl2"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0"/></filter>'''
def smoke(id,rgb,gain,off,freq='.004 .01',seed=8):
    return '<filter id="%s" x="0" y="0" width="100%%" height="100%%"><feTurbulence type="fractalNoise" baseFrequency="%s" numOctaves="5" seed="%d"/><feColorMatrix type="matrix" values="0 0 0 0 %.2f  0 0 0 0 %.2f  0 0 0 0 %.2f  %.2f 0 0 0 %.2f"/></filter>'%(id,freq,seed,rgb[0],rgb[1],rgb[2],gain,off)
def grad(id,stops,vert=True):
    return '<linearGradient id="%s" x1="0" y1="0" x2="%d" y2="%d">%s</linearGradient>'%(id,0 if vert else 1,1 if vert else 0,''.join('<stop offset="%s" stop-color="%s" stop-opacity="%s"/>'%s for s in stops))
def scene(name,seed,sky,layers,extra_defs='',back='',mid='',front='',grain=True):
    r=random.Random(seed)
    b=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMax slice">'%(W,H),'<defs>',flt(seed),grad('sky',sky),extra_defs]
    body=[]
    for i,L in enumerate(layers):
        pts=ridge(r,L['base'],L['amp'],L.get('style','smooth'))
        if 'tilt' in L: pts=[(x,y+L['tilt']*(x/W-.5)) for x,y in pts]
        if L.get('trees'): body.append(conifers(r,pts,L['trees'],L['col']))
        fill=L['col']
        if L.get('grad'):
            b.append(grad('lg%d'%i,L['grad'])); fill='url(#lg%d)'%i
        body.append(poly(pts,'fill="%s" %s'%(fill,'filter="url(#rough)"' if L.get('rough',True) else '')))
        if L.get('rim'): body.append('<path d="M'+' L'.join('%.1f %.1f'%q for q in pts)+'" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" opacity="%s"/>'%L['rim'])
        if L.get('fog'):
            b.append(grad('fg%d'%i,[(0,L['fog'][0],0),(1,L['fog'][0],L['fog'][1])]))
            body.append('<rect y="%d" width="%d" height="%d" fill="url(#fg%d)"/>'%(L['fog'][2],W,H-L['fog'][2],i))
        if L.get('after'): body.append(L['after'])
    b.append('</defs>')
    b.append('<rect width="%d" height="%d" fill="url(#sky)"/>'%(W,H)); b.append(back); b+=body; b.append(front)
    if grain: b.append('<rect width="%d" height="%d" filter="url(#grain)"/>'%(W,H))
    b.append('</svg>')
    open('%s/%s.svg'%(out,name),'w').write('\n'.join(b))
def specks(seed,n,cols,y0,y1,size,dx=0,dy=0,op=(.3,.9),glow=False):
    r=random.Random(seed);s=[]
    for k in range(n):
        x,y=r.uniform(0,W),r.uniform(y0,y1);z=r.uniform(size[0],size[1]);c=r.choice(cols)
        if dx or dy: s.append('<path d="M%.0f %.0f l%.1f %.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round" opacity="%.2f"/>'%(x,y,dx*z,dy*z,c,z*.8,r.uniform(*op)))
        else: s.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="%s" opacity="%.2f"/>'%(x,y,z,c,r.uniform(*op)))
    g=''.join(s)
    return ('<g filter="url(#bl)" opacity=".7">%s</g>'%g if glow else '')+g

# ---------- Frostforge: aurora over ice peaks ----------
aur=smoke('aur',(.25,1,.75),2.6,-1.15,'.0016 .012',5)+smoke('aur2',(.55,.5,1),2.4,-1.2,'.002 .014',19)+grad('am',[(0,'#000',1),(.12,'#fff',1),(.5,'#fff',.7),(.75,'#000',1)])+'<mask id="amk"><rect width="1600" height="1000" fill="url(#am)"/></mask>'
scene('frost-aurora',11,[(0,'#061426',1),(.5,'#0d2a4a',1),(.8,'#1e4d74',1),(1,'#3d7aa3',1)],
 [dict(base=720,amp=260,style='angular',col='#2b5b86',grad=[(0,'#7fb4dc',1),(.5,'#2b5b86',1),(1,'#1a3c5e',1)],rim=('#dff3ff',2,.8),fog=('#bfe4ff',.45,520)),
  dict(base=820,amp=220,style='angular',col='#173a5c',grad=[(0,'#4f86b4',1),(.4,'#173a5c',1),(1,'#0f2740',1)],rim=('#eaf8ff',2.4,.9),fog=('#9fd0f0',.4,680)),
  dict(base=930,amp=110,style='angular',col='#0a1c30',rim=('#cfeeff',1.5,.6))],
 extra_defs=aur,
 back=specks(4,170,['#fff'],0,600,(.5,1.6))+'<g mask="url(#amk)"><rect width="1600" height="1000" filter="url(#aur)" opacity=".85"/><rect width="1600" height="1000" filter="url(#aur2)" opacity=".6"/></g>',
 front=specks(8,90,['#fff','#dff3ff'],200,1000,(1,2.6),op=(.4,.9)))

# ---------- Infernal: jagged rock over lava ----------
scene('infernal-lava',23,[(0,'#090403',1),(.5,'#1c0806',1),(.78,'#5a1208',1),(.92,'#c2320f',1),(1,'#ff8a1f',1)],
 [dict(base=700,amp=240,style='jagged',col='#3a100a',fog=('#ff5a1a',.5,420)),
  dict(base=800,amp=230,style='jagged',col='#200806',fog=('#e0380f',.55,600),after='<rect width="1600" height="1000" filter="url(#sm2)" opacity=".5"/>'),
  dict(base=930,amp=150,style='jagged',col='#090403',rim=('#ff7a2a',1.6,.55))],
 extra_defs=smoke('sm',(.06,.03,.03),1.7,-.6)+smoke('sm2',(.9,.3,.08),1.5,-.72,'.005 .012',31)+'<radialGradient id="gl" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ff3a0f" stop-opacity="0"/></radialGradient>',
 back='<rect width="1600" height="1000" fill="url(#gl)"/><rect width="1600" height="1000" filter="url(#sm)"/>',
 front=specks(5,150,['#ffb347','#ff6a1f','#ffe08a'],200,990,(.8,2.6),dx=1.2,dy=-3.4,glow=True))

# ---------- Desert Wastes: dunes, mesas, big sun ----------
def mesas():
    r=random.Random(6);s=[]
    for (x,w,h) in [(180,260,170),(520,120,110),(1180,330,200),(1460,150,130)]:
        s.append('<path d="M%d 640 l%d %d l%d -8 l%d 6 l%d %d Z"/>'%(x-w*.62,w*.12,-h,w*.5,w*.5,w*.12,h+2))
    return '<g fill="#c9784a" opacity=".85" filter="url(#rough)">%s</g>'%''.join(s)
scene('desert-dunes',31,[(0,'#f7d9a3',1),(.4,'#f3bd7a',1),(.62,'#ee9a5a',1),(1,'#e07f45',1)],
 [dict(base=660,amp=40,col='#d98a52',rough=False,fog=('#f9d7a0',.5,500)),
  dict(base=740,amp=90,col='#c66d3c',grad=[(0,'#e39558',1),(1,'#b85f33',1)],tilt=90,fog=('#f3bd7a',.35,640)),
  dict(base=840,amp=110,col='#a44f2a',grad=[(0,'#cf7a45',1),(1,'#8f4222',1)],tilt=-120),
  dict(base=950,amp=80,col='#6e3018',grad=[(0,'#9a4a26',1),(1,'#5a2612',1)],tilt=70)],
 extra_defs='<radialGradient id="sn"><stop offset="0" stop-color="#fffbe6"/><stop offset=".55" stop-color="#ffe9a8"/><stop offset=".56" stop-color="#ffe9a8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>'+smoke('hz',(1,.9,.7),1.4,-.72,'.002 .03',4),
 back='<circle cx="1120" cy="360" r="330" fill="url(#sn)"/><rect width="1600" height="700" filter="url(#hz)" opacity=".5"/>'+mesas(),
 front=specks(9,60,['#fff3d6'],300,980,(.6,1.8),dx=4,dy=-.6,op=(.2,.6)))

# ---------- Wildwood: misty layered pines ----------
scene('forest-mist',47,[(0,'#f3f6dc',1),(.45,'#dfeac2',1),(1,'#c4d9a4',1)],
 [dict(base=640,amp=120,col='#a9c58d',trees=70,rough=False,fog=('#eef4d6',.75,430)),
  dict(base=740,amp=130,col='#7ea468',trees=105,rough=False,fog=('#e3edc6',.7,560)),
  dict(base=850,amp=120,col='#4f7d49',trees=150,rough=False,fog=('#d6e6b8',.55,700)),
  dict(base=960,amp=90,col='#2c4a2a',trees=210,rough=False)],
 extra_defs='<radialGradient id="sn"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient>'+grad('ray',[(0,'#fffbe0',.5),(1,'#fffbe0',0)]),
 back='<circle cx="1180" cy="300" r="380" fill="url(#sn)"/>',
 front='<g opacity=".5">'+''.join('<path d="M%d 150 L%d 150 L%d 1000 L%d 1000 Z" fill="url(#ray)"/>'%(x,x+w,x+w-420,x-420-w*1.6) for x,w in [(1080,40),(1190,70),(1330,30),(1420,55)])+'</g>'+specks(3,46,['#fff7b0','#ffe66b'],420,960,(1.2,2.8),op=(.5,1),glow=True),grain=False)

# ---------- Dwarven: jade peaks, gold rims, forge glow ----------
def runes():
    s=[];r=random.Random(2)
    for i in range(34):
        x=24+i*47; k=r.choice([0,1,2,3])
        d=['M0 0 V26 M0 4 L10 12 L0 20','M0 0 V26 M0 13 L10 3 M0 13 L10 23','M0 26 L6 0 L12 26 M3 15 H9','M0 0 L10 13 L0 26 M10 0 L0 13 L10 26'][k]
        s.append('<path d="%s" transform="translate(%d 0)"/>'%(d,x))
    return ''.join(s)
scene('dwarf-peaks',53,[(0,'#050b0a',1),(.5,'#0b1a17',1),(.8,'#123029',1),(1,'#2a4a36',1)],
 [dict(base=690,amp=300,style='angular',col='#14332c',grad=[(0,'#2f6a5a',1),(.5,'#14332c',1),(1,'#0c1f1b',1)],rim=('#e0b04f',2,.75),fog=('#e0a84a',.22,480)),
  dict(base=820,amp=240,style='angular',col='#0e241f',grad=[(0,'#1f4a3f',1),(.45,'#0e241f',1),(1,'#08140f',1)],rim=('#f0c868',2.4,.9),fog=('#f09a3a',.3,660)),
  dict(base=940,amp=120,style='angular',col='#060d0b',rim=('#c99a45',1.6,.7))],
 extra_defs='<radialGradient id="gl" cx=".5" cy="1.02" r=".6"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></radialGradient>'+smoke('sm',(.03,.08,.07),1.6,-.62),
 back='<rect width="1600" height="1000" filter="url(#sm)"/>'+specks(4,90,['#f0c868','#fff'],0,520,(.5,1.4),op=(.3,.8))+'<rect width="1600" height="1000" fill="url(#gl)"/>',
 front=specks(12,70,['#ffcf70','#ff9a3a'],500,990,(.8,2.2),dx=.8,dy=-3,glow=True))

# ---------- Eldritch Abyss: light shafts, kelp, glow ----------
def kelp(seed,n,col,hmin,hmax,sw):
    r=random.Random(seed);s=[]
    for k in range(n):
        x=r.uniform(-20,W+20);h=r.uniform(hmin,hmax);a=r.uniform(20,60);ph=r.choice([-1,1])
        d='M%.0f %d '%(x,H+10); y=H+10; seg=h/6
        for j in range(6):
            d+='q%.0f %.0f %.0f %.0f '%(ph*a,-seg/2,0,-seg); ph=-ph
        s.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.0f" stroke-linecap="round"/>'%(d,col,r.uniform(sw*.6,sw*1.3)))
    return ''.join(s)
def tentacle(x,h,lean,col):
    return '<path d="M%d %d C%d %d %d %d %d %d C%d %d %d %d %d %d L%d %d Z" fill="%s"/>'%(x-46,H+10,x-30,H-h*.4,x+lean-60,H-h*.7,x+lean,H-h, x+lean+40,H-h*.72,x+26,H-h*.35,x+52,H+10,x,H+10,col)
scene('abyss-shafts',61,[(0,'#0c4a4a',1),(.3,'#06302f',1),(.7,'#031a1b',1),(1,'#010909',1)],
 [dict(base=820,amp=110,col='#062a2a',after='<g opacity=".8">'+kelp(3,26,'#083a36',260,520,10)+'</g>',fog=('#1fd3a4',.12,520)),
  dict(base=900,amp=90,col='#031716',after=tentacle(210,430,90,'#031716')+tentacle(1380,520,-120,'#031716')+tentacle(1220,300,60,'#031716')+kelp(9,18,'#02100f',200,420,14)),
  dict(base=975,amp=40,col='#010808',rim=('#2fd3a4',1.2,.35))],
 extra_defs=grad('ray',[(0,'#7dffe0',.34),(1,'#7dffe0',0)])+smoke('ca',(.4,1,.85),1.5,-.78,'.006 .02',14),
 back='<g>'+''.join('<path d="M%d -10 L%d -10 L%d 900 L%d 900 Z" fill="url(#ray)"/>'%(x,x+w,x+w+sp+260,x-sp+260) for x,w,sp in [(240,70,120),(520,40,60),(690,110,160),(980,50,80),(1180,90,140)])+'</g><rect width="1600" height="500" filter="url(#ca)" opacity=".35"/>',
 front=specks(7,70,['#7dffe0','#5dc8ff','#b58cff'],300,980,(1,3),op=(.4,1),glow=True)+specks(21,60,['#d8fff5'],100,950,(1.5,4.5),op=(.08,.25)))

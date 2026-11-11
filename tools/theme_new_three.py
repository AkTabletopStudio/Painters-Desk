import random, math, sys, re
out=sys.argv[1]; icons=sys.argv[2]
src=open('/home/user/gen/gen_scenes.py').read()
exec(src.split('# ---------- Frostforge')[0].replace("out=sys.argv[1]","pass"))
globals()['out']=out
W,H=1600,1000

# ---------- Void Station ----------
r=random.Random(5)
PX,PY,PR=1180,1560,980
planet='<circle cx="%d" cy="%d" r="%d" fill="url(#atm)"/><circle cx="%d" cy="%d" r="%d" fill="url(#pl)"/><circle cx="%d" cy="%d" r="%d" fill="none" stroke="#9fe8ff" stroke-width="2.5" opacity=".9"/>'%(PX,PY,PR+90,PX,PY,PR,PX,PY,PR)
bands='<g clip-path="url(#pc)" opacity=".5"><rect x="0" y="560" width="1600" height="500" filter="url(#cl)"/></g>'
# ring station
def station(x,y,s):
    g='<g transform="translate(%d %d) rotate(-18) scale(%s)" fill="none" stroke="#c9d6ea" stroke-width="3">'%(x,y,s)
    g+='<ellipse rx="70" ry="22"/><ellipse rx="52" ry="15" stroke-width="1.5" opacity=".7"/><path d="M-70 0 H70 M0 -22 V22" stroke-width="2"/><rect x="-9" y="-9" width="18" height="18" fill="#c9d6ea" stroke="none"/>'
    g+='<path d="M-120 -4 h38 v8 h-38z M82 -4 h38 v8 h-38z" fill="#5aa8ff" stroke="none" opacity=".9"/><circle cx="64" cy="8" r="2.5" fill="#ff5c7a" stroke="none"/></g>'
    return g
scene('void-orbit',5,[(0,'#03040b',1),(.5,'#070b1c',1),(1,'#0b1230',1)],[],
 extra_defs=smoke('neb',(.45,.25,.9),1.6,-.78,'.0025 .004',9)+smoke('neb2',(.1,.5,.9),1.5,-.8,'.003 .005',33)+smoke('cl',(.7,.95,1),1.8,-.75,'.002 .02',4)
 +'<radialGradient id="pl" cx=".42" cy=".06" r=".7"><stop offset="0" stop-color="#3f7fb8"/><stop offset=".25" stop-color="#1d4a80"/><stop offset=".6" stop-color="#0b1f45"/><stop offset="1" stop-color="#05070f"/></radialGradient>'
 +'<radialGradient id="atm" cx=".5" cy=".5" r=".5"><stop offset=".9" stop-color="#5ad1ff" stop-opacity=".55"/><stop offset="1" stop-color="#5ad1ff" stop-opacity="0"/></radialGradient>'
 +'<clipPath id="pc"><circle cx="%d" cy="%d" r="%d"/></clipPath>'%(PX,PY,PR)
 +'<radialGradient id="mn" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e8ecf5"/><stop offset=".6" stop-color="#8c94a8"/><stop offset="1" stop-color="#2a3044"/></radialGradient>',
 back='<rect width="1600" height="1000" filter="url(#neb)" opacity=".55"/><rect width="1600" height="1000" filter="url(#neb2)" opacity=".4"/>'+specks(2,340,['#fff','#cfe4ff','#ffe9c9'],0,1000,(.4,1.7),op=(.3,1))+specks(8,14,['#fff'],0,700,(1.8,2.6),op=(.8,1),glow=True)
 +planet+bands+'<circle cx="1330" cy="415" r="40" fill="url(#mn)"/>'+station(1040,455,.9),grain=False)

# ---------- Egyptian Tomb ----------
def pyramid(x,base,w,h,lit,shade):
    return '<path d="M%d %d L%d %d L%d %d Z" fill="%s"/><path d="M%d %d L%d %d L%d %d Z" fill="%s"/>'%(x-w/2,base,x,base-h,x+w*.12,base,lit, x+w*.12,base,x,base-h,x+w/2,base,shade)
def palm(x,base,h,col):
    s='<path d="M%d %d q%d %d %d %d" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/>'%(x,base,-18,-h/2,10,-h,col)
    tx,ty=x+10,base-h
    for a,l in [(-160,90),(-130,105),(-95,80),(-50,105),(-20,92),(15,70),(195,70)]:
        ex,ey=tx+math.cos(math.radians(a))*l,ty+math.sin(math.radians(a))*l*.75+26
        s+='<path d="M%d %d Q%.0f %.0f %.0f %.0f Q%.0f %.0f %d %d Z" fill="%s"/>'%(tx,ty,(tx+ex)/2,ty-34,ex,ey,(tx+ex)/2,ty-8,tx,ty,col)
    return s
pyr=pyramid(1020,680,520,330,'#d99a55','#8a4a2a')+pyramid(1330,680,360,225,'#cf8d4c','#7d4226')+pyramid(690,680,250,150,'#c98a4e','#7a4126')
scene('egypt-dusk',71,[(0,'#150b2e',1),(.3,'#4a1d4f',1),(.52,'#b5443d',1),(.66,'#f08a3a',1),(.7,'#ffc46b',1),(1,'#e0a060',1)],
 [dict(base=690,amp=26,col='#b56a38',rough=False,fog=('#ffc46b',.3,600)),
  dict(base=770,amp=80,col='#8f4a25',grad=[(0,'#c27a42',1),(1,'#7a3c1c',1)],tilt=110),
  dict(base=880,amp=90,col='#5a2a12',grad=[(0,'#8a4a24',1),(1,'#3d1c0c',1)],tilt=-130,after='<g>'+palm(170,900,230,'#1c0d06')+palm(260,930,170,'#1c0d06')+palm(1500,900,200,'#1c0d06')+'</g>'),
  dict(base=965,amp=50,col='#1c0d06')],
 extra_defs='<radialGradient id="sn"><stop offset="0" stop-color="#fff6d0"/><stop offset=".34" stop-color="#ffd27a"/><stop offset=".36" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>',
 back=specks(3,150,['#fff','#ffe9c9'],0,420,(.5,1.5),op=(.3,.9))+'<circle cx="820" cy="640" r="330" fill="url(#sn)"/>'+pyr,
 front=specks(9,40,['#ffe9c9'],500,980,(.6,1.6),dx=4,dy=-.5,op=(.15,.5)))

# ---------- Steampunk Workshop ----------
def gear(cx,cy,R,teeth,col,hub='#1a110b',spokes=6):
    pts=[];th=R*.16
    for i in range(teeth):
        a0=2*math.pi*i/teeth; da=2*math.pi/teeth
        for f,rad in [(0,R),(.18,R+th),(.42,R+th),(.6,R)]:
            a=a0+da*f; pts.append((cx+math.cos(a)*rad,cy+math.sin(a)*rad))
    s='<path d="M'+' L'.join('%.1f %.1f'%p for p in pts)+'Z" fill="%s" stroke="#2a1a0c" stroke-width="2"/>'%col
    s+='<circle cx="%d" cy="%d" r="%.0f" fill="%s"/>'%(cx,cy,R*.72,hub)
    for i in range(spokes):
        a=2*math.pi*i/spokes
        s+='<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%.0f" stroke-linecap="round"/>'%(cx+math.cos(a)*R*.16,cy+math.sin(a)*R*.16,cx+math.cos(a)*R*.74,cy+math.sin(a)*R*.74,col,R*.11)
    s+='<circle cx="%d" cy="%d" r="%.0f" fill="%s" stroke="#2a1a0c" stroke-width="2"/><circle cx="%d" cy="%d" r="%.0f" fill="#1a110b"/>'%(cx,cy,R*.22,col,cx,cy,R*.08)
    return s
def gauge(cx,cy,R,val):
    s='<circle cx="%d" cy="%d" r="%d" fill="url(#br)" stroke="#2a1a0c" stroke-width="3"/><circle cx="%d" cy="%d" r="%.0f" fill="#f1e3c0" stroke="#5a3c14" stroke-width="2"/>'%(cx,cy,R,cx,cy,R*.8)
    for i in range(13):
        a=math.radians(210-i*20); l=.62 if i%3 else .52
        s+='<path d="M%.1f %.1f L%.1f %.1f" stroke="#3a2410" stroke-width="%s"/>'%(cx+math.cos(a)*R*.72,cy-math.sin(a)*R*.72,cx+math.cos(a)*R*l,cy-math.sin(a)*R*l,2.4 if i%3==0 else 1.2)
    a=math.radians(210-val*240)
    s+='<path d="M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f" fill="none" stroke="#b0432f" stroke-width="%.0f"/>'%(cx+math.cos(math.radians(10))*R*.66,cy-math.sin(math.radians(10))*R*.66,R*.66,R*.66,cx+math.cos(math.radians(-30))*R*.66,cy-math.sin(math.radians(-30))*R*.66,R*.08)
    s+='<path d="M%d %d L%.1f %.1f" stroke="#7a1f14" stroke-width="3.5" stroke-linecap="round"/><circle cx="%d" cy="%d" r="%.0f" fill="#3a2410"/>'%(cx,cy,cx+math.cos(a)*R*.6,cy-math.sin(a)*R*.6,cx,cy,R*.09)
    return s
def pipe(y,x0,x1,t,flanges):
    s='<rect x="%d" y="%d" width="%d" height="%d" fill="url(#pp)"/>'%(x0,y,x1-x0,t)
    for fx in flanges:
        s+='<rect x="%d" y="%d" width="22" height="%d" rx="3" fill="url(#pp)" stroke="#2a1a0c" stroke-width="2"/>'%(fx,y-7,t+14)
        for k in range(3): s+='<circle cx="%d" cy="%.0f" r="2.4" fill="#f3d98c"/>'%(fx+11,y-2+k*(t+4)/2)
    return s
def vpipe(x,y0,y1,t):
    return '<rect x="%d" y="%d" width="%d" height="%d" fill="url(#ppv)"/>'%(x,y0,t,y1-y0)
planks=''.join('<rect x="%d" y="0" width="%d" height="1000" fill="%s"/><path d="M%d 0 V1000" stroke="#0d0805" stroke-width="3"/>'%(x,160,c,x) for x,c in zip(range(0,1600,160),['#2a1a10','#25160d','#2d1c11','#231509','#2a1a10','#27170e','#2d1c11','#24150c','#2a1a10','#26170d']))
machinery=(vpipe(1010,300,640,26)+vpipe(1500,250,640,34)+pipe(330,-10,1610,30,[180,520,860,1240])+pipe(410,620,1610,20,[760,1120,1420])
 +'<path d="M1010 640 h-90 v60" fill="none" stroke="#a8792e" stroke-width="20"/>'
 +gear(1320,560,150,18,'url(#br)')+gear(1118,640,84,12,'#8a5f22')+gear(1478,700,70,10,'#c08a3a')+gear(250,650,96,14,'#6e4a1c')
 +gauge(700,420,58,.72)+gauge(880,330,40,.35)+gauge(1420,330,46,.55))
rivets=''.join('<circle cx="%d" cy="%d" r="3.5" fill="#6e4a1c"/><circle cx="%d" cy="%d" r="1.4" fill="#e9c877"/>'%(x+12,y,x+11,y-1) for x in range(0,1600,160) for y in (250,760))
scene('steam-works',9,[(0,'#150d08',1),(1,'#1a110b',1)],[],
 extra_defs='<linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d98c"/><stop offset=".45" stop-color="#c9953e"/><stop offset="1" stop-color="#7a5320"/></linearGradient>'
 +'<linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5f22"/><stop offset=".3" stop-color="#f0cf80"/><stop offset=".55" stop-color="#b9853a"/><stop offset="1" stop-color="#4a3010"/></linearGradient>'
 +'<linearGradient id="ppv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5f22"/><stop offset=".3" stop-color="#f0cf80"/><stop offset=".55" stop-color="#b9853a"/><stop offset="1" stop-color="#4a3010"/></linearGradient>'
 +'<radialGradient id="lamp" cx=".72" cy=".5" r=".55"><stop offset="0" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>'
 +smoke('wood',(.0,.0,.0),1.2,-.5,'.002 .09',3)+smoke('st',(.95,.92,.85),1.5,-.8,'.006 .009',22)
 +grad('fb',[(0,'#1a110b',0),(.62,'#1a110b',0),(.82,'#1a110b',1)]),
 back=planks+'<rect width="1600" height="1000" filter="url(#wood)" opacity=".45"/>'+rivets+'<rect width="1600" height="1000" fill="url(#lamp)"/>'+machinery
 +'<rect y="200" width="1600" height="520" filter="url(#st)" opacity=".28"/><rect width="1600" height="1000" fill="url(#fb)"/>')

# ---------- icons ----------
def wheel(cx,cy,R,r0,cols,stroke,sw=6):
    s=''
    n=len(cols)
    for i,c in enumerate(cols):
        a0=2*math.pi*i/n-math.pi/2; a1=2*math.pi*(i+1)/n-math.pi/2
        p=lambda a,rad:(cx+math.cos(a)*rad,cy+math.sin(a)*rad)
        x0,y0=p(a0,R);x1,y1=p(a1,R);x2,y2=p(a1,r0);x3,y3=p(a0,r0)
        s+='<path d="M%.1f %.1f A%d %d 0 0 1 %.1f %.1f L%.1f %.1f A%d %d 0 0 0 %.1f %.1f Z" fill="%s" stroke="%s" stroke-width="%d"/>'%(x0,y0,R,R,x1,y1,x2,y2,r0,r0,x3,y3,c,stroke,sw)
    return s
def icon(name,bg,body):
    open('%s/%s.svg'%(icons,name),'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs><clipPath id="c"><rect x="12" y="12" width="488" height="488" rx="96"/></clipPath><linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d98c"/><stop offset=".45" stop-color="#c9953e"/><stop offset="1" stop-color="#7a5320"/></linearGradient></defs><g clip-path="url(#c)">%s%s</g></svg>'%(bg,body))
icon('steam','<rect width="512" height="512" fill="#24150c"/>',gear(256,256,196,16,'url(#br)',hub='#24150c',spokes=0)+'<circle cx="256" cy="256" r="150" fill="#1a110b"/>'+wheel(256,256,138,44,['#b0432f','#cf7a2e','#e0b04f','#6f8f4a','#3f8a7a','#3d5f8a','#6a4a85','#8a3a55'],'#1a110b',5)+'<circle cx="256" cy="256" r="30" fill="url(#br)" stroke="#1a110b" stroke-width="5"/>')
icon('egypt','<rect width="512" height="512" fill="#1f3f8a"/><path d="M0 512 L256 150 L512 512 Z" fill="#e0b04f"/><path d="M256 150 L512 512 H300 Z" fill="#a8792e"/>',wheel(256,250,150,50,['#c0392b','#e07b2e','#e8c14e','#5f9a55','#2f8f8a','#2a5fb0','#5a3f9a','#9a3a6a'],'#f6ecd0',6)+'<circle cx="256" cy="250" r="34" fill="#e8c14e" stroke="#1f3f8a" stroke-width="6"/><circle cx="256" cy="250" r="12" fill="#1f3f8a"/>')
icon('void','<rect width="512" height="512" fill="#050814"/><circle cx="256" cy="700" r="380" fill="#16407a"/><circle cx="256" cy="700" r="380" fill="none" stroke="#7fe0ff" stroke-width="6"/>'+''.join('<circle cx="%d" cy="%d" r="%s" fill="#fff"/>'%p for p in [(70,80,3),(430,60,4),(460,200,2.5),(60,250,2.5),(140,40,2),(380,130,2)]),wheel(256,236,150,54,['#ff5c7a','#ff9a5c','#ffe07a','#5dffb0','#46e0ff','#5a8cff','#9d7bff','#ff6bd0'],'#050814',6)+'<circle cx="256" cy="236" r="172" fill="none" stroke="#c9d6ea" stroke-width="5"/><circle cx="256" cy="236" r="34" fill="#c9d6ea"/><circle cx="256" cy="236" r="12" fill="#050814"/>')

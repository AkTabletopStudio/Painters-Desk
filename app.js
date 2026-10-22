const AB={Dark:'Dk',Bright:'Br',Yellow:'Yel',Orange:'Orng',Green:'Grn',Brown:'Brn',Burnt:'Brnt',Fluorescent:'Fluor',Golden:'Gld',Magenta:'Mag',Turquoise:'Turq',Ultramarine:'Ultram.',Pyrrole:'Pyr.',Shadow:'Shdw',Advanced:'Adv.',Petroleum:'Petrol.',Burgundy:'Burg.',Crimson:'Crim.',Mahogany:'Mahog.',Emerald:'Emer.',Neutral:'Neut.',Titanium:'Ti',Heavy:'Hvy',Faded:'Fdd',Wash:'Wsh',Flesh:'Flsh',Yellow_:''};
let g='M';const P=[];
RAW.split('\n').forEach(l=>{if(l[0]==='#'){g=l[1];return}const[n,c,h]=l.split('|');const r=parseInt(h.slice(1,3),16)/255,gg=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn,L=(mx+mn)/2;let H=0;
if(d){H=mx===r?((gg-b)/d)%6:mx===gg?(b-r)/d+2:(r-gg)/d+4;H=(H*60+360)%360}
const S=d?d/(1-Math.abs(2*L-1)):0;
P.push({n,c,h,g,H,S,L,lum:.299*r+.587*gg+.114*b,k:g+'|'+c+'|'+n,i:P.length})});
// Signed-in user's paint collection (set of paint keys), filled in by account.js. null when signed out.
let OWN=null,ONLY_MINE=false;const own=p=>!!OWN&&OWN.has(p.k),star=p=>own(p)?'<b class="own" title="In your collection">★</b> ':'';
let CH=[],NE=[],U=h=>h;const on={p:1},CX=500,CY=500;
// Metallics: the metallic ranges (incl. Vallejo TMM, Turbo Dork, AK 3rd Gen), anything labelled Met./Metallic, and metal names
// in other ranges unless the name is a pigment colour (Chrome Oxide Green, Steel Legion Drab, Bronze Green...).
const MET_G=new Set(['D','I','Q','X','u','m','L','q']),MET_RX=/metal|\bgold\b|silver|bronze|brass|copper|steel|\biron\b|chrome|leadbelcher|retributor|balthasar|warplock|screaming bell|stormhost|liberator|auric|gehenna|sycorax|necron|runefang|ironbreaker|canoptek|fulgurite|hashut|skullcrusher|aluminium|aluminum|pewter|platinum|nickel/i;
const isMet=p=>MET_G.has(p.g)||/\bmet(al|allic)?\b/i.test(p.n+' '+p.c)||/gunmetal/i.test(p.n)||p.c==='70.877'||MET_RX.test(p.n)&&!/yellow|green|brown|grey|oxide|drab|blue|wolf/i.test(p.n);
// Paint types: everything that isn't an opaque base/layer/air paint. The ranges say most of it; mixed ranges are sorted by name or code.
const PT_G={c:'con',S:'con',x:'con','1':'con',W:'wash',s:'wash',w:'wash',z:'wash',n:'ink',i:'ink',T:'ink',r:'ink',F:'fx',f:'fx',t:'tech',P:'tech',G:'tech',B:'tech'};
const paintType=p=>p.pt||(p.pt=isMet(p)?'met':PT_G[p.g]||(/speedpaint|contrast/i.test(p.c)?'con':/\bwash$/i.test(p.c)||/\bwash\b|\bshade$/i.test(p.n)?'wash':/\bink$/i.test(p.n)?'ink':/fluo|^neon|effects$/i.test(p.n+'|'+p.c)?'fx':/^matt .*primer$|varnish$|^(shading|blending|chipping) medium$/i.test(p.n)?'tech':'op'));
const PTYPES=[['met','Metallics','Metal paints, shifts and metallic effects'],['con','Contrast & speedpaints','Contrast, Speedpaint, Xpress and 1-Step one-coat paints'],['wash','Washes & shades','Recess shades, they only show over a basecoat'],['ink','Inks, glazes & transparents','Tint whatever is under them'],['fx','Fluorescents & special FX','Fluoro, blood, rust, corrosion and other effects'],['tech','Technical, primers & mediums','Texture, technical, primers, pigments, varnish and mediums']];
// Hidden types live in pd-types; first visit hides the types that rarely help colour theory (metallics follow the old Hide metallics setting).
let HIDE_T=new Set(['wash','ink','fx','tech']);try{const s=localStorage.getItem('pd-types');if(s!==null)HIDE_T=new Set(JSON.parse(s));else if(localStorage.getItem('pd-met')==='1')HIDE_T.add('met')}catch(e){}
const shown=p=>!HIDE_T.has(paintType(p));
function layout(){const vis=p=>p.on&&shown(p);CH=P.filter(p=>vis(p)&&p.g!=='B'&&p.S>=.14&&p.L>.07&&p.L<.95);const chs=new Set(CH);NE=P.filter(p=>vis(p)&&!chs.has(p)).sort((a,b)=>a.L-b.L);
const MD=CH.length>140?44:54;const srt=[...CH].sort((a,b)=>a.L-b.L);srt.forEach((p,i)=>p.rk=i/Math.max(1,srt.length-1));
U=h=>h;
CH.forEach(p=>{const a=U(p.H)*Math.PI/180-Math.PI/2,r=135+(.55*p.rk+.45*Math.min(1,Math.max(0,(p.L-.1)/.85)))*320;p.ox=CX+r*Math.cos(a);p.oy=CY+r*Math.sin(a);p.x=p.ox;p.y=p.oy});
// Push-apart only checks dots in the same or neighbouring grid cells (cell = MD), so it scales with the number of dots, not its square.
const G=Math.ceil(1000/MD)+3,cell=new Map(),ck=(x,y)=>(Math.floor(x/MD)+1)*G+Math.floor(y/MD)+1;
for(let it=0;it<500;it++){cell.clear();CH.forEach((p,i)=>{const k=ck(p.x,p.y),c=cell.get(k);if(c)c.push(i);else cell.set(k,[i])});
for(let i=0;i<CH.length;i++){const a=CH[i],k0=ck(a.x,a.y);for(let gx=-G;gx<=G;gx+=G)for(let gy=-1;gy<=1;gy++){const c=cell.get(k0+gx+gy);if(c)for(const j of c){if(j<=i)continue;const b=CH[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<MD){const k=(MD-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k}}}
a.x+=(a.ox-a.x)*.008;a.y+=(a.oy-a.y)*.008;const dx=a.x-CX,dy=a.y-CY,d=Math.hypot(dx,dy);if(d>455||d<125){const t=Math.min(455,Math.max(125,d))/d;a.x=CX+dx*t;a.y=CY+dy*t}}}}
function lines(n){let w=n.split(' ').map(x=>AB[x]||x);if(w.length===1)return w;let best=1,bm=1e9;for(let k=1;k<w.length;k++){const m=Math.max(w.slice(0,k).join(' ').length,w.slice(k).join(' ').length);if(m<bm){bm=m;best=k}}return[w.slice(0,best).join(' '),w.slice(best).join(' ')]}
function hd(a,b){const d=Math.abs(a-b)%360;return d>180?360-d:d}
/* ---------- Ramp mode (NMM, OSL, gems, skin, zenithal, edge highlights, glazes) ----------
   Tap a paint and it builds a light ramp for the chosen technique. Each technique sets its own stops in Lab/LCh
   (how dark and light it goes, how chroma and hue drift, and what the optional tint does). Each stop then takes the
   nearest ticked opaque paint by ΔE (lightness weighted, since value contrast is what sells a ramp). Swatches are estimates. */
let MODE='col',NB=null,nmmSkip=[],NMM_DRAFT=null;const NMO={n:7,t:false,q:'nmm'};
const nmmSave=()=>{try{localStorage.setItem('pd-nmm',JSON.stringify({m:MODE,n:NMO.n,t:NMO.t,q:NMO.q}))}catch(e){}};
// Ramps are built with opaque layer paints (paintType 'op'); the name check also catches stray wash/glaze/filter/medium names.
const NMM_RX=/metal|gold|silver|bronze|brass|copper|steel|iron\b|chrome|gunmetal|leadbelcher|retributor|balthasar|warplock|screaming bell|stormhost|liberator|auric|gehenna|sycorax|necron|runefang|ironbreaker|canoptek|fulgurite|hashut|skullcrusher|aluminium|aluminum|titanium|pewter|platinum|nickel|wash|glaze|\bink\b|contrast|speedpaint|filter|fluo|primer|pigment|texture|varnish|medium|transparent/i;
const nmmOK=p=>paintType(p)==='op'&&!NMM_RX.test(p.n)&&!NMM_RX.test(p.c);
const lch=p=>[p.lab[0],Math.hypot(p.lab[1],p.lab[2]),(Math.atan2(p.lab[2],p.lab[1])*180/Math.PI+360)%360];
const lab3=(L,C,h)=>[L,C*Math.cos(h*Math.PI/180),C*Math.sin(h*Math.PI/180)];
const hdS=(a,b)=>(b-a+540)%360-180;
// Shared shape: darker roles from Ld up to the base, the base, then lighter roles from the base toward Lt.
// sC/sH give shadow chroma and hue (t runs 0→1 toward the base), lC/lH the same for lights (t runs 0→1 away from it), then the top stop.
function rampOf(b,o){const[L0,C0,h0]=lch(b),out=[];
o.dk.forEach((r,k)=>{const t=k/o.dk.length;out.push({r,t:lab3(o.Ld+(L0-o.Ld)*t,o.sC(C0,t),o.sH(h0,t))})});
out.push({r:o.baseName||'Base',t:b.lab,base:1});
o.lt.forEach((r,k)=>{const t=(k+1)/(o.lt.length+1);out.push({r,t:lab3(L0+(o.Lt-L0)*t,o.lC(C0,t),o.lH(h0,t))})});
out.push({r:o.top,t:lab3(o.topL,o.topC(C0),o.topH?o.topH(h0):o.lH(h0,1))});
return out}
const tintAt=(out,L,C,h)=>{out[0].t=lab3(L,C,h);out[0].tint=1;return out};
const L7=()=>NMO.n===7;
const TQ={
nmm:{name:'NMM',full:'Non-metallic metal',sum:'Non-metallic metal ramp built on the Painters Desk wheel.',prev:'blade',tint:'Tint the deepest shadow',
 hint:'Tap a paint on the wheel or in the neutrals list to build its NMM ramp.',
 targets(b){const[L0,C0,h0]=lch(b),warm=C0>12&&h0>20&&h0<110,sh=warm?hdS(h0,45)*.6:0,hl=warm?hdS(h0,95)*.5:0;
  const out=rampOf(b,{dk:L7()?['Deep shadow','Shadow','Dark mid']:['Deep shadow','Shadow'],lt:L7()?['Highlight','Bright highlight']:['Highlight'],Ld:9,Lt:96,top:'Glint',topL:98,topC:()=>3,topH:h=>h,
   sC:(C,t)=>C*(.3+.6*t),sH:(h,t)=>h+sh*(1-t),lC:(C,t)=>C*(1-.6*t),lH:(h,t)=>h+hl*t});
  // Tinted shadow: purple under warm metals, warm brown under greys/steel, otherwise the complement.
  return NMO.t?tintAt(out,12,Math.max(14,C0*.45),warm?305:C0<12?60:(h0+180)%360):out},
 tip:{'Deep shadow':'Thin coats into the deepest recesses and the side facing away from the light.','Shadow':'Most of the shaded half. Keep the edge against the base fairly crisp.','Dark mid':'Blend the shadow into the base.','Base':'The colour the metal reads as. Cover the lit half.','Highlight':'Narrower band where light falls, leaving base showing around it.','Bright highlight':'A smaller band inside the highlight.','Glint':'Tiny dots or a sharp line where the light hits hardest.'}},
osl:{name:'OSL',full:'Object source lighting',sum:'Object source lighting ramp built on the Painters Desk wheel.',prev:'osl',tint:'Cool the unlit surface',
 hint:'Tap the colour of the light (the glow) to build an OSL ramp.',
 targets(b){const[L0,C0,h0]=lch(b);
  const out=rampOf(b,{dk:L7()?['Unlit surface','Falloff','Glow edge']:['Unlit surface','Glow edge'],lt:L7()?['Bright glow','Hot core']:['Hot core'],Ld:16,Lt:94,baseName:'Glow',top:'Light source',topL:97,topC:()=>4,
   sC:(C,t)=>Math.min(10,C*.25)+(C*1.05-Math.min(10,C*.25))*t,sH:h=>h,lC:(C,t)=>C*(1-.6*t*t),lH:(h,t)=>h+hdS(h,95)*.25*t});
  // The surface away from the light keeps its own cool shadow: lean it toward the glow's complement.
  return NMO.t?tintAt(out,16,12,(h0+180)%360):out},
 tip:{'Unlit surface':'The surface beyond the glow\'s reach. Paint the area around the light in this first.','Falloff':'Where the light fades out. Feather it softly into the unlit surface.','Glow edge':'A saturated ring of the light colour on the nearest surfaces.','Glow':'The light colour on the surfaces facing the source.','Bright glow':'Closer in and on edges that face the source.','Hot core':'Right around the source, kept small.','Light source':'The source itself: the brightest point on the model.'}},
gem:{name:'Gems',full:'Gems and lenses',sum:'Gem and lens ramp built on the Painters Desk wheel.',prev:'gem',tint:'Cool the deepest shadow',
 hint:'Tap a paint to build a gem or lens ramp.',
 targets(b){const[L0,C0,h0]=lch(b);
  const out=rampOf(b,{dk:L7()?['Deep shadow','Shadow','Dark mid']:['Deep shadow','Shadow'],lt:L7()?['Reflected light','Bright reflection']:['Reflected light'],Ld:8,Lt:86,top:'Glint',topL:98,topC:()=>2,
   sC:(C,t)=>C*(.7+.3*t),sH:h=>h,lC:(C,t)=>C*(1-.35*t),lH:h=>h});
  return NMO.t?tintAt(out,10,Math.max(14,C0*.6),h0+hdS(h0,290)*.5):out},
 tip:{'Deep shadow':'Fill the whole gem, then keep this on the side nearest the light.','Shadow':'A crescent blending away from the deep shadow.','Dark mid':'Blend toward the middle of the gem.','Base':'The middle band of the gem.','Reflected light':'The side away from the light: light passes through and comes out here.','Bright reflection':'A smaller crescent inside the reflected light.','Glint':'A white dot on the side nearest the light, opposite the reflection.'}},
skin:{name:'Skin',full:'Skin tones',sum:'Skin tone ramp built on the Painters Desk wheel.',prev:'bands',tint:'Cool or purple deepest shadow',
 hint:'Tap a skin colour (or any colour for alien skin) to build a skin ramp.',
 targets(b){const[L0,C0,h0]=lch(b),sh=hdS(h0,35)*.5;
  const out=rampOf(b,{dk:L7()?['Deep shadow','Shadow','Dark mid']:['Deep shadow','Shadow'],lt:L7()?['Highlight','Bright highlight']:['Highlight'],Ld:18,Lt:90,top:'Top highlight',topL:91,topC:C=>C*.22,
   sC:(C,t)=>C*(.85+.15*t),sH:(h,t)=>h+sh*(1-t),lC:(C,t)=>C*(1-.5*t),lH:(h,t)=>h+hdS(h,80)*.4*t});
  return NMO.t?tintAt(out,17,Math.max(14,C0*.5),310):out},
 tip:{'Deep shadow':'Deepest creases: under the brow, nose, chin and between fingers.','Shadow':'The recesses and the underside of muscles.','Dark mid':'Blend the shadow up into the base.','Base':'The skin colour. Cover all of the skin.','Highlight':'Raised areas: brow, cheekbones, nose, knuckles.','Bright highlight':'Smaller, on the highest points of those areas.','Top highlight':'Tiny points: tip of the nose, top of the cheekbones, lower lip.'}},
zen:{name:'Zenithal',full:'Zenithal and volumetric highlights',sum:'Zenithal / volumetric highlight ramp built on the Painters Desk wheel.',prev:'bands',tint:'Lean the deepest shadow to the complement',
 hint:'Tap a base colour to build stepped highlights from it.',
 targets(b){const[L0,C0,h0]=lch(b),hl=L7()?['Highlight 1','Highlight 2','Highlight 3']:['Highlight'];
  const out=rampOf(b,{dk:['Deep shadow','Shadow'],lt:hl,Ld:Math.max(6,L0*.35),Lt:92,top:'Top highlight',topL:Math.min(95,L0+(95-L0)*.85),topC:C=>C*.35,
   sC:(C,t)=>C*(.6+.4*t),sH:h=>h,lC:(C,t)=>C*(1-.45*t),lH:h=>h});
  return NMO.t?tintAt(out,Math.max(8,L0*.35),Math.max(10,C0*.35),(h0+180)%360):out},
 tip:{'Deep shadow':'The underside of each panel or fold, facing the ground.','Shadow':'Blend the shadow up into the base.','Base':'Cover the whole area.','Highlight':'The upper half of each panel or fold, facing the light.','Highlight 1':'The upper two thirds of each panel or fold.','Highlight 2':'The upper third, on the tops of folds and panels.','Highlight 3':'The highest ridges and the tops of the upper panels.','Top highlight':'Only the highest points, nearest the light.'}},
edge:{name:'Edges',full:'Edge highlights',sum:'Edge highlight steps built on the Painters Desk wheel.',prev:'bands',tint:'',steps:['2 edges','3 edges'],
 hint:'Tap a base colour to get its edge highlights.',
 targets(b){return rampOf(b,{dk:[],lt:L7()?['Edge 1','Edge 2']:['Edge'],Ld:0,Lt:90,top:'Fine edge',topL:lch(b)[0]+(96-lch(b)[0])*.85,topC:C=>C*.35,
   sC:C=>C,sH:h=>h,lC:(C,t)=>C*(1-.4*t),lH:h=>h})},
 tip:{'Base':'The base colour, already painted.','Edge':'Along every edge and raised line with the side of the brush.','Edge 1':'Along every edge and raised line with the side of the brush.','Edge 2':'A thinner line on the edges that face the light.','Fine edge':'Dots on corners and the sharpest, highest edges.'}},
glaze:{name:'Glazes',full:'Glazing blend',sum:'Glazing blend built on the Painters Desk wheel, with a water ratio for each step.',prev:'bands',tint:'Lean the deepest glaze to the complement',glaze:1,
 hint:'Tap a base colour to build a glazing blend with water ratios.',
 targets(b){const[L0,C0,h0]=lch(b),w=L7()?[5,4,1,3,4,5,6]:[4,1,3,4,5];
  const out=rampOf(b,{dk:L7()?['Deep glaze','Shadow glaze']:['Shadow glaze'],lt:L7()?['Glaze 1','Glaze 2','Glaze 3']:['Glaze 1','Glaze 2'],Ld:Math.max(8,L0*.4),Lt:L0+(90-L0)*.85,top:'Final glaze',topL:L0+(90-L0)*.85,topC:C=>C*.5,
   sC:(C,t)=>C*(.75+.25*t),sH:h=>h,lC:(C,t)=>C*(1-.4*t),lH:h=>h});
  out.forEach((x,i)=>x.w=w[i]);
  return NMO.t?tintAt(out,Math.max(8,L0*.4),Math.max(10,C0*.4),(h0+180)%360):out},
 tip:{'Deep glaze':'Very thin, built up in the deepest recesses over several coats.','Shadow glaze':'Thin coats over the shaded areas, letting each dry.','Base':'Thinned a little so it goes on smooth. Cover the whole area.','Glaze 1':'Thin coats over the lit two thirds. Wipe most of the paint off the brush first.','Glaze 2':'Thinner, over a smaller area inside the last.','Glaze 3':'Thinner again, over a smaller area.','Final glaze':'The thinnest, only on the highest points. Several coats build it up.'}}};
const TQK=Object.keys(TQ),TQN=()=>TQ[NMO.q];
/* ---------- Blend mode ----------
   A blend starts from the wheel's own picks (two complements on the shadow side, two neighbours on the light side,
   ordered like the centre disc). The painter then swaps, adds, removes and reorders steps by tapping paints on the
   wheel or in the neutrals, and can mix any step with the base. Mixed colours are estimates (Lab average by parts). */
let BL=null,ACT=null;const MXR=[[1,0],[2,1],[1,1],[1,2]],MXN=['Pure','2:1 with base','1:1 with base','1:2 with base'];
function autoPicks(b){if(!CH.includes(b))return{comp:[],ana:[]};const th=(b.H+180)%360,c=CH.filter(p=>p!==b);
return{comp:c.filter(p=>hd(p.H,th)<=22).sort((x,y)=>hd(x.H,th)-hd(y.H,th)).slice(0,6),ana:c.filter(p=>hd(p.H,b.H)<=25).sort((x,y)=>hd(x.H,b.H)-hd(y.H,b.H)).slice(0,6)}}
function blendSeed(b){const {comp,ana}=autoPicks(b),m=q=>!ONLY_MINE||own(q),byL=(x,y)=>Math.abs(x.L-b.L)-Math.abs(y.L-b.L);
const c=comp.filter(m).slice(0,2).sort(byL).reverse(),a=ana.filter(m).slice(0,2).sort(byL);
BL={b,s:[...c.map(p=>({p,sp:p,m:0})),{p:b,base:1},...a.map(p=>({p,sp:p,m:0}))]};ACT=null}
// Steps the painter didn't pick (auto) are refilled on every draw. Between two fixed steps (the base or a pick) an auto step
// aims at the colour part-way between them; past the outermost pick it carries on the same way (clamped). A side with no
// picks keeps the wheel's own seed paints. Each target takes the nearest unused ticked opaque paint, lightness weighted like ramps.
function blendAuto(){const st=BL.s,fx=x=>x.base||x.man,A=st.map((x,i)=>fx(x)?i:-1).filter(i=>i>=0),used=new Set(st.filter(fx).map(x=>x.p)),
pool=P.filter(p=>p.on&&nmmOK(p)&&(!ONLY_MINE||own(p))),todo=[];
const near=t=>{let b=null,bd=1e9;for(const q of pool){if(used.has(q))continue;const d=Math.hypot(1.6*(q.lab[0]-t[0]),q.lab[1]-t[1],q.lab[2]-t[2]);if(d<bd){bd=d;b=q}}return b};
st.forEach((x,i)=>{if(fx(x))return;const lo=A.filter(a=>a<i).pop(),hi=A.find(a=>a>i);
 if(!((lo!=null&&st[lo].man)||(hi!=null&&st[hi].man))){x.p=used.has(x.sp)?near(x.sp.lab)||x.sp:x.sp;used.add(x.p);return}
 let t;if(lo!=null&&hi!=null){const L=mixLab(st[lo]),H=mixLab(st[hi]),f=(i-lo)/(hi-lo);t=L.map((v,k)=>v+(H[k]-v)*f)}
 else{const a=lo!=null?lo:hi,b2=lo!=null?A.filter(z=>z<a).pop():A.find(z=>z>a),Aa=mixLab(st[a]),Ab=mixLab(st[b2]),k=Math.abs(i-a)/Math.abs(a-b2);
  t=Aa.map((v,j)=>v+(v-Ab[j])*k);t[0]=Math.max(4,Math.min(97,t[0]))}
 todo.push([x,t])});
todo.forEach(([x,t])=>{const q=near(t);if(q){x.p=q;used.add(q)}x.t=t})}
const mixLab=x=>{if(x.base||!x.m)return x.p.lab;const[r0,r1]=MXR[x.m],b=BL.b.lab;return x.p.lab.map((v,i)=>(v*r0+b[i]*r1)/(r0+r1))};
const mixHex=x=>x.base||!x.m?x.p.h:labHex(mixLab(x));
const blendTag=p=>{const b=BL.b;if(!CH.includes(b)||!CH.includes(p))return'Neutral';if(hd(p.H,(b.H+180)%360)<=30)return'Complement';if(hd(p.H,b.H)<=30)return'Neighbour';return'Other hue'};
function blendFill(p){if(!ACT||!BL)return false;if(p!==BL.b){if(ACT.ins)BL.s.splice(ACT.i,0,{p,sp:p,m:0,man:1});else BL.s[ACT.i]={...BL.s[ACT.i],p,man:1}}ACT=null;draw();return true}
// Wheel overlay: the blend as a path through its paints on the wheel, and the centre disc as the blend in the painter's order.
function blendWheel(){const st=BL.s,on=st.filter(x=>CH.includes(x.p));let s='';
if(on.length>1)s+=`<polyline points="${on.map(x=>x.p.x+','+x.p.y).join(' ')}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" opacity=".6"/>`;
const b=BL.b,ax=(CH.includes(b)?b.H:0)*Math.PI/180-Math.PI/2,ux=Math.cos(ax)/2,uy=Math.sin(ax)/2;
return s+`<defs><linearGradient id="bg" x1="${.5-ux}" y1="${.5-uy}" x2="${.5+ux}" y2="${.5+uy}">${st.map((x,i)=>`<stop offset="${(i/Math.max(1,st.length-1)).toFixed(3)}" stop-color="${mixHex(x)}"/>`).join('')}</linearGradient></defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#bg)" stroke="#1b1b1b" stroke-width="3"><title>Your blend</title></circle>`}
function blendPanel(){const el=document.getElementById('sel'),b=BL.b,st=BL.s,i0=st.findIndex(x=>x.base),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const add=(i,t)=>`<button type="button" class="badd${ACT&&ACT.ins&&ACT.i===i?' on':''}" data-ma="${i}">${ACT&&ACT.ins&&ACT.i===i?'Now tap a paint on the wheel…':t}</button>`;
const rows=st.map((x,i)=>{const act=ACT&&!ACT.ins&&ACT.i===i;
 if(x.base)return`<div class="nrow brow nbase"><div class="nrole">Base</div><span class="nsw" style="background:${b.h}"></span><div class="nnm"><b>${star(b)}${esc(b.n)}</b><span>${esc(GL[b.g])}${b.c?' · '+esc(b.c):''}</span></div><span></span><span></span></div>`;
 return`<div class="nrow brow${act?' bact':''}"><div class="nrole">${i<i0?'Shadow side':'Light side'}</div><button type="button" class="nsw bsw" data-mr="${i}" style="background:${mixHex(x)}" title="Replace this paint" aria-label="Replace ${esc(x.p.n)}">${x.m?`<i style="background:${x.p.h}" title="${esc(x.p.n)} before mixing"></i>`:''}</button><div class="nnm"><b>${act?'Now tap a paint on the wheel…':star(x.p)+esc(x.p.n)+(x.p.c?' <em>'+esc(x.p.c)+'</em>':'')}</b><span>${x.man?'<u class="bpin">Your pick</u>':'Auto'} · ${blendTag(x.p)} · ${esc(GL[x.p.g])}</span></div><select class="nsel bmx" data-mm="${i}" aria-label="Mix with base">${MXN.map((t,k)=>`<option value="${k}"${k===x.m?' selected':''}>${t}</option>`).join('')}</select><span class="bbt"><button type="button" class="nsk bpk${x.man?' on':''}" data-mp="${i}" aria-pressed="${!!x.man}" title="${x.man?'Pinned: tap to let the wheel choose this step again':'Pin this paint so it stops changing'}" aria-label="Pin">📌</button><button type="button" class="nsk" data-mu="${i}" title="Move toward the shadow end" aria-label="Move up"${i?'':' disabled'}>↑</button><button type="button" class="nsk" data-md="${i}" title="Move toward the light end" aria-label="Move down"${i<st.length-1?'':' disabled'}>↓</button><button type="button" class="nsk" data-mx="${i}" title="Remove this step" aria-label="Remove">×</button></span></div>`}).join('');
const w=292/st.length;
el.innerHTML=`<b>Your blend from:</b> <div class="chips"><span class="chip"><i style="background:${b.h}"></i>${star(b)}${esc(b.n)} <span style="color:var(--mut)">${esc(b.c)}</span></span></div>
<p class="s">It starts with the wheel's own complements and neighbours. Tap a swatch, then any paint on the wheel or in the neutrals, to swap it in. Steps marked Auto then recalculate to blend smoothly around your picks. 📌 pins or unpins a step, ↑ ↓ reorder, × removes.${ONLY_MINE?' Starting picks come from your collection.':''}</p>
${add(0,'+ Add a step on the shadow side')}<div class="nrows">${rows}</div>${add(st.length,'+ Add a step on the light side')}
<svg class="blade" viewBox="0 0 300 96" role="img" aria-label="Blend preview"><defs><linearGradient id="bp" x1="0" x2="1">${st.map((x,i)=>`<stop offset="${(i/Math.max(1,st.length-1)).toFixed(3)}" stop-color="${mixHex(x)}"/>`).join('')}</linearGradient></defs>${st.map((x,i)=>`<rect x="${(4+i*w).toFixed(1)}" y="6" width="${w.toFixed(1)}" height="40" fill="${mixHex(x)}"/>`).join('')}<rect x="4" y="6" width="292" height="40" rx="6" fill="none" stroke="#1b1b1b" stroke-width="3"/><rect x="4" y="54" width="292" height="36" rx="18" fill="url(#bp)" stroke="#1b1b1b" stroke-width="3"/></svg>
<p class="s">Top: each step as painted. Bottom: how they blend. Mixed colours and swatches are estimates, so test the blend on the model.</p>
<div class="row"><button class="btn" type="button" id="blTut">Save as tutorial</button><button class="btn" type="button" id="blReset">Reset to wheel picks</button></div>`;
el.querySelectorAll('[data-ma]').forEach(e=>e.onclick=()=>{const i=+e.dataset.ma;ACT=ACT&&ACT.ins&&ACT.i===i?null:{i,ins:1};draw()});
el.querySelectorAll('[data-mr]').forEach(e=>e.onclick=()=>{const i=+e.dataset.mr;ACT=ACT&&!ACT.ins&&ACT.i===i?null:{i};draw()});
el.querySelectorAll('[data-mu],[data-md]').forEach(e=>e.onclick=()=>{const i=+(e.dataset.mu??e.dataset.md),j=e.dataset.mu!=null?i-1:i+1;[st[i],st[j]]=[st[j],st[i]];ACT=null;draw()});
el.querySelectorAll('[data-mp]').forEach(e=>e.onclick=()=>{const x=st[+e.dataset.mp];x.man=x.man?0:1;if(!x.man&&!x.sp)x.sp=x.p;ACT=null;draw()});
el.querySelectorAll('[data-mx]').forEach(e=>e.onclick=()=>{st.splice(+e.dataset.mx,1);ACT=null;draw()});
el.querySelectorAll('[data-mm]').forEach(e=>e.onchange=()=>{st[+e.dataset.mm].m=+e.value;draw()});
document.getElementById('blReset').onclick=()=>{blendSeed(b);draw()};
// Tutorial order: the base first, then the shadow side working outward from it, then the light side.
document.getElementById('blTut').onclick=()=>{const sh=st.slice(0,i0).reverse(),li=st.slice(i0+1),mx=x=>x.m?[{k:x.p.k,parts:MXR[x.m][0]},{k:b.k,parts:MXR[x.m][1]}]:[{k:x.p.k,parts:1}];
 NMM_DRAFT={kind:'tutorial',title:'Blend: '+b.n.trim(),summary:'Custom blend built on the Painters Desk wheel.',
 steps:[{title:'Base',text:'Cover the whole area.',image:'',mix:[{k:b.k,parts:1}]}].concat(sh.map((x,k)=>({title:'Shadow '+(k+1),text:k?'Thinner, into the deepest recesses inside the last.':'Thinned, into the recesses and blended out toward the base.',image:'',mix:mx(x)})),li.map((x,k)=>({title:'Highlight '+(k+1),text:k?'Over a smaller area inside the last, on the highest points.':'On the raised areas, blended back into the base.',image:'',mix:mx(x)})))};location.hash='#/new'}}

try{const o=JSON.parse(localStorage.getItem('pd-nmm'));if(o){MODE=o.m==='nmm'||o.m==='mix'?o.m:'col';NMO.n=o.n===5?5:7;NMO.t=!!o.t;NMO.q=TQ[o.q]?o.q:'nmm'}}catch(e){}
const nmmTargets=b=>TQN().targets(b);
function nmmRamp(b){const pool=P.filter(p=>p.on&&nmmOK(p)&&(!ONLY_MINE||own(p))),used=new Set(),ok=nmmOK(b)&&(!ONLY_MINE||own(b));
const w=(a,c)=>Math.hypot(1.6*(a[0]-c[0]),a[1]-c[1],a[2]-c[2]),d76=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]);
if(ok)used.add(b);
return nmmTargets(b).map((x,i)=>{if(x.base&&ok)return{...x,p:b,d:0,pick:1};
const c=pool.filter(q=>!used.has(q)).map(q=>({q,d:w(q.lab,x.t)})).sort((a,c)=>a.d-c.d);if(!c.length)return{...x,p:null};
const m=c[(nmmSkip[i]||0)%Math.min(c.length,8)].q;used.add(m);return{...x,p:m,d:d76(m.lab,x.t),alt:c.length>1}})}
const labHex=([L,A,B])=>{const fy=(L+16)/116,iv=t=>t**3>.008856?t**3:(t-16/116)/7.787,X=iv(fy+A/500)*.95047,Y=iv(fy),Z=iv(fy-B/200)*1.08883;
const s=v=>{v=v>.0031308?1.055*v**(1/2.4)-.055:12.92*v;return Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')};
return'#'+s(3.2406*X-1.5372*Y-.4986*Z)+s(-.9689*X+1.8758*Y+.0415*Z)+s(.0557*X-.204*Y+1.057*Z)};
// Gradient stops, lightest first. OSL draws radially (source in the middle); the rest top (light) to bottom (dark).
const rampStops=R=>{const st=R.filter(x=>x.p).reverse();return st.map((x,i)=>`<stop offset="${(i/Math.max(1,st.length-1)).toFixed(3)}" stop-color="${x.p.h}"/>`).join('')};
const rampGrad=(id,R,rad)=>rad?`<radialGradient id="${id}" cx=".5" cy=".5" r=".5">${rampStops(R)}</radialGradient>`:`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${rampStops(R)}</linearGradient>`;
// Wheel overlay: the ramp as a path through the paints that sit on the wheel, and the centre disc painted as the ramp.
function nmmWheel(R){const on=R.filter(x=>x.p&&CH.includes(x.p)),T=TQN();let s='';
if(on.length>1)s+=`<polyline points="${on.map(x=>x.p.x+','+x.p.y).join(' ')}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" opacity=".6"/>`;
return s+`<defs>${rampGrad('ng',R,T.prev==='osl')}</defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#ng)" stroke="#1b1b1b" stroke-width="3"><title>${T.full} ramp</title></circle>`}
// Small preview of the ramp on a shape that suits the technique.
function rampPrev(R,T){const st=R.filter(x=>x.p);
if(T.prev==='blade')return`<svg class="blade" viewBox="0 0 300 90" role="img" aria-label="Ramp preview on a sword blade"><defs>${rampGrad('nb',R)}</defs><rect x="6" y="38" width="44" height="14" rx="3" fill="#5a3a1a" stroke="#1b1b1b" stroke-width="2.5"/><rect x="48" y="20" width="12" height="50" rx="3" fill="url(#nb)" stroke="#1b1b1b" stroke-width="2.5"/><path d="M60 26 L262 26 L294 45 L262 64 L60 64 Z" fill="url(#nb)" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/></svg>`;
if(T.prev==='osl')return`<svg class="blade" viewBox="0 0 300 120" role="img" aria-label="Ramp preview as light spreading from a source"><defs>${rampGrad('nb',R,1)}</defs><rect x="4" y="4" width="292" height="112" rx="14" fill="${st[0].p.h}" stroke="#1b1b1b" stroke-width="3"/><ellipse cx="150" cy="60" rx="120" ry="54" fill="url(#nb)"/><circle cx="150" cy="60" r="7" fill="${st[st.length-1].p.h}" stroke="#1b1b1b" stroke-width="2"/></svg>`;
if(T.prev==='gem'){const lin=st.map((x,i)=>`<stop offset="${(i/Math.max(1,st.length-2)).toFixed(3)}" stop-color="${x.p.h}"/>`).slice(0,-1).join('');
 return`<svg class="blade" viewBox="0 0 300 110" role="img" aria-label="Ramp preview on a round gem"><defs><linearGradient id="nb" x1=".2" y1="0" x2=".8" y2="1">${lin}</linearGradient></defs><circle cx="150" cy="55" r="46" fill="#7a6a4a" stroke="#1b1b1b" stroke-width="3"/><circle cx="150" cy="55" r="38" fill="url(#nb)" stroke="#1b1b1b" stroke-width="3"/><circle cx="137" cy="40" r="5" fill="${st[st.length-1].p.h}"/></svg>`}
const w=292/st.length;return`<svg class="blade" viewBox="0 0 300 60" role="img" aria-label="Ramp preview as stepped bands">${st.map((x,i)=>`<rect x="${(4+i*w).toFixed(1)}" y="6" width="${w.toFixed(1)}" height="48" fill="${x.p.h}"/>`).join('')}<rect x="4" y="6" width="292" height="48" rx="6" fill="none" stroke="#1b1b1b" stroke-width="3"/></svg>`}
function nmmPanel(b,R){const el=document.getElementById('sel'),T=TQN(),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const q=d=>d<6?['close','Close']:d<12?['fair','Fair']:['loose','Loose'],metal=!nmmOK(b),wt=x=>T.glaze?`<span class="nwt" title="Paint to water">1:${x.w} 💧</span>`:'';
const rows=R.map((x,i)=>{const role=x.r+(x.tint?' · tinted':'');if(!x.p)return`<div class="nrow"><div class="nrole">${role}</div><span class="nsw" style="background:${labHex(x.t)}"></span><div class="nnm"><b>No ticked paint left</b><span>Tick more ranges to fill this step</span></div></div>`;
const [qc,ql]=x.pick?['pick','Your pick']:q(x.d);
return`<div class="nrow${x.base?' nbase':''}"><div class="nrole">${role}</div><span class="nsw" style="background:${x.p.h}" title="Paint"><i style="background:${labHex(x.t)}" title="Ramp target"></i></span><div class="nnm"><b>${star(x.p)}${esc(x.p.n)}</b><span>${esc(GL[x.p.g])}${x.p.c?' · '+esc(x.p.c):''}</span>${wt(x)}</div><span class="nq ${qc}" title="${x.pick?'':'ΔE '+x.d.toFixed(1)+' from the ramp target'}">${ql}</span>${x.alt?`<button type="button" class="nsk" data-sk="${i}" title="Try the next nearest paint" aria-label="Swap ${esc(x.r)} paint">↻</button>`:'<span></span>'}</div>`}).join('');
el.innerHTML=`<b>${esc(T.full)} ramp from:</b> <div class="chips"><span class="chip"><i style="background:${b.h}"></i>${star(b)}${esc(b.n)} <span style="color:var(--mut)">${esc(b.c)}</span></span></div>`+
(metal?'<p class="s">That\'s a metallic or effect paint, so the base uses the nearest opaque paint instead.</p>':'')+
`<div class="nrows">${rows}</div>${rampPrev(R,T)}
<p class="s">Small dot = the colour the ramp asks for; big dot = the nearest of your ticked paints (${ONLY_MINE?'from your collection only':'tick more ranges for closer matches'}). Close / Fair / Loose = ΔE under 6, under 12, above that. ↻ swaps a step for the next nearest paint.${T.glaze?' 1:4 💧 = one part paint to four parts water; thinner glazes need more coats.':''} Swatches are estimates, so check the ramp on the model.</p>
<div class="row"><button class="btn" type="button" id="nmmTut">Save as tutorial</button></div>`;
el.querySelectorAll('[data-sk]').forEach(e=>e.onclick=()=>{const i=+e.dataset.sk;nmmSkip[i]=(nmmSkip[i]||0)+1;draw()});
document.getElementById('nmmTut').onclick=()=>{NMM_DRAFT={kind:'tutorial',title:T.name+' '+b.n.trim(),summary:T.sum,
 steps:R.filter(x=>x.p).map(x=>({title:x.r,text:T.tip[x.r]||'',image:'',mix:[{k:x.p.k,parts:1}].concat(T.glaze?[{k:'water',parts:x.w}]:[])}))};location.hash='#/new'}}
function nmmUI(){const n=MODE==='nmm',T=TQN(),ss=T.steps||['5','7'];[['mCol','col'],['mNmm','nmm'],['mMix','mix']].forEach(([id,m])=>{const e=document.getElementById(id);e.classList.toggle('pri',MODE===m);e.setAttribute('aria-pressed',MODE===m)});document.getElementById('nmmOpt').hidden=!n;
document.getElementById('nTech').value=NMO.q;const o=document.getElementById('nSteps').options;o[0].textContent=ss[0];o[1].textContent=ss[1];
document.getElementById('nSteps').value=String(NMO.n);document.getElementById('nTint').checked=NMO.t;document.getElementById('nTintL').hidden=!T.tint;document.getElementById('nTintT').textContent=T.tint}
function setMode(m){MODE=m;nmmSave();nmmUI();nmmSkip=[];ACT=null;if(m==='nmm'||m==='mix')NB=NB&&!CH.includes(NB)&&!sel?NB:sel;else if(NB&&!CH.includes(NB)){const p=NB;NB=null;draw();neutralShow(p);return}draw()}
document.getElementById('nTech').innerHTML=TQK.map(k=>`<option value="${k}">${TQ[k].full}</option>`).join('');
document.getElementById('mCol').onclick=()=>setMode('col');document.getElementById('mNmm').onclick=()=>setMode('nmm');document.getElementById('mMix').onclick=()=>setMode('mix');
document.getElementById('nTech').onchange=e=>{NMO.q=TQ[e.target.value]?e.target.value:'nmm';nmmSkip=[];nmmSave();nmmUI();draw()};
document.getElementById('nSteps').onchange=e=>{NMO.n=+e.target.value;nmmSkip=[];nmmSave();draw()};
document.getElementById('nTint').onchange=e=>{NMO.t=e.target.checked;nmmSkip=[];nmmSave();draw()};
nmmUI();
// Centre disc: two shade-matched ramps laid along the complement→selected axis. The complements are one ramp and the selected paint plus its
// neighbours the other; each runs dark to light by the smoothest path through its paints, and the two meet where their shades are closest.
// Colours are mixed in OKLab (like blended paint, not muddy RGB) and big colour changes get more room on the disc.
const okLab=h=>{const n=parseInt(h.slice(1),16),l=[n>>16,n>>8&255,n&255].map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92}),
 L=Math.cbrt(.4122214708*l[0]+.5363325363*l[1]+.0514459929*l[2]),M=Math.cbrt(.2119034982*l[0]+.6806995451*l[1]+.1073969566*l[2]),S=Math.cbrt(.0883024619*l[0]+.2817188376*l[1]+.6299787005*l[2]);
 return[.2104542553*L+.793617785*M-.0040720468*S,1.9779984951*L-2.428592205*M+.4505937099*S,.0259040371*L+.7827717662*M-.808675766*S]};
const okHex=([L,a,b])=>{const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return'#'+[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>{v=Math.max(0,Math.min(1,v));v=v>.0031308?1.055*v**(1/2.4)-.055:12.92*v;return Math.round(v*255).toString(16).padStart(2,'0')}).join('')};
const okD=(a,b,w)=>Math.hypot(w*(a[0]-b[0]),a[1]-b[1],a[2]-b[2]);
function discStops(sel,comp,ana){const o=new Map([sel,...comp,...ana].map(p=>[p,okLab(p.h)]));
 const path=g=>{const u=[...g].sort((x,y)=>o.get(x)[0]-o.get(y)[0]);if(u.length<4)return u;const A=u[0],Z=u[u.length-1];let best=null,bc=1e9;
  const go=(cur,rest,cost,acc)=>{if(cost>=bc)return;if(!rest.length){const t=cost+okD(o.get(cur),o.get(Z),2);if(t<bc){bc=t;best=acc}return}
   rest.forEach((p,i)=>go(p,rest.filter((_,j)=>j!==i),cost+okD(o.get(cur),o.get(p),2),[...acc,p]))};
  go(A,u.slice(1,-1),0,[]);return[A,...best,Z]};
 const C=path(comp),F=path([sel,...ana]);let pick=[[],F];
 if(C.length){let bd=1e9;for(const c of[C,[...C].reverse()])for(const f of[F,[...F].reverse()]){const d=Math.abs(o.get(c[c.length-1])[0]-o.get(f[0])[0]);if(d<bd){bd=d;pick=[c,f]}}}
 const seq=[...pick[0],...pick[1]].map(p=>o.get(p)),d=[0];for(let i=1;i<seq.length;i++)d.push(d[i-1]+.04+okD(seq[i-1],seq[i],1.5));
 const off=d.map(v=>seq.length<2?0:v/d[d.length-1]),out=[];
 seq.forEach((c,i)=>{out.push([okHex(c),off[i]]);if(i<seq.length-1)for(let k=1;k<6;k++){const t=k/6;out.push([okHex(c.map((v,j)=>v+(seq[i+1][j]-v)*t)),off[i]+(off[i+1]-off[i])*t])}});
 return out}
const svg=document.getElementById('w');let sel=null;
function draw(){let s='';
for(let h=0;h<360;h+=10){const a0=U(h-5)*Math.PI/180-Math.PI/2,a1=U(h+5)*Math.PI/180-Math.PI/2,R=480,r=110;
s+=`<path d="M${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}L${CX+R*Math.cos(a0)} ${CY+R*Math.sin(a0)}A${R} ${R} 0 0 1 ${CX+R*Math.cos(a1)} ${CY+R*Math.sin(a1)}L${CX+r*Math.cos(a1)} ${CY+r*Math.sin(a1)}A${r} ${r} 0 0 0 ${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}Z" fill="hsl(${h},65%,50%)" opacity=".16"/>`}
[.2,.5,.8].forEach(l=>s+=`<circle cx="${CX}" cy="${CY}" r="${140+l*300}" fill="none" stroke="currentColor" opacity=".18" stroke-dasharray="4 6"/>`);
if(!sel)s+=`<text x="${CX}" y="${CY-8}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">darker ←</text><text x="${CX}" y="${CY+14}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">→ lighter (rim)</text>`;
const hn={0:'Red',30:'Orange',60:'Yellow',120:'Green',180:'Cyan',240:'Blue',280:'Violet',320:'Magenta'};
for(const h in hn){const a=U(+h)*Math.PI/180-Math.PI/2;s+=`<text x="${CX+492*Math.cos(a)}" y="${CY+492*Math.sin(a)+4}" text-anchor="middle" font-size="13" fill="currentColor" opacity=".6">${hn[h]}</text>`}
let comp=[],ana=[];const NBp=MODE==='nmm'?NB:null,R=NBp?nmmRamp(NBp):null,MB=MODE==='mix'?NB:null;
if(MB&&(!BL||BL.b!==MB))blendSeed(MB);if(MB)blendAuto();const MX=MB?BL.s.map(x=>x.p):null;
if(sel&&!R&&!MX){const th=(sel.H+180)%360;const cands=CH.filter(p=>p!==sel);comp=cands.filter(p=>hd(p.H,th)<=22).sort((a,b)=>hd(a.H,th)-hd(b.H,th)).slice(0,6);
ana=cands.filter(p=>hd(p.H,sel.H)<=25).sort((a,b)=>hd(a.H,sel.H)-hd(b.H,sel.H)).slice(0,6);
const a=th*Math.PI/180-Math.PI/2,b=sel.H*Math.PI/180-Math.PI/2;
s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${CX+440*Math.cos(U(th)*Math.PI/180-Math.PI/2)}" y2="${CY+440*Math.sin(U(th)*Math.PI/180-Math.PI/2)}" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" opacity=".55"/>`}
if(R)s+=nmmWheel(R);
if(MX)s+=blendWheel();
if(sel&&!R&&!MX){const ax=sel.H*Math.PI/180-Math.PI/2,ux=Math.cos(ax)/2,uy=Math.sin(ax)/2;
s+=`<defs><linearGradient id="cg" x1="${.5-ux}" y1="${.5-uy}" x2="${.5+ux}" y2="${.5+uy}">${discStops(sel,comp,ana).map(([h,o])=>`<stop offset="${o.toFixed(4)}" stop-color="${h}"/>`).join('')}</linearGradient></defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#cg)" stroke="#1b1b1b" stroke-width="3"><title>Complements → ${sel.n} → neighbours</title></circle>`}
const show=document.getElementById('lab').checked;const R0=CH.length>140?20:26,kk=R0/26;
CH.forEach(p=>{const on=MX?ACT||MX.includes(p):R?R.some(x=>x.p===p):!sel||p===sel||comp.includes(p)||ana.includes(p);const ls=lines(p.n),tc=p.lum>.55?'#111':'#fff';
const st=(p.g==='W'||p.g==='s'||p.c.endsWith(' Wash'))?'stroke="#fff" stroke-dasharray="3 3"':p.g==='F'?`stroke="${p.h}" style="filter:drop-shadow(0 0 6px ${p.h})"`:'stroke="#1b1b1b"';
const sw=p===sel?5:comp.includes(p)?4:2;
s+=`<g class="dot" data-i="${p.i}" opacity="${on?1:.2}"><circle cx="${p.x}" cy="${p.y}" r="${R0}" fill="${p.h}" ${st} stroke-width="${p===sel?4:2}"${comp.includes(p)||(R&&p!==sel&&R.some(x=>x.p===p))||(MX&&p!==sel&&MX.includes(p))?' stroke="#fff" stroke-width="4"':''}/>`+
(show?`<g transform="translate(${p.x} ${p.y}) scale(${kk}) translate(${-p.x} ${-p.y})">`+ls.map((t,i)=>`<text x="${p.x}" y="${p.y-(ls.length*8-4)/1+i*8.5-2+4}" font-size="7.5" fill="${tc}">${t}</text>`).join('')+`<text x="${p.x}" y="${p.y+20-(ls.length>1?1:-3)-(ls.length>1?0:0)}" font-size="6.5" fill="${tc}" opacity=".8">${p.c}</text></g>`:'')+`<title>${p.n} (${p.c})</title></g>`});
svg.innerHTML=s;
svg.querySelectorAll('.dot').forEach(e=>e.onclick=()=>pick(P[+e.dataset.i]));
const chip=p=>`<span class="chip"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`;
if(R){nmmPanel(NBp,R);return}
if(MX){blendPanel();return}
if(MODE==='nmm'){document.getElementById('sel').innerHTML='<b>'+TQN().hint+'</b>';return}
if(MODE==='mix'){document.getElementById('sel').innerHTML='<b>Tap a paint to start a blend. It starts with the wheel\'s own complements and neighbours, then you swap in your own.</b>';return}
document.getElementById('sel').innerHTML=sel?`<b>Selected:</b> <div class="chips">${chip(sel)}</div><h2>Complements (opposite on the wheel)</h2><div class="chips">${comp.length?comp.map(chip).join(''):'<span class="s">Neutral: no true opposite. Try a cool or warm grey.</span>'}</div><h2>Analogous neighbors</h2><div class="chips">${ana.map(chip).join('')}</div><p class="s">Underpainting tip: complements make strong shadow or contrast underlayers and tone down saturation; analogous neighbors make smooth glazes and transitions.</p>`+matchHTML(sel):'<b>Tap a paint on the wheel or in the neutrals list.</b>';if(sel)wireMatch(sel)}
function pick(p){if(MODE==='mix'&&blendFill(p))return;sel=p===sel?null:p;NB=sel;nmmSkip=[];draw()}
document.getElementById('lab').onchange=draw;
function renderNeu(){document.getElementById('neu').innerHTML=NE.map((p,i)=>`<span class="chip" data-i="${p.i}"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`).join('');
document.querySelectorAll('#neu .chip').forEach(e=>e.onclick=()=>neutralShow(P[+e.dataset.i]));
document.getElementById('neuN').textContent=NE.length===1?'(1 paint)':`(${NE.length} paints)`}
function tyUI(){const b=document.getElementById('hTy'),n=HIDE_T.size;b.textContent=n?`Paint types (${n} hidden)`:'Paint types';b.setAttribute('aria-pressed',n>0)}
(()=>{const d=document.getElementById('tyDlg'),cnt={};P.forEach(p=>{const t=paintType(p);cnt[t]=(cnt[t]||0)+1});
document.getElementById('tyList').innerHTML=`<label class="tyr"><input type="checkbox" checked disabled><span><b>Base & layer paints</b> <em>${cnt.op}</em><small>Opaque paints, always shown</small></span></label>`+
 PTYPES.map(([k,t,h])=>`<label class="tyr"><input type="checkbox" data-ty="${k}"${HIDE_T.has(k)?'':' checked'}><span><b>${t}</b> <em>${cnt[k]||0}</em><small>${h}</small></span></label>`).join('');
document.getElementById('hTy').onclick=()=>d.showModal();
d.addEventListener('change',e=>{const k=e.target.dataset.ty;if(!k)return;e.target.checked?HIDE_T.delete(k):HIDE_T.add(k);try{localStorage.setItem('pd-types',JSON.stringify([...HIDE_T]))}catch(e){}tyUI();
 if(sel&&!shown(sel))sel=null;if(NB&&!shown(NB))NB=null;layout();renderNeu();draw()})})();tyUI();
{const d=document.getElementById('neud');try{d.open=localStorage.getItem('pd-neu')==='1'}catch(e){}d.ontoggle=()=>{try{localStorage.setItem('pd-neu',d.open?'1':'0')}catch(e){}}}
const GL={A:'Warpaints Fanatic',C:'John Blanche Vol. 1-4',R:'Warpaints Air',S:'Speedpaint 2.0',b:'Colour: Base',s:'Colour: Shade',l:'Colour: Layer',c:'Colour: Contrast',t:'Colour: Technical',a:'Colour: Air',d:'Colour: Dry',p:'Tone Pro',M:'Standard / Signature / AMP',W:'Washes',F:'Fluorescents',T:'Transparents',X:'Metallics','1':'1-Step',E:'Expert Acrylics',P:'Primers',G:'Weathering pigments',B:'Basing textures (list only)',K:'AK Quick Gen',e:'3rd Gen Standard',g:'3rd Gen Intense',j:'3rd Gen Pastel',m:'3rd Gen Metallic',n:'3rd Gen Ink',o:'3rd Gen AFV Series',v:'3rd Gen Figure Series',y:'3rd Gen Air Series',V:'Game Color',u:'Game Color Metallic',i:'Game Color Ink',f:'Game Color Special FX / Fluo',x:'Xpress Color',w:'Game Color Wash',L:'True Metallic Metal',Y:'Model Air',Z:'Model Color',H:'Color wheel: outer ring (highlights)',N:'Color wheel: middle ring (midtones)',O:'Color wheel: inner ring (shadows)',J:'Brights',q:'Metallics',z:'Washes',r:'Glazes',k:'Tonal families & flesh tones',D:'Metallic',I:'TurboShift',Q:'ZeniShift',U:'XF Flat Acrylic',h:'X Gloss Acrylic','2':'AS Spray (aircraft)','3':'PS Spray (polycarbonate)','4':'TS Spray'};
const BRANDS=[['Army Painter',['A','C','R','S']],['Citadel / Warhammer',['b','s','l','c','t','a','d','p']],['Pro Acryl',['M','W','F','T','X','1','E','P','G','B']],['Vallejo',['V','u','i','f','x','w','Y','Z','L']],['AK Interactive',['K','e','g','j','m','n','o','v','y']],['Two Thin Coats',['H','N','O','J','q','z','r','k']],['Turbo Dork',['D','I','Q']],['Tamiya',['U','h','2','3','4']]];

const BR_OF={};BRANDS.forEach(([bn,gs],bi)=>gs.forEach(g=>BR_OF[g]=bi));
function hexLab(h){const f=v=>{v/=255;return v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92};
const r=f(parseInt(h.slice(1,3),16)),g=f(parseInt(h.slice(3,5),16)),b=f(parseInt(h.slice(5,7),16));
let x=(.4124*r+.3576*g+.1805*b)/.95047,y=.2126*r+.7152*g+.0722*b,z=(.0193*r+.1192*g+.9505*b)/1.08883;const t=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
return[116*t(y)-16,500*(t(x)-t(y)),200*(t(y)-t(z))]}
P.forEach(p=>p.lab=hexLab(p.h));
const dE=(a,b)=>Math.hypot(a.lab[0]-b.lab[0],a.lab[1]-b.lab[1],a.lab[2]-b.lab[2]);
const MSRC={t:'Two Thin Coats comparison chart',f:'Army Painter Fanatic conversion chart',h:'Herrick Games paint comparison chart',k:'AK 3rd Generation equivalence chart'};
function matchData(p){const i=p.i,mine=q=>!ONLY_MINE||own(q),doc=(MT[i]||[]).map(([j,s])=>({p:P[j],s,d:dE(p,P[j])})).filter(m=>mine(m.p)),out=[];
BRANDS.forEach(([bn,gs],bi)=>{if(BR_OF[p.g]===bi)return;const ch=doc.filter(m=>BR_OF[m.p.g]===bi).sort((a,b)=>a.d-b.d);
const have=new Set(ch.map(m=>m.p));const near=P.filter(q=>BR_OF[q.g]===bi&&q.g!=='B'&&!have.has(q)&&mine(q)).map(q=>({p:q,d:dE(p,q)})).sort((a,b)=>a.d-b.d).slice(0,ch.length?2:3);
out.push({bn,ch,near})});return out}
function matchHTML(p){const md=matchData(p);let h='<div class="mt"><h2>Matches in other ranges</h2><p class="s"><b style="color:#2a9d5c">✓</b> = listed as an equivalent in a manufacturer / community conversion chart. ≈ = closest swatch colour (ΔE shown; under ~6 is a close match, over ~15 is a loose one). Matches are close, never exact. Tap a chip to add it to the wheel.</p>';
const c=(m,k)=>`<span class="chip${k?' ck':''}" data-mi="${m.p.i}" title="${k?MSRC[m.s]+' · ':''}${GL[m.p.g]} · ΔE ${m.d.toFixed(1)}"><i style="background:${m.p.h}"></i>${k?'<b>✓</b> ':'≈ '}${star(m.p)}${m.p.n} <em>${GL[m.p.g]} · ΔE ${m.d.toFixed(0)}</em></span>`;
md.forEach(o=>{if(!o.ch.length&&!o.near.length)return;h+=`<div class="br2"><div class="bl">${o.bn}</div><div class="chips">${o.ch.map(m=>c(m,1)).join('')}${o.near.map(m=>c(m,0)).join('')}</div></div>`});
if(ONLY_MINE&&!md.some(o=>o.ch.length||o.near.length))h+='<p class="s">None of your paints from other ranges match this one.</p>';return h+'<button type="button" id="mAddDoc">Add all ✓ chart matches to wheel</button><button type="button" id="mAddAll">Add all matches shown</button></div>'}
function addOn(list,p){list.forEach(q=>q.on=true);layout();renderNeu();boxes();showP(p);remember()}
function showP(p){if(MODE==='nmm'){NB=p;sel=CH.includes(p)?p:null;draw()}else if(CH.includes(p)){sel=p;draw()}else{sel=null;draw();neutralShow(p)}}
function wireMatch(p){const el=document.getElementById('sel');
el.querySelectorAll('.mt .chip').forEach(e=>e.onclick=()=>{const q=P[+e.dataset.mi];addOn([q],q)});
const md=matchData(p),a=document.getElementById('mAddDoc'),b=document.getElementById('mAddAll');
if(a)a.onclick=()=>addOn(md.flatMap(o=>o.ch.map(m=>m.p)),p);if(b)b.onclick=()=>addOn(md.flatMap(o=>[...o.ch,...o.near].map(m=>m.p)),p)}
function neutralShow(p){if(MODE==='mix'&&blendFill(p))return;if(MODE==='nmm'||MODE==='mix'){sel=null;NB=p;nmmSkip=[];draw();return}document.getElementById('sel').innerHTML=`<b>Selected:</b> <div class="chips"><span class="chip"><i style="background:${p.h}"></i>${p.n} <span style="color:var(--mut)">${p.c}</span></span></div><p class="s">Neutral paint: it sits outside the hue wheel. Use it to dull a neighboring color or set value in an underpainting; warm greys pair with oranges and flesh, cool greys with blues.</p>`+matchHTML(p);wireMatch(p)}
// Last wheel selection: {t,g:[fully ticked ranges],k:[other ticked paint keys]}, kept in this browser and (via account.js) on the account.
const WK='pd-wheel',GS=[...new Set(P.map(p=>p.g))];
function selNow(){const g=GS.filter(x=>P.every(p=>p.g!==x||p.on));return{t:Date.now(),g,k:P.filter(p=>p.on&&!g.includes(p.g)).map(p=>p.k)}}
function selLocal(){try{const w=JSON.parse(localStorage.getItem(WK));return w&&w.t?w:null}catch(e){return null}}
function selApply(w){const g=new Set(w.g||[]),k=new Set(w.k||[]);P.forEach(p=>p.on=g.has(p.g)||k.has(p.k))}
let onSelSave=null;
function remember(){const w=selNow();try{localStorage.setItem(WK,JSON.stringify(w))}catch(e){}if(onSelSave)onSelSave(w)}
const W0=selLocal();if(W0)selApply(W0);else P.forEach(p=>p.on=!!on[p.g]);
const tree=document.getElementById('tree');
tree.innerHTML=BRANDS.map(([bn,gs],bi)=>`<details class="br"${gs.some(g=>on[g])?' open':''}><summary><b>${bn}</b> <span class="n" data-bc="${bi}"></span></summary>`+gs.map(g=>`<details class="rg" data-g="${g}"><summary><input type="checkbox" data-r="${g}"> ${GL[g]} <span class="n" data-gc="${g}"></span></summary><div class="pl">`+P.map((p,i)=>p.g===g?`<label class="pi" data-i="${i}"><input type="checkbox" data-i="${i}"><i style="background:${p.h}"></i><span>${p.n}${p.c?' <em>'+p.c+'</em>':''}</span></label>`:'').join('')+`</div></details>`).join('')+`</details>`).join('');
const qv=()=>document.getElementById('q').value.trim().toLowerCase(),match=(p,q)=>(p.n+' '+p.c).toLowerCase().includes(q);
const refresh=()=>{sel=null;NB=null;layout();renderNeu();draw()};
function boxes(){
 const q=qv();tree.querySelectorAll('input[data-i]').forEach(e=>e.checked=P[+e.dataset.i].on);
 let tot=0;
 BRANDS.forEach(([bn,gs],bi)=>{let bo=0;gs.forEach(g=>{const m=P.filter(p=>p.g===g),o=m.filter(p=>p.on).length,mm=q?m.filter(p=>match(p,q)):m,mo=mm.filter(p=>p.on).length;bo+=o;const cb=tree.querySelector(`input[data-r="${g}"]`);cb.checked=mm.length>0&&mo===mm.length;cb.indeterminate=mo>0&&mo<mm.length;tree.querySelector(`[data-gc="${g}"]`).textContent=o+'/'+m.length});tree.querySelector(`[data-bc="${bi}"]`).textContent=bo?'('+bo+' selected)':'';tot+=bo});
 document.getElementById('cnt').textContent=tot+' selected'}
function sync(){boxes();refresh();remember()}
tree.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.r){const q=qv();P.forEach(p=>{if(p.g===t.dataset.r&&(!q||match(p,q)))p.on=t.checked})}
 else if(t.dataset.i!==undefined)P[+t.dataset.i].on=t.checked;
 sync()});
document.getElementById('clr').onclick=()=>{P.forEach(p=>p.on=false);sync()};
document.getElementById('q').oninput=()=>{const q=qv();
 tree.querySelectorAll('label.pi').forEach(l=>l.hidden=!!q&&!match(P[+l.dataset.i],q));
 tree.querySelectorAll('details.rg').forEach(d=>{const v=!!d.querySelector('label.pi:not([hidden])');d.hidden=!!q&&!v;d.open=!!q&&v});
 tree.querySelectorAll('details.br').forEach(d=>{d.hidden=!!q&&!d.querySelector('details.rg:not([hidden])');if(q)d.open=true});boxes()};
boxes();refresh();
/* ---------- Suggested paints (My paints page) ----------
   Finds holes in a collection two ways: technique ramps (the Ramps targets above, at 7 steps with no tint) whose steps have
   no owned paint near them, and colour areas (hue × lightness, plus greys) with no owned paint at all. A greedy pass then picks
   the paints that close the most gaps, from the brands already owned first, then other brands for what's left. Swatches are estimates. */
const SG_FIX=[['nmm','Gold','#b08a3a'],['nmm','Steel','#8c9196'],['osl','Green glow','#3fbf4a'],['osl','Fire glow','#f07a1a'],['osl','Blue glow','#3a8fe0'],
['gem','Red gem','#b01e24'],['gem','Green gem','#1f8a3a'],['gem','Blue gem','#1f4fb0'],['skin','Pale skin','#e8b89a'],['skin','Mid skin','#c08060'],['skin','Dark skin','#6a4030']];
// Wheel hues split where paint names change (HSL degrees), so 'blue' means what painters call blue.
const SG_HUE=['red','orange','yellow','lime','green','teal','sky blue','blue','violet','purple','pink'],SG_CUT=[15,40,70,95,150,185,215,250,285,320,345],SG_BAND=['dark','mid','light'],SG_GREY=['black','dark grey','mid grey','light grey','white'];
const SG_NAME={c1_0:'brown',c1_2:'peach',c2_0:'olive',c2_1:'ochre'},sgHue=H=>{const i=SG_CUT.findIndex(c=>H<c);return i<0?0:i};
const d76=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]),sgOK=p=>nmmOK(p)&&p.g!=='B'&&!/\bclear\b/i.test(p.n);
// Colour area a paint falls in: 11 wheel hues × dark/mid/light, or one of five greys for low-saturation paints.
function sgCell(p){const L=p.lab[0];if(p.S>=.14&&Math.hypot(p.lab[1],p.lab[2])>=10)return'c'+sgHue(p.H)+'_'+(L<38?0:L<62?1:2);return'n'+(L<20?0:L<40?1:L<60?2:L<85?3:4)}
const sgCellName=c=>SG_NAME[c]||(c[0]==='n'?SG_GREY[+c[1]]:SG_BAND[+c.split('_')[1]]+' '+SG_HUE[+c.slice(1).split('_')[0]]);
// Owned paints for each step of a ramp, nearest first by the same lightness-weighted distance the wheel uses, no repeats.
function sgFit(T,own){const used=new Set(),w=(a,c)=>Math.hypot(1.6*(a[0]-c[0]),a[1]-c[1],a[2]-c[2]);
return T.map(x=>{let m=null,md=1e9;own.forEach(q=>{if(used.has(q))return;const d=w(q.lab,x.t);if(d<md){md=d;m=q}});if(m)used.add(m);return{...x,p:m,d:m?d76(m.lab,x.t):99}})}
function sgTargets(q,b){const o={...NMO};NMO.n=7;NMO.t=false;try{return TQ[q].targets(b)}finally{NMO.n=o.n;NMO.t=o.t}}
function suggestPaints(ownSet){const all=P.filter(sgOK),own=all.filter(p=>ownSet.has(p.k));if(!own.length)return null;
// Ramps: fixed bases for NMM, OSL, gems and skin; zenithal and edge highlights on the most saturated owned mid/dark paint of each hue.
const bases=SG_FIX.map(([q,n,h])=>({q,n,b:{lab:hexLab(h),h}})),pk={};
own.forEach(p=>{const[L,C]=lch(p);if(L<25||L>62||C<20||p.S<.14)return;const s=Math.round(p.H/45)%8;if(!pk[s]||C>lch(pk[s])[1])pk[s]=p});
Object.values(pk).forEach(p=>{bases.push({q:'zen',n:p.n,b:p,own:1});bases.push({q:'edge',n:p.n,b:p,own:1})});
// Grade: weak with 3+ loose steps (ΔE 12+), fair with one or two, otherwise good. Only loose steps count as gaps.
const ramps=bases.map(x=>{const R=sgFit(sgTargets(x.q,x.b),own),loose=R.filter(s=>s.d>=12).length,fair=R.filter(s=>s.d>=6&&s.d<12).length;
 return{...x,tech:TQ[x.q],R,loose,fair,grade:loose>=3?'weak':loose?'fair':'good'}});
const gaps=[];ramps.forEach(r=>r.R.forEach(s=>{if(s.d>=12)gaps.push({kind:'ramp',g:r.tech.name+' · '+r.n,role:s.r,t:s.t,d:s.d})}));
// Colour areas: the database's opaque paints say which areas exist (4+ paints) and give each a typical colour (median Lab).
const cells={};all.forEach(p=>{const c=sgCell(p);(cells[c]=cells[c]||{c,ps:[],own:[]}).ps.push(p);if(ownSet.has(p.k))cells[c].own.push(p)});
const med=a=>{a=[...a].sort((x,y)=>x-y);return a[a.length>>1]};
Object.values(cells).forEach(c=>{c.ok=c.ps.length>=4;c.t=[0,1,2].map(i=>med(c.ps.map(p=>p.lab[i])));c.name=sgCellName(c.c);
 c.best=c.own.slice().sort((a,b)=>d76(a.lab,c.t)-d76(b.lab,c.t))[0]||null;if(c.ok&&!c.own.length)gaps.push({kind:'cov',g:'Colour gap',role:c.name,cell:c.c,t:c.t})});
// How much a candidate closes a gap: a ramp step counts if it lands close (ΔE under 7) and clearly beats what's owned; a colour area counts if the paint is in it.
const gain=(p,x,c)=>x.kind==='cov'?(c===x.cell?12+Math.max(0,8-d76(p.lab,x.t))/2:0):(()=>{const d=d76(p.lab,x.t);return d<7&&d<x.d-4?Math.min(x.d,25)-d:0})();
// Paints from a range the user already has get a small lead, and a paint name is only suggested once (some ranges repeat names).
const myG=new Set(own.map(p=>p.g)),taken=new Set(own.map(p=>p.n.trim().toLowerCase()));
function pick(gs,cands,n){const out=[];for(let r=0;r<n;r++){let best=null,bs=0,bf=[];
 cands.forEach(p=>{if(taken.has(p.n.trim().toLowerCase()))return;const c=sgCell(p);let s=0,f=[];gs.forEach(x=>{if(x.done)return;const v=gain(p,x,c);if(v){s+=v;f.push(x)}});if(myG.has(p.g))s*=1.25;if(s>bs){bs=s;best=p;bf=f}});
 if(!best||bs<5)break;bf.forEach(x=>x.done=1);taken.add(best.n.trim().toLowerCase());
 // A couple of alternatives that close most of the same gaps.
 const an=new Set(),alt=cands.filter(p=>!taken.has(p.n.trim().toLowerCase())).map(p=>{const c=sgCell(p);return{p,s:bf.reduce((a,x)=>a+gain(p,x,c),0)}}).filter(a=>a.s>=bs*.6).sort((a,b)=>b.s-a.s).filter(a=>{const k=a.p.n.trim().toLowerCase();return!an.has(k)&&an.add(k)}).slice(0,2).map(a=>a.p);
 const by={};bf.forEach(x=>(by[x.g]=by[x.g]||[]).push(x.role));out.push({p:best,fills:Object.entries(by).map(([g,r])=>({g,r:[...new Set(r)]})),alt})}
 return out}
const myB=new Set(own.map(p=>BR_OF[p.g])),cand=all.filter(p=>!ownSet.has(p.k));
const mine=pick(gaps,cand.filter(p=>myB.has(BR_OF[p.g])),10),other=pick(gaps,cand.filter(p=>!myB.has(BR_OF[p.g])),5);
return{ramps,cells,mine,other,left:gaps.filter(x=>!x.done).length,brands:[...myB].map(i=>BRANDS[i][0])}}
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

// Site theme picker. The choice lives in localStorage pd-look; an inline script in index.html applies it before first paint.
// Neon 1984 (cyber) is the default for anyone who hasn't picked; Paint Pot is stored as ''.
// On a first visit the same dialog opens as a picker: choices only preview until Confirm saves one.
{const LOOKS={'':null,cyber:'#0d0221',grim:'#14120f',forest:'#2f4a24',dwarf:'#0b1311'},DEF='cyber',dlg=document.getElementById('thDlg'),opts=dlg.querySelectorAll('.tho');
const ttl=document.getElementById('thT'),txt=document.getElementById('thP'),ok=document.getElementById('thOk'),T0=[ttl.textContent,txt.textContent,ok.textContent];
const metas=[...document.querySelectorAll('meta[name="theme-color"]')],orig=metas.map(m=>m.content);
const apply=l=>{if(!(l in LOOKS))l='';if(l)document.documentElement.dataset.look=l;else delete document.documentElement.dataset.look;
 metas.forEach((m,i)=>m.content=LOOKS[l]||orig[i]);opts.forEach(o=>o.setAttribute('aria-checked',o.dataset.look===l?'true':'false'));pdIcon()};
const saved=()=>{try{const s=localStorage.getItem('pd-look');if(s!==null)return s}catch(e){}return DEF},save=l=>{try{localStorage.setItem('pd-look',l)}catch(e){}};
let FV=false;apply(saved());
const open=()=>{dlg.showModal();(dlg.querySelector('.tho[aria-checked="true"]')||opts[0]).focus()};
document.getElementById('thBtn').onclick=open;
opts.forEach(o=>o.onclick=()=>{apply(o.dataset.look);if(!FV)save(o.dataset.look)});
ok.onclick=()=>{if(FV)save((dlg.querySelector('.tho[aria-checked="true"]')||opts[0]).dataset.look);dlg.close()};
dlg.onclose=()=>{if(!FV)return;FV=false;[ttl.textContent,txt.textContent,ok.textContent]=T0;apply(saved())};
dlg.onclick=e=>{if(e.target===dlg)dlg.close()};
window.pdThemeFirst=()=>{FV=true;ttl.textContent='Pick a look';txt.textContent='Tap a theme to preview it, then confirm. Paint colours stay the same, and you can change it any time with the Theme button at the top.';ok.textContent='Confirm';open()}}

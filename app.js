const AB={Dark:'Dk',Bright:'Br',Yellow:'Yel',Orange:'Orng',Green:'Grn',Brown:'Brn',Burnt:'Brnt',Fluorescent:'Fluor',Golden:'Gld',Magenta:'Mag',Turquoise:'Turq',Ultramarine:'Ultram.',Pyrrole:'Pyr.',Shadow:'Shdw',Advanced:'Adv.',Petroleum:'Petrol.',Burgundy:'Burg.',Crimson:'Crim.',Mahogany:'Mahog.',Emerald:'Emer.',Neutral:'Neut.',Titanium:'Ti',Heavy:'Hvy',Faded:'Fdd',Wash:'Wsh',Flesh:'Flsh',Yellow_:''};
let g='M';const P=[];
RAW.split('\n').forEach(l=>{if(l[0]==='#'){g=l[1];return}const[n,c,h]=l.split('|');const r=parseInt(h.slice(1,3),16)/255,gg=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn,L=(mx+mn)/2;let H=0;
if(d){H=mx===r?((gg-b)/d)%6:mx===gg?(b-r)/d+2:(r-gg)/d+4;H=(H*60+360)%360}
const S=d?d/(1-Math.abs(2*L-1)):0;
P.push({n,c,h,g,H,S,L,lum:.299*r+.587*gg+.114*b,k:g+'|'+c+'|'+n,i:P.length})});
// Signed-in user's paint collection (set of paint keys), filled in by account.js. null when signed out.
let OWN=null,ONLY_MINE=false;const own=p=>!!p.mix||!!OWN&&OWN.has(p.k),star=p=>own(p)?'<b class="own" title="In your collection">★</b> ':'';
let CH=[],NE=[],U=h=>h;const on={p:1},CX=500,CY=500;
// Empty details panel on the wheel (Colours mode, nothing selected): what to do first.
const SEL0='<b>Nothing selected yet</b><ol class="wtips"><li><span>Tap a paint on the wheel. Its <b>complements</b> sit opposite and its <b>neighbours</b> either side.</span></li><li><span><b>Matches</b> from other brands, and mixes from your own paints, show up here.</span></li><li><span>Switch to <b>Ramps</b> or <b>Blends</b> to build a shadow-to-highlight ramp or your own blend.</span></li></ol><p class="s" style="margin-top:10px">Rim = lighter, centre = darker. Dashed outline = wash, glowing outline = fluorescent. Greys and whites are under <b>Neutrals</b>. <a href="guides/colour-theory">How to read the wheel</a></p>';
// Metallics: the metallic ranges (incl. Vallejo TMM, Turbo Dork, AK 3rd Gen), anything labelled Met./Metallic, and metal names
// in other ranges unless the name is a pigment colour (Chrome Oxide Green, Steel Legion Drab, Bronze Green...).
const MET_G=new Set(['D','I','Q','Ş','X','u','m','L','q','%','+','}','Ø','Ö']),MET_RX=/metal|\bgold\b|silver|bronze|brass|copper|steel|\biron\b|chrome|leadbelcher|retributor|balthasar|warplock|screaming bell|stormhost|liberator|auric|gehenna|sycorax|necron|runefang|ironbreaker|canoptek|fulgurite|hashut|skullcrusher|aluminium|aluminum|pewter|platinum|nickel/i;
// Metallics whose names don't say so: they sit in each range's metallic block (Citadel Grey Knights Steel, Army Painter coloured metallics).
const MET_K=new Set(['Ï|Steel','Ï|Silver','Ï|Copper','Ï|Bronze','Ï|Gold','Ï|Brass','b|Grey Knights Steel','a|Grey Knights Steel','A|Mithril','A|Dark Emerald','A|Glittering Green','A|Gemstone Red','R|Fairy Dust','R|Night Scales','R|Elven Armour','R|Azure Magic','R|Glittering Green','R|Zephyr Pink','R|Gemstone Red','R|Royal Purple','S|Glittering Loot','S|Golden Armour','_|Aotake Green','_|Aotake Blue','?|Super Italian Red']);
const isMet=p=>MET_G.has(p.g)||MET_K.has(p.g+'|'+p.n)||/anodized|^candy /i.test(p.n)&&p.g!=='Û'||/\bmet(al|allic)?\b/i.test(p.n+' '+p.c)||/gunmetal/i.test(p.n)||p.c==='70.877'||MET_RX.test(p.n)&&!/yellow|green|brown|grey|oxide|drab|blue|wolf/i.test(p.n)&&p.g!=='8'&&p.g!=='Ë'&&p.g!=='Ê'&&p.g!=='Ü'&&p.g!=='Ï';
// Paint types: everything that isn't an opaque base/layer/air paint. The ranges say most of it; mixed ranges are sorted by name or code
// (Warpaints Fanatic and Historical washes are named '... Tone').
const PT_G={'*':'ink','@':'fx',c:'con',S:'con',x:'con','1':'con','9':'con',W:'wash',s:'wash',w:'wash',z:'wash',n:'ink',i:'ink',T:'ink',r:'ink',F:'fx',f:'fx','!':'fx','^':'con','=':'ink',t:'tech',P:'tech',G:'tech',B:'tech','[':'ink','Ê':'ink','Ô':'ink','Û':'ink'};
// Pearls: pearlescent and iridescent paints (Tamiya Pearl sprays, AK Pearl), their own type so they can be hidden apart from metal.
const isPearl=p=>/\bpearl\b|iridescent|^interference /i.test(p.n)&&!/skin/i.test(p.n)&&p.g!=='Ï'&&p.g!=='Ş';
const legacyOf=p=>{const l=p.g==='Ŵ'&&(MT[p.i]||[]).find(m=>m[1]==='L');return l?P[l[0]]:null};
const paintType=p=>p.pt||(p.pt=legacyOf(p)?paintType(legacyOf(p)):isPearl(p)?'pearl':isMet(p)?'met':p.g==='Ê'&&/^fluorescent /i.test(p.n)?'fx':PT_G[p.g]||(/speedpaint|contrast/i.test(p.c)?'con':/\bwash$/i.test(p.c)||/\bwash\b|\bshade$/i.test(p.n)||(p.g==='A'||p.g==='Ħ')&&/ tone$/i.test(p.n)?'wash':/\bink$/i.test(p.n)||/ ink$/i.test(p.c)?'ink':/fluo|^neon|effects$/i.test(p.n+'|'+p.c)?'fx':/^matt .*primer$|varnish$|^(shading|blending|chipping) medium$/i.test(p.n)?'tech':'op'));
const PTYPES=[['met','Metallics','Metal paints, shifts and metallic effects'],['pearl','Pearls','Pearlescent and iridescent paints'],['con','Contrast & speedpaints','Contrast, Speedpaint, Xpress, 1-Step and Instant Colors one-coat paints'],['wash','Washes & shades','Recess shades, they only show over a basecoat'],['ink','Inks, glazes & transparents','Tint whatever is under them'],['fx','Fluorescents & special FX','Fluoro, blood, rust, corrosion and other effects'],['tech','Technical, primers & mediums','Texture, technical, primers, pigments, varnish and mediums']];
// Hidden types live in pd-types; first visit hides the types that rarely help colour theory (metallics follow the old Hide metallics setting).
let HIDE_T=new Set(['wash','ink','fx','tech','pearl']);try{const s=localStorage.getItem('pd-types');if(s!==null)HIDE_T=new Set(JSON.parse(s));else if(localStorage.getItem('pd-met')==='1')HIDE_T.add('met')}catch(e){}
// Pearls came later: hide them once for people who already saved their types (pd-ty-pearl marks it done).
try{if(localStorage.getItem('pd-ty-pearl')===null){HIDE_T.add('pearl');localStorage.setItem('pd-ty-pearl','1')}}catch(e){}
const shown=p=>!HIDE_T.has(paintType(p));
// On the wheel: HSL saturation 0.14+, or Lab chroma 8+ so dull but clearly tinted paints (Wyvern Green) aren't listed as neutrals.
const onWheel=p=>p.g!=='B'&&(p.S>=.14||Math.hypot(p.lab[1],p.lab[2])>=8)&&p.L>.07&&p.L<.95;
function layout(){const vis=p=>p.on&&shown(p);CH=P.filter(p=>vis(p)&&onWheel(p));const chs=new Set(CH);NE=P.filter(p=>vis(p)&&!chs.has(p)).sort((a,b)=>a.L-b.L);
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
/* ---------- Ramp mode (NMM, OSL, gems, skin, zenithal, edge highlights, glazes, drybrushing, underpainting) ----------
   Tap a paint and it builds a light ramp for the chosen technique. Each technique sets its own stops in Lab/LCh
   (how dark and light it goes, how chroma and hue drift, and what the optional tint does). Each stop then takes the
   nearest ticked opaque paint by ΔE (lightness weighted, since value contrast is what sells a ramp). Swatches are estimates. */
let MODE='col',NB=null,nmmSkip=[],NMM_DRAFT=null;const NMO={n:7,t:false,q:'nmm',v:{}};
// Objects each technique's preview can be shown on (first = default). Keys the object art doesn't draw fall back to the technique's own preview.
const PV={nmm:[['sword','Sword'],['axe','Axe'],['shield','Shield'],['armour','Armour'],['helmet','Helmet'],['goblet','Goblet']],
osl:[['glow','Glow'],['lantern','Lantern'],['lens','Eye lenses']],gem:[['round','Round'],['tear','Teardrop'],['square','Square cut']],
skin:[['face','Face'],['hand','Hand'],['torso','Torso'],['steps','Steps']],zen:[['figure','Cloaked figure'],['rock','Rock'],['cube','Cube and ball'],['steps','Steps']],
edge:[['plate','Armour plate'],['pauldron','Pauldron'],['hull','Tank panel'],['steps','Steps']],glaze:[['cloak','Cloak'],['panel','Flat panel'],['steps','Steps']]};
const pvGet=()=>{const l=PV[NMO.q];return l?(l.some(x=>x[0]===NMO.v[NMO.q])?NMO.v[NMO.q]:l[0][0]):''};
const nmmSave=()=>{try{localStorage.setItem('pd-nmm',JSON.stringify({m:MODE,n:NMO.n,t:NMO.t,q:NMO.q,v:NMO.v}))}catch(e){}};
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
 tip:{'Deep glaze':'Very thin, built up in the deepest recesses over several coats.','Shadow glaze':'Thin coats over the shaded areas, letting each dry.','Base':'Thinned a little so it goes on smooth. Cover the whole area.','Glaze 1':'Thin coats over the lit two thirds. Wipe most of the paint off the brush first.','Glaze 2':'Thinner, over a smaller area inside the last.','Glaze 3':'Thinner again, over a smaller area.','Final glaze':'The thinnest, only on the highest points. Several coats build it up.'}},
dry:{name:'Drybrush',full:'Drybrushing',sum:'Drybrushing layers built on the Painters Desk wheel.',prev:'rocks',tint:'My pick is the first drybrush layer',steps:['2 layers','3 layers'],
 hint:'Tap your basecoat to build drybrush layers over it.',
 targets(b){const L0=lch(b)[0],warm=(h,t)=>h+hdS(h,85)*.15*t,lay=L7()?['Drybrush 1','Drybrush 2']:['Drybrush'];
  // Each layer lighter, softer and a touch warmer, ending in a pale final dusting at a third of the saturation.
  const o={Ld:0,Lt:82,top:'Final dusting',topL:L0+(92-L0)*.8,topC:C=>C*.33,sC:C=>C,sH:h=>h,lC:(C,t)=>C*(1-.45*t),lH:warm,topH:h=>warm(h,1)};
  if(!NMO.t)return rampOf(b,{...o,dk:[],lt:lay,baseName:'Basecoat'});
  // The pick is the first drybrush layer, over a darker, slightly duller basecoat.
  return rampOf(b,{...o,dk:['Basecoat'],lt:lay.slice(1),baseName:lay[0],Ld:Math.max(8,L0*.45),sC:C=>C*.85})},
 tip:{'Basecoat':'The dark colour the recesses stay. Cover the whole area and let it dry (a dark wash over it helps).','Drybrush':'Wipe almost all the paint off, then flick across the area to catch every raised texture.','Drybrush 1':'Wipe almost all the paint off, then flick across the area to catch every raised texture.','Drybrush 2':'Drier brush, lighter strokes: only the higher ridges and edges.','Final dusting':'Barely any paint, only on the highest points that face the light.'}},
under:{name:'Underpainting',full:'Underpainting and glazes',sum:'Value underpainting with colour glazes over it, built on the Painters Desk wheel.',prev:'under',tint:'Underpaint in the complement',glaze:1,
 hint:'Tap the colour you want the area to end up to build a value underpainting and the glazes over it.',
 targets(b){const[L0,C0,h0]=lch(b),uC=NMO.t?Math.min(18,Math.max(8,C0*.35)):0,uH=(h0+180)%360,
  u=(r,L)=>({r,t:lab3(L,uC,uH),u:1,tint:NMO.t?1:0}),dL=Math.max(8,L0*.35),tL=L0+(95-L0)*.85;
  // Values first: the shadows, mid tone and lights in grey (or a dull complement), so the light and shade are worked out before any colour.
  // Then thin glazes of the pick over everything, a darker glaze into the shadows, and one opaque highlight to finish.
  const out=L7()?[u('Shadow value',dL),u('Mid value',L0),u('Light value',L0+(92-L0)*.55),u('Highlight value',tL)]:[u('Shadow value',dL),u('Mid value',L0),u('Light value',L0+(92-L0)*.65)];
  out.push({r:'Colour glaze',t:b.lab,base:1,w:3});
  if(L7())out.push({r:'Shadow glaze',t:lab3(Math.max(8,L0*.55),C0*1.05,h0),w:4});
  out.push({r:'Final highlight',t:lab3(L0+(92-L0)*.7,C0*.45,h0+hdS(h0,85)*.1)});
  return out},
 tip:{'Shadow value':'Block in every recess and the side away from the light. Work out the shading now, not the colour.','Mid value':'The middle tone over most of the area, matching how light the finished colour is.','Light value':'The lit planes and raised areas, blended into the mid value.','Highlight value':'Small, on the highest points. These stay the brightest spots once glazed.','Colour glaze':'Thin coats of your colour over the whole area. The values show through and do the shading. Let each coat dry.','Shadow glaze':'Thin coats into the shadows only, to deepen and enrich them.','Final highlight':'Opaque, on the very highest points, to sharpen the lights the glazes softened.'}}};
// Ramp techniques with their own /guides page (worker/seo.js GUIDES).
const TQ_GUIDE={nmm:'best-paints-for-nmm',osl:'best-paints-for-osl',skin:'best-paints-for-skin-tones',gem:'best-paints-for-gems',zen:'zenithal-highlighting',edge:'edge-highlighting',glaze:'glazing',dry:'drybrushing'};
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
function blendWheel(){const st=BL.s;let s=stepLine(st.map(x=>x.p),BL.b);
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
<div class="row"><button class="btn" type="button" id="blTut">Save as recipe</button><button class="btn" type="button" id="blReset">Reset to wheel picks</button></div>`;
el.querySelectorAll('[data-ma]').forEach(e=>e.onclick=()=>{const i=+e.dataset.ma;ACT=ACT&&ACT.ins&&ACT.i===i?null:{i,ins:1};draw()});
el.querySelectorAll('[data-mr]').forEach(e=>e.onclick=()=>{const i=+e.dataset.mr;ACT=ACT&&!ACT.ins&&ACT.i===i?null:{i};draw()});
el.querySelectorAll('[data-mu],[data-md]').forEach(e=>e.onclick=()=>{const i=+(e.dataset.mu??e.dataset.md),j=e.dataset.mu!=null?i-1:i+1;[st[i],st[j]]=[st[j],st[i]];ACT=null;draw()});
el.querySelectorAll('[data-mp]').forEach(e=>e.onclick=()=>{const x=st[+e.dataset.mp];x.man=x.man?0:1;if(!x.man&&!x.sp)x.sp=x.p;ACT=null;draw()});
el.querySelectorAll('[data-mx]').forEach(e=>e.onclick=()=>{st.splice(+e.dataset.mx,1);ACT=null;draw()});
el.querySelectorAll('[data-mm]').forEach(e=>e.onchange=()=>{st[+e.dataset.mm].m=+e.value;draw()});
document.getElementById('blReset').onclick=()=>{blendSeed(b);draw()};
// Recipe order: the base first, then the shadow side working outward from it, then the light side.
document.getElementById('blTut').onclick=()=>{const sh=st.slice(0,i0).reverse(),li=st.slice(i0+1),mx=x=>x.m?[{k:x.p.k,parts:MXR[x.m][0]},{k:b.k,parts:MXR[x.m][1]}]:[{k:x.p.k,parts:1}];
 NMM_DRAFT={kind:'recipe',title:'Blend: '+b.n.trim(),summary:'Custom blend built on the Painters Desk wheel.',
 steps:[{title:'Base',text:'Cover the whole area.',image:'',mix:[{k:b.k,parts:1}]}].concat(sh.map((x,k)=>({title:'Shadow '+(k+1),text:k?'Thinner, into the deepest recesses inside the last.':'Thinned, into the recesses and blended out toward the base.',image:'',mix:mx(x)})),li.map((x,k)=>({title:'Highlight '+(k+1),text:k?'Over a smaller area inside the last, on the highest points.':'On the raised areas, blended back into the base.',image:'',mix:mx(x)})))};location.hash='#/new'}}

try{const o=JSON.parse(localStorage.getItem('pd-nmm'));if(o){MODE=o.m==='nmm'||o.m==='mix'?o.m:'col';NMO.n=o.n===5?5:7;NMO.t=!!o.t;NMO.q=TQ[o.q]?o.q:'nmm';NMO.v=typeof o.v==='string'?{nmm:o.v}:o.v&&typeof o.v==='object'?o.v:{}}}catch(e){}
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
// Greys and whites have no hue, so a ramp or blend step that uses one gets a dashed dot on the base paint's spoke, placed by lightness
// like the rest of the wheel (dark in the middle, light at the rim). OFF holds those dots for draw(); stepPts gives every step a point.
let OFF=[];
function stepPts(ps,b){const h=CH.includes(b)?b.H:(ps.find(p=>CH.includes(p))||{H:0}).H,a=U(h)*Math.PI/180-Math.PI/2,o=[];
 ps.forEach(p=>{if(!CH.includes(p)&&!o.some(x=>x.p===p))o.push({p,r:135+Math.min(1,Math.max(0,(p.L-.1)/.85))*320})});
 o.sort((x,y)=>x.r-y.r).forEach((x,i)=>{if(i)x.r=Math.max(x.r,o[i-1].r+44)});
 OFF=o.map(x=>[x.p,CX+x.r*Math.cos(a),CY+x.r*Math.sin(a)]);
 return ps.map(p=>{if(CH.includes(p))return[p.x,p.y];const q=OFF.find(x=>x[0]===p);return[q[1],q[2]]})}
const stepLine=(ps,b)=>{const q=stepPts(ps,b);return q.length>1?`<polyline points="${q.map(x=>x.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" opacity=".6"/>`:''};
// Wheel overlay: the ramp as a path through its paints (greys and whites on the base paint's spoke), and the centre disc painted as the ramp.
function nmmWheel(R){const T=TQN();let s=stepLine(R.filter(x=>x.p).map(x=>x.p),NB);
return s+`<defs>${rampGrad('ng',T.prev==='under'?underFin(R):R,T.prev==='osl')}</defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#ng)" stroke="#1b1b1b" stroke-width="3"><title>${T.full} ramp</title></circle>`}
// Underpainting: the colour steps (glazes and final highlight) dark to light, which is how the finished area reads.
const underFin=R=>R.filter(x=>!x.u&&x.p).sort((a,b)=>a.p.lab[0]-b.p.lab[0]);
// Ramp preview objects: original drawings painted with the ramp's own paints. PV lists which objects each technique offers.
const objPick=()=>{const l=PV[NMO.q],v=pvGet();return l?`<div class="nvw" role="group" aria-label="Show the ramp on">${l.map(([k,t])=>`<button type="button" class="btn sm${v===k?' pri':''}" data-nv="${k}" aria-pressed="${v===k}">${t}</button>`).join('')}</div>`:''};
function prevObj(st){if(!st.length)return'';const v=pvGet();if(!v||v==='steps')return'';
// S: the ramp's paints, darkest first. cx(f): the ramp colour a fraction f of the way from darkest to lightest (blended between steps).
const S=[...st].sort((a,b)=>a.p.lab[0]-b.p.lab[0]).map(x=>x.p.h),n=S.length,K='#1b1b1b',HI=S[n-1],
rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),
mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return'#'+A.map((x,i)=>Math.round(x+(B[i]-x)*t).toString(16).padStart(2,'0')).join('')},
cx=f=>{if(typeof f==='string')return f;const x=Math.max(0,Math.min(1,f))*(n-1),i=Math.floor(x);return i>=n-1?S[n-1]:mix(S[i],S[i+1],x-i)},
// Gradient stops are [offset, ramp fraction or colour, opacity].
sp=a=>a.map(([t,f,o])=>`<stop offset="${t}" stop-color="${cx(f)}"${o==null?'':` stop-opacity="${o}"`}/>`).join(''),
G=(id,a,x1=0,y1=0,x2=1,y2=0)=>`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${sp(a)}</linearGradient>`,
U=(id,a,x1,y1,x2,y2,tf)=>`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${tf?` gradientTransform="${tf}"`:''}>${sp(a)}</linearGradient>`,
RU=(id,a,x,y,r)=>`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${x}" cy="${y}" r="${r}">${sp(a)}</radialGradient>`,
BL=(id,d)=>`<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${d}"/></filter>`,
CP=(id,d)=>`<clipPath id="${id}"><path d="${d}"/></clipPath>`,
O=`stroke="${K}" stroke-width="3" stroke-linejoin="round"`,o2=`stroke="${K}" stroke-width="2" stroke-linejoin="round"`,
PA=(d,f,x='')=>`<path d="${d}" fill="${f}" ${x}/>`,ln=(d,c,w=2,x='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`,
el=(x,y,rx,ry,f,e='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${cx(f)}" ${e}/>`,
gl=(x,y,r=7)=>`<path d="M${x} ${y-r}L${x+r*.22} ${y-r*.22}L${x+r} ${y}L${x+r*.22} ${y+r*.22}L${x} ${y+r}L${x-r*.22} ${y+r*.22}L${x-r} ${y}L${x-r*.22} ${y-r*.22}Z" fill="${HI}"/><circle cx="${x}" cy="${y}" r="${r*.3}" fill="${HI}"/>`,
rivet=(x,y,r=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${cx(.45)}" stroke="${K}" stroke-width="1.2"/><circle cx="${x-r*.3}" cy="${y-r*.3}" r="${r*.35}" fill="${HI}"/>`,
shadow=(x,y,rx,ry=5)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity=".28"/>`,
sv=(lab,h,defs,b)=>`<svg class="blade" viewBox="0 0 300 ${h}" role="img" aria-label="Ramp preview on ${lab}"><defs>${defs}</defs>${b}</svg>`,
// Polished metal seen side-on: sky light, a sharp horizon, then light bounced back up from the ground.
TUBE=[[0,.35],[.1,.6],[.22,.95],[.3,1],[.36,1],[.38,.1],[.55,.25],[.78,.55],[.92,.82],[1,.4]],
A={
// ---------- NMM ----------
sword(){const d='M84 35L252 38L294 50L252 62L84 65Z';
 return sv('a sword',100,U('pa',[[0,.3],[.16,.55],[.3,.92],[.36,1],[.41,1],[.42,.1],[.58,.3],[.78,.62],[.92,.88],[1,.95]],114,0,324,0,'skewX(-35)')+
  U('pb',[[0,.04],[.2,.18],[.44,.5],[.6,.85],[.66,.98],[.67,.06],[.84,.25],[1,.5]],124,0,334,0,'skewX(-35)')+G('pc',TUBE,0,0,0,1)+G('pd',TUBE)+
  RU('pe',[[0,1],[.2,.92],[.5,.5],[.82,.12],[1,.4]],12,45,16)+G('pf',[[0,'#7a5230'],[.5,'#4a2e16'],[1,'#2a190b']],0,0,0,1),
  `<rect x="26" y="43" width="44" height="14" rx="3" fill="url(#pf)" ${o2}/>${[32,39,46,53,60].map(x=>ln(`M${x} 44L${x+5} 56`,'#1e1208',1.6)).join('')}
  <circle cx="16" cy="50" r="11" fill="url(#pe)" ${O}/>
  ${PA('M84 35L252 38L294 50L84 50Z','url(#pa)')}${PA('M84 50L294 50L252 62L84 65Z','url(#pb)')}
  ${ln('M86 36.6L251 39.6L290 50',HI,1.3,'opacity=".85"')}${ln('M88 50H288',K,1.2,'opacity=".45"')}${ln('M88 48.8H250',HI,.9,'opacity=".5"')}
  ${PA(d,'none',O)}
  <rect x="70" y="20" width="16" height="60" rx="6" fill="url(#pc)" ${O}/><rect x="65" y="41" width="26" height="18" rx="4" fill="url(#pd)" ${O}/>
  ${gl(166,42,8)}${gl(78,28,4)}${gl(12,45,4)}`)},
axe(){const head='M214 78Q208 54 164 36Q222 -4 288 22Q254 46 246 78Z',bev='M164 36Q222 -4 288 22L279 30Q224 10 176 41Z';
 return sv('an axe',124,U('pa',[[0,.5],[.2,.9],[.3,1],[.35,1],[.36,.08],[.58,.28],[.8,.6],[1,.85]],150,0,300,0,'skewX(-30)')+
  G('pb',[[0,.08],[.3,.3],[.5,.92],[.57,1],[.59,.15],[.8,.4],[1,.7]])+G('pc',TUBE,0,0,0,1)+G('pd',TUBE)+
  G('pf',[[0,'#8a5c34'],[.45,'#6b4423'],[1,'#3a2410']],0,0,0,1)+G('pg',[[0,'#5a4030'],[1,'#2a1c14']],0,0,0,1),
  `<rect x="14" y="82" width="250" height="13" rx="5" fill="url(#pf)" ${O}/>${ln('M70 86H200',K,1,'opacity=".3"')}${ln('M96 91H230',K,1,'opacity=".25"')}
  <rect x="30" y="81" width="52" height="15" rx="3" fill="url(#pg)" ${o2}/>${[38,47,56,65,74].map(x=>ln(`M${x} 82L${x-4} 95`,'#140d08',1.5)).join('')}
  <rect x="6" y="78" width="16" height="21" rx="5" fill="url(#pc)" ${O}/>
  ${PA('M220 98H242L238 114H224Z','url(#pd)',O)}
  ${PA(head,'url(#pa)',O)}${PA(bev,'url(#pb)',`stroke="${K}" stroke-width="1.6" stroke-linejoin="round"`)}
  ${ln('M168 35Q222 0 284 22.5',HI,1.3,'opacity=".9"')}
  <rect x="210" y="74" width="40" height="28" rx="4" fill="url(#pc)" ${O}/>${rivet(230,88,3.2)}
  ${gl(232,12,7)}${gl(204,52,5)}${gl(216,80,3.5)}`)},
shield(){const out='M88 14Q150 4 212 14Q216 86 150 134Q84 86 88 14Z',inn='M99 23Q150 15 201 23Q203 80 150 120Q97 80 99 23Z';
 return sv('a shield',142,CP('pk',inn)+G('pa',[[0,.1],[.3,.3],[.48,.85],[.55,1],[.57,.15],[.8,.45],[1,.75]],0,0,1,1)+
  G('pb',[[0,.9],[.12,1],[.22,1],[.5,.62],[1,.3]],0,0,.25,1)+G('pc',[[0,.3],[.42,.06],[.5,.05],[.52,.5],[.8,.7],[1,.9]],0,0,-.2,1)+
  RU('pd',[[0,1],[.2,.95],[.5,.55],[.8,.12],[1,.45]],144,56,20),
  `${PA(out,'url(#pa)',O)}<g clip-path="url(#pk)"><rect x="90" y="10" width="60" height="120" fill="url(#pb)"/><rect x="150" y="10" width="60" height="120" fill="url(#pc)"/></g>
  ${ln('M149 19V119',HI,1.6,'opacity=".8"')}${ln('M151 19V119',K,1.4,'opacity=".5"')}${PA(inn,'none',o2)}
  <circle cx="150" cy="62" r="16" fill="url(#pd)" ${O}/>
  ${[[94,19],[206,19],[92,58],[208,58],[112,98],[188,98],[150,127]].map(([x,y])=>rivet(x,y,2.6)).join('')}
  ${gl(117,36,9)}${gl(144,56,4.5)}${gl(176,104,4)}`)},
armour(){const body='M124 16Q150 36 176 16L202 20Q190 46 222 68Q218 96 204 110Q176 120 150 122Q124 120 96 110Q82 96 78 68Q110 46 98 20Z',
 pl='M90 100Q122 94 150 80Q178 94 210 100Q208 106 204 110Q176 120 150 122Q124 120 96 110Q92 106 90 100Z';
 return sv('a breastplate',160,CP('pk',body)+RU('pa',[[0,1],[.14,.97],[.42,.66],[.72,.34],[1,.12]],116,50,50)+RU('pb',[[0,.92],[.2,.72],[.5,.42],[.8,.16],[1,.05]],170,52,54)+
  G('pc',[[0,.95],[.2,.6],[.5,.3],[1,.12]],0,0,0,1)+G('pe',TUBE,0,0,0,1)+BL('pz',3),
  `<g clip-path="url(#pk)"><rect x="70" y="0" width="80" height="130" fill="url(#pa)"/><rect x="150" y="0" width="80" height="130" fill="url(#pb)"/>
  <g filter="url(#pz)">${ln('M82 92Q116 104 148 86',cx(.05),7)}${ln('M152 86Q184 104 218 92',cx(0),8)}${ln('M210 66Q200 84 190 92',cx(.75),4,'opacity=".8"')}</g></g>
  ${ln('M148.8 32V82',HI,1.6,'opacity=".85"')}${ln('M151 32V82',K,1.5,'opacity=".55"')}
  ${PA(pl,'url(#pc)',o2)}${PA(body,'none',O)}
  ${PA('M124 16Q150 36 176 16L172 9Q150 27 128 9Z','url(#pe)',O)}
  ${[[96,204,120],[92,208,137]].map(([a,b,y])=>{const d=`M${a} ${y}Q150 ${y+18} ${b} ${y}`,t=(c,w,dy,o=1)=>ln(d,c,w,`transform="translate(0 ${dy})" stroke-linecap="butt" opacity="${o}"`);
   return ln(`M${a-1.5} ${y}Q150 ${y+18} ${b+1.5} ${y}`,K,19,'stroke-linecap="butt"')+t(cx(.3),13,0)+t(cx(.8),5,-3.5)+t(HI,2.2,-4)+t(cx(.05),2.6,.6)+t(cx(.6),2.4,4.6,.8)}).join('')}
  ${rivet(110,24,2.6)}${rivet(190,24,2.6)}${rivet(104,123,2)}${rivet(196,123,2)}${rivet(100,140,2)}${rivet(200,140,2)}
  ${gl(109,44,9)}${gl(150,84,4.5)}${gl(128,118,4)}`)},
helmet(){const out='M98 132V62Q98 10 150 10Q202 10 202 62V132H170V90H190V70H110V90H130V132Z',op='M110 70H190V90H170V132H130V90H110Z';
 return sv('a helmet',142,CP('pk',out)+RU('pa',[[0,1],[.1,.97],[.34,.68],[.58,.42],[.82,.14],[1,.06]],126,34,96)+
  G('pb',[[0,0,0],[.35,.1,.0],[.5,.5,.85],[1,.8,.9]],0,0,0,1)+G('pc',[[0,.9],[.35,1],[.48,.75],[.52,.1],[1,.4]])+BL('pz',2.5),
  `<rect x="104" y="64" width="92" height="70" fill="#0d0d0d"/>
  ${PA(out,'url(#pa)')}<g clip-path="url(#pk)"><rect x="98" y="92" width="34" height="42" fill="url(#pb)"/><rect x="168" y="92" width="34" height="42" fill="url(#pb)" opacity=".7"/>
  <g filter="url(#pz)">${ln('M98 66H202',cx(.02),6,'opacity=".75"')}</g></g>
  ${ln('M104 132V92',HI,1.4,'opacity=".7"')}
  <g clip-path="url(#pk)">${PA(op,'none',`stroke="${cx(.85)}" stroke-width="7" stroke-linejoin="round"`)}${PA(op,'#0d0d0d',o2)}</g>
  ${PA('M146 13Q150 8 154 13V70H146Z','url(#pc)',o2)}${PA(out,'none',O)}
  ${[[104,102],[104,120],[196,102],[196,120],[118,60],[182,60]].map(([x,y])=>rivet(x,y,2.4)).join('')}
  ${gl(124,32,9)}${gl(113,112,4)}${gl(148,22,3.5)}`)},
goblet(){return sv('a goblet',152,G('pa',[[0,.25],[.08,.48],[.2,.92],[.27,1],[.33,1],[.35,.1],[.6,.3],[.82,.6],[.93,.86],[1,.4]])+
  G('pb',[[0,.05],[.5,.2],[.8,.55],[1,.85]])+G('pc',[[0,.6],[.25,1],[.4,1],[.44,.12],[.75,.4],[1,.7]]),
  `${PA('M106 16C104 52 122 78 150 80C178 78 196 52 194 16Z','url(#pa)',O)}
  <ellipse cx="150" cy="16" rx="44" ry="8" fill="url(#pb)" ${O}/>${ln('M108 17Q150 30 192 17',HI,1.2,'opacity=".6"')}
  ${ln('M108 38Q150 53 192 38',K,1.6,'opacity=".7"')}${ln('M111 46Q150 60 189 46',K,1.6,'opacity=".7"')}
  ${[118,134,150,166,182].map((x,i)=>`<circle cx="${x}" cy="${[45.5,49,50.5,49,45.5][i]}" r="2" fill="${cx(i<2?.95:.3)}" stroke="${K}" stroke-width=".8"/>`).join('')}
  ${PA('M143 79L145 110H155L157 79Z','url(#pc)',O)}<ellipse cx="150" cy="93" rx="14" ry="7.5" fill="url(#pc)" ${O}/>
  ${PA('M145 108H155C160 114 184 122 188 138Q150 152 112 138C116 122 140 114 145 108Z','url(#pa)',O)}${ln('M116 136Q150 147 184 136',K,1.4,'opacity=".5"')}
  ${gl(130,32,9)}${gl(144,91,4)}${gl(133,126,4.5)}`)},
// ---------- Skin ----------
// Proportions: eyes halfway down the head and one eye-width apart, nose base halfway from eyes to chin, ears from brow to nose base.
face(){const head='M150 14C175 14 191 32 191 58C191 72 189 86 183 99C177 113 165 127 150 129C135 127 123 113 117 99C111 86 109 72 109 58C109 32 125 14 150 14Z',HR='#33241a',
 eye=(x,s)=>{const d=`M${x-9} 69Q${x-3*s} 62.5 ${x+9} 69Q${x} 73.5 ${x-9} 69Z`;return`<clipPath id="pe${s>0?1:2}"><path d="${d}"/></clipPath>${PA(d,'#efe7da')}<g clip-path="url(#pe${s>0?1:2})"><circle cx="${x}" cy="67.6" r="4.3" fill="#4a3524"/><circle cx="${x}" cy="67.6" r="1.9" fill="#120c08"/><rect x="${x-10}" y="60" width="20" height="5.5" fill="#000" opacity=".28"/></g><circle cx="${x-1.4}" cy="66.3" r="1" fill="#fff"/>${ln(`M${x-9.6} 69.2Q${x-3*s} 62 ${x+9.6} 69`,K,2.1)}${ln(`M${x-7} 71.4Q${x} 74 ${x+7.5} 70.8`,cx(.12),1,'opacity=".7"')}`};
 return sv('a face',166,CP('pk',head)+BL('pz',4.5)+BL('py',2)+BL('px',1)+G('pa',[[0,.08],[.22,.3],[.5,.6],[1,.5]],0,0,0,1)+G('pb',[[0,.85],[.5,.6],[1,.3]],0,0,1,.3),
  `${PA('M132 112V138C120 146 98 150 78 156V166H222V156C202 150 180 146 168 138V112Z','url(#pb)',O)}
  <g filter="url(#py)">${PA('M133 118H167V134Q150 142 133 134Z',cx(.1),'opacity=".85"')}${ln('M136 136Q128 148 106 153',cx(.9),3,'opacity=".7"')}${ln('M164 136Q172 148 194 153',cx(.75),3,'opacity=".5"')}${ln('M139 124L146 146',cx(.25),2.5,'opacity=".6"')}${ln('M161 124L154 146',cx(.2),2.5,'opacity=".6"')}</g>
  ${PA('M110 62C103 59 100 66 102 76C104 86 108 93 113 92Z',cx(.5),o2)}${ln('M106 68Q104 76 109 86',cx(.15),1.4)}
  ${PA('M190 62C197 59 200 66 198 76C196 86 192 93 187 92Z',cx(.28),o2)}${ln('M194 68Q196 76 191 86',cx(.05),1.4)}
  ${PA(head,cx(.56))}<g clip-path="url(#pk)"><g filter="url(#pz)">
  ${el(143,42,24,11,.9)}${el(191,78,13,42,.1)}${el(110,80,7,30,.34)}${el(133,68,12,7,.24)}${el(167,68,12,7,.17)}
  ${el(129,87,10,5.5,.93)}${el(172,87,9,5.5,.72)}${el(126,105,7,10,.3)}${el(176,106,9,11,.15)}${el(150,122,9,4.5,.9)}</g>
  <g filter="url(#py)">${el(141,36,10,4,1)}${PA('M147.6 62Q146.6 80 146.8 94H151.6Q151.4 78 151.6 62Z',cx(.97))}${PA('M152 68Q152.6 82 152.4 95H157Q156.4 82 155.4 68Z',cx(.26))}
  ${el(150,102.2,8.5,2.2,.06)}${el(142,96.5,3,2.6,.5)}${el(158.5,96.5,3,2.6,.22)}${el(150,116.6,8,2,.16)}</g>
  <circle cx="149" cy="95" r="2.6" fill="${HI}" opacity=".75" filter="url(#px)"/></g>
  ${PA('M107 66C101 30 124 6 150 6C176 6 199 30 193 66C191 50 185 40 176 34C162 38 140 37 126 31C116 38 110 50 107 66Z',HR,O)}
  <g filter="url(#px)">${ln('M124 20Q138 11 156 12','#6a503a',2.2,'opacity=".8"')}${ln('M120 28Q126 22 134 19','#6a503a',1.6,'opacity=".6"')}</g>
  ${PA('M122 61.5Q131 55.5 142.5 59.5L142 62.2Q131 59.4 122.6 63.6Z',HR)}${PA('M178 61.5Q169 55.5 157.5 59.5L158 62.2Q169 59.4 177.4 63.6Z',HR)}
  ${eye(133,1)}${eye(167,-1)}
  ${ln('M142.4 97.6Q144.6 100.6 147.6 99.6Q150 101.2 152.4 99.6Q155.4 100.6 157.6 97.6',cx(0),1.7)}
  ${PA('M139 109.4Q145 106.4 150 108Q155 106.4 161 109.4Q150 111.6 139 109.4Z',cx(.3))}${PA('M139 109.4Q150 111.6 161 109.4Q156 115.4 150 115.4Q144 115.4 139 109.4Z',cx(.62))}
  ${ln('M138.4 109.4Q150 112 161.6 109.4',cx(0),1.6)}${ln('M145 113Q150 114.4 155 113',cx(.97),1.4,'opacity=".9"')}
  ${ln('M109 58C109 72 111 86 117 99C123 113 135 127 150 129C165 127 177 113 183 99C189 86 191 72 191 58',K,3)}`)},
// Back of a hand: palm about as long as the middle finger, knuckles on an arc, thumb set low on the side and reaching the index knuckle.
hand(){const F=[[126.5,97,49,15,-6],[143.5,92,57,15.5,-2],[160.5,95,53,15,3],[176,103,41,13,9]],
 fin=([x,by,len,w,a])=>{const y=by-len,h=len+10,c1=y+len*.29,c2=y+len*.58,nw=w*.6;
  return`<g transform="rotate(${a} ${x} ${by})"><rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" rx="${w/2}" fill="url(#pa)" ${O}/>
  <rect x="${x-nw/2}" y="${y+2.6}" width="${nw}" height="${len*.17}" rx="${nw*.45}" fill="${cx(.9)}" stroke="${cx(.32)}" stroke-width=".9"/>
  ${[c1,c1+2.6,c2,c2+2.8].map((c,i)=>ln(`M${x-w*.3} ${c}Q${x} ${c+2.2} ${x+w*.3} ${c}`,cx(.05),i%2?1:1.4,`opacity="${i%2?.4:.7}"`)).join('')}
  <ellipse cx="${x-1}" cy="${c2+1.4}" rx="${w*.26}" ry="2.4" fill="${cx(.98)}" opacity=".6" filter="url(#py)"/></g>`},
 body='M127 172L128 152C121 148 114 142 110 134L109 112Q116 110 118 101C121 95 130 92 135 93C142 88 152 88 159 91C166 90 174 94 179 99C184 103 185 108 185 114C185 128 181 142 173 152L174 172Z';
 return sv('the back of a hand',172,G('pa',[[0,.34],[.28,.88],[.44,1],[.74,.56],[1,.14]])+G('pb',[[0,.84],[.4,.64],[1,.24]],0,0,1,.5)+CP('pk',body)+BL('pz',3)+BL('py',1.3),
  `<g transform="rotate(-38 120 140)"><rect x="110.5" y="82" width="19" height="66" rx="9.5" fill="url(#pa)" ${O}/><rect x="114.4" y="84.8" width="11.2" height="10" rx="4.8" fill="${cx(.9)}" stroke="${cx(.32)}" stroke-width=".9"/>
  ${ln('M114 108Q120 110.4 126 108',cx(.05),1.4,'opacity=".7"')}${ln('M114 111Q120 113 126 111',cx(.05),1,'opacity=".4"')}</g>
  ${F.map(fin).join('')}${PA(body,'url(#pb)')}<g clip-path="url(#pk)"><g filter="url(#pz)">
  ${[[127,100,141,152],[144,96,147.5,152],[161,99,154,152],[176,106,161,152]].map(([a,b,c,d])=>ln(`M${a} ${b}L${c} ${d}`,cx(.94),3,'opacity=".8"')).join('')}
  ${[[135.5,104,144.5,150],[152.5,102,151,150],[169,106,158,150]].map(([a,b,c,d])=>ln(`M${a} ${b}L${c} ${d}`,cx(.18),3.2,'opacity=".7"')).join('')}
  ${el(185,130,7,30,.06)}${ln('M108 116Q112 130 126 146',cx(.94),5,'opacity=".8"')}${ln('M119 110Q120 128 129 146',cx(.22),3.6,'opacity=".6"')}${el(150,170,26,7,.3)}${el(139,160,8,9,.88)}${el(169,151,5,5,.92)}</g>
  <g filter="url(#py)">${[[127.5,99,5.4,3.4],[144.5,95,5.8,3.6],[161,97.6,5.4,3.4],[176.5,105,4.6,3.2]].map(([x,y,a,b])=>el(x,y,a,b,.98,'opacity=".75"')).join('')}
  ${[[136,96.5],[152.5,94],[169,98.5]].map(([x,y])=>ln(`M${x} ${y-4}V${y+5}`,cx(.05),2.2,'opacity=".6"')).join('')}</g></g>
  ${ln('M127 172L128 152Q121 150 113.5 145.5',K,3)}${ln('M109.6 111.6Q116 110 118 101',K,3)}${ln('M185 112C185.5 127 181 142 173 152L174 172',K,3)}
  ${ln('M130 153.4Q150 158.4 171 153.4',cx(.05),1.4,'opacity=".55"')}`)},
// Bare torso from the front: shoulders about twice the waist, pecs to a third of the way down, six abdominal blocks either side of the midline.
torso(){const t='M136 4V16C124 22 104 24 88 28C72 32 62 46 62 62C62 76 66 90 70 102L92 102C92 92 94 84 97 78C99 100 104 124 108 140C110 152 110 162 110 172H190C190 162 190 152 192 140C196 124 201 100 203 78C206 84 208 92 208 102L230 102C234 90 238 76 238 62C238 46 228 32 212 28C196 24 176 22 164 16V4Z';
 return sv('a bare torso',172,CP('pk',t)+BL('pz',5)+BL('py',2.2)+BL('px',1),
  `${PA(t,cx(.56))}<g clip-path="url(#pk)"><g filter="url(#pz)">
  ${el(124,56,22,11,.93)}${el(176,57,21,11,.84)}${el(78,46,13,11,.95)}${el(222,48,12,11,.8)}${el(74,78,6,18,.85)}${el(228,80,6,18,.5)}
  ${el(150,8,16,7,.1)}${el(216,104,20,72,.1,'opacity=".8"')}${el(104,122,7,34,.26)}${el(197,122,8,36,.12)}${el(88,92,6,14,.14)}${el(212,92,6,14,.08)}
  ${el(150,166,44,9,.22)}</g>
  <g filter="url(#py)">${ln('M99 82Q124 96 148 84',cx(.06),4.6,'opacity=".85"')}${ln('M152 84Q176 96 201 82',cx(.03),5,'opacity=".9"')}
  ${ln('M150 38V84',cx(.14),3.4,'opacity=".75"')}${ln('M150 90V162',cx(.1),3.4,'opacity=".8"')}
  ${ln('M96 40Q100 58 97 76',cx(.14),3.6,'opacity=".7"')}${ln('M204 40Q200 58 203 76',cx(.06),3.8,'opacity=".75"')}
  ${ln('M146 31Q124 26 100 30',cx(.97),3,'opacity=".9"')}${ln('M154 31Q176 26 200 30',cx(.88),3,'opacity=".8"')}${ln('M146 35.5Q124 31 102 35',cx(.2),2.4,'opacity=".6"')}${ln('M154 35.5Q176 31 198 35',cx(.14),2.4,'opacity=".6"')}
  ${[[104,.6],[121,.7],[138,.75]].map(([y,o])=>ln(`M131 ${y+2}Q141 ${y-1} 149 ${y+1}`,cx(.1),2.6,`opacity="${o}"`)+ln(`M151 ${y+1}Q159 ${y-1} 169 ${y+2}`,cx(.06),2.6,`opacity="${o}"`)).join('')}
  ${[[96,.95,.8],[113,.9,.72],[130,.8,.62],[148,.68,.52]].map(([y,a,b])=>el(140.5,y,7,5.6,a,'opacity=".9"')+el(159.5,y,7,5.6,b,'opacity=".9"')).join('')}
  ${ln('M129 92Q124 120 128 150',cx(.2),2.6,'opacity=".55"')}${ln('M171 92Q176 120 172 150',cx(.12),2.6,'opacity=".6"')}
  ${[100,110,120].map((y,i)=>ln(`M110 ${y}L120 ${y+5}`,cx(.9),2.2,`opacity="${.6-i*.12}"`)).join('')}${el(150,24,5,3,.12)}</g>
  <g filter="url(#px)">${el(120,51,10,4,1,'opacity=".85"')}${el(76,41,7,4,1,'opacity=".9"')}${el(172,52,8,3.4,1,'opacity=".6"')}</g>
  <ellipse cx="150" cy="154" rx="2.2" ry="3.2" fill="${cx(0)}" opacity=".85"/><circle cx="124" cy="73" r="2.3" fill="${cx(.28)}"/><circle cx="176" cy="73.6" r="2.3" fill="${cx(.2)}"/></g>
  ${ln('M97 78Q95 70 97 62',K,2.2,'opacity=".8"')}${ln('M203 78Q205 70 203 62',K,2.2,'opacity=".8"')}${PA(t,'none',O)}`)},
// ---------- Zenithal: light from straight above ----------
figure(){const cl='M120 46C98 70 86 108 76 138Q94 146 112 139Q130 148 150 140Q170 148 188 139Q206 146 224 138C214 108 202 70 180 46Z',hood='M150 6C177 6 188 30 183 50C176 60 124 60 117 50C112 30 123 6 150 6Z';
 return sv('a cloaked figure',152,CP('pk',cl)+G('pa',[[0,1],[.1,.88],[.32,.56],[.62,.3],[1,.04]],0,0,0,1)+RU('pb',[[0,1],[.28,.85],[.62,.45],[1,.12]],148,8,54)+BL('pz',3),
  `${shadow(150,141,84,7)}${PA(cl,'url(#pa)')}<g clip-path="url(#pk)" filter="url(#pz)">
  ${[[128,60,104,146,.02,7],[142,62,134,146,.04,6],[158,62,166,146,.04,6],[172,60,196,146,.02,7]].map(([a,b,c,d,f,w])=>ln(`M${a} ${b}Q${(a+c)/2+(a<150?-4:4)} ${(b+d)/2} ${c} ${d}`,cx(f),w,'opacity=".7"')).join('')}
  ${[[122,50,96,100],[135,56,120,104],[165,56,180,104],[178,50,204,100]].map(([a,b,c,d])=>ln(`M${a} ${b}L${c} ${d}`,cx(.95),3,'opacity=".55"')).join('')}
  ${el(120,52,14,5,1)}${el(180,52,14,5,1)}</g>
  ${ln('M150 60V140',K,1.6,'opacity=".6"')}${PA(cl,'none',O)}
  ${PA(hood,'url(#pb)',O)}<ellipse cx="150" cy="37" rx="15" ry="18" fill="#0d0d0d" ${o2}/>
  <circle cx="150" cy="61" r="5" fill="${cx(.9)}" ${o2}/>`)},
rock(){return sv('a rock',134,G('pa',[[0,1],[.5,.88],[1,.72]],0,0,1,1)+G('pb',[[0,.62],[1,.28]],0,0,0,1)+G('pc',[[0,.5],[1,.12]],0,0,0,1)+G('pd',[[0,.3],[1,0]],0,0,0,1),
  `${shadow(158,116,104,8)}
  ${PA('M80 72L104 40L118 60L110 116H70Z','url(#pb)',O)}${PA('M118 60L168 62L182 116H110Z','url(#pc)',O)}${PA('M168 62L226 52L246 86L238 116H182Z','url(#pd)',O)}
  ${PA('M104 40L150 22L206 30L226 52L168 62L118 60Z','url(#pa)',O)}
  ${ln('M105 41L118.5 59L168 61L225 51.5',HI,1.6,'opacity=".9"')}${ln('M150 24L160 44L168 61',K,1.2,'opacity=".35"')}${ln('M132 62L140 86L134 114',K,1.2,'opacity=".4"')}${ln('M200 58L206 84L198 114',K,1.2,'opacity=".4"')}${ln('M92 58L96 84',K,1.2,'opacity=".35"')}
  ${PA('M224 104L240 92L262 96L270 116H222Z','url(#pc)',O)}${PA('M240 92L250 84L266 88L262 96Z','url(#pa)',o2)}
  ${PA('M40 116L48 100L62 98L72 116Z','url(#pb)',O)}${PA('M48 100L54 94L64 94L62 98Z','url(#pa)',o2)}`)},
cube(){return sv('a cube and a ball',140,G('pa',[[0,1],[1,.86]],0,0,1,1)+G('pb',[[0,.62],[1,.22]],0,0,0,1)+G('pc',[[0,.4],[1,.03]],0,0,0,1)+
  RU('pd',[[0,1],[.14,.92],[.4,.62],[.66,.34],[.9,.08],[1,.03]],222,48,80),
  `${shadow(104,124,62,7)}${shadow(222,124,42,6)}
  ${PA('M104 18L160 42L104 66L48 42Z','url(#pa)',O)}${PA('M48 42L104 66V126L48 102Z','url(#pb)',O)}${PA('M104 66L160 42V102L104 126Z','url(#pc)',O)}
  ${ln('M50 42.5L104 65.5L158 42.5',HI,1.4,'opacity=".8"')}
  <circle cx="222" cy="86" r="38" fill="url(#pd)" ${O}/>`)},
// ---------- Edge highlights: flat base colour, every edge in the first edge colour, upward edges in the next, corners dotted ----------
plate(){const e1=S[Math.min(1,n-1)],e2=S[Math.min(2,n-1)],rv=(x,y)=>`<circle cx="${x}" cy="${y}" r="5" fill="${S[0]}" ${o2}/>${ln(`M${x-2.8} ${y-.5}A3 3 0 0 1 ${x+.5} ${y-2.8}`,e1,1.6)}<circle cx="${x-1.6}" cy="${y-1.6}" r="1" fill="${HI}"/>`;
 return sv('an armour plate',134,'',`${PA('M36 12H264L288 36V102L264 124H36L12 102V36Z',S[0],O)}
  ${ln('M37 15.6H263L284.4 37V101L263 120.4H37L15.6 101V37Z',e1,3.6)}${ln('M15.6 74V37L37 15.6H263L284.4 37',e2,1.8)}
  ${PA('M66 40H234L250 54V84L234 98H66L50 84V54Z','#000','opacity=".22"')}${ln('M66 40H234L250 54V84L234 98H66L50 84V54Z',K,2)}
  ${ln('M64.5 36.6H235.5L253.4 52.5V85.5L235.5 101.4H64.5L46.6 85.5V52.5Z',e1,2.2)}${ln('M48.5 86L66 99.6H234L251.6 86',e2,1.4)}
  ${PA('M150 48L172 69L150 90L128 69Z',S[0],o2)}${ln('M150 51L169 69L150 87L131 69Z',e1,2.4)}${ln('M131 69L150 51L169 69',e2,1.4)}<circle cx="150" cy="51" r="1.6" fill="${HI}"/>
  ${[204,216,228].map(x=>`<rect x="${x}" y="56" width="6" height="26" rx="3" fill="#0d0d0d"/>${ln(`M${x+1} 83.5H${x+5}`,e1,1.6)}`).join('')}
  ${rv(32,36)}${rv(268,36)}${rv(32,100)}${rv(268,100)}
  ${[[37,15.6],[263,15.6],[15.6,37],[284.4,37],[66,36.6],[234,36.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="${HI}"/>`).join('')}`)},
pauldron(){const e1=S[Math.min(1,n-1)],e2=S[Math.min(2,n-1)],arch='M70 110C70 42 110 14 150 14C190 14 230 42 230 110',inn='M92 110C92 58 120 36 150 36C180 36 208 58 208 110';
 return sv('a pauldron',140,'',`${PA(arch+'Z',S[0],O)}${PA(inn+'Z','#000','opacity=".22"')}${ln(inn,K,2)}
  ${ln('M73.6 108C73.6 45 112 17.6 150 17.6C188 17.6 226.4 45 226.4 108',e1,3.6)}${ln('M73.6 108C73.6 45 112 17.6 150 17.6C188 17.6 226.4 45 226.4 108',e2,1.8,'pathLength="100" stroke-dasharray="46 100" stroke-dashoffset="-27"')}
  ${ln('M88.6 108C88.6 56 118 32.6 150 32.6C182 32.6 211.4 56 211.4 108',e1,2.2)}
  ${PA('M150 58L174 78V100L150 84L126 100V78Z',S[0],o2)}${ln('M150 61L171.5 79V95.5L150 81L128.5 95.5V79Z',e1,2.2)}${ln('M128.5 79L150 61L171.5 79',e2,1.4)}
  ${PA('M60 106H240V124Q150 136 60 124Z',S[0],O)}${ln('M63.6 109.6H236.4',e1,3.4)}${ln('M63.6 109.6H170',e2,1.6)}
  ${[82,116,150,184,218].map(x=>`<circle cx="${x}" cy="${118+(x===150?2:x===116||x===184?1.2:0)}" r="3.4" fill="${S[0]}" stroke="${K}" stroke-width="1.4"/><circle cx="${x-1}" cy="${117+(x===150?2:x===116||x===184?1.2:0)}" r="1.1" fill="${e2}"/>`).join('')}
  ${[[150,17.6],[150,61],[64,109.6],[150,32.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="${HI}"/>`).join('')}`)},
hull(){const e1=S[Math.min(1,n-1)],e2=S[Math.min(2,n-1)],chip=(x,y,s=1)=>`${PA(`M${x} ${y}l${5*s} ${-2*s} ${4*s} ${3*s} ${-3*s} ${4*s} ${-6*s} ${-1*s}z`,'#0d0d0d','opacity=".75"')}${ln(`M${x} ${y+1.5*s}l${6*s} ${1.5*s} ${3*s} ${-3.5*s}`,e1,1.1)}`;
 return sv('a tank hull panel',134,'',`${PA('M8 62L62 14H292V120H8Z',S[0],O)}
  ${ln('M62 16V118M196 16V118',K,2,'opacity=".6"')}${ln('M63.6 20V116M197.6 20V116',e1,1.3,'opacity=".9"')}
  ${ln('M11.6 62.8L63 17.6H288.4',e1,3.6)}${ln('M11.6 62.8L63 17.6H150',e2,1.8)}
  ${[0,1,2,3].map(i=>`<rect x="82" y="${40+i*14}" width="92" height="8" rx="2" fill="#0d0d0d"/>${ln(`M83 ${49.4+i*14}H173`,e1,1.6)}${ln(`M83 ${49.4+i*14}H120`,e2,.9)}`).join('')}
  <rect x="214" y="38" width="62" height="50" rx="10" fill="${S[0]}" ${o2}/><rect x="216.8" y="40.8" width="56.4" height="44.4" rx="8" fill="none" stroke="${e1}" stroke-width="2.4"/>
  ${ln('M217 62V49Q217 41 225 41H265Q273 41 273 49',e2,1.3)}<rect x="232" y="58" width="26" height="8" rx="4" fill="${S[0]}" ${o2}/>${ln('M235 59.6H255',e1,1.4)}
  ${[76,100,124,148,172,214,238,262,282].map(x=>`<circle cx="${x}" cy="27" r="2.6" fill="${S[0]}" stroke="${K}" stroke-width="1.2"/><circle cx="${x-.8}" cy="26.2" r="1" fill="${e1}"/>`).join('')}
  ${[76,100,124,148,172,214,238,262,282].map(x=>`<circle cx="${x}" cy="108" r="2.6" fill="${S[0]}" stroke="${K}" stroke-width="1.2"/><circle cx="${x-.8}" cy="107.2" r="1" fill="${e1}"/>`).join('')}
  ${chip(28,84)}${chip(42,100,.8)}${chip(110,100,.9)}${chip(204,96,.8)}${chip(30,60,.7)}${chip(246,100,.7)}
  ${[[63,17.6],[217.5,42],[11.6,62.8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="${HI}"/>`).join('')}`)},
// ---------- Glazes: smooth blends ----------
cloak(){const cl='M90 14Q150 34 210 14L238 128Q226 140 212 130Q198 142 184 131Q167 143 150 132Q133 143 116 131Q102 142 88 130Q74 140 62 128Z',k=5,tw=128/k,bw=176/k;
 return sv('a cloak',150,CP('pk',cl)+G('pa',[[0,.03],[.2,.3],[.42,.82],[.54,1],[.68,.66],[.86,.28],[1,.03]])+U('pb',[[0,'#000',0],[.55,'#000',0],[1,'#000',.38]],0,16,0,140)+
  U('pc',[[0,'#fff',.14],[.3,'#fff',0]],0,16,0,140)+G('pd',[[0,'#d8c9a0'],[.45,'#9c8858'],[1,'#4a3c22']],0,0,0,1),
  `<g clip-path="url(#pk)">${Array.from({length:k},(_,i)=>PA(`M${86+i*tw-.5} 8H${86+(i+1)*tw+.5}L${62+(i+1)*bw+.5} 146H${62+i*bw-.5}Z`,'url(#pa)')).join('')}
  <rect x="56" y="14" width="190" height="132" fill="url(#pb)"/><rect x="56" y="14" width="190" height="132" fill="url(#pc)"/></g>${PA(cl,'none',O)}
  ${ln('M96 18Q150 46 204 18','#4a3c22',3.4)}${ln('M96 18Q150 46 204 18','#d8c9a0',1.4,'stroke-dasharray="3 3"')}<circle cx="93" cy="16" r="8" fill="url(#pd)" ${O}/><circle cx="207" cy="16" r="8" fill="url(#pd)" ${O}/><circle cx="91" cy="14" r="2" fill="#fff" opacity=".8"/><circle cx="205" cy="14" r="2" fill="#fff" opacity=".8"/>`)},
panel(){return sv('a flat panel',124,G('pa',[[0,1],[.18,.9],[.5,.5],[.82,.14],[1,0]],0,0,1,1)+G('pb',[[0,.7],[1,.2]],0,0,1,1),
  `<rect x="30" y="8" width="240" height="108" rx="12" fill="url(#pb)" ${O}/><rect x="44" y="22" width="212" height="80" rx="6" fill="url(#pa)" ${o2}/>
  ${[[37,15],[263,15],[37,109],[263,109]].map(([x,y])=>rivet(x,y,2.8)).join('')}`)},
// ---------- Gems: dark towards the light, bright where light comes out the far side, hard glint ----------
round(){return A._gem('a round gem','M150 25A40 40 0 1 1 149.9 25Z',`<circle cx="150" cy="65" r="51" fill="url(#ps)" ${O}/>`,[150,65,40],132)},
tear(){return A._gem('a teardrop gem','M150 20Q188 66 180 90A31 31 0 0 1 120 90Q112 66 150 20Z',PA('M150 4Q200 62 191 92A42 42 0 0 1 109 92Q100 62 150 4Z','url(#ps)',O),[150,84,34],140)},
_gem(lab,d,setting,[x,y,r],h){const m=n-1;
 return sv(lab,h,CP('pk',d)+BL('pz',3)+G('ps',[[0,'#d8c9a0'],[.45,'#9c8858'],[1,'#4a3c22']],0,0,1,1)+
  U('pa',S.slice(0,m).map((c,i)=>[(i/Math.max(1,m-1)).toFixed(3),c]),x-r*.6,y-r*.8,x+r*.6,y+r*.8),
  `${setting}${PA(d,'url(#pa)')}<g clip-path="url(#pk)"><g filter="url(#pz)">${ln(`M${x-r*.2} ${y+r*.78}Q${x+r*.62} ${y+r*.62} ${x+r*.8} ${y-r*.1}`,S[m-1],r*.2,'opacity=".9"')}</g>
  ${ln(`M${x-r*.7} ${y+r*.1}Q${x-r*.62} ${y-r*.5} ${x-r*.1} ${y-r*.72}`,S[0],r*.16,'opacity=".5"')}</g>${PA(d,'none',O)}
  <ellipse cx="${x-r*.36}" cy="${y-r*.36}" rx="${r*.2}" ry="${r*.13}" fill="${HI}" transform="rotate(-40 ${x-r*.36} ${y-r*.36})"/><circle cx="${x-r*.56}" cy="${y-r*.08}" r="${r*.06}" fill="${HI}"/>
  <circle cx="${x+r*.44}" cy="${y+r*.46}" r="${r*.07}" fill="${HI}" opacity=".9"/>`)},
square(){const m=n-1,q=f=>cx(f*(m-1)/Math.max(1,m)),o='M118 16H182L206 40V90L182 114H118L94 90V40Z',t='M128 38H172L184 50V80L172 92H128L116 80V50Z';
 return sv('a square cut gem',130,G('ps',[[0,'#d8c9a0'],[.45,'#9c8858'],[1,'#4a3c22']],0,0,1,1)+U('pa',S.slice(0,m).map((c,i)=>[(i/Math.max(1,m-1)).toFixed(3),c]),120,42,180,88),
  `<rect x="84" y="6" width="132" height="118" rx="10" fill="url(#ps)" ${O}/>
  ${PA('M118 16H182L172 38H128Z',q(.05),o2)}${PA('M94 40L118 16L128 38L116 50Z',q(0),o2)}${PA('M94 40L116 50V80L94 90Z',q(.15),o2)}${PA('M182 16L206 40L184 50L172 38Z',q(.35),o2)}
  ${PA('M94 90L116 80L128 92L118 114Z',q(.5),o2)}${PA('M206 40V90L184 80V50Z',q(.75),o2)}${PA('M118 114L128 92H172L182 114Z',q(.9),o2)}${PA('M206 90L182 114L172 92L184 80Z',q(1),o2)}
  ${PA(t,'url(#pa)',o2)}${PA(o,'none',O)}
  ${PA('M124 52L138 42H150L124 62Z',HI)}<circle cx="176" cy="84" r="2.6" fill="${HI}" opacity=".9"/>${ln('M186 100L196 90',HI,1.6,'opacity=".8"')}`)},
// ---------- OSL: the lightest step is the source, the darkest is the surface the light does not reach ----------
_lit(id,x,y,r){return RU(id,S.slice().reverse().map((c,i)=>[(i/Math.max(1,n-1)).toFixed(3),c,i===n-1?0:1]),x,y,r)},
_wall(h,fl){let s='';for(let r=0,y=10;y<fl;r++,y+=18){s+=ln(`M6 ${y}H294`,K,1.2,'opacity=".3"');for(let x=(r%2?24:52);x<294;x+=56)s+=ln(`M${x} ${y}V${Math.min(fl,y+18)}`,K,1.2,'opacity=".3"')}return s},
glow(){return sv('a glowing orb lighting a wall',140,CP('pk','M18 4H282Q296 4 296 18V122Q296 136 282 136H18Q4 136 4 122V18Q4 4 18 4Z')+A._lit('pa',150,70,150)+BL('pz',5)+
  G('pl',[[0,0],[.55,0],[.8,.55],[1,.85]])+G('pr',[[0,.85],[.2,.55],[.45,0],[1,0]]),
  `<g clip-path="url(#pk)"><rect x="4" y="4" width="292" height="132" fill="${S[0]}"/><rect x="4" y="4" width="292" height="132" fill="url(#pa)"/>${A._wall(140,110)}
  <rect x="4" y="110" width="292" height="26" fill="#000" opacity=".25"/>${ln('M4 110H296',K,1.6,'opacity=".5"')}
  <rect x="40" y="18" width="30" height="118" fill="url(#pl)" ${o2}/><rect x="34" y="14" width="42" height="10" rx="2" fill="url(#pl)" ${o2}/>
  <rect x="230" y="18" width="30" height="118" fill="url(#pr)" ${o2}/><rect x="224" y="14" width="42" height="10" rx="2" fill="url(#pr)" ${o2}/>
  <circle cx="150" cy="70" r="22" fill="${cx(.92)}" filter="url(#pz)" opacity=".9"/></g>
  ${PA('M138 112L142 92H158L162 112Z','#0d0d0d',o2)}${ln('M141 94H159',cx(.85),1.6)}
  <circle cx="150" cy="70" r="14" fill="${HI}" stroke="${cx(.75)}" stroke-width="2.5"/>
  <rect x="4" y="4" width="292" height="132" rx="14" fill="none" ${O}/>`)},
lantern(){return sv('a lantern lighting a wall and a crate',140,CP('pk','M18 4H282Q296 4 296 18V122Q296 136 282 136H18Q4 136 4 122V18Q4 4 18 4Z')+A._lit('pa',104,58,170)+BL('pz',5)+
  G('pb',[[0,.9],[.5,.6],[1,.3]],0,0,1,.4)+G('pc',[[0,.7],[1,.25]],0,0,1,0)+G('pd',[[0,.35],[.6,.05],[1,0]]),
  `<g clip-path="url(#pk)"><rect x="4" y="4" width="292" height="132" fill="${S[0]}"/><rect x="4" y="4" width="292" height="132" fill="url(#pa)"/>${A._wall(140,112)}
  <rect x="4" y="112" width="292" height="24" fill="#000" opacity=".22"/>${ln('M4 112H296',K,1.6,'opacity=".5"')}
  ${PA('M176 74L196 64H250L232 74Z','url(#pc)',o2)}${PA('M176 74H232V126H176Z','url(#pb)',o2)}${PA('M232 74L250 64V114L232 126Z','url(#pd)',o2)}
  ${ln('M180 78L228 122M228 78L180 122',K,1.5,'opacity=".45"')}${ln('M177.4 76V124',cx(.95),1.6,'opacity=".9"')}
  ${PA('M232 126L250 114L296 122V136H240Z','#000','opacity=".4"')}
  <circle cx="104" cy="58" r="24" fill="${cx(.92)}" filter="url(#pz)" opacity=".85"/></g>
  ${ln('M104 4V24',K,2.5)}${ln('M94 34Q104 20 114 34',K,2.5)}
  ${PA('M88 40L94 32H114L120 40Z','#141414',o2)}<rect x="92" y="40" width="24" height="34" rx="2" fill="${HI}" ${o2}/>${ln('M100 40V74M108 40V74',K,1.6)}
  ${PA('M88 74H120L116 82H92Z','#141414',o2)}${ln('M90 75.6H118',cx(.85),1.4)}
  <rect x="4" y="4" width="292" height="132" rx="14" fill="none" ${O}/>`)},
lens(){const hd='M96 14Q150 0 204 14Q218 60 204 98L182 134H118L96 98Q82 60 96 14Z';
 return sv('glowing eye lenses',142,CP('pk',hd)+A._lit('pa',124,60,58)+A._lit('pb',176,60,58)+BL('pz',3),
  `${PA(hd,S[0])}<g clip-path="url(#pk)"><rect x="80" y="0" width="70" height="140" fill="url(#pa)"/><rect x="150" y="0" width="70" height="140" fill="url(#pb)"/>
  ${ln('M100 44Q150 26 200 44',K,2,'opacity=".6"')}${ln('M150 8V40',K,2,'opacity=".5"')}${ln('M118 134L124 98H176L182 134',K,2,'opacity=".6"')}
  ${[132,144,156,168].map(x=>`<rect x="${x-3}" y="104" width="6" height="22" rx="3" fill="#0d0d0d" opacity=".85"/>`).join('')}
  <g filter="url(#pz)">${PA('M108 54L142 50L140 68L112 66Z',cx(.9),'opacity=".8"')}${PA('M192 54L158 50L160 68L188 66Z',cx(.9),'opacity=".8"')}</g></g>
  ${PA('M110 55L141 51L139 67L113 65Z',HI,`stroke="${cx(.7)}" stroke-width="2" stroke-linejoin="round"`)}${PA('M190 55L159 51L161 67L187 65Z',HI,`stroke="${cx(.7)}" stroke-width="2" stroke-linejoin="round"`)}
  ${ln('M107 50L144 46',K,3)}${ln('M193 50L156 46',K,3)}${PA(hd,'none',O)}`)}
};
return A[v]&&v[0]!=='_'?A[v]():''}
// Small preview of the ramp on a shape that suits the technique.
function rampPrev(R,T){return rampArt(R,T)+objPick()}
function rampArt(R,T){const st=R.filter(x=>x.p),ob=prevObj(st);if(ob)return ob;
if(T.prev==='under'){const U=R.filter(x=>x.u&&x.p),F=underFin(R),pan=(x,id,rows,lab)=>rows.length?`<rect x="${x}" y="6" width="138" height="78" rx="8" fill="url(#${id})" stroke="#1b1b1b" stroke-width="3"/><text x="${x+69}" y="102" text-anchor="middle" font-size="13" fill="currentColor">${lab}</text>`:'';
 // Left: the value underpainting. Right: the same area once the glazes and final highlight are on.
 return`<svg class="blade" viewBox="0 0 300 110" role="img" aria-label="Underpainting next to the glazed result"><defs>${rampGrad('nbu',U)}${rampGrad('nbf',F)}</defs>${pan(6,'nbu',U,'Underpainting')}<text x="150" y="51" text-anchor="middle" font-size="18" fill="currentColor">›</text>${pan(156,'nbf',F,'After glazes')}</svg>`}
if(T.prev==='rocks'){const rk=[[50,66,42,30],[128,58,40,40],[206,70,36,26],[262,62,30,34]];
 // Rocks: the basecoat, then each drybrush layer catching less of the top of each rock.
 return`<svg class="blade" viewBox="0 0 300 110" role="img" aria-label="Ramp preview as drybrush layers on rocks"><defs>${rk.map(([x,y,rx,ry],i)=>`<clipPath id="nr${i}"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/></clipPath>`).join('')}</defs><rect x="4" y="80" width="292" height="26" rx="6" fill="${st[0].p.h}" stroke="#1b1b1b" stroke-width="3"/>${rk.map(([x,y,rx,ry],i)=>`<g clip-path="url(#nr${i})">${st.map((s,k)=>`<ellipse cx="${x-k*rx*.12}" cy="${y-k*ry*.42}" rx="${rx}" ry="${ry}" fill="${s.p.h}"/>`).join('')}</g><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="#1b1b1b" stroke-width="3"/>`).join('')}</svg>`}
const w=292/st.length;return`<svg class="blade" viewBox="0 0 300 60" role="img" aria-label="Ramp preview as stepped bands">${st.map((x,i)=>`<rect x="${(4+i*w).toFixed(1)}" y="6" width="${w.toFixed(1)}" height="48" fill="${x.p.h}"/>`).join('')}<rect x="4" y="6" width="292" height="48" rx="6" fill="none" stroke="#1b1b1b" stroke-width="3"/></svg>`}
function nmmPanel(b,R){const el=document.getElementById('sel'),T=TQN(),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const q=d=>d<6?['close','Close']:d<12?['fair','Fair']:['loose','Loose'],metal=!nmmOK(b),wt=x=>T.glaze&&x.w?`<span class="nwt" title="Paint to water">1:${x.w} 💧</span>`:'';
const rows=R.map((x,i)=>{const role=x.r+(x.tint?' · tinted':'');if(!x.p)return`<div class="nrow"><div class="nrole">${role}</div><span class="nsw" style="background:${labHex(x.t)}"></span><div class="nnm"><b>No ticked paint left</b><span>Tick more ranges to fill this step</span></div></div>`;
const [qc,ql]=x.pick?['pick','Your pick']:q(x.d);
return`<div class="nrow${x.base?' nbase':''}"><div class="nrole">${role}</div><span class="nsw" style="background:${x.p.h}" title="Paint"><i style="background:${labHex(x.t)}" title="Ramp target"></i></span><div class="nnm"><b>${star(x.p)}${esc(x.p.n)}</b><span>${esc(GL[x.p.g])}${x.p.c?' · '+esc(x.p.c):''}</span>${wt(x)}</div><span class="nq ${qc}" title="${x.pick?'':'ΔE '+x.d.toFixed(1)+' from the ramp target'}">${ql}</span>${x.alt?`<button type="button" class="nsk" data-sk="${i}" title="Try the next nearest paint" aria-label="Swap ${esc(x.r)} paint">↻</button>`:'<span></span>'}</div>`}).join('');
el.innerHTML=`<b>${esc(T.full)} ramp from:</b> <div class="chips"><span class="chip"><i style="background:${b.h}"></i>${star(b)}${esc(b.n)} <span style="color:var(--mut)">${esc(b.c)}</span></span></div>`+
(metal?'<p class="s">That\'s a metallic or effect paint, so the base uses the nearest opaque paint instead.</p>':'')+
`<div class="nrows">${rows}</div><div id="nPrev">${rampPrev(R,T)}</div>
<p class="s">Small dot = the colour the ramp asks for; big dot = the nearest of your ticked paints (${ONLY_MINE?'from your collection only':'tick more ranges for closer matches'}). Close / Fair / Loose = ΔE under 6, under 12, above that. ↻ swaps a step for the next nearest paint.${T.glaze?' 1:4 💧 = one part paint to four parts water; thinner glazes need more coats.':''} Swatches are estimates, so check the ramp on the model.</p>
<div class="row"><button class="btn" type="button" id="nmmTut">Save as recipe</button></div>`;
el.querySelector('#nPrev').onclick=e=>{const k=e.target.closest('[data-nv]');if(!k)return;NMO.v[NMO.q]=k.dataset.nv;nmmSave();e.currentTarget.innerHTML=rampPrev(R,T)};
el.querySelectorAll('[data-sk]').forEach(e=>e.onclick=()=>{const i=+e.dataset.sk;nmmSkip[i]=(nmmSkip[i]||0)+1;draw()});
document.getElementById('nmmTut').onclick=()=>{NMM_DRAFT={kind:'recipe',title:T.name+' '+b.n.trim(),summary:T.sum,
 steps:R.filter(x=>x.p).map(x=>({title:x.r,text:T.tip[x.r]||'',image:'',mix:[{k:x.p.k,parts:1}].concat(T.glaze&&x.w?[{k:'water',parts:x.w}]:[])}))};location.hash='#/new'}}
function nmmUI(){try{schUI()}catch(e){}const n=MODE==='nmm',T=TQN(),ss=T.steps||['5','7'];[['mCol','col'],['mNmm','nmm'],['mMix','mix']].forEach(([id,m])=>{const e=document.getElementById(id);e.classList.toggle('pri',MODE===m);e.setAttribute('aria-pressed',MODE===m)});document.getElementById('nmmOpt').hidden=!n;
document.getElementById('nTech').value=NMO.q;const o=document.getElementById('nSteps').options;o[0].textContent=ss[0];o[1].textContent=ss[1];
document.getElementById('nSteps').value=String(NMO.n);document.getElementById('nTint').checked=NMO.t;document.getElementById('nTintL').hidden=!T.tint;document.getElementById('nTintT').textContent=T.tint;
const gl=document.getElementById('nGuide'),gs=TQ_GUIDE[NMO.q];gl.hidden=!gs;if(gs){gl.href='guides/'+gs;gl.textContent=T.name+' guide →'}}
function setMode(m){MODE=m;nmmSave();nmmUI();nmmSkip=[];ACT=null;if(m==='nmm'||m==='mix')NB=NB&&!CH.includes(NB)&&!sel?NB:sel;else if(NB&&!CH.includes(NB)){const p=NB;NB=null;draw();neutralShow(p);return}draw()}
document.getElementById('nTech').innerHTML=TQK.map(k=>`<option value="${k}">${TQ[k].full}</option>`).join('');
document.getElementById('mCol').onclick=()=>setMode('col');document.getElementById('mNmm').onclick=()=>setMode('nmm');document.getElementById('mMix').onclick=()=>setMode('mix');
document.getElementById('nTech').onchange=e=>{NMO.q=TQ[e.target.value]?e.target.value:'nmm';nmmSkip=[];nmmSave();nmmUI();draw()};
document.getElementById('nSteps').onchange=e=>{NMO.n=+e.target.value;nmmSkip=[];nmmSave();draw()};
document.getElementById('nTint').onchange=e=>{NMO.t=e.target.checked;nmmSkip=[];nmmSave();draw()};
nmmUI();
// Centre disc: two shade-matched ramps laid along the complement→selected axis. The complements are one ramp and the selected paint plus its
// neighbours the other; each runs evenly dark to light, and at each shade its colour is the paints of about that shade averaged (the selected
// paint counts triple), so muted and bright paints of the same shade blend instead of striping. The two ramps meet where their shades are closest.
// Colours are mixed in OKLab (like blended paint, not muddy RGB) and big colour changes get more room on the disc.
const okLab=h=>{const n=parseInt(h.slice(1),16),l=[n>>16,n>>8&255,n&255].map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92}),
 L=Math.cbrt(.4122214708*l[0]+.5363325363*l[1]+.0514459929*l[2]),M=Math.cbrt(.2119034982*l[0]+.6806995451*l[1]+.1073969566*l[2]),S=Math.cbrt(.0883024619*l[0]+.2817188376*l[1]+.6299787005*l[2]);
 return[.2104542553*L+.793617785*M-.0040720468*S,1.9779984951*L-2.428592205*M+.4505937099*S,.0259040371*L+.7827717662*M-.808675766*S]};
const okHex=([L,a,b])=>{const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return'#'+[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>{v=Math.max(0,Math.min(1,v));v=v>.0031308?1.055*v**(1/2.4)-.055:12.92*v;return Math.round(v*255).toString(16).padStart(2,'0')}).join('')};
const okD=(a,b,w)=>Math.hypot(w*(a[0]-b[0]),a[1]-b[1],a[2]-b[2]);
const DISC_X=.25;
function discStops(sel,comp,ana){
 const ramp=g=>{const q=g.map(p=>[okLab(p.h),p===sel?3:1]);if(!q.length)return[];const Ls=q.map(x=>x[0][0]),lo=Math.min(...Ls),hi=Math.max(...Ls),sg=Math.max(.04,(hi-lo)/5),n=Math.round((hi-lo)/.03)+1,out=[];
  for(let i=0;i<n;i++){const L=n<2?lo:lo+(hi-lo)*i/(n-1);let W=0,A=0,B=0;q.forEach(([c,w])=>{w*=Math.exp(-.5*((c[0]-L)/sg)**2);W+=w;A+=w*c[1];B+=w*c[2]});out.push([L,A/W,B/W])}return out};
 const C=ramp(comp),F=ramp([sel,...ana]);let pick=[[],F];
 if(C.length){let bd=1e9;for(const c of[C,[...C].reverse()])for(const f of[F,[...F].reverse()]){const d=Math.abs(c[c.length-1][0]-f[0][0]);if(d<bd){bd=d;pick=[c,f]}}}
 // The crossover from the complements to the selected side always gets DISC_X of the disc, so it reads as a blend rather than a line.
 const seq=[...pick[0],...pick[1]],jx=pick[0].length,g=[];for(let i=1;i<seq.length;i++)g.push(.04+okD(seq[i-1],seq[i],1.5));
 if(jx&&g.length>1){const o=g.reduce((s,v,i)=>i===jx-1?s:s+v,0);g.forEach((v,i)=>g[i]=i===jx-1?DISC_X:v/o*(1-DISC_X))}
 const d=[0];g.forEach(v=>d.push(d[d.length-1]+v));const off=d.map(v=>seq.length<2?0:v/d[d.length-1]),out=[];
 seq.forEach((c,i)=>{out.push([okHex(c),off[i]]);if(i<seq.length-1){const K=i===jx-1?16:6;for(let k=1;k<K;k++){const t=k/K;out.push([okHex(c.map((v,j)=>v+(seq[i+1][j]-v)*t)),off[i]+(off[i+1]-off[i])*t])}}});
 return out}
const svg=document.getElementById('w');let sel=null;
/* ---------- Colour harmony schemes (Colours mode) ----------
   The Scheme button picks how the wheel answers a tapped paint. Complementary is the original view (complements + neighbours).
   The others mark a hue band for each colour in the scheme (offset from the paint's hue, ± the hue width), join the bands with
   the scheme's shape, and suggest one paint per role: closest hue, then closest lightness to the paint you picked.
   The centre disc shows those picks in rough proportion (60/30/10 style); Monochrome shows a dark-to-light ramp instead. */
const HSC={
 comp:{n:'Complementary',offs:[0,180],why:'Opposites on the wheel. The strongest contrast you can get.'},
 split:{n:'Split complementary',offs:[0,150,210],roles:['Main','Split A','Split B'],prop:[60,25,15],
  why:'The main colour plus the two hues either side of its opposite.',
  tip:'Softer than straight complements and easier to balance. Put one split on cloth, the other on small details.'},
 ana:{n:'Analogous',offs:[-30,0,30],roles:['Neighbour A','Main','Neighbour B'],prop:[25,60,15],
  why:'Neighbours on the wheel. Calm and natural, low contrast.',
  tip:'Good for smooth glazes and transitions. Shade toward one neighbour and highlight toward the other for a richer ramp.'},
 triad:{n:'Triadic',offs:[0,120,240],roles:['Main','Triad 2','Triad 3'],prop:[60,30,10],
  why:'Three hues spaced evenly around the wheel. Bright and balanced.',
  tip:'Let one colour dominate. Mute the second with a grey, and keep the third for small accents so the model doesn\'t look like a toy.'},
 rect:{n:'Rectangle',offs:[0,60,180,240],roles:['Main','Partner','Complement','Partner\'s complement'],prop:[45,25,20,10],
  why:'Two complementary pairs, 60° apart. Lots of colour to work with.',
  tip:'Pick one warm pair member to lead. Works well for squads where each unit role gets its own colour.'},
 square:{n:'Square',offs:[0,90,180,270],roles:['Main','Quarter','Complement','Three-quarter'],prop:[45,25,20,10],
  why:'Four hues evenly spaced. The busiest scheme.',
  tip:'Hard to keep calm on one figure. Try it across a diorama or warband instead, one hue per area.'},
 mono:{n:'Monochrome',offs:[0],roles:['Main'],prop:[100],
  why:'One hue, many values. Every paint here sits close to the main hue, darkest to lightest.',
  tip:'Contrast comes from value alone, so push the darkest shadows and brightest highlights further than feels natural. A neutral grey or a single complement dot keeps it from going flat.'}};
let SCH='comp',HTOL=20;try{const o=JSON.parse(localStorage.getItem('pd-scheme'));if(o){if(HSC[o.s])SCH=o.s;if(o.t>=10&&o.t<=30)HTOL=+o.t}}catch(e){}
const schSave=()=>{try{localStorage.setItem('pd-scheme',JSON.stringify({s:SCH,t:HTOL}))}catch(e){}};
const hAng=h=>U(h)*Math.PI/180-Math.PI/2;
function harmony(b){const sc=HSC[SCH],tol=SCH==='mono'?Math.min(HTOL,14):HTOL,mine=p=>!ONLY_MINE||own(p);
const groups=sc.offs.map((o,k)=>{const t=(b.H+o+360)%360,main=o===0;let l=CH.filter(p=>p!==b&&hd(p.H,t)<=tol);const band=[b,...l].filter(p=>hd(p.H,t)<=tol||p===b);
if(SCH==='mono')l=[b,...l].sort((x,y)=>x.lab[0]-y.lab[0]).slice(0,12);
else{l.sort((x,y)=>hd(x.H,t)-hd(y.H,t));l=main?[b,...l.slice(0,4)]:l.slice(0,6)}
const sc2=p=>hd(p.H,t)+28*Math.abs(p.L-b.L)+(mine(p)?0:1000),pk=main?b:[...l].sort((x,y)=>sc2(x)-sc2(y))[0]||null;
return{t,off:o,role:sc.roles[k],l,pk,prop:sc.prop[k],bl:pk&&SCH!=='mono'?hBlend(pk,band.filter(p=>p===pk||nmmOK(p)),mine):null}});return{sc,groups,tol}}
// A 3-step blend for one scheme colour: the pick as the mid tone, plus the paints in its hue band closest to ~18 Lab L darker and lighter
// (at least 8 apart, owned paints first when 'Only my paints' is on). A step stays empty when the band has nothing dark or light enough.
function hBlend(m,band,mine){const L=m.lab[0],f=(dir)=>{const c=band.filter(p=>p!==m&&(dir<0?p.lab[0]<=L-8:p.lab[0]>=L+8));if(!c.length)return null;
 const tg=L+dir*18,sc=p=>Math.abs(p.lab[0]-tg)+.5*hd(p.H,m.H)+(mine(p)?0:1000);return c.sort((x,y)=>sc(x)-sc(y))[0]};return[f(-1),m,f(1)]}
// Opens Blends with the colour's 3-step blend fixed in place (shadow and highlight count as the painter's own picks).
function hOpenBlend(bl){const[sh,m,hi]=bl;sel=m;NB=m;BL={b:m,s:[...(sh?[{p:sh,sp:sh,m:0,man:1}]:[]),{p:m,base:1},...(hi?[{p:hi,sp:hi,m:0,man:1}]:[])]};setMode('mix');document.getElementById('w').scrollIntoView({block:'start'})}
function hArc(t,tol,r0,r1){const a0=hAng(t-tol),a1=hAng(t+tol),L=tol*2>180?1:0;
return`M${CX+r0*Math.cos(a0)} ${CY+r0*Math.sin(a0)}L${CX+r1*Math.cos(a0)} ${CY+r1*Math.sin(a0)}A${r1} ${r1} 0 ${L} 1 ${CX+r1*Math.cos(a1)} ${CY+r1*Math.sin(a1)}L${CX+r0*Math.cos(a1)} ${CY+r0*Math.sin(a1)}A${r0} ${r0} 0 ${L} 0 ${CX+r0*Math.cos(a0)} ${CY+r0*Math.sin(a0)}Z`}
// Bands and the joining shape go under the dots.
function hUnder(HS,b){const {groups,tol}=HS;let s='';
groups.forEach(g=>s+=`<path d="${hArc(g.t,tol,112,470)}" fill="currentColor" opacity="${g.off===0?.09:.06}" stroke="currentColor" stroke-opacity=".45" stroke-width="2" stroke-dasharray="8 6"/>`);
const V=groups.map(g=>[CX+300*Math.cos(hAng(g.t)),CY+300*Math.sin(hAng(g.t)),g.t]);
if(V.length===2)s+=`<line x1="${V[0][0]}" y1="${V[0][1]}" x2="${V[1][0]}" y2="${V[1][1]}" stroke="currentColor" stroke-width="4" opacity=".7"/>`;
else if(V.length>2){const o=SCH==='ana'?V:[...V].sort((x,y)=>x[2]-y[2]);s+=`<${SCH==='ana'?'polyline':'polygon'} points="${o.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' ')}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" opacity=".7"/>`}
else{const a=hAng(b.H);s+=`<line x1="${CX+112*Math.cos(a)}" y1="${CY+112*Math.sin(a)}" x2="${CX+470*Math.cos(a)}" y2="${CY+470*Math.sin(a)}" stroke="currentColor" stroke-width="4" opacity=".6" stroke-dasharray="2 8" stroke-linecap="round"/>`}
return s}
// Numbered role badges and the palette disc go over the dots (they don't take taps).
function hOver(HS){const {groups}=HS;let s='<g pointer-events="none">';
if(SCH!=='mono')groups.forEach((g,k)=>{const a=hAng(g.t),x=CX+300*Math.cos(a),y=CY+300*Math.sin(a);
 s+=`<circle cx="${x}" cy="${y}" r="13" fill="${g.pk?g.pk.h:'#888'}" stroke="currentColor" stroke-width="3"/><text x="${x}" y="${y+4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="${g.pk&&g.pk.lum>.55?'#111':'#fff'}">${k+1}</text>`});
if(SCH==='mono'){const K=groups[0].l.map(p=>okLab(p.h)),lo=Math.min(...K.map(k=>k[0])),hi=Math.max(...K.map(k=>k[0])),sd=Math.max(.02,(hi-lo)/5),M=7,
 st=Array.from({length:M},(_,i)=>{const T=lo+(hi-lo)*i/(M-1);let w=0,c=[0,0,0];K.forEach(k=>{const x=Math.exp(-(((k[0]-T)/sd)**2));w+=x;c=c.map((v,j)=>v+k[j]*x)});return okHex(c.map(v=>v/w))});
 s+=`<defs><radialGradient id="hmg">${st.map((h,k)=>`<stop offset="${(k/(M-1)).toFixed(3)}" stop-color="${h}"/>`).join('')}</radialGradient></defs><circle cx="${CX}" cy="${CY}" r="96" fill="url(#hmg)"/>`}
else s+=hDisc(groups.filter(g=>g.pk));
return s+`<circle cx="${CX}" cy="${CY}" r="96" fill="none" stroke="#1b1b1b" stroke-width="3"/><title>${HSC[SCH].n} palette</title></g>`}
// Centre disc for a scheme: the picks blend smoothly round the disc (OKLab), each holding its own colour across the middle
// of its share (shares = the palette strip's rough proportions) and blending into its neighbours over the rest.
function hDisc(gp){if(!gp.length)return'';if(gp.length===1)return`<circle cx="${CX}" cy="${CY}" r="96" fill="${gp[0].pk.h}"/>`;
const tot=gp.reduce((a,g)=>a+g.prop,0),N=180,HOLD=.45;let acc=0;const C=gp.map(g=>{const w=g.prop/tot*360,c={a:acc+w/2,w,k:okLab(g.pk.h)};acc+=w;return c});
const col=f=>{for(let i=0;i<C.length;i++){const A=C[i],B=C[(i+1)%C.length],a0=A.a,a1=B.a+(i===C.length-1?360:0);let x=f;if(x<a0)x+=360;if(x>=a0&&x<a1){
 const h0=a0+A.w*HOLD/2,h1=a1-B.w*HOLD/2,u=x<=h0?0:x>=h1?1:(x-h0)/(h1-h0),e=u*u*(3-2*u);return okHex(A.k.map((v,j)=>v+(B.k[j]-v)*e))}}return gp[0].pk.h};
let s='';for(let i=0;i<N;i++){const f0=i*360/N,f1=(i+1)*360/N+.6,A=(f0-90)*Math.PI/180,B=(f1-90)*Math.PI/180,c=col(f0+180/N);
 s+=`<path d="M${CX} ${CY}L${(CX+96*Math.cos(A)).toFixed(2)} ${(CY+96*Math.sin(A)).toFixed(2)}A96 96 0 0 1 ${(CX+96*Math.cos(B)).toFixed(2)} ${(CY+96*Math.sin(B)).toFixed(2)}Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`}return s}
function hChip(p,pk){return`<button type="button" class="chip hch${pk?' hsel':''}" data-i="${p.i}" title="Make this the main colour"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></button>`}
function hPanel(HS,b){const {sc,groups}=HS;let h=`<b>Selected:</b> <div class="chips"><span class="chip"><i style="background:${b.h}"></i>${star(b)}${b.n} <span style="color:var(--mut)">${b.c}</span></span></div><h2>${sc.n}</h2><p class="s">${sc.why}</p>`;
if(SCH==='mono'){const l=groups[0].l;h+=`<h3 class="hh">Value ramp <small>darkest to lightest, ${l.length} paint${l.length===1?'':'s'}</small></h3><div class="hramp">${l.map(p=>`<button type="button" data-i="${p.i}" style="background:${p.h}" title="${p.n} (${p.c})" aria-label="${p.n}"></button>`).join('')}</div><div class="chips">${l.map(p=>hChip(p,p===b)).join('')}</div>`}
else{const gp=groups.filter(g=>g.pk),tot=gp.reduce((a,g)=>a+g.prop,0);
h+=`<h3 class="hh">Suggested palette <small>rough share of the model</small></h3><div class="hpal">${gp.map(g=>`<div style="flex:${g.prop};background:${g.pk.h};color:${g.pk.lum>.55?'#111':'#fff'}">${Math.round(g.prop/tot*100)}%</div>`).join('')}</div>
<h3 class="hh">Blend for each colour <small>shadow, mid tone, highlight</small></h3><div class="hbl">${groups.map((g,k)=>`<div class="hbr"><b class="hbn">${k+1}. ${g.role}</b>${g.bl?`<span class="hbs">${g.bl.map((p,j)=>p?`<button type="button" class="hch hbsw" data-i="${p.i}" title="${['Shadow','Mid tone','Highlight'][j]}: ${p.n} (${p.c})"><i style="background:${p.h}"></i><span>${star(p)}${p.n}</span></button>`:`<span class="hbsw hbx" title="Nothing ${j?'lighter':'darker'} in this hue band"><i></i><span>${j?'no lighter paint':'no darker paint'}</span></span>`).join('')}</span><button type="button" class="btn hbo" data-g="${k}" title="Open this blend in Blends mode to swap, add or mix steps">Open in Blends</button>`:'<span class="s">No paint on the wheel for this colour.</span>'}</div>`).join('')}</div>`;
groups.forEach((g,k)=>{const d=g.off>180?g.off-360:g.off,oth=g.off===0?g.l.filter(p=>p!==b):g.l;
h+=`<h3 class="hh">${k+1}. ${g.role} <small>${Math.round(g.t)}° hue${d?`, ${d>0?'+':''}${d}°`:''}</small></h3><div class="chips">${
 g.off===0?(oth.length?oth.map(p=>hChip(p,false)).join(''):'<span class="s">No other paints this close in hue.</span>')
 :(g.l.length?g.l.map(p=>hChip(p,p===g.pk)).join(''):`<span class="s">Nothing on the wheel within ±${HS.tol}°. Widen the hue band in Scheme, tick more ranges, or mix one.</span>`)}</div>`})}
h+=`<p class="s"><b>Painting tip.</b> ${sc.tip}</p>`;HBL=groups.map(g=>g.bl);return h}
let HBL=[];
function hIcon(offs){const pts=offs.map(o=>[12+8*Math.cos((o-60)*Math.PI/180),12+8*Math.sin((o-60)*Math.PI/180)]);
let s=`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/>`;
if(pts.length===1)s+=`<line x1="12" y1="12" x2="${pts[0][0]}" y2="${pts[0][1]}" stroke="currentColor" stroke-width="2"/>`;
else if(pts.length===2)s+=`<line x1="${pts[0][0]}" y1="${pts[0][1]}" x2="${pts[1][0]}" y2="${pts[1][1]}" stroke="currentColor" stroke-width="2"/>`;
else s+=`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
const C=['#f2545b','#3a86ff','#ffd23f','#2ec4b6'];pts.forEach((p,i)=>s+=`<circle cx="${p[0]}" cy="${p[1]}" r="2.8" fill="${C[i]}" stroke="#1b1b1b" stroke-width="1"/>`);return s+'</svg>'}
function schUI(){const b=document.getElementById('hSch');b.innerHTML=hIcon(HSC[SCH].offs)+'Scheme: '+HSC[SCH].n.replace(' complementary','');b.hidden=MODE!=='col'}
(()=>{const d=document.getElementById('schDlg'),t=document.getElementById('schTol'),tv=document.getElementById('schTolV');
document.getElementById('schList').innerHTML=Object.keys(HSC).map(k=>`<label class="tyr"><input type="radio" name="sch" value="${k}"${k===SCH?' checked':''}>${hIcon(HSC[k].offs)}<span><b>${HSC[k].n}</b><small>${HSC[k].why}</small></span></label>`).join('');
t.value=HTOL;tv.textContent='±'+HTOL+'°';
document.getElementById('hSch').onclick=()=>d.showModal();
d.addEventListener('change',e=>{if(e.target.name==='sch'){SCH=e.target.value;schUI()}schSave();draw()});
t.oninput=()=>{HTOL=+t.value;tv.textContent='±'+HTOL+'°';schSave();draw()};
document.getElementById('sel').addEventListener('click',e=>{const o=e.target.closest('.hbo');if(o){const bl=HBL[+o.dataset.g];if(bl)hOpenBlend(bl);return}const c=e.target.closest('.hch,.hramp button');if(!c)return;const p=P[+c.dataset.i];if(p&&CH.includes(p)){sel=p;NB=p;draw()}})})();
schUI();

function draw(){let s='';OFF=[];
for(let h=0;h<360;h+=10){const a0=U(h-5)*Math.PI/180-Math.PI/2,a1=U(h+5)*Math.PI/180-Math.PI/2,R=480,r=110;
s+=`<path d="M${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}L${CX+R*Math.cos(a0)} ${CY+R*Math.sin(a0)}A${R} ${R} 0 0 1 ${CX+R*Math.cos(a1)} ${CY+R*Math.sin(a1)}L${CX+r*Math.cos(a1)} ${CY+r*Math.sin(a1)}A${r} ${r} 0 0 0 ${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}Z" fill="hsl(${h},65%,50%)" opacity=".16"/>`}
[.2,.5,.8].forEach(l=>s+=`<circle cx="${CX}" cy="${CY}" r="${140+l*300}" fill="none" stroke="currentColor" opacity=".18" stroke-dasharray="4 6"/>`);
if(!sel)s+=`<text x="${CX}" y="${CY-8}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">darker ←</text><text x="${CX}" y="${CY+14}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">→ lighter (rim)</text>`;
const hn={0:'Red',30:'Orange',60:'Yellow',120:'Green',180:'Cyan',240:'Blue',280:'Violet',320:'Magenta'};
for(const h in hn){const a=U(+h)*Math.PI/180-Math.PI/2;s+=`<text x="${CX+492*Math.cos(a)}" y="${CY+492*Math.sin(a)+4}" text-anchor="middle" font-size="13" fill="currentColor" opacity=".6">${hn[h]}</text>`}
let comp=[],ana=[];const NBp=MODE==='nmm'?NB:null,R=NBp?nmmRamp(NBp):null,MB=MODE==='mix'?NB:null;
if(MB&&(!BL||BL.b!==MB))blendSeed(MB);if(MB)blendAuto();const MX=MB?BL.s.map(x=>x.p):null;
const HS=sel&&!R&&!MX&&MODE==='col'&&SCH!=='comp'?harmony(sel):null,HIN=HS?new Set(HS.groups.flatMap(g=>g.l)):null,HPK=HS&&SCH!=='mono'?new Set(HS.groups.map(g=>g.pk).filter(Boolean)):new Set();
if(HS)s+=hUnder(HS,sel);
if(sel&&!R&&!MX&&!HS){const th=(sel.H+180)%360;const cands=CH.filter(p=>p!==sel);comp=cands.filter(p=>hd(p.H,th)<=HTOL).sort((a,b)=>hd(a.H,th)-hd(b.H,th)).slice(0,6);
ana=cands.filter(p=>hd(p.H,sel.H)<=25).sort((a,b)=>hd(a.H,sel.H)-hd(b.H,sel.H)).slice(0,6);
const a=th*Math.PI/180-Math.PI/2,b=sel.H*Math.PI/180-Math.PI/2;
s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${CX+440*Math.cos(U(th)*Math.PI/180-Math.PI/2)}" y2="${CY+440*Math.sin(U(th)*Math.PI/180-Math.PI/2)}" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" opacity=".55"/>`}
if(R)s+=nmmWheel(R);
if(MX)s+=blendWheel();
if(sel&&!R&&!MX&&!HS){const ax=sel.H*Math.PI/180-Math.PI/2,ux=Math.cos(ax)/2,uy=Math.sin(ax)/2;
s+=`<defs><linearGradient id="cg" x1="${.5-ux}" y1="${.5-uy}" x2="${.5+ux}" y2="${.5+uy}">${discStops(sel,comp,ana).map(([h,o])=>`<stop offset="${o.toFixed(4)}" stop-color="${h}"/>`).join('')}</linearGradient></defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#cg)" stroke="#1b1b1b" stroke-width="3"><title>Complements → ${sel.n} → neighbours</title></circle>`}
const show=document.getElementById('lab').checked;const R0=CH.length>140?20:26,kk=R0/26;
CH.forEach(p=>{const on=MX?ACT||MX.includes(p):R?R.some(x=>x.p===p):HS?HIN.has(p):!sel||p===sel||comp.includes(p)||ana.includes(p);const ls=lines(p.n),tc=p.lum>.55?'#111':'#fff';
const st=p.mix?'stroke="#1b1b1b" stroke-dasharray="7 4"':(p.g==='W'||p.g==='s'||p.c.endsWith(' Wash'))?'stroke="#fff" stroke-dasharray="3 3"':p.g==='F'||p.g==='!'?`stroke="${p.h}" style="filter:drop-shadow(0 0 6px ${p.h})"`:'stroke="#1b1b1b"';
const sw=p===sel?5:comp.includes(p)?4:2;
s+=`<g class="dot" data-i="${p.i}" opacity="${on?1:.2}"><circle cx="${p.x}" cy="${p.y}" r="${R0}" fill="${p.h}" ${st} stroke-width="${p===sel?4:2}"${comp.includes(p)||(R&&p!==sel&&R.some(x=>x.p===p))||(MX&&p!==sel&&MX.includes(p))||(HPK.has(p)&&p!==sel)?' stroke="#fff" stroke-width="4"':''}/>`+
(show?`<g transform="translate(${p.x} ${p.y}) scale(${kk}) translate(${-p.x} ${-p.y})">`+ls.map((t,i)=>`<text x="${p.x}" y="${p.y-(ls.length*8-4)/1+i*8.5-2+4}" font-size="7.5" fill="${tc}">${t}</text>`).join('')+`<text x="${p.x}" y="${p.y+20-(ls.length>1?1:-3)-(ls.length>1?0:0)}" font-size="6.5" fill="${tc}" opacity=".8">${p.c}</text></g>`:'')+`<title>${p.n} (${p.c})</title></g>`});
OFF.forEach(([p,x,y])=>{const ls=lines(p.n),tc=p.lum>.55?'#111':'#fff';s+=`<g class="dot ndot" data-i="${p.i}"><circle cx="${x}" cy="${y}" r="${R0+3}" fill="none" stroke="#1b1b1b" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${R0}" fill="${p.h}" stroke="#fff" stroke-width="4" stroke-dasharray="5 4"/>`+
 (show?`<g transform="translate(${x} ${y}) scale(${kk}) translate(${-x} ${-y})">`+ls.map((t,i)=>`<text x="${x}" y="${y-(ls.length*8-4)+i*8.5+2}" font-size="7.5" fill="${tc}">${t}</text>`).join('')+`<text x="${x}" y="${y+20-(ls.length>1?1:-3)}" font-size="6.5" fill="${tc}" opacity=".8">${p.c}</text></g>`:'')+`<title>${p.n} (${p.c}) · a grey or white from the Neutrals list</title></g>`});
if(HS)s+=hOver(HS);
svg.innerHTML=s;
svg.querySelectorAll('.dot').forEach(e=>e.onclick=()=>e.classList.contains('ndot')?neutralShow(P[+e.dataset.i]):pick(P[+e.dataset.i]));
neuMark(MX?'blend':'ramp');
const chip=p=>`<span class="chip"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`;
if(R){nmmPanel(NBp,R);return}
if(MX){blendPanel();return}
if(MODE==='nmm'){document.getElementById('sel').innerHTML='<b>'+TQN().hint+'</b>';return}
if(HS){document.getElementById('sel').innerHTML=hPanel(HS,sel)+matchHTML(sel);wireMatch(sel);window.pdRecipesFor&&pdRecipesFor(sel);return}
if(MODE==='mix'){document.getElementById('sel').innerHTML='<b>Tap a paint to start a blend. It starts with the wheel\'s own complements and neighbours, then you swap in your own.</b>';return}
document.getElementById('sel').innerHTML=sel?`<b>Selected:</b> <div class="chips">${chip(sel)}</div><h2>Complements (opposite on the wheel)</h2><div class="chips">${comp.length?comp.map(chip).join(''):'<span class="s">Neutral: no true opposite. Try a cool or warm grey.</span>'}</div><h2>Analogous neighbors</h2><div class="chips">${ana.map(chip).join('')}</div><p class="s">Underpainting tip: complements make strong shadow or contrast underlayers and tone down saturation; analogous neighbors make smooth glazes and transitions.</p>`+matchHTML(sel):SEL0;if(sel){wireMatch(sel);window.pdRecipesFor&&pdRecipesFor(sel)}}
function pick(p){if(MODE==='mix'&&blendFill(p))return;sel=p===sel?null:p;NB=sel;nmmSkip=[];draw()}
document.getElementById('lab').onchange=draw;
function renderNeu(){document.getElementById('neu').innerHTML=NE.map((p,i)=>`<span class="chip" data-i="${p.i}"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`).join('');
document.querySelectorAll('#neu .chip').forEach(e=>e.onclick=()=>neutralShow(P[+e.dataset.i]));neuMark()}
// Marks the neutrals list chips that the ramp or blend on the wheel uses, and counts them in the panel header.
function neuMark(w){const ins=new Set(OFF.map(x=>x[0].i));let n=0;document.querySelectorAll('#neu .chip').forEach(e=>{const h=ins.has(+e.dataset.i);e.classList.toggle('inr',h);n+=h});
document.getElementById('neuN').textContent=(NE.length===1?'(1 paint':`(${NE.length} paints`)+(n?` · ${n} in this ${w||'ramp'})`:')')}
function tyUI(){const b=document.getElementById('hTy'),n=HIDE_T.size;b.textContent=n?`Paint types (${n} hidden)`:'Paint types';b.setAttribute('aria-pressed',n>0)}
(()=>{const d=document.getElementById('tyDlg'),cnt={};P.forEach(p=>{const t=paintType(p);cnt[t]=(cnt[t]||0)+1});
document.getElementById('tyList').innerHTML=`<label class="tyr"><input type="checkbox" checked disabled><span><b>Base & layer paints</b> <em>${cnt.op}</em><small>Opaque paints, always shown</small></span></label>`+
 PTYPES.map(([k,t,h])=>`<label class="tyr"><input type="checkbox" data-ty="${k}"${HIDE_T.has(k)?'':' checked'}><span><b>${t}</b> <em>${cnt[k]||0}</em><small>${h}</small></span></label>`).join('');
document.getElementById('hTy').onclick=()=>d.showModal();
d.addEventListener('change',e=>{const k=e.target.dataset.ty;if(!k)return;e.target.checked?HIDE_T.delete(k):HIDE_T.add(k);try{localStorage.setItem('pd-types',JSON.stringify([...HIDE_T]))}catch(e){}tyUI();
 if(sel&&!shown(sel))sel=null;if(NB&&!shown(NB))NB=null;layout();renderNeu();draw()})})();tyUI();
{const d=document.getElementById('neud');try{d.open=localStorage.getItem('pd-neu')==='1'}catch(e){}d.ontoggle=()=>{try{localStorage.setItem('pd-neu',d.open?'1':'0')}catch(e){}}}
const GL={'µ':'My mix',A:'Warpaints Fanatic',C:'John Blanche Vol. 1-4',R:'Warpaints Air',S:'Speedpaint 2.0','Ħ':'Warpaints Historical','Ŵ':'Warpaints Legacy','Ŧ':'Glow Precision Fluor','Ť':'Color Punch',b:'Colour: Base',s:'Colour: Shade',l:'Colour: Layer',c:'Colour: Contrast',t:'Colour: Technical',a:'Colour: Air',d:'Colour: Dry',p:'Tone Pro',M:'Standard / Signature / AMP',W:'Washes',F:'Fluorescents',T:'Transparents',X:'Metallics','1':'1-Step',E:'Expert Acrylics',P:'Primers',G:'Weathering pigments',B:'Basing textures (list only)',K:'AK Quick Gen',e:'3rd Gen Standard',g:'3rd Gen Intense',j:'3rd Gen Pastel',m:'3rd Gen Metallic',n:'3rd Gen Ink',o:'3rd Gen AFV Series',v:'3rd Gen Figure Series',y:'3rd Gen Air Series',V:'Game Color',u:'Game Color Metallic',i:'Game Color Ink',f:'Game Color Special FX / Fluo',x:'Xpress Color',w:'Game Color Wash',L:'True Metallic Metal',Y:'Model Air',Z:'Model Color',H:'Triads: highlights',N:'Triads: midtones',O:'Triads: shadows',J:'Brights',q:'Metallics',z:'Washes',r:'Glazes',D:'Metallic',I:'TurboShift',Q:'ZeniShift',U:'XF Flat Acrylic',h:'X Gloss Acrylic','2':'AS Spray (aircraft)','3':'PS Spray (polycarbonate)','4':'TS Spray','7':'Scalecolor','8':'Fantasy & Games','9':'Instant Colors','0':'Scalecolor Artist','%':"Metal n' Alchemy",'*':'Inktensity','@':'FX Fluor','Ş':'Prism Effect','5':'Acrylic Colors','6':'Opaque Colors','!':'Fluor Paints','+':'Metallic & Colorshift','~':'Washes & Intensity Inks','^':'Dipping Inks','=':'Acrylic Inks','_':'ATOM','?':'Mr. Color',':':'Aqueous Hobby Color',';':'Acrysion','{':'Master Series Paints','}':'MSP Metallics','[':'MSP Clears & Inks','Å':'Formula P3','Ø':'P3 Metallics','Æ':'P3 Inks & Washes','Ç':'Pure Pigments','Ð':'Signature Series','Ë':'Heavy Body Acrylics','Ê':'High Flow','Ñ':'N-Paint Basic','Ö':'N-Paint Metal','Ô':'N-Paint Ink','Õ':'Fantasy-Pro','Ü':'Bear Cavalry Paints','Ï':'IONIC Smart Colors','Ò':'Acrylic Colors for Figures','Ó':'Oilbrusher','Ú':'Dio Drybrush','Û':'Shaders'};
const BRANDS=[['Army Painter',['A','C','R','S','Ħ','Ŵ']],['Citadel / Warhammer',['b','s','l','c','t','a','d','p']],['Pro Acryl',['M','W','F','T','X','1','E','P','G','B']],['Vallejo',['V','u','i','f','x','w','Y','Z','L','Õ']],['AK Interactive',['K','e','g','j','m','n','o','v','y','Ŧ','Ť']],['Two Thin Coats',['H','N','O','J','q','z','r']],['Turbo Dork',['D','I','Q']],['Tamiya',['U','h','2','3','4']],['Scale75',['7','8','9','0','%','*','@','Ş']],['Green Stuff World',['5','6','!','+','~','^','=']],['AMMO by Mig',['_','Ï','Ò','Ó','Ú','Û']],['Mr. Hobby',['?',':',';']],['Reaper',['{','}','[']],['Formula P3',['Å','Ø','Æ']],['Kimera Kolors',['Ç','Ð']],['Golden',['Ë','Ê']],['Nocturna Models',['Ñ','Ö','Ô']],['Bear Cavalry',['Ü']]];

const BR_OF={};BRANDS.forEach(([bn,gs],bi)=>gs.forEach(g=>BR_OF[g]=bi));
// Paint tree sections (wheel and My paints). A brand whose metallics or pearls are spread over mixed ranges gets one Metallics and one
// Pearls section at the end, with a sub-heading per original range; pure metallic ranges of that brand fold in. Paints keep their range (p.g),
// so collections, saved wheels and recipes are untouched. SETS: section or sub-heading id -> {l: label, w: sub-heading name in prompts, ps: paint indices}.
const SETS={},TREE=BRANDS.map(([bn,gs],bi)=>{const of=g=>P.filter(p=>p.g===g),kd=p=>{const t=paintType(p);return t==='met'||t==='pearl'?t:''};
 const pure=(g,t)=>of(g).every(p=>kd(p)===t),pull={};['met','pearl'].forEach(t=>pull[t]=gs.some(g=>!pure(g,t)&&of(g).some(p=>kd(p)===t)));
 const out=[],X={met:{id:'met'+bi,l:'Metallics',subs:[]},pearl:{id:'pearl'+bi,l:'Pearls',subs:[]}};
 gs.forEach(g=>{const keep=[];of(g).forEach(p=>{const t=kd(p);if(t&&pull[t]){const ss=X[t].subs;let u=ss.find(u=>u.g===g);if(!u)ss.push(u={id:X[t].id+'.'+g,g,l:GL[g],w:GL[g]+' '+X[t].l.toLowerCase(),ps:[]});u.ps.push(p.i)}else keep.push(p.i)});
  if(keep.length)out.push({id:g,l:GL[g],ps:keep})});
 ['met','pearl'].forEach(t=>{const x=X[t];if(!x.subs.length)return;x.ps=x.subs.flatMap(u=>u.ps);out.push(x);x.subs.forEach(u=>SETS[u.id]=u)});
 out.forEach(x=>SETS[x.id]=x);return[bn,out]});
const treeRow=i=>{const p=P[i],e=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));return`<label class="pi" data-i="${i}"><input type="checkbox" data-i="${i}"><i style="background:${p.h}"></i><span>${e(p.n)}${p.c?' <em>'+e(p.c)+'</em>':''}</span></label>`};
// ca: attribute for the per-section count spans; ba: attribute (value = brand index) for the brand total; op(bi): open that brand.
const treeHTML=(ca,ba,op)=>TREE.map(([bn,ss],bi)=>`<details class="br"${op&&op(bi)?' open':''}><summary><b>${bn}</b> <span class="n" ${ba}="${bi}"></span></summary>`+ss.map(s=>`<details class="rg" data-g="${s.id}"><summary><input type="checkbox" data-r="${s.id}"> ${s.l} <span class="n" ${ca}="${s.id}"></span></summary><div class="pl">`+(s.subs?s.subs.map(u=>`<div class="sub"><label class="sh"><input type="checkbox" data-r="${u.id}"> ${u.l} <span class="n" ${ca}="${u.id}"></span></label>`+u.ps.map(treeRow).join('')+'</div>').join(''):s.ps.map(treeRow).join(''))+'</div></details>').join('')+'</details>').join('');
const hexLab=h=>rgbLab(parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16));
function rgbLab(r,g,b){const f=v=>{v/=255;return v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92};
r=f(r);g=f(g);b=f(b);
let x=(.4124*r+.3576*g+.1805*b)/.95047,y=.2126*r+.7152*g+.0722*b,z=(.0193*r+.1192*g+.9505*b)/1.08883;const t=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
return[116*t(y)-16,500*(t(x)-t(y)),200*(t(y)-t(z))]}
P.forEach(p=>p.lab=hexLab(p.h));
const dE=(a,b)=>Math.hypot(a.lab[0]-b.lab[0],a.lab[1]-b.lab[1],a.lab[2]-b.lab[2]);
const MSRC={t:'Two Thin Coats comparison chart',m:'AMMO ATOM user guide chart',f:'Army Painter Fanatic conversion chart',h:'Herrick Games paint comparison chart',k:'AK 3rd Generation equivalence chart',w:'Army Painter Historical to Fanatic chart',L:'Army Painter Warpaints Fanatic conversion chart'};
// Metallic and pearl paints only match each other, and other paints only match other paints: a gold is never a yellow's match.
// The other finish is listed apart (Metallic matches / Non-metallic colours), one nearest per brand plus any chart pairs.
const isMetT=p=>{const t=paintType(p);return t==='met'||t==='pearl'};
// Matches in other ranges. Short list (default): per brand, chart ✓ matches within ΔE 25 of our swatch, else the 1 nearest paint of the
// same type within ΔE 12; same-named paints in one brand shown once. MATCH_ALL (Show all button) brings back the full list: every chart
// match plus the 2-3 nearest per brand, no limit. Same split by finish either way (xch/xnear = metallic vs non-metallic section).
let MATCH_ALL=false;const M_TICK=25,M_NEAR=12,tyG=t=>t==='ink'?'wash':t;
const dedupe=a=>{const s=new Set();return a.filter(m=>{const k=m.p.n.trim().toLowerCase();if(s.has(k))return false;s.add(k);return true})};
function matchData(p,all=MATCH_ALL){const i=p.i,mt=isMetT(p),ty=tyG(paintType(p)),mine=q=>!ONLY_MINE||own(q),doc=(MT[i]||[]).map(([j,s])=>({p:P[j],s,d:dE(p,P[j])})).filter(m=>mine(m.p)),out=[];
BRANDS.forEach(([bn,gs],bi)=>{if(BR_OF[p.g]===bi)return;let b=doc.filter(m=>BR_OF[m.p.g]===bi).sort((a,b)=>a.d-b.d);const have=new Set(b.map(m=>m.p));if(!all)b=b.filter(m=>m.d<=M_TICK);
let ch=b.filter(m=>isMetT(m.p)===mt),xch=b.filter(m=>isMetT(m.p)!==mt);
const pool=P.filter(q=>BR_OF[q.g]===bi&&q.g!=='B'&&!have.has(q)&&mine(q)).map(q=>({p:q,d:dE(p,q)})).sort((a,b)=>a.d-b.d);
let near,xnear;if(all){near=pool.filter(m=>isMetT(m.p)===mt).slice(0,ch.length?2:3);xnear=pool.filter(m=>isMetT(m.p)!==mt).slice(0,xch.length?0:1)}
else{ch=dedupe(ch);xch=dedupe(xch);const ok=m=>m.d<=M_NEAR&&!ch.concat(xch).some(c=>c.p.n.trim().toLowerCase()===m.p.n.trim().toLowerCase());
 near=ch.length?[]:pool.filter(m=>isMetT(m.p)===mt&&(mt||tyG(paintType(m.p))===ty)&&ok(m)).slice(0,1);xnear=xch.length?[]:pool.filter(m=>isMetT(m.p)!==mt&&ok(m)).slice(0,1)}
out.push({bn,ch,near,xch,xnear})});return out}
const mCount=md=>md.reduce((a,o)=>a+o.ch.length+o.near.length+o.xch.length+o.xnear.length,0);
// Links from a selected paint to its own paint page (the Worker's /paints/find looks up the page by paint key) and to a conversion chart for its brand.
const CONV_G={'Citadel / Warhammer':['guides','Conversion charts'],'Army Painter':['guides/army-painter-to-citadel','Army Painter to Citadel chart'],'Vallejo':['guides/vallejo-to-citadel','Vallejo to Citadel chart'],
 'Pro Acryl':['guides/pro-acryl-to-citadel','Pro Acryl to Citadel chart'],'AK Interactive':['guides/citadel-to-ak-interactive','Citadel to AK chart'],'Scale75':['guides/citadel-to-scale75','Citadel to Scale75 chart']};
function guideLinks(p){if(p.g==='B'||p.mix)return'';const cv=CONV_G[BRANDS[BR_OF[p.g]][0]],w=window.pdWantBtn?pdWantBtn(p):'';
 return`<p class="s glinks">${w?w+' · ':''}<a href="paints/find?k=${encodeURIComponent(p.g+'|'+p.c+'|'+p.n)}">Paint page for ${p.n.replace(/[&<>"]/g,'')} →</a>${cv?` · <a href="${cv[0]}">${cv[1]} →</a>`:''}</p>`}
function matchHTML(p){return guideLinks(p)+mixHTML(p)+mtHTML(p)}
function mtHTML(p){const md=matchData(p);let h='<div class="mt"><h2>Matches in other ranges</h2><p class="s"><b style="color:#2a9d5c">✓</b> = listed as an equivalent in a manufacturer / community conversion chart. ≈ = closest swatch colour (ΔE shown; under ~6 is a close match, over ~15 is a loose one). Matches are close, never exact. Tap a chip to add it to the wheel.</p>'+(MATCH_ALL?'<p class="s">Showing every match, including loose ones.</p>':'<p class="s">Showing the best match from each range: chart ✓ matches within ΔE '+M_TICK+', otherwise the nearest paint of the same type within ΔE '+M_NEAR+'.</p>');
const c=(m,k)=>`<span class="chip${k?' ck':''}" data-mi="${m.p.i}" title="${k?MSRC[m.s]+' · ':''}${GL[m.p.g]} · ΔE ${m.d.toFixed(1)}"><i style="background:${m.p.h}"></i>${k?'<b>✓</b> ':'≈ '}${star(m.p)}${m.p.n} <em>${GL[m.p.g]} · ΔE ${m.d.toFixed(0)}</em></span>`;
const rows=(a,b)=>md.map(o=>!o[a].length&&!o[b].length?'':`<div class="br2"><div class="bl">${o.bn}</div><div class="chips">${o[a].map(m=>c(m,1)).join('')}${o[b].map(m=>c(m,0)).join('')}</div></div>`).join('');
// Warpaints Historical paints that the Historical to Fanatic chart says are the same paint under another name (MT source 'w').
const same=(MT[p.i]||[]).filter(([j,s])=>s==='w').map(([j,s])=>({p:P[j],s,d:dE(p,P[j])}));if(same.length)h+=`<div class="br2"><div class="bl">Same paint as</div><div class="chips">${same.map(m=>c(m,1)).join('')}</div></div>`;
// Old Warpaints names and the Warpaints Fanatic paint that replaced them, from Army Painter's Fanatic conversion chart (MT source 'L').
const leg=(MT[p.i]||[]).filter(([j,s])=>s==='L').map(([j,s])=>({p:P[j],s,d:dE(p,P[j])}));if(leg.length)h+=`<div class="br2"><div class="bl">${p.g==='Ŵ'?'Replaced by':'Old Warpaints name'}</div><div class="chips">${leg.map(m=>c(m,1)).join('')}</div></div>`;
const mt=isMetT(p),x=rows('xch','xnear');h+=(mt?'<p class="s"><b>Metallic matches</b> (metallic and pearl paints only)</p>':'')+rows('ch','near');
if(x)h+=`<details class="mxd"${MATCH_ALL?' open':''}><summary><h3 class="mx">${mt?'Non-metallic colours':'Metallic matches'}</h3></summary><p class="s">${mt?'The nearest non-metallic paint in each brand, for non-metallic metal (NMM) or a matt alternative. A different finish, so not a straight swap.':'The nearest metallic paint in each brand. A different finish, so not a straight swap.'}</p>`+x+'</details>';
if(!mCount(md))h+=ONLY_MINE?'<p class="s">None of your paints from other ranges match this one closely.</p>':'<p class="s">No close matches in other ranges.</p>';const full=MATCH_ALL?0:mCount(matchData(p,true));return h+'<button type="button" id="mAddDoc">Add all ✓ chart matches to wheel</button><button type="button" id="mAddAll">Add all matches shown</button>'+(MATCH_ALL?'<button type="button" id="mMore">Show best matches only</button>':full>mCount(md)?`<button type="button" id="mMore">Show all ${full} matches</button>`:'')+'</div>'}
// Mix it from your paints: when the selected paint isn't in the painter's collection, look for 2- and 3-paint mixes of opaque paints
// they own that come close. Mixing is pigment-style (one-constant Kubelka-Munk per RGB channel, so blue + yellow heads toward green,
// not grey) on the swatch estimates, so every mix is a starting point. Metallics, pearls, washes, inks, contrast, glazes, fluo and
// technical paints are left out of the pool (nmmOK), and only opaque target paints get suggestions.
const KSv=h=>[1,3,5].map(o=>{let v=parseInt(h.slice(o,o+2),16)/255;v=v>.04045?((v+.055)/1.055)**2.4:v/12.92;v=Math.min(.998,Math.max(.002,v));return(1-v)**2/(2*v)});
const ksLab=ks=>rgbLab(...ks.map(k=>{let v=1+k-Math.sqrt(k*k+2*k);v=v>.0031308?1.055*v**(1/2.4)-.055:12.92*v;return Math.max(0,Math.min(1,v))*255}));
const gcd=(a,b)=>b?gcd(b,a%b):a,MX2=[],MX3=[];
for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)if(a+b<=6&&gcd(a,b)===1)MX2.push([a,b]);
for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)for(let c=1;c<=4;c++)if(a+b+c<=7&&gcd(gcd(a,b),c)===1)MX3.push([a,b,c]);
const mixRate=d=>d<6?'Close':d<12?'Fair':'Loose';
let MIXC=null;
function mixFor(p){if(MIXC&&MIXC.p===p&&MIXC.o===OWN)return MIXC.r;
const t=p.lab,pool=P.filter(q=>own(q)&&!q.mix&&q!==p&&q.g!=='B'&&nmmOK(q));pool.forEach(q=>{if(!q.ks)q.ks=KSv(q.h)});
const T=KSv(p.h),W=T.map(k=>1/(k+.08)**2),dl=l=>Math.hypot(l[0]-t[0],l[1]-t[1],l[2]-t[2]),n=pool.length;
const near=pool.map(q=>({q,d:dE(p,q)})).sort((a,b)=>a.d-b.d),one=near[0]||null;
// Quick pass: for every pair, the best straight-line fit in K/S space (where pigment mixing is linear), weighted toward the target.
const cand=[];for(let i=0;i<n;i++){const A=pool[i].ks;for(let j=i+1;j<n;j++){const B=pool[j].ks;let num=0,den=0,r=0;
 for(let k=0;k<3;k++){const u=B[k]-A[k];num+=W[k]*u*(T[k]-A[k]);den+=W[k]*u*u}const f=den?Math.min(.9,Math.max(.1,num/den)):.5;
 for(let k=0;k<3;k++){const e=A[k]+f*(B[k]-A[k])-T[k];r+=W[k]*e*e}cand.push([r,i,j])}}
cand.sort((a,b)=>a[0]-b[0]);
const two=cand.slice(0,400).map(([,i,j])=>{const A=pool[i].ks,B=pool[j].ks;let best=null;
 for(const[a,b]of MX2){const d=dl(ksLab([0,1,2].map(k=>(a*A[k]+b*B[k])/(a+b))));if(!best||d<best.d)best={m:[[pool[i],a],[pool[j],b]],d}}return best}).sort((a,b)=>a.d-b.d);
// Three paints: the paints that turn up in the best pairs plus the nearest singles, every trio of them, small whole-number parts.
const top=[...new Set([...two.slice(0,30).flatMap(x=>x.m.map(y=>y[0])),...near.slice(0,8).map(x=>x.q)])].slice(0,22),three=[];
for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++)for(let k=j+1;k<top.length;k++){const q=[top[i],top[j],top[k]];let best=null;
 for(const w of MX3){const s=w[0]+w[1]+w[2],d=dl(ksLab([0,1,2].map(c=>(w[0]*q[0].ks[c]+w[1]*q[1].ks[c]+w[2]*q[2].ks[c])/s)));if(!best||d<best.d)best={m:q.map((x,z)=>[x,w[z]]),d}}three.push(best)}
three.sort((a,b)=>a.d-b.d);
// Keep mixes that beat the closest paint they already own, no pair twice, the larger share first. A 3-paint mix has to earn its place.
const out=[],seen=new Set(),lim=one?one.d-1:99;
for(const x of two){if(out.length>=3)break;const key=x.m.map(y=>y[0].n.trim().toLowerCase()).sort().join('|');if(x.d>=lim||x.d>25||seen.has(key))continue;seen.add(key);out.push(x)}
const b3=three[0];if(b3&&b3.d<lim&&b3.d<25&&(!out.length||b3.d<out[0].d-1.5))out.push(b3);
out.forEach(x=>x.m.sort((a,b)=>b[1]-a[1]));out.sort((a,b)=>a.d-b.d);
const r={n,one,mixes:out};MIXC={p,o:OWN,r};return r}
function kmHex(m){const s=m.reduce((a,x)=>a+x[1],0);return labHex(ksLab([0,1,2].map(c=>m.reduce((a,x)=>a+x[1]*x[0].ks[c],0)/s)))}
function mixHTML(p){const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(p.mix)return`<div class="mixs"><h2>Your mix</h2><div class="mxr"><span class="mxsw"><i style="background:${p.h}"></i></span><div class="mxt"><b>${mixParts(p.mix.m,esc)}</b><span class="s">Saved in your paints. The colour is worked out from the swatch estimates, so it's approximate.</span></div><button type="button" class="mxsv" data-mxdel="${esc(p.mix.id)}">Remove mix</button></div></div>`;
if(p.g==='B'||paintType(p)!=='op')return'';
const box=b=>`<div class="mixs"><h2>Mix it from your paints</h2>${b}</div>`;
if(!OWN)return window.pdApi&&pdApi()?box('<p class="s">Missing this paint? Sign in and tick the paints you own on My paints, and this shows how to mix it from them.</p>'):'';
if(own(p))return'';const r=mixFor(p);
if(r.n<2)return box('<p class="s">Add a few opaque paints to your collection on My paints to see mixes for paints you don\'t have.</p>');
const one=r.one?`<p class="s">Closest paint you own: <span class="chip"><i style="background:${r.one.q.h}"></i>${esc(r.one.q.n)} <em>${esc(GL[r.one.q.g])} · ΔE ${r.one.d.toFixed(0)}</em></span></p>`:'';
if(!r.mixes.length)return box(`<p class="s">${r.one&&r.one.d<4?'You don\'t own this paint, but you have one that is already very close.':'You don\'t own this paint, and no mix of your opaque paints beats the closest one you have.'}</p>`+one);
return box(`<p class="s">You don't own this paint. These mixes of opaque paints in your collection come closest (metallics, washes, inks and contrast paints are left out). Swatches are estimates and real paints mix less predictably, so mix a little, let it dry and compare first.</p>`+
r.mixes.map((x,z)=>`<div class="mxr"><span class="mxsw" title="Left: ${esc(p.n)}. Right: the mix."><i style="background:${p.h}"></i><i style="background:${kmHex(x.m)}"></i></span><div class="mxt"><b>${mixParts(x.m,esc)}</b><span class="s">ΔE ${x.d.toFixed(1)} · ${mixRate(x.d)}</span></div><span class="mxb">${window.pdMixOK&&pdMixOK()?(mixHave(x.m)?'<span class="s">In your paints ✓</span>':`<button type="button" class="mxsv" data-mxa="${z}">Add to my paints</button>`):''}${window.pdApi&&pdApi()?`<button type="button" class="mxsv" data-mxs="${z}">Save as recipe</button>`:''}</span></div>`).join('')+one)}
function wireMix(p){
document.querySelectorAll('#sel [data-mxa]').forEach(e=>e.onclick=async()=>{const x=mixFor(p).mixes[+e.dataset.mxa];if(!x)return;e.disabled=true;e.textContent='Adding…';
 try{await pdAddMix({name:p.n.trim()+' mix',parts:x.m.map(([q,k])=>({k:q.k,parts:k})),hex:kmHex(x.m)})}catch(er){e.disabled=false;e.textContent=er.message||'Could not add'}});
document.querySelectorAll('#sel [data-mxdel]').forEach(e=>e.onclick=async()=>{e.disabled=true;try{await pdDelMix(e.dataset.mxdel)}catch(er){e.disabled=false;e.textContent=er.message||'Could not remove'}});
document.querySelectorAll('#sel [data-mxs]').forEach(e=>e.onclick=()=>{const x=mixFor(p).mixes[+e.dataset.mxs];if(!x)return;
 NMM_DRAFT={kind:'recipe',title:'Mix for '+p.n.trim(),summary:`A mix to stand in for ${p.n.trim()} (${GL[p.g]}) from paints I own. Worked out on the Painters Desk wheel from swatch estimates (ΔE ${x.d.toFixed(1)}), so test it first.`,
 steps:[{title:'Mix',text:'Mix the parts together well on the palette, then thin as usual.',image:'',mix:x.m.map(([q,k])=>({k:q.k,parts:k}))}]};location.hash='#/new/recipe'})}
// Saved mixes ('My mix', group µ): account.js hands over the user's mixes and they join P as extra paints at the end, always on the wheel,
// always 'owned', never in the paint tree, matches lists, suggestions or other mixes. Colour = the same pigment-style mix of the parts.
const mixParts=(m,esc)=>m.map(([q,k])=>`<span class="mxp"><i style="background:${q.h}"></i>${k} part${k>1?'s':''} ${esc(q.n)} <em>${esc(GL[q.g])}</em></span>`).join('');
const mixSig=m=>m.map(([q,k])=>q.k+'*'+k).sort().join('|'),mixHave=m=>{const g=mixSig(m);return P.some(q=>q.mix&&mixSig(q.mix.m)===g)};
const P0=P.length,KEY={};P.forEach(p=>{if(!KEY[p.k])KEY[p.k]=p});
window.pdSetMixes=list=>{P.length=P0;
 (list||[]).forEach(x=>{const m=(x.parts||[]).map(y=>[KEY[y.k],y.parts]).filter(y=>y[0]);if(m.length<2)return;m.forEach(([q])=>{if(!q.ks)q.ks=KSv(q.h)});
  const h=m.length===x.parts.length?kmHex(m):x.hex,r=parseInt(h.slice(1,3),16)/255,gg=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn,L=(mx+mn)/2;
  let H=0;if(d){H=mx===r?((gg-b)/d)%6:mx===gg?(b-r)/d+2:(r-gg)/d+4;H=(H*60+360)%360}
  const p={n:x.name,c:'My mix',h,g:'µ',H,S:d?d/(1-Math.abs(2*L-1)):0,L,lum:.299*r+.587*gg+.114*b,k:'µ|'+x.id+'|'+x.name,i:P.length,lab:hexLab(h),mix:{id:x.id,m}};
  Object.defineProperty(p,'on',{get:()=>true,set(){},enumerable:true});P.push(p)});
 const gone=q=>q&&q.mix&&!P.includes(q);if(gone(sel))sel=null;if(gone(NB))NB=null;if(BL&&(gone(BL.b)||BL.s.some(x=>gone(x.p))))BL=null;
 MIXC=null;layout();renderNeu();draw()};
// Recipes are shared, so a step that uses a saved mix is written out as the mix's own paints (parts multiplied through).
window.pdExpandMix=mix=>{const out=[];mix.forEach(it=>{const q=typeof it.k==='string'&&it.k[0]==='µ'&&P.find(z=>z.k===it.k);
 (q&&q.mix?q.mix.m.map(([z,k])=>({k:z.k,parts:k*(it.parts||1)})):[it]).forEach(y=>{const o=out.find(z=>z.k===y.k);if(o)o.parts+=y.parts;else out.push({...y})})});return out};
function addOn(list,p){list.forEach(q=>q.on=true);layout();renderNeu();boxes();showP(p);remember()}
function showP(p){if(MODE==='nmm'){NB=p;sel=CH.includes(p)?p:null;draw()}else if(CH.includes(p)){sel=p;draw()}else{sel=null;draw();neutralShow(p)}}
function wireMatch(p){wireMix(p);wireMt(p)}
function wireMt(p){const el=document.getElementById('sel');
el.querySelectorAll('.mt .chip').forEach(e=>e.onclick=()=>{const q=P[+e.dataset.mi];addOn([q],q)});
const md=matchData(p),a=document.getElementById('mAddDoc'),b=document.getElementById('mAddAll');
if(a)a.onclick=()=>addOn(md.flatMap(o=>[...o.ch,...o.xch].map(m=>m.p)),p);if(b)b.onclick=()=>addOn(md.flatMap(o=>[...o.ch,...o.near,...o.xch,...o.xnear].map(m=>m.p)),p);
const mo=document.getElementById('mMore');if(mo)mo.onclick=()=>{MATCH_ALL=!MATCH_ALL;const t=el.querySelector('.mt');if(t){t.outerHTML=mtHTML(p);wireMt(p)}}}
function neutralShow(p){if(MODE==='mix'&&blendFill(p))return;if(MODE==='nmm'||MODE==='mix'){sel=null;NB=p;nmmSkip=[];draw();return}document.getElementById('sel').innerHTML=`<b>Selected:</b> <div class="chips"><span class="chip"><i style="background:${p.h}"></i>${p.n} <span style="color:var(--mut)">${p.c}</span></span></div><p class="s">Neutral paint: it sits outside the hue wheel. Use it to dull a neighboring color or set value in an underpainting; warm greys pair with oranges and flesh, cool greys with blues.</p>`+matchHTML(p);wireMatch(p);window.pdRecipesFor&&pdRecipesFor(p)}
// Last wheel selection: {t,g:[fully ticked ranges],k:[other ticked paint keys]}, kept in this browser and (via account.js) on the account.
const WK='pd-wheel',GS=[...new Set(P.map(p=>p.g))];
function selNow(){const g=GS.filter(x=>P.every(p=>p.g!==x||p.on));return{t:Date.now(),g,k:P.filter(p=>p.on&&!p.mix&&!g.includes(p.g)).map(p=>p.k)}}
function selLocal(){try{const w=JSON.parse(localStorage.getItem(WK));return w&&w.t?w:null}catch(e){return null}}
// The 42 Two Thin Coats triad paints that were range 'k' until 22 Oct 2026 keep a selection saved under their old keys.
const K0=P.findIndex(p=>p.n==='Doom Death Black'),wasK=p=>p.i>=K0&&p.i<K0+42;
// Paints renamed after people saved a selection: new key -> old key.
const WAS={'S||Tidal Wave':'S||Tidal Navy'};
function selApply(w){const g=new Set(w.g||[]),k=new Set(w.k||[]);P.forEach(p=>p.on=g.has(p.g)||k.has(p.k)||k.has(WAS[p.k])||wasK(p)&&(g.has('k')||k.has('k'+p.k.slice(1))))}
let onSelSave=null;
function remember(){const w=selNow();try{localStorage.setItem(WK,JSON.stringify(w))}catch(e){}if(onSelSave)onSelSave(w)}
const W0=selLocal();if(W0)selApply(W0);else P.forEach(p=>p.on=!!on[p.g]);
const tree=document.getElementById('tree');
tree.innerHTML=treeHTML('data-gc','data-bc',bi=>TREE[bi][1].some(x=>x.ps.some(i=>on[P[i].g])));
const qv=()=>document.getElementById('q').value.trim().toLowerCase(),match=(p,q)=>(p.n+' '+p.c).toLowerCase().includes(q);
const refresh=()=>{sel=null;NB=null;layout();renderNeu();draw()};
function boxes(){
 const q=qv();tree.querySelectorAll('input[data-i]').forEach(e=>e.checked=P[+e.dataset.i].on);
 let tot=0;
 TREE.forEach(([bn,ss],bi)=>{let bo=0;ss.forEach(x=>bo+=x.ps.filter(i=>P[i].on).length);tree.querySelector(`[data-bc="${bi}"]`).textContent=bo?'('+bo+' selected)':'';tot+=bo});
 Object.entries(SETS).forEach(([id,x])=>{const m=x.ps.map(i=>P[i]),o=m.filter(p=>p.on).length,mm=q?m.filter(p=>match(p,q)):m,mo=mm.filter(p=>p.on).length;const cb=tree.querySelector(`input[data-r="${id}"]`);cb.checked=mm.length>0&&mo===mm.length;cb.indeterminate=mo>0&&mo<mm.length;tree.querySelector(`[data-gc="${id}"]`).textContent=o+'/'+m.length});
 document.getElementById('cnt').textContent=tot+' selected';wChips(tot)}
function sync(){boxes();refresh();remember()}
/* "Showing:" bar above the wheel: one chip per fully ticked range, one per brand for loose paints, ✕ unticks them.
   Change paints opens the paint list (#pickd) as a pop-up; the wheel updates behind it as you tick. */
const WCH_MAX=5,wEsc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let WCH=[];
function wChips(tot){
 WCH=[];
 TREE.forEach(([bn,ss])=>{const b=bn.split(' / ')[0],all=ss.flatMap(x=>x.ps);
  if(all.every(i=>P[i].on)){WCH.push({l:b+' (all)',ps:all});return}
  let loose=[];ss.forEach(x=>{const on=x.ps.filter(i=>P[i].on);if(!on.length)return;if(on.length===x.ps.length)WCH.push({l:b+' '+x.l,ps:x.ps});else loose=loose.concat(on)});
  if(loose.length)WCH.push({l:b+' · '+loose.length+(loose.length>1?' paints':' paint'),ps:loose})});
 const el=document.getElementById('wchips');
 el.innerHTML=WCH.length?WCH.slice(0,WCH_MAX).map((c,j)=>`<span class="wchip">${wEsc(c.l)}<button type="button" data-wc="${j}" aria-label="Take ${wEsc(c.l)} off the wheel" title="Take off the wheel">✕</button></span>`).join('')+(WCH.length>WCH_MAX?`<button type="button" class="wchip more" id="wMore">+${WCH.length-WCH_MAX} more</button>`:''):'<span class="s">no paints yet. Tap Change paints to pick some.</span>';
 document.getElementById('cnt2').textContent=tot?tot+(tot>1?' paints':' paint'):'';
 const m=document.getElementById('wMore');if(m)m.onclick=openPick}
document.getElementById('wchips').addEventListener('click',e=>{const b=e.target.closest('[data-wc]');if(!b)return;WCH[+b.dataset.wc].ps.forEach(i=>P[i].on=false);sync()});
const pickDlg=document.getElementById('pickDlg');
function openPick(){pickDlg.showModal();document.getElementById('q').focus()}
document.getElementById('pickBtn').onclick=openPick;
document.getElementById('pickOk').onclick=()=>pickDlg.close();

// More tools menu: closes after a tool is used, or on a tap outside it.
const mTools=document.getElementById('mTools');
mTools.addEventListener('click',e=>{if(e.target.closest('.mtpop button'))mTools.open=false});
document.addEventListener('click',e=>{if(mTools.open&&!mTools.contains(e.target))mTools.open=false});
// One-time tip pointing at the wheel, until the first paint is tapped or the tip is closed.
(()=>{let seen=false;try{seen=!!localStorage.getItem('pd-tip')}catch(e){}if(seen)return;
 const st=document.querySelector('#v-wheel .stage'),t=document.createElement('div');t.className='wtip';t.setAttribute('role','note');
 t.innerHTML='👆 Tap any paint on the wheel to see what goes with it<button type="button" aria-label="Close tip">✕</button>';st.appendChild(t);
 const done=()=>{t.remove();try{localStorage.setItem('pd-tip','1')}catch(e){}};
 t.querySelector('button').onclick=done;document.getElementById('w').addEventListener('click',e=>{if(e.target.closest('.dot'))done()})})();
tree.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.r){const q=qv();SETS[t.dataset.r].ps.forEach(i=>{const p=P[i];if(!q||match(p,q))p.on=t.checked})}
 else if(t.dataset.i!==undefined)P[+t.dataset.i].on=t.checked;
 sync()});
document.getElementById('clr').onclick=()=>{P.forEach(p=>p.on=false);sync()};
document.getElementById('q').oninput=()=>{const q=qv();
 tree.querySelectorAll('label.pi').forEach(l=>l.hidden=!!q&&!match(P[+l.dataset.i],q));
 tree.querySelectorAll('.sub').forEach(d=>d.hidden=!!q&&!d.querySelector('label.pi:not([hidden])'));
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
const d76=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]),sgOK=p=>!p.mix&&nmmOK(p)&&p.g!=='B'&&!/\bclear\b/i.test(p.n);
// Colour area a paint falls in: 11 wheel hues × dark/mid/light, or one of five greys for low-saturation paints.
function sgCell(p){const L=p.lab[0];if(p.S>=.14&&Math.hypot(p.lab[1],p.lab[2])>=10)return'c'+sgHue(p.H)+'_'+(L<38?0:L<62?1:2);return'n'+(L<20?0:L<40?1:L<60?2:L<85?3:4)}
const sgCellName=c=>SG_NAME[c]||(c[0]==='n'?SG_GREY[+c[1]]:SG_BAND[+c.split('_')[1]]+' '+SG_HUE[+c.slice(1).split('_')[0]]);
// Owned paints for each step of a ramp, nearest first by the same lightness-weighted distance the wheel uses, no repeats.
function sgFit(T,own){const used=new Set(),w=(a,c)=>Math.hypot(1.6*(a[0]-c[0]),a[1]-c[1],a[2]-c[2]);
return T.map(x=>{let m=null,md=1e9;own.forEach(q=>{if(used.has(q))return;const d=w(q.lab,x.t);if(d<md){md=d;m=q}});if(m)used.add(m);return{...x,p:m,d:m?d76(m.lab,x.t):99}})}
function sgTargets(q,b){const o={...NMO};NMO.n=7;NMO.t=false;try{return TQ[q].targets(b)}finally{NMO.n=o.n;NMO.t=o.t}}
// Essentials the colour grid can't see (washes, metals, contrast) plus a true black and white. Each has a test for paints that count
// and a typical colour, so the suggestion is the nearest paint of the right kind.
const SG_ESS=[['bwash','Brown wash','#4a3524',p=>/wash|ink/.test(paintType(p))&&p.lab[2]>6&&p.lab[1]>0&&p.lab[0]<55],
['kwash','Black or dark wash','#2a2a2c',p=>/wash|ink/.test(paintType(p))&&p.lab[0]<32&&Math.hypot(p.lab[1],p.lab[2])<12],
['silver','Silver metallic','#a8acb0',p=>paintType(p)==='met'&&Math.hypot(p.lab[1],p.lab[2])<10&&p.lab[0]>50],
['gold','Gold metallic','#c09a45',p=>{if(paintType(p)!=='met')return false;const[,C,h]=lch(p);return C>18&&h>55&&h<100}],
['con','Contrast or speedpaint','#7a5030',p=>paintType(p)==='con'],
['black','Pure black','#111111',p=>paintType(p)==='op'&&p.lab[0]<15&&Math.hypot(p.lab[1],p.lab[2])<8],
['white','Pure white','#f6f6f4',p=>paintType(p)==='op'&&p.lab[0]>90&&Math.hypot(p.lab[1],p.lab[2])<8]];
function sgEss(ownSet,pref,hide){const pool=P.filter(p=>!p.mix&&p.g!=='B');
 return SG_ESS.map(([id,name,h,ok])=>{const t=hexLab(h),have=pool.filter(p=>ownSet.has(p.k)&&ok(p));if(have.length)return{id,name,have};
  const c=pool.filter(p=>!ownSet.has(p.k)&&!hide.has(p.k)&&ok(p)).sort((a,b)=>(pref(b)-pref(a))||d76(a.lab,t)-d76(b.lab,t));return{id,name,have,p:c[0]||null,alt:c.slice(1,3).filter(q=>pref(q)===pref(c[0]))}})}
// opt: n = how many suggestions, brand = only shop from this brand (index into BRANDS), hide = paint keys marked Not interested.
function suggestPaints(ownSet,opt={}){const all=P.filter(sgOK),own=all.filter(p=>ownSet.has(p.k)),hide=opt.hide||new Set(),N=opt.n||10;if(!own.length)return null;
// Ramps: fixed bases for NMM, OSL, gems and skin; zenithal and edge highlights on the most saturated owned mid/dark paint of each hue.
const bases=SG_FIX.map(([q,n,h])=>({q,n,b:{lab:hexLab(h),h}})),pk={};
own.forEach(p=>{const[L,C]=lch(p);if(L<25||L>62||C<20||p.S<.14)return;const s=Math.round(p.H/45)%8;if(!pk[s]||C>lch(pk[s])[1])pk[s]=p});
Object.values(pk).forEach(p=>['zen','edge','glaze','dry','under'].forEach(q=>bases.push({q,n:p.n,b:p,own:1})));
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
const myB=new Set(own.map(p=>BR_OF[p.g])),hn=new Set(P.filter(p=>hide.has(p.k)).map(p=>p.n.trim().toLowerCase())),cand=all.filter(p=>!ownSet.has(p.k)&&!hide.has(p.k)&&!hn.has(p.n.trim().toLowerCase())),one=opt.brand!=null&&BRANDS[opt.brand];
const mine=pick(gaps,cand.filter(p=>one?BR_OF[p.g]===opt.brand:myB.has(BR_OF[p.g])),N),other=one?[]:pick(gaps,cand.filter(p=>!myB.has(BR_OF[p.g])),Math.ceil(N/2));
// A suggestion you can already mix closely (ΔE under 8) from your own paints says so and moves to the end of its list.
const mx=l=>{l.forEach(o=>{const m=mixFor(o.p).mixes[0];if(m&&m.d<8)o.mix=m});return[...l.filter(o=>!o.mix),...l.filter(o=>o.mix)]};
const pref=p=>one?(BR_OF[p.g]===opt.brand?2:0):(myG.has(p.g)?2:myB.has(BR_OF[p.g])?1:0);
// An essential that one of the suggestions already covers is tagged on that suggestion instead of getting its own row.
const ess=sgEss(ownSet,pref,new Set([...hide,...P.filter(p=>taken.has(p.n.trim().toLowerCase())).map(p=>p.k)]));
ess.forEach(x=>{if(x.have.length)return;const ok=SG_ESS.find(e=>e[0]===x.id)[3],o=[...mine,...other].find(o=>ok(o.p));if(o){o.fills.push({g:'Essential',r:[x.name]});x.by=o.p;x.p=null}});
return{ramps,cells,mine:mx(mine),other:mx(other),ess,left:gaps.filter(x=>!x.done).length,brands:one?[one[0]]:[...myB].map(i=>BRANDS[i][0]),one:!!one}}
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

// Site theme picker. The choice lives in localStorage pd-look; an inline script in index.html applies it before first paint.
// Neon 1984 (cyber) is the default for anyone who hasn't picked; Paint Pot is stored as ''.
// On a first visit the same dialog opens as a picker: choices only preview until Confirm saves one.
{const LOOKS={'':null,cyber:'#0d0221',grim:'#14120f',forest:'#2f4a24',dwarf:'#0b1311',abyss:'#041416',arcane:'#3b2616',frost:'#10273f',infernal:'#0b0605',bench:'#1d6650',ink:'#f2ebdb',desert:'#8a4a24',lab:'#eef5f4',steam:'#1a110b',egypt:'#1c0d06',void:'#05070f'},DEF='cyber',dlg=document.getElementById('thDlg'),opts=dlg.querySelectorAll('.tho');
const ttl=document.getElementById('thT'),txt=document.getElementById('thP'),ok=document.getElementById('thOk'),T0=[ttl.textContent,txt.textContent,ok.textContent];
const metas=[...document.querySelectorAll('meta[name="theme-color"]')],orig=metas.map(m=>m.content);
const apply=l=>{if(!(l in LOOKS))l='';if(l)document.documentElement.dataset.look=l;else delete document.documentElement.dataset.look;
 metas.forEach((m,i)=>m.content=LOOKS[l]||orig[i]);opts.forEach(o=>o.setAttribute('aria-checked',o.dataset.look===l?'true':'false'));pdIcon()};
const saved=()=>{try{const s=localStorage.getItem('pd-look');if(s!==null)return s}catch(e){}return DEF},save=l=>{try{localStorage.setItem('pd-look',l)}catch(e){}};
let FV=false;apply(saved());
const open=()=>{dlg.showModal();(dlg.querySelector('.tho[aria-checked="true"]')||opts[0]).focus()};
document.getElementById('thBtn').onclick=open;
{const w=document.getElementById('wTheme');if(w)w.onclick=open}
opts.forEach(o=>o.onclick=()=>{apply(o.dataset.look);if(!FV)save(o.dataset.look)});
ok.onclick=()=>{if(FV)save((dlg.querySelector('.tho[aria-checked="true"]')||opts[0]).dataset.look);dlg.close()};
dlg.onclose=()=>{if(!FV)return;FV=false;[ttl.textContent,txt.textContent,ok.textContent]=T0;apply(saved())};
window.pdThemeFirst=()=>{FV=true;ttl.textContent='Pick a look';txt.textContent='Tap a theme to preview it, then confirm. Paint colours stay the same, and you can change it any time with the Theme button at the top.';ok.textContent='Confirm';open()}}

/* ---------- Palette from a photo ----------
   The photo is read in this browser only (canvas), never uploaded. It is shrunk to ~120px, its pixels clustered in Lab
   (k-means, fixed seed so the same photo gives the same palette), and each colour matched to the nearest paints by ΔE,
   using the paint types shown on the wheel and, if ticked, only the signed-in user's paints. Swatches are estimates. */
{const $=id=>document.getElementById(id),dlg=$('phDlg'),cv=$('phCv'),cx=cv.getContext('2d',{willReadFrequently:true});
let PX=null,COLS=[],prev=null,tm=0;
const hx=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function load(f){if(!f)return;window.pdPhotoFile=f;const u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{URL.revokeObjectURL(u);const s=Math.min(1,520/Math.max(im.width,im.height));cv.width=Math.max(1,Math.round(im.width*s));cv.height=Math.max(1,Math.round(im.height*s));
  cx.drawImage(im,0,0,cv.width,cv.height);const t=Math.min(1,120/Math.max(cv.width,cv.height)),c2=document.createElement('canvas');c2.width=Math.max(1,Math.round(cv.width*t));c2.height=Math.max(1,Math.round(cv.height*t));
  const x2=c2.getContext('2d');x2.drawImage(cv,0,0,c2.width,c2.height);const d=x2.getImageData(0,0,c2.width,c2.height).data;PX=[];
  for(let i=0;i<d.length;i+=4)if(d[i+3]>200)PX.push([d[i],d[i+1],d[i+2],rgbLab(d[i],d[i+1],d[i+2])]);
  $('phErr').textContent='';$('phImg').hidden=false;run()};
 im.onerror=()=>{URL.revokeObjectURL(u);$('phErr').textContent="That file couldn't be opened as a picture here. Try a JPG or PNG."};im.src=u}
function kmeans(k){let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647,n=PX.length,d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
 if(!n)return[];const C=[PX[Math.floor(rnd()*n)][3].slice()],md=PX.map(p=>d2(p[3],C[0]));
 while(C.length<k){let t=rnd()*md.reduce((s,v)=>s+v,0),j=0;while(j<n-1&&(t-=md[j])>0)j++;C.push(PX[j][3].slice());PX.forEach((p,i)=>md[i]=Math.min(md[i],d2(p[3],C[C.length-1])))}
 const A=new Int16Array(n);for(let it=0;it<20;it++){let ch=0;PX.forEach((p,i)=>{let b=0,bd=1e9;C.forEach((c,j)=>{const v=d2(p[3],c);if(v<bd){bd=v;b=j}});if(A[i]!==b){A[i]=b;ch++}});
  const S=C.map(()=>[0,0,0,0]);PX.forEach((p,i)=>{const s=S[A[i]];s[0]+=p[3][0];s[1]+=p[3][1];s[2]+=p[3][2];s[3]++});S.forEach((s,j)=>{if(s[3])C[j]=[s[0]/s[3],s[1]/s[3],s[2]/s[3]]});if(!ch&&it)break}
 const R=C.map(c=>({lab:c,rgb:[0,0,0],n:0}));PX.forEach((p,i)=>{const r=R[A[i]];r.rgb[0]+=p[0];r.rgb[1]+=p[1];r.rgb[2]+=p[2];r.n++});
 return R.filter(r=>r.n).map(r=>({lab:r.lab,h:hx(...r.rgb.map(v=>v/r.n)),w:r.n/n})).sort((a,b)=>b.w-a.w)}
const cands=()=>P.filter(p=>!p.mix&&p.g!=='B'&&shown(p)&&!isMetT(p)&&(!$('phMine').checked||own(p)));
function match(){const C=cands(),used=new Set();COLS.forEach(c=>{c.m=C.map(p=>({p,d:dE(c,p)})).sort((a,b)=>a.d-b.d).slice(0,4);const f=c.m.find(m=>!used.has(m.p))||c.m[0];c.pick=f?f.p:null;if(c.pick)used.add(c.pick)});render()}
function run(){if(!PX)return;COLS=kmeans(+$('phK').value);match()}
function render(){const R=$('phRes');if(!COLS.length){R.innerHTML='';$('phGo').disabled=true;return}
 R.innerHTML=`<div class="phpal">${COLS.map(c=>`<i style="background:${c.h};flex:${Math.max(c.w,.04)}"></i>`).join('')}</div>`+COLS.map((c,ci)=>`<div class="phr"><span class="phs" style="background:${c.h}"></span><span class="phw">${c.w?Math.round(c.w*100)+'%':'tapped'}</span><div class="chips">`+
  (c.m.length?c.m.map(m=>`<button type="button" class="chip${m.p===c.pick?' on':''}" data-c="${ci}" data-i="${m.p.i}" aria-pressed="${m.p===c.pick}" title="${esc(GL[m.p.g])} · ΔE ${m.d.toFixed(1)}"><i style="background:${m.p.h}"></i><span>${star(m.p)}${esc(m.p.n)}<em>${esc(BRANDS[BR_OF[m.p.g]][0])} · ΔE ${m.d.toFixed(0)}</em></span></button>`).join(''):'<span class="s">No paints to match. Untick “My paints only” or show more paint types.</span>')+
  `</div><button type="button" class="phx" data-x="${ci}" aria-label="Remove this colour" title="Remove this colour">×</button></div>`).join('');
 $('phGo').disabled=$('phSave').disabled=!COLS.some(c=>c.pick)}
$('phRes').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x!==undefined){COLS.splice(+b.dataset.x,1);render();return}
 const c=COLS[+b.dataset.c],p=P[+b.dataset.i];c.pick=c.pick===p?null:p;render()};
cv.onclick=e=>{if(!PX)return;const r=cv.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*cv.width),y=Math.floor((e.clientY-r.top)/r.height*cv.height),d=cx.getImageData(Math.max(0,x-1),Math.max(0,y-1),3,3).data;
 let s=[0,0,0],n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>0){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2];n++}if(!n)return;s=s.map(v=>v/n);
 const c={lab:rgbLab(...s),h:hx(...s),w:0},C=cands();c.m=C.map(p=>({p,d:dE(c,p)})).sort((a,b)=>a.d-b.d).slice(0,4);const u=new Set(COLS.map(x=>x.pick)),f=c.m.find(m=>!u.has(m.p))||c.m[0];c.pick=f?f.p:null;COLS.unshift(c);render()};
$('phFile').onchange=e=>load(e.target.files[0]);
$('phK').onchange=run;$('phMine').onchange=match;
$('phBtn').onclick=()=>{$('phMineL').hidden=!OWN||!OWN.size;$('phSave').hidden=!(window.pdApi&&pdApi());if(!OWN)$('phMine').checked=false;dlg.showModal()};
$('phNo').onclick=()=>dlg.close();
const bar=$('phUndo');
// Save as palette card: opens the palette editor (account.js) filled with one colour per chosen paint. The photo is only uploaded if the painter adds it there.
$('phSave').onclick=()=>{const cs=COLS.filter(c=>c.pick);if(!cs.length)return;
 NMM_DRAFT={kind:'palette',title:'',steps:cs.map(c=>({title:'',text:'',image:'',recipe:'',mix:[{k:c.pick.k,parts:1}]}))};dlg.close();location.hash='#/new/palette'};
// Shows just these paints on the wheel (Colours mode) with an Undo bar; also used by the Palettes page.
window.pdShowSet=(ps,msg)=>{prev=P.filter(p=>p.on).map(p=>p.i);P.forEach(p=>p.on=false);ps.forEach(p=>p.on=true);if(MODE!=='col')setMode('col');sync();
 $('phUndoM').textContent=msg;bar.hidden=false;clearTimeout(tm);tm=setTimeout(()=>bar.hidden=true,15000);
 document.getElementById('w').scrollIntoView({behavior:'smooth',block:'start'})};
$('phGo').onclick=()=>{const ps=[...new Set(COLS.map(c=>c.pick).filter(Boolean))];if(!ps.length)return;dlg.close();
 pdShowSet(ps,`Showing ${ps.length} paint${ps.length===1?'':'s'} from your photo.`)};
$('phUndoB').onclick=()=>{clearTimeout(tm);bar.hidden=true;if(!prev)return;const s=new Set(prev);P.forEach(p=>p.on=s.has(p.i));prev=null;sync()}}
/* ---------- Inspiration palettes (#/palettes) ----------
   Original themed palettes from palettes.js. Each colour is a target swatch with a job (main, accent, metal...), matched to the
   nearest opaque paints (metallic paints for a metal colour) by ΔE, from one brand or all, or only the painter's own paints.
   Picks can be changed per colour, shown on the wheel, opened in Blends or saved as a palette card. Swatches are estimates. */
{const $=id=>document.getElementById(id),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PL=typeof PALETTES==='undefined'?[]:PALETTES,TAGS=[...new Set(PL.flatMap(x=>x.t))];
PL.forEach(x=>x.c.forEach(c=>c.lab=hexLab(c.h)));
let ST={b:'',mine:0,t:''},PK={},CUR=null;try{Object.assign(ST,JSON.parse(localStorage.getItem('pd-pal')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('pd-pal',JSON.stringify(ST))}catch(e){}};
const mine=()=>!!ST.mine&&!!OWN&&OWN.size>0;
const pool=c=>P.filter(p=>!p.mix&&p.g!=='B'&&(c.m?paintType(p)==='met':paintType(p)==='op')&&(ST.b===''||BR_OF[p.g]===+ST.b));
// Up to 4 nearest paints per colour; with "Use my paints" the owned paints come first, then the nearest others if fewer than 2 are owned.
function near(c){const seen=new Set(),all=pool(c).map(p=>({p,d:dE(c,p)})).sort((a,b)=>a.d-b.d).filter(m=>{const k=BR_OF[m.p.g]+'|'+m.p.n.trim().toLowerCase();return!seen.has(k)&&seen.add(k)});if(!mine())return all.slice(0,4);
 const o=all.filter(m=>own(m.p)).slice(0,4);return o.length>=2?o:[...o,...all.filter(m=>!own(m.p)).slice(0,4-o.length)]}
function matchAll(x){const used=new Set();return x.c.map((c,ci)=>{const m=near(c),k=(PK[x.s]||{})[ci];let pick=m.find(q=>q.p.k===k)||m.find(q=>!used.has(q.p))||m[0]||null;
 if(pick)used.add(pick.p);return{c,m:pick&&!m.includes(pick)?[pick,...m]:m,pick}})}
const strip=x=>`<div class="phpal">${x.c.map(c=>`<i style="background:${c.h};flex:1" title="${esc(c.r+': '+c.u)}"></i>`).join('')}</div>`;
function bar(){const o=BRANDS.map(([n],i)=>`<option value="${i}"${ST.b===String(i)?' selected':''}>${esc(n.split(' / ')[0])}</option>`).join('');
 return`<div class="row plbar"><label>Paints from <select id="plB" class="nsel"><option value="">All brands</option>${o}</select></label>`+
  (OWN&&OWN.size?`<label><input type="checkbox" id="plMine"${ST.mine?' checked':''}> Use my paints</label>`:'')+`</div>`}
function gallery(el){const xs=PL.filter(x=>!ST.t||x.t.includes(ST.t));
 el.innerHTML=`<h1>Palettes</h1><p class="lead">Colour schemes to get you started. Pick one and every colour is matched to the nearest paints, from the brands you like or the paints you already own. Show it on the wheel, build blends from it or save it as a palette card.</p>
<p class="s">These palettes are our own ideas, made for The Painters Desk. Paint matches come from swatch estimates, so check the real paints before you start. Want a palette from a picture instead? Use <a href="#/">From a photo</a> on the wheel.</p>`+
 `<div class="chips pltags" role="group" aria-label="Filter by theme">${['',...TAGS].map(t=>`<button type="button" class="chip${ST.t===t?' on':''}" data-t="${esc(t)}" aria-pressed="${ST.t===t}">${t?esc(t):'All'}</button>`).join('')}</div>`+
 `<div class="plg">${xs.map(x=>`<a class="plc panel" href="#/palettes/${x.s}">${strip(x)}<h3>${esc(x.n)}</h3><p>${esc(x.b)}</p><span class="s">${x.t.map(esc).join(' · ')}</span></a>`).join('')}</div>`;
 el.querySelector('.pltags').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;ST.t=b.dataset.t;save();gallery(el)}}
function detail(el,x){const R=matchAll(x),api=!!(window.pdApi&&pdApi()),hv=R.filter(r=>r.pick&&own(r.pick.p)).length;CUR={x,R};
 el.innerHTML=`<p><a href="#/palettes">← All palettes</a></p><h1>${esc(x.n)}</h1>${strip(x)}<p class="lead">${esc(x.b)}</p><p><b>Tip:</b> ${esc(x.tip)}</p>`+bar()+
 `<div class="panel plrows">`+R.map((r,ci)=>`<div class="phr"><span class="phs" style="background:${r.c.h}" title="Target colour"></span><div class="plcol"><b>${esc(r.c.r)}</b> <span class="s">${esc(r.c.u)}${r.c.m?' (metallic)':''}</span><div class="chips">`+
  (r.m.length?r.m.map(m=>`<button type="button" class="chip${r.pick&&m.p===r.pick.p?' on':''}" data-c="${ci}" data-i="${m.p.i}" aria-pressed="${!!(r.pick&&m.p===r.pick.p)}" title="${esc(GL[m.p.g])} · ΔE ${m.d.toFixed(1)}"><i style="background:${m.p.h}"></i><span>${star(m.p)}${esc(m.p.n)}<em>${esc(BRANDS[BR_OF[m.p.g]][0].split(' / ')[0])} · ${esc(GL[m.p.g])} · ΔE ${m.d.toFixed(0)}</em></span></button>`).join(''):'<span class="s">No paints of this kind here. Try All brands.</span>')+
  `</div></div>${r.pick&&!r.c.m?`<button type="button" class="btn sm" data-bl="${ci}" title="Open a shadow, mid and highlight for this colour in Blends">Blend</button>`:''}</div>`).join('')+
 `<p class="s">${OWN&&OWN.size?`You own ${hv} of the ${R.length} paints picked. `:''}Tap a paint to use it instead. ΔE is how far the paint is from the target colour: under about 6 is close. Swatches are estimates.</p></div>`+
 `<div class="row"><button type="button" class="btn pri" id="plShow">Show on wheel</button>${api?'<button type="button" class="btn" id="plSave" title="Save these paints as a palette card in Tutorials &amp; Recipes">Save as palette card</button>':''}<a class="btn" href="/guides/palettes/${x.s}">Paints in every brand</a>${OWN?`<a class="btn" href="#/paints?plan=pal:${x.s}">Plan it with my paints</a>`:''}</div>`;
 const B=$('plB');if(B)B.onchange=()=>{ST.b=B.value;save();detail(el,x)};const M=$('plMine');if(M)M.onchange=()=>{ST.mine=M.checked?1:0;save();detail(el,x)};
 el.querySelector('.plrows').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.bl!==undefined){const m=R[+b.dataset.bl].pick.p,band=pool({}).filter(p=>hd(p.H,m.H)<=20),bl=hBlend(m,band,p=>!mine()||own(p));
   bl.forEach(p=>{if(p)p.on=true});sync();location.hash='#/';setTimeout(()=>hOpenBlend(bl),60);return}
  if(b.dataset.c===undefined)return;(PK[x.s]=PK[x.s]||{})[+b.dataset.c]=P[+b.dataset.i].k;detail(el,x)};
 $('plShow').onclick=()=>{const ps=[...new Set(R.filter(r=>r.pick).map(r=>r.pick.p))],hid=ps.filter(p=>!shown(p)).length;location.hash='#/';
  setTimeout(()=>pdShowSet(ps,`Showing the ${x.n} palette (${ps.length} paints).`+(hid?` ${hid} hidden by Paint types.`:'')),60)};
 const S=$('plSave');if(S)S.onclick=()=>{NMM_DRAFT={kind:'palette',title:x.n,summary:x.b,steps:R.filter(r=>r.pick).map(r=>({title:r.c.r+': '+r.c.u,text:'',image:'',recipe:'',mix:[{k:r.pick.p.k,parts:1}]}))};location.hash='#/new/palette'}}
window.pdPalettes=id=>{const el=$('v-palettes');if(!el)return;const x=id&&PL.find(p=>p.s===id);if(x)detail(el,x);else gallery(el)}}
// Links from the paint pages (/paints/...) open the wheel at #/?paint=<paint key>: show that paint and select it.
function paintLink(){const m=location.hash.match(/[?&]paint=([^&]*)/);if(!m)return;let k='';try{k=decodeURIComponent(m[1])}catch(e){}
 history.replaceState(null,'','#/');const p=P.find(q=>q.k===k);if(!p)return;if(MODE!=='col')setMode('col');if(!p.on){p.on=true;sync()}
 if(CH.includes(p)){if(sel!==p)pick(p)}else neutralShow(p);document.getElementById('w').scrollIntoView({block:'start'})}
paintLink();addEventListener('hashchange',paintLink);
// Links from the technique guides (/guides/...) open the wheel at #/?ramp=<technique>: Ramps mode on that technique.
function rampLink(){const m=location.hash.match(/[?&]ramp=(\w+)/);if(!m)return;const bm=location.hash.match(/[?&]base=([^&]+)/);history.replaceState(null,'','#/');if(!TQ[m[1]])return;
 NMO.q=m[1];nmmSkip=[];if(MODE!=='nmm')setMode('nmm');else{nmmSave();nmmUI();draw()}
 // &base=<paint key> (from Suggested paints) builds the ramp on that paint straight away.
 if(bm){let k='';try{k=decodeURIComponent(bm[1])}catch(e){}const p=P.find(q=>q.k===k);if(p){if(!p.on){p.on=true;sync()}showP(p)}}
 document.getElementById('w').scrollIntoView({block:'start'})}
rampLink();addEventListener('hashchange',rampLink);

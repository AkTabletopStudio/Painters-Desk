const AB={Dark:'Dk',Bright:'Br',Yellow:'Yel',Orange:'Orng',Green:'Grn',Brown:'Brn',Burnt:'Brnt',Fluorescent:'Fluor',Golden:'Gld',Magenta:'Mag',Turquoise:'Turq',Ultramarine:'Ultram.',Pyrrole:'Pyr.',Shadow:'Shdw',Advanced:'Adv.',Petroleum:'Petrol.',Burgundy:'Burg.',Crimson:'Crim.',Mahogany:'Mahog.',Emerald:'Emer.',Neutral:'Neut.',Titanium:'Ti',Heavy:'Hvy',Faded:'Fdd',Wash:'Wsh',Flesh:'Flsh',Yellow_:''};
let g='M';const P=[];
RAW.split('\n').forEach(l=>{if(l[0]==='#'){g=l[1];return}const[n,c,h]=l.split('|');const r=parseInt(h.slice(1,3),16)/255,gg=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn,L=(mx+mn)/2;let H=0;
if(d){H=mx===r?((gg-b)/d)%6:mx===gg?(b-r)/d+2:(r-gg)/d+4;H=(H*60+360)%360}
const S=d?d/(1-Math.abs(2*L-1)):0;
P.push({n,c,h,g,H,S,L,lum:.299*r+.587*gg+.114*b,k:g+'|'+c+'|'+n})});
// Signed-in user's paint collection (set of paint keys), filled in by account.js. null when signed out.
let OWN=null,ONLY_MINE=false;const own=p=>!!OWN&&OWN.has(p.k),star=p=>own(p)?'<b class="own" title="In your collection">★</b> ':'';
let CH=[],NE=[],U=h=>h;const on={p:1},CX=500,CY=500;
function layout(){CH=P.filter(p=>p.on&&p.g!=='B'&&p.S>=.14&&p.L>.07&&p.L<.95);NE=P.filter(p=>p.on&&!CH.includes(p)).sort((a,b)=>a.L-b.L);
const MD=CH.length>140?44:54;const srt=[...CH].sort((a,b)=>a.L-b.L);srt.forEach((p,i)=>p.rk=i/Math.max(1,srt.length-1));
U=h=>h;
CH.forEach(p=>{const a=U(p.H)*Math.PI/180-Math.PI/2,r=135+(.55*p.rk+.45*Math.min(1,Math.max(0,(p.L-.1)/.85)))*320;p.ox=CX+r*Math.cos(a);p.oy=CY+r*Math.sin(a);p.x=p.ox;p.y=p.oy});
for(let it=0;it<500;it++){for(let i=0;i<CH.length;i++){const a=CH[i];for(let j=i+1;j<CH.length;j++){const b=CH[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<MD){const k=(MD-d)/2/d;a.x-=dx*k;a.y-=dy*k;b.x+=dx*k;b.y+=dy*k}}
a.x+=(a.ox-a.x)*.008;a.y+=(a.oy-a.y)*.008;const dx=a.x-CX,dy=a.y-CY,d=Math.hypot(dx,dy);if(d>455||d<125){const t=Math.min(455,Math.max(125,d))/d;a.x=CX+dx*t;a.y=CY+dy*t}}}}
function lines(n){let w=n.split(' ').map(x=>AB[x]||x);if(w.length===1)return w;let best=1,bm=1e9;for(let k=1;k<w.length;k++){const m=Math.max(w.slice(0,k).join(' ').length,w.slice(k).join(' ').length);if(m<bm){bm=m;best=k}}return[w.slice(0,best).join(' '),w.slice(best).join(' ')]}
function hd(a,b){const d=Math.abs(a-b)%360;return d>180?360-d:d}
/* ---------- NMM (non-metallic metal) mode ----------
   Tap a paint and it builds a light ramp for painting it as NMM: deep shadow → base → white glint.
   Shadows darken, dull and (for warm metals) lean red-brown; highlights drain toward ivory. Each stop takes the
   nearest ticked opaque paint by ΔE (lightness weighted, since value contrast is what sells NMM). Swatches are estimates. */
let MODE='col',NB=null,nmmSkip=[],NMM_DRAFT=null;const NMO={n:7,t:false};
try{const o=JSON.parse(localStorage.getItem('pd-nmm'));if(o){MODE=o.m==='nmm'?'nmm':'col';NMO.n=o.n===5?5:7;NMO.t=!!o.t}}catch(e){}
const nmmSave=()=>{try{localStorage.setItem('pd-nmm',JSON.stringify({m:MODE,n:NMO.n,t:NMO.t}))}catch(e){}};
// NMM is built with opaque layer paints: leave out metallics, washes, contrast/speed, inks, glazes, primers, fluoros, pigments, textures.
const NMM_NO=new Set(['X','u','m','L','q','W','s','w','z','n','i','c','S','T','r','t','P','G','B','F','f','1']);
const NMM_RX=/metal|gold|silver|bronze|brass|copper|steel|iron\b|chrome|gunmetal|leadbelcher|retributor|balthasar|warplock|screaming bell|stormhost|liberator|auric|gehenna|sycorax|necron|runefang|ironbreaker|canoptek|fulgurite|hashut|skullcrusher|aluminium|aluminum|titanium|pewter|platinum|nickel|wash|glaze|\bink\b|contrast|speedpaint|filter|fluo|primer|pigment|texture|varnish|medium|transparent/i;
const nmmOK=p=>!NMM_NO.has(p.g)&&!NMM_RX.test(p.n)&&!NMM_RX.test(p.c);
const lch=p=>[p.lab[0],Math.hypot(p.lab[1],p.lab[2]),(Math.atan2(p.lab[2],p.lab[1])*180/Math.PI+360)%360];
const lab3=(L,C,h)=>[L,C*Math.cos(h*Math.PI/180),C*Math.sin(h*Math.PI/180)];
const hdS=(a,b)=>(b-a+540)%360-180;
function nmmTargets(b){const[L0,C0,h0]=lch(b),warm=C0>12&&h0>20&&h0<110,sh=warm?hdS(h0,45)*.6:0,hl=warm?hdS(h0,95)*.5:0,n=NMO.n,out=[];
const dk=n===7?['Deep shadow','Shadow','Dark mid']:['Deep shadow','Shadow'],lt=n===7?['Highlight','Bright highlight']:['Highlight'];
dk.forEach((r,k)=>{const t=k/dk.length;out.push({r,t:lab3(9+(L0-9)*t,C0*(.3+.6*t),h0+sh*(1-t))})});
out.push({r:'Base',t:b.lab,base:1});
lt.forEach((r,k)=>{const t=(k+1)/(lt.length+1);out.push({r,t:lab3(L0+(96-L0)*t,C0*(1-.6*t),h0+hl*t)})});
out.push({r:'Glint',t:lab3(98,3,h0)});
// Tinted shadow: purple under warm metals, warm brown under greys/steel, otherwise the complement.
if(NMO.t){out[0].t=lab3(12,Math.max(14,C0*.45),warm?305:C0<12?60:(h0+180)%360);out[0].tint=1}
return out}
function nmmRamp(b){const pool=P.filter(p=>p.on&&nmmOK(p)&&(!ONLY_MINE||own(p))),used=new Set(),ok=nmmOK(b)&&(!ONLY_MINE||own(b));
const w=(a,c)=>Math.hypot(1.6*(a[0]-c[0]),a[1]-c[1],a[2]-c[2]),d76=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]);
if(ok)used.add(b);
return nmmTargets(b).map((x,i)=>{if(x.base&&ok)return{...x,p:b,d:0,pick:1};
const c=pool.filter(q=>!used.has(q)).map(q=>({q,d:w(q.lab,x.t)})).sort((a,c)=>a.d-c.d);if(!c.length)return{...x,p:null};
const m=c[(nmmSkip[i]||0)%Math.min(c.length,8)].q;used.add(m);return{...x,p:m,d:d76(m.lab,x.t),alt:c.length>1}})}
const labHex=([L,A,B])=>{const fy=(L+16)/116,iv=t=>t**3>.008856?t**3:(t-16/116)/7.787,X=iv(fy+A/500)*.95047,Y=iv(fy),Z=iv(fy-B/200)*1.08883;
const s=v=>{v=v>.0031308?1.055*v**(1/2.4)-.055:12.92*v;return Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')};
return'#'+s(3.2406*X-1.5372*Y-.4986*Z)+s(-.9689*X+1.8758*Y+.0415*Z)+s(.0557*X-.204*Y+1.057*Z)};
// Wheel overlay: the ramp as a path through the paints that sit on the wheel, and the centre disc painted as the ramp (glint at the top).
function nmmWheel(R){const on=R.filter(x=>x.p&&CH.includes(x.p));let s='';
if(on.length>1)s+=`<polyline points="${on.map(x=>x.p.x+','+x.p.y).join(' ')}" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" opacity=".6"/>`;
const st=R.filter(x=>x.p).reverse();
return s+`<defs><linearGradient id="ng" x1="0" y1="0" x2="0" y2="1">${st.map((x,i)=>`<stop offset="${(i/Math.max(1,st.length-1)).toFixed(3)}" stop-color="${x.p.h}"/>`).join('')}</linearGradient></defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#ng)" stroke="#1b1b1b" stroke-width="3"><title>NMM ramp, glint to deep shadow</title></circle>`}
const NMM_TIP={'Deep shadow':'Thin coats into the deepest recesses and the side facing away from the light.','Shadow':'Most of the shaded half. Keep the edge against the base fairly crisp.','Dark mid':'Blend the shadow into the base.','Base':'The colour the metal reads as. Cover the lit half.','Highlight':'Narrower band where light falls, leaving base showing around it.','Bright highlight':'A smaller band inside the highlight.','Glint':'Tiny dots or a sharp line where the light hits hardest.'};
function nmmPanel(b,R){const el=document.getElementById('sel'),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const q=d=>d<6?['close','Close']:d<12?['fair','Fair']:['loose','Loose'],metal=!nmmOK(b);
const rows=R.map((x,i)=>{const role=x.r+(x.tint?' · tinted':'');if(!x.p)return`<div class="nrow"><div class="nrole">${role}</div><span class="nsw" style="background:${labHex(x.t)}"></span><div class="nnm"><b>No ticked paint left</b><span>Tick more ranges to fill this step</span></div></div>`;
const [qc,ql]=x.pick?['pick','Your pick']:q(x.d);
return`<div class="nrow${x.base?' nbase':''}"><div class="nrole">${role}</div><span class="nsw" style="background:${x.p.h}" title="Paint"><i style="background:${labHex(x.t)}" title="Ramp target"></i></span><div class="nnm"><b>${star(x.p)}${esc(x.p.n)}</b><span>${esc(GL[x.p.g])}${x.p.c?' · '+esc(x.p.c):''}</span></div><span class="nq ${qc}" title="${x.pick?'':'ΔE '+x.d.toFixed(1)+' from the ramp target'}">${ql}</span>${x.alt?`<button type="button" class="nsk" data-sk="${i}" title="Try the next nearest paint" aria-label="Swap ${esc(x.r)} paint">↻</button>`:'<span></span>'}</div>`}).join('');
const st=R.filter(x=>x.p).reverse(),off=st.map((x,i)=>(i/Math.max(1,st.length-1)).toFixed(3));
el.innerHTML=`<b>NMM ramp from:</b> <div class="chips"><span class="chip"><i style="background:${b.h}"></i>${star(b)}${esc(b.n)} <span style="color:var(--mut)">${esc(b.c)}</span></span></div>`+
(metal?'<p class="s">That\'s a metallic or effect paint, so the base uses the nearest opaque paint instead.</p>':'')+
`<div class="nrows">${rows}</div>
<svg class="blade" viewBox="0 0 300 90" role="img" aria-label="Ramp preview on a sword blade"><defs><linearGradient id="nb" x1="0" y1="0" x2="0" y2="1">${st.map((x,i)=>`<stop offset="${off[i]}" stop-color="${x.p.h}"/>`).join('')}</linearGradient></defs><rect x="6" y="38" width="44" height="14" rx="3" fill="#5a3a1a" stroke="#1b1b1b" stroke-width="2.5"/><rect x="48" y="20" width="12" height="50" rx="3" fill="url(#nb)" stroke="#1b1b1b" stroke-width="2.5"/><path d="M60 26 L262 26 L294 45 L262 64 L60 64 Z" fill="url(#nb)" stroke="#1b1b1b" stroke-width="3" stroke-linejoin="round"/></svg>
<p class="s">Small dot = the colour the ramp asks for; big dot = the nearest of your ticked paints (${ONLY_MINE?'from your collection only':'tick more ranges for closer matches'}). Close / Fair / Loose = ΔE under 6, under 12, above that. ↻ swaps a step for the next nearest paint. Swatches are estimates, so check the ramp on the model.</p>
<div class="row"><button class="btn" type="button" id="nmmTut">Save as tutorial</button></div>`;
el.querySelectorAll('[data-sk]').forEach(e=>e.onclick=()=>{const i=+e.dataset.sk;nmmSkip[i]=(nmmSkip[i]||0)+1;draw()});
document.getElementById('nmmTut').onclick=()=>{NMM_DRAFT={kind:'tutorial',title:'NMM '+b.n.trim(),summary:'Non-metallic metal ramp built on the Painters Desk wheel.',
 steps:R.filter(x=>x.p).map(x=>({title:x.r,text:NMM_TIP[x.r]||'',image:'',mix:[{k:x.p.k,parts:1}]}))};location.hash='#/new'}}
function nmmUI(){const n=MODE==='nmm';document.getElementById('mCol').classList.toggle('pri',!n);document.getElementById('mNmm').classList.toggle('pri',n);
document.getElementById('mCol').setAttribute('aria-pressed',!n);document.getElementById('mNmm').setAttribute('aria-pressed',n);document.getElementById('nmmOpt').hidden=!n;
document.getElementById('nSteps').value=String(NMO.n);document.getElementById('nTint').checked=NMO.t}
function setMode(m){MODE=m;nmmSave();nmmUI();nmmSkip=[];if(m==='nmm')NB=sel;else if(NB&&!CH.includes(NB)){const p=NB;NB=null;draw();neutralShow(p);return}draw()}
document.getElementById('mCol').onclick=()=>setMode('col');document.getElementById('mNmm').onclick=()=>setMode('nmm');
document.getElementById('nSteps').onchange=e=>{NMO.n=+e.target.value;nmmSkip=[];nmmSave();draw()};
document.getElementById('nTint').onchange=e=>{NMO.t=e.target.checked;nmmSkip=[];nmmSave();draw()};
nmmUI();
const svg=document.getElementById('w');let sel=null;
function draw(){let s='';
for(let h=0;h<360;h+=10){const a0=U(h-5)*Math.PI/180-Math.PI/2,a1=U(h+5)*Math.PI/180-Math.PI/2,R=480,r=110;
s+=`<path d="M${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}L${CX+R*Math.cos(a0)} ${CY+R*Math.sin(a0)}A${R} ${R} 0 0 1 ${CX+R*Math.cos(a1)} ${CY+R*Math.sin(a1)}L${CX+r*Math.cos(a1)} ${CY+r*Math.sin(a1)}A${r} ${r} 0 0 0 ${CX+r*Math.cos(a0)} ${CY+r*Math.sin(a0)}Z" fill="hsl(${h},65%,50%)" opacity=".16"/>`}
[.2,.5,.8].forEach(l=>s+=`<circle cx="${CX}" cy="${CY}" r="${140+l*300}" fill="none" stroke="currentColor" opacity=".18" stroke-dasharray="4 6"/>`);
if(!sel)s+=`<text x="${CX}" y="${CY-8}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">darker ←</text><text x="${CX}" y="${CY+14}" text-anchor="middle" fill="currentColor" opacity=".5" font-size="15">→ lighter (rim)</text>`;
const hn={0:'Red',30:'Orange',60:'Yellow',120:'Green',180:'Cyan',240:'Blue',280:'Violet',320:'Magenta'};
for(const h in hn){const a=U(+h)*Math.PI/180-Math.PI/2;s+=`<text x="${CX+492*Math.cos(a)}" y="${CY+492*Math.sin(a)+4}" text-anchor="middle" font-size="13" fill="currentColor" opacity=".6">${hn[h]}</text>`}
let comp=[],ana=[];const NBp=MODE==='nmm'?NB:null,R=NBp?nmmRamp(NBp):null;
if(sel&&!R){const th=(sel.H+180)%360;const cands=CH.filter(p=>p!==sel);comp=cands.filter(p=>hd(p.H,th)<=22).sort((a,b)=>hd(a.H,th)-hd(b.H,th)).slice(0,6);
ana=cands.filter(p=>hd(p.H,sel.H)<=25).sort((a,b)=>hd(a.H,sel.H)-hd(b.H,sel.H)).slice(0,6);
const a=th*Math.PI/180-Math.PI/2,b=sel.H*Math.PI/180-Math.PI/2;
s+=`<line x1="${sel.x}" y1="${sel.y}" x2="${CX+440*Math.cos(U(th)*Math.PI/180-Math.PI/2)}" y2="${CY+440*Math.sin(U(th)*Math.PI/180-Math.PI/2)}" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" opacity=".55"/>`}
// Centre disc: gradient from the complements, through the selected paint, out to its neighbours, laid along the complement→selected axis.
// Each group is ordered by how close its lightness is to the selected paint, so the blend ramps outward instead of striping.
if(R)s+=nmmWheel(R);
if(sel&&!R){const byL=(a,b)=>Math.abs(a.L-sel.L)-Math.abs(b.L-sel.L),st=[...[...comp].sort(byL).reverse(),sel,...[...ana].sort(byL)],ax=sel.H*Math.PI/180-Math.PI/2,ux=Math.cos(ax)/2,uy=Math.sin(ax)/2,mid=comp.length/Math.max(1,st.length-1);
const off=i=>st.length<2?0:i<comp.length?i/Math.max(1,comp.length)*mid*.9:i===comp.length?mid:mid+(1-mid)*(.1+.9*(i-comp.length)/Math.max(1,ana.length));
s+=`<defs><linearGradient id="cg" x1="${.5-ux}" y1="${.5-uy}" x2="${.5+ux}" y2="${.5+uy}">${st.map((p,i)=>`<stop offset="${off(i).toFixed(3)}" stop-color="${p.h}"/>`).join('')}</linearGradient></defs><circle id="cgd" cx="${CX}" cy="${CY}" r="96" fill="url(#cg)" stroke="#1b1b1b" stroke-width="3"><title>Complements → ${sel.n} → neighbours</title></circle>`}
const show=document.getElementById('lab').checked;const R0=CH.length>140?20:26,kk=R0/26;
CH.forEach(p=>{const on=R?R.some(x=>x.p===p):!sel||p===sel||comp.includes(p)||ana.includes(p);const ls=lines(p.n),tc=p.lum>.55?'#111':'#fff';
const st=(p.g==='W'||p.g==='s'||p.c.endsWith(' Wash'))?'stroke="#fff" stroke-dasharray="3 3"':p.g==='F'?`stroke="${p.h}" style="filter:drop-shadow(0 0 6px ${p.h})"`:'stroke="#1b1b1b"';
const sw=p===sel?5:comp.includes(p)?4:2;
s+=`<g class="dot" data-i="${P.indexOf(p)}" opacity="${on?1:.2}"><circle cx="${p.x}" cy="${p.y}" r="${R0}" fill="${p.h}" ${st} stroke-width="${p===sel?4:2}"${comp.includes(p)||(R&&p!==sel&&R.some(x=>x.p===p))?' stroke="#fff" stroke-width="4"':''}/>`+
(show?`<g transform="translate(${p.x} ${p.y}) scale(${kk}) translate(${-p.x} ${-p.y})">`+ls.map((t,i)=>`<text x="${p.x}" y="${p.y-(ls.length*8-4)/1+i*8.5-2+4}" font-size="7.5" fill="${tc}">${t}</text>`).join('')+`<text x="${p.x}" y="${p.y+20-(ls.length>1?1:-3)-(ls.length>1?0:0)}" font-size="6.5" fill="${tc}" opacity=".8">${p.c}</text></g>`:'')+`<title>${p.n} (${p.c})</title></g>`});
svg.innerHTML=s;
svg.querySelectorAll('.dot').forEach(e=>e.onclick=()=>pick(P[+e.dataset.i]));
const chip=p=>`<span class="chip"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`;
if(R){nmmPanel(NBp,R);return}
if(MODE==='nmm'){document.getElementById('sel').innerHTML='<b>Tap a paint on the wheel or in the neutrals list to build its NMM ramp.</b>';return}
document.getElementById('sel').innerHTML=sel?`<b>Selected:</b> <div class="chips">${chip(sel)}</div><h2>Complements (opposite on the wheel)</h2><div class="chips">${comp.length?comp.map(chip).join(''):'<span class="s">Neutral: no true opposite. Try a cool or warm grey.</span>'}</div><h2>Analogous neighbors</h2><div class="chips">${ana.map(chip).join('')}</div><p class="s">Underpainting tip: complements make strong shadow or contrast underlayers and tone down saturation; analogous neighbors make smooth glazes and transitions.</p>`+matchHTML(sel):'<b>Tap a paint on the wheel or in the neutrals list.</b>';if(sel)wireMatch(sel)}
function pick(p){sel=p===sel?null:p;NB=sel;nmmSkip=[];draw()}
document.getElementById('lab').onchange=draw;
function renderNeu(){document.getElementById('neu').innerHTML=NE.map((p,i)=>`<span class="chip" data-i="${P.indexOf(p)}"><i style="background:${p.h}"></i>${star(p)}${p.n} <span style="color:var(--mut)">${p.c}</span></span>`).join('');
document.querySelectorAll('#neu .chip').forEach(e=>e.onclick=()=>neutralShow(P[+e.dataset.i]));
document.getElementById('neuN').textContent=NE.length===1?'(1 paint)':`(${NE.length} paints)`}
{const d=document.getElementById('neud');try{d.open=localStorage.getItem('pd-neu')==='1'}catch(e){}d.ontoggle=()=>{try{localStorage.setItem('pd-neu',d.open?'1':'0')}catch(e){}}}
const GL={A:'Warpaints Fanatic',C:'John Blanche Vol. 1-4',R:'Warpaints Air',S:'Speedpaint 2.0',b:'Colour: Base',s:'Colour: Shade',l:'Colour: Layer',c:'Colour: Contrast',t:'Colour: Technical',a:'Colour: Air',d:'Colour: Dry',p:'Tone Pro',M:'Standard / Signature / AMP',W:'Washes',F:'Fluorescents',T:'Transparents',X:'Metallics','1':'1-Step',E:'Expert Acrylics',P:'Primers',G:'Weathering pigments',B:'Basing textures (list only)',K:'AK Quick Gen',e:'3rd Gen Standard',g:'3rd Gen Intense',j:'3rd Gen Pastel',m:'3rd Gen Metallic',n:'3rd Gen Ink',o:'3rd Gen AFV Series',v:'3rd Gen Figure Series',y:'3rd Gen Air Series',V:'Game Color',u:'Game Color Metallic',i:'Game Color Ink',f:'Game Color Special FX / Fluo',x:'Xpress Color',w:'Game Color Wash',L:'True Metallic Metal',Y:'Model Air',Z:'Model Color',H:'Color wheel: outer ring (highlights)',N:'Color wheel: middle ring (midtones)',O:'Color wheel: inner ring (shadows)',J:'Brights',q:'Metallics',z:'Washes',r:'Glazes',k:'Tonal families & flesh tones'};
const BRANDS=[['Army Painter',['A','C','R','S']],['Citadel / Warhammer',['b','s','l','c','t','a','d','p']],['Pro Acryl',['M','W','F','T','X','1','E','P','G','B']],['Vallejo',['V','u','i','f','x','w','Y','Z','L']],['AK Interactive',['K','e','g','j','m','n','o','v','y']],['Two Thin Coats',['H','N','O','J','q','z','r','k']]];

const BR_OF={};BRANDS.forEach(([bn,gs],bi)=>gs.forEach(g=>BR_OF[g]=bi));
(function(){const f=v=>{v/=255;return v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92};
P.forEach(p=>{const r=f(parseInt(p.h.slice(1,3),16)),g=f(parseInt(p.h.slice(3,5),16)),b=f(parseInt(p.h.slice(5,7),16));
let x=(.4124*r+.3576*g+.1805*b)/.95047,y=.2126*r+.7152*g+.0722*b,z=(.0193*r+.1192*g+.9505*b)/1.08883;const t=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
p.lab=[116*t(y)-16,500*(t(x)-t(y)),200*(t(y)-t(z))]})})();
const dE=(a,b)=>Math.hypot(a.lab[0]-b.lab[0],a.lab[1]-b.lab[1],a.lab[2]-b.lab[2]);
const MSRC={t:'Two Thin Coats comparison chart',f:'Army Painter Fanatic conversion chart',h:'Herrick Games paint comparison chart',k:'AK 3rd Generation equivalence chart'};
function matchData(p){const i=P.indexOf(p),mine=q=>!ONLY_MINE||own(q),doc=(MT[i]||[]).map(([j,s])=>({p:P[j],s,d:dE(p,P[j])})).filter(m=>mine(m.p)),out=[];
BRANDS.forEach(([bn,gs],bi)=>{if(BR_OF[p.g]===bi)return;const ch=doc.filter(m=>BR_OF[m.p.g]===bi).sort((a,b)=>a.d-b.d);
const have=new Set(ch.map(m=>m.p));const near=P.filter(q=>BR_OF[q.g]===bi&&q.g!=='B'&&!have.has(q)&&mine(q)).map(q=>({p:q,d:dE(p,q)})).sort((a,b)=>a.d-b.d).slice(0,ch.length?2:3);
out.push({bn,ch,near})});return out}
function matchHTML(p){const md=matchData(p);let h='<div class="mt"><h2>Matches in other ranges</h2><p class="s"><b style="color:#2a9d5c">✓</b> = listed as an equivalent in a manufacturer / community conversion chart. ≈ = closest swatch colour (ΔE shown; under ~6 is a close match, over ~15 is a loose one). Matches are close, never exact. Tap a chip to add it to the wheel.</p>';
const c=(m,k)=>`<span class="chip${k?' ck':''}" data-mi="${P.indexOf(m.p)}" title="${k?MSRC[m.s]+' · ':''}${GL[m.p.g]} · ΔE ${m.d.toFixed(1)}"><i style="background:${m.p.h}"></i>${k?'<b>✓</b> ':'≈ '}${star(m.p)}${m.p.n} <em>${GL[m.p.g]} · ΔE ${m.d.toFixed(0)}</em></span>`;
md.forEach(o=>{if(!o.ch.length&&!o.near.length)return;h+=`<div class="br2"><div class="bl">${o.bn}</div><div class="chips">${o.ch.map(m=>c(m,1)).join('')}${o.near.map(m=>c(m,0)).join('')}</div></div>`});
if(ONLY_MINE&&!md.some(o=>o.ch.length||o.near.length))h+='<p class="s">None of your paints from other ranges match this one.</p>';return h+'<button type="button" id="mAddDoc">Add all ✓ chart matches to wheel</button><button type="button" id="mAddAll">Add all matches shown</button></div>'}
function addOn(list,p){list.forEach(q=>q.on=true);layout();renderNeu();boxes();showP(p);remember()}
function showP(p){if(MODE==='nmm'){NB=p;sel=CH.includes(p)?p:null;draw()}else if(CH.includes(p)){sel=p;draw()}else{sel=null;draw();neutralShow(p)}}
function wireMatch(p){const el=document.getElementById('sel');
el.querySelectorAll('.mt .chip').forEach(e=>e.onclick=()=>{const q=P[+e.dataset.mi];addOn([q],q)});
const md=matchData(p),a=document.getElementById('mAddDoc'),b=document.getElementById('mAddAll');
if(a)a.onclick=()=>addOn(md.flatMap(o=>o.ch.map(m=>m.p)),p);if(b)b.onclick=()=>addOn(md.flatMap(o=>[...o.ch,...o.near].map(m=>m.p)),p)}
function neutralShow(p){if(MODE==='nmm'){sel=null;NB=p;nmmSkip=[];draw();return}document.getElementById('sel').innerHTML=`<b>Selected:</b> <div class="chips"><span class="chip"><i style="background:${p.h}"></i>${p.n} <span style="color:var(--mut)">${p.c}</span></span></div><p class="s">Neutral paint: it sits outside the hue wheel. Use it to dull a neighboring color or set value in an underpainting; warm greys pair with oranges and flesh, cool greys with blues.</p>`+matchHTML(p);wireMatch(p)}
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
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

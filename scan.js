// Scan paints (My paints): point the camera at pots, or pick a photo, and the paints it reads are listed to check before anything is added.
// Two ways in, both run on the phone; nothing is uploaded:
//  - Label text: Tesseract OCR (scan/, loaded the first time you read a label) reads the words, then names and codes are matched
//    against data.js the same way the CSV import matches rows (csvIndex/csvNorm in account.js, plus import-aliases.js).
//  - Barcodes: the browser's BarcodeDetector where there is one, else ZXing (scan/zxing-reader.js). Looked up in scan/barcodes.js
//    (Paint Commons catalog, see tools/build_scan_barcodes.py), then Vallejo's pattern (8429551 + the 5-digit code + check digit,
//    72.001 Dead White = 8429551720014). Any other barcode says so and asks for the label instead.
// Loaded on demand by account.js, which hands over its matching and collection helpers (it runs inside its own closure).
window.pdScan=function(A){const{csvIndex,csvNorm,csvCode,csvLev,csvAlLoad,csvMatch,CSV_BR,setOwned,undoBar,askBulk,BULK,esc}=A;const paintsRedraw=A.redraw;
const SCAN={sig:null,still:0,lastSig:null,autoT:0,rows:[],stream:null,ocr:null,ocrP:null,zx:null,zxP:null,bd:undefined,timer:0,busy:false,seen:new Map(),n:0};
const scanEl=id=>document.getElementById(id);
const scanLoad=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});

// ---------- matching ----------
// Words on a pot that say nothing about which paint it is.
const SCAN_STOP=new Set('the and of a ml fl oz acrylic acrylics paint paints color colors colour water based non toxic toxic made in spain denmark uk usa china warning keep out reach children shake well before use contains www com net net wt e g ref no art'.split(' '));
let SCAN_BR=null,SCAN_LEN=null;
function scanBrands(){if(SCAN_BR)return SCAN_BR;const m=new Map();
 BRANDS.forEach(([bn],i)=>bn.split(' / ').forEach(x=>m.set(csvNorm(x).trim(),i)));
 Object.entries(CSV_BR).forEach(([k,v])=>{if(k.length>=3||k==='ak'||k==='gw')m.set(k,v)});
 // Words printed on the pots themselves.
 [['vallejo',3],['game color',3],['model color',3],['model air',3],['citadel',1],['army painter',0],['warpaints',0],['speedpaint',0],['pro acryl',2],['monument',2],['ak interactive',4],['3rd gen',4],['scale75',8],['scalecolor',8],['turbo dork',6],['tamiya',7],['green stuff world',9],['two thin coats',5],['reaper',12],['kimera',14],['golden',15],['warcolours',18],['ammo',10],['mig',10]].forEach(([k,v])=>m.set(k,v));
 return SCAN_BR=[...m].sort((a,b)=>b[0].length-a[0].length)}
function scanLens(){if(SCAN_LEN)return SCAN_LEN;const X=csvIndex(),by=new Map();
 for(const k of X.nm.keys()){const t=k.trim();if(t.length<5)continue;(by.get(t.length)||by.set(t.length,[]).get(t.length)).push(t)}
 return SCAN_LEN=by}
// One photo or frame of text -> the paints it most likely shows, best first.
function scanText(text){const X=csvIndex(),N=csvNorm(text),W=N.trim().split(' ').filter(Boolean),sc=new Map();
 let bi=null;for(const[k,v]of scanBrands())if(N.includes(' '+k+' ')){bi=v;break}
 const add=(l,v,why)=>(l||[]).forEach(p=>{if(!p||p.mix||p.g==='µ')return;const o=sc.get(p)||sc.set(p,{p,v:0,why:new Set()}).get(p);o.v+=v;o.why.add(why)});
 // Codes: a word, or two or three words run together (OCR often splits "72.001" or "WP 3001").
 for(let i=0;i<W.length;i++)for(let j=1;j<=3&&i+j<=W.length;j++){const c=csvCode(W.slice(i,i+j).join(''));if(!/\d/.test(c)||c.length<(bi==null?4:3))continue;
  add(X.cd.get(c),6,'code');add(X.ac.get(c),5,'code')}
 // Names: every run of 1-5 words, exact first; longer exact names score more. A run with no exact name gets a close-spelling check.
 const LEN=scanLens();let cov=0;
 // Shorter names inside a longer exact one ("Titanium White" in "Bold Titanium White") don't count again.
 for(let i=0;i<W.length;i++)for(let j=5;j>=1;j--){if(i+j>W.length||i+j<=cov)continue;const ws=W.slice(i,i+j);if(ws.every(w=>SCAN_STOP.has(w)||/^\d+$/.test(w)))continue;
  const g=ws.join(' '),hit=[...(X.nm.get(' '+g+' ')||[]),...(X.an.get(g)||[])];
  if(hit.length){if(j===1&&g.length<4)continue;add(hit,j===1?1.5:2+j*1.5,'name');cov=Math.max(cov,i+j);continue}
  if(g.length>=7&&j<=4){const d=g.length>=11?2:1;for(let L=g.length-d;L<=g.length+d;L++)(LEN.get(L)||[]).forEach(t=>{if(csvLev(g,t)<=d)add(X.nm.get(' '+t+' '),1+j,'close')})}}
 // Range words on the label (Base, Layer, Contrast, Air, Wash...) help pick between same-named paints.
 let l=[...sc.values()];if(bi!=null){const inB=l.filter(o=>BR_OF[o.p.g]===bi);if(inB.length)l=inB.map(o=>(o.v+=1,o))}
 l.forEach(o=>{const r=csvNorm(GL[o.p.g]).trim().split(' ').filter(w=>w.length>2&&!SCAN_STOP.has(w));if(r.length&&r.every(w=>N.includes(' '+w+' ')))o.v+=1.5});
 l.sort((a,b)=>b.v-a.v||(X.ord.get(a.p.g)||0)-(X.ord.get(b.p.g)||0));l=l.slice(0,8);
 if(!l.length)return{s:'none',l:[],bi};
 const top=l[0],sure=(top.why.has('code')&&top.why.has('name'))||(top.v>=5&&(!l[1]||top.v-l[1].v>=2));
 // Same name in two ranges (Base and Air) with the label's range word tipping it: ticked, with the other range one tap away.
 const twin=!sure&&top.v>=5&&l[1]&&csvNorm(l[1].p.n)===csvNorm(top.p.n)&&top.v>l[1].v;
 return{s:sure?'ok':twin?'pick':'close',l:l.map(o=>o.p),bi}}
const scanEanOk=s=>{if(!/^\d{13}$/.test(s))return false;let t=0;for(let i=0;i<12;i++)t+=(+s[i])*(i%2?3:1);return(10-t%10)%10===+s[12]};
// A barcode -> paints. Only Vallejo's (8429551 + code) can be read without a lookup list.
// Barcode list (scan/barcodes.js, from the Paint Commons catalog, CC0): brand, code, name and range for about 2,300 barcodes that are
// published on manufacturer or retailer listings, or worked out from the code (Army Painter, Vallejo). Matched to our paints with the
// CSV import's matcher, so a barcode for a paint we don't list says so instead of guessing.
let SCAN_BCP=null;const scanBcLoad=()=>SCAN_BCP||(SCAN_BCP=scanLoad('scan/barcodes.js').catch(()=>{SCAN_BCP=null}));
function scanCode(raw){const s=String(raw||'').replace(/\D/g,''),e=s.length===12?'0'+s:s,B=window.SCAN_BC&&SCAN_BC[e];
 if(B){const r=csvMatch(B[0],B[2],B[1],B[3]);return Object.assign(r,{lbl:B[0]+' '+B[2]})}
 const v=/^8429551(\d{5})\d$/.exec(s);
 if(v&&scanEanOk(s)){const c=v[1],X=csvIndex(),bi=3,l=[...new Set([...(X.cd.get(c)||[]),...P.filter(p=>!p.mix&&BR_OF[p.g]===bi&&csvCode(p.c).startsWith(c)&&csvCode(p.c).length>c.length)])].filter(p=>BR_OF[p.g]===bi);
  return l.length?{s:l.length===1?'ok':'pick',l,bi,code:c.slice(0,2)+'.'+c.slice(2)}:{s:'none',l:[],bi,code:c.slice(0,2)+'.'+c.slice(2)}}
 return{s:'bar',l:[],bi:null}}

// ---------- engines ----------
function scanOcr(){return SCAN.ocrP||(SCAN.ocrP=scanLoad('scan/tesseract.min.js').then(()=>Tesseract.createWorker('eng',1,{workerPath:'scan/worker.min.js',corePath:'scan/',langPath:'scan',gzip:true,workerBlobURL:false,logger:m=>{if(m.status==='loading language traineddata'||m.status==='loading tesseract core')scanSt('Getting the label reader ready (first time only)… '+Math.round((m.progress||0)*100)+'%')}})).then(w=>w.setParameters({tessedit_pageseg_mode:'11'}).then(()=>SCAN.ocr=w)).catch(e=>{SCAN.ocrP=null;throw e}))}
async function scanBars(src){
 if(SCAN.bd===undefined){SCAN.bd=null;try{if('BarcodeDetector'in window){const f=await BarcodeDetector.getSupportedFormats();const want=['ean_13','ean_8','upc_a','upc_e','code_128'].filter(x=>f.includes(x));if(want.length)SCAN.bd=new BarcodeDetector({formats:want})}}catch(e){}}
 if(SCAN.bd){try{return(await SCAN.bd.detect(src)).map(b=>b.rawValue)}catch(e){return[]}}
 if(!SCAN.zxP)SCAN.zxP=scanLoad('scan/zxing-reader.js').then(()=>{ZXingWASM.prepareZXingModule({overrides:{locateFile:(p,pre)=>p.endsWith('.wasm')?'scan/'+p:pre+p},fireImmediately:true});SCAN.zx=ZXingWASM}).catch(()=>{SCAN.zxP=null});
 await SCAN.zxP;if(!SCAN.zx)return[];
 const c=scanCanvas(src,960),d=c.getContext('2d').getImageData(0,0,c.width,c.height);
 try{return(await SCAN.zx.readBarcodes(d,{formats:['EAN13','EAN8','UPCA','UPCE','Code128'],tryHarder:true,maxNumberOfSymbols:4})).filter(r=>r.isValid).map(r=>r.text)}catch(e){return[]}}
function scanCanvas(src,max){const w=src.videoWidth||src.naturalWidth||src.width,h=src.videoHeight||src.naturalHeight||src.height,k=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');
 c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c}

// ---------- dialog ----------
const SCAN_HINT='Hold one pot\'s label in the box and keep it still. It reads on its own (or tap Read label).';
const scanSt=t=>{const e=scanEl('scSt');if(e)e.textContent=t};
function scanOpen(){scanWire();csvAlLoad();scanBcLoad();const d=scanEl('scDlg');SCAN.rows=[];SCAN.seen=new Map();SCAN.n=0;scanDraw();scanSt('');d.showModal();scanCam();
 // Start fetching the label reader straight away so the first Read label is quicker.
 scanOcr().then(()=>{if(/^Getting/.test(scanEl('scSt').textContent))scanSt(SCAN.stream?SCAN_HINT:'')}).catch(()=>{})}
async function scanCam(){const v=scanEl('scV'),box=scanEl('scCam');
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){box.hidden=true;scanSt('This browser can\'t use the camera here. Use Take or pick a photo instead.');return}
 try{SCAN.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  v.srcObject=SCAN.stream;await v.play().catch(()=>{});box.hidden=false;scanEl('scRead').disabled=false;scanSt(SCAN_HINT);scanLoop()}
 catch(e){box.hidden=true;scanSt(e&&e.name==='NotAllowedError'?'Camera access was blocked. Allow the camera for this site, or use Take or pick a photo.':'No camera found. Use Take or pick a photo instead.')}}
function scanStop(){clearTimeout(SCAN.timer);SCAN.sig=SCAN.lastSig=null;SCAN.still=0;SCAN.timer=0;if(SCAN.stream){SCAN.stream.getTracks().forEach(t=>t.stop());SCAN.stream=null}const v=scanEl('scV');if(v)v.srcObject=null}
// A tiny greyscale copy of the frame: used to tell when the camera is held still, and when it now shows something new.
function scanSig(v){const c=scanSig.c||(scanSig.c=document.createElement('canvas'));c.width=32;c.height=24;const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(v,0,0,32,24);const d=x.getImageData(0,0,32,24).data,g=new Float32Array(768);let m=0;for(let i=0;i<768;i++){g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;m+=g[i]}
 m/=768;let sd=0;for(let i=0;i<768;i++)sd+=(g[i]-m)**2;g.sd=Math.sqrt(sd/768);return g}
const scanDiff=(a,b)=>{if(!a||!b)return 255;let t=0;for(let i=0;i<a.length;i++)t+=Math.abs(a[i]-b[i]);return t/a.length};
// Barcodes every half second. Labels on their own: once the picture has stayed still for about a second, shows some detail
// (not a blank wall), and differs from the last picture read (or 5 seconds have passed), it is read like Read label. Only clear matches are added this way.
function scanLoop(){clearTimeout(SCAN.timer);if(!SCAN.stream)return;SCAN.timer=setTimeout(async()=>{const v=scanEl('scV');
 if(v&&v.readyState>=2&&!SCAN.busy){const cs=await scanBars(v);cs.forEach(c=>scanGotBar(c));
  if(SCAN.ocr&&!SCAN.busy&&!document.hidden){const g=scanSig(v),d=scanDiff(g,SCAN.sig);SCAN.sig=g;SCAN.still=d<6?SCAN.still+1:0;
   if(SCAN.still>=2&&g.sd>18&&Date.now()-SCAN.autoT>1500&&(scanDiff(g,SCAN.lastSig)>5||Date.now()-SCAN.autoT>5000)){SCAN.lastSig=g;SCAN.autoT=Date.now();await scanRead(v,true)}}}
 scanLoop()},450)}
function scanGotBar(c){const t=Date.now();if(SCAN.seen.has(c)&&t-SCAN.seen.get(c)<6000)return;const again=SCAN.seen.has(c);SCAN.seen.set(c,t);if(again)return;
 const r=scanCode(c);if(navigator.vibrate)try{navigator.vibrate(40)}catch(e){}
 scanPush(Object.assign(r,{src:'Barcode '+c+(r.lbl?' ('+r.lbl+')':r.code?' (Vallejo '+r.code+')':'')}))}
async function scanRead(src,auto){if(SCAN.busy)return;SCAN.busy=true;const b=scanEl('scRead');b.disabled=true;
 try{scanSt('Reading the label…');const w=await scanOcr();
  const c=scanCanvas(src,1600),{data}=await w.recognize(c),txt=(data.text||'').replace(/\s+/g,' ').trim();
  if(!txt){scanSt(auto?SCAN_HINT:'No words found. Move closer, hold steady, and make sure the label is lit.');return}
  const r=scanText(data.text);
  // Read on its own: only a clear match is listed (a best guess would add noise while the camera wanders). Read label lists guesses too.
  if(auto&&r.s!=='ok'&&r.s!=='pick'){scanSt(SCAN_HINT);return}
  const n=SCAN.rows.length;if(r.l.length)scanPush(Object.assign(r,{src:'Label: “'+(txt.length>60?txt.slice(0,57)+'…':txt)+'”'}));
  if(auto&&SCAN.rows.length>n&&navigator.vibrate)try{navigator.vibrate(40)}catch(e){}
  scanSt(auto?(SCAN.rows.length>n?'Got '+r.l[0].n.trim()+'. Show the next pot.':SCAN_HINT):r.l.length?'Got it. Read the next pot, or check the list and add.':'Couldn\'t match those words to a paint. Try again closer, or straighter on.')}
 catch(e){scanSt('The label reader couldn\'t start (it needs about 15 MB the first time). Check your connection and try again.')}
 finally{SCAN.busy=false;b.disabled=!SCAN.stream}}
async function scanPhoto(f){const img=new Image(),u=URL.createObjectURL(f);img.src=u;try{await img.decode()}catch(e){scanSt('That photo couldn\'t be opened.');URL.revokeObjectURL(u);return}
 SCAN.busy=true;scanSt('Looking for barcodes…');let n=0;try{(await scanBars(img)).forEach(c=>{n++;scanGotBar(c)})}catch(e){}SCAN.busy=false;
 await scanRead(img);URL.revokeObjectURL(u)}
function scanPush(r){r.i=SCAN.n++;
 // The same paint read twice (barcode then label, or two photos) is listed once.
 if(r.l.length&&r.s!=='close'&&SCAN.rows.some(x=>x.l[0]===r.l[0]&&x.s!=='close'))return;
 SCAN.rows.unshift(r);scanDraw()}
function scanDraw(){const out=scanEl('scOut');if(!out)return;const R=SCAN.rows;
 const opt=(p,sel)=>`<option value="${esc(p.k)}"${sel?' selected':''}>${esc(p.n.trim())}${p.c?' '+esc(p.c):''} · ${esc(BRANDS[BR_OF[p.g]][0].split(' / ')[0])} ${esc(GL[p.g])}${A.own().has(p.k)?' ★ owned':''}</option>`;
 out.innerHTML=R.length?`<div class="csvt">`+R.map(r=>{const p=r.l[0],own=p&&A.own().has(p.k),i=r.i;
  const tag=r.s==='bar'?'<span class="csvs kn">Barcode not listed</span>':!p?'<span class="csvs no">Not found</span>':own?'<span class="csvs ow">Already yours</span>':r.s==='ok'?'<span class="csvs ok">Match</span>':r.s==='pick'?'<span class="csvs pk">Check range</span>':'<span class="csvs cl">Best guess</span>';
  const pick=r.s==='bar'?'<span class="s">This barcode isn\'t in our list yet. Tap Read label with the name facing the camera.</span>':!p?`<span class="s">${r.lbl?esc(r.lbl)+' isn\'t on the site yet.':r.code?'Vallejo '+esc(r.code)+' isn\'t on the site yet.':'No paint matched.'}</span>`:r.l.length>1?`<select data-scp="${i}" aria-label="Which paint">${r.l.map((q,j)=>opt(q,!j)).join('')}</select>`:`<span class="csvp">${esc(p.n.trim())}${p.c?' <span class="s">'+esc(p.c)+'</span>':''} <span class="s">${esc(BRANDS[BR_OF[p.g]][0].split(' / ')[0])} · ${esc(GL[p.g])}</span></span>`;
  return`<label class="csvr"><input type="checkbox" data-sci="${i}"${p&&!own&&r.s!=='close'?' checked':''}${p?'':' disabled'}><i class="csvsw" style="background:${p?p.h:'transparent'}"></i><span class="csvm"><span class="csvsrc">${esc(r.src)} ${tag}</span>${pick}</span></label>`}).join('')+`</div>`:'<p class="s">Paints you scan show up here. Nothing is added until you tap Add.</p>';
 scanSum()}
function scanPicked(){const m=new Set(),out=scanEl('scOut');out.querySelectorAll('input[data-sci]:checked').forEach(e=>{const i=+e.dataset.sci,s=out.querySelector(`select[data-scp="${i}"]`),r=SCAN.rows.find(x=>x.i===i),k=s?s.value:r&&r.l[0]&&r.l[0].k;if(k&&!A.own().has(k))m.add(k)});return[...m]}
function scanSum(){const ks=scanPicked(),b=scanEl('scAdd'),n=SCAN.rows.length;
 scanEl('scSum').textContent=n?`${n} scanned, ${ks.length} new paint${ks.length===1?'':'s'} ticked.`:'';
 b.disabled=!ks.length;b.textContent=ks.length?`Add ${ks.length} paint${ks.length===1?'':'s'}`:'Add paints'}
function scanAdd(){const ks=scanPicked();if(!ks.length)return;scanEl('scDlg').close();
 const done=()=>{if(paintsRedraw)paintsRedraw()};if(ks.length>=BULK){askBulk(ks,'from your scan',true,done);return}setOwned(ks,true);undoBar(ks,true);done()}
function scanWire(){const d=scanEl('scDlg');if(!d||d.dataset.w)return;d.dataset.w=1;
 d.addEventListener('close',scanStop);scanEl('scRead').onclick=()=>scanRead(scanEl('scV'));scanEl('scAdd').onclick=scanAdd;
 scanEl('scFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)scanPhoto(f)};scanEl('scOut').addEventListener('change',scanSum)}
return scanOpen};

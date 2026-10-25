// Accounts, "My paints" collection, recipes & tutorials, and comments.
// Talks to the Worker API at /api/*. If the API isn't reachable (offline, or a static-only deploy),
// these extra pages stay hidden and the colour wheel works exactly as before.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BYKEY=new Map(P.map(p=>[p.k,p]));
// Water is a tutorial-only mix item (for thinning, washes and glazes). It isn't a paint, so it never goes on the wheel or in collections.
const WATER={k:'water',n:'Water',h:'linear-gradient(#f2fbff,#a9d6ee)'};
const mixP=k=>k===WATER.k?WATER:BYKEY.get(k);
const VIEWS=['welcome','changelog','wheel','paints','recipes','recipe','edit','account','profile','reset','admin'];
let ME=null,INFO=null,API=false;
window.pdApi=()=>API; // the wheel's From a photo offers Save as palette card only when accounts work

async function api(path,{method='GET',body}={}){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(d.error||'Something went wrong ('+r.status+')');e.status=r.status;throw e}
 return d}
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
// Recipe and palette cards lead with the colour strip (one band per layer or colour); tutorial cards lead with the model photo.
// A palette is a set of paints matched to a photo's colours; it is stored and shown like a recipe whose layers are its colours.
const KIND={recipe:{c:'trec',t:'Recipe',u:'layer'},tutorial:{c:'ttut',t:'Tutorial',u:'step'},palette:{c:'tpal',t:'Palette',u:'colour'}},kindOf=r=>KIND[r.kind]||KIND.recipe;
const cardHTML=r=>{const rec=r.kind!=='tutorial',K=kindOf(r),strip=rec?stripHTML(r.layers||[],'big'):'';
 return `<a class="card${rec?' rcard':''}" href="#/recipe/${esc(r.id)}">${strip||(r.cover?`<img class="thumb" src="${imgURL(r.cover)}" alt="" loading="lazy">`:'')}<h3>${esc(r.title)}</h3><span class="tag ${K.c}">${K.t}</span>${r.visibility==='private'?'<span class="tag">Private</span>':''}${r.steps?`<span class="tag">${r.steps} ${K.u}${r.steps===1?'':'s'}</span>`:''}${rec?'':metaTags(r.meta)}${strip&&r.cover?`<img class="rthumb" src="${imgURL(r.cover)}" alt="" loading="lazy">`:''}<div class="sw">${r.paints.slice(0,16).map(k=>swatch(BYKEY.get(k))).join('')}</div><div class="s">${esc(r.summary)}</div><div class="n">${esc(r.author.name)} · ${fmtDate(r.updated_at)}${r.visibility==='public'?` · ${r.comments} comment${r.comments===1?'':'s'}`:''}</div>${r.visibility==='public'?`<div class="n stats">${statsHTML(r)}</div>`:''}</a>`};
// A layer's colour: the rough mix of its paints, or the paint itself. Water is left out.
const layerHex=mix=>{const ps=(mix||[]).filter(m=>m.k!==WATER.k);return mixColour(ps)||BYKEY.get(ps[0]?.k)?.h||null};
const stripHTML=(layers,cls='')=>{const c=layers.map(layerHex).filter(Boolean);return c.length?`<div class="rstrip ${cls}" aria-hidden="true">${c.map(h=>`<i style="background:${h}"></i>`).join('')}</div>`:''};
const LEVEL={beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'};
const metaTags=m=>m?[m.level&&LEVEL[m.level],m.time&&'⏱ '+m.time,m.model].filter(Boolean).map(t=>`<span class="tag">${esc(t)}</span>`).join(''):'';
const swatch=p=>p?`<i style="background:${p.h}" title="${esc(p.n)}"></i>`:'<i title="Unknown paint"></i>';
const pchip=(k,x)=>{const p=BYKEY.get(k);return p?`<span class="chip" data-k="${esc(k)}"><i style="background:${p.h}"></i>${star(p)}${esc(p.n)} <span style="color:var(--mut)">${esc(p.c)} · ${esc(GL[p.g])}</span>${x?' <span class="x" title="Remove">×</span>':''}</span>`:`<span class="chip" data-k="${esc(k)}"><i></i>Unknown paint${x?' <span class="x">×</span>':''}</span>`};
const signInLink=(why)=>`<p class="s">${why} <a href="#/account">Sign in</a> to continue.</p>`;
// A small round picture, or the first letter of the name when there isn't one.
const avHTML=(u,cls='av')=>u.avatar?`<img class="${cls}" src="${esc(u.avatar)}" alt="">`:`<span class="${cls} ini" aria-hidden="true">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span>`;
const who=a=>`<a class="plink" href="#/u/${esc(a.id)}">${avHTML(a)}${esc(a.name)}</a>`;
function showOnWheel(keys){const s=new Set(keys);P.forEach(p=>p.on=s.has(p.k));sync();location.hash='#/'}

/* ---------- session ---------- */
// The wheel opens on the newest of this browser's and the account's last selection; with neither, on the user's collection.
let selTimer=null;
async function wheelSync(){
 let srv=null,ok=true;try{const r=await api('/me/wheel');srv=r.wheel;ok=!r.unavailable}catch(e){ok=false}
 const loc=selLocal();
 onSelSave=ok?w=>{clearTimeout(selTimer);selTimer=setTimeout(()=>api('/me/wheel',{method:'PUT',body:w}).catch(()=>{}),1500)}:null;
 if(srv&&srv.t&&(!loc||srv.t>loc.t)){selApply(srv);try{localStorage.setItem(WK,JSON.stringify(srv))}catch(e){}boxes();refresh()}
 else if(loc){if(ok&&(!srv||loc.t>srv.t))api('/me/wheel',{method:'PUT',body:loc}).catch(()=>{})}
 else if(OWN.size){P.forEach(p=>p.on=OWN.has(p.k));boxes();refresh()}}

async function loadMe(){
 // The extra tabs only show once there is a way to sign in (or someone is already signed in).
 try{INFO=await api('/me');ME=INFO.user;API=!!(ME||INFO.devLogin||INFO.providers.length||INFO.passwords)}catch(e){API=false;ME=null}
 if(ME){try{OWN=new Set((await api('/collection')).paints)}catch(e){OWN=new Set()}}else{OWN=null;ONLY_MINE=false;$('onlyMine').checked=false}
 if(ME)await wheelSync();else onSelSave=null;
 document.querySelectorAll('#nav a[data-v]').forEach(a=>{if(a.dataset.v!=='wheel'&&a.dataset.v!=='welcome')a.hidden=!API});
 document.querySelectorAll('#v-welcome [data-api]').forEach(a=>a.hidden=!API);
 $('acct').innerHTML=ME?avHTML(ME)+esc(ME.name):'Sign in';
 $('mine').hidden=!ME;
 $('fbBtn').hidden=!API;
 askUpdates();
 renderNeu();draw()}

/* ---------- router ---------- */
// First-time visitors (nothing remembered in this browser) land on the welcome page and get the theme picker; everyone else on the wheel.
let FIRST=false;try{FIRST=!localStorage.getItem('pd-seen')&&!localStorage.getItem(WK);localStorage.setItem('pd-seen','1')}catch(e){}
function route(){
 if(FIRST){FIRST=false;if(!location.hash.replace(/^#\/?/,''))history.replaceState(null,'','#/welcome');window.pdThemeFirst&&pdThemeFirst()}
 const h=location.hash.replace(/^#\/?/,''),[v,id,sub]=h.split(/[/?]/);
 let view=v||'wheel';
 if(view==='recipe'&&sub==='edit')view='edit';else if(view==='new')view='edit';else if(view==='u')view='profile';
 if(!VIEWS.includes(view)||(!API&&view!=='wheel'&&view!=='welcome'&&view!=='changelog'))view='wheel';
 VIEWS.forEach(n=>$('v-'+n).hidden=n!==view);
 countHit(view==='recipe'&&id?'#/recipe/'+id:'#/'+view);
 const full=view==='wheel'||view==='paints';$('footFull').hidden=!full;$('footShort').hidden=full;
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===view||(a.dataset.v==='recipes'&&(view==='recipe'||view==='edit'))));
 if(view==='welcome')renderWelcome();
 else if(view==='paints')renderPaints();
 else if(view==='recipes')renderRecipes();
 else if(view==='recipe')renderRecipe(id);
 else if(view==='edit')renderEdit(v==='new'?null:id,v==='new'&&(id==='recipe'||id==='palette')?id:'tutorial');
 else if(view==='account')renderAccount();
 else if(view==='profile')renderProfile(id);
 else if(view==='reset')renderReset(id);
 else if(view==='admin')renderAdmin();
 if(view!=='wheel')scrollTo(0,0)}
addEventListener('hashchange',route);
// Anonymous view count for the site's daily traffic report: just the view name and, once, the site that linked here. No cookies.
let REF=document.referrer;
function countHit(p){if(!API)return;const r=REF;REF='';fetch('/api/hit',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({p,r})}).catch(()=>{})}
function renderWelcome(){
 $('wCount').textContent=P.length.toLocaleString('en');
 const b=BRANDS.map(x=>x[0].split(' / ')[0]);$('wBrands').textContent=b.slice(0,-1).join(', ')+' and '+b[b.length-1]}
$('footMore').onclick=()=>setTimeout(()=>$('foot').scrollIntoView({block:'end'}),50);

/* ---------- account ---------- */
const LOGIN_NAMES={email:'Email and password',google:'Google',discord:'Discord',github:'GitHub',dev:'Dev sign-in'};
let authMode='in';
function renderAccount(){
 const el=$('v-account'),ret=encodeURIComponent('/#/');
 const err=/error=/.test(location.hash)?'<p class="err">Sign-in was cancelled or failed. Please try again.</p>':'';
 if(!ME){
  const btns=INFO.providers.map(p=>`<a class="btn" href="/api/auth/login/${p.id}?return=${ret}">Continue with ${esc(p.label)}</a>`).join(' ');
  if(authMode==='forgot'){
   el.innerHTML=`<h1>Reset your password</h1><div class="panel"><p class="s">Enter the email on your account and we'll send you a link to choose a new password.</p>
   <form id="fgForm"><label class="f"><span>Email</span><input type="email" class="inp" id="fEmail" maxlength="200" autocomplete="email" required></label>
   <div class="row"><button class="btn pri" type="submit" id="fGo">Send reset link</button><button class="btn" type="button" data-m="in">Back to sign in</button><span class="s" id="fMsg"></span></div></form></div>`;
   el.querySelector('[data-m]').onclick=()=>{authMode='in';renderAccount()};
   $('fgForm').onsubmit=async e=>{e.preventDefault();$('fGo').disabled=true;$('fMsg').className='s';$('fMsg').textContent='Sending…';
    try{await api('/auth/forgot',{method:'POST',body:{email:$('fEmail').value}});$('fMsg').textContent='If that email has an account, a reset link is on its way. Check your inbox (and spam folder).'}
    catch(e){$('fMsg').className='err';$('fMsg').textContent=e.message;$('fGo').disabled=false}};
   return}
  const up=authMode==='up';
  el.innerHTML=`<h1>${up?'Create an account':'Sign in'}</h1>${err}<div class="panel"><p class="s">Sign in to save your paint collection, use it on the colour wheel, save recipes and tutorials, and join discussions. See the <a href="privacy">privacy policy</a> for what we store.</p>
  ${btns?`<div class="row">${btns}</div><p class="s">Your first sign-in with one of these creates your account.</p><p class="or"><span>or use your email</span></p>`:''}
  <div class="row"><button class="btn${up?'':' pri'}" type="button" data-m="in">Sign in</button><button class="btn${up?' pri':''}" type="button" data-m="up">Create account</button></div>
  <form id="pwForm">${up?'<label class="f"><span>Display name</span><input type="text" id="aName" maxlength="40" autocomplete="nickname" required></label>':''}
  <label class="f"><span>Email</span><input type="email" class="inp" id="aEmail" maxlength="200" autocomplete="email" required></label>
  <label class="f"><span>Password${up?' (at least 8 characters)':''}</span><input type="password" class="inp" id="aPw" minlength="${up?8:1}" maxlength="200" autocomplete="${up?'new-password':'current-password'}" required></label>
  ${up&&INFO.mail?'<p><label><input type="checkbox" id="aUpd"> Email me when new features go live (a few times a year at most)</label></p>':''}
  <div class="row"><button class="btn pri" type="submit" id="aGo">${up?'Create account':'Sign in'}</button><span class="err" id="aErr"></span></div></form>
  ${INFO.mail?(up?'<p class="s">We\'ll email you a link to confirm your address.</p>':'<p><button class="lnk" type="button" data-m="forgot" style="font-size:14px;padding:0">Forgot your password?</button></p>')
   :`<p class="s">${up?'We can\'t email you yet, so there is no password reset link. Keep your password safe, or link Google from your account page as a backup way in.':'Forgot your password? There is no email reset yet. If you linked Google to your account, sign in with that and set a new password from your account page.'}</p>`}
  ${INFO.devLogin?`<div class="row"><input class="inp" id="devName" placeholder="Test user name" value="Test Painter" style="max-width:220px"><button class="btn" id="devGo" type="button">Dev sign-in</button><span class="s">Local testing only.</span></div>`:''}</div>`;
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{authMode=b.dataset.m;renderAccount()});
  $('pwForm').onsubmit=async e=>{e.preventDefault();$('aGo').disabled=true;$('aErr').textContent='';
   try{await api(up?'/auth/register':'/auth/password',{method:'POST',body:{email:$('aEmail').value,password:$('aPw').value,name:up?$('aName').value:undefined,updates:up?!!$('aUpd')?.checked:undefined}});
    authMode='in';await loadMe();if(up){history.replaceState(null,'','#/account?welcome');renderAccount()}else location.hash='#/'}
   catch(e){$('aErr').textContent=e.message;$('aGo').disabled=false}};
  if(INFO.devLogin)$('devGo').onclick=()=>location.href=`/api/auth/dev?name=${encodeURIComponent($('devName').value)}&return=${ret}`;
  return}
 const linked=new Set(INFO.logins),more=INFO.providers.filter(p=>!linked.has(p.id)),hasPw=linked.has('email');
 let fav=[...ME.favourites],icon=ME.avatar_image,busy=0;
 const h=location.hash,note=/verify=done/.test(h)?'<p class="ok">Thanks, your email is confirmed.</p>':/verify=expired/.test(h)?'<p class="err">That confirmation link has expired or was already used. Send a new one below.</p>':/welcome/.test(h)&&INFO.mail&&!ME.email_verified?`<p class="ok">Welcome! We've sent a confirmation link to ${esc(ME.email)}.</p>`:'';
 el.innerHTML=`<h1>${avHTML(ME)}${esc(ME.name)}</h1>${note}
 <p><a href="#/u/${esc(ME.id)}">View your public profile →</a></p>
 <div class="panel"><h2>Your profile</h2><p class="s">Everything here is public: anyone can see your icon, name, about text, link, favourite paints and your public recipes and tutorials. Your email is never shown.</p>
 <div class="f"><span>Icon</span><div id="pIcon"></div></div>
 <label class="f"><span>Display name</span><input type="text" id="pName" maxlength="40"></label>
 <label class="f"><span>About you</span><textarea id="pBio" maxlength="500" style="min-height:80px" placeholder="What you paint, your favourite armies, how long you've been painting…"></textarea></label>
 <label class="f"><span>Link (optional, e.g. your Instagram or YouTube)</span><input type="url" id="pLink" maxlength="300" placeholder="https://"></label>
 <div class="f"><span>Favourite paints (up to 24)</span><div id="pFav"></div></div>
 <div class="row"><button class="btn pri" id="pSave" type="button">Save profile</button><span class="s" id="pMsg"></span></div></div>
 <div class="panel"><h2>Signing in</h2>
 <p>${ME.email?esc(ME.email)+(ME.email_verified?'':' <span class="tag" title="Not confirmed yet">not confirmed</span>'+(INFO.mail?' <button class="btn" type="button" id="vSend">Send confirmation email</button> <span class="s" id="vMsg"></span>':'')):'<span class="s">No email on file</span>'}${ME.admin?' <span class="tag">admin</span>':''}</p>
 <p class="s">Signed in with: ${INFO.logins.map(l=>esc(LOGIN_NAMES[l]||l)).join(', ')}</p>
 ${more.length?`<div class="row"><span class="s">Link another sign-in:</span>${more.map(p=>`<a class="btn" href="/api/auth/login/${p.id}?return=${encodeURIComponent('/#/account')}">${esc(p.label)}</a>`).join(' ')}</div>`:''}
 <form id="pwSet"><h3>${hasPw?'Change password':'Add a password'}</h3>${hasPw?'':`<p class="s">Then you can also sign in with ${ME.email?'your email':'an email'} and password.</p>`}
 ${ME.email?'':'<label class="f"><span>Email</span><input type="email" class="inp" id="sEmail" maxlength="200" autocomplete="email" required></label>'}
 ${hasPw?'<label class="f"><span>Current password</span><input type="password" class="inp" id="sCur" maxlength="200" autocomplete="current-password" required></label>':''}
 <label class="f"><span>New password (at least 8 characters)</span><input type="password" class="inp" id="sPw" minlength="8" maxlength="200" autocomplete="new-password" required></label>
 <div class="row"><button class="btn" type="submit" id="sGo">${hasPw?'Change password':'Add password'}</button><span class="s" id="sMsg"></span></div></form></div>
 ${INFO.mail&&ME.email?`<div class="panel"><h2>Emails</h2>
 <p><label><input type="checkbox" id="uOpt"${ME.updates?' checked':''}> Email me when new features go live</label> <span class="s" id="uMsg"></span></p>
 <p class="s">A few times a year at most, with an unsubscribe link in every email.${ME.email_verified?'':' We only send these to confirmed addresses, so confirm yours above.'} Emails about your account, like password resets, come either way.</p></div>`:''}
 ${ME.admin?`<div class="panel"><h2>Moderation <span class="tag">admin</span></h2><p class="s">Reports from the Report button, photos refused at upload, and the newest photos. Hide or delete a photo, or block an account.</p><a class="btn" href="#/admin">Open moderation</a></div>`:''}
 ${ME.admin?`<div class="panel" id="annP"><h2>Send an update email <span class="tag">admin</span></h2>
 <p class="s" id="annN">Checking who has opted in…</p>
 <label class="f"><span>Subject</span><input type="text" id="annS" maxlength="150"></label>
 <label class="f"><span>Message (blank line between paragraphs, "- " for a list, **bold**, {name} for their name; an unsubscribe link is added)</span><textarea id="annB" maxlength="10000" style="min-height:220px"></textarea></label>
 <div class="row"><button class="btn" type="button" id="annT">Send me a test</button><button class="btn pri" type="button" id="annGo" disabled>Send to everyone opted in</button><span class="s" id="annM"></span></div>
 <div id="annC" hidden class="row"><span class="err" id="annCT"></span><button class="btn pri" type="button" id="annGo2">Yes, send it</button><button class="btn" type="button" id="annX">Cancel</button></div></div>`:''}
 <div class="panel"><p class="s">${OWN.size} paints in your collection.</p>
 <div class="row"><button class="btn" id="out" type="button">Sign out</button><button class="btn dan" id="del" type="button">Delete my account</button></div>
 <div id="delc" hidden class="row"><span class="err">This deletes your profile, collection, recipes and comments for good.</span><button class="btn dan" id="del2" type="button">Yes, delete everything</button></div></div>`;
 $('pName').value=ME.name;$('pBio').value=ME.bio;$('pLink').value=ME.link;
 const drawIcon=()=>{const box=$('pIcon');
  box.innerHTML=`<div class="row">${avHTML({name:ME.name,avatar:icon?imgURL(icon):ME.provider_avatar},'av big')}<label class="btn">Upload a picture<input type="file" accept="image/*" hidden></label>${icon?'<button class="btn" type="button" data-rm>Remove</button>':''}<span class="s" data-st></span></div>${icon?'':'<p class="s">Without an upload, your picture from Google, Discord or GitHub is used (or your first letter).</p>'}`;
  box.querySelector('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=box.querySelector('[data-st]');st.textContent='Uploading…';busy++;
   try{icon=await uploadPhoto(f,true);drawIcon();$('pMsg').textContent='Press Save profile to keep the new icon.'}catch(err){st.textContent=err.message;st.className='err'}busy--};
  const rm=box.querySelector('[data-rm]');if(rm)rm.onclick=()=>{icon='';drawIcon()}};
 drawIcon();
 const drawFav=()=>{const box=$('pFav');box.innerHTML=`<div class="chips">${fav.map(k=>pchip(k,1)).join('')}</div>${fav.length<24?'<div></div>':''}`;
  box.querySelectorAll('.x').forEach(x=>x.onclick=()=>{fav=fav.filter(k=>k!==x.closest('.chip').dataset.k);drawFav()});
  if(fav.length<24)paintSearch(box.lastElementChild,()=>fav,k=>{if(fav.length<24)fav.push(k);drawFav();box.querySelector('input[type=search]')?.focus()})};
 drawFav();
 $('pSave').onclick=async()=>{if(busy){$('pMsg').textContent='Please wait for the picture to finish uploading.';return}
  $('pSave').disabled=true;$('pMsg').className='s';$('pMsg').textContent='Saving…';
  try{ME=(await api('/me/profile',{method:'PUT',body:{name:$('pName').value,bio:$('pBio').value,link:$('pLink').value.trim(),favourites:fav,icon}})).user;INFO.user=ME;
   $('acct').innerHTML=avHTML(ME)+esc(ME.name);renderAccount();$('pMsg').textContent='Saved.'}
  catch(e){$('pMsg').className='err';$('pMsg').textContent=e.message;$('pSave').disabled=false}};
 $('pwSet').onsubmit=async e=>{e.preventDefault();$('sGo').disabled=true;$('sMsg').className='s';$('sMsg').textContent='';
  try{await api('/me/password',{method:'PUT',body:{password:$('sPw').value,current:$('sCur')?.value,email:$('sEmail')?.value}});
   INFO=await api('/me');ME=INFO.user;renderAccount();$('sMsg').textContent=hasPw?'Password changed.':'Password added.'}
  catch(e){$('sMsg').className='err';$('sMsg').textContent=e.message;$('sGo').disabled=false}};
 if($('vSend'))$('vSend').onclick=async()=>{$('vSend').disabled=true;$('vMsg').className='s';
  try{await api('/me/verify-email',{method:'POST'});$('vMsg').textContent='Sent. Check your inbox (and spam folder).'}catch(e){$('vMsg').className='err';$('vMsg').textContent=e.message;$('vSend').disabled=false}};
 if($('uOpt'))$('uOpt').onchange=async()=>{const c=$('uOpt');c.disabled=true;$('uMsg').className='s';
  try{ME=(await api('/me/updates',{method:'PUT',body:{on:c.checked}})).user;INFO.user=ME;$('uMsg').textContent=c.checked?'Thanks, you\'re on the list.':'Turned off.';$('updAsk').hidden=true}
  catch(e){c.checked=!c.checked;$('uMsg').className='err';$('uMsg').textContent=e.message}c.disabled=false};
 if(ME.admin)annPanel();
 $('out').onclick=async()=>{await api('/auth/logout',{method:'POST'});await loadMe();location.hash='#/'};
 $('del').onclick=()=>$('delc').hidden=false;
 $('del2').onclick=async()=>{await api('/me',{method:'DELETE'});await loadMe();location.hash='#/'}}

// Admin: write an update email, send a test to yourself, then send it to everyone who opted in.
async function annPanel(){let n=0;
 const msg=(t,err)=>{$('annM').className=err?'err':'s';$('annM').textContent=t};
 const info=async()=>{try{const d=await api('/admin/announce');n=d.recipients;
  $('annN').textContent=`${n} ${n===1?'person has':'people have'} opted in with a confirmed email.`+(d.sent.length?` Last sent: "${d.sent[0].subject}" to ${d.sent[0].recipients} on ${fmtDate(d.sent[0].created_at)}.`:'');
  $('annGo').disabled=!n;$('annGo').textContent=`Send to ${n} ${n===1?'person':'people'}`}catch(e){$('annN').textContent=e.message}};
 const send=async test=>{msg(test?'Sending your test…':'Sending…');$('annT').disabled=$('annGo').disabled=true;
  try{const d=await api('/admin/announce',{method:'POST',body:{subject:$('annS').value,text:$('annB').value,test}});
   msg(test?(d.sent?'Test sent to your email.':'The test failed to send.'):`Sent to ${d.sent}${d.failed?`, ${d.failed} failed`:''}.`,!d.sent)}
  catch(e){msg(e.message,1)}$('annT').disabled=false;await info()};
 $('annT').onclick=()=>send(true);
 $('annGo').onclick=()=>{if(!$('annS').value.trim()||!$('annB').value.trim()){msg('Add a subject and a message first.',1);return}
  $('annCT').textContent=`Email "${$('annS').value.trim()}" to ${n} ${n===1?'person':'people'}? This can't be undone.`;$('annC').hidden=false;$('annGo2').focus()};
 $('annX').onclick=()=>$('annC').hidden=true;
 $('annGo2').onclick=()=>{$('annC').hidden=true;send(false)};
 await info()}

// Ask signed-in users once whether they'd like emails about new features. Either answer stops the question.
function askUpdates(){const bar=$('updAsk');bar.hidden=!(ME&&INFO.mail&&ME.email&&!ME.updates_asked)}
$('updYes').onclick=$('updNo').onclick=async e=>{const on=e.target.id==='updYes';$('updAsk').hidden=true;
 try{ME=(await api('/me/updates',{method:'PUT',body:{on}})).user;INFO.user=ME;if(location.hash.startsWith('#/account'))renderAccount()}catch(err){}};

/* ---------- password reset (link from email) ---------- */
function renderReset(token){
 const el=$('v-reset');
 el.innerHTML=`<h1>Choose a new password</h1><div class="panel"><form id="rsForm"><p class="s">This also signs you out everywhere else.</p>
 <label class="f"><span>New password (at least 8 characters)</span><input type="password" class="inp" id="rsPw" minlength="8" maxlength="200" autocomplete="new-password" required></label>
 <div class="row"><button class="btn pri" type="submit" id="rsGo">Save new password</button><span class="err" id="rsErr"></span></div></form></div>`;
 $('rsForm').onsubmit=async e=>{e.preventDefault();$('rsGo').disabled=true;$('rsErr').textContent='';
  try{await api('/auth/reset',{method:'POST',body:{token,password:$('rsPw').value}});await loadMe();history.replaceState(null,'','#/account?verify=done');route()}
  catch(e){$('rsErr').textContent=e.message;$('rsGo').disabled=false}}}

/* ---------- public profile ---------- */
async function renderProfile(id){
 const el=$('v-profile');el.innerHTML='<p class="s">Loading…</p>';
 let d;try{d=await api('/users/'+encodeURIComponent(id))}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p><a href="#/recipes">Back to recipes</a>`;return}
 const p=d.profile,mine=ME&&ME.id===p.id;
 el.innerHTML=`<div class="prof">${avHTML(p,'av huge')}<div><h1>${esc(p.name)}</h1><p class="s">Painting with us since ${fmtDate(p.created_at)}</p>
 ${p.link?`<p><a href="${esc(p.link)}" target="_blank" rel="noopener nofollow ugc">${esc(p.link.replace(/^https?:\/\/(www\.)?/i,'').replace(/\/$/,''))}</a></p>`:''}
 ${mine?'<a class="btn" href="#/account">Edit profile</a>':`<button class="lnk rpb" type="button" id="pRep">⚑ Report this profile</button>`}</div></div>
 ${p.bio?`<div class="panel"><div class="steps">${esc(p.bio)}</div></div>`:''}
 <div class="panel"><h2>Favourite paints</h2>${p.favourites.length?`<div class="chips" id="fp">${p.favourites.map(k=>pchip(k)).join('')}</div><button class="btn" id="fWheel" type="button">Show these on the wheel</button>`:`<p class="s">${mine?'You haven\'t picked any favourites yet. Add them on your account page.':'No favourite paints picked yet.'}</p>`}</div>
 <h2>Public recipes &amp; tutorials</h2>
 <div class="cards">${d.recipes.map(cardHTML).join('')||`<p class="s">${mine?'Nothing public yet. Make a recipe or tutorial public to show it here.':'Nothing shared yet.'}</p>`}</div>`;
 el.querySelectorAll('#fp .chip').forEach(c=>c.onclick=()=>{const q=BYKEY.get(c.dataset.k);if(q){showOnWheel([q.k]);setTimeout(()=>showP(q),0)}});
 if($('fWheel'))$('fWheel').onclick=()=>showOnWheel(p.favourites);
 if($('pRep'))$('pRep').onclick=()=>openReport('user',p.id,p.name)}

/* ---------- my paints ---------- */
// Guards against ticking or unticking lots of paints by accident: a confirm dialog for big range changes, and an Undo bar after them.
const BULK=5;let paintsRedraw=null,undoK=[],undoOn=false,undoTm=0;
function askBulk(keys,what,on){const d=$('remDlg'),n=keys.length,s=n===1?'':'s';
 $('remDlgT').textContent=on?'Add to your collection?':'Remove from your collection?';$('remOk').textContent=on?'Add paints':'Remove paints';$('remOk').className='btn '+(on?'pri':'dan');
 $('remDlgM').textContent=`This ${on?'adds':'removes'} ${n} paint${s}${what?' ('+what+')':''} ${on?'to':'from'} your collection.`;d.returnValue='';
 d.onclose=()=>{if(d.returnValue!=='ok')return;setOwned(keys,on);undoBar(keys,on);if(paintsRedraw)paintsRedraw()};d.showModal();$('remNo').focus()}
function undoBar(keys,on=false){if(undoOn!==on)undoK=[];undoOn=on;undoK=[...new Set([...undoK,...keys])];const n=undoK.length;$('undoM').textContent=`${on?'Added':'Removed'} ${n} paint${n===1?'':'s'} ${on?'to':'from'} your collection.`;$('undoT').hidden=false;
 clearTimeout(undoTm);undoTm=setTimeout(()=>{$('undoT').hidden=true;undoK=[]},10000)}
$('undoB').onclick=()=>{clearTimeout(undoTm);$('undoT').hidden=true;const ks=undoK;undoK=[];if(!OWN||!ks.length)return;setOwned(ks,!undoOn);if(paintsRedraw)paintsRedraw()};
let pend={add:new Set(),remove:new Set()},saveT=0;
function setOwned(keys,on){keys.forEach(k=>{if(on){OWN.add(k);pend.add.add(k);pend.remove.delete(k)}else{OWN.delete(k);pend.remove.add(k);pend.add.delete(k)}});
 clearTimeout(saveT);saveT=setTimeout(flush,500)}
async function flush(){const b={add:[...pend.add],remove:[...pend.remove]};pend={add:new Set(),remove:new Set()};if(!b.add.length&&!b.remove.length)return;
 try{OWN=new Set((await api('/collection',{method:'PUT',body:b})).paints);const m=$('pmsg');if(m)m.textContent='Saved.'}catch(e){const m=$('pmsg');if(m)m.textContent=e.message}}
function renderPaints(){
 const el=$('v-paints');
 if(!ME){el.innerHTML='<h1>My paints</h1>'+signInLink('Your collection is saved to your account.');return}
 el.innerHTML=`<h1>My paints</h1><p class="s">Tick the paints you own. Changes save automatically. Your paints get a ★ on the wheel and in matches.</p>
 <div class="panel"><div class="row"><button class="btn pri" id="pWheel" type="button">Show my collection on the wheel</button><span class="s" id="pcnt"></span> <span class="s" id="pmsg"></span></div>
 <div class="bar"><input id="pq" type="search" placeholder="Search paints (name or code)"><label style="align-self:center"><input type="checkbox" id="pOwned"> Only paints I own</label></div>
 <div id="ptree"></div></div>
 <details class="panel" id="sugd"><summary><b>Suggested paints</b> <span class="s" id="sugN"></span></summary><div id="sug"><p class="s">Working out the gaps in your collection…</p></div></details>`;
 const tr=$('ptree');
 tr.innerHTML=treeHTML('data-pc','data-pb');
 const q=()=>$('pq').value.trim().toLowerCase(),only=()=>$('pOwned').checked,vis=p=>(!q()||(p.n+' '+p.c).toLowerCase().includes(q()))&&(!only()||OWN.has(p.k));
 const counts=()=>{tr.querySelectorAll('input[data-i]').forEach(e=>e.checked=OWN.has(P[+e.dataset.i].k));
  TREE.forEach(([bn,ss],bi)=>{let bo=0;ss.forEach(x=>bo+=x.ps.filter(i=>OWN.has(P[i].k)).length);tr.querySelector(`[data-pb="${bi}"]`).textContent=bo?'('+bo+' owned)':''});
  Object.entries(SETS).forEach(([id,x])=>{const o=x.ps.filter(i=>OWN.has(P[i].k)).length,n=x.ps.length;const cb=tr.querySelector(`input[data-r="${id}"]`);if(!cb)return;cb.checked=o===n&&o>0;cb.indeterminate=o>0&&o<n;tr.querySelector(`[data-pc="${id}"]`).textContent=o+'/'+n});
  $('pcnt').textContent=OWN.size+' paints owned.'};
 const filt=()=>{const f=!!q()||only();tr.querySelectorAll('label.pi').forEach(l=>l.hidden=!vis(P[+l.dataset.i]));
  tr.querySelectorAll('.sub').forEach(d=>d.hidden=f&&!d.querySelector('label.pi:not([hidden])'));
  tr.querySelectorAll('details.rg').forEach(d=>{const v=!!d.querySelector('label.pi:not([hidden])');d.hidden=f&&!v;if(f)d.open=v});
  tr.querySelectorAll('details.br').forEach(d=>{d.hidden=f&&!d.querySelector('details.rg:not([hidden])');if(f)d.open=true})};
 tr.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.r){const ks=SETS[t.dataset.r].ps.map(i=>P[i]).filter(p=>!q()||(p.n+' '+p.c).toLowerCase().includes(q())).map(p=>p.k);
   // Ticking or unticking a whole range asks first when it would change BULK or more paints; Cancel leaves the collection as it was.
   const on=t.checked,ch=ks.filter(k=>OWN.has(k)!==on);
   if(ch.length>=BULK){counts();askBulk(ch,SETS[t.dataset.r].w||SETS[t.dataset.r].l,on);return}
   if(ch.length){setOwned(ch,on);undoBar(ch,on)}}
  else if(t.dataset.i!==undefined){const k=P[+t.dataset.i].k;setOwned([k],t.checked);if(!t.checked)undoBar([k])}
  $('pmsg').textContent='Saving…';counts()});
 paintsRedraw=()=>{if(!$('ptree'))return;$('pmsg').textContent='Saving…';counts();filt();sugLater()};
 // Suggested paints: worked out in app.js (suggestPaints), redrawn shortly after the collection changes.
 {const d=$('sugd');try{d.open=localStorage.getItem('pd-sug')!=='0'}catch(e){d.open=true}d.ontoggle=()=>{try{localStorage.setItem('pd-sug',d.open?'1':'0')}catch(e){}}}
 const sugGo=()=>{const box=$('sug');if(!box)return;const r=suggestPaints(OWN);
  if(!r){box.innerHTML='<p class="s">Tick the paints you own below and suggestions for filling the gaps in your collection show up here.</p>';$('sugN').textContent='';return}
  const fl=f=>`<span class="sgt">${esc(f.g)}: ${esc(f.r.join(', ').toLowerCase())}</span>`;
  const row=o=>`<div class="sgr"><span class="nsw" style="background:${o.p.h}"></span><div class="nnm"><b>${esc(o.p.n)}</b><span>${esc(GL[o.p.g])}${o.p.c?' · '+esc(o.p.c):''}</span><div class="sgf">${o.fills.map(fl).join('')}</div>${o.alt.length?`<div class="sgo">Or: ${o.alt.map(a=>`<button type="button" class="lnk" data-sa="${esc(a.k)}" title="Add ${esc(a.n)} instead"><i style="background:${a.h}"></i>${esc(a.n)} <em>${esc(GL[a.g])}</em></button>`).join(' ')}</div>`:''}</div><button class="btn" type="button" data-sa="${esc(o.p.k)}" aria-label="Add ${esc(o.p.n)} to my collection">Add</button></div>`;
  const gq={good:['close','Good'],fair:['fair','Fair'],weak:['loose','Weak']};
  const tq=x=>`<div class="sgq"><span class="sgn"><b>${esc(x.tech.name)}</b> ${esc(x.n)}</span><span class="sgs">${x.R.map(st=>`<i style="background:${st.p?st.p.h:'transparent'}" title="${esc(st.r)}: ${st.p?esc(st.p.n)+' (ΔE '+st.d.toFixed(0)+')':'nothing close'}">${st.d>=12?`<u style="background:${labHex(st.t)}"></u>`:''}</i>`).join('')}</span><span class="nq ${gq[x.grade][0]}">${gq[x.grade][1]}</span></div>`;
  const cl=c=>{const x=r.cells[c];if(!x||!x.ok)return'<i class="sgc none"></i>';return x.best?`<i class="sgc" style="background:${x.best.h}" title="${esc(x.name)}: ${x.own.length} owned, e.g. ${esc(x.best.n)}"></i>`:`<i class="sgc gap" style="--t:${labHex(x.t)}" title="${esc(x.name)}: nothing in your collection"></i>`};
  const cs=Object.values(r.cells).filter(c=>c.ok),cov=cs.filter(c=>c.own.length).length,good=r.ramps.filter(x=>x.grade==='good').length,n=r.mine.length+r.other.length;
  $('sugN').textContent=n?`(${n} idea${n===1?'':'s'})`:'';
  box.innerHTML=`<p class="s">Paints that would fill gaps in your collection, from ${esc(r.brands.join(' and '))} first. Each one lists the ramps (as built in Ramps mode on the wheel) and the colour areas it helps with.</p>
  ${r.mine.length?`<div class="sgl">${r.mine.map(row).join('')}</div>`:`<p class="s">Nothing more from ${esc(r.brands.join(' or '))} would close a gap.</p>`}
  ${r.other.length?`<h3>From other brands</h3><p class="s">For gaps your brands don't cover.</p><div class="sgl">${r.other.map(row).join('')}</div>`:''}
  <h3>Techniques your paints can build</h3><p class="s">${good} of ${r.ramps.length} ramps are a good fit. Each square is one step from your paints; a dashed dot marks a step with nothing close (ΔE 12+), shown in the colour it needs. Zenithal and edge highlights are checked on your most saturated mid or dark paint of each hue.</p>
  <div class="sgqs">${r.ramps.map(tq).join('')}</div>
  <h3>Colour coverage</h3><p class="s">You have paints in ${cov} of ${cs.length} colour areas. Columns go round the wheel from red to pink; rows are light, mid and dark, then greys from black to white. Striped squares are areas with nothing in your collection.</p>
  <div class="sgg">${[2,1,0].map(b=>SG_HUE.map((_,h)=>cl('c'+h+'_'+b)).join('')).join('')}</div><div class="sgg sg5">${[0,1,2,3,4].map(i=>cl('n'+i)).join('')}</div>
  <p class="s">Suggestions compare swatch colours, which are estimates, so treat them as a starting point and check paints in person.</p>`};
 let sugT=0;const sugLater=()=>{clearTimeout(sugT);sugT=setTimeout(sugGo,600)};
 $('sug').addEventListener('click',e=>{const b=e.target.closest('[data-sa]');if(!b)return;setOwned([b.dataset.sa],true);$('pmsg').textContent='Saving…';counts();filt();sugGo()});
 tr.addEventListener('change',sugLater);
 setTimeout(sugGo,0);
 $('pq').oninput=filt;$('pOwned').onchange=filt;
 $('pWheel').onclick=()=>showOnWheel([...OWN]);
 counts();filt()}

// Wheel page buttons for signed-in users.
$('useMine').onclick=()=>{if(OWN)showOnWheel([...OWN])};
const addLbl=t=>{$('addMine').textContent=t;setTimeout(()=>$('addMine').textContent='Add ticked paints to my collection',2500)};
$('addMine').onclick=()=>{if(!OWN)return;const ks=P.filter(p=>p.on).map(p=>p.k),nw=ks.filter(k=>!OWN.has(k));if(!ks.length)return;if(!nw.length)return addLbl('Already in your collection ✓');
 const d=$('addDlg'),n=nw.length,had=ks.length-n;$('addDlgM').textContent=`This adds ${n} paint${n===1?'':'s'} to your collection`+(had?` (${had} ticked already in it).`:'.');d.returnValue='';
 d.onclose=()=>{if(d.returnValue!=='ok')return;setOwned(nw,true);addLbl(`Added ${n} paint${n===1?'':'s'} ✓`);renderNeu();draw()};d.showModal();$('addNo').focus()};
$('onlyMine').onchange=e=>{ONLY_MINE=e.target.checked;if(sel||NB)draw()};

/* ---------- recipes list ---------- */
let rScope='public',rKind='',rPaint='';
async function renderRecipes(){
 if(!ME)rScope='public';
 const el=$('v-recipes'),pp=rPaint&&BYKEY.get(rPaint),kb=(k,t)=>`<button class="btn${rKind===k?' pri':''}" data-kd="${k}" type="button">${t}</button>`;
 el.innerHTML=`<h1>Recipes &amp; tutorials</h1>
 <div class="kinds"><p><span class="tag trec">Recipe</span> One colour: the paints for a look like bone, purple robes or rusty metal, layer by layer from base to highlight.</p><p><span class="tag ttut">Tutorial</span> A whole model, step by step with photos. Steps can use recipes.</p><p><span class="tag tpal">Palette</span> A set of paints matched to the colours of a photo. Make one with From a photo on the colour wheel.</p></div>
 <div class="row"><button class="btn${rScope==='public'?' pri':''}" data-s="public" type="button">Public</button>${ME?`<button class="btn${rScope==='mine'?' pri':''}" data-s="mine" type="button">Mine</button><button class="btn${rScope==='saved'?' pri':''}" data-s="saved" type="button">☆ Saved</button>`:''}<span class="sp" style="flex:1"></span>${ME?'<a class="btn pri" href="#/new/recipe">+ New recipe</a><a class="btn pri" href="#/new">+ New tutorial</a>':'<a class="btn" href="#/account">Sign in to add yours</a>'}</div>
 <div class="row">${kb('','All')}${kb('recipe','Recipes')}${kb('tutorial','Tutorials')}${kb('palette','Palettes')}${pp?`<span class="chip" id="rPaintC"><i style="background:${pp.h}"></i>Using ${esc(pp.n)} <span class="x" title="Show all">×</span></span>`:''}</div>
 <div class="bar"><input id="rq" type="search" placeholder="Search titles and summaries"></div><div id="rlist" class="cards"><p class="s">Loading…</p></div>`;
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rScope=b.dataset.s;renderRecipes()});
 el.querySelectorAll('[data-kd]').forEach(b=>b.onclick=()=>{rKind=b.dataset.kd;renderRecipes()});
 if($('rPaintC'))$('rPaintC').onclick=()=>{rPaint='';renderRecipes()};
 let t=0;$('rq').oninput=()=>{clearTimeout(t);t=setTimeout(load,250)};
 const what=rKind==='recipe'?'recipes':rKind==='tutorial'?'tutorials':rKind==='palette'?'palettes':'recipes or tutorials';
 async function load(){const L=$('rlist');
  try{const d=await api(`/recipes?scope=${rScope}&kind=${rKind}&paint=${encodeURIComponent(rPaint)}&q=${encodeURIComponent($('rq').value)}`);
   L.innerHTML=d.recipes.length?d.recipes.map(cardHTML).join('')
    :`<p class="s">${rScope==='mine'?`You have not written any ${what} yet.`:rScope==='saved'?'Nothing saved yet. Press ☆ Save on a tutorial or recipe to keep it here.':`No public ${what} yet. Be the first to share one.`}</p>`}
  catch(e){L.innerHTML=`<p class="err">${esc(e.message)}</p>`}}
 load()}

/* ---------- photos & video ---------- */
const imgURL=id=>'/api/images/'+encodeURIComponent(id);
// Shrink a photo in the browser (long edge 1600px, JPEG) before uploading, so phone photos upload fast.
// With icon set, crops the middle square and shrinks it to 256px for a profile icon.
async function uploadPhoto(file,icon){
 if(!/^image\//.test(file.type))throw new Error('Please choose a photo');
 const bmp=await createImageBitmap(file),c=document.createElement('canvas');
 if(icon){const s=Math.min(bmp.width,bmp.height);c.width=c.height=Math.min(256,s);c.getContext('2d').drawImage(bmp,(bmp.width-s)/2,(bmp.height-s)/2,s,s,0,0,c.width,c.height)}
 else{const k=Math.min(1,1600/Math.max(bmp.width,bmp.height));c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height)}
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));
 const r=await fetch('/api/images',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'image/jpeg'},body:blob});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Upload failed');return d.id}
// YouTube and Vimeo links play inside the page; any other link is shown as a plain link.
function videoEmbed(link){
 let m=link.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
 if(m)return `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Video" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
 m=link.match(/vimeo\.com\/(?:video\/)?(\d+)/);
 if(m)return `<div class="vid"><iframe src="https://player.vimeo.com/video/${m[1]}" title="Video" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
 return `<p>Video / article: <a href="${esc(link)}" target="_blank" rel="noopener nofollow ugc">${esc(link)}</a></p>`}
// Rough preview of a mix: parts-weighted average of the swatches in linear light. Swatches are estimates, so this is too.
function mixColour(mix){
 // Water is left out: it thins the paint rather than changing its colour.
 const ps=mix.map(m=>({p:BYKEY.get(m.k),w:m.parts})).filter(x=>x.p);if(ps.length<2)return null;
 const lin=v=>{v/=255;return v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92},gam=v=>Math.round(255*(v>.0031308?1.055*Math.pow(v,1/2.4)-.055:12.92*v));
 const W=ps.reduce((a,x)=>a+x.w,0),c=[0,0,0];
 ps.forEach(({p,w})=>[1,3,5].forEach((o,i)=>c[i]+=lin(parseInt(p.h.slice(o,o+2),16))*w/W));
 return '#'+c.map(v=>gam(v).toString(16).padStart(2,'0')).join('')}
function mixHTML(mix){
 if(!mix.length)return'';
 const ratio=mix.length>1?`<b>${mix.map(m=>m.parts).join(':')} mix</b> of `:'';
 const mc=mixColour(mix);
 return `<div class="mix">${ratio}${mix.map(m=>{const p=mixP(m.k),w=p===WATER;return `<span class="chip${w?' wtr':''}" ${w?'':`data-k="${esc(m.k)}"`}><i style="background:${p?p.h:'#888'}"></i>${w?'💧 Water':p?star(p)+esc(p.n):'Unknown paint'}${mix.length>1?` <em>×${m.parts}</em>`:''}${p&&!w?` <span style="color:var(--mut)">${esc(GL[p.g])}</span>`:''}</span>`}).join('')}${mc?`<span class="chip" title="Rough estimate from the swatch colours"><i style="background:${mc}"></i>≈ mixed</span>`:''}</div>`}

// A paint search box; calls onPick(paintKey).
function paintSearch(box,exclude,onPick,water){
 box.innerHTML=`<input class="inp" type="search" placeholder="Add a paint (search name or code)">${OWN.size?'<label class="s"><input type="checkbox"> my paints only</label>':''}<div class="res" hidden></div>`;
 const q=box.querySelector('input[type=search]'),mine=box.querySelector('input[type=checkbox]'),R=box.querySelector('.res');
 const go=()=>{const t=q.value.trim().toLowerCase();if(!t){R.hidden=true;return}const ex=exclude();
  const hits=P.filter(p=>(p.n+' '+p.c).toLowerCase().includes(t)&&!ex.includes(p.k)&&(!mine?.checked||OWN.has(p.k))).slice(0,30);
  if(water&&!ex.includes(WATER.k)&&/^(wa(t(er?)?)?|thin|dilut)/.test(t))hits.unshift(WATER);
  R.hidden=false;R.innerHTML=hits.map(p=>p===WATER?`<div class="pi" data-k="${WATER.k}"><i style="background:${WATER.h}"></i><span>💧 Water <em>for thinning, washes and glazes</em></span></div>`:`<div class="pi" data-k="${esc(p.k)}"><i style="background:${p.h}"></i>${star(p)}<span>${esc(p.n)} <em>${esc(p.c)} · ${esc(GL[p.g])}</em></span></div>`).join('')||'<div class="s" style="padding:6px">No matches.</div>';
  R.querySelectorAll('[data-k]').forEach(d=>d.onclick=()=>onPick(d.dataset.k))};
 q.oninput=go;if(mine)mine.onchange=go}

/* ---------- views & upvotes ---------- */
const plural=(n,w)=>`${n.toLocaleString()} ${w}${n===1?'':'s'}`;
// Upvote icon: a dropper paint bottle that fills with paint (the "full" ones are filled from the start).
const bottle=full=>`<svg class="pb${full?' full':''}" viewBox="0 0 20 30" aria-hidden="true"><path class="tip" d="M8.5 1.5h3l1 5h-5z"/><rect class="cap" x="5" y="6.5" width="10" height="7" rx="1.5"/><path class="body" d="M4 14.5h12a1.5 1.5 0 0 1 1.5 1.5v10.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V16a1.5 1.5 0 0 1 1.5-1.5z"/><rect class="paint" x="4.2" y="16" width="11.6" height="10.7" rx="1"/><rect class="lbl" x="5.5" y="19" width="9" height="4.5" rx=".6"/></svg>`;
const statsHTML=r=>`<span title="Upvotes">${bottle(1)} ${r.votes.toLocaleString()}</span> · ${plural(r.views,'view')}`;
// Count a view once per browser session; the server ignores the author's own visits.
function countView(r){
 if(r.visibility!=='public'||(ME&&ME.id===r.author.id))return;
 const k='pd_seen_'+r.id;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
 api(`/recipes/${encodeURIComponent(r.id)}/view`,{method:'POST'}).catch(()=>{})}
function voteHTML(r,mine){
 if(r.visibility!=='public')return'';
 const n=r.votes.toLocaleString();
 const btn=mine?`<span class="btn vote" title="Upvotes from other painters" aria-disabled="true">${bottle(1)} ${n}</span>`
  :ME?`<button class="btn vote${r.voted?' on':''}" id="rVote" type="button" aria-pressed="${r.voted}">${bottle()}<span id="rVoteT">${r.voted?'Upvoted':'Upvote'} · ${n}</span></button>`
  :`<a class="btn vote" href="#/account" title="Sign in to upvote">${bottle()}Upvote · ${n}</a>`;
 const save=ME?`<button class="btn save${r.saved?' on':''}" id="rSave" type="button" aria-pressed="${r.saved}">${r.saved?'★ Saved':'☆ Save'}</button>`
  :`<a class="btn save" href="#/account" title="Sign in to save">☆ Save</a>`;
 return `<div class="row">${btn}${save}<span class="n">${plural(r.views,'view')}</span></div>`}

/* ---------- one recipe / tutorial + comments ---------- */
async function renderRecipe(id){
 const el=$('v-recipe');el.innerHTML='<p class="s">Loading…</p>';
 let d;try{d=await api('/recipes/'+encodeURIComponent(id))}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p><a href="#/recipes">Back to recipes</a>`;return}
 const r=d.recipe;r.paints=r.paints.filter(k=>k!==WATER.k);const mine=ME&&ME.id===r.author.id,canMod=c=>ME&&(ME.id===c.author.id||mine||ME.admin);
 const rec=r.kind!=='tutorial',pal=r.kind==='palette',K=kindOf(r),L=d.linked||{};
 // A recipe reads as one colour: a strip of its layers, then each layer's paints. A tutorial reads as a model, step by step.
 const layersHTML=(ls,cls='',W='Layer')=>`<ol class="layers ${cls}">${ls.map((s,i)=>{const h=layerHex(s.mix);return `<li><span class="lc"${h?` style="background:${h}"`:''}></span><div><b>${esc(s.title||W+' '+(i+1))}</b>${mixHTML(s.mix)}${s.text?`<div class="steps s">${esc(s.text)}</div>`:''}${s.image?`<a href="${imgURL(s.image)}" target="_blank"><img class="ph" src="${imgURL(s.image)}" alt="${esc(s.title||'Layer '+(i+1))}" loading="lazy"></a>`:''}</div></li>`}).join('')}</ol>`;
 const linkHTML=id=>{const l=L[id];return l?`<div class="lrec"><a href="#/recipe/${esc(l.id)}">${stripHTML(l.layers.map(x=>x.mix))}<b>Recipe: ${esc(l.title)}</b> <span class="s">by ${esc(l.author.name)}</span></a>${layersHTML(l.layers,'sm')}</div>`:'<p class="s">This step used a recipe that is no longer shared.</p>'};
 el.innerHTML=`<p><a href="#/recipes">← Recipes &amp; tutorials</a></p><h1>${esc(r.title)}</h1>
 <p class="s"><span class="tag ${K.c}">${K.t}</span><span class="tag">${r.visibility==='public'?'Public':'Private'}</span>${rec?'':metaTags(r.meta)}by ${who(r.author)} · updated ${fmtDate(r.updated_at)}</p>
 ${voteHTML(r,mine)}
 ${rec&&r.steps.length?stripHTML(r.steps.map(s=>s.mix),'tall'):''}
 ${r.cover?`<a href="${imgURL(r.cover)}" target="_blank"><img class="ph cover${rec?' rcov':''}" src="${imgURL(r.cover)}" alt="${esc(r.title)}"></a>`:''}
 ${r.summary?`<p>${esc(r.summary)}</p>`:''}
 ${r.link?videoEmbed(r.link):''}
 ${rec&&r.steps.length?`<div class="panel"><h2>${pal?'Colours':'Layers'}</h2>${layersHTML(r.steps,'',pal?'Colour':'Layer')}</div>`:''}
 ${rec&&r.steps.length&&r.paints.every(k=>r.steps.some(s=>s.mix.some(m=>m.k===k)))?(r.paints.length?'<div class="row"><button class="btn" id="rWheel" type="button">Show these paints on the wheel</button></div>':'')
  :`<div class="panel"><h2>${rec&&r.steps.length?'Other paints':'Paints used'}</h2><div class="chips" id="rp">${r.paints.map(k=>pchip(k)).join('')||'<span class="s">No paints listed.</span>'}</div>
 ${r.paints.length?'<button class="btn" id="rWheel" type="button">Show these paints on the wheel</button>':''}</div>`}
 ${rec?'':r.steps.map((s,i)=>`<div class="panel step"><h2>Step ${i+1}${s.title?' · '+esc(s.title):''}</h2>
  ${s.image?`<a href="${imgURL(s.image)}" target="_blank"><img class="ph" src="${imgURL(s.image)}" alt="Step ${i+1}" loading="lazy"></a>`:''}
  ${s.recipe?linkHTML(s.recipe):''}${mixHTML(s.mix)}${s.text?`<div class="steps">${esc(s.text)}</div>`:''}</div>`).join('')}
 ${r.body?`<div class="panel"><h2>${r.steps.length?'Notes':rec?'How to paint it':'Steps'}</h2><div class="steps">${esc(r.body)}</div></div>`:''}
 ${rec&&d.usedIn?.length?`<div class="panel"><h2>Used in tutorials</h2><ul class="used">${d.usedIn.map(t=>`<li><a href="#/recipe/${esc(t.id)}">${esc(t.title)}</a></li>`).join('')}</ul></div>`:''}
 ${mine||ME?.admin?`<div class="row">${mine?`<a class="btn" href="#/recipe/${esc(r.id)}/edit">Edit</a>`:''}<button class="btn dan" id="rDel" type="button">Delete</button></div>`:''}
 ${r.visibility==='public'&&!mine?`<p><button class="lnk rpb" type="button" id="rRep">⚑ Report this ${K.t.toLowerCase()}</button></p>`:''}
 ${r.visibility==='public'?`<div class="panel"><h2>Discussion</h2><div id="cms">${d.comments.map(c=>cmHTML(c,canMod(c))).join('')||'<p class="s" id="nocm">No comments yet.</p>'}</div>
  ${ME?`<label class="f"><span>Add a comment</span><textarea id="cBody" maxlength="2000" style="min-height:70px" class="inp"></textarea></label><div class="row"><button class="btn pri" id="cGo" type="button">Post comment</button><span class="err" id="cErr"></span></div>`:signInLink('Registered painters can join the discussion.')}</div>`
  :(mine?'<p class="s">This is private, so only you can see it. Make it public to share it and open the discussion.</p>':'')}`;
 el.querySelectorAll('#rp .chip,.mix .chip[data-k]').forEach(c=>c.onclick=()=>{const p=BYKEY.get(c.dataset.k);if(p){showOnWheel([p.k]);setTimeout(()=>showP(p),0)}});
 if($('rWheel'))$('rWheel').onclick=()=>showOnWheel(r.paints);
 if($('rRep'))$('rRep').onclick=()=>openReport('recipe',r.id,r.title);
 countView(r);
 if($('rSave'))$('rSave').onclick=async()=>{const b=$('rSave');b.disabled=true;
  try{const v=await api(`/recipes/${r.id}/save`,{method:'PUT',body:{on:!r.saved}});r.saved=v.saved;r.voted=v.voted;r.votes=v.votes;
   b.classList.toggle('on',r.saved);b.setAttribute('aria-pressed',r.saved);b.textContent=r.saved?'★ Saved':'☆ Save';showVote()}
  catch(e){b.title=e.message}b.disabled=false};
 function showVote(){const b=$('rVote');if(b){b.classList.toggle('on',r.voted);b.setAttribute('aria-pressed',r.voted);$('rVoteT').textContent=`${r.voted?'Upvoted':'Upvote'} · ${r.votes.toLocaleString()}`}}
 if($('rVote'))$('rVote').onclick=async()=>{const b=$('rVote');b.disabled=true;
  try{const v=await api(`/recipes/${r.id}/vote`,{method:'PUT',body:{on:!r.voted}});r.voted=v.voted;r.votes=v.votes;showVote()}
  catch(e){b.title=e.message}b.disabled=false};
 if($('rDel'))$('rDel').onclick=async()=>{if($('rDel').dataset.c){await api('/recipes/'+r.id,{method:'DELETE'});location.hash='#/recipes'}else{$('rDel').dataset.c=1;$('rDel').textContent='Click again to delete for good'}};
 const wireDel=()=>el.querySelectorAll('[data-dc]').forEach(b=>b.onclick=async()=>{await api('/comments/'+b.dataset.dc,{method:'DELETE'});b.closest('.cm').remove()});
 wireDel();
 if($('cGo'))$('cGo').onclick=async()=>{const t=$('cBody').value.trim();if(!t)return;$('cGo').disabled=true;$('cErr').textContent='';
  try{const c=(await api(`/recipes/${r.id}/comments`,{method:'POST',body:{body:t}})).comment;$('nocm')?.remove();$('cms').insertAdjacentHTML('beforeend',cmHTML(c,true));$('cBody').value='';wireDel()}
  catch(e){$('cErr').textContent=e.message}$('cGo').disabled=false}}
const cmHTML=(c,del)=>`<div class="cm"><div class="who"><b>${who(c.author)}</b> · ${fmtDate(c.created_at)}${del?` <button class="lnk" data-dc="${esc(c.id)}" type="button">delete</button>`:''}</div><p>${esc(c.body)}</p></div>`;

/* ---------- create / edit ---------- */
const STEP_NAMES=['Prime','Zenithal','Base coat','Wash / shade','Layer','Highlight','Edge highlight','Glaze','Drybrush','Details','Freehand','Weathering','Basing','Varnish'];
const LAYER_NAMES=['Base','Shade','Wash','Recess','Mid tone','Layer','Highlight','Edge highlight','Glaze','Drybrush'];
// Recipes a tutorial step can use: yours and saved ones up front, public ones as you type. Each is {id,title,author,cols}.
const recPick=l=>({id:l.id,title:l.title,author:l.author,layers:l.layers.map(x=>x.mix||x)});
async function renderEdit(id,kind){
 const el=$('v-edit');
 if(!ME){el.innerHTML='<h1>New '+kind+'</h1>'+signInLink(KIND[kind].t+'s are saved to your account.');return}
 let r={kind,title:'',summary:'',body:'',link:'',paints:[],steps:[],cover:'',meta:{},visibility:'private'},REC={};
 if(id){try{const d=await api('/recipes/'+encodeURIComponent(id));r=d.recipe;Object.values(d.linked||{}).forEach(l=>REC[l.id]=recPick(l))}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p>`;return}}
 else if(NMM_DRAFT){r={...r,...NMM_DRAFT};NMM_DRAFT=null} // a ramp or recipe started from the wheel
 r.meta={level:'',time:'',model:'',...(r.meta||{})};
 const steps=r.steps.length?r.steps.map(s=>({recipe:'',...s,mix:s.mix.map(m=>({...m}))})):[{title:'',text:'',image:'',mix:[],recipe:''}];
 let cover=r.cover,busy=0;
 // Paints listed before steps existed (or outside any step) are kept as "other paints".
 const inSteps=new Set(steps.flatMap(s=>s.mix.map(m=>m.k)));let extra=r.paints.filter(k=>!inSteps.has(k));
 // Paints that came in with a linked recipe aren't "other paints"; the server adds them back from the recipe.
 const fromRec=new Set(Object.values(REC).flatMap(l=>l.layers.flat().map(m=>m.k)));extra=extra.filter(k=>!fromRec.has(k));
 const back=id?'#/recipe/'+esc(id):'#/recipes';
 // My recipes and saved recipes, for the "use a recipe" picker. Loaded the first time it opens.
 let myRecs=null;const loadMine=async()=>{if(myRecs)return myRecs;
  const [a,b]=await Promise.all(['mine','saved'].map(sc=>api(`/recipes?scope=${sc}&kind=recipe`).then(d=>d.recipes).catch(()=>[])));
  const seen=new Set();return myRecs=[...a,...b].filter(x=>!seen.has(x.id)&&seen.add(x.id)&&x.id!==id)};

 function draw(){const pal=r.kind==='palette',rec=r.kind==='recipe'||pal,T=KIND[r.kind].t.toLowerCase();
 el.innerHTML=`<p><a href="${back}">← Back</a></p><h1>${id?'Edit':'New'} ${T}</h1><div class="panel">
 <div class="f"><span>What are you making?</span><div class="kpick">
  <label class="${rec&&!pal?'on':''}"><input type="radio" name="eKind" value="recipe"${rec&&!pal?' checked':''}><b><span class="tag trec">Recipe</span> One colour</b><small>The paints for one look, like bone or purple robes, as a short list of layers from base to highlight.</small></label>
  <label class="${rec?'':'on'}"><input type="radio" name="eKind" value="tutorial"${rec?'':' checked'}><b><span class="tag ttut">Tutorial</span> A whole model</b><small>Step by step with photos and video. A step can use one of your recipes.</small></label>
  <label class="${pal?'on':''}"><input type="radio" name="eKind" value="palette"${pal?' checked':''}><b><span class="tag tpal">Palette</span> Colours of a photo</b><small>A set of paints for a scene, artwork or mood. From a photo on the colour wheel fills one in for you.</small></label></div></div>
 <label class="f"><span>Title</span><input type="text" id="eTitle" maxlength="120" placeholder="${pal?'e.g. Desert sunset':rec?'e.g. Weathered bone':'e.g. Painting a Space Marine captain'}"></label>
 <label class="f"><span>Short summary</span><input type="text" id="eSum" maxlength="300" placeholder="${pal?'e.g. Warm dusk colours for a desert army':rec?'e.g. Warm bone for skulls, horns and parchment':'What this is for'}"></label>
 <div class="f"><span>${pal?'The photo it comes from (optional, shown on the card)':rec?'Photo of the colour on a model (optional)':'Main photo (the finished model)'}</span><div id="eCover"></div></div>
 ${rec?'':`<div class="row tmeta"><label class="f"><span>Level</span><select id="eLevel"><option value="">Any</option>${Object.entries(LEVEL).map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></label>
  <label class="f"><span>Time it takes</span><input type="text" id="eTime" maxlength="40" placeholder="e.g. 3 hours"></label>
  <label class="f"><span>Model or army</span><input type="text" id="eModel" maxlength="120" placeholder="e.g. Ultramarines captain"></label></div>
 <label class="f"><span>Video link (optional; YouTube and Vimeo play in the page)</span><input type="url" id="eLink" maxlength="500" placeholder="https://youtube.com/watch?v=…"></label>`}</div>
 <h2 style="font-size:16px;margin-top:16px">${pal?'Colours':rec?'Layers':'Steps'}</h2><p class="s">${pal?'One colour per paint, e.g. Sky, Sand, Shadow. A colour can also be a mix of paints with their ratio.':rec?'One layer per paint stage, in painting order, e.g. Base, Shade, Highlight. Add the paints with their ratio (add Water to show thinning).':'One step per stage, e.g. Base coat, then Edge highlight. Pick a recipe for a step, or add the paints you used with their ratio (add Water to show thinning, e.g. 1:2 for a glaze), a photo of the result, and any details.'}</p>
 ${rec?'<div id="eStrip"></div>':''}<div id="eSteps"></div><button class="btn" id="eAdd" type="button">+ Add ${pal?'colour':rec?'layer':'step'}</button>
 <div class="panel" style="margin-top:14px"><div class="f"><span>Other paints used (not in a ${pal?'colour':rec?'layer':'step'})</span><div id="eX"></div></div>
 <label class="f"><span>Notes (optional)</span><textarea id="eBody" maxlength="20000" style="min-height:90px" placeholder="Anything else: brushes, tips, thinning"></textarea></label>
 <div class="f"><span>Who can see it</span><label><input type="radio" name="eVis" value="private"> Private, only me</label><br><label><input type="radio" name="eVis" value="public"> Public, anyone can view and registered users can comment</label></div>
 <div class="row"><button class="btn pri" id="eSave" type="button">Save</button><a class="btn" href="${back}">Cancel</a><span class="err" id="eErr"></span></div></div>
 <datalist id="stepNames">${(pal?[]:rec?LAYER_NAMES:STEP_NAMES).map(n=>`<option value="${n}">`).join('')}</datalist>`;
 const bind=(eid,get,set)=>{const e=$(eid);if(e){e.value=get();e.oninput=e.onchange=()=>set(e.value)}};
 bind('eTitle',()=>r.title,v=>r.title=v);bind('eSum',()=>r.summary,v=>r.summary=v);bind('eBody',()=>r.body,v=>r.body=v);bind('eLink',()=>r.link,v=>r.link=v);
 bind('eLevel',()=>r.meta.level,v=>r.meta.level=v);bind('eTime',()=>r.meta.time,v=>r.meta.time=v);bind('eModel',()=>r.meta.model,v=>r.meta.model=v);
 el.querySelector(`input[name=eVis][value=${r.visibility}]`).checked=true;
 el.querySelectorAll('input[name=eVis]').forEach(x=>x.onchange=()=>r.visibility=x.value);
 el.querySelectorAll('input[name=eKind]').forEach(x=>x.onchange=()=>{r.kind=x.value;draw()});
 photoSlot($('eCover'),()=>cover,v=>cover=v,rec?'Add photo':'Add main photo');
 // The photo picked in From a photo stays on the device until the painter chooses to add it here.
 if(pal&&!cover&&window.pdPhotoFile){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Add the photo you used';$('eCover').querySelector('.row').prepend(b);
  b.onclick=async()=>{b.disabled=true;b.textContent='Uploading…';busy++;try{cover=await uploadPhoto(window.pdPhotoFile);busy--;draw()}catch(e){busy--;b.textContent=e.message}}}
 drawExtra();drawSteps();
 $('eAdd').onclick=()=>{steps.push({title:'',text:'',image:'',mix:[],recipe:''});drawSteps();$('eSteps').lastElementChild.querySelector('[data-f=title]').focus()};
 $('eSave').onclick=save}

 // A photo slot: shows the picture with Replace/Remove, or an upload button.
 function photoSlot(box,get,set,label){
  const draw=()=>{const v=get();box.innerHTML=(v?`<img class="ph" src="${imgURL(v)}" alt="">`:'')+`<div class="row"><label class="btn">${v?'Replace photo':label}<input type="file" accept="image/*" hidden></label>${v?'<button class="btn dan" type="button" data-rm>Remove</button>':''}<span class="s" data-st></span></div>`;
   box.querySelector('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=box.querySelector('[data-st]');st.textContent='Uploading…';busy++;
    try{set(await uploadPhoto(f));draw()}catch(err){st.textContent=err.message;st.className='err'}busy--};
   const rm=box.querySelector('[data-rm]');if(rm)rm.onclick=()=>{set('');draw()}};
  draw()}

 function drawExtra(){const box=$('eX');box.innerHTML=`<div class="chips">${extra.map(k=>pchip(k,1)).join('')}</div><div></div>`;
  box.querySelectorAll('.x').forEach(x=>x.onclick=()=>{extra=extra.filter(k=>k!==x.closest('.chip').dataset.k);drawExtra()});
  paintSearch(box.lastElementChild,()=>extra,k=>{if(extra.length<60)extra.push(k);drawExtra();box.querySelector('input[type=search]').focus()})}

 // The recipe slot on a tutorial step: the chosen recipe as a strip, or a search over your, saved and public recipes.
 function recSlot(box,s){
  const l=s.recipe&&REC[s.recipe];
  if(s.recipe){box.innerHTML=`<div class="lrec ed">${l?stripHTML(l.layers):''}<b>Recipe: ${l?esc(l.title):'(not available)'}</b>${l?` <span class="s">by ${esc(l.author.name)}</span>`:''} <button class="btn dan" type="button" data-rr>Remove</button></div>`;
   box.querySelector('[data-rr]').onclick=()=>{s.recipe='';drawSteps()};return}
  box.innerHTML=`<button class="btn" type="button" data-ro>Use a recipe</button>`;
  box.querySelector('[data-ro]').onclick=async()=>{
   box.innerHTML=`<input class="inp" type="search" placeholder="Search your, saved and public recipes"><div class="res"><p class="s" style="padding:6px 10px">Loading…</p></div>`;
   const q=box.querySelector('input'),R=box.querySelector('.res');q.focus();
   const mine=await loadMine();let t=0;
   const show=list=>{R.innerHTML=list.length?list.slice(0,30).map(x=>`<div class="pi rpi" data-rid="${esc(x.id)}">${stripHTML(x.layers||[])}<span><b>${esc(x.title)}</b> <em>${esc(x.author.name)}</em></span></div>`).join('')
     :`<p class="s" style="padding:6px 10px">${q.value?'No recipes match.':'You have no recipes yet. Make one from + New recipe, or search public ones.'}</p>`;
    R.querySelectorAll('[data-rid]').forEach(e=>e.onclick=()=>{const x=list.find(y=>y.id===e.dataset.rid);REC[x.id]=recPick(x);s.recipe=x.id;if(!s.title)s.title=x.title;drawSteps()})};
   const go=async()=>{const v=q.value.trim().toLowerCase(),own=mine.filter(x=>!v||x.title.toLowerCase().includes(v));
    let pub=[];if(v.length>1)try{pub=(await api(`/recipes?kind=recipe&q=${encodeURIComponent(v)}&limit=30`)).recipes.filter(x=>x.id!==id&&!own.some(y=>y.id===x.id))}catch(e){}
    show([...own,...pub])};
   q.oninput=()=>{clearTimeout(t);t=setTimeout(go,200)};go()}}

 function drawSteps(){const S=$('eSteps'),pal=r.kind==='palette',rec=r.kind==='recipe'||pal,W=pal?'Colour':rec?'Layer':'Step';
  if(rec){$('eStrip').innerHTML=stripHTML(steps.map(s=>s.mix),'tall')}
  S.innerHTML=steps.map((s,i)=>`<div class="panel step" data-i="${i}"><div class="row" style="margin:0">${rec?`<span class="lc" style="background:${layerHex(s.mix)||'transparent'}"></span>`:''}<b>${W} ${i+1}</b><span style="flex:1"></span>
   <button class="btn" type="button" data-mv="-1" ${i?'':'disabled'} title="Move up">↑</button><button class="btn" type="button" data-mv="1" ${i<steps.length-1?'':'disabled'} title="Move down">↓</button><button class="btn dan" type="button" data-del title="Remove ${W.toLowerCase()}">✕</button></div>
   <label class="f"><span>${W} name</span><input type="text" list="stepNames" maxlength="80" data-f="title" placeholder="${pal?'e.g. Sky':rec?'e.g. Base':'e.g. Base coat'}"></label>
   ${rec?'':'<div class="f"><span>Recipe for this step (optional)</span><div data-rec></div></div>'}
   <div class="f"><span>${!rec&&s.recipe?'Other paints in this step':'Paints and mix ratio'}</span><div class="mixed">${s.mix.map((m,j)=>{const p=mixP(m.k);return `<div class="mrow"><i style="background:${p?p.h:'#888'}"></i><span>${p===WATER?'💧 Water <em>for thinning</em>':p?esc(p.n)+' <em>'+esc(GL[p.g])+'</em>':'Unknown paint'}</span><input type="number" min="1" max="20" value="${m.parts}" data-parts="${j}" title="Parts" aria-label="Parts"><span class="s">part${m.parts>1?'s':''}</span><span class="x" data-rmix="${j}" title="Remove">×</span></div>`}).join('')}</div>
    ${s.mix.length>1?`<p class="s" data-ratio>Ratio ${s.mix.map(m=>m.parts).join(':')}</p>`:''}<div data-ps></div>${s.mix.some(m=>m.k===WATER.k)||s.mix.length>=8?'':'<button class="btn" type="button" data-water title="Add water to show a thinning ratio, e.g. 1:2 paint to water for a glaze">+ 💧 Water</button>'}</div>
   <label class="f"><span>${rec?'Tip (optional)':'Details'}</span><textarea maxlength="4000" data-f="text" style="min-height:${rec?44:70}px" placeholder="${rec?'e.g. Thin coats, only on the raised edges':'e.g. Two thin coats, thinned with a drop of medium'}"></textarea></label>
   ${!rec||s.image?`<div class="f"><span>Photo of this ${W.toLowerCase()}</span><div data-ph></div></div>`:''}</div>`).join('');
  S.querySelectorAll('.step').forEach(box=>{const i=+box.dataset.i,s=steps[i];
   box.querySelectorAll('[data-f]').forEach(inp=>{inp.value=s[inp.dataset.f];inp.oninput=()=>s[inp.dataset.f]=inp.value});
   box.querySelectorAll('[data-parts]').forEach(inp=>inp.oninput=()=>{s.mix[+inp.dataset.parts].parts=Math.min(20,Math.max(1,+inp.value||1));const rt=box.querySelector('[data-ratio]');if(rt)rt.textContent='Ratio '+s.mix.map(m=>m.parts).join(':');if(rec)$('eStrip').innerHTML=stripHTML(steps.map(s=>s.mix),'tall')});
   box.querySelectorAll('[data-rmix]').forEach(x=>x.onclick=()=>{s.mix.splice(+x.dataset.rmix,1);drawSteps()});
   box.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const j=i+ +b.dataset.mv;[steps[i],steps[j]]=[steps[j],steps[i]];drawSteps()});
   box.querySelector('[data-del]').onclick=()=>{steps.splice(i,1);if(!steps.length)steps.push({title:'',text:'',image:'',mix:[],recipe:''});drawSteps()};
   paintSearch(box.querySelector('[data-ps]'),()=>s.mix.map(m=>m.k),k=>{if(s.mix.length<8)s.mix.push({k,parts:1});drawSteps();S.querySelector(`.step[data-i="${i}"] [data-ps] input[type=search]`).focus()},true);
   const wb=box.querySelector('[data-water]');if(wb)wb.onclick=()=>{s.mix.push({k:WATER.k,parts:1});drawSteps();S.querySelector(`.step[data-i="${i}"] [data-parts="${s.mix.length-1}"]`).focus()};
   const rs=box.querySelector('[data-rec]');if(rs)recSlot(rs,s);
   const ph=box.querySelector('[data-ph]');if(ph)photoSlot(ph,()=>s.image,v=>s.image=v,'Add photo')})}

 async function save(){if(busy){$('eErr').textContent='Please wait for photos to finish uploading.';return}
  $('eSave').disabled=true;$('eErr').textContent='';
  const rec=r.kind!=='tutorial';
  // A recipe or palette keeps no video, tutorial extras or recipe links (the server drops them too).
  const b={kind:r.kind,title:r.title,summary:r.summary,body:r.body,link:rec?'':r.link.trim(),cover,meta:rec?{}:r.meta,
   steps:steps.map(s=>({title:s.title,text:s.text,image:s.image,mix:s.mix,recipe:rec?'':s.recipe})),paints:extra,visibility:r.visibility};
  try{const d=await api(id?'/recipes/'+id:'/recipes',{method:id?'PUT':'POST',body:b});RFOR.clear();location.hash='#/recipe/'+d.recipe.id}
  catch(e){$('eErr').textContent=e.message;$('eSave').disabled=false}}
 draw()}

/* ---------- wheel: recipes using the selected paint ---------- */
// The wheel's side panel calls this after showing a paint. Results are cached per paint, so redraws don't refetch.
const RFOR=new Map();
window.pdRecipesFor=p=>{
 if(!API)return;const el=$('sel');if(!el)return;
 const box=document.createElement('div');box.className='mt rfor';el.appendChild(box);
 const show=list=>{if(!box.isConnected)return;
  box.innerHTML=`<h2>Recipes using this paint</h2>${list.length?`<div class="rcl">${list.slice(0,6).map(r=>`<a class="rcm" href="#/recipe/${esc(r.id)}">${stripHTML(r.layers||[])}<b>${esc(r.title)}</b><span>${esc(r.author.name)} · ${bottle(1)} ${r.votes}</span></a>`).join('')}</div>`:'<p class="s">No public recipes use this paint yet.</p>'}
  ${list.length>6?`<button type="button" data-rall>See all ${list.length}</button>`:''}${ME?'<button type="button" data-rnew>+ New recipe with this paint</button>':''}`;
  const a=box.querySelector('[data-rall]');if(a)a.onclick=()=>{rScope='public';rKind='recipe';rPaint=p.k;location.hash='#/recipes'};
  const n=box.querySelector('[data-rnew]');if(n)n.onclick=()=>{NMM_DRAFT={kind:'recipe',title:'',steps:[{title:'Base',text:'',image:'',mix:[{k:p.k,parts:1}]}]};location.hash='#/new/recipe'}};
 if(RFOR.has(p.k)){show(RFOR.get(p.k));return}
 box.innerHTML='<h2>Recipes using this paint</h2><p class="s">Loading…</p>';
 api(`/recipes?kind=recipe&paint=${encodeURIComponent(p.k)}&limit=100`).then(d=>{RFOR.set(p.k,d.recipes);show(d.recipes)}).catch(()=>box.remove())};

/* ---------- reports & moderation ---------- */
// A photo a moderator hid or deleted answers 404: drop it (and the link around it) instead of showing a broken image.
document.addEventListener('error',e=>{const i=e.target;if(i.tagName==='IMG'&&/\/api\/images\//.test(i.src)&&!i.closest('#v-admin')){const a=i.closest('a[target]');(a||i).hidden=true}},true);
// The Report button on public recipes, tutorials, palettes and profiles. Anyone can report, signed in or not.
let REP=null;
function openReport(kind,id,name){const D=$('rpDlg'),F=$('rpForm');REP={kind,id};F.reset();
 $('rpErr').textContent='';$('rpBody').hidden=false;$('rpSend').hidden=false;$('rpSend').disabled=false;$('rpNo').textContent='Cancel';$('rpDone').hidden=true;
 $('rpWhat').textContent=kind==='user'?`the profile of ${name}`:`"${name}"`;D.showModal()}
$('rpNo').onclick=()=>$('rpDlg').close();
$('rpForm').onsubmit=async e=>{e.preventDefault();const F=$('rpForm');$('rpErr').textContent='';$('rpSend').disabled=true;
 try{await api('/reports',{method:'POST',body:{kind:REP.kind,id:REP.id,reason:F.rpReason.value,note:$('rpNote').value,website:$('rpWeb').value}});
  $('rpBody').hidden=true;$('rpSend').hidden=true;$('rpDone').hidden=false;$('rpNo').textContent='Close';$('rpNo').focus()}
 catch(err){$('rpErr').textContent=err.message;$('rpSend').disabled=false}};

// Admin: open reports and the newest photos. A photo can be hidden (and shown again) or deleted; an account can be blocked.
const SCAN={ok:'',unchecked:'<span class="tag warn" title="The automatic check could not run on this photo">not checked</span>','':'<span class="tag" title="Uploaded before the automatic check">before checks</span>'};
async function renderAdmin(){
 const el=$('v-admin');
 if(!ME?.admin){el.innerHTML='<h1>Moderation</h1><p class="s">Admins only.</p>';return}
 el.innerHTML='<h1>Moderation</h1><p class="s">Loading…</p>';
 let d;try{d=await api('/admin/moderation')}catch(e){el.innerHTML=`<h1>Moderation</h1><p class="err">${esc(e.message)}</p>`;return}
 const pers=u=>u?`<a href="#/u/${esc(u.id)}">${esc(u.name)}</a>${u.blocked?' <span class="tag dang">blocked</span>':''}${u.unconfirmed?' <span class="tag">email not confirmed</span>':''}`:'';
 const blockBtn=u=>u&&u.id!==ME.id&&u.name!=='(deleted account)'?`<button class="btn sm${u.blocked?'':' dan'}" type="button" data-blk="${esc(u.id)}" data-on="${u.blocked?0:1}">${u.blocked?'Unblock':'Block'} ${esc(u.name)}</button>`:'';
 const where=w=>w.type==='icon'?`<a href="#/u/${esc(w.id)}">profile icon</a>`:`<a href="#/recipe/${esc(w.id)}">${esc(w.title)}</a> <span class="s">(${esc(w.kind)}, ${esc(w.visibility)})</span>`;
 const imgCard=i=>`<div class="mimg${i.hidden?' hid':''}" data-img="${esc(i.id)}"><a href="${imgURL(i.id)}" target="_blank"><img src="${imgURL(i.id)}" alt="" loading="lazy"></a>
  <div class="s">${i.hidden?'<span class="tag dang">hidden</span>':''}${SCAN[i.scan]??''} ${pers(i.user)} · ${fmtDate(i.created_at)}</div>
  <div class="s">${i.used.length?'Used in '+i.used.map(where).join(', '):'Not used anywhere yet'}</div>
  <div class="row"><button class="btn sm" type="button" data-hide="${i.hidden?0:1}">${i.hidden?'Show again':'Hide'}</button><button class="btn sm dan" type="button" data-delimg>Delete</button></div></div>`;
 const what=r=>r.kind==='upload'?`A photo by ${pers(r.user)} was refused at upload: ${esc(r.note)}`
  :r.kind==='user'?`Profile of ${pers(r.user)}`
  :r.target?`<a href="#/recipe/${esc(r.target.id)}">${esc(r.target.title)}</a> (${esc(r.target.kind)}, ${esc(r.target.visibility)}) by ${pers(r.user)}`:'A recipe that has since been deleted';
 const by=r=>r.kind==='upload'?'':r.reporter?` · reported by ${pers(r.reporter)}`:' · reported by someone not signed in';
 const repCard=r=>`<div class="panel mrep" data-rep="${esc(r.id)}"><h3>${esc(r.label)}</h3>
  <p class="s">${what(r)} · ${fmtDate(r.created_at)}${by(r)}</p>
  ${r.kind!=='upload'&&r.note?`<div class="steps">${esc(r.note)}</div>`:''}
  ${r.images.length?`<div class="mgrid">${r.images.map(imgCard).join('')}</div>`:''}
  <div class="row">${r.kind==='recipe'&&r.target?`<button class="btn sm dan" type="button" data-delrec="${esc(r.target.id)}">Delete this ${esc(r.target.kind)}</button>`:''}${blockBtn(r.user)}<button class="btn sm pri" type="button" data-done>Mark as dealt with</button></div></div>`;
 el.innerHTML=`<h1>Moderation</h1><p class="s">Hiding a photo stops it loading for everyone but admins, and you can show it again later. Deleting is for good. Blocking an account makes all its recipes private, hides its picture, profile text and comments, and stops it uploading, commenting or sharing.</p>
 <h2>Open reports (${d.reports.length})</h2>${d.reports.map(repCard).join('')||'<p class="s">No open reports.</p>'}
 <h2>Newest photos</h2><div class="mgrid">${d.images.map(imgCard).join('')||'<p class="s">No photos yet.</p>'}</div>`;
 const act=async(b,fn)=>{b.disabled=true;try{await fn();renderAdmin()}catch(e){b.disabled=false;b.parentElement.insertAdjacentHTML('beforeend',`<span class="err">${esc(e.message)}</span>`)}};
 // Deleting and blocking ask for a second click.
 const twice=(b,t)=>{if(b.dataset.c)return true;b.dataset.c=1;b.textContent=t;return false};
 const imgOf=b=>b.closest('[data-img]').dataset.img;
 el.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>act(b,()=>api('/admin/images/'+imgOf(b),{method:'PUT',body:{hidden:b.dataset.hide==='1'}})));
 el.querySelectorAll('[data-delimg]').forEach(b=>b.onclick=()=>twice(b,'Click again to delete')&&act(b,()=>api('/admin/images/'+imgOf(b),{method:'DELETE'})));
 el.querySelectorAll('[data-delrec]').forEach(b=>b.onclick=()=>twice(b,'Click again to delete for good')&&act(b,()=>api('/recipes/'+b.dataset.delrec,{method:'DELETE'})));
 el.querySelectorAll('[data-blk]').forEach(b=>b.onclick=()=>(b.dataset.on!=='1'||twice(b,'Click again to block'))&&act(b,()=>api('/admin/users/'+b.dataset.blk,{method:'PUT',body:{blocked:b.dataset.on==='1'}})));
 el.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>act(b,()=>api('/admin/reports/'+b.closest('[data-rep]').dataset.rep,{method:'PUT',body:{status:'done'}})))}

/* ---------- feedback ---------- */
// The floating Feedback button on every page opens this popup; messages go to /api/feedback.
{const D=$('fbDlg'),F=$('fbForm');let sent=false;
 const reset=()=>{sent=false;F.reset();$('fbErr').textContent='';$('fbBody').hidden=false;$('fbSend').hidden=false;$('fbSend').disabled=false;$('fbNo').textContent='Cancel';const m=D.querySelector('#fbDone');if(m)m.remove()};
 $('fbBtn').onclick=()=>{if(sent)reset();if(ME&&!$('fbEmail').value)$('fbEmail').value=ME.email||'';D.showModal();$('fbMsg').focus()};
 $('fbNo').onclick=()=>D.close();
 F.onsubmit=async e=>{e.preventDefault();$('fbErr').textContent='';$('fbSend').disabled=true;
  try{await api('/feedback',{method:'POST',body:{kind:F.fbKind.value,message:$('fbMsg').value,email:$('fbEmail').value.trim(),website:$('fbWeb').value,page:location.hash||'#/'}});
   sent=true;$('fbBody').hidden=true;$('fbSend').hidden=true;$('fbNo').textContent='Close';
   $('fbT').insertAdjacentHTML('afterend','<p class="ok" id="fbDone">Thanks! Your feedback has been sent.</p>');$('fbNo').focus()}
  catch(err){$('fbErr').textContent=err.message;$('fbSend').disabled=false}}}

if(FIRST)route();
loadMe().then(route);
})();

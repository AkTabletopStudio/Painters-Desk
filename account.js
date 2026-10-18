// Accounts, "My paints" collection, recipes & tutorials, and comments.
// Talks to the Worker API at /api/*. If the API isn't reachable (offline, or a static-only deploy),
// these extra pages stay hidden and the colour wheel works exactly as before.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BYKEY=new Map(P.map(p=>[p.k,p]));
const VIEWS=['wheel','paints','recipes','recipe','edit','account','profile','reset'];
let ME=null,INFO=null,API=false;

async function api(path,{method='GET',body}={}){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(d.error||'Something went wrong ('+r.status+')');e.status=r.status;throw e}
 return d}
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const cardHTML=r=>`<a class="card" href="#/recipe/${esc(r.id)}">${r.cover?`<img class="thumb" src="${imgURL(r.cover)}" alt="" loading="lazy">`:''}<h3>${esc(r.title)}</h3><span class="tag">${r.kind==='tutorial'?'Tutorial':'Recipe'}</span>${r.visibility==='private'?'<span class="tag">Private</span>':''}${r.steps?`<span class="tag">${r.steps} step${r.steps===1?'':'s'}</span>`:''}<div class="sw">${r.paints.slice(0,16).map(k=>swatch(BYKEY.get(k))).join('')}</div><div class="s">${esc(r.summary)}</div><div class="n">${esc(r.author.name)} · ${fmtDate(r.updated_at)}${r.visibility==='public'?` · ${r.comments} comment${r.comments===1?'':'s'}`:''}</div>${r.visibility==='public'?`<div class="n stats">${statsHTML(r)}</div>`:''}</a>`;
const swatch=p=>p?`<i style="background:${p.h}" title="${esc(p.n)}"></i>`:'<i title="Unknown paint"></i>';
const pchip=(k,x)=>{const p=BYKEY.get(k);return p?`<span class="chip" data-k="${esc(k)}"><i style="background:${p.h}"></i>${star(p)}${esc(p.n)} <span style="color:var(--mut)">${esc(p.c)} · ${esc(GL[p.g])}</span>${x?' <span class="x" title="Remove">×</span>':''}</span>`:`<span class="chip" data-k="${esc(k)}"><i></i>Unknown paint${x?' <span class="x">×</span>':''}</span>`};
const signInLink=(why)=>`<p class="s">${why} <a href="#/account">Sign in</a> to continue.</p>`;
// A small round picture, or the first letter of the name when there isn't one.
const avHTML=(u,cls='av')=>u.avatar?`<img class="${cls}" src="${esc(u.avatar)}" alt="">`:`<span class="${cls} ini" aria-hidden="true">${esc((u.name||'?').trim().charAt(0).toUpperCase())}</span>`;
const who=a=>`<a class="plink" href="#/u/${esc(a.id)}">${avHTML(a)}${esc(a.name)}</a>`;
function showOnWheel(keys){const s=new Set(keys);P.forEach(p=>p.on=s.has(p.k));sync();location.hash='#/'}

/* ---------- session ---------- */
async function loadMe(){
 // The extra tabs only show once there is a way to sign in (or someone is already signed in).
 try{INFO=await api('/me');ME=INFO.user;API=!!(ME||INFO.devLogin||INFO.providers.length||INFO.passwords)}catch(e){API=false;ME=null}
 if(ME){try{OWN=new Set((await api('/collection')).paints)}catch(e){OWN=new Set()}}else{OWN=null;ONLY_MINE=false;$('onlyMine').checked=false}
 document.querySelectorAll('#nav a[data-v]').forEach(a=>{if(a.dataset.v!=='wheel')a.hidden=!API});
 $('acct').innerHTML=ME?avHTML(ME)+esc(ME.name):'Sign in';
 $('mine').hidden=!ME;
 renderNeu();draw()}

/* ---------- router ---------- */
function route(){
 const h=location.hash.replace(/^#\/?/,''),[v,id,sub]=h.split(/[/?]/);
 let view=v||'wheel';
 if(view==='recipe'&&sub==='edit')view='edit';else if(view==='new')view='edit';else if(view==='u')view='profile';
 if(!VIEWS.includes(view)||(!API&&view!=='wheel'))view='wheel';
 VIEWS.forEach(n=>$('v-'+n).hidden=n!==view);
 const full=view==='wheel'||view==='paints';$('footFull').hidden=!full;$('footShort').hidden=full;
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===view||(a.dataset.v==='recipes'&&(view==='recipe'||view==='edit'))));
 if(view==='paints')renderPaints();
 else if(view==='recipes')renderRecipes();
 else if(view==='recipe')renderRecipe(id);
 else if(view==='edit')renderEdit(v==='new'?null:id);
 else if(view==='account')renderAccount();
 else if(view==='profile')renderProfile(id);
 else if(view==='reset')renderReset(id);
 if(view!=='wheel')scrollTo(0,0)}
addEventListener('hashchange',route);
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
  el.innerHTML=`<h1>${up?'Create an account':'Sign in'}</h1>${err}<div class="panel"><p class="s">Sign in to save your paint collection, use it on the colour wheel, save recipes and tutorials, and join discussions. See the <a href="privacy.html">privacy policy</a> for what we store.</p>
  ${btns?`<div class="row">${btns}</div><p class="s">Your first sign-in with one of these creates your account.</p><p class="or"><span>or use your email</span></p>`:''}
  <div class="row"><button class="btn${up?'':' pri'}" type="button" data-m="in">Sign in</button><button class="btn${up?' pri':''}" type="button" data-m="up">Create account</button></div>
  <form id="pwForm">${up?'<label class="f"><span>Display name</span><input type="text" id="aName" maxlength="40" autocomplete="nickname" required></label>':''}
  <label class="f"><span>Email</span><input type="email" class="inp" id="aEmail" maxlength="200" autocomplete="email" required></label>
  <label class="f"><span>Password${up?' (at least 8 characters)':''}</span><input type="password" class="inp" id="aPw" minlength="${up?8:1}" maxlength="200" autocomplete="${up?'new-password':'current-password'}" required></label>
  <div class="row"><button class="btn pri" type="submit" id="aGo">${up?'Create account':'Sign in'}</button><span class="err" id="aErr"></span></div></form>
  ${INFO.mail?(up?'<p class="s">We\'ll email you a link to confirm your address.</p>':'<p><button class="lnk" type="button" data-m="forgot" style="font-size:14px;padding:0">Forgot your password?</button></p>')
   :`<p class="s">${up?'We can\'t email you yet, so there is no password reset link. Keep your password safe, or link Google from your account page as a backup way in.':'Forgot your password? There is no email reset yet. If you linked Google to your account, sign in with that and set a new password from your account page.'}</p>`}
  ${INFO.devLogin?`<div class="row"><input class="inp" id="devName" placeholder="Test user name" value="Test Painter" style="max-width:220px"><button class="btn" id="devGo" type="button">Dev sign-in</button><span class="s">Local testing only.</span></div>`:''}</div>`;
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{authMode=b.dataset.m;renderAccount()});
  $('pwForm').onsubmit=async e=>{e.preventDefault();$('aGo').disabled=true;$('aErr').textContent='';
   try{await api(up?'/auth/register':'/auth/password',{method:'POST',body:{email:$('aEmail').value,password:$('aPw').value,name:up?$('aName').value:undefined}});
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
 $('out').onclick=async()=>{await api('/auth/logout',{method:'POST'});await loadMe();location.hash='#/'};
 $('del').onclick=()=>$('delc').hidden=false;
 $('del2').onclick=async()=>{await api('/me',{method:'DELETE'});await loadMe();location.hash='#/'}}

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
 ${mine?'<a class="btn" href="#/account">Edit profile</a>':''}</div></div>
 ${p.bio?`<div class="panel"><div class="steps">${esc(p.bio)}</div></div>`:''}
 <div class="panel"><h2>Favourite paints</h2>${p.favourites.length?`<div class="chips" id="fp">${p.favourites.map(k=>pchip(k)).join('')}</div><button class="btn" id="fWheel" type="button">Show these on the wheel</button>`:`<p class="s">${mine?'You haven\'t picked any favourites yet. Add them on your account page.':'No favourite paints picked yet.'}</p>`}</div>
 <h2>Public recipes &amp; tutorials</h2>
 <div class="cards">${d.recipes.map(cardHTML).join('')||`<p class="s">${mine?'Nothing public yet. Make a recipe or tutorial public to show it here.':'Nothing shared yet.'}</p>`}</div>`;
 el.querySelectorAll('#fp .chip').forEach(c=>c.onclick=()=>{const q=BYKEY.get(c.dataset.k);if(q){showOnWheel([q.k]);setTimeout(()=>showP(q),0)}});
 if($('fWheel'))$('fWheel').onclick=()=>showOnWheel(p.favourites)}

/* ---------- my paints ---------- */
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
 <div id="ptree"></div></div>`;
 const tr=$('ptree');
 tr.innerHTML=BRANDS.map(([bn,gs])=>`<details class="br"><summary><b>${bn}</b> <span class="n" data-pb="${bn}"></span></summary>`+gs.map(g=>`<details class="rg" data-g="${g}"><summary><input type="checkbox" data-r="${g}"> ${GL[g]} <span class="n" data-pc="${g}"></span></summary><div class="pl">`+P.map((p,i)=>p.g===g?`<label class="pi" data-i="${i}"><input type="checkbox" data-i="${i}"><i style="background:${p.h}"></i><span>${esc(p.n)}${p.c?' <em>'+esc(p.c)+'</em>':''}</span></label>`:'').join('')+'</div></details>').join('')+'</details>').join('');
 const q=()=>$('pq').value.trim().toLowerCase(),only=()=>$('pOwned').checked,vis=p=>(!q()||(p.n+' '+p.c).toLowerCase().includes(q()))&&(!only()||OWN.has(p.k));
 const counts=()=>{tr.querySelectorAll('input[data-i]').forEach(e=>e.checked=OWN.has(P[+e.dataset.i].k));
  BRANDS.forEach(([bn,gs])=>{let bo=0;gs.forEach(g=>{const m=P.filter(p=>p.g===g),o=m.filter(p=>OWN.has(p.k)).length;bo+=o;const cb=tr.querySelector(`input[data-r="${g}"]`);if(!cb)return;cb.checked=o===m.length&&o>0;cb.indeterminate=o>0&&o<m.length;tr.querySelector(`[data-pc="${g}"]`).textContent=o+'/'+m.length});tr.querySelector(`[data-pb="${bn}"]`).textContent=bo?'('+bo+' owned)':''});
  $('pcnt').textContent=OWN.size+' paints owned.'};
 const filt=()=>{const f=!!q()||only();tr.querySelectorAll('label.pi').forEach(l=>l.hidden=!vis(P[+l.dataset.i]));
  tr.querySelectorAll('details.rg').forEach(d=>{const v=!!d.querySelector('label.pi:not([hidden])');d.hidden=f&&!v;if(f)d.open=v});
  tr.querySelectorAll('details.br').forEach(d=>{d.hidden=f&&!d.querySelector('details.rg:not([hidden])');if(f)d.open=true})};
 tr.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.r)setOwned(P.filter(p=>p.g===t.dataset.r&&(!q()||(p.n+' '+p.c).toLowerCase().includes(q()))).map(p=>p.k),t.checked);
  else if(t.dataset.i!==undefined)setOwned([P[+t.dataset.i].k],t.checked);
  $('pmsg').textContent='Saving…';counts()});
 $('pq').oninput=filt;$('pOwned').onchange=filt;
 $('pWheel').onclick=()=>showOnWheel([...OWN]);
 counts();filt()}

// Wheel page buttons for signed-in users.
$('useMine').onclick=()=>{if(OWN)showOnWheel([...OWN])};
$('addMine').onclick=()=>{const ks=P.filter(p=>p.on).map(p=>p.k);if(OWN&&ks.length){setOwned(ks,true);$('addMine').textContent=`Added ${ks.length} paints ✓`;renderNeu();draw();setTimeout(()=>$('addMine').textContent='Add ticked paints to my collection',2500)}};
$('onlyMine').onchange=e=>{ONLY_MINE=e.target.checked;if(sel)draw()};

/* ---------- recipes list ---------- */
let rScope='public';
async function renderRecipes(){
 if(!ME)rScope='public';
 const el=$('v-recipes');
 el.innerHTML=`<h1>Recipes &amp; tutorials</h1><p class="s">Painting recipes and tutorials from the community. Keep yours private or share them publicly.</p>
 <div class="row"><button class="btn${rScope==='public'?' pri':''}" data-s="public" type="button">Public</button>${ME?`<button class="btn${rScope==='mine'?' pri':''}" data-s="mine" type="button">Mine</button><button class="btn${rScope==='saved'?' pri':''}" data-s="saved" type="button">☆ Saved</button>`:''}<span class="sp" style="flex:1"></span>${ME?'<a class="btn pri" href="#/new">+ New tutorial or recipe</a>':'<a class="btn" href="#/account">Sign in to add yours</a>'}</div>
 <div class="bar"><input id="rq" type="search" placeholder="Search titles and summaries"></div><div id="rlist" class="cards"><p class="s">Loading…</p></div>`;
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rScope=b.dataset.s;renderRecipes()});
 let t=0;$('rq').oninput=()=>{clearTimeout(t);t=setTimeout(load,250)};
 async function load(){const L=$('rlist');
  try{const d=await api(`/recipes?scope=${rScope}&q=${encodeURIComponent($('rq').value)}`);
   L.innerHTML=d.recipes.length?d.recipes.map(cardHTML).join('')
    :`<p class="s">${rScope==='mine'?'You have not written any recipes yet.':rScope==='saved'?'Nothing saved yet. Press ☆ Save on a tutorial or recipe to keep it here.':'No public recipes yet. Be the first to share one.'}</p>`}
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
 const ps=mix.map(m=>({p:BYKEY.get(m.k),w:m.parts})).filter(x=>x.p);if(ps.length<2)return null;
 const lin=v=>{v/=255;return v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92},gam=v=>Math.round(255*(v>.0031308?1.055*Math.pow(v,1/2.4)-.055:12.92*v));
 const W=ps.reduce((a,x)=>a+x.w,0),c=[0,0,0];
 ps.forEach(({p,w})=>[1,3,5].forEach((o,i)=>c[i]+=lin(parseInt(p.h.slice(o,o+2),16))*w/W));
 return '#'+c.map(v=>gam(v).toString(16).padStart(2,'0')).join('')}
function mixHTML(mix){
 if(!mix.length)return'';
 const ratio=mix.length>1?`<b>${mix.map(m=>m.parts).join(':')} mix</b> of `:'';
 const mc=mixColour(mix);
 return `<div class="mix">${ratio}${mix.map(m=>{const p=BYKEY.get(m.k);return `<span class="chip" data-k="${esc(m.k)}"><i style="background:${p?p.h:'#888'}"></i>${p?star(p)+esc(p.n):'Unknown paint'}${mix.length>1?` <em>×${m.parts}</em>`:''}${p?` <span style="color:var(--mut)">${esc(GL[p.g])}</span>`:''}</span>`}).join('')}${mc?`<span class="chip" title="Rough estimate from the swatch colours"><i style="background:${mc}"></i>≈ mixed</span>`:''}</div>`}

// A paint search box; calls onPick(paintKey).
function paintSearch(box,exclude,onPick){
 box.innerHTML=`<input class="inp" type="search" placeholder="Add a paint (search name or code)">${OWN.size?'<label class="s"><input type="checkbox"> my paints only</label>':''}<div class="res" hidden></div>`;
 const q=box.querySelector('input[type=search]'),mine=box.querySelector('input[type=checkbox]'),R=box.querySelector('.res');
 const go=()=>{const t=q.value.trim().toLowerCase();if(!t){R.hidden=true;return}const ex=exclude();
  const hits=P.filter(p=>(p.n+' '+p.c).toLowerCase().includes(t)&&!ex.includes(p.k)&&(!mine?.checked||OWN.has(p.k))).slice(0,30);
  R.hidden=false;R.innerHTML=hits.map(p=>`<div class="pi" data-k="${esc(p.k)}"><i style="background:${p.h}"></i>${star(p)}<span>${esc(p.n)} <em>${esc(p.c)} · ${esc(GL[p.g])}</em></span></div>`).join('')||'<div class="s" style="padding:6px">No matches.</div>';
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
 const r=d.recipe,mine=ME&&ME.id===r.author.id,canMod=c=>ME&&(ME.id===c.author.id||mine||ME.admin);
 el.innerHTML=`<p><a href="#/recipes">← Recipes &amp; tutorials</a></p><h1>${esc(r.title)}</h1>
 <p class="s"><span class="tag">${r.kind==='tutorial'?'Tutorial':'Recipe'}</span><span class="tag">${r.visibility==='public'?'Public':'Private'}</span>by ${who(r.author)} · updated ${fmtDate(r.updated_at)}</p>
 ${voteHTML(r,mine)}
 ${r.cover?`<a href="${imgURL(r.cover)}" target="_blank"><img class="ph cover" src="${imgURL(r.cover)}" alt="${esc(r.title)}"></a>`:''}
 ${r.summary?`<p>${esc(r.summary)}</p>`:''}
 ${r.link?videoEmbed(r.link):''}
 <div class="panel"><h2>Paints used</h2><div class="chips" id="rp">${r.paints.map(k=>pchip(k)).join('')||'<span class="s">No paints listed.</span>'}</div>
 ${r.paints.length?'<button class="btn" id="rWheel" type="button">Show these paints on the wheel</button>':''}</div>
 ${r.steps.map((s,i)=>`<div class="panel step"><h2>Step ${i+1}${s.title?' · '+esc(s.title):''}</h2>
  ${s.image?`<a href="${imgURL(s.image)}" target="_blank"><img class="ph" src="${imgURL(s.image)}" alt="Step ${i+1}" loading="lazy"></a>`:''}
  ${mixHTML(s.mix)}${s.text?`<div class="steps">${esc(s.text)}</div>`:''}</div>`).join('')}
 ${r.body?`<div class="panel"><h2>${r.steps.length?'Notes':'Steps'}</h2><div class="steps">${esc(r.body)}</div></div>`:''}
 ${mine||ME?.admin?`<div class="row">${mine?`<a class="btn" href="#/recipe/${esc(r.id)}/edit">Edit</a>`:''}<button class="btn dan" id="rDel" type="button">Delete</button></div>`:''}
 ${r.visibility==='public'?`<div class="panel"><h2>Discussion</h2><div id="cms">${d.comments.map(c=>cmHTML(c,canMod(c))).join('')||'<p class="s" id="nocm">No comments yet.</p>'}</div>
  ${ME?`<label class="f"><span>Add a comment</span><textarea id="cBody" maxlength="2000" style="min-height:70px" class="inp"></textarea></label><div class="row"><button class="btn pri" id="cGo" type="button">Post comment</button><span class="err" id="cErr"></span></div>`:signInLink('Registered painters can join the discussion.')}</div>`
  :(mine?'<p class="s">This is private, so only you can see it. Make it public to share it and open the discussion.</p>':'')}`;
 el.querySelectorAll('#rp .chip,.mix .chip[data-k]').forEach(c=>c.onclick=()=>{const p=BYKEY.get(c.dataset.k);if(p){showOnWheel([p.k]);setTimeout(()=>showP(p),0)}});
 if($('rWheel'))$('rWheel').onclick=()=>showOnWheel(r.paints);
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
async function renderEdit(id){
 const el=$('v-edit');
 if(!ME){el.innerHTML='<h1>New tutorial</h1>'+signInLink('Tutorials are saved to your account.');return}
 let r={kind:'tutorial',title:'',summary:'',body:'',link:'',paints:[],steps:[],cover:'',visibility:'private'};
 if(id){try{r=(await api('/recipes/'+encodeURIComponent(id))).recipe}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p>`;return}}
 const steps=r.steps.length?r.steps.map(s=>({...s,mix:s.mix.map(m=>({...m}))})):[{title:'',text:'',image:'',mix:[]}];
 let cover=r.cover,busy=0;
 // Paints listed before steps existed (or outside any step) are kept as "other paints".
 const inSteps=new Set(steps.flatMap(s=>s.mix.map(m=>m.k)));let extra=r.paints.filter(k=>!inSteps.has(k));
 const back=id?'#/recipe/'+esc(id):'#/recipes';
 el.innerHTML=`<p><a href="${back}">← Back</a></p><h1>${id?'Edit':'New'} ${r.kind==='tutorial'?'tutorial':'recipe'}</h1><div class="panel">
 <label class="f"><span>Type</span><select id="eKind"><option value="tutorial">Tutorial</option><option value="recipe">Paint recipe</option></select></label>
 <label class="f"><span>Title</span><input type="text" id="eTitle" maxlength="120" placeholder="e.g. Deep purple robes in three steps"></label>
 <label class="f"><span>Short summary</span><input type="text" id="eSum" maxlength="300" placeholder="What this is for"></label>
 <div class="f"><span>Main photo (the finished model)</span><div id="eCover"></div></div>
 <label class="f"><span>Video link (optional; YouTube and Vimeo play in the page)</span><input type="url" id="eLink" maxlength="500" placeholder="https://youtube.com/watch?v=…"></label></div>
 <h2 style="font-size:16px;margin-top:16px">Steps</h2><p class="s">One step per stage, e.g. Base coat, then Edge highlight. Add the paints you used with their ratio, a photo of the result, and any details.</p>
 <div id="eSteps"></div><button class="btn" id="eAdd" type="button">+ Add step</button>
 <div class="panel" style="margin-top:14px"><div class="f"><span>Other paints used (not in a step)</span><div id="eX"></div></div>
 <label class="f"><span>Notes (optional)</span><textarea id="eBody" maxlength="20000" style="min-height:90px" placeholder="Anything else: brushes, tips, thinning"></textarea></label>
 <div class="f"><span>Who can see it</span><label><input type="radio" name="eVis" value="private"> Private, only me</label><br><label><input type="radio" name="eVis" value="public"> Public, anyone can view and registered users can comment</label></div>
 <div class="row"><button class="btn pri" id="eSave" type="button">Save</button><a class="btn" href="${back}">Cancel</a><span class="err" id="eErr"></span></div></div>
 <datalist id="stepNames">${STEP_NAMES.map(n=>`<option value="${n}">`).join('')}</datalist>`;
 $('eKind').value=r.kind;$('eTitle').value=r.title;$('eSum').value=r.summary;$('eBody').value=r.body;$('eLink').value=r.link;
 el.querySelector(`input[name=eVis][value=${r.visibility}]`).checked=true;

 // A photo slot: shows the picture with Replace/Remove, or an upload button.
 function photoSlot(box,get,set,label){
  const draw=()=>{const v=get();box.innerHTML=(v?`<img class="ph" src="${imgURL(v)}" alt="">`:'')+`<div class="row"><label class="btn">${v?'Replace photo':label}<input type="file" accept="image/*" hidden></label>${v?'<button class="btn dan" type="button" data-rm>Remove</button>':''}<span class="s" data-st></span></div>`;
   box.querySelector('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=box.querySelector('[data-st]');st.textContent='Uploading…';busy++;
    try{set(await uploadPhoto(f));draw()}catch(err){st.textContent=err.message;st.className='err'}busy--};
   const rm=box.querySelector('[data-rm]');if(rm)rm.onclick=()=>{set('');draw()}};
  draw()}
 photoSlot($('eCover'),()=>cover,v=>cover=v,'Add main photo');

 function drawExtra(){const box=$('eX');box.innerHTML=`<div class="chips">${extra.map(k=>pchip(k,1)).join('')}</div><div></div>`;
  box.querySelectorAll('.x').forEach(x=>x.onclick=()=>{extra=extra.filter(k=>k!==x.closest('.chip').dataset.k);drawExtra()});
  paintSearch(box.lastElementChild,()=>extra,k=>{if(extra.length<60)extra.push(k);drawExtra();box.querySelector('input[type=search]').focus()})}
 drawExtra();

 function drawSteps(){const S=$('eSteps');
  S.innerHTML=steps.map((s,i)=>`<div class="panel step" data-i="${i}"><div class="row" style="margin:0"><b>Step ${i+1}</b><span style="flex:1"></span>
   <button class="btn" type="button" data-mv="-1" ${i?'':'disabled'} title="Move up">↑</button><button class="btn" type="button" data-mv="1" ${i<steps.length-1?'':'disabled'} title="Move down">↓</button><button class="btn dan" type="button" data-del title="Remove step">✕</button></div>
   <label class="f"><span>Step name</span><input type="text" list="stepNames" maxlength="80" data-f="title" placeholder="e.g. Base coat"></label>
   <div class="f"><span>Paints and mix ratio</span><div class="mixed">${s.mix.map((m,j)=>{const p=BYKEY.get(m.k);return `<div class="mrow"><i style="background:${p?p.h:'#888'}"></i><span>${p?esc(p.n)+' <em>'+esc(GL[p.g])+'</em>':'Unknown paint'}</span><input type="number" min="1" max="20" value="${m.parts}" data-parts="${j}" title="Parts" aria-label="Parts"><span class="s">part${m.parts>1?'s':''}</span><span class="x" data-rmix="${j}" title="Remove">×</span></div>`}).join('')}</div>
    ${s.mix.length>1?`<p class="s" data-ratio>Ratio ${s.mix.map(m=>m.parts).join(':')}</p>`:''}<div data-ps></div></div>
   <label class="f"><span>Details</span><textarea maxlength="4000" data-f="text" style="min-height:70px" placeholder="e.g. Two thin coats, thinned with a drop of medium"></textarea></label>
   <div class="f"><span>Photo of this step</span><div data-ph></div></div></div>`).join('');
  S.querySelectorAll('.step').forEach(box=>{const i=+box.dataset.i,s=steps[i];
   box.querySelectorAll('[data-f]').forEach(inp=>{inp.value=s[inp.dataset.f];inp.oninput=()=>s[inp.dataset.f]=inp.value});
   box.querySelectorAll('[data-parts]').forEach(inp=>inp.oninput=()=>{s.mix[+inp.dataset.parts].parts=Math.min(20,Math.max(1,+inp.value||1));const rt=box.querySelector('[data-ratio]');if(rt)rt.textContent='Ratio '+s.mix.map(m=>m.parts).join(':')});
   box.querySelectorAll('[data-rmix]').forEach(x=>x.onclick=()=>{s.mix.splice(+x.dataset.rmix,1);drawSteps()});
   box.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const j=i+ +b.dataset.mv;[steps[i],steps[j]]=[steps[j],steps[i]];drawSteps()});
   box.querySelector('[data-del]').onclick=()=>{steps.splice(i,1);if(!steps.length)steps.push({title:'',text:'',image:'',mix:[]});drawSteps()};
   paintSearch(box.querySelector('[data-ps]'),()=>s.mix.map(m=>m.k),k=>{if(s.mix.length<8)s.mix.push({k,parts:1});drawSteps();S.querySelector(`.step[data-i="${i}"] [data-ps] input[type=search]`).focus()});
   photoSlot(box.querySelector('[data-ph]'),()=>s.image,v=>s.image=v,'Add photo')})}
 drawSteps();
 $('eAdd').onclick=()=>{steps.push({title:'',text:'',image:'',mix:[]});drawSteps();$('eSteps').lastElementChild.querySelector('[data-f=title]').focus()};

 $('eSave').onclick=async()=>{if(busy){$('eErr').textContent='Please wait for photos to finish uploading.';return}
  $('eSave').disabled=true;$('eErr').textContent='';
  const b={kind:$('eKind').value,title:$('eTitle').value,summary:$('eSum').value,body:$('eBody').value,link:$('eLink').value.trim(),cover,steps,paints:extra,visibility:el.querySelector('input[name=eVis]:checked').value};
  try{const d=await api(id?'/recipes/'+id:'/recipes',{method:id?'PUT':'POST',body:b});location.hash='#/recipe/'+d.recipe.id}
  catch(e){$('eErr').textContent=e.message;$('eSave').disabled=false}}}

loadMe().then(route);
})();

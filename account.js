// Accounts, "My paints" collection, recipes & tutorials, and comments.
// Talks to the Worker API at /api/*. If the API isn't reachable (offline, or a static-only deploy),
// these extra pages stay hidden and the colour wheel works exactly as before.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BYKEY=new Map(P.map(p=>[p.k,p]));
const VIEWS=['wheel','paints','recipes','recipe','edit','account'];
let ME=null,INFO=null,API=false;

async function api(path,{method='GET',body}={}){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(d.error||'Something went wrong ('+r.status+')');e.status=r.status;throw e}
 return d}
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const swatch=p=>p?`<i style="background:${p.h}" title="${esc(p.n)}"></i>`:'<i title="Unknown paint"></i>';
const pchip=(k,x)=>{const p=BYKEY.get(k);return p?`<span class="chip" data-k="${esc(k)}"><i style="background:${p.h}"></i>${star(p)}${esc(p.n)} <span style="color:var(--mut)">${esc(p.c)} · ${esc(GL[p.g])}</span>${x?' <span class="x" title="Remove">×</span>':''}</span>`:`<span class="chip" data-k="${esc(k)}"><i></i>Unknown paint${x?' <span class="x">×</span>':''}</span>`};
const signInLink=(why)=>`<p class="s">${why} <a href="#/account">Sign in</a> to continue.</p>`;
function showOnWheel(keys){const s=new Set(keys);P.forEach(p=>p.on=s.has(p.k));sync();location.hash='#/'}

/* ---------- session ---------- */
async function loadMe(){
 try{INFO=await api('/me');API=true;ME=INFO.user}catch(e){API=false;ME=null}
 if(ME){try{OWN=new Set((await api('/collection')).paints)}catch(e){OWN=new Set()}}else{OWN=null;ONLY_MINE=false;$('onlyMine').checked=false}
 document.querySelectorAll('#nav a[data-v]').forEach(a=>{if(a.dataset.v!=='wheel')a.hidden=!API});
 $('acct').innerHTML=ME?(ME.avatar?`<img src="${esc(ME.avatar)}" alt="">`:'')+esc(ME.name):'Sign in';
 $('mine').hidden=!ME;
 renderNeu();draw()}

/* ---------- router ---------- */
function route(){
 const h=location.hash.replace(/^#\/?/,''),[v,id,sub]=h.split(/[/?]/);
 let view=v||'wheel';
 if(view==='recipe'&&sub==='edit')view='edit';else if(view==='new')view='edit';
 if(!VIEWS.includes(view)||(!API&&view!=='wheel'))view='wheel';
 VIEWS.forEach(n=>$('v-'+n).hidden=n!==view);
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===view||(a.dataset.v==='recipes'&&(view==='recipe'||view==='edit'))));
 if(view==='paints')renderPaints();
 else if(view==='recipes')renderRecipes();
 else if(view==='recipe')renderRecipe(id);
 else if(view==='edit')renderEdit(v==='new'?null:id);
 else if(view==='account')renderAccount();
 if(view!=='wheel')scrollTo(0,0)}
addEventListener('hashchange',route);

/* ---------- account ---------- */
function renderAccount(){
 const el=$('v-account'),ret=encodeURIComponent('/#/');
 const err=/error=/.test(location.hash)?'<p class="err">Sign-in was cancelled or failed. Please try again.</p>':'';
 if(!ME){
  const btns=INFO.providers.map(p=>`<a class="btn" href="/api/auth/login/${p.id}?return=${ret}">Continue with ${esc(p.label)}</a>`).join(' ');
  el.innerHTML=`<h1>Sign in</h1>${err}<div class="panel"><p class="s">Sign in to save your paint collection, use it on the colour wheel, save recipes and tutorials, and join discussions. Your first sign-in creates your account.</p>
  <div class="row">${btns||'<span class="s">No sign-in methods are set up on this server yet.</span>'}</div>
  ${INFO.devLogin?`<div class="row"><input class="inp" id="devName" placeholder="Test user name" value="Test Painter" style="max-width:220px"><button class="btn" id="devGo" type="button">Dev sign-in</button><span class="s">Local testing only.</span></div>`:''}</div>`;
  if(INFO.devLogin)$('devGo').onclick=()=>location.href=`/api/auth/dev?name=${encodeURIComponent($('devName').value)}&return=${ret}`;
  return}
 const linked=new Set(INFO.logins),more=INFO.providers.filter(p=>!linked.has(p.id));
 el.innerHTML=`<h1>${ME.avatar?`<img class="av" src="${esc(ME.avatar)}" alt="">`:''}${esc(ME.name)}</h1>
 <div class="panel"><p>${ME.email?esc(ME.email):'<span class="s">No email on file</span>'}${ME.admin?' <span class="tag">admin</span>':''}</p>
 <p class="s">Signed in with: ${INFO.logins.map(esc).join(', ')}</p>
 ${more.length?`<div class="row"><span class="s">Link another sign-in:</span>${more.map(p=>`<a class="btn" href="/api/auth/login/${p.id}?return=${encodeURIComponent('/#/account')}">${esc(p.label)}</a>`).join(' ')}</div>`:''}
 <p class="s">${OWN.size} paints in your collection.</p>
 <div class="row"><button class="btn" id="out" type="button">Sign out</button><button class="btn dan" id="del" type="button">Delete my account</button></div>
 <div id="delc" hidden class="row"><span class="err">This deletes your collection, recipes and comments for good.</span><button class="btn dan" id="del2" type="button">Yes, delete everything</button></div></div>`;
 $('out').onclick=async()=>{await api('/auth/logout',{method:'POST'});await loadMe();location.hash='#/'};
 $('del').onclick=()=>$('delc').hidden=false;
 $('del2').onclick=async()=>{await api('/me',{method:'DELETE'});await loadMe();location.hash='#/'}}

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
 const el=$('v-recipes');
 el.innerHTML=`<h1>Recipes &amp; tutorials</h1><p class="s">Painting recipes and tutorials from the community. Keep yours private or share them publicly.</p>
 <div class="row"><button class="btn${rScope==='public'?' pri':''}" data-s="public" type="button">Public</button>${ME?`<button class="btn${rScope==='mine'?' pri':''}" data-s="mine" type="button">Mine</button>`:''}<span class="sp" style="flex:1"></span>${ME?'<a class="btn pri" href="#/new">+ New recipe</a>':'<a class="btn" href="#/account">Sign in to add yours</a>'}</div>
 <div class="bar"><input id="rq" type="search" placeholder="Search titles and summaries"></div><div id="rlist" class="cards"><p class="s">Loading…</p></div>`;
 el.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{rScope=b.dataset.s;renderRecipes()});
 let t=0;$('rq').oninput=()=>{clearTimeout(t);t=setTimeout(load,250)};
 async function load(){const L=$('rlist');
  try{const d=await api(`/recipes?scope=${rScope}&q=${encodeURIComponent($('rq').value)}`);
   L.innerHTML=d.recipes.length?d.recipes.map(r=>`<a class="card" href="#/recipe/${esc(r.id)}"><h3>${esc(r.title)}</h3><span class="tag">${r.kind==='tutorial'?'Tutorial':'Recipe'}</span>${r.visibility==='private'?'<span class="tag">Private</span>':''}<div class="sw">${r.paints.slice(0,16).map(k=>swatch(BYKEY.get(k))).join('')}</div><div class="s">${esc(r.summary)}</div><div class="n">${esc(r.author.name)} · ${fmtDate(r.updated_at)}${r.visibility==='public'?` · ${r.comments} comment${r.comments===1?'':'s'}`:''}</div></a>`).join('')
    :`<p class="s">${rScope==='mine'?'You have not saved any recipes yet.':'No public recipes yet. Be the first to share one.'}</p>`}
  catch(e){L.innerHTML=`<p class="err">${esc(e.message)}</p>`}}
 load()}

/* ---------- one recipe + comments ---------- */
async function renderRecipe(id){
 const el=$('v-recipe');el.innerHTML='<p class="s">Loading…</p>';
 let d;try{d=await api('/recipes/'+encodeURIComponent(id))}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p><a href="#/recipes">Back to recipes</a>`;return}
 const r=d.recipe,mine=ME&&ME.id===r.author.id,canMod=c=>ME&&(ME.id===c.author.id||mine||ME.admin);
 el.innerHTML=`<p><a href="#/recipes">← Recipes &amp; tutorials</a></p><h1>${esc(r.title)}</h1>
 <p class="s"><span class="tag">${r.kind==='tutorial'?'Tutorial':'Recipe'}</span><span class="tag">${r.visibility==='public'?'Public':'Private'}</span>by ${r.author.avatar?`<img class="av" src="${esc(r.author.avatar)}" alt="">`:''}${esc(r.author.name)} · updated ${fmtDate(r.updated_at)}</p>
 ${r.summary?`<p>${esc(r.summary)}</p>`:''}
 <div class="panel"><h2>Paints used</h2><div class="chips" id="rp">${r.paints.map(k=>pchip(k)).join('')||'<span class="s">No paints listed.</span>'}</div>
 ${r.paints.length?'<button class="btn" id="rWheel" type="button">Show these paints on the wheel</button>':''}</div>
 ${r.link?`<p>Video / article: <a href="${esc(r.link)}" target="_blank" rel="noopener nofollow ugc">${esc(r.link)}</a></p>`:''}
 ${r.body?`<div class="panel"><h2>Steps</h2><div class="steps">${esc(r.body)}</div></div>`:''}
 ${mine||ME?.admin?`<div class="row">${mine?`<a class="btn" href="#/recipe/${esc(r.id)}/edit">Edit</a>`:''}<button class="btn dan" id="rDel" type="button">Delete</button></div>`:''}
 ${r.visibility==='public'?`<div class="panel"><h2>Discussion</h2><div id="cms">${d.comments.map(c=>cmHTML(c,canMod(c))).join('')||'<p class="s" id="nocm">No comments yet.</p>'}</div>
  ${ME?`<label class="f"><span>Add a comment</span><textarea id="cBody" maxlength="2000" style="min-height:70px" class="inp"></textarea></label><div class="row"><button class="btn pri" id="cGo" type="button">Post comment</button><span class="err" id="cErr"></span></div>`:signInLink('Registered painters can join the discussion.')}</div>`
  :(mine?'<p class="s">This recipe is private, so only you can see it. Make it public to share it and open the discussion.</p>':'')}`;
 el.querySelectorAll('#rp .chip').forEach(c=>c.onclick=()=>{const p=BYKEY.get(c.dataset.k);if(p){showOnWheel([p.k]);setTimeout(()=>showP(p),0)}});
 if($('rWheel'))$('rWheel').onclick=()=>showOnWheel(r.paints);
 if($('rDel'))$('rDel').onclick=async()=>{if($('rDel').dataset.c){await api('/recipes/'+r.id,{method:'DELETE'});location.hash='#/recipes'}else{$('rDel').dataset.c=1;$('rDel').textContent='Click again to delete for good'}};
 const wireDel=()=>el.querySelectorAll('[data-dc]').forEach(b=>b.onclick=async()=>{await api('/comments/'+b.dataset.dc,{method:'DELETE'});b.closest('.cm').remove()});
 wireDel();
 if($('cGo'))$('cGo').onclick=async()=>{const t=$('cBody').value.trim();if(!t)return;$('cGo').disabled=true;$('cErr').textContent='';
  try{const c=(await api(`/recipes/${r.id}/comments`,{method:'POST',body:{body:t}})).comment;$('nocm')?.remove();$('cms').insertAdjacentHTML('beforeend',cmHTML(c,true));$('cBody').value='';wireDel()}
  catch(e){$('cErr').textContent=e.message}$('cGo').disabled=false}}
const cmHTML=(c,del)=>`<div class="cm"><div class="who">${c.author.avatar?`<img class="av" src="${esc(c.author.avatar)}" alt="">`:''}<b>${esc(c.author.name)}</b> · ${fmtDate(c.created_at)}${del?` <button class="lnk" data-dc="${esc(c.id)}" type="button">delete</button>`:''}</div><p>${esc(c.body)}</p></div>`;

/* ---------- create / edit ---------- */
async function renderEdit(id){
 const el=$('v-edit');
 if(!ME){el.innerHTML='<h1>New recipe</h1>'+signInLink('Recipes are saved to your account.');return}
 let r={kind:'recipe',title:'',summary:'',body:'',link:'',paints:[],visibility:'private'};
 if(id){try{r=(await api('/recipes/'+encodeURIComponent(id))).recipe}catch(e){el.innerHTML=`<p class="err">${esc(e.message)}</p>`;return}}
 let paints=[...r.paints];
 el.innerHTML=`<p><a href="${id?'#/recipe/'+esc(id):'#/recipes'}">← Back</a></p><h1>${id?'Edit':'New'} ${r.kind==='tutorial'?'tutorial':'recipe'}</h1><div class="panel">
 <label class="f"><span>Type</span><select id="eKind"><option value="recipe">Paint recipe</option><option value="tutorial">Tutorial</option></select></label>
 <label class="f"><span>Title</span><input type="text" id="eTitle" maxlength="120" placeholder="e.g. Grimy NMM gold in four layers"></label>
 <label class="f"><span>Short summary</span><input type="text" id="eSum" maxlength="300" placeholder="What this recipe is for"></label>
 <div class="f"><span>Paints used</span><div class="chips" id="eP"></div><input class="inp" id="eQ" type="search" placeholder="Search paints to add (name or code)"><div class="res" id="eRes" hidden></div>
  ${OWN.size?'<label><input type="checkbox" id="eMine"> Search my paints only</label>':''}</div>
 <label class="f"><span>Steps (one per line works well)</span><textarea id="eBody" maxlength="20000" placeholder="1. Prime black\n2. Basecoat Retributor Armour\n3. Wash Reikland Fleshshade"></textarea></label>
 <label class="f"><span>Video or article link (optional)</span><input type="url" id="eLink" maxlength="500" placeholder="https://"></label>
 <div class="f"><span>Who can see it</span><label><input type="radio" name="eVis" value="private"> Private, only me</label><br><label><input type="radio" name="eVis" value="public"> Public, anyone can view and registered users can comment</label></div>
 <div class="row"><button class="btn pri" id="eSave" type="button">Save</button><a class="btn" href="${id?'#/recipe/'+esc(id):'#/recipes'}">Cancel</a><span class="err" id="eErr"></span></div></div>`;
 $('eKind').value=r.kind;$('eTitle').value=r.title;$('eSum').value=r.summary;$('eBody').value=r.body;$('eLink').value=r.link;
 el.querySelector(`input[name=eVis][value=${r.visibility}]`).checked=true;
 const drawP=()=>{$('eP').innerHTML=paints.map(k=>pchip(k,1)).join('')||'<span class="s">None yet.</span>';$('eP').querySelectorAll('.x').forEach(x=>x.onclick=()=>{paints=paints.filter(k=>k!==x.closest('.chip').dataset.k);drawP()})};
 const search=()=>{const q=$('eQ').value.trim().toLowerCase(),R=$('eRes');if(!q){R.hidden=true;return}
  const mineOnly=$('eMine')?.checked,hits=P.filter(p=>(p.n+' '+p.c).toLowerCase().includes(q)&&!paints.includes(p.k)&&(!mineOnly||OWN.has(p.k))).slice(0,30);
  R.hidden=false;R.innerHTML=hits.map(p=>`<div class="pi" data-k="${esc(p.k)}"><i style="background:${p.h}"></i>${star(p)}<span>${esc(p.n)} <em>${esc(p.c)} · ${esc(GL[p.g])}</em></span></div>`).join('')||'<div class="s" style="padding:6px">No matches.</div>';
  R.querySelectorAll('[data-k]').forEach(d=>d.onclick=()=>{if(paints.length<60)paints.push(d.dataset.k);drawP();$('eQ').value='';R.hidden=true;$('eQ').focus()})};
 $('eQ').oninput=search;if($('eMine'))$('eMine').onchange=search;
 drawP();
 $('eSave').onclick=async()=>{$('eSave').disabled=true;$('eErr').textContent='';
  const b={kind:$('eKind').value,title:$('eTitle').value,summary:$('eSum').value,body:$('eBody').value,link:$('eLink').value.trim(),paints,visibility:el.querySelector('input[name=eVis]:checked').value};
  try{const d=await api(id?'/recipes/'+id:'/recipes',{method:id?'PUT':'POST',body:b});location.hash='#/recipe/'+d.recipe.id}
  catch(e){$('eErr').textContent=e.message;$('eSave').disabled=false}}}

loadMe().then(route);
})();

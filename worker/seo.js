// Search-friendly paint pages: /paints (brands), /paints/<brand> (every paint in a brand, with a short guide to the brand),
// /paints/<brand>/<paint> (one paint and its closest matches in every other brand), /guides (conversion charts and
// technique guides built from the same data) and /sitemap.xml. Everyone, search engines included, gets the same page.
// They are rendered from the same data.js and app.js the colour wheel uses, read from the static assets,
// so new paints get a page as soon as they're added to data.js. Nothing here needs a build step.

import { TECH_TEXT } from './tech-guides.js';

const SITE = 'https://paintersdesk.com';
const BRAND_SLUG = { 'Citadel / Warhammer': 'citadel' };

let DATA = null;
// The site themes (Neon 1984, Grimdark, Forest, Dwarven) come from index.html, so these pages follow the look a visitor
// picked on the colour wheel. The look is applied in the browser from localStorage, so every visitor and search engine
// gets the same HTML.
let THEME = { js: '', css: '' };

export function isSeoPath(p) {
  return p === '/sitemap.xml' || p === '/paints' || p.startsWith('/paints/') || p === '/guides' || p.startsWith('/guides/');
}

export async function seo(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const D = await load(env, url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  let r;
  if (p === '/sitemap.xml') r = send(sitemap(D), 'application/xml; charset=utf-8');
  else if (p === '/paints') r = send(indexPage(D));
  else if (p === '/paints/find') {
    // The colour wheel links a selected paint here by its key (range|code|name); send it on to that paint's page.
    const [g, c, ...n] = (url.searchParams.get('k') || '').split('|');
    const paint = D.P.find(x => x.g === g && x.c === c && x.n === n.join('|'));
    return Response.redirect(url.origin + (paint && paint.url ? paint.url : '/paints'), 302);
  }
  else if (p === '/guides') r = send(guidesPage(D));
  else if (p.startsWith('/guides/')) {
    const g = GUIDES.find(x => '/guides/' + x.slug === p);
    r = g ? send(guideHTML(D, g)) : send(notFound(), 'text/html; charset=utf-8', 404);
  } else {
    const [, b, s, extra] = p.split('/').slice(1);
    const br = D.brands.find(x => x.slug === b);
    const paint = br && s && br.bySlug.get(s);
    if (br && !s) r = send(brandPage(D, br));
    else if (paint && !extra) r = send(paintPage(D, paint, await usedIn(env, paint)));
    else r = send(notFound(), 'text/html; charset=utf-8', 404);
  }
  // Paths with a trailing slash get one address, so search engines don't index both.
  if (r.status === 200 && url.pathname !== p && p !== '/') return Response.redirect(url.origin + p, 301);
  return request.method === 'HEAD' ? new Response(null, r) : r;
}

function send(body, type = 'text/html; charset=utf-8', status = 200) {
  return new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'public, max-age=0, must-revalidate' } });
}

/* ---------- data (parsed once per Worker instance) ---------- */

async function load(env, url) {
  if (DATA) return DATA;
  const get = f => env.ASSETS.fetch(new Request(new URL(f, url.origin))).then(r => r.text());
  const [data, app, index] = await Promise.all([get('/data.js'), get('/app.js'), get('/')]);
  DATA = parse(data, app);
  THEME = theme(index);
  return DATA;
}

// The inline script that sets <html data-look> and the theme CSS block, with relative url()s made absolute.
// Exported for tools/check_seo.mjs.
export function theme(index) {
  try {
    const js = index.match(/<script>var l='cyber'[\s\S]*?<\/script>/)[0];
    const a = index.indexOf('/* Site themes'), b = index.indexOf('</style>', a);
    if (a < 0 || b < 0) throw new Error('theme CSS not found');
    const css = index.slice(a, b).replace(/url\((?!["']?(?:data:|https?:|\/))(["']?)/g, 'url($1/');
    return { js, css };
  } catch (e) {
    console.error(e);
    return { js: '', css: '' };
  }
}

// Exported for tools/check_seo.mjs.
export function parse(data, app) {
  const raw = data.slice(data.indexOf('const RAW=`') + 11, data.indexOf('`;'));
  const mtLine = data.slice(data.indexOf('const MT=') + 9);
  const MT = JSON.parse(mtLine.slice(0, mtLine.indexOf(';\n') < 0 ? mtLine.lastIndexOf(';') : mtLine.indexOf(';\n')));
  // Range labels and brands come from app.js, so the pages always use the wheel's names.
  const glSrc = app.match(/const GL=\{(.*?)\};/)[1], GL = {};
  for (const m of glSrc.matchAll(/(?:'([^']*)'|"([^"]*)"|(\w+))\s*:\s*(?:'([^']*)'|"([^"]*)")/g)) GL[m[1] ?? m[2] ?? m[3]] = m[4] ?? m[5];
  const brSrc = app.match(/const BRANDS=(\[.*?\]\]\]);/)[1];
  const brands = [...brSrc.matchAll(/\['([^']+)',\[([^\]]*)\]\]/g)].map(m => ({
    name: m[1], groups: [...m[2].matchAll(/'([^']*)'/g)].map(x => x[1]), paints: [], bySlug: new Map(),
  }));
  const msrc = {};
  const ms = app.match(/const MSRC=\{(.*?)\};/);
  if (ms) for (const m of ms[1].matchAll(/(\w+):'([^']*)'/g)) msrc[m[1]] = m[2];
  const type = typeOf(app);
  const sgFix = [...(app.match(/const SG_FIX=(\[[\s\S]*?\]\]);/) || ['', ''])[1].matchAll(/\['(\w+)','([^']+)','(#[0-9a-f]{6})'\]/g)].map(m => ({ q: m[1], n: m[2], h: m[3], lab: hexLab(m[3]) }));
  const nmmRx = new RegExp(app.match(/const NMM_RX=\/(.*?)\/i;/)[1], 'i');
  // Technique names as the Ramps mode's Technique picker shows them.
  const tqFull = Object.fromEntries([...app.matchAll(/\n(\w+):\{name:'[^']*',full:'([^']*)'/g)].map(m => [m[1], m[2]]));
  const brOf = {};
  brands.forEach((b, bi) => { b.slug = BRAND_SLUG[b.name] || slug(b.name); b.groups.forEach(g => brOf[g] = bi) });

  const P = [];
  let g = 'M';
  raw.split('\n').forEach(l => {
    if (!l) return;
    if (l[0] === '#') { g = l[1]; return }
    const [n, c, h] = l.split('|');
    const p = { n, c, h, g, i: P.length, lab: hexLab(h), b: brOf[g] };
    p.t = type(p);
    p.ramp = p.t === 'op' && !nmmRx.test(p.n) && !nmmRx.test(p.c);
    P.push(p);
  });
  // Paint slugs: the name, or name + code (then range) when a brand has two paints with the same name.
  // data.js only ever grows at the end, so the first paint with a name keeps the plain address.
  P.forEach(p => {
    if (p.g === 'B' || p.b === undefined) return;
    const br = brands[p.b];
    const tries = [slug(p.n), slug(p.n + ' ' + p.c), slug(p.n + ' ' + GL[p.g]), slug(p.n + ' ' + GL[p.g] + ' ' + p.c)];
    let s = tries.find(t => t && !br.bySlug.has(t));
    for (let k = 2; !s; k++) if (!br.bySlug.has(tries[0] + '-' + k)) s = tries[0] + '-' + k;
    p.slug = s;
    p.url = `/paints/${br.slug}/${s}`;
    br.bySlug.set(s, p);
    br.paints.push(p);
  });
  return { P, MT, GL, brands, msrc, sgFix, tqFull };
}

// Paint types, the same rules as paintType() in app.js (metallic, pearl, contrast, wash, ink, fx, tech, else 'op' for
// opaque paints). The range and name lists are read from app.js so the two never drift apart.
function typeOf(app) {
  const list = re => [...(app.match(re) || ['', ''])[1].matchAll(/'([^']*)'/g)].map(m => m[1]);
  const metG = new Set(list(/const MET_G=new Set\((\[.*?\])\)/)), metK = new Set(list(/const MET_K=new Set\((\[.*?\])\)/));
  const metRx = new RegExp(app.match(/MET_RX=\/(.*?)\/i;/)[1], 'i');
  const ptG = {};
  for (const m of app.match(/const PT_G=\{(.*?)\};/)[1].matchAll(/(?:'([^']*)'|(\w+))\s*:\s*'([^']*)'/g)) ptG[m[1] ?? m[2]] = m[3];
  const isMet = p => metG.has(p.g) || metK.has(p.g + '|' + p.n) || /anodized|^candy /i.test(p.n) || /\bmet(al|allic)?\b/i.test(p.n + ' ' + p.c) ||
    /gunmetal/i.test(p.n) || p.c === '70.877' || metRx.test(p.n) && !/yellow|green|brown|grey|oxide|drab|blue|wolf/i.test(p.n) && p.g !== '8';
  const isPearl = p => /\bpearl\b|iridescent/i.test(p.n) && !/skin/i.test(p.n);
  return p => isPearl(p) ? 'pearl' : isMet(p) ? 'met' : ptG[p.g] || (/speedpaint|contrast/i.test(p.c) ? 'con' : /\bwash$/i.test(p.c) || /\bwash\b|\bshade$/i.test(p.n) || p.g === 'A' && / tone$/i.test(p.n) ? 'wash' :
    /\bink$/i.test(p.n) || / ink$/i.test(p.c) ? 'ink' : /fluo|^neon|effects$/i.test(p.n + '|' + p.c) ? 'fx' :
    /^matt .*primer$|varnish$|^(shading|blending|chipping) medium$/i.test(p.n) ? 'tech' : 'op');
}

const slug = t => String(t).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function hexLab(h) {
  const f = v => { v = parseInt(v, 16) / 255; return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92 };
  const r = f(h.slice(1, 3)), g = f(h.slice(3, 5)), b = f(h.slice(5, 7));
  const x = (.4124 * r + .3576 * g + .1805 * b) / .95047, y = .2126 * r + .7152 * g + .0722 * b, z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
  const t = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * t(y) - 16, 500 * (t(x) - t(y)), 200 * (t(y) - t(z))];
}
const dE = (a, b) => Math.hypot(a.lab[0] - b.lab[0], a.lab[1] - b.lab[1], a.lab[2] - b.lab[2]);

// Same rule as matchData() in app.js: per other brand, the chart-listed equivalents (closest first), then the 2-3 nearest swatches.
export function matches(D, p) {
  const doc = (D.MT[p.i] || []).map(([j, s]) => ({ p: D.P[j], s, d: dE(p, D.P[j]) })).filter(m => m.p.slug);
  return D.brands.map((br, bi) => {
    if (bi === p.b) return null;
    const ch = doc.filter(m => m.p.b === bi).sort((a, b) => a.d - b.d);
    const have = new Set(ch.map(m => m.p));
    const near = br.paints.filter(q => !have.has(q)).map(q => ({ p: q, d: dE(p, q) })).sort((a, b) => a.d - b.d).slice(0, ch.length ? 2 : 3);
    return { br, ch, near };
  }).filter(Boolean);
}

/* ---------- pages ---------- */

const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paintUrl = p => p.url;
const label = p => p.n + (p.c ? ' (' + p.c + ')' : '');
const closeness = d => d < 6 ? 'very close' : d < 10 ? 'close' : d < 15 ? 'fair' : 'loose';

const OG_IMAGE = SITE + '/icons/og-image.png';
const SITE_LD = { '@type': 'WebSite', '@id': SITE + '/#site', name: 'The Painters Desk', url: SITE + '/', publisher: { '@id': SITE + '/#org' } };
const ORG = { '@type': 'Organization', '@id': SITE + '/#org', name: 'AK Tabletop Studio', url: SITE + '/', logo: SITE + '/icons/icon-512.png' };

// ld: extra schema.org objects for this page (the breadcrumb trail is always added). og: 'website' or 'article'.
function page({ title, desc, path, crumbs, body, ld = [], og = 'website' }) {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList', '@id': SITE + path + '#crumbs',
      itemListElement: crumbs.map(([n, u], k) => ({ '@type': 'ListItem', position: k + 1, name: n, item: SITE + u })),
    }, SITE_LD, ORG, ...ld],
  };
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="${og}"><meta property="og:site_name" content="The Painters Desk">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Painters Desk: a colour wheel of miniature paints">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${OG_IMAGE}">
<link rel="icon" type="image/png" href="/icons/favicon-32.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#fff4de">
${THEME.js}
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
<style>
@font-face{font-family:'Archivo Black';src:url(/fonts/archivo-black.woff2) format('woff2');font-display:swap}
@font-face{font-family:Rubik;src:url(/fonts/rubik-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:Rubik;src:url(/fonts/rubik-700.woff2) format('woff2');font-weight:700;font-display:swap}
:root{--bg:#fff4de;--fg:#1b1b1b;--mut:#5c5444;--card:#fff;--ink:#1b1b1b;--line:#1b1b1b;--soft:#fff9ee;--yel:#ffd23f;--red:#f2545b;--org:#ff9f1c;--tea:#2ec4b6;--blu:#3a86ff;--pur:#8338ec;--sh:var(--ink);--hf:'Archivo Black',sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-look]){--bg:#1d1a15;--fg:#f6eedd;--mut:#c2b69e;--card:#2b2720;--ink:#e9dcc0;--line:#e9dcc0;--soft:#24211b}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 Rubik,system-ui,-apple-system,Segoe UI,sans-serif;padding:0 16px 24px}
body::before{content:"";display:block;height:12px;margin:0 -16px 14px;background:linear-gradient(90deg,var(--red) 0 16.66%,var(--org) 0 33.33%,var(--yel) 0 50%,var(--tea) 0 66.66%,var(--blu) 0 83.33%,var(--pur) 0)}
.wrap{max-width:960px;margin:auto}
a{color:inherit}
header{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}
header .logo{font:400 18px var(--hf);text-decoration:none;display:flex;align-items:center;gap:8px}
header .logo img{width:32px;height:32px}
.btn{display:inline-block;font:700 15px Rubik,sans-serif;background:var(--yel);color:#1b1b1b;border:3px solid var(--ink);border-radius:12px;padding:8px 14px;box-shadow:3px 3px 0 var(--sh);text-decoration:none}
nav.crumbs{font-size:14px;color:var(--mut);margin:14px 0 0}
h1{font:400 clamp(28px,5vw,44px)/1.1 var(--hf);margin:10px 0}
h2{font:400 22px/1.2 var(--hf);margin:0 0 8px}
p.s{color:var(--mut);font-size:14px;margin:0 0 12px}
.panel{background:var(--card);border:3px solid var(--ink);border-radius:18px;padding:16px;margin:16px 0;box-shadow:5px 5px 0 var(--sh)}
.hero{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.big{width:96px;height:96px;border-radius:50%;border:3px solid var(--ink);flex:none}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0}dt{color:var(--mut)}dd{margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.br h3{margin:0 0 6px;font-size:17px}
ul.m{list-style:none;margin:0;padding:0}
ul.m li{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
i.sw{width:22px;height:22px;border-radius:50%;border:2px solid var(--ink);flex:none;margin-top:1px}
.m em{display:block;font-style:normal;font-size:13px;color:var(--mut)}
.ck{color:#2a9d5c;font-weight:700}
ul.u li{display:block;padding:6px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}ul.u li:first-child{border-top:0}
ul.list{columns:3 220px;padding-left:18px}ul.list li{break-inside:avoid}ul.m.list{padding-left:0}ul.m.list li{display:block}
ul.gl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 20px}ul.gl li{display:block;padding:6px 0}ul.gl b{font-size:17px}ul.gl .chip{height:12px;margin:6px 0 4px;max-width:240px}.prose h3,.panel h3{font-size:17px;margin:4px 0 6px}
footer{font-size:12px;color:var(--mut);margin-top:24px}
nav.top{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
nav.top a:not(.btn){color:#1b1b1b;text-decoration:none;padding:8px 14px;border-radius:14px;font-size:15px;font-weight:700;background:#fff;border:3px solid var(--ink)}
nav.top a:not(.btn):hover{background:var(--yel)}
.prose p,p.prose{margin:0 0 12px;max-width:720px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:12px 0}
.stats div{border:2px solid var(--ink);border-radius:12px;padding:8px 10px}.stats b{display:block;font:400 22px var(--hf)}
.tw{overflow-x:auto}
table.cv{border-collapse:collapse;width:100%;font-size:15px}
table.cv th{text-align:left;font-size:13px;color:var(--mut);padding:4px 6px}
table.cv td{padding:5px 6px;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);vertical-align:top}
table.cv td .sw{display:inline-block;vertical-align:-5px;margin-right:6px}
table.cv em{display:block;font-style:normal;font-size:12px;color:var(--mut)}
ol.ramp{list-style:none;margin:0;padding:0}
ol.ramp li{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
ol.ramp em{display:block;font-style:normal;font-size:13px;color:var(--mut)}
.chip{display:flex;height:18px;border:2px solid var(--ink);border-radius:9px;overflow:hidden;margin:4px 0 10px}.chip i{flex:1}
.schs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;margin:12px 0}
.sch h3{margin:0 0 6px;font-size:17px}.sch svg{display:block;margin:0 auto 6px;color:var(--ink);max-width:100%;height:auto}.sch p{margin:0 0 8px;font-size:15px}
svg.wheel{width:100%;max-width:340px;height:auto;color:var(--ink);flex:none}
.prose h3{font-size:17px;margin:4px 0 6px}.prose ul,.prose ol{margin:0 0 12px;padding-left:22px;max-width:720px}.prose li{margin:0 0 6px}
figure{margin:0;flex:0 1 320px;text-align:center}svg.pic{width:100%;max-width:320px;height:auto;color:var(--ink);display:block;margin:0 auto 6px}svg.chart{width:100%;max-width:520px;height:auto;color:var(--fg);flex:none}
ol.steps li{padding:8px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}ol.steps li:first-child{border-top:0}ol.steps em{font-size:15px;color:var(--fg);margin-top:2px}ol.steps .sw{width:30px;height:30px}.chip.tall{height:32px;border-radius:12px;max-width:520px}
${THEME.css}</style></head>
<body><div class="wrap">
<header><a class="logo" href="/"><img src="/icons/icon-192.png" alt="" width="32" height="32" id="pdi">The Painters Desk</a><nav class="top"><a href="/paints">Paints</a><a href="/guides">Guides</a><a class="btn on" href="/">Open the colour wheel</a></nav></header>
<nav class="crumbs">${crumbs.map(([n, u], k) => k === crumbs.length - 1 ? esc(n) : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>
${body}
<footer><p>© 2026 AK Tabletop Studio. Swatch colours are estimates and will differ from the real paints; cross-brand matches are close, never exact.
Chart-listed matches come from the Two Thin Coats Paint Comparison Chart 2024, the Army Painter Warpaints Fanatic conversion chart, the AK 3rd Generation Acrylics equivalence table (2021) and the Herrick Games hobby paint comparison chart; the rest are a nearest-colour calculation.
The Painters Desk is unofficial and not affiliated with or endorsed by any paint brand. Paint names are trademarks of their owners.
<a href="/paints">All brands</a> · <a href="/guides">Guides</a> · <a href="/privacy">Privacy policy</a> · <a href="/terms">Site rules</a></p></footer>
</div>
<script>(function(){var l=document.documentElement.dataset.look;if(l)document.getElementById('pdi').src='/icons/themes/'+l+'.svg'})()</script>
</body></html>`;
}

// Public tutorials, recipes and palettes that use a paint (same match as /api/recipes?paint=), tutorials first, most upvoted first.
async function usedIn(env, p) {
  try {
    const key = JSON.stringify(p.g + '|' + p.c + '|' + p.n).replace(/[\\%_]/g, c => '\\' + c);
    return (await env.DB.prepare(
      `SELECT r.id, r.kind, r.title, r.summary, u.name AS author,
         (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS votes
       FROM recipes r JOIN users u ON u.id = r.user_id
       WHERE r.visibility = 'public' AND u.blocked = 0 AND r.paints LIKE ? ESCAPE '\\'
       ORDER BY r.kind = 'tutorial' DESC, votes DESC, r.updated_at DESC LIMIT 12`
    ).bind(`%${key}%`).all()).results;
  } catch (e) {
    console.error(e);
    return null;
  }
}

const webPage = (path, name, description, type = 'WebPage', extra = {}) => ({
  '@type': type, '@id': SITE + path, url: SITE + path, name, description,
  isPartOf: { '@id': SITE + '/#site' }, breadcrumb: { '@id': SITE + path + '#crumbs' }, ...extra,
});

const KIND_LABEL = { tutorial: 'Tutorial', recipe: 'Recipe', palette: 'Palette' };

function usedInHTML(p, rs) {
  if (!rs) return '';
  const li = r => `<li><a href="/#/recipe/${encodeURIComponent(r.id)}">${esc(r.title)}</a><em>${KIND_LABEL[r.kind] || 'Recipe'} by ${esc(r.author || 'a painter')}${r.votes ? ' · ' + r.votes + ' upvote' + (r.votes === 1 ? '' : 's') : ''}${r.summary ? ' · ' + esc(r.summary.length > 120 ? r.summary.slice(0, 117) + '…' : r.summary) : ''}</em></li>`;
  return `<section class="panel"><h2>Tutorials using ${esc(p.n)}</h2>` + (rs.length
    ? `<p class="s">Step-by-step tutorials, recipes and palettes shared by painters on The Painters Desk that use this paint.</p><ul class="m u">${rs.map(li).join('')}</ul>`
    : `<p class="s">No shared tutorials use ${esc(p.n)} yet. <a href="/#/new">Make the first one</a>.</p>`) + '</section>';
}

function paintPage(D, p, rs) {
  const br = D.brands[p.b], range = D.GL[p.g] || '', md = matches(D, p);
  const best = md.map(o => ({ br: o.br, m: [...o.ch, ...o.near].sort((a, b) => a.d - b.d)[0] })).filter(o => o.m);
  const brandName = br.name.replace(' / Warhammer', '');
  const title = `${p.n} equivalents & closest matches (${brandName})`;
  const desc = `Closest matches to ${brandName} ${p.n}${p.c ? ' (' + p.c + ')' : ''}: ` +
    best.slice(0, 4).map(o => `${o.br.name.replace(' / Warhammer', '')} ${o.m.p.n}`).join(', ') +
    `, and more. Swatch colours are estimates.`;
  const item = (m, k) => `<li><i class="sw" style="background:${m.p.h}"></i><span>${k ? `<span class="ck" title="${esc(D.msrc[m.s] || 'Conversion chart')}">✓</span> ` : '≈ '}<a href="${paintUrl(m.p)}">${esc(label(m.p))}</a><em>${esc(D.GL[m.p.g])} · ΔE ${m.d.toFixed(0)}, ${closeness(m.d)}${k ? ' · listed in ' + esc(D.msrc[m.s] || 'a conversion chart') : ''}</em></span></li>`;
  const body = `<h1>${esc(p.n)} equivalents</h1>
<div class="panel hero"><div class="big" style="background:${p.h}" role="img" aria-label="Estimated swatch colour ${p.h}"></div>
<dl><dt>Brand</dt><dd><a href="/paints/${br.slug}">${esc(br.name)}</a></dd><dt>Range</dt><dd>${esc(range)}</dd>${p.c ? `<dt>Code</dt><dd>${esc(p.c)}</dd>` : ''}<dt>Swatch</dt><dd>${p.h} (estimate)</dd></dl></div>
<p>Looking for a substitute for ${esc(brandName)} ${esc(p.n)}? These are the closest paints in each other brand on The Painters Desk.
<span class="ck">✓</span> means a manufacturer or community conversion chart lists it as an equivalent; ≈ means it is the nearest swatch colour.
ΔE is the colour difference between the two swatches: under about 6 is a close match, over about 15 is a loose one. Swatches are estimates, so check the real paints before you commit.</p>
<p><a class="btn" href="/#/?paint=${encodeURIComponent(p.g + '|' + p.c + '|' + p.n)}">See ${esc(p.n)} on the colour wheel</a></p>
<div class="grid">${md.map(o => `<section class="panel br"><h2>${esc(o.br.name)}</h2><ul class="m">${o.ch.map(m => item(m, 1)).join('')}${o.near.map(m => item(m, 0)).join('')}</ul></section>`).join('')}</div>
${usedInHTML(p, rs)}`;
  return page({
    title, desc, path: paintUrl(p), body,
    crumbs: [['Paints', '/paints'], [br.name, '/paints/' + br.slug], [p.n, paintUrl(p)]],
    ld: [webPage(paintUrl(p), title, desc, 'WebPage', { about: { '@type': 'Thing', name: `${brandName} ${p.n}`, description: `${range} paint${p.c ? ', code ' + p.c : ''}` } })],
  });
}

/* ---------- brand guides ---------- */

// A few lines about each brand. Plain, well-known facts only: anything about how the paints compare comes from the data below.
const BRAND_INFO = {
  'army-painter': 'The Army Painter is a Danish hobby company. Its Warpaints Fanatic range is a large set of dropper-bottle acrylics built around colour triads, and Speedpaint is its one-coat range, painted over a light primer.',
  citadel: 'Citadel is Games Workshop\'s paint range, made for Warhammer. Paints are sorted by job: Base paints cover in one coat, Layers build up highlights, Shades sink into recesses, Contrast paints shade and colour in a single coat, and Technical paints add textures and effects.',
  'pro-acryl': 'Pro Acryl is made by Monument Hobbies in the United States. It is a highly pigmented, matt acrylic in dropper bottles, with a Signature range of colours chosen by well-known painters and an Expert Acrylics line.',
  vallejo: 'Acrylicos Vallejo is a Spanish paint maker. Game Color is its range for fantasy and sci-fi miniatures, Model Color has the muted and historical colours, Model Air is thinned for airbrushes and Xpress Color is its one-coat range.',
  'ak-interactive': 'AK Interactive is a Spanish hobby company best known in scale modelling. Its 3rd Generation acrylics come in Standard, Intense, Pastel, Metallic and Ink types, plus AFV, Figure and Air series. Quick Gen is its quick-shade range.',
  'two-thin-coats': 'Two Thin Coats is the paint range from Duncan Rhodes Painting Academy. Most colours come as triads of a shadow, a midtone and a highlight, so a full three-step ramp is ready to use.',
  'turbo-dork': 'Turbo Dork is an American brand that only makes metallic and colour-shift paints. TurboShift and ZeniShift paints change colour with the viewing angle and look best over the recommended basecoat.',
  tamiya: 'Tamiya is a Japanese model kit maker. Its XF (flat) and X (gloss) acrylics and its spray cans are made for scale models, but are popular for vehicles, terrain and airbrushing miniatures too.',
  scale75: 'Scale75 is a Spanish miniatures and paint company. Scalecolor is a very matt acrylic range, Fantasy & Games has brighter colours, Instant Colors is the one-coat range and Metal n\' Alchemy is its metallics.',
  'green-stuff-world': 'Green Stuff World is a Spanish hobby supplier. Alongside its standard acrylics it makes fluorescent, colour-shift, dipping and acrylic ink paints.',
};
const TYPE_NAME = { op: 'opaque base and layer paints', met: 'metallics', pearl: 'pearls', con: 'one-coat contrast-style paints', wash: 'washes and shades', ink: 'inks, glazes and transparents', fx: 'fluorescents and effects', tech: 'technical paints, primers and mediums' };
const short = br => br.name.replace(' / Warhammer', '');
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 };
const pct = (k, n) => n ? Math.round(100 * k / n) + '%' : '0%';
const hueOf = p => (Math.atan2(p.lab[2], p.lab[1]) * 180 / Math.PI + 360) % 360;
const chromaOf = p => Math.hypot(p.lab[1], p.lab[2]);

// Conversion-chart links in both directions (the charts list each pair once).
function links(D) {
  if (D.links) return D.links;
  const L = new Map(), add = (i, j, s) => { if (!L.has(i)) L.set(i, []); if (!L.get(i).some(x => x[0] === j)) L.get(i).push([j, s]) };
  Object.entries(D.MT).forEach(([i, ms]) => ms.forEach(([j, s]) => { add(+i, j, s); add(j, +i, s) }));
  return D.links = L;
}

// Matches for p in brand bi: the closest chart-listed equivalent (if any), and the nearest other paint of the same type
// (shade for shade, metallic for metallic) when the brand has that type, else the nearest of any type.
function bestIn(D, p, bi) {
  const doc = (links(D).get(p.i) || []).map(([j, s]) => ({ p: D.P[j], s, d: dE(p, D.P[j]) })).filter(m => m.p.slug && m.p.b === bi).sort((a, b) => a.d - b.d);
  const all = D.brands[bi].paints, same = all.filter(q => q.t === p.t), have = new Set(doc.map(m => m.p));
  const near = (same.length ? same : all).filter(q => !have.has(q)).map(q => ({ p: q, d: dE(p, q) })).sort((a, b) => a.d - b.d);
  return { doc: doc[0], near: near[0], best: [doc[0], near[0]].filter(Boolean).sort((a, b) => a.d - b.d)[0] };
}

function compareHTML(D, br, other) {
  const bi = D.brands.indexOf(br), oi = D.brands.indexOf(other), L = links(D);
  const ops = br.paints.filter(p => p.t === 'op'), theirs = other.paints.filter(p => p.t === 'op');
  if (!ops.length || !theirs.length) return '';
  const nearest = ops.map(p => { let m = null, md = 1e9; theirs.forEach(q => { const d = dE(p, q); if (d < md) { md = d; m = q } }); return { p, q: m, d: md } });
  const close = nearest.filter(x => x.d < 6).length, fair = nearest.filter(x => x.d < 10).length;
  const charted = br.paints.filter(p => (L.get(p.i) || []).some(([j]) => D.P[j].b === oi)).length;
  // Examples: the closest pair in each of six hue slices, so the list isn't all greys.
  const ex = [];
  for (let k = 0; k < 6; k++) {
    const c = nearest.filter(x => chromaOf(x.p) > 18 && Math.floor(((hueOf(x.p) + 15) % 360) / 60) === k).sort((a, b) => a.d - b.d)[0];
    if (c) ex.push(c);
  }
  const conv = GUIDES.find(g => g.conv && g.conv[0] === br.slug && g.conv[1] === other.slug) || GUIDES.find(g => g.conv && g.conv[0] === other.slug && g.conv[1] === br.slug);
  const sw = p => `<i class="sw" style="background:${p.h}"></i>`;
  return `<section class="panel"><h2>How ${esc(short(br))} compares to ${esc(short(other))}</h2>
<div class="stats"><div><b>${pct(close, ops.length)}</b>of ${ops.length} opaque paints have a ${esc(short(other))} match under ΔE 6</div><div><b>${pct(fair, ops.length)}</b>have one under ΔE 10</div><div><b>${median(nearest.map(x => x.d)).toFixed(1)}</b>median ΔE to the nearest ${esc(short(other))} paint</div><div><b>${charted}</b>paints with a chart-listed ${esc(short(other))} equivalent</div></div>
<p class="s">ΔE is the colour difference between two swatches (CIE76): under about 6 looks close side by side, over about 15 is a loose substitute. These figures compare our estimated swatches, so treat them as a guide, not a guarantee.</p>
${ex.length ? `<p>Some of the closest pairs:</p><ul class="m">${ex.map(x => `<li>${sw(x.p)}<span><a href="${x.p.url}">${esc(label(x.p))}</a> ≈ <a href="${x.q.url}">${esc(short(other))} ${esc(label(x.q))}</a><em>ΔE ${x.d.toFixed(0)}, ${closeness(x.d)}</em></span></li>`).join('')}</ul>` : ''}
${conv ? `<p><a class="btn" href="/guides/${conv.slug}">${esc(conv.title)}</a></p>` : ''}</section>`;
}

function brandGuide(D, br) {
  const counts = {};
  br.paints.forEach(p => counts[p.t] = (counts[p.t] || 0) + 1);
  const types = Object.keys(TYPE_NAME).filter(t => counts[t]).sort((a, b) => counts[b] - counts[a]).map(t => `${counts[t]} ${TYPE_NAME[t]}`);
  const ranges = br.groups.map(g => [D.GL[g], br.paints.filter(p => p.g === g).length]).filter(x => x[1]);
  const others = br.slug === 'citadel' ? ['vallejo', 'army-painter'] : ['citadel'];
  return `<section class="panel prose"><h2>About ${esc(short(br))} paints</h2>
${BRAND_INFO[br.slug] ? `<p>${esc(BRAND_INFO[br.slug])}</p>` : ''}
<p>The Painters Desk lists ${br.paints.length} ${esc(short(br))} paints in ${ranges.length} range${ranges.length === 1 ? '' : 's'} (${ranges.map(([n, k]) => `${esc(n)}: ${k}`).join(', ')}). By type that is ${types.join(', ')}.</p></section>
${others.map(o => D.brands.find(b => b.slug === o)).filter(Boolean).map(o => compareHTML(D, br, o)).join('')}`;
}

function brandPage(D, br) {
  const groups = br.groups.map(g => ({ g, ps: br.paints.filter(p => p.g === g) })).filter(x => x.ps.length);
  const guides = GUIDES.filter(g => g.conv && g.conv.includes(br.slug));
  const title = `${br.name} paint equivalents and conversion chart`;
  const desc = `Find the closest ${D.brands.filter(b => b !== br).slice(0, 4).map(short).join(', ')} and other matches for all ${br.paints.length} ${br.name} paints, and how the range compares. Swatch colours are estimates.`;
  const body = `<h1>${esc(br.name)} paint equivalents</h1>
<p>Every ${esc(br.name)} paint on The Painters Desk (${br.paints.length} in all). Pick one to see its closest matches in the other brands. Swatch colours are estimates.</p>
${brandGuide(D, br)}
${guides.length ? `<section class="panel"><h2>Conversion charts</h2><ul class="m">${guides.map(g => `<li><a href="/guides/${g.slug}">${esc(g.title)}</a></li>`).join('')}</ul></section>` : ''}
${groups.map(x => `<section class="panel"><h2>${esc(D.GL[x.g])}</h2><ul class="list">${x.ps.map(p => `<li><a href="${paintUrl(p)}">${esc(label(p))}</a></li>`).join('')}</ul></section>`).join('')}`;
  return page({
    title, desc, path: '/paints/' + br.slug, body,
    crumbs: [['Paints', '/paints'], [br.name, '/paints/' + br.slug]],
    ld: [webPage('/paints/' + br.slug, title, desc, 'CollectionPage', {
      mainEntity: { '@type': 'ItemList', name: `${br.name} paints`, numberOfItems: br.paints.length, itemListElement: br.paints.map((p, k) => ({ '@type': 'ListItem', position: k + 1, url: SITE + p.url, name: p.n })) },
    })],
  });
}

function indexPage(D) {
  const n = D.brands.reduce((a, b) => a + b.paints.length, 0);
  const title = 'Miniature paint equivalents and conversion charts by brand';
  const desc = `Closest equivalents for ${n} miniature paints across Citadel, Vallejo, Army Painter, Pro Acryl, AK Interactive, Scale75 and more. Swatch colours are estimates.`;
  const body = `<h1>Miniature paint equivalents</h1>
<p>Find the closest match for any of ${n} miniature paints across ${D.brands.length} brands: Citadel, Vallejo, Army Painter, Pro Acryl, AK Interactive, Scale75 and more.
Each paint page lists the conversion-chart equivalents and the nearest swatch colours in every other brand. Swatch colours are estimates.</p>
<div class="grid">${D.brands.map(b => `<a class="panel" style="text-decoration:none" href="/paints/${b.slug}"><h2>${esc(b.name)}</h2><p class="s">${b.paints.length} paints</p></a>`).join('')}</div>
<p>Want a whole range at once? See the <a href="/guides">conversion charts and paint guides</a>.</p>`;
  return page({
    title, desc, path: '/paints', body, crumbs: [['Paints', '/paints']],
    ld: [webPage('/paints', title, desc, 'CollectionPage')],
  });
}

/* ---------- guides: conversion charts and technique paint lists ---------- */

const GUIDE_DATE = '2026-10-25';
const conv = (a, b, an, bn) => ({ slug: `${a}-to-${b}`, conv: [a, b], title: `${an} to ${bn} conversion chart`, label: `${an} → ${bn}` });
const GUIDES = [
  conv('citadel', 'vallejo', 'Citadel', 'Vallejo'),
  conv('citadel', 'army-painter', 'Citadel', 'Army Painter'),
  conv('citadel', 'pro-acryl', 'Citadel', 'Pro Acryl'),
  conv('citadel', 'ak-interactive', 'Citadel', 'AK Interactive'),
  conv('citadel', 'scale75', 'Citadel', 'Scale75'),
  conv('vallejo', 'citadel', 'Vallejo', 'Citadel'),
  conv('army-painter', 'citadel', 'Army Painter', 'Citadel'),
  conv('pro-acryl', 'citadel', 'Pro Acryl', 'Citadel'),
  // Technique guides, one per technique in the wheel's Ramps mode; the words are in tech-guides.js.
  ...Object.entries(TECH_TEXT).map(([q, t]) => ({ ...t, q, published: ['zen', 'edge', 'glaze'].includes(q) ? '2026-10-26' : GUIDE_DATE })),
  { slug: 'colour-theory', page: theoryPage, title: 'Colour theory for miniature painters', learn: true, label: 'Colour theory',
    blurb: 'Hue, value and saturation, colour schemes, and how the colour wheel picks complements and matches.' },
];

const brandBy = (D, s) => D.brands.find(b => b.slug === s);
const TECH_DATE = '2026-10-26';
const article = (path, title, desc, pub = GUIDE_DATE, mod = pub) => webPage(path, title, desc, 'Article', {
  headline: title, image: OG_IMAGE, datePublished: pub, dateModified: mod,
  author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' }, mainEntityOfPage: SITE + path,
});

function convPage(D, g) {
  const A = brandBy(D, g.conv[0]), B = brandBy(D, g.conv[1]), bi = D.brands.indexOf(B);
  const groups = A.groups.map(x => ({ g: x, ps: A.paints.filter(p => p.g === x) })).filter(x => x.ps.length);
  const rows = A.paints.map(p => ({ p, ...bestIn(D, p, bi) }));
  const by = new Map(rows.map(r => [r.p, r]));
  const close = rows.filter(r => r.best && r.best.d < 6).length, charted = rows.filter(r => r.doc).length;
  const cell = m => m ? `<i class="sw" style="background:${m.p.h}"></i>${m.s ? `<span class="ck" title="${esc(D.msrc[m.s] || 'Conversion chart')}">✓</span> ` : '≈ '}<a href="${m.p.url}">${esc(label(m.p))}</a><em>${esc(D.GL[m.p.g])} · ΔE ${m.d.toFixed(0)}, ${closeness(m.d)}</em>` : '–';
  const path = '/guides/' + g.slug;
  const title = g.title;
  const desc = `${short(A)} to ${short(B)} paint conversion chart: the closest ${short(B)} match for all ${A.paints.length} ${short(A)} paints, with chart-listed equivalents marked. Swatch colours are estimates.`;
  const body = `<h1>${esc(title)}</h1>
<div class="prose"><p>Every ${esc(short(A))} paint on The Painters Desk and its closest ${esc(short(B))} paints. The first column (<span class="ck">✓</span>) is the equivalent a manufacturer or community conversion chart lists, where there is one; the second (≈) is the nearest swatch colour of the same paint type (shade for shade, metallic for metallic), worked out from our swatch estimates. When the two disagree, either the chart pairing is a loose one or our swatch estimate is off, so compare the real paints.
ΔE is the colour difference between the two swatches: under about 6 is a close match, over about 15 is a loose one. Real paints differ in finish and coverage as well as colour, so check before you commit to a whole army.</p>
<p>${close} of ${A.paints.length} paints (${pct(close, A.paints.length)}) have a ${esc(short(B))} match under ΔE 6, and ${charted} have a chart-listed equivalent. Tap any paint for its matches in every other brand.</p></div>
${groups.map(x => `<section class="panel"><h2>${esc(short(A))} ${esc(D.GL[x.g])}</h2><div class="tw"><table class="cv"><thead><tr><th>${esc(short(A))}</th><th>Chart-listed ${esc(short(B))}</th><th>Nearest ${esc(short(B))} colour</th></tr></thead><tbody>${x.ps.map(p => { const r = by.get(p); return `<tr><td><i class="sw" style="background:${p.h}"></i><a href="${p.url}">${esc(label(p))}</a></td><td>${cell(r.doc)}</td><td>${cell(r.near)}</td></tr>` }).join('')}</tbody></table></div></section>`).join('')}
${guideLinks(g)}`;
  return page({ title, desc, path, body, og: 'article', crumbs: [['Guides', '/guides'], [title, path]], ld: [article(path, title, desc)] });
}

// Technique ramps: the same targets as the Ramps mode on the wheel (TQ in app.js, 7 steps, no tint).
// tools/check_seo.mjs checks these against TQ, so change both together.
const lchOf = lab => [lab[0], Math.hypot(lab[1], lab[2]), (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360];
const lab3 = (L, C, h) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
const hdS = (a, b) => (b - a + 540) % 360 - 180;
function rampOf(lab, o) {
  const [L0, C0, h0] = lchOf(lab), out = [];
  o.dk.forEach((r, k) => { const t = k / o.dk.length; out.push({ r, t: lab3(o.Ld + (L0 - o.Ld) * t, o.sC(C0, t), o.sH(h0, t)) }) });
  out.push({ r: o.baseName || 'Base', t: lab, base: 1 });
  o.lt.forEach((r, k) => { const t = (k + 1) / (o.lt.length + 1); out.push({ r, t: lab3(L0 + (o.Lt - L0) * t, o.lC(C0, t), o.lH(h0, t)) }) });
  out.push({ r: o.top, t: lab3(o.topL, o.topC(C0), o.topH ? o.topH(h0) : o.lH(h0, 1)) });
  return out;
}
const DK = ['Deep shadow', 'Shadow', 'Dark mid'];
export const TECH = {
  nmm(lab) {
    const [, C0, h0] = lchOf(lab), warm = C0 > 12 && h0 > 20 && h0 < 110, sh = warm ? hdS(h0, 45) * .6 : 0, hl = warm ? hdS(h0, 95) * .5 : 0;
    return rampOf(lab, { dk: DK, lt: ['Highlight', 'Bright highlight'], Ld: 9, Lt: 96, top: 'Glint', topL: 98, topC: () => 3, topH: h => h,
      sC: (C, t) => C * (.3 + .6 * t), sH: (h, t) => h + sh * (1 - t), lC: (C, t) => C * (1 - .6 * t), lH: (h, t) => h + hl * t });
  },
  osl(lab) {
    return rampOf(lab, { dk: ['Unlit surface', 'Falloff', 'Glow edge'], lt: ['Bright glow', 'Hot core'], Ld: 16, Lt: 94, baseName: 'Glow', top: 'Light source', topL: 97, topC: () => 4,
      sC: (C, t) => Math.min(10, C * .25) + (C * 1.05 - Math.min(10, C * .25)) * t, sH: h => h, lC: (C, t) => C * (1 - .6 * t * t), lH: (h, t) => h + hdS(h, 95) * .25 * t });
  },
  gem(lab) {
    return rampOf(lab, { dk: DK, lt: ['Reflected light', 'Bright reflection'], Ld: 8, Lt: 86, top: 'Glint', topL: 98, topC: () => 2,
      sC: (C, t) => C * (.7 + .3 * t), sH: h => h, lC: (C, t) => C * (1 - .35 * t), lH: h => h });
  },
  skin(lab) {
    const sh = hdS(lchOf(lab)[2], 35) * .5;
    return rampOf(lab, { dk: DK, lt: ['Highlight', 'Bright highlight'], Ld: 18, Lt: 90, top: 'Top highlight', topL: 91, topC: C => C * .22,
      sC: (C, t) => C * (.85 + .15 * t), sH: (h, t) => h + sh * (1 - t), lC: (C, t) => C * (1 - .5 * t), lH: (h, t) => h + hdS(h, 80) * .4 * t });
  },
  zen(lab) {
    const L0 = lab[0];
    return rampOf(lab, { dk: ['Deep shadow', 'Shadow'], lt: ['Highlight 1', 'Highlight 2', 'Highlight 3'], Ld: Math.max(6, L0 * .35), Lt: 92, top: 'Top highlight', topL: Math.min(95, L0 + (95 - L0) * .85), topC: C => C * .35,
      sC: (C, t) => C * (.6 + .4 * t), sH: h => h, lC: (C, t) => C * (1 - .45 * t), lH: h => h });
  },
  edge(lab) {
    return rampOf(lab, { dk: [], lt: ['Edge 1', 'Edge 2'], Ld: 0, Lt: 90, top: 'Fine edge', topL: lab[0] + (96 - lab[0]) * .85, topC: C => C * .35,
      sC: C => C, sH: h => h, lC: (C, t) => C * (1 - .4 * t), lH: h => h });
  },
  glaze(lab) {
    const L0 = lab[0], w = [5, 4, 1, 3, 4, 5, 6];
    const out = rampOf(lab, { dk: ['Deep glaze', 'Shadow glaze'], lt: ['Glaze 1', 'Glaze 2', 'Glaze 3'], Ld: Math.max(8, L0 * .4), Lt: L0 + (90 - L0) * .85, top: 'Final glaze', topL: L0 + (90 - L0) * .85, topC: C => C * .5,
      sC: (C, t) => C * (.75 + .25 * t), sH: h => h, lC: (C, t) => C * (1 - .4 * t), lH: h => h });
    out.forEach((x, i) => x.w = w[i]);
    return out;
  },
};
const labHex = ([L, A, B]) => {
  const fy = (L + 16) / 116, iv = t => t ** 3 > .008856 ? t ** 3 : (t - 16 / 116) / 7.787, X = iv(fy + A / 500) * .95047, Y = iv(fy), Z = iv(fy - B / 200) * 1.08883;
  const s = v => { v = v > .0031308 ? 1.055 * v ** (1 / 2.4) - .055 : 12.92 * v; return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0') };
  return '#' + s(3.2406 * X - 1.5372 * Y - .4986 * Z) + s(-.9689 * X + 1.8758 * Y + .0415 * Z) + s(.0557 * X - .204 * Y + 1.057 * Z);
};
// Nearest opaque paint for each step (lightness weighted, no repeats), as the wheel's Ramps mode does.
function fit(T, pool) {
  const used = new Set(), w = (a, c) => Math.hypot(1.6 * (a[0] - c[0]), a[1] - c[1], a[2] - c[2]);
  return T.map(x => {
    let m = null, md = 1e9;
    pool.forEach(q => { if (used.has(q)) return; const d = w(q.lab, x.t); if (d < md) { md = d; m = q } });
    if (m) used.add(m);
    return { ...x, p: m, d: m ? Math.hypot(m.lab[0] - x.t[0], m.lab[1] - x.t[1], m.lab[2] - x.t[2]) : 99 };
  });
}

// A small picture of the ramp on a shape that suits the technique, like rampPrev() on the wheel. cs: step colours, darkest first.
function rampPic(q, cs, id) {
  const stops = (a, n = a.length) => a.map((c, i) => `<stop offset="${(i / Math.max(1, n - 1)).toFixed(3)}" stop-color="${c}"/>`).join('');
  const down = [...cs].reverse(), lin = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(down)}</linearGradient>`;
  const svg = (h, a, s) => `<svg class="pic" viewBox="0 0 300 ${h}" role="img" aria-label="${a}">${s}</svg>`;
  if (q === 'nmm') return svg(90, 'The ramp on a sword blade', `<defs>${lin}</defs><rect x="6" y="38" width="44" height="14" rx="3" fill="#5a3a1a" stroke="currentColor" stroke-width="2.5"/><rect x="48" y="20" width="12" height="50" rx="3" fill="url(#${id})" stroke="currentColor" stroke-width="2.5"/><path d="M60 26 L262 26 L294 45 L262 64 L60 64 Z" fill="url(#${id})" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`);
  if (q === 'osl') return svg(120, 'The ramp as light spreading from a source', `<defs><radialGradient id="${id}" cx=".5" cy=".5" r=".5">${stops(down)}</radialGradient></defs><rect x="4" y="4" width="292" height="112" rx="14" fill="${cs[0]}" stroke="currentColor" stroke-width="3"/><ellipse cx="150" cy="60" rx="120" ry="54" fill="url(#${id})"/><circle cx="150" cy="60" r="7" fill="${cs[cs.length - 1]}" stroke="currentColor" stroke-width="2"/>`);
  if (q === 'gem') return svg(110, 'The ramp on a round gem', `<defs><linearGradient id="${id}" x1=".2" y1="0" x2=".8" y2="1">${stops(cs.slice(0, -1))}</linearGradient></defs><circle cx="150" cy="55" r="46" fill="#7a6a4a" stroke="currentColor" stroke-width="3"/><circle cx="150" cy="55" r="38" fill="url(#${id})" stroke="currentColor" stroke-width="3"/><circle cx="137" cy="40" r="5" fill="${cs[cs.length - 1]}"/>`);
  if (q === 'edge') {
    // An armour plate: the base, edge highlights along its top edges and fine dots on the corners.
    const top = 'M10 40 L32 16 L268 16 L290 40', e = cs.length > 3 ? cs.slice(1, -1) : [cs[1]];
    return svg(100, 'Edge highlights on an armour plate', `<defs><clipPath id="${id}"><path d="${top} L290 88 L10 88 Z"/></clipPath></defs><path d="${top} L290 88 L10 88 Z" fill="${cs[0]}"/><g clip-path="url(#${id})" fill="none" stroke-linejoin="round">${e.map((c, i) => `<path d="${i ? 'M32 16 L268 16' : top}" stroke="${c}" stroke-width="${i ? 7 : 16}"/>`).join('')}</g><circle cx="33" cy="18" r="3" fill="${cs[cs.length - 1]}"/><circle cx="267" cy="18" r="3" fill="${cs[cs.length - 1]}"/><path d="${top} L290 88 L10 88 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`);
  }
  const w = 292 / cs.length;
  return svg(60, 'The ramp as stepped bands', down.map((c, i) => `<rect x="${(4 + i * w).toFixed(1)}" y="6" width="${(w + .5).toFixed(1)}" height="48" fill="${c}"/>`).join('') + '<rect x="4" y="6" width="292" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="3"/>');
}

// Lightness (bars, in the step's colour) and saturation (dashed line) of each step, darkest first.
function rampChart(T) {
  const W = 520, H = 220, x0 = 34, y0 = 186, bw = (W - x0 - 10) / T.length, y = v => y0 - v * 1.6;
  const lc = T.map(s => lchOf(s.t));
  const bars = T.map((s, i) => `<rect x="${(x0 + i * bw + 4).toFixed(1)}" y="${y(lc[i][0]).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${(lc[i][0] * 1.6).toFixed(1)}" fill="${labHex(s.t)}" stroke="currentColor" stroke-width="2"><title>${esc(s.r)}: lightness ${Math.round(lc[i][0])}</title></rect>
<text x="${(x0 + (i + .5) * bw).toFixed(1)}" y="${y0 + 18}" text-anchor="middle">${i + 1}</text>`).join('');
  const pts = lc.map((c, i) => `${(x0 + (i + .5) * bw).toFixed(1)},${y(Math.min(100, c[1])).toFixed(1)}`);
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${x0}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".15"/><text x="${x0 - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lightness and saturation of each step" fill="currentColor" font-size="12">${grid}${bars}
<polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 4"/>${pts.map(p => { const [a, b] = p.split(','); return `<circle cx="${a}" cy="${b}" r="4" fill="var(--card)" stroke="currentColor" stroke-width="2"/>` }).join('')}</svg>`;
}

// Example colours for a technique guide: its own bases, or the fixed bases the Suggested paints panel uses (SG_FIX in app.js).
const guideBases = (D, g) => g.bases ? g.bases.map(([n, h]) => ({ n, h, lab: hexLab(h) })) : D.sgFix.filter(b => b.q === g.q);
const guideBase = (D, g) => guideBases(D, g)[0];

function techPage(D, g) {
  const bases = guideBases(D, g);
  const brands = D.brands.map(br => ({ br, pool: br.paints.filter(p => p.ramp) })).filter(x => x.pool.length >= 40);
  const grade = d => d < 6 ? 'close' : d < 12 ? 'fair' : 'loose';
  const ex = bases[0], T0 = TECH[g.q](ex.lab), ex0 = lchOf(ex.lab);
  const water = s => s.w ? ` · 1:${s.w} paint to water` : '';
  const sections = bases.map(b => {
    const T = TECH[g.q](b.lab);
    const res = brands.map(x => ({ ...x, R: fit(T, x.pool) })).map(x => ({ ...x, avg: x.R.reduce((a, s) => a + s.d, 0) / x.R.length }));
    const top = [...res].sort((a, b) => a.avg - b.avg)[0];
    return `<section class="panel"><h2>${esc(b.n)}</h2>
<p class="s">Target ramp (darkest to lightest):</p><div class="chip">${T.map(x => `<i style="background:${labHex(x.t)}" title="${esc(x.r)}"></i>`).join('')}</div>
<p>Closest fit overall: <b>${esc(top.br.name)}</b> (average ΔE ${top.avg.toFixed(1)} per step).</p>
<div class="grid">${res.map(x => `<div class="br"><h3><a href="/paints/${x.br.slug}">${esc(x.br.name)}</a></h3><div class="chip">${x.R.map(s => `<i style="background:${s.p ? s.p.h : 'transparent'}"></i>`).join('')}</div><ol class="ramp">${x.R.map(s => s.p ? `<li><i class="sw" style="background:${s.p.h}"></i><span><a href="${s.p.url}">${esc(label(s.p))}</a><em>${esc(s.r)} · ${esc(D.GL[s.p.g])} · ΔE ${s.d.toFixed(0)}, ${grade(s.d)}${water(s)}</em></span></li>` : '').join('')}</ol></div>`).join('')}</div></section>`;
  });
  const path = '/guides/' + g.slug, title = g.title, wheel = `/#/?ramp=${g.q}`;
  const shift = c => c[1] < 4 || ex0[1] < 4 ? '–' : (d => Math.abs(d) < 1 ? '0°' : (d > 0 ? '+' : '−') + Math.abs(d) + '°')(Math.round(hdS(ex0[2], c[2])));
  const steps = T0.map((s, i) => `<li><i class="sw" style="background:${labHex(s.t)}"></i><span><b>${i + 1}. ${esc(s.r)}</b>${s.w ? ` <span class="s">(1:${s.w} paint to water)</span>` : ''}<em>${g.steps[s.r]}</em></span></li>`).join('');
  const table = `<div class="tw"><table class="cv"><thead><tr><th>#</th><th>Step</th><th>Lightness</th><th>Saturation</th><th>Hue shift</th></tr></thead><tbody>${T0.map((s, i) => { const c = lchOf(s.t); return `<tr><td>${i + 1}</td><td><i class="sw" style="background:${labHex(s.t)}"></i>${esc(s.r)}</td><td>${Math.round(c[0])}</td><td>${Math.round(c[1])}</td><td>${shift(c)}</td></tr>` }).join('')}</tbody></table></div>`;
  const body = `<h1>${esc(title)}</h1>
<div class="panel hero"><div class="prose" style="flex:1;min-width:260px">${g.intro.map(p => `<p>${p}</p>`).join('')}
<p><a class="btn" href="${wheel}">Build this ramp on the colour wheel</a></p></div>
<figure>${rampPic(g.q, T0.map(s => labHex(s.t)), 'pic0')}<figcaption class="s">${esc(ex.n)}: the target ramp from this guide.</figcaption></figure></div>

<section class="panel prose"><h2>What you need</h2><ul>${g.need.map(x => `<li>${x}</li>`).join('')}</ul></section>

<section class="panel"><h2>Step by step</h2>
<p class="prose">These are the ${T0.length} steps the Ramps mode uses for ${esc(g.name)}, darkest first, with the target colour of each step for the ${esc(ex.n.toLowerCase())}. Thin each paint to the consistency of milk${g.q === 'glaze' ? ' (or thinner, as given)' : ''} and let each layer dry before the next. The <a href="#paints">paint lists below</a> give the closest real paint in each brand.</p>
<ol class="ramp steps">${steps}</ol></section>

<section class="panel"><h2>The colour behind the ramp</h2>
<div class="prose">${g.colour.map(p => `<p>${p}</p>`).join('')}</div>
<div class="hero">${rampChart(T0)}<p class="s" style="flex:1;min-width:200px">Bars: the lightness of each step of the ${esc(ex.n.toLowerCase())} ramp, from 0 (black) to 100 (white), in the step's own colour. Dashed line: its saturation (CIELAB chroma). Numbers match the steps above and the table below.</p></div>
${table}
<p class="s">Lightness and saturation are CIELAB values; hue shift is how far each step's hue turns from the base, in CIELAB degrees (– where a step is too grey to have a hue).</p></section>

<section class="panel prose"><h2>How the Ramps mode builds it</h2>
${g.wheel.map(p => `<p>${p}</p>`).join('')}
<p>Every technique then picks real paints the same way: for each step it finds the nearest paint among the ones shown on the wheel, by ΔE with lightness counted 1.6 times as much as colour (value contrast is what sells a ramp), and never uses the same paint twice. Only opaque paints are used: no metallics, washes, contrast paints, inks, glazes, primers or fluorescents. Each step is graded Close (ΔE under 6), Fair (under 12) or Loose.</p>
<h3>Using it on the wheel</h3>
<ol><li>Open <a href="/">the colour wheel</a> and pick <b>Ramps</b> above the wheel, then <b>${esc(D.tqFull[g.q] || g.short)}</b> under Technique (or <a href="${wheel}">open it straight in this mode</a>).</li>
<li>Choose ${g.q === 'edge' ? '2 or 3 edges' : '5 or 7 steps'}${g.q === 'edge' ? '' : '; 5 steps leaves out some of the in-between steps for a quicker ramp'}.</li>
<li>Tap ${g.q === 'osl' ? 'the colour of the light' : 'your base colour'} on the wheel, or in the neutrals list under it. If it's a metallic or effect paint, the ramp starts from the nearest opaque paint instead.</li>
<li>Untick brands and ranges you don't want, or tick <b>Matches from my paints only</b> once your collection is set up, to build the ramp from the paints you own.</li>
<li>Tap ↻ on a step to try the next nearest paint, then <b>Save as recipe</b> to keep the ramp, with the step notes above, in your recipes.</li></ol></section>

<section class="panel prose"><h2>Common mistakes</h2><ul>${g.mistakes.map(x => `<li>${x}</li>`).join('')}</ul></section>

<section class="panel prose" id="paints"><h2>The best paints for ${esc(g.name)}, brand by brand</h2>
<p>Each ramp below is built the way the Ramps mode builds one: the same target colours, then the nearest opaque paint in each brand for each step. ΔE says how far each paint is from its target: close is under 6, fair under 12. Swatch colours are estimates, so test the ramp on a spare model first. On the wheel you can build the same ramp from any paint, or only from the paints you own.</p></section>
${sections.join('')}
${guideLinks(g)}`;
  const desc = g.desc + ' Swatch colours are estimates.';
  const howTo = { '@type': 'HowTo', name: title, description: desc, step: T0.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.r, text: g.steps[s.r].replace(/<[^>]+>/g, '') })) };
  return page({ title, desc, path, body, og: 'article', crumbs: [['Guides', '/guides'], [title, path]], ld: [article(path, title, desc, g.published || TECH_DATE, TECH_DATE), howTo] });
}

/* ---------- colour theory guide ---------- */

const guideHTML = (D, g) => g.page ? g.page(D, g) : g.conv ? convPage(D, g) : techPage(D, g);
const THEORY_DATE = '2026-10-26';

// Hue, saturation and lightness of a swatch, worked out the same way as the wheel in app.js (HSL from the hex colour).
function hslOf(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, L = (mx + mn) / 2;
  let H = 0;
  if (d) { H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H = (H * 60 + 360) % 360 }
  return { H, S: d ? d / (1 - Math.abs(2 * L - 1)) : 0, L };
}
const hueD = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d };
const onWheel = p => p.S >= .14 && p.L > .07 && p.L < .95;
// Point on a wheel of radius r around (c, c), 0 degrees at the top and going clockwise, as on the site.
const pol = (c, r, deg) => [c + r * Math.cos((deg - 90) * Math.PI / 180), c + r * Math.sin((deg - 90) * Math.PI / 180)].map(v => +v.toFixed(1));

// A hue ring with spokes and dots at the given angles: the little diagrams for each colour scheme.
function hueRing(c, R, w) {
  const seg = [];
  for (let a = 0; a < 360; a += 10) {
    const [x1, y1] = pol(c, R, a - 5.2), [x2, y2] = pol(c, R, a + 5.2), [x3, y3] = pol(c, R - w, a + 5.2), [x4, y4] = pol(c, R - w, a - 5.2);
    seg.push(`<path d="M${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R - w} ${R - w} 0 0 0 ${x4} ${y4}Z" fill="hsl(${a} 75% 52%)"/>`);
  }
  return seg.join('');
}
function ringSVG(angles, size = 150) {
  const c = size / 2, R = c - 12, seg = [hueRing(c, R, 14)];
  const dots = angles.map(a => { const [x, y] = pol(c, R - 7, a); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="2"/><circle cx="${x}" cy="${y}" r="8" fill="hsl(${a} 75% 52%)" stroke="currentColor" stroke-width="3"/>` });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-hidden="true">${seg.join('')}${dots.join('')}</svg>`;
}

function theoryPage(D, g) {
  const cit = D.brands.find(b => b.slug === 'citadel');
  // Opaque Citadel paints on the wheel, leaving out Air (the same colours again, thinned) and any repeated names.
  const seen = new Set();
  const pool = cit.paints.filter(p => p.t === 'op' && !/\bair\b/i.test(D.GL[p.g]) && !seen.has(p.n) && seen.add(p.n)).map(p => ({ p, ...hslOf(p.h) })).filter(onWheel);
  // The opaque Citadel paint closest to a hue, preferring mid-tone, fairly saturated paints so the examples read clearly.
  const near = (h, used) => pool.filter(x => !used.has(x.p)).map(x => ({ x, k: hueD(x.H, h) * 1.5 + Math.abs(x.L - .42) * 60 + Math.max(0, .45 - x.S) * 80 }))
    .sort((a, b) => a.k - b.k)[0]?.x;
  const chips = (hs) => { const used = new Set(); return hs.map(h => near(h, used)).filter(Boolean).map(x => { used.add(x.p); return x }) };
  const chipList = xs => `<ul class="m">${xs.map(x => `<li><i class="sw" style="background:${x.p.h}"></i><span><a href="${x.p.url}">${esc(x.p.n)}</a><em>${esc(D.GL[x.p.g])} · hue ${Math.round(x.H)}°</em></span></li>`).join('')}</ul>`;

  // Worked example: Macragge Blue, with complements and neighbours picked by the wheel's rules from Citadel's opaque paints.
  const ex = pool.find(x => x.p.n === 'Macragge Blue') || pool[0];
  const th = (ex.H + 180) % 360, rest = pool.filter(x => x !== ex);
  const comp = rest.filter(x => hueD(x.H, th) <= 22).sort((a, b) => hueD(a.H, th) - hueD(b.H, th)).slice(0, 6);
  const ana = rest.filter(x => hueD(x.H, ex.H) <= 25).sort((a, b) => hueD(a.H, ex.H) - hueD(b.H, ex.H)).slice(0, 6);
  const srt = [...pool].sort((a, b) => a.L - b.L);
  srt.forEach((x, i) => x.rk = i / Math.max(1, srt.length - 1));
  const W = 340, c = W / 2, hit = new Map([[ex, 'ex'], ...comp.map(x => [x, 'co']), ...ana.map(x => [x, 'an'])]);
  const dots = [...pool].sort((a, b) => (hit.has(a) ? 1 : 0) - (hit.has(b) ? 1 : 0)).map(x => {
    const [px, py] = pol(c, 34 + (.55 * x.rk + .45 * Math.min(1, Math.max(0, (x.L - .1) / .85))) * 112, x.H), k = hit.get(x);
    return `<circle cx="${px}" cy="${py}" r="${k ? 8 : 5}" fill="${x.p.h}" stroke="currentColor" stroke-width="${k === 'ex' ? 4 : k ? 2.5 : 1}"${k ? '' : ' opacity=".55"'}><title>${esc(x.p.n)}</title></circle>`;
  });
  const [ax, ay] = pol(c, 158, ex.H), [bx, by] = pol(c, 158, th);
  const wheel = `<svg class="wheel" viewBox="0 0 ${W} ${W}" role="img" aria-label="Citadel's opaque paints on a colour wheel, with Macragge Blue, its complements and its neighbours outlined">
${hueRing(c, 168, 6)}<circle cx="${c}" cy="${c}" r="24" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>
<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 5"/>${dots.join('')}</svg>`;

  const schemes = [
    ['Complementary', [ex.H, th], 'Two hues opposite each other. The strongest contrast you can get from colour alone: blue armour with orange or brass trim, a green cloak with a red gem. Use one as the main colour and the other in small amounts so it draws the eye.'],
    ['Analogous', [ex.H - 30, ex.H, ex.H + 30], 'Neighbouring hues. Calm and natural, and the easiest way to make a model look unified. Neighbours are also good for shading and highlighting: shift a little along the wheel as you go darker or lighter.'],
    ['Split complementary', [ex.H, th - 30, th + 30], 'One hue plus the two on either side of its complement. Almost as lively as a complementary scheme but easier to balance, a good default for a squad or a character.'],
    ['Triadic', [ex.H, ex.H + 120, ex.H + 240], 'Three hues evenly spaced. Bright and busy, so let one colour lead, use the second for large details and the third only for spot colour.'],
  ].map(([n, hs, t]) => { hs = hs.map(h => (h + 360) % 360); return `<div class="sch"><h3>${n}</h3>${ringSVG(hs)}<p>${t}</p><p class="s">Citadel paints at these hues:</p>${chipList(chips(hs))}</div>` });

  const path = '/guides/' + g.slug, title = g.title;
  const desc = 'Colour theory for miniature painters: hue, value and saturation, the colour wheel, complementary, analogous, split complementary and triadic schemes, warm and cool, and how The Painters Desk colour wheel places paints and picks complements and matches.';
  const body = `<h1>Colour theory for miniature painters</h1>
<div class="prose"><p>Colour theory is a handful of ideas about how colours relate to each other: which ones contrast, which ones sit together quietly, and how to make a model read clearly from across the table. This guide covers the basics, then explains how <a href="/">the colour wheel on The Painters Desk</a> puts those ideas to work on real paints, and where it bends the textbook rules.</p></div>

<section class="panel prose"><h2>Hue, value and saturation</h2>
<p>Every colour can be described three ways. <b>Hue</b> is the colour family: red, orange, blue and so on, the thing that goes around a colour wheel. <b>Value</b> (or lightness) is how light or dark it is. <b>Saturation</b> (or chroma) is how intense it is, from a vivid pure colour down to a dull grey.</p>
<p>Of the three, value matters most on a miniature. A model is small and usually seen from arm's length, so it is the contrast between light and dark that shows its shape. Squint at a model, or take a black and white photo of it: if the parts blur into one grey, they need more value contrast, whatever their hues. Saturation comes next: keep the strongest colour for the thing you want people to look at, and let the rest be a little duller.</p>
<div class="chip tall" title="The same hue at different values">${[15, 30, 45, 60, 75, 88].map(L => `<i style="background:${labHex(lab3(L, 40, 270))}"></i>`).join('')}</div>
<div class="chip tall" title="The same hue at different saturations">${[0, 10, 20, 32, 46, 60].map(C => `<i style="background:${labHex(lab3(50, C, 40))}"></i>`).join('')}</div>
<p class="s">Top: one hue, dark to light (value). Bottom: one hue, grey to intense (saturation).</p></section>

<section class="panel prose"><h2>The colour wheel</h2>
<p>A colour wheel arranges hues in a circle, so every colour sits between its neighbours and opposite its <b>complement</b>. Painters traditionally learn a red, yellow and blue wheel (RYB), where red sits opposite green, yellow opposite purple and blue opposite orange. Screens use a red, green and blue wheel of light (RGB), which spaces the hues a little differently: there red sits opposite a blue-green, and yellow opposite a deep blue.</p>
<p>Neither is "correct". Both are models, and real paints are made from pigments that don't follow either one exactly. Mixing two complements together dulls them toward a brown or grey, which is why a thin glaze of the complement is a classic way to knock back a colour that is too bright, and why you get mud when complements mix by accident on a wet model.</p>
<p><b>Warm and cool.</b> Reds, oranges and yellows feel warm and seem to come forward; blues, greens and violets feel cool and seem to sit back. Many painters shift the hue as well as the value along a ramp: cooler or more purple in the shadows, warmer or more yellow in the highlights. It makes a ramp look lit, rather than just darker and lighter.</p></section>

<section class="panel"><h2>Colour schemes</h2>
<p class="prose">These are the classic ways to pick colours for a model or an army, with the Citadel paints nearest each hue as an example. The angles here are the same hue angles the colour wheel uses.</p>
<div class="schs">${schemes.join('')}</div>
<p class="prose">Two more worth knowing: a <b>monochrome</b> scheme uses one hue at many values (great for a single-colour army that still reads well), and a <b>neutral plus accent</b> scheme puts one strong colour against blacks, greys, browns and metals, which is how most grimdark armies are painted.</p></section>

<section class="panel"><h2>How The Painters Desk uses the colour wheel</h2>
<div class="hero">${wheel}<div class="prose" style="flex:1;min-width:260px">
<p>This is a small version of the site's wheel showing only Citadel's opaque paints, without the push-apart, so some dots overlap. <b>${esc(ex.p.n)}</b> has the thick outline; its complements (across the dashed line) and its neighbours have thinner outlines.</p>
<p><b>Around the wheel: the paint's own hue.</b> Each paint sits at the true hue angle of its swatch colour, measured the screen (RGB) way, with red at the top and the hues running clockwise through yellow, green, blue and purple. We don't squeeze the hues into a painter's RYB wheel, because that would mean bending every paint's real position by a different amount.</p>
<p><b>Centre to rim: lightness.</b> Dark paints sit near the centre and light ones near the rim. The distance mixes each paint's lightness with its rank among the paints you're showing, so a crowd of mid tones still spreads out.</p>
<p><b>Push-apart.</b> Hundreds of paints share some hues, so the dots are nudged apart until none overlap and then pulled gently back toward their true spot. A dot can end up a few degrees from its exact hue, but complements and neighbours are always worked out from the exact hues.</p>
<p><b>Neutrals.</b> Paints with very little saturation, and near-blacks and near-whites, have no meaningful hue, so they go in the Neutrals, greys &amp; whites list under the wheel instead.</p>
</div></div>
<div class="prose">
<p><b>Complements and neighbours.</b> Tap a paint and the wheel picks up to six <b>complements</b>: the paints, from the ones you're showing, whose hue is within 22° of the exact opposite, closest first. It also picks up to six <b>neighbours</b> (analogous colours) within 25° of the paint's own hue. Both are chosen by hue only, so they can be lighter or darker than your paint: pick the value you need for the job, dark ones for shading and light ones for highlights. With ${esc(ex.p.n)} and all of Citadel's opaque paints, that gives:</p>
<div class="grid"><div><h3>Complements</h3>${comp.length ? chipList(comp) : '<p class="s">None within 22°.</p>'}</div><div><h3>Neighbours</h3>${ana.length ? chipList(ana) : '<p class="s">None within 25°.</p>'}</div></div>
<p><b>The centre disc.</b> The disc in the middle of the wheel blends from the complements, through your paint, out to its neighbours. Each side runs from dark to light and the two sides meet where their shades match, so you can see how the colours would grade into each other on a model.</p>
<p><b>Ramps and Blends.</b> Ramps mode turns colour theory into steps: for <a href="/guides/best-paints-for-nmm">non-metallic metal</a>, <a href="/guides/best-paints-for-osl">object source lighting</a>, <a href="/guides/best-paints-for-gems">gems</a>, <a href="/guides/best-paints-for-skin-tones">skin</a>, <a href="/guides/zenithal-highlighting">zenithal</a> and <a href="/guides/edge-highlighting">edge highlights</a> and <a href="/guides/glazing">glazes</a> it sets a target colour for each step (shifting hue and saturation as well as lightness, as described above) and finds the nearest opaque paint for each one. Blends mode lets you pin a few paints and fills the steps between them. Each technique has its own step-by-step guide with example ramps.</p>
<p><b>Matches between brands.</b> When you tap a paint, its matches in other brands come two ways. A <span class="ck">✓</span> means a published conversion chart lists the pair (the Two Thin Coats comparison chart, Army Painter's Fanatic conversion chart, AK's 3rd Generation equivalence table and the Herrick Games chart). A ≈ means the nearest swatch colour, measured as ΔE: the straight-line distance between the two colours in CIELAB, a colour space built so equal distances look roughly equally different (the 1976 formula, often written ΔE76). Under about 6 is a close match, over about 15 is a loose one. Unlike complements, matches use lightness and saturation as well as hue.</p>
<p><b>Swatches are estimates.</b> Every swatch is an estimate taken from manufacturer charts, swatch photos and comparison charts, and every screen shows colour a little differently. Finish (matt, satin, metallic), coverage and how a paint dries change how it looks too. Use the wheel to narrow down your choices, then check the real paints before you commit to a whole army.</p>
<p><a class="btn" href="/">Try it on the colour wheel</a></p>
</div></section>
${guideLinks(g)}`;
  const ld = webPage(path, title, desc, 'Article', {
    headline: title, image: OG_IMAGE, datePublished: THEORY_DATE, dateModified: THEORY_DATE,
    author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' }, mainEntityOfPage: SITE + path,
  });
  return page({ title, desc, path, body, og: 'article', crumbs: [['Guides', '/guides'], [title, path]], ld: [ld] });
}

// Exported for tools/check_seo.mjs: builds every guide page and the brand guides, returns how many guides there are.
export function renderGuides(D) {
  GUIDES.forEach(g => {
    const html = guideHTML(D, g);
    if (!html.includes('<table') && !html.includes('class="ramp"') && !html.includes('class="wheel"')) throw new Error('Empty guide: ' + g.slug);
    if (g.conv && g.conv.some(s => !brandBy(D, s))) throw new Error('Unknown brand in ' + g.slug);
  });
  D.brands.forEach(b => brandPage(D, b));
  return GUIDES.length;
}

// The guides in the order the /guides list shows them: colour theory, techniques from easiest to hardest, then conversion
// charts (from Citadel, then to Citadel).
const guideOrder = () => [...GUIDES.filter(g => g.learn), ...GUIDES.filter(g => g.q).sort((a, b) => a.level - b.level), ...GUIDES.filter(g => g.conv)];

function guideLinks(cur) {
  const li = g => `<li><a href="/guides/${g.slug}">${esc(g.label)}</a></li>`;
  return `<section class="panel"><h2>More guides</h2><ul class="m list">${guideOrder().filter(g => g !== cur).map(li).join('')}</ul></section>`;
}

function guidesPage(D) {
  const n = D.brands.reduce((a, b) => a + b.paints.length, 0);
  const title = 'Miniature painting guides and paint conversion charts';
  const desc = 'Colour theory for miniature painters, step-by-step guides to edge highlighting, zenithal highlights, glazing, skin, gems, OSL and NMM with the best paints for each, and Citadel to Vallejo, Army Painter, Pro Acryl, AK and Scale75 conversion charts, built from ' + n + ' paints. Swatch colours are estimates.';
  const card = g => `<li><a href="/guides/${g.slug}"><b>${esc(g.label)}</b></a>${g.q ? `<span class="chip">${TECH[g.q](guideBase(D, g).lab).map(x => `<i style="background:${labHex(x.t)}"></i>`).join('')}</span>` : ''}<em>${esc(g.blurb)}</em></li>`;
  const charts = (k, h) => `<div><h3>${h}</h3><ul class="m">${GUIDES.filter(g => g.conv && g.conv[k] === 'citadel').map(g => `<li><a href="/guides/${g.slug}">${esc(g.label)}</a></li>`).join('')}</ul></div>`;
  const body = `<h1>Paint guides</h1>
<p class="prose">Guides to colour and painting techniques, and conversion charts between brands, built from the ${n} paints on The Painters Desk. Everything here comes from the same swatch estimates and conversion charts as the colour wheel, so treat matches as close, never exact.</p>
<section class="panel"><h2>Start here</h2><ul class="m gl">${GUIDES.filter(g => g.learn).map(card).join('')}</ul></section>
<section class="panel"><h2>Painting techniques</h2><p class="s">Easiest first. Each guide goes step by step, explains the colour behind the ramp and lists the best paints in every brand.</p><ul class="m gl">${guideOrder().filter(g => g.q).map(card).join('')}</ul></section>
<section class="panel"><h2>Conversion charts</h2><p class="s">Every paint in one brand with its closest match in another.</p><div class="grid">${charts(0, 'From Citadel')}${charts(1, 'To Citadel')}</div></section>
<p>Looking for one paint? <a href="/paints">Browse every brand</a>.</p>`;
  return page({ title, desc, path: '/guides', body, crumbs: [['Guides', '/guides']], ld: [webPage('/guides', title, desc, 'CollectionPage')] });
}

function notFound() {
  return page({
    title: 'Paint not found', desc: 'That paint page does not exist.', path: '/paints',
    crumbs: [['Paints', '/paints']],
    body: '<h1>Paint not found</h1><p>We could not find that paint. <a href="/paints">Browse all brands</a>.</p>',
  }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}

function sitemap(D) {
  const u = ['/', '/paints', '/guides', ...GUIDES.map(g => '/guides/' + g.slug), ...D.brands.map(b => '/paints/' + b.slug), ...D.brands.flatMap(b => b.paints.map(paintUrl))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    u.map(x => `<url><loc>${SITE}${esc(x)}</loc></url>`).join('\n') + '\n</urlset>\n';
}

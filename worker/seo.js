// Search-friendly paint pages: /paints (brands), /paints/<brand> (every paint in a brand, with a short guide to the brand),
// /paints/<brand>/<paint> (one paint and its closest matches in every other brand), /guides (conversion charts and
// technique guides built from the same data) and /sitemap.xml. Everyone, search engines included, gets the same page.
// They are rendered from the same data.js and app.js the colour wheel uses, read from the static assets,
// so new paints get a page as soon as they're added to data.js. Nothing here needs a build step.

const SITE = 'https://paintersdesk.com';
const BRAND_SLUG = { 'Citadel / Warhammer': 'citadel' };

let DATA = null;

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
  else if (p === '/guides') r = send(guidesPage(D));
  else if (p.startsWith('/guides/')) {
    const g = GUIDES.find(x => '/guides/' + x.slug === p);
    r = g ? send(g.conv ? convPage(D, g) : techPage(D, g)) : send(notFound(), 'text/html; charset=utf-8', 404);
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
  return new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'public, max-age=3600' } });
}

/* ---------- data (parsed once per Worker instance) ---------- */

async function load(env, url) {
  if (DATA) return DATA;
  const get = f => env.ASSETS.fetch(new Request(new URL(f, url.origin))).then(r => r.text());
  const [data, app] = await Promise.all([get('/data.js'), get('/app.js')]);
  DATA = parse(data, app);
  return DATA;
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
  return { P, MT, GL, brands, msrc, sgFix };
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
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
<style>
@font-face{font-family:'Archivo Black';src:url(/fonts/archivo-black.woff2) format('woff2');font-display:swap}
@font-face{font-family:Rubik;src:url(/fonts/rubik-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:Rubik;src:url(/fonts/rubik-700.woff2) format('woff2');font-weight:700;font-display:swap}
:root{--bg:#fff4de;--fg:#1b1b1b;--mut:#5c5444;--card:#fff;--ink:#1b1b1b}
@media (prefers-color-scheme:dark){:root{--bg:#1d1a15;--fg:#f6eedd;--mut:#c2b69e;--card:#2b2720;--ink:#e9dcc0}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 Rubik,system-ui,-apple-system,Segoe UI,sans-serif;padding:0 16px 24px}
body::before{content:"";display:block;height:12px;margin:0 -16px 14px;background:linear-gradient(90deg,#f2545b 0 16.66%,#ff9f1c 0 33.33%,#ffd23f 0 50%,#2ec4b6 0 66.66%,#3a86ff 0 83.33%,#8338ec 0)}
.wrap{max-width:960px;margin:auto}
a{color:inherit}
header{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}
header .logo{font:400 18px 'Archivo Black',sans-serif;text-decoration:none;display:flex;align-items:center;gap:8px}
header .logo img{width:32px;height:32px}
.btn{display:inline-block;font:700 15px Rubik,sans-serif;background:#ffd23f;color:#1b1b1b;border:3px solid var(--ink);border-radius:12px;padding:8px 14px;box-shadow:3px 3px 0 var(--ink);text-decoration:none}
nav.crumbs{font-size:14px;color:var(--mut);margin:14px 0 0}
h1{font:400 clamp(28px,5vw,44px)/1.1 'Archivo Black',sans-serif;margin:10px 0}
h2{font:400 22px/1.2 'Archivo Black',sans-serif;margin:0 0 8px}
p.s{color:var(--mut);font-size:14px;margin:0 0 12px}
.panel{background:var(--card);border:3px solid var(--ink);border-radius:18px;padding:16px;margin:16px 0;box-shadow:5px 5px 0 var(--ink)}
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
ul.list{columns:3 220px;padding-left:18px}ul.list li{break-inside:avoid}
footer{font-size:12px;color:var(--mut);margin-top:24px}
nav.top{display:flex;align-items:center;gap:14px;font-weight:700}
.prose p,p.prose{margin:0 0 12px;max-width:720px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:12px 0}
.stats div{border:2px solid var(--ink);border-radius:12px;padding:8px 10px}.stats b{display:block;font:400 22px 'Archivo Black',sans-serif}
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
</style></head>
<body><div class="wrap">
<header><a class="logo" href="/"><img src="/icons/icon-192.png" alt="" width="32" height="32">The Painters Desk</a><nav class="top"><a href="/paints">Paints</a><a href="/guides">Guides</a><a class="btn" href="/">Open the colour wheel</a></nav></header>
<nav class="crumbs">${crumbs.map(([n, u], k) => k === crumbs.length - 1 ? esc(n) : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>
${body}
<footer><p>© 2026 AK Tabletop Studio. Swatch colours are estimates and will differ from the real paints; cross-brand matches are close, never exact.
Chart-listed matches come from the Two Thin Coats Paint Comparison Chart 2024, the Army Painter Warpaints Fanatic conversion chart, the AK 3rd Generation Acrylics equivalence table (2021) and the Herrick Games hobby paint comparison chart; the rest are a nearest-colour calculation.
The Painters Desk is unofficial and not affiliated with or endorsed by any paint brand. Paint names are trademarks of their owners.
<a href="/paints">All brands</a> · <a href="/guides">Guides</a> · <a href="/privacy">Privacy policy</a> · <a href="/terms">Site rules</a></p></footer>
</div></body></html>`;
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
const conv = (a, b, an, bn) => ({ slug: `${a}-to-${b}`, conv: [a, b], title: `${an} to ${bn} conversion chart` });
const GUIDES = [
  conv('citadel', 'vallejo', 'Citadel', 'Vallejo'),
  conv('citadel', 'army-painter', 'Citadel', 'Army Painter'),
  conv('citadel', 'pro-acryl', 'Citadel', 'Pro Acryl'),
  conv('citadel', 'ak-interactive', 'Citadel', 'AK Interactive'),
  conv('citadel', 'scale75', 'Citadel', 'Scale75'),
  conv('vallejo', 'citadel', 'Vallejo', 'Citadel'),
  conv('army-painter', 'citadel', 'Army Painter', 'Citadel'),
  conv('pro-acryl', 'citadel', 'Pro Acryl', 'Citadel'),
  { slug: 'best-paints-for-nmm', q: 'nmm', title: 'Best paints for non-metallic metal (NMM)', short: 'NMM',
    intro: 'Non-metallic metal (NMM) paints metal with ordinary opaque colours instead of metallic paint: very dark shadows, a mid tone, and highlights that go almost to white, so the eye reads the contrast as shine. Gold leans brown in the shadows and toward ivory in the highlights; steel stays a cool grey.',
    how: 'Work from the darkest step up. Keep each band narrower than the one before, and finish with tiny glints where the light hits hardest.' },
  { slug: 'best-paints-for-skin-tones', q: 'skin', title: 'Best paints for skin tones', short: 'Skin',
    intro: 'A skin ramp takes a skin colour down into warm, slightly red shadows and up toward a paler, more yellow highlight. Below are ramps for pale, mid and dark skin.',
    how: 'Basecoat the skin, shade the creases (eye sockets, under the nose and chin, between fingers), then highlight the brow, cheekbones, nose and knuckles, smaller with each step.' },
  { slug: 'best-paints-for-osl', q: 'osl', title: 'Best paints for object source lighting (OSL)', short: 'OSL',
    intro: 'Object source lighting (OSL) paints the glow a light source casts on the model around it. The ramp runs from a dull, unlit surface through a saturated glow to an almost white hot core.',
    how: 'Paint the area around the light dark first, then build the glow outward from the source in thin layers, keeping the brightest steps small and close to the source.' },
  { slug: 'best-paints-for-gems', q: 'gem', title: 'Best paints for gems and lenses', short: 'Gems',
    intro: 'Gems and lenses are painted back to front: dark on the side nearest the light, bright on the far side where light comes through, with a white glint opposite the bright reflection.',
    how: 'Fill the gem with the deepest shadow, blend up in crescents toward the far side, then add the reflected light and a single sharp glint.' },
];

const brandBy = (D, s) => D.brands.find(b => b.slug === s);
const article = (path, title, desc) => webPage(path, title, desc, 'Article', {
  headline: title, image: OG_IMAGE, datePublished: GUIDE_DATE, dateModified: GUIDE_DATE,
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
const lchOf = lab => [lab[0], Math.hypot(lab[1], lab[2]), (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360];
const lab3 = (L, C, h) => [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)];
const hdS = (a, b) => (b - a + 540) % 360 - 180;
function rampOf(lab, o) {
  const [L0, C0, h0] = lchOf(lab), out = [];
  o.dk.forEach((r, k) => { const t = k / o.dk.length; out.push({ r, t: lab3(o.Ld + (L0 - o.Ld) * t, o.sC(C0, t), o.sH(h0, t)) }) });
  out.push({ r: o.baseName || 'Base', t: lab });
  o.lt.forEach((r, k) => { const t = (k + 1) / (o.lt.length + 1); out.push({ r, t: lab3(L0 + (o.Lt - L0) * t, o.lC(C0, t), o.lH(h0, t)) }) });
  out.push({ r: o.top, t: lab3(o.topL, o.topC(C0), o.topH ? o.topH(h0) : o.lH(h0, 1)) });
  return out;
}
const DK = ['Deep shadow', 'Shadow', 'Dark mid'];
const TECH = {
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

function techPage(D, g) {
  const bases = D.sgFix.filter(b => b.q === g.q);
  const brands = D.brands.map(br => ({ br, pool: br.paints.filter(p => p.ramp) })).filter(x => x.pool.length >= 40);
  const grade = d => d < 6 ? 'close' : d < 12 ? 'fair' : 'loose';
  const sections = bases.map(b => {
    const T = TECH[g.q](b.lab);
    const res = brands.map(x => ({ ...x, R: fit(T, x.pool) })).map(x => ({ ...x, avg: x.R.reduce((a, s) => a + s.d, 0) / x.R.length }));
    const top = [...res].sort((a, b) => a.avg - b.avg)[0];
    return `<section class="panel"><h2>${esc(b.n)}</h2>
<p class="s">Target ramp (darkest to lightest):</p><div class="chip">${T.map(x => `<i style="background:${labHex(x.t)}" title="${esc(x.r)}"></i>`).join('')}</div>
<p>Closest fit overall: <b>${esc(top.br.name)}</b> (average ΔE ${top.avg.toFixed(1)} per step).</p>
<div class="grid">${res.map(x => `<div class="br"><h3><a href="/paints/${x.br.slug}">${esc(x.br.name)}</a></h3><div class="chip">${x.R.map(s => `<i style="background:${s.p ? s.p.h : 'transparent'}"></i>`).join('')}</div><ol class="ramp">${x.R.map(s => s.p ? `<li><i class="sw" style="background:${s.p.h}"></i><span><a href="${s.p.url}">${esc(label(s.p))}</a><em>${esc(s.r)} · ${esc(D.GL[s.p.g])} · ΔE ${s.d.toFixed(0)}, ${grade(s.d)}</em></span></li>` : '').join('')}</ol></div>`).join('')}</div></section>`;
  });
  const path = '/guides/' + g.slug, title = g.title;
  const desc = `${g.title}: seven-step ${bases.map(b => b.n.toLowerCase()).join(', ')} ramps picked from ${brands.map(x => short(x.br)).join(', ')} paints. Swatch colours are estimates.`;
  const body = `<h1>${esc(title)}</h1>
<div class="prose"><p>${esc(g.intro)}</p>
<p>${esc(g.how)}</p>
<p>Each ramp below is built the way the Ramps mode on <a href="/">the colour wheel</a> builds one: we set a target colour for each step, then pick the nearest opaque paint in each brand (no metallics, washes or contrast paints, and no paint used twice). ΔE says how far each paint is from its target: close is under 6, fair under 12. Swatch colours are estimates, so test the ramp on a spare model first.
On the wheel you can build the same ramp from any paint, or only from the paints you own.</p></div>
${sections.join('')}
${guideLinks(g)}`;
  return page({ title, desc, path, body, og: 'article', crumbs: [['Guides', '/guides'], [title, path]], ld: [article(path, title, desc)] });
}

// Exported for tools/check_seo.mjs: builds every guide page and the brand guides, returns how many guides there are.
export function renderGuides(D) {
  GUIDES.forEach(g => {
    const html = g.conv ? convPage(D, g) : techPage(D, g);
    if (!html.includes('<table') && !html.includes('class="ramp"')) throw new Error('Empty guide: ' + g.slug);
    if (g.conv && g.conv.some(s => !brandBy(D, s))) throw new Error('Unknown brand in ' + g.slug);
  });
  D.brands.forEach(b => brandPage(D, b));
  return GUIDES.length;
}

function guideLinks(cur) {
  const li = g => `<li><a href="/guides/${g.slug}">${esc(g.title)}</a></li>`;
  return `<section class="panel"><h2>More guides</h2><ul class="m">${GUIDES.filter(g => g !== cur).map(li).join('')}</ul></section>`;
}

function guidesPage(D) {
  const n = D.brands.reduce((a, b) => a + b.paints.length, 0);
  const title = 'Miniature paint conversion charts and paint guides';
  const desc = 'Citadel to Vallejo, Army Painter, Pro Acryl, AK and Scale75 conversion charts, and the best paints for NMM, skin, OSL and gems, built from ' + n + ' paints. Swatch colours are estimates.';
  const li = g => `<li><a href="/guides/${g.slug}">${esc(g.title)}</a></li>`;
  const body = `<h1>Paint guides</h1>
<p class="prose">Conversion charts and paint lists built from the ${n} paints on The Painters Desk. Everything here comes from the same swatch estimates and conversion charts as the colour wheel, so treat matches as close, never exact.</p>
<div class="grid"><section class="panel"><h2>Conversion charts</h2><ul class="m">${GUIDES.filter(g => g.conv).map(li).join('')}</ul></section>
<section class="panel"><h2>Best paints for…</h2><ul class="m">${GUIDES.filter(g => !g.conv).map(li).join('')}</ul></section></div>
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

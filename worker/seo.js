// Search-friendly paint pages: /paints (brands), /paints/<brand> (every paint in a brand), /paints/<brand>/<paint>
// (one paint and its closest matches in every other brand) and /sitemap.xml.
// They are rendered from the same data.js and app.js the colour wheel uses, read from the static assets,
// so new paints get a page as soon as they're added to data.js. Nothing here needs a build step.

const SITE = 'https://paintersdesk.com';
const BRAND_SLUG = { 'Citadel / Warhammer': 'citadel' };

let DATA = null;

export function isSeoPath(p) {
  return p === '/sitemap.xml' || p === '/paints' || p.startsWith('/paints/');
}

export async function seo(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const D = await load(env, url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  let r;
  if (p === '/sitemap.xml') r = send(sitemap(D), 'application/xml; charset=utf-8');
  else if (p === '/paints') r = send(indexPage(D));
  else {
    const [, b, s, extra] = p.split('/').slice(1);
    const br = D.brands.find(x => x.slug === b);
    const paint = br && s && br.bySlug.get(s);
    if (br && !s) r = send(brandPage(D, br));
    else if (paint && !extra) r = send(paintPage(D, paint));
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
  const brOf = {};
  brands.forEach((b, bi) => { b.slug = BRAND_SLUG[b.name] || slug(b.name); b.groups.forEach(g => brOf[g] = bi) });

  const P = [];
  let g = 'M';
  raw.split('\n').forEach(l => {
    if (!l) return;
    if (l[0] === '#') { g = l[1]; return }
    const [n, c, h] = l.split('|');
    P.push({ n, c, h, g, i: P.length, lab: hexLab(h), b: brOf[g] });
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
  return { P, MT, GL, brands, msrc };
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

function page({ title, desc, path, crumbs, body }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([n, u], k) => ({ '@type': 'ListItem', position: k + 1, name: n, item: SITE + u })),
  };
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="The Painters Desk">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:image" content="${SITE}/icons/icon-512.png">
<link rel="icon" type="image/png" href="/icons/favicon-32.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#fff4de">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
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
ul.list{columns:3 220px;padding-left:18px}ul.list li{break-inside:avoid}
footer{font-size:12px;color:var(--mut);margin-top:24px}
</style></head>
<body><div class="wrap">
<header><a class="logo" href="/"><img src="/icons/icon-192.png" alt="" width="32" height="32">The Painters Desk</a><a class="btn" href="/">Open the colour wheel</a></header>
<nav class="crumbs">${crumbs.map(([n, u], k) => k === crumbs.length - 1 ? esc(n) : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>
${body}
<footer><p>© 2026 AK Tabletop Studio. Swatch colours are estimates and will differ from the real paints; cross-brand matches are close, never exact.
Chart-listed matches come from the Two Thin Coats Paint Comparison Chart 2024, the Army Painter Warpaints Fanatic conversion chart, the AK 3rd Generation Acrylics equivalence table (2021) and the Herrick Games hobby paint comparison chart; the rest are a nearest-colour calculation.
The Painters Desk is unofficial and not affiliated with or endorsed by any paint brand. Paint names are trademarks of their owners.
<a href="/paints">All brands</a> · <a href="/privacy">Privacy policy</a> · <a href="/terms">Site rules</a></p></footer>
</div></body></html>`;
}

function paintPage(D, p) {
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
<div class="grid">${md.map(o => `<section class="panel br"><h2>${esc(o.br.name)}</h2><ul class="m">${o.ch.map(m => item(m, 1)).join('')}${o.near.map(m => item(m, 0)).join('')}</ul></section>`).join('')}</div>`;
  return page({
    title, desc, path: paintUrl(p), body,
    crumbs: [['Paints', '/paints'], [br.name, '/paints/' + br.slug], [p.n, paintUrl(p)]],
  });
}

function brandPage(D, br) {
  const groups = br.groups.map(g => ({ g, ps: br.paints.filter(p => p.g === g) })).filter(x => x.ps.length);
  const body = `<h1>${esc(br.name)} paint equivalents</h1>
<p>Every ${esc(br.name)} paint on The Painters Desk (${br.paints.length} in all). Pick one to see its closest matches in the other brands. Swatch colours are estimates.</p>
${groups.map(x => `<section class="panel"><h2>${esc(D.GL[x.g])}</h2><ul class="list">${x.ps.map(p => `<li><a href="${paintUrl(p)}">${esc(label(p))}</a></li>`).join('')}</ul></section>`).join('')}`;
  return page({
    title: `${br.name} paint equivalents and conversion chart`,
    desc: `Find the closest ${D.brands.filter(b => b !== br).slice(0, 4).map(b => b.name.replace(' / Warhammer', '')).join(', ')} and other matches for all ${br.paints.length} ${br.name} paints. Swatch colours are estimates.`,
    path: '/paints/' + br.slug, body,
    crumbs: [['Paints', '/paints'], [br.name, '/paints/' + br.slug]],
  });
}

function indexPage(D) {
  const n = D.brands.reduce((a, b) => a + b.paints.length, 0);
  const body = `<h1>Miniature paint equivalents</h1>
<p>Find the closest match for any of ${n} miniature paints across ${D.brands.length} brands: Citadel, Vallejo, Army Painter, Pro Acryl, AK Interactive, Scale75 and more.
Each paint page lists the conversion-chart equivalents and the nearest swatch colours in every other brand. Swatch colours are estimates.</p>
<div class="grid">${D.brands.map(b => `<a class="panel" style="text-decoration:none" href="/paints/${b.slug}"><h2>${esc(b.name)}</h2><p class="s">${b.paints.length} paints</p></a>`).join('')}</div>`;
  return page({
    title: 'Miniature paint equivalents and conversion charts by brand',
    desc: `Closest equivalents for ${n} miniature paints across Citadel, Vallejo, Army Painter, Pro Acryl, AK Interactive, Scale75 and more. Swatch colours are estimates.`,
    path: '/paints', body, crumbs: [['Paints', '/paints']],
  });
}

function notFound() {
  return page({
    title: 'Paint not found', desc: 'That paint page does not exist.', path: '/paints',
    crumbs: [['Paints', '/paints']],
    body: '<h1>Paint not found</h1><p>We could not find that paint. <a href="/paints">Browse all brands</a>.</p>',
  }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}

function sitemap(D) {
  const u = ['/', '/paints', ...D.brands.map(b => '/paints/' + b.slug), ...D.brands.flatMap(b => b.paints.map(paintUrl))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    u.map(x => `<url><loc>${SITE}${esc(x)}</loc></url>`).join('\n') + '\n</urlset>\n';
}

// Share links for recipes, tutorials and palettes: /r/<id>.
// The app's own address (/#/recipe/<id>) is the same page to every link preview, because the part after # never reaches
// the server. /r/<id> is rendered here with the item's own title, description and picture (/r/<id>/card.png, a swatch
// strip with the title), then sends people straight into the app. Only public items by accounts that aren't blocked get
// their own preview: anything else gets the site's plain preview, so a private title never shows up in a link.

import { load, page, esc } from './seo.js';
import { cardPNG, cardResponse } from './card.js';

const SITE = 'https://paintersdesk.com';
const KIND = { recipe: 'Recipe', tutorial: 'Tutorial', palette: 'Palette', challenge: 'Palette challenge' };

export const isSharePath = p => p === '/r' || p.startsWith('/r/');

export async function share(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const m = url.pathname.match(/^\/r\/([\w-]{1,64})(\/card\.png)?\/?$/);
  if (!m) return Response.redirect(url.origin + '/#/recipes', 302);
  const [, id, png] = m;
  const D = await load(env, url);
  const r = await env.DB.prepare(
    `SELECT r.id, r.kind, r.title, r.summary, r.paints, r.steps, r.cover, r.updated_at, u.name AS author,
       (r.cover != '' AND NOT EXISTS (SELECT 1 FROM images i WHERE i.id = r.cover AND i.hidden = 1)) AS cover_ok
     FROM recipes r JOIN users u ON u.id = r.user_id
     WHERE r.id = ? AND r.visibility = 'public' AND u.blocked = 0`
  ).bind(id).first();
  if (png) {
    if (!r) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
    return cardResponse(request, () => cardPNG(cardOf(D, r)), url.searchParams.get('v') === ver(r));
  }
  const res = new Response(r ? sharePage(D, r) : hiddenPage(id), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' },
  });
  return request.method === 'HEAD' ? new Response(null, res) : res;
}

// A version for the picture's address, so link previews fetch a new one after an edit.
const ver = r => String(r.updated_at || 0);

// The colours on the card: one per layer (a mixed layer shows its rough mix) for recipes and palettes, else the paints used.
export function coloursOf(D, r) {
  const hex = new Map(D.P.map(p => [p.g + '|' + p.c + '|' + p.n, p.h]));
  let steps = [], paints = [];
  try { steps = JSON.parse(r.steps || '[]') } catch (e) {}
  try { paints = JSON.parse(r.paints || '[]') } catch (e) {}
  const layer = s => {
    const ps = (s.mix || []).filter(x => x.k !== 'water' && hex.has(x.k));
    return ps.length > 1 ? mixHex(ps.map(x => [hex.get(x.k), +x.parts || 1])) : ps.length ? hex.get(ps[0].k) : null;
  };
  const fromSteps = r.kind !== 'tutorial' ? steps.map(layer).filter(Boolean) : [];
  const out = fromSteps.length ? fromSteps : paints.filter(k => k !== 'water').map(k => hex.get(k)).filter(Boolean);
  return { colours: out.slice(0, 24), steps, paints: paints.filter(k => k !== 'water' && hex.has(k)) };
}

// Same rough mix as mixColour() in account.js: parts-weighted average in linear light.
function mixHex(ps) {
  const lin = v => { v /= 255; return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92 };
  const gam = v => Math.round(255 * (v > .0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - .055 : 12.92 * v));
  const W = ps.reduce((a, [, w]) => a + w, 0), c = [0, 0, 0];
  ps.forEach(([h, w]) => [1, 3, 5].forEach((o, i) => c[i] += lin(parseInt(h.slice(o, o + 2), 16)) * w / W));
  return '#' + c.map(v => Math.max(0, Math.min(255, gam(v))).toString(16).padStart(2, '0')).join('');
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function noteOf(r, c) {
  const n = c.steps.length, p = c.paints.length;
  if (r.kind === 'palette') return plural(c.colours.length, 'colour');
  if (r.kind === 'challenge') return plural(c.colours.length, 'paint') + ' palette';
  if (r.kind === 'recipe') return [n && plural(n, 'layer'), p && plural(p, 'paint')].filter(Boolean).join(' · ');
  return [n && plural(n, 'step'), p && plural(p, 'paint')].filter(Boolean).join(' · ');
}

function cardOf(D, r) {
  const c = coloursOf(D, r);
  return { kind: KIND[r.kind] || 'Recipe', title: r.title, author: r.author, colours: c.colours, note: noteOf(r, c) };
}

// Paint names for the description: "Citadel Sotek Green, Vallejo Turquoise and 3 more".
function paintList(D, keys) {
  const by = new Map(D.P.map(p => [p.g + '|' + p.c + '|' + p.n, p]));
  const names = keys.map(k => by.get(k)).filter(Boolean).map(p => p.n);
  const u = [...new Set(names)];
  if (!u.length) return '';
  return u.length <= 4 ? u.slice(0, -1).join(', ') + (u.length > 1 ? ' and ' : '') + u[u.length - 1] : u.slice(0, 3).join(', ') + ` and ${u.length - 3} more`;
}

const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t };

function sharePage(D, r) {
  const K = KIND[r.kind] || 'Recipe', c = coloursOf(D, r), path = '/r/' + r.id, app = '/#/recipe/' + encodeURIComponent(r.id);
  const list = paintList(D, c.paints);
  const what = { recipe: 'A miniature painting recipe', tutorial: 'A miniature painting tutorial', palette: 'A miniature colour palette', challenge: 'A random palette challenge model' }[r.kind] || 'A miniature painting recipe';
  const desc = clip(r.summary, 200) || `${what} by ${r.author} on The Painters Desk${list ? `, using ${list}` : ''}.`;
  const title = `${clip(r.title, 90)}: ${K.toLowerCase()} by ${clip(r.author, 40)}`;
  // A tutorial or challenge with a photo of the finished model shows the photo; everything else shows its swatch card.
  const photo = (r.kind === 'tutorial' || r.kind === 'challenge') && r.cover_ok;
  const img = photo ? `${SITE}/api/images/${encodeURIComponent(r.cover)}` : `${SITE}${path}/card.png?v=${encodeURIComponent(ver(r))}`;
  const strip = c.colours.length ? `<div class="shs" aria-hidden="true">${c.colours.map(h => `<i style="background:${h}"></i>`).join('')}</div>` : '';
  const body = `<h1>${esc(r.title)}</h1>
<p class="s"><b>${K}</b> by ${esc(r.author)}${noteOf(r, c) ? ' · ' + esc(noteOf(r, c)) : ''}</p>
${strip}
${r.summary ? `<div class="prose"><p>${esc(clip(r.summary, 400))}</p></div>` : ''}
<p><a class="btn pri" id="go" href="${app}">Open it in The Painters Desk</a></p>
<style>.shs{display:flex;height:90px;border:3px solid var(--line);margin:16px 0;max-width:720px}.shs i{flex:1}</style>
<script>location.replace(${JSON.stringify(app)})</script>`;
  return page({
    title, desc, path, body, og: 'article', crumbs: [['Tutorials & Community', '/#/recipes'], [clip(r.title, 60), path]],
    img, imgAlt: photo ? r.title : `${K} colours: ${r.title}`, imgSize: photo ? null : [1200, 630],
  }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}

// Private, deleted or never there: the site's own preview with nothing about the item, then on into the app,
// where the owner of a private item can still see it.
function hiddenPage(id) {
  const app = '/#/recipe/' + encodeURIComponent(id);
  return page({
    title: 'The Painters Desk', desc: 'Miniature paint colour wheel, cross-brand matches, recipes and tutorials.', path: '/r/' + id,
    crumbs: [['Tutorials & Community', '/#/recipes']],
    body: `<h1>Shared on The Painters Desk</h1><p>This isn’t shared publicly, or it has been removed.</p><p><a class="btn pri" href="${app}">Open The Painters Desk</a></p><script>location.replace(${JSON.stringify(app)})</script>`,
  }).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"');
}

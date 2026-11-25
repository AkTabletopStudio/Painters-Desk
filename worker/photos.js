// Community photos of a paint in use, for the paint pages (/paints/<brand>/<paint>), the image sitemap and the app.
//
// A photo counts for a paint when a public post that uses the paint has it:
//  - a tutorial step photo whose step mixes that paint (the best match: it shows the paint going on),
//  - otherwise the post's main photo (Showcase models, challenge finished photos, tutorial covers, palettes with a photo).
// Left out: private posts, blocked painters, posts with an open report, and photos an admin hid.
//
// Photos load from /photos/<id> (the full photo) and /photos/<id>/s (a small copy, 480px wide, for grids). Unlike
// /api/images, robots.txt lets search engines fetch these, and only photos used in a public post are served here.

const IMAGE_ID = /^[0-9a-f-]{36}$/;
const THUMB_W = 480;
const PER_POST = 2;

const esc = s => String(s).replace(/[\\%_]/g, c => '\\' + c);
const stepsOf = r => { try { return JSON.parse(r.steps || '[]'); } catch { return []; } };

// The photos one post shows for one paint key (at most PER_POST).
function pick(r, key) {
  const steps = stepsOf(r);
  let out = r.kind === 'tutorial' ? steps.filter(s => s.image && (s.mix || []).some(m => m.k === key)).map(s => ({ img: s.image, step: s.title || '' })) : [];
  // Later steps are nearer the finished model, so keep the last ones.
  if (out.length) return out.slice(-PER_POST);
  const c = r.cover || [...steps].reverse().find(s => s.image)?.image;
  return c ? [{ img: c, step: '' }] : [];
}

const POSTS = `SELECT r.id, r.kind, r.title, r.cover, r.steps, r.paints, r.user_id, r.created_at, u.name AS author,
    (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS votes
  FROM recipes r JOIN users u ON u.id = r.user_id
  WHERE r.visibility = 'public' AND u.blocked = 0 AND r.kind != 'recipe'
    AND NOT EXISTS (SELECT 1 FROM reports x WHERE x.kind = 'recipe' AND x.target_id = r.id AND x.status = 'open')`;

async function shown(env, ids) {
  ids = [...new Set(ids)].filter(i => IMAGE_ID.test(i));
  const ok = new Set();
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const rows = (await env.DB.prepare(`SELECT id FROM images WHERE hidden = 0 AND id IN (${part.map(() => '?').join(',')})`).bind(...part).all()).results;
    rows.forEach(x => ok.add(x.id));
  }
  return ok;
}

// Up to `limit` photos for one paint key ("<range>|<code>|<name>"), most upvoted posts first, then newest.
// Returns null when the database can't be read, so pages can leave the section out.
export async function paintPhotos(env, key, limit = 12) {
  try {
    if (!env.DB || typeof key !== 'string' || !key || key.length > 120) return [];
    const rows = (await env.DB.prepare(`${POSTS} AND r.paints LIKE ? ESCAPE '\\' ORDER BY votes DESC, r.created_at DESC LIMIT 60`)
      .bind(`%${esc(JSON.stringify(key))}%`).all()).results;
    const all = rows.flatMap(r => pick(r, key).map(x => ({ ...x, r })));
    const ok = await shown(env, all.map(x => x.img));
    const seen = new Set();
    return all.filter(x => ok.has(x.img) && !seen.has(x.img) && seen.add(x.img)).slice(0, limit).map(({ img, step, r }) => ({
      img, step, post: r.id, kind: r.kind, title: r.title, author: r.author || 'a painter', author_id: r.user_id, votes: r.votes,
    }));
  } catch (e) {
    console.error('paintPhotos', e);
    return null;
  }
}

// Every paint's photos at once (for the image sitemap): Map of paint key -> up to `per` photo ids.
export async function allPaintPhotos(env, per = 5) {
  const out = new Map();
  try {
    if (!env.DB) return out;
    const rows = (await env.DB.prepare(`${POSTS} ORDER BY votes DESC, r.created_at DESC LIMIT 2000`).all()).results;
    const want = [];
    for (const r of rows) {
      let keys; try { keys = JSON.parse(r.paints || '[]'); } catch { keys = []; }
      for (const k of keys) {
        const a = out.get(k) || [];
        if (a.length >= per) continue;
        for (const x of pick(r, k)) if (a.length < per && !a.some(y => y.img === x.img)) { a.push({ img: x.img, title: r.title }); want.push(x.img); }
        out.set(k, a);
      }
    }
    const ok = await shown(env, want);
    for (const [k, a] of out) { const b = a.filter(x => ok.has(x.img)); if (b.length) out.set(k, b); else out.delete(k); }
  } catch (e) { console.error('allPaintPhotos', e); }
  return out;
}

export const isPhotoPath = p => /^\/photos\/[0-9a-f-]{36}(\/s)?$/.test(p);

// GET /photos/<id> and /photos/<id>/s. The small copy is made once with the Images binding (PHOTOS) and kept in R2
// as thumb/<id>; if the binding isn't there or the resize fails, the full photo is sent instead.
export async function servePhoto(request, env, url) {
  const nf = () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const [, , id, small] = url.pathname.split('/');
  if (!env.IMAGES || !IMAGE_ID.test(id)) return nf();
  const row = await env.DB.prepare('SELECT hidden FROM images WHERE id = ?').bind(id).first();
  if (!row || row.hidden) return nf();
  // Only photos in a public post by a painter who isn't blocked.
  const pub = await env.DB.prepare(`SELECT 1 FROM recipes r JOIN users u ON u.id = r.user_id
    WHERE r.visibility = 'public' AND u.blocked = 0 AND (r.cover = ? OR r.steps LIKE ?) LIMIT 1`).bind(id, `%"${id}"%`).first();
  if (!pub) return nf();
  const headers = obj => ({
    'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
    // Browsers keep a copy but check back, so a photo that gets hidden or deleted stops showing.
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ETag: obj.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  });
  const send = obj => {
    const h = headers(obj);
    if (!('body' in obj) || request.method === 'HEAD') return new Response(null, { status: 'body' in obj ? 200 : 304, headers: h });
    return new Response(obj.body, { headers: h });
  };
  if (small) {
    const t = await env.IMAGES.get(`thumb/${id}`, { onlyIf: request.headers });
    if (t) return send(t);
    if (env.PHOTOS) {
      try {
        const src = await env.IMAGES.get(`img/${id}`);
        if (!src) return nf();
        const out = await env.PHOTOS.input(src.body).transform({ width: THUMB_W, fit: 'scale-down' }).output({ format: 'image/webp', quality: 80 });
        const bytes = await out.response().arrayBuffer();
        await env.IMAGES.put(`thumb/${id}`, bytes, { httpMetadata: { contentType: 'image/webp' } });
        const again = await env.IMAGES.get(`thumb/${id}`);
        if (again) return send(again);
      } catch (e) { console.error('thumbnail', id, e); }
    }
  }
  const obj = await env.IMAGES.get(`img/${id}`, { onlyIf: request.headers });
  return obj ? send(obj) : nf();
}

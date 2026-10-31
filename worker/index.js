// The Painters Desk API: accounts (OAuth sign-in), paint collections, recipes/tutorials and comments.
// Static files are served from the assets binding; only /api/* and the paint pages and guides (/paints, /guides, /sitemap.xml, see seo.js) run through this Worker.
import { isSeoPath, seo } from './seo.js';

const SESSION_COOKIE = 'pd_session';
const OAUTH_COOKIE = 'pd_oauth';
const SESSION_DAYS = 30;

// OAuth providers. A provider shows on the sign-in screen only when its client ID and secret are set.
const PROVIDERS = {
  google: {
    label: 'Google',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    extra: { prompt: 'select_account' },
    id: env => env.GOOGLE_CLIENT_ID, secret: env => env.GOOGLE_CLIENT_SECRET,
    async profile(token) {
      const u = await getJSON('https://openidconnect.googleapis.com/v1/userinfo', token);
      return { id: u.sub, name: u.name || u.email, email: u.email_verified ? u.email : null, avatar: u.picture || null };
    },
  },
  discord: {
    label: 'Discord',
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
    id: env => env.DISCORD_CLIENT_ID, secret: env => env.DISCORD_CLIENT_SECRET,
    async profile(token) {
      const u = await getJSON('https://discord.com/api/users/@me', token);
      return {
        id: u.id, name: u.global_name || u.username, email: u.verified ? u.email : null,
        avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
      };
    },
  },
  github: {
    label: 'GitHub',
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    id: env => env.GITHUB_CLIENT_ID, secret: env => env.GITHUB_CLIENT_SECRET,
    async profile(token) {
      const u = await getJSON('https://api.github.com/user', token);
      const emails = await getJSON('https://api.github.com/user/emails', token).catch(() => []);
      const primary = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
      return { id: String(u.id), name: u.name || u.login, email: primary ? primary.email : null, avatar: u.avatar_url || null };
    },
  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // One address for the whole site, so sign-in redirect URLs and the session cookie always match.
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      // Browsers that saved the site offline on www keep serving their cached copy and never see the redirect,
      // and they refuse a redirected service worker update. Give them a worker that clears that copy and
      // sends open tabs to the bare domain.
      if (url.pathname === '/sw.js') return new Response(wwwRetireWorker(url.origin), {
        headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' },
      });
      return Response.redirect(url.toString(), 301);
    }
    if (isSeoPath(url.pathname)) {
      const r = await seo(request, env, url);
      if (r.status === 200 && request.method === 'GET' && url.pathname !== '/sitemap.xml') ctx?.waitUntil(countVisit(request, env, url.pathname, request.headers.get('Referer'), url));
      return r;
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      // Writes must come from this site's own pages (blocks cross-site form posts using the session cookie).
      // The unsubscribe link is the exception: mail apps post to it directly, and its token is the proof.
      if (request.method !== 'GET' && request.method !== 'HEAD' && url.pathname !== '/api/unsubscribe') {
        const origin = request.headers.get('Origin');
        if (origin !== url.origin) return json({ error: 'Bad origin' }, 403);
      }
      return await route(request, env, url);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Server error' }, 500);
    }
  },
};

async function route(request, env, url) {
  const m = request.method, p = url.pathname;
  let r;
  if (p === '/api/me' && m === 'GET') return me(request, env);
  if (p === '/api/me' && m === 'DELETE') return deleteAccount(request, env);
  if (p === '/api/me/profile' && m === 'PUT') return saveProfile(request, env);
  if (p === '/api/me/password' && m === 'PUT') return setPassword(request, env);
  if ((r = p.match(/^\/api\/users\/([\w-]+)$/)) && m === 'GET') return getProfile(request, env, r[1]);
  if (p === '/api/painters' && m === 'GET') return listPainters(request, env, url);
  if (p === '/api/people' && m === 'GET') return listPeople(request, env, url);
  if (p === '/api/me/findable' && m === 'PUT') return setFindable(request, env);
  if ((r = p.match(/^\/api\/follows\/([\w-]+)$/)) && m === 'PUT') return setFollow(request, env, r[1]);
  if ((r = p.match(/^\/api\/painters\/([\w-]+)\/message$/)) && m === 'POST') return messagePainter(request, env, url, r[1]);
  if (p === '/api/me/commission' && m === 'GET') return getCommission(request, env);
  if (p === '/api/me/commission' && m === 'PUT') return saveCommission(request, env);
  if (p === '/api/auth/register' && m === 'POST') return register(request, env, url);
  if (p === '/api/auth/password' && m === 'POST') return passwordLogin(request, env, url);
  if (p === '/api/auth/forgot' && m === 'POST') return forgotPassword(request, env, url);
  if (p === '/api/auth/reset' && m === 'POST') return resetPassword(request, env, url);
  if (p === '/api/auth/verify' && m === 'GET') return verifyEmail(env, url);
  if (p === '/api/me/verify-email' && m === 'POST') return resendVerify(request, env, url);
  if ((r = p.match(/^\/api\/auth\/login\/(\w+)$/)) && m === 'GET') return oauthStart(request, env, url, r[1]);
  if ((r = p.match(/^\/api\/auth\/callback\/(\w+)$/)) && m === 'GET') return oauthCallback(request, env, url, r[1]);
  if (p === '/api/auth/dev' && m === 'GET') return devLogin(request, env, url);
  if (p === '/api/auth/logout' && m === 'POST') return logout(request, env, url);
  if (p === '/api/me/wheel' && m === 'GET') return getWheel(request, env);
  if (p === '/api/me/wheel' && m === 'PUT') return putWheel(request, env);
  if (p === '/api/collection' && m === 'GET') return getCollection(request, env);
  if (p === '/api/collection' && m === 'PUT') return putCollection(request, env);
  if (p === '/api/recipes' && m === 'GET') return listRecipes(request, env, url);
  if (p === '/api/recipes' && m === 'POST') return saveRecipe(request, env, null);
  if ((r = p.match(/^\/api\/recipes\/([\w-]+)$/))) {
    if (m === 'GET') return getRecipe(request, env, r[1]);
    if (m === 'PUT') return saveRecipe(request, env, r[1]);
    if (m === 'DELETE') return deleteRecipe(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/recipes\/([\w-]+)\/comments$/)) && m === 'POST') return addComment(request, env, r[1]);
  if ((r = p.match(/^\/api\/recipes\/([\w-]+)\/view$/)) && m === 'POST') return addView(request, env, r[1]);
  if ((r = p.match(/^\/api\/recipes\/([\w-]+)\/vote$/)) && m === 'PUT') return setVote(request, env, r[1]);
  if ((r = p.match(/^\/api\/recipes\/([\w-]+)\/save$/)) && m === 'PUT') return setSave(request, env, r[1]);
  if ((r = p.match(/^\/api\/comments\/([\w-]+)$/)) && m === 'DELETE') return deleteComment(request, env, r[1]);
  if (p === '/api/feedback' && m === 'POST') return sendFeedback(request, env, url);
  if (p === '/api/inbox' && m === 'GET') return inbox(request, env, url);
  if (p === '/api/inbox/unread' && m === 'GET') return unreadCount(request, env);
  if (p === '/api/inbox/claim' && m === 'POST') return claimInbox(request, env);
  if ((r = p.match(/^\/api\/conversations\/with\/([\w-]+)$/))) {
    if (m === 'GET') return conversationWith(request, env, r[1]);
    if (m === 'POST') return messageUser(request, env, url, r[1]);
  }
  if ((r = p.match(/^\/api\/conversations\/([\w-]+)$/))) {
    if (m === 'GET') return getConversation(request, env, r[1]);
    if (m === 'POST') return replyConversation(request, env, url, r[1]);
    if (m === 'PUT') return updateConversation(request, env, r[1]);
  }
  if (p === '/api/blocks' && m === 'GET') return listBlocks(request, env);
  if ((r = p.match(/^\/api\/blocks\/([\w-]+)$/)) && m === 'PUT') return setBlock(request, env, r[1]);
  if (p === '/api/me/messages' && m === 'PUT') return setMessagePrefs(request, env);
  if (p === '/api/forum' && m === 'GET') return forumHome(request, env);
  if (p === '/api/forum/threads' && m === 'GET') return listThreads(request, env, url);
  if (p === '/api/forum/threads' && m === 'POST') return createThread(request, env);
  if (p === '/api/forum/search' && m === 'GET') return searchForum(request, env, url);
  if (p === '/api/forum/updates' && m === 'GET') return forumUpdates(request, env);
  if (p === '/api/forum/updates' && m === 'POST') return readForumUpdates(request, env);
  if (p === '/api/me/forum' && m === 'PUT') return setForumPrefs(request, env);
  if ((r = p.match(/^\/api\/forum\/threads\/([\w-]+)$/))) {
    if (m === 'GET') return getThread(request, env, r[1]);
    if (m === 'PUT') return updateThread(request, env, r[1]);
    if (m === 'DELETE') return deleteThread(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/forum\/threads\/([\w-]+)\/posts$/)) && m === 'POST') return addPost(request, env, url, r[1]);
  if ((r = p.match(/^\/api\/forum\/threads\/([\w-]+)\/follow$/)) && m === 'PUT') return followThread(request, env, r[1]);
  if ((r = p.match(/^\/api\/forum\/posts\/([\w-]+)$/))) {
    if (m === 'PUT') return updatePost(request, env, r[1]);
    if (m === 'DELETE') return deletePost(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/forum\/posts\/([\w-]+)\/vote$/)) && m === 'PUT') return votePost(request, env, r[1]);
  if (p === '/api/forum/categories' && m === 'POST') return addCategory(request, env, url);
  if ((r = p.match(/^\/api\/forum\/categories\/([\w-]+)$/))) {
    if (m === 'PUT') return updateCategory(request, env, r[1]);
    if (m === 'DELETE') return deleteCategory(request, env, r[1]);
  }
  if (p === '/api/chat' && m === 'GET') return chatHome(request, env);
  if (p === '/api/chat/rooms' && m === 'POST') return chatAddRoom(request, env);
  if (p === '/api/chat/mentions' && m === 'GET') return chatMentions(request, env);
  if (p === '/api/chat/mentions' && m === 'POST') return readChatMentions(request, env);
  if ((r = p.match(/^\/api\/chat\/rooms\/([\w-]+)$/)) && m === 'PUT') return chatEditRoom(request, env, r[1]);
  if (p === '/api/chat/ws' && m === 'GET') return chatSocket(request, env, url);
  if ((r = p.match(/^\/api\/chat\/rooms\/([\w-]+)\/read$/)) && m === 'PUT') return chatRead(request, env, r[1]);
  if ((r = p.match(/^\/api\/chat\/rooms\/([\w-]+)\/messages$/))) {
    if (m === 'GET') return chatMessages(request, env, url, r[1]);
    if (m === 'POST') return chatSend(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/chat\/messages\/([\w-]+)$/))) {
    if (m === 'PUT') return chatUpdate(request, env, r[1]);
    if (m === 'DELETE') return chatDelete(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/chat\/messages\/([\w-]+)\/react$/)) && m === 'PUT') return chatReact(request, env, r[1]);
  if ((r = p.match(/^\/api\/chat\/mutes\/([\w-]+)$/)) && m === 'PUT') return chatMute(request, env, r[1]);
  if (p === '/api/hit' && m === 'POST') return hit(request, env, url);
  if (p === '/api/me/updates' && m === 'PUT') return setUpdates(request, env);
  if (p === '/api/unsubscribe' && (m === 'GET' || m === 'POST')) return unsubscribe(request, env, url);
  if (p === '/api/admin/announce' && m === 'GET') return announceInfo(request, env);
  if (p === '/api/admin/announce' && m === 'POST') return announce(request, env, url);
  if (p === '/api/images' && m === 'POST') return uploadImage(request, env);
  if ((r = p.match(/^\/api\/images\/([\w-]+)$/)) && m === 'GET') return getImage(request, env, r[1]);
  if (p === '/api/reports' && m === 'POST') return addReport(request, env, url);
  if (p === '/api/admin/moderation' && m === 'GET') return moderation(request, env);
  if ((r = p.match(/^\/api\/admin\/images\/([\w-]+)$/))) {
    if (m === 'PUT') return hideImage(request, env, r[1]);
    if (m === 'DELETE') return adminDeleteImage(request, env, r[1]);
  }
  if ((r = p.match(/^\/api\/admin\/users\/([\w-]+)$/)) && m === 'PUT') return blockUser(request, env, r[1]);
  if ((r = p.match(/^\/api\/admin\/reports\/([\w-]+)$/)) && m === 'PUT') return resolveReport(request, env, r[1]);
  return json({ error: 'Not found' }, 404);
}

/* ---------- helpers ---------- */

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const now = () => Date.now();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

async function getJSON(u, token) {
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'painters-desk' } });
  if (!r.ok) throw new Error(`Profile request failed: ${r.status}`);
  return r.json();
}

function cookies(request) {
  const out = {};
  (request.headers.get('Cookie') || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

function setCookie(url, name, value, { maxAge, path = '/' } = {}) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const adminEmails = env => (env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

// A user's picture: their uploaded icon if they chose one (and an admin hasn't hidden it), else the picture from
// their sign-in service. Blocked accounts show no picture at all.
const AVATAR = `CASE WHEN u.blocked = 1 THEN NULL
  WHEN u.avatar_image != '' AND NOT EXISTS (SELECT 1 FROM images i WHERE i.id = u.avatar_image AND i.hidden = 1) THEN '/api/images/' || u.avatar_image
  ELSE u.avatar END`;

async function currentUser(request, env) {
  const token = cookies(request)[SESSION_COOKIE];
  if (!token) return null;
  // dm/dm_mail (message settings) come with migration 0015.
  // forum_mail comes with migration 0018.
  const msg = await hasMessages(env), fnd = await hasFindable(env), frm = await hasForum(env);
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.email_verified, ${AVATAR} AS avatar, u.avatar AS provider_avatar, u.avatar_image, u.bio, u.link, u.favourites, u.updates, u.updates_asked, u.blocked, u.created_at${msg ? ', u.dm, u.dm_mail' : ''}${fnd ? ', u.findable' : ''}${frm ? ', u.forum_mail' : ''}
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(await sha256(token), now()).first();
  if (!row) return null;
  // Only a verified email can grant admin rights, so typing someone's address at sign-up gains nothing.
  row.admin = !!row.email && !!row.email_verified && adminEmails(env).includes(row.email.toLowerCase());
  row.email_verified = !!row.email_verified;
  row.updates = !!row.updates;
  row.updates_asked = !!row.updates_asked;
  row.blocked = !!row.blocked;
  if (msg) { row.dm = !!row.dm; row.dm_mail = !!row.dm_mail; }
  if (fnd) row.findable = !!row.findable;
  if (frm) row.forum_mail = !!row.forum_mail;
  row.favourites = JSON.parse(row.favourites || '[]');
  return row;
}

async function requireUser(request, env) {
  const u = await currentUser(request, env);
  if (!u) throw new HttpError(401, 'Please sign in');
  return u;
}

async function body(request) {
  try { return await request.json(); } catch { throw new HttpError(400, 'Expected JSON'); }
}

function str(v, max, field, { required = false } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} is too long (max ${max} characters)`);
  return s;
}

function paintKeys(v, max) {
  if (!Array.isArray(v)) return [];
  const keys = [...new Set(v.filter(k => typeof k === 'string' && k.length > 0 && k.length <= 120))];
  if (keys.length > max) throw new HttpError(400, `Too many paints (max ${max})`);
  return keys;
}

// Only allow a return path on this site, so sign-in can't be used to bounce visitors elsewhere.
// Browsers read a backslash as a slash, so '/\evil.example' counts as another site and is refused too.
const safeReturn = r => {
  if (typeof r !== 'string' || !r.startsWith('/') || /[\\\s]/.test(r)) return '/';
  try {
    const u = new URL(r, 'https://same.invalid');
    return u.origin === 'https://same.invalid' ? r : '/';
  } catch { return '/'; }
};

/* ---------- accounts ---------- */

async function me(request, env) {
  const user = await currentUser(request, env);
  const providers = Object.entries(PROVIDERS).filter(([, p]) => p.id(env) && p.secret(env)).map(([k, p]) => ({ id: k, label: p.label }));
  let logins = [];
  if (user) logins = (await env.DB.prepare('SELECT provider FROM identities WHERE user_id = ?').bind(user.id).all()).results.map(r => r.provider);
  // messages: the Messages pages work (migration 0015).
  // forum: the Forum pages work (migration 0018). chat: the Chat page works (migration 0019).
  const messages = await hasMessages(env), follows = await hasFollows(env), forum = await hasForum(env), chat = await hasChat(env);
  // Email + password sign-up is always available; logins includes 'email' once a password is set.
  // mail: confirmation and password-reset emails can be sent.
  return json({ user, logins, providers, passwords: true, mail: mailReady(env), messages, follows, forum, chat, devLogin: env.DEV_LOGIN === '1' });
}

async function sessionCookie(env, url, userId) {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, now() + SESSION_DAYS * 864e5).run();
  return setCookie(url, SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400 });
}

async function startSession(env, url, userId, returnTo) {
  const headers = new Headers({ Location: safeReturn(returnTo) });
  headers.append('Set-Cookie', await sessionCookie(env, url, userId));
  headers.append('Set-Cookie', setCookie(url, OAUTH_COOKIE, '', { maxAge: 0, path: '/api/auth' }));
  return new Response(null, { status: 302, headers });
}

// Find or create the account for an external login. First sign-in creates the account automatically;
// a new login method joins an existing account when signed in already, or when the verified email matches.
async function upsertIdentity(env, request, provider, prof) {
  const ident = await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND provider_id = ?').bind(provider, prof.id).first();
  if (ident) {
    await env.DB.prepare('UPDATE users SET avatar = COALESCE(?, avatar) WHERE id = ?').bind(prof.avatar, ident.user_id).run();
    return ident.user_id;
  }
  const t = now(), stmts = [];
  const signedIn = await currentUser(request, env);
  let userId = signedIn?.id;
  if (!userId && prof.email) {
    const byEmail = await env.DB.prepare('SELECT id, email_verified FROM users WHERE email = ? COLLATE NOCASE').bind(prof.email).first();
    userId = byEmail?.id;
    // The account's email was typed in at sign-up and never confirmed, so whoever set its password may not own
    // that address. The verified owner gets the account: the old password and its sessions are removed,
    // and they can set a new password from the account page.
    if (byEmail && !byEmail.email_verified) stmts.push(
      env.DB.prepare('DELETE FROM passwords WHERE user_id = ?').bind(userId),
      env.DB.prepare("DELETE FROM identities WHERE user_id = ? AND provider = 'email'").bind(userId),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    );
  }
  // A sign-in service confirming the account's own email marks it verified.
  if (userId && prof.email) stmts.push(env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ? AND email = ? COLLATE NOCASE').bind(userId, prof.email));
  if (!userId) {
    userId = crypto.randomUUID();
    stmts.push(env.DB.prepare('INSERT INTO users (id, name, email, avatar, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, (prof.name || 'Painter').slice(0, 60), prof.email, prof.avatar, t));
  }
  stmts.push(env.DB.prepare('INSERT INTO identities (provider, provider_id, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(provider, prof.id, userId, prof.email, t));
  await env.DB.batch(stmts);
  return userId;
}

async function oauthStart(request, env, url, name) {
  const p = PROVIDERS[name];
  if (!p || !p.id(env) || !p.secret(env)) throw new HttpError(404, 'Unknown sign-in method');
  const state = randomToken(16);
  const q = new URLSearchParams({
    client_id: p.id(env), redirect_uri: `${url.origin}/api/auth/callback/${name}`,
    response_type: 'code', scope: p.scope, state, ...(p.extra || {}),
  });
  const ret = safeReturn(url.searchParams.get('return'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${p.authorize}?${q}`,
      'Set-Cookie': setCookie(url, OAUTH_COOKIE, `${state}|${name}|${ret}`, { maxAge: 600, path: '/api/auth' }),
    },
  });
}

async function oauthCallback(request, env, url, name) {
  const p = PROVIDERS[name];
  if (!p || !p.id(env)) throw new HttpError(404, 'Unknown sign-in method');
  const [state, prov, ret] = (cookies(request)[OAUTH_COOKIE] || '').split('|');
  if (url.searchParams.get('error')) return Response.redirect(`${url.origin}/#/account?error=cancelled`, 302);
  if (!state || state !== url.searchParams.get('state') || prov !== name) throw new HttpError(400, 'Sign-in expired, please try again');
  const tr = await fetch(p.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: p.id(env), client_secret: p.secret(env), code: url.searchParams.get('code') || '',
      grant_type: 'authorization_code', redirect_uri: `${url.origin}/api/auth/callback/${name}`,
    }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tok.access_token) throw new HttpError(400, 'Sign-in failed, please try again');
  const prof = await p.profile(tok.access_token);
  const userId = await upsertIdentity(env, request, name, prof);
  return startSession(env, url, userId, ret);
}

// Local development only: sign in as a named test user without any OAuth keys. Enabled by DEV_LOGIN=1 in .dev.vars.
// &email=… acts like a sign-in service that verified that email, to try account linking.
async function devLogin(request, env, url) {
  if (env.DEV_LOGIN !== '1') throw new HttpError(404, 'Not found');
  const name = str(url.searchParams.get('name') || 'Test Painter', 60, 'Name');
  const userId = await upsertIdentity(env, request, 'dev', { id: name.toLowerCase(), name, email: url.searchParams.get('email') || null, avatar: null });
  return startSession(env, url, userId, url.searchParams.get('return'));
}

async function logout(request, env, url) {
  const token = cookies(request)[SESSION_COOKIE];
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': setCookie(url, SESSION_COOKIE, '', { maxAge: 0 }) });
}

/* ---------- email + password accounts ---------- */

// PBKDF2 via Web Crypto at 100,000 rounds, the most Workers allow (about 20 ms of CPU, fine on the Workers Paid plan).
// The count is stored with each hash, and a sign-in re-hashes older passwords at the current count.
const PBKDF2_ITER = 100000;
const MAX_FAILED = 10, LOCK_MINUTES = 15;
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${PBKDF2_ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, PBKDF2_ITER))}`;
}

async function checkPassword(password, stored) {
  const [, iter, salt, hash] = stored.split('$');
  const got = await pbkdf2(password, unb64(salt), +iter), want = unb64(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

function cleanEmail(v) {
  const e = str(v, 200, 'Email', { required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'Please enter a valid email address');
  return e;
}

function cleanPassword(v) {
  const pw = typeof v === 'string' ? v : '';
  if (pw.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (pw.length > 200) throw new HttpError(400, 'Password is too long (max 200 characters)');
  return pw;
}

function cleanName(v) {
  const n = str(v, 40, 'Display name', { required: true }).replace(/\s+/g, ' ');
  if (n.length < 2) throw new HttpError(400, 'Display name must be at least 2 characters');
  return n;
}

const emailTaken = (env, email, exceptId = '') =>
  env.DB.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE AND id != ?').bind(email, exceptId).first();

// Create an account with email + password. There is no confirmation email yet, so the email stays unverified
// until a sign-in service such as Google confirms it.
async function register(request, env, url) {
  const b = await body(request);
  const email = cleanEmail(b.email), password = cleanPassword(b.password), name = cleanName(b.name);
  if (await emailTaken(env, email)) throw new HttpError(409, 'An account already uses this email. Sign in instead; if you used Google, sign in with it and add a password from your account page.');
  const userId = crypto.randomUUID(), t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, name, email, avatar, created_at, email_verified, updates, updates_asked, unsub) VALUES (?, ?, ?, NULL, ?, 0, ?, ?, ?)')
      .bind(userId, name, email, t, b.updates === true ? 1 : 0, b.updates === true ? 1 : 0, randomToken()),
    env.DB.prepare("INSERT INTO identities (provider, provider_id, user_id, email, created_at) VALUES ('email', ?, ?, ?, ?)").bind(email, userId, email, t),
    env.DB.prepare('INSERT INTO passwords (user_id, hash, updated_at) VALUES (?, ?, ?)').bind(userId, await hashPassword(password), t),
  ]);
  const sent = await sendVerify(env, url, userId, email).then(() => true, e => (console.error(e), false));
  return json({ ok: true, verifySent: sent }, 201, { 'Set-Cookie': await sessionCookie(env, url, userId) });
}

async function passwordLogin(request, env, url) {
  const b = await body(request);
  const email = cleanEmail(b.email), password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  const row = await env.DB.prepare(
    "SELECT p.user_id, p.hash, p.failed, p.locked_until FROM identities i JOIN passwords p ON p.user_id = i.user_id WHERE i.provider = 'email' AND i.provider_id = ?"
  ).bind(email).first();
  if (row && row.locked_until > now()) throw new HttpError(429, `Too many wrong passwords. Please try again in ${LOCK_MINUTES} minutes.`);
  // Hash even when there is no such account, so the response time doesn't reveal which emails exist.
  const ok = row ? await checkPassword(password, row.hash) : (await hashPassword(password), false);
  if (!ok) {
    if (row) {
      const failed = row.failed + 1, lock = failed >= MAX_FAILED;
      await env.DB.prepare('UPDATE passwords SET failed = ?, locked_until = ? WHERE user_id = ?')
        .bind(lock ? 0 : failed, lock ? now() + LOCK_MINUTES * 60000 : 0, row.user_id).run();
    }
    throw new HttpError(401, 'Wrong email or password');
  }
  if (+row.hash.split('$')[1] !== PBKDF2_ITER)
    await env.DB.prepare('UPDATE passwords SET hash = ?, failed = 0 WHERE user_id = ?').bind(await hashPassword(password), row.user_id).run();
  else if (row.failed) await env.DB.prepare('UPDATE passwords SET failed = 0 WHERE user_id = ?').bind(row.user_id).run();
  return json({ ok: true }, 200, { 'Set-Cookie': await sessionCookie(env, url, row.user_id) });
}

// Add a password to an account (e.g. one made with Google), or change it. Changing needs the current password.
// Accounts with no email on file give one here.
async function setPassword(request, env) {
  const u = await requireUser(request, env), b = await body(request);
  const password = cleanPassword(b.password), t = now();
  const old = await env.DB.prepare('SELECT hash FROM passwords WHERE user_id = ?').bind(u.id).first();
  if (old && !(await checkPassword(typeof b.current === 'string' ? b.current : '', old.hash))) throw new HttpError(400, 'Current password is wrong');
  const stmts = [env.DB.prepare('INSERT INTO passwords (user_id, hash, updated_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET hash = excluded.hash, failed = 0, locked_until = 0, updated_at = excluded.updated_at')
    .bind(u.id, await hashPassword(password), t)];
  let email = u.email?.toLowerCase();
  let newEmail = false;
  if (!email) {
    email = cleanEmail(b.email);
    if (await emailTaken(env, email, u.id)) throw new HttpError(409, 'Another account already uses this email');
    stmts.push(env.DB.prepare('UPDATE users SET email = ?, email_verified = 0 WHERE id = ?').bind(email, u.id));
    newEmail = true;
  }
  if (await env.DB.prepare("SELECT 1 FROM identities WHERE provider = 'email' AND provider_id = ? AND user_id != ?").bind(email, u.id).first())
    throw new HttpError(409, 'Another account already uses this email');
  stmts.push(env.DB.prepare("DELETE FROM identities WHERE user_id = ? AND provider = 'email'").bind(u.id),
    env.DB.prepare("INSERT INTO identities (provider, provider_id, user_id, email, created_at) VALUES ('email', ?, ?, ?, ?)").bind(email, u.id, email, t));
  await env.DB.batch(stmts);
  if (newEmail) await sendVerify(env, new URL(request.url), u.id, email).catch(e => console.error(e));
  return json({ ok: true });
}

/* ---------- emails: confirm address, reset password ---------- */

// Sent from MAIL_FROM through Cloudflare Email Sending when the Worker has an EMAIL send_email binding
// (Workers Paid plan), else through Resend (resend.com) with the RESEND_API_KEY secret.
// With DEV_LOGIN=1 and neither, emails are printed to the wrangler dev console instead.
const mailReady = env => !!((env.EMAIL || env.RESEND_API_KEY) && env.MAIL_FROM) || env.DEV_LOGIN === '1';
const VERIFY_HOURS = 48, RESET_MINUTES = 60, RESEND_WAIT = 60000;

// The site's default Neon 1984 look for emails: dark night-purple page, neon strip, card with a cyan outline and
// hot pink offset shadow, yellow button. Tables and inline styles only, since many mail apps ignore <style> and web fonts.
const MAIL_STRIP = ['#ff2a6d', '#b537f2', '#2de2e6', '#f9f871', '#ff2a6d'];
const MAIL_HEAD = "Orbitron,'Arial Black',Arial,sans-serif", MAIL_BODY = "Rubik,'Segoe UI',Helvetica,Arial,sans-serif";
const mailButton = (link, label) => `<a href="${link}" style="display:inline-block;background:#f9f871;color:#0b0224;font-family:${MAIL_HEAD};font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:12px 20px;border:2px solid #0b0224;border-radius:14px;box-shadow:3px 3px 0 #ff2a6d">${label}</a>`;
function mailShell(origin, inner, foot = '') {
  return `<!doctype html><html><head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head><body style="margin:0;padding:0;background:#07011a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#07011a" style="background:#07011a"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px"><img src="${origin}/icons/email-neon.png" width="48" height="48" alt="" style="display:block"></td>
<td style="font-family:${MAIL_HEAD};font-weight:700;font-size:20px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-shadow:-2px 0 #2de2e6,2px 0 #ff2a6d">The Painters Desk</td></tr></table></td></tr>
<tr><td bgcolor="#160736" style="background:#160736;border:2px solid #2de2e6;border-radius:18px;box-shadow:0 0 18px rgba(45,226,230,.45),6px 6px 0 #ff2a6d;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${MAIL_STRIP.map(c => `<td height="6" style="height:6px;line-height:6px;font-size:0;background:${c}">&nbsp;</td>`).join('')}</tr></table>
<div style="padding:20px 24px 24px;font-family:${MAIL_BODY};font-size:16px;line-height:1.55;color:#f3ecff">${inner}</div></td></tr>
<tr><td style="padding:18px 6px 0;font-family:${MAIL_BODY};font-size:12px;line-height:1.5;color:#b4a3df">${foot}${foot ? '<br>' : ''}© AK Tabletop Studio · <a href="${origin}" style="color:#2de2e6">paintersdesk.com</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendMail(env, to, subject, text, link, button, replyTo = '') {
  const html = mailShell(new URL(link).origin, `${text.split('\n\n').map(p => `<p style="margin:0 0 14px">${htmlEsc(p)}</p>`).join('')}
<p style="margin:20px 0 16px">${mailButton(link, button)}</p>
<p style="margin:0;color:#b4a3df;font-size:13px;word-break:break-all">Or copy this link: <a href="${link}" style="color:#2de2e6">${link}</a></p>`);
  if (env.EMAIL && env.MAIL_FROM) {
    try { await env.EMAIL.send({ from: env.MAIL_FROM, to, subject, text: `${text}\n\n${button}: ${link}`, html, ...(replyTo ? { replyTo } : {}) }); }
    catch (e) { console.error('Email Sending error', e); throw new HttpError(502, "Couldn't send the email, please try again later"); }
    return;
  }
  if (!env.RESEND_API_KEY) {
    if (env.DEV_LOGIN !== '1') throw new HttpError(503, 'Email is not set up on this server yet');
    console.log(`[dev email] to ${to}: ${subject}\n${link}`);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text: `${text}\n\n${button}: ${link}`, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) {
    console.error('Resend error', r.status, await r.text().catch(() => ''));
    throw new HttpError(502, "Couldn't send the email, please try again later");
  }
}

// Make a one-time link token, replacing any earlier one of the same kind. Returns null if one was made under a minute ago.
async function newToken(env, userId, kind, email, ms) {
  const last = await env.DB.prepare('SELECT MAX(created_at) AS t FROM email_tokens WHERE user_id = ? AND kind = ?').bind(userId, kind).first();
  if (last?.t && now() - last.t < RESEND_WAIT) return null;
  const token = randomToken(), t = now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ? AND kind = ?').bind(userId, kind),
    env.DB.prepare('INSERT INTO email_tokens (token_hash, user_id, kind, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(token), userId, kind, email, t + ms, t),
  ]);
  return token;
}

async function sendVerify(env, url, userId, email) {
  if (!mailReady(env)) return false;
  const token = await newToken(env, userId, 'verify', email, VERIFY_HOURS * 3600000);
  if (!token) throw new HttpError(429, 'We just sent one. Please wait a minute before asking again.');
  await sendMail(env, email, 'Confirm your email for The Painters Desk',
    `Welcome to The Painters Desk! Please confirm this is your email address.\n\nThe link works for ${VERIFY_HOURS} hours. If you didn't create an account, you can ignore this email.`,
    `${url.origin}/api/auth/verify?t=${token}`, 'Confirm my email');
  return true;
}

async function resendVerify(request, env, url) {
  const u = await requireUser(request, env);
  if (!u.email) throw new HttpError(400, 'There is no email on your account');
  if (u.email_verified) return json({ ok: true, already: true });
  if (!mailReady(env)) throw new HttpError(503, 'Email is not set up on this server yet');
  await sendVerify(env, url, u.id, u.email.toLowerCase());
  return json({ ok: true });
}

async function useToken(env, token, kind) {
  if (typeof token !== 'string' || !token || token.length > 100) return null;
  const row = await env.DB.prepare('SELECT user_id, email, expires_at FROM email_tokens WHERE token_hash = ? AND kind = ?').bind(await sha256(token), kind).first();
  if (!row || row.expires_at < now()) return null;
  return row;
}

// The link in the confirmation email. Opens the account page with a message either way.
async function verifyEmail(env, url) {
  const row = await useToken(env, url.searchParams.get('t'), 'verify');
  if (!row) return Response.redirect(`${url.origin}/#/account?verify=expired`, 302);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ? AND email = ? COLLATE NOCASE').bind(row.user_id, row.email),
    env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ? AND kind = 'verify'").bind(row.user_id),
  ]);
  return Response.redirect(`${url.origin}/#/account?verify=done`, 302);
}

// Always answers the same way, so it can't be used to find out which emails have accounts.
async function forgotPassword(request, env, url) {
  const email = cleanEmail((await body(request)).email);
  if (!mailReady(env)) throw new HttpError(503, 'Password reset emails are not set up yet');
  const u = await env.DB.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').bind(email).first();
  if (u) {
    const token = await newToken(env, u.id, 'reset', email, RESET_MINUTES * 60000);
    if (token) await sendMail(env, email, 'Reset your Painters Desk password',
      `Someone asked to reset the password for your Painters Desk account. If it was you, choose a new password with the button below.\n\nThe link works for ${RESET_MINUTES} minutes and only once. If you didn't ask for this, you can ignore this email and your password stays the same.`,
      `${url.origin}/#/reset/${token}`, 'Choose a new password');
  }
  return json({ ok: true });
}

// Opening the reset link proves the person owns the email, so this also confirms it.
// Every other session is signed out.
async function resetPassword(request, env, url) {
  const b = await body(request);
  const row = await useToken(env, b.token, 'reset');
  if (!row) throw new HttpError(400, 'This reset link has expired or was already used. Please ask for a new one.');
  const password = cleanPassword(b.password), t = now();
  const stmts = [
    env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ? AND kind = 'reset'").bind(row.user_id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
    env.DB.prepare('INSERT INTO passwords (user_id, hash, updated_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET hash = excluded.hash, failed = 0, locked_until = 0, updated_at = excluded.updated_at')
      .bind(row.user_id, await hashPassword(password), t),
    env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ? AND email = ? COLLATE NOCASE').bind(row.user_id, row.email),
  ];
  if (!(await env.DB.prepare("SELECT 1 FROM identities WHERE provider = 'email' AND provider_id = ? AND user_id != ?").bind(row.email, row.user_id).first()))
    stmts.push(env.DB.prepare("DELETE FROM identities WHERE user_id = ? AND provider = 'email'").bind(row.user_id),
      env.DB.prepare("INSERT INTO identities (provider, provider_id, user_id, email, created_at) VALUES ('email', ?, ?, ?, ?)").bind(row.email, row.user_id, row.email, t));
  await env.DB.batch(stmts);
  return json({ ok: true }, 200, { 'Set-Cookie': await sessionCookie(env, url, row.user_id) });
}

/* ---------- profiles ---------- */

async function saveProfile(request, env) {
  const u = await requireUser(request, env), b = await body(request);
  const name = cleanName(b.name), bio = str(b.bio, 500, 'About you'), link = str(b.link, 300, 'Link');
  if (link && !/^https?:\/\//i.test(link)) throw new HttpError(400, 'Link must start with http:// or https://');
  const favourites = paintKeys(b.favourites, 24);
  // icon: an uploaded image id, '' to go back to the sign-in picture, or left out to keep the current one.
  let icon = u.avatar_image;
  if (typeof b.icon === 'string' && b.icon !== icon) {
    if (b.icon && !IMAGE_ID.test(b.icon)) throw new HttpError(400, 'Bad icon');
    if (b.icon && u.blocked) throw new HttpError(403, 'This account has been blocked from adding pictures');
    if (b.icon) await checkImagesOwned(env, u, [b.icon]);
    icon = b.icon;
  }
  await env.DB.prepare('UPDATE users SET name = ?, bio = ?, link = ?, favourites = ?, avatar_image = ? WHERE id = ?')
    .bind(name, bio, link, JSON.stringify(favourites), icon, u.id).run();
  if (u.avatar_image && u.avatar_image !== icon) await deleteImages(env, [u.avatar_image]);
  return json({ user: await currentUser(request, env) });
}

// Anyone can see a profile: icon, name, bio, link, favourite paints and public recipes & tutorials. Never the email.
async function getProfile(request, env, id) {
  const p = await env.DB.prepare(`SELECT u.id, u.name, ${AVATAR} AS avatar, u.bio, u.link, u.favourites, u.blocked, u.created_at FROM users u WHERE u.id = ?`).bind(id).first();
  if (!p) throw new HttpError(404, 'Painter not found');
  // A blocked account's profile shows only its name.
  if (p.blocked) { p.bio = ''; p.link = ''; p.favourites = '[]'; }
  const blocked = !!p.blocked;
  delete p.blocked;
  p.favourites = JSON.parse(p.favourites || '[]');
  const rows = (await env.DB.prepare(
    `SELECT r.*, u.name AS author_name, ${AVATAR} AS author_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
       (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS vote_count
     FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? AND r.visibility = 'public' ORDER BY r.updated_at DESC LIMIT 100`
  ).bind(id).all()).results;
  const commission = blocked ? null : await commissionFor(env, id);
  // canMessage: shows the Message button. The checks that depend on who is asking happen when they open it.
  p.canMessage = !blocked && await hasMessages(env) && !!(await env.DB.prepare('SELECT dm FROM users WHERE id = ?').bind(id).first()).dm;
  p.follows = blocked ? null : await followInfo(env, id, await currentUser(request, env));
  return json({ profile: p, recipes: rows.map(listItem), commission });
}

async function deleteAccount(request, env) {
  const u = await requireUser(request, env);
  const imgs = (await env.DB.prepare('SELECT id FROM images WHERE user_id = ?').bind(u.id).all()).results.map(i => i.id);
  await deleteImages(env, imgs);
  // Child rows go first so this works whether or not D1 enforces the foreign keys.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM comments WHERE user_id = ? OR recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)').bind(u.id, u.id),
    env.DB.prepare('DELETE FROM votes WHERE user_id = ? OR recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)').bind(u.id, u.id),
    env.DB.prepare('DELETE FROM saves WHERE user_id = ? OR recipe_id IN (SELECT id FROM recipes WHERE user_id = ?)').bind(u.id, u.id),
    env.DB.prepare('DELETE FROM recipes WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM collection WHERE user_id = ?').bind(u.id),
    ...(await hasCommissions(env) ? [
      env.DB.prepare('DELETE FROM commissions WHERE user_id = ?').bind(u.id),
      env.DB.prepare('DELETE FROM commission_messages WHERE painter_id = ? OR sender_id = ?').bind(u.id, u.id),
    ] : []),
    ...(await hasMessages(env) ? [
      env.DB.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE a_id = ?1 OR b_id = ?1)').bind(u.id),
      env.DB.prepare('DELETE FROM conversations WHERE a_id = ?1 OR b_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM user_blocks WHERE user_id = ?1 OR blocked_id = ?1').bind(u.id),
    ] : []),
    ...(await hasFollows(env) ? [env.DB.prepare('DELETE FROM follows WHERE user_id = ?1 OR followed_id = ?1').bind(u.id)] : []),
    // Forum: replies go. Threads nobody else replied to go entirely; the others keep their replies, with the opening post deleted.
    ...(await hasForum(env) ? [
      env.DB.prepare('DELETE FROM forum_votes WHERE user_id = ?1 OR post_id IN (SELECT id FROM forum_posts WHERE user_id = ?1)').bind(u.id),
      env.DB.prepare('DELETE FROM forum_follows WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM forum_posts WHERE user_id = ?1 AND first = 0').bind(u.id),
      env.DB.prepare('DELETE FROM forum_follows WHERE thread_id IN (SELECT t.id FROM forum_threads t WHERE t.user_id = ?1 AND NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = t.id AND p.first = 0))').bind(u.id),
      env.DB.prepare('DELETE FROM forum_posts WHERE first = 1 AND thread_id IN (SELECT t.id FROM forum_threads t WHERE t.user_id = ?1 AND NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = t.id AND p.first = 0))').bind(u.id),
      env.DB.prepare('DELETE FROM forum_threads WHERE user_id = ?1 AND NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = forum_threads.id)').bind(u.id),
      env.DB.prepare("UPDATE forum_posts SET user_id = NULL, deleted = 1, body = '', images = '[]', paints = '[]', recipes = '[]' WHERE user_id = ?1").bind(u.id),
      env.DB.prepare('UPDATE forum_threads SET user_id = NULL WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('UPDATE forum_categories SET suggested_by = NULL WHERE suggested_by = ?1').bind(u.id),
      // Threads left with nothing but deleted posts go too.
      env.DB.prepare('DELETE FROM forum_follows WHERE thread_id IN (SELECT t.id FROM forum_threads t WHERE NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = t.id AND p.deleted = 0))'),
      env.DB.prepare('DELETE FROM forum_posts WHERE thread_id IN (SELECT t.id FROM forum_threads t WHERE NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = t.id AND p.deleted = 0))'),
      env.DB.prepare('DELETE FROM forum_threads WHERE NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = forum_threads.id)'),
    ] : []),
    // Chat: their messages go, with the reactions and mentions on them.
    ...(await hasChat(env) ? [
      env.DB.prepare('DELETE FROM chat_reactions WHERE user_id = ?1 OR message_id IN (SELECT id FROM chat_messages WHERE user_id = ?1)').bind(u.id),
      env.DB.prepare('DELETE FROM chat_mentions WHERE user_id = ?1 OR message_id IN (SELECT id FROM chat_messages WHERE user_id = ?1)').bind(u.id),
      env.DB.prepare('DELETE FROM chat_messages WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM chat_reads WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM chat_mutes WHERE user_id = ?1').bind(u.id),
    ] : []),
    env.DB.prepare('DELETE FROM images WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM passwords WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM identities WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': setCookie(new URL(request.url), SESSION_COOKIE, '', { maxAge: 0 }) });
}

/* ---------- paint collection ---------- */

async function getCollection(request, env) {
  const u = await requireUser(request, env);
  const rows = (await env.DB.prepare('SELECT paint_key FROM collection WHERE user_id = ?').bind(u.id).all()).results;
  return json({ paints: rows.map(r => r.paint_key) });
}

async function putCollection(request, env) {
  const u = await requireUser(request, env);
  const b = await body(request);
  const add = paintKeys(b.add, 3000), remove = paintKeys(b.remove, 3000), t = now();
  const stmts = [
    ...add.map(k => env.DB.prepare('INSERT OR IGNORE INTO collection (user_id, paint_key, added_at) VALUES (?, ?, ?)').bind(u.id, k, t)),
    ...remove.map(k => env.DB.prepare('DELETE FROM collection WHERE user_id = ? AND paint_key = ?').bind(u.id, k)),
  ];
  for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
  return getCollection(request, env);
}

/* ---------- last wheel selection ---------- */

// Until migration 0006 is applied the column is missing; report that instead of failing.
const noWheelColumn = e => /no such column: wheel/i.test(String(e && e.message));

async function getWheel(request, env) {
  const u = await requireUser(request, env);
  try {
    const r = await env.DB.prepare('SELECT wheel FROM users WHERE id = ?').bind(u.id).first();
    let wheel = null;
    try { wheel = r && r.wheel ? JSON.parse(r.wheel) : null; } catch { wheel = null; }
    return json({ wheel });
  } catch (e) {
    if (noWheelColumn(e)) return json({ wheel: null, unavailable: true });
    throw e;
  }
}

async function putWheel(request, env) {
  const u = await requireUser(request, env);
  const b = await body(request);
  const t = Number(b.t);
  if (!Number.isFinite(t) || t <= 0) throw new HttpError(400, 'Missing time');
  const g = Array.isArray(b.g) ? [...new Set(b.g.filter(x => typeof x === 'string' && x.length === 1))].slice(0, 100) : [];
  const wheel = { t: Math.min(t, Date.now() + 60000), g, k: paintKeys(b.k, 3000) };
  try {
    await env.DB.prepare('UPDATE users SET wheel = ? WHERE id = ?').bind(JSON.stringify(wheel), u.id).run();
    return json({ wheel });
  } catch (e) {
    if (noWheelColumn(e)) return json({ wheel: null, unavailable: true });
    throw e;
  }
}

/* ---------- recipes & tutorials ---------- */

const recipeOut = r => ({
  id: r.id, kind: r.kind, title: r.title, summary: r.summary, body: r.body, link: r.link,
  paints: JSON.parse(r.paints || '[]'), steps: JSON.parse(r.steps || '[]'), cover: r.cover || '', meta: JSON.parse(r.meta || '{}'), visibility: r.visibility, created_at: r.created_at, updated_at: r.updated_at,
  author: { id: r.user_id, name: r.author_name, avatar: r.author_avatar }, comments: r.comment_count ?? undefined,
  views: r.views || 0, votes: r.vote_count || 0, voted: !!r.voted, saved: !!r.saved,
});

async function listRecipes(request, env, url) {
  const scope = ['mine', 'saved', 'following'].includes(url.searchParams.get('scope')) ? url.searchParams.get('scope') : 'public';
  const q = str(url.searchParams.get('q') || '', 100, 'Search');
  const where = [], args = [];
  let from = 'recipes r', order = 'r.updated_at DESC';
  if (scope === 'mine') { where.push('r.user_id = ?'); args.push((await requireUser(request, env)).id); }
  else if (scope === 'saved') {
    // Newest saves first. A saved recipe its author has since made private drops out of the list.
    const uid = (await requireUser(request, env)).id;
    from = 'saves s JOIN recipes r ON r.id = s.recipe_id'; order = 's.created_at DESC';
    where.push("s.user_id = ? AND (r.visibility = 'public' OR r.user_id = ?)"); args.push(uid, uid);
  }
  else if (scope === 'following') {
    // Public work by the painters you follow, newest first.
    const uid = (await requireUser(request, env)).id;
    if (!await hasFollows(env)) return json({ recipes: [] });
    where.push("r.visibility = 'public' AND r.user_id IN (SELECT followed_id FROM follows WHERE user_id = ?)"); args.push(uid);
  }
  else where.push("r.visibility = 'public'");
  if (q) { where.push('(r.title LIKE ? OR r.summary LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const kind = url.searchParams.get('kind');
  if (KINDS.includes(kind)) { where.push('r.kind = ?'); args.push(kind); }
  // Recipes that use one paint (the wheel's "Recipes using this paint"). Keys are stored as a JSON array, so match the quoted key.
  const paint = url.searchParams.get('paint');
  if (paint && paint.length <= 120) { where.push("r.paints LIKE ? ESCAPE '\\'"); args.push(`%${JSON.stringify(paint).replace(/[\\%_]/g, c => '\\' + c)}%`); }
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 100));
  const rows = (await env.DB.prepare(
    `SELECT r.*, u.name AS author_name, ${AVATAR} AS author_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
       (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS vote_count
     FROM ${from} JOIN users u ON u.id = r.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`
  ).bind(...args).all()).results;
  return json({ recipes: rows.map(r => ({ ...listItem(r), saved: scope === 'saved' })) });
}

// The list only needs a picture: the main photo, else the last step photo (usually the finished model).
// Recipe and palette cards show their layers (a palette's colours) as a colour strip instead, so they keep each one's mix.
function listItem(r) {
  const o = recipeOut(r);
  o.cover = o.cover || [...o.steps].reverse().find(s => s.image)?.image || '';
  if (o.kind !== 'tutorial') o.layers = o.steps.map(s => s.mix);
  o.steps = o.steps.length; o.saved = false; delete o.body;
  return o;
}

// Recipes a tutorial's steps point at, as far as this viewer may see them (public, or their own).
async function linkedRecipes(env, steps, viewer) {
  const ids = [...new Set(steps.map(s => s.recipe).filter(Boolean))];
  if (!ids.length) return {};
  const rows = (await env.DB.prepare(
    `SELECT r.id, r.title, r.steps, r.paints, r.user_id, u.name AS author_name FROM recipes r JOIN users u ON u.id = r.user_id
     WHERE r.kind = 'recipe' AND r.id IN (${ids.map(() => '?').join(',')}) AND (r.visibility = 'public' OR r.user_id = ?)`
  ).bind(...ids, viewer || '').all()).results;
  return Object.fromEntries(rows.map(r => [r.id, {
    id: r.id, title: r.title, paints: JSON.parse(r.paints || '[]'), author: { id: r.user_id, name: r.author_name },
    layers: JSON.parse(r.steps || '[]').map(s => ({ title: s.title, mix: s.mix })),
  }]));
}

async function loadRecipe(env, id, viewer = null) {
  return env.DB.prepare(
    `SELECT r.*, u.name AS author_name, ${AVATAR} AS author_avatar,
       (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS vote_count,
       EXISTS (SELECT 1 FROM votes v WHERE v.recipe_id = r.id AND v.user_id = ?1) AS voted,
       EXISTS (SELECT 1 FROM saves s WHERE s.recipe_id = r.id AND s.user_id = ?1) AS saved
     FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?2`
  ).bind(viewer || '', id).first();
}

async function getRecipe(request, env, id) {
  const u = await currentUser(request, env), r = await loadRecipe(env, id, u?.id);
  // Private recipes look missing to everyone but their owner.
  if (!r || (r.visibility !== 'public' && r.user_id !== u?.id)) throw new HttpError(404, 'Recipe not found');
  let comments = [];
  if (r.visibility === 'public') {
    comments = (await env.DB.prepare(
      `SELECT c.id, c.body, c.created_at, c.user_id, u.name, ${AVATAR} AS avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.recipe_id = ? AND u.blocked = 0 ORDER BY c.created_at`
    ).bind(id).all()).results.map(c => ({ id: c.id, body: c.body, created_at: c.created_at, author: { id: c.user_id, name: c.name, avatar: c.avatar } }));
  }
  const out = recipeOut(r);
  const linked = out.kind === 'tutorial' ? await linkedRecipes(env, out.steps, u?.id) : {};
  // A recipe lists the public tutorials that use it in a step.
  const usedIn = out.kind === 'recipe' ? (await env.DB.prepare(
    `SELECT id, title FROM recipes WHERE kind = 'tutorial' AND visibility = 'public' AND steps LIKE ? ORDER BY updated_at DESC LIMIT 20`
  ).bind(`%"recipe":"${id}"%`).all()).results : [];
  return json({ recipe: out, comments, linked, usedIn });
}

const IMAGE_ID = /^[0-9a-f-]{36}$/, RECIPE_ID = /^[\w-]{1,64}$/;
const LEVELS = ['beginner', 'intermediate', 'advanced'];
// 'palette': paints matched to a photo's colours, stored like a recipe (one step per colour, no recipe links or video).
const KINDS = ['recipe', 'tutorial', 'palette'];

// Validate the steps and make sure every photo they use was uploaded by this user.
function cleanSteps(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 30) throw new HttpError(400, 'Too many steps (max 30)');
  const steps = raw.map((s, i) => {
    const mix = (Array.isArray(s?.mix) ? s.mix : []).filter(m => typeof m?.k === 'string' && m.k && m.k.length <= 120)
      .map(m => ({ k: m.k, parts: Math.min(20, Math.max(1, Math.round(Number(m.parts) || 1))) }));
    if (mix.length > 8) throw new HttpError(400, `Step ${i + 1} has too many paints (max 8)`);
    const image = typeof s?.image === 'string' && IMAGE_ID.test(s.image) ? s.image : '';
    const recipe = typeof s?.recipe === 'string' && RECIPE_ID.test(s.recipe) ? s.recipe : '';
    return { title: str(s?.title, 80, `Step ${i + 1} name`), text: str(s?.text, 4000, `Step ${i + 1} details`), image, mix, recipe };
  }).filter(s => s.title || s.text || s.image || s.mix.length || s.recipe);
  return steps;
}

async function checkImagesOwned(env, u, ids) {
  for (const id of ids) {
    const row = await env.DB.prepare('SELECT user_id FROM images WHERE id = ?').bind(id).first();
    if (!row || row.user_id !== u.id) throw new HttpError(400, 'A photo is missing, please upload it again');
  }
}

const recipeImages = r => new Set([r.cover, ...r.steps.map(s => s.image)].filter(Boolean));

async function deleteImages(env, ids) {
  ids = [...ids];
  if (!ids.length) return;
  if (env.IMAGES) await env.IMAGES.delete(ids.map(id => `img/${id}`));
  await env.DB.batch(ids.map(id => env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id)));
}

async function saveRecipe(request, env, id) {
  const u = await requireUser(request, env), b = await body(request);
  const kind = KINDS.includes(b.kind) ? b.kind : 'recipe';
  const steps = cleanSteps(b.steps);
  // Only tutorial steps can use a recipe, and only one this user can see. Its paints count as the tutorial's paints.
  let linkedPaints = [];
  if (kind === 'tutorial') {
    const linked = await linkedRecipes(env, steps, u.id);
    steps.forEach(s => { if (s.recipe && !linked[s.recipe]) s.recipe = ''; });
    linkedPaints = Object.values(linked).flatMap(l => l.paints);
  } else steps.forEach(s => { s.recipe = ''; });
  const m = b.meta && typeof b.meta === 'object' ? b.meta : {};
  const meta = kind === 'tutorial' ? {
    level: LEVELS.includes(m.level) ? m.level : '', time: str(m.time, 40, 'Time'), model: str(m.model, 120, 'Model'),
  } : {};
  const cover = typeof b.cover === 'string' && IMAGE_ID.test(b.cover) ? b.cover : '';
  // "paints" is every paint in the steps plus any extras listed separately; it drives list swatches and the wheel button.
  // Water can be part of a step's mix (to show a thinning ratio) but isn't a paint, so it's left out here.
  const paints = paintKeys([...steps.flatMap(s => s.mix.map(m => m.k)), ...(Array.isArray(b.paints) ? b.paints : [])].filter(k => k !== 'water'), 60);
  for (const k of linkedPaints) if (paints.length < 60 && !paints.includes(k)) paints.push(k);
  const rec = {
    kind,
    meta: JSON.stringify(meta),
    title: str(b.title, 120, 'Title', { required: true }),
    summary: str(b.summary, 300, 'Summary'),
    body: str(b.body, 20000, 'Notes'),
    link: str(b.link, 500, 'Video link'),
    paints: JSON.stringify(paints),
    steps: JSON.stringify(steps),
    cover,
    // A blocked account can keep notes for itself but can't share anything.
    visibility: b.visibility === 'public' && !u.blocked ? 'public' : 'private',
  };
  if (rec.link && !/^https?:\/\//i.test(rec.link)) throw new HttpError(400, 'Link must start with http:// or https://');
  const used = recipeImages({ cover, steps });
  const t = now(), isNew = !id;
  let removed = [];
  if (id) {
    const old = await env.DB.prepare('SELECT user_id, cover, steps FROM recipes WHERE id = ?').bind(id).first();
    if (!old || old.user_id !== u.id) throw new HttpError(404, 'Recipe not found');
    const before = recipeImages({ cover: old.cover, steps: JSON.parse(old.steps || '[]') });
    await checkImagesOwned(env, u, [...used].filter(i => !before.has(i)));
    removed = [...before].filter(i => !used.has(i));
    await env.DB.prepare('UPDATE recipes SET kind=?, title=?, summary=?, body=?, link=?, paints=?, steps=?, cover=?, meta=?, visibility=?, updated_at=? WHERE id=?')
      .bind(rec.kind, rec.title, rec.summary, rec.body, rec.link, rec.paints, rec.steps, rec.cover, rec.meta, rec.visibility, t, id).run();
  } else {
    await checkImagesOwned(env, u, [...used]);
    id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO recipes (id, user_id, kind, title, summary, body, link, paints, steps, cover, meta, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, u.id, rec.kind, rec.title, rec.summary, rec.body, rec.link, rec.paints, rec.steps, rec.cover, rec.meta, rec.visibility, t, t).run();
  }
  await deleteImages(env, removed);
  return json({ recipe: recipeOut(await loadRecipe(env, id, u.id)) }, isNew ? 201 : 200);
}

async function deleteRecipe(request, env, id) {
  const u = await requireUser(request, env);
  const r = await env.DB.prepare('SELECT user_id, cover, steps FROM recipes WHERE id = ?').bind(id).first();
  if (!r || (r.user_id !== u.id && !u.admin)) throw new HttpError(404, 'Recipe not found');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM comments WHERE recipe_id = ?').bind(id),
    env.DB.prepare('DELETE FROM votes WHERE recipe_id = ?').bind(id),
    env.DB.prepare('DELETE FROM saves WHERE recipe_id = ?').bind(id),
    env.DB.prepare('DELETE FROM recipes WHERE id = ?').bind(id),
  ]);
  await deleteImages(env, recipeImages({ cover: r.cover, steps: JSON.parse(r.steps || '[]') }));
  return json({ ok: true });
}

/* ---------- photos ---------- */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE = 5 * 1024 * 1024;

// The page shrinks photos before upload; the raw image bytes are the request body.
// Before a photo is stored: the account must not be blocked, a typed-in email must be confirmed, at most
// UPLOADS_PER_HOUR an hour, and the automatic check (scanImage) must not refuse it.
const UPLOADS_PER_HOUR = 30;

async function uploadImage(request, env) {
  const u = await requireUser(request, env);
  if (!env.IMAGES) throw new HttpError(503, 'Photo storage is not set up yet');
  if (u.blocked) throw new HttpError(403, 'This account has been blocked from uploading photos');
  if (u.email && !u.email_verified) throw new HttpError(403, 'Please confirm your email before uploading photos. You can send the confirmation email from your account page.');
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!IMAGE_TYPES.includes(type)) throw new HttpError(400, 'Photos must be JPEG, PNG or WebP');
  const data = await request.arrayBuffer();
  if (!data.byteLength) throw new HttpError(400, 'Empty photo');
  if (data.byteLength > MAX_IMAGE) throw new HttpError(413, 'Photo is too large (max 5 MB)');
  const t = now();
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE user_id = ? AND created_at > ?').bind(u.id, t - 3600000).first();
  if (c.n >= UPLOADS_PER_HOUR) throw new HttpError(429, "You've uploaded a lot of photos this hour, please try again later");
  const scan = await scanImage(env, data, type);
  if (scan.refused) {
    // The photo isn't kept; the attempt is logged for the admin page so repeat tries stand out.
    await env.DB.prepare("INSERT INTO reports (id, kind, target_id, reason, note, reporter_id, created_at) VALUES (?, 'upload', ?, 'auto', ?, NULL, ?)")
      .bind(crypto.randomUUID(), u.id, scan.reason, t).run();
    throw new HttpError(422, "This photo can't be uploaded because it looks like it breaks the site rules. If you think that's a mistake, tell us with the Feedback button.");
  }
  const id = crypto.randomUUID();
  await env.IMAGES.put(`img/${id}`, data, { httpMetadata: { contentType: type } });
  await env.DB.prepare('INSERT INTO images (id, user_id, content_type, size, scan, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, u.id, type, data.byteLength, scan.result, t).run();
  return json({ id, url: `/api/images/${id}` }, 201);
}

// The automatic check: a Workers AI vision model (binding AI) looks at each photo before it is stored.
// If the model can't be reached the photo is kept but marked 'unchecked', so it stands out on the admin page.
const SCAN_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const SCAN_PROMPT = `You check photos uploaded to a miniature painting website, where people share photos of painted tabletop miniatures and models, paints, palettes, artwork and their painting desk.
Decide if this photo breaks the site rules.
Not allowed: nudity or sexual content (photos or artwork); real gore, injuries or violence against people or animals; hate symbols shown to promote hate; illegal drugs; anything sexual or harmful involving children.
Allowed: painted miniatures and models even when they show monsters, skulls, blood effects, gore or battle scenes; fantasy and sci-fi artwork without nudity; everyday photos of people, pets, places and things.
Answer with JSON only, either {"allowed": true} or {"allowed": false, "reason": "<a few words>"}.`;

function toBase64(buf) {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
}

async function scanImage(env, data, type) {
  // Local development (npm run dev runs without Workers AI): DEV_SCAN=ok|refuse|unchecked in .dev.vars fakes the answer.
  if (env.DEV_LOGIN === '1' && env.DEV_SCAN) return env.DEV_SCAN === 'refuse' ? { refused: true, reason: 'dev test' } : { result: env.DEV_SCAN };
  if (!env.AI) return { result: 'unchecked' };
  try {
    const r = await env.AI.run(SCAN_MODEL, {
      messages: [{ role: 'user', content: [
        { type: 'text', text: SCAN_PROMPT },
        { type: 'image_url', image_url: { url: `data:${type};base64,${toBase64(data)}` } },
      ] }],
      max_tokens: 60, temperature: 0,
    });
    let v = r?.response;
    if (typeof v === 'string') { const m = v.match(/\{[^{}]*\}/); v = m ? JSON.parse(m[0]) : null; }
    if (v && v.allowed === true) return { result: 'ok' };
    if (v && v.allowed === false) return { refused: true, reason: String(v.reason || 'breaks the site rules').slice(0, 200) };
    console.error('Photo check gave no answer', JSON.stringify(r).slice(0, 300));
  } catch (e) { console.error('Photo check failed', e); }
  return { result: 'unchecked' };
}

// Photo IDs are random, so a private tutorial's photos can only be found by someone who has the link.
// A photo an admin hid looks missing to everyone but admins. Browsers keep a copy but check back on every view
// (a quick "not modified" answer when nothing changed), so a hidden or deleted photo stops showing straight away.
async function getImage(request, env, id) {
  if (!env.IMAGES || !IMAGE_ID.test(id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare('SELECT hidden FROM images WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Not found' }, 404);
  if (row.hidden && !(await currentUser(request, env))?.admin) return json({ error: 'Not found' }, 404);
  const obj = await env.IMAGES.get(`img/${id}`, { onlyIf: request.headers });
  if (!obj) return json({ error: 'Not found' }, 404);
  const type = obj.httpMetadata?.contentType;
  const headers = {
    'Content-Type': IMAGE_TYPES.includes(type) ? type : 'application/octet-stream',
    'Cache-Control': row.hidden ? 'private, no-store' : 'no-cache',
    ETag: obj.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  };
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}

/* ---------- reports & moderation ---------- */

// The Report button on public recipes, tutorials, palettes and profiles. Anyone can report, signed in or not;
// each sender (by IP) can send REPORTS_PER_HOUR an hour. Reports are emailed to FEEDBACK_TO (else the first ADMIN_EMAILS).
const REPORT_REASONS = { nudity: 'Nudity or sexual content', violence: 'Violence or gore', hate: 'Hate or harassment', spam: 'Spam or scam', other: 'Something else' };
const REPORTS_PER_HOUR = 10;

async function addReport(request, env, url) {
  const b = await body(request);
  if (b.website) return json({ ok: true });
  const kind = ['user', 'message', 'forum', 'chat'].includes(b.kind) ? b.kind : 'recipe';
  const target = typeof b.id === 'string' && RECIPE_ID.test(b.id) ? b.id : '';
  const reason = REPORT_REASONS[b.reason] ? b.reason : 'other';
  const note = str(b.note, 1000, 'Details');
  const u = await currentUser(request, env), t = now();
  let row;
  if (kind === 'message') {
    // Only someone who received a private message can report it, and that lets moderators read that one message.
    if (!u || !await hasMessages(env)) throw new HttpError(404, 'Message not found');
    const m = await env.DB.prepare("SELECT m.side, c.a_id, c.b_id, c.kind, c.a_token, u.name FROM messages m JOIN conversations c ON c.id = m.conversation_id LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ? AND c.kind = 'direct'").bind(target).first();
    const side = m && sideOf(m, u, '');
    if (!side || side === m.side) throw new HttpError(404, 'Message not found');
    row = { name: m.name || '(deleted account)' };
  } else if (kind === 'forum') {
    // A forum post (the opening post or a reply), by its id.
    row = await hasForum(env) && await env.DB.prepare('SELECT t.id AS thread_id, t.title AS name FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE p.id = ? AND p.deleted = 0').bind(target).first();
    if (!row) throw new HttpError(404, 'Post not found');
  } else if (kind === 'chat') {
    // A chat message, by its id. Only members can see chat, so only members can report it.
    row = u && await hasChat(env) && await env.DB.prepare('SELECT r.id AS room_id, r.name, m.id FROM chat_messages m JOIN chat_rooms r ON r.id = m.room_id WHERE m.id = ?').bind(target).first();
    if (!row) throw new HttpError(404, 'Message not found');
  } else row = kind === 'recipe'
    ? await env.DB.prepare("SELECT title AS name FROM recipes WHERE id = ? AND visibility = 'public'").bind(target).first()
    : await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(target).first();
  if (!row) throw new HttpError(404, kind === 'recipe' ? 'Recipe not found' : 'Painter not found');
  const ip = await sha256('report:' + (request.headers.get('CF-Connecting-IP') || ''));
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE ip_hash = ? AND created_at > ?').bind(ip, t - 3600000).first();
  if (c.n >= REPORTS_PER_HOUR) throw new HttpError(429, "Thanks! You've sent a lot of reports this hour, please try again later");
  await env.DB.prepare('INSERT INTO reports (id, kind, target_id, reason, note, reporter_id, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), kind, target, reason, note, u?.id || null, ip, t).run();
  const to = env.FEEDBACK_TO || adminEmails(env)[0];
  if (to) {
    const what = kind === 'recipe' ? `"${row.name}" (${url.origin}/#/recipe/${target})` : kind === 'forum' ? `a forum post in "${row.name}" (${url.origin}/#/forum/t/${row.thread_id})` : kind === 'chat' ? `a chat message in #${row.name} (${url.origin}/#/chat/${row.room_id}?m=${target})` : kind === 'message' ? `a private message from ${row.name}` : `the profile of ${row.name} (${url.origin}/#/u/${target})`;
    try {
      await sendMail(env, to, `[Painters Desk] Report: ${REPORT_REASONS[reason]}`,
        `Someone reported ${what}.\n\nReason: ${REPORT_REASONS[reason]}\n\n${note ? 'Details: ' + note + '\n\n' : ''}Reported by: ${u ? u.name : 'someone not signed in'}`,
        `${url.origin}/#/admin`, 'Open moderation');
    } catch (e) { console.error('Report email failed', e); }
  }
  return json({ ok: true });
}

// Every photo a recipe uses: its cover and step photos.
const usedImages = r => [r.cover, ...JSON.parse(r.steps || '[]').map(s => s.image)].filter(Boolean);

// The admin page: open reports (newest first) and the most recent photos, each with where it is used.
async function moderation(request, env) {
  await requireAdmin(request, env);
  const users = new Map((await env.DB.prepare('SELECT id, name, email, email_verified, avatar_image, blocked, created_at FROM users').all()).results.map(x => [x.id, x]));
  const recipes = (await env.DB.prepare('SELECT id, user_id, title, kind, visibility, cover, steps FROM recipes').all()).results;
  const usedIn = new Map(), add = (img, where) => { if (!usedIn.has(img)) usedIn.set(img, []); usedIn.get(img).push(where); };
  for (const r of recipes) for (const img of new Set(usedImages(r))) add(img, { type: 'recipe', id: r.id, title: r.title, kind: r.kind, visibility: r.visibility });
  for (const x of users.values()) if (x.avatar_image) add(x.avatar_image, { type: 'icon', id: x.id });
  if (await hasCommissions(env)) for (const c of (await env.DB.prepare('SELECT user_id, photos FROM commissions').all()).results)
    for (const img of JSON.parse(c.photos || '[]')) add(img, { type: 'portfolio', id: c.user_id });
  const forum = await hasForum(env);
  if (forum) for (const p of (await env.DB.prepare("SELECT p.thread_id, p.images, t.title FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE p.images != '[]'").all()).results)
    for (const img of JSON.parse(p.images)) add(img, { type: 'forum', id: p.thread_id, title: p.title });
  const chat = await hasChat(env);
  if (chat) for (const m of (await env.DB.prepare("SELECT m.id, m.room_id, m.images, r.name FROM chat_messages m JOIN chat_rooms r ON r.id = m.room_id WHERE m.images != '[]'").all()).results)
    for (const img of JSON.parse(m.images)) add(img, { type: 'chat', id: m.room_id, msg: m.id, title: m.name });
  const person = id => { const x = users.get(id); return x ? { id: x.id, name: x.name, blocked: !!x.blocked, unconfirmed: !!x.email && !x.email_verified, created_at: x.created_at } : { id, name: '(deleted account)', blocked: false }; };
  const imgRow = i => ({ id: i.id, hidden: !!i.hidden, scan: i.scan, size: i.size, created_at: i.created_at, user: person(i.user_id), used: usedIn.get(i.id) || [] });
  const images = (await env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC LIMIT 60').all()).results.map(imgRow);
  const rows = (await env.DB.prepare("SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC LIMIT 100").all()).results;
  const imgById = async ids => ids.length ? (await env.DB.prepare(`SELECT * FROM images WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results.map(imgRow) : [];
  const reports = [];
  for (const r of rows) {
    const o = { id: r.id, kind: r.kind, reason: r.reason, label: REPORT_REASONS[r.reason] || 'Refused at upload', note: r.note, created_at: r.created_at, reporter: r.reporter_id ? person(r.reporter_id) : null };
    if (r.kind === 'recipe') {
      const rec = recipes.find(x => x.id === r.target_id);
      o.target = rec ? { id: rec.id, title: rec.title, kind: rec.kind, visibility: rec.visibility } : null;
      o.user = rec ? person(rec.user_id) : null;
      o.images = rec ? await imgById([...new Set(usedImages(rec))]) : [];
    } else if (r.kind === 'message') {
      const m = await env.DB.prepare('SELECT user_id, body, created_at FROM messages WHERE id = ?').bind(r.target_id).first();
      o.message = m ? { body: m.body, created_at: m.created_at } : null;
      o.user = m?.user_id ? person(m.user_id) : null;
      o.images = [];
    } else if (r.kind === 'forum') {
      const p = forum && await env.DB.prepare('SELECT p.id, p.user_id, p.body, p.images, p.first, p.hidden, p.deleted, p.created_at, t.id AS thread_id, t.title FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE p.id = ?').bind(r.target_id).first();
      o.post = p && !p.deleted ? { id: p.id, body: p.body, first: !!p.first, hidden: !!p.hidden, created_at: p.created_at, thread: { id: p.thread_id, title: p.title } } : null;
      o.user = p?.user_id ? person(p.user_id) : null;
      o.images = o.post ? await imgById(JSON.parse(p.images || '[]')) : [];
    } else if (r.kind === 'chat') {
      const m = chat && await env.DB.prepare('SELECT m.id, m.user_id, m.body, m.images, m.hidden, m.created_at, r.id AS room_id, r.name FROM chat_messages m JOIN chat_rooms r ON r.id = m.room_id WHERE m.id = ?').bind(r.target_id).first();
      o.chat = m ? { id: m.id, body: m.body, hidden: !!m.hidden, created_at: m.created_at, room: { id: m.room_id, name: m.name } } : null;
      o.user = m?.user_id ? person(m.user_id) : null;
      if (o.user && chat) o.user.muted = (await env.DB.prepare('SELECT until FROM chat_mutes WHERE user_id = ? AND until > ?').bind(m.user_id, now()).first())?.until || null;
      o.images = m ? await imgById(JSON.parse(m.images || '[]')) : [];
    } else {
      o.user = person(r.target_id);
      const icon = r.kind === 'user' && users.get(r.target_id)?.avatar_image;
      o.images = icon ? await imgById([icon]) : [];
    }
    reports.push(o);
  }
  return json({ reports, images });
}

// Hide a photo (it stops loading for everyone but admins) or show it again: { hidden: true | false }.
async function hideImage(request, env, id) {
  await requireAdmin(request, env);
  const b = await body(request);
  const r = await env.DB.prepare('UPDATE images SET hidden = ? WHERE id = ?').bind(b.hidden === false ? 0 : 1, id).run();
  if (!r.meta.changes) throw new HttpError(404, 'Photo not found');
  return json({ ok: true, hidden: b.hidden !== false });
}

// Delete a photo for good, and take it out of every recipe and profile that used it.
async function adminDeleteImage(request, env, id) {
  await requireAdmin(request, env);
  if (!IMAGE_ID.test(id)) throw new HttpError(404, 'Photo not found');
  const rows = (await env.DB.prepare('SELECT id, cover, steps FROM recipes WHERE cover = ? OR steps LIKE ?').bind(id, `%"${id}"%`).all()).results;
  const stmts = rows.map(r => env.DB.prepare('UPDATE recipes SET cover = ?, steps = ? WHERE id = ?').bind(
    r.cover === id ? '' : r.cover, JSON.stringify(JSON.parse(r.steps || '[]').map(s => (s.image === id ? { ...s, image: '' } : s))), r.id));
  stmts.push(env.DB.prepare("UPDATE users SET avatar_image = '' WHERE avatar_image = ?").bind(id));
  if (await hasForum(env)) for (const p of (await env.DB.prepare('SELECT id, images FROM forum_posts WHERE images LIKE ?').bind(`%"${id}"%`).all()).results)
    stmts.push(env.DB.prepare('UPDATE forum_posts SET images = ? WHERE id = ?').bind(JSON.stringify(JSON.parse(p.images).filter(i => i !== id)), p.id));
  if (await hasChat(env)) for (const m of (await env.DB.prepare('SELECT id, images FROM chat_messages WHERE images LIKE ?').bind(`%"${id}"%`).all()).results)
    stmts.push(env.DB.prepare('UPDATE chat_messages SET images = ? WHERE id = ?').bind(JSON.stringify(JSON.parse(m.images).filter(i => i !== id)), m.id));
  await env.DB.batch(stmts);
  await deleteImages(env, [id]);
  return json({ ok: true });
}

// Block an account or unblock it: { blocked: true | false }. Blocking makes all its recipes private and hides its
// picture, profile text and comments; it can no longer upload, comment or share. Unblocking doesn't make anything public again.
async function blockUser(request, env, id) {
  const admin = await requireAdmin(request, env), b = await body(request);
  if (id === admin.id) throw new HttpError(400, "You can't block yourself");
  const on = b.blocked !== false, stmts = [env.DB.prepare('UPDATE users SET blocked = ? WHERE id = ?').bind(on ? 1 : 0, id)];
  if (on) stmts.push(env.DB.prepare("UPDATE recipes SET visibility = 'private' WHERE user_id = ?").bind(id));
  const r = await env.DB.batch(stmts);
  if (!r[0].meta.changes) throw new HttpError(404, 'Painter not found');
  return json({ ok: true, blocked: on });
}

// Mark a report as dealt with ({ status: 'done' }) or reopen it ({ status: 'open' }).
async function resolveReport(request, env, id) {
  await requireAdmin(request, env);
  const b = await body(request), done = b.status !== 'open';
  const r = await env.DB.prepare('UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?').bind(done ? 'done' : 'open', done ? now() : null, id).run();
  if (!r.meta.changes) throw new HttpError(404, 'Report not found');
  return json({ ok: true });
}

/* ---------- comments (public recipes, signed-in users) ---------- */

async function addComment(request, env, recipeId) {
  const u = await requireUser(request, env), b = await body(request);
  if (u.blocked) throw new HttpError(403, 'This account has been blocked from commenting');
  const text = str(b.body, 2000, 'Comment', { required: true });
  const r = await env.DB.prepare('SELECT visibility FROM recipes WHERE id = ?').bind(recipeId).first();
  if (!r || r.visibility !== 'public') throw new HttpError(404, 'Recipe not found');
  const last = await env.DB.prepare('SELECT MAX(created_at) AS t FROM comments WHERE user_id = ?').bind(u.id).first();
  if (last?.t && now() - last.t < 10000) throw new HttpError(429, 'Please wait a few seconds before commenting again');
  const id = crypto.randomUUID(), t = now();
  await env.DB.prepare('INSERT INTO comments (id, recipe_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, recipeId, u.id, text, t).run();
  return json({ comment: { id, body: text, created_at: t, author: { id: u.id, name: u.name, avatar: u.avatar } } }, 201);
}

// A comment can be removed by its author, by the recipe's owner, or by an admin.
async function deleteComment(request, env, id) {
  const u = await requireUser(request, env);
  const c = await env.DB.prepare('SELECT c.user_id, r.user_id AS owner FROM comments c JOIN recipes r ON r.id = c.recipe_id WHERE c.id = ?').bind(id).first();
  if (!c || (c.user_id !== u.id && c.owner !== u.id && !u.admin)) throw new HttpError(404, 'Comment not found');
  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

/* ---------- views, upvotes & saves (public recipes) ---------- */

// The page sends this once per browser session per recipe. The author's own visits don't count.
async function addView(request, env, recipeId) {
  const u = await currentUser(request, env);
  await env.DB.prepare("UPDATE recipes SET views = views + 1 WHERE id = ? AND visibility = 'public' AND user_id != ?")
    .bind(recipeId, u?.id || '').run();
  return json({ ok: true });
}

// One upvote per signed-in user; { on: false } takes it back. Authors can't upvote their own.
async function setVote(request, env, recipeId) {
  const u = await requireUser(request, env), b = await body(request);
  const r = await env.DB.prepare('SELECT user_id, visibility FROM recipes WHERE id = ?').bind(recipeId).first();
  if (!r || r.visibility !== 'public') throw new HttpError(404, 'Recipe not found');
  if (r.user_id === u.id) throw new HttpError(400, "You can't upvote your own");
  if (b.on === false) await env.DB.prepare('DELETE FROM votes WHERE recipe_id = ? AND user_id = ?').bind(recipeId, u.id).run();
  else await env.DB.prepare('INSERT OR IGNORE INTO votes (recipe_id, user_id, created_at) VALUES (?, ?, ?)').bind(recipeId, u.id, now()).run();
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes WHERE recipe_id = ?').bind(recipeId).first();
  return json({ votes: c.n, voted: b.on !== false });
}

// Save a public recipe to your "Saved" list; { on: false } removes it.
// Saving also upvotes it (except your own); unsaving leaves the upvote alone.
async function setSave(request, env, recipeId) {
  const u = await requireUser(request, env), b = await body(request);
  if (b.on === false) await env.DB.prepare('DELETE FROM saves WHERE recipe_id = ? AND user_id = ?').bind(recipeId, u.id).run();
  else {
    const r = await env.DB.prepare('SELECT user_id, visibility FROM recipes WHERE id = ?').bind(recipeId).first();
    if (!r || r.visibility !== 'public') throw new HttpError(404, 'Recipe not found');
    const t = now(), stmts = [env.DB.prepare('INSERT OR IGNORE INTO saves (recipe_id, user_id, created_at) VALUES (?, ?, ?)').bind(recipeId, u.id, t)];
    if (r.user_id !== u.id) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO votes (recipe_id, user_id, created_at) VALUES (?, ?, ?)').bind(recipeId, u.id, t));
    await env.DB.batch(stmts);
  }
  const v = await loadRecipe(env, recipeId, u.id);
  return json({ saved: b.on !== false, votes: v?.vote_count || 0, voted: !!v?.voted });
}

/* ---------- commission painters ---------- */

// A painter can add a commission listing to their profile: a pitch, styles, a price guide, turnaround, up to
// COMMISSION_PHOTOS portfolio photos and COMMISSION_LINKS links. Listed painters show in the Commission painters list.
// The contact form emails the painter with Reply-To set to the sender, so neither email is shown on the site.
const COMMISSION_PHOTOS = 12, COMMISSION_LINKS = 4, MESSAGES_PER_HOUR = 5, MESSAGES_PER_DAY = 20;
let commissionsReady = false;
// The tables come with migration 0013. Until it is applied, listings are simply missing instead of breaking profiles.
async function hasCommissions(env) {
  if (!commissionsReady) commissionsReady = !!(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'commissions'").first());
  return commissionsReady;
}
async function needCommissions(env) {
  if (!await hasCommissions(env)) throw new HttpError(503, 'Commission listings are not set up on this server yet');
}

// Hidden photos are left out for everyone, so a moderator hiding one doesn't leave a broken picture in the gallery.
async function visiblePhotos(env, ids) {
  if (!ids.length) return [];
  const hidden = new Set((await env.DB.prepare(`SELECT id FROM images WHERE hidden = 1 AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results.map(r => r.id));
  return ids.filter(id => !hidden.has(id));
}

const commissionOut = (c, photos, contact) => ({
  open: !!c.open, pitch: c.pitch, styles: c.styles, price: c.price, turnaround: c.turnaround,
  links: JSON.parse(c.links || '[]'), photos, contact, updated_at: c.updated_at,
});

// The form only shows when the painter turned it on, their email is confirmed and the site can send email.
const canContact = (env, c) => !!c.contact && !!c.email && !!c.email_verified && mailReady(env);

// The listing shown on a public profile, or null when the painter isn't listed.
async function commissionFor(env, id) {
  if (!await hasCommissions(env)) return null;
  const c = await env.DB.prepare('SELECT c.*, u.email, u.email_verified FROM commissions c JOIN users u ON u.id = c.user_id WHERE c.user_id = ? AND c.listed = 1').bind(id).first();
  if (!c) return null;
  return commissionOut(c, await visiblePhotos(env, JSON.parse(c.photos || '[]')), canContact(env, c));
}

// GET /api/painters?open=1&q=: listed painters, the ones taking work first, then the most recently updated.
async function listPainters(request, env, url) {
  if (!await hasCommissions(env)) return json({ painters: [] });
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100).replace(/[%_]/g, ''), open = url.searchParams.get('open') === '1';
  const where = ['c.listed = 1', 'u.blocked = 0'], args = [];
  if (open) where.push('c.open = 1');
  if (q) { where.push('(u.name LIKE ? OR c.pitch LIKE ? OR c.styles LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = (await env.DB.prepare(
    `SELECT c.*, u.id AS uid, u.name, ${AVATAR} AS avatar, u.email, u.email_verified,
       (SELECT COUNT(*) FROM recipes r WHERE r.user_id = u.id AND r.visibility = 'public' AND r.kind = 'tutorial') AS tutorials
     FROM commissions c JOIN users u ON u.id = c.user_id WHERE ${where.join(' AND ')} ORDER BY c.open DESC, c.updated_at DESC LIMIT 100`
  ).bind(...args).all()).results;
  const shown = new Set(await visiblePhotos(env, rows.flatMap(r => JSON.parse(r.photos || '[]'))));
  return json({
    painters: rows.map(r => ({
      id: r.uid, name: r.name, avatar: r.avatar, tutorials: r.tutorials,
      ...commissionOut(r, JSON.parse(r.photos || '[]').filter(id => shown.has(id)), canContact(env, r)),
    })),
  });
}

// The signed-in painter's own listing, for the account page (also when it isn't listed).
async function getCommission(request, env) {
  const u = await requireUser(request, env);
  if (!await hasCommissions(env)) return json({ commission: null, unavailable: true });
  const c = await env.DB.prepare('SELECT * FROM commissions WHERE user_id = ?').bind(u.id).first();
  return json({
    commission: c ? { listed: !!c.listed, ...commissionOut(c, JSON.parse(c.photos || '[]'), !!c.contact) } : null,
    // Why the contact form wouldn't show yet, if it wouldn't.
    contactIssue: !mailReady(env) ? 'mail' : !u.email ? 'noemail' : !u.email_verified ? 'unconfirmed' : '',
  });
}

async function saveCommission(request, env) {
  const u = await requireUser(request, env), b = await body(request);
  await needCommissions(env);
  const listed = !!b.listed;
  if (listed && u.blocked) throw new HttpError(403, 'This account has been blocked from sharing publicly');
  const pitch = str(b.pitch, 1500, 'About your commissions'), styles = str(b.styles, 200, 'Styles'),
    price = str(b.price, 200, 'Prices'), turnaround = str(b.turnaround, 100, 'Turnaround');
  const links = [...new Set((Array.isArray(b.links) ? b.links : []).map(l => str(l, 300, 'Link')).filter(Boolean))];
  if (links.length > COMMISSION_LINKS) throw new HttpError(400, `Up to ${COMMISSION_LINKS} links`);
  for (const l of links) if (!/^https?:\/\/[^\s/]+\.\S+$/i.test(l)) throw new HttpError(400, 'Each link must be a web address starting with https://');
  const photos = [...new Set((Array.isArray(b.photos) ? b.photos : []).filter(id => typeof id === 'string'))];
  if (photos.length > COMMISSION_PHOTOS) throw new HttpError(400, `Up to ${COMMISSION_PHOTOS} photos`);
  if (photos.some(id => !IMAGE_ID.test(id))) throw new HttpError(400, 'Bad photo');
  await checkImagesOwned(env, u, photos);
  if (listed && !photos.length) throw new HttpError(400, 'Add at least one photo of your work to be listed');
  if (listed && !pitch) throw new HttpError(400, 'Write a few words about your commissions to be listed');
  const old = await env.DB.prepare('SELECT photos FROM commissions WHERE user_id = ?').bind(u.id).first(), t = now();
  await env.DB.prepare(`INSERT INTO commissions (user_id, listed, open, pitch, styles, price, turnaround, links, photos, contact, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET listed = excluded.listed, open = excluded.open, pitch = excluded.pitch, styles = excluded.styles,
      price = excluded.price, turnaround = excluded.turnaround, links = excluded.links, photos = excluded.photos, contact = excluded.contact, updated_at = excluded.updated_at`)
    .bind(u.id, listed ? 1 : 0, b.open === false ? 0 : 1, pitch, styles, price, turnaround, JSON.stringify(links), JSON.stringify(photos), b.contact === false ? 0 : 1, t, t).run();
  // Photos taken out of the portfolio are deleted, unless the painter also uses them as their icon or in a recipe.
  const gone = JSON.parse(old?.photos || '[]').filter(id => !photos.includes(id) && id !== u.avatar_image);
  if (gone.length) {
    const used = new Set((await env.DB.prepare('SELECT cover, steps FROM recipes WHERE user_id = ?').bind(u.id).all()).results.flatMap(usedImages));
    await deleteImages(env, gone.filter(id => !used.has(id)));
  }
  return getCommission(request, env);
}

// POST /api/painters/:id/message { message, website }: the contact form. The sender must be signed in with a
// confirmed email (it becomes the Reply-To, so it has to be theirs), and can send MESSAGES_PER_HOUR an hour.
async function messagePainter(request, env, url, id) {
  const u = await requireUser(request, env), b = await body(request);
  if (b.website) return json({ ok: true });
  await needCommissions(env);
  if (u.blocked) throw new HttpError(403, 'This account has been blocked from sending messages');
  if (!u.email || !u.email_verified) throw new HttpError(403, 'Please confirm your email first, so the painter can reply to you. You can send the confirmation email from your account page.');
  if (id === u.id) throw new HttpError(400, "You can't message yourself");
  const message = str(b.message, 3000, 'Message', { required: true });
  if (message.length < 20) throw new HttpError(400, 'Please say a little more about what you would like painted');
  const c = await env.DB.prepare('SELECT c.*, u.email, u.email_verified, u.blocked FROM commissions c JOIN users u ON u.id = c.user_id WHERE c.user_id = ? AND c.listed = 1').bind(id).first();
  if (!c || c.blocked) throw new HttpError(404, 'Painter not found');
  if (!canContact(env, c)) throw new HttpError(400, "This painter isn't taking messages through the site. Try the links on their profile.");
  const t = now();
  const n = await env.DB.prepare('SELECT COALESCE(SUM(created_at > ?), 0) AS hour, COUNT(*) AS day FROM commission_messages WHERE sender_id = ? AND created_at > ?').bind(t - 3600000, u.id, t - 86400000).first();
  if (n.hour >= MESSAGES_PER_HOUR || n.day >= MESSAGES_PER_DAY) throw new HttpError(429, "You've sent a lot of messages recently, please try again later");
  await sendMail(env, c.email, `Commission enquiry from ${u.name} on The Painters Desk`,
    `${u.name} sent you a message from your commission listing on The Painters Desk.\n\n${message}\n\nReply to this email to answer them: your reply goes straight to their email address, and they will see yours. If this message breaks the site rules, use Report on their profile.`,
    `${url.origin}/#/u/${u.id}`, 'See their profile', u.email);
  await env.DB.prepare('INSERT INTO commission_messages (id, painter_id, sender_id, message, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), id, u.id, message, t).run();
  return json({ ok: true });
}

/* ---------- following ---------- */

// The table comes with migration 0017. Until it is applied the Follow button and the Following lists are hidden.
// A painter can follow FOLLOWS_PER_DAY painters a day, so following can't be used to spam people's follower counts.
const FOLLOWS_PER_DAY = 100;
let followsReady = false;
async function hasFollows(env) {
  if (!followsReady) followsReady = !!(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'follows'").first());
  return followsReady;
}

// Follower counts for a profile, and whether the viewer follows them.
async function followInfo(env, id, viewer) {
  if (!await hasFollows(env)) return null;
  const r = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM follows WHERE followed_id = ?1) AS followers, (SELECT COUNT(*) FROM follows WHERE user_id = ?1) AS following, (SELECT COUNT(*) FROM follows WHERE user_id = ?2 AND followed_id = ?1) AS mine').bind(id, viewer?.id || '').first();
  return { followers: r.followers, following: r.following, followed: !!r.mine };
}

// PUT /api/follows/:id { on }: follow or unfollow a painter.
async function setFollow(request, env, id) {
  const u = await requireUser(request, env), b = await body(request);
  if (!await hasFollows(env)) throw new HttpError(503, 'Following is not set up on this server yet');
  if (b.on === false) await env.DB.prepare('DELETE FROM follows WHERE user_id = ? AND followed_id = ?').bind(u.id, id).run();
  else {
    if (id === u.id) throw new HttpError(400, "You can't follow yourself");
    const o = await env.DB.prepare('SELECT name, blocked FROM users WHERE id = ?').bind(id).first();
    if (!o || o.blocked) throw new HttpError(404, 'Painter not found');
    // Someone who blocked you (or whom you blocked) can't be followed. It reads like any other refusal.
    if (await hasMessages(env) && await env.DB.prepare('SELECT 1 FROM user_blocks WHERE (user_id = ?1 AND blocked_id = ?2) OR (user_id = ?2 AND blocked_id = ?1)').bind(u.id, id).first())
      throw new HttpError(403, `You can't follow ${o.name}.`);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM follows WHERE user_id = ? AND created_at > ?').bind(u.id, now() - 86400000).first();
    if (n.n >= FOLLOWS_PER_DAY) throw new HttpError(429, "You've followed a lot of painters today, please try again tomorrow");
    await env.DB.prepare('INSERT OR IGNORE INTO follows (user_id, followed_id, created_at) VALUES (?, ?, ?)').bind(u.id, id, now()).run();
  }
  return json(await followInfo(env, id, u));
}

/* ---------- the Painters list ---------- */

// The column comes with migration 0016. Until it is applied everyone is listed and the setting to hide is missing.
let findableReady = false;
async function hasFindable(env) {
  if (!findableReady) findableReady = !!(await env.DB.prepare("SELECT 1 FROM pragma_table_info('users') WHERE name = 'findable'").first());
  return findableReady;
}

// GET /api/people?q=&sort=active|new&offset=: painters to find and message, PEOPLE_PAGE at a time. Blocked accounts,
// sign-ups that never confirmed their email, and people who turned the list off are left out.
// rel=following|followers (signed in): only the painters you follow, or who follow you, including ones not in the list.
// active: the most public recipes, tutorials and palettes first, then the most recently active.
const PEOPLE_PAGE = 48;
async function listPeople(request, env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60).replace(/[%_]/g, '');
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'active';
  const offset = Math.max(0, Math.min(5000, parseInt(url.searchParams.get('offset'), 10) || 0));
  const where = ['u.blocked = 0', "(u.email IS NULL OR u.email = '' OR u.email_verified = 1)"], args = [];
  const rel = ['following', 'followers'].includes(url.searchParams.get('rel')) ? url.searchParams.get('rel') : '';
  if (rel) {
    const me = await requireUser(request, env);
    if (!await hasFollows(env)) return json({ people: [], more: false });
    where.push(rel === 'following' ? 'u.id IN (SELECT followed_id FROM follows WHERE user_id = ?)' : 'u.id IN (SELECT user_id FROM follows WHERE followed_id = ?)');
    args.push(me.id);
  } else if (await hasFindable(env)) where.push('u.findable = 1');
  if (q) { where.push('u.name LIKE ?'); args.push(`%${q}%`); }
  const listed = await hasCommissions(env) ? '(SELECT c.listed FROM commissions c WHERE c.user_id = u.id)' : '0';
  const rows = (await env.DB.prepare(
    `SELECT u.id, u.name, ${AVATAR} AS avatar, u.bio, u.created_at, ${listed} AS commissions,
       SUM(r.kind = 'tutorial') AS tutorials, SUM(r.kind = 'recipe') AS recipes, SUM(r.kind = 'palette') AS palettes,
       COUNT(r.id) AS works, MAX(r.updated_at) AS active_at
     FROM users u LEFT JOIN recipes r ON r.user_id = u.id AND r.visibility = 'public'
     WHERE ${where.join(' AND ')} GROUP BY u.id
     ORDER BY ${sort === 'new' ? 'u.created_at DESC' : 'works DESC, COALESCE(active_at, u.created_at) DESC'} LIMIT ? OFFSET ?`
  ).bind(...args, PEOPLE_PAGE + 1, offset).all()).results;
  return json({
    people: rows.slice(0, PEOPLE_PAGE).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, bio: (p.bio || '').slice(0, 160), created_at: p.created_at,
      tutorials: p.tutorials || 0, recipes: p.recipes || 0, palettes: p.palettes || 0, commissions: !!p.commissions,
    })),
    more: rows.length > PEOPLE_PAGE,
  });
}

// PUT /api/me/findable { on }: show me in the Painters list and its search, or not.
async function setFindable(request, env) {
  const u = await requireUser(request, env), b = await body(request);
  if (!await hasFindable(env)) throw new HttpError(503, 'This setting is not available on this server yet');
  await env.DB.prepare('UPDATE users SET findable = ? WHERE id = ?').bind(b.on === false ? 0 : 1, u.id).run();
  return json({ user: await currentUser(request, env) });
}

/* ---------- messages: feedback replies and messages between painters ---------- */

// Conversations live in migration 0015 (see it for what each column means). Until it is applied, Feedback still
// works as before and the Messages pages stay hidden.
// MSG_MAX characters a message. Painters can send DM_PER_HOUR / DM_PER_DAY messages and start NEW_CHATS_PER_DAY
// conversations a day, and only UNANSWERED messages to someone who hasn't replied yet, so nobody can be flooded.
// Anonymous feedback senders can write ANON_PER_HOUR follow-ups an hour (by IP).
const MSG_MAX = 2000, DM_PER_HOUR = 30, DM_PER_DAY = 200, NEW_CHATS_PER_DAY = 10, UNANSWERED = 3, ANON_PER_HOUR = 10;
const TEAM = { id: null, name: 'The Painters Desk team', avatar: '/icons/icon-192.png', team: true };
let messagesReady = false;
async function hasMessages(env) {
  if (!messagesReady) messagesReady = !!(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'conversations'").first());
  return messagesReady;
}
async function needMessages(env) {
  if (!await hasMessages(env)) throw new HttpError(503, 'Messages are not set up on this server yet');
}

// Someone who sends feedback without signing in gets a random token kept in their browser (sent as X-Pd-Token),
// so the replies can find their way back to them. Only its hash is stored.
async function anonToken(request) {
  const t = request.headers.get('X-Pd-Token') || '';
  return /^[\w-]{32,100}$/.test(t) ? sha256('fbtoken:' + t) : '';
}

// Which side of a conversation the viewer is on ('a', 'b' or null). Admins are side b of every feedback conversation.
function sideOf(c, u, token) {
  if (u && c.a_id === u.id) return 'a';
  if (!c.a_id && token && c.a_token === token) return 'a';
  if (c.kind === 'direct' && u && c.b_id === u.id) return 'b';
  if (c.kind === 'feedback' && u?.admin) return 'b';
  return null;
}

// The picture SQL for a users table joined under another name.
const avatarAs = alias => AVATAR.replace(/\bu\./g, alias + '.');
const CONV_SELECT = `SELECT c.*, f.kind AS fb_kind, f.page AS fb_page, f.email AS fb_email,
  ua.name AS a_name, ${avatarAs('ua')} AS a_avatar, ua.blocked AS a_blocked, ub.name AS b_name, ${avatarAs('ub')} AS b_avatar, ub.blocked AS b_blocked,
  (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
  (SELECT side FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_side
  FROM conversations c LEFT JOIN feedback f ON f.id = c.feedback_id LEFT JOIN users ua ON ua.id = c.a_id LEFT JOIN users ub ON ub.id = c.b_id`;

const personOf = (c, s) => c[s + '_id']
  ? (c[s + '_name'] != null ? { id: c[s + '_id'], name: c[s + '_name'], avatar: c[s + '_avatar'], blocked: !!c[s + '_blocked'] } : { id: c[s + '_id'], name: '(deleted account)', avatar: null, gone: true })
  : null;

// A conversation as the viewer on `side` sees it. The team sees who sent feedback (and the email they gave);
// the sender only ever sees "The Painters Desk team", never which admin answered.
function convOut(c, side) {
  const other = side === 'a' ? 'b' : 'a';
  let who;
  if (c.kind === 'feedback') who = side === 'a' ? TEAM : personOf(c, 'a') || { id: null, name: 'Someone not signed in', avatar: null, anon: true };
  else who = personOf(c, other);
  const out = {
    id: c.id, kind: c.kind, other: who, status: c.status, updated_at: c.updated_at,
    last: c.last_body == null ? null : { body: c.last_body.slice(0, 140), mine: c.last_side === side },
    unread: c[other + '_last'] > c[side + '_read'],
  };
  if (c.kind === 'feedback') {
    out.feedback = { kind: FEEDBACK_KINDS[c.fb_kind] || 'Feedback', page: side === 'b' ? c.fb_page || '' : '' };
    if (side === 'b') { out.feedback.email = c.fb_email || ''; out.feedback.onSite = !!(c.a_id || c.a_token); }
  }
  return out;
}

// GET /api/inbox: the viewer's conversations, newest first. ?team=1 (admins): every feedback conversation, open ones first.
async function inbox(request, env, url) {
  if (!await hasMessages(env)) return json({ conversations: [], unavailable: true });
  const u = await currentUser(request, env), token = await anonToken(request);
  if (url.searchParams.get('team') === '1') {
    if (!u?.admin) throw new HttpError(403, 'Admins only');
    const rows = (await env.DB.prepare(`${CONV_SELECT} WHERE c.kind = 'feedback' ORDER BY c.status = 'open' DESC, c.updated_at DESC LIMIT 200`).all()).results;
    return json({ conversations: rows.map(c => convOut(c, 'b')) });
  }
  if (!u && !token) return json({ conversations: [] });
  const rows = (await env.DB.prepare(`${CONV_SELECT} WHERE (c.a_id = ?1 AND c.a_hidden = 0) OR (c.kind = 'direct' AND c.b_id = ?1 AND c.b_hidden = 0)
    OR (c.a_id IS NULL AND ?2 != '' AND c.a_token = ?2 AND c.a_hidden = 0) ORDER BY c.updated_at DESC LIMIT 200`).bind(u?.id || '', token).all()).results;
  return json({ conversations: rows.map(c => convOut(c, sideOf(c, u, token))) });
}

// GET /api/inbox/unread: how many conversations have something new, for the badge on Messages (and, for admins,
// how many open feedback conversations are waiting on the team, how many followed forum threads have new replies,
// and how many chat messages @mention the viewer that they haven't seen).
async function unreadCount(request, env) {
  if (!await hasMessages(env)) return json({ n: 0, team: 0, unavailable: true });
  const u = await currentUser(request, env), token = await anonToken(request);
  if (!u && !token) return json({ n: 0, team: 0 });
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM conversations WHERE (a_id = ?1 AND a_hidden = 0 AND b_last > a_read)
    OR (kind = 'direct' AND b_id = ?1 AND b_hidden = 0 AND a_last > b_read) OR (a_id IS NULL AND ?2 != '' AND a_token = ?2 AND b_last > a_read)`).bind(u?.id || '', token).first();
  const team = u?.admin ? (await env.DB.prepare("SELECT COUNT(*) AS n FROM conversations WHERE kind = 'feedback' AND status = 'open' AND a_last > b_read").first()).n : 0;
  const forum = u && await hasForum(env) ? (await env.DB.prepare(`SELECT COUNT(*) AS n FROM forum_follows f JOIN forum_threads t ON t.id = f.thread_id
    WHERE f.user_id = ? AND t.last_at > f.read_at`).bind(u.id).first()).n : 0;
  const chat = u && await hasChat(env) ? (await env.DB.prepare(`SELECT COUNT(*) AS n FROM chat_mentions n JOIN chat_messages m ON m.id = n.message_id
    LEFT JOIN users u ON u.id = m.user_id WHERE n.user_id = ? AND n.read = 0 AND ${CHAT_SHOWN}`).bind(u.id).first()).n : 0;
  return json({ n: r.n, team, forum, chat });
}

// Whether u can message painter id, and if not, why. Returns { other, why } (why is '' when they can).
async function directCheck(env, u, id) {
  const o = await env.DB.prepare(`SELECT u.id, u.name, ${AVATAR} AS avatar, u.blocked, u.dm FROM users u WHERE u.id = ?`).bind(id).first();
  if (!o) throw new HttpError(404, 'Painter not found');
  const other = { id: o.id, name: o.name, avatar: o.avatar };
  if (o.id === u.id) return { other, why: "You can't message yourself" };
  if (u.blocked) return { other, why: 'This account has been blocked from sending messages' };
  if (u.email && !u.email_verified) return { other, why: 'Please confirm your email first. You can send the confirmation email from your account page.' };
  if (o.blocked) return { other, why: `${o.name} can't get messages right now.` };
  const blocks = (await env.DB.prepare('SELECT user_id FROM user_blocks WHERE (user_id = ?1 AND blocked_id = ?2) OR (user_id = ?2 AND blocked_id = ?1)').bind(u.id, o.id).all()).results;
  if (blocks.some(b => b.user_id === u.id)) return { other, why: `You've blocked ${o.name}. Unblock them to send a message.`, blockedByMe: true };
  // Being blocked reads the same as having messages turned off, so nobody learns that they were blocked.
  if (blocks.length) return { other, why: `${o.name} isn't taking messages right now.` };
  return { other, why: '', dm: !!o.dm };
}

const pairOf = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);

async function loadConversation(env, id) {
  const c = await env.DB.prepare(`${CONV_SELECT} WHERE c.id = ?`).bind(id).first();
  if (!c) throw new HttpError(404, 'Conversation not found');
  return c;
}

// Can this side write in this conversation? Returns '' or the reason they can't.
async function replyIssue(env, c, side, u) {
  if (c.kind === 'feedback') {
    if (side === 'b' && !c.a_id && !c.a_token && !c.fb_email) return "This was sent without signing in or an email, before replies on the site existed, so a reply can't reach them.";
    if (side === 'b' && c.a_id && c.a_name == null) return 'This person has deleted their account.';
    return '';
  }
  const otherId = c[(side === 'a' ? 'b' : 'a') + '_id'];
  const r = await directCheck(env, u, otherId).catch(e => ({ why: e.status === 404 ? 'This painter has deleted their account.' : e.message }));
  return r.why;
}

// GET /api/conversations/:id: the messages (newest 300), and marks the conversation read for the viewer.
async function getConversation(request, env, id) {
  await needMessages(env);
  const u = await currentUser(request, env), token = await anonToken(request);
  const c = await loadConversation(env, id), side = sideOf(c, u, token);
  if (!side) throw new HttpError(404, 'Conversation not found');
  const rows = (await env.DB.prepare('SELECT id, side, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 300').bind(id).all()).results.reverse();
  await env.DB.prepare(`UPDATE conversations SET ${side}_read = ? WHERE id = ?`).bind(now(), id).run();
  const why = await replyIssue(env, c, side, u);
  let blockedByMe = false;
  if (c.kind === 'direct') blockedByMe = !!(await env.DB.prepare('SELECT 1 FROM user_blocks WHERE user_id = ? AND blocked_id = ?').bind(u.id, c[(side === 'a' ? 'b' : 'a') + '_id']).first());
  const out = convOut(c, side);
  out.unread = false;
  return json({ conversation: out, side, why, blockedByMe, messages: rows.map(m => ({ id: m.id, mine: m.side === side, body: m.body, created_at: m.created_at })) });
}

// Add a message from `side`, after the limits for that kind of sender, then email the other side if they want that.
async function addMessage(request, env, url, c, side, u, b) {
  const text = str(b.message, MSG_MAX, 'Message', { required: true }), t = now(), other = side === 'a' ? 'b' : 'a';
  const why = await replyIssue(env, c, side, u);
  if (why) throw new HttpError(403, why);
  let ip = '';
  if (!u) {
    ip = await sha256('feedback:' + (request.headers.get('CF-Connecting-IP') || ''));
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND created_at > ?').bind(ip, t - 3600000).first();
    if (n.n >= ANON_PER_HOUR) throw new HttpError(429, "You've sent a lot of messages this hour, please try again later");
  } else if (!(c.kind === 'feedback' && side === 'b')) {
    const n = await env.DB.prepare('SELECT COALESCE(SUM(created_at > ?), 0) AS hour, COUNT(*) AS day FROM messages WHERE user_id = ? AND created_at > ?').bind(t - 3600000, u.id, t - 86400000).first();
    if (n.hour >= DM_PER_HOUR || n.day >= DM_PER_DAY) throw new HttpError(429, "You've sent a lot of messages recently, please try again later");
  }
  if (c.kind === 'direct' && !c[other + '_last']) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND side = ?').bind(c.id, side).first();
    if (n.n >= UNANSWERED) throw new HttpError(429, `Please wait for ${c[other + '_name']} to reply before sending more.`);
  }
  // A feedback sender writing again reopens it for the team.
  const status = c.kind === 'feedback' && side === 'a' ? 'open' : c.status;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO messages (id, conversation_id, side, user_id, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.id, side, u?.id || null, text, ip, t),
    env.DB.prepare(`UPDATE conversations SET ${side}_last = ?1, ${side}_read = ?1, ${side}_hidden = 0, ${other}_hidden = 0, status = ?2, updated_at = ?1 WHERE id = ?3`).bind(t, status, c.id),
  ]);
  await notify(env, url, c, side, u, text, t);
  return json({ ok: true, id: c.id });
}

// Emails about new messages. To keep inboxes quiet, someone gets one email per conversation until they open it again
// (except a reply to an anonymous feedback sender, which can only reach them by email, so each reply is sent).
async function notify(env, url, c, side, u, text, t) {
  if (!mailReady(env)) return;
  const other = side === 'a' ? 'b' : 'a', link = `${url.origin}/#/inbox/${c.id}`;
  const fresh = c[other + '_mailed'] <= c[other + '_read'];
  let to = '', subject, body, button = 'Read it', always = false;
  if (c.kind === 'feedback' && side === 'a') {
    to = env.FEEDBACK_TO || adminEmails(env)[0];
    subject = `[Painters Desk] Reply to feedback from ${u ? u.name : 'someone not signed in'}`;
    body = `${u ? u.name : 'Someone who isn\'t signed in'} answered on their feedback:\n\n${text}`;
    button = 'Reply on the site';
  } else {
    const r = c[other + '_id'] ? await env.DB.prepare('SELECT name, email, email_verified, dm_mail FROM users WHERE id = ?').bind(c[other + '_id']).first() : null;
    if (r && r.dm_mail && r.email && r.email_verified) to = r.email;
    if (c.kind === 'feedback') {
      subject = 'The Painters Desk team replied to your feedback';
      if (to) body = `Hi ${r.name},\n\nWe replied to the feedback you sent. Open your messages on The Painters Desk to read it and answer.\n\nYou can turn these emails off on your account page.`;
      else if (c.fb_email && (!r || !r.email_verified)) {
        // They gave this address for a reply, so the reply itself goes in the email.
        to = c.fb_email; always = true;
        body = `Thanks for your feedback. Here is our reply:\n\n${text}\n\nYou can also answer on the site, in Messages, from the browser you sent your feedback with.`;
        button = 'Open The Painters Desk';
      }
    } else {
      subject = `${u.name} sent you a message on The Painters Desk`;
      body = `${u.name} sent you a message. Open your messages on The Painters Desk to read it and reply.\n\nYou can turn these emails off, stop people starting conversations with you, or block someone, on your account page and in the conversation.`;
    }
  }
  if (!to || (!fresh && !always)) return;
  try {
    await sendMail(env, to, subject, body, link, button);
    await env.DB.prepare(`UPDATE conversations SET ${other}_mailed = ? WHERE id = ?`).bind(t, c.id).run();
  } catch (e) { console.error('Message email failed', e); }
}

// POST /api/conversations/:id { message }: reply in a conversation.
async function replyConversation(request, env, url, id) {
  await needMessages(env);
  const b = await body(request);
  if (b.website) return json({ ok: true });
  const u = await currentUser(request, env), token = await anonToken(request);
  const c = await loadConversation(env, id), side = sideOf(c, u, token);
  if (!side) throw new HttpError(404, 'Conversation not found');
  return addMessage(request, env, url, c, side, u, b);
}

// PUT /api/conversations/:id { hidden: true } deletes it from the viewer's inbox (until a new message comes);
// { status: 'done' | 'open' } marks feedback as dealt with (team only).
async function updateConversation(request, env, id) {
  await needMessages(env);
  const b = await body(request), u = await currentUser(request, env), token = await anonToken(request);
  const c = await loadConversation(env, id), side = sideOf(c, u, token);
  if (!side) throw new HttpError(404, 'Conversation not found');
  if (b.status !== undefined) {
    if (c.kind !== 'feedback' || side !== 'b') throw new HttpError(403, 'Admins only');
    await env.DB.prepare('UPDATE conversations SET status = ? WHERE id = ?').bind(b.status === 'open' ? 'open' : 'done', id).run();
  }
  if (b.hidden !== undefined && !(c.kind === 'feedback' && side === 'b'))
    await env.DB.prepare(`UPDATE conversations SET ${side}_hidden = ? WHERE id = ?`).bind(b.hidden ? 1 : 0, id).run();
  return json({ ok: true });
}

// GET /api/conversations/with/:userId: the conversation with that painter if there is one, and whether a message can be sent.
async function conversationWith(request, env, id) {
  await needMessages(env);
  const u = await requireUser(request, env), r = await directCheck(env, u, id);
  const c = await env.DB.prepare('SELECT id FROM conversations WHERE pair = ?').bind(pairOf(u.id, id)).first();
  const why = r.why || (!c && !r.dm ? `${r.other.name} isn't taking new messages right now.` : '');
  return json({ id: c?.id || null, other: r.other, why, blockedByMe: !!r.blockedByMe });
}

// POST /api/conversations/with/:userId { message }: message a painter, starting the conversation if needed.
async function messageUser(request, env, url, id) {
  await needMessages(env);
  const u = await requireUser(request, env), b = await body(request);
  if (b.website) return json({ ok: true });
  const pair = pairOf(u.id, id);
  let c = await env.DB.prepare('SELECT id FROM conversations WHERE pair = ?').bind(pair).first();
  if (!c) {
    const r = await directCheck(env, u, id);
    if (r.why) throw new HttpError(403, r.why);
    if (!r.dm) throw new HttpError(403, `${r.other.name} isn't taking new messages right now.`);
    str(b.message, MSG_MAX, 'Message', { required: true });
    const t = now();
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM conversations WHERE kind = 'direct' AND a_id = ? AND created_at > ?").bind(u.id, t - 86400000).first();
    if (n.n >= NEW_CHATS_PER_DAY) throw new HttpError(429, "You've started a lot of conversations today, please try again tomorrow");
    await env.DB.prepare("INSERT OR IGNORE INTO conversations (id, kind, a_id, b_id, pair, created_at, updated_at) VALUES (?, 'direct', ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), u.id, id, pair, t, t).run();
    c = await env.DB.prepare('SELECT id FROM conversations WHERE pair = ?').bind(pair).first();
  }
  const full = await loadConversation(env, c.id);
  return addMessage(request, env, url, full, sideOf(full, u, ''), u, b);
}

// GET /api/blocks: the painters the user blocked. PUT /api/blocks/:id { blocked }: block or unblock one.
async function listBlocks(request, env) {
  const u = await requireUser(request, env);
  if (!await hasMessages(env)) return json({ blocks: [] });
  const rows = (await env.DB.prepare(`SELECT u.id, u.name, ${AVATAR} AS avatar FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY b.created_at DESC`).bind(u.id).all()).results;
  return json({ blocks: rows });
}
async function setBlock(request, env, id) {
  await needMessages(env);
  const u = await requireUser(request, env), b = await body(request);
  if (id === u.id) throw new HttpError(400, "You can't block yourself");
  if (!await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(id).first()) throw new HttpError(404, 'Painter not found');
  if (b.blocked === false) await env.DB.prepare('DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?').bind(u.id, id).run();
  else {
    await env.DB.prepare('INSERT OR IGNORE INTO user_blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(u.id, id, now()).run();
    // Blocking someone also ends following either way.
    if (await hasFollows(env)) await env.DB.prepare('DELETE FROM follows WHERE (user_id = ?1 AND followed_id = ?2) OR (user_id = ?2 AND followed_id = ?1)').bind(u.id, id).run();
  }
  return json({ ok: true, blocked: b.blocked !== false });
}

// PUT /api/me/messages { dm, dm_mail }: whether painters can start conversations with me, and whether I get emails about messages.
async function setMessagePrefs(request, env) {
  await needMessages(env);
  const u = await requireUser(request, env), b = await body(request);
  await env.DB.prepare('UPDATE users SET dm = ?, dm_mail = ? WHERE id = ?').bind(b.dm === false ? 0 : 1, b.dm_mail === false ? 0 : 1, u.id).run();
  return json({ user: await currentUser(request, env) });
}

// POST /api/inbox/claim: after signing in, feedback sent from this browser while signed out moves to the account.
async function claimInbox(request, env) {
  const u = await requireUser(request, env), token = await anonToken(request);
  if (!token || !await hasMessages(env)) return json({ ok: true, moved: 0 });
  const ids = (await env.DB.prepare("SELECT id, feedback_id FROM conversations WHERE a_id IS NULL AND a_token = ? AND kind = 'feedback'").bind(token).all()).results;
  if (ids.length) await env.DB.batch(ids.flatMap(c => [
    env.DB.prepare("UPDATE conversations SET a_id = ?, a_token = '' WHERE id = ?").bind(u.id, c.id),
    env.DB.prepare("UPDATE messages SET user_id = ? WHERE conversation_id = ? AND side = 'a'").bind(u.id, c.id),
    env.DB.prepare('UPDATE feedback SET user_id = ? WHERE id = ?').bind(u.id, c.feedback_id),
  ]));
  return json({ ok: true, moved: ids.length });
}

/* ---------- forum ---------- */

// Categories, threads and posts live in migration 0018 (see it for what each column means). Until it is applied the
// Forum page says it isn't open yet.
// A post is up to POST_MAX characters with FORUM_PHOTOS photos, FORUM_PAINTS paints and FORUM_RECIPES public recipes.
// Members can start THREADS_PER_HOUR / THREADS_PER_DAY threads and write POSTS_PER_HOUR / POSTS_PER_DAY posts,
// POST_GAP apart, and suggest SUGGESTIONS_PER_DAY categories. A reply emails at most FORUM_MAILS followers.
const POST_MAX = 8000, TITLE_MAX = 120, FORUM_PHOTOS = 6, FORUM_PAINTS = 12, FORUM_RECIPES = 3;
const THREADS_PER_HOUR = 5, THREADS_PER_DAY = 20, POSTS_PER_HOUR = 30, POSTS_PER_DAY = 200, POST_GAP = 10000, SUGGESTIONS_PER_DAY = 3;
const THREAD_PAGE = 30, THREAD_POSTS = 500, FORUM_MAILS = 50;
let forumReady = false;
async function hasForum(env) {
  if (!forumReady) forumReady = !!(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'forum_threads'").first());
  return forumReady;
}
async function needForum(env) {
  if (!await hasForum(env)) throw new HttpError(503, 'The forum is not open on this server yet');
}

// Blocked accounts and sign-ups that never confirmed their email can read but not write.
function forumWriter(u) {
  if (u.blocked) throw new HttpError(403, 'This account has been blocked from posting');
  if (u.email && !u.email_verified) throw new HttpError(403, 'Please confirm your email first. You can send the confirmation email from your account page.');
}

async function forumLimits(env, u, newThread) {
  const t = now();
  const n = await env.DB.prepare(`SELECT COALESCE(SUM(created_at > ?1), 0) AS hour, COUNT(*) AS day, MAX(created_at) AS last,
    COALESCE(SUM(first = 1 AND created_at > ?1), 0) AS th_hour, COALESCE(SUM(first = 1), 0) AS th_day
    FROM forum_posts WHERE user_id = ?2 AND created_at > ?3`).bind(t - 3600000, u.id, t - 86400000).first();
  if (n.last && t - n.last < POST_GAP) throw new HttpError(429, 'Please wait a few seconds before posting again');
  if (newThread && (n.th_hour >= THREADS_PER_HOUR || n.th_day >= THREADS_PER_DAY)) throw new HttpError(429, "You've started a lot of threads recently, please try again later");
  if (n.hour >= POSTS_PER_HOUR || n.day >= POSTS_PER_DAY) throw new HttpError(429, "You've posted a lot recently, please try again later");
}

// A post's text, photos (uploaded by this user), paints and tagged recipes (public ones only).
async function cleanPost(env, u, b) {
  const text = str(b.body, POST_MAX, 'Post');
  const images = [...new Set((Array.isArray(b.images) ? b.images : []).filter(i => typeof i === 'string' && IMAGE_ID.test(i)))];
  if (images.length > FORUM_PHOTOS) throw new HttpError(400, `Too many photos (max ${FORUM_PHOTOS})`);
  if (!text && !images.length) throw new HttpError(400, 'Write something or add a photo');
  await checkImagesOwned(env, u, images);
  const paints = paintKeys(b.paints, FORUM_PAINTS);
  const recipes = [...new Set((Array.isArray(b.recipes) ? b.recipes : []).filter(i => typeof i === 'string' && RECIPE_ID.test(i)))];
  if (recipes.length > FORUM_RECIPES) throw new HttpError(400, `Too many recipes (max ${FORUM_RECIPES})`);
  if (recipes.length) {
    const ok = (await env.DB.prepare(`SELECT id FROM recipes WHERE visibility = 'public' AND id IN (${recipes.map(() => '?').join(',')})`).bind(...recipes).all()).results;
    if (ok.length !== recipes.length) throw new HttpError(400, 'A recipe you tagged is no longer public');
  }
  return { text, images, paints, recipes };
}

// Delete photos no recipe, profile, portfolio, chat message or other post still uses (a photo can be reused across them).
async function dropUnusedImages(env, ids) {
  const cm = await hasCommissions(env), ch = await hasChat(env), gone = [];
  for (const id of new Set(ids)) {
    const like = `%"${id}"%`;
    const used = await env.DB.prepare(`SELECT 1 FROM recipes WHERE cover = ?1 OR steps LIKE ?2 UNION ALL SELECT 1 FROM users WHERE avatar_image = ?1
      UNION ALL SELECT 1 FROM forum_posts WHERE images LIKE ?2${cm ? ' UNION ALL SELECT 1 FROM commissions WHERE photos LIKE ?2' : ''}${ch ? ' UNION ALL SELECT 1 FROM chat_messages WHERE images LIKE ?2' : ''} LIMIT 1`).bind(id, like).first();
    if (!used) gone.push(id);
  }
  await deleteImages(env, gone);
}

// The painters the viewer blocked: their posts are folded away for the viewer.
async function myBlocks(env, u) {
  if (!u || !await hasMessages(env)) return new Set();
  return new Set((await env.DB.prepare('SELECT blocked_id FROM user_blocks WHERE user_id = ?').bind(u.id).all()).results.map(r => r.blocked_id));
}

// Tagged recipes as cards: title, kind, author, and a colour strip (recipes and palettes) or photo (tutorials).
async function taggedRecipes(env, ids) {
  ids = [...new Set(ids)];
  if (!ids.length) return {};
  const rows = (await env.DB.prepare(`SELECT r.id, r.kind, r.title, r.cover, r.steps, u.name AS author_name FROM recipes r JOIN users u ON u.id = r.user_id
    WHERE r.visibility = 'public' AND r.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
  return Object.fromEntries(rows.map(r => {
    const steps = JSON.parse(r.steps || '[]');
    return [r.id, { id: r.id, kind: r.kind, title: r.title, author: r.author_name, layers: r.kind === 'tutorial' ? [] : steps.map(s => s.mix),
      cover: r.cover || [...steps].reverse().find(s => s.image)?.image || '' }];
  }));
}

const FORUM_POST_SELECT = `SELECT p.*, u.name AS author_name, ${AVATAR} AS author_avatar, u.blocked AS author_blocked,
  (SELECT COUNT(*) FROM forum_votes v WHERE v.post_id = p.id) AS votes,
  EXISTS (SELECT 1 FROM forum_votes v WHERE v.post_id = p.id AND v.user_id = ?1) AS voted
  FROM forum_posts p LEFT JOIN users u ON u.id = p.user_id`;

// A post as the viewer sees it. Removed posts (by a moderator, or from a blocked account) keep their place but lose
// their content, except for admins, who see what was removed.
function postOut(p, recipes, viewer, blocks) {
  const removed = !!(p.hidden || p.author_blocked);
  const out = {
    id: p.id, first: !!p.first, created_at: p.created_at, edited_at: p.edited_at || null, votes: p.votes || 0, voted: !!p.voted,
    mine: !!viewer && p.user_id === viewer.id,
    author: p.user_id && p.author_name != null ? { id: p.user_id, name: p.author_name, avatar: p.author_avatar } : { id: null, name: '(deleted account)', avatar: null },
    body: '', images: [], paints: [], recipes: [],
  };
  if (p.deleted) out.deleted = true;
  else if (removed && !viewer?.admin) out.removed = true;
  else {
    if (removed) { out.hiddenByMod = !!p.hidden; out.authorBlocked = !!p.author_blocked; }
    if (blocks.has(p.user_id)) out.blockedByMe = true;
    out.body = p.body; out.images = JSON.parse(p.images || '[]'); out.paints = JSON.parse(p.paints || '[]');
    out.recipes = JSON.parse(p.recipes || '[]').map(id => recipes[id]).filter(Boolean);
  }
  return out;
}

// Threads with their category, author, reply and upvote counts, the first photo of the opening post, and who wrote last.
// ?1 is the viewer's id (for whether they follow it and have read the newest reply).
const THREAD_SELECT = `SELECT t.*, c.name AS category_name, u.name AS author_name, ${AVATAR} AS author_avatar,
  (SELECT COUNT(*) FROM forum_posts p WHERE p.thread_id = t.id AND p.first = 0 AND p.deleted = 0 AND p.hidden = 0) AS replies,
  (SELECT COUNT(*) FROM forum_votes v JOIN forum_posts p ON p.id = v.post_id WHERE p.thread_id = t.id AND p.first = 1) AS votes,
  (SELECT json_extract(p.images, '$[0]') FROM forum_posts p WHERE p.thread_id = t.id AND p.first = 1 AND p.deleted = 0 AND p.hidden = 0) AS photo,
  (SELECT lu.name FROM forum_posts p JOIN users lu ON lu.id = p.user_id WHERE p.thread_id = t.id AND p.deleted = 0 AND p.hidden = 0 AND lu.blocked = 0 ORDER BY p.created_at DESC LIMIT 1) AS last_name,
  (SELECT f.read_at FROM forum_follows f WHERE f.thread_id = t.id AND f.user_id = ?1) AS my_read
  FROM forum_threads t JOIN forum_categories c ON c.id = t.category_id LEFT JOIN users u ON u.id = t.user_id`;
// A thread whose opening post a moderator removed, or whose author is blocked, drops out of lists (admins still see it).
const THREAD_SHOWN = `COALESCE(u.blocked, 0) = 0 AND NOT EXISTS (SELECT 1 FROM forum_posts p WHERE p.thread_id = t.id AND p.first = 1 AND p.hidden = 1)`;

const threadOut = t => ({
  id: t.id, title: t.title, category: { id: t.category_id, name: t.category_name }, pinned: !!t.pinned, locked: !!t.locked,
  author: t.user_id && t.author_name != null ? { id: t.user_id, name: t.author_name, avatar: t.author_avatar } : { id: null, name: '(deleted account)', avatar: null },
  replies: t.replies || 0, votes: t.votes || 0, photo: t.photo || '', last_at: t.last_at, last_name: t.last_name || '', created_at: t.created_at,
  following: t.my_read != null, unread: t.my_read != null && t.last_at > t.my_read,
});

const catOut = c => ({ id: c.id, name: c.name, description: c.description, sort: c.sort, threads: c.threads || 0, last_at: c.last_at || null });

// GET /api/forum: the categories (with thread counts), the most active threads, and for admins the suggested categories.
async function forumHome(request, env) {
  if (!await hasForum(env)) return json({ unavailable: true, categories: [], threads: [] });
  const u = await currentUser(request, env);
  const cats = (await env.DB.prepare(`SELECT c.*, (SELECT COUNT(*) FROM forum_threads t WHERE t.category_id = c.id) AS threads,
    (SELECT MAX(last_at) FROM forum_threads t WHERE t.category_id = c.id) AS last_at FROM forum_categories c WHERE c.status = 'live' ORDER BY c.sort, c.name`).all()).results;
  const threads = (await env.DB.prepare(`${THREAD_SELECT} WHERE ${THREAD_SHOWN} ORDER BY t.last_at DESC LIMIT 10`).bind(u?.id || '').all()).results;
  const out = { categories: cats.map(catOut), threads: threads.map(threadOut) };
  if (u?.admin) out.pending = (await env.DB.prepare(`SELECT c.*, s.name AS by_name FROM forum_categories c LEFT JOIN users s ON s.id = c.suggested_by
    WHERE c.status = 'pending' ORDER BY c.created_at`).all()).results.map(c => ({ ...catOut(c), by: c.suggested_by ? { id: c.suggested_by, name: c.by_name || '(deleted account)' } : null }));
  return json(out);
}

// GET /api/forum/threads?c=&sort=active|new|top&offset=: a category's threads (pinned ones first), THREAD_PAGE at a time.
// Without c: threads from every category. following=1 (signed in): only threads the viewer follows.
async function listThreads(request, env, url) {
  await needForum(env);
  const u = await currentUser(request, env), c = url.searchParams.get('c') || '';
  const sort = ['new', 'top'].includes(url.searchParams.get('sort')) ? url.searchParams.get('sort') : 'active';
  const offset = Math.max(0, Math.min(5000, parseInt(url.searchParams.get('offset'), 10) || 0));
  const where = [u?.admin ? '1 = 1' : THREAD_SHOWN], args = [u?.id || ''];
  let cat = null;
  if (c) {
    cat = await env.DB.prepare("SELECT * FROM forum_categories WHERE id = ? AND status = 'live'").bind(c).first();
    if (!cat) throw new HttpError(404, 'Category not found');
    where.push('t.category_id = ?'); args.push(c);
  }
  if (url.searchParams.get('following') === '1') {
    if (!u) throw new HttpError(401, 'Please sign in');
    where.push('t.id IN (SELECT thread_id FROM forum_follows WHERE user_id = ?1)');
  }
  const order = sort === 'new' ? 't.created_at DESC' : sort === 'top' ? 'votes DESC, t.last_at DESC' : 't.last_at DESC';
  const rows = (await env.DB.prepare(`${THREAD_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${c ? 't.pinned DESC, ' : ''}${order} LIMIT ? OFFSET ?`)
    .bind(...args, THREAD_PAGE + 1, offset).all()).results;
  return json({ category: cat && catOut(cat), threads: rows.slice(0, THREAD_PAGE).map(threadOut), more: rows.length > THREAD_PAGE });
}

// GET /api/forum/search?q=&c=: threads whose title or any visible post matches, newest activity first, with the matching text.
async function searchForum(request, env, url) {
  await needForum(env);
  const u = await currentUser(request, env);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80).replace(/[%_]/g, '');
  if (q.length < 2) return json({ threads: [] });
  const like = `%${q}%`, where = [u?.admin ? '1 = 1' : THREAD_SHOWN], args = [u?.id || '', like];
  where.push(`(t.title LIKE ?2 OR EXISTS (SELECT 1 FROM forum_posts p JOIN users pu ON pu.id = p.user_id WHERE p.thread_id = t.id AND p.deleted = 0 AND p.hidden = 0 AND pu.blocked = 0 AND p.body LIKE ?2))`);
  const c = url.searchParams.get('c');
  if (c) { where.push('t.category_id = ?3'); args.push(c); }
  const rows = (await env.DB.prepare(`${THREAD_SELECT.replace(' FROM forum_threads t', `,
    (SELECT p.body FROM forum_posts p JOIN users pu ON pu.id = p.user_id WHERE p.thread_id = t.id AND p.deleted = 0 AND p.hidden = 0 AND pu.blocked = 0 AND p.body LIKE ?2 ORDER BY p.created_at LIMIT 1) AS hit
    FROM forum_threads t`)} WHERE ${where.join(' AND ')} ORDER BY t.last_at DESC LIMIT 50`).bind(...args).all()).results;
  // A short piece of the matching post, centred on the first match.
  const snip = s => {
    if (!s) return '';
    const i = s.toLowerCase().indexOf(q.toLowerCase()), a = Math.max(0, i - 60);
    return (a ? '…' : '') + s.slice(a, a + 180).replace(/\s+/g, ' ') + (a + 180 < s.length ? '…' : '');
  };
  return json({ threads: rows.map(t => ({ ...threadOut(t), hit: snip(t.hit) })) });
}

async function loadThread(env, id, viewer) {
  const t = await env.DB.prepare(`${THREAD_SELECT} WHERE t.id = ?2`).bind(viewer?.id || '', id).first();
  if (!t) throw new HttpError(404, 'Thread not found');
  const first = await env.DB.prepare('SELECT p.hidden, u.blocked FROM forum_posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = ? AND p.first = 1').bind(id).first();
  // Like a removed recipe, a thread a moderator took down looks missing to everyone but admins.
  if (!viewer?.admin && first && (first.hidden || first.blocked)) throw new HttpError(404, 'Thread not found');
  return t;
}

// Why the viewer can't reply here ('' when they can).
function replyBlocker(t, u) {
  if (!u) return 'signin';
  if (u.blocked) return 'This account has been blocked from posting.';
  if (u.email && !u.email_verified) return 'Please confirm your email before posting. You can send the confirmation email from your account page.';
  if (t.locked && !u.admin) return 'This thread is locked, so it takes no new replies.';
  return '';
}

// GET /api/forum/threads/:id: the thread and its posts, oldest first. Opening it marks it read for a follower.
async function getThread(request, env, id) {
  await needForum(env);
  const u = await currentUser(request, env), t = await loadThread(env, id, u);
  const rows = (await env.DB.prepare(`${FORUM_POST_SELECT} WHERE p.thread_id = ?2 ORDER BY p.first DESC, p.created_at LIMIT ${THREAD_POSTS}`).bind(u?.id || '', id).all()).results;
  const recipes = await taggedRecipes(env, rows.flatMap(p => (p.deleted ? [] : JSON.parse(p.recipes || '[]'))));
  const blocks = await myBlocks(env, u);
  let follow = null;
  if (u) {
    const f = await env.DB.prepare('SELECT mail FROM forum_follows WHERE thread_id = ? AND user_id = ?').bind(id, u.id).first();
    if (f) { follow = { mail: !!f.mail }; await env.DB.prepare('UPDATE forum_follows SET read_at = ? WHERE thread_id = ? AND user_id = ?').bind(now(), id, u.id).run(); }
  }
  const out = threadOut(t);
  out.unread = false;
  return json({ thread: out, posts: rows.map(p => postOut(p, recipes, u, blocks)), follow, why: replyBlocker(t, u), mail: mailReady(env) });
}

// POST /api/forum/threads { category, title, body, images, paints, recipes }: start a thread. The author follows it.
async function createThread(request, env) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request);
  forumWriter(u);
  if (b.website) return json({ ok: true });
  const cat = await env.DB.prepare("SELECT id FROM forum_categories WHERE id = ? AND status = 'live'").bind(String(b.category || '')).first();
  if (!cat) throw new HttpError(400, 'Please pick a category');
  const title = str(b.title, TITLE_MAX, 'Title', { required: true });
  const p = await cleanPost(env, u, b);
  await forumLimits(env, u, true);
  const id = crypto.randomUUID(), t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO forum_threads (id, category_id, user_id, title, last_at, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, cat.id, u.id, title, t, t),
    env.DB.prepare('INSERT INTO forum_posts (id, thread_id, user_id, first, body, images, paints, recipes, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, u.id, p.text, JSON.stringify(p.images), JSON.stringify(p.paints), JSON.stringify(p.recipes), t),
    env.DB.prepare('INSERT INTO forum_follows (thread_id, user_id, mail, read_at, created_at) VALUES (?, ?, 1, ?, ?)').bind(id, u.id, t, t),
  ]);
  return json({ id }, 201);
}

// PUT /api/forum/threads/:id: the author (or an admin) can change the { title, category }; admins can also set { pinned, locked }.
async function updateThread(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request), t = await loadThread(env, id, u);
  const own = t.user_id === u.id;
  if (!own && !u.admin) throw new HttpError(403, 'Only the person who started this thread can change it');
  if (own && !u.admin) forumWriter(u);
  const sets = [], args = [];
  if (b.title !== undefined) { sets.push('title = ?'); args.push(str(b.title, TITLE_MAX, 'Title', { required: true })); }
  if (b.category !== undefined) {
    if (!await env.DB.prepare("SELECT 1 FROM forum_categories WHERE id = ? AND status = 'live'").bind(String(b.category)).first()) throw new HttpError(400, 'Please pick a category');
    sets.push('category_id = ?'); args.push(String(b.category));
  }
  for (const k of ['pinned', 'locked']) if (b[k] !== undefined) {
    if (!u.admin) throw new HttpError(403, 'Admins only');
    sets.push(`${k} = ?`); args.push(b[k] ? 1 : 0);
  }
  if (sets.length) await env.DB.prepare(`UPDATE forum_threads SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  return json({ ok: true });
}

// Delete a whole thread: its posts, upvotes, follows and the photos nothing else uses.
async function removeThread(env, id) {
  const imgs = (await env.DB.prepare('SELECT images FROM forum_posts WHERE thread_id = ?').bind(id).all()).results.flatMap(p => JSON.parse(p.images || '[]'));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM forum_votes WHERE post_id IN (SELECT id FROM forum_posts WHERE thread_id = ?)').bind(id),
    env.DB.prepare('DELETE FROM forum_posts WHERE thread_id = ?').bind(id),
    env.DB.prepare('DELETE FROM forum_follows WHERE thread_id = ?').bind(id),
    env.DB.prepare('DELETE FROM forum_threads WHERE id = ?').bind(id),
  ]);
  await dropUnusedImages(env, imgs);
}

// DELETE /api/forum/threads/:id: admins can delete any thread; the author only one nobody has replied to yet.
async function deleteThread(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), t = await loadThread(env, id, u);
  if (!u.admin) {
    if (t.user_id !== u.id) throw new HttpError(403, 'Only the person who started this thread can delete it');
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM forum_posts WHERE thread_id = ? AND first = 0').bind(id).first();
    if (n.n) throw new HttpError(400, "Others have replied, so the thread stays. You can delete your opening post instead.");
  }
  await removeThread(env, id);
  return json({ ok: true });
}

// POST /api/forum/threads/:id/posts { body, images, paints, recipes }: reply. The writer follows the thread from then on,
// and the other followers hear about it (in Messages, and by email if they want that).
async function addPost(request, env, url, id) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request);
  if (b.website) return json({ ok: true });
  const t = await loadThread(env, id, u), why = replyBlocker(t, u);
  if (why) throw new HttpError(403, why);
  const p = await cleanPost(env, u, b);
  await forumLimits(env, u, false);
  const pid = crypto.randomUUID(), tm = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO forum_posts (id, thread_id, user_id, body, images, paints, recipes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(pid, id, u.id, p.text, JSON.stringify(p.images), JSON.stringify(p.paints), JSON.stringify(p.recipes), tm),
    env.DB.prepare('UPDATE forum_threads SET last_at = ? WHERE id = ?').bind(tm, id),
    env.DB.prepare('INSERT INTO forum_follows (thread_id, user_id, mail, read_at, created_at) VALUES (?1, ?2, 1, ?3, ?3) ON CONFLICT (thread_id, user_id) DO UPDATE SET read_at = ?3').bind(id, u.id, tm),
  ]);
  await notifyFollowers(env, url, t, u, tm);
  return json({ id: pid }, 201);
}

// One email per thread until the follower opens it again, only to confirmed emails, never to someone who blocked the writer.
async function notifyFollowers(env, url, t, u, tm) {
  if (!mailReady(env)) return;
  const notBlocked = await hasMessages(env) ? 'AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.user_id = f.user_id AND b.blocked_id = ?2)' : '';
  const rows = (await env.DB.prepare(`SELECT f.user_id, u.name, u.email FROM forum_follows f JOIN users u ON u.id = f.user_id
    WHERE f.thread_id = ?1 AND f.user_id != ?2 AND f.mail = 1 AND f.mailed_at <= f.read_at AND u.forum_mail = 1 AND u.blocked = 0
      AND u.email IS NOT NULL AND u.email != '' AND u.email_verified = 1 ${notBlocked} LIMIT ${FORUM_MAILS}`).bind(t.id, u.id).all()).results;
  for (const r of rows) {
    try {
      await sendMail(env, r.email, `New reply in "${t.title}"`,
        `Hi ${r.name},\n\n${u.name} replied in a forum thread you follow on The Painters Desk:\n\n"${t.title}"\n\nYou won't get another email about this thread until you've opened it.\n\nTo stop these emails, press Following on the thread, or turn off forum emails on your account page.`,
        `${url.origin}/#/forum/t/${t.id}`, 'Read the reply');
      await env.DB.prepare('UPDATE forum_follows SET mailed_at = ? WHERE thread_id = ? AND user_id = ?').bind(tm, t.id, r.user_id).run();
    } catch (e) { console.error('Forum email failed', e); }
  }
}

async function loadPost(env, id) {
  const p = await env.DB.prepare('SELECT p.*, t.locked, t.user_id AS thread_user FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE p.id = ?').bind(id).first();
  if (!p) throw new HttpError(404, 'Post not found');
  return p;
}

// PUT /api/forum/posts/:id: the author edits { body, images, paints, recipes }; an admin removes or restores it with { hidden }.
async function updatePost(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request), p = await loadPost(env, id);
  if (b.hidden !== undefined) {
    if (!u.admin) throw new HttpError(403, 'Admins only');
    await env.DB.prepare('UPDATE forum_posts SET hidden = ? WHERE id = ?').bind(b.hidden ? 1 : 0, id).run();
    return json({ ok: true, hidden: !!b.hidden });
  }
  if (p.user_id !== u.id || p.deleted) throw new HttpError(403, 'You can only edit your own posts');
  forumWriter(u);
  if (p.locked && !u.admin) throw new HttpError(403, 'This thread is locked');
  const c = await cleanPost(env, u, b), old = JSON.parse(p.images || '[]');
  await env.DB.prepare('UPDATE forum_posts SET body = ?, images = ?, paints = ?, recipes = ?, edited_at = ? WHERE id = ?')
    .bind(c.text, JSON.stringify(c.images), JSON.stringify(c.paints), JSON.stringify(c.recipes), now(), id).run();
  await dropUnusedImages(env, old.filter(i => !c.images.includes(i)));
  return json({ ok: true });
}

// DELETE /api/forum/posts/:id (author or admin). A reply goes for good. An opening post with replies under it is
// emptied and marked deleted so the thread stays readable; without replies the whole thread goes.
async function deletePost(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), p = await loadPost(env, id);
  if (p.user_id !== u.id && !u.admin) throw new HttpError(403, 'You can only delete your own posts');
  const imgs = JSON.parse(p.images || '[]');
  if (p.first) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM forum_posts WHERE thread_id = ? AND first = 0').bind(p.thread_id).first();
    if (!n.n) { await removeThread(env, p.thread_id); return json({ ok: true, thread: 'deleted' }); }
    await env.DB.batch([
      env.DB.prepare("UPDATE forum_posts SET deleted = 1, body = '', images = '[]', paints = '[]', recipes = '[]' WHERE id = ?").bind(id),
      env.DB.prepare('DELETE FROM forum_votes WHERE post_id = ?').bind(id),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM forum_votes WHERE post_id = ?').bind(id),
      env.DB.prepare('DELETE FROM forum_posts WHERE id = ?').bind(id),
    ]);
    // The last reply under a deleted opening post takes the thread with it.
    if (!await env.DB.prepare('SELECT 1 FROM forum_posts WHERE thread_id = ? AND deleted = 0').bind(p.thread_id).first()) {
      await removeThread(env, p.thread_id);
      await dropUnusedImages(env, imgs);
      return json({ ok: true, thread: 'deleted' });
    }
  }
  await dropUnusedImages(env, imgs);
  return json({ ok: true });
}

// PUT /api/forum/posts/:id/vote { on }: upvote a post (not your own), or take it back.
async function votePost(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request), p = await loadPost(env, id);
  if (b.on === false) await env.DB.prepare('DELETE FROM forum_votes WHERE post_id = ? AND user_id = ?').bind(id, u.id).run();
  else {
    if (p.deleted || p.hidden) throw new HttpError(404, 'Post not found');
    if (p.user_id === u.id) throw new HttpError(400, "You can't upvote your own");
    await env.DB.prepare('INSERT OR IGNORE INTO forum_votes (post_id, user_id, created_at) VALUES (?, ?, ?)').bind(id, u.id, now()).run();
  }
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM forum_votes WHERE post_id = ?').bind(id).first();
  return json({ votes: n.n, voted: b.on !== false });
}

// PUT /api/forum/threads/:id/follow { on, mail }: follow a thread (new replies show in Messages; mail: also by email) or stop.
async function followThread(request, env, id) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request);
  await loadThread(env, id, u);
  if (b.on === false) await env.DB.prepare('DELETE FROM forum_follows WHERE thread_id = ? AND user_id = ?').bind(id, u.id).run();
  else await env.DB.prepare('INSERT INTO forum_follows (thread_id, user_id, mail, read_at, created_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT (thread_id, user_id) DO UPDATE SET mail = ?3, read_at = ?4')
    .bind(id, u.id, b.mail === false ? 0 : 1, now()).run();
  return json({ follow: b.on === false ? null : { mail: b.mail !== false } });
}

// GET /api/forum/updates: followed threads with replies the viewer hasn't read, for Messages. POST marks them all read.
async function forumUpdates(request, env) {
  const u = await requireUser(request, env);
  if (!await hasForum(env)) return json({ threads: [] });
  const rows = (await env.DB.prepare(`${THREAD_SELECT} WHERE ${THREAD_SHOWN} AND t.id IN (SELECT f.thread_id FROM forum_follows f WHERE f.user_id = ?1 AND f.read_at < t.last_at)
    ORDER BY t.last_at DESC LIMIT 50`).bind(u.id).all()).results;
  return json({ threads: rows.map(threadOut) });
}
async function readForumUpdates(request, env) {
  const u = await requireUser(request, env);
  await needForum(env);
  await env.DB.prepare('UPDATE forum_follows SET read_at = ? WHERE user_id = ?').bind(now(), u.id).run();
  return json({ ok: true });
}

// PUT /api/me/forum { forum_mail }: email me about new replies in threads I follow.
async function setForumPrefs(request, env) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request);
  await env.DB.prepare('UPDATE users SET forum_mail = ? WHERE id = ?').bind(b.forum_mail === false ? 0 : 1, u.id).run();
  return json({ user: await currentUser(request, env) });
}

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// POST /api/forum/categories { name, description }: admins add a category; members suggest one, which waits for an admin.
async function addCategory(request, env, url) {
  await needForum(env);
  const u = await requireUser(request, env), b = await body(request);
  if (b.website) return json({ ok: true });
  const name = str(b.name, 50, 'Name', { required: true }), description = str(b.description, 200, 'Description'), t = now();
  if (await env.DB.prepare('SELECT 1 FROM forum_categories WHERE lower(name) = lower(?)').bind(name).first())
    throw new HttpError(400, 'There is already a category with that name (or one waiting for approval)');
  if (!u.admin) {
    forumWriter(u);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM forum_categories WHERE suggested_by = ? AND created_at > ?').bind(u.id, t - 86400000).first();
    if (n.n >= SUGGESTIONS_PER_DAY) throw new HttpError(429, "You've suggested a few categories today, please try again tomorrow");
  }
  let id = slug(name) || 'category';
  if (await env.DB.prepare('SELECT 1 FROM forum_categories WHERE id = ?').bind(id).first()) id += '-' + crypto.randomUUID().slice(0, 4);
  const max = await env.DB.prepare('SELECT MAX(sort) AS m FROM forum_categories').first();
  await env.DB.prepare('INSERT INTO forum_categories (id, name, description, sort, status, suggested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, name, description, (max.m || 0) + 10, u.admin ? 'live' : 'pending', u.admin ? null : u.id, t).run();
  const to = !u.admin && (env.FEEDBACK_TO || adminEmails(env)[0]);
  if (to) {
    try {
      await sendMail(env, to, `[Painters Desk] Forum category suggested: ${name}`,
        `${u.name} suggested a new forum category.\n\nName: ${name}\n${description ? 'Description: ' + description + '\n' : ''}\nApprove or decline it on the forum page.`,
        `${url.origin}/#/forum`, 'Open the forum');
    } catch (e) { console.error('Suggestion email failed', e); }
  }
  return json({ id, status: u.admin ? 'live' : 'pending' }, 201);
}

// PUT /api/forum/categories/:id { name, description, sort, status: 'live' } (admins): edit, reorder or approve a category.
async function updateCategory(request, env, id) {
  await needForum(env);
  await requireAdmin(request, env);
  const b = await body(request), sets = [], args = [];
  if (b.name !== undefined) { sets.push('name = ?'); args.push(str(b.name, 50, 'Name', { required: true })); }
  if (b.description !== undefined) { sets.push('description = ?'); args.push(str(b.description, 200, 'Description')); }
  if (b.sort !== undefined) { sets.push('sort = ?'); args.push(Math.max(0, Math.min(100000, parseInt(b.sort, 10) || 0))); }
  if (b.status === 'live') sets.push("status = 'live'");
  if (!sets.length) return json({ ok: true });
  const r = await env.DB.prepare(`UPDATE forum_categories SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  if (!r.meta.changes) throw new HttpError(404, 'Category not found');
  return json({ ok: true });
}

// DELETE /api/forum/categories/:id (admins): decline a suggestion, or remove a category with no threads in it.
async function deleteCategory(request, env, id) {
  await needForum(env);
  await requireAdmin(request, env);
  if (await env.DB.prepare('SELECT 1 FROM forum_threads WHERE category_id = ?').bind(id).first())
    throw new HttpError(400, 'Move or delete the threads in this category first');
  const r = await env.DB.prepare('DELETE FROM forum_categories WHERE id = ?').bind(id).run();
  if (!r.meta.changes) throw new HttpError(404, 'Category not found');
  return json({ ok: true });
}

/* ---------- feedback ---------- */

// The Feedback button on every page. Saved to D1 and emailed to FEEDBACK_TO (else the first ADMIN_EMAILS address).
// A hidden "website" field catches form-filling bots; each sender (by IP) can post 5 an hour.
const FEEDBACK_KINDS = { bug: 'Bug', suggestion: 'Suggestion', other: 'Other' }, FEEDBACK_PER_HOUR = 5;

// ---------- visit counts ----------
// Anonymous counts for the owner's daily report: page views and referring sites per UTC hour, and unique
// visitors per day as a salted hash (see migrations/0012_traffic.sql). The app's own views (#/recipes etc.)
// are reported by the page itself through /api/hit; the paint pages and guides are counted here as they're served.
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

async function hit(request, env, url) {
  const b = await body(request);
  const path = typeof b.p === 'string' && /^#\/[\w-]{0,40}(\/[\w-]{1,40})?$/.test(b.p) ? b.p : null;
  if (!path) throw new HttpError(400, 'Bad page');
  await countVisit(request, env, path, typeof b.r === 'string' ? b.r : null, url);
  return new Response(null, { status: 204 });
}

let SALT = null;
async function countVisit(request, env, path, referrer, url) {
  try {
    const ua = request.headers.get('User-Agent') || '';
    const t = now(), iso = new Date(t).toISOString(), hour = iso.slice(0, 13), day = iso.slice(0, 10);
    if (!ua || BOT_UA.test(ua)) {
      await env.DB.prepare("INSERT INTO page_views (hour, path, views) VALUES (?, '[bots]', 1) ON CONFLICT (hour, path) DO UPDATE SET views = views + 1").bind(hour).run();
      return;
    }
    if (SALT?.day !== day) {
      await env.DB.prepare('INSERT OR IGNORE INTO traffic_salt (day, salt) VALUES (?, ?)').bind(day, crypto.randomUUID()).run();
      const row = await env.DB.prepare('SELECT salt FROM traffic_salt WHERE day = ?').bind(day).first();
      SALT = { day, salt: row.salt };
      // A new day: forget old salts and visitor rows so nothing links back to an older day.
      const old = new Date(t - 2 * 86400000).toISOString().slice(0, 10);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM traffic_salt WHERE day < ?').bind(old),
        env.DB.prepare('DELETE FROM visitors WHERE day < ?').bind(old),
      ]);
    }
    const id = await sha256(SALT.salt + '|' + (request.headers.get('CF-Connecting-IP') || '') + '|' + ua);
    const q = [
      env.DB.prepare('INSERT INTO page_views (hour, path, views) VALUES (?, ?, 1) ON CONFLICT (hour, path) DO UPDATE SET views = views + 1').bind(hour, path),
      env.DB.prepare('INSERT INTO visitors (id, day, last) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET last = excluded.last').bind(id, day, t),
    ];
    let host = '';
    try { host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    if (host && host !== url.hostname && host.length <= 100) {
      q.push(env.DB.prepare('INSERT INTO referrers (hour, host, n) VALUES (?, ?, 1) ON CONFLICT (hour, host) DO UPDATE SET n = n + 1').bind(hour, host));
    }
    await env.DB.batch(q);
  } catch (e) {
    // Counting must never break a page (the tables may not exist until migration 0012 is applied).
    console.error('Visit count failed', e);
  }
}

async function sendFeedback(request, env, url) {
  const b = await body(request);
  if (b.website) return json({ ok: true });
  const kind = FEEDBACK_KINDS[b.kind] ? b.kind : 'other';
  const message = str(b.message, 4000, 'Message', { required: true });
  const email = b.email ? cleanEmail(b.email) : '';
  const page = str(b.page, 200, 'Page');
  const u = await currentUser(request, env);
  const ip = await sha256('feedback:' + (request.headers.get('CF-Connecting-IP') || ''));
  const t = now(), id = crypto.randomUUID();
  let saved = true, conv = null;
  try {
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM feedback WHERE ip_hash = ? AND created_at > ?').bind(ip, t - 3600000).first();
    if (c.n >= FEEDBACK_PER_HOUR) throw new HttpError(429, "Thanks! You've sent a lot of feedback this hour, please try again later");
    await env.DB.prepare('INSERT INTO feedback (id, kind, message, email, user_id, page, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, kind, message, email, u?.id || null, page, ip, t).run();
    // It also starts a conversation, so the team can reply on the site (the conversation shares the feedback's id).
    if (await hasMessages(env)) {
      const token = u ? '' : await anonToken(request);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO conversations (id, kind, a_id, a_token, feedback_id, a_last, a_read, created_at, updated_at) VALUES (?1, 'feedback', ?2, ?3, ?1, ?4, ?4, ?4, ?4)").bind(id, u?.id || null, token, t),
        env.DB.prepare("INSERT INTO messages (id, conversation_id, side, user_id, body, ip_hash, created_at) VALUES (?1, ?1, 'a', ?2, ?3, '', ?4)").bind(id, u?.id || null, message, t),
      ]);
      conv = id;
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    // The feedback table may not exist yet (migration 0007 not applied); the email still goes out.
    console.error('Feedback save failed', e);
    saved = false;
  }
  const to = env.FEEDBACK_TO || adminEmails(env)[0];
  let mailed = false;
  if (to && env.MAIL_FROM && (env.EMAIL || env.RESEND_API_KEY)) {
    const who = u ? `${u.name} (signed in${u.email ? ', ' + u.email : ''})` : 'Not signed in';
    const reply = conv ? `${url.origin}/#/inbox/${conv}` : '';
    const text = `${FEEDBACK_KINDS[kind]} from ${who}\nReply to: ${email || 'no email given'}\nPage: ${page || '/'}\n\n${message}${reply ? '\n\nReply on the site: ' + reply : ''}`;
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1b1b1b;max-width:560px">
<p style="font-size:20px;font-weight:700;margin:0 0 12px">The Painters Desk: ${FEEDBACK_KINDS[kind]}</p>
<p style="color:#666;font-size:13px;margin:0 0 12px">${htmlEsc(who)}<br>Reply to: ${htmlEsc(email || 'no email given')}<br>Page: ${htmlEsc(page || '/')}</p>
<p style="white-space:pre-wrap;border:3px solid #1b1b1b;border-radius:14px;padding:12px">${htmlEsc(message)}</p>
${reply ? `<p><a href="${reply}" style="font-weight:700">Reply on the site</a> (they'll see it in Messages${u ? '' : ' on the browser they sent it from'})</p>` : ''}</div>`;
    const subject = `[Painters Desk] ${FEEDBACK_KINDS[kind]}: ${message.replace(/\s+/g, ' ').slice(0, 60)}`;
    try {
      if (env.EMAIL) await env.EMAIL.send({ from: env.MAIL_FROM, to, subject, text, html, ...(email ? { replyTo: email } : {}) });
      else {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html, ...(email ? { reply_to: email } : {}) }),
        });
        if (!r.ok) throw new Error('Resend ' + r.status);
      }
      mailed = true;
    } catch (e) { console.error('Feedback email failed', e); }
  } else if (env.DEV_LOGIN === '1') {
    console.log(`[dev feedback] ${kind} from ${email || 'anonymous'}: ${message}`);
    mailed = true;
  }
  if (!saved && !mailed) throw new HttpError(503, "Sorry, feedback couldn't be sent right now. Please try again later");
  return json({ ok: true, conversation: conv });
}

/* ---------- update emails (new features) ---------- */

// Opt in or out. Answering either way counts as having been asked, so the site stops asking.
async function setUpdates(request, env) {
  const u = await requireUser(request, env), b = await body(request);
  await env.DB.prepare("UPDATE users SET updates = ?, updates_asked = 1, unsub = CASE WHEN unsub = '' THEN ? ELSE unsub END WHERE id = ?")
    .bind(b.on === true ? 1 : 0, randomToken(), u.id).run();
  return json({ user: await currentUser(request, env) });
}

// The link at the bottom of every update email. GET shows a button (so link scanners in mail apps don't unsubscribe
// people); POST unsubscribes, from that button or from a mail app's one-click unsubscribe (List-Unsubscribe-Post).
async function unsubscribe(request, env, url) {
  const id = url.searchParams.get('u') || '', token = url.searchParams.get('t') || '';
  const row = id && token ? await env.DB.prepare("SELECT id FROM users WHERE id = ? AND unsub = ? AND unsub != ''").bind(id, token).first() : null;
  if (!row) return page('Link not recognised', '<p>This unsubscribe link has expired or is incomplete. You can turn update emails off from your <a href="/#/account">account page</a>.</p>', 404);
  if (request.method === 'GET') return page('Unsubscribe', `<p>Stop getting emails about new features on The Painters Desk?</p>
<form method="post"><button type="submit">Unsubscribe</button></form>`);
  await env.DB.prepare('UPDATE users SET updates = 0, updates_asked = 1 WHERE id = ?').bind(row.id).run();
  return page('Unsubscribed', '<p>Done. You won\'t get emails about new features any more. You can turn them back on from your <a href="/#/account">account page</a>. Emails about your account, like password resets, still come when you ask for them.</p>');
}

function page(title, inner, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEsc(title)} · The Painters Desk</title>
<style>@font-face{font-family:Orbitron;src:url(/fonts/orbitron-700.woff2) format('woff2');font-weight:700}@font-face{font-family:Rubik;src:url(/fonts/rubik-400.woff2) format('woff2')}
body{font-family:Rubik,system-ui,sans-serif;background:#07011a;color:#f3ecff;margin:0;padding:40px 16px;line-height:1.5}body::before{content:"";position:fixed;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#ff2a6d,#b537f2,#2de2e6,#f9f871,#ff2a6d)}
main{max-width:480px;margin:auto;background:#160736;border:2px solid #2de2e6;border-radius:16px;box-shadow:0 0 18px rgba(45,226,230,.45),6px 6px 0 #ff2a6d;padding:20px 24px}
h1{font-family:Orbitron,sans-serif;font-size:22px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;color:#fff;text-shadow:-2px 0 #2de2e6,2px 0 #ff2a6d}a{color:#2de2e6}
button{font-family:Orbitron,sans-serif;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1px;background:#f9f871;color:#0b0224;border:2px solid #0b0224;border-radius:14px;box-shadow:3px 3px 0 #ff2a6d;padding:11px 18px;cursor:pointer}</style></head>
<body><main><h1>${htmlEsc(title)}</h1>${inner}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function requireAdmin(request, env) {
  const u = await requireUser(request, env);
  if (!u.admin) throw new HttpError(403, 'Admins only');
  return u;
}

const updateRecipients = env => env.DB.prepare(
  "SELECT id, name, email, unsub FROM users WHERE updates = 1 AND email_verified = 1 AND email IS NOT NULL AND email != '' AND unsub != ''");

async function announceInfo(request, env) {
  await requireAdmin(request, env);
  const n = (await updateRecipients(env).all()).results.length;
  const sent = (await env.DB.prepare('SELECT subject, recipients, created_at FROM announcements ORDER BY created_at DESC LIMIT 5').all()).results;
  return json({ recipients: n, sent, mail: mailReady(env) });
}

// Plain text with blank lines between paragraphs, "- " lines for a list and **bold**. {name} becomes the reader's name.
function updateHTML(text) {
  const inline = s => htmlEsc(s).replace(/\*\*(.+?)\*\*/g, '<b style="color:#ffffff">$1</b>').replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" style="color:#2de2e6">${u}</a>`);
  return text.split(/\n\s*\n/).map(b => {
    const lines = b.trim().split('\n');
    if (lines.every(l => /^\s*- /.test(l))) return `<ul style="margin:0 0 14px;padding-left:22px">${lines.map(l => `<li style="margin:0 0 8px">${inline(l.replace(/^\s*- /, ''))}</li>`).join('')}</ul>`;
    return `<p style="margin:0 0 14px">${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

// Send an update email: to the admin only as a test, or to everyone who opted in with a confirmed email.
async function announce(request, env, url) {
  const u = await requireAdmin(request, env), b = await body(request);
  const subject = str(b.subject, 150, 'Subject', { required: true }), text = str(b.text, 10000, 'Message', { required: true });
  if (!(env.MAIL_FROM && (env.EMAIL || env.RESEND_API_KEY)) && env.DEV_LOGIN !== '1') throw new HttpError(503, 'Email is not set up on this server yet');
  let rows;
  if (b.test === true) {
    if (!u.email || !u.email_verified) throw new HttpError(400, 'Confirm your own email first');
    await env.DB.prepare("UPDATE users SET unsub = ? WHERE id = ? AND unsub = ''").bind(randomToken(), u.id).run();
    rows = [await env.DB.prepare('SELECT id, name, email, unsub FROM users WHERE id = ?').bind(u.id).first()];
  } else {
    const dup = await env.DB.prepare('SELECT 1 FROM announcements WHERE subject = ? AND created_at > ?').bind(subject, now() - 864e5).first();
    if (dup) throw new HttpError(409, 'An email with this subject already went out in the last 24 hours');
    rows = (await updateRecipients(env).all()).results;
    if (!rows.length) throw new HttpError(400, 'Nobody has opted in to update emails yet');
  }
  let sent = 0, failed = 0;
  for (const r of rows) {
    const link = `${url.origin}/api/unsubscribe?u=${encodeURIComponent(r.id)}&t=${encodeURIComponent(r.unsub)}`;
    const mine = text.replace(/\{name\}/g, r.name);
    const foot = "You're getting this because you asked for emails about new features on The Painters Desk.";
    const html = mailShell(url.origin, `${updateHTML(mine)}<p style="margin:22px 0 0">${mailButton(url.origin, 'Open The Painters Desk')}</p>`,
      `${foot} <a href="${link}" style="color:#2de2e6">Unsubscribe</a>`);
    const msg = { from: env.MAIL_FROM, subject: (b.test === true ? '[Test] ' : '') + subject, text: `${mine.replace(/\*\*(.+?)\*\*/g, '$1')}\n\n--\n${foot}\nUnsubscribe: ${link}`, html,
      headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
    try {
      if (env.EMAIL && env.MAIL_FROM) await env.EMAIL.send({ ...msg, to: r.email });
      else if (env.RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...msg, to: [r.email] }),
        });
        if (!res.ok) throw new Error('Resend ' + res.status);
      } else console.log(`[dev update email] to ${r.email}: ${msg.subject}\n${msg.text}`);
      sent++;
    } catch (e) { console.error('Update email failed', e); failed++; }
  }
  if (b.test !== true && sent) await env.DB.prepare('INSERT INTO announcements (id, subject, body, sent_by, recipients, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), subject, text, u.id, sent, now()).run();
  return json({ sent, failed });
}

const htmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function wwwRetireWorker(target) {
  return `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) {
    const u = new URL(c.url);
    c.navigate(${JSON.stringify(target)} + u.pathname + u.search + u.hash);
  }
})()));
`;
}

/* ---------- live chat ---------- */

// Rooms, messages, reactions, mentions and mutes live in migration 0019 (see it for what each column means). Until it is
// applied the chat popup says it isn't open yet. One ChatRoom Durable Object (the CHAT binding, named 'site') holds a
// WebSocket from every signed-in page that is open, so it knows who is online and can pass on new messages in any
// room: the Worker saves every change in D1 first, then hands it over. Without the binding (or while the connection
// is down) the open popup fetches new messages every few seconds instead.
// A message is up to CHAT_MAX characters with CHAT_PHOTOS photos, CHAT_PAINTS paints and CHAT_MENTIONS @mentions.
// Members write at most CHAT_PER_MINUTE / CHAT_PER_HOUR / CHAT_PER_DAY messages, CHAT_GAP apart (or the room's slow mode).
const CHAT_MAX = 1000, CHAT_PHOTOS = 4, CHAT_PAINTS = 6, CHAT_MENTIONS = 5, CHAT_PAGE = 50;
const CHAT_GAP = 2000, CHAT_PER_MINUTE = 15, CHAT_PER_HOUR = 200, CHAT_PER_DAY = 1000, CHAT_PINS = 20;
const CHAT_EMOJI = ['👍', '❤️', '😂', '😮', '🔥', '🎨'];
let chatReady = false;
async function hasChat(env) {
  if (!chatReady) chatReady = !!(await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'chat_messages'").first());
  return chatReady;
}
async function needChat(env) {
  if (!await hasChat(env)) throw new HttpError(503, 'Chat is not open on this server yet');
}

// Chat is for members: signed-out visitors see a sign-in prompt.
async function chatUser(request, env) {
  await needChat(env);
  return requireUser(request, env);
}

// Why the viewer can't write in chat right now ('' when they can).
async function chatBlocker(env, u, room) {
  if (u.blocked) return 'This account has been blocked from posting.';
  if (u.email && !u.email_verified) return 'Please confirm your email before chatting. You can send the confirmation email from your account page.';
  if (room?.archived) return 'This room is archived, so it takes no new messages.';
  const m = await env.DB.prepare('SELECT until FROM chat_mutes WHERE user_id = ? AND until > ?').bind(u.id, now()).first();
  if (m) return `You're muted in chat until ${new Date(m.until).toISOString().slice(0, 16).replace('T', ' ')} UTC.`;
  return '';
}

async function loadRoom(env, id) {
  const r = await env.DB.prepare('SELECT * FROM chat_rooms WHERE id = ?').bind(id).first();
  if (!r) throw new HttpError(404, 'Room not found');
  return r;
}
const roomOut = r => ({ id: r.id, name: r.name, topic: r.topic, sort: r.sort, slow: r.slow, archived: !!r.archived });

// Hand an event about a room to every signed-in page. Saving already happened, so a failure here only delays it
// until their page next catches up.
const chatHub = env => env.CHAT.get(env.CHAT.idFromName('site'));
async function chatBroadcast(env, roomId, event) {
  if (!env.CHAT) return;
  try {
    await chatHub(env).fetch('https://chat/broadcast', { method: 'POST', body: JSON.stringify({ ...event, room: roomId }) });
  } catch (e) { console.error('Chat broadcast failed', e); }
}

// A message with its author, the message it replies to, the painters it mentions and its reactions.
// Removed messages (by a moderator, or from a blocked account) are left out for everyone but admins.
const CHAT_SELECT = `SELECT m.*, u.name AS author_name, ${AVATAR} AS author_avatar, u.blocked AS author_blocked,
  r.body AS reply_body, r.hidden AS reply_hidden, ru.name AS reply_name, ru.blocked AS reply_blocked,
  (SELECT json_group_array(json_array(x.emoji, x.user_id)) FROM chat_reactions x WHERE x.message_id = m.id) AS reacts
  FROM chat_messages m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN chat_messages r ON r.id = m.reply_to LEFT JOIN users ru ON ru.id = r.user_id`;
const CHAT_SHOWN = 'm.hidden = 0 AND COALESCE(u.blocked, 0) = 0';

async function chatOut(env, rows) {
  const ids = [...new Set(rows.flatMap(m => JSON.parse(m.mentions || '[]')))];
  const names = ids.length ? new Map((await env.DB.prepare(`SELECT id, name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results.map(x => [x.id, x.name])) : new Map();
  return rows.map(m => {
    const reactions = {};
    for (const [e, uid] of JSON.parse(m.reacts || '[]')) (reactions[e] ||= []).push(uid);
    const out = {
      id: m.id, room: m.room_id, body: m.body, images: JSON.parse(m.images || '[]'), paints: JSON.parse(m.paints || '[]'),
      mentions: JSON.parse(m.mentions || '[]').filter(id => names.has(id)).map(id => ({ id, name: names.get(id) })),
      reactions, pinned: !!m.pinned, created_at: m.created_at, edited_at: m.edited_at || null,
      author: m.user_id && m.author_name != null ? { id: m.user_id, name: m.author_name, avatar: m.author_avatar } : { id: null, name: '(deleted account)', avatar: null },
      reply: m.reply_to ? (m.reply_body != null && !m.reply_hidden && !m.reply_blocked ? { id: m.reply_to, name: m.reply_name || '(deleted account)', body: m.reply_body.slice(0, 140) } : { id: m.reply_to, gone: true }) : null,
    };
    if (m.hidden) out.hiddenByMod = true;
    if (m.author_blocked) out.authorBlocked = true;
    return out;
  });
}
async function chatOne(env, id) {
  const row = await env.DB.prepare(`${CHAT_SELECT} WHERE m.id = ?`).bind(id).first();
  return row && (await chatOut(env, [row]))[0];
}

// GET /api/chat: the rooms (unread and mention counts for the viewer), and for admins the archived ones too.
async function chatHome(request, env) {
  if (!await hasChat(env)) return json({ unavailable: true, rooms: [] });
  const u = await requireUser(request, env);
  const rows = (await env.DB.prepare(`SELECT r.*,
    (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.room_id = r.id AND m.hidden = 0) AS last_at,
    (SELECT read_at FROM chat_reads x WHERE x.room_id = r.id AND x.user_id = ?1) AS read_at,
    (SELECT COUNT(*) FROM chat_mentions n WHERE n.room_id = r.id AND n.user_id = ?1 AND n.read = 0) AS mentions
    FROM chat_rooms r ${u.admin ? '' : 'WHERE r.archived = 0'} ORDER BY r.archived, r.sort, r.name`).bind(u.id).all()).results;
  return json({
    rooms: rows.map(r => ({ ...roomOut(r), unread: !!r.last_at && r.last_at > (r.read_at || 0), mentions: r.mentions })),
    why: await chatBlocker(env, u, null), emoji: CHAT_EMOJI, live: !!env.CHAT,
  });
}

// GET /api/chat/rooms/:id/messages?before=&after=: CHAT_PAGE messages, oldest first. before (a time) pages back through
// older ones; after catches up on what arrived since. Also the pinned messages and why the viewer can't write, if so.
async function chatMessages(request, env, url, id) {
  const u = await chatUser(request, env), room = await loadRoom(env, id);
  if (room.archived && !u.admin) throw new HttpError(404, 'Room not found');
  const before = parseInt(url.searchParams.get('before'), 10) || 0, after = parseInt(url.searchParams.get('after'), 10) || 0;
  const shown = u.admin ? '1 = 1' : CHAT_SHOWN;
  let rows;
  if (after) rows = (await env.DB.prepare(`${CHAT_SELECT} WHERE m.room_id = ? AND ${shown} AND m.created_at >= ? ORDER BY m.created_at LIMIT 200`).bind(id, after).all()).results;
  else rows = (await env.DB.prepare(`${CHAT_SELECT} WHERE m.room_id = ? AND ${shown}${before ? ' AND m.created_at < ?' : ''} ORDER BY m.created_at DESC LIMIT ${CHAT_PAGE + 1}`)
    .bind(...(before ? [id, before] : [id])).all()).results.reverse();
  const more = !after && rows.length > CHAT_PAGE;
  if (more) rows = rows.slice(1);
  const out = { room: roomOut(room), messages: await chatOut(env, rows), more };
  if (!before && !after) {
    out.pins = await chatOut(env, (await env.DB.prepare(`${CHAT_SELECT} WHERE m.room_id = ? AND m.pinned = 1 AND ${CHAT_SHOWN} ORDER BY m.created_at DESC LIMIT ${CHAT_PINS}`).bind(id).all()).results);
    out.why = await chatBlocker(env, u, room);
  }
  return json(out);
}

// PUT /api/chat/rooms/:id/read: the viewer has the room open, so it isn't unread and its mentions are seen.
async function chatRead(request, env, id) {
  const u = await chatUser(request, env), t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO chat_reads (room_id, user_id, read_at) VALUES (?1, ?2, ?3) ON CONFLICT (room_id, user_id) DO UPDATE SET read_at = ?3').bind(id, u.id, t),
    env.DB.prepare('UPDATE chat_mentions SET read = 1 WHERE room_id = ? AND user_id = ? AND read = 0').bind(id, u.id),
  ]);
  return json({ ok: true });
}

async function chatLimits(env, u, room) {
  if (u.admin) return;
  const t = now();
  const n = await env.DB.prepare(`SELECT COALESCE(SUM(created_at > ?1), 0) AS minute, COALESCE(SUM(created_at > ?2), 0) AS hour, COUNT(*) AS day,
    MAX(created_at) AS last, MAX(CASE WHEN room_id = ?4 THEN created_at END) AS last_here
    FROM chat_messages WHERE user_id = ?3 AND created_at > ?5`).bind(t - 60000, t - 3600000, u.id, room.id, t - 86400000).first();
  if (room.slow && n.last_here && t - n.last_here < room.slow * 1000)
    throw new HttpError(429, `Slow mode is on here: one message every ${room.slow} seconds. Try again in ${Math.ceil((room.slow * 1000 - (t - n.last_here)) / 1000)} s.`);
  if (n.last && t - n.last < CHAT_GAP) throw new HttpError(429, 'Please wait a moment before sending another message');
  if (n.minute >= CHAT_PER_MINUTE || n.hour >= CHAT_PER_HOUR || n.day >= CHAT_PER_DAY) throw new HttpError(429, "You've sent a lot of messages recently, please slow down");
}

// A message's text, photos (uploaded by this user), paints and mentions (painters whose @name is in the text).
async function cleanChat(env, u, b) {
  const text = str(b.body, CHAT_MAX, 'Message');
  const images = [...new Set((Array.isArray(b.images) ? b.images : []).filter(i => typeof i === 'string' && IMAGE_ID.test(i)))];
  if (images.length > CHAT_PHOTOS) throw new HttpError(400, `Too many photos (max ${CHAT_PHOTOS})`);
  if (!text && !images.length) throw new HttpError(400, 'Write something or add a photo');
  await checkImagesOwned(env, u, images);
  const paints = paintKeys(b.paints, CHAT_PAINTS);
  let ids = [...new Set((Array.isArray(b.mentions) ? b.mentions : []).filter(i => typeof i === 'string' && RECIPE_ID.test(i) && i !== u.id))].slice(0, CHAT_MENTIONS);
  if (ids.length) {
    const rows = (await env.DB.prepare(`SELECT id, name FROM users WHERE blocked = 0 AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
    ids = rows.filter(r => text.includes('@' + r.name)).map(r => r.id);
  }
  return { text, images, paints, mentions: ids };
}

// The painters newly mentioned in a message hear about it in Messages, unless they blocked the writer.
async function chatMention(env, u, room, id, ids, t) {
  if (!ids.length) return;
  const blocked = await hasMessages(env) ? new Set((await env.DB.prepare(`SELECT user_id FROM user_blocks WHERE blocked_id = ? AND user_id IN (${ids.map(() => '?').join(',')})`).bind(u.id, ...ids).all()).results.map(r => r.user_id)) : new Set();
  const to = ids.filter(i => !blocked.has(i));
  if (to.length) await env.DB.batch(to.map(i => env.DB.prepare('INSERT OR IGNORE INTO chat_mentions (message_id, user_id, room_id, created_at) VALUES (?, ?, ?, ?)').bind(id, i, room.id, t)));
}

// POST /api/chat/rooms/:id/messages { body, images, paints, mentions, reply_to }: send a message.
async function chatSend(request, env, id) {
  const u = await chatUser(request, env), b = await body(request), room = await loadRoom(env, id);
  if (b.website) return json({ ok: true });
  const why = await chatBlocker(env, u, room);
  if (why) throw new HttpError(403, why);
  const c = await cleanChat(env, u, b);
  let reply = null;
  if (b.reply_to) {
    reply = await env.DB.prepare('SELECT id FROM chat_messages WHERE id = ? AND room_id = ? AND hidden = 0').bind(String(b.reply_to), id).first();
    if (!reply) throw new HttpError(400, 'The message you replied to is gone');
  }
  await chatLimits(env, u, room);
  const mid = crypto.randomUUID(), t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO chat_messages (id, room_id, user_id, body, reply_to, images, paints, mentions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(mid, id, u.id, c.text, reply?.id || null, JSON.stringify(c.images), JSON.stringify(c.paints), JSON.stringify(c.mentions), t),
    env.DB.prepare('INSERT INTO chat_reads (room_id, user_id, read_at) VALUES (?1, ?2, ?3) ON CONFLICT (room_id, user_id) DO UPDATE SET read_at = ?3').bind(id, u.id, t),
  ]);
  await chatMention(env, u, room, mid, c.mentions, t);
  const m = await chatOne(env, mid);
  await chatBroadcast(env, id, { type: 'msg', m });
  return json({ message: m }, 201);
}

async function loadChatMsg(env, id) {
  const m = await env.DB.prepare('SELECT m.*, r.archived FROM chat_messages m JOIN chat_rooms r ON r.id = m.room_id WHERE m.id = ?').bind(id).first();
  if (!m) throw new HttpError(404, 'Message not found');
  return m;
}

// PUT /api/chat/messages/:id: the author edits { body, images, paints, mentions }; admins { pinned } or { hidden }.
async function chatUpdate(request, env, id) {
  const u = await chatUser(request, env), b = await body(request), m = await loadChatMsg(env, id);
  if (b.pinned !== undefined || b.hidden !== undefined) {
    if (!u.admin) throw new HttpError(403, 'Admins only');
    if (b.pinned !== undefined) await env.DB.prepare('UPDATE chat_messages SET pinned = ? WHERE id = ?').bind(b.pinned ? 1 : 0, id).run();
    if (b.hidden !== undefined) await env.DB.prepare('UPDATE chat_messages SET hidden = ? WHERE id = ?').bind(b.hidden ? 1 : 0, id).run();
    const out = await chatOne(env, id);
    // A removed message disappears from everyone's screen; a restored one comes back in place.
    await chatBroadcast(env, m.room_id, b.hidden ? { type: 'delete', id } : { type: 'update', m: out });
    return json({ message: out });
  }
  if (m.user_id !== u.id) throw new HttpError(403, 'You can only edit your own messages');
  const why = await chatBlocker(env, u, { archived: m.archived });
  if (why) throw new HttpError(403, why);
  const c = await cleanChat(env, u, b), old = JSON.parse(m.images || '[]'), before = new Set(JSON.parse(m.mentions || '[]'));
  await env.DB.prepare('UPDATE chat_messages SET body = ?, images = ?, paints = ?, mentions = ?, edited_at = ? WHERE id = ?')
    .bind(c.text, JSON.stringify(c.images), JSON.stringify(c.paints), JSON.stringify(c.mentions), now(), id).run();
  await chatMention(env, u, { id: m.room_id }, id, c.mentions.filter(i => !before.has(i)), now());
  await dropUnusedImages(env, old.filter(i => !c.images.includes(i)));
  const out = await chatOne(env, id);
  if (!m.hidden) await chatBroadcast(env, m.room_id, { type: 'update', m: out });
  return json({ message: out });
}

// DELETE /api/chat/messages/:id (author or admin): gone for good, with its reactions and mentions.
async function chatDelete(request, env, id) {
  const u = await chatUser(request, env), m = await loadChatMsg(env, id);
  if (m.user_id !== u.id && !u.admin) throw new HttpError(403, 'You can only delete your own messages');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM chat_reactions WHERE message_id = ?').bind(id),
    env.DB.prepare('DELETE FROM chat_mentions WHERE message_id = ?').bind(id),
    env.DB.prepare('DELETE FROM chat_messages WHERE id = ?').bind(id),
  ]);
  await dropUnusedImages(env, JSON.parse(m.images || '[]'));
  await chatBroadcast(env, m.room_id, { type: 'delete', id });
  return json({ ok: true });
}

// PUT /api/chat/messages/:id/react { emoji, on }: add or take back one of the CHAT_EMOJI reactions.
async function chatReact(request, env, id) {
  const u = await chatUser(request, env), b = await body(request), m = await loadChatMsg(env, id);
  if (!CHAT_EMOJI.includes(b.emoji)) throw new HttpError(400, 'Pick one of the reactions');
  if (m.hidden) throw new HttpError(404, 'Message not found');
  if (b.on === false) await env.DB.prepare('DELETE FROM chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').bind(id, u.id, b.emoji).run();
  else {
    if (u.blocked) throw new HttpError(403, 'This account has been blocked from posting');
    await env.DB.prepare('INSERT OR IGNORE INTO chat_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)').bind(id, u.id, b.emoji, now()).run();
  }
  const reactions = {};
  for (const r of (await env.DB.prepare('SELECT emoji, user_id FROM chat_reactions WHERE message_id = ? ORDER BY created_at').bind(id).all()).results) (reactions[r.emoji] ||= []).push(r.user_id);
  await chatBroadcast(env, m.room_id, { type: 'react', id, reactions });
  return json({ reactions });
}

// GET /api/chat/mentions: unread @mentions of the viewer, for Messages. POST marks them all read.
async function chatMentions(request, env) {
  const u = await requireUser(request, env);
  if (!await hasChat(env)) return json({ mentions: [] });
  const rows = (await env.DB.prepare(`${CHAT_SELECT} JOIN chat_mentions n ON n.message_id = m.id WHERE n.user_id = ? AND n.read = 0 AND ${CHAT_SHOWN} ORDER BY m.created_at DESC LIMIT 30`).bind(u.id).all()).results;
  const rooms = new Map((await env.DB.prepare('SELECT id, name FROM chat_rooms').all()).results.map(r => [r.id, r.name]));
  return json({ mentions: (await chatOut(env, rows)).map(m => ({ ...m, room_name: rooms.get(m.room) || m.room })) });
}
async function readChatMentions(request, env) {
  const u = await requireUser(request, env);
  await needChat(env);
  await env.DB.prepare('UPDATE chat_mentions SET read = 1 WHERE user_id = ?').bind(u.id).run();
  return json({ ok: true });
}

// GET /api/chat/ws: the live connection every signed-in page keeps open. The browser sends its session cookie with it;
// the Worker checks it and tells the hub who connected (the hub is only reachable through here).
async function chatSocket(request, env, url) {
  if (request.headers.get('Upgrade') !== 'websocket') throw new HttpError(426, 'Expected a WebSocket');
  // Browsers send Origin with WebSockets but other sites' pages can open them too, so only this site's own pages may.
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Bad origin' }, 403);
  if (!env.CHAT) throw new HttpError(503, 'Live chat is not set up on this server');
  const u = await chatUser(request, env);
  const h = new Headers(request.headers);
  h.set('X-Chat-User', JSON.stringify({ id: u.id, name: u.name, avatar: u.avatar || null }));
  return chatHub(env).fetch(new Request('https://chat/ws', { headers: h }));
}

// Admins: POST /api/chat/rooms { name, topic } adds a room; PUT /api/chat/rooms/:id { name, topic, sort, slow, archived } edits one.
const roomName = v => str(v, 30, 'Name', { required: true }).toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '').replace(/-+/g, '-');
async function chatAddRoom(request, env) {
  await needChat(env);
  await requireAdmin(request, env);
  const b = await body(request), name = roomName(b.name), topic = str(b.topic, 120, 'Topic');
  if (!name) throw new HttpError(400, 'Name is required');
  if (await env.DB.prepare('SELECT 1 FROM chat_rooms WHERE lower(name) = lower(?)').bind(name).first()) throw new HttpError(400, 'There is already a room with that name');
  let id = slug(name) || 'room';
  if (await env.DB.prepare('SELECT 1 FROM chat_rooms WHERE id = ?').bind(id).first()) id += '-' + crypto.randomUUID().slice(0, 4);
  const max = await env.DB.prepare('SELECT MAX(sort) AS m FROM chat_rooms').first();
  await env.DB.prepare('INSERT INTO chat_rooms (id, name, topic, sort, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, name, topic, (max.m || 0) + 10, now()).run();
  return json({ room: roomOut(await loadRoom(env, id)) }, 201);
}
async function chatEditRoom(request, env, id) {
  await needChat(env);
  await requireAdmin(request, env);
  const b = await body(request);
  await loadRoom(env, id);
  const sets = [], args = [];
  if (b.name !== undefined) {
    const name = roomName(b.name);
    if (!name) throw new HttpError(400, 'Name is required');
    if (await env.DB.prepare('SELECT 1 FROM chat_rooms WHERE lower(name) = lower(?) AND id != ?').bind(name, id).first()) throw new HttpError(400, 'There is already a room with that name');
    sets.push('name = ?'); args.push(name);
  }
  if (b.topic !== undefined) { sets.push('topic = ?'); args.push(str(b.topic, 120, 'Topic')); }
  if (b.sort !== undefined) { sets.push('sort = ?'); args.push(Math.max(0, Math.min(9999, parseInt(b.sort, 10) || 0))); }
  if (b.slow !== undefined) { sets.push('slow = ?'); args.push(Math.max(0, Math.min(3600, parseInt(b.slow, 10) || 0))); }
  if (b.archived !== undefined) { sets.push('archived = ?'); args.push(b.archived ? 1 : 0); }
  if (sets.length) await env.DB.prepare(`UPDATE chat_rooms SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  const room = roomOut(await loadRoom(env, id));
  await chatBroadcast(env, id, { type: 'room', room });
  return json({ room });
}

// Admins: PUT /api/chat/mutes/:userId { hours } mutes a painter in every room for that long (0 lifts it).
async function chatMute(request, env, id) {
  await needChat(env);
  const admin = await requireAdmin(request, env), b = await body(request);
  if (id === admin.id) throw new HttpError(400, "You can't mute yourself");
  if (!await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(id).first()) throw new HttpError(404, 'Painter not found');
  const hours = Math.max(0, Math.min(24 * 365, Number(b.hours) || 0));
  if (!hours) await env.DB.prepare('DELETE FROM chat_mutes WHERE user_id = ?').bind(id).run();
  else await env.DB.prepare('INSERT INTO chat_mutes (user_id, until, by_id, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (user_id) DO UPDATE SET until = ?2, by_id = ?3, created_at = ?4')
    .bind(id, now() + hours * 3600000, admin.id, now()).run();
  return json({ ok: true, until: hours ? now() + hours * 3600000 : null });
}

// The live side of chat. It keeps no data of its own: it holds a connection from every signed-in page (asleep between
// events, thanks to WebSocket hibernation), keeps the list of who is online, and passes on what the Worker hands it.
// A page says 'active' or 'idle' as its visitor comes and goes; online means at least one active page. Changes to the
// list are sent at most every PRESENCE_WAIT, so a burst of page loads makes one update.
// (The class is still called ChatRoom because the deployed Durable Object kept that name.)
const PRESENCE_WAIT = 2000;
export class ChatRoom {
  constructor(ctx) {
    this.ctx = ctx;
    // Pages ping every so often to keep the connection open; the answer doesn't need to wake the hub.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/broadcast') {
      this.send(await request.text());
      return new Response('ok');
    }
    const user = JSON.parse(request.headers.get('X-Chat-User') || 'null');
    if (!user) return new Response('No user', { status: 400 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ ...user, active: true });
    // The new page gets the list straight away; everyone else with the next update.
    server.send(JSON.stringify({ type: 'presence', users: this.online() }));
    await this.changed();
    return new Response(null, { status: 101, webSocket: client });
  }
  send(text) {
    for (const ws of this.ctx.getWebSockets()) try { ws.send(text); } catch (e) {}
  }
  // Everyone with at least one active page, once each however many tabs they have.
  online(skip) {
    const seen = new Map();
    for (const ws of this.ctx.getWebSockets()) if (ws !== skip) {
      const u = ws.deserializeAttachment();
      if (u?.active && !seen.has(u.id)) seen.set(u.id, { id: u.id, name: u.name, avatar: u.avatar });
    }
    return [...seen.values()];
  }
  async changed() {
    if (await this.ctx.storage.getAlarm() == null) await this.ctx.storage.setAlarm(Date.now() + PRESENCE_WAIT);
  }
  alarm() { this.send(JSON.stringify({ type: 'presence', users: this.online() })); }
  async webSocketMessage(ws, msg) {
    if (msg !== 'active' && msg !== 'idle') return;
    const u = ws.deserializeAttachment();
    if (!u || u.active === (msg === 'active')) return;
    ws.serializeAttachment({ ...u, active: msg === 'active' });
    await this.changed();
  }
  async webSocketClose(ws) {
    try { ws.close(1000); } catch (e) {}
    await this.changed();
  }
  async webSocketError() { await this.changed(); }
}

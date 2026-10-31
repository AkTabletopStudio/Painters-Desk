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
  const msg = await hasMessages(env), fnd = await hasFindable(env);
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.email_verified, ${AVATAR} AS avatar, u.avatar AS provider_avatar, u.avatar_image, u.bio, u.link, u.favourites, u.updates, u.updates_asked, u.blocked, u.created_at${msg ? ', u.dm, u.dm_mail' : ''}${fnd ? ', u.findable' : ''}
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
  const messages = await hasMessages(env);
  // Email + password sign-up is always available; logins includes 'email' once a password is set.
  // mail: confirmation and password-reset emails can be sent.
  return json({ user, logins, providers, passwords: true, mail: mailReady(env), messages, devLogin: env.DEV_LOGIN === '1' });
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
  const scope = ['mine', 'saved'].includes(url.searchParams.get('scope')) ? url.searchParams.get('scope') : 'public';
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
  const kind = ['user', 'message'].includes(b.kind) ? b.kind : 'recipe';
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
    const what = kind === 'recipe' ? `"${row.name}" (${url.origin}/#/recipe/${target})` : kind === 'message' ? `a private message from ${row.name}` : `the profile of ${row.name} (${url.origin}/#/u/${target})`;
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

/* ---------- the Painters list ---------- */

// The column comes with migration 0016. Until it is applied everyone is listed and the setting to hide is missing.
let findableReady = false;
async function hasFindable(env) {
  if (!findableReady) findableReady = !!(await env.DB.prepare("SELECT 1 FROM pragma_table_info('users') WHERE name = 'findable'").first());
  return findableReady;
}

// GET /api/people?q=&sort=active|new&offset=: painters to find and message, PEOPLE_PAGE at a time. Blocked accounts,
// sign-ups that never confirmed their email, and people who turned the list off are left out.
// active: the most public recipes, tutorials and palettes first, then the most recently active.
const PEOPLE_PAGE = 48;
async function listPeople(request, env, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60).replace(/[%_]/g, '');
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'active';
  const offset = Math.max(0, Math.min(5000, parseInt(url.searchParams.get('offset'), 10) || 0));
  const where = ['u.blocked = 0', "(u.email IS NULL OR u.email = '' OR u.email_verified = 1)"], args = [];
  if (await hasFindable(env)) where.push('u.findable = 1');
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
// how many open feedback conversations are waiting on the team).
async function unreadCount(request, env) {
  if (!await hasMessages(env)) return json({ n: 0, team: 0, unavailable: true });
  const u = await currentUser(request, env), token = await anonToken(request);
  if (!u && !token) return json({ n: 0, team: 0 });
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM conversations WHERE (a_id = ?1 AND a_hidden = 0 AND b_last > a_read)
    OR (kind = 'direct' AND b_id = ?1 AND b_hidden = 0 AND a_last > b_read) OR (a_id IS NULL AND ?2 != '' AND a_token = ?2 AND b_last > a_read)`).bind(u?.id || '', token).first();
  const team = u?.admin ? (await env.DB.prepare("SELECT COUNT(*) AS n FROM conversations WHERE kind = 'feedback' AND status = 'open' AND a_last > b_read").first()).n : 0;
  return json({ n: r.n, team });
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
  else await env.DB.prepare('INSERT OR IGNORE INTO user_blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(u.id, id, now()).run();
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

// The Painters Desk API: accounts (OAuth sign-in), paint collections, recipes/tutorials and comments.
// Static files are served from the assets binding; only /api/* runs through this Worker (see wrangler.jsonc).

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
  async fetch(request, env) {
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
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      // Writes must come from this site's own pages (blocks cross-site form posts using the session cookie).
      if (request.method !== 'GET' && request.method !== 'HEAD') {
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
  if (p === '/api/images' && m === 'POST') return uploadImage(request, env);
  if ((r = p.match(/^\/api\/images\/([\w-]+)$/)) && m === 'GET') return getImage(env, r[1]);
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

// A user's picture: their uploaded icon if they chose one, else the picture from their sign-in service.
const AVATAR = "CASE WHEN u.avatar_image != '' THEN '/api/images/' || u.avatar_image ELSE u.avatar END";

async function currentUser(request, env) {
  const token = cookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.email_verified, ${AVATAR} AS avatar, u.avatar AS provider_avatar, u.avatar_image, u.bio, u.link, u.favourites, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(await sha256(token), now()).first();
  if (!row) return null;
  // Only a verified email can grant admin rights, so typing someone's address at sign-up gains nothing.
  row.admin = !!row.email && !!row.email_verified && adminEmails(env).includes(row.email.toLowerCase());
  row.email_verified = !!row.email_verified;
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
const safeReturn = r => (typeof r === 'string' && /^\/(?!\/)/.test(r) ? r : '/');

/* ---------- accounts ---------- */

async function me(request, env) {
  const user = await currentUser(request, env);
  const providers = Object.entries(PROVIDERS).filter(([, p]) => p.id(env) && p.secret(env)).map(([k, p]) => ({ id: k, label: p.label }));
  let logins = [];
  if (user) logins = (await env.DB.prepare('SELECT provider FROM identities WHERE user_id = ?').bind(user.id).all()).results.map(r => r.provider);
  // Email + password sign-up is always available; logins includes 'email' once a password is set.
  // mail: confirmation and password-reset emails can be sent.
  return json({ user, logins, providers, passwords: true, mail: mailReady(env), devLogin: env.DEV_LOGIN === '1' });
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

// PBKDF2 via Web Crypto. 20,000 rounds keeps a sign-in inside the Workers Free plan's 10 ms CPU limit
// (100,000 is the most Workers allow and needs the Paid plan). The count is stored with each hash, and a sign-in
// re-hashes older passwords at the current count, so raising it later upgrades accounts as people sign in.
const PBKDF2_ITER = 20000;
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
    env.DB.prepare('INSERT INTO users (id, name, email, avatar, created_at, email_verified) VALUES (?, ?, ?, NULL, ?, 0)').bind(userId, name, email, t),
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

async function sendMail(env, to, subject, text, link, button) {
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1b1b1b;max-width:520px">
<p style="font-size:20px;font-weight:700;margin:0 0 12px">The Painters Desk</p>
${text.split('\n\n').map(p => `<p>${p.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</p>`).join('')}
<p><a href="${link}" style="display:inline-block;background:#ffd23f;color:#1b1b1b;font-weight:700;text-decoration:none;padding:10px 18px;border:3px solid #1b1b1b;border-radius:14px">${button}</a></p>
<p style="color:#666;font-size:13px">Or copy this link: ${link}</p></div>`;
  if (env.EMAIL && env.MAIL_FROM) {
    try { await env.EMAIL.send({ from: env.MAIL_FROM, to, subject, text: `${text}\n\n${button}: ${link}`, html }); }
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
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text: `${text}\n\n${button}: ${link}`, html }),
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
  const p = await env.DB.prepare(`SELECT u.id, u.name, ${AVATAR} AS avatar, u.bio, u.link, u.favourites, u.created_at FROM users u WHERE u.id = ?`).bind(id).first();
  if (!p) throw new HttpError(404, 'Painter not found');
  p.favourites = JSON.parse(p.favourites || '[]');
  const rows = (await env.DB.prepare(
    `SELECT r.*, u.name AS author_name, ${AVATAR} AS author_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
       (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS vote_count
     FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? AND r.visibility = 'public' ORDER BY r.updated_at DESC LIMIT 100`
  ).bind(id).all()).results;
  return json({ profile: p, recipes: rows.map(listItem) });
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

/* ---------- recipes & tutorials ---------- */

const recipeOut = r => ({
  id: r.id, kind: r.kind, title: r.title, summary: r.summary, body: r.body, link: r.link,
  paints: JSON.parse(r.paints || '[]'), steps: JSON.parse(r.steps || '[]'), cover: r.cover || '', visibility: r.visibility, created_at: r.created_at, updated_at: r.updated_at,
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
  const rows = (await env.DB.prepare(
    `SELECT r.*, u.name AS author_name, ${AVATAR} AS author_avatar,
       (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
       (SELECT COUNT(*) FROM votes v WHERE v.recipe_id = r.id) AS vote_count
     FROM ${from} JOIN users u ON u.id = r.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 100`
  ).bind(...args).all()).results;
  return json({ recipes: rows.map(r => ({ ...listItem(r), saved: scope === 'saved' })) });
}

// The list only needs a picture: the main photo, else the last step photo (usually the finished model).
function listItem(r) {
  const o = recipeOut(r);
  o.cover = o.cover || [...o.steps].reverse().find(s => s.image)?.image || '';
  o.steps = o.steps.length; o.saved = false; delete o.body;
  return o;
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
      `SELECT c.id, c.body, c.created_at, c.user_id, u.name, ${AVATAR} AS avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.recipe_id = ? ORDER BY c.created_at`
    ).bind(id).all()).results.map(c => ({ id: c.id, body: c.body, created_at: c.created_at, author: { id: c.user_id, name: c.name, avatar: c.avatar } }));
  }
  return json({ recipe: recipeOut(r), comments });
}

const IMAGE_ID = /^[0-9a-f-]{36}$/;

// Validate the steps and make sure every photo they use was uploaded by this user.
function cleanSteps(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 30) throw new HttpError(400, 'Too many steps (max 30)');
  const steps = raw.map((s, i) => {
    const mix = (Array.isArray(s?.mix) ? s.mix : []).filter(m => typeof m?.k === 'string' && m.k && m.k.length <= 120)
      .map(m => ({ k: m.k, parts: Math.min(20, Math.max(1, Math.round(Number(m.parts) || 1))) }));
    if (mix.length > 8) throw new HttpError(400, `Step ${i + 1} has too many paints (max 8)`);
    const image = typeof s?.image === 'string' && IMAGE_ID.test(s.image) ? s.image : '';
    return { title: str(s?.title, 80, `Step ${i + 1} name`), text: str(s?.text, 4000, `Step ${i + 1} details`), image, mix };
  }).filter(s => s.title || s.text || s.image || s.mix.length);
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
  const steps = cleanSteps(b.steps);
  const cover = typeof b.cover === 'string' && IMAGE_ID.test(b.cover) ? b.cover : '';
  // "paints" is every paint in the steps plus any extras listed separately; it drives list swatches and the wheel button.
  const paints = paintKeys([...steps.flatMap(s => s.mix.map(m => m.k)), ...(Array.isArray(b.paints) ? b.paints : [])], 60);
  const rec = {
    kind: b.kind === 'tutorial' ? 'tutorial' : 'recipe',
    title: str(b.title, 120, 'Title', { required: true }),
    summary: str(b.summary, 300, 'Summary'),
    body: str(b.body, 20000, 'Notes'),
    link: str(b.link, 500, 'Video link'),
    paints: JSON.stringify(paints),
    steps: JSON.stringify(steps),
    cover,
    visibility: b.visibility === 'public' ? 'public' : 'private',
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
    await env.DB.prepare('UPDATE recipes SET kind=?, title=?, summary=?, body=?, link=?, paints=?, steps=?, cover=?, visibility=?, updated_at=? WHERE id=?')
      .bind(rec.kind, rec.title, rec.summary, rec.body, rec.link, rec.paints, rec.steps, rec.cover, rec.visibility, t, id).run();
  } else {
    await checkImagesOwned(env, u, [...used]);
    id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO recipes (id, user_id, kind, title, summary, body, link, paints, steps, cover, visibility, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, u.id, rec.kind, rec.title, rec.summary, rec.body, rec.link, rec.paints, rec.steps, rec.cover, rec.visibility, t, t).run();
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
async function uploadImage(request, env) {
  const u = await requireUser(request, env);
  if (!env.IMAGES) throw new HttpError(503, 'Photo storage is not set up yet');
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (!IMAGE_TYPES.includes(type)) throw new HttpError(400, 'Photos must be JPEG, PNG or WebP');
  const data = await request.arrayBuffer();
  if (!data.byteLength) throw new HttpError(400, 'Empty photo');
  if (data.byteLength > MAX_IMAGE) throw new HttpError(413, 'Photo is too large (max 5 MB)');
  const id = crypto.randomUUID();
  await env.IMAGES.put(`img/${id}`, data, { httpMetadata: { contentType: type } });
  await env.DB.prepare('INSERT INTO images (id, user_id, content_type, size, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, u.id, type, data.byteLength, now()).run();
  return json({ id, url: `/api/images/${id}` }, 201);
}

// Photo IDs are random, so a private tutorial's photos can only be found by someone who has the link.
async function getImage(env, id) {
  if (!env.IMAGES || !IMAGE_ID.test(id)) return json({ error: 'Not found' }, 404);
  const obj = await env.IMAGES.get(`img/${id}`);
  if (!obj) return json({ error: 'Not found' }, 404);
  const type = obj.httpMetadata?.contentType;
  return new Response(obj.body, {
    headers: {
      'Content-Type': IMAGE_TYPES.includes(type) ? type : 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/* ---------- comments (public recipes, signed-in users) ---------- */

async function addComment(request, env, recipeId) {
  const u = await requireUser(request, env), b = await body(request);
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

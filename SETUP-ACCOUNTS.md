# Accounts, collections & recipes: setup

This experiment adds a small API (`worker/index.js`) behind `/api/*`, a Cloudflare D1 database (`migrations/`), and the
front-end pages in `account.js`. The colour wheel still works without any of it: if `/api/me` can't be reached,
the extra tabs stay hidden.

## Try it locally (no keys needed)

```
npm install
cp .dev.vars.example .dev.vars     # DEV_LOGIN=1 turns on the test sign-in button
npm run dev                        # applies the database migration locally, then serves http://localhost:8787
```

Open http://localhost:8787, click **Sign in**, type any name and press **Dev sign-in**. Use two names (two browser
profiles) to try comments between users.

## Before it can go live

1. **Create the database** (once): `npx wrangler d1 create painters-desk`, then paste the printed `database_id`
   into `wrangler.jsonc`, and run `npm run db:migrate:remote` (run it again whenever a new file lands in `migrations/`).
2. **Create the photo bucket** (once): `npx wrangler r2 bucket create painters-desk-images`. R2 has to be switched on
   for the Cloudflare account first (dashboard > R2); the free tier covers 10 GB.
3. **Create the OAuth apps** and store their keys as Worker secrets
   (`npx wrangler secret put GOOGLE_CLIENT_ID`, and so on, or in the Cloudflare dashboard under the Worker's
   Settings > Variables and Secrets). Each sign-in button appears once both its ID and secret are set.

   | Provider | Where to create it | Redirect URL to register | Secrets |
   |---|---|---|---|
   | Google | Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application). Set up the consent screen first. | `https://paintersdesk.com/api/auth/callback/google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
   | Discord | discord.com/developers/applications > New Application > OAuth2 | `https://paintersdesk.com/api/auth/callback/discord` | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
   | GitHub | github.com/settings/developers > New OAuth App | `https://paintersdesk.com/api/auth/callback/github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

   For local testing with real providers, also register `http://localhost:8787/api/auth/callback/<provider>`
   and put the keys in `.dev.vars`.
4. Optional: `ADMIN_EMAILS` (comma-separated) lets those accounts delete any recipe or comment.
5. **Never** set `DEV_LOGIN` on the live Worker: it lets anyone sign in as anyone.

Apple sign-in is not included yet: it needs a paid Apple Developer account and a signed client secret that has to be
renewed every six months.

## How sign-in works

- First sign-in creates the account automatically. Signing in later with a different provider that has the same
  verified email joins the same account; signed-in users can also link more providers from their account page.
- Sessions are a random token in an HttpOnly cookie (30 days); only its SHA-256 hash is stored.
- Writes (POST/PUT/DELETE) are refused unless they come from the site's own pages (Origin check).
- Users can delete their account, which removes their collection, recipes and comments.

## Data

- Collection rows store a paint key `<range>|<code>|<name>` from `data.js`. Renaming a paint in `data.js` orphans
  saved entries for it (they show as "Unknown paint" in recipes).
- Tutorials and recipes: title, type, summary, a main photo, an optional video link (YouTube and Vimeo links play in
  the page), and up to 30 steps. Each step has a name, up to 8 paints with mix ratios (parts), details and a photo.
  Public or private.
- Photos are shrunk in the browser (long edge 1600px, JPEG) and stored in R2 under a random ID; anyone with a photo's
  link can open it, so a private tutorial's photos are hidden only by that link being unguessable. Photos removed
  from a tutorial, or belonging to a deleted tutorial or account, are deleted from R2. Photos uploaded but never
  saved are not cleaned up yet.
  Private recipes return "not found" to everyone except the owner. Comments are only allowed on public recipes,
  by signed-in users, with a 10-second gap between comments per user.

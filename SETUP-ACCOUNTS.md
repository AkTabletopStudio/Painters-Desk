# Accounts, collections & recipes: setup

This experiment adds a small API (`worker/index.js`) behind `/api/*`, a Cloudflare D1 database (`migrations/`), and the
front-end pages in `account.js`. The colour wheel still works without any of it: if `/api/me` can't be reached,
or no sign-in method is set up yet, the extra tabs stay hidden.

## Try it locally (no keys needed)

```
npm install
cp .dev.vars.example .dev.vars     # DEV_LOGIN=1 turns on the test sign-in button
npm run dev                        # applies the database migration locally, then serves http://localhost:8787
```

Open http://localhost:8787, click **Sign in**, type any name and press **Dev sign-in**. You can also press **Create account** to
make an email + password account. Adding `&email=you@example.com` to a `/api/auth/dev` link acts like a sign-in
service that verified that email, to try account linking. Use two names (two browser
profiles) to try comments between users.

## Before it can go live

1. **Database**: done. The live D1 database `painters-desk` exists and both migrations are applied. Run
   `npm run db:migrate:remote` whenever a new file lands in `migrations/`.
2. **Photo bucket**: done. R2 bucket `painters-desk-images` exists and is bound as `IMAGES`.
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
- Private recipes return "not found" to everyone except the owner. Comments are only allowed on public recipes,
  by signed-in users, with a 10-second gap between comments per user.

## Email + password accounts and profiles

Anyone can create an account with an email and password (no keys needed). Passwords are stored as salted
PBKDF2-SHA256 hashes (20,000 rounds, so sign-in fits the Workers Free plan's 10 ms CPU limit; on the Paid plan raise
`PBKDF2_ITER` in `worker/index.js` up to 100,000 and passwords upgrade as people sign in); ten wrong passwords lock that account's password sign-in
for 15 minutes. An email typed at sign-up stays **not confirmed** until its owner clicks the confirmation link (or
signs in with a service that verifies it). Until then it never grants admin rights, and if someone later signs in with
Google (or another service) that verifies the same email, that person gets the account and the unconfirmed password
is removed. A signed-in user who links a service with the same email keeps their password and the email becomes
confirmed.

## Confirmation and password-reset emails (Resend)

Emails go out through [Resend](https://resend.com) (free tier: 3,000 emails a month, 100 a day). Cloudflare's own
Email Sending needs the Workers Paid plan. Until both secrets below are set, the site hides the email features and
works as before. Locally, with `DEV_LOGIN=1` and no key, emails are printed in the `npm run dev` console instead.

1. Sign up at resend.com, open **Domains > Add domain**, enter `paintersdesk.com` and pick a region.
2. Add the DNS records Resend shows (a DKIM TXT record, plus MX and SPF TXT records on a `send` subdomain) in the
   Cloudflare dashboard under the domain's **DNS > Records**, or use Resend's automatic Cloudflare setup. Press
   **Verify** in Resend once they are in.
3. In Resend open **API Keys > Create API key** with **Sending access** for paintersdesk.com.
4. In the Cloudflare dashboard open **Workers & Pages > painters-desk > Settings > Variables and Secrets** (the runtime
   one near Bindings, not the Builds one) and add two secrets:
   - `RESEND_API_KEY`: the key from step 3.
   - `MAIL_FROM`: the sender, e.g. `The Painters Desk <hello@paintersdesk.com>`.
5. Needs migration `0005_email_tokens.sql`.

### Or Cloudflare Email Sending (Workers Paid plan)

Cloudflare only sends to arbitrary addresses on Workers Paid ($5 a month, which includes 3,000 emails a month).
When the Worker has an `EMAIL` binding it is used instead of Resend:

1. In the Cloudflare dashboard open **Compute > Email Service > Email Sending > Onboard Domain** and pick
   paintersdesk.com (Cloudflare adds the DNS records itself).
2. Add `"send_email": [{ "name": "EMAIL" }]` to `wrangler.jsonc` (only after step 1, or the deploy can fail).
3. Keep the `MAIL_FROM` secret; `RESEND_API_KEY` is then not needed.

Profiles (`#/u/<user id>`) show the icon, display name, about text, link, favourite paints and public recipes &
tutorials. Uploaded icons go to the R2 bucket like tutorial photos. Needs migration `0004_profiles_passwords.sql`.

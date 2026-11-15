# Store apps

Both apps load the live site, so every site deploy reaches them without a store update.
Nothing in `apps/` is served by the website (it is listed in `.assetsignore`).

## Android: Trusted Web Activity (`apps/android`)

The app is Chrome running paintersdesk.com full screen. Sign-in (Google, Discord, GitHub, email)
works exactly as on the web because it is the real browser, with its own cookies.

Build (needs Node, a JDK 17 and the Android SDK; Bubblewrap offers to download the last two):

    npm i -g @bubblewrap/cli
    cd apps/android
    bubblewrap init --manifest https://paintersdesk.com/manifest.webmanifest   # answers come from twa-manifest.json
    bubblewrap build        # makes app-release-bundle.aab, signed with android.keystore

Keep `android.keystore` and its passwords somewhere safe and never commit them (`.gitignore` blocks
`*.keystore`). Losing the upload key means asking Google to reset it.

Verification: Play Console > Test and release > App integrity > App signing shows two SHA-256
fingerprints (the app signing key and the upload key). Put both, comma separated, in the Worker's runtime
variable `ANDROID_CERT_SHA256` (Cloudflare > Workers > painters-desk > Settings > Variables and Secrets).
The Worker then serves them at https://paintersdesk.com/.well-known/assetlinks.json. Until it does, the
app still works but shows a small browser bar at the top.

Play rules to plan for: new personal developer accounts must run a closed test with at least 12
testers for 14 days before the app can go to production.

## iPhone: Capacitor (`apps/ios`)

A native shell that opens paintersdesk.com. Still to do before it can go to Apple review:

1. Sign-in: Google refuses sign-in inside an app web view, so OAuth must open in a system browser
   sheet (`@capacitor/browser`, ASWebAuthenticationSession) and return to the app with a one-time
   code that the Worker swaps for a session cookie.
2. Sign in with Apple: required by App Store guideline 4.8 because the site offers Google, Discord
   and GitHub sign-in.
3. Native touches for guideline 4.2 (minimum functionality): share sheet, camera for Palette from a
   photo, haptics.
4. Builds run on GitHub's macOS runners, so no Mac is needed.

Set up locally (on a Mac) with:

    cd apps/ios
    npm install
    npm run add:ios     # creates apps/ios/ios (Xcode project, git-ignored until it is ready to commit)
    npm run sync

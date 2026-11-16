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

A native shell (Capacitor 8, Swift Package Manager) that opens paintersdesk.com. The Xcode project in
`apps/ios/ios` is committed; `npx cap sync ios` refreshes it after a plugin or config change.

- Sign-in: Google and the others open in a system browser sheet and hand back through the `paintersdesk://`
  URL scheme (registered in Info.plist). Sign in with Apple works the same way. See SETUP-ACCOUNTS.md.
- Native touches: share sheet (Share button on tutorials and recipes), a light haptic tap when picking a paint,
  camera and photo library for Palette from a photo and uploads (permission texts in Info.plist).
- `WKAppBoundDomains` = paintersdesk.com, so the site's offline service worker runs inside the app.
- iPhone only for now (TARGETED_DEVICE_FAMILY = 1), portrait. Icon: `assets/icon-1024.png` (the Neon 1984 icon,
  full-bleed), copied into Assets.xcassets/AppIcon.appiconset.

### Building (no Mac needed)

GitHub Actions > "iPhone build to TestFlight" > Run workflow. It archives on a GitHub macOS runner, signs
automatically with an App Store Connect API key and uploads to TestFlight. Repository secrets it needs:
`APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the whole .p8 file). The API key needs the
Admin role, because automatic signing creates the distribution certificate. The build number is the run number.

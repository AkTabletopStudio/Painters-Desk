# The Painters Desk

Miniature-paint colour wheel with cross-brand matches, by AK Tabletop Studio. Static site, no build step.

- `index.html` – page layout, styles and credits
- `app.js` – the wheel, picker and match logic
- `data.js` – paint list and cross-brand match data (large, rarely changes)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable and offline-capable
- `_headers` – tells Cloudflare Pages not to cache the page or service worker

## Deploy (Cloudflare Pages)
Framework preset: None. Build command: (empty). Output directory: `/`.

## After editing any file
Bump the `VERSION` string in `sw.js` (e.g. `painters-desk-v4` -> `v5`) so installed copies update.

Swatch colours are estimates; matches are close, never exact. Unofficial, not affiliated with any paint brand.

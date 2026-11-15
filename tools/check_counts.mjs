// Checks that every hard-coded "N paints from B brands" on the site matches data.js.
// Run after adding paints:  node tools/check_counts.mjs
// The wheel counter (account.js wCount) and the /paints pages (worker/seo.js) count live,
// so only the static text in index.html and manifest.webmanifest needs this check.
// The share image (icons/og-image-*.jpg) is a picture: re-render it from
// branding/og/og-source.html in the project files when this script reports a new count.
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');

const raw = read('data.js').split('const RAW=`')[1].split('`')[0];
let g = 'M', paints = 0; const used = new Set();
for (const l of raw.split('\n')) {
  if (!l) continue;
  if (l[0] === '#') { g = l[1]; continue }
  if (g === 'B') continue; // Pro Acryl basing textures are listed but aren't paints
  paints++; used.add(g);
}
const brands = [...read('app.js').match(/const BRANDS=(\[.*?\]\]\]);/)[1].matchAll(/\['([^']+)',\[([^\]]*)\]\]/g)]
  .filter(m => [...m[2].matchAll(/'([^']*)'/g)].some(x => used.has(x[1]))).length;
const want = `${paints.toLocaleString('en')} paints from ${brands} brands`;
console.log('data.js:', want);

let bad = 0;
for (const f of ['index.html', 'manifest.webmanifest']) {
  const s = f === 'index.html' ? read(f).split('<section id="v-changelog"')[0] : read(f); // What's new keeps old figures
  for (const m of s.matchAll(/([\d,]+) (?:miniature )?paints from (\d+) brands/g)) {
    const ok = m[0].replace(' miniature', '') === want;
    if (!ok) { bad++; console.log(`${f}: "${m[0]}" should say "${want}"`) }
  }
}
console.log(bad ? `${bad} stale count(s)` : 'All counts match.');
process.exit(bad ? 1 : 0);

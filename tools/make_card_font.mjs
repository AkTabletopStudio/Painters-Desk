// Builds worker/card-font.js: small bitmap fonts for the share card pictures (worker/card.js).
// The Worker can't draw text itself, so each letter is drawn once here, in a browser, from the site's own
// self-hosted fonts, and saved as a greyscale bitmap with its width and kerning.
// Run from the repo root: node tools/make_card_font.mjs  (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';

// Playwright may be installed globally (NODE_PATH), which a plain import doesn't search.
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));

// name: [font-family, file, weight, px]
const FACES = {
  title: ['Zen Old Mincho', 'zen-old-mincho-700.woff2', 700, 68],
  site: ['Zen Old Mincho', 'zen-old-mincho-700.woff2', 700, 34],
  bold: ['Rubik', 'rubik-700.woff2', 700, 30],
  text: ['Rubik', 'rubik-400.woff2', 400, 26],
};
// Plain ASCII, Latin-1 letters and the usual typographic punctuation. Anything else is drawn without its accent, or left out.
let CH = '';
for (let c = 32; c < 127; c++) CH += String.fromCharCode(c);
for (let c = 160; c < 256; c++) CH += String.fromCharCode(c);
CH += '‘’“”–—…•·€™ŒœŠšŽžŸΔ';

const srv = createServer((q, s) => {
  if (q.url.startsWith('/fonts/')) { s.setHeader('content-type', 'font/woff2'); s.end(readFileSync('.' + q.url)); return }
  s.setHeader('content-type', 'text/html');
  s.end(`<!doctype html><style>${Object.entries(FACES).map(([, [f, file, w]]) => `@font-face{font-family:'${f}';src:url(/fonts/${file});font-weight:${w}}`).join('')}</style><body>${Object.values(FACES).map(([f, , w]) => `<span style="font-family:'${f}';font-weight:${w}">Aa</span>`).join('')}`);
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto(`http://127.0.0.1:${port}/`);
await pg.evaluate(() => document.fonts.ready);

const out = {}, bytes = [];
let off = 0;
for (const [name, [fam, , weight, px]] of Object.entries(FACES)) {
  const r = await pg.evaluate(({ fam, weight, px, CH }) => {
    const cv = document.createElement('canvas'), W = px * 3, H = px * 2;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.font = `${weight} ${px}px '${fam}'`;
    x.textBaseline = 'alphabetic';
    const base = Math.round(px * 1.4), ox = px;
    const m0 = x.measureText('H');
    const G = {};
    for (const c of CH) {
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#000';
      x.fillText(c, ox, base);
      const d = x.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (d[(y * W + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y }
      const a = [];
      if (x1 >= 0) for (let y = y0; y <= y1; y++) for (let i = x0; i <= x1; i++) a.push(d[(y * W + i) * 4 + 3]);
      G[c] = { adv: +x.measureText(c).width.toFixed(2), l: x1 < 0 ? 0 : x0 - ox, t: x1 < 0 ? 0 : y0 - base, w: x1 < 0 ? 0 : x1 - x0 + 1, h: x1 < 0 ? 0 : y1 - y0 + 1, a };
    }
    // Kerning for letter pairs: how much the pair's width differs from the two letters on their own.
    const K = {}, L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,\'’"“”-';
    for (const a of L) for (const b of L) {
      const k = x.measureText(a + b).width - G[a].adv - G[b].adv;
      if (Math.abs(k) >= 0.5) K[a + b] = Math.round(k * 10) / 10;
    }
    return { G, K, asc: Math.round(m0.actualBoundingBoxAscent) };
  }, { fam, weight, px, CH });
  const g = {};
  for (const [c, v] of Object.entries(r.G)) {
    g[c] = [v.adv, v.l, v.t, v.w, v.h, off];
    bytes.push(...v.a); off += v.a.length;
  }
  out[name] = { px, cap: r.asc, g, k: r.K };
}
await browser.close();
srv.close();

const blob = deflateRawSync(Buffer.from(bytes), { level: 9 }).toString('base64');
writeFileSync('worker/card-font.js', `// Made by tools/make_card_font.mjs from the self-hosted fonts in /fonts (Zen Old Mincho and Rubik, both SIL Open Font License).
// Don't edit by hand: change the tool and run it again.
// Per face: px size, cap height, g = { letter: [advance, left, top (from baseline), width, height, offset into the bitmaps] }, k = kerning.
export const FACES = ${JSON.stringify(out)};
// Every letter's greyscale bitmap, one after another, raw-deflated and base64.
export const BITMAPS = '${blob}';
`);
console.log('worker/card-font.js', Math.round((blob.length + JSON.stringify(out).length) / 1024) + ' KB', 'raw', Math.round(off / 1024) + ' KB');

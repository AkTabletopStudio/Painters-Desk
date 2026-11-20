// Share card pictures (1200x630 PNG) for shared recipes, tutorials and palettes: the item's colours as a swatch strip,
// its title and author, on the Japanese Ink look of the site's main share picture.
// Workers can't draw text or use a canvas, so letters come from small bitmap fonts made by tools/make_card_font.mjs
// (worker/card-font.js) and the PNG is put together here, compressed with the built-in CompressionStream.

import { FACES, BITMAPS } from './card-font.js';

export const CARD_W = 1200, CARD_H = 630;
const BG = [242, 235, 219], INK = [22, 22, 26], RED = [192, 51, 42], MUT = [93, 86, 74], PAPER = [251, 248, 240];

let BMP = null;
async function bitmaps() {
  if (BMP) return BMP;
  const raw = Uint8Array.from(atob(BITMAPS), c => c.charCodeAt(0));
  BMP = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  return BMP;
}

// Letters with a stroke rather than an accent, which Unicode doesn't split into letter + mark.
const BASE = { 'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h', 'ı': 'i', 'Ŧ': 'T', 'ŧ': 't', 'Ŀ': 'L', 'ŀ': 'l' };
// Letters the fonts don't have are drawn without their accent (ą -> a), or left out (emoji and other scripts).
function glyphs(face, s) {
  const out = [];
  for (const c of String(s).normalize('NFC')) {
    if (face.g[c]) { out.push(c); continue }
    const b = (BASE[c] || c).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    for (const d of b) if (face.g[d]) out.push(d);
  }
  return out;
}
function width(face, cs) {
  let w = 0;
  cs.forEach((c, i) => { w += face.g[c][0] + (i ? face.k[cs[i - 1] + c] || 0 : 0) });
  return w;
}

// Wraps text into at most `lines` lines of at most `max` pixels; the last line ends in … if the text didn't fit.
function wrap(face, text, max, lines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ').map(w => glyphs(face, w)).filter(w => w.length);
  const fits = cs => width(face, cs) <= max, out = [];
  let cur = [], cut = false, i = 0;
  for (; i < words.length; i++) {
    const w = words[i], next = cur.length ? [...cur, ' ', ...w] : w;
    if (fits(next)) { cur = next; continue }
    if (cur.length) { out.push(cur); cur = []; if (out.length === lines) break }
    // A single word longer than the line is cut.
    cur = w;
    while (cur.length > 1 && !fits(cur)) { cur = cur.slice(0, -1); cut = true }
  }
  if (i < words.length) cut = true; else if (cur.length) out.push(cur);
  if (cut && out.length) {
    let last = out[out.length - 1];
    while (last.length && !fits([...last, '…'])) last = last.slice(0, -1);
    while (last.length && last[last.length - 1] === ' ') last = last.slice(0, -1);
    out[out.length - 1] = [...last, '…'];
  }
  return out;
}

class Canvas {
  constructor(w, h, bg) {
    this.w = w; this.h = h; this.px = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) this.px.set(bg, i * 3);
  }
  rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.px.set(c, (j * this.w + i) * 3);
  }
  // Draws letters with their left edge at x and the baseline at y; returns the end x.
  text(face, cs, x, y, c, B, track = 0) {
    cs.forEach((ch, n) => {
      if (n) x += face.k[cs[n - 1] + ch] || 0;
      const [adv, l, t, w, h, off] = face.g[ch], X = Math.round(x) + l, Y = y + t;
      for (let j = 0; j < h; j++) {
        const py = Y + j;
        if (py < 0 || py >= this.h) continue;
        for (let i = 0; i < w; i++) {
          const a = B[off + j * w + i], px = X + i;
          if (!a || px < 0 || px >= this.w) continue;
          const o = (py * this.w + px) * 3, f = a / 255;
          for (let k = 0; k < 3; k++) this.px[o + k] = Math.round(this.px[o + k] * (1 - f) + c[k] * f);
        }
      }
      x += adv + track;
    });
    return x;
  }
}

const hexRGB = h => /^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map(o => parseInt(h.slice(o, o + 2), 16)) : null;

// card: { kind: 'Recipe' | 'Tutorial' | 'Palette' | ..., title, author (the line under the title, after 'by '), sub (that line as is),
//   colours: ['#rrggbb', ...], lead (width of the first colour, in blocks), note: 'N layers · M paints' }
export async function cardPNG(card) {
  const B = await bitmaps(), F = FACES, cv = new Canvas(CARD_W, CARD_H, BG), X = 64, R = CARD_W - 64;
  // Label, like the main share picture's red caps line.
  cv.text(F.bold, glyphs(F.bold, card.kind.toUpperCase()), X, 92, RED, B, 3);
  // Title, up to two lines.
  const tl = wrap(F.title, card.title || 'Untitled', R - X, 2);
  let y = 92 + 28 + F.title.cap;
  tl.forEach(l => { cv.text(F.title, l, X, y, INK, B); y += Math.round(F.title.px * 1.12) });
  y -= Math.round(F.title.px * 1.12);
  // A brush-stroke rule under the title.
  cv.rect(X, y + 26, 420, 4, INK);
  cv.rect(X + 420, y + 27, 300, 2, INK);
  // Author.
  let by = y + 30;
  const au = (card.author || card.sub) && wrap(F.bold, card.sub || 'by ' + card.author, R - X, 1)[0];
  if (au) { by += 18 + F.bold.cap; cv.text(F.bold, au, X, by, [58, 53, 45], B) }

  // Swatch strip: one block per colour, framed in ink. It fills the space between the title and the footer.
  const cols = (card.colours || []).map(hexRGB).filter(Boolean).slice(0, 24);
  const sy = by + 48, sh = 522 - sy;
  if (cols.length) {
    cv.rect(X - 4, sy - 4, R - X + 8, sh + 8, INK);
    // card.lead: the first colour is drawn wider (a paint page's own paint, ahead of its matches).
    const n = cols.length, gap = n > 1 ? 4 : 0, wt = cols.map((c, i) => i === 0 && card.lead ? card.lead : 1), W = wt.reduce((a, b) => a + b, 0);
    let a = X;
    cols.forEach((c, i) => { const bw = (R - X - gap * (n - 1)) * wt[i] / W; cv.rect(a, sy, Math.round(a + bw) - Math.round(a), sh, c); a += bw + gap });
  } else {
    cv.rect(X - 4, sy - 4, R - X + 8, sh + 8, INK);
    cv.rect(X, sy, R - X, sh, PAPER);
  }

  // Footer: the site's red name tag, and the item's size on the right.
  const site = glyphs(F.site, 'paintersdesk.com'), sw = width(F.site, site), fy = 548, fh = 58;
  cv.rect(X, fy, sw + 44, fh, RED);
  cv.text(F.site, site, X + 22, fy + Math.round((fh + F.site.cap) / 2), PAPER, B);
  if (card.note) { const nt = wrap(F.text, card.note, 560, 1)[0]; cv.text(F.text, nt, R - width(F.text, nt), fy + Math.round((fh + F.text.cap) / 2), MUT, B) }
  return png(cv);
}

// Card pictures are made once and kept in the edge cache. The address carries the item's version, so a picture
// that matches it can be kept for a year; any other version gets a fresh one that is only kept briefly.
export async function cardResponse(request, make, current) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(request.url, { method: 'GET' });
  let res = cache && await cache.match(key);
  if (!res) {
    res = new Response(await make(), {
      headers: { 'content-type': 'image/png', 'cache-control': current ? 'public, max-age=31536000, immutable' : 'public, max-age=300' },
    });
    if (cache) await cache.put(key, res.clone());
  }
  return request.method === 'HEAD' ? new Response(null, res) : res;
}

/* ---------- PNG ---------- */

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })();
function crc(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) {
  const b = new Uint8Array(12 + data.length), v = new DataView(b.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
  b.set(data, 8);
  v.setUint32(8 + data.length, crc(b.subarray(4, 8 + data.length)));
  return b;
}
async function png(cv) {
  const row = cv.w * 3, raw = new Uint8Array((row + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) raw.set(cv.px.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const hdr = new Uint8Array(13), v = new DataView(hdr.buffer);
  v.setUint32(0, cv.w); v.setUint32(4, cv.h); hdr[8] = 8; hdr[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length }
  return out;
}

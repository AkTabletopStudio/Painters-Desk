// Checks that worker/seo.js can read data.js and app.js and gives every paint a unique page address.
// Run: node tools/check_seo.mjs
import { readFileSync } from 'node:fs';
import { parse, matches } from '../worker/seo.js';
const D = parse(readFileSync(new URL('../data.js', import.meta.url), 'utf8'), readFileSync(new URL('../app.js', import.meta.url), 'utf8'));
const urls = D.P.filter(p => p.url).map(p => p.url), gl = Object.keys(D.GL).length;
if (new Set(urls).size !== urls.length) throw new Error('Duplicate paint addresses');
const miss = D.P.filter(p => p.g !== 'B' && !p.url);
if (miss.length) throw new Error('Paints without a brand: ' + miss.slice(0, 5).map(p => p.n).join(', '));
if (D.P.some(p => p.url && !D.GL[p.g])) throw new Error('Range missing a label in GL');
D.P.filter(p => p.url).forEach(p => matches(D, p));
console.log(`${D.P.length} paints, ${urls.length} pages, ${D.brands.length} brands, ${gl} ranges, ${Object.keys(D.MT).length} chart-matched paints`);
D.brands.forEach(b => console.log(' ', b.slug, b.paints.length));

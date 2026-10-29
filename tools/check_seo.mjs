// Checks that worker/seo.js can read data.js and app.js, gives every paint a unique page address and can build every guide.
// Run: node tools/check_seo.mjs
import { readFileSync } from 'node:fs';
import { parse, matches, renderGuides, theme, TECH } from '../worker/seo.js';
import { TECH_TEXT } from '../worker/tech-guides.js';
const D = parse(readFileSync(new URL('../data.js', import.meta.url), 'utf8'), readFileSync(new URL('../app.js', import.meta.url), 'utf8'));
const urls = D.P.filter(p => p.url).map(p => p.url), gl = Object.keys(D.GL).length;
if (new Set(urls).size !== urls.length) throw new Error('Duplicate paint addresses');
const miss = D.P.filter(p => p.g !== 'B' && !p.url);
if (miss.length) throw new Error('Paints without a brand: ' + miss.slice(0, 5).map(p => p.n).join(', '));
if (D.P.some(p => p.url && !D.GL[p.g])) throw new Error('Range missing a label in GL');
D.P.filter(p => p.url).forEach(p => matches(D, p));
if (D.sgFix.length < 4) throw new Error('Could not read SG_FIX ramp bases from app.js');
// The technique guides copy the Ramps targets (TQ in app.js) into TECH: check they still agree, at 7 steps with no tint.
{
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const src = app.slice(app.indexOf('const lch=p=>'), app.indexOf('const TQK='));
  const TQ = new Function('NMO', src + ';return TQ')({ n: 7, t: false, q: 'nmm' });
  const labs = [[50, 30, 40], [70, 5, 60], [35, -20, -40], [60, 50, 60], [20, 2, -3], [45, 55, 30]];
  if (Object.keys(TQ).join() !== Object.keys(TECH).join()) throw new Error('TECH in seo.js has different techniques from TQ in app.js');
  for (const q of Object.keys(TQ)) {
    if (!TECH_TEXT[q]) throw new Error('No guide text for technique ' + q);
    for (const lab of labs) {
      const a = TQ[q].targets({ lab }), b = TECH[q](lab);
      if (a.length !== b.length || a.some((x, i) => x.r !== b[i].r || x.w !== b[i].w || x.t.some((v, k) => Math.abs(v - b[i].t[k]) > 1e-9))) throw new Error('TECH.' + q + ' in seo.js no longer matches TQ.' + q + ' in app.js');
      b.forEach(x => { if (!TECH_TEXT[q].steps[x.r]) throw new Error(`No step text for ${q} ${x.r}`) });
    }
  }
}
const types = {}; D.P.forEach(p => types[p.t] = (types[p.t] || 0) + 1);
const guides = renderGuides(D);
const th = theme(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
if (!th.js || !th.css.includes('data-look="cyber"')) throw new Error('Could not read the site themes from index.html');
if (!th.nav.includes('id="acct"') || !th.dlg.includes('id="thOk"')) throw new Error('Could not read the top nav or theme picker from index.html');
if (/url\((?!["']?(data:|https?:|\/))/.test(th.css)) throw new Error('Relative url() left in theme CSS');
console.log(`${guides} guides, types ${JSON.stringify(types)}`);
console.log(`${D.P.length} paints, ${urls.length} pages, ${D.brands.length} brands, ${gl} ranges, ${Object.keys(D.MT).length} chart-matched paints`);
D.brands.forEach(b => console.log(' ', b.slug, b.paints.length));

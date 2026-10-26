// Text for the two brush guides (/guides/miniature-paint-brushes and /guides/best-brushes-for-miniature-painting).
// The pages are built in seo.js (brushPage). HTML is allowed (it's our own text).
// Recommendations only name brushes whose maker or a stockist page confirms the hair and sizes we quote. No prices
// (they change and differ by country) and no affiliate links. Price levels are only relative to each other.

// The parts of a brush, top of the diagram first.
export const ANATOMY = [
  ['Tip (point)', 'The last few hairs. On a good round they come to a single sharp point when wet. This is the part that does almost all the work on a miniature.'],
  ['Belly', 'The fat middle of the hair, which holds the reservoir of paint. A bigger belly lets you paint longer before the tip dries.'],
  ['Heel', 'Where the hair meets the metal. Paint that gets in here dries, pushes the hairs apart and ruins the point.'],
  ['Ferrule', 'The metal tube that grips the hair. Crimped onto the handle.'],
  ['Handle', 'Wood or plastic. Short handles are easier to control close to a model; long ones are for easel painting.'],
];

export const HAIR = [
  ['Kolinsky sable', 'Natural hair from the tail of the kolinsky, a Siberian weasel. The hairs taper naturally and have scales that hold paint, so a kolinsky round carries a lot of paint in the belly and still keeps a very sharp tip that springs back into shape. It is the most expensive hair and wears out quickly if you scrub with it or leave paint to dry in it.', 'Layering, blending, glazing, edge highlights, eyes: anything where the point matters.'],
  ['Other natural hair', 'Red sable, weasel, squirrel and blends of them. Softer or less springy than kolinsky and cheaper. Goat hair is very soft and turns up in drybrushes made for miniatures.', 'Washes and glazes (squirrel), soft drybrushing (goat).'],
  ['Synthetic', 'Nylon or polyester fibres (taklon is one common name). Tough, cheap and easy to clean, and they don\'t mind harsh paints. They hold less paint than natural hair, so the tip dries faster, and over time the tip tends to curl into a hook. Good modern synthetics come close to sable for a while.', 'Basecoating, washes, metallics, contrast and speed paints, drybrushing, terrain, and anything that would wreck a good brush.'],
  ['Synthetic blends', 'Synthetic fibres made to copy sable, sometimes mixed with natural hair. Somewhere in between: better paint-holding than plain nylon, cheaper and tougher than kolinsky.', 'A good main brush if you would rather not buy animal hair, or want to keep costs down.'],
];

// Shape, what it looks like, what it's for. One row each in the shapes table.
export const SHAPES = [
  ['Round', 'Round belly tapering to a point.', 'The miniature painter\'s main brush: base, layer, blend and highlight with one brush by changing how much of it you use.'],
  ['Detail or spotter', 'A round with short hair and a tiny belly.', 'Eyes, tiny freehand, rivets. Holds little paint, so it dries quickly; many painters prefer a bigger round with a good point.'],
  ['Flat', 'Square end, hair pressed flat.', 'Wide even coats on vehicles and terrain, straight edges, and stippling texture.'],
  ['Filbert', 'Flat with a rounded end.', 'Soft-edged coats on cloaks and big panels, and wet blending on busts.'],
  ['Drybrush', 'Short, stiff or very soft hair, often with a domed or angled end.', 'Drybrushing: dusting nearly dry paint over raised detail. Wears out fast, so it is always a separate brush.'],
  ['Wash or glaze brush', 'A large round or soft flat that holds a lot of liquid.', 'Washes, shades and contrast paints over a whole model, and broad glazes.'],
  ['Liner', 'Long, thin round.', 'Long smooth lines on banners, vehicles and freehand.'],
];

// Job, brush, why, and an optional guide link.
export const JOBS = [
  ['Basecoating', 'A medium round or small flat, synthetic', 'Gets paint on fast and doesn\'t matter if it wears.', ''],
  ['Washes and shades', 'A large round or wash brush, synthetic', 'Holds plenty of liquid so the wash goes on in one pass.', ''],
  ['Contrast and speed paints', 'A medium round, synthetic', 'A full load flows on evenly; the paints are hard on fine hair.', ''],
  ['Layering', 'A size 1 or 2 round with a sharp point, kolinsky or a good synthetic', 'Holds enough paint to work a whole panel with the tip.', ''],
  ['Glazing and blending', 'A size 1 or 2 round, kolinsky', 'Thin paint dries more slowly in a big belly, giving you time to blend.', '/guides/glazing'],
  ['Edge highlights', 'A round with a sharp point, or the side of one', 'The side of the tip gives a steady line along an edge.', '/guides/edge-highlighting'],
  ['NMM, gems and glints', 'A size 0 or 1 kolinsky round', 'Tiny crisp dots and lines need a point that doesn\'t split.', '/guides/best-paints-for-nmm'],
  ['Eyes and fine detail', 'A small round (0, 00) with a good point', 'Control. Use the smallest brush that still holds a little paint.', ''],
  ['Zenithal and broad highlights', 'A large round or soft drybrush', 'Covers big areas from one direction quickly.', '/guides/zenithal-highlighting'],
  ['Drybrushing', 'A drybrush, synthetic or goat hair', 'The scrubbing would destroy any other brush.', '/guides/drybrushing'],
  ['Metallics', 'An old or cheap synthetic round', 'Metal flakes lodge in the heel and are hard to wash out.', ''],
  ['Glue, varnish, texture paste', 'Your oldest brush', 'It will be ruined.', ''],
];

export const CARE = [
  '<b>Rinse often.</b> Dip and wipe every minute or so, even mid-layer, so paint never dries in the hair.',
  '<b>Keep paint off the heel.</b> Load only the front third to half of the hair. Paint that reaches the ferrule dries there and splays the hairs apart for good.',
  '<b>Never leave a brush standing in water.</b> It bends the tip and soaks the handle, which can loosen the ferrule.',
  '<b>Wash with brush soap at the end of a session.</b> Work the soap into the hair gently in your palm, rinse, then shape the point with the soap still in it and leave it to dry. The soap sets the shape.',
  '<b>Store brushes tip up or lying flat,</b> not tip down in a pot. When travelling, protect the tip; if you use the plastic cap, slide it on carefully so it doesn\'t catch the hairs.',
  '<b>Don\'t scrub or stipple with a good brush.</b> Keep an old or cheap brush for drybrushing, texture, metallics, glue and varnish.',
  '<b>Retire brushes down the line.</b> A kolinsky that has lost its point still makes a fine basecoat or wash brush.',
];

export const MISTAKES = [
  'Buying the smallest brush for detail. A 000 holds so little paint that it dries before you finish the line. A size 1 or 2 with a sharp point does finer work.',
  'Painting with a dry or overloaded brush. Thin paints to milk, load the belly, then wipe the tip on the palette so it comes back to a point.',
  'Using one good brush for everything, then wondering why it hooks after a month.',
  'Dipping the whole brush into a pot. Put paint on a palette and load from there.',
  'Judging a brush dry in the shop. A brush only shows its real point when it is wet.',
];

// Recommended brushes, grouped by job. Each: name, maker, hair, sizes or notes, level (relative: budget, mid, premium), source.
// "src" is the page we checked the facts against.
export const PICKS = [
  {
    h: 'Starter sets and everyday synthetics', s: 'Cheap, tough brushes for basecoating, washes, contrast paints and metallics. Everyone needs a few, even if they also own sable.',
    rows: [
      ['Army Painter Hobby brushes', 'Synthetic', 'Red handles: Basecoating, Highlighting, Precise Detail, Super Detail and Drybrush. Sold singly and in sets.', 'Budget', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Citadel STC brushes', 'Synthetic', 'Games Workshop\'s synthetic range, with white handles, in round and straight-edged shapes. Made to keep their shape under heavy use such as drybrushing and edge highlights.', 'Budget', 'https://www.warhammer-community.com/en-gb/articles/y0jTKObF/paint-like-a-pro-with-the-new-stc-range-of-synthetic-brushes/'],
      ['Monument Hobbies Pro Synthetic set', 'Synthetic', 'From the makers of Pro Acryl.', 'Budget', 'https://www.miniaturemarket.com/Monument-Hobbies-PRO-Synthetic-Brush-Set/MH-PRO-SYN-Set'],
      ['Princeton Velvetouch Series 3950', 'Synthetic blend', 'An artists\' brush sold in rounds from tiny to large, and a mini round. Popular with painters who want an all-synthetic main brush.', 'Budget to mid', 'https://www.dickblick.com/items/princeton-velvetouch-series-3950-synthetic-brush-round-size-1/'],
    ],
  },
  {
    h: 'Main brush: a kolinsky round', s: 'The brush you will use most: a size 1 or 2 round with a sharp point. Spend the most here.',
    rows: [
      ['Winsor &amp; Newton Series 7', 'Kolinsky sable', 'Handmade in England. Sold as a regular round, which has a bigger belly, and a Miniature round with shorter hair for extra control, which holds less paint.', 'Premium', 'https://www.winsornewton.com/products/series-7-kolinsky-sable-brush-series-7-kolinsky-sable-mintature-painting-brush-round'],
      ['Raphaël 8404', 'Kolinsky sable', 'A French watercolour round, sold down to very small sizes (4/0).', 'Mid to premium', 'https://www.cassart.co.uk/raphael-sable-series-8404-watercolour-brush'],
      ['Rosemary &amp; Co Series 33', 'Kolinsky sable', 'A pointed round sold from 10/0 up, with the hair size of each brush published (a size 1 is 1.7 mm across and 11.8 mm long). Short or long handle.', 'Mid', 'https://www.rosemaryandco.com/pure-kolinsky-pointed'],
      ['Artis Opus Series S', 'Kolinsky sable', 'Made for miniature painters. Sizes 000, 00, 0 and 1 in the set, with 2 to 6 sold singly.', 'Mid', 'https://fauxhammer.com/reviews/artis-opus-series-s-brushes-review-for-miniature-painters-wargamers-hobbyists'],
      ['Army Painter Wargamer Kolinsky Masterclass', 'Kolinsky sable', 'Black handle. Army Painter\'s top brush for fine highlights and details.', 'Mid', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Monument Hobbies Pro Sable', 'Sable', 'From the makers of Pro Acryl, sold singly by size and as a set.', 'Mid', 'https://www.miniaturemarket.com/Monument-Hobbies-PRO-Brush-Sable-1/MH-PRO-SBL-1'],
    ],
  },
  {
    h: 'Fine detail', s: 'Short-haired brushes for eyes and tiny detail. Try a good size 0 or 1 round first: it may be all you need.',
    rows: [
      ['Artis Opus Series M', 'Hair not listed', 'Short hair for fine detail and precision, sizes 000 to 2.', 'Mid', 'https://www.loadeddice.uk/products/artis-opus-series-d-and-m-complete-10-brush-set'],
      ['Army Painter Wargamer Insane Detail', 'Hair not listed', 'White handle, for eyes and other very fine details.', 'Budget', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Winsor &amp; Newton Series 7 Miniature', 'Kolinsky sable', 'See above: shorter hair for control.', 'Premium', 'https://www.winsornewton.com/products/series-7-kolinsky-sable-brush-series-7-kolinsky-sable-mintature-painting-brush-round'],
    ],
  },
  {
    h: 'Drybrushes', s: 'Soft drybrushes give smoother, chalk-free results than old splayed brushes.',
    rows: [
      ['Artis Opus Series D', 'Hair not listed', 'Drybrushing and texture work, sizes XS to XL.', 'Mid', 'https://www.loadeddice.uk/products/artis-opus-series-d-and-m-complete-10-brush-set'],
      ['Army Painter Masterclass Drybrush Set', 'Goat hair (Miniature drybrush)', 'Three soft round drybrushes: Miniature, Moderate and Mighty.', 'Mid', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Army Painter Wargamer Small and Large Drybrush', 'Hair not listed', 'Angled heads for reaching into tight spots.', 'Budget', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Soft make-up brushes', 'Usually synthetic', 'Round, domed make-up brushes are a cheap, popular stand-in for soft drybrushes.', 'Budget', ''],
    ],
  },
  {
    h: 'Big models, washes and terrain', s: 'Large brushes that hold a lot of liquid.',
    rows: [
      ['Army Painter Wargamer Monster Brush', 'Hair not listed', 'For larger models and heavy washing.', 'Budget', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
      ['Army Painter Wargamer Vehicle &amp; Scenery Brush', 'Hair not listed', 'Big surfaces and Quickshade dip.', 'Budget', 'https://thearmypainter.com/blogs/explore/a-brush-for-every-job'],
    ],
  },
];

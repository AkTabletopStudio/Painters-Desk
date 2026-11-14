// Text for the painting-basics guides (/guides/<slug>): paint types explained, thinning and wet palettes, priming and varnishing, airbrushing,
// contrast and speed paints, black and white, basing and weathering. The pages are built in seo.js (craftPage).
// HTML is allowed (it's our own text). [[brand/paint-slug]] becomes a link to that paint's page with its swatch, and the
// build fails (tools/check_seo.mjs) if the paint doesn't exist, so a renamed paint can't leave a dead link.
// A section's body is a list of blocks: a string is a paragraph; {h3}, {ul}, {ol}, {table: [head, rows]} are what they say;
// {picks: {steps: [[name, hex, nameRegex?]], pool}} is a table of the nearest real paint in each brand for each target colour
// (pool 'op' opaque paints, 'con' contrast/speed paints); {ranges: 'air' | 'con'} is a table of those ranges, counted from data.js.
// {typeTable: [[type, name, anchor, what it is]]} is the overview table with a count of each paint type from data.js;
// {types: 'wash'} lists the ranges with paints of that type (seo.js typeOf, the same rules as the wheel's Paint types).
// basic orders the guides in the Painting basics list on /guides.

export const CRAFT_DATE = '2026-11-03';

export const CRAFT = [
  {
    slug: 'miniature-paint-types', basic: 1, label: 'Paint types explained', date: '2026-11-14',
    title: 'Miniature paint types explained: base, layer, shade, contrast, metallic, colour-shift and more',
    blurb: 'What base, layer, shade, contrast, speedpaint, dry, air, ink, glaze, metallic, colour-shift and fluo paints are, and when to use each.',
    desc: 'Every kind of miniature paint explained in plain words: base and layer paints, shades and washes, contrast and speed paints, inks and glazes, dry paints, air paints, metallics, colour-shift and pearl paints, fluorescents, technical paints, primers, mediums and varnish, with the ranges of each on The Painters Desk.',
    intro: [
      'Walk into a hobby shop and the paint rack is split into base, layer, shade, contrast, dry, air, technical and more, and every brand uses its own names for the same ideas. This guide explains what each kind of paint is, how it behaves on the model and when to reach for it, in plain words and without taking sides between brands.',
      'The short version: most of a model is painted with <b>opaque paints</b> (base and layer), shaded with <b>transparent paints</b> (washes, inks, glazes, contrast), and finished with <b>special paints</b> (metallics, effects, fluorescents) where the model calls for them. Everything else on the rack is a variation on those three, or a product that helps them along (primer, medium, varnish).',
    ],
    sections: [
      { h: 'All the types at a glance', body: [
        'The counts are how many paints of each kind are on The Painters Desk today. On the <a href="/">colour wheel</a> the <b>Paint types</b> button lets you show or hide each group.',
        { typeTable: [
          ['op', 'Base and layer paints', 'base-paints', 'Opaque colour. Covers what is under it. The bulk of every collection.'],
          ['wash', 'Shades and washes', 'shades-and-washes', 'Thin, dark, flowing paint that runs into recesses to add shadow.'],
          ['con', 'Contrast and speed paints', 'contrast-and-speed-paints', 'One-coat paints that shade and colour at once over a light primer.'],
          ['ink', 'Inks, glazes and transparents', 'inks-glazes-and-transparents', 'Strong, see-through colour for tinting, glazing and filters.'],
          ['met', 'Metallics and colour-shift', 'metallic-paints', 'Paint with metal or mica flakes that catches the light; shifts change colour with the angle.'],
          ['pearl', 'Pearls', 'pearl-and-iridescent-paints', 'A soft pearly sheen over the colour.'],
          ['fx', 'Fluorescents and effects', 'fluorescent-paints', 'Neon brights that glow under UV, plus blood, rust and other effects.'],
          ['tech', 'Technical, primers and mediums', 'technical-paints', 'Textures, crackle, gemstone and other special finishes, plus primers, mediums and varnish.'],
        ] },
        'Dry paints and air paints are not separate types here: they are opaque paints made thicker or thinner for one job, so they count as base and layer paints above.',
      ] },
      { h: 'Base paints', body: [
        'A base paint is an opaque, heavily pigmented paint made to cover in one or two coats, even over a black or dark primer. It is the first colour on each area of the model: armour, cloth, skin, leather. Base paints tend to sit at the darker, richer end of a colour, because the shading and highlights are built from there.',
        'Citadel splits its opaque paints into Base and Layer ranges, so a Citadel base paint like [[citadel/mephiston-red]] or [[citadel/macragge-blue]] covers better than the layer paints next to it on the rack. Most other brands make one opaque range that does both jobs (Army Painter Warpaints Fanatic, Vallejo Game Color and Model Color, Pro Acryl, AK 3rd Gen, Scale75, Two Thin Coats and more), and simply make the darker colours a little more opaque.',
        'How to use it: thin it slightly (cream consistency) and put on <b>two thin coats</b> rather than one thick one. See <a href="/guides/thinning-paints-and-wet-palettes">thinning paints</a> for the consistencies.',
      ] },
      { h: 'Layer paints', body: [
        'A layer paint is still opaque, but made a little thinner and smoother, with a finer pigment, so it can be built up in thin coats without hiding detail. Layer paints are for the steps after the basecoat: highlights, blends and fine details. A layer range usually has lighter, brighter versions of each base colour, such as [[citadel/evil-sunz-scarlet]] over Mephiston Red.',
        'Can you basecoat with a layer paint? Yes, it just takes a coat or two more, especially over a dark primer. Can you highlight with a base paint? Yes too, thinned with a little water or medium. The labels are a guide to how the paint is made, not a rule.',
        'Two Thin Coats goes a step further and sells its opaque colours as triads (a shadow, a midtone and a highlight of each colour), and Tone Pro from Citadel has a range of tones for each colour; both are ways of handing you a ready-made ramp of layer paints.',
      ] },
      { h: 'Dry paints', body: [
        'Dry paints are made thick, almost like a paste, for <a href="/guides/drybrushing">drybrushing</a>: you wipe most of the paint off a stiff brush and dust it over raised edges and texture. Thick paint stays on the bristles as a dry film and catches the edges instead of flowing into the recesses, which is exactly what drybrushing needs.',
        'On the site that is Citadel Colour: Dry (such as [[citadel/ryza-rust]] and [[citadel/necron-compound]]) and AMMO Dio Drybrush. You don\'t need them to drybrush: any opaque paint straight from the pot works, a dry paint is just quicker and smoother. Don\'t use dry paints for normal brush painting; they are too thick to flow.',
      ] },
      { h: 'Air paints', body: [
        'Air paints are opaque paints already thinned to flow through an airbrush, with a finer pigment so they don\'t clog the needle. They also work with a brush for glazes and very smooth layers, and some painters use them for everything because they are pre-thinned. Shake them hard; the pigment settles. See <a href="/guides/airbrushing-miniatures">airbrushing basics</a> for how to spray them.',
        { ranges: 'air' },
      ] },
      { h: 'Shades and washes', body: [
        'A shade or wash is a very thin, dark, flowing paint. Brushed over a basecoat, it runs into the recesses and dries darker there, and leaves only a faint tint on the raised areas. It is the quickest way to add shadow and definition to a model, and the classic beginner method is basecoat, wash, then highlight the raised areas back up.',
        'Shades are mostly made with a medium that breaks the surface tension, so they flow into every crease. Many dry with a slight satin sheen, which a matt varnish takes away. Black and brown shades like [[citadel/nuln-oil]] and [[citadel/agrax-earthshade]] are the most used paints in many collections, because they work over almost any colour.',
        'How to use it: load the brush well, flow it into the recesses, and soak up any big puddles with a clean, damp brush so they don\'t dry as tide marks. For more control, paint it only into the lines (a <b>pin wash</b> or recess shade). Washes and shades are hidden on the wheel by default, because their swatch colour is what they add over a basecoat, not a colour they make on their own.',
        { types: 'wash' },
      ] },
      { h: 'Contrast and speed paints', body: [
        'Contrast and speed paints sit between a wash and a basecoat: thin, flowing, but heavily pigmented, so one coat over a light primer gives you a base colour with the shading already in the recesses. Citadel calls them Contrast, Army Painter calls them Speedpaint, Vallejo calls them Xpress Color, Scale75 calls them Instant Colors and Pro Acryl calls them 1-Step; the idea is the same.',
        'The primer matters most: over white or a light grey they are bright, over black they barely show. They are best on textured areas (cloth, fur, scales, skin), and harder to get smooth on big flat panels. Thin them with their own medium, not water. The full guide is <a href="/guides/contrast-and-speed-paints">contrast and speed paints</a>, with every range compared colour by colour.',
        { types: 'con' },
      ] },
      { h: 'Inks, glazes and transparents', body: [
        'These are transparent colours. Where a wash is mostly about shadow, an ink or glaze is about colour: it tints whatever is under it without hiding it.',
        { ul: [
          '<b>Inks</b> are intensely pigmented and very fluid. A drop or two tints a mix, brightens a dull colour or makes a strong wash. Thinned right down, they make glazes and filters. Some dry glossy.',
          '<b>Glazes and transparents</b> are made ready to use: thin, see-through colour for building up a smooth blend, deepening a shadow or shifting a colour slightly warmer or cooler. See <a href="/guides/glazing">glazing</a> for the method.',
          '<b>Shaders and filters</b> (common in scale modelling) are very thin tints laid over a whole area to unify the colours or add a weathered tone.',
        ] },
        'Tip: if a model looks patchy or the blends are rough, one thin glaze of the middle colour over everything pulls it together.',
        { types: 'ink' },
      ] },
      { h: 'Metallic paints', body: [
        'Metallic paints carry fine metal or mica flakes, so they catch the light and look like metal. Silvers, steels, golds, brasses, bronzes and coppers make up most of them, plus coloured metallics for candy-bright armour. A wash over a metallic gives it shadow and age; a brighter metallic on the edges gives it a shine.',
        'Metallic paint behaves differently from normal paint: the flakes settle fast (stir or shake often), they can travel and leave a sparkle in other colours, so keep a separate water pot, and they look best over a smooth, dark basecoat. Thinning too much with water spreads the flakes out and the metal looks grainy; a little medium is better.',
        'Painting metal <em>without</em> metallic paint, using normal paints to paint the reflections, is called <b>non-metallic metal</b> (NMM). It is a different technique with opaque paints; see <a href="/guides/best-paints-for-nmm">NMM</a>.',
        'Vallejo True Metallic Metal and Scale75 Metal n\' Alchemy are whole metal ranges built in light, base and shade steps, and most opaque ranges include a few metallics too. Metallics are split from normal paints in matches on the site, so a gold is only ever matched with other golds.',
        { types: 'met' },
      ] },
      { h: 'Colour-shift paints', body: [
        'Colour-shift paints (also called chameleon or chromashift paints) look like one colour from one angle and another colour as the model turns, for example green to purple or gold to red. They use special interference pigments that split the light like an oil film or a beetle\'s shell. They are a kind of metallic, and the site counts them as metallics.',
        'They work best <b>over gloss black</b> or a dark basecoat, which makes the shift strongest. Over white or a light colour the effect mostly disappears. Use them on large smooth areas where the light can roll across the surface (armour panels, vehicle hulls, crystals, beetle shells, magical weapons), and seal with a gloss or satin varnish, because matt varnish dulls the shift.',
        'On the site that is Turbo Dork TurboShift and ZeniShift (each with its recommended basecoat as its code), Green Stuff World Metallic &amp; Colorshift and Scale75 Prism Effect. Our swatches can only show one colour, so a colour-shift paint shows its main colour on the wheel; check the maker\'s photos to see the full shift.',
      ] },
      { h: 'Pearl and iridescent paints', body: [
        'Pearl and iridescent paints add a soft, milky sheen, or a faint second colour, over what is under them, like the inside of a shell. They are often semi-transparent and used over a basecoat for silk, gems, ghosts, insect wings and a magical glow. Pearls are hidden on the wheel by default, because their sheen doesn\'t show on a swatch.',
      ] },
      { h: 'Fluorescent paints', body: [
        'Fluorescent (fluo) paints are the neon brights: pinks, greens, oranges and yellows that look brighter than any normal paint and glow under UV light. They are fairly transparent, so they need a <b>white basecoat</b> underneath to look bright, and several thin coats. Use them for glowing eyes, plasma, warning stripes, mushrooms and light sources (see <a href="/guides/best-paints-for-osl">OSL</a>).',
        'Fluorescent pigment fades in strong sunlight over time, so keep finished models out of direct sun, and a UV-protective varnish helps.',
        { types: 'fx' },
      ] },
      { h: 'Technical paints', body: [
        'Technical and effect paints do one special job, and each one is a little different, so read the pot. The common kinds:',
        { ul: [
          '<b>Texture paints</b> contain grit or a crackle medium, for bases: brush on, let dry, then drybrush. [[citadel/stirland-mud]] and [[citadel/astrogranite]] are two. See <a href="/guides/basing-miniatures">basing</a>.',
          '<b>Effect paints</b> for rust, corrosion, verdigris, blood, slime, frost and ice, made to look like the real thing in one coat: [[citadel/typhus-corrosion]], [[citadel/nihilakh-oxide]] and [[citadel/blood-for-the-blood-god]], for example. See <a href="/guides/weathering-miniatures-and-models">weathering</a>.',
          '<b>Gemstone paints</b> are thick, glossy, tinted paints that pool on a silver basecoat and dry like a jewel, such as [[citadel/spiritstone-red]]. See <a href="/guides/best-paints-for-gems">gems</a>.',
          '<b>Pigments</b> are loose powders for dust, mud and rust, fixed with a fixer or thinner.',
        ] },
      ] },
      { h: 'Primers, mediums and varnish', body: [
        'These aren\'t colours, but they hold the paint job together.',
        { ul: [
          '<b>Primer</b> is the first coat on bare plastic, resin or metal. It grips the model and gives paint something to stick to. Spray primers are the quickest; brush-on primers (Pro Acryl has a range on the site) and airbrush primers work too. The colour of the primer sets the tone of everything on top, so see <a href="/guides/priming-and-varnishing-miniatures">priming</a> for which colour to pick.',
          '<b>Mediums</b> change how paint behaves without adding colour: thinning mediums, glaze mediums, flow improvers, drying retarders, and contrast or speedpaint medium for thinning those paints. See <a href="/guides/thinning-paints-and-wet-palettes">thinning</a>.',
          '<b>Varnish</b> is the last coat. It protects the paint from handling and evens out the sheen: matt for most models, satin for a slight sheen, gloss for wet effects, gems and eyes.',
        ] },
      ] },
      { h: 'Oils, enamels and lacquers', body: [
        'Almost every paint on the site is water-based acrylic, which cleans up with water and dries fast. A few ranges use other binders, mostly for scale models:',
        { ul: [
          '<b>Oil paints</b> (like AMMO Oilbrushers) stay wet for hours, so they blend very smoothly and are popular for weathering, streaks and filters on vehicles. Thin and clean with odourless thinner, and work over varnished acrylic so the thinner doesn\'t lift the paint.',
          '<b>Enamels</b> are solvent-based washes and effects for weathering; the solvent lets you wipe them back after they dry.',
          '<b>Lacquers</b> (like Mr. Color, and Tamiya\'s spray cans) are solvent-based paints that spray thin, dry fast and very hard. Use them with good ventilation and a mask, and clean with their own thinner.',
        ] },
      ] },
      { h: 'Which types do I need to start?', body: [
        'You can paint a whole army with three kinds: a set of <b>opaque base and layer paints</b> in the colours of your scheme, a <b>black or dark brown shade</b> for shadows, and one <b>silver and one gold</b> metallic. Add contrast or speed paints if you want to paint faster, a few inks or glazes when you start blending, and the special paints as each model calls for them.',
        'When you look for an equivalent of a paint on the site, pick one of the same type: a Citadel Shade is best swapped for another brand\'s wash, not an opaque paint of the same colour. The matches on each paint page say when two paints are different types.',
      ] },
    ],
    faq: [
      ['What is the difference between base and layer paint?', 'Base paints are more heavily pigmented, so they cover in one or two coats over a dark primer. Layer paints are thinner and smoother, for building up highlights and blends in thin coats. Most brands make one opaque range that does both.'],
      ['What is the difference between a shade, a wash and an ink?', 'Shades and washes are thin, dark paints that run into recesses to add shadow. Inks are more intense, transparent colours for tinting, glazing and strong washes. The names overlap between brands, and you can thin an ink into a wash.'],
      ['Are speed paints and contrast paints the same thing?', 'They are the same kind of paint from different brands: Contrast is Citadel\'s range and Speedpaint is Army Painter\'s. Both are one-coat paints that shade and colour at once over a light primer.'],
      ['What are colour-shift paints?', 'Paints with interference pigments that change colour as the viewing angle changes, such as green to purple. They work best over gloss black and on large smooth areas, and should be sealed with gloss or satin varnish rather than matt.'],
      ['Do I need dry paints to drybrush?', 'No. Any opaque paint straight from the pot will drybrush. Dry paints are made thick so they drybrush more smoothly and quickly.'],
      ['Can I use air paints with a brush?', 'Yes. Air paints are opaque paints that are already thinned, so they work well with a brush for smooth layers and glazes, though they need more coats to cover.'],
    ],
  },

  {
    slug: 'thinning-paints-and-wet-palettes', basic: 2, label: 'Thinning paints and wet palettes',
    title: 'How to thin miniature paints, and how to make a wet palette',
    blurb: 'How thin is thin enough for each job, and a wet palette you can make in five minutes.',
    desc: 'How to thin acrylic paints for miniatures: the right consistency for basecoats, layers, glazes, washes and airbrushing, water vs medium, two thin coats, and how to make and look after a wet palette.',
    intro: [
      '"Thin your paints" is the first piece of advice every new painter hears, and the least explained. Paint straight from the pot is made thick so it keeps, covers well and can be used for drybrushing. On a miniature, thick paint fills in detail, leaves brush marks and dries with a lumpy, chalky surface. Thinned paint flows off the brush, levels out as it dries and lets the sculpted detail show through.',
      'This guide gives the consistency to aim for at each stage of a model, what to thin with, and how to make a wet palette, which keeps thinned paint workable for hours instead of minutes.',
    ],
    sections: [
      { h: 'How thin is thin enough?', body: [
        'There is no single ratio, because every brand and every pot is different: a new pot is thinner than one that has been open for a year, and pigments vary even within a range. So judge by how the paint behaves, not by counting drops. The common descriptions are:',
        { table: [['Consistency', 'Roughly', 'Use it for'], [
          ['Straight from the pot', 'Paint as it comes', 'Drybrushing, texture, and a first coat on a big flat area if you are quick and careful.'],
          ['Melted ice cream or cream', 'About 2 parts paint to 1 water', 'Basecoats on figures, especially over a dark primer. Flows, but still covers in two coats.'],
          ['Whole milk', 'About 1 to 1', 'Layering and highlights. It holds a line, flows off the tip and leaves no ridges.'],
          ['Skimmed milk', 'About 1 to 2', 'Blending layers, and most airbrush work (see the <a href="/guides/airbrushing-miniatures">airbrushing guide</a>).'],
          ['Tinted water', '1 to 4, up to 1 to 10', 'Glazes and filters: transparent coats that shift a colour without hiding what is under it. See <a href="/guides/glazing">glazing</a>.'],
        ]] },
        'A quick test: pull the loaded brush across your palette or a thumbnail. Basecoat paint should leave a solid stripe that settles flat in a second or two. Layer paint should leave a stripe you can just about see through. If the paint beads up, runs away from the brush or pools like a wash, it is too thin for the job.',
      ] },
      { h: 'Two thin coats', body: [
        'The phrase you will hear most is "two thin coats". Two thin coats that each cover about 70% dry smooth and flat; one thick coat that covers in one go dries lumpy and fills in detail. Let the first coat dry completely before the second (it goes matt when it is dry), and don\'t worry if it looks streaky. The second coat evens it out.',
        'Light colours over dark (yellow, white, light grey, many reds) need more coats. Rather than thickening the paint, basecoat them over a lighter primer or a mid-tone undercoat: yellow over a light brown or bone, red over a dark red-brown, white over light grey.',
      ] },
      { h: 'Water, medium or thinner?', body: [
        { ul: [
          '<b>Clean water</b> is all you need for most brush work. Tap water is fine in most places; use distilled or filtered water if yours is very hard and you see a chalky film.',
          '<b>Mediums</b> thin the paint without diluting the binder, so very thin coats still stick and dry smoothly instead of breaking up. Glaze, lahmian, contrast and speedpaint mediums all do this; [[citadel/shading-medium]] and [[citadel/blending-medium]] are two on the site. Use them for glazes and very thin layers.',
          '<b>Flow improver</b> breaks surface tension so paint flows into recesses and off the brush tip, and slows drying. Add a little, never a lot: [[vallejo/flow-improver]] is a common one.',
          '<b>Airbrush thinner</b> is made for spraying: water, medium and flow improver in one, such as [[vallejo/airbrush-thinner]]. It is also a good all-purpose thinner for the brush.',
          '<b>Retarder</b> slows drying, which helps with wet blending and in hot or dry rooms.',
        ] },
        'Don\'t thin metallics with too much water: the flakes separate from the binder and you get a patchy, grey finish. Thin them with a medium, or only a little water. Contrast and speed paints should be thinned with their own medium, not water, or they stop flowing evenly (see <a href="/guides/contrast-and-speed-paints">contrast and speed paints</a>).',
      ] },
      { h: 'How to make a wet palette', body: [
        'A wet palette is a shallow box with a damp sponge under a sheet of paper. The paper lets just enough water through to keep the paint on top wet for hours, so thinned paint doesn\'t dry out while you work and you can come back to a colour or mix later. It is cheap to make and it is the single biggest upgrade for most beginners.',
        { ol: [
          'Take a shallow airtight plastic box, such as a food container. Wider is better than deeper.',
          'Cut a thin kitchen sponge, or a few sheets of folded kitchen roll, to fit the bottom.',
          'Soak the sponge in clean water, then squeeze it until it is damp but not dripping.',
          'Cut a sheet of baking parchment (greaseproof paper) to size. Soak it in warm water for a few minutes so it lies flat, then lay it on the sponge and smooth out the bubbles. Hydrofoil or a palette maker\'s membrane paper works the same way and lasts longer.',
          'Put small dots of paint on the paper. They stay wet; add a drop of water to thin them, and mix on the paper.',
          'Close the lid between sessions. The paint stays usable for a day or more.',
        ] },
        { h3: 'Getting it right' },
        { ul: [
          'If the paint goes runny and spreads out, the sponge is too wet: squeeze some water out.',
          'If the paint dries out, it is too dry: add a little water to the sponge, not on top of the paper.',
          'Some parchment is waxed or coated and makes paint bead up. Try another brand if paint won\'t sit on it.',
          'Change the water and rinse the sponge every week or two, and replace the paper when it is full. A dirty, warm wet palette will grow mould.',
          'Thin on the wet palette, but load drybrushes from a dry surface, such as a tile or a pot lid.',
        ] },
      ] },
      { h: 'Common mistakes', body: [{ ul: [
        'Thinning by counting drops. Every pot is different; check how the paint flows instead.',
        'Thinning so much the paint stops being paint. If it pools in the recesses like a wash, or the colour breaks up into blotches, add more paint or use a medium.',
        'Loading too much paint on the brush. Even thin paint floods detail if the brush is overloaded. Touch the side of the brush on kitchen roll before it goes on the model.',
        'Using the same water pot to thin and to rinse. Keep a second pot of clean water just for thinning.',
        'Shaking paint after opening it. Shake or stir before you open it, so the pigment is mixed back in.',
      ] }] },
    ],
    faq: [
      ['What ratio should I thin miniature paint?', 'Start at about 1 part paint to 1 part water for layers, and less water for basecoats, but judge by consistency (whole milk for layers, cream for basecoats) rather than by a ratio, because every pot is different.'],
      ['Can I use baking paper for a wet palette?', 'Yes. Baking parchment over a damp sponge is the classic home-made wet palette. Soak the parchment first so it lies flat, and try another brand if paint beads up on it.'],
      ['Why is my paint chalky or lumpy?', 'It is too thick, or it was put on in one heavy coat. Thin it a little more and use two thin coats, letting the first dry before the second.'],
    ],
  },

  {
    slug: 'priming-and-varnishing-miniatures', basic: 3, label: 'Priming and varnishing',
    title: 'How to prime and varnish miniatures (and fix frosting)',
    blurb: 'Black, grey, white or zenithal priming, gloss versus matt varnish, and how to fix a frosted model.',
    desc: 'How to prime miniatures with spray, brush-on or airbrush primer, choosing black, grey or white, zenithal priming, how to varnish miniatures with gloss, satin and matt varnish, and what causes frosting and how to fix it.',
    intro: [
      'Primer is the first coat on a model and varnish is the last. Neither is exciting, and both decide whether everything in between works. Primer gives paint something to grip, so it doesn\'t rub off plastic or metal, and it sets the starting colour of the whole model. Varnish protects the paint from handling and evens out the sheen.',
      'Most of the problems people meet with them come from the weather and from spraying too much at once. This guide covers both, including zenithal priming (also known as <i>éclairage zénithal</i> in French) and the dreaded frosting.',
    ],
    sections: [
      { h: 'Before you prime', body: [{ ul: [
        'Clean the model. Resin and some plastic kits have mould release on them; wash them in warm soapy water, rinse and let them dry.',
        'Remove mould lines and fill gaps first: primer shows up every flaw rather than hiding it.',
        'Prime on the sprue or on a holder (a cork, a bottle top, a clip) so you can turn the model and reach underneath.',
      ] }] },
      { h: 'Spray, brush-on or airbrush primer', body: [
        { table: [['Type', 'Good for', 'Watch out for'], [
          ['Spray can (rattle can)', 'Fast, even coverage on whole armies.', 'Needs a dry, mild day: spraying in cold, damp or humid air gives a rough, grainy finish. Hold the can 20 to 30 cm away and use short passes.'],
          ['Brush-on primer', 'Small batches, any weather, indoors.', 'Use two thin coats; a thick one hides detail. Let it cure fully before painting.'],
          ['Airbrush primer', 'A smooth, thin coat that keeps fine detail, and zenithal priming.', 'Needs an airbrush and ventilation; polyurethane primers like a full day to cure. See the <a href="/guides/airbrushing-miniatures">airbrushing guide</a>.'],
        ]] },
        'Whatever you use, shake it well (a spray can for at least a minute), do several light coats rather than one heavy one, and let it dry completely before you paint. Primer that looks dry can still be soft underneath.',
      ] },
      { h: 'Black, grey or white?', body: [
        { table: [['Primer', 'What it does', 'Best for'], [
          ['Black', 'Fills recesses with shadow for you and hides gaps you missed. Colours look darker and need more coats.', 'Dark armies, metallics, drybrushing, grimdark looks.'],
          ['Grey', 'A neutral middle ground. Shows detail well and suits most colours.', 'Mixed colour schemes and beginners.'],
          ['White', 'Makes colours bright and clean, and is essential under contrast and speed paints.', 'Bright schemes, yellows and reds, and <a href="/guides/contrast-and-speed-paints">contrast paints</a>.'],
          ['Coloured', 'Basecoat and primer in one coat.', 'Armies with one main colour.'],
        ]] },
        'Coloured and neutral primers on the site include:',
        { paints: ['pro-acryl/primer-black', 'pro-acryl/primer-dark-neutral-grey', 'pro-acryl/primer-white', 'pro-acryl/primer-black-brown', 'pro-acryl/primer-red-oxide', 'pro-acryl/primer-dark-camo-green', 'army-painter/matt-black-primer', 'army-painter/matt-grey-primer', 'army-painter/matt-white-primer'] },
      ] },
      { h: 'Zenithal priming', body: [
        'Zenithal priming sprays the light on before you start painting. Prime the whole model black (or a very dark grey), then spray grey from about 45 degrees above, then a quick burst of white straight down from above. The tops of every surface come out light and the undersides stay dark, as if lit by the sun.',
        'It shows you where the highlights and shadows go, and it makes a great base for contrast paints and glazes, which let the light and dark show through. You can do it with spray cans (keep them further away for the white) or, more precisely, with an airbrush. The painted version of the same idea, working up highlights on each panel, is in the <a href="/guides/zenithal-highlighting">zenithal highlighting guide</a>.',
        { ol: [
          'Prime the whole model black, from every angle. Let it dry.',
          'Spray grey from about 45 degrees above, all the way around the model, so the upper half of each surface catches it.',
          'Spray white from directly above, briefly, so only the very top surfaces turn white.',
        ] },
      ] },
      { h: 'Varnishing: gloss, satin and matt', body: [
        'Varnish protects the paint from chipping and rubbing on the tabletop and stops shiny washes and metallics making the model look patchy. It comes in spray, brush-on and airbrush versions, in three finishes:',
        { ul: [
          '<b>Gloss</b> is the toughest and clearest. Use it as the protective coat, before decals (so they sit flat with no silvering) and before oil or enamel washes (so they flow into the recesses). Then, usually, matt over the top.',
          '<b>Satin</b> has a soft sheen. Good for leather, armour and vehicles.',
          '<b>Matt</b> takes away shine and makes colours look even and natural. It is the usual last coat. It is the weakest, so many painters gloss first and matt second.',
        ] },
        'Once the varnish is dry you can put the shine back where you want it with a little gloss varnish on a brush: eyes, gems, wet blood, slime, lenses. Varnishes on the site include [[vallejo/gloss-varnish]], [[vallejo/satin-varnish]] and [[vallejo/matt-varnish]], made for the airbrush.',
      ] },
      { h: 'Frosting, and how to fix it', body: [
        'Frosting is a white, cloudy or chalky haze that appears when a matt spray varnish dries. It is almost always the conditions: humidity, cold, spraying too heavily or from too far away (so the varnish starts drying in the air), or a can that wasn\'t shaken enough. Some brush-on matt varnishes also turn cloudy if they are put on thickly.',
        { h3: 'How to avoid it' },
        { ul: [
          'Spray only on a dry, mild day, or indoors with good ventilation. Warm the can in a bowl of warm (not hot) water first.',
          'Shake the can for a full minute or two.',
          'Test on a spare model or a plastic spoon first.',
          'Use short, light passes at the distance on the can, and never flood the model.',
        ] },
        { h3: 'How to fix a frosted model' },
        { ol: [
          'Don\'t panic and don\'t strip it yet. Let it dry fully.',
          'Brush or spray a coat of <b>gloss varnish</b> over the frosted area. Gloss usually fills the tiny rough surface that causes the white haze and the frost disappears.',
          'Let the gloss dry, then put a thin matt coat over it in better conditions (or with a brush-on matt), if you want the matt finish back.',
        ] },
        'If gloss doesn\'t clear it, the haze is deeper in the varnish and the only fix is to strip the model and start again.',
      ] },
      { h: 'Common mistakes', body: [{ ul: [
        'Spraying in the cold or the damp. Rough, grainy primer and frosted varnish are both usually the weather.',
        'One thick coat. Several light coats, with a few minutes between them, keep the detail.',
        'Painting on primer that isn\'t cured. Paint can lift off in sheets later.',
        'Varnishing over paint that isn\'t dry. Give the model a day, especially after washes.',
        'Skipping varnish on gaming models. Hands, dice and foam trays wear paint off edges surprisingly fast.',
      ] }] },
    ],
    faq: [
      ['Should I prime miniatures black or white?', 'Black for dark schemes, metallics and drybrushing, white for bright colours and contrast paints, and grey if you are not sure. Zenithal priming (black, then grey and white from above) gives you some of both.'],
      ['What is zenithal priming?', 'Priming a model black, then spraying grey from about 45 degrees above and white from directly above, so the model is pre-shaded with light on the top surfaces and shadow underneath. In French it is called éclairage zénithal.'],
      ['How do I fix frosted varnish on a miniature?', 'Let it dry, then brush or spray a coat of gloss varnish over it. The gloss usually clears the white haze; then add a thin matt coat in dry, mild conditions.'],
      ['Do I need to varnish miniatures?', 'For gaming models, yes: varnish protects the paint from handling. Display pieces often get a matt coat too, to even out the sheen.'],
    ],
  },

  {
    slug: 'airbrushing-miniatures', basic: 4, label: 'Airbrushing basics',
    title: 'Airbrushing miniatures and models: a beginner\'s guide',
    blurb: 'Thinning ratios, air pressure (PSI), needles and cleaning, for figures and scale models.',
    desc: 'Airbrushing basics for miniatures and scale models: what you need, gravity vs siphon feed and needle sizes, how to thin paint for an airbrush, what PSI to use, how to prime, basecoat and zenithal highlight, cleaning, and fixing tip dry, spidering and grainy paint.',
    intro: [
      'An airbrush turns paint into a fine mist, so you can lay down a smooth, thin coat over a whole model in seconds, prime in any weather, and make soft gradients that are very hard to do with a brush: zenithal highlights, glowing light, camouflage and smooth vehicle panels.',
      'It is less difficult than it looks. Most problems come down to three things: how thin the paint is, how much air you use and how clean the airbrush is. This guide covers all three, for both miniatures and scale models.',
    ],
    sections: [
      { h: 'What you need', body: [{ ul: [
        '<b>An airbrush.</b> A dual-action, gravity-feed airbrush (a cup on top, press the trigger for air and pull it back for paint) is the usual choice for miniatures, because it sprays small amounts of thin paint at low pressure. Siphon-feed brushes, with a jar underneath, suit big areas and scale-model vehicles.',
        '<b>A compressor</b> with a tank and a pressure regulator with a gauge. The tank keeps the pressure steady; the regulator lets you set it.',
        '<b>A moisture trap</b>, to stop water from the air spitting out with the paint.',
        '<b>Airbrush paint</b> or thinner, cleaner, a cleaning pot, pipettes, and cotton buds or soft brushes for cleaning.',
        '<b>Ventilation and a mask.</b> Spray in a spray booth or near an open window, and wear a mask rated for paint particles (and for solvent vapour if you use lacquers).',
      ] }] },
      { h: 'Needle sizes', body: [
        { table: [['Needle', 'Good for'], [
          ['0.2 mm', 'Fine detail and freehand at low pressure. Clogs more easily.'],
          ['0.3 mm', 'The all-rounder for miniatures: basecoats, zenithal, glazes and some detail.'],
          ['0.35 to 0.4 mm', 'Bigger models, vehicles and thicker paints, metallics.'],
          ['0.5 mm and up', 'Primer, varnish and big areas such as terrain.'],
        ]] },
        'If you have one airbrush, a 0.3 mm or 0.35 mm needle is a good place to start.',
      ] },
      { h: 'Thinning paint for the airbrush', body: [
        'Airbrush paint should be about the consistency of skimmed milk: it should run off the stirring stick in a smooth thin stream and coat the side of the cup in a thin, see-through film. Thicker paint clogs and spits; much thinner paint runs and pools.',
        { table: [['Paint', 'Starting point'], [
          ['Air ranges (made for the airbrush)', 'Straight from the bottle, or with a few drops of thinner. Some can be thinned a little more for fine work.'],
          ['Ordinary brush acrylics', 'Roughly 1 part paint to 1 part airbrush thinner, then adjust. Many need more thinner than that.'],
          ['Inks', 'Often straight from the bottle, or thinned for glazes.'],
          ['Metallics', 'Thin with airbrush thinner, not water, so the flakes stay suspended.'],
          ['Tamiya acrylics and lacquers', 'Thin with the maker\'s own thinner; Tamiya acrylics are often thinned with X-20A or a lacquer thinner. Lacquers need good ventilation.'],
        ]] },
        'Thin with airbrush thinner rather than water where you can: it keeps the binder strong and dries more evenly. Add paint first and thinner second, mix in the cup with an old brush, and test on a plastic spoon or card before the model. Ranges made for the airbrush on the site:',
        { ranges: 'air' },
        'Ordinary paints thinned for spraying are fine too: [[vallejo/airbrush-thinner]] and a drop of [[vallejo/flow-improver]] are the usual helpers.',
      ] },
      { h: 'What PSI should I use?', body: [
        'Air pressure is measured in PSI (pounds per square inch) or bar. These are starting points, measured with the trigger pressed; every airbrush and paint is a bit different.',
        { table: [['Job', 'PSI', 'Bar'], [
          ['Priming and varnishing', '20 to 30', '1.4 to 2'],
          ['Basecoats and zenithal on figures', '15 to 25', '1 to 1.7'],
          ['Glazes, soft gradients and OSL', '10 to 15', '0.7 to 1'],
          ['Fine detail, freehand and camo lines', '8 to 12, closer to the model', '0.5 to 0.8'],
        ]] },
        'Lower pressure lets you get closer and spray finer lines, but needs thinner paint. Higher pressure atomises thicker paint and covers big areas, but blows paint around and dries it before it lands. If paint spiders (runs out in little legs), lower the pressure, move back or use less paint. If it goes on rough and grainy, it is drying in the air: thin it more, raise the pressure a little or move closer.',
      ] },
      { h: 'Your first session', body: [{ ol: [
        'Spray water first, to check the airbrush is clean and the trigger works.',
        'Load a few drops of thinned paint. Point the airbrush at a test card, press for air, then pull back gently for paint. Always start the air first and stop the paint first.',
        'Keep the airbrush moving in smooth passes, starting and stopping off the model, about 5 to 15 cm away.',
        'Build up several thin coats rather than trying to cover in one.',
        'Prime, then try a <a href="/guides/zenithal-highlighting">zenithal highlight</a>: the classic first job for an airbrush.',
        'Clean the airbrush between colours and at the end of the session (below).',
      ] }] },
      { h: 'Cleaning your airbrush', body: [
        { h3: 'Between colours' },
        { ol: [
          'Spray out the leftover paint into the cleaning pot.',
          'Add a few drops of water or airbrush cleaner, swirl it round the cup with a brush, and spray it out.',
          'Back-flush: hold a cloth over the front of the airbrush, as your airbrush\'s manual shows, and press for air, so the cleaner bubbles back into the cup. Spray it out. Repeat until it sprays clear.',
        ] },
        { h3: 'At the end of the day' },
        { ol: [
          'Do the steps above with airbrush cleaner.',
          'Take out the needle (loosen the needle chucking nut and pull it out from the back) and wipe it from the back towards the tip on a cloth with cleaner.',
          'Clean the cup and nozzle with a soft brush and cleaner. Don\'t force anything into the nozzle; it is the most fragile part.',
          'Put the needle back gently until it seats, then tighten the nut.',
        ] },
        'Every so often, strip the airbrush fully and soak the metal parts (not the seals) in cleaner. Never leave paint to dry in the airbrush.',
      ] },
      { h: 'Fixing common problems', body: [
        { table: [['Problem', 'Likely cause', 'Fix'], [
          ['Tip dry: paint stops, then spits', 'Paint drying on the needle tip.', 'Wipe the needle tip gently with a damp brush; add a drop of flow improver or retarder to the paint.'],
          ['Spidering', 'Too much paint, too close or too much pressure.', 'Move back, pull less paint, lower the pressure.'],
          ['Grainy, rough finish', 'Paint drying before it lands.', 'Thin more, move closer, or raise pressure a little.'],
          ['Spitting or splatter', 'Paint too thick, dirty nozzle or moisture.', 'Thin more, clean the airbrush, empty the moisture trap.'],
          ['Bubbles in the cup when spraying', 'Air leaking back through a loose or damaged nozzle.', 'Tighten the nozzle (gently) or replace it.'],
          ['No paint at all', 'Clogged nozzle or needle chuck too loose.', 'Back-flush and clean; check the needle is seated and tight.'],
        ]] },
      ] },
      { h: 'Common mistakes', body: [{ ul: [
        'Paint too thick. It is the cause of most airbrush problems: thin more than you think.',
        'Too much paint at once. Pull the trigger back only a little and build up coats.',
        'Not cleaning between colours. Old paint dries in the nozzle and causes spitting.',
        'Spraying without ventilation or a mask. Paint particles are bad for your lungs even when the paint is water-based.',
      ] }] },
    ],
    faq: [
      ['What PSI should I airbrush miniatures at?', 'Around 15 to 25 PSI for basecoats and zenithal highlights, lower (8 to 15) for glazes and fine detail, and 20 to 30 for primer and varnish. Thinner paint needs less pressure.'],
      ['How much should I thin paint for an airbrush?', 'To about the consistency of skimmed milk. Air ranges are close to ready from the bottle; ordinary brush paints usually need at least as much airbrush thinner as paint.'],
      ['What size airbrush needle for miniatures?', 'A 0.3 mm or 0.35 mm needle is a good all-rounder. 0.2 mm is for fine detail; 0.5 mm for primer, varnish and big areas.'],
      ['How do I stop tip dry?', 'Wipe the needle tip with a damp brush now and then, add a drop of flow improver or retarder to the paint, and keep the airbrush clean.'],
    ],
  },

  {
    slug: 'contrast-and-speed-paints', basic: 5, label: 'Contrast and speed paints',
    title: 'Contrast and speed paints: how to use them, and how the brands compare',
    blurb: 'One-coat paints that shade and highlight at once: priming, technique, mediums, and the brands side by side.',
    desc: 'How to use contrast and speed paints on miniatures: what they are, the right primer, how to apply them without pooling, thinning with medium, and Citadel Contrast, Army Painter Speedpaint, Vallejo Xpress Color, Scale75 Instant Colors and other ranges compared colour by colour.',
    intro: [
      'Contrast and speed paints are thin, heavily pigmented paints that settle into the recesses and stay thin on the raised areas, so one coat over a light primer gives you a shaded, highlighted base colour. They are the fastest way to get an army on the table, and many experienced painters use them for parts of every model.',
      'Citadel\'s Contrast range made the idea popular, and most paint makers now have their own version. This guide covers how to use them well, and compares the ranges on The Painters Desk colour by colour.',
    ],
    sections: [
      { h: 'How they work', body: [
        'A contrast-style paint is somewhere between a wash and a basecoat. It flows like a wash, so gravity and surface tension pull it into the recesses, which come out dark. On the raised areas it stays thin, so the light primer shows through as a highlight. Because it is very transparent, <b>the primer underneath matters a lot</b>: over white the result is bright, over grey it is darker and duller, and over black most colours barely show.',
        'That is also their weakness: they show every flaw and every brush mark on flat areas, they can pool and leave tide marks on big panels, and the result is never quite as smooth as layered paint. They are best on textured, detailed areas (cloth folds, fur, scales, skin, leather) and less good on big smooth panels.',
      ] },
      { h: 'How to use them', body: [{ ol: [
        'Prime white, a light grey or a bone colour, or zenithal prime (see <a href="/guides/priming-and-varnishing-miniatures">priming</a>). [[citadel/wraithbone]] and [[citadel/grey-seer]] are Citadel\'s two light undercoats for exactly this.',
        'Shake the pot well; the pigment settles fast.',
        'Load a medium or large brush fully. These paints need a lot on the brush to flow.',
        'Flow it on in one coat, working from the top of an area down, and don\'t go back over areas that have started to dry. Use the brush to move it, not to scrub it in.',
        'Watch for pooling: if a big puddle collects in a recess or on a flat area, wick a little away with a clean, damp brush.',
        'Let it dry fully (the shine goes) before a second coat or an area next to it. Contrast paint stays soluble for a while, and wet paint next to it can lift it.',
        'Finish with a few edge highlights in an opaque paint if you like. A light <a href="/guides/edge-highlighting">edge highlight</a> or <a href="/guides/drybrushing">drybrush</a> lifts a contrast model a lot.',
      ] }] },
      { h: 'Medium, and thinning', body: [
        'Thin contrast and speed paints with their own medium, not water. The medium is the same paint without the pigment, so it keeps the flow and the shading effect; water makes the paint bead up and leave blotchy edges. A mix of half paint and half medium gives a lighter, more even version of the colour, and mostly medium makes a tinted glaze.',
        'You can mix colours from the same range together, and most ranges mix with each other too, but test first.',
      ] },
      { h: 'The ranges on the site', body: [
        'These are the contrast-style ranges on The Painters Desk, with how many colours each one has on the site. Swatches are the colour each paint gives over a white or light primer, so they are estimates; the real result depends on your primer and how much paint pools.',
        { ranges: 'con' },
        'Every brand behaves a little differently: some are thinner and pool more, some are more opaque and cover more, some dry with a sheen. Brand descriptions are on each brand\'s page, and the comparison below shows the closest colour in each range.',
      ] },
      { h: 'The brands side by side', body: [
        'For each common colour, the nearest contrast-style paint in each range by swatch colour. Use it to find the equivalent of a paint you know, or to fill a gap in your collection from another range. Matches are by colour only, not by how the paint behaves.',
        { picks: { pool: 'con', steps: [['Red', '#9a1f24'], ['Blue', '#1f3f8a'], ['Green', '#2f6a2a'], ['Yellow', '#d0a020'], ['Purple', '#4a2a6a']] } },
        { picks: { pool: 'con', steps: [['Flesh', '#c58a68'], ['Brown', '#5a3a24'], ['Bone', '#c9b88a'], ['Grey', '#6a6a6c'], ['Black', '#1c1c1e']] } },
      ] },
      { h: 'Common mistakes', body: [{ ul: [
        'Painting over a dark primer. Use white, light grey or bone, or zenithal prime.',
        'Too little paint on the brush. It drags, dries in streaks and won\'t flow into the recesses.',
        'Going back over a drying area. That leaves tide marks; let it dry and do a second coat instead.',
        'Thinning with water. Use the range\'s medium.',
        'Using it on big flat panels. Basecoat those in opaque paint, or thin the contrast heavily with medium and use several coats.',
      ] }] },
    ],
    faq: [
      ['What is the difference between Contrast paint and Speedpaint?', 'They are the same idea from different makers: Contrast is Citadel\'s range and Speedpaint is Army Painter\'s. Both are one-coat paints that shade and highlight at once over a light primer; they differ in colours, flow and finish.'],
      ['What primer should I use for contrast paints?', 'A light one: white, light grey, a bone colour or a zenithal prime. Contrast paint is transparent, so the primer shows through and sets how bright the result is.'],
      ['Can I thin contrast paint with water?', 'It is better to use the range\'s own medium. Water breaks up the flow and leaves blotchy edges.'],
    ],
  },

  {
    slug: 'how-to-paint-black-and-white', basic: 6, label: 'Painting black and white',
    title: 'How to paint black and white on miniatures',
    blurb: 'Highlighting black without turning it grey, and shading white without making it dirty, with paints in every brand.',
    desc: 'How to paint black and white on miniatures: highlighting black armour and cloth with grey ramps, cool vs warm black, how to paint white that stays white, shading white with grey or warm tones, and the closest paints in every brand for each step.',
    intro: [
      'Black and white are the two colours that look easiest and are hardest to paint. Pure black has no highlights to show its shape, so it reads as a flat hole; pure white has no shadows, so it looks like bare primer. The trick with both is that you never actually use much pure black or pure white. Black is really a ramp of dark greys; white is really a ramp of light greys.',
      'This guide gives the ramps for each, with the closest real paints in every brand on the site, and the mistakes that make black look grey and white look dirty.',
    ],
    sections: [
      { h: 'Painting black', body: [
        'Basecoat in black, then highlight with dark greys, keeping each step smaller than the last. Most of the model should stay black; the highlights only describe the edges and the tops of the shapes. The more steps you use and the smaller the final one is, the blacker the area still looks.',
        { ol: [
          '<b>Basecoat</b> in a true black, over black or grey primer. Two thin coats.',
          '<b>Shade</b> (optional) with a black wash to make the recesses even darker and the finish even, if you used a slightly grey black.',
          '<b>Highlight 1</b>: a very dark grey on the upper half of each panel or fold, or as a broad <a href="/guides/edge-highlighting">edge highlight</a> on armour.',
          '<b>Highlight 2</b>: a mid-dark grey, on the edges and the tops of folds only.',
          '<b>Final highlight</b>: a light grey (or a light blue-grey) as tiny points and the sharpest edges. Keep it really small.',
        ] },
        { picks: { pool: 'op', steps: [['Black base', '#121214', /black/i], ['Highlight 1', '#2b2d31'], ['Highlight 2', '#4a4e55'], ['Final highlight', '#7d838b']] } },
        { h3: 'Cool, warm or coloured black' },
        'A neutral grey ramp looks like black plastic or armour. Adding a little blue to the highlights (a blue-grey) makes black look cooler and shinier, which suits armour, Space Marines and leather boots. A warm grey, or a touch of brown, suits black cloth, fur and horses. And for black that should feel like a colour (deep blue-black hair, a black dragon with a purple sheen) highlight with a very dark version of that colour instead of grey.',
        'You can build any of these on the colour wheel: tap a black or a dark blue-grey in <a href="/#/?ramp=edge">Ramps mode with Edge highlights</a> and it builds the steps from the paints you choose.',
      ] },
      { h: 'Painting white', body: [
        'Paint white from a light grey upwards, so that the shadows are grey and the pure white is only on the top. Painting straight white over black primer takes many coats and still looks chalky; a light grey basecoat over grey or white primer covers easily and gives you the shadows for free.',
        { ol: [
          '<b>Prime</b> grey or white.',
          '<b>Shadow</b>: basecoat a light grey (or wash white primer with a thinned grey or a light grey contrast paint, which pools into the recesses).',
          '<b>Light grey</b>: layer a lighter grey over most of the area, leaving the recesses in the shadow tone.',
          '<b>Off-white</b>: on the upper areas and raised folds.',
          '<b>White</b>: pure white on the highest edges and points only.',
        ] },
        { picks: { pool: 'op', steps: [['Shadow grey', '#8a8d92'], ['Light grey', '#b4b7ba'], ['Off-white', '#dcdcd6'], ['White', '#f3f3ef', /white/i]] } },
        { h3: 'Warm white: bone, parchment and old cloth' },
        'White cloth, bone, ivory and parchment look better warm. Use a warm grey-brown for the shadows and creamy off-whites for the highlights, keeping pure white only for the very last points, or leave it out altogether.',
        { picks: { pool: 'op', steps: [['Warm shadow', '#6f6250'], ['Mid', '#a8987c'], ['Cream', '#d4c8ad'], ['Warm white', '#f1ecdf']] } },
      ] },
      { h: 'Washes and contrast paints on black and white', body: [
        'A black wash such as [[citadel/nuln-oil]] over a grey basecoat is a quick way to a good tabletop black: drybrush or edge highlight back up afterwards. For white, a thinned grey contrast paint such as [[citadel/basilicanum-grey]] over white primer, or a white contrast paint like [[citadel/apothecary-white]], gives soft grey shadows in one coat. A sepia or brown wash over cream gives an old, weathered white.',
      ] },
      { h: 'Common mistakes', body: [{ ul: [
        'Highlighting black too much. If most of the area is grey, it reads as grey. Keep each step smaller.',
        'Jumping straight from black to a light grey. Use at least one very dark grey in between, or the highlights look like chalk lines.',
        'Painting white over black primer. Start from light grey on a light primer.',
        'Shading white with black. Black shadows on white look dirty; use a light grey, a blue-grey or a warm brown-grey.',
        'Using pure white everywhere. Save it for the very top points, so it has something to stand out against.',
      ] }] },
    ],
    faq: [
      ['How do you highlight black on miniatures?', 'Basecoat black, then highlight with a very dark grey, a mid-dark grey and a small, final light grey, each step smaller than the last, so most of the area stays black.'],
      ['How do you paint white on miniatures?', 'Start with a light grey over a light primer, then layer lighter greys and off-white, keeping pure white for the highest edges and points.'],
      ['Why does my white look chalky?', 'Usually the paint is too thick or it went on over a dark primer. Use a light primer, a light grey basecoat and thin layers of white.'],
    ],
  },

  {
    slug: 'basing-miniatures', basic: 7, label: 'Basing miniatures',
    title: 'How to base miniatures: texture, tufts and simple scenic bases',
    blurb: 'Texture paint or sand, a drybrushed earth ramp, tufts and rims: a finished base in an evening.',
    desc: 'How to base miniatures: sand and PVA vs texture paints, painting and drybrushing earth, mud, sand, stone and snow, adding static grass and tufts, painting the base rim, simple scenic bases, and the closest paints in every brand.',
    intro: [
      'A good base finishes a model. It frames the paint job, tells you where the model is (a desert, a forest, a ruined city) and ties an army together when every base matches. It is also one of the quickest parts of the model: a texture, a drybrush, a tuft and a painted rim takes an evening for a whole unit.',
      'This guide covers the simple, reliable way to base, then a few ideas for going further.',
    ],
    sections: [
      { h: 'Texture: sand or texture paint', body: [
        { ul: [
          '<b>Sand, grit and PVA glue.</b> Spread PVA (white wood glue) on the base, dip it in a tub of sand or fine grit, tap off the extra and let it dry. Mix fine and coarse grit, and add a few small stones or cork pieces for rocks. Seal it with thinned PVA once dry, so it doesn\'t flake. Cheap, and it can look like anything.',
          '<b>Texture paints</b> are paint with grit in it: spread it on, let it dry, done. Some crack as they dry, for dry mud or desert. Citadel\'s include [[citadel/stirland-mud]], [[citadel/armageddon-dust]], [[citadel/astrogranite]], [[citadel/mordant-earth]] and the crackle paints [[citadel/agrellan-earth]] and [[citadel/martian-ironearth]]. Snow paint such as [[citadel/valhallan-blizzard]] goes on last.',
        ] },
        'Do the texture before or after painting the model? Most painters glue the model on and texture the base first, so the texture runs right up to the feet, then paint the base last so drybrushing dust doesn\'t matter.',
      ] },
      { h: 'Painting the ground', body: [
        'The quickest earth: basecoat a dark brown, wash it with a brown wash, then <a href="/guides/drybrushing">drybrush</a> up through two or three lighter browns to a bone or sand colour on the very top. Each drybrush lighter and smaller than the last.',
        { picks: { pool: 'op', steps: [['Dark earth', '#3a2a1e'], ['Mid earth', '#6a4e36'], ['Light earth', '#9a8060'], ['Dry tip', '#cdbb98']] } },
        { table: [['Ground', 'Basecoat', 'Drybrush up to'], [
          ['Earth and mud', 'Dark brown', 'Mid brown, then a pale bone'],
          ['Desert and sand', 'Mid orange-brown or tan', 'Sand, then an off-white'],
          ['Ash wastes and city rubble', 'Dark grey', 'Mid grey, then a pale grey; a rust or brown wash for grime'],
          ['Rock and stone', 'Dark grey', 'Mid grey, then a light warm grey on the edges'],
          ['Snow', 'Any ground, then snow paint or white texture', 'A little blue-white in the shadows'],
        ]] },
        'Paint rocks a different tone from the ground, usually cooler and greyer, so they stand out.',
      ] },
      { h: 'Grass, tufts and plants', body: [{ ul: [
        '<b>Static grass</b>: dab PVA in patches, sprinkle the grass on (or use a static applicator so it stands up), tap off the rest. Leave gaps so the ground shows.',
        '<b>Tufts</b> are ready-made clumps of grass on a sticky backing: peel one off with tweezers and press it on. Two or three per base, off to one side, look better than many.',
        '<b>Flowers, leaves and bushes</b>: a few small spots of colour. Use them sparingly, especially on gaming bases.',
        'Pick grass and tufts that match the ground: green for temperate, yellow-brown for autumn or dry ground, and grey or snowy tufts for winter.',
      ] }] },
      { h: 'The base rim', body: [
        'Paint the rim of the base last, with a neat coat of one colour, and use the same colour across the whole army. Black is the classic: it disappears on the table and frames the model. Dark brown, or a colour that matches the ground, is just as good. Paint it with a medium brush held flat against the rim, turning the base, and do it after the drybrushing so it stays clean.',
      ] },
      { h: 'Going further: simple scenic bases', body: [{ ul: [
        '<b>Cork</b> torn into chunks makes great rock outcrops and cliffs; glue it on before the texture.',
        '<b>Slate or bark</b> broken into flakes gives layered stone and ruins.',
        '<b>Bits</b> from your spares box (skulls, broken weapons, pipes, rubble) tell a story. One or two per base.',
        '<b>Water</b>: paint a dark-to-light pond bed, then pour or brush on a water effect or several coats of gloss varnish.',
        '<b>Mud and blood</b>: [[citadel/stirland-mud]] mixed with a gloss varnish looks wet; [[citadel/blood-for-the-blood-god]] on boots and blades.',
      ] }] },
      { h: 'Common mistakes', body: [{ ul: [
        'A base that is brighter or busier than the model. The base should frame the model, not compete with it; keep it duller and lower in contrast.',
        'Too many tufts. Leave room for the ground.',
        'Sand that isn\'t sealed. It flakes off; seal with thinned PVA before painting.',
        'Forgetting the rim, or painting it before the drybrush. Do it last.',
      ] }] },
    ],
    faq: [
      ['What is the easiest way to base miniatures?', 'Texture paint or sand and PVA, a dark brown basecoat, a brown wash, two drybrush layers up to a bone colour, a tuft or two, and a black rim.'],
      ['Should I base before or after painting the model?', 'Most painters add the texture first, paint the model, then paint and drybrush the base last so any drybrush dust doesn\'t land on a finished model.'],
      ['What colour should I paint the base rim?', 'Black is the classic and works with everything. Brown or a colour matching the ground is fine too. Use the same one across the whole army.'],
    ],
  },

  {
    slug: 'weathering-miniatures-and-models', basic: 8, label: 'Weathering',
    title: 'Weathering miniatures and models: rust, mud, chipping and pigments',
    blurb: 'Rust, mud, paint chips, washes and pigments for tanks, terrain and gritty figures.',
    desc: 'How to weather miniatures, tanks and terrain: paint chipping with a sponge, hairspray and chipping medium, rust in layers, mud and dust with pigments, oil and enamel washes and filters, streaking, and the closest paints in every brand for rust, mud and dust.',
    intro: [
      'Weathering makes models look used: paint chipped off the edges, rust running from bolts, mud splashed up the tracks, dust settling over everything. It is what makes a tank look like it has driven across a battlefield, and a model look like it lives in its world.',
      'The idea is always the same: work out where wear would happen, and do less than you think. Most weathering is layered: a little chipping, then rust, then streaks, then mud and dust, each subtle on its own. This guide covers each layer, with the paints on the site that fit.',
    ],
    sections: [
      { h: 'Before you start', body: [{ ul: [
        'Finish the main painting and the decals, then <b>gloss varnish</b> the model. Washes and filters flow better on gloss, and the varnish protects the paint underneath if you need to wipe weathering off.',
        'Look at reference photos: real vehicles, machinery, buildings. Wear happens where hands, feet, tools and weather touch: edges, hatches, steps, the lower hull, around wheels and tracks.',
        'Weather in thin layers, and step back often. It is easy to add more, and much harder to take it off.',
      ] }] },
      { h: 'Chipping', body: [
        { ul: [
          '<b>Sponge chipping</b>: tear a small piece of blister foam or sponge, dab it in a dark brown, wipe most of it off, and dab it on edges and corners. Quick, and the easiest way to start.',
          '<b>Brush chipping</b>: paint small, irregular chips with a fine brush in dark brown. Then, for the best effect, paint a lighter version of the base colour along the lower edge of each chip, as if light catches the edge of the broken paint.',
          '<b>Hairspray or chipping medium</b>: paint or spray the metal or rust colour first, then a layer of hairspray or a chipping medium such as [[vallejo/chipping-medium]], then the top colour. When dry, wet it with water and scrub with an old brush or toothpick: the top colour chips away and the metal shows through, very realistically.',
        ] },
        'Chips colours: a dark, almost black brown for deep chips that show bare metal or primer, and a metallic like steel or gunmetal on the very edges that get worn shiny.',
      ] },
      { h: 'Rust', body: [
        'Rust is a layer of browns and oranges, darkest where it is deepest. Paint or stipple a dark rust over the area, then a mid rust in the middle, then a little bright orange rust on the surface. For running rust, use a thinned orange-brown wash or an oil paint streak below bolts and seams, pulled downwards.',
        { picks: { pool: 'op', steps: [['Dark rust', '#4a2418'], ['Rust', '#8a3a1a'], ['Orange rust', '#c0602a'], ['Chip brown', '#2a2020']] } },
        'There are also ready-made rust effects. [[citadel/typhus-corrosion]] stippled on and drybrushed with [[citadel/ryza-rust]] gives a fast, textured rust; [[army-painter/rust-tone]] is a rust-coloured wash; [[vallejo/rust]] is a rust effect paint; and for verdigris on brass and bronze, [[citadel/nihilakh-oxide]] goes in the recesses.',
      ] },
      { h: 'Washes, filters and streaks', body: [
        { ul: [
          '<b>Pin washes</b>: a dark brown or black wash only in the panel lines, around bolts and hatches, to bring out detail. Oil or enamel washes are popular on vehicles because they flow well and can be wiped back with thinner.',
          '<b>Filters</b>: a very thin coat of colour (a few drops of oil paint or enamel in a lot of thinner, or a very thin acrylic glaze) over the whole model to unify the colours or shift them, like a sandy filter on a green tank.',
          '<b>Streaks</b>: dots of oil paint or a streaking product pulled down with a thinner-damp brush, for rain marks, grime and rust running down vertical panels.',
        ] },
        'Oils and enamels go over a gloss varnish, never straight onto acrylic paint, and need a well-ventilated room. Use odourless thinner, and let them dry for a day before a final matt varnish.',
      ] },
      { h: 'Mud, dust and pigments', body: [
        'Mud and dust build up where vehicles and boots touch the ground: tracks, wheels, the lower hull and mudguards, boots and cloak hems. Dust is pale and dry and goes higher; mud is darker, thicker and lower.',
        { picks: { pool: 'op', steps: [['Wet mud', '#2f2418'], ['Dark mud', '#4a3826'], ['Dried mud', '#7a6248'], ['Dust', '#b8a888']] } },
        { ul: [
          '<b>Stippled or splashed paint</b>: stipple dark mud low on the hull, then dried mud higher up; flick a loaded old brush or toothbrush for splashes.',
          '<b>Texture</b>: [[citadel/stirland-mud]] for thick, wet mud on tracks and wheels, with a little gloss varnish for a fresh, wet look.',
          '<b>Pigments</b> are fine powders. Brush them on dry for dust, then fix them with a pigment fixer, thinner or thinned matt varnish dropped on with a brush. Pro Acryl\'s weathering pigments on the site include [[pro-acryl/raw-umber]], [[pro-acryl/burnt-umber-mwp-07]], [[pro-acryl/raw-sienna]], [[pro-acryl/red-iron-oxide]] and [[pro-acryl/unbleached-titanium]].',
          '<b>Drybrushing</b> a sandy colour over the lower parts is the quickest dust of all. See the <a href="/guides/drybrushing">drybrushing guide</a>.',
        ] },
      ] },
      { h: 'Order of work', body: [{ ol: [
        'Base colours, camo, details and decals.',
        'Gloss varnish.',
        'Chipping.',
        'Filters and pin washes.',
        'Rust and streaks.',
        'Mud and dust, from the ground up.',
        'Matt varnish, then a little gloss for fresh oil, fuel, water or wet mud.',
      ] }] },
      { h: 'Common mistakes', body: [{ ul: [
        'Too much. Heavy weathering everywhere hides the paint job; keep most surfaces fairly clean and put the wear where it would happen.',
        'Chips that are all the same size, or evenly spread. Real chips cluster on edges and around hatches, with a few big ones and many tiny ones.',
        'Rust everywhere. A few rust spots and streaks look more real than an all-over orange coat, unless the model is meant to be a wreck.',
        'Mud in the wrong colour. Match it to the base, so the model and the ground agree.',
        'Oils straight on acrylic paint. Varnish first, or the thinner can lift the paint.',
      ] }] },
    ],
    faq: [
      ['How do you weather miniatures for beginners?', 'Start with sponge chipping in dark brown on edges, a dark brown pin wash in recesses, and a sandy drybrush on the lower areas. Then add rust and pigments once you are comfortable.'],
      ['How do you paint rust on miniatures?', 'Stipple a dark rust brown, then a mid rust in the middle and a little bright orange on top, and pull thin orange-brown streaks down from bolts and seams. Texture paints like Typhus Corrosion with a Ryza Rust drybrush are a fast alternative.'],
      ['How do you fix weathering pigments?', 'Drop pigment fixer, odourless thinner or thinned matt varnish onto the pigment with a brush, and let it soak in and dry without touching it.'],
    ],
  },
];

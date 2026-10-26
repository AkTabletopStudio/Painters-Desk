// Text for the technique guides (/guides/<slug>), one per technique in the wheel's Ramps mode (TQ in app.js).
// The pages are built in seo.js (techPage): the ramps, charts and paint picks come from the data, this file is only the words.
// HTML is allowed (it's our own text). Step text is keyed by the step names the Ramps mode uses, so keep the two in step.
// bases: example colours for techniques that have no fixed bases in SG_FIX (app.js). They're target colours, not paints.

export const TECH_TEXT = {
  nmm: {
    slug: 'best-paints-for-nmm', short: 'NMM', name: 'non-metallic metal',
    title: 'How to paint non-metallic metal (NMM), with the best paints',
    desc: 'How to paint non-metallic metal (NMM) on miniatures: the seven steps from deep shadow to glint, the colour theory behind gold and steel NMM, how The Painters Desk builds an NMM ramp, and the closest paints in every brand.',
    intro: [
      'Non-metallic metal, or NMM, paints metal with ordinary opaque paints instead of metallic ones. Real metal is shiny because it mirrors its surroundings: it shows very dark reflections right next to very bright ones. NMM fakes that with extreme contrast, going from almost black to almost white over a short distance, so the eye reads the surface as polished metal even though the paint is matt.',
      'It takes practice, but it has real advantages. Metallic paint looks different in every light and photographs badly; NMM looks the same everywhere, sits in harmony with the rest of the model, and lets you decide exactly where the light falls. Gold is the most popular NMM, followed by steel and silver; bronze and copper work the same way with a warmer, redder base.',
    ],
    need: [
      'Five to seven opaque paints running from near black to near white, all in the metal\'s colour family (the ramps below are a good start).',
      'A brush with a good point. A size 1 or 0 is plenty; the glints need the tip.',
      'A wet palette, so you can thin paints to milk and keep small mixes between steps.',
      'A reference: a photo of a polished sword or a gold ring under a single lamp shows you where the darks and lights go.',
    ],
    steps: {
      'Deep shadow': 'Start with the darkest step over the parts of the metal facing away from the light and in the deepest recesses. On a flat blade, that is usually a band along one side or across the middle, where the blade "reflects" the dark ground.',
      'Shadow': 'Cover most of the shaded half with the shadow step. Keep its edge against the lighter steps fairly crisp: polished metal has hard transitions, so NMM looks more convincing with tight blends than with soft ones.',
      'Dark mid': 'Blend the shadow into the base with thin layers or a two-brush blend. This step stops the jump from dark to mid looking like a stripe.',
      'Base': 'The base is the colour the metal reads as from a distance: the gold or steel itself. Paint it over the lit half of every surface.',
      'Highlight': 'Paint a narrower band of the highlight where the light falls, leaving base showing all around it. On a sword, this is often a line near the edge or a patch near the tip.',
      'Bright highlight': 'A smaller band inside the highlight. By now you are near white, so keep it tight: the smaller the brightest area, the shinier the metal looks.',
      'Glint': 'Finish with tiny dots or a short sharp line of the glint on the edges and corners that catch the most light. Two or three well-placed glints do more than a dozen.',
    },
    colour: [
      'NMM uses the full value range, from about 9 to 98 on the CIELAB lightness scale (0 is black, 100 is white). That huge contrast is what makes it read as metal. A ramp that stops at a mid grey or starts at a mid brown looks like painted cloth, not metal.',
      'Saturation drops at both ends. Shadows lose most of their colour, falling to about a third of the base\'s saturation at the deepest step, and the highlights fade toward an ivory or white glint. Only the middle of the ramp carries the full colour, which is how real gold looks too.',
      'Warm metals shift hue as well. Gold, bronze and brass lean toward a red-brown in the shadows and toward a pale yellow, almost ivory, in the highlights. That warm-to-cool and dark-to-light shift is the same idea as in the <a href="/guides/colour-theory">colour theory guide</a>: it makes the ramp look lit, rather than just darker and lighter. Steel and silver stay a cool, nearly neutral grey all the way up.',
    ],
    wheel: [
      'For NMM, the Ramps mode treats a paint as a warm metal when it is reasonably saturated and sits between red and yellow-green (gold, bronze, brass, copper). Its shadows then turn up to 60% of the way toward a red-brown, and its highlights up to half way toward a pale yellow. Anything else, steel or a coloured metal, keeps its own hue.',
      'The deepest step sits at lightness 9 with 30% of the base\'s saturation, and the steps between rise evenly to the base. The highlights climb toward lightness 96, losing saturation as they go, and the glint is a near white at lightness 98.',
      '<b>Tint the deepest shadow</b> swaps the darkest step for a coloured shadow: a purple under gold and other warm metals, a warm brown under steel and greys, and the complement under anything else. Many NMM painters use a tinted shadow to make the metal feel part of the scene.',
    ],
    mistakes: [
      'Not going dark or light enough. If the darkest step is a mid brown or the lightest a pale yellow, it will read as yellow cloth. Push both ends.',
      'Too many highlights. Keep the bright steps small; if half the blade is near white, it looks chalky.',
      'Light coming from everywhere. Pick one light direction for the whole model and put the highlights and glints on the side facing it.',
      'Soft, even blends all over. Polished metal has some sharp transitions between dark and light; leave a few.',
    ],
  },

  osl: {
    slug: 'best-paints-for-osl', short: 'OSL', name: 'object source lighting',
    title: 'How to paint object source lighting (OSL), with the best paints',
    desc: 'How to paint object source lighting (OSL) on miniatures: building a glow from an unlit surface to a hot core, the colour theory behind OSL, how The Painters Desk builds an OSL ramp, and the closest paints in every brand.',
    intro: [
      'Object source lighting, or OSL, paints the light that something on the model gives off: a glowing sword, a lantern, a plasma coil, fire, magic or the eyes of a spirit. Instead of lighting the whole model from above, you paint the glow that the source casts on the surfaces around it.',
      'Two things sell OSL. The glow has to be the brightest thing in its area, so the surroundings need to be darker than usual, and the light has to fall off with distance: strongest and whitest right at the source, a saturated colour on nearby surfaces, and fading out to nothing a short way off.',
    ],
    need: [
      'A glow colour: a saturated, fairly bright paint in the colour of the light (green, orange, blue and so on).',
      'Paints for the steps between the unlit surface and a near-white hot core (the ramps below).',
      'Thin paint and patience. OSL is built in many thin layers or glazes so the glow fades smoothly.',
      'A clear idea of where the light goes: it only hits surfaces that face the source and nothing in the source\'s shadow.',
    ],
    steps: {
      'Unlit surface': 'Paint the area around the light in the unlit step first: a dark, fairly dull version of the light\'s colour. Everything the glow will touch should start darker than it would without OSL, or the glow won\'t show.',
      'Falloff': 'Feather the falloff step softly outward over the surfaces that face the source, stopping well short of the edge of the unlit area. This is where the light is fading out, so blend it as smoothly as you can.',
      'Glow edge': 'A ring of strongly saturated light on the nearest surfaces, where the glow first gets bright enough to show its colour clearly.',
      'Glow': 'The light colour itself, on the surfaces facing the source and closest to it.',
      'Bright glow': 'Closer in, and on the edges and raised details that face the source directly.',
      'Hot core': 'Right around the source, kept small. It is pale and only faintly coloured.',
      'Light source': 'The source itself: the brightest point on the model, nearly white. A tiny dot or line is enough.',
    },
    colour: [
      'The glow ramp is saturation first and lightness second. It starts from a dark surface with very little colour, the saturation climbs steeply through the falloff and glow edge to the full glow colour, and then the highlights fade to a near-white core. This is how real light behaves: a bright light washes out to white at its centre and is most colourful a little way out from it.',
      'The hottest steps lean a little toward yellow, the way a flame or a bright bulb looks warmer and paler at its core. The unlit surface can lean toward the glow\'s complement instead (an option on the wheel), which makes the glow look even brighter by contrast. That is the same complementary contrast described in the <a href="/guides/colour-theory">colour theory guide</a>.',
      'Keep the rest of the model a step or two darker and duller than usual. OSL is relative: a glow on a brightly lit model just looks like a coloured patch.',
    ],
    wheel: [
      'In OSL mode, tap the colour of the light, not the model\'s colour. The paint you tap becomes the Glow step in the middle of the ramp.',
      'The unlit surface sits at lightness 16 with very little saturation (at most 10, about a quarter of the glow\'s). Saturation then climbs steeply through the falloff and glow edge up to the glow colour. The lights climb toward lightness 94, losing more and more saturation as they go and turning slightly toward yellow, and the light source is a near white at lightness 97.',
      '<b>Cool the unlit surface</b> gives the darkest step a dull tint of the glow\'s complement instead of a dark version of the glow, so a green glow sits on a slightly purple-grey surface. The wheel\'s preview draws the ramp as light spreading out from a point.',
    ],
    mistakes: [
      'Lighting the wrong surfaces. The glow only falls on faces that point toward the source; the far side of a shoulder pad stays unlit.',
      'A glow that\'s too big. Keep the brightest steps close to the source and let the falloff do the work.',
      'Too bright a model. If the area around the light isn\'t darker than the rest, the OSL disappears.',
      'Hard rings. The falloff should be smooth; use thin glazes rather than single bands.',
    ],
  },

  gem: {
    slug: 'best-paints-for-gems', short: 'Gems', name: 'gems and lenses',
    title: 'How to paint gems and lenses, with the best paints',
    desc: 'How to paint gems and lenses on miniatures: the back-to-front ramp from deep shadow to reflected light and glint, the colour theory behind it, how The Painters Desk builds a gem ramp, and the closest paints in every brand.',
    intro: [
      'Gems, lenses, eyepieces and glowing orbs are some of the smallest details on a miniature and some of the most eye-catching. They are painted the opposite way round to almost everything else: dark on the side nearest the light and bright on the far side.',
      'That is because a gem is transparent. Light enters through the top, passes through the stone and lights up its far side from inside, while the near side stays dark. A sharp white glint on the near side, where the light reflects off the surface, finishes the illusion of a glassy, curved stone.',
    ],
    need: [
      'Five to seven paints of one colour from very dark to light, staying saturated (the ramps below).',
      'Your finest brush, or the tip of a size 0.',
      'Pure white (or the glint step) for the final dot.',
      'Optional: gloss varnish to make the gem shine after painting.',
    ],
    steps: {
      'Deep shadow': 'Fill the whole gem with the deepest shadow first. When the steps go on, keep this step on the side nearest the light (usually the top).',
      'Shadow': 'Paint a crescent of the shadow step that blends away from the deep shadow, toward the far side.',
      'Dark mid': 'Blend toward the middle of the gem with a slightly larger crescent.',
      'Base': 'The middle band of the gem, the colour the stone reads as.',
      'Reflected light': 'On the side away from the light (usually the bottom), paint a crescent of the reflected light: this is the light that passed through the stone and comes out here.',
      'Bright reflection': 'A smaller crescent inside the reflected light, hugging the rim.',
      'Glint': 'A single white dot on the side nearest the light, opposite the reflection. Make it sharp and small. Add a gloss varnish when the model is finished if you like.',
    },
    colour: [
      'Unlike most ramps, a gem ramp keeps its colour almost the whole way. The deepest shadow still has about 70% of the base\'s saturation and the reflected light keeps more than three quarters of it, so the stone stays rich and jewel-like. Only the glint is near white.',
      'Its value range is wide, from lightness 8 in the deepest shadow toward 86 in the reflections, with a near-white glint at 98. That contrast inside a tiny area is what makes a gem pop. A gem also stands out best when the colours around it contrast with it: a red gem on green or blue armour, a green lens on red, the complementary pairs from the <a href="/guides/colour-theory">colour theory guide</a>.',
      'The hue stays the same all the way through, because coloured glass doesn\'t change hue as it gets lighter or darker; it only gets denser or thinner.',
    ],
    wheel: [
      'In Gems mode, tap the colour of the stone. The shadows run evenly from lightness 8 up to your paint, keeping 70% to 100% of its saturation, and the reflected light climbs toward lightness 86, losing only a little saturation. Every step keeps your paint\'s hue. The glint is a near white at lightness 98.',
      '<b>Cool the deepest shadow</b> leans the darkest step half way toward a blue-violet, a trick some painters use to make red, green and orange gems look deeper.',
      'The wheel\'s preview draws the ramp on a round gem, with the dark side at the top, the reflected light at the bottom and the glint opposite it.',
    ],
    mistakes: [
      'Painting it like a dome. A gem that is light on top and dark at the bottom reads as a bead or a stud, not a jewel. Flip it.',
      'A glint on the same side as the reflection. Keep them opposite each other.',
      'Too many glints. One dot is enough; two make it look wet.',
      'Losing the colour. If the shadow steps go grey or black, the gem looks dull; keep them saturated.',
    ],
  },

  skin: {
    slug: 'best-paints-for-skin-tones', short: 'Skin', name: 'skin tones',
    title: 'How to paint skin tones, with the best paints',
    desc: 'How to paint skin on miniatures: shading and highlighting pale, mid and dark skin from deep shadow to top highlight, the colour theory behind skin ramps, how The Painters Desk builds a skin ramp, and the closest paints in every brand.',
    intro: [
      'Skin is the part of a miniature people look at first, especially the face. A good skin ramp gives the face shape (brow, cheekbones, nose and chin), and keeps it looking alive: warm and slightly red in the shadows, paler and a little more yellow on the highest points.',
      'The same ramp shape works for every skin tone, from pale to dark, and for fantasy skin too: orcs, undead, daemons or blue-skinned aliens. Pick the base skin colour, and the ramp builds the shadows and highlights around it.',
    ],
    need: [
      'A base skin colour, plus paints for the shadows and highlights (the ramps below for pale, mid and dark skin).',
      'A brush with a good point for the face, and a slightly bigger one for arms and legs.',
      'Optional: a reddish or purple glaze for lips, knuckles and the area around the eyes.',
    ],
    steps: {
      'Deep shadow': 'Paint the deepest creases: the eye sockets, under the brow, nose and chin, between the fingers and in the corners of the mouth.',
      'Shadow': 'The recesses and the underside of muscles and features, blended out from the deep shadow.',
      'Dark mid': 'Blend the shadow up into the base, so there is no hard line between them.',
      'Base': 'The skin colour itself. Cover all of the skin, leaving the deepest shadows showing if you painted them first, or paint the base first and work down into the shadows.',
      'Highlight': 'The raised areas: brow, cheekbones, the bridge of the nose, the chin, knuckles and the tops of muscles.',
      'Bright highlight': 'Smaller, on the highest points of those areas.',
      'Top highlight': 'Tiny points only: the tip of the nose, the top of the cheekbones, the lower lip and a knuckle or two.',
    },
    colour: [
      'Skin is translucent, and blood shows through it most where it is thin or shaded. That is why skin shadows look warmer and redder than the base, not just darker. The highlights go the other way: paler, a little more yellow and less saturated, because light bounces off the surface before it can pick up much colour.',
      'The ramp runs from about lightness 18 in the deepest shadow to 91 at the top highlight, and keeps most of its saturation in the shadows. A grey or black shadow on skin looks dirty or dead, which is fine for zombies but not for heroes.',
      'Many painters add a cool or purple tint to the deepest shadows for extra depth, especially on pale skin: it is a hint of the complement, the same trick as in the <a href="/guides/colour-theory">colour theory guide</a>. For dark skin, keep the highlights warm and lean them toward a soft golden or coppery tone rather than grey.',
    ],
    wheel: [
      'In Skin mode, tap a skin colour (or any colour for alien skin). The shadows run evenly from lightness 18 up to your paint, keeping at least 85% of its saturation, and lean up to half way toward a warm red at the deepest step. The highlights climb toward lightness 90, getting paler and turning gradually toward yellow. The top highlight is a pale, barely-coloured version at lightness 91.',
      '<b>Cool or purple deepest shadow</b> swaps the darkest step for a dark purple, a classic choice for eye sockets and under the chin.',
    ],
    mistakes: [
      'Grey or black shadows. Keep the shadows warm unless the skin is meant to look dead.',
      'Highlights everywhere. Faces need a few small, bright points; too many make the face look shiny.',
      'Forgetting the eyes. Shade the eye sockets before painting the eyes, and keep the whites of the eyes off-white, not pure white.',
      'Lips the same as the face. A slightly redder, darker lower lip with a small highlight adds a lot of life.',
    ],
  },

  zen: {
    slug: 'zenithal-highlighting', short: 'Zenithal', name: 'zenithal and volumetric highlights',
    title: 'Zenithal and volumetric highlighting: how to paint it, with paint ramps',
    desc: 'How to paint zenithal and volumetric highlights on miniatures: light from above on panels, folds and armour, the colour theory behind the ramp, how The Painters Desk builds a zenithal ramp, and the closest paints in every brand.',
    bases: [['Blue armour', '#2b4f8f'], ['Red cloak', '#8e1f24'], ['Green fatigues', '#4f6630']],
    intro: [
      'Zenithal highlighting paints a model as if it were lit by a single light directly overhead, the way the sun lights things at noon (the zenith is the point straight above you). Surfaces facing up are lightest, surfaces facing down are darkest, and every panel, fold and muscle gets its own small gradient from dark at the bottom to light at the top.',
      'Volumetric highlighting is the same idea taken further: each separate shape (a shoulder pad, a fold of cloth, a helmet) is treated as its own volume and given its own light-to-dark gradient. Many painters start with a zenithal spray of white over black primer to map the light, then glaze or layer colour on top. The steps below are for painting the light in with paint, which works over any primer.',
    ],
    need: [
      'A base colour and paints for two shadow steps and up to four highlight steps (the ramps below).',
      'Optional: black and white spray or airbrush primer for a zenithal undercoat.',
      'A medium and a small brush: the big areas want a bigger brush, the top highlights a fine one.',
    ],
    steps: {
      'Deep shadow': 'The underside of each panel or fold, facing the ground, and the deepest recesses.',
      'Shadow': 'Blend the shadow up from the deep shadow into the base on the lower part of each shape.',
      'Base': 'Cover the whole area in the base colour, or the middle of each shape if you started with the shadows.',
      'Highlight': 'The upper half of each panel or fold, facing the light.',
      'Highlight 1': 'The upper two thirds of each panel or fold.',
      'Highlight 2': 'The upper third, on the tops of folds and panels.',
      'Highlight 3': 'The highest ridges and the tops of the upper panels.',
      'Top highlight': 'Only the highest points, nearest the light: the top of the head, shoulders, the crests of the highest folds.',
    },
    colour: [
      'A zenithal ramp is mostly about value: the hue stays the same, the lights rise toward lightness 92 and the shadows drop to about a third of the base\'s lightness. Saturation drops at both ends, to about 60% in the deepest shadow and to about a third at the top highlight, which keeps the extremes from looking garish.',
      'The ramp has more highlight steps than shadow steps on purpose. From the tabletop, most of what you see of a model is its top half, so the steps you can see best are the highlights. That also means the whole model reads as lit from above, which helps the eye make sense of its shape from a distance.',
      'For extra depth, lean the deepest shadow toward the colour\'s complement (an option on the wheel): a blue with a hint of orange-brown in the shadows, a red with a hint of green. See the <a href="/guides/colour-theory">colour theory guide</a> for why that works.',
    ],
    wheel: [
      'In Zenithal mode, tap your base colour. The two shadow steps run evenly from about a third of your paint\'s lightness (never below 6) up to it, keeping 60% to 100% of its saturation. The highlights climb toward lightness 92, losing some saturation as they go, and the top highlight is 85% of the way from your paint to lightness 95, at a third of its saturation. The hue doesn\'t change.',
      'Seven steps give you three highlights (Highlight 1, 2 and 3); five steps give you one. <b>Lean the deepest shadow to the complement</b> gives the darkest step a dark, dull version of the complement instead.',
    ],
    mistakes: [
      'Lighting everything from the front. Keep the light above: the tops of shapes are lightest, the undersides darkest.',
      'The same gradient everywhere. Shapes higher on the model (head, shoulders) can go brighter than shapes near the base.',
      'Shadows that are too dark. Zenithal shadows only need to be a step or two darker than the base; the highlights do most of the work.',
    ],
  },

  edge: {
    slug: 'edge-highlighting', short: 'Edge highlights', name: 'edge highlights',
    title: 'How to edge highlight miniatures, with paint ramps',
    desc: 'How to edge highlight miniatures: one, two or three edge highlights and fine dots on armour and vehicles, the colour theory behind them, how The Painters Desk picks edge highlights for a base colour, and the closest paints in every brand.',
    bases: [['Black armour', '#2b2b30'], ['Blue armour', '#2b4f8f'], ['Red armour', '#8e1f24']],
    intro: [
      'Edge highlighting paints a thin line of a lighter colour along the edges of armour panels, weapons, vehicles and anything else with hard corners. It is the quickest way to make a model look sharp and finished on the tabletop, and it is the classic way to paint power armour and tanks.',
      'An edge catches more light than the flat surfaces either side of it, so a light line along it tells the eye where one surface ends and the next begins. One edge highlight is enough for a battle-ready army; two or three get finer and lighter for display pieces.',
    ],
    need: [
      'A base colour, already painted and shaded (a wash is fine), and one to three lighter paints for the edges (the ramps below).',
      'A brush with a good point and a fine one for the final dots. Many painters use the side of the brush rather than the tip for long edges.',
      'Paint thinned a little, but not as thin as for layering: it should flow off the brush in a clean line without flooding.',
    ],
    steps: {
      'Base': 'The base colour, already painted. Shade it first if you like: a wash in the recesses makes the edges stand out more.',
      'Edge': 'Run a line along every edge and raised line with the side of the brush. Drag the brush along the edge rather than painting with the tip.',
      'Edge 1': 'Run a line along every edge and raised line with the side of the brush. Drag the brush along the edge rather than painting with the tip.',
      'Edge 2': 'A thinner line inside the first, only on the edges that face the light (usually the top edges).',
      'Fine edge': 'Dots on the corners and the sharpest, highest edges: the points of a shoulder pad, the tips of a helmet crest, the corners of a vehicle hull.',
    },
    colour: [
      'Edge highlights are about value contrast. The edges rise from your base colour toward lightness 90, and the fine edge goes 85% of the way to near-white. Their saturation drops a little at each step (and to a third of the base\'s at the fine edge) so the edges look lit rather than like a different, brighter colour.',
      'A common trap is edging with a colour that is the same lightness as the base but more saturated: it looks like piping, not light. Another is going straight to white: a pure white edge on dark blue looks like a chalk line. The steps in between keep it believable.',
      'Black is a special case. A pure grey edge on black can look cold and flat, so many painters edge black with a dark blue-grey or a dark brown-grey to give it a little colour. You can tap a slightly coloured near-black on the wheel to get that.',
    ],
    wheel: [
      'In Edge highlights mode, tap your base colour. There are no shadow steps, since edging goes on top of a finished base. The edges climb from your paint toward lightness 90, losing a little saturation at each step, and the fine edge is 85% of the way from your paint to lightness 96, at a third of its saturation. The hue doesn\'t change.',
      'The Steps setting reads 2 edges or 3 edges: 2 edges gives one edge highlight and a fine edge, 3 edges gives two edge highlights and a fine edge. There is no tint option for edges.',
    ],
    mistakes: [
      'Thick edges. The line should be thinner than the panel it sits on; thin your paint and use the side of the brush.',
      'Edging every edge the same. Edges facing up get the brightest steps; edges facing down can skip the later ones.',
      'Wobbly lines. Rest your hands together or on the table, and turn the model rather than your brush.',
      'Too bright too soon. Two moderate edges look better than one stark white one.',
    ],
  },

  glaze: {
    slug: 'glazing', short: 'Glazing', name: 'glazing',
    title: 'How to glaze miniatures: glazing blends with water ratios',
    desc: 'How to glaze miniatures: smooth blends built from thin, transparent layers, with a paint-to-water ratio for each step, the colour theory behind glazing, how The Painters Desk builds a glazing blend, and the closest paints in every brand.',
    bases: [['Red cloth', '#9a2328'], ['Blue cloth', '#2d4f99'], ['Green cloth', '#3f7a3a']],
    intro: [
      'Glazing builds up a colour with very thin, almost transparent layers of paint. Each layer only tints the one below it a little, so where layers overlap the colour gets stronger, and where they stop the edge melts away. It is the most reliable way to get smooth blends on cloaks, skin and large panels without an airbrush.',
      'A glaze is just paint with a lot of water (or a glaze medium) in it. The thinner it is, the more coats you need, but the smoother the result. The Painters Desk gives each step a paint-to-water ratio as a starting point: thicker in the middle of the ramp, thinner for the deepest shadows and the brightest highlights.',
    ],
    need: [
      'A base colour and paints for one or two shadow glazes and up to four highlight glazes (the ramps below).',
      'Water, or a glaze or lahmian-style medium, which keeps thin paint from drying patchy.',
      'A wet palette to mix and hold the thinned paints.',
      'Kitchen roll or a tissue: wipe most of the paint off the brush before each stroke.',
    ],
    steps: {
      'Deep glaze': 'Very thin, built up in the deepest recesses over several coats. Let each coat dry completely before the next.',
      'Shadow glaze': 'Thin coats over the shaded areas, letting each dry. Each coat should be a little smaller than the last.',
      'Base': 'Thinned a little so it goes on smooth. Cover the whole area; two thin coats are better than one thick one.',
      'Glaze 1': 'Thin coats over the lit two thirds. Wipe most of the paint off the brush first, so you are painting with the tip, not flooding the surface.',
      'Glaze 2': 'Thinner, over a smaller area inside the last glaze.',
      'Glaze 3': 'Thinner again, over a smaller area.',
      'Final glaze': 'The thinnest glaze, only on the highest points. It takes several coats to show, which is what makes it smooth.',
    },
    colour: [
      'Because each glaze only partly covers the one below, glazing mixes colours on the model. A glaze of a lighter colour over a dark one lands somewhere in between, which is why a glazing ramp can use bigger jumps between paints than a layering ramp: the glaze fills in the steps for you.',
      'The ramp runs from about 40% of the base\'s lightness (never below 8) up to 85% of the way to lightness 90, losing a little saturation at each end. A glaze of the complement is a classic way to dull or deepen a colour, which is why you can lean the deepest glaze toward the complement; see the <a href="/guides/colour-theory">colour theory guide</a>.',
      'The water ratios follow one rule: the further a step is from the base, the thinner it goes. The base is 1:1, the first highlight and shadow glazes 1:3 to 1:4, and the outer steps 1:5 to 1:6.',
    ],
    wheel: [
      'In Glazing mode, tap your base colour. The shadow glazes run evenly from 40% of your paint\'s lightness (never below 8) up to it, keeping 75% to 100% of its saturation; the highlight glazes climb toward a point 85% of the way from your paint to lightness 90, losing a little saturation at each step, and the final glaze sits at that point with half your paint\'s saturation. The hue doesn\'t change.',
      'Each step shows a water ratio, like 1:4 💧 (one part paint to four parts water), and Save as recipe puts the water into each step\'s mix. With 7 steps the ratios are 1:5 and 1:4 for the two shadow glazes, 1:1 for the base, then 1:3, 1:4, 1:5 and 1:6 for the highlights; with 5 steps, 1:4, 1:1, 1:3, 1:4 and 1:5.',
      '<b>Lean the deepest glaze to the complement</b> gives the darkest glaze a dark, dull version of the complement instead.',
    ],
    mistakes: [
      'A loaded brush. Too much paint on the brush makes pools and tide marks; wipe it almost dry.',
      'Rushing. A glaze that isn\'t dry gets lifted by the next one. Let each coat dry.',
      'Glazing over a big area every time. Each coat should cover a little less than the last, so the colour builds where you want it.',
      'Expecting one coat to show. A thin glaze needs three, four or more coats; that is the point.',
    ],
  },
};

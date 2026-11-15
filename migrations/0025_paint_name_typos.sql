-- Paint name typos fixed (owner OK 2026-11-15): Citadel 'Golfag Brown' -> Golgfag Brown, Vallejo Game Color 72.060
-- (no name) -> Tinny Tin, Green Stuff World 4112 'Dead Flush' -> Dead Flesh. Paint keys are "<range>|<code>|<name>", so
-- rewrite every stored key: collections, shopping list, recipes, favourites, saved wheels and mixes (same pattern as 0021).

UPDATE OR IGNORE collection SET paint_key = 'd||Golgfag Brown' WHERE paint_key = 'd||Golfag Brown';
DELETE FROM collection WHERE paint_key = 'd||Golfag Brown';
UPDATE OR IGNORE wants SET paint_key = 'd||Golgfag Brown' WHERE paint_key = 'd||Golfag Brown';
DELETE FROM wants WHERE paint_key = 'd||Golfag Brown';
UPDATE recipes SET paints = REPLACE(paints, '"d||Golfag Brown"', '"d||Golgfag Brown"') WHERE paints LIKE '%"d||Golfag Brown"%';
UPDATE recipes SET steps = REPLACE(steps, '"d||Golfag Brown"', '"d||Golgfag Brown"') WHERE steps LIKE '%"d||Golfag Brown"%';
UPDATE users SET favourites = REPLACE(favourites, '"d||Golfag Brown"', '"d||Golgfag Brown"') WHERE favourites LIKE '%"d||Golfag Brown"%';
UPDATE users SET wheel = REPLACE(wheel, '"d||Golfag Brown"', '"d||Golgfag Brown"') WHERE wheel LIKE '%"d||Golfag Brown"%';
UPDATE mixes SET parts = REPLACE(parts, '"d||Golfag Brown"', '"d||Golgfag Brown"') WHERE parts LIKE '%"d||Golfag Brown"%';

UPDATE OR IGNORE collection SET paint_key = 'u|72.060|Tinny Tin' WHERE paint_key = 'u|72.060|';
DELETE FROM collection WHERE paint_key = 'u|72.060|';
UPDATE OR IGNORE wants SET paint_key = 'u|72.060|Tinny Tin' WHERE paint_key = 'u|72.060|';
DELETE FROM wants WHERE paint_key = 'u|72.060|';
UPDATE recipes SET paints = REPLACE(paints, '"u|72.060|"', '"u|72.060|Tinny Tin"') WHERE paints LIKE '%"u|72.060|"%';
UPDATE recipes SET steps = REPLACE(steps, '"u|72.060|"', '"u|72.060|Tinny Tin"') WHERE steps LIKE '%"u|72.060|"%';
UPDATE users SET favourites = REPLACE(favourites, '"u|72.060|"', '"u|72.060|Tinny Tin"') WHERE favourites LIKE '%"u|72.060|"%';
UPDATE users SET wheel = REPLACE(wheel, '"u|72.060|"', '"u|72.060|Tinny Tin"') WHERE wheel LIKE '%"u|72.060|"%';
UPDATE mixes SET parts = REPLACE(parts, '"u|72.060|"', '"u|72.060|Tinny Tin"') WHERE parts LIKE '%"u|72.060|"%';

UPDATE OR IGNORE collection SET paint_key = '6|4112|Dead Flesh' WHERE paint_key = '6|4112|Dead Flush';
DELETE FROM collection WHERE paint_key = '6|4112|Dead Flush';
UPDATE OR IGNORE wants SET paint_key = '6|4112|Dead Flesh' WHERE paint_key = '6|4112|Dead Flush';
DELETE FROM wants WHERE paint_key = '6|4112|Dead Flush';
UPDATE recipes SET paints = REPLACE(paints, '"6|4112|Dead Flush"', '"6|4112|Dead Flesh"') WHERE paints LIKE '%"6|4112|Dead Flush"%';
UPDATE recipes SET steps = REPLACE(steps, '"6|4112|Dead Flush"', '"6|4112|Dead Flesh"') WHERE steps LIKE '%"6|4112|Dead Flush"%';
UPDATE users SET favourites = REPLACE(favourites, '"6|4112|Dead Flush"', '"6|4112|Dead Flesh"') WHERE favourites LIKE '%"6|4112|Dead Flush"%';
UPDATE users SET wheel = REPLACE(wheel, '"6|4112|Dead Flush"', '"6|4112|Dead Flesh"') WHERE wheel LIKE '%"6|4112|Dead Flush"%';
UPDATE mixes SET parts = REPLACE(parts, '"6|4112|Dead Flush"', '"6|4112|Dead Flesh"') WHERE parts LIKE '%"6|4112|Dead Flush"%';

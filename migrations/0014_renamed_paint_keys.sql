-- Two paints were renamed after people had saved them (Pro Acryl S13 Dark Sea Blue -> Dark Sea Ben, E019 Pthalo -> Phthalo
-- Turquoise Light). Paint keys are "<range>|<code>|<name>", so rewrite every stored key: collections, recipe paint lists and
-- steps, profile favourites and saved wheel selections.

UPDATE OR IGNORE collection SET paint_key = 'M|S13|Dark Sea Ben' WHERE paint_key = 'M|S13|Dark Sea Blue';
DELETE FROM collection WHERE paint_key = 'M|S13|Dark Sea Blue';
UPDATE recipes SET paints = REPLACE(paints, '"M|S13|Dark Sea Blue"', '"M|S13|Dark Sea Ben"') WHERE paints LIKE '%M|S13|Dark Sea Blue%';
UPDATE recipes SET steps = REPLACE(steps, '"M|S13|Dark Sea Blue"', '"M|S13|Dark Sea Ben"') WHERE steps LIKE '%M|S13|Dark Sea Blue%';
UPDATE users SET favourites = REPLACE(favourites, '"M|S13|Dark Sea Blue"', '"M|S13|Dark Sea Ben"') WHERE favourites LIKE '%M|S13|Dark Sea Blue%';
UPDATE users SET wheel = REPLACE(wheel, '"M|S13|Dark Sea Blue"', '"M|S13|Dark Sea Ben"') WHERE wheel LIKE '%M|S13|Dark Sea Blue%';
UPDATE OR IGNORE collection SET paint_key = 'E|E019|Phthalo Turquoise Light' WHERE paint_key = 'E|E019|Pthalo Turquoise Light';
DELETE FROM collection WHERE paint_key = 'E|E019|Pthalo Turquoise Light';
UPDATE recipes SET paints = REPLACE(paints, '"E|E019|Pthalo Turquoise Light"', '"E|E019|Phthalo Turquoise Light"') WHERE paints LIKE '%E|E019|Pthalo Turquoise Light%';
UPDATE recipes SET steps = REPLACE(steps, '"E|E019|Pthalo Turquoise Light"', '"E|E019|Phthalo Turquoise Light"') WHERE steps LIKE '%E|E019|Pthalo Turquoise Light%';
UPDATE users SET favourites = REPLACE(favourites, '"E|E019|Pthalo Turquoise Light"', '"E|E019|Phthalo Turquoise Light"') WHERE favourites LIKE '%E|E019|Pthalo Turquoise Light%';
UPDATE users SET wheel = REPLACE(wheel, '"E|E019|Pthalo Turquoise Light"', '"E|E019|Phthalo Turquoise Light"') WHERE wheel LIKE '%E|E019|Pthalo Turquoise Light%';

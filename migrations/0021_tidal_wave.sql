-- Army Painter Speedpaint 2.0 WP2052 is "Tidal Wave"; the site listed it as "Tidal Navy". Paint keys are
-- "<range>|<code>|<name>", so rewrite every stored key: collections, recipe paint lists and steps, profile favourites
-- and saved wheel selections (same pattern as 0014).

UPDATE OR IGNORE collection SET paint_key = 'S||Tidal Wave' WHERE paint_key = 'S||Tidal Navy';
DELETE FROM collection WHERE paint_key = 'S||Tidal Navy';
UPDATE recipes SET paints = REPLACE(paints, '"S||Tidal Navy"', '"S||Tidal Wave"') WHERE paints LIKE '%S||Tidal Navy%';
UPDATE recipes SET steps = REPLACE(steps, '"S||Tidal Navy"', '"S||Tidal Wave"') WHERE steps LIKE '%S||Tidal Navy%';
UPDATE users SET favourites = REPLACE(favourites, '"S||Tidal Navy"', '"S||Tidal Wave"') WHERE favourites LIKE '%S||Tidal Navy%';
UPDATE users SET wheel = REPLACE(wheel, '"S||Tidal Navy"', '"S||Tidal Wave"') WHERE wheel LIKE '%S||Tidal Navy%';

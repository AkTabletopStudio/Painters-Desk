-- Extra details per owned paint, filled in from a CSV import or the count buttons on My paints:
-- qty = how many pots, sku = the code from the painter's own list, color = their own hex for it (kept as their note, never used as the swatch).
ALTER TABLE collection ADD COLUMN qty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE collection ADD COLUMN sku TEXT;
ALTER TABLE collection ADD COLUMN color TEXT;

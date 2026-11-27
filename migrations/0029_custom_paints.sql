-- Custom paints: a painter's own paints that aren't in the catalogue (homemade mixes, unlisted brands). Private to the
-- painter. They sit in their collection and show on their wheel; they never change the catalogue swatches in data.js.
-- hex is the painter's own estimate (typed, or picked from their photo). type is a paint type key from the wheel's
-- Paint types popup (op, met, pearl, con, wash, ink, fx, tech). photo is an images.id they uploaded.
-- suggested_at: when they sent it to the team as a suggestion for the main list.
CREATE TABLE custom_paints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  type TEXT NOT NULL DEFAULT 'op',
  hex TEXT NOT NULL,
  photo TEXT,
  notes TEXT,
  suggested_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX custom_paints_user ON custom_paints(user_id, created_at);

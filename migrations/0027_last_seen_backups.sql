-- Returning users: when each account was last seen (the first signed-in request of each UTC day, so it is written
-- at most once a day) and on how many different days it has been seen. Old accounts start empty.
ALTER TABLE users ADD COLUMN last_seen INTEGER;
ALTER TABLE users ADD COLUMN seen_days INTEGER NOT NULL DEFAULT 0;
CREATE INDEX users_last_seen ON users(last_seen);
-- Collection safety net: a copy of each painter's collection as it was before their first change of each UTC day.
-- paints is a JSON array of [paint_key, qty, sku, color]. The newest 14 days are kept per user.
CREATE TABLE collection_backups (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  n INTEGER NOT NULL,
  paints TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);

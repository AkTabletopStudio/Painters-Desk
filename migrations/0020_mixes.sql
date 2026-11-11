-- Saved mixes: a painter's own mixed colours (2-4 catalogue paints in parts). They sit in the collection and show on the wheel.
-- parts is JSON [{"k":"<paint key>","parts":2},...]; hex is the mixed colour as worked out on the site from the swatch estimates.
CREATE TABLE mixes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parts TEXT NOT NULL,
  hex TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX mixes_user ON mixes(user_id, created_at);

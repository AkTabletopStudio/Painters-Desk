-- Backlog ("pile of shame"): the models each painter still has to build and paint, for any game.
-- game / faction / name are the painter's own text (suggestions come from backlog-names.js, names only).
-- stages is a JSON object of how many of the qty models sit at each stage: {"unbuilt":3,"built":0,"primed":2,"painted":0,"based":0}.
-- recipe is an optional recipe/tutorial id on this site; paints a JSON array of paint keys picked for it.
CREATE TABLE backlog (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT,
  faction TEXT,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  stages TEXT NOT NULL,
  notes TEXT,
  recipe TEXT,
  paints TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX backlog_user ON backlog(user_id, updated_at);

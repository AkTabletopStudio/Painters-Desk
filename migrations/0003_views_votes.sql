-- View counts and upvotes on public recipes and tutorials.
-- views: counted once per browser session, never for the author's own visits.
ALTER TABLE recipes ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- One upvote per signed-in user per recipe; removing it deletes the row.
CREATE TABLE votes (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (recipe_id, user_id)
);
CREATE INDEX votes_user ON votes(user_id);

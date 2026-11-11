-- Shopping list: catalogue paints a painter wants to buy. A paint leaves the list when it is added to the collection.
CREATE TABLE wants (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paint_key TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paint_key)
);

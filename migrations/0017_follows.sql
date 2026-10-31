-- Following: user_id follows followed_id. Followers see the painters they follow in the Painters list and their new
-- public recipes and tutorials under Following on Tutorials & Recipes. Nobody is told when someone follows them.
CREATE TABLE follows (
  user_id TEXT NOT NULL,
  followed_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, followed_id)
);
CREATE INDEX follows_followed ON follows(followed_id, created_at);

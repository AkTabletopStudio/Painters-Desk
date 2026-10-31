-- The forum: categories, threads, posts (the opening post and the replies), upvotes on posts, and following threads.

-- status: 'live' (shown), or 'pending' (a member suggested it and an admin hasn't approved it yet). Declined suggestions are deleted.
-- sort: lower comes first on the forum page. suggested_by: the member who suggested it.
CREATE TABLE forum_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'live',
  suggested_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX forum_categories_status ON forum_categories(status, sort);

-- pinned threads sit at the top of their category; locked threads take no new replies (except from admins).
-- last_at: when the newest visible post was written, for sorting by activity.
CREATE TABLE forum_threads (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX forum_threads_category ON forum_threads(category_id, pinned, last_at);
CREATE INDEX forum_threads_last ON forum_threads(last_at);
CREATE INDEX forum_threads_user ON forum_threads(user_id);

-- first: 1 for the opening post of a thread. images, paints and recipes are JSON arrays of photo ids, paint keys and
-- recipe ids. deleted: the author deleted it (its text and photos are gone). hidden: a moderator removed it (kept for review).
CREATE TABLE forum_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,
  first INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  paints TEXT NOT NULL DEFAULT '[]',
  recipes TEXT NOT NULL DEFAULT '[]',
  deleted INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX forum_posts_thread ON forum_posts(thread_id, created_at);
CREATE INDEX forum_posts_user ON forum_posts(user_id, created_at);

CREATE TABLE forum_votes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- Following a thread: new replies show in Messages, and (mail = 1) one email until the thread is opened again.
-- read_at: when the follower last opened the thread. mailed_at: when they were last emailed about it.
CREATE TABLE forum_follows (
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mail INTEGER NOT NULL DEFAULT 1,
  read_at INTEGER NOT NULL DEFAULT 0,
  mailed_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX forum_follows_user ON forum_follows(user_id);

-- forum_mail: email me about new replies in threads I follow (account-wide switch; each thread can also be turned off).
ALTER TABLE users ADD COLUMN forum_mail INTEGER NOT NULL DEFAULT 1;

-- The starting categories. Admins can rename, reorder and add to them on the forum page.
INSERT INTO forum_categories (id, name, description, sort, created_at) VALUES
  ('show-your-work', 'Show your work', 'Photos of models you have painted, finished or in progress. Ask for critique or just share.', 10, 0),
  ('colour-schemes', 'Help with a colour scheme', 'Not sure what goes with what? Post your idea and get suggestions.', 20, 0),
  ('paints-and-matches', 'Paint brands & matches', 'Swaps between brands, paints that behave oddly, and what to buy next.', 30, 0),
  ('techniques', 'Techniques & tutorials', 'NMM, OSL, glazing, blending, drybrushing, airbrushing and everything else.', 40, 0),
  ('hobby-chat', 'Hobby chat', 'Anything else about the hobby: projects, events, tools and desk setups.', 50, 0);

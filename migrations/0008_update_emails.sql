-- Emails about new features. Off until the user opts in. updates_asked: the site has asked once (yes or no).
-- unsub is a random token for the unsubscribe link in each email, so it works without signing in.
ALTER TABLE users ADD COLUMN updates INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN updates_asked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN unsub TEXT NOT NULL DEFAULT '';

-- One row per update email an admin sent, so the same email isn't sent twice by accident.
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  recipients INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Messages on the site: replies to Feedback, and private messages between painters.

-- One row per conversation. kind 'feedback': a Feedback button message and the replies to it. Side a is the sender
-- (a_id when signed in; a_token, a SHA-256 of a random token kept in their browser, when not) and side b is the
-- site team (any admin). kind 'direct': side a started it, side b received it; pair is 'smaller id|larger id' so two
-- people only ever have one conversation.
-- a_last/b_last: when that side last wrote. a_read/b_read: when that side last opened it (unread = other side wrote since).
-- a_mailed/b_mailed: when that side was last emailed about new messages (one email until they open it again).
-- a_hidden/b_hidden: that side deleted it from their inbox; a new message brings it back.
-- status: feedback only, 'open' or 'done' (dealt with).
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  a_id TEXT,
  a_token TEXT NOT NULL DEFAULT '',
  b_id TEXT,
  pair TEXT,
  feedback_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  a_last INTEGER NOT NULL DEFAULT 0,
  b_last INTEGER NOT NULL DEFAULT 0,
  a_read INTEGER NOT NULL DEFAULT 0,
  b_read INTEGER NOT NULL DEFAULT 0,
  a_mailed INTEGER NOT NULL DEFAULT 0,
  b_mailed INTEGER NOT NULL DEFAULT 0,
  a_hidden INTEGER NOT NULL DEFAULT 0,
  b_hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX conversations_a ON conversations(a_id, updated_at);
CREATE INDEX conversations_b ON conversations(b_id, updated_at);
CREATE INDEX conversations_token ON conversations(a_token);
CREATE INDEX conversations_kind ON conversations(kind, status, updated_at);
CREATE UNIQUE INDEX conversations_pair ON conversations(pair) WHERE pair IS NOT NULL;

-- side: 'a' or 'b' (see above). user_id: who wrote it (NULL for an anonymous feedback sender; for team replies, the admin).
-- ip_hash: only for anonymous senders, to limit how often one can write.
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  side TEXT NOT NULL,
  user_id TEXT,
  body TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX messages_user ON messages(user_id, created_at);
CREATE INDEX messages_ip ON messages(ip_hash, created_at);

-- People a user has blocked: they can't message that user (and that user can't message them).
CREATE TABLE user_blocks (
  user_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);
CREATE INDEX user_blocks_blocked ON user_blocks(blocked_id);

-- dm: other painters can message me. dm_mail: email me when I get a message or a reply to my feedback.
ALTER TABLE users ADD COLUMN dm INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN dm_mail INTEGER NOT NULL DEFAULT 1;

-- Feedback sent before this migration becomes a conversation too, so it can be read and answered on the site.
-- Anonymous senders from before have no browser token, so a reply only reaches them by the email they gave (if any).
-- It was already emailed to the team, so it counts as read (b_read), but stays open until marked as dealt with.
INSERT INTO conversations (id, kind, a_id, feedback_id, a_last, b_read, created_at, updated_at)
  SELECT id, 'feedback', user_id, id, created_at, created_at, created_at, created_at FROM feedback;
INSERT INTO messages (id, conversation_id, side, user_id, body, created_at)
  SELECT id, id, 'a', user_id, message, created_at FROM feedback;

-- Live chat: rooms, messages, emoji reactions, @mentions, what each member has read, and chat mutes.
-- The live part (who is online, new messages appearing) runs in the ChatRoom Durable Object; everything kept is here.

-- sort: lower comes first in the room list. slow: slow mode, the seconds each member waits between messages (0 = off).
-- archived: hidden from the room list and takes no new messages.
CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 100,
  slow INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- reply_to: the message this one answers. images, paints and mentions are JSON arrays of photo ids, paint keys and
-- the user ids of the painters it @mentions. pinned: an admin pinned it to the room. hidden: a moderator removed it
-- (kept for review). A message its author deletes is deleted for good.
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT,
  body TEXT NOT NULL,
  reply_to TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  paints TEXT NOT NULL DEFAULT '[]',
  mentions TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  edited_at INTEGER
);
CREATE INDEX chat_messages_room ON chat_messages(room_id, created_at);
CREATE INDEX chat_messages_user ON chat_messages(user_id, created_at);

CREATE TABLE chat_reactions (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

-- read_at: when the member last had the room open, for the unread badges in the room list.
CREATE TABLE chat_reads (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

-- An @mention shows in the mentioned painter's Messages until they open the room (read = 1).
CREATE TABLE chat_mentions (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX chat_mentions_user ON chat_mentions(user_id, read);

-- A muted painter can read chat but not write in it until `until`.
CREATE TABLE chat_mutes (
  user_id TEXT PRIMARY KEY,
  until INTEGER NOT NULL,
  by_id TEXT,
  created_at INTEGER NOT NULL
);

-- The starting rooms. Admins can rename, reorder, add and archive rooms on the Chat page.
INSERT INTO chat_rooms (id, name, topic, sort, created_at) VALUES
  ('general', 'general', 'Chat about anything painting', 10, 0),
  ('show-your-work', 'show-your-work', 'Share what is on your desk right now', 20, 0),
  ('colour-help', 'colour-help', 'Stuck on a colour scheme? Ask here', 30, 0),
  ('nmm-and-metals', 'nmm-and-metals', 'NMM, true metallics, gold, silver and steel', 40, 0),
  ('airbrush', 'airbrush', 'Airbrushes, thinning, zenithals and troubleshooting', 50, 0);

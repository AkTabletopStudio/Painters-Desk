-- Commission painters: an opt-in listing on a painter's profile, plus the messages sent through its contact form.

-- One row per painter who has filled in a listing. listed: shown in the Commission painters list and on their profile.
-- open: taking new work right now. links: JSON array of up to 4 https links (shop, Instagram, website).
-- photos: JSON array of up to 12 uploaded image ids (images table). contact: 1 shows the message form.
CREATE TABLE commissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  listed INTEGER NOT NULL DEFAULT 0,
  open INTEGER NOT NULL DEFAULT 1,
  pitch TEXT NOT NULL DEFAULT '',
  styles TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  turnaround TEXT NOT NULL DEFAULT '',
  links TEXT NOT NULL DEFAULT '[]',
  photos TEXT NOT NULL DEFAULT '[]',
  contact INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX commissions_listed ON commissions(listed, updated_at);

-- Messages sent with a painter's contact form. They are emailed to the painter (Reply-To: the sender) and kept
-- here only to limit how many one account can send and so moderators can look into abuse.
CREATE TABLE commission_messages (
  id TEXT PRIMARY KEY,
  painter_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX commission_messages_sender ON commission_messages(sender_id, created_at);

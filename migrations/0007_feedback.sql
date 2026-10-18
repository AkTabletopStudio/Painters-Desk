-- Messages sent with the Feedback button. ip_hash is a SHA-256 of the sender's IP, only used to limit how often one sender can post.
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  page TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX feedback_ip ON feedback(ip_hash, created_at);
CREATE INDEX feedback_created ON feedback(created_at);

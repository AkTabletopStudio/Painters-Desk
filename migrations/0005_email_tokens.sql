-- One-time links sent by email: 'verify' confirms an account's email, 'reset' sets a new password.
-- Only a SHA-256 hash of the token is stored; the link holds the token itself.
CREATE TABLE email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX email_tokens_user ON email_tokens(user_id, kind, created_at);

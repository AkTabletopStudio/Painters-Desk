-- Public profiles and email + password accounts.

-- Profile fields. avatar_image: id of an uploaded icon (images table); when set it replaces the sign-in picture in avatar.
-- favourites: JSON array of paint keys shown on the public profile.
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN link TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN favourites TEXT NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN avatar_image TEXT NOT NULL DEFAULT '';
-- 1 when the email came from a sign-in service that verified it. Emails typed in at sign-up stay 0
-- (there is no confirmation email yet), so they never grant admin rights.
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;

-- One password per account. The account also gets an identities row with provider 'email' and the lowercased email.
-- hash: "pbkdf2-sha256$<iterations>$<salt b64>$<hash b64>".
CREATE TABLE passwords (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

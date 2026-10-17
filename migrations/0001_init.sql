-- Accounts, paint collections, recipes/tutorials and comments.
-- Apply with: npx wrangler d1 migrations apply painters-desk --local   (or --remote)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX users_email ON users(email);

-- One row per external login (google, discord, github, dev). A user can have several.
CREATE TABLE identities (
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_id)
);
CREATE INDEX identities_user ON identities(user_id);

-- Only a SHA-256 hash of the session token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- paint_key is "<range>|<code>|<name>" from data.js, so it survives reordering of the paint list.
CREATE TABLE collection (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paint_key TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, paint_key)
);

CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'recipe',          -- 'recipe' or 'tutorial'
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',                -- steps / instructions, plain text
  paints TEXT NOT NULL DEFAULT '[]',            -- JSON array of paint keys
  link TEXT NOT NULL DEFAULT '',                -- optional video or article URL
  visibility TEXT NOT NULL DEFAULT 'private',   -- 'public' or 'private'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX recipes_public ON recipes(visibility, updated_at);
CREATE INDEX recipes_user ON recipes(user_id, updated_at);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX comments_recipe ON comments(recipe_id, created_at);

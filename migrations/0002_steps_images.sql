-- Step-by-step tutorials with photos.
-- steps: JSON array of { title, text, image, mix: [{ k: paint key, parts }] }. cover: image id of the main photo.
ALTER TABLE recipes ADD COLUMN steps TEXT NOT NULL DEFAULT '[]';
ALTER TABLE recipes ADD COLUMN cover TEXT NOT NULL DEFAULT '';

-- Uploaded photos live in the R2 bucket (binding IMAGES); this table records who owns each one.
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX images_user ON images(user_id);

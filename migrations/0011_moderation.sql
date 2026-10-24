-- Photo moderation: reports, hidden photos, the automatic upload check and blocked accounts.

-- hidden: an admin hid this photo, so it no longer loads for anyone else. scan: result of the automatic check at upload
-- ('ok', or 'unchecked' when the check couldn't run, so it stands out on the admin page).
ALTER TABLE images ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE images ADD COLUMN scan TEXT NOT NULL DEFAULT '';
CREATE INDEX images_created ON images(created_at);

-- A blocked account can still sign in and delete itself, but can't upload, comment or share anything publicly.
ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0;

-- Reports from the Report button (kind 'recipe' or 'user'), plus 'upload' rows the server writes when the
-- automatic check refuses a photo (the photo itself is never stored). ip_hash only limits how often one sender can report.
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  reporter_id TEXT,
  ip_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX reports_status ON reports(status, created_at);
CREATE INDEX reports_ip ON reports(ip_hash, created_at);

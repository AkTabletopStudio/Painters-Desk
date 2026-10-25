-- Anonymous visit counts for the daily report. No cookies, no IP addresses and no user ids are stored.
-- hour is a UTC hour like '2026-10-25T14'. path is a server page (/paints/citadel) or an app view (#/recipes).
CREATE TABLE page_views (
  hour TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hour, path)
);
-- Sites that sent visitors here (host name only).
CREATE TABLE referrers (
  hour TEXT NOT NULL,
  host TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hour, host)
);
-- One row per visitor per UTC day: id is a SHA-256 of IP + browser + that day's random salt, so it can't be
-- traced back to an IP or linked across days once the salt is deleted (salts and rows older than 2 days are pruned).
CREATE TABLE visitors (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  last INTEGER NOT NULL
);
CREATE INDEX visitors_last ON visitors(last);
CREATE TABLE traffic_salt (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);
